/* ═══════ GRUKK: Kemik Çağı — Oyun Verileri ═══════ */
'use strict';

const DATA = {};

/* ── Karakterler ── */
DATA.characters = [
  { id:'karg',  name:'Karg',  role:'Taş Avcısı',      face:'🪨', cost:0,
    weapon:'spear', hp:100, speed:1.0,  dmg:1.0,  area:1.0, armor:0, xp:1.0, pickup:1.0,
    desc:'Dengeli ve güvenilir. Kemik mızrağıyla sürünün önünde durur.' },
  { id:'velna', name:'Velna', role:'Ateş Toplayıcı',  face:'🔥', cost:300,
    weapon:'lava',  hp:75,  speed:1.0,  dmg:1.1,  area:1.15, armor:0, xp:1.0, pickup:1.0,
    desc:'Kırılgan ama yakıcı. Lav taşı fırlatır; alan +%15, hasar +%10.' },
  { id:'odu',   name:'Odu',   role:'Kemik Şaman',     face:'💀', cost:500,
    weapon:'wave',  hp:110, speed:0.85, dmg:1.0,  area:1.0, armor:0, xp:1.2, pickup:1.0,
    desc:'Yavaş ama bilge. Ruh dalgaları gönderir; XP kazanımı +%20.' },
  { id:'sek',   name:'Sek',   role:'Mağara Koşucusu', face:'🦶', cost:750,
    weapon:'spark', hp:85,  speed:1.25, dmg:0.85, area:1.0, armor:0, xp:1.0, pickup:1.2,
    desc:'Sürüden hızlı olan yaşar. Çok hızlı; pickup +%20, hasar −%15.' },
  { id:'bruk',  name:'Bruk',  role:'Kristal Kırıcı',  face:'💎', cost:1000,
    weapon:'axe',   hp:150, speed:0.85, dmg:1.1,  area:1.0, armor:2, xp:1.0, pickup:1.0,
    desc:'Yürüyen kaya. Taş baltası çevresinde döner; zırh +2, hasar +%10.' },
];

