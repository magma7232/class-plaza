'use strict';
// 이야기 · 마을 · 퀘스트 — 게임 엔진(G)을 받아서 만든다
function makeContent(G) {
  const STEPS = ['intro', 'practice', 'practice2', 'toCotton', 'clouds', 'toOwl', 'trumpet', 'toCastle', 'boss1', 'wake',
    'toPencil', 'numbers', 'toTower', 'boss2', 'restore', 'toGloom', 'cheer', 'keys', 'mirror', 'toThrone', 'boss3', 'done'];
  const ORDER = ['heart', 'cotton', 'drowsy', 'toss', 'pillow', 'pencil', 'notebook', 'tower', 'gloom', 'thorn', 'mirror', 'throne'];
  const idx = (id) => STEPS.indexOf(id);
  const Q = () => G.Q;
  const at = (id) => idx(Q().step) >= idx(id);
  const is = (id) => Q().step === id;
  const inv = (k) => Q().inv[k] || 0;
  const flag = (k) => !!Q().flags[k];
  const setFlag = (k, v = true) => { Q().flags[k] = v; G.save(); };
  const L = (who, text, expr) => ({ who, text, expr });
  const step = (id) => G.setStep(id);

  function newQ() {
    return { v: 2, step: 'intro', shards: 0, inv: {}, kills: {}, found: {}, flags: {}, hat: '', hats: [], followers: [],
      stats: { start: Date.now(), deaths: 0, purified: 0, play: 0 } };
  }

  // ================= 이야기 시작 =================
  function intro() {
    G.say([
      L('narr', '여기는 사랑 왕국의 하트 마을. 오늘은 사랑의 큰 하트가 일 년 중 가장 밝게 빛나는 "하트 축제" 날이에요.'),
      L('narr', '그런데 아침에 일어나 보니 마을이 이상하게 조용해요. 축제 장식은 엉망이 되어 있고, 큰 하트는 금이 간 채 빛을 잃었어요!'),
      L('me', '어? 큰 하트가 왜 저렇게 됐지? 하트 할머니께 여쭤봐야겠어!', 'surprised'),
    ]);
  }

  // ================= 하트 마을 =================
  function talkGrandma() {
    if (is('intro')) {
      G.say([
        L('grandma', '사랑둥이야, 큰일 났단다! 어젯밤 보라색 풍선이 날아와서 큰 하트를 산산조각 냈어.', 'worried'),
        L('grandma', '머리엔 뿔 두 개, 손엔 심술 삼지창. 다들 그 아이를 "악마둥이"라고 부르더구나.'),
        L('me', '악마둥이요?!', 'surprised'),
        L('grandma', '하트 조각이 꿈나라, 학용품 나라, 그리고 악마둥이 손으로 흩어졌어. 그 바람에 베개 공주님은 깨어나지 못하는 잠에 빠지고, 자 왕자님은 눈금이 지워진 채 탑에 갇혔대.', 'sad'),
        L('grandma', '그리고… 파란 리본을 단 콩닥이도 어젯밤부터 보이지 않는구나. 축제 준비 때 혼자 구석에 있던 그 아이 말이야.', 'worried'),
        L('me', '하트 조각도, 콩닥이도 제가 꼭 찾아올게요!', 'determined'),
        L('grandma', '고맙구나. 밖은 위험하니 저기 허수아비로 하트 던지기부터 연습하렴.'),
      ], () => { step('practice'); G.toast(G.touch ? '♥ 버튼으로 하트를 던져요!' : 'J(또는 Z) 키로 하트를 던져요!', '#fff36a'); });
      return;
    }
    if (is('practice') || is('practice2')) { G.say([L('grandma', '허수아비에 하트를 맞혀 보렴. 하트는 바라보는 쪽으로 날아간단다.')]); return; }
    if (is('done')) { G.say([L('grandma', '큰 하트가 다시 빛나는구나. 너희 덕분이란다, 사랑둥이야!', 'joy')]); return; }
    G.say([L('grandma', `하트 조각은 ${Q().shards}/3개 모였구나. 힘들면 마을에서 쉬렴. 마을에 있으면 체력이 금방 차오른단다.`)]);
  }
  function lookHeart() {
    const n = Q().shards;
    if (n >= 3) G.say([L('narr', '큰 하트가 따뜻하게 빛나고 있어요. 두근두근!')]);
    else G.say([L('narr', `큰 하트에 금이 가 있어요. 빈자리가 ${3 - n}곳 남았어요. (하트 조각 ${n}/3)`)]);
  }
  function hitDummy(d, big) {
    const q = Q();
    if (is('practice')) {
      q.kills.dummy = (q.kills.dummy || 0) + 1;
      G.floatText(1230, 446, 150, `${q.kills.dummy}/5`, '#fff36a');
      if (q.kills.dummy >= 5) { step('practice2'); G.toast(G.touch ? '♥ 버튼을 꾹 누르고 있다가 떼면 큰 하트!' : 'J 키를 꾹 누르고 있다가 떼면 큰 하트!', '#fff36a'); }
    } else if (is('practice2') && big) {
      step('toCotton'); G.done('연습 끝!');
      G.after(0.8, () => {
        G.burst(1000, 420, 60, 'spark', 16, { col: '#bfffe8' }); G.sfx('pop');
        G.say([
          L('sparkle', '와아, 멋진 큰 하트다! 안녕? 나는 꿈 요정 반짝이야.', 'joy'),
          L('sparkle', '하트 조각 하나가 꿈나라 쪽으로 떨어지는 걸 봤어. 내가 길을 알려 줄게!'),
          L('sparkle', '몬스터들은 심술 기운에 물든 것뿐이야. 하트를 맞히면 착해져서 날아가! 계속 맞히면 콤보, 사랑 게이지가 가득 차면 "사랑 폭발"을 쓸 수 있어.'),
          L('sparkle', G.touch ? '바닥에 동그란 표시가 생기면 얼른 피해! 대시 버튼으로 휙 피할 수 있고, 퍼지는 충격파는 점프로 넘어.' : '바닥에 동그란 표시가 생기면 얼른 피해! Shift로 휙 대시할 수 있고, 퍼지는 충격파는 점프로 넘어.'),
          L('sparkle', '오른쪽 끝 포털을 타면 솜사탕 마을이야. 양 촌장님을 찾아가 봐! 가는 길에 상자도 부수고 버섯에서 통통 뛰어 봐~', 'joy'),
        ]);
      });
    }
  }

  // ================= 솜사탕 마을 =================
  function talkMayor() {
    if (is('toCotton')) {
      G.say([
        L('mayor', '으아암… 어서 오너라, 꼬마 손님. 나는 솜사탕 마을 촌장 뭉게란다.', 'sleep'),
        L('mayor', '베개 공주님이 잠든 뒤로 졸음 들판에 "투덜 구름"이 잔뜩 몰려왔어. 그 구름 때문에 마을 모두가 하품만 하고 있지 뭐냐.'),
        L('me', '베개 성에 가려면 어떻게 해야 해요?'),
        L('mayor', '졸음 들판을 지나 뒤척이 숲을 건너야 한단다. 먼저 들판의 투덜 구름 8마리를 하트로 맑게 해 주겠니? 그래야 숲으로 가는 길이 보일 게다.'),
        L('mayor', '참, 하품 양은 고개를 숙였다가 돌진한단다. 그럴 땐 위아래로 비켜서 피하렴!'),
      ], () => step('clouds'));
      return;
    }
    if (is('clouds')) { G.say([L('mayor', `투덜 구름이 아직 ${8 - (Q().kills.cloud || 0)}마리 남았구나. 구름이 비를 뿌리는 자리를 잘 보렴.`)]); return; }
    G.say([L('mayor', '고맙다! 졸음이 싹 가시는구나. 공주님을 꼭 깨워 다오.', 'joy')]);
  }
  function talkPink() {
    if (!flag('sheepDone')) {
      G.say([L('v4', '으앙… 잠이 안 와서 양을 세는데 자꾸 헷갈려. 구름까지 섞여서 넘어오지 뭐야!', 'worried')], () =>
        G.ask('분홍둥이와 양을 같이 셀까요?', ['같이 세자!', '나중에'], (i) => {
          if (i !== 0) return;
          G.mini('sheep', (win) => {
            if (!win) return;
            setFlag('sheepDone'); G.giveHat('nightcap', '수면 모자');
            G.say([L('v4', '고마워! 이제 꿀잠 잘 수 있겠다. 이건 내 수면 모자야. 선물!', 'joy')]);
          });
        }));
      return;
    }
    G.say([L('v4', '수면 모자 잘 어울린다! 또 양 세러 와~', 'joy')], () => G.ask('양 세기를 또 할까요?', ['또 하자!', '괜찮아'], (i) => { if (i === 0) G.mini('sheep', () => {}); }));
  }

  // ================= 뒤척이 숲 =================
  const PART_SPOTS = { t1: 1, t3: 1, t5: 1 };
  function talkOwl() {
    if (is('toOwl') || is('clouds')) {
      G.say([
        L('owl', '후우~ 후우~ 밤손님이로구나. 나는 뭐든 고치는 부엉 장인이란다.'),
        L('me', '베개 성에 가야 해요! 잠든 공주님을 깨워야 하거든요.', 'determined'),
        L('owl', '베개 성 문은 "기상 나팔" 소리를 들어야 열린단다. 그런데 내 나팔이 그만 망가져 버렸어.', 'worried'),
        L('owl', '코골이 버섯들이 내 맑은 방울을 꿀꺽 삼켜 버렸지 뭐냐. 버섯을 맑게 해 주면 방울을 돌려받을 수 있을 거야. 방울 5개!'),
        L('owl', '그리고 나팔 부품 3개가 숲 어딘가로 흩어졌어. 수상한 덤불이나 바위, 상자를 "살펴보기" 해 보렴.'),
      ], () => step('trumpet'));
      return;
    }
    if (is('trumpet')) {
      if (inv('bell') >= 5 && inv('part') >= 3) {
        G.say([
          L('owl', '오오! 다 모아 왔구나. 뚝딱뚝딱… 짠! 기상 나팔 완성!', 'joy'),
          L('owl', '베개 성은 숲 오른쪽 끝이란다. 성을 지키는 코골이 대왕은 코를 골 때마다 졸음 방울을 뿜어. 동그란 표시와 충격파를 조심하렴!'),
        ], () => { G.take('bell', 5); G.take('part', 3); setFlag('trumpet'); step('toCastle'); G.done('기상 나팔을 얻었어요!'); });
      } else G.say([L('owl', `맑은 방울 ${inv('bell')}/5, 나팔 부품 ${inv('part')}/3이로구나. 조금만 더 힘내렴!`)]);
      return;
    }
    G.say([L('owl', '후우~ 나팔 소리가 숲까지 들리면 좋겠구나.', 'happy')]);
  }
  function forestSpot(id, x, y, kind, emptyText) {
    return G.spot(id, x, y, kind, {
      find() {
        if (PART_SPOTS[id] && Q().found[id]) { G.toast('이미 살펴본 곳이에요.'); return; }
        if (PART_SPOTS[id] && is('trumpet')) { Q().found[id] = 1; G.drop('part', x, y - 20); G.toast('나팔 부품을 찾았어요!', '#fff36a'); return; }
        if (PART_SPOTS[id] && !at('trumpet')) { G.toast('뭔가 반짝이는데… 무엇에 쓰는 걸까?'); return; }
        G.toast(emptyText);
      },
    });
  }

  // ================= 베개 성 =================
  function talkPrincess() {
    if (is('wake')) {
      G.say([L('narr', '베개 공주님은 아주 깊이 잠들어 있어요. 기상 나팔을 불어 깨워 볼까요?')], () =>
        G.ask('기상 나팔을 불까요?', ['불어 보자!', '잠깐만'], (i) => {
          if (i !== 0) return;
          G.mini('rhythm', (win) => { if (win) princessWakes(); });
        }));
      return;
    }
    if (!at('wake')) { G.toast('먼저 코골이 대왕을 물리쳐요!'); return; }
  }
  function princessWakes() {
    G.sfx('wake'); setFlag('princessAwake');
    G.say([
      L('princess', '으음… 하아암~ 여기가 어디죠? 제가 얼마나 잔 거예요?', 'surprised'),
      L('me', '공주님! 드디어 깨어나셨어요!', 'joy'),
      L('princess', '꿈속에서 어떤 아이가 울고 있었어요. 파란 리본을 단 빨간 하트였는데… "나도 같이 놀고 싶어"라고 하더라고요.', 'worried'),
      L('me', '파란 리본…? 혹시…', 'worried'),
      L('princess', '제 베개에 박혀 있던 이 반짝이는 조각, 가져가세요. 그리고 저도 같이 갈래요! 베개 던지기는 자신 있거든요!', 'joy'),
    ], () => {
      Q().shards = Math.max(Q().shards, 1); G.addFollower('princess');
      step('toPencil'); G.done('베개 공주를 깨웠어요! 하트 조각 1/3');
      G.toast('베개 공주가 함께해요! 몬스터에게 베개를 던져 줘요.', '#ffd1e6');
    });
  }

  // ================= 연필 마을 =================
  function talkKnight() {
    if (is('toPencil')) {
      G.say([
        L('knight', '멈춰라! …아, 사랑둥이시군요. 실례했습니다! 저는 학용품 나라를 지키는 연필 기사 뾰족이입니다.'),
        L('knight', '우리 자 왕자님이 큰일입니다. 심술 지우개 대장이 왕자님의 눈금을 싹싹 지우고 눈금 탑에 가둬 버렸어요.', 'worried'),
        L('knight', '눈금을 되살리려면 "숫자 눈금" 10개가 필요합니다. 공책 평원의 낙서 괴물들이 숫자를 낙서로 덮어 버렸거든요.'),
        L('knight', '그리고 탑으로 가는 다리가 끊어졌어요. 마을 오른쪽의 딱풀 할아버지께 여쭤보세요!'),
      ], () => step('numbers'));
      return;
    }
    if (is('numbers')) { G.say([L('knight', `숫자 눈금 ${inv('number')}/10! 낙서 괴물을 맑게 하거나, 평원의 종이 더미를 살펴보세요.`)]); return; }
    G.say([L('knight', '왕자님을 부탁드립니다! 충성!', 'determined')]);
  }
  function talkGlue() {
    if (is('numbers') && !flag('glueQuest')) {
      G.say([
        L('glue', '흠흠, 끊어진 다리 말이냐? 이 딱풀 할아버지가 붙이면 금방이지!'),
        L('glue', '그런데 지우개 똥 녀석들이 내 풀을 쪽쪽 먹어 버렸어. 녀석들을 맑게 하면 풀 방울을 떨어뜨릴 게다.', 'grumpy'),
        L('glue', '풀 방울 3개를 모아서 공책 평원 끝 다리에 발라 주렴. 지우개 똥은 떼로 몰려다니니 조심하고!'),
      ], () => setFlag('glueQuest'));
      return;
    }
    if (flag('bridge')) { G.say([L('glue', '허허, 다리가 아주 딱! 붙었지?', 'joy')]); return; }
    if (flag('glueQuest')) { G.say([L('glue', `풀 방울 ${inv('glue')}/3. 다 모으면 평원 끝 다리에 발라 주렴.`)]); return; }
    G.say([L('glue', '흠흠, 뭐든 붙이고 싶으면 나를 찾아오너라.')]);
  }
  function talkWorm() {
    if (!flag('measureDone')) {
      G.say([
        L('worm', '에헴! 나는 자벌레 선생님. 자로 길이를 재는 건 아주 중요하단다.'),
        L('worm', '내 길이 재기 시험을 통과하면 멋진 선물을 주마. 0이 아닌 곳에서 시작하는 문제도 있으니 조심!'),
      ], () => G.ask('길이 재기 시험에 도전할까요?', ['도전!', '나중에'], (i) => {
        if (i !== 0) return;
        G.mini('measure', (win) => { if (win) { setFlag('measureDone'); G.giveHat('pencilHat', '연필 모자'); G.say([L('worm', '훌륭하구나! 이 연필 모자를 쓰거라. 길이 재기 박사의 증표란다.', 'joy')]); } });
      }));
      return;
    }
    G.say([L('worm', '연필 모자가 잘 어울리는구나. 한 번 더 풀어 볼 테냐?', 'joy')], () => G.ask('길이 재기를 또 할까요?', ['또 하자!', '괜찮아'], (i) => { if (i === 0) G.mini('measure', () => {}); }));
  }
  function fixBridge() {
    if (flag('bridge')) return;
    if (!flag('glueQuest')) { G.say([L('narr', '다리 가운데가 뚝 끊어져 있어요. 연필 마을의 딱풀 할아버지라면 고칠 수 있을지도 몰라요.')]); return; }
    if (inv('glue') < 3) { G.say([L('narr', `풀 방울이 ${inv('glue')}/3개 있어요. 조금 더 필요해요. (지우개 똥이 갖고 있어요)`)]); return; }
    G.take('glue', 3); setFlag('bridge'); G.sfx('unlock'); G.burst(2700, 420, 30, 'star', 22, { speed: 220 });
    G.say([L('narr', '풀 방울을 바르고 꾹꾹 눌렀더니… 다리가 딱! 붙었어요!')], checkNumbers);
  }
  function checkNumbers() {
    if (is('numbers') && inv('number') >= 10 && flag('bridge')) { step('toTower'); G.done('눈금 탑으로 가는 길이 열렸어요!'); }
    else if (is('numbers') && flag('bridge')) G.toast(`숫자 눈금이 ${10 - inv('number')}개 더 필요해요!`);
  }
  function paperSpot(id, x, y, has) {
    return G.spot(id, x, y, 'paper', {
      find() {
        if (has && Q().found[id]) { G.toast('이미 살펴본 종이 더미예요.'); return; }
        if (has && is('numbers') && inv('number') + G.pending('number') < 10) { Q().found[id] = 1; G.drop('number', x, y - 20); G.toast('종이 더미 속에서 숫자 눈금을 찾았어요!', '#fff36a'); return; }
        G.toast(has ? '숫자가 적힌 종이가 있어요. 나중에 필요할지도?' : '낙서만 잔뜩 있어요. 꼬불꼬불~');
      },
    });
  }

  // ================= 눈금 탑 =================
  function talkPrince() {
    if (is('restore')) {
      G.say([L('narr', '왕자님의 눈금이 모두 지워져 있어요. 모아 온 숫자 눈금을 제자리에 붙여 볼까요?')], () =>
        G.ask('숫자 눈금을 붙일까요?', ['붙이자!', '잠깐만'], (i) => { if (i === 0) G.mini('ruler', (win) => { if (win) princeRestored(); }); }));
      return;
    }
    if (!at('restore')) G.toast('먼저 심술 지우개 대장을 물리쳐요!');
  }
  function princeRestored() {
    setFlag('princeOk'); G.sfx('wake');
    G.say([
      L('prince', '오오… 눈금이 돌아왔다! 0부터 50까지, 하나도 빠짐없이!', 'surprised'),
      L('prince', '고맙소, 사랑둥이! 나는 자 왕자. 세상의 모든 길이를 재는 50센티미터 왕자라오.', 'joy'),
      L('prince', '그런데 말이오… 악마둥이가 나를 가둘 때 혼잣말을 하더군. "아무도 나랑 같이 축제 준비를 안 해 줬어…"라고.', 'worried'),
      L('prince', '그리고 뿔 사이에 해진 파란 리본이 보였소.'),
      L('me', '파란 리본… 콩닥이가 늘 달고 다니던 리본이야! 설마 악마둥이가… 콩닥이?!', 'surprised'),
      L('princess', '그래서 꿈속에서 그렇게 울고 있었군요…', 'sad'),
      L('prince', '이 하트 조각을 가져가시오. 나도 함께 가겠소! 자 던지기라면 자신 있지!', 'determined'),
    ], () => {
      Q().shards = Math.max(Q().shards, 2); G.addFollower('prince');
      step('toGloom'); G.done('자 왕자를 구했어요! 하트 조각 2/3');
      G.toast('자 왕자가 함께해요!', '#ffe58a');
    });
  }

  // ================= 심술 마을 =================
  const GRUMPS = [
    { id: 'g1', ch: 'villager1', x: 520, y: 462, name: '파랑둥이', happy: '어? 마음이 따뜻해졌어! 아까 투덜거려서 미안해.' },
    { id: 'g2', ch: 'villager2', x: 800, y: 430, name: '민트둥이', happy: '가시 정원의 심술 박쥐들이 반짝이는 열쇠 조각을 물고 다녀!' },
    { id: 'g3', ch: 'villager3', x: 1080, y: 474, name: '노랑둥이', happy: '열쇠 조각 3개를 모으면 거울 미로에 들어갈 수 있대.' },
    { id: 'g4', ch: 'villager4', x: 1340, y: 444, name: '분홍둥이', happy: '콩닥이는 축제 장식을 밤새 혼자 만들었대. 그런데 아무도 고맙다고 안 했어…' },
    { id: 'g5', ch: 'villager5', x: 1600, y: 466, name: '지우개 꼬마', happy: '우리가 먼저 "같이 하자"고 말했으면 좋았을 텐데…' },
  ];
  const GRUMPY_LINES = ['흥! 다 귀찮아!', '저리 가! 기분 나빠!', '쳇, 축제 같은 거 몰라!', '투덜투덜…', '말 걸지 마!'];
  const cheered = () => GRUMPS.filter((g) => flag('c_' + g.id)).length;
  function grumpNpc(g, i) {
    const grumpy = () => !flag('c_' + g.id);
    return G.npc(g.ch, g.x, g.y, {
      id: g.id, facing: i % 2 ? 1 : -1, name: () => (grumpy() ? '투덜이' : g.name),
      grumpy, expr: () => (grumpy() ? 'grumpy' : 'joy'),
      mark: () => (!grumpy() && !flag('t_' + g.id) ? '!' : null),
      talk() { if (grumpy()) G.bubble(g.id, GRUMPY_LINES[i], 2.2); else { setFlag('t_' + g.id); G.say([L(g.ch === 'villager5' ? 'v5' : 'v' + g.ch.slice(-1), g.happy, 'happy')]); } },
      target: {
        r: 30, h: 120, active: () => grumpy() && at('cheer'),
        hit() {
          const k = 'h_' + g.id; Q().flags[k] = (Q().flags[k] || 0) + 1;
          if (Q().flags[k] >= 3) {
            setFlag('c_' + g.id); G.burst(g.x, g.y, 70, 'heart', 14); G.sfx('purify'); G.bubble(g.id, '고마워! 마음이 따뜻해졌어!', 2.5);
            const n = cheered(); G.toast(`기분이 풀렸어요! ${n}/5`, '#ffd1e6');
            if (n >= 5 && is('cheer')) G.after(1.5, () => { step('keys'); G.done('심술 마을에 웃음이 돌아왔어요!'); G.toast('가시 정원으로 가는 길이 열렸어요! →', '#fff36a'); });
          } else G.bubble(g.id, ['어…?', '두근…?'][Q().flags[k] - 1] || '…', 1.2);
          return true;
        },
      },
    });
  }
  function talkSparkleGloom() {
    if (is('cheer')) { G.say([L('sparkle', `보라색 기운에 둘러싸인 친구들에게 하트를 3번씩! 지금 ${cheered()}/5명이야.`)]); return; }
    if (is('keys')) { G.say([L('sparkle', '열쇠 조각은 심술 박쥐가 갖고 있어. 박쥐가 내려꽂히는 자리에 보라 동그라미가 생기니까 피해!')]); return; }
    G.say([L('sparkle', '콩닥이는 분명 외로웠을 거야. 우리가 꼭 데려오자!', 'determined')]);
  }

  // ================= 거울 미로 =================
  function doorAct() {
    if (flag('mirrorOpen')) { G.goMap('throne', 170, 440); return; }
    if (!is('mirror')) { G.toast('거울 문이 굳게 닫혀 있어요.'); return; }
    G.say([L('narr', '거울 문에 글씨가 떠올라요. "거울이 비추는 순서를 기억하는 자만 지나갈 수 있다."')], () =>
      G.ask('거울 문에 도전할까요?', ['도전!', '잠깐만'], (i) => { if (i === 0) G.mini('simon', (win) => { if (win) mirrorOpened(); }); }));
  }
  function mirrorOpened() {
    setFlag('mirrorOpen'); G.sfx('unlock');
    G.say([
      L('narr', '거울 문이 열리면서 거울 속에 누군가의 기억이 비쳐요…'),
      L('narr', '축제 전날 밤, 파란 리본을 단 콩닥이가 혼자서 하트 장식을 만들고 있어요. "내가 만든 장식, 다들 좋아해 주겠지?"'),
      L('narr', '하지만 다음 날, 아무도 콩닥이의 장식을 알아봐 주지 않았어요. 콩닥이는 숲에 혼자 앉아 울다가… 이상한 삼지창을 주웠어요.'),
      L('me', '콩닥아… 혼자서 얼마나 외로웠을까.', 'sad'),
      L('me', '기다려, 콩닥아. 내가 꼭 데리러 갈게!', 'determined'),
    ], () => { step('toThrone'); G.done('거울 문이 열렸어요!'); });
  }

  // ================= 마지막 =================
  function finalScene(e) {
    G.lock(true); G.camTo(e.x - 160);
    G.after(1.2, () => G.say([
      L('devil', '으으… 왜… 왜 다들 나한테 하트를 보내는 거야…', 'sad'),
      L('me', '콩닥아! 너 콩닥이 맞지? 뿔 사이에 그 파란 리본!', 'worried'),
      L('devil', '…아, 아니야. 콩닥이는 아무도 같이 안 놀아 주는 외톨이였어.', 'sad'),
      L('me', '미안해. 우리가 몰라 줘서. 그래도 난 네 친구야. 앞으로도 쭉!', 'determined'),
      L('princess', '혼자인 마음, 꿈속에서 다 봤어요. 이제 혼자가 아니에요.', 'happy'),
      L('prince', '그대가 만든 축제 장식이 정말 멋졌다고 들었소!', 'happy'),
      L('devil', '나… 정말… 같이 해도 돼?', 'sad'),
    ], () => G.transform(e.x, e.y, () => G.say([
      L('kong', '어…? 뿔이 사라졌어! 삼지창이 꽃이 됐어!', 'surprised'),
      L('kong', '사랑둥이야, 정말 미안해. 나만 혼자인 것 같아서 너무 속상했어. 그래서 심술이 났나 봐…', 'sad'),
      L('me', '괜찮아, 콩닥아. 다시 돌아와 줘서 고마워!', 'joy'),
      L('kong', '이건 내가 가져갔던 마지막 하트 조각이야. 우리 같이 큰 하트를 고치러 가자!', 'joy'),
    ], () => {
      Q().shards = 3; step('done'); G.done('콩닥이가 돌아왔어요! 하트 조각 3/3');
      G.lock(false); G.camTo(null);
      G.after(1.2, () => G.goMap('heart', 760, 470));
    }))));
  }
  function festival() {
    if (flag('festival')) return;
    G.lock(true); G.camTo(820);
    G.music('happy');
    G.after(0.8, () => G.say([
      L('narr', '사랑둥이와 친구들이 하트 조각 세 개를 큰 하트에 다시 끼웠어요.'),
      L('grandma', '오오… 큰 하트가 다시 빛나는구나! 정말 고맙다, 얘들아.', 'joy'),
      L('kong', '얘들아… 나도 정말 축제에 같이 있어도 돼?', 'worried'),
      L('v1', '당연하지! 네가 만든 하트 장식이 제일 예뻐!', 'joy'),
      L('me', '이제부터는 우리가 먼저 "같이 하자!"라고 말할게.', 'joy'),
      L('sparkle', '사랑은 나눌수록 커지는 거래! 다 같이 축제다~!', 'joy'),
      L('narr', '그날의 하트 축제는 그 어느 해보다 따뜻하고 반짝였답니다. 끝!'),
    ], () => { setFlag('festival'); G.lock(false); G.camTo(null); G.showEnding(); }));
  }

  // ================= 맵 =================
  const maps = {
    heart: {
      spawn: { x: 520, y: 450 },
      ents: () => [
        G.prop('bigheart', 870, 372, (c, sx, sy, s) => Art2.greatHeart(c, sx, sy, s * 0.95, G.t, Q().shards), { promptH: 300, act: { label: '살펴보기', fn: lookHeart } }),
        G.npc('grandma', 700, 432, { facing: 1, talk: talkGrandma, mark: () => (is('intro') ? '!' : null), chat: () => (is('done') ? ['축제 음식 냄새가 나는구나~', '고맙다, 얘들아!'] : ['하트 조각을 꼭 찾아 주렴!', '조심하렴, 아가야.']) }),
        G.pad('pad_h1', 300, 474, 'mushroom', 1020), ...G.starArc(300, 474, 5, 190),
        G.breakable('gift_h1', 560, 404, 'gift'), G.breakable('gift_h2', 1540, 500, 'gift'),
        G.npc('sparkle', 1010, 418, { float: true, hidden: () => !((at('toCotton') && !at('toGloom')) || is('done')), talk: () => G.say([L('sparkle', is('done') ? '축제다~! 반짝반짝!' : '솜사탕 마을은 오른쪽 끝 포털로 가면 돼!', 'joy')]) }),
        G.prop('dummy', 1230, 446, (c, sx, sy, s, e) => Art2.dummy(c, sx, sy, s, G.t, e.hitT || 0), { target: { r: 34, h: 130, active: () => true, hit: hitDummy } }),
        G.npc('villager1', 470, 476, { facing: 1, chat: ['풍선 불기 대회 하고 싶다!', '사랑둥이 힘내!', '버섯 위에서 뛰어 봐!'], talk: () => G.say([L('v1', is('done') ? '큰 하트가 다시 빛나! 고마워, 사랑둥이야!' : '축제 풍선이 다 터져 버렸어… 그래도 넌 꼭 해낼 거야!', is('done') ? 'joy' : 'worried')]) }),
        G.npc('villager3', 1480, 456, { chat: () => (is('done') ? ['콩닥아, 같이 놀자!'] : ['콩닥이는 어디 갔을까…', '선물 상자를 부숴 봐! 뭐가 나올까?']), talk: () => G.say([L('v3', is('done') ? '콩닥이랑 같이 풍선 불기로 했어! 히히.' : '콩닥이? 음… 늘 혼자 있어서 잘 몰라. 한 번도 말을 걸어 본 적이 없거든.', is('done') ? 'joy' : 'sad')]) }),
        G.npc('kong', 1100, 472, { hidden: () => !is('done'), chat: ['고마워 친구들!', '다음엔 같이 장식 만들자!'], talk: () => G.say([L('kong', '사랑둥이야, 고마워! 다음엔 우리 같이 축제 장식 만들자!', 'joy')]) }),
        G.portal(1610, 'cotton', { toX: 170, locked: () => !at('toCotton'), lockMsg: '먼저 하트 할머니의 이야기를 듣고 연습을 마쳐요!' }),
      ],
      enter() { if (is('done') && !flag('festival')) festival(); },
    },
    cotton: {
      spawn: { x: 600, y: 450 },
      ents: () => [
        G.npc('mayor', 820, 440, { talk: talkMayor, mark: () => (is('toCotton') ? '!' : null), chat: ['으아암~', '졸려… 쿨…', '구름 좀 걷어 다오~'] }),
        G.pad('pad_c1', 1300, 482, 'cloud', 1040), ...G.starArc(1300, 482, 5, 200),
        G.breakable('pil_c1', 260, 420, 'pillow'), G.breakable('pil_c2', 1000, 488, 'pillow'),
        G.npc('villager4', 430, 462, { facing: 1, chat: ['양이 한 마리, 양이 두 마리…', '아, 또 헷갈렸다!'], talk: talkPink, mark: () => (!flag('sheepDone') && at('toCotton') ? '?' : null) }),
        G.npc('villager2', 1150, 470, { chat: ['솜사탕 먹고 싶다~', '구름 위에서 통통!'], talk: () => G.say([L('v2', '뒤척이 숲에는 부엉 장인이 살아. 망가진 건 뭐든 고쳐 준대!')]) }),
        G.portal(90, 'heart', { toX: 1500 }),
        G.portal(1510, 'drowsy', { toX: 170, locked: () => !at('clouds'), lockMsg: '양 촌장 뭉게에게 먼저 이야기를 들어요!' }),
      ],
    },
    drowsy: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'cotton', { toX: 1420 }),
        G.healSpot('flower1', 1450, 386, 'bush', '향기로운 꿀잠 꽃 냄새! 체력이 회복됐어요.'),
        G.breakable('d_b1', 700, 470, 'gift'), G.breakable('d_b2', 1250, 404, 'crate'), G.breakable('d_b3', 1900, 486, 'gift'), G.breakable('d_b4', 2450, 412, 'crate'),
        G.pad('d_p1', 1050, 476, 'mushroom'), ...G.starArc(1050, 476, 5), G.pad('d_p2', 2200, 432, 'mushroom'), ...G.starArc(2200, 432, 5),
        ...G.starLine(1560, 1760, 500, 5),
        G.portal(2810, 'toss', { toX: 170, locked: () => !at('toOwl'), lockMsg: () => `투덜 구름을 더 맑게 해야 길이 보여요! (${Q().kills.cloud || 0}/8)` }),
      ],
    },
    toss: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'drowsy', { toX: 2720 }),
        G.breakable('t_b1', 760, 476, 'crate'), G.breakable('t_b2', 1450, 486, 'crate'), G.breakable('t_b3', 2100, 470, 'crate'),
        G.pad('t_p1', 1150, 480, 'mushroom'), ...G.starArc(1150, 480, 5), G.pad('t_p2', 1850, 440, 'mushroom'), ...G.starArc(1850, 440, 5),
        ...G.starLine(600, 740, 470, 4),
        G.npc('owl', 1300, 430, { chat: ['후우~ 후우~', '버섯을 맑게 하면 방울이 나온단다!'], talk: talkOwl, mark: () => ((is('toOwl') || (is('trumpet') && inv('bell') >= 5 && inv('part') >= 3)) ? '!' : null) }),
        forestSpot('t1', 480, 396, 'bush', ''),
        forestSpot('t2', 950, 392, 'rock', '도토리만 잔뜩 있어요. 다람쥐의 비밀 창고인가 봐요!'),
        forestSpot('t3', 1580, 400, 'box', ''),
        forestSpot('t4', 1960, 396, 'bush', '잠든 다람쥐가 있어요. 쉿, 깨우지 말자!'),
        forestSpot('t5', 2250, 392, 'rock', ''),
        G.portal(2410, 'pillow', { toX: 170, locked: () => !at('toCastle'), lockMsg: '베개 성 문은 기상 나팔이 있어야 열려요. 부엉 장인을 도와줘요!' }),
      ],
    },
    pillow: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'toss', { toX: 2320 }),
        G.breakable('p_b1', 520, 472, 'pillow'), G.breakable('p_b2', 720, 400, 'pillow'),
        G.prop('bed', 1290, 432, (c, sx, sy, s) => { c.save(); c.translate(sx, sy); Art.roundRect(c, -96 * s, -40 * s, 192 * s, 46 * s, 22 * s); c.fillStyle = '#ffd1e8'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#a8306a'; c.stroke(); Art.roundRect(c, -80 * s, -54 * s, 70 * s, 26 * s, 12 * s); c.fillStyle = '#fff'; c.fill(); c.stroke(); c.restore(); }, {}),
        G.npc('princess', 1290, 438, { sleeping: () => !flag('princessAwake'), hidden: () => at('toPencil'), label: '깨우기', talk: talkPrincess, mark: () => (is('wake') ? '!' : null) }),
        G.portal(1430, 'pencil', { toX: 170, locked: () => !at('toPencil'), lockMsg: '베개 공주님을 먼저 깨워요!' }),
      ],
      enter() {
        if (is('toCastle')) {
          step('boss1');
          G.after(0.5, () => G.say([L('me', '공주님이 저기 계셔! 코골이 대왕부터 물리쳐야 해!', 'determined')]));
        }
      },
    },
    pencil: {
      spawn: { x: 760, y: 450 },
      ents: () => [
        G.portal(90, 'pillow', { toX: 1340 }),
        G.pad('pc_p1', 1340, 486, 'eraser', 1040), ...G.starArc(1340, 486, 5, 200),
        G.breakable('pc_b1', 250, 404, 'paper'),
        G.npc('worm', 380, 446, { facing: 1, chat: ['1센티미터, 2센티미터…', '눈금은 정확하게!'], talk: talkWorm, mark: () => (!flag('measureDone') && at('toPencil') ? '?' : null) }),
        G.npc('villager5', 640, 470, { facing: 1, chat: ['틀린 건 지우면 돼요!', '말랑말랑~'], talk: () => G.say([L('v5', '지우개라고 다 나쁜 건 아니에요! 우리는 틀린 걸 고쳐 주는 친구라고요!', 'determined')]) }),
        G.npc('knight', 900, 432, { chat: ['충성!', '왕자님을 구해 주세요!'], talk: talkKnight, mark: () => (is('toPencil') ? '!' : null) }),
        G.npc('eraserLady', 1180, 462, { talk: () => G.say([
          L('eraserLady', '지우개 대장은 지우개 가루를 비처럼 뿌린단다. 바닥에 분홍 동그라미가 생기면 얼른 피하렴!'),
          L('eraserLady', '길쭉하게 빛나는 줄이 생기면 그 줄에서 위아래로 벗어나야 해. 지우개 빔이 지나가거든!'),
        ]) }),
        G.npc('glue', 1500, 444, { chat: ['흠흠, 끈적끈적~', '뭐든 붙여 주마!'], talk: talkGlue, mark: () => (is('numbers') && !flag('glueQuest') ? '!' : null) }),
        G.portal(1810, 'notebook', { toX: 170, locked: () => !at('numbers'), lockMsg: '연필 기사 뾰족이의 이야기를 먼저 들어요!' }),
      ],
    },
    notebook: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'pencil', { toX: 1720 }),
        paperSpot('n1', 800, 392, true),
        paperSpot('n2', 1200, 390, false),
        G.healSpot('lunch', 1550, 394, 'box', '도시락 상자에 맛있는 주먹밥이! 체력이 회복됐어요.'),
        paperSpot('n3', 1760, 394, true),
        paperSpot('n4', 2150, 390, false),
        paperSpot('n5', 2450, 388, true),
        G.breakable('n_b1', 640, 476, 'paper'), G.breakable('n_b2', 1400, 488, 'paper'), G.breakable('n_b3', 2000, 470, 'paper'), G.breakable('n_b4', 2330, 480, 'paper'),
        G.pad('n_p1', 1000, 480, 'eraser'), ...G.starArc(1000, 480, 5), G.pad('n_p2', 1880, 440, 'eraser'), ...G.starArc(1880, 440, 5),
        ...G.starLine(2500, 2620, 470, 4),
        G.prop('bridge', 2700, 424, (c, sx, sy, s) => Art2.bridge(c, sx, sy, s * 1.1, G.t, flag('bridge')), { promptH: 90, act: () => (flag('bridge') ? null : { label: '다리 고치기', fn: fixBridge }) }),
        G.portal(2910, 'tower', { toX: 170, locked: () => !at('toTower'), lockMsg: () => (!flag('bridge') ? '다리가 끊어져서 건널 수 없어요!' : `숫자 눈금을 10개 모아야 해요! (${inv('number')}/10)`) }),
      ],
    },
    tower: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'notebook', { toX: 2820 }),
        G.npc('prince', 1300, 446, { erased: () => (flag('princeOk') ? 0 : 1), bubble: () => !at('restore'), hidden: () => at('toGloom'), label: '눈금 붙이기', talk: talkPrince, mark: () => (is('restore') ? '!' : null), expr: () => 'worried' }),
        G.portal(1430, 'gloom', { toX: 170, locked: () => !at('toGloom'), lockMsg: '자 왕자님을 먼저 구해요!' }),
      ],
      enter() {
        if (is('toTower')) { step('boss2'); G.after(0.5, () => G.say([L('me', '자 왕자님이다! 지우개 대장부터 물리치자!', 'determined')])); }
      },
    },
    gloom: {
      spawn: { x: 300, y: 450 },
      ents: () => [
        G.portal(90, 'tower', { toX: 1340 }),
        G.npc('sparkle', 300, 430, { float: true, facing: 1, hidden: () => !at('toGloom') || is('done'), talk: talkSparkleGloom, chat: ['반짝반짝~', '하트를 3번씩!'] }),
        ...GRUMPS.map(grumpNpc),
        G.pad('g_p1', 960, 504, 'spring', 1040), ...G.starArc(960, 504, 5, 200),
        G.breakable('g_b1', 380, 504, 'crate'), G.breakable('g_b2', 1760, 410, 'crate'),
        G.portal(1810, 'thorn', { toX: 170, locked: () => !at('keys'), lockMsg: () => `투덜이가 된 마을 사람들의 기분을 먼저 풀어 줘요! (${cheered()}/5)` }),
      ],
      enter() {
        if (is('toGloom')) {
          G.after(0.6, () => G.say([
            L('sparkle', '사랑둥이야! 여기는 원래 웃음 마을이었는데, 악마둥이의 심술 기운 때문에 다들 투덜이가 돼 버렸어.', 'worried'),
            L('sparkle', '보라색 기운에 둘러싸인 친구들에게 하트를 3번씩 맞혀 줘. 기분이 풀리면 왕좌로 가는 길을 알려 줄 거야!'),
          ], () => step('cheer')));
        }
      },
    },
    thorn: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'gloom', { toX: 1720 }),
        G.healSpot('rose', 1350, 388, 'bush', '가시 없는 장미 향기! 체력이 회복됐어요.'),
        G.breakable('th_b1', 750, 474, 'crate'), G.breakable('th_b2', 1250, 486, 'crate'), G.breakable('th_b3', 1850, 412, 'crate'), G.breakable('th_b4', 2350, 480, 'crate'),
        G.pad('th_p1', 1050, 472, 'mushroom'), ...G.starArc(1050, 472, 5), G.pad('th_p2', 2050, 432, 'mushroom'), ...G.starArc(2050, 432, 5),
        ...G.starLine(1500, 1700, 482, 5),
        G.portal(2610, 'mirror', { toX: 170, locked: () => !at('mirror'), lockMsg: () => `열쇠 조각 3개가 있어야 해요! (${inv('key')}/3)` }),
      ],
    },
    mirror: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'thorn', { toX: 2520 }),
        G.pad('m_p1', 740, 486, 'spring', 1060), ...G.starArc(740, 486, 6, 200),
        ...[380, 620, 860, 1100].map((x, i) => G.prop('mir' + i, x, 362, (c, sx, sy, s) => Art2.mirror(c, sx, sy, s * 0.95, G.t, 0.25 + 0.25 * Math.sin(G.t * 2 + i * 1.6), i, false), {})),
        G.prop('door', 1330, 404, (c, sx, sy, s) => Art2.door(c, sx, sy, s, G.t, flag('mirrorOpen')), { promptH: 220, act: () => ({ label: flag('mirrorOpen') ? '들어가기' : '거울 문', fn: doorAct }) }),
      ],
    },
    throne: {
      spawn: { x: 170, y: 440 },
      ents: () => [
        G.portal(90, 'mirror', { toX: 1240 }),
      ],
      enter() {
        if (is('toThrone')) {
          step('boss3');
          G.after(0.5, () => G.say([
            L('devil', '흥! 여기까지 왔어? 다들 나 같은 건 신경도 안 썼잖아!', 'angry'),
            L('me', '콩닥아! 나야, 사랑둥이! 우리 같이 돌아가자!', 'determined'),
            L('devil', '콩닥이는 이제 없어! 나는 악마둥이다! 삼지창 맛을 보여 주지!', 'angry'),
          ]));
        }
      },
    },
  };

  // 지역별 처음 왔을 때 큰 알림
  const REGION = {
    cotton: ['1단계 · 꿈나라', '잠든 베개 공주를 깨워라!'],
    pencil: ['2단계 · 학용품 나라', '갇힌 자 왕자를 구하라!'],
    gloom: ['3단계 · 심술 나라', '악마둥이의 비밀을 밝혀라!'],
    pillow: ['보스 · 코골이 대왕', '코를 골 때마다 졸음 방울이 퐁퐁!'],
    tower: ['보스 · 심술 지우개 대장', '지우개 빔과 가루 비를 조심해!'],
    throne: ['최종 보스 · 악마둥이', '사랑의 하트로 친구를 되찾아라!'],
  };

  // ================= 퀘스트 창 · 길잡이 =================
  function lines() {
    const k = Q().kills, n = inv;
    switch (Q().step) {
      case 'intro': return ['하트 할머니에게 말을 걸어 보자'];
      case 'practice': return [`허수아비에 하트 맞히기 ${k.dummy || 0}/5`, G.touch ? '♥ 버튼을 눌러요' : 'J 또는 Z 키를 눌러요'];
      case 'practice2': return ['큰 하트로 허수아비 맞히기', G.touch ? '♥를 꾹 눌렀다가 떼요!' : 'J 키를 꾹 눌렀다가 떼요!'];
      case 'toCotton': return ['솜사탕 마을의 양 촌장 찾아가기', '오른쪽 끝 포털 →'];
      case 'clouds': return [`투덜 구름 맑게 하기 ${k.cloud || 0}/8`, '졸음 들판에 있어요'];
      case 'toOwl': return ['뒤척이 숲의 부엉 장인 찾아가기'];
      case 'trumpet': return n('bell') >= 5 && n('part') >= 3 ? ['다 모았다! 부엉 장인에게 가자'] : [`맑은 방울 ${n('bell')}/5 · 나팔 부품 ${n('part')}/3`, '버섯을 맑게 하고, 숲을 살펴보자'];
      case 'toCastle': return ['베개 성으로 가자!', '숲 오른쪽 끝 포털 →'];
      case 'boss1': return ['코골이 대왕을 물리치자!', '표시는 피하고, 충격파는 점프!'];
      case 'wake': return ['기상 나팔로 베개 공주 깨우기'];
      case 'toPencil': return ['연필 마을의 연필 기사 찾아가기'];
      case 'numbers': return [`숫자 눈금 ${n('number')}/10`, flag('bridge') ? '다리 고치기 완료!' : !flag('glueQuest') ? '딱풀 할아버지 만나기' : n('glue') >= 3 ? '평원 끝 다리 고치기' : `풀 방울 ${n('glue')}/3`];
      case 'toTower': return ['눈금 탑으로! 공책 평원 끝 →'];
      case 'boss2': return ['심술 지우개 대장을 물리치자!', '빛나는 줄에서 벗어나요'];
      case 'restore': return ['숫자 눈금으로 자 왕자 되살리기'];
      case 'toGloom': return ['심술 마을로 가자!'];
      case 'cheer': return [`투덜이 기분 풀어 주기 ${cheered()}/5`, '하트를 3번씩 맞혀요'];
      case 'keys': return [`열쇠 조각 ${n('key')}/3`, '가시 정원의 심술 박쥐가 갖고 있어요'];
      case 'mirror': return ['거울 미로의 거울 문 열기'];
      case 'toThrone': return ['왕좌의 방으로! 콩닥이를 구하자'];
      case 'boss3': return ['악마둥이를 다시 콩닥이로!', '사랑의 하트를 가득!'];
      case 'done': return ['큰 하트가 다시 빛나요!', G.multi ? '친구들을 도와줘도 좋아요' : '마음껏 돌아다녀요'];
    }
    return [];
  }
  function label() { const l = lines(); return l[0] || ''; }
  function target() {
    const s = Q().step;
    switch (s) {
      case 'intro': return ['heart', 700];
      case 'practice': case 'practice2': return ['heart', 1230];
      case 'toCotton': return ['cotton', 820];
      case 'clouds': return ['drowsy', null];
      case 'toOwl': return ['toss', 1300];
      case 'trumpet': return inv('bell') >= 5 && inv('part') >= 3 ? ['toss', 1300] : ['toss', null];
      case 'toCastle': case 'boss1': return ['pillow', 1080];
      case 'wake': return ['pillow', 1290];
      case 'toPencil': return ['pencil', 900];
      case 'numbers': return !flag('glueQuest') ? ['pencil', 1500] : inv('glue') >= 3 && !flag('bridge') ? ['notebook', 2700] : ['notebook', null];
      case 'toTower': case 'boss2': return ['tower', 1080];
      case 'restore': return ['tower', 1300];
      case 'toGloom': return ['gloom', 300];
      case 'cheer': return ['gloom', null];
      case 'keys': return ['thorn', null];
      case 'mirror': return ['mirror', 1330];
      case 'toThrone': case 'boss3': return ['throne', 1000];
    }
    return null;
  }

  // ================= 몬스터를 맑게 했을 때 =================
  function onKill(type, e) {
    const q = Q();
    if (type === 'cloud' && is('clouds')) {
      q.kills.cloud = (q.kills.cloud || 0) + 1;
      G.floatText(e.x, e.y, 110, `구름 ${q.kills.cloud}/8`, '#bfe6ff');
      if (q.kills.cloud >= 8) { step('toOwl'); G.done('졸음 구름이 걷혔어요!'); G.toast('뒤척이 숲으로 가는 길이 열렸어요! →', '#fff36a'); }
    }
    if (type === 'snore' && is('trumpet') && inv('bell') + G.pending('bell') < 5) G.drop('bell', e.x, e.y);
    if (type === 'scribble' && is('numbers') && inv('number') + G.pending('number') < 10) G.drop('number', e.x, e.y);
    if (type === 'crumb' && is('numbers') && flag('glueQuest') && !flag('bridge') && inv('glue') + G.pending('glue') < 3 && Math.random() < 0.5) G.drop('glue', e.x, e.y);
    if (type === 'bat' && is('keys') && inv('key') + G.pending('key') < 3 && Math.random() < 0.6) G.drop('key', e.x, e.y);
  }
  function onPickup(kind) {
    if (kind === 'key' && inv('key') >= 3 && is('keys')) { step('mirror'); G.done('열쇠 조각을 다 모았어요!'); G.toast('거울 미로로 가는 길이 열렸어요! →', '#fff36a'); }
    if (kind === 'number') { if (inv('number') >= 10 && !flag('bridge')) G.toast('숫자 눈금을 다 모았어요! 이제 다리를 고쳐요', '#fff36a'); checkNumbers(); }
    if (kind === 'glue' && inv('glue') >= 3) G.toast('풀 방울을 다 모았어요! 평원 끝 다리로 가요', '#fff36a');
    if ((kind === 'bell' || kind === 'part') && inv('bell') >= 5 && inv('part') >= 3) G.toast('다 모았어요! 부엉 장인에게 돌아가요', '#fff36a');
  }
  function onBossDown(type, e) {
    if (type === 'snoreKing' && is('boss1')) { G.toast('코골이 대왕이 착해져서 쿨쿨 잠들었어요!', '#ffd1e6'); G.after(1.5, () => { step('wake'); G.say([L('me', '해냈다! 이제 기상 나팔로 공주님을 깨우자!', 'joy')]); }); }
    if (type === 'eraserBoss' && is('boss2')) { G.toast('심술 지우개 대장이 말랑말랑 착해졌어요!', '#ffd1e6'); G.after(1.5, () => { step('restore'); G.say([L('me', '왕자님! 지금 눈금을 되찾아 드릴게요!', 'joy')]); }); }
    if (type === 'devil' && is('boss3')) finalScene(e);
  }
  const TOWN = ['heart', 'cotton', 'pencil', 'gloom'];
  function mood(id) { if (id === 'gloom') return at('done') ? 1 : cheered() / 5; return 0; }

  return { STEPS, ORDER, idx, newQ, intro, maps, REGION, lines, label, target, onKill, onPickup, onBossDown,
    townOf: (region) => TOWN[region] || 'heart', at, is, mood };
}
