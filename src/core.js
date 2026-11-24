/* ================= CORE ================= */
const IS_PWA = typeof __IS_PWA__ !== 'undefined' && __IS_PWA__ === true;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const today = () => ymd(new Date());
const WD = '일월화수목금토';
const fmtDate = s => { const d = parseYmd(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
const fmtShort = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const PH_BY = Object.fromEntries(PH.map(p => [p.id, p]));
const KANA_INFO = {};
[...HIRA_ROWS, ...KATA_ROWS].forEach(r => r[1].forEach(x => { if (x) KANA_INFO[x[0]] = {k: x[0], ro: x[1], hg: x[2], mn: x[3]}; }));
[...DAKU_ROWS, ...YOON_ROWS].forEach(r => r[1].forEach(x => { if (x) KANA_INFO[x[0]] = {k: x[0], ro: x[1], hg: x[2], mn: ''}; }));
const HIRA_ALL = HIRA_ROWS.flatMap(r => r[1].filter(Boolean).map(x => x[0]));
const KATA_ALL = KATA_ROWS.flatMap(r => r[1].filter(Boolean).map(x => x[0]));
const isKata = k => /[゠-ヿ]/.test(k);

/* ---------- icons (SF Symbols-like) ---------- */
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const IC = {
  today: I('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  learn: I('<path d="M3.5 5.5c2.8-1.2 5.6-1.2 8.5.5v13c-2.9-1.7-5.7-1.7-8.5-.5z"/><path d="M20.5 5.5c-2.8-1.2-5.6-1.2-8.5.5v13c2.9-1.7 5.7-1.7 8.5-.5z"/>'),
  review: I('<rect x="4" y="7" width="13" height="13" rx="2.5"/><path d="M8 4h9.5A2.5 2.5 0 0 1 20 6.5V16"/>'),
  talk: I('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 0 1 4 10.5z"/><path d="M16 8.5h1.5A2.5 2.5 0 0 1 20 11v4a2.5 2.5 0 0 1-2 2.45V20l-3-2.5h-3.5a2.5 2.5 0 0 1-2-1"/>'),
  me: I('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.4 3.9-5 7-5s5.8 1.6 7 5"/>'),
  spk: I('<path d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4z" fill="currentColor" stroke="none"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.8a7.4 7.4 0 0 1 0 10.4"/>'),
  chev: `<svg class="chev" viewBox="0 0 9 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5L7 7l-5.5 5.5"/></svg>`,
  back: I('<path d="M15 4.5L7.5 12l7.5 7.5" stroke-width="2.4"/>'),
  check: I('<path d="M5 12.5l4.2 4.2L19 7" stroke-width="2.4"/>'),
  x: I('<path d="M6 6l12 12M18 6L6 18" stroke-width="2.2"/>'),
  play: I('<path d="M7 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>'),
  pause: I('<path d="M7.5 5v14M16.5 5v14" stroke-width="3"/>'),
  plus: I('<path d="M12 5v14M5 12h14" stroke-width="2.2"/>'),
  search: I('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>'),
  flame: I('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.8-7.5.3 1.6 1 2.7 2 3.2.2-2.8 1.2-5.2 3.2-7.5.3 3.2 4 5.6 4 10.9 0 4.2-2.6 7.1-6.5 7.1z" fill="currentColor" stroke="none"/>'),
  timer: I('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.5M9.5 2.5h5"/>'),
  sparkle: I('<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" fill="currentColor" stroke="none"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" stroke="none"/>'),
  kana: I('<path d="M6 7h8M9.5 4v9c0 3-1.5 5-4 6M15 9c2.5 1 4 3 4 6"/>'),
  ear: I('<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 6.5a2.5 2.5 0 0 1-5 .2"/><path d="M10 9.5a2 2 0 0 1 4 0"/>'),
  num: I('<path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15"/>'),
  chat: I('<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h0a2.5 2.5 0 0 1-2-2.5z"/>'),
  book: I('<path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5H7.5A2 2 0 0 1 5.5 18.5V4a.5.5 0 0 1 .5-.5z"/><path d="M5.5 18.5a2 2 0 0 1 2-2h11"/>'),
  sign: I('<rect x="4" y="4" width="16" height="11" rx="2"/><path d="M12 15v5M8.5 20h7M8 8h8M8 11h5"/>'),
  han: I('<path d="M5 6h14M8 6v5c0 3-1 6-3 8M16 6v13M11 11h8"/>'),
  sos: I('<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.2v.3" stroke-width="2.2"/>'),
  list: I('<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1" fill="currentColor"/><circle cx="4.8" cy="12" r="1" fill="currentColor"/><circle cx="4.8" cy="17.5" r="1" fill="currentColor"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>'),
  pen: I('<path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  doc: I('<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12.5h6M9.5 16h6"/>'),
  cloud: I('<path d="M7 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.2A4.6 4.6 0 0 0 7 18.5z"/>'),
  send: I('<path d="M12 19V5M6 11l6-6 6 6" stroke-width="2.4"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  bolt: I('<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" stroke="none"/>'),
  globe: I('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>')
};
const iconTile = (ic, color) => `<span class="icon" style="background:${color}">${IC[ic]}</span>`;
const COL = {red:'#FF3B30',orange:'#FF9500',yellow:'#FFCC00',green:'#34C759',mint:'#00C7BE',teal:'#30B0C7',cyan:'#32ADE6',blue:'#007AFF',indigo:'#5856D6',purple:'#AF52DE',pink:'#FF2D55',brown:'#A2845E',gray:'#8E8E93'};

/* ---------- state ---------- */
const LS_KEY = 'nihongo-08-v1';
const DEFAULT_STATE = () => ({
  v: 1, updatedAt: 0, tab: 'today',
  sets: {}, cards: {}, custom: [], tests: {}, book: {}, recall: {}, log: [], commits: [],
  kanaStat: {}, talkDone: {}, check: {}, run: null, asked: {}, aiChat: [], allergen: [],
  settings: {hangul: 'auto', rate: 0.9, voice: '', times: ['10:00', '16:00', '22:30'], casual: false}
});
let S = DEFAULT_STATE();
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) S = Object.assign(DEFAULT_STATE(), JSON.parse(raw));
  S.settings = Object.assign(DEFAULT_STATE().settings, S.settings || {});
} catch (e) { /* storage unavailable: run in memory */ }
let syncState = 'local';
let dbRef = null, dbWriting = false, dbDirty = false, dbTimer = null;
function save() {
  S.updatedAt = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  queueRemote();
}
function queueRemote() {
  if (!dbRef) return;
  dbDirty = true;
  clearTimeout(dbTimer);
  dbTimer = setTimeout(flushRemote, 2500);
}
async function flushRemote() {
  if (!dbRef || dbWriting || !dbDirty) return;
  dbWriting = true; dbDirty = false;
  try {
    await dbRef.set({json: JSON.stringify(S), updatedAt: S.updatedAt});
    syncState = 'synced';
  } catch (e) {
    if (e && e.code === 'invalid_argument') { dbRef = null; syncState = 'local'; }
    else if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) { dbDirty = true; setTimeout(flushRemote, 8000 + Math.random() * 4000); }
  } finally { dbWriting = false; if (dbDirty) setTimeout(flushRemote, 1500); }
}
async function initSync() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc('data/users/' + uid + '/state');
    const snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej({code: 'timeout'}), 10000))]);
    dbRef = ref;
    if (snap.exists) {
      const body = snap.data() || {};
      let remote = null;
      try { remote = JSON.parse(body.json || 'null'); } catch (e) { remote = null; }
      if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) {
        const keepTab = S.tab;
        S = Object.assign(DEFAULT_STATE(), remote);
        S.settings = Object.assign(DEFAULT_STATE().settings, S.settings || {});
        S.tab = keepTab;
        try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
        render();
      } else if ((S.updatedAt || 0) > (remote ? remote.updatedAt || 0 : 0)) { dbDirty = true; flushRemote(); }
    } else if (S.updatedAt) { dbDirty = true; flushRemote(); }
    syncState = 'synced';
    if (S.tab === 'me') render();
  } catch (e) { syncState = 'local'; }
}
let AI = null, CTTS = null;
async function initCaps() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    window.claude.use('sample').then(a => { AI = a || null; if (AI && (S.tab === 'talk')) render(); }).catch(() => {});
    window.claude.use('tts').then(t => { CTTS = t || null; }).catch(() => {});
  } catch (e) {}
}

