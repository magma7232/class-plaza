/* 월드 잠금 (2026-11-25 선생님: "월드를 교사가 하나씩 열 수 있도록. 잠금을 해 놓으면 순서대로 들어가지잖아. 다 깨면 다음 맵 열어 줘도 되고")
 * - 기본은 모두 열림(지금까지와 같음).
 * - 선생님 판(👩‍🏫 선생님 → 🗺️ 월드 열기): 「🔒 하나씩 열기」를 고르면 월드마다 열기/잠그기 단추. 「➡️ 순서대로」를 켜면
 *   지금 열린 월드를 정한 수만큼(1·3·5·10명·절반·모두) 끝까지 깨면 다음 월드가 저절로 열려요(차례 = 이야기 순서, games.js ORDER).
 * - 학생 화면: 잠긴 문에는 사슬·자물쇠, 다가가면 "선생님이 아직 열지 않았어요". 열리면 자물쇠가 톡 풀리며 반짝.
 * - 바꿀 수 있는 사람: 광장 서버(workers.dev)에 선생님으로 들어온 기기, 또는 주소 끝 ?teacher(서버 없는 공개 주소·파일).
 * - 서버가 있으면: 선생님이 바꾸면 서버가 기억하고 반 학생 모두에게 알려요(학년과 같은 방식, 편지 'worlds').
 *   깬 학생 수도 서버가 세요(게임 back.js가 '끝까지 깼다'를 알려 줌).
 * - 서버가 없으면(공개 주소 github.io·파일): 이 기기에만 저장. 학생 기기는 주소로 정해요: ?open=castle,island (?open=all = 모두 열림),
 *   &seq=1 이면 그 기기에서 연 월드를 깨면 다음 월드가 열려요. 선생님 판의 「학생 주소 복사」가 이 주소를 만들어 줘요.
 * Claude 없이도 그대로 돌아가요. 저장 이름: plaza.worlds(이 기기 설정)
 */
