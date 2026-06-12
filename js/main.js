/* ═══════ GRUKK — Açılış ═══════ */
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  Meta.load();
  UI.init();
  Game.init();

  // kısa yükleme sahnesi (ipucu + bar)
  const tip = document.getElementById('loading-tip');
  tip.textContent = DATA.texts.loadTips[(Math.random() * DATA.texts.loadTips.length) | 0];
  const bar = document.getElementById('loading-bar');
  let prog = 0;
  const iv = setInterval(() => {
    prog = Math.min(100, prog + 18 + Math.random() * 22);
    bar.style.width = prog + '%';
    if (prog >= 100) {
      clearInterval(iv);
      setTimeout(() => UI.show('menu'), 220);
    }
  }, 110);
});