/* ---------- curriculum helpers ---------- */
const dayIdx = d => diffDays(START, d);
const dayOf = d => { const i = dayIdx(d); return i >= 0 && i < DAYS.length ? DAYS[i] : null; };
const dateOfIdx = i => addDays(START, i);
const japanDay = d => diffDays(DEPART, d) + 1; // 1 on 1/7
function weekNow() { const i = dayIdx(today()); if (i < 0) return 1; if (i >= DAYS.length) return 7; return DAYS[i].w; }
function hangulMode() {
  const m = S.settings.hangul;
  if (m !== 'auto') return m;
  const w = weekNow();
  return w <= 2 ? 'show' : w === 3 ? 'tap' : 'hide';
}
function setStat(date, n) { return ((S.sets[date] || {})[n] || {}).st || ''; }
function dayItems(i) {
  const d = DAYS[i]; if (!d) return [];
  const out = [];
  if (d.s1 && d.s1.kana) d.s1.kana.forEach(k => out.push('k:' + k));
  if (d.s2 && d.s2.ph) d.s2.ph.forEach(p => out.push('p:' + p));
  if (d.s2 && d.s2.signs) for (let j = d.s2.signs[0]; j < d.s2.signs[1]; j++) out.push('s:' + j);
  return out;
}
function unlockDay(i) {
  let n = 0;
  dayItems(i).forEach(id => { if (!S.cards[id]) { S.cards[id] = {b: 1, due: today(), n: 0, w: 0}; n++; } });
  return n;
}
function addCard(id) { if (!S.cards[id]) { S.cards[id] = {b: 1, due: today(), n: 0, w: 0}; save(); return true; } return false; }
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function grade(id, r) {
  const c = S.cards[id] || (S.cards[id] = {b: 1, due: today(), n: 0, w: 0});
  c.n++;
  if (r === 'wrong') { c.b = 1; c.w++; c.due = addDays(today(), 1); }
  else if (r === 'slow') { c.due = addDays(today(), BOX_DAYS[c.b] || 1); }
  else { c.b = Math.min(c.b + 1, 6); c.due = c.b >= 6 ? addDays(today(), 45) : addDays(today(), BOX_DAYS[c.b]); }
  c.last = today();
}
function dueCards() { const t = today(); return Object.keys(S.cards).filter(id => S.cards[id].due <= t && cardExists(id)); }
function cardExists(id) {
  const [t, v] = [id.slice(0, 1), id.slice(2)];
  if (t === 'k') return !!KANA_INFO[v];
  if (t === 'p') return !!PH_BY[v];
  if (t === 's') return !!SIGNS[+v];
  if (t === 'c') return S.custom.some(c => c.id === v);
  return false;
}
function kanaStat(k, ok, ms) {
  const s = S.kanaStat[k] || (S.kanaStat[k] = [0, 0, 0]);
  if (ok) s[0]++; else s[1]++;
  s[2] = s[2] ? Math.round(s[2] * .7 + ms * .3) : Math.round(ms);
}
const weakKana = pool => pool.filter(k => { const s = S.kanaStat[k]; return s && (s[1] > 0 && s[1] >= s[0] * .34 || s[2] > 2500); });

