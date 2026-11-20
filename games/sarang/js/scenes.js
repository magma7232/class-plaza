'use strict';
// 맵 배경 12종 — 여러 겹 시차 스크롤(2.5D 깊이감)
const Scenes = (() => {
  const TAU = Math.PI * 2;
  const MAXW = 1200;
  let RS = 1.5;
  const { heartPath, roundRect, starPath, glow, glowFast, flower } = Art;

  function chunked(w, h, y0, painter) {
    const cw = Math.floor(2000 / RS), chunks = [];
    for (let x = 0; x < w; x += cw) {
      const ww = Math.min(cw + 6, w - x);
      const cv = document.createElement('canvas'); cv.width = Math.ceil(ww * RS); cv.height = Math.ceil(h * RS);
      const c = cv.getContext('2d'); c.scale(RS, RS); c.translate(-x, -y0);
      painter(c, x - 90, x + ww + 90);
      chunks.push({ cv, x, w: ww });
    }
    return { chunks, w, h, y0 };
  }
  function drawLayer(ctx, L, off, W) {
    for (const ch of L.chunks) { const sx = ch.x - off; if (sx > W + 2 || sx + ch.w < -2) continue; ctx.drawImage(ch.cv, sx, L.y0, ch.w, L.h); }
  }
  const lw = (f, mapW) => mapW * f + MAXW * (1 - f) + 120;
  function sprite(w, h, fn) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * RS); cv.height = Math.ceil(h * RS); const c = cv.getContext('2d'); c.scale(RS, RS); fn(c); return { cv, w, h }; }
  const vis = (x, x0, x1, m = 220) => x > x0 - m && x < x1 + m;
  function hill(c, x0, x1, base, waves, bottom, fill) {
    c.beginPath(); c.moveTo(x0, bottom);
    for (let x = x0; x <= x1 + 8; x += 8) { let y = base; for (const [f, a, p] of waves) y += Math.sin(x * f + (p || 0)) * a; c.lineTo(x, y); }
    c.lineTo(x1 + 8, bottom); c.closePath(); c.fillStyle = fill; c.fill();
  }
  function blobs(c, list, outline, ow, fillFn) {
    c.fillStyle = outline; for (const [x, y, r] of list) { c.beginPath(); c.arc(x, y, r + ow, 0, TAU); c.fill(); }
    for (const [x, y, r] of list) { c.fillStyle = fillFn(x, y, r); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }
  const vg = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  function tuft(c, x, y, s, col) {
    c.strokeStyle = col; c.lineWidth = 2 * s; c.lineCap = 'round'; c.beginPath();
    c.moveTo(x - 5 * s, y); c.quadraticCurveTo(x - 6 * s, y - 7 * s, x - 9 * s, y - 12 * s); c.moveTo(x, y); c.lineTo(x + 1 * s, y - 15 * s);
    c.moveTo(x + 5 * s, y); c.quadraticCurveTo(x + 6 * s, y - 7 * s, x + 10 * s, y - 11 * s); c.stroke();
  }
  function tinyFlower(c, x, y, s, col) {
    c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 3 * s, y + Math.sin(a) * 2.2 * s, 2.2 * s, 0, TAU); c.fill(); }
    c.fillStyle = '#ffe066'; c.beginPath(); c.arc(x, y, 1.6 * s, 0, TAU); c.fill();
  }
  const dS = (y) => 0.6 + (y - 300) / 240 * 0.6;

  // ---------- 공통 소품 ----------
  function fluffyTree(c, x, base, s, [light, dark], seed, trunk = ['#9a6a86', '#6a3f5e', '#4a2a44']) {
    const top = base - 150 * s;
    c.beginPath(); c.moveTo(x - 13 * s, base); c.quadraticCurveTo(x - 6 * s, base - 70 * s, x - 9 * s, top); c.lineTo(x + 9 * s, top); c.quadraticCurveTo(x + 6 * s, base - 70 * s, x + 13 * s, base); c.closePath();
    const tg = c.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0); tg.addColorStop(0, trunk[0]); tg.addColorStop(1, trunk[1]); c.fillStyle = tg; c.fill(); c.lineWidth = 2.5; c.strokeStyle = trunk[2]; c.stroke();
    const cy = top - 22 * s;
    const bl = [[0, 0, 60], [-50, 18, 44], [50, 16, 46], [-28, -36, 42], [30, -38, 44], [0, 28, 46], [-68, -4, 32], [70, -2, 32]].map(([dx, dy, r]) => [x + dx * s, cy + dy * s, r * s]);
    blobs(c, bl, 'rgba(60,30,90,0.5)', 3, (bx, by, r) => { const g = c.createRadialGradient(bx - r * 0.35, by - r * 0.4, r * 0.1, bx, by, r); g.addColorStop(0, light); g.addColorStop(1, dark); return g; });
    const R = U.rng(Math.floor(seed * 1000) + 7);
    for (let i = 0; i < 12; i++) { const a = R() * TAU, d = R() * 70 * s; c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, (2 + R() * 2.5) * s, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.ellipse(x - 26 * s, cy - 46 * s, 22 * s, 10 * s, -0.4, 0, TAU); c.fill();
  }
  function giantFlower(c, x, base, h, col) {
    c.strokeStyle = '#3f8f56'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + 18, base - h * 0.5, x + 4, base - h); c.stroke();
    c.fillStyle = '#5cc477'; c.strokeStyle = '#2d6b3f'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x - 16, base - h * 0.35, 20, 8, 0.6, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(x + 22, base - h * 0.55, 18, 7, -0.6, 0, TAU); c.fill(); c.stroke();
    const fx = x + 4, fy = base - h;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.ellipse(fx + Math.cos(a) * 18, fy + Math.sin(a) * 18, 18, 11, a, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(90,40,90,0.55)'; c.stroke(); }
    c.beginPath(); c.arc(fx, fy, 11, 0, TAU); c.fillStyle = '#ffe066'; c.fill(); c.stroke();
  }
  function mushroom(c, x, base, s, col, glowOn = true) {
    if (glowOn) glowFast(c, x, base - 22 * s, 40 * s, [255, 200, 240], 0.45);
    c.fillStyle = '#fff4e4'; c.strokeStyle = '#6b4a35'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 7 * s, base); c.lineTo(x - 5 * s, base - 22 * s); c.lineTo(x + 5 * s, base - 22 * s); c.lineTo(x + 7 * s, base); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 24 * s, base - 20 * s); c.bezierCurveTo(x - 24 * s, base - 50 * s, x + 24 * s, base - 50 * s, x + 24 * s, base - 20 * s); c.closePath(); c.fillStyle = col; c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - 9 * s, base - 33 * s, 4 * s, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 8 * s, base - 37 * s, 3 * s, 0, TAU); c.fill();
  }
  function lanterns(c, x1, y1, x2, y2, col = [255, 230, 140]) {
    const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 40;
    c.strokeStyle = 'rgba(90,60,120,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
    for (let k = 1; k < 6; k++) {
      const tt = k / 6, x = (1 - tt) * (1 - tt) * x1 + 2 * (1 - tt) * tt * mx + tt * tt * x2, y = (1 - tt) * (1 - tt) * y1 + 2 * (1 - tt) * tt * my + tt * tt * y2;
      glow(c, x, y + 10, 22, col, 0.75); starPath(c, x, y + 11, 7, 3.2); c.fillStyle = U.rgba(col, 1); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#b88a10'; c.stroke();
    }
  }
  function bunting(c, x1, x2, y, cols) {
    const mx = (x1 + x2) / 2, my = y + 30;
    c.strokeStyle = '#7a5a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo(mx, my, x2, y); c.stroke();
    const n = Math.max(4, Math.floor((x2 - x1) / 28));
    for (let i = 0; i < n; i++) {
      const tt = (i + 0.5) / n, x = (1 - tt) * (1 - tt) * x1 + 2 * (1 - tt) * tt * mx + tt * tt * x2, yy = (1 - tt) * (1 - tt) * y + 2 * (1 - tt) * tt * my + tt * tt * y;
      c.beginPath(); c.moveTo(x - 9, yy); c.lineTo(x + 9, yy); c.lineTo(x, yy + 18); c.closePath(); c.fillStyle = cols[i % cols.length]; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(80,40,40,0.5)'; c.stroke();
    }
  }
  function fence(c, x0, x1, base, col = '#f2e2c4', edge = '#8a6a4a') {
    c.fillStyle = col; c.strokeStyle = edge; c.lineWidth = 2;
    for (let x = x0; x < x1; x += 34) { c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - 42); c.lineTo(x + 7, base - 50); c.lineTo(x + 14, base - 42); c.lineTo(x + 14, base); c.closePath(); c.fill(); c.stroke(); }
    c.fillRect(x0 - 4, base - 34, x1 - x0, 6); c.strokeRect(x0 - 4, base - 34, x1 - x0, 6); c.fillRect(x0 - 4, base - 16, x1 - x0, 6); c.strokeRect(x0 - 4, base - 16, x1 - x0, 6);
  }
  function house(c, x, base, s, style, seed) {
    const R = U.rng(seed);
    c.save(); c.translate(x, base); c.scale(s, s);
    if (style === 'pencil') {
      const w = 70, h = 150;
      c.fillStyle = ['#ffcf3a', '#7fc8ff', '#ff8fb8', '#9be39b'][seed % 4]; c.fillRect(-w / 2, -h, w, h);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-w * 0.12, -h, w * 0.24, h); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(w * 0.25, -h, w * 0.25, h);
      c.lineWidth = 3; c.strokeStyle = '#6b4a20'; c.strokeRect(-w / 2, -h, w, h);
      c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(0, -h - 70); c.lineTo(w / 2, -h); c.closePath(); c.fillStyle = '#f3d3a3'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-w * 0.17, -h - 46); c.lineTo(0, -h - 70); c.lineTo(w * 0.17, -h - 46); c.closePath(); c.fillStyle = '#4a4a55'; c.fill();
      c.fillStyle = '#c9ced8'; c.fillRect(-w / 2, -26, w, 10); c.strokeRect(-w / 2, -26, w, 10);
      roundRect(c, -14, -50, 28, 50, 10); c.fillStyle = '#8a5a34'; c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -100, 13, 0, TAU); c.fillStyle = '#fff6c0'; c.fill(); c.stroke();
    } else if (style === 'pillow') {
      const w = 150, h = 104;
      c.beginPath(); c.moveTo(-w / 2, -h * 0.05); c.quadraticCurveTo(-w * 0.58, -h * 0.55, -w / 2, -h); c.quadraticCurveTo(0, -h - 20, w / 2, -h); c.quadraticCurveTo(w * 0.58, -h * 0.55, w / 2, -h * 0.05); c.quadraticCurveTo(0, 8, -w / 2, -h * 0.05); c.closePath();
      c.fillStyle = vg(c, -h, 0, ['#fff4fb', '#f2f0ff', '#fff8e8'][seed % 3], ['#e6c8e8', '#c8c0ee', '#f0d8b0'][seed % 3]); c.fill(); c.lineWidth = 3; c.strokeStyle = '#7a6098'; c.stroke();
      c.fillStyle = '#ffd1e6'; for (const [px, py] of [[-w / 2, -h], [w / 2, -h]]) { c.beginPath(); c.arc(px, py, 8, 0, TAU); c.fill(); c.stroke(); }
      roundRect(c, -16, -60, 32, 58, 14); c.fillStyle = '#8fb4ff'; c.fill(); c.stroke();
      c.beginPath(); c.arc(-46, -64, 14, 0, TAU); c.fillStyle = '#fff2a8'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-60, -64); c.lineTo(-32, -64); c.moveTo(-46, -78); c.lineTo(-46, -50); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-30, -h + 14, 26, 8, -0.2, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(30, -h - 6); c.lineTo(30, -h - 50); c.stroke(); c.fillStyle = '#ffb3d9'; c.beginPath(); c.moveTo(30, -h - 50); c.lineTo(52, -h - 42); c.lineTo(30, -h - 34); c.fill();
    } else if (style === 'crooked') {
      const w = 110, h = 130;
      c.save(); c.rotate((R() - 0.5) * 0.12);
      c.fillStyle = vg(c, -h, 0, '#6a4a8a', '#3d2660'); c.fillRect(-w / 2, -h, w, h); c.lineWidth = 3; c.strokeStyle = '#1a0d2a'; c.strokeRect(-w / 2, -h, w, h);
      c.beginPath(); c.moveTo(-w / 2 - 14, -h); c.lineTo(-w * 0.1, -h - 80); c.lineTo(w / 2 + 14, -h + 4); c.closePath(); c.fillStyle = '#2a1442'; c.fill(); c.stroke();
      roundRect(c, -16, -56, 32, 56, 14); c.fillStyle = '#1a0d2a'; c.fill();
      for (const [wx, wy] of [[-30, -100], [26, -96]]) { c.fillStyle = R() < 0.5 ? '#ffb3ff' : '#6a5a8a'; c.fillRect(wx - 10, wy - 10, 20, 20); c.strokeRect(wx - 10, wy - 10, 20, 20); }
      c.strokeStyle = '#2f5a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-w / 2, -10); c.quadraticCurveTo(-w / 2 - 20, -60, -w / 2 + 6, -110); c.stroke();
      c.restore();
    } else { // heart house
      const w = 130, h = 92, roof = ['#ff6f91', '#ff9a5c', '#b38aff', '#5fb6ff'][seed % 4];
      c.fillStyle = vg(c, -h, 0, '#fff7ec', '#f0dcc0'); c.fillRect(-w / 2, -h, w, h); c.lineWidth = 3; c.strokeStyle = '#7a5a3a'; c.strokeRect(-w / 2, -h, w, h);
      c.beginPath(); c.moveTo(-w / 2 - 16, -h + 4); c.lineTo(0, -h - 64); c.lineTo(w / 2 + 16, -h + 4); c.closePath(); c.fillStyle = roof; c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(0, -h - 54); c.lineTo(-10, -h - 40); c.lineTo(-w / 2 + 10, -h); c.fill();
      roundRect(c, -16, -56, 32, 56, 14); c.fillStyle = '#9b5e34'; c.fill(); c.stroke();
      heartPath(c, -40, -54, 12); c.fillStyle = '#fff2a8'; c.fill(); c.stroke(); heartPath(c, 40, -54, 12); c.fill(); c.stroke();
      c.fillStyle = '#b88a6a'; c.fillRect(24, -h - 48, 14, 30); c.strokeRect(24, -h - 48, 14, 30);
    }
    c.restore();
  }
  function cottonTree(c, x, base, s, col) {
    c.strokeStyle = '#f2e2c4'; c.lineWidth = 7 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - 120 * s); c.stroke();
    c.strokeStyle = '#c8a8a0'; c.lineWidth = 2; c.stroke();
    blobs(c, [[x - 30 * s, base - 140 * s, 34 * s], [x + 26 * s, base - 145 * s, 36 * s], [x, base - 175 * s, 40 * s], [x, base - 130 * s, 32 * s]], 'rgba(150,90,140,0.4)', 2.5,
      (bx, by, r) => { const g = c.createRadialGradient(bx - r * 0.3, by - r * 0.3, 2, bx, by, r); g.addColorStop(0, '#fff'); g.addColorStop(1, col); return g; });
  }
  function giantPencil(c, x, base, s, col, tilt) {
    c.save(); c.translate(x, base); c.rotate(tilt); c.scale(s, s);
    const w = 44, h = 260;
    c.fillStyle = col; c.fillRect(-w / 2, -h, w, h - 30); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-6, -h, 12, h - 30); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(10, -h, 12, h - 30);
    c.lineWidth = 3; c.strokeStyle = 'rgba(60,40,20,0.8)'; c.strokeRect(-w / 2, -h, w, h - 30);
    c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(0, -h - 60); c.lineTo(w / 2, -h); c.closePath(); c.fillStyle = '#f3d3a3'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-8, -h - 42); c.lineTo(0, -h - 60); c.lineTo(8, -h - 42); c.closePath(); c.fillStyle = col; c.fill();
    c.fillStyle = '#c9ced8'; c.fillRect(-w / 2, -30, w, 14); c.strokeRect(-w / 2, -30, w, 14);
    c.fillStyle = '#ff9db5'; c.fillRect(-w / 2, -16, w, 16); c.strokeRect(-w / 2, -16, w, 16);
    c.restore();
  }
  function crayon(c, x, base, s, col, tilt) {
    c.save(); c.translate(x, base); c.rotate(tilt); c.scale(s, s);
    roundRect(c, -18, -170, 36, 170, 6); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(40,20,20,0.6)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-18, -120, 36, 40); c.fillStyle = col; c.font = '14px Jua, sans-serif'; c.textAlign = 'center'; c.fillText('크레파스', 0, -95);
    c.beginPath(); c.moveTo(-18, -170); c.lineTo(-10, -205); c.lineTo(10, -205); c.lineTo(18, -170); c.closePath(); c.fillStyle = col; c.fill(); c.stroke();
    c.restore();
  }
  function darkTree(c, x, base, s, seed) {
    c.save(); c.translate(x, base); c.scale(s, s);
    c.fillStyle = '#2a2550'; c.strokeStyle = '#141230'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-8, -90, -14, -170); c.lineTo(14, -170); c.quadraticCurveTo(8, -90, 16, 0); c.closePath(); c.fill(); c.stroke();
    const bl = [[0, -200, 66], [-56, -178, 48], [56, -176, 50], [-30, -240, 46], [34, -244, 48], [0, -160, 50]];
    blobs(c, bl, '#141230', 3, (bx, by, r) => { const g = c.createRadialGradient(bx - r * 0.3, by - r * 0.5, 2, bx, by, r); g.addColorStop(0, '#5a6ad0'); g.addColorStop(1, '#2a2f78'); return g; });
    c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(0, -205, 64, -2.6, -1.4); c.stroke();
    const R = U.rng(seed); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,250,200,0.9)'; c.beginPath(); c.arc((R() - 0.5) * 110, -180 - R() * 80, 2.5, 0, TAU); c.fill(); }
    c.restore();
  }
  function thornTree(c, x, base, s) {
    c.save(); c.translate(x, base); c.scale(s, s);
    c.strokeStyle = '#1f0d2a'; c.lineWidth = 16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-10, -80, 6, -150); c.moveTo(4, -110); c.quadraticCurveTo(50, -140, 70, -190); c.moveTo(0, -130); c.quadraticCurveTo(-50, -170, -60, -220); c.moveTo(6, -150); c.quadraticCurveTo(20, -200, 4, -250); c.stroke();
    c.strokeStyle = '#4a2a6a'; c.lineWidth = 7; c.stroke();
    c.fillStyle = '#1f0d2a';
    for (const [px, py, a] of [[-6, -60, 3], [12, -100, 0], [40, -150, -0.6], [-30, -175, 3.4], [8, -210, 0.3], [-52, -205, 3.6]]) { c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); c.moveTo(0, -5); c.lineTo(16, 0); c.lineTo(0, 5); c.fill(); c.restore(); }
    for (const [px, py] of [[70, -192], [-60, -222], [4, -252]]) { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.ellipse(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 8, 5, a, 0, TAU); c.fillStyle = '#c3245a'; c.fill(); } c.beginPath(); c.arc(px, py, 5, 0, TAU); c.fillStyle = '#ff7aa8'; c.fill(); }
    c.restore();
  }
  function moonSprite(face) {
    return sprite(150, 150, (c) => {
      glow(c, 75, 75, 74, [255, 245, 190], 0.7);
      const cres = document.createElement('canvas'); cres.width = cres.height = Math.ceil(150 * RS);
      const m = cres.getContext('2d'); m.scale(RS, RS); m.beginPath(); m.arc(75, 75, 40, 0, TAU); m.fillStyle = '#fff6c4'; m.fill();
      m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(97, 62, 36, 0, TAU); m.fill();
      c.drawImage(cres, 0, 0, 150, 150);
      if (face) { c.strokeStyle = '#a98a3a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.arc(58, 74, 6, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); c.beginPath(); c.arc(64, 92, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    });
  }
  function sunSprite() {
    return sprite(240, 240, (c) => {
      glow(c, 120, 120, 118, [255, 240, 170], 0.75);
      c.beginPath(); c.arc(120, 120, 42, 0, TAU); const g = c.createRadialGradient(108, 106, 6, 120, 120, 44); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffd84a'); c.fillStyle = g; c.fill();
    });
  }
  function cloudSprites(cols = ['#ffffff', '#e2f1ff'], edge = 'rgba(120,170,220,0.35)') {
    return [0, 1, 2].map((k) => sprite(220, 110, (c) => {
      const R = U.rng(31 + k * 17), bl = [];
      for (let i = 0; i < 7; i++) bl.push([40 + i * 22 + R() * 10, 66 - Math.sin(i / 6 * Math.PI) * 26 + R() * 8, 22 + Math.sin(i / 6 * Math.PI) * 14 + R() * 6]);
      blobs(c, bl, edge, 2, (x, y, r) => vg(c, y - r, y + r, cols[0], cols[1]));
    }));
  }

  // ---------- 바닥 ----------
  function grassFloor(c, x0, x1, mapW, R, pal) {
    c.fillStyle = vg(c, 300, 540, pal[0], pal[1]); c.fillRect(x0, 300, x1 - x0, 240);
    const pathTop = (x) => 392 + Math.sin(x * 0.0045) * 24 + Math.sin(x * 0.013 + 1) * 6, pathBot = (x) => pathTop(x) + 96 + Math.sin(x * 0.009) * 10;
    c.beginPath(); c.moveTo(x0, pathTop(x0)); for (let x = x0; x <= x1; x += 10) c.lineTo(x, pathTop(x)); for (let x = x1; x >= x0; x -= 10) c.lineTo(x, pathBot(x)); c.closePath();
    c.fillStyle = vg(c, 360, 520, pal[2], pal[3]); c.fill(); c.strokeStyle = 'rgba(120,90,50,0.25)'; c.lineWidth = 3; c.stroke();
    const RR = U.rng(77);
    for (let i = 0; i < mapW / 8; i++) {
      const x = RR() * mapW, y = 320 + Math.pow(RR(), 0.8) * 215, k = RR();
      if (!vis(x, x0, x1, 12)) continue;
      const onPath = y > pathTop(x) - 2 && y < pathBot(x) + 2;
      if (onPath) { if (k < 0.15) { c.fillStyle = 'rgba(150,110,70,0.4)'; c.beginPath(); c.ellipse(x, y, 4 * dS(y), 2 * dS(y), 0, 0, TAU); c.fill(); } continue; }
      if (k < 0.55) tuft(c, x, y, dS(y), pal[4]); else if (k < 0.75) tinyFlower(c, x, y, dS(y), pal[5][Math.floor(k * 40) % pal[5].length]);
    }
  }
  function backBushes(c, x0, x1, mapW, pal) {
    const R = U.rng(91), list = [];
    for (let x = -20; x < mapW + 40; x += 26 + R() * 22) list.push([x, 306 + R() * 10, 18 + R() * 14]);
    const v = list.filter((b) => vis(b[0], x0, x1, 60));
    blobs(c, v, pal[0], 3, (x, y, r) => vg(c, y - r, y + r, pal[1], pal[2]));
    c.fillStyle = vg(c, 318, 345, 'rgba(30,20,40,0.25)', 'rgba(30,20,40,0)'); c.fillRect(x0, 318, x1 - x0, 27);
  }
  function tiles(c, x0, x1, cols, line, tw = 74, rows = [318, 336, 357, 381, 408, 439, 473, 510, 552]) {
    const k = 0.42;
    c.fillStyle = cols[0]; c.fillRect(x0, 300, x1 - x0, 240);
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r], yb = rows[r + 1], oa = (ya - 318) * k, ob = (yb - 318) * k;
      for (let i = Math.floor((x0 - 220) / tw); i * tw < x1 + 220; i++) {
        const xa = i * tw; c.beginPath(); c.moveTo(xa + oa, ya); c.lineTo(xa + tw + oa, ya); c.lineTo(xa + tw + ob, yb); c.lineTo(xa + ob, yb); c.closePath();
        c.fillStyle = (i + r) % 2 ? cols[1] : cols[2]; c.fill();
      }
    }
    c.strokeStyle = line; c.lineWidth = 1.5; for (const y of rows) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  }
  function planks(c, x0, x1, cols) {
    const rows = [318, 340, 366, 396, 430, 468, 510, 556];
    c.fillStyle = cols[0]; c.fillRect(x0, 300, x1 - x0, 240);
    for (let r = 0; r < rows.length - 1; r++) {
      c.fillStyle = r % 2 ? cols[1] : cols[2]; c.fillRect(x0, rows[r], x1 - x0, rows[r + 1] - rows[r]);
      c.strokeStyle = 'rgba(80,50,20,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, rows[r]); c.lineTo(x1, rows[r]); c.stroke();
      const len = 160 + r * 30;
      for (let x = Math.floor(x0 / len) * len + (r % 2) * len * 0.5; x < x1; x += len) { c.beginPath(); c.moveTo(x + (rows[r] - 318) * 0.42, rows[r]); c.lineTo(x + (rows[r + 1] - 318) * 0.42, rows[r + 1]); c.stroke(); }
    }
  }
  function paper(c, x0, x1) {
    c.fillStyle = '#fffdf3'; c.fillRect(x0, 300, x1 - x0, 240);
    const rows = []; for (let y = 322, h = 14; y < 545; y += h, h += 2.2) rows.push(y);
    c.strokeStyle = 'rgba(80,140,230,0.5)'; c.lineWidth = 1.6; for (const y of rows) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    c.strokeStyle = 'rgba(240,80,100,0.55)'; c.lineWidth = 2.2;
    for (let x = Math.floor(x0 / 900) * 900 + 300; x < x1 + 300; x += 900) { c.beginPath(); c.moveTo(x, 318); c.lineTo(x + 0.42 * 222, 540); c.stroke(); }
    const R = U.rng(13);
    for (let i = 0; i < (x1 - x0) / 60; i++) {
      const x = x0 + R() * (x1 - x0), y = 330 + R() * 200;
      c.strokeStyle = ['rgba(255,95,122,0.35)', 'rgba(74,168,255,0.35)', 'rgba(60,207,122,0.35)'][i % 3]; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) c.quadraticCurveTo(x + k * 8 + 4, y - 6 + (k % 2) * 12, x + k * 8 + 8, y); c.stroke();
    }
  }

  // =========================================================
  const THEMES = {};
  function outdoor(cfg) {
    return (mapW) => {
      const farF = 0.2, midF = 0.5, fgF = 1.22;
      const farW = lw(farF, mapW), midW = lw(midF, mapW);
      const R = U.rng(cfg.seed);
      const stars = cfg.stars ? Array.from({ length: 80 }, () => ({ x: R() * 1400, y: R() * 240, r: 0.6 + R() * 1.7, ph: R() * TAU, sp: 1 + R() * 2.4 })) : [];
      const moon = cfg.moon ? moonSprite(cfg.moon === 'face') : null, sun = cfg.sun ? sunSprite() : null;
      const clouds = cfg.clouds ? cloudSprites(cfg.cloudCols, cfg.cloudEdge) : null;
      const cl = cfg.clouds ? Array.from({ length: 7 }, (_, i) => ({ x: i * 220 + R() * 120, y: 26 + R() * 120, k: i % 3, s: 0.6 + R() * 0.6, sp: 4 + R() * 6 })) : [];
      const far = chunked(farW, 340, 0, (c, x0, x1) => cfg.far(c, x0, x1, farW));
      const midItems = cfg.midItems(midW, U.rng(cfg.seed + 5));
      const mid = chunked(midW, 340, 0, (c, x0, x1) => { for (const it of midItems) if (vis(it.x, x0, x1, it.m || 240)) it.draw(c); });
      const floor = chunked(mapW, 240, 300, (c, x0, x1) => cfg.floor(c, x0, x1, mapW));
      const fg = []; for (let x = 300; x < mapW * fgF + 400; x += 380 + R() * 280) fg.push({ x, k: Math.floor(R() * 3), s: 0.8 + R() * 0.5 });
      const amb = Array.from({ length: cfg.ambN || 26 }, () => ({ x: R() * 1400, y: R() * 540, ph: R() * TAU, sp: 10 + R() * 22 }));
      const S = {
        mapW, mood: 0, midItems,
        back(ctx, camX, t, W) {
          const D = S.deco || {};
          ctx.fillStyle = vg(ctx, 0, 330, cfg.sky[0], cfg.sky[1]);
          if (cfg.sky.length > 2) { const g = ctx.createLinearGradient(0, 0, 0, 330); cfg.sky.forEach((s, i) => g.addColorStop(i / (cfg.sky.length - 1), s)); ctx.fillStyle = g; }
          ctx.fillRect(0, 0, W, 330);
          for (const s of stars) {
            const x = ((s.x - camX * 0.04) % 1400 + 1400) % 1400 - 100; if (x < -5 || x > W + 5) continue;
            ctx.globalAlpha = (0.35 + 0.65 * (Math.sin(t * s.sp + s.ph) + 1) / 2) * (1 - s.y / 300); ctx.fillStyle = '#fffbe6';
            if (s.r > 1.8) { starPath(ctx, x, s.y, s.r * 2.2, s.r * 0.6, 4, 0); ctx.fill(); } else { ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, TAU); ctx.fill(); }
          }
          ctx.globalAlpha = 1;
          if (moon) ctx.drawImage(moon.cv, W * 0.8 - camX * 0.03 - 75, 7, 150, 150);
          if (sun) ctx.drawImage(sun.cv, W * 0.84 - camX * 0.02 - 120, -50, 240, 240);
          if (clouds) for (const q of cl) { const span = W + 500, x = (((q.x + t * q.sp - camX * 0.06) % span) + span) % span - 250, sp = clouds[q.k]; ctx.drawImage(sp.cv, x, q.y, sp.w * q.s, sp.h * q.s); }
          if (D.sky) D.sky(ctx, camX, t, W, S);
          drawLayer(ctx, far, camX * farF, W);
          if (D.far) D.far(ctx, camX * farF, t, W, S);
          drawLayer(ctx, mid, camX * midF, W);
          if (cfg.midAnim) cfg.midAnim(ctx, camX * midF, t, W, S);
          if (D.mid) D.mid(ctx, camX * midF, t, W, S);
          drawLayer(ctx, floor, camX, W);
          if (D.floor) D.floor(ctx, camX, t, W, S);
        },
        front(ctx, camX, t, W) {
          const D = S.deco || {};
          for (const o of fg) { const x = o.x - camX * fgF; if (x < -160 || x > W + 160) continue; cfg.fg(ctx, x, 548, o.s, o.k, t); }
          if (cfg.amb) for (const a of amb) cfg.amb(ctx, a, camX, t, W);
          if (D.front) D.front(ctx, camX, t, W, S);
        },
        post(ctx, t, W, H) { const D = S.deco || {}; if (D.post) D.post(ctx, t, W, H, S); },
      };
      return S;
    };
  }
  function indoor(cfg) {
    return (mapW) => {
      const wallF = 0.42, fgF = 1.2;
      const wallW = lw(wallF, mapW), R = U.rng(cfg.seed);
      const items = cfg.wallItems(wallW, U.rng(cfg.seed + 3));
      const wall = chunked(wallW, 330, 0, (c, x0, x1) => { cfg.wall(c, x0, x1, wallW); for (const it of items) if (vis(it.x, x0, x1, it.m || 240)) it.draw(c); });
      const floor = chunked(mapW, 240, 300, (c, x0, x1) => cfg.floor(c, x0, x1, mapW));
      const fg = []; for (let x = 200; x < mapW * fgF + 300; x += 380 + R() * 220) fg.push({ x, k: Math.floor(R() * 3) });
      const amb = Array.from({ length: cfg.ambN || 26 }, () => ({ x: R() * 1400, y: R() * 540, ph: R() * TAU, sp: 10 + R() * 22 }));
      const S = {
        mapW, healed: 0, mood: 0, items,
        back(ctx, camX, t, W) {
          const D = S.deco || {};
          drawLayer(ctx, wall, camX * wallF, W);
          if (cfg.wallAnim) cfg.wallAnim(ctx, camX * wallF, t, W, items, S);
          if (D.wall) D.wall(ctx, camX * wallF, t, W, S);
          drawLayer(ctx, floor, camX, W);
          if (D.floor) D.floor(ctx, camX, t, W, S);
        },
        front(ctx, camX, t, W) {
          const D = S.deco || {};
          for (const o of fg) { const x = o.x - camX * fgF; if (x < -200 || x > W + 200) continue; cfg.fg(ctx, x, 548, 1, o.k, t); }
          if (cfg.amb) for (const a of amb) cfg.amb(ctx, a, camX, t, W, S);
          if (D.front) D.front(ctx, camX, t, W, S);
        },
        post(ctx, t, W, H) { const D = S.deco || {}; if (D.post) D.post(ctx, t, W, H, S); },
      };
      return S;
    };
  }

  // ---------- 앞쪽 실루엣 / 떠다니는 것 ----------
  function fgPlant(col) {
    return (c, x, base, s, k, t) => {
      c.save(); c.translate(x, base); c.scale(s, s); c.fillStyle = col; const sw = Math.sin(t * 1.2 + x * 0.01) * 4;
      if (k === 0) { for (const [dx, h, a] of [[-30, 70, -0.5], [-12, 100, -0.2], [6, 120, 0.05], [24, 90, 0.35], [40, 60, 0.6]]) { c.beginPath(); c.moveTo(dx - 7, 0); c.quadraticCurveTo(dx + a * 30, -h * 0.6, dx + a * 50 + sw, -h); c.quadraticCurveTo(dx + a * 20 + 5, -h * 0.5, dx + 7, 0); c.fill(); } }
      else if (k === 1) { for (const [dx, h] of [[-20, 110], [14, 140]]) { c.fillRect(dx - 2, -h, 4, h); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.ellipse(dx + Math.cos(a) * 12 + sw, -h + Math.sin(a) * 12, 12, 7, a, 0, TAU); c.fill(); } } c.beginPath(); c.ellipse(0, 0, 60, 24, 0, Math.PI, TAU); c.fill(); }
      else { for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-50 + i * 34, -10, 30, 0, TAU); c.fill(); } }
      c.restore();
    };
  }
  const fireflies = (col) => (c, a, camX, t, W) => {
    const x = ((a.x - camX * 0.5 + Math.sin(t * 0.7 + a.ph) * 22) % (W + 40) + W + 40) % (W + 40) - 20, y = 120 + (a.y % 220) + Math.sin(t * 1.1 + a.ph * 2) * 14;
    glowFast(c, x, y, 9, col, 0.5 + 0.5 * Math.sin(t * 3 + a.ph));
  };
  const petals = (col) => (c, a, camX, t, W) => {
    const x = ((a.x + t * a.sp - camX * 0.3) % (W + 60) + W + 60) % (W + 60) - 30, y = ((a.y + t * a.sp * 0.8) % 580) - 20;
    c.save(); c.fillStyle = col; c.translate(x, y); c.rotate(t * 1.5 + a.ph); c.beginPath(); c.ellipse(0, 0, 4, 2.4, 0, 0, TAU); c.fill(); c.restore();
  };
  const sparkles = (col) => (c, a, camX, t, W) => {
    const x = ((a.x - camX * 0.3) % (W + 40) + W + 40) % (W + 40) - 20, y = (a.y % 480) + Math.sin(t * 0.8 + a.ph) * 10, k = (Math.sin(t * 2 + a.ph) + 1) / 2;
    c.globalAlpha = k * 0.8; c.fillStyle = col; starPath(c, x, y, 4, 1.2, 4, 0); c.fill(); c.globalAlpha = 1;
  };
  const motes = (col, colHealed) => (c, a, camX, t, W, S) => {
    const y = ((a.y - t * a.sp) % 560 + 560) % 560, x = ((a.x - camX * 0.5 + Math.sin(t + a.ph) * 16) % (W + 40) + W + 40) % (W + 40) - 20;
    glowFast(c, x, y, 6, S && S.healed > 0.5 ? colHealed : col, Math.sin((y / 560) * Math.PI));
  };

  // ---------------- 하트 마을 ----------------
  THEMES.heartTown = outdoor({
    seed: 101, sky: ['#7cc6ff', '#c7e9ff', '#fff0f6'], sun: true, clouds: true,
    far(c, x0, x1, fw) { hill(c, x0, x1, 250, [[0.004, 18, 1], [0.011, 7, 2]], 340, '#b5e3b0'); hill(c, x0, x1, 284, [[0.006, 12, 0.5], [0.017, 5, 1]], 340, '#a2d9a2'); },
    midItems(mw, R) {
      const out = [];
      for (let x = 120, i = 0; x < mw; x += 260 + R() * 80, i++) { const xx = x, k = i, hs = 0.95 + (k % 3) * 0.08; out.push({ x: xx, smoke: [xx + 31 * hs, 322 - 140 * hs], draw: (c) => house(c, xx, 322, hs, 'heart', k) }); }
      for (let x = 230; x < mw; x += 520) { const xx = x; out.push({ x: xx, m: 400, draw: (c) => bunting(c, xx - 180, xx + 180, 150, ['#ff6f91', '#ffd23f', '#7fc8ff', '#9be39b', '#c9a2ff']) }); }
      for (let x = 60; x < mw; x += 340 + R() * 120) { const xx = x; out.push({ x: xx, draw: (c) => fluffyTree(c, xx, 322, 0.7, ['#b8f0b0', '#6cc27a'], xx, ['#a07a5a', '#7a5a3a', '#5a3a20']) }); }
      return out;
    },
    floor(c, x0, x1) {
      c.fillStyle = vg(c, 300, 540, '#e9dcc8', '#cdb89a'); c.fillRect(x0, 300, x1 - x0, 240);
      const R = U.rng(5);
      for (let row = 0, y = 322; y < 545; row++, y += 16 + row * 2.4) {
        const h = 14 + row * 2.4, w = 40 + row * 6;
        for (let x = Math.floor(x0 / w) * w - (row % 2) * w * 0.5; x < x1 + w; x += w) {
          roundRect(c, x + 2 + (y - 318) * 0.42, y + 1, w - 4, h - 2, 5);
          c.fillStyle = ['#f4e8d4', '#eadbc2', '#e2d0b4'][Math.floor(R() * 3)]; c.fill(); c.strokeStyle = 'rgba(120,90,60,0.25)'; c.lineWidth = 1.5; c.stroke();
        }
      }
      backBushes(c, x0, x1, x1 + 400, ['#3f8a5c', '#9be0a8', '#58ad74']);
    },
    fg: fgPlant('rgba(40,90,60,0.88)'), amb: petals('rgba(255,170,200,0.8)'), ambN: 14,
  });
  // ---------------- 솜사탕 마을 ----------------
  THEMES.cottonTown = outdoor({
    seed: 202, sky: ['#3f3478', '#8a68b5', '#f3a8c8', '#ffd9cf'], moon: 'face', stars: true,
    far(c, x0, x1) { hill(c, x0, x1, 256, [[0.004, 20, 1], [0.012, 8, 2]], 340, '#b9a4e6'); hill(c, x0, x1, 290, [[0.006, 14, 0.5], [0.018, 5, 1]], 340, '#a28cd8'); },
    midItems(mw, R) {
      const out = [];
      for (let x = 140, i = 0; x < mw; x += 300 + R() * 90, i++) { const xx = x, k = i; out.push({ x: xx, draw: (c) => house(c, xx, 324, 0.95, 'pillow', k) }); }
      for (let x = 40; x < mw; x += 200 + R() * 120) { const xx = x, col = ['#ffb5d5', '#c9b4ff', '#a8e8ff'][Math.floor(R() * 3)]; out.push({ x: xx, draw: (c) => cottonTree(c, xx, 324, 0.85 + R() * 0.3, col) }); }
      for (let x = 260; x < mw; x += 600) { const xx = x; out.push({ x: xx, m: 400, draw: (c) => lanterns(c, xx - 200, 150, xx + 200, 160) }); }
      return out;
    },
    floor(c, x0, x1, mw) { grassFloor(c, x0, x1, mw, null, ['#a9a0e0', '#8a7cc8', '#fbe8f0', '#ead0e0', 'rgba(80,60,140,0.5)', ['#fff', '#ffd1e8', '#fff3a0']]); backBushes(c, x0, x1, mw, ['#5a4a9a', '#c9b8f6', '#8a76d0']); },
    fg: fgPlant('rgba(58,40,100,0.88)'), amb: fireflies([255, 240, 160]),
  });
  // ---------------- 졸음 들판 ----------------
  THEMES.drowsyField = outdoor({
    seed: 303, sky: ['#ff9fb8', '#ffd2a0', '#fff1c8'], sun: true, clouds: true, cloudCols: ['#fff8f0', '#ffd8d8'], cloudEdge: 'rgba(220,140,140,0.35)',
    far(c, x0, x1) { hill(c, x0, x1, 244, [[0.003, 22, 0.3], [0.009, 10, 1]], 340, '#f0c8a8'); hill(c, x0, x1, 282, [[0.005, 14, 2], [0.016, 6, 0.4]], 340, '#c8d8a0'); },
    midItems(mw, R) {
      const out = [];
      for (let x = 60; x < mw; x += 280 + R() * 140) { const xx = x, p = [['#ffe0a8', '#f2b25a'], ['#c8f0a8', '#7ac85a'], ['#ffc8d8', '#f28ab0']][Math.floor(R() * 3)], s = 0.8 + R() * 0.35; out.push({ x: xx, draw: (c) => fluffyTree(c, xx, 322, s, p, xx, ['#a07a5a', '#7a5a3a', '#5a3a20']) }); }
      for (let x = 200; x < mw; x += 420 + R() * 100) { const xx = x; out.push({ x: xx, m: 300, draw: (c) => fence(c, xx, xx + 240, 326) }); }
      for (let x = 150; x < mw; x += 330 + R() * 90) { const xx = x, h = 90 + R() * 80, col = ['#ff8fc4', '#ffd84a', '#8fc9ff'][Math.floor(R() * 3)]; out.push({ x: xx, draw: (c) => giantFlower(c, xx, 326, h, col) }); }
      return out;
    },
    floor(c, x0, x1, mw) { grassFloor(c, x0, x1, mw, null, ['#a8dc8a', '#7cc46a', '#f6e2bf', '#e6c494', 'rgba(40,110,50,0.55)', ['#fff', '#ffd1e8', '#fff3a0', '#d9c8ff']]); backBushes(c, x0, x1, mw, ['#3f8a4c', '#a8e09a', '#5aad64']); },
    fg: fgPlant('rgba(50,90,40,0.88)'), amb: petals('rgba(255,250,240,0.85)'), ambN: 16,
  });
  // ---------------- 뒤척이 숲 ----------------
  THEMES.tossForest = outdoor({
    seed: 404, sky: ['#0f1236', '#26306e', '#4a4a9a'], moon: true, stars: true,
    far(c, x0, x1) {
      hill(c, x0, x1, 230, [[0.004, 26, 1], [0.013, 10, 2]], 340, '#2a2f6a');
      for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) { const y = 230 + Math.sin(x * 0.004 + 1) * 26 + Math.sin(x * 0.013 + 2) * 10, h = 30 + (Math.sin(x * 1.3) + 1) * 14; c.fillStyle = '#20245a'; c.beginPath(); c.moveTo(x - 14, y + 4); c.lineTo(x, y - h); c.lineTo(x + 14, y + 4); c.fill(); }
      hill(c, x0, x1, 280, [[0.006, 14, 0.5], [0.018, 6, 1]], 340, '#1c2050');
    },
    midItems(mw, R) {
      const out = [];
      for (let x = 50; x < mw; x += 190 + R() * 110) { const xx = x, s = 0.8 + R() * 0.4, sd = Math.floor(R() * 999); out.push({ x: xx, draw: (c) => darkTree(c, xx, 326, s, sd) }); }
      for (let x = 120; x < mw; x += 170 + R() * 140) { const xx = x, s = 0.6 + R() * 0.6, col = ['#7fe0ff', '#c9a2ff', '#9bffc8'][Math.floor(R() * 3)]; out.push({ x: xx, glow: [xx, 326 - 34 * s, s, col], draw: (c) => mushroom(c, xx, 326, s, col) }); }
      return out;
    },
    floor(c, x0, x1, mw) { grassFloor(c, x0, x1, mw, null, ['#2f4a6a', '#1f3350', '#4a5a8a', '#3a4a78', 'rgba(140,190,255,0.35)', ['#9fe3ff', '#c9a2ff']]); backBushes(c, x0, x1, mw, ['#141836', '#3a4a8a', '#232a5a']); },
    fg: fgPlant('rgba(10,12,34,0.92)'), amb: fireflies([170, 230, 255]), ambN: 34,
  });
  // ---------------- 연필 마을 ----------------
  THEMES.pencilTown = outdoor({
    seed: 505, sky: ['#8ed8ff', '#d8f1ff', '#fffbea'], sun: true, clouds: true,
    far(c, x0, x1, fw) {
      for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { const h = 80 + Math.abs(Math.sin(x * 0.7)) * 60; c.fillStyle = ['#bfe3c8', '#c8dcf0', '#f0d8c8'][Math.abs(Math.floor(x / 70)) % 3]; c.fillRect(x, 300 - h, 46, h); c.beginPath(); c.moveTo(x, 300 - h); c.lineTo(x + 23, 270 - h); c.lineTo(x + 46, 300 - h); c.fill(); }
      hill(c, x0, x1, 292, [[0.006, 8, 0.5]], 340, '#b8e0a8');
    },
    midItems(mw, R) {
      const out = [];
      for (let x = 130, i = 0; x < mw; x += 230 + R() * 80, i++) { const xx = x, k = i; out.push({ x: xx, draw: (c) => house(c, xx, 324, 0.95, 'pencil', k) }); }
      for (let x = 60; x < mw; x += 380 + R() * 80) { const xx = x, col = ['#ff5f7a', '#4aa8ff', '#3ccf7a', '#ffb02e'][Math.floor(R() * 4)], tl = (R() - 0.5) * 0.3; out.push({ x: xx, draw: (c) => crayon(c, xx, 326, 0.75, col, tl) }); }
      for (let x = 240; x < mw; x += 520) { const xx = x; out.push({ x: xx, m: 400, draw: (c) => bunting(c, xx - 170, xx + 170, 140, ['#ff5f7a', '#ffd23f', '#4aa8ff', '#3ccf7a']) }); }
      return out;
    },
    floor(c, x0, x1) { planks(c, x0, x1, ['#e2b67a', '#eac28a', '#dcac6c']); backBushes(c, x0, x1, x1 + 400, ['#3f8a5c', '#9be0a8', '#58ad74']); },
    fg: fgPlant('rgba(60,50,30,0.85)'), amb: sparkles('#fff6c0'), ambN: 16,
  });
  // ---------------- 공책 평원 ----------------
  THEMES.notebookField = outdoor({
    seed: 606, sky: ['#cfe6ff', '#eef6ff', '#ffffff'], clouds: true, cloudCols: ['#ffffff', '#f2f6ff'], cloudEdge: 'rgba(120,150,200,0.5)',
    far(c, x0, x1) {
      c.strokeStyle = 'rgba(120,160,230,0.35)'; c.lineWidth = 1.5; for (let y = 40; y < 300; y += 26) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
      for (let x = Math.floor(x0 / 260) * 260; x < x1; x += 260) { c.fillStyle = 'rgba(180,200,230,0.6)'; c.beginPath(); c.moveTo(x, 300); c.lineTo(x + 60, 150 + Math.sin(x) * 30); c.lineTo(x + 120, 300); c.fill(); }
      hill(c, x0, x1, 290, [[0.005, 10, 0.4]], 340, '#dde8f8');
    },
    midItems(mw, R) {
      const out = [];
      for (let x = 80; x < mw; x += 200 + R() * 150) { const xx = x, col = ['#ffcf3a', '#ff8fb8', '#7fc8ff', '#9be39b', '#c9a2ff'][Math.floor(R() * 5)], s = 0.7 + R() * 0.4, tl = (R() - 0.5) * 0.4; out.push({ x: xx, draw: (c) => giantPencil(c, xx, 330, s, col, tl) }); }
      for (let x = 200; x < mw; x += 520 + R() * 120) { const xx = x; out.push({ x: xx, draw: (c) => { c.save(); c.translate(xx, 330); c.rotate(-0.08); c.fillStyle = '#fff3b8'; c.fillRect(-14, -230, 28, 230); c.strokeStyle = '#8a5b12'; c.lineWidth = 2.5; c.strokeRect(-14, -230, 28, 230); for (let i = 0; i < 23; i++) { c.beginPath(); c.moveTo(14, -i * 10); c.lineTo(i % 5 ? 6 : 0, -i * 10); c.stroke(); } c.restore(); } }); }
      return out;
    },
    floor(c, x0, x1) { paper(c, x0, x1); c.fillStyle = vg(c, 300, 332, '#e8eef8', 'rgba(232,238,248,0)'); c.fillRect(x0, 300, x1 - x0, 32); },
    fg: (c, x, base, s, k, t) => { c.save(); c.translate(x, base); c.scale(s, s); c.fillStyle = 'rgba(70,90,130,0.85)'; if (k === 0) { c.fillRect(-14, -110, 28, 110); c.beginPath(); c.moveTo(-14, -110); c.lineTo(0, -150); c.lineTo(14, -110); c.fill(); } else { c.beginPath(); c.ellipse(0, 0, 70, 30, 0, Math.PI, TAU); c.fill(); } c.restore(); },
    amb: (c, a, camX, t, W) => { const x = ((a.x + t * a.sp - camX * 0.4) % (W + 60) + W + 60) % (W + 60) - 30, y = ((a.y + t * a.sp * 0.6) % 560) - 20; c.save(); c.translate(x, y); c.rotate(t + a.ph); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(-5, -3, 10, 6); c.strokeStyle = 'rgba(120,150,200,0.6)'; c.strokeRect(-5, -3, 10, 6); c.restore(); }, ambN: 14,
  });
  // ---------------- 심술 마을 ----------------
  THEMES.grumpyTown = outdoor({
    seed: 707, sky: ['#2a1238', '#5a2a6a', '#a04a7a'], moon: true, stars: true,
    far(c, x0, x1, fw) {
      hill(c, x0, x1, 236, [[0.004, 24, 1], [0.011, 9, 2]], 340, '#4a2a5a');
      const cx = fw * 0.75;
      if (vis(cx, x0, x1, 300)) { c.fillStyle = '#2a1238'; for (const [dx, h, w] of [[-80, 120, 30], [-30, 180, 40], [30, 150, 34], [80, 110, 26]]) { c.fillRect(cx + dx - w / 2, 270 - h, w, h); c.beginPath(); c.moveTo(cx + dx - w / 2 - 6, 270 - h); c.lineTo(cx + dx, 230 - h); c.lineTo(cx + dx + w / 2 + 6, 270 - h); c.fill(); } c.fillStyle = '#ff7ad1'; for (const [dx, h] of [[-30, 160], [30, 130]]) { c.beginPath(); c.arc(cx + dx, 290 - h, 5, 0, TAU); c.fill(); } }
      hill(c, x0, x1, 286, [[0.006, 12, 0.5]], 340, '#3a1a48');
    },
    midItems(mw, R) {
      const out = [];
      for (let x = 140, i = 0; x < mw; x += 260 + R() * 90, i++) { const xx = x, k = i; out.push({ x: xx, draw: (c) => house(c, xx, 324, 0.95, 'crooked', 900 + k) }); }
      for (let x = 60; x < mw; x += 330 + R() * 120) { const xx = x, s = 0.7 + R() * 0.3; out.push({ x: xx, draw: (c) => thornTree(c, xx, 326, s) }); }
      return out;
    },
    floor(c, x0, x1) { tiles(c, x0, x1, ['#3a2a4a', '#4a3a5a', '#3f2f50'], 'rgba(10,0,20,0.4)', 60); backBushes(c, x0, x1, x1 + 400, ['#1a0d2a', '#5a3a7a', '#2a1a40']); },
    fg: (c, x, base, s, k, t) => { c.fillStyle = 'rgba(20,6,30,0.9)'; for (const [dx, r] of [[-50, 28], [-14, 38], [24, 32], [58, 24]]) { c.beginPath(); c.arc(x + dx, base, r + Math.sin(t * 2 + dx) * 2, 0, TAU); c.fill(); } },
    amb: motes([210, 140, 255], [255, 210, 120]), ambN: 30,
  });
  // ---------------- 가시 정원 ----------------
  THEMES.thornGarden = outdoor({
    seed: 808, sky: ['#3a0f3a', '#7a2a5a', '#d0607a'], moon: true, stars: true,
    far(c, x0, x1) { hill(c, x0, x1, 240, [[0.004, 22, 2], [0.01, 9, 1]], 340, '#5a2050'); hill(c, x0, x1, 284, [[0.006, 12, 0.5]], 340, '#40143c'); },
    midItems(mw, R) {
      const out = [];
      for (let x = 40; x < mw; x += 200 + R() * 120) { const xx = x, s = 0.7 + R() * 0.45; out.push({ x: xx, draw: (c) => thornTree(c, xx, 326, s) }); }
      for (let x = 120; x < mw; x += 260 + R() * 160) { const xx = x; out.push({ x: xx, draw: (c) => { c.strokeStyle = '#1f0d2a'; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 6; i++) c.arc(xx + i * 22, 318 - (i % 2) * 14, 14, Math.PI, 0); c.stroke(); } }); }
      return out;
    },
    floor(c, x0, x1, mw) { grassFloor(c, x0, x1, mw, null, ['#5a2a4a', '#3a1a34', '#7a4a5a', '#5a3448', 'rgba(20,0,20,0.5)', ['#ff7aa8', '#c3245a']]); backBushes(c, x0, x1, mw, ['#14061e', '#5a2a5a', '#2a1030']); },
    fg: fgPlant('rgba(20,4,24,0.92)'), amb: petals('rgba(255,90,140,0.75)'), ambN: 18,
  });

  // ---------------- 실내 ----------------
  function wallpaper(c, x0, x1, top, bot, cols, pattern) {
    c.fillStyle = vg(c, top, bot, cols[0], cols[1]); c.fillRect(x0, top, x1 - x0, bot - top);
    if (pattern === 'stars') { c.fillStyle = cols[2]; for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) for (let y = top + 20; y < bot - 40; y += 60) { starPath(c, x + ((y / 60) % 2) * 30, y, 7, 3); c.fill(); } }
    if (pattern === 'bricks') { c.strokeStyle = cols[2]; c.lineWidth = 2; for (let y = top + 20, row = 0; y < bot; y += 30, row++) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); for (let x = Math.floor(x0 / 60) * 60 + (row % 2) * 30; x < x1; x += 60) { c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x, y); c.stroke(); } } }
    if (pattern === 'ruler') { c.strokeStyle = cols[2]; c.lineWidth = 2; for (let x = Math.floor(x0 / 20) * 20; x < x1; x += 20) { const k = Math.round(x / 20); c.beginPath(); c.moveTo(x, top + 60); c.lineTo(x, top + 60 + (k % 10 === 0 ? 40 : k % 5 === 0 ? 26 : 14)); c.stroke(); if (k % 10 === 0) { c.fillStyle = cols[2]; c.font = '14px Jua, sans-serif'; c.textAlign = 'center'; c.fillText(String(Math.abs(k / 10) % 100), x, top + 118); } } }
  }
  function windowArch(c, x, top, w, h, inner, frame) {
    c.beginPath(); c.moveTo(x - w / 2, top + h); c.lineTo(x - w / 2, top + w / 2); c.arc(x, top + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, top + h); c.closePath();
    c.fillStyle = inner; c.fill(); c.lineWidth = 8; c.strokeStyle = frame[0]; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = frame[1]; c.stroke();
  }
  THEMES.pillowCastle = indoor({
    seed: 909,
    wall(c, x0, x1) { wallpaper(c, x0, x1, 0, 330, ['#4a3a8a', '#8a6ac8', '#fff6c0'], 'stars'); c.fillStyle = vg(c, 290, 330, '#3a2a6a', '#2a1a50'); c.fillRect(x0, 290, x1 - x0, 40); },
    wallItems(ww, R) {
      const out = [];
      for (let x = 180; x < ww; x += 340) { const xx = x; out.push({ x: xx, draw: (c) => {
        windowArch(c, xx, 60, 110, 190, vg(c, 60, 250, '#1a1a4a', '#3a3a8a'), ['#e8d0ff', '#6a4aa8']);
        c.fillStyle = '#fff6c4'; c.beginPath(); c.arc(xx + 20, 110, 14, 0, TAU); c.fill(); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(xx - 40 + i * 20, 160 + (i % 2) * 30, 1.8, 0, TAU); c.fill(); }
        for (const d of [-1, 1]) { c.beginPath(); c.moveTo(xx + d * 70, 40); c.quadraticCurveTo(xx + d * 40, 150, xx + d * 72, 270); c.lineTo(xx + d * 92, 270); c.lineTo(xx + d * 92, 40); c.closePath(); c.fillStyle = '#ff9cc6'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#a8306a'; c.stroke(); }
      } }); }
      for (let x = 350; x < ww; x += 340) { const xx = x; out.push({ x: xx, draw: (c) => { for (const [dx, dy, col] of [[-40, 0, '#fdf8ff'], [30, -10, '#ffe8f4'], [-5, -40, '#e8f4ff']]) { c.save(); c.translate(xx + dx, 300 + dy); roundRect(c, -46, -30, 92, 60, 22); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#7a6098'; c.stroke(); c.restore(); } } }); }
      return out;
    },
    floor(c, x0, x1) { tiles(c, x0, x1, ['#6a5aa8', '#8a7ac8', '#7a6ab8'], 'rgba(40,20,80,0.35)', 90); c.fillStyle = vg(c, 400, 470, '#ffb3d9', '#e07ab0'); c.fillRect(x0, 400, x1 - x0, 70); c.fillStyle = '#fff6c0'; c.fillRect(x0, 400, x1 - x0, 3); c.fillRect(x0, 467, x1 - x0, 3); },
    fg: (c, x, base, s, k, t) => { c.save(); c.translate(x, base); roundRect(c, -70, -40, 140, 60, 26); c.fillStyle = 'rgba(60,40,110,0.85)'; c.fill(); c.restore(); },
    amb: (c, a, camX, t, W) => { const k = (t * 0.2 + a.ph) % 1, x = ((a.x - camX * 0.4) % (W + 40) + W + 40) % (W + 40) - 20, y = 300 - k * 260; c.globalAlpha = Math.sin(k * Math.PI) * 0.7; c.fillStyle = '#fff'; c.font = '16px Jua, sans-serif'; c.fillText('z', x, y); c.globalAlpha = 1; }, ambN: 14,
  });
  THEMES.rulerTower = indoor({
    seed: 1010,
    wall(c, x0, x1) { wallpaper(c, x0, x1, 0, 330, ['#f6e3b4', '#e2c48a', '#8a6a2a'], 'ruler'); c.fillStyle = vg(c, 280, 330, '#b8925a', '#8a6a3a'); c.fillRect(x0, 280, x1 - x0, 50); },
    wallItems(ww, R) {
      const out = [];
      for (let x = 200; x < ww; x += 360) { const xx = x; out.push({ x: xx, draw: (c) => {
        windowArch(c, xx, 130, 90, 140, vg(c, 130, 270, '#8fd0ff', '#4f8fd8'), ['#c9a03a', '#6a4a10']);
        c.fillStyle = '#7a5a34'; c.fillRect(xx + 90, 150, 120, 10); for (let i = 0; i < 5; i++) { c.fillStyle = ['#ff5f7a', '#4aa8ff', '#3ccf7a', '#ffb02e', '#c9a2ff'][i]; c.fillRect(xx + 96 + i * 22, 90 + (i % 2) * 8, 16, 60 - (i % 2) * 8); }
      } }); }
      return out;
    },
    floor(c, x0, x1) { planks(c, x0, x1, ['#c99a5a', '#d4a868', '#c08e50']); },
    fg: (c, x, base) => { c.fillStyle = 'rgba(70,45,20,0.85)'; c.fillRect(x - 18, base - 140, 36, 140); },
    amb: sparkles('#fff3b0'), ambN: 14,
  });
  THEMES.mirrorHall = indoor({
    seed: 1111,
    wall(c, x0, x1) { wallpaper(c, x0, x1, 0, 330, ['#24103a', '#4a2a72', 'rgba(255,255,255,0.05)'], 'bricks'); c.fillStyle = vg(c, 290, 330, '#2a1442', '#1d0d30'); c.fillRect(x0, 290, x1 - x0, 40); },
    wallItems(ww, R) {
      const out = [];
      for (let x = 160; x < ww; x += 280) { const xx = x; out.push({ x: xx, draw: (c) => { roundRect(c, xx - 44, 70, 88, 170, 40); c.fillStyle = vg(c, 70, 240, '#5a4a8a', '#2a1a4a'); c.fill(); c.lineWidth = 7; c.strokeStyle = '#c9a03a'; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.moveTo(xx - 30, 100); c.lineTo(xx - 16, 84); c.lineTo(xx - 16, 220); c.lineTo(xx - 30, 230); c.fill(); } }); }
      for (let x = 300; x < ww; x += 560) { const xx = x; out.push({ x: xx, draw: (c) => { c.strokeStyle = '#c9a03a'; c.lineWidth = 2; c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, 40); c.stroke(); c.beginPath(); c.ellipse(xx, 50, 50, 12, 0, 0, TAU); c.fillStyle = '#c9a03a'; c.fill(); for (let i = -2; i <= 2; i++) { glow(c, xx + i * 22, 40, 16, [255, 200, 255], 0.8); } } }); }
      return out;
    },
    floor(c, x0, x1) { tiles(c, x0, x1, ['#1a0d2a', '#e8e0f0', '#3a2a5a'], 'rgba(10,0,20,0.4)', 80); c.fillStyle = 'rgba(255,255,255,0.07)'; for (let x = Math.floor(x0 / 140) * 140; x < x1; x += 140) { c.beginPath(); c.moveTo(x, 330); c.lineTo(x + 30, 330); c.lineTo(x + 120, 540); c.lineTo(x + 90, 540); c.closePath(); c.fill(); } },
    fg: (c, x, base) => { c.fillStyle = 'rgba(20,6,34,0.85)'; for (const [dx, r] of [[-40, 30], [0, 40], [40, 30]]) { c.beginPath(); c.arc(x + dx, base, r, 0, TAU); c.fill(); } },
    amb: motes([200, 160, 255], [255, 220, 150]), ambN: 24,
  });
  THEMES.throne = indoor({
    seed: 1212,
    wall(c, x0, x1, ww) {
      wallpaper(c, x0, x1, 0, 330, ['#2c1748', '#5d3687', 'rgba(20,8,40,0.45)'], 'bricks');
      for (const wx of [ww * 0.18, ww * 0.82]) { if (!vis(wx, x0, x1, 200)) continue; c.save(); windowArch(c, wx, 70, 100, 210, vg(c, 70, 280, '#ff7ad1', '#3a1a6a'), ['#2a1442', '#a77fd6']); c.restore(); }
      const hx = ww * 0.5, hy = 140;
      if (vis(hx, x0, x1, 200)) {
        glow(c, hx, hy, 150, [255, 120, 220], 0.35);
        c.save(); heartPath(c, hx, hy + 10, 92); c.lineWidth = 14; c.strokeStyle = '#1f0d33'; c.stroke(); c.clip();
        const cols = ['#ff5f9e', '#c34ee6', '#ff9acb', '#7d3fd6', '#ffb347', '#ff6f91']; let n = 0;
        for (let yy = hy - 100; yy < hy + 120; yy += 42) for (let xx = hx - 120; xx < hx + 120; xx += 48) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 48, yy + 10); c.lineTo(xx + 40, yy + 52); c.lineTo(xx - 6, yy + 42); c.closePath(); c.fillStyle = cols[n++ % cols.length]; c.fill(); c.lineWidth = 3; c.strokeStyle = '#2a1240'; c.stroke(); }
        c.restore();
        c.strokeStyle = '#1a0b2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(hx + 4, hy - 30); c.lineTo(hx - 14, hy + 4); c.lineTo(hx + 12, hy + 26); c.lineTo(hx - 6, hy + 58); c.lineTo(hx + 6, hy + 82); c.stroke();
      }
      c.fillStyle = vg(c, 296, 330, '#2a1442', '#1d0d30'); c.fillRect(x0, 296, x1 - x0, 34); c.fillStyle = '#7b4fb3'; c.fillRect(x0, 296, x1 - x0, 3);
    },
    wallItems(ww) {
      const out = [];
      for (let x = 120; x < ww; x += 240) { if (Math.abs(x - ww * 0.5) < 150) continue; const xx = x; out.push({ x: xx, sconce: true, draw: (c) => { c.fillStyle = '#3a1d5a'; c.fillRect(xx - 28, 40, 56, 6); c.beginPath(); c.moveTo(xx - 24, 46); c.lineTo(xx + 24, 46); c.lineTo(xx + 24, 180); c.lineTo(xx, 164); c.lineTo(xx - 24, 180); c.closePath(); c.fillStyle = vg(c, 46, 180, '#7c42b5', '#552780'); c.fill(); c.lineWidth = 2; c.strokeStyle = '#1f0d33'; c.stroke(); heartPath(c, xx, 118, 10); c.fillStyle = '#2a1442'; c.fill(); c.fillStyle = '#2a1442'; c.fillRect(xx - 12, 226, 24, 8); c.fillStyle = '#f7e8ff'; c.fillRect(xx - 6, 204, 12, 22); } }); }
      return out;
    },
    wallAnim(ctx, off, t, W, items, S) {
      for (const it of items) { if (!it.sconce) continue; const x = it.x - off; if (x < -40 || x > W + 40) continue; candle(ctx, x, 202, t + it.x); }
      if (S.healed > 0) { const hx = (Scenes._ww || 0) * 0.5 - off; ctx.save(); ctx.globalAlpha = S.healed; glowFast(ctx, hx, 150, 220, [255, 200, 230], 0.8); heartPath(ctx, hx, 150, 92); ctx.fillStyle = vg(ctx, 50, 240, '#ffd1e6', '#ff5f9e'); ctx.fill(); ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore(); }
    },
    floor(c, x0, x1) { tiles(c, x0, x1, ['#3a2160', '#6a479a', '#4f3280'], 'rgba(20,8,40,0.4)', 80, [318, 338, 361, 388, 418, 452, 490, 532, 578]); c.fillStyle = vg(c, 404, 470, '#b0388f', '#7d2268'); c.fillRect(x0, 404, x1 - x0, 66); c.fillStyle = '#ffcf5a'; c.fillRect(x0, 404, x1 - x0, 3); c.fillRect(x0, 467, x1 - x0, 3); },
    fg: (c, x, base, s, k, t) => { c.fillStyle = 'rgba(30,10,50,0.85)'; for (const [dx, r] of [[-60, 30], [-20, 42], [26, 36], [64, 26]]) { c.beginPath(); c.arc(x + dx, base, r + Math.sin(t * 2 + dx) * 3, 0, TAU); c.fill(); } },
    amb: motes([210, 140, 255], [255, 210, 120]), ambN: 34,
  });
  function candle(c, x, y, t) {
    const f = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.08;
    glowFast(c, x, y - 8, 26, [255, 120, 220], 0.55);
    c.beginPath(); c.moveTo(x, y - 20 * f); c.quadraticCurveTo(x + 8, y - 6, x, y); c.quadraticCurveTo(x - 8, y - 6, x, y - 20 * f); c.fillStyle = '#ff7ad9'; c.fill();
    c.beginPath(); c.moveTo(x, y - 12 * f); c.quadraticCurveTo(x + 4, y - 4, x, y); c.quadraticCurveTo(x - 4, y - 4, x, y - 12 * f); c.fillStyle = '#fff2fb'; c.fill();
  }


  // =========================================================
  // 움직이는 장식 · 빛 · 날씨
  // =========================================================
  const wrapX = (x, W, pad = 120) => { const span = W + pad * 2; return ((x % span) + span) % span - pad; };
  function bird(ctx, x, y, s, t) {
    const f = Math.sin(t * 9) * 0.7;
    ctx.beginPath(); ctx.moveTo(x - 9 * s, y - f * 6 * s); ctx.quadraticCurveTo(x - 4 * s, y - 4 * s, x, y); ctx.quadraticCurveTo(x + 4 * s, y - 4 * s, x + 9 * s, y - f * 6 * s); ctx.stroke();
  }
  function flock(ctx, camX, t, W, o) {
    ctx.save(); ctx.strokeStyle = o.col || 'rgba(70,60,110,0.75)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    const x0 = wrapX((o.x || 0) + t * (o.sp || 34) - camX * 0.08, W, 260);
    for (let i = 0; i < (o.n || 5); i++) bird(ctx, x0 - (i % 3) * 22 - Math.floor(i / 3) * 16, (o.y || 70) + (i % 3) * 12 + Math.sin(t * 2 + i) * 3, o.s || 1, t + i * 0.37);
    ctx.restore();
  }
  function hotBalloon(ctx, x, y, s, t, c1, c2, heart) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 0.8 + x * 0.01) * 7); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(90,50,60,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-13, 24); ctx.lineTo(-8, 46); ctx.moveTo(13, 24); ctx.lineTo(8, 46); ctx.stroke();
    ctx.fillStyle = '#a87a4a'; ctx.fillRect(-9, 46, 18, 12); ctx.strokeRect(-9, 46, 18, 12);
    if (heart) heartPath(ctx, 0, 2, 32); else { ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-40, 6, -34, -40, 0, -40); ctx.bezierCurveTo(34, -40, 40, 6, 0, 30); ctx.closePath(); }
    const g = ctx.createLinearGradient(-30, -40, 30, 30); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-12, -18, 7, 12, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function sunRays(ctx, x, y, t, a = 0.07, n = 12, len = 520) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.04); ctx.fillStyle = `rgba(255,244,190,${a})`;
    for (let i = 0; i < n; i++) { ctx.rotate(TAU / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -30); ctx.lineTo(len, 30); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function windmill(ctx, x, base, s, t, blade = '#fffaf0', heart) {
    ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
    ctx.fillStyle = '#f3e2c8'; ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-11, -96); ctx.lineTo(11, -96); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -94); ctx.lineTo(0, -118); ctx.lineTo(16, -94); ctx.closePath(); ctx.fillStyle = '#e85f7a'; ctx.fill(); ctx.stroke();
    roundRect(ctx, -6, -30, 12, 30, 6); ctx.fillStyle = '#9b5e34'; ctx.fill();
    ctx.translate(0, -100); ctx.rotate(t * 0.8);
    for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); if (heart) { heartPath(ctx, 0, 34, 14); ctx.fillStyle = i % 2 ? '#ff8fb8' : blade; ctx.fill(); ctx.stroke(); } else { ctx.fillStyle = blade; ctx.fillRect(-6, 6, 12, 54); ctx.strokeRect(-6, 6, 12, 54); } }
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function cloudShadows(ctx, camX, t, W, a = 0.08) {
    ctx.save(); ctx.fillStyle = `rgba(40,30,70,${a})`;
    for (let i = 0; i < 4; i++) {
      const x = wrapX(i * 460 + t * 16 - camX, W, 320), y = 392 + (i % 2) * 74;
      ctx.beginPath(); ctx.ellipse(x, y, 190, 30, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 130, y + 10, 130, 22, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function shootingStar(ctx, t, W, seed, per = 7) {
    const k = (t + seed) % per; if (k > 0.8) return;
    const R = U.rng(Math.floor((t + seed) / per) * 13 + seed * 7);
    const x0 = R() * W * 0.8, y0 = 20 + R() * 110, p = k / 0.8;
    const hx = x0 + p * 260, hy = y0 + p * 96;
    const g = ctx.createLinearGradient(hx, hy, hx - 150, hy - 55); g.addColorStop(0, `rgba(255,255,230,${1 - p})`); g.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 150, hy - 55); ctx.stroke();
    glowFast(ctx, hx, hy, 14, [255, 250, 210], 1 - p); ctx.restore();
  }
  function aurora(ctx, camX, t, W, cols) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    cols.forEach((col, b) => {
      const top = [], step = 24;
      for (let x = -24; x <= W + 24; x += step) top.push([x, 60 + b * 34 + Math.sin((x + camX * 0.05) * 0.006 + t * 0.35 + b * 1.7) * 24 + Math.sin(x * 0.015 - t * 0.25 + b) * 9]);
      ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] + 70);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 40 + b * 34, 0, 160 + b * 34); g.addColorStop(0, col.replace('A', '0.22')); g.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = g; ctx.fill();
    });
    ctx.restore();
  }
  function fog(ctx, camX, t, W, y, h, col, sp, par) {
    ctx.save(); ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) { const x = wrapX(i * 330 + t * sp - camX * par, W, 320); ctx.beginPath(); ctx.ellipse(x, y + Math.sin(t * 0.5 + i) * 6, 250, h, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function rain(ctx, t, W, H, n, col) {
    if (n <= 0) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = (i * 97.3 + t * 70) % (W + 40) - 20, y = (i * 53.7 + t * 640) % (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 17); }
    ctx.stroke(); ctx.restore();
  }
  function ripples(ctx, camX, t, W, n, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    for (let i = 0; i < n; i++) { const per = 1.1 + (i % 4) * 0.2, k = ((t + i * 0.37) % per) / per, R = U.rng(Math.floor((t + i * 0.37) / per) * 31 + i); const x = R() * W, y = 350 + R() * 180; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, y, 3 + k * 16, (3 + k * 16) * 0.35, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  function lightning(ctx, t, W, H, per, seed, col, S) {
    const k = (t + seed) % per;
    if (k > 0.45) return 0;
    const R = U.rng(Math.floor((t + seed) / per) * 17 + seed);
    const a = k < 0.08 ? 1 : k < 0.16 ? 0.3 : k < 0.24 ? 0.9 : Math.max(0, 1 - (k - 0.24) / 0.2);
    ctx.save(); ctx.globalAlpha = a * 0.35; ctx.fillStyle = col; ctx.fillRect(0, 0, W, 330);
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    let x = 120 + R() * (W - 240), y = 0; ctx.beginPath(); ctx.moveTo(x, y); while (y < 230) { x += (R() - 0.5) * 60; y += 24 + R() * 26; ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
    return a;
  }
  function paperPlane(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.4) * 0.16); ctx.scale(s, s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#6a7ab0'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-18, -11); ctx.lineTo(-9, 0); ctx.lineTo(-18, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dfe6f8'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-9, 0); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function planes(ctx, camX, t, W, n, seed) {
    const R = U.rng(seed);
    for (let i = 0; i < n; i++) { const sp = 40 + R() * 40, y0 = 50 + R() * 180, ph = R() * 50; const x = wrapX(ph * 30 + t * sp - camX * 0.15, W, 120); paperPlane(ctx, x, y0 + Math.sin(t * 0.9 + ph) * 16, 0.8 + R() * 0.5, t + ph); }
  }
  function gear(ctx, x, y, r, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const n = Math.max(8, Math.round(r / 7));
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 0.5) / n * TAU; ctx.lineTo(Math.cos(a0) * r * 0.8, Math.sin(a0) * r * 0.8); ctx.lineTo(Math.cos(a0 + 0.08) * r, Math.sin(a0 + 0.08) * r); ctx.lineTo(Math.cos(a1 - 0.08) * r, Math.sin(a1 - 0.08) * r); ctx.lineTo(Math.cos(a1) * r * 0.8, Math.sin(a1) * r * 0.8); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(70,45,10,0.7)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, TAU); ctx.fillStyle = 'rgba(70,45,10,0.8)'; ctx.fill();
    ctx.restore();
  }
  function smokePuffs(ctx, x, y, t, col, n = 4) {
    for (let i = 0; i < n; i++) { const k = ((t * 0.35 + i / n) % 1); ctx.globalAlpha = (1 - k) * 0.55; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + Math.sin(k * 5 + i) * 8 + k * 18, y - k * 70, 6 + k * 14, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function butterfly(ctx, x, y, s, t, col) {
    const f = Math.abs(Math.sin(t * 14));
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(60,30,60,0.7)'; ctx.lineWidth = 1;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 6 * f, -2, 6 * f + 1, 5, d * 0.5, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#3a2a3a'; ctx.fillRect(-1, -5, 2, 9); ctx.restore();
  }
  let vigCache = { key: '', cv: null };
  function vignette(ctx, W, H, a, col = '20,8,40') {
    const key = W + 'x' + H + col;
    if (vigCache.key !== key) {
      const cv = document.createElement('canvas'); cv.width = Math.ceil(W / 2); cv.height = Math.ceil(H / 2);
      const c = cv.getContext('2d'), g = c.createRadialGradient(cv.width / 2, cv.height * 0.55, Math.min(cv.width, cv.height) * 0.35, cv.width / 2, cv.height * 0.55, Math.max(cv.width, cv.height) * 0.72);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},1)`); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      vigCache = { key, cv };
    }
    ctx.save(); ctx.globalAlpha = a; ctx.drawImage(vigCache.cv, 0, 0, W, H); ctx.restore();
  }
  function tint(ctx, W, H, col, a, mode = 'soft-light') { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function godRays(ctx, W, H, t, x0, col, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * 120 + Math.sin(t * 0.3 + i) * 20, w = 50 + (i % 3) * 30;
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.9); g.addColorStop(0, col.replace('A', String(a))); g.addColorStop(1, col.replace('A', '0'));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w - 260, H); ctx.lineTo(x - 260, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  const floaters = (n, seed) => { const R = U.rng(seed); return Array.from({ length: n }, () => ({ x: R() * 1600, y: R(), sp: 0.3 + R() * 0.7, ph: R() * TAU, s: 0.6 + R() * 0.7, k: Math.floor(R() * 4) })); };
  const FL = { pillow: floaters(7, 3), nums: floaters(14, 5), crystal: floaters(10, 9), fluff: floaters(22, 11), seeds: floaters(18, 13), orbs: floaters(12, 17), bflies: floaters(7, 19), feather: floaters(14, 23), zzz: floaters(9, 29) };

  const DECOR = {
    heartTown: {
      sky(ctx, camX, t, W) {
        sunRays(ctx, W * 0.84 - camX * 0.02, 70, t, 0.06);
        hotBalloon(ctx, wrapX(200 + t * 6 - camX * 0.06, W, 120), 110, 0.9, t, '#ff9cc8', '#ff4f8a', true);
        hotBalloon(ctx, wrapX(760 + t * 4 - camX * 0.05, W, 120), 70, 0.6, t + 2, '#ffe680', '#ff9a3c', false);
        hotBalloon(ctx, wrapX(1180 + t * 5 - camX * 0.07, W, 120), 140, 0.75, t + 4, '#9fd6ff', '#5f8fff', true);
        flock(ctx, camX, t, W, { x: 100, y: 64, sp: 30, n: 5 });
      },
      far(ctx, off, t, W, S) { for (const fx of [260, 980, 1700]) { const x = fx - off; if (x > -120 && x < W + 120) windmill(ctx, x, 282, 0.62, t + fx, '#fffaf0', true); } },
      mid(ctx, off, t, W, S) { for (const it of S.midItems) if (it.smoke) { const x = it.smoke[0] - off; if (x > -40 && x < W + 40) smokePuffs(ctx, x, it.smoke[1], t + it.x, 'rgba(255,255,255,0.9)'); } },
      floor(ctx, camX, t, W) { cloudShadows(ctx, camX, t, W, 0.06); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#ffd9a8', 0.18); vignette(ctx, W, H, 0.22, '60,20,60'); },
    },
    cottonTown: {
      sky(ctx, camX, t, W) {
        shootingStar(ctx, t, W, 1, 6); shootingStar(ctx, t, W, 4.3, 9);
        hotBalloon(ctx, wrapX(500 + t * 5 - camX * 0.06, W, 120), 120, 0.7, t, '#e8dcff', '#b9a4e6', false);
      },
      far(ctx, off, t, W) {
        for (let fx = 400; fx < 3000; fx += 900) {
          const x = fx - off; if (x < -120 || x > W + 120) continue;
          ctx.fillStyle = '#fff2dc'; ctx.strokeStyle = '#7a6098'; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.fillRect(x + i * 9 - 2, 262, 4, 18); } ctx.fillRect(x - 14, 268, 28, 3);
          for (let i = 0; i < 3; i++) { const k = ((t * 0.32 + i / 3) % 1), sx = x - 60 + k * 120, sy = 278 - Math.sin(k * Math.PI) * 26; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy - 6, 7, 0, TAU); ctx.arc(sx + 6, sy - 8, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a4a7a'; ctx.fillRect(sx + 8, sy - 9, 4, 4); }
        }
      },
      floor(ctx, camX, t, W) { ctx.save(); for (let i = 0; i < 5; i++) { const x = wrapX(i * 380 + 100 - camX, W, 200); ctx.globalAlpha = 0.12 + Math.sin(t * 0.8 + i) * 0.05; ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.ellipse(x, 440 + (i % 2) * 50, 120, 22, 0, 0, TAU); ctx.fill(); } ctx.restore(); },
      front(ctx, camX, t, W) { ctx.save(); for (const f of FL.fluff) { const x = wrapX(f.x + t * 12 * f.sp - camX * 0.6, W, 40), y = 80 + ((f.y * 460 - t * 14 * f.sp) % 460 + 460) % 460; ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.6 * f.s, 0, TAU); ctx.fill(); } ctx.restore(); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#c7a8ff', 0.16); vignette(ctx, W, H, 0.3, '40,10,70'); },
    },
    drowsyField: {
      sky(ctx, camX, t, W) {
        sunRays(ctx, W * 0.84 - camX * 0.02, 70, t, 0.07);
        flock(ctx, camX, t, W, { x: 0, y: 80, sp: 36, n: 6 }); flock(ctx, camX, t + 13, W, { x: 700, y: 120, sp: 28, n: 3, s: 0.8 });
        hotBalloon(ctx, wrapX(900 + t * 4 - camX * 0.05, W, 120), 96, 0.7, t, '#ffd1e6', '#ff8fb8', false);
      },
      far(ctx, off, t, W) { for (const fx of [180, 760, 1420, 2100]) { const x = fx - off; if (x > -120 && x < W + 120) windmill(ctx, x, 276, 0.55, t * 1.2 + fx); } },
      floor(ctx, camX, t, W) {
        cloudShadows(ctx, camX, t, W, 0.07);
        for (const b of FL.bflies) { const x = wrapX(b.x + Math.sin(t * 0.5 + b.ph) * 120 + t * 10 - camX, W, 60), y = 360 + b.y * 120 + Math.sin(t * 2 + b.ph) * 20; butterfly(ctx, x, y, b.s, t + b.ph, ['#ffd23f', '#ff8fc4', '#8fd3ff', '#c9a2ff'][b.k]); }
      },
      front(ctx, camX, t, W) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; for (const f of FL.seeds) { const x = wrapX(f.x + t * 22 * f.sp - camX * 0.7, W, 40), y = 60 + ((f.y * 420 - t * 8 * f.sp) % 420 + 420) % 420; ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3 * f.s, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 7 * f.s); ctx.stroke(); } ctx.restore(); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#ffb28a', 0.2); vignette(ctx, W, H, 0.22, '80,30,40'); },
    },
    tossForest: {
      sky(ctx, camX, t, W) { aurora(ctx, camX, t, W, ['rgba(120,255,200,A)', 'rgba(190,140,255,A)']); shootingStar(ctx, t, W, 2, 8); },
      far(ctx, off, t, W) {
        for (let i = 0; i < 9; i++) { const x = 140 + i * 230 - off; if (x < -20 || x > W + 20) continue; const blink = ((t * 0.6 + i * 0.77) % 4) < 0.15; if (((i * 7 + Math.floor(t / 4)) % 3) === 0) continue; const y = 240 + (i % 3) * 18; ctx.fillStyle = blink ? 'rgba(0,0,0,0)' : '#ffe680'; Art.glowFast(ctx, x, y, 12, [255, 230, 120], blink ? 0 : 0.6); if (!blink) { ctx.beginPath(); ctx.arc(x - 5, y, 2.6, 0, TAU); ctx.arc(x + 5, y, 2.6, 0, TAU); ctx.fill(); } }
        fog(ctx, off * 5, t, W, 300, 26, 'rgba(160,170,255,0.08)', 10, 0.2);
      },
      mid(ctx, off, t, W, S) { for (const it of S.midItems) if (it.glow) { const x = it.glow[0] - off; if (x > -60 && x < W + 60) Art.glowFast(ctx, x, it.glow[1], 60 * it.glow[2], U.hex(it.glow[3]), 0.35 + Math.sin(t * 2 + it.x) * 0.2); } },
      floor(ctx, camX, t, W) { fog(ctx, camX, t, W, 380, 30, 'rgba(180,200,255,0.07)', 14, 1); fog(ctx, camX, t + 20, W, 470, 34, 'rgba(180,200,255,0.06)', -10, 1); },
      front(ctx, camX, t, W) { fog(ctx, camX, t, W, 530, 30, 'rgba(160,180,255,0.07)', 18, 1.2); },
      post(ctx, t, W, H) { godRays(ctx, W, H, t, W * 0.45, 'rgba(170,200,255,A)', 0.06); tint(ctx, W, H, '#4a5ad0', 0.22); vignette(ctx, W, H, 0.42, '5,5,30'); },
    },
    pillowCastle: {
      wall(ctx, off, t, W) { for (const f of FL.pillow) { const x = wrapX(f.x + t * 8 * f.sp - off, W, 80), y = 60 + f.y * 180 + Math.sin(t * 0.8 + f.ph) * 10; ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.6 + f.ph) * 0.2); Art.roundRect(ctx, -26 * f.s, -16 * f.s, 52 * f.s, 32 * f.s, 12 * f.s); ctx.fillStyle = ['#fdf8ff', '#ffe8f4', '#e8f4ff', '#fff6d0'][f.k]; ctx.fill(); ctx.strokeStyle = '#7a6098'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } },
      floor(ctx, camX, t, W) { ctx.save(); for (const z of FL.zzz) { const k = (t * 0.25 * z.sp + z.ph) % 1, x = wrapX(z.x - camX, W, 40), y = 520 - k * 220; ctx.globalAlpha = Math.sin(k * Math.PI) * 0.6; ctx.fillStyle = '#fff'; ctx.font = `${12 + z.s * 10}px Jua, sans-serif`; ctx.fillText('z', x, y); } ctx.restore(); },
      front(ctx, camX, t, W) { for (const f of FL.feather) { const x = wrapX(f.x + Math.sin(t + f.ph) * 30 - camX * 1.1, W, 40), y = ((f.y * 560 + t * 22 * f.sp) % 600) - 30; ctx.save(); ctx.globalAlpha = 0.8; ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + f.ph) * 0.8); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * f.s, 3 * f.s, 0, 0, TAU); ctx.fill(); ctx.restore(); } },
      post(ctx, t, W, H) { tint(ctx, W, H, '#b08aff', 0.18); vignette(ctx, W, H, 0.35, '30,10,60'); },
    },
    pencilTown: {
      sky(ctx, camX, t, W) {
        ctx.save(); ctx.globalAlpha = 0.22; ctx.lineWidth = 14; const cx = 260 - camX * 0.03, cy = 330;
        ['#ff5f7a', '#ffb02e', '#ffe14a', '#3ccf7a', '#4aa8ff', '#8a6ad8'].forEach((col, i) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 250 - i * 14, Math.PI, Math.PI * 2); ctx.stroke(); }); ctx.restore();
        planes(ctx, camX, t, W, 3, 7); flock(ctx, camX, t, W, { x: 300, y: 90, sp: 30, n: 4 });
      },
      floor(ctx, camX, t, W) { cloudShadows(ctx, camX, t, W, 0.06); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#fff0b8', 0.14); vignette(ctx, W, H, 0.18, '60,40,20'); },
    },
    notebookField: {
      sky(ctx, camX, t, W) {
        planes(ctx, camX, t, W, 4, 21);
        ctx.save(); ctx.strokeStyle = 'rgba(60,70,120,0.6)'; ctx.lineWidth = 2; flock(ctx, camX, t, W, { x: 500, y: 110, sp: 26, n: 4, col: 'rgba(50,60,110,0.7)' }); ctx.restore();
      },
      far(ctx, off, t, W) {
        const cx = 700 - off, cy = 180; if (cx < -300 || cx > W + 300) return;
        const L = 9, per = 12, tt = t % per, pts = [];
        for (let k = 0; k <= tt; k += 0.06) pts.push([cx + Math.sin(k * 0.9) * 150 + Math.sin(k * 2.3) * 40, cy + Math.cos(k * 1.3) * 60]);
        ctx.save(); ctx.strokeStyle = 'rgba(80,90,160,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        const [px, py] = pts[pts.length - 1] || [cx, cy];
        ctx.save(); ctx.translate(px, py); ctx.rotate(-0.6); ctx.fillStyle = '#ffcf3a'; ctx.fillRect(-7, -90, 14, 80); ctx.strokeStyle = '#6b4a20'; ctx.lineWidth = 2; ctx.strokeRect(-7, -90, 14, 80);
        ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(0, 6); ctx.lineTo(7, -10); ctx.closePath(); ctx.fillStyle = '#f3d3a3'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff9db5'; ctx.fillRect(-7, -100, 14, 12); ctx.restore();
        void L;
      },
      floor(ctx, camX, t, W) { cloudShadows(ctx, camX, t, W, 0.05); },
      post(ctx, t, W, H) { vignette(ctx, W, H, 0.16, '30,40,90'); },
    },
    rulerTower: {
      wall(ctx, off, t, W, S) {
        for (const [gx, gy, r, dir] of [[150, 90, 54, 1], [236, 150, 36, -1.5], [820, 70, 46, -1], [1500, 100, 60, 1], [1590, 180, 34, -1.8], [2200, 80, 50, 1]]) { const x = gx - off; if (x > -80 && x < W + 80) gear(ctx, x, gy, r, t * 0.6 * dir, 'rgba(201,160,58,0.85)'); }
        ctx.save(); for (const f of FL.nums) { const k = (t * 0.06 * f.sp + f.ph) % 1, x = wrapX(f.x - off, W, 40), y = 300 - k * 280; ctx.globalAlpha = Math.sin(k * Math.PI) * 0.5; ctx.fillStyle = '#8a6a2a'; ctx.font = `${16 + f.s * 16}px Jua, sans-serif`; ctx.fillText(String(Math.floor(f.ph * 10) % 10), x, y); } ctx.restore();
        const px = 1000 - off; if (px > -100 && px < W + 100) { ctx.save(); ctx.translate(px, 40); ctx.rotate(Math.sin(t * 1.6) * 0.35); ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 150); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 160, 18, 0, TAU); ctx.fillStyle = Art.goldGrad(ctx, 142, 178); ctx.fill(); ctx.stroke(); ctx.restore(); }
      },
      floor(ctx, camX, t, W) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const x = wrapX(200 + i * 360 - camX * 1, W, 200); ctx.globalAlpha = 0.08 + Math.sin(t + i) * 0.02; ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.moveTo(x - 30, 330); ctx.lineTo(x + 30, 330); ctx.lineTo(x + 110, 540); ctx.lineTo(x - 10, 540); ctx.closePath(); ctx.fill(); } ctx.restore(); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#ffcf80', 0.16); vignette(ctx, W, H, 0.3, '60,30,0'); },
    },
    grumpyTown: {
      sky(ctx, camX, t, W, S) {
        const m = S.mood || 0;
        if (m > 0.05) { Art.glowFast(ctx, W * 0.78 - camX * 0.02, 70, 220, [255, 220, 150], m * 0.9); sunRays(ctx, W * 0.78 - camX * 0.02, 70, t, 0.06 * m); }
        ctx.save(); ctx.globalAlpha = 0.75 * (1 - m * 0.8);
        for (let i = 0; i < 5; i++) { const x = wrapX(i * 340 + t * 10 - camX * 0.06, W, 220), y = 40 + (i % 3) * 36; ctx.fillStyle = '#2a1a3a'; for (const [dx, dy, r] of [[-60, 10, 40], [-10, -8, 54], [50, 6, 42], [0, 20, 46]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); } }
        ctx.restore();
        if (m < 0.95) lightning(ctx, t, W, 540, 9, 3, '#e8d8ff', S);
        flock(ctx, camX, t, W, { x: 200, y: 120, sp: 44, n: 4, col: 'rgba(20,5,30,0.8)' });
      },
      far(ctx, off, t, W, S) { const cx = S.farW * 0.75 - off; if (cx > -200 && cx < W + 200) for (const [dx, h] of [[-30, 160], [30, 130], [-80, 100], [80, 90]]) { const on = (Math.sin(t * 3 + dx) + Math.sin(t * 7.1 + dx * 0.3)) > -0.2; Art.glowFast(ctx, cx + dx, 290 - h, 14, [255, 140, 230], on ? 0.9 : 0.2); } },
      floor(ctx, camX, t, W, S) { ripples(ctx, camX, t, W, Math.round(14 * (1 - (S.mood || 0))), 'rgba(200,180,255,0.6)'); },
      front(ctx, camX, t, W, S) { rain(ctx, t, W, 560, Math.round(70 * (1 - (S.mood || 0))), 'rgba(200,190,255,0.35)'); },
      post(ctx, t, W, H, S) { const m = S.mood || 0; tint(ctx, W, H, '#4a2a6a', 0.3 * (1 - m)); tint(ctx, W, H, '#ffd9a8', 0.2 * m); vignette(ctx, W, H, 0.38 - m * 0.15, '20,5,30'); },
    },
    thornGarden: {
      sky(ctx, camX, t, W, S) { Art.glowFast(ctx, W * 0.8 - camX * 0.03 + 0, 80, 150, [255, 90, 130], 0.4 + Math.sin(t * 1.2) * 0.1); lightning(ctx, t, W, 540, 13, 7, '#ffb8d8', S); flock(ctx, camX, t, W, { x: 0, y: 100, sp: 50, n: 5, col: 'rgba(30,5,20,0.85)' }); },
      far(ctx, off, t, W) { fog(ctx, off * 5, t, W, 292, 24, 'rgba(255,140,190,0.08)', 12, 0.2); },
      floor(ctx, camX, t, W) { fog(ctx, camX, t, W, 400, 28, 'rgba(255,150,200,0.06)', 14, 1); fog(ctx, camX, t + 9, W, 500, 34, 'rgba(200,120,220,0.07)', -12, 1); },
      front(ctx, camX, t, W) { fog(ctx, camX, t, W, 540, 30, 'rgba(255,150,210,0.07)', 20, 1.2); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#ff5fa0', 0.18); vignette(ctx, W, H, 0.4, '30,0,20'); },
    },
    mirrorHall: {
      wall(ctx, off, t, W) {
        const k = (t % 5) / 5, x = -200 + k * (W + 400);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x - 50, 330); ctx.lineTo(x - 120, 330); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); for (const f of FL.orbs) { const xx = wrapX(f.x - off + Math.sin(t * 0.5 + f.ph) * 40, W, 40), y = 60 + f.y * 230 + Math.sin(t * 0.9 + f.ph) * 14; Art.glowFast(ctx, xx, y, 16 * f.s + 6, [220, 180, 255], 0.5 + Math.sin(t * 2 + f.ph) * 0.3); } ctx.restore();
      },
      floor(ctx, camX, t, W) { ctx.save(); for (let i = 0; i < 16; i++) { const R = U.rng(i * 7 + 1), x = wrapX(R() * 1600 - camX, W, 30), y = 345 + R() * 180, k = (Math.sin(t * 2.4 + i * 1.7) + 1) / 2; if (k < 0.6) continue; ctx.globalAlpha = (k - 0.6) * 2; ctx.fillStyle = '#fff'; Art.starPath(ctx, x, y, 6, 1.6, 4, 0); ctx.fill(); } ctx.restore(); },
      post(ctx, t, W, H) { tint(ctx, W, H, '#9a6aff', 0.16); vignette(ctx, W, H, 0.38, '15,5,35'); },
    },
    throne: {
      wall(ctx, off, t, W, S) {
        for (const f of FL.crystal) { const k = (t * 0.05 * f.sp + f.ph) % 1, x = wrapX(f.x - off, W, 40), y = 320 - k * 320; ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8; ctx.translate(x, y); ctx.rotate(t * f.sp); ctx.fillStyle = S.healed > 0.5 ? '#ffd1e6' : '#c98bff'; ctx.beginPath(); ctx.moveTo(0, -9 * f.s); ctx.lineTo(5 * f.s, 0); ctx.lineTo(0, 9 * f.s); ctx.lineTo(-5 * f.s, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        for (const bx of [60, S.wallW - 60]) { const x = bx - off; if (x < -60 || x > W + 60) continue; ctx.fillStyle = '#2a1442'; ctx.fillRect(x - 18, 262, 36, 34); for (let i = 0; i < 3; i++) { const fl = Math.sin(t * 9 + i * 2) * 4; ctx.fillStyle = ['#8a4fff', '#c98bff', '#ffd1ff'][i]; ctx.beginPath(); ctx.moveTo(x - 14 + i * 4, 262); ctx.quadraticCurveTo(x - 8 + i * 4 + fl, 236 - i * 8, x + i * 2, 214 + i * 6); ctx.quadraticCurveTo(x + 10 - i * 2 + fl, 236 - i * 8, x + 14 - i * 4, 262); ctx.fill(); } Art.glowFast(ctx, x, 240, 60, [170, 100, 255], 0.6); }
      },
      floor(ctx, camX, t, W, S) { fog(ctx, camX, t, W, 470, 30, S.healed > 0.5 ? 'rgba(255,220,240,0.08)' : 'rgba(150,80,220,0.1)', 16, 1); },
      post(ctx, t, W, H, S) { const r = S.rage || 0; tint(ctx, W, H, '#8a2ad0', 0.18 * (1 - (S.healed || 0))); if (r > 0) tint(ctx, W, H, '#ff2d6f', r * (0.12 + Math.sin(t * 4) * 0.05), 'source-over'); vignette(ctx, W, H, 0.42, '20,0,30'); },
    },
  };

  return {
    setRenderScale(s) { RS = s; },
    build(theme, mapW) { const S = THEMES[theme](mapW); S.theme = theme; S.deco = DECOR[theme] || {}; S.farW = lw(0.2, mapW); S.midW = lw(0.5, mapW); S.wallW = lw(0.42, mapW); if (theme === 'throne') Scenes._ww = lw(0.42, mapW); return S; },
    candle,
  };
})();
