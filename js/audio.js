/* ═══════ GRUKK — WebAudio: tribal müzik + ilkel SFX (asset yok, hepsi sentez) ═══════ */
'use strict';

const AudioSys = {
  ctx: null, master: null, sfxGain: null, musicGain: null,
  started: false, musicTimer: null, beat: 0, tempo: 92, intensity: 0,
  pickupPitch: 0, pickupReset: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.applyVolumes();
    } catch (e) { this.ctx = null; }
  },

  applyVolumes() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = Meta.save.settings.sfx;
    this.musicGain.gain.value = Meta.save.settings.music * 0.5;
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  /* ── temel sentez yardımcıları ── */
  osc(type, freq, t0, dur, vol, freqEnd, dest) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  noise(t0, dur, vol, freq, dest) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },

  /* ── SFX kataloğu ── */
  sfx(name, opt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'throw':    this.noise(t, .08, .12, 2400); break;
      case 'axe':      this.noise(t, .05, .07, 1400); break;
      case 'zap':      this.osc('sawtooth', 880, t, .09, .07, 220); break;
      case 'wave':     this.osc('sine', 180, t, .3, .1, 60); break;
      case 'lava':     this.noise(t, .12, .1, 500); this.osc('sine', 140, t, .15, .1, 60); break;
      case 'explode':  this.noise(t, .3, .22, 320); this.osc('sine', 90, t, .3, .25, 35); break;
      case 'trap':     this.noise(t, .06, .08, 900); break;
      case 'hit':      this.noise(t, .05, .09, 1800); break;
      case 'kill':     this.osc('square', 320 + Math.random()*80, t, .08, .06, 110); break;
      case 'xp': {
        const p = 440 * Math.pow(1.0594, Math.min(24, this.pickupPitch));
        this.osc('sine', p, t, .09, .09, p * 1.4);
        this.pickupPitch++; this.pickupReset = performance.now() + 900;
        break;
      }
      case 'coin':     this.osc('triangle', 1320, t, .1, .09, 1760); break;
      case 'meat':     this.osc('sine', 240, t, .18, .12, 360); break;
      case 'powerup':  this.osc('triangle', 520, t, .25, .12, 1040); this.osc('triangle', 660, t+.08, .25, .1, 1320); break;
      case 'levelup':
        [392, 494, 587, 784].forEach((f, i) => this.osc('triangle', f, t + i*.07, .3, .12));
        break;
      case 'pick':     this.osc('triangle', 660, t, .12, .1, 880); this.noise(t, .05, .05, 2000); break;
      case 'hurt':     this.noise(t, .12, .18, 700); this.osc('sawtooth', 160, t, .14, .12, 70); break;
      case 'heartbeat': this.osc('sine', 60, t, .12, .25, 40); this.osc('sine', 55, t+.18, .1, .18, 38); break;
      case 'death':    this.osc('sawtooth', 220, t, .9, .2, 40); this.noise(t, .5, .15, 400); break;
      case 'roar':
        this.osc('sawtooth', 90, t, .9, .3, 45);
        this.noise(t, .7, .2, 250);
        this.osc('square', 65, t + .15, .7, .2, 38);
        break;
      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('triangle', f, t + i*.11, .45, .13));
        break;
      case 'quest':    this.osc('triangle', 784, t, .2, .1, 988); break;
      case 'achievement': [659, 831, 988].forEach((f,i)=>this.osc('triangle', f, t+i*.09, .3, .12)); break;
      case 'chest':    [523,659,784].forEach((f,i)=>this.osc('sine', f, t+i*.06, .2, .1)); break;
      case 'revive':   this.osc('sine', 220, t, .6, .18, 880); this.noise(t,.3,.1,800); break;
      case 'slow':     this.osc('sine', 880, t, .5, .1, 220); break;
    }
  },

  tick() { // her frame: pickup pitch sıfırlama
    if (this.pickupPitch && performance.now() > this.pickupReset) this.pickupPitch = 0;
  },

  /* ── Tribal müzik döngüsü ── */
  startMusic() {
    this.resume();
    if (!this.ctx || this.musicTimer) return;
    this.beat = 0;
    const step = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime + 0.05;
      const b = this.beat % 16;
      const g = this.musicGain;
      // davullar: kick (derin tom)
      if (b === 0 || b === 6 || b === 8 || (b === 14 && this.intensity > .5))
        this.osc('sine', 82, t, .22, .5, 40, g);
      // orta tom
      if (b === 4 || b === 12 || (this.intensity > .3 && b === 10))
        this.osc('sine', 130, t, .15, .3, 70, g);
      // el çırpma / taş tıkırtısı
      if (b % 4 === 2) this.noise(t, .04, .12 + this.intensity * .1, 3000, g);
      // shaker
      if (this.intensity > .4 && b % 2 === 1) this.noise(t, .03, .05, 6000, g);
      // pentatonik kemik flütü motifi (seyrek)
      if (b === 0 && Math.random() < .45) {
        const scale = [392, 440, 523, 587, 698];
        let tt = t;
        for (let i = 0; i < 3 + Math.floor(Math.random()*3); i++) {
          const f = scale[Math.floor(Math.random() * scale.length)];
          this.osc('triangle', f, tt, .28, .06, f * (Math.random() < .3 ? 1.06 : 1), g);
          tt += .22;
        }
      }
      this.beat++;
      const bpm = this.tempo + this.intensity * 36;
      this.musicTimer = setTimeout(step, (60 / bpm / 4) * 1000);
    };
    step();
  },

  stopMusic() {
    if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; }
  },

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); },
};
