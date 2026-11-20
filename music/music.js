/* 배경 음악 (music.js) — 광장과 모든 포털 게임이 같이 쓴다
 *
 * 넣는 법: <script src="music/music.js" data-track="plaza" data-btn="after:#bSound"></script>
 *          (games/ 안의 게임은 src="../music/music.js")
 *   data-track  처음에 틀 곡 이름(아래 TRACKS). 없으면 페이지가 BGM.play('이름')을 부를 때까지 조용히 기다림
 *   data-btn    음악 켜기/끄기 단추 자리
 *                 "after:#아이디"  그 단추 바로 뒤에 같은 모양으로 붙임(그 단추가 늦게 생겨도 기다렸다 붙임)
 *                 "fixed:top-right:12,70"  화면 구석에 띄움(top-left·top-right·bottom-left·bottom-right, 가로,세로 px)
 *                 "none"  단추 없음(페이지가 BGM.toggle()을 부르는 자기 단추를 씀)
 *   data-label  "icon"(🎵, 끄면 빗금) 또는 "text"(음악 켬 / 음악 끔)
 *   data-vol    음악 크기 0~1 (기본 0.5)
 *   data-mute   "1"이면 페이지가 BGM.mute(false)를 부를 때까지 조용히 기다림
 *
 * 지키는 것
 *   - 첫 터치(클릭·키) 뒤에만 소리를 낸다(브라우저 자동 재생 규칙)
 *   - http(광장 서버·인터넷 주소)에서는 Web Audio로 끊김 없이 반복, 파일로 열면(file://) <audio>로 반복
 *   - 음악 끄기는 이 기기의 광장·모든 게임에 같이 기억된다(localStorage "plaza.music" = "0")
 *   - 페이지의 원래 소리 끄기 단추(🔇)를 누르면 음악도 조용해진다(BGM.mute(true)) — 저장된 음악 설정은 그대로
 *   - 다른 앱·탭으로 가면 멈추고, 돌아오면 이어서
 *   - 곡을 바꿀 때 천천히 엇갈려 바뀜(BGM.play('sea', 1.5))
 *   - 주소에 ?mute=1 이 있으면 조용히(점검용), ?music=0/1 이면 이번만 끄기/켜기
 *
 * 쓰는 법(페이지 코드에서): BGM.play(id, 초) · BGM.stop(초) · BGM.mute(참/거짓) · BGM.duck(0~1) · BGM.toggle() · BGM.setOn(참/거짓)
 *   BGM.isOn() · BGM.state() · 바뀌면 window에 'bgmchange' 이벤트({detail:{on}})
 * 곡 파일과 TRACKS 목록은 tools/make_music.py가 만든다. 곡 정보·라이선스는 CREDITS.md.
 */