/* ── Silahlar (5 seviye + evrim) ── */
DATA.weapons = {
  spear: {
    name:'Kemik Mızrak', icon:'🦴', kind:'proj',
    desc:'En yakın ava kemik mızrak fırlatır.',
    evo:{ name:'Dev Avcı Mızrağı', icon:'🗡️', passive:'sharp',
      desc:'Dev mızrak tüm sürüyü deler geçer.' },
    levels:[
      {dmg:12, cd:1.05, count:1, pierce:0, speed:520},
      {dmg:16, cd:1.0,  count:1, pierce:1, speed:540},
      {dmg:20, cd:0.92, count:2, pierce:1, speed:560},
      {dmg:26, cd:0.85, count:2, pierce:2, speed:580},
      {dmg:33, cd:0.78, count:3, pierce:2, speed:600}],
    evoStats:{dmg:58, cd:0.72, count:3, pierce:99, speed:700, big:true},
  },
  axe: {
    name:'Taş Balta', icon:'🪓', kind:'orbit',
    desc:'Oyuncunun çevresinde dönen taş baltalar.',
    evo:{ name:'Fırtına Baltası', icon:'🌪️', passive:'haste',
      desc:'Balta fırtınası: daha çok, daha hızlı, daha geniş.' },
    levels:[
      {dmg:10, count:1, radius:74,  rot:2.6},
      {dmg:13, count:2, radius:80,  rot:2.8},
      {dmg:16, count:2, radius:88,  rot:3.1},
      {dmg:20, count:3, radius:96,  rot:3.4},
      {dmg:25, count:3, radius:104, rot:3.8}],
    evoStats:{dmg:42, count:5, radius:126, rot:5.0, big:true},
  },
  lava: {
    name:'Lav Topu', icon:'🌋', kind:'proj',
    desc:'Yavaş süzülür, çarptığı yerde alan patlaması yapar.',
    evo:{ name:'Volkan Çekirdeği', icon:'☄️', passive:'blast',
      desc:'Dev patlama + yerde yanan lav alanı bırakır.' },
    levels:[
      {dmg:16, cd:1.7,  count:1, radius:62,  speed:240},
      {dmg:21, cd:1.6,  count:1, radius:70,  speed:250},
      {dmg:27, cd:1.5,  count:2, radius:78,  speed:260},
      {dmg:34, cd:1.4,  count:2, radius:86,  speed:275},
      {dmg:42, cd:1.3,  count:2, radius:96,  speed:290}],
    evoStats:{dmg:72, cd:1.25, count:3, radius:128, speed:300, pool:true, big:true},
  },
  spark: {
    name:'Kıvılcım Taşı', icon:'⚡', kind:'chain',
    desc:'En yakın ava çakar, avlar arasında zıplar.',
    evo:{ name:'Gök Gürültüsü Fosili', icon:'🌩️', passive:'chain',
      desc:'Gök öfkesi: çok daha fazla hedefe sıçrar.' },
    levels:[
      {dmg:11, cd:1.5,  chains:2, range:340},
      {dmg:14, cd:1.4,  chains:3, range:355},
      {dmg:18, cd:1.3,  chains:3, range:370},
      {dmg:23, cd:1.2,  chains:4, range:385},
      {dmg:29, cd:1.1,  chains:5, range:400}],
    evoStats:{dmg:44, cd:0.95, chains:9, range:440, big:true},
  },
  wave: {
    name:'Ruh Dalgası', icon:'🌀', kind:'ring',
    desc:'Aralıklarla genişleyen ruh halkası; vurur ve iter.',
    evo:{ name:'Ataların Çığlığı', icon:'😱', passive:'spirit',
      desc:'Ataların sesi: dev halka, sürüyü uzağa savurur.' },
    levels:[
      {dmg:12, cd:2.6,  radius:120, knock:170},
      {dmg:16, cd:2.4,  radius:135, knock:190},
      {dmg:21, cd:2.2,  radius:150, knock:210},
      {dmg:27, cd:2.0,  radius:168, knock:235},
      {dmg:34, cd:1.85, radius:188, knock:260}],
    evoStats:{dmg:56, cd:1.7, radius:250, knock:420, big:true},
  },
  trap: {
    name:'Fosil Tuzak', icon:'🪤', kind:'trap',
    desc:'Geçtiğin yere tuzak bırakır; basan av patlar.',
    evo:{ name:'Kemik Mayın Tarlası', icon:'💥', passive:'trapper',
      desc:'Her yer tuzak: aynı anda çok daha fazla mayın.' },
    levels:[
      {dmg:24, cd:2.4,  max:3,  radius:92},
      {dmg:31, cd:2.2,  max:4,  radius:100},
      {dmg:39, cd:2.0,  max:5,  radius:108},
      {dmg:49, cd:1.8,  max:6,  radius:118},
      {dmg:60, cd:1.6,  max:7,  radius:128}],
    evoStats:{dmg:95, cd:1.2, max:12, radius:150, big:true},
  },
};
DATA.weaponOrder = ['spear','axe','lava','wave','spark','trap'];

/* ── Pasifler — nadirlik değerleri: common/rare/epic/legend ── */
DATA.passives = {
  sharp:   {name:'Keskinlik',         icon:'🔪', stat:'dmg',     vals:[.10,.15,.22,.32], max:5, pct:true,  desc:'Tüm hasar'},
  haste:   {name:'Dönüş Hızı',        icon:'💨', stat:'aspd',    vals:[.08,.12,.17,.25], max:5, pct:true,  desc:'Saldırı hızı'},
  blast:   {name:'Patlama Gücü',      icon:'💢', stat:'area',    vals:[.10,.15,.22,.32], max:5, pct:true,  desc:'Etki alanı'},
  chain:   {name:'Zincirleme',        icon:'🔗', stat:'chain',   vals:[1,1,2,2],         max:3, pct:false, desc:'Zincir hedefi (+kritik %2)'},
  spirit:  {name:'Ruh Gücü',          icon:'👻', stat:'knock',   vals:[.20,.30,.45,.65], max:3, pct:true,  desc:'Geri itme (+alan %5)'},
  trapper: {name:'Tuzak Ustası',      icon:'🕸️', stat:'ammo',    vals:[1,1,2,2],         max:3, pct:false, desc:'Tuzak/mermi adedi'},
  swift:   {name:'Yel Ayakları',      icon:'🦅', stat:'speed',   vals:[.06,.09,.13,.18], max:4, pct:true,  desc:'Hareket hızı'},
  hide:    {name:'Mamut Derisi',      icon:'🦣', stat:'maxhp',   vals:[15,22,32,45],     max:5, pct:false, desc:'Maks can'},
  shell:   {name:'Taş Kabuk',         icon:'🛡️', stat:'armor',   vals:[1,2,3,4],         max:3, pct:false, desc:'Zırh'},
  magnet:  {name:'Toplayıcı İçgüdü',  icon:'🧲', stat:'pickup',  vals:[.15,.22,.32,.45], max:4, pct:true,  desc:'Pickup mesafesi'},
  eye:     {name:'Avcı Gözü',         icon:'👁️', stat:'crit',    vals:[.04,.06,.09,.13], max:4, pct:true,  desc:'Kritik şansı'},
  lore:    {name:'Kadim Bilgi',       icon:'🗿', stat:'xpgain',  vals:[.08,.12,.17,.24], max:4, pct:true,  desc:'XP kazanımı'},
  regen:   {name:'Şifalı Yosun',      icon:'🌿', stat:'regen',   vals:[.4,.6,.9,1.3],    max:3, pct:false, desc:'Can yenileme /sn'},
};

