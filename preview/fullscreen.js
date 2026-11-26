/* 전체 화면 (2026-11-26 선생님: "크롬에서 들어간 다음에 전체 화면을 눌러서 위 바나 밑 바가 안 보이도록")
 * 갤럭시탭 크롬은 위 탭 줄·주소창과 아래 안드로이드 단추 줄 때문에 게임 화면이 낮아진다 → 손가락으로 처음 누를 때 전체 화면으로.
 * - 광장(grade.js가 불러옴)과 모든 포털 게임(games/back.js가 불러옴)이 같이 쓴다.
 * - 안드로이드 크롬은 '누르는 동작 안에서만' 전체 화면을 허락한다 → 첫 터치(손가락)에 requestFullscreen. 마우스(선생님 컴퓨터)는 저절로 안 함.
 * - 페이지가 바뀌면(광장 → 게임 → 광장) 전체 화면이 풀린다 → 새 페이지에서 다시 첫 터치에.
 * - ⛶ 단추로 끄면 이 탭에서는 저절로 다시 켜지 않음(sessionStorage 'plaza.fs.off'), 다시 ⛶를 누르면 켜짐.
 * - 아이폰 사파리는 전체 화면을 못 해서 그냥 넘어감(단추도 안 나옴). 아이패드(16.4+)는 됨. 실패해도 조용히.
 * - 글 칸(이름·반 코드)을 누를 때는 건너뜀(자판이 뜨는 동안 화면이 바뀌어 칸이 가려지지 않게) → 다음 다른 곳을 누를 때
 * - '홈 화면에 추가'로 연 광장은 처음부터 전체 화면(manifest.json, display: fullscreen).
 * Claude 없이도 그대로 돌아감(브라우저 기본 기능만, 인터넷·서버 필요 없음).
 */
(function () {
  "use strict";
  if (window.PLAZA_FS) return;
  var d = document, el = d.documentElement;
  var req = el.requestFullscreen || el.webkitRequestFullscreen;
  var supported = !!(req && (d.fullscreenEnabled || d.webkitFullscreenEnabled));
  var standalone = false;
  try { standalone = matchMedia("(display-mode: standalone)").matches; } catch (e) {}   // F11 같은 브라우저 전체 화면을 '홈 화면 앱'으로 잘못 알지 않게 fullscreen 모드는 안 봄
  function isOn() { return !!(d.fullscreenElement || d.webkitFullscreenElement); }
  function offWanted() { try { return sessionStorage.getItem("plaza.fs.off") === "1"; } catch (e) { return false; } }
  function setOff(v) { try { if (v) sessionStorage.setItem("plaza.fs.off", "1"); else sessionStorage.removeItem("plaza.fs.off"); } catch (e) {} }
  var subs = [];
  function changed() { for (var i = 0; i < subs.length; i++) { try { subs[i](isOn()); } catch (e) {} } }
  var lastReq = 0;
  function enter() {
    if (!supported || isOn() || Date.now() - lastReq < 1000) return;   // 한 번 누르면 pointerup·touchend가 둘 다 와서 1초 안에 두 번은 안 부름
    lastReq = Date.now();
    window.__plazaFsCalls = (window.__plazaFsCalls || 0) + 1;   // 점검용: 몇 번 불렀는지
    try {
      var p = req.call(el, { navigationUI: "hide" });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function exit() {
    try {
      var p = (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  window.PLAZA_FS = {
    supported: supported && !standalone,
    on: isOn,
    enter: function () { setOff(false); lastReq = 0; enter(); },
    toggle: function () { if (isOn()) { setOff(true); exit(); } else { setOff(false); lastReq = 0; enter(); } },
    sub: function (fn) { subs.push(fn); },
  };
  d.addEventListener("fullscreenchange", changed);
  d.addEventListener("webkitfullscreenchange", changed);
  if (!supported || standalone) return;
  // 첫 터치(손가락)에 전체 화면. 펜·마우스는 건너뜀. pointerup/touchend는 '사용자 동작'으로 인정됨
  var touched = false;
  function first(e) {
    if (e.type === "pointerup" && e.pointerType && e.pointerType !== "touch") return;
    if (e.type === "touchend" && e.changedTouches && e.changedTouches[0] && e.changedTouches[0].touchType === "stylus") return;
    if (touched && isOn()) return;
    touched = true;
    if (e.type === "pointerup" && window.PointerEvent && "ontouchend" in window) return;   // 손가락이면 곧 touchend가 옴 → 그때 한 번만
    if (offWanted()) return;
    var t = e.target;
    if (t && t.closest && t.closest("#plazaFS,#bFS,.plazaFsBtn")) return;   // ⛶ 단추 자신은 단추가 알아서
    if (t && t.closest && t.closest("input,textarea,select,label,[contenteditable]")) return;   // 글 칸: 자판이 뜨는 동안은 안 함
    enter();
  }
  d.addEventListener("pointerup", first, true);
  d.addEventListener("touchend", first, { capture: true, passive: true });
})();
