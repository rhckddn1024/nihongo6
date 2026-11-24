/* ================= ENGINES ================= */

/* ---------- multiple-choice quiz ---------- */
function runQuiz(cfg) {
  const items = cfg.items.slice();
  const st = {i: 0, ok: 0, wrong: [], times: [], t0: 0, answered: false, done: false};
  const page = pushPage(cfg.title, el => {
    if (st.done) return renderResult(el);
    const it = items[st.i];
    el.innerHTML = `
      <div class="large" style="font-size:28px;line-height:34px">${esc(cfg.title)}</div>
      <div class="hstack mt8"><div class="progress grow"><i style="width:${st.i / items.length * 100}%"></i></div><span class="tiny kbd">${st.i + 1} / ${items.length}</span></div>
      ${cfg.timed ? `<p class="tiny mt8">목표: 한 문제 ${cfg.timed / 1000}초 안에</p>` : ''}
      <div class="flash mt16" style="min-height:220px">${it.q}${it.audio ? `<button class="btn soft sm" data-act="say" data-t="${esc(it.audio)}">${IC.spk} 다시 듣기</button>` : ''}</div>
      <div class="qa mt16">${it.opts.map((o, j) => `<button data-qi="${j}" ${o.ja ? 'lang="ja"' : ''}>${o.h}</button>`).join('')}</div>
      <div class="qexp mt16"></div>`;
    st.answered = false; st.t0 = performance.now();
    if (it.audio && it.autoAudio !== false) setTimeout(() => speak(it.audio), 120);
    $$('.qa button', el).forEach(b => b.addEventListener('click', () => answer(+b.dataset.qi, el)));
  });
  function answer(j, el) {
    if (st.answered) return; st.answered = true;
    const it = items[st.i], ms = performance.now() - st.t0, o = it.opts[j];
    const ok = o.v === it.ans;
    st.times.push(ms);
    if (it.kana) kanaStat(it.kana, ok, ms);
    const btns = $$('.qa button', el);
    btns.forEach((b, k) => { if (it.opts[k].v === it.ans) b.classList.add('ok'); });
    if (ok) { st.ok++; haptic(); } else { btns[j].classList.add('no'); st.wrong.push(it); if (it.srs && S.cards[it.srs]) grade(it.srs, 'wrong'); }
    if (it.after) speak(it.after);
    const slow = cfg.timed && ms > cfg.timed;
    const exp = $('.qexp', el);
    if (!ok || it.explain || slow) {
      exp.innerHTML = `${slow && ok ? `<p class="warn-t small center">맞았는데 ${(ms / 1000).toFixed(1)}초. 목표보다 느려</p>` : ''}${it.explain ? `<div class="card small">${it.explain}</div>` : ''}<button class="btn mt12" data-next>다음</button>`;
      $('[data-next]', exp).addEventListener('click', next);
    } else setTimeout(next, 520);
  }
  function next() { st.i++; if (st.i >= items.length) { st.done = true; save(); if (cfg.onDone) cfg.onDone(result()); } page.render(); }
  function result() { const avg = st.times.length ? st.times.reduce((a, b) => a + b, 0) / st.times.length : 0; return {ok: st.ok, total: items.length, avg, wrong: st.wrong}; }
  function renderResult(el) {
    const r = result(), pct = Math.round(r.ok / r.total * 100);
    el.innerHTML = `
      <div class="large" style="font-size:28px">${esc(cfg.title)}</div>
      <div class="card center mt16"><div class="res-big ${pct >= 90 ? 'ok-t' : pct >= 70 ? 'warn-t' : 'no-t'}">${pct}%</div>
      <p class="muted">${r.ok} / ${r.total} 정답${cfg.timed ? ` · 평균 ${(r.avg / 1000).toFixed(2)}초` : ''}</p>
      ${cfg.passText ? `<p class="small">${cfg.passText(r)}</p>` : ''}</div>
      ${r.wrong.length ? `<p class="sh">틀린 문제</p><div class="list">${r.wrong.map(w => `<div class="row"><span class="t"><b>${w.label || w.q}</b>${w.ansLabel ? `<small>${w.ansLabel}</small>` : ''}</span></div>`).join('')}</div>` : ''}
      <div class="stack mt24">${r.wrong.length && !cfg.noRetry ? `<button class="btn soft" data-retry>틀린 것만 다시</button>` : ''}<button class="btn" data-act="back">완료</button></div>`;
    const rb = $('[data-retry]', el);
    if (rb) rb.addEventListener('click', () => { popPage(); setTimeout(() => runQuiz(Object.assign({}, cfg, {items: shuffle(r.wrong), onDone: null, title: cfg.title + ' (다시)'})), 60); });
  }
  return page;
}
function kanaQuizItems(pool, mode, dpool) {
  dpool = dpool || pool;
  return shuffle(pool).map(k => {
    const info = KANA_INFO[k];
    const others = pick(dpool.filter(x => x !== k && KANA_INFO[x].hg !== info.hg), 3);
    if (mode === 'listen') {
      return {q: '<div class="ctx">들리는 글자는?</div>', audio: k, kana: k, srs: 'k:' + k, opts: shuffle([k, ...others]).map(x => ({h: `<span lang="ja" style="font-size:30px">${x}</span>`, v: x})), ans: k, label: `<span lang="ja">${k}</span>`, ansLabel: info.hg + ' ' + info.ro};
    }
    return {q: `<div class="bigkana" style="font-size:96px" lang="ja">${k}</div>`, kana: k, srs: 'k:' + k, after: k, opts: shuffle([k, ...others]).map(x => ({h: `${KANA_INFO[x].hg}<br><span class="tiny">${KANA_INFO[x].ro}</span>`, v: x})), ans: k, label: `<span lang="ja">${k}</span>`, ansLabel: info.hg + ' ' + info.ro, explain: info.mn ? esc(info.mn) : ''};
  });
}