(function () {
  "use strict";
  if (window.BGM) return;
  var me = document.currentScript;
  var BASE = me && me.src ? me.src.replace(/[?#].*$/, "").replace(/[^\/]*$/, "") : "music/";
  var attr = function (k, d) {
    var v = me && me.getAttribute(k);
    return v == null || v === "" ? d : v;
  };
  /*TRACKS*/ var TRACKS = {"plaza":{"f":"plaza","s":0.25,"e":86.65},"home":{"f":"home","s":0.25,"e":40.25},"stars":{"f":"stars","s":0.25,"e":25.85},"jangteo":{"f":"jangteo","s":0.25,"e":80.25},"sea":{"f":"sea","s":0.25,"e":99.159093},"sky":{"f":"sky","s":0.25,"e":116.613651},"space":{"f":"space","s":0.25,"e":81.25},"heart_title":{"f":"heart_title","s":0.25,"e":11.544127},"heart":{"f":"heart","s":0.25,"e":74.50415},"heart_boss":{"f":"heart_boss","s":0.25,"e":82.14576},"sarang_town":{"f":"sarang_town","s":0.25,"e":109.964286},"sarang_field":{"f":"sarang_field","s":0.25,"e":106.181043},"sarang_mystery":{"f":"sarang_mystery","s":0.25,"e":80.25},"sarang_boss":{"f":"sarang_boss","s":0.25,"e":73.046213},"sarang_happy":{"f":"sarang_happy","s":0.25,"e":44.901179},"castle":{"f":"castle","s":0.25,"e":48.176803},"castle2":{"f":"castle2","s":0.25,"e":94.163039}}; /*END TRACKS*/

  var KEY = "plaza.music";
  var Q = new URLSearchParams(location.search);
  var VOL = Math.max(0, Math.min(1, parseFloat(attr("data-vol", "0.5")) || 0.5));
  var on = true;
  try {
    on = localStorage.getItem(KEY) !== "0";
  } catch (e) {}
  if (Q.get("music") === "0") on = false;
  if (Q.get("music") === "1") on = true;
  // data-mute="1": 페이지가 BGM.mute(false)를 부를 때까지 조용히(광장: '🔊 시작하기'를 누를 때까지)
  var pageMute = Q.get("mute") === "1" || attr("data-mute", "0") === "1";
  var duckV = 1;
  var want = attr("data-track", "") || null; // 지금 틀어야 할 곡
  var wantFade = 1.5;
  var unlocked = false;
  var hidden = document.visibilityState === "hidden";

  var canOgg = false;
  try {
    var ta = document.createElement("audio");
    canOgg = !!(ta.canPlayType && ta.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ""));
  } catch (e) {}
  var EXT = canOgg ? ".ogg" : ".mp3";
  var AC = window.AudioContext || window.webkitAudioContext;
  var useWA = !!AC && /^https?:$/.test(location.protocol) && !!window.fetch;

  function level() {
    return on && !pageMute ? VOL * duckV : 0;
  }
  function emit() {
    try {
      window.dispatchEvent(new CustomEvent("bgmchange", { detail: { on: on, track: want } }));
    } catch (e) {}
    paintBtn();
  }

  // ---------------- Web Audio (끊김 없는 반복) ----------------
  var ctx = null,
    master = null,
    meter = null,
    cur = null, // {id, src, g}
    bufs = {}, // id -> AudioBuffer (지금 곡만)
    suspT = null, // 소리가 0일 때 소리 장치를 쉬게 하는 타이머
    bytes = {}, // id -> Promise<ArrayBuffer>
    decoding = {};

  function getBytes(id) {
    if (!bytes[id]) {
      bytes[id] = fetch(BASE + TRACKS[id].f + EXT)
        .then(function (r) {
          if (!r.ok) throw new Error("music " + r.status);
          return r.arrayBuffer();
        })
        .catch(function (e) {
          // 받기 실패(서버가 잠깐 꺼짐·와이파이)는 표시해 두고 다음에 다시 받는다(<audio>로 바꾸지 않음)
          e = e || new Error("music fetch");
          e.net = true;
          throw e;
        });
      bytes[id].catch(function () {
        delete bytes[id];
      });
    }
    return bytes[id];
  }
  function decode(id) {
    if (bufs[id]) return Promise.resolve(bufs[id]);
    if (decoding[id]) return decoding[id];
    decoding[id] = getBytes(id)
      .then(function (ab) {
        delete bytes[id]; // 풀어 놓으면 원래 파일은 필요 없음
        return new Promise(function (res, rej) {
          var p = ctx.decodeAudioData(ab, res, rej);
          if (p && p.then) p.then(res, rej);
        });
      })
      .then(function (b) {
        delete decoding[id];
        bufs[id] = b;
        return b;
      });
    decoding[id].catch(function (e) {
      delete decoding[id];
      if (!e || !e.net) fallbackToEl(e); // 풀기(디코딩) 자체가 안 될 때만 <audio>로
    });
    return decoding[id];
  }
  // 낡은 패드 메모리: 풀어 놓은 곡은 지금 곡만 들고 있는다(엇갈려 바뀌기가 끝나면 앞 곡을 버림)
  function dropOld() {
    Object.keys(bufs).forEach(function (k) {
      if ((!cur || k !== cur.id) && k !== want) delete bufs[k];
    });
  }
  // resume·suspend는 약속(Promise)을 돌려주는데, 실패해도 콘솔에 빨간 오류가 남지 않게
  function ctxDo(k) {
    if (!ctx) return;
    try {
      var p = ctx[k]();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function makeCtx() {
    if (ctx) return;
    try {
      ctx = new AC();
    } catch (e) {
      useWA = false;
      return;
    }
    // 끄기→켜기를 빨리 누르면 쉬게 하기(suspend)가 늦게 끝나 조용히 멈춰 있을 수 있음 → 멈췄는데 나와야 하면 다시 깨움
    ctx.onstatechange = function () {
      if (ctx.state === "suspended" && unlocked && level() > 0 && want && !hidden) ctxDo("resume");
    };
    master = ctx.createGain();
    master.gain.value = level();
    meter = ctx.createAnalyser();
    meter.fftSize = 512;
    master.connect(meter);
    meter.connect(ctx.destination);
  }
  function waStart(id, fade) {
    if (!ctx || !TRACKS[id]) return;
    decode(id).then(function (b) {
      if (want !== id || !ctx || (cur && cur.id === id)) return;
      var t = TRACKS[id],
        now = ctx.currentTime,
        f = Math.max(0.05, fade);
      waStopCur(f);
      var src = ctx.createBufferSource(),
        g = ctx.createGain();
      src.buffer = b;
      src.loop = true;
      src.loopStart = t.s;
      src.loopEnd = t.e;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(1, now + f);
      src.connect(g);
      g.connect(master);
      src.start(now, t.s);
      cur = { id: id, src: src, g: g, t0: now };
      setTimeout(dropOld, (f + 0.5) * 1000);
    }).catch(function () {}); // 실패는 decode()에서 처리(콘솔에 빨간 오류가 남지 않게)
  }
  function waStopCur(fade) {
    if (!cur || !ctx) return;
    var c = cur,
      now = ctx.currentTime,
      f = Math.max(0.05, fade);
    cur = null;
    try {
      c.g.gain.cancelScheduledValues(now);
      c.g.gain.setValueAtTime(c.g.gain.value, now);
      c.g.gain.linearRampToValueAtTime(0.0001, now + f);
      c.src.stop(now + f + 0.05);
    } catch (e) {}
    setTimeout(function () {
      try {
        c.src.disconnect();
        c.g.disconnect();
      } catch (e) {}
    }, (f + 0.2) * 1000);
  }
  function waLevel(t) {
    if (!ctx) return;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(level(), now + (t == null ? 0.4 : t));
  }

  // ---------------- <audio> (파일로 열었을 때·Web Audio가 안 될 때) ----------------
  var el = null, // {id, a, v(0~1 엇갈림 크기), target, timer}
    oldEls = [],
    fadeT = null;
  function elMake(id) {
    var t = TRACKS[id],
      a = new Audio();
    a.preload = "auto";
    a.src = BASE + t.f + EXT;
    a.volume = 0;
    var o = { id: id, a: a, v: 0, target: 1 };
    a.addEventListener("loadedmetadata", function () {
      try {
        a.currentTime = t.s;
      } catch (e) {}
    });
    a.addEventListener("ended", function () {
      try {
        a.currentTime = t.s;
      } catch (e) {}
      if (el === o && level() > 0 && !hidden) playEl(o);
    });
    // 반복: 루프 끝에 닿으면 루프 길이만큼 되돌림
    o.timer = setInterval(function () {
      if (!a.paused && a.currentTime >= t.e - 0.02) a.currentTime -= t.e - t.s;
    }, 25);
    return o;
  }
  function elStart(id, fade) {
    if (!TRACKS[id]) return;
    if (el && el.id === id) return;
    if (el) {
      el.target = 0;
      oldEls.push(el);
    }
    el = elMake(id);
    el.fade = Math.max(0.05, fade);
    if (!hidden && level() > 0) playEl(el);
    runFade();
  }
  function playEl(o) {
    try {
      var p = o.a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function runFade() {
    if (fadeT) return;
    var last = Date.now();
    fadeT = setInterval(function () {
      var now = Date.now(),
        dt = (now - last) / 1000;
      last = now;
      var all = oldEls.concat(el ? [el] : []),
        busy = false;
      all.forEach(function (o) {
        var step = dt / Math.max(0.05, o.fade == null ? 1 : o.fade);
        if (o.v < o.target) o.v = Math.min(o.target, o.v + step);
        else if (o.v > o.target) o.v = Math.max(o.target, o.v - step);
        if (o.v !== o.target) busy = true;
        try {
          o.a.volume = Math.max(0, Math.min(1, o.v * level()));
        } catch (e) {}
      });
      oldEls = oldEls.filter(function (o) {
        if (o.v > 0) return true;
        clearInterval(o.timer);
        try {
          o.a.pause();
          o.a.removeAttribute("src");
          o.a.load();
        } catch (e) {}
        return false;
      });
      if (!busy && !oldEls.length) {
        clearInterval(fadeT);
        fadeT = null;
      }
    }, 50);
  }
  function elLevel() {
    if (!el) return;
    if (level() > 0 && !hidden) playEl(el);
    runFade();
    if (level() === 0) {
      // 끄면 바로 멈춰서 낡은 패드의 일을 줄임
      setTimeout(function () {
        if (el && level() === 0) el.a.pause();
      }, 450);
    }
  }
  function fallbackToEl(err) {
    if (!useWA) return;
    // 앞 곡(Web Audio)을 먼저 끄고 소리 장치도 쉬게 → 두 곡이 같이 나오지 않게
    waStopCur(0.3);
    setTimeout(function () {
      ctxDo("suspend");
    }, 400);
    useWA = false;
    try {
      console.warn("[music] Web Audio 대신 <audio>로 틀어요:", err && err.message);
    } catch (e) {}
    if (unlocked && want) elStart(want, 0.8);
  }

  // ---------------- 공통 ----------------
  function apply(fade) {
    if (!unlocked) return;
    if (useWA) {
      clearTimeout(suspT);
      if (!ctx) {
        // 음악이 꺼져 있거나 틀 곡이 없으면 소리 장치를 아예 만들지 않음(낡은 패드·콘솔 경고)
        if (!(level() > 0 && want && !hidden)) return;
        makeCtx();
        if (!ctx) return apply(fade);
      }
      if (level() > 0 && want && !hidden) {
        if (ctx.state !== "running") ctxDo("resume");
        if (!cur || cur.id !== want) waStart(want, fade);
      } else if (!want) waStopCur(fade);
      waLevel();
      if (level() === 0 || hidden || !want) {
        // 소리가 0이면 소리 장치를 쉬게 해서 낡은 패드의 일을 줄임(천천히 줄어든 뒤에). 그 사이 다시 켜면 취소
        suspT = setTimeout(function () {
          if ((level() === 0 || hidden || !want) && ctx.state === "running") ctxDo("suspend");
        }, 700);
      }
    } else {
      if (want && level() > 0) elStart(want, fade);
      else if (!want && el) {
        el.target = 0;
        el.fade = fade;
        oldEls.push(el);
        el = null;
        runFade();
      }
      elLevel();
    }
  }

  // 첫 터치 → 소리 풀기. 터치 패드에서는 pointerdown만으로는 허락이 안 나서(touchend·click에서 남)
  // 듣기는 계속 두고, 멈춰 있어야 할 때가 아닌데 멈춰 있으면 다시 깨운다(가벼운 확인만 함)
  var UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "mousedown", "keydown", "click"];
  function unlock(e) {
    // 터치 패드의 pointerdown은 브라우저가 '허락된 터치'로 치지 않음 → 그때 만들면 콘솔 경고만 남아서 건너뜀
    if (e && e.type === "pointerdown" && e.pointerType && e.pointerType !== "mouse") return;
    if (useWA && ctx && ctx.state !== "running" && level() > 0 && want && !hidden) ctxDo("resume");
    if (!unlocked) {
      unlocked = true;
      apply(wantFade);
    } else if (!useWA && el && level() > 0 && el.a.paused && !hidden) playEl(el);
  }
  UNLOCK_EVENTS.forEach(function (t) {
    window.addEventListener(t, unlock, { capture: true, passive: true });
  });

  // 미리 받아 두기: 페이지가 다 열리고 조금 뒤(게임 파일 받는 것을 방해하지 않게), 음악이 켜져 있을 때만
  function prefetch() {
    if (useWA && want && on && TRACKS[want] && !bufs[want] && !decoding[want]) getBytes(want).catch(function () {});
  }
  if (document.readyState === "complete") setTimeout(prefetch, 1200);
  else
    window.addEventListener("load", function () {
      setTimeout(prefetch, 1200);
    });

  document.addEventListener("visibilitychange", function () {
    hidden = document.visibilityState === "hidden";
    if (!unlocked) return;
    if (useWA) {
      if (!ctx) {
        if (!hidden) apply(0.6);
      } else if (hidden) ctxDo("suspend");
      else if (level() > 0 && want) {
        ctxDo("resume");
        if (!cur || cur.id !== want) waStart(want, 0.6);
      }
    } else {
      if (hidden)
        oldEls.concat(el ? [el] : []).forEach(function (o) {
          o.a.pause(); // 작아지는 중인 앞 곡도 같이 멈춤
        });
      else if (el && level() > 0) playEl(el);
    }
  });
  window.addEventListener("pageshow", function (e) {
    if (e.persisted && unlocked && !hidden) apply(0.6);
  });
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    var n = e.newValue !== "0";
    if (n !== on) {
      on = n;
      apply(0.6);
      emit();
    }
  });

  // ---------------- 켜기/끄기 단추 ----------------
  var btn = null;
  var LABEL = attr("data-label", "icon");
  function paintBtn() {   // 들리는 그대로 보여 줘요: 음악을 켰어도 페이지 소리를 껐으면(🔇) '끔'으로(검토 2026-11-19)
    if (!btn) return;
    var hear = on && !pageMute;
    btn.classList.toggle("off", !hear);
    btn.setAttribute("aria-pressed", hear ? "true" : "false");
    btn.title = hear ? "배경 음악 끄기" : "배경 음악 켜기";
    btn.setAttribute("aria-label", btn.title);
    if (LABEL === "text") btn.textContent = hear ? "음악 켬" : "음악 끔";
  }
  function makeBtn() {
    var spec = attr("data-btn", "none");
    if (spec === "none") return;
    var css = document.createElement("style");
    css.textContent =
      "#bgmBtn{touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
      "#bgmBtn.off{opacity:.55}" +
      "#bgmBtn.bgmIcon.off::after{content:'';position:absolute;left:22%;right:22%;top:50%;height:3px;margin-top:-1px;border-radius:2px;background:#e8384f;transform:rotate(-38deg);pointer-events:none}" +
      "#bgmBtn.bgmFloat{position:fixed;z-index:2147482000;width:44px;height:44px;border-radius:999px;border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.85);font-size:21px;line-height:1;box-shadow:0 3px 10px rgba(0,0,0,.22);cursor:pointer;padding:0}";
    document.head.appendChild(css);
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "bgmBtn";
    if (LABEL !== "text") {
      btn.textContent = "🎵";
      btn.classList.add("bgmIcon");
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 페이지 소리를 꺼 둔 채 🎵를 누르면 음악만 다시 켜요(저장된 '음악 켬'을 끔으로 바꿔 버리지 않게, 검토)
      if (pageMute) {
        pageMute = false;
        BGM.setOn(true);
      } else BGM.toggle();
    });
    ["pointerdown", "touchstart", "mousedown"].forEach(function (t) {
      btn.addEventListener(
        t,
        function (e) {
          e.stopPropagation();
        },
        { passive: true }
      );
    });
    paintBtn();
    var m = /^after:(.+)$/.exec(spec);
    if (m) {
      var tries = 0;
      (function place() {
        var ref = document.querySelector(m[1]);
        if (ref && ref.parentNode) {
          var keep = btn.className;
          btn.className = ref.className + " " + keep;
          btn.classList.remove("off");
          paintBtn();
          ref.parentNode.insertBefore(btn, ref.nextSibling);
          // 끔 빗금(::after)이 단추 안에 그려지게. 페이지가 자리를 정해 둔 단추(absolute 등)는 그대로
          if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
        } else if (++tries < 120) setTimeout(place, 250);
      })();
      return;
    }
    var f = /^fixed:(top|bottom)-(left|right):(\d+),(\d+)$/.exec(spec);
    if (f) {
      btn.classList.add("bgmFloat");
      btn.style[f[1]] = "calc(" + f[4] + "px + env(safe-area-inset-" + f[1] + ",0px))";
      btn.style[f[2]] = "calc(" + f[3] + "px + env(safe-area-inset-" + f[2] + ",0px))";
      document.body.appendChild(btn);
    }
  }
  if (document.body) makeBtn();
  else document.addEventListener("DOMContentLoaded", makeBtn);

  // ---------------- 밖에서 쓰는 손잡이 ----------------
  var BGM = (window.BGM = {
    tracks: TRACKS,
    play: function (id, fade) {
      if (id && !TRACKS[id]) return;
      want = id || null;
      wantFade = fade == null ? 1.5 : fade;
      apply(wantFade);
      if (!unlocked) prefetch();
    },
    stop: function (fade) {
      want = null;
      apply(fade == null ? 1 : fade);
    },
    setOn: function (v) {
      on = !!v;
      try {
        localStorage.setItem(KEY, on ? "1" : "0");
      } catch (e) {}
      apply(0.6);
      emit();
    },
    toggle: function () {
      BGM.setOn(!on);
      return on;
    },
    isOn: function () {
      return on;
    },
    mute: function (m) {
      pageMute = !!m;
      apply(0.3);
      paintBtn();
    },
    duck: function (v) {
      duckV = isFinite(+v) ? Math.max(0, Math.min(1, +v)) : 1;
      apply(0.4);
    },
    volume: function (v) {
      if (isFinite(+v)) VOL = Math.max(0, Math.min(1, +v));
      apply(0.3);
    },
    state: function () {
      var s = {
        on: on,
        pageMute: pageMute,
        unlocked: unlocked,
        want: want,
        engine: useWA ? "webaudio" : "audio",
        ext: EXT,
        level: level(),
        hidden: hidden,
      };
      if (useWA) {
        s.ctx = ctx ? ctx.state : null;
        s.playing = cur ? cur.id : null;
        s.loaded = Object.keys(bufs);
        if (cur && ctx) {
          var b = cur.src.buffer,
            t = TRACKS[cur.id],
            el2 = ctx.currentTime - cur.t0,
            L = t.e - t.s;
          s.pos = +(t.s + (el2 % L)).toFixed(3);
          s.loop = [t.s, t.e];
          s.bufferSec = b ? +b.duration.toFixed(3) : 0;
          s.loopFlag = cur.src.loop;
        }
      } else if (el) {
        s.playing = el.id;
        s.paused = el.a.paused;
        s.pos = +el.a.currentTime.toFixed(3);
        s.volume = +el.a.volume.toFixed(3);
        s.loop = [TRACKS[el.id].s, TRACKS[el.id].e];
      }
      return s;
    },
    // 점검용: 루프 끝 가까이로 건너뛰기(반복이 잘 이어지는지 볼 때)
    _seek: function (sec) {
      if (useWA && cur && ctx) {
        var id = cur.id,
          t = TRACKS[id],
          b = cur.src.buffer;
        waStopCur(0.02);
        var src = ctx.createBufferSource(),
          g = ctx.createGain(),
          now = ctx.currentTime;
        src.buffer = b;
        src.loop = true;
        src.loopStart = t.s;
        src.loopEnd = t.e;
        src.connect(g);
        g.connect(master);
        src.start(now, sec);
        cur = { id: id, src: src, g: g, t0: now - (sec - t.s) };
      } else if (el) el.a.currentTime = sec;
    },
    // 점검용: 지금 실제로 나오는 소리 크기(0~1, Web Audio일 때)
    meter: function () {
      if (!meter) return -1;
      var a = new Float32Array(meter.fftSize);
      meter.getFloatTimeDomainData(a);
      var s = 0;
      for (var i = 0; i < a.length; i++) s += a[i] * a[i];
      return Math.sqrt(s / a.length);
    },
  });
})();
