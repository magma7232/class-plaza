/* 게임 속 퀴즈 (quiz/quiz.js) — 2026-11-24 선생님 요청
 * "많이 내지는 않더라도 드문드문 퀴즈가 나오거나, 퀴즈를 풀면 좋은 효과가 있어서 학업 문제에도 신경 쓰도록. 게임 속에서 부가적으로 푸는 느낌"
 *
 * back.js 6번이 이 파일을 불러와요 → back.js를 쓰는 모든 포털 게임에 저절로 들어가요(게임마다 고칠 것 없음).
 * - 게임을 2~3분쯤 열심히 하면(화면을 누르거나 조이스틱을 미는 동안만 셈) 구석에 작은 "❓ 퀴즈" 말풍선이 떠요.
 *   누르지 않아도 돼요. 1분 30초 동안 안 누르면 살짝 사라졌다가 나중에 다시 와요. 게임을 막지 않아요.
 * - 누르면 퀴즈 카드가 열리고 게임은 잠깐 멈춰요(친구와 연결된 판은 친구 화면이 멈추지 않게 멈추지 않고 손만 놓아요).
 *   게임이 바쁠 때(하트 특공대 레벨 업 문제처럼 그 게임의 시간 제한 창이 떠 있을 때)는 말풍선을 숨겨요(GAME_BUSY).
 *   보기 4개는 섞여서 나와요. 맞히면 반짝 + "정답!", 틀리면 힌트를 보여 주고 한 번 더 골라요(벌칙 없음).
 * - 하루 6문제까지(드문드문). 처음에 맞힌 문제 2개마다 선물 상자(맞힌 그때 gift.js에 'plaza-gift', 하루 3개까지).
 * - 카드를 닫을 때 'plaza-quiz' 신호 {correct, second, grade, subject, game}를 보내요 → 게임이 받아서 게임 속 보너스를 줄 수 있어요.
 *   correct: 처음 고른 답이 정답 · second: 힌트를 보고 두 번째에 맞힘
 * - 학년: 기본 4학년(DEFAULT_GRADE). 주소에 ?grade=3 을 붙여 한 번 열면 그 기기에 기억(localStorage plaza.quizGrade).
 *   다른 학교·학년에서 쓸 때는 아래 DEFAULT_GRADE 숫자 하나만 바꾸면 돼요. 문제는 quiz/bank.js.
 * - 끄기: 주소 ?quiz=0, 또는 게임의 <script src="back.js" data-quiz="off">.
 *   말풍선 자리: data-quiz-pos="right-middle" 처럼(아래 POS 이름), 지금 게임들의 자리는 아래 GAME_POS.
 *   게임이 알려 줄 수 있는 것: window.PLAZA_QUIZ_NOPAUSE(친구 판이라 멈추면 안 됨) · window.PLAZA_QUIZ_BUSY(지금 퀴즈를 띄우면 안 됨), 값 또는 함수.
 * 저장(이 기기): plaza.quizLog 오늘 푼 기록 · plaza.quizSeen 최근에 낸 문제 · plaza.quizGrade 학년
 * 시험 손잡이: window.PLAZA_QUIZ (ff(초)·show()·open()·answer(i)·next()·close()·state()·reset()), 주소 ?quizfast=1 은 5초 만에 말풍선
 */
