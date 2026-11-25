/* ================= LESSON RECIPES =================
 A set is one class: quiz on yesterday → today's goal → (textbook) → explanation → listen first → practice → check test (80% to pass) → homework.
 Exercise objects carry `stage` (shown as a chip) and `t` (renderer in runner.js). */

const STAGES = {quiz: '쪽지시험', goal: '오늘 목표', book: '교재', lecture: '강의', explain: '설명', listen: '듣기 먼저', practice: '연습', check: '확인 테스트', review: '복습'};
const PASS = 0.8;

/* ---------- small helpers ---------- */
const jaSpan = s => `<span lang="ja">${esc(s)}</span>`;
function hgLine(kana, minMode) {
  let m = hangulMode();
  if (minMode === 'tap' && m === 'hide') m = 'tap';
  if (m === 'hide') return '';
  const h = esc(toHangul(kana));
  return m === 'tap' ? `<button class="hg hid" data-act="reveal" aria-label="한글 발음 보기">${h}</button>` : `<span class="hg">${h}</span>`;
}
const tileWords = k => k.split(' ').flatMap(w => w.split('_')).filter(Boolean);
const flat = k => clean(k).replace(/[\s、。,.!?！？]/g, '');
const normKana = s => kataToHira(String(s)).replace(/[\s_、。,.!?！？]/g, '');
const normHg = s => String(s).replace(/\(.*?\)/g, '').replace(/[\s\-ー~.,!?]/g, '');
const shortPh = p => p.w !== 'staff' && flat(p.k).length <= 9;
const hasKata = s => /[ァ-ヶ]/.test(s);
const particleSlip = k => normKana(String(k).replace(/_は/g, 'わ').replace(/_を/g, 'お').replace(/_へ/g, 'え'));
const learnedPh = until => uniq(DAYS.slice(0, until).flatMap(d => (d.s2 && d.s2.ph) || [])).map(id => PH_BY[id]).filter(Boolean);
const stamp = (list, stage) => list.filter(Boolean).map(x => Object.assign({}, x, {stage: x.stage || stage}));

/* ---------- distractors ---------- */
function kanaPool(k, extra = []) {
  if (DAKU_ALL.includes(k)) return DAKU_ALL;
  if (YOON_ALL.includes(k)) return YOON_ALL;
  const base = isKata(k) ? KATA_ALL : HIRA_ALL;
  const learned = Object.keys(S.cards).filter(id => id.startsWith('k:')).map(id => id.slice(2)).filter(x => base.includes(x));
  const pool = uniq([...extra.filter(x => base.includes(x)), ...learned]);
  return pool.length >= 6 ? pool : uniq([...pool, ...base.slice(0, 15)]);
}
const lookAlikes = k => uniq(SIMILAR.filter(g => g.includes(k)).flat()).filter(x => x !== k && KANA_INFO[x]);
function soundNeighbors(k) {
  const out = [];
  [...HIRA_ROWS, ...KATA_ROWS, ...DAKU_ROWS, ...YOON_ROWS].forEach(r => { const row = r[1].filter(Boolean).map(x => x[0]); if (row.includes(k)) out.push(...row); });
  const ro = (KANA_INFO[k] || {}).ro || '';
  Object.values(KANA_INFO).forEach(i => { if (i.k !== k && isKata(i.k) === isKata(k) && i.ro && ro && i.ro.slice(-1) === ro.slice(-1) && i.ro.length === ro.length) out.push(i.k); });
  return uniq(out).filter(x => x !== k);
}
function distinctByHg(list, n, taken = []) {
  const seen = new Set(taken), out = [];
  for (const x of list) { const h = KANA_INFO[x] && KANA_INFO[x].hg; if (!h || seen.has(h)) continue; seen.add(h); out.push(x); if (out.length >= n) break; }
  return out;
}
function kanaChoices(k, pool, near) {
  const hk = KANA_INFO[k].hg;
  const first = distinctByHg(shuffle(near), 2, [hk]);
  const rest = distinctByHg(shuffle(pool.filter(x => x !== k && !first.includes(x))), 3 - first.length, [hk, ...first.map(x => KANA_INFO[x].hg)]);
  return shuffle([k, ...first, ...rest]);
}
function phOthers(p, n, field) {
  const same = PH.filter(x => x.id !== p.id && x[field] !== p[field] && x.s === p.s);
  const rest = PH.filter(x => x.id !== p.id && x[field] !== p[field] && x.s !== p.s);
  const out = [];
  for (const x of [...shuffle(same), ...shuffle(rest)]) { if (out.length >= n) break; if (!out.some(o => o[field] === x[field])) out.push(x); }
  return out;
}

