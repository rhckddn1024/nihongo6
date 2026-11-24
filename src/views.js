/* ================= VIEWS ================= */
const TABS = [['learn', '학습', 'path'], ['practice', '연습', 'review'], ['talk', '회화', 'talk'], ['me', '나', 'me']];
const appEl = $('#app');
const VIEW = {scrolled: false};

function render() {
  if (!TABS.some(t => t[0] === S.tab)) S.tab = 'learn';
  const y = window.scrollY;
  appEl.innerHTML = '';
  ({learn: vLearn, practice: vPractice, talk: vTalk, me: vMe})[S.tab](appEl);
  renderTabbar();
  updateLive();
  if (S.tab === 'learn' && !VIEW.scrolled) {
    VIEW.scrolled = true;
    const cur = $('.node.s-current') || $('.day.is-today');
    if (cur) requestAnimationFrame(() => cur.scrollIntoView({block: 'center'}));
  } else window.scrollTo(0, y);
}
function renderTabbar() {
  let bar = $('.tabbar');
  if (!bar) { bar = document.createElement('div'); bar.className = 'tabbar'; document.body.appendChild(bar); }
  const due = dueCards().length;
  bar.innerHTML = `<nav aria-label="탭">${TABS.map(([id, label, ic]) => `<button class="${S.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${IC[ic]}<span>${label}</span>${id === 'practice' && due ? `<i class="tb-badge">${due > 99 ? '99+' : due}</i>` : ''}</button>`).join('')}</nav>`;
}
function onScroll() { const tb = $('#app .topbar'); if (tb) tb.classList.toggle('scrolled', window.scrollY > 30); }
window.addEventListener('scroll', onScroll, {passive: true});

/* ---------- learn: the path ---------- */
const ZIG = [0, 44, 68, 44, 0, -44, -68, -44];
const openUntil = () => { const t = today(); return t < START ? START : addDays(t, 1); };
function currentNode() {
  const t = today(), base = t < START ? START : t;
  for (const d of [base, addDays(base, 1)]) {
    const i = dayIdx(d); if (i < 0 || i >= DAYS.length) continue;
    for (const n of [1, 2, 3]) if (setStat(d, n) !== 'done') return {date: d, n};
  }
  return null;
}
function nodeState(date, n, cur, until) {
  const st = setStat(date, n);
  if (st === 'done') return 'done';
  if (cur && cur.date === date && cur.n === n) return 'current';
  if (date > until) return 'locked';
  if (date < today()) return 'missed';
  return 'open';
}
const STATE_LABEL = {done: '완료', current: '지금 할 차례', locked: '아직 잠김', missed: '밀림', open: '열림'};
function goalRing(n) {
  const C = 2 * Math.PI * 9;
  return `<svg viewBox="0 0 24 24" class="gring" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--fill)" stroke-width="3.2"/><circle cx="12" cy="12" r="9" fill="none" stroke="var(--green)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - n / 3)}" transform="rotate(-90 12 12)"/></svg>`;
}
function missedSets() {
  const t = today(), out = [];
  for (let k = 3; k >= 1; k--) {
    const d = addDays(t, -k), i = dayIdx(d);
    if (i < 0 || i >= DAYS.length) continue;
    [1, 2, 3].forEach(n => { if (setStat(d, n) !== 'done') out.push({date: d, n}); });
  }
  return out;
}
function vLearn(el) {
  const t = today(), sk = streak(), xp = xpOn(t), dd = diffDays(t, DEPART);
  const doneToday = dayOf(t) ? [1, 2, 3].filter(n => setStat(t, n) === 'done').length : 0;
  const cur = currentNode(), until = openUntil();
  let h = `<header class="pathbar topbar">
    <div class="pstat fire ${activeOn(t) ? 'on' : ''}" aria-label="연속 ${sk}일">${IC.flame}<b>${sk}</b></div>
    <div class="pstat xp" aria-label="오늘 ${xp} XP">${IC.bolt}<b>${xp}</b><span>XP</span></div>
    <div class="pstat goal" aria-label="오늘 세트 ${doneToday}개 완료">${goalRing(doneToday)}<b>${doneToday}/3</b></div>
    <div class="pstat dday">${IC.plane}<b>${dd > 0 ? 'D-' + dd : dd === 0 ? '출국일' : japanDay(t) + '일째'}</b></div>
  </header>`;
  if (t < START) h += `<div class="notice"><b>${diffDays(t, START) === 1 ? '내일' : fmtDate(START).replace(/ \S+요일$/, '')}부터 시작해요</b><p>첫날 레슨은 지금 미리 해 봐도 돼요.</p></div>`;
  h += installBanner();
  const missed = missedSets();
  if (missed.length) h += `<button class="notice warn" data-act="node" data-d="${missed[0].date}" data-n="${missed[0].n}"><b>밀린 세트가 ${missed.length}개 있어요</b><p>${fmtDate(missed[0].date)} 세트 ${missed[0].n}부터 해요</p>${IC.chev}</button>`;
  let gi = 0;
  h += '<div class="path">';
  for (let w = 1; w <= 6; w++) {
    h += `<section class="unit" style="--c:${UNIT_COL[w]}"><div class="ubanner"><div><small>${w}주차</small><b>${esc(WEEK_THEME[w])}</b></div><button class="ubtn" data-act="week" data-w="${w}">${IC.list}<span>일정</span></button></div>`;
    DAYS.forEach((d, i) => {
      if (d.w !== w) return;
      const date = dateOfIdx(i);
      h += `<div class="day ${date === t ? 'is-today' : ''}" id="day-${date}"><div class="dlabel"><span>${fmtDate(date)}${date === t ? '<em>오늘</em>' : ''}</span><small>${esc(d.t)}</small></div>`;
      [1, 2, 3].forEach(n => {
        const info = setInfo(i, n), s = nodeState(date, n, cur, until);
        const icon = s === 'done' ? IC.check : s === 'locked' ? IC.lock : IC[info.icon];
        h += `<div class="nwrap" style="--x:${ZIG[gi++ % 8]}px">${s === 'current' ? '<span class="nstart">시작</span>' : ''}<button class="node s-${s}" data-act="node" data-d="${date}" data-n="${n}" aria-label="${fmtDate(date)} 세트 ${n}, ${esc(info.name)}, ${STATE_LABEL[s]}"><span class="nc">${icon}</span></button><span class="ncap">${esc(info.short)}</span></div>`;
      });
      h += '</div>';
    });
    h += '</section>';
  }
  h += '</div>' + japanUnit();
  el.innerHTML = h;
}
function japanUnit() {
  const t = today(), jd = japanDay(t);
  let h = `<section class="unit" style="--c:${UNIT_COL[7]}"><div class="ubanner"><div><small>1월 7일부터</small><b>일본에서</b></div></div>`;
  if (jd < 1) h += `<div class="card jcard"><p>도착하면 교재 13~18과를 이틀에 한 과씩 봐요. 복습 카드와 그날 들은 말 정리는 매일 해요.</p></div>`;
  else {
    const ch = Math.min(18, 13 + Math.floor((jd - 1) / 2));
    h += `<div class="list">${rowHTML({act: 'reviewLesson', icon: iconTile('review', COL.cyan), title: '오늘 복습', sub: `다시 볼 카드 ${dueCards().length}장`})}${rowHTML({act: 'book', icon: iconTile('book', COL.orange), title: `교재 ${ch}과`, sub: `<span lang="ja">${esc(BOOK[ch].t)}</span>`})}${rowHTML({act: 'memo', icon: iconTile('pen', COL.indigo), title: '오늘 들은 말 적기', sub: '못 알아들은 말을 적어 두면 복습에 나와요'})}</div>`;
  }
  return h + '</section>';
}
const reasonLabel = k => (REASONS.find(r => r[0] === k) || [0, ''])[1];
function openSetSheet(date, n) {
  const i = dayIdx(date), d = DAYS[i];
  if (!d) return;
  const info = setInfo(i, n), rec = setRec(date, n), locked = date > openUntil();
  const bp = n === 1 && info.kind === 's1' ? bookPart(i) : null;
  const rows = setContents(i, n);
  openSheet(b => {
    b.innerHTML = `<div class="sshead" style="--c:${UNIT_COL[d.w]}"><span class="snode">${IC[info.icon]}</span><div><p class="tiny">${fmtDate(date)} · 세트 ${n} · ${S.settings.times[n - 1]}</p><h2>${esc(info.name)}</h2></div></div>
      <div class="list mt12">${rows.map(r => rowHTML({act: r.act || '', data: r.data || {}, icon: iconTile(r.icon, r.col), title: r.t, sub: r.s})).join('')}</div>
      ${n === 1 && d.tip ? `<p class="sf">${esc(d.tip)}</p>` : ''}
      ${rec && rec.st === 'done' ? `<p class="chip ok">${IC.check} 완료${rec.acc != null ? ` · 정확도 ${rec.acc}%` : ''}</p>` : rec && rec.st ? `<p class="chip warn">${rec.st === 'part' ? '반만 했어요' : '못 했어요'}${rec.why ? ' · ' + esc(reasonLabel(rec.why)) : ''}</p>` : ''}
      <div class="stack mt16">
        ${locked ? `<button class="btn" disabled>${fmtShort(date)}에 열려요</button>` : `<button class="btn" data-go>${rec && rec.st === 'done' ? '다시 하기' : info.kind === 'test' ? '테스트 시작' : '레슨 시작'}</button>`}
        ${bp && !locked ? `<button class="btn soft" data-timer>${IC.timer} 교재 읽기 20분 타이머</button>` : ''}
      </div>`;
    const go = $('[data-go]', b); if (go) go.addEventListener('click', () => { closeSheet(true); startSet(date, n); });
    const tm = $('[data-timer]', b); if (tm) tm.addEventListener('click', () => { closeSheet(true); if (S.run) { openFocus(); return; } startRun(date, n, 20); });
  });
}

