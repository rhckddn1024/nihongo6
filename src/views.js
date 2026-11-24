/* ================= VIEWS ================= */
const VIEW = {day: null};
const TABS = [['today', '오늘', 'today'], ['learn', '공부', 'learn'], ['review', '복습', 'review'], ['talk', '말투', 'talk'], ['me', '나', 'me']];
const appEl = $('#app');

function render() {
  const tab = S.tab || 'today';
  const fn = {today: vToday, learn: vLearn, review: vReview, talk: vTalk, me: vMe}[tab] || vToday;
  appEl.innerHTML = '';
  fn(appEl);
  renderTabbar();
  onScroll();
  updateLive();
}
function renderTabbar() {
  let tb = $('.tabbar');
  if (!tb) { tb = document.createElement('footer'); tb.className = 'tabbar'; document.body.appendChild(tb); }
  const due = dueCards().length;
  tb.innerHTML = `<nav>${TABS.map(([k, l, ic]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-label="${l}">${IC[ic]}${k === 'review' && due ? `<span class="tb-badge">${due > 99 ? '99+' : due}</span>` : ''}<span>${l}</span></button>`).join('')}</nav>`;
}
function topbar(mini, right = '') { return `<header class="topbar"><div class="side"></div><div class="mini">${esc(mini)}</div><div class="side r">${right}</div></header>`; }
function onScroll() { const tb = $('#app > .topbar'); if (tb) tb.classList.toggle('scrolled', window.scrollY > 30); }
window.addEventListener('scroll', onScroll, {passive: true});

/* ---------- TODAY ---------- */
function ringsSVG(vals) {
  const R = [57, 42, 27], C = ['var(--ring1)', 'var(--ring2)', 'var(--ring3)'];
  return `<svg viewBox="0 0 132 132" role="img" aria-label="세 세트 진행률">${R.map((r, k) => {
    const c = 2 * Math.PI * r, v = clamp(vals[k], 0, 1);
    return `<circle cx="66" cy="66" r="${r}" fill="none" stroke="${C[k]}" stroke-opacity=".2" stroke-width="12"/><circle cx="66" cy="66" r="${r}" fill="none" stroke="${C[k]}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" ${v === 0 ? 'stroke-opacity="0"' : ''}/>`;
  }).join('')}</svg>`;
}
const stVal = s => s === 'done' ? 1 : s === 'part' ? .5 : 0;
const stLabel = s => s === 'done' ? '<span class="status done">완료</span>' : s === 'part' ? '<span class="status part">반만</span>' : s === 'skip' ? '<span class="status skip">못 함</span>' : '<span class="status wait">대기</span>';
const minsOf = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
function streak() {
  let n = 0, d = today();
  const any = x => [1, 2, 3].some(k => ['done', 'part'].includes(setStat(x, k)));
  if (!any(d)) d = addDays(d, -1);
  while (any(d)) { n++; d = addDays(d, -1); }
  return n;
}
function vToday(el) {
  const t = today();
  const sel = VIEW.day || (dayIdx(t) < 0 ? t : t);
  const i = dayIdx(sel), d = DAYS[i], pre = i < 0, jp = i >= DAYS.length;
  const dd = diffDays(t, DEPART);
  const vals = [1, 2, 3].map(n => { let v = stVal(setStat(sel, n)); if (S.run && S.run.date === sel && S.run.set === n) v = Math.max(v, clamp(1 - runRemaining() / S.run.dur, 0, .95)); return v; });
  const wkStart = addDays(sel, -parseYmd(sel).getDay());
  const sub = pre ? '시작 전' : jp ? `일본 ${japanDay(sel)}일차` : `Day ${i + 1} / ${DAYS.length} · ${d.w}주차`;
  let h = topbar('오늘', `<button class="pill" data-act="sos" style="background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red);font-weight:600">${IC.sos.replace('<svg', '<svg style="width:16px;height:16px"')} SOS</button>`);
  h += `<h1 class="large">${sel === t ? '오늘' : fmtShort(sel)}</h1><p class="subtitle">${fmtDate(sel)} · ${esc(sub)}</p>`;
  // week strip
  h += `<div class="hstack" style="justify-content:space-between;margin:-6px 0 6px"><button class="navbtn" data-act="week" data-n="-7" aria-label="이전 주">${IC.back}</button><span class="tiny">${sel !== t ? `<button class="navbtn small" data-act="selDay" data-d="${t}">오늘로</button>` : ''}</span><button class="navbtn" data-act="week" data-n="7" aria-label="다음 주" style="transform:scaleX(-1)">${IC.back}</button></div>`;
  h += `<div class="week">${[0, 1, 2, 3, 4, 5, 6].map(k => { const dt = addDays(wkStart, k); return `<button class="${dt === t ? 'today' : ''} ${dt === sel ? 'sel' : ''}" data-act="selDay" data-d="${dt}"><span class="wd">${WD[k]}</span><span class="dn">${parseYmd(dt).getDate()}</span><span class="mini-dots">${[1, 2, 3].map(n => { const s = setStat(dt, n); return `<i style="${s === 'done' ? `background:${SET_COL[n]}` : s === 'part' ? `background:${SET_COL[n]};opacity:.45` : ''}"></i>`; }).join('')}</span></button>`; }).join('')}</div>`;
  // hero
  h += `<div class="card mt16"><div class="hero"><div class="rings">${ringsSVG(vals)}</div><div class="dday">
    <div class="lbl">${dd > 0 ? '출국까지' : dd === 0 ? '오늘 출국' : '일본에서'}</div>
    <div class="num">${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : japanDay(t) + '일차'}</div>
    <div class="legend">${[1, 2, 3].map(n => `<span><i class="dot" style="background:${SET_COL[n]}"></i>${['교재', '듣기·말하기', '복습'][n - 1]} <b>${setStat(sel, n) === 'done' ? '완료' : setStat(sel, n) === 'part' ? '반' : ''}</b></span>`).join('')}</div>
  </div></div>${!pre && !jp ? `<p class="tiny mt12" style="margin-bottom:0">이번 주 목표 · ${esc(WEEK_THEME[d.w])} · 테스트는 ${fmtShort(dateOfIdx(DAYS.findIndex(x => x.w === d.w && x.test)))} 화요일</p>` : ''}</div>`;
  // banners
  h += installBanner();
  h += banners(sel, t);
  // sets
  if (pre) {
    h += `<div class="banner blue mt16"><div class="grow"><b>11월 25일 수요일부터 시작</b><p>오늘은 미리 둘러보는 날. 세트 시간부터 정해 두자.</p><div class="hstack mt12"><button class="btn sm" data-act="selDay" data-d="${START}">Day 1 미리 보기</button><button class="btn sm soft" data-act="tab" data-tab="me">세트 시간 정하기</button></div></div></div>`;
  } else {
    const sets = jp ? [1, 3] : [1, 2, 3];
    h += `<p class="sh big">${jp ? '일본에서도 하루 20분' : '오늘 할 일'}</p><div class="stack">`;
    sets.forEach(n => {
      const acts = setActivities(sel, n), s = setStat(sel, n);
      const running = S.run && S.run.date === sel && S.run.set === n;
      h += `<div class="list"><div class="row" style="padding-top:14px;padding-bottom:10px"><span class="dot" style="background:${SET_COL[n]};width:12px;height:12px"></span><span class="t"><b style="font-weight:600">${SET_NAME[n]}</b><small>${S.settings.times[n - 1]} · 20분${d && n === 1 && d.s1 && d.s1.txt ? ' · ' + esc(d.s1.txt) : ''}</small></span>${stLabel(s)}</div>
        ${acts.map(rowHTML).join('')}
        <div class="row" style="gap:10px">${running ? `<button class="btn sm" data-act="openFocus">${IC.timer} ${mmss(runRemaining())} 진행 중</button>` : `<button class="btn sm" data-act="startSet" data-d="${sel}" data-n="${n}">${IC.play} 시작 · 20분</button>`}<button class="btn sm grey" data-act="checkin" data-d="${sel}" data-n="${n}">${s ? '다시 체크' : '체크'}</button></div></div>`;
    });
    h += `</div>`;
    if (d && d.tip) h += `<p class="sh">오늘의 포인트</p><div class="card small">${esc(d.tip)}</div>`;
    if (d && !d.test && !d.last) h += `<p class="sf">세트 1·2를 체크하면 오늘 배운 글자와 표현이 복습 카드에 들어가.</p>`;
  }
  el.innerHTML = h;
}
function banners(sel, t) {
  let h = '';
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const inCur = x => dayIdx(x) >= 0 && dayIdx(x) < DAYS.length;
  // commitments
  S.commits.filter(c => !c.done && c.when && c.when < Date.now() && Date.now() - c.when < 864e5 && setStat(c.d, c.set) !== 'done').slice(-2).forEach(c => {
    h += `<div class="banner red mt16"><div class="grow"><b>약속한 시간 지났어. 세트 ${c.set} 할 거지?</b><p>"${c.c === '1h' ? '1시간 뒤에 할게' : '자기 전에 할게'}"라고 했어. 지금 5분이라도.</p><div class="hstack mt12"><button class="btn sm red" data-act="startShort" data-d="${c.d}" data-n="${c.set}">지금 5분</button><button class="btn sm grey" data-act="checkin" data-d="${c.d}" data-n="${c.set}">체크</button></div></div></div>`;
  });
  const y = addDays(t, -1);
  S.commits.filter(c => !c.done && c.c === 'tmr' && c.d < t && diffDays(c.d, t) <= 3 && setStat(c.d, c.set) !== 'done').slice(-2).forEach(c => {
    h += `<div class="banner mt16"><div class="grow"><b>보충: ${fmtShort(c.d)} 세트 ${c.set}</b><p>밀린 날엔 복습 먼저, 새 내용은 가벼운 날(화요일)에.</p><div class="hstack mt12"><button class="btn sm" data-act="selDay" data-d="${c.d}">그날 내용 보기</button></div></div></div>`;
  });
  if (sel === t && inCur(t)) {
    [1, 2, 3].forEach(n => {
      if (setStat(t, n) || (S.run && S.run.set === n)) return;
      if (nowMin > minsOf(S.settings.times[n - 1]) + 25) h += `<div class="banner mt16"><div class="grow"><b>세트 ${n} 시간(${S.settings.times[n - 1]}) 지났어. 했어?</b><p>했으면 체크, 안 했으면 이유부터.</p><div class="hstack mt12"><button class="btn sm" data-act="startSet" data-d="${t}" data-n="${n}">지금 시작</button><button class="btn sm grey" data-act="checkin" data-d="${t}" data-n="${n}">체크</button></div></div></div>`;
    });
    if (inCur(y)) {
      const miss = [1, 2, 3].filter(n => !setStat(y, n));
      if (miss.length && !(S.asked['y' + y])) h += `<div class="banner mt16"><div class="grow"><b>어제 세트 ${miss.join('·')} 체크 안 했어</b><p>했는지 안 했는지만 알려 줘.</p><div class="hstack mt12"><button class="btn sm" data-act="checkin" data-d="${y}" data-n="${miss[0]}">어제 체크하기</button><button class="btn sm grey" data-act="dismissY" data-d="${y}">넘기기</button></div></div></div>`;
      if ([1, 2, 3].some(n => setStat(y, n) === 'skip')) h += `<div class="banner red mt16"><div><b>어제 못 한 세트가 있어</b><p>오늘은 세트 3(복습)을 절대 빼지 마. 새 내용 보충은 가벼운 날(화요일)에.</p></div></div>`;
    }
  }
  return h;
}

/* ---------- LEARN ---------- */
function vLearn(el) {
  let h = topbar('공부') + `<h1 class="large">공부</h1><p class="subtitle">글자, 장면별 회화, 듣기, 읽기를 언제든 따로 연습</p>`;
  h += `<label class="search">${IC.search}<input id="q" type="search" placeholder="표현, 글자, 뜻 검색" autocomplete="off" value="${esc(VIEW.q || '')}"></label><div id="qres"></div>`;
  h += `<p class="sh">글자</p><div class="list">
    ${rowHTML({act: 'kana', data: {set: 'hira'}, icon: iconTile('kana', COL.red), title: '히라가나', value: '46'})}
    ${rowHTML({act: 'kana', data: {set: 'kata'}, icon: iconTile('kana', COL.orange), title: '가타카나', value: '46'})}
    ${rowHTML({act: 'kana', data: {set: 'daku'}, icon: iconTile('kana', COL.pink), title: '탁음·반탁음', value: '25'})}
    ${rowHTML({act: 'kana', data: {set: 'yoon'}, icon: iconTile('kana', COL.purple), title: '요음', value: '33'})}
    ${rowHTML({act: 'confuse', data: {set: 'hira'}, icon: iconTile('bolt', COL.indigo), title: '헷갈리는 글자', sub: 'さ/ち · ぬ/め · シ/ツ · ソ/ン'})}
    ${rowHTML({act: 'rules', data: {k: 'long'}, icon: iconTile('doc', COL.teal), title: '장음·촉음 규칙'})}
    ${rowHTML({act: 'rules', data: {k: 'loan'}, icon: iconTile('doc', COL.cyan), title: '외래어 규칙'})}
  </div>`;
  h += `<p class="sh">장면별 회화</p><div class="list">${SCENE_ORDER.map(s => rowHTML({act: 'scene', data: {s}, title: SCENE_NAMES[s], value: PH.filter(p => p.s === s).length + (RP[sceneRP(s)] ? ' · 롤플레이' : '')})).join('')}${rowHTML({act: 'rp', data: {k: 'ALL'}, title: '하루 시나리오 (전부 이어서)', value: ''})}</div>`;
  h += `<p class="sh">듣기</p><div class="list">
    ${rowHTML({act: 'numbers', icon: iconTile('num', COL.orange), title: '숫자·가격·시각 듣기', sub: '들은 숫자 받아쓰기'})}
    ${rowHTML({act: 'pairs', icon: iconTile('ear', COL.green), title: '발음 구별', sub: '장음 · 촉음 · 청음/탁음'})}
    ${rowHTML({act: 'shadowAll', icon: iconTile('spk', COL.blue), title: '쉐도잉 플레이어', sub: '지금까지 배운 표현 듣고 따라 하기'})}
  </div>`;
  h += `<p class="sh">읽기</p><div class="list">
    ${rowHTML({act: 'hanja', icon: iconTile('han', COL.brown), title: '한자어 규칙 퀴즈', sub: '약속 → やくそく 추측하기'})}
    ${rowHTML({act: 'signs', icon: iconTile('sign', COL.gray), title: '간판 한자 21개', sub: '入口 出口 押 引 …'})}
  </div>`;
  h += `<p class="sh">교재와 계획</p><div class="list">
    ${rowHTML({act: 'bookPage', icon: iconTile('book', COL.orange), title: '교재 진도', sub: 'NEW 가장 쉬운 독학 일본어 첫걸음', value: Object.values(S.book).filter(Boolean).length + '/19'})}
    ${rowHTML({act: 'curriculum', icon: iconTile('list', COL.blue), title: '6주 전체 일정'})}
    ${rowHTML({act: 'pitfalls', icon: iconTile('ear', COL.red), title: '한국인 발음 함정'})}
    <a class="row ic" href="${DOC_URL}" target="_blank" rel="noopener">${iconTile('doc', COL.indigo)}<span class="t"><b>커리큘럼 문서 열기</b><small>학습 원리와 근거까지 전부</small></span>${IC.chev}</a>
  </div>`;
  el.innerHTML = h;
  const q = $('#q', el);
  const doSearch = () => {
    VIEW.q = q.value;
    const v = q.value.trim().toLowerCase();
    const box = $('#qres', el);
    if (!v) { box.innerHTML = ''; return; }
    const ph = PH.filter(p => (clean(p.k) + p.ko + (p.c || '') + toHangul(p.k)).toLowerCase().includes(v)).slice(0, 20);
    const ks = Object.values(KANA_INFO).filter(k => k.k === q.value.trim() || k.ro === v || k.hg === v).slice(0, 10);
    const sl = SLANG.flatMap(c => c.items).filter(x => (x[0] + x[1] + x[2]).toLowerCase().includes(v)).slice(0, 8);
    box.innerHTML = (ph.length || ks.length || sl.length) ? `<p class="sh">검색 결과</p>${ks.length ? `<div class="chips mt8">${ks.map(k => `<button class="pill" data-act="kanaInfo" data-k="${k.k}"><span lang="ja">${k.k}</span> ${esc(k.hg)}</button>`).join('')}</div>` : ''}${ph.length ? `<div class="list mt8">${ph.map(p => phraseRow(p)).join('')}</div>` : ''}${sl.length ? `<div class="list mt8">${sl.map(x => `<div class="ph"><div class="tx"><span class="jp" lang="ja"><span class="tag cas">08</span>${esc(x[0])}</span><span class="ko">${esc(x[2])}</span></div>${spkBtn(x[1])}</div>`).join('')}</div>` : ''}` : `<p class="sf mt8">결과가 없어</p>`;
  };
  q.addEventListener('input', doSearch);
  if (VIEW.q) doSearch();
}
const sceneRP = s => ({basic: 'basic-shop', food: 'restaurant'})[s] || s;

/* ---------- REVIEW ---------- */
function vReview(el) {
  const due = dueCards(), all = Object.keys(S.cards).filter(cardExists);
  const boxes = [1, 2, 3, 4, 5, 6].map(b => all.filter(id => S.cards[id].b === b).length);
  const weak = all.filter(id => S.cards[id].w >= 2 || (S.cards[id].b === 1 && S.cards[id].n > 0));
  const tomorrow = all.filter(id => S.cards[id].due === addDays(today(), 1)).length;
  let h = topbar('복습') + `<h1 class="large">복습</h1><p class="subtitle">잊어버릴 때쯤 다시 보는 카드. 맞히면 간격이 길어져.</p>`;
  h += `<div class="card center"><div class="res-big" style="color:var(--ring3)">${due.length}</div><p class="muted">오늘 복습할 카드</p>
    <button class="btn mt12" data-act="review" ${due.length ? '' : 'disabled'}>${IC.play} 복습 시작</button>
    ${!due.length ? `<p class="tiny mt12">${all.length ? `오늘 몫은 끝. 내일 ${tomorrow}장이 기다리고 있어.` : '아직 카드가 없어. 오늘 세트 1·2를 체크하면 카드가 생겨.'}</p>` : ''}</div>`;
  h += `<p class="sh">더 하기</p><div class="list">
    ${rowHTML({act: 'recall', data: {d: today()}, icon: iconTile('pen', COL.indigo), title: '보지 않고 적기', sub: '오늘 배운 것을 기억만으로'})}
    ${rowHTML({act: 'weak', icon: iconTile('bolt', COL.red), title: '자주 틀린 것만', value: String(weak.length)})}
    ${rowHTML({act: 'ahead', icon: iconTile('review', COL.cyan), title: '내일 카드 미리 보기', value: String(tomorrow)})}
    ${rowHTML({act: 'memo', icon: iconTile('plus', COL.green), title: '카드 직접 추가', sub: '교재 단어나 현지에서 들은 말'})}
    ${rowHTML({act: 'allCards', icon: iconTile('list', COL.gray), title: '모든 카드', value: String(all.length)})}
  </div>`;
  if (all.length) {
    const lab = ['1일', '3일', '7일', '14일', '30일', '졸업'], cols = ['var(--red)', 'var(--orange)', 'var(--ring2)', 'var(--ring3)', 'var(--tint)', 'var(--green)'];
    const mx = Math.max(...boxes, 1);
    h += `<p class="sh">상자별 카드</p><div class="card"><div class="bars">${boxes.map((n, k) => `<div class="brow"><span>${lab[k]} 상자</span><span class="tr"><i style="width:${n / mx * 100}%;background:${cols[k]}"></i></span><span class="n">${n}</span></div>`).join('')}</div></div><p class="sf">틀리면 1일 상자로 돌아가고, 맞히면 다음 상자로 간다. 3초 넘게 걸리면 맞아도 제자리.</p>`;
  }
  el.innerHTML = h;
}

/* ---------- TALK (08년생) ---------- */
function vTalk(el) {
  const cas = S.settings.casual;
  let h = topbar('말투') + `<h1 class="large">말투</h1><p class="subtitle">08년생 일본 남자애처럼 말하기</p>`;
  h += `<div class="card"><div class="seg"><button class="${cas ? '' : 'on'}" data-act="casual" data-v="0">밖에서 · です·ます</button><button class="${cas ? 'on' : ''}" data-act="casual" data-v="1">친구랑 · タメ口</button></div>
    <p class="small mt12" style="margin-bottom:0">${cas ? '동갑 친구가 <span lang="ja">「タメでいいよ」</span>(반말해도 돼)라고 하면 이쪽. 앱 전체 표현 옆에 친구 말투 듣기 버튼이 생겨.' : '처음 보는 사람, 점원, 어른한테는 이쪽. 일본 또래도 처음엔 존댓말로 시작해서 나이 확인하고 반말로 넘어간다.'}</p></div>`;
  h += `<p class="sh">하루토랑 대화</p><div class="list">
    <div class="row">${harutoAvatar(40)}<span class="t"><b style="font-weight:600">하루토 <span class="muted" lang="ja">はると</span></b><small>2008년생 · 도쿄 고3 · 네 동갑 친구</small></span></div>
    ${CHATS.map(c => rowHTML({act: 'chat', data: {id: c.id}, title: c.name, sub: c.desc, value: S.talkDone[c.id] ? '완료' : ''})).join('')}
  </div>`;
  if (!AI && IS_PWA) h += `<p class="sh">AI 하루토</p><div class="list">
    <a class="row ic" href="${CLAUDE_APP_URL}#talk" target="_blank" rel="noopener">${iconTile('sparkle', COL.purple)}<span class="t"><b>하루토랑 자유 대화</b><small>Claude에서 열려. 한국어로 써도 일본어로 고쳐 줘</small></span>${IC.chev}</a>
    <a class="row ic" href="${CLAUDE_APP_URL}#talk" target="_blank" rel="noopener">${iconTile('globe', COL.blue)}<span class="t"><b>이 말 일본어로 어떻게 해?</b><small>Claude에서 열려. 말투 세 가지로</small></span>${IC.chev}</a>
  </div><p class="sf">AI 대화는 Claude 버전 앱에서 돌아가. 거기서 연 대화 기록은 이 앱과 따로 저장돼.</p>`;
  if (AI) h += `<p class="sh">AI 하루토</p><div class="list">
    ${rowHTML({act: 'aichat', icon: iconTile('sparkle', COL.purple), title: '하루토랑 자유 대화', sub: '한국어로 써도 돼. 일본어로 고쳐 줘'})}
    ${rowHTML({act: 'translate', icon: iconTile('globe', COL.blue), title: '이 말 일본어로 어떻게 해?', sub: '존댓말 · 친구 말투 · 점원한테 세 가지로'})}
  </div>`;
  h += `<p class="sh">반말로 바꾸는 규칙</p><div class="list">${rowHTML({act: 'talkRules', icon: iconTile('bolt', COL.orange), title: '변신 규칙 12개', sub: 'ている→てる, わからない→わかんない …'})}</div>`;
  h += `<p class="sh">08년생 표현 사전</p><div class="list">${SLANG.map((c, k) => rowHTML({act: 'slang', data: {k}, title: c.cat, sub: c.items.slice(0, 3).map(x => x[0]).join(' · '), value: String(c.items.length)})).join('')}
    ${rowHTML({act: 'trends', title: '요즘 유행어', sub: '반년이면 낡는 말. 조금만', value: String(TRENDS.length)})}</div>`;
  h += `<p class="sh">쓰지 말 것</p><div class="card small"><span lang="ja">お前・てめえ・貴様</span>는 애니에서 많이 들려도 싸울 때 쓰는 말이야. 친구는 이름으로 불러. 나를 가리킬 땐 친구한테 <span lang="ja">俺</span>, 처음 보는 사람한테 <span lang="ja">僕</span>.</div>`;
  el.innerHTML = h;
}

/* ---------- ME ---------- */
function vMe(el) {
  const dates = Object.keys(S.sets);
  const doneSets = dates.reduce((a, d) => a + [1, 2, 3].filter(n => setStat(d, n) === 'done').length, 0);
  const mins = dates.reduce((a, d) => a + [1, 2, 3].reduce((b, n) => b + (((S.sets[d] || {})[n] || {}).min || 0), 0), 0);
  const learned = Object.keys(S.cards).filter(cardExists).length;
  const rc = {}; S.log.forEach(l => rc[l.why] = (rc[l.why] || 0) + 1);
  const rmax = Math.max(1, ...Object.values(rc));
  const st = S.settings;
  let h = topbar('나') + `<h1 class="large">나</h1><p class="subtitle">기록과 설정</p>`;
  h += `<div class="card"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
    <div><div class="tiny">연속 공부</div><div style="font-size:28px;font-weight:700;display:flex;align-items:center;gap:4px"><span style="color:var(--orange);width:22px;height:22px;display:inline-block">${IC.flame}</span>${streak()}일</div></div>
    <div><div class="tiny">완료한 세트</div><div style="font-size:28px;font-weight:700">${doneSets}<span class="muted small"> / ${DAYS.length * 3}</span></div></div>
    <div><div class="tiny">타이머로 잰 시간</div><div style="font-size:28px;font-weight:700">${Math.floor(mins / 60)}<span class="small">시간 </span>${mins % 60}<span class="small">분</span></div></div>
    <div><div class="tiny">외우는 중인 카드</div><div style="font-size:28px;font-weight:700">${learned}</div></div>
  </div></div>`;
  h += `<p class="sh">주간 테스트</p><div class="list">${[1, 2, 3, 4, 5, 6].map(w => { const r = S.tests[w]; return rowHTML({act: 'test', data: {w}, title: w === 6 ? '최종 테스트' : `${w}주차 테스트`, sub: r ? esc(r.detail || '') : '아직 안 봄', value: r ? `<span class="${r.pass ? 'ok-t' : 'no-t'}">${r.score}%</span>` : ''}); }).join('')}</div>`;
  h += `<p class="sh">못 한 이유</p>${S.log.length ? `<div class="card"><div class="bars">${REASONS.filter(r => rc[r[0]]).map(r => `<div class="brow"><span style="font-size:13px">${esc(r[1])}</span><span class="tr"><i style="width:${rc[r[0]] / rmax * 100}%;background:var(--red)"></i></span><span class="n">${rc[r[0]]}</span></div>`).join('')}</div></div>
    <div class="list mt12">${S.log.slice(-6).reverse().map(l => `<div class="row"><span class="t"><b>${fmtShort(l.d)} 세트 ${l.set} · ${l.st === 'part' ? '반만' : '못 함'}</b><small>${esc((REASONS.find(r => r[0] === l.why) || [])[1] || '')}${l.note ? ' · ' + esc(l.note) : ''}</small></span></div>`).join('')}</div>` : `<p class="sf">아직 기록 없음. 계속 이렇게 가자.</p>`}`;
  h += `<p class="sh">세트 시간</p><div class="list">${[1, 2, 3].map(n => `<div class="row"><span class="dot" style="background:${SET_COL[n]}"></span><span class="t"><b>${SET_NAME[n]}</b></span><input type="time" class="field" style="width:148px;min-height:36px;padding:4px 8px;font-size:16px" data-time="${n - 1}" value="${st.times[n - 1]}"></div>`).join('')}</div><p class="sf">세트 사이는 3시간 이상 띄워. 시간이 지나면 오늘 화면에서 했는지 물어볼게.</p>`;
  h += `<p class="sh">한글 발음 표시</p><div class="card"><div class="seg">${[['auto', '자동'], ['show', '항상'], ['tap', '탭해서'], ['hide', '숨김']].map(([v, l]) => `<button class="${st.hangul === v ? 'on' : ''}" data-act="set" data-k="hangul" data-v="${v}">${l}</button>`).join('')}</div><p class="tiny mt8" style="margin-bottom:0">자동: 1·2주차는 보이고, 3주차는 탭해야 보이고, 4주차부터는 없음</p></div>`;
  const jv = jaVoices();
  h += `<p class="sh">음성</p><div class="card stack"><div class="seg">${[[.7, '느리게'], [.9, '보통'], [1, '원어민']].map(([v, l]) => `<button class="${st.rate === v ? 'on' : ''}" data-act="set" data-k="rate" data-v="${v}">${l}</button>`).join('')}</div>
    ${jv.length > 1 ? `<select class="field" id="voiceSel">${jv.map(v => `<option value="${esc(v.voiceURI)}" ${JA && JA.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : ''}
    <button class="btn soft" data-act="say" data-t="こんにちは。にほんご、いっしょに がんばろう!">${IC.spk} 음성 테스트</button>
    <p class="tiny" style="margin:0">${jv.length ? '일본어 음성: ' + esc((JA || jv[0]).name) : CTTS ? 'Claude 음성으로 읽어 줘' : '이 기기에서 일본어 음성을 못 찾았어. 기기 설정에서 일본어 음성을 받으면 좋아'}</p></div>`;
  h += `<p class="sh">일본 갈 준비</p><div class="list">
    ${rowHTML({act: 'depart', icon: iconTile('list', COL.green), title: '출국 체크리스트', value: `${Object.values(S.check).filter(Boolean).length}/${DEPART_CHECK.length}`})}
    ${rowHTML({act: 'sos', icon: iconTile('sos', COL.red), title: 'SOS 카드', sub: '말이 안 나올 때 화면을 보여주기'})}
    ${rowHTML({act: 'core', icon: iconTile('bolt', COL.orange), title: '핵심 30문장'})}
  </div>`;
  if (IS_PWA) h += `<p class="sh">알림</p><div class="list">${rowHTML({act: 'ics', icon: iconTile('timer', COL.red), title: '폰 캘린더에 세트 알림 넣기', sub: '지금 세트 시간으로 43일 × 3번 알림'})}</div><p class="sf">세트 시간을 바꿨으면 파일을 다시 받아. 예전 일정은 캘린더에서 "일본어 6주"를 지우면 된다.</p>`;
  h += `<p class="sh">데이터</p><div class="list">
    ${IS_PWA ? rowHTML({act: 'backupFile', icon: iconTile('doc', COL.green), title: '백업 파일로 저장'}) : ''}
    ${rowHTML({act: 'backup', icon: iconTile('copy', COL.blue), title: '백업 복사', chev: true})}
    ${rowHTML({act: 'restore', icon: iconTile('doc', COL.indigo), title: '백업 붙여넣어 복원'})}
    ${rowHTML({act: 'reset', icon: iconTile('x', COL.gray), title: '처음부터 다시'})}
  </div><p class="sf">${syncState === 'synced' ? '이 기기와 내 계정에 저장 중. 다른 기기에서 열어도 이어진다.' : IS_PWA ? '기록은 이 폰 안에만 저장돼. 일주일에 한 번 백업 파일을 저장해 두면 폰을 바꿔도 이어서 할 수 있어.' : '이 기기에만 저장 중. 가끔 백업을 복사해 두면 안전해.'}</p>`;
  el.innerHTML = h;
  $$('[data-time]', el).forEach(inp => inp.addEventListener('change', () => { if (inp.value) { S.settings.times[+inp.dataset.time] = inp.value; save(); toast('세트 시간을 바꿨어'); } }));
  const vs = $('#voiceSel', el); if (vs) vs.addEventListener('change', () => { S.settings.voice = vs.value; save(); loadVoices(); speak('こんにちは'); });
}

/* ================= PAGES ================= */
function pKana(set) {
  const rows = {hira: HIRA_ROWS, kata: KATA_ROWS, daku: DAKU_ROWS, yoon: YOON_ROWS}[set];
  const title = {hira: '히라가나', kata: '가타카나', daku: '탁음·반탁음', yoon: '요음'}[set];
  const all = rows.flatMap(r => r[1].filter(Boolean).map(x => x[0]));
  const cols = set === 'yoon' ? 3 : 5;
  pushPage(title, el => {
    const weak = weakKana(all);
    const hm = hangulMode();
    el.innerHTML = `<h1 class="large">${title}</h1><p class="subtitle">글자를 누르면 소리와 외우는 법이 나와</p>
      <div class="kgrid ${cols === 3 ? 'k3' : ''}">${rows.map(r => r[1].map(x => x ? `<button class="kc" data-act="kanaInfo" data-k="${x[0]}"><span class="kj" lang="ja">${x[0]}</span><span class="kr">${hm === 'hide' ? x[1] : esc(x[2]) + ' · ' + x[1]}</span>${S.kanaStat[x[0]] ? `<i class="lv" style="background:${weak.includes(x[0]) ? 'var(--red)' : 'var(--green)'}"></i>` : ''}</button>` : '<span class="kc empty"></span>').join('')).join('')}</div>
      <p class="sf">초록 점은 잘 아는 글자, 빨간 점은 자주 틀리거나 느린 글자</p>
      <p class="sh">연습</p><div class="list">
        ${rowHTML({act: 'kq', data: {set, mode: 'read'}, title: '보고 읽기', sub: '글자 → 소리 고르기'})}
        ${rowHTML({act: 'kq', data: {set, mode: 'listen'}, title: '듣고 고르기', sub: '소리 → 글자 고르기'})}
        ${rowHTML({act: 'kq', data: {set, mode: 'speed'}, title: '스피드 테스트', sub: '한 글자 2초 안에'})}
        ${weak.length ? rowHTML({act: 'kq', data: {set, mode: 'weak'}, title: '약한 글자만', value: String(weak.length)}) : ''}
        ${rowHTML({act: 'kadd', data: {set}, title: '전부 복습 카드에 넣기'})}
      </div>`;
  }, {refresh: true});
}
function kanaSheet(k) {
  const info = KANA_INFO[k]; if (!info) return;
  speak(k);
  const pairs = CONFUSE.flatMap(c => c.pairs).filter(p => p[0] === k || p[1] === k);
  const hira = isKata(k) ? String.fromCharCode(k.charCodeAt(0) - 0x60) : null;
  openSheet(b => {
    b.innerHTML = `<div class="bigkana" lang="ja" style="font-size:120px">${k}</div>
      <div class="center"><span style="font-size:24px;font-weight:600">${esc(info.hg)}</span> <span class="muted">${info.ro}</span></div>
      ${info.mn ? `<div class="card mt16 small">${esc(info.mn)}</div>` : ''}
      ${hira && KANA_INFO[hira] ? `<p class="small muted mt12 center">히라가나로는 <span lang="ja" style="font-size:20px">${hira}</span></p>` : ''}
      ${pairs.map(p => `<div class="card mt8 small"><span lang="ja" style="font-size:20px">${p[0]} / ${p[1]}</span> · ${esc(p[2])}</div>`).join('')}
      <div class="rate mt16"><button class="btn soft" data-act="say" data-t="${k}">${IC.spk} 다시 듣기</button><button class="btn" data-act="kaddOne" data-k="${k}">${S.cards['k:' + k] ? '카드에 있음' : '카드에 넣기'}</button></div>`;
  });
}
function pLearnKana(i) {
  const list = DAYS[i].s1.kana;
  const st = {j: 0};
  const page = pushPage('오늘 글자', el => {
    if (st.j >= list.length) {
      el.innerHTML = `<h1 class="large">다 봤어</h1><p class="subtitle">${list.length}자. 이제 셀프 테스트로 바로 꺼내 보자.</p><div class="stack"><button class="btn" data-act="quizKana" data-i="${i}">셀프 테스트</button><button class="btn grey" data-again>처음부터 다시</button></div>`;
      $('[data-again]', el).addEventListener('click', () => { st.j = 0; page.render(); });
      return;
    }
    const k = list[st.j], info = KANA_INFO[k];
    el.innerHTML = `<div class="hstack mt8"><div class="progress grow"><i style="width:${st.j / list.length * 100}%"></i></div><span class="tiny kbd">${st.j + 1} / ${list.length}</span></div>
      <div class="flash mt16"><div class="bigkana" lang="ja">${k}</div><div style="font-size:24px;font-weight:600">${esc(info.hg)} <span class="muted" style="font-weight:400">${info.ro}</span></div>${info.mn ? `<div class="ctx">${esc(info.mn)}</div>` : ''}</div>
      <p class="tiny center mt12">소리 내서 세 번 따라 하고, 손가락으로 허공에 한 번 써 봐</p>
      <div class="rate mt12"><button class="btn soft" data-act="say" data-t="${k}">${IC.spk} 듣기</button><button class="btn" data-next>다음</button></div>`;
    speak(k);
    $('[data-next]', el).addEventListener('click', () => { st.j++; page.render(); });
  });
}
function pConfuse(set) {
  pushPage('헷갈리는 글자', el => {
    el.innerHTML = `<h1 class="large">헷갈리는 글자</h1><div class="seg mt8"><button class="${set === 'hira' ? 'on' : ''}" data-cs="hira">히라가나</button><button class="${set === 'kata' ? 'on' : ''}" data-cs="kata">가타카나</button></div>
      <div class="list mt16">${CONFUSE.find(c => c.set === set).pairs.map(p => `<div class="row"><span lang="ja" style="font-size:30px;width:92px;flex:none">${p[0]} ${p[1]}</span><span class="t"><small style="color:var(--label)">${esc(p[2])}</small><small>${esc(KANA_INFO[p[0]].hg)} / ${esc(KANA_INFO[p[1]].hg)}</small></span></div>`).join('')}</div>
      <button class="btn mt16" data-cq>이 글자들로 퀴즈</button>`;
    $$('[data-cs]', el).forEach(b => b.addEventListener('click', () => { set = b.dataset.cs; PAGES[PAGES.length - 1].render(); }));
    $('[data-cq]', el).addEventListener('click', () => { const pool = [...new Set(CONFUSE.find(c => c.set === set).pairs.flatMap(p => [p[0], p[1]]))]; runQuiz({title: '헷갈리는 글자 퀴즈', items: kanaQuizItems(pool.concat(pool).slice(0, 20), 'read')}); });
  });
}
function pRules(k) {
  pushPage(k === 'long' ? '장음·촉음' : '외래어 규칙', el => {
    const ex = (w, m) => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${w}</span><span class="hg">${esc(toHangul(w))}</span><span class="ko">${esc(m)}</span></div>${spkBtn(w)}</div>`;
    el.innerHTML = k === 'long' ? `<h1 class="large">장음·촉음·ん</h1><p class="subtitle">일본어는 글자 하나가 한 박자. 길이가 바뀌면 뜻이 바뀐다.</p>
      <p class="sh">장음: 한 박자 더 끌기</p><div class="list">${ex('おばあさん', '할머니 (あ단 + あ)')}${ex('せんせい', '선생님 (え단 + い → 에-)')}${ex('とうきょう', '도쿄 (お단 + う → 오-)')}${ex('ゆうき', '용기 (う단 + う)')}${ex('コーヒー', '커피 (가타카나는 ー)')}</div>
      <p class="sh">촉음 っ: 한 박자 멈추기</p><div class="list">${ex('きって', '우표 (きて는 "와")')}${ex('ちょっと', '잠깐')}${ex('がっこう', '학교')}</div>
      <p class="sh">ん: 한 박자 다 채우기</p><div class="list">${ex('ほん', '책')}${ex('しんぶん', '신문')}${ex('こんにちは', '안녕하세요')}</div>
      <button class="btn mt16" data-act="pairs">발음 구별 연습</button>`
      : `<h1 class="large">외래어 규칙</h1><p class="subtitle">받침이 거의 없어서 영어 단어에 모음을 붙여 읽는다</p>
      <p class="sh">끝 자음에 う나 お</p><div class="list">${ex('ミルク', 'milk')}${ex('ベッド', 'bed')}</div>
      <p class="sh">-er, -ar는 장음</p><div class="list">${ex('ビール', 'beer')}${ex('ハンバーガー', 'burger')}</div>
      <p class="sh">짧은 모음 뒤 자음은 ッ</p><div class="list">${ex('カップ', 'cup')}${ex('ホット', 'hot')}</div>
      <p class="sh">특수 표기</p><div class="list">${ex('ファミリー', 'family (ファ)')}${ex('パーティー', 'party (ティ)')}</div>
      <p class="sh">줄여 부르기</p><div class="list">${ex('コンビニ', '편의점 (convenience store)')}${ex('スマホ', '스마트폰')}${ex('エアコン', '에어컨')}</div>`;
  });
}
function pScene(s) {
  const list = PH.filter(p => p.s === s), rp = RP[sceneRP(s)];
  pushPage(SCENE_NAMES[s], el => {
    el.innerHTML = `<h1 class="large">${esc(SCENE_NAMES[s])}</h1><p class="subtitle"><span class="tag staff">들을 말</span>은 알아듣기만 하면 되는 말</p>
      <div class="hstack">${rp ? `<button class="btn sm" data-act="rp" data-k="${sceneRP(s)}">${IC.talk} 롤플레이</button>` : ''}<button class="btn sm soft" data-sp>${IC.review} 말하기 카드</button><button class="btn sm soft" data-sh>${IC.spk} 쉐도잉</button></div>
      <div class="list mt16">${list.map(p => phraseRow(p)).join('')}</div>
      <button class="btn grey mt16" data-add>전부 복습 카드에 넣기</button>`;
    $('[data-sp]', el).addEventListener('click', () => runFlash({title: SCENE_NAMES[s] + ' 카드', items: shuffle(list).map(p => cardItem('p:' + p.id))}));
    $('[data-sh]', el).addEventListener('click', () => pShadow(list, SCENE_NAMES[s]));
    $('[data-add]', el).addEventListener('click', () => { let n = 0; list.forEach(p => { if (addCard('p:' + p.id)) n++; }); toast(n ? `${n}개를 카드에 넣었어` : '이미 다 들어 있어'); });
  });
}
function pDayPhrases(i) {
  const list = DAYS[i].s2.ph.map(id => PH_BY[id]);
  pushPage('오늘 표현', el => {
    el.innerHTML = `<h1 class="large">오늘 표현</h1><p class="subtitle">${fmtDate(dateOfIdx(i))} · ${list.length}개. 듣고, 따라 하고, 보지 않고 말하기 순서로</p>
      <div class="hstack"><button class="btn sm" data-sh>${IC.spk} 쉐도잉</button><button class="btn sm soft" data-act="speakToday" data-i="${i}">${IC.review} 말하기 카드</button></div>
      <div class="list mt16">${list.map(p => phraseRow(p)).join('')}</div>`;
    $('[data-sh]', el).addEventListener('click', () => pShadow(list, '오늘 표현'));
  });
}
function speakAsync(text, opt = {}) {
  return new Promise(res => {
    const t = ttsText(text);
    const est = 600 + t.length * 260 / (opt.rate || S.settings.rate);
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    if ('speechSynthesis' in window && (JA || !CTTS)) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = opt.rate || S.settings.rate; if (JA) u.voice = JA;
        u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
        setTimeout(fin, est + 4000); return;
      } catch (e) {}
    }
    if (CTTS) { CTTS.speak(t, {language: 'ja', rate: clamp(opt.rate || S.settings.rate, .7, 1.5)}).then(fin, fin); setTimeout(fin, est + 6000); return; }
    setTimeout(fin, est);
  });
}
function pShadow(list, title) {
  const st = {j: 0, playing: false, run: 0, rep: 2};
  const page = pushPage('쉐도잉', el => {
    const p = list[st.j];
    el.innerHTML = `<h1 class="large">쉐도잉</h1><p class="subtitle">${esc(title)} · 듣고 바로 겹쳐서 따라 말하기</p>
      <div class="flash"><span class="kind">${st.j + 1} / ${list.length}</span><div class="front ja" lang="ja">${esc(clean(p.k))}</div>${hangulMode() !== 'hide' ? `<div class="hg">${esc(toHangul(p.k))}</div>` : ''}<div class="ctx">${esc(p.ko)}</div><div class="sstate tiny"></div></div>
      <div class="hstack mt16" style="justify-content:center"><span class="tiny">반복</span><div class="seg" style="width:160px">${[1, 2, 3].map(n => `<button class="${st.rep === n ? 'on' : ''}" data-rep="${n}">${n}번</button>`).join('')}</div></div>
      <div class="rate mt16"><button class="btn grey" data-prev>이전</button><button class="btn grey" data-nx>다음</button></div>
      <button class="btn mt12" data-play>${st.playing ? IC.pause + ' 멈추기' : IC.play + ' 자동 재생'}</button>`;
    $$('[data-rep]', el).forEach(b => b.addEventListener('click', () => { st.rep = +b.dataset.rep; page.render(); }));
    $('[data-prev]', el).addEventListener('click', () => { st.j = (st.j - 1 + list.length) % list.length; stop(); page.render(); speak(list[st.j].k); });
    $('[data-nx]', el).addEventListener('click', () => { st.j = (st.j + 1) % list.length; stop(); page.render(); speak(list[st.j].k); });
    $('[data-play]', el).addEventListener('click', () => { if (st.playing) { stop(); page.render(); } else { st.playing = true; page.render(); loop(++st.run); } });
  });
  function stop() { st.playing = false; st.run++; try { speechSynthesis.cancel(); } catch (e) {} }
  async function loop(run) {
    while (st.playing && run === st.run) {
      const p = list[st.j];
      for (let r = 0; r < st.rep && st.playing && run === st.run; r++) {
        const s = $('.sstate', page.el); if (s) s.textContent = '듣기';
        await speakAsync(p.k);
        if (!st.playing || run !== st.run) return;
        const s2 = $('.sstate', page.el); if (s2) s2.textContent = '지금 따라 말해!';
        await new Promise(r2 => setTimeout(r2, 900 + clean(p.k).length * 220));
      }
      if (!st.playing || run !== st.run) return;
      st.j = (st.j + 1) % list.length; page.render();
    }
  }
  page.onClose = stop;
}
function pBook() {
  const sched = {};
  DAYS.forEach((d, i) => { if (d.s1 && d.s1.book) { const n = d.s1.book.ch; (sched[n] = sched[n] || []).push(dateOfIdx(i)); } });
  for (let n = 13; n <= 18; n++) sched[n] = [addDays(DEPART, (n - 13) * 2), addDays(DEPART, (n - 13) * 2 + 1)];
  pushPage('교재 진도', el => {
    el.innerHTML = `<h1 class="large">교재 진도</h1><p class="subtitle">NEW 가장 쉬운 독학 일본어 첫걸음 · 끝낸 과를 눌러 체크</p>
      <div class="list">${BOOK.map(b => { const dts = sched[b.n] || []; const on = !!S.book[b.n]; return `<button class="row" data-act="bookToggle" data-n="${b.n}"><span style="width:26px;height:26px;border-radius:50%;border:2px solid ${on ? 'var(--green)' : 'var(--label3)'};background:${on ? 'var(--green)' : 'transparent'};color:#fff;display:grid;place-items:center;flex:none">${on ? IC.check.replace('<svg', '<svg style="width:15px;height:15px"') : ''}</span><span class="t"><b lang="ja">${b.n ? b.n + '과 ' : ''}${esc(b.t)}</b><small>${esc(b.ko)} · ${b.p}~${b.e}쪽${dts.length ? ' · ' + fmtShort(dts[0]) + (dts.length > 1 ? '~' + fmtShort(dts[dts.length - 1]) : '') : ''}${b.n >= 13 ? ' · 일본에서' : ''}</small></span></button>`; }).join('')}</div>
      <p class="sf">부록의 품사별 활용표(292쪽)와 숫자·시간 읽기는 5주차에 같이 보면 좋아. 기초 단어 100(314쪽)은 카드로 직접 넣어도 돼.</p>`;
  }, {refresh: true});
}
function pHanja(filter) {
  const pool = HANJAEO;
  const items = shuffle(pool).slice(0, 15).map(x => {
    const others = pick(pool.filter(y => y !== x && y[2].length >= x[2].length - 2 && y[2].length <= x[2].length + 2), 3);
    return {q: `<div class="ctx">한국어 한자음으로 일본어 발음 추측하기</div><div class="front">${esc(x[0])}</div><div class="hg" lang="ja">${x[1]}</div>`, after: x[2], opts: shuffle([x, ...others]).map(o => ({h: `<span lang="ja">${o[2]}</span>`, v: o[2]})), ans: x[2], explain: `<b lang="ja">${x[1]} = ${x[2]}</b><br>${esc(x[3])}`, label: esc(x[0]), ansLabel: x[2] + ' · ' + x[3]};
  });
  runQuiz({title: '한자어 규칙 퀴즈', items});
}
function pSigns() {
  pushPage('간판 한자', el => {
    el.innerHTML = `<h1 class="large">간판 한자</h1><p class="subtitle">쓰지 말고 보고 뜻만 알면 된다</p>
      <div class="hstack"><button class="btn sm" data-q>퀴즈</button><button class="btn sm soft" data-add>전부 카드에 넣기</button></div>
      <div class="list mt16">${SIGNS.map(s => `<div class="ph"><span lang="ja" style="font-size:26px;width:110px;flex:none">${s[0]}</span><div class="tx"><span class="ko" style="color:var(--label)">${esc(s[2])}</span><span class="hg" lang="ja">${s[1]}</span></div>${spkBtn(s[1])}</div>`).join('')}</div>`;
    $('[data-q]', el).addEventListener('click', () => runQuiz({title: '간판 한자 퀴즈', items: shuffle(SIGNS).map((s, j) => ({q: `<div class="bigkana" style="font-size:72px" lang="ja">${s[0]}</div>`, after: s[1], opts: shuffle([s, ...pick(SIGNS.filter(x => x !== s), 3)]).map(o => ({h: esc(o[2]), v: o[0]})), ans: s[0], label: `<span lang="ja">${s[0]}</span>`, ansLabel: s[2]}))}));
    $('[data-add]', el).addEventListener('click', () => { let n = 0; SIGNS.forEach((s, j) => { if (addCard('s:' + j)) n++; }); toast(n ? `${n}개를 카드에 넣었어` : '이미 다 들어 있어'); });
  });
}
function pRecall(date) {
  const i = dayIdx(date);
  const items = i >= 0 && i < DAYS.length ? dayItems(i) : Object.keys(S.cards).filter(id => S.cards[id].last === date);
  const st = {shown: false};
  const page = pushPage('보지 않고 적기', el => {
    const label = id => { const t = id[0], v = id.slice(2); if (t === 'k') return `<span lang="ja">${v}</span> ${KANA_INFO[v].hg}`; if (t === 'p') return `<span lang="ja">${esc(clean(PH_BY[v].k))}</span> · ${esc(PH_BY[v].ko)}`; if (t === 's') return `<span lang="ja">${SIGNS[+v][0]}</span> ${SIGNS[+v][2]}`; return id; };
    el.innerHTML = `<h1 class="large">보지 않고 적기</h1><p class="subtitle">${fmtDate(date)}에 배운 걸 기억나는 대로 전부. 한글로 적어도 돼.</p>
      <textarea class="field" id="rc" placeholder="예: すみません 저기요, あ い う え お …">${esc(S.recall[date] || '')}</textarea>
      ${st.shown ? `<p class="sh">오늘 배운 것 · 못 떠올린 걸 눌러</p><div class="list">${items.map(id => `<button class="row" data-miss="${id}"><span class="t"><b>${label(id)}</b></span><span class="v" data-mark></span></button>`).join('') || '<div class="empty-state">이날 배운 항목이 없어</div>'}</div><button class="btn mt16" data-save>저장 (못 떠올린 건 내일 다시)</button>` : `<button class="btn mt16" data-show>답 맞춰 보기</button>`}`;
    const ta = $('#rc', el); ta.addEventListener('input', () => { S.recall[date] = ta.value; });
    const sh = $('[data-show]', el); if (sh) sh.addEventListener('click', () => { S.recall[date] = ta.value; save(); st.shown = true; page.render(); });
    const missed = new Set();
    $$('[data-miss]', el).forEach(b => b.addEventListener('click', () => { const id = b.dataset.miss; if (missed.has(id)) missed.delete(id); else missed.add(id); $('[data-mark]', b).innerHTML = missed.has(id) ? '<span class="no-t">못 떠올림</span>' : ''; }));
    const sv = $('[data-save]', el); if (sv) sv.addEventListener('click', () => { missed.forEach(id => { addCard(id); grade(id, 'wrong'); }); S.recall[date] = ta.value; save(); toast(missed.size ? `${missed.size}개는 내일 다시 나와` : '전부 떠올렸어. 좋아'); popPage(); });
  });
}
function pMemo() {
  pushPage('카드 추가', el => {
    el.innerHTML = `<h1 class="large">카드 추가</h1><p class="subtitle">교재 단어, 현지에서 들은 말을 직접 넣기</p>
      <div class="stack"><input class="field" id="mko" placeholder="뜻 (한국어)"><input class="field" id="mjp" lang="ja" placeholder="일본어"><input class="field" id="mkana" lang="ja" placeholder="읽는 법 (히라가나, 선택)"><input class="field" id="mnote" placeholder="메모 (선택: 어디서 들었는지)">
      ${AI ? `<button class="btn soft" data-ai>${IC.sparkle} 뜻만 적고 일본어 채우기</button>` : ''}
      <button class="btn" data-save>저장</button></div>
      ${S.custom.length ? `<p class="sh">내가 만든 카드</p><div class="list">${S.custom.slice().reverse().slice(0, 30).map(c => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(c.jp)}</span><span class="ko">${esc(c.ko)}</span></div>${spkBtn(c.kana || c.jp)}</div>`).join('')}</div>` : ''}`;
    $('[data-save]', el).addEventListener('click', () => {
      const ko = $('#mko', el).value.trim(), jp = $('#mjp', el).value.trim();
      if (!ko || !jp) { toast('뜻과 일본어는 꼭 적어 줘'); return; }
      const id = Date.now().toString(36);
      S.custom.push({id, ko, jp, kana: $('#mkana', el).value.trim(), note: $('#mnote', el).value.trim()});
      addCard('c:' + id); save(); toast('카드에 넣었어. 오늘 복습에 나와'); PAGES[PAGES.length - 1].render();
    });
    const ab = $('[data-ai]', el);
    if (ab) ab.addEventListener('click', async () => {
      const ko = $('#mko', el).value.trim(); if (!ko) { toast('뜻을 먼저 적어 줘'); return; }
      ab.disabled = true; ab.textContent = '채우는 중…';
      try {
        const r = await aiJSON(`Translate this Korean into natural, simple polite Japanese a traveler would say (です・ます). Korean: "${ko}". Return ONLY JSON {"jp": Japanese with natural kanji, "kana": full reading in hiragana/katakana}.`);
        if (r && r.jp) { $('#mjp', el).value = r.jp; $('#mkana', el).value = r.kana || ''; }
      } catch (e) { toast('지금은 채울 수 없어'); }
      ab.disabled = false; ab.innerHTML = `${IC.sparkle} 뜻만 적고 일본어 채우기`;
    });
  });
}
function pAllCards() {
  pushPage('모든 카드', el => {
    const ids = Object.keys(S.cards).filter(cardExists).sort((a, b) => S.cards[a].due.localeCompare(S.cards[b].due));
    const label = id => { const t = id[0], v = id.slice(2); if (t === 'k') return `<span lang="ja">${v}</span> · ${KANA_INFO[v].hg}`; if (t === 'p') return `<span lang="ja">${esc(clean(PH_BY[v].k))}</span>`; if (t === 's') return `<span lang="ja">${SIGNS[+v][0]}</span> · ${SIGNS[+v][2]}`; const c = S.custom.find(x => x.id === v); return `<span lang="ja">${esc(c.jp)}</span> · ${esc(c.ko)}`; };
    el.innerHTML = `<h1 class="large">모든 카드</h1><p class="subtitle">${ids.length}장 · 다음 복습 날짜 순</p><div class="list">${ids.map(id => `<div class="row"><span class="t"><b>${label(id)}</b><small>${S.cards[id].b >= 6 ? '졸업' : S.cards[id].b + '번 상자'} · 틀린 횟수 ${S.cards[id].w}</small></span><span class="v small">${fmtShort(S.cards[id].due)}</span></div>`).join('') || '<div class="empty-state">아직 카드가 없어</div>'}</div>`;
  });
}
function pCurriculum() {
  pushPage('6주 일정', el => {
    let h = `<h1 class="large">6주 일정</h1><p class="subtitle">날짜를 누르면 그날 화면으로 간다</p>`;
    [1, 2, 3, 4, 5, 6].forEach(w => {
      h += `<p class="sh">${w}주차 · ${esc(WEEK_THEME[w])}</p><div class="list">`;
      DAYS.forEach((d, i) => { if (d.w !== w) return; const dt = dateOfIdx(i); h += `<button class="row" data-act="goDay" data-d="${dt}"><span class="t"><b>${fmtShort(dt)} ${WD[parseYmd(dt).getDay()]} · ${esc(d.t)}</b><small>${d.test ? '가벼운 날 · 테스트' : d.last ? '복습만' : esc((d.s1 && d.s1.txt) || '')}</small></span><span class="mini-dots" style="display:flex;gap:3px">${[1, 2, 3].map(n => { const s = setStat(dt, n); return `<i style="width:7px;height:7px;border-radius:50%;background:${s === 'done' ? SET_COL[n] : 'var(--fill)'}"></i>`; }).join('')}</span>${IC.chev}</button>`; });
      h += `</div>`;
    });
    el.innerHTML = h;
  });
}
function pPitfalls() {
  const P = [
    ['단어 첫소리 が/だ/ば', '한국어 ㄱ·ㄷ·ㅂ은 첫머리에서 성대가 안 울려. 앞에 "응"을 살짝 붙인다는 느낌으로', 'がっこう', 'かっこう'],
    ['단어 중간 か/た', '한국어는 중간 ㄱ·ㄷ이 저절로 울린다. 살짝 된소리 쪽으로: たかい는 "타까이"', 'たかい', ''],
    ['ざ ず ぜ ぞ', '한국어에 z가 없어서 じゃ로 말하기 쉽다. 혀를 윗니 뒤에 대고 성대를 울려', 'ぞう', 'じょう'],
    ['つ', '"츠"로 말하면 ちゅ나 す처럼 들린다. 혀끝을 붙였다 떼며 [ts]', 'つき', ''],
    ['장음', '한 박자 더 끈다. 손뼉으로 박자를 세면 쉽다', 'おばあさん', 'おばさん'],
    ['촉음 っ', '받침처럼 짧게 끝내지 말고 한 박자 멈춘다', 'きって', 'きて'],
    ['ん', 'ん도 한 박자를 다 채운다', 'しんぶん', ''],
    ['う', '입술을 내밀지 말고 "으"와 "우" 사이', 'うみ', '']
  ];
  pushPage('발음 함정', el => {
    el.innerHTML = `<h1 class="large">한국인 발음 함정</h1><p class="subtitle">일본어는 글자 하나가 같은 길이. <span lang="ja">とうきょう</span>는 한국어로 2음절이지만 일본어로는 4박자다.</p>
      <div class="list">${P.map(p => `<div class="ph"><div class="tx"><span class="jp" style="font-size:17px;font-weight:600">${esc(p[0])}</span><span class="ko">${esc(p[1])}</span></div><div class="stack" style="gap:6px">${spkBtn(p[2])}${p[3] ? spkBtn(p[3], 'style="background:var(--fill);color:var(--label2)"') : ''}</div></div>`).join('')}</div>
      <p class="sf">파란 버튼은 맞는 소리, 회색 버튼은 헷갈리는 짝. 둘 다 들어 보고 차이를 느껴 봐.</p>
      <button class="btn mt16" data-act="pairs">발음 구별 연습</button>`;
  });
}
function pCore() {
  const list = CORE30.map(id => PH_BY[id]);
  pushPage('핵심 30문장', el => {
    el.innerHTML = `<h1 class="large">핵심 30문장</h1><p class="subtitle">이것만 입에서 바로 나오면 한 달은 버틴다</p>
      <div class="hstack"><button class="btn sm" data-c>${IC.review} 말하기 카드</button><button class="btn sm soft" data-s>${IC.spk} 쉐도잉</button></div>
      <div class="list mt16">${list.map(p => phraseRow(p, {noNote: true})).join('')}</div>`;
    $('[data-c]', el).addEventListener('click', () => runFlash({title: '핵심 30문장', items: shuffle(list).map(p => cardItem('p:' + p.id))}));
    $('[data-s]', el).addEventListener('click', () => pShadow(list, '핵심 30문장'));
  });
}
function pDepart() {
  pushPage('출국 체크리스트', el => {
    el.innerHTML = `<h1 class="large">출국 체크리스트</h1><p class="subtitle">1월 7일 출발 전에</p><div class="list">${DEPART_CHECK.map((c, j) => `<button class="row" data-act="checkItem" data-j="${j}"><span style="width:24px;height:24px;border-radius:50%;border:2px solid ${S.check[j] ? 'var(--green)' : 'var(--label3)'};background:${S.check[j] ? 'var(--green)' : 'transparent'};color:#fff;display:grid;place-items:center;flex:none">${S.check[j] ? IC.check.replace('<svg', '<svg style="width:14px;height:14px"') : ''}</span><span class="t"><b>${esc(c)}</b></span></button>`).join('')}</div>`;
  }, {refresh: true});
}
function pSOS() {
  pushPage('SOS 카드', el => {
    const al = S.allergen || [];
    el.innerHTML = `<h1 class="large">SOS 카드</h1><p class="subtitle">말이 안 나오면 화면을 크게 띄워서 보여줘</p>
      <div class="list">${SOS.map((s, j) => `<button class="row" data-act="sosShow" data-j="${j}"><span class="t"><b lang="ja">${esc(s[0])}</b><small>${esc(s[1])}</small></span>${IC.chev}</button>`).join('')}</div>
      <p class="sh">알레르기 카드</p><div class="card"><div class="chips">${ALLERGENS.map(a => `<button class="pill ${al.includes(a[0]) ? 'on' : ''}" data-act="allergen" data-a="${a[0]}">${esc(a[1])}</button>`).join('')}</div>
      <button class="btn mt12" data-act="sosShow" data-j="al" ${al.length ? '' : 'disabled'}>알레르기 카드 보여주기</button></div>
      <p class="sf">긴급전화: 경찰 110 · 구급차·소방 119</p>`;
  }, {refresh: true});
}
function sosFull(text, ko) {
  const d = document.createElement('div'); d.className = 'sos'; d.setAttribute('role', 'dialog');
  d.innerHTML = `<button class="x" aria-label="닫기">${IC.x}</button><div class="big" lang="ja">${esc(text)}</div><div class="ko">${esc(ko)}</div><button class="btn sm mt24" style="background:#000">${IC.spk} 읽어 주기</button>`;
  document.body.appendChild(d);
  $('.x', d).addEventListener('click', () => d.remove());
  $('.btn', d).addEventListener('click', () => speak(text, {rate: .85}));
}
function pTalkRules() {
  pushPage('변신 규칙', el => {
    el.innerHTML = `<h1 class="large">반말 변신 규칙</h1><p class="subtitle">교재 문장을 08년생 말투로 바꾸는 법</p><div class="stack">${RULES.map(r => `<div class="card"><div class="hstack" style="justify-content:space-between"><b style="font-weight:600">${esc(r.t)}</b></div>
      <div class="hstack mt12" style="flex-wrap:nowrap;gap:8px"><div class="grow"><div class="tiny">존댓말</div><div lang="ja" style="font-size:18px">${esc(r.a)}</div>${r.ak ? `<div class="tiny">${esc(r.ak)}</div>` : ''}</div>${spkBtn(r.a, 'style="background:var(--fill);color:var(--label2)"')}</div>
      <div class="hstack mt8" style="flex-wrap:nowrap;gap:8px"><div class="grow"><div class="tiny" style="color:var(--tint)">친구 말투</div><div lang="ja" style="font-size:20px;font-weight:600">${esc(r.b)}</div>${r.bk ? `<div class="tiny">${esc(r.bk)}</div>` : ''}</div>${spkBtn(r.b.split(' / ')[0])}</div>
      <p class="tiny mt8" style="margin-bottom:0">${esc(r.x)}</p></div>`).join('')}</div>`;
  });
}
function pSlang(k) {
  const c = SLANG[k];
  pushPage(c.cat, el => {
    el.innerHTML = `<h1 class="large">${esc(c.cat)}</h1><p class="subtitle">친구 사이에서만. 점원이나 어른한테는 X</p>
      <div class="list">${c.items.map(x => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(x[0])}</span><span class="ko">${esc(x[2])}</span>${x[3] ? `<span class="note">${esc(x[3])}</span>` : ''}</div><button class="spk" data-act="say" data-t="${esc(x[1])}" data-male="1" aria-label="듣기">${IC.spk}</button></div>`).join('')}</div>
      <button class="btn soft mt16" data-q>퀴즈로 외우기</button>`;
    $('[data-q]', el).addEventListener('click', () => runQuiz({title: c.cat + ' 퀴즈', items: shuffle(c.items).map(x => ({q: `<div class="front ja" lang="ja">${esc(x[0])}</div>`, after: x[1], opts: shuffle([x, ...pick(SLANG.flatMap(s => s.items).filter(y => y !== x), 3)]).map(o => ({h: esc(o[2]), v: o[0]})), ans: x[0], label: `<span lang="ja">${esc(x[0])}</span>`, ansLabel: x[2]}))}));
  });
}
function pTrends() {
  pushPage('요즘 유행어', el => {
    el.innerHTML = `<h1 class="large">요즘 유행어</h1><p class="subtitle">유행어는 반년이면 낡는다. 외국인이 한두 번 쓰면 웃기게 먹히는 정도로만.</p>
      <div class="list">${TRENDS.map(t => `<div class="ph"><div class="tx"><span class="jp" lang="ja">${esc(t[0])}</span><span class="ko">${esc(t[2])}</span>${t[3] ? `<span class="note" lang="ja">${esc(t[3])}</span>` : ''}<span class="note">출처: ${esc(t[4])}</span></div>${spkBtn(t[1])}</div>`).join('')}</div>
      <p class="sf">출처는 일본 고교생·Z세대 대상 설문 기사(LINE 리서치, Z総研 등). 자세한 링크는 커리큘럼 문서의 "08년생처럼 말하기"에 있어.</p>`;
  });
}

/* ---------- AI (Claude) ---------- */
async function aiJSON(prompt) {
  if (!AI) throw new Error('no ai');
  let v;
  if (typeof AI.json === 'function') { v = await AI.json(prompt); if (v && typeof v === 'object') return v; }
  const r = await AI(prompt);
  const txt = (r && r.text) || '';
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}
function pAIChat() {
  const st = {busy: false};
  const page = pushPage('AI 하루토', el => {
    const msgs = S.aiChat || [];
    el.innerHTML = `<div class="hstack" style="gap:12px;margin:4px 0">${harutoAvatar(44)}<div><div style="font-weight:600">하루토 <span class="tiny">AI</span></div><div class="tiny">아무 말이나 걸어 봐. 한국어로 써도 일본어로 고쳐 줘</div></div></div>
      <div class="chat">${msgs.length ? '' : `<div class="sysmsg">예: "안녕! 나 한국에서 왔어" / こんにちは!</div>`}${msgs.map(m => m.r === 'me' ? `<div class="bub me">${esc(m.t)}</div>${m.better ? `<div class="fb ok"><span lang="ja"><b>${esc(m.better)}</b></span>${m.tip ? `<br><span class="small">${esc(m.tip)}</span>` : ''} <button class="navbtn small" data-act="say" data-t="${esc(m.better)}">${IC.spk}</button></div>` : ''}` : `<div class="bub them" data-act="tr" data-t="${esc(m.kana || m.t)}" lang="ja">${esc(m.t)}<span class="tr" lang="ko">${esc(m.ko || '')}</span></div>`).join('')}${st.busy ? '<div class="sysmsg">하루토가 입력 중…</div>' : ''}</div>
      <div class="composer"><textarea id="aiIn" rows="1" placeholder="메시지" ${st.busy ? 'disabled' : ''}></textarea><button class="send" data-send aria-label="보내기">${IC.send}</button></div>
      ${msgs.length ? '<button class="navbtn small" data-clear>대화 지우기</button>' : ''}`;
    requestAnimationFrame(() => page.el.scrollTo({top: page.el.scrollHeight}));
    const inp = $('#aiIn', el);
    const send = async () => {
      const t = inp.value.trim(); if (!t || st.busy) return;
      S.aiChat.push({r: 'me', t}); st.busy = true; page.render();
      const hist = S.aiChat.slice(-12).map(m => (m.r === 'me' ? 'Friend: ' : 'Haruto: ') + m.t).join('\n');
      try {
        const r = await aiJSON(`You are Haruto (はると), an 18-year-old Japanese guy born in 2008, a high-school senior in Tokyo, chatting on LINE with a Korean friend the same age. The friend is a beginner learning Japanese for a one-month stay in Japan from January 7. Reply like a real 18-year-old Tokyo guy: natural casual Japanese (タメ口; まじ, ガチ, 〜じゃん, 〜くね? when natural), 1-2 short sentences, simple words a beginner can follow. Never use rude pronouns like お前 or てめえ. Keep it friendly and ask small questions to keep the chat going.\nChat so far:\n${hist}\nReturn ONLY JSON: {"jp": your reply with natural kanji, "kana": the same reply fully in hiragana/katakana, "ko": Korean translation of your reply, "better": a natural casual Japanese version of the friend's LAST message (if they wrote Korean, translate it; if it was already natural Japanese, empty string), "tip": one short Korean sentence explaining the fix or a useful expression, or empty string}`);
        const last = S.aiChat[S.aiChat.length - 1];
        if (r) { last.better = r.better || ''; last.tip = r.tip || ''; S.aiChat.push({r: 'h', t: r.jp || '…', kana: r.kana || '', ko: r.ko || ''}); speak(r.kana || r.jp, {male: true}); }
      } catch (e) { toast(e && e.code === 'not_granted' ? 'AI 사용이 꺼져 있어' : '지금은 답장을 못 받아. 잠시 후에'); }
      S.aiChat = S.aiChat.slice(-40); st.busy = false; save(); page.render();
    };
    $('[data-send]', el).addEventListener('click', send);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    const cl = $('[data-clear]', el); if (cl) cl.addEventListener('click', () => { S.aiChat = []; save(); page.render(); });
  });
}
function pTranslate() {
  const st = {busy: false, r: null, q: ''};
  const page = pushPage('일본어로?', el => {
    el.innerHTML = `<h1 class="large">일본어로?</h1><p class="subtitle">하고 싶은 말을 한국어로. 세 가지 말투로 알려 줄게</p>
      <textarea class="field" id="trIn" placeholder="예: 이거 맵지 않아요? / 내일 몇 시에 만날까?">${esc(st.q)}</textarea>
      <button class="btn mt12" data-go ${st.busy ? 'disabled' : ''}>${st.busy ? '생각 중…' : IC.sparkle + ' 바꾸기'}</button>
      ${st.r ? `<div class="list mt16">${[['polite', '존댓말', '처음 보는 사람·어른'], ['casual', '08년생 친구 말투', '동갑 친구'], ['clerk', '점원한테 짧게', '가게·식당']].map(([k, l, s]) => st.r[k] ? `<div class="ph"><div class="tx"><span class="tiny">${l} · ${s}</span><span class="jp" lang="ja">${esc(st.r[k].jp)}</span><span class="hg" lang="ja">${esc(st.r[k].kana || '')}</span></div><div class="stack" style="gap:6px">${spkBtn(st.r[k].kana || st.r[k].jp)}<button class="spk" data-addc="${k}" aria-label="카드에 넣기">${IC.plus}</button></div></div>` : '').join('')}</div>${st.r.note ? `<p class="sf">${esc(st.r.note)}</p>` : ''}` : ''}`;
    $('[data-go]', el).addEventListener('click', async () => {
      const q = $('#trIn', el).value.trim(); if (!q) return; st.q = q; st.busy = true; page.render();
      try {
        st.r = await aiJSON(`A Korean 18-year-old beginner (going to Japan for a month) wants to say this in Japanese: "${q}". Give three versions. Return ONLY JSON: {"polite": {"jp": polite です・ます Japanese with natural kanji, "kana": full kana reading}, "casual": {"jp": how an 18-year-old Tokyo guy would say it to a friend the same age (natural タメ口), "kana": kana reading}, "clerk": {"jp": the short natural phrase a young person would actually say to a shop or restaurant clerk, or the polite version if not a shop situation, "kana": kana reading}, "note": one short Korean sentence about nuance}`);
      } catch (e) { toast('지금은 바꿀 수 없어'); }
      st.busy = false; page.render();
    });
    $$('[data-addc]', el).forEach(b => b.addEventListener('click', () => {
      const v = st.r[b.dataset.addc]; const id = Date.now().toString(36);
      S.custom.push({id, ko: st.q, jp: v.jp, kana: v.kana || '', note: b.dataset.addc === 'casual' ? '친구 말투' : ''}); addCard('c:' + id); save(); toast('카드에 넣었어');
    }));
  });
}

/* ================= ACTIONS ================= */
const ACT = {
  back: () => popPage(),
  say: d => speak(d.t, {male: d.male === '1'}),
  reveal: (d, el) => el.classList.remove('hid'),
  tr: (d, el) => { const tr = $('.tr', el); if (tr) tr.hidden = !tr.hidden; if (d.t) speak(d.t, {male: d.who !== '1'}); },
  tab: d => { closeAllPages(); closeSheet(true); S.tab = d.tab; if (d.tab === 'today') VIEW.day = null; save(); try { history.replaceState(null, '', '#' + d.tab); } catch (e) {} render(); window.scrollTo(0, 0); },
  selDay: d => { VIEW.day = d.d === today() ? null : d.d; render(); },
  goDay: d => { closeAllPages(); S.tab = 'today'; VIEW.day = d.d === today() ? null : d.d; render(); window.scrollTo(0, 0); },
  week: d => { VIEW.day = addDays(VIEW.day || today(), +d.n); render(); },
  startSet: d => { if (S.run) { openFocus(); toast('진행 중인 세트가 있어'); return; } startRun(d.d, +d.n, 20); render(); },
  startShort: d => { if (S.run) { openFocus(); return; } startRun(d.d, +d.n, 5); },
  openFocus: () => openFocus(),
  checkin: d => checkIn(d.d, +d.n, 0),
  dismissY: d => { S.asked['y' + d.d] = 1; save(); render(); },
  sos: () => pSOS(),
  sosShow: d => { if (d.j === 'al') { const al = (S.allergen || []); sosFull(`${al.join('、')}のアレルギーがあります。これは入っていますか?`, `${al.map(a => (ALLERGENS.find(x => x[0] === a) || [])[1]).join(', ')} 알레르기가 있어요. 이거 들어 있나요?`); } else { const s = SOS[+d.j]; sosFull(s[0], s[1]); } },
  allergen: d => { S.allergen = S.allergen || []; const k = S.allergen.indexOf(d.a); if (k >= 0) S.allergen.splice(k, 1); else S.allergen.push(d.a); save(); PAGES[PAGES.length - 1].render(); },
  kana: d => pKana(d.set),
  kanaInfo: d => kanaSheet(d.k),
  kq: d => {
    const all = {hira: HIRA_ALL, kata: KATA_ALL, daku: DAKU_ALL, yoon: YOON_ALL}[d.set];
    if (d.mode === 'speed') runQuiz({title: '스피드 테스트', items: kanaQuizItems(all, 'read'), timed: 2000, passText: r => `평균 ${(r.avg / 1000).toFixed(2)}초 · 목표 2초`});
    else if (d.mode === 'weak') runQuiz({title: '약한 글자', items: kanaQuizItems(weakKana(all), 'read', all).concat(kanaQuizItems(weakKana(all), 'listen', all))});
    else runQuiz({title: d.mode === 'listen' ? '듣고 고르기' : '보고 읽기', items: kanaQuizItems(all, d.mode, all).slice(0, 20)});
  },
  kadd: d => { const all = {hira: HIRA_ALL, kata: KATA_ALL, daku: DAKU_ALL, yoon: YOON_ALL}[d.set]; let n = 0; all.forEach(k => { if (addCard('k:' + k)) n++; }); toast(n ? `${n}자를 카드에 넣었어` : '이미 다 들어 있어'); },
  kaddOne: (d, el) => { if (addCard('k:' + d.k)) { el.textContent = '카드에 넣었어'; } },
  learnKana: d => pLearnKana(+d.i),
  quizKana: d => {
    const i = +d.i, list = DAYS[i].s1.kana;
    const learnedPool = [...new Set(DAYS.slice(0, i + 1).flatMap(x => (x.s1 && x.s1.kana) || []).filter(k => isKata(k) === isKata(list[0])))];
    runQuiz({title: '셀프 테스트', items: shuffle(kanaQuizItems(list, 'read', learnedPool).concat(kanaQuizItems(list, 'listen', learnedPool))).slice(0, 24)});
  },
  confuse: d => pConfuse(d.set),
  speed: d => runQuiz({title: '46자 스피드 테스트', items: kanaQuizItems(d.set === 'kata' ? KATA_ALL : HIRA_ALL, 'read'), timed: 2000, passText: r => `평균 ${(r.avg / 1000).toFixed(2)}초 · 목표: 정답 95%, 2초`}),
  rules: d => pRules(d.k),
  book: () => pBook(),
  bookPage: () => pBook(),
  bookToggle: d => { S.book[d.n] = !S.book[d.n]; save(); PAGES[PAGES.length - 1].render(); },
  phrases: d => pDayPhrases(+d.i),
  speakToday: d => runFlash({title: '말하기 카드', items: shuffle(DAYS[+d.i].s2.ph).map(id => cardItem('p:' + id))}),
  rp: d => runRoleplay(d.k),
  chat: d => runChat(d.id),
  numbers: d => { if (d.lv) S.numLevel = +d.lv; runNumbers(); },
  pairs: d => runPairs(d.f),
  hanja: () => pHanja(),
  signs: () => pSigns(),
  scene: d => pScene(d.s),
  shadowAll: () => { const ids = [...new Set(Object.keys(S.cards).filter(id => id.startsWith('p:')).map(id => id.slice(2)))]; const list = (ids.length ? ids : CORE30).map(id => PH_BY[id]).filter(Boolean); pShadow(list, ids.length ? '지금까지 배운 표현' : '핵심 문장'); },
  review: () => { const due = shuffle(dueCards()); if (!due.length) { toast('오늘 복습할 카드가 없어'); return; } runFlash({title: '카드 복습', items: due.map(cardItem), srs: true, target: 12, onDone: () => render()}); },
  ahead: () => { const ids = Object.keys(S.cards).filter(id => cardExists(id) && S.cards[id].due === addDays(today(), 1)); if (!ids.length) { toast('내일 카드가 없어'); return; } runFlash({title: '미리 복습', items: shuffle(ids).map(cardItem), srs: true}); },
  weak: () => { const ids = Object.keys(S.cards).filter(id => cardExists(id) && (S.cards[id].w >= 2 || (S.cards[id].b === 1 && S.cards[id].n > 0))); if (!ids.length) { toast('자주 틀린 카드가 없어. 좋아'); return; } runFlash({title: '자주 틀린 것', items: shuffle(ids).slice(0, 20).map(cardItem), srs: true}); },
  recall: d => pRecall(d.d || today()),
  memo: () => pMemo(),
  allCards: () => pAllCards(),
  test: d => runTest(+d.w),
  core: () => pCore(),
  depart: () => pDepart(),
  checkItem: d => { S.check[d.j] = !S.check[d.j]; save(); PAGES[PAGES.length - 1].render(); },
  curriculum: () => pCurriculum(),
  pitfalls: () => pPitfalls(),
  casual: d => { S.settings.casual = d.v === '1'; save(); render(); },
  talkRules: () => pTalkRules(),
  slang: d => pSlang(+d.k),
  trends: () => pTrends(),
  aichat: () => pAIChat(),
  translate: () => pTranslate(),
  set: d => { S.settings[d.k] = d.k === 'rate' ? +d.v : d.v; save(); render(); if (d.k === 'rate') speak('こんにちは'); },
  backup: () => { const txt = JSON.stringify(S); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('백업을 복사했어. 메모 앱에 붙여 둬'), () => showBackup(txt)); else showBackup(txt); },
  restore: () => openSheet(b => {
    b.innerHTML = `<h2>백업 복원</h2><p class="muted small">복사해 둔 백업을 붙여넣어. 지금 기록은 덮어써져.</p>${IS_PWA ? '<input type="file" id="rsf" accept="application/json,.json,.txt" class="field mt12">' : ''}<textarea class="field mt12" id="rs" placeholder="백업 붙여넣기"></textarea><button class="btn mt12" data-ok>복원</button>`;
    const rf = $('#rsf', b); if (rf) rf.addEventListener('change', () => { const f = rf.files[0]; if (!f) return; f.text().then(t => { $('#rs', b).value = t; }); });
    $('[data-ok]', b).addEventListener('click', () => { try { const v = JSON.parse($('#rs', b).value); if (!v || typeof v !== 'object' || !v.settings) throw 0; S = Object.assign(DEFAULT_STATE(), v); save(); closeSheet(); render(); toast('복원했어'); } catch (e) { toast('백업 형식이 아니야'); } });
  }),
  reset: () => openSheet(b => {
    b.innerHTML = `<h2>처음부터 다시?</h2><p class="muted small">세트 기록, 카드, 테스트 결과가 전부 지워져. 되돌릴 수 없어.</p><div class="stack mt16"><button class="btn red" data-ok>전부 지우기</button><button class="btn grey" data-no>취소</button></div>`;
    $('[data-ok]', b).addEventListener('click', () => { S = DEFAULT_STATE(); S.asked.welcome = 1; save(); closeSheet(); render(); toast('초기화했어'); });
    $('[data-no]', b).addEventListener('click', () => closeSheet());
  })
};
function showBackup(txt) { openSheet(b => { b.innerHTML = `<h2>백업</h2><p class="muted small">아래 글을 전부 길게 눌러 복사해서 메모에 붙여 둬.</p><textarea class="field mt12" readonly style="min-height:200px;font-size:12px">${esc(txt)}</textarea>`; }); }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (!a) return;
  if (a.tagName === 'A') return;
  const f = ACT[a.dataset.act];
  if (f) { e.preventDefault(); f(a.dataset, a); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('.sos')) $('.sos').remove(); else if (SHEET) closeSheet(); else if (PAGES.length) popPage(); }
});
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== S.tab) { closeAllPages(); S.tab = h; render(); } });