/* ---------- exercise builders ---------- */
const exStage = (stage, title, text) => ({t: 'stageIntro', stage, title, text});
const exGoal = (lines, meta) => ({t: 'goal', stage: 'goal', lines, meta});
const exBook = (bp, mins) => ({t: 'book', stage: 'book', bp, mins});
const exLecture = (lec, bp) => ({t: 'lecture', stage: 'lecture', lec, bp});
const exIntroKana = k => ({t: 'introKana', stage: 'explain', k});
const exIntroRow = kana => ({t: 'introRow', stage: 'explain', kana});
const exIntroPh = id => ({t: 'introPh', stage: 'listen', id});
const exRule = c => ({t: 'rule', stage: 'explain', title: c.title, text: c.text, ex: c.ex});
function exRead(k, pool, fast) {
  const info = KANA_INFO[k];
  return {t: 'choice', prompt: '이 글자는 어떻게 읽어요?', q: `<div class="qkana" lang="ja">${k}</div>`,
    opts: kanaChoices(k, pool, lookAlikes(k)).map(x => ({h: `<b>${esc(KANA_INFO[x].hg)}</b>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, say: k, fast, ansLabel: `${jaSpan(k)} ${esc(info.hg)}`, fb: info.mn ? esc(info.mn) : ''};
}
function exListenKana(k, pool) {
  const info = KANA_INFO[k];
  return {t: 'choice', prompt: '들리는 글자를 골라요', audio: k, vary: true,
    opts: kanaChoices(k, pool, soundNeighbors(k)).map(x => ({h: `<span class="okana" lang="ja">${x}</span>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, ansLabel: `${jaSpan(k)} ${esc(info.hg)}`};
}
function exLookAlike(pair) {
  const [a, b, tip] = pair, k = Math.random() < .5 ? a : b;
  const pool = isKata(k) ? KATA_ALL : HIRA_ALL;
  const others = distinctByHg(shuffle(pool.filter(x => x !== a && x !== b)), 2, [KANA_INFO[a].hg, KANA_INFO[b].hg]);
  return {t: 'choice', prompt: '이 글자는 어떻게 읽어요?', q: `<div class="qkana" lang="ja">${k}</div>`,
    opts: shuffle([a, b, ...others]).map(x => ({h: `<b>${esc(KANA_INFO[x].hg)}</b>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, say: k, ansLabel: `${jaSpan(k)} ${esc(KANA_INFO[k].hg)}`, fb: `${jaSpan(a)} ${jaSpan(b)} 구별: ${esc(tip)}`};
}
const exDraw = (k, recall) => ({t: 'draw', k, recall, srs: 'k:' + k, say: k, ansLabel: `${jaSpan(k)} ${esc(KANA_INFO[k].hg)}`, fb: KANA_INFO[k].mn ? esc(KANA_INFO[k].mn) : ''});
const canDraw = k => !!(STROKES[k] && KANA_INFO[k]);
const exTypeReading = k => ({t: 'type', mode: 'hangul', prompt: '한글로 어떻게 읽는지 적어요', q: `<div class="qkana" lang="ja">${k}</div>`, ans: KANA_INFO[k].hg, alt: [KANA_INFO[k].ro], say: k, kana: k, srs: 'k:' + k, ansLabel: `${jaSpan(k)} ${esc(KANA_INFO[k].hg)}`, fb: KANA_INFO[k].mn ? esc(KANA_INFO[k].mn) : ''});
const exDictate = (k, srs, ko) => ({t: 'type', mode: 'kana', prompt: ko ? '들은 말을 가나로 적어요' : '들은 소리를 가나로 적어요', audio: k, vary: !ko, ans: k, srs, kata: hasKata(clean(k)), say: k, hint: ko || '', ansLabel: `${jaSpan(clean(k))}${ko ? ' ' + esc(ko) : KANA_INFO[k] ? ' ' + esc(KANA_INFO[k].hg) : ''}`});
const exWriteKo = (p, srs) => ({t: 'type', mode: 'kana', prompt: '일본어로 적어요', q: `<div class="qko">${esc(p.ko)}</div>`, ans: p.k, srs, kata: hasKata(clean(p.k)), say: p.k, ansLabel: jaSpan(clean(p.k)), fb: esc(toHangul(p.k))});
function exBlank(b, stage) {
  const q = esc(b.q).replace('[ ]', '<span class="blank" aria-label="빈칸"></span>');
  const full = b.q.replace(/^.*→\s*/, '').replace('[ ]', b.a);
  if (b.opts) return {t: 'choice', stage, prompt: '빈칸에 들어갈 말은?', q: `<div class="qjp" lang="ja">${q}</div><div class="qsub">${esc(b.ko)}</div>`, opts: shuffle(b.opts).map(o => ({h: jaSpan(o), v: o})), grid: true, ans: b.a, say: full, ansLabel: jaSpan(b.q.replace('[ ]', b.a))};
  return {t: 'type', mode: 'kana', stage, prompt: '빈칸을 채워요', q: `<div class="qjp" lang="ja">${q}</div><div class="qsub">${esc(b.ko)}</div>`, ans: b.a, kata: hasKata(b.a), say: full, ansLabel: jaSpan(b.q.replace('[ ]', b.a))};
}
function exMeaning(p) {
  return {t: 'choice', prompt: '무슨 뜻이에요?', q: `<div class="qjp" lang="ja">${esc(clean(p.k))}</div>${hgLine(p.k)}`, audio: p.k, inline: true,
    opts: shuffle([p, ...phOthers(p, 3, 'ko')]).map(o => ({h: esc(o.ko), v: o.id})), ans: p.id, srs: 'p:' + p.id, ansLabel: esc(p.ko)};
}
function exJp(p) {
  return {t: 'choice', prompt: '일본어로 골라요', q: `<div class="qko">${esc(p.ko)}</div>`,
    opts: shuffle([p, ...phOthers(p, 3, 'k')]).map(o => ({h: jaSpan(clean(o.k)), v: o.id})), ans: p.id, srs: 'p:' + p.id, say: p.k,
    ansLabel: jaSpan(clean(p.k)), fb: esc(toHangul(p.k))};
}
function exHear(p, guess) {
  return {t: 'choice', prompt: guess ? '처음 듣는 말이에요. 뜻을 짐작해 봐요' : '듣고 뜻을 골라요', audio: p.k, vary: !guess, unscored: !!guess,
    opts: shuffle([p, ...phOthers(p, 3, 'ko')]).map(o => ({h: esc(o.ko), v: o.id})), ans: p.id, srs: guess ? '' : 'p:' + p.id,
    ansLabel: `${jaSpan(clean(p.k))} ${esc(p.ko)}`, fb: p.n ? esc(p.n) : '', reveal: true, say: p.k};
}
const canTile = p => p.w !== 'staff' && tileWords(p.k).length >= 2;
const exTiles = (p, srs) => ({t: 'tiles', ko: p.ko, k: p.k, srs: srs === undefined ? (p.id ? 'p:' + p.id : '') : srs});
const exSpeak = (p, srs) => ({t: 'speak', id: p.id, srs: srs === undefined ? 'p:' + p.id : srs});
function exSign(j) {
  const s = SIGNS[j];
  const others = pick(SIGNS.filter(x => x !== s && x[2] !== s[2]), 3);
  return {t: 'choice', prompt: '간판에 이렇게 쓰여 있으면?', q: `<div class="qsign" lang="ja">${s[0]}</div>`,
    opts: shuffle([s, ...others]).map(o => ({h: esc(o[2]), v: o[0]})), ans: s[0], srs: 's:' + j, say: s[1], ansLabel: `${esc(s[2])} · ${jaSpan(s[1])}`};
}
function exHanja(x) {
  const close = HANJAEO.filter(y => y !== x && Math.abs(y[2].length - x[2].length) <= 1 && y[2][0] === x[2][0]);
  const others = uniq([...pick(close, 2), ...pick(HANJAEO.filter(y => y !== x && !close.includes(y)), 3)]).slice(0, 3);
  return {t: 'choice', prompt: '일본어로는 어떻게 읽을까요?', q: `<div class="qko">${esc(x[0])}</div><div class="qsub" lang="ja">${x[1]}</div>`,
    opts: shuffle([x, ...others]).map(o => ({h: jaSpan(o[2]), v: o[2]})), ans: x[2], say: x[2], ansLabel: `${jaSpan(x[2])} ${esc(toHangul(x[2]))}`, fb: esc(x[3])};
}
function nearMisses(w) {
  const flip = {'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ','た':'だ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ'};
  const back = Object.fromEntries(Object.entries(flip).map(([a, b]) => [b, a]));
  const out = [w.replace('っ', ''), w.replace(/(?<=[おこごそぞとどのほぼぽもよろょゅうくぐすずつぬふぶむゆる])う/, ''), w.replace(/(?<=[えけげせぜてでねへべめれいきぎしじちにひびみり])い/, ''), (flip[w[0]] || back[w[0]] || w[0]) + w.slice(1)];
  if (!w.includes('っ') && w.length > 2) out.push(w[0] + 'っ' + w.slice(1));
  return out;
}
function exWord(w) {
  const right = toHangul(w);
  const near = uniq(nearMisses(w).map(toHangul)).filter(h => h !== right);
  const fill = pick(W2WORDS.filter(x => x !== w).map(toHangul).filter(h => h !== right && !near.includes(h)), 3);
  const opts = shuffle(uniq([right, ...pick(near, 2), ...fill]).slice(0, 4));
  return {t: 'choice', prompt: '어떻게 읽어요?', q: `<div class="qjp" lang="ja">${w}</div>`,
    opts: opts.map(h => ({h: esc(h), v: h})), ans: right, say: w, ansLabel: `${jaSpan(w)} ${esc(right)}`,
    fb: [right.includes('-') ? '- 표시는 앞 모음을 한 박자 더 끄는 장음이에요' : '', w.includes('っ') ? '작은 っ 자리에서 한 박자 쉬어요' : ''].filter(Boolean).join('. ')};
}
function exMenu(m, listen) {
  const others = pick(MENU.filter(x => x !== m), 3);
  if (listen) return {t: 'choice', prompt: '들리는 메뉴를 골라요', audio: m[0], vary: true, opts: shuffle([m, ...others]).map(o => ({h: jaSpan(o[0]), v: o[0]})), ans: m[0], ansLabel: `${jaSpan(m[0])} ${esc(m[1])}`};
  return {t: 'choice', prompt: '무슨 메뉴예요?', q: `<div class="qjp" lang="ja">${m[0]}</div>`, opts: shuffle([m, ...others]).map(o => ({h: esc(o[1]), v: o[0]})), ans: m[0], say: m[0], ansLabel: `${jaSpan(m[0])} ${esc(m[1])}`};
}
function exPair(p) {
  const ans = Math.random() < .5 ? p[0] : p[2];
  return {t: 'choice', prompt: '어느 쪽이 들렸어요?', audio: ans, vary: true,
    opts: [{h: `<span class="okana sm" lang="ja">${p[0]}</span><small>${esc(p[1])}</small>`, v: p[0]}, {h: `<span class="okana sm" lang="ja">${p[2]}</span><small>${esc(p[3])}</small>`, v: p[2]}], grid: true,
    ans, ansLabel: `${jaSpan(ans)} ${esc(ans === p[0] ? p[1] : p[3])}`, fb: `${esc(p[4])} 차이예요. ${jaSpan(p[0])} ${esc(toHangul(p[0]))}, ${jaSpan(p[2])} ${esc(toHangul(p[2]))}`};
}
const exNum = lv => ({t: 'num', lv});
function exMatchKana(list, sound) {
  const use = distinctByHg(list, 5);
  return {t: 'match', sound: !!sound, pairs: use.map(k => ({a: sound ? '' : `<span class="okana sm" lang="ja">${k}</span>`, b: sound ? `<span class="okana sm" lang="ja">${k}</span>` : esc(KANA_INFO[k].hg), key: k, say: k}))};
}
const exMatchPh = list => ({t: 'match', wide: true, pairs: list.slice(0, 5).map(p => ({a: jaSpan(clean(p.k)), b: esc(p.ko), key: p.id, say: p.k}))});

/* ---------- recipes ---------- */
const RULE_CARDS = {
  long: [
    {title: '장음', text: '모음을 한 박자 더 끌어요. 한글 발음에서는 - 로 적었어요.', ex: [['おばあさん', '할머니'], ['おばさん', '아주머니'], ['とうきょう', '도쿄']]},
    {title: '촉음 っ', text: '작은 っ는 한 박자 쉬는 자리예요. 받침처럼 짧게 끝내지 말고 한 박자를 채워요.', ex: [['きって', '우표'], ['きて', '와'], ['がっこう', '학교']]},
    {title: 'ん', text: 'ん도 혼자 한 박자예요. しんぶん은 し・ん・ぶ・ん 네 박자예요.', ex: [['しんぶん', '신문'], ['ほん', '책']]}
  ],
  loan: [
    {title: 'ー는 한 박자', text: '가타카나의 ー는 앞 모음을 한 박자 늘려요.', ex: [['コーヒー', '커피'], ['ビール', '맥주'], ['ケーキ', '케이크']]},
    {title: '작은 ァ ィ ゥ ェ ォ', text: '원래 일본어에 없는 소리를 적을 때 붙여요. フォ는 포, ティ는 티로 읽어요.', ex: [['フォーク', '포크'], ['ティー', '티'], ['カフェ', '카페']]}
  ],
  daku: [{title: '점 두 개, 동그라미 하나', text: '오른쪽 위에 점 두 개(゛)가 붙으면 목을 울리는 소리가 돼요. か는 카, が는 가. は행에 동그라미(゜)가 붙으면 ぱ, 파 소리예요.', ex: [['か', '카'], ['が', '가'], ['は', '하'], ['ば', '바'], ['ぱ', '파']]}],
  yoon: [{title: '작은 ゃ ゅ ょ', text: 'い단 글자 옆에 작은 ゃ ゅ ょ가 붙으면 두 글자가 한 박자로 합쳐져요. き와 작은 ゃ를 합치면 きゃ, 캬예요.', ex: [['きゃ', '캬'], ['しゅ', '슈'], ['ちょ', '초']]}],
  hanja1: [{title: '한자어는 한국어 발음에서 출발해요', text: '받침 ㄱ은 く나 き, ㄴ과 ㅁ은 ん, ㅇ은 い나 う로 바뀌는 경우가 많아요.', ex: [['やくそく', '약속'], ['おんがく', '음악'], ['せんせい', '선생']]}],
  hanja2: [{title: '받침 ㄹ, ㅂ과 첫소리 ㅎ', text: '받침 ㄹ은 つ, ㅂ은 う가 되는 경우가 많아요. 첫소리 ㅎ은 か행으로 바뀌어요.', ex: [['しつれい', '실례'], ['れんしゅう', '연습'], ['かいしゃ', '회사']]}]
};
function kanaTeach(list) {
  const ex = [], pool = kanaPool(list[0], list);
  if (list.every(k => HIRA_ALL.includes(k))) {
    const chunks = [];
    for (let i = 0; i < list.length; i += 2) chunks.push(list.slice(i, i + 2));
    if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) chunks[chunks.length - 2].push(...chunks.pop());
    const seen = [];
    chunks.forEach((c, ci) => {
      c.forEach(k => ex.push(exIntroKana(k)));
      ex.push(...stamp([...c.map(k => exRead(k, pool)), ...shuffle(c).map(k => exListenKana(k, pool)), ...c.filter(canDraw).map(k => exDraw(k, false))], 'practice'));
      seen.push(...c);
      if (ci % 2 === 1 && seen.length >= 4) ex.push(...stamp([exMatchKana(shuffle(seen.slice(-5)), ci % 4 === 3)], 'practice'));
    });
    ex.push(...stamp([exMatchKana(pick(list, 5), true), ...pick(list, 3).map(exTypeReading)], 'practice'));
    return ex;
  }
  const kata = list.every(isKata), yoon = list.every(k => YOON_ALL.includes(k));
  if (!kata) ex.push(exRule(RULE_CARDS[yoon ? 'yoon' : 'daku'][0]));
  const per = yoon ? 9 : 5, rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  if (rows.length > 1 && rows[rows.length - 1].length < 3) rows[rows.length - 2].push(...rows.pop());
  rows.forEach((r, ri) => {
    ex.push(exIntroRow(r));
    if (kata) ex.push(...stamp(r.filter(canDraw).map(k => exDraw(k, false)), 'practice'));
    const tests = kata ? r : pick(r, Math.min(yoon ? 3 : 4, r.length));
    ex.push(...stamp(tests.map((k, j) => j % 2 ? exListenKana(k, pool) : exRead(k, pool)), 'practice'));
    if (ri % 2 === 1 || ri === rows.length - 1) ex.push(...stamp([exMatchKana(pick(r, Math.min(5, r.length)), ri % 2 === 1)], 'practice'));
  });
  return ex;
}
function kanaCheck(list) {
  const items = list.length > 12 ? pick(list, 12) : shuffle(list);
  return stamp(items.map((k, j) => j % 3 === 2 && canDraw(k) ? exDraw(k, true) : j % 2 ? exDictate(k, 'k:' + k) : exTypeReading(k)), 'check');
}
function phraseTeach(ids) {
  const ex = [], list = ids.map(id => PH_BY[id]).filter(Boolean);
  list.forEach(p => { ex.push(Object.assign(exHear(p, true), {stage: 'listen'})); ex.push(exIntroPh(p.id)); });
  ex.push(...stamp(shuffle(list).map(p => p.w === 'staff' ? exHear(p) : exMeaning(p)), 'practice'));
  ex.push(...stamp(shuffle(list).filter(p => p.w !== 'staff').map(p => canTile(p) ? exTiles(p) : exJp(p)), 'practice'));
  ex.push(...stamp(list.filter(p => p.w !== 'staff').slice(0, 3).map(p => exSpeak(p)), 'practice'));
  if (list.length >= 3) ex.push(...stamp([exMatchPh(pick(list, 5))], 'practice'));
  return ex;
}
const phraseCheck = ids => stamp(ids.map(id => PH_BY[id]).filter(Boolean).map(p => p.w === 'staff' ? exHear(p) : shortPh(p) ? exWriteKo(p, 'p:' + p.id) : exTiles(p)), 'check');
function rpSteps(key) {
  const keys = key === 'ALL' ? ['konbini', 'train', 'restaurant', 'pharmacy', 'stay'] : [key];
  return keys.flatMap(k => RP[k].steps.map((s, j) => ({t: 'dialog', stage: 'practice', s, who: 'staff', scene: j === 0 ? RP[k].name : ''})));
}
function chatSteps(id) {
  const c = CHATS.find(x => x.id === id);
  return c.steps.map((s, j) => ({t: 'dialog', stage: 'practice', s, who: s.who ? 'staff' : 'haruto', scene: j === 0 ? c.name : '', chat: id}));
}
function hanjaSet(n) {
  const two = x => /ㄹ|ㅂ|ㅎ/.test(x[3]);
  const pool = HANJAEO.filter(x => n === 2 ? two(x) : n === 1 ? !two(x) : true);
  const cards = n === 2 ? RULE_CARDS.hanja2 : n === 1 ? RULE_CARDS.hanja1 : [...RULE_CARDS.hanja1, ...RULE_CARDS.hanja2];
  return {teach: [...cards.map(exRule), ...stamp(pick(pool, 8).map(exHanja), 'practice')], check: stamp(pick(pool, 3).map(exHanja), 'check')};
}
function signSet(range) {
  const js = []; for (let j = range[0]; j < range[1]; j++) js.push(j);
  return {teach: [{t: 'introList', stage: 'explain', title: '간판 한자', rows: js.map(j => SIGNS[j])}, ...stamp(pick(js, 6).map(exSign), 'practice')], check: stamp(pick(js, 3).map(exSign), 'check')};
}
const pairSet = (filter, n) => { const pool = PAIRS.filter(p => !filter || p[4] === filter); return shuffle(pool.concat(pool)).slice(0, n).map(exPair); };
function grammarSet(ch, part) {
  const g = GRAMMAR[ch]; if (!g) return null;
  const half = Math.ceil(g.pts.length / 2);
  const pts = part === 2 ? g.pts.slice(half) : g.pts.slice(0, half);
  const dr = part === 2 ? g.dr : g.dr.slice(0, Math.ceil(g.dr.length / 2)), bl = part === 2 ? g.bl : g.bl.slice(0, Math.ceil(g.bl.length / 2));
  const teach = [...pts.map(exRule), ...bl.map(b => exBlank(b, 'practice')), ...stamp(dr.map(d => exTiles(d, '')), 'practice')];
  const short = dr.filter(d => flat(d.k).length <= 10);
  const check = [...bl.map(b => exBlank(b, 'check')), ...stamp(pick(short, 2).map(d => exWriteKo(d, '')), 'check'), ...stamp(pick(dr.filter(d => !short.includes(d)), 2).map(d => exTiles(d, '')), 'check')];
  return {pts, teach, check};
}
function readingPractice() {
  const ex = [];
  pick(W2WORDS, 3).forEach(w => ex.push(exWord(w)));
  pick(MENU, 2).forEach((m, j) => ex.push(exMenu(m, j === 1)));
  const signs = Object.keys(S.cards).filter(id => id.startsWith('s:')).map(id => +id.slice(2));
  pick(signs, 2).forEach(j => ex.push(exSign(j)));
  return stamp(ex, 'practice');
}

/* ---------- reviewing: harder forms as a card matures ---------- */
function recallItem(id) {
  const t = id[0], v = id.slice(2);
  if (t === 'k') { const r = Math.random(); return r < .34 && canDraw(v) ? exDraw(v, true) : r < .67 ? exTypeReading(v) : exDictate(v, id); }
  if (t === 'p') { const p = PH_BY[v]; if (p.w === 'staff') return exHear(p); return shortPh(p) ? exWriteKo(p, id) : Math.random() < .5 ? exTiles(p) : exSpeak(p); }
  if (t === 's') return exSign(+v);
  if (t === 'c') { const c = S.custom.find(x => x.id === v); return c ? {t: 'speak', c, srs: id} : null; }
  return null;
}
function reviewItem(id) {
  const t = id[0], v = id.slice(2), b = (S.cards[id] || {}).b || 0;
  if (b >= 2) return recallItem(id);
  if (t === 'k') return b ? exListenKana(v, kanaPool(v)) : exRead(v, kanaPool(v));
  if (t === 'p') { const p = PH_BY[v]; if (p.w === 'staff') return exHear(p); return b ? (canTile(p) ? exTiles(p) : exJp(p)) : exMeaning(p); }
  return recallItem(id);
}
const REVIEW_CAP = 60;
function reviewQueue(extraIds = []) {
  let ids = dueCards();
  ids.sort((a, b) => (S.cards[b].w || 0) - (S.cards[a].w || 0) || S.cards[a].due.localeCompare(S.cards[b].due));
  if (ids.length < 8) ids = uniq([...ids, ...extraIds.filter(id => S.cards[id])]);
  if (ids.length < 8) ids = uniq([...ids, ...shuffle(Object.keys(S.cards).filter(cardExists))]).slice(0, 12);
  return ids.slice(0, REVIEW_CAP);
}
const reviewItems = extraIds => stamp(reviewQueue(extraIds).map(reviewItem), 'review');
function quizFor(i) {
  if (i <= 0) return [];
  return stamp(pick(dayItems(i - 1).filter(id => S.cards[id]), 5).map(recallItem), 'quiz');
}

/* ---------- what each set is ---------- */
function bookPart(i) {
  const d = DAYS[i]; if (!d || !d.s1 || !d.s1.book) return null;
  const b = BOOK[d.s1.book.ch];
  if (!d.s1.book.part) return {ch: b.n, from: b.p, to: b.e, t: b.t};
  const mid = b.p + Math.floor((b.e - b.p) / 2);
  return d.s1.book.part === 1 ? {ch: b.n, part: 1, from: b.p, to: mid, t: b.t} : {ch: b.n, part: 2, from: mid + 1, to: b.e, t: b.t};
}
const bookLabel = bp => bp.ch ? `교재 ${bp.ch}과 ${bp.part === 1 ? '앞부분' : bp.part === 2 ? '뒷부분' : ''}`.trim() : '교재 발음편';
function setInfo(i, n) {
  const d = DAYS[i];
  if (!d) return null;
  if (d.test) {
    if (n === 1) return {name: d.test === 6 ? '최종 테스트' : `${d.test}주차 테스트`, icon: 'trophy', kind: 'test', short: '테스트'};
    if (n === 2) return d.talk ? {name: '하루토와 대화', icon: 'talk', kind: 'talk', short: '대화'} : {name: '발음 구별', icon: 'ear', kind: 'pairs', short: '듣기'};
    return {name: '한 주 복습', icon: 'review', kind: 'review', short: '복습'};
  }
  if (d.last) {
    if (n === 1) return {name: '핵심 30문장', icon: 'bolt', kind: 'core', short: '30문장'};
    if (n === 2) return {name: '곤란할 때 표현', icon: 'sos', kind: 'sos', short: 'SOS'};
    return {name: '복습', icon: 'review', kind: 'review', short: '복습'};
  }
  if (n === 1) return d.s1.kana || d.s1.drill || d.s1.confuse ? {name: '글자', icon: 'kana', kind: 's1', short: '글자'} : d.s1.rules ? {name: '읽기 규칙', icon: 'kana', kind: 's1', short: '규칙'} : {name: '교재와 문법', icon: 'book', kind: 's1', short: '교재'};
  if (n === 2) return {name: d.s2.ph ? '표현과 회화' : d.s2.rp || d.s2.talk ? '회화' : '듣기와 읽기', icon: 'chat', kind: 's2', short: d.s2.ph ? '표현' : '회화'};
  return {name: '복습', icon: 'review', kind: 'review', short: '복습'};
}
function goalLines(i, n) {
  const d = DAYS[i], info = setInfo(i, n), L = [];
  if (info.kind === 's1') {
    if (d.s1.kana) L.push(`<span lang="ja">${d.s1.kana.slice(0, 13).join(' ')}${d.s1.kana.length > 13 ? ' …' : ''}</span> 보자마자 읽기`, '소리를 듣고 가나로 적기');
    if (d.s1.confuse) L.push('모양이 비슷한 글자 헷갈리지 않기');
    if (d.s1.drill) L.push('히라가나 46자를 한 글자 2초 안에 읽기', '소리만 듣고 손으로 쓰기');
    if (d.s1.rules === 'long') L.push('장음, 촉음, ん이 들어간 단어를 듣고 적기');
    if (d.s1.rules === 'loan') L.push('가타카나 메뉴를 읽고 뜻 알기');
    const bp = bookPart(i);
    if (bp && bp.ch && GRAMMAR[bp.ch]) grammarSet(bp.ch, bp.part).pts.forEach(p => L.push(`문법: ${esc(p.title)}`));
  }
  if (info.kind === 's2') {
    const list = ((d.s2 && d.s2.ph) || []).map(id => PH_BY[id]);
    const say = list.filter(p => p.w !== 'staff'), hear = list.filter(p => p.w === 'staff');
    if (say.length) L.push('말하기: ' + say.map(p => esc(p.ko)).join(', '));
    if (hear.length) L.push('알아듣기: ' + hear.map(p => esc(p.ko)).join(', '));
    if (d.s2.rp) L.push(d.s2.rp === 'ALL' ? '편의점부터 숙소까지 하루를 일본어로 버티기' : `${esc(RP[d.s2.rp].name)}에서 점원 말에 대답하기`);
    if (d.s2.talk) L.push(`하루토와 대화: ${esc(CHATS.find(c => c.id === d.s2.talk).name)}`);
    if (d.s2.num) L.push(`${NUM_LEVELS[d.s2.num].n} 듣고 바로 적기`);
    if (d.s2.hanja) L.push('한자 발음으로 일본어 읽기 짐작하기');
    if (d.s2.signs) L.push('간판 한자를 보고 뜻 알기');
  }
  if (info.kind === 'review') L.push('다시 볼 때가 된 카드를 보기 없이 떠올리기', '틀린 카드는 내일 다시 나와요');
  if (info.kind === 'core') L.push('여행에서 가장 많이 쓸 30문장을 보지 않고 말하기');
  if (info.kind === 'sos') L.push('길을 잃거나 물건을 잃어버렸을 때 쓸 말을 바로 꺼내기');
  if (info.kind === 'talk') L.push(`하루토와 대화: ${esc(CHATS.find(c => c.id === d.talk).name)}`);
  if (info.kind === 'pairs') L.push('장음, 촉음, 탁음이 다른 단어를 듣고 구별하기');
  return L;
}
const checkIntro = () => exStage('check', '확인 테스트', '힌트 없이 풀어요. 80%를 넘으면 세트 통과예요. 못 넘으면 틀린 것만 다시 보고 한 번 더 풀어요.');
function setLesson(i, n) {
  const d = DAYS[i], info = setInfo(i, n);
  if (!d || !info || info.kind === 'test') return null;
  const goal = exGoal(goalLines(i, n), info.name);
  if (info.kind === 'review') {
    const items = reviewItems([...dayItems(i), ...(i > 0 ? dayItems(i - 1) : [])]);
    if (d.test) { const wk = DAYS.map((x, j) => x.w === d.w && j < i ? j : -1).filter(j => j >= 0).flatMap(dayItems).filter(id => S.cards[id]); items.push(...stamp(pick(wk, 12).map(recallItem), 'review')); }
    return {items: items.length ? [goal, ...items] : [], mastery: false};
  }
  if (info.kind === 'talk') return {items: [goal, ...chatSteps(d.talk)], mastery: false};
  if (info.kind === 'pairs') return {items: [goal, ...stamp(pairSet(null, 12), 'practice')], mastery: false};
  if (info.kind === 'core' || info.kind === 'sos') {
    const list = (info.kind === 'core' ? CORE30 : ['tr1', 'tr2', 'tr3', 'tr4', 'tr5', 'tr6', 'b9', 'b12', 'b13']).map(id => PH_BY[id]);
    return {items: [goal, ...stamp([...pick(list, 8).map(p => exSpeak(p)), exMatchPh(pick(list, 5))], 'practice'), checkIntro(), ...phraseCheck(pick(list, 8).map(p => p.id))], mastery: true};
  }
  const quiz = quizFor(i), teach = [], check = [];
  if (n === 1) {
    const s1 = d.s1, bp = bookPart(i);
    if (s1.kana) { teach.push(...kanaTeach(s1.kana)); check.push(...kanaCheck(s1.kana)); }
    if (s1.confuse) { const prs = CONFUSE.find(c => c.set === s1.confuse).pairs; teach.push(...stamp(prs.map(exLookAlike), 'practice')); check.push(...stamp(pick(prs, 4).map(p => exTypeReading(p[Math.random() < .5 ? 0 : 1])), 'check')); }
    if (s1.drill) { teach.push(...stamp([...pick(HIRA_ALL, 16).map(k => exRead(k, HIRA_ALL, true)), exMatchKana(pick(HIRA_ALL, 8), true), ...pick(HIRA_ALL, 8).map(k => exDraw(k, true))], 'practice')); check.push(...kanaCheck(pick(HIRA_ALL, 14))); }
    if (s1.rules === 'long') {
      teach.push(...RULE_CARDS.long.map(exRule), ...stamp([...pairSet('장음', 3), ...pairSet('촉음', 2), ...pick(W2WORDS.filter(w => /[っうい]/.test(w)), 5).map(exWord)], 'practice'));
      check.push(...stamp(pick(W2WORDS.filter(w => /[っうい]/.test(w) && w.length <= 6), 5).map(w => exDictate(w, '', '')), 'check'));
    }
    if (s1.rules === 'loan') teach.push(...stamp(pick(KATA_ALL.filter(canDraw), 8).map(k => exDraw(k, true)), 'practice'));
    if (s1.rules === 'loan') {
      teach.push(...RULE_CARDS.loan.map(exRule), ...stamp([...pick(MENU, 6).map(m => exMenu(m)), ...pick(MENU, 3).map(m => exMenu(m, true))], 'practice'));
      check.push(...stamp(pick(MENU.filter(m => m[0].length <= 5), 5).map(m => exDictate(m[0], '', m[1])), 'check'));
    }
    if (bp && bp.ch && GRAMMAR[bp.ch]) { const g = grammarSet(bp.ch, bp.part); teach.push(...g.teach, ...readingPractice()); check.push(...g.check); }
    else if (!teach.length) teach.push(...readingPractice());
    const lec = lectureOf(i);
    const book = lec && bp ? [exLecture(lec, bp)] : bp ? [exBook(bp, bp.ch ? 10 : 5)] : [];
    return {items: [...quiz, goal, ...book, ...teach, ...(check.length ? [checkIntro(), ...check] : [])], mastery: check.length > 0};
  }
  const s2 = d.s2;
  if (s2.ph) { teach.push(...phraseTeach(s2.ph)); check.push(...phraseCheck(s2.ph)); }
  if (s2.rp) teach.push(...rpSteps(s2.rp));
  if (s2.talk) teach.push(...chatSteps(s2.talk));
  if (s2.num) { teach.push(...stamp(Array.from({length: 4}, () => exNum(s2.num)), 'practice')); check.push(...stamp([exNum(s2.num), exNum(s2.num)], 'check')); }
  if (s2.pairs) teach.push(...stamp(pairSet(s2.pairs, 4), 'practice'));
  if (s2.hanja) { const h = hanjaSet(s2.hanja); teach.push(...h.teach); check.push(...h.check); }
  if (s2.signs) { const sg = signSet(s2.signs); teach.push(...sg.teach); check.push(...sg.check); }
  if (teach.length < 12) {
    const own = new Set(s2.ph || []);
    const extra = pick(learnedPh(i).filter(p => !own.has(p.id)), 12 - teach.length);
    teach.push(...stamp(extra.map(p => p.w === 'staff' ? exHear(p) : Math.random() < .5 ? exJp(p) : exMeaning(p)), 'practice'));
    if (check.length < 3) check.push(...phraseCheck(pick(extra.filter(p => p.w !== 'staff'), 4 - Math.min(check.length, 2)).map(p => p.id)));
  }
  return {items: [...quiz, goal, ...teach, ...(check.length ? [checkIntro(), ...check] : [])], mastery: check.length > 0};
}
function setContents(i, n) {
  const d = DAYS[i], info = setInfo(i, n), rows = [];
  if (!d || !info) return rows;
  const bp = n === 1 ? bookPart(i) : null;
  if (i > 0 && info.kind !== 'review' && info.kind !== 'test' && dayItems(i - 1).some(id => S.cards[id])) rows.push({icon: 'pen', col: COL.indigo, t: '쪽지시험', s: '어제 배운 것 몇 개를 보기 없이 떠올려요'});
  if (info.kind === 'test') rows.push({icon: 'trophy', col: COL.red, t: '통과 기준', s: TEST_RULE[d.test]});
  if (info.kind === 'talk') { const c = CHATS.find(x => x.id === d.talk); rows.push({icon: 'talk', col: COL.indigo, t: c.name, s: c.desc}); }
  if (info.kind === 'pairs') rows.push({icon: 'ear', col: COL.green, t: '비슷한 소리 구별하기', s: '장음, 촉음, 탁음'});
  if (info.kind === 'core') rows.push({icon: 'bolt', col: COL.orange, t: '핵심 30문장 말하기', s: '녹음해서 원래 발음이랑 비교해요'});
  if (info.kind === 'sos') rows.push({icon: 'sos', col: COL.red, t: '곤란할 때 쓰는 말', s: '길을 잃거나 물건을 잃어버렸을 때'}, {act: 'depart', icon: 'list', col: COL.green, t: '출국 체크리스트', s: `${Object.values(S.check).filter(Boolean).length}/${DEPART_CHECK.length} 완료`});
  if (info.kind === 'review') rows.push({icon: 'review', col: COL.cyan, t: dueCards().length ? `다시 볼 카드 ${Math.min(dueCards().length, REVIEW_CAP)}장` : '오늘 배운 것 다시 보기', s: d.test ? '이번 주에 배운 것까지 섞어서 나와요' : '익숙한 카드일수록 직접 쓰거나 말하는 문제로 나와요'}, {act: 'recall', data: {d: dateOfIdx(i)}, icon: 'pen', col: COL.indigo, t: '떠올려 적기', s: '오늘 배운 걸 안 보고 종이에 적어요'});
  if (info.kind === 's1') {
    const lec = lectureOf(i);
    if (bp && lec) rows.push({icon: 'play', col: COL.red, t: `미미센세 ${lec.n}강 ${tsOf(lec.from)}~${tsOf(lec.to)}`, s: `${LECTURE_TOPIC[lec.n]}. ${bookLabel(bp)}을 펴 놓고 같이 봐요, ${lec.mins}분`});
    else if (bp) rows.push({icon: 'book', col: COL.orange, t: `${bookLabel(bp)} ${bp.from}~${bp.to}쪽`, s: bp.ch ? '본문을 소리 내서 읽고 연습 문제까지 풀어요' : '오늘 글자 부분을 훑어봐요'});
    if (d.s1.kana) rows.push({icon: 'kana', col: COL.red, t: `새 글자 ${d.s1.kana.length}개`, s: `<span lang="ja">${d.s1.kana.slice(0, 12).join(' ')}${d.s1.kana.length > 12 ? ' …' : ''}</span>`});
    if (d.s1.confuse) rows.push({icon: 'kana', col: COL.purple, t: '헷갈리는 글자', s: '모양이 비슷한 글자 구별하기'});
    if (d.s1.drill) rows.push({icon: 'bolt', col: COL.orange, t: '46자 빠르게 읽기', s: '한 글자에 2초 안쪽이 목표예요'}, {icon: 'pen', col: COL.indigo, t: '손가락으로 쓰기', s: '쓰기 테스트 전에 소리만 듣고 써 봐요'});
    if (d.s1.rules) rows.push({icon: 'doc', col: COL.indigo, t: d.s1.rules === 'long' ? '장음, 촉음, ん' : '외래어 읽기', s: '듣고 가나로 받아 적어요'});
    if (bp && bp.ch && GRAMMAR[bp.ch]) rows.push({icon: 'doc', col: COL.indigo, t: '문법', s: grammarSet(bp.ch, bp.part).pts.map(p => esc(p.title)).join(', ')});
  }
  if (info.kind === 's2') {
    const s2 = d.s2;
    if (s2.ph) rows.push({icon: 'chat', col: COL.green, t: `표현 ${s2.ph.length}개`, s: '소리부터 듣고 뜻을 짐작한 다음 배워요'});
    if (s2.rp) rows.push({icon: 'talk', col: COL.blue, t: s2.rp === 'ALL' ? '하루 시나리오' : `롤플레이: ${RP[s2.rp].name}`, s: s2.rp === 'ALL' ? '편의점, 전철, 식당, 약국, 숙소를 이어서' : '점원 말을 듣고 대답 고르기'});
    if (s2.talk) rows.push({icon: 'talk', col: COL.indigo, t: '하루토와 대화', s: CHATS.find(c => c.id === s2.talk).name});
    if (s2.num) rows.push({icon: 'num', col: COL.orange, t: '숫자 듣기', s: NUM_LEVELS[s2.num].n});
    if (s2.pairs) rows.push({icon: 'ear', col: COL.green, t: '발음 구별', s: s2.pairs});
    if (s2.hanja) rows.push({icon: 'han', col: COL.brown, t: '한자어 읽기 규칙', s: s2.hanja === 1 ? '받침 ㄱ, ㄴ, ㅁ, ㅇ' : '받침 ㄹ, ㅂ과 첫소리 ㅎ'});
    if (s2.signs) rows.push({icon: 'sign', col: COL.gray, t: `간판 한자 ${s2.signs[1] - s2.signs[0]}개`, s: `<span lang="ja">${SIGNS.slice(s2.signs[0], s2.signs[1]).map(x => x[0]).join(' ')}</span>`});
  }
  if (['s1', 's2', 'core', 'sos'].includes(info.kind)) rows.push({icon: 'check', col: COL.green, t: '확인 테스트', s: '80%를 넘어야 통과예요'});
  if (info.kind === 's1' || info.kind === 's2') rows.push({icon: 'doc', col: COL.gray, t: '숙제', s: '손으로 쓰는 시트, 끝난 화면에서 받아요'});
  return rows;
}

/* ---------- tests ---------- */
const TEST_RULE = {
  1: '46자 중 95% 이상, 한 글자 평균 2초 안',
  2: '단어 받아쓰기와 메뉴를 합쳐 80% 이상',
  3: '표현 80% 이상, 숫자 듣기 80% 이상',
  4: '표현 80% 이상, 숫자 듣기 80% 이상',
  5: '표현 80% 이상, 숫자와 시각 듣기 90% 이상',
  6: '표현 80% 이상, 숫자 듣기 80% 이상'
};
function testItems(w) {
  const tag = (x, part) => Object.assign(x, {part, stage: 'check'});
  if (w === 1) return shuffle(HIRA_ALL).map(k => tag(exRead(k, HIRA_ALL, true), 'a'));
  if (w === 2) return [...pick(W2WORDS.filter(x => x.length <= 6), 12).map(x => tag(exDictate(x, ''), 'a')), ...pick(MENU, 10).map(m => tag(exMenu(m), 'a'))];
  const upto = w === 6 ? DAYS.length : DAYS.findIndex(d => d.test === w);
  const list = learnedPh(upto);
  const say = list.filter(p => p.w !== 'staff'), hear = list.filter(p => p.w === 'staff');
  const lv = {3: [3], 4: [4, 5], 5: [6, 7], 6: [3, 4, 5, 6, 7]}[w];
  return [
    ...pick(say, w === 6 ? 14 : 10).map(p => tag(shortPh(p) ? exWriteKo(p, 'p:' + p.id) : exTiles(p), 'a')),
    ...pick(hear, w === 6 ? 6 : 4).map(p => tag(exHear(p), 'a')),
    ...Array.from({length: w === 6 ? 10 : 8}, (_, j) => tag(exNum(lv[j % lv.length]), 'b'))
  ];
}
function judgeTest(w, parts, avg) {
  const A = parts.a || {ok: 0, n: 0}, B = parts.b || {ok: 0, n: 0};
  const pa = A.n ? A.ok / A.n : 0, pb = B.n ? B.ok / B.n : 1;
  if (w === 1) return {pass: pa >= .95 && avg <= 2000, score: Math.round(pa * 100), detail: `정답 ${A.ok}/${A.n} · 평균 ${(avg / 1000).toFixed(1)}초`};
  if (w === 2) return {pass: pa >= .8, score: Math.round(pa * 100), detail: `정답 ${A.ok}/${A.n}`};
  const pass = pa >= .8 && pb >= (w === 5 ? .9 : .8);
  return {pass, score: Math.round((pa * .6 + pb * .4) * 100), detail: `표현 ${A.ok}/${A.n} · 숫자 ${B.ok}/${B.n}`};
}
function startTest(i, date) {
  const w = DAYS[i].test, name = setInfo(i, 1).name;
  runLesson({title: name, items: [exStage('check', name, `기준은 ${TEST_RULE[w]}이에요. 틀린 건 바로 알려 주지만 다시 나오지는 않아요.`), ...testItems(w)], test: w, requeue: false, set: {date, n: 1},
    onDone: r => {
      const j = judgeTest(w, r.parts, r.avg);
      S.tests[w] = {score: j.score, pass: j.pass, at: Date.now(), detail: j.detail};
      r.xp = j.pass ? 20 : 0;
      if (j.pass) markSet(date, 1, r);
      r.title = j.pass ? '통과했어요' : '아직 기준에 못 미쳐요';
      r.note = j.pass ? `${j.detail}. 다음 주로 넘어가요.` : `${j.detail}. 기준은 ${TEST_RULE[w]}이에요. 틀린 건 복습 카드로 다시 나오고, 테스트는 다시 볼 수 있어요.`;
      r.fail = !j.pass;
    }});
}

/* ---------- start a set ---------- */
function markSet(date, n, r) {
  S.sets[date] = S.sets[date] || {};
  const prev = S.sets[date][n] || {};
  S.sets[date][n] = Object.assign({}, prev, {st: 'done', at: Date.now(), acc: r.checkAcc != null ? r.checkAcc : r.acc, secs: r.secs});
  S.commits.forEach(c => { if (c.d === date && commitDone(c)) c.done = true; });
  const i = dayIdx(date);
  if (n !== 3 && i >= 0 && i < DAYS.length) unlockItems(dayItems(i).filter(id => n === 1 ? id.startsWith('k:') : !id.startsWith('k:')));
}
function startSet(date, n) {
  const i = dayIdx(date), info = setInfo(i, n);
  if (!info) return;
  if (info.kind === 'test') { startTest(i, date); return; }
  const L = setLesson(i, n);
  if (!L || !L.items.some(x => x.t !== 'goal')) { toast(n === 3 ? '아직 복습할 카드가 없어요. 세트 1과 2를 먼저 해요' : '이 세트는 문제가 없어요'); return; }
  const lecX = n === 1 && lectureOf(i);
  runLesson({title: info.name, items: L.items, mastery: L.mastery, srs: info.kind === 'review', set: {date, n, i}, target: lecX ? 20 + Math.max(0, lecX.mins - 10) : 20,
    onDone: r => {
      markSet(date, n, r);
      r.xp = 20 + (r.checkAcc === 100 && !r.retested ? 5 : 0);
      const talk = info.kind === 'talk' ? DAYS[i].talk : n === 2 && DAYS[i].s2 ? DAYS[i].s2.talk : null;
      if (talk) S.talkDone[talk] = today();
    }});
}
