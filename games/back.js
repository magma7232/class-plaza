/* 미니게임 공통 도우미 (back.js)
 *
 * 1) 수업 문 확인: 광장 서버가 있는 곳(Cloudflare)에서는 선생님이 수업 문을 열었을 때만 게임을 할 수 있어요.
 *    광장에서 받은 입장권(ticket)으로 '지켜보기 연결'을 하나 열어 두고, 문이 닫히면 바로 게임을 가려요.
 *    서버가 없는 곳(미리보기, 파일로 열기)에서는 확인하지 않아요.
 * 2) 선생님이 "모두 광장으로"를 누르면 10초를 센 뒤 광장으로 돌아가요(게임 화면 위에 숫자가 떠요).
 * 3) 게임을 깨면(게임이 'minigame-clear' 신호를 보내면) 반 별을 하나 보태요.
 *    친구랑 같이 한 방은 방장 기기만 별을 보내요(detail.guest가 true인 친구 기기는 알림만).
 * 4) '광장으로' 버튼: 광장 포탈로 들어왔을 때만 보여요. 잘못 누르지 않게 두 번 눌러야 돌아가요.
 *    위치는 <script src="back.js" data-pos="top-center"> 처럼 바꿀 수 있어요.
 *    (top-left, top-center, top-right, bottom-left, bottom-center, bottom-right, left-middle, right-middle, none=단추 없음)
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var q = new URLSearchParams(location.search);
  // 반 코드: 보통은 room. 새 게임 4개는 room이 자기 방 번호라서 광장이 classroom으로 넘긴다(games.js)
  var ROOM = q.get("classroom") || q.get("room");
  var FONT = "font-family:system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;";

  function plazaHome() {
    // 광장은 back.js가 든 games 폴더의 한 칸 위(깃허브 페이지처럼 사이트가 하위 폴더에 있어도 맞게: .../class-plaza/)
    var u;
    try {
      u = new URL("../", me && me.src ? me.src : location.href);
    } catch (e) {
      u = new URL("/", location.href);
    }
    if (ROOM) u.searchParams.set("room", ROOM);
    return u.toString();
  }
  // 광장으로 돌아갈 주소(같은 사이트만)
  function backTarget() {
    var b = q.get("back");
    if (b) {
      try {
        var bu = new URL(b, location.href);
        if (bu.origin === location.origin) return bu;
      } catch (e) {}
    }
    var h = new URL(plazaHome());
    h.searchParams.set("back", "1");
    return h;
  }
  function onBody(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- 1) 수업 문 ----------
  var blocked = null;
  function block() {
    if (blocked) return;
    blocked = document.createElement("div");
    blocked.style.cssText = "position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(30,45,70,.88);" + FONT;
    blocked.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:26px 24px;width:420px;max-width:88vw;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);color:#2b3a4f">' +
      '<div style="font-size:44px">🔒</div><div style="font-size:24px;font-weight:900;margin:6px 0">지금은 수업 시간이 아니에요</div>' +
      '<div style="font-size:16px;color:#5a6b80;font-weight:700;line-height:1.5">선생님이 수업 문을 열면<br>광장에서 들어올 수 있어요.</div>' +
      '<button type="button" style="margin-top:16px;border:0;border-radius:999px;padding:12px 22px;font-size:17px;font-weight:900;background:#2f8cff;color:#fff;' + FONT + '">🏠 광장으로</button></div>';
    blocked.querySelector("button").onclick = function () {
      location.href = plazaHome();
    };
    ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(function (t) {
      blocked.addEventListener(t, function (e) {
        e.stopPropagation();
      }, true);
    });
    onBody(function () {
      document.body.appendChild(blocked);
    });
    try {
      window.dispatchEvent(new Event("blur"));
    } catch (e) {}
  }

  // 지켜보기 연결: 수업 문 닫힘, 모두 광장으로, 게임 깬 소식
  var ws = null,
    wsOk = false,
    dead = false,
    tries = 0,
    pingT = null,
    clears = [];
  function wsUrl() {
    return (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + "/ws?room=" + encodeURIComponent(ROOM);
  }
  function connect() {
    if (dead) return;
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      return retry();
    }
    var opened = false;
    ws.onopen = function () {
      opened = true;
      ws.send(JSON.stringify({ t: "watch", name: q.get("name") || "친구", ticket: q.get("ticket") }));
      clearInterval(pingT);
      pingT = setInterval(function () {
        try {
          ws.send("ping");
        } catch (e) {}
      }, 30000);
    };
    ws.onmessage = function (ev) {
      if (ev.data === "pong") return;
      var m;
      try {
        m = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (m.t === "wok") {
        wsOk = true;
        tries = 0;
        if (m.recall) startRecall(m.recall);
        flushClears();
      } else if (m.t === "closed") {
        dead = true;
        block();
      } else if (m.t === "recall") startRecall(m.sec | 0);
    };
    ws.onclose = function (ev) {
      clearInterval(pingT);
      wsOk = false;
      if (ev.code === 4001) {
        dead = true;
        block();
        return;
      }
      if (!opened && tries === 2) checkTicket(); // 연결이 잘 안 되면 입장권만 한 번 확인해요
      retry();
    };
  }
  function retry() {
    if (dead) return;
    tries++;
    setTimeout(connect, Math.min(15000, 1000 * Math.pow(2, Math.min(tries, 4))));
  }
  function checkTicket() {
    fetch("/api/ticket?room=" + encodeURIComponent(ROOM) + "&t=" + encodeURIComponent(q.get("ticket") || ""), { cache: "no-store" })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) {
          dead = true;
          block();
        }
      })
      .catch(function () {});
  }
  function flushClears() {
    while (wsOk && clears.length) {
      try {
        var c = clears.shift();
        ws.send(JSON.stringify({ t: "clear", game: c.game, team: c.team }));
      } catch (e) {
        break;
      }
    }
  }
  var helloTries = 0;
  function hello() {
    fetch("/api/hello", { cache: "no-store" })
      .then(function (r) {
        return r.ok
          ? r.json().catch(function () {
              return null;
            })
          : null;
      })
      .then(function (j) {
        if (!j || j.app !== "uriban-plaza") return; // 광장 서버가 없는 곳
        if (!ROOM || !q.get("ticket")) return block();
        connect();
      })
      .catch(function () {
        // 인터넷이 잠깐 끊겼으면 조금 뒤에 다시 물어봐요
        if (++helloTries < 6) setTimeout(hello, 2000 * helloTries);
      });
  }
  hello();

  // ---------- 2) 모두 광장으로 ----------
  var rc = null,
    rcT = null;
  function startRecall(sec) {
    clearInterval(rcT);
    if (!sec) {
      if (rc) rc.style.display = "none";
      return;
    }
    if (!rc) {
      rc = document.createElement("div");
      rc.style.cssText = "position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483500;pointer-events:none;text-align:center;" + FONT;
      rc.innerHTML =
        '<div style="display:inline-block;background:rgba(255,255,255,.96);border-radius:999px;padding:8px 18px;font-size:18px;font-weight:900;color:#d6336c;box-shadow:0 6px 18px rgba(30,60,100,.28)">📣 선생님이 불러요! 곧 광장으로 가요</div>' +
        '<div data-n style="font-size:84px;font-weight:900;color:#fff;line-height:1.05;text-shadow:0 4px 0 #d6336c,0 8px 26px rgba(120,20,60,.45)">10</div>';
      onBody(function () {
        document.body.appendChild(rc);
      });
    }
    rc.style.display = "";
    var end = Date.now() + sec * 1000;
    var tick = function () {
      var left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(rcT);
        try {
          window.dispatchEvent(new CustomEvent("plaza-recall"));
        } catch (e) {}
        var u = backTarget();
        u.searchParams.set("gather", "1");
        location.href = u.toString();
        return;
      }
      rc.querySelector("[data-n]").textContent = left;
    };
    tick();
    rcT = setInterval(tick, 200);
  }

  // ---------- 3) 게임을 깨면 반 별 하나 ----------
  // 친구랑 같이 한 방은 한 팀이라서 별도 하나예요: 방장 기기만 보내고, 친구 기기(guest)는 알림만 보여 줘요.
  var toastEl = null;
  window.addEventListener("minigame-clear", function (e) {
    var d = (e && e.detail) || {};
    var team = Math.max(1, Math.min(4, d.team | 0 || 1));
    if (!ROOM || !q.get("ticket")) return;
    if (!d.guest) {
      clears.push({ game: String(d.game || "game"), team: team });
      flushClears();
    }
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483400;pointer-events:none;background:rgba(255,255,255,.96);border-radius:999px;padding:10px 20px;font-size:17px;font-weight:900;color:#e8590c;box-shadow:0 6px 18px rgba(30,60,100,.28);transition:opacity .4s;" + FONT;
      onBody(function () {
        document.body.appendChild(toastEl);
      });
    }
    toastEl.textContent = team > 1 ? "⭐ 우리 팀이 반 별 +1! 광장이 조금씩 바뀌어요" : "⭐ 반 별 +1! 광장이 조금씩 바뀌어요";
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () {
      toastEl.style.opacity = "0";
    }, 3200);
  });

  // ---------- 4) '광장으로' 버튼 ----------
  if (q.get("from") !== "plaza" || !q.get("back")) return;
  var back = backTarget().toString();
  var pos = (me && me.getAttribute("data-pos")) || "top-center";
  if (pos === "none") return; // 게임에 자기 '광장으로' 단추가 있으면(새 게임 4개: ?back= 주소로 만든 단추) 두 개가 되지 않게
  var P = {
    "top-left": "top:calc(8px + env(safe-area-inset-top,0px));left:calc(8px + env(safe-area-inset-left,0px));",
    "top-center": "top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);",
    "top-right": "top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));",
    "bottom-left": "bottom:calc(8px + env(safe-area-inset-bottom,0px));left:calc(8px + env(safe-area-inset-left,0px));",
    "bottom-center": "bottom:calc(8px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);",
    "bottom-right": "bottom:calc(8px + env(safe-area-inset-bottom,0px));right:calc(8px + env(safe-area-inset-right,0px));",
    "left-middle": "top:38%;left:calc(8px + env(safe-area-inset-left,0px));",
    "right-middle": "top:38%;right:calc(8px + env(safe-area-inset-right,0px));",
  };
  var css = document.createElement("style");
  css.textContent =
    "#plazaBack{position:fixed;" + (P[pos] || P["top-center"]) +
    "z-index:2147483000;font:800 15px/1 system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;" +
    "padding:9px 14px;border-radius:999px;border:2px solid rgba(255,255,255,.9);background:rgba(47,140,255,.92);color:#fff;" +
    "box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;white-space:nowrap}" +
    "#plazaBack.ask{background:rgba(214,51,108,.95)}";
  document.head.appendChild(css);
  var b = document.createElement("button");
  b.id = "plazaBack";
  b.type = "button";
  b.textContent = "🏠 광장으로";
  var armed = 0,
    timer = null;
  function disarm() {
    armed = 0;
    b.classList.remove("ask");
    b.textContent = "🏠 광장으로";
  }
  b.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!armed) {
      armed = 1;
      b.classList.add("ask");
      b.textContent = "한 번 더 누르면 광장으로";
      clearTimeout(timer);
      timer = setTimeout(disarm, 3000);
      return;
    }
    location.href = back;
  });
  // 게임이 화면 터치를 가로채지 않게 막아요
  ["pointerdown", "touchstart", "mousedown"].forEach(function (t) {
    b.addEventListener(t, function (e) {
      e.stopPropagation();
    }, { passive: true });
  });
  // 게임의 다른 단추를 가리면 그 단추들 바로 아래(아래쪽 자리면 바로 위)로 비켜 앉아요(2026-11-24: 꿈빛 성 세로 화면에서 💡힌트·🔊를 가렸음).
  // 화면을 돌리거나 게임 화면이 바뀌어 단추가 생기고 없어질 때도 다시 봐요(가벼운 확인만 1초마다)
  // 같은 날 검토에서 고침: 아이가 진짜로 누를 수 있는 단추만 피함(숨김·투명·다른 판에 가려진 것은 빼요), 화면 밖으로는 안 나감,
  // '한 번 더 누르면 광장으로'로 글이 길어진 동안은 움직이지 않음(두 번째 누를 때 단추가 도망가지 않게)
  var up = /^bottom/.test(pos);
  function tappable(el, q) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
    }
    if (!document.elementsFromPoint) return true;
    var x = Math.min(Math.max(q.left + q.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(q.top + q.height / 2, 0), innerHeight - 1);
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i++) {
      if (list[i] === b || b.contains(list[i])) continue;   // '광장으로' 단추 자신은 건너뛰고 그 밑에서 가장 위에 있는 것
      return list[i] === el || el.contains(list[i]);
    }
    return false;
  }
  function dodge() {
    if (!b || !b.isConnected || armed) return;
    var r0 = b.getBoundingClientRect();
    // 퀴즈 카드처럼 이 단추보다 위에 덮인 판이 있으면 그동안은 자리를 그대로 둬요(덮인 동안 게임 단추가 '안 보임'으로 재져서 단추 위로 돌아오던 것)
    if (document.elementFromPoint) {
      var top = document.elementFromPoint(Math.min(Math.max(r0.left + r0.width / 2, 0), innerWidth - 1), Math.min(Math.max(r0.top + r0.height / 2, 0), innerHeight - 1));
      if (top && top !== b && !b.contains(top)) return;
    }
    var cur = parseFloat(up ? b.style.marginBottom : b.style.marginTop) || 0, base = { l: r0.left, r: r0.right, t: r0.top + (up ? cur : -cur), b: r0.bottom + (up ? cur : -cur) };
    var els = document.querySelectorAll("button,a,[role=button],input,select"), shift = 0;
    for (var tries = 0; tries < 6; tries++) {
      var t = base.t + (up ? -shift : shift), bt = base.b + (up ? -shift : shift), hit = null;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el === b || !el.getClientRects().length) continue;
        var q = el.getBoundingClientRect();
        if (q.width < 4 || q.height < 4 || q.width > innerWidth * 0.6) continue;   // 화면 전체를 덮는 층은 빼요
        if (q.right > base.l + 2 && q.left < base.r - 2 && q.bottom > t + 2 && q.top < bt - 2 && tappable(el, q)) { hit = q; break; }
      }
      if (!hit) break;
      shift = up ? base.b - hit.top + 6 : hit.bottom - base.t + 6;
    }
    // 화면 밖으로는 안 나가요(자리가 모자라면 갈 수 있는 데까지만)
    shift = Math.max(0, Math.min(shift, up ? base.t - 4 : innerHeight - 4 - base.b));
    if (Math.abs(shift - cur) > 1) {
      if (up) b.style.marginBottom = shift ? shift + "px" : "";
      else b.style.marginTop = shift ? shift + "px" : "";
      try {
        window.dispatchEvent(new Event("plaza-back-moved"));   // 게임이 알림 글 같은 것을 함께 옮길 수 있게(꿈빛 성)
      } catch (e) {}
    }
  }
  onBody(function () {
    b && document.body.appendChild(b);
    dodge();
  });
  setInterval(dodge, 1000);
  window.addEventListener("resize", function () {
    setTimeout(dodge, 120);
  });
  // 퀴즈 카드가 닫히면 바로 다시 봐요(1초를 기다리지 않게). '나중에 ✕'로 닫을 때는 plaza-quiz가 없어서 plaza-pause(paused:false)도 들어요
  window.addEventListener("plaza-quiz", function () {
    setTimeout(dodge, 60);
  });
  window.addEventListener("plaza-pause", function (e) {
    if (e && e.detail && !e.detail.paused) setTimeout(dodge, 60);
  });
})();

/* 시험판(2026-11-18): 게임 화면을 실제로 보고 있는 시간을 광장에 알려 준다 → 5분 넘게 놀고 돌아가면 선물 상자.
 * 광장의 games.js가 포털에 들어갈 때 localStorage plaza.enter = {t: 들어간 때}를 적고, 여기서 10초마다 last(마지막으로 본 때)를 적는다.
 * 앱을 바꾸거나 화면이 꺼져 있던 동안(박동이 30초 넘게 끊긴 동안)은 idle로 빼서 세지 않는다. 광장은 (last - t - idle)로 판단한다 */