/* ---------- welcome ---------- */
function welcome() {
  if (S.asked.welcome) return;
  openSheet(b => {
    b.innerHTML = `<h2>일본까지 6주</h2><p class="muted">11월 25일부터 1월 6일까지 하루 20분씩 세 번. 교재로 배우고, 듣고 말하고, 자기 전에 복습해.</p>
      <p class="sh" style="margin-left:0">세트 시간 정하기</p><div class="list">${[1, 2, 3].map(n => `<div class="row"><span class="dot" style="background:${SET_COL[n]}"></span><span class="t"><b>${SET_NAME[n]}</b></span><input type="time" class="field" style="width:148px;min-height:36px;padding:4px 8px;font-size:16px" data-wt="${n - 1}" value="${S.settings.times[n - 1]}"></div>`).join('')}</div>
      <p class="sf">세트 사이는 3시간 이상. 시간이 지나면 했는지 물어보고, 못 했으면 이유를 캐물을 거야.${IS_PWA ? ' 정한 다음 나 탭에서 폰 캘린더 알림도 넣어 둬.' : ''}</p>
      <button class="btn mt16" data-go>시작하기</button>`;
    $('[data-go]', b).addEventListener('click', () => { $$('[data-wt]', b).forEach(i => { if (i.value) S.settings.times[+i.dataset.wt] = i.value; }); S.asked.welcome = 1; save(); closeSheet(); render(); });
  }, {sticky: true});
}

