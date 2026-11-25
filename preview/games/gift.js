/* 포털 게임 선물 상자(옷 아이템 + 집 가구·소품) — 2026-11-19 선생님 요청 "게임 도중 또는 한 월드 완료 시 뜨도록"
 * back.js가 이 파일을 저절로 불러온다(모든 포털 게임에 back.js가 있음). 게임마다 따로 고칠 것이 없다.
 * - 게임을 깨면(게임이 'minigame-clear' 신호를 보내면): 선물 상자. 같은 곳(게임+레벨/보스/장)은 하루 한 번,
 *   한 게임에서 하루 3개까지(꿈빛 성은 층 4개 + 탈출이라 5개). 게임이 'plaza-gift' 신호({game, place})를 보내도 같다(뚝딱 장터 모험 주방의 장 끝).
 * - 게임 도중: 화면을 누르며 3분쯤 열심히 하면 가끔(20%) 작은 선물. 하루 2개까지.
 * - 하루에 게임 선물은 모두 6개까지(광장의 5분 선물은 따로).
 * - 화면은 위쪽에 잠깐 뜨는 카드(누르지 않아도 됨, 게임을 막지 않음). 상자가 흔들리다 열리며 받은 것을 보여 준다.
 * 받은 것은 광장과 같은 곳에 저장(localStorage plaza.items 옷 · plaza.props 집 소품) → 광장 옷장·꾸미기에 바로 나온다.
 * 아이템 목록은 ../chars/catalog.js (캐릭터3D/pipeline/make_catalog.mjs가 만든다. 아이템을 더하면 다시 돌린다)
 * 시험: window.PLAZA_GIFT.drop('test', {kind:'clear'|'chance', chance, game}) / .reset() / .log()
 */
(function () {
  if (window.PLAZA_GIFT) return;
  var me = document.currentScript;
  var DAY_MAX = 6, GAME_MAX = 3, GAME_CAP = { castle: 5 }, CHANCE_MAX = 2, PLAY_SEC = 180, PLAY_CHANCE = 0.2;
  var NAMES = { jangteo: '뚝딱 장터', heart: '하트 특공대', sarang: '사랑둥이 대모험', castle: '꿈빛 성 탐정단' };
  var queue = [], ready = false;
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v } catch (e) { return d } }
  function jput(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
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
  function show(id, title) {   // 카드가 떠 있으면 줄 서서 기다렸다가(앞 선물이 안 보이고 지나가지 않게)
    if (!document.body) return;
    if (cardOn) { cardQ.push([id, title]); return }
    cardOn = true;
    style();
    var C = cat()[id], R = (window.PLAZA_CATALOG || {}).rarity || { 1: '보통', 2: '희귀', 3: '전설' };
    cardT.forEach(clearTimeout); cardT = [];
    var o = document.getElementById('pgCard'); o && o.remove();
    o = document.createElement('div'); o.id = 'pgCard';
    o.innerHTML = '<div class="i s">🎁</div><div><b>' + title + '</b><small>상자를 여는 중…</small></div>';
    document.body.appendChild(o);
    cardT.push(setTimeout(function () {
      var i = o.querySelector('.i'); i.className = 'i o'; i.textContent = C.emoji;
      if (C.css) i.style.background = C.css;
      o.querySelector('div:last-child').innerHTML = '<b>' + C.name + '<em class="r' + C.rarity + '">' + R[C.rarity] + (C.kind === 'home' ? ' · 집 소품' : '') + '</em></b><small>' + where(C) + '</small>';
      chime();
    }, 950));
    cardT.push(setTimeout(function () { o.className = 'out' }, 6200));
    cardT.push(setTimeout(function () { o.remove(); cardOn = false; var n = cardQ.shift(); n && show(n[0], n[1]) }, 6800));
  }
  // ---- 주기 ----
  function drop(source, opt) {
    opt = opt || {};
    if (!ready) { queue.length < 20 && queue.push([source, opt]); return null }
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
    drop: drop, pick: pick, log: log,
    get ready() { return ready },
    reset: function () { try { localStorage.removeItem('plaza.giftLog') } catch (e) { } },
    playTick: function (sec) { tick(sec || 1, true) }
  };
  // 게임을 깼다는 신호(back.js의 반 별과 같은 신호)
  window.addEventListener('minigame-clear', function (e) {
    var d = (e && e.detail) || {}, g = String(d.game || 'game');
    if (d.show || d.practice) return;
    var place = d.place || d.level || d.boss || d.world || 'end';
    drop(g + ':' + place, { kind: 'clear', game: g, final: !!d.final });   // final: 게임을 끝까지 깸(새 게임 4개, uriban_bridge.js) → 장 선물로 한도가 찼어도 하나 더
  });
  // 게임이 따로 보내는 선물 신호(예: 뚝딱 장터 모험 주방에서 장을 ★★ 이상으로 끝냄)
  window.addEventListener('plaza-gift', function (e) {
    var d = (e && e.detail) || {}, g = String(d.game || 'game');
    var title = d.title ? String(d.title).slice(0, 40).replace(/[<>&]/g, '') : '';   // 카드 제목(퀴즈 선물 등, quiz/quiz.js)
    drop(g + ':' + (d.place || 'end'), { kind: d.kind === 'chance' ? 'chance' : 'clear', game: g, chance: d.chance, title: title });
  });
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
  function loaded() { ready = !!window.PLAZA_CATALOG; var q = queue; queue = []; ready && q.forEach(function (a) { drop(a[0], a[1]) }) }
  if (window.PLAZA_CATALOG) { ready = true; return }
  var sc = document.createElement('script'), base = (me && me.src) || location.href, u;
  try { u = new URL('../chars/catalog.js', base) } catch (e) { return }
  if (/^http/.test(u.protocol)) u.searchParams.set('h', Math.floor(Date.now() / 3.6e6));
  sc.src = u.href; sc.onload = loaded; sc.onerror = function () { queue = [] };
  (document.head || document.documentElement).appendChild(sc);
})();