(function () {
  'use strict';
  if (window.PLAZA_QUIZ) return;
  var me = document.currentScript;
  var BASE = (me && me.src) || location.href;
  var Q = new URLSearchParams(location.search);

  var DEFAULT_GRADE = 4;         // 우리 반 4학년. 다른 학년이면 이 숫자만 바꿔요(1~6)
  var ACTIVE_MIN = 120, ACTIVE_MAX = 180;   // 이만큼(초) 열심히 하면 말풍선
  var BUBBLE_SEC = 90;           // 말풍선이 떠 있는 시간(초)
  var DAY_MAX = 6;               // 하루에 푸는 퀴즈 수
  var GIFT_EVERY = 2;            // 처음에 맞힌 문제 이만큼마다 선물 상자
  var GIFT_MAX = 3;              // 퀴즈 선물은 하루 3개까지(gift.js도 한 게임 하루 3개)
  var CLOSE_SEC = 15;            // 결과가 나온 뒤 이만큼 지나면 저절로 닫힘
  var FAST = Q.has('quizfast');
  if (FAST) ACTIVE_MIN = ACTIVE_MAX = 5;

  // 말풍선 자리 이름(게임 단추와 겹치지 않는 곳). 가운데 자리는 쓰지 않아요(transform을 흔들기 움직임에 써서)
  var POS = {
    'top-left': 'top:calc(10px + env(safe-area-inset-top,0px));left:calc(10px + env(safe-area-inset-left,0px))',
    'top-right': 'top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px))',
    'bottom-left': 'bottom:calc(10px + env(safe-area-inset-bottom,0px));left:calc(10px + env(safe-area-inset-left,0px))',
    'bottom-right': 'bottom:calc(10px + env(safe-area-inset-bottom,0px));right:calc(10px + env(safe-area-inset-right,0px))',
    'left-middle': 'top:50%;left:calc(10px + env(safe-area-inset-left,0px))',
    'right-middle': 'top:50%;right:calc(10px + env(safe-area-inset-right,0px))'
  };
  // 게임마다 단추·점수·조이스틱이 없는 곳(가로 화면 land · 세로 화면 port, 2026-11-24 세 화면 크기에서 실제 판을 재어 고름).
  // 열쇠는 게임 파일 이름. 직접 CSS를 써도 돼요. 조이스틱이 왼쪽에서 시작하는 게임이 많아서 거의 오른쪽에 둬요
  function R(top) { return 'top:' + top + ';right:calc(10px + env(safe-area-inset-right,0px))' }
  var GAME_POS = {
    jangteo3d: { land: 'top:calc(10px + env(safe-area-inset-top,0px));right:345px', port: R('38%') },   // 위쪽 요리 방법·소리·멈춤 단추 줄의 왼쪽(오른쪽 칸은 모험 주방 시간·별·작업 단추)
    jangteo: { land: R('31%'), port: R('31%') },        // 2D판: 시간 카드와 작업 단추 사이
    heart: { land: R('62%'), port: R('62%') },          // 친구 칸과 '웃게 만든 투덜이' 사이
    sarang: { land: 'top:38%;left:calc(10px + env(safe-area-inset-left,0px))', port: 'top:38%;left:calc(10px + env(safe-area-inset-left,0px))' },   // 고정 조이스틱(왼쪽 아래) 위
    castle: { land: R('38%'), port: R('38%') },
    jelly: { land: R('calc(80px + env(safe-area-inset-top,0px))'), port: R('calc(80px + env(safe-area-inset-top,0px))') },   // 🔊☰ 줄 아래(70px이면 둥둥 뜰 때 🔊와 10px까지 붙어서 2026-11-24 80px로)
    giant: { land: R('53%'), port: R('64%') },          // 세로는 1번 친구 단추, 가로는 오른쪽 단추를 피해서
    magnet: { land: R('53%'), port: R('64%') },
    pyramid_run: { land: R('48%'), port: R('48%') },    // 왼쪽은 아이템 알약이 쌓임
    _: { land: 'right-middle', port: 'right-middle' }
  };

  function fileKey() {
    var p = location.pathname.split('/').filter(Boolean), f = (p.pop() || '').replace(/\.html?$/i, '');
    if (!f || f === 'index') f = p.pop() || 'game';
    try { f = decodeURIComponent(f) } catch (e) { }
    return f;
  }
  var FILE = fileKey();
  var GAME = { jangteo3d: 'jangteo', pyramid_run: 'pyramid' }[FILE] || FILE;   // 'plaza-quiz' 신호의 game(gift.js와 같은 이름)
  var backTag = document.querySelector('script[src*="back.js"]');
  if (Q.get('quiz') === '0' || (backTag && backTag.getAttribute('data-quiz') === 'off')) { window.PLAZA_QUIZ = { off: true }; return }

  // 기기 저장소가 막힌 브라우저(시크릿 창 등)에서는 이 페이지 동안만 기억해요(하루 한도·선물이 그래도 지켜지게)
  var MEM = {}, LS = (function () { try { localStorage.setItem('__pq', '1'); localStorage.removeItem('__pq'); return localStorage } catch (e) { return null } })();
  function jget(k, d) { try { var v = JSON.parse(k in MEM || !LS ? MEM[k] : LS.getItem(k)); return v == null ? d : v } catch (e) { return d } }   // 저장소가 가득 차 못 쓴 것(MEM)을 먼저
  function jput(k, v) { var s = JSON.stringify(v); if (LS) { try { LS.setItem(k, s); delete MEM[k]; return } catch (e) { } } MEM[k] = s }
  function jdel(k) { delete MEM[k]; try { LS && LS.removeItem(k) } catch (e) { } }
  function today() { return new Date().toDateString() }
  function grade() {
    var g = parseInt(Q.get('grade'), 10);
    if (g >= 1 && g <= 6) { jput('plaza.quizGrade', g); return g }
    g = parseInt(jget('plaza.quizGrade', 0), 10);
    return g >= 1 && g <= 6 ? g : DEFAULT_GRADE;
  }
  function log() {
    var l = jget('plaza.quizLog', null);
    if (!l || l.day !== today() || typeof l.n !== 'number') l = { day: today(), n: 0, ok: 0, gift: 0 };
    return l;
  }
  function saveLog(l) { jput('plaza.quizLog', l) }

  // ---------- 친구와 연결된 판인지(그러면 친구 화면이 멈추지 않게 게임을 멈추지 않아요) ----------
  // 1) 이 페이지가 친구에게 자주 보내고 있으면(최근 3초에 3번 넘게: WebRTC 데이터 통로·WebSocket 모두) 친구 판.
  //    back.js의 '지켜보기 연결'은 30초에 한 번만 보내서 걸리지 않아요. 퀴즈가 늦게 불러와져도 이미 열린 연결까지 잡혀요.
  // 2) WebRTC 연결이 열려 있으면(잠깐 끊긴 'disconnected'도) 친구 판 — 보내기가 잠깐 뜸할 때를 위해.
  // 3) 게임이 직접 알려 줄 수도 있어요: window.PLAZA_QUIZ_NOPAUSE = true 또는 () => 친구판인지
  var sends = [], pcs = [];
  (function () {
    [window.RTCDataChannel, window.WebSocket].forEach(function (C) {
      try {
        var P = C && C.prototype, o = P && P.send;
        if (!o || o.__pq) return;
        var w = function () { sends.push(Date.now()); if (sends.length > 8) sends.shift(); return o.apply(this, arguments) };
        w.__pq = 1; P.send = w;
      } catch (e) { }
    });
    try {
      var P = window.RTCPeerConnection && window.RTCPeerConnection.prototype, srd = P && P.setRemoteDescription;
      if (srd && !srd.__pq) {
        var w2 = function () { if (pcs.indexOf(this) < 0) { pcs.push(this); if (pcs.length > 20) pcs.shift() } return srd.apply(this, arguments) };
        w2.__pq = 1; P.setRemoteDescription = w2;
      }
    } catch (e) { }
  })();
  function coop() {
    var np = window.PLAZA_QUIZ_NOPAUSE;
    try { if (typeof np === 'function' ? np() : np) return true } catch (e) { }
    var now = Date.now(), n = 0, i;
    for (i = 0; i < sends.length; i++) if (now - sends[i] < 3000) n++;
    if (n >= 3) return true;
    for (i = 0; i < pcs.length; i++) {
      var s = pcs[i].connectionState || pcs[i].iceConnectionState;
      if (s === 'connected' || s === 'completed' || s === 'disconnected') return true;
    }
    return false;
  }
  // 게임이 바빠서 퀴즈를 띄우면 안 될 때(그 게임의 시간 제한 문제·카드가 떠 있을 때): 말풍선을 잠깐 숨겨요
  var GAME_BUSY = { heart: '#modal:not(.hide)' };   // 하트 특공대: 레벨 업 문제·능력 고르기 창(20초 시계가 돎)
  function busy() {
    var b = window.PLAZA_QUIZ_BUSY;
    try { if (typeof b === 'function' ? b() : b) return true } catch (e) { }
    var sel = GAME_BUSY[FILE], e = sel && document.querySelector(sel);
    return !!(e && e.getClientRects().length);
  }

  // ---------- 게임 잠깐 멈추기: 그림 그리기(requestAnimationFrame)를 붙잡아 두었다가 닫으면 이어서 ----------
  // 태블릿에서 다른 앱을 잠깐 보는 것과 같은 상태라서 모든 게임이 원래 견디는 방식이에요(dt 상한이 있어 닫은 뒤 한꺼번에 튀지 않음)
  var rafO = null, cafO = null, held = null, fakeN = 0, fakeMap = {};
  function hold() {
    if (!rafO) {
      rafO = window.requestAnimationFrame; cafO = window.cancelAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        if (!held) return rafO.call(window, cb);
        var id = -(++fakeN); held.push([id, cb]); return id;
      };
      window.cancelAnimationFrame = function (id) {
        if (typeof id === 'number' && id < 0) {
          if (held) for (var i = 0; i < held.length; i++) if (held[i][0] === id) { held.splice(i, 1); return }
          if (fakeMap[id]) { cafO.call(window, fakeMap[id]); delete fakeMap[id] }
          return;
        }
        return cafO.call(window, id);
      };
    }
    if (!held) held = [];
  }
  function release() {
    var h = held; held = null;
    if (!h) return;
    h.forEach(function (p) {
      var id = p[0], cb = p[1];
      fakeMap[id] = rafO.call(window, function (t) { delete fakeMap[id]; cb(t) });
    });
  }
  var pausedBy = '';
  function fire(name, detail) { try { window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail: detail })) } catch (e) { } }
  function pause() {
    fire('blur');   // back.js처럼: 누르고 있던 방향키·조이스틱을 놓아요
    pausedBy = coop() ? 'coop' : 'hold';
    if (pausedBy === 'hold') hold();
    fire('plaza-pause', { paused: true, by: 'quiz', hold: pausedBy === 'hold' });
  }
  function resume() {
    fire('blur');   // 퀴즈를 보는 동안 눌린 키가 남지 않게
    if (pausedBy === 'hold') release();
    pausedBy = '';
    fire('focus');
    fire('plaza-pause', { paused: false, by: 'quiz' });
  }

  // ---------- 문제 모음 불러오기(처음 필요할 때 한 번) ----------
  var bankState = window.QUIZ_BANK ? 'ok' : '', bankWait = [], bankFailAt = 0;
  function loadBank(cb) {
    if (bankState === 'ok') return cb(true);
    if (bankState === 'fail' && Date.now() - bankFailAt > 60000) bankState = '';   // 인터넷이 잠깐 끊겼으면 1분 뒤 다시
    if (bankState === 'fail') return cb(false);
    bankWait.push(cb);
    if (bankState === 'loading') return;
    bankState = 'loading';
    var u;
    try { u = new URL('bank.js', BASE) } catch (e) { bankState = 'fail'; return done(false) }
    if (/^http/.test(u.protocol)) u.searchParams.set('h', Math.floor(Date.now() / 3.6e6));
    var s = document.createElement('script');
    s.src = u.href;
    s.onload = function () { bankState = window.QUIZ_BANK ? 'ok' : 'fail'; done(bankState === 'ok') };
    s.onerror = function () { bankState = 'fail'; done(false) };
    (document.head || document.documentElement).appendChild(s);
    function done(ok) { if (!ok) bankFailAt = Date.now(); var w = bankWait; bankWait = []; w.forEach(function (f) { f(ok) }) }
  }
  function pickQuestion(g, want) {
    var list = (window.QUIZ_BANK || {})[g] || [];
    if (!list.length) return null;
    var seen = jget('plaza.quizSeen', {});
    if (!seen || typeof seen !== 'object') seen = {};
    var recent = Array.isArray(seen[g]) ? seen[g] : [];
    var i = want;
    if (!(i >= 0 && i < list.length)) {
      var keep = Math.min(60, Math.floor(list.length * 0.7));
      recent = recent.slice(-keep);
      var pool = [];
      for (var k = 0; k < list.length; k++) if (recent.indexOf(k) < 0) pool.push(k);
      if (!pool.length) { pool = list.map(function (_, k) { return k }); recent = [] }
      i = pool[Math.floor(Math.random() * pool.length)];
    }
    recent.push(i);
    seen[g] = recent.slice(-60);
    jput('plaza.quizSeen', seen);
    return { g: g, i: i, item: list[i] };
  }

  // ---------- 화면 ----------
  // 게임마다 주아 글꼴을 필요한 글자만 잘라 넣은 곳이 있어서(하트 특공대 등) 퀴즈는 기기 글꼴로 써요(글자가 섞여 보이지 않게)
  var FONT = "system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
  var CSS =
    '#pqBub{position:fixed;z-index:2147482900;display:flex;align-items:center;gap:5px;margin:0;padding:7px 14px 7px 9px;border-radius:999px;' +
    'border:3px solid #fff;background:linear-gradient(135deg,#8a63ff,#ff6fae);color:#fff;font:800 18px/1 ' + FONT + ';white-space:nowrap;' +
    'box-shadow:0 5px 14px rgba(70,30,130,.38);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;' +
    'animation:pqPop .45s ease-out,pqBob 2.6s ease-in-out .45s infinite}' +
    '#pqBub.mid{margin-top:-22px}#pqBub b{display:inline-block;width:26px;height:26px;border-radius:50%;background:#fff;color:#8a63ff;font-size:19px;line-height:26px;text-align:center;font-weight:normal}' +
    '#pqBub[hidden]{display:none}#pqBub.out{transition:opacity .35s,transform .35s;opacity:0;transform:scale(.5);pointer-events:none;animation:none}' +
    '@keyframes pqPop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}' +
    '@keyframes pqBob{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-4px) rotate(-3deg)}75%{transform:translateY(2px) rotate(3deg)}}' +
    '#pqOv{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;' +
    'background:rgba(24,30,58,.55);font-family:' + FONT + ';animation:pqFade .2s ease-out;-webkit-tap-highlight-color:transparent;' +
    'touch-action:none;overscroll-behavior:contain}' +   // 쓸어내려도 화면이 새로고침되지 않게(크롬 당겨서 새로고침)
    '#pqOv *{box-sizing:border-box}' +
    '#pqCard{position:relative;width:520px;max-width:100%;max-height:100%;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;background:#fffdf6;border-radius:24px;' +
    'padding:12px 16px 16px;color:#2b3a4f;box-shadow:0 14px 40px rgba(0,0,0,.35),inset 0 0 0 4px #e6dcff;animation:pqIn .35s cubic-bezier(.2,1.3,.4,1)}' +
    '.pq-top{display:flex;align-items:center;gap:6px;font-size:15px;color:#6a55a8;line-height:1}' +
    '.pq-tag{background:#efe8ff;border-radius:999px;padding:6px 10px;white-space:nowrap;font-weight:700}.pq-tag.s{background:#ffefd9;color:#b0560f}' +
    '.pq-x{margin-left:auto;border:0;background:#eef1f6;border-radius:999px;padding:8px 12px;font:inherit;font-size:15px;color:#5a6a80;cursor:pointer;touch-action:manipulation;white-space:nowrap}' +
    '.pq-q{font-size:22px;font-weight:800;line-height:1.4;margin:10px 2px 12px;word-break:keep-all;overflow-wrap:break-word}' +
    '.pq-cs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pq-cs.one{grid-template-columns:1fr}' +
    '.pq-c{position:relative;min-height:54px;margin:0;border:3px solid #dbe3f0;border-radius:16px;background:#fff;font:inherit;font-size:19px;font-weight:700;line-height:1.3;color:#24334a;' +
    'padding:6px 10px 6px 36px;text-align:left;word-break:keep-all;overflow-wrap:break-word;cursor:pointer;touch-action:manipulation;box-shadow:0 3px 0 #dbe3f0}' +
    '.pq-c i{position:absolute;left:8px;top:50%;margin-top:-12px;width:24px;height:24px;border-radius:50%;background:#eef2f8;color:#6b7a90;font-style:normal;font-size:15px;line-height:24px;text-align:center}' +
    '.pq-c:active{transform:translateY(2px);box-shadow:none}' +
    '.pq-c.ok{background:#e5f8e9;border-color:#37b24d;box-shadow:0 3px 0 #2f9e44;color:#1b6e2c}.pq-c.ok i{background:#37b24d;color:#fff}' +
    '.pq-c.no{background:#f3f4f7;border-color:#d4d8e0;box-shadow:none;color:#a0a8b4;animation:pqShake .4s}.pq-c.no i{background:#d4d8e0;color:#fff}' +
    '.pq-c[disabled]{cursor:default}' +
    '.pq-msg{margin-top:10px;font-size:17px;font-weight:700;line-height:1.45;word-break:keep-all}.pq-msg:empty{display:none}' +
    '.pq-hint{background:#fff4cc;border-radius:14px;padding:8px 12px;color:#6e5200}' +
    '.pq-big{font-size:30px;font-weight:900;color:#e8590c;text-align:center;line-height:1.2;animation:pqPop .45s ease-out}' +
    '.pq-sub{text-align:center;color:#5a6a80;font-size:16px;margin-top:2px}' +
    '.pq-go{display:block;margin:12px auto 0;border:0;border-radius:999px;padding:12px 28px;font:inherit;font-size:19px;font-weight:800;background:#2f8cff;color:#fff;box-shadow:0 4px 0 #1c6fd6;cursor:pointer;touch-action:manipulation}' +
    '.pq-fx{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;border-radius:inherit}' +
    '.pq-sp{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;pointer-events:none;animation:pqSp .9s ease-out forwards}' +
    '.pq-sp.st{width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:2px;transform:rotate(45deg)}' +
    '@keyframes pqSp{0%{transform:translate(0,0) scale(.4) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1) rotate(160deg);opacity:0}}' +
    '@keyframes pqFade{0%{opacity:0}100%{opacity:1}}' +
    '@keyframes pqIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}' +
    '@keyframes pqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}' +
    // 낮은 화면(휴대폰 가로, 1024×600 패드의 주소창 등): 글자와 칸을 조금 줄여서 한 화면에
    '@media (max-height:460px){#pqCard{padding:8px 12px 10px;border-radius:18px}.pq-q{font-size:19px;margin:6px 2px 8px}.pq-c{min-height:44px;font-size:17px}' +
    '.pq-msg{font-size:16px;margin-top:6px}.pq-big{font-size:24px}.pq-go{padding:9px 24px;font-size:18px;margin-top:8px}.pq-top{font-size:13px}.pq-x{padding:6px 10px}}' +
    '@media (max-width:360px){.pq-q{font-size:19px}.pq-c{font-size:17px}}';
  function style() {
    if (document.getElementById('pqCss')) return;
    var s = document.createElement('style'); s.id = 'pqCss'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  // 게임이 화면 터치를 가로채지 않게(조이스틱이 같이 눌리지 않게)
  function guard(el) {
    ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'touchmove', 'mousedown', 'mouseup', 'mousemove', 'click', 'wheel', 'contextmenu'].forEach(function (t) {
      el.addEventListener(t, function (e) { e.stopPropagation() }, { passive: true });
    });
  }
  function keyGuard(e) { if (ov) e.stopPropagation() }

  // ---------- 말풍선 ----------
  var bub = null, bubT = null, bubLeft = 0;
  function posCss() {
    var tag = backTag && backTag.getAttribute('data-quiz-pos');
    var g = GAME_POS[FILE] || GAME_POS._;
    var port = window.innerHeight > window.innerWidth;
    var p = tag || (port ? g.port : g.land) || 'right-middle';
    return { css: POS[p] || p, mid: /middle$/.test(p) };
  }
  // 정해 둔 자리에 그때 보이는 단추(메뉴 카드·레벨 업 카드 같은 것)가 있으면 다음 빈자리로 옮겨요.
  // 2초마다 단추 자리만 훑어보고(가벼움), 단추 배치가 바뀌었을 때만 자리를 다시 골라요(낡은 패드에서 버벅이지 않게)
  var SPARE = [R('86%'), R('24%'), R('76%'), R('38%'), R('50%'), R('12%'),
    'top:38%;left:calc(10px + env(safe-area-inset-left,0px))', 'top:62%;left:calc(10px + env(safe-area-inset-left,0px))'];
  var probe = null, lastSig = '';
  var BTN_SEL = 'button,[role=button],a[href],input,select,textarea,[onclick],.pad,#joy,#skills,#btnA,#btnB';   // div로 만든 게임 단추·조이스틱도
  function buttonsNow() {   // 지금 눌 수 있는 단추들(다른 판에 가려진 것·안 보이는 것·화면을 덮는 큰 판은 빼요)
    var out = [], W = window.innerWidth, H = window.innerHeight;
    var list = document.querySelectorAll(BTN_SEL);
    for (var i = 0; i < list.length && i < 300; i++) {
      var e = list[i];
      if (e.closest && (e.closest('#pqBub') || e.closest('#pqOv'))) continue;
      var r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > H || r.left > W) continue;
      if (r.width * r.height > W * H * 0.25) continue;   // 화면 전체 조이스틱 판 같은 것
      var t = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), W - 1), Math.min(Math.max(r.top + r.height / 2, 0), H - 1));
      if (t && (t === e || e.contains(t))) out.push(r);
    }
    return out;
  }
  function placeBubble(force) {
    if (!bub) return;
    var hidden = bub.style.visibility; bub.style.visibility = 'hidden';
    var bs = buttonsNow(), W = window.innerWidth, H = window.innerHeight;
    var sig = W + 'x' + H + ':' + bs.map(function (q) { return Math.round(q.left / 8) + ',' + Math.round(q.top / 8) + ',' + Math.round(q.width / 8) + ',' + Math.round(q.height / 8) }).join(';');
    if (!force && sig === lastSig && bub._pos) { bub.style.visibility = hidden; return }   // 아직 자리를 안 받은 새 말풍선은 꼭 자리를 정해요
    lastSig = sig;
    var first = posCss(), opts = [first];
    SPARE.forEach(function (c) { if (c !== first.css) opts.push({ css: c, mid: false }) });
    if (!probe) { probe = document.createElement('div'); document.body.appendChild(probe) }
    var w = bub.offsetWidth || 96, h = bub.offsetHeight || 44, pad = 10, pick = first;
    for (var i = 0; i < opts.length; i++) {
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:' + w + 'px;height:' + h + 'px;' + (opts[i].mid ? 'margin-top:-22px;' : '') + opts[i].css;
      var r = probe.getBoundingClientRect(), hit = r.left < 0 || r.top < 0 || r.right > W || r.bottom > H;
      for (var k = 0; !hit && k < bs.length; k++) { var q = bs[k]; hit = q.right > r.left - pad && q.left < r.right + pad && q.bottom > r.top - pad && q.top < r.bottom + pad }
      if (!hit) { pick = opts[i]; break }
    }
    bub.style.visibility = hidden;
    if (bub._pos !== pick.css) {
      bub._pos = pick.css;
      bub.style.cssText = pick.css;
      bub.className = pick.mid ? 'mid' : '';
    }
  }
  function showBubble() {
    if (bub || ov || !document.body) return;
    if (busy()) { active = Math.max(0, target - 5); return }   // 게임이 바쁘면 5초 뒤 다시
    style();
    bub = document.createElement('button');
    bub.id = 'pqBub'; bub.type = 'button';
    bub.innerHTML = '<b>?</b>퀴즈';
    bub.setAttribute('aria-label', '퀴즈 풀기');
    guard(bub);
    bub.addEventListener('click', function (e) { e.preventDefault(); if (!busy()) openQuiz() });
    bub.style.visibility = 'hidden';
    document.body.appendChild(bub);
    placeBubble(true);   // 새 말풍선은 늘 자리를 다시 골라요(2026-11-24 검토: 단추 배치가 그대로면 두 번째 말풍선부터 숨김 상태로 남아 안 보였음)
    phase = 'bubble';
    bubLeft = BUBBLE_SEC;
  }
  function hideBubble(soft) {
    if (!bub) return;
    var b = bub; bub = null;
    if (soft) { b.className = 'out'; setTimeout(function () { b.remove() }, 400) } else b.remove();
  }
  window.addEventListener('resize', placeBubble);

  // ---------- 열심히 한 시간 세기(gift.js와 같은 방식) ----------
  var lastIn = 0, active = 0, target = rnd(), phase = 'wait';
  function rnd() { return ACTIVE_MIN + Math.floor(Math.random() * (ACTIVE_MAX - ACTIVE_MIN + 1)) }
  ['pointerdown', 'touchstart', 'touchmove', 'keydown'].forEach(function (k) { window.addEventListener(k, function () { lastIn = Date.now() }, { capture: true, passive: true }) });
  window.addEventListener('pointermove', function (e) { e.buttons && (lastIn = Date.now()) }, { capture: true, passive: true });
  function tick(sec, force) {
    if (ov) return;
    if (!force && (document.visibilityState === 'hidden' || Date.now() - lastIn > 8000)) return;
    if (phase === 'bubble') {
      if (bub && bub.hidden) return;   // 게임이 바빠서 숨긴 동안은 시간이 안 가요
      bubLeft -= sec;
      if (bubLeft <= 0) { hideBubble(true); phase = 'wait'; active = 0; target = rnd() }
      return;
    }
    if (log().n >= DAY_MAX) return;
    active += sec;
    if (active >= target) {
      active = 0; target = rnd();
      loadBank(function (ok) { if (ok && !ov && log().n < DAY_MAX) showBubble() });
    }
  }
  var chk = 0;
  setInterval(function () {
    if (bub) { var b = busy(); if (bub.hidden !== b) bub.hidden = b }   // 게임 카드가 뜨면 말풍선을 숨기고, 닫히면 다시
    tick(1);
    if (bub && !bub.hidden && ++chk % 2 === 0) placeBubble();
    if (ov && pausedBy === 'hold' && coop()) { release(); pausedBy = 'coop'; }   // 퀴즈를 보는 사이 친구가 들어오면 게임을 다시 돌려요(친구 화면이 멈추지 않게)
  }, 1000);

  // ---------- 퀴즈 카드 ----------
  var ov = null, cur = null, closeT = null;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
  function shuffle(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
  function openQuiz(opt) {
    opt = opt || {};
    if (ov) return false;
    if (!window.QUIZ_BANK) { loadBank(function (ok) { ok && openQuiz(opt) }); return false }
    var g = opt.grade >= 1 && opt.grade <= 6 ? opt.grade : grade();
    var pk = pickQuestion(g, opt.index);
    if (!pk) return false;
    hideBubble(false);
    style();
    var it = pk.item, order = shuffle(4);
    cur = { g: g, i: pk.i, s: it.s, item: it, order: order, tries: 0, done: false, correct: false, second: false, gift: '', t0: Date.now() };
    ov = el('div'); ov.id = 'pqOv';
    guard(ov);
    var card = el('div'); card.id = 'pqCard';
    var top = el('div', 'pq-top');
    top.appendChild(el('span', 'pq-tag', '❓ 퀴즈 · ' + g + '학년'));
    top.appendChild(el('span', 'pq-tag s', it.s));
    var x = el('button', 'pq-x', '나중에 ✕'); x.type = 'button';
    x.addEventListener('click', function () { closeQuiz() });
    top.appendChild(x);
    card.appendChild(top);
    card.appendChild(el('div', 'pq-q', it.q));
    var cs = el('div', 'pq-cs');
    cur.long = it.c.some(function (c) { return c.length > 8 });
    var marks = ['1', '2', '3', '4'];
    order.forEach(function (ci, k) {
      var b = el('button', 'pq-c'); b.type = 'button';
      b.appendChild(el('i', '', marks[k]));
      b.appendChild(document.createTextNode(it.c[ci]));
      b.setAttribute('data-c', ci);
      b.addEventListener('click', function () { if (Date.now() - cur.t0 >= 350) choose(k) });   // 말풍선을 두 번 톡톡 누른 손가락이 바로 보기를 고르지 않게(말풍선이 오른쪽 보기 위에 있을 때가 있음)
      cs.appendChild(b);
    });
    card.appendChild(cs);
    card.appendChild(el('div', 'pq-msg'));
    card.appendChild(el('div', 'pq-fx'));   // 반짝이 자리(카드 밖으로 튀어나가 스크롤이 생기지 않게)
    ov.appendChild(card);
    document.body.appendChild(ov);
    layoutCard();
    window.addEventListener('keydown', keyGuard, true);
    window.addEventListener('keyup', keyGuard, true);
    phase = 'open';
    pause();
    return true;
  }
  function layoutCard() {   // 보기가 긴 문제는 좁은 화면에서 한 줄에 하나씩
    if (!ov || !cur) return;
    var cs = ov.querySelector('.pq-cs');
    if (cs) cs.className = cur.long && Math.min(window.innerWidth - 16, 520) < 460 ? 'pq-cs one' : 'pq-cs';
  }
  var rzT = null;
  window.addEventListener('resize', function () {
    if (!ov) return;
    layoutCard();
    clearTimeout(rzT);
    rzT = setTimeout(function () { if (held) { release(); hold() } }, 350);   // 게임이 바뀐 크기로 한 장 다시 그리게(뒤가 검게 남지 않게)
  });
  function choose(k) {
    if (!cur || cur.done) return;
    var btns = ov.querySelectorAll('.pq-c'), b = btns[k];
    if (!b || b.disabled) return;
    var ci = cur.order[k], msg = ov.querySelector('.pq-msg');
    cur.tries++;
    if (ci === 0) {
      b.classList.add('ok');
      cur.done = true;
      cur.correct = cur.tries === 1;
      cur.second = cur.tries === 2;
      for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
      sparkle(b, cur.correct ? 18 : 10);
      chime(cur.correct);
      var l = log();
      l.n++;
      var giftLine = '';
      if (cur.correct) {
        l.ok++;
        if (l.ok % GIFT_EVERY === 0 && l.gift < GIFT_MAX && giftOk()) {
          // 맞힌 그때 바로 줘요(카드를 닫기 전에 '모두 광장으로'·창 닫기가 있어도 잃지 않게). 선물 카드는 퀴즈 카드 위에 떠요
          var G = window.PLAZA_GIFT, before = G.log().n;
          fire('plaza-gift', { game: 'quiz', place: 'q' + (l.gift + 1), title: '🎁 퀴즈를 맞힌 선물!' });
          if (G.log().n > before) { l.gift++; cur.gift = 'q' + l.gift; giftLine = '🎁 선물 상자를 받았어요!' }
        } else if (l.n < DAY_MAX && l.gift < GIFT_MAX && giftOk()) giftLine = '⭐ 한 문제 더 맞히면 선물 상자!';
      }
      saveLog(l);
      msg.innerHTML = '';
      msg.appendChild(el('div', 'pq-big', cur.correct ? '⭕ 정답!' : '👍 맞았어요!'));
      msg.appendChild(el('div', 'pq-sub', cur.correct ? (giftLine || stars(l)) : '힌트를 잘 보고 풀었어요.'));
      finish();
    } else {
      b.classList.add('no'); b.disabled = true;
      if (cur.tries === 1) {
        msg.innerHTML = '';
        var h = el('div', 'pq-hint', '💡 힌트: ' + cur.item.hint);
        msg.appendChild(h);
        msg.appendChild(el('div', 'pq-sub', '괜찮아요! 한 번 더 골라 볼까요?'));
      } else {
        cur.done = true;
        for (var j = 0; j < btns.length; j++) { btns[j].disabled = true; if (cur.order[j] === 0) btns[j].classList.add('ok') }
        var l2 = log(); l2.n++; saveLog(l2);
        msg.innerHTML = '';
        msg.appendChild(el('div', 'pq-hint', '정답은 ‘' + cur.item.c[0] + '’예요. 괜찮아요, 다음에 또 도전해요!'));
        finish();
      }
    }
  }
  function stars(l) {
    var s = '';
    for (var i = 0; i < Math.min(l.ok, DAY_MAX); i++) s += '⭐';
    return '오늘 맞힌 퀴즈 ' + s;
  }
  function giftOk() {
    var G = window.PLAZA_GIFT;
    if (!G || !G.ready || !G.log) return false;
    try { var gl = G.log(); return gl.n < 6 && ((gl.g || {}).quiz || 0) < GIFT_MAX && !!G.pick() } catch (e) { return false }   // pick(): 다 모은 아이는 null
  }
  function finish() {
    var x = ov.querySelector('.pq-x'); if (x) x.remove();
    var go = el('button', 'pq-go', '계속하기 ▶'); go.type = 'button';
    go.addEventListener('click', function () { closeQuiz() });
    ov.querySelector('#pqCard').appendChild(go);
    clearTimeout(closeT);
    closeT = setTimeout(function () { closeQuiz() }, CLOSE_SEC * 1000);
  }
  function closeQuiz() {
    if (!ov) return;
    clearTimeout(closeT);
    var o = ov, c = cur; ov = null; cur = null;
    o.remove();
    window.removeEventListener('keydown', keyGuard, true);
    window.removeEventListener('keyup', keyGuard, true);
    resume();
    active = 0; target = rnd(); phase = 'wait';
    if (c && c.done) {
      fire('plaza-quiz', { correct: c.correct, second: c.second, grade: c.g, subject: c.s, game: GAME });
    }
  }
  function sparkle(btn, n) {
    try {
      var card = ov.querySelector('#pqCard'), fx = card.querySelector('.pq-fx'), r = btn.getBoundingClientRect(), cr = card.getBoundingClientRect();
      var cx = r.left - cr.left + r.width / 2 + card.scrollLeft, cy = r.top - cr.top + r.height / 2 + card.scrollTop;
      var cols = ['#ffd43b', '#ff6fae', '#8a63ff', '#38d9a9', '#4dabf7', '#ffa94d'];
      for (var i = 0; i < n; i++) {
        var s = el('span', 'pq-sp' + (i % 3 === 0 ? ' st' : '')), a = Math.PI * 2 * i / n + Math.random() * .4, d = 50 + Math.random() * 60;
        s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = cols[i % cols.length];
        s.style.setProperty('--x', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--y', Math.round(Math.sin(a) * d) + 'px');
        fx.appendChild(s);
        (function (s) { setTimeout(function () { s.remove() }, 1000) })(s);
      }
    } catch (e) { }
  }
  function chime(big) {   // 게임 소리를 껐으면 울리지 않아요(gift.js와 같은 규칙)
    try {
      var st = window.BGM && BGM.state && BGM.state();
      if (!st || st.pageMute || !st.unlocked) return;
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var a = chime.a || (chime.a = new A()), t = a.currentTime, notes = big ? [659, 880, 1047, 1319] : [659, 880];
      notes.forEach(function (f, i) {
        var o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.1, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .3);
        o.connect(g); g.connect(a.destination); o.start(t + i * .09); o.stop(t + i * .09 + .35);
      });
    } catch (e) { }
  }

  // ---------- 시험 손잡이 ----------
  window.PLAZA_QUIZ = {
    game: GAME,
    cfg: { DEFAULT_GRADE: DEFAULT_GRADE, ACTIVE_MIN: ACTIVE_MIN, ACTIVE_MAX: ACTIVE_MAX, DAY_MAX: DAY_MAX, GIFT_EVERY: GIFT_EVERY, GIFT_MAX: GIFT_MAX, BUBBLE_SEC: BUBBLE_SEC },
    ff: function (sec) { tick(sec || 1, true) },
    show: function () { loadBank(function (ok) { ok && showBubble() }) },
    open: openQuiz,
    answer: function (k) { choose(k) },
    correctIndex: function () { return cur ? cur.order.indexOf(0) : -1 },
    close: closeQuiz,
    load: loadBank,
    reset: function () { jdel('plaza.quizLog'); jdel('plaza.quizSeen'); active = 0; target = rnd(); if (phase !== 'open') { hideBubble(false); phase = 'wait' } },
    busy: busy,
    state: function () {
      return { phase: phase, hidden: !!(bub && bub.hidden), active: active, target: target, bubbleLeft: bub ? bubLeft : 0, grade: grade(), log: log(), paused: pausedBy, held: held ? held.length : -1, coop: coop(), bank: bankState,
        cur: cur ? { grade: cur.g, index: cur.i, subject: cur.s, q: cur.item.q, tries: cur.tries, done: cur.done, correct: cur.correct } : null };
    }
  };
})();
