/* ================= INSTALLED APP (PWA) ================= */
let INSTALL_EVT = null;
function isStandalone() {
  try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
}
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installBanner() {
  if (!IS_PWA || isStandalone() || S.asked.install) return '';
  const ios = isIOS();
  return `<div class="banner blue mt16"><div class="grow"><b>홈 화면에 설치하면 진짜 앱처럼 써</b>
    <p>${ios ? 'Safari 아래쪽 공유 버튼 → "홈 화면에 추가" → 추가. 그다음부터는 꼭 홈 화면 아이콘으로 열어. Safari에서 연 기록과 아이콘으로 연 기록은 따로 저장돼.' : INSTALL_EVT ? '아래 버튼을 누르면 바로 설치돼.' : '브라우저 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가".'}</p>
    <div class="hstack mt12">${!ios && INSTALL_EVT ? '<button class="btn sm" data-act="install">설치하기</button>' : ''}<button class="btn sm grey" data-act="hideInstall">나중에</button></div></div></div>`;
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
function setDesc(i, n) {
  const d = DAYS[i];
  if (d.test) return n === 1 ? `${d.test === 6 ? '최종' : d.test + '주차'} 테스트` : n === 2 ? (d.talk ? '하루토랑 대화' : '발음 구별 연습') : '카드 복습 + 보지 않고 적기';
  if (d.last) return n === 1 ? '핵심 30문장' : n === 2 ? '출국 체크리스트' : '카드 복습';
  if (n === 1) return (d.s1 && d.s1.txt) || d.t;
  if (n === 2) return d.s2 && d.s2.ph ? '표현: ' + d.s2.ph.map(id => PH_BY[id].ko).join(' / ') : d.s2 && d.s2.rp ? '롤플레이' : '듣기·말하기';
  return '카드 복습 12분 + 보지 않고 적기 5분 + 틀린 것 3분';
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
      const title = `일본어 ${SET_NAME[n]} (Day ${i + 1})`;
      L.push('BEGIN:VEVENT', `UID:nihongo6-${date}-${n}@nihongo6`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Asia/Seoul:${st}`, `DTEND;TZID=Asia/Seoul:${en}`,
        icsFold('SUMMARY:' + icsEscape(title)), icsFold('DESCRIPTION:' + icsEscape(setDesc(i, n) + '\n앱에서 시작 → 20분 타이머')),
        'BEGIN:VALARM', 'ACTION:DISPLAY', icsFold('DESCRIPTION:' + icsEscape(`${SET_NAME[n]} 시간. 20분만!`)), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
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
      b.innerHTML = `<h2>캘린더 알림 파일</h2><p class="muted small">방금 받은 파일을 열고 "모두 추가"를 누르면 129개 세트 일정이 알림과 함께 들어가.</p>
        <div class="card small mt12"><b>아이폰</b><br>파일이 바로 안 열리면 공유 → "캘린더"로 열거나, 파일 앱에서 nihongo6-alarms.ics를 눌러.</div>
        <div class="card small mt8"><b>안드로이드</b><br>다운로드 알림에서 파일을 열고 Google 캘린더로 가져오기.</div>
        ${S.settings.times.join() === '10:00,16:00,22:30' ? `<a class="btn soft mt12" href="calendar.ics">기본 시간 파일로 열기</a>` : ''}
        <button class="btn mt12" data-ok>확인</button>`;
      $('[data-ok]', b).addEventListener('click', () => closeSheet());
    });
  },
  backupFile: () => { downloadFile(`nihongo6-backup-${today()}.json`, JSON.stringify(S), 'application/json'); toast('백업 파일을 저장했어'); }
});
function initPWA() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; if (S.tab === 'today' && !PAGES.length) render(); });
  window.addEventListener('appinstalled', () => { S.asked.install = 1; save(); render(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('새 버전이 준비됐어. 앱을 껐다 켜면 적용돼'); });
      });
    }).catch(() => {});
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
