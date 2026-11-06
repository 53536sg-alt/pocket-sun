/**
 * POCKET SUN — world generation.
 * A planet, its light, and the things that live in the dark.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';
import {
  TAU, clamp, lerp, rand, randInt, pick, smoothstep,
  randomDir, tangentFrame, quatFromUp, surfaceNoise, glowSprite,
} from './utils.js';

export const RADIUS = 15;
const BASE_OFFSET = 0.22;
const MAX_DUST = 26;
const DUST_LOW = 15;

export const LEVELS = [
  {
    name: 'The Long Night',
    nameAr: 'الليل الطويل',
    sub: 'A sleeping world needs its keeper.',
    subAr: 'عالمٌ نائم يحتاج من يحرسه.',
    beacons: 4,
    sky: 0x05070f,
    skyLit: 0x0d1a33,
    low: 0x0d3f33,
    mid: 0x177a5c,
    high: 0x4ad6a4,
    sand: 0xd8b26a,
    accent: 0x3ce0b0,
    flowers: [0x3ce0b0, 0xffc247, 0xff6b6b, 0xf6f0e2],
    spire: 0x1d8f74,
    dust: 0xffd166,
    gloom: 0x241035,
    eyes: 0xff5d8f,
  },
  {
    name: 'Ember Dunes',
    nameAr: 'كثبان الجمر',
    sub: 'The sand remembers a warmer sky.',
    subAr: 'الرمل يتذكّر سماءً أكثر دفئاً.',
    beacons: 4,
    sky: 0x0a0710,
    skyLit: 0x2a1414,
    low: 0x5a2a1b,
    mid: 0xa8542b,
    high: 0xe7a24a,
    sand: 0xf3cf8a,
    accent: 0xff8a3d,
    flowers: [0xff8a3d, 0xffc247, 0xff6b6b, 0xffe6b0],
    spire: 0xd8732f,
    dust: 0xffb347,
    gloom: 0x2d1520,
    eyes: 0xff4d6d,
  },
  {
    name: 'Frost Hymn',
    nameAr: 'ترنيمة الصقيع',
    sub: 'Sing softly. The ice is listening.',
    subAr: 'غنِّ بهدوء. الجليد يسمع.',
    beacons: 5,
    sky: 0x050812,
    skyLit: 0x101c3a,
    low: 0x223a6b,
    mid: 0x4d6fb5,
    high: 0xa9c9ff,
    sand: 0xd7e6ff,
    accent: 0x9fd8ff,
    flowers: [0x9fd8ff, 0xa78bfa, 0x3ce0b0, 0xf6f0e2],
    spire: 0x7fa8e0,
    dust: 0xcfe4ff,
    gloom: 0x151a3a,
    eyes: 0x9fd8ff,
  },
  {
    name: 'Coral Deep',
    nameAr: 'أعماق المرجان',
    sub: 'Something bright is still breathing down here.',
    subAr: 'شيءٌ مضيء ما زال يتنفّس في الأسفل.',
    beacons: 5,
    sky: 0x04101a,
    skyLit: 0x0b2733,
    low: 0x0a3d4a,
    mid: 0x127f83,
    high: 0x2fd6c2,
    sand: 0xf7c3a5,
    accent: 0xff8f79,
    flowers: [0xff8f79, 0x2fd6c2, 0xffc247, 0xf6f0e2],
    spire: 0x1aa6a0,
    dust: 0xffd6a3,
    gloom: 0x0a2430,
    eyes: 0xff8f79,
  },
  {
    name: 'Heart of the Sun',
    nameAr: 'قلب الشمس',
    sub: 'Go on. Give it back its name.',
    subAr: 'هيا. أعِد إليه اسمه.',
    beacons: 6,
    sky: 0x0d0308,
    skyLit: 0x33121a,
    low: 0x3a0f2a,
    mid: 0x8a1f3f,
    high: 0xff6b57,
    sand: 0xffd166,
    accent: 0xffc247,
    flowers: [0xffc247, 0xff6b57, 0xffe6b0, 0xff8f79],
    spire: 0xe0503a,
    dust: 0xffe6b0,
    gloom: 0x24060f,
    eyes: 0xffc247,
  },
];

function fibonacciSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return pts;
}

const UP = new THREE.Vector3(0, 1, 0);
const SPAWN = new THREE.Vector3(-0.52, -0.18, -0.83).normalize();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.radius = RADIUS;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.time = 0;
    this.level = 0;
    this.biome = LEVELS[0];
    this.spawnDir = SPAWN.clone();
    this.obstacles = [];
    this.dust = [];
    this.beacons = [];
    this.glooms = [];
    this.flowers = [];
    this.litCount = 0;
    this.portal = null;
    this.dustTimer = 0;
    this.skyBase = new THREE.Color(this.biome.sky);
    this.skyLit = new THREE.Color(this.biome.skyLit);

    this.buildLights();
    this.buildSky();
  }

  /* ── atmosphere & stars ─────────────────────────────────── */

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x7fa6ff, 0x140a24, 0.5);
    this.scene.add(this.hemi);

    this.keyLight = new THREE.DirectionalLight(0xffd9a8, 2.4);
    this.keyLight.position.set(42, 30, 24);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x3ce0b0, 0.7);
    this.rimLight.position.set(-40, -16, -30);
    this.scene.add(this.rimLight);

    this.ambient = new THREE.AmbientLight(0x35446e, 0.42);
    this.scene.add(this.ambient);
  }

  buildSky() {
    this.sky = new THREE.Group();
    this.scene.add(this.sky);

    // star field
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    const dir = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      randomDir(dir);
      const r = rand(220, 420);
      pos[i * 3] = dir.x * r;
      pos[i * 3 + 1] = dir.y * r;
      pos[i * 3 + 2] = dir.z * r;
      const tint = Math.random();
      if (tint > 0.93) c.setHex(0xffd7a0);
      else if (tint > 0.86) c.setHex(0x9fe6ff);
      else c.setHex(0xffffff);
      c.multiplyScalar(rand(0.5, 1));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 2.2,
      map: null,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.sky.add(this.stars);

    // a few very bright stars, hand placed
    const brightGeo = new THREE.BufferGeometry();
    const bp = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      randomDir(dir);
      const r = rand(260, 400);
      bp[i * 3] = dir.x * r;
      bp[i * 3 + 1] = dir.y * r;
      bp[i * 3 + 2] = dir.z * r;
    }
    brightGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    this.brightStars = new THREE.Points(brightGeo, new THREE.PointsMaterial({
      size: 6,
      color: 0xfff3d6,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    }));
    this.brightStars.frustumCulled = false;
    this.sky.add(this.brightStars);

    // distant ringed planet
    const distant = new THREE.Group();
    distant.position.set(-118, 44, -250);
    distant.rotation.set(0.42, 0.2, -0.28);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(42, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0x1b2a56 })
    );
    distant.add(body);
    const haze = new THREE.Mesh(
      new THREE.SphereGeometry(46, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0x3f6cff, transparent: true, opacity: 0.09 })
    );
    distant.add(haze);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(54, 74, 64),
      new THREE.MeshBasicMaterial({
        color: 0x546bb0, side: THREE.DoubleSide,
        transparent: true, opacity: 0.3,
      })
    );
    ring.rotation.x = Math.PI / 2.35;
    distant.add(ring);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(5, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x9fb4e8 })
    );
    moon.position.set(62, 12, 18);
    distant.add(moon);
    this.sky.add(distant);
    this.distant = distant;

    // nebula washes
    const nebulaColors = [0x2f7dff, 0xff6b9a, 0x3ce0b0];
    this.nebulae = [];
    for (let i = 0; i < 3; i++) {
      const s = glowSprite(nebulaColors[i], rand(150, 240), 0.055);
      s.position.copy(randomDir(new THREE.Vector3()).multiplyScalar(rand(260, 330)));
      s.material.depthTest = false;
      this.sky.add(s);
      this.nebulae.push(s);
    }

    // small asteroids orbiting the planet, for composition
    this.asteroids = [];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x343a52, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.28, 0.9), 0), rockMat);
      const orbit = rand(23, 33);
      const a = rand(0, TAU);
      const y = rand(-0.45, 0.55);
      const rr = Math.sqrt(1 - y * y);
      m.position.set(Math.cos(a) * rr * orbit, y * orbit, Math.sin(a) * rr * orbit);
      m.userData = {
        orbit, angle: a, y, speed: rand(0.008, 0.03) * (Math.random() > 0.5 ? 1 : -1),
        spin: rand(-0.3, 0.3),
      };
      m.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      this.sky.add(m);
      this.asteroids.push(m);
    }
  }

  /* ── build a planet ─────────────────────────────────────── */

  build(level) {
    this.dispose();
    this.level = level % LEVELS.length;
    this.biome = LEVELS[this.level];
    const b = this.biome;
    this.litCount = 0;
    this.portal = null;
    this.flowers = [];
    this.obstacles = [];
    this.dust = [];
    this.beacons = [];
    this.glooms = [];
    this.time = 0;
    this.dustTimer = 0;
    this.spawnDir = SPAWN.clone();
    this.skyBase.setHex(b.sky);
    this.skyLit.setHex(b.skyLit);

    this.makePlanet(b);
    this.makeGrass(b);
    this.makeRocks(b);
    // Beacons first so mountains and crystals can keep their distance.
    this.makeBeacons(b);
    this.makePeaks(b);
    this.makeDust(b, MAX_DUST);
    this.makeGlooms(b);

    this.rimLight.color.setHex(b.accent);
    this.hemi.color.setHex(0x7fa6ff);
    this.nebulae[0].material.color.setHex(b.accent);
    this.nebulae[1].material.color.setHex(b.flowers[2]);
    this.nebulae[2].material.color.setHex(b.flowers[1]);
  }

  makePlanet(b) {
    const geo = new THREE.IcosahedronGeometry(RADIUS, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const bump = (surfaceNoise(v) * 0.5 + 0.5) * 0.28;
      const r = RADIUS + bump;
      pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
    }

    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(b.low);
    const mid = new THREE.Color(b.mid);
    const high = new THREE.Color(b.high);
    const sand = new THREE.Color(b.sand);
    const c = new THREE.Color();
    const centroid = new THREE.Vector3();
    const a = new THREE.Vector3();
    const bb = new THREE.Vector3();
    const cc = new THREE.Vector3();

    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      bb.fromBufferAttribute(pos, i + 1);
      cc.fromBufferAttribute(pos, i + 2);
      centroid.copy(a).add(bb).add(cc).divideScalar(3).normalize();
      n.copy(centroid);
      const t = (surfaceNoise(n) * 0.5 + 0.5);
      c.copy(low)
        .lerp(mid, smoothstep(0.18, 0.55, t))
        .lerp(high, smoothstep(0.62, 0.95, t));
      if (t < 0.24) c.lerp(sand, 0.5);
      c.offsetHSL(0, rand(-0.02, 0.02), rand(-0.025, 0.025));
      for (let k = 0; k < 3; k++) {
        colors[(i + k) * 3] = c.r;
        colors[(i + k) * 3 + 1] = c.g;
        colors[(i + k) * 3 + 2] = c.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.02,
      flatShading: true,
    });
    const planet = new THREE.Mesh(geo, mat);
    this.root.add(planet);
    this.planet = planet;

    // atmosphere shell — a fresnel rim, not a hazy ball
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(b.accent) },
        uPower: { value: 2.4 },
      },
      vertexShader: /* glsl */`
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        uniform float uPower;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float f = pow(1.0 - max(dot(vN, vV), 0.0), uPower);
          gl_FragColor = vec4(uColor, f * 0.55);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.09, 48, 32), atmoMat);
    this.root.add(atmo);
    this.atmosphere = atmo;
  }

  makeGrass(b) {
    const count = 1200;
    const geo = new THREE.ConeGeometry(0.055, rand(0.28, 0.4), 3, 1);
    geo.translate(0, 0.15, 0);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.8, metalness: 0, flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const qSpin = new THREE.Quaternion();
    const c = new THREE.Color();
    const palette = [b.accent, b.high, b.sand, b.flowers[1]];
    for (let i = 0; i < count; i++) {
      randomDir(dir);
      q.copy(quatFromUp(dir));
      qSpin.setFromAxisAngle(UP, rand(0, TAU));
      q.multiply(qSpin);
      dummy.position.copy(dir).multiplyScalar(RADIUS + 0.18);
      dummy.quaternion.copy(q);
      const s = rand(0.55, 1.5);
      dummy.scale.set(s, rand(0.7, 1.6), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      c.setHex(pick(palette)).offsetHSL(0, rand(-0.05, 0.05), rand(-0.08, 0.08));
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    this.root.add(mesh);
    this.grass = mesh;
  }

  makeRocks(b) {
    const count = 44;
    const geo = new THREE.DodecahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: b.low, roughness: 0.94, metalness: 0.04, flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      randomDir(dir);
      q.copy(quatFromUp(dir));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, rand(0, TAU)));
      dummy.position.copy(dir).multiplyScalar(RADIUS + rand(0.02, 0.1));
      dummy.quaternion.copy(q);
      dummy.scale.set(rand(0.3, 1.25), rand(0.3, 0.8), rand(0.3, 1.25));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      c.setHex(b.low).offsetHSL(0, rand(-0.04, 0.04), rand(-0.05, 0.06));
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.root.add(mesh);
  }

  makePeaks(b) {
    // mountains — silhouette, and a little navigation landmark
    const mountainMat = new THREE.MeshStandardMaterial({
      color: b.low, roughness: 0.95, flatShading: true,
    });
    const avoid = [this.spawnDir, ...this.beacons.map((x) => x.dir), ...this.obstacles.map((o) => o.dir)];
    const clearDir = (minAngle) => {
      const dir = new THREE.Vector3();
      for (let attempt = 0; attempt < 64; attempt++) {
        randomDir(dir);
        if (avoid.every((d) => d.angleTo(dir) > minAngle)) break;
      }
      avoid.push(dir.clone());
      return dir;
    };

    for (let i = 0; i < 3; i++) {
      const dir = clearDir(0.34);
      const radius = rand(2.4, 3.8);
      const height = rand(2.6, 4.6);
      const m = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 5 + randInt(0, 2)), mountainMat);
      m.position.copy(dir).multiplyScalar(RADIUS + height * 0.42);
      m.quaternion.copy(quatFromUp(dir));
      m.rotateY(rand(0, TAU));
      this.root.add(m);
      this.obstacles.push({ dir: dir.clone(), radius: radius * 0.62 });
    }

    // crystal spires
    for (let i = 0; i < 7; i++) {
      const dir = clearDir(0.22);
      const h = rand(1.6, 4.2);
      const mat = new THREE.MeshStandardMaterial({
        color: b.spire,
        emissive: b.accent,
        emissiveIntensity: 0.28,
        roughness: 0.3,
        metalness: 0.15,
        flatShading: true,
        transparent: true,
        opacity: 0.95,
      });
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
      m.position.copy(dir).multiplyScalar(RADIUS + h * 0.5);
      m.scale.set(rand(0.7, 1.2), h, rand(0.7, 1.2));
      m.quaternion.copy(quatFromUp(dir));
      m.rotateY(rand(0, TAU));
      this.root.add(m);
      const halo = glowSprite(b.accent, 2.2, 0.22);
      halo.position.copy(dir).multiplyScalar(RADIUS + h + 0.2);
      this.root.add(halo);
      this.obstacles.push({ dir: dir.clone(), radius: 0.9 });
    }
  }

  makeBeacons(b) {
    const count = b.beacons;
    let dirs = fibonacciSphere(count);
    const rot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rand(0, TAU), rand(0, TAU), rand(0, TAU))
    );
    dirs = dirs.map((d) => d.applyQuaternion(rot).normalize());

    // keep at least one beacon reasonably near the landing site
    if (!dirs.some((d) => d.angleTo(this.spawnDir) < 1.1)) {
      const near = this.spawnDir.clone().applyAxisAngle(
        new THREE.Vector3(1, 0, 0), rand(0.55, 0.8)
      ).normalize();
      dirs[0].copy(near);
    }

    dirs.forEach((dir, i) => {
      const group = new THREE.Group();
      group.position.copy(dir).multiplyScalar(RADIUS + 0.02);
      group.quaternion.copy(quatFromUp(dir));
      group.rotateY(rand(0, TAU));

      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x232a44, roughness: 0.8, metalness: 0.1, flatShading: true,
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 0.42, 6), stoneMat);
      base.position.y = 0.21;
      group.add(base);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x2f3a5c,
        emissive: b.accent,
        emissiveIntensity: 0.05,
        roughness: 0.4,
        metalness: 0.2,
        flatShading: true,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 5, 20), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.44;
      group.add(ring);

      const crystalMat = new THREE.MeshStandardMaterial({
        color: b.accent,
        emissive: b.accent,
        emissiveIntensity: 0.14,
        roughness: 0.22,
        metalness: 0.25,
        flatShading: true,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), crystalMat);
      crystal.position.y = 1.42;
      crystal.scale.set(1, 2.1, 1);
      group.add(crystal);

      const glow = glowSprite(b.accent, 3.2, 0);
      glow.position.y = 1.42;
      group.add(glow);

      const beamMat = new THREE.MeshBasicMaterial({
        color: b.accent,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.035, 10, 6, 1, true),
        beamMat
      );
      beam.position.y = 5.2;
      group.add(beam);

      const light = new THREE.PointLight(b.accent, 0, 20, 2);
      light.position.y = 2.0;
      group.add(light);

      // three little stones around the base
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + rand(-0.2, 0.2);
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.11, 0.2), 0), stoneMat);
        s.position.set(Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.95);
        s.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
        group.add(s);
      }

      this.root.add(group);
      this.beacons.push({
        dir: dir.clone(),
        group,
        crystal,
        crystalMat,
        ring,
        ringMat,
        glow,
        beamMat,
        light,
        lit: false,
        litT: 0,
        phase: rand(0, TAU),
        index: i,
      });
    });
  }

  makeDust(b, count) {
    const color = b.dust;
    const coreGeo = new THREE.OctahedronGeometry(0.085, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
    });
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3();
      let guard = 0;
      do {
        randomDir(dir);
      } while (guard++ < 48 && (
        dir.angleTo(this.spawnDir) < 0.32 ||
        this.obstacles.some((o) => dir.angleTo(o.dir) * RADIUS < o.radius + 1.1)
      ));
      const group = new THREE.Group();
      group.position.copy(dir).multiplyScalar(RADIUS + 1.05);
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);
      const glow = glowSprite(color, 1.5, 0.75);
      group.add(glow);
      this.root.add(group);
      this.dust.push({
        dir, group, core, glow,
        phase: rand(0, TAU),
        collected: false,
        baseR: RADIUS + rand(0.95, 1.3),
      });
    }
  }

  makeGlooms(b) {
    const count = 2 + this.level;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: b.gloom,
      emissive: b.gloom,
      emissiveIntensity: 0.55,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: b.eyes });
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3();
      let guard = 0;
      do {
        randomDir(dir);
      } while (guard++ < 60 && (
        dir.angleTo(this.spawnDir) < 0.55 ||
        this.beacons.some((b) => dir.angleTo(b.dir) * RADIUS < 2.4)
      ));
      const group = new THREE.Group();
      group.position.copy(dir).multiplyScalar(RADIUS + 1.0);

      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 0), bodyMat);
      body.scale.set(1, 1.12, 1);
      group.add(body);

      const spikes = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.055, rand(0.22, 0.4), 4), bodyMat);
        const a = (k / 5) * TAU;
        s.position.set(Math.cos(a) * 0.45, rand(-0.2, 0.3), Math.sin(a) * 0.45);
        s.rotation.z = -Math.cos(a) * 0.9;
        s.rotation.x = Math.sin(a) * 0.9;
        spikes.add(s);
      }
      group.add(spikes);

      const eyes = new THREE.Group();
      for (const side of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeMat);
        e.position.set(0.17 * side, 0.09, 0.45);
        eyes.add(e);
        const g = glowSprite(b.eyes, 0.55, 0.9);
        g.position.copy(e.position);
        eyes.add(g);
      }
      group.add(eyes);

      this.root.add(group);
      this.glooms.push({
        dir: dir.clone(),
        group,
        body,
        spikes,
        eyes,
        phase: rand(0, TAU),
        think: rand(0.5, 2),
        wander: randomDir(new THREE.Vector3()),
        facing: randomDir(new THREE.Vector3()),
        speed: 2.5 + this.level * 0.18,
      });
    }
  }

  /* ── gameplay helpers ───────────────────────────────────── */

  spawnDirForPlayer() {
    return this.spawnDir.clone();
  }

  nearestBeacon(playerDir, maxDistance = 2.8) {
    let best = null;
    let bestD = Infinity;
    for (const b of this.beacons) {
      if (b.lit) continue;
      const d = b.dir.angleTo(playerDir) * RADIUS;
      if (d < maxDistance && d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  beaconDistance(playerDir) {
    let best = null;
    let bestD = Infinity;
    for (const b of this.beacons) {
      const d = b.dir.angleTo(playerDir) * RADIUS;
      if (!b.lit && d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return { beacon: best, distance: bestD, any: this.beacons.some((b) => !b.lit) };
  }

  ignite(beacon) {
    beacon.lit = true;
    this.litCount++;
    this.spawnBloom(beacon.dir);
    return beacon;
  }

  spawnBloom(dir) {
    const b = this.biome;
    const [t1, t2] = tangentFrame(dir);
    const count = 20 + randInt(0, 8);
    const maxAngle = 0.26;
    for (let i = 0; i < count; i++) {
      let d;
      let guard = 0;
      do {
        const off = new THREE.Vector3()
          .addScaledVector(t1, rand(-1, 1))
          .addScaledVector(t2, rand(-1, 1))
          .multiplyScalar(maxAngle);
        d = dir.clone().add(off).normalize();
      } while (d.angleTo(dir) > maxAngle && guard++ < 10);

      const color = new THREE.Color(pick(b.flowers));
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.1,
        flatShading: true,
      });
      const h = rand(0.3, 0.7);
      const geoChoice = Math.random();
      let geo;
      if (geoChoice > 0.55) geo = new THREE.ConeGeometry(rand(0.07, 0.12), h, 5, 1);
      else geo = new THREE.OctahedronGeometry(rand(0.07, 0.11), 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(d).multiplyScalar(RADIUS + 0.16 + h * 0.5);
      mesh.quaternion.copy(quatFromUp(d));
      mesh.rotateY(rand(0, TAU));
      const target = rand(0.7, 1.5);
      mesh.scale.setScalar(0.001);
      this.root.add(mesh);
      this.flowers.push({
        mesh,
        t: 0,
        delay: rand(0, 0.55),
        target,
        spin: rand(-0.6, 0.6),
      });
    }
  }

  collectDust(playerPos) {
    const got = [];
    for (const d of this.dust) {
      if (d.collected) continue;
      if (d.group.position.distanceTo(playerPos) < 1.65) {
        d.collected = true;
        d.group.visible = false;
        got.push(d.group.position.clone());
      }
    }
    return got;
  }

  activeDust() {
    let n = 0;
    for (const d of this.dust) if (!d.collected) n++;
    return n;
  }

  tickDust(dt) {
    if (this.activeDust() >= DUST_LOW) return;
    this.dustTimer += dt;
    if (this.dustTimer < 4) return;
    this.dustTimer = 0;
    // respawn a handful of motes far from the player
    for (const d of this.dust) {
      if (d.collected) {
        let dir = randomDir(new THREE.Vector3());
        let guard = 0;
        while (dir.angleTo(this.spawnDir) < 0.2 && guard++ < 20) randomDir(dir);
        d.dir.copy(dir);
        d.collected = false;
        d.group.visible = true;
        d.baseR = RADIUS + rand(0.95, 1.3);
        break;
      }
    }
  }

  openPortal() {
    if (this.portal) return this.portal;
    const base = this.spawnDir.clone().negate();
    const axis = new THREE.Vector3(1, 0.2, 0.3).normalize();
    const dir = base.clone();
    // Prefer a gate site on the far side, clear of mountains, spires and beacons.
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = base.clone().applyAxisAngle(axis, attempt === 0 ? rand(-0.35, 0.35) : rand(-1.5, 1.5)).normalize();
      const blocked =
        this.obstacles.some((o) => candidate.angleTo(o.dir) * RADIUS < o.radius + 1.6) ||
        this.beacons.some((b) => candidate.angleTo(b.dir) * RADIUS < 3.0);
      if (!blocked) { dir.copy(candidate); break; }
    }

    const group = new THREE.Group();
    group.position.copy(dir).multiplyScalar(RADIUS + 0.03);

    // stand the gate up and face the landing site
    const toSpawn = this.spawnDir.clone().addScaledVector(dir, -this.spawnDir.dot(dir)).normalize();
    const right = new THREE.Vector3().crossVectors(dir, toSpawn).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, dir, toSpawn);
    group.quaternion.setFromRotationMatrix(basis);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffc247,
      emissiveIntensity: 2.4,
      roughness: 0.2,
      metalness: 0.3,
      flatShading: true,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.115, 8, 40), ringMat);
    ring.position.y = 1.75;
    group.add(ring);

    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), discMat);
    disc.position.y = 1.75;
    group.add(disc);

    const halo = glowSprite(0xffc247, 6, 0.5);
    halo.position.y = 1.75;
    group.add(halo);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.05, 22, 6, 1, true),
      beamMat
    );
    beam.position.y = 11;
    group.add(beam);

    // orbiting shards
    const shards = [];
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12, 0), shardMat);
      s.userData = { a: (i / 7) * TAU, r: rand(1.75, 2.3), spin: rand(0.6, 2) };
      group.add(s);
      shards.push(s);
    }

    group.visible = false;
    this.root.add(group);
    this.portal = {
      group, dir, ring, disc, discMat, halo, beamMat, shards,
      t: 0, active: false, openT: 0,
    };
    return this.portal;
  }

  showPortal() {
    if (!this.portal) return;
    this.portal.active = true;
    this.portal.group.visible = true;
  }

  portalNear(playerDir) {
    if (!this.portal || !this.portal.active) return false;
    return this.portal.dir.angleTo(playerDir) * RADIUS < 2.0;
  }

  /* ── frame update ───────────────────────────────────────── */

  update(dt, player) {
    this.time += dt;
    const t = this.time;

    // stars drift, distant world turns
    this.stars.rotation.y += dt * 0.002;
    if (this.distant) this.distant.rotation.y += dt * 0.004;

    for (const a of this.asteroids) {
      const u = a.userData;
      u.angle += u.speed * dt;
      const rr = Math.sqrt(1 - u.y * u.y);
      a.position.set(Math.cos(u.angle) * rr * u.orbit, u.y * u.orbit, Math.sin(u.angle) * rr * u.orbit);
      a.rotation.x += u.spin * dt;
      a.rotation.y += u.spin * dt * 0.7;
    }

    // stardust bob
    for (const d of this.dust) {
      if (d.collected) continue;
      const bob = Math.sin(t * 1.7 + d.phase) * 0.18;
      d.group.position.copy(d.dir).multiplyScalar(d.baseR + bob);
      d.core.rotation.y += dt * 1.3;
      d.core.rotation.x += dt * 0.7;
      d.glow.material.opacity = 0.55 + Math.sin(t * 2.3 + d.phase) * 0.18;
      const s = 1.4 + Math.sin(t * 2.1 + d.phase) * 0.18;
      d.glow.scale.setScalar(s);
    }

    // beacons
    for (const b of this.beacons) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + b.phase);
      if (b.lit) {
        b.litT = Math.min(1, b.litT + dt / 1.4);
        const e = 1 - Math.pow(1 - b.litT, 3);
        b.crystalMat.emissiveIntensity = lerp(0.14, 2.6, e) + pulse * 0.35 * e;
        b.crystal.rotation.y += dt * 0.9;
        b.crystal.position.y = 1.42 + Math.sin(t * 1.6 + b.phase) * 0.06;
        b.glow.material.opacity = 0.35 + 0.5 * e + pulse * 0.05;
        b.glow.scale.setScalar(lerp(1, 4.4, e) + pulse * 0.2);
        b.light.intensity = 140 * e;
        b.beamMat.opacity = 0.05 + 0.3 * e;
        b.ringMat.emissiveIntensity = 0.05 + 1.2 * e;
        b.ring.rotation.z += dt * 0.5 * e;
      } else {
        b.crystal.rotation.y += dt * 0.25;
        b.crystal.position.y = 1.42 + Math.sin(t * 0.9 + b.phase) * 0.025;
        b.glow.material.opacity = 0;
        b.beamMat.opacity = 0.028 + pulse * 0.025;
        b.light.intensity = 0;
      }
    }

    // flowers grow
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const f = this.flowers[i];
      if (f.delay > 0) {
        f.delay -= dt;
        continue;
      }
      f.t = Math.min(1, f.t + dt / 0.55);
      const e = 1 + 2.70158 * Math.pow(f.t - 1, 3) + 1.70158 * Math.pow(f.t - 1, 2);
      f.mesh.scale.setScalar(Math.max(0.001, f.target * e));
      f.mesh.rotation.y += f.spin * dt * 0.2;
    }

    // portal
    if (this.portal && this.portal.active) {
      const p = this.portal;
      p.openT = Math.min(1, p.openT + dt / 1.2);
      p.t += dt;
      const e = 1 - Math.pow(1 - p.openT, 3);
      p.group.scale.setScalar(0.6 + 0.4 * e);
      p.discMat.opacity = (0.18 + 0.14 * Math.sin(p.t * 3)) * e;
      p.halo.material.opacity = 0.25 + 0.15 * Math.sin(p.t * 2) * e;
      p.beamMat.opacity = 0.12 + 0.12 * e;
      p.ring.rotation.z += dt * 0.25;
      for (const s of p.shards) {
        const u = s.userData;
        u.a += dt * u.spin;
        s.position.set(Math.cos(u.a) * u.r, 1.75 + Math.sin(u.a) * u.r, 0);
        s.rotation.x += dt * 2;
        s.rotation.y += dt * 1.5;
      }
    }

    // glooms
    if (player) this.updateGlooms(dt, player);

    this.tickDust(dt);
  }

  updateGlooms(dt, player) {
    const tmp = new THREE.Vector3();
    const to = new THREE.Vector3();
    const litDirs = this.beacons.filter((b) => b.lit);
    for (const g of this.glooms) {
      g.think -= dt;
      const playerDist = g.dir.angleTo(player.dir) * RADIUS;

      // nearest lit beacon
      let lightDist = Infinity;
      for (const b of litDirs) lightDist = Math.min(lightDist, b.dir.angleTo(g.dir) * RADIUS);

      let move = null;
      if (lightDist < 7.5) {
        // flee the light
        let nearest = null;
        let nd = Infinity;
        for (const b of litDirs) {
          const d = b.dir.angleTo(g.dir) * RADIUS;
          if (d < nd) { nd = d; nearest = b; }
        }
        if (nearest) {
          move = tmp.copy(g.dir).sub(nearest.dir);
          move.addScaledVector(g.dir, -move.dot(g.dir));
          if (move.lengthSq() > 0.0001) move.normalize();
          else move = null;
        }
      } else if (playerDist < 15) {
        // chase, but never into a bright place
        move = to.copy(player.dir).sub(g.dir);
        move.addScaledVector(g.dir, -move.dot(g.dir));
        if (move.lengthSq() > 0.0001) move.normalize();
        else move = null;
      }

      if (!move && g.think <= 0) {
        g.think = rand(1.5, 3.5);
        g.wander.copy(randomDir(new THREE.Vector3()));
      }

      if (!move) {
        move = to.copy(g.wander).addScaledVector(g.dir, -g.wander.dot(g.dir));
        if (move.lengthSq() > 0.0001) move.normalize();
        else move = null;
      }

      if (move) {
        const speed = lightDist < 7.5 ? g.speed * 1.5 : g.speed;
        g.dir.addScaledVector(move, (speed * dt) / RADIUS).normalize();
        g.facing.lerp(move, 1 - Math.exp(-5 * dt)).normalize();
      }

      const bob = Math.sin(this.time * 2.2 + g.phase) * 0.14;
      g.group.position.copy(g.dir).multiplyScalar(RADIUS + 1.0 + bob);
      g.group.up.copy(g.dir);
      if (g.facing.lengthSq() > 0.001) {
        g.group.lookAt(g.group.position.clone().add(g.facing));
      }
      g.body.scale.setScalar(1 + Math.sin(this.time * 2.6 + g.phase) * 0.035);
      g.spikes.rotation.y += dt * 0.5;
      g.eyes.position.y = Math.sin(this.time * 1.4 + g.phase) * 0.03;
    }
  }

  /** Camera-friendly wide shot used on the title screen. */
  preview(dt, elapsed) {
    this.update(dt, null);
  }

  /* ── cleanup ────────────────────────────────────────────── */

  dispose() {
    const geos = new Set();
    const mats = new Set();
    this.root.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) {
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((m) => mats.add(m));
      }
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      // never dispose the shared glow texture
      m.dispose();
    });
    this.root.clear();
    this.planet = null;
    this.atmosphere = null;
    this.portal = null;
    this.flowers = [];
  }
}