/* ---------- flash cards (self-rated, SRS-aware) ---------- */
function cardItem(id) {
  const t = id[0], v = id.slice(2), hm = hangulMode() !== 'hide';
  if (t === 'k') { const k = KANA_INFO[v]; return {id, kind: '글자 읽기', front: `<div class="bigkana" lang="ja">${k.k}</div>`, back: `<div class="ans">${k.hg} <span class="muted">${k.ro}</span></div>${k.mn ? `<div class="ctx">${esc(k.mn)}</div>` : ''}`, audio: k.k, kana: v}; }
  if (t === 'p') {
    const p = PH_BY[v];
    if (p.w === 'staff') return {id, kind: '듣고 이해하기', front: `<div class="ctx">점원이나 안내 방송이 이렇게 말한다</div><button class="btn soft sm" data-act="say" data-t="${esc(p.k)}">${IC.spk} 다시 듣기</button><div class="front" style="font-size:22px">무슨 뜻일까?</div>`, back: `<div class="ans" lang="ja">${esc(clean(p.k))}</div>${hm ? `<div class="hg">${esc(toHangul(p.k))}</div>` : ''}<div class="front" style="font-size:20px">${esc(p.ko)}</div>${p.n ? `<div class="ctx">${esc(p.n)}</div>` : ''}`, audio: p.k, frontAudio: true};
    return {id, kind: '말하기', front: `<div class="ctx">소리 내서 일본어로 말해 봐</div><div class="front">${esc(p.ko)}</div>`, back: `<div class="ans" lang="ja">${esc(clean(p.k))}</div>${hm ? `<div class="hg">${esc(toHangul(p.k))}</div>` : ''}${p.c ? `<div class="ctx" lang="ja"><span class="tag cas">친구</span>${esc(p.c)}</div>` : ''}`, audio: p.k};
  }
  if (t === 's') { const s = SIGNS[+v]; return {id, kind: '간판 한자', front: `<div class="bigkana" style="font-size:72px" lang="ja">${s[0]}</div><div class="ctx">무슨 뜻?</div>`, back: `<div class="ans">${esc(s[2])}</div><div class="hg" lang="ja">${s[1]}</div>`, audio: s[1]}; }
  if (t === 'c') { const c = S.custom.find(x => x.id === v); return {id, kind: '내 카드', front: `<div class="ctx">일본어로?</div><div class="front">${esc(c.ko)}</div>`, back: `<div class="ans" lang="ja">${esc(c.jp)}</div>${c.kana && c.kana !== c.jp ? `<div class="hg" lang="ja">${esc(c.kana)}</div>` : ''}${c.note ? `<div class="ctx">${esc(c.note)}</div>` : ''}`, audio: c.kana || c.jp}; }
  return null;
}
function runFlash(cfg) {
  const queue = cfg.items.filter(Boolean).slice();
  const st = {i: 0, ok: 0, slow: 0, wrong: 0, revealed: false, t0: 0, requeued: new Set(), started: Date.now(), done: false, wrongItems: []};
  const page = pushPage(cfg.title, el => {
    if (st.done || !queue.length) return renderEnd(el);
    const it = queue[st.i];
    const mins = Math.floor((Date.now() - st.started) / 60000);
    el.innerHTML = `
      <div class="hstack" style="justify-content:space-between"><div class="large" style="font-size:28px;line-height:34px">${esc(cfg.title)}</div>${cfg.target ? `<span class="tiny kbd">${mins}분 / ${cfg.target}분</span>` : ''}</div>
      <div class="hstack mt8"><div class="progress grow"><i style="width:${st.i / queue.length * 100}%"></i></div><span class="tiny kbd">${st.i + 1} / ${queue.length}</span></div>
      <div class="flash mt16" data-card><span class="kind">${esc(it.kind || '')}</span>${it.front}<div class="backside" hidden>${it.back}</div></div>
      <div class="mt16 acts">${st.revealed ? '' : '<button class="btn" data-reveal>정답 보기</button>'}</div>`;
    st.t0 = performance.now();
    if (it.frontAudio) setTimeout(() => speak(it.audio), 150);
    const reveal = () => {
      if (st.revealed) return; st.revealed = true;
      const ms = performance.now() - st.t0; st.ms = ms;
      $('.backside', el).hidden = false;
      if (it.audio) speak(it.audio);
      $('.acts', el).innerHTML = `<p class="tiny center">${(ms / 1000).toFixed(1)}초 걸림${ms > 3000 ? ' · 맞아도 느림 처리' : ''}</p><div class="rate mt8"><button class="btn grey" data-r="wrong">${IC.x} 틀렸어</button><button class="btn green" data-r="ok">${IC.check} 맞았어</button></div>`;
      $$('[data-r]', el).forEach(b => b.addEventListener('click', () => rateIt(b.dataset.r)));
    };
    $('[data-reveal]', el) && $('[data-reveal]', el).addEventListener('click', reveal);
    $('[data-card]', el).addEventListener('click', e => { if (!e.target.closest('[data-act]')) reveal(); });
  });
  function rateIt(r) {
    const it = queue[st.i];
    let res = r === 'wrong' ? 'wrong' : (st.ms > 3000 ? 'slow' : 'ok');
    if (res === 'wrong') { st.wrong++; st.wrongItems.push(it); if (!st.requeued.has(it.id || st.i)) { st.requeued.add(it.id || st.i); queue.push(it); } }
    else if (res === 'slow') st.slow++; else st.ok++;
    if (it.kana) kanaStat(it.kana, res !== 'wrong', st.ms);
    if (cfg.srs && it.id && !it._graded) { grade(it.id, res); it._graded = true; }
    if (cfg.onRate) cfg.onRate(it, res);
    st.revealed = false; st.i++;
    if (st.i >= queue.length) { st.done = true; save(); if (cfg.onDone) cfg.onDone({ok: st.ok, slow: st.slow, wrong: st.wrong, total: cfg.items.length, wrongItems: st.wrongItems}); }
    page.render();
  }
  function renderEnd(el) {
    const mins = Math.max(1, Math.round((Date.now() - st.started) / 60000));
    el.innerHTML = `<div class="large" style="font-size:28px">${esc(cfg.title)}</div>
      ${queue.length ? `<div class="card center mt16"><div class="res-big ok-t">${st.ok + st.slow}</div><p class="muted">맞힘 ${st.ok} · 느림 ${st.slow} · 틀림 ${st.wrong} · ${mins}분</p>
      <p class="small">${st.wrong ? '틀린 카드는 내일 다시 나와.' : '전부 맞혔어. 다음 복습 날짜가 뒤로 밀렸어.'}</p></div>` : `<div class="empty-state">오늘 할 카드가 없어</div>`}
      <div class="stack mt24"><button class="btn" data-act="back">완료</button></div>`;
  }
  return page;
}

