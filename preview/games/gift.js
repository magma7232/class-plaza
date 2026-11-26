/* 포털 게임 선물 상자(옷 아이템 + 집 가구·소품) — 2026-11-19 선생님 요청 "게임 도중 또는 한 월드 완료 시 뜨도록"
 * back.js가 이 파일을 저절로 불러온다(모든 포털 게임에 back.js가 있음). 게임마다 따로 고칠 것이 없다.
 * - 게임을 깨면(게임이 'minigame-clear' 신호를 보내면): 선물 상자. 같은 곳(게임+레벨/보스/장)은 하루 한 번,
 *   한 게임에서 하루 3개까지(꿈빛 성은 층 4개 + 탈출이라 5개). 게임이 'plaza-gift' 신호({game, place})를 보내도 같다(뚝딱 장터 모험 주방의 장 끝).
 * - 게임 도중: 화면을 누르며 3분쯤 열심히 하면 가끔(20%) 작은 선물. 하루 2개까지.
 * - 하루에 게임 선물은 모두 6개까지(광장의 5분 선물은 따로).
 * - 화면은 위쪽에 잠깐 뜨는 카드(누르지 않아도 됨, 게임을 막지 않음). 상자가 흔들리다 열리며 받은 것을 보여 준다.
 * 받은 것은 광장과 같은 곳에 저장(localStorage plaza.items 옷 · plaza.props 집 소품) → 광장 옷장·꾸미기에 바로 나온다.
 * 아이템 목록은 ../chars/catalog.js (캐릭터3D/pipeline/make_catalog.mjs가 만든다. 아이템을 더하면 다시 돌린다)
 * - 난이도별 첫 클리어(2026-11-26, back.js 8번): 끝까지 깬 신호에 diff(1 하~4 최상)가 있고 그 게임을 그 난이도로 처음 깼으면
 *   하루 한도와 상관없이 상자 하나(최상은 금빛 '좋은 선물' = 카탈로그 rare 아이템 중 아직 없는 것, 다 가졌으면 보통 뽑기).
 *   이때는 예전 '깬 선물'을 따로 주지 않는다(한 번 깼는데 상자 두 개가 뜨지 않게). 이미 깬 난이도면 예전 규칙 그대로.
 * 시험: window.PLAZA_GIFT.drop('test', {kind:'clear'|'chance'|'diff', chance, game, rare}) / .reset() / .log()
 */
