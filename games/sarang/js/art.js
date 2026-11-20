'use strict';
// 캐릭터 그리기 — 사진 풍선 + 마커 팔다리 + 여러 몸 모양(베개·자·연필·양·부엉이…)
const Art = (() => {
  const IMG = {};
  const INK = '#221a2e';
  const TAU = Math.PI * 2;

  // ---------- 기본 도형 ----------
  function heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.75);
    c.bezierCurveTo(x - s * 1.25, y - s * 0.05, x - s * 0.62, y - s * 1.05, x, y - s * 0.38);
    c.bezierCurveTo(x + s * 0.62, y - s * 1.05, x + s * 1.25, y - s * 0.05, x, y + s * 0.75);
    c.closePath();
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function starPath(c, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }
  function glow(c, x, y, r, rgb, a = 1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(rgb, 0.9 * a)); g.addColorStop(0.4, U.rgba(rgb, 0.35 * a)); g.addColorStop(1, U.rgba(rgb, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  const glowCache = {};
  function glowFast(c, x, y, r, rgb, a = 1) {
    const key = rgb.join(',');
    let cv = glowCache[key];
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, U.rgba(rgb, 0.9)); gr.addColorStop(0.4, U.rgba(rgb, 0.35)); gr.addColorStop(1, U.rgba(rgb, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowCache[key] = cv;
    }
    if (a <= 0) return;
    const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, a);
    c.drawImage(cv, x - r, y - r, r * 2, r * 2); c.globalAlpha = ga;
  }
  function goldGrad(c, y0, y1) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#fff7c2'); g.addColorStop(0.35, '#ffd84a'); g.addColorStop(0.75, '#f0a815'); g.addColorStop(1, '#c97c06');
    return g;
  }
  function shiny(c, x, y, s, t, ph = 0) {
    const k = (Math.sin(t * 4 + ph) + 1) / 2;
    if (k < 0.35) return;
    c.save(); c.globalAlpha *= (k - 0.35) / 0.65; c.fillStyle = '#fff'; starPath(c, x, y, s, s * 0.28, 4, 0); c.fill(); c.restore();
  }
  function shadow(c, x, y, w, z) {
    const k = U.clamp(1 - z / 260, 0.35, 1);
    c.save(); c.globalAlpha = 0.28 * k; c.fillStyle = '#2b1a3d';
    c.beginPath(); c.ellipse(x, y, w * 0.5 * k, w * 0.13 * k, 0, 0, TAU); c.fill(); c.restore();
  }
  function flower(c, x, y, r, petal, center) {
    c.save(); c.fillStyle = petal; c.strokeStyle = 'rgba(90,30,70,0.5)'; c.lineWidth = Math.max(1, r * 0.08);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = center; c.beginPath(); c.arc(x, y, r * 0.34, 0, TAU); c.fill(); c.stroke(); c.restore();
  }

  // ---------- 몸 모양 ----------
  // A: 팔·다리·눈·입 위치(0~1), arm/leg: 길이(px), fw: 얼굴 크기 기준(몸 폭 배수)
  const HEART_A = { armL: [0.11, 0.47], armR: [0.89, 0.47], legL: [0.40, 0.86], legR: [0.54, 0.86], eyeL: [0.42, 0.29], eyeR: [0.72, 0.29], mouth: [0.578, 0.545],
    cheekL: [0.30, 0.42], cheekR: [0.82, 0.42], top: [0.53, 0.08] };
  const SPEC = {
    balloon: { A: HEART_A, arm: 30, leg: 23, tip: 0.986, fw: 1, aspect: (ch) => (IMG[ch.img] ? IMG[ch.img].height / IMG[ch.img].width : 0.97) },
    pillow: { A: { armL: [0.04, 0.56], armR: [0.96, 0.56], legL: [0.34, 0.9], legR: [0.66, 0.9], eyeL: [0.37, 0.47], eyeR: [0.63, 0.47], mouth: [0.5, 0.64],
      cheekL: [0.25, 0.6], cheekR: [0.75, 0.6], top: [0.5, 0.07] }, arm: 30, leg: 24, tip: 0.97, fw: 0.95, aspect: () => 0.74 },
    ruler: { A: { armL: [0.06, 0.43], armR: [0.94, 0.43], legL: [0.28, 0.985], legR: [0.72, 0.985], eyeL: [0.3, 0.16], eyeR: [0.7, 0.16], mouth: [0.5, 0.215],
      cheekL: [0.14, 0.2], cheekR: [0.86, 0.2], top: [0.5, 0.0] }, arm: 38, leg: 22, tip: 1, fw: 2.5, aspect: () => 4.9 },
    pencil: { A: { armL: [0.08, 0.5], armR: [0.92, 0.5], legL: [0.3, 0.985], legR: [0.7, 0.985], eyeL: [0.32, 0.42], eyeR: [0.68, 0.42], mouth: [0.5, 0.52],
      cheekL: [0.16, 0.48], cheekR: [0.84, 0.48], top: [0.5, 0.02] }, arm: 30, leg: 22, tip: 1, fw: 1.8, aspect: () => 3.0 },
    eraser: { A: { armL: [0.05, 0.5], armR: [0.95, 0.5], legL: [0.32, 0.97], legR: [0.68, 0.97], eyeL: [0.36, 0.36], eyeR: [0.64, 0.36], mouth: [0.5, 0.5],
      cheekL: [0.22, 0.46], cheekR: [0.78, 0.46], top: [0.5, 0.02] }, arm: 28, leg: 20, tip: 1, fw: 1.05, aspect: () => 0.92 },
    glue: { A: { armL: [0.08, 0.55], armR: [0.92, 0.55], legL: [0.32, 0.985], legR: [0.68, 0.985], eyeL: [0.33, 0.4], eyeR: [0.67, 0.4], mouth: [0.5, 0.52],
      cheekL: [0.18, 0.47], cheekR: [0.82, 0.47], top: [0.5, 0.0] }, arm: 28, leg: 20, tip: 1, fw: 1.6, aspect: () => 2.1 },
    sheep: { A: { armL: [0.1, 0.55], armR: [0.9, 0.55], legL: [0.34, 0.92], legR: [0.66, 0.92], eyeL: [0.42, 0.4], eyeR: [0.62, 0.4], mouth: [0.52, 0.53],
      cheekL: [0.33, 0.5], cheekR: [0.71, 0.5], top: [0.52, 0.06] }, arm: 26, leg: 22, tip: 0.95, fw: 0.9, aspect: () => 0.9 },
    owl: { A: { armL: [0.08, 0.55], armR: [0.92, 0.55], legL: [0.38, 0.96], legR: [0.62, 0.96], eyeL: [0.34, 0.36], eyeR: [0.66, 0.36], mouth: [0.5, 0.5],
      cheekL: [0.2, 0.5], cheekR: [0.8, 0.5], top: [0.5, 0.05] }, arm: 24, leg: 18, tip: 0.98, fw: 1, aspect: () => 1.12 },
    worm: { A: { armL: [0.15, 0.4], armR: [0.85, 0.4], legL: [0.3, 0.97], legR: [0.7, 0.97], eyeL: [0.38, 0.17], eyeR: [0.62, 0.17], mouth: [0.5, 0.25],
      cheekL: [0.26, 0.22], cheekR: [0.74, 0.22], top: [0.5, 0.0] }, arm: 24, leg: 16, tip: 1, fw: 1.4, aspect: () => 1.9 },
  };

  const CH = {
    sarang:   { kind: 'balloon', img: 'heart_blank_red', w: 112, name: '사랑둥이', phase: 0 },
    photo:    { kind: 'balloon', img: 'sarang', face: 'photo', w: 112, name: '사랑둥이', phase: 0 },
    kong:     { kind: 'balloon', img: 'heart_blank_red', w: 92, acc: 'ribbon', blush: true, name: '콩닥이', phase: 1.1 },
    devil:    { kind: 'balloon', img: 'heart_purple', w: 112, acc: 'devil', hold: 'pitchfork', tail: true, name: '악마둥이', phase: 0.7 },
    grandma:  { kind: 'balloon', img: 'heart_gold', w: 100, acc: 'granny', name: '하트 할머니', phase: 2.4 },
    sparkle:  { kind: 'balloon', img: 'heart_mint', w: 92, acc: 'wizard', hold: 'wand', blush: true, name: '꿈 요정 반짝이', phase: 2.7 },
    princess: { kind: 'pillow', w: 118, acc: 'tiara', blush: true, lashes: true, name: '베개 공주', phase: 1.3, col: ['#fdf8ff', '#e6dafc', '#bfaee8'] },
    prince:   { kind: 'ruler', w: 50, acc: 'crown', name: '자 왕자', phase: 2.1, cape: true },
    mayor:    { kind: 'sheep', w: 112, acc: 'sash', name: '양 촌장 뭉게', phase: 0.3 },
    owl:      { kind: 'owl', w: 96, acc: 'goggles', hold: 'trumpet', name: '부엉 장인', phase: 1.6 },
    knight:   { kind: 'pencil', w: 56, acc: 'helmetP', hold: 'shield', name: '연필 기사 뾰족이', phase: 0.9 },
    eraserLady: { kind: 'eraser', w: 92, acc: 'scarf', name: '말랑 아줌마', phase: 1.9, blush: true },
    glue:     { kind: 'glue', w: 60, acc: 'mustache', name: '딱풀 할아버지', phase: 2.2 },
    worm:     { kind: 'worm', w: 64, acc: 'glasses', hold: 'pointer', name: '자벌레 선생님', phase: 0.5 },
    villager1:{ kind: 'balloon', img: 'heart_blue', w: 96, name: '파랑둥이', phase: 0.8 },
    villager2:{ kind: 'balloon', img: 'heart_mint', w: 96, name: '민트둥이', phase: 1.7 },
    villager3:{ kind: 'balloon', img: 'heart_gold', w: 96, name: '노랑둥이', phase: 2.6 },
    villager4:{ kind: 'balloon', img: 'heart_pink', w: 96, name: '분홍둥이', phase: 0.2 },
    villager5:{ kind: 'eraser', w: 84, name: '지우개 꼬마', phase: 1.2 },
  };
  const COLOR_IMG = { red: 'heart_blank_red', pink: 'heart_pink', blue: 'heart_blue', gold: 'heart_gold', mint: 'heart_mint' };
  const heroCache = {};
  function hero(color, hat) {
    const key = color + '|' + (hat || '');
    if (!heroCache[key]) heroCache[key] = Object.assign({}, CH.sarang, { img: COLOR_IMG[color] || 'heart_blank_red', acc: hat || null });
    return heroCache[key];
  }

  // ---------- 캐릭터 한 명 그리기 ----------
  // sx: 화면 x, sy: 발 위치(점프 높이 반영)
  function drawChar(c, ch, sx, sy, o) {
    const sp = SPEC[ch.kind || 'balloon'];
    const s = o.scale || 1;
    const Wd = ch.w * s, Hd = Wd * sp.aspect(ch);
    const A = sp.A, t = o.t || 0;
    let bob;
    if (o.air) bob = 0;
    else if (o.moving) bob = -Math.abs(Math.sin(o.walk || 0)) * 4 * s;
    else bob = Math.sin(t * 2.4 + (ch.phase || 0)) * 2.2 * s;
    if (o.float) bob += Math.sin(t * 1.8 + (ch.phase || 0)) * 6 * s - 8 * s;
    const legPx = sp.leg * s;
    const top = sy - legPx - Hd * sp.tip + bob;
    const left = sx - Wd / 2;
    const P = (nx, ny) => [left + nx * Wd, top + ny * Hd];
    c.save();
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if ((o.facing || 1) < 0) { c.translate(sx, 0); c.scale(-1, 1); c.translate(-sx, 0); }
    const tilt = (o.tilt || 0) + (o.moving && !o.air ? Math.sin(o.walk || 0) * 0.045 : 0);
    const pcx = sx, pcy = top + Hd * 0.55;
    c.translate(pcx, pcy); c.rotate(tilt);
    const sq = o.squash || 0; c.scale(1 + sq * 0.12, 1 - sq * 0.12);
    c.translate(-pcx, -pcy);
    if (o.aura) { glowFast(c, sx, top + Hd * 0.5, Math.max(Wd, Hd) * 0.85, o.aura, 0.65 + Math.sin(t * 4) * 0.15); }
    if (ch.tail && !o.noTail) drawTail(c, P(0.2, 0.74), Wd, t);
    if (ch.cape) drawCape(c, P, Wd, Hd, t, o);
    const lw = Math.max(1.6, 3.2 * s);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = o.inkColor || INK; c.lineWidth = lw;
    if (!o.noLegs) drawLegs(c, P, A, s, sy, o);
    const hands = drawArms(c, P, A, sp.arm * s, s, o, t);
    BODY[ch.kind || 'balloon'](c, ch, left, top, Wd, Hd, o, t);
    if (o.flash > 0) {
      c.save(); c.globalAlpha *= Math.min(1, o.flash) * 0.55; c.globalCompositeOperation = 'lighter';
      BODY[ch.kind || 'balloon'](c, ch, left, top, Wd, Hd, o, t, true); c.restore();
    }
    if (o.overlayImg && o.overlayA > 0) { c.save(); c.globalAlpha *= o.overlayA; c.drawImage(IMG[o.overlayImg], left, top, Wd, Hd); c.restore(); }
    const fw = Wd * sp.fw;
    const expr = o.expr || ch.expr || 'happy';
    if (ch.face !== 'photo' && !o.noFace) drawFace(c, P, A, fw, expr, t, ch, o);
    if ((ch.blush || o.blush) && expr !== 'angry' && !o.noFace) drawBlush(c, P, A, fw);
    if (expr === 'hurt') drawSweat(c, P, fw);
    if (ch.kind === 'pillow') pillowMask(c, left, top, Wd, Hd, expr === 'sleep');
    const acc = o.acc !== undefined ? o.acc : ch.acc;
    if (acc && !o.noAcc && ACC[acc]) ACC[acc](c, { P, Wd, Hd, top: P(A.top[0], A.top[1]), hw: fw, t, o, kind: ch.kind });
    if (o.hat && ACC[o.hat]) ACC[o.hat](c, { P, Wd, Hd, top: P(A.top[0], A.top[1]), hw: fw, t, o, kind: ch.kind });
    if (ch.hold && !o.noHold && HOLD[ch.hold]) HOLD[ch.hold](c, hands.r, fw, t, o);
    c.restore();
    return { top, left, Wd, Hd };
  }

  function drawLegs(c, P, A, s, footY, o) {
    const [lx, ly] = P(A.legL[0], A.legL[1]), [rx, ry] = P(A.legR[0], A.legR[1]);
    const u = 112 * s;
    const sw = o.moving && !o.air ? Math.sin(o.walk || 0) : 0;
    let lfx, lfy, rfx, rfy;
    if (o.air) { lfx = lx - u * 0.1; rfx = rx + u * 0.08; lfy = ly + u * 0.2; rfy = ry + u * 0.15; }
    else if (o.sit) { lfx = lx - u * 0.16; rfx = rx + u * 0.16; lfy = ly + u * 0.12; rfy = ry + u * 0.12; }
    else {
      lfx = lx - u * 0.05 + sw * u * 0.13; rfx = rx + u * 0.05 - sw * u * 0.13;
      lfy = footY - Math.max(0, sw) * u * 0.06; rfy = footY - Math.max(0, -sw) * u * 0.06;
    }
    c.beginPath(); c.moveTo(lx, ly); c.lineTo(lfx, lfy); c.moveTo(rx, ry); c.lineTo(rfx, rfy); c.stroke();
    const fr = u * 0.068, fry = u * 0.034;
    c.beginPath(); c.ellipse(lfx - fr * 0.55, lfy - fry * 0.25, fr, fry, 0.05, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(rfx + fr * 0.55, rfy - fry * 0.25, fr, fry, -0.05, 0, TAU); c.stroke();
  }
  function drawArms(c, P, A, len, s, o, t) {
    const [x1, y1] = P(A.armL[0], A.armL[1]), [x2, y2] = P(A.armR[0], A.armR[1]);
    const w = o.walk || 0;
    let aL, aR;
    switch (o.pose) {
      case 'cheer': aL = 2.5 + Math.sin(t * 12) * 0.25; aR = 2.5 + Math.sin(t * 12 + 1.2) * 0.25; break;
      case 'wave': aL = 0.75 + Math.sin(t * 2) * 0.06; aR = 2.35 + Math.sin(t * 9) * 0.38; break;
      case 'sleep': aL = 0.45; aR = 0.45; break;
      case 'panic': aL = 2.6 + Math.sin(t * 16) * 0.3; aR = 2.6 + Math.sin(t * 16 + 2) * 0.3; break;
      case 'think': aL = 0.7; aR = 2.75; break;
      case 'point': aL = 0.8; aR = 1.7; break;
      default:
        if (o.air) { aL = 2.15; aR = 2.15; }
        else if (o.moving) { aL = 0.78 + Math.sin(w) * 0.38; aR = 0.78 - Math.sin(w) * 0.38; }
        else { aL = 0.82 + Math.sin(t * 2.2) * 0.07; aR = 0.82 + Math.sin(t * 2.2 + 0.6) * 0.07; }
    }
    if (o.shoot > 0) aR = 1.55;
    if (o.charge > 0) { aR = 1.55; aL = 1.3; }
    if (o.holding && o.pose !== 'cheer' && o.pose !== 'panic') aR = 1.0 + Math.sin(t * 2) * 0.05;
    const u = 112 * s;
    const arm = (x, y, a, side) => {
      const dx = Math.sin(a) * len * side, dy = Math.cos(a) * len, hx = x + dx, hy = y + dy;
      const mx = x + dx * 0.5 - Math.cos(a) * len * 0.07 * side, my = y + dy * 0.5 + Math.sin(a) * len * 0.07;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
      const r = u * 0.043, cx = hx + Math.sin(a) * r * side, cy = hy + Math.cos(a) * r;
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      return [cx, cy];
    };
    return { l: arm(x1, y1, aL, -1), r: arm(x2, y2, aR, 1) };
  }

  // ---------- 얼굴 ----------
  function eye(c, x, y, rx, ry) {
    c.fillStyle = INK; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x + rx * 0.25, y - ry * 0.38, rx * 0.4, ry * 0.26, 0, 0, TAU); c.fill();
  }
  function drawFace(c, P, A, fw, expr, t, ch, o) {
    const [exL, ey] = P(A.eyeL[0], A.eyeL[1]), [exR] = P(A.eyeR[0], A.eyeR[1]), [mx, my] = P(A.mouth[0], A.mouth[1]);
    const rx = fw * 0.034, ry = fw * 0.05;
    c.save(); c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = Math.max(1.6, fw * 0.025);
    const blink = ((t + (ch.phase || 0) * 2.3) % 4.2) < 0.12;
    const lashes = (x, y, side) => {
      if (!ch.lashes) return;
      c.beginPath(); c.moveTo(x + side * rx * 0.9, y - ry * 0.7); c.lineTo(x + side * rx * 1.9, y - ry * 1.35);
      c.moveTo(x + side * rx * 0.2, y - ry * 1.0); c.lineTo(x + side * rx * 0.7, y - ry * 1.75); c.stroke();
    };
    const smile = (r = 0.09) => { c.beginPath(); c.arc(mx, my - fw * 0.055, fw * r, 0.22 * Math.PI, 0.78 * Math.PI); c.stroke(); };
    switch (expr) {
      case 'sleep': {
        for (const x of [exL, exR]) {
          c.beginPath(); c.arc(x, ey - ry * 0.3, rx * 1.35, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
          if (ch.lashes) { c.beginPath(); for (let k = 0; k < 3; k++) { const a = (0.25 + k * 0.25) * Math.PI, px = x + Math.cos(a) * rx * 1.35, py = ey - ry * 0.3 + Math.sin(a) * rx * 1.35; c.moveTo(px, py); c.lineTo(px + Math.cos(a) * rx * 0.7, py + Math.sin(a) * rx * 0.7); } c.stroke(); }
        }
        c.beginPath(); c.ellipse(mx, my, fw * 0.02, fw * 0.026 + Math.sin(t * 2) * fw * 0.006, 0, 0, TAU); c.stroke();
        const b = (Math.sin(t * 1.6) + 1) / 2;
        c.save(); c.globalAlpha *= 0.75; c.lineWidth = Math.max(1, fw * 0.01); c.strokeStyle = '#7fc8ff'; c.fillStyle = 'rgba(210,240,255,0.55)';
        c.beginPath(); c.arc(mx + fw * 0.07, my - fw * 0.07, fw * (0.02 + b * 0.05), 0, TAU); c.fill(); c.stroke(); c.restore();
        break;
      }
      case 'angry': {
        eye(c, exL, ey + ry * 0.15, rx * 1.05, ry * 0.85); eye(c, exR, ey + ry * 0.15, rx * 1.05, ry * 0.85);
        c.lineWidth = Math.max(2, fw * 0.034);
        c.beginPath(); c.moveTo(exL - rx * 2.2, ey - ry * 1.9); c.lineTo(exL + rx * 1.6, ey - ry * 0.95);
        c.moveTo(exR + rx * 2.2, ey - ry * 1.9); c.lineTo(exR - rx * 1.6, ey - ry * 0.95); c.stroke();
        c.lineWidth = Math.max(1.6, fw * 0.024);
        c.beginPath(); c.moveTo(mx - fw * 0.11, my - fw * 0.02); c.quadraticCurveTo(mx, my + fw * 0.07, mx + fw * 0.11, my - fw * 0.03); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(mx + fw * 0.03, my + fw * 0.03); c.lineTo(mx + fw * 0.065, my + fw * 0.025); c.lineTo(mx + fw * 0.05, my + fw * 0.07); c.closePath();
        c.fill(); c.lineWidth = Math.max(1, fw * 0.01); c.stroke();
        break;
      }
      case 'grumpy': {
        eye(c, exL, ey, rx, ry * 0.8); eye(c, exR, ey, rx, ry * 0.8);
        c.lineWidth = Math.max(1.8, fw * 0.03);
        c.beginPath(); c.moveTo(exL - rx * 1.8, ey - ry * 1.5); c.lineTo(exL + rx * 1.4, ey - ry * 1.0); c.moveTo(exR + rx * 1.8, ey - ry * 1.5); c.lineTo(exR - rx * 1.4, ey - ry * 1.0); c.stroke();
        c.beginPath(); c.arc(mx, my + fw * 0.05, fw * 0.06, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
        break;
      }
      case 'worried': case 'sad': {
        if (blink) { c.beginPath(); c.moveTo(exL - rx, ey); c.lineTo(exL + rx, ey); c.moveTo(exR - rx, ey); c.lineTo(exR + rx, ey); c.stroke(); }
        else { eye(c, exL, ey, rx, ry); eye(c, exR, ey, rx, ry); }
        c.beginPath(); c.moveTo(exL - rx * 1.8, ey - ry * 1.2); c.lineTo(exL + rx * 1.3, ey - ry * 1.9); c.moveTo(exR + rx * 1.8, ey - ry * 1.2); c.lineTo(exR - rx * 1.3, ey - ry * 1.9); c.stroke();
        if (expr === 'sad') { c.beginPath(); c.arc(mx, my + fw * 0.05, fw * 0.06, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
        else {
          c.beginPath(); c.moveTo(mx - fw * 0.07, my + fw * 0.01); c.quadraticCurveTo(mx - fw * 0.035, my - fw * 0.025, mx, my + fw * 0.005);
          c.quadraticCurveTo(mx + fw * 0.035, my + fw * 0.035, mx + fw * 0.07, my); c.stroke();
        }
        c.fillStyle = '#8fd3ff'; const ty = ey + ry * 1.4 + ((t * 30) % (fw * 0.12));
        c.beginPath(); c.arc(exR + rx * 0.5, ty, fw * 0.016, 0, TAU); c.fill();
        break;
      }
      case 'hurt': {
        c.lineWidth = Math.max(1.8, fw * 0.028);
        c.beginPath(); c.moveTo(exL - rx * 1.2, ey - ry * 0.8); c.lineTo(exL + rx * 1.1, ey); c.lineTo(exL - rx * 1.2, ey + ry * 0.8);
        c.moveTo(exR + rx * 1.2, ey - ry * 0.8); c.lineTo(exR - rx * 1.1, ey); c.lineTo(exR + rx * 1.2, ey + ry * 0.8); c.stroke();
        c.beginPath(); c.ellipse(mx, my, fw * 0.04, fw * 0.03, 0, 0, TAU); c.stroke();
        break;
      }
      case 'surprised': {
        eye(c, exL, ey, rx * 1.15, ry * 1.15); eye(c, exR, ey, rx * 1.15, ry * 1.15); lashes(exL, ey, -1); lashes(exR, ey, 1);
        c.beginPath(); c.ellipse(mx, my + fw * 0.01, fw * 0.035, fw * 0.045, 0, 0, TAU); c.fill();
        break;
      }
      case 'joy': {
        for (const x of [exL, exR]) { c.beginPath(); c.arc(x, ey + ry * 0.4, rx * 1.3, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke(); }
        c.beginPath(); c.moveTo(mx - fw * 0.1, my - fw * 0.02); c.quadraticCurveTo(mx, my + fw * 0.12, mx + fw * 0.1, my - fw * 0.02); c.closePath(); c.fill();
        c.fillStyle = '#ff7aa6'; c.beginPath(); c.ellipse(mx, my + fw * 0.045, fw * 0.04, fw * 0.018, 0, 0, TAU); c.fill();
        break;
      }
      case 'determined': {
        eye(c, exL, ey, rx, ry); eye(c, exR, ey, rx, ry);
        c.beginPath(); c.moveTo(exL - rx * 1.6, ey - ry * 1.6); c.lineTo(exL + rx * 1.3, ey - ry * 1.2); c.moveTo(exR + rx * 1.6, ey - ry * 1.6); c.lineTo(exR - rx * 1.3, ey - ry * 1.2); c.stroke();
        c.beginPath(); c.moveTo(mx - fw * 0.06, my); c.lineTo(mx + fw * 0.06, my); c.stroke();
        break;
      }
      default: {
        if (blink) { c.beginPath(); c.moveTo(exL - rx, ey); c.lineTo(exL + rx, ey); c.moveTo(exR - rx, ey); c.lineTo(exR + rx, ey); c.stroke(); }
        else { eye(c, exL, ey, rx, ry); eye(c, exR, ey, rx, ry); }
        lashes(exL, ey, -1); lashes(exR, ey, 1); smile();
      }
    }
    c.restore();
  }
  function drawBlush(c, P, A, fw) {
    c.save(); c.fillStyle = 'rgba(255,120,170,0.45)';
    for (const p of [A.cheekL, A.cheekR]) { const [x, y] = P(p[0], p[1]); c.beginPath(); c.ellipse(x, y, fw * 0.055, fw * 0.03, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  function drawSweat(c, P, fw) {
    const [x, y] = P(0.86, 0.16);
    c.save(); c.fillStyle = '#9fe0ff'; c.strokeStyle = '#3c8fc0'; c.lineWidth = Math.max(1, fw * 0.012);
    c.beginPath(); c.moveTo(x, y - fw * 0.06); c.quadraticCurveTo(x + fw * 0.05, y + fw * 0.01, x, y + fw * 0.03); c.quadraticCurveTo(x - fw * 0.05, y + fw * 0.01, x, y - fw * 0.06); c.fill(); c.stroke();
    c.restore();
  }

  // ---------- 몸통 ----------
  const BODY = {
    balloon(c, ch, L, T, W, Hh) { const im = IMG[ch.img]; if (im) c.drawImage(im, L, T, W, Hh); },
    pillow(c, ch, L, T, W, Hh, o, t) {
      const [c1, c2, c3] = ch.col;
      const p = () => {
        c.beginPath();
        c.moveTo(L + W * 0.04, T + Hh * 0.06);
        c.quadraticCurveTo(L + W * 0.5, T - Hh * 0.08, L + W * 0.96, T + Hh * 0.06);
        c.quadraticCurveTo(L + W * 1.06, T + Hh * 0.5, L + W * 0.96, T + Hh * 0.94);
        c.quadraticCurveTo(L + W * 0.5, T + Hh * 1.06, L + W * 0.04, T + Hh * 0.94);
        c.quadraticCurveTo(L - W * 0.06, T + Hh * 0.5, L + W * 0.04, T + Hh * 0.06);
        c.closePath();
      };
      p();
      const g = c.createRadialGradient(L + W * 0.38, T + Hh * 0.3, W * 0.05, L + W * 0.5, T + Hh * 0.55, W * 0.7);
      g.addColorStop(0, c1); g.addColorStop(0.6, c2); g.addColorStop(1, c3);
      c.fillStyle = g; c.fill();
      c.lineWidth = Math.max(1.6, W * 0.024); c.strokeStyle = '#6f5aa8'; c.stroke();
      // 레이스 테두리
      c.save(); p(); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1, W * 0.016); c.setLineDash([W * 0.03, W * 0.025]);
      c.beginPath(); c.moveTo(L + W * 0.12, T + Hh * 0.13); c.quadraticCurveTo(L + W * 0.5, T + Hh * 0.02, L + W * 0.88, T + Hh * 0.13);
      c.quadraticCurveTo(L + W * 0.96, T + Hh * 0.5, L + W * 0.88, T + Hh * 0.87); c.quadraticCurveTo(L + W * 0.5, T + Hh * 0.98, L + W * 0.12, T + Hh * 0.87);
      c.quadraticCurveTo(L + W * 0.04, T + Hh * 0.5, L + W * 0.12, T + Hh * 0.13); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(L + W * 0.3, T + Hh * 0.2, W * 0.16, Hh * 0.07, -0.25, 0, TAU); c.fill();
      heartPath(c, L + W * 0.78, T + Hh * 0.76, W * 0.05); c.fillStyle = '#ff8fc0'; c.fill();
      c.restore();
      // 모서리 술
      c.fillStyle = '#ffd1e6'; c.strokeStyle = '#a8306a'; c.lineWidth = Math.max(1, W * 0.012);
      for (const [x, y] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.94], [0.96, 0.94]]) { c.beginPath(); c.arc(L + W * x, T + Hh * y, W * 0.035, 0, TAU); c.fill(); c.stroke(); }
    },
    ruler(c, ch, L, T, W, Hh, o, t) {
      roundRect(c, L, T, W, Hh, W * 0.16);
      const g = c.createLinearGradient(L, 0, L + W, 0); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.5, '#fff3b8'); g.addColorStop(1, '#f2c24b');
      c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.6, W * 0.05); c.strokeStyle = '#8a5b12'; c.stroke();
      const erased = o.erased || 0; // 0~1: 지워진 정도
      c.save(); roundRect(c, L, T, W, Hh, W * 0.16); c.clip();
      c.strokeStyle = '#3a2a10'; c.fillStyle = '#3a2a10';
      const ticks = 50, top = T + Hh * 0.04, len = Hh * 0.92;
      const shown = Math.round(ticks * (1 - erased));
      for (let i = 0; i <= ticks; i++) {
        if (i > shown) break;
        const y = top + len * (i / ticks);
        const tl = i % 10 === 0 ? 0.42 : i % 5 === 0 ? 0.3 : 0.18;
        c.lineWidth = i % 10 === 0 ? Math.max(1.2, W * 0.035) : Math.max(0.8, W * 0.022);
        c.beginPath(); c.moveTo(L + W, y); c.lineTo(L + W * (1 - tl), y); c.stroke();
        if (i % 10 === 0) {
          c.font = `${Math.max(8, W * 0.26)}px Jua, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
          c.save(); c.translate(L + W * 0.12, y); c.fillText(String(i), 0, 0); c.restore();
        }
      }
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(L + W * 0.08, T + Hh * 0.02, W * 0.12, Hh * 0.96);
      c.restore();
      // 얼굴 바탕(동그란 판)
      c.fillStyle = 'rgba(255,250,225,0.9)';
      c.beginPath(); c.ellipse(L + W * 0.5, T + Hh * 0.19, W * 0.46, Hh * 0.07, 0, 0, TAU); c.fill();
    },
    pencil(c, ch, L, T, W, Hh, o, t) {
      // 위: 뾰족한 연필심(투구 대신), 몸통 노란 육각, 아래: 지우개
      const tipH = Hh * 0.2, bandH = Hh * 0.06, eraH = Hh * 0.1;
      c.beginPath(); c.moveTo(L, T + tipH); c.lineTo(L + W * 0.5, T); c.lineTo(L + W, T + tipH); c.closePath();
      c.fillStyle = '#f3d3a3'; c.fill(); c.lineWidth = Math.max(1.4, W * 0.04); c.strokeStyle = '#6b4a20'; c.stroke();
      c.beginPath(); c.moveTo(L + W * 0.36, T + tipH * 0.28); c.lineTo(L + W * 0.5, T); c.lineTo(L + W * 0.64, T + tipH * 0.28); c.closePath(); c.fillStyle = '#4a4a55'; c.fill();
      const by = T + tipH, bh = Hh - tipH - bandH - eraH;
      c.fillStyle = '#ffcf3a'; c.fillRect(L, by, W, bh);
      c.fillStyle = '#ffe17a'; c.fillRect(L + W * 0.33, by, W * 0.34, bh);
      c.fillStyle = '#e0a816'; c.fillRect(L + W * 0.78, by, W * 0.22, bh);
      c.strokeStyle = '#6b4a20'; c.strokeRect(L, by, W, bh);
      c.fillStyle = '#c9ced8'; c.fillRect(L, by + bh, W, bandH); c.strokeRect(L, by + bh, W, bandH);
      roundRect(c, L, by + bh + bandH, W, eraH, W * 0.2); c.fillStyle = '#ff9db5'; c.fill(); c.stroke();
    },
    eraser(c, ch, L, T, W, Hh, o, t) {
      roundRect(c, L, T, W, Hh, W * 0.14);
      const g = c.createLinearGradient(0, T, 0, T + Hh); g.addColorStop(0, '#ffd6e3'); g.addColorStop(1, '#f6a3bd');
      c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.6, W * 0.025); c.strokeStyle = '#9a3a5a'; c.stroke();
      // 종이 띠
      c.fillStyle = '#4f8fe8'; c.fillRect(L, T + Hh * 0.58, W, Hh * 0.3); c.fillStyle = '#ffffff'; c.fillRect(L, T + Hh * 0.64, W, Hh * 0.08);
      c.strokeRect(L, T + Hh * 0.58, W, Hh * 0.3);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(L + W * 0.3, T + Hh * 0.14, W * 0.18, Hh * 0.06, -0.2, 0, TAU); c.fill();
    },
    glue(c, ch, L, T, W, Hh, o, t) {
      const capH = Hh * 0.28;
      roundRect(c, L, T + capH * 0.8, W, Hh - capH * 0.8, W * 0.2);
      const g = c.createLinearGradient(L, 0, L + W, 0); g.addColorStop(0, '#f2f2f2'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#d5d5d5');
      c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.4, W * 0.04); c.strokeStyle = '#555'; c.stroke();
      c.fillStyle = '#3aa65a'; c.fillRect(L, T + Hh * 0.62, W, Hh * 0.16);
      c.fillStyle = '#fff'; c.font = `${Math.max(7, W * 0.22)}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('풀', L + W / 2, T + Hh * 0.7);
      roundRect(c, L - W * 0.04, T, W * 1.08, capH, W * 0.18); c.fillStyle = '#ff8a3d'; c.fill(); c.strokeStyle = '#7a3a10'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(L + W * 0.1, T + capH * 0.2, W * 0.16, capH * 0.6);
    },
    sheep(c, ch, L, T, W, Hh, o, t) {
      const blobs = [[0.2, 0.35, 0.2], [0.42, 0.2, 0.22], [0.66, 0.22, 0.21], [0.82, 0.42, 0.19], [0.75, 0.66, 0.21], [0.5, 0.74, 0.23], [0.25, 0.66, 0.21], [0.5, 0.45, 0.3]];
      c.fillStyle = '#7a6f8f';
      for (const [x, y, r] of blobs) { c.beginPath(); c.arc(L + W * x, T + Hh * y, W * r + 2.5, 0, TAU); c.fill(); }
      for (const [x, y, r] of blobs) {
        const g = c.createRadialGradient(L + W * (x - 0.05), T + Hh * (y - 0.06), 2, L + W * x, T + Hh * y, W * r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8e2f0'); c.fillStyle = g;
        c.beginPath(); c.arc(L + W * x, T + Hh * y, W * r, 0, TAU); c.fill();
      }
      c.beginPath(); c.ellipse(L + W * 0.52, T + Hh * 0.45, W * 0.2, Hh * 0.2, 0, 0, TAU);
      c.fillStyle = '#ffe9d6'; c.fill(); c.lineWidth = Math.max(1.2, W * 0.014); c.strokeStyle = '#8a6a5a'; c.stroke();
      c.fillStyle = '#c9a37a'; c.strokeStyle = '#6b4a2a';
      for (const d of [-1, 1]) { c.beginPath(); c.arc(L + W * (0.52 + d * 0.24), T + Hh * 0.3, W * 0.07, 0, TAU); c.fill(); c.stroke(); }
    },
    owl(c, ch, L, T, W, Hh, o, t) {
      c.beginPath(); c.ellipse(L + W * 0.5, T + Hh * 0.55, W * 0.5, Hh * 0.45, 0, 0, TAU);
      const g = c.createLinearGradient(0, T, 0, T + Hh); g.addColorStop(0, '#c08a5a'); g.addColorStop(1, '#8a5a34');
      c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.6, W * 0.025); c.strokeStyle = '#4a2a14'; c.stroke();
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(L + W * (0.5 + d * 0.26), T + Hh * 0.16); c.lineTo(L + W * (0.5 + d * 0.4), T - Hh * 0.04); c.lineTo(L + W * (0.5 + d * 0.42), T + Hh * 0.22); c.closePath(); c.fill(); c.stroke(); }
      c.beginPath(); c.ellipse(L + W * 0.5, T + Hh * 0.68, W * 0.3, Hh * 0.26, 0, 0, TAU); c.fillStyle = '#f2d6b0'; c.fill();
      c.strokeStyle = 'rgba(120,80,40,0.5)'; c.lineWidth = Math.max(1, W * 0.012);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(L + W * (0.38 + j * 0.12), T + Hh * (0.58 + i * 0.1), W * 0.03, 0, Math.PI); c.stroke(); }
      for (const d of [-1, 1]) { c.beginPath(); c.arc(L + W * (0.5 + d * 0.16), T + Hh * 0.36, W * 0.15, 0, TAU); c.fillStyle = '#fff7e6'; c.fill(); c.strokeStyle = '#4a2a14'; c.lineWidth = Math.max(1.4, W * 0.02); c.stroke(); }
      c.beginPath(); c.moveTo(L + W * 0.46, T + Hh * 0.44); c.lineTo(L + W * 0.54, T + Hh * 0.44); c.lineTo(L + W * 0.5, T + Hh * 0.53); c.closePath(); c.fillStyle = '#ffb02e'; c.fill(); c.stroke();
    },
    worm(c, ch, L, T, W, Hh, o, t) {
      const segs = [[0.5, 0.86, 0.36], [0.5, 0.66, 0.38], [0.5, 0.46, 0.38], [0.5, 0.2, 0.46]];
      for (let i = 0; i < segs.length; i++) {
        const [x, y, r] = segs[i], wob = Math.sin(t * 3 + i) * W * 0.03;
        c.beginPath(); c.ellipse(L + W * x + wob, T + Hh * y, W * r, W * r * 0.95, 0, 0, TAU);
        const g = c.createRadialGradient(L + W * (x - 0.1), T + Hh * (y - 0.05), 2, L + W * x, T + Hh * y, W * r);
        g.addColorStop(0, '#c9f59a'); g.addColorStop(1, '#6cc24a'); c.fillStyle = g; c.fill();
        c.lineWidth = Math.max(1.4, W * 0.03); c.strokeStyle = '#2f6b20'; c.stroke();
      }
      for (const d of [-1, 1]) { c.strokeStyle = '#2f6b20'; c.beginPath(); c.moveTo(L + W * (0.5 + d * 0.18), T + Hh * 0.04); c.lineTo(L + W * (0.5 + d * 0.3), T - Hh * 0.08); c.stroke(); c.beginPath(); c.arc(L + W * (0.5 + d * 0.3), T - Hh * 0.08, W * 0.05, 0, TAU); c.fillStyle = '#ffd23f'; c.fill(); }
    },
  };

  // ---------- 장신구 ----------
  const ACC = {
    tiara(c, k) {
      const [cx, cy] = k.top, w = k.hw * 0.38, h = k.hw * 0.19, t = k.t;
      c.save(); c.translate(cx, cy + (k.kind === 'pillow' ? 2 : 0)); c.rotate(-0.1);
      c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w * 0.38, -h * 0.62); c.lineTo(-w * 0.19, -h * 0.2); c.lineTo(0, -h); c.lineTo(w * 0.19, -h * 0.2);
      c.lineTo(w * 0.38, -h * 0.62); c.lineTo(w / 2, 0); c.quadraticCurveTo(0, h * 0.3, -w / 2, 0); c.closePath();
      c.fillStyle = goldGrad(c, -h, h * 0.3); c.fill(); c.lineWidth = Math.max(1.3, k.hw * 0.014); c.strokeStyle = '#8a5200'; c.stroke();
      for (const [x, y] of [[-w * 0.38, -h * 0.62], [0, -h], [w * 0.38, -h * 0.62]]) { c.beginPath(); c.arc(x, y, k.hw * 0.024, 0, TAU); c.fillStyle = '#fff6b0'; c.fill(); c.stroke(); }
      heartPath(c, 0, -h * 0.25, k.hw * 0.05); c.fillStyle = '#ff4f9a'; c.fill(); c.stroke();
      shiny(c, w * 0.42, -h * 0.9, k.hw * 0.05, t, 1);
      c.restore();
    },
    crown(c, k) {
      const [cx, by] = k.top, w = k.Wd * 1.55, h = k.Wd * 0.9, t = k.t;
      c.save(); c.translate(cx, by + h * 0.05); c.rotate(-0.06 + Math.sin(t * 1.7) * 0.04);
      const xs = [-0.5, -0.25, 0, 0.25, 0.5].map((v) => v * w), hs = [1.0, 0.86, 1.08, 0.86, 1.0].map((v) => v * h);
      c.beginPath(); c.moveTo(-w * 0.47, 0); c.lineTo(xs[0], -hs[0]);
      for (let i = 1; i < 5; i++) { c.lineTo((xs[i - 1] + xs[i]) / 2, -h * 0.42); c.lineTo(xs[i], -hs[i]); }
      c.lineTo(w * 0.47, 0); c.quadraticCurveTo(0, h * 0.12, -w * 0.47, 0); c.closePath();
      c.fillStyle = goldGrad(c, -h * 1.1, h * 0.1); c.fill(); c.lineWidth = Math.max(1.6, k.Wd * 0.05); c.strokeStyle = '#7a4500'; c.stroke();
      c.lineWidth = Math.max(1.2, k.Wd * 0.03);
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(xs[i], -hs[i], k.Wd * 0.08, 0, TAU); c.fillStyle = '#fff3a6'; c.fill(); c.stroke(); }
      for (const [gx, col] of [[-0.28, '#ff3b5c'], [0, '#3d7bff'], [0.28, '#ff3b5c']]) { c.beginPath(); c.ellipse(gx * w, -h * 0.18, k.Wd * 0.08, k.Wd * 0.1, 0, 0, TAU); c.fillStyle = col; c.fill(); c.stroke(); }
      shiny(c, w * 0.2, -h * 0.75, k.Wd * 0.13, t, 0.5);
      c.restore();
    },
    ribbon(c, k, dark) {
      const [cx, cy] = k.top, s = k.hw * 0.17;
      c.save(); c.translate(cx + k.hw * 0.02, cy + s * 0.3); c.rotate(0.15);
      const col = dark ? '#2a3a6a' : '#4aa8ff', edge = dark ? '#10182e' : '#1d5aa8';
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(d * s * 1.6, -s * 1.1, d * s * 1.5, s * 0.15); c.quadraticCurveTo(d * s * 0.9, s * 0.5, 0, 0); c.closePath();
        c.fillStyle = col; c.fill(); c.lineWidth = Math.max(1.2, s * 0.12); c.strokeStyle = edge; c.stroke();
        c.beginPath(); c.moveTo(d * s * 0.2, s * 0.15); c.lineTo(d * s * 0.6, s * 1.2); c.lineTo(d * s * 0.25, s * 1.0); c.closePath(); c.fill(); c.stroke();
      }
      c.beginPath(); c.arc(0, 0, s * 0.32, 0, TAU); c.fillStyle = col; c.fill(); c.stroke();
      if (dark) { c.strokeStyle = '#8a7ab8'; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, -s * 0.2); c.lineTo(-s * 0.4, s * 0.1); c.stroke(); }
      c.restore();
    },
    devil(c, k) {
      ACC.horns(c, k);
      ACC.ribbon(c, { top: k.P(0.24, 0.14), hw: k.hw * 0.8, t: k.t }, true);
    },
    horns(c, k) {
      const pop = k.o.hornPop || 0;
      for (const [nx, ny, d] of [[0.25, 0.07, -1], [0.73, 0.08, 1]]) {
        const [x, y] = k.P(nx, ny), bw = k.Wd * 0.085, hh = k.Wd * 0.24;
        c.save(); c.translate(x + d * pop * k.Wd * 0.6, y - pop * k.Wd * 0.8); c.rotate(d * (0.25 + pop * 3)); c.globalAlpha *= 1 - pop;
        c.beginPath(); c.moveTo(-bw, 0); c.quadraticCurveTo(-bw * 0.9, -hh * 0.7, d * bw * 0.9, -hh); c.quadraticCurveTo(bw * 0.2, -hh * 0.45, bw, 0); c.quadraticCurveTo(0, bw * 0.45, -bw, 0); c.closePath();
        const g = c.createLinearGradient(0, -hh, 0, bw * 0.3); g.addColorStop(0, '#ff9a9a'); g.addColorStop(0.5, '#f0384f'); g.addColorStop(1, '#a3102a');
        c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.5, k.Wd * 0.016); c.strokeStyle = '#4d0614'; c.stroke();
        c.restore();
      }
    },
    wizard(c, k) {
      const [cx, by] = k.top, w = k.hw * 0.72, h = k.hw * 0.74, t = k.t;
      c.save(); c.translate(cx, by + k.hw * 0.04); c.rotate(-0.12);
      c.beginPath(); c.ellipse(0, 0, w * 0.55, w * 0.13, 0, 0, TAU); c.fillStyle = '#5b3fd0'; c.fill(); c.lineWidth = Math.max(1.4, k.hw * 0.016); c.strokeStyle = '#2a1670'; c.stroke();
      const sw = Math.sin(t * 2) * 0.05;
      c.beginPath(); c.moveTo(-w * 0.33, -w * 0.03); c.quadraticCurveTo(-w * 0.12, -h * 0.55, w * (0.22 + sw), -h); c.quadraticCurveTo(w * 0.08, -h * 0.5, w * 0.33, -w * 0.03); c.closePath();
      const g = c.createLinearGradient(-w * 0.3, -h, w * 0.3, 0); g.addColorStop(0, '#a88bff'); g.addColorStop(1, '#5a3cd6'); c.fillStyle = g; c.fill(); c.stroke();
      c.fillStyle = '#fff4a0'; starPath(c, -w * 0.06, -h * 0.42, k.hw * 0.06, k.hw * 0.026); c.fill();
      c.beginPath(); c.arc(w * (0.22 + sw), -h, k.hw * 0.04, 0, TAU); c.fill(); c.stroke();
      c.restore();
    },
    granny(c, k) {
      const [cx, cy] = k.top;
      c.save();
      c.fillStyle = '#e8e8f0'; c.strokeStyle = '#8a8aa0'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx + k.hw * 0.02, cy - k.hw * 0.02, k.hw * 0.1, 0, TAU); c.fill(); c.stroke();
      const [ex, ey] = k.P(HEART_A.eyeL[0], HEART_A.eyeL[1]), [ex2] = k.P(HEART_A.eyeR[0], HEART_A.eyeR[1]);
      c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1.4, k.hw * 0.018);
      for (const x of [ex, ex2]) { c.beginPath(); c.arc(x, ey, k.hw * 0.065, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(ex + k.hw * 0.065, ey); c.lineTo(ex2 - k.hw * 0.065, ey); c.stroke();
      c.restore();
    },
    sash(c, k) {
      const { P } = k; const [x1, y1] = P(0.22, 0.38), [x2, y2] = P(0.8, 0.86);
      c.save(); c.strokeStyle = '#e8455f'; c.lineWidth = k.hw * 0.08; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc((x1 + x2) / 2, (y1 + y2) / 2, k.hw * 0.06, 0, TAU); c.fillStyle = '#ffd23f'; c.fill();
      c.restore();
      ACC.glassesSmall(c, k);
    },
    glassesSmall(c, k) {
      const [ex, ey] = k.P(0.42, 0.4), [ex2] = k.P(0.62, 0.4);
      c.save(); c.strokeStyle = '#4a3a2a'; c.lineWidth = Math.max(1.2, k.hw * 0.015);
      for (const x of [ex, ex2]) { c.beginPath(); c.arc(x, ey, k.hw * 0.055, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(ex + k.hw * 0.055, ey); c.lineTo(ex2 - k.hw * 0.055, ey); c.stroke(); c.restore();
    },
    goggles(c, k) {
      const [cx, cy] = k.P(0.5, 0.12);
      c.save(); c.fillStyle = '#5a3a1a'; c.fillRect(cx - k.hw * 0.42, cy - k.hw * 0.03, k.hw * 0.84, k.hw * 0.06);
      for (const d of [-1, 1]) { c.beginPath(); c.arc(cx + d * k.hw * 0.17, cy, k.hw * 0.1, 0, TAU); c.fillStyle = '#9fe3ff'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#c9a03a'; c.stroke(); }
      c.restore();
    },
    helmetP(c, k) {
      const [cx, cy] = k.P(0.5, 0.2);
      c.save(); c.strokeStyle = '#c3203a'; c.lineWidth = k.hw * 0.05; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - k.hw * 0.08, cy - k.hw * 0.05); c.quadraticCurveTo(cx - k.hw * 0.25, cy - k.hw * 0.25, cx - k.hw * 0.32, cy - k.hw * 0.08); c.stroke();
      c.restore();
    },
    scarf(c, k) {
      const [x1, y] = k.P(0.06, 0.56), [x2] = k.P(0.94, 0.56);
      c.save(); c.fillStyle = '#ffd23f'; c.strokeStyle = '#a86a00'; c.lineWidth = 1.5;
      roundRect(c, x1, y - k.hw * 0.05, x2 - x1, k.hw * 0.1, k.hw * 0.04); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x2 - k.hw * 0.15, y); c.lineTo(x2 - k.hw * 0.05, y + k.hw * 0.25); c.lineTo(x2 - k.hw * 0.2, y + k.hw * 0.22); c.closePath(); c.fill(); c.stroke();
      c.restore();
    },
    mustache(c, k) {
      const [mx, my] = k.P(0.5, 0.47);
      c.save(); c.fillStyle = '#f2f2f2'; c.strokeStyle = '#8a8a8a'; c.lineWidth = 1.2;
      for (const d of [-1, 1]) { c.beginPath(); c.ellipse(mx + d * k.hw * 0.1, my, k.hw * 0.12, k.hw * 0.05, d * 0.3, 0, TAU); c.fill(); c.stroke(); }
      for (const d of [-1, 1]) { c.fillStyle = '#e8e8e8'; c.beginPath(); c.ellipse(mx + d * k.hw * 0.17, my - k.hw * 0.16, k.hw * 0.08, k.hw * 0.03, -d * 0.2, 0, TAU); c.fill(); c.stroke(); }
      c.restore();
    },
    glasses(c, k) {
      const [ex, ey] = k.P(0.38, 0.17), [ex2] = k.P(0.62, 0.17);
      c.save(); c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1.4, k.hw * 0.02);
      for (const x of [ex, ex2]) { roundRect(c, x - k.hw * 0.07, ey - k.hw * 0.05, k.hw * 0.14, k.hw * 0.1, 3); c.stroke(); }
      c.beginPath(); c.moveTo(ex + k.hw * 0.07, ey); c.lineTo(ex2 - k.hw * 0.07, ey); c.stroke(); c.restore();
    },
    nightcap(c, k) { // 코스튬 모자
      const [cx, cy] = k.top, w = k.hw * 0.62, t = k.t;
      c.save(); c.translate(cx, cy + k.hw * 0.03); c.rotate(-0.2);
      c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(-w * 0.1, -w * 0.9, w * 0.55, -w * 0.5 + Math.sin(t * 2) * 3); c.quadraticCurveTo(w * 0.1, -w * 0.4, w / 2, 0); c.closePath();
      c.fillStyle = '#8fc9ff'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#2a5a8a'; c.stroke();
      c.fillStyle = '#fff'; for (const [x, y] of [[-0.15, -0.3], [0.1, -0.45], [0.25, -0.2]]) { c.beginPath(); c.arc(x * w, y * w, 2.5, 0, TAU); c.fill(); }
      roundRect(c, -w * 0.55, -w * 0.08, w * 1.1, w * 0.16, w * 0.07); c.fill(); c.stroke();
      c.beginPath(); c.arc(w * 0.55, -w * 0.5 + Math.sin(t * 2) * 3, w * 0.1, 0, TAU); c.fill(); c.stroke();
      c.restore();
    },
    pencilHat(c, k) {
      const [cx, cy] = k.top, w = k.hw * 0.3;
      c.save(); c.translate(cx, cy + k.hw * 0.02); c.rotate(0.15);
      c.fillStyle = '#ffcf3a'; c.strokeStyle = '#6b4a20'; c.lineWidth = 1.5;
      c.fillRect(-w / 2, -w * 1.6, w, w * 1.4); c.strokeRect(-w / 2, -w * 1.6, w, w * 1.4);
      c.beginPath(); c.moveTo(-w / 2, -w * 1.6); c.lineTo(0, -w * 2.5); c.lineTo(w / 2, -w * 1.6); c.closePath(); c.fillStyle = '#f3d3a3'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-w * 0.15, -w * 2.2); c.lineTo(0, -w * 2.5); c.lineTo(w * 0.15, -w * 2.2); c.closePath(); c.fillStyle = '#444'; c.fill();
      c.fillStyle = '#ff9db5'; c.fillRect(-w / 2, -w * 0.2, w, w * 0.3); c.strokeRect(-w / 2, -w * 0.2, w, w * 0.3);
      c.restore();
    },
  };
  // ---------- 손에 드는 것 ----------
  const HOLD = {
    pitchfork(c, [hx, hy], fw, t, o) {
      const L = fw * 1.08;
      c.save(); c.translate(hx, hy); c.rotate(0.1 + Math.sin(t * 2) * 0.04 + (o.forkSwing || 0)); c.globalAlpha *= 1 - (o.forkFade || 0);
      c.lineCap = 'round'; c.strokeStyle = '#1f0d33'; c.lineWidth = fw * 0.085; c.beginPath(); c.moveTo(0, L * 0.32); c.lineTo(0, -L * 0.58); c.stroke();
      c.strokeStyle = '#7d4bb6'; c.lineWidth = fw * 0.05; c.beginPath(); c.moveTo(0, L * 0.32); c.lineTo(0, -L * 0.58); c.stroke();
      const y0 = -L * 0.58, pw = fw * 0.2;
      const head = () => { c.beginPath(); c.moveTo(-pw, y0 - fw * 0.24); c.lineTo(-pw, y0 - fw * 0.04); c.quadraticCurveTo(0, y0 + fw * 0.08, pw, y0 - fw * 0.04); c.lineTo(pw, y0 - fw * 0.24); c.moveTo(0, y0 + fw * 0.02); c.lineTo(0, y0 - fw * 0.32); };
      c.strokeStyle = '#4a2a00'; c.lineWidth = fw * 0.075; head(); c.stroke();
      c.strokeStyle = '#ffcf3a'; c.lineWidth = fw * 0.042; head(); c.stroke();
      if (o.forkFade > 0) { c.globalAlpha = o.forkFade; flower(c, 0, y0 - fw * 0.1, fw * 0.16, '#ff7ab8', '#ffe066'); }
      c.restore();
    },
    wand(c, [hx, hy], fw, t) {
      c.save(); c.translate(hx, hy); c.rotate(0.35 + Math.sin(t * 3) * 0.12);
      c.lineCap = 'round'; c.strokeStyle = '#5a3a1a'; c.lineWidth = fw * 0.05; c.beginPath(); c.moveTo(0, fw * 0.12); c.lineTo(0, -fw * 0.42); c.stroke();
      glowFast(c, 0, -fw * 0.5, fw * 0.26, [255, 240, 150], 0.7);
      starPath(c, 0, -fw * 0.5, fw * 0.13, fw * 0.055); c.fillStyle = '#ffe14a'; c.fill(); c.strokeStyle = '#a06a00'; c.lineWidth = Math.max(1.2, fw * 0.014); c.stroke();
      c.restore();
    },
    trumpet(c, [hx, hy], fw, t) {
      c.save(); c.translate(hx, hy); c.rotate(-0.4);
      c.fillStyle = goldGrad(c, -fw * 0.1, fw * 0.1); c.strokeStyle = '#7a4500'; c.lineWidth = 1.5;
      c.fillRect(-fw * 0.05, -fw * 0.03, fw * 0.4, fw * 0.06); c.strokeRect(-fw * 0.05, -fw * 0.03, fw * 0.4, fw * 0.06);
      c.beginPath(); c.moveTo(fw * 0.35, -fw * 0.03); c.lineTo(fw * 0.52, -fw * 0.14); c.lineTo(fw * 0.52, fw * 0.14); c.lineTo(fw * 0.35, fw * 0.03); c.closePath(); c.fill(); c.stroke();
      c.restore();
    },
    shield(c, [hx, hy], fw, t) {
      c.save(); c.translate(hx + fw * 0.05, hy);
      c.beginPath(); c.moveTo(-fw * 0.16, -fw * 0.2); c.lineTo(fw * 0.16, -fw * 0.2); c.lineTo(fw * 0.16, fw * 0.05); c.quadraticCurveTo(0, fw * 0.25, -fw * 0.16, fw * 0.05); c.closePath();
      c.fillStyle = '#4f8fe8'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d3a7a'; c.stroke();
      starPath(c, 0, -fw * 0.02, fw * 0.08, fw * 0.035); c.fillStyle = '#ffd23f'; c.fill();
      c.restore();
    },
    pointer(c, [hx, hy], fw, t) {
      c.save(); c.translate(hx, hy); c.rotate(-0.9 + Math.sin(t * 2) * 0.1);
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -fw * 0.7); c.stroke();
      c.fillStyle = '#e8455f'; c.beginPath(); c.arc(0, -fw * 0.7, 3, 0, TAU); c.fill(); c.restore();
    },
  };
  function pillowMask(c, L, T, W, Hh, asleep) {
    const my = T + Hh * (asleep ? 0.47 : 0.19);
    roundRect(c, L + W * 0.16, my - Hh * 0.075, W * 0.68, Hh * 0.15, Hh * 0.07);
    c.fillStyle = '#3d3a7a'; c.fill(); c.strokeStyle = '#1f1d4a'; c.lineWidth = Math.max(1, W * 0.014); c.stroke();
    c.strokeStyle = '#fff6b0'; c.lineWidth = Math.max(1, W * 0.014);
    for (const ex of [0.37, 0.63]) { c.beginPath(); c.arc(L + W * ex, my - Hh * 0.012, W * 0.045, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    c.fillStyle = '#fff6b0'; starPath(c, L + W * 0.5, my, W * 0.03, W * 0.012); c.fill();
  }
  function drawTail(c, [x, y], Wd, t) {
    const sw = Math.sin(t * 3) * 0.12;
    c.save(); c.lineCap = 'round'; c.strokeStyle = '#2a0f45'; c.lineWidth = Wd * 0.05;
    const ex = x - Wd * 0.5, ey = y - Wd * (0.28 + sw);
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - Wd * 0.3, y + Wd * 0.08, x - Wd * 0.38, y - Wd * (0.22 + sw), ex, ey); c.stroke();
    c.strokeStyle = '#8c4fd0'; c.lineWidth = Wd * 0.025; c.stroke();
    c.save(); c.translate(ex, ey); c.rotate(-0.9 + sw); heartPath(c, 0, 0, Wd * 0.07); c.fillStyle = '#7a3cc4'; c.fill(); c.lineWidth = Math.max(1.2, Wd * 0.014); c.strokeStyle = '#2a0f45'; c.stroke(); c.restore();
    c.restore();
  }
  function drawCape(c, P, Wd, Hd, t, o) {
    const [x1, y1] = P(0.05, 0.3), [x2] = P(0.95, 0.3), sw = Math.sin(t * 2.5) * Wd * 0.08;
    c.save(); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y1);
    c.quadraticCurveTo(x2 + Wd * 0.5 + sw, y1 + Hd * 0.4, x2 + Wd * 0.4 + sw, y1 + Hd * 0.62);
    c.lineTo(x1 - Wd * 0.4 + sw, y1 + Hd * 0.62); c.quadraticCurveTo(x1 - Wd * 0.5 + sw, y1 + Hd * 0.4, x1, y1); c.closePath();
    const g = c.createLinearGradient(0, y1, 0, y1 + Hd * 0.6); g.addColorStop(0, '#e8455f'); g.addColorStop(1, '#a8203c');
    c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = '#5a0c18'; c.stroke();
    c.restore();
  }

  return {
    IMG, CH, SPEC, INK, TAU, hero, setImages(m) { Object.assign(IMG, m); },
    heartPath, roundRect, starPath, glow, glowFast, shadow, shiny, flower, goldGrad, drawChar,
  };
})();
