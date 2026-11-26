/* 사과 문제 · 코인 (coin.js) — 2026-11-26 선생님 요청
 * "광장에서 사과나무를 흔들면 사과가 떨어지잖아. 사과 1개로 문제 1개. 20문제를 맞히면 1코인. 그 코인으로 각 게임에 들어가게(공부를 안 하면 게임에 못 들어가게).
 *  황금 사과가 랜덤으로 뜨는데, 황금 사과 문제를 맞히면 5문제 정답으로. 선생님은 원하는 학생에게 코인을 원하는 만큼 줄 수 있게."
 *
 * - 광장 왼쪽 위 🍎 아래 줄: 「📝 문제 풀기」 · 🪙 내 코인 · 코인까지 13/20 · ✨🍎 황금 사과.
 *   📝를 누르면 사과 1개를 쓰고 학년 문제(quiz/bank.js QUIZ_BANK[PLAZA_GRADE()]) 하나. 맞히면 +1, 틀리면 정답과 힌트를 보여 줌(사과만 씀).
 *   황금 사과가 있으면 「✨ 황금 사과 문제(맞히면 +5)」를 고를 수 있음. 20이 되면 🪙 +1(남는 수는 다음 코인으로).
 * - 포털·명소 문·꿈빛 성 문 「들어갈까요?」: 🪙 1개를 내고 들어감(games.js가 PLAZA_COIN.entry/pay를 씀).
 *   코인이 없으면 못 들어가고 「📝 문제 풀러 가기」. 선생님 기기·코인 입장 끔(선생님 판, 서버 반) · 주소 ?coin=0 은 그냥 들어감.
 *   방금 코인을 내고 들어간 게임은 3분 동안 다시 들어가도 안 냄(낡은 패드에서 게임이 튕기거나 잘못 나왔을 때).
 *   선생님이 「다 같이 들어가기」로 연 포털은 원래처럼 바로 들어감(코인 안 냄).
 * - 저장: 서버 반(광장 서버가 사과 코인을 알면 hi.coin)은 **서버가 기준**. 광장은 '맞힘·황금 주움·입장'을 편지(cop)로 보내고 서버가 셈해서 답함.
 *   편지는 답을 받을 때까지 이 기기에 적어 두었다가 다시 연결되면 다시 보냄(번호가 같으면 서버가 두 번 세지 않음).
 *   서버가 없는 공개 주소·파일, 사과 코인을 모르는 옛 서버: 이 기기에 저장(plaza.coin)하고 같은 규칙. 사과 수도 이 기기에(plaza.apples).
 * - 선생님 판 「🪙 사과 코인」: 코인 입장 켜기·끄기, 🪙 코인 주기(학생 고르기 + 숫자, 빼기도, 모두에게). 서버 반에서만 학생 기기로 감.
 * - 사과나무(둥근 나무 모두)·뭉텅이·쉬는 시간·다시 열리기는 plaza_home.js가 아래 숫자(BUNCHES…)로 정함: 한 학생이 10분쯤 열심히 하면 20문제가 되게(재 본 것은 README).
 * 시험 손잡이: window.PLAZA_COIN (state·open·answer(i)·correctIndex()·close·give·…), 주소 ?coin=0 끔
 */