(function () {
  if (window.PLAZA_GIFT) return;
  var me = document.currentScript;
  var DAY_MAX = 6, GAME_MAX = 3, GAME_CAP = { castle: 5 }, CHANCE_MAX = 2, PLAY_SEC = 180, PLAY_CHANCE = 0.2;
  var NAMES = { jangteo: '오늘은 내가 요리사!', jangteo3d: '오늘은 내가 요리사!', heart: '하트 특공대', sarang: '사랑둥이 대모험', castle: '꿈빛 성 탐정단', island: '하트섬 원정대', escape: '사랑둥이 방탈출', jelly: '젤리와 팡', giant: '거인과 꼬마', magnet: '자석 친구', pyramid_run: '피라미드 대탈출' };
  var queue = [], ready = false;
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v } catch (e) { return d } }
  function jput(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
  function isT() { return !!(window.PLAZA_TEACHER && window.PLAZA_TEACHER()) }   // 선생님 기기(back.js 0-2번)
  function today() { return new Date().toDateString() }
  function log() {
    var l = jget('plaza.giftLog', null);
    if (!l || l.day !== today() || !Array.isArray(l.keys) || typeof l.g !== 'object' || !l.g) l = { day: today(), n: 0, c: 0, keys: [], g: {} };
    return l;
  }
  function cat() { return (window.PLAZA_CATALOG || {}).items || {} }
  function owned() {
    var a = jget('plaza.items', []), b = jget('plaza.props', []);
    return { wear: Array.isArray(a) ? a : [], home: Array.isArray(b) ? b : [] };
  }
  // 뽑기: 아직 없는 것 중에서 보통 70 · 희귀 25 · 전설 5. 집 가구·소품이 남아 있으면 둘에 하나는 집 것(선생님 요청)
  function pick() {
    var C = cat(), o = owned(), fresh = Object.keys(C).filter(function (id) { return !C[id].only && (C[id].kind === 'wear' ? o.wear.indexOf(id) < 0 : o.home.indexOf(id) < 0) });   // only: 그 게임 상자 전용(피라미드)은 빼요
    if (!fresh.length) return null;
    var homes = fresh.filter(function (id) { return C[id].kind === 'home' });
    if (homes.length && homes.length < fresh.length && Math.random() < .5) fresh = homes;
    else if (homes.length < fresh.length) fresh = fresh.filter(function (id) { return C[id].kind !== 'home' });
    var r = Math.random(), rar = r < .05 ? 3 : r < .3 ? 2 : 1, pool = fresh.filter(function (id) { return C[id].rarity === rar });
    if (!pool.length) pool = fresh;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // 좋은 선물(최상 첫 클리어): 카탈로그 rare 옷 중 아직 없는 것. rare 표시가 없는 옛 목록이면 전설(3) 옷
  function pickRare() {
    var C = cat(), o = owned(), ids = Object.keys(C).filter(function (id) { return !C[id].only && C[id].kind === 'wear' }),
      tag = ids.some(function (id) { return C[id].rare }),
      pool = ids.filter(function (id) { return (tag ? C[id].rare : C[id].rarity === 3) && o.wear.indexOf(id) < 0 });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function give(id) {
    var C = cat()[id], o = owned();
    if (!C) return;
    if (C.kind === 'wear') { o.wear.indexOf(id) < 0 && o.wear.push(id); jput('plaza.items', o.wear) }
    else { o.home.indexOf(id) < 0 && o.home.push(id); jput('plaza.props', o.home) }
  }
  // ---- 화면: 위쪽 카드(게임을 막지 않게 누를 수 없음) ----
  var css = '#pgCard{position:fixed;left:50%;top:calc(70px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483300;pointer-events:none;' +
    'display:flex;align-items:center;gap:12px;max-width:min(440px,92vw);background:#fff;border-radius:22px;padding:10px 18px 10px 10px;' +
    'box-shadow:0 8px 26px rgba(20,40,70,.32),inset 0 0 0 3px #ffd98a;font-family:Jua,system-ui,"Malgun Gothic",sans-serif;color:#2b3a4f;animation:pgIn .45s ease-out}' +
    '#pgCard.out{transition:opacity .5s,transform .5s;opacity:0;transform:translate(-50%,-24px)}' +
    '#pgCard .i{flex:0 0 auto;width:64px;height:64px;border-radius:16px;background:#fff3d6;display:flex;align-items:center;justify-content:center;font-size:42px;line-height:1}' +
    '#pgCard .i.s{animation:pgS .9s ease-in-out}#pgCard .i.o{animation:pgO .45s ease-out}' +
    '#pgCard b{display:block;font-size:19px;font-weight:normal;line-height:1.25}#pgCard small{display:block;font-size:14px;color:#5a6a80;margin-top:2px;line-height:1.3}' +
    '#pgCard em{font-style:normal;display:inline-block;margin-left:6px;padding:1px 9px;border-radius:999px;font-size:13px;color:#fff;background:#9aa6b8;vertical-align:2px}' +
    '#pgCard.gold{background:linear-gradient(135deg,#fffbe6,#ffe9a8 55%,#fff6d0);box-shadow:0 8px 30px rgba(180,120,0,.45),inset 0 0 0 3px #f5b700,0 0 0 4px rgba(255,215,90,.55)}' +
    '#pgCard.gold .i{background:radial-gradient(circle at 35% 30%,#fff8d6,#ffd257 70%,#e6a800);box-shadow:0 0 16px rgba(255,200,40,.9)}#pgCard.gold .i.s{animation:pgS .9s ease-in-out,pgG 1.2s ease-in-out infinite}' +
    '#pgCard.gold b{color:#8a5a00}' +
    '@keyframes pgG{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 8px #ffd257)}}' +
    '#pgCard em.r2{background:#3d7bff}#pgCard em.r3{background:linear-gradient(90deg,#ffb300,#ff7a00)}' +
    '@keyframes pgIn{0%{opacity:0;transform:translate(-50%,-30px) scale(.9)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}' +
    '@keyframes pgS{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg) scale(1.06)}40%{transform:rotate(14deg) scale(1.12)}60%{transform:rotate(-10deg) scale(1.16)}80%{transform:rotate(8deg) scale(1.2)}}' +
    '@keyframes pgO{0%{transform:scale(.4);opacity:.3}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}';
  function style() { if (document.getElementById('pgCss')) return; var s = document.createElement('style'); s.id = 'pgCss'; s.textContent = css; (document.head || document.documentElement).appendChild(s) }
  function where(C) { return C.kind === 'wear' ? '광장 🏠 나의 집 → 옷장에서 입어 봐요' : C.cat === 'wall' ? '광장 🏠 나의 집 → 꾸미기 → 벽지' : '광장 🏠 나의 집 → 꾸미기에서 놓아 봐요' }
  var cardT = [], cardQ = [], cardOn = false;
  function chime() {   // 게임 소리를 껐으면(🔇) 울리지 않음 — 게임마다 소리 끄기가 BGM.mute로 이어져 있다(music.js). 음악 플레이어가 없는 곳은 조용히
    try {
      var st = window.BGM && BGM.state && BGM.state();
      if (!st || st.pageMute || !st.unlocked) return;
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var a = chime.a || (chime.a = new A()), t = a.currentTime;
      [784, 988, 1319].forEach(function (f, i) {
        var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * .11); g.gain.linearRampToValueAtTime(.12, t + i * .11 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .11 + .35);
        o.connect(g); g.connect(a.destination); o.start(t + i * .11); o.stop(t + i * .11 + .4);
      });
    } catch (e) { }
  }
  function show(id, title, gold) {   // 카드가 떠 있으면 줄 서서 기다렸다가(앞 선물이 안 보이고 지나가지 않게)
    if (!document.body) return;
    if (cardOn) { cardQ.push([id, title, gold]); return }
    cardOn = true;
    style();
    var C = cat()[id], R = (window.PLAZA_CATALOG || {}).rarity || { 1: '보통', 2: '희귀', 3: '전설' };
    cardT.forEach(clearTimeout); cardT = [];
    var o = document.getElementById('pgCard'); o && o.remove();
    o = document.createElement('div'); o.id = 'pgCard'; if (gold) o.className = 'gold';
    o.innerHTML = '<div class="i s">' + (gold ? '🌟' : '🎁') + '</div><div><b>' + title + '</b><small>상자를 여는 중…</small></div>';
    document.body.appendChild(o);
    cardT.push(setTimeout(function () {
      var i = o.querySelector('.i'); i.className = 'i o'; i.textContent = C.emoji;
      if (C.css) i.style.background = C.css;
      o.querySelector('div:last-child').innerHTML = '<b>' + C.name + '<em class="r' + C.rarity + '">' + R[C.rarity] + (C.kind === 'home' ? ' · 집 소품' : '') + '</em></b><small>' + (gold ? '🌟 최상 모드 좋은 선물 · ' : '') + (isT() ? '🧑‍🏫 선생님 점검 · 옷장에 안 들어가요' : where(C)) + '</small>';
      chime();
    }, 950));
    var tk = isT() ? 0.5 : 1;   // 선생님 점검 판은 절반만 떠 있게(끝 화면·결과 숫자를 오래 가리지 않게, 2026-11-26 검토)
    cardT.push(setTimeout(function () { o.className = (gold ? 'gold ' : '') + 'out' }, Math.max(2600, 6200 * tk)));
    cardT.push(setTimeout(function () { o.remove(); cardOn = false; var n = cardQ.shift(); n && show(n[0], n[1], n[2]) }, Math.max(3200, 6800 * tk)));
  }
  // ---- 주기 ----
  function drop(source, opt) {
    opt = opt || {};
    if (!ready) { queue.length < 20 && queue.push([source, opt]); return null }
    if (isT()) {   // 선생님 기기(back.js 10번): 어떤 상자가 뜨는지 보여 주기만, 받거나 적지 않음. 화면을 오래 누른 선물(chance)은 안 띄움
      if (opt.kind === 'chance') return null;
      var tid = (opt.rare && pickRare()) || pick() || Object.keys(cat())[0]; if (!tid) return null;
      var tn = NAMES[String(opt.game || source).split(/[-:]/)[0]];
      show(tid, '🧑‍🏫 점검 · ' + (opt.kind === 'diff' ? (tn ? tn + ' ' : '') + '「' + (opt.dname || '') + '」 첫 클리어' + (opt.rare ? ' 좋은 선물' : ' 선물') : (opt.title || (tn ? tn + ' ' : '') + '깬 선물')) + '(기록 안 함)', !!opt.rare);
      return null;
    }
    if (opt.kind === 'diff') {   // 난이도별 첫 클리어: 하루 한도와 상관없이(게임마다 4개까지라 넘치지 않음)
      var rid = (opt.rare && pickRare()) || pick(); if (!rid) return null;
      give(rid);
      var nm0 = NAMES[String(opt.game || '').split(/[-:]/)[0]];
      show(rid, opt.title || ((opt.rare ? '🌟 ' : '🎁 ') + (nm0 ? nm0 + ' ' : '') + '「' + (opt.dname || '') + '」 첫 클리어' + (opt.rare ? ' 좋은 선물!' : ' 선물!')), !!opt.rare);
      return rid;
    }
    var l = log(), kind = opt.kind === 'chance' ? 'chance' : 'clear', key = kind + ':' + source, game = String(opt.game || source).split(/[-:]/)[0];
    if (l.n >= DAY_MAX) return null;
    if (kind === 'clear' && (l.keys.indexOf(key) >= 0 || ((l.g[game] || 0) >= (GAME_CAP[game] || GAME_MAX) && !opt.final))) return null;
    if (kind === 'chance' && (l.c >= CHANCE_MAX || Math.random() >= (opt.chance == null ? .05 : opt.chance))) return null;
    var id = pick(); if (!id) return null;
    give(id); l.n++;
    if (kind === 'chance') l.c++; else { l.keys.push(key); l.g[game] = (l.g[game] || 0) + 1 }
    jput('plaza.giftLog', l);
    var nm = NAMES[game];
    show(id, opt.title || (kind === 'clear' ? '🎁 ' + (nm ? nm + ' ' : '') + '깬 선물!' : '🎁 열심히 한 선물을 찾았어요!'));
    return id;
  }
  window.PLAZA_GIFT = {
    drop: drop, pick: pick, pickRare: pickRare, log: log,
    get ready() { return ready },
    reset: function () { try { localStorage.removeItem('plaza.giftLog') } catch (e) { } },
    playTick: function (sec) { tick(sec || 1, true) }
  };
  // 게임을 깼다는 신호(back.js의 반 별과 같은 신호)
  window.addEventListener('minigame-clear', function (e) { onClear((e && e.detail) || {}) });
  function onClear(d) {
    var g = String(d.game || 'game');
    if (d.show || d.practice) return;
    if (!ready) { queue.length < 20 && queue.push(['__clear', d]); return }   // 목록이 오기 전: 난이도 깬 기록도 상자와 같이 나중에(목록을 못 받으면 기록도 안 함)
    var place = d.place || d.level || d.boss || d.world || 'end';
    // 난이도별 첫 클리어(back.js 8번): 끝까지 깼고 diff가 있으면, 그 난이도를 처음 깼을 때 상자 하나(최상은 좋은 상자) — 예전 깬 선물 대신
    var dv = d.diff | 0;
    if (isT() && dv >= 1 && dv <= 4 && (!window.PLAZA_IS_FINAL || window.PLAZA_IS_FINAL(d))) { drop('diff:' + g + ':' + dv, { kind: 'diff', game: g, rare: dv === 4, dname: (window.PLAZA_DIFF_NAMES || {})[dv] || '' }); diffJust[g] = Date.now(); return }
    if (dv >= 1 && dv <= 4 && window.PLAZA_DIFF_CLAIM && (!window.PLAZA_IS_FINAL || window.PLAZA_IS_FINAL(d))) {
      if (window.PLAZA_DIFF_CLAIM(d.diffGame || null, dv)) {
        var DN = window.PLAZA_DIFF_NAMES || { 1: '하', 2: '중', 3: '상', 4: '최상' };
        var l0 = log(), k0 = 'clear:' + g + ':' + place;   // 같은 깸으로 예전 깬 선물이 또 나오지 않게 오늘 받은 것으로 적어 둠
        if (l0.keys.indexOf(k0) < 0) { l0.keys.push(k0); jput('plaza.giftLog', l0) }
        drop('diff:' + g + ':' + dv, { kind: 'diff', game: g, rare: dv === 4, dname: DN[dv] });
        diffJust[g] = Date.now();
        return;
      }
    }
    drop(g + ':' + place, { kind: 'clear', game: g, final: !!d.final });   // final: 게임을 끝까지 깸(새 게임 4개, uriban_bridge.js) → 장 선물로 한도가 찼어도 하나 더
  }
  // 게임이 따로 보내는 선물 신호(예: 뚝딱 장터 모험 주방에서 장을 ★★ 이상으로 끝냄)
  var diffJust = {};
  window.addEventListener('plaza-gift', function (e) { onGift((e && e.detail) || {}) });
  function onGift(d) {
    var g = String(d.game || 'game');
    if (!ready) { queue.length < 20 && queue.push(['__gift', d]); return }
    if (diffJust[g] && Date.now() - diffJust[g] < 8000 && d.kind !== 'chance') return;   // 방금 난이도 첫 클리어 상자를 줬으면 같은 깸의 선물은 하나만(게임은 깬 신호를 선물 신호보다 먼저 보낸다)
    var title = d.title ? String(d.title).slice(0, 40).replace(/[<>&]/g, '') : '';   // 카드 제목(퀴즈 선물 등, quiz/quiz.js)
    drop(g + ':' + (d.place || 'end'), { kind: d.kind === 'chance' ? 'chance' : 'clear', game: g, chance: d.chance, title: title });
  }
  // 게임 도중: 최근 8초 안에 화면·키를 눌렀고 화면이 보이는 동안만 시간을 센다
  var lastIn = 0, active = 0;
  ['pointerdown', 'touchstart', 'touchmove', 'keydown'].forEach(function (k) { window.addEventListener(k, function () { lastIn = Date.now() }, { capture: true, passive: true }) });
  window.addEventListener('pointermove', function (e) { e.buttons && (lastIn = Date.now()) }, { capture: true, passive: true });   // 조이스틱을 누른 채 움직이는 동안도 '열심히'
  function tick(sec, force) {
    if (!force && (document.visibilityState === 'hidden' || Date.now() - lastIn > 8000)) return;
    active += sec;
    if (active >= PLAY_SEC) { active = 0; drop('play', { kind: 'chance', chance: PLAY_CHANCE, game: 'play' }) }
  }
  setInterval(function () { tick(1) }, 1000);
  // 아이템 목록 불러오기(파일로 열어도 됨). 주소는 이 파일 자리 기준(사랑둥이처럼 한 칸 안쪽 폴더의 게임도 됨)
  function loaded() { ready = !!window.PLAZA_CATALOG; var q = queue; queue = []; ready && q.forEach(function (a) { a[0] === '__clear' ? onClear(a[1]) : a[0] === '__gift' ? onGift(a[1]) : drop(a[0], a[1]) }) }
  if (window.PLAZA_CATALOG) { ready = true; return }
  var sc = document.createElement('script'), base = (me && me.src) || location.href, u;
  try { u = new URL('../chars/catalog.js', base) } catch (e) { return }
  if (/^http/.test(u.protocol)) u.searchParams.set('h', Math.floor(Date.now() / 3.6e6));
  sc.src = u.href; sc.onload = loaded; sc.onerror = function () { queue = [] };
  (document.head || document.documentElement).appendChild(sc);
})();
