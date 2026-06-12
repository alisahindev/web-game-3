/* ═══════ GRUKK — Kalıcı ilerleme, görevler, başarımlar ═══════ */
'use strict';

const Meta = {
  KEY: 'grukk_save_v1',
  save: null,

  defaults() {
    return {
      coins: 0,
      totalCoinsEver: 0,
      meta: {},                       // metaUpgrade id -> seviye
      unlockedChars: ['karg'],
      selectedChar: 'karg',
      selectedZone: 'plain',
      selectedMode: 'standard',
      hardMode: false,
      charXp: {},                     // charId -> toplam xp
      weaponsUnlocked: ['spear','axe','lava','wave'],
      achievements: {},               // achId -> true
      achPoints: 0,
      stats: { kills:0, runs:0, wins:0, timePlayed:0, maxTime:0, maxKills:0,
               evos:0, bossKills:{}, weaponsUsed:[], enemiesSeen:[], bossesSeen:[],
               charsUsed:[] },
      daily:  { seed:'', quests:[], prog:{}, claimed:{} },
      weekly: { seed:'', quests:[], prog:{}, claimed:{} },
      settings: { sfx:0.8, music:0.55, shake:true, fx:'full', dmgnum:true },
      hardUnlocked: false,
      longUnlocked: false,
    };
  },

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { s = null; }
    const d = this.defaults();
    this.save = Object.assign(d, s || {});
    // iç içe nesneleri güvenle birleştir
    for (const k of ['stats','daily','weekly','settings']) {
      this.save[k] = Object.assign(this.defaults()[k], (s && s[k]) || {});
    }
    this.refreshQuests();
    this.persist();
  },

  persist() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.save)); } catch (e) {}
  },

  wipe() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    this.load();
  },

  /* ── coin ── */
  addCoins(n) {
    this.save.coins += n;
    this.save.totalCoinsEver += Math.max(0, n);
    this.persist();
  },

  /* ── Atalar Ağacı bonusları ── */
  metaLvl(id) { return this.save.meta[id] || 0; },
  metaBonus(id) {
    const def = DATA.metaUpgrades.find(m => m.id === id);
    return def ? def.per * this.metaLvl(id) : 0;
  },
  buyMeta(id) {
    const def = DATA.metaUpgrades.find(m => m.id === id);
    const lvl = this.metaLvl(id);
    if (!def || lvl >= def.max) return false;
    const cost = def.costs[lvl];
    if (this.save.coins < cost) return false;
    this.save.coins -= cost;
    this.save.meta[id] = lvl + 1;
    this.persist();
    return true;
  },

  /* ── karakter ── */
  buyChar(id) {
    const c = DATA.characters.find(x => x.id === id);
    if (!c || this.save.unlockedChars.includes(id) || this.save.coins < c.cost) return false;
    this.save.coins -= c.cost;
    this.save.unlockedChars.push(id);
    this.persist();
    return true;
  },
  charLevel(id) {
    const xp = this.save.charXp[id] || 0;
    return Math.min(10, Math.floor(Math.sqrt(xp / 400)));
  },

  /* ── seeded RNG (görev seçimi herkes için gün/hafta bazında aynı) ── */
  seededPick(pool, n, seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rng = () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const arr = pool.slice();
    const out = [];
    while (out.length < n && arr.length) out.push(arr.splice(Math.floor(rng() * arr.length), 1)[0]);
    return out;
  },

  refreshQuests() {
    const now = new Date();
    const dSeed = now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
    const wSeed = now.getFullYear() + '-w' + week;
    if (this.save.daily.seed !== dSeed) {
      this.save.daily = { seed: dSeed, prog: {}, claimed: {},
        quests: this.seededPick(DATA.dailyQuests, 3, dSeed).map(q => q.id) };
    }
    if (this.save.weekly.seed !== wSeed) {
      this.save.weekly = { seed: wSeed, prog: {}, claimed: {},
        quests: this.seededPick(DATA.weeklyQuests, 2, wSeed).map(q => q.id) };
    }
  },

  questDef(id) {
    return DATA.dailyQuests.find(q => q.id === id) || DATA.weeklyQuests.find(q => q.id === id);
  },

  /* metric olayı: görev ilerlemesi + otomatik ödül */
  questEvent(metric, value, mode) {
    // mode: 'add' (birikir) | 'max' (en iyi değer) | 'set-uniq' (benzersiz sayaç, value=id)
    this.refreshQuests();
    for (const box of [this.save.daily, this.save.weekly]) {
      for (const qid of box.quests) {
        const def = this.questDef(qid);
        if (!def || def.metric !== metric || box.claimed[qid]) continue;
        if (mode === 'set-uniq') {
          const cur = box.prog[qid] || [];
          if (!cur.includes(value)) { cur.push(value); box.prog[qid] = cur; }
        } else if (mode === 'max') {
          box.prog[qid] = Math.max(box.prog[qid] || 0, value);
        } else {
          box.prog[qid] = (box.prog[qid] || 0) + value;
        }
        const prog = Array.isArray(box.prog[qid]) ? box.prog[qid].length : box.prog[qid];
        if (prog >= def.target) {
          box.claimed[qid] = true;
          this.addCoins(def.reward);
          if (typeof UI !== 'undefined') UI.toast('📜 Görev tamam: <b>' + def.desc + '</b> +' + def.reward + ' ◉');
          if (typeof AudioSys !== 'undefined') AudioSys.sfx('quest');
        }
      }
    }
    this.persist();
  },

  questProgress(qid) {
    this.refreshQuests();
    const box = this.save.daily.quests.includes(qid) ? this.save.daily : this.save.weekly;
    const p = box.prog[qid];
    return Array.isArray(p) ? p.length : (p || 0);
  },
  questClaimed(qid) {
    const box = this.save.daily.quests.includes(qid) ? this.save.daily : this.save.weekly;
    return !!box.claimed[qid];
  },
  hasUnclaimedTargets() {
    this.refreshQuests();
    for (const box of [this.save.daily, this.save.weekly])
      for (const qid of box.quests) if (!box.claimed[qid]) return true;
    return false;
  },

  /* ── başarımlar ── */
  unlockAch(id) {
    if (this.save.achievements[id]) return;
    const def = DATA.achievements.find(a => a.id === id);
    if (!def) return;
    this.save.achievements[id] = true;
    this.save.achPoints += def.pts;
    this.addCoins(def.reward);
    if (id === 'tyrantfall') { this.save.hardUnlocked = true; this.save.longUnlocked = true; }
    this.persist();
    if (typeof UI !== 'undefined') UI.toast('🏆 Başarım: <b>' + def.name + '</b> +' + def.reward + ' ◉');
    if (typeof AudioSys !== 'undefined') AudioSys.sfx('achievement');
  },

  markSeen(listName, id) {
    const arr = this.save.stats[listName];
    if (arr && !arr.includes(id)) { arr.push(id); this.persist(); }
  },

  zoneUnlocked(z)  { return this.save.stats.runs >= z.unlock; },
  modeUnlocked(m)  { return !m.unlock || (m.unlock === 'win' && this.save.longUnlocked); },
};
