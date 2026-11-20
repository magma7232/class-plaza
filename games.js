/* 광장 포탈 ↔ 미니게임 연결표 (games.js)
 *
 * 포탈 번호: 0 왼쪽 아래, 1 왼쪽 위, 2 오른쪽 위, 3 오른쪽 아래
 * 여기에 적은 포탈은 들어가면 그 게임 페이지로 이동해요.
 * 적지 않은 포탈(지금은 3번 별빛 성벽)은 광장 안의 별 모으기 게임을 그대로 써요.
 *
 * 새 게임을 붙이려면:
 *   1) 게임 파일을 public/games/ 폴더에 넣고
 *   2) 게임 HTML의 </body> 바로 앞에 <script src="back.js"></script> 를 넣고
 *      (폴더 안에 있으면 "../back.js")
 *   3) 아래 표에 한 줄 추가해요.
 */
(function () {
  "use strict";
  var LIST = {
    0: { name: "뚝딱 장터", emoji: "🍙", modeName: "3D 분식 가게", goal: "주방장 모자를 쓰고 주문 카드대로 분식을 만들어요!", url: "games/jangteo3d.html" },
    1: { name: "하트 특공대", emoji: "💖", modeName: "동화 마을 지키기", goal: "하트 친구들과 투덜이들을 웃게 만들어요!", url: "games/heart.html" },
    2: { name: "사랑둥이 대모험", emoji: "🎈", modeName: "혼자 모험", goal: "베개 공주와 자 왕자를 구하러 가요!", url: "games/sarang/index.html" },
  };

  function backUrl() {
    var u = new URL(location.href);
    u.hash = "";
    u.searchParams.set("back", "1");
    return u.toString();
  }

  // 포탈에 들어갈 때: 화면 가운데 소용돌이가 열리고 그 속으로 날아 들어가는 장면(약 1초) → 하얗게 번쩍 → cb
  // (시험판에서 더함. 예전엔 하얗게 흐려지기만 했다)
  function warp(T, cb) {
    // 배경 음악(music/music.js)은 소용돌이 속으로 날아가는 동안 천천히 작아져요(포털·꿈빛 성 문 모두)
    try {
      if (window.BGM) BGM.stop(0.9);
    } catch (e) {}
    var done = false;
    function fin() {
      if (done) return;
      done = true;
      cb();
    }
    setTimeout(fin, 1700); // 탭이 숨겨져 그림이 멈춰도 넘어가요
    try {
      var W = innerWidth,
        H = innerHeight,
        dpr = Math.min(window.devicePixelRatio || 1, 1.5),
        cv = document.createElement("canvas");
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:99999;pointer-events:none";
      document.body.appendChild(cv);
      // 게임에서 브라우저 '뒤로'로 돌아오면(페이지가 그대로 되살아나면) 하얀 막이 남지 않게
      window.addEventListener(
        "pageshow",
        function () {
          if (cv.parentNode) cv.parentNode.removeChild(cv);
        },
        { once: true }
      );
      var g = cv.getContext("2d");
      g.scale(dpr, dpr);
      var c = T.color || 0x8a6bff,
        cr = (c >> 16) & 255,
        cg = (c >> 8) & 255,
        cb2 = c & 255,
        col = function (a, k) {
          k = k || 1;
          return "rgba(" + Math.min(255, Math.round(cr * k)) + "," + Math.min(255, Math.round(cg * k)) + "," + Math.min(255, Math.round(cb2 * k)) + "," + a + ")";
        },
        cx = W / 2,
        cy = H / 2,
        R = Math.hypot(W, H) / 2 + 20,
        t0 = performance.now(),
        D = 1050,
        st = [];
      for (var i = 0; i < 70; i++) st.push({ a: Math.random() * 6.2832, z: Math.random(), w: 1 + Math.random() * 2 });
      var fr = function (now) {
        if (done) return;
        var p = Math.max(0, Math.min(1, (now - t0) / D)), // 첫 장면에 now가 t0보다 조금 이르면 반지름이 음수가 되어 오류(arc)
          o = 1 - Math.pow(1 - Math.min(1, p / 0.5), 3), // 소용돌이가 열리는 정도
          rv = R * (0.12 + 1.05 * o),
          rot = p * p * 9;
        g.clearRect(0, 0, W, H);
        g.save();
        g.beginPath();
        g.arc(cx, cy, rv, 0, 6.2832);
        g.clip();
        var bg = g.createRadialGradient(cx, cy, 0, cx, cy, rv);
        bg.addColorStop(0, "rgba(255,250,235,1)");
        bg.addColorStop(0.12, "rgba(190,170,255,1)");
        bg.addColorStop(0.4, "rgba(40,22,96,1)");
        bg.addColorStop(0.8, col(1, 0.7));
        bg.addColorStop(1, col(1, 1.15));
        g.fillStyle = bg;
        g.fillRect(cx - rv, cy - rv, rv * 2, rv * 2);
        // 나선 팔: 가운데로 감겨 들어가며 돈다
        g.lineCap = "round";
        for (var k = 0; k < 5; k++) {
          g.beginPath();
          for (var j = 0; j <= 28; j++) {
            var q = j / 28,
              ang = rot + (k * 6.2832) / 5 + q * 4.2,
              rr = rv * Math.pow(q, 1.6);
            j ? g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr) : g.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
          }
          g.strokeStyle = k % 2 ? col(0.55, 1.3) : "rgba(255,255,255,0.35)";
          g.lineWidth = 10 + 26 * o;
          g.stroke();
        }
        // 별빛 줄: 가운데에서 밖으로 쏟아진다(앞으로 날아가는 느낌)
        for (var s2 of st) {
          var z = (s2.z + p * 1.6) % 1,
            r1 = rv * z * z,
            r2 = rv * Math.min(1, z * z + 0.04 + 0.25 * p),
            a2 = s2.a + rot * 0.3;
          g.beginPath();
          g.moveTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1);
          g.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
          g.strokeStyle = "rgba(255,255,255," + (0.35 + 0.6 * z) + ")";
          g.lineWidth = s2.w * (0.5 + z);
          g.stroke();
        }
        g.restore();
        // 소용돌이 가장자리 빛 테
        if (o < 1) {
          g.beginPath();
          g.arc(cx, cy, rv, 0, 6.2832);
          g.strokeStyle = col(0.9, 1.25);
          g.lineWidth = 14;
          g.stroke();
        }
        // 마지막에 하얗게 번쩍
        if (p > 0.78) {
          g.fillStyle = "rgba(255,255,255," + Math.min(1, (p - 0.78) / 0.2) + ")";
          g.fillRect(0, 0, W, H);
        }
        if (p < 1) requestAnimationFrame(fr);
        else fin();
      };
      requestAnimationFrame(fr);
    } catch (e) {
      fin();
    }
  }

  var ask = null,
    askOpen = 0,
    skip = null;

  // ---------- 꿈빛 성 본관 문 (2026-11-19, 성탈출탐정) ----------
  // 성 마당으로 들어가 본관 문 앞까지 걸어오면 "들어갈까요?" → 포털과 같은 소용돌이 장면 → games/castle.html(꿈빛 성 탐정단)
  // 문 안 소용돌이 모양은 plaza_inject.py가 넣은 window.CASTLE_DOOR(성탈출탐정/plaza_door.js). 여기서는 가까울수록 열고 돌린다
  var CASTLE = { name: "꿈빛 성 탐정단", emoji: "🏰", goal: "친구들과 탐정이 되어 성의 수수께끼를 풀고 꼭대기 다락방까지 올라가요! (혼자도 할 수 있어요)", ext: "games/castle.html", color: 0xb197fc, x: 0, z: -45.25 };
  var cAsk = false,
    cSkip = false,
    cLast = 0;
  function castleGlow(S, Y) {
    var D = window.CASTLE_DOOR,
      now = performance.now(),
      dt = cLast ? Math.min(0.1, (now - cLast) / 1000) : 0;
    cLast = now;
    if (!D) return;
    var d = Math.hypot(Y.x - CASTLE.x, Y.z - CASTLE.z),
      nt = S.loc === "village" && !Y.hidden ? Math.max(0, Math.min(1, (6.5 - d) / 3)) : 0;
    D.u.uNear.value += (nt - D.u.uNear.value) * Math.min(1, dt * 2.5);
    D.u.uSpin.value += dt * (1 + 0.6 * D.u.uNear.value);
    D.m.visible = D.u.uNear.value > 0.004;
  }
  // 묻는 중이면 true(그동안 포털은 묻지 않아요)
  function castleTick(G, S, Y, ok) {
    var d = Math.hypot(Y.x - CASTLE.x, Y.z - CASTLE.z);
    if (cAsk) {
      if (!ok || d > 2.6) {
        cAsk = false;
        G.fns.$i();
      }
      return true;
    }
    if (cSkip && d > 2.6) cSkip = false;
    if (!ok || cSkip || d > 1.35 || ask || G.ve.st === "fading") return false;
    var card = document.getElementById("card");
    if (!card || !card.hidden) return false;
    cAsk = true;
    G.fns.sa(CASTLE.emoji + " " + CASTLE.name, "들어갈까요?", "<div>" + CASTLE.goal + "</div>", [
      {
        label: "아니요",
        fn: function () {
          cAsk = false;
          cSkip = true;
          G.fns.$i();
        },
      },
      {
        label: "🚪 들어가기",
        main: true,
        fn: function () {
          cAsk = false;
          G.fns.$i();
          try {
            G.ht.whoosh();
          } catch (e) {}
          warp(CASTLE, function () {
            window.PLAZA_GAMES.go(CASTLE);
          });
        },
      },
    ]);
    return true;
  }
  // ---------- 명소 입구 4곳 (2026-11-20): 소원 우물·마법사 탑·버섯 집·반짝 등대 호숫가 → 새 게임 4개 ----------
  // 문 모양·자리는 plaza_inject.py가 넣은 window.PLAZA_DOORS(캐릭터3D/pipeline/plaza_doors.js). 가까이 가면 소용돌이가 열리고, 문 앞에서 "들어갈까요?"
  // 게임 파일은 games/ 안(원본은 games/원본_*.html, back.js·uriban_bridge.js를 붙인 것은 캐릭터3D/pipeline/uriban_inject.py가 만듦)
  var COOP = "둘이서 해요. 각자 패드로 방 번호(숫자 4자리)를 맞춰 만나요. 한 패드로도 해 볼 수 있어요.";
  var DOORS = [
    { key: "pyramid", name: "피라미드 대탈출", emoji: "🏺", goal: "우물 속 피라미드로 쑥 떨어져요! 큰 돌을 탄 미라를 피해 출구까지 달려요. 상자에서는 피라미드 옷이 나와요.", ext: "games/pyramid_run.html", color: 0xffc37a, params: { play: "" }, acc: "pyramid", noChar: true, wish: true },   // noChar: 피라미드는 char=0/1(사랑둥이/왕자)이라 광장 동물 이름을 넘기면 고른 왕자가 풀림 · wish: 소원 우물이라 카드에 소원 빌기도
    { key: "giant", name: "거인과 꼬마", emoji: "👣", goal: "거인은 무거운 것을 옮기고, 꼬마는 작은 구멍으로 들어가요. " + COOP, ext: "games/giant.html", color: 0xb197fc },
    { key: "jelly", name: "젤리와 팡", emoji: "🍯", goal: "꿀젤리와 불꽃 친구가 힘을 합쳐 꿀나무 마을을 지나가요. " + COOP, ext: "games/jelly.html", color: 0xffc94d },
    { key: "magnet", name: "자석 친구", emoji: "🧲", goal: "빨강 N과 파랑 S 자석이 서로 당기고 밀며 얼음 성까지 가요. " + COOP, ext: "games/magnet.html", color: 0x8ec5ff },
  ];
  // 광장 옷 → 피라미드 꾸미기(피라미드는 자기 꾸미기 14가지만 입힘). 거꾸로(피라미드 → 광장)는 games/uriban_bridge.js
  var PYR_ACC = { bow: "ribbon", flower_crown: "flower", sunglasses: "glasses", cat_ears: "cat", magician_hat: "magic", grad_cap: "grad", star_antenna: "antenna", egg_hat: "egg", pharaoh_nemes: "nemes", halo: "halo", kinball_hat: "minikin", backpack_mint: "backpack", cape_red: "cape", butterfly_wings: "butterfly" };
  var dAsk = null,
    dSkip = null,
    dLast = 0;
  function doorsGlow(S, Y) {
    var P = window.PLAZA_DOORS,
      now = performance.now(),
      dt = dLast ? Math.min(0.1, (now - dLast) / 1000) : 0;
    dLast = now;
    if (!P) return;
    for (var i = 0; i < DOORS.length; i++) {
      var D = P[DOORS[i].key];
      if (!D) continue;
      var d = Math.hypot(Y.x - D.x, Y.z - D.z),
        nt = S.loc === "village" && !Y.hidden ? Math.max(0, Math.min(1, (6.5 - d) / 3)) : 0;
      D.u.uNear.value += (nt - D.u.uNear.value) * Math.min(1, dt * 2.5);
      D.u.uSpin.value += dt * (1 + 0.6 * D.u.uNear.value);
      D.m.visible = D.u.uNear.value > 0.004;
    }
  }
  // 묻는 중이면 true(그동안 포털·성 문은 묻지 않아요)
  function doorsTick(G, S, Y, ok) {
    var P = window.PLAZA_DOORS;
    if (!P) return false;
    if (dAsk) {
      var A = P[dAsk.key];
      if (!ok || !A || Math.hypot(Y.x - A.x, Y.z - A.z) > A.r + 1.3) {
        dAsk = null;
        G.fns.$i();
      }
      return true;
    }
    var best = null,
      bd = 1e9;
    for (var i = 0; i < DOORS.length; i++) {
      var T = DOORS[i],
        D = P[T.key];
      if (!D) continue;
      var d = Math.hypot(Y.x - D.x, Y.z - D.z);
      if (dSkip === T && d > D.r + 1.3) dSkip = null;
      if (d <= D.r && d < bd && dSkip !== T) {
        best = T;
        bd = d;
      }
    }
    if (!ok || !best || ask || G.ve.st === "fading") return false;
    var card = document.getElementById("card");
    if (!card || !card.hidden) return false;
    dAsk = best;
    var btns = [
      {
        label: "아니요",
        fn: function () {
          dSkip = dAsk;
          dAsk = null;
          G.fns.$i();
        },
      },
    ];
    // 소원 우물: 원래 있던 '소원 빌기'와 같은 자리라 두 가지를 한 창에서 고르게(검토: 소원 빌러 온 아이에게 게임 창만 떴다)
    if (best.wish)
      btns.push({
        label: "🪙 소원 빌기",
        fn: function () {
          dSkip = dAsk;
          dAsk = null;
          G.fns.$i();
          var a = document.getElementById("act");
          if (a) a.click();
        },
      });
    G.fns.sa(best.emoji + " " + best.name, "들어갈까요?", "<div>" + best.goal + "</div>", btns.concat([
      {
        label: "🚪 들어가기",
        main: true,
        fn: function () {
          var T = dAsk;
          dAsk = null;
          G.fns.$i();
          try {
            G.ht.whoosh();
          } catch (e) {}
          warp(T, function () {
            window.PLAZA_GAMES.go(T);
          });
        },
      },
    ]));
    return true;
  }
  function closeAsk(G) {
    if (!ask) return;
    ask.open = askOpen;
    ask = null;
    G.fns.$i();
  }

  window.PLAZA_GAMES = {
    list: LIST,
    castle: CASTLE,
    doors: DOORS,
    // 광장이 켜질 때 포탈 이름표를 게임 이름으로 바꿔요
    applyTe: function (Te) {
      for (var k in LIST) {
        var T = Te[+k],
          g = LIST[k];
        if (!T) continue;
        T.name = g.name;
        T.emoji = g.emoji;
        T.modeName = g.modeName;
        T.goal = g.goal;
        T.ext = g.url;
        T.mode = "solo"; // 각자 기기에서 해요(선생님 기기는 광장에 남아요)
      }
    },
    // 포탈에 들어갈 때: 게임 페이지로 이동하면 true
    enter: function (T, ve, ht, fade) {
      if (!T || !T.ext || ve.st !== "rush") return false;
      ve.st = "fading";
      try {
        ht.whoosh();
      } catch (e) {}
      warp(T, function () {
        window.PLAZA_GAMES.go(T);
      });
      return true;
    },
    // 포탈을 지나가면 "들어갈까요?"를 물어봐요 (선생님이 문을 열지 않아도)
    tick: function () {
      var N = window.NET;
      if (!N || !N.G) return;
      var G = N.G,
        S = G.S,
        Y = G.Y;
      castleGlow(S, Y); // 성 문 소용돌이는 선생님 화면에서도
      doorsGlow(S, Y); // 명소 입구 4곳도
      if (N.online && N.role === "teacher") return; // 선생님 기기는 묻지 않아요
      var ok = S.loc === "village" && !S.deco && (S.mode === "free" || S.mode === "gather" || S.mode === "rush");
      if (castleTick(G, S, Y, ok)) return;
      if (doorsTick(G, S, Y, ok)) return;
      // 포탈을 '지나갈 때'만 물어봐요: 광장 쪽(문 앞)에서 걸어와 두 기둥 사이로 문 가운데 선을 넘으면.
      // 문 근처에 서 있거나 옆을 지나가기만 해서는 묻지 않아요. (기둥은 문 가운데에서 옆으로 1.45칸)
      var best = null,
        bi = -1,
        bd = 1e9;
      for (var i = 0; i < G.Te.length; i++) {
        var T = G.Te[i];
        if (!T.ext) continue;
        var dx = Y.x - T.gx,
          dz = Y.z - T.gz,
          sF = dx * T.fx + dz * T.fz, // + 문 앞(광장 쪽), - 문 안쪽
          sL = dx * T.fz - dz * T.fx, // 옆으로 비켜 선 거리
          was = T._passS;
        T._passS = sF;
        var d = Math.hypot(dx, dz);
        if (ask === T) bd = d;
        if (ok && was !== undefined && was > 0.05 && sF <= 0.05 && sF > -1.6 && Math.abs(sL) < 1.15) {
          best = T;
          bi = i;
        }
      }
      var card = document.getElementById("card");
      if (ask) {
        // 묻는 중에 문에서 멀어지면 창을 닫아요
        if (!ok || bd > 3) closeAsk(G);
        return;
      }
      if (!best) return;
      if (G.ve.st === "fading") return;
      // 선생님이 연 문이면 묻지 않고 바로 들어가요
      if (S.mode === "rush" && G.ve.wi === bi && G.ve.st === "rush") {
        G.fns.cc();
        return;
      }
      if (!card || !card.hidden) return;
      ask = best;
      askOpen = best.open;
      best.open = 1;
      G.fns.sa(best.emoji + " " + best.name, "들어갈까요?", "<div>" + best.goal + "</div>", [
        {
          label: "아니요",
          fn: function () {
            skip = ask;
            closeAsk(G);
          },
        },
        {
          label: "🚪 들어가기",
          main: true,
          fn: function () {
            var T = ask;
            ask = null;
            G.fns.$i();
            try {
              G.ht.whoosh();
            } catch (e) {}
            warp(T, function () {
              window.PLAZA_GAMES.go(T);
            });
          },
        },
      ]);
    },
    go: function (T) {
      var u = new URL(T.ext, location.href);
      u.searchParams.set("from", "plaza");
      u.searchParams.set("back", backUrl());
      if (T.params) for (var pk in T.params) u.searchParams.set(pk, T.params[pk]); // 예: 피라미드 ?play(처음 화면 없이 떨어지는 장면부터)
      if (window.NET && NET.online && NET.name) u.searchParams.set("name", NET.name);
      // 시험판: 내 캐릭터·입은 아이템을 게임에 넘기고(게임 캐릭터에 반영), 들어간 시각을 적어 둔다(1분 넘게 놀고 오면 선물 상자 뽑기)
      try {
        var ch = localStorage.getItem("plaza.char"), wr = JSON.parse(localStorage.getItem("plaza.wear") || "{}"), wl = [];
        for (var k in wr) wl.push(wr[k]);
        if (ch && ch !== "orig" && !T.noChar) u.searchParams.set("char", ch);
        if (wl.length) u.searchParams.set("wear", wl.join(","));
        // 새 게임 4개는 입은 옷을 acc로 받아요(피라미드는 자기 꾸미기 이름으로 바꿔서 입혀 줘요, 나머지는 지금은 저장만)
        if (T.acc === "pyramid") {
          var pa = [];
          wl.forEach(function (id) {
            var q = PYR_ACC[id];
            if (q && pa.indexOf(q) < 0) pa.push(q);
          });
          if (pa.length) u.searchParams.set("acc", pa.join(","));
        } else if (T.key && wl.length) u.searchParams.set("acc", wl.join(","));
        localStorage.setItem("plaza.enter", JSON.stringify({ t: Date.now(), game: T.name }));
      } catch (e) {}
      if (window.NET && NET.online) {
        u.searchParams.set(T.key ? "classroom" : "room", NET.room); // 새 게임 4개는 room이 둘이서 만날 방 번호라 반 코드는 classroom으로(back.js가 읽음)
        if (NET.ticket) u.searchParams.set("ticket", NET.ticket);
      }
      try {
        if (window.NET && NET.cloud) NET.cloud.close();
      } catch (e) {}
      location.href = u.toString();
    },
  };
})();
