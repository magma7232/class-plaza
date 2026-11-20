'use strict';
// 혼자 하기(내 컴퓨터에서 규칙 실행) / 같이 하기(서버) 연결
const Net = (() => {
  let mode = 'solo', H = {}, myId = 'me';
  // 혼자 하기
  const worlds = {}; let world = null, worldId = '';
  // 같이 하기
  let ws = null, info = null, teach = null, status = 'off', code = '', lastSt = 0, retry = 0, closing = false, pingAt = 0, joinCb = null;

  function on(h) { H = h; }
  function startSolo() {
    close(); mode = 'solo'; myId = 'me'; status = 'solo'; code = '';
    for (const k in worlds) delete worlds[k];
    world = null; worldId = '';
  }
  function enter(mapId) {
    if (mode !== 'solo') return;
    world = worlds[mapId] || (worlds[mapId] = SIM.createWorld(mapId, { noRespawn: true }));
    worldId = mapId;
  }
  function flush() {
    if (!world || !world.ev.length) return;
    const ev = world.ev.slice(); world.ev.length = 0;
    if (H.ev) H.ev(worldId, ev);
  }
  // me: { id, x, y, z, dead } 또는 null (대화 중이라 공격받지 않을 때)
  function tick(dt, me, paused) {
    if (mode === 'solo') {
      if (!world || paused) return;
      SIM.step(world, dt, me ? [me] : []);
      flush();
      if (H.mons) H.mons(worldId, world.mons, true);
      return;
    }
    const now = performance.now();
    if (status === 'on' && now - pingAt > 15000) { pingAt = now; send({ t: 'ping' }); }
  }
  function hit(mapId, id, d, kb) {
    if (mode === 'solo') { if (world && worldId === mapId) { SIM.hit(world, id, d, myId, kb || 0); flush(); } return; }
    send({ t: 'hit', m: mapId, id, d: Math.round(d), k: Math.round(kb || 0) });
  }
  function state(st) {
    if (mode !== 'multi') return;
    const now = performance.now();
    if (now - lastSt < 100 && !st.force) return;
    lastSt = now; delete st.force;
    send(Object.assign({ t: 'st' }, st));
  }
  function shot(o) { if (mode === 'multi') send(Object.assign({ t: 'sh' }, o)); }
  function emo(k) { if (mode === 'multi') send({ t: 'emo', k }); }
  function send(o) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(o)); } catch (e) { /* 무시 */ } } }
  function url() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
  function setStatus(s) { status = s; if (H.status) H.status(s); }

  function open(onOpen) {
    closing = false;
    try { ws = new WebSocket(url()); } catch (e) { setStatus('fail'); if (joinCb) { joinCb('fail'); joinCb = null; } return; }
    setStatus('connecting');
    const my = ws;
    my.onopen = () => { retry = 0; onOpen(); };
    clearInterval(open.ping); open.ping = setInterval(() => { if (ws === my && my.readyState === 1) send({ t: 'ping' }); }, 12000);
    my.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } onMsg(m); };
    my.onclose = () => {
      if (my !== ws) return;
      ws = null;
      if (closing) { setStatus('off'); return; }
      if (joinCb) { joinCb('fail'); joinCb = null; setStatus('off'); return; }
      setStatus('retry');
      const wait = Math.min(8000, 1500 * (1 + retry++));
      setTimeout(() => { if (!closing && !ws) reopen(); }, wait);
    };
    my.onerror = () => { /* onclose가 이어서 처리 */ };
  }
  function reopen() {
    if (info) open(() => send({ t: 'join', code: info.code, name: info.name, color: info.color, hat: info.hat }));
    else if (teach) open(() => send({ t: 'watch', code }));
  }
  function onMsg(m) {
    switch (m.t) {
      case 'joined': myId = m.id; code = m.code; setStatus('on'); if (joinCb) { joinCb(null); joinCb = null; } break;
      case 'created': code = m.code; setStatus('on'); if (joinCb) { joinCb(null, m.code); joinCb = null; } break;
      case 'err': if (joinCb) { joinCb(m.why || 'err'); joinCb = null; } closing = true; if (ws) ws.close(); break;
      case 'roster': if (H.roster) H.roster(m.list); break;
      case 'snap': if (H.snap) H.snap(m.m, m.p, m.mo.map(SIM.unsnap)); break;
      case 'ev': if (H.ev) H.ev(m.m, m.ev); break;
      case 'sh': if (H.shot) H.shot(m); break;
      case 'emo': if (H.emo) H.emo(m); break;
      case 'room': if (H.room) H.room(m); break;
    }
  }
  function join(c, name, color, hat, cb) {
    close(); mode = 'multi'; info = { code: c, name, color, hat: hat || '' }; teach = null; joinCb = cb;
    open(() => send({ t: 'join', code: c, name, color, hat: hat || '' }));
  }
  function teacher(existing, cb) {
    close(); mode = 'teacher'; info = null; teach = true; joinCb = cb;
    open(() => send(existing ? { t: 'watch', code: existing } : { t: 'create' }));
  }
  function setHat(h) { if (info) info.hat = h; }
  function close() { closing = true; joinCb = null; if (ws) { try { ws.close(); } catch (e) { /* 무시 */ } } ws = null; }

  return {
    on, startSolo, enter, tick, hit, state, shot, emo, join, teacher, close, setHat,
    get mode() { return mode; }, get myId() { return myId; }, get status() { return status; }, get code() { return code; },
    canMulti: typeof WebSocket !== 'undefined' && /^https?:$/.test(location.protocol) && !window.SOLO_ONLY,
  };
})();
