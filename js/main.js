/**
 * POCKET SUN — main loop and game state.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import * as THREE from 'three';
import { World, LEVELS, RADIUS } from './world.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { FX } from './fx.js';
import { rand, clamp } from './utils.js';

const DUST_COST = 3;
const canvas = document.getElementById('game');

const params = new URLSearchParams(location.search);
const debugPlay = params.has('play');
const debugLevel = clamp(parseInt(params.get('level') || '0', 10) || 0, 0, LEVELS.length - 1);

/* ── renderer ─────────────────────────────────────────────── */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
} catch (err) {
  const sub = document.querySelector('.boot-sub');
  if (sub) sub.textContent = 'This browser could not start WebGL 2.';
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(LEVELS[0].sky);

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 900
);
camera.position.set(0, 14, 44);

/* ── systems ──────────────────────────────────────────────── */
const ui = new UI();
const audio = new AudioEngine();
const input = new Input(canvas);
const world = new World(scene);
const player = new Player(scene, RADIUS);
const rig = new CameraRig(camera);
const fx = new FX(scene);

ui.setMuted(audio.muted);

/* ── state ────────────────────────────────────────────────── */
let state = 'boot'; // boot | title | intro | playing | paused | dead | transition | win
let level = 0;
let runTime = 0;
let totalDust = 0;
let beaconsLitTotal = 0;
let lastSafeDir = world.spawnDirForPlayer();
let titleAngle = 0.6;
let sparkleTimer = 0;
let transitionToken = 0;
let skyTarget = new THREE.Color(LEVELS[0].sky);
let portalOpening = false;

const fadeEl = document.getElementById('fade');
const tmpVec = new THREE.Vector3();
const tmpColor = new THREE.Color();

/* ── boot ─────────────────────────────────────────────────── */
world.build(0);
player.reset(world.spawnDirForPlayer());
player.group.visible = false;
player.shadow.visible = false;
ui.showHud(false);

let bootProgress = 0;
const bootTimer = setInterval(() => {
  bootProgress = Math.min(1, bootProgress + rand(0.09, 0.19));
  ui.setBootProgress(bootProgress);
  if (bootProgress >= 1) {
    clearInterval(bootTimer);
    setTimeout(() => {
      ui.showBoot(false);
      ui.showTitle(true);
      state = 'title';
      if (debugPlay) debugStart();
    }, 320);
  }
}, 110);

/* ── transitions ──────────────────────────────────────────── */
function transition(fn, opts = {}) {
  const token = ++transitionToken;
  state = 'transition';
  ui.setPrompt(null);
  fadeEl.classList.add('on');
  setTimeout(() => {
    if (token !== transitionToken) return;
    fn();
    setTimeout(() => {
      if (token === transitionToken) fadeEl.classList.remove('on');
    }, opts.hold ?? 120);
  }, opts.out ?? 480);
}

/* ── run lifecycle ────────────────────────────────────────── */
function resetRunState() {
  level = 0;
  runTime = 0;
  totalDust = 0;
  beaconsLitTotal = 0;
  player.dust = 0;
  portalOpening = false;
}

function startRun() {
  audio.ensure();
  input.clearQueues();
  ui.closeAll();
  ui.showTitle(false);
  ui.showHud(true);
  ui.hideLevelCard();
  resetRunState();
  audio.startMusic(0);
  transition(() => loadLevel(0), { out: 520, hold: 140 });
}

function loadLevel(index) {
  level = index;
  state = 'intro';
  portalOpening = false;
  world.build(index);
  player.dust = 0;
  player.reset(world.spawnDirForPlayer(), { invuln: 2 });
  player.group.visible = true;
  player.shadow.visible = true;
  lastSafeDir = player.dir.clone();
  rig.reset(player);
  scene.background.copy(world.skyBase);
  skyTarget.copy(world.skyBase);
  audio.startMusic(index);

  ui.setHearts(player.hearts, player.maxHearts);
  ui.setDust(0, DUST_COST);
  ui.setBeacons(0, world.beacons.length);
  ui.setPrompt(null);

  ui.showLevelCard(index, world.biome, 2150, () => {
    if (state === 'intro' && level === index) state = 'playing';
  });
}

function restartRun() {
  audio.ui();
  ui.closeAll();
  ui.close('win');
  ui.showHud(true);
  resetRunState();
  audio.startMusic(0);
  transition(() => loadLevel(0), { out: 450, hold: 140 });
}

