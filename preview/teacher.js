/* 선생님 점검 도구 — 광장 (2026-11-26 선생님: "광장에서도 걷는 속도를 엄청 빠르게, 순간이동으로 걸어가는 시간을 줄여 줘. 점검을 빨리 하려고")
 * - 선생님 기기에서만 보여요: 서버 반에 선생님으로 들어온 기기, 또는 서버가 없을 때(공개 주소·파일) 광장 주소 끝에 ?teacher.
 *   학생 기기에는 단추도 창도 없고, 걷는 속도도 그대로예요(window.PLZ_SPD는 이 파일이 선생님 기기에서만 정함).
 * - 왼쪽 위 🎓 학년 표시 아래 두 단추:
 *   ① 🐢 1배 / 🐇 2배 / 🚀 4배 — 누를 때마다 걷는 속도가 바뀌고 이 기기에 기억(plaza.tspd).
 *      (plaza_inject.py가 광장 걷기 코드에 PLZ_SPD를 곱하게 해 둠. 울타리를 뚫지 않게 0.3칸씩 나눠 움직임)
 *   ② 🧭 순간이동 — 광장 가운데·우리 집 안·포털 3곳·꿈빛 성 문·명소 문 6곳(games.js PLAZA_GAMES.teleport).
 *      문 바로 앞에 서서 "들어갈까요?"가 바로 떠요. 학생에게 잠긴 월드도 선생님은 들어갈 수 있어요(🔒 표시).
 * - 반 활동(모이기·OX 퀴즈 등)을 진행하는 동안 선생님 기기는 보이지 않는 카메라라서 단추를 숨겨요.
 * - 게임에 들어가면 게임마다 🧑‍🏫 단추로 바로 가기(games/back.js 10번).
 * 시험: window.PLAZA_TEACHER_TOOLS = { open(), close(), speed(n), go(what) }
 */
