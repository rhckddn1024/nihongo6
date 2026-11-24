import pathlib, json, shutil
root = pathlib.Path(__file__).parent
src = root / 'src'
css = (src / 'style.css').read_text()
FILES = ['data.js', 'core.js', 'engines.js', 'views.js', 'pwa.js', 'boot.js']
js = '\n'.join((src / f).read_text() for f in FILES)

def page(pwa: bool) -> str:
    head_extra = ''
    pre = ''
    if pwa:
        head_extra = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="일본어 6주">
'''
        pre = 'const __IS_PWA__ = true;\n'
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
{head_extra}<title>일본어 6주</title>
<style>
{css}
</style>
</head>
<body>
<main id="app" aria-live="polite"></main>
<script>
(() => {{
'use strict';
{pre}{js}
}})();
</script>
</body>
</html>
'''

out = root / 'dist'; out.mkdir(exist_ok=True)
(out / 'index.html').write_text(page(False))

pw = root / 'app'
keep = {n: (pw / n).read_bytes() for n in ['README-ko.txt', 'calendar.ics'] if (pw / n).exists()}
if pw.exists(): shutil.rmtree(pw)
(pw / 'icons').mkdir(parents=True)
(pw / 'index.html').write_text(page(True))
for f in (root / 'assets' / 'icons').iterdir(): shutil.copy(f, pw / 'icons' / f.name)
manifest = {
  "name": "일본어 6주", "short_name": "일본어 6주", "description": "일본 한달살이 전 6주 일본어 플랜: 세트 타이머, 가나, 회화, 간격 반복 카드, 08년생 말투",
  "lang": "ko", "start_url": "./", "scope": "./", "id": "./", "display": "standalone", "orientation": "portrait",
  "background_color": "#F2F2F7", "theme_color": "#F2F2F7",
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
(pw / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
(pw / 'sw.js').write_text('''const CACHE = 'nihongo6-__STAMP__';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './calendar.ics', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, {ignoreSearch: true}).then(hit => {
    const net = fetch(r).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit || caches.match('./index.html'));
    return hit || net;
  }));
});
''')
for n, data in keep.items(): (pw / n).write_bytes(data)
import time
sw=(pw / 'sw.js').read_text().replace('__STAMP__', time.strftime('%Y%m%d%H%M%S'))
(pw / 'sw.js').write_text(sw)
print('built', (out / 'index.html').stat().st_size, (pw / 'index.html').stat().st_size)