function quitToTitle() {
  audio.ui();
  audio.stopMusic();
  audio.setPaused(false);
  ui.closeAll();
  ui.showHud(false);
  ui.showTitle(false);
  ui.hideLevelCard();
  input.clearQueues();
  player.group.visible = false;
  player.shadow.visible = false;
  transition(() => {
    world.build(0);
    scene.background.copy(world.skyBase);
    skyTarget.copy(world.skyBase);
    ui.showTitle(true);
    state = 'title';
  }, { out: 400, hold: 160 });
}

function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  audio.setPaused(true);
  input.clearQueues();
  ui.setPrompt(null);
  ui.open('pause');
}

function resumeGame() {
  if (state !== 'paused') return;
  audio.ui();
  audio.setPaused(false);
  input.clearQueues();
  ui.closeAll();
  state = 'playing';
}

function die() {
  state = 'dead';
  audio.death();
  audio.setPaused(true);
  rig.addShake(0.9);
  ui.flash('hit');
  ui.toast(ui.t('toast.death'), 2400);
  ui.setPrompt(null);

  setTimeout(() => {
    if (state !== 'dead') return;
    transition(() => {
      player.respawn(lastSafeDir);
      rig.reset(player);
      player.dust = 0;
      ui.setHearts(player.hearts, player.maxHearts);
      ui.setDust(0, DUST_COST);
      audio.setPaused(false);
      state = 'playing';
      portalOpening = false;
    }, { out: 420, hold: 200 });
  }, 1250);
}

function nextPlanet() {
  if (state !== 'playing' || !world.portal || !world.portal.active) return;
  if (level >= LEVELS.length - 1) {
    winRun();
    return;
  }
  audio.portal();
  state = 'transition';
  ui.setPrompt(null);
  transition(() => loadLevel(level + 1), { out: 620, hold: 160 });
}

function winRun() {
  state = 'win';
  audio.stopMusic();
  audio.win();
  audio.setPaused(false);
  ui.setPrompt(null);
  ui.showHud(false);
  ui.showWin({
    time: runTime,
    dust: totalDust,
    beacons: beaconsLitTotal,
  });
}

/* ── interaction helpers ──────────────────────────────────── */
function igniteBeacon(beacon) {
  if (player.dust < DUST_COST) {
    audio.deny();
    ui.toast(ui.t('toast.need'));
    return;
  }
  player.dust -= DUST_COST;
  world.ignite(beacon);
  beaconsLitTotal++;
  lastSafeDir.copy(beacon.dir);

  const dir = beacon.dir;
  const surface = dir.clone().multiplyScalar(RADIUS + 0.2);
  const crystal = dir.clone().multiplyScalar(RADIUS + 1.6);

  audio.ignite();
  ui.flash('warm');
  rig.addShake(0.22);
  ui.setDust(player.dust, DUST_COST);
  ui.setBeacons(world.litCount, world.beacons.length);
  ui.toast(
    ui.lang === 'ar'
      ? `أُشعلت المنارة ${world.litCount} من ${world.beacons.length}`
      : `Beacon ${world.litCount} of ${world.beacons.length} is burning`,
    1800
  );

  fx.ring(surface, dir, world.biome.accent, { scaleFrom: 0.5, scaleTo: 11, life: 1.15 });
  fx.burst(crystal, world.biome.accent, 46, {
    speed: 7, up: dir, bias: 0.45, life: 1.3, size: 0.5, gravity: 1.2,
  });
  fx.burst(crystal, 0xffe6b0, 18, { speed: 3, life: 1.6, size: 0.75, gravity: 0.8 });
  fx.spawn(crystal, world.biome.flowers[1], 20, {
    speed: 2.2, up: dir, bias: 0.9, life: 2, size: 0.55, gravity: -0.4,
  });

  const ratio = world.beacons.length ? world.litCount / world.beacons.length : 0;
  skyTarget.copy(world.skyBase).lerp(world.skyLit, ratio);

  if (world.litCount >= world.beacons.length) {
    portalOpening = true;
    audio.gateOpen();
    setTimeout(() => {
      if (state !== 'playing' && state !== 'intro' && state !== 'dead') return;
      world.openPortal();
      world.showPortal();
      ui.toast(ui.t('toast.gate'), 3200);
      const p = world.portal;
      if (p) {
        const pos = p.dir.clone().multiplyScalar(RADIUS + 2);
        fx.burst(pos, 0xffc247, 30, { speed: 5, life: 1.6, size: 0.7 });
        fx.ring(p.dir.clone().multiplyScalar(RADIUS + 0.2), p.dir, 0xffc247, {
          scaleFrom: 0.5, scaleTo: 9, life: 1.2,
        });
      }
    }, 700);
  }
}