/* ---------- kana → hangul reading ---------- */
const HG = {'あ':'아','い':'이','う':'우','え':'에','お':'오','か':'카','き':'키','く':'쿠','け':'케','こ':'코','が':'가','ぎ':'기','ぐ':'구','げ':'게','ご':'고','さ':'사','し':'시','す':'스','せ':'세','そ':'소','ざ':'자','じ':'지','ず':'즈','ぜ':'제','ぞ':'조','た':'타','ち':'치','つ':'츠','て':'테','と':'토','だ':'다','ぢ':'지','づ':'즈','で':'데','ど':'도','な':'나','に':'니','ぬ':'누','ね':'네','の':'노','は':'하','ひ':'히','ふ':'후','へ':'헤','ほ':'호','ば':'바','び':'비','ぶ':'부','べ':'베','ぼ':'보','ぱ':'파','ぴ':'피','ぷ':'푸','ぺ':'페','ぽ':'포','ま':'마','み':'미','む':'무','め':'메','も':'모','や':'야','ゆ':'유','よ':'요','ら':'라','り':'리','る':'루','れ':'레','ろ':'로','わ':'와','を':'오','ゔ':'부','ぁ':'아','ぃ':'이','ぅ':'우','ぇ':'에','ぉ':'오','ゃ':'야','ゅ':'유','ょ':'요'};
const HG2 = {'きゃ':'캬','きゅ':'큐','きょ':'쿄','ぎゃ':'갸','ぎゅ':'규','ぎょ':'교','しゃ':'샤','しゅ':'슈','しょ':'쇼','じゃ':'자','じゅ':'주','じょ':'조','ちゃ':'차','ちゅ':'추','ちょ':'초','にゃ':'냐','にゅ':'뉴','にょ':'뇨','ひゃ':'햐','ひゅ':'휴','ひょ':'효','びゃ':'뱌','びゅ':'뷰','びょ':'뵤','ぴゃ':'퍄','ぴゅ':'퓨','ぴょ':'표','みゃ':'먀','みゅ':'뮤','みょ':'묘','りゃ':'랴','りゅ':'류','りょ':'료','ふぁ':'화','ふぃ':'휘','ふぇ':'페','ふぉ':'포','てぃ':'티','でぃ':'디','とぅ':'투','どぅ':'두','うぃ':'위','うぇ':'웨','うぉ':'워','ちぇ':'체','しぇ':'셰','じぇ':'제','ゔぁ':'바','ゔぃ':'비','ゔぇ':'베','ゔぉ':'보'};
const VOWEL_SETS = {a:'あかがさざただなはばぱまやらわぁゃ',i:'いきぎしじちぢにひびぴみりぃ',u:'うくぐすずつづぬふぶぷむゆるぅゅゔ',e:'えけげせぜてでねへべぺめれぇ',o:'おこごそぞとどのほぼぽもよろをぉょ'};
const vowelOf = c => { for (const v in VOWEL_SETS) if (VOWEL_SETS[v].includes(c)) return v; return ''; };
const kataToHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function addFinal(out, T) {
  const c = out.charCodeAt(out.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 === 0) return out.slice(0, -1) + String.fromCharCode(c + T);
  return T === 4 ? out + '응' : out;
}
function toHangul(src) {
  let s = String(src).replace(/_は/g, '\u0001').replace(/_へ/g, '\u0002').replace(/_を/g, '\u0003').replace(/_/g, '');
  s = kataToHira(s);
  let out = '', pv = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], two = s.substr(i, 2);
    if (c === '\u0001') { out += '와'; pv = 'a'; continue; }
    if (c === '\u0002') { out += '에'; pv = 'e'; continue; }
    if (c === '\u0003') { out += '오'; pv = 'o'; continue; }
    if (c === 'っ') { out = addFinal(out, 19); pv = ''; continue; }
    if (c === 'ん') { out = addFinal(out, 4); pv = ''; continue; }
    if (c === 'ー') { out += '-'; continue; }
    if (HG2[two]) { out += HG2[two]; pv = vowelOf(two[1]); i++; continue; }
    if (HG[c]) {
      if (pv && ((c === 'う' && (pv === 'o' || pv === 'u')) || (c === 'い' && (pv === 'e' || pv === 'i')) || (c === 'あ' && pv === 'a') || (c === 'え' && pv === 'e') || (c === 'お' && pv === 'o'))) { out += '-'; pv = ''; continue; }
      out += HG[c]; pv = vowelOf(c); continue;
    }
    const p = {' ':' ','、':', ','。':'. ','?':'?','!':'!','?':'?','!':'!','〜':'~'}[c];
    out += p !== undefined ? p : c; pv = '';
  }
  return out.replace(/\s+/g, ' ').trim();
}
const clean = s => String(s).replace(/_/g, '');
const ttsText = s => clean(s).replace(/〇〇/g, 'なになに').replace(/\((.*?)\)/g, '');

