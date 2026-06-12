/* ═══════ GRUKK — Oyun Motoru: döngü, savaş, dalga, boss, pickup, level ═══════ */
'use strict';

const ARENA = 4000;

function mulberry32(a) {
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const dist2 = (ax, ay, bx, by) => { const dx = ax-bx, dy = ay-by; return dx*dx + dy*dy; };

const Game = {
  canvas: null, ctx: null, W: 0, H: 0, dpr: 1, zoom: 1,
  state: 'boot',          // boot|menu|playing|paused|levelup|dying|winning|over
  keys: {}, joy: { active:false, id:-1, ox:0, oy:0, dx:0, dy:0 },
  run: null, last: 0, hudT: 0,

  /* ════════ INIT ════════ */
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if ((e.code === 'KeyP' || e.code === 'Escape')) {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // dinamik sanal joystick (dokunma)
    const jdom = document.getElementById('joystick');
    const jbase = document.getElementById('joy-base');
    const jknob = document.getElementById('joy-knob');
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || this.joy.active) return;
      if (this.state !== 'playing' && this.state !== 'dying') return;
      this.joy.active = true; this.joy.id = e.pointerId;
      this.joy.ox = e.clientX; this.joy.oy = e.clientY; this.joy.dx = 0; this.joy.dy = 0;
      jdom.classList.remove('hidden');
      jbase.style.left = e.clientX + 'px'; jbase.style.top = e.clientY + 'px';
      jknob.style.transform = 'translate(-50%,-50%)';
    });
    window.addEventListener('pointermove', e => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const d = Math.hypot(dx, dy), m = 46;
      if (d > m) { dx = dx / d * m; dy = dy / d * m; }
      this.joy.dx = dx / m; this.joy.dy = dy / m;
      jknob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    });
    const jend = e => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0;
      jdom.classList.add('hidden');
    };
    window.addEventListener('pointerup', jend);
    window.addEventListener('pointercancel', jend);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    requestAnimationFrame(ts => this.loop(ts));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.zoom = clamp(Math.max(this.W, this.H) / 1150, 0.62, 1.0);
  },

  /* ════════ RUN BAŞLAT ════════ */
  startRun() {
    const s = Meta.save;
    const charDef = DATA.characters.find(c => c.id === s.selectedChar) || DATA.characters[0];
    const zone = DATA.zones.find(z => z.id === s.selectedZone) || DATA.zones[0];
    const mode = DATA.modes.find(m => m.id === s.selectedMode) || DATA.modes[1];
    const hard = s.hardMode && s.hardUnlocked;
    const seed = (Math.random() * 1e9) | 0;
    const rng = mulberry32(seed);

    const diffMult = mode.id === 'short' ? 0.8 : (mode.id === 'long' ? 1.05 : 1);
    const bossMult = (mode.id === 'short' ? 0.55 : (mode.id === 'long' ? 1.6 : 1)) * (hard ? 1.35 : 1);

    const run = this.run = {
      t: 0, len: mode.len, mode, zone, charDef, hard, seed, rng,
      diffMult: diffMult * (hard ? 1.35 : 1), dmgDiff: hard ? 1.3 : 1, bossMult,
      enemies: [], projs: [], eprojs: [], gems: [], drops: [], traps: [], rings: [],
      pools: [], parts: [], dnums: [], bolts: [], telegraphs: [], obstacles: [], decos: [],
      cam: { x: ARENA/2, y: ARENA/2 }, shakeT: 0, shakeAmp: 0,
      spawnAcc: 0, bossFlags: [false, false, false, false], boss: null,
      breather: 0, hordes: { h1: false, h2: false },
      slowT: 0, heartT: 0, hintT: 7, dyingT: 0, winT: 0,
      cardQueue: [], grid: new Map(),
      special: { magnet: 0, totem: 0, fossil: 0 },
      minibossKills: 0, achBefore: Object.keys(s.achievements).slice(),
      charLvlBefore: Meta.charLevel(charDef.id),
      trapUnlockDone: s.weaponsUnlocked.includes('trap'),
      player: null,
    };

    // engeller + dekorlar (seed'li)
    for (let i = 0; i < 12; i++) {
      let x, y;
      do { x = 200 + rng() * (ARENA - 400); y = 200 + rng() * (ARENA - 400); }
      while (dist2(x, y, ARENA/2, ARENA/2) < 360 * 360);
      run.obstacles.push({ x, y, r: 26 + rng() * 18 });
    }
    for (let i = 0; i < 150; i++) {
      run.decos.push({ x: rng() * ARENA, y: rng() * ARENA, s: 3 + rng() * 9,
        c: zone.deco[(rng() * zone.deco.length) | 0], a: rng() * Math.PI });
    }

    // oyuncu
    const startWLvl = 1 + Meta.metaLvl('hands');
    const p = run.player = {
      x: ARENA/2, y: ARENA/2, face: 1, moving: false, walkT: 0,
      r: 14, hp: 0, invuln: 0, lvl: 1, xp: 0, xpTotal: 0,
      kills: 0, coinsRaw: 0, weaponKills: {}, dmgBy: {},
      rerolls: Meta.metaLvl('reroll'), revives: Meta.metaLvl('breath'),
      weapons: [{ id: charDef.weapon, lvl: Math.min(5, startWLvl), evolved: false, cd: 0.3, angle: 0 }],
      passives: {}, stats: null,
    };
    p.xpNeed = this.xpNeed(1);
    Meta.markSeen('weaponsUsed', charDef.weapon);
    Meta.markSeen('charsUsed', charDef.id);
    this.recalcStats();
    p.hp = p.stats.maxhp;

    this.state = 'playing';
    UI.startRunUI(run);
    AudioSys.resume();
    AudioSys.startMusic();
  },

  xpNeed(l) { return Math.round(8 + 7 * (l - 1) + 1.6 * Math.pow(l - 1, 1.9)); },

  /* ════════ STAT HESABI ════════ */
  recalcStats() {
    const run = this.run, p = run.player, c = run.charDef;
    const pv = id => (p.passives[id] ? p.passives[id].val : 0);
    const charLvl = Meta.charLevel(c.id);
    const s = {
      dmg: c.dmg * (1 + Meta.metaBonus('edge')) * (1 + pv('sharp')) * (1 + charLvl * 0.01),
      aspd: 1 + pv('haste'),
      area: c.area * (1 + pv('blast') + pv('spirit') * 0.0) * (1 + (p.passives.spirit ? p.passives.spirit.n * 0.05 : 0)),
      speed: 220 * c.speed * (1 + pv('swift')),
      maxhp: Math.round(c.hp + Meta.metaBonus('heart') + pv('hide')),
      armor: c.armor + pv('shell'),
      crit: 0.03 + pv('eye') + (p.passives.chain ? p.passives.chain.n * 0.02 : 0),
      pickup: 70 * c.pickup * (1 + Meta.metaBonus('arms')) * (1 + pv('magnet')),
      xpgain: c.xp * (1 + Meta.metaBonus('soul')) * (1 + pv('lore')),
      coingain: 1 + Meta.metaBonus('eye'),
      regen: pv('regen'),
      knock: 1 + pv('spirit'),
      chainBonus: Math.round(pv('chain')),
      ammo: Math.round(pv('trapper')),
    };
    const old = p.stats;
    p.stats = s;
    if (old && s.maxhp > old.maxhp) p.hp += s.maxhp - old.maxhp;
    p.hp = Math.min(p.hp, s.maxhp);
  },

  /* ════════ ANA DÖNGÜ ════════ */
  loop(ts) {
    requestAnimationFrame(t => this.loop(t));
    const dt = clamp((ts - this.last) / 1000, 0, 0.05);
    this.last = ts;
    AudioSys.tick();
    if (this.state === 'playing' || this.state === 'dying' || this.state === 'winning') {
      this.update(this.state === 'dying' ? dt * 0.3 : dt);
      this.draw();
      this.hudT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.05; UI.updateHUD(); }
    }
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; UI.showPause(); AudioSys.stopMusic();
  },
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing'; UI.hidePause(); AudioSys.startMusic();
  },
  abandon() {
    if (this.state === 'paused') { UI.hidePause(); this.endRun(false); }
  },

  /* ════════ UPDATE ════════ */
  update(dt) {
    const run = this.run, p = run.player;
    run.t += dt;
    const tN = run.t * 600 / run.len;     // 600 sn normuna çevrilmiş zaman

    if (run.hintT > 0) { run.hintT -= dt; if (run.hintT <= 0) UI.hideHint(); }
    if (run.breather > 0) run.breather -= dt;
    if (run.slowT > 0) run.slowT -= dt;
    if (run.shakeT > 0) run.shakeT -= dt;
    if (p.invuln > 0) p.invuln -= dt;

    AudioSys.setIntensity(Math.min(1, tN / 900 + (run.boss ? 0.35 : 0) + run.enemies.length / 500));

    if (this.state === 'dying') {
      run.dyingT -= dt;
      if (run.dyingT <= 0) this.endRun(false);
      this.updateFx(dt);
      return;
    }
    if (this.state === 'winning') {
      run.winT -= dt;
      for (const g of run.gems) g.attracted = true;
      this.updateGems(dt);
      this.updateFx(dt);
      if (run.winT <= 0) this.endRun(true);
      return;
    }

    /* ── oyuncu hareketi ── */
    let mx = 0, my = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.joy.active) { mx = this.joy.dx; my = this.joy.dy; }
    const ml = Math.hypot(mx, my);
    p.moving = ml > 0.01;
    if (p.moving) {
      if (ml > 1) { mx /= ml; my /= ml; }
      p.x += mx * p.stats.speed * dt;
      p.y += my * p.stats.speed * dt;
      if (Math.abs(mx) > 0.05) p.face = mx > 0 ? 1 : -1;
      p.walkT += dt * 9;
    }
    for (const o of run.obstacles) this.pushOut(p, o);
    p.x = clamp(p.x, 50, ARENA - 50);
    p.y = clamp(p.y, 50, ARENA - 50);

    if (p.stats.regen > 0) p.hp = Math.min(p.stats.maxhp, p.hp + p.stats.regen * dt);

    // düşük can kalp atışı
    if (p.hp / p.stats.maxhp < 0.3) {
      run.heartT -= dt;
      if (run.heartT <= 0) { run.heartT = 1.1; AudioSys.sfx('heartbeat'); }
    }

    /* ── kamera ── */
    run.cam.x += (p.x - run.cam.x) * Math.min(1, dt * 5);
    run.cam.y += (p.y - run.cam.y) * Math.min(1, dt * 5);

    /* ── spawn yönetmeni ── */
    this.director(dt, tN);

    /* ── grid kur ── */
    this.buildGrid();

    /* ── silahlar ── */
    this.updateWeapons(dt);

    /* ── mermiler ── */
    this.updateProjectiles(dt);

    /* ── düşmanlar ── */
    this.updateEnemies(dt, tN);

    /* ── tuzaklar, halkalar, lav alanları ── */
    this.updateZonesFx(dt);

    /* ── gemler & pickup'lar ── */
    this.updateGems(dt);

    /* ── görsel efektler ── */
    this.updateFx(dt);

    // Fosil Tuzak kilidi: tek run'da 8 dk
    if (!run.trapUnlockDone && run.t >= 480) {
      run.trapUnlockDone = true;
      if (!Meta.save.weaponsUnlocked.includes('trap')) {
        Meta.save.weaponsUnlocked.push('trap'); Meta.persist();
        UI.toast('🪤 Yeni silah açıldı: <b>Fosil Tuzak</b>');
      }
    }

    /* ── kart kuyruğu ── */
    if (run.cardQueue.length && this.state === 'playing') this.openCards();
  },

  pushOut(ent, o) {
    const dx = ent.x - o.x, dy = ent.y - o.y;
    const d = Math.hypot(dx, dy), min = (ent.r || 12) + o.r;
    if (d < min && d > 0.001) {
      ent.x = o.x + dx / d * min;
      ent.y = o.y + dy / d * min;
    }
  },

  /* ════════ SPAWN YÖNETMENİ ════════ */
  director(dt, tN) {
    const run = this.run;
    const frac = run.t / run.len;

    // boss zamanlaması
    DATA.bosses.forEach((b, i) => {
      if (!run.bossFlags[i] && frac >= b.at) {
        run.bossFlags[i] = true;
        this.spawnBoss(b);
      }
    });

    // sürü baskınları
    if (!run.hordes.h1 && frac >= 0.45) { run.hordes.h1 = true; this.spawnHorde(tN); }
    if (!run.hordes.h2 && frac >= 0.75) { run.hordes.h2 = true; this.spawnHorde(tN); }

    // sürekli akış
    const cap = Meta.save.settings.fx === 'full' ? 230 : 160;
    let rate = 0.8 + (Math.min(tN, 660) / 600) * 3.4;
    if (run.breather > 0) rate *= 0.35;
    if (run.boss) rate *= run.boss.bossDef.final ? 0 : 0.25;
    run.spawnAcc += rate * dt;
    while (run.spawnAcc >= 1) {
      run.spawnAcc -= 1;
      if (run.enemies.length < cap) this.spawnEnemy(this.pickEnemyType(tN), null, tN);
    }
  },

  pickEnemyType(tN) {
    const avail = DATA.enemyOrder.filter(id => DATA.enemies[id].from <= tN);
    const weights = avail.map(id => {
      const d = DATA.enemies[id];
      let w = 1;
      if (tN - d.from < 30) w = 3;                  // yeni giren tip öne çıkar
      if (id === 'lizard') w = Math.max(0.6, 2 - tN / 300);
      return w;
    });
    let sum = 0; for (const w of weights) sum += w;
    let r = Math.random() * sum;
    for (let i = 0; i < avail.length; i++) { r -= weights[i]; if (r <= 0) return avail[i]; }
    return avail[avail.length - 1];
  },

  spawnPos() {
    const run = this.run, p = run.player;
    const rad = Math.hypot(this.W, this.H) / (2 * this.zoom) + 90;
    const a = Math.random() * Math.PI * 2;
    return {
      x: clamp(p.x + Math.cos(a) * rad, 60, ARENA - 60),
      y: clamp(p.y + Math.sin(a) * rad, 60, ARENA - 60),
    };
  },

  enemyScale(tN) {
    return {
      hp: (1 + tN / 60 * 0.22 + Math.pow(tN / 600, 2) * 2.2) * this.run.diffMult,
      dmg: (1 + tN / 600 * 1.2) * this.run.dmgDiff,
    };
  },

  spawnEnemy(typeId, pos, tN, near) {
    const run = this.run, def = DATA.enemies[typeId];
    const sc = this.enemyScale(tN);
    const sp = pos || this.spawnPos();
    if (near) { sp.x += (Math.random()-0.5)*120; sp.y += (Math.random()-0.5)*120; }
    run.enemies.push({
      type: typeId, def, x: sp.x, y: sp.y,
      hp: def.hp * sc.hp, maxhp: def.hp * sc.hp,
      dmg: def.dmg * sc.dmg, speed: def.speed * (0.92 + Math.random()*0.16),
      r: def.r, xp: def.xp, armor: def.armor || 0, flying: !!def.flying,
      flash: 0, touchCd: 0, phase: Math.random() * Math.PI * 2,
      kx: 0, ky: 0, rangedCd: def.ranged ? 1 + Math.random() : 0,
      axeCd: 0, dead: false, boss: false,
    });
    Meta.markSeen('enemiesSeen', typeId);
  },

  spawnHorde(tN) {
    const run = this.run, p = run.player;
    const n = 38, type = tN > 300 ? 'bat' : 'lizard';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 560 / this.zoom * 0.9 + Math.random() * 80;
      this.spawnEnemy(i % 5 === 0 ? 'lizard' : type,
        { x: clamp(p.x + Math.cos(a) * r, 60, ARENA-60), y: clamp(p.y + Math.sin(a) * r, 60, ARENA-60) }, tN);
    }
    UI.banner('SÜRÜ BASKINI!');
    AudioSys.sfx('roar');
  },

  spawnBoss(bdef) {
    const run = this.run;
    const sp = this.spawnPos();
    const boss = {
      type: bdef.id, def: bdef, bossDef: bdef, boss: true,
      x: sp.x, y: sp.y,
      hp: bdef.hp * run.bossMult, maxhp: bdef.hp * run.bossMult,
      dmg: bdef.dmg * run.dmgDiff, speed: bdef.speed, r: bdef.r,
      xp: bdef.xp, armor: 0, flying: false, flash: 0, touchCd: 0,
      phase: 0, kx: 0, ky: 0, axeCd: 0, dead: false, rangedCd: 0,
      atkT: 2.5, summonT: 3, ringT: 2, dash: null, phaseNo: 1,
    };
    run.enemies.push(boss);
    run.boss = boss;
    Meta.markSeen('bossesSeen', bdef.id);
    UI.banner(bdef.name);
    UI.setBoss(boss);
    AudioSys.sfx('roar');
    this.shake(8, 0.5);
  },

  /* ════════ GRID ════════ */
  buildGrid() {
    const g = this.run.grid;
    g.clear();
    const cs = 90;
    const arr = this.run.enemies;
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (e.dead) continue;
      const k = ((e.x / cs) | 0) + ',' + ((e.y / cs) | 0);
      let cell = g.get(k);
      if (!cell) { cell = []; g.set(k, cell); }
      cell.push(e);
    }
  },

  queryCircle(x, y, r, fn) {
    const cs = 90, g = this.run.grid;
    const x0 = ((x - r) / cs) | 0, x1 = ((x + r) / cs) | 0;
    const y0 = ((y - r) / cs) | 0, y1 = ((y + r) / cs) | 0;
    const r2 = r * r;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const cell = g.get(cx + ',' + cy);
      if (!cell) continue;
      for (const e of cell) {
        if (e.dead) continue;
        if (dist2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) {
          if (fn(e) === false) return;
        }
      }
    }
  },

  nearestEnemy(x, y, maxR, exclude) {
    let best = null, bd = (maxR || 1e9) * (maxR || 1e9);
    for (const e of this.run.enemies) {
      if (e.dead || (exclude && exclude.has(e))) continue;
      const d = dist2(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  /* ════════ SİLAHLAR ════════ */
  wStats(w) {
    const def = DATA.weapons[w.id];
    return w.evolved ? def.evoStats : def.levels[w.lvl - 1];
  },

  updateWeapons(dt) {
    const run = this.run, p = run.player, st = p.stats;
    for (const w of p.weapons) {
      const ws = this.wStats(w);
      const def = DATA.weapons[w.id];

      if (def.kind === 'orbit') {
        w.angle += (ws.rot * st.aspd) * dt;
        const n = ws.count;
        for (let i = 0; i < n; i++) {
          const a = w.angle + (i / n) * Math.PI * 2;
          const ax = p.x + Math.cos(a) * ws.radius * st.area;
          const ay = p.y + Math.sin(a) * ws.radius * st.area;
          this.queryCircle(ax, ay, (ws.big ? 26 : 18) * st.area, e => {
            if (e.axeCd <= 0) {
              e.axeCd = 0.38;
              this.hitEnemy(e, ws.dmg * st.dmg, { weapon: w.id, kx: e.x - p.x, ky: e.y - p.y, kf: 60 });
              if (Math.random() < 0.3) AudioSys.sfx('axe');
            }
          });
        }
        continue;
      }

      w.cd -= dt * st.aspd;
      if (w.cd > 0) continue;

      if (def.kind === 'proj') {
        const extra = (w.id === 'spear' || w.id === 'lava') ? Math.floor(st.ammo / 2) : 0;
        const cnt = ws.count + extra;
        const used = new Set();
        let fired = false;
        for (let i = 0; i < cnt; i++) {
          const tgt = this.nearestEnemy(p.x, p.y, 720 / this.zoom, used);
          if (!tgt) break;
          used.add(tgt);
          const d = Math.max(1, Math.hypot(tgt.x - p.x, tgt.y - p.y));
          run.projs.push({
            wid: w.id, x: p.x, y: p.y,
            vx: (tgt.x - p.x) / d * ws.speed, vy: (tgt.y - p.y) / d * ws.speed,
            dmg: ws.dmg * st.dmg, pierce: ws.pierce || 0, hit: new Set(),
            r: ws.big ? 16 : (w.id === 'lava' ? 11 : 7),
            ttl: 1.6, explodeR: w.id === 'lava' ? ws.radius * st.area : 0,
            pool: !!ws.pool, big: !!ws.big,
          });
          fired = true;
        }
        if (fired) { AudioSys.sfx(w.id === 'lava' ? 'lava' : 'throw'); w.cd = ws.cd; }
        else w.cd = 0.2;
      }
      else if (def.kind === 'chain') {
        const first = this.nearestEnemy(p.x, p.y, ws.range * st.area);
        if (!first) { w.cd = 0.25; continue; }
        const chainN = ws.chains + st.chainBonus;
        const seen = new Set([first]);
        const pts = [{ x: p.x, y: p.y }, { x: first.x, y: first.y }];
        let cur = first;
        this.hitEnemy(first, ws.dmg * st.dmg, { weapon: w.id });
        for (let i = 0; i < chainN - 1; i++) {
          const nxt = this.nearestEnemy(cur.x, cur.y, 230, seen);
          if (!nxt) break;
          seen.add(nxt);
          pts.push({ x: nxt.x, y: nxt.y });
          this.hitEnemy(nxt, ws.dmg * st.dmg * 0.85, { weapon: w.id });
          cur = nxt;
        }
        run.bolts.push({ pts, t: 0.14, big: !!ws.big });
        AudioSys.sfx('zap');
        w.cd = ws.cd;
      }
      else if (def.kind === 'ring') {
        run.rings.push({
          x: p.x, y: p.y, r: 10, R: ws.radius * st.area,
          dmg: ws.dmg * st.dmg, knock: ws.knock * st.knock,
          hit: new Set(), wid: w.id, big: !!ws.big, t: 0,
        });
        AudioSys.sfx('wave');
        w.cd = ws.cd;
      }
      else if (def.kind === 'trap') {
        const maxT = ws.max + st.ammo;
        if (run.traps.filter(t => t.wid === w.id).length < maxT) {
          run.traps.push({
            wid: w.id, x: p.x + (Math.random()-0.5)*50, y: p.y + (Math.random()-0.5)*50,
            arm: 0.45, r: 26, blast: ws.radius * st.area, dmg: ws.dmg * st.dmg, big: !!ws.big,
          });
          AudioSys.sfx('trap');
        }
        w.cd = ws.cd;
      }
    }
  },

  /* ════════ MERMİLER ════════ */
  updateProjectiles(dt) {
    const run = this.run;
    // oyuncu mermileri
    for (const pr of run.projs) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.ttl -= dt;
      if (pr.ttl <= 0) { pr.dead = true; if (pr.explodeR) this.explode(pr); continue; }
      let exploded = false;
      this.queryCircle(pr.x, pr.y, pr.r + 6, e => {
        if (pr.hit.has(e)) return;
        if (pr.explodeR) { this.explode(pr); exploded = true; return false; }
        pr.hit.add(e);
        this.hitEnemy(e, pr.dmg, { weapon: pr.wid, kx: pr.vx, ky: pr.vy, kf: 40 });
        if (pr.hit.size > pr.pierce) { pr.dead = true; return false; }
      });
      if (exploded) pr.dead = true;
    }
    run.projs = run.projs.filter(pr => !pr.dead);

    // düşman mermileri
    const p = run.player;
    for (const ep of run.eprojs) {
      ep.x += ep.vx * dt; ep.y += ep.vy * dt; ep.ttl -= dt;
      if (ep.ttl <= 0) { ep.dead = true; continue; }
      if (dist2(ep.x, ep.y, p.x, p.y) < (ep.r + p.r) * (ep.r + p.r)) {
        this.damagePlayer(ep.dmg);
        ep.dead = true;
      }
    }
    run.eprojs = run.eprojs.filter(ep => !ep.dead);
  },

  explode(pr) {
    const run = this.run, st = run.player.stats;
    this.queryCircle(pr.x, pr.y, pr.explodeR, e => {
      this.hitEnemy(e, pr.dmg, { weapon: pr.wid, kx: e.x - pr.x, ky: e.y - pr.y, kf: 90 });
    });
    this.burst(pr.x, pr.y, pr.big ? 26 : 14, '#e07038', true);
    run.parts.push({ type: 'flash', x: pr.x, y: pr.y, R: pr.explodeR, t: 0, ttl: 0.25, col: '#ffb060' });
    if (pr.pool) run.pools.push({ x: pr.x, y: pr.y, r: pr.explodeR * 0.8, ttl: 2.6, dps: pr.dmg * 0.45, tick: 0, wid: pr.wid });
    AudioSys.sfx('explode');
    this.shake(pr.big ? 5 : 2.5, 0.2);
  },

  /* ════════ DÜŞMANLAR ════════ */
  updateEnemies(dt, tN) {
    const run = this.run, p = run.player;
    const slowMul = run.slowT > 0 ? 0.45 : 1;

    for (const e of run.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.touchCd > 0) e.touchCd -= dt;
      if (e.axeCd > 0) e.axeCd -= dt;

      // knockback sönümü
      if (e.kx || e.ky) {
        e.x += e.kx * dt; e.y += e.ky * dt;
        e.kx *= Math.pow(0.0001, dt); e.ky *= Math.pow(0.0001, dt);
        if (Math.abs(e.kx) < 2 && Math.abs(e.ky) < 2) { e.kx = 0; e.ky = 0; }
      }

      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      let vx = dx / d, vy = dy / d;
      let spd = e.speed * slowMul;

      if (e.boss) { this.bossAI(e, dt, d, vx, vy, slowMul, tN); }
      else if (e.def.ranged) {
        const rg = e.def.ranged;
        if (d > rg.range) { /* yaklaş */ }
        else if (d < rg.range * 0.6) { vx = -vx; vy = -vy; spd *= 0.7; }
        else { const t = vx; vx = -vy; vy = t; spd *= 0.5; } // yan yan
        e.rangedCd -= dt;
        if (e.rangedCd <= 0 && d < rg.range * 1.15) {
          e.rangedCd = rg.cd;
          run.eprojs.push({ x: e.x, y: e.y, vx: dx / d * rg.pspeed, vy: dy / d * rg.pspeed,
            dmg: e.dmg, r: 7, ttl: 3, col: '#6ec3d8' });
          AudioSys.sfx('throw');
        }
        e.x += vx * spd * dt; e.y += vy * spd * dt;
      }
      else {
        if (e.flying) { e.phase += dt * 4; const px = -vy, py = vx;
          vx += px * Math.sin(e.phase) * 0.5; vy += py * Math.sin(e.phase) * 0.5; }
        e.x += vx * spd * dt; e.y += vy * spd * dt;
      }

      if (!e.flying && !e.boss) for (const o of run.obstacles) this.pushOut(e, o);
      e.x = clamp(e.x, 30, ARENA - 30); e.y = clamp(e.y, 30, ARENA - 30);

      // temas hasarı
      if (e.touchCd <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) * (e.r + p.r)) {
        e.touchCd = 0.8;
        this.damagePlayer(e.dmg);
      }
    }

    // ayrışma (ucuz): aynı hücredekileri it
    let i = 0;
    for (const cell of run.grid.values()) {
      if (cell.length < 2) continue;
      for (let a = 0; a < cell.length - 1 && a < 6; a++) {
        const e1 = cell[a], e2 = cell[a + 1];
        if (e1.dead || e2.dead || e1.boss || e2.boss) continue;
        const dx = e2.x - e1.x, dy = e2.y - e1.y;
        const d = Math.hypot(dx, dy), min = e1.r + e2.r;
        if (d < min && d > 0.01) {
          const push = (min - d) * 0.5;
          e1.x -= dx / d * push; e1.y -= dy / d * push;
          e2.x += dx / d * push; e2.y += dy / d * push;
        }
      }
      if (++i > 80) break;
    }

    // ölüleri temizle
    run.enemies = run.enemies.filter(e => !e.dead);
  },

  /* ════════ BOSS AI ════════ */
  bossAI(b, dt, d, vx, vy, slowMul, tN) {
    const run = this.run, p = run.player;
    const bd = b.bossDef;
    let spd = b.speed * slowMul;
    let move = true;

    const doSlam = (cd, rMul) => {
      b.atkT -= dt;
      if (b.atkT <= 0) {
        b.atkT = cd;
        run.telegraphs.push({ kind: 'circle', x: p.x, y: p.y, r: 115 * (rMul || 1), t: 0, ttl: 0.9,
          dmg: b.dmg * 1.2, col: '#e05038' });
      }
    };
    const doDash = (cd) => {
      if (b.dash) {
        b.dash.t -= dt;
        b.x += b.dash.vx * dt; b.y += b.dash.vy * dt;
        if (b.dash.t <= 0) b.dash = null;
        return false;
      }
      b.atkT -= dt;
      if (b.atkT <= 0) {
        b.atkT = cd;
        const dd = Math.max(1, Math.hypot(p.x - b.x, p.y - b.y));
        const dirx = (p.x - b.x) / dd, diry = (p.y - b.y) / dd;
        run.telegraphs.push({ kind: 'line', x: b.x, y: b.y,
          x2: b.x + dirx * (dd + 240), y2: b.y + diry * (dd + 240), t: 0, ttl: 0.6,
          onDone: () => { b.dash = { vx: dirx * 640, vy: diry * 640, t: 0.42 }; AudioSys.sfx('roar'); },
          col: '#e05038' });
      }
      return true;
    };
    const doSummon = (cd, n) => {
      b.summonT -= dt;
      if (b.summonT <= 0) {
        b.summonT = cd;
        for (let i = 0; i < n; i++)
          this.spawnEnemy(i % 3 === 2 ? 'spitter' : 'lizard', { x: b.x, y: b.y }, tN, true);
        this.burst(b.x, b.y, 12, '#6ec3d8', false);
      }
    };
    const doRadial = (cd, n) => {
      b.ringT -= dt;
      if (b.ringT <= 0) {
        b.ringT = cd;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
          run.eprojs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
            dmg: b.dmg * 0.7, r: 7, ttl: 3.2, col: '#6ec3d8' });
        }
        AudioSys.sfx('zap');
      }
    };

    if (bd.attack === 'slam') { doSlam(4.2); spd *= b.atkT < 1 ? 0.5 : 1; }
    else if (bd.attack === 'dash') { move = doDash(3.6); }
    else if (bd.attack === 'summon') { doSummon(6, 7); doRadial(3.4, 8); spd *= 0.9; }
    else if (bd.attack === 'phases') {
      const f = b.hp / b.maxhp;
      const newPhase = f > 0.66 ? 1 : (f > 0.33 ? 2 : 3);
      if (newPhase !== b.phaseNo) {
        b.phaseNo = newPhase;
        UI.banner('FOSİL TİRAN ÖFKELENİYOR!');
        AudioSys.sfx('roar');
        this.shake(8, 0.5);
      }
      if (b.phaseNo === 1) doSlam(3.8);
      else if (b.phaseNo === 2) { doSlam(4.2); doSummon(7, 8); }
      else { move = doDash(3.4); doRadial(4, 12); spd *= 1.25; }
    }

    if (move && !b.dash) { b.x += vx * spd * dt; b.y += vy * spd * dt; }
  },

  /* ════════ TUZAK / HALKA / LAV / TELEGRAF ════════ */
  updateZonesFx(dt) {
    const run = this.run, p = run.player;

    // tuzaklar
    for (const t of run.traps) {
      if (t.arm > 0) { t.arm -= dt; continue; }
      let trig = false;
      this.queryCircle(t.x, t.y, t.r, e => { trig = true; return false; });
      if (trig) {
        t.dead = true;
        this.queryCircle(t.x, t.y, t.blast, e => {
          this.hitEnemy(e, t.dmg, { weapon: t.wid, kx: e.x - t.x, ky: e.y - t.y, kf: 110 });
        });
        this.burst(t.x, t.y, t.big ? 22 : 12, '#e8dcc8', true);
        run.parts.push({ type: 'flash', x: t.x, y: t.y, R: t.blast, t: 0, ttl: 0.22, col: '#f0e8c8' });
        AudioSys.sfx('explode');
      }
    }
    run.traps = run.traps.filter(t => !t.dead);

    // halkalar
    for (const r of run.rings) {
      r.t += dt;
      r.r = 10 + (r.R - 10) * Math.min(1, r.t / 0.38);
      this.queryCircle(r.x, r.y, r.r, e => {
        if (r.hit.has(e)) return;
        const d = Math.hypot(e.x - r.x, e.y - r.y);
        if (d > r.r + e.r) return;
        r.hit.add(e);
        this.hitEnemy(e, r.dmg, { weapon: r.wid,
          kx: e.x - r.x, ky: e.y - r.y, kf: r.knock * (e.boss ? 0.1 : 1) });
      });
      if (r.t >= 0.4) r.dead = true;
    }
    run.rings = run.rings.filter(r => !r.dead);

    // lav alanları
    for (const pl of run.pools) {
      pl.ttl -= dt; pl.tick -= dt;
      if (pl.tick <= 0) {
        pl.tick = 0.3;
        this.queryCircle(pl.x, pl.y, pl.r, e => {
          this.hitEnemy(e, pl.dps * 0.3, { weapon: pl.wid, silent: true });
        });
      }
      if (pl.ttl <= 0) pl.dead = true;
    }
    run.pools = run.pools.filter(pl => !pl.dead);

    // telegraflar
    for (const tg of run.telegraphs) {
      tg.t += dt;
      if (tg.t >= tg.ttl) {
        tg.dead = true;
        if (tg.kind === 'circle') {
          if (dist2(p.x, p.y, tg.x, tg.y) < tg.r * tg.r) this.damagePlayer(tg.dmg);
          this.burst(tg.x, tg.y, 18, '#e05038', true);
          run.parts.push({ type: 'flash', x: tg.x, y: tg.y, R: tg.r, t: 0, ttl: 0.3, col: '#e05038' });
          AudioSys.sfx('explode');
          this.shake(6, 0.3);
        }
        if (tg.onDone) tg.onDone();
      }
    }
    run.telegraphs = run.telegraphs.filter(tg => !tg.dead);
  },

  /* ════════ GEM & PICKUP ════════ */
  updateGems(dt) {
    const run = this.run, p = run.player, st = p.stats;
    for (const g of run.gems) {
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (!g.attracted && d2 < st.pickup * st.pickup) g.attracted = true;
      if (g.attracted) {
        g.spd = (g.spd || 220) + 1300 * dt;
        const d = Math.max(1, Math.sqrt(d2));
        g.x += (p.x - g.x) / d * g.spd * dt;
        g.y += (p.y - g.y) / d * g.spd * dt;
        if (d < 18) {
          g.dead = true;
          this.addXp(g.val);
          AudioSys.sfx('xp');
        }
      }
    }
    run.gems = run.gems.filter(g => !g.dead);

    for (const dr of run.drops) {
      dr.ttl -= dt;
      if (dr.ttl <= 0) { dr.dead = true; continue; }
      const d2 = dist2(dr.x, dr.y, p.x, p.y);
      if (dr.kind === 'coin' && !dr.attracted && d2 < st.pickup * st.pickup) dr.attracted = true;
      if (dr.attracted) {
        dr.spd = (dr.spd || 200) + 1200 * dt;
        const d = Math.max(1, Math.sqrt(d2));
        dr.x += (p.x - dr.x) / d * dr.spd * dt;
        dr.y += (p.y - dr.y) / d * dr.spd * dt;
      }
      if (d2 < 26 * 26) {
        dr.dead = true;
        this.applyPickup(dr);
      }
    }
    run.drops = run.drops.filter(dr => !dr.dead);
  },

  addXp(v) {
    const run = this.run, p = run.player;
    const amt = v * p.stats.xpgain;
    p.xp += amt; p.xpTotal += amt;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.lvl++;
      p.xpNeed = this.xpNeed(p.lvl);
      run.cardQueue.push('level');
      if (p.lvl >= 12) Meta.unlockAch('lvl12');
    }
  },

  applyPickup(dr) {
    const run = this.run, p = run.player;
    switch (dr.kind) {
      case 'coin':
        p.coinsRaw += dr.val; AudioSys.sfx('coin'); break;
      case 'meat':
        p.hp = Math.min(p.stats.maxhp, p.hp + p.stats.maxhp * 0.2);
        AudioSys.sfx('meat'); this.floatText(p.x, p.y - 26, '+%20 CAN', '#8fbf5e'); break;
      case 'magnet':
        for (const g of run.gems) g.attracted = true;
        AudioSys.sfx('powerup'); this.floatText(p.x, p.y - 26, 'MANYETİK KEMİK!', '#e8dcc8'); break;
      case 'totem': {
        const dmg = 70 + run.t * 600 / run.len * 0.35;
        for (const e of run.enemies) {
          if (e.dead) continue;
          if (Math.abs(e.x - run.cam.x) < this.W / this.zoom && Math.abs(e.y - run.cam.y) < this.H / this.zoom)
            this.hitEnemy(e, e.boss ? dmg * 0.5 : dmg, { weapon: 'totem' });
        }
        this.shake(7, 0.35); AudioSys.sfx('explode');
        this.floatText(p.x, p.y - 26, 'PATLAMA TOTEMİ!', '#e8a33d'); break;
      }
      case 'fossil':
        run.slowT = 5; AudioSys.sfx('slow');
        this.floatText(p.x, p.y - 26, 'ZAMAN YAVAŞLADI!', '#6ec3d8'); break;
      case 'chest':
        p.coinsRaw += 40;
        run.cardQueue.push('chest');
        AudioSys.sfx('chest');
        this.floatText(p.x, p.y - 26, 'AV SANDIĞI!', '#f0b545'); break;
    }
  },

  /* ════════ HASAR ════════ */
  hitEnemy(e, raw, opts) {
    if (e.dead) return;
    opts = opts || {};
    const run = this.run, p = run.player;
    let dmg = raw;
    let crit = false;
    if (!opts.silent && Math.random() < p.stats.crit) { dmg *= 1.6; crit = true; }
    dmg = Math.max(1, dmg - (e.armor || 0));
    e.hp -= dmg;
    e.flash = 0.1;
    if (opts.weapon) p.dmgBy[opts.weapon] = (p.dmgBy[opts.weapon] || 0) + dmg;
    if (opts.kx !== undefined && !e.boss) {
      const kd = Math.max(1, Math.hypot(opts.kx, opts.ky));
      e.kx += opts.kx / kd * (opts.kf || 50);
      e.ky += opts.ky / kd * (opts.kf || 50);
    }
    if (!opts.silent && Meta.save.settings.dmgnum && run.dnums.length < 50)
      this.floatText(e.x, e.y - e.r - 6, String(Math.round(dmg)), crit ? '#f0b545' : '#e8dcc8', crit);
    if (e.hp <= 0) this.killEnemy(e, opts.weapon);
    else if (!opts.silent && Math.random() < 0.25) AudioSys.sfx('hit');
  },

  killEnemy(e, weaponId) {
    const run = this.run, p = run.player;
    e.dead = true;
    p.kills++;
    if (weaponId) p.weaponKills[weaponId] = (p.weaponKills[weaponId] || 0) + 1;
    if (p.kills === 1 && Meta.save.stats.kills === 0) Meta.unlockAch('firstblood');
    this.burst(e.x, e.y, e.boss ? 30 : 6, e.def.color, false);
    if (Math.random() < 0.5 || e.boss) AudioSys.sfx('kill');

    // XP taşları
    let xp = e.xp;
    while (xp > 0) {
      const v = xp >= 20 ? 20 : (xp >= 5 ? 5 : xp);
      xp -= v;
      run.gems.push({ x: e.x + (Math.random()-0.5)*26, y: e.y + (Math.random()-0.5)*26,
        val: v, tier: v >= 20 ? 2 : (v >= 5 ? 1 : 0), attracted: false });
    }
    if (run.gems.length > 260) { // birleştir
      const a = run.gems.shift(), b = run.gems[0];
      b.val += a.val; b.tier = Math.min(2, Math.max(b.tier, a.tier));
    }

    // düşürmeler
    const r = Math.random();
    const sp = run.special;
    if (e.boss) {
      this.onBossDeath(e);
    } else {
      if (r < 0.10) run.drops.push({ kind: 'coin', val: Math.random() < 0.12 ? 3 : 1, x: e.x, y: e.y, ttl: 25 });
      else if (r < 0.114) run.drops.push({ kind: 'meat', x: e.x, y: e.y, ttl: 20 });
      else if (r < 0.1175 && sp.magnet < 2) { sp.magnet++; run.drops.push({ kind: 'magnet', x: e.x, y: e.y, ttl: 18 }); }
      else if (r < 0.1205 && sp.totem < 2)  { sp.totem++;  run.drops.push({ kind: 'totem',  x: e.x, y: e.y, ttl: 18 }); }
      else if (r < 0.1235 && sp.fossil < 2) { sp.fossil++; run.drops.push({ kind: 'fossil', x: e.x, y: e.y, ttl: 18 }); }
    }
  },

  onBossDeath(b) {
    const run = this.run;
    const bd = b.bossDef;
    this.shake(9, 0.5);
    this.burst(b.x, b.y, 40, '#f0b545', true);
    run.boss = null;
    UI.setBoss(null);

    const achMap = { giant: 'giantslayer', lavafang: 'lavaslayer', crystalmother: 'crystalslayer', tyrant: 'tyrantfall' };
    if (achMap[bd.id]) Meta.unlockAch(achMap[bd.id]);
    const bs = Meta.save.stats.bossKills;
    bs[bd.id] = (bs[bd.id] || 0) + 1; Meta.persist();

    if (bd.final) {
      this.state = 'winning';
      run.winT = 1.6;
      UI.banner('ZAFER!');
      AudioSys.sfx('victory');
      return;
    }

    run.minibossKills++;
    run.breather = 15;
    run.drops.push({ kind: 'chest', x: b.x, y: b.y, ttl: 40 });
    UI.banner(bd.name + ' DEVRİLDİ!');
    AudioSys.sfx('victory');

    // Kıvılcım Taşı kilidi: ilk mini boss
    if (!Meta.save.weaponsUnlocked.includes('spark')) {
      Meta.save.weaponsUnlocked.push('spark'); Meta.persist();
      UI.toast('⚡ Yeni silah açıldı: <b>Kıvılcım Taşı</b>');
    }
  },

  damagePlayer(raw) {
    const run = this.run, p = run.player;
    if (p.invuln > 0 || this.state !== 'playing') return;
    const dmg = Math.max(1, raw - p.stats.armor);
    p.hp -= dmg;
    p.invuln = 0.6;
    this.shake(3, 0.2);
    UI.hitFlash();
    AudioSys.sfx('hurt');
    this.floatText(p.x, p.y - 30, '-' + Math.round(dmg), '#e05038');
    if (p.hp <= 0) {
      if (p.revives > 0) {
        p.revives--;
        p.hp = p.stats.maxhp * 0.5;
        p.invuln = 2;
        for (const e of run.enemies) {
          if (e.dead || e.boss) continue;
          if (dist2(e.x, e.y, p.x, p.y) < 300 * 300) this.hitEnemy(e, 9999, { silent: true });
        }
        this.burst(p.x, p.y, 30, '#f0b545', true);
        UI.banner('ATA NEFESİ!');
        AudioSys.sfx('revive');
      } else {
        p.hp = 0;
        this.state = 'dying';
        run.dyingT = 1.1;
        AudioSys.sfx('death');
        AudioSys.stopMusic();
      }
    }
  },

  /* ════════ KART SİSTEMİ ════════ */
  openCards() {
    const run = this.run;
    const kind = run.cardQueue[0];
    this.state = 'levelup';
    run.currentCards = this.generateCards();
    UI.showLevelUp(run.currentCards, kind === 'chest' ? '🎁 AV SANDIĞI!' : 'SEVİYE ' + run.player.lvl + '!',
      run.player.rerolls);
    AudioSys.sfx('levelup');
  },

  rollRarity() {
    let sum = 0; for (const r of DATA.rarities) sum += r.w;
    let v = Math.random() * sum;
    for (let i = 0; i < DATA.rarities.length; i++) {
      v -= DATA.rarities[i].w;
      if (v <= 0) return i;
    }
    return 0;
  },

  generateCards() {
    const run = this.run, p = run.player;
    const cands = [];

    // silahlar
    for (const wid of DATA.weaponOrder) {
      if (!Meta.save.weaponsUnlocked.includes(wid)) continue;
      const owned = p.weapons.find(w => w.id === wid);
      const def = DATA.weapons[wid];
      if (!owned && p.weapons.length < 4) {
        cands.push({ kind: 'weapon-new', id: wid, w: 3, rarity: 1, icon: def.icon,
          name: def.name + '\'nı Aç', desc: def.desc });
      } else if (owned && !owned.evolved) {
        if (owned.lvl < 5) {
          const nx = def.levels[owned.lvl];
          const cu = def.levels[owned.lvl - 1];
          const bits = [];
          if (nx.dmg !== cu.dmg) bits.push('hasar ' + cu.dmg + '→' + nx.dmg);
          if (nx.count !== undefined && nx.count !== cu.count) bits.push('adet +1');
          if (nx.chains !== undefined && nx.chains !== cu.chains) bits.push('zincir +1');
          if (nx.max !== undefined && nx.max !== cu.max) bits.push('tuzak +1');
          if (nx.radius !== undefined && nx.radius !== cu.radius) bits.push('alan ↑');
          cands.push({ kind: 'weapon-up', id: wid, w: 4, rarity: owned.lvl >= 4 ? 2 : (owned.lvl >= 2 ? 1 : 0),
            icon: def.icon, name: def.name + ' Sv.' + (owned.lvl + 1), desc: bits.join(' · ') || 'Güçlenir' });
        } else if (p.passives[def.evo.passive]) {
          cands.push({ kind: 'weapon-evo', id: wid, w: 8, rarity: 3, icon: def.evo.icon,
            name: '⚡ EVRİM: ' + def.evo.name, desc: def.evo.desc, synergy: true });
        }
      }
    }

    // pasifler
    for (const pid of Object.keys(DATA.passives)) {
      const def = DATA.passives[pid];
      const owned = p.passives[pid];
      const ownedCount = Object.keys(p.passives).length;
      if (owned && owned.n >= def.max) continue;
      if (!owned && ownedCount >= 6) continue;
      // evrim sinerjisi: bu pasifi bekleyen 5. seviye silah var mı?
      const syn = p.weapons.some(w => !w.evolved && DATA.weapons[w.id].evo.passive === pid);
      cands.push({ kind: 'passive', id: pid, w: syn ? 4 : 2.2, rarity: -1, icon: def.icon,
        name: def.name, descBase: def.desc, synergy: syn });
    }

    if (!cands.length) {
      return [
        { kind: 'heal', id: 'heal', rarity: 0, icon: '🍖', name: 'Et Ziyafeti', desc: 'Canının %30\'unu yenile' },
        { kind: 'coins', id: 'coins', rarity: 0, icon: '◉', name: 'Çakıl Kesesi', desc: '+50 coin' },
        { kind: 'heal2', id: 'heal2', rarity: 1, icon: '🌿', name: 'Büyük Şifa', desc: 'Canının %60\'ını yenile' },
      ];
    }

    // 3 farklı kart çek
    const picked = [];
    const pool = cands.slice();
    while (picked.length < 3 && pool.length) {
      let sum = 0; for (const c of pool) sum += c.w;
      let v = Math.random() * sum, idx = 0;
      for (let i = 0; i < pool.length; i++) { v -= pool[i].w; if (v <= 0) { idx = i; break; } }
      const c = pool.splice(idx, 1)[0];
      if (c.rarity === -1) { // pasif: nadirlik çek, değeri belirle
        const ri = this.rollRarity();
        const def = DATA.passives[c.id];
        const val = def.vals[ri];
        c.rarity = ri;
        c.value = val;
        c.desc = def.descBase || def.desc;
        c.desc = (def.desc) + ' +' + (def.pct ? Math.round(val * 100) + '%' : val);
      }
      picked.push(c);
    }
    while (picked.length < 3) picked.push({ kind: 'coins', id: 'coins' + picked.length, rarity: 0, icon: '◉', name: 'Çakıl Kesesi', desc: '+50 coin' });
    return picked;
  },

  reroll() {
    const run = this.run, p = run.player;
    if (this.state !== 'levelup' || p.rerolls <= 0) return;
    p.rerolls--;
    run.currentCards = this.generateCards();
    const kind = run.cardQueue[0];
    UI.showLevelUp(run.currentCards, kind === 'chest' ? '🎁 AV SANDIĞI!' : 'SEVİYE ' + p.lvl + '!', p.rerolls);
    AudioSys.sfx('pick');
  },

  applyCard(card) {
    const run = this.run, p = run.player;
    if (this.state !== 'levelup') return;
    switch (card.kind) {
      case 'weapon-new':
        p.weapons.push({ id: card.id, lvl: 1, evolved: false, cd: 0.2, angle: 0 });
        Meta.markSeen('weaponsUsed', card.id);
        if (Meta.save.stats.weaponsUsed.length >= 6) Meta.unlockAch('collector');
        break;
      case 'weapon-up': {
        const w = p.weapons.find(x => x.id === card.id);
        if (w) w.lvl = Math.min(5, w.lvl + 1);
        break;
      }
      case 'weapon-evo': {
        const w = p.weapons.find(x => x.id === card.id);
        if (w) { w.evolved = true; }
        Meta.save.stats.evos++; Meta.persist();
        Meta.unlockAch('evolution');
        this.burst(p.x, p.y, 36, '#f0b545', true);
        UI.banner(DATA.weapons[card.id].evo.name + '!');
        AudioSys.sfx('victory');
        break;
      }
      case 'passive': {
        if (!p.passives[card.id]) p.passives[card.id] = { n: 0, val: 0 };
        p.passives[card.id].n++;
        p.passives[card.id].val += card.value;
        break;
      }
      case 'heal': p.hp = Math.min(p.stats.maxhp, p.hp + p.stats.maxhp * 0.3); break;
      case 'heal2': p.hp = Math.min(p.stats.maxhp, p.hp + p.stats.maxhp * 0.6); break;
      default: if (card.kind.startsWith('coins') || card.kind === 'coins') p.coinsRaw += 50; break;
    }
    this.recalcStats();
    run.cardQueue.shift();
    UI.hideLevelUp();
    UI.updateWeapons();
    AudioSys.sfx('pick');
    this.state = 'playing';
    // level up parlama
    this.burst(p.x, p.y, 14, '#6ec3d8', true);
  },

  /* ════════ RUN SONU ════════ */
  endRun(victory) {
    const run = this.run, p = run.player, s = Meta.save;
    this.state = 'over';
    AudioSys.stopMusic();

    const runsBefore = s.stats.runs;
    const coinMult = p.stats.coingain * run.mode.coinMult * (run.hard ? 1.25 : 1);
    let coins = Math.round(p.coinsRaw * coinMult);
    // av primi: her run somut kazanç bıraksın (kill + süre)
    coins += Math.floor(p.kills / 20) + Math.floor(run.t / 60) * 2;
    if (victory) coins += 200;

    Meta.addCoins(coins);
    s.stats.runs++;
    if (victory) { s.stats.wins++; s.longUnlocked = true; s.hardUnlocked = true; }
    s.stats.kills += p.kills;
    s.stats.timePlayed += run.t;
    s.stats.maxTime = Math.max(s.stats.maxTime, run.t);
    s.stats.maxKills = Math.max(s.stats.maxKills, p.kills);
    s.charXp[run.charDef.id] = (s.charXp[run.charDef.id] || 0) + Math.round(p.xpTotal);

    if (run.t >= 300) Meta.unlockAch('fivemin');
    if (p.kills >= 300) Meta.unlockAch('swarmbreaker');
    if (s.totalCoinsEver >= 2000) Meta.unlockAch('richhunter');
    if (s.stats.timePlayed >= 3600) Meta.unlockAch('veteran');

    // görev olayları
    Meta.questEvent('runs', 1, 'add');
    Meta.questEvent('kills', p.kills, 'add');
    Meta.questEvent('coins', coins, 'add');
    Meta.questEvent('xp', Math.round(p.xpTotal), 'add');
    Meta.questEvent('maxTime', Math.round(run.t), 'max');
    Meta.questEvent('maxLevel', p.lvl, 'max');
    Meta.questEvent('miniboss', run.minibossKills, 'add');
    Meta.questEvent('lavaKills', p.weaponKills.lava || 0, 'add');
    Meta.questEvent('chars', run.charDef.id, 'set-uniq');
    Meta.questEvent('evos', p.weapons.filter(w => w.evolved).length, 'add');
    if (victory) Meta.questEvent('wins', 1, 'add');
    Meta.persist();

    // açılan şeyler
    const unlocks = [];
    for (const z of DATA.zones) {
      if (z.unlock > runsBefore && z.unlock <= s.stats.runs)
        unlocks.push('🗺️ Yeni bölge açıldı: ' + z.name);
    }
    const newAch = Object.keys(s.achievements).filter(a => !run.achBefore.includes(a));
    for (const a of newAch) {
      const d = DATA.achievements.find(x => x.id === a);
      if (d) unlocks.push('🏆 ' + d.name);
    }
    const charLvlNow = Meta.charLevel(run.charDef.id);
    if (charLvlNow > run.charLvlBefore)
      unlocks.push('⬆️ ' + run.charDef.name + ' karakter seviyesi: ' + charLvlNow + ' (+%' + charLvlNow + ' hasar)');
    if (victory && !run.achBefore.includes('tyrantfall'))
      unlocks.push('🌙 Kanlı Ay zorluğu ve Uzun Av açıldı!');

    // en güçlü silah
    let bestW = null, bestD = -1;
    for (const wid of Object.keys(p.dmgBy)) {
      if (p.dmgBy[wid] > bestD && DATA.weapons[wid]) { bestD = p.dmgBy[wid]; bestW = wid; }
    }

    UI.showRunEnd({
      victory,
      time: run.t, kills: p.kills, lvl: p.lvl, coins,
      bestWeapon: bestW ? { id: bestW, dmg: Math.round(bestD) } : null,
      weapons: p.weapons.slice(),
      passives: Object.keys(p.passives).map(id => ({ id, n: p.passives[id].n })),
      unlocks,
    });
  },

  /* ════════ EFEKT YARDIMCILARI ════════ */
  shake(amp, t) {
    if (!Meta.save.settings.shake) return;
    this.run.shakeAmp = Math.max(this.run.shakeAmp, amp);
    this.run.shakeT = Math.max(this.run.shakeT, t);
  },

  burst(x, y, n, col, add) {
    const run = this.run;
    const cap = Meta.save.settings.fx === 'full' ? 320 : 110;
    if (run.parts.length > cap) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 200;
      run.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, ttl: 0.35 + Math.random() * 0.4, col, size: 2 + Math.random() * 3.5, add });
    }
  },

  floatText(x, y, txt, col, big) {
    this.run.dnums.push({ x, y, txt, col, t: 0, ttl: 0.8, big });
  },

  updateFx(dt) {
    const run = this.run;
    for (const pt of run.parts) {
      pt.t += dt;
      if (pt.type === 'flash') continue;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
    }
    run.parts = run.parts.filter(pt => pt.t < pt.ttl);
    for (const d of run.dnums) { d.t += dt; d.y -= 38 * dt; }
    run.dnums = run.dnums.filter(d => d.t < d.ttl);
    for (const b of run.bolts) b.t -= dt;
    run.bolts = run.bolts.filter(b => b.t > 0);
  },

  /* ════════ ÇİZİM ════════ */
  draw() {
    const run = this.run, p = run.player, ctx = this.ctx;
    const z = this.zoom, dpr = this.dpr;

    // arkaplan (ekran uzayı)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = run.zone.bg;
    ctx.fillRect(0, 0, this.W, this.H);

    // shake
    let shx = 0, shy = 0;
    if (run.shakeT > 0) {
      const a = run.shakeAmp * (run.shakeT * 3);
      shx = (Math.random() - 0.5) * a; shy = (Math.random() - 0.5) * a;
    } else run.shakeAmp = 0;

    // dünya dönüşümü
    const cx = run.cam.x + shx, cy = run.cam.y + shy;
    ctx.setTransform(z * dpr, 0, 0, z * dpr,
      dpr * (this.W / 2 - cx * z), dpr * (this.H / 2 - cy * z));

    const vw = this.W / z, vh = this.H / z;
    const vx0 = cx - vw / 2 - 60, vx1 = cx + vw / 2 + 60;
    const vy0 = cy - vh / 2 - 60, vy1 = cy + vh / 2 + 60;
    const onScreen = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

    // zemin
    ctx.fillStyle = run.zone.ground;
    ctx.fillRect(Math.max(0, vx0), Math.max(0, vy0),
      Math.min(ARENA, vx1) - Math.max(0, vx0), Math.min(ARENA, vy1) - Math.max(0, vy0));

    // arena sınır çizgisi
    ctx.strokeStyle = 'rgba(232,163,61,.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, ARENA - 16, ARENA - 16);

    // dekorlar
    for (const d of run.decos) {
      if (!onScreen(d.x, d.y, 20)) continue;
      ctx.fillStyle = d.c;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      if (run.zone.decoType === 'bone') {
        ctx.ellipse(d.x, d.y, d.s * 0.4, d.s * 1.4, d.a, 0, 7);
      } else if (run.zone.decoType === 'crystal' || run.zone.decoType === 'temple') {
        ctx.moveTo(d.x, d.y - d.s * 1.5); ctx.lineTo(d.x + d.s * 0.7, d.y + d.s);
        ctx.lineTo(d.x - d.s * 0.7, d.y + d.s); ctx.closePath();
      } else {
        ctx.arc(d.x, d.y, d.s, 0, 7);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // engeller (kayalar)
    for (const o of run.obstacles) {
      if (!onScreen(o.x, o.y, o.r + 20)) continue;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.55, o.r * 1.05, o.r * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = run.zone.deco[0];
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.55, 0, 7); ctx.fill();
    }

    // lav alanları
    for (const pl of run.pools) {
      if (!onScreen(pl.x, pl.y, pl.r)) continue;
      ctx.globalAlpha = Math.min(0.5, pl.ttl);
      ctx.fillStyle = '#e05038';
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, 7); ctx.fill();
      ctx.globalAlpha = Math.min(0.35, pl.ttl);
      ctx.fillStyle = '#ffb060';
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r * 0.6, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // tuzaklar
    for (const t of run.traps) {
      if (!onScreen(t.x, t.y, 30)) continue;
      const armed = t.arm <= 0;
      ctx.strokeStyle = armed ? '#e8dcc8' : 'rgba(232,220,200,.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x - 10, t.y - 10); ctx.lineTo(t.x + 10, t.y + 10);
      ctx.moveTo(t.x + 10, t.y - 10); ctx.lineTo(t.x - 10, t.y + 10);
      ctx.stroke();
      if (armed) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(run.t * 6);
        ctx.strokeStyle = '#f0b545'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // telegraflar
    for (const tg of run.telegraphs) {
      const f = tg.t / tg.ttl;
      ctx.globalAlpha = 0.2 + f * 0.3;
      if (tg.kind === 'circle') {
        ctx.fillStyle = tg.col;
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = tg.col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * f, 0, 7); ctx.stroke();
      } else {
        ctx.strokeStyle = tg.col; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.moveTo(tg.x, tg.y); ctx.lineTo(tg.x2, tg.y2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // XP taşları
    const gemCols = ['#7cb56a', '#6ec3d8', '#f0b545'];
    const gemSize = [5, 7, 10];
    for (const g of run.gems) {
      if (!onScreen(g.x, g.y, 14)) continue;
      const s = gemSize[g.tier];
      ctx.fillStyle = gemCols[g.tier];
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y);
      ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(g.x - 1, g.y - s * 0.5, 2, 2);
    }

    // düşürmeler
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const dr of run.drops) {
      if (!onScreen(dr.x, dr.y, 20)) continue;
      const bob = Math.sin(run.t * 4 + dr.x) * 3;
      if (dr.kind === 'coin') {
        ctx.fillStyle = '#f0b545';
        ctx.beginPath(); ctx.arc(dr.x, dr.y + bob, dr.val > 1 ? 8 : 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#a8731e';
        ctx.beginPath(); ctx.arc(dr.x, dr.y + bob, dr.val > 1 ? 4 : 3, 0, 7); ctx.fill();
      } else {
        const ic = DATA.pickups[dr.kind];
        ctx.font = (dr.kind === 'chest' ? 30 : 24) + 'px sans-serif';
        if (ic) ctx.fillText(ic.icon, dr.x, dr.y + bob);
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(run.t * 5);
        ctx.strokeStyle = ic ? ic.color : '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dr.x, dr.y + bob, 18, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // düşmanlar
    for (const e of run.enemies) {
      if (e.dead || !onScreen(e.x, e.y, e.r + 30)) continue;
      this.drawEnemy(ctx, e, run.t);
    }

    // halkalar
    for (const r of run.rings) {
      ctx.globalAlpha = 0.7 * (1 - r.t / 0.4);
      ctx.strokeStyle = r.big ? '#b8a8d8' : '#8a6aa8';
      ctx.lineWidth = r.big ? 14 : 8;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // şimşekler
    for (const b of run.bolts) {
      ctx.globalAlpha = b.t / 0.14;
      ctx.strokeStyle = b.big ? '#fff0a0' : '#ffe060';
      ctx.lineWidth = b.big ? 4 : 2.5;
      ctx.beginPath();
      for (let i = 0; i < b.pts.length; i++) {
        const pt = b.pts[i];
        const jx = i === 0 ? 0 : (Math.random() - 0.5) * 10;
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x + jx, pt.y + jx);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // oyuncu mermileri
    for (const pr of run.projs) {
      if (!onScreen(pr.x, pr.y, 20)) continue;
      const ang = Math.atan2(pr.vy, pr.vx);
      if (pr.wid === 'spear') {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(ang);
        const L = pr.big ? 34 : 20;
        ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = pr.big ? 6 : 4;
        ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
        ctx.fillStyle = '#cfc4ae';
        ctx.beginPath(); ctx.moveTo(L / 2 + 7, 0); ctx.lineTo(L / 2 - 3, -5); ctx.lineTo(L / 2 - 3, 5);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else { // lav topu
        ctx.fillStyle = '#e05038';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffb060';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 0.55, 0, 7); ctx.fill();
      }
    }

    // düşman mermileri
    for (const ep of run.eprojs) {
      if (!onScreen(ep.x, ep.y, 12)) continue;
      ctx.fillStyle = ep.col;
      ctx.beginPath();
      ctx.moveTo(ep.x, ep.y - 8); ctx.lineTo(ep.x + 5, ep.y + 6); ctx.lineTo(ep.x - 5, ep.y + 6);
      ctx.closePath(); ctx.fill();
    }

    // dönen baltalar
    for (const w of p.weapons) {
      if (DATA.weapons[w.id].kind !== 'orbit') continue;
      const ws = this.wStats(w), st = p.stats;
      for (let i = 0; i < ws.count; i++) {
        const a = w.angle + (i / ws.count) * Math.PI * 2;
        const ax = p.x + Math.cos(a) * ws.radius * st.area;
        const ay = p.y + Math.sin(a) * ws.radius * st.area;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a + run.t * 8);
        const s = ws.big ? 1.5 : 1;
        ctx.fillStyle = '#8a8278';
        ctx.beginPath();
        ctx.moveTo(0, -12 * s); ctx.lineTo(9 * s, -2 * s); ctx.lineTo(4 * s, 10 * s);
        ctx.lineTo(-4 * s, 10 * s); ctx.lineTo(-9 * s, -2 * s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a4a33';
        ctx.fillRect(-2 * s, 0, 4 * s, 13 * s);
        ctx.restore();
      }
    }

    // oyuncu
    this.drawPlayer(ctx, p, run);

    // parçacıklar
    for (const pt of run.parts) {
      const f = 1 - pt.t / pt.ttl;
      if (pt.type === 'flash') {
        ctx.globalAlpha = f * 0.4;
        ctx.fillStyle = pt.col;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.R * (0.7 + 0.3 * (1 - f)), 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }
      if (pt.add) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = f;
      ctx.fillStyle = pt.col;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // hasar sayıları
    for (const d of run.dnums) {
      ctx.globalAlpha = 1 - d.t / d.ttl;
      ctx.font = (d.big ? 'bold 20px' : 'bold 14px') + ' sans-serif';
      ctx.fillStyle = d.col;
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
      ctx.strokeText(d.txt, d.x, d.y);
      ctx.fillText(d.txt, d.x, d.y);
      ctx.globalAlpha = 1;
    }
  },

  drawPlayer(ctx, p, run) {
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0 && this.state === 'playing') return;
    const bob = p.moving ? Math.sin(p.walkT) * 2.5 : 0;
    const x = p.x, y = p.y + bob;
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 13, 5, 0, 0, 7); ctx.fill();
    // bacaklar
    const ls = p.moving ? Math.sin(p.walkT) * 5 : 0;
    ctx.strokeStyle = '#c08a5a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 6); ctx.lineTo(x - 4 + ls, y + 15);
    ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + 4 - ls, y + 15);
    ctx.stroke();
    // gövde (kürk)
    ctx.fillStyle = '#7a5230';
    ctx.beginPath(); ctx.ellipse(x, y + 1, 11, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.ellipse(x, y + 5, 11, 7, 0, 0, 7); ctx.fill();
    // kollar
    ctx.strokeStyle = '#c08a5a'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 2); ctx.lineTo(x - 13 - (p.moving ? ls * 0.4 : 0), y + 6);
    ctx.moveTo(x + 9, y - 2); ctx.lineTo(x + 13 + (p.moving ? ls * 0.4 : 0), y + 6);
    ctx.stroke();
    // kafa
    ctx.fillStyle = '#d8a06a';
    ctx.beginPath(); ctx.arc(x, y - 13, 8.5, 0, 7); ctx.fill();
    // saç
    ctx.fillStyle = '#3a2a18';
    ctx.beginPath(); ctx.arc(x, y - 16, 8, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 8, y - 17, 16, 4);
    // göz
    ctx.fillStyle = '#241500';
    ctx.fillRect(x + p.face * 3, y - 14, 2.5, 2.5);
    // kemik tokası
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(x - p.face * 8, y - 20, 6, 2.5);
  },

  drawEnemy(ctx, e, t) {
    const x = e.x, y = e.y, r = e.r;
    const c = e.flash > 0 ? '#ffffff' : e.def.color;
    const c2 = e.flash > 0 ? '#ffffff' : e.def.color2;
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.32, 0, 0, 7); ctx.fill();

    if (e.boss) {
      const pul = 1 + Math.sin(t * 3) * 0.04;
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(x, y, r * pul, 0, 7); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y - r * 0.18, r * 0.82 * pul, 0, 7); ctx.fill();
      // boynuzlar
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.5); ctx.lineTo(x - r * 1.1, y - r * 1.2); ctx.lineTo(x - r * 0.4, y - r * 0.75);
      ctx.moveTo(x + r * 0.7, y - r * 0.5); ctx.lineTo(x + r * 1.1, y - r * 1.2); ctx.lineTo(x + r * 0.4, y - r * 0.75);
      ctx.closePath(); ctx.fill();
      // gözler
      ctx.fillStyle = '#e05038';
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.25, r * 0.13, 0, 7);
      ctx.arc(x + r * 0.3, y - r * 0.25, r * 0.13, 0, 7); ctx.fill();
      // can barı
      const f = e.hp / e.maxhp;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(x - r, y - r - 14, r * 2, 6);
      ctx.fillStyle = '#e05038';
      ctx.fillRect(x - r, y - r - 14, r * 2 * f, 6);
      return;
    }

    const sh = e.def.shape;
    if (sh === 'lizard') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; // kuyruk
      const wag = Math.sin(t * 8 + e.phase) * 4;
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x - r * 2, y + wag); ctx.lineTo(x - r, y + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#241500';
      ctx.fillRect(x + r * 0.4, y - 3, 2, 2);
    } else if (sh === 'beetle') {
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y - 2, r * 0.75, 0, 7); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r * 0.6); ctx.stroke();
    } else if (sh === 'bat') {
      const fl = Math.sin(t * 12 + e.phase) * r * 0.5;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - r * 1.6, y - fl - r, x - r * 2, y + 2);
      ctx.quadraticCurveTo(x - r, y + 2, x, y + 3);
      ctx.quadraticCurveTo(x + r, y + 2, x + r * 2, y + 2);
      ctx.quadraticCurveTo(x + r * 1.6, y - fl - r, x, y);
      ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 7); ctx.fill();
      ctx.fillStyle = '#e05038';
      ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2);
    } else if (sh === 'worm') {
      for (let i = 2; i >= 0; i--) {
        const wob = Math.sin(t * 6 + e.phase + i) * 3;
        ctx.fillStyle = i === 0 ? c : c2;
        ctx.beginPath();
        ctx.arc(x - i * r * 0.7, y + wob, r * (1 - i * 0.18), 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb060';
      ctx.fillRect(x + r * 0.3, y - 3, 3, 3);
    } else if (sh === 'bone') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, 7); ctx.fill();
      // kalkan
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.ellipse(x + r * 0.5, y, r * 0.45, r * 0.9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#241500'; // göz boşlukları
      ctx.fillRect(x - r * 0.45, y - r * 0.3, 4, 5);
      ctx.fillRect(x - r * 0.05, y - r * 0.3, 4, 5);
    } else if (sh === 'spitter') {
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, 7); ctx.fill();
      // kristal dikenler
      ctx.fillStyle = c;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.5 - 3, y - r * 0.4);
        ctx.lineTo(x + i * r * 0.5, y - r - 6 + Math.abs(i) * 4);
        ctx.lineTo(x + i * r * 0.5 + 3, y - r * 0.4);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#241500';
      ctx.fillRect(x - 3, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2);
    } else {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  },
};