/* ── debug start (used by ?play=1) ────────────────────────── */
function debugStart() {
  ui.showBoot(false);
  ui.showTitle(false);
  ui.showHud(true);
  resetRunState();
  level = debugLevel;
  world.build(level);
  player.dust = DUST_COST;
  player.reset(world.spawnDirForPlayer(), { invuln: 1 });
  player.group.visible = true;
  player.shadow.visible = true;
  lastSafeDir = player.dir.clone();
  rig.reset(player);
  scene.background.copy(world.skyBase);
  skyTarget.copy(world.skyBase);
  ui.setHearts(player.hearts, player.maxHearts);
  ui.setDust(player.dust, DUST_COST);
  ui.setBeacons(0, world.beacons.length);
  state = 'playing';
  audio.ensure();
  audio.startMusic(level);
}

/* ── UI wiring ────────────────────────────────────────────── */
ui.on('start', () => { audio.ui(); startRun(); });
ui.on('help', () => { audio.ui(); ui.open('help'); });
ui.on('credits', () => { audio.ui(); ui.open('credits'); });
ui.on('close-help', () => { audio.ui(); ui.close('help'); });
ui.on('close-credits', () => { audio.ui(); ui.close('credits'); });
ui.on('pause', () => { audio.ui(); pauseGame(); });
ui.on('resume', () => resumeGame());
ui.on('restart', () => restartRun());
ui.on('quit', () => quitToTitle());
ui.on('mute', () => {
  const muted = audio.toggleMuted();
  ui.setMuted(muted);
  if (!muted) audio.ui();
});
ui.on('lang', () => {
  audio.ui();
  ui.toggleLanguage();
  syncHud(true);
  ui.setPrompt(null);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (document.getElementById('help').classList.contains('is-open')) {
      ui.close('help');
    } else if (document.getElementById('credits').classList.contains('is-open')) {
      ui.close('credits');
    } else if (state === 'playing') {
      pauseGame();
    } else if (state === 'paused') {
      resumeGame();
    }
  } else if (e.code === 'Enter' && state === 'title' && !e.repeat) {
    // The start button advertises ↵, so it should work from the keyboard too.
    if (!document.querySelector('.overlay.is-open')) {
      e.preventDefault();
      audio.ui();
      startRun();
    }
  } else if (e.code === 'KeyP' && !e.repeat) {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  } else if (e.code === 'KeyM' && !e.repeat) {
    const muted = audio.toggleMuted();
    ui.setMuted(muted);
  }
});

window.addEventListener('pointerdown', () => audio.ensure(), { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pauseGame();
});

/* ── hud sync ─────────────────────────────────────────────── */
function syncHud(force = false) {
  if (force) {
    ui.last.hearts = -1;
    ui.last.dust = -1;
    ui.last.lit = -1;
    ui.last.total = -1;
  }
  ui.setHearts(player.hearts, player.maxHearts);
  ui.setDust(player.dust, DUST_COST);
  ui.setBeacons(world.litCount, world.beacons.length);
}

/* ── per-frame ────────────────────────────────────────────── */
function updateTitleCamera(dt) {
  titleAngle += dt * 0.055;
  const dist = 42;
  camera.position.set(
    Math.cos(titleAngle) * dist,
    12 + Math.sin(titleAngle * 0.7) * 3.5,
    Math.sin(titleAngle) * dist
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 1.5, 0);
  camera.updateProjectionMatrix();
}

function emitJumpFx(kind) {
  const feet = player.dir.clone().multiplyScalar(RADIUS + 0.18);
  if (kind === 1) {
    fx.ring(feet, player.dir, 0xf6f0e2, { scaleFrom: 0.4, scaleTo: 2.2, life: 0.45 });
    fx.burst(feet, 0xd9d2c2, 7, { speed: 2, up: player.dir, bias: 0.8, life: 0.5, size: 0.35 });
    audio.jump();
  } else {
    const sun = player.sunWorldPosition(tmpVec);
    fx.burst(sun, 0xffc247, 14, { speed: 3, life: 0.6, size: 0.45 });
    fx.ring(feet, player.dir, 0xffc247, { scaleFrom: 0.5, scaleTo: 3, life: 0.5 });
    audio.jump();
  }
}

function emitLandFx() {
  const feet = player.dir.clone().multiplyScalar(RADIUS + 0.15);
  fx.burst(feet, 0xd9d2c2, 9, { speed: 2.4, up: player.dir, bias: 0.7, life: 0.55, size: 0.4 });
  rig.addShake(0.07);
  audio.land();
}

