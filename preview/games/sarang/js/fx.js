'use strict';
// 효과: 반짝이·하트·충격파·의성어·잔상·화면 번쩍
const FX = (() => {
  const TAU = Math.PI * 2;
  const F = (px) => `${px}px Jua, "Noto Sans KR", sans-serif`;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let parts = [], floor = [], screen = [], afters = [];
  let MAX = 700, K = 1;   // 자동 화질(game.js)이 낮추면 효과 알갱이 수·최대 개수를 줄임(setK)
  const PHYS = {
    heart: [260, 0.6], spark: [180, 1.2], star: [120, 1.0], line: [0, 7], confetti: [90, 1.4, 1], dust: [-20, 3], smoke: [-34, 2.6],
    feather: [36, 2.2, 1], petal: [46, 2, 1], leaf: [56, 2, 1], paper: [64, 2, 1], chip: [560, 0.4], drop: [640, 0.2], bubble: [-60, 1],
    note: [-50, 1.2], ink: [420, 0.6], text: [0, 0], word: [0, 0], glow: [0, 0], shock: [0, 0], num: [200, 0.8], ring: [0, 0],
  };
  const COLS = { heart: ['#ff6f9f', '#ff9cc6', '#ff4f8a', '#ffd1e6'], spark: ['#fff36a', '#ffffff', '#ffd1e6'], confetti: ['#ff6f9f', '#ffd23f', '#8fd3ff', '#c9a2ff', '#7dffb0'],
    feather: ['#ffffff', '#f3ecff'], petal: ['#ffb3cd', '#ffd1e6', '#ff8fb8'], leaf: ['#7ccf6a', '#a8e09a'], paper: ['#ffffff'], chip: ['#c98a4a', '#e0a868', '#8a5a2a'], drop: ['#9fd6ff', '#cfeaff'], ink: ['#3a2a6a', '#5a4a9a'] };
  function add(list, p) { p.t = 0; list.push(p); if (list === parts && parts.length > MAX) parts.splice(0, parts.length - MAX); return p; }

  function burst(x, y, z, kind, n, o = {}) {
    if (K < 1 && n > 1) n = Math.max(1, Math.round(n * K));
    const ph = PHYS[kind] || [200, 1];
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + R(-0.6, 0.6) : Math.random() * TAU, sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
      add(parts, { kind, x: x + R(-(o.spread || 4), o.spread || 4), y: y + R(-4, 4), z: z + R(-(o.zs || 0), o.zs || 0), vx: Math.cos(a) * sp, vy: R(-30, 30) * (o.vyk || 1), vz: Math.abs(Math.sin(a)) * sp * 1.2 + (o.up == null ? 60 : o.up),
        life: (o.life || 0.9) * (0.7 + Math.random() * 0.6), s: (o.size || 7) * (0.6 + Math.random() * 0.8), g: o.g == null ? ph[0] : o.g, drag: ph[1], sway: ph[2] || 0,
        col: o.col || (COLS[kind] ? pick(COLS[kind]) : '#fff'), rot: Math.random() * 6, vr: R(-6, 6), ph: Math.random() * 6 });
    }
  }
  function text(x, y, z, t, col, o = {}) { add(parts, { kind: 'text', x, y, z, vx: 0, vy: 0, vz: o.vz || 90, g: 0, drag: 2.2, life: o.life || 1.0, text: t, col, size: o.size || 21, big: o.big }); }
  function word(x, y, z, t, col, size) { add(parts, { kind: 'word', x: x + R(-10, 10), y, z, vx: 0, vy: 0, vz: 40, g: 0, drag: 2, life: 0.62, text: t, col: col || '#fff36a', size: size || 30, rot: R(-0.28, 0.28) }); }
  function glow(x, y, z, r, rgb, life) { add(parts, { kind: 'glow', x, y, z, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: life || 0.25, r, rgb }); }
  function shock(x, y, z, r1, life, col, w) { add(parts, { kind: 'shock', x, y, z, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, life: life || 0.35, r1, col: col || '#fff', w: w || 6 }); }
  function ring(x, y, r1, life, col, w) { add(floor, { kind: 'ring', x, y, r1, life: life || 0.5, col: col || '#fff', w: w || 5 }); }
  function beam(x, y, col, life) { add(floor, { kind: 'beam', x, y, col: col || 'rgba(255,240,150,', life: life || 1.2 }); }
  function scorch(x, y, r, col, life) { add(floor, { kind: 'scorch', x, y, r, col: col || 'rgba(60,30,80,', life: life || 1.6 }); }
  function dust(x, y, n, col) { for (let i = 0; i < n; i++) add(parts, { kind: 'dust', x: x + R(-14, 14), y: y + R(-4, 4), z: R(0, 6), vx: R(-60, 60), vy: R(-10, 10), vz: R(10, 40), g: -20, drag: 3, life: R(0.35, 0.6), s: R(5, 9), col: col || '#fff8ee' }); }
  function poof(x, y, z, n, col) { for (let i = 0; i < n; i++) { const a = i / n * TAU; add(parts, { kind: 'smoke', x: x + Math.cos(a) * 16, y: y + Math.sin(a) * 6, z: z + R(0, 20), vx: Math.cos(a) * R(40, 90), vy: Math.sin(a) * 20, vz: R(20, 60), g: -34, drag: 2.6, life: R(0.45, 0.75), s: R(10, 16), col: col || 'rgba(255,255,255,0.85)' }); } }
  function trail(x, y, z, kind, col, s, life) { add(parts, { kind, x, y, z, vx: 0, vy: 0, vz: kind === 'star' ? -10 : 0, g: 0, drag: 0, life: life || 0.3, s: s || 5, col, rot: Math.random() * 6, vr: 0, ph: 0 }); }
  function after(draw, life) { add(afters, { draw, life: life || 0.22 }); }
  function flash(col, a, life) { add(screen, { kind: 'flash', col, a, life: life || 0.25 }); }
  const HIT_SMALL = ['팡!', '퐁!', '콩!', '뿅!'], HIT_BIG = ['쾅!', '빠밤!', '두둥!'], KILL = ['반짝!', '뿅~', '샤랄라!', '깨끗!'];
  function hit(x, y, z, big, col) {
    const n = big ? 10 : 6;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + R(-0.2, 0.2), sp = R(big ? 260 : 180, big ? 420 : 300); add(parts, { kind: 'line', x, y, z, vx: Math.cos(a) * sp, vy: 0, vz: Math.sin(a) * sp, g: 0, drag: 7, life: R(0.16, 0.26), s: big ? 7 : 5, col: col || '#fff7c2' }); }
    burst(x, y, z, 'spark', big ? 6 : 3, { speed: 160, life: 0.45, size: big ? 8 : 6 });
    glow(x, y, z, big ? 70 : 40, [255, 230, 160], big ? 0.22 : 0.14);
    if (big) shock(x, y, z, 70, 0.28, '#fff', 5);
    if (Math.random() < (big ? 1 : 0.45)) word(x, y, z + 30, pick(big ? HIT_BIG : HIT_SMALL), big ? '#ffd23f' : '#fff', big ? 34 : 24);
  }
  function purify(x, y, z) {
    burst(x, y, z + 30, 'heart', 10, { speed: 190, size: 7, life: 0.9 });
    burst(x, y, z + 30, 'star', 6, { speed: 150, size: 7, life: 0.8, up: 120 });
    glow(x, y, z + 30, 80, [255, 200, 230], 0.3);
    shock(x, y, z + 30, 60, 0.3, '#ffd1e6', 4);
    word(x, y, z + 70, pick(KILL), '#ff9cc6', 26);
  }

  function update(dt) {
    for (const p of parts) {
      p.t += dt;
      if (p.kind === 'glow' || p.kind === 'shock') continue;
      const dk = Math.max(0, 1 - p.drag * dt);
      p.vx *= dk; p.vy *= dk; if (p.g <= 0 || p.kind === 'text' || p.kind === 'word') p.vz *= dk;
      p.vz -= p.g * dt;
      p.x += p.vx * dt + (p.sway ? Math.sin(p.t * 5 + p.ph) * 26 * dt : 0); p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
      if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; if (p.kind === 'drop' || p.kind === 'ink') p.t = p.life; }
    }
    parts = parts.filter((p) => p.t < p.life);
    for (const p of floor) p.t += dt;
    floor = floor.filter((p) => p.t < p.life);
    for (const p of screen) p.t += dt;
    screen = screen.filter((p) => p.t < p.life);
    for (const p of afters) p.t += dt;
    afters = afters.filter((p) => p.t < p.life);
  }
  function drawFloor(c, camX) {
    for (const p of floor) {
      const sx = p.x - camX, k = p.t / p.life;
      if (sx < -500 || sx > c.canvas.width + 500) continue;
      c.save();
      if (p.kind === 'ring') {
        const r = p.r1 * U.easeOutCubic(k);
        c.globalAlpha = (1 - k) * 0.9; c.lineWidth = p.w * (1 - k * 0.6); c.strokeStyle = p.col;
        c.beginPath(); c.ellipse(sx, p.y, r, r * 0.42, 0, 0, TAU); c.stroke();
      } else if (p.kind === 'beam') {
        const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8, w = 70 * (1 - k * 0.5);
        const g = c.createLinearGradient(sx - w, 0, sx + w, 0); g.addColorStop(0, p.col + '0)'); g.addColorStop(0.5, p.col + (0.75 * a) + ')'); g.addColorStop(1, p.col + '0)');
        c.fillStyle = g; c.fillRect(sx - w, 0, w * 2, p.y);
      } else if (p.kind === 'scorch') {
        c.globalAlpha = (1 - k) * 0.5; c.fillStyle = p.col + '0.6)'; c.beginPath(); c.ellipse(sx, p.y, p.r, p.r * 0.4, 0, 0, TAU); c.fill();
      }
      c.restore();
    }
  }
  function draw(c, camX, dscale, W) {
    for (const a of afters) { const k = a.t / a.life; c.save(); c.globalAlpha = (1 - k) * 0.45; a.draw(c, camX); c.restore(); }
    for (const p of parts) {
      const sx = p.x - camX; if (sx < -80 || sx > W + 80) continue;
      const s = dscale(p.y), sy = p.y - p.z * s, k = p.t / p.life, a = 1 - k;
      switch (p.kind) {
        case 'heart': c.globalAlpha = a; Art.heartPath(c, sx, sy, p.s); c.fillStyle = p.col; c.fill(); break;
        case 'spark': c.globalAlpha = a; c.fillStyle = p.col; Art.starPath(c, sx, sy, p.s, p.s * 0.32, 4, p.rot); c.fill(); break;
        case 'star':
          c.globalAlpha = a; Art.glowFast(c, sx, sy, p.s * 2.6, [255, 240, 170], a * 0.6);
          c.fillStyle = p.col === '#fff' ? '#fff8c8' : p.col; Art.starPath(c, sx, sy, p.s, p.s * 0.45, 5, p.rot); c.fill(); break;
        case 'line': {
          const L = Math.hypot(p.vx, p.vz) * 0.035 + 2;
          c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = p.s * a + 1; c.lineCap = 'round';
          c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - p.vx / (Math.hypot(p.vx, p.vz) || 1) * L, sy + p.vz / (Math.hypot(p.vx, p.vz) || 1) * L); c.stroke(); break;
        }
        case 'confetti': c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); break;
        case 'dust': c.globalAlpha = a * 0.55; c.fillStyle = p.col; c.beginPath(); c.arc(sx, sy, p.s * (1 + k * 1.6), 0, TAU); c.fill(); break;
        case 'smoke': c.globalAlpha = a * 0.7; c.fillStyle = p.col; c.beginPath(); c.arc(sx, sy, p.s * (1 + k * 1.4), 0, TAU); c.fill(); break;
        case 'feather': c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(Math.sin(p.t * 4 + p.ph) * 0.8); c.fillStyle = p.col; c.beginPath(); c.ellipse(0, 0, p.s * 1.3, p.s * 0.45, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(120,100,160,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-p.s * 1.3, 0); c.lineTo(p.s * 1.3, 0); c.stroke(); c.restore(); break;
        case 'petal': case 'leaf': c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.beginPath(); c.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); c.fill(); c.restore(); break;
        case 'paper': c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = '#fff'; c.fillRect(-p.s, -p.s * 0.7, p.s * 2, p.s * 1.4); c.strokeStyle = '#8fb0e8'; c.lineWidth = 1; c.strokeRect(-p.s, -p.s * 0.7, p.s * 2, p.s * 1.4); c.restore(); break;
        case 'chip': c.save(); c.globalAlpha = a; c.translate(sx, sy); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s * 0.7, -p.s * 0.35, p.s * 1.4, p.s * 0.7); c.restore(); break;
        case 'drop': c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(sx, sy, p.s * 0.5, 0, TAU); c.fill(); break;
        case 'ink': c.globalAlpha = a; c.fillStyle = p.col; c.beginPath(); c.arc(sx, sy, p.s * 0.6, 0, TAU); c.fill(); break;
        case 'bubble': c.globalAlpha = a; c.strokeStyle = p.col === '#fff' ? 'rgba(220,200,255,0.9)' : p.col; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, p.s, 0, TAU); c.stroke(); break;
        case 'note': c.globalAlpha = a; c.fillStyle = p.col; c.font = F(p.s * 3); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♪', sx, sy); break;
        case 'glow': c.globalAlpha = 1; Art.glowFast(c, sx, sy, p.r * (0.7 + k * 0.6), p.rgb, a); break;
        case 'shock': { const r = p.r1 * U.easeOutCubic(k); c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = p.w * a + 1; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.stroke(); break; }
        case 'text': {
          const pop = k < 0.12 ? 1 + (1 - k / 0.12) * 0.7 : 1, fs = p.size * pop;
          c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
          c.font = F(fs); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          c.lineWidth = 5; c.strokeStyle = 'rgba(50,16,60,0.9)'; c.strokeText(p.text, sx, sy); c.fillStyle = p.col; c.fillText(p.text, sx, sy); break;
        }
        case 'word': {
          const pop = k < 0.15 ? U.easeOutBack(k / 0.15) : 1, fs = p.size;
          c.save(); c.globalAlpha = k > 0.65 ? (1 - k) / 0.35 : 1; c.translate(sx, sy); c.rotate(p.rot); c.scale(pop, pop);
          c.font = F(fs); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          c.lineWidth = 9; c.strokeStyle = '#3a1a4a'; c.strokeText(p.text, 0, 0);
          c.lineWidth = 4; c.strokeStyle = '#ffffff'; c.strokeText(p.text, 0, 0);
          c.fillStyle = p.col; c.fillText(p.text, 0, 0); c.restore(); break;
        }
      }
    }
    c.globalAlpha = 1;
  }
  function drawScreen(c, W, H) {
    for (const p of screen) { const k = p.t / p.life; c.globalAlpha = p.a * (1 - k); c.fillStyle = p.col; c.fillRect(0, 0, W, H); }
    c.globalAlpha = 1;
  }
  function setK(k) { K = k; MAX = Math.round(700 * k); }
  return { setK, burst, text, word, glow, shock, ring, beam, scorch, dust, poof, trail, after, flash, hit, purify, update, drawFloor, draw, drawScreen,
    clear() { parts = []; floor = []; afters = []; }, get count() { return parts.length; } };
})();
