/* ================= PAPER WORKSHEETS =================
 One sheet per day. Selection is seeded by the day so the printed answer key always matches.
 The same HTML is printed from the app and turned into the bundled PDFs at build time. */
function seeded(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sshuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const spick = (a, n, r) => sshuffle(a, r).slice(0, n);
const dayNo = i => String(i + 1).padStart(2, '0');
const kanaUpTo = i => uniq(DAYS.slice(0, i + 1).flatMap(d => (d.s1 && d.s1.kana) || []));

function worksheetFor(i) {
  const d = DAYS[i], r = seeded(i + 7), date = dateOfIdx(i), sec = [];
  const title = d.test ? `${d.test === 6 ? '최종' : d.test + '주차'} 쓰기 테스트` : d.last ? '들고 다닐 카드' : `${i + 1}일차 숙제`;
  const phToday = ((d.s2 && d.s2.ph) || []).map(id => PH_BY[id]);
  const known = kanaUpTo(i);
  const canWrite = p => [...flat(p.k)].every(ch => known.includes(ch) || known.includes(hiraToKata(ch)) || !/[ぁ-ゖァ-ヺ]/.test(ch));
  if (d.last) { sec.push({kind: 'cards', title: '핵심 30문장', items: CORE30.map(id => PH_BY[id])}, {kind: 'sos', title: 'SOS', items: SOS}); return {i, date, title, sec, answers: []}; }
  if (d.test === 1) sec.push({kind: 'table', title: '히라가나 50음도', note: '칸 구석의 한글 발음을 보고 글자를 적어요. 10분 안에 끝내는 게 목표예요.', set: 'hira'});
  if (d.test === 2) sec.push({kind: 'table', title: '가타카나 50음도', note: '칸 구석의 한글 발음을 보고 글자를 적어요.', set: 'kata'}, {kind: 'dict', title: '단어 받아쓰기', note: '앱 숙제 화면에서 받아쓰기를 틀고 들리는 대로 적어요.', items: spick(W2WORDS.filter(w => w.length <= 6), 8, r).map(w => ({play: w, ans: w}))});
  if (d.test >= 3) {
    const upto = d.test === 6 ? DAYS.length : i;
    const say = learnedPh(upto).filter(p => p.w !== 'staff' && DAYS.slice(Math.max(0, upto - (d.test === 6 ? 42 : 7)), upto).some(x => x.s2 && x.s2.ph && x.s2.ph.includes(p.id)));
    sec.push({kind: 'write', title: '한국어 보고 일본어로 쓰기', note: '가나로 써요. 다 쓰고 소리 내서 읽어요.', items: spick(say.length >= 6 ? say : learnedPh(upto).filter(p => p.w !== 'staff'), 10, r).map(p => ({ko: p.ko, ans: clean(p.k)}))});
    const lv = {3: [3], 4: [4, 5], 5: [6, 7], 6: [3, 4, 5, 6, 7]}[d.test];
    const nums = []; const rr = seeded(i + 99);
    for (let j = 0; j < 6; j++) { const save = Math.random; Math.random = rr; const q = NUM_LEVELS[lv[j % lv.length]].gen(); Math.random = save; nums.push({play: q.k, ans: q.show}); }
    sec.push({kind: 'dict', title: '숫자 받아쓰기', note: '앱에서 틀고 숫자로 적어요.', items: nums, num: true});
    const chs = uniq(DAYS.slice(0, upto).map(x => x.s1 && x.s1.book && x.s1.book.ch).filter(Boolean)).filter(c => GRAMMAR[c]);
    const bls = chs.flatMap(c => GRAMMAR[c].bl);
    if (bls.length) sec.push({kind: 'blank', title: '빈칸 채우기', items: spick(bls, 5, r).map(b => ({q: b.q, ko: b.ko, ans: b.a}))});
  }
  if (!d.test) {
    if (d.s1.kana) {
      const kanaList = d.s1.kana.every(k => YOON_ALL.includes(k) || DAKU_ALL.includes(k)) ? spick(d.s1.kana, 10, r) : d.s1.kana;
      sec.push({kind: 'trace', title: '따라 쓰기', note: '회색 글자를 덧쓰고 나머지 칸은 혼자 써요. 쓸 때마다 소리 내서 읽어요.', items: kanaList});
      sec.push({kind: 'dict', title: '받아쓰기', note: '앱 숙제 화면에서 받아쓰기를 틀고 들리는 글자를 적어요.', items: spick([...d.s1.kana, ...spick(known.filter(k => !d.s1.kana.includes(k)), 3, r)], 8, r).map(k => ({play: k, ans: k}))});
    }
    if (d.s1.drill) sec.push({kind: 'table', title: '히라가나 50음도', note: '칸 구석의 한글 발음을 보고 글자를 적어요.', set: 'hira'});
    if (d.s1.confuse) sec.push({kind: 'pairs', title: '헷갈리는 글자 나란히 쓰기', note: '두 글자를 나란히 세 번씩 써요. 다른 점을 말로 설명해 봐요.', items: CONFUSE.find(c => c.set === d.s1.confuse).pairs.slice(0, 6)});
    if (d.s1.rules === 'long') sec.push({kind: 'dict', title: '장음, 촉음 받아쓰기', note: '앱에서 틀고 들리는 대로 적어요. 길게 끄는 소리와 쉬는 자리를 조심해요.', items: spick(W2WORDS.filter(w => /[っうい]/.test(w) && w.length <= 6), 8, r).map(w => ({play: w, ans: w}))});
    if (d.s1.rules === 'loan') sec.push({kind: 'dict', title: '메뉴 받아쓰기', note: '가타카나로 적어요.', items: spick(MENU.filter(m => m[0].length <= 6), 8, r).map(m => ({play: m[0], ans: m[0], ko: m[1]}))});
    const bp = bookPart(i);
    if (bp && bp.ch && GRAMMAR[bp.ch]) {
      const g = GRAMMAR[bp.ch], part = bp.part;
      const bl = part === 2 ? g.bl : g.bl.slice(0, Math.ceil(g.bl.length / 2)), dr = part === 2 ? g.dr : g.dr.slice(0, Math.ceil(g.dr.length / 2));
      sec.push({kind: 'blank', title: `문법 빈칸 (교재 ${bp.ch}과)`, items: bl.map(b => ({q: b.q, ko: b.ko, ans: b.a}))});
      sec.push({kind: 'write', title: '문장 쓰기', note: '가나로 써요.', items: dr.map(x => ({ko: x.ko, ans: clean(x.k)}))});
    }
    const sayable = phToday.filter(p => p.w !== 'staff');
    if (sayable.length) {
      const writable = sayable.filter(canWrite);
      if (writable.length && i >= 14) sec.push({kind: 'write', title: '오늘 표현 쓰기', note: '한국어를 보고 일본어로 써요.', items: writable.map(p => ({ko: p.ko, ans: clean(p.k)}))});
      else sec.push({kind: 'say', title: '소리 내서 읽기', note: '한 번 읽을 때마다 칸 하나에 표시해요. 소리 내서 말하면 조용히 볼 때보다 기억에 오래 남아요.', items: sayable});
    }
    if (d.s2 && d.s2.num) {
      const rr = seeded(i + 51), nums = [];
      for (let j = 0; j < 5; j++) { const save = Math.random; Math.random = rr; const q = NUM_LEVELS[d.s2.num].gen(); Math.random = save; nums.push({play: q.k, ans: q.show}); }
      sec.push({kind: 'dict', title: '숫자 받아쓰기', note: '앱에서 틀고 숫자로 적어요.', items: nums, num: true});
    }
    sec.push({kind: 'recall', title: '떠올려 적기', note: '자기 전에 오늘 배운 걸 보지 않고 전부 적어요. 그다음 앱에서 맞춰 봐요.'});
  }
  const answers = sec.filter(s => ['dict', 'write', 'blank'].includes(s.kind)).map(s => ({title: s.title, items: s.items.map(x => x.ans + (x.ko && s.kind === 'dict' ? ` (${x.ko})` : ''))}));
  if (sec.some(s => s.kind === 'table')) answers.push({title: '50음도', items: ['앱의 연습 탭 글자표와 맞춰 봐요']});
  return {i, date, title, sec, answers};
}
function homeworkFor(date, n) {
  const i = dayIdx(date); if (i < 0 || i >= DAYS.length) return null;
  const ws = worksheetFor(i);
  const kinds = ws.sec.map(s => s.title);
  return {i, desc: kinds.length > 3 ? `${kinds.slice(0, 2).join(', ')} 등 ${kinds.length}가지예요` : kinds.join(', ')};
}
const dictItems = ws => ws.sec.filter(s => s.kind === 'dict').flatMap(s => s.items.map(x => Object.assign({sec: s.title, num: s.num}, x)));

/* ---------- printable HTML ---------- */
function traceRow(k) {
  return `<div class="wtr"><div class="wm"><span lang="ja">${k}</span>${STROKES[k] ? strokeSVG(k, 'ws') : ''}</div><div class="wc g"><span lang="ja">${k}</span></div><div class="wc g2"><span lang="ja">${k}</span></div>${'<div class="wc"></div>'.repeat(6)}</div>`;
}
function tableHTML(set) {
  const rows = set === 'kata' ? KATA_ROWS : HIRA_ROWS;
  const cols = rows.map(r => r[1]);
  let h = '<div class="wtable">';
  for (let v = 0; v < 5; v++) for (let c = 0; c < cols.length; c++) { const x = cols[c][v]; h += x ? `<div class="wt"><small>${esc(x[2])}</small></div>` : '<div class="wt empty"></div>'; }
  return h + '</div>';
}
function wsHTML(ws) {
  const s = ws.sec.map((x, si) => {
    let body = '';
    if (x.kind === 'trace') body = x.items.map(traceRow).join('');
    if (x.kind === 'table') body = tableHTML(x.set);
    const no = j => `<b class="no">${j + 1}</b>`;
    if (x.kind === 'dict') body = `<ol class="wlines cols">${x.items.map((_, j) => `<li>${no(j)}<span class="ln"></span></li>`).join('')}</ol>`;
    if (x.kind === 'write') body = `<ol class="wlines w2">${x.items.map((it, j) => `<li>${no(j)}<div><span class="ko">${esc(it.ko)}</span><span class="ln"></span></div></li>`).join('')}</ol>`;
    if (x.kind === 'blank') body = `<ol class="wlines w2">${x.items.map((it, j) => `<li>${no(j)}<div><span class="jq" lang="ja">${esc(it.q).replace('[ ]', '<span class="bl"></span>')}</span><span class="ko">${esc(it.ko)}</span></div></li>`).join('')}</ol>`;
    if (x.kind === 'say') body = `<ol class="wsay">${x.items.map(p => `<li><span class="jp" lang="ja">${esc(clean(p.k))}</span><span class="ko">${esc(p.ko)}</span><span class="ticks">${'<i></i>'.repeat(5)}</span></li>`).join('')}</ol>`;
    if (x.kind === 'pairs') body = `<div class="wpairs">${x.items.map(p => `<div class="wpr"><span lang="ja">${p[0]}</span><span lang="ja">${p[1]}</span>${'<div class="wc"></div>'.repeat(6)}</div>`).join('')}</div>`;
    if (x.kind === 'recall') body = '<div class="wbox"></div>';
    if (x.kind === 'cards') body = `<div class="wcards">${x.items.map(p => `<div class="wcard"><b lang="ja">${esc(clean(p.k))}</b><span>${esc(toHangul(p.k))}</span><small>${esc(p.ko)}</small></div>`).join('')}</div>`;
    if (x.kind === 'sos') body = `<div class="wcards">${x.items.map(p => `<div class="wcard big"><b lang="ja">${esc(p[0])}</b><small>${esc(p[1])}</small></div>`).join('')}</div>`;
    return `<section class="wsec ws-${x.kind}${['trace', 'table', 'cards', 'sos'].includes(x.kind) ? '' : ' keep'}"><h3>${String.fromCharCode(65 + si)}. ${esc(x.title)}</h3>${x.note ? `<p class="wnote">${esc(x.note)}</p>` : ''}${body}</section>`;
  }).join('');
  const ans = ws.answers.length ? `<section class="wans"><h3>정답</h3>${ws.answers.map(a => `<div><b>${esc(a.title)}</b><ol>${a.items.map(t => `<li lang="ja">${esc(t)}</li>`).join('')}</ol></div>`).join('')}</section>` : '';
  const hasStrokes = ws.sec.some(x => x.kind === 'trace');
  return `<div class="ws"><header class="wh"><div><b>${esc(ws.title)}</b><span>${fmtDate(ws.date)}</span></div><span class="wbrand">일본어 6주</span></header>${s}${ans}${hasStrokes ? '<p class="wfoot">획순 자료: KanjiVG (CC BY-SA 3.0, kanjivg.tagaini.net)</p>' : ''}</div>`;
}
function printWorksheet(ws) {
  let area = $('#printarea');
  if (!area) { area = document.createElement('div'); area.id = 'printarea'; document.body.appendChild(area); }
  area.innerHTML = wsHTML(ws);
  document.documentElement.classList.add('printing');
  const done = () => { document.documentElement.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { try { window.print(); } catch (e) { toast('이 화면에서는 인쇄를 할 수 없어요'); done(); } }, 120);
}

/* ---------- homework page in the app ---------- */
function openHomework(date) {
  const i = dayIdx(date); if (i < 0 || i >= DAYS.length) return;
  closeLesson();
  setTimeout(() => pHomework(i), 280);
}
function pHomework(i) {
  const ws = worksheetFor(i), dict = dictItems(ws);
  const st = {show: false, playing: false, run: 0};
  const page = pushPage(ws.title, el => {
    el.innerHTML = `<h1 class="large">${esc(ws.title)}</h1><p class="subtitle">${fmtDate(ws.date)}. 인쇄하거나 노트에 옮겨 써요</p>
      <div class="stack">${IS_PWA ? `<a class="btn" href="pdf/day-${dayNo(i)}.pdf" target="_blank" rel="noopener">${IC.doc} PDF 열기</a>` : ''}<button class="btn ${IS_PWA ? 'soft' : ''}" data-print>인쇄하기</button></div>
      ${dict.length ? `<p class="sh">받아쓰기 ${dict.length}개</p>
        <div class="list">${dict.map((x, j) => `<div class="row"><span class="t"><b>${j + 1}번</b>${st.show ? `<small lang="ja">${esc(x.ans)}</small>` : ''}</span>${spkBtn(x.play)}</div>`).join('')}</div>
        <div class="rate mt12"><button class="btn grey" data-all>${st.playing ? IC.pause + ' 멈추기' : IC.play + ' 차례로 듣기'}</button><button class="btn grey" data-ans>${st.show ? '정답 가리기' : '정답 보기'}</button></div>
        <p class="sf">차례로 듣기는 한 문제를 두 번씩 읽고 4초 쉬어요.</p>` : ''}
      <p class="sh">시트 미리보기</p><div class="wsprev">${wsHTML(ws)}</div>`;
    $('[data-print]', el).addEventListener('click', () => printWorksheet(ws));
    const all = $('[data-all]', el); if (all) all.addEventListener('click', () => { if (st.playing) { stop(); page.render(); } else { st.playing = true; page.render(); loop(++st.run); } });
    const an = $('[data-ans]', el); if (an) an.addEventListener('click', () => { st.show = !st.show; page.render(); });
  }, {keepScroll: true});
  function stop() { st.playing = false; st.run++; stopSpeech(); }
  async function loop(run) {
    for (let j = 0; j < dict.length && st.playing && run === st.run; j++) {
      toast(`${j + 1}번`);
      for (let k = 0; k < 2 && st.playing && run === st.run; k++) { await speak(dict[j].play, {rate: .85}); await new Promise(r2 => setTimeout(r2, k ? 4000 : 1200)); }
    }
    if (run === st.run) { st.playing = false; page.render(); }
  }
  page.onClose = stop;
}
function pWorksheets() {
  pushPage('숙제 시트', el => {
    const t = today();
    el.innerHTML = `<h1 class="large">숙제 시트</h1><p class="subtitle">날짜마다 손으로 쓰는 시트가 하나씩 있어요</p>
      <div class="list">${DAYS.map((d, i) => { const dt = dateOfIdx(i); const ws = worksheetFor(i); return rowHTML({act: 'hw', data: {i}, title: `${fmtShort(dt)} ${esc(ws.title)}`, sub: esc(ws.sec.map(s => s.title).join(', ')), cls: dt === t ? 'today' : ''}); }).join('')}</div>
      <p class="sf">획순 자료는 KanjiVG(CC BY-SA 3.0)를 썼어요.</p>`;
  });
}
