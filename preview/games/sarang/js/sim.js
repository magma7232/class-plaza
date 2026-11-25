// 사랑둥이 대모험 — 맵·몬스터·보스 규칙 (서버와 혼자 하기에서 함께 씀)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SIM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FT = 336, FB = 522;

  // ---------------- 맵 ----------------
  // spawn: [몬스터, 마리 수, 시작 x, 끝 x] · wave: 습격 이벤트 · gold: 황금 투덜이가 나오는 곳
  const MAPS = {
    heart:    { name: '하트 마을', region: 0, theme: 'heartTown', w: 1700, music: 'town', safe: true, spawn: [] },
    cotton:   { name: '솜사탕 마을', region: 1, theme: 'cottonTown', w: 1600, music: 'cotton', safe: true, spawn: [] },
    drowsy:   { name: '졸음 들판', region: 1, theme: 'drowsyField', w: 2900, music: 'field', spawn: [['cloud', 9, 480, 2760], ['sheep', 5, 800, 2760]],
      wave: { first: 35, every: [100, 140], n: 7, types: ['cloud', 'cloud', 'sheep'], text: '투덜 구름 떼가 몰려와요!' }, gold: true },
    toss:     { name: '뒤척이 숲', region: 1, theme: 'tossForest', w: 2500, music: 'forest', spawn: [['snore', 7, 560, 2360], ['shade', 5, 700, 2360], ['cloud', 3, 600, 2300]],
      wave: { first: 35, every: [100, 140], n: 7, types: ['shade', 'shade', 'cloud'], text: '이불 유령들이 몰려와요!' }, gold: true },
    pillow:   { name: '베개 성', region: 1, theme: 'pillowCastle', w: 1500, music: 'boss', boss: 'snoreKing', spawn: [] },
    pencil:   { name: '연필 마을', region: 2, theme: 'pencilTown', w: 1900, music: 'town2', safe: true, spawn: [] },
    notebook: { name: '공책 평원', region: 2, theme: 'notebookField', w: 3000, music: 'field2', spawn: [['scribble', 8, 480, 2600], ['crumb', 9, 560, 2600], ['tack', 4, 1100, 2600]],
      wave: { first: 35, every: [100, 140], n: 8, types: ['crumb', 'crumb', 'scribble'], text: '낙서 괴물 떼가 몰려와요!' }, gold: true },
    tower:    { name: '눈금 탑', region: 2, theme: 'rulerTower', w: 1500, music: 'boss', boss: 'eraserBoss', spawn: [] },
    gloom:    { name: '심술 마을', region: 3, theme: 'grumpyTown', w: 1900, music: 'gloom', safe: true, spawn: [] },
    thorn:    { name: '가시 정원', region: 3, theme: 'thornGarden', w: 2700, music: 'field3', spawn: [['bat', 7, 560, 2560], ['thorn', 5, 700, 2500], ['cloudX', 3, 900, 2500]],
      wave: { first: 35, every: [100, 140], n: 7, types: ['bat', 'bat', 'cloudX'], text: '심술 박쥐 떼가 몰려와요!' }, gold: true },
    mirror:   { name: '거울 미로', region: 3, theme: 'mirrorHall', w: 1500, music: 'mystery', safe: true, spawn: [] },
    throne:   { name: '왕좌의 방', region: 3, theme: 'throne', w: 1400, music: 'boss3', boss: 'devil', spawn: [] },
  };

  // ---------------- 몬스터 ----------------
  const MON = {
    cloud:    { name: '투덜 구름', hp: 45, dmg: 10, spd: 64, r: 30, z: 58, ai: 'float' },
    sheep:    { name: '하품 양', hp: 70, dmg: 15, spd: 54, r: 34, z: 0, ai: 'charge' },
    snore:    { name: '코골이 버섯', hp: 60, dmg: 9, spd: 0, r: 30, z: 0, ai: 'shooter', shot: 'bubble' },
    shade:    { name: '이불 유령', hp: 55, dmg: 12, spd: 74, r: 28, z: 28, ai: 'ghost' },
    scribble: { name: '낙서 괴물', hp: 70, dmg: 12, spd: 70, r: 30, z: 0, ai: 'zigzag', shot: 'ink' },
    crumb:    { name: '지우개 똥', hp: 28, dmg: 7, spd: 96, r: 18, z: 0, ai: 'swarm' },
    tack:     { name: '압정 고슴도치', hp: 85, dmg: 16, spd: 44, r: 30, z: 0, ai: 'roller' },
    bat:      { name: '심술 박쥐', hp: 65, dmg: 14, spd: 94, r: 26, z: 120, ai: 'bat' },
    thorn:    { name: '가시 덩굴', hp: 100, dmg: 13, spd: 0, r: 32, z: 0, ai: 'turret', shot: 'thorn' },
    cloudX:   { name: '천둥 먹구름', hp: 140, dmg: 16, spd: 58, r: 42, z: 64, ai: 'thunder' },
    gold:     { name: '황금 투덜이', hp: 110, dmg: 0, spd: 128, r: 28, z: 36, ai: 'flee' },
    snoreKing:  { name: '코골이 대왕', hp: 1530, dmg: 16, spd: 30, r: 82, z: 0, ai: 'boss', boss: 1 },
    eraserBoss: { name: '심술 지우개 대장', hp: 2250, dmg: 18, spd: 60, r: 78, z: 0, ai: 'boss', boss: 2 },
    devil:      { name: '악마둥이', hp: 3240, dmg: 20, spd: 70, r: 66, z: 24, ai: 'boss', boss: 3 },
  };
  const TYPES = Object.keys(MON);
  const STATES = ['idle', 'move', 'aim', 'charge', 'rest', 'fade', 'dash', 'curl', 'roll', 'swoop', 'cast', 'dead', 'down', 'wait', 'hurt', 'spawn'];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function createWorld(mapId, opts) {
    const map = MAPS[mapId];
    const w = { id: mapId, map, t: 0, mons: [], nextId: 1, ev: [], boss: null, bossDownAt: 0, noRespawn: !!(opts && opts.noRespawn), wiped: false,
      waveT: map.wave ? map.wave.first : 0, waveOn: null, goldT: rnd(28, 45) };
    for (const [type, n, x0, x1] of map.spawn) for (let i = 0; i < n; i++) addMon(w, type, x0 + (x1 - x0) * ((i + Math.random() * 0.8) / n), rnd(FT + 14, FB - 6));
    if (map.boss) spawnBoss(w, 1);
    return w;
  }
  // 학년 맞춤 체력 배율(2026-11-25): 게임이 시작할 때 setHpK(학년 표의 값). 4학년 = 1(예전 그대로)
  let HPK = 1;
  function setHpK(k) { HPK = k > 0 ? k : 1; }
  function addMon(w, type, x, y, extra) {
    const d = MON[type], hp0 = Math.max(1, Math.round(d.hp * HPK));
    const m = Object.assign({ id: w.nextId++, type, x, y, z: d.z, hp: hp0, max: hp0, st: 'idle', tm: rnd(0.5, 2), cd: rnd(1, 3), f: -1,
      hx: x, hy: y, tx: x, ty: y, ph: Math.random() * 6, hitBy: {}, respawnAt: 0, minion: false, stun: 0 }, extra || {});
    w.mons.push(m);
    return m;
  }
  function spawnBoss(w, nPlayers) {
    const type = w.map.boss, d = MON[type];
    const k = Math.max(1, nPlayers) * 0.85 + 0.15;
    const b = addMon(w, type, w.map.w * 0.72, 430, { st: 'wait', phase: 1, scaleN: Math.max(1, nPlayers), seq: 0 });
    b.hp = b.max = Math.round(d.hp * k * HPK);
    w.boss = b;
    return b;
  }

  function nearest(w, m, players, rx, ry) {
    let best = null, bd = 1e9;
    for (const p of players) {
      if (p.dead) continue;
      const dx = Math.abs(p.x - m.x), dy = Math.abs(p.y - m.y);
      if (dx > rx || dy > ry) continue;
      const d = dx + dy * 1.6;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function moveTo(m, tx, ty, spd, dt) {
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, spd * dt);
    m.x += dx / d * s; m.y += dy / d * s * 0.8;
    if (Math.abs(dx) > 4) m.f = dx > 0 ? 1 : -1;
    return false;
  }
  function wander(w, m, dt, spd) {
    m.tm -= dt;
    if (m.tm <= 0) {
      m.tx = clamp(m.hx + rnd(-220, 220), 60, w.map.w - 60);
      m.ty = rnd(FT + 12, FB - 6);
      m.tm = rnd(1.8, 3.4);
    }
    moveTo(m, m.tx, m.ty, spd, dt);
  }
  const P = (w, o) => w.ev.push(Object.assign({ e: 'p' }, o));
  const HZ = (w, o) => w.ev.push(Object.assign({ e: 'h' }, o));
  function aimShot(w, m, p, kind, spd, dmg, spread = 0, n = 1, z = 50) {
    const base = Math.atan2((p.y - m.y) * 1.0, p.x - m.x);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      P(w, { k: kind, x: m.x + Math.cos(a) * m.r * 0.6, y: m.y, z: m.z + z, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.55, dmg, life: 3.4, r: 14 });
    }
  }

  // ---------------- 습격 · 황금 투덜이 ----------------
  function stepEvents(w, dt, alive) {
    const mp = w.map;
    if (!alive.length) return;
    if (mp.wave) {
      if (w.waveOn) {
        w.waveOn.t += dt;
        const left = w.mons.filter((m) => m.wave && m.st !== 'dead').length;
        if (!left) { w.ev.push({ e: 'w', k: 'clear' }); w.waveOn = null; w.waveT = rnd(mp.wave.every[0], mp.wave.every[1]); }
        else if (w.waveOn.t > 50) { for (const m of w.mons) m.wave = false; w.ev.push({ e: 'w', k: 'end' }); w.waveOn = null; w.waveT = rnd(mp.wave.every[0], mp.wave.every[1]); }
      } else {
        w.waveT -= dt;
        if (w.waveT <= 0) {
          const p = alive[Math.floor(Math.random() * alive.length)];
          const n = mp.wave.n + Math.min(6, (alive.length - 1) * 2);
          for (let i = 0; i < n; i++) {
            const side = i % 2 ? 1 : -1, type = mp.wave.types[i % mp.wave.types.length];
            const m = addMon(w, type, clamp(p.x + side * rnd(260, 470), 80, mp.w - 80), rnd(FT + 14, FB - 6), { minion: true, wave: true, st: 'spawn', tm: 0.5 + i * 0.08 });
            m.hx = m.x;
          }
          w.waveOn = { t: 0, n };
          w.ev.push({ e: 'w', k: 'start', text: mp.wave.text, n });
        }
      }
    }
    if (mp.gold) {
      const g = w.mons.find((m) => m.type === 'gold' && m.st !== 'dead');
      if (!g) {
        w.goldT -= dt;
        if (w.goldT <= 0) {
          w.goldT = rnd(55, 85);
          if (Math.random() < 0.75) {
            const p = alive[Math.floor(Math.random() * alive.length)];
            let x = p.x + (Math.random() < 0.5 ? -1 : 1) * rnd(420, 640);
            if (x < 100 || x > mp.w - 100) x = p.x - (x - p.x);
            const m = addMon(w, 'gold', clamp(x, 100, mp.w - 100), rnd(FT + 20, FB - 20), { minion: true, st: 'spawn', tm: 0.6, life: 24 });
            w.ev.push({ e: 'g', k: 'spawn', id: m.id, x: m.x, y: m.y });
          }
        }
      }
    }
  }

  // ---------------- 한 틱 ----------------
  function step(w, dt, players) {
    w.t += dt;
    const alive = players.filter((p) => !p.dead);
    w.nP = Math.max(1, players.length);
    // 보스: 쓰러진 뒤 시간이 지나면 다시 준비 (혼자 하기에서는 다시 나오지 않음)
    if (w.boss && w.boss.st === 'down' && !w.noRespawn && w.t - w.bossDownAt > 40) {
      w.mons = w.mons.filter((m) => m !== w.boss && !m.minion);
      spawnBoss(w, Math.max(1, players.length));
    }
    if (w.boss && w.boss.st !== 'down' && players.length > w.boss.scaleN) { // 사람이 늘면 보스 체력도 늘어남
      const d = MON[w.boss.type], add = Math.round(d.hp * HPK * 0.85 * (players.length - w.boss.scaleN));
      w.boss.hp += add; w.boss.max += add; w.boss.scaleN = players.length;
    }
    // 모두 기절하면 보스가 힘을 조금 되찾고 제자리로
    const b0 = w.boss;
    if (b0 && b0.st !== 'wait' && b0.st !== 'down') {
      if (players.length && !alive.length) {
        if (!w.wiped) {
          w.wiped = true;
          b0.hp = Math.min(b0.max, b0.hp + Math.round(b0.max * 0.2));
          Object.assign(b0, { st: 'wait', x: w.map.w * 0.72, y: 430, z: MON[b0.type].z, cd: 1.5 });
          for (const q of w.mons) if (q.minion && q.st !== 'dead') q.st = 'dead';
          w.ev.push({ e: 'b', k: 'reset', id: b0.id });
        }
      } else w.wiped = false;
    }
    stepEvents(w, dt, alive);
    for (const m of w.mons) {
      if (m.st === 'dead') {
        if (!m.minion && m.respawnAt && w.t >= m.respawnAt) {
          const nx = clamp(m.hx + rnd(-120, 120), 60, w.map.w - 60);
          if (alive.some((q) => Math.abs(q.x - nx) < 280)) { m.respawnAt = w.t + rnd(4, 7); continue; } // 친구 바로 앞에서는 안 생김
          Object.assign(m, { st: 'spawn', tm: 0.6, hp: m.max, x: nx, y: rnd(FT + 14, FB - 6), hitBy: {}, cd: rnd(1.5, 3), respawnAt: 0, stun: 0 });
          m.z = MON[m.type].z;
        }
        continue;
      }
      if (m.st === 'down') continue;
      if (m.st === 'spawn') { m.tm -= dt; if (m.tm <= 0) { m.st = 'idle'; m.tm = rnd(0.3, 1); } continue; }
      if (m.stun > 0) { m.stun -= dt; continue; }
      m.cd -= dt;
      const d = MON[m.type];
      if (d.ai === 'boss') { stepBoss(w, m, dt, alive); continue; }
      const p = nearest(w, m, alive, 460, 200);
      switch (d.ai) {
        case 'float': {
          m.z = d.z + Math.sin(w.t * 2 + m.ph) * 8;
          if (p) {
            moveTo(m, p.x - Math.sign(p.x - m.x) * 24, p.y, d.spd, dt);
            if (m.cd <= 0 && Math.abs(p.x - m.x) < 230 && Math.abs(p.y - m.y) < 110) {
              HZ(w, { k: 'circle', x: p.x, y: p.y, r: 42, warn: 0.8, dmg: d.dmg, fx: 'rain' });
              m.cd = rnd(2.1, 2.9);
            }
          } else wander(w, m, dt, 36);
          break;
        }
        case 'thunder': {
          m.z = d.z + Math.sin(w.t * 1.6 + m.ph) * 10;
          if (p) {
            moveTo(m, p.x - Math.sign(p.x - m.x) * 60, p.y, d.spd, dt);
            if (m.cd <= 0) {
              HZ(w, { k: 'circle', x: p.x, y: p.y, r: 48, warn: 0.95, dmg: d.dmg, fx: 'bolt' });
              HZ(w, { k: 'circle', x: clamp(p.x + rnd(-130, 130), 40, w.map.w - 40), y: clamp(p.y + rnd(-60, 60), FT, FB), r: 48, warn: 1.15, dmg: d.dmg, fx: 'bolt' });
              m.cd = rnd(2.2, 2.9);
            }
          } else wander(w, m, dt, 30);
          break;
        }
        case 'charge': {
          if (m.st === 'aim') {
            m.tm -= dt;
            if (m.tm <= 0) { m.st = 'charge'; m.tm = 0.95; }
          } else if (m.st === 'charge') {
            m.tm -= dt; m.x += m.f * 340 * dt; m.y += (m.ty - m.y) * Math.min(1, dt * 3);
            if (m.tm <= 0 || m.x < 40 || m.x > w.map.w - 40) { m.x = clamp(m.x, 40, w.map.w - 40); m.st = 'rest'; m.tm = 1.1; }
          } else if (m.st === 'rest') {
            m.tm -= dt; if (m.tm <= 0) { m.st = 'idle'; m.cd = rnd(1.6, 2.5); }
          } else if (p) {
            moveTo(m, p.x - Math.sign(p.x - m.x) * 140, p.y, d.spd, dt);
            if (m.cd <= 0 && Math.abs(p.y - m.y) < 70 && Math.abs(p.x - m.x) < 400) { m.st = 'aim'; m.tm = 0.75; m.f = p.x > m.x ? 1 : -1; m.ty = p.y; }
          } else wander(w, m, dt, 30);
          break;
        }
        case 'shooter': {
          if (p) {
            m.f = p.x > m.x ? 1 : -1;
            if (m.cd <= 0 && Math.abs(p.x - m.x) < 430) { aimShot(w, m, p, d.shot, 165, d.dmg, 0.25, 3, 40); m.st = 'cast'; m.tm = 0.4; m.cd = rnd(2.0, 2.7); }
          }
          if (m.st === 'cast') { m.tm -= dt; if (m.tm <= 0) m.st = 'idle'; }
          break;
        }
        case 'ghost': {
          m.z = d.z + Math.sin(w.t * 2.6 + m.ph) * 10;
          if (m.st === 'fade') { m.tm -= dt; if (m.tm <= 0) { m.st = 'dash'; m.tm = 0.55; } }
          else if (m.st === 'dash') {
            m.tm -= dt; m.x += m.f * 400 * dt; m.y += (m.ty - m.y) * Math.min(1, dt * 4);
            if (m.tm <= 0) { m.st = 'rest'; m.tm = 1.2; }
          } else if (m.st === 'rest') { m.tm -= dt; if (m.tm <= 0) m.st = 'idle'; }
          else if (p) {
            const dx = p.x - m.x;
            if (Math.abs(dx) > 200) moveTo(m, p.x - Math.sign(dx) * 180, p.y, d.spd, dt);
            if (m.cd <= 0 && Math.abs(dx) < 260) { m.st = 'fade'; m.tm = 0.65; m.f = dx > 0 ? 1 : -1; m.ty = p.y; m.cd = rnd(2.4, 3.3); }
          } else wander(w, m, dt, 30);
          m.x = clamp(m.x, 40, w.map.w - 40);
          break;
        }
        case 'zigzag': {
          if (p) {
            const zz = Math.sin(w.t * 3 + m.ph) * 60;
            moveTo(m, p.x - Math.sign(p.x - m.x) * 150, clamp(p.y + zz, FT, FB), d.spd, dt);
            m.f = p.x > m.x ? 1 : -1;
            if (m.cd <= 0 && Math.abs(p.x - m.x) < 440 && Math.abs(p.y - m.y) < 100) { aimShot(w, m, p, d.shot, 240, d.dmg, 0.18, 2, 40); m.cd = rnd(1.9, 2.6); }
          } else wander(w, m, dt, 34);
          break;
        }
        case 'swarm': {
          if (p) moveTo(m, p.x + Math.sin(w.t * 2 + m.ph) * 30, p.y + Math.cos(w.t * 2.4 + m.ph) * 20, d.spd, dt);
          else wander(w, m, dt, 40);
          break;
        }
        case 'roller': {
          if (m.st === 'curl') { m.tm -= dt; if (m.tm <= 0) { m.st = 'roll'; m.tm = 1.25; } }
          else if (m.st === 'roll') {
            m.tm -= dt; m.x += m.f * 430 * dt;
            if (m.tm <= 0 || m.x < 40 || m.x > w.map.w - 40) { m.x = clamp(m.x, 40, w.map.w - 40); m.st = 'rest'; m.tm = 1.3; }
          } else if (m.st === 'rest') { m.tm -= dt; if (m.tm <= 0) m.st = 'idle'; }
          else if (p) {
            moveTo(m, m.x, p.y, d.spd * 1.4, dt);
            if (m.cd <= 0 && Math.abs(p.y - m.y) < 46 && Math.abs(p.x - m.x) < 480) { m.st = 'curl'; m.tm = 0.65; m.f = p.x > m.x ? 1 : -1; m.cd = rnd(2.2, 3.1); }
          } else wander(w, m, dt, 26);
          break;
        }
        case 'bat': {
          if (m.st === 'swoop') {
            m.tm -= dt;
            const k = 1 - Math.max(0, m.tm) / 0.75;
            m.x += (m.tx - m.x) * Math.min(1, dt * 5); m.y += (m.ty - m.y) * Math.min(1, dt * 5);
            m.z = 120 - Math.sin(Math.min(1, k) * Math.PI) * 100;
            if (m.tm <= -0.35) { m.st = 'idle'; m.z = 120; }
          } else {
            m.z = 120 + Math.sin(w.t * 3 + m.ph) * 12;
            if (p) {
              moveTo(m, p.x - Math.sign(p.x - m.x) * 90, p.y - 20, d.spd, dt);
              if (m.cd <= 0) {
                m.st = 'swoop'; m.tm = 0.75; m.tx = p.x; m.ty = p.y; m.cd = rnd(2.1, 3.0);
                HZ(w, { k: 'circle', x: p.x, y: p.y, r: 40, warn: 0.75, dmg: d.dmg, fx: 'swoop' });
              }
            } else wander(w, m, dt, 50);
          }
          break;
        }
        case 'turret': {
          if (p) {
            m.f = p.x > m.x ? 1 : -1;
            if (m.cd <= 0 && Math.abs(p.x - m.x) < 460) { aimShot(w, m, p, d.shot, 225, d.dmg, 0.3, 3, 36); m.st = 'cast'; m.tm = 0.45; m.cd = rnd(2.1, 2.8); }
          }
          if (m.st === 'cast') { m.tm -= dt; if (m.tm <= 0) m.st = 'idle'; }
          break;
        }
        case 'flee': {
          m.z = d.z + Math.abs(Math.sin(w.t * 7 + m.ph)) * 22;
          m.life -= dt;
          if (m.life <= 0) { m.st = 'dead'; m.respawnAt = 0; w.ev.push({ e: 'g', k: 'bye', id: m.id, x: m.x, y: m.y }); break; }
          const q = nearest(w, m, alive, 360, 220);
          if (q) {
            const away = m.x >= q.x ? 1 : -1;
            let tx = m.x + away * 180;
            if (tx < 80 || tx > w.map.w - 80) tx = q.x - away * 260; // 몰리면 옆으로 빠져나감
            moveTo(m, clamp(tx, 70, w.map.w - 70), clamp(m.y + (m.y > q.y ? 70 : -70), FT, FB), d.spd, dt);
          } else wander(w, m, dt, 70);
          break;
        }
      }
      m.y = clamp(m.y, FT, FB);
    }
    // 소환된 졸개 정리
    if (w.mons.length > 70) w.mons = w.mons.filter((m) => !(m.minion && m.st === 'dead'));
  }

  // ---------------- 보스 ----------------
  const SAY = {
    snoreKing: ['드르렁~ 쿨~ 누가 내 낮잠을 깨워!', '꿀잠 장판을 깔아 주마! 드르렁!', '으아암… 졸려도 안 진다!'],
    eraserBoss: ['싹싹 지워 주마!', '눈금도, 숫자도 다 지워 버릴 거야!', '지우개 가루 폭탄이다!'],
    devil: ['흥! 사랑 따위 필요 없어!', '내 삼지창 맛 좀 볼래?', '다들 나만 빼고 즐거웠잖아!', '그만해… 마음이 이상해져…'],
  };
  function bossSay(w, b, i) { w.ev.push({ e: 'b', k: 'say', id: b.id, text: SAY[b.type][i] }); }
  const BD = 0.9; // 보스 공격 피해 배율 (v3.1: 10% 약하게)
  function stepBoss(w, b, dt, alive) {
    const d = MON[b.type];
    if (b.st === 'wait') {
      const p = nearest(w, b, alive, 430, 300);
      if (p || b.hp < b.max) { b.st = 'idle'; b.cd = 2.0; bossSay(w, b, 0); w.ev.push({ e: 'b', k: 'start', id: b.id, x: b.x, y: b.y }); }
      return;
    }
    const ratio = b.hp / b.max;
    const ph = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (ph !== b.phase) {
      b.phase = ph; b.st = 'hurt'; b.tm = 2.8; b.cd = 1.4;
      w.ev.push({ e: 'b', k: 'phase', id: b.id, phase: ph, x: b.x, y: b.y });
      bossSay(w, b, Math.min(SAY[b.type].length - 1, ph));
      for (const q of w.mons) if (q.minion && !q.wave && q.st !== 'dead' && q.type !== 'gold') q.stun = 1.5;
      return;
    }
    const fast = ph === 1 ? 1 : ph === 2 ? 1.2 : 1.42;
    const p = nearest(w, b, alive, 3000, 400);
    if (!p) { b.st = 'idle'; return; }
    b.tm -= dt;
    if (b.st === 'hurt') { if (b.tm <= 0) b.st = 'idle'; return; } // 빈틈!
    if (b.st === 'charge') { // 돌진
      b.x += b.f * (b.type === 'eraserBoss' ? 540 : 500) * dt;
      if (b.x < 90 || b.x > w.map.w - 90) { b.x = clamp(b.x, 90, w.map.w - 90); b.st = 'rest'; b.tm = 1.3; }
      return;
    }
    if (b.st === 'aim') { if (b.tm <= 0) { b.st = 'charge'; } else b.y += (b.ty - b.y) * Math.min(1, dt * 5); return; }
    if (b.st === 'cast' || b.st === 'rest') { if (b.tm <= 0) { b.st = 'idle'; } return; }
    // 평소: 천천히 다가가기
    const want = b.type === 'snoreKing' ? 260 : 230;
    if (Math.abs(p.x - b.x) > want) moveTo(b, p.x - Math.sign(p.x - b.x) * want, p.y, d.spd * fast, dt);
    else b.f = p.x > b.x ? 1 : -1;
    if (b.type === 'devil') b.z = d.z + Math.sin(w.t * 2.2) * 10;
    if (b.cd > 0) return;
    const pick = (arr) => arr[(b.seq++) % arr.length];
    const near = alive.filter((q) => Math.abs(q.x - b.x) < 900);
    const minions = w.mons.filter((m) => m.minion && !m.wave && m.st !== 'dead').length;
    let act;
    if (b.type === 'snoreKing') act = pick(ph === 1 ? ['bubbles', 'slam', 'naps', 'bubbles'] : ph === 2 ? ['bubbles', 'summon', 'slam', 'naps', 'bubbles', 'slam'] : ['double', 'bubbles', 'naps', 'summon', 'double', 'slam']);
    else if (b.type === 'eraserBoss') act = pick(ph === 1 ? ['rain', 'roll', 'beam', 'rain'] : ph === 2 ? ['roll', 'crumbs', 'beam', 'rain', 'roll', 'beam'] : ['cross', 'roll', 'rain', 'crumbs', 'cross', 'beam']);
    else act = pick(ph === 1 ? ['fork', 'dash', 'circles', 'fork'] : ph === 2 ? ['fork', 'summon', 'ring', 'dash', 'forkline', 'circles'] : ['storm', 'dash', 'forkline', 'summon', 'storm', 'ring']);
    if ((act === 'summon' || act === 'crumbs') && minions >= 4) act = b.type === 'eraserBoss' ? 'rain' : b.type === 'devil' ? 'circles' : 'naps';
    b.cd = (b.type === 'devil' ? 1.65 : 1.92) / fast;
    switch (act) {
      case 'bubbles': aimShot(w, b, p, 'bubble', 175, Math.round(12 * BD), 0.24, ph === 1 ? 5 : 7, 70); b.st = 'cast'; b.tm = 0.6; break;
      case 'slam':
        b.st = 'cast'; b.tm = 1.0;
        HZ(w, { k: 'ring', x: b.x, y: b.y, spd: 290, maxR: 900, warn: 0.85, dmg: Math.round(18 * BD) });
        break;
      case 'double':
        b.st = 'cast'; b.tm = 1.4;
        HZ(w, { k: 'ring', x: b.x, y: b.y, spd: 300, maxR: 900, warn: 0.8, dmg: Math.round(18 * BD) });
        HZ(w, { k: 'ring', x: b.x, y: b.y, spd: 300, maxR: 900, warn: 1.45, dmg: Math.round(18 * BD) });
        break;
      case 'naps':
        for (const q of near.slice(0, 4)) HZ(w, { k: 'circle', x: q.x, y: q.y, r: 56, warn: 0.95, dmg: Math.round(15 * BD), fx: 'nap' });
        for (let i = 0; i < 2; i++) HZ(w, { k: 'circle', x: clamp(p.x + rnd(-170, 170), 40, w.map.w - 40), y: rnd(FT + 10, FB - 10), r: 56, warn: 1.1 + i * 0.25, dmg: Math.round(15 * BD), fx: 'nap' });
        b.st = 'cast'; b.tm = 0.5; break;
      case 'summon': {
        const t = b.type === 'snoreKing' ? 'snore' : b.type === 'devil' ? (Math.random() < 0.5 ? 'bat' : 'cloud') : 'crumb';
        for (const s of [-1, 1]) { const m = addMon(w, t, clamp(b.x + s * 140, 60, w.map.w - 60), clamp(b.y + s * 50, FT, FB), { minion: true, st: 'spawn', tm: 0.5 }); m.hp = m.max = Math.round(MON[t].hp * HPK * 0.8); }
        b.st = 'cast'; b.tm = 0.7; break;
      }
      case 'crumbs':
        for (let i = 0; i < 4; i++) addMon(w, 'crumb', clamp(b.x + rnd(-160, 160), 60, w.map.w - 60), rnd(FT + 10, FB - 10), { minion: true, st: 'spawn', tm: 0.4 + i * 0.1 });
        b.st = 'cast'; b.tm = 0.7; break;
      case 'rain':
        for (let i = 0; i < (ph === 1 ? 5 : 8); i++) {
          const q = near[i % Math.max(1, near.length)] || p;
          HZ(w, { k: 'circle', x: clamp(q.x + (i === 0 ? 0 : rnd(-150, 150)), 40, w.map.w - 40), y: clamp(q.y + (i === 0 ? 0 : rnd(-70, 70)), FT, FB), r: 46, warn: 0.85 + i * 0.12, dmg: Math.round(14 * BD), fx: 'crumb' });
        }
        b.st = 'cast'; b.tm = 0.6; break;
      case 'beam':
        HZ(w, { k: 'lane', y: p.y, h: 50, warn: 1.1, dmg: Math.round(20 * BD), fx: 'erase' });
        b.st = 'cast'; b.tm = 1.2; break;
      case 'cross': {
        const y2 = p.y > (FT + FB) / 2 ? p.y - 95 : p.y + 95;
        HZ(w, { k: 'lane', y: p.y, h: 50, warn: 1.15, dmg: Math.round(20 * BD), fx: 'erase' });
        HZ(w, { k: 'lane', y: clamp(y2, FT + 10, FB - 10), h: 50, warn: 1.15, dmg: Math.round(20 * BD), fx: 'erase' });
        b.st = 'cast'; b.tm = 1.3; break;
      }
      case 'roll': case 'dash':
        b.st = 'aim'; b.tm = 0.95; b.ty = p.y; b.f = p.x > b.x ? 1 : -1;
        HZ(w, { k: 'lane', y: p.y, h: 52, warn: 0.95, dmg: 0, fx: 'warn', follow: b.id });
        break;
      case 'fork':
        aimShot(w, b, p, 'fork', 270, Math.round(16 * BD), 0.22, ph === 1 ? 3 : 5, 90); b.st = 'cast'; b.tm = 0.5; break;
      case 'forkline': {
        const dir = p.x > b.x ? 1 : -1;
        for (let i = 0; i < 7; i++) HZ(w, { k: 'circle', x: clamp(b.x + dir * (90 + i * 95), 40, w.map.w - 40), y: clamp(p.y + rnd(-14, 14), FT, FB), r: 50, warn: 0.75 + i * 0.13, dmg: Math.round(16 * BD), fx: 'grump' });
        b.st = 'cast'; b.tm = 0.8; break;
      }
      case 'circles':
        for (const q of near.slice(0, 5)) HZ(w, { k: 'circle', x: q.x, y: q.y, r: 52, warn: 0.9, dmg: Math.round(16 * BD), fx: 'grump' });
        b.st = 'cast'; b.tm = 0.5; break;
      case 'ring':
        HZ(w, { k: 'ring', x: b.x, y: b.y, spd: 310, maxR: 900, warn: 0.8, dmg: Math.round(18 * BD) });
        b.st = 'cast'; b.tm = 0.9; break;
      case 'storm':
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + w.t;
          P(w, { k: 'grump', x: b.x, y: b.y, z: b.z + 90, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190 * 0.55, dmg: Math.round(12 * BD), life: 3.5, r: 16 });
        }
        for (let i = 0; i < 3; i++) HZ(w, { k: 'circle', x: clamp(p.x + rnd(-200, 200), 40, w.map.w - 40), y: rnd(FT + 10, FB - 10), r: 50, warn: 1.1, dmg: Math.round(14 * BD), fx: 'grump' });
        b.st = 'cast'; b.tm = 0.8; break;
    }
  }

  // ---------------- 맞히기 ----------------
  // kb: 밀려나는 거리(방향 포함)
  function hit(w, id, dmg, pid, kb) {
    const m = w.mons.find((q) => q.id === id);
    if (!m || m.st === 'dead' || m.st === 'down') return null;
    const boss = MON[m.type].ai === 'boss';
    if (m.st === 'wait') { m.st = 'idle'; m.cd = 2; w.ev.push({ e: 'b', k: 'start', id: m.id, x: m.x, y: m.y }); }
    if (boss && m.st === 'hurt') dmg = Math.round(dmg * 1.5);
    m.hp -= dmg; m.hitBy[pid] = w.t;
    if (!boss && kb) {
      const k = clamp(+kb || 0, -70, 70);
      if (MON[m.type].spd > 0) m.x = clamp(m.x + k, 40, w.map.w - 40);
      m.stun = Math.max(m.stun || 0, Math.min(0.32, Math.abs(k) / 160));
      if (m.st === 'aim' || m.st === 'fade' || m.st === 'curl') { m.st = 'idle'; m.cd = Math.max(m.cd, 0.8); }
    }
    if (m.hp > 0) return { m, killed: false };
    m.hp = 0;
    const by = Object.keys(m.hitBy).filter((k) => w.t - m.hitBy[k] < 40);
    if (boss) {
      m.st = 'down'; w.bossDownAt = w.t;
      for (const q of w.mons) if (q.minion && q.st !== 'dead' && q.type !== 'gold') { q.st = 'dead'; w.ev.push({ e: 'd', id: q.id, type: q.type, x: q.x, y: q.y, by: [], minion: true }); }
      w.ev.push({ e: 'b', k: 'down', id: m.id, by, x: m.x, y: m.y });
    } else {
      m.st = 'dead'; m.respawnAt = m.minion ? 0 : w.t + rnd(40, 55) / (1 + 0.2 * ((w.nP || 1) - 1));
      w.ev.push({ e: 'd', id: m.id, type: m.type, x: m.x, y: m.y, by, minion: m.minion, wave: !!m.wave });
    }
    return { m, killed: true };
  }

  // 보내기용 짧은 모양
  function snap(w) {
    const out = [];
    for (const m of w.mons) {
      if (m.st === 'dead' && m.minion) continue;
      out.push([m.id, TYPES.indexOf(m.type), Math.round(m.x), Math.round(m.y), Math.round(m.z), Math.max(0, Math.round(m.hp)), m.max, STATES.indexOf(m.st), m.f, m.phase || 0, m.stun > 0 ? 1 : 0, m.wave ? 1 : 0]);
    }
    return out;
  }
  function unsnap(a) {
    return { id: a[0], type: TYPES[a[1]], x: a[2], y: a[3], z: a[4], hp: a[5], max: a[6], st: STATES[a[7]], f: a[8], phase: a[9], stun: a[10] ? 0.2 : 0, wave: !!a[11] };
  }

  return { FT, FB, MAPS, MON, TYPES, STATES, createWorld, step, hit, snap, unsnap, setHpK };
});
