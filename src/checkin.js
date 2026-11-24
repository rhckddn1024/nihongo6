/* ================= TIMER & CHECK-INS ================= */
const REASONS = [
  ['time', '시간이 없었어요'], ['tired', '피곤했어요'], ['phone', '폰을 보다가'], ['lazy', '하기 싫었어요'], ['forgot', '깜빡했어요'], ['hard', '너무 어려웠어요'], ['other', '다른 이유']
];
const PUSH = {
  time: ['20분이 안 나는 날은 드물어요. 오늘 폰 사용 시간부터 확인해 봐요.', '시간이 없었다기보다 순서에서 밀린 거예요. 다음 세트 시간을 지금 정해요.', '출발일은 그대로 1월 7일이에요. 밀리는 건 일본어뿐이에요.'],
  tired: ['피곤하면 복습만 해요. 카드는 누워서도 넘길 수 있어요.', '레슨 하나만 하고 자요. 5분이면 끝나요.', '피곤한 날엔 양을 줄이면 돼요. 0으로 만들지만 말아요.'],
  phone: ['폰을 다른 방에 두고 타이머부터 켜요.', '방금 본 영상 하나 길이면 글자 10개를 외워요.', '알림 끄고 레슨 하나만 해요. 지금요.'],
  lazy: ['딱 5분만 하고 그만둬도 돼요. 일단 레슨을 열어요.', '시작이 제일 어려워요. 첫 문제만 풀어 봐요.', '오늘 안 하면 내일 할 양이 두 배예요. 지금 하나만 해요.'],
  forgot: ['세트 시간에 알람이 없어서 그래요. 나 탭에서 캘린더 알림을 넣어요.', '폰 알람 세 개를 지금 맞춰요. 10초면 돼요.', '깜빡한 건 이번이 마지막이어야 해요.'],
  hard: ['어려운 건 내일 복습에 다시 나와요. 오늘은 절반만 해요.', '양을 반으로 줄여요. 안 하는 것보다 훨씬 나아요.', '막힌 곳을 하나만 적어 두세요. 내일 그것부터 해요.'],
  other: ['이유는 기록했어요. 이제 언제 할지 정해요.', '알겠어요. 그럼 언제 할 거예요?']
};