/* ---------- roleplay (staff ↔ me) ---------- */
function runRoleplay(key) {
  const steps = key === 'ALL' ? ['konbini', 'train', 'restaurant', 'pharmacy', 'stay'].flatMap(k => RP[k].steps.map(s => Object.assign({scene: RP[k].name}, s))) : RP[key].steps;
  const name = key === 'ALL' ? '하루 시나리오' : RP[key].name;
  const st = {i: 0, log: [], good: 0, pending: true, lastScene: ''};
  pushPage(name + ' 롤플레이', (el, page) => {
    el.innerHTML = `<div class="large" style="font-size:28px">${esc(name)}</div><p class="subtitle">점원 말을 듣고 대답을 골라. 고른 다음엔 소리 내서 따라 해.</p><div class="chat"></div><div class="choices"></div>`;
    const chat = $('.chat', el), ch = $('.choices', el);
    st.log.forEach(h => chat.insertAdjacentHTML('beforeend', h));
    step();
    function add(h) { st.log.push(h); chat.insertAdjacentHTML('beforeend', h); requestAnimationFrame(() => page.el.scrollTo({top: page.el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth'})); }
    function step() {
      if (st.i >= steps.length) {
        ch.innerHTML = `<div class="fb good"><b>끝!</b> 자연스러운 대답 ${st.good} / ${steps.length}</div><div class="rate"><button class="btn grey" data-again>다시</button><button class="btn" data-act="back">완료</button></div>`;
        $('[data-again]', ch).addEventListener('click', () => { st.i = 0; st.log = []; st.good = 0; page.render(); });
        return;
      }
      const s = steps[st.i];
      if (!s._shown) {
        if (s.scene && s.scene !== st.lastScene) { add(`<div class="sysmsg"><b>${esc(s.scene)}</b></div>`); st.lastScene = s.scene; }
        if (s.s) { add(`<div class="bub them" lang="ja" data-act="say" data-t="${esc(s.s)}">${esc(s.s)}<span class="tr" data-tr="${st.i}" lang="ko">탭해서 다시 듣기</span></div>`); speak(s.s); }
        else add(`<div class="sysmsg">${esc(s.ko)}</div>`);
        s._shown = true;
      }
      ch.innerHTML = s.o.map((o, j) => `<button class="choice" data-o="${j}"><span lang="ja">${esc(o[0])}</span>${o[1] ? `<small>${esc(o[1])}</small>` : ''}</button>`).join('');
      $$('[data-o]', ch).forEach(b => b.addEventListener('click', () => {
        const o = s.o[+b.dataset.o];
        if (s.s) { const tr = chat.querySelector(`[data-tr="${st.i}"]`); if (tr) tr.textContent = s.ko; st.log = st.log.map(h => h.includes(`data-tr="${st.i}"`) ? h.replace('탭해서 다시 듣기', esc(s.ko)) : h); }
        add(`<div class="bub me" lang="ja">${esc(o[0])}${o[1] ? `<span class="tr" lang="ko">${esc(o[1])}</span>` : ''}</div>`);
        if (!o[0].startsWith('(')) speak(o[0]);
        add(`<div class="fb ${o[2] === 'g' ? 'good' : o[2] === 'o' ? 'ok' : 'bad'}">${o[2] === 'g' ? '자연스러워. ' : o[2] === 'o' ? '통하긴 해. ' : '이건 아니야. '}${esc(o[3])}</div>`);
        if (o[2] === 'g') st.good++;
        ch.innerHTML = `<button class="btn" data-n>다음</button>`;
        $('[data-n]', ch).addEventListener('click', () => { st.i++; step(); });
      }));
    }
  });
  steps.forEach(s => delete s._shown);
}

/* ---------- Haruto chat scenarios ---------- */
function harutoAvatar(size = 36) { return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(160deg,#5AC8FA,#007AFF);color:#fff;display:inline-grid;place-items:center;font-weight:700;font-size:${size * .45}px;flex:none" lang="ja">は</span>`; }
function runChat(id) {
  const sc = CHATS.find(c => c.id === id);
  const st = {i: 0, log: [], good: 0};
  pushPage(sc.name, (el, page) => {
    el.innerHTML = `<div class="hstack" style="gap:12px;margin:4px 0 6px">${harutoAvatar(44)}<div><div style="font-weight:600">하루토 <span class="muted small" lang="ja">はると</span></div><div class="tiny">2008년생 · 도쿄 고3 · 말풍선을 탭하면 뜻이 보여</div></div></div><p class="sf" style="margin:4px 0 0">${esc(sc.desc)}</p><div class="chat mt8"></div><div class="choices"></div>`;
    const chat = $('.chat', el), ch = $('.choices', el);
    st.log.forEach(h => chat.insertAdjacentHTML('beforeend', h));
    next();
    function add(h) { st.log.push(h); chat.insertAdjacentHTML('beforeend', h); requestAnimationFrame(() => page.el.scrollTo({top: page.el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth'})); }
    function next() {
      if (st.i >= sc.steps.length) {
        S.talkDone[id] = today(); save();
        ch.innerHTML = `<div class="fb good"><b>대화 끝</b> · 자연스러운 대답 ${st.good} / ${sc.steps.length}</div><div class="rate"><button class="btn grey" data-again>다시</button><button class="btn" data-act="back">완료</button></div>`;
        $('[data-again]', ch).addEventListener('click', () => { st.i = 0; st.log = []; st.good = 0; page.render(); });
        return;
      }
      const s = sc.steps[st.i];
      if (!s._shown) {
        if (s.sys) add(`<div class="sysmsg">${esc(s.sys)}</div>`);
        add(`<div class="bub them" data-act="tr" data-t="${esc(s.hk || s.h)}" data-who="${s.who ? 1 : 0}" lang="ja">${s.who ? `<span class="tiny">${esc(s.who)}</span><br>` : ''}${esc(s.h)}<span class="tr" hidden lang="ko">${esc(s.ko)}</span></div>`);
        speak(s.hk || s.h, {male: !s.who});
        s._shown = true;
      }
      ch.innerHTML = `<div class="hstack" style="justify-content:space-between"><span class="tiny">뭐라고 할까?</span><button class="navbtn small" data-act="say" data-t="${esc(s.hk || s.h)}">${IC.spk} 다시 듣기</button></div>` + s.o.map((o, j) => `<button class="choice" data-o="${j}"><span lang="ja">${esc(o[0])}</span>${o[1] ? `<small>${esc(o[1])}</small>` : ''}</button>`).join('');
      $$('[data-o]', ch).forEach(b => b.addEventListener('click', () => {
        const o = s.o[+b.dataset.o];
        add(`<div class="bub me" lang="ja">${esc(o[0])}${o[1] ? `<span class="tr" lang="ko">${esc(o[1])}</span>` : ''}</div>`);
        if (!o[0].startsWith('(')) speak(o[0]);
        add(`<div class="fb ${o[2] === 'g' ? 'good' : o[2] === 'o' ? 'ok' : 'bad'}">${esc(o[3])}</div>`);
        if (o[2] === 'g') st.good++;
        st.i++;
        ch.innerHTML = '';
        setTimeout(next, reduceMotion() ? 0 : 650);
      }));
    }
  });
  sc.steps.forEach(s => delete s._shown);
}

/* ---------- numbers listening ---------- */
function runNumbers(cfg = {}) {
  const levels = cfg.levels || [S.numLevel || 3];
  const count = cfg.count || 10;
  const st = {lv: levels[0], i: 0, ok: 0, cur: null, checked: false, done: false, misses: []};
  const newQ = () => { const lv = cfg.levels ? levels[rnd(0, levels.length - 1)] : st.lv; st.cur = Object.assign({lv}, NUM_LEVELS[lv].gen()); st.checked = false; };
  newQ();
  const page = pushPage(cfg.title || '숫자·가격 듣기', el => {
    if (st.done) {
      const pct = Math.round(st.ok / count * 100);
      el.innerHTML = `<div class="large" style="font-size:28px">${esc(cfg.title || '숫자·가격 듣기')}</div><div class="card center mt16"><div class="res-big ${pct >= 90 ? 'ok-t' : pct >= 70 ? 'warn-t' : 'no-t'}">${pct}%</div><p class="muted">${st.ok} / ${count}</p></div>
      ${st.misses.length ? `<p class="sh">틀린 것</p><div class="list">${st.misses.map(m => `<div class="row"><span class="t"><b lang="ja">${esc(m.show)}</b><small lang="ja">${esc(m.k)} · 내 답 ${esc(m.mine)}</small></span>${spkBtn(m.k)}</div>`).join('')}</div>` : ''}
      <div class="stack mt24">${cfg.onDone ? '' : '<button class="btn soft" data-again>한 판 더</button>'}<button class="btn" data-act="back">완료</button></div>`;
      const a = $('[data-again]', el); if (a) a.addEventListener('click', () => { st.i = 0; st.ok = 0; st.done = false; st.misses = []; newQ(); page.render(); });
      return;
    }
    const q = st.cur;
    el.innerHTML = `
      <div class="large" style="font-size:28px">${esc(cfg.title || '숫자·가격 듣기')}</div>
      ${cfg.levels ? '' : `<div class="chips scroll mt8">${NUM_LEVELS.slice(1).map((l, j) => `<button class="pill ${st.lv === j + 1 ? 'on' : ''}" data-lv="${j + 1}">${esc(l.n)}</button>`).join('')}</div>`}
      <div class="hstack mt12"><div class="progress grow"><i style="width:${st.i / count * 100}%"></i></div><span class="tiny kbd">${st.i + 1} / ${count}</span></div>
      <div class="flash mt16" style="min-height:200px">
        <button class="btn sm" data-play style="min-height:56px;border-radius:28px;padding:0 26px">${IC.spk} 듣기</button>
        <div class="hstack"><button class="pill" data-slow>천천히</button></div>
        ${st.checked ? `<div class="ans ${st.lastOk ? 'ok-t' : 'no-t'}" lang="ja">${esc(q.show)}</div><div class="hg" lang="ja">${esc(q.k)}</div>` : ''}
      </div>
      <div class="mt16 hstack" style="flex-wrap:nowrap">
        <input class="field" id="numIn" inputmode="${q.time ? 'text' : 'numeric'}" autocomplete="off" placeholder="${q.time ? '예: 7:30' : '들은 숫자'}" ${st.checked ? 'disabled' : ''}>
        ${st.checked ? '' : '<button class="btn" data-check style="width:auto">확인</button>'}
      </div>
      ${st.checked ? '<button class="btn mt12" data-next>다음</button>' : ''}
      <p class="tiny mt12">${q.time ? '시각은 7:30처럼 적어. 4시 よじ, 7시 しちじ, 9시 くじ 주의' : '300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん은 소리가 바뀐다'}</p>`;
    const inp = $('#numIn', el);
    if (!st.checked) { setTimeout(() => speak(q.k), 150); }
    $('[data-play]', el).addEventListener('click', () => speak(q.k));
    $('[data-slow]', el).addEventListener('click', () => speak(q.k, {rate: .65}));
    $$('[data-lv]', el).forEach(b => b.addEventListener('click', () => { st.lv = +b.dataset.lv; S.numLevel = st.lv; st.i = 0; st.ok = 0; newQ(); page.render(); }));
    const check = () => {
      const raw = inp.value.trim(); if (!raw) return;
      let ok;
      if (q.time) {
        const d = raw.replace(/[^\d:]/g, ' ').trim(); let h, m;
        if (d.includes(':')) [h, m] = d.split(':').map(x => parseInt(x || '0', 10));
        else { const g = d.replace(/\s/g, ''); if (g.length <= 2) { h = +g; m = 0; } else { h = +g.slice(0, -2); m = +g.slice(-2); } }
        const [qh, qm] = q.v.split(':').map(Number); ok = h === qh && (m || 0) === qm;
      } else ok = raw.replace(/\D/g, '') === q.v;
      st.checked = true; st.lastOk = ok; if (ok) { st.ok++; haptic(); } else st.misses.push({show: q.show, k: q.k, mine: raw});
      page.render();
    };
    if (inp && !st.checked) { inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); }); $('[data-check]', el).addEventListener('click', check); }
    const nx = $('[data-next]', el);
    if (nx) nx.addEventListener('click', () => { st.i++; if (st.i >= count) { st.done = true; if (cfg.onDone) cfg.onDone({ok: st.ok, total: count}); } else newQ(); page.render(); });
  });
  return page;
}

/* ---------- minimal pairs ---------- */
function runPairs(filter) {
  const pool = PAIRS.filter(p => !filter || p[4] === filter);
  const items = shuffle(pool.concat(pool)).slice(0, 12).map(p => {
    const first = Math.random() < .5;
    const ans = first ? p[0] : p[2];
    return {q: `<div class="ctx">${esc(p[4])} · 어느 쪽이 들렸어?</div>`, audio: ans, opts: shuffle([{h: `<span lang="ja">${p[0]}</span><br><span class="tiny">${esc(p[1])}</span>`, v: p[0]}, {h: `<span lang="ja">${p[2]}</span><br><span class="tiny">${esc(p[3])}</span>`, v: p[2]}]), ans, label: `<span lang="ja">${ans}</span>`, ansLabel: ans === p[0] ? p[1] : p[3]};
  });
  runQuiz({title: '발음 구별' + (filter ? ' · ' + filter : ''), items});
}

/* ---------- set timer & check-in ---------- */
const SET_NAME = {1: '세트 1 · 교재', 2: '세트 2 · 듣기·말하기', 3: '세트 3 · 복습'};
const SET_COL = {1: 'var(--ring1)', 2: 'var(--ring2)', 3: 'var(--ring3)'};
function runRemaining() {
  const r = S.run; if (!r) return 0;
  const now = Date.now();
  return r.dur - (now - r.start - r.pausedMs - (r.paused ? now - r.paused : 0));
}
function startRun(date, set, mins = 20) {
  S.run = {date, set, start: Date.now(), dur: mins * 60000, paused: null, pausedMs: 0};
  save(); openFocus();
}
const mmss = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
let focusTimer = null;
function openFocus() {
  if (!S.run) return;
  const existing = PAGES.find(p => p.opt.focus); if (existing) return;
  const page = pushPage(SET_NAME[S.run.set], el => {
    const r = S.run; if (!r) { el.innerHTML = '<div class="empty-state">타이머가 끝났어</div>'; return; }
    const d = dayOf(r.date), C = 2 * Math.PI * 108;
    el.innerHTML = `
      <div class="large" style="font-size:28px">${SET_NAME[r.set]}</div>
      <p class="subtitle">${fmtDate(r.date)}${d ? ' · ' + esc(d.t) : ''}</p>
      <div class="timer"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" stroke="var(--fill)" stroke-width="14" fill="none"/><circle class="arc" cx="120" cy="120" r="108" stroke="${SET_COL[r.set]}" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
      <div class="tt"><b class="tl">${mmss(runRemaining())}</b><span>${r.paused ? '일시정지' : '남음'}</span></div></div>
      <div class="rate mt8"><button class="btn grey" data-pause>${r.paused ? IC.play + ' 계속' : IC.pause + ' 일시정지'}</button><button class="btn soft" data-end>끝내기</button></div>
      <p class="sh">이 세트에서 할 것</p><div class="list">${setActivities(r.date, r.set).map(rowHTML).join('')}</div>
      <p class="sf">타이머는 화면을 나가도 계속 간다. 위쪽 알약을 누르면 돌아올 수 있어.</p>`;
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
  const used = Math.round(Math.min(r.dur, r.dur - runRemaining()) / 60000);
  S.run = null; save();
  const fp = PAGES.find(p => p.opt.focus);
  if (fp) { const idx = PAGES.indexOf(fp); while (PAGES.length > idx) popPage(); }
  if (byTimer) { haptic(); toast(`${SET_NAME[r.set].split(' · ')[0]} 20분 끝!`); }
  updateLive();
  setTimeout(() => checkIn(r.date, r.set, used), 200);
}
let liveTimer = null;
function updateLive() {
  let el = $('.live');
  const show = S.run && !PAGES.some(p => p.opt.focus);
  if (!show) { if (el) el.remove(); }
  else {
    if (!el) { el = document.createElement('div'); el.className = 'live'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span class="ld" style="background:${SET_COL[S.run.set]}"></span><span>세트 ${S.run.set}</span><span class="lt">${mmss(runRemaining())}</span><button data-act="openFocus">열기</button>`;
  }
}
function globalTick() {
  if (S.run && !S.run.paused && runRemaining() <= 0) { finishRun(true); return; }
  const lt = $('.live .lt'); if (lt && S.run) lt.textContent = mmss(runRemaining());
}

const REASONS = [
  ['time', '시간이 없었어'], ['tired', '피곤했어'], ['phone', '폰·유튜브 하다가'], ['lazy', '하기 싫었어'], ['forgot', '까먹었어'], ['hard', '너무 어려웠어'], ['other', '다른 이유']
];
const PUSH = {
  time: ['하루 60분이 없었다고? 오늘 스크린타임 한번 봐. 20분은 거기서 나온다.', '시간이 없던 게 아니라 순서에서 밀린 거야. 다음 세트 시간을 지금 박아.', '1월 7일은 안 미뤄져. 미뤄지는 건 네 일본어야.'],
  tired: ['피곤한 거 알아. 그래도 카드 10장은 누워서도 넘길 수 있어.', '피곤한 날의 5분이 쌓이면 1월에 편의점 앞에서 안 얼어. 5분만.', '오늘 피곤하면 세트 3만 해. 복습은 절대 빼지 마.'],
  phone: ['유튜브는 1월 7일에 편의점 계산대에서 안 도와줘.', '폰 엎어 놓고 타이머 5분. 지금.', '방금 본 쇼츠 내용 기억나? 그 시간에 히라가나 10자는 외웠어.'],
  lazy: ['하기 싫은 날 하는 게 진짜 차이 나는 날이야.', '의욕은 시작하고 나서 생겨. 첫 카드만 넘겨 봐.', '하기 싫은 건 정상이야. 그래도 하는 사람이 일본 가서 말한다.'],
  forgot: ['까먹었다는 건 시간이 안 정해졌다는 뜻이야. 세트 시간에 알람 맞춰.', '알람 지금 맞춰. 진짜로.', '까먹은 건 이번이 마지막이어야 해.'],
  hard: ['어려운 건 좋은 신호야. 오늘 건 내일 카드로 다시 나와. 일단 반만 해.', '어려우면 양을 줄여. 0으로 만들지는 마.', '막힌 데를 하나만 적어 둬. 내일 그것부터.'],
  other: ['이유는 알았어. 이제 언제 할지만 정해.', '좋아, 이유는 남겼어. 그럼 언제 할 건데?']
};
function checkIn(date, set, usedMin) {
  openSheet((b, sh) => {
    const stage = {v: 'ask'};
    const draw = () => {
      if (stage.v === 'ask') {
        b.innerHTML = `<h2>${SET_NAME[set].split(' · ')[0]} 했어?</h2><p class="muted small">${fmtDate(date)} · ${esc(SET_NAME[set].split(' · ')[1])}</p>
          <div class="stack mt16"><button class="btn green" data-s="done">${IC.check} 다 했어</button><button class="btn soft" data-s="part">반만 했어</button><button class="btn grey" data-s="skip">못 했어</button></div>`;
        $$('[data-s]', b).forEach(x => x.addEventListener('click', () => {
          const s = x.dataset.s;
          setSet(date, set, {st: s, min: usedMin || 0});
          if (s === 'done') {
            const n = (set === 1 || set === 2) && dayIdx(date) >= 0 && dayIdx(date) < DAYS.length ? unlockDay(dayIdx(date)) : 0;
            save(); closeSheet(); render();
            const left = [1, 2, 3].filter(k => setStat(date, k) !== 'done');
            toast(n ? `좋아. 오늘 배운 ${n}개가 복습 카드에 들어갔어` : left.length ? `좋아. 다음은 세트 ${left[0]} (${S.settings.times[left[0] - 1]})` : '오늘 세 세트 끝. 잘했어');
          } else { stage.v = 'why'; stage.s = s; draw(); }
        }));
      } else if (stage.v === 'why') {
        b.innerHTML = `<h2>왜 ${stage.s === 'part' ? '반만 했어' : '못 했어'}?</h2><p class="muted small">솔직하게 골라. 이유는 기록돼.</p>
          <div class="chips mt16">${REASONS.map(r => `<button class="pill" data-r="${r[0]}">${esc(r[1])}</button>`).join('')}</div>
          <textarea class="field mt12" id="whyNote" placeholder="한 줄 더 적기 (선택)" style="min-height:70px"></textarea>`;
        $$('[data-r]', b).forEach(x => x.addEventListener('click', () => {
          const why = x.dataset.r, note = $('#whyNote', b).value.trim();
          const prev = S.log.filter(l => l.why === why).length;
          S.log.push({d: date, set, st: stage.s, why, note, at: Date.now()});
          const cur = (S.sets[date] || {})[set]; if (cur) { cur.why = why; cur.note = note; }
          if (stage.s === 'part' && dayIdx(date) >= 0 && dayIdx(date) < DAYS.length && set !== 3) unlockDay(dayIdx(date));
          save();
          stage.v = 'push'; stage.why = why; stage.prev = prev; draw();
        }));
      } else if (stage.v === 'push') {
        const lines = PUSH[stage.why] || PUSH.other;
        const line = lines[Math.floor(Math.random() * lines.length)];
        const label = (REASONS.find(r => r[0] === stage.why) || [])[1];
        b.innerHTML = `<h2>${esc(line)}</h2>
          ${stage.prev >= 2 ? `<div class="banner red mt12"><div><b>'${esc(label)}'가 이번이 ${stage.prev + 1}번째야.</b><p>이건 우연이 아니라 패턴이야. 같은 이유가 또 나오면 그 시간대 자체를 바꿔.</p></div></div>` : ''}
          <p class="sh" style="margin-left:0">그럼 언제 할 건데?</p>
          <div class="stack"><button class="btn" data-c="now">지금 5분만 하기</button><button class="btn soft" data-c="1h">1시간 뒤</button><button class="btn soft" data-c="bed">자기 전</button><button class="btn grey" data-c="tmr">내일 보충 (가벼운 날에)</button></div>`;
        $$('[data-c]', b).forEach(x => x.addEventListener('click', () => {
          const c = x.dataset.c;
          if (c === 'now') { closeSheet(); render(); startRun(date, set, 5); return; }
          const when = c === '1h' ? Date.now() + 3600e3 : c === 'bed' ? (() => { const d = new Date(); const [hh, mm] = S.settings.times[2].split(':').map(Number); d.setHours(hh, mm, 0, 0); return Math.max(d.getTime(), Date.now() + 600e3); })() : null;
          S.commits.push({d: date, set, c, when, at: Date.now(), done: false});
          save(); closeSheet(); render();
          toast(c === 'tmr' ? '내일 화면에 보충으로 띄워 둘게' : '약속했다. 그 시간에 다시 물어볼 거야');
        }));
      }
    };
    draw();
  });
}
function setSet(date, set, v) { S.sets[date] = S.sets[date] || {}; S.sets[date][set] = Object.assign({at: Date.now()}, S.sets[date][set] || {}, v); S.commits.forEach(c => { if (c.d === date && c.set === set && v.st === 'done') c.done = true; }); }

/* ---------- activities per set ---------- */
function setActivities(date, set) {
  const i = dayIdx(date), d = DAYS[i];
  const out = [];
  if (i >= DAYS.length || !d) {
    if (set === 1) { const jd = japanDay(date), ch = Math.min(18, 13 + Math.floor((jd - 1) / 2)); out.push({act: 'book', icon: iconTile('book', COL.orange), title: `교재 ${ch}과`, sub: BOOK[ch].t}); }
    if (set === 3) out.push({act: 'review', icon: iconTile('review', COL.cyan), title: '카드 복습', sub: `${dueCards().length}장`});
    out.push({act: 'memo', icon: iconTile('pen', COL.indigo), title: '오늘 들은 말 카드로 만들기', sub: '현지에서 못 알아들은 말'});
    return out;
  }
  if (d.test) {
    if (set === 1) out.push({act: 'test', data: {w: d.test}, icon: iconTile('check', COL.red), title: `${d.test}주차 테스트`, sub: S.tests[d.test] ? `지난 결과 ${S.tests[d.test].score}%` : '통과 기준은 테스트 화면에'});
    if (set === 2 && d.talk) out.push({act: 'chat', data: {id: d.talk}, icon: iconTile('talk', COL.blue), title: '하루토랑 대화', sub: CHATS.find(c => c.id === d.talk).name});
    if (set === 2 && !d.talk) out.push({act: 'pairs', icon: iconTile('ear', COL.green), title: '발음 구별 연습', sub: '장음·촉음·탁음'});
  }
  if (d.last) {
    if (set === 1) out.push({act: 'core', icon: iconTile('bolt', COL.orange), title: '핵심 30문장', sub: '소리 내서 한 번씩'});
    if (set === 2) out.push({act: 'depart', icon: iconTile('list', COL.green), title: '출국 체크리스트', sub: DEPART_CHECK.length + '개'});
  }
  if (set === 1 && d.s1) {
    const s1 = d.s1;
    if (s1.book) { const b = BOOK[s1.book.ch]; out.push({act: 'book', icon: iconTile('book', COL.orange), title: s1.book.ch ? `교재 ${s1.book.ch}과 ${s1.book.part === 1 ? '앞' : '뒤'} 절반` : '교재 발음편', sub: `${b.p}~${b.e}쪽${s1.book.ch ? ' 중 ' + (s1.book.part === 1 ? '앞부분' : '뒷부분') : ''} · ${b.t}`}); }
    if (s1.kana) out.push({act: 'learnKana', data: {i}, icon: iconTile('kana', COL.red), title: '오늘 글자 배우기', sub: s1.kana.slice(0, 12).join(' ') + (s1.kana.length > 12 ? ' …' : '')});
    if (s1.kana) out.push({act: 'quizKana', data: {i}, icon: iconTile('check', COL.pink), title: '셀프 테스트 (5분)', sub: '보고 읽기 + 듣고 고르기'});
    if (s1.confuse) out.push({act: 'confuse', data: {set: s1.confuse}, icon: iconTile('kana', COL.purple), title: '헷갈리는 글자', sub: s1.confuse === 'hira' ? 'さ/ち, ぬ/め, る/ろ …' : 'シ/ツ, ソ/ン …'});
    if (s1.drill) out.push({act: 'speed', data: {set: s1.drill}, icon: iconTile('bolt', COL.orange), title: '46자 스피드 테스트', sub: '한 글자 2초 목표'});
    if (s1.rules) out.push({act: 'rules', data: {k: s1.rules}, icon: iconTile('doc', COL.indigo), title: s1.rules === 'long' ? '장음·촉음 규칙' : '외래어 규칙', sub: '읽고 예시 듣기'});
  }
  if (set === 2 && d.s2) {
    const s2 = d.s2;
    if (s2.ph) out.push({act: 'phrases', data: {i}, icon: iconTile('chat', COL.green), title: `오늘 표현 ${s2.ph.length}개`, sub: s2.ph.slice(0, 2).map(id => PH_BY[id].ko).join(', ') + (s2.ph.length > 2 ? ' …' : '')});
    if (s2.ph) out.push({act: 'speakToday', data: {i}, icon: iconTile('talk', COL.teal), title: '쉐도잉 + 말하기 카드', sub: '듣고 따라 → 보지 않고 말하기'});
    if (s2.rp) out.push({act: 'rp', data: {k: s2.rp}, icon: iconTile('talk', COL.blue), title: '롤플레이', sub: s2.rp === 'ALL' ? '하루 시나리오' : RP[s2.rp].name});
    if (s2.talk) out.push({act: 'chat', data: {id: s2.talk}, icon: iconTile('talk', COL.indigo), title: '하루토랑 대화', sub: CHATS.find(c => c.id === s2.talk).name});
    if (s2.num) out.push({act: 'numbers', data: {lv: s2.num}, icon: iconTile('num', COL.orange), title: '숫자 듣기 5분', sub: NUM_LEVELS[s2.num].n});
    if (s2.pairs) out.push({act: 'pairs', data: {f: s2.pairs}, icon: iconTile('ear', COL.green), title: '발음 구별', sub: s2.pairs});
    if (s2.hanja) out.push({act: 'hanja', icon: iconTile('han', COL.brown), title: '한자어 규칙 퀴즈', sub: s2.hanja === 1 ? '받침 ㄱ·ㄴ·ㅁ·ㅇ' : '받침 ㄹ·ㅂ, 초성 ㅎ'});
    if (s2.signs) out.push({act: 'signs', icon: iconTile('sign', COL.gray), title: '간판 한자', sub: SIGNS.slice(s2.signs[0], s2.signs[1]).map(x => x[0]).join(' ')});
    if (weekNow() >= 3 && s2.ph && s2.ph.some(id => PH_BY[id].c)) out.push({act: 'tab', data: {tab: 'talk'}, icon: iconTile('sparkle', COL.purple), title: '친구 말투 버전 (2~3분)', sub: '오늘 표현을 08년생처럼'});
  }
  if (set === 3) {
    out.push({act: 'review', icon: iconTile('review', COL.cyan), title: '카드 복습 (12분)', sub: `오늘 ${dueCards().length}장`});
    out.push({act: 'recall', data: {d: date}, icon: iconTile('pen', COL.indigo), title: '보지 않고 적기 (5분)', sub: '오늘 배운 것 떠올리기'});
    out.push({act: 'weak', icon: iconTile('bolt', COL.red), title: '틀린 것만 다시 (3분)', sub: '자주 틀린 카드'});
  }
  return out;
}

/* ---------- weekly tests ---------- */
function runTest(w) {
  const finish = (score, pass, detail) => { S.tests[w] = {score, pass, at: Date.now(), detail}; save(); render(); };
  if (w === 1) {
    runQuiz({title: '1주차 테스트', items: kanaQuizItems(HIRA_ALL, 'read'), timed: 2000, noRetry: false,
      passText: r => (r.ok / r.total >= .95 && r.avg <= 2000) ? '<b class="ok-t">통과!</b> 2주차로 가자' : '<b class="no-t">아직</b> 기준: 정답 95%, 평균 2초 이하. 틀린 글자는 카드로 다시 나와',
      onDone: r => finish(Math.round(r.ok / r.total * 100), r.ok / r.total >= .95 && r.avg <= 2000, `평균 ${(r.avg / 1000).toFixed(2)}초`)});
    return;
  }
  if (w === 2) {
    runFlash({title: '2주차 테스트 ① 단어 읽기', items: pick(W2WORDS, 30).map(x => ({kind: '소리 내서 읽기', front: `<div class="front ja" lang="ja">${x}</div>`, back: `<div class="hg">${esc(toHangul(x))}</div>`, audio: x})),
      onDone: a => {
        setTimeout(() => { popPage(); runQuiz({title: '2주차 테스트 ② 메뉴', items: shuffle(MENU).map(m => ({q: `<div class="front ja" lang="ja">${m[0]}</div>`, after: m[0], opts: shuffle([m, ...pick(MENU.filter(x => x !== m), 3)]).map(x => ({h: esc(x[1]), v: x[0]})), ans: m[0], label: `<span lang="ja">${m[0]}</span>`, ansLabel: m[1]})),
          onDone: b => { const sc = Math.round((a.ok + a.slow + b.ok) / (30 + MENU.length) * 100); finish(sc, sc >= 80, `읽기 ${a.ok + a.slow}/30 · 메뉴 ${b.ok}/${MENU.length}`); toast(sc >= 80 ? '2주차 통과!' : '아직이야. 기준은 80%'); }}); }, 400);
      }});
    return;
  }
  const upto = w === 6 ? DAYS.length : DAYS.findIndex(d => d.test === w);
  const learned = [...new Set(DAYS.slice(0, upto).flatMap(d => (d.s2 && d.s2.ph) || []))].filter(id => PH_BY[id].w !== 'staff');
  const listen = [...new Set(DAYS.slice(0, upto).flatMap(d => (d.s2 && d.s2.ph) || []))].filter(id => PH_BY[id].w === 'staff');
  const nPh = w === 6 ? 20 : 15;
  const items = pick(learned, nPh).map(id => cardItem('p:' + id)).concat(pick(listen, w === 6 ? 6 : 4).map(id => cardItem('p:' + id)));
  const lv = {3: [3], 4: [4, 5], 5: [6, 7], 6: [3, 4, 5, 6, 7]}[w];
  runFlash({title: `${w}주차 테스트 ① 말하기·듣기`, items: shuffle(items), onDone: a => {
    setTimeout(() => { popPage(); runNumbers({title: `${w}주차 테스트 ② 숫자`, levels: lv, count: 10, onDone: b => {
      const sp = (a.ok + a.slow) / a.total, nu = b.ok / b.total;
      const sc = Math.round((sp * .6 + nu * .4) * 100);
      const pass = sp >= .8 && nu >= (w === 5 ? .9 : .8);
      finish(sc, pass, `말하기 ${a.ok + a.slow}/${a.total} · 숫자 ${b.ok}/${b.total}`);
      toast(pass ? `${w}주차 통과!` : '아직이야. 틀린 건 카드로 다시 나와');
    }}); }, 400);
  }});
}