(function () {
  function beat() {
    try {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      var e = JSON.parse(localStorage.getItem("plaza.enter") || "null");
      if (!e || !e.t) return;
      var now = Date.now();
      if (e.last && now - e.last > 30000) e.idle = (e.idle || 0) + (now - e.last - 10000);
      e.last = now;
      localStorage.setItem("plaza.enter", JSON.stringify(e));
    } catch (er) {}
  }
  beat();
  setInterval(beat, 10000);
  document.addEventListener("visibilitychange", beat);
})();

/* 5) 선물 상자(gift.js): 게임을 깨거나 오래 열심히 하면 광장에서 쓸 옷·집 가구/소품을 받아요(2026-11-19).
 * 모든 포털 게임이 back.js를 쓰므로 여기서 한 번만 불러와요. 자세한 규칙은 gift.js 맨 위 */
(function () {
  try {
    var me = document.currentScript;
    if (window.PLAZA_GIFT || !me || !me.src) return;
    var s = document.createElement("script");
    s.src = new URL("gift.js", me.src).href;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();

/* 6) 퀴즈(quiz/quiz.js): 게임을 2~3분 열심히 하면 구석에 작은 "❓ 퀴즈" 말풍선이 떠요. 누르면 학년 문제 하나(게임은 잠깐 멈춤),
 * 맞히면 반짝·정답!(맞힌 문제 2개마다 선물 상자), 틀리면 힌트. 하루 6문제까지. 안 눌러도 돼요(2026-11-24).
 * 모든 포털 게임이 back.js를 쓰므로 여기서 한 번만 불러와요. 자세한 규칙·끄는 법은 quiz.js 맨 위, 문제는 quiz/bank.js */
(function () {
  try {
    var me = document.currentScript;
    if (window.PLAZA_QUIZ || !me || !me.src) return;
    var s = document.createElement("script");
    s.src = new URL("../quiz/quiz.js", me.src).href;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();
