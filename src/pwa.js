/* ================= INSTALLED APP (PWA) ================= */
let INSTALL_EVT = null;
function isStandalone() {
  try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
}
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installBanner() {
  if (!IS_PWA || isStandalone() || S.asked.install) return '';
  const ios = isIOS();
  return `<div class="notice info"><b>홈 화면에 설치해 두세요</b>
    <p>${ios ? 'Safari 아래쪽 공유 버튼을 누르고 홈 화면에 추가를 골라요. 그다음부터는 홈 화면 아이콘으로 열어야 기록이 이어져요.' : INSTALL_EVT ? '설치하면 앱처럼 바로 열려요.' : 'Chrome 오른쪽 위 메뉴에서 앱 설치나 홈 화면에 추가를 골라요.'}</p>
    <div class="hstack mt8">${!ios && INSTALL_EVT ? '<button class="btn sm" data-act="install">설치하기</button>' : ''}<button class="btn sm grey" data-act="hideInstall">나중에</button></div></div>`;
}
function downloadFile(name, text, type) {
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsFold(line) {
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 73) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
  }
  out.push(cur);
  return out.join('\r\n');
}
function makeICS(times) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nihongo6//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:일본어 6주', 'X-WR-TIMEZONE:Asia/Seoul',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Seoul', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0900', 'TZOFFSETTO:+0900', 'TZNAME:KST', 'END:STANDARD', 'END:VTIMEZONE'];
  DAYS.forEach((d, i) => {
    const date = dateOfIdx(i).replace(/-/g, '');
    [1, 2, 3].forEach(n => {
      const [hh, mm] = times[n - 1].split(':').map(Number);
      const end = hh * 60 + mm + 20;
      const st = `${date}T${pad(hh)}${pad(mm)}00`;
      const enDate = end >= 1440 ? addDays(dateOfIdx(i), 1).replace(/-/g, '') : date;
      const en = `${enDate}T${pad(Math.floor(end % 1440 / 60))}${pad(end % 60)}00`;
      const info = setInfo(i, n);
      L.push('BEGIN:VEVENT', `UID:nihongo6-${date}-${n}@nihongo6`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Asia/Seoul:${st}`, `DTEND;TZID=Asia/Seoul:${en}`,
        icsFold('SUMMARY:' + icsEscape(`일본어 세트 ${n} · ${info.name}`)), icsFold('DESCRIPTION:' + icsEscape(`${i + 1}일째 · ${d.t}\n앱을 열고 오늘 동그라미를 누르면 시작돼요.`)),
        'BEGIN:VALARM', 'ACTION:DISPLAY', icsFold('DESCRIPTION:' + icsEscape(`일본어 세트 ${n} 시간이에요. 20분이면 돼요.`)), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    });
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
Object.assign(ACT, {
  install: async () => {
    if (!INSTALL_EVT) return;
    INSTALL_EVT.prompt();
    try { const r = await INSTALL_EVT.userChoice; if (r && r.outcome === 'accepted') { S.asked.install = 1; save(); } } catch (e) {}
    INSTALL_EVT = null; render();
  },
  hideInstall: () => { S.asked.install = 1; save(); render(); },
  ics: () => {
    downloadFile('nihongo6-alarms.ics', makeICS(S.settings.times), 'text/calendar');
    openSheet(b => {
      b.innerHTML = `<h2>캘린더 알림 파일</h2><p class="muted small">세트 129개가 알림과 함께 들어 있는 파일을 받았어요.</p>
        <div class="card small mt12"><b>갤럭시</b><br>삼성 캘린더는 이 파일을 직접 못 열어요. 컴퓨터에서 Google 캘린더 웹을 열고 설정, 가져오기 및 내보내기로 들어가 파일을 올리면 폰 캘린더에도 들어와요.</div>
        <div class="card small mt8"><b>아이폰</b><br>파일 앱에서 nihongo6-alarms.ics를 누르고 모두 추가를 골라요.</div>
        <button class="btn mt16" data-ok>확인</button>`;
      $('[data-ok]', b).addEventListener('click', () => closeSheet());
    });
  },
  backupFile: () => { downloadFile(`nihongo6-backup-${today()}.json`, JSON.stringify(S), 'application/json'); toast('백업 파일을 저장했어요'); }
});
function initPWA() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; if (S.tab === 'learn' && !PAGES.length && !LESSON) render(); });
  window.addEventListener('appinstalled', () => { S.asked.install = 1; save(); if (!LESSON) render(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('새 버전이 준비됐어요. 앱을 껐다 켜면 바뀌어요'); });
      });
    }).catch(() => {});
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
