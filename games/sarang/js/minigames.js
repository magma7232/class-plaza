'use strict';
// 미니게임 5가지: 기상 나팔 리듬 · 양 세기 · 눈금 맞추기 · 길이 재기 · 거울 기억
const Mini = (() => {
  const TAU = Math.PI * 2;
  const F = (px) => `${px}px Jua, "Noto Sans KR", sans-serif`;
  let cur = null, W = 960, H = 540, T = 0;
  let btns = [];          // 이번 프레임에 그린 버튼 (탭 판정용)
  let sparks = [];
  function sparkle(x, y, n = 12, cols = ['#fff36a', '#ff9cc8', '#9ff0ff', '#c9a2ff']) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 120 + Math.random() * 260; sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: 0, life: 0.5 + Math.random() * 0.4, s: 4 + Math.random() * 5, col: cols[i % cols.length], heart: Math.random() < 0.4 }); }
  }
  function drawSparks(c, dt) {
    for (const p of sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= 0.97; }
    sparks = sparks.filter((p) => p.t < p.life);
    for (const p of sparks) { c.globalAlpha = 1 - p.t / p.life; c.fillStyle = p.col; if (p.heart) Art.heartPath(c, p.x, p.y, p.s); else Art.starPath(c, p.x, p.y, p.s, p.s * 0.4, 5); c.fill(); }
    c.globalAlpha = 1;
  }
  let lastBtns = [];

  // ---------- 그리기 도우미 ----------
  function txt(c, s, x, y, size, col = '#fff', align = 'center', stroke = 'rgba(60,20,70,0.8)', lw = 5) {
    c.font = F(size); c.textAlign = align; c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
  }
  function panel(c, x, y, w, h, r = 22, fill = 'rgba(255,248,252,0.97)', edge = '#ff6fa8') {
    Art.roundRect(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); c.lineWidth = 4; c.strokeStyle = edge; c.stroke();
  }
  function button(c, id, x, y, w, h, label, o = {}) {
    const focus = o.focus, pressed = cur && cur.pressId === id && cur.pressT > 0;
    c.save();
    if (pressed) { c.translate(x + w / 2, y + h / 2); c.scale(0.94, 0.94); c.translate(-(x + w / 2), -(y + h / 2)); }
    Art.roundRect(c, x, y + 4, w, h, h / 2.6); c.fillStyle = o.shadow || '#b8306a'; c.fill();
    Art.roundRect(c, x, y, w, h, h / 2.6);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.c1 || '#ff9cc8'); g.addColorStop(1, o.c2 || '#ff4f94');
    c.fillStyle = g; c.fill(); c.lineWidth = focus ? 5 : 3; c.strokeStyle = focus ? '#fff36a' : '#fff'; c.stroke();
    txt(c, label, x + w / 2, y + h / 2 + 1, o.size || Math.min(26, h * 0.46), '#fff', 'center', 'rgba(110,20,70,0.65)', 4);
    c.restore();
    btns.push({ id, x, y, w, h });
  }
  function closeBtn(c) { button(c, 'close', W - 142, 14, 124, 44, '그만하기', { c1: '#b9a6d6', c2: '#8a74b0', shadow: '#5e4a7e', size: 20 }); }
  function heartIcon(c, x, y, s, on) { Art.heartPath(c, x, y, s); c.fillStyle = on ? '#ff4f8a' : 'rgba(255,255,255,0.25)'; c.fill(); c.lineWidth = 2; c.strokeStyle = on ? '#8f0d36' : 'rgba(255,255,255,0.5)'; c.stroke(); }
  function backdrop(c, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function header(c, title, sub) {
    txt(c, title, W / 2, 38, 30, '#fff36a', 'center', 'rgba(90,20,90,0.85)', 6);
    if (sub) txt(c, sub, W / 2, 74, 18, '#fff', 'center', 'rgba(60,20,70,0.75)', 4);
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  // 탭 → 버튼 id (없으면 null)
  function tapped(inp) {
    for (const tp of inp.taps) {
      for (const b of lastBtns) if (tp.x >= b.x && tp.x <= b.x + b.w && tp.y >= b.y - 4 && tp.y <= b.y + b.h + 6) { press(b.id); return b.id; }
    }
    return null;
  }
  function press(id) { if (cur) { cur.pressId = id; cur.pressT = 0.12; } Sound.play('click'); }
  const anyTapOutside = (inp) => inp.taps.length > 0;

  // 결과 카드
  function resultCard(c, s) {
    c.fillStyle = 'rgba(20,8,40,0.55)'; c.fillRect(0, 0, W, H);
    const w = Math.min(560, W - 80), h = 230, x = (W - w) / 2, y = (H - h) / 2 - 10;
    panel(c, x, y, w, h, 26);
    if (s.res === 'win') {
      const k = Math.min(1, s.resT * 3);
      c.save(); c.translate(W / 2, y + 74); c.scale(0.6 + 0.4 * U.easeOutBack(k), 0.6 + 0.4 * U.easeOutBack(k));
      txt(c, '성공!', 0, 0, 54, '#ff5f9e', 'center', '#fff', 8); c.restore();
      txt(c, s.winText || '아주 잘했어요!', W / 2, y + 140, 22, '#5a2a6a', 'center', null);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + s.resT * 2, r = 150 + Math.sin(s.resT * 5 + i) * 10; c.fillStyle = ['#ff6f9f', '#ffd23f', '#8fd3ff', '#9be39b'][i % 4]; Art.starPath(c, W / 2 + Math.cos(a) * r, y + 100 + Math.sin(a) * r * 0.45, 9, 4); c.fill(); }
    } else {
      txt(c, '아쉬워요!', W / 2, y + 62, 44, '#8a74b0', 'center', '#fff', 7);
      txt(c, s.failText || '다시 해 볼까요?', W / 2, y + 116, 20, '#5a2a6a', 'center', null);
      button(c, 'retry', W / 2 - 200, y + 150, 180, 56, '다시 하기', { focus: s.cursor === 0 });
      button(c, 'quit', W / 2 + 20, y + 150, 180, 56, '그만하기', { focus: s.cursor === 1, c1: '#b9a6d6', c2: '#8a74b0', shadow: '#5e4a7e' });
    }
  }

  // =========================================================
  // 1. 기상 나팔 리듬
  // =========================================================
  const rhythm = {
    title: '기상 나팔 불기',
    init() {
      const bpm = 96, beat = 60 / bpm;
      const chart = [[0, 67], [1, 72], [2, 76], [3, 72], [4, 76], [4.5, 79], [5, 76], [6, 72],
        [8, 67], [9, 72], [10, 76], [11, 72], [12, 76], [12.5, 79], [13, 81], [13.5, 79], [14, 76],
        [16, 79], [17, 84], [17.5, 84], [18, 83], [19, 79], [20, 76], [21, 79], [22, 76], [22.5, 74], [23, 72], [24, 84]];
      const lead = 4 * beat;
      return { beat, notes: chart.map(([b, n]) => ({ time: lead + b * beat, n, j: null, jt: 0 })), t: -0.6, travel: 1.8, hits: 0, need: 20, pops: [],
        end: lead + 25 * beat + 0.8, lastBeat: -1, combo: 0, best: 0, flash: 0 };
    },
    update(s, dt, inp, tapId) {
      s.t += dt; s.flash = Math.max(0, s.flash - dt * 4);
      const b = Math.floor(s.t / s.beat);
      if (b !== s.lastBeat && s.t > 0 && s.t < s.end - 0.8) { s.lastBeat = b; Sound.note(b % 2 ? 55 : 48, 0.2, 'sine', 0.12); }
      for (const n of s.notes) if (!n.j && s.t - n.time > 0.2) { n.j = 'miss'; n.jt = s.t; s.combo = 0; s.pops.push({ text: '앗!', col: '#b9a6d6', t: 0 }); }
      const pressed = !tapId && (inp.shootP || inp.actP || inp.jumpP || anyTapOutside(inp));
      if (pressed && s.t > 0) {
        let best = null, bd = 0.3;
        for (const n of s.notes) if (!n.j && Math.abs(n.time - s.t) < bd) { bd = Math.abs(n.time - s.t); best = n; }
        if (best) {
          if (bd <= 0.2) {
            best.j = bd <= 0.1 ? 'perfect' : 'good'; best.jt = s.t; s.hits++; s.combo++; s.best = Math.max(s.best, s.combo); s.flash = 1;
            Sound.note(best.n, 0.3, 'square', 0.06); Sound.note(best.n - 12, 0.3, 'triangle', 0.12); sparkle(140, 340, best.j === 'perfect' ? 14 : 8);
            s.pops.push({ text: best.j === 'perfect' ? '딱 좋아!' : '좋아!', col: best.j === 'perfect' ? '#fff36a' : '#9ff0ff', t: 0 });
          } else { best.j = 'miss'; best.jt = s.t; s.combo = 0; Sound.play('wrong'); s.pops.push({ text: best.time > s.t ? '너무 빨라!' : '늦었어!', col: '#b9a6d6', t: 0 }); }
        }
      }
      for (const p of s.pops) p.t += dt;
      s.pops = s.pops.filter((p) => p.t < 0.7).slice(-3);
      if (s.t >= s.end) {
        if (s.hits >= s.need) { s.res = 'win'; s.winText = `공주님이 깨어나요! (음표 ${s.hits}/${s.notes.length})`; }
        else { s.res = 'fail'; s.failText = `음표를 ${s.hits}개 맞혔어요. ${s.need}개를 맞히면 공주님이 깨어나요!`; }
      }
    },
    draw(c, s) {
      backdrop(c, '#1f1a52', '#5a3a8a');
      for (let i = 0; i < 40; i++) { const x = (i * 137) % W, y = (i * 71) % 220 + 10; c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(T * 1.5 + i)); c.fillStyle = '#fff'; c.fillRect(x, y, 2, 2); }
      c.globalAlpha = 1;
      header(c, '기상 나팔 불기', '음표가 동그라미에 들어올 때 ♥ 버튼(스페이스·J·화면 톡)!');
      const k = Math.min(1, s.hits / s.need);
      // 장면: 나 + 공주
      const px = 150, py = 250;
      Art.drawChar(c, Object.assign({}, Mini.heroCh || Art.CH.sarang, { hold: 'trumpet' }), px, py, { t: T, facing: 1, scale: 0.8, holding: true, pose: s.flash > 0.5 ? 'cheer' : null, expr: 'determined' });
      const qx = W - 170, qy = 250, awake = s.res === 'win';
      c.save(); c.translate(qx, qy - 20); Art.roundRect(c, -110, -10, 220, 40, 18); c.fillStyle = '#ffd1e8'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#a8306a'; c.stroke(); c.restore();
      Art.drawChar(c, Art.CH.princess, qx, qy - 26 - (awake ? 0 : 6), { t: T, facing: -1, scale: 0.75, expr: awake ? 'surprised' : 'sleep', pose: awake ? 'cheer' : 'sleep', tilt: awake ? 0 : -0.3 + Math.sin(T * 8) * k * 0.08, sit: !awake });
      if (!awake) { c.globalAlpha = 1 - k * 0.7; for (let i = 0; i < 3; i++) { const q = (T * 0.45 + i / 3) % 1; c.globalAlpha = Math.sin(q * Math.PI) * (1 - k * 0.6); txt(c, 'Z', qx + 40 + q * 30, qy - 110 - q * 50, 16 + q * 14, '#fff', 'center', '#5b44a8', 3); } c.globalAlpha = 1; }
      // 레인
      const hitX = 140, laneY = 340, x1 = W - 40;
      Art.roundRect(c, 60, laneY - 34, W - 100, 68, 34); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.stroke();
      c.beginPath(); c.arc(hitX, laneY, 30 + s.flash * 6, 0, TAU); c.fillStyle = `rgba(255,220,120,${0.25 + s.flash * 0.4})`; c.fill(); c.lineWidth = 4; c.strokeStyle = '#fff36a'; c.stroke();
      for (const n of s.notes) {
        const x = hitX + (n.time - s.t) / s.travel * (x1 - hitX);
        if (n.j && n.j !== 'miss') { const a = 1 - (s.t - n.jt) * 3; if (a > 0) { Art.glowFast(c, hitX, laneY, 50, [255, 230, 120], a); } continue; }
        if (x > x1 + 30 || x < 30) continue;
        const miss = n.j === 'miss';
        c.save(); c.globalAlpha = miss ? 0.35 : 1;
        c.beginPath(); c.arc(x, laneY, 22, 0, TAU); c.fillStyle = miss ? '#8a7aa0' : '#ffd23f'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#7a4a00'; c.stroke();
        txt(c, '♪', x, laneY + 1, 24, '#7a2a00', 'center', null);
        c.restore();
      }
      for (const p of s.pops) txt(c, p.text, hitX + 10, laneY - 60 - p.t * 40, 24, p.col, 'center', 'rgba(40,10,50,0.85)', 5);
      if (s.combo >= 3) txt(c, `${s.combo} 연속!`, hitX + 110, laneY - 54, 20, '#ffb3d9', 'left', 'rgba(40,10,50,0.85)', 4);
      // 깨우기 게이지
      const gw = Math.min(520, W - 220), gx = (W - gw) / 2, gy = 430;
      txt(c, '공주님 잠 깨우기', W / 2, gy - 18, 18, '#fff');
      Art.roundRect(c, gx, gy, gw, 22, 11); c.fillStyle = 'rgba(20,8,30,0.7)'; c.fill();
      if (k > 0) { Art.roundRect(c, gx + 3, gy + 3, Math.max(16, (gw - 6) * k), 16, 8); const g = c.createLinearGradient(gx, 0, gx + gw, 0); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#ff5f9e'); c.fillStyle = g; c.fill(); }
      txt(c, `${s.hits} / ${s.need}`, gx + gw + 46, gy + 11, 18, '#fff');
      if (s.t < 0.9) txt(c, s.t < 0.3 ? '준비…' : '시작!', W / 2, 200, 40, '#fff36a', 'center', 'rgba(90,20,90,0.85)', 6);
    },
  };

  // =========================================================
  // 2. 양 세기
  // =========================================================
  const ROUNDS_SHEEP = [
    { real: [6, 8], cloud: 0, turn: 0, gap: 0.95, spd: 210 },
    { real: [7, 9], cloud: 2, turn: 1, gap: 0.8, spd: 245 },
    { real: [9, 11], cloud: 3, turn: 2, gap: 0.62, spd: 285 },
  ];
  const sheep = {
    title: '양 세기',
    init() { const s = { round: 0, cursor: 0 }; this.newRound(s); return s; },
    newRound(s) {
      const R = ROUNDS_SHEEP[s.round];
      const real = ri(R.real[0], R.real[1]);
      const kinds = [];
      for (let i = 0; i < real; i++) kinds.push({ kind: 'sheep' });
      for (let i = 0; i < R.cloud; i++) kinds.push({ kind: 'cloud' });
      for (let i = 0; i < R.turn; i++) kinds.push({ kind: 'sheep', turn: true });
      shuffle(kinds);
      if (kinds[0].turn || kinds[0].kind === 'cloud') { const j = kinds.findIndex((q) => q.kind === 'sheep' && !q.turn); [kinds[0], kinds[j]] = [kinds[j], kinds[0]]; }
      let at = 1.2;
      for (const q of kinds) { q.at = at; at += R.gap * (0.55 + Math.random() * 0.9); q.x = -70; q.st = 'wait'; q.f = 1; q.ph = Math.random() * 6; q.y = 360 + Math.random() * 40; q.pause = 0; }
      Object.assign(s, { phase: 'intro', t: 0, actors: kinds, answer: real, mine: 0, opts: null, cursor: 0, spd: R.spd, msgT: 0 });
    },
    update(s, dt, inp, tapId) {
      s.t += dt;
      const fx = W * 0.55;
      if (s.phase === 'intro') { if (s.t > 9 || tapId === 'go' || ((inp.actP || inp.shootP) && s.t > 0.4)) { s.phase = 'run'; s.t = 0; } return; }
      if (s.phase === 'run') {
        if (tapId === 'plus' || inp.shootP || inp.actP || inp.jumpP) { s.mine++; Sound.play('pop'); s.bump = 0.2; }
        if (tapId === 'minus' && s.mine > 0) { s.mine--; Sound.play('click'); }
        s.bump = Math.max(0, (s.bump || 0) - dt);
        let alive = 0;
        for (const q of s.actors) {
          if (q.st === 'wait') { if (s.t >= q.at) q.st = 'go'; else { alive++; continue; } }
          if (q.st === 'gone') continue;
          alive++;
          if (q.turn && q.st === 'go' && q.x >= fx - 110) { q.st = 'pause'; q.pause = 0.5; }
          if (q.st === 'pause') { q.pause -= dt; if (q.pause <= 0) { q.st = 'back'; q.f = -1; } continue; }
          q.x += q.f * s.spd * dt;
          if (q.x > W + 80 || q.x < -90) q.st = 'gone';
        }
        if (!alive) {
          s.phase = 'ask'; s.t = 0;
          const set = new Set([s.answer]);
          for (const d of shuffle([-2, -1, 1, 2, 3])) { if (set.size >= 4) break; if (s.answer + d > 0) set.add(s.answer + d); }
          s.opts = shuffle([...set]);
          s.cursor = 0;
        }
        return;
      }
      if (s.phase === 'ask') {
        if (inp.leftP) { s.cursor = (s.cursor + 3) % 4; Sound.play('tick'); }
        if (inp.rightP) { s.cursor = (s.cursor + 1) % 4; Sound.play('tick'); }
        let pick = null;
        if (tapId && tapId.startsWith('o')) pick = +tapId.slice(1);
        if (inp.digit >= 1 && inp.digit <= 4) pick = inp.digit - 1;
        if (pick == null && (inp.actP || inp.shootP)) pick = s.cursor;
        if (pick != null) {
          s.picked = s.opts[pick];
          if (s.picked === s.answer) { s.phase = 'right'; Sound.play('yay'); sparkle(W / 2, 250, 30); } else { s.phase = 'wrong'; Sound.play('wrong'); }
          s.t = 0;
        }
        return;
      }
      if (s.phase === 'right' && s.t > 1.5) {
        if (s.round >= ROUNDS_SHEEP.length - 1) { s.res = 'win'; s.winText = '양을 모두 정확하게 셌어요!'; }
        else { s.round++; this.newRound(s); }
      }
      if (s.phase === 'wrong' && s.t > 2.2) this.newRound(s);
    },
    draw(c, s) {
      backdrop(c, '#7cc6ff', '#ffe9f2');
      c.fillStyle = '#9ad87e'; c.fillRect(0, 330, W, H - 330);
      c.fillStyle = '#86c86a'; for (let x = 0; x < W; x += 34) { c.beginPath(); c.arc(x, 332, 20, Math.PI, 0); c.fill(); }
      header(c, `양 세기 · ${s.round + 1}/3`, s.round === 0 ? '울타리를 넘어가는 양을 세어요!' : '양만 세어요! 구름과 되돌아가는 양은 세지 않아요');
      const fx = W * 0.55;
      // 울타리
      c.fillStyle = '#fff2dc'; c.strokeStyle = '#8a6a4a'; c.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { const x = fx + i * 18; c.beginPath(); c.moveTo(x - 6, 400); c.lineTo(x - 6, 330); c.lineTo(x, 322); c.lineTo(x + 6, 330); c.lineTo(x + 6, 400); c.closePath(); c.fill(); c.stroke(); }
      c.fillRect(fx - 52, 344, 104, 9); c.strokeRect(fx - 52, 344, 104, 9); c.fillRect(fx - 52, 372, 104, 9); c.strokeRect(fx - 52, 372, 104, 9);
      // 동물
      for (const q of s.actors) {
        if (q.st === 'wait' || q.st === 'gone') continue;
        let arc = 0;
        const d = q.x - (fx - 80);
        if (q.st === 'go' && d > 0 && d < 160) arc = Math.sin(d / 160 * Math.PI) * (q.kind === 'cloud' ? 40 : 100);
        const y = 400;
        if (q.kind === 'cloud') Art2.cloud(c, q.x, y - 110 - arc, 36, { t: T + q.ph, facing: q.f, mood: 'grumpy' });
        else Art2.mon(c, { type: 'sheep', st: q.st === 'pause' ? 'idle' : 'move', f: q.f, happy: true, ph: q.ph, z: 0 }, q.x, y - arc, 1.35, T * 1.6);
        if (q.st === 'pause') txt(c, '?', q.x, y - 150, 30, '#fff36a');
      }
      if (s.phase === 'intro') {
        panel(c, W / 2 - 230, 130, 460, 150);
        txt(c, s.round === 0 ? '양이 울타리를 넘을 때마다' : '헷갈리지 않게 조심!', W / 2, 172, 22, '#5a2a6a', 'center', null);
        txt(c, '"+1" 버튼(♥)을 눌러 세어 보세요', W / 2, 206, 22, '#5a2a6a', 'center', null);
        button(c, 'go', W / 2 - 80, 226, 160, 46, '시작!', { size: 22 });
      }
      if (s.phase === 'run') {
        const bx = W - 220, by = H - 108;
        panel(c, 24, H - 90, 210, 66, 18);
        txt(c, `내가 센 수: ${s.mine}`, 129, H - 57, 24, '#5a2a6a', 'center', null);
        c.save(); if (s.bump > 0) { c.translate(bx + 95, by + 40); c.scale(1.08, 1.08); c.translate(-(bx + 95), -(by + 40)); }
        button(c, 'plus', bx, by, 190, 80, '+1 셌다!', { size: 28 }); c.restore();
        button(c, 'minus', bx - 96, by + 20, 80, 52, '-1', { c1: '#b9a6d6', c2: '#8a74b0', shadow: '#5e4a7e', size: 20 });
      }
      if (s.phase === 'ask' || s.phase === 'right' || s.phase === 'wrong') {
        const pw = Math.min(640, W - 60), px = (W - pw) / 2;
        panel(c, px, 120, pw, 230);
        txt(c, '울타리를 넘어간 양은 몇 마리였을까요?', W / 2, 160, 24, '#5a2a6a', 'center', null);
        if (s.mine) txt(c, `(내가 센 수: ${s.mine})`, W / 2, 192, 17, '#8a6a9a', 'center', null);
        const bw = (pw - 60 - 3 * 14) / 4;
        s.opts.forEach((v, i) => {
          const sel = s.phase !== 'ask' && v === s.picked, right = s.phase !== 'ask' && v === s.answer;
          button(c, 'o' + i, px + 30 + i * (bw + 14), 222, bw, 70, `${v}마리`, { focus: s.phase === 'ask' && s.cursor === i, size: 26,
            c1: right ? '#9be39b' : sel ? '#c9b4e0' : undefined, c2: right ? '#3ccf7a' : sel ? '#8a74b0' : undefined, shadow: right ? '#1f8a4a' : sel ? '#5e4a7e' : undefined });
        });
        if (s.phase === 'right') txt(c, `정답! 양은 ${s.answer}마리!`, W / 2, 322, 24, '#2a9a4a', 'center', '#fff', 4);
        if (s.phase === 'wrong') txt(c, `아쉬워요! 정답은 ${s.answer}마리. 다시 세어 봐요!`, W / 2, 322, 22, '#c0306a', 'center', '#fff', 4);
      }
    },
  };

  // =========================================================
  // 3. 눈금 맞추기 (0~50, 5씩)
  // =========================================================
  const ruler = {
    title: '눈금 맞추기',
    init() { const s = { round: 0, hearts: 3 }; this.newRound(s); return s; },
    newRound(s) {
      const vals = []; for (let v = 5; v <= 50; v += 5) vals.push(v);
      const order = s.round === 0 ? vals.slice() : vals.slice().reverse();
      const tiles = shuffle(vals.slice()).map((v, i) => ({ v, i, placed: false, fly: 0, shake: 0 }));
      Object.assign(s, { order, tiles, next: 0, cursor: 0, phase: 'play', t: 0, hearts: 3, flash: 0 });
    },
    tileRect(s, i) {
      const n1 = 5, row = i < n1 ? 0 : 1, col = row ? i - n1 : i, n = row ? s.tiles.length - n1 : n1;
      const tw = Math.min(104, (W - 120) / 5 - 14), th = 66, gap = 14;
      const x0 = (W - (n * tw + (n - 1) * gap)) / 2;
      return { x: x0 + col * (tw + gap), y: 300 + row * (th + 18), w: tw, h: th };
    },
    slotX(v) { const x0 = 90, x1 = W - 90; return x0 + (v / 50) * (x1 - x0); },
    update(s, dt, inp, tapId) {
      s.t += dt; s.flash = Math.max(0, s.flash - dt * 3);
      for (const tl of s.tiles) { if (tl.placed && tl.fly < 1) tl.fly = Math.min(1, tl.fly + dt * 3); tl.shake = Math.max(0, tl.shake - dt * 3); }
      if (s.phase === 'clear') {
        if (s.t > 1.6) { if (s.round === 0) { s.round = 1; this.newRound(s); } else { s.res = 'win'; s.winText = '왕자님의 눈금이 모두 돌아왔어요!'; } }
        return;
      }
      if (s.phase !== 'play') return;
      const left = s.tiles.filter((q) => !q.placed);
      if (!left.length) return;
      // 커서 이동
      let ci = left.indexOf(s.tiles[s.cursor]); if (ci < 0) { ci = 0; s.cursor = left[0].i; }
      if (inp.leftP || inp.upP) { ci = (ci + left.length - 1) % left.length; s.cursor = left[ci].i; Sound.play('tick'); }
      if (inp.rightP || inp.downP) { ci = (ci + 1) % left.length; s.cursor = left[ci].i; Sound.play('tick'); }
      let pick = null;
      if (tapId && tapId.startsWith('t')) pick = +tapId.slice(1);
      if (pick == null && (inp.actP || inp.shootP)) pick = s.cursor;
      if (pick == null) return;
      const tl = s.tiles[pick]; if (!tl || tl.placed) return;
      if (tl.v === s.order[s.next]) {
        tl.placed = true; tl.fly = 0; s.next++; s.flash = 1; sparkle(this.slotX(tl.v), 182, 10);
        Sound.note(60 + s.next * 2, 0.2, 'triangle', 0.16);
        const rest = s.tiles.filter((q) => !q.placed); if (rest.length) s.cursor = rest[0].i;
        if (s.next >= s.order.length) { s.phase = 'clear'; s.t = 0; Sound.play('yay'); }
      } else {
        tl.shake = 1; s.hearts--; Sound.play('wrong');
        if (s.hearts <= 0) { s.res = 'fail'; s.failText = '하트를 다 썼어요. 차례를 잘 생각해서 다시!'; }
      }
    },
    draw(c, s) {
      backdrop(c, '#f6e3b4', '#e2c48a');
      header(c, `눈금 맞추기 · ${s.round + 1}/2`, s.round === 0 ? '작은 수부터 차례로 눌러요: 5 → 10 → 15 → …' : '이번엔 거꾸로! 50 → 45 → 40 → …');
      // 큰 자
      const x0 = 60, x1 = W - 60, y = 118;
      c.save(); Art.roundRect(c, x0, y, x1 - x0, 110, 12); const g = c.createLinearGradient(0, y, 0, y + 110); g.addColorStop(0, '#fff3b8'); g.addColorStop(1, '#ffd96a'); c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = '#8a5b12'; c.stroke(); c.restore();
      c.strokeStyle = '#8a5b12'; c.lineWidth = 2;
      for (let v = 0; v <= 50; v++) { const x = this.slotX(v); const hh = v % 5 === 0 ? 34 : 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + hh); c.stroke(); }
      txt(c, '0', this.slotX(0), y + 64, 26, '#5a3a10', 'center', '#fff', 4);
      for (let v = 5; v <= 50; v += 5) {
        const x = this.slotX(v), tl = s.tiles.find((q) => q.v === v);
        if (tl.placed) {
          const r = this.tileRect(s, tl.i), k = U.easeOutCubic(tl.fly);
          const tx = U.lerp(r.x + r.w / 2, x, k), ty = U.lerp(r.y + r.h / 2, y + 64, k);
          if (k >= 1) Art.glowFast(c, x, y + 64, 26, [255, 230, 120], 0.5 + s.flash * 0.4);
          txt(c, String(v), tx, ty, 26, '#5a3a10', 'center', '#fff', 4);
        } else { c.setLineDash([4, 4]); Art.roundRect(c, x - 20, y + 46, 40, 36, 8); c.strokeStyle = 'rgba(138,91,18,0.6)'; c.stroke(); c.setLineDash([]); }
      }
      txt(c, 'cm', x1 - 18, y + 98, 15, '#8a5b12', 'center', null);
      // 왕자
      const prog = s.next / s.order.length;
      Art.drawChar(c, Art.CH.prince, W - 70, 290, { t: T, scale: 0.34, erased: s.round === 0 ? 1 - prog * 0.5 : 0.5 - prog * 0.5, expr: s.phase === 'clear' ? 'joy' : 'worried', facing: -1 });
      // 남은 하트
      for (let i = 0; i < 3; i++) heartIcon(c, 40 + i * 30, 270, 11, i < s.hearts);
      // 타일
      s.tiles.forEach((tl, i) => {
        if (tl.placed) return;
        const r = this.tileRect(s, i), sh = Math.sin(tl.shake * 30) * tl.shake * 8, foc = s.cursor === i;
        button(c, 't' + i, r.x + sh, r.y, r.w, r.h, String(tl.v), { focus: foc, size: 30, c1: '#fff6c8', c2: '#ffc93c', shadow: '#a86a00' });
      });
      if (s.phase === 'clear') txt(c, s.round === 0 ? '좋아요! 이번엔 거꾸로!' : '눈금 완성!', W / 2, 270, 30, '#ff5f9e', 'center', '#fff', 6);
    },
  };

  // =========================================================
  // 4. 길이 재기
  // =========================================================
  const OBJS = ['pencil', 'crayon', 'eraser', 'worm'];
  const fmt = (mm) => { const cm = Math.floor(mm / 10), r = mm % 10; return r ? (cm ? `${cm} cm ${r} mm` : `${r} mm`) : `${cm} cm`; };
  const measure = {
    title: '길이 재기',
    init() { const s = { round: 0, right: 0 }; this.newRound(s); return s; },
    newRound(s) {
      let st = 0, L;
      if (s.round === 0) { L = ri(4, 10) * 10; }
      else if (s.round === 1) { st = ri(1, 3) * 10; L = ri(3, 7) * 10; }
      else if (s.round === 2) { L = ri(3, 9) * 10 + 5; }
      else { st = ri(1, 3) * 10; L = ri(2, 6) * 10 + ri(1, 9); if (L % 10 === 5) L += 1; }
      const cand = s.round === 1 ? [st + L, L + 10, L - 10, L + 20] : s.round === 2 ? [L - 5, L + 10, L - 10, L + 5] : s.round === 3 ? [st + L, L + 10, L - 10, L - (L % 10)] : [L - 10, L + 10, L + 20, L - 20];
      const set = new Set([L]); for (const v of cand) { if (set.size >= 4) break; if (v > 0 && v <= 130) set.add(v); }
      let k = 20; while (set.size < 4) { set.add(L + k); k += 10; }
      Object.assign(s, { st, L, obj: OBJS[s.round % OBJS.length], opts: shuffle([...set]), cursor: 0, phase: 'q', t: 0, picked: null });
    },
    update(s, dt, inp, tapId) {
      s.t += dt;
      if (s.phase === 'q') {
        if (inp.leftP) { s.cursor = (s.cursor + 3) % 4; Sound.play('tick'); }
        if (inp.rightP) { s.cursor = (s.cursor + 1) % 4; Sound.play('tick'); }
        let pick = null;
        if (tapId && tapId.startsWith('o')) pick = +tapId.slice(1);
        if (inp.digit >= 1 && inp.digit <= 4) pick = inp.digit - 1;
        if (pick == null && (inp.actP || inp.shootP)) pick = s.cursor;
        if (pick != null) { s.picked = s.opts[pick]; s.ok = s.picked === s.L; if (s.ok) { s.right++; Sound.play('yay'); sparkle(W / 2, 390, 26); } else Sound.play('wrong'); s.phase = 'res'; s.t = 0; }
        return;
      }
      if (s.phase === 'res' && (s.t > 3.2 || (s.t > 0.8 && (tapId === 'next' || inp.actP || inp.shootP)))) {
        if (s.round >= 3) {
          if (s.right >= 3) { s.res = 'win'; s.winText = `4문제 중 ${s.right}문제 정답! 길이 재기 박사!`; }
          else { s.res = 'fail'; s.failText = `4문제 중 ${s.right}문제 맞혔어요. 3문제를 맞히면 통과!`; }
        } else { s.round++; this.newRound(s); }
      }
    },
    drawObj(c, kind, xa, xb, y) {
      const L = xb - xa;
      c.save(); c.lineWidth = 2.5; c.strokeStyle = '#3a2a1a';
      if (kind === 'pencil' || kind === 'crayon') {
        const tip = kind === 'pencil' ? Math.min(34, L * 0.25) : Math.min(22, L * 0.18), h = kind === 'pencil' ? 22 : 28;
        const col = kind === 'pencil' ? '#ffcf3a' : '#4aa8ff';
        c.fillStyle = col; c.fillRect(xa, y - h / 2, L - tip, h); c.strokeRect(xa, y - h / 2, L - tip, h);
        c.beginPath(); c.moveTo(xb - tip, y - h / 2); c.lineTo(xb, y); c.lineTo(xb - tip, y + h / 2); c.closePath(); c.fillStyle = kind === 'pencil' ? '#f3d3a3' : col; c.fill(); c.stroke();
        if (kind === 'pencil') { c.beginPath(); c.moveTo(xb - tip * 0.35, y - h * 0.18); c.lineTo(xb, y); c.lineTo(xb - tip * 0.35, y + h * 0.18); c.closePath(); c.fillStyle = '#4a4a55'; c.fill(); c.fillStyle = '#ff9db5'; c.fillRect(xa, y - h / 2, 14, h); c.strokeRect(xa, y - h / 2, 14, h); }
        else { c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(xa + L * 0.25, y - h / 2, L * 0.3, h); }
      } else if (kind === 'eraser') {
        Art.roundRect(c, xa, y - 20, L, 40, 8); c.fillStyle = '#fff'; c.fill(); c.stroke();
        c.fillStyle = '#4aa8ff'; c.fillRect(xa + L * 0.4, y - 20, L * 0.6, 40); c.strokeRect(xa + L * 0.4, y - 20, L * 0.6, 40);
      } else {
        c.strokeStyle = '#3a7a2a'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(xa + 8, y + 4);
        for (let x = xa + 8; x <= xb - 8; x += 4) c.lineTo(x, y + 4 - Math.sin((x - xa) / (L - 16) * Math.PI) * 14); c.stroke();
        c.strokeStyle = '#7fd06a'; c.lineWidth = 11; c.stroke();
        c.fillStyle = '#221a2e'; c.beginPath(); c.arc(xb - 12, y - 2, 2.5, 0, TAU); c.fill();
      }
      c.restore();
    },
    draw(c, s) {
      backdrop(c, '#d8f1ff', '#fffbea');
      header(c, `길이 재기 · ${s.round + 1}/4`, s.st ? '앗, 0이 아닌 곳에서 시작해요! 잘 보고 재어 봐요' : '자의 눈금을 읽어 길이를 알아봐요');
      const per = Math.min(46, (W - 120) / 12), x0 = (W - per * 12) / 2, ry = 250;
      // 자
      Art.roundRect(c, x0 - 16, ry, per * 12 + 32, 74, 8); c.fillStyle = '#fff3b8'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#8a5b12'; c.stroke();
      c.strokeStyle = '#8a5b12';
      for (let mm = 0; mm <= 120; mm++) {
        const x = x0 + mm / 10 * per, hh = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 20 : 11;
        c.lineWidth = mm % 10 === 0 ? 2.2 : 1.1; c.beginPath(); c.moveTo(x, ry); c.lineTo(x, ry + hh); c.stroke();
        if (mm % 10 === 0) txt(c, String(mm / 10), x, ry + 46, 18, '#5a3a10', 'center', null);
      }
      txt(c, 'cm', x0 + per * 12 + 4, ry + 64, 13, '#8a5b12', 'center', null);
      // 물건
      const xa = x0 + s.st / 10 * per, xb = x0 + (s.st + s.L) / 10 * per;
      this.drawObj(c, s.obj, xa, xb, ry - 40);
      c.setLineDash([5, 5]); c.strokeStyle = 'rgba(200,60,100,0.8)'; c.lineWidth = 2;
      for (const x of [xa, xb]) { c.beginPath(); c.moveTo(x, ry - 70); c.lineTo(x, ry); c.stroke(); }
      c.setLineDash([]);
      // 선생님
      Art.drawChar(c, Art.CH.worm, 70, 214, { t: T, scale: 0.75, facing: 1, holding: true, expr: s.phase === 'res' ? (s.ok ? 'joy' : 'worried') : 'happy' });
      const name = { pencil: '연필', crayon: '크레파스', eraser: '지우개', worm: '꼬마 자벌레' }[s.obj];
      txt(c, `이 ${name}의 길이는 얼마일까요?`, W / 2, 112, 24, '#3a5a8a', 'center', '#fff', 5);
      const pw = Math.min(700, W - 60), px = (W - pw) / 2, bw = (pw - 3 * 14) / 4;
      s.opts.forEach((v, i) => {
        const sel = s.phase === 'res' && v === s.picked, right = s.phase === 'res' && v === s.L;
        button(c, 'o' + i, px + i * (bw + 14), 362, bw, 64, fmt(v), { focus: s.phase === 'q' && s.cursor === i, size: 23,
          c1: right ? '#9be39b' : sel ? '#c9b4e0' : '#9fd6ff', c2: right ? '#3ccf7a' : sel ? '#8a74b0' : '#4a8fe8', shadow: right ? '#1f8a4a' : sel ? '#5e4a7e' : '#2a5aa8' });
      });
      txt(c, `맞힌 문제 ${s.right}`, W - 90, 452, 18, '#5a3a10', 'center', null);
      if (s.phase === 'res') {
        const exp = s.st ? `${fmt(s.st + s.L)} − ${fmt(s.st)} = ${fmt(s.L)}` : `0에서 시작하니까 끝 눈금을 읽으면 ${fmt(s.L)}`;
        panel(c, W / 2 - 300, 446, 600, 70, 18, 'rgba(255,255,255,0.96)', s.ok ? '#3ccf7a' : '#ff6fa8');
        txt(c, (s.ok ? '정답! ' : '아쉬워요! ') + exp, W / 2, 481, 21, s.ok ? '#1f8a4a' : '#c0306a', 'center', null);
      }
    },
  };

  // =========================================================
  // 5. 거울 기억
  // =========================================================
  const TONES = [72, 76, 79, 84];
  const simon = {
    title: '거울 기억',
    init() { const s = { seq: [ri(0, 3), ri(0, 3), ri(0, 3)], miss: 0, lit: [0, 0, 0, 0], cursor: 0 }; this.show(s, 1.0); return s; },
    show(s, delay) { Object.assign(s, { phase: 'show', i: 0, t: -delay, pos: 0 }); },
    light(s, k, dur = 0.42) { s.lit[k] = dur; Sound.note(TONES[k], dur + 0.1, 'sine', 0.2); Sound.note(TONES[k] + 12, dur, 'triangle', 0.05); },
    mx(i) { const gap = Math.min(190, (W - 160) / 4); return W / 2 + (i - 1.5) * gap; },
    update(s, dt, inp, tapId) {
      for (let k = 0; k < 4; k++) s.lit[k] = Math.max(0, s.lit[k] - dt);
      s.t += dt;
      const sp = s.seq.length >= 5 ? 0.5 : 0.62;
      if (s.phase === 'show') {
        if (s.t >= 0 && s.i < s.seq.length && s.t >= s.i * sp) { this.light(s, s.seq[s.i], sp * 0.7); s.i++; }
        if (s.i >= s.seq.length && s.t >= s.seq.length * sp + 0.2) { s.phase = 'input'; s.pos = 0; s.t = 0; }
        return;
      }
      if (s.phase === 'clear') { if (s.t > 1.0) { if (s.seq.length >= 6) { s.res = 'win'; s.winText = '거울 문이 열려요!'; } else { s.seq.push(ri(0, 3)); this.show(s, 0.3); } } return; }
      if (s.phase === 'wrong') { if (s.t > 1.1) this.show(s, 0.2); return; }
      if (s.phase !== 'input') return;
      if (inp.leftP) { s.cursor = (s.cursor + 3) % 4; Sound.play('tick'); }
      if (inp.rightP) { s.cursor = (s.cursor + 1) % 4; Sound.play('tick'); }
      let k = null;
      if (tapId && tapId.startsWith('m')) k = +tapId.slice(1);
      if (inp.digit >= 1 && inp.digit <= 4) k = inp.digit - 1;
      if (k == null && (inp.actP || inp.shootP)) k = s.cursor;
      if (k == null) return;
      if (k === s.seq[s.pos]) {
        this.light(s, k, 0.28); s.pos++; sparkle(this.mx(k), 280, 10);
        if (s.pos >= s.seq.length) { s.phase = 'clear'; s.t = 0; setTimeout(() => Sound.play('pickup'), 200); }
      } else {
        s.miss++; Sound.play('wrong'); s.phase = 'wrong'; s.t = 0;
        if (s.miss >= 3) { s.res = 'fail'; s.failText = '순서가 헷갈렸어요. 천천히 다시 기억해 봐요!'; }
      }
    },
    draw(c, s) {
      backdrop(c, '#24103a', '#4a2a72');
      header(c, `거울 기억 · ${s.seq.length - 2}/4`, '거울이 빛나는 순서를 기억했다가 똑같이 눌러요!');
      const by = 360;
      for (let i = 0; i < 4; i++) {
        const x = this.mx(i), lit = Math.min(1, s.lit[i] * 4);
        Art2.mirror(c, x, by, 1.05, T, lit, i, false);
        btns.push({ id: 'm' + i, x: x - 48, y: by - 170, w: 96, h: 180 });
        if (s.phase === 'input' && s.cursor === i) { c.strokeStyle = '#fff36a'; c.lineWidth = 4; Art.roundRect(c, x - 52, by - 176, 104, 184, 40); c.stroke(); }
        txt(c, String(i + 1), x, by + 28, 22, '#ffe680');
      }
      for (let i = 0; i < 3; i++) heartIcon(c, 40 + i * 30, 112, 11, i >= s.miss);
      const msg = s.phase === 'show' ? '잘 보세요…' : s.phase === 'input' ? `이제 따라 해요! (${s.pos}/${s.seq.length})` : s.phase === 'clear' ? '맞았어요!' : '앗, 틀렸어요! 다시 보여 줄게요';
      txt(c, msg, W / 2, 440, 26, s.phase === 'wrong' ? '#ffb3c8' : '#fff36a', 'center', 'rgba(20,0,40,0.85)', 5);
      Art.drawChar(c, Mini.heroCh || Art.CH.sarang, 80, 500, { t: T, scale: 0.6, facing: 1, expr: s.phase === 'wrong' ? 'worried' : 'determined', pose: s.phase === 'clear' ? 'cheer' : null });
    },
  };

  const GAMES = { rhythm, sheep, ruler, measure, simon };

  // ---------- 바깥에서 쓰는 부분 ----------
  function start(name, opts, cb) {
    const g = GAMES[name];
    cur = { name, g, s: g.init(opts || {}), cb, pressId: null, pressT: 0 };
    cur.s.resT = 0; cur.s.cursor = 0;
    lastBtns = []; btns = [];
    Sound.playMusic('mini');
  }
  function finish(win) {
    const c = cur; cur = null;
    if (c && c.cb) c.cb(win);
  }
  function update(dt, inp) {
    if (!cur) return;
    T += dt;
    cur.pressT = Math.max(0, cur.pressT - dt);
    const s = cur.s;
    const id = tapped(inp);
    if (id === 'close') { finish(false); return; }
    if (s.res) {
      s.resT += dt;
      if (s.res === 'win') { if (s.resT > 0.05 && !s.played) { s.played = true; Sound.play('fanfare'); } if (s.resT > 1.9) finish(true); return; }
      if (inp.leftP || inp.rightP) { s.cursor = s.cursor ? 0 : 1; Sound.play('tick'); }
      let pick = id === 'retry' ? 0 : id === 'quit' ? 1 : null;
      if (pick == null && (inp.actP || inp.shootP) && s.resT > 0.5) pick = s.cursor || 0;
      if (pick === 0) { const cb = cur.cb, g = cur.g; cur.s = g.init({}); cur.s.resT = 0; cur.s.cursor = 0; cur.cb = cb; }
      else if (pick === 1) finish(false);
      return;
    }
    cur.g.update(s, dt, inp, id);
  }
  function draw(c, w, h) {
    if (!cur) return;
    W = w; H = h; lastBtns = btns; btns = [];
    c.save();
    cur.g.draw(c, cur.s);
    if (cur.s.res) { if (cur.s.res === 'win' && !cur.s.burst) { cur.s.burst = true; sparkle(W / 2, H / 2 - 40, 60); } resultCard(c, cur.s); }
    else closeBtn(c);
    drawSparks(c, 1 / 60);
    c.restore();
  }
  return { start, update, draw, get active() { return !!cur; }, get name() { return cur ? cur.name : ''; }, cancel() { cur = null; }, heroCh: null,
    // 테스트용
    _cur() { return cur; } };
})();
