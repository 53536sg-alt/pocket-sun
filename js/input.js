/**
 * POCKET SUN — keyboard, pointer and touch input.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.zoom = 0;
    this.jumpQueued = false;
    this.interactQueued = false;
    this.stickX = 0;
    this.stickY = 0;
    this.sprint = false;
    this.dragging = false;
    this.dragDistance = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.pointerId = null;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.touch) document.body.classList.add('touch');
    this.bindKeyboard();
    this.bindPointer();
    this.bindTouch();
  }

  /* ── keyboard ───────────────────────────────────────────── */

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        if (MOVE_KEYS[e.code]) e.preventDefault();
        return;
      }
      if (MOVE_KEYS[e.code]) {
        this.keys.add(e.code);
        e.preventDefault();
        return;
      }
      if (e.code === 'Space') {
        this.jumpQueued = true;
        e.preventDefault();
      } else if (e.code === 'KeyE' || e.code === 'Enter') {
        this.interactQueued = true;
        if (e.code === 'KeyE') e.preventDefault();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.sprint = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.sprint = false;
      this.dragging = false;
    });
  }

  /* ── pointer / mouse camera ─────────────────────────────── */

  bindPointer() {
    const c = this.canvas;

    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // touch look is handled below
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.dragging = true;
      this.pointerId = e.pointerId;
      this.dragDistance = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      try { c.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
      c.style.cursor = 'grabbing';
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.dragging || e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);
      this.lookX += dx;
      this.lookY += dy;
    });

    const end = (e) => {
      if (e.pointerId !== this.pointerId) return;
      const wasClick = this.dragDistance < 6;
      this.dragging = false;
      this.pointerId = null;
      c.style.cursor = 'grab';
      if (wasClick && e.type === 'pointerup') this.interactQueued = true;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += Math.sign(e.deltaY);
    }, { passive: false });

    // touch look (single finger on the canvas)
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      this.dragging = true;
      this.pointerId = e.pointerId;
      this.dragDistance = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      try { c.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
    }, { passive: true });

    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !this.dragging || e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);
      this.lookX += dx;
      this.lookY += dy;
    }, { passive: true });
  }

  /* ── on-screen controls ─────────────────────────────────── */

  bindTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const jump = document.getElementById('btn-jump');
    const light = document.getElementById('btn-light');
    if (!stick || !knob) return;

    let active = false;
    let id = null;
    let cx = 0;
    let cy = 0;
    const max = 40;

    const move = (e) => {
      if (!active || e.pointerId !== id) return;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.stickX = dx / max;
      this.stickY = -dy / max;
    };

    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = true;
      id = e.pointerId;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      try { stick.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
      move(e);
    });
    stick.addEventListener('pointermove', move, { passive: false });
    const stop = (e) => {
      if (e.pointerId !== id) return;
      active = false;
      id = null;
      this.stickX = 0;
      this.stickY = 0;
      knob.style.transform = 'translate(0, 0)';
    };
    stick.addEventListener('pointerup', stop);
    stick.addEventListener('pointercancel', stop);

    const press = (el, fn) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        fn();
      });
      const up = () => el.classList.remove('pressed');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    press(jump, () => { this.jumpQueued = true; });
    press(light, () => { this.interactQueued = true; });
  }

  /* ── frame api ──────────────────────────────────────────── */

  get moveX() {
    let x = 0;
    for (const code of this.keys) {
      const m = MOVE_KEYS[code];
      if (m) x += m[0];
    }
    return Math.max(-1, Math.min(1, x + this.stickX));
  }

  get moveY() {
    let y = 0;
    for (const code of this.keys) {
      const m = MOVE_KEYS[code];
      if (m) y += m[1];
    }
    return Math.max(-1, Math.min(1, y + this.stickY));
  }

  consumeJump() {
    const v = this.jumpQueued;
    this.jumpQueued = false;
    return v;
  }

  consumeInteract() {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  endFrame() {
    this.lookX = 0;
    this.lookY = 0;
    this.zoom = 0;
  }

  clearQueues() {
    this.jumpQueued = false;
    this.interactQueued = false;
    this.stickX = 0;
    this.stickY = 0;
  }
}
