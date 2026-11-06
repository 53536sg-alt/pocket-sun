/**
 * POCKET SUN — the Sunkeeper.
 * Spherical gravity, a little sun, and very cold feet.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';
import { clamp, damp, glowSprite, tangentFrame } from './utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const WALK_SPEED = 5.6;
const SPRINT_SPEED = 8.6;
const GRAVITY = 27;
const JUMP_V = 9.2;
const AIR_JUMP_V = 7.6;

export class Player {
  constructor(scene, radius) {
    this.scene = scene;
    this.radius = radius;
    this.baseHeight = 0.22;

    this.dir = new THREE.Vector3(0, 1, 0);
    this.up = new THREE.Vector3(0, 1, 0);
    this.height = 0;
    this.vVel = 0;
    this.grounded = true;
    this.coyote = 0;
    this.jumps = 0;
    this.velocity = new THREE.Vector3();
    this.faceDir = new THREE.Vector3(0, 0, 1);
    this.squash = 0;
    this.walkPhase = 0;
    this.invuln = 0;
    this.hitFlash = 0;
    this.hearts = 3;
    this.maxHearts = 3;
    this.dust = 0;
    this.landedThisFrame = false;
    this.jumpedThisFrame = 0;
    this.worldPos = new THREE.Vector3();
    this.dead = false;

    this.buildModel();
  }

  /* ── model ──────────────────────────────────────────────── */

  buildModel() {
    const group = new THREE.Group();
    this.group = group;
    this.scene.add(group);

    const rig = new THREE.Group();
    this.rig = rig;
    group.add(rig);
    this.flashMats = [];

    const cream = new THREE.MeshStandardMaterial({
      color: 0xf6f0e2, roughness: 0.55, metalness: 0.12, flatShading: true,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x141a2e, roughness: 0.35, metalness: 0.45, flatShading: true,
    });
    const emerald = new THREE.MeshStandardMaterial({
      color: 0x3ce0b0, emissive: 0x3ce0b0, emissiveIntensity: 1.7, roughness: 0.3,
    });
    const amber = new THREE.MeshStandardMaterial({
      color: 0xffc247, emissive: 0xffc247, emissiveIntensity: 2.2, roughness: 0.3,
    });
    this.flashMats.push(cream, dark);

    // legs
    for (const x of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.3, 6), cream);
      leg.position.set(x, 0.2, 0);
      rig.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.26), dark);
      foot.position.set(x, 0.055, 0.04);
      rig.add(foot);
    }

    // torso
    const torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), cream);
    torso.scale.set(1, 1.04, 0.88);
    torso.position.y = 0.56;
    rig.add(torso);

    // chest light
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), emerald);
    chest.position.set(0, 0.6, 0.29);
    rig.add(chest);

    // backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.16), dark);
    pack.position.set(0, 0.58, -0.27);
    rig.add(pack);
    const packLight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), amber);
    packLight.position.set(0, 0.66, -0.36);
    rig.add(packLight);

    // arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.32, 6), cream);
      arm.position.set(side * 0.36, 0.53, 0);
      arm.rotation.z = side * 0.28;
      rig.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), dark);
      hand.position.set(side * 0.42, 0.38, 0);
      rig.add(hand);
    }

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), cream);
    head.position.y = 0.94;
    head.scale.y = 0.94;
    rig.add(head);

    // visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.155, 0.13), dark);
    visor.position.set(0, 0.95, 0.18);
    rig.add(visor);
    const visorLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.075, 0.03), emerald);
    visorLight.position.set(0, 0.95, 0.25);
    rig.add(visorLight);

    // antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), dark);
    antenna.position.set(0.1, 1.21, 0);
    antenna.rotation.z = -0.14;
    rig.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.037, 8, 8), amber);
    antennaTip.position.set(0.115, 1.33, 0);
    rig.add(antennaTip);

    // the little sun
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0.62, 0.86, 0.2);
    rig.add(sunGroup);

    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xffd166, emissive: 0xffb347, emissiveIntensity: 3.4, roughness: 0.25, metalness: 0.1,
    });
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), sunMat);
    sunGroup.add(sun);
    const sunGlow = glowSprite(0xffc247, 2.4, 0.75);
    sunGroup.add(sunGlow);
    const sunHalo = glowSprite(0xffe6b0, 4.2, 0.22);
    sunGroup.add(sunHalo);
    const sunLight = new THREE.PointLight(0xffb347, 34, 11, 2);
    sunGroup.add(sunLight);

    this.sunGroup = sunGroup;
    this.sun = sun;
    this.sunGlow = sunGlow;
    this.sunHalo = sunHalo;
    this.sunLight = sunLight;
    this.sunBaseIntensity = 34;

    // contact shadow lives in world space, not on the rig
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false,
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), shadowMat);
    this.scene.add(this.shadow);
  }

  /* ── lifecycle ──────────────────────────────────────────── */

  reset(dir, opts = {}) {
    this.dir.copy(dir).normalize();
    this.up.copy(this.dir);
    this.height = 0;
    this.vVel = 0;
    this.grounded = true;
    this.coyote = 0.12;
    this.jumps = 0;
    this.velocity.set(0, 0, 0);
    this.squash = 0;
    this.invuln = opts.invuln ?? 1.2;
    this.hitFlash = 0;
    this.dead = false;
    this.hearts = this.maxHearts;
    this.group.visible = true;
    this.shadow.visible = true;
    this.sunLight.intensity = this.sunBaseIntensity;

    const [t1] = tangentFrame(this.dir);
    this.faceDir.copy(t1);
    this.updateTransform(0);
    this.snapToSurface();

    this.grounded = true;
    this.jumps = 0;
  }

  respawn(dir) {
    this.dir.copy(dir).normalize();
    this.up.copy(this.dir);
    this.height = 0;
    this.vVel = 0;
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.jumps = 0;
    this.invuln = 2.2;
    this.dead = false;
    this.hearts = this.maxHearts;
    this.group.visible = true;
    this.shadow.visible = true;
    const [t1] = tangentFrame(this.dir);
    this.faceDir.copy(t1);
    this.updateTransform(0);
    this.snapToSurface();
  }

  snapToSurface() {
    this.worldPos.copy(this.dir).multiplyScalar(this.radius + this.baseHeight + this.height);
    this.group.position.copy(this.worldPos);
    this.group.up.copy(this.dir);
    this.group.lookAt(this.worldPos.clone().add(this.faceDir));
    this.shadow.position.copy(this.dir).multiplyScalar(this.radius + 0.08);
    this.shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.dir);
  }

  /* ── movement ───────────────────────────────────────────── */

  tryJump() {
    if (this.dead) return false;
    if (this.grounded || this.coyote > 0) {
      this.vVel = JUMP_V;
      this.grounded = false;
      this.coyote = 0;
      this.jumps = 1;
      this.squash = 0.2;
      this.jumpedThisFrame = 1;
      return true;
    }
    if (this.jumps < 2) {
      this.vVel = AIR_JUMP_V;
      this.jumps = 2;
      this.squash = 0.16;
      this.jumpedThisFrame = 2;
      return true;
    }
    return false;
  }

  update(dt, input, camForward, world) {
    const moveX = input.moveX;
    const moveY = input.moveY;
    const moving = Math.abs(moveX) + Math.abs(moveY) > 0.08;
    const sprinting = input.sprint && moving;

    this.landedThisFrame = false;
    this.jumpedThisFrame = 0;

    if (input.jump) this.tryJump();

    // vertical
    this.vVel -= GRAVITY * dt;
    this.height += this.vVel * dt;
    if (this.height <= 0) {
      if (!this.grounded && this.vVel < -3) {
        this.landedThisFrame = true;
        this.squash = -0.24;
      }
      this.height = 0;
      this.vVel = 0;
      this.grounded = true;
      this.jumps = 0;
      this.coyote = 0.12;
    } else {
      this.grounded = false;
      this.coyote -= dt;
    }

    // camera-relative tangent movement
    const forward = new THREE.Vector3(camForward.x, camForward.y, camForward.z);
    forward.addScaledVector(this.dir, -forward.dot(this.dir));
    if (forward.lengthSq() < 0.0001) {
      forward.copy(this.faceDir);
      forward.addScaledVector(this.dir, -forward.dot(this.dir));
    }
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.dir).normalize();

    const desired = new THREE.Vector3()
      .addScaledVector(forward, moveY)
      .addScaledVector(right, moveX);
    const magnitude = desired.length();
    const maxSpeed = sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (magnitude > 0.08) desired.normalize().multiplyScalar(maxSpeed);
    else desired.set(0, 0, 0);

    const lambda = this.grounded ? (magnitude > 0.08 ? 14 : 18) : 3.2;
    this.velocity.lerp(desired, 1 - Math.exp(-lambda * dt));
    this.velocity.addScaledVector(this.dir, -this.velocity.dot(this.dir));

    const speed = this.velocity.length();
    if (speed > 0.05) {
      this.dir.addScaledVector(this.velocity, dt / this.radius).normalize();
      this.up.copy(this.dir);
    }

    // face the way we are going
    if (speed > 0.8) {
      const target = this.velocity.clone().normalize();
      this.faceDir.lerp(target, 1 - Math.exp(-11 * dt));
      this.faceDir.addScaledVector(this.dir, -this.faceDir.dot(this.dir));
      if (this.faceDir.lengthSq() < 0.0001) this.faceDir.copy(target);
      this.faceDir.normalize();
    }

    // rock / spire collisions
    for (const obs of world.obstacles) {
      const dist = this.dir.angleTo(obs.dir) * this.radius;
      const min = obs.radius + 0.52;
      if (dist < min && this.height < 1.2) {
        const away = this.dir.clone().sub(obs.dir);
        away.addScaledVector(this.dir, -away.dot(this.dir));
        if (away.lengthSq() > 0.0001) {
          away.normalize();
          this.dir.addScaledVector(away, (min - dist) / this.radius + 0.001).normalize();
          this.velocity.addScaledVector(away, 2);
          this.up.copy(this.dir);
        }
      }
    }

    // timers + juice
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.4);
    this.squash = damp(this.squash, 0, 9, dt);

    const bobAmp = this.grounded ? Math.min(0.07, speed * 0.012) : 0;
    this.walkPhase += speed * dt * 2.1;
    const bob = Math.sin(this.walkPhase) * bobAmp;

    this.rig.position.y = bob;
    this.rig.rotation.x = damp(this.rig.rotation.x, this.grounded ? Math.min(0.18, speed * 0.02) : -0.12, 8, dt);
    this.rig.rotation.z = damp(this.rig.rotation.z, -moveX * 0.14, 8, dt);
    this.rig.scale.set(
      1 - this.squash * 0.55,
      1 + this.squash,
      1 - this.squash * 0.55
    );

    for (const m of this.flashMats) {
      m.emissive.setHex(0xff2d2d);
      m.emissiveIntensity = this.hitFlash * 2.4;
    }

    // sun shimmer
    const pulse = 0.5 + 0.5 * Math.sin(this.walkPhase * 0.5 + performance.now() * 0.0018);
    this.sunLight.intensity = this.sunBaseIntensity + pulse * 4;
    this.sunGlow.scale.setScalar(2.3 + pulse * 0.25);
    this.sun.rotation.y += dt * 0.8;
    this.sun.rotation.x += dt * 0.4;

    this.updateTransform(dt);
  }

  updateTransform(dt) {
    this.worldPos.copy(this.dir).multiplyScalar(this.radius + this.baseHeight + this.height);
    this.group.position.copy(this.worldPos);
    this.group.up.copy(this.dir);
    this.group.lookAt(this.worldPos.clone().add(this.faceDir));

    this.shadow.position.copy(this.dir).multiplyScalar(this.radius + 0.07);
    this.shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.dir);
    const fade = clamp(1 - this.height / 4, 0, 1);
    this.shadow.material.opacity = 0.34 * fade;
    this.shadow.scale.setScalar(1 + this.height * 0.15);
  }

  sunWorldPosition(target = new THREE.Vector3()) {
    return this.sun.getWorldPosition(target);
  }

  /** Returns true when the hit was fatal. */
  hit(fromDir) {
    if (this.invuln > 0 || this.dead) return false;
    this.hearts -= 1;
    this.invuln = 1.75;
    this.hitFlash = 1;
    this.vVel = 4.5;
    this.grounded = false;
    this.squash = -0.2;

    const away = this.dir.clone().sub(fromDir);
    away.addScaledVector(this.dir, -away.dot(this.dir));
    if (away.lengthSq() < 0.0001) away.copy(this.faceDir).negate();
    away.normalize();
    this.velocity.addScaledVector(away, 5.5);
    this.faceDir.copy(away).negate();

    if (this.hearts <= 0) {
      this.hearts = 0;
      this.dead = true;
      return true;
    }
    return false;
  }
}
