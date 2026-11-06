/**
 * POCKET SUN — spherical third-person camera.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';
import { clamp, damp } from './utils.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.horiz = new THREE.Vector3(0, 0, 1);
    this.pitch = 0.62;
    this.dist = 8.6;
    this.targetDist = 8.6;
    this.look = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.initialized = false;
    this.shake = 0;
    this.shakeTime = 0;
    this._desired = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this._up = new THREE.Vector3();
  }

  reset(player) {
    this.horiz.copy(player.faceDir).negate();
    this.horiz.addScaledVector(player.up, -this.horiz.dot(player.up));
    if (this.horiz.lengthSq() < 1e-4) this.horiz.set(0, 0, 1);
    this.horiz.normalize();
    this.pitch = 0.62;
    this.dist = 8.6;
    this.targetDist = 8.6;
    this.shake = 0;
    this.initialized = false;
    this.look.set(0, 0, 0);
    this.update(0, player, { lookX: 0, lookY: 0, zoom: 0 });
  }

  addShake(amount) {
    this.shake = Math.min(1.4, this.shake + amount);
  }

  update(dt, player, input) {
    const up = this._up.copy(player.up);
    const lookX = input.lookX || 0;
    const lookY = input.lookY || 0;

    if (lookX !== 0 || lookY !== 0) {
      this.horiz.applyAxisAngle(up, -lookX * 0.0055);
      this.pitch = clamp(this.pitch + lookY * 0.004, 0.34, 1.16);
    }
    if (input.zoom) {
      this.targetDist = clamp(this.targetDist + input.zoom * 1.1, 5.5, 12);
    }

    this.dist = damp(this.dist, this.targetDist, 7, dt);

    this.horiz.addScaledVector(up, -this.horiz.dot(up));
    if (this.horiz.lengthSq() < 1e-6) {
      this.horiz.set(1, 0, 0);
      this.horiz.addScaledVector(up, -this.horiz.dot(up));
    }
    this.horiz.normalize();

    const pos = player.worldPos;
    const cp = Math.cos(this.pitch) * this.dist;
    const sp = Math.sin(this.pitch) * this.dist;

    this._desired.copy(pos)
      .addScaledVector(up, sp)
      .addScaledVector(this.horiz, cp);
    this._lookTarget.copy(pos).addScaledVector(up, 1.15);

    const k = this.initialized ? 1 - Math.exp(-10 * dt) : 1;
    this.camera.position.lerp(this._desired, k);
    this.look.lerp(this._lookTarget, this.initialized ? 1 - Math.exp(-13 * dt) : 1);
    this.camera.up.lerp(up, this.initialized ? 1 - Math.exp(-7 * dt) : 1).normalize();
    this.camera.lookAt(this.look);

    if (this.shake > 0.001) {
      this.shakeTime += dt;
      const s = this.shake * this.shake;
      const ox = (Math.sin(this.shakeTime * 73) + Math.sin(this.shakeTime * 41)) * 0.5;
      const oy = (Math.sin(this.shakeTime * 59) + Math.sin(this.shakeTime * 37)) * 0.5;
      const right = new THREE.Vector3().crossVectors(up, this.horiz).normalize();
      this.camera.position.addScaledVector(right, ox * 0.4 * s);
      this.camera.position.addScaledVector(up, oy * 0.4 * s);
      this.shake = damp(this.shake, 0, 4.2, dt);
    }

    this.forward.copy(this.horiz).negate();
    this.forward.addScaledVector(up, -this.forward.dot(up));
    if (this.forward.lengthSq() < 1e-6) this.forward.copy(player.faceDir);
    this.forward.normalize();
    this.initialized = true;
  }
}
