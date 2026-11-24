/* ================= LESSON ENGINE ================= */

/* ---------- small helpers ---------- */
const hgLine = (kana, minMode) => {
  let m = hangulMode();
  if (minMode === 'tap' && m === 'hide') m = 'tap';
  if (m === 'hide') return '';
  const h = esc(toHangul(kana));
  return m === 'tap' ? `<button class="hg hid" data-act="reveal" aria-label="한글 발음 보기">${h}</button>` : `<span class="hg">${h}</span>`;
};
const audioBox = () => `<div class="qaudio"><button class="bigspk" data-play aria-label="다시 듣기">${IC.spk}</button><button class="slowspk" data-slow aria-label="느리게 듣기">${IC.slow}</button></div>`;
const jaSpan = s => `<span lang="ja">${esc(s)}</span>`;
const PRAISE = ['정답이에요!', '좋아요!', '맞았어요!', '잘했어요!', '완벽해요!'];
const tileWords = p => p.k.split(' ').flatMap(w => w.split('_')).filter(Boolean);
const kanaHG = k => KANA_INFO[k] ? KANA_INFO[k].hg : toHangul(k);

/* ---------- distractor pools ---------- */
function kanaPool(k, extra = []) {
  if (DAKU_ALL.includes(k)) return DAKU_ALL;
  if (YOON_ALL.includes(k)) return YOON_ALL;
  const base = isKata(k) ? KATA_ALL : HIRA_ALL;
  const learned = Object.keys(S.cards).filter(id => id.startsWith('k:')).map(id => id.slice(2)).filter(x => base.includes(x));
  const pool = uniq([...extra.filter(x => base.includes(x)), ...learned]);
  return pool.length >= 6 ? pool : uniq([...pool, ...base.slice(0, 15)]);
}
function distinctByHg(list, n, taken = []) {
  const seen = new Set(taken), out = [];
  for (const x of shuffle(list)) { const h = KANA_INFO[x] && KANA_INFO[x].hg; if (!h || seen.has(h)) continue; seen.add(h); out.push(x); if (out.length >= n) break; }
  return out;
}
function kanaChoices(k, pool) {
  return shuffle([k, ...distinctByHg(pool.filter(x => x !== k), 3, [KANA_INFO[k].hg])]);
}
function phOthers(p, n, field) {
  const same = PH.filter(x => x.id !== p.id && x[field] !== p[field] && x.s === p.s);
  const rest = PH.filter(x => x.id !== p.id && x[field] !== p[field] && x.s !== p.s);
  const out = [];
  for (const x of [...shuffle(same), ...shuffle(rest)]) { if (out.length >= n) break; if (!out.some(o => o[field] === x[field])) out.push(x); }
  return out;
}