(function () {
  "use strict";
  if (window.PLAZA_COIN) return;

  // ---------- 숫자는 여기 한 곳 ----------
  var CFG = {
    NEED: 20, // 이만큼 맞히면 🪙 1 (서버 index.js COIN_NEED와 같게)
    GOLD_STEP: 5, // 황금 사과 문제를 맞히면 이만큼으로 셈
    GOLD_P: 0.06, // 나무를 흔들어 떨어지는 사과 하나가 황금 사과일 확률(6%)
    // 사과나무(2026-11-26 선생님: "둥근 나무는 모두 사과나무 · 흔들면 뭉텅이 1·2·3·5개 · 2~3초는 또 안 떨어짐 · 연속 3번까지") — plaza_home.js가 씀
    BUNCHES: 3, // 나무 하나에서 연속으로 떨어지는 뭉텅이 수
    BUNCH_SIZES: [1, 2, 3, 5], // 뭉텅이 하나의 사과 수
    BUNCH_W: [30, 35, 25, 10], // 위 크기가 나올 몫(%) → 뭉텅이 평균 약 2.3개, 나무 하나 약 6~7개(사과 자리 8곳 안)
    COOL_SEC: 2.2, // 뭉텅이가 떨어진 뒤 그 나무가 쉬는 시간(초). 흔드는 모습이 0.6초쯤이라 계속 흔들면 2.2~2.8초마다 한 번
    REGROW_SEC: 180, // 다 떨어진 빈 나무가 다시 열리기까지(초)
    PASS_MIN: 3, // 코인을 내고 들어간 게임은 이만큼(분) 안에 다시 들어가도 안 냄
    PAY_WAIT: 4000, // 서버 답을 이만큼(밀리초) 기다리고, 없으면 이 기기에 적힌 코인 수로 판단
  };
  var Q = new URLSearchParams(location.search);
  var OFF = Q.get("coin") === "0"; // 이 기기만 코인 입장 끔(서버가 없는 날 자유 놀이)

  // ---------- 저장 ----------
  var MEM = {};
  function jget(k, d) { try { var v = JSON.parse(k in MEM ? MEM[k] : localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jput(k, v) { var s = JSON.stringify(v); try { localStorage.setItem(k, s); delete MEM[k]; } catch (e) { MEM[k] = s; } }
  function N() { return window.NET; }
  function G() { return window.NET && NET.G; }
  function online() { return !!(N() && NET.online); }
  function isT() {
    if (window.PLAZA_GAMES && PLAZA_GAMES.isTeacher) return PLAZA_GAMES.isTeacher();
    try { return online() ? NET.role === "teacher" : Q.has("teacher"); } catch (e) { return false; }
  }
  function grade() { var g = window.PLAZA_GRADE ? parseInt(PLAZA_GRADE(), 10) : 4; return g >= 1 && g <= 6 ? g : 4; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---------- 상태 ----------
  // srv: 지금 사과 코인을 아는 서버에 들어와 있음 → st는 서버 숫자(+ 아직 답을 못 받은 편지 효과)
  var srv = false, srvOn = true, base = { c: 0, p: 0, g: 0 }, st = { c: 0, p: 0, g: 0 };
  var local = jget("plaza.coin", null);
  if (!local || typeof local !== "object") local = { c: 0, p: 0, g: 0 };
  function clean(s) { return { c: Math.max(0, s.c | 0), p: Math.max(0, s.p | 0), g: Math.max(0, s.g | 0) }; }
  local = clean(local);
  st = clean(local);
  function who() { return online() ? String(NET.room || "") + "|" + String(NET.name || "") : ""; }
  var box = jget("plaza.coinQ", null); // 아직 서버 답을 못 받은 편지 {who, ops:[]}
  if (!box || !Array.isArray(box.ops)) box = { who: "", ops: [] };
  function saveBox() { jput("plaza.coinQ", box); }
  // 편지 하나의 효과(서버와 같은 셈)
  function apply(s, o) {
    s = { c: s.c, p: s.p, g: s.g };
    if (o.k === "q") {
      var gold = !!o.gold && s.g > 0;
      if (gold) s.g--;
      if (o.ok) s.p += gold ? CFG.GOLD_STEP : 1;
      while (s.p >= CFG.NEED) { s.p -= CFG.NEED; s.c++; }
    } else if (o.k === "gold") { if (s.g < 99) s.g++; }
    else if (o.k === "pay") { if (s.c >= 1 && !o.free) s.c--; }
    return s;
  }
  function recompute() {
    if (!srv) { st = clean(local); return; }
    var s = clean(base);
    box.ops.forEach(function (o) { if (o.who === who()) s = apply(s, o); });
    st = s;
  }
  var nid = 0;
  function opId() { return Date.now().toString(36) + "-" + (++nid) + "-" + Math.random().toString(36).slice(2, 6); }
  var waiters = {};
  // 숫자를 바꾸는 일 하나. 서버 반이면 편지로, 아니면 이 기기에서 바로
  function op(o, cb) {
    if (!srv) {
      var before = local.c;
      if (o.k === "pay") {
        var ok = OFF || local.c >= 1;
        if (!OFF) local = apply(local, o);
        jput("plaza.coin", local); recompute(); draw(true);
        return cb && cb({ ok: ok, free: OFF });
      }
      local = apply(local, o);
      jput("plaza.coin", local); recompute(); draw(true);
      return cb && cb({ ok: true, got: local.c - before });
    }
    o.id = opId();
    o.who = who();
    box.who = o.who;
    box.ops.push(o);
    if (box.ops.length > 60) box.ops.splice(0, box.ops.length - 60);
    saveBox();
    var b0 = st.c;
    recompute(); draw(true);
    if (cb) waiters[o.id] = cb;
    send(o);
    return st.c - b0;
  }
  function send(o) {
    try { if (NET.cloud && NET.cloud.ws && NET.cloud.ws.readyState === 1) NET.cloud.send({ t: "cop", o: { id: o.id, k: o.k, ok: o.ok ? 1 : 0, gold: o.gold ? 1 : 0, w: o.w || "" } }); } catch (e) {}
  }
  function flush() { box.ops.forEach(function (o) { if (o.who === who()) send(o); }); }

  // ---------- 서버 편지(net.js onCloud가 먼저 불러 줌) ----------
  var gift = 0;
  function onCloud(m) {
    if (!m || typeof m.t !== "string") return;
    if (m.t === "hi") {
      srv = !!(m.coin && typeof m.coin === "object");
      if (!srv) { recompute(); draw(true); return; } // 옛 서버: 이 기기 저장으로
      base = clean(m.coin);
      srvOn = m.coinOn !== false;
      if (box.who !== who()) box = { who: who(), ops: box.ops.filter(function (o) { return o.who === who(); }) };
      recompute();
      flush();
      if (m.coinGift) { gift += m.coinGift | 0; try { NET.cloud.send({ t: "cseen" }); } catch (e) {} }
      draw(true);
      if (tPanel) tDraw();
      return;
    }
    if (m.t === "coin" && srv) {
      if (m.s) base = clean(m.s);
      if (m.ack) {
        var cb = waiters[m.ack];
        delete waiters[m.ack];
        box.ops = box.ops.filter(function (o) { return o.id !== m.ack; });
        saveBox();
        recompute();
        if (cb) cb({ ok: !!m.ok, free: !!m.free, got: m.got | 0 });
      } else recompute();
      if (m.why === "give" && m.n) { gift += m.n | 0; try { NET.cloud.send({ t: "cseen" }); } catch (e) {} } // 받았다고 알림(서버가 다음 접속 때 또 알려 주지 않게)
      draw(true);
      return;
    }
    if (m.t === "coinon") { srvOn = !!m.on; draw(true); if (tPanel) tDraw(); return; }
    if (m.t === "coins") { tList = m; if (m.on != null) srvOn = !!m.on; if (tPanel) tDraw(); if (gv) gvDraw(); return; }
  }

  // ---------- 사과 ----------
  function apples() { var g = G(); return g ? g.Yf | 0 : 0; }
  function setApples(n) {
    var g = G();
    if (!g) return;
    g.setYf(Math.max(0, n | 0));
    if (online() && NET.role === "student" && NET.saveHome) { try { NET.saveHome(true); } catch (e) {} } // 쓴 사과는 바로 저장(게임에 바로 들어가도 되돌아오지 않게)
    saveLocalApples();
  }
  // 서버가 없을 때는 사과 수를 이 기기에 기억(예전엔 새로고침하면 0이 됐음 — 이제 사과가 문제를 푸는 값이라서)
  var applesLoaded = false, lastA = -1;
  function saveLocalApples() {
    var g = G();
    if (!g || online() || !applesLoaded) return;
    if (g.Yf !== lastA) { lastA = g.Yf; jput("plaza.apples", g.Yf | 0); }
  }
  function loadLocalApples() {
    var g = G();
    if (applesLoaded || !g) return;
    if (N() && NET.pendingHi) return; // 서버에 들어오는 중이면 서버 저장을 기다려요
    applesLoaded = true;
    if (!online()) { var a = jget("plaza.apples", 0) | 0; if (a > 0 && !(g.Yf > 0)) g.setYf(a); lastA = g.Yf; }
  }

  // ---------- 화면: 왼쪽 위 줄 ----------
  var FONT = "inherit";
  var css = document.createElement("style");
  css.textContent =
    "#coinBar{position:fixed;z-index:5;display:flex;align-items:center;gap:6px;left:calc(10px + env(safe-area-inset-left));top:calc(96px + env(safe-area-inset-top));padding:4px;border-radius:999px;font-weight:900;-webkit-user-select:none;user-select:none}" +
    "#coinBar[hidden]{display:none}" +
    "#cbQuiz{border:0;border-radius:999px;padding:7px 13px;font:900 15px/1 " + FONT + ";font-family:inherit;color:#fff;background:linear-gradient(135deg,#ff7a59,#ff5f8d);box-shadow:0 3px 0 #d9466e;cursor:pointer;touch-action:manipulation;white-space:nowrap}" +
    "#cbQuiz:active{transform:translateY(2px);box-shadow:none}" +
    "#cbQuiz.empty{background:linear-gradient(135deg,#9aa7b8,#7f8ea3);box-shadow:0 3px 0 #66758a}" +
    "#coinBar .cbC{display:flex;align-items:center;gap:3px;font-size:16px;color:#7a4a00;padding:0 2px 0 4px;white-space:nowrap}" +
    "#coinBar .cbC b{min-width:12px;text-align:center}#coinBar .cbC.bump{animation:cbBump .7s ease-out}" +
    "@keyframes cbBump{0%{transform:scale(1)}30%{transform:scale(1.5)}100%{transform:scale(1)}}" +
    "#coinBar .cbP{position:relative;width:112px;height:20px;border-radius:999px;background:#eef1f6;overflow:hidden;box-shadow:inset 0 0 0 2px #e2e6ee}" +
    "#coinBar .cbP i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffd43b,#ffa94d);border-radius:999px;transition:width .5s}" +
    "#coinBar .cbP em{position:absolute;left:0;right:0;top:0;bottom:0;font-style:normal;font-size:12px;line-height:20px;text-align:center;color:#5b4300;white-space:nowrap}" +
    "#coinBar .cbG{font-size:14px;color:#9a6b00;padding-right:6px;white-space:nowrap}#coinBar .cbG[hidden]{display:none}" +
    "#coinBar .cbOff{font-size:11px;color:#5a6a80;padding-right:8px;white-space:nowrap}#coinBar .cbOff[hidden]{display:none}" +
    "@media (max-width:520px){#coinBar .cbP{width:84px}#coinBar .cbP em{font-size:10px}#cbQuiz{padding:7px 10px;font-size:14px}}" +
    // 문제 카드(게임 퀴즈 카드 quiz.js와 같은 모양)
    "#cqOv{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;background:rgba(24,30,58,.55);animation:cqFade .2s ease-out;-webkit-tap-highlight-color:transparent;touch-action:none;overscroll-behavior:contain;font-family:system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif}" +
    "#cqOv *{box-sizing:border-box}" +
    "#cqCard{position:relative;width:520px;max-width:100%;max-height:100%;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:#fffdf6;border-radius:24px;padding:12px 16px 16px;color:#2b3a4f;box-shadow:0 14px 40px rgba(0,0,0,.35),inset 0 0 0 4px #ffd8a8;animation:cqIn .35s cubic-bezier(.2,1.3,.4,1)}" +
    "#cqCard.gold{box-shadow:0 14px 40px rgba(0,0,0,.35),inset 0 0 0 4px #ffd43b;background:linear-gradient(180deg,#fff8dc,#fffdf6 40%)}" +
    ".cq-top{display:flex;flex-wrap:wrap;row-gap:4px;align-items:center;gap:6px;font-size:15px;color:#6a55a8;line-height:1}" +
    ".cq-tag{background:#efe8ff;border-radius:999px;padding:6px 10px;white-space:nowrap;font-weight:700}.cq-tag.s{background:#ffefd9;color:#b0560f}.cq-tag.g{background:#fff1c2;color:#8a4b00}" +
    ".cq-x{margin-left:auto;border:0;background:#eef1f6;border-radius:999px;padding:8px 12px;font:inherit;font-size:15px;color:#5a6a80;cursor:pointer;touch-action:manipulation;white-space:nowrap}" +
    ".cq-q{font-size:22px;font-weight:800;line-height:1.4;margin:10px 2px 12px;word-break:keep-all;overflow-wrap:break-word}" +
    ".cq-cs{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
    ".cq-c{position:relative;min-height:54px;margin:0;border:3px solid #dbe3f0;border-radius:16px;background:#fff;font:inherit;font-size:19px;font-weight:700;line-height:1.3;color:#24334a;padding:6px 10px 6px 36px;text-align:left;word-break:keep-all;overflow-wrap:break-word;cursor:pointer;touch-action:manipulation;box-shadow:0 3px 0 #dbe3f0}" +
    ".cq-c i{position:absolute;left:8px;top:50%;margin-top:-12px;width:24px;height:24px;border-radius:50%;background:#eef2f8;color:#6b7a90;font-style:normal;font-size:15px;line-height:24px;text-align:center}" +
    ".cq-c:active{transform:translateY(2px);box-shadow:none}.cq-c[disabled]{cursor:default}" +
    ".cq-c.ok{background:#e5f8e9;border-color:#37b24d;box-shadow:0 3px 0 #2f9e44;color:#1b6e2c}.cq-c.ok i{background:#37b24d;color:#fff}" +
    ".cq-c.no{background:#fff0f0;border-color:#ff8787;box-shadow:none;color:#c92a2a;animation:cqShake .4s}.cq-c.no i{background:#ff8787;color:#fff}" +
    ".cq-c.dim{opacity:.5}" +
    ".cq-msg{margin-top:10px;font-size:17px;font-weight:700;line-height:1.45;word-break:keep-all}.cq-msg:empty{display:none}" +
    ".cq-hint{background:#fff4cc;border-radius:14px;padding:8px 12px;color:#6e5200}" +
    ".cq-big{font-size:30px;font-weight:900;color:#e8590c;text-align:center;line-height:1.2;animation:cqPop .45s ease-out}.cq-big.no{color:#5a6a80;font-size:24px}" +
    ".cq-sub{text-align:center;color:#5a6a80;font-size:16px;margin-top:4px;font-weight:700}" +
    ".cq-bar{position:relative;height:22px;margin:10px 4px 2px;border-radius:999px;background:#eef1f6;overflow:hidden;box-shadow:inset 0 0 0 2px #e2e6ee}" +
    ".cq-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffd43b,#ffa94d);border-radius:999px;transition:width .6s}" +
    ".cq-bar em{position:absolute;left:0;right:0;top:0;bottom:0;font-style:normal;font-size:13px;font-weight:900;line-height:22px;text-align:center;color:#5b4300}" +
    ".cq-coin{margin:6px auto 2px;padding:8px 14px;border-radius:14px;background:linear-gradient(90deg,#fff1c2,#ffe3f1);color:#8a4b00;font-size:21px;font-weight:900;text-align:center;animation:cqPop .5s ease-out}" +
    ".cq-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}" +
    ".cq-go{border:0;border-radius:999px;padding:12px 22px;font:inherit;font-size:18px;font-weight:800;background:#2f8cff;color:#fff;box-shadow:0 4px 0 #1c6fd6;cursor:pointer;touch-action:manipulation;white-space:nowrap}" +
    ".cq-go.g{background:linear-gradient(135deg,#ffc94d,#ff9f1c);box-shadow:0 4px 0 #d97f00;color:#5b3000}.cq-go.n{background:#eef1f6;color:#4b5d75;box-shadow:0 4px 0 #cfd6e0}" +
    ".cq-go:active{transform:translateY(2px);box-shadow:none}.cq-go[disabled]{opacity:.45}" +
    ".cq-pick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}" +
    ".cq-pk{border:3px solid #ffd8a8;border-radius:18px;background:#fff;padding:12px 8px;font:inherit;font-size:18px;font-weight:900;color:#5b3000;cursor:pointer;touch-action:manipulation;line-height:1.3}" +
    ".cq-pk small{display:block;font-size:13px;color:#8a6a40;font-weight:700;margin-top:3px}.cq-pk.g{border-color:#ffd43b;background:#fff8dc}.cq-pk[disabled]{opacity:.45}" +
    ".cq-tip{margin-top:10px;font-size:16px;line-height:1.55;color:#4b5d75;font-weight:700;word-break:keep-all}" +
    ".cq-fx{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;border-radius:inherit}" +
    ".cq-sp{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;pointer-events:none;animation:cqSp .9s ease-out forwards}" +
    "@keyframes cqSp{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1);opacity:0}}" +
    "@keyframes cqFade{0%{opacity:0}100%{opacity:1}}@keyframes cqIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}" +
    "@keyframes cqPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}" +
    "@keyframes cqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}" +
    "@media (max-height:460px){#cqCard{padding:8px 12px 10px;border-radius:18px}.cq-q{font-size:19px;margin:6px 2px 8px}.cq-c{min-height:44px;font-size:17px}.cq-msg{font-size:15px;margin-top:6px}.cq-big{font-size:24px}.cq-go{padding:9px 18px;font-size:16px}.cq-btns{margin-top:8px}.cq-top{font-size:13px}}" +
    // 선생님 판 · 코인 주기 창
    "#coinSec .cS{font-size:13px;font-weight:800;color:#4b5d75;margin:2px 2px 6px;line-height:1.5}" +
    "#cgOv{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;background:rgba(24,30,58,.45);padding:8px;box-sizing:border-box}" +
    "#cgOv *{box-sizing:border-box}" +
    "#cgCard{width:560px;max-width:100%;max-height:100%;display:flex;flex-direction:column;background:#fff;border-radius:20px;padding:12px;box-shadow:0 14px 40px rgba(0,0,0,.3);font-family:inherit}" +
    "#cgCard .cgH{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:900;color:#5b3000}#cgCard .cgH b{flex:1}" +
    "#cgCard .cgX{border:0;width:38px;height:38px;border-radius:50%;background:#eef1f5;font-size:17px;font-weight:900;font-family:inherit;cursor:pointer}" +
    "#cgCard .cgN{font-size:12px;color:#6a7a90;font-weight:700;margin:2px 2px 6px}" +
    "#cgCard .cgL{flex:1;min-height:80px;overflow:auto;-webkit-overflow-scrolling:touch;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;align-content:start;padding:2px}" +
    "#cgCard .cgS{border:2px solid #e3e8f0;background:#f8fafc;border-radius:12px;padding:7px 8px;text-align:left;font:800 14px/1.3 inherit;font-family:inherit;color:#2b3a4f;cursor:pointer;touch-action:manipulation}" +
    "#cgCard .cgS small{display:block;font-size:12px;color:#7a6a40;font-weight:700}#cgCard .cgS.on{border-color:#ff9f1c;background:#fff4e0}" +
    "#cgCard .cgS .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ced4da;margin-right:4px;vertical-align:1px}#cgCard .cgS .dot.y{background:#40c057}" +
    "#cgCard .cgF{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}" +
    "#cgCard .cgF button{border:0;border-radius:12px;padding:10px 12px;font:900 15px/1 inherit;font-family:inherit;cursor:pointer;touch-action:manipulation;background:#eef1f6;color:#34465e}" +
    "#cgCard .cgF button.m{background:#ff9f1c;color:#fff}#cgCard .cgF button.a{background:#7048e8;color:#fff}#cgCard .cgF button[disabled]{opacity:.45}" +
    "#cgCard .cgF input{width:64px;height:40px;border:2px solid #dbe3f0;border-radius:10px;text-align:center;font:900 18px/1 inherit;font-family:inherit}" +
    "#cgCard .cgMsg{font-size:13px;font-weight:800;color:#2f9e44;min-height:18px;margin-top:6px}";
  document.head.appendChild(css);

  var bar = null, lastKey = "", lastC = -1;
  function mountBar() {
    bar = document.createElement("div");
    bar.id = "coinBar";
    bar.className = "card ui";
    bar.hidden = true;
    bar.innerHTML = '<button type="button" id="cbQuiz">📝 문제 풀기</button><span class="cbC" title="내 코인: 게임에 들어갈 때 1개씩 써요">🪙<b>0</b></span>' +
      '<span class="cbP" title="사과로 문제를 맞히면 채워져요"><i></i><em></em></span><span class="cbG" hidden title="황금 사과: 맞히면 5문제로 쳐 줘요">✨🍎<b>0</b></span><span class="cbOff" hidden>코인 없이 입장</span>';
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click"].forEach(function (t) { bar.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    bar.querySelector("#cbQuiz").addEventListener("click", function (e) { e.preventDefault(); open(); });
    document.body.appendChild(bar);
  }
  function show() {
    var g = G();
    if (!g || !g.S) return false;
    var s = document.getElementById("start"), c = document.getElementById("count");
    if (s && !s.hidden) return false;
    if (!c || !c.getClientRects().length) return false;
    if (g.S.loc === "arena" || g.S.deco || (g.Y && g.Y.hidden)) return false;
    return true;
  }
  function entryOn() { return !OFF && (!srv || srvOn); }
  function draw(force) {
    if (!bar) { if (!document.body) return; mountBar(); }
    var vis = show(), key = vis + "|" + st.c + "|" + st.p + "|" + st.g + "|" + apples() + "|" + entryOn() + "|" + isT();
    place();
    if (!force && key === lastKey) return;
    lastKey = key;
    bar.hidden = !vis;
    if (!vis) return;
    var cb = bar.querySelector(".cbC");
    cb.querySelector("b").textContent = st.c;
    if (lastC >= 0 && st.c > lastC) { cb.classList.remove("bump"); void cb.offsetWidth; cb.classList.add("bump"); }
    lastC = st.c;
    bar.querySelector(".cbP i").style.width = Math.round(100 * Math.min(1, st.p / CFG.NEED)) + "%";
    bar.querySelector(".cbP em").textContent = "코인까지 " + st.p + "/" + CFG.NEED;
    var gg = bar.querySelector(".cbG");
    gg.hidden = !(st.g > 0);
    gg.querySelector("b").textContent = st.g;
    bar.querySelector("#cbQuiz").classList.toggle("empty", apples() < 1 && st.g < 1);
    var off = bar.querySelector(".cbOff");
    off.hidden = entryOn() && !isT();
    off.textContent = isT() ? "선생님은 무료" : "오늘은 코인 없이 입장";
  }
  // 🍎 사과 수 바로 아래 줄(🎓 학년은 🍎 오른쪽 같은 줄)
  function place() {
    if (!bar) return;
    var c = document.getElementById("count");
    if (!c || !c.getClientRects().length) return;
    var r = c.getBoundingClientRect(), x = Math.round(r.left) + "px", y = Math.round(r.bottom + 6) + "px";
    if (bar.style.left !== x) bar.style.left = x;
    if (bar.style.top !== y) bar.style.top = y;
  }

  // ---------- 문제 모음 불러오기 ----------
  var me = document.currentScript, BASE = (me && me.src) || location.href;
  var bankState = window.QUIZ_BANK ? "ok" : "", bankWait = [];
  function loadBank(cb) {
    if (window.QUIZ_BANK) bankState = "ok";
    if (bankState === "ok") return cb(true);
    bankWait.push(cb);
    if (bankState === "loading") return;
    bankState = "loading";
    var s = document.createElement("script");
    var u = new URL("quiz/bank.js", BASE);
    if (/^http/.test(u.protocol)) u.searchParams.set("h", Math.floor(Date.now() / 3.6e6));
    s.src = u.href;
    var done = function (ok) { bankState = ok ? "ok" : ""; var w = bankWait; bankWait = []; w.forEach(function (f) { f(ok); }); };
    s.onload = function () { done(!!window.QUIZ_BANK); };
    s.onerror = function () { done(false); };
    (document.head || document.documentElement).appendChild(s);
  }
  function pick(g) {
    var list = (window.QUIZ_BANK || {})[g] || [];
    if (!list.length) return null;
    var seen = jget("plaza.quizSeen", {}); // 게임 속 퀴즈와 같은 기록: 최근에 낸 문제는 다시 안 냄
    if (!seen || typeof seen !== "object") seen = {};
    var recent = Array.isArray(seen[g]) ? seen[g] : [];
    var keep = Math.min(60, Math.floor(list.length * 0.7));
    recent = recent.slice(-keep);
    var pool = [];
    for (var k = 0; k < list.length; k++) if (recent.indexOf(k) < 0) pool.push(k);
    if (!pool.length) { pool = list.map(function (_, k2) { return k2; }); recent = []; }
    var i = pool[Math.floor(Math.random() * pool.length)];
    recent.push(i);
    seen[g] = recent.slice(-60);
    jput("plaza.quizSeen", seen);
    var it = list[i], ch = it.c.map(function (t, j) { return { t: t, ok: j === 0 }; });
    for (var a = ch.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)), tmp = ch[a]; ch[a] = ch[b]; ch[b] = tmp; }
    return { g: g, i: i, s: it.s, q: it.q, hint: it.hint || "", ch: ch };
  }

  // ---------- 문제 카드 ----------
  var ov = null, card = null, cur = null, busy = false;
  function sound(n) { try { var h = G() && G().ht; if (h && h[n]) n === "beep" ? h.beep(false) : h[n](); } catch (e) {} }
  function keyGuard(e) { if (ov) { e.stopPropagation(); if (e.key === "Escape" && cur && cur.done) close(); } }
  function guard(el) {
    ["pointerdown", "pointerup", "pointermove", "touchstart", "touchend", "touchmove", "mousedown", "mouseup", "mousemove", "click", "wheel", "contextmenu"].forEach(function (t) {
      el.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
  }
  function frame(gold) {
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "cqOv";
      guard(ov);
      card = document.createElement("div");
      card.id = "cqCard";
      ov.appendChild(card);
      document.body.appendChild(ov);
      window.addEventListener("keydown", keyGuard, true);
      window.addEventListener("keyup", keyGuard, true);
      try { window.dispatchEvent(new Event("blur")); } catch (e) {} // 누르고 있던 방향키를 놓아요
    }
    card.className = gold ? "gold" : "";
    return card;
  }
  function close() {
    if (!ov) return;
    window.removeEventListener("keydown", keyGuard, true);
    window.removeEventListener("keyup", keyGuard, true);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
    ov = card = null;
    cur = null;
    busy = false;
    draw(true);
  }
  function barHtml(p) {
    return '<div class="cq-bar"><i style="width:' + Math.round(100 * Math.min(1, p / CFG.NEED)) + '%"></i><em>🪙 코인까지 ' + p + " / " + CFG.NEED + "</em></div>";
  }
  function topHtml(extra, noX) {
    return '<div class="cq-top"><span class="cq-tag">🍎 ' + apples() + '</span><span class="cq-tag g">🪙 ' + st.c + "</span>" + (st.g ? '<span class="cq-tag g">✨🍎 ' + st.g + "</span>" : "") + (extra || "") + (noX ? '<span class="cq-tag" style="margin-left:auto;background:#fff;color:#8a96a8">' + noX + "</span>" : '<button type="button" class="cq-x" data-a="x">✕ 닫기</button>') + "</div>";
  }
  // 사과가 없을 때 · 고르기 · 문제
  function open(want) {
    if (busy) return;
    if (ov && cur && !cur.done) return; // 문제를 푸는 중이면 그대로
    sound("click");
    var a = apples(), gd = st.g;
    if (!want && a < 1 && gd < 1) return noApple();
    if (!want && gd >= 1) return choose();
    start(want === "gold" || (a < 1 && gd >= 1));
  }
  function noApple() {
    var c = frame(false);
    cur = { done: true };
    c.innerHTML = topHtml() +
      '<div class="cq-big no" style="margin-top:14px">🍎 사과가 없어요</div>' +
      '<div class="cq-tip">사과나무 앞에서 <b>「🌳 흔들기」</b>를 눌러 사과를 모아요.<br>빨간 사과가 열린 나무를 찾아봐요. 사과는 조금씩 다시 열려요.<br>사과 1개로 문제 1개 · <b>20문제를 맞히면 🪙 1코인</b> · 코인으로 게임에 들어가요!</div>' +
      '<div class="cq-btns"><button type="button" class="cq-go" data-a="x">알겠어요</button></div>';
    wire();
  }
  function choose() {
    var c = frame(false), a = apples();
    cur = { done: true };
    c.innerHTML = topHtml() +
      '<div class="cq-q" style="text-align:center">어떤 사과로 풀까요?</div>' +
      '<div class="cq-pick"><button type="button" class="cq-pk" data-a="n"' + (a < 1 ? " disabled" : "") + '>🍎 사과 문제<small>맞히면 +1 · 사과 ' + a + '개</small></button>' +
      '<button type="button" class="cq-pk g" data-a="g">✨ 황금 사과 문제<small>맞히면 +' + CFG.GOLD_STEP + " · 황금 사과 " + st.g + "개</small></button></div>" + barHtml(st.p);
    wire();
  }
  function start(gold) {
    busy = true;
    loadBank(function (ok) {
      busy = false;
      if (!ok) {
        var c0 = frame(false);
        cur = { done: true };
        c0.innerHTML = topHtml() + '<div class="cq-big no" style="margin-top:14px">문제를 못 불러왔어요</div><div class="cq-sub">인터넷을 확인하고 다시 눌러 주세요. (사과는 그대로예요)</div><div class="cq-btns"><button type="button" class="cq-go" data-a="x">닫기</button></div>';
        return wire();
      }
      if (gold ? st.g < 1 : apples() < 1) return gold ? open() : noApple();
      var q = pick(grade());
      if (!q) return close();
      // 사과를 먼저 써요(문제를 보고 닫아도 사과는 쓴 것)
      if (!gold) setApples(apples() - 1);
      cur = { q: q, gold: gold, done: false, t0: Date.now() };
      var c = frame(gold);
      var h = topHtml('<span class="cq-tag s">📚 ' + esc(q.s) + " · " + q.g + "학년</span>" + (gold ? '<span class="cq-tag g">✨ 황금 사과 문제 · 맞히면 +' + CFG.GOLD_STEP + "</span>" : ""), gold ? "✨🍎 1개를 썼어요" : "🍎 1개를 썼어요"); // 문제를 푸는 동안은 닫기 없음(답을 골라야 끝)
      h += '<div class="cq-q">' + esc(q.q) + '</div><div class="cq-cs">';
      q.ch.forEach(function (o, i) { h += '<button type="button" class="cq-c" data-i="' + i + '"><i>' + (i + 1) + "</i>" + esc(o.t) + "</button>"; });
      h += '</div><div class="cq-msg"></div><div class="cq-fx"></div>';
      c.innerHTML = h;
      wire();
    });
  }
  function answer(i) {
    if (!cur || cur.done || !cur.q) return;
    if (Date.now() - cur.t0 < 350) return; // 📝를 두 번 톡톡 누른 것이 답이 되지 않게
    var q = cur.q, o = q.ch[i];
    if (!o) return;
    cur.done = true;
    var ok = !!o.ok, gold = cur.gold, okIdx = 0;
    q.ch.forEach(function (x, j) { if (x.ok) okIdx = j; });
    card.querySelectorAll(".cq-c").forEach(function (b, j) {
      b.disabled = true;
      if (j === okIdx) b.classList.add("ok");
      else if (j === i) b.classList.add("no");
      else b.classList.add("dim");
    });
    var p0 = st.p, c0 = st.c;
    op({ k: "q", ok: ok, gold: gold }, null);
    var got = st.c - c0;
    try { var tp = card.querySelector(".cq-top"); if (tp) tp.outerHTML = topHtml('<span class="cq-tag s">📚 ' + esc(q.s) + " · " + q.g + "학년</span>"); } catch (e) {} // 위 칸 숫자를 새로(🪙·✨🍎) + 이제 닫기
    if (gold) { try { if (G() && G().fns && G().fns.Kt) G().fns.Kt(G().Y, ok ? "✨ +" + CFG.GOLD_STEP : "✨", 1.4); } catch (e) {} }
    var msg = card.querySelector(".cq-msg"), h = "";
    if (ok) {
      h += '<div class="cq-big">정답! ' + (gold ? "✨ +" + CFG.GOLD_STEP : "+1") + "</div>";
      sound(got ? "fanfare" : "ding");
      sparkle(okIdx, gold ? 22 : 12);
    } else {
      h += '<div class="cq-big no">아쉬워요! 정답은 「' + esc(q.ch[okIdx].t) + "」</div>";
      if (q.hint) h += '<div class="cq-hint" style="margin-top:6px">💡 ' + esc(q.hint) + "</div>";
      sound("beep");
    }
    if (got) {
      h += '<div class="cq-coin">🎉 🪙 코인 ' + got + "개를 받았어요! 이제 게임에 들어갈 수 있어요</div>";
      try { var GG = G(); if (GG && GG.fns) { GG.fns.Kt(GG.Y, "🪙 +" + got, 2.2); if (GG.fns.fs) GG.fns.fs(GG.Y.x, 1.6, GG.Y.z, 26, 16766011, 2.6); } if (NET.emo) NET.emo("🪙"); } catch (e) {}
    }
    h += barHtml(got ? st.p : Math.max(p0, st.p));
    var a = apples();
    h += '<div class="cq-btns">';
    if (st.g >= 1) h += '<button type="button" class="cq-go g" data-a="g">✨ 황금 사과 문제</button>';
    h += '<button type="button" class="cq-go" data-a="n"' + (a < 1 ? " disabled" : "") + ">🍎 한 문제 더 (" + a + ")</button>";
    h += '<button type="button" class="cq-go n" data-a="x">닫기</button></div>';
    msg.innerHTML = h;
    // 진행 막대가 차오르는 움직임(코인을 받았으면 꽉 찼다가 남은 수로)
    var bi = msg.querySelector(".cq-bar i");
    if (bi && got) { bi.style.width = "100%"; setTimeout(function () { if (bi) { bi.style.transition = "none"; bi.style.width = "0%"; void bi.offsetWidth; bi.style.transition = ""; bi.style.width = Math.round(100 * st.p / CFG.NEED) + "%"; } }, 700); }
    wire();
    try { card.scrollTop = card.scrollHeight; } catch (e) {}
  }
  function sparkle(idx, n) {
    var fx = card && card.querySelector(".cq-fx"), b = card && card.querySelectorAll(".cq-c")[idx];
    if (!fx || !b) return;
    var cr = card.getBoundingClientRect(), r = b.getBoundingClientRect(), x = r.left - cr.left + r.width / 2, y = r.top - cr.top + r.height / 2 + card.scrollTop;
    var cols = ["#ffd43b", "#ff8787", "#74c0fc", "#69db7c", "#da77f2", "#ffa94d"];
    for (var k = 0; k < n; k++) {
      var s = document.createElement("i");
      s.className = "cq-sp";
      var an = Math.random() * 6.283, d = 40 + Math.random() * 70;
      s.style.cssText = "left:" + x + "px;top:" + y + "px;background:" + cols[k % cols.length] + ";--x:" + Math.cos(an) * d + "px;--y:" + Math.sin(an) * d + "px";
      fx.appendChild(s);
    }
    setTimeout(function () { if (fx) fx.innerHTML = ""; }, 1000);
  }
  function wire() {
    if (!card) return;
    card.onclick = function (e) {
      var b = e.target.closest && e.target.closest("button");
      if (!b || b.disabled) return;
      if (b.hasAttribute("data-i")) return answer(+b.getAttribute("data-i"));
      var a = b.getAttribute("data-a");
      if (a === "x") {
        if (cur && !cur.done && cur.q) { // 풀다가 닫음: 쓴 사과는 그대로, 못 맞힌 것으로(황금 사과도 씀)
          cur.done = true;
          op({ k: "q", ok: false, gold: cur.gold }, null);
        }
        sound("click");
        return close();
      }
      if (a === "n") { cur = null; return start(false); }
      if (a === "g") { cur = null; return start(true); }
    };
  }

  // ---------- 황금 사과(plaza_home.js가 주울 때 부름) ----------
  function addGold() { op({ k: "gold" }, null); }

  // ---------- 게임 들어가기(games.js) ----------
  function passOk(T) { var p = jget("plaza.coinPass", null); return !!(p && T && T.wid && p.wid === T.wid && p.until > Date.now() && p.who === who()); }
  // 들어갈까요? 창에 쓸 것: {free, why, have}
  function entry(T) {
    if (isT()) return { free: true, why: "teacher" };
    if (!entryOn()) return { free: true, why: "off" };
    if (passOk(T)) return { free: true, why: "pass" };
    return { free: false, have: st.c };
  }
  function note(T) {
    var e = entry(T);
    if (e.why === "teacher") return "<div style='margin-top:6px;font-size:13px;color:#7048e8;font-weight:800'>🧑‍🏫 선생님은 코인 없이 들어가요</div>";
    if (e.why === "off") return "<div style='margin-top:6px;font-size:13px;color:#2f9e44;font-weight:800'>🎉 오늘은 코인 없이 들어가요</div>";
    if (e.why === "pass") return "<div style='margin-top:6px;font-size:13px;color:#2f9e44;font-weight:800'>🪙 방금 낸 코인으로 다시 들어가요</div>";
    if (e.have >= 1) return "<div style='margin-top:6px;font-size:14px;color:#8a4b00;font-weight:900'>🪙 1개를 내고 들어가요 (내 코인 " + e.have + "개)</div>";
    return "<div style='margin-top:8px;padding:8px 10px;border-radius:12px;background:#fff4e0;font-size:14px;color:#8a4b00;font-weight:900;line-height:1.5'>🪙 코인이 없어요!<br>사과로 문제를 " + CFG.NEED + "개 맞히면 1코인 (지금 " + st.p + "/" + CFG.NEED + ")</div>";
  }
  function label(T) {
    var e = entry(T);
    return e.free ? "🚪 들어가기" : e.have >= 1 ? "🪙1 내고 들어가기" : "📝 문제 풀러 가기";
  }
  // 코인 내기: cb(true) = 들어가요 · cb(false) = 못 들어감(코인 없음 → 문제 카드)
  function pay(T, cb) {
    var e = entry(T);
    if (e.free) return cb(true);
    if (!(st.c >= 1)) { cb(false); setTimeout(function () { open(); }, 150); return; }
    var done = false;
    var fin = function (ok) {
      if (done) return;
      done = true;
      if (ok) jput("plaza.coinPass", { wid: T.wid || "", until: Date.now() + CFG.PASS_MIN * 60000, who: who() });
      if (!ok) setTimeout(function () { refuse(); }, 150);
      cb(ok);
    };
    var cache = st.c;
    op({ k: "pay", w: T.wid || "" }, function (r) { fin(!!r.ok); });
    if (srv) setTimeout(function () { fin(cache >= 1); }, CFG.PAY_WAIT); // 서버 답이 늦으면 이 기기 숫자로(편지는 다시 연결되면 서버가 셈)
  }
  function refuse() {
    var c = frame(false);
    cur = { done: true };
    c.innerHTML = topHtml() + '<div class="cq-big no" style="margin-top:14px">🪙 코인이 없어요</div><div class="cq-tip">사과로 문제를 ' + CFG.NEED + "개 맞히면 1코인이에요. 지금 " + st.p + "/" + CFG.NEED + '</div><div class="cq-btns"><button type="button" class="cq-go" data-a="n"' + (apples() < 1 ? " disabled" : "") + '>📝 문제 풀기</button><button type="button" class="cq-go n" data-a="x">닫기</button></div>';
    wire();
  }

  // ---------- 선생님 판: 코인 입장 켜기·끄기 · 코인 주기 ----------
  var tPanel = null, tList = null, gv = null, gvSel = {}, gvMsg = "";
  function tMount() {
    var panel = document.getElementById("panel");
    if (!panel || tPanel) return;
    tPanel = document.createElement("div");
    tPanel.id = "coinSec";
    tPanel.innerHTML = '<h3>🪙 사과 코인</h3><div class="cS"></div><div class="pg"><button class="pb" type="button" id="csOn"></button><button class="pb" type="button" id="csGive">🪙 코인 주기<small>학생 고르고 숫자</small></button></div>';
    var ws = document.getElementById("worldSec"), gs = document.getElementById("gradeSec"), after = ws || gs;
    if (after && after.nextSibling) panel.insertBefore(tPanel, after.nextSibling);
    else panel.insertBefore(tPanel, panel.firstChild);
    tPanel.querySelector("#csOn").onclick = function () {
      if (!srv) return alert("코인 입장 켜기·끄기는 서버 반(반 코드로 들어온 광장)에서 돼요.\n서버가 없는 주소에서는 광장 주소 끝에 ?coin=0 을 붙이면 그 기기만 코인 없이 들어가요.");
      try { NET.cloud.send({ t: "con", on: !srvOn }); } catch (e) {}
    };
    tPanel.querySelector("#csGive").onclick = function () { giveOpen(); };
    tDraw();
    setInterval(function () { if (tPanel) tDraw(); }, 2500);
  }
  function tDraw() {
    if (!tPanel) return;
    var t = isT();
    tPanel.hidden = !t;
    if (!t) return;
    var sEl = tPanel.querySelector(".cS"), on = tPanel.querySelector("#csOn");
    if (srv) {
      sEl.innerHTML = "사과 1개 = 문제 1개 · " + CFG.NEED + "문제 맞히면 🪙1 · 게임 입장 🪙1<br>코인 입장: <b>" + (srvOn ? "켜짐 (코인을 내고 들어가요)" : "꺼짐 (자유 놀이: 코인 없이)") + "</b>";
      on.innerHTML = srvOn ? "🔓 코인 입장 끄기<small>자유 놀이 날</small>" : "🪙 코인 입장 켜기<small>공부하고 들어가기</small>";
    } else {
      sEl.innerHTML = "사과 1개 = 문제 1개 · " + CFG.NEED + "문제 맞히면 🪙1 · 게임 입장 🪙1<br><span style='color:#c2410c'>지금은 서버가 없는 광장이라 코인은 기기마다 따로 저장돼요. 코인 주기·켜기·끄기는 서버 반에서만 돼요.</span>";
      on.innerHTML = "🪙 코인 입장 " + (OFF ? "꺼짐" : "켜짐") + "<small>이 기기: 주소 ?coin=0 이면 끔</small>";
    }
  }
  function giveOpen() {
    if (!srv) return alert("코인 주기는 서버 반(반 코드로 들어온 광장)에서만 학생 기기로 가요.\n지금은 서버가 없는 광장이에요.");
    if (gv) return;
    gv = document.createElement("div");
    gv.id = "cgOv";
    gv.innerHTML = '<div id="cgCard"><div class="cgH"><b>🪙 코인 주기</b><button type="button" class="cgX" data-a="x">✕</button></div>' +
      '<div class="cgN">학생을 눌러 고르고(여러 명 가능) 숫자를 정해 「주기」. 빼기(−)도 돼요(0 아래로는 안 내려가요). 초록 점 = 지금 들어와 있음</div><div class="cgL"></div>' +
      '<div class="cgF"><button type="button" data-a="dn">−</button><input type="number" id="cgNum" value="1" min="-99" max="99" step="1" inputmode="numeric"><button type="button" data-a="up">+</button>' +
      '<button type="button" class="m" data-a="give">고른 학생에게 주기</button><button type="button" class="a" data-a="all">모두에게</button><button type="button" data-a="none">고르기 지우기</button></div><div class="cgMsg"></div></div>';
    guard(gv);
    gv.addEventListener("keydown", function (e) { e.stopPropagation(); }, true);
    gv.addEventListener("click", function (e) {
      if (e.target === gv) return giveClose();
      var b = e.target.closest && e.target.closest("button");
      if (!b || b.disabled) return;
      var a = b.getAttribute("data-a"), inp = gv.querySelector("#cgNum"), n = parseInt(inp.value, 10) || 0;
      if (b.hasAttribute("data-n")) { var nm = b.getAttribute("data-n"); if (gvSel[nm]) delete gvSel[nm]; else gvSel[nm] = 1; return gvDraw(); }
      if (a === "x") return giveClose();
      if (a === "dn" || a === "up") { n = Math.max(-99, Math.min(99, n + (a === "up" ? 1 : -1))); if (!n) n = a === "up" ? 1 : -1; inp.value = n; return gvDraw(); }
      if (a === "none") { gvSel = {}; return gvDraw(); }
      if (!n) { gvMsg = "숫자를 정해 주세요"; return gvDraw(); }
      n = Math.max(-99, Math.min(99, n));
      if (a === "give") {
        var names = Object.keys(gvSel);
        if (!names.length) { gvMsg = "먼저 학생을 골라 주세요"; return gvDraw(); }
        NET.cloud.send({ t: "cgive", names: names, n: n });
        gvMsg = names.length + "명에게 🪙" + (n > 0 ? "+" : "") + n + " 보냈어요";
      } else if (a === "all") {
        if (!confirm("우리 반 모두에게 🪙" + (n > 0 ? "+" : "") + n + "개를 줄까요?")) return;
        NET.cloud.send({ t: "cgive", all: true, n: n });
        gvMsg = "모두에게 🪙" + (n > 0 ? "+" : "") + n + " 보냈어요";
      }
      gvDraw();
    });
    gv.querySelector("#cgNum").addEventListener("input", function () { gvDraw(); });
    document.body.appendChild(gv);
    gvMsg = "";
    gvSel = {}; // 열 때마다 새로 고름(지난번 고른 학생에게 또 주지 않게)
    gvDraw();
    try { NET.cloud.send({ t: "clist" }); } catch (e) {}
  }
  function giveClose() { if (gv && gv.parentNode) gv.parentNode.removeChild(gv); gv = null; }
  function gvDraw() {
    if (!gv) return;
    var L = gv.querySelector(".cgL"), list = tList && tList.list ? tList.list : null;
    if (!list) L.innerHTML = '<div style="grid-column:1/-1;font-weight:800;color:#6a7a90;padding:8px">학생 목록을 불러오는 중…</div>';
    else if (!list.length) L.innerHTML = '<div style="grid-column:1/-1;font-weight:800;color:#6a7a90;padding:8px">아직 들어온 학생이 없어요</div>';
    else {
      var h = "";
      list.forEach(function (s) {
        h += '<button type="button" class="cgS' + (gvSel[s.name] ? " on" : "") + '" data-n="' + esc(s.name) + '"><span class="dot' + (s.on ? " y" : "") + '"></span>' + esc(s.name) + "<small>🪙 " + s.c + " · " + s.p + "/" + (tList.need || CFG.NEED) + (s.g ? " · ✨🍎" + s.g : "") + "</small></button>";
      });
      L.innerHTML = h;
    }
    var n = parseInt(gv.querySelector("#cgNum").value, 10) || 0, k = Object.keys(gvSel).length;
    var gb = gv.querySelector('[data-a="give"]');
    gb.textContent = (k ? "고른 " + k + "명에게 " : "고른 학생에게 ") + "🪙" + (n > 0 ? "+" : "") + n;
    gb.disabled = !k || !n;
    gv.querySelector('[data-a="all"]').textContent = "모두에게 🪙" + (n > 0 ? "+" : "") + n;
    gv.querySelector(".cgMsg").textContent = gvMsg;
  }

  // ---------- 매 0.25초: 그리기 · 사과 저장 · 선물 알림 ----------
  function tick() {
    if (!G()) return;
    loadLocalApples();
    saveLocalApples();
    draw(false);
    if (!tPanel && document.getElementById("panel")) tMount();
    if (gift && show() && !ov) {
      var n = gift, g = G();
      gift = 0;
      try {
        g.fns.Ln("🪙 선생님 선물", n > 0 ? "선생님이 🪙" + n + "개를 주셨어요!" : "선생님이 코인을 " + -n + "개 가져가셨어요", null, 4);
        if (n > 0) { sound("fanfare"); g.fns.Kt(g.Y, "🪙 +" + n, 2.4); if (g.fns.fs) g.fns.fs(g.Y.x, 1.6, g.Y.z, 26, 16766011, 2.6); }
      } catch (e) { gift = n; }
    }
    // 사과가 생기면 문제 모음을 미리 받아 둠(처음 누를 때 기다리지 않게)
    if (!bankState && (apples() > 0 || st.g > 0)) loadBank(function () {});
  }
  setInterval(tick, 250);

  window.PLAZA_COIN = {
    cfg: CFG,
    onCloud: onCloud,
    addGold: addGold,
    entry: entry,
    note: note,
    label: label,
    pay: pay,
    open: open,
    close: close,
    // 시험용
    state: function () { return { c: st.c, p: st.p, g: st.g, apples: apples(), srv: srv, on: entryOn(), pending: box.ops.length, open: !!ov, q: cur && cur.q ? { s: cur.q.s, g: cur.q.g, gold: cur.gold } : null, done: !!(cur && cur.done) }; },
    answer: answer,
    correctIndex: function () { if (!cur || !cur.q) return -1; for (var i = 0; i < cur.q.ch.length; i++) if (cur.q.ch[i].ok) return i; return -1; },
    setLocal: function (s) { local = clean(s); jput("plaza.coin", local); recompute(); draw(true); }, // 서버 없는 시험판에서만 씀
    giveOpen: giveOpen,
    list: function () { return tList; },
  };
})();
