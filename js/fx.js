/**
 * POCKET SUN — particles, shockwaves, small fireworks.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';
import { rand, randomDir, clamp } from './utils.js';

const MAX = 700;

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.count = MAX;
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.sizes = new Float32Array(MAX);
    this.alphas = new Float32Array(MAX);
    this.pool = new Array(MAX);
    this.cursor = 0;

    for (let i = 0; i < MAX; i++) {
      this.pool[i] = {
        alive: false,
        life: 0,
        maxLife: 1,
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        color: new THREE.Color(1, 1, 1),
        size: 0.5,
        drag: 1,
        gravity: 0,
      };
      this.positions[i * 3 + 1] = -999;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setDrawRange(0, MAX);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (260.0 / max(0.001, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vColor * vAlpha * a, vAlpha * a);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;

    // shockwave rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.72, 0.86, 64);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }));
      m.visible = false;
      scene.add(m);
      this.rings.push({
        mesh: m, life: 0, maxLife: 1, delay: 0,
        scaleFrom: 1, scaleTo: 8,
      });
    }
    this.ringCursor = 0;
    this._v = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }

  burst(pos, color, count, opts = {}) {
    return this.spawn(pos, color, count, opts);
  }

  spawn(pos, color, count, opts = {}) {    const {
      speed = 3, spread = 0.35, life = 0.9, size = 0.55,
      gravity = 0, up = null, bias = 0,
    } = opts;
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      let p = null;
      for (let i = 0; i < MAX; i++) {
        const idx = (this.cursor + i) % MAX;
        if (!this.pool[idx].alive) { p = this.pool[idx]; this.cursor = (idx + 1) % MAX; break; }
      }
      if (!p) return;
      randomDir(this._d);
      if (up) {
        this._d.addScaledVector(up, bias);
        if (this._d.lengthSq() < 1e-5) this._d.copy(up);
        this._d.normalize();
      }
      p.pos.copy(pos).addScaledVector(this._d, rand(0, spread));
      p.vel.copy(this._d).multiplyScalar(rand(speed * 0.35, speed));
      p.alive = true;
      p.life = rand(life * 0.65, life);
      p.maxLife = p.life;
      p.color.copy(c).offsetHSL(0, 0, rand(-0.08, 0.08));
      p.size = rand(size * 0.6, size * 1.5);
      p.drag = 1.9;
      p.gravity = gravity;
    }
  }

  spawnOne(pos, color, opts = {}) {
    const {
      vel = new THREE.Vector3(), life = 0.7, size = 0.4, gravity = 0,
    } = opts;
    let p = null;
    for (let i = 0; i < MAX; i++) {
      const idx = (this.cursor + i) % MAX;
      if (!this.pool[idx].alive) { p = this.pool[idx]; this.cursor = (idx + 1) % MAX; break; }
    }
    if (!p) return;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.alive = true;
    p.life = life;
    p.maxLife = life;
    p.color.copy(color instanceof THREE.Color ? color : new THREE.Color(color));
    p.size = size;
    p.drag = 0.6;
    p.gravity = gravity;
  }

  ring(position, up, color, opts = {}) {
    const {
      scaleFrom = 0.6, scaleTo = 7, life = 0.9, delay = 0,
    } = opts;
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % this.rings.length;
    r.life = life;
    r.maxLife = life;
    r.delay = delay;
    r.scaleFrom = scaleFrom;
    r.scaleTo = scaleTo;
    r.mesh.position.copy(position).addScaledVector(up, 0.12);
    r.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    r.mesh.scale.setScalar(scaleFrom);
    r.mesh.material.color.copy(color instanceof THREE.Color ? color : new THREE.Color(color));
    r.mesh.material.opacity = 0;
    r.mesh.visible = delay <= 0;
  }

  update(dt) {
    const pos = this.positions;
    const col = this.colors;
    const size = this.sizes;
    const alpha = this.alphas;

    for (let i = 0; i < MAX; i++) {
      const p = this.pool[i];
      if (!p.alive) {
        alpha[i] = 0;
        pos[i * 3 + 1] = -999;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        alpha[i] = 0;
        pos[i * 3 + 1] = -999;
        continue;
      }
      const drag = Math.exp(-p.drag * dt);
      p.vel.multiplyScalar(drag);
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);

      const t = clamp(p.life / p.maxLife, 0, 1);
      const a = Math.pow(t, 0.65);
      pos[i * 3] = p.pos.x;
      pos[i * 3 + 1] = p.pos.y;
      pos[i * 3 + 2] = p.pos.z;
      col[i * 3] = p.color.r;
      col[i * 3 + 1] = p.color.g;
      col[i * 3 + 2] = p.color.b;
      size[i] = p.size * (0.55 + t * 0.75);
      alpha[i] = a;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;

    for (const r of this.rings) {
      if (!r.mesh.visible && r.delay > 0) {
        r.delay -= dt;
        if (r.delay <= 0) r.mesh.visible = true;
        else continue;
      }
      if (!r.mesh.visible) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      const s = r.scaleFrom + (r.scaleTo - r.scaleFrom) * (1 - Math.pow(1 - t, 2.4));
      r.mesh.scale.setScalar(s);
      r.mesh.material.opacity = Math.pow(1 - t, 1.5) * 0.85;
    }
  }
}
