// 퀴즈 문제 덧붙이기(2026-11-27, 선생님: "같은 문제가 자주 나와. 문제 양을 3배 정도 더 늘려줘")
//   quiz/add/g1.js … g6.js(또는 g1_1.js·g1_2.js처럼 나눠서)에 `window.BANK_ADD = [ {s, q, c:[정답, 오답×3], hint}, … ]` 를 두고
//   node 광장마을/곰_시험/quiz/merge_add.mjs                  → 합친 모음을 임시 파일(/tmp/bank_merged.js)에 쓰고 경로를 알려 줌
//   node 광장마을/곰_시험/quiz/merge_add.mjs --only 3        → 3학년 덧붙임만 합쳐서 임시 파일에(쓴 사람이 혼자 점검할 때)
//   node 광장마을/곰_시험/quiz/merge_add.mjs --out 파일       → 그 파일에
//   node 광장마을/곰_시험/quiz/merge_add.mjs --write         → bank.js 자체에(합친 뒤 check_bank.mjs로 꼭 점검)
// 원래 문제는 그대로 두고 학년마다 끝에 덧붙인다 → 원래 문제 번호가 안 바뀜(기기에 적힌 '최근 낸 문제' 번호가 그대로 맞음).
// 같은 학년에 이미 있는 문제(띄어쓰기·대소문자 무시)는 건너뛰고 알려 줌.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.join(here, 'bank.js');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const only = arg('--only') ? +arg('--only') : 0;
const write = process.argv.includes('--write');
const out = write ? BANK : (arg('--out') || path.join(os.tmpdir(), only ? `bank_g${only}.js` : 'bank_merged.js'));

const src = fs.readFileSync(BANK, 'utf8');
const win = {}; vm.runInNewContext(src, { window: win });
const B = win.QUIZ_BANK;
const norm = (t) => String(t).replace(/\s+/g, ' ').trim().toLowerCase();
const q1 = (t) => "'" + String(t).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const fmt = (it) => `{ s: ${q1(it.s)}, q: ${q1(it.q)}, c: [${it.c.map(q1).join(', ')}], hint: ${q1(it.hint)} }`;

const lines = src.split('\n');
const ends = {};   // 학년 g의 닫는 줄 번호(0부터)
for (let g = 1; g <= 6; g++) {
  const start = lines.findIndex((l) => l === `${g}: [`);
  if (start < 0) throw new Error(`${g}학년 시작 줄을 못 찾았어요`);
  let e = start + 1; while (e < lines.length && !/^\],?$/.test(lines[e])) e++;
  ends[g] = e;
}
let added = 0;
for (let g = 6; g >= 1; g--) {   // 뒤 학년부터 넣어야 앞 줄 번호가 안 밀림
  if (only && g !== only) continue;
  const dir = path.join(here, 'add');   // g3.js 또는 g3_1.js·g3_2.js …(나눠 써도 됨, 이름 순서대로)
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => new RegExp(`^g${g}(_\\w+)?\\.js$`).test(n)).sort() : [];
  if (!files.length) continue;
  const add = [];
  for (const n of files) { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(dir, n), 'utf8'), { window: w }, { filename: n }); if (Array.isArray(w.BANK_ADD)) add.push(...w.BANK_ADD); }
  const have = new Set((B[g] || []).map((it) => norm(it.q)));
  const keep = [], skipped = [];
  for (const it of add) { const k = norm(it && it.q); if (have.has(k)) { skipped.push(it.q); continue; } have.add(k); keep.push(it); }
  if (skipped.length) console.log(`${g}학년: 이미 있는 문제 ${skipped.length}개 건너뜀 —`, skipped.slice(0, 5).join(' / '));
  if (!keep.length) continue;
  const e = ends[g];
  if (!lines[e - 1].endsWith(',')) lines[e - 1] += ',';
  lines.splice(e, 0, ...keep.map((it, i) => fmt(it) + (i < keep.length - 1 ? ',' : '')));
  console.log(`${g}학년 +${keep.length} (원래 ${(B[g] || []).length} → ${(B[g] || []).length + keep.length})`);
  added += keep.length;
}
fs.writeFileSync(out, lines.join('\n'));
console.log(`덧붙인 문제 ${added}개 → ${out}`);
