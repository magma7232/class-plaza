'use strict';
// 효과음 + 배경음악 (Web Audio로 직접 합성 — 외부 파일 없음)
const Sound = (() => {
  let ac = null, master = null, sfxG = null, musG = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('sarang_muted') === '1'; } catch (e) { /* 저장소 없음 */ }
  if (window.BGM) BGM.mute(muted);   // 소리를 꺼 두었으면 배경 음악도 조용히
  let song = null, songName = '', step = 0, nextTime = 0, timer = null;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ac) { resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.gain.value = 0.55; sfxG.connect(master);
    musG = ac.createGain(); musG.gain.value = 0.2; musG.connect(master);
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }

  function tone(f, o = {}) {
    if (!ac) return;
    const t = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    const dur = o.dur || 0.1, a = o.a || 0.006, vol = o.vol || 0.2;
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    osc.connect(g); g.connect(o.dest || sfxG);
    osc.start(t); osc.stop(t + a + dur + 0.05);
  }
  function seq(notes, gap, o = {}) { notes.forEach((n, i) => { if (n) tone(midi(n), Object.assign({}, o, { delay: (o.delay || 0) + i * gap })); }); }
  function noise(t, dur, vol, hp, dest) {
    if (!ac || !noiseBuf) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 6000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG); s.start(t); s.stop(t + dur + 0.02);
  }

  let lastWarn = 0;
  const sfx = {
    jump() { tone(330, { to: 700, type: 'triangle', dur: 0.13, vol: 0.22 }); },
    shoot() { tone(900, { to: 1400, type: 'sine', dur: 0.07, vol: 0.16 }); tone(1800, { type: 'sine', dur: 0.05, vol: 0.05, delay: 0.02 }); },
    big() { tone(380, { to: 1300, type: 'triangle', dur: 0.22, vol: 0.24 }); seq([88, 91, 96], 0.04, { type: 'sine', dur: 0.08, vol: 0.08, delay: 0.05 }); },
    charge() { seq([84, 91], 0.05, { type: 'sine', dur: 0.08, vol: 0.12 }); },
    hit() { tone(620, { to: 330, type: 'square', dur: 0.05, vol: 0.06 }); },
    purify() { seq([79, 83, 86, 91], 0.06, { type: 'triangle', dur: 0.12, vol: 0.15 }); },
    pickup() { seq([84, 88, 91], 0.07, { type: 'sine', dur: 0.12, vol: 0.2 }); },
    drop() { tone(1400, { to: 900, type: 'sine', dur: 0.08, vol: 0.12 }); },
    hurt() { tone(320, { to: 140, type: 'sawtooth', dur: 0.2, vol: 0.1 }); },
    ouch() { tone(520, { to: 210, type: 'square', dur: 0.14, vol: 0.08 }); },
    faint() { seq([72, 67, 64, 60], 0.13, { type: 'triangle', dur: 0.2, vol: 0.16 }); },
    quest() { seq([72, 76, 79, 84], 0.11, { type: 'triangle', dur: 0.18, vol: 0.2 }); },
    blip() { tone(700, { type: 'square', dur: 0.015, vol: 0.02 }); },
    tick() { tone(1500, { type: 'triangle', dur: 0.03, vol: 0.06 }); },
    portal() { tone(180, { to: 980, type: 'sine', dur: 0.55, vol: 0.2 }); tone(360, { to: 1960, type: 'triangle', dur: 0.5, vol: 0.06, delay: 0.05 }); },
    wrong() { tone(230, { type: 'square', dur: 0.11, vol: 0.08 }); tone(180, { type: 'square', dur: 0.15, vol: 0.08, delay: 0.13 }); },
    pop() { tone(500, { to: 1600, type: 'sine', dur: 0.09, vol: 0.25 }); },
    click() { tone(1200, { type: 'triangle', dur: 0.03, vol: 0.08 }); },
    heal() { seq([76, 81, 88], 0.06, { type: 'sine', dur: 0.12, vol: 0.18 }); },
    boing() { tone(220, { to: 520, type: 'triangle', dur: 0.18, vol: 0.18 }); },
    unlock() { seq([67, 79, 84, 91], 0.08, { type: 'triangle', dur: 0.16, vol: 0.18 }); },
    hat() { seq([84, 88, 91, 96], 0.06, { type: 'sine', dur: 0.12, vol: 0.18 }); },
    warn() { if (!ac || ac.currentTime - lastWarn < 0.25) return; lastWarn = ac.currentTime; tone(880, { type: 'square', dur: 0.04, vol: 0.03 }); },
    slam() { tone(140, { to: 50, type: 'sine', dur: 0.35, vol: 0.32 }); if (ac) noise(ac.currentTime, 0.25, 0.12, 800); },
    zap() { if (ac) noise(ac.currentTime, 0.18, 0.16, 2500); tone(1200, { to: 300, type: 'sawtooth', dur: 0.12, vol: 0.05 }); },
    yay() { seq([72, 76, 79, 84, 88], 0.07, { type: 'triangle', dur: 0.14, vol: 0.18 }); },
    wake() { seq([72, 76, 79, 84, 0, 79, 84, 88, 91], 0.16, { type: 'triangle', dur: 0.22, vol: 0.18 }); },
    fanfare() { seq([72, 72, 72, 77, 0, 76, 77, 0, 84], 0.13, { type: 'square', dur: 0.16, vol: 0.07 }); seq([60, 0, 0, 65, 0, 64, 65, 0, 72], 0.13, { type: 'triangle', dur: 0.2, vol: 0.12 }); },
    bossdown() { seq([67, 71, 74, 79, 0, 74, 79, 83, 86], 0.1, { type: 'square', dur: 0.14, vol: 0.06 }); seq([55, 0, 59, 0, 62, 0, 67], 0.14, { type: 'triangle', dur: 0.2, vol: 0.12 }); },
    transform() { tone(200, { to: 1600, type: 'sine', dur: 2.2, vol: 0.14 }); tone(300, { to: 2400, type: 'triangle', dur: 2.2, vol: 0.05, delay: 0.1 }); },
    whoosh() { if (!ac) return; const t = ac.currentTime; const s0 = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s0.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.16); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); s0.connect(f); f.connect(g); g.connect(sfxG); s0.start(t); s0.stop(t + 0.22); },
    special() { seq([60, 64, 67, 72, 76, 79, 84], 0.05, { type: 'triangle', dur: 0.2, vol: 0.14 }); tone(90, { to: 40, type: 'sine', dur: 0.6, vol: 0.4, delay: 0.42 }); if (ac) noise(ac.currentTime + 0.42, 0.5, 0.3, 300); seq([84, 88, 91, 96], 0.06, { type: 'sine', dur: 0.3, vol: 0.12, delay: 0.5 }); },
    crack() { if (ac) noise(ac.currentTime, 0.12, 0.22, 1800); tone(180, { to: 90, type: 'square', dur: 0.08, vol: 0.06 }); },
    break() { if (ac) { noise(ac.currentTime, 0.28, 0.32, 900); noise(ac.currentTime + 0.05, 0.2, 0.18, 3000); } tone(140, { to: 60, type: 'triangle', dur: 0.25, vol: 0.2 }); seq([79, 84], 0.06, { type: 'sine', dur: 0.1, vol: 0.1, delay: 0.12 }); },
    bounce() { tone(260, { to: 900, type: 'triangle', dur: 0.22, vol: 0.2 }); tone(520, { to: 1500, type: 'sine', dur: 0.18, vol: 0.06, delay: 0.03 }); },
    combo(n) { const k = Math.min(16, n || 0); tone(midi(76 + k), { type: 'sine', dur: 0.12, vol: 0.12 }); tone(midi(83 + k), { type: 'triangle', dur: 0.1, vol: 0.06, delay: 0.04 }); },
    twinkle(n) { const k = Math.min(14, n || 0); tone(midi(84 + k), { type: 'sine', dur: 0.14, vol: 0.13 }); tone(midi(91 + k), { type: 'sine', dur: 0.1, vol: 0.05, delay: 0.03 }); },
    roar() { if (!ac) return; const t = ac.currentTime; const o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.1); lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(sfxG); o.start(t); lfo.start(t); o.stop(t + 1.25); lfo.stop(t + 1.25); noise(t, 0.6, 0.1, 400); },
    stamp() { tone(120, { to: 50, type: 'sine', dur: 0.25, vol: 0.4 }); if (ac) noise(ac.currentTime, 0.12, 0.2, 1200); seq([84, 88, 91, 96], 0.07, { type: 'triangle', dur: 0.2, vol: 0.13, delay: 0.12 }); },
    alarm() { seq([81, 76, 81, 76], 0.14, { type: 'square', dur: 0.12, vol: 0.06 }); },
    gold() { seq([88, 91, 95, 100, 103], 0.05, { type: 'sine', dur: 0.12, vol: 0.12 }); },
    clear() { seq([72, 76, 79, 84, 0, 79, 84, 88, 91, 96], 0.09, { type: 'square', dur: 0.14, vol: 0.06 }); seq([48, 0, 55, 0, 60, 0, 64, 0, 67, 72], 0.09, { type: 'triangle', dur: 0.2, vol: 0.14 }); },
    ding() { tone(1568, { type: 'sine', dur: 0.3, vol: 0.12 }); tone(2093, { type: 'sine', dur: 0.25, vol: 0.06, delay: 0.05 }); },
  };

  // 배경음악: 8분음표 단위 (0 = 쉼표), hat: 하이햇
  const SONGS = {
    town: { drum: 'soft', bpm: 108, mt: 'triangle',
      mel: [72,0,76,0, 79,0,76,0, 77,0,74,0, 71,0,0,0, 72,0,76,0, 79,0,84,0, 83,0,79,0, 76,0,0,0,
            77,0,81,0, 84,0,81,0, 79,0,76,0, 72,0,0,0, 74,0,77,0, 76,0,74,0, 72,0,0,0, 0,0,0,0],
      bass: [48,0,55,0, 52,0,55,0, 43,0,50,0, 47,0,50,0, 48,0,55,0, 52,0,55,0, 43,0,50,0, 47,0,50,0,
             53,0,57,0, 60,0,57,0, 48,0,55,0, 52,0,55,0, 43,0,50,0, 47,0,50,0, 48,0,55,0, 48,0,0,0] },
    cotton: { bpm: 76, mt: 'sine', mv: 0.15,
      mel: [77,0,0,0, 81,0,79,0, 77,0,0,0, 72,0,0,0, 74,0,0,0, 77,0,76,0, 74,0,0,0, 0,0,0,0,
            70,0,0,0, 74,0,77,0, 81,0,0,0, 79,0,77,0, 76,0,0,0, 79,0,76,0, 77,0,0,0, 0,0,0,0],
      bass: [53,0,60,0, 57,0,60,0, 53,0,60,0, 57,0,60,0, 50,0,57,0, 53,0,57,0, 50,0,57,0, 53,0,57,0,
             46,0,53,0, 50,0,53,0, 53,0,60,0, 57,0,60,0, 48,0,55,0, 52,0,55,0, 53,0,60,0, 53,0,0,0] },
    field: { drum: 'rock', bpm: 126, mt: 'square', hat: true,
      mel: [79,0,79,74, 0,74,79,0, 81,0,83,0, 81,0,79,0, 76,0,76,72, 0,72,76,0, 78,0,79,0, 81,0,0,0,
            83,0,83,79, 0,79,83,0, 84,0,83,0, 81,0,79,0, 76,0,78,0, 79,0,81,0, 79,0,0,0, 0,0,0,0],
      bass: [43,0,50,0, 43,0,50,0, 45,0,52,0, 50,0,54,0, 48,0,55,0, 48,0,55,0, 50,0,57,0, 50,0,54,0,
             43,0,50,0, 47,0,50,0, 48,0,55,0, 45,0,52,0, 48,0,52,0, 50,0,54,0, 43,0,50,0, 43,0,0,0] },
    forest: { drum: 'soft', bpm: 84, mt: 'triangle',
      mel: [76,0,79,0, 81,0,79,0, 76,0,74,0, 72,0,0,0, 74,0,76,0, 79,0,76,0, 74,0,72,0, 69,0,0,0,
            76,0,79,0, 84,0,81,0, 79,0,76,0, 74,0,0,0, 72,0,74,0, 76,0,74,0, 72,0,0,0, 0,0,0,0],
      bass: [48,0,0,0, 55,0,0,0, 53,0,0,0, 48,0,0,0, 50,0,0,0, 55,0,0,0, 53,0,0,0, 45,0,0,0,
             48,0,0,0, 57,0,0,0, 53,0,0,0, 55,0,0,0, 53,0,0,0, 55,0,0,0, 48,0,0,0, 48,0,0,0] },
    town2: { drum: 'march', bpm: 112, mt: 'square',
      mel: [67,0,72,0, 72,74,76,0, 74,0,72,0, 67,0,0,0, 69,0,74,0, 74,76,77,0, 76,0,74,0, 72,0,0,0,
            72,0,76,0, 79,0,76,0, 77,0,74,0, 76,0,72,0, 74,0,71,0, 72,0,74,0, 72,0,0,0, 0,0,0,0],
      bass: [48,0,55,0, 48,0,55,0, 53,0,60,0, 48,0,55,0, 50,0,57,0, 55,0,62,0, 55,0,59,0, 48,0,55,0,
             48,0,55,0, 52,0,59,0, 53,0,57,0, 48,0,55,0, 55,0,59,0, 48,0,55,0, 48,0,55,0, 48,0,0,0] },
    field2: { drum: 'rock', bpm: 132, mt: 'triangle', hat: true,
      mel: [74,0,78,0, 81,0,78,0, 79,0,76,0, 73,0,76,0, 74,0,78,0, 81,0,86,0, 85,0,81,0, 76,0,0,0,
            79,81,83,0, 79,0,76,0, 78,79,81,0, 78,0,74,0, 76,0,79,0, 78,0,76,0, 74,0,0,0, 0,0,0,0],
      bass: [50,0,57,0, 50,0,57,0, 45,0,52,0, 45,0,52,0, 50,0,57,0, 50,0,57,0, 45,0,52,0, 49,0,52,0,
             43,0,50,0, 43,0,50,0, 50,0,57,0, 50,0,57,0, 45,0,52,0, 45,0,52,0, 50,0,57,0, 50,0,0,0] },
    gloom: { bpm: 80, mt: 'triangle',
      mel: [69,0,72,0, 76,0,0,0, 74,0,72,0, 71,0,0,0, 69,0,72,0, 76,0,81,0, 79,0,0,0, 76,0,0,0,
            77,0,76,0, 74,0,72,0, 71,0,72,0, 74,0,0,0, 72,0,71,0, 69,0,68,0, 69,0,0,0, 0,0,0,0],
      bass: [45,0,52,0, 45,0,52,0, 50,0,57,0, 44,0,52,0, 45,0,52,0, 45,0,52,0, 48,0,55,0, 48,0,55,0,
             41,0,48,0, 41,0,48,0, 43,0,50,0, 43,0,50,0, 40,0,47,0, 40,0,47,0, 45,0,52,0, 45,0,0,0] },
    field3: { drum: 'rock', bpm: 138, mt: 'square', hat: true,
      mel: [76,0,79,76, 0,79,83,0, 81,0,79,0, 78,0,76,0, 74,0,78,74, 0,78,81,0, 79,0,78,0, 76,0,0,0,
            76,0,79,0, 84,0,83,0, 81,0,79,0, 81,0,83,0, 84,0,83,0, 81,0,78,0, 76,0,0,0, 0,0,0,0],
      bass: [40,0,47,0, 40,0,47,0, 45,0,52,0, 47,0,54,0, 38,0,45,0, 38,0,45,0, 43,0,50,0, 47,0,50,0,
             48,0,55,0, 48,0,55,0, 45,0,52,0, 47,0,54,0, 48,0,55,0, 47,0,54,0, 40,0,47,0, 40,0,0,0] },
    mystery: { bpm: 92, mt: 'sine', mv: 0.13,
      mel: [74,77,81,77, 74,77,81,77, 73,76,79,76, 73,76,79,76, 72,76,79,76, 72,76,79,76, 70,74,77,74, 69,73,76,73,
            74,77,81,86, 81,77,74,77, 72,76,79,84, 79,76,72,76, 70,74,77,82, 76,73,69,73, 74,0,0,0, 0,0,0,0],
      bass: [50,0,0,0, 50,0,0,0, 45,0,0,0, 45,0,0,0, 48,0,0,0, 48,0,0,0, 46,0,0,0, 45,0,0,0,
             50,0,0,0, 50,0,0,0, 48,0,0,0, 48,0,0,0, 46,0,0,0, 45,0,0,0, 50,0,0,0, 50,0,0,0] },
    boss: { drum: 'rock', bpm: 132, mt: 'square', hat: true,
      mel: [69,0,72,0, 76,0,72,0, 74,0,71,0, 67,0,71,0, 69,0,72,0, 76,0,79,0, 77,0,76,0, 74,0,0,0,
            72,0,76,0, 81,0,79,0, 77,0,74,0, 76,0,72,0, 71,0,74,0, 72,0,71,0, 69,0,0,0, 0,0,64,0],
      bass: [45,0,57,0, 45,0,57,0, 43,0,55,0, 43,0,55,0, 41,0,53,0, 41,0,53,0, 40,0,52,0, 40,0,52,0,
             45,0,57,0, 45,0,57,0, 41,0,53,0, 41,0,53,0, 43,0,55,0, 43,0,55,0, 45,0,57,0, 40,0,52,0] },
    boss3: { drum: 'rock', bpm: 148, mt: 'square', hat: true,
      mel: [72,0,75,0, 79,0,75,0, 77,0,75,0, 74,0,71,0, 72,0,75,0, 79,0,84,0, 82,0,80,0, 79,0,0,0,
            80,0,79,0, 77,0,75,0, 77,0,75,0, 74,0,72,0, 71,0,74,0, 77,0,79,0, 72,0,0,0, 71,0,0,0],
      bass: [36,0,48,0, 36,0,48,0, 41,0,53,0, 43,0,55,0, 36,0,48,0, 36,0,48,0, 44,0,56,0, 43,0,55,0,
             44,0,56,0, 44,0,56,0, 41,0,53,0, 41,0,53,0, 43,0,55,0, 43,0,55,0, 36,0,48,0, 43,0,55,0] },
    happy: { drum: 'rock', bpm: 100, mt: 'triangle',
      mel: [72,0,76,0, 79,0,84,0, 81,0,79,0, 76,0,0,0, 77,0,81,0, 79,0,76,0, 74,0,77,0, 76,0,0,0,
            72,0,76,0, 79,0,84,0, 86,0,84,0, 81,0,79,0, 77,0,76,0, 74,0,79,0, 72,0,0,0, 0,0,0,0],
      bass: [48,0,55,0, 52,0,55,0, 53,0,57,0, 48,0,55,0, 53,0,57,0, 48,0,55,0, 50,0,55,0, 48,0,55,0,
             48,0,55,0, 52,0,55,0, 50,0,53,0, 53,0,57,0, 55,0,59,0, 55,0,59,0, 48,0,55,0, 48,0,0,0] },
    mini: { bpm: 96, mt: 'sine', mv: 0.1,
      mel: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      bass: [48,0,0,0, 55,0,0,0, 53,0,0,0, 55,0,0,0] },
  };

  function note(n, t, dur, type, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(midi(n), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || musG); o.start(t); o.stop(t + dur + 0.05);
  }
  function tick() {
    if (!ac || !song) return;
    const spb = 60 / song.bpm / 2;
    if (nextTime < ac.currentTime - 0.25) nextTime = ac.currentTime + 0.05; // 탭이 숨겨졌다 돌아온 경우
    while (nextTime < ac.currentTime + 0.15) {
      const m = song.mel[step % song.mel.length], b = song.bass[step % song.bass.length];
      if (m) note(m, nextTime, spb * 1.7, song.mt, song.mv || (song.mt === 'square' ? 0.05 : 0.11));
      if (b) note(b, nextTime, spb * 1.9, 'sine', 0.13);
      if (song.hat && step % 2 === 1) noise(nextTime, 0.04, 0.05, 7000, musG);
      if (song.drum) {
        const st = step % 8;
        if (st === 0 || (song.drum === 'rock' && st === 4) || (song.drum === 'march' && st % 2 === 0)) kick(nextTime, song.drum === 'march' ? 0.22 : 0.32);
        if (song.drum !== 'soft' && (st === 2 || st === 6)) snare(nextTime);
      }
      step++; nextTime += spb;
    }
  }
  function kick(t, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.18);
  }
  function snare(t) { noise(t, 0.09, 0.12, 1600, musG); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.08); }
  // 배경 음악(2026-11-19): 광장·모든 게임이 같이 쓰는 music.js가 있으면 그 곡(CC0 녹음 곡)을 틀고, 위의 합성 곡은 쉬어요
  const BGM_MAP = { town: 'sarang_town', town2: 'sarang_town', cotton: 'sarang_town', field: 'sarang_field', field2: 'sarang_field', field3: 'sarang_field', forest: 'sarang_field',
    gloom: 'sarang_mystery', mystery: 'sarang_mystery', boss: 'sarang_boss', boss3: 'sarang_boss', happy: 'sarang_happy', mini: 'sarang_happy' };
  function playMusic(name) {
    if (window.BGM) { songName = name; BGM.play(BGM_MAP[name] || null, 1.2); return; }
    if (!ac) return;
    if (songName === name && timer) return;
    stopMusic();
    song = SONGS[name]; songName = name;
    if (!song) return;
    step = 0; nextTime = ac.currentTime + 0.12;
    timer = setInterval(tick, 30);
  }
  function stopMusic() { if (window.BGM) BGM.stop(); if (timer) clearInterval(timer); timer = null; song = null; songName = ''; }
  function setMuted(m) {
    muted = m;
    if (window.BGM) BGM.mute(m);
    try { localStorage.setItem('sarang_muted', m ? '1' : '0'); } catch (e) { /* 무시 */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05);
  }

  return {
    init, resume, playMusic, stopMusic,
    play(name, arg) { if (ac && !muted && sfx[name]) sfx[name](arg); },
    // 미니게임용: 음 하나 연주 (나팔·거울 소리)
    note(n, dur = 0.25, type = 'triangle', vol = 0.16) { if (!ac || muted) return; note(n, ac.currentTime + 0.005, dur, type, vol, sfxG); },
    get time() { return ac ? ac.currentTime : performance.now() / 1000; },
    toggle() { setMuted(!muted); return muted; },
    get muted() { return muted; },
    get song() { return songName; },
  };
})();
