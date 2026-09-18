/* =============================================================================
 * RIPOSTE — tools/boss-overlap.mjs
 * 보스 차별화 검사 (브라우저 없이 node 만으로 돈다).
 *
 * 규칙(스펙 §3 공통 "신규 보스 차별화 원칙", 2026-09-18):
 *   새 보스는 먼저 등록된 보스와 (a) 실루엣이 같으면 안 되고, (b) 패턴 모양(스텝 열의 형태)이
 *   절반 이상 겹치면 안 되며, (c) 공격 구성(kind/tell 다중집합)이 거의 같으면 안 된다.
 *   의도된 복제(예: MIRROR 는 챕터 1 기술을 되돌려 쓴다)는 보스 정의에
 *   `overlapIntended: '<이유>'` 를 적어 선언한다 — 선언 없는 중복은 기획 결함이다.
 *
 *   node tools/boss-overlap.mjs          # 표만 출력
 *   node tools/boss-overlap.mjs --check  # 위반이 있으면 exit 1 (PR/커밋 전 게이트)
 * ========================================================================== */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

/* 임계값 — 이 도구의 로컬 표 */
const LIMIT = {
  SHAPE_OVERLAP: 0.5,     // 내 패턴 모양 중 먼저 등록된 보스와 같은 비율 (이상이면 위반)
  KIT_JACCARD: 0.75       // 공격 구성(kind/tell) 자카드 유사도 (이상이면 위반)
};

/* classic script 들을 가짜 window 에 로드 — index.html 의 보스 태그 순서를 그대로 따른다 */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bossFiles = [...html.matchAll(/src="(js\/bosses\/[^"]+)"/g)].map((m) => m[1]);
const window = { BOSSES: [] }; window.window = window;
for (const f of ['js/config.js', 'js/rng.js', ...bossFiles]) {
  vm.runInNewContext(readFileSync(join(ROOT, f), 'utf8'), { window, CONFIG: window.CONFIG, FX: {}, RAudio: {} });
}

const shapeOf = (steps) => steps.map((s) =>
  s.atk ? 'A' : s.feint ? 'F' : s.mirror ? 'M' : s.wait !== undefined ? 'w' : s.move ? 'm:' + s.move : '?').join(' ');

/* "A" · "A w A" · "A A" 같은 기본 블록은 누구나 쓴다 — 차별화는 이동·페인트·미러가 섞인 모양으로 잰다 */
const isTrivial = (shape) => !/m:|F|M/.test(shape);

function profile(b) {
  const kit = [];
  for (const a of Object.values(b.attacks)) kit.push(`${a.kind}/${a.tell}${a.volley ? '/volley' : ''}`);
  const all = [...(b.patterns[1] || []), ...(b.patterns[2] || [])].map((p) => shapeOf(p.steps));
  const shapes = new Set(all.filter((s) => !isTrivial(s)));
  return { key: b.key, name: b.name, silhouette: b.silhouette, kit: kit.sort(), shapes, intended: b.overlapIntended || null };
}

function jaccardMulti(a, b) {
  const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  const ca = count(a), cb = count(b);
  let inter = 0, union = 0;
  for (const k of new Set([...a, ...b])) { inter += Math.min(ca[k] || 0, cb[k] || 0); union += Math.max(ca[k] || 0, cb[k] || 0); }
  return union ? inter / union : 0;
}

const profiles = window.BOSSES.map(profile);
const violations = [];
console.log('보스 차별화 표 — 먼저 등록된 보스와의 최대 유사도 (실루엣 / 패턴 모양 겹침 / 공격 구성 유사도)');
for (let i = 0; i < profiles.length; i++) {
  const me = profiles[i];
  let worst = { shape: 0, kit: 0, sil: null, shapeVs: '-', kitVs: '-' };
  for (let j = 0; j < i; j++) {
    const o = profiles[j];
    const same = [...me.shapes].filter((s) => o.shapes.has(s)).length;
    const shape = me.shapes.size ? same / me.shapes.size : 0;
    const kit = jaccardMulti(me.kit, o.kit);
    if (shape > worst.shape) { worst.shape = shape; worst.shapeVs = o.name; }
    if (kit > worst.kit) { worst.kit = kit; worst.kitVs = o.name; }
    if (o.silhouette === me.silhouette && me.silhouette !== 'mirror') worst.sil = o.name;
    if (o.silhouette === me.silhouette && me.silhouette === 'mirror' && !me.intended) worst.sil = o.name;
  }
  const flags = [];
  if (worst.sil) flags.push(`실루엣 동일(${worst.sil})`);
  if (worst.shape >= LIMIT.SHAPE_OVERLAP) flags.push(`패턴 모양 ${Math.round(worst.shape * 100)}% 겹침(${worst.shapeVs})`);
  if (worst.kit >= LIMIT.KIT_JACCARD) flags.push(`공격 구성 ${Math.round(worst.kit * 100)}% 유사(${worst.kitVs})`);
  const verdict = !flags.length ? 'OK' : (me.intended ? `의도된 복제: ${me.intended}` : 'VIOLATION');
  if (flags.length && !me.intended) violations.push(`${me.name}: ${flags.join(', ')}`);
  const shapeCol = me.shapes.size ? `${String(Math.round(worst.shape * 100)).padStart(3)}% vs ${worst.shapeVs.padEnd(8)}` : ' (기본 블록뿐)  ';
  console.log(`  ${me.name.padEnd(8)} ${me.silhouette.padEnd(7)} shape ${shapeCol} kit ${String(Math.round(worst.kit * 100)).padStart(3)}% vs ${worst.kitVs.padEnd(8)} → ${verdict}${flags.length && me.intended ? ' [' + flags.join(', ') + ']' : ''}`);
}

console.log('');
if (violations.length) {
  console.log(`OVERLAP ${CHECK ? 'FAILED' : 'WARN'} (${violations.length}): ` + violations.join(' | '));
  process.exit(CHECK ? 1 : 0);
}
console.log('OVERLAP PASSED — 선언 없는 중복 보스 없음');