DATA.rarities = [
  {id:'common', name:'SIRADAN',   w:58, cls:'rar-common'},
  {id:'rare',   name:'NADİR',     w:26, cls:'rar-rare'},
  {id:'epic',   name:'DESTANSI',  w:12, cls:'rar-epic'},
  {id:'legend', name:'EFSANEVİ',  w:4,  cls:'rar-legend'},
];

/* ── Düşmanlar (from: 600sn normuna göre giriş anı) ── */
DATA.enemies = {
  lizard:  {name:'Küçük Sürüngen',  hp:14,  dmg:6,  speed:96,  r:11, xp:2, from:0,
            color:'#7cb56a', color2:'#4a7a3a', shape:'lizard',
            desc:'Hızlı ama zayıf. Sürünün ön dişleri.'},
  beetle:  {name:'Taş Böceği',      hp:55,  dmg:9,  speed:42,  r:15, xp:3, from:60,
            color:'#8a8278', color2:'#5a544c', shape:'beetle',
            desc:'Yavaş yürür, zor kırılır.'},
  bat:     {name:'Uçan Yarasa',     hp:20,  dmg:7,  speed:120, r:11, xp:2, from:120, flying:true,
            color:'#8a6aa8', color2:'#5a4474', shape:'bat',
            desc:'Engelleri yok sayar, dosdoğru gelir.'},
  worm:    {name:'Lav Kurdu',       hp:42,  dmg:16, speed:74,  r:14, xp:4, from:210,
            color:'#e07038', color2:'#9a3a14', shape:'worm',
            desc:'Dokunması yakar. Uzak dur.'},
  bone:    {name:'Kemik Devriyesi', hp:120, dmg:12, speed:54,  r:17, xp:7, from:300, armor:4,
            color:'#e8dcc8', color2:'#a89a80', shape:'bone',
            desc:'Zırhlı. Zayıf vuruşları umursamaz.'},
  spitter: {name:'Kristal Tüküren', hp:48,  dmg:10, speed:58,  r:14, xp:6, from:360,
            color:'#6ec3d8', color2:'#3a7a90', shape:'spitter',
            ranged:{range:300, cd:2.6, pspeed:230},
            desc:'Mesafesini korur, kristal tükürür.'},
};
DATA.enemyOrder = ['lizard','beetle','bat','worm','bone','spitter'];

/* ── Boss'lar (at: run süresi oranı) ── */
DATA.bosses = [
  {id:'giant',  name:'MAĞARA DEVİ',  at:0.30, hp:850,  dmg:24, speed:46, r:34, xp:60,
   color:'#9a8a6a', color2:'#5a503a', attack:'slam', final:false,
   desc:'Yeri sarsar, köşeye sıkıştırır. İşaretli alandan kaç.'},
  {id:'lavafang', name:'LAV DİŞLİ',  at:0.60, hp:1500, dmg:22, speed:74, r:28, xp:90,
   color:'#e05038', color2:'#7a1a0a', attack:'dash', final:false,
   desc:'Kısa ve öldürücü atılışlar yapar. Sürekli hareket et.'},
  {id:'crystalmother', name:'KRİSTAL ANA', at:0.80, hp:2100, dmg:18, speed:40, r:32, xp:120,
   color:'#6ec3d8', color2:'#2a5a70', attack:'summon', final:false,
   desc:'Yavrularını çağırır, kristal halkaları saçar.'},
  {id:'tyrant', name:'FOSİL TİRAN',  at:1.00, hp:5200, dmg:28, speed:56, r:42, xp:400,
   color:'#cfc4ae', color2:'#6a5f4a', attack:'phases', final:true,
   desc:'Kemik Çağı\'nın efendisi. Üç fazı vardır; hepsi öfkedir.'},
];