/* ---------- practice ---------- */
function vPractice(el) {
  const due = dueCards().length, total = Object.keys(S.cards).filter(cardExists).length;
  el.innerHTML = `<header class="topbar"><div class="side"></div><div class="mini">연습</div><div class="side r"></div></header>
    <h1 class="large">연습</h1>
    <div class="card hero-due"><div><b class="kbd">${due}</b><span>${due ? '장을 다시 볼 때가 됐어요' : total ? '오늘 다시 볼 카드는 끝났어요' : '레슨을 하면 카드가 쌓여요'}</span></div><button class="btn ${due ? '' : 'soft'}" data-act="reviewLesson" ${total ? '' : 'disabled'}>복습 레슨</button></div>
    <p class="sh">글자</p><div class="list">
      ${rowHTML({act: 'kana', data: {set: 'hira'}, icon: iconTile('kana', COL.red), title: '히라가나', sub: '46자'})}
      ${rowHTML({act: 'kana', data: {set: 'kata'}, icon: iconTile('kana', COL.orange), title: '가타카나', sub: '46자'})}
      ${rowHTML({act: 'kana', data: {set: 'daku'}, icon: iconTile('kana', COL.pink), title: '탁음과 반탁음', sub: 'が ざ だ ば ぱ'})}
      ${rowHTML({act: 'kana', data: {set: 'yoon'}, icon: iconTile('kana', COL.purple), title: '요음', sub: 'きゃ しゅ ちょ'})}
      ${rowHTML({act: 'confuse', icon: iconTile('kana', COL.indigo), title: '헷갈리는 글자', sub: 'さ ち, シ ツ, ソ ン'})}
    </div>
    <p class="sh">듣기</p><div class="list">
      ${rowHTML({act: 'numbers', icon: iconTile('num', COL.orange), title: '숫자와 가격', sub: '가격, 시각 듣고 적기'})}
      ${rowHTML({act: 'pairs', icon: iconTile('ear', COL.green), title: '발음 구별', sub: 'おばさん과 おばあさん'})}
      ${rowHTML({act: 'pitfalls', icon: iconTile('ear', COL.teal), title: '한국 사람이 자주 틀리는 발음', sub: '탁음, つ, 장음'})}
    </div>
    <p class="sh">읽기</p><div class="list">
      ${rowHTML({act: 'hanja', icon: iconTile('han', COL.brown), title: '한자어 읽기 규칙', sub: '약속 やくそく, 학생 がくせい'})}
      ${rowHTML({act: 'signs', icon: iconTile('sign', COL.gray), title: '간판 한자', sub: '입구, 출구, 할인'})}
      ${rowHTML({act: 'menu', icon: iconTile('doc', COL.blue), title: '가타카나 메뉴', sub: 'コーヒー, カレー'})}
    </div>
    <p class="sh">표현</p><div class="list">
      ${rowHTML({act: 'scenes', icon: iconTile('chat', COL.green), title: '장면별 표현', sub: `${PH.length}개`})}
      ${rowHTML({act: 'core', icon: iconTile('bolt', COL.orange), title: '핵심 30문장', sub: '이것만 입에 붙으면 한 달은 버텨요'})}
      ${rowHTML({act: 'shadowAll', icon: iconTile('spk', COL.cyan), title: '따라 말하기', sub: '배운 표현을 듣고 바로 따라 해요'})}
    </div>
    <p class="sh">내 기록</p><div class="list">
      ${rowHTML({act: 'recall', icon: iconTile('pen', COL.indigo), title: '떠올려 적기', sub: '오늘 배운 걸 안 보고 적어 봐요'})}
      ${rowHTML({act: 'memo', icon: iconTile('plus', COL.green), title: '카드 직접 만들기', sub: '교재 단어나 현지에서 들은 말'})}
      ${rowHTML({act: 'allCards', icon: iconTile('review', COL.cyan), title: '전체 카드', value: String(total)})}
      ${rowHTML({act: 'book', icon: iconTile('book', COL.orange), title: '교재 진도', value: `${Object.values(S.book).filter(Boolean).length}/19`})}
    </div>`;
}
function pKana(set) {
  const rows = {hira: HIRA_ROWS, kata: KATA_ROWS, daku: DAKU_ROWS, yoon: YOON_ROWS}[set];
  const title = {hira: '히라가나', kata: '가타카나', daku: '탁음과 반탁음', yoon: '요음'}[set];
  const all = kanaOf(rows);
  pushPage(title, el => {
    const weak = weakKana(all);
    el.innerHTML = `<h1 class="large">${title}</h1><p class="subtitle">글자를 누르면 소리와 외우는 법이 나와요</p>
      <div class="kgrid ${set === 'yoon' ? 'k3' : ''}">${rows.flatMap(r => r[1]).map(x => {
        if (!x) return '<span class="kc empty"></span>';
        const st = S.kanaStat[x[0]], learned = !!S.cards['k:' + x[0]];
        const dot = weak.includes(x[0]) ? 'var(--orange)' : learned ? 'var(--green)' : '';
        return `<button class="kc" data-act="kanaInfo" data-k="${x[0]}" aria-label="${esc(x[2])}"><span class="kj" lang="ja">${x[0]}</span><span class="kr">${esc(x[2])}</span>${dot ? `<i class="lv" style="background:${dot}"></i>` : ''}</button>`;
      }).join('')}</div>
      <p class="sf">초록 점은 레슨에서 배운 글자, 주황 점은 자주 틀리거나 느린 글자예요.</p>
      <div class="stack mt16">
        <button class="btn" data-act="kq" data-set="${set}" data-mode="read">보고 읽기</button>
        <button class="btn soft" data-act="kq" data-set="${set}" data-mode="listen">듣고 고르기</button>
        ${weak.length ? `<button class="btn soft" data-act="kq" data-set="${set}" data-mode="weak">약한 글자 ${weak.length}개만</button>` : ''}
        ${set === 'hira' || set === 'kata' ? `<button class="btn grey" data-act="kq" data-set="${set}" data-mode="speed">전부 빠르게 읽기</button>` : ''}
      </div>`;
  }, {refresh: true});
}
function kanaSheet(k) {
  const i = KANA_INFO[k], st = S.kanaStat[k];
  const twin = isKata(k) ? kataToHira(k) : k.length === 1 && HIRA_ALL.includes(k) ? String.fromCharCode(k.charCodeAt(0) + 0x60) : '';
  openSheet(b => {
    b.innerHTML = `<div class="center"><button class="kcard" data-act="say" data-t="${k}"><span class="kbig" lang="ja">${k}</span><span class="khg">${esc(i.hg)}</span><span class="kro">${i.ro}</span></button></div>
      ${i.mn ? `<p class="kmn">${esc(i.mn)}</p>` : ''}
      <div class="list mt12">
        ${twin && KANA_INFO[twin] ? rowHTML({title: isKata(k) ? '히라가나' : '가타카나', value: `<span lang="ja" style="color:var(--label);font-size:22px">${twin}</span>`}) : ''}
        ${rowHTML({title: '기록', value: st ? `맞힘 ${st[0]} · 틀림 ${st[1]}${st[2] ? ` · ${(st[2] / 1000).toFixed(1)}초` : ''}` : '아직 없음'})}
      </div>
      <button class="btn mt16" data-act="say" data-t="${k}">${IC.spk} 다시 듣기</button>`;
  });
  speak(k);
}
function pConfuse() {
  pushPage('헷갈리는 글자', el => {
    el.innerHTML = `<h1 class="large">헷갈리는 글자</h1><p class="subtitle">모양이 비슷한 짝과 구별하는 요령</p>
      ${CONFUSE.map(c => `<p class="sh">${c.set === 'hira' ? '히라가나' : '가타카나'}</p><div class="list">${c.pairs.map(p => `<div class="ph"><span class="pair" lang="ja">${p[0]} ${p[1]}</span><div class="tx"><span class="ko" style="color:var(--label)">${esc(KANA_INFO[p[0]].hg)} · ${esc(KANA_INFO[p[1]].hg)}</span><span class="note">${esc(p[2])}</span></div></div>`).join('')}</div>`).join('')}
      <div class="stack mt24"><button class="btn" data-q="hira">히라가나로 연습</button><button class="btn soft" data-q="kata">가타카나로 연습</button></div>`;
    $$('[data-q]', el).forEach(b => b.addEventListener('click', () => runLesson({title: '헷갈리는 글자', items: shuffle(CONFUSE.find(c => c.set === b.dataset.q).pairs.concat(CONFUSE.find(c => c.set === b.dataset.q).pairs)).map(exLookAlike)})));
  });
}
function pNumbers() {
  pushPage('숫자와 가격', el => {
    el.innerHTML = `<h1 class="large">숫자와 가격</h1><p class="subtitle">듣고 숫자로 적어요. 한 판에 10문제예요.</p>
      <div class="list">${NUM_LEVELS.slice(1).map((l, j) => rowHTML({act: 'numRun', data: {lv: j + 1}, title: esc(l.n), sub: ['영부터 십까지', '두 자리 숫자', '편의점 가격', '식당과 쇼핑 가격', '숙소와 큰 물건 가격', '7시, 7시 반', '7시 25분'][j]})).join('')}</div>
      <p class="sf">300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん은 소리가 바뀌어요. 4시 よじ, 7시 しちじ, 9시 くじ도 따로 외워요.</p>`;
  });
}
function pPitfalls() {
  const P = [
    ['단어 첫머리의 が, だ, ば', '한국어 ㄱ, ㄷ, ㅂ은 첫머리에서 목이 울리지 않아요. 앞에 "응"을 살짝 붙인다는 느낌으로 내요.', 'がっこう', 'かっこう'],
    ['단어 중간의 か, た', '한국어는 중간 ㄱ, ㄷ이 저절로 울려요. たかい는 "타까이"에 가깝게 내요.', 'たかい', ''],
    ['ざ ず ぜ ぞ', '한국어에 z 소리가 없어서 じゃ로 내기 쉬워요. 혀를 윗니 뒤에 대고 목을 울려요.', 'ぞう', 'じょう'],
    ['つ', '"츠"로 내면 ちゅ나 す처럼 들려요. 혀끝을 붙였다 떼면서 [ts]로 내요.', 'つき', ''],
    ['장음', '한 박자 더 끌어요. 손뼉으로 박자를 세면 쉬워요.', 'おばあさん', 'おばさん'],
    ['촉음 っ', '받침처럼 짧게 끝내지 말고 한 박자 쉬어요.', 'きって', 'きて'],
    ['ん', 'ん도 한 박자를 다 채워요.', 'しんぶん', ''],
    ['う', '입술을 내밀지 말고 "으"와 "우" 사이로 내요.', 'うみ', '']
  ];
  pushPage('자주 틀리는 발음', el => {
    el.innerHTML = `<h1 class="large">자주 틀리는 발음</h1><p class="subtitle">일본어는 글자 하나가 한 박자예요. <span lang="ja">とうきょう</span>는 한국어로 2음절이지만 일본어로는 4박자예요.</p>
      <div class="list">${P.map(p => `<div class="ph"><div class="tx"><span class="jp" style="font-size:17px;font-weight:600">${esc(p[0])}</span><span class="ko">${esc(p[1])}</span></div><div class="vstack">${spkBtn(p[2])}${p[3] ? spkBtn(p[3], 'style="background:var(--fill);color:var(--label2)"') : ''}</div></div>`).join('')}</div>
      <p class="sf">파란 버튼이 맞는 소리, 회색 버튼이 헷갈리는 짝이에요.</p>
      <button class="btn mt16" data-act="pairs">발음 구별 연습</button>`;
  });
}
function pSigns() {
  pushPage('간판 한자', el => {
    el.innerHTML = `<h1 class="large">간판 한자</h1><p class="subtitle">쓸 줄 몰라도 돼요. 보고 뜻만 알면 충분해요.</p>
      <div class="list">${SIGNS.map(s => `<div class="ph"><span class="sgn" lang="ja">${s[0]}</span><div class="tx"><span class="ko" style="color:var(--label)">${esc(s[2])}</span><span class="hg" lang="ja">${s[1]}</span></div>${spkBtn(s[1])}</div>`).join('')}</div>
      <div class="stack mt16"><button class="btn" data-q>퀴즈 풀기</button><button class="btn soft" data-add>전부 복습 카드에 넣기</button></div>`;
    $('[data-q]', el).addEventListener('click', () => runLesson({title: '간판 한자', items: pick(SIGNS.map((_, j) => j), 12).map(exSign)}));
    $('[data-add]', el).addEventListener('click', () => { let n = 0; SIGNS.forEach((s, j) => { if (addCard('s:' + j)) n++; }); toast(n ? `${n}개를 복습 카드에 넣었어요` : '이미 다 들어 있어요'); });
  });
}
function pScenes() {
  pushPage('장면별 표현', el => {
    el.innerHTML = `<h1 class="large">장면별 표현</h1><p class="subtitle">어디서 쓰는 말인지로 묶었어요</p>
      <div class="list">${SCENE_ORDER.map(s => rowHTML({act: 'scene', data: {s}, title: SCENE_NAMES[s], value: String(PH.filter(p => p.s === s).length)})).join('')}</div>`;
  });
}
function pScene(s) {
  const list = PH.filter(p => p.s === s);
  pushPage(SCENE_NAMES[s], el => {
    el.innerHTML = `<h1 class="large">${esc(SCENE_NAMES[s])}</h1><p class="subtitle">${list.length}개 · 오른쪽 아래 버튼은 친구끼리 쓰는 말투로 들려줘요</p>
      <div class="hstack"><button class="btn sm" data-q>연습하기</button><button class="btn sm soft" data-sh>${IC.spk} 따라 말하기</button></div>
      <div class="list mt16">${list.map(p => phraseRow(p)).join('')}</div>
      <button class="btn soft mt16" data-add>이 표현들을 복습 카드에 넣기</button>`;
    $('[data-q]', el).addEventListener('click', () => runLesson({title: SCENE_NAMES[s], items: shuffle(list).slice(0, 12).map(p => p.w === 'staff' ? exHear(p) : canTile(p) && Math.random() < .5 ? exTiles(p) : Math.random() < .5 ? exJp(p) : exMeaning(p))}));
    $('[data-sh]', el).addEventListener('click', () => pShadow(list, SCENE_NAMES[s]));
    $('[data-add]', el).addEventListener('click', () => { let n = 0; list.forEach(p => { if (addCard('p:' + p.id)) n++; }); toast(n ? `${n}개를 복습 카드에 넣었어요` : '이미 다 들어 있어요'); });
  });
}
function pCore() {
  const list = CORE30.map(id => PH_BY[id]);
  pushPage('핵심 30문장', el => {
    el.innerHTML = `<h1 class="large">핵심 30문장</h1><p class="subtitle">이 30개가 입에서 바로 나오면 가게, 식당, 전철은 해결돼요</p>
      <div class="hstack"><button class="btn sm" data-c>말하기 연습</button><button class="btn sm soft" data-s>${IC.spk} 따라 말하기</button></div>
      <div class="list mt16">${list.map(p => phraseRow(p, {noNote: true})).join('')}</div>`;
    $('[data-c]', el).addEventListener('click', () => runLesson({title: '핵심 30문장', items: pick(list, 12).map(exSpeak)}));
    $('[data-s]', el).addEventListener('click', () => pShadow(list, '핵심 30문장'));
  });
}
function pShadow(list, title) {
  const st = {j: 0, playing: false, run: 0, rep: 2};
  const page = pushPage('따라 말하기', el => {
    const p = list[st.j];
    el.innerHTML = `<h1 class="large">따라 말하기</h1><p class="subtitle">${esc(title)} · 소리가 끝나면 바로 겹쳐서 말해요</p>
      <div class="flash"><span class="kind">${st.j + 1} / ${list.length}</span><div class="front ja" lang="ja">${esc(clean(p.k))}</div>${hangulMode() !== 'hide' ? `<div class="hg">${esc(toHangul(p.k))}</div>` : ''}<div class="ctx">${esc(p.ko)}</div><div class="sstate tiny" aria-live="polite"></div></div>
      <div class="hstack mt16" style="justify-content:center"><span class="tiny">반복</span><div class="seg" style="width:170px">${[1, 2, 3].map(n => `<button class="${st.rep === n ? 'on' : ''}" data-rep="${n}">${n}번</button>`).join('')}</div></div>
      <div class="rate mt16"><button class="btn grey" data-prev>이전</button><button class="btn grey" data-nx>다음</button></div>
      <button class="btn mt12" data-play>${st.playing ? IC.pause + ' 멈추기' : IC.play + ' 자동으로 넘기기'}</button>`;
    $$('[data-rep]', el).forEach(b => b.addEventListener('click', () => { st.rep = +b.dataset.rep; page.render(); }));
    $('[data-prev]', el).addEventListener('click', () => { st.j = (st.j - 1 + list.length) % list.length; stop(); page.render(); speak(list[st.j].k); });
    $('[data-nx]', el).addEventListener('click', () => { st.j = (st.j + 1) % list.length; stop(); page.render(); speak(list[st.j].k); });
    $('[data-play]', el).addEventListener('click', () => { if (st.playing) { stop(); page.render(); } else { st.playing = true; page.render(); loop(++st.run); } });
  });
  function stop() { st.playing = false; st.run++; stopSpeech(); }
  async function loop(run) {
    while (st.playing && run === st.run) {
      const p = list[st.j];
      for (let r = 0; r < st.rep && st.playing && run === st.run; r++) {
        const s = $('.sstate', page.el); if (s) s.textContent = '듣는 중';
        await speak(p.k);
        if (!st.playing || run !== st.run) return;
        const s2 = $('.sstate', page.el); if (s2) s2.textContent = '지금 따라 말해요';
        await new Promise(r2 => setTimeout(r2, 900 + clean(p.k).length * 220));
      }
      if (!st.playing || run !== st.run) return;
      st.j = (st.j + 1) % list.length; page.render();
    }
  }
  page.onClose = stop;
}
function pRecall(date) {
  date = date || today();
  const i = dayIdx(date);
  const items = i >= 0 && i < DAYS.length ? dayItems(i).filter(id => S.cards[id]) : Object.keys(S.cards).filter(id => S.cards[id].last === date);
  const st = {shown: false, missed: new Set()};
  const label = id => { const t = id[0], v = id.slice(2); if (t === 'k') return `<span lang="ja">${v}</span> ${esc(KANA_INFO[v].hg)}`; if (t === 'p') return `<span lang="ja">${esc(clean(PH_BY[v].k))}</span> · ${esc(PH_BY[v].ko)}`; if (t === 's') return `<span lang="ja">${SIGNS[+v][0]}</span> ${esc(SIGNS[+v][2])}`; return esc(id); };
  const page = pushPage('떠올려 적기', el => {
    el.innerHTML = `<h1 class="large">떠올려 적기</h1><p class="subtitle">${fmtDate(date)}에 배운 걸 기억나는 대로 적어요. 한글로 적어도 돼요.</p>
      <textarea class="field" id="rc" placeholder="あ い う え お, すみません 저기요">${esc(S.recall[date] || '')}</textarea>
      ${st.shown ? `<p class="sh">이날 배운 것. 못 떠올린 걸 눌러요</p><div class="list">${items.map(id => `<button class="row" data-miss="${id}"><span class="t"><b>${label(id)}</b></span><span class="v">${st.missed.has(id) ? '<span class="no-t">못 떠올림</span>' : ''}</span></button>`).join('') || '<div class="empty-state">이날 레슨에서 배운 항목이 없어요</div>'}</div><button class="btn mt16" data-save>저장하기</button><p class="sf">못 떠올린 건 내일 복습에 다시 나와요.</p>` : `<button class="btn mt16" data-show>정답과 맞춰 보기</button>`}`;
    const ta = $('#rc', el); ta.addEventListener('input', () => { S.recall[date] = ta.value; });
    const sh = $('[data-show]', el); if (sh) sh.addEventListener('click', () => { S.recall[date] = ta.value; save(); st.shown = true; page.render(); });
    $$('[data-miss]', el).forEach(b => b.addEventListener('click', () => { const id = b.dataset.miss; st.missed.has(id) ? st.missed.delete(id) : st.missed.add(id); page.render(); }));
    const sv = $('[data-save]', el); if (sv) sv.addEventListener('click', () => { st.missed.forEach(id => { addCard(id); grade(id, 'wrong'); }); S.recall[date] = ta.value; save(); toast(st.missed.size ? `${st.missed.size}개는 내일 다시 나와요` : '전부 떠올렸어요'); popPage(); });
  }, {keepScroll: true});
}
function pMemo() {
  pushPage('카드 만들기', el => {
    el.innerHTML = `<h1 class="large">카드 만들기</h1><p class="subtitle">교재 단어나 현지에서 들은 말을 직접 넣어요</p>
      <div class="stack"><input class="field" id="mko" placeholder="뜻 (한국어)"><input class="field" id="mjp" lang="ja" placeholder="일본어"><input class="field" id="mkana" lang="ja" placeholder="읽는 법 (히라가나, 선택)"><input class="field" id="mnote" placeholder="메모 (어디서 들었는지, 선택)">
      ${AI ? `<button class="btn soft" data-ai>${IC.sparkle} 뜻만 적고 일본어 채우기</button>` : ''}
      <button class="btn" data-save>저장</button></div>
      ${S.custom.length ? `<p class="sh">내가 만든 카드</p><div class="list">${S.custom.slice().reverse().slice(0, 30).map(c => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(c.jp)}</span><span class="ko">${esc(c.ko)}</span></div>${spkBtn(c.kana || c.jp)}</div>`).join('')}</div>` : ''}`;
    $('[data-save]', el).addEventListener('click', () => {
      const ko = $('#mko', el).value.trim(), jp = $('#mjp', el).value.trim();
      if (!ko || !jp) { toast('뜻과 일본어는 꼭 적어 주세요'); return; }
      const id = Date.now().toString(36);
      S.custom.push({id, ko, jp, kana: $('#mkana', el).value.trim(), note: $('#mnote', el).value.trim()});
      addCard('c:' + id); save(); toast('저장했어요. 오늘 복습에 나와요'); topPage().render();
    });
    const ab = $('[data-ai]', el);
    if (ab) ab.addEventListener('click', async () => {
      const ko = $('#mko', el).value.trim(); if (!ko) { toast('뜻을 먼저 적어 주세요'); return; }
      ab.disabled = true; ab.textContent = '채우는 중';
      try {
        const r = await aiJSON(`Translate this Korean into natural, simple polite Japanese a traveler would say (です・ます). Korean: "${ko}". Return ONLY JSON {"jp": Japanese with natural kanji, "kana": full reading in hiragana/katakana}.`);
        if (r && r.jp) { $('#mjp', el).value = r.jp; $('#mkana', el).value = r.kana || ''; }
      } catch (e) { toast('지금은 채울 수 없어요'); }
      ab.disabled = false; ab.innerHTML = `${IC.sparkle} 뜻만 적고 일본어 채우기`;
    });
  });
}
function pAllCards() {
  pushPage('전체 카드', el => {
    const ids = Object.keys(S.cards).filter(cardExists).sort((a, b) => S.cards[a].due.localeCompare(S.cards[b].due));
    const label = id => { const t = id[0], v = id.slice(2); if (t === 'k') return `<span lang="ja">${v}</span> · ${esc(KANA_INFO[v].hg)}`; if (t === 'p') return `<span lang="ja">${esc(clean(PH_BY[v].k))}</span>`; if (t === 's') return `<span lang="ja">${SIGNS[+v][0]}</span> · ${esc(SIGNS[+v][2])}`; const c = S.custom.find(x => x.id === v); return `<span lang="ja">${esc(c.jp)}</span> · ${esc(c.ko)}`; };
    el.innerHTML = `<h1 class="large">전체 카드</h1><p class="subtitle">${ids.length}장 · 다음에 볼 날짜 순서</p><div class="list">${ids.map(id => `<div class="row"><span class="t"><b>${label(id)}</b><small>${S.cards[id].b >= 6 ? '다 외움' : S.cards[id].b + '단계'} · 틀린 횟수 ${S.cards[id].w}</small></span><span class="v small">${fmtShort(S.cards[id].due)}</span></div>`).join('') || '<div class="empty-state">아직 카드가 없어요. 레슨을 하면 쌓여요.</div>'}</div>`;
  });
}
function pBook() {
  const sched = {};
  DAYS.forEach((d, i) => { if (d.s1 && d.s1.book) { const n = d.s1.book.ch; (sched[n] = sched[n] || []).push(dateOfIdx(i)); } });
  for (let n = 13; n <= 18; n++) sched[n] = [addDays(DEPART, (n - 13) * 2), addDays(DEPART, (n - 13) * 2 + 1)];
  pushPage('교재 진도', el => {
    el.innerHTML = `<h1 class="large">교재 진도</h1><p class="subtitle">NEW 가장 쉬운 독학 일본어 첫걸음 · 끝낸 과를 눌러 표시해요</p>
      <div class="list">${BOOK.map(b => { const dts = sched[b.n] || []; const on = !!S.book[b.n]; return `<button class="row" data-act="bookToggle" data-n="${b.n}" aria-pressed="${on}"><span class="tick ${on ? 'on' : ''}">${on ? IC.check : ''}</span><span class="t"><b lang="ja">${b.n ? b.n + '과 ' : ''}${esc(b.t)}</b><small>${esc(b.ko)} · ${b.p}~${b.e}쪽${dts.length ? ' · ' + fmtShort(dts[0]) + (dts.length > 1 ? '~' + fmtShort(dts[dts.length - 1]) : '') : ''}${b.n >= 13 ? ' · 일본에서' : ''}</small></span></button>`; }).join('')}</div>
      <p class="sf">부록의 활용표(292쪽)와 숫자, 시간 읽기는 5주차에 같이 보면 좋아요. 기초 단어 100개(314쪽)는 카드로 직접 넣어도 돼요.</p>`;
  }, {refresh: true, keepScroll: true});
}
function pWeek(w) {
  pushPage(`${w}주차`, el => {
    el.innerHTML = `<h1 class="large">${w}주차</h1><p class="subtitle">${esc(WEEK_THEME[w])}</p><div class="list">${DAYS.map((d, i) => {
      if (d.w !== w) return '';
      const dt = dateOfIdx(i);
      return `<button class="row" data-act="goDay" data-d="${dt}"><span class="t"><b>${fmtShort(dt)} ${WD[parseYmd(dt).getDay()]} · ${esc(d.t)}</b><small>${[1, 2, 3].map(n => setInfo(i, n).name).join(' · ')}</small></span><span class="dots">${[1, 2, 3].map(n => `<i class="${setStat(dt, n) === 'done' ? 'on' : ''}"></i>`).join('')}</span>${IC.chev}</button>`;
    }).join('')}</div>
      ${w === 6 ? '' : `<p class="sf">주 마지막 날은 테스트가 있는 가벼운 날이에요.</p>`}`;
  });
}
function pDepart() {
  pushPage('출국 체크리스트', el => {
    el.innerHTML = `<h1 class="large">출국 체크리스트</h1><p class="subtitle">1월 7일 출발 전에 챙길 것</p><div class="list">${DEPART_CHECK.map((c, j) => `<button class="row" data-act="checkItem" data-j="${j}" aria-pressed="${!!S.check[j]}"><span class="tick ${S.check[j] ? 'on' : ''}">${S.check[j] ? IC.check : ''}</span><span class="t"><b>${esc(c)}</b></span></button>`).join('')}</div>`;
  }, {refresh: true, keepScroll: true});
}
function pMenu() {
  runLesson({title: '가타카나 메뉴', items: pick(MENU, 12).map((m, j) => exMenu(m, j % 3 === 2))});
}

/* ---------- talk ---------- */
function vTalk(el) {
  el.innerHTML = `<header class="topbar"><div class="side"></div><div class="mini">회화</div><div class="side r"></div></header>
    <h1 class="large">회화</h1>
    <p class="sh">점원과 대화</p><div class="list">${Object.keys(RP).map(k => rowHTML({act: 'rp', data: {k}, icon: iconTile('talk', COL.blue), title: esc(RP[k].name), sub: `${RP[k].steps.length}번 주고받기`})).join('')}</div>
    <p class="sh">하루토와 대화</p>
    <div class="card hstack" style="flex-wrap:nowrap;gap:12px">${harutoAvatar(44)}<p class="small" style="margin:0">하루토는 도쿄에 사는 동갑 친구예요. 처음엔 존댓말로 시작해서 반말로 넘어가요.</p></div>
    <div class="list mt12">${CHATS.map(c => rowHTML({act: 'chat', data: {id: c.id}, title: esc(c.name), sub: esc(c.desc), value: S.talkDone[c.id] ? `<span class="ok-t">${IC.check.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')}</span>` : ''})).join('')}</div>
    <p class="sh">친구 말투</p><div class="list">
      ${rowHTML({act: 'talkRules', icon: iconTile('doc', COL.indigo), title: '존댓말을 반말로 바꾸는 규칙', sub: `${RULES.length}개`})}
      ${rowHTML({act: 'slang', icon: iconTile('chat', COL.green), title: '친구끼리 쓰는 말', sub: 'まじで, それな, うまっ'})}
      ${rowHTML({act: 'trends', icon: iconTile('sparkle', COL.purple), title: '요즘 많이 쓰는 말', sub: '일본 설문 조사에서 나온 말'})}
    </div>
    <p class="sh">Claude와 자유롭게</p><div class="list">
      ${IS_PWA ? `<a class="row ic" href="${CLAUDE_APP_URL}#talk" target="_blank" rel="noopener">${iconTile('sparkle', COL.purple)}<span class="t"><b>하루토와 자유 대화</b><small>Claude에서 열려요. 한국어로 써도 일본어로 고쳐 줘요</small></span>${IC.chev}</a>
        <a class="row ic" href="${CLAUDE_APP_URL}#talk" target="_blank" rel="noopener">${iconTile('globe', COL.blue)}<span class="t"><b>이 말 일본어로 뭐예요?</b><small>Claude에서 열려요. 말투 세 가지로 알려 줘요</small></span>${IC.chev}</a>`
      : `${rowHTML({act: 'aichat', icon: iconTile('sparkle', COL.purple), title: '하루토와 자유 대화', sub: '한국어로 써도 일본어로 고쳐 줘요'})}${rowHTML({act: 'translate', icon: iconTile('globe', COL.blue), title: '이 말 일본어로 뭐예요?', sub: '존댓말, 친구 말투, 점원에게 하는 말'})}`}
    </div>
    <p class="sh">급할 때</p><div class="list">${rowHTML({act: 'sos', icon: iconTile('sos', COL.red), title: 'SOS 카드', sub: '말이 안 나오면 화면을 보여 줘요'})}</div>`;
}
function pTalkRules() {
  pushPage('반말 규칙', el => {
    el.innerHTML = `<h1 class="large">반말 규칙</h1><p class="subtitle">교재의 존댓말을 친구 사이 말투로 바꾸는 방법이에요</p><div class="stack">${RULES.map(r => `<div class="card"><b class="ct">${esc(r.t)}</b>
      <div class="cmp mt12"><div class="grow"><div class="tiny">존댓말</div><div lang="ja" class="cj">${esc(r.a)}</div>${r.ak ? `<div class="tiny">${esc(r.ak)}</div>` : ''}</div>${spkBtn(r.a, 'style="background:var(--fill);color:var(--label2)"')}</div>
      <div class="cmp mt8"><div class="grow"><div class="tiny" style="color:var(--tint)">친구 사이</div><div lang="ja" class="cj b">${esc(r.b)}</div>${r.bk ? `<div class="tiny">${esc(r.bk)}</div>` : ''}</div>${spkBtn(r.b.split(' / ')[0], 'data-male="1"')}</div>
      <p class="tiny mt8" style="margin-bottom:0">${esc(r.x)}</p></div>`).join('')}</div>`;
  });
}
function pSlang() {
  const st = {k: 0};
  const page = pushPage('친구끼리 쓰는 말', el => {
    const c = SLANG[st.k];
    el.innerHTML = `<h1 class="large">친구끼리 쓰는 말</h1><p class="subtitle">점원이나 어른한테는 쓰지 않아요</p>
      <div class="chips scroll">${SLANG.map((s, j) => `<button class="pill ${st.k === j ? 'on' : ''}" data-k="${j}">${esc(s.cat)}</button>`).join('')}</div>
      <div class="list mt12">${c.items.map(x => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(x[0])}</span><span class="ko">${esc(x[2])}</span>${x[3] ? `<span class="note">${esc(x[3])}</span>` : ''}</div><button class="spk" data-act="say" data-t="${esc(x[1])}" data-male="1" aria-label="듣기">${IC.spk}</button></div>`).join('')}</div>
      <button class="btn soft mt16" data-q>이 묶음으로 퀴즈</button>`;
    $$('[data-k]', el).forEach(b => b.addEventListener('click', () => { st.k = +b.dataset.k; page.render(); }));
    $('[data-q]', el).addEventListener('click', () => {
      const pool = SLANG.flatMap(s => s.items);
      runLesson({title: c.cat, items: shuffle(c.items).map(x => ({t: 'choice', prompt: '무슨 뜻이에요?', q: `<div class="qjp" lang="ja">${esc(x[0])}</div>`, audio: x[1], inline: true, opts: shuffle([x, ...pick(pool.filter(y => y !== x && y[2] !== x[2]), 3)]).map(o => ({h: esc(o[2]), v: o[0]})), ans: x[0], ansLabel: `${jaSpan(x[0])} ${esc(x[2])}`, fb: x[3] ? esc(x[3]) : ''}))});
    });
  });
}
function pTrends() {
  pushPage('요즘 많이 쓰는 말', el => {
    el.innerHTML = `<h1 class="large">요즘 많이 쓰는 말</h1><p class="subtitle">유행어는 금방 낡아요. 외국인이 한두 번 섞어 쓰면 반응이 좋은 정도로만 써요.</p>
      <div class="list">${TRENDS.map(t => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(t[0])}</span><span class="ko">${esc(t[2])}</span>${t[3] ? `<span class="note">${esc(t[3])}</span>` : ''}<span class="note">출처: ${esc(t[4])}</span></div>${spkBtn(t[1], 'data-male="1"')}</div>`).join('')}</div>
      <p class="sf">일본 고등학생과 10~20대를 대상으로 한 설문 기사(LINE 리서치, Z総研)를 참고했어요. 링크는 커리큘럼 문서에 있어요.</p>`;
  });
}
function pSOS() {
  pushPage('SOS 카드', el => {
    const al = S.allergen || [];
    el.innerHTML = `<h1 class="large">SOS 카드</h1><p class="subtitle">누르면 화면 가득 크게 떠요. 상대에게 그대로 보여 주면 돼요.</p>
      <div class="list">${SOS.map((s, j) => `<button class="row" data-act="sosShow" data-j="${j}"><span class="t"><b lang="ja">${esc(s[0])}</b><small>${esc(s[1])}</small></span>${IC.chev}</button>`).join('')}</div>
      <p class="sh">알레르기 카드</p><div class="card"><div class="chips">${ALLERGENS.map(a => `<button class="pill ${al.includes(a[0]) ? 'on' : ''}" data-act="allergen" data-a="${a[0]}" aria-pressed="${al.includes(a[0])}">${esc(a[1])}</button>`).join('')}</div>
      <button class="btn mt12" data-act="sosShow" data-j="al" ${al.length ? '' : 'disabled'}>알레르기 카드 보여 주기</button></div>
      <p class="sf">일본 긴급 전화: 경찰 110, 구급차와 소방 119</p>`;
  }, {refresh: true, keepScroll: true});
}
function sosFull(text, ko) {
  const d = document.createElement('div'); d.className = 'sos'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<button class="x" aria-label="닫기">${IC.x}</button><div class="big" lang="ja">${esc(text)}</div><div class="ko">${esc(ko)}</div><button class="btn sm mt24" style="background:#000">${IC.spk} 소리로 읽어 주기</button>`;
  document.body.appendChild(d);
  $('.x', d).addEventListener('click', () => d.remove());
  $('.btn', d).addEventListener('click', () => speak(text, {rate: .85}));
}

/* ---------- AI (Claude artifact only) ---------- */
async function aiJSON(prompt) {
  if (!AI) throw new Error('no ai');
  if (typeof AI.json === 'function') { const v = await AI.json(prompt); if (v && typeof v === 'object') return v; }
  const r = await AI(prompt);
  const txt = (r && r.text) || '';
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}
function pAIChat() {
  const st = {busy: false};
  const page = pushPage('하루토', el => {
    const msgs = S.aiChat || [];
    el.innerHTML = `<div class="hstack" style="gap:12px;margin:4px 0;flex-wrap:nowrap">${harutoAvatar(44)}<div><div style="font-weight:600">하루토</div><div class="tiny">아무 말이나 걸어 봐요. 한국어로 쓰면 일본어로 바꿔 줘요</div></div></div>
      <div class="chat">${msgs.length ? '' : `<div class="sysmsg">예: 안녕! 나 한국에서 왔어</div>`}${msgs.map(m => m.r === 'me' ? `<div class="bub me">${esc(m.t)}</div>${m.better ? `<div class="fb ok"><span lang="ja">${esc(m.better)}</span>${m.tip ? `<br><span class="small">${esc(m.tip)}</span>` : ''} <button class="navbtn small" data-act="say" data-t="${esc(m.better)}" aria-label="듣기">${IC.spk}</button></div>` : ''}` : `<button class="bub them" data-act="tr" data-t="${esc(m.kana || m.t)}" lang="ja">${esc(m.t)}<span class="tr" lang="ko">${esc(m.ko || '')}</span></button>`).join('')}${st.busy ? '<div class="sysmsg">하루토가 입력 중이에요</div>' : ''}</div>
      <div class="composer"><textarea id="aiIn" rows="1" placeholder="메시지" aria-label="메시지" ${st.busy ? 'disabled' : ''}></textarea><button class="send" data-send aria-label="보내기">${IC.send}</button></div>
      ${msgs.length ? '<button class="navbtn small" data-clear>대화 지우기</button>' : ''}`;
    requestAnimationFrame(() => page.el.scrollTo({top: page.el.scrollHeight}));
    const inp = $('#aiIn', el);
    const send = async () => {
      const t = inp.value.trim(); if (!t || st.busy) return;
      S.aiChat.push({r: 'me', t}); st.busy = true; page.render();
      const hist = S.aiChat.slice(-12).map(m => (m.r === 'me' ? 'Friend: ' : 'Haruto: ') + m.t).join('\n');
      try {
        const r = await aiJSON(`You are Haruto (はると), an 18-year-old Japanese guy, a high-school senior in Tokyo, chatting on LINE with a Korean friend the same age. The friend is a beginner learning Japanese for a one-month stay in Japan from January 7. Reply like a real 18-year-old Tokyo guy: natural casual Japanese (タメ口; まじ, ガチ, 〜じゃん, 〜くね? only when natural), 1-2 short sentences, simple words a beginner can follow. Never use rude pronouns like お前 or てめえ. Keep it friendly and ask small questions to keep the chat going.\nChat so far:\n${hist}\nReturn ONLY JSON: {"jp": your reply with natural kanji, "kana": the same reply fully in hiragana/katakana, "ko": natural casual Korean translation of your reply, "better": a natural casual Japanese version of the friend's LAST message (if they wrote Korean, translate it; if it was already natural Japanese, empty string), "tip": one short, plain Korean sentence in 해요체 explaining the fix or a useful expression, or empty string}`);
        const last = S.aiChat[S.aiChat.length - 1];
        if (r) { last.better = r.better || ''; last.tip = r.tip || ''; S.aiChat.push({r: 'h', t: r.jp || '…', kana: r.kana || '', ko: r.ko || ''}); speak(r.kana || r.jp, {male: true}); }
      } catch (e) { toast(e && e.code === 'not_granted' ? 'AI 사용이 꺼져 있어요' : '지금은 답장을 받을 수 없어요. 잠시 뒤에 다시 해 봐요'); }
      S.aiChat = S.aiChat.slice(-40); st.busy = false; save(); page.render();
    };
    $('[data-send]', el).addEventListener('click', send);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    const cl = $('[data-clear]', el); if (cl) cl.addEventListener('click', () => { S.aiChat = []; save(); page.render(); });
  });
}
function pTranslate() {
  const st = {busy: false, r: null, q: ''};
  const page = pushPage('일본어로', el => {
    el.innerHTML = `<h1 class="large">일본어로</h1><p class="subtitle">하고 싶은 말을 한국어로 적으면 세 가지 말투로 알려 줘요</p>
      <textarea class="field" id="trIn" placeholder="이거 맵지 않아요? / 내일 몇 시에 만날까?">${esc(st.q)}</textarea>
      <button class="btn mt12" data-go ${st.busy ? 'disabled' : ''}>${st.busy ? '바꾸는 중' : IC.sparkle + ' 바꾸기'}</button>
      ${st.r ? `<div class="list mt16">${[['polite', '존댓말', '처음 보는 사람, 어른'], ['casual', '친구 말투', '동갑 친구'], ['clerk', '점원에게', '가게, 식당']].map(([k, l, s]) => st.r[k] ? `<div class="ph"><div class="tx"><span class="tiny">${l} · ${s}</span><span class="jp" lang="ja">${esc(st.r[k].jp)}</span><span class="hg" lang="ja">${esc(st.r[k].kana || '')}</span></div><div class="vstack">${spkBtn(st.r[k].kana || st.r[k].jp)}<button class="spk" data-addc="${k}" aria-label="카드에 넣기">${IC.plus}</button></div></div>` : '').join('')}</div>${st.r.note ? `<p class="sf">${esc(st.r.note)}</p>` : ''}` : ''}`;
    $('[data-go]', el).addEventListener('click', async () => {
      const q = $('#trIn', el).value.trim(); if (!q) return; st.q = q; st.busy = true; page.render();
      try {
        st.r = await aiJSON(`A Korean 18-year-old beginner (going to Japan for a month) wants to say this in Japanese: "${q}". Give three versions. Return ONLY JSON: {"polite": {"jp": polite です・ます Japanese with natural kanji, "kana": full kana reading}, "casual": {"jp": how an 18-year-old Tokyo guy would say it to a friend the same age (natural タメ口), "kana": kana reading}, "clerk": {"jp": the short natural phrase a young person would actually say to a shop or restaurant clerk, or the polite version if not a shop situation, "kana": kana reading}, "note": one short, plain Korean sentence in 해요체 about nuance}`);
      } catch (e) { toast('지금은 바꿀 수 없어요'); }
      st.busy = false; page.render();
    });
    $$('[data-addc]', el).forEach(b => b.addEventListener('click', () => {
      const v = st.r[b.dataset.addc]; const id = Date.now().toString(36);
      S.custom.push({id, ko: st.q, jp: v.jp, kana: v.kana || '', note: b.dataset.addc === 'casual' ? '친구 말투' : ''}); addCard('c:' + id); save(); toast('복습 카드에 넣었어요');
    }));
  });
}

/* ---------- me ---------- */
function vMe(el) {
  const t = today(), dd = diffDays(t, DEPART);
  const learned = Object.keys(S.cards).filter(cardExists).length;
  const days7 = Array.from({length: 7}, (_, j) => addDays(t, j - 6));
  const maxXP = Math.max(30, ...days7.map(xpOn));
  const reasons = REASONS.map(r => [r, S.log.filter(l => l.why === r[0]).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const voices = jaVoices();
  el.innerHTML = `<header class="topbar"><div class="side"></div><div class="mini">나</div><div class="side r"></div></header>
    <h1 class="large">나</h1>
    <div class="stats">
      <div class="stat"><span style="color:var(--orange)">${IC.flame}</span><b>${streak()}</b><small>일 연속</small></div>
      <div class="stat"><span style="color:var(--yellow-d)">${IC.bolt}</span><b>${totalXP()}</b><small>총 XP</small></div>
      <div class="stat"><span style="color:var(--tint)">${IC.review}</span><b>${learned}</b><small>복습 카드</small></div>
      <div class="stat"><span style="color:var(--purple)">${IC.plane}</span><b>${dd > 0 ? dd : japanDay(t)}</b><small>${dd > 0 ? '일 남음' : '일째 일본'}</small></div>
    </div>
    <p class="sh">최근 7일</p>
    <div class="card">${days7.some(xpOn) ? '' : '<p class="tiny center" style="margin:0 0 8px">이번 주는 아직 기록이 없어요</p>'}<div class="week7">${days7.map(d => `<div class="wcol ${d === t ? 'now' : ''}"><span class="wv">${xpOn(d) || ''}</span><i style="height:${Math.round(xpOn(d) / maxXP * 100)}%"></i><span class="wd">${WD[parseYmd(d).getDay()]}</span></div>`).join('')}</div></div>
    <p class="sh">주간 테스트</p>
    <div class="list">${[1, 2, 3, 4, 5, 6].map(w => { const r = S.tests[w]; return rowHTML({title: w === 6 ? '최종 테스트' : `${w}주차`, sub: r ? esc(r.detail || '') : esc(TEST_RULE[w]), value: r ? `<span class="${r.pass ? 'ok-t' : 'no-t'}">${r.pass ? '통과' : '다시'} ${r.score}%</span>` : '—'}); }).join('')}</div>
    ${reasons.length ? `<p class="sh">못 한 이유</p><div class="list">${reasons.map(([r, n]) => rowHTML({act: 'log', data: {why: r[0]}, title: esc(r[1]), value: `${n}번`})).join('')}</div><p class="sf">같은 이유가 세 번 넘게 나오면 그 시간대를 바꾸는 게 맞아요.</p>` : ''}
    <p class="sh">세트 시간</p>
    <div class="list">${[1, 2, 3].map(n => `<div class="row"><span class="t"><b>세트 ${n}</b><small>${['교재와 글자', '듣기와 말하기', '복습'][n - 1]}</small></span><input type="time" class="field tfield" data-time="${n - 1}" value="${S.settings.times[n - 1]}" aria-label="세트 ${n} 시간"></div>`).join('')}</div>
    <p class="sf">시작 시간에서 30분이 지나도 안 했으면 했는지 물어봐요.</p>
    ${IS_PWA ? `<div class="list mt12">${rowHTML({act: 'ics', icon: iconTile('cal', COL.red), title: '폰 캘린더에 알림 넣기', sub: '세트 시간마다 알림이 와요'})}</div>` : ''}
    <p class="sh">소리와 표시</p>
    <div class="list">
      <div class="row col"><span class="t"><b>한글 발음 표시</b><small>자동이면 1~2주차는 보이고, 3주차는 눌러야 보이고, 4주차부터 숨겨요</small></span><div class="seg">${[['auto', '자동'], ['show', '항상'], ['tap', '눌러서'], ['hide', '숨김']].map(([v, l]) => `<button class="${S.settings.hangul === v ? 'on' : ''}" data-act="set" data-k="hangul" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row col"><span class="t"><b>말하는 속도</b></span><div class="seg">${[[0.7, '느리게'], [0.9, '보통'], [1.05, '빠르게']].map(([v, l]) => `<button class="${Math.abs(S.settings.rate - v) < .01 ? 'on' : ''}" data-act="set" data-k="rate" data-v="${v}">${l}</button>`).join('')}</div></div>
      ${voices.length > 1 ? `<div class="row"><span class="t"><b>목소리</b></span><select class="field sel" data-voice aria-label="목소리">${voices.map(v => `<option value="${esc(v.voiceURI)}" ${JA && JA.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>` : ''}
      <button class="row" data-act="sfx" aria-pressed="${!!S.settings.sfx}"><span class="t"><b>효과음</b></span><span class="sw ${S.settings.sfx ? 'on' : ''}"></span></button>
    </div>
    ${voices.length ? '' : '<p class="sf">일본어 음성이 안 나오면 폰 설정의 텍스트 음성 변환에서 Google 음성 엔진과 일본어 음성 데이터를 받아 주세요.</p>'}
    <p class="sh">참고</p>
    <div class="list">
      ${rowHTML({act: 'week', data: {w: weekNow() > 6 ? 6 : weekNow()}, icon: iconTile('cal', COL.blue), title: '주차별 일정'})}
      <a class="row ic" href="${DOC_URL}" target="_blank" rel="noopener">${iconTile('doc', COL.indigo)}<span class="t"><b>커리큘럼 문서</b><small>공부 순서를 이렇게 정한 이유와 근거</small></span>${IC.chev}</a>
      ${rowHTML({act: 'depart', icon: iconTile('list', COL.green), title: '출국 체크리스트', value: `${Object.values(S.check).filter(Boolean).length}/${DEPART_CHECK.length}`})}
    </div>
    <p class="sh">기록 보관</p>
    <div class="list">
      ${rowHTML({act: 'backup', title: '백업 복사하기', sub: '메모 앱에 붙여 두면 돼요'})}
      ${IS_PWA ? rowHTML({act: 'backupFile', title: '백업 파일로 저장'}) : ''}
      ${rowHTML({act: 'restore', title: '백업에서 되살리기'})}
      ${rowHTML({act: 'reset', title: '<span style="color:var(--red)">처음부터 다시 하기</span>'})}
    </div>
    <p class="sf">${syncState === 'synced' ? 'Claude 계정에 기록이 저장되고 있어요.' : IS_PWA ? '기록은 이 폰에만 저장돼요. 가끔 백업해 두세요.' : '기록은 이 기기에 저장돼요.'}</p>`;
  $$('[data-time]', el).forEach(inp => inp.addEventListener('change', () => { if (inp.value) { S.settings.times[+inp.dataset.time] = inp.value; save(); toast('세트 시간을 바꿨어요'); } }));
  const vs = $('[data-voice]', el); if (vs) vs.addEventListener('change', () => { S.settings.voice = vs.value; loadVoices(); save(); speak('こんにちは'); });
}
function pLog(why) {
  pushPage('못 한 기록', el => {
    const list = S.log.filter(l => !why || l.why === why).slice().reverse();
    el.innerHTML = `<h1 class="large">${esc(reasonLabel(why) || '못 한 기록')}</h1><p class="subtitle">${list.length}번</p><div class="list">${list.map(l => rowHTML({title: `${fmtDate(l.d)} · 세트 ${l.set}`, sub: `${l.st === 'part' ? '반만 함' : '못 함'}${l.note ? ' · ' + esc(l.note) : ''}`})).join('')}</div>`;
  });
}

/* ================= ACTIONS ================= */
const ACT = {
  back: () => popPage(),
  say: d => speak(d.t, {male: d.male === '1'}),
  reveal: (d, el) => el.classList.remove('hid'),
  tr: (d, el) => { const tr = $('.tr', el); if (tr) tr.hidden = !tr.hidden; if (d.t) speak(d.t, {male: true}); },
  tab: d => { closeAllPages(); closeSheet(true); S.tab = d.tab; save(); try { history.replaceState(null, '', '#' + d.tab); } catch (e) {} if (d.tab === 'learn') VIEW.scrolled = false; window.scrollTo(0, 0); render(); },
  node: d => openSetSheet(d.d, +d.n),
  week: d => pWeek(+d.w),
  goDay: d => { closeAllPages(); S.tab = 'learn'; render(); const el = document.getElementById('day-' + d.d); if (el) el.scrollIntoView({block: 'start'}); window.scrollBy(0, -140); },
  reviewLesson: () => { const items = reviewItems(); if (!items.length) { toast('아직 복습할 카드가 없어요'); return; } runLesson({title: '복습', items, srs: true}); },
  kana: d => pKana(d.set),
  kanaInfo: d => kanaSheet(d.k),
  kq: d => {
    const all = kanaOf({hira: HIRA_ROWS, kata: KATA_ROWS, daku: DAKU_ROWS, yoon: YOON_ROWS}[d.set]);
    if (d.mode === 'speed') { runLesson({title: '전부 빠르게 읽기', items: shuffle(all).map(k => exRead(k, all, true)), requeue: false}); return; }
    if (d.mode === 'weak') { const w = weakKana(all); runLesson({title: '약한 글자', items: shuffle([...w.map(k => exRead(k, all)), ...w.map(k => exListenKana(k, all))])}); return; }
    const list = pick(all, 14);
    runLesson({title: d.mode === 'listen' ? '듣고 고르기' : '보고 읽기', items: [...list.map(k => d.mode === 'listen' ? exListenKana(k, all) : exRead(k, all)), exMatchKana(pick(all, 8))]});
  },
  confuse: () => pConfuse(),
  numbers: () => pNumbers(),
  numRun: d => runLesson({title: NUM_LEVELS[+d.lv].n, items: Array.from({length: 10}, () => exNum(+d.lv))}),
  pairs: () => runLesson({title: '발음 구별', items: pairSet(null, 12)}),
  pitfalls: () => pPitfalls(),
  hanja: () => runLesson({title: '한자어 읽기', items: [{t: 'rule', ...RULE_CARDS.hanja1[0]}, {t: 'rule', ...RULE_CARDS.hanja2[0]}, ...pick(HANJAEO, 12).map(exHanja)]}),
  signs: () => pSigns(),
  menu: () => pMenu(),
  scenes: () => pScenes(),
  scene: d => pScene(d.s),
  core: () => pCore(),
  shadowAll: () => { const ids = uniq(Object.keys(S.cards).filter(id => id.startsWith('p:')).map(id => id.slice(2))); const list = (ids.length ? ids : CORE30).map(id => PH_BY[id]).filter(Boolean); pShadow(list, ids.length ? '지금까지 배운 표현' : '핵심 30문장'); },
  recall: d => pRecall(d.d),
  memo: () => pMemo(),
  allCards: () => pAllCards(),
  book: () => pBook(),
  bookToggle: d => { S.book[d.n] = !S.book[d.n]; save(); topPage().render(); },
  depart: () => pDepart(),
  checkItem: d => { S.check[d.j] = !S.check[d.j]; save(); topPage().render(); },
  rp: d => runLesson({title: d.k === 'ALL' ? '하루 시나리오' : RP[d.k].name, items: rpSteps(d.k), requeue: false}),
  chat: d => runLesson({title: CHATS.find(c => c.id === d.id).name, items: chatSteps(d.id), requeue: false, onDone: () => { S.talkDone[d.id] = today(); }}),
  talkRules: () => pTalkRules(),
  slang: () => pSlang(),
  trends: () => pTrends(),
  aichat: () => pAIChat(),
  translate: () => pTranslate(),
  sos: () => pSOS(),
  sosShow: d => {
    if (d.j === 'al') { const al = S.allergen || []; sosFull(`${al.join('、')}のアレルギーがあります。これは入っていますか?`, `${al.map(a => (ALLERGENS.find(x => x[0] === a) || [])[1]).join(', ')} 알레르기가 있어요. 이거 들어 있나요?`); }
    else { const s = SOS[+d.j]; sosFull(s[0], s[1]); }
  },
  allergen: d => { S.allergen = S.allergen || []; const k = S.allergen.indexOf(d.a); if (k >= 0) S.allergen.splice(k, 1); else S.allergen.push(d.a); save(); topPage().render(); },
  log: d => pLog(d.why),
  openFocus: () => openFocus(),
  set: d => { S.settings[d.k] = d.k === 'rate' ? +d.v : d.v; save(); render(); if (d.k === 'rate') speak('こんにちは'); },
  sfx: () => { S.settings.sfx = !S.settings.sfx; save(); render(); if (S.settings.sfx) sfx('ok'); },
  backup: () => { const txt = JSON.stringify(S); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('백업을 복사했어요. 메모 앱에 붙여 두세요'), () => showBackup(txt)); else showBackup(txt); },
  restore: () => openSheet(b => {
    b.innerHTML = `<h2>백업에서 되살리기</h2><p class="muted small">복사해 둔 백업을 붙여 넣어요. 지금 기록은 덮어써져요.</p>${IS_PWA ? '<input type="file" id="rsf" accept="application/json,.json,.txt" class="field mt12" aria-label="백업 파일">' : ''}<textarea class="field mt12" id="rs" placeholder="백업 붙여 넣기" aria-label="백업"></textarea><button class="btn mt12" data-ok>되살리기</button>`;
    const rf = $('#rsf', b); if (rf) rf.addEventListener('change', () => { const f = rf.files[0]; if (!f) return; f.text().then(t => { $('#rs', b).value = t; }); });
    $('[data-ok]', b).addEventListener('click', () => { try { const v = JSON.parse($('#rs', b).value); if (!v || typeof v !== 'object' || !v.settings) throw 0; S = loadState(v); save(); closeSheet(); render(); toast('되살렸어요'); } catch (e) { toast('백업 형식이 아니에요'); } });
  }),
  reset: () => openSheet(b => {
    b.innerHTML = `<h2>처음부터 다시 할까요?</h2><p class="muted small">세트 기록, XP, 카드, 테스트 결과가 전부 지워지고 되돌릴 수 없어요.</p><div class="stack mt16"><button class="btn red" data-ok>전부 지우기</button><button class="btn grey" data-no>취소</button></div>`;
    $('[data-ok]', b).addEventListener('click', () => { S = DEFAULT_STATE(); S.asked.welcome = 1; save(); closeSheet(); VIEW.scrolled = false; render(); toast('처음 상태로 돌렸어요'); });
    $('[data-no]', b).addEventListener('click', () => closeSheet());
  })
};
function showBackup(txt) { openSheet(b => { b.innerHTML = `<h2>백업</h2><p class="muted small">아래 글 전체를 길게 눌러 복사한 다음 메모 앱에 붙여 두세요.</p><textarea class="field mt12" readonly style="min-height:200px;font-size:12px" aria-label="백업">${esc(txt)}</textarea>`; }); }

const KEEP_SHEET = new Set(['say', 'reveal', 'tr']);
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (!a || a.tagName === 'A') return;
  const f = ACT[a.dataset.act];
  if (!f) return;
  e.preventDefault();
  if (SHEET && SHEET.sh.contains(a) && !KEEP_SHEET.has(a.dataset.act)) closeSheet(true);
  f(a.dataset, a);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('.sos')) $('.sos').remove();
  else if (SHEET && !SHEET.opt.sticky) closeSheet();
  else if (LESSON) { if (LESSON.finished) closeLesson(); else confirmQuit(); }
  else if (PAGES.length) popPage();
});
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== S.tab && !LESSON) { closeAllPages(); S.tab = h; render(); } });

