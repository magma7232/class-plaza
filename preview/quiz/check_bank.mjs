// 퀴즈 문제 모음(bank.js) 점검 — 문제를 더하거나 고친 뒤 꼭 돌려요.
//   node 광장마을/곰_시험/quiz/check_bank.mjs
// 보는 것: 1~6학년이 다 있는지, 학년마다 60문제 이상인지, 한 문제의 모양({s, q, c:[정답, 오답×3], hint}),
// 보기 4개가 서로 다른지, 같은 문제가 두 번 있는지, 글자 수(화면에 맞게), 학년에 맞는 과목인지,
// 학년마다 수학이 가장 많은지, 낡은 패드에서 네모로 보일 수 있는 그림 글자(이모지)가 없는지.
// 정답이 맞는지는 이 점검으로 알 수 없어요 → 사람(또는 독립 검토)이 한 번 더 봐요.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(here, 'bank.js');
const LIMIT = { q: 80, c: 24, hint: 45, min: 60 };
const SUBJ = {
  low: ['국어', '수학', '통합'],                              // 1~2학년
  high: ['국어', '수학', '사회', '과학', '도덕', '영어'],      // 3~6학년
};
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);

const win = {};
try {
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window: win }, { filename: file });
} catch (e) {
  console.log('FAIL bank.js를 읽을 수 없어요: ' + e.message);
  process.exit(1);
}
const B = win.QUIZ_BANK;
if (!B || typeof B !== 'object') { console.log('FAIL window.QUIZ_BANK가 없어요'); process.exit(1); }

const norm = (t) => String(t).replace(/\s+/g, ' ').trim().toLowerCase();
// 이모지·그림 글자(낡은 안드로이드 글꼴에 없을 수 있음). □ △ ○ → × ÷ − ° ² ³ · … ‘’“” 는 괜찮아요
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
const seenAll = new Map();
let total = 0;

for (let g = 1; g <= 6; g++) {
  const list = B[g];
  if (!Array.isArray(list)) { fail(`${g}학년 문제가 없어요`); continue; }
  const allowed = g <= 2 ? SUBJ.low : g >= 5 ? SUBJ.high.concat('실과') : SUBJ.high;   // 실과는 5~6학년(2026-11-25)
  const count = {};
  const seen = new Map();
  list.forEach((it, i) => {
    const at = `${g}학년 ${i + 1}번`;
    if (!it || typeof it !== 'object') return fail(`${at}: 문제 모양이 아니에요`);
    const keys = Object.keys(it).sort().join(',');
    if (keys !== 'c,hint,q,s') fail(`${at}: 칸은 s, q, c, hint 네 가지만 (지금: ${keys})`);
    if (!allowed.includes(it.s)) fail(`${at}: ${g}학년 과목이 아니에요 (${it.s})`);
    count[it.s] = (count[it.s] || 0) + 1;
    for (const k of ['q', 'hint']) {
      if (typeof it[k] !== 'string' || !it[k].trim()) fail(`${at}: ${k}가 비었어요`);
      else {
        if (it[k] !== it[k].trim()) fail(`${at}: ${k} 앞뒤에 빈칸`);
        if (it[k].length > LIMIT[k]) fail(`${at}: ${k}가 ${it[k].length}자 (최대 ${LIMIT[k]}자) — ${it[k]}`);
        if (EMOJI.test(it[k])) fail(`${at}: ${k}에 그림 글자(이모지) — ${it[k]}`);
      }
    }
    if (!Array.isArray(it.c) || it.c.length !== 4) { fail(`${at}: 보기는 꼭 4개`); return; }
    const cs = it.c.map(norm);
    if (new Set(cs).size !== 4) fail(`${at}: 보기가 겹쳐요 — ${it.c.join(' / ')}`);
    it.c.forEach((c, j) => {
      if (typeof c !== 'string' || !c.trim()) return fail(`${at}: ${j + 1}번째 보기가 비었어요`);
      if (c !== c.trim()) fail(`${at}: 보기 앞뒤에 빈칸 — "${c}"`);
      if (c.length > LIMIT.c) fail(`${at}: 보기 "${c}"가 ${c.length}자 (최대 ${LIMIT.c}자)`);
      if (EMOJI.test(c)) fail(`${at}: 보기에 그림 글자(이모지) — ${c}`);
    });
    // 힌트에 정답이 그대로 들어 있으면 알려 줌(실패는 아님: 규칙을 알려 주는 힌트일 수 있음)
    if (typeof it.hint === 'string' && it.c[0].length >= 2 && it.hint.includes(it.c[0])) warn(`${at}: 힌트에 정답 "${it.c[0]}"이 그대로 있어요 — ${it.hint}`);
    const key = norm(it.q);
    if (seen.has(key)) fail(`${at}: 같은 문제가 ${seen.get(key)}에도 있어요`);
    else seen.set(key, at);
    if (seenAll.has(key) && !seenAll.get(key).startsWith(g + '학년')) warn(`${at}: 같은 문제가 ${seenAll.get(key)}에도 있어요(다른 학년, 보기는 다를 수 있음)`);
    else if (!seenAll.has(key)) seenAll.set(key, at);
  });
  total += list.length;
  if (list.length < LIMIT.min) fail(`${g}학년은 ${list.length}문제 (적어도 ${LIMIT.min}문제)`);
  for (const s of allowed) if (!count[s]) fail(`${g}학년에 ${s} 문제가 없어요`);
  const math = count['수학'] || 0;
  for (const s in count) if (s !== '수학' && count[s] >= math) fail(`${g}학년: 수학(${math})이 ${s}(${count[s]})보다 많아야 해요`);
  console.log(`${g}학년 ${String(list.length).padStart(3)}문제  ` + allowed.map((s) => `${s} ${count[s] || 0}`).join(' · '));
}
for (const k of Object.keys(B)) if (!/^[1-6]$/.test(k)) fail(`알 수 없는 학년 칸: ${k}`);

console.log(`모두 ${total}문제`);
if (warns.length) console.log('\n참고(실패 아님):\n  ' + warns.join('\n  '));
if (fails.length) { console.log('\nFAIL ' + fails.length + '가지:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\n모두 통과');
