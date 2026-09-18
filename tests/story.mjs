/* =============================================================================
 * RIPOSTE — tests/story.mjs
 * 대사 테이블(js/story.js) 검사 — 브라우저 없이 node 만으로 돈다.
 *   - 챕터 테이블의 8보스 전부에 대사가 있다
 *   - 장면(before/after)당 1~STORY.MAX_LINES 줄, 줄당 40자 이하, before 첫 줄은 콜드 오픈
 *   - 느낌표 0 (바이블 §2: 톤은 부호 예산으로 결정)
 *   - 선택지 3개(vesper·lantern·avarice): ok:true 하나 + ok:false 하나
 *   - 보스별 전속 어미가 다른 보스에 새지 않는다 (바이블 §3 표)
 *   node tests/story.mjs
 * ========================================================================== */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* classic script 를 가짜 window 에 로드한다 */
const window = {};
window.window = window;
for (const f of ['js/config.js', 'js/story.js']) {
  vm.runInNewContext(readFileSync(join(ROOT, f), 'utf8'), { window });
}
const C = window.CONFIG;
const STORY = window.STORY;

const failures = [];
function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}
const textOf = (line) => (typeof line === 'string' ? line : line.text);
const bosses = C.CHAPTERS.flatMap((ch) => ch.bosses);

check('STORY table exists', !!STORY && typeof STORY === 'object');
/* CHAPTERS 총합 = index.html 에 등록된 보스 파일 수 (정합성) — 숫자를 박지 않는다 */
const registered = [...readFileSync(join(ROOT, 'index.html'), 'utf8').matchAll(/js\/bosses\/[^"]+\.js/g)].length;
check('CHAPTERS total matches registered boss files', bosses.length === registered, `(${bosses.length} vs ${registered}: ${bosses.join(',')})`);

const allLines = [];   // { boss, text, kind }
for (const key of bosses) {
  const s = STORY[key];
  check(`${key}: has story`, !!s && Array.isArray(s.before) && Array.isArray(s.after));
  if (!s) continue;
  for (const beat of ['before', 'after']) {
    const lines = s[beat];
    check(`${key}.${beat}: 1..${C.STORY.MAX_LINES} lines`, lines.length >= 1 && lines.length <= C.STORY.MAX_LINES, `(${lines.length})`);
    lines.forEach((l, i) => allLines.push({ boss: key, text: textOf(l), kind: beat }));
    check(`${key}.${beat}: every line <= 40 chars`, lines.every((l) => [...textOf(l)].length <= 40));
  }
  check(`${key}.before[0]: cold open (hideSpeaker)`, typeof s.before[0] === 'object' && s.before[0].hideSpeaker === true);
  if (s.choice) {
    check(`${key}.choice.at is before|after`, s.choice.at === 'before' || s.choice.at === 'after');
    const oks = [s.choice.K.ok, s.choice.J.ok].filter(Boolean).length;
    check(`${key}.choice: exactly one correct answer`, oks === 1);
    allLines.push({ boss: key, text: s.choice.K.reply, kind: 'reply' });
    allLines.push({ boss: key, text: s.choice.J.reply, kind: 'reply' });
  }
}
const withChoice = bosses.filter((k) => STORY[k] && STORY[k].choice);
check('exactly 3 choices (vesper, lantern, avarice)', withChoice.join(',') === 'vesper,lantern,avarice', `(${withChoice.join(',')})`);

check('zero exclamation marks', allLines.every((l) => !/!/.test(l.text)));

/* 전속 어미 — 문장 끝(.|?) 직전 문자열 */
const leak = (re, owner) => allLines.filter((l) => l.boss !== owner && re.test(l.text)).map((l) => `${l.boss}: ${l.text}`);
check('~네 only VESPER', leak(/네[.?]/, 'vesper').length === 0, leak(/네[.?]/, 'vesper').join(' | '));
check('~거든. only SERAPH', leak(/거든\./, 'seraph').length === 0, leak(/거든\./, 'seraph').join(' | '));
check('~잖아/~는데 only MIRROR', leak(/(잖아|는데)[.?]/, 'mirror').length === 0, leak(/(잖아|는데)[.?]/, 'mirror').join(' | '));
check('~군. only BASTION', leak(/군[.?]/, 'bastion').length === 0, leak(/군[.?]/, 'bastion').join(' | '));
const lanternLines = allLines.filter((l) => l.boss === 'lantern');
const lanternPlain = lanternLines.filter((l) => !/\?$/.test(l.text.trim()));
check('LANTERN: all questions but exactly one plain line', lanternPlain.length === 1, `(${lanternPlain.map((l) => l.text).join(' | ')})`);

const short = allLines.filter((l) => [...l.text.replace(/[\s.,?…"'\/()]/g, '')].length <= 10).length;
check('>= 30% lines are 10 chars or fewer', short / allLines.length >= 0.3, `(${short}/${allLines.length})`);

console.log('');
if (failures.length) { console.log(`STORY FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log(`STORY PASSED — ${allLines.length} lines, table consistent with the bible`);
