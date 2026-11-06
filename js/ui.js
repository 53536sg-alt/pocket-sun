/**
 * POCKET SUN — interface, language and credits.
 * Copyright (c) 2026 Nashwan (Cybertux). MIT License.
 */
import { CREDITS } from './credits.js';
import { formatTime } from './utils.js';

const DICT = {
  en: {
    loading: 'Warming up the sun',
    'brand.kicker': 'A tiny planet adventure',
    'brand.tagline': 'Carry the last sun. Wake a sleeping world.',
    start: 'Begin the vigil',
    help: 'How to play',
    credits: 'Credits',
    hint: 'WASD move · Space jump · Shift sprint · Drag to look',
    'pause.label': 'VIGIL PAUSED',
    'pause.title': 'Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart run',
    'pause.quit': 'Leave to title',
    'help.label': 'FIELD NOTES',
    'help.title': 'How to play',
    'help.p1': 'You are the Sunkeeper. Your little sun keeps the dark at bay, but it cannot wake a world on its own.',
    'help.r1': 'Gather stardust drifting above the surface.',
    'help.r2': 'Stand by a sleeping beacon and press E to spend 3 stardust. It blooms into light.',
    'help.r3': 'Gloom creatures hate the light. Keep moving, and sprint when they get close.',
    'help.r4': 'Light every beacon to open the gate. Follow the beam to the next planet.',
    'help.kMove': 'move',
    'help.kJump': 'jump',
    'help.kSprint': 'sprint',
    'help.kLight': 'wake beacon',
    'help.kLook': 'look around',
    'help.kPause': 'pause',
    'help.foot': 'THERE IS NO RUSH. ONLY THE DARK.',
    'credits.label': 'COLOPHON',
    'credits.title': 'Credits',
    'credits.role': 'Code · Art direction · Sound',
    'credits.developer': 'Developer',
    'credits.website': 'Website',
    'credits.engine': 'Engine',
    'credits.music': 'Music',
    'credits.license': 'License',
    'credits.note': 'Every shape, colour and note in Pocket Sun was made in code. No asset packs, no shortcuts — just a small planet, built by hand.',
    'win.label': 'VIGIL COMPLETE',
    'win.title': 'The world is awake.',
    'win.lede': 'Every beacon is burning. For the first time in a long time, the dark has nothing to hold.',
    'win.time': 'VIGIL TIME',
    'win.dust': 'STARDUST',
    'win.beacons': 'BEACONS',
    'win.again': 'Walk it again',
    'footer.made': 'Made by',
    'btn.jump': 'JUMP',
    'btn.light': 'LIGHT',
    'level.tag': 'PLANET',
    'prompt.plant': 'Light this beacon',
    'prompt.need': 'Need 3 stardust',
    'prompt.portal': 'Step through the gate',
    'toast.need': 'You need 3 stardust to wake this beacon.',
    'toast.gate': 'The gate is open — follow the beam.',
    'toast.death': 'The gloom caught you. Rekindling at the last beacon.',
    'toast.hurt': 'The gloom burns cold. Keep to the light.',
    'pips.spent': 'spent',
  },
  ar: {
    loading: 'نُشعل الشمس',
    'brand.kicker': 'مغامرة على كوكب صغير',
    'brand.tagline': 'احمل آخر شمس. أيقظ عالماً نائماً.',
    start: 'ابدأ الحراسة',
    help: 'طريقة اللعب',
    credits: 'الحقوق',
    hint: 'WASD للحركة · Space للقفز · Shift للركض · اسحب للنظر',
    'pause.label': 'الحراسة متوقفة',
    'pause.title': 'توقّف مؤقت',
    'pause.resume': 'متابعة',
    'pause.restart': 'إعادة من البداية',
    'pause.quit': 'العودة للقائمة',
    'help.label': 'ملاحظات الميدان',
    'help.title': 'طريقة اللعب',
    'help.p1': 'أنت حارس الشمس. شمسك الصغيرة تُبعد الظلام، لكنها لا تستطيع إيقاظ عالمٍ وحدها.',
    'help.r1': 'اجمع غبار النجوم الطافي فوق السطح.',
    'help.r2': 'قف قرب منارة نائمة واضغط E لتصرف ٣ من غبار النجوم. ستتفتّح نوراً.',
    'help.r3': 'مخلوقات الظل تكره النور. استمر بالحركة، واركض عندما تقترب.',
    'help.r4': 'أشعل كل المنارات لتنفتح البوابة. اتبع الشعاع إلى الكوكب التالي.',
    'help.kMove': 'حركة',
    'help.kJump': 'قفز',
    'help.kSprint': 'ركض',
    'help.kLight': 'إيقاظ المنارة',
    'help.kLook': 'تدوير الكاميرا',
    'help.kPause': 'إيقاف',
    'help.foot': 'لا عجلة. فقط الظلام.',
    'credits.label': 'بطاقة العمل',
    'credits.title': 'الحقوق',
    'credits.role': 'برمجة · اتجاه فني · صوت',
    'credits.developer': 'المطوّر',
    'credits.website': 'الموقع',
    'credits.engine': 'المحرّك',
    'credits.music': 'الموسيقى',
    'credits.license': 'الرخصة',
    'credits.note': 'كل شكل ولون ونغمة في Pocket Sun صُنعت بالكود. لا حزم جاهزة ولا اختصارات — فقط كوكب صغير، مبني باليد.',
    'win.label': 'اكتملت الحراسة',
    'win.title': 'العالم استيقظ.',
    'win.lede': 'كل المنارات تشتعل. ولأول مرة منذ زمن، لم يبقَ للظلام ما يحتضنه.',
    'win.time': 'زمن الحراسة',
    'win.dust': 'غبار النجوم',
    'win.beacons': 'المنارات',
    'win.again': 'العب مرة أخرى',
    'footer.made': 'صناعة',
    'btn.jump': 'قفز',
    'btn.light': 'نور',
    'level.tag': 'كوكب',
    'prompt.plant': 'أشعل هذه المنارة',
    'prompt.need': 'تحتاج ٣ غبار نجوم',
    'prompt.portal': 'اعبر البوابة',
    'toast.need': 'تحتاج ٣ من غبار النجوم لإيقاظ هذه المنارة.',
    'toast.gate': 'البوابة انفتحت — اتبع الشعاع.',
    'toast.death': 'أمسك بك الظل. نعود للاشتعال عند آخر منارة.',
    'toast.hurt': 'الظل بارد كالجمر. ابقَ في النور.',
    'pips.spent': 'مصروف',
  },
};

