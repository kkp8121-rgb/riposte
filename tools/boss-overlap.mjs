/* =============================================================================
 * RIPOSTE — tools/boss-overlap.mjs
 * 보스 차별화 검사 (브라우저 없이 node 만으로 돈다).
 *
 * 규칙(스펙 §3 공통 "신규 보스 차별화 원칙", 2026-09-18):
 *   새 보스는 먼저 등록된 보스와 (a) 실루엣이 같으면 안 되고, (b) 패턴 모양(스텝 열의 형태)이
 *   절반 이상 겹치면 안 되며, (c) 공격 구성(kind/tell 다중집합)이 거의 같으면 안 된다.
 *   (d) 2026-09-23: 챕터 2 이후 보스는 먼저 등록된 보스와 "동작 서명"이 같은 공격을 1개까지만 — 수치 변주를 공격 단위로 잡는다.
 *       kind 는 엔진이 아는 것만(기존 4종 + js/motions.js). stanceCounter 는 stance.counter 로만 불리는 공격에만.
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
  KIT_JACCARD: 0.75,      // 공격 구성(kind/tell) 자카드 유사도 (이상이면 위반)
  REUSED_ATTACKS: 1       // 챕터 2+ 보스가 먼저 등록된 보스와 동작 서명이 같은 공격을 가질 수 있는 수 (스펙 2026-09-23 §2.1)
};
/* --only=<key> — 위반 수집을 그 보스로 한정한다 (보스 하나씩 고치는 동안의 게이트). 표는 전부 찍는다 */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length) || null;

/* classic script 들을 가짜 window 에 로드 — index.html 의 보스 태그 순서를 그대로 따른다.
   js/motions.js 는 kind 목록(KNOWN_KINDS)을 위해 로드한다 — 최상위에서는 함수만 정의한다 */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bossFiles = [...html.matchAll(/src="(js\/bosses\/[^"]+)"/g)].map((m) => m[1]);
const engineFiles = ['js/config.js', 'js/rng.js'].concat(html.includes('src="js/motions.js"') ? ['js/motions.js'] : []);
const window = { BOSSES: [] }; window.window = window;
for (const f of [...engineFiles, ...bossFiles]) {
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
  if (flags.length && !me.intended && (!ONLY || ONLY === me.key)) violations.push(`${me.name}: ${flags.join(', ')}`);
  const shapeCol = me.shapes.size ? `${String(Math.round(worst.shape * 100)).padStart(3)}% vs ${worst.shapeVs.padEnd(8)}` : ' (기본 블록뿐)  ';
  console.log(`  ${me.name.padEnd(8)} ${me.silhouette.padEnd(7)} shape ${shapeCol} kit ${String(Math.round(worst.kit * 100)).padStart(3)}% vs ${worst.kitVs.padEnd(8)} → ${verdict}${flags.length && me.intended ? ' [' + flags.join(', ') + ']' : ''}`);
}

/* ---- 공격 재활용 검사 (스펙 2026-09-23 §2.1) -------------------------------
 * 동작 서명 = kind/tell + 행동을 바꾸는 표지(linger·echo). volley·anchor·수치는 넣지 않는다 —
 * 플레이어가 하는 일이 바뀌지 않기 때문이다. 반격 자세의 벌 반격(stanceCounter)은 자세 동작의 일부다.
 * 챕터 2 이후 보스는 먼저 등록된 보스들과 서명이 같은 공격을 LIMIT.REUSED_ATTACKS 개까지만 가진다.
 * 처음 쓰는 서명이 하나도 없어도 위반이다. overlapIntended 로 면제되지 않는다. */
const sigOf = (a) => a.stanceCounter ? 'stance/counter'
  : `${a.kind}/${a.tell}${a.zone && a.zone.linger ? '/linger' : ''}${a.echo ? '/echo' : ''}`;
const chapterOf = (key) => (window.CONFIG.CHAPTERS.find((c) => c.bosses.includes(key)) || { id: 0 }).id;

/* kind 이름만 새로 지어 붙인 수치 변주를 막는다 — kind 는 엔진이 아는 것(기존 4종 + js/motions.js 에 등록된 동작)만.
   MOTIONS.echo 는 kind 가 아니라 근접 정의의 표지라 제외한다 */
const CORE_KINDS = ['melee', 'projectile', 'zone', 'charge'];
const KNOWN_KINDS = new Set(CORE_KINDS.concat(Object.keys(window.MOTIONS || {}).filter((k) => k !== 'echo')));
/* stanceCounter 는 자기 선언이다 — 같은 보스의 어떤 공격이 stance.counter 로 가리키고, 패턴이 직접 부르지 않을 때만 인정 */
function stanceCounterOk(b, a) {
  const pointed = Object.values(b.attacks).some((x) => x.stance && x.stance.counter === a.id);
  const steps = [...(b.patterns[1] || []), ...(b.patterns[2] || [])].flatMap((p) => p.steps);
  const direct = steps.some((s) => s.atk === a.id || s.feint === a.id);
  return pointed && !direct;
}

console.log('');
console.log('공격 재활용 (챕터 2+) — 먼저 등록된 보스와 동작 서명이 같은 공격 / 처음 쓰는 서명');
const seen = new Map();                                    // 서명 → 처음 쓴 보스 이름
for (const b of window.BOSSES) {
  for (const a of Object.values(b.attacks)) {
    if (!KNOWN_KINDS.has(a.kind) && (!ONLY || ONLY === b.key)) violations.push(`${b.name}: 알 수 없는 kind '${a.kind}'(${a.id}) — 새 동작은 js/motions.js 에 등록한다`);
    if (a.stanceCounter && !stanceCounterOk(b, a) && (!ONLY || ONLY === b.key)) violations.push(`${b.name}: ${a.id} 의 stanceCounter 는 stance.counter 로만 불리는 공격에만 붙인다`);
  }
  const atks = Object.values(b.attacks).map((a) => ({ id: a.id, sig: sigOf(a) }));
  if (chapterOf(b.key) >= 2) {
    const reused = atks.filter((a) => seen.has(a.sig));
    const fresh = new Set(atks.filter((a) => !seen.has(a.sig)).map((a) => a.sig));
    const bad = reused.length > LIMIT.REUSED_ATTACKS || fresh.size === 0;
    if (bad && (!ONLY || ONLY === b.key)) {
      violations.push(`${b.name}: 공격 재활용 ${reused.length}개(${reused.map((a) => `${a.id}=${a.sig}←${seen.get(a.sig)}`).join(', ')}) · 새 서명 ${fresh.size}개`);
    }
    console.log(`  ${b.name.padEnd(8)} 재활용 ${reused.length} [${reused.map((a) => a.id).join(', ')}]  새 서명 ${fresh.size} [${[...fresh].join(', ')}] → ${bad ? 'VIOLATION' : 'OK'}`);
  }
  for (const a of atks) if (!seen.has(a.sig)) seen.set(a.sig, b.name);
}
console.log('');

if (violations.length) {
  console.log(`OVERLAP ${CHECK ? 'FAILED' : 'WARN'} (${violations.length}): ` + violations.join(' | '));
  process.exit(CHECK ? 1 : 0);
}
console.log('OVERLAP PASSED — 선언 없는 중복 보스 없음');