function updatePlaying(dt) {
  runTime += dt;

  const move = {
    moveX: input.moveX,
    moveY: input.moveY,
    sprint: input.sprint,
    jump: input.consumeJump(),
  };

  player.update(dt, move, rig.forward, world);

  if (player.jumpedThisFrame) emitJumpFx(player.jumpedThisFrame);
  if (player.landedThisFrame) emitLandFx();

  rig.update(dt, player, input);
  input.endFrame();

  world.update(dt, player);
  syncHud();

  // sun sparks
  sparkleTimer -= dt;
  if (sparkleTimer <= 0) {
    sparkleTimer = 0.11 + rand(0, 0.07);
    const sun = player.sunWorldPosition(tmpVec);
    tmpColor.setHex(0xffc247);
    fx.spawnOne(sun, tmpColor, {
      vel: new THREE.Vector3(rand(-0.25, 0.25), rand(0.05, 0.4), rand(-0.25, 0.25)),
      life: 0.55, size: 0.28,
    });
  }

  // stardust
  const picked = world.collectDust(player.worldPos);
  if (picked.length) {
    player.dust += picked.length;
    totalDust += picked.length;
    syncHud();
    audio.pickup();
    for (const p of picked) {
      fx.burst(p, world.biome.dust, 8, { speed: 3.2, life: 0.6, size: 0.38 });
    }
  }

  // beacons and gate
  const near = world.nearestBeacon(player.dir, 2.9);
  const nearGate = world.portalNear(player.dir);
  const interactKey = input.touch ? 'TAP' : 'E';

  if (nearGate) {
    ui.setPrompt({ key: interactKey, label: ui.t('prompt.portal') });
  } else if (near) {
    if (player.dust >= DUST_COST) {
      ui.setPrompt({ key: interactKey, label: ui.t('prompt.plant') });
    } else {
      ui.setPrompt({ key: `✦ ${DUST_COST}`, label: ui.t('prompt.need') }, true);
    }
  } else {
    ui.setPrompt(null);
  }

  if (input.consumeInteract()) {
    if (nearGate) {
      nextPlanet();
      return;
    }
    if (near) {
      if (player.dust >= DUST_COST) igniteBeacon(near);
      else {
        audio.deny();
        ui.toast(ui.t('toast.need'));
      }
    }
  }

  // gloom contact
  for (const g of world.glooms) {
    const dist = g.dir.angleTo(player.dir) * RADIUS;
    if (dist < 1.4 && player.height < 1.5) {
      const before = player.hearts;
      const fatal = player.hit(g.dir);
      if (player.hearts < before) {
        audio.hurt();
        ui.flash('hit');
        rig.addShake(0.55);
        fx.burst(player.worldPos, 0xff5d8f, 18, { speed: 4.2, life: 0.7, size: 0.5 });
        if (fatal) {
          die();
          return;
        }
        ui.toast(ui.t('toast.hurt'), 1600);
      }
    }
  }
}

/* ── frame loop ───────────────────────────────────────────── */
const clock = new THREE.Clock();

function tick(dt) {
  switch (state) {
    case 'boot':
    case 'title':
      world.update(dt, null);
      updateTitleCamera(dt);
      break;
    case 'intro':
      world.update(dt, null);
      rig.update(dt, player, input);
      input.endFrame();
      input.clearQueues();
      syncHud();
      break;
    case 'playing':
      updatePlaying(dt);
      break;
    case 'dead':
      world.update(dt, null);
      break;
    case 'transition':
      world.update(dt, null);
      break;
    case 'paused':
    case 'win':
      break;
    default:
      break;
  }

  if (scene.background && skyTarget) {
    scene.background.lerp(skyTarget, 1 - Math.exp(-1.4 * dt));
  }
  fx.update(dt);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  tick(dt);
  renderer.render(scene, camera);
}
frame();

/* ── resize ───────────────────────────────────────────────── */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);
onResize();

/* ── tiny dev hook ────────────────────────────────────────── */
window.PocketSun = {
  get state() { return state; },
  get level() { return level; },
  start: () => startRun(),
  goTo: (n) => {
    if (state === 'title' || state === 'paused') {
      ui.showTitle(false);
      ui.showHud(true);
      resetRunState();
      level = clamp(n, 0, LEVELS.length - 1);
      loadLevel(level);
      state = 'intro';
    }
  },
  // handy for automated smoke tests
  debug: { scene, camera, renderer, world, player, rig, ui, audio, input, fx, get state() { return state; } },
};