export class UI {
  constructor() {
    let savedLang = 'en';
    try { savedLang = localStorage.getItem('ps_lang') || 'en'; } catch { /* private mode */ }
    this.lang = savedLang === 'ar' ? 'ar' : 'en';
    this.actions = {};
    this.toastTimer = null;
    this.levelTimer = null;
    this.last = {
      hearts: -1, maxHearts: -1, dust: -1, lit: -1, total: -1, prompt: '',
    };

    this.$ = {
      boot: document.getElementById('boot'),
      bootBar: document.getElementById('boot-bar'),
      title: document.getElementById('title'),
      hud: document.getElementById('hud'),
      hearts: document.getElementById('hearts'),
      dust: document.getElementById('dust-count'),
      dustNeed: document.getElementById('dust-need'),
      beacons: document.getElementById('beacon-count'),
      pips: document.getElementById('beacon-pips'),
      prompt: document.getElementById('prompt'),
      hint: document.getElementById('hint'),
      toast: document.getElementById('toast'),
      levelCard: document.getElementById('level-card'),
      lcNum: document.getElementById('lc-num'),
      lcName: document.getElementById('lc-name'),
      lcSub: document.getElementById('lc-sub'),
      flash: document.getElementById('flash'),
      fade: document.getElementById('fade'),
      creditsBody: document.getElementById('credits-body'),
      langBtn: document.getElementById('lang-btn'),
      muteBtn: document.getElementById('mute-btn'),
      statTime: document.getElementById('stat-time'),
      statDust: document.getElementById('stat-dust'),
      statBeacons: document.getElementById('stat-beacons'),
    };

    this.buildHearts(3);
    this.bindActions();
    this.applyLanguage(this.lang, true);
  }