/* ---------- first run ---------- */
function welcome() {
  if (S.asked.welcome) return false;
  openSheet(b => {
    b.innerHTML = `<h2>일본 가기 전 6주</h2><p class="muted">11월 25일부터 1월 6일까지 하루 세 번, 20분씩 공부해요. 길에 있는 동그라미 하나가 세트 하나예요.</p>
      <p class="sh" style="margin-left:0">세트 시간을 정해 주세요</p>
      <div class="list">${[1, 2, 3].map(n => `<div class="row"><span class="t"><b>세트 ${n}</b><small>${['교재와 글자', '듣기와 말하기', '복습'][n - 1]}</small></span><input type="time" class="field tfield" data-wt="${n - 1}" value="${S.settings.times[n - 1]}" aria-label="세트 ${n} 시간"></div>`).join('')}</div>
      <p class="sf">세트 사이는 3시간 이상 띄우는 게 좋아요. 시간이 지나면 했는지 물어보고, 못 했으면 이유를 꼭 물어볼 거예요.</p>
      <button class="btn mt16" data-go>시작하기</button>`;
    $('[data-go]', b).addEventListener('click', () => { $$('[data-wt]', b).forEach(i => { if (i.value) S.settings.times[+i.dataset.wt] = i.value; }); S.asked.welcome = 1; save(); closeSheet(); render(); });
  }, {sticky: true});
  return true;
}
