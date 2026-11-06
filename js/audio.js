/**
 * POCKET SUN — procedural sound.
 * No audio files. Every note is synthesised at runtime with WebAudio.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */

const ROOTS = [146.83, 130.81, 110.0, 98.0, 87.31];
const SCALE = [1, 1.2, 1.335, 1.5, 1.78, 2, 2.4, 2.67, 3];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.delay = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('ps_muted') === '1'; } catch { /* private mode */ }
    this.musicTimer = null;
    this.drone = null;
    this.step = 0;
    this.level = 0;
    this.paused = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.7;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);

      // A little space for the plucks.
      this.delay = this.ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.36;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.3;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.35;
      this.delay.connect(feedback);
      feedback.connect(this.delay);
      this.delay.connect(wet);
      wet.connect(this.musicBus);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('ps_muted', muted ? '1' : '0'); } catch { /* private mode */ }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, t + 0.25);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = paused ? 0.12 : 0.7;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(target, t + 0.4);
    if (!paused) this.ensure();
  }

  /* ── primitives ─────────────────────────────────────────── */

  tone(freq, dur = 0.2, opts = {}) {
    if (!this.ctx) return;
    const {
      type = 'sine', gain = 0.08, slide = null, when = 0,
      dest = this.sfxBus, attack = 0.008, detune = 0,
    } = opts;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur = 0.3, opts = {}) {
    if (!this.ctx) return;
    const {
      gain = 0.1, when = 0, freq = 900, q = 0.8,
      sweepTo = null, type = 'bandpass', dest = this.sfxBus,
    } = opts;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q;
    if (sweepTo != null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /* ── effects ────────────────────────────────────────────── */

  ui() {
    this.tone(720, 0.06, { type: 'sine', gain: 0.035 });
  }

  pickup() {
    this.tone(1046, 0.12, { type: 'sine', gain: 0.06, slide: 1568 });
    this.tone(1568, 0.18, { type: 'triangle', gain: 0.03, when: 0.04 });
  }

  jump() {
    this.tone(300, 0.14, { type: 'triangle', gain: 0.045, slide: 540 });
  }

  land() {
    this.noise(0.08, { gain: 0.05, freq: 420, q: 1.2 });
  }

  ignite() {
    if (!this.ctx) return;
    const root = ROOTS[this.level % ROOTS.length] * 2;
    const chord = [1, 1.25, 1.5, 2, 2.5];
    chord.forEach((r, i) => {
      this.tone(root * r, 2.4, {
        type: i % 2 ? 'triangle' : 'sine',
        gain: 0.05,
        when: i * 0.06,
        attack: 0.4,
      });
    });
    this.tone(root / 2, 1.6, { type: 'sine', gain: 0.14, slide: root / 3, attack: 0.02 });
    this.noise(1.4, { gain: 0.06, freq: 400, sweepTo: 4200, q: 0.7, type: 'bandpass' });
    // sparkle
    for (let i = 0; i < 5; i++) {
      this.tone(root * (2 + i * 0.5), 0.35, {
        type: 'sine', gain: 0.025, when: 0.15 + i * 0.07,
      });
    }
  }

  hurt() {
    this.tone(220, 0.4, { type: 'sawtooth', gain: 0.09, slide: 60 });
    this.noise(0.28, { gain: 0.09, freq: 600, sweepTo: 120, q: 0.6, type: 'lowpass' });
  }

  deny() {
    this.tone(150, 0.1, { type: 'square', gain: 0.035 });
    this.tone(120, 0.14, { type: 'square', gain: 0.03, when: 0.09 });
  }

  portal() {
    const root = ROOTS[this.level % ROOTS.length] * 2;
    [1, 1.25, 1.5, 2, 2.5, 3].forEach((r, i) => {
      this.tone(root * r, 0.6, { type: 'sine', gain: 0.045, when: i * 0.08, attack: 0.02 });
    });
    this.noise(1.2, { gain: 0.05, freq: 700, sweepTo: 5000, q: 1.2 });
  }

  gateOpen() {
    const root = ROOTS[this.level % ROOTS.length];
    [1, 1.5, 2, 3].forEach((r, i) => {
      this.tone(root * r, 2.2, { type: 'sine', gain: 0.05, when: i * 0.12, attack: 0.3 });
    });
  }

  death() {
    this.tone(110, 1.6, { type: 'sine', gain: 0.1, slide: 55 });
    this.noise(1.2, { gain: 0.06, freq: 500, sweepTo: 80, q: 0.5, type: 'lowpass' });
  }

  win() {
    const root = ROOTS[0];
    const seq = [1, 1.25, 1.5, 2, 1.5, 2, 2.5, 3];
    seq.forEach((r, i) => {
      this.tone(root * r, 1.4, {
        type: 'triangle', gain: 0.05, when: i * 0.22, attack: 0.06,
      });
    });
    this.tone(root / 2, 3.5, { type: 'sine', gain: 0.09, attack: 0.5 });
  }

  /* ── music ──────────────────────────────────────────────── */

  startMusic(level = 0) {
    if (!this.ensure()) return;
    this.stopMusic();
    this.level = level;
    this.step = 0;
    const root = ROOTS[level % ROOTS.length];

    // Continuous low drone.
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 2.5);
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 380;
    droneGain.connect(droneFilter);
    droneFilter.connect(this.musicBus);
    const oscA = this.ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = root / 2;
    const oscB = this.ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = root / 2;
    oscB.detune.value = 7;
    oscA.connect(droneGain);
    oscB.connect(droneGain);
    oscA.start();
    oscB.start();
    this.drone = { oscA, oscB, droneGain };

    const chords = [
      [1, 1.5, 2],
      [1, 1.335, 1.78],
      [1, 1.2, 1.5],
      [0.89, 1.335, 1.78],
    ];

    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.paused) return;
      const s = this.step++;
      if (s % 32 === 0) {
        const chord = chords[(s / 32) % chords.length | 0];
        const t0 = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.035, t0 + 2.4);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 9.5);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(650, t0);
        f.frequency.linearRampToValueAtTime(1200, t0 + 6);
        g.connect(f);
        f.connect(this.musicBus);
        chord.forEach((r, i) => {
          const o = this.ctx.createOscillator();
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = root * r;
          o.detune.value = (i - 1) * 5;
          o.connect(g);
          o.start(t0);
          o.stop(t0 + 9.7);
        });
      }
      if (s % 6 === 3 && Math.random() > 0.25) {
        const note = SCALE[Math.floor(Math.random() * SCALE.length)];
        const octave = Math.random() > 0.72 ? 4 : 2;
        const t0 = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = root * note * octave;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.022, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        o.connect(g);
        g.connect(this.musicBus);
        g.connect(this.delay);
        o.start(t0);
        o.stop(t0 + 0.8);
      }
    }, 250);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.drone && this.ctx) {
      const { oscA, oscB, droneGain } = this.drone;
      const t = this.ctx.currentTime;
      try {
        droneGain.gain.cancelScheduledValues(t);
        droneGain.gain.setValueAtTime(droneGain.gain.value, t);
        droneGain.gain.linearRampToValueAtTime(0.0001, t + 0.8);
        oscA.stop(t + 1.0);
        oscB.stop(t + 1.0);
      } catch (e) { /* already stopped */ }
      this.drone = null;
    }
  }
}
