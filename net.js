/* 우리 반 광장 마을 · 통신 어댑터 (net.js)
 *
 * 게임과 통신을 잇는 "콘센트" 역할을 해요. 게임 코드는 이 파일의 NET.* 만 부르고,
 * 실제로 누가 편지를 배달하는지는 여기서만 정해요.
 *
 *   광장(모이기·OX 퀴즈·팀 대결·반 전체 월드) → Cloudflare 서버(CloudLink)
 *   모둠 월드(구름 빵집)                     → PeerJS로 모둠끼리 직접 연결(GroupLink)
 *                                              연결이 안 되면 그 모둠만 자동으로 Cloudflare로 전해요.
 *   혼자 월드(그림자 숲)                      → 통신 없이 각자 기기에서
 *
 * 서버가 없을 때(미리보기, 파일로 열기)는 지금처럼 가짜 친구 24명과 노는 시험판으로 켜져요.
 *
 * 다른 서비스로 옮기고 싶으면 CloudLink 의 connect/send 부분만 바꾸면 돼요.
 */
(function () {
  "use strict";

  // ----- 바꿀 수 있는 설정 -----
  var CONFIG = Object.assign(
    {
      server: "", // 비워 두면 게임이 올라간 주소를 그대로 써요
      peer: window.PEER_OPTS || {}, // PeerJS 연결 설정은 peer-config.js 에서 바꿔요. 비워 두면 PeerJS 무료 연결 서버를 써요
      sendEvery: 0.2, // 내 위치를 보내는 간격(초)
      groupWait: 10, // 모둠 방장이 친구를 기다리는 최대 시간(초)
      classWait: 12, // 반 전체·팀 대결에서 선생님 기기가 기다리는 최대 시간(초)
      p2pTimeout: 8, // PeerJS 연결을 기다리는 시간(초). 넘으면 Cloudflare로 전해요
    },
    window.NET_CONFIG || {}
  );

  var FUR = [16114632, 13011546, 15907014, 12573941, 16769162, 16448250, 12171716, 16229212, 11069129, 13482224, 9136970, 16765352];
  var SHIRT = [16739179, 5090295, 5361510, 16766011, 8675063, 16749099, 2148759, 15754645, 16777215, 3382e3];

  function $(id) {
    return document.getElementById(id);
  }
  function now() {
    return performance.now() / 1000;
  }
  function rid(n) {
    var s = "",
      c = "abcdefghijkmnopqrstuvwxyz23456789";
    for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)),
        t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function roomSlug(r) {
    return String(r || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  // ======================================================================
  // CloudLink: Cloudflare 서버와의 연결 (자동 재연결 포함)
  // ======================================================================
  function CloudLink(net) {
    this.net = net;
    this.ws = null;
    this.ready = false;
    this.wantOpen = false;
    this.retry = 0;
    this.joinMsg = null;
  }
  CloudLink.prototype.url = function (room) {
    var base = CONFIG.server || location.origin;
    return base.replace(/^http/, "ws") + "/ws?room=" + encodeURIComponent(room);
  };
  CloudLink.prototype.open = function (room, joinMsg) {
    var self = this;
    this.room = room;
    this.joinMsg = joinMsg;
    this.wantOpen = true;
    var ws;
    try {
      ws = new WebSocket(this.url(room));
    } catch (e) {
      this.net.onCloudClosed(true);
      return;
    }
    this.ws = ws;
    ws.onopen = function () {
      self.retry = 0;
      self.lastRecv = Date.now();
      self.closingSince = 0;
      ws.send(JSON.stringify(self.joinMsg));
    };
    ws.onmessage = function (ev) {
      self.lastRecv = Date.now();
      if (ev.data === "pong") return;
      var m;
      try {
        m = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (m.t === "hi") self.ready = true;
      self.net.onCloud(m);
    };
    ws.onclose = function (ev) {
      self.ready = false;
      if (self.ws !== ws) return;
      self.ws = null;
      if (ev && ev.code === 4000) return self.net.kicked(); // 다른 기기·창에서 같은 이름으로 들어옴
      if (ev && ev.code === 4001) return; // 수업 문 닫힘
      if (ev && ev.code === 1012) {
        // 선생님이 백업을 되돌렸어요: 되돌린 집으로 다시 들어와요(옛 집으로 덮어쓰지 않게)
        try {
          var u = new URL(location.href);
          u.searchParams.set("back", "1");
          location.replace(u.href);
        } catch (e) {
          location.reload();
        }
        return;
      }
      self.net.onCloudClosed(false);
      if (!self.wantOpen) return;
      var wait = Math.min(10, 1 + self.retry * 2);
      self.retry++;
      setTimeout(function () {
        if (self.wantOpen && !self.ws) self.open(self.room, self.joinMsg);
      }, wait * 1000);
    };
    ws.onerror = function () {};
    if (!this.pingTimer)
      this.pingTimer = setInterval(function () {
        var w = self.ws;
        if (!w) return;
        if (w.readyState === 1) w.send("ping");
        // 오래 아무 소식이 없으면 연결을 새로 만들어요
        if (Date.now() - (self.lastRecv || Date.now()) > 70000 || (w.readyState === 2 && Date.now() - (self.closingSince || (self.closingSince = Date.now())) > 5000)) {
          self.closingSince = 0;
          self.ws = null;
          self.ready = false;
          try {
            w.onclose = null;
            w.close();
          } catch (e) {}
          self.net.onCloudClosed(false);
          if (self.wantOpen) self.open(self.room, self.joinMsg);
        }
      }, 5000);
  };
  CloudLink.prototype.close = function () {
    this.wantOpen = false;
    if (this.ws)
      try {
        this.ws.close();
      } catch (e) {}
    this.ws = null;
  };
  CloudLink.prototype.send = function (obj) {
    if (!this.ws || this.ws.readyState !== 1 || !this.ready) return false;
    this.ws.send(JSON.stringify(obj));
    return true;
  };

  // ======================================================================
  // GroupLink: 모둠 월드용. PeerJS로 직접 연결하고, 안 되면 Cloudflare로 전해요.
  // 방장(host)이 별과 점수를 정하고, 모둠 친구들은 방장 화면을 따라가요.
  // ======================================================================
  function GroupLink(net, opts) {
    this.net = net;
    this.key = opts.key; // 모둠을 구별하는 이름
    this.isHost = opts.isHost;
    this.hostId = opts.hostId; // 방장의 반 접속 id
    this.onData = opts.onData;
    this.conns = {}; // (방장) 친구 id -> PeerJS 연결
    this.conn = null; // (친구) 방장으로 가는 PeerJS 연결
    this.p2p = false;
    this.started = now();
    this.dead = false;
    net.cloud.send({ t: "setg", g: this.key });
    this.start();
  }
  GroupLink.prototype.peerIdFor = function () {
    return ("uriban-" + hash(this.net.room) + "-" + this.key).replace(/[^a-zA-Z0-9-]/g, "-");
  };
  GroupLink.prototype.start = function () {
    var self = this;
    if (typeof window.Peer !== "function") return; // PeerJS를 못 불러오면 서버로만 전해요
    try {
      if (this.isHost) {
        this.peer = new window.Peer(this.peerIdFor(), CONFIG.peer);
        this.peer.on("connection", function (c) {
          var who = c.metadata && c.metadata.id;
          if (!who) return;
          c.on("open", function () {
            self.conns[who] = c;
            self.p2p = true;
          });
          c.on("data", function (d) {
            if (!self.dead) self.onData(d, who, "p2p");
          });
          c.on("close", function () {
            if (self.conns[who] === c) delete self.conns[who];
          });
        });
      } else {
        this.peer = new window.Peer(undefined, CONFIG.peer);
        this.peer.on("open", function () {
          self.connectToHost();
        });
      }
      this.peer.on("error", function () {
        // 방장이 아직 준비가 안 됐으면 조금 뒤에 다시 시도해요
        if (!self.isHost && !self.dead && now() - self.started < CONFIG.p2pTimeout + 20)
          setTimeout(function () {
            self.connectToHost();
          }, 1500);
      });
    } catch (e) {
      this.peer = null;
    }
  };
  GroupLink.prototype.connectToHost = function () {
    var self = this;
    if (this.dead || !this.peer || this.peer.destroyed || (this.conn && this.conn.open)) return;
    try {
      var c = this.peer.connect(this.peerIdFor(), { metadata: { id: this.net.id }, serialization: "json" });
      c.on("open", function () {
        self.conn = c;
        self.p2p = true;
      });
      c.on("data", function (d) {
        if (!self.dead) self.onData(d, self.hostId, "p2p");
      });
      c.on("close", function () {
        if (self.conn === c) self.conn = null;
      });
    } catch (e) {}
  };
  // 방장 → 모둠 친구 모두, 친구 → 방장
  GroupLink.prototype.send = function (msg, members) {
    if (this.dead) return;
    if (this.isHost) {
      var needCloud = false;
      for (var i = 0; i < members.length; i++) {
        var c = this.conns[members[i]];
        if (c && c.open) c.send(msg);
        else needCloud = true;
      }
      if (needCloud) this.net.cloud.send({ t: "g", m: msg });
    } else {
      if (this.conn && this.conn.open) this.conn.send(msg);
      else this.net.cloud.send({ t: "g", m: msg, to: this.hostId });
    }
  };
  GroupLink.prototype.status = function () {
    if (this.isHost) return Object.keys(this.conns).length ? "p2p" : now() - this.started > CONFIG.p2pTimeout ? "cloud" : "wait";
    return this.conn && this.conn.open ? "p2p" : now() - this.started > CONFIG.p2pTimeout ? "cloud" : "wait";
  };
  GroupLink.prototype.close = function () {
    this.dead = true;
    try {
      if (this.peer) this.peer.destroy();
    } catch (e) {}
    this.net.cloud.send({ t: "setg", g: null });
  };

  // ======================================================================
  // NET: 게임과 통신을 잇는 본체
  // ======================================================================
  var NET = {
    online: false,
    role: null,
    id: null,
    name: "",
    room: "",
    G: null,
    peers: {}, // id -> {id,name,role,look,e,tx,tz,ta,fl,l,seen,gpos}
    replaying: false,
    allow: {},
    world: null, // 선생님이 연 월드 정보 {i, mode, sess, assign, hosts, hostId, opened}
    arena: null, // 지금 들어가 있는 월드 활동 상태
    sendT: 0,
    lastSent: null,
    lastL: null,
    pendingHi: null,
  };
  window.NET = NET;

  // ---------------------------------------------------------------- 시작
  NET.boot = function (startGame) {
    NET.startGame = startGame;
    if (location.protocol === "file:" && !CONFIG.server) return startGame();
    var done = false;
    var timer = setTimeout(function () {
      if (!done) {
        done = true;
        startGame();
      }
    }, 3000);
    fetch((CONFIG.server || "") + "/api/hello", { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (j && j.app === "uriban-plaza") NET.showLogin();
        else startGame();
      })
      .catch(function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        startGame();
      });
  };

  NET.showLogin = function () {
    var q = new URLSearchParams(location.search);
    var room = q.get("room") || q.get("반") || store("uriban-room") || "";
    var name = store("uriban-name") || "";
    var teacherMode = q.has("teacher");
    var css = document.createElement("style");
    css.textContent =
      "#netLogin{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#dff1ff,#fef6e4);font-family:inherit}" +
      "#netLogin .box{width:min(420px,90vw);background:#fff;border-radius:26px;padding:24px 22px 20px;box-shadow:0 12px 40px rgba(30,60,100,.22);text-align:center}" +
      "#netLogin h1{margin:0 0 4px;font-size:26px}#netLogin p{margin:0 0 14px;color:#5a6b80;font-weight:600;font-size:15px;line-height:1.5}" +
      "#netLogin label{display:block;text-align:left;font-size:14px;font-weight:800;color:#5a6b80;margin:10px 4px 4px}" +
      "#netLogin input{width:100%;box-sizing:border-box;border:2px solid #dbe4ee;border-radius:14px;padding:13px;font-size:19px;font-weight:800;-webkit-user-select:text;user-select:text}" +
      "#netLogin input:focus{border-color:#2f8cff}" +
      "#netLogin button{display:block;width:100%;border-radius:999px;padding:15px;font-size:19px;font-weight:900;margin-top:14px;background:#2f8cff;color:#fff}" +
      "#netLogin .sub{background:none;color:#5a6b80;font-size:14px;padding:8px;margin-top:6px;text-decoration:underline}" +
      "#netLogin .err{color:#d6336c;font-weight:800;font-size:15px;min-height:20px;margin-top:10px}" +
      "#netChip{position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(10px + env(safe-area-inset-bottom));z-index:5;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.88);font-size:13px;font-weight:800;color:#3d4d61;pointer-events:none;box-shadow:0 2px 8px rgba(30,60,100,.15)}" +
      "#netPanel .pb{font-size:14px}#netLink{font-size:12px;word-break:break-all;color:#3d4d61;background:#f3f6fa;border-radius:10px;padding:8px;margin:6px 0;font-weight:700;-webkit-user-select:text;user-select:text}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.id = "netLogin";
    d.innerHTML =
      '<div class="box"><h1>🏡 우리 반 광장 마을</h1><p id="nlWho">이름을 적고 들어와요</p>' +
      '<label for="nlRoom">반 코드</label><input id="nlRoom" maxlength="20" autocomplete="off" placeholder="예: 4-2반">' +
      '<div id="nlNameBox"><label for="nlName">내 이름</label><input id="nlName" maxlength="10" autocomplete="off" placeholder="예: 김하늘"></div>' +
      '<div id="nlPwBox" hidden><label for="nlPw">선생님 비밀번호</label><input id="nlPw" type="password" maxlength="40" placeholder="처음이면 새로 정해요(4글자 이상)"></div>' +
      '<button id="nlGo">들어가기</button><div class="err" id="nlErr"></div>' +
      '<button class="sub" id="nlTeacher">선생님으로 들어가기</button></div>';
    document.body.appendChild(d);
    $("nlRoom").value = room;
    $("nlName").value = name;
    var setTeacher = function (on) {
      teacherMode = on;
      $("nlNameBox").hidden = on;
      $("nlPwBox").hidden = !on;
      $("nlWho").textContent = on ? "선생님 비밀번호로 들어와요" : "이름을 적고 들어와요";
      $("nlTeacher").textContent = on ? "학생으로 들어가기" : "선생님으로 들어가기";
    };
    setTeacher(teacherMode);
    if (room && q.get("room")) $("nlRoom").parentNode && ($("nlRoom").readOnly = false);
    $("nlTeacher").onclick = function () {
      setTeacher(!teacherMode);
    };
    var go = function () {
      var r = $("nlRoom").value.trim();
      var n = $("nlName").value.trim();
      var pw = $("nlPw").value;
      $("nlErr").textContent = "";
      if (!r) return ($("nlErr").textContent = "반 코드를 적어 주세요"), $("nlRoom").focus();
      if (!teacherMode && !n) return ($("nlErr").textContent = "이름을 적어 주세요"), $("nlName").focus();
      if (teacherMode && pw.length < 4) return ($("nlErr").textContent = "비밀번호는 4글자 이상이에요"), $("nlPw").focus();
      store("uriban-room", r);
      if (!teacherMode) store("uriban-name", n);
      $("nlGo").disabled = true;
      $("nlGo").textContent = "들어가는 중…";
      NET.connect(r, teacherMode ? "teacher" : "student", n, pw);
    };
    $("nlGo").onclick = go;
    // 미니게임에서 돌아오면 같은 이름으로 바로 들어가요
    if (q.get("back") === "1" && !teacherMode && room && name) setTimeout(go, 50);
    ["nlRoom", "nlName", "nlPw"].forEach(function (k) {
      $(k).addEventListener("keydown", function (e) {
        if (e.key === "Enter") go();
      });
    });
  };

  NET.loginError = function (msg) {
    var b = $("nlGo");
    if (b) {
      b.disabled = false;
      b.textContent = "들어가기";
    }
    if ($("nlErr")) $("nlErr").textContent = msg;
  };

  NET.connect = function (room, role, name, pw) {
    NET.room = room;
    NET.roomSlug = roomSlug(room);
    NET.role = role;
    NET.name = role === "teacher" ? "선생님" : name;
    NET.pw = pw;
    var cid = sessionStorage.getItem("uriban-cid");
    if (!cid) {
      cid = rid(12);
      try {
        sessionStorage.setItem("uriban-cid", cid);
      } catch (e) {}
    }
    var h = hash(NET.name);
    NET.look = [h % FUR.length, (h >>> 5) % SHIRT.length, 0];
    NET.cloud = new CloudLink(NET);
    NET.cloud.open(room, { t: "join", cid: cid, role: role, name: name, pw: pw, look: NET.look });
  };

  // ---------------------------------------------------------------- 서버에서 온 편지
  NET.onCloud = function (m) {
    switch (m.t) {
      case "err":
        NET.cloud.close();
        if (!NET.started) NET.loginError(m.m);
        else {
          // 다시 붙다가 막혔으면(잠깐 문 닫힘·방이 꽉 참) 조금 뒤 다시 해 봐요(검토: 그대로 멈춰 있었음)
          NET.status("⚠️ " + m.m);
          clearTimeout(NET.errRetry);
          NET.errRetry = setTimeout(function () {
            if (!NET.cloud.ws && !NET.kickedOut) NET.cloud.open(NET.cloud.room, NET.cloud.joinMsg);
          }, 20000);
        }
        return;
      case "hi":
        NET.id = m.id;
        NET.role = m.role;
        NET.usage = m.usage;
        NET.gateUntil = m.gate || 0;
        NET.ticket = m.ticket || null;
        NET.myPlot = typeof m.plot === "number" ? m.plot : null;
        NET.plots = m.plots || {};
        NET.yards = m.yards || {};
        NET.prog = m.prog || { stars: 0, mood: "auto" };
        if (typeof m.board === "string") NET.boardText = m.board;
        NET.recallLeft = m.recall || 0;
        if (!NET.started) {
          NET.online = true;
          NET.started = true;
          NET.pendingHi = m;
          var l = $("netLogin");
          if (l) l.remove();
          NET.startGame(); // 게임이 켜지면서 NET.attach 를 불러요
        } else {
          NET.applyPeers(m.peers, true);
          NET.lastSent = null;
          NET.status();
          NET.relabel();
          NET.setBoard(NET.boardText, false);
          NET.applyProg(false);
          if (NET.recallLeft) NET.startRecall(NET.recallLeft);
        }
        return;
      case "join":
        NET.addPeer({ id: m.id, name: m.name, role: m.role, look: m.look });
        NET.status();
        return;
      case "leave":
        NET.removePeer(m.id);
        NET.status();
        return;
      case "mv":
        for (var id in m.d) {
          var P = NET.peers[id];
          if (!P) continue;
          var a = m.d[id];
          P.tx = a[0];
          P.tz = a[1];
          P.ta = a[2];
          P.fl = a[3] | 0;
          P.l = a[a.length - 1];
          P.seen = now();
        }
        return;
      case "emo":
        var Q = NET.peers[m.from];
        if (Q && Q.e && !Q.e.hidden && NET.G) {
          NET.G.fns.Kt(Q.e, m.e, 2.2);
          if (Q.e.hopY === 0) Q.e.hopV = 3.2;
          if (m.e === "👋") Q.e.wave = 1.4;
        }
        return;
      case "ev":
        if (NET.G) NET.replay(m.e, m.from);
        return;
      case "bc":
        if (NET.G) NET.onBroadcast(m.m, m.from);
        return;
      case "g":
        if (NET.G && NET.arena && NET.arena.link) NET.onGroupData(m.m, m.from, "cloud");
        return;
      case "usage":
        NET.usage = m.u;
        NET.updatePanel();
        return;
      case "gate":
        NET.gateUntil = m.until;
        NET.ticket = m.ticket;
        NET.updatePanel();
        return;
      case "closed":
        NET.classClosed();
        return;
      case "board":
        NET.setBoard(m.text || "", true);
        return;
      case "plot":
        for (var pn in NET.plots) if (NET.plots[pn] === m.k && pn !== m.name) delete NET.plots[pn]; // 돌려받은 집은 옛 주인 이름을 지워요
        if (m.k == null) delete NET.plots[m.name];
        else NET.plots[m.name] = m.k;
        NET.relabel();
        return;
      case "recall":
        NET.startRecall(m.sec | 0);
        return;
      case "prog":
        var before = NET.prog ? NET.prog.stars : 0;
        NET.prog = { stars: m.stars | 0, mood: m.mood || "auto" };
        NET.applyProg(m.stars > before && m.name ? m : null);
        return;
      case "home":
        NET.onHome(m);
        return;
    }
  };
  // 같은 이름으로 다른 기기에서 들어오면 이 화면은 멈추고 알려 줘요(저장이 몰래 사라지지 않게)
  NET.kicked = function () {
    NET.kickedOut = true;
    if (NET.cloud) NET.cloud.wantOpen = false;
    if ($("netKicked")) return;
    var d = document.createElement("div");
    d.id = "netKicked";
    d.style.cssText = "position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(30,45,70,.72);font-family:inherit";
    d.innerHTML = '<div style="background:#fff;border-radius:24px;padding:26px 24px;max-width:88vw;width:420px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)"><div style="font-size:44px">📱</div><div style="font-size:22px;font-weight:900;margin:6px 0">다른 기기에서 같은 이름으로 들어왔어요</div><div style="font-size:16px;color:#5a6b80;font-weight:700;line-height:1.5">내 기기가 맞다면 다시 들어와요.<br>친구와 이름이 같다면 선생님께 말해요.</div><button type="button" style="margin-top:14px;border:0;border-radius:999px;padding:12px 22px;font-size:17px;font-weight:900;background:#2f8cff;color:#fff">다시 들어가기</button></div>';
    d.querySelector("button").onclick = function () {
      location.reload();
    };
    document.body.appendChild(d);
  };
  // 수업 문이 닫히면 학생 화면을 멈춰요
  NET.classClosed = function () {
    if (NET.role !== "student") return;
    NET.cloud.close();
    var d = document.createElement("div");
    d.style.cssText = "position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(30,45,70,.72);font-family:inherit";
    d.innerHTML = '<div style="background:#fff;border-radius:24px;padding:26px 24px;max-width:88vw;width:420px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)"><div style="font-size:44px">🔒</div><div style="font-size:24px;font-weight:900;margin:6px 0">수업 문이 닫혔어요</div><div style="font-size:16px;color:#5a6b80;font-weight:700;line-height:1.5">오늘 활동은 여기까지예요.<br>다음 수업 때 다시 만나요!</div></div>';
    document.body.appendChild(d);
  };

  NET.onCloudClosed = function () {
    if (NET.started) NET.status("🔄 다시 연결하는 중…");
    else NET.loginError("서버에 연결하지 못했어요. 잠시 뒤 다시 눌러 주세요");
  };

  // ---------------------------------------------------------------- 게임과 연결
  NET.attach = function (G) {
    NET.G = G;
    if (!NET.online) return;
    var Y = G.Y;
    // 가짜 친구는 모두 숨기고, 그 자리를 진짜 친구에게 줘요
    NET.slots = [];
    for (var i = 1; i < G.ii.length; i++) {
      var e = G.ii[i];
      if (e === G.Ct) continue;
      e.hidden = true;
      e.remote = true;
      e.netId = null;
      NET.slots.push(e);
    }
    G.cn.length = 0;
    G.on.length = 0;
    // 내 모습
    Y.name = NET.name;
    if (Y.lab) Y.lab.textContent = NET.name;
    Y.fur = FUR[NET.look[0]];
    Y.shirt = SHIRT[NET.look[1]];
    G.setLook(Y);
    if (NET.role === "teacher") {
      Y.hidden = true; // 선생님은 보이지 않는 카메라로 돌아다녀요
      Y.out = true;
    } else {
      $("bTeacher").hidden = true;
    }
    // 시작 상자 문구
    var sb = document.querySelector("#startBox p");
    if (sb) sb.innerHTML = NET.role === "teacher" ? "선생님 화면이에요.<br>오른쪽 위 <b>👩‍🏫 선생님</b>으로 활동을 시작해요." : "<b>" + esc(NET.name) + "</b>, 어서 와요!<br>친구들과 광장에서 만나요.";
    var h1 = document.querySelector("#startBox h1");
    if (h1) h1.textContent = "🏡 " + NET.room + " 광장 마을";
    document.title = NET.room + " 광장 마을";
    var hi = NET.pendingHi;
    NET.pendingHi = null;
    if (NET.role === "student") {
      G.loadHome(hi.saved && hi.saved.home ? hi.saved.home : null);
      if (hi.saved && hi.saved.home && hi.saved.home.wall && window.HOME && HOME.adoptWall) HOME.adoptWall(hi.saved.home.wall); // 서버의 내 벽지(첫 저장이 덮어쓰지 않게)
    }
    else {
      // 선생님 화면: '내 집' 자리에 그 집 주인의 마당을 보여 줘요
      var mi = G.D.findIndex(function (h) {
        return h.mine;
      });
      if (mi >= 0 && NET.yards && NET.yards[mi]) G.loadHome({ yard: NET.yards[mi], room: [] });
    }
    if (hi.saved && typeof hi.saved.apples === "number") G.setYf(hi.saved.apples);
    NET.lastApples = G.Yf;
    NET.applyPeers(hi.peers, false);
    for (var pid in NET.peers) if (!NET.peers[pid].e && NET.peers[pid].role === "student") NET.giveSlot(NET.peers[pid]);
    var chip = document.createElement("div");
    chip.id = "netChip";
    document.body.appendChild(chip);
    NET.buildPanel();
    NET.buildExtras();
    NET.status();
    NET.relabel();
    NET.setBoard(NET.boardText, false);
    NET.applyProg(false);
    if (NET.recallLeft) NET.startRecall(NET.recallLeft);
    if (NET.role === "student" && new URLSearchParams(location.search).get("gather") === "1") {
      try {
        var u2 = new URL(location.href);
        u2.searchParams.delete("gather");
        history.replaceState(null, "", u2.toString());
      } catch (e) {}
      setTimeout(function () {
        NET.gatherNow(true);
      }, 900);
    }
    if (NET.role === "teacher" && !(NET.gateUntil > Date.now())) {
      setTimeout(function () {
        G.fns.go(true);
        G.fns.Ln("🚪 수업 문이 닫혀 있어요", "오른쪽 패널에서 '열기'를 눌러야 학생들이 들어와요", null, 8);
      }, 600);
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  NET.applyPeers = function (list, full) {
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      seen[p.id] = 1;
      var P = NET.addPeer(p);
      if (p.p) {
        P.tx = p.p[0];
        P.tz = p.p[1];
        P.ta = p.p[2];
        P.fl = p.p[3] | 0;
        P.l = p.l;
        P.snap = true;
      }
    }
    if (full)
      for (var id in NET.peers) if (!seen[id]) NET.removePeer(id);
  };

  NET.addPeer = function (p) {
    var P = NET.peers[p.id];
    if (!P) {
      P = NET.peers[p.id] = { id: p.id, name: p.name, role: p.role, look: p.look || [0, 0, 0], e: null, tx: 0, tz: 0, ta: 0, fl: 0, l: null, seen: 0, snap: true };
    } else {
      P.name = p.name;
      P.role = p.role;
    }
    if (NET.G && !P.e && P.role === "student") NET.giveSlot(P);
    return P;
  };

  NET.giveSlot = function (P) {
    var e = null;
    for (var i = 0; i < NET.slots.length; i++)
      if (!NET.slots[i].netId) {
        e = NET.slots[i];
        break;
      }
    if (!e) return; // 칸이 모자라요(32명 넘음)
    e.netId = P.id;
    e.name = P.name;
    if (e.lab) e.lab.textContent = P.name;
    e.fur = FUR[(P.look[0] | 0) % FUR.length];
    e.shirt = SHIRT[(P.look[1] | 0) % SHIRT.length];
    NET.G.setLook(e);
    e.hidden = true;
    e.out = false;
    e.team = -1;
    e.score = 0;
    e.goal = null;
    e.act = "remote";
    e.cheer = 0;
    e.sad = 0;
    P.e = e;
    P.snap = true;
  };

  NET.removePeer = function (id) {
    var P = NET.peers[id];
    if (!P) return;
    if (P.e) {
      P.e.netId = null;
      P.e.hidden = true;
    }
    delete NET.peers[id];
  };

  NET.idOf = function (E) {
    if (!NET.G) return null;
    return E === NET.G.Y ? NET.id : E.netId;
  };
  NET.peerOf = function (E) {
    var id = NET.idOf(E);
    return id ? NET.peers[id] : null;
  };
  NET.studentCount = function () {
    var n = 0;
    for (var id in NET.peers) if (NET.peers[id].role === "student") n++;
    return n + (NET.role === "student" ? 1 : 0);
  };

  // ---------------------------------------------------------------- 매 순간
  NET.tick = function (dt) {
    var G = NET.G;
    if (!G || !NET.online) return;
    var S = G.S,
      Y = G.Y;
    if (NET.role === "teacher") {
      Y.hidden = true;
      Y.out = true;
    }
    // 월드에서 나왔는지 확인
    if (NET.arena && S.loc !== "arena") NET.leaveArena();

    // 내 위치 보내기
    NET.sendT -= dt;
    var l = NET.myLoc();
    if (NET.role === "student" && l && (NET.sendT <= 0 || l !== NET.lastL)) {
      NET.sendT = CONFIG.sendEvery;
      var fl = (Y.moving ? 1 : 0) | (Y.run ? 2 : 0);
      var p = [Y.x, Y.z, Y.ang, fl];
      var L = NET.lastSent;
      var changed = !L || l !== NET.lastL || Math.abs(L[0] - p[0]) > 0.04 || Math.abs(L[1] - p[1]) > 0.04 || Math.abs(L[2] - p[2]) > 0.15 || L[3] !== fl;
      if (changed && NET.cloudMoves(l)) {
        if (NET.cloud.send({ t: "mv", p: p, l: l })) {
          NET.lastSent = p;
          NET.lastL = l;
        }
      }
    }

    // 친구 모습 움직이기
    var on = G.on;
    on.length = 0;
    if (NET.role === "student") on.push(Y);
    for (var id in NET.peers) {
      var P = NET.peers[id],
        e = P.e;
      if (!e) continue;
      var vis = NET.visible(P);
      if (!vis) {
        e.hidden = true;
        P.snap = true;
        continue;
      }
      var tx = P.tx,
        tz = P.tz,
        ta = P.ta,
        f = P.fl;
      if (NET.arena && NET.arena.mode === "group" && P.gpos) {
        tx = P.gpos[0];
        tz = P.gpos[1];
        ta = P.gpos[2];
        f = P.gpos[3] | 0;
      }
      if (e.hidden || P.snap) {
        e.x = tx;
        e.z = tz;
        e.ang = ta;
        P.snap = false;
        if (NET.arena && !NET.arena.local) NET.arenaFriendAppears(P, e);
      }
      e.hidden = false;
      var dx = tx - e.x,
        dz = tz - e.z,
        dist = Math.hypot(dx, dz);
      if (dist > 6) {
        e.x = tx;
        e.z = tz;
      } else {
        var k = Math.min(1, dt * 9);
        e.x += dx * k;
        e.z += dz * k;
      }
      e.moving = dist > 0.05 || !!(f & 1);
      e.run = !!(f & 2);
      if (e.moving) e.phase += dt * (e.run ? 13 : 10.5);
      G.fns.oo(e, ta, dt);
      e.breath += dt * 2.2;
      G.fns.$l(e, dt);
      if (e.cheer > 0 && e.hopY === 0 && !e.moving) e.hopV = 3.4;
      on.push(e);
    }

    NET.tickWorld(dt);
    if (NET.arena) NET.tickArena(dt);
    // 선생님은 모둠·혼자 월드에 들어가지 않으니 '들어가기' 버튼을 숨겨요
    var act = $("act");
    if (act) {
      var W = NET.world;
      var hideAct = NET.role === "teacher" && W && S.mode === "rush" && (W.mode === "group" || W.mode === "solo");
      act.style.visibility = hideAct ? "hidden" : "";
    }

    // 사과 개수가 바뀌면 저장
    NET.saveT = (NET.saveT || 0) - dt;
    if (NET.saveT <= 0) {
      NET.saveT = 10;
      if (NET.role === "student" && G.Yf !== NET.lastApples) NET.saveHome();
    }
    NET.statusT = (NET.statusT || 0) - dt;
    if (NET.statusT <= 0) {
      NET.statusT = 2;
      NET.status();
    }
    if (NET.role === "teacher") {
      NET.usageT = (NET.usageT || 0) - dt;
      if (NET.usageT <= 0) {
        NET.usageT = 60;
        NET.cloud.send({ t: "usage" });
      }
    }
  };

  // 내가 지금 어디에 있는지(다른 친구 화면에서 보일지 정해요)
  NET.myLoc = function () {
    var S = NET.G.S;
    if (S.loc === "village") return "v";
    if (S.loc === "room") return "h:" + (NET.visiting ? NET.visiting.k : NET.myPlot != null ? NET.myPlot : "x");
    if (S.loc === "arena") {
      var A = NET.arena;
      if (!A) return "w";
      if (A.mode === "solo") return "s";
      if (A.mode === "group") return "g";
      return "a:" + A.sess;
    }
    return "v";
  };
  // 서버로 위치를 보낼지(모둠·혼자 월드에서는 한 번만 알리고 보내지 않아요)
  NET.cloudMoves = function (l) {
    if (l === "s" || l === "g" || l === "r" || l === "w") return l !== NET.lastL;
    return true;
  };
  NET.visible = function (P) {
    var S = NET.G.S;
    if (S.loc === "village") return P.l === "v";
    if (S.loc === "room") return P.l === NET.myLoc(); // 같은 집 안에 있는 친구만 보여요
    if (S.loc === "arena") {
      var A = NET.arena;
      if (!A) return false;
      if (A.mode === "solo") return false;
      if (A.mode === "group") return A.assign[P.id] === A.g && !!P.gpos && now() - (P.gposT || 0) < 4;
      return P.l === "a:" + A.sess;
    }
    return false;
  };

  // ---------------------------------------------------------------- 선생님 명령 나누기
  // 게임 함수 맨 앞에서 불러요. true를 돌려주면 그 함수는 실행하지 않아요.
  NET.gate = function (name, arg) {
    if (!NET.online) return false;
    if (NET.replaying) return false;
    if (NET.allow[name] && NET.allow[name] > now()) return false;
    var T = NET.role === "teacher";
    var A = NET.arena;
    switch (name) {
      case "ua":
      case "ma":
        if (!T) return true;
        NET.ev({ f: name });
        NET.allow[name] = now() + 4;
        return false;
      case "ho":
      case "pa":
      case "nf":
      case "zf":
        return !T;
      case "lc":
        if (!T) return true;
        NET.openWorld(arg);
        NET.allow.lc = now() + 4;
        return false;
      case "cc": {
        var W = NET.world;
        if (T && W && (W.mode === "group" || W.mode === "solo")) return true; // 선생님은 광장에 남아요
        return false;
      }
      case "em":
      case "om":
        if (A && !A.local && !A.host) return true;
        return false;
    }
    return false;
  };
  NET.may = function () {
    return !NET.online || NET.role === "teacher";
  };
  NET.ev = function (e) {
    NET.cloud.send({ t: "ev", e: e });
  };
  NET.after = function (name, data) {
    if (!NET.online) return;
    var G = NET.G,
      T = NET.role === "teacher";
    switch (name) {
      case "ho":
        if (T) NET.ev({ f: "ho", list: G.Ye.list });
        else if (NET.pendingList) {
          G.Ye.list = NET.pendingList;
          NET.pendingList = null;
        }
        return;
      case "pa":
        if (T) NET.ev({ f: "pa", q: G.Ye.q, n: G.Ye.n, idx: G.Ye.idx });
        return;
      case "nf":
        if (T) {
          var surv = [],
            lose = [];
          data.surv.forEach(function (E) {
            var id = NET.idOf(E);
            if (id) surv.push(id);
          });
          data.lose.forEach(function (E) {
            var id = NET.idOf(E);
            if (id) lose.push(id);
          });
          NET.ev({ f: "nf", ans: data.ans, surv: surv, lose: lose });
        }
        return;
      case "j0":
        NET.enterArena();
        return;
      case "am":
        if (NET.arena && !NET.arena.local && !NET.arena.host) {
          var btns = document.querySelectorAll("#cBtns button");
          if (btns.length > 1) btns[0].remove();
        }
        return;
    }
  };
  // 정답 판정: 학생 기기는 선생님 기기가 정한 결과를 따라요
  NET.isRight = function (E, local) {
    if (!NET.online || NET.role === "teacher" || !NET.pendingNf) return local;
    var id = NET.idOf(E);
    if (NET.pendingNf.surv[id]) return true;
    if (NET.pendingNf.lose[id]) return false;
    return local;
  };

  // 선생님 기기에서 온 명령을 내 기기에서 똑같이 실행해요
  NET.replay = function (e, from) {
    var G = NET.G,
      Ye = G.Ye,
      t = now();
    NET.replaying = true;
    try {
      switch (e.f) {
        case "ua":
          NET.allow.ua = t + 4;
          G.fns.ua();
          break;
        case "ho":
          NET.allow.ho = t + 4;
          NET.pendingList = e.list;
          G.fns.ho();
          break;
        case "pa":
          if (!Ye.on) {
            NET.allow.ho = t + 4;
            G.fns.ho();
          }
          Ye.idx = Math.max(0, (e.idx | 0) - 1);
          Ye.list[Ye.idx] = e.q;
          Ye.n = (e.n | 0) - 1;
          if (G.S.loc === "village") G.fns.pa();
          break;
        case "nf":
          if (!Ye.q || G.S.loc !== "village") break;
          var surv = {},
            lose = {};
          (e.surv || []).forEach(function (id) {
            surv[id] = 1;
          });
          (e.lose || []).forEach(function (id) {
            lose[id] = 1;
          });
          NET.pendingNf = { surv: surv, lose: lose };
          if (Ye.q.a !== e.ans) Ye.q.a = e.ans;
          G.fns.Nf();
          NET.pendingNf = null;
          break;
        case "ma":
          G.fns.ma();
          break;
        case "lc":
          NET.allow.lc = t + 4;
          NET.setWorld(e, from);
          G.fns.lc(e.i);
          break;
        case "home":
          NET.allow.ua = t + 4;
          NET.runHome();
          break;
      }
    } finally {
      NET.replaying = false;
    }
  };

  NET.teacherHome = function () {
    if (NET.role !== "teacher") return;
    NET.ev({ f: "home" });
    NET.world = null;
    NET.replaying = true;
    try {
      NET.runHome();
    } finally {
      NET.replaying = false;
    }
  };
  NET.runHome = function () {
    var G = NET.G,
      S = G.S;
    if (S.loc === "room") G.fns.po();
    else if (S.loc === "arena" || S.mode === "rush") G.fns._a();
    else G.fns.ua();
  };

  // ---------------------------------------------------------------- 월드
  // 선생님이 월드 문을 열 때: 팀·모둠을 나누고 모두에게 알려요
  NET.openWorld = function (i) {
    var G = NET.G,
      W = G.Te[i];
    var ids = [];
    for (var id in NET.peers) if (NET.peers[id].role === "student") ids.push(id);
    shuffle(ids);
    var assign = {},
      hosts = {};
    var n = W.mode === "team" ? 4 : W.mode === "group" ? 5 : 1;
    ids.forEach(function (id, k) {
      var g = W.mode === "team" || W.mode === "group" ? k % n : 0;
      assign[id] = g;
      if (W.mode === "group" && hosts[g] == null) hosts[g] = id;
    });
    var e = { f: "lc", i: i, mode: W.mode, sess: rid(5), assign: assign, hosts: hosts };
    NET.ev(e);
    NET.setWorld(e, NET.id);
  };
  NET.setWorld = function (e, from) {
    if (NET.groupLink) {
      NET.groupLink.close();
      NET.groupLink = null;
    }
    NET.world = { i: e.i, mode: e.mode, sess: e.sess, assign: e.assign || {}, hosts: e.hosts || {}, hostId: from, opened: now(), gs: {} };
    var W = NET.world;
    // 모둠 월드면 걸어가는 동안 미리 모둠끼리 연결해 둬요
    if (W.mode === "group" && NET.role === "student" && W.assign[NET.id] != null) {
      var g = W.assign[NET.id];
      var hostId = W.hosts[g];
      NET.groupLink = new GroupLink(NET, {
        key: W.sess + "-g" + g,
        isHost: hostId === NET.id,
        hostId: hostId,
        onData: function (d, who, via) {
          NET.onGroupData(d, who, via);
        },
      });
    }
  };

  // 월드 문이 열려 있는 동안(광장)
  NET.tickWorld = function (dt) {
    var G = NET.G,
      W = NET.world,
      S = G.S;
    if (!W) return;
    if (S.mode !== "rush" && S.loc !== "arena" && !NET.arena) {
      // 문이 닫혔으면(광장으로 돌아옴) 월드 정보 지우기
      if (now() - W.opened > 3) {
        if (NET.groupLink) {
          NET.groupLink.close();
          NET.groupLink = null;
        }
        NET.world = null;
      }
      return;
    }
    if (NET.role === "teacher" && S.loc === "village" && S.mode === "rush") {
      if (W.mode === "class" || W.mode === "team") {
        // 학생이 모두 들어갔거나 시간이 지나면 선생님 기기도 들어가요(방장)
        var all = true,
          any = false;
        for (var id in NET.peers) {
          var P = NET.peers[id];
          if (P.role !== "student") continue;
          any = true;
          if (P.l !== "a:" + W.sess) all = false;
        }
        if ((any && all) || now() - W.opened > CONFIG.classWait) {
          if (G.ve.st === "rush") G.fns.cc();
        }
      } else {
        NET.bannerT = (NET.bannerT || 0) - dt;
        if (NET.bannerT <= 0) {
          NET.bannerT = 2;
          var T = G.Te[W.i];
          if (W.mode === "group") {
            var parts = [];
            for (var g = 0; g < 5; g++) parts.push(g + 1 + "모둠 " + (W.gs[g] || 0));
            G.fns.Ln(T.emoji + " " + T.name + " · 모둠 활동 중", parts.join(" · "), "모두 돌아오게 하려면 🏠 광장으로 돌아오기", 3);
          } else if (T.ext) {
            G.fns.Ln(T.emoji + " " + T.name, "학생들이 각자 패드에서 " + T.name + "에 들어가 있어요", "게임 화면의 🏠 광장으로 버튼으로 돌아와요", 3);
          } else {
            G.fns.Ln(T.emoji + " " + T.name + " · 혼자 활동 중", "학생들이 각자 별을 모으고 있어요", "모두 돌아오게 하려면 🏠 광장으로 돌아오기", 3);
          }
        }
      }
    }
  };

  NET.kfWait = function () {
    var A = NET.arenaPreview();
    return !!(NET.online && A && A.mode !== "solo");
  };
  // kf 가 enterArena 보다 먼저 불려서, 월드 정보로 미리 판단해요
  NET.arenaPreview = function () {
    if (!NET.online || !NET.G) return null;
    var W = NET.world,
      i = NET.G.ve.wi;
    var mode = NET.G.Te[i] ? NET.G.Te[i].mode : "solo";
    if (!W || W.i !== i) return { mode: "solo" };
    return { mode: mode };
  };

  NET.fixTeams = function (mode) {
    if (!NET.online || !NET.world) return;
    var W = NET.world;
    var on = NET.G.on;
    for (var k = 0; k < on.length; k++) {
      var E = on[k],
        id = NET.idOf(E);
      if (mode === "team" || mode === "group") E.team = W.assign[id] != null ? W.assign[id] : 0;
    }
  };

  NET.enterArena = function () {
    var G = NET.G,
      W = NET.world,
      i = G.ve.wi;
    var mode = G.Te[i].mode;
    var A = (NET.arena = { mode: mode, sess: W ? W.sess : "", local: false, host: false, claimed: {}, uid: 0, snapT: 0, posT: 0, gsT: 0, lastSnap: now(), entered: now() });
    if (!NET.online || !W || W.i !== i || mode === "solo") {
      A.mode = "solo";
      A.local = true;
      A.host = true;
      return;
    }
    A.assign = W.assign;
    if (mode === "group" && W.assign[NET.id] == null) {
      // 월드 문이 열린 뒤에 들어온 학생은 혼자 해요
      A.mode = "solo";
      A.local = true;
      A.host = true;
      return;
    }
    if (mode === "group") {
      A.g = W.assign[NET.id];
      A.hostId = W.hosts[A.g];
      A.host = A.hostId === NET.id;
      A.link = NET.groupLink;
      A.members = [];
      for (var id in W.assign) if (W.assign[id] === A.g && id !== NET.id) A.members.push(id);
    } else {
      A.hostId = W.hostId;
      A.host = NET.role === "teacher";
    }
    if (NET.role === "teacher") {
      // 선생님은 보이지 않게, 경기장 가운데에서 지켜봐요
      G.Y.x = G.arena[0];
      G.Y.z = G.arena[1] + 1.5;
    }
    G.fns.Ln(G.Te[i].emoji + " " + G.Te[i].name, "친구들이 들어오면 시작해요", A.mode === "group" ? (A.host ? "내가 우리 모둠 방장이에요" : "우리 모둠 친구들과 연결하는 중…") : null);
  };

  var TEAM_COL = [16739179, 5090295, 16766011, 5361510],
    GROUP_COL = [16749099, 8675063, 2148759, 15754645, 3382e3];
  NET.arenaFriendAppears = function (P, e) {
    var A = NET.arena,
      G = NET.G;
    if (A.host && (G.ve.st === "wait" || G.ve.st === "count")) e.score = 0;
    e.out = false;
    if ((A.mode === "team" || A.mode === "group") && A.assign && A.assign[P.id] != null) {
      e.team = A.assign[P.id];
      G.ring(e, (A.mode === "team" ? TEAM_COL : GROUP_COL)[e.team % 5] || 16777215);
    }
  };

  NET.leaveArena = function () {
    var A = NET.arena;
    NET.arena = null;
    if (NET.role === "teacher" && NET.G) {
      // 선생님 카메라를 광장 가운데로
      NET.G.Y.x = 0;
      NET.G.Y.z = 6;
    }
    if (A && A.mode === "group" && NET.groupLink) {
      NET.groupLink.close();
      NET.groupLink = null;
    }
    for (var id in NET.peers) NET.peers[id].gpos = null;
  };

  // 월드 활동 중 매 순간
  NET.tickArena = function (dt) {
    var G = NET.G,
      A = NET.arena,
      ve = G.ve,
      Y = G.Y;
    if (A.local) return;
    var t = now();
    // 방장: 모두 들어왔으면 시작
    if (A.host && ve.st === "wait") {
      var ready = false;
      if (A.mode === "group") {
        ready = A.members.every(function (id) {
          var P = NET.peers[id];
          return !P || (P.gpos && t - (P.gposT || 0) < 3);
        });
        if (t - A.entered > CONFIG.groupWait) ready = true;
      } else ready = true; // 선생님 기기는 학생이 다 들어간 뒤에 들어와요
      if (ready) {
        ve.st = "count";
        ve.t = 3.8;
        ve.lastCount = 4;
      }
    }
    if (A.host) {
      A.snapT -= dt;
      if (A.snapT <= 0) {
        A.snapT = 0.2;
        NET.sendSnapshot();
      }
      if (A.mode === "group") {
        A.gsT -= dt;
        if (A.gsT <= 0) {
          A.gsT = 2;
          var s = 0;
          G.on.forEach(function (E) {
            s += E.score || 0;
          });
          NET.cloud.send({ t: "bc", m: { k: "gs", sess: A.sess, g: A.g, s: s } });
          if (NET.world) NET.world.gs[A.g] = s;
        }
      }
    } else {
      // 모둠 친구: 내 위치를 방장에게
      if (A.mode === "group" && A.link) {
        A.posT -= dt;
        if (A.posT <= 0) {
          A.posT = CONFIG.sendEvery;
          A.link.send({ k: "p", p: [Y.x, Y.z, Y.ang, (Y.moving ? 1 : 0) | (Y.run ? 2 : 0)] });
        }
      }
      // 별에 닿으면 방장에게 "내가 주웠어요"
      if (NET.role === "student" && (ve.st === "play" || ve.st === "count")) {
        for (var k = 0; k < G.xi.length; k++) {
          var o = G.xi[k];
          if (!o.uid || A.claimed[o.uid]) continue;
          if (o.st !== "ground" && !(o.st === "fall" && o.y < 1.3)) continue;
          if ((o.x - Y.x) * (o.x - Y.x) + (o.z - Y.z) * (o.z - Y.z) > 0.72) continue;
          A.claimed[o.uid] = 1;
          var m = { k: "claim", sess: A.sess, u: o.uid };
          if (A.mode === "group") A.link && A.link.send(m);
          else NET.cloud.send({ t: "bc", to: A.hostId, m: m });
          o.st = "pop";
          o.t = 0;
          G.fns.fs(o.x, 0.7, o.z, o.gold ? 14 : 7, o.gold ? 16755021 : 16774048, 2);
          G.ht.star(o.gold);
          G.fns.Kt(Y, "+" + (o.gold ? 3 : 1) + " " + (ve.wi === 0 ? "🍞" : "⭐"), 0.9);
        }
      }
      // 방장 연결이 오래 끊기면 돌아갈 수 있게
      if (t - A.lastSnap > 10 && !A.lostShown && t - A.entered > 15) {
        A.lostShown = true;
        G.fns.sa("연결이 끊겼어요", "방장과 연결이 안 돼요", "<div>광장으로 돌아가서 다시 해 봐요</div>", [
          {
            label: "🏠 광장으로",
            main: true,
            fn: function () {
              G.fns.$i();
              G.fns._a();
            },
          },
        ]);
      }
    }
  };

  // 방장이 보내는 화면 정보(별·점수·남은 시간)
  NET.sendSnapshot = function () {
    var G = NET.G,
      A = NET.arena,
      ve = G.ve;
    var stars = [];
    for (var k = 0; k < G.xi.length; k++) {
      var o = G.xi[k];
      if (o.st === "fall" && o._seen !== "fall") o.uid = ++A.uid;
      if (!o.uid) o.uid = ++A.uid;
      o._seen = o.st;
      if (o.st !== "fall" && o.st !== "ground") continue;
      stars.push([o.uid, r2(o.x), r2(o.z), r2(o.y), o.st === "fall" ? 0 : 1, o.gold ? 1 : 0]);
    }
    var sc = {};
    G.on.forEach(function (E) {
      var id = NET.idOf(E);
      if (id) sc[id] = E.score || 0;
    });
    var m = { k: "ast", sess: A.sess, st: ve.st, t: r2(ve.t), total: ve.total, goal: ve.goal, stars: stars, sc: sc };
    if (A.mode === "group") {
      var pos = {};
      var Y = G.Y;
      pos[NET.id] = [r2(Y.x), r2(Y.z), r2(Y.ang), (Y.moving ? 1 : 0) | (Y.run ? 2 : 0)];
      A.members.forEach(function (id) {
        var P = NET.peers[id];
        if (P && P.gpos && now() - P.gposT < 4) pos[id] = P.gpos;
      });
      m.pos = pos;
      A.link && A.link.send(m, A.members);
    } else NET.cloud.send({ t: "bc", m: m });
  };
  function r2(x) {
    return Math.round(x * 100) / 100;
  }

  NET.onBroadcast = function (m, from) {
    if (!m || !m.k) return;
    var W = NET.world;
    if (m.k === "gs") {
      if (W && W.sess === m.sess) W.gs[m.g] = m.s;
      return;
    }
    if (!W || m.sess !== W.sess) return;
    if (m.k === "ast" && W.hostId && from !== W.hostId) return; // 화면 정보는 월드를 연 선생님 기기에서 온 것만
    if (m.k === "ast") {
      var G = NET.G;
      // 아직 광장에 있는데 활동이 시작됐으면 바로 들어가요
      if (!NET.arena && G.S.loc === "village" && G.S.mode === "rush" && m.st !== "wait" && G.ve.st === "rush" && NET.role === "student") {
        G.fns.cc();
        return;
      }
      if (NET.arena && !NET.arena.host) NET.applySnapshot(m);
      return;
    }
    if (m.k === "claim" && NET.arena && NET.arena.host) NET.applyClaim(m.u, from);
  };

  NET.onGroupData = function (m, who, via) {
    var A = NET.arena;
    if (!m || !m.k) return;
    if (m.k === "p") {
      var P = NET.peers[who];
      if (P) {
        P.gpos = m.p;
        P.gposT = now();
      }
      return;
    }
    if (!A) return;
    if (m.k === "ast" && !A.host) {
      if (m.pos)
        for (var id in m.pos) {
          if (id === NET.id) continue;
          var Q = NET.peers[id];
          if (Q) {
            Q.gpos = m.pos[id];
            Q.gposT = now();
          }
        }
      NET.applySnapshot(m);
      return;
    }
    if (m.k === "claim" && A.host) NET.applyClaim(m.u, who);
  };

  // 친구 기기: 방장 화면을 따라가요
  NET.applySnapshot = function (m) {
    var G = NET.G,
      A = NET.arena,
      ve = G.ve,
      Y = G.Y;
    if (!A) return;
    A.lastSnap = now();
    if (A.lostShown) {
      A.lostShown = false;
      G.fns.$i();
    }
    // 진행 단계 맞추기
    if (m.st === "count" && (ve.st === "wait" || ve.st === "result")) {
      if (ve.st === "result") NET.replayFn("em");
      ve.st = "count";
      ve.t = m.t;
      ve.lastCount = 4;
    } else if (m.st === "count" && ve.st === "count") {
      if (Math.abs(ve.t - m.t) > 0.4) ve.t = m.t;
    } else if (m.st === "play") {
      if (ve.st === "wait" || ve.st === "count") {
        ve.st = "play";
        ve.spawnT = 0;
        ve.lastSec = 31;
        ve.t = m.t;
      } else if (ve.st === "play" && Math.abs(ve.t - m.t) > 0.5) ve.t = m.t;
    } else if (m.st === "result" && ve.st === "play") {
      NET.applyScores(m);
      NET.replayFn("om");
    }
    ve.total = m.total;
    if (m.goal) ve.goal = m.goal;
    NET.applyScores(m);
    // 별 맞추기
    var map = {};
    for (var k = 0; k < G.xi.length; k++) if (G.xi[k].uid) map[G.xi[k].uid] = G.xi[k];
    var keep = {};
    for (var s = 0; s < m.stars.length; s++) {
      var a = m.stars[s],
        o = map[a[0]];
      keep[a[0]] = 1;
      if (o && o.st === "pop") continue; // 내가 주운 별
      if (!o) {
        o = null;
        for (var j = 0; j < G.xi.length; j++)
          if (G.xi[j].st === "gone") {
            o = G.xi[j];
            break;
          }
        if (!o) {
          o = {};
          G.xi.push(o);
        }
        o.uid = a[0];
        o.t = 0;
        o.p = Math.random() * 6;
        o.claim = null;
        o.claimD = 99;
        o.y = a[3];
      }
      o.x = a[1];
      o.z = a[2];
      o.gold = !!a[5];
      o.life = 99;
      if (a[4] === 1) {
        o.st = "ground";
        o.y = 0.55;
      } else {
        o.st = "fall";
        if (Math.abs(o.y - a[3]) > 0.8) o.y = a[3];
      }
    }
    for (var u in map) {
      var q = map[u];
      if (q.uid == u && !keep[u] && (q.st === "fall" || q.st === "ground")) {
        q.st = "pop";
        q.t = 0;
      }
    }
  };
  NET.applyScores = function (m) {
    var G = NET.G;
    if (!m.sc) return;
    G.on.forEach(function (E) {
      var id = NET.idOf(E);
      if (id && m.sc[id] != null) E.score = m.sc[id];
    });
  };
  NET.replayFn = function (name) {
    var G = NET.G;
    NET.replaying = true;
    try {
      if (name === "em") {
        G.fns.$i();
        G.fns.em();
        G.ve.st = "wait";
      } else if (name === "om") G.fns.om();
    } finally {
      NET.replaying = false;
    }
  };

  // 방장 기기: 친구가 별을 주웠다고 하면 점수를 줘요(먼저 온 사람만)
  NET.applyClaim = function (uid, who) {
    var G = NET.G,
      ve = G.ve;
    if (ve.st !== "play" && ve.st !== "count") return;
    var P = NET.peers[who];
    if (!P || !P.e) return;
    for (var k = 0; k < G.xi.length; k++) {
      var o = G.xi[k];
      if (o.uid !== uid) continue;
      if (o.st !== "ground" && o.st !== "fall") return;
      var v = o.gold ? 3 : 1;
      P.e.score += v;
      ve.total += v;
      o.st = "pop";
      o.t = 0;
      G.fns.fs(o.x, 0.7, o.z, o.gold ? 14 : 7, o.gold ? 16755021 : 16774048, 2);
      return;
    }
  };

  NET.host = function () {
    if (!NET.online) return true;
    var A = NET.arena;
    if (!A) return true;
    return A.local || A.host;
  };

  // 모둠 점수판: 우리 모둠은 내 화면에서, 다른 모둠은 서버로 받은 점수로
  NET.gaOverride = function (n) {
    var A = NET.arena,
      W = NET.world;
    if (!A || A.mode !== "group" || !W) return null;
    var arr = new Array(n).fill(0);
    for (var g in W.gs) if (+g < n) arr[+g] = W.gs[g];
    var mine = 0;
    NET.G.on.forEach(function (E) {
      mine += E.score || 0;
    });
    if (A.g != null && A.g < n) arr[A.g] = mine;
    return arr;
  };

  // ---------------------------------------------------------------- 그 밖에
  NET.emo = function (e) {
    if (NET.online) NET.cloud.send({ t: "emo", e: e });
  };

  // now: 기다리지 않고 바로 보내요(방 크기를 바꾸고 다시 불러오기 직전처럼). rs: 내 방 크기(0 작은 방·1 보통 방·2 넓은 방) — 기기를 바꿔도 같은 크기로 열려요
  NET.saveHome = function (now) {
    if (!NET.online || NET.role !== "student" || !NET.G) return;
    clearTimeout(NET.saveTimer);
    function send() {
      var G = NET.G;
      NET.lastApples = G.Yf;
      // 친구 집을 구경하는 동안에는 내 방 목록을 따로 보관해 둔 것으로 저장해요
      var room = NET.visiting && NET.myRoom ? NET.myRoom : G.Wi.room.list;
      var rs = window.HOME && HOME.roomSize ? HOME.roomSize().k : undefined;
      var wall = window.HOME && HOME.myWall ? HOME.myWall() : undefined; // 벽지도 같이(친구가 놀러 오면 내 벽지로 보여요)
      NET.cloud.send({ t: "save", d: { home: { yard: G.Wi.yard.list, room: room, rs: rs, wall: wall }, apples: G.Yf } });
    }
    if (now) send();
    else NET.saveTimer = setTimeout(send, 1500);
  };

  NET.status = function (msg) {
    var c = $("netChip");
    if (!c) return;
    if (msg) {
      c.textContent = msg;
      NET.statusMsgUntil = now() + 6;
      return;
    }
    if (NET.statusMsgUntil && now() < NET.statusMsgUntil) return;
    var ok = NET.cloud && NET.cloud.ready;
    var n = NET.studentCount();
    var txt = ok ? "🟢 " + NET.room + " · 친구 " + n + "명" : "🔄 다시 연결하는 중…";
    if (NET.groupLink && NET.arena && NET.arena.mode === "group") {
      var s = NET.groupLink.status();
      txt += s === "p2p" ? " · 모둠 직접 연결" : s === "cloud" ? " · 모둠 서버 연결" : " · 모둠 연결 중";
    }
    c.textContent = txt;
    NET.updatePanel();
  };

  // 선생님 패널에 접속 정보와 백업 버튼을 붙여요
  NET.buildPanel = function () {
    if (NET.role !== "teacher") return;
    var panel = $("panel");
    var note = $("pNote");
    if (note) note.innerHTML = "";
    var box = document.createElement("div");
    box.id = "netPanel";
    var link = location.origin + location.pathname + "?room=" + encodeURIComponent(NET.room);
    box.innerHTML =
      '<h3>🚪 수업 문</h3><div id="npGateTxt" style="font-size:14px;font-weight:800;margin:2px 2px 8px"></div>' +
      '<div class="pg"><button class="pb" data-h="1">1시간 열기</button><button class="pb" data-h="2">2시간 열기</button><button class="pb" data-h="3">3시간 열기</button><button class="pb" data-h="0">지금 닫기</button></div>' +
      '<h3>🌐 우리 반 접속</h3><div id="netLink">' + esc(link) + "</div>" +
      '<div class="pg"><button class="pb" id="npCopy">주소 복사</button><button class="pb" id="npUsage">오늘 사용량<small id="npUsageV">-</small></button>' +
      '<button class="pb" id="npBackup">💾 기록 백업<small>파일로 내려받기</small></button><button class="pb" id="npRestore">📂 백업 불러오기<small>파일 고르기</small></button></div>' +
      '<input type="file" id="npFile" accept=".json,application/json" hidden><div id="pNote2" style="font-size:12px;color:#7a8a9c;line-height:1.5;margin-top:8px"></div>';
    panel.appendChild(box);
    box.querySelectorAll("[data-h]").forEach(function (b) {
      b.onclick = function () {
        NET.cloud.send({ t: "gate", hours: +b.getAttribute("data-h") });
      };
    });
    $("npCopy").onclick = function () {
      try {
        navigator.clipboard.writeText(link);
        $("npCopy").textContent = "복사했어요!";
      } catch (e) {
        $("npCopy").textContent = "위 주소를 눌러 복사";
      }
      setTimeout(function () {
        $("npCopy").textContent = "주소 복사";
      }, 2000);
    };
    $("npUsage").onclick = function () {
      NET.cloud.send({ t: "usage" });
    };
    $("npBackup").onclick = function () {
      fetch((CONFIG.server || "") + "/api/backup?room=" + encodeURIComponent(NET.room), { headers: { "x-teacher-pw": NET.pw } })
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          if (!j.ok) return alert(j.error || "내려받지 못했어요");
          var blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" });
          var a = document.createElement("a");
          var d = new Date();
          a.href = URL.createObjectURL(blob);
          a.download = NET.room + "-기록-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 1000);
        })
        .catch(function () {
          alert("내려받지 못했어요");
        });
    };
    $("npRestore").onclick = function () {
      $("npFile").click();
    };
    $("npFile").onchange = function () {
      var f = $("npFile").files[0];
      if (!f) return;
      f.text().then(function (txt) {
        if (!confirm("이 백업 파일로 학생 기록을 되돌릴까요?")) return;
        fetch((CONFIG.server || "") + "/api/restore?room=" + encodeURIComponent(NET.room), { method: "POST", headers: { "x-teacher-pw": NET.pw, "content-type": "application/json" }, body: txt })
          .then(function (r) {
            return r.json();
          })
          .then(function (j) {
            alert(j.ok ? "학생 " + j.restored + "명의 기록을 되돌렸어요" : j.error || "되돌리지 못했어요");
          });
      });
      $("npFile").value = "";
    };
    NET.updatePanel();
  };

  // ================================================================ 집 · 칠판 · 모두 광장으로 · 반 별
  function josa(name) {
    var c = String(name).charCodeAt(String(name).length - 1) - 44032;
    return c >= 0 && c < 11172 && c % 28 !== 0 ? "이네" : "네";
  }
  function objJosa(word) {
    var c = String(word).charCodeAt(String(word).length - 1) - 44032;
    return c >= 0 && c < 11172 && c % 28 !== 0 ? "을" : "를";
  }
  function shortName(n) {
    n = String(n || "");
    return n.length > 5 ? n.slice(0, 5) : n;
  }
  function ownerOf(k) {
    for (var n in NET.plots || {}) if (NET.plots[n] === k) return n;
    return null;
  }

  // 마을을 만들기 전에 불러요: 내 집 자리와 주인 있는 집을 표시해요
  NET.pickHome = function (D) {
    if (!NET.online) return;
    var owned = {};
    for (var n in NET.plots || {}) owned[NET.plots[n]] = 1;
    for (var k = 0; k < D.length; k++) {
      D[k].owned = !!owned[k];
      if (owned[k]) delete D[k].fence; // 마당과 겹치지 않게
    }
    var mk = NET.role === "student" && NET.myPlot != null && D[NET.myPlot] ? NET.myPlot : -1;
    if (mk >= 0) {
      for (var j = 0; j < D.length; j++) D[j].mine = false;
      D[mk].mine = true;
      delete D[mk].fence;
    }
  };
  // 친구들의 마당(집 번호별)
  NET.yardsByHouse = function () {
    return NET.yards || {};
  };
  // 집 이름표를 진짜 주인 이름으로 바꿔요
  NET.relabel = function () {
    var G = NET.G;
    if (!G || !G.SG || !G.SG.items || !G.SG.tex) return;
    var SG = G.SG,
      D = G.D,
      T = NET.role === "teacher",
      mine = -1;
    for (var k = 0; k < D.length; k++) {
      var o = ownerOf(k),
        lab;
      if (D[k].mine) mine = k;
      if (D[k].mine && !T) lab = ["⭐ 나의 집", true];
      else if (o) lab = [shortName(o) + josa(shortName(o)), false];
      else lab = ["빈 집", false];
      SG.items[k] = lab;
      D[k].label = lab[0].replace("⭐ ", "");
    }
    var mo = mine >= 0 ? ownerOf(mine) : null;
    SG.items[D.length] = T ? ["🌷 " + (mo ? shortName(mo) + josa(shortName(mo)) + " 마당" : "빈 마당"), false] : ["🌷 나의 마당", true];
    try {
      SG.draw(SG.tex.userData.g);
      SG.tex.needsUpdate = true;
    } catch (e) {}
  };

  // ---------------------------------------------------------------- 친구 집 구경
  NET.knock = function (k) {
    if (!NET.online) return NET.fakeKnock(k);
    var G = NET.G,
      o = ownerOf(k);
    if (!o) {
      G.fns.Kt(G.Y, "빈 집이에요 🏠", 2);
      return;
    }
    if (NET.knocking && now() - NET.knocking.t < 4) return;
    if (G.S.mode !== "free" && G.S.mode !== "gather") {
      G.fns.Kt(G.Y, "지금은 활동 중이에요", 2);
      return;
    }
    NET.knocking = { k: k, owner: o, t: now() };
    NET.cloud.send({ t: "home?", name: o });
    G.fns.Kt(G.Y, "똑똑! 🚪", 1.2);
  };
  NET.onHome = function (m) {
    var K = NET.knocking,
      G = NET.G;
    NET.knocking = null;
    if (NET.visiting) return; // 이미 다른 집에 들어가는 중(내 방 보관이 친구 방으로 바뀌지 않게, 검토)
    if (!K || !G || K.owner !== m.name) return;
    if (G.S.loc !== "village" || G.S.deco || (G.S.mode !== "free" && G.S.mode !== "gather")) return;
    var h = G.D[K.k];
    if (Math.hypot(G.Y.x - h.x, G.Y.z - (h.z + 2.05)) > 2.6) return; // 문 앞에서 멀어졌어요
    NET.myRoom = G.Wi.room.list.map(function (x) {
      return { id: x.id, c: x.c, r: x.r, rot: x.rot };
    });
    NET.visiting = { k: K.k, owner: K.owner };
    var room = m.home && Array.isArray(m.home.room) ? m.home.room : G.Wi.room.start;
    G.loadRoom(room, m.home && Array.isArray(m.home.room) ? m.home.rs : undefined); // 친구 방 크기가 다르면 내 방 크기에 맞춰 보여 줘요(plaza_home.js HOME.remap)
    if (window.HOME && HOME.showWall) HOME.showWall(m.home && m.home.wall); // 친구 벽지(구경하는 동안만, 저장 안 함)
    G.fns.fc();
    // 들어가지 못했으면 원래대로 돌려 둬요. 낡은 패드는 문 여는 장면이 늦게 끝나서 넉넉히 기다려요(1.5초만 보면 친구 방 대신 내 방이 열렸음)
    var V = NET.visiting,
      t0 = now();
    var chk = setInterval(function () {
      if (NET.visiting !== V || G.S.loc === "room") return clearInterval(chk);
      if (now() - t0 > 8) {
        clearInterval(chk);
        NET.endVisit();
      }
    }, 300);
  };
  NET.visitBanner = function () {
    var V = NET.visiting;
    if (V) NET.G.fns.Ln("🏠 " + V.owner + josa(V.owner) + " 집", "구경하러 왔어요! 물건은 바꿀 수 없어요", "문으로 나가면 다시 마을이에요", 5);
  };
  NET.visitDoor = function () {
    var h = NET.G.D[NET.visiting ? NET.visiting.k : 0];
    return { x: h.x, z: h.z + 2.05 };
  };
  NET.endVisit = function () {
    if (!NET.visiting) return;
    NET.visiting = null;
    NET.G.loadRoom(NET.myRoom || []);
    NET.myRoom = null;
    if (window.HOME && HOME.restoreWall) HOME.restoreWall();
  };

  // ---------------------------------------------------------------- 서버가 없을 때(시험판): 가짜 친구 집 구경
  // 집 이름표의 친구(하늘이네·바다네 …) 집 문 앞에서 똑똑 → 그 친구가 꾸민 방을 구경해요.
  // 방은 친구 이름과 집 번호로 정해서(같은 친구 집은 늘 같은 방), 진짜 서버 때와 같은 화면 흐름(NET.onHome → visiting)을 써요.
  function seeded(str) {
    var h = hash(str) || 1;
    return function () {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 100000) / 100000;
    };
  }
  NET.ownerName = function (k) {
    var h = NET.G && NET.G.D[k];
    if (!h) return null;
    if (h.owner) return h.owner; // plaza_inject.py가 원래 이름(하늘·별이…)을 적어 둬요
    return String(h.label || "").replace(/(이네|네)$/, "") || null;
  };
  // 방 꾸미기 주제: 침대·벽지·소품을 어울리게 골라요
  var THEMES = [
    { bed: "bed_princess", wall: "wp_pink", want: ["teddy", "starlamp", "plant", "gift", "clock_round", "lamp"] },
    { bed: "bed_rocket", wall: "wp_star", want: ["clock_star", "starlamp", "tv", "shelf", "dino", "lamp"] },
    { bed: "bed_car", wall: "wp_sky", want: ["dino", "tv", "shelf", "clock_alarm", "plant", "gift"] },
    { bed: "bed_cloud", wall: "wp_sky", want: ["plant", "plant", "aquarium", "lamp", "clock_round", "teddy"] },
    { bed: "bed_bunk", wall: "wp_lemon", want: ["piano", "clock_cuckoo", "shelf", "shelf", "plant", "teddy"] },
    { bed: "bed", wall: "wp_mint", want: ["aquarium", "plant", "plant", "shelf", "clock_grand", "lamp"] },
    { bed: "bed_bunk", wall: "wp_rainbow", want: ["gift", "dino", "teddy", "tv", "starlamp", "clock_cuckoo"] },
    { bed: "bed", wall: "wp_default", want: ["shelf", "tv", "lamp", "plant", "clock_round", "piano"] },
  ];
  NET.fakeHome = function (name, k) {
    var G = NET.G,
      s = G.Wi.room,
      cols = s.cols,
      rows = s.rows,
      defs = s.defs,
      rnd = seeded("home:" + name + ":" + k);
    var pick = function (a) {
      return a[Math.floor(rnd() * a.length)];
    };
    var th = THEMES[Math.floor(rnd() * THEMES.length)];
    var used = {},
      list = [];
    var mid = cols / 2;
    // 문(앞줄 가운데 두 칸)에서 방 가운데까지 길은 비워 둬요
    for (var r = rows - 3; r < rows; r++) {
      used[mid - 1 + "," + r] = 1;
      used[mid + "," + r] = 1;
    }
    (s.reserved ? Array.from(s.reserved) : []).forEach(function (key) {
      used[key] = 1;
    });
    var size = function (id, rot) {
      var d = defs[id];
      return rot % 2 ? [d.d || 1, d.w || 1] : [d.w || 1, d.d || 1];
    };
    var put = function (id, c, r, rot) {
      if (!defs[id]) return false;
      var same = list.filter(function (it) {
        return it.id === id;
      }).length;
      if (same >= (id === "plant" || id === "shelf" ? 2 : 1) && id !== th.bed) return false; // 같은 물건은 한두 개만

      var sz = size(id, rot);
      if (c < 0 || r < 0 || c + sz[0] > cols || r + sz[1] > rows) return false;
      for (var x = c; x < c + sz[0]; x++) for (var y = r; y < r + sz[1]; y++) if (used[x + "," + y]) return false;
      for (x = c; x < c + sz[0]; x++) for (y = r; y < r + sz[1]; y++) used[x + "," + y] = 1;
      list.push({ id: id, c: c, r: r, rot: rot });
      return true;
    };
    var tryAt = function (id, spots, rot) {
      for (var i = 0; i < spots.length; i++) if (put(id, spots[i][0], spots[i][1], rot || 0)) return true;
      return false;
    };
    var shuffled = function (a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)),
          t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    };
    var left = rnd() < 0.5;
    // 1) 침대: 뒷벽 구석
    put(th.bed, left ? 0 : cols - 1, 0, 0);
    // 2) 러그와 소파(또는 식탁) — 방 가운데쯤
    var rc = Math.max(1, Math.min(cols - 3, Math.floor(mid - 1 + (rnd() - 0.5) * 3)));
    put("rug", rc, 1, 0);
    if (rnd() < 0.6) {
      put("sofa", rc, 3, 2) || put("sofa", rc + 1, 3, 2);
    }
    var tc = left ? cols - 3 : 1;
    if (rnd() < 0.7 && put("table", tc, 3, 0)) put("chair", tc, 4, 2) || put("chair", tc + 1, 3, 3);
    // 3) 주제 소품: 시계는 벽에, 나머지는 뒷벽·옆벽을 따라
    var back = [],
      sides = [];
    for (var c = 0; c < cols; c++) back.push([c, 0]);
    for (r = 1; r < rows - 1; r++) {
      sides.push([0, r]);
      sides.push([cols - 1, r]);
    }
    var wants = th.want.slice();
    if (rnd() < 0.5) wants.push(pick(["plant", "teddy", "gift", "lamp", "dino"]));
    wants.forEach(function (id) {
      var d = defs[id];
      if (!d) return;
      if (d.wall) {
        // 벽시계: 왼쪽·오른쪽 벽(옆벽 줄) 중 하나
        var wr = 1 + Math.floor(rnd() * (rows - 2));
        list.push(rnd() < 0.5 ? { id: id, c: 0, r: wr, rot: 3 } : { id: id, c: cols - 1, r: wr, rot: 1 });
        return;
      }
      if (!tryAt(id, shuffled(back.slice()), 0)) tryAt(id, shuffled(sides.slice()), 0);
    });
    // 4) 조금 더 채우기(친구마다 개수가 달라요)
    var extra = 1 + Math.floor(rnd() * 3);
    for (var e = 0; e < extra; e++) tryAt(pick(["plant", "teddy", "lamp", "gift", "shelf"]), shuffled(sides.slice()), 0);
    return { room: list, rs: G.Wi && window.HOME && HOME.roomSize ? HOME.roomSize().k : undefined, wall: th.wall };
  };
  NET.fakeKnock = function (k) {
    var G = NET.G;
    if (!G) return;
    var name = NET.ownerName(k);
    var h = G.D[k];
    if (!name || !h || h.mine || NET.visiting) return;
    if (NET.knocking && now() - NET.knocking.t < 3) return;
    if (G.S.mode !== "free" && G.S.mode !== "gather") {
      G.fns.Kt(G.Y, "지금은 활동 중이에요", 2);
      return;
    }
    NET.knocking = { k: k, owner: name, t: now() };
    G.fns.Kt(G.Y, "똑똑! 🚪", 1.2);
    setTimeout(function () {
      NET.onHome({ t: "home", name: name, home: NET.fakeHome(name, k) });
    }, 700);
  };

  // ---------------------------------------------------------------- 칠판
  NET.boardText = NET.boardText || "";
  function wrapText(a, text, maxW) {
    var out = [];
    String(text).split(/\n/).forEach(function (para) {
      var parts = para.split(/(\s+)/),
        line = "";
      parts.forEach(function (w) {
        if (!w) return;
        if (a.measureText(line + w).width <= maxW) {
          line += w;
          return;
        }
        if (line.trim()) out.push(line.trim());
        line = "";
        w = w.trim();
        if (!w) return;
        var cur = "";
        for (var ch of w) {
          if (cur && a.measureText(cur + ch).width > maxW) {
            out.push(cur);
            cur = ch;
          } else cur += ch;
        }
        line = cur;
      });
      if (line.trim() || !out.length) out.push(line.trim());
    });
    return out;
  }
  NET.drawBoard = function (a, l, u, font, rr) {
    a.fillStyle = "#26415e";
    a.fillRect(0, 0, l, u);
    a.fillStyle = "#2f5274";
    rr(a, 12, 12, l - 24, u - 24, 22);
    a.fill();
    a.textAlign = "center";
    a.textBaseline = "middle";
    var txt = String(NET.boardText || "").trim();
    if (!txt) {
      a.fillStyle = "#ffd43b";
      a.font = "900 46px " + font;
      a.fillText("🏡 우리 반 광장", l / 2, 92);
      a.fillStyle = "#cfe3f5";
      a.font = "700 24px " + font;
      a.fillText(NET.online ? (NET.role === "teacher" ? "패널의 📝 칠판에 쓰기로 글을 써요" : "선생님 말씀이 여기에 나와요") : "OX 퀴즈와 선생님 말씀이 여기에 나와요", l / 2, 160);
      return;
    }
    var sizes = [52, 44, 38, 33, 28, 24],
      lines = [],
      sz = 24;
    for (var i = 0; i < sizes.length; i++) {
      sz = sizes[i];
      a.font = "800 " + sz + "px " + font;
      lines = wrapText(a, txt, l - 60);
      if (lines.length * sz * 1.22 <= u - 44) break;
    }
    var lh = sz * 1.22,
      y0 = u / 2 - ((lines.length - 1) * lh) / 2;
    a.fillStyle = "#ffffff";
    lines.forEach(function (ln, j) {
      a.fillText(ln, l / 2, y0 + j * lh);
    });
  };
  NET.setBoard = function (text, fresh) {
    NET.boardText = text || "";
    var G = NET.G;
    if (G && G.fns && G.fns.ms && !G.Ye.on && G.S.mode !== "quizEnd") G.fns.ms({ mode: "idle" });
    var b = $("boardBtn");
    if (b) {
      b.hidden = !NET.boardText;
      if (fresh && NET.boardText && NET.role !== "teacher") b.classList.add("new");
    }
    var bt = $("bvText");
    if (bt) bt.textContent = NET.boardText;
    var ta = $("npBoard");
    if (ta && document.activeElement !== ta) ta.value = NET.boardText;
    if (fresh && NET.boardText && G && NET.role === "student") G.fns.Ln("📋 칠판에 새 글", NET.boardText.replace(/\s+/g, " ").slice(0, 60), "오른쪽 위 📋 칠판을 누르면 크게 볼 수 있어요", 8);
  };

  // ---------------------------------------------------------------- 10초 뒤 모두 광장으로
  NET.recall = function () {
    if (NET.role !== "teacher") return;
    NET.cloud.send({ t: "recall", sec: NET.recallT ? 0 : 10 }); // 세는 중에 한 번 더 누르면 취소
  };
  NET.startRecall = function (sec) {
    clearInterval(NET.recallT);
    NET.recallT = null;
    var el = $("recallBox");
    NET.recallLeft = 0;
    if (!el) return;
    if (!sec) {
      el.hidden = true;
      NET.updateGatherBtn();
      return;
    }
    var end = Date.now() + sec * 1000,
      last = -1;
    el.hidden = false;
    var tick = function () {
      var left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(NET.recallT);
        NET.recallT = null;
        el.hidden = true;
        NET.updateGatherBtn();
        NET.gatherNow(false);
        return;
      }
      if (left !== last) {
        last = left;
        $("rcNum").textContent = left;
        $("rcNum").classList.remove("pop");
        void $("rcNum").offsetWidth;
        $("rcNum").classList.add("pop");
        try {
          if (left <= 3) NET.G.ht.ding();
          else NET.G.ht.click();
        } catch (e) {}
      }
    };
    tick();
    NET.recallT = setInterval(tick, 200);
    NET.updateGatherBtn();
  };
  NET.updateGatherBtn = function () {
    var b = $("pGather");
    if (b && NET.online) b.textContent = NET.recallT ? "⏹ 모이기 취소" : "📣 모두 광장으로 (10초)";
  };
  NET.gatherNow = function (quiet) {
    var G = NET.G;
    if (!G) return;
    if (NET.role === "teacher") {
      NET.allow.ua = 0;
      G.fns.uc(function () {
        G.fns.ua();
        G.tp(0, 10, Math.PI);
      });
      return;
    }
    G.fns.uc(function () {
      var a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * 5.2;
      G.tp(Math.cos(a) * r, 4.5 + Math.sin(a) * r * 0.75, Math.PI);
      if (!quiet) G.fns.Ln("📣 선생님", "모두 광장에 모였어요!", "무대 앞 칠판을 봐요", 5);
    });
  };

  // ---------------------------------------------------------------- 반 별(게임을 깬 횟수)과 광장 변화
  // 별 40개까지는 단계마다 새것이 생겨요(꽃 → 풍선 → 노을 → 별밤 불꽃 → 무지개).
  // 그 뒤로는 별 8개마다 하루가 흘러가요(아침 → 노을 → 별밤 → 아침 …). 그래서 광장이 계속 바뀌어요.
  var STAGES = [0, 3, 8, 15, 25, 40];
  var STAGE_NAME = ["", "🌸 꽃이 활짝 피었어요", "🎈 축제 풍선이 떴어요", "🌇 노을빛 광장이 되었어요", "🌙 별밤 불꽃놀이가 시작돼요", "🌈 무지개가 떴어요"];
  var CYCLE = 8,
    CYCLE_MOOD = ["day", "sunset", "night"],
    CYCLE_NAME = ["☀️ 새 아침! 무지개가 다시 떴어요", "🌇 다시 노을이 져요", "🌙 별밤 불꽃놀이 시간이에요"];
  var GAME_NAME = { jangteo: "뚝딱 장터", heart: "하트 특공대", sarang: "사랑둥이 대모험" };
  NET.stageOf = function (n) {
    var st = 0;
    for (var i = 0; i < STAGES.length; i++) if (n >= STAGES[i]) st = i;
    return st;
  };
  // 별 n개일 때 광장 모습: 단계(st), 분위기(mood), 이름(name), 다음 변화까지 별(next), 바뀜 확인용 열쇠(key)
  NET.progView = function (n) {
    n = Math.max(0, n | 0);
    var st = NET.stageOf(n),
      last = STAGES[STAGES.length - 1];
    if (n < last) return { st: st, mood: st === 3 ? "sunset" : st === 4 ? "night" : "day", name: STAGE_NAME[st], next: STAGES[st + 1], key: "s" + st };
    var c = Math.floor((n - last) / CYCLE),
      ph = c % 3;
    return { st: st, mood: CYCLE_MOOD[ph], name: c === 0 ? STAGE_NAME[st] : CYCLE_NAME[ph], next: last + (c + 1) * CYCLE, key: "c" + c };
  };
  NET.applyProg = function (ev) {
    var G = NET.G;
    if (!G || !G.TX) return;
    var P = NET.prog || { stars: 0, mood: "auto" },
      V = NET.progView(P.stars);
    G.TX.setStage(V.st);
    G.TX.setMood(P.mood && P.mood !== "auto" ? P.mood : V.mood);
    var chip = $("starChip");
    if (chip) {
      chip.hidden = false;
      chip.innerHTML = "⭐ " + P.stars + "<small>/" + V.next + "</small>";
    }
    if (ev) {
      G.TX.celebrate();
      var up = NET.progView(P.stars - 1).key !== V.key,
        gn = GAME_NAME[ev.game] || "미니게임",
        who = (ev.team | 0) > 1 ? ev.name + " 팀이 " : ev.name + " 친구가 ";
      G.fns.Ln(up ? V.name : "⭐ 반 별 +1", who + gn + objJosa(gn) + " 깼어요!", "반 별 " + V.next + "개가 되면 광장이 또 바뀌어요", 6);
    }
    NET.updateProgPanel();
  };
  NET.updateProgPanel = function () {
    var el = $("npStars");
    if (!el) return;
    var P = NET.prog || { stars: 0, mood: "auto" },
      V = NET.progView(P.stars);
    el.innerHTML = "⭐ <b>" + P.stars + "</b>개 · " + (V.name || "아직 그대로예요") + "<br><small>다음 변화: 별 " + V.next + "개</small>";
    document.querySelectorAll("#netExtra [data-mood]").forEach(function (b) {
      b.classList.toggle("sel", b.getAttribute("data-mood") === (P.mood || "auto"));
    });
  };

  // ---------------------------------------------------------------- 화면 조각들
  NET.buildExtras = function () {
    if (!document.getElementById("netExtraCss")) {
      var css = document.createElement("style");
      css.id = "netExtraCss";
      css.textContent =
        "#starChip,#boardBtn{font-weight:900}#starChip small{font-size:11px;opacity:.7;margin-left:2px}" +
        "#boardBtn.new{animation:nbPulse 1s ease-in-out infinite;background:#ffd43b!important}@keyframes nbPulse{50%{transform:scale(1.08)}}" +
        "#boardView{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(20,35,60,.55)}" +
        "#boardView .bv{width:min(640px,92vw);background:#26415e;border:8px solid #b07a43;border-radius:22px;padding:22px 22px 18px;box-shadow:0 14px 40px rgba(0,0,0,.35);text-align:center}" +
        "#boardView .bvT{color:#ffd43b;font-size:18px;font-weight:900;margin-bottom:10px}#bvText{color:#fff;font-size:clamp(22px,4.6vw,38px);font-weight:800;line-height:1.45;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}" +
        "#boardView button{margin-top:16px;border:0;border-radius:999px;padding:10px 26px;font-size:17px;font-weight:900;background:#ffd43b;color:#5c3d00}" +
        "#recallBox{position:fixed;left:50%;top:26%;transform:translate(-50%,-50%);z-index:58;text-align:center;pointer-events:none}" +
        "#recallBox .rcT{display:inline-block;background:rgba(255,255,255,.95);border-radius:999px;padding:8px 20px;font-size:20px;font-weight:900;color:#d6336c;box-shadow:0 6px 18px rgba(30,60,100,.25)}" +
        "#rcNum{font-size:120px;font-weight:900;color:#fff;text-shadow:0 5px 0 #d6336c,0 10px 30px rgba(120,20,60,.4);line-height:1.1}#rcNum.pop{animation:rcPop .4s ease-out}@keyframes rcPop{0%{transform:scale(1.5)}100%{transform:scale(1)}}" +
        "#netExtra textarea{width:100%;box-sizing:border-box;min-height:64px;border:2px solid #d0dbe8;border-radius:12px;padding:8px 10px;font:700 15px/1.4 inherit;font-family:inherit;resize:vertical;-webkit-user-select:text;user-select:text}" +
        "#netExtra .pb.sel{outline:3px solid #2f8cff}#npStars{font-size:14px;font-weight:800;margin:2px 2px 8px;color:#3d4d61}#npStars small{color:#7a8a9c}" +
        "body.moodNight #vig{opacity:1}";
      document.head.appendChild(css);
    }
    // 오른쪽 위: 반 별과 칠판 단추
    var topR = $("topR");
    if (topR && !$("starChip")) {
      var sc = document.createElement("button");
      sc.id = "starChip";
      sc.className = "card";
      sc.hidden = true;
      sc.title = "우리 반이 미니게임을 깰 때마다 별이 하나씩 모여요";
      sc.onclick = function () {
        var P = NET.prog || { stars: 0 },
          V = NET.progView(P.stars);
        NET.G.fns.Ln("⭐ 반 별 " + P.stars + "개", V.name || "미니게임을 깨면 별이 모여요", "별 " + V.next + "개가 되면 광장이 바뀌어요", 5);
      };
      topR.insertBefore(sc, topR.firstChild);
      var bb = document.createElement("button");
      bb.id = "boardBtn";
      bb.className = "card";
      bb.hidden = true;
      bb.textContent = "📋 칠판";
      bb.onclick = function () {
        bb.classList.remove("new");
        $("boardView").hidden = false;
      };
      topR.insertBefore(bb, sc.nextSibling);
    }
    if (!$("boardView")) {
      var bv = document.createElement("div");
      bv.id = "boardView";
      bv.hidden = true;
      bv.innerHTML = '<div class="bv"><div class="bvT">📋 선생님 칠판</div><div id="bvText"></div><button type="button">닫기</button></div>';
      bv.onclick = function (e) {
        if (e.target === bv || e.target.tagName === "BUTTON") bv.hidden = true;
      };
      document.body.appendChild(bv);
    }
    if (!$("recallBox")) {
      var rb = document.createElement("div");
      rb.id = "recallBox";
      rb.hidden = true;
      rb.innerHTML = '<div class="rcT">📣 모두 광장으로 모여요!</div><div id="rcNum">10</div>';
      document.body.appendChild(rb);
    }
    if (NET.role !== "teacher") return;
    // 선생님 패널: 칠판 쓰기, 반 별
    var panel = $("panel");
    if (!panel || $("netExtra")) return;
    var box = document.createElement("div");
    box.id = "netExtra";
    box.innerHTML =
      '<h3>📝 칠판에 쓰기</h3><textarea id="npBoard" maxlength="120" placeholder="예) 10시 20분까지 뚝딱 장터 2판!&#10;다 하면 광장 분수 앞에 모여요"></textarea>' +
      '<div class="pg"><button class="pb main" id="npBoardGo">칠판에 쓰기</button><button class="pb" id="npBoardClr">지우기</button></div>' +
      '<h3>⭐ 반 별과 광장 분위기</h3><div id="npStars"></div>' +
      '<div class="pg"><button class="pb" data-mood="auto">자동<small>별에 따라</small></button><button class="pb" data-mood="day">☀️ 낮</button><button class="pb" data-mood="sunset">🌇 노을</button><button class="pb" data-mood="night">🌙 밤</button></div>' +
      '<div class="pg" style="margin-top:6px"><button class="pb" id="npStarReset">별 0개로</button></div>';
    var first = panel.firstElementChild;
    panel.insertBefore(box, first ? first.nextElementSibling && first.nextElementSibling.nextElementSibling : null);
    $("npBoard").value = NET.boardText || "";
    $("npBoardGo").onclick = function () {
      NET.cloud.send({ t: "board", text: $("npBoard").value.trim() });
      $("npBoard").blur();
    };
    $("npBoardClr").onclick = function () {
      $("npBoard").value = "";
      NET.cloud.send({ t: "board", text: "" });
    };
    box.querySelectorAll("[data-mood]").forEach(function (b) {
      b.onclick = function () {
        NET.cloud.send({ t: "mood", mood: b.getAttribute("data-mood") });
      };
    });
    var armed = 0;
    $("npStarReset").onclick = function () {
      if (!armed) {
        armed = 1;
        $("npStarReset").textContent = "한 번 더 누르면 0개";
        setTimeout(function () {
          armed = 0;
          var r = $("npStarReset");
          if (r) r.textContent = "별 0개로";
        }, 3000);
        return;
      }
      armed = 0;
      $("npStarReset").textContent = "별 0개로";
      NET.cloud.send({ t: "mood", reset: true });
    };
    NET.updateGatherBtn();
    NET.updateProgPanel();
  };

  NET.updatePanel = function () {
    if (NET.role !== "teacher") return;
    var v = $("npUsageV");
    if (v && NET.usage) v.textContent = "무료 한도의 " + NET.usage.percent + "%";
    var gt = $("npGateTxt");
    if (gt) {
      var open = NET.gateUntil && NET.gateUntil > Date.now();
      if (open) {
        var d = new Date(NET.gateUntil);
        gt.innerHTML = '<span style="color:#2b8a3e">🔓 열려 있어요 · ' + (d.getHours() < 12 ? "오전 " : "오후 ") + (((d.getHours() + 11) % 12) + 1) + ":" + String(d.getMinutes()).padStart(2, "0") + "에 저절로 닫혀요</span>";
      } else gt.innerHTML = '<span style="color:#c92a2a">🔒 닫혀 있어요 · 학생이 들어올 수 없어요</span>';
    }
    var n2 = $("pNote2");
    if (n2) n2.textContent = "지금 학생 " + NET.studentCount() + "명이 들어와 있어요. 사용량은 매일 오전 9시에 0으로 돌아가요.";
  };
})();