  /* ── wiring ─────────────────────────────────────────────── */

  on(action, fn) {
    this.actions[action] = fn;
  }

  bindActions() {
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        if (this.actions[action]) {
          e.preventDefault();
          this.actions[action]();
        }
      });
    });

    document.querySelectorAll('.overlay').forEach((overlay) => {
      overlay.addEventListener('pointerdown', (e) => {
        if (e.target !== overlay) return;
        const close = {
          pause: 'resume', help: 'close-help', credits: 'close-credits',
        }[overlay.id];
        if (close && this.actions[close]) this.actions[close]();
      });
    });
  }

  t(key) {
    return DICT[this.lang]?.[key] ?? DICT.en[key] ?? key;
  }

  applyLanguage(lang, initial = false) {
    this.lang = lang;
    try { localStorage.setItem('ps_lang', lang); } catch { /* private mode */ }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const value = this.t(key);
      if (value != null) el.textContent = value;
    });
    if (this.$.langBtn) this.$.langBtn.textContent = lang === 'ar' ? 'EN' : 'ع';
    document.querySelectorAll('[data-action="lang"]').forEach((btn) => {
      btn.textContent = lang === 'ar' ? 'EN' : 'ع';
    });
    this.buildCredits();
    this.last.prompt = '';
    if (!initial) this.buildHearts(this.last.maxHearts > 0 ? this.last.maxHearts : 3);
  }

  toggleLanguage() {
    this.applyLanguage(this.lang === 'ar' ? 'en' : 'ar');
    return this.lang;
  }

  /* ── screens ────────────────────────────────────────────── */

  setBootProgress(p) {
    if (this.$.bootBar) this.$.bootBar.style.width = `${Math.round(p * 100)}%`;
  }

  showBoot(show) {
    this.$.boot.classList.toggle('is-open', show);
  }

  showTitle(show) {
    this.$.title.classList.toggle('is-open', show);
  }

  showHud(show) {
    this.$.hud.classList.toggle('is-open', show);
    this.$.hud.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-open');
  }

  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-open');
  }

  closeAll() {
    document.querySelectorAll('.overlay').forEach((o) => o.classList.remove('is-open'));
  }

  setMuted(muted) {
    if (!this.$.muteBtn) return;
    this.$.muteBtn.classList.toggle('muted', muted);
  }

  /* ── hud ────────────────────────────────────────────────── */

  buildHearts(count) {
    if (!this.$.hearts) return;
    this.$.hearts.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'heart on';
      s.textContent = '✦';
      this.$.hearts.appendChild(s);
    }
  }

  setHearts(hearts, max) {
    if (hearts === this.last.hearts && max === this.last.maxHearts) return;
    this.last.hearts = hearts;
    this.last.maxHearts = max;
    const nodes = this.$.hearts.children;
    if (nodes.length !== max) this.buildHearts(max);
    for (let i = 0; i < max; i++) {
      const node = this.$.hearts.children[i];
      const on = i < hearts;
      node.classList.toggle('on', on);
      node.classList.toggle('lost', !on);
    }
  }

  setDust(n, cost = 3) {
    if (n === this.last.dust) return;
    this.last.dust = n;
    this.$.dust.textContent = String(n);
    this.$.dustNeed.textContent = String(cost);
    this.$.dust.classList.toggle('ready', n >= cost);
  }

  setBeacons(lit, total) {
    if (lit === this.last.lit && total === this.last.total) return;
    this.last.lit = lit;
    this.last.total = total;
    this.$.beacons.textContent = `${lit}/${total}`;
    if (this.$.pips.children.length !== total) {
      this.$.pips.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const p = document.createElement('span');
        p.className = 'pip';
        this.$.pips.appendChild(p);
      }
    }
    [...this.$.pips.children].forEach((p, i) => p.classList.toggle('on', i < lit));
  }

  setPrompt(text, warn = false) {
    const signature = text ? `${text.key || ''}|${text.label || text}|${warn ? 1 : 0}` : '';
    if (signature === this.last.prompt) return;
    this.last.prompt = signature;
    if (!text) {
      this.$.prompt.classList.remove('on', 'warn');
      this.$.prompt.innerHTML = '';
      return;
    }
    const key = text.key || '';
    this.$.prompt.innerHTML = `${key ? `<span class="key">${key}</span>` : ''}<span>${text.label || text}</span>`;
    this.$.prompt.classList.toggle('warn', !!warn);
    this.$.prompt.classList.add('on');
  }

  toast(text, duration = 2800) {
    if (!this.$.toast) return;
    this.$.toast.textContent = text;
    this.$.toast.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.$.toast.classList.remove('on'), duration);
  }

  flash(kind = 'hit') {
    const el = this.$.flash;
    el.classList.remove('hit', 'warm');
    void el.offsetWidth;
    el.classList.add(kind === 'warm' ? 'warm' : 'hit');
  }

  showLevelCard(index, level, duration = 2100, done) {
    clearTimeout(this.levelTimer);
    this.$.lcNum.textContent = String(index + 1).padStart(2, '0');
    this.$.lcName.textContent = this.lang === 'ar' ? level.nameAr : level.name;
    this.$.lcSub.textContent = this.lang === 'ar' ? level.subAr : level.sub;
    this.$.levelCard.classList.add('on');
    this.levelTimer = setTimeout(() => {
      this.$.levelCard.classList.remove('on');
      if (done) done();
    }, duration);
  }

  hideLevelCard() {
    clearTimeout(this.levelTimer);
    this.$.levelCard.classList.remove('on');
  }

  showWin(stats) {
    this.$.statTime.textContent = formatTime(stats.time);
    this.$.statDust.textContent = String(stats.dust);
    this.$.statBeacons.textContent = String(stats.beacons);
    this.open('win');
  }

  /* ── credits ────────────────────────────────────────────── */

  buildCredits() {
    if (!this.$.creditsBody) return;
    const site = CREDITS.site.replace(/^https?:\/\//, '');
    const rows = [
      [this.t('credits.developer'), `${CREDITS.name} / ${CREDITS.realName}`],
      [this.t('credits.website'), `<a href="${CREDITS.site}" target="_blank" rel="noopener noreferrer">${site}</a>`],
      [this.t('credits.engine'), 'Three.js <span class="dim">(MIT)</span>'],
      [this.t('credits.music'), 'WebAudio <span class="dim">— live synthesis</span>'],
      [this.t('credits.license'), 'MIT <span class="dim">© 2026</span>'],
    ];
    this.$.creditsBody.innerHTML = `
      <div class="credits-hero">
        <svg aria-hidden="true"><use href="#mark"/></svg>
        <div>
          <div class="credits-name">${CREDITS.name} <span class="dim">/ ${CREDITS.realName}</span></div>
          <div class="credits-role">${this.t('credits.role')}</div>
        </div>
      </div>
      <div class="credits-rows">
        ${rows.map(([k, v]) => `<div class="credits-row"><span>${k}</span><span>${v}</span></div>`).join('')}
      </div>
      <div class="credits-links">
        ${CREDITS.links.map((l) => `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label} ↗</a>`).join('')}
      </div>
      <div class="credits-note">${this.t('credits.note')}</div>
    `;
  }
}