/* ── Arena bölgeleri ── */
DATA.zones = [
  {id:'plain',    name:'Taş Ovası',         unlock:0,  bg:'#241e17', ground:'#2c241b',
   deco:['#5a503e','#6a604a','#4a4236'], decoType:'rock',    glow:null},
  {id:'boneforest', name:'Kemik Ormanı',    unlock:2,  bg:'#1e1a16', ground:'#27211c',
   deco:['#cfc4ae','#a89a80','#8a7f68'], decoType:'bone',    glow:null},
  {id:'lavapit',  name:'Lav Çukuru',        unlock:4,  bg:'#241412', ground:'#2c1a16',
   deco:['#e05038','#9a3a14','#5a2a1a'], decoType:'lava',    glow:'#e05038'},
  {id:'crystal',  name:'Kristal Mağara',    unlock:6,  bg:'#161a22', ground:'#1c2230',
   deco:['#6ec3d8','#4a8aa8','#8a6aa8'], decoType:'crystal', glow:'#6ec3d8'},
  {id:'swamp',    name:'Fosil Bataklığı',   unlock:8,  bg:'#181e14', ground:'#20281a',
   deco:['#7a9a5a','#5a7a42','#a89a80'], decoType:'swamp',   glow:null},
  {id:'moontemple', name:'Ay Taşı Tapınağı', unlock:10, bg:'#1a1620', ground:'#231e2c',
   deco:['#8a6aa8','#b8a8d8','#6a5a88'], decoType:'temple',  glow:'#b8a8d8'},
];

/* ── Run modları ── */
DATA.modes = [
  {id:'short',    name:'Hızlı Av · 5dk',    len:300, unlock:null,  coinMult:0.7},
  {id:'standard', name:'Standart Av · 10dk', len:600, unlock:null,  coinMult:1.0},
  {id:'long',     name:'Uzun Av · 15dk',    len:900, unlock:'win', coinMult:1.4},
];

/* ── Atalar Ağacı ── */
DATA.metaUpgrades = [
  {id:'heart',  name:'Mamut Yüreği',   icon:'❤️', max:5, costs:[50,100,160,250,400],
   per:10,  pct:false, desc:'Başlangıç canı +10'},
  {id:'edge',   name:'Keskin Miras',   icon:'⚔️', max:5, costs:[60,120,200,320,480],
   per:.04, pct:true,  desc:'Hasar +%4'},
  {id:'arms',   name:'Uzun Kollar',    icon:'🦾', max:5, costs:[40,80,140,220,320],
   per:.08, pct:true,  desc:'Pickup mesafesi +%8'},
  {id:'eye',    name:'Parlak Göz',     icon:'🌟', max:5, costs:[50,100,160,250,400],
   per:.06, pct:true,  desc:'Coin kazanımı +%6'},
  {id:'soul',   name:'Kadim Ruh',      icon:'🔮', max:5, costs:[60,120,200,320,480],
   per:.05, pct:true,  desc:'XP kazanımı +%5'},
  {id:'reroll', name:'Yeniden Fırlat', icon:'🎲', max:2, costs:[150,350],
   per:1,   pct:false, desc:'Run başına +1 kart çevirme'},
  {id:'hands',  name:'Usta Eller',     icon:'✋', max:2, costs:[200,500],
   per:1,   pct:false, desc:'Başlangıç silahı +1 seviye'},
  {id:'breath', name:'Ata Nefesi',     icon:'🫁', max:1, costs:[600],
   per:1,   pct:false, desc:'Run başına +1 yeniden doğuş'},
];