(function () {
  "use strict";
  if (window.PLAZA_TEACHER_TOOLS) return;
  var SPDS = [1, 2, 4], ICON = { 1: "🐢", 2: "🐇", 4: "🚀" };
  function isT() {
    if (window.PLAZA_GAMES && PLAZA_GAMES.isTeacher) return PLAZA_GAMES.isTeacher();
    try { return window.NET && NET.online ? NET.role === "teacher" : new URLSearchParams(location.search).has("teacher"); } catch (e) { return false; }
  }
  function G() { return window.NET && NET.G; }
  var spd = 1;
  try { spd = parseInt(localStorage.getItem("plaza.tspd"), 10) || 1; } catch (e) {}
  if (SPDS.indexOf(spd) < 0) spd = 1;
  function setSpd(n) {
    spd = SPDS.indexOf(n) >= 0 ? n : 1;
    try { localStorage.setItem("plaza.tspd", String(spd)); } catch (e) {}
    apply();
    draw(true);
  }
  // 선생님 기기일 때만 속도를 곱함(서버 연결·역할이 늦게 정해져도 매번 다시 봄)
  function apply() { window.PLZ_SPD = isT() ? spd : 1; }

  var css = document.createElement("style");
  css.textContent =
    "#tchBar{position:fixed;z-index:6;display:flex;gap:6px;padding:0;background:none;box-shadow:none}" +
    "#tchBar button{border:0;border-radius:999px;padding:6px 11px;font:900 14px/1 inherit;font-family:inherit;color:#fff;background:rgba(112,72,232,.92);box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;touch-action:manipulation;white-space:nowrap}" +
    "#tchMenu{position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:520px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);overflow:auto;box-sizing:border-box;padding:12px 12px 10px;border-radius:18px}" +
    "#tchMenu .tH{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:900;color:#3b2a7a}#tchMenu .tH b{flex:1}" +
    "#tchMenu .tX{border:0;width:36px;height:36px;border-radius:50%;background:#eef1f5;font-size:17px;font-weight:900;font-family:inherit;cursor:pointer}" +
    "#tchMenu .tS{font-size:12px;color:#6a7a90;font-weight:700;margin:2px 0 6px}" +
    "#tchMenu .tG{font-size:13px;font-weight:900;color:#7048e8;margin:8px 2px 4px}" +
    "#tchMenu .tL{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px}" +
    "#tchMenu .tB{border:2px solid #d0bfff;background:#f3f0ff;color:#3b2a7a;border-radius:12px;padding:9px 8px;font:800 14px/1.25 inherit;font-family:inherit;text-align:left;cursor:pointer;touch-action:manipulation}" +
    "#tchMenu .tB:active{background:#e5dbff}#tchMenu .tB small{display:block;font-size:11px;color:#7a6aa8;font-weight:700}";
  document.head.appendChild(css);

  var bar = null, bSpd = null, bTp = null, menu = null, lastKey = "";
  function canMove() { var g = G(); return !!(g && g.S && g.S.loc === "village" && !g.S.deco && !(g.Y && g.Y.hidden)); }
  function place() {
    if (!bar) return;
    var c = document.getElementById("gradeChip"), r = c && c.getClientRects().length ? c.getBoundingClientRect() : null;
    var cnt = document.getElementById("count"), r2 = cnt && cnt.getClientRects().length ? cnt.getBoundingClientRect() : null;
    var x = Math.round(r2 ? r2.left : 10), y = Math.round((r2 ? Math.max(r2.bottom, r ? r.bottom : 0) : r ? r.bottom : 96) + 6);
    var cb = document.getElementById("coinBar"), r3 = cb && !cb.hidden && cb.getClientRects().length ? cb.getBoundingClientRect() : null; // 사과 코인 줄(coin.js)이 🍎 아래에 있으면 그 아래로
    if (r3) y = Math.max(y, Math.round(r3.bottom + 6));
    if (bar.style.left !== x + "px") bar.style.left = x + "px";
    if (bar.style.top !== y + "px") bar.style.top = y + "px";
  }
  function draw(force) {
    apply();
    var g = G(), on = isT() && !!g && !(g.Y && g.Y.hidden) && g.S && g.S.loc !== "arena";
    var key = on + "|" + spd + "|" + canMove();
    if (bar) place();
    if (!force && key === lastKey) return;
    lastKey = key;
    if (!on) { if (bar) bar.hidden = true; close(); return; }
    if (!bar) mount();
    bar.hidden = false;
    bSpd.textContent = ICON[spd] + " " + spd + "배";
    bSpd.title = "걷는 속도(선생님만): 누를 때마다 1배 → 2배 → 4배";
    bTp.disabled = !canMove();
    bTp.style.opacity = canMove() ? "1" : ".5";
    place();
  }
  function mount() {
    bar = document.createElement("div");
    bar.id = "tchBar";
    bar.className = "ui";
    bSpd = document.createElement("button"); bSpd.type = "button"; bSpd.id = "tchSpd";
    bTp = document.createElement("button"); bTp.type = "button"; bTp.id = "tchTp"; bTp.textContent = "🧭 순간이동";
    bSpd.onclick = function (e) { e.stopPropagation(); setSpd(SPDS[(SPDS.indexOf(spd) + 1) % SPDS.length]); };
    bTp.onclick = function (e) { e.stopPropagation(); menu ? close() : open(); };
    ["pointerdown", "touchstart", "mousedown"].forEach(function (t) { bar.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    bar.appendChild(bSpd); bar.appendChild(bTp);
    document.body.appendChild(bar);
  }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function locked(wid) { return !!(wid && window.PLAZA_WORLDS && !PLAZA_WORLDS.isOpen(wid)); }
  function targets() {
    var g = G(), out = [], PG = window.PLAZA_GAMES || {};
    out.push({ group: "광장", label: "광장 가운데", icon: "⛲", go: "center" });
    out.push({ group: "광장", label: "우리 집 안으로", icon: "🏠", go: "home" });
    if (g && g.Te) g.Te.forEach(function (T, i) { if (T && T.ext) out.push({ group: "포털", label: T.name, icon: T.emoji, go: "portal:" + i, wid: T.wid }); });
    if (PG.castle) out.push({ group: "꿈빛 성 · 명소 문", label: PG.castle.name, icon: PG.castle.emoji, go: "castle", wid: PG.castle.wid });
    (PG.doors || []).forEach(function (D) { if (window.PLAZA_DOORS && PLAZA_DOORS[D.key]) out.push({ group: "꿈빛 성 · 명소 문", label: D.name, icon: D.emoji, go: D.key, wid: D.wid }); });
    return out;
  }
  function go(what) {
    var g = G();
    if (!g || !isT() || !canMove()) return false;
    close();
    if (what === "home") { try { g.fns.fc(); return true; } catch (e) { return false; } }
    var ok = window.PLAZA_GAMES && PLAZA_GAMES.teleport && PLAZA_GAMES.teleport(what);
    try { if (ok && g.ht && g.ht.whoosh) g.ht.whoosh(); } catch (e) {}
    return !!ok;
  }
  function open() {
    close();
    if (!isT() || !canMove()) return;
    var list = targets(), h = '<div class="tH"><b>🧭 순간이동 (선생님만)</b><button type="button" class="tX" aria-label="닫기">✕</button></div>' +
      '<div class="tS">문 바로 앞으로 가서 "들어갈까요?"가 떠요 · 🔒 = 학생에게 잠긴 월드(선생님은 들어가요)</div>', g0 = null;
    list.forEach(function (t, i) {
      if (t.group !== g0) { if (g0 !== null) h += "</div>"; h += '<div class="tG">' + esc(t.group) + '</div><div class="tL">'; g0 = t.group; }
      h += '<button type="button" class="tB" data-i="' + i + '">' + esc(t.icon + " " + t.label) + (locked(t.wid) ? "<small>🔒 학생에게는 잠김</small>" : "") + "</button>";
    });
    if (g0 !== null) h += "</div>";
    menu = document.createElement("div");
    menu.id = "tchMenu";
    menu.className = "card ui";
    menu.innerHTML = h;
    ["pointerdown", "touchstart", "mousedown"].forEach(function (t) { menu.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      if (e.target.closest(".tX")) return close();
      var b = e.target.closest(".tB");
      if (b) go(list[+b.getAttribute("data-i")].go);
    });
    document.body.appendChild(menu);
  }
  function close() { if (menu) { menu.remove(); menu = null; } }
  window.PLAZA_TEACHER_TOOLS = { open: open, close: close, speed: setSpd, go: go, targets: targets, get spd() { return spd; } };
  function start() {
    apply();
    draw(true);
    setInterval(function () { draw(false); }, 500);   // 서버 연결·역할·반 활동이 바뀌면 맞춤(가벼움)
    addEventListener("resize", function () { setTimeout(place, 120); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
