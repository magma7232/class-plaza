/* 학년 고르기 (2026-11-25 선생님: "내가 학년을 선택해서 4학년이면 4학년 문제·4학년 수준 게임이 나오게")
 * - 광장 왼쪽 위(🍎 아래)에 지금 학년 「🎓 4학년」이 작게 보여요.
 * - 바꾸는 법(학생이 함부로 못 바꾸게, 선생님만):
 *   ① 광장 주소 끝에 ?teacher 를 붙여 열면 🎓 표시를 눌러 1~6학년을 고를 수 있어요(👩‍🏫 선생님 판에도 같은 단추).
 *   ② 주소에 ?grade=3 을 붙여 한 번 열면 그 기기는 3학년으로 기억해요(학년별 QR 안내장이 이 주소예요: 광장마을/QR_만들기.py).
 *   ③ 광장 서버(workers.dev)로 선생님이 들어와 고르면 우리 반 학생 기기 모두가 그 학년으로 바뀌어요.
 * - 모든 게임은 games/back.js의 window.PLAZA_GRADE()(1~6)로 읽어요. 광장도 같은 함수를 여기서 만들어요(순서·저장 이름 같음).
 * Claude 없이도 그대로 돌아가요(서버 없이 공개 주소·파일로 열어도).
 */
(function () {
  "use strict";
  function qget(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  var mem = 0; // 기기 저장소가 막힌 브라우저에서도 이 페이지 동안은 고른 학년을 지킴(검토)
  if (!window.PLAZA_GRADE || !window.PLAZA_GRADE.__plaza) {
    window.PLAZA_GRADE = function () {
      var g = parseInt(qget("grade"), 10);
      if (g >= 1 && g <= 6) { try { if (localStorage.getItem("plaza.grade") !== String(g)) localStorage.setItem("plaza.grade", String(g)); } catch (e) {} return g; }   /* 같으면 안 씀(매 장면 불러도 낡은 패드 부담 없게) */
      if (mem) return mem;
      try { g = parseInt(localStorage.getItem("plaza.grade"), 10); } catch (e) { g = 0; }
      if (g >= 1 && g <= 6) return g;
      try { g = parseInt(JSON.parse(localStorage.getItem("plaza.quizGrade") || "0"), 10); } catch (e) { g = 0; }
      return g >= 1 && g <= 6 ? g : 4;
    };
    window.PLAZA_GRADE.__plaza = 1;
  }
  PLAZA_GRADE(); // 주소의 ?grade 를 바로 기억

  function canEdit() {
    var t = false;
    try { t = new URLSearchParams(location.search).has("teacher"); } catch (e) {}
    return t || !!(window.NET && NET.online && NET.role === "teacher");
  }

  // 학년을 정해요. from: 'ui'(선생님이 누름) | 'server'(서버가 알려 줌)
  function setGrade(g, from) {
    g = parseInt(g, 10);
    if (!(g >= 1 && g <= 6)) return;
    mem = g;
    try { localStorage.setItem("plaza.grade", String(g)); } catch (e) {}
    // 주소에 다른 ?grade 가 남아 있으면 바꿔 둠(주소가 먼저라서, 안 바꾸면 새로고침 때 옛 학년으로 돌아감)
    try {
      var u = new URL(location.href);
      if (u.searchParams.has("grade") && u.searchParams.get("grade") !== String(g)) { u.searchParams.set("grade", String(g)); history.replaceState(history.state, "", u.toString()); }
    } catch (e) {}
    if (from === "ui" && window.NET && NET.online && NET.role === "teacher" && NET.cloud) { try { NET.cloud.send({ t: "grade", g: g }); } catch (e) {} }
    draw(true);
  }
  window.PLAZA_SET_GRADE = setGrade;

  var css = document.createElement("style");
  css.textContent =
    "#gradeChip{position:fixed;left:calc(96px + env(safe-area-inset-left));top:calc(56px + env(safe-area-inset-top));padding:4px 11px;border-radius:999px;font-size:14px;font-weight:900;color:#4b5d75;border:0;font-family:inherit;z-index:5}" +
    "#gradeChip.edit{cursor:pointer;box-shadow:0 0 0 2px #ffc94d inset}" +
    "#gradePick{position:fixed;left:calc(10px + env(safe-area-inset-left));top:calc(96px + env(safe-area-inset-top));padding:10px;border-radius:16px;z-index:30;max-width:calc(100vw - 20px)}" +
    "#gradePick .gT{font-size:14px;font-weight:900;color:#4b5d75;margin-bottom:6px}" +
    "#gradePick .gB,#panel .gB{display:inline-block;min-width:44px;height:44px;margin:2px;border-radius:12px;border:0;font-size:16px;font-weight:900;background:#eef3fb;color:#34465e;font-family:inherit}" +
    "#gradePick .gB.on,#panel .gB.on{background:#ff8fb3;color:#fff}" +
    "#panel .gB:disabled{opacity:.55}" +
    "#panel .gNote{font-size:12px;color:#6b7c92;margin:2px 0 4px}";
  document.head.appendChild(css);

  function btns() {
    var h = "", g = PLAZA_GRADE();
    for (var i = 1; i <= 6; i++) h += '<button type="button" class="gB' + (i === g ? " on" : "") + '" data-g="' + i + '">' + i + "</button>";
    return h;
  }
  var chip, pick, sec, lastKey = "";
  function draw(force) {
    var g = PLAZA_GRADE(), ed = canEdit(), key = g + "|" + ed + "|" + !!(window.NET && NET.online) + "|" + (pick ? pick.hidden : 1);
    place();
    if (!force && key === lastKey) return;
    lastKey = key;
    if (chip) {
      chip.textContent = "🎓 " + g + "학년";
      chip.classList.toggle("edit", ed);
      chip.title = ed ? "눌러서 학년 바꾸기" : "학년은 선생님이 정해요";
    }
    if (pick && !pick.hidden) pick.querySelector(".gR").innerHTML = btns();
    if (sec) {
      sec.querySelector(".pg").innerHTML = btns();
      sec.querySelectorAll(".gB").forEach(function (b) { b.disabled = !ed; });
      sec.querySelector(".gNote").textContent = ed
        ? "퀴즈 문제와 게임 난이도가 이 학년에 맞춰져요" + (window.NET && NET.online ? " · 우리 반 학생 기기도 같이 바뀌어요" : "")
        : "선생님 주소(광장 주소 끝에 ?teacher)로 열면 바꿀 수 있어요";
    }
  }
  // 🍎 사과 수 바로 오른쪽(같은 줄). 왼쪽 아래 칸(#score: OX 퀴즈 점수)과 겹치지 않게(검토)
  function place() {
    if (!chip) return;
    var c = document.getElementById("count");
    if (!c || !c.getClientRects().length) return;
    var r = c.getBoundingClientRect(), x = Math.round(r.right + 8) + "px", y = Math.round(r.top + (r.height - chip.offsetHeight) / 2) + "px";
    if (chip.style.left !== x) chip.style.left = x;
    if (chip.style.top !== y) chip.style.top = y;
  }
  function onPick(e) {
    var b = e.target.closest && e.target.closest(".gB");
    if (!b || b.disabled || !canEdit()) return;
    setGrade(b.getAttribute("data-g"), "ui");
  }
  function mount() {
    if (chip) return;
    var ng = document.getElementById("nogl");
    if (ng && ng.getClientRects().length && getComputedStyle(ng).display !== "none" && !ng.hidden) return; // WebGL이 없는 안내 화면에는 안 띄움
    chip = document.createElement("button");
    chip.type = "button";
    chip.id = "gradeChip";
    chip.className = "card ui";
    chip.onclick = function () {
      if (!canEdit()) return;
      pick.hidden = !pick.hidden;
      draw(true);
    };
    document.body.appendChild(chip);
    pick = document.createElement("div");
    pick.id = "gradePick";
    pick.className = "card ui";
    pick.hidden = true;
    pick.innerHTML = '<div class="gT">🎓 몇 학년 문제로 할까요?</div><div class="gR"></div>';
    pick.addEventListener("click", function (e) { onPick(e); if (e.target.closest && e.target.closest(".gB")) pick.hidden = true; });
    document.body.appendChild(pick);
    var panel = document.getElementById("panel");
    if (panel) {
      sec = document.createElement("div");
      sec.id = "gradeSec";
      sec.innerHTML = '<h3>🎓 학년</h3><div class="gNote"></div><div class="pg"></div>';
      sec.addEventListener("click", onPick);
      panel.insertBefore(sec, panel.firstChild);
    }
    draw(true);
    setInterval(draw, 2000); // 서버 연결·선생님 역할이 늦게 정해져도 맞춰짐(가벼움)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

/* 전체 화면(2026-11-26, fullscreen.js): 광장도 손가락으로 처음 누를 때 전체 화면 + 오른쪽 위 줄에 ⛶ 켜기·끄기 단추(🎵 옆) */
(function () {
  try {
    var me = document.currentScript;
    if (!me || !me.src) return;
    var IN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    var OUT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
    function button() {
      var F = window.PLAZA_FS;
      if (!F || !F.supported || document.getElementById("bFS")) return;
      var row = document.getElementById("topR");
      if (!row) { setTimeout(button, 500); return; }
      var b = document.createElement("button");
      b.id = "bFS"; b.className = "card plazaFsBtn"; b.type = "button";
      var ref = document.getElementById("bTeacher");
      var w = (document.getElementById("bSound") || {}).offsetWidth || 50;
      b.style.cssText = "width:" + w + "px;padding-left:0;padding-right:0";
      var ic = function () { var on = F.on(); b.innerHTML = on ? OUT : IN; b.setAttribute("aria-label", on ? "전체 화면 끄기" : "전체 화면"); b.title = b.getAttribute("aria-label"); };
      ic(); F.sub(ic);
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); F.toggle(); });
      ["pointerdown", "touchstart", "mousedown"].forEach(function (t) { b.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
      if (ref && ref.parentNode === row) row.insertBefore(b, ref); else row.appendChild(b);
      // 좁은 세로 휴대폰에서 줄이 모자라 「캐릭터」「선생님」 글자가 두 줄로 꺾이면 ⛶는 빠짐(첫 터치 전체 화면은 그대로)
      var tight = function () {
        b.style.display = "";
        var r = row.getBoundingClientRect(), bad = r.left < 6;   // 줄이 왼쪽 위 칸(사과·학년)까지 밀려 나오면
        [].forEach.call(row.children, function (c) { if (c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) bad = true; });   // 글자가 넘침(높이 고정 단추)
        if (bad) b.style.display = "none";
      };
      tight(); addEventListener("resize", function () { setTimeout(tight, 80); }); setTimeout(tight, 1500);
    }
    if (window.PLAZA_FS) { button(); return; }
    var s = document.createElement("script");
    s.src = new URL("fullscreen.js", me.src).href;
    s.onload = button;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();
