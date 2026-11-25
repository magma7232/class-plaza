'use strict';
// 몬스터·보스·소품·아이템·공격 효과 그리기
const Art2 = (() => {
  const { heartPath, roundRect, starPath, glowFast, flower, goldGrad, shiny } = Art;
  const INK = Art.INK, TAU = Math.PI * 2;
  const F = (px) => `${px}px Jua, "Noto Sans KR", sans-serif`;

  function face(c, x, y, s, mood, t) { // 간단한 몬스터 얼굴
    c.save(); c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = 'round'; c.lineWidth = Math.max(1.5, s * 0.075);
    const ex = s * 0.22;
    if (mood === 'sleep') {
      for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * ex, y, s * 0.09, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.beginPath(); c.ellipse(x, y + s * 0.24, s * 0.06, s * 0.08, 0, 0, TAU); c.stroke();
    } else if (mood === 'happy') {
      for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * ex, y + s * 0.05, s * 0.09, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke(); }
      c.beginPath(); c.arc(x, y + s * 0.15, s * 0.14, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    } else {
      for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * ex, y + s * 0.04, s * 0.075, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(x - ex - s * 0.16, y - s * 0.16); c.lineTo(x - ex + s * 0.1, y - s * 0.05); c.moveTo(x + ex + s * 0.16, y - s * 0.16); c.lineTo(x + ex - s * 0.1, y - s * 0.05); c.stroke();
      if (mood === 'attack') { c.beginPath(); c.ellipse(x, y + s * 0.28, s * 0.09, s * 0.07, 0, 0, TAU); c.fill(); }
      else { c.beginPath(); c.arc(x, y + s * 0.3, s * 0.1, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
    }
    c.restore();
  }
  function whiteFlash(c, f, draw) { if (f > 0) { c.save(); c.globalAlpha *= Math.min(1, f) * 0.6; c.globalCompositeOperation = 'lighter'; draw(); c.restore(); } }

  // ---------------- 몬스터 ----------------
  const BLOBS = [[-0.62, 0.12, 0.42], [-0.25, -0.24, 0.52], [0.22, -0.3, 0.5], [0.62, 0.02, 0.44], [0.12, 0.18, 0.54], [-0.32, 0.24, 0.42]];
  function cloud(c, x, y, s, o) {
    const t = o.t || 0, happy = o.mood === 'happy';
    const pal = o.color === 'gold' ? ['#8a5a00', '#fff6b0', '#ffc21a'] : happy ? ['#8b9bc4', '#ffffff', '#dbe6ff'] : o.color === 'purple' ? ['#2c1245', '#c98bff', '#6a2fae'] : o.color === 'dark' ? ['#1d1830', '#6d6788', '#3a3552'] : ['#3b3152', '#e4dff2', '#8c84a8'];
    c.save(); if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.translate(x, y); const sq = 1 + Math.sin(t * 4.2 + (o.phase || 0)) * 0.045; c.scale(1 / sq, sq); if (o.facing < 0) c.scale(-1, 1);
    c.fillStyle = pal[0]; for (const [bx, by, r] of BLOBS) { c.beginPath(); c.arc(bx * s, by * s, r * s + Math.max(2, s * 0.08), 0, TAU); c.fill(); }
    const g = c.createLinearGradient(0, -s * 0.85, 0, s * 0.75); g.addColorStop(0, pal[1]); g.addColorStop(1, pal[2]); c.fillStyle = g;
    for (const [bx, by, r] of BLOBS) { c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-s * 0.28, -s * 0.42, s * 0.24, s * 0.12, -0.35, 0, TAU); c.fill();
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; for (const [bx, by, r] of BLOBS) { c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fill(); } });
    face(c, s * 0.02, s * 0.02, s, happy || o.color === 'gold' ? 'happy' : o.att ? 'attack' : 'grumpy', t);
    if (o.color === 'gold') { // 왕관
      c.save(); c.translate(s * 0.05, -s * 0.78); c.beginPath(); c.moveTo(-s * 0.26, 0); c.lineTo(-s * 0.3, -s * 0.3); c.lineTo(-s * 0.12, -s * 0.12); c.lineTo(0, -s * 0.36); c.lineTo(s * 0.12, -s * 0.12); c.lineTo(s * 0.3, -s * 0.3); c.lineTo(s * 0.26, 0); c.closePath();
      c.fillStyle = goldGrad(c, -s * 0.36, 0); c.fill(); c.lineWidth = Math.max(1.5, s * 0.05); c.strokeStyle = '#8a5a00'; c.stroke(); c.fillStyle = '#ff5f9e'; c.beginPath(); c.arc(0, -s * 0.12, s * 0.06, 0, TAU); c.fill(); c.restore();
    }
    c.fillStyle = 'rgba(255,110,130,0.45)'; c.beginPath(); c.ellipse(-s * 0.4, s * 0.18, s * 0.11, s * 0.06, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(s * 0.46, s * 0.18, s * 0.11, s * 0.06, 0, 0, TAU); c.fill();
    c.restore();
    if (o.color === 'dark' && !happy) { // 번개
      const k = (Math.sin(t * 7) + 1) / 2;
      if (k > 0.6) { c.save(); c.strokeStyle = '#fff36a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, y + s * 0.6); c.lineTo(x + 4, y + s * 0.85); c.lineTo(x - 2, y + s * 0.95); c.lineTo(x + 8, y + s * 1.2); c.stroke(); c.restore(); }
    }
  }
  function sheep(c, x, y, s, o) { // y = 발 위치
    const t = o.t, aim = o.st === 'aim', ch = o.st === 'charge', W = s * 2.3;
    c.save(); c.translate(x + (aim ? Math.sin(t * 50) * 2 : 0), y); if (o.f < 0) c.scale(-1, 1); if (ch) c.rotate(0.12);
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.1); c.lineCap = 'round';
    const lg = ch ? Math.sin(t * 30) * 6 : Math.sin(t * 6) * 2;
    for (const lx of [-0.45, -0.2, 0.2, 0.45]) { c.beginPath(); c.moveTo(lx * W * 0.5, -s * 0.5); c.lineTo(lx * W * 0.5 + (lx > 0 ? lg : -lg), 0); c.stroke(); }
    const blobs = [[-0.4, -1.0, 0.42], [-0.05, -1.2, 0.46], [0.32, -1.05, 0.42], [0.0, -0.75, 0.5], [-0.35, -0.7, 0.36], [0.35, -0.7, 0.36]];
    c.fillStyle = '#6b6080'; for (const [bx, by, r] of blobs) { c.beginPath(); c.arc(bx * s, by * s, r * s + 2.5, 0, TAU); c.fill(); }
    for (const [bx, by, r] of blobs) { const g = c.createRadialGradient(bx * s - 4, by * s - 4, 2, bx * s, by * s, r * s); g.addColorStop(0, '#fff'); g.addColorStop(1, '#ddd6ea'); c.fillStyle = g; c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fill(); }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; for (const [bx, by, r] of blobs) { c.beginPath(); c.arc(bx * s, by * s, r * s, 0, TAU); c.fill(); } });
    // 머리
    c.save(); c.translate(s * 0.62, -s * (ch ? 0.7 : 0.95));
    c.beginPath(); c.ellipse(0, 0, s * 0.34, s * 0.3, 0.2, 0, TAU); c.fillStyle = '#5a5068'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#c9a37a'; c.beginPath(); c.arc(-s * 0.18, -s * 0.24, s * 0.12, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#fff';
    if (aim || ch) { c.beginPath(); c.arc(s * 0.06, -s * 0.04, s * 0.08, 0, TAU); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(s * 0.08, -s * 0.03, s * 0.045, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(-s * 0.06, -s * 0.16); c.lineTo(s * 0.14, -s * 0.1); c.stroke(); }
    else { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(s * 0.06, -s * 0.03, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    c.fillStyle = '#2a1a2a'; c.beginPath(); c.ellipse(s * 0.12, s * 0.14, s * 0.07, s * (aim || ch ? 0.04 : 0.09), 0, 0, TAU); c.fill();
    c.restore();
    c.restore();
    if (!aim && !ch) { c.save(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = F(13); const k = (t * 0.5) % 1; c.globalAlpha = Math.sin(k * Math.PI); c.fillText('하~암', x + (o.f < 0 ? -50 : 20), y - s * 1.6 - k * 16); c.restore(); }
  }
  function snore(c, x, y, s, o) {
    const t = o.t, cast = o.st === 'cast';
    c.save(); c.translate(x, y);
    const sq = cast ? 1.12 : 1 + Math.sin(t * 2) * 0.04; c.scale(1 / sq, sq);
    c.beginPath(); c.moveTo(-s * 0.42, 0); c.quadraticCurveTo(-s * 0.5, -s * 0.6, -s * 0.34, -s * 0.9); c.lineTo(s * 0.34, -s * 0.9); c.quadraticCurveTo(s * 0.5, -s * 0.6, s * 0.42, 0); c.closePath();
    c.fillStyle = '#fff3e4'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#6b4a35'; c.stroke();
    c.beginPath(); c.moveTo(-s * 1.0, -s * 0.85); c.bezierCurveTo(-s * 1.0, -s * 1.9, s * 1.0, -s * 1.9, s * 1.0, -s * 0.85); c.quadraticCurveTo(0, -s * 0.62, -s * 1.0, -s * 0.85); c.closePath();
    const g = c.createLinearGradient(0, -s * 1.8, 0, -s * 0.7); g.addColorStop(0, '#9fb6ff'); g.addColorStop(1, '#5a6fd6'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#26307a'; c.stroke();
    c.fillStyle = '#fff'; for (const [px, py, r] of [[-0.5, -1.25, 0.16], [0.15, -1.5, 0.19], [0.55, -1.15, 0.13], [-0.1, -1.05, 0.1]]) { c.beginPath(); c.arc(px * s, py * s, r * s, 0, TAU); c.fill(); }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -s * 0.9, s, 0, TAU); c.fill(); });
    face(c, 0, -s * 0.48, s * 0.8, cast ? 'attack' : 'sleep', t);
    c.restore();
    if (!cast) { const b = (Math.sin(t * 1.6) + 1) / 2; c.save(); c.globalAlpha = 0.75; c.strokeStyle = '#7fc8ff'; c.fillStyle = 'rgba(210,240,255,0.55)'; c.beginPath(); c.arc(x + s * 0.3, y - s * 0.32, s * (0.06 + b * 0.16), 0, TAU); c.fill(); c.stroke(); c.restore(); }
  }
  function shade(c, x, y, s, o) {
    const t = o.t, fade = o.st === 'fade', dash = o.st === 'dash';
    c.save(); c.globalAlpha *= fade ? 0.35 + Math.sin(t * 30) * 0.15 : 0.92; c.translate(x, y); if (o.f < 0) c.scale(-1, 1); if (dash) c.rotate(0.25);
    c.beginPath(); c.moveTo(-s, s * 0.6); c.quadraticCurveTo(-s * 1.1, -s * 1.2, 0, -s * 1.2); c.quadraticCurveTo(s * 1.1, -s * 1.2, s, s * 0.6);
    for (let i = 0; i < 4; i++) { const x0 = s - (i + 0.5) * s * 0.5; c.quadraticCurveTo(x0, s * (0.3 + Math.sin(t * 6 + i) * 0.15), x0 - s * 0.25, s * 0.6); }
    c.closePath();
    const g = c.createLinearGradient(0, -s, 0, s * 0.6); g.addColorStop(0, '#d9ecff'); g.addColorStop(1, '#8fb4ff'); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3a4f8a'; c.stroke();
    c.fillStyle = '#fff6b0'; for (const [px, py] of [[-0.5, -0.5], [0.4, -0.7], [0.1, 0.1], [-0.6, 0.2]]) { starPath(c, px * s, py * s, s * 0.09, s * 0.04); c.fill(); }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -s * 0.3, s, 0, TAU); c.fill(); });
    face(c, s * 0.1, -s * 0.45, s * 0.8, dash ? 'attack' : 'grumpy', t);
    c.restore();
  }
  function scribble(c, x, y, s, o) {
    const t = o.t;
    c.save(); c.translate(x, y - s); if (o.f < 0) c.scale(-1, 1);
    const cols = ['#ff5f7a', '#4aa8ff', '#3ccf7a', '#ffb02e', '#a06aff'];
    c.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      c.strokeStyle = cols[k]; c.lineWidth = 3.2; c.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * TAU * 2 + k * 1.3 + t * (k % 2 ? 2 : -2), r = s * (0.55 + 0.35 * Math.sin(a * 2.3 + k));
        const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.stroke();
    }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); });
    for (const d of [-1, 1]) {
      c.beginPath(); c.arc(d * s * 0.28, -s * 0.15, s * 0.22, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(d * s * 0.28 + Math.sin(t * 3 + d) * s * 0.06, -s * 0.12, s * 0.09, 0, TAU); c.fill();
    }
    c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-s * 0.25, s * 0.3); for (let i = 1; i <= 4; i++) c.lineTo(-s * 0.25 + i * s * 0.125, s * 0.3 + (i % 2 ? -s * 0.08 : 0)); c.stroke();
    c.restore();
    c.save(); c.strokeStyle = INK; c.lineWidth = 3; c.lineCap = 'round'; const lg = Math.sin(t * 8) * 6;
    c.beginPath(); c.moveTo(x - s * 0.3, y - s * 0.2); c.lineTo(x - s * 0.35 + lg, y); c.moveTo(x + s * 0.3, y - s * 0.2); c.lineTo(x + s * 0.35 - lg, y); c.stroke(); c.restore();
  }
  function crumb(c, x, y, s, o) {
    const t = o.t; c.save(); c.translate(x, y - s * 0.7); if (o.f < 0) c.scale(-1, 1);
    const wob = Math.sin(t * 10 + (o.ph || 0)) * 0.15;
    c.rotate(wob);
    roundRect(c, -s * 1.1, -s * 0.65, s * 2.2, s * 1.3, s * 0.6);
    const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#f2d6dc'); g.addColorStop(1, '#b89aa6'); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = '#6a4a5a'; c.stroke();
    c.strokeStyle = 'rgba(100,70,80,0.4)'; c.lineWidth = 1.5; for (const px of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(px * s, -s * 0.5); c.quadraticCurveTo(px * s + 4, 0, px * s, s * 0.5); c.stroke(); }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; roundRect(c, -s * 1.1, -s * 0.65, s * 2.2, s * 1.3, s * 0.6); c.fill(); });
    face(c, s * 0.45, -s * 0.05, s * 0.9, 'grumpy', t);
    c.restore();
  }
  function tack(c, x, y, s, o) {
    const t = o.t, ball = o.st === 'curl' || o.st === 'roll';
    c.save(); c.translate(x, y - s); if (o.f < 0) c.scale(-1, 1);
    if (o.st === 'roll') c.rotate(t * 18);
    if (o.st === 'curl') c.translate(Math.sin(t * 50) * 2, 0);
    const pins = ['#ff4f6d', '#4aa8ff', '#ffd23f', '#3ccf7a', '#a06aff'];
    const n = ball ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = ball ? (i / n) * TAU : Math.PI * (1.05 + (i / (n - 1)) * 0.9);
      const px = Math.cos(a) * s * 1.05, py = Math.sin(a) * s * 1.0;
      c.strokeStyle = '#9aa0aa'; c.lineWidth = 2; c.beginPath(); c.moveTo(px * 0.7, py * 0.7); c.lineTo(px * 1.25, py * 1.25); c.stroke();
      c.beginPath(); c.arc(px * 1.25, py * 1.25, s * 0.16, 0, TAU); c.fillStyle = pins[i % pins.length]; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    }
    c.beginPath(); c.arc(0, 0, s, 0, TAU); const g = c.createRadialGradient(-s * 0.3, -s * 0.3, 2, 0, 0, s); g.addColorStop(0, '#c99a6a'); g.addColorStop(1, '#8a5a34'); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#4a2a14'; c.stroke();
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); });
    if (!ball) { c.beginPath(); c.ellipse(s * 0.45, s * 0.15, s * 0.5, s * 0.45, 0, 0, TAU); c.fillStyle = '#f2d6b0'; c.fill(); face(c, s * 0.5, s * 0.05, s * 0.9, 'grumpy', t); c.fillStyle = INK; c.beginPath(); c.arc(s * 0.95, s * 0.2, s * 0.1, 0, TAU); c.fill(); }
    c.restore();
  }
  function bat(c, x, y, s, o) {
    const t = o.t, flap = Math.sin(t * (o.st === 'swoop' ? 24 : 14)) * 0.6;
    c.save(); c.translate(x, y); if (o.f < 0) c.scale(-1, 1);
    for (const d of [-1, 1]) {
      c.save(); c.scale(d, 1); c.rotate(-flap * 0.6);
      c.beginPath(); c.moveTo(s * 0.4, 0); c.quadraticCurveTo(s * 1.2, -s * 1.1, s * 1.9, -s * 0.4);
      c.quadraticCurveTo(s * 1.6, -s * 0.1, s * 1.5, s * 0.2); c.quadraticCurveTo(s * 1.2, 0, s * 1.05, s * 0.35); c.quadraticCurveTo(s * 0.8, s * 0.1, s * 0.4, s * 0.3); c.closePath();
      c.fillStyle = '#5b2a8a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1f0d33'; c.stroke();
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, s * 0.6, 0, TAU); c.fillStyle = '#7d42b5'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#1f0d33'; c.stroke();
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * s * 0.2, -s * 0.5); c.lineTo(d * s * 0.38, -s * 0.9); c.lineTo(d * s * 0.48, -s * 0.38); c.closePath(); c.fill(); c.stroke(); }
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.6, 0, TAU); c.fill(); });
    face(c, 0, -s * 0.05, s * 0.6, 'grumpy', t);
    c.fillStyle = '#fff'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * s * 0.08, s * 0.2); c.lineTo(d * s * 0.14, s * 0.34); c.lineTo(d * s * 0.2, s * 0.2); c.fill(); }
    c.restore();
  }
  function thorn(c, x, y, s, o) {
    const t = o.t, cast = o.st === 'cast';
    c.save(); c.translate(x, y);
    c.strokeStyle = '#3f7a3a'; c.lineWidth = s * 0.28; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-s * 0.6, 0); c.quadraticCurveTo(-s * 0.9, -s * 0.8, 0, -s * 1.0); c.quadraticCurveTo(s * 0.8, -s * 1.2, s * 0.2 + Math.sin(t * 2) * 6, -s * 1.9); c.stroke();
    c.strokeStyle = '#6cc24a'; c.lineWidth = s * 0.12; c.stroke();
    c.fillStyle = '#2f5a2a'; for (const [px, py, a] of [[-0.75, -0.45, 2.6], [-0.3, -0.98, 2.0], [0.45, -1.15, -0.6], [0.35, -1.6, -0.3]]) { c.save(); c.translate(px * s, py * s); c.rotate(a); c.beginPath(); c.moveTo(0, -s * 0.08); c.lineTo(s * 0.22, 0); c.lineTo(0, s * 0.08); c.fill(); c.restore(); }
    c.save(); c.translate(s * 0.2 + Math.sin(t * 2) * 6, -s * 2.0); if (cast) c.scale(1.15, 1.15);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.3; c.beginPath(); c.ellipse(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.32, s * 0.22, a, 0, TAU); c.fillStyle = '#a0204a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#4a0a20'; c.stroke(); }
    c.beginPath(); c.arc(0, 0, s * 0.38, 0, TAU); c.fillStyle = '#d9365f'; c.fill(); c.stroke();
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.6, 0, TAU); c.fill(); });
    face(c, 0, -s * 0.02, s * 0.45, cast ? 'attack' : 'grumpy', t);
    c.restore(); c.restore();
  }
  function snoreKing(c, x, y, s, o) {
    const t = o.t, cast = o.st === 'cast' || o.st === 'aim', sl = o.st === 'wait';
    c.save(); c.translate(x, y);
    const sq = cast ? 1.08 + Math.sin(t * 30) * 0.03 : 1 + Math.sin(t * 1.6) * 0.03; c.scale(1 / sq, sq);
    c.beginPath(); c.moveTo(-s * 0.5, 0); c.quadraticCurveTo(-s * 0.62, -s * 0.55, -s * 0.42, -s * 0.85); c.lineTo(s * 0.42, -s * 0.85); c.quadraticCurveTo(s * 0.62, -s * 0.55, s * 0.5, 0); c.closePath();
    c.fillStyle = '#fff1df'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#6b4a35'; c.stroke();
    c.beginPath(); c.moveTo(-s * 1.2, -s * 0.8); c.bezierCurveTo(-s * 1.25, -s * 2.0, s * 1.25, -s * 2.0, s * 1.2, -s * 0.8); c.quadraticCurveTo(0, -s * 0.52, -s * 1.2, -s * 0.8); c.closePath();
    const g = c.createLinearGradient(0, -s * 1.9, 0, -s * 0.6); g.addColorStop(0, '#ff8fb8'); g.addColorStop(1, '#d6336f'); c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = '#6b1533'; c.stroke();
    c.fillStyle = '#fff'; for (const [px, py, r] of [[-0.6, -1.3, 0.18], [0.1, -1.6, 0.22], [0.66, -1.2, 0.15], [-0.15, -1.05, 0.12], [0.4, -1.45, 0.1]]) { c.beginPath(); c.arc(px * s, py * s, r * s, 0, TAU); c.fill(); }
    // 고깔 수면 모자
    c.save(); c.translate(0, -s * 1.7); c.rotate(-0.3 + Math.sin(t) * 0.05);
    c.beginPath(); c.moveTo(-s * 0.4, 0); c.quadraticCurveTo(-s * 0.1, -s * 0.8, s * 0.6, -s * 0.5); c.quadraticCurveTo(s * 0.15, -s * 0.3, s * 0.4, 0); c.closePath(); c.fillStyle = '#6a8cff'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#26307a'; c.stroke();
    c.beginPath(); c.arc(s * 0.6, -s * 0.5, s * 0.1, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.restore();
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -s * 1.0, s * 1.2, 0, TAU); c.fill(); });
    face(c, 0, -s * 0.5, s * 0.75, sl ? 'sleep' : cast ? 'attack' : 'grumpy', t);
    c.fillStyle = '#c8a07a'; c.strokeStyle = '#6b4a35'; c.lineWidth = 2;
    for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * s * 0.14, -s * 0.28, s * 0.16, s * 0.06, d * 0.3, 0, TAU); c.fill(); c.stroke(); }
    c.restore();
    if (sl) { c.save(); c.fillStyle = '#fff'; c.font = F(26); const k = (t * 0.4) % 1; c.globalAlpha = Math.sin(k * Math.PI); c.fillText('Z', x + s * 0.6 + k * 30, y - s * 1.6 - k * 40); c.restore(); }
  }
  function eraserBoss(c, x, y, s, o) {
    const t = o.t, ch = o.st === 'charge', aim = o.st === 'aim';
    c.save(); c.translate(x + (aim ? Math.sin(t * 50) * 3 : 0), y - s * 0.8); if (o.f < 0) c.scale(-1, 1);
    if (ch) c.rotate(Math.sin(t * 20) * 0.08);
    const W = s * 2.2, Hh = s * 1.6;
    c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round';
    const lg = ch ? Math.sin(t * 30) * 10 : Math.sin(t * 5) * 3;
    c.beginPath(); c.moveTo(-W * 0.25, Hh * 0.5); c.lineTo(-W * 0.3 + lg, s * 0.8); c.moveTo(W * 0.25, Hh * 0.5); c.lineTo(W * 0.3 - lg, s * 0.8); c.stroke();
    roundRect(c, -W / 2, -Hh / 2, W, Hh, s * 0.25);
    const g = c.createLinearGradient(0, -Hh / 2, 0, Hh / 2); g.addColorStop(0, '#ffe1ea'); g.addColorStop(1, '#f29ab5'); c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = '#7a2a48'; c.stroke();
    c.fillStyle = '#3a6fd6'; c.fillRect(-W / 2, Hh * 0.05, W, Hh * 0.38); c.fillStyle = '#fff'; c.fillRect(-W / 2, Hh * 0.13, W, Hh * 0.1); c.strokeRect(-W / 2, Hh * 0.05, W, Hh * 0.38);
    c.save(); if (o.f < 0) c.scale(-1, 1); c.fillStyle = '#fff'; c.font = F(s * 0.3); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('심술', 0, Hh * 0.33); c.restore();
    whiteFlash(c, o.flash, () => { c.fillStyle = '#fff'; roundRect(c, -W / 2, -Hh / 2, W, Hh, s * 0.25); c.fill(); });
    face(c, 0, -Hh * 0.2, s * 0.7, aim || ch ? 'attack' : 'grumpy', t);
    c.restore();
    if (ch) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4; for (let i = 0; i < 3; i++) { const yy = y - s * (0.4 + i * 0.5); c.beginPath(); c.moveTo(x - o.f * s * 1.4, yy); c.lineTo(x - o.f * s * 2.4, yy); c.stroke(); } c.restore(); }
  }

  // 몬스터 한 마리 그리기 (sy = 바닥 기준, z는 이미 반영되지 않은 값)
  function mon(c, m, sx, sy, s, t) {
    const o = { t: t + (m.ph || 0), st: m.st, f: m.f, flash: m.flash || 0, ph: m.ph, mood: m.happy ? 'happy' : null, att: m.st === 'cast' || m.st === 'aim' };
    const z = (m.z || 0) * s;
    switch (m.type) {
      case 'cloud': cloud(c, sx, sy - z - 30 * s, 30 * s, Object.assign(o, { facing: m.f, alpha: m.alpha })); break;
      case 'cloudX': cloud(c, sx, sy - z - 36 * s, 42 * s, Object.assign(o, { facing: m.f, color: 'dark', alpha: m.alpha })); break;
      case 'gold': {
        glowFast(c, sx, sy - z - 30 * s, 70 * s, [255, 220, 90], 0.7 + Math.sin(t * 6) * 0.2);
        cloud(c, sx, sy - z - 28 * s, 30 * s, Object.assign(o, { facing: m.f, color: 'gold', alpha: m.alpha }));
        for (let i = 0; i < 3; i++) shiny(c, sx + Math.cos(t * 2 + i * 2.1) * 34 * s, sy - z - 34 * s + Math.sin(t * 2 + i * 2.1) * 20 * s, 7 * s, t, i * 2);
        break;
      }
      case 'sheep': sheep(c, sx, sy - z, 34 * s, o); break;
      case 'snore': snore(c, sx, sy - z, 36 * s, o); break;
      case 'shade': shade(c, sx, sy - z - 30 * s, 30 * s, o); break;
      case 'scribble': scribble(c, sx, sy - z, 32 * s, o); break;
      case 'crumb': crumb(c, sx, sy - z, 16 * s, o); break;
      case 'tack': tack(c, sx, sy - z, 30 * s, o); break;
      case 'bat': bat(c, sx, sy - z - 20 * s, 26 * s, o); break;
      case 'thorn': thorn(c, sx, sy - z, 34 * s, o); break;
      case 'snoreKing': snoreKing(c, sx, sy - z, 92 * s, o); break;
      case 'eraserBoss': eraserBoss(c, sx, sy - z, 76 * s, o); break;
      case 'devil': {
        const dn = m.st === 'down';
        Art.drawChar(c, Art.CH.devil, sx, sy - z, { t, facing: m.f, scale: s * 1.5, moving: m.st === 'move' || m.st === 'charge', walk: t * 9, expr: dn ? 'sad' : 'angry', flash: m.flash,
          holding: true, forkSwing: m.st === 'cast' ? -0.6 + Math.sin(t * 20) * 0.2 : 0, hornPop: m.hornPop || 0, forkFade: m.forkFade || 0, overlayImg: 'heart_blank_red', overlayA: m.overlayA || 0, noTail: (m.hornPop || 0) > 0.5,
          aura: dn ? null : [150, 60, 220] });
        break;
      }
    }
  }
  const MON_H = { gold: 110, cloud: 120, cloudX: 140, sheep: 100, snore: 100, shade: 110, scribble: 90, crumb: 40, tack: 80, bat: 190, thorn: 120, snoreKing: 250, eraserBoss: 200, devil: 230 };

  // ---------------- 공격·효과 ----------------
  function proj(c, p, sx, sy, t) {
    switch (p.k) {
      case 'bubble': { glowFast(c, sx, sy, 22, [160, 210, 255], 0.6); c.save(); c.beginPath(); c.arc(sx, sy, 11, 0, TAU); c.fillStyle = 'rgba(210,240,255,0.55)'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#7fc8ff'; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sx - 4, sy - 4, 3, 0, TAU); c.fill(); c.font = F(10); c.fillStyle = '#4a6fb0'; c.textAlign = 'center'; c.fillText('z', sx + 1, sy + 4); c.restore(); break; }
      case 'ink': { c.save(); c.fillStyle = '#3a2a6a'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 5, r = i % 2 ? 7 : 12; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#7a6ad0'; c.beginPath(); c.arc(sx - 2, sy - 2, 3, 0, TAU); c.fill(); c.restore(); break; }
      case 'thorn': { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(p.vy, p.vx)); c.fillStyle = '#2f5a2a'; c.strokeStyle = '#122a10'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -6); c.lineTo(-4, 0); c.lineTo(-8, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); break; }
      case 'fork': { c.save(); c.translate(sx, sy); c.rotate(Math.atan2(p.vy, p.vx) + t * 0); c.strokeStyle = '#4a2a00'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-18, 0); c.lineTo(10, 0); c.moveTo(10, -8); c.lineTo(20, -8); c.moveTo(10, 8); c.lineTo(20, 8); c.moveTo(10, -8); c.lineTo(10, 8); c.moveTo(10, 0); c.lineTo(22, 0); c.stroke(); c.strokeStyle = '#ffcf3a'; c.lineWidth = 3; c.stroke(); c.restore(); break; }
      case 'grump': cloud(c, sx, sy, 15, { t, color: 'purple', phase: p.id || 0 }); break;
      case 'love': Art2.loveShot(c, sx, sy, p.big ? 22 : 11, t, p.big); break;
      case 'pillow': { c.save(); c.translate(sx, sy); c.rotate(t * 8); roundRect(c, -12, -8, 24, 16, 6); c.fillStyle = '#f3ecff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#6f5aa8'; c.stroke(); c.restore(); break; }
      case 'ruler': { c.save(); c.translate(sx, sy); c.rotate(t * 10); c.fillStyle = '#ffe58a'; c.fillRect(-18, -4, 36, 8); c.strokeStyle = '#8a5b12'; c.lineWidth = 1.5; c.strokeRect(-18, -4, 36, 8); c.restore(); break; }
    }
  }
  function loveShot(c, x, y, s, t, big) {
    glowFast(c, x, y, s * 2.2, big ? [255, 220, 120] : [255, 120, 170], big ? 0.8 : 0.55);
    heartPath(c, x, y, s);
    const g = c.createLinearGradient(x, y - s, x, y + s);
    if (big) { g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#ff5f9e'); } else { g.addColorStop(0, '#ffb3cd'); g.addColorStop(1, '#ff2d6f'); }
    c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.2, s * 0.14); c.strokeStyle = '#a3123f'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x - s * 0.35, y - s * 0.3, s * 0.2, s * 0.13, -0.6, 0, TAU); c.fill();
  }
  // 바닥 경고 (진행 k: 0→1)
  function hazard(c, h, sx, sy, k, t) {
    c.save();
    if (h.k === 'circle') {
      const col = h.fx === 'nap' ? [140, 170, 255] : h.fx === 'bolt' ? [255, 240, 90] : h.fx === 'crumb' ? [255, 170, 200] : h.fx === 'swoop' ? [170, 90, 220] : h.fx === 'rain' ? [120, 180, 255] : [200, 80, 230];
      c.beginPath(); c.ellipse(sx, sy, h.r, h.r * 0.42, 0, 0, TAU);
      c.fillStyle = U.rgba(col, 0.18 + k * 0.2); c.fill(); c.lineWidth = 2.5; c.strokeStyle = U.rgba(col, 0.85); c.stroke();
      c.beginPath(); c.ellipse(sx, sy, h.r * k, h.r * 0.42 * k, 0, 0, TAU); c.fillStyle = U.rgba(col, 0.35); c.fill();
      if (h.fx === 'rain' && k > 0.2) { c.strokeStyle = 'rgba(140,190,255,0.8)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { const rx = sx + (i - 2) * h.r * 0.35, ry = sy - 60 + ((t * 300 + i * 37) % 60); c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 10); c.stroke(); } }
    } else if (h.k === 'lane') {
      const col = h.fx === 'warn' ? [255, 80, 120] : [255, 200, 230];
      c.fillStyle = U.rgba(col, 0.12 + k * 0.22); c.fillRect(-10, sy - h.h / 2, 5000, h.h);
      c.strokeStyle = U.rgba(col, 0.8); c.lineWidth = 2; c.setLineDash([12, 8]); c.lineDashOffset = -t * 60;
      c.beginPath(); c.moveTo(-10, sy - h.h / 2); c.lineTo(5000, sy - h.h / 2); c.moveTo(-10, sy + h.h / 2); c.lineTo(5000, sy + h.h / 2); c.stroke(); c.setLineDash([]);
    }
    c.restore();
  }
  function hazardBlast(c, h, sx, sy, a) { // 터지는 순간
    c.save(); c.globalAlpha = a;
    if (h.k === 'circle') {
      if (h.fx === 'bolt') { c.strokeStyle = '#fff36a'; c.lineWidth = 6; c.beginPath(); c.moveTo(sx - 10, sy - 260); c.lineTo(sx + 8, sy - 150); c.lineTo(sx - 6, sy - 120); c.lineTo(sx + 4, sy); c.stroke(); }
      glowFast(c, sx, sy - 10, h.r * 1.4, h.fx === 'bolt' ? [255, 240, 120] : [255, 180, 230], 1);
    } else if (h.k === 'lane' && h.fx !== 'warn') {
      const g = c.createLinearGradient(0, sy - h.h / 2, 0, sy + h.h / 2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,230,250,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(-10, sy - h.h / 2, 5000, h.h);
    }
    c.restore();
  }
  function ring(c, sx, sy, r, k) {
    c.save(); c.globalAlpha = 1 - k * 0.6;
    c.lineWidth = 14; c.strokeStyle = 'rgba(200,140,255,0.55)'; c.beginPath(); c.ellipse(sx, sy, r, r * 0.42, 0, 0, TAU); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
    c.restore();
  }

  // ---------------- 소품·아이템 ----------------
  function dummy(c, x, y, s, t, hit) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(hit > 0 ? Math.sin(hit * 30) * 0.12 : 0);
    c.fillStyle = '#8a5a34'; c.fillRect(-5, -100, 10, 100); c.fillRect(-36, -78, 72, 8);
    c.beginPath(); c.arc(0, -112, 24, 0, TAU); c.fillStyle = '#f2d38a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#8a6a2a'; c.stroke();
    c.beginPath(); c.arc(0, -60, 26, 0, TAU); c.fillStyle = '#e8c07a'; c.fill(); c.stroke();
    heartPath(c, 0, -60, 13); c.fillStyle = '#ff5f7a'; c.fill();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, -116); c.lineTo(-4, -110); c.moveTo(-4, -116); c.lineTo(-10, -110); c.moveTo(4, -116); c.lineTo(10, -110); c.moveTo(10, -116); c.lineTo(4, -110); c.stroke();
    c.restore();
  }
  function greatHeart(c, x, y, s, t, shards) { // shards: 0~3
    c.save(); c.translate(x, y); c.scale(s, s);
    roundRect(c, -70, -40, 140, 40, 10); const g0 = c.createLinearGradient(0, -40, 0, 0); g0.addColorStop(0, '#e8dcc8'); g0.addColorStop(1, '#b8a68a'); c.fillStyle = g0; c.fill(); c.lineWidth = 3; c.strokeStyle = '#6a5a40'; c.stroke();
    roundRect(c, -48, -62, 96, 24, 8); c.fillStyle = '#d8c8ac'; c.fill(); c.stroke();
    const k = shards / 3;
    glowFast(c, 0, -150, 130, [255, 120, 170], 0.35 + k * 0.5 + Math.sin(t * 2) * 0.08);
    c.save(); c.translate(0, -150 + Math.sin(t * 1.5) * 4);
    heartPath(c, 0, 0, 78);
    const g = c.createLinearGradient(0, -80, 0, 80); g.addColorStop(0, k >= 1 ? '#ffd1e6' : '#e8d0e0'); g.addColorStop(1, k >= 1 ? '#ff3d7f' : '#a08aa0');
    c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = '#7a2a48'; c.stroke();
    c.save(); heartPath(c, 0, 0, 78); c.clip();
    const pieces = [[-80, -90, 80, 190], [0, -90, 90, 80], [0, -10, 90, 110]];
    for (let i = 0; i < 3; i++) {
      if (i < shards) continue;
      const [px, py, pw, ph] = pieces[i];
      c.fillStyle = 'rgba(60,40,70,0.75)'; c.fillRect(px, py, pw, ph);
    }
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -50); c.lineTo(0, 60); c.moveTo(0, -10); c.lineTo(90, -10); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-30, -30, 18, 10, -0.6, 0, TAU); c.fill();
    c.restore();
    c.restore();
  }
  function bush(c, x, y, s, t, kind) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (kind === 'rock') {
      c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(-46, -36, -10, -44); c.quadraticCurveTo(30, -50, 42, -14); c.quadraticCurveTo(46, 0, 30, 0); c.closePath();
      const g = c.createLinearGradient(0, -48, 0, 0); g.addColorStop(0, '#c9c3d6'); g.addColorStop(1, '#8a83a0'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#4a4560'; c.stroke();
    } else if (kind === 'box') {
      roundRect(c, -34, -56, 68, 56, 6); c.fillStyle = '#d8a76a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#6b4a20'; c.stroke();
      c.beginPath(); c.moveTo(-34, -40); c.lineTo(34, -40); c.moveTo(0, -56); c.lineTo(0, 0); c.stroke();
    } else if (kind === 'paper') {
      c.beginPath(); c.moveTo(-36, 0); c.lineTo(-28, -44); c.lineTo(20, -50); c.lineTo(38, -6); c.closePath(); c.fillStyle = '#fffdf2'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#8aa0c8'; c.stroke();
      c.strokeStyle = 'rgba(80,120,200,0.4)'; c.lineWidth = 1.5; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-30 + i * 2, -i * 11); c.lineTo(26 + i * 2, -i * 12 - 2); c.stroke(); }
    } else {
      const col = kind === 'dark' ? ['#3a2a5a', '#6a4a8a', '#1a0d2a'] : ['#2f6b3f', '#86d38b', '#3f9356'];
      for (const [bx, by, r] of [[-26, -18, 22], [0, -30, 28], [26, -18, 22], [0, -12, 24]]) { c.beginPath(); c.arc(bx, by, r + 3, 0, TAU); c.fillStyle = col[0]; c.fill(); }
      for (const [bx, by, r] of [[-26, -18, 22], [0, -30, 28], [26, -18, 22], [0, -12, 24]]) { const g = c.createLinearGradient(0, by - r, 0, by + r); g.addColorStop(0, col[1]); g.addColorStop(1, col[2]); c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  function item(c, kind, x, y, s, t, extra) {
    c.save(); c.translate(x, y); c.scale(s, s);
    glowFast(c, 0, 0, 30, kind === 'heal' ? [255, 150, 190] : [255, 235, 140], 0.75 + Math.sin(t * 5) * 0.15);
    c.rotate(Math.sin(t * 3) * 0.12);
    c.lineWidth = 2; c.strokeStyle = '#6a4a00';
    switch (kind) {
      case 'bell': c.beginPath(); c.moveTo(-12, 8); c.quadraticCurveTo(-12, -14, 0, -14); c.quadraticCurveTo(12, -14, 12, 8); c.closePath(); c.fillStyle = goldGrad(c, -14, 8); c.fill(); c.stroke(); c.beginPath(); c.arc(0, 10, 4, 0, TAU); c.fill(); c.stroke(); break;
      case 'part': c.fillStyle = '#c9ced8'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 9 : 13; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.strokeStyle = '#4a4f5a'; c.stroke(); c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fillStyle = '#fff'; c.fill(); break;
      case 'number': c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fillStyle = '#ffe58a'; c.fill(); c.strokeStyle = '#8a5b12'; c.stroke(); c.fillStyle = '#3a2a10'; c.font = F(13); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(extra || '?', 0, 1); break;
      case 'glue': c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(12, 2, 0, 12); c.quadraticCurveTo(-12, 2, 0, -14); c.fillStyle = '#e8f6ff'; c.fill(); c.strokeStyle = '#6a9ac8'; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-3, 0, 3, 0, TAU); c.fill(); break;
      case 'key': c.fillStyle = goldGrad(c, -12, 12); c.beginPath(); c.arc(-6, 0, 8, 0, TAU); c.fill(); c.stroke(); c.fillRect(0, -3, 16, 6); c.strokeRect(0, -3, 16, 6); c.fillRect(10, 3, 4, 6); c.beginPath(); c.arc(-6, 0, 3, 0, TAU); c.fillStyle = '#fff'; c.fill(); break;
      case 'shard': heartPath(c, 0, 0, 14); c.fillStyle = '#ff5f9e'; c.fill(); c.strokeStyle = '#8f0d36'; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-5, -4, 4, 2.5, -0.6, 0, TAU); c.fill(); break;
      case 'heal': heartPath(c, 0, 0, 11); c.fillStyle = '#ff6f9f'; c.fill(); c.strokeStyle = '#8f0d36'; c.stroke(); c.fillStyle = '#fff'; c.font = F(10); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+', 0, 0); break;
      case 'ribbon': ACCribbon(c); break;
    }
    c.restore();
    shiny(c, x + 14 * s, y - 14 * s, 6 * s, t, x * 0.01);
  }
  function ACCribbon(c) { c.fillStyle = '#4aa8ff'; c.strokeStyle = '#1d5aa8'; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(d * 16, -12, d * 15, 2); c.quadraticCurveTo(d * 9, 6, 0, 0); c.fill(); c.stroke(); } c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.stroke(); }

  function bridge(c, x, y, s, t, fixed) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#7a5a34'; c.fillRect(-90, -8, 12, 40); c.fillRect(78, -8, 12, 40);
    const n = 7;
    for (let i = 0; i < n; i++) {
      if (!fixed && (i === 3 || i === 4)) continue;
      const px = -84 + i * 26, sag = Math.sin((i / (n - 1)) * Math.PI) * 6;
      roundRect(c, px, -6 + sag, 22, 12, 3); c.fillStyle = i % 2 ? '#ffd27a' : '#ffe9a6'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#8a6a2a'; c.stroke();
    }
    c.strokeStyle = '#8a6a2a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-84, -26); c.quadraticCurveTo(0, -8, 84, -26); c.stroke();
    if (!fixed) { c.fillStyle = '#e8455f'; c.font = F(15); c.textAlign = 'center'; c.fillText('다리가 끊어졌어요!', 0, -40); }
    else { for (let i = 0; i < 3; i++) shiny(c, -30 + i * 30, -20, 6, t, i); }
    c.restore();
  }
  function mirror(c, x, y, s, t, lit, idx, done) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const cols = ['#ff6f9f', '#4aa8ff', '#ffd23f', '#3ccf7a'];
    roundRect(c, -40, -150, 80, 140, 36);
    const g = c.createLinearGradient(-40, -150, 40, -10); g.addColorStop(0, '#e8f4ff'); g.addColorStop(0.5, '#b8d4f0'); g.addColorStop(1, '#8ab0e0');
    c.fillStyle = g; c.fill(); c.lineWidth = 8; c.strokeStyle = '#c9a03a'; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#6a4a10'; c.stroke();
    if (lit > 0) { c.save(); c.globalAlpha = lit; roundRect(c, -40, -150, 80, 140, 36); c.fillStyle = cols[idx]; c.fill(); c.restore(); glowFast(c, 0, -80, 110, U.hex(cols[idx]), lit); }
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(-26, -120); c.lineTo(-14, -134); c.lineTo(-14, -40); c.lineTo(-26, -30); c.fill();
    starPath(c, 0, -160, 10, 4); c.fillStyle = cols[idx]; c.fill(); c.lineWidth = 2; c.strokeStyle = '#6a4a10'; c.stroke();
    c.fillStyle = '#6a4a10'; c.fillRect(-30, -10, 60, 10);
    c.restore();
  }
  function door(c, x, y, s, t, open) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(-60, 0); c.lineTo(-60, -130); c.arc(0, -130, 60, Math.PI, 0); c.lineTo(60, 0); c.closePath();
    c.fillStyle = open ? '#ffe3f0' : '#4a2a6a'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#2a1442'; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#c9a03a'; c.stroke();
    if (!open) {
      c.strokeStyle = '#2a1442'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -190); c.lineTo(0, 0); c.stroke();
      heartPath(c, 0, -90, 18); c.fillStyle = goldGrad(c, -110, -70); c.fill(); c.strokeStyle = '#7a4500'; c.stroke();
    } else glowFast(c, 0, -90, 90, [255, 210, 235], 0.9);
    c.restore();
  }
  function grumpAura(c, x, y, r, t) { glowFast(c, x, y, r, [160, 60, 220], 0.55 + Math.sin(t * 5) * 0.15); }
  function speech(c, x, y, text, a = 1) {
    c.save(); c.globalAlpha *= a; c.font = F(17);
    const w = c.measureText(text).width + 26, h = 34;
    roundRect(c, x - w / 2, y - h, w, h, 14); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#3a2a4a'; c.stroke();
    c.beginPath(); c.moveTo(x - 7, y - 1); c.lineTo(x, y + 10); c.lineTo(x + 7, y - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x, y + 10); c.lineTo(x + 7, y); c.stroke();
    c.fillStyle = '#3a2a4a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - h / 2 + 1);
    c.restore();
  }
  function portal(c, x, y, t, a = 1, locked) {
    if (a <= 0) return;
    c.save(); c.globalAlpha *= a;
    const cy = y - 66;
    let g = c.createRadialGradient(x, y, 4, x, y, 70); g.addColorStop(0, locked ? 'rgba(200,120,140,0.6)' : 'rgba(150,230,255,0.75)'); g.addColorStop(1, 'rgba(150,230,255,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 70, 18, 0, 0, TAU); c.fill();
    g = c.createRadialGradient(x, cy, 4, x, cy, 64); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, locked ? 'rgba(220,150,170,0.6)' : 'rgba(160,225,255,0.65)'); g.addColorStop(1, 'rgba(120,120,255,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, cy, 46, 70, 0, 0, TAU); c.fill();
    c.lineCap = 'round';
    const cols = locked ? ['#d9a0b0', '#a08aa0', '#ffffff', '#c08a9a', '#e0b0c0'] : ['#9ff0ff', '#c6a6ff', '#ffffff', '#7fd4ff', '#ffb3ea'];
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.15; c.strokeStyle = cols[i]; c.lineWidth = 4 - i * 0.5;
      c.setLineDash([22 * k, 14 * k]); c.lineDashOffset = -t * (locked ? 10 : 60 + i * 18) * (i % 2 ? -1 : 1);
      c.beginPath(); c.ellipse(x, cy, 40 * k, 64 * k, 0, 0, TAU); c.stroke();
    }
    c.setLineDash([]);
    if (locked) {
      c.lineWidth = 5; c.strokeStyle = '#6a3a5a'; c.beginPath(); c.arc(x, cy - 8, 11, Math.PI, 0); c.stroke();
      roundRect(c, x - 16, cy - 8, 32, 26, 6); c.fillStyle = goldGrad(c, cy - 8, cy + 18); c.fill(); c.lineWidth = 2.5; c.stroke();
      c.fillStyle = '#6a3a5a'; c.beginPath(); c.arc(x, cy + 3, 4, 0, TAU); c.fill();
    }
    c.restore();
  }

  // ---------------- 부서지는 상자 · 통통 발판 · 반짝 별 ----------------
  function breakable(c, kind, x, y, s, t, hpk, shake) {
    c.save(); c.translate(x + Math.sin(shake * 50) * shake * 6, y); c.scale(s, s);
    const sq = 1 + shake * 0.08; c.scale(sq, 1 / sq);
    c.lineWidth = 3; c.lineJoin = 'round';
    if (kind === 'gift') {
      roundRect(c, -30, -52, 60, 52, 6); const g = c.createLinearGradient(0, -52, 0, 0); g.addColorStop(0, '#ff9cc8'); g.addColorStop(1, '#e8457e'); c.fillStyle = g; c.fill(); c.strokeStyle = '#8f1d4a'; c.stroke();
      c.fillStyle = '#ffe14a'; c.fillRect(-6, -52, 12, 52); c.strokeRect(-6, -52, 12, 52);
      roundRect(c, -34, -62, 68, 14, 4); c.fillStyle = '#ff7ab0'; c.fill(); c.stroke(); c.fillStyle = '#ffe14a'; c.fillRect(-6, -62, 12, 14);
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -62); c.quadraticCurveTo(d * 22, -86, d * 18, -62); c.closePath(); c.fillStyle = '#ffe14a'; c.fill(); c.strokeStyle = '#a86a00'; c.stroke(); }
    } else if (kind === 'pillow') {
      for (const [dx, dy, col] of [[-12, -18, '#f3ecff'], [14, -22, '#ffe8f4'], [0, -46, '#e8f4ff']]) { c.save(); c.translate(dx, dy); roundRect(c, -30, -16, 60, 32, 14); c.fillStyle = col; c.fill(); c.strokeStyle = '#7a6098'; c.stroke(); c.restore(); }
    } else if (kind === 'paper') {
      for (let i = 0; i < 5; i++) { c.save(); c.translate(Math.sin(i * 1.7) * 4, -i * 10); c.rotate(Math.sin(i * 2.3) * 0.08); c.fillStyle = '#fffdf2'; c.fillRect(-30, -10, 60, 12); c.strokeStyle = '#8aa0c8'; c.lineWidth = 2; c.strokeRect(-30, -10, 60, 12); c.restore(); }
      c.fillStyle = '#ff5f7a'; c.fillRect(-4, -58, 8, 14);
    } else { // crate
      roundRect(c, -32, -60, 64, 60, 6); const g = c.createLinearGradient(0, -60, 0, 0); g.addColorStop(0, '#e8b878'); g.addColorStop(1, '#b8803e'); c.fillStyle = g; c.fill(); c.strokeStyle = '#5a3a1a'; c.stroke();
      c.beginPath(); c.moveTo(-32, -60); c.lineTo(32, 0); c.moveTo(32, -60); c.lineTo(-32, 0); c.stroke();
      heartPath(c, 0, -30, 11); c.fillStyle = '#ff5f7a'; c.fill(); c.lineWidth = 2; c.stroke();
    }
    if (hpk < 1) { c.strokeStyle = 'rgba(40,20,30,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, -40); c.lineTo(-2, -28); c.lineTo(-8, -18); if (hpk < 0.5) { c.moveTo(12, -50); c.lineTo(4, -36); c.lineTo(14, -24); } c.stroke(); }
    c.restore();
  }
  function pad(c, kind, x, y, s, t, squash) {
    c.save(); c.translate(x, y); c.scale(s * (1 + squash * 0.25), s * (1 - squash * 0.35));
    c.lineWidth = 3;
    if (kind === 'spring') {
      c.strokeStyle = '#6a6f80'; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 5; i++) { c.moveTo(-22, -6 - i * 7); c.lineTo(22, -9 - i * 7); } c.stroke();
      roundRect(c, -34, -46, 68, 12, 6); c.fillStyle = '#ff5f7a'; c.fill(); c.strokeStyle = '#8f1d3a'; c.lineWidth = 3; c.stroke();
      roundRect(c, -30, -6, 60, 8, 4); c.fillStyle = '#4a4f60'; c.fill();
    } else if (kind === 'eraser') {
      roundRect(c, -40, -34, 80, 34, 10); c.fillStyle = '#ffd1e0'; c.fill(); c.strokeStyle = '#a8306a'; c.stroke();
      c.fillStyle = '#4aa8ff'; c.fillRect(-40, -22, 80, 12); c.fillStyle = '#fff'; c.font = '13px Jua, sans-serif'; c.textAlign = 'center'; c.fillText('통통', 0, -12);
    } else if (kind === 'cloud') {
      for (const [bx, by, r] of [[-26, -12, 16], [0, -20, 22], [26, -12, 16], [0, -8, 18]]) { c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fillStyle = '#fff'; c.fill(); }
      c.strokeStyle = 'rgba(140,170,230,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(0, -20, 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    } else { // 버섯
      glowFast(c, 0, -30, 60, [255, 150, 210], 0.35 + Math.sin(t * 3) * 0.1);
      c.fillStyle = '#fff4e4'; c.strokeStyle = '#6b4a35'; c.beginPath(); c.moveTo(-12, 0); c.lineTo(-9, -22); c.lineTo(9, -22); c.lineTo(12, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-44, -18); c.bezierCurveTo(-44, -62, 44, -62, 44, -18); c.quadraticCurveTo(0, -8, -44, -18); c.closePath();
      const g = c.createLinearGradient(0, -56, 0, -12); g.addColorStop(0, '#ff8fd0'); g.addColorStop(1, '#d6338a'); c.fillStyle = g; c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, dy, r] of [[-20, -36, 7], [6, -44, 6], [24, -30, 5]]) { c.beginPath(); c.arc(dx, dy, r, 0, TAU); c.fill(); }
    }
    c.restore();
    c.save(); c.globalAlpha = 0.55 + Math.sin(t * 5) * 0.25; c.fillStyle = '#fff36a'; c.font = '15px Jua, sans-serif'; c.textAlign = 'center';
    c.beginPath(); c.moveTo(x - 7, y - 70 * s); c.lineTo(x, y - 80 * s); c.lineTo(x + 7, y - 70 * s); c.closePath(); c.fill(); c.restore();
  }
  function starItem(c, x, y, s, t, ph) {
    const b = Math.sin(t * 3 + ph) * 4;
    glowFast(c, x, y + b, 26 * s, [255, 236, 140], 0.75);
    c.save(); c.translate(x, y + b); c.rotate(Math.sin(t * 2 + ph) * 0.3);
    starPath(c, 0, 0, 12 * s, 5.5 * s, 5); const g = c.createLinearGradient(0, -12 * s, 0, 12 * s); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffc21a');
    c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = '#b8860b'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(-3 * s, -4 * s, 2.4 * s, 0, TAU); c.fill();
    c.restore();
  }

  return { cloud, mon, MON_H, proj, loveShot, hazard, hazardBlast, ring, dummy, greatHeart, bush, item, bridge, mirror, door, grumpAura, speech, portal, breakable, pad, starItem };
})();
