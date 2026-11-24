/* ---------- boot ---------- */
(function boot() {
  const h = location.hash.slice(1);
  if (h.startsWith('ws=day-')) {
    const i = +h.slice(7) - 1;
    if (i >= 0 && i < DAYS.length) { document.documentElement.classList.add('wsmode'); appEl.innerHTML = wsHTML(worksheetFor(i)); return; }
  }
  S.tab = TABS.some(t => t[0] === h) ? h : 'learn';
  render();
  setInterval(globalTick, 1000);
  setInterval(() => { if (!LESSON && !PAGES.length && !SHEET) { if (S.tab === 'learn') render(); maybeCheckIn(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { globalTick(); if (!LESSON && !PAGES.length && !SHEET) { render(); setTimeout(maybeCheckIn, 500); } } });
  setTimeout(() => { if (!welcome()) maybeCheckIn(); }, 400);
  initSync();
  initCaps();
  if (IS_PWA) initPWA();
})();
