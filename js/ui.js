/* ═══════ GRUKK — UI: ekranlar, HUD, kartlar, menüler ═══════ */
'use strict';

const UI = {
  el: {},

  $(id) { return document.getElementById(id); },

  init() {
    const ids = ['hud','hpbar','hp-text','xpbar','hud-timer','hud-kills','hud-coins','lvl-badge',
      'bossbar-wrap','bossbar','bossbar-name','hud-weapons','hint-controls','boss-banner','vignette',
      'overlay-levelup','levelup-title','levelup-cards','btn-reroll','reroll-count',
      'overlay-pause','pause-stats','overlay-runend','runend-title','runend-sub','runend-stats',
      'runend-build','runend-unlocks','toasts','menu-coins','menu-achpts','menu-kills',
      'char-list','zone-list','mode-list','hard-list','hard-group','meta-list','meta-coins',
      'daily-list','weekly-list','coll-body','quest-dot'];
    for (const id of ids) this.el[id] = this.$(id);
    this.el.vignette.style.transition = 'opacity .35s';

    // navigasyon butonları
    document.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', () => { AudioSys.resume(); AudioSys.sfx('pick'); this.show(b.dataset.go); });
    });

    this.$('btn-start-run').addEventListener('click', () => {
      AudioSys.resume(); Game.startRun();
    });
    this.$('btn-pause').addEventListener('click', () => Game.pause());
    this.$('btn-resume').addEventListener('click', () => Game.resume());
    this.$('btn-abandon').addEventListener('click', () => Game.abandon());
    this.$('btn-retry').addEventListener('click', () => {
      this.el['overlay-runend'].classList.add('hidden');
      Game.startRun();
    });
    this.$('btn-tomenu').addEventListener('click', () => {
      this.el['overlay-runend'].classList.add('hidden');
      this.show('menu');
    });
    this.el['btn-reroll'].addEventListener('click', () => Game.reroll());

    // koleksiyon sekmeleri
    document.querySelectorAll('#coll-tabs .chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('#coll-tabs .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        this.renderCollection(c.dataset.tab);
      });
    });

    // ayarlar
    const st = Meta.save.settings;
    const sfx = this.$('set-sfx'), mus = this.$('set-music');
    sfx.value = st.sfx * 100; mus.value = st.music * 100;
    sfx.addEventListener('input', () => { st.sfx = sfx.value / 100; Meta.persist(); AudioSys.applyVolumes(); });
    mus.addEventListener('input', () => { st.music = mus.value / 100; Meta.persist(); AudioSys.applyVolumes(); });
    this.bindToggle('set-shake', () => st.shake, v => { st.shake = v; }, 'Açık', 'Kapalı');
    this.bindToggle('set-fx', () => st.fx === 'full', v => { st.fx = v ? 'full' : 'reduced'; }, 'Tam', 'Azaltılmış');
    this.bindToggle('set-dmgnum', () => st.dmgnum, v => { st.dmgnum = v; }, 'Açık', 'Kapalı');

    this.$('btn-wipe').addEventListener('click', () => {
      if (confirm('Tüm kalıcı ilerleme silinecek. Emin misin?')) {
        Meta.wipe(); this.show('menu'); this.toast('Kayıt sıfırlandı.');
      }
    });

    // ilk ses açma izni için
    document.addEventListener('pointerdown', () => AudioSys.resume(), { once: true });
  },

  bindToggle(id, get, set, onTxt, offTxt) {
    const b = this.$(id);
    const paint = () => { const on = get(); b.textContent = on ? onTxt : offTxt; b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { set(!get()); Meta.persist(); AudioSys.sfx('pick'); paint(); });
    paint();
  },

  /* ── ekran yönetimi ── */
  show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    this.el.hud.classList.add('hidden');
    if (name === 'game') { this.el.hud.classList.remove('hidden'); return; }
    const scr = this.$('screen-' + name);
    if (scr) scr.classList.remove('hidden');
    if (name === 'menu') this.renderMenu();
    if (name === 'chars') this.renderChars();
    if (name === 'meta') this.renderMeta();
    if (name === 'quests') this.renderQuests();
    if (name === 'collection') this.renderCollection('weapons');
    Game.state = (name === 'game') ? Game.state : 'menu';
  },

  /* ── ana menü ── */
  renderMenu() {
    Meta.refreshQuests();
    this.el['menu-coins'].textContent = Meta.save.coins;
    this.el['menu-achpts'].textContent = Meta.save.achPoints;
    this.el['menu-kills'].textContent = Meta.save.stats.kills;
    this.el['quest-dot'].classList.toggle('hidden', !Meta.hasUnclaimedTargets());
  },

  /* ── karakter seçimi ── */
  renderChars() {
    const wrap = this.el['char-list'];
    wrap.innerHTML = '';
    for (const c of DATA.characters) {
      const unlocked = Meta.save.unlockedChars.includes(c.id);
      const card = document.createElement('div');
      card.className = 'char-card' + (unlocked ? '' : ' locked') +
        (Meta.save.selectedChar === c.id ? ' selected' : '');
      const lvl = Meta.charLevel(c.id);
      card.innerHTML =
        '<div class="char-face">' + c.face + '</div>' +
        '<div class="char-name">' + c.name + '</div>' +
        '<div class="char-role">' + c.role + '</div>' +
        '<div class="char-desc">' + c.desc + '</div>' +
        (unlocked
          ? '<div class="char-lvl">Karakter Sv.' + lvl + (lvl > 0 ? ' (+%' + lvl + ' hasar)' : '') + '</div>'
          : '<div class="char-cost">🔒 ' + c.cost + ' ◉</div>');
      card.addEventListener('click', () => {
        if (unlocked) {
          Meta.save.selectedChar = c.id; Meta.persist();
          AudioSys.sfx('pick');
          this.renderChars();
        } else if (Meta.buyChar(c.id)) {
          AudioSys.sfx('achievement');
          this.toast('🎉 <b>' + c.name + '</b> kabileye katıldı!');
          Meta.save.selectedChar = c.id; Meta.persist();
          this.renderChars();
        } else {
          this.toast('Yeterli coin yok. Gerekli: <b>' + c.cost + ' ◉</b> (sende ' + Meta.save.coins + ')');
        }
      });
      wrap.appendChild(card);
    }

    // bölgeler
    const zl = this.el['zone-list'];
    zl.innerHTML = '';
    for (const z of DATA.zones) {
      const ok = Meta.zoneUnlocked(z);
      const chip = document.createElement('button');
      chip.className = 'chip' + (Meta.save.selectedZone === z.id ? ' active' : '') + (ok ? '' : ' locked');
      chip.textContent = ok ? z.name : '🔒 ' + z.name;
      chip.title = ok ? '' : z.unlock + ' av tamamla';
      chip.addEventListener('click', () => {
        if (!ok) { this.toast('🔒 <b>' + z.name + '</b> için ' + z.unlock + ' av tamamla. (' + Meta.save.stats.runs + '/' + z.unlock + ')'); return; }
        Meta.save.selectedZone = z.id; Meta.persist(); AudioSys.sfx('pick'); this.renderChars();
      });
      zl.appendChild(chip);
    }

    // modlar
    const ml = this.el['mode-list'];
    ml.innerHTML = '';
    for (const m of DATA.modes) {
      const ok = Meta.modeUnlocked(m);
      const chip = document.createElement('button');
      chip.className = 'chip' + (Meta.save.selectedMode === m.id ? ' active' : '') + (ok ? '' : ' locked');
      chip.textContent = ok ? m.name : '🔒 ' + m.name;
      chip.addEventListener('click', () => {
        if (!ok) { this.toast('🔒 Uzun Av için Fosil Tiran\'ı bir kez devir.'); return; }
        Meta.save.selectedMode = m.id; Meta.persist(); AudioSys.sfx('pick'); this.renderChars();
      });
      ml.appendChild(chip);
    }

    // zorluk
    const hg = this.el['hard-group'], hl = this.el['hard-list'];
    if (Meta.save.hardUnlocked) {
      hg.classList.remove('hidden');
      hl.innerHTML = '';
      [['Normal', false], ['🌙 Kanlı Ay', true]].forEach(([txt, v]) => {
        const chip = document.createElement('button');
        chip.className = 'chip' + (Meta.save.hardMode === v ? ' active' : '');
        chip.textContent = txt;
        chip.addEventListener('click', () => {
          Meta.save.hardMode = v; Meta.persist(); AudioSys.sfx('pick'); this.renderChars();
        });
        hl.appendChild(chip);
      });
    } else hg.classList.add('hidden');
  },

  /* ── Atalar Ağacı ── */
  renderMeta() {
    this.el['meta-coins'].textContent = Meta.save.coins;
    const wrap = this.el['meta-list'];
    wrap.innerHTML = '';
    for (const m of DATA.metaUpgrades) {
      const lvl = Meta.metaLvl(m.id);
      const node = document.createElement('div');
      node.className = 'meta-node';
      let pips = '';
      for (let i = 0; i < m.max; i++) pips += '<span class="pip' + (i < lvl ? ' full' : '') + '"></span>';
      const maxed = lvl >= m.max;
      const cost = maxed ? null : m.costs[lvl];
      node.innerHTML =
        '<div class="mn-head"><span class="mn-name">' + m.icon + ' ' + m.name + '</span>' +
        '<span class="mn-pips">' + pips + '</span></div>' +
        '<div class="mn-desc">' + m.desc + (lvl > 0 ? ' · <b>şu an: ' +
          (m.pct ? '+%' + Math.round(m.per * lvl * 100) : '+' + (m.per * lvl)) + '</b>' : '') + '</div>';
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = maxed ? 'MAKSİMUM' : 'Güçlen — ' + cost + ' ◉';
      btn.disabled = maxed || Meta.save.coins < cost;
      btn.addEventListener('click', () => {
        if (Meta.buyMeta(m.id)) { AudioSys.sfx('powerup'); this.renderMeta(); }
      });
      node.appendChild(btn);
      wrap.appendChild(node);
    }
  },

  /* ── görevler ── */
  renderQuests() {
    Meta.refreshQuests();
    const paint = (box, wrapEl) => {
      wrapEl.innerHTML = '';
      for (const qid of box.quests) {
        const def = Meta.questDef(qid);
        if (!def) continue;
        const prog = Math.min(def.target, Meta.questProgress(qid));
        const done = Meta.questClaimed(qid);
        const q = document.createElement('div');
        q.className = 'quest' + (done ? ' done' : '');
        q.innerHTML =
          '<div class="q-top"><span>' + (done ? '✅ ' : '') + def.desc + '</span>' +
          '<span class="q-reward">+' + def.reward + ' ◉</span></div>' +
          '<div class="q-bar"><div class="q-fill" style="width:' +
            Math.round((done ? 1 : prog / def.target) * 100) + '%"></div></div>' +
          '<div class="q-prog">' + (done ? 'Tamamlandı' : prog + ' / ' + def.target) + '</div>';
        wrapEl.appendChild(q);
      }
    };
    paint(Meta.save.daily, this.el['daily-list']);
    paint(Meta.save.weekly, this.el['weekly-list']);
  },

  /* ── koleksiyon ── */
  renderCollection(tab) {
    const wrap = this.el['coll-body'];
    wrap.innerHTML = '';
    const s = Meta.save;
    const add = (icon, name, desc, state) => {
      const d = document.createElement('div');
      d.className = 'coll-item ' + state; // '', 'locked', 'done'
      d.innerHTML = '<div class="ci-icon">' + icon + '</div><div class="ci-name">' + name +
        '</div><div class="ci-desc">' + desc + '</div>';
      wrap.appendChild(d);
    };
    if (tab === 'weapons') {
      for (const wid of DATA.weaponOrder) {
        const w = DATA.weapons[wid];
        const unlocked = s.weaponsUnlocked.includes(wid);
        const used = s.stats.weaponsUsed.includes(wid);
        const hint = wid === 'spark' ? 'Açmak için: bir mini boss devir' :
                     wid === 'trap' ? 'Açmak için: bir run\'da 8 dk hayatta kal' : '';
        add(unlocked ? w.icon : '🔒', w.name,
          unlocked ? w.desc : hint, unlocked ? (used ? 'done' : '') : 'locked');
        add(w.evo.icon, w.evo.name, w.evo.desc + ' (Gerekli pasif: ' +
          DATA.passives[w.evo.passive].name + ')', s.stats.evos > 0 && used ? '' : 'locked');
      }
    } else if (tab === 'enemies') {
      for (const eid of DATA.enemyOrder) {
        const e = DATA.enemies[eid];
        const seen = s.stats.enemiesSeen.includes(eid);
        add(seen ? '👾' : '❓', seen ? e.name : '???', seen ? e.desc : 'Henüz görülmedi.', seen ? '' : 'locked');
      }
      for (const b of DATA.bosses) {
        const seen = s.stats.bossesSeen.includes(b.id);
        const killed = (s.stats.bossKills[b.id] || 0) > 0;
        add(seen ? '👹' : '❓', seen ? b.name : '???',
          seen ? b.desc + (killed ? ' · ' + s.stats.bossKills[b.id] + ' kez devrildi' : '') : 'Henüz görülmedi.',
          killed ? 'done' : (seen ? '' : 'locked'));
      }
    } else {
      for (const a of DATA.achievements) {
        const got = !!s.achievements[a.id];
        add(got ? a.icon : '🔒', a.name, a.desc + ' · ' + a.pts + ' puan', got ? 'done' : 'locked');
      }
    }
  },

  /* ── HUD ── */
  startRunUI(run) {
    this.show('game');
    this.updateWeapons();
    this.el['bossbar-wrap'].classList.add('hidden');
    this.el['hint-controls'].style.display = '';
    this.el.vignette.classList.remove('low');
    this.el.vignette.style.opacity = '0';
    this.el['boss-banner'].classList.add('hidden');
  },

  fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  },

  updateHUD() {
    const run = Game.run;
    if (!run) return;
    const p = run.player;
    const hpf = Math.max(0, p.hp / p.stats.maxhp);
    this.el.hpbar.style.width = (hpf * 100) + '%';
    this.el.hpbar.classList.toggle('low', hpf < 0.3);
    this.el['hp-text'].textContent = Math.ceil(p.hp) + ' / ' + p.stats.maxhp;
    this.el.xpbar.style.width = Math.min(100, p.xp / p.xpNeed * 100) + '%';
    this.el['lvl-badge'].textContent = 'Sv.' + p.lvl;
    this.el['hud-timer'].textContent =
      (run.t >= run.len && run.boss && run.boss.bossDef.final) ? 'FİNAL BOSS' : this.fmtTime(run.t);
    this.el['hud-kills'].textContent = '☠ ' + p.kills;
    this.el['hud-coins'].textContent = '◉ ' + p.coinsRaw;
    this.el.vignette.classList.toggle('low', hpf < 0.3 && Game.state === 'playing');

    if (run.boss && !run.boss.dead) {
      this.el['bossbar-wrap'].classList.remove('hidden');
      this.el['bossbar-name'].textContent = run.boss.bossDef.name;
      this.el.bossbar.style.width = Math.max(0, run.boss.hp / run.boss.maxhp * 100) + '%';
    } else {
      this.el['bossbar-wrap'].classList.add('hidden');
    }
  },

  updateWeapons() {
    const run = Game.run;
    if (!run) return;
    const wrap = this.el['hud-weapons'];
    wrap.innerHTML = '';
    for (const w of run.player.weapons) {
      const def = DATA.weapons[w.id];
      const d = document.createElement('div');
      d.className = 'wicon' + (w.evolved ? ' evolved' : '');
      let pips = '';
      for (let i = 0; i < 5; i++) pips += '<span class="wpip' + (i < w.lvl ? ' full' : '') + '"></span>';
      d.innerHTML = (w.evolved ? def.evo.icon : def.icon) +
        (w.evolved ? '' : '<span class="wlvl">' + pips + '</span>');
      wrap.appendChild(d);
    }
  },

  hideHint() { this.el['hint-controls'].style.display = 'none'; },

  hitFlash() {
    const v = this.el.vignette;
    v.style.opacity = '0.85';
    setTimeout(() => { v.style.opacity = '0'; }, 120);
  },

  banner(txt) {
    const b = this.el['boss-banner'];
    b.textContent = txt;
    b.classList.remove('hidden');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 1800);
  },

  /* ── level up ── */
  showLevelUp(cards, title, rerolls) {
    this.el['levelup-title'].textContent = title;
    const wrap = this.el['levelup-cards'];
    wrap.innerHTML = '';
    for (const c of cards) {
      const rar = DATA.rarities[c.rarity] || DATA.rarities[0];
      const d = document.createElement('div');
      d.className = 'up-card ' + rar.cls;
      d.innerHTML =
        '<div class="uc-icon">' + c.icon + '</div>' +
        '<div class="uc-name">' + c.name + '</div>' +
        '<div class="uc-desc">' + (c.desc || '') + '</div>' +
        '<div class="uc-rarity">' + rar.name + '</div>' +
        (c.synergy ? '<div class="uc-syn">⚡ Evrim sinerjisi</div>' : '');
      d.addEventListener('click', () => Game.applyCard(c));
      wrap.appendChild(d);
    }
    const rb = this.el['btn-reroll'];
    rb.classList.toggle('hidden', !(rerolls > 0));
    this.el['reroll-count'].textContent = rerolls;
    this.el['overlay-levelup'].classList.remove('hidden');
  },
  hideLevelUp() { this.el['overlay-levelup'].classList.add('hidden'); },

  /* ── pause ── */
  showPause() {
    const run = Game.run, p = run.player;
    this.el['pause-stats'].textContent =
      this.fmtTime(run.t) + ' · ' + p.kills + ' av · Seviye ' + p.lvl +
      ' · ' + run.zone.name + (run.hard ? ' · 🌙 Kanlı Ay' : '');
    this.el['overlay-pause'].classList.remove('hidden');
  },
  hidePause() { this.el['overlay-pause'].classList.add('hidden'); },

  /* ── run sonu ── */
  showRunEnd(s) {
    this.el['runend-title'].textContent = s.victory
      ? '🏆 ZAFER!'
      : DATA.texts.deathLines[(Math.random() * DATA.texts.deathLines.length) | 0];
    this.el['runend-sub'].textContent = s.victory ? DATA.texts.winLine : 'Atalar bu avı not aldı.';

    const box = (val, label) =>
      '<div class="stat-box"><div class="sb-val">' + val + '</div><div class="sb-label">' + label + '</div></div>';
    let html = box(this.fmtTime(s.time), 'Süre') + box(s.kills, 'Av') +
      box('Sv.' + s.lvl, 'Seviye') + box('+' + s.coins + ' ◉', 'Coin');
    if (s.bestWeapon) {
      const wd = DATA.weapons[s.bestWeapon.id];
      html += box(wd.icon + ' ' + s.bestWeapon.dmg, 'En güçlü: ' + wd.name);
    }
    this.el['runend-stats'].innerHTML = html;

    // build özeti
    const bw = this.el['runend-build'];
    bw.innerHTML = '';
    for (const w of s.weapons) {
      const def = DATA.weapons[w.id];
      const d = document.createElement('div');
      d.className = 'wicon' + (w.evolved ? ' evolved' : '');
      d.title = w.evolved ? def.evo.name : def.name + ' Sv.' + w.lvl;
      d.textContent = w.evolved ? def.evo.icon : def.icon;
      bw.appendChild(d);
    }
    for (const pa of s.passives) {
      const def = DATA.passives[pa.id];
      const d = document.createElement('div');
      d.className = 'wicon';
      d.title = def.name + ' ×' + pa.n;
      d.textContent = def.icon;
      bw.appendChild(d);
    }

    this.el['runend-unlocks'].innerHTML = s.unlocks.map(u => '<div>' + u + '</div>').join('');
    this.el['overlay-runend'].classList.remove('hidden');
  },

  setBoss(boss) { /* HUD update zaten her karede çalışıyor */ },

  /* ── toast ── */
  toast(html) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    this.el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  },
};
