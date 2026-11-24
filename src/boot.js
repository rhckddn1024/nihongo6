/* ---------- boot ---------- */
(function boot() {
  const h = location.hash.slice(1);
  if (TABS.some(t => t[0] === h)) S.tab = h;
  render();
  setInterval(globalTick, 1000);
  setInterval(() => { if (S.tab === 'today' && !PAGES.length && !SHEET) render(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { globalTick(); if (!PAGES.length && !SHEET) render(); } });
  setTimeout(welcome, 400);
  initSync();
  initCaps();
  if (IS_PWA) initPWA();
})();
