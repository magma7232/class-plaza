'use strict';
// 작은 도우미 함수 모음
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  sign: (v) => (v < 0 ? -1 : 1),
  // 시드가 있는 난수 (배경이 매번 똑같이 그려지도록)
  rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  },
  easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
  mix(c1, c2, t) { return [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)]; },
  // 학년(1~6): 광장 back.js의 PLAZA_GRADE() → 주소 ?grade= → 4. back.js는 게임 파일보다 늦게 붙으니 쓸 때마다 묻는다
  grade() {
    try { if (window.PLAZA_GRADE) { const g = +window.PLAZA_GRADE(); if (g >= 1 && g <= 6) return g; } } catch (e) { /* 아래로 */ }
    try { const g = parseInt(new URLSearchParams(location.search).get('grade'), 10); if (g >= 1 && g <= 6) return g; } catch (e) { /* 아래로 */ }
    return 4;
  },
  // 학년별 싸움 난이도: 적 체력(hp)·받는 피해(dmg). 4학년 = 예전 그대로
  GRADE_K: { 1: { hp: 0.6, dmg: 0.55 }, 2: { hp: 0.75, dmg: 0.7 }, 3: { hp: 0.9, dmg: 0.85 }, 4: { hp: 1, dmg: 1 }, 5: { hp: 1.2, dmg: 1.15 }, 6: { hp: 1.38, dmg: 1.3 } },
  // 난이도 4단계(2026-11-26, 광장 공통 back.js PLAZA_DIFF: 1 하 · 2 중 · 3 상 = 예전 그대로 · 4 최상). 학년 배율에 곱함
  diff() {
    try { if (window.PLAZA_DIFF) { const d = +window.PLAZA_DIFF('sarang'); if (d >= 1 && d <= 4) return d; } } catch (e) { /* 아래로 */ }
    try { const d = parseInt(new URLSearchParams(location.search).get('diff'), 10); if (d >= 1 && d <= 4) return d; } catch (e) { /* 아래로 */ }
    return 3;
  },
  DIFF_K: { 1: { hp: 0.6, dmg: 0.5 }, 2: { hp: 0.8, dmg: 0.75 }, 3: { hp: 1, dmg: 1 }, 4: { hp: 1.3, dmg: 1.3 } },
  hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; },
};