/* ---------- 20-minute timer for textbook reading ---------- */
const mmss = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
function runRemaining() {
  const r = S.run; if (!r) return 0;
  const now = Date.now();
  return r.dur - (now - r.start - r.pausedMs - (r.paused ? now - r.paused : 0));
}
function startRun(date, set, mins = 20) {
  S.run = {date, set, start: Date.now(), dur: mins * 60000, paused: null, pausedMs: 0};
  save(); openFocus();
}
let focusTimer = null;
function openFocus() {
  if (!S.run || PAGES.some(p => p.opt.focus)) return;
  const page = pushPage('교재 타이머', el => {
    const r = S.run; if (!r) { el.innerHTML = '<div class="empty-state">타이머가 끝났어요</div>'; return; }
    const i = dayIdx(r.date), bp = bookPart(i), C = 2 * Math.PI * 108;
    el.innerHTML = `<h1 class="large">교재 타이머</h1>
      <p class="subtitle">${fmtDate(r.date)}${bp ? ` · ${bookLabel(bp)} ${bp.from}~${bp.to}쪽` : ''}</p>
      <div class="timer"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="108" stroke="var(--fill)" stroke-width="14" fill="none"/><circle class="arc" cx="120" cy="120" r="108" stroke="${UNIT_COL[(DAYS[i] || {w: 7}).w]}" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
      <div class="tt"><b class="tl">${mmss(runRemaining())}</b><span>${r.paused ? '멈춤' : '남음'}</span></div></div>
      <div class="rate mt8"><button class="btn grey" data-pause>${r.paused ? IC.play + ' 계속' : IC.pause + ' 멈춤'}</button><button class="btn soft" data-end>끝내기</button></div>
      <p class="sf">다른 화면으로 가도 타이머는 계속 가요. 위쪽 검은 알약을 누르면 여기로 돌아와요. 끝나면 이어서 앱 레슨을 해요.</p>`;
    const arc = $('.arc', el), tl = $('.tl', el);
    const tick = () => {
      if (!S.run) return;
      const rem = runRemaining();
      tl.textContent = mmss(rem);
      arc.setAttribute('stroke-dashoffset', String(C * (1 - clamp(rem / S.run.dur, 0, 1))));
    };
    tick(); clearInterval(focusTimer); focusTimer = setInterval(tick, 500);
    $('[data-pause]', el).addEventListener('click', () => {
      const r2 = S.run; if (!r2) return;
      if (r2.paused) { r2.pausedMs += Date.now() - r2.paused; r2.paused = null; } else r2.paused = Date.now();
      save(); page.render();
    });
    $('[data-end]', el).addEventListener('click', () => finishRun(false));
  }, {focus: true});
  page.onClose = () => clearInterval(focusTimer);
}
function finishRun(byTimer) {
  const r = S.run; if (!r) return;
  S.run = null; save();
  const fp = PAGES.find(p => p.opt.focus);
  if (fp) { const idx = PAGES.indexOf(fp); while (PAGES.length > idx) popPage(); }
  if (byTimer) { haptic(60); sfx('done'); toast('20분 끝났어요. 이제 레슨으로 마무리해요'); }
  updateLive();
  if (!LESSON && setStat(r.date, r.set) !== 'done') setTimeout(() => openSetSheet(r.date, r.set), 300);
}
function updateLive() {
  let el = $('.live');
  const show = S.run && !PAGES.some(p => p.opt.focus) && !LESSON;
  if (!show) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'live'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span class="ld"></span><span>교재</span><span class="lt">${mmss(runRemaining())}</span><button data-act="openFocus">열기</button>`;
}
function globalTick() {
  if (S.run && !S.run.paused && runRemaining() <= 0) { finishRun(true); return; }
  const lt = $('.live .lt'); if (lt && S.run) lt.textContent = mmss(runRemaining());
}

/* ---------- did you do it? ---------- */
function setTimeOn(date, n) { const [hh, mm] = S.settings.times[n - 1].split(':').map(Number); const d = parseYmd(date); d.setHours(hh, mm, 0, 0); return d; }
const commitSets = c => c.sets || [c.set];
const commitDone = c => commitSets(c).every(n => setStat(c.d, n) === 'done');
function dueCheck() {
  const now = Date.now(), t = today();
  for (const c of S.commits) if (!c.done && !c.asked && c.when && now >= c.when) {
    if (commitDone(c)) { c.done = true; continue; }
    return {kind: 'commit', c};
  }
  for (const date of [addDays(t, -1), t]) {
    const i = dayIdx(date); if (i < 0 || i >= DAYS.length) continue;
    const ns = [1, 2, 3].filter(n => !setStat(date, n) && !S.asked[`c:${date}:${n}`] && now >= setTimeOn(date, n).getTime() + 30 * 60000);
    if (ns.length) return {kind: 'set', date, ns};
  }
  return null;
}
function maybeCheckIn() {
  if (LESSON || SHEET || PAGES.length || !S.asked.welcome) return;
  const c = dueCheck(); if (!c) return;
  if (c.kind === 'set') checkIn(c.date, c.ns); else commitCheck(c.c);
}
function markOutside(date, n, st, extra = {}) {
  S.sets[date] = S.sets[date] || {};
  S.sets[date][n] = Object.assign({}, S.sets[date][n] || {}, {st, at: Date.now()}, extra);
  if (st === 'done') {
    S.commits.forEach(c => { if (c.d === date && commitDone(c)) c.done = true; });
    const i = dayIdx(date);
    if (n !== 3 && i >= 0 && i < DAYS.length) unlockItems(dayItems(i).filter(id => n === 1 ? id.startsWith('k:') : !id.startsWith('k:')));
  }
}
function checkIn(date, ns) {
  const i = dayIdx(date), when = date === today() ? '오늘' : '어제';
  ns.forEach(n => { S.asked[`c:${date}:${n}`] = 1; }); save();
  const label = `세트 ${ns.join('·')}`;
  openSheet(b => {
    const stage = {v: 'ask'};
    const draw = () => {
      if (stage.v === 'ask') {
        b.innerHTML = `<h2>${label} 했어요?</h2><p class="muted small">${ns.map(n => `${when} ${S.settings.times[n - 1]} · ${esc(setInfo(i, n).name)}`).join('<br>')}</p>
          <div class="stack mt16"><button class="btn green" data-s="done">${IC.check} 다 했어요</button><button class="btn soft" data-s="part">${ns.length > 1 ? '일부만 했어요' : '반만 했어요'}</button><button class="btn grey" data-s="skip">못 했어요</button></div>`;
        $$('[data-s]', b).forEach(x => x.addEventListener('click', () => {
          const s = x.dataset.s;
          if (s === 'done') { ns.forEach(n => markOutside(date, n, 'done')); save(); closeSheet(); render(); toast('좋아요. 배운 건 복습 카드에 넣었어요'); setTimeout(maybeCheckIn, 600); return; }
          stage.v = 'why'; stage.s = s; draw();
        }));
      } else if (stage.v === 'why') {
        b.innerHTML = `<h2>왜 ${stage.s === 'part' ? (ns.length > 1 ? '일부만 했어요' : '반만 했어요') : '못 했어요'}?</h2><p class="muted small">솔직하게 골라요. 이유는 기록에 남아요.</p>
          <div class="chips mt16">${REASONS.map(r => `<button class="pill" data-r="${r[0]}">${esc(r[1])}</button>`).join('')}</div>
          <textarea class="field mt12" id="whyNote" placeholder="한 줄 더 적어도 돼요" style="min-height:70px" aria-label="메모"></textarea>`;
        $$('[data-r]', b).forEach(x => x.addEventListener('click', () => {
          const why = x.dataset.r, note = $('#whyNote', b).value.trim();
          const prev = S.log.filter(l => l.why === why).length;
          ns.forEach(n => { S.log.push({d: date, set: n, st: stage.s, why, note, at: Date.now()}); markOutside(date, n, stage.s, {why, note}); });
          save();
          stage.v = 'push'; stage.why = why; stage.prev = prev; draw();
        }));
      } else {
        const lines = PUSH[stage.why] || PUSH.other;
        const line = lines[Math.floor(Math.random() * lines.length)];
        b.innerHTML = `<h2>${esc(line)}</h2>
          ${stage.prev >= 2 ? `<div class="notice danger mt12"><b>'${esc(reasonLabel(stage.why))}'가 벌써 ${stage.prev + 1}번째예요.</b><p>같은 이유가 반복되면 그 시간대가 안 맞는 거예요. 세트 시간을 바꿔요.</p><button class="btn sm mt8" data-move>세트 시간 바꾸기</button></div>` : ''}
          <p class="sh" style="margin-left:0">그럼 언제 할 거예요?</p>
          <div class="stack"><button class="btn" data-c="now">지금 바로 레슨</button><button class="btn soft" data-c="1h">1시간 뒤</button><button class="btn soft" data-c="bed">자기 전</button><button class="btn grey" data-c="tmr">내일 보충</button></div>`;
        const mv = $('[data-move]', b); if (mv) mv.addEventListener('click', () => { closeSheet(true); S.tab = 'me'; render(); window.scrollTo(0, 0); const f = $('[data-time]'); if (f) f.scrollIntoView({block: 'center'}); });
        $$('[data-c]', b).forEach(x => x.addEventListener('click', () => {
          const c = x.dataset.c;
          if (c === 'now') { closeSheet(true); render(); startSet(date, ns[0]); return; }
          let when;
          if (c === '1h') when = Date.now() + 3600e3;
          else if (c === 'bed') { const d = setTimeOn(today(), 3); when = Math.max(d.getTime(), Date.now() + 1800e3); }
          else when = setTimeOn(addDays(today(), 1), 1).getTime() + 1800e3;
          S.commits.push({d: date, sets: ns, c, when, at: Date.now(), done: false});
          save(); closeSheet(); render();
          toast(c === 'tmr' ? '내일 다시 물어볼게요' : '약속했어요. 그 시간에 다시 물어볼게요');
        }));
      }
    };
    draw();
  }, {sticky: true});
}
function commitCheck(c) {
  const i = dayIdx(c.d), ns = commitSets(c).filter(n => setStat(c.d, n) !== 'done');
  c.asked = true; save();
  const when = c.c === '1h' ? '1시간 뒤에' : c.c === 'bed' ? '자기 전에' : '오늘';
  openSheet(b => {
    b.innerHTML = `<h2>${when} 하기로 한 세트 ${ns.join('·')} 했어요?</h2><p class="muted small">${fmtDate(c.d)} · ${ns.map(n => esc(setInfo(i, n).name)).join(', ')}</p>
      <div class="stack mt16"><button class="btn green" data-y>${IC.check} 했어요</button><button class="btn grey" data-n>아직이요</button></div>`;
    $('[data-y]', b).addEventListener('click', () => { c.done = true; ns.forEach(n => markOutside(c.d, n, 'done')); save(); closeSheet(); render(); toast('좋아요. 약속 지켰어요'); });
    $('[data-n]', b).addEventListener('click', () => {
      b.innerHTML = `<h2>또 미뤘어요.</h2><p class="muted">미룬 게 벌써 두 번째예요. 레슨 하나만 하고 끝내요. 5분이면 돼요.</p>
        <div class="stack mt16"><button class="btn" data-now>지금 할게요</button><button class="btn grey" data-tmr>내일 첫 세트 전에 할게요</button></div>`;
      $('[data-now]', b).addEventListener('click', () => { closeSheet(true); startSet(c.d, ns[0]); });
      $('[data-tmr]', b).addEventListener('click', () => { S.commits.push({d: c.d, sets: ns, c: 'tmr', when: setTimeOn(addDays(today(), 1), 1).getTime() - 30 * 60000, at: Date.now(), done: false}); save(); closeSheet(); render(); toast('내일 아침에 다시 물어볼게요'); });
    });
  }, {sticky: true});
}
