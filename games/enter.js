/* 포털 이어 타기(2026-11-26 선생님: "포탈을 타고 윙 하다가 끝나면 0.5초 동안 어색한 화면(게임 처음 화면)이 나왔다가
 * 애니메이션이 뜬다. 차라리 포탈을 더 오래 타더라도 그런 거 없애 줘").
 * - 광장에서 들어온 게임(주소 from=plaza)에서만, 페이지 맨 앞(<head> 첫 줄)에서 바로 화면을 덮는다.
 *   광장 포털 장면이 하얗게 번쩍하며 끝나므로 하얀 화면에서 시작해 → 포털 색 빛 터널이 계속 돈다(CSS만, 그림 파일·자바스크립트 고리 없음).
 * - 걷히는 때: 이야기 영상(story.js)의 무대가 준비되어 막이 올라갈 때(#stOv.in) · 이야기가 없거나 끝났을 때(plaza-story 신호)
 *   · 이야기를 안 트는 경우(story=0·점검 크롬)는 페이지를 다 읽은 뒤 · 무슨 일이 있어도 14초 뒤.
 * - 광장이 포털 색을 주소 pc=rrggbb로 넘겨 준다(없으면 보라).
 * 모든 포털 게임이 같이 쓴다: 게임 template.html·heart_inject.py·uriban_inject.py·sarang/index.html이 <head> 맨 앞에 넣음.
 * Claude 없이도 그대로 돌아감(브라우저 기본 기능만). */
(function () {
  "use strict";
  try {
    if (window.__plazaEnter) return;
    var q = new URLSearchParams(location.search);
    if (q.get("from") !== "plaza" || q.get("cover") === "0") return;
    window.__plazaEnter = 1;
    var pc = String(q.get("pc") || "").replace(/[^0-9a-f]/gi, "");
    if (pc.length !== 6) pc = "8a6bff";
    var n = parseInt(pc, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var col = "rgb(" + r + "," + g + "," + b + ")";
    var dark = "rgb(" + Math.round(r * 0.35) + "," + Math.round(g * 0.3) + "," + Math.round(b * 0.45 + 30) + ")";
    var lite = "rgb(" + Math.round(r + (255 - r) * 0.55) + "," + Math.round(g + (255 - g) * 0.55) + "," + Math.round(b + (255 - b) * 0.55) + ")";
    var d = document, st = d.createElement("style");
    st.textContent =
      "#plazaEnter{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483600;background:#fff;overflow:hidden;transition:opacity .45s ease;touch-action:none}" +
      "#plazaEnter.out{opacity:0;pointer-events:none}" +
      "#plazaEnter i{position:absolute;left:50%;top:50%;border-radius:50%;will-change:transform,opacity}" +
      "#plazaEnter .tn{width:200vmax;height:200vmax;margin:-100vmax 0 0 -100vmax;opacity:0;" +
      "background:repeating-conic-gradient(rgba(255,255,255,0) 0deg 8deg,rgba(255,255,255,.5) 10deg 12deg,rgba(255,255,255,0) 14deg 24deg)," +
      "radial-gradient(circle," + lite + " 0," + col + " 14%," + dark + " 46%," + col + " 72%," + lite + " 100%);" +
      "animation:peIn .55s .05s ease forwards,peSpin 2.6s linear infinite}" +
      "#plazaEnter .gl{width:46vmin;height:46vmin;margin:-23vmin 0 0 -23vmin;" +
      "background:radial-gradient(circle,#fff 0,rgba(255,255,255,.9) 28%,rgba(255,255,255,0) 70%);animation:pePulse 1.2s ease-in-out infinite}" +
      "@keyframes peIn{to{opacity:1}}@keyframes peSpin{to{transform:rotate(360deg)}}@keyframes pePulse{50%{transform:scale(1.3);opacity:.85}}";
    (d.head || d.documentElement).appendChild(st);
    var ov = d.createElement("div");
    ov.id = "plazaEnter";
    ov.innerHTML = '<i class="tn"></i><i class="gl"></i>';
    d.documentElement.appendChild(ov);   // <body>가 생기기 전이라 html 바로 아래에(고정 위치라 그대로 화면을 덮음)

    var gone = false, t0 = Date.now(), loadedAt = 0, timer = 0;
    function hide(why) {
      if (gone) return;
      gone = true;
      window.__plazaEnterWhy = why;   // 점검용: 왜 걷혔는지
      clearInterval(timer);
      ov.className = "out";
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); if (st.parentNode) st.parentNode.removeChild(st); }, 600);
    }
    window.PLAZA_ENTER_HIDE = hide;
    // 이야기를 틀지 않는 경우(story=0, 점검 크롬 — story.js와 같은 조건)는 페이지를 다 읽으면 걷음
    var sq = q.get("story"), story = sq !== "0" && (!navigator.webdriver || sq === "1" || sq === "skip");
    addEventListener("plaza-story", function () { hide("story-done"); });
    addEventListener("load", function () { loadedAt = Date.now(); });
    addEventListener("pageshow", function (e) { if (e.persisted) hide("bfcache"); });   // '뒤로'로 되살아난 페이지
    timer = setInterval(function () {
      var s = d.getElementById("stOv");
      if (s && s.classList.contains("in")) return hide("story");   // 이야기 무대가 막을 올림 → 바로 영상
      var now = Date.now();
      if (now - t0 > 14000) return hide("timeout");
      if (!loadedAt) return;
      if (!story && now - loadedAt > 250) return hide("load");
      if (story && !s && now - loadedAt > 2500) return hide("nostory");   // 이 게임에 이야기가 없음(story.js가 무대를 안 만듦)
    }, 80);
  } catch (e) {}
})();