/* ---------- numbers in kana ---------- */
const D1 = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
function u10k(n) {
  let s = '';
  const th = Math.floor(n / 1000), hu = Math.floor(n % 1000 / 100), te = Math.floor(n % 100 / 10), on = n % 10;
  if (th) s += ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'][th];
  if (hu) s += ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'][hu];
  if (te) s += (te === 1 ? '' : D1[te]) + 'じゅう';
  if (on) s += D1[on];
  return s;
}
const numKana = n => n === 0 ? 'ゼロ' : (Math.floor(n / 10000) ? u10k(Math.floor(n / 10000)) + 'まん' : '') + (n % 10000 ? u10k(n % 10000) : '');
const HOURK = ['', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ'];
function minKana(m) {
  if (!m) return '';
  const t = Math.floor(m / 10), o = m % 10;
  const tens = t ? (t === 1 ? '' : D1[t]) + 'じゅう' : '';
  if (o === 0) return tens.replace(/じゅう$/, 'じゅっぷん');
  if (o === 5) return tens + 'ごふん';
  return tens + D1[o] + 'ふん';
}
const NUM_LEVELS = [
  null,
  {n:'0~10',gen:() => { const n = rnd(0, 10); return {v: String(n), k: numKana(n), show: String(n)}; }},
  {n:'11~99',gen:() => { const n = rnd(11, 99); return {v: String(n), k: numKana(n), show: String(n)}; }},
  {n:'100~990엔',gen:() => { const n = rnd(10, 99) * 10; return {v: String(n), k: numKana(n) + 'えん', show: n.toLocaleString() + '円'}; }},
  {n:'1천~9천엔',gen:() => { const n = rnd(100, 999) * 10; return {v: String(n), k: numKana(n) + 'えん', show: n.toLocaleString() + '円'}; }},
  {n:'1만~9만엔',gen:() => { const n = rnd(100, 999) * 100; return {v: String(n), k: numKana(n) + 'えん', show: n.toLocaleString() + '円'}; }},
  {n:'시각',gen:() => { const h = rnd(1, 12), m = Math.random() < .5 ? 0 : 30; return {v: h + ':' + pad(m), k: HOURK[h] + minKana(m), show: h + '時' + (m ? m + '分' : ''), time: true}; }},
  {n:'시각+분',gen:() => { const h = rnd(1, 12), m = rnd(1, 11) * 5; return {v: h + ':' + pad(m), k: HOURK[h] + minKana(m), show: h + '時' + m + '分', time: true}; }}
];

/* ---------- speech ---------- */
let VOICES = [], JA = null;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  try {
    VOICES = speechSynthesis.getVoices();
    const ja = VOICES.filter(v => /^ja/i.test(v.lang));
    JA = ja.find(v => v.voiceURI === S.settings.voice) || ja.find(v => /Kyoko|O-ren|Google/i.test(v.name)) || ja[0] || null;
  } catch (e) {}
}
if ('speechSynthesis' in window) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch (e) {} }
const jaVoices = () => VOICES.filter(v => /^ja/i.test(v.lang));
function speak(text, opt = {}) {
  const t = ttsText(text);
  if (!t.trim()) return;
  const rate = opt.rate || S.settings.rate;
  if ('speechSynthesis' in window && (JA || !CTTS)) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'ja-JP'; u.rate = rate;
      let v = JA;
      if (opt.male) { const m = jaVoices().find(x => /Otoya|Hattori|Ichiro|Keita|Daichi|Naoki|Male/i.test(x.name)); if (m) v = m; }
      if (v) u.voice = v;
      speechSynthesis.speak(u);
      return;
    } catch (e) {}
  }
  if (CTTS) { CTTS.speak(t, {language: 'ja', rate: clamp(rate, .7, 1.5)}).catch(() => {}); return; }
  toast('이 기기에서 일본어 음성을 찾지 못했어');
}

