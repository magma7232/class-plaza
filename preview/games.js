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
    0: { name: "오늘은 내가 요리사!", emoji: "🍙", modeName: "분식집 요리 모험", goal: "주문 카드대로 분식을 만들어요!", url: "games/jangteo3d.html", wid: "jangteo3d" },
    1: { name: "하트 특공대", emoji: "💖", modeName: "동화 마을 지키기", goal: "투덜이들을 웃게 만들어요!", url: "games/heart.html", wid: "heart" },
    2: { name: "사랑둥이 대모험", emoji: "🎈", modeName: "혼자 모험", goal: "베개 공주와 자 왕자를 구해요!", url: "games/sarang/index.html", wid: "sarang" },
  };

  function backUrl() {
    var u = new URL(location.href);
    u.hash = "";
    u.searchParams.set("back", "1");
    return u.toString();
  }

  // 포털에 들어갈 때(2026-11-25 다시 만듦, 선생님: "정말 게임에 들어간다 '우와~' 하는 느낌"):
  //  ① 카메라가 문 쪽으로 쑥 다가가며 화각이 넓어짐(빨려 드는 느낌) — 광장 카메라 손잡이 window.PLZ_CAM(plaza_inject.py)
  //  ② 문 속 빛 터널(포털과 같은 portalFx 셰이더)이 문 자리에서 화면 가득 커짐 → 빛 줄기가 점점 빨라짐
  //  ③ 하얗게 번쩍 → cb(게임으로). 모두 약 1.25초. WebGL이 안 되면 예전 2D 그림 장면(warp2d)
  //  낡은 패드: 화면 절반쯤 해상도로 그리고(화질이 낮아진 기기는 더 작게), 셰이더 하나·그림 파일 없음
  function focusOf(T) {
    try {
      var m = null, cx = 0, cy = 0, hh = 1;
      if (T === CASTLE) { m = window.CASTLE_DOOR && window.CASTLE_DOOR.m; cy = 1.25; hh = 1.1; }
      else if (T.key && window.PLAZA_DOORS && window.PLAZA_DOORS[T.key]) { var D = window.PLAZA_DOORS[T.key]; m = D.m; cx = D.c ? D.c[0] : 0; cy = D.c ? D.c[1] : 0.74; hh = D.hh || 0.8; }
      else if (T.portal) { m = T.portal; cy = 2.0; hh = 1.7; }
      if (!m || !m.matrixWorld) return null;
      var e = m.matrixWorld.elements;
      return { x: e[0] * cx + e[4] * cy + e[12], y: e[1] * cx + e[5] * cy + e[13], z: e[2] * cx + e[6] * cy + e[14], ux: e[4] * hh, uy: e[5] * hh, uz: e[6] * hh };
    } catch (er) { return null; }
  }
  function proj(F, x, y, z) {
    var v = F.matrixWorldInverse.elements, P = F.projectionMatrix.elements;
    var a = v[0] * x + v[4] * y + v[8] * z + v[12], b = v[1] * x + v[5] * y + v[9] * z + v[13], c = v[2] * x + v[6] * y + v[10] * z + v[14];
    var px = P[0] * a + P[4] * b + P[8] * c + P[12], py = P[1] * a + P[5] * b + P[9] * c + P[13], pw = P[3] * a + P[7] * b + P[11] * c + P[15];
    if (pw <= 0.05) return null;
    return { x: (px / pw * 0.5 + 0.5) * innerWidth, y: (0.5 - py / pw * 0.5) * innerHeight };
  }
  var WARP_FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",   // 16비트(mediump)면 잡음이 납작해져 빛 줄기가 사라짐(검토)
    "uniform vec2 uRes; uniform vec2 uC; uniform float uR; uniform float uS; uniform float uT; uniform float uSpd; uniform float uFl; uniform vec3 uCol;",
    "", // ← PORTAL_GLSL
    "void main(){",
    "  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);",
    "  float d = length(px - uC);",
    "  vec2 qq = (px - uC) / uS; qq.y = -qq.y;",
    "  float eg = (uR - d) / uS;",
    "  vec4 c = portalFx(qq, eg, 1.0, uT, uCol, 1.0);",
    "  float rn = length(qq), an = atan(qq.y, qq.x) / 6.2832 + 0.5, dep = 0.34 / (rn + 0.07);",
    "  float ln = smoothstep(0.72, 1.0, pfN(vec2(an * 64.0, dep * 0.22 + uT * 1.5), 64.0)) * smoothstep(0.12, 0.55, rn) * uSpd;",
    "  vec3 col = mix(c.rgb, vec3(1.0), ln * 0.85);",
    "  col = mix(col, vec3(1.0, 0.99, 0.96), smoothstep(0.45 * (1.0 - uFl), 0.0, rn) * uSpd * 0.6);",
    "  float a = smoothstep(uR, uR - 3.0, d);",
    "  float halo = exp(-max(0.0, d - uR) / (uS * 0.16 + 4.0)) * (1.0 - a);",   // 문 밖으로 번지는 빛
    "  col = mix(mix(uCol, vec3(1.0), 0.6), col, a); a = max(a, halo * 0.6);",
    "  col = mix(col, vec3(1.0), uFl); a = max(a, uFl);",
    "  gl_FragColor = vec4(col * a, a);",
    "}"];
  function warp(T, cb) {
    // 배경 음악(music/music.js)은 소용돌이 속으로 날아가는 동안 천천히 작아져요(포털·꿈빛 성 문 모두)
    try { if (window.BGM) BGM.stop(0.9); } catch (e) {}
    var done = false, cv = null, raf = 0, st = { F: null };
    function cleanup() {
      window.PLZ_CAM = null;
      try { if (st.F && st.fov0) { st.F.fov = st.fov0; st.F.updateProjectionMatrix(); } } catch (e) {}
      if (raf) cancelAnimationFrame(raf);
      if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
      try { var lx = gl && gl.getExtension("WEBGL_lose_context"); if (lx) lx.loseContext(); } catch (e) {} // 낡은 안드로이드는 WebGL 판이 16개쯤까지라 바로 돌려줌
    }
    function fin() {
      if (done) return;
      done = true;
      cb();
      // 게임으로 넘어간 뒤 브라우저 '뒤로'로 페이지가 그대로 되살아나면 하얀 막·카메라가 남지 않게
      window.addEventListener("pageshow", cleanup, { once: true });
    }
    setTimeout(fin, 1900 * (window.__WARP_SLOW || 1)); // 탭이 숨겨져 그림이 멈춰도 넘어가요
    var gl = null, W = innerWidth, H = innerHeight;
    try {
      if (!window.PORTAL_GLSL) throw 0;
      var q = window.PLZ_Q || 1, sc = q < 0.7 ? 0.45 : 0.62; // 그리는 해상도(화면 글자 크기 기준): 빛 터널은 원래 흐릿해서 작게 그려도 같아 보여요
      cv = document.createElement("canvas");
      cv.width = Math.max(64, Math.round(W * sc));
      cv.height = Math.max(64, Math.round(H * sc));
      cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:99999;pointer-events:none";
      gl = cv.getContext("webgl", { premultipliedAlpha: true, antialias: false, depth: false, alpha: true });
      if (!gl) throw 0;
      var mk = function (t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      var fs = WARP_FS.slice(); fs[2] = window.PORTAL_GLSL;
      var pr = gl.createProgram();
      gl.attachShader(pr, mk(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}"));
      gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs.join("\n")));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw 0;
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var lo = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(lo);
      gl.vertexAttribPointer(lo, 2, gl.FLOAT, false, 0, 0);
      var U = {};
      ["uRes", "uC", "uR", "uS", "uT", "uSpd", "uFl", "uCol"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
      var c = T.color || 0x8a6bff;
      gl.uniform3f(U.uCol, ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.viewport(0, 0, cv.width, cv.height);
      document.body.appendChild(cv);
    } catch (e) {
      if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
      cv = null;
      return warp2d(T, fin);
    }
    // ① 카메라: 문 가운데를 보며 80%까지 다가가고 화각은 넓게(땅이 둥글게 휜 만큼 문 높이를 맞춰요)
    var SL = window.__WARP_SLOW || 1; // 점검용: 장면을 느리게(사진으로 순간순간 보려고)
    var fp = focusOf(T), t0 = performance.now(), last = t0, tt = 3.0, diag = Math.hypot(W, H), now0 = function () { return t0 + (performance.now() - t0) / SL; };
    var scr = { x: W / 2, y: H / 2, r: Math.min(W, H) * 0.08 };
    if (fp) {
      window.PLZ_CAM = function (F, dt, J) {
        if (done) return;
        st.F = F;
        var bend = function (x, y, z) { var dz = z - J.uCurveZ.value; return y - J.uCurve.value * dz * dz; };
        if (!st.p0) { st.p0 = { x: F.position.x, y: F.position.y, z: F.position.z }; st.fov0 = F.fov; }
        var k = Math.min(1, (now0() - t0) / 700);
        k = k * k * (3 - 2 * k);
        var fy = bend(fp.x, fp.y, fp.z), p0 = st.p0, m = 0.78 * k;
        F.position.set(p0.x + (fp.x - p0.x) * m, p0.y + (fy - p0.y) * m, p0.z + (fp.z - p0.z) * m);
        F.lookAt(fp.x, fy, fp.z);
        F.fov = st.fov0 + 24 * k;
        F.updateProjectionMatrix();
        F.updateMatrixWorld();
        F.matrixWorldInverse.copy(F.matrixWorld).invert();
        var a = proj(F, fp.x, fy, fp.z), b = proj(F, fp.x + fp.ux, bend(fp.x + fp.ux, fp.y + fp.uy, fp.z + fp.uz), fp.z + fp.uz);
        if (a) { scr.x = a.x; scr.y = a.y; if (b) scr.r = Math.max(18, Math.hypot(b.x - a.x, b.y - a.y)); }
      };
    }
    try { NET.G.ht.portal(); } catch (e) {} // 띠리링(포털 소리, 소리를 껐으면 안 남)
    var D = 1250;
    var fr = function (now) {
      if (done) return;
      now = now0();
      var t = Math.max(0, now - t0), dt = Math.min(0.1, Math.max(0, now - last) / 1000);
      last = now;
      var g = Math.min(1, Math.max(0, (t - 140) / 560)); // ② 문 → 화면 가득
      g = g * g * g;
      var spd = Math.min(1, Math.max(0, (t - 300) / 650));
      spd = spd * spd * (3 - 2 * spd);
      tt += dt * (1.2 + 9 * spd);
      var R = scr.r + (diag * 0.75 - scr.r) * g, cx = scr.x + (W / 2 - scr.x) * g, cy = scr.y + (H / 2 - scr.y) * g;
      var S = Math.min(R, Math.min(W, H) * 0.62), fl = Math.min(1, Math.max(0, (t - 960) / 230));
      var k = cv.width / W;
      gl.uniform2f(U.uC, cx * k, cy * k);
      gl.uniform1f(U.uR, R * k);
      gl.uniform1f(U.uS, S * k);
      gl.uniform1f(U.uT, tt);
      gl.uniform1f(U.uSpd, spd);
      gl.uniform1f(U.uFl, fl * fl);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < D) raf = requestAnimationFrame(fr);
      else fin();
    };
    raf = requestAnimationFrame(fr);
  }

  // WebGL이 안 되는 기기용: 예전 2D 그림 소용돌이 장면(약 1초)
  function warp2d(T, cb) {
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
        bg.addColorStop(0.4, "rgba(214,200,255,1)");
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
    skip = null,
    tLast = 0;

  // ---------- 꿈빛 성 본관 문 (2026-11-19, 성탈출탐정) ----------
  // 성 마당으로 들어가 본관 문 앞까지 걸어오면 "들어갈까요?" → 포털과 같은 소용돌이 장면 → games/castle.html(꿈빛 성 탐정단)
  // 문 안 소용돌이 모양은 plaza_inject.py가 넣은 window.CASTLE_DOOR(성탈출탐정/plaza_door.js). 여기서는 가까울수록 열고 돌린다
  var CASTLE = { name: "꿈빛 성 탐정단", emoji: "🏰", goal: "성의 수수께끼를 풀어요! (혼자도, 친구랑도)", ext: "games/castle.html", color: 0xb197fc, x: 0, z: -45.25, wid: "castle" };
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
      nt = S.loc === "village" && !Y.hidden && wOpen(CASTLE) ? Math.max(0, Math.min(1, (6.5 - d) / 3)) : 0;
    D.u.uNear.value += (nt - D.u.uNear.value) * Math.min(1, dt * 2.5);
    D.u.uSpin.value += dt * (1 + 0.6 * D.u.uNear.value);
    D.m.visible = D.u.uNear.value > 0.004;
  }
  // 묻는 중이면 true(그동안 포털은 묻지 않아요)
  function castleTick(G, S, Y, ok) {
    var d = Math.hypot(Y.x - CASTLE.x, Y.z - CASTLE.z);
    if (cAsk) {
      if (!ok || d > 2.6 || !wOpen(CASTLE)) {
        cAsk = false;
        G.fns.$i();
      }
      return true;
    }
    if (cSkip && d > 2.6) cSkip = false;
    if (!wOpen(CASTLE)) return !ask && lockedTick(G, CASTLE, d, 1.35, ok);
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
  // ---------- 명소 입구 4곳 (2026-11-20): 소원 우물·마법사 탑·버섯 집·반짝 등대 호숫가 → 새 게임 4개 + 바람 풍차 → 하트섬 원정대(2026-11-24) ----------
  // 문 모양·자리는 plaza_inject.py가 넣은 window.PLAZA_DOORS(캐릭터3D/pipeline/plaza_doors.js). 가까이 가면 소용돌이가 열리고, 문 앞에서 "들어갈까요?"
  // 게임 파일은 games/ 안(원본은 games/원본_*.html, back.js·uriban_bridge.js를 붙인 것은 캐릭터3D/pipeline/uriban_inject.py가 만듦)
  var COOP = "둘이서 방 번호 4자리로 만나요.";
  var DOORS = [
    { key: "pyramid", name: "피라미드 대탈출", emoji: "🏺", goal: "미라를 피해 출구까지 달려요!", ext: "games/pyramid_run.html", wid: "pyramid_run", color: 0xffc37a, params: { play: "" }, acc: "pyramid", noChar: true, wish: true },   // noChar: 피라미드는 char=0/1(사랑둥이/왕자)이라 광장 동물 이름을 넘기면 고른 왕자가 풀림 · wish: 소원 우물이라 카드에 소원 빌기도
    { key: "giant", name: "거인과 꼬마", emoji: "👣", goal: "거인과 꼬마가 힘을 합쳐요. " + COOP, ext: "games/giant.html", wid: "giant", color: 0xb197fc },
    { key: "jelly", name: "젤리와 팡", emoji: "🍯", goal: "꿀젤리와 불꽃 친구가 힘을 합쳐요. " + COOP, ext: "games/jelly.html", wid: "jelly", color: 0xffc94d },
    { key: "magnet", name: "자석 친구", emoji: "🧲", goal: "N과 S 자석이 당기고 밀어요. " + COOP, ext: "games/magnet.html", wid: "magnet", color: 0x8ec5ff },
    { key: "island", name: "하트섬 원정대", emoji: "😈", goal: "그림자 악마둥이를 찾아가요! (친구 6명까지)", ext: "games/island.html", wid: "island", color: 0xff7ab8 },   // 마지막 보스(2026-11-24, 하트섬원정대/)
    { key: "escape", name: "사랑둥이 방탈출", emoji: "💗", goal: "문제를 맞혀 하트 열쇠를 찾고 탈출해요! (친구 4명까지)", ext: "games/escape.html", wid: "escape", color: 0xff8fb7 },   // 시계탑 문(2026-11-24, 사랑둥이방탈출/)
  ];
  // 광장 옷 → 피라미드 꾸미기(피라미드는 자기 꾸미기 14가지만 입힘). 거꾸로(피라미드 → 광장)는 games/uriban_bridge.js
  var PYR_ACC = { bow: "ribbon", flower_crown: "flower", sunglasses: "glasses", cat_ears: "cat", magician_hat: "magic", grad_cap: "grad", star_antenna: "antenna", egg_hat: "egg", pharaoh_nemes: "nemes", halo: "halo", kinball_hat: "minikin", backpack_mint: "backpack", cape_red: "cape", butterfly_wings: "butterfly" };
  // ---------- 월드 잠금(2026-11-25, worlds.js): 월드 이름(wid) = 게임 파일 이름(back.js가 '끝까지 깼다'를 이 이름으로 알려 줌) ----------
  // 순서대로 모드의 차례 = 이야기 순서(이야기장면/README.md: 1화 사랑둥이 → 하트 특공대 → 젤리와 팡 → 거인과 꼬마 → 자석 친구 → 피라미드 → 7화 뚝딱 장터 → 번외 꿈빛 성·방탈출 → 마지막 화 하트섬)
  var ORDER = ["sarang", "heart", "jelly", "giant", "magnet", "pyramid_run", "jangteo3d", "castle", "escape", "island"];
  function worldsList() {
    var out = [], G = window.NET && NET.G;
    for (var k in LIST) {
      var T = G && G.Te ? G.Te[+k] : null;
      out.push({ wid: LIST[k].wid, name: LIST[k].name, emoji: LIST[k].emoji, color: T ? T.color : 0xffc94d, T: T || LIST[k] });
    }
    out.push({ wid: CASTLE.wid, name: CASTLE.name, emoji: CASTLE.emoji, color: CASTLE.color, T: CASTLE });
    DOORS.forEach(function (D) { out.push({ wid: D.wid, name: D.name, emoji: D.emoji, color: D.color, T: D }); });
    out.sort(function (a, b) { var i = ORDER.indexOf(a.wid), j = ORDER.indexOf(b.wid); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return out;
  }
  function wOpen(T) { return !T || !T.wid || !window.PLAZA_WORLDS || window.PLAZA_WORLDS.isOpen(T.wid); }
  // 잠긴 문 사슬을 붙일 자리: 문 소용돌이 판(m)과 그 안의 가운데·크기(판 좌표)
  function hostOf(T) {
    if (!T) return null;
    if (T === CASTLE) return window.CASTLE_DOOR ? { m: window.CASTLE_DOOR.m, cx: 0, cy: 1.2, w: 1.35, h: 2.3 } : null;
    if (T.key && window.PLAZA_DOORS && window.PLAZA_DOORS[T.key]) {
      var D = window.PLAZA_DOORS[T.key], c = D.c || [0, 0.74], hh = D.hh || 0.8, hw = D.hw || 0.45;
      return T.key === "pyramid" ? { m: D.m, cx: 0, cy: 0, w: 1.6, h: 1.6, sq: 1 } : { m: D.m, cx: c[0], cy: c[1], w: hw * 2.3, h: hh * 2.1 };
    }
    if (T.portal) return { m: T.portal, cx: 0, cy: 1.95, w: 2.6, h: 3.6 };
    return null;
  }
  var lockSkip = null,
    lockShown = null; // 지금 떠 있는 잠김 창 {x, z, r}: 멀어지면 저절로 닫음(묻는 창과 같게)
  function lockAway(G, Y) {
    if (!lockShown) return;
    var card = document.getElementById("card");
    if (lockShown.T && wOpen(lockShown.T) && card && !card.hidden && card.getAttribute("data-wlock") === "1") lockShown.x = 1e9; // 보는 사이 열리면 창 닫기
    if (!card || card.hidden || card.getAttribute("data-wlock") !== "1" || (card.textContent || "").indexOf("아직 잠겨") < 0) { lockShown = null; if (card) card.removeAttribute("data-wlock"); return; }
    if (Math.hypot(Y.x - lockShown.x, Y.z - lockShown.z) > lockShown.r + 2.2 || G.S.loc !== "village") {
      lockShown = null;
      card.removeAttribute("data-wlock");
      G.fns.$i();
    }
  }
  // 잠긴 문 앞에 오면(묻는 거리) 한 번 알려 줌. 멀어졌다 다시 오면 또. 알려 주는 중이면 true
  function lockedTick(G, T, d, near, ok) {
    if (lockSkip === T) { if (d > near + 1.3) lockSkip = null; return false; }
    if (!ok || d > near || G.ve.st === "fading") return false;
    var card = document.getElementById("card");
    if (!card || !card.hidden) return false;
    lockSkip = T;
    var wl = worldsList(), w = null;
    for (var i = 0; i < wl.length; i++) if (wl[i].wid === T.wid) w = wl[i];
    if (w && window.PLAZA_WORLDS) {
      PLAZA_WORLDS.lockedCard(G, w, function () { lockShown = null; card.removeAttribute("data-wlock"); });
      var Y = G.Y, P = window.PLAZA_DOORS;
      lockShown = T === CASTLE ? { x: CASTLE.x, z: CASTLE.z, r: near } : T.key && P && P[T.key] ? { x: P[T.key].x, z: P[T.key].z, r: near } : T.gx != null ? { x: T.gx, z: T.gz, r: 1.5 } : { x: Y.x, z: Y.z, r: 1 };
      lockShown.T = T;
      card.setAttribute("data-wlock", "1");
    }
    try { G.ht.beep(false); } catch (e) {}
    return true;
  }
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
        nt = S.loc === "village" && !Y.hidden && wOpen(DOORS[i]) ? Math.max(0, Math.min(1, (6.5 - d) / 3)) : 0;
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
      if (!ok || !A || Math.hypot(Y.x - A.x, Y.z - A.z) > A.r + 1.3 || !wOpen(dAsk)) {
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
      if (!wOpen(T)) { if (!ask && !best && lockedTick(G, T, d, D.r, ok)) return true; continue; }
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
    warpTo: warp, // 점검용(tests/portal_look.mjs)
    worlds: worldsList, // 월드 목록(순서대로 모드 차례, worlds.js)
    hostOf: hostOf,
    isOpen: wOpen,
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
        T.wid = g.wid;
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
      var wnow = performance.now(), wdt = tLast ? Math.min(0.1, (wnow - tLast) / 1000) : 0;
      tLast = wnow;
      if (window.PLAZA_WORLDS) PLAZA_WORLDS.tick(wdt); // 잠긴 문 사슬·풀리는 반짝
      lockAway(G, Y);
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
        if (!ok || bd > 3 || !wOpen(ask)) closeAsk(G);
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
      if (!wOpen(best)) { lockSkip = null; lockedTick(G, best, 0, 1, ok); return; } // 잠긴 포털(선생님이 '다 같이 들어가기'로 연 문은 위에서 그대로 들어감)
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
      // 선생님 기기: 이야기 건너뛰기 언제나. 서버 반(선생님으로 들어옴) 또는 광장 주소 끝에 ?teacher(공개 주소처럼 서버가 없을 때)
      if (window.NET && NET.online ? NET.role === "teacher" : new URLSearchParams(location.search).has("teacher")) u.searchParams.set("teacher", "1"); // 서버 반에서는 선생님으로 들어온 기기만(월드 깬 수에서 빠지는 표시라서, 검토 3)
      try { var gq = window.PLAZA_GRADE ? window.PLAZA_GRADE() : parseInt(new URLSearchParams(location.search).get("grade"), 10) || parseInt(localStorage.getItem("plaza.grade"), 10); if (gq >= 1 && gq <= 6) u.searchParams.set("grade", String(gq)); } catch (e) {} // 학년(광장 grade.js PLAZA_GRADE = 🎓 표시와 같은 값)
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
