/* ================= LESSON RUNNER ================= */
const PRAISE = ['정답이에요', '좋아요', '맞았어요', '잘했어요'];
const audioBox = () => `<div class="qaudio"><button class="bigspk" data-play aria-label="다시 듣기">${IC.spk}</button><button class="slowspk" data-slow aria-label="느리게 듣기">${IC.slow}</button></div>`;
const INTRO_T = new Set(['introKana', 'introRow', 'introPh', 'introList', 'rule', 'goal', 'stageIntro', 'book', 'show']);
let LESSON = null, LTICK = null;

function runLesson(cfg) {
  if (LESSON) return;
  const items = (cfg.items || []).filter(Boolean);
  if (!items.length) { toast(cfg.empty || '지금은 풀 문제가 없어요'); return; }
  closeSheet(true); stopSpeech();
  const el = document.createElement('div');
  el.className = 'lesson'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', cfg.title || '레슨');
  el.innerHTML = `<header class="lhead"><button class="lx" aria-label="그만하기">${IC.x}</button><div class="lbar"><i></i></div><span class="ltime kbd" aria-label="걸린 시간">0:00</span></header><main class="lbody"></main><footer class="lfoot"><div class="lfb" hidden></div><div class="lbtns"></div></footer>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('in-lesson');
  LESSON = {cfg, el, body: $('.lbody', el), fb: $('.lfb', el), btns: $('.lbtns', el), bar: $('.lbar i', el), time: $('.ltime', el),
    q: items.map(x => Object.assign({}, x)), i: 0, ok: 0, scored: 0, chk: {n: 0, ok: 0, missed: []}, re: {ok: 0}, srsRes: {}, quizIds: new Set(),
    parts: {}, fastMs: [], t0: Date.now(), phase: 'ask', check: null, finished: false};
  $('.lx', el).addEventListener('click', () => LESSON && LESSON.finished ? closeLesson() : confirmQuit());
  clearInterval(LTICK);
  LTICK = setInterval(() => { if (!LESSON) return; const s = Math.floor((Date.now() - LESSON.t0) / 1000); LESSON.time.textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; }, 1000);
  updateLive();
  requestAnimationFrame(() => el.classList.add('show'));
  showEx();
}
function confirmQuit() {
  openSheet(b => {
    b.innerHTML = `<h2>그만할까요?</h2><p class="muted">지금 나가면 이번 세트는 통과로 기록되지 않아요.</p><div class="stack mt16"><button class="btn" data-k>계속하기</button><button class="btn grey" data-q style="color:var(--red)">그만하기</button></div>`;
    $('[data-k]', b).addEventListener('click', () => closeSheet());
    $('[data-q]', b).addEventListener('click', () => { closeSheet(true); closeLesson(); });
  });
}
function closeLesson() {
  if (!LESSON) return;
  const el = LESSON.el;
  recCleanup();
  LESSON = null; clearInterval(LTICK); stopSpeech();
  document.documentElement.classList.remove('in-lesson');
  el.classList.remove('show');
  setTimeout(() => el.remove(), reduceMotion() ? 0 : 260);
  const tp = topPage(); if (tp) tp.render(); else render();
  updateLive();
  setTimeout(maybeCheckIn, 700);
}
function setButtons(html) { LESSON.btns.innerHTML = html; }
function primary(label, on, fn, cls = '') {
  setButtons(`<button class="btn lgo ${cls}" ${on ? '' : 'disabled'}>${label}</button>`);
  const b = $('.lgo', LESSON.btns); b.addEventListener('click', () => { if (!b.disabled) fn(); });
  return b;
}
function stageChip(ex) {
  if (!ex.stage || ex.t === 'goal' || ex.t === 'stageIntro') return '';
  const label = ex._retest ? '재시험' : STAGES[ex.stage];
  return label ? `<p class="stage s-${ex._retest ? 'check' : ex.stage}">${label}</p>` : '';
}
function showEx() {
  const L = LESSON, ex = L.q[L.i];
  recCleanup();
  L.phase = 'ask'; L.check = null; L.shownAt = performance.now();
  L.bar.style.width = `${Math.round(L.i / L.q.length * 100)}%`;
  L.fb.hidden = true; L.fb.className = 'lfb'; L.el.classList.remove('fb-ok', 'fb-bad', 'fb-meh');
  L.body.innerHTML = ''; L.body.scrollTop = 0;
  const api = {
    ready(on) { const b = $('.lgo', L.btns); if (b) b.disabled = !on; },
    setCheck(fn) { L.check = fn; },
    check() { if (L.phase === 'ask' && L.check) resolveEx(L.check()); },
    finish(res) { resolveEx(res); }
  };
  const wrap = document.createElement('div'); wrap.className = 'lex';
  L.body.appendChild(wrap);
  const out = RENDER[ex.t](ex, wrap, api) || 'check';
  if (stageChip(ex)) wrap.insertAdjacentHTML('afterbegin', stageChip(ex));
  const kind = typeof out === 'string' ? out : out.kind;
  L.el.classList.toggle('nofoot', kind === 'auto');
  if (kind === 'intro') primary(out.label || '계속', true, nextEx);
  else if (kind === 'speak') primary('정답 보기', true, () => api.check());
  else if (kind === 'auto') setButtons('');
  else primary('확인', false, () => api.check());
}
function resolveEx(res) {
  const L = LESSON, ex = L.q[L.i];
  if (!res || L.phase !== 'ask') return;
  L.phase = 'fb';
  if (res.selfRate) {
    setButtons(`<div class="rate"><button class="btn grey" data-r="0">${IC.x} 틀렸어요</button><button class="btn green" data-r="1">${IC.check} 맞게 말했어요</button></div>`);
    $$('[data-r]', L.btns).forEach(b => b.addEventListener('click', () => { const ok = b.dataset.r === '1'; record(ex, ok); sfx(ok ? 'ok' : 'bad'); nextEx(); }));
    return;
  }
  const ms = performance.now() - L.shownAt;
  record(ex, res.ok, ms);
  const tone = res.verdict === 'o' ? 'meh' : res.ok ? 'ok' : 'bad';
  L.el.classList.add('fb-' + tone); L.el.classList.remove('nofoot');
  sfx(res.ok ? 'ok' : 'bad');
  if (!res.ok) haptic(30);
  if (res.say) speak(res.say);
  const title = res.title || (ex.unscored ? (res.ok ? '맞혔어요' : '이런 뜻이에요') : res.ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : '틀렸어요');
  const showAns = (!res.ok || ex.unscored) && res.answer;
  L.fb.innerHTML = `<span class="fic">${res.ok ? IC.check : ex.unscored ? IC.spk : IC.x}</span><div class="fbt"><b>${esc(title)}</b>${showAns ? `<p class="fans">${ex.unscored ? '' : '<span class="flab">정답</span>'}${res.answer}</p>` : ''}${res.detail ? `<p>${res.detail}</p>` : ''}${ex.fast && res.ok ? `<p>${(ms / 1000).toFixed(1)}초</p>` : ''}</div>`;
  L.fb.className = 'lfb ' + (ex.unscored ? 'meh' : tone); L.fb.hidden = false;
  if (ex.unscored) L.el.classList.replace('fb-' + tone, 'fb-meh');
  const b = primary('계속', true, nextEx, ex.unscored ? 'meh' : tone);
  if (ex.fast && res.ok) { L.autoT = setTimeout(() => { if (LESSON === L && L.phase === 'fb' && L.q[L.i] === ex) nextEx(); }, 650); }
  else b.focus({preventScroll: true});
}
function record(ex, ok, ms) {
  const L = LESSON;
  if (INTRO_T.has(ex.t) || ex.unscored) return;
  if (ex.srs) L.srsRes[ex.srs] = L.srsRes[ex.srs] === 'wrong' || !ok ? 'wrong' : 'ok';
  if (ex._retest) { if (ok) L.re.ok++; return; }
  if (ex._retry) return;
  L.scored++; if (ok) L.ok++;
  if (ex.stage === 'quiz' && ex.srs) L.quizIds.add(ex.srs);
  if (ex.stage === 'check') { L.chk.n++; if (ok) L.chk.ok++; else L.chk.missed.push(ex); }
  if (ex.part) { const p = L.parts[ex.part] || (L.parts[ex.part] = {ok: 0, n: 0}); p.n++; if (ok) p.ok++; }
  if (ex.kana) kanaStat(ex.kana, ok, ex.fast ? ms : 0);
  if (ex.fast && ms) L.fastMs.push(ms);
  const retryable = ['practice', 'review', 'listen'].includes(ex.stage) && !['dialog', 'match'].includes(ex.t);
  if (!ok && retryable && L.cfg.requeue !== false) {
    const copy = Object.assign({}, ex, {_retry: true});
    if (copy.opts) copy.opts = shuffle(copy.opts);
    delete copy.qv;
    L.q.push(copy);
  }
}
function nextEx() {
  const L = LESSON; if (!L) return;
  clearTimeout(L.autoT); stopSpeech(); recCleanup();
  L.i++;
  if (L.i >= L.q.length) { completeLesson(); return; }
  showEx();
}
const checkRate = L => L.chk.n ? (L.chk.ok + L.re.ok) / L.chk.n : 1;
function completeLesson() {
  const L = LESSON, cfg = L.cfg;
  L.bar.style.width = '100%';
  L.el.classList.remove('fb-ok', 'fb-bad', 'fb-meh', 'nofoot'); L.fb.hidden = true;
  if (cfg.mastery && L.chk.n && checkRate(L) < PASS) { showRemediate(); return; }
  L.finished = true;
  const secs = Math.round((Date.now() - L.t0) / 1000);
  const acc = L.scored ? Math.round(L.ok / L.scored * 100) : 100;
  const checkAcc = L.chk.n ? Math.round(L.chk.ok / L.chk.n * 100) : null, retested = L.re.ok > 0 || L.q.some(x => x._retest);
  const avg = L.fastMs.length ? L.fastMs.reduce((a, b) => a + b, 0) / L.fastMs.length : 0;
  const wasActive = activeOn(today());
  const r = {acc, checkAcc, retested, secs, ok: L.ok, total: L.scored, avg, parts: L.parts, xp: 0};
  if (cfg.onDone) cfg.onDone(r);
  Object.entries(L.srsRes).forEach(([id, res]) => {
    if (!S.cards[id]) return;
    if (cfg.srs || L.quizIds.has(id)) grade(id, res);
    else if (res === 'wrong') grade(id, 'wrong');
  });
  if (r.xp) addXP(r.xp);
  save();
  sfx('done');
  const fail = r.fail;
  const setRef = cfg.set && !fail ? cfg.set : null;
  const hw = setRef ? homeworkFor(setRef.date, setRef.n) : null;
  const short = cfg.target && secs < 15 * 60 && setRef;
  L.body.innerHTML = `<div class="done">
    <div class="done-art ${fail ? 'fail' : ''}">${fail ? IC.redo : IC.check}</div>
    <h1>${esc(r.title || (setRef ? '세트 통과' : '끝났어요'))}</h1>
    ${r.note ? `<p class="muted">${esc(r.note)}</p>` : retested ? '<p class="muted">틀린 걸 다시 보고 재시험으로 통과했어요. 틀린 건 내일 복습에 다시 나와요.</p>' : avg ? `<p class="muted">한 글자 평균 ${(avg / 1000).toFixed(1)}초</p>` : ''}
    <div class="dstats">
      ${checkAcc != null ? `<div><span>${retested ? '첫 시험' : '확인 테스트'}</span><b>${checkAcc}%</b></div>` : `<div><span>정확도</span><b>${acc}%</b></div>`}
      <div><span>걸린 시간</span><b>${Math.floor(secs / 60)}:${pad(secs % 60)}</b></div>
      ${r.xp ? `<div><span>얻은 XP</span><b>+${r.xp}</b></div>` : ''}
    </div>
    ${hw ? `<div class="hw"><div><b>오늘 숙제</b><p>${esc(hw.desc)}</p></div><button class="btn sm" data-hw>시트 열기</button></div>` : ''}
    ${short ? `<p class="tiny mt16">20분 중에 ${Math.ceil((20 * 60 - secs) / 60)}분이 남았어요. 남은 시간에는 숙제 시트를 쓰거나 따라 말하기를 해요.</p><button class="btn soft sm mt8" data-fill>${IC.spk} 따라 말하기</button>` : ''}
  </div>`;
  const hb = $('[data-hw]', L.body); if (hb) hb.addEventListener('click', () => openHomework(setRef.date, setRef.n));
  const fb = $('[data-fill]', L.body); if (fb) fb.addEventListener('click', () => { closeLesson(); setTimeout(() => ACT.shadowAll(), 300); });
  primary('계속', true, () => { if (!wasActive && activeOn(today())) showStreak(); else closeLesson(); });
}
function showRemediate() {
  const L = LESSON, missed = L.chk.missed.slice();
  const pct = Math.round(checkRate(L) * 100);
  L.body.innerHTML = `<div class="done">
    <div class="done-art fail">${IC.redo}</div>
    <h1>아직 통과 전이에요</h1>
    <p class="muted">확인 테스트 ${pct}%. 80%를 넘어야 통과예요.</p>
    <p class="sh" style="margin-left:0;text-align:left">틀린 것</p>
    <div class="list" style="text-align:left">${missed.map(x => `<div class="row"><span class="t"><b>${x.ansLabel || ''}</b></span></div>`).join('')}</div>
  </div>`;
  setButtons(`<div class="stack"><button class="btn" data-go>틀린 것 다시 보고 재시험</button><button class="btn grey" data-stop>오늘은 여기까지</button></div>`);
  $('[data-go]', L.btns).addEventListener('click', () => {
    const add = [];
    missed.forEach(x => { add.push({t: 'show', stage: 'practice', src: x}); const c = Object.assign({}, x, {_retest: true}); delete c.qv; if (c.opts) c.opts = shuffle(c.opts); add.push(c); });
    L.chk.missed = [];
    L.q.push(...add);
    showEx();
  });
  $('[data-stop]', L.btns).addEventListener('click', closeLesson);
}
function showStreak() {
  const L = LESSON, n = streak();
  const t = today(), wd = parseYmd(t).getDay();
  const mon = addDays(t, -((wd + 6) % 7));
  const days = Array.from({length: 7}, (_, j) => addDays(mon, j));
  L.body.innerHTML = `<div class="done streak-done">
    <div class="flame-art">${IC.flame}</div>
    <div class="snum">${n}</div>
    <h1>일 연속</h1>
    <p class="muted">${n === 1 ? '오늘부터 연속 기록이 시작돼요. 내일도 세트 하나는 통과해요.' : `${n}일째 이어지고 있어요. 세트를 하나라도 통과한 날만 기록돼요.`}</p>
    <div class="wk">${days.map(d => `<div class="${activeOn(d) ? 'on' : ''} ${d === t ? 'now' : ''}"><span>${WD[parseYmd(d).getDay()]}</span><i>${activeOn(d) ? IC.check : ''}</i></div>`).join('')}</div>
  </div>`;
  primary('계속', true, closeLesson);
}

/* ---------- voice recording ---------- */
const REC = {mr: null, stream: null, url: null, timer: null};
const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
async function recStart(onStop) {
  recCleanup();
  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  const mr = new MediaRecorder(stream), chunks = [];
  REC.stream = stream; REC.mr = mr;
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    if (chunks.length) { if (REC.url) URL.revokeObjectURL(REC.url); REC.url = URL.createObjectURL(new Blob(chunks, {type: mr.mimeType || 'audio/webm'})); }
    REC.mr = null; REC.stream = null;
    onStop && onStop(REC.url);
  };
  mr.start();
  REC.timer = setTimeout(() => recStop(), 7000);
}
function recStop() { clearTimeout(REC.timer); try { if (REC.mr && REC.mr.state !== 'inactive') REC.mr.stop(); } catch (e) {} }
function recCleanup() {
  clearTimeout(REC.timer);
  try { if (REC.mr && REC.mr.state !== 'inactive') { REC.mr.onstop = null; REC.mr.stop(); } } catch (e) {}
  if (REC.stream) REC.stream.getTracks().forEach(t => t.stop());
  if (REC.url) URL.revokeObjectURL(REC.url);
  REC.mr = null; REC.stream = null; REC.url = null;
}
function playMine() { if (!REC.url) return; stopSpeech(); const a = new Audio(REC.url); a.play().catch(() => toast('녹음을 재생하지 못했어요')); }

/* ---------- in-app kana keypad ---------- */
const KP_COLS = [['あ','い','う','え','お'],['か','き','く','け','こ'],['さ','し','す','せ','そ'],['た','ち','つ','て','と'],['な','に','ぬ','ね','の'],['は','ひ','ふ','へ','ほ'],['ま','み','む','め','も'],['や','','ゆ','','よ'],['ら','り','る','れ','ろ'],['わ','を','ん','ー','']];
const DAKU_ON = {'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ','た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ','う':'ゔ'};
const HANDAKU_ON = {'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ'};
const SMALL_ON = {'あ':'ぁ','い':'ぃ','う':'ぅ','え':'ぇ','お':'ぉ','や':'ゃ','ゆ':'ゅ','よ':'ょ','つ':'っ','わ':'ゎ'};
const hiraToKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const invert = o => Object.fromEntries(Object.entries(o).map(([a, b]) => [b, a]));
const DAKU_OFF = invert(DAKU_ON), HANDAKU_OFF = invert(HANDAKU_ON), SMALL_OFF = invert(SMALL_ON);
function kpModify(val, kind) {
  if (!val) return val;
  const last = val.slice(-1), kata = isKata(last) && last !== 'ー', h = kataToHira(last);
  let out = h;
  if (kind === 'daku') out = DAKU_ON[h] || DAKU_OFF[h] || (HANDAKU_OFF[h] ? DAKU_ON[HANDAKU_OFF[h]] : h);
  if (kind === 'handaku') out = HANDAKU_ON[h] || HANDAKU_OFF[h] || (DAKU_OFF[h] && HANDAKU_ON[DAKU_OFF[h]]) || h;
  if (kind === 'small') out = SMALL_ON[h] || SMALL_OFF[h] || h;
  return val.slice(0, -1) + (kata ? hiraToKata(out) : out);
}
function keypad(host, opt) {
  const st = {v: '', kata: !!opt.kata};
  const draw = () => {
    const cells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) { const ch = KP_COLS[c][r]; cells.push(ch ? `<button class="kk" data-k="${ch}" lang="ja">${st.kata ? hiraToKata(ch) : ch}</button>` : '<span class="kk empty"></span>'); }
    host.innerHTML = `<div class="kline" aria-live="polite" lang="ja">${esc(st.v)}<i class="caret"></i></div>
      <div class="kpad" role="group" aria-label="가나 자판">${cells.join('')}</div>
      <div class="kmods"><button data-m="daku" aria-label="탁점">゛</button><button data-m="handaku" aria-label="반탁점">゜</button><button data-m="small" aria-label="작은 글자">小</button><button data-m="mode" class="${st.kata ? 'on' : ''}" aria-label="히라가나와 가타카나 바꾸기">${st.kata ? 'カナ' : 'かな'}</button><button data-m="del" aria-label="지우기">⌫</button></div>`;
    $$('.kk[data-k]', host).forEach(b => b.addEventListener('click', () => { if (opt.locked()) return; st.v += st.kata ? hiraToKata(b.dataset.k) : b.dataset.k; haptic(5); upd(); }));
    $$('[data-m]', host).forEach(b => b.addEventListener('click', () => {
      if (opt.locked()) return;
      const m = b.dataset.m;
      if (m === 'del') st.v = st.v.slice(0, -1);
      else if (m === 'mode') { st.kata = !st.kata; draw(); return; }
      else st.v = kpModify(st.v, m);
      upd();
    }));
  };
  const upd = () => { $('.kline', host).innerHTML = `${esc(st.v)}<i class="caret"></i>`; opt.onChange(st.v); };
  draw();
  return {get value() { return st.v; }, lock() { host.classList.add('locked'); }};
}

/* ---------- handwriting: stroke-by-stroke check against KanjiVG ---------- */
const DRAW_N = 24;
function samplePath(svg, d, n = DRAW_N) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d); svg.appendChild(p);
  const len = p.getTotalLength(), pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength(len * i / (n - 1)); pts.push([q.x, q.y]); }
  p.remove();
  return {pts, len};
}
function resample(pts, n = DRAW_N) {
  if (pts.length < 2) return Array.from({length: n}, () => pts[0] || [0, 0]);
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = seg[seg.length - 1] || 1, out = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const t = total * i / (n - 1);
    while (j < seg.length - 1 && seg[j] < t) j++;
    const a = pts[j - 1], b = pts[j], span = seg[j] - seg[j - 1] || 1, f = Math.min(1, Math.max(0, (t - seg[j - 1]) / span));
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}
const meanDist = (a, b) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / a.length;
function strokeOk(user, tpl) {
  const u = resample(user), fwd = meanDist(u, tpl.pts), back = meanDist(u.slice().reverse(), tpl.pts);
  const tol = tpl.len < 20 ? 14 : 18;
  return fwd < tol && fwd <= back + 1.5 && Math.hypot(u[0][0] - tpl.pts[0][0], u[0][1] - tpl.pts[0][1]) < 26;
}

/* ---------- speech recognition (Chrome on Android uses Google's recognizer) ---------- */
const SRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const normJa = x => kataToHira(String(x)).replace(/[\s、。，．,.!?！？・「」〜~_ー]/g, '');
function levRatio(a, b) {
  if (!a.length || !b.length) return 0;
  const d = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}
let SR_ON = null;
function listenJa(onDone) {
  if (SR_ON) { try { SR_ON.abort(); } catch (e) {} }
  const r = new SRec(); SR_ON = r;
  r.lang = 'ja-JP'; r.interimResults = false; r.maxAlternatives = 5;
  let got = false;
  r.onresult = e => { got = true; onDone({alts: [...e.results[0]].map(a => a.transcript)}); };
  r.onerror = e => { got = true; onDone({error: e.error}); };
  r.onend = () => { SR_ON = null; if (!got) onDone({error: 'no-speech'}); };
  r.start();
}

/* ---------- renderers ---------- */
function wireAudio(body, text, opt = {}) {
  const play = $('[data-play]', body), slow = $('[data-slow]', body);
  if (play) play.addEventListener('click', () => speak(text, opt));
  if (slow) slow.addEventListener('click', () => speak(text, Object.assign({}, opt, {rate: .6, vary: false})));
  $$('[data-say]', body).forEach(b => b.addEventListener('click', () => speak(b.dataset.say, {male: b.dataset.male === '1'})));
}
const autoPlay = (ex, text, opt) => setTimeout(() => { if (LESSON && LESSON.q[LESSON.i] === ex && LESSON.phase === 'ask') speak(text, opt); }, 320);
function strokeSVG(k, cls = '') {
  const s = STROKES[k]; if (!s) return '';
  const starts = s.map(d => { const m = d.match(/^M\s*([\d.]+)[ ,]+([\d.]+)/); return m ? [+m[1], +m[2]] : [0, 0]; });
  return `<svg class="strokes ${cls}" viewBox="0 0 109 109" aria-hidden="true"><g class="guide"><path d="M54.5 4v101M4 54.5h101"/></g><g class="paths">${s.map((d, j) => `<path d="${d}" style="--i:${j}"/>`).join('')}</g><g class="nums">${starts.map(([x, y], j) => `<text x="${Math.max(6, x - 7)}" y="${Math.max(10, y - 2)}">${j + 1}</text>`).join('')}</g></svg>`;
}
const RENDER = {
  stageIntro(ex, body) {
    body.innerHTML = `<div class="stagecard s-${ex.stage}"><p class="stage s-${ex.stage}">${STAGES[ex.stage] || ''}</p><h2>${esc(ex.title)}</h2><p>${esc(ex.text)}</p></div>`;
    return {kind: 'intro', label: '시작'};
  },
  goal(ex, body) {
    const stages = uniq(LESSON.q.map(x => x.stage).filter(s => s && s !== 'goal'));
    body.innerHTML = `<p class="stage s-goal">오늘 목표</p><h2 class="lp">${esc(ex.meta)}</h2>
      <p class="tiny" style="margin:-6px 0 14px">끝나면 이렇게 할 수 있어요</p>
      <ul class="goals">${ex.lines.map(l => `<li>${IC.check}<span>${l}</span></li>`).join('')}</ul>
      <p class="sh" style="margin-left:0">순서</p><div class="chips">${stages.map(s => `<span class="pill">${STAGES[s]}</span>`).join('')}</div>
      ${LESSON.cfg.target ? `<p class="tiny mt16">목표 시간은 ${LESSON.cfg.target}분이에요. 위쪽에 걸린 시간이 보여요.</p>` : ''}`;
    return {kind: 'intro', label: '시작'};
  },
  book(ex, body) {
    const bp = ex.bp, C = 2 * Math.PI * 40;
    body.innerHTML = `<h2 class="lp">${esc(bookLabel(bp))} ${bp.from}~${bp.to}쪽</h2>
      <ol class="steps">${bp.ch ? '<li>본문을 한 번 소리 내서 읽어요</li><li>모르는 단어에 표시해요</li><li>연습 문제를 풀고 답을 맞춰요</li>' : '<li>오늘 배울 글자 부분을 찾아요</li><li>모양과 발음 설명만 훑어봐요</li>'}</ol>
      <div class="bookt"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" stroke="var(--fill)" stroke-width="8" fill="none"/><circle class="arc" cx="50" cy="50" r="40" stroke="var(--orange)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 50 50)"/></svg><b class="kbd">${ex.mins}:00</b></div>
      <p class="tiny center">${ex.mins}분 정도가 기준이에요. 다 하면 아래 버튼을 눌러요.</p>`;
    const t0 = Date.now(), dur = ex.mins * 60000, arc = $('.arc', body), tl = $('.bookt b', body);
    const tick = () => {
      if (!LESSON || LESSON.q[LESSON.i] !== ex) { clearInterval(iv); return; }
      const left = Math.max(0, dur - (Date.now() - t0)), s = Math.ceil(left / 1000);
      tl.textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
      arc.setAttribute('stroke-dashoffset', String(C * (left / dur)));
      if (!left) { clearInterval(iv); sfx('done'); haptic(40); }
    };
    const iv = setInterval(tick, 500);
    return {kind: 'intro', label: '다 했어요'};
  },
  lecture(ex, body) {
    const l = ex.lec;
    const src = `https://www.youtube-nocookie.com/embed/${l.v}?start=${l.from}&end=${l.to}&rel=0&playsinline=1`;
    body.innerHTML = `<h2 class="lp">미미센세 ${l.n}강, ${esc(LECTURE_TOPIC[l.n])}</h2>
      <p class="tiny" style="margin:-6px 0 12px">${tsOf(l.from)}부터 ${tsOf(l.to)}까지 ${l.mins}분이에요. ${esc(bookLabel(ex.bp))}을 펴 놓고 봐요. 화면이 안 나오면 유튜브에서 봐도 돼요.</p>
      <div class="lec"><iframe src="${src}" title="미미센세 ${l.n}강" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <div class="cmpbtns mt12"><a class="btn soft sm" href="https://www.youtube.com/watch?v=${l.v}&amp;t=${l.from}s" target="_blank" rel="noopener">${IC.play} 유튜브에서 보기</a><button class="btn grey sm" data-bookinstead>교재로 할게요</button></div>
      <ol class="steps mt16"><li>선생님이 읽을 때 같이 소리 내서 읽어요</li><li>책에 없는 설명은 교재 여백에 적어요</li><li>${tsOf(l.to)}에서 멈추고 아래 버튼을 눌러요</li></ol>`;
    $('[data-bookinstead]', body).addEventListener('click', () => { LESSON.q[LESSON.i] = exBook(ex.bp, 10); showEx(); });
    return {kind: 'intro', label: '다 봤어요'};
  },
  draw(ex, body, api) {
    const k = ex.k, info = KANA_INFO[k], paths = STROKES[k];
    body.innerHTML = `<h2 class="lp">${ex.recall ? `소리를 듣고 ${isKata(k) ? '가타카나' : '히라가나'}로 써요` : '획순대로 따라 써요'}</h2>
      <div class="dq">${ex.recall ? '' : `<span class="dqk" lang="ja">${k}</span>`}<span class="dqh">${esc(info.hg)}</span><button class="spk" data-say="${k}" aria-label="듣기">${IC.spk}</button></div>
      <div class="dpad"><svg viewBox="0 0 109 109" class="dsvg" role="img" aria-label="글자를 쓰는 칸"><g class="guide"><path d="M54.5 3v103M3 54.5h103"/></g>${ex.recall ? '' : `<g class="model">${paths.map(d => `<path d="${d}"/>`).join('')}</g>`}<g class="dok"></g><g class="hint"></g><polyline class="ink" points=""/></svg></div>
      <div class="dbar"><span class="dcount">1 / ${paths.length}획</span><button class="btn grey sm" data-giveup>${ex.recall ? '모르겠어요' : '다음 획 보기'}</button></div>`;
    wireAudio(body);
    if (ex.recall) autoPlay(ex, k);
    const svg = $('.dsvg', body), ink = $('.ink', svg), doneG = $('.dok', svg), hintG = $('.hint', svg), cnt = $('.dcount', body);
    const tpls = paths.map(d => samplePath(svg, d));
    let j = 0, miss = 0, missHere = 0, cur = null, finished = false;
    const toLocal = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109]; };
    const hint = i => { hintG.innerHTML = `<path d="${paths[i]}"/><circle cx="${tpls[i].pts[0][0].toFixed(1)}" cy="${tpls[i].pts[0][1].toFixed(1)}" r="3.4"/>`; };
    const end = gaveUp => {
      finished = true; hintG.innerHTML = '';
      const ok = !gaveUp && miss <= (ex.recall ? 1 : 2);
      setTimeout(() => api.finish({ok, verdict: miss === 0 ? 'g' : ok ? 'o' : 'b', title: gaveUp ? '이렇게 써요' : miss === 0 ? '획순까지 맞게 썼어요' : ok ? `${miss}번 다시 썼어요` : '아직 손에 덜 익었어요', answer: ex.ansLabel, detail: ex.fb, say: k}), 300);
    };
    const advance = () => {
      doneG.insertAdjacentHTML('beforeend', `<path d="${paths[j]}"/>`);
      j++; missHere = 0; hintG.innerHTML = '';
      if (j >= paths.length) end(false); else cnt.textContent = `${j + 1} / ${paths.length}획`;
    };
    svg.addEventListener('pointerdown', e => { if (finished || LESSON.phase !== 'ask') return; e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (x) {} cur = [toLocal(e)]; });
    svg.addEventListener('pointermove', e => { if (!cur) return; cur.push(toLocal(e)); ink.setAttribute('points', cur.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')); });
    svg.addEventListener('pointerup', () => {
      if (!cur) return;
      const pts = cur; cur = null; ink.setAttribute('points', '');
      if (strokeOk(pts, tpls[j])) { haptic(8); advance(); return; }
      miss++; missHere++; sfx('bad'); haptic(25); hint(j);
      if (missHere >= 3) setTimeout(advance, 500);
    });
    svg.addEventListener('pointercancel', () => { cur = null; ink.setAttribute('points', ''); });
    $('[data-giveup]', body).addEventListener('click', () => {
      if (finished) return;
      if (!ex.recall) { hint(j); return; }
      doneG.innerHTML = paths.map(d => `<path d="${d}"/>`).join('');
      end(true);
    });
    return 'auto';
  },
  introKana(ex, body) {
    const k = KANA_INFO[ex.k];
    body.innerHTML = `<p class="newtag">새 글자</p>
      <div class="kintro"><button class="kcard" data-say="${k.k}" aria-label="${esc(k.hg)} 듣기"><span class="kbig" lang="ja">${k.k}</span><span class="khg">${esc(k.hg)}</span></button>
      ${STROKES[k.k] ? `<button class="kstroke" data-draw aria-label="획순 다시 보기">${strokeSVG(k.k, 'anim')}<small>획순</small></button>` : ''}</div>
      ${k.mn ? `<p class="kmn">${esc(k.mn)}</p>` : ''}
      <p class="lhint">글자를 누르면 다시 들려요. 획순을 보고 손가락으로 한 번 따라 써 봐요.</p>`;
    wireAudio(body);
    const dr = $('[data-draw]', body);
    if (dr) dr.addEventListener('click', () => { const svg = $('svg', dr); svg.classList.remove('anim'); void svg.offsetWidth; svg.classList.add('anim'); });
    autoPlay(ex, k.k);
    return 'intro';
  },
  introRow(ex, body) {
    const kata = ex.kana.every(isKata);
    body.innerHTML = `<p class="newtag">새 글자</p><h2 class="lp">${kata ? '히라가나와 짝지어 외워요' : '눌러서 소리를 들어 봐요'}</h2>
      <div class="krow ${ex.kana.length > 5 ? 'k3' : ''}">${ex.kana.map(k => { const i = KANA_INFO[k]; return `<button class="kt" data-say="${k}"><span lang="ja">${k}</span><b>${esc(i.hg)}</b>${kata ? `<small lang="ja">${kataToHira(k)}</small>` : ''}</button>`; }).join('')}</div>
      ${kata ? `<div class="mnlist">${ex.kana.filter(k => KANA_INFO[k].mn).map(k => `<p><span lang="ja">${k}</span>${STROKES[k] ? strokeSVG(k, 'mini') : ''} ${esc(KANA_INFO[k].mn)}</p>`).join('')}</div>` : ''}`;
    wireAudio(body);
    return 'intro';
  },
  introPh(ex, body) {
    const p = PH_BY[ex.id];
    body.innerHTML = `<p class="newtag">${p.w === 'staff' ? '들을 말' : '새 표현'}</p>
      <div class="phcard">
        <button class="spk lg" data-say="${esc(p.k)}" aria-label="듣기">${IC.spk}</button>
        <div class="pjp" lang="ja">${esc(clean(p.k))}</div>
        ${hgLine(p.k, 'tap')}
        <div class="pko">${esc(p.ko)}</div>
        ${p.c ? `<div class="pcas"><span class="tag cas">친구끼리</span><span lang="ja">${esc(p.c)}</span>${p.cn ? `<small>${esc(p.cn)}</small>` : ''}<button class="spk sm" data-say="${esc(p.cr || p.c)}" data-male="1" aria-label="친구 말투 듣기">${IC.spk}</button></div>` : ''}
        ${p.n ? `<p class="pnote">${esc(p.n)}</p>` : ''}
      </div>
      <p class="lhint">${p.w === 'staff' ? '점원이나 안내 방송에서 듣게 되는 말이에요. 알아듣기만 하면 돼요.' : '소리를 한 번 더 듣고 그대로 따라 말해 봐요'}</p>`;
    wireAudio(body);
    return 'intro';
  },
  introList(ex, body) {
    body.innerHTML = `<p class="newtag">새 단어</p><h2 class="lp">${esc(ex.title)}</h2><div class="list">${ex.rows.map(s => `<div class="ph"><span class="sgn" lang="ja">${s[0]}</span><div class="tx"><span class="ko" style="color:var(--label)">${esc(s[2])}</span><span class="hg" lang="ja">${s[1]}</span></div><button class="spk" data-say="${s[1]}" aria-label="듣기">${IC.spk}</button></div>`).join('')}</div>`;
    wireAudio(body);
    return 'intro';
  },
  rule(ex, body) {
    body.innerHTML = `<h2 class="lp">${esc(ex.title)}</h2><p class="rtext">${esc(ex.text)}</p>
      <div class="rex">${ex.ex.map(([j, k]) => `<button class="rx" data-say="${esc(j)}"><span lang="ja">${esc(clean(j))}</span><small>${toHangul(j) === k ? esc(k) : `${esc(toHangul(j))}<br>${esc(k)}`}</small>${IC.spk}</button>`).join('')}</div>`;
    wireAudio(body);
    return 'intro';
  },
  show(ex, body) {
    const x = ex.src;
    body.innerHTML = `<h2 class="lp">다시 보고 가요</h2><div class="showcard">${x.q || (x.audio ? `<p class="tiny">들은 소리</p>` : '')}<p class="fans">${x.ansLabel || ''}</p>${x.fb ? `<p class="tiny">${x.fb}</p>` : ''}${x.say || x.audio ? `<button class="btn soft sm" data-say="${esc(x.say || x.audio)}">${IC.spk} 듣기</button>` : ''}</div><p class="lhint">바로 다음에 같은 문제가 다시 나와요</p>`;
    wireAudio(body);
    if (x.say || x.audio) autoPlay(ex, x.say || x.audio);
    return 'intro';
  },
  choice(ex, body, api) {
    const head = ex.q ? `<div class="lq">${ex.q}${ex.audio && ex.inline ? `<button class="spk" data-play aria-label="듣기">${IC.spk}</button>` : ''}</div>` : `<div class="lq">${audioBox()}</div>`;
    body.innerHTML = `<h2 class="lp">${esc(ex.prompt)}</h2>${head}<div class="opts ${ex.grid ? 'grid' : ''} ${ex.opts.length === 2 ? 'two' : ''}">${ex.opts.map((o, j) => `<button class="opt" data-j="${j}"><span class="oi">${j + 1}</span><span class="ot">${o.h}</span></button>`).join('')}</div>`;
    if (ex.audio) { wireAudio(body, ex.audio, {vary: ex.vary}); autoPlay(ex, ex.audio, {vary: ex.vary}); }
    let picked = -1;
    const btns = $$('.opt', body);
    const evaluate = () => {
      const o = ex.opts[picked], ok = o.v === ex.ans;
      btns.forEach((b, k) => { b.disabled = true; if (ex.opts[k].v === ex.ans) b.classList.add('right'); });
      if (!ok) btns[picked].classList.add('wrong');
      return {ok, answer: ex.ansLabel, detail: ok ? (ex.reveal ? ex.ansLabel : '') : ex.fb || '', say: ex.say};
    };
    btns.forEach((b, j) => b.addEventListener('click', () => {
      if (LESSON.phase !== 'ask') return;
      picked = j;
      btns.forEach(x => x.classList.toggle('sel', x === b));
      api.setCheck(evaluate);
      if (ex.fast) { api.check(); return; }
      api.ready(true);
    }));
    return ex.fast ? 'auto' : 'check';
  },
  type(ex, body, api) {
    const head = ex.q ? `<div class="lq">${ex.q}</div>` : `<div class="lq">${audioBox()}${ex.hint ? `<p class="qsub">${esc(ex.hint)}</p>` : ''}</div>`;
    body.innerHTML = `<h2 class="lp">${esc(ex.prompt)}</h2>${head}${ex.mode === 'hangul' ? `<input class="field tin" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="한글 읽기">` : '<div class="kp"></div>'}`;
    if (ex.audio) { wireAudio(body, ex.audio, {vary: ex.vary}); autoPlay(ex, ex.audio, {vary: ex.vary}); }
    let val = '';
    if (ex.mode === 'hangul') {
      const inp = $('.tin', body);
      inp.addEventListener('input', () => { val = inp.value; api.ready(val.trim() !== ''); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); api.check(); } });
      setTimeout(() => { try { inp.focus({preventScroll: true}); } catch (e) {} }, 350);
      api.setCheck(() => {
        inp.disabled = true; inp.blur();
        const a = normHg(val), ok = a === normHg(ex.ans) || (ex.alt || []).some(x => a.toLowerCase() === String(x).toLowerCase());
        return {ok, answer: ex.ansLabel, detail: ok ? '' : ex.fb || '', say: ex.say};
      });
      return 'check';
    }
    const kp = keypad($('.kp', body), {kata: ex.kata, locked: () => LESSON.phase !== 'ask', onChange: v => { val = v; api.ready(v.length > 0); }});
    api.setCheck(() => {
      kp.lock();
      const want = normKana(ex.ans), got = normKana(val);
      const ok = got === want;
      let detail = '';
      if (ok && hasKata(clean(ex.ans)) !== hasKata(val)) detail = hasKata(clean(ex.ans)) ? '맞아요. 이 말은 원래 가타카나로 써요.' : '맞아요. 이 말은 원래 히라가나로 써요.';
      else if (!ok && /_[はをへ]/.test(ex.ans) && got === particleSlip(ex.ans)) detail = '조사 は, を, へ는 소리는 와, 오, 에지만 쓸 때는 は, を, へ로 써요.';
      else if (!ok) detail = ex.fb || '';
      return {ok, answer: ex.ansLabel, detail, say: ex.say};
    });
    return 'check';
  },
  tiles(ex, body, api) {
    const words = tileWords(ex.k);
    const extra = pick(uniq([...PH.filter(x => x.w !== 'staff').flatMap(x => tileWords(x.k)), ...Object.values(GRAMMAR).flatMap(g => g.dr.flatMap(d => tileWords(d.k)))]).filter(w => !words.includes(w) && w.length <= 6), 2);
    const bank = shuffle([...words, ...extra]);
    const line = [];
    body.innerHTML = `<h2 class="lp">일본어로 만들어요</h2><div class="lq"><div class="qko">${esc(ex.ko)}</div></div><div class="tline" aria-label="내 답"></div><div class="tbank"></div>`;
    const tl = $('.tline', body), tb = $('.tbank', body);
    const draw = () => {
      tl.innerHTML = line.map((j, pos) => `<button class="tile" data-pos="${pos}" lang="ja">${esc(bank[j])}</button>`).join('');
      tb.innerHTML = bank.map((w, j) => `<button class="tile ${line.includes(j) ? 'used' : ''}" data-j="${j}" lang="ja" ${line.includes(j) ? 'disabled aria-hidden="true"' : ''}>${esc(w)}</button>`).join('');
      $$('[data-pos]', tl).forEach(b => b.addEventListener('click', () => { if (LESSON.phase !== 'ask') return; line.splice(+b.dataset.pos, 1); draw(); }));
      $$('[data-j]', tb).forEach(b => b.addEventListener('click', () => { if (LESSON.phase !== 'ask') return; line.push(+b.dataset.j); draw(); }));
      api.ready(line.length > 0);
    };
    draw();
    api.setCheck(() => {
      const ok = line.map(j => bank[j]).join('') === words.join('');
      $$('.tile', body).forEach(b => b.disabled = true);
      tl.classList.add(ok ? 'right' : 'wrong');
      return {ok, answer: jaSpan(clean(ex.k)), detail: esc(toHangul(ex.k)), say: ex.k};
    });
  },
  speak(ex, body, api) {
    const p = ex.id ? PH_BY[ex.id] : null, c = ex.c;
    const ko = p ? p.ko : c.ko, jp = p ? clean(p.k) : c.jp, read = p ? p.k : (c.kana || c.jp);
    const rec = canRecord();
    body.innerHTML = `<h2 class="lp">소리 내서 말해 봐요</h2><div class="lq"><div class="qko">${esc(ko)}</div></div>
      ${rec ? `<div class="recbox"><button class="mic" data-rec aria-label="녹음">${IC.mic}</button><span class="recst tiny">녹음 버튼을 누르고 말한 다음 다시 눌러요</span></div>` : '<p class="lhint">입으로 다 말한 다음 정답을 확인해요</p>'}
      ${SRec ? `<div class="srbox"><button class="btn soft sm" data-sr>${IC.ear} 알아듣는지 확인</button><p class="srout tiny" aria-live="polite"></p></div>` : ''}
      <div class="reveal" hidden><div class="phcard"><div class="pjp" lang="ja">${esc(jp)}</div><span class="hg">${esc(toHangul(read))}</span>${p && p.c ? `<div class="pcas"><span class="tag cas">친구끼리</span><span lang="ja">${esc(p.c)}</span></div>` : ''}
        <div class="cmpbtns"><button class="btn soft sm" data-say="${esc(read)}">${IC.spk} 원래 발음</button>${rec ? `<button class="btn grey sm" data-mine hidden>${IC.play} 내 목소리</button>` : ''}</div></div>
        <p class="lhint" data-cmp></p></div>`;
    wireAudio(body);
    const mic = $('[data-rec]', body), stEl = $('.recst', body), mine = $('[data-mine]', body);
    if (mic) mic.addEventListener('click', async () => {
      if (REC.mr) { recStop(); return; }
      try {
        stopSpeech();
        await recStart(url => { mic.classList.remove('on'); stEl.textContent = url ? '녹음했어요. 정답을 보고 비교해 봐요' : '녹음이 비었어요. 다시 해 봐요'; if (mine) mine.hidden = !url; });
        mic.classList.add('on'); stEl.textContent = '녹음 중이에요. 다 말했으면 다시 눌러요';
      } catch (e) { stEl.textContent = '마이크를 쓸 수 없어요. 소리 내서 말한 다음 정답을 봐요'; mic.disabled = true; }
    });
    if (mine) mine.addEventListener('click', playMine);
    const srb = $('[data-sr]', body), sro = $('.srout', body);
    if (srb) srb.addEventListener('click', () => {
      if (REC.mr) recStop();
      stopSpeech(); srb.disabled = true; sro.textContent = '듣고 있어요. 일본어로 말해 봐요';
      listenJa(res => {
        srb.disabled = false;
        if (res.error) { sro.textContent = res.error === 'not-allowed' || res.error === 'service-not-allowed' ? '마이크 권한이 필요해요' : res.error === 'no-speech' ? '소리가 안 들렸어요. 다시 해 봐요' : '지금은 음성 인식을 쓸 수 없어요'; return; }
        const target = normJa(clean(read)), best = Math.max(...res.alts.map(a => levRatio(normJa(a), target)));
        sro.innerHTML = `이렇게 들렸어요: <b lang="ja">${esc(res.alts[0])}</b><br>${best >= .85 ? '목표 문장과 거의 똑같이 들렸어요' : best >= .6 ? '비슷해요. 정답을 보고 다른 곳을 찾아봐요' : '다르게 들렸어요. 한자로 바뀌어 나왔다면 맞았을 수도 있어요'}`;
      });
    });
    api.setCheck(() => { recStop(); $('[data-cmp]', body).textContent = REC.url ? '두 소리를 번갈아 들어 보고, 맞게 말했는지 골라요' : '원래 발음을 듣고, 내가 말한 소리와 같았는지 골라요'; $('.reveal', body).hidden = false; const rb = $('.recbox', body); if (rb) rb.hidden = true; setTimeout(() => speak(read), 200); return {selfRate: true}; });
    return 'speak';
  },
  num(ex, body, api) {
    const q = ex.qv || (ex.qv = NUM_LEVELS[ex.lv].gen());
    body.innerHTML = `<h2 class="lp">${q.time ? '몇 시예요?' : /円/.test(q.show) ? '얼마예요?' : '들은 숫자를 적어요'}</h2><div class="lq">${audioBox()}</div>
      <input class="field numin" inputmode="${q.time ? 'text' : 'numeric'}" autocomplete="off" enterkeyhint="done" aria-label="들은 답">
      <p class="lhint">${q.time ? '들은 시각을 7:30처럼 적어요' : '숫자만 적으면 돼요'}</p>`;
    wireAudio(body, q.k, {vary: true});
    autoPlay(ex, q.k, {vary: true});
    const inp = $('.numin', body);
    inp.addEventListener('input', () => api.ready(inp.value.trim() !== ''));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); api.check(); } });
    setTimeout(() => { try { inp.focus({preventScroll: true}); } catch (e) {} }, 350);
    api.setCheck(() => {
      const raw = inp.value.trim(); let ok;
      if (q.time) {
        const d = raw.replace(/[^\d:]/g, ' ').trim(); let h, m;
        if (d.includes(':')) [h, m] = d.split(':').map(x => parseInt(x || '0', 10));
        else { const g = d.replace(/\s/g, ''); if (g.length <= 2) { h = +g; m = 0; } else { h = +g.slice(0, -2); m = +g.slice(-2); } }
        const [qh, qm] = q.v.split(':').map(Number); ok = h === qh && (m || 0) === qm;
      } else ok = raw.replace(/\D/g, '') === q.v;
      inp.disabled = true; inp.blur();
      const tip = q.time ? ([4, 7, 9].includes(+q.v.split(':')[0]) ? '4시 よじ, 7시 しちじ, 9시 くじ는 따로 외워 둬요' : '') : /びゃく|ぴゃく|ぜん|っせん/.test(q.k) ? '300, 600, 800, 3000, 8000은 소리가 바뀌어요' : '';
      return {ok, answer: `${esc(q.show)} · ${jaSpan(q.k)}`, detail: ok ? jaSpan(q.k) : tip};
    });
  },
  dialog(ex, body, api) {
    const s = ex.s, chat = ex.who === 'haruto';
    const line = chat ? s.h : s.s, read = chat ? (s.hk || s.h) : s.s;
    const av = chat ? harutoAvatar(40) : `<span class="avatar staff">${IC.me}</span>`;
    body.innerHTML = `${ex.scene ? `<p class="newtag">${esc(ex.scene)}</p>` : ''}
      ${s.sys ? `<p class="dnote">${esc(s.sys)}</p>` : ''}
      ${line ? `<div class="drow">${av}<button class="bub them" data-tr><span lang="ja">${esc(line)}</span><span class="tr" hidden>${esc(s.ko)}</span></button></div><p class="lhint">못 알아들었으면 말풍선을 눌러 뜻을 봐요</p>` : `<div class="dnarr">${esc(s.ko)}</div>`}
      <h2 class="lp">${line ? '뭐라고 대답할까요?' : '뭐라고 말할까요?'}</h2>
      <div class="opts">${s.o.map((o, j) => `<button class="opt" data-j="${j}"><span class="oi">${j + 1}</span><span class="ot"><span lang="ja">${esc(o[0])}</span>${o[1] ? `<small>${esc(o[1])}</small>` : ''}</span></button>`).join('')}</div>`;
    const tr = $('[data-tr]', body);
    if (tr) tr.addEventListener('click', () => { const t = $('.tr', tr); t.hidden = !t.hidden; speak(read, {male: chat}); });
    if (line) autoPlay(ex, read, {male: chat});
    let picked = -1;
    const btns = $$('.opt', body);
    btns.forEach((b, j) => b.addEventListener('click', () => { if (LESSON.phase !== 'ask') return; picked = j; btns.forEach(x => x.classList.toggle('sel', x === b)); api.ready(true); }));
    api.setCheck(() => {
      const o = s.o[picked], v = o[2];
      btns.forEach((b, k) => { b.disabled = true; if (s.o[k][2] === 'g') b.classList.add('right'); });
      if (v !== 'g') btns[picked].classList.add(v === 'o' ? 'meh' : 'wrong');
      if (tr) $('.tr', tr).hidden = false;
      return {ok: v !== 'b', verdict: v, title: v === 'g' ? '자연스러워요' : v === 'o' ? '통하긴 해요' : '어색해요', detail: esc(o[3]), say: o[0].startsWith('(') ? null : o[0]};
    });
  },
  match(ex, body, api) {
    const left = shuffle(ex.pairs), right = shuffle(ex.pairs);
    body.innerHTML = `<h2 class="lp">${ex.sound ? '소리와 글자를 짝지어요' : '짝을 맞춰요'}</h2><div class="match ${ex.wide ? 'wide' : ''}"><div class="mcol">${left.map(p => `<button class="mt ${ex.sound ? 'snd' : ''}" data-side="a" data-k="${esc(p.key)}">${ex.sound ? IC.spk : p.a}</button>`).join('')}</div><div class="mcol">${right.map(p => `<button class="mt" data-side="b" data-k="${esc(p.key)}">${p.b}</button>`).join('')}</div></div>
      ${ex.sound ? '<p class="lhint">왼쪽을 누르면 소리가 나요. 맞는 글자를 오른쪽에서 골라요</p>' : ''}`;
    let selA = null, selB = null, errors = 0, done = 0;
    const tryPair = () => {
      if (!selA || !selB) return;
      const a = selA, b = selB; selA = selB = null;
      if (a.dataset.k === b.dataset.k) {
        [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; });
        done++; const p = ex.pairs.find(x => x.key === a.dataset.k);
        if (p && p.say && !ex.sound) speak(p.say, {rate: 1});
        if (done === ex.pairs.length) setTimeout(() => api.finish({ok: errors <= 1, verdict: errors === 0 ? 'g' : errors <= 1 ? 'o' : 'b', title: errors === 0 ? '전부 맞혔어요' : `${errors}번 틀렸어요`, detail: errors > 1 ? '헷갈린 짝은 복습 때 다시 나와요' : ''}), 350);
      } else {
        errors++; sfx('bad'); haptic(30);
        [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('no'); setTimeout(() => x.classList.remove('no'), 450); });
      }
    };
    $$('.mt', body).forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      if (b.dataset.side === 'a') { if (selA) selA.classList.remove('sel'); selA = selA === b ? null : b; if (ex.sound) { const p = ex.pairs.find(x => x.key === b.dataset.k); speak(p.say, {rate: 1}); } }
      else { if (selB) selB.classList.remove('sel'); selB = selB === b ? null : b; }
      if (selA) selA.classList.add('sel'); if (selB) selB.classList.add('sel');
      tryPair();
    }));
    return 'auto';
  }
};
document.addEventListener('keydown', e => {
  if (!LESSON || SHEET) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (/^[1-4]$/.test(e.key) && LESSON.phase === 'ask') { const b = $$('.opt', LESSON.body)[+e.key - 1]; if (b) { b.click(); e.preventDefault(); } }
  if (e.key === 'Enter') { const b = $('.lgo', LESSON.btns); if (b && !b.disabled) { b.click(); e.preventDefault(); } }
});