/* ---------- UI primitives ---------- */
let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
function haptic() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }

const PAGES = [];
function pushPage(title, build, opt = {}) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = `<header class="topbar"><div class="side"><button class="navbtn" data-act="back">${IC.back}<span>${esc(opt.backLabel || '뒤로')}</span></button></div><div class="mini">${esc(title)}</div><div class="side r">${opt.right || ''}</div></header><div class="inner"></div>`;
  document.body.appendChild(el);
  const inner = $('.inner', el);
  const page = {el, inner, title, build, opt, onClose: null};
  page.render = () => { inner.innerHTML = ''; build(inner, page); };
  el.addEventListener('scroll', () => $('.topbar', el).classList.toggle('scrolled', el.scrollTop > 24), {passive: true});
  PAGES.push(page);
  page.render();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  updateLive();
  return page;
}
function popPage() {
  const p = PAGES.pop(); if (!p) return;
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  if (p.onClose) p.onClose();
  p.el.classList.remove('show');
  setTimeout(() => p.el.remove(), reduceMotion() ? 0 : 340);
  const top = PAGES[PAGES.length - 1];
  if (top && top.opt.refresh) top.render();
  if (!top) render();
  updateLive();
}
function closeAllPages() { while (PAGES.length) { const p = PAGES.pop(); if (p.onClose) p.onClose(); p.el.remove(); } updateLive(); }
let SHEET = null;
function openSheet(build, opt = {}) {
  closeSheet(true);
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = '<div class="grab"></div><div class="sbody"></div>';
  document.body.append(scrim, sh);
  SHEET = {scrim, sh, body: $('.sbody', sh), opt};
  build(SHEET.body, SHEET);
  if (!opt.sticky) scrim.addEventListener('click', () => closeSheet());
  requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); sh.classList.add('show'); }));
  return SHEET;
}
function closeSheet(instant) {
  if (!SHEET) return;
  const {scrim, sh, opt} = SHEET; SHEET = null;
  if (opt.onClose) opt.onClose();
  if (instant || reduceMotion()) { scrim.remove(); sh.remove(); return; }
  scrim.classList.remove('show'); sh.classList.remove('show');
  setTimeout(() => { scrim.remove(); sh.remove(); }, 320);
}
function rowHTML({act = '', data = {}, icon = '', title = '', sub = '', value = '', chev = true, cls = ''}) {
  const d = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const tag = act ? 'button' : 'div';
  return `<${tag} class="row ${icon ? 'ic' : ''} ${cls}" ${act ? `data-act="${act}"` : ''}${d}>${icon}<span class="t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${value ? `<span class="v">${value}</span>` : ''}${chev && act ? IC.chev : ''}</${tag}>`;
}
const spkBtn = (text, extra = '') => `<button class="spk" data-act="say" data-t="${esc(text)}" ${extra} aria-label="듣기">${IC.spk}</button>`;
function hgSpan(kana) {
  const m = hangulMode();
  if (m === 'hide') return '';
  const h = esc(toHangul(kana));
  return m === 'tap' ? `<button class="hg hid" data-act="reveal" aria-label="한글 발음 보기">${h}</button>` : `<span class="hg">${h}</span>`;
}
function phraseRow(p, opt = {}) {
  const cas = S.settings.casual && p.c;
  return `<div class="ph">
    <div class="tx">
      <span class="jp" lang="ja">${p.w === 'staff' ? '<span class="tag staff">들을 말</span>' : ''}${esc(clean(p.k))}</span>
      ${hgSpan(p.k)}
      <span class="ko">${esc(p.ko)}</span>
      ${p.c ? `<span class="cas" lang="ja"><span class="tag cas">친구</span>${esc(p.c)}${p.cn ? ` <span class="note">· ${esc(p.cn)}</span>` : ''}</span>` : ''}
      ${p.n && !opt.noNote ? `<span class="note">${esc(p.n)}</span>` : ''}
    </div>
    <div class="stack" style="gap:6px">${spkBtn(p.k)}${cas ? spkBtn(p.cr || p.c, 'style="background:transparent;border:1px solid var(--tint-soft)"') : ''}</div>
  </div>`;
}