/* ---------- exercise builders ---------- */
function exIntroKana(k) { return {t: 'introKana', k}; }
function exRead(k, pool, fast) {
  const info = KANA_INFO[k];
  return {t: 'choice', prompt: '이 글자는 어떻게 읽어요?', q: `<div class="qkana" lang="ja">${k}</div>`,
    opts: kanaChoices(k, pool).map(x => ({h: `<b>${esc(KANA_INFO[x].hg)}</b><small>${KANA_INFO[x].ro}</small>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, say: k, fast, ansLabel: `${jaSpan(k)} ${esc(info.hg)}`, fb: info.mn ? esc(info.mn) : ''};
}
function exListenKana(k, pool) {
  const info = KANA_INFO[k];
  return {t: 'choice', prompt: '들리는 글자를 골라요', audio: k,
    opts: kanaChoices(k, pool).map(x => ({h: `<span class="okana" lang="ja">${x}</span>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, ansLabel: `${jaSpan(k)} ${esc(info.hg)}`};
}
function exLookAlike(pair) {
  const [a, b, tip] = pair, k = Math.random() < .5 ? a : b;
  const pool = isKata(k) ? KATA_ALL : HIRA_ALL;
  const others = distinctByHg(pool.filter(x => x !== a && x !== b), 2, [KANA_INFO[a].hg, KANA_INFO[b].hg]);
  return {t: 'choice', prompt: '이 글자는 어떻게 읽어요?', q: `<div class="qkana" lang="ja">${k}</div>`,
    opts: shuffle([a, b, ...others]).map(x => ({h: `<b>${esc(KANA_INFO[x].hg)}</b><small>${KANA_INFO[x].ro}</small>`, v: x})), grid: true,
    ans: k, kana: k, srs: 'k:' + k, say: k, ansLabel: `${jaSpan(k)} ${esc(KANA_INFO[k].hg)}`, fb: `${jaSpan(a)}와 ${jaSpan(b)}: ${esc(tip)}`};
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
function exHear(p) {
  return {t: 'choice', prompt: '듣고 뜻을 골라요', audio: p.k,
    opts: shuffle([p, ...phOthers(p, 3, 'ko')]).map(o => ({h: esc(o.ko), v: o.id})), ans: p.id, srs: 'p:' + p.id,
    ansLabel: `${jaSpan(clean(p.k))} ${esc(p.ko)}`, fb: p.n ? esc(p.n) : '', reveal: true, say: p.k};
}
const canTile = p => p.w !== 'staff' && tileWords(p).length >= 2;
function exTiles(p) { return {t: 'tiles', id: p.id, srs: 'p:' + p.id}; }
function exSpeak(p) { return {t: 'speak', id: p.id, srs: 'p:' + p.id}; }
function exSign(j) {
  const s = SIGNS[j];
  const others = pick(SIGNS.filter(x => x !== s && x[2] !== s[2]), 3);
  return {t: 'choice', prompt: '간판에 이렇게 쓰여 있으면?', q: `<div class="qsign" lang="ja">${s[0]}</div>`,
    opts: shuffle([s, ...others]).map(o => ({h: esc(o[2]), v: o[0]})), ans: s[0], srs: 's:' + j, say: s[1], ansLabel: `${esc(s[2])} · ${jaSpan(s[1])}`};
}
function exHanja(x) {
  const others = pick(HANJAEO.filter(y => y !== x && Math.abs(y[2].length - x[2].length) <= 2), 3);
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
  const opts = shuffle([right, ...pick(near, 2), ...fill].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
  return {t: 'choice', prompt: '어떻게 읽어요?', q: `<div class="qjp" lang="ja">${w}</div>`,
    opts: opts.map(h => ({h: esc(h), v: h})), ans: right, say: w, ansLabel: `${jaSpan(w)} ${esc(right)}`,
    fb: [right.includes('-') ? '- 표시는 앞 모음을 한 박자 더 끄는 장음이에요' : '', w.includes('っ') ? '작은 っ 자리에서 한 박자 쉬어요' : ''].filter(Boolean).join('. ')};
}
function exMenu(m, listen) {
  const others = pick(MENU.filter(x => x !== m), 3);
  if (listen) return {t: 'choice', prompt: '들리는 메뉴를 골라요', audio: m[0], opts: shuffle([m, ...others]).map(o => ({h: jaSpan(o[0]), v: o[0]})), ans: m[0], ansLabel: `${jaSpan(m[0])} ${esc(m[1])}`};
  return {t: 'choice', prompt: '무슨 메뉴예요?', q: `<div class="qjp" lang="ja">${m[0]}</div>`, opts: shuffle([m, ...others]).map(o => ({h: esc(o[1]), v: o[0]})), ans: m[0], say: m[0], ansLabel: `${jaSpan(m[0])} ${esc(m[1])}`, fb: esc(toHangul(m[0]))};
}
function exPair(p) {
  const ans = Math.random() < .5 ? p[0] : p[2];
  return {t: 'choice', prompt: '어느 쪽이 들렸어요?', audio: ans,
    opts: [{h: `<span class="okana sm" lang="ja">${p[0]}</span><small>${esc(p[1])}</small>`, v: p[0]}, {h: `<span class="okana sm" lang="ja">${p[2]}</span><small>${esc(p[3])}</small>`, v: p[2]}], grid: true,
    ans, ansLabel: `${jaSpan(ans)} ${esc(ans === p[0] ? p[1] : p[3])}`, fb: `${esc(p[4])} 차이예요. ${jaSpan(p[0])} ${esc(toHangul(p[0]))}, ${jaSpan(p[2])} ${esc(toHangul(p[2]))}`};
}
function exNum(lv) { return {t: 'num', lv}; }
function exMatchKana(list) {
  const seen = new Set(), use = [];
  list.forEach(k => { const h = KANA_INFO[k].hg; if (!seen.has(h) && use.length < 5) { seen.add(h); use.push(k); } });
  return {t: 'match', pairs: use.map(k => ({a: `<span class="okana sm" lang="ja">${k}</span>`, b: esc(KANA_INFO[k].hg), key: k, say: k}))};
}
function exMatchPh(list) { return {t: 'match', wide: true, pairs: list.slice(0, 5).map(p => ({a: jaSpan(clean(p.k)), b: esc(p.ko), key: p.id, say: p.k}))}; }

/* ---------- lesson recipes ---------- */
const RULE_CARDS = {
  long: [
    {title: '장음', text: '모음을 한 박자 더 끌어요. 한글로는 - 로 적었어요.', ex: [['おばあさん', '할머니'], ['おばさん', '아주머니'], ['とうきょう', '도쿄']]},
    {title: '촉음 っ', text: '작은 っ는 한 박자 멈추는 자리예요. 받침처럼 짧게 끝내지 말고 한 박자를 꽉 채워요.', ex: [['きって', '우표'], ['きて', '와'], ['がっこう', '학교']]},
    {title: 'ん', text: 'ん도 혼자서 한 박자예요. しんぶん은 し・ん・ぶ・ん 네 박자예요.', ex: [['しんぶん', '신문'], ['ほん', '책']]}
  ],
  loan: [
    {title: 'ー는 한 박자', text: '가타카나의 ー는 앞 모음을 한 박자 늘려요.', ex: [['コーヒー', '커피'], ['ビール', '맥주'], ['ケーキ', '케이크']]},
    {title: '작은 ァ ィ ゥ ェ ォ', text: '원래 일본어에 없는 소리를 적을 때 붙여요. フォ는 포, ティ는 티로 읽어요.', ex: [['フォーク', '포크'], ['ティー', '티'], ['カフェ', '카페']]}
  ],
  daku: [{title: '점 두 개, 동그라미 하나', text: '오른쪽 위에 점 두 개(゛)가 붙으면 목을 울리는 소리가 돼요. か는 카, が는 가. は행에 동그라미(゜)가 붙으면 ぱ, 파 소리예요.', ex: [['か', '카'], ['が', '가'], ['は', '하'], ['ば', '바'], ['ぱ', '파']]}],
  yoon: [{title: '작은 ゃ ゅ ょ', text: 'い단 글자 옆에 작은 ゃ ゅ ょ가 붙으면 두 글자가 한 박자로 합쳐져요. き + ゃ = きゃ, 캬.', ex: [['きゃ', '캬'], ['しゅ', '슈'], ['ちょ', '초']]}],
  hanja1: [{title: '한자어는 한국어 발음에서 출발해요', text: '받침 ㄱ은 く나 き, ㄴ과 ㅁ은 ん, ㅇ은 い나 う로 바뀌는 경우가 많아요.', ex: [['やくそく', '약속'], ['おんがく', '음악'], ['せんせい', '선생']]}],
  hanja2: [{title: '받침 ㄹ, ㅂ과 첫소리 ㅎ', text: '받침 ㄹ은 つ, ㅂ은 う가 되는 경우가 많아요. 첫소리 ㅎ은 か행으로 바뀌어요.', ex: [['しつれい', '실례'], ['れんしゅう', '연습'], ['かいしゃ', '회사']]}]
};
function kanaTeach(list) {
  const ex = [];
  const pool = kanaPool(list[0], list);
  const basicHira = list.every(k => HIRA_ALL.includes(k));
  if (basicHira) {
    const chunks = [];
    for (let i = 0; i < list.length; i += 2) chunks.push(list.slice(i, i + 2));
    if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) chunks[chunks.length - 2].push(...chunks.pop());
    let seen = [];
    chunks.forEach((c, ci) => {
      c.forEach(k => ex.push(exIntroKana(k)));
      c.forEach(k => ex.push(exRead(k, pool)));
      shuffle(c).forEach(k => ex.push(exListenKana(k, pool)));
      seen.push(...c);
      if (ci % 2 === 1 && seen.length >= 4) ex.push(exMatchKana(shuffle(seen.slice(-5))));
    });
    if (list.length >= 5) ex.push(exMatchKana(pick(list, 5)));
    pick(list, Math.min(4, list.length)).forEach((k, j) => ex.push(j % 2 ? exListenKana(k, pool) : exRead(k, pool)));
    return ex;
  }
  const kata = list.every(isKata), yoon = list.every(k => YOON_ALL.includes(k));
  if (!kata) ex.push({t: 'rule', ...RULE_CARDS[yoon ? 'yoon' : 'daku'][0]});
  const per = yoon ? 9 : 5;
  const rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  if (rows.length > 1 && rows[rows.length - 1].length < 3) rows[rows.length - 2].push(...rows.pop());
  const cap = yoon ? 2 : kata ? 5 : 3;
  rows.forEach((r, ri) => {
    ex.push({t: 'introRow', kana: r});
    const tests = kata ? r : pick(r, Math.min(cap, r.length));
    tests.forEach((k, j) => ex.push(j % 2 ? exListenKana(k, pool) : exRead(k, pool)));
    if (ri % 2 === 1 || ri === rows.length - 1) ex.push(exMatchKana(pick(r, Math.min(5, r.length))));
  });
  return ex;
}
function readingPractice(i) {
  const ex = [];
  const prev = i > 0 ? ((DAYS[i - 1].s2 && DAYS[i - 1].s2.ph) || []).map(id => PH_BY[id]).filter(p => p.w !== 'staff') : [];
  pick(prev, 3).forEach(p => ex.push(canTile(p) && Math.random() < .5 ? exTiles(p) : exJp(p)));
  const weak = weakKana([...HIRA_ALL, ...KATA_ALL]);
  pick(weak, 4).forEach(k => ex.push(exRead(k, kanaPool(k))));
  const words = W2WORDS.slice((i * 4) % W2WORDS.length).concat(W2WORDS).slice(0, 4);
  words.forEach(w => ex.push(exWord(w)));
  pick(MENU, 3).forEach((m, j) => ex.push(exMenu(m, j === 2)));
  const signs = Object.keys(S.cards).filter(id => id.startsWith('s:')).map(id => +id.slice(2));
  pick(signs, 2).forEach(j => ex.push(exSign(j)));
  return ex;
}
function phraseTeach(ids) {
  const ex = [], list = ids.map(id => PH_BY[id]).filter(Boolean);
  list.forEach(p => { ex.push({t: 'introPh', id: p.id}); ex.push(p.w === 'staff' ? exHear(p) : exMeaning(p)); });
  shuffle(list).forEach(p => { if (p.w === 'staff') ex.push(exHear(p)); else ex.push(canTile(p) ? exTiles(p) : exJp(p)); });
  list.filter(p => p.w !== 'staff').slice(0, 3).forEach(p => ex.push(exSpeak(p)));
  if (list.length >= 3) ex.push(exMatchPh(pick(list, 5)));
  return ex;
}
function rpSteps(key) {
  if (key === 'ALL') return ['konbini', 'train', 'restaurant', 'pharmacy', 'stay'].flatMap(k => RP[k].steps.map((s, j) => ({t: 'dialog', s, who: 'staff', scene: j === 0 ? RP[k].name : ''})));
  return RP[key].steps.map((s, j) => ({t: 'dialog', s, who: 'staff', scene: j === 0 ? RP[key].name : ''}));
}
function chatSteps(id) {
  const c = CHATS.find(x => x.id === id);
  return c.steps.map((s, j) => ({t: 'dialog', s, who: s.who ? 'staff' : 'haruto', scene: j === 0 ? c.name : '', chat: id}));
}
function hanjaSet(n) {
  const two = x => /ㄹ|ㅂ|ㅎ/.test(x[3]);
  const pool = HANJAEO.filter(x => n === 2 ? two(x) : n === 1 ? !two(x) : true);
  const cards = n === 2 ? RULE_CARDS.hanja2 : RULE_CARDS.hanja1;
  return [...(n ? cards.map(c => ({t: 'rule', ...c})) : []), ...pick(pool, 8).map(exHanja)];
}
function signSet(range) {
  const js = []; for (let j = range[0]; j < range[1]; j++) js.push(j);
  return [{t: 'introList', title: '간판 한자', rows: js.map(j => SIGNS[j])}, ...pick(js, 6).map(exSign)];
}
function pairSet(filter, n) {
  const pool = PAIRS.filter(p => !filter || p[4] === filter);
  return shuffle(pool.concat(pool)).slice(0, n).map(exPair);
}
function reviewItem(id, i) {
  const t = id[0], v = id.slice(2);
  if (t === 'k') return i % 2 ? exListenKana(v, kanaPool(v)) : exRead(v, kanaPool(v));
  if (t === 'p') {
    const p = PH_BY[v];
    if (p.w === 'staff') return exHear(p);
    const b = (S.cards[id] || {}).b || 1;
    const r = Math.random();
    if (b >= 3 && r < .35) return exSpeak(p);
    if (canTile(p) && r < .6) return exTiles(p);
    return r < .8 ? exJp(p) : exMeaning(p);
  }
  if (t === 's') return exSign(+v);
  if (t === 'c') { const c = S.custom.find(x => x.id === v); return c ? {t: 'speak', c, srs: id} : null; }
  return null;
}
function reviewItems(extraIds = [], max = 18) {
  let ids = dueCards().slice(0, max);
  if (ids.length < 8) ids = uniq([...ids, ...extraIds.filter(id => S.cards[id])]).slice(0, max);
  if (ids.length < 8) ids = uniq([...ids, ...shuffle(Object.keys(S.cards).filter(cardExists))]).slice(0, Math.min(max, 12));
  return shuffle(ids).map(reviewItem).filter(Boolean);
}

/* ---------- what each set does on a given day ---------- */
const SET_LABEL = {1: '세트 1', 2: '세트 2', 3: '세트 3'};
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
    return {name: '복습', icon: 'review', kind: 'review', short: '복습'};
  }
  if (d.last) {
    if (n === 1) return {name: '핵심 30문장', icon: 'bolt', kind: 'core', short: '30문장'};
    if (n === 2) return {name: '곤란할 때 표현', icon: 'sos', kind: 'sos', short: 'SOS'};
    return {name: '복습', icon: 'review', kind: 'review', short: '복습'};
  }
  if (n === 1) return d.s1.kana || d.s1.drill || d.s1.confuse ? {name: '글자', icon: 'kana', kind: 's1', short: '글자'} : d.s1.rules ? {name: '읽기 규칙', icon: 'kana', kind: 's1', short: '규칙'} : {name: '교재와 읽기', icon: 'book', kind: 's1', short: '교재'};
  if (n === 2) return {name: d.s2.ph ? '표현과 회화' : d.s2.rp || d.s2.talk ? '회화' : '듣기', icon: 'chat', kind: 's2', short: d.s2.ph ? '표현' : '회화'};
  return {name: '복습', icon: 'review', kind: 'review', short: '복습'};
}
function setLesson(i, n) {
  const d = DAYS[i], info = setInfo(i, n);
  if (!d || !info) return [];
  if (info.kind === 'test') return null;
  if (info.kind === 'talk') return chatSteps(d.talk);
  if (info.kind === 'pairs') return pairSet(null, 10);
  if (info.kind === 'core') { const list = CORE30.map(id => PH_BY[id]); return [...pick(list, 12).map(exSpeak), exMatchPh(pick(list, 5)), ...pick(list, 6).map(exJp)]; }
  if (info.kind === 'sos') { const list = ['tr1', 'tr2', 'tr3', 'tr4', 'tr5', 'tr6', 'b9', 'b12', 'b13'].map(id => PH_BY[id]); return [...list.map(exSpeak), exMatchPh(pick(list, 5))]; }
  if (info.kind === 'review') return reviewItems([...dayItems(i), ...(i > 0 ? dayItems(i - 1) : [])]);
  if (n === 1) {
    const s1 = d.s1, ex = [];
    if (s1.kana) ex.push(...kanaTeach(s1.kana));
    if (s1.confuse) ex.push(...CONFUSE.find(c => c.set === s1.confuse).pairs.map(exLookAlike));
    if (s1.drill) ex.push(...pick(HIRA_ALL, 24).map(k => exRead(k, HIRA_ALL, true)), exMatchKana(pick(HIRA_ALL, 5)), exMatchKana(pick(HIRA_ALL, 5)));
    if (s1.rules === 'long') ex.push(...RULE_CARDS.long.map(c => ({t: 'rule', ...c})), ...pairSet('장음', 3), ...pairSet('촉음', 2), ...pick(W2WORDS.filter(w => /[っうい]/.test(w)), 6).map(exWord));
    if (s1.rules === 'loan') ex.push(...RULE_CARDS.loan.map(c => ({t: 'rule', ...c})), ...pick(MENU, 8).map(m => exMenu(m)), ...pick(MENU, 4).map(m => exMenu(m, true)));
    if (!ex.length) ex.push(...readingPractice(i));
    return ex;
  }
  const s2 = d.s2, ex = [];
  if (s2.ph) ex.push(...phraseTeach(s2.ph));
  if (s2.rp) ex.push(...rpSteps(s2.rp));
  if (s2.talk) ex.push(...chatSteps(s2.talk));
  if (s2.num) ex.push(...Array.from({length: 4}, () => exNum(s2.num)));
  if (s2.pairs) ex.push(...pairSet(s2.pairs, 4));
  if (s2.hanja) ex.push(...hanjaSet(s2.hanja));
  if (s2.signs) ex.push(...signSet(s2.signs));
  if (ex.length < 10) {
    const own = new Set(s2.ph || []);
    const earlier = uniq(DAYS.slice(0, i).flatMap(x => (x.s2 && x.s2.ph) || [])).filter(id => !own.has(id)).map(id => PH_BY[id]);
    pick(earlier, 10 - ex.length).forEach(p => ex.push(p.w === 'staff' ? exHear(p) : Math.random() < .5 ? exJp(p) : exMeaning(p)));
  }
  return ex;
}
function setContents(i, n) {
  const d = DAYS[i], info = setInfo(i, n), rows = [];
  if (!d || !info) return rows;
  const bp = n === 1 ? bookPart(i) : null;
  if (info.kind === 'test') rows.push({icon: 'trophy', col: COL.red, t: '통과 기준', s: TEST_RULE[d.test]});
  if (info.kind === 'talk') { const c = CHATS.find(x => x.id === d.talk); rows.push({icon: 'talk', col: COL.indigo, t: c.name, s: c.desc}); }
  if (info.kind === 'pairs') rows.push({icon: 'ear', col: COL.green, t: '비슷한 소리 구별하기', s: '장음, 촉음, 탁음'});
  if (info.kind === 'core') rows.push({icon: 'bolt', col: COL.orange, t: '핵심 30문장 말하기', s: '보지 않고 입으로 바로 나오는지 확인해요'});
  if (info.kind === 'sos') rows.push({icon: 'sos', col: COL.red, t: '곤란할 때 쓰는 말', s: '길을 잃거나 물건을 잃어버렸을 때'}, {act: 'depart', icon: 'list', col: COL.green, t: '출국 체크리스트', s: `${Object.values(S.check).filter(Boolean).length}/${DEPART_CHECK.length} 완료`});
  if (info.kind === 'review') rows.push({icon: 'review', col: COL.cyan, t: dueCards().length ? `다시 볼 카드 ${dueCards().length}장` : '오늘 배운 것 다시 보기', s: '다시 볼 때가 된 것부터 나와요'}, {act: 'recall', data: {d: dateOfIdx(i)}, icon: 'pen', col: COL.indigo, t: '떠올려 적기', s: '오늘 배운 걸 보지 않고 적어 봐요'});
  if (info.kind === 's1') {
    if (bp) rows.push({icon: 'book', col: COL.orange, t: `${bookLabel(bp)} ${bp.from}~${bp.to}쪽`, s: bp.ch ? `<span lang="ja">${esc(bp.t)}</span> 본문을 읽고 연습 문제를 풀어요` : '글자 모양과 발음 설명을 읽어요'});
    if (d.s1.kana) rows.push({icon: 'kana', col: COL.red, t: `새 글자 ${d.s1.kana.length}개`, s: `<span lang="ja">${d.s1.kana.slice(0, 12).join(' ')}${d.s1.kana.length > 12 ? ' …' : ''}</span>`});
    if (d.s1.confuse) rows.push({icon: 'kana', col: COL.purple, t: '헷갈리는 글자', s: '모양이 비슷한 글자 구별하기'});
    if (d.s1.drill) rows.push({icon: 'bolt', col: COL.orange, t: '46자 빠르게 읽기', s: '한 글자에 2초 안쪽이 목표예요'});
    if (d.s1.rules) rows.push({icon: 'doc', col: COL.indigo, t: d.s1.rules === 'long' ? '장음, 촉음, ん' : '외래어 읽기', s: '규칙을 보고 바로 문제로 확인해요'});
    if (!d.s1.kana && !d.s1.drill && !d.s1.rules && !d.s1.confuse) rows.push({icon: 'review', col: COL.teal, t: '읽기 연습', s: '어제 표현 떠올리기, 단어와 메뉴 읽기'});
  }
  if (info.kind === 's2') {
    const s2 = d.s2;
    if (s2.ph) rows.push({icon: 'chat', col: COL.green, t: `표현 ${s2.ph.length}개`, s: s2.ph.slice(0, 2).map(id => esc(PH_BY[id].ko)).join(', ') + (s2.ph.length > 2 ? ' 외' : '')});
    if (s2.rp) rows.push({icon: 'talk', col: COL.blue, t: s2.rp === 'ALL' ? '하루 시나리오' : `롤플레이: ${RP[s2.rp].name}`, s: s2.rp === 'ALL' ? '편의점, 전철, 식당, 약국, 숙소를 이어서' : '점원 말을 듣고 대답 고르기'});
    if (s2.talk) rows.push({icon: 'talk', col: COL.indigo, t: `하루토와 대화`, s: CHATS.find(c => c.id === s2.talk).name});
    if (s2.num) rows.push({icon: 'num', col: COL.orange, t: '숫자 듣기', s: NUM_LEVELS[s2.num].n});
    if (s2.pairs) rows.push({icon: 'ear', col: COL.green, t: '발음 구별', s: s2.pairs});
    if (s2.hanja) rows.push({icon: 'han', col: COL.brown, t: '한자어 읽기 규칙', s: s2.hanja === 1 ? '받침 ㄱ, ㄴ, ㅁ, ㅇ' : '받침 ㄹ, ㅂ과 첫소리 ㅎ'});
    if (s2.signs) rows.push({icon: 'sign', col: COL.gray, t: `간판 한자 ${s2.signs[1] - s2.signs[0]}개`, s: `<span lang="ja">${SIGNS.slice(s2.signs[0], s2.signs[1]).map(x => x[0]).join(' ')}</span>`});
  }
  return rows;
}

/* ---------- tests ---------- */
const TEST_RULE = {
  1: '46자 중 95% 이상, 한 글자 평균 2초 안',
  2: '단어 읽기와 메뉴를 합쳐 80% 이상',
  3: '표현 80% 이상, 숫자 듣기 80% 이상',
  4: '표현 80% 이상, 숫자 듣기 80% 이상',
  5: '표현 80% 이상, 숫자와 시각 듣기 90% 이상',
  6: '표현 80% 이상, 숫자 듣기 80% 이상'
};
function testItems(w) {
  if (w === 1) return shuffle(HIRA_ALL).map(k => Object.assign(exRead(k, HIRA_ALL, true), {part: 'a'}));
  if (w === 2) return [...pick(W2WORDS, 20).map(x => Object.assign(exWord(x), {part: 'a'})), ...pick(MENU, 10).map(m => Object.assign(exMenu(m), {part: 'a'}))];
  const upto = w === 6 ? DAYS.length : DAYS.findIndex(d => d.test === w);
  const ids = uniq(DAYS.slice(0, upto).flatMap(d => (d.s2 && d.s2.ph) || []));
  const say = ids.filter(id => PH_BY[id].w !== 'staff'), hear = ids.filter(id => PH_BY[id].w === 'staff');
  const lv = {3: [3], 4: [4, 5], 5: [6, 7], 6: [3, 4, 5, 6, 7]}[w];
  const n = w === 6 ? 14 : 10;
  return [
    ...pick(say, n).map((id, j) => Object.assign(j % 2 ? exMeaning(PH_BY[id]) : exJp(PH_BY[id]), {part: 'a'})),
    ...pick(hear, w === 6 ? 6 : 4).map(id => Object.assign(exHear(PH_BY[id]), {part: 'a'})),
    ...Array.from({length: w === 6 ? 10 : 8}, (_, j) => Object.assign(exNum(lv[j % lv.length]), {part: 'b'}))
  ];
}
function judgeTest(w, parts, avg) {
  parts.a = parts.a || {ok: 0, n: 0};
  const pa = parts.a ? parts.a.ok / parts.a.n : 0, pb = parts.b ? parts.b.ok / parts.b.n : 1;
  if (w === 1) return {pass: pa >= .95 && avg <= 2000, score: Math.round(pa * 100), detail: `정답 ${parts.a.ok}/${parts.a.n} · 평균 ${(avg / 1000).toFixed(1)}초`};
  if (w === 2) return {pass: pa >= .8, score: Math.round(pa * 100), detail: `정답 ${parts.a.ok}/${parts.a.n}`};
  const pass = pa >= .8 && pb >= (w === 5 ? .9 : .8);
  return {pass, score: Math.round((pa * .6 + pb * .4) * 100), detail: `표현 ${parts.a.ok}/${parts.a.n} · 숫자 ${parts.b.ok}/${parts.b.n}`};
}
function startTest(i, date) {
  const w = DAYS[i].test;
  runLesson({title: setInfo(i, 1).name, items: testItems(w), test: w, requeue: false, xp: 20,
    onDone: r => {
      const j = judgeTest(w, r.parts, r.avg);
      S.tests[w] = {score: j.score, pass: j.pass, at: Date.now(), detail: j.detail};
      markSet(date, 1, r);
      r.title = j.pass ? '통과했어요!' : '아직 기준에 못 미쳐요';
      r.note = j.pass ? `${j.detail}. 다음 주로 넘어가요.` : `${j.detail}. 기준은 ${TEST_RULE[w]}이에요. 틀린 건 복습 카드로 다시 나와요.`;
      r.fail = !j.pass;
    }});
}

/* ---------- start a set ---------- */
function markSet(date, n, r) {
  S.sets[date] = S.sets[date] || {};
  const prev = S.sets[date][n] || {};
  S.sets[date][n] = Object.assign({}, prev, {st: 'done', at: Date.now(), acc: r.acc, xp: (prev.xp || 0) + r.xp});
  S.commits.forEach(c => { if (c.d === date && commitDone(c)) c.done = true; });
  const i = dayIdx(date);
  if (n !== 3 && i >= 0 && i < DAYS.length) unlockItems(dayItems(i).filter(id => n === 1 ? id.startsWith('k:') : !id.startsWith('k:')));
}
function startSet(date, n) {
  const i = dayIdx(date), info = setInfo(i, n);
  if (!info) return;
  if (info.kind === 'test') { startTest(i, date); return; }
  const items = setLesson(i, n);
  if (!items.length) {
    toast(n === 3 ? '아직 복습할 카드가 없어요. 세트 1과 2를 먼저 해요' : '이 세트는 문제가 없어요');
    return;
  }
  runLesson({title: info.name, items, srs: info.kind === 'review', xp: 10,
    onDone: r => {
      markSet(date, n, r);
      const talk = info.kind === 'talk' ? DAYS[i].talk : n === 2 && DAYS[i].s2 ? DAYS[i].s2.talk : null;
      if (talk) S.talkDone[talk] = today();
    }});
}

/* ================= RUNNER ================= */
let LESSON = null;
function runLesson(cfg) {
  if (LESSON) return;
  const items = (cfg.items || []).filter(Boolean);
  if (!items.length) { toast(cfg.empty || '지금은 풀 문제가 없어요'); return; }
  closeSheet(true); stopSpeech();
  const el = document.createElement('div');
  el.className = 'lesson'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', cfg.title || '레슨');
  el.innerHTML = `<header class="lhead"><button class="lx" aria-label="그만하기">${IC.x}</button><div class="lbar"><i></i></div><span class="lcombo" aria-live="polite"></span></header><main class="lbody"></main><footer class="lfoot"><div class="lfb" hidden></div><div class="lbtns"></div></footer>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('in-lesson');
  LESSON = {cfg, el, body: $('.lbody', el), fb: $('.lfb', el), btns: $('.lbtns', el), bar: $('.lbar i', el), combo_el: $('.lcombo', el),
    q: items.map(x => Object.assign({}, x)), i: 0, ok: 0, scored: 0, combo: 0, srsRes: {}, parts: {}, fastMs: [], t0: Date.now(), phase: 'ask', check: null, finished: false};
  $('.lx', el).addEventListener('click', () => LESSON && LESSON.finished ? closeLesson() : confirmQuit());
  updateLive();
  requestAnimationFrame(() => el.classList.add('show'));
  showEx();
}
function confirmQuit() {
  openSheet((b) => {
    b.innerHTML = `<h2>그만할까요?</h2><p class="muted">지금 나가면 이번 레슨은 기록되지 않아요.</p><div class="stack mt16"><button class="btn" data-k>계속하기</button><button class="btn grey" data-q style="color:var(--red)">그만하기</button></div>`;
    $('[data-k]', b).addEventListener('click', () => closeSheet());
    $('[data-q]', b).addEventListener('click', () => { closeSheet(true); closeLesson(); });
  });
}
function closeLesson() {
  if (!LESSON) return;
  const el = LESSON.el;
  LESSON = null; stopSpeech();
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
function showEx() {
  const L = LESSON, ex = L.q[L.i];
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
  const R = RENDER[ex.t];
  const kind = R(ex, L.body, api) || 'check';
  L.el.classList.toggle('nofoot', kind === 'auto');
  if (kind === 'intro') primary('계속', true, nextEx);
  else if (kind === 'speak') primary('정답 보기', true, () => api.check());
  else if (kind === 'auto') setButtons('');
  else primary('확인', false, () => api.check());
}
function resolveEx(res) {
  const L = LESSON, ex = L.q[L.i];
  if (!res || L.phase !== 'ask') return;
  L.phase = 'fb';
  if (res.selfRate) {
    setButtons(`<div class="rate"><button class="btn grey" data-r="0">${IC.x} 틀렸어요</button><button class="btn green" data-r="1">${IC.check} 맞았어요</button></div>`);
    $$('[data-r]', L.btns).forEach(b => b.addEventListener('click', () => { record(ex, b.dataset.r === '1'); if (b.dataset.r === '1') sfx('ok'); nextEx(); }));
    return;
  }
  const ms = performance.now() - L.shownAt;
  record(ex, res.ok, ms);
  const tone = res.verdict === 'o' ? 'meh' : res.ok ? 'ok' : 'bad';
  L.el.classList.add('fb-' + tone);
  sfx(res.ok ? 'ok' : 'bad');
  if (!res.ok) haptic(30);
  if (res.say) speak(res.say);
  const title = res.title || (res.ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : '틀렸어요');
  const showAns = !res.ok && res.answer;
  L.fb.innerHTML = `<span class="fic">${res.ok ? IC.check : IC.x}</span><div class="fbt"><b>${esc(title)}</b>${showAns ? `<p class="fans"><span class="flab">정답</span>${res.answer}</p>` : ''}${res.detail ? `<p>${res.detail}</p>` : ''}${ex.fast && res.ok ? `<p>${(ms / 1000).toFixed(1)}초</p>` : ''}</div>`;
  L.fb.className = 'lfb ' + tone; L.fb.hidden = false; L.el.classList.remove('nofoot');
  const b = primary('계속', true, nextEx, tone);
  if (ex.fast && res.ok) { L.autoT = setTimeout(() => { if (LESSON === L && L.phase === 'fb' && L.q[L.i] === ex) nextEx(); }, 650); }
  else b.focus({preventScroll: true});
}
function record(ex, ok, ms) {
  const L = LESSON;
  if (ex.t === 'introKana' || ex.t === 'introRow' || ex.t === 'introPh' || ex.t === 'introList' || ex.t === 'rule') return;
  if (!ex._retry) {
    L.scored++; if (ok) L.ok++;
    if (ex.part) { const p = L.parts[ex.part] || (L.parts[ex.part] = {ok: 0, n: 0}); p.n++; if (ok) p.ok++; }
    if (ex.kana) kanaStat(ex.kana, ok, ex.fast ? ms : 0);
    if (ex.fast && ms) L.fastMs.push(ms);
    if (ex.srs) L.srsRes[ex.srs] = L.srsRes[ex.srs] === 'wrong' || !ok ? 'wrong' : 'ok';
  }
  L.combo = ok ? L.combo + 1 : 0;
  L.combo_el.textContent = L.combo >= 3 ? `${L.combo}개 연속` : '';
  if (!ok && !ex._retry && L.cfg.requeue !== false && ex.t !== 'dialog' && ex.t !== 'match') {
    const copy = Object.assign({}, ex, {_retry: true});
    if (copy.opts) copy.opts = shuffle(copy.opts);
    L.q.push(copy);
  }
}
function nextEx() {
  const L = LESSON; if (!L) return;
  clearTimeout(L.autoT); stopSpeech();
  L.i++;
  if (L.i >= L.q.length) { completeLesson(); return; }
  showEx();
}
function completeLesson() {
  const L = LESSON, cfg = L.cfg;
  L.finished = true; L.bar.style.width = '100%';
  L.el.classList.remove('fb-ok', 'fb-bad', 'fb-meh'); L.fb.hidden = true;
  const secs = Math.round((Date.now() - L.t0) / 1000);
  const acc = L.scored ? Math.round(L.ok / L.scored * 100) : 100;
  const avg = L.fastMs.length ? L.fastMs.reduce((a, b) => a + b, 0) / L.fastMs.length : 0;
  let xp = cfg.xp || 10;
  if (acc === 100 && L.scored >= 4) xp += 5;
  if (cfg.srs) Object.entries(L.srsRes).forEach(([id, r]) => { if (S.cards[id]) grade(id, r); });
  else Object.entries(L.srsRes).forEach(([id, r]) => { if (r === 'wrong' && S.cards[id]) grade(id, 'wrong'); });
  const wasActive = activeOn(today());
  addXP(xp);
  const r = {acc, xp, secs, ok: L.ok, total: L.scored, avg, parts: L.parts};
  if (cfg.onDone) cfg.onDone(r);
  save();
  sfx('done');
  const fail = r.fail;
  L.body.innerHTML = `<div class="done">
    <div class="done-art ${fail ? 'fail' : ''}">${fail ? IC.flag : IC.check}</div>
    <h1>${esc(r.title || cfg.doneTitle || '레슨 완료!')}</h1>
    ${r.note ? `<p class="muted">${esc(r.note)}</p>` : avg ? `<p class="muted">한 글자 평균 ${(avg / 1000).toFixed(1)}초</p>` : ''}
    <div class="dstats">
      <div><span>얻은 XP</span><b>+${xp}</b></div>
      <div><span>정확도</span><b>${acc}%</b></div>
      <div><span>걸린 시간</span><b>${Math.floor(secs / 60)}:${pad(secs % 60)}</b></div>
    </div></div>`;
  primary('계속', true, () => { if (!wasActive) showStreak(); else closeLesson(); });
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
    <p class="muted">${n === 1 ? '오늘부터 연속 기록이 시작돼요. 내일도 레슨 하나만 해요.' : `${n}일째 이어지고 있어요. 내일 하나만 해도 기록이 이어져요.`}</p>
    <div class="wk">${days.map(d => `<div class="${activeOn(d) ? 'on' : ''} ${d === t ? 'now' : ''}"><span>${WD[parseYmd(d).getDay()]}</span><i>${activeOn(d) ? IC.check : ''}</i></div>`).join('')}</div>
  </div>`;
  primary('계속', true, closeLesson);
}

/* ---------- renderers ---------- */
function wireAudio(body, text, opt = {}) {
  const play = $('[data-play]', body), slow = $('[data-slow]', body);
  if (play) play.addEventListener('click', () => speak(text, opt));
  if (slow) slow.addEventListener('click', () => speak(text, Object.assign({}, opt, {rate: .6})));
  $$('[data-say]', body).forEach(b => b.addEventListener('click', () => speak(b.dataset.say, opt)));
}
const RENDER = {
  introKana(ex, body) {
    const k = KANA_INFO[ex.k];
    body.innerHTML = `<p class="newtag">새 글자</p>
      <button class="kcard" data-say="${k.k}" aria-label="${esc(k.hg)} 듣기"><span class="kbig" lang="ja">${k.k}</span><span class="khg">${esc(k.hg)}</span><span class="kro">${k.ro}</span></button>
      ${k.mn ? `<p class="kmn">${esc(k.mn)}</p>` : ''}
      <p class="lhint">글자를 누르면 다시 들려요</p>`;
    wireAudio(body);
    setTimeout(() => speak(k.k), 250);
    return 'intro';
  },
  introRow(ex, body) {
    const kata = ex.kana.every(isKata);
    body.innerHTML = `<p class="newtag">새 글자</p><h2 class="lp">${kata ? '히라가나와 짝지어 외워요' : '눌러서 소리를 들어 봐요'}</h2>
      <div class="krow ${ex.kana.length > 5 ? 'k3' : ''}">${ex.kana.map(k => { const i = KANA_INFO[k]; return `<button class="kt" data-say="${k}"><span lang="ja">${k}</span><b>${esc(i.hg)}</b>${kata ? `<small lang="ja">${kataToHira(k)}</small>` : ''}</button>`; }).join('')}</div>
      ${kata ? `<div class="mnlist">${ex.kana.filter(k => KANA_INFO[k].mn).map(k => `<p><span lang="ja">${k}</span> ${esc(KANA_INFO[k].mn)}</p>`).join('')}</div>` : ''}`;
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
        ${p.c ? `<div class="pcas"><span class="tag cas">친구끼리</span><span lang="ja">${esc(p.c)}</span>${p.cn ? `<small>${esc(p.cn)}</small>` : ''}<button class="spk sm" data-say="${esc(p.cr || p.c)}" aria-label="친구 말투 듣기">${IC.spk}</button></div>` : ''}
        ${p.n ? `<p class="pnote">${esc(p.n)}</p>` : ''}
      </div>
      ${p.w === 'staff' ? '<p class="lhint">점원이나 안내 방송에서 듣게 되는 말이에요. 알아듣기만 하면 돼요.</p>' : '<p class="lhint">소리를 듣고 한 번 따라 말해 봐요</p>'}`;
    wireAudio(body);
    setTimeout(() => speak(p.k), 250);
    return 'intro';
  },
  introList(ex, body) {
    body.innerHTML = `<p class="newtag">새 단어</p><h2 class="lp">${esc(ex.title)}</h2><div class="list">${ex.rows.map(s => `<div class="ph"><span class="sgn" lang="ja">${s[0]}</span><div class="tx"><span class="ko" style="color:var(--label)">${esc(s[2])}</span><span class="hg" lang="ja">${s[1]}</span></div><button class="spk" data-say="${s[1]}" aria-label="듣기">${IC.spk}</button></div>`).join('')}</div>`;
    wireAudio(body);
    return 'intro';
  },
  rule(ex, body) {
    body.innerHTML = `<p class="newtag">규칙</p><h2 class="lp">${esc(ex.title)}</h2><p class="rtext">${esc(ex.text)}</p>
      <div class="rex">${ex.ex.map(([j, k]) => `<button class="rx" data-say="${j}"><span lang="ja">${j}</span><small>${toHangul(j) === k ? esc(k) : `${esc(toHangul(j))} · ${esc(k)}`}</small>${IC.spk}</button>`).join('')}</div>`;
    wireAudio(body);
    return 'intro';
  },
  choice(ex, body, api) {
    const head = ex.q ? `<div class="lq">${ex.q}${ex.audio && ex.inline ? `<button class="spk" data-play aria-label="듣기">${IC.spk}</button>` : ''}</div>` : `<div class="lq">${audioBox()}</div>`;
    body.innerHTML = `<h2 class="lp">${esc(ex.prompt)}</h2>${head}<div class="opts ${ex.grid ? 'grid' : ''} ${ex.opts.length === 2 ? 'two' : ''}">${ex.opts.map((o, j) => `<button class="opt" data-j="${j}"><span class="oi">${j + 1}</span><span class="ot">${o.h}</span></button>`).join('')}</div>`;
    if (ex.audio) { wireAudio(body, ex.audio); setTimeout(() => { if (LESSON && LESSON.q[LESSON.i] === ex) speak(ex.audio); }, 300); }
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
      if (ex.fast) { api.setCheck(evaluate); api.check(); return; }
      api.ready(true); api.setCheck(evaluate);
    }));
    return ex.fast ? 'auto' : 'check';
  },
  tiles(ex, body, api) {
    const p = PH_BY[ex.id], words = tileWords(p);
    const extra = pick(uniq(PH.filter(x => x.id !== p.id && x.w !== 'staff').flatMap(tileWords)).filter(w => !words.includes(w) && w.length <= 6), 2);
    const bank = shuffle([...words, ...extra]);
    const line = [];
    body.innerHTML = `<h2 class="lp">일본어로 만들어요</h2><div class="lq"><div class="qko">${esc(p.ko)}</div></div><div class="tline" aria-label="내 답"></div><div class="tbank"></div>`;
    const tl = $('.tline', body), tb = $('.tbank', body);
    const draw = () => {
      tl.innerHTML = line.map((j, pos) => `<button class="tile" data-pos="${pos}" lang="ja">${esc(bank[j])}</button>`).join('');
      tb.innerHTML = bank.map((w, j) => `<button class="tile ${line.includes(j) ? 'used' : ''}" data-j="${j}" lang="ja" ${line.includes(j) ? 'disabled aria-hidden="true"' : ''}>${esc(w)}</button>`).join('');
      $$('[data-pos]', tl).forEach(b => b.addEventListener('click', () => { if (LESSON.phase !== 'ask') return; line.splice(+b.dataset.pos, 1); draw(); }));
      $$('[data-j]', tb).forEach(b => b.addEventListener('click', () => { if (LESSON.phase !== 'ask') return; line.push(+b.dataset.j); speak(bank[+b.dataset.j], {rate: 1}); draw(); }));
      api.ready(line.length > 0);
    };
    draw();
    api.setCheck(() => {
      const ok = line.map(j => bank[j]).join('') === words.join('');
      $$('.tile', body).forEach(b => b.disabled = true);
      tl.classList.add(ok ? 'right' : 'wrong');
      return {ok, answer: `${jaSpan(clean(p.k))}`, detail: esc(toHangul(p.k)), say: p.k};
    });
  },
  speak(ex, body, api) {
    const p = ex.id ? PH_BY[ex.id] : null, c = ex.c;
    const ko = p ? p.ko : c.ko, jp = p ? clean(p.k) : c.jp, read = p ? p.k : (c.kana || c.jp);
    body.innerHTML = `<h2 class="lp">소리 내서 말해 봐요</h2><div class="lq"><div class="qko">${esc(ko)}</div></div><p class="lhint">입으로 다 말한 다음 정답을 확인해요</p><div class="reveal" hidden>
      <div class="phcard"><button class="spk lg" data-say="${esc(read)}" aria-label="듣기">${IC.spk}</button><div class="pjp" lang="ja">${esc(jp)}</div><span class="hg">${esc(toHangul(read))}</span>${p && p.c ? `<div class="pcas"><span class="tag cas">친구끼리</span><span lang="ja">${esc(p.c)}</span></div>` : ''}</div>
      <p class="lhint">방금 말한 것과 같았어요?</p></div>`;
    wireAudio(body);
    api.setCheck(() => { $('.reveal', body).hidden = false; $('.lhint', body).hidden = true; speak(read); return {selfRate: true}; });
    return 'speak';
  },
  num(ex, body, api) {
    const q = ex.qv || (ex.qv = NUM_LEVELS[ex.lv].gen());
    body.innerHTML = `<h2 class="lp">${q.time ? '몇 시예요?' : /円/.test(q.show) ? '얼마예요?' : '들은 숫자를 적어요'}</h2><div class="lq">${audioBox()}</div>
      <input class="field numin" inputmode="${q.time ? 'text' : 'numeric'}" autocomplete="off" enterkeyhint="done" aria-label="들은 답" placeholder="${q.time ? '예: 7:30' : '들은 숫자'}">
      <p class="lhint">${q.time ? '들은 시각을 7:30처럼 적어요' : '숫자만 적으면 돼요'}</p>`;
    wireAudio(body, q.k);
    setTimeout(() => { if (LESSON && LESSON.q[LESSON.i] === ex) speak(q.k); }, 300);
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
      ${line ? `<div class="drow">${av}<button class="bub them" data-tr><span lang="ja">${esc(line)}</span><span class="tr" hidden>${esc(s.ko)}</span></button></div><p class="lhint">말풍선을 누르면 뜻이 보여요</p>` : `<div class="dnarr">${esc(s.ko)}</div>`}
      <h2 class="lp">${line ? '뭐라고 대답할까요?' : '뭐라고 말할까요?'}</h2>
      <div class="opts">${s.o.map((o, j) => `<button class="opt" data-j="${j}"><span class="oi">${j + 1}</span><span class="ot"><span lang="ja">${esc(o[0])}</span>${o[1] ? `<small>${esc(o[1])}</small>` : ''}</span></button>`).join('')}</div>`;
    const tr = $('[data-tr]', body);
    if (tr) tr.addEventListener('click', () => { const t = $('.tr', tr); t.hidden = !t.hidden; speak(read, {male: chat}); });
    if (line) setTimeout(() => { if (LESSON && LESSON.q[LESSON.i] === ex) speak(read, {male: chat}); }, 300);
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
    body.innerHTML = `<h2 class="lp">짝을 맞춰요</h2><div class="match ${ex.wide ? 'wide' : ''}"><div class="mcol">${left.map(p => `<button class="mt" data-side="a" data-k="${esc(p.key)}">${p.a}</button>`).join('')}</div><div class="mcol">${right.map(p => `<button class="mt" data-side="b" data-k="${esc(p.key)}">${p.b}</button>`).join('')}</div></div>`;
    let selA = null, selB = null, errors = 0, done = 0;
    const tryPair = () => {
      if (!selA || !selB) return;
      const a = selA, b = selB; selA = selB = null;
      if (a.dataset.k === b.dataset.k) {
        [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; });
        done++; const p = ex.pairs.find(x => x.key === a.dataset.k); if (p && p.say) speak(p.say, {rate: 1});
        if (done === ex.pairs.length) setTimeout(() => api.finish({ok: errors <= 1, verdict: errors === 0 ? 'g' : errors <= 1 ? 'o' : 'b', title: errors === 0 ? '전부 맞혔어요!' : `${errors}번 틀렸어요`, detail: errors > 1 ? '틀린 짝은 복습 때 다시 나와요' : ''}), 350);
      } else {
        errors++; sfx('bad'); haptic(30);
        [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('no'); setTimeout(() => x.classList.remove('no'), 450); });
      }
    };
    $$('.mt', body).forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      if (b.dataset.side === 'a') { if (selA) selA.classList.remove('sel'); selA = selA === b ? null : b; } else { if (selB) selB.classList.remove('sel'); selB = selB === b ? null : b; }
      if (selA) selA.classList.add('sel'); if (selB) selB.classList.add('sel');
      if (b.dataset.side === 'a') { const p = ex.pairs.find(x => x.key === b.dataset.k); if (p && p.say) speak(p.say, {rate: 1}); }
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