/* ── Başarımlar ── */
DATA.achievements = [
  {id:'firstblood', name:'İlk Kan',        icon:'🩸', pts:10,  reward:10,
   desc:'İlk yaratığını öldür.'},
  {id:'swarmbreaker', name:'Sürü Kıran',   icon:'⚔️', pts:25,  reward:50,
   desc:'Tek run\'da 300 yaratık öldür.'},
  {id:'fivemin', name:'Beş Dakika',        icon:'⏳', pts:15,  reward:30,
   desc:'Bir run\'da 5 dakika hayatta kal.'},
  {id:'giantslayer', name:'Dev Avcısı',    icon:'🪨', pts:20,  reward:40,
   desc:'Mağara Devi\'ni devir.'},
  {id:'lavaslayer', name:'Lav Söndüren',   icon:'🌋', pts:30,  reward:60,
   desc:'Lav Dişli\'yi devir.'},
  {id:'crystalslayer', name:'Kristal Kıran', icon:'💎', pts:40, reward:80,
   desc:'Kristal Ana\'yı devir.'},
  {id:'tyrantfall', name:'Tiran Düşüren',  icon:'👑', pts:80,  reward:150,
   desc:'Fosil Tiran\'ı devir. (Uzun Av + Kanlı Ay açılır)'},
  {id:'evolution', name:'Evrim',           icon:'🧬', pts:30,  reward:60,
   desc:'İlk silah evrimini gerçekleştir.'},
  {id:'collector', name:'Koleksiyoncu',    icon:'📖', pts:40,  reward:100,
   desc:'6 silahın hepsini en az bir kez kullan.'},
  {id:'richhunter', name:'Zengin Avcı',    icon:'◉', pts:25,  reward:50,
   desc:'Toplam 2000 coin biriktir (tüm zamanlar).'},
  {id:'lvl12', name:'Kabile Reisi',        icon:'🔱', pts:25,  reward:40,
   desc:'Tek run\'da 12. seviyeye ulaş.'},
  {id:'veteran', name:'Kadim Avcı',        icon:'🗿', pts:50,  reward:100,
   desc:'Toplam 1 saat av yap.'},
];

/* ── Görev havuzları ── */
DATA.dailyQuests = [
  {id:'d_survive5', desc:'Bir run\'da 5 dk hayatta kal', metric:'maxTime', target:300, reward:30},
  {id:'d_kill500',  desc:'500 yaratık öldür',            metric:'kills',   target:500, reward:40},
  {id:'d_level8',   desc:'Bir run\'da 8 seviye atla',    metric:'maxLevel', target:8,  reward:35},
  {id:'d_miniboss', desc:'1 mini boss öldür',            metric:'miniboss', target:1,  reward:35},
  {id:'d_coin200',  desc:'200 coin topla',               metric:'coins',   target:200, reward:40},
  {id:'d_lava100',  desc:'Lav Topu ile 100 yaratık öldür', metric:'lavaKills', target:100, reward:35},
  {id:'d_run2',     desc:'2 av tamamla',                 metric:'runs',    target:2,   reward:25},
  {id:'d_xp1500',   desc:'1500 XP topla',                metric:'xp',      target:1500, reward:30},
];
DATA.weeklyQuests = [
  {id:'w_run10',   desc:'10 av tamamla',                  metric:'runs',   target:10,    reward:150},
  {id:'w_boss3',   desc:'Fosil Tiran\'ı 3 kez devir',     metric:'wins',   target:3,     reward:250},
  {id:'w_kill10k', desc:'10.000 yaratık öldür',           metric:'kills',  target:10000, reward:200},
  {id:'w_chars3',  desc:'3 farklı karakterle av yap',     metric:'chars',  target:3,     reward:150},
  {id:'w_evolve2', desc:'2 silah evrimleştir',            metric:'evos',   target:2,     reward:180},
];

/* ── Metinler ── */
DATA.texts = {
  loadTips: [
    'Kemikler ısınıyor...', 'Sürü kokuyu aldı...', 'Atalar izliyor...',
    'Mızraklar bileniyor...', 'Mağara yankılanıyor...'],
  deathLines: [
    'Av bitti. Ama kemikler güçlendi.',
    'Sürü bu sefer kazandı. Atalar not aldı.',
    'Düştün. Ama mağara seni unutmaz.',
    'Bu av kaybedildi. Sıradaki senin.'],
  winLine: 'Fosil Tiran devrildi. Sürünün efsanesi sensin.',
};

/* ── Pickup tanımları ── */
DATA.pickups = {
  meat:   {name:'Et Parçası',     icon:'🍖', color:'#d87a5a'},
  magnet: {name:'Manyetik Kemik', icon:'🧲', color:'#e8dcc8'},
  totem:  {name:'Patlama Totemi', icon:'🗿', color:'#e8a33d'},
  fossil: {name:'Zaman Fosili',   icon:'🐚', color:'#6ec3d8'},
  chest:  {name:'Av Sandığı',     icon:'🎁', color:'#f0b545'},
};
