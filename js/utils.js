/**
 * POCKET SUN — small utilities
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const Y_AXIS = new THREE.Vector3(0, 1, 0);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shortestAngle(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Uniform direction on the unit sphere. */
export function randomDir(target = new THREE.Vector3()) {
  const u = rand(-1, 1);
  const theta = rand(0, TAU);
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  return target.set(r * Math.cos(theta), u, r * Math.sin(theta));
}

/** Two orthonormal tangents for a given up vector. */
export function tangentFrame(up) {
  const ref = Math.abs(up.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : Y_AXIS;
  const t1 = new THREE.Vector3().crossVectors(ref, up).normalize();
  const t2 = new THREE.Vector3().crossVectors(up, t1).normalize();
  return [t1, t2];
}

export function quatFromUp(up, target = new THREE.Quaternion()) {
  return target.setFromUnitVectors(Y_AXIS, up);
}

/** Cheap, seamless pseudo-noise used to colour the planet. */
export function surfaceNoise(v) {
  return (
    0.45 * Math.sin(v.x * 2.1 + 1.7) * Math.cos(v.y * 2.4 - 0.6) * Math.sin(v.z * 2.0 + 2.3) +
    0.32 * Math.sin(v.x * 4.7 - 1.2) * Math.cos(v.z * 4.1 + 0.8) +
    0.16 * Math.cos(v.y * 7.3 + v.x * 3.1) +
    0.10 * Math.sin(v.z * 9.1 - v.y * 2.7)
  );
}

let _glowTex = null;
/** Soft radial glow texture, generated once. */
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0.0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

export function glowSprite(color, scale, opacity = 1) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

/** Convert seconds to mm:ss. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Small seeded RNG so each planet can be regenerated deterministically. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