(function () {
  "use strict";
  var KEY = "plaza.worlds";
  function qget(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function online() { return !!(window.NET && NET.online); }
  // NET.online은 hi를 다 받은 뒤에 켜져서, hi 안에서 부를 때도 맞게 역할(role)로 봄(검토 2)
  function canEdit() {
    var t = false;
    try { t = new URLSearchParams(location.search).has("teacher"); } catch (e) {}
    return t || !!(window.NET && NET.role === "teacher");
  }
  function cleared() { try { return JSON.parse(localStorage.getItem("plaza.cleared") || "{}"); } catch (e) { return {}; } }

  // 상태: lock(false = 모두 열림) · open(잠금 때 열린 월드) · seq(순서대로) · need(몇 명이 깨면, -1 절반 · -2 모두) · clr(월드 → 깬 학생 수, 서버만) · n(접속 학생 수)
  var st = { lock: false, open: [], seq: false, need: 3, clr: {}, n: 0 };
  var fromServer = false;
  (function init() {
    var o = qget("open"), saved = load();
    if (saved && typeof saved === "object") st = Object.assign(st, saved);
    if (o != null) { // 주소가 먼저(학생 QR·주소): 기기에 기억
      if (o === "all") { st.lock = false; st.open = []; }
      else if (o === "none" || o === "") { st.lock = true; st.open = []; } // 모두 잠김(빈 목록이 '모두 열림'으로 바뀌지 않게, 검토)
      else { st.lock = true; st.open = o.split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
      var sq = qget("seq");
      st.seq = sq === "1";
      save({ lock: st.lock, open: st.open, seq: st.seq, need: st.need });
    }
  })();

  function worlds() { return (window.PLAZA_GAMES && PLAZA_GAMES.worlds && PLAZA_GAMES.worlds()) || []; }
  function order() { return worlds().map(function (w) { return w.wid; }); }
  // 열린 월드(서버가 없을 때 순서대로 모드: 이 기기에서 깬 월드의 다음 차례도 열림)
  function openSet() {
    var set = {};
    st.open.forEach(function (k) { set[k] = 1; });
    if (st.lock && st.seq && !fromServer && !canEdit()) { // 선생님 기기는 자기 기기에서 깬 게임으로 열지 않음(학생 주소와 같게, 검토)
      var c = cleared(), od = order();
      for (var i = 0; i < od.length - 1; i++) if (set[od[i]] && c[od[i]]) set[od[i + 1]] = 1;
    }
    return set;
  }
  function isOpen(wid) {
    if (!wid || !st.lock) return true;
    return !!openSet()[wid];
  }

  // ---------------- 바꾸기 ----------------
  function apply(nw, why, opened, silent) {
    var before = {}, wl = worlds();
    wl.forEach(function (w) { before[w.wid] = isOpen(w.wid); });
    st = Object.assign(st, nw);
    if (why !== "server") save({ lock: st.lock, open: st.open, seq: st.seq, need: st.need });
    // 새로 열린 문: 자물쇠가 풀리며 반짝
    var newly = [];
    wl.forEach(function (w) { if (!before[w.wid] && isOpen(w.wid)) newly.push(w); });
    if (ready && !silent && newly.length) newly.forEach(function (w, i) { setTimeout(function () { unlockFx(w, true); }, i * 350); });
    if (ready) remember();
    drawPanel();
  }
  // 서버에는 바뀐 것만 보냄(월드 하나 열기·잠그기는 op): 서버가 순서대로 모드로 막 연 월드를 선생님 기기의 옛 목록이 다시 잠그지 않게(검토)
  function send(msg) {
    if (window.NET && NET.online && NET.role === "teacher" && NET.cloud) {
      msg = msg || { lock: st.lock, open: st.open, seq: st.seq, need: st.need };
      msg.t = "worlds";
      msg.order = order();
      try { NET.cloud.send(msg); } catch (e) {}
    }
  }
  function setLocal(nw, msg) {
    if (!canEdit()) return;
    apply(nw, "ui");
    send(msg || nw);
  }
  // 서버 편지(net.js): hi.worlds · worlds
  function onServer(w, isHi) {
    if (!w || typeof w !== "object") return;
    fromServer = true;
    // 선생님 기기가 처음 들어왔는데 반에 아직 순서가 없으면 이 광장의 차례를 알려 줌(순서대로 모드가 서버에서 돌게)
    if (isHi && window.NET && NET.role === "teacher" && (!w.order || !w.order.length)) setTimeout(function () { send({}); }, 600);
    apply({ lock: !!w.lock, open: w.open || [], seq: !!w.seq, need: w.need != null ? w.need : 3, clr: w.clr || {}, n: w.n || 0 }, "server", w.opened, isHi);
  }

  // ---------------- 잠긴 문 그림(사슬·자물쇠) ----------------
  var ready = false, locks = {}, toastEl = null;
  var tries = {};
  function lockFor(w) {
    if (locks[w.wid]) return locks[w.wid];
    var tn = performance.now();
    if (tries[w.wid] && tn - tries[w.wid] < 1000) return null; // 아직 준비 전이면 1초 뒤 다시(검토 2: 횟수 제한 없이)
    tries[w.wid] = tn;
    var h = window.PLAZA_GAMES && PLAZA_GAMES.hostOf && PLAZA_GAMES.hostOf(w.T);
    if (!h || !window.PLAZA_MKLOCK) return null;
    try { locks[w.wid] = { m: PLAZA_MKLOCK(h.m, h.cx, h.cy, h.w, h.h, h.sq), k: 1, gone: 0, h: h }; } catch (e) {}
    return locks[w.wid] || null;
  }
  // 이 기기가 마지막으로 본 '열린 월드'(광장에 다시 왔을 때 그사이 열린 문을 반짝여 알려 주려고 — 게임을 깨고 돌아왔을 때 등)
  function remember() {
    var o = [];
    worlds().forEach(function (w) { if (isOpen(w.wid)) o.push(w.wid); });
    try { localStorage.setItem("plaza.worldsSeen", JSON.stringify({ lock: st.lock, o: o })); } catch (e) {}
  }
  function firstLook() {
    var seen = null;
    try { seen = JSON.parse(localStorage.getItem("plaza.worldsSeen") || "null"); } catch (e) {}
    if (seen && seen.lock && st.lock) {
      var wl = worlds(), k = 0;
      wl.forEach(function (w) { if (isOpen(w.wid) && seen.o.indexOf(w.wid) < 0) { var ww = w; setTimeout(function () { unlockFx(ww, true); }, 1500 + 350 * k++); } });
    }
    remember();
  }
  function tick(dt) {
    var wl = worlds();
    if (!wl.length || !window.PLAZA_MKLOCK || !(window.NET && NET.G)) return;
    if (!ready) { ready = true; firstLook(); }
    for (var i = 0; i < wl.length; i++) {
      var w = wl[i], open = isOpen(w.wid), L = locks[w.wid];
      if (!open && !L) L = lockFor(w);
      if (!L) continue;
      if (open) {
        if (L.gone < 1) {
          // 풀리는 중: 살짝 커졌다가 위로 떠오르며 사라짐
          L.gone = Math.min(1, L.gone + dt / 0.9);
          var g = L.gone, s = 1 + 0.25 * Math.sin(Math.min(1, g * 2) * Math.PI);
          L.m.scale.set(s, s, s);
          L.m.material.opacity = 1 - Math.max(0, (g - 0.35) / 0.65);
          if (g >= 1) L.m.visible = false;
        }
      } else {
        L.gone = 0;
        // 멀리 있는 문의 사슬은 안 그림(낡은 패드: 잠긴 문 하나 = 그리기 1번, 안개 너머라 어차피 안 보임)
        var Y = NET.G.Y, e = L.m.matrixWorld.elements;
        L.m.visible = NET.G.S.loc === "village" && Math.hypot(Y.x - e[12], Y.z - e[14]) < 48;
        L.m.material.opacity = 1;
        var t = performance.now() / 1000, sw = 1 + 0.02 * Math.sin(t * 2.4 + i);
        L.m.scale.set(sw, sw, sw);
      }
    }
  }
  function toast(html) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "worldToast";
      toastEl.className = "card ui";
      toastEl.style.cssText = "position:fixed;left:50%;top:calc(110px + env(safe-area-inset-top));transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:999px;font-size:18px;font-weight:900;color:#e8590c;max-width:calc(100vw - 24px);text-align:center;pointer-events:none;transition:opacity .5s";
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = "0"; }, 4200);
  }
  function unlockFx(w, loud) {
    var L = locks[w.wid];
    if (L) L.gone = 0.001;
    try {
      var G = NET.G, p = L && L.h ? L.h : window.PLAZA_GAMES && PLAZA_GAMES.hostOf ? PLAZA_GAMES.hostOf(w.T) : null;
      if (p && G.fns && G.fns.fs) {
        var e = p.m.matrixWorld.elements, x = e[0] * p.cx + e[4] * p.cy + e[12], y = e[1] * p.cx + e[5] * p.cy + e[13], z = e[2] * p.cx + e[6] * p.cy + e[14];
        G.fns.fs(x, y, z, 22, w.color || 16766011, 2.6);
        setTimeout(function () { try { G.fns.fs(x, y + 0.4, z, 14, 16777215, 2); } catch (er) {} }, 260);
      }
      if (loud && G.ht) { G.ht.star(true); }
    } catch (er) {}
    if (loud) toast("✨ 새 월드가 열렸어요! " + w.emoji + " " + w.name);
  }

  // 문 앞에서: 잠겨 있으면 알려 주는 창(밝게, 무섭지 않게). 다음 차례 안내도
  function lockedCard(G, w, onClose) {
    var hint = "";
    if (st.seq) {
      var od = order(), i = od.indexOf(w.wid), prev = i > 0 ? worlds()[i - 1] : null;
      if (prev && isOpen(prev.wid)) hint = "<div style='margin-top:6px'>친구들이 <b>" + prev.emoji + " " + prev.name + "</b>을(를) 깨면 저절로 열려요! 🙌</div>";
    }
    G.fns.sa("🔒 " + w.emoji + " " + w.name, "아직 잠겨 있어요", "<div>선생님이 아직 열지 않았어요. 조금만 기다려 줘요! 😊<br>열린 다른 월드에서 먼저 놀아 볼까요?</div>" + hint, [
      { label: "알겠어요", main: true, fn: function () { G.fns.$i(); onClose && onClose(); } },
    ]);
  }

  // ---------------- 선생님 판 ----------------
  var sec = null;
  var css = document.createElement("style");
  css.textContent =
    "#worldSec .wRow{display:flex;align-items:center;gap:6px;margin:3px 0;font-size:14px;font-weight:800;color:#34465e}" +
    "#worldSec .wRow .wN{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    "#worldSec .wRow .wC{font-size:12px;color:#6b7c92;font-weight:700;white-space:nowrap}" +
    "#worldSec .wB{border:0;border-radius:12px;min-height:38px;padding:4px 11px;font-size:14px;font-weight:900;font-family:inherit;background:#eef3fb;color:#34465e}" +
    "#worldSec .wB.on{background:#ff8fb3;color:#fff}" +
    "#worldSec .wB.op{background:#d3f9d8;color:#2b8a3e}" +
    "#worldSec .wB:disabled{opacity:.55}" +
    "#worldSec .wNote{font-size:12px;color:#6b7c92;margin:2px 0 4px}" +
    "#worldSec .wList{margin:4px 0}";
  document.head.appendChild(css);
  function needLabel(n) { return n === -2 ? "모두" : n === -1 ? "절반" : n + "명"; }
  function drawPanel() {
    if (!sec) return;
    var ed = canEdit(), wl = worlds(), h = "";
    var srv = online();
    h += '<div class="wNote">' + (ed
      ? (srv && fromServer ? "바꾸면 우리 반 학생 기기 모두에 바로 적용돼요" : srv ? "서버가 아직 옛 판이라 이 기기에만 적용돼요(광장서버를 다시 올리면 반 전체에)" : "서버 없이 연 광장이라 이 기기에만 적용돼요 · 학생 기기는 아래 「학생 주소 복사」 주소로")
      : "선생님 주소(광장 주소 끝에 ?teacher)로 열면 바꿀 수 있어요") + "</div>";
    h += '<div class="pg"><button type="button" class="wB' + (!st.lock ? " on" : "") + '" data-a="all">🔓 모두 열기</button>' +
      '<button type="button" class="wB' + (st.lock ? " on" : "") + '" data-a="lock">🔒 하나씩 열기</button></div>';
    if (st.lock) {
      h += '<div class="wList">';
      var set = openSet();
      wl.forEach(function (w, i) {
        var o = !!set[w.wid], c = st.clr && st.clr[w.wid];
        h += '<div class="wRow"><span class="wN">' + (i + 1) + ". " + w.emoji + " " + w.name + "</span>" +
          (srv ? '<span class="wC">깬 친구 ' + (c || 0) + "명</span>" : "") +
          '<button type="button" class="wB' + (o ? " op" : "") + '" data-w="' + w.wid + '">' + (o ? "🔓 열림" : "🔒 잠김") + "</button></div>";
      });
      h += "</div>";
      h += '<div class="pg"><button type="button" class="wB' + (st.seq ? " on" : "") + '" data-a="seq">➡️ 순서대로 ' + (st.seq ? "켬" : "끔") + "</button></div>";
      if (st.seq) {
        h += '<div class="wNote">' + (srv ? "열린 월드를 이만큼 끝까지 깨면 다음 월드가 저절로 열려요" + (st.n ? " (지금 들어온 학생 " + st.n + "명)" : "") : "학생이 자기 기기에서 열린 월드를 깨면 그 기기에서 다음 월드가 열려요") + "</div>";
        if (srv) {
          h += '<div class="pg">';
          [1, 3, 5, 10, -1, -2].forEach(function (n) { h += '<button type="button" class="wB' + (st.need === n ? " on" : "") + '" data-n="' + n + '">' + needLabel(n) + "</button>"; });
          h += "</div>";
        }
      }
      if (srv) h += '<div class="pg"><button type="button" class="wB" data-a="reset">🧹 깬 기록 지우기</button></div>';
    }
    if (!srv) h += '<div class="pg"><button type="button" class="wB" data-a="copy">📋 학생 주소 복사</button></div>';
    sec.querySelector(".wBody").innerHTML = h;
    sec.querySelectorAll("button").forEach(function (b) { b.disabled = !ed && b.getAttribute("data-a") !== "copy"; });
  }
  function studentUrl() {
    var u = new URL(location.href);
    u.hash = "";
    ["teacher", "back", "manual", "char"].forEach(function (k) { u.searchParams.delete(k); });
    if (!st.lock) u.searchParams.set("open", "all");
    else u.searchParams.set("open", st.open.length ? st.open.join(",") : "none");
    if (st.lock && st.seq) u.searchParams.set("seq", "1"); else u.searchParams.delete("seq");
    return u.toString().replace(/%2C/g, ",");
  }
  function onPanel(e) {
    var b = e.target.closest && e.target.closest("button");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-a"), wid = b.getAttribute("data-w"), n = b.getAttribute("data-n");
    try { NET.G.ht.click(); } catch (er) {}
    if (a === "copy") {
      var url = studentUrl(), done = function () { b.textContent = "✅ 복사했어요"; setTimeout(drawPanel, 1500); };
      try { navigator.clipboard.writeText(url).then(done, function () { prompt("학생 주소", url); }); } catch (er) { prompt("학생 주소", url); }
      return;
    }
    if (!canEdit()) return;
    if (a === "all") setLocal({ lock: false });
    else if (a === "lock") { if (!st.lock) setLocal({ lock: true, open: order().slice(0, 1) }); } // 처음 잠글 때는 첫 차례만 열어 둠(이미 잠금이면 그대로)
    else if (a === "seq") setLocal({ seq: !st.seq }, { seq: !st.seq });
    else if (a === "reset") { if (confirm("깬 기록을 모두 지울까요? (반 별은 그대로예요)")) send({ resetClr: true }); }
    else if (n != null) setLocal({ need: parseInt(n, 10) }, { need: parseInt(n, 10) });
    else if (wid) {
      var op = st.open.slice(), i = op.indexOf(wid);
      var opening = !isOpen(wid);
      if (!opening) { if (i >= 0) op.splice(i, 1); else return; } // 순서대로(기기)로 열린 것은 이 기기 기록이라 잠글 수 없음
      else op.push(wid);
      setLocal({ open: op }, { op: opening ? "open" : "close", w: wid });
    }
  }
  function mount() {
    var panel = document.getElementById("panel");
    if (!panel || sec) return;
    sec = document.createElement("div");
    sec.id = "worldSec";
    sec.innerHTML = '<h3>🗺️ 월드 열기</h3><div class="wBody"></div>';
    sec.addEventListener("click", onPanel);
    var gs = document.getElementById("gradeSec");
    if (gs && gs.nextSibling) panel.insertBefore(sec, gs.nextSibling);
    else panel.insertBefore(sec, panel.firstChild);
    drawPanel();
    var lastKey = "";
    setInterval(function () { var k = canEdit() + "|" + online(); if (k !== lastKey) { lastKey = k; drawPanel(); } }, 2000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(mount, 0); });
  else setTimeout(mount, 0);

  window.PLAZA_WORLDS = {
    isOpen: isOpen,
    state: function () { return st; },
    set: setLocal,
    onServer: onServer,
    // 서버에 들어왔는데 서버가 월드 잠금을 모르면(옛 서버): 학생 기기는 예전 주소로 기억한 잠금을 쓰지 않고 모두 열림(검토)
    noServer: function () { if (!canEdit()) { st.lock = false; st.open = []; drawPanel(); } },
    tick: tick,
    lockedCard: lockedCard,
    studentUrl: studentUrl,
    redraw: drawPanel,
  };
})();
