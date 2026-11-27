'use strict';
// 사랑둥이 대모험 v3 — 2.5D 게임 엔진
(() => {
  const H = 540, FT = SIM.FT, FB = SIM.FB, TAU = Math.PI * 2;
  let W = 960;
  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const stageEl = $('stage'), padEl = $('pad');
  let viewScale = 1, DPR = 1, portrait = false, touchUI = false, builtRS = 0;
  let stageBox = { left: 0, top: 0, w: 960, h: 540 };
  const F = (px) => `${px}px Jua, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  const dscale = (y) => 0.86 + (U.clamp(y, FT, FB) - FT) / (FB - FT) * 0.18;
  const val = (v) => (typeof v === 'function' ? v() : v);
  const MONH = Art2.MON_H;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------------- 화면 배치 ----------------
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    portrait = vh > vw * 1.05;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('touch', touchUI);
    let sw, sh, left, top;
    if (portrait) {
      W = 720; sw = vw; sh = Math.round(vw * H / W); left = 0;
      const padH = Math.min(270, Math.max(200, vh - sh - 40));
      top = Math.max(0, Math.round((vh - sh - padH) * 0.35));
      padEl.style.top = (top + sh) + 'px';
      padEl.style.height = Math.max(180, vh - top - sh) + 'px';
    } else {
      W = Math.round(U.clamp(H * vw / vh, 720, 1200));
      viewScale = Math.min(vw / W, vh / H);
      sw = Math.round(W * viewScale); sh = Math.round(H * viewScale);
      left = Math.round((vw - sw) / 2); top = Math.round((vh - sh) / 2);
      padEl.style.top = top + 'px'; padEl.style.height = sh + 'px';
    }
    viewScale = sw / W;
    Object.assign(stageEl.style, { width: sw + 'px', height: sh + 'px', left: left + 'px', top: top + 'px' });
    stageBox = { left, top, w: sw, h: sh };   // 튜토리얼 막 좌표(CSS)
    Object.assign(padEl.style, { left: left + 'px', width: sw + 'px' });
    if (portrait) { padEl.style.left = '0px'; padEl.style.width = vw + 'px'; }
    qSW = sw; qSH = sh; applyQ();
    cv.style.width = sw + 'px'; cv.style.height = sh + 'px';
    document.documentElement.style.setProperty('--u', viewScale + 'px');
    const need = U.clamp(viewScale * DPR, 1, 1.6);
    if (map && need > builtRS + 0.25) { builtRS = need; Scenes.setRenderScale(need); scene = buildScene(map.theme, map.w); }
    if (!builtRS) { builtRS = need; Scenes.setRenderScale(need); }
  }

  // ---------------- 자동 화질(2026-11-26 선생님: 학교 갤럭시탭에서 미세하게 뚝뚝 끊김 → 패드가 알아서 조절, 학생에게는 표시 없음) ----------------
  // 무거운 일은 화면 크기(그릴 점 수): 배경은 미리 그려 둔 그림이라 자바스크립트는 가볍고, 큰 캔버스(1920×1200)에 여러 겹을 칠하는 데 시간이 듦.
  // 최근 약 1.5초의 장면 간격을 보고 느리면 그림 배율을 한 단계 낮추고(효과 알갱이도 줄임), 넉넉한 시간이 쌓이면 천천히 올림.
  // 낮춰도 나아지지 않으면(30fps로 묶인 기기·자바스크립트가 느린 경우) 되돌리고 그 아래로는 한동안 안 내림 → 새 패드는 높은 화질 그대로.
  // 기기마다 마지막 단계를 기억(sarang.qlv) → 낡은 패드는 다음부터 처음부터 알맞은 화질. 시험: ?fps=1 표시 · ?q=0~4 고정 · window.__q()
  const QL = [1, 0.85, 0.72, 0.6, 0.5], QFX = [1, 0.85, 0.7, 0.55, 0.45];
  const qFixed = (() => { const v = parseInt(new URLSearchParams(location.search).get('q'), 10); return v >= 0 && v < QL.length ? v : -1; })();
  let qLv = qFixed >= 0 ? qFixed : (() => { try { const v = parseInt(localStorage.getItem('sarang.qlv'), 10); return v >= 0 && v < QL.length ? v : 0; } catch (e) { return 0; } })();
  let qSW = 0, qSH = 0, qCool = 2.5, qGood = 0, qBack = 8, qFloor = 0, qFloorT = 0, qPrev = null, qWin = [], qWinT = 0, qMean = 0, qSimOn = false, qHold = 0;
  function applyQ() {
    if (!qSW) return;
    const r = Math.max(0.7, DPR * QL[qLv]);   // 아무리 낮춰도 화면 점의 0.7배까지
    const w = Math.round(qSW * r), h = Math.round(qSH * r);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    FX.setK(QFX[qLv]);
  }
  function qSave() { try { localStorage.setItem('sarang.qlv', String(qLv)); } catch (e) { /* 무시 */ } }
  function qTick(raw) {
    if (raw > 1000 || document.hidden) { qWin.length = 0; qWinT = 0; return; }   // 화면을 잠깐 나갔거나 퀴즈 카드가 멈춘 동안은 세지 않음
    raw = Math.min(raw, 250);   // 아주 느린 패드(1초에 4장 미만)도 셈 — 한 장면이 판단을 혼자 휘두르지 않게 250ms까지만
    if (qFloorT > 0 && (qFloorT -= raw / 1000) <= 0) qFloor = 0;
    if (qCool > 0) { qCool -= raw / 1000; return; }   // 막 바꾼 뒤·불러온 뒤는 잠깐 기다림
    qWin.push(raw); qWinT += raw; if (qWinT < 1200 || qWin.length < 20) return;   // 약 1.2초마다(느린 패드도 빨리 알맞은 단계로)
    let sum = 0, slow = 0; for (const v of qWin) { sum += v; if (v > 25) slow++; }
    qWinT = 0;
    const n = qWin.length, mean = sum / n, sr = slow / n; qWin.length = 0; qMean = mean;
    if (qFixed >= 0 || performance.now() < qHold) return;   // 게임을 막 시작한 3초는 재기만(첫 장면들이 느려도 괜히 화질을 낮추지 않게)
    if (qPrev && qPrev.lv === qLv - 1) {   // 바로 앞에서 낮췄는데 나아지지 않았으면 되돌리고 한동안 그 아래로 안 감
      const helped = mean < qPrev.mean * 0.92 || sr < qPrev.sr * 0.6;
      qPrev = null;
      if (!helped) { qLv--; qFloor = qLv; qFloorT = 40; applyQ(); qSave(); qCool = 1.5; return; }
    }
    if ((mean > 19.5 || sr > 0.12) && qLv < QL.length - 1 && !(qFloor >= 0 && qFloorT > 0 && qLv >= qFloor)) {
      qPrev = { lv: qLv, mean, sr }; qLv++; applyQ(); qSave(); qCool = 1.2; qGood = 0; return;
    }
    if (mean < 17.6 && sr < 0.03 && qLv > 0) {
      qGood += sum / 1000;
      if (qGood > qBack) { qLv--; applyQ(); qSave(); qCool = 1.5; qGood = 0; qBack = Math.min(90, qBack * 2); qPrev = null; }   // 올렸다가 다시 느려지면 다음엔 더 오래 기다림
    } else qGood = 0;
  }
  // 점검용: 진짜 장면 대신 정해 준 장면 간격을 넣어 판단만 시험(그래픽 칩이 없는 점검 크롬에서 '새 패드·30fps 패드'를 흉내)
  window.__qSim = { on(b) { qSimOn = !!b; qWin.length = 0; qWinT = 0; qCool = 0; qHold = 0; }, feed(ms, n) { for (let i = 0; i < n; i++) qTick(ms); return window.__q(); }, set(lv) { qLv = lv; qPrev = null; qGood = 0; qBack = 8; qFloorT = 0; applyQ(); } };
  window.__q = () => ({ lv: qLv, scale: QL[qLv], fx: QFX[qLv], w: cv.width, h: cv.height, mean: +qMean.toFixed(1), fixed: qFixed, hold: Math.max(0, Math.round(qHold - performance.now())), scene: scene && scene.n, warm: window.__warmMs });
  const fpsEl = new URLSearchParams(location.search).get('fps') === '1' ? (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;background:rgba(0,0,0,.6);color:#0f0;font:12px monospace;padding:2px 6px;pointer-events:none'; document.body.appendChild(d); return d; })() : null;
  let fpsN = 0, fpsT = 0;

  // ---------------- 입력 ----------------
  const input = { mx: 0, my: 0, jump: false, shoot: false, act: false, jumpP: false, actP: false, shootP: false, dashP: false, specialP: false, skipP: false,
    leftP: false, rightP: false, upP: false, downP: false, taps: [], digit: 0, emoP: false };
  const keys = {};
  const KEYMAP = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    Space: 'jump', KeyK: 'jump', KeyC: 'jump', KeyJ: 'shoot', KeyZ: 'shoot', KeyE: 'act', KeyX: 'act', Enter: 'act', KeyQ: 'emo',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash', KeyF: 'special', KeyI: 'special', Escape: 'skip', Tab: 'skip',
  };
  const PRESS = { jump: 'jumpP', act: 'actP', shoot: 'shootP', emo: 'emoP', dash: 'dashP', special: 'specialP', skip: 'skipP', l: 'leftP', r: 'rightP', u: 'upP', d: 'downP' };
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyM') { toggleSound(); return; }
    const dm = /^(Digit|Numpad)([1-4])$/.exec(e.code); if (dm) { input.digit = +dm[2]; }
    const k = KEYMAP[e.code]; if (!k) return;
    e.preventDefault();
    if (!keys[k] && PRESS[k]) input[PRESS[k]] = true;
    keys[k] = true;
    Sound.init();
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const joyEl = $('joy'), knob = $('knob');
  const joy = { id: null, dx: 0, dy: 0 };
  function joyMove(e) {
    const r = joyEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width * 0.42;
    let dx = (e.clientX - cx) / rad, dy = (e.clientY - cy) / rad;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    joy.dx = dx; joy.dy = dy;
    knob.style.transform = `translate(${dx * rad}px, ${dy * rad}px)`;
  }
  joyEl.addEventListener('pointerdown', (e) => { e.preventDefault(); Sound.init(); setTouch(); joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMove(e); });
  const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  const btn = {};
  for (const [id, k] of [['bJump', 'jump'], ['bShoot', 'shoot'], ['bAct', 'act'], ['bEmo', 'emo'], ['bDash', 'dash'], ['bSpecial', 'special']]) {
    const el = $(id); if (!el) continue; btn[k] = false;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); Sound.init(); setTouch();
      el.setPointerCapture(e.pointerId); btn[k] = true; el.classList.add('on');
      if (PRESS[k]) input[PRESS[k]] = true;
    });
    const up = () => { btn[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  }
  cv.addEventListener('pointerdown', (e) => {
    Sound.init();
    if (e.pointerType === 'touch') setTouch();
    const r = cv.getBoundingClientRect();
    input.taps.push({ x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H });
  });
  function setTouch() { if (!touchUI) { touchUI = true; document.body.classList.add('touch'); } }
  if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) touchUI = true;
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  const prevJ = { x: 0, y: 0 };
  function readInput() {
    let mx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), my = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if (Math.abs(joy.dx) > 0.18 || Math.abs(joy.dy) > 0.18) { mx = joy.dx; my = joy.dy; }
    input.mx = mx; input.my = my;
    const jx = Math.abs(joy.dx) > 0.6 ? Math.sign(joy.dx) : 0, jy = Math.abs(joy.dy) > 0.6 ? Math.sign(joy.dy) : 0;
    if (jx && jx !== prevJ.x) { if (jx < 0) input.leftP = true; else input.rightP = true; }
    if (jy && jy !== prevJ.y) { if (jy < 0) input.upP = true; else input.downP = true; }
    prevJ.x = jx; prevJ.y = jy;
    input.jump = !!(keys.jump || btn.jump);
    input.shoot = !!(keys.shoot || btn.shoot);
    input.act = !!(keys.act || btn.act);
  }
  function clearPresses() { for (const k of Object.values(PRESS)) input[k] = false; input.digit = 0; input.taps.length = 0; }

  // ---------------- 상태 ----------------
  let state = 'loading';              // loading | title | play
  let t = 0, camX = 0, camLead = 0, camCenter = null, zoom = 1, zoomTarget = 1;
  let mapId = 'heart', map = null, scene = null;
  let ents = [], toasts = [], pickups = [], timers = [];
  const mons = new Map(), remote = new Map(), roster = new Map();
  let shots = [], eshots = [], hazards = [], rings = [], ghosts = [];
  let player = null, focus = null, followers = [];
  let dialog = null, askBox = null, banner = null, mapLabel = null, locked = false, transformFx = null, kongShown = null;
  const fade = { a: 0, dir: 0, cb: null };
  let Q = null, C = null;
  let mode = 'solo', myName = '사랑둥이', myColor = 'red', saveKey = 'sarang2:solo';
  let courage = 0, love = 0, loveFull = false, combo = 0, comboT = 0, comboPop = 0, starStreak = 0, starT = 0;
  let hitStop = 0, slowT = 0, special = null, intro = null, outro = null, introShown = false, fightStart = 0, fightHits = 0;
  let waveInfo = null, goldId = null, dustT = 0;
  let bossSay = null, shake = 0, deadT = 0, questPulse = 0, actCool = 0, lastLines = '', confT = 0, netStatus = 'solo', hpShow = 100, loveShow = 0, chatT = 4;

  const busy = () => !!(dialog || askBox || Mini.active || locked || fade.dir > 0 || transformFx || intro || (outro && outro.t < 3.6));
  const alive = (m) => m && m.st !== 'dead' && m.st !== 'down';
  const isBoss = (m) => SIM.MON[m.type] && SIM.MON[m.type].ai === 'boss';

  const WHO = {
    grandma: ['grandma', '하트 할머니'], sparkle: ['sparkle', '꿈 요정 반짝이'], mayor: ['mayor', '양 촌장 뭉게'], owl: ['owl', '부엉 장인'],
    princess: ['princess', '베개 공주'], prince: ['prince', '자 왕자'], knight: ['knight', '연필 기사 뾰족이'], glue: ['glue', '딱풀 할아버지'],
    worm: ['worm', '자벌레 선생님'], eraserLady: ['eraserLady', '말랑 아줌마'], kong: ['kong', '콩닥이'], devil: ['devil', '악마둥이'],
    v1: ['villager1', '파랑둥이'], v2: ['villager2', '민트둥이'], v3: ['villager3', '노랑둥이'], v4: ['villager4', '분홍둥이'], v5: ['villager5', '지우개 꼬마'],
  };
  const ITEM = { bell: ['맑은 방울', 5], part: ['나팔 부품', 3], number: ['숫자 눈금', 10], glue: ['풀 방울', 3], key: ['열쇠 조각', 3] };
  const BOSS_INFO = {
    snoreKing: { line: '꿀잠을 깨우는 자는 용서 못 해! 드르렁!', ps: 0.26, py: 30 },
    eraserBoss: { line: '눈금도 숫자도 모두 싹싹 지워 주마!', ps: 0.33, py: 30 },
    devil: { line: '사랑 따위… 필요 없어!', ps: 0.22, py: 34 },
  };

  // ---------------- 도우미 ----------------
  function say(lines, onEnd) {
    dialog = { lines: lines.map((l) => (typeof l === 'string' ? { who: 'narr', text: l } : l)), i: 0, shown: 0, onEnd, wrapped: null, skipRect: null };
    padEl.classList.add('talking');
  }
  function ask(text, opts, cb) { askBox = { text, opts, cb, cursor: 0, t: 0, btns: [] }; document.body.classList.add('mini'); }
  function toast(text, col = '#fff') { toasts.push({ text, col, t: 0, life: 3 }); if (toasts.length > 3) toasts.shift(); }
  function burst(x, y, z, kind, n, o = {}) { FX.burst(x, y, z, kind, n, o); }
  function floatText(x, y, z, text, col) { FX.text(x, y, z, text, col); }
  function fadeTo(cb) { fade.dir = 1; fade.cb = cb; }
  function after(sec, fn) { timers.push({ t: sec, fn }); }
  const inv = (k) => (Q.inv[k] || 0);
  const pending = (k) => pickups.filter((p) => p.kind === k).length;
  function gainLove(n) {
    if (love >= 100) return;
    love = Math.min(100, love + n);
    if (love >= 100 && !loveFull) {
      loveFull = true; Sound.play('ding');
      FX.burst(player.x, player.y, 70, 'star', 10, { speed: 180, size: 7 });
      toast(touchUI ? '사랑 폭발 준비 완료! 필살 버튼을 눌러요' : '사랑 폭발 준비 완료! F 키를 눌러요', '#ffe680');
    }
  }
  // 광장 퀴즈(../../quiz/quiz.js, back.js가 불러옴)를 맞히면 게임 속 보너스(2026-11-24):
  // 처음 고른 답이 정답 → 사랑 게이지 +40·체력 가득 / 힌트를 보고 맞힘 → 사랑 게이지 +15
  addEventListener('plaza-quiz', (e) => {
    const d = (e && e.detail) || {};
    if (state !== 'play' || !player || player.dead || !(d.correct || d.second)) return;
    const full = love >= 100;
    // 2026-11-24 선생님: "문제를 풀면 확실한 어드밴티지" → 처음에 맞히면 사랑 게이지 가득 + 체력 가득 + 15초 무적, 힌트 보고 맞히면 게이지 +30 + 체력 가득
    if (d.correct) {
      gainLove(100); player.hp = player.max; player.shieldT = Math.max(player.shieldT || 0, 15); Sound.play('heal');
      FX.burst(player.x, player.y, 70, 'star', 18, { speed: 200 });
      toast('퀴즈 정답! 💖 사랑 게이지 가득 + 체력 가득 + 15초 무적!', '#ffe680');
    } else { gainLove(30); player.hp = player.max; Sound.play('ding'); toast(full ? '퀴즈를 끝까지 풀었어요! 체력 가득' : '퀴즈를 끝까지 풀었어요! 사랑 게이지 +30, 체력 가득', '#d9f5ff'); }
  });
  // '같이 하기'(서버로 친구와 연결)에서는 퀴즈를 열어도 게임을 멈추지 않아요(친구 화면에서 내가 멈춰 보이고, 돌아올 때 공격이 한꺼번에 오지 않게)
  window.PLAZA_QUIZ_NOPAUSE = () => mode === 'multi';
  window.PLAZA_QUIZ_REWARD = { icon: '💖', big: '사랑 게이지 가득 + 체력 가득 + 15초 무적!', small: '사랑 게이지 +30 + 체력 가득' };
  // 꼭 푸는 문제(2026-11-25 선생님: "옆에서 고르는 퀴즈 말고, 하다 보면 꼭 풀어야 하고 풀면 이점"):
  //   ① 새 들판·숲·성에 처음 갈 때 '마음 문' ② 보스가 화나는 순간(빈틈) '심술 방패'. 고르는 ❓ 말풍선은 끔
  //   광장 밖(PLAZA_QUIZ 없음)·퀴즈를 끈 판은 바로 통과
  window.PLAZA_QUIZ_GATES = true;
  let gating = false;
  const isTeacher = () => { try { return !!(window.PLAZA_TEACHER && window.PLAZA_TEACHER()); } catch (e) { return false; } };   // 선생님 기기(광장이 teacher=1을 붙여 줌)
  let teachWin = false;
  function gateQuiz(o) {
    const PQ = window.PLAZA_QUIZ;
    if (!PQ || !PQ.ask || mode === 'multi') return Promise.resolve({ correct: true, first: false, skipped: true });
    return Promise.resolve(PQ.ask(Object.assign({ game: 'sarang', grade: U.grade() }, o))).catch(() => ({ correct: true, first: false, skipped: true }));
  }

  function save() {
    if (!Q || state !== 'play' || !player) return;
    try { localStorage.setItem(saveKey, JSON.stringify({ v: 2, Q, map: mapId, x: Math.round(player.x), y: Math.round(player.y), color: myColor, name: myName, df: gameDiff, ts: Date.now() })); } catch (e) { /* 저장 못 함 */ }
  }
  function readSave(key) { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); return s && s.v === 2 && s.Q && SIM.MAPS[s.map] ? s : null; } catch (e) { return null; } }

  // ---------------- 엔진 → 이야기 연결 (G) ----------------
  const G = {
    get Q() { return Q; }, get t() { return t; }, get touch() { return touchUI; }, get multi() { return mode === 'multi'; },
    get player() { return player; }, get mapId() { return mapId; },
    say, ask, toast, after, burst, floatText, pending, save,
    sfx: (n) => Sound.play(n), music: (n) => Sound.playMusic(n),
    setStep(id) { Q.step = id; questPulse = 1.2; save(); },
    done(text) {
      Sound.play('quest'); banner = { t: 0, title: '퀘스트 완료!', goal: text };
      FX.beam(player.x, player.y, 'rgba(255,240,150,', 1.4); FX.burst(player.x, player.y, 90, 'star', 14, { speed: 220, size: 8 }); FX.burst(player.x, player.y, 90, 'confetti', 22, { speed: 260, up: 160 });
    },
    take(k, n) { Q.inv[k] = Math.max(0, inv(k) - n); save(); },
    drop(kind, x, y) { drop(kind, x, y); },
    lock(v) { locked = !!v; if (v) padEl.classList.add('talking'); else if (!dialog) padEl.classList.remove('talking'); },
    camTo(x) { camCenter = x; },
    addFollower(k) { if (!Q.followers.includes(k)) Q.followers.push(k); spawnFollowers(true); save(); },
    quiz(o) { return gateQuiz(o); },   // 학년에 맞는 문제 카드(광장 PLAZA_QUIZ.ask) — 같이 하기(서버) 판은 통과
    giveHat(h, name) { if (!Q.hats.includes(h)) Q.hats.push(h); Q.hat = h; player.ch = Art.hero(myColor, h); Net.setHat(h); Sound.play('hat'); FX.burst(player.x, player.y, 120, 'star', 12, { speed: 160 }); toast(`${name}를 얻었어요! (모양만 바뀌어요)`, '#fff36a'); save(); },
    mini(name, cb) {
      document.body.classList.add('mini'); Mini.heroCh = player.ch;
      toasts.length = 0;
      Mini.start(name, {}, (win) => { document.body.classList.remove('mini'); Sound.playMusic(map.music); actCool = 0.4; clearPresses(); if (cb) cb(win); save(); });
    },
    goMap(id, x, y, cb) { goMap(id, x, y, cb); },
    transform(x, y, cb) { transformFx = { x, y, t: 0, cb, played: false }; },
    showEnding() { showEnding(); },
    bubble(id, text, dur) { const e = ents.find((q) => q.id === id); if (e) e.say = { text, t: 0, life: dur || 2.5 }; },
    npc(key, x, y, o = {}) { return Object.assign({ kind: 'npc', id: o.id || key, ch: Art.CH[key], key, x, y, z: 0, facing: -1, t: Math.random() * 5, hitT: 0, chatT: 3 + Math.random() * 6 }, o); },
    prop(id, x, y, draw, o = {}) { return Object.assign({ kind: 'prop', id, x, y, z: 0, draw, hitT: 0 }, o); },
    spot(id, x, y, kind, o) { return { kind: 'prop', id, x, y, z: 0, promptH: 70, draw: (c, sx, sy, s) => Art2.bush(c, sx, sy, s, t, kind), act: { label: '살펴보기', fn: () => { Sound.play('click'); FX.burst(x, y, 30, kind === 'paper' ? 'paper' : 'leaf', 6, { speed: 120 }); o.find(); } } }; },
    healSpot(id, x, y, kind, text) {
      return { kind: 'prop', id, x, y, z: 0, promptH: 70, cool: 0,
        draw(c, sx, sy, s) { Art2.bush(c, sx, sy, s, t, kind); if (this.cool <= 0) { Art.glowFast(c, sx, sy - 30 * s, 50, [255, 170, 210], 0.4 + Math.sin(t * 3) * 0.15); Art.shiny(c, sx - 14, sy - 50 * s, 6, t, 1); Art.shiny(c, sx + 18, sy - 34 * s, 5, t, 2); } },
        act() { return { label: '살펴보기', fn: () => { if (this.cool > 0) { toast('조금 있다가 다시 살펴봐요.'); return; } this.cool = 25; player.hp = player.max; Sound.play('heal'); FX.burst(player.x, player.y, 60, 'heart', 14, { speed: 160 }); FX.beam(player.x, player.y, 'rgba(255,180,220,', 0.9); toast(text, '#ffd1e6'); } }; } };
    },
    portal(x, to, o = {}) {
      const p = Object.assign({ kind: 'portal', id: 'p_' + to, x, y: o.y || 432, z: 0, to }, o);
      if (p.locked && isTeacher()) p.locked = null;   // 선생님 기기: 모든 길이 열려 있음(학생은 그대로)
      return p;
    },
    breakable(id, x, y, kind) { return makeBreakable(id, x, y, kind); },
    pad(id, x, y, kind, power) { return { kind: 'prop', sub: 'pad', id, x, y, z: 0, pk: kind, squash: 0, power: power || 1000, cool: 0, draw(c, sx, sy, s) { Art2.pad(c, this.pk, sx, sy, s, t, this.squash); } }; },
    stars(list) { return list.map(([x, y, z], i) => ({ kind: 'star', id: 'st' + Math.round(x) + '_' + i, x, y, z, got: false, cool: 0, ph: Math.random() * 6 })); },
    starArc(x, y, n, h) { const out = []; for (let i = 0; i < n; i++) { const k = n > 1 ? i / (n - 1) : 0.5; out.push([x - 60 + k * 120, y, (h || 170) + Math.sin(k * Math.PI) * 60]); } return G.stars(out); },
    starLine(x0, x1, y, n) { const out = []; for (let i = 0; i < n; i++) out.push([x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5), y, 34]); return G.stars(out); },
  };
  C = makeContent(G);

  // ---------------- 부서지는 상자 ----------------
  function makeBreakable(id, x, y, kind) {
    const e = { kind: 'prop', sub: 'break', id, x, y, z: 0, bk: kind, hp: 3, max: 3, shake: 0, broken: false, respawn: 0, hitT: 0,
      draw(c, sx, sy, s) { if (!this.broken) Art2.breakable(c, this.bk, sx, sy, s, t, this.hp / this.max, this.shake); } };
    e.target = { r: 36, h: 70, active: () => !e.broken, hit: (d, big) => { hitBreakable(e, big ? 3 : 1); return true; } };
    return e;
  }
  const BREAK_FX = { gift: 'confetti', pillow: 'feather', paper: 'paper', crate: 'chip' };
  function hitBreakable(e, n) {
    if (e.broken) return;
    e.hp -= n; e.shake = 1; Sound.play('crack');
    FX.burst(e.x, e.y, 40, BREAK_FX[e.bk] || 'chip', 4, { speed: 140 });
    if (e.hp > 0) return;
    e.broken = true; e.respawn = 45; hitStop = Math.max(hitStop, 0.04); shake = Math.max(shake, 5);
    Sound.play('break');
    FX.burst(e.x, e.y, 40, BREAK_FX[e.bk] || 'chip', 22, { speed: 280, up: 140, size: 8 });
    FX.burst(e.x, e.y, 50, 'star', 5, { speed: 160 }); FX.poof(e.x, e.y, 20, 8);
    FX.word(e.x, e.y, 110, pick(['와장창!', '뽀각!', '펑!']), '#ffe680', 32);
    gainLove(10); Q.stats.broken = (Q.stats.broken || 0) + 1;
    const r = Math.random();
    if (r < 0.35) drop('heal', e.x, e.y);
    else if (r < 0.8) for (let i = 0; i < 3; i++) drop('star', e.x + U.rand(-20, 20), e.y);
  }

  // ---------------- 맵 ----------------
  // 같은 배경(테마·길이·그림 배율)이면 다시 그리지 않음: 처음 화면의 하트 마을 → 「혼자 하기」 하트 마을에서 배경을 통째로 다시 만들어
  // 그 순간 뚝 끊겼음(2026-11-26 선생님: "처음 들어가서만 렉"). 배경은 장면마다 mood 같은 값만 바뀌어서 같이 써도 됨. 낡은 패드 메모리를 생각해 하나만 기억
  let sceneN = 0;
  function buildScene(theme, w) {
    if (scene && scene.theme === theme && scene.mapW === w && scene.rs === builtRS) return scene;
    const sc = Scenes.build(theme, w); sc.rs = builtRS; sc.n = ++sceneN; return sc;
  }
  // 불러오는 화면 동안 미리 데우기: 그림 파일 풀기 + 처음 쓰는 그림(배경 조각·친구·투덜이·효과·글자)을 한 번씩 그려 둠
  // (처음 그릴 때 그래픽 칩으로 올리고 글자 모양을 만드는 일이 게임 첫 몇 초에 몰려 끊겼음). 보이지 않게 그리고 지움
  async function warmUp(imgs) {
    try { await Promise.race([Promise.all(imgs.map((im) => (im && im.decode ? im.decode().catch(() => {}) : 0))), new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* 무시 */ }
    const g = ctx, T0 = performance.now();
    const step = (fn) => { try { fn(); } catch (e) { /* 미리 데우기는 실패해도 게임에는 상관없음 */ } };
    g.save(); g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    step(() => { for (let x = 0; x < map.w; x += W * 0.8) { scene.back(g, Math.min(x, Math.max(0, map.w - W)), 0, W); scene.front(g, x, 0, W); } if (scene.post) scene.post(g, 0, W, H); });
    step(() => { for (const k of Object.keys(Art.CH)) Art.drawChar(g, Art.CH[k], 200, 420, { t: 0, facing: 1, scale: 0.6, moving: true, walk: 1, expr: 'joy' }); });
    step(() => { for (const c of ['red', 'pink', 'blue', 'gold', 'mint']) Art.drawChar(g, Art.hero(c, null), 300, 420, { t: 0, facing: 1, scale: 0.6, moving: true, walk: 1, shoot: 1 }); });
    step(() => { for (const ty of SIM.TYPES) { Art2.mon(g, { type: ty, st: 'idle', f: 1, z: 0, ph: 0 }, 400, 420, 0.8, 0); Art2.mon(g, { type: ty, st: 'down', f: 1, z: 0, ph: 0, happy: true }, 400, 420, 0.8, 0); } });
    step(() => { for (const k of ['heart', 'spark', 'star', 'line', 'confetti', 'dust', 'smoke', 'feather', 'petal', 'leaf', 'chip', 'drop', 'bubble', 'note']) FX.burst(480, 420, 40, k, 2); FX.hit(480, 420, 40, true); FX.purify(500, 420, 0); FX.update(0.05); FX.draw(g, 0, dscale, W); FX.drawFloor(g, 0); FX.clear(); });
    step(() => { for (const px of [12, 14, 15, 16, 17, 18, 20, 22, 24, 26, 30, 34]) { g.font = F(px); g.fillText('사랑둥이 하트 마을 퀘스트 게이지 대시 필살 0123456789 !?', 10, 300); } });
    g.restore(); g.clearRect(0, 0, cv.width, cv.height);
    return Math.round(performance.now() - T0);
  }
  function loadMap(id, x, y) {
    qCool = Math.max(qCool, 2); qWin.length = 0; qWinT = 0;   // 새 맵 배경을 그리는 동안의 긴 장면은 화질 판단에 넣지 않음
    const old = mapId;
    for (const p of pickups) if (p.kind !== 'heal') collect(p, true);
    mapId = id; map = Object.assign({ id }, SIM.MAPS[id]);
    scene = buildScene(map.theme, map.w);
    const def = C.maps[id];
    ents = def.ents();
    pickups = []; shots = []; eshots = []; hazards = []; rings = []; ghosts = []; mons.clear(); remote.clear(); FX.clear();
    bossSay = null; transformFx = null; focus = null; camCenter = null; intro = null; outro = null; introShown = false; waveInfo = null; goldId = null; special = null;
    zoom = zoomTarget = 1; slowT = 0; hitStop = 0;
    if (id !== old) courage = 0;
    if (!player) player = makePlayer();
    player.ch = Art.hero(myColor, Q.hat);
    player.x = x != null ? x : def.spawn.x; player.y = y != null ? U.clamp(y, FT, FB) : def.spawn.y;
    player.z = 0; player.vz = 0; player.kx = 0; player.charging = false; player.charge = 0; player.dash = null;
    spawnFollowers(false);
    camX = U.clamp(player.x - W / 2, 0, Math.max(0, map.w - W));
    Net.enter(id);
    Sound.playMusic(map.music);
    const first = !Q.flags['seen_' + id]; Q.flags['seen_' + id] = true;
    if (C.REGION[id] && first) banner = { t: 0, title: C.REGION[id][0], goal: C.REGION[id][1] };
    mapLabel = { text: map.name, t: 0 };
    Net.state({ m: id, x: Math.round(player.x), y: Math.round(player.y), z: 0, f: player.facing, a: 0, hp: Math.round(player.hp), dead: false, q: C.label(), hat: Q.hat || '', force: true });
    if (def.enter) def.enter(first, old);
    save();
  }
  function goMap(id, x, y, cb) { fadeTo(() => { loadMap(id, x, y); Sound.play('portal'); if (cb) cb(); }); }
  function usePortal(e) {
    if (e.locked && e.locked()) { Sound.play('wrong'); toast(val(e.lockMsg) || '아직 갈 수 없어요!', '#ffb3c8'); return; }
    const dest = SIM.MAPS[e.to];
    if (dest && !dest.safe && Q && !Q.flags['gate_' + e.to]) {   // 처음 가는 곳: 마음 문 문제
      if (gating) return;
      gating = true; clearPresses();
      gateQuiz({ why: `${dest.name} 가는 마음 문! 문제를 풀면 열려요`, icon: '🚪', big: '사랑 게이지 +40 · 체력 가득', small: '체력 가득' }).then((r) => {
        gating = false;
        if (state !== 'play' || !player) return;
        Q.flags['gate_' + e.to] = true;
        if (!r.skipped) {
          player.hp = player.max; Sound.play('heal');
          if (r.first) { gainLove(40); toast('정답! 마음 문이 활짝 — 사랑 게이지 +40, 체력 가득!', '#ffe680'); } else toast('마음 문이 열렸어요! 체력 가득', '#d9f5ff');
        }
        save(); usePortal(e);
      });
      return;
    }
    FX.burst(e.x, e.y, 60, 'star', 12, { speed: 200 });
    goMap(e.to, e.toX, player.y);
  }
  function makePlayer() {
    return { kind: 'player', x: 0, y: 440, z: 0, vz: 0, kx: 0, facing: 1, walk: 0, moving: false, hp: 100, max: 100, inv: 0, shootCd: 0, shootT: 0, hurtT: 0, landT: 0,
      charge: 0, charging: false, chargeFull: false, dead: false, emoT: 0, dash: null, dashCd: 0, afterT: 0, ch: Art.hero(myColor, Q && Q.hat) };
  }
  function spawnFollowers(fx) {
    followers = Q.followers.map((k, i) => ({ kind: 'follower', key: k, ch: Art.CH[k], x: player.x - (80 + i * 64), y: U.clamp(player.y + (i ? 30 : -24), FT, FB), z: 0, vz: 0, facing: 1, walk: 0, moving: false, slot: i, cd: 1.2 + i * 0.8, throwT: 0 }));
    if (fx) for (const f of followers) { FX.burst(f.x, f.y, 60, 'star', 10, { speed: 160 }); FX.poof(f.x, f.y, 20, 6); }
  }

  // ---------------- 네트워크에서 온 것 ----------------
  Net.on({
    mons(m, list, solo) { if (m === mapId) syncMons(list, solo); },
    snap(m, pl, mo) { if (m !== mapId) return; syncMons(mo, false); syncRemote(pl); },
    ev(m, evs) { if (m === mapId) for (const e of evs) onEv(e); },
    roster(list) { roster.clear(); for (const [id, name, color, hat] of list) roster.set(id, { name, color, hat }); },
    shot(o) {
      if (state !== 'play') return;
      if (o.b === 2) { const r = remote.get(o.id); explode(r ? r.rx : o.x, r ? r.ry : o.y, 40, false); return; }
      shots.push({ owner: 'remote', k: 'love', big: !!o.b, x: o.x, y: o.y, z: 46, vx: (o.f < 0 ? -1 : 1) * (o.b ? 560 : 650), life: o.b ? 1.3 : 1.05, t: 0 });
    },
    emo(o) { const r = remote.get(o.id); if (r) r.emoT = 2.5; },
    status(s) { netStatus = s; if (s === 'on' && state === 'play') toast('친구들과 연결됐어요!', '#bfffe0'); if (s === 'retry' && state === 'play') toast('연결이 끊겼어요. 다시 연결하는 중…', '#ffb3c8'); },
    room(m) { renderTeacher(m); },
  });
  function syncMons(list, solo) {
    const seen = new Set();
    for (const s of list) {
      let m = mons.get(s.id);
      if (!m) { m = { id: s.id, rx: s.x, ry: s.y, rz: s.z || 0, flash: 0, sq: 0, ph: Math.random() * 6, spawnAt: -9 }; mons.set(s.id, m); }
      const prev = m.st;
      if (prev == null && s.st === 'down' && !solo && isBoss(s)) toast('친구들이 방금 보스를 물리쳤어요! 잠시 뒤 다시 나타나요', '#fff36a');
      if (s.st === 'spawn' && prev !== 'spawn') { m.spawnAt = t; FX.poof(s.x, s.y, 30, 7); if (s.type === 'gold') FX.burst(s.x, s.y, 50, 'star', 10, { speed: 160 }); }
      m.type = s.type; m.x = s.x; m.y = s.y; m.z = s.z || 0; m.hp = s.hp; m.max = s.max; m.st = s.st; m.f = s.f; m.phase = s.phase || 0; m.wave = !!s.wave; m.stunned = (s.stun || 0) > 0;
      if (solo || prev === 'dead' || prev == null || Math.abs(m.rx - m.x) > 260) { m.rx = m.x; m.ry = m.y; m.rz = m.z; }
      seen.add(s.id);
    }
    for (const id of [...mons.keys()]) if (!seen.has(id)) mons.delete(id);
  }
  function syncRemote(pl) {
    const seen = new Set();
    for (const [id, x, y, z, f, a, hp, dead] of pl) {
      if (id === Net.myId) continue;
      let r = remote.get(id);
      if (!r) { r = { id, rx: x, ry: y, rz: z, walk: 0, emoT: 0, afterT: 0 }; remote.set(id, r); }
      Object.assign(r, { x, y, z, f, a, hp, dead: !!dead });
      seen.add(id);
    }
    for (const id of [...remote.keys()]) if (!seen.has(id)) remote.delete(id);
  }
  function onEv(e) {
    switch (e.e) {
      case 'p': eshots.push({ k: e.k, x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, dmg: e.dmg, life: e.life, r: e.r || 14, t: 0 }); break;
      case 'h':
        if (e.k === 'ring') rings.push(Object.assign({}, e, { t: 0, r: 0, hit: false, started: false }));
        else hazards.push(Object.assign({}, e, { t: 0, fired: false }));
        if (e.dmg && Math.abs(e.x != null ? e.x - player.x : 0) < W) Sound.play('warn');
        break;
      case 'd': onDeath(e); break;
      case 'b': onBoss(e); break;
      case 'w':
        if (e.k === 'start') { waveInfo = { t: 0, text: e.text, n: e.n }; Sound.play('alarm'); shake = Math.max(shake, 6); }
        else if (e.k === 'clear') {
          waveInfo = null; Sound.play('clear'); gainLove(35); player.hp = Math.min(player.max, player.hp + 30);
          FX.burst(player.x, player.y, 120, 'confetti', 40, { speed: 300, up: 200 }); FX.beam(player.x, player.y, 'rgba(255,240,150,', 1.2);
          banner = { t: 0, title: '습격을 막았어요!', goal: '체력 회복 + 사랑 게이지 UP!' }; Q.stats.waves = (Q.stats.waves || 0) + 1;
        } else { waveInfo = null; toast('습격이 끝났어요.'); }
        break;
      case 'g':
        if (e.k === 'spawn') { goldId = e.id; Sound.play('gold'); toast('✨ 황금 투덜이가 나타났어요! 잡으면 행운이!', '#ffe680'); }
        else if (e.k === 'bye') { if (goldId === e.id) { goldId = null; toast('황금 투덜이가 도망갔어요…', '#d9c8ff'); FX.poof(e.x, e.y, 40, 8); } }
        break;
    }
  }
  function onDeath(e) {
    const m = mons.get(e.id);
    const x = m ? m.rx : e.x, y = m ? m.ry : e.y, z = m ? m.rz : 0;
    ghosts.push({ type: e.type, x, y, z, f: m ? m.f : 1, t: 0, ph: Math.random() * 6 });
    if (m) m.st = 'dead';
    Sound.play('purify'); FX.purify(x, y, z);
    const mine = (e.by || []).includes(Net.myId);
    if (e.type === 'gold') {
      goldId = null;
      FX.burst(x, y, z + 40, 'star', 30, { speed: 320, size: 9, life: 1.3 }); FX.shock(x, y, z + 40, 160, 0.4, '#ffe680', 8);
      if (mine) { gainLove(100); player.hp = player.max; Sound.play('gold'); FX.word(x, y, z + 120, '행운이다!', '#ffe14a', 40); toast('황금 투덜이를 잡았어요! 사랑 게이지 가득 + 체력 회복!', '#ffe680'); Q.stats.gold = (Q.stats.gold || 0) + 1; for (let i = 0; i < 5; i++) drop('star', x + U.rand(-30, 30), y); }
      return;
    }
    if (!mine) return;
    hitStop = Math.max(hitStop, 0.045);
    Q.stats.purified++;
    gainLove(e.minion ? 4 : 6);
    if (!e.minion || e.wave) C.onKill(e.type, e); // 습격 몬스터도 퀘스트에 셈 (재생성이 느려져서)
    const r = Math.random();
    if (r < (e.minion ? 0.08 : 0.13)) drop('heal', e.x, e.y);
    else if (r < 0.38) drop('star', e.x, e.y);
  }
  function bossMon() { for (const m of mons.values()) if (isBoss(m)) return m; return null; }
  function onBoss(e) {
    const b = mons.get(e.id) || bossMon();
    if (e.k === 'say') bossSay = { text: e.text, t: 0, life: 3 };
    else if (e.k === 'start') {
      fightStart = t; fightHits = 0;
      if (!introShown && b) { introShown = true; intro = { t: 0, type: b.type, x: b.rx }; camCenter = b.rx - 40; zoomTarget = 1.14; Sound.play('roar'); shake = 10; }
    } else if (e.k === 'phase') {
      shake = 12; Sound.play('slam'); FX.flash('#ffffff', 0.35, 0.25);
      // 꼭 푸는 문제: 보스의 심술 방패 — 처음에 맞히면 보스 체력 -8%·6초 무적, 아니면 3초 무적
      if (b && !player.dead && !teachWin) {   // 선생님 '보스 바로 이기기' 중에는 방패 문제를 건너뜀
        const bid = b.id;
        gateQuiz({ why: '보스의 심술 방패! 문제를 풀어 깨뜨려요', icon: '💥', big: '보스 체력 깎기 + 6초 무적', small: '3초 무적' }).then((r) => {
          if (r.skipped || state !== 'play' || !player || player.dead) return;
          player.shieldT = Math.max(player.shieldT || 0, r.first ? 6 : 3);
          const bb = mons.get(bid);
          if (r.first && bb && bb.st !== 'down') { Net.hit(mapId, bid, Math.round((bb.max || 1000) * 0.08)); FX.word(bb.rx || player.x, bb.ry || player.y, 260, '방패 와장창!', '#fff36a', 34); }
          toast(r.first ? '정답! 심술 방패가 깨졌어요 — 보스 체력 뚝, 6초 무적!' : '방패를 막아 냈어요! 3초 무적', r.first ? '#ffe680' : '#d9f5ff');
        });
      }
      if (b) { FX.shock(b.rx, b.ry, 80, 260, 0.45, '#ffd1e6', 8); FX.word(b.rx, b.ry, 240, '빈틈이다!', '#fff36a', 36); }
      toast(e.phase === 2 ? '보스가 화가 났어요! 그런데 지금이 빈틈! 마구 공격해요!' : '보스의 마지막 힘! 지금 빈틈을 노려요!', '#ffe680');
    } else if (e.k === 'down') {
      if (b) b.st = 'down';
      courage = 0;
      const type = b ? b.type : map.boss;
      const time = Math.max(1, Math.round(t - fightStart)), hits = fightHits;
      const sc = (time <= 50 ? 3 : time <= 85 ? 2 : 1) + (hits <= 2 ? 3 : hits <= 6 ? 2 : 1);
      const grade = sc >= 6 ? 'S' : sc >= 4 ? 'A' : 'B';
      Q.stats.grades = Q.stats.grades || {};
      if (!Q.stats.grades[type] || 'SAB'.indexOf(grade) < 'SAB'.indexOf(Q.stats.grades[type])) Q.stats.grades[type] = grade;
      outro = { t: 0, type, e, time, hits, grade, x: e.x, y: e.y, stamped: false };
      try { window.dispatchEvent(new CustomEvent('minigame-clear', { detail: { game: 'sarang', boss: type, grade, diff: gameDiff } })); } catch (err) { /* 광장 반 별 */ }
      slowT = 1.3; zoomTarget = 1.16; camCenter = e.x; hitStop = 0.15; shake = 16;
      Sound.play('bossdown'); FX.flash('#ffffff', 0.85, 0.6);
      FX.burst(e.x, e.y, 90, 'heart', 40, { speed: 340, size: 10, life: 1.6 }); FX.burst(e.x, e.y, 120, 'star', 26, { speed: 300, size: 9, life: 1.4 });
      FX.shock(e.x, e.y, 90, 420, 0.7, '#ffffff', 10); FX.ring(e.x, e.y, 520, 0.9, '#ffd1e6', 9);
    } else if (e.k === 'reset') toast('보스가 다시 힘을 모았어요! 조심해서 다시 도전!', '#ffb3c8');
  }

  // ---------------- 공격 ----------------
  function targetActive(e) { return e.target && !(e.hidden && e.hidden()) && (!e.target.active || e.target.active()); }
  function fire(big) {
    const p = player, dir = p.facing;
    const boost = 1 + 0.2 * courage;
    const s = { owner: 'me', k: 'love', big, x: p.x + dir * 30, y: p.y, z: p.z + 46, vx: dir * (big ? 580 : 680), dmg: Math.round((big ? 34 : 11) * boost), life: big ? 1.3 : 1.0, pierce: big ? 3 : 1, hits: new Set(), t: 0, tid: null, trailT: 0 };
    let best = null, bs = 1e9;
    const consider = (id, x, y, isMon, pen) => {
      const dx = (x - p.x) * dir; if (dx < 0 || dx > 700) return;
      const dy = Math.abs(y - p.y); if (dy > 120) return;
      const sc = dx + dy * 2.4 + (pen || 0); if (sc < bs) { bs = sc; best = { id, isMon }; }
    };
    for (const m of mons.values()) if (alive(m)) consider(m.id, m.rx, m.ry, true);
    for (const e of ents) if (targetActive(e)) consider(e.id, e.x, e.y, false, e.sub === 'break' ? 240 : 0);
    s.tid = best;
    shots.push(s);
    p.shootT = 0.2; Sound.play(big ? 'big' : 'shoot');
    if (big) { FX.burst(s.x, s.y, s.z, 'star', 8, { speed: 200 }); FX.shock(s.x, s.y, s.z, 60, 0.25, '#fff36a', 4); shake = Math.max(shake, 3); p.kx -= dir * 120; }
    Net.shot({ x: Math.round(s.x), y: Math.round(s.y), f: dir, b: big ? 1 : 0 });
  }
  function hitMon(m, dmg, big, kb, fromSpecial) {
    m.flash = 0.18; m.sq = 1;
    const shown = isBoss(m) && m.st === 'hurt' ? Math.round(dmg * 1.5) : dmg;
    FX.text(m.rx + U.rand(-12, 12), m.ry, (m.rz || 0) + (MONH[m.type] || 90) * 0.75, String(shown) + (shown !== dmg ? '!' : ''), big ? '#ffe14a' : '#ffffff', { size: big ? 30 : 22 });
    FX.hit(m.rx, m.ry, (m.rz || 0) + 44, big);
    Sound.play('hit');
    if (big) hitStop = Math.max(hitStop, 0.05);
    Net.hit(mapId, m.id, dmg, kb || 0);
    if (!fromSpecial) { addCombo(); gainLove(big ? 5 : 3); }
  }
  function addCombo() {
    combo++; comboT = 2.2; comboPop = 1;
    if (combo > (Q.stats.bestCombo || 0)) Q.stats.bestCombo = combo;
    if (combo >= 5 && combo % 5 === 0) Sound.play('combo', combo / 5);
    if (combo % 10 === 0) {
      const w = combo >= 50 ? '전설!' : combo >= 30 ? '최고예요!' : combo >= 20 ? '멋져요!' : '좋아요!';
      FX.word(player.x, player.y, 180, `${combo} 콤보 ${w}`, '#ffe14a', 30); gainLove(10);
    }
  }
  function updateShots(dt) {
    for (const s of shots) {
      s.t += dt; s.x += s.vx * dt;
      if (s.tid) {
        const tg = s.tid.isMon ? mons.get(s.tid.id) : ents.find((e) => e.id === s.tid.id);
        if (tg && (s.tid.isMon ? alive(tg) : true)) {
          const ty = s.tid.isMon ? tg.ry : tg.y;
          s.y += U.clamp(ty - s.y, -320 * dt, 320 * dt);
          const tz = s.tid.isMon ? Math.min(150, (tg.rz || 0) + 34) : 50;
          s.z += (tz - s.z) * Math.min(1, dt * 5);
        }
      }
      s.trailT = (s.trailT || 0) - dt;
      if (s.trailT <= 0) {
        s.trailT = 0.022;
        if (s.k === 'love') FX.trail(s.x - s.vx * 0.01, s.y, s.z + U.rand(-8, 8), s.big ? 'star' : 'spark', s.big ? pick(['#fff36a', '#ff9cc8', '#9ff0ff', '#c9a2ff']) : '#ffd1e6', s.big ? 9 : 3.5, s.big ? 0.45 : 0.25);
        else if (s.k === 'pillow') FX.trail(s.x, s.y, s.z, 'feather', '#fff', 4, 0.4);
        else FX.trail(s.x, s.y, s.z, 'spark', '#ffe58a', 3, 0.25);
      }
      if (s.owner === 'remote') continue;
      const rad = s.big ? 40 : 13;
      for (const m of mons.values()) {
        if (!alive(m) || s.hits.has(m.id)) continue;
        const r = SIM.MON[m.type].r;
        if (Math.abs(m.rx - s.x) < r * 0.75 + rad && Math.abs(m.ry - s.y) < 30 + (s.big ? 24 : 0)) {
          s.hits.add(m.id); hitMon(m, s.dmg, s.big, Math.sign(s.vx) * (s.big ? 34 : s.owner === 'f' ? 8 : 15), s.owner === 'f');
          if (--s.pierce <= 0) { s.t = 99; break; }
        }
      }
      if (s.t > 50) continue;
      if (s.owner === 'me') {
        for (const e of ents) {
          if (!targetActive(e) || s.hits.has(e.id)) continue;
          if (e.sub === 'break' && s.tid && s.tid.id !== e.id) continue;
          if (Math.abs(e.x - s.x) < e.target.r + rad && Math.abs(e.y - s.y) < 34) {
            s.hits.add(e.id); e.hitT = 0.4; Sound.play('hit'); FX.hit(e.x, e.y, 60, s.big);
            const used = e.target.hit(s.dmg, s.big, e);
            if (used !== false && --s.pierce <= 0) { s.t = 99; break; }
          }
        }
        for (const b of eshots) {
          if (b.done || (b.k !== 'bubble' && b.k !== 'grump' && b.k !== 'ink')) continue;
          if (Math.abs(b.x - s.x) < 22 && Math.abs(b.y - s.y) < 24) { b.done = true; FX.burst(b.x, b.y, b.z, 'spark', 6, { col: '#e8f6ff' }); FX.word(b.x, b.y, b.z + 20, '퐁!', '#9ff0ff', 20); Sound.play('pop'); if (!s.big) { s.t = 99; break; } }
        }
      }
    }
    for (const s of shots) if (s.t >= 50) FX.burst(s.x, s.y, s.z, 'spark', 3, { speed: 90 });
    shots = shots.filter((s) => s.t < s.life && s.x > -100 && s.x < map.w + 100);
  }
  function hurt(dmg, fromX) {
    const p = player;
    if (p.dead || p.inv > 0 || p.shieldT > 0 || busy() || state !== 'play' || special || window.__game._god) return;
    dmg = Math.max(1, Math.round(dmg * gradeK.dmg));
    p.hp = Math.max(0, p.hp - dmg); p.inv = 0.9; p.hurtT = 0.35; shake = Math.max(shake, 7); hitStop = Math.max(hitStop, 0.05);
    FX.text(p.x, p.y, 130, '-' + dmg, '#ff6b8b', { size: 26 }); FX.word(p.x, p.y, 150, pick(['아야!', '앗!', '으앗!']), '#ffb3c8', 24);
    FX.burst(p.x, p.y, 50, 'spark', 6, { col: '#ffb3c8' });
    if (map.boss) fightHits++;
    combo = 0;
    Sound.play('ouch');
    if (fromX != null) p.kx = (p.x >= fromX ? 1 : -1) * 300;
    if (p.hp <= 0) faint();
  }
  function faint() {
    const p = player; p.dead = true; p.charging = false; p.dash = null; deadT = 3.5; Q.stats.deaths++;
    Sound.play('faint'); FX.burst(p.x, p.y, 60, 'spark', 14, { col: '#d9c8ff' }); FX.poof(p.x, p.y, 30, 8);
  }
  function revive() {
    const p = player; p.dead = false; p.hp = p.max; p.inv = 2;
    if (map.boss) {
      p.x = 170; p.y = 440; p.z = 0; camX = 0; for (const f of followers) { f.x = 100; f.y = p.y; }
      courage = Math.min(3, courage + 1);
      FX.beam(p.x, p.y, 'rgba(255,240,150,', 1.0);
      toast(`친구들의 응원! 하트 힘이 세졌어요 (+${courage * 20}%)`, '#fff36a');
    } else goMap(C.townOf(map.region), null, null, () => toast('마을에서 푹 쉬고 다시 출발!', '#fff'));
  }
  function updateDanger(dt, paused) {
    const p = player;
    if (!paused) {
      for (const b of eshots) {
        b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y < FT - 30 || b.y > FB + 30) b.done = true;
        b.tr = (b.tr || 0) - dt;
        if (b.tr <= 0) { b.tr = 0.06; if (b.k === 'bubble') FX.trail(b.x, b.y, b.z, 'bubble', '#fff', 3, 0.35); else if (b.k === 'fork' || b.k === 'grump') FX.trail(b.x, b.y, b.z, 'spark', '#c98bff', 3, 0.3); }
        if (!b.done && !p.dead && Math.abs(b.x - p.x) < b.r + 16 && Math.abs(b.y - p.y) < 24 && Math.abs(b.z - (p.z + 40)) < 52) {
          b.done = true; hurt(b.dmg, b.x); FX.burst(b.x, b.y, b.z, 'spark', 6, { col: '#ffd1e6' });
        }
      }
      eshots = eshots.filter((b) => !b.done && b.t < b.life);
      for (const h of hazards) {
        h.t += dt;
        if (h.follow && h.t < h.warn) { const bm = mons.get(h.follow); if (bm) h.y = bm.ry; }
        if (!h.fired && h.t >= h.warn) {
          h.fired = true;
          if (h.k === 'circle') {
            const kind = { rain: 'drop', crumb: 'confetti', nap: 'bubble', bolt: 'spark', grump: 'spark', swoop: 'spark' }[h.fx] || 'spark';
            FX.burst(h.x, h.y, 10, kind, 10, { speed: 160, col: h.fx === 'grump' ? '#c98bff' : undefined }); FX.ring(h.x, h.y, h.r * 1.4, 0.35, '#ffffff', 4);
            if (h.dmg && Math.abs(h.x - camX - W / 2) < W) shake = Math.max(shake, 3);
          }
          if (h.fx === 'bolt') Sound.play('zap'); else if (h.fx === 'erase') { Sound.play('zap'); shake = Math.max(shake, 6); } else if (h.dmg) Sound.play('pop');
          if (h.dmg && !p.dead) {
            let inside = false;
            if (h.k === 'circle') inside = ((p.x - h.x) / h.r) ** 2 + ((p.y - h.y) / (h.r * 0.42)) ** 2 <= 1 && p.z < 90;
            else if (h.k === 'lane') inside = Math.abs(p.y - h.y) < h.h / 2 && p.z < 70;
            if (inside) hurt(h.dmg, h.x != null ? h.x : null);
          }
        }
      }
      hazards = hazards.filter((h) => h.t < h.warn + 0.4);
      for (const r of rings) {
        r.t += dt;
        if (r.t < r.warn) continue;
        if (!r.started) { r.started = true; Sound.play('slam'); shake = Math.max(shake, 9); FX.dust(r.x, r.y, 10); }
        r.r = (r.t - r.warn) * r.spd;
        if (!r.hit && r.dmg && !p.dead) {
          const d = Math.hypot(p.x - r.x, (p.y - r.y) / 0.42);
          if (Math.abs(d - r.r) < 26 && p.z < 30) { r.hit = true; hurt(r.dmg, r.x); }
          else if (Math.abs(d - r.r) < 26 && p.z >= 30 && !r.dodged) { r.dodged = true; FX.word(p.x, p.y, p.z + 120, '휙~ 피했다!', '#9ff0ff', 24); }
        }
      }
      rings = rings.filter((r) => r.r < r.maxR);
    }
    if (!p.dead) for (const m of mons.values()) {
      if (!alive(m) || m.st === 'wait' || m.st === 'spawn' || m.type === 'gold') continue;
      const d = SIM.MON[m.type];
      if ((m.rz || 0) >= 45 && m.type !== 'shade') continue;
      const fast = m.st === 'charge' || m.st === 'roll' || m.st === 'dash';
      if (Math.abs(m.rx - p.x) < d.r * 0.8 + 18 && Math.abs(m.ry - p.y) < 26 && p.z < d.r * 0.9) hurt(Math.round(d.dmg * (fast ? 1.3 : 0.6)), m.rx);
    }
  }

  // ---------------- 사랑 폭발 · 대시 ----------------
  function startSpecial() {
    love = 0; loveFull = false;
    const p = player;
    special = { t: 0, x: p.x, y: p.y, done: false };
    p.inv = Math.max(p.inv, 1.6); p.vz = 0; p.charging = false;
    Sound.play('special'); zoomTarget = 1.12; FX.flash('#ff9cc8', 0.25, 0.4);
    Net.shot({ x: Math.round(p.x), y: Math.round(p.y), f: p.facing, b: 2 });
    Q.stats.specials = (Q.stats.specials || 0) + 1;
  }
  function updateSpecial(dt) {
    const s = special, p = player; s.t += dt;
    if (s.t < 0.55) {
      p.z = Math.min(90, p.z + dt * 240); p.vz = 0;
      for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = 90 + Math.random() * 60; FX.trail(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.3, p.z + 50 + Math.sin(a) * 40, 'star', pick(['#ff9cc8', '#fff36a', '#c9a2ff']), 5, 0.3); }
      FX.glow(p.x, p.y, p.z + 50, 60 + s.t * 120, [255, 150, 200], 0.1);
    } else if (!s.done) { s.done = true; explode(p.x, p.y, p.z, true); }
    if (s.t >= 1.0) { special = null; zoomTarget = 1; }
  }
  function explode(x, y, z, mine) {
    FX.shock(x, y, z + 50, 520, 0.6, '#ffffff', 10); FX.shock(x, y, z + 50, 380, 0.5, '#ff9cc8', 8);
    FX.ring(x, y, 480, 0.75, '#ffd1e6', 9); FX.ring(x, y, 300, 0.6, '#ffffff', 6);
    FX.burst(x, y, z + 50, 'heart', 44, { speed: 440, size: 10, life: 1.3 }); FX.burst(x, y, z + 50, 'star', 20, { speed: 380, size: 9, life: 1.1 });
    FX.glow(x, y, z + 50, 320, [255, 170, 210], 0.5); FX.word(x, y, z + 150, '사랑 폭발!', '#ff5f9e', 46);
    FX.flash('#ffffff', 0.55, 0.3); shake = 16; hitStop = Math.max(hitStop, 0.12);
    if (!mine) return;
    for (const m of mons.values()) {
      if (!alive(m)) continue;
      const dx = m.rx - x, dy = m.ry - y;
      if ((dx / 440) ** 2 + (dy / 185) ** 2 > 1) continue;
      hitMon(m, Math.round((isBoss(m) ? 90 : 70) * (1 + 0.2 * courage)), true, (dx >= 0 ? 1 : -1) * 60, true);
    }
    for (const b of eshots) if (Math.abs(b.x - x) < 460 && Math.abs(b.y - y) < 190) { b.done = true; FX.burst(b.x, b.y, b.z, 'spark', 3); }
    for (const e of ents) if (targetActive(e) && Math.abs(e.x - x) < 460 && Math.abs(e.y - y) < 190) { e.hitT = 0.4; if (e.sub === 'break') hitBreakable(e, 9); else e.target.hit(40, true, e); }
  }
  function startDash() {
    const p = player;
    let dx = input.mx, dy = input.my; const m = Math.hypot(dx, dy);
    if (m < 0.25) { dx = p.facing; dy = 0; } else { dx /= m; dy /= m; }
    if (Math.abs(dx) > 0.2) p.facing = dx > 0 ? 1 : -1;
    p.dash = { t: 0, dx, dy }; p.dashCd = 0.7; p.inv = Math.max(p.inv, 0.3); p.charging = false;
    Sound.play('whoosh'); FX.dust(p.x, p.y, 6); FX.word(p.x - dx * 30, p.y, p.z + 90, '슝!', '#9ff0ff', 22);
  }
  function addAfter(ch, x, y, z, f, w) {
    const s = dscale(y);
    FX.after((c, cx) => Art.drawChar(c, ch, x - cx, y - z * s, { t, facing: f, scale: s, moving: true, walk: w, air: z > 0, flash: 0.9 }), 0.24);
  }

  // ---------------- 아이템 ----------------
  function drop(kind, x, y) {
    const label = kind === 'number' ? String((inv('number') + pending('number') + 1) * 5) : null;
    pickups.push({ kind, x, y: U.clamp(y, FT, FB), z: 40, vz: 300 + Math.random() * 80, vx: U.rand(-80, 80), t: 0, label });
    if (kind !== 'star') Sound.play('drop');
  }
  function updatePickups(dt) {
    const p = player;
    for (const k of pickups) {
      k.t += dt;
      if (k.t < 0.6) { k.vz -= 900 * dt; k.z = Math.max(0, k.z + k.vz * dt); if (k.z === 0) k.vz = Math.abs(k.vz) * 0.4; k.x += k.vx * dt; continue; }
      if (p.dead) continue;
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy * 1.4), sp = 240 + (k.t - 0.6) * 760;
      if (d < 26) { collect(k); k.got = true; continue; }
      k.x += dx / d * Math.min(d, sp * dt); k.y += dy / d * Math.min(d, sp * dt) * 0.8; k.z += (p.z + 36 - k.z) * Math.min(1, dt * 6);
      if (Math.random() < 0.3) FX.trail(k.x, k.y, k.z, 'spark', '#fff6c0', 3, 0.25);
    }
    pickups = pickups.filter((k) => !k.got);
  }
  function collect(k, quiet) {
    const p = player;
    if (k.kind === 'heal') { p.hp = Math.min(p.max, p.hp + 25); Sound.play('heal'); FX.text(p.x, p.y, 120, '+25', '#7dffb0'); FX.burst(p.x, p.y, 60, 'heart', 6, { speed: 120 }); return; }
    if (k.kind === 'star') { gainLove(6); starPick(); return; }
    Q.inv[k.kind] = inv(k.kind) + 1;
    if (!quiet) { Sound.play('pickup'); FX.burst(p.x, p.y, 80, 'star', 6, { speed: 140 }); }
    const [name, need] = ITEM[k.kind];
    toast(`${name} 얻음! (${Math.min(inv(k.kind), need)}/${need})`, '#fff36a');
    C.onPickup(k.kind); save();
  }
  function starPick() { starStreak = starT > 0 ? starStreak + 1 : 0; starT = 1.2; Sound.play('twinkle', starStreak); }
  function updateProps(dt) {
    const p = player;
    for (const e of ents) {
      if (e.sub === 'break') { e.shake = Math.max(0, e.shake - dt * 4); if (e.broken) { e.respawn -= dt; if (e.respawn <= 0) { e.broken = false; e.hp = e.max; FX.poof(e.x, e.y, 20, 6); } } }
      else if (e.sub === 'pad') {
        e.squash = Math.max(0, e.squash - dt * 5); e.cool -= dt;
        if (!p.dead && !busy() && !special && p.z <= 2 && p.vz <= 0 && e.cool <= 0 && Math.abs(p.x - e.x) < 42 && Math.abs(p.y - e.y) < 22) {
          p.vz = e.power; p.z = 2; e.squash = 1; e.cool = 0.4; p.dash = null;
          Sound.play('bounce'); FX.word(e.x, e.y, 90, pick(['보잉~!', '통!', '뿅!']), '#9ff0ff', 28); FX.dust(e.x, e.y, 8); FX.burst(e.x, e.y, 30, 'star', 5, { speed: 160 });
        }
      } else if (e.kind === 'star') {
        if (e.got) { e.cool -= dt; if (e.cool <= 0) { e.got = false; } continue; }
        if (!p.dead && Math.abs(p.x - e.x) < 30 && Math.abs(p.y - e.y) < 28 && Math.abs((p.z + 40) - e.z) < 50) {
          e.got = true; e.cool = 35; gainLove(5); starPick();
          FX.burst(e.x, e.y, e.z, 'star', 6, { speed: 130, size: 6 }); FX.glow(e.x, e.y, e.z, 40, [255, 240, 160], 0.2);
        }
      }
    }
  }

  // ---------------- 갱신 ----------------
  function update(rdt) {
    readInput();
    t += rdt;
    if (state === 'title') { camX = (Math.sin(t * 0.08) * 0.5 + 0.5) * (map.w - W); FX.update(rdt); clearPresses(); return; }
    if (state !== 'play') { clearPresses(); return; }
    // 멈칫·느린 화면
    let dt = rdt;
    if (slowT > 0) { slowT -= rdt; dt = rdt * 0.3; }
    if (hitStop > 0) { hitStop -= rdt; dt = 0; }
    Q.stats.play += rdt;
    actCool = Math.max(0, actCool - rdt);
    shake = Math.max(0, shake - rdt * 30);
    questPulse = Math.max(0, questPulse - rdt);
    comboPop = Math.max(0, comboPop - rdt * 4);
    starT = Math.max(0, starT - rdt);
    zoom += (zoomTarget - zoom) * Math.min(1, rdt * 6);
    for (const tm of timers) { tm.t -= rdt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
    timers = timers.filter((tm) => !tm.done);
    if (fade.dir > 0) { fade.a += rdt * 3.2; if (fade.a >= 1) { fade.a = 1; fade.dir = -1; const cb = fade.cb; fade.cb = null; if (cb) cb(); } }
    else if (fade.dir < 0) { fade.a -= rdt * 2.4; if (fade.a <= 0) { fade.a = 0; fade.dir = 0; } }

    if (Mini.active) {
      Mini.update(rdt, input);
      if (mode === 'multi') { Net.tick(rdt, null, false); sendState(); }
      clearPresses(); return;
    }
    if (dialog && input.taps.length) input.actP = true;
    if (askBox) updateAsk(rdt);
    else if (dialog) updateDialog(rdt);

    if (intro) { intro.t += rdt; if (intro.t > 2.4) { intro = null; camCenter = null; zoomTarget = 1; fightStart = t; } }
    if (outro) updateOutro(rdt);

    const paused = mode === 'solo' && busy() && !(outro && outro.t < 1.4);
    const free = !busy() && !player.dead && !special && !tutHold();   // 튜토리얼 ▶ 설명 동안은 멈춤
    updatePlayer(dt, free);
    if (special) updateSpecial(dt);
    if (!paused) Net.tick(dt, { id: Net.myId, x: player.x, y: player.y, z: player.z, dead: player.dead }, false);
    else Net.tick(dt, null, true);
    for (const m of mons.values()) {
      const k = Math.min(1, dt * 12);
      m.rx += (m.x - m.rx) * k; m.ry += (m.y - m.ry) * k; m.rz += (m.z - m.rz) * k;
      m.flash = Math.max(0, m.flash - dt); m.sq = Math.max(0, (m.sq || 0) - dt * 5);
    }
    for (const r of remote.values()) {
      const k = Math.min(1, dt * 12);
      const ox = r.rx; r.rx += (r.x - r.rx) * k; r.ry += (r.y - r.ry) * k; r.rz += (r.z - r.rz) * k;
      if (Math.abs(r.rx - ox) > 0.3 || (r.a & 1)) r.walk += dt * 11;
      r.emoT = Math.max(0, r.emoT - dt);
      if (r.a & 64) { r.afterT -= dt; if (r.afterT <= 0) { r.afterT = 0.04; const info = roster.get(r.id) || { color: 'red', hat: '' }; addAfter(Art.hero(info.color, info.hat), r.rx, r.ry, r.rz, r.f, r.walk); } }
    }
    updateShots(dt);
    updateDanger(dt, paused);
    updateFollowers(dt, paused);
    updatePickups(dt);
    updateProps(dt);
    for (const e of ents) {
      e.t = (e.t || 0) + dt; e.hitT = Math.max(0, (e.hitT || 0) - dt);
      if (e.cool > 0 && e.sub !== 'pad' && e.kind !== 'star') e.cool -= dt;
      if (e.say) { e.say.t += rdt; if (e.say.t > e.say.life) e.say = null; }
      if (e.kind === 'npc' && !e.fixed && !(e.sleeping && e.sleeping())) { const dx = player.x - e.x; if (Math.abs(dx) < 220 && Math.abs(dx) > 8) e.facing = dx > 0 ? 1 : -1; }
      if (e.kind === 'npc' && e.chat && !busy() && !e.say && !(e.hidden && e.hidden())) {
        e.chatT -= rdt;
        if (e.chatT <= 0) { e.chatT = 7 + Math.random() * 7; if (Math.abs(player.x - e.x) < 520 && Math.abs(player.x - e.x) > 60) e.say = { text: pick(val(e.chat)), t: 0, life: 2.6 }; }
      }
    }
    for (const g of ghosts) g.t += dt;
    ghosts = ghosts.filter((g) => g.t < 1.4);
    if (bossSay) { bossSay.t += rdt; if (bossSay.t > bossSay.life) bossSay = null; }
    if (transformFx) updateTransform(rdt);
    FX.update(dt);
    comboT -= dt; if (comboT <= 0) combo = 0;
    if (waveInfo) waveInfo.t += rdt;
    if (mapId === 'heart' && C.is('done')) { confT -= rdt; if (confT <= 0) { confT = 0.1; FX.burst(camX + Math.random() * W, 330 + Math.random() * 200, 420, Math.random() < 0.5 ? 'heart' : 'confetti', 1, { speed: 20, up: -60, g: 30, life: 5 }); } }
    scene.mood = U.lerp(scene.mood || 0, C.mood ? C.mood(mapId) : 0, Math.min(1, rdt * 1.5));
    if (map.theme === 'throne') { const b = bossMon(); scene.rage = b && alive(b) && b.st !== 'wait' && b.phase >= 3 ? 1 : 0; scene.healed = C.at('done') || kongShown ? Math.min(1, (scene.healed || 0) + rdt * 0.5) : 0; }
    for (const ts of toasts) ts.t += rdt;
    toasts = toasts.filter((ts) => ts.t < ts.life);
    if (banner) { banner.t += rdt; if (banner.t > 3.4) banner = null; }
    if (mapLabel) { mapLabel.t += rdt; if (mapLabel.t > 2.4) mapLabel = null; }
    if (player.dead) { deadT -= rdt; if (deadT <= 0 && fade.dir === 0) revive(); }
    if (map.safe && !player.dead && player.hp < player.max) player.hp = Math.min(player.max, player.hp + rdt * 12);
    hpShow += (player.hp - hpShow) * Math.min(1, rdt * 6);
    loveShow += (love - loveShow) * Math.min(1, rdt * 8);
    findFocus();
    updateButtons();
    if (free && input.actP && focus && actCool <= 0) { actCool = 0.35; const a = actOf(focus); if (a) a.fn(); }
    if (free && input.emoP) { player.emoT = 2.5; Net.emo('heart'); Sound.play('pop'); FX.burst(player.x, player.y, 140, 'heart', 5, { speed: 80 }); }
    if (free && input.specialP) { if (love >= 100) startSpecial(); else { Sound.play('wrong'); toast(`사랑 게이지가 아직 ${Math.floor(love)}%예요. 몬스터를 맑게 하면 차요!`, '#ffd1e6'); } }
    // 카메라(2026-11-25 "어지럽지 않게"): 보는 쪽으로 앞서 보는 거리를 천천히 바꿔서, 좌우로 자주 돌아도 화면이 출렁이지 않게
    camLead += (player.facing * 50 - camLead) * Math.min(1, rdt * 1.6);
    const want = camCenter != null ? camCenter - W / 2 : player.x - W / 2 + camLead;
    camX += (want - camX) * Math.min(1, rdt * 4);
    camX = U.clamp(camX, 0, Math.max(0, map.w - W));
    sendState();
    const ql = C.lines().join('|'); if (ql !== lastLines) { if (lastLines) questPulse = Math.max(questPulse, 0.6); lastLines = ql; }
    clearPresses();
  }
  function updateOutro(rdt) {
    outro.t += rdt;
    if (outro.t >= 1.4 && !outro.stamped) { outro.stamped = true; Sound.play('stamp'); FX.flash('#fff6c0', 0.4, 0.3); after(0.5, () => Sound.play('clear')); }
    if (outro.t >= 1.4 && Math.random() < 0.5) FX.burst(camX + Math.random() * W, 300 + Math.random() * 200, 400, 'confetti', 1, { speed: 30, up: -40, g: 60, life: 3 });
    if (outro.t >= 3.6 && !outro.done) {
      outro.done = true; zoomTarget = 1; camCenter = null;
      const o = outro; outro = null;
      C.onBossDown(o.type, o.e);
    }
  }
  function sendState() {
    if (mode !== 'multi' || !player) return;
    const p = player;
    const a = (p.moving ? 1 : 0) | (p.shootT > 0 ? 2 : 0) | (p.hurtT > 0 ? 4 : 0) | (p.charging && p.charge > 0.2 ? 8 : 0) | (busy() ? 16 : 0) | (p.emoT > 0 ? 32 : 0) | (p.dash ? 64 : 0);
    Net.state({ m: mapId, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), f: p.facing, a, hp: Math.round(p.hp), dead: p.dead, q: C.label().slice(0, 40), hat: Q.hat || '' });
  }
  const CHARGE = 0.7;
  function updatePlayer(dt, free) {
    const p = player;
    if (p.shieldT > 0){ p.shieldT -= dt; if (p.shieldT <= 0){ p.shieldT = 0; toast('💖 무적 보호막이 사라졌어요', '#d9f5ff'); } }
    p.inv = Math.max(0, p.inv - dt); p.shootCd -= dt; p.shootT -= dt; p.hurtT -= dt; p.landT -= dt; p.emoT = Math.max(0, p.emoT - dt); p.dashCd -= dt;
    if (p.dead) { p.moving = false; return; }
    if (special) { p.moving = false; return; }
    if (free && input.dashP && p.dashCd <= 0) startDash();
    let mx = free ? input.mx : 0, my = free ? input.my : 0;
    const mag = Math.hypot(mx, my); if (mag > 1) { mx /= mag; my /= mag; }
    const slow = p.charging && p.charge > 0.15 ? 0.62 : 1;
    if (p.dash) {
      p.dash.t += dt;
      p.x += p.dash.dx * 1000 * dt; p.y += p.dash.dy * 560 * dt;
      p.afterT -= dt; if (p.afterT <= 0) { p.afterT = 0.03; addAfter(p.ch, p.x, p.y, p.z, p.facing, p.walk); }
      if (p.dash.t >= 0.17) p.dash = null;
    } else { p.x += (mx * 300 * slow + p.kx) * dt; p.y += my * 190 * slow * dt; }
    p.kx *= Math.pow(0.002, dt);
    p.x = U.clamp(p.x, 40, map.w - 40); p.y = U.clamp(p.y, FT, FB);
    p.moving = mag > 0.1 || !!p.dash;
    if (p.moving) p.walk += dt * 12;
    if (Math.abs(mx) > 0.15 && !p.dash) p.facing = mx > 0 ? 1 : -1;
    if (p.moving && p.z <= 0 && !p.dash) { dustT -= dt; if (dustT <= 0) { dustT = 0.22; FX.dust(p.x - p.facing * 14, p.y, 1); } }
    if (free && input.jumpP && p.z <= 0) { p.vz = 600; Sound.play('jump'); FX.dust(p.x, p.y, 4); }
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 1650 * dt; p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; if (p.vz < -500) { FX.dust(p.x, p.y, 7); FX.ring(p.x, p.y, 40, 0.3, 'rgba(255,255,255,0.8)', 3); } p.vz = 0; p.landT = 0.14; }
    }
    if (free && input.shootP) {
      if (p.shootCd <= 0) { fire(false); p.shootCd = 0.22; }
      p.charging = true; p.charge = 0; p.chargeFull = false;
    }
    if (p.charging) {
      if (input.shoot && free) {
        p.charge += dt;
        if (p.charge > 0.2 && Math.random() < 0.5) { const a = Math.random() * TAU; FX.trail(p.x + p.facing * 34 + Math.cos(a) * 30, p.y, p.z + 60 + Math.sin(a) * 30, 'spark', p.chargeFull ? '#fff36a' : '#ffb3d9', 3.5, 0.2); }
        if (p.charge >= CHARGE && !p.chargeFull) { p.chargeFull = true; Sound.play('charge'); FX.burst(p.x + p.facing * 34, p.y, p.z + 60, 'star', 6, { speed: 120 }); }
      } else { if (p.chargeFull && free) fire(true); p.charging = false; p.charge = 0; p.chargeFull = false; }
    }
  }
  function updateFollowers(dt, paused) {
    const p = player;
    for (const f of followers) {
      const tx = p.x - p.facing * (78 + f.slot * 66), ty = U.clamp(p.y + (f.slot ? 34 : -26), FT, FB);
      const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
      f.moving = d > 14;
      if (f.moving) { const sp = Math.min(d * 3, 330); f.x += dx / d * sp * dt; f.y += dy / d * sp * dt * 0.8; f.walk += dt * 10; if (Math.abs(dx) > 6) f.facing = dx > 0 ? 1 : -1; }
      if (f.z > 0 || f.vz > 0) { f.vz -= 1500 * dt; f.z = Math.max(0, f.z + f.vz * dt); if (f.z === 0) f.vz = 0; }
      else if (p.z > 120 && Math.random() < 0.02) f.vz = 420;
      f.throwT = Math.max(0, f.throwT - dt);
      if (paused || busy() || p.dead) continue;
      f.cd -= dt;
      if (f.cd > 0) continue;
      let best = null, bd = 520;
      for (const m of mons.values()) { if (!alive(m) || m.st === 'wait' || m.st === 'spawn') continue; const dd = Math.abs(m.rx - f.x) + Math.abs(m.ry - f.y) * 1.5; if (dd < bd) { bd = dd; best = m; } }
      if (!best) { f.cd = 0.5; continue; }
      f.cd = 1.6; f.throwT = 0.3; f.facing = best.rx > f.x ? 1 : -1;
      shots.push({ owner: 'f', k: f.key === 'princess' ? 'pillow' : 'ruler', big: false, x: f.x + f.facing * 20, y: f.y, z: 50, vx: f.facing * 540, dmg: 8, life: 1.2, pierce: 1, hits: new Set(), t: 0, tid: { id: best.id, isMon: true } });
      Sound.play('click');
    }
  }
  function updateTransform(dt) {
    const fx = transformFx;
    fx.t += dt;
    if (!fx.played) { fx.played = true; Sound.play('transform'); zoomTarget = 1.15; camCenter = fx.x - 40; }
    if (fx.t > 1.2 && fx.t < 2.8 && Math.random() < 0.7) FX.burst(fx.x + U.rand(-60, 60), fx.y, U.rand(40, 200), 'star', 1, { speed: 60, col: pick(['#fff36a', '#ffd1e6', '#ffffff']) });
    if (fx.t >= 2.6 && !fx.popped) { fx.popped = true; Sound.play('yay'); FX.burst(fx.x, fx.y, 90, 'heart', 36, { speed: 260 }); FX.shock(fx.x, fx.y, 90, 300, 0.6, '#ffffff', 10); FX.flash('#ffffff', 0.7, 0.5); }
    if (fx.t >= 3.6) { const cb = fx.cb; transformFx = null; kongShown = { x: fx.x, y: fx.y }; zoomTarget = 1; if (cb) cb(); }
  }

  // ---------------- 대화·질문 ----------------
  function actOf(e) {
    if (e.hidden && e.hidden()) return null;
    if (e.kind === 'npc') return e.talk ? { label: val(e.label) || '대화', fn: e.talk } : null;
    if (e.kind === 'portal') return { label: e.locked && e.locked() ? '잠김' : '이동', fn: () => usePortal(e) };
    if (e.kind === 'star' || e.sub === 'pad' || e.sub === 'break') return null;
    return (typeof e.act === 'function' ? e.act.call(e) : e.act) || null;
  }
  function findFocus() {
    let best = null, bd = 1e9;
    if (!busy() && !player.dead) for (const e of ents) {
      const a = actOf(e); if (!a) continue;
      const dx = Math.abs(player.x - e.x), dy = Math.abs(player.y - e.y);
      const rx = e.kind === 'prop' ? 100 : e.kind === 'portal' ? 80 : 86;
      if (dx < rx && dy < 64) { const d = dx + dy * 1.5; if (d < bd) { bd = d; best = e; } }
    }
    focus = best;
  }
  const actBtn = $('bAct'), actLabel = $('bActLabel'), spBtn = $('bSpecial'), dashBtn = $('bDash');
  let lastLabel = '', lastG = -1, lastDash = null;
  function updateButtons() {
    const a = focus && actOf(focus);
    const label = dialog ? '다음' : a ? a.label : '대화';
    if (label !== lastLabel) { actLabel.textContent = label; lastLabel = label; }
    actBtn.classList.toggle('ready', !!a || !!dialog);
    const g = Math.floor(love);
    if (g !== lastG && spBtn) { lastG = g; spBtn.style.setProperty('--g', g); spBtn.classList.toggle('ready', g >= 100); }
    const dc = player.dashCd > 0;
    if (dc !== lastDash && dashBtn) { lastDash = dc; dashBtn.classList.toggle('cool', dc); }
  }
  // 처음 하는 학생은 대사 건너뛰기 없이(마지막 악마둥이까지 한 번 깨면 생김 — back.js PLAZA_CAN_SKIP, 2026-11-24 선생님)
  function canSkip() { try { return !window.PLAZA_CAN_SKIP || window.PLAZA_CAN_SKIP(); } catch (e) { return true; } }
  function skipDialog() {
    const d = dialog; if (!d) return;
    dialog = null; if (!locked) padEl.classList.remove('talking'); actCool = 0.35; Sound.play('click');
    if (d.onEnd) d.onEnd();
  }
  function updateDialog(dt) {
    const d = dialog, line = d.lines[d.i];
    if (input.skipP && canSkip()) { skipDialog(); input.actP = false; return; }
    if (d.skipRect) for (const tp of input.taps) { const r = d.skipRect; if (tp.x >= r.x && tp.x <= r.x + r.w && tp.y >= r.y - 6 && tp.y <= r.y + r.h + 6) { skipDialog(); input.actP = false; return; } }
    const prev = Math.floor(d.shown);
    d.shown = Math.min(line.text.length, d.shown + dt * (input.act ? 120 : 55));
    if (Math.floor(d.shown) !== prev && Math.floor(d.shown) % 3 === 0) Sound.play('blip');
    if (input.actP) {
      if (d.shown < line.text.length) d.shown = line.text.length;
      else {
        d.i++; d.shown = 0; d.wrapped = null;
        if (d.i >= d.lines.length) {
          dialog = null; if (!locked) padEl.classList.remove('talking'); actCool = 0.35;
          if (d.onEnd) d.onEnd();
        }
      }
      input.actP = false;
    }
  }
  function updateAsk(dt) {
    const a = askBox; a.t += dt;
    if (input.leftP || input.upP) { a.cursor = (a.cursor + a.opts.length - 1) % a.opts.length; Sound.play('tick'); }
    if (input.rightP || input.downP) { a.cursor = (a.cursor + 1) % a.opts.length; Sound.play('tick'); }
    let pick2 = null;
    for (const tp of input.taps) for (const b of a.btns) if (tp.x >= b.x && tp.x <= b.x + b.w && tp.y >= b.y && tp.y <= b.y + b.h) pick2 = b.i;
    if (input.digit >= 1 && input.digit <= a.opts.length) pick2 = input.digit - 1;
    if (pick2 == null && a.t > 0.25 && (input.actP || input.shootP)) pick2 = a.cursor;
    if (pick2 != null) {
      askBox = null; Sound.play('click'); document.body.classList.remove('mini'); actCool = 0.35;
      input.actP = false; input.shootP = false;
      a.cb(pick2);
    }
  }

  // ---------------- 그리기 ----------------
  const PARADE = ['sarang', 'princess', 'prince', 'kong', 'sparkle', 'grandma', 'villager1', 'villager4'];
  function render() {
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);   // 자동 화질로 캔버스 크기가 바뀌어도 같은 그림
    ctx.imageSmoothingEnabled = true;
    if (Mini.active) { Mini.draw(ctx, W, H); return; }
    if (!scene) { ctx.fillStyle = '#2a1a40'; ctx.fillRect(0, 0, W, H); return; }
    const shx = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0, shy = shake > 0 ? (Math.random() - 0.5) * shake * 0.35 : 0;   // 흔들림은 살짝만(어지럽지 않게)
    ctx.save();
    if (zoom !== 1) { ctx.translate(W / 2, H * 0.62); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H * 0.62); }
    ctx.translate(shx, shy);
    scene.back(ctx, camX, t, W);
    if (state !== 'play') {
      PARADE.forEach((key, i) => {
        const ch = Art.CH[key]; if (!ch) return;
        const x = ((t * 70 + i * 150) % (W + 300)) - 150, y = 528 + (i % 2) * 8, sc = ch.kind === 'ruler' ? 0.42 : 0.62;
        Art.shadow(ctx, x, y, ch.w * sc * 1.2, 0);
        Art.drawChar(ctx, ch, x, y - Math.abs(Math.sin(t * 6 + i)) * 8, { t, facing: 1, scale: sc, moving: true, walk: t * 11 + i, holding: !!ch.hold, expr: 'joy', pose: i % 3 === 0 ? 'cheer' : null });
      });
      if (Math.random() < 0.15) FX.burst(camX + Math.random() * W, 360 + Math.random() * 120, 0, Math.random() < 0.5 ? 'heart' : 'star', 1, { speed: 40, up: 120, g: 40, life: 2.2 });
      FX.draw(ctx, camX, dscale, W);
      scene.front(ctx, camX, t, W); if (scene.post) scene.post(ctx, t, W, H); ctx.restore(); return;
    }
    drawFloorFx();
    FX.drawFloor(ctx, camX);
    const list = [];
    for (const e of ents) if (!(e.hidden && e.hidden()) && !(e.kind === 'star' && e.got)) list.push({ y: e.y, o: e, k: e.kind });
    for (const m of mons.values()) if (m.st !== 'dead' && !hideMon(m)) list.push({ y: m.ry, o: m, k: 'mon' });
    for (const g of ghosts) list.push({ y: g.y, o: g, k: 'ghost' });
    for (const r of remote.values()) list.push({ y: r.ry, o: r, k: 'remote' });
    for (const f of followers) list.push({ y: f.y, o: f, k: 'follower' });
    list.push({ y: player.y + 0.1, o: player, k: 'player' });
    for (const s of shots) list.push({ y: s.y + 1, o: s, k: 'shot' });
    for (const b of eshots) list.push({ y: b.y + 1, o: b, k: 'eshot' });
    for (const p of pickups) list.push({ y: p.y + 2, o: p, k: 'pickup' });
    if (transformFx) list.push({ y: transformFx.y, o: transformFx, k: 'transform' });
    const refl = map.theme === 'mirrorHall' ? 0.26 : map.theme === 'throne' ? 0.16 : map.theme === 'pillowCastle' ? 0.12 : 0;
    if (refl) drawReflections(list, refl);
    for (const it of list) {
      const o = it.o, sx = (o.rx != null ? o.rx : o.x) - camX; if (sx < -140 || sx > W + 140) continue;
      if (it.k === 'prop' || it.k === 'portal' || it.k === 'ghost' || it.k === 'transform') continue;
      const y = o.ry != null ? o.ry : o.y, s = dscale(y);
      let z = o.rz != null ? o.rz : (o.z || 0), w = 88;
      if (it.k === 'mon') w = SIM.MON[o.type].r * 2.3; else if (it.k === 'shot' || it.k === 'eshot') w = 22; else if (it.k === 'pickup') w = 24; else if (it.k === 'star') { w = 22; }
      else if (it.k === 'npc' && o.ch) w = Math.max(50, o.ch.w * 0.85);
      Art.shadow(ctx, sx, y, w * s, z);
    }
    list.sort((a, b) => a.y - b.y);
    for (const it of list) drawItem(it);
    FX.draw(ctx, camX, dscale, W);
    scene.front(ctx, camX, t, W);
    ctx.restore();
    if (scene.post) scene.post(ctx, t, W, H);
    FX.drawScreen(ctx, W, H);
    drawGuide();
    if (!intro && !(outro && outro.t >= 1.4)) drawHUD();
    if (intro) drawIntro();
    if (outro && outro.t >= 1.4) drawOutro();
    if (player.dead) drawDead();
    if (dialog) drawDialog();
    if (askBox) drawAsk();
    if (banner) drawBanner();
    if (mapLabel && !banner && !intro) drawMapLabel();
    drawToasts();
    if (fade.a > 0) { ctx.fillStyle = `rgba(30,16,50,${fade.a})`; ctx.fillRect(0, 0, W, H); }
  }
  function hideMon(m) {
    if (m.type !== 'devil') return false;
    return !!transformFx || (m.st === 'down' && (C.at('done') || !!kongShown));
  }
  function drawReflections(list, a) {
    ctx.save(); ctx.beginPath(); ctx.rect(-60, FT - 18, W + 120, H); ctx.clip();
    for (const it of list) {
      if (!(it.k === 'player' || it.k === 'follower' || it.k === 'remote' || it.k === 'npc' || it.k === 'mon')) continue;
      const o = it.o, x = o.rx != null ? o.rx : o.x, y = o.ry != null ? o.ry : o.y, sx = x - camX; if (sx < -200 || sx > W + 200) continue;
      if (it.k === 'npc' && o.hidden && o.hidden()) continue;
      const s = dscale(y);
      ctx.save(); ctx.globalAlpha = a; ctx.transform(1, 0, 0, -0.5, 0, y * 1.5 + 4);
      if (it.k === 'mon') Art2.mon(ctx, { type: o.type, st: o.st, f: o.f, z: o.rz, ph: o.ph, happy: o.st === 'down' }, sx, y, s, t);
      else {
        const ch = it.k === 'player' ? o.ch : it.k === 'remote' ? Art.hero((roster.get(o.id) || {}).color || 'red', (roster.get(o.id) || {}).hat) : o.ch;
        const z = it.k === 'remote' ? o.rz : (o.z || 0);
        Art.drawChar(ctx, ch, sx, y - z * s, { t, facing: o.facing || o.f || 1, scale: s * (it.k === 'follower' ? 0.9 : 1), moving: !!o.moving, walk: o.walk || 0, erased: o.erased ? o.erased() : 0, holding: !!(ch && ch.hold) });
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawFloorFx() {
    for (const h of hazards) {
      const sx = (h.x != null ? h.x : 0) - camX;
      if (h.k === 'circle' && (sx < -100 || sx > W + 100)) continue;
      if (!h.fired) {
        const k = U.clamp(h.t / h.warn, 0, 1);
        Art2.hazard(ctx, h, sx, h.y, k, t);
        if (h.k === 'circle' && h.dmg && k > 0.55) { ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(t * 30) * 0.3; ctx.fillStyle = '#fff'; ctx.font = F(22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', sx, h.y - 4); ctx.restore(); }
      } else Art2.hazardBlast(ctx, h, sx, h.y, U.clamp(1 - (h.t - h.warn) / 0.4, 0, 1));
    }
    for (const r of rings) {
      const sx = r.x - camX;
      if (r.t < r.warn) {
        const k = r.t / r.warn; ctx.save(); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 20); ctx.strokeStyle = '#ff7ab8'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.ellipse(sx, r.y, 60 + k * 40, (60 + k * 40) * 0.42, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1; ctx.font = F(18); ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a1a4a'; ctx.strokeText('점프로 피해요!', sx, r.y - 60); ctx.fillStyle = '#ffe680'; ctx.fillText('점프로 피해요!', sx, r.y - 60); ctx.restore();
        continue;
      }
      Art2.ring(ctx, sx, r.y, r.r, r.r / r.maxR);
    }
  }
  function drawItem(it) {
    const o = it.o;
    const x = o.rx != null ? o.rx : o.x, y = o.ry != null ? o.ry : o.y;
    const sx = x - camX; if (sx < -280 || sx > W + 280) return;
    const s = dscale(y);
    switch (it.k) {
      case 'npc': drawNpc(o, sx, y - (o.z || 0) * s, s); break;
      case 'prop': {
        o.draw(ctx, sx, y, s, o);
        if (o === focus) drawPrompt(sx, y - (o.promptH || 150) * s, actOf(o).label);
        break;
      }
      case 'star': Art2.starItem(ctx, sx, y - o.z * s, 1, t, o.ph); break;
      case 'portal': {
        const lk = o.locked && o.locked();
        Art2.portal(ctx, sx, y, t, 1, lk);
        if (!lk && Math.random() < 0.15) FX.burst(x + U.rand(-30, 30), y, U.rand(20, 120), 'spark', 1, { speed: 20, up: 40, g: -30, life: 0.8, col: '#bff3ff' });
        const nm = SIM.MAPS[o.to] ? SIM.MAPS[o.to].name : '';
        ctx.font = F(15); const tw = ctx.measureText(nm).width + 20;
        Art.roundRect(ctx, sx - tw / 2, y - 168, tw, 26, 13); ctx.fillStyle = lk ? 'rgba(80,40,70,0.75)' : 'rgba(30,60,110,0.75)'; ctx.fill();
        ctx.fillStyle = lk ? '#ffd1e0' : '#e8f6ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, sx, y - 154);
        if (o === focus) drawPrompt(sx, y - 178, actOf(o).label);
        break;
      }
      case 'mon': drawMon(o, sx, y, s); break;
      case 'ghost': {
        const k = o.t / 1.4;
        ctx.save(); ctx.globalAlpha = 1 - k;
        ctx.translate(sx, y); ctx.scale(1 + k * 0.3, 1 + k * 0.3); ctx.translate(-sx, -y);
        Art2.mon(ctx, { type: o.type, st: 'idle', f: o.f, z: (o.z || 0) + k * 140, happy: true, ph: o.ph }, sx, y, s, t);
        ctx.restore();
        break;
      }
      case 'remote': {
        const info = roster.get(o.id) || { name: '친구', color: 'red', hat: '' };
        ctx.save(); if (o.dead) ctx.globalAlpha = 0.4;
        const top = Art.drawChar(ctx, Art.hero(info.color, info.hat), sx, y - o.rz * s, { t, facing: o.f, scale: s, moving: !!(o.a & 1) && o.rz <= 0, walk: o.walk, air: o.rz > 0, shoot: o.a & 2 ? 1 : 0,
          expr: o.dead ? 'sleep' : o.a & 4 ? 'hurt' : 'happy', charge: o.a & 8 ? 1 : 0 }).top;
        ctx.restore();
        nameTag(sx, top - 14, info.name, '#fff');
        if (o.a & 16) drawDots(sx + 34, top - 10);
        if (o.emoT > 0 || o.a & 32) drawEmo(sx, top - 40);
        break;
      }
      case 'follower': {
        const bm = bossMon();
        const cheer = (bm && alive(bm) && bm.st !== 'wait') || (mapId === 'heart' && C.is('done'));
        Art.drawChar(ctx, o.ch, sx, y - o.z * s, { t, facing: o.facing, scale: s * 0.9, moving: o.moving, walk: o.walk, air: o.z > 0, pose: o.throwT > 0 ? 'point' : cheer ? 'cheer' : null, expr: cheer ? 'determined' : 'happy', erased: 0 });
        break;
      }
      case 'player': drawPlayer(sx, y, s); break;
      case 'shot': {
        const sy = y - o.z * s;
        if (o.k === 'love') { Art.glowFast(ctx, sx, sy, o.big ? 70 : 24, o.big ? [255, 230, 140] : [255, 140, 190], o.big ? 0.7 : 0.6); ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 20 + o.x * 0.05) * 0.2); Art2.loveShot(ctx, 0, 0, o.big ? 34 : 11.5, t, o.big); ctx.restore(); }
        else Art2.proj(ctx, { k: o.k, vx: o.vx, vy: 0 }, sx, sy, t);
        break;
      }
      case 'eshot': Art2.proj(ctx, o, sx, y - o.z * s, t); break;
      case 'pickup': if (o.kind === 'star') Art2.starItem(ctx, sx, y - o.z * s - 8, 0.85, t, o.x * 0.01); else Art2.item(ctx, o.kind, sx, y - o.z * s - 8, 1, t, o.label); break;
      case 'transform': drawTransform(o, sx, y, s); break;
    }
  }
  function drawPlayer(sx, y, s) {
    const p = player, sy = y - p.z * s;
    if (p.charging && p.charge > 0.15) {
      const k = Math.min(1, p.charge / CHARGE);
      Art.glowFast(ctx, sx + p.facing * 34 * s, sy - 60 * s, (26 + k * 34) * s, p.chargeFull ? [255, 230, 120] : [255, 150, 200], 0.5 + k * 0.45);
      ctx.save(); ctx.strokeStyle = p.chargeFull ? '#fff36a' : '#ffb3d9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx, sy - 60 * s, 52 * s, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.restore();
      if (p.chargeFull) { ctx.save(); ctx.font = F(16); ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a1a4a'; ctx.strokeText('떼면 큰 하트!', sx, sy - 128 * s); ctx.fillStyle = '#fff36a'; ctx.fillText('떼면 큰 하트!', sx, sy - 128 * s); ctx.restore(); }
    }
    if (special) { const k = Math.min(1, special.t / 0.55); Art.glowFast(ctx, sx, sy - 55 * s, 90 + k * 80, [255, 150, 210], 0.7); }
    if (love >= 100 && !special) Art.glowFast(ctx, sx, sy - 55 * s, 70 + Math.sin(t * 6) * 8, [255, 220, 120], 0.35);
    if (p.shieldT > 0) Art.glowFast(ctx, sx, sy - 55 * s, 95 + Math.sin(t * 9) * 10, [255, 140, 200], 0.4 * Math.min(1, p.shieldT));   // 퀴즈 무적 보호막(분홍 빛)
    ctx.save();
    if (p.dead) ctx.globalAlpha = 0.6;
    else if (p.inv > 0 && !p.dash && !special && Math.floor(p.inv * 12) % 2 === 0 && p.hurtT <= 0) ctx.globalAlpha = 0.45;
    const sq = p.landT > 0 ? 0.7 : p.vz > 200 ? -0.5 : 0;
    const r = Art.drawChar(ctx, p.ch, sx, sy, { t, facing: p.facing, scale: s, moving: p.moving && p.z <= 0, walk: p.walk, air: p.z > 0, shoot: p.shootT > 0 ? 1 : 0,
      charge: p.charging && p.charge > 0.15 ? 1 : 0, squash: sq, tilt: p.dead ? -1.2 : p.dash ? p.dash.dx * 0.25 : 0, pose: special ? 'cheer' : null,
      expr: p.dead ? 'sleep' : p.hurtT > 0 ? 'hurt' : special ? 'joy' : p.chargeFull ? 'determined' : p.shootT > 0 ? 'joy' : 'happy' });
    ctx.restore();
    if (mode === 'multi') nameTag(sx, r.top - 14, myName, '#fff36a');
    if (p.emoT > 0) drawEmo(sx, r.top - 40);
  }
  function drawMon(m, sx, y, s) {
    const d = SIM.MON[m.type];
    if (m.st === 'down') {
      ctx.save(); ctx.globalAlpha = 0.92;
      Art2.mon(ctx, { type: m.type, st: 'down', f: m.f, z: m.rz, happy: true, ph: m.ph }, sx, y, s, t);
      ctx.restore();
      if (m.type === 'snoreKing') drawZzz(sx + 50 * s, y - 220 * s);
      else if (Math.random() < 0.1) FX.burst(m.rx + U.rand(-40, 40), m.ry, U.rand(40, 160), 'spark', 1, { col: '#fff36a', g: 0, up: 20 });
      return;
    }
    ctx.save();
    let k = 1;
    if (m.st === 'spawn') { k = U.clamp((t - m.spawnAt) / 0.5, 0.05, 1); k = U.easeOutBack(k); }
    const sq = m.sq || 0;
    ctx.translate(sx, y); ctx.scale(k * (1 + sq * 0.16), k * (1 - sq * 0.14)); ctx.translate(-sx, -y);
    if (m.wave) Art.glowFast(ctx, sx, y - ((MONH[m.type] || 90) * 0.4 + m.rz) * s, 50 * s, [255, 120, 90], 0.35);
    Art2.mon(ctx, { type: m.type, st: m.st, f: m.f, z: m.rz, flash: m.flash / 0.18, ph: m.ph, happy: false }, sx, y, s, t);
    ctx.restore();
    const top = y - ((MONH[m.type] || 90) + m.rz) * s;
    if (d.ai === 'boss') {
      if (m.st === 'wait') drawMark(sx, top - 10, '!');
      if (m.st === 'hurt') {
        for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; ctx.fillStyle = '#ffe14a'; Art.starPath(ctx, sx + Math.cos(a) * 56 * s, top + 16 + Math.sin(a) * 14, 10, 4); ctx.fill(); }
        ctx.save(); ctx.font = F(22); ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#3a1a4a'; const yy = top - 22 + Math.sin(t * 8) * 4; ctx.strokeText('빈틈! 지금이야!', sx, yy); ctx.fillStyle = '#fff36a'; ctx.fillText('빈틈! 지금이야!', sx, yy); ctx.restore();
      }
      if (bossSay && m.st !== 'hurt') Art2.speech(ctx, sx, top - 24, bossSay.text, Math.min(1, (bossSay.life - bossSay.t) * 2, bossSay.t * 4));
      return;
    }
    if (m.st === 'aim' || m.st === 'curl' || m.st === 'fade') { ctx.save(); ctx.font = F(24); ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; const yy = top - 14 + Math.sin(t * 20) * 2; ctx.strokeText('!', sx, yy); ctx.fillStyle = '#ff3d6f'; ctx.fillText('!', sx, yy); ctx.restore(); }
    if (m.type === 'gold') { ctx.save(); ctx.font = F(15); ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#6a4a00'; ctx.strokeText('황금 투덜이', sx, top - 6); ctx.fillStyle = '#ffe680'; ctx.fillText('황금 투덜이', sx, top - 6); ctx.restore(); }
    if (m.hp < m.max) {
      const w = Math.max(44, d.r * 1.7) * s, x0 = sx - w / 2, y0 = top - (m.type === 'gold' ? 24 : 10);
      ctx.fillStyle = 'rgba(40,20,50,0.65)'; Art.roundRect(ctx, x0, y0, w, 8, 4); ctx.fill();
      ctx.fillStyle = m.type === 'gold' ? '#ffd23f' : '#ff7aa8'; Art.roundRect(ctx, x0 + 1, y0 + 1, Math.max(0, (w - 2) * (m.hp / m.max)), 6, 3); ctx.fill();
    }
  }
  function drawNpc(e, sx, sy, s) {
    const o = { t, facing: e.facing, scale: s, holding: !!e.ch.hold, expr: val(e.expr) || 'happy', pose: e.pose };
    const grumpy = e.grumpy && e.grumpy();
    if (grumpy) { Art2.grumpAura(ctx, sx, sy - 50 * s, 74 * s, t); o.expr = 'grumpy'; if (Math.random() < 0.06) FX.burst(e.x + U.rand(-20, 20), e.y, 90, 'spark', 1, { col: '#c98bff', up: 60, g: -20, speed: 20 }); }
    const sleeping = e.sleeping && e.sleeping();
    let yy = sy;
    if (sleeping) { o.expr = 'sleep'; o.pose = 'sleep'; o.tilt = -0.3; o.sit = true; yy = sy - 16 * s; }
    if (e.float) o.float = true;
    if (e.erased) o.erased = e.erased();
    if (e.hitT > 0) o.tilt = (o.tilt || 0) + Math.sin(e.hitT * 30) * 0.1;
    const r = Art.drawChar(ctx, e.ch, sx, yy, o);
    if (sleeping) drawZzz(sx + 30 * s, r.top + 6);
    if (e.bubble && e.bubble()) {
      ctx.save(); const cy = r.top + r.Hd * 0.55, ry = r.Hd * 0.62 + 18, rx = Math.max(64, r.Wd * 1.1) * s;
      const g = ctx.createRadialGradient(sx - rx * 0.3, cy - ry * 0.4, 4, sx, cy, ry); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(160,90,220,0.3)');
      ctx.beginPath(); ctx.ellipse(sx, cy, rx, ry, 0, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,150,255,0.85)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(sx - rx * 0.45, cy - ry * 0.5, rx * 0.16, ry * 0.08, -0.6, 0, TAU); ctx.fill(); ctx.restore();
    }
    const nm = val(e.name) || (WHO[e.key === 'villager5' ? 'v5' : e.key && e.key.startsWith('villager') ? 'v' + e.key.slice(-1) : e.key] || [])[1] || e.ch.name;
    if (nm) nameTag(sx, sy + 22, nm, grumpy ? '#e0b8ff' : '#fff', true);
    const m = e.mark && e.mark();
    if (m) drawMark(sx, r.top - 28, m);
    if (e === focus) drawPrompt(sx, r.top - (m ? 58 : 14), actOf(e).label);
    if (e.say) Art2.speech(ctx, sx, r.top - (m ? 54 : 12), e.say.text, Math.min(1, e.say.t * 4, (e.say.life - e.say.t) * 3));
  }
  function drawTransform(fx, sx, y, s) {
    const k = fx.t;
    const hornPop = U.clamp(k / 1.2, 0, 1), forkFade = U.clamp((k - 0.6) / 1.2, 0, 1), overlayA = U.clamp((k - 1.2) / 1.2, 0, 1);
    Art.glowFast(ctx, sx, y - 90 * s, 170 * s, [255, 200, 230], 0.3 + overlayA * 0.55);
    if (k < 2.6) {
      const jig = k > 1.2 ? Math.sin(t * 40) * 3 : 0;
      Art.drawChar(ctx, Art.CH.devil, sx + jig, y - 10 * s, { t, scale: s * U.lerp(1.5, 0.85, overlayA), facing: -1, expr: k > 1.2 ? 'surprised' : 'sad', hornPop, forkFade, overlayImg: 'heart_blank_red', overlayA, holding: true, noTail: hornPop > 0.5 });
    } else Art.drawChar(ctx, Art.CH.kong, sx, y - Math.abs(Math.sin((k - 2.6) * 6)) * 20, { t, scale: s, facing: -1, expr: 'joy', pose: 'cheer' });
  }
  function nameTag(x, y, text, col, small) {
    ctx.save(); ctx.font = F(small ? 13 : 15);
    const w = ctx.measureText(text).width + 14, h = small ? 20 : 22;
    Art.roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(30,14,50,0.62)'; ctx.fill();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
    ctx.restore();
  }
  function drawDots(x, y) { ctx.save(); ctx.fillStyle = '#fff'; Art.roundRect(ctx, x - 16, y - 10, 32, 20, 10); ctx.fill(); ctx.fillStyle = '#5a2a6a'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * ((Math.floor(t * 3) % 3) === i ? 1 : 0); ctx.beginPath(); ctx.arc(x - 8 + i * 8, y, 2.6, 0, TAU); ctx.fill(); } ctx.restore(); }
  function drawEmo(x, y) { const b = Math.abs(Math.sin(t * 5)) * 6; Art.glowFast(ctx, x, y - b, 30, [255, 140, 190], 0.6); Art.heartPath(ctx, x, y - b, 14); ctx.fillStyle = '#ff4f8a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  function drawZzz(x, y) {
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5b44a8'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.45 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI); ctx.font = F(14 + k * 16);
      ctx.strokeText('Z', x + k * 34, y - k * 50); ctx.fillText('Z', x + k * 34, y - k * 50);
    }
    ctx.restore();
  }
  function drawMark(x, y, m) {
    const b = Math.abs(Math.sin(t * 4)) * 6;
    ctx.save(); ctx.translate(x, y - b);
    Art.glowFast(ctx, 0, 0, 30, m === '?' ? [150, 220, 255] : [255, 230, 120], 0.6);
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU);
    const g = ctx.createLinearGradient(0, -16, 0, 16);
    if (m === '?') { g.addColorStop(0, '#bff3ff'); g.addColorStop(1, '#4ab8ff'); } else { g.addColorStop(0, '#fff27a'); g.addColorStop(1, '#ffb31a'); }
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = m === '?' ? '#1d5aa8' : '#7a4a00'; ctx.stroke();
    ctx.fillStyle = m === '?' ? '#1d3a7a' : '#7a4a00'; ctx.font = F(22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(m, 0, 1);
    ctx.restore();
  }
  function drawPrompt(x, y, label) {
    const txt = touchUI ? label : `E  ${label}`;
    ctx.save(); ctx.font = F(17);
    const w = ctx.measureText(txt).width + 28, h = 32, bob = Math.sin(t * 5) * 3;
    Art.roundRect(ctx, x - w / 2, y - h + bob, w, h, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ff5f9e'; ctx.stroke();
    ctx.fillStyle = '#5a2a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y - h / 2 + bob + 1);
    ctx.restore();
  }

  // ---- HUD ----
  function panel(x, y, w, h, r = 14) {
    Art.roundRect(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(60,32,92,0.82)'); g.addColorStop(1, 'rgba(34,18,58,0.82)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.78)'; ctx.stroke();
  }
  function bar(x, y, w, h, k, c1, c2, glow) {
    Art.roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(15,6,28,0.8)'; ctx.fill();
    if (k > 0) {
      Art.roundRect(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * k), h - 4, (h - 4) / 2);
      const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; Art.roundRect(ctx, x + 4, y + 3, Math.max(0, (w - 8) * k), (h - 4) * 0.35, 2); ctx.fill();
      if (glow) { Art.glowFast(ctx, x + 2 + (w - 4) * k, y + h / 2, 18, [255, 240, 160], 0.8); }
    }
  }
  const REGION_NAME = ['하트 마을', '꿈나라', '학용품 나라', '심술 나라'];
  function drawHUD() {
    const mw = 262;
    panel(10, 10, mw, 106);
    ctx.font = F(15); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe680'; const rn = REGION_NAME[map.region] + ' ·'; ctx.fillText(rn, 22, 27);
    ctx.fillStyle = '#fff'; ctx.font = F(17); ctx.fillText(map.name, 22 + ctx.measureText(rn).width + 8, 27);
    for (let i = 0; i < 3; i++) { const on = i < Q.shards; Art.heartPath(ctx, mw - 46 + i * 17, 27, 7); ctx.fillStyle = on ? '#ff5f9e' : 'rgba(255,255,255,0.18)'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.stroke(); }
    // 미니맵
    const bx = 22, by = 39, bw = mw - 24, bh = 16;
    Art.roundRect(ctx, bx, by, bw, bh, 8); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
    const mx = (x) => bx + 6 + (x / map.w) * (bw - 12), my = (y) => by + 3 + ((y - FT) / (FB - FT)) * (bh - 6);
    const vx0 = mx(camX), vx1 = mx(Math.min(map.w, camX + W));
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; Art.roundRect(ctx, vx0, by + 1, vx1 - vx0, bh - 2, 6); ctx.stroke();
    const dot = (x, y, col, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx(x), my(y), r, 0, TAU); ctx.fill(); };
    for (const m of mons.values()) if (alive(m)) dot(m.rx, m.ry, m.type === 'gold' ? '#ffe14a' : isBoss(m) ? '#c88bff' : m.wave ? '#ff9a5c' : '#ff6b8b', isBoss(m) ? 4.5 : m.type === 'gold' ? 4 : 2.2);
    for (const e of ents) { if (e.hidden && e.hidden()) continue; if (e.kind === 'npc') dot(e.x, e.y, '#7dffb0', 3); else if (e.kind === 'portal') dot(e.x, e.y, e.locked && e.locked() ? '#c08a9a' : '#7fd4ff', 3.5); }
    for (const r of remote.values()) dot(r.rx, r.ry, '#ffffff', 2.6);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 1.5;
    Art.starPath(ctx, mx(player.x), my(player.y), 5.5, 2.4); ctx.fill(); ctx.stroke();
    // 체력
    const hx = 22, hy = 63, hw = 176;
    Art.heartPath(ctx, hx + 7, hy + 8, 9); ctx.fillStyle = '#ff4f8a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    const hk = U.clamp(hpShow / player.max, 0, 1);
    bar(hx + 22, hy, hw, 16, hk, hk < 0.3 ? '#ff9a5c' : '#ff9cc8', hk < 0.3 ? '#ff3d3d' : '#ff2d6f');
    ctx.font = F(13); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(90,10,50,0.75)'; ctx.strokeText(`${Math.ceil(player.hp)}/${player.max}`, hx + 22 + hw / 2, hy + 9);
    ctx.fillStyle = '#fff'; ctx.fillText(`${Math.ceil(player.hp)}/${player.max}`, hx + 22 + hw / 2, hy + 9);
    // 사랑 게이지
    const ly = hy + 24, full = love >= 100;
    Art.starPath(ctx, hx + 7, ly + 7, 9, 4); ctx.fillStyle = full ? '#fff36a' : '#ffd23f'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
    const lk = U.clamp(loveShow / 100, 0, 1);
    if (full) bar(hx + 22, ly, hw, 14, 1, `hsl(${(t * 120) % 360},90%,70%)`, `hsl(${(t * 120 + 120) % 360},90%,65%)`, true);
    else bar(hx + 22, ly, hw, 14, lk, '#ffe680', '#ff9a3c', lk > 0);
    {
      const txt = full ? (touchUI ? '사랑 폭발 준비! 필살 버튼' : '사랑 폭발 준비! F 키') : `사랑 게이지 ${Math.floor(love)}%`;
      const tx = hx + 22 + hw / 2, ty = ly + 8, sc = full ? 1 + 0.06 * Math.sin(t * 8) : 1;
      ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc);
      ctx.font = F(12); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3.2; ctx.strokeStyle = full ? 'rgba(80,20,90,0.9)' : 'rgba(110,50,0,0.8)'; ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = full ? '#fff9c4' : '#fff'; ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
    if (mode === 'multi') {
      const n = roster.size;
      const st = netStatus === 'on' ? `방 ${Net.code} · 함께 ${n}명` : netStatus === 'retry' ? '다시 연결하는 중…' : '연결하는 중…';
      ctx.font = F(14); const w = ctx.measureText(st).width + 30;
      panel(10, 122, w, 26, 13);
      ctx.fillStyle = netStatus === 'on' ? '#7dffb0' : '#ffb3c8'; ctx.beginPath(); ctx.arc(24, 135, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(st, 34, 136);
    }
    // 퀘스트
    const ql = C.lines();
    let qw = 0; ql.forEach((l, i) => { ctx.font = F(i === 0 ? 17 : 14); qw = Math.max(qw, ctx.measureText(l).width); });
    qw = Math.min(W - mw - 86, qw + 32);
    const qx = W - qw - 10, qy = 10, qh = 32 + ql.length * 22;
    panel(qx, qy, qw, qh);
    if (questPulse > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, questPulse) * (0.5 + 0.5 * Math.sin(t * 14)); Art.roundRect(ctx, qx - 3, qy - 3, qw + 6, qh + 6, 16); ctx.lineWidth = 4; ctx.strokeStyle = '#fff36a'; ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = '#ffb3d9'; ctx.font = F(13); ctx.textAlign = 'left'; ctx.fillText('★ 퀘스트', qx + 14, qy + 16);
    ql.forEach((l, i) => { ctx.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.72)'; ctx.font = F(i === 0 ? 17 : 14); ctx.fillText(l, qx + 14, qy + 38 + i * 22, qw - 24); });
    // 콤보
    if (combo >= 2) {
      const cx = W - 70, cy = qy + qh + 52, sc = 1 + comboPop * 0.35, col = combo >= 30 ? '#ff7ad1' : combo >= 20 ? '#ffb02e' : combo >= 10 ? '#fff36a' : '#ffffff';
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate(-0.06);
      ctx.font = F(44); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 9; ctx.strokeStyle = '#3a1a4a'; ctx.strokeText(String(combo), 0, 0); ctx.fillStyle = col; ctx.fillText(String(combo), 0, 0);
      ctx.font = F(18); ctx.lineWidth = 5; ctx.strokeText('콤보!', 0, 30); ctx.fillStyle = '#fff'; ctx.fillText('콤보!', 0, 30);
      ctx.restore();
      const k = U.clamp(comboT / 2.2, 0, 1); Art.roundRect(ctx, cx - 34, cy + 46, 68, 6, 3); ctx.fillStyle = 'rgba(20,8,30,0.6)'; ctx.fill(); Art.roundRect(ctx, cx - 34, cy + 46, 68 * k, 6, 3); ctx.fillStyle = col; ctx.fill();
    }
    // 키보드 안내
    if (!touchUI) {
      const items = [['Shift', '대시', player.dashCd > 0 ? 0.45 : 1], ['F', '사랑 폭발', love >= 100 ? 1 : 0.4]];
      let x = 14;
      ctx.font = F(14);
      for (const [key, nm, a] of items) {
        const w1 = ctx.measureText(key).width + 14, w2 = ctx.measureText(nm).width + 12;
        ctx.globalAlpha = a; Art.roundRect(ctx, x, H - 36, w1 + w2, 24, 12); ctx.fillStyle = 'rgba(30,14,50,0.7)'; ctx.fill();
        Art.roundRect(ctx, x + 2, H - 34, w1, 20, 10); ctx.fillStyle = key === 'F' && love >= 100 ? '#ffd23f' : '#fff'; ctx.fill();
        ctx.fillStyle = '#3a1a4a'; ctx.textAlign = 'center'; ctx.fillText(key, x + 2 + w1 / 2, H - 23); ctx.fillStyle = '#fff'; ctx.fillText(nm, x + w1 + w2 / 2 + 2, H - 23);
        x += w1 + w2 + 10;
      }
      ctx.globalAlpha = 1;
    }
    // 보스 체력
    const b = bossMon();
    let topY = mode === 'multi' ? 186 : 154;
    if (b && alive(b) && b.st !== 'wait') {
      const gw = Math.min(460, W - 160), gx = (W - gw) / 2 + 22, gy = topY;
      panel(gx - 62, gy - 28, gw + 76, 54, 18);
      const info = BOSS_INFO[b.type] || { ps: 0.3, py: 30 };
      ctx.save(); ctx.beginPath(); ctx.arc(gx - 30, gy - 1, 24, 0, TAU); ctx.fillStyle = '#ffe3f0'; ctx.fill(); ctx.clip();
      Art2.mon(ctx, { type: b.type, st: 'idle', f: 1, z: 0, ph: 0 }, gx - 30, gy + info.py, info.ps, t);
      ctx.restore(); ctx.beginPath(); ctx.arc(gx - 30, gy - 1, 24, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = b.st === 'hurt' ? '#fff36a' : '#ff9cc6'; ctx.stroke();
      ctx.font = F(16); ctx.textAlign = 'left'; ctx.fillStyle = '#ffd1e6';
      ctx.fillText(SIM.MON[b.type].name, gx, gy - 12);
      ctx.textAlign = 'right'; ctx.fillStyle = b.st === 'hurt' ? '#fff36a' : '#fff'; ctx.font = F(14);
      ctx.fillText(b.st === 'hurt' ? '빈틈! 피해 1.5배' : `${Math.max(0, Math.ceil(b.hp))} / ${b.max}`, gx + gw - 4, gy - 12);
      const kk = U.clamp(b.hp / b.max, 0, 1);
      bar(gx, gy - 1, gw, 16, kk, '#c88bff', '#ff4f8a');
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      for (const f of [0.66, 0.33]) { ctx.beginPath(); ctx.moveTo(gx + gw * f, gy - 1); ctx.lineTo(gx + gw * f, gy + 15); ctx.stroke(); }
      topY += 60;
    }
    if (waveInfo) {
      const left = [...mons.values()].filter((m) => m.wave && alive(m)).length;
      const txt = left ? `⚠ 습격! 남은 몬스터 ${left}마리` : '⚠ 습격!';
      ctx.font = F(18); const w = ctx.measureText(txt).width + 36, x = (W - w) / 2, y = topY - 18, p2 = (Math.sin(t * 8) + 1) / 2;
      Art.roundRect(ctx, x, y, w, 32, 16); ctx.fillStyle = `rgba(${200 + p2 * 55},${70 + p2 * 30},60,0.88)`; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, y + 17);
      if (waveInfo.t < 2.6) {
        const a = waveInfo.t < 0.3 ? waveInfo.t / 0.3 : waveInfo.t > 2.1 ? (2.6 - waveInfo.t) / 0.5 : 1;
        ctx.save(); ctx.globalAlpha = U.clamp(a, 0, 1); ctx.font = F(36); ctx.lineWidth = 8; ctx.strokeStyle = '#5a1020'; ctx.strokeText(waveInfo.text, W / 2, H * 0.42); ctx.fillStyle = '#ffd23f'; ctx.fillText(waveInfo.text, W / 2, H * 0.42); ctx.restore();
      }
    }
  }
  function drawIntro() {
    const k = intro.t, info = BOSS_INFO[intro.type] || { line: '' }, name = SIM.MON[intro.type].name;
    const a = k < 0.3 ? k / 0.3 : k > 2.0 ? Math.max(0, (2.4 - k) / 0.4) : 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,0,20,0.55)'; ctx.fillRect(0, 0, W, 70); ctx.fillRect(0, H - 70, W, 70);
    const slide = (1 - U.easeOutCubic(U.clamp(k / 0.45, 0, 1))) * W * 0.6;
    const y = H * 0.66;
    const g = ctx.createLinearGradient(0, y - 50, 0, y + 50); g.addColorStop(0, 'rgba(120,20,70,0.0)'); g.addColorStop(0.2, 'rgba(120,20,70,0.88)'); g.addColorStop(0.8, 'rgba(70,10,60,0.88)'); g.addColorStop(1, 'rgba(70,10,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 50, W, 100);
    ctx.translate(slide, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = F(16); ctx.fillStyle = '#ffb3d9'; ctx.fillText('★ BOSS ★', W / 2, y - 30);
    ctx.font = F(44); ctx.lineWidth = 8; ctx.strokeStyle = '#2a0a20'; ctx.strokeText(name, W / 2, y + 2); ctx.fillStyle = '#fff'; ctx.fillText(name, W / 2, y + 2);
    ctx.font = F(18); ctx.fillStyle = '#ffe680'; ctx.fillText(`"${info.line}"`, W / 2, y + 36);
    ctx.restore();
  }
  function drawOutro() {
    const o = outro, k = o.t - 1.4;
    const a = k < 0.2 ? k / 0.2 : o.t > 3.2 ? Math.max(0, (3.6 - o.t) / 0.4) : 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,6,40,0.35)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.38, pop = k < 0.25 ? 2.2 - 1.2 * U.easeOutBack(k / 0.25) : 1;
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.rotate(-0.08);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = F(64); ctx.lineWidth = 12; ctx.strokeStyle = '#5a1040'; ctx.strokeText('보스 클리어!', 0, 0);
    const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffb02e'); ctx.fillStyle = g; ctx.fillText('보스 클리어!', 0, 0);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    const gy = H * 0.6, gx = W / 2 - 110;
    const gc = { S: ['#fff36a', '#ff9a3c'], A: ['#ffd1e6', '#ff5f9e'], B: ['#bff3ff', '#4a8fe8'] }[o.grade];
    Art.glowFast(ctx, gx, gy, 90, o.grade === 'S' ? [255, 230, 120] : [255, 170, 210], 0.6 + Math.sin(t * 6) * 0.2);
    ctx.beginPath(); ctx.arc(gx, gy, 46, 0, TAU); const gg = ctx.createLinearGradient(0, gy - 46, 0, gy + 46); gg.addColorStop(0, gc[0]); gg.addColorStop(1, gc[1]); ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.font = F(58); ctx.fillStyle = '#3a1a4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.grade, gx, gy + 3);
    ctx.textAlign = 'left'; ctx.font = F(22); ctx.fillStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeStyle = '#3a1a4a';
    const l1 = `걸린 시간 ${o.time}초`, l2 = `맞은 횟수 ${o.hits}번`, l3 = o.grade === 'S' ? '완벽해요!' : o.grade === 'A' ? '아주 잘했어요!' : '해냈어요!';
    for (const [s2, yy] of [[l1, gy - 26], [l2, gy + 4], [l3, gy + 36]]) { ctx.strokeText(s2, gx + 70, yy); ctx.fillText(s2, gx + 70, yy); }
    ctx.restore();
  }
  function drawGuide() {
    if (busy() || player.dead) return;
    if (goldId != null) {
      const g = mons.get(goldId);
      if (g && alive(g)) {
        const sx = g.rx - camX;
        if (sx < 30 || sx > W - 30) {
          const right = sx > W - 30, x = right ? W - 30 : 30, y = H / 2 - 30, b = Math.sin(t * 8) * 5;
          ctx.save(); ctx.translate(x + (right ? b : -b), y); if (!right) ctx.scale(-1, 1);
          Art.glowFast(ctx, 0, 0, 34, [255, 220, 90], 0.8);
          ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(6, -12); ctx.lineTo(6, -22); ctx.lineTo(24, 0); ctx.lineTo(6, 22); ctx.lineTo(6, 12); ctx.lineTo(-14, 12); ctx.closePath();
          ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.stroke(); ctx.restore();
        }
      }
    }
    const tg = C.target(); if (!tg) return;
    let tx = null;
    if (tg[0] === mapId) tx = tg[1];
    else {
      const ci = C.ORDER.indexOf(mapId), ti = C.ORDER.indexOf(tg[0]);
      const want = ti > ci ? C.ORDER[ci + 1] : C.ORDER[ci - 1];
      const pe = ents.find((e) => e.kind === 'portal' && e.to === want);
      if (pe) tx = pe.x;
    }
    if (tx == null) return;
    const sx = tx - camX, b = Math.sin(t * 6) * 6;
    ctx.save();
    if (sx < 40 || sx > W - 40) {
      const right = sx > W - 40, x = right ? W - 34 : 34, y = H / 2 + 30;
      ctx.translate(x + (right ? b : -b), y); if (!right) ctx.scale(-1, 1);
      ctx.beginPath(); ctx.moveTo(-18, -16); ctx.lineTo(8, -16); ctx.lineTo(8, -28); ctx.lineTo(30, 0); ctx.lineTo(8, 28); ctx.lineTo(8, 16); ctx.lineTo(-18, 16); ctx.closePath();
      ctx.fillStyle = 'rgba(255,230,90,0.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
    } else if (Math.abs(tx - player.x) > 120) {
      ctx.translate(sx, 250 + b);
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(14, -20); ctx.lineTo(14, 0); ctx.lineTo(26, 0); ctx.lineTo(0, 24); ctx.lineTo(-26, 0); ctx.lineTo(-14, 0); ctx.closePath();
      ctx.fillStyle = 'rgba(255,230,90,0.85)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
    }
    ctx.restore();
  }
  function drawDead() {
    ctx.fillStyle = 'rgba(30,10,50,0.45)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = F(40); ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(60,20,80,0.9)'; ctx.strokeText('기절했어요…', W / 2, H / 2 - 30); ctx.fillStyle = '#ffd1e6'; ctx.fillText('기절했어요…', W / 2, H / 2 - 30);
    ctx.font = F(22); ctx.fillStyle = '#fff'; ctx.fillText(map.boss ? `${Math.ceil(Math.max(0, deadT))}초 뒤에 입구에서 다시 일어나요` : `${Math.ceil(Math.max(0, deadT))}초 뒤에 마을에서 다시 일어나요`, W / 2, H / 2 + 22);
  }
  function wrapText(text, maxW) {
    const out = []; let line = '';
    for (const word of text.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= maxW) { line = word; continue; }
      line = '';
      for (const ch of word) { if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch; }
    }
    if (line) out.push(line);
    return out;
  }
  function drawPortrait(ch, cx, cy, r, expr) {
    const sp = Art.SPEC[ch.kind || 'balloon'];
    const tall = (ch.kind === 'ruler' || ch.kind === 'pencil' || ch.kind === 'glue' || ch.kind === 'worm');
    const Wd = tall ? r * 1.25 : r * 1.75, s = Wd / ch.w, Hd = Wd * sp.aspect(ch);
    const eyeY = sp.A.eyeL[1];
    const sy = cy + r * 0.05 + sp.leg * s + Hd * sp.tip - eyeY * Hd + (tall ? r * 0.15 : Hd * 0.18);
    Art.drawChar(ctx, ch, cx, sy, { t, scale: s, expr: expr || 'happy', noLegs: true, noHold: true, holding: false, erased: 0 });
  }
  function drawDialog() {
    const d = dialog, line = d.lines[d.i];
    let ch = null, name = '';
    if (line.who === 'me') { ch = player.ch; name = mode === 'multi' ? myName : '사랑둥이'; }
    else if (WHO[line.who]) { ch = Art.CH[WHO[line.who][0]]; name = WHO[line.who][1]; }
    const rightGap = touchUI && !portrait ? 150 : 24;
    const x = 24, w = W - x - rightGap, h = 140, y = H - h - 14;
    // 그림자: 흐림(shadowBlur)은 큰 상자에서 낡은 패드가 매 장면 무겁게 칠함 → 겹친 반투명 상자 셋으로 비슷하게(2026-11-26 자동 화질)
    ctx.save();
    for (const [d, a] of [[10, 0.07], [7, 0.1], [4, 0.13]]) { Art.roundRect(ctx, x - d * 0.5, y + 6 - d * 0.3, w + d, h + d * 0.8, 22 + d * 0.5); ctx.fillStyle = `rgba(30,10,50,${a})`; ctx.fill(); }
    Art.roundRect(ctx, x, y, w, h, 22);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,252,255,0.98)'); g.addColorStop(1, 'rgba(255,232,244,0.98)');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    Art.roundRect(ctx, x, y, w, h, 22); ctx.lineWidth = 4; ctx.strokeStyle = line.who === 'devil' ? '#a77fd6' : '#ff6fa8'; ctx.stroke();
    Art.roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 17); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,150,200,0.5)'; ctx.stroke();
    let tx = x + 26;
    if (ch) {
      const cx = x + 72, cy = y + h / 2 + 2, r = 54, talking = d.shown < line.text.length;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
      const pg = ctx.createRadialGradient(cx, cy - 20, 5, cx, cy, r); pg.addColorStop(0, '#fff6fb'); pg.addColorStop(1, line.who === 'devil' ? '#d9c2ff' : '#ffc6e0');
      ctx.fillStyle = pg; ctx.fill(); ctx.clip();
      ctx.translate(0, talking ? -Math.abs(Math.sin(t * 14)) * 3 : 0);
      drawPortrait(ch, cx, cy, r, line.expr);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff9cc6'; ctx.stroke();
      tx = x + 140;
      ctx.font = F(17);
      const nw = ctx.measureText(name).width + 28;
      Art.roundRect(ctx, tx - 6, y - 17, nw, 32, 16); ctx.fillStyle = line.who === 'devil' ? '#8a4fd0' : '#ff5f9e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(name, tx + 8, y - 0.5);
    }
    // 건너뛰기
    if (d.lines.length - d.i > 1 && canSkip()) {
      const sw = 112, sh = 30, sxr = x + w - sw - 12, syr = y - 15;
      Art.roundRect(ctx, sxr, syr, sw, sh, 15); ctx.fillStyle = 'rgba(90,60,130,0.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.font = F(14); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(touchUI ? '건너뛰기 ▶▶' : 'Esc 건너뛰기', sxr + sw / 2, syr + sh / 2 + 1);
      d.skipRect = { x: sxr, y: syr, w: sw, h: sh };
    } else d.skipRect = null;
    const maxW = x + w - tx - 28;
    ctx.font = F(21);
    if (!d.wrapped || d.wrapped.w !== maxW) { let lines = wrapText(line.text, maxW); let fs = 21; if (lines.length > 3) { fs = 18; ctx.font = F(18); lines = wrapText(line.text, maxW); } d.wrapped = { w: maxW, lines, fs }; }
    let left = Math.floor(d.shown);
    ctx.fillStyle = ch ? '#4a2a5a' : '#5a3a6a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const lines = d.wrapped.lines, lh = d.wrapped.fs + 8;
    const ty = y + (h - lines.length * lh) / 2 + 3;
    ctx.font = F(d.wrapped.fs);
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const part = ln.slice(0, left); left -= ln.length + 1;
      ctx.fillText(part, tx, ty + i * lh);
    });
    if (d.shown >= line.text.length) {
      ctx.fillStyle = '#ff5f9e'; ctx.font = F(16); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(d.i < d.lines.length - 1 ? '▼' : '■', x + w - 16, y + h - 12 + Math.sin(t * 6) * 2);
    }
  }
  function drawAsk() {
    const a = askBox;
    ctx.fillStyle = 'rgba(20,8,40,0.45)'; ctx.fillRect(0, 0, W, H);
    const w = Math.min(560, W - 60), h = 190, x = (W - w) / 2, y = (H - h) / 2, pop = a.t < 0.15 ? 0.85 + 0.15 * U.easeOutBack(a.t / 0.15) : 1;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(pop, pop); ctx.translate(-W / 2, -H / 2);
    Art.roundRect(ctx, x, y, w, h, 24); ctx.fillStyle = 'rgba(255,248,252,0.98)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#ff6fa8'; ctx.stroke();
    ctx.font = F(24); ctx.fillStyle = '#5a2a6a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.text, W / 2, y + 52, w - 40);
    a.btns = [];
    const n = a.opts.length, bw = Math.min(200, (w - 60 - (n - 1) * 18) / n), bh = 60, gx = (W - (n * bw + (n - 1) * 18)) / 2;
    a.opts.forEach((o, i) => {
      const bx = gx + i * (bw + 18), by = y + 100, foc = a.cursor === i;
      Art.roundRect(ctx, bx, by + 4, bw, bh, 22); ctx.fillStyle = i === 0 ? '#b8306a' : '#5e4a7e'; ctx.fill();
      Art.roundRect(ctx, bx, by, bw, bh, 22); const g = ctx.createLinearGradient(0, by, 0, by + bh);
      if (i === 0) { g.addColorStop(0, '#ff9cc8'); g.addColorStop(1, '#ff4f94'); } else { g.addColorStop(0, '#c9b4e0'); g.addColorStop(1, '#8a74b0'); }
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = foc ? 5 : 3; ctx.strokeStyle = foc ? '#fff36a' : '#fff'; ctx.stroke();
      ctx.font = F(23); ctx.fillStyle = '#fff'; ctx.fillText(o, bx + bw / 2, by + bh / 2 + 1);
      a.btns.push({ x: bx, y: by, w: bw, h: bh, i });
    });
    ctx.restore();
  }
  function drawBanner() {
    const b = banner, k = b.t;
    const a = k < 0.4 ? k / 0.4 : k > 2.9 ? (3.4 - k) / 0.5 : 1;
    const pop = k < 0.35 ? 0.6 + 0.4 * U.easeOutBack(k / 0.35) : 1;
    ctx.save(); ctx.globalAlpha = U.clamp(a, 0, 1);
    const y = 150, bw = Math.min(600, W - 80), bx = (W - bw) / 2;
    ctx.translate(W / 2, y + 50); ctx.scale(pop, pop); ctx.translate(-W / 2, -(y + 50));
    Art.glowFast(ctx, W / 2, y + 50, bw * 0.6, [255, 150, 200], 0.4);
    Art.roundRect(ctx, bx, y, bw, 100, 24);
    const g = ctx.createLinearGradient(0, y, 0, y + 100); g.addColorStop(0, 'rgba(255,111,168,0.96)'); g.addColorStop(1, 'rgba(176,72,200,0.96)');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    for (let i = 0; i < 6; i++) Art.shiny(ctx, bx + 30 + i * (bw - 60) / 5, y + (i % 2 ? 12 : 88), 7, t, i);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = F(34); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(90,20,90,0.6)'; ctx.strokeText(b.title, W / 2, y + 38);
    ctx.fillStyle = '#fff'; ctx.fillText(b.title, W / 2, y + 38);
    ctx.font = F(20); ctx.fillStyle = '#fff3a8'; ctx.fillText(b.goal, W / 2, y + 76, bw - 30);
    ctx.restore();
  }
  function drawMapLabel() {
    const k = mapLabel.t, a = k < 0.3 ? k / 0.3 : k > 1.9 ? (2.4 - k) / 0.5 : 1;
    ctx.save(); ctx.globalAlpha = U.clamp(a, 0, 1);
    ctx.font = F(26); const w = ctx.measureText(mapLabel.text).width + 50;
    Art.roundRect(ctx, (W - w) / 2, 118, w, 44, 22); ctx.fillStyle = 'rgba(40,20,60,0.78)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(mapLabel.text, W / 2, 141);
    ctx.restore();
  }
  function drawToasts() {
    const b = bossMon(), off = (b && alive(b) && b.st !== 'wait' ? 56 : 0) + (waveInfo ? 40 : 0);
    toasts.forEach((ts, i) => {
      const a = ts.t < 0.25 ? ts.t / 0.25 : ts.t > ts.life - 0.4 ? (ts.life - ts.t) / 0.4 : 1;
      const slide = ts.t < 0.25 ? (1 - ts.t / 0.25) * 16 : 0;
      ctx.save(); ctx.globalAlpha = U.clamp(a, 0, 1);
      ctx.font = F(19);
      const w = Math.min(W - 40, ctx.measureText(ts.text).width + 40), y = (banner ? 262 : 172 + off + (mode === 'multi' ? 20 : 0)) + i * 44 + slide;
      Art.roundRect(ctx, (W - w) / 2, y, w, 36, 18); ctx.fillStyle = 'rgba(40,20,60,0.86)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
      ctx.fillStyle = ts.col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ts.text, W / 2, y + 19, W - 60);
      ctx.restore();
    });
  }

  // ---------------- 엔딩 ----------------
  function showEnding() {
    const s = Q.stats, secs = Math.round(s.play), gr = s.grades || {};
    const gl = ['snoreKing', 'eraserBoss', 'devil'].map((k) => gr[k] || '-').join(' · ');
    $('endStat').innerHTML = `플레이 시간 ${Math.floor(secs / 60)}분 ${secs % 60}초 · 맑게 한 몬스터 ${s.purified}마리<br>최고 콤보 ${s.bestCombo || 0} · 보스 등급 ${gl} · 기절 ${s.deaths}번`;
    $('ending').classList.remove('hidden'); document.body.classList.add('menu');
    Sound.playMusic('happy');
  }
  $('keepBtn').addEventListener('click', () => { $('ending').classList.add('hidden'); document.body.classList.remove('menu'); Sound.playMusic(map.music); });
  $('againBtn').addEventListener('click', () => {
    $('ending').classList.add('hidden');
    try { localStorage.removeItem(saveKey); } catch (e) { /* 무시 */ }
    startGame({ mode, name: myName, color: myColor, cont: null });
  });

  // ---------------- 시작 화면 ----------------
  function toggleSound() {
    const m = Sound.toggle();
    $('snd').classList.toggle('off', m);
    if (!m) { Sound.init(); if (map) Sound.playMusic(map.music); }
  }
  $('snd').addEventListener('click', (e) => { e.stopPropagation(); Sound.init(); toggleSound(); });
  if (Sound.muted) $('snd').classList.add('off');

  let gradeK = U.GRADE_K[4], gameDiff = 3;
  window.PLAZA_DIFF_GAME = 'sarang';
  function startGame(o) {
    Sound.init();
    qHold = performance.now() + 3000; qWin.length = 0; qWinT = 0;
    gameDiff = o.cont && o.cont.df >= 1 && o.cont.df <= 4 ? o.cont.df : U.diff();   // 난이도(처음 화면 단추): 학년 배율 × 난이도 배율. 이어하기는 저장한 판의 난이도 그대로(마지막 보스만 바꿔서 깨지 않게, 검토)
    const gk = U.GRADE_K[U.grade()] || U.GRADE_K[4], dk = U.DIFF_K[gameDiff] || U.DIFF_K[3];
    gradeK = { hp: gk.hp * dk.hp, dmg: gk.dmg * dk.dmg }; SIM.setHpK(gradeK.hp); window.__sarangDiff = gameDiff;   // 미니게임 빠르기·눈금도 난이도로(minigames.js)
    mode = o.mode; myName = o.name || '사랑둥이'; myColor = o.color || 'red';
    saveKey = mode === 'multi' ? 'sarang2:multi:' + myName : o.teach ? 'sarang2:teacher' : 'sarang2:solo';   // 선생님 바로 가기 판은 따로 저장(이어하기를 덮지 않게)
    const sv = o.cont;
    Q = sv ? Object.assign(C.newQ(), sv.Q) : C.newQ();
    for (const k of ['inv', 'kills', 'found', 'flags', 'stats']) if (!Q[k]) Q[k] = {};
    if (!Q.followers) Q.followers = []; if (!Q.hats) Q.hats = [];
    for (const k of ['deaths', 'purified', 'play']) Q.stats[k] = Q.stats[k] || 0;
    for (const id of ['title', 'join', 'teacher', 'ending']) $(id).classList.add('hidden');
    document.body.classList.remove('menu', 'mini'); document.body.classList.toggle('multi', mode === 'multi');
    padEl.classList.remove('talking');
    dialog = null; askBox = null; banner = null; locked = false; timers = []; kongShown = null; player = null; followers = [];
    love = 0; loveFull = false; combo = 0; courage = 0;
    state = 'play'; fade.a = 1; fade.dir = -1; lastLines = '';
    tutTried = false; if (tut) { tut = null; tutHide(); }
    let m = sv ? sv.map : 'heart', x = sv ? sv.x : null, y = sv ? sv.y : null;
    if (sv && SIM.MAPS[m].boss) { x = 170; y = 440; }
    loadMap(m, x, y);
    if (!sv) C.intro();
    else toast('이어서 모험을 떠나요!', '#fff36a');
  }
  // 처음 화면 난이도 단추(광장 공통: 하·중·상·최상, 마지막 악마둥이를 깨면 난이도마다 선물 상자). back.js가 늦게 읽혀도 붙게
  function diffBtn() {
    if (!window.PLAZA_DIFF_BUTTON) return;
    const old = $('diffBtn'); if (old) { old.refresh(); return; }
    const b = window.PLAZA_DIFF_BUTTON('sarang', null, () => { try { Sound.play('click'); } catch (e) { /* 무시 */ } }); b.id = 'diffBtn';
    $('gradeTag').insertAdjacentElement('afterend', b);
  }
  window.addEventListener('plaza-diff-ready', diffBtn);
  const soloSave = () => readSave('sarang2:solo');
  let newArm = 0;
  function showTitle() {
    state = 'title';
    for (const id of ['join', 'teacher', 'ending']) $(id).classList.add('hidden');
    $('title').classList.remove('hidden'); document.body.classList.add('menu');
    $('gradeTag').textContent = ''; $('gradeTag').style.display = 'none';   // '○학년 맞춤 모험…' 글은 없앰(2026-11-27 선생님)
    diffBtn();
    const sv = soloSave();
    $('contBtn').classList.toggle('hidden', !sv);
    if (sv) $('contBtn').textContent = `이어하기 · ${SIM.MAPS[sv.map].name}` + (sv.df ? ` · ${['', '하', '중', '상', '최상'][sv.df] || ''}` : '');
    $('newBtn').textContent = sv ? '처음부터' : '혼자 하기'; newArm = 0;
    $('multiRow').classList.toggle('hidden', !Net.canMulti);
  }
  $('newBtn').addEventListener('click', () => {
    if (soloSave() && performance.now() - newArm > 4000) { newArm = performance.now(); $('newBtn').textContent = '정말 처음부터? 한 번 더!'; return; }
    try { localStorage.removeItem('sarang2:solo'); } catch (e) { /* 무시 */ }
    Net.startSolo(); startGame({ mode: 'solo', cont: null });
  });
  $('contBtn').addEventListener('click', () => { const sv = soloSave(); Net.startSolo(); startGame({ mode: 'solo', cont: sv }); });
  let pickColor = 'red';
  document.querySelectorAll('#colors button').forEach((b) => b.addEventListener('click', () => {
    pickColor = b.dataset.c; document.querySelectorAll('#colors button').forEach((q) => q.classList.toggle('sel', q === b)); Sound.init(); Sound.play('click');
  }));
  $('multiBtn').addEventListener('click', () => {
    $('title').classList.add('hidden'); $('join').classList.remove('hidden'); $('joinMsg').textContent = '';
    try { const lastJ = JSON.parse(localStorage.getItem('sarang2:last') || 'null'); if (lastJ) { $('joinName').value = lastJ.name || ''; $('joinCode').value = lastJ.code || ''; if (lastJ.color) { pickColor = lastJ.color; document.querySelectorAll('#colors button').forEach((q) => q.classList.toggle('sel', q.dataset.c === pickColor)); } } } catch (e) { /* 무시 */ }
    const qc = new URLSearchParams(location.search).get('room'); if (qc) $('joinCode').value = qc.toUpperCase();
  });
  $('joinBack').addEventListener('click', () => { Net.close(); showTitle(); });
  $('joinCode').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
  $('joinGo').addEventListener('click', () => {
    const code = $('joinCode').value.trim().toUpperCase(), name = $('joinName').value.trim().replace(/[<>]/g, '').slice(0, 6);
    if (code.length !== 4) { $('joinMsg').textContent = '방 코드 4글자를 넣어 주세요.'; return; }
    if (!name) { $('joinMsg').textContent = '이름(별명)을 넣어 주세요.'; return; }
    $('joinMsg').textContent = '연결하는 중…'; $('joinGo').disabled = true;
    try { localStorage.setItem('sarang2:last', JSON.stringify({ name, code, color: pickColor })); } catch (e) { /* 무시 */ }
    const sv = readSave('sarang2:multi:' + name);
    Net.join(code, name, pickColor, sv && sv.Q ? sv.Q.hat : '', (err) => {
      $('joinGo').disabled = false;
      if (err) { $('joinMsg').textContent = err === 'noroom' ? '그런 방이 없어요. 선생님께 방 코드를 다시 확인해요.' : err === 'full' ? '방이 꽉 찼어요.' : '서버에 연결할 수 없어요. 잠시 후 다시 해 봐요.'; return; }
      startGame({ mode: 'multi', name, color: pickColor, cont: sv });
    });
  });
  $('teachBtn').addEventListener('click', () => {
    $('title').classList.add('hidden'); $('teacher').classList.remove('hidden');
    $('tCode').textContent = '····'; $('tList').innerHTML = ''; $('tCount').textContent = '서버에 연결하는 중… (처음엔 1분쯤 걸릴 수 있어요)';
    try { $('tOld').value = localStorage.getItem('sarang2:room') || ''; } catch (e) { /* 무시 */ }
    Net.teacher(null, (err, code) => {
      if (err) { $('tCount').textContent = '서버에 연결할 수 없어요. 잠시 후 다시 해 주세요.'; return; }
      $('tCode').textContent = code; $('tLink').textContent = location.origin + location.pathname; $('tCount').textContent = '아직 들어온 학생이 없어요.';
      try { localStorage.setItem('sarang2:room', code); } catch (e) { /* 무시 */ }
    });
  });
  $('tWatch').addEventListener('click', () => {
    const code = ($('tOld').value || '').trim().toUpperCase();
    if (code.length !== 4) { $('tCount').textContent = '다시 볼 방 코드 4글자를 넣어 주세요.'; return; }
    $('tCount').textContent = '연결하는 중…';
    Net.teacher(code, (err, c) => { if (err) { $('tCount').textContent = '그 방을 찾을 수 없어요.'; return; } $('tCode').textContent = c; $('tLink').textContent = location.origin + location.pathname; $('tCount').textContent = '방을 다시 열었어요.'; });
  });
  $('tOld').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
  $('tBack').addEventListener('click', () => { Net.close(); showTitle(); });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderTeacher(m) {
    if ($('teacher').classList.contains('hidden')) return;
    const list = m.list.slice().sort((a, b) => C.ORDER.indexOf(b.map) - C.ORDER.indexOf(a.map));
    $('tCount').textContent = list.length ? `함께하는 학생 ${list.length}명` : '아직 들어온 학생이 없어요.';
    $('tList').innerHTML = list.map((p) => `<tr><td><span class="dot c-${esc(p.color)}"></span>${esc(p.name)}</td><td>${esc(p.mapName || '-')}</td><td>${esc(p.q || '')}</td><td>${p.hp | 0}</td></tr>`).join('');
  }

  // ---------------- 선생님 점검 바로 가기(2026-11-26) ----------------
  // 선생님: "학생처럼 다 깨야 해서 마지막 장소·보스·끝 화면을 보려면 30분". 선생님 기기(PLAZA_TEACHER)에만 back.js 🧑‍🏫 창에 목록이 보임.
  // 그곳에 '막 도착한' 이야기 단계로 맞추고(앞에서 할 일·하트 조각·친구·마음 문은 다 한 것으로) 그 맵을 엶. 저장은 선생님 칸(sarang2:teacher)에 따로
  const T_PLACES = [   // [맵, 이야기 단계, 이름, 그룹]
    ['heart', 'intro', '하트 마을 (처음)', '1 꿈나라'], ['cotton', 'toCotton', '솜사탕 마을', '1 꿈나라'], ['drowsy', 'clouds', '졸음 들판', '1 꿈나라'],
    ['toss', 'trumpet', '뒤척이 숲', '1 꿈나라'], ['pillow', 'toCastle', '보스 · 코골이 대왕', '1 꿈나라'],
    ['pencil', 'toPencil', '연필 마을', '2 학용품 나라'], ['notebook', 'numbers', '공책 평원', '2 학용품 나라'], ['tower', 'toTower', '보스 · 심술 지우개 대장', '2 학용품 나라'],
    ['gloom', 'toGloom', '심술 마을', '3 심술 나라'], ['thorn', 'keys', '가시 정원', '3 심술 나라'], ['mirror', 'mirror', '거울 미로', '3 심술 나라'], ['throne', 'toThrone', '최종 보스 · 악마둥이', '3 심술 나라'],
  ];
  const T_MINI = [['rhythm', '기상 나팔 (리듬)'], ['measure', '길이 재기'], ['ruler', '눈금 붙이기 (자 왕자)'], ['simon', '거울 문 (순서 기억)']];
  function teachPrep(st) {   // 이 단계에 오기 전에 끝냈어야 할 것을 채움
    const at = (s) => C.idx(st) >= C.idx(s), q = Q;
    q.step = st;
    for (const id in SIM.MAPS) if (!SIM.MAPS[id].safe) q.flags['gate_' + id] = true;   // 마음 문(꼭 푸는 문제)은 지난 것으로
    if (at('practice2')) q.kills.dummy = 5;
    if (at('toOwl')) q.kills.cloud = 8;
    if (at('toCastle')) q.flags.trumpet = true;
    if (at('toPencil')) { q.flags.princessAwake = true; q.shards = Math.max(q.shards, 1); if (!q.followers.includes('princess')) q.followers.push('princess'); }
    if (at('numbers')) q.flags.glueQuest = true;
    if (at('toTower')) { q.flags.bridge = true; q.inv.number = Math.max(q.inv.number || 0, 10); }
    if (at('toGloom')) { q.flags.princeOk = true; q.shards = Math.max(q.shards, 2); if (!q.followers.includes('prince')) q.followers.push('prince'); }
    if (at('keys')) for (let i = 1; i <= 5; i++) { q.flags['c_g' + i] = true; q.flags['t_g' + i] = true; }
    if (at('mirror')) q.inv.key = Math.max(q.inv.key || 0, 3);
    if (at('toThrone')) q.flags.mirrorOpen = true;
    if (at('done')) q.shards = 3;
  }
  function teachReset() {   // 하던 대화·미니게임·엔딩 창을 닫음
    if (Mini.active) Mini.cancel();
    dialog = null; askBox = null; banner = null; locked = false; timers = []; transformFx = null; outro = null; intro = null;
    for (const id of ['title', 'join', 'teacher', 'ending']) $(id).classList.add('hidden');
    document.body.classList.remove('menu', 'mini'); padEl.classList.remove('talking');
  }
  function teachStart() {   // 처음 화면이면 혼자 하기를 새로 시작(이어하기 저장은 안 건드림)
    if (state === 'play' && mode !== 'multi') return;
    Net.startSolo(); startGame({ mode: 'solo', cont: null, teach: true });
  }
  function teachGo(id, st, pre) {
    teachStart(); teachReset(); teachWin = false;
    saveKey = 'sarang2:teacher';
    teachPrep(st);
    if (pre) pre();
    fade.dir = 0; fade.a = 0;
    loadMap(id);
    if (id === 'heart' && st === 'intro') C.intro();
  }
  function bossReady(ms) {   // 보스가 생길 때까지(맵에 들어가고 한두 장면 뒤)
    return new Promise((res) => { const t0 = performance.now(); (function wait() { const b = bossMon(); if (b || performance.now() - t0 > ms) res(b); else setTimeout(wait, 80); })(); });
  }
  async function teachBoss(win) {
    const P = { snoreKing: ['pillow', 'toCastle'], eraserBoss: ['tower', 'toTower'], devil: ['throne', 'toThrone'] };
    let b = bossMon();
    if (!map || !map.boss || !b || b.type !== win.type || b.st === 'down') { const [id, st] = P[win.type]; teachGo(id, st); b = await bossReady(3000); }
    if (!b) throw new Error('보스를 찾지 못했어요');
    teachReset(); player.hp = player.max; player.dead = false;
    introShown = true;   // 등장 장면 없이 바로
    if (win.left) { teachWin = true; Net.hit(mapId, b.id, Math.max(1, Math.round((b.hp - Math.max(8, b.max * 0.03)) / (b.st === 'hurt' ? 1.5 : 1)))); }   // 한두 대만 남김
    else { teachWin = true; Net.hit(mapId, b.id, 999999); }   // 바로 이김 → 보스 끝 장면·이야기
  }
  window.PLAZA_TEACHER_JUMPS = function () {
    if (!isTeacher() || mode === 'multi') return [];
    const out = T_PLACES.map(([id, st, name, g]) => ({ label: name, group: '곳 바로 가기 · ' + g.slice(2), icon: SIM.MAPS[id].boss ? '👑' : SIM.MAPS[id].safe ? '🏠' : '🌿', hint: SIM.MAPS[id].name, fn: () => teachGo(id, st) }));
    const BN = { snoreKing: '코골이 대왕', eraserBoss: '심술 지우개 대장', devil: '악마둥이' };
    for (const type of ['snoreKing', 'eraserBoss', 'devil']) {
      out.push({ label: BN[type] + ' 한 대 남기기', group: '보스', icon: '💥', hint: '체력을 거의 다 깎아 둠', fn: () => teachBoss({ type, left: true }) });
      out.push({ label: BN[type] + ' 바로 이기기', group: '보스', icon: '🏆', hint: type === 'devil' ? '콩닥이 이야기 → 축제 → 끝' : '보스 끝 장면·이야기', fn: () => teachBoss({ type }) });
    }
    out.push({ label: '하트 축제 (마지막 이야기)', group: '끝 장면', icon: '🎉', hint: '하트 조각 3개를 모은 뒤 → 엔딩', fn: () => teachGo('heart', 'done', () => { Q.flags.festival = false; }) });
    out.push({ label: '엔딩 화면만', group: '끝 장면', icon: '🏁', hint: '다 깼을 때 기록 화면', fn: () => { teachStart(); teachReset(); saveKey = 'sarang2:teacher'; teachPrep('done'); Q.flags.festival = true; showEnding(); } });
    for (const [n, label] of T_MINI) out.push({ label, group: '미니게임', icon: '🎮', hint: '모든 학년 같은 놀이', fn: () => { teachStart(); teachReset(); G.mini(n, () => {}); } });
    return out;
  };

  // ---------------- 처음 하는 학생 튜토리얼(2026-11-26 선생님: "하이라이트 화면처럼, 허수아비 때리고 이런 걸로 기초 조작을") ----------------
  // 하트 특공대 튜토리얼과 같은 모양: 어두운 막 + 밝힌 구멍(금빛·흰 테) + 통통 튀는 화살표 ❗ + 왼쪽 안내 친구 말풍선 ▶ + 위 「연습」·「튜토리얼 건너뛰기 ▶▶」.
  // 원래 이야기·퀘스트 흐름 그대로 위에 얹음: 조작(이동·점프·대시) → 할머니와 대화(이야기) → 허수아비 퀘스트(하트 5번 · 큰 하트) → 사랑 폭발 → 출발.
  // 막은 눌림을 막지 않음(pointer-events:none) → 게임 단추가 그대로 눌림. ▶ 설명 동안은 캐릭터만 멈춤(tutHold).
  // 처음 하는 학생만(기기 기억 sarang.tut), 선생님 기기·친구랑 하기는 안 나옴. 시험: ?tut=0 끔 · ?tut=1 언제나 · window.__game.tut
  const TUT_KEY = 'sarang.tut', tutQ = new URLSearchParams(location.search).get('tut');
  let tut = null, tutMem = false, tutTried = false, tutEls = null;
  function tutDone() { if (tutMem) return true; try { return localStorage.getItem(TUT_KEY) === '1'; } catch (e) { return false; } }
  function tutSetDone() { tutMem = true; try { localStorage.setItem(TUT_KEY, '1'); } catch (e) { /* 무시 */ } }
  const kb = () => !touchUI;
  function g2s(x, y) {   // 게임 화면 좌표(W×H) → CSS 화면 좌표(자동 화질 캔버스 배율과 상관없음)
    const r = stageBox;
    if (zoom !== 1) { x = W / 2 + (x - W / 2) * zoom; y = H * 0.62 + (y - H * 0.62) * zoom; }
    return { x: r.left + x * r.w / W, y: r.top + y * r.h / H, k: r.w / W * zoom };
  }
  function w2s(x, y, z) { return g2s(x - camX, y - (z || 0) * dscale(y)); }
  function gRect(x, y, w, h) { const a = g2s(x, y), b = g2s(x + w, y + h); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; }
  function elSpot(id, pad) {   // 동그란 조작 단추
    const e = $(id); if (!e || !e.getClientRects().length) return null;
    const r = e.getBoundingClientRect(); if (r.width < 4) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 + (pad == null ? 8 : pad) };
  }
  function meSpot(r) { const p = w2s(player.x, player.y, player.z + 52); return { x: p.x, y: p.y, r: (r || 72) * p.k }; }
  function entSpot(id, zc, r) { const e = ents.find((q) => q.id === id); if (!e) return null; const p = w2s(e.x, e.y, zc); return { x: p.x, y: p.y, r: r * p.k, mark: 1 }; }
  const dummySpot = () => entSpot('dummy', 66, 76);
  const sp = (...a) => a.filter(Boolean);
  const TUT = [
    { key: 'hi', ph: 'intro', lab: '연습', t: '사랑둥이 연습을 시작합니다.', sm: '연습을 시작해요.', at: () => [meSpot(80)] },
    { key: 'hud', ph: 'intro', lab: '내 체력 · 사랑 게이지', t: '위는 내 체력, 아래는 사랑 게이지예요. 몬스터를 맑게 하면 사랑 게이지가 차요.', sm: '내 체력과 사랑 게이지예요.',
      at: () => ({ rect: gRect(14, 57, 212, 50) }) },
    { key: 'move', ph: 'intro', lab: '직접 해 보기', live: 1,
      t: () => (kb() ? '방향키(또는 WASD)로 움직여 보세요.' : '조이스틱을 누른 채 밀어서 움직여 보세요.'), sm: () => (kb() ? '방향키로 움직여 보세요.' : '조이스틱을 밀어 보세요.'),
      at: () => sp(elSpot('joy', 10), meSpot()), set: (S) => { S.x = player.x; S.y = player.y; }, ok: (S) => Math.hypot(player.x - S.x, (player.y - S.y) * 1.6) > 160 },
    { key: 'jump', ph: 'intro', lab: '직접 해 보기', live: 1,
      t: () => (kb() ? '스페이스 키로 점프해 보세요.' : '점프 단추를 눌러 보세요.'), sm: () => (kb() ? '스페이스 키로 점프!' : '점프를 눌러 보세요.'),
      at: () => sp(elSpot('bJump'), meSpot()), ok: () => player.z > 25 },
    { key: 'dash', ph: 'intro', lab: '직접 해 보기', live: 1,
      t: () => (kb() ? 'Shift 키를 누르면 휙 달려요. 눌러 보세요.' : '대시 단추를 누르면 휙 달려요. 눌러 보세요.'), sm: () => (kb() ? 'Shift 키를 눌러 보세요.' : '대시를 눌러 보세요.'),
      at: () => sp(elSpot('bDash'), meSpot()), ok: () => !!player.dash },
    { key: 'talk', ph: 'intro', lab: '하트 할머니', live: 1,
      t: () => (kb() ? '하트 할머니 옆으로 가서 E 키로 대화해 보세요.' : '하트 할머니 옆으로 가서 대화 단추를 눌러 보세요.'), sm: () => (kb() ? '할머니 옆에서 E 키!' : '할머니 옆에서 대화를 눌러요.'),
      at: () => sp(entSpot('grandma', 58, 84), elSpot('bAct'), meSpot()) },
    { key: 'heart', ph: 'practice', lab: '하트 던지기',
      t: () => (kb() ? 'J 키를 톡 누르면 하트, 꾹 눌렀다 떼면 큰 하트가 나가요.' : '♥ 단추를 톡 누르면 하트, 꾹 눌렀다 떼면 큰 하트가 나가요.'), sm: () => '톡 누르면 하트, 꾹 누르면 큰 하트!',
      at: () => sp(elSpot('bShoot')) },
    { key: 'dummy', ph: 'practice', lab: '직접 해 보기', live: 1,
      t: () => `허수아비 쪽을 보고 하트로 맞혀 보세요! (${Math.min(5, Q.kills.dummy || 0)}/5)`, sm: () => `허수아비를 하트로 맞혀요! (${Math.min(5, Q.kills.dummy || 0)}/5)`,
      at: () => sp(dummySpot(), elSpot('bShoot'), meSpot()) },
    { key: 'big', ph: 'practice2', lab: '직접 해 보기', live: 1,
      t: () => (kb() ? '이번엔 J 키를 꾹 눌렀다가 떼서 큰 하트로 맞혀 보세요!' : '이번엔 ♥를 꾹 눌렀다가 떼서 큰 하트로 맞혀 보세요!'), sm: () => '꾹 눌렀다 떼서 큰 하트로!',
      at: () => sp(dummySpot(), elSpot('bShoot'), meSpot()) },
    { key: 'special', ph: 'toCotton', lab: '필살 · 사랑 폭발', live: 1, wait: 1.4,
      t: () => (kb() ? '사랑 게이지가 가득 차면 필살! F 키로 사랑 폭발을 써 보세요.' : '사랑 게이지가 가득 차면 필살! 사랑 폭발을 눌러 보세요.'), sm: () => '게이지 가득! 사랑 폭발을 눌러요.',
      at: () => { const L = sp(elSpot('bSpecial'), kb() ? meSpot() : null); L.rect = gRect(14, 82, 212, 26); return L; },
      set: () => { gainLove(100); }, ok: (S) => { if (special) S.used = 1; if (!S.used && love < 100) gainLove(100); return !!S.used && !special; } },
    { key: 'end', ph: 'toCotton', lab: '출발!', t: '이제 하트 마을을 지켜 보세요! 오른쪽 끝 포털로 출발!', sm: '이제 출발! 오른쪽 끝 포털로!', at: () => [meSpot(80)] },
  ];
  function tutHold() { return !!(tut && !TUT[tut.i].live); }
  function tutBuild() {
    if (tutEls) return;
    const mask = document.createElement('canvas'); mask.id = 'tutMask'; mask.className = 'hidden';
    const ov = document.createElement('div'); ov.id = 'tutOv'; ov.className = 'hidden';
    ov.innerHTML = '<canvas class="guy" width="150" height="150"></canvas><div class="tb"><div class="tl"></div><div class="tx"></div><div class="dots"></div><button class="nx" aria-label="다음">▶</button></div>';
    const bar = document.createElement('div'); bar.id = 'tutBar'; bar.className = 'hidden';
    bar.innerHTML = '<span>연습</span><button id="tutSkip">튜토리얼 건너뛰기 ▶▶</button>';
    const arrow = document.createElement('div'); arrow.id = 'tutArrow'; arrow.className = 'hidden';
    arrow.innerHTML = '<b>!</b><svg viewBox="0 0 32 38"><path d="M16 37 L1 19 L9 19 L9 1 L23 1 L23 19 L31 19 Z" fill="#ffd43b" stroke="#7a4a00" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    for (const el of [mask, arrow, ov, bar]) document.body.appendChild(el);
    tutEls = { mask, mctx: mask.getContext('2d'), ov, bar, arrow, tb: ov.querySelector('.tb'), tl: ov.querySelector('.tl'), tx: ov.querySelector('.tx'), dots: ov.querySelector('.dots'), nx: ov.querySelector('.nx'), guy: ov.querySelector('.guy'), sig: '', txt: '' };
    let lastGo = 0;
    tutEls.nx.addEventListener('click', (e) => { e.stopPropagation(); if (performance.now() - lastGo < 350) return; lastGo = performance.now(); tutGo(); });   // 두 번 톡톡으로 설명을 건너뛰지 않게
    $('tutSkip').addEventListener('click', (e) => { e.stopPropagation(); if (tut) { Sound.play('click'); tutFinish(true); } });
    for (const b of [tutEls.nx, $('tutSkip')]) for (const ty of ['pointerdown', 'touchstart', 'mousedown']) b.addEventListener(ty, (e) => { e.stopPropagation(); Sound.init(); }, { passive: true });
  }
  function tutGo() { if (!tut || !tut.vis || TUT[tut.i].live) return; Sound.play('click'); tutStep(tut.i + 1); }
  addEventListener('keydown', (e) => {   // 키보드: ▶ 대신 엔터·스페이스(그 누름이 다음 단계에서 대화·점프로 새지 않게 지움)
    if (tut && tut.vis && !TUT[tut.i].live && /^(Enter|Space|KeyE|KeyX|NumpadEnter)$/.test(e.code) && !e.repeat) { tutGo(); input.actP = false; input.jumpP = false; }
  });
  function tutStep(i) {
    if (i >= TUT.length) { tutFinish(false); return; }
    tut.i = i; tut.S = {}; tut.t0 = t; tut.vis = false; tut.okAt = 0; tutEls.sig = ''; tutEls.txt = '';
    const st = TUT[i]; if (st.set) st.set(tut.S);
  }
  function tutStart(i) {
    tutBuild(); tutTried = true;
    tut = { i: 0, S: {}, t0: t, vis: false };
    tutStep(i);
  }
  function tutHide() { if (tut && tut.cam) { camCenter = null; tut.cam = 0; } if (!tutEls) return; for (const k of ['mask', 'ov', 'bar', 'arrow']) tutEls[k].classList.add('hidden'); }
  function tutFinish(skipped) {
    tutSetDone(); tutHide(); tut = null;
    if (skipped && player && state === 'play') toast('연습을 건너뛰었어요. 퀘스트 창을 보고 따라가요!', '#fff36a');
  }
  function tutTick() {
    if (!tut) {
      if (!tutTried && state === 'play' && mode === 'solo' && mapId === 'heart' && Q && player && tutQ !== '0' && (tutQ === '1' || !tutDone()) && !isTeacher()
        && !dialog && fade.dir === 0) {
        const i = TUT.findIndex((s) => s.ph === Q.step);
        if (i >= 0) tutStart(i); else tutTried = true;
      }
      return;
    }
    // 이야기가 앞으로 갔으면(학생이 먼저 해 버림) 그 단계로, 맵을 떠났거나 다른 데로 건너뛰었으면(선생님·점검) 끝
    if (state !== 'play' || mode !== 'solo' || mapId !== 'heart' || !player) { if (Q && C.at('toCotton')) tutSetDone(); tutHide(); tut = null; return; }
    let st = TUT[tut.i];
    if (C.idx(Q.step) > C.idx(st.ph)) {
      const j = TUT.findIndex((s, k) => k > tut.i && s.ph === Q.step);
      if (j < 0) { if (C.at('toCotton')) tutSetDone(); tutHide(); tut = null; return; }
      tutStep(j); st = TUT[j];
    }
    if (!tut.okAt && st.ok && st.ok(tut.S)) { tut.okAt = performance.now(); Sound.play('ding'); }   // 해낸 순간을 기억(대시처럼 잠깐인 것도)
    if (tut.okAt && performance.now() - tut.okAt > 450) { tutStep(tut.i + 1); return; }   // 잠깐(반짝 볼 틈) 뒤 다음
    const vis = !(busy() || player.dead || special || banner || (st.wait && t - tut.t0 < st.wait));
    if (vis !== tut.vis) {
      tut.vis = vis;
      if (!vis) tutHide();
      else { for (const k of ['mask', 'ov', 'bar']) tutEls[k].classList.remove('hidden'); tutEls.sig = ''; }
    }
    // 허수아비 단계: 카메라가 허수아비를 화면 가운데에(오른쪽 아래 조작 단추 뒤에 숨지 않게), 내가 멀리 왼쪽이면 나를 따라감
    const dm = (st.key === 'dummy' || st.key === 'big') && vis ? ents.find((q) => q.id === 'dummy') : null;
    if (dm) { camCenter = Math.min(dm.x, player.x + W / 2 - 150); tut.cam = 1; } else if (tut.cam) { camCenter = null; tut.cam = 0; }
    if (!vis) return;
    toasts.length = 0;   // 게임 알림 글이 연습 말풍선과 겹치지 않게(말풍선이 같은 말을 함)
    tutDraw(st);
  }
  function tutText(st) {
    const small = U.grade() <= 2, v = small ? st.sm || st.t : st.t;
    return typeof v === 'function' ? v() : v;
  }
  function tutDraw(st) {
    const E = tutEls, text = tutText(st);
    if (E.txt !== text) {
      const fresh = E.tx.dataset.k !== st.key;
      E.txt = text; E.tx.textContent = text; E.tx.dataset.k = st.key; E.tl.textContent = st.lab || '';
      E.dots.innerHTML = TUT.map((_, i) => `<i class="${i <= tut.i ? 'on' : ''}"></i>`).join('');
      E.ov.classList.toggle('nonx', !!st.live);
      if (fresh) { E.tb.classList.add('pop'); setTimeout(() => E.tb.classList.remove('pop'), 180); }
      if (!E.guyDone && player) {   // 안내 친구 = 내 사랑둥이
        E.guyDone = 1;
        try { const g = E.guy.getContext('2d'), ch = player.ch; g.clearRect(0, 0, 150, 150); Art.drawChar(g, ch, 75, 146, { t: 0, facing: 1, scale: 104 / ch.w, expr: 'joy', pose: 'cheer' }); } catch (e) { /* 그림 없음 */ }
      }
    }
    // 말풍선 자리: 게임 화면 가운데 위(체력 칸 아래 · 조작 단추 위)
    const b = stageBox, top = Math.round(b.top + 124 * b.h / H), left = Math.round(b.left + b.w / 2), mw = Math.round(Math.min(640, b.w * 0.62));
    if (E.ovKey !== `${top},${left},${mw}`) { E.ovKey = `${top},${left},${mw}`; Object.assign(E.ov.style, { top: top + 'px', left: left + 'px', width: mw + 'px' }); E.bar.style.top = Math.max(54, Math.round(b.top + 60 * b.h / H)) + 'px'; E.bar.style.left = left + 'px'; }   // 띠: 🏠 광장으로·소리 단추 아래
    const a = st.at ? st.at() : null, list = Array.isArray(a) ? a : a && !a.rect ? [a] : [], rect = a && a.rect;
    const vw = innerWidth, vh = innerHeight;
    const sig = `${vw}x${vh}|${st.live ? 1 : 0}|` + list.map((q) => `${q.x | 0},${q.y | 0},${q.r | 0}`).join(';') + (rect ? `|${rect.x | 0},${rect.y | 0},${rect.w | 0},${rect.h | 0}` : '');
    const mk = list.find((q) => q.mark);
    if (mk) {   // 위에서 콕: 통통 튀는 금빛 화살표 + ❗ (CSS 움직임이라 막을 다시 안 그림)
      E.arrow.classList.remove('hidden');
      const ak = `${mk.x | 0},${(mk.y - mk.r) | 0}`;
      if (E.arrowKey !== ak) { E.arrowKey = ak; E.arrow.style.left = (mk.x | 0) + 'px'; E.arrow.style.top = ((mk.y - mk.r) | 0) + 'px'; }
    } else E.arrow.classList.add('hidden');
    if (sig === E.sig) return;   // 막은 단계가 바뀌거나 밝힐 곳이 움직였을 때만 다시 그림(낡은 패드)
    E.sig = sig;
    const m = E.mask, c = E.mctx;
    if (m.width !== vw || m.height !== vh) { m.width = vw; m.height = vh; }
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, vw, vh);
    c.fillStyle = `rgba(0,0,0,${st.live ? 0.66 : 0.76})`; c.fillRect(0, 0, vw, vh);
    c.globalCompositeOperation = 'destination-out';
    const rr = (R) => { c.beginPath(); if (c.roundRect) c.roundRect(R.x, R.y, R.w, R.h, 10); else c.rect(R.x, R.y, R.w, R.h); };
    const cut = (q) => { const g = c.createRadialGradient(q.x, q.y, q.r, q.x, q.y, q.r * 1.3); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = '#000'; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, q.r * 1.3, 0, TAU); c.fill(); };
    if (rect) { c.fillStyle = '#000'; rr(rect); c.fill(); }
    list.forEach(cut);
    c.globalCompositeOperation = 'source-over';
    const ring = (path) => { c.lineWidth = 7; c.strokeStyle = 'rgba(255,224,90,0.95)'; path(); c.stroke(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.95)'; path(); c.stroke(); };
    if (rect) ring(() => rr(rect));
    list.forEach((q) => ring(() => { c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); }));
  }

  // 테스트용 바로가기 (화면에는 안 보임)
  window.__game = {
    get state() { return { state, mapId, step: Q && Q.step, hp: player && Math.round(player.hp), dialog: !!dialog, ask: !!askBox, mini: Mini.name, x: player && Math.round(player.x), y: player && Math.round(player.y), z: player && Math.round(player.z), mons: mons.size, dead: player && player.dead, fade: fade.dir, inv: Q && Q.inv, shards: Q && Q.shards, followers: Q && Q.followers, mode, net: netStatus, remote: remote.size, love: Math.round(love), combo, wave: !!waveInfo, gold: goldId, intro: !!intro, outro: !!outro, fx: FX.count }; },
    skipDialog() { let n = 0; while ((dialog || askBox) && n++ < 50) { if (askBox) { const a = askBox; askBox = null; document.body.classList.remove('mini'); a.cb(0); continue; } const d = dialog; dialog = null; padEl.classList.remove('talking'); if (d.onEnd) d.onEnd(); } },
    tp(x, y) { player.x = x; if (y) player.y = y; camX = U.clamp(x - W / 2, 0, Math.max(0, map.w - W)); },
    go(id, x) { fade.dir = 0; fade.a = 0; loadMap(id, x); },
    setStep(s) { Q.step = s; },
    give(k, n) { Q.inv[k] = (Q.inv[k] || 0) + n; C.onPickup(k); },
    flag(k, v = true) { Q.flags[k] = v; },
    heal() { player.hp = player.max; player.inv = 3; },
    god(v) { this._god = v; },
    hurtBoss(d) { const b = bossMon(); if (b) Net.hit(mapId, b.id, d); },
    killAll(type) { for (const m of mons.values()) if (alive(m) && (!type || m.type === type)) Net.hit(mapId, m.id, 9999); },
    mons() { return [...mons.values()].map((m) => ({ id: m.id, type: m.type, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, st: m.st, wave: m.wave })); },
    ents() { return ents.map((e) => ({ kind: e.kind, sub: e.sub, id: e.id, x: e.x, y: e.y, hidden: !!(e.hidden && e.hidden()), broken: e.broken, locked: !!(e.locked && e.locked()) })); },
    act(id) { const e = ents.find((q) => q.id === id); if (e) { const a = actOf(e); if (a) a.fn(); } },
    winMini() { const c = Mini._cur(); if (c) { c.s.res = 'win'; c.s.resT = 5; } },
    mini(name) { G.mini(name, () => {}); },
    portal(to) { const e = ents.find((q) => q.kind === 'portal' && q.to === to); if (e) usePortal(Object.assign({}, e, { locked: null })); return !!e; },
    face(d) { player.facing = d; },
    fire(big) { fire(!!big); },
    love(v) { love = v; if (v >= 100) loveFull = false; gainLove(0.001); },
    special() { if (love >= 100) startSpecial(); },
    dash() { startDash(); },
    skipCine() { if (intro) intro.t = 9; if (outro) outro.t = 9; },
    get Q() { return Q; },
    get gradeK() { return gradeK; }, get diff() { return gameDiff; },
    get tut() { return tut ? { i: tut.i, key: TUT[tut.i].key, vis: tut.vis, live: !!TUT[tut.i].live, done: tutDone() } : { done: tutDone() }; },
    tutNext() { tutGo(); }, tutSkip() { if (tut) tutFinish(true); },   // 점검: 학년 × 난이도 배율
  };

  // ---------------- 로딩 ----------------
  const IMGS = ['sarang', 'heart_blank_red', 'heart_purple', 'heart_pink', 'heart_blue', 'heart_gold', 'heart_mint'];
  function loadImage(name) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res([name, im]);
      im.onerror = () => { const im2 = new Image(); im2.onload = () => res([name, im2]); im2.onerror = () => res([name, null]); im2.src = `assets/${name}.png`; };
      im.src = `assets/${name}.webp`;
    });
  }
  let last = performance.now(), dtAvg = 1 / 60;
  function frame(now) {
    const raw = now - last; last = now;
    if (!qSimOn) qTick(raw);
    let dt = Math.min(0.05, raw / 1000);
    dtAvg += (dt - dtAvg) * 0.1;
    if (Math.abs(dt - dtAvg) < 0.004) dt = dtAvg;   // 장면 간격의 작은 떨림(±4ms)은 평균으로: 움직임이 고르게
    if (fpsEl) { fpsN++; fpsT += raw; if (fpsT > 500) { const q = window.__q(); fpsEl.textContent = `${(fpsN * 1000 / fpsT).toFixed(0)}fps · 화질 ${q.lv} (${q.w}×${q.h}) · ${q.mean}ms`; fpsN = 0; fpsT = 0; } }
    try { update(dt); render(); tutTick(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  // 소리 장치(AudioContext) 만들기가 낡은 패드에서 길어서(점검 크롬 45ms) 「혼자 하기」 순간이 아니라 처음 화면을 처음 누를 때 미리(누름 안에서만 소리가 허락됨)
  const earlySound = () => { removeEventListener('pointerdown', earlySound, true); removeEventListener('keydown', earlySound, true); if (!Sound.muted) try { Sound.init(); } catch (e) { /* 무시 */ } };
  addEventListener('pointerdown', earlySound, true); addEventListener('keydown', earlySound, true);
  async function boot() {
    layout();
    addEventListener('resize', () => { clearTimeout(boot.rt); boot.rt = setTimeout(layout, 120); });
    const fontWait = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('20px Jua'), new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
    const pairs = await Promise.all(IMGS.map(loadImage));
    const m = {}; for (const [k, im] of pairs) if (im) m[k] = im;
    Art.setImages(m);
    if (m.sarang) $('titleBalloon').src = m.sarang.src;
    document.querySelectorAll('#colors img').forEach((im) => { const k = { red: 'heart_blank_red', pink: 'heart_pink', blue: 'heart_blue', gold: 'heart_gold', mint: 'heart_mint' }[im.dataset.c]; if (m[k]) im.src = m[k].src; });
    await fontWait.catch(() => {});
    Q = C.newQ();
    map = Object.assign({ id: 'heart' }, SIM.MAPS.heart); scene = buildScene(map.theme, map.w);
    window.__warmMs = await warmUp(Object.values(m));
    $('loading').classList.add('hidden');
    showTitle();
    requestAnimationFrame(frame);
  }
  boot();
})();
