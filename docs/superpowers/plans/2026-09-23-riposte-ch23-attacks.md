# 챕터 2·3 공격 재설계 (동작 어휘 확장) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엔진에 새 공격 동작 9개(부메랑·협공·쓸기 빔·끌어당김·기둥·표식·반격 자세·악보·메아리)를 넣고, 챕터 2·3 보스 8명을 "챕터 1 공격의 수치 변주"가 아닌 새 동작 중심으로 다시 짠다. 판정기가 재활용을 공격 단위로 잡는다.

**Architecture:** 새 동작은 `js/motions.js` 의 `MOTIONS[kind]` 표에 모으고, `js/boss.js` 는 새 kind 가 오면 이 표로 넘기기만 한다(기존 kind 경로는 불변). 보스 몸이 아닌 곳에서 오는 타격(표식·메아리)은 `Game.resolveRemoteHit` 하나로 판정한다. 새 월드 엔티티 4종(`Beam`·`Pillar`·`Mark`·`Echo`)은 `js/entities.js`, 판정·배열·`getState` 는 `js/game.js`. 보스는 여전히 데이터 테이블이다.

**Tech Stack:** 바닐라 JS(ES5, classic `<script>`) + Canvas 2D, 빌드 없음, 외부 에셋 0. 테스트는 playwright-core 헤드리스(ESM `.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md` — §0 배정 변경(협공·표식·반격 자세 이동 + 메아리 추가)은 **사용자 채택**, 결정 기록은 스펙 §7.

**Execution:** Subagent-driven(사용자 선택 2026-09-23) — `superpowers:subagent-driven-development`. **시작은 사용자가 따로 지시할 때.** 브라우저 측정(봇·연타·하드·state 등)은 오케스트레이터가 직렬로 직접 돌린다(Global Constraints).

## Global Constraints

스펙에서 옮긴다. **모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다.**

- 플레이어 자기 공격 0개. **새 플레이어 동사 0개**. `C.RIPOSTE_KINDS` 는 바꾸지 않는다 — 새 동작의 훔친 기술은 lunge·slash·shot·slam 중 하나.
- 금 = 패리, 적 = 대시. **세 번째 텔 색을 만들지 않는다.** 반격 자세 표시는 보스 상태 표시(회색 점선 링 + 팝 `GUARD`)다.
- **예고 → 타격 시간은 공격마다 일정.** 각 동작이 이를 지키는 방식은 스펙 §3.2~3.10.
- **챕터 1(보스 1~4)의 동작은 한 줄도 바뀌지 않는다.** 새 코드는 새 kind·새 배열·`def.echo` 가 있을 때만 탄다.
- `V.MIN_X`(60)·`V.MAX_X`(900) 불변. 플레이어가 갇히지 않는다 — `C.ARENA.SAFE_MIN_W`(200).
- 매직넘버 금지 — 동작 공통 수치는 `C.MOTION`, 보스 수치는 보스 파일.
- 보스 정의(def)는 **읽기만**. 진행 상태는 공격 인스턴스 `a` 나 엔티티에 둔다(`tests/state.mjs`).
- `getState()` 는 **필드 추가만**.
- 기존 파일은 **Edit(부분 치환)만**. Write 전체 덮어쓰기 금지(동시 변경을 지운다 — handover 교훈 12). 새 파일만 Write.
- 코드는 기존 스타일: `js/` 는 ES5(`var`·`function`), 2칸 들여쓰기, 한국어 주석. 영어 기술 용어를 어색한 한자어로 직역하지 않는다.
- 🔴 **브라우저 측정은 절대 동시에 돌리지 않는다.** 실행 전 `Get-CimInstance Win32_Process -Filter "name='node.exe'" | ? { $_.CommandLine -match 'tests/' }` 가 비어 있는지 본다. **측정 중에는 `js/` 를 수정하지 않는다.**
- 🔴 채택 판정은 `--all` 과 3시드(7·11·23) 다수결. `--boss=N` 은 빠른 진단용(handover 교훈 10·14).
- 🔴 판정기가 걸리면 **수치가 아니라 공격 구성·패턴 모양을 바꾼다.**
- 🔴 **git commit 은 사용자 확인 후.** 각 태스크의 "커밋" 단계는 사용자에게 묶음 확인을 받고 실행한다. **push 는 매번 별도 확인**(push = Pages 배포 트리거). author 는 전역 설정(BHS) 그대로.
- 🔴 위임 결과의 커밋·수치 주장은 `git log --oneline`·fresh 실행으로 검증한 뒤 채택(handover 교훈 13).

## Review Focus

스펙이 암시하지만 동작 테스트가 기본으로는 안 짚는 입력 — 각 줄의 테스트는 소유 태스크에 넣었다.

1. **R 재도전·다음 보스 진입 시 새 월드 배열이 남는다** → 이전 판의 표식·기둥이 새 판에서 터진다. `clearWorld` 가 4배열을 비운다 — Task 2 테스트 `clearWorld 가 새 배열도 비운다`.
2. **부메랑이 벽 코앞에서 돈다**(플레이어가 등 뒤 벽에 붙어 있다) → 귀환이 0초에 닿는 억울한 타격. 귀환 시간을 거리로 나눈 속도로 일정하게 — Task 4 테스트 `벽에서 돌아도 귀환 → 교차가 backTime`.
3. **끌어당김이 플레이어를 보스 몸 안으로 끌거나 대시 중에도 끈다** → 몸이 겹치고 대시가 무력화. Task 3 테스트 `몸이 닿으면 멈춘다`·`대시 중에는 끌지 않는다`.
4. **악보가 Phase 2·하드·어시스트 배수에 리듬까지 바뀐다** → 콜과 응답이 어긋나 외운 것이 틀린다. 배수는 gap 에만 — Task 3 테스트 `P2 에서도 응답 간격은 콜과 같다`.
5. **표식이 보스 격파(KO) 뒤에 터진다** → 승리 연출 중 피격. `resolveRemoteHit` 의 ko 가드 — Task 6 테스트 `KO 중에는 표식이 아무것도 안 한다`.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `tools/boss-overlap.mjs` | 보스 차별화 판정기 | 공격 재활용 검사(§2.1) + `--only=<key>` |
| `js/motions.js` | **신규** — 새 동작 표 `MOTIONS` | 동작 9개 |
| `js/boss.js` | 보스 상태 머신 | 새 kind 위임 훅, `newShot`·`fire`·`volleyInterval` 추출, `a.spawns` 취소, `stanceOpen`·`punishStance`, `attackState().remote` |
| `js/entities.js` | Player·Projectile·Zone | Projectile 부메랑/등 뒤 필드 + `reflect(toward)`, 신규 `Beam`·`Pillar`·`Mark`·`Echo` |
| `js/game.js` | 상태·판정 | 새 배열 4개·spawn·update·`getState` 필드, `resolveRemoteHit`, 부메랑 회전, 기둥 충돌, 자세 벌 |
| `js/render.js` | 그리기 | 빔·기둥·표식·메아리·자세 링·악보 음표 |
| `js/audio.js` | 합성 | `RAudio.note()` |
| `js/config.js` | 상수 | `C.MOTION` 블록, `AUDIO.NOTE_HZ/MS` |
| `index.html` | 로딩 | `js/motions.js` (`js/boss.js` 바로 뒤) |
| `tests/motions.mjs` | **신규** — 동작 단위 검증 | 태스크마다 블록 추가 |
| `tests/bot.mjs` | 반응형 봇 | 새 위협 원천·`remote`·빔 방향 대시 |
| `js/bosses/lantern.js` … `adamant.js` (8개) | 보스 정의 | 공격표·패턴 재작성 |
| `docs/qa/balance-2026-09-2x.md` | 실측 | 신규 |
| `docs/qa/playtest-ch23-attacks.md` | 사람 플레이테스트 체크리스트 | 신규 |
| 스펙 §3.5~3.12 · `README.md` · `CLAUDE.md` · `docs/handover.md` | 문서 | 갱신 |

---

## Task 0: 기준선 확인

재설계 전후 비교(G3 — 챕터 1 불변)의 기준은 `docs/qa/balance-2026-09-19.md` §1~3 의 3시드 표다. 그 표를 잰 뒤 게임 코드가 안 바뀌었는지만 확인한다(새로 재지 않는다 — 한 시간이 든다).

- [ ] **Step 1: 게임 코드 무변경 확인**

Run: `git diff 8ef09be HEAD --stat -- js/ index.html`
Expected: 출력 없음. (있으면 이 계획을 멈추고 보고한다 — 기준선을 다시 재야 한다.)

- [ ] **Step 2: 기준 수치를 옮겨 적는다**

`docs/qa/balance-2026-09-19.md` §1(완벽)·§2(숙련)·§3(평균)에서 보스 1~4 행을 복사해, Task 16 이 만들 `docs/qa/balance-2026-09-2x.md` 초안 맨 위 "기준선(재설계 전)" 절에 둔다. 파일은 Task 16 에서 완성한다.

---

## Task 1: 판정기 — 공격 재활용 검사

지금 판정기는 공격 구성(kind/tell 다중집합)과 패턴 모양만 봐서 수치 변주가 통과한다. 스펙 §2.1 규칙을 코드로 박고, **현재 챕터 2·3 이 8명 전원 FAIL 하는 것**을 먼저 재현한다.

**Files:**
- Modify: `tools/boss-overlap.mjs`

**Interfaces:**
- Produces: `node tools/boss-overlap.mjs --check [--only=<boss key>]`. `--only` 는 위반 수집을 그 보스로 한정한다(표는 전부 찍는다) — Task 8~15 가 보스 하나씩 게이트로 쓴다. 공격 정의의 `stanceCounter: true` 는 서명 `stance/counter`(Task 15 가 쓴다).

- [ ] **Step 1: 상한과 `--only` 를 더한다**

`LIMIT` 블록을 바꾼다.

```js
/* 임계값 — 이 도구의 로컬 표 */
const LIMIT = {
  SHAPE_OVERLAP: 0.5,     // 내 패턴 모양 중 먼저 등록된 보스와 같은 비율 (이상이면 위반)
  KIT_JACCARD: 0.75,      // 공격 구성(kind/tell) 자카드 유사도 (이상이면 위반)
  REUSED_ATTACKS: 1       // 챕터 2+ 보스가 먼저 등록된 보스와 동작 서명이 같은 공격을 가질 수 있는 수 (스펙 2026-09-23 §2.1)
};
/* --only=<key> — 위반 수집을 그 보스로 한정한다 (보스 하나씩 고치는 동안의 게이트). 표는 전부 찍는다 */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length) || null;
```

기존 위반 수집 줄(`if (flags.length && !me.intended) violations.push(...)`)을 바꾼다.

```js
  if (flags.length && !me.intended && (!ONLY || ONLY === me.key)) violations.push(`${me.name}: ${flags.join(', ')}`);
```

- [ ] **Step 2: 재활용 검사를 더한다**

기존 표 루프가 끝난 직후(`console.log('');` 와 `if (violations.length) {` 사이)에 넣는다.

```js
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
```

`js/motions.js` 가 있으면 함께 로드한다(Task 2 부터 생긴다 — kind 목록을 알아야 한다). 기존 로드 루프를 바꾼다.

```js
/* classic script 들을 가짜 window 에 로드 — index.html 의 보스 태그 순서를 그대로 따른다.
   js/motions.js 는 kind 목록(KNOWN_KINDS)을 위해 로드한다 — 최상위에서는 함수만 정의한다 */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const bossFiles = [...html.matchAll(/src="(js\/bosses\/[^"]+)"/g)].map((m) => m[1]);
const engineFiles = ['js/config.js', 'js/rng.js'].concat(html.includes('src="js/motions.js"') ? ['js/motions.js'] : []);
const window = { BOSSES: [] }; window.window = window;
for (const f of [...engineFiles, ...bossFiles]) {
  vm.runInNewContext(readFileSync(join(ROOT, f), 'utf8'), { window, CONFIG: window.CONFIG, FX: {}, RAudio: {} });
}
```

(기존 `const html = …` 부터 `for (const f of ['js/config.js', 'js/rng.js', ...bossFiles]) { … }` 까지가 위 블록으로 바뀐다.)

파일 머리 주석의 규칙 설명에 두 줄 더한다 — `절반 이상 겹치면 안 되며, (c) 공격 구성(kind/tell 다중집합)이 거의 같으면 안 된다.` 로 끝나는 줄 바로 다음.

```js
 *   (d) 2026-09-23: 챕터 2 이후 보스는 먼저 등록된 보스와 "동작 서명"이 같은 공격을 1개까지만 — 수치 변주를 공격 단위로 잡는다.
 *       kind 는 엔진이 아는 것만(기존 4종 + js/motions.js). stanceCounter 는 stance.counter 로만 불리는 공격에만.
```

- [ ] **Step 3: 현재 상태가 FAIL 인지 확인한다**

Run: `node tools/boss-overlap.mjs --check`
Expected: exit 1, `OVERLAP FAILED (8)` 이상. 재활용 표가 스펙 §2.1 과 같다 — `LANTERN 재활용 3` · `CHORUS 4` · `BASTION 3` · `AVARICE 9` · `SENTINEL 2` · `TEMPEST 4` · `HOLLOW 4` · `ADAMANT 4`. 챕터 1(1~4)은 재활용 표에 나오지 않는다.

Run: `node tools/boss-overlap.mjs --check --only=vesper`
Expected: exit 0 (`OVERLAP PASSED`) — 챕터 1 보스는 재활용 검사 대상이 아니고 기존 검사도 통과한다.

- [ ] **Step 4: 커밋** (사용자 확인 후)

```bash
git add tools/boss-overlap.mjs
git commit -m "feat(tools): boss-overlap 공격 재활용 검사 — 챕터 2+ 는 먼저 온 보스와 동작 서명이 같은 공격 1개까지 (현재 8보스 FAIL)"
```

⚠️ 이 커밋부터 `--check`(전체)는 Task 15 가 끝날 때까지 FAIL 이다. 중간 태스크는 `--only=<key>` 로 게이트한다.

---

## Task 2: 엔진 골격 — 동작 표 위임 · 원격 판정 · 새 월드 배열

동작은 아직 하나도 없다. 새 kind 가 들어올 자리와 공용 판정만 만든다. **이 태스크 뒤에 챕터 1~3 의 동작이 한 줄도 바뀌면 안 된다.**

**Files:**
- Create: `js/motions.js`
- Create: `tests/motions.mjs`
- Modify: `index.html` (스크립트 1줄)
- Modify: `js/config.js` (`C.MOTION`)
- Modify: `js/boss.js` (위임 훅·헬퍼·`spawns`·`attackState`)
- Modify: `js/game.js` (배열 4개·spawn·update·`getState`·`resolveRemoteHit`)

**Interfaces:**
- Produces (뒤 태스크가 이 이름을 쓴다):
  - `window.MOTIONS[kind]` 항목 필드: `melee`·`noApproach`·`remote`·`canBegin(boss, def, game)→bool`·`extraWindup(def)→초`·`begin(boss, a, game)`·`tick(boss, a, dt, game)`·`active(boss, a, game)`·`activeEnd(boss, a, game)→bool`.
  - `Boss.prototype.newShot(def, dir, extra) → Projectile` · `Boss.prototype.fire(def, make)` · `Boss.prototype.volleyInterval(def) → 초`.
  - 공격 인스턴스 `a.spawns: []` — 원소에 `pending` 이 true 면 경직·페이즈 전환 때 `dead = true`.
  - `Game.prototype.spawnBeam(e)` · `spawnPillar(e)` · `spawnMark(e)` · `spawnEcho(e)`; 배열 `game.beams`·`pillars`·`marks`·`echoes`; 원소는 `update(dt, game)` 와 `dead` 를 가진다.
  - `Game.prototype.resolveRemoteHit(src)` — `src = { tell, def, damage, fromX, label, kind }`.
  - `getState()` 추가 필드 `beams:[{x,w,vx,pending}]` · `pillars:[{x,w,tRise,up}]` · `marks:[{x,tRemain,tell}]` · `echoes:[{x,reach,tell,hitAt}]`, `currentAttack.remote`·`currentAttack.stance`.
  - 테스트 하네스 `window.__T = { DT, setup(attacks, px, bx, extra), attack(id), run(sec, each, axis) }`.

- [ ] **Step 1: 실패하는 테스트를 쓴다 — `tests/motions.mjs`**

```js
/* =============================================================================
 * RIPOSTE — tests/motions.mjs
 * 새 공격 동작 단위 검증 (스펙 docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md §3).
 * 메인 루프를 멈추고(g.speed = 0) 합성 보스 하나로 월드를 직접 민다 —
 * 봇·패턴 선택·프레임 페이싱과 무관하게 "동작이 약속대로 움직이는가"만 본다.
 *
 *   node tests/motions.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!cond) failures.push(name);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?boss=1&story=0&mute=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__RIPOSTE && window.__RIPOSTE.getState().scene === 'FIGHT', null, { timeout: 8000 });

/* ---- 하네스 (페이지 안) --------------------------------------------------- */
await page.evaluate(() => {
  const g = window.__RIPOSTE.game, C = window.CONFIG, DT = C.LOOP.FIXED_DT;
  g.speed = 0;                                   // 메인 루프 정지 — 이 테스트가 직접 스텝을 민다
  window.__T = {
    DT,
    /* 합성 보스 — attacks 만 바꿔 끼운다. 패턴은 "오래 기다리기" 하나라 스스로 공격하지 않는다 */
    setup(attacks, px, bx, extra) {
      const def = Object.assign({
        key: 'test', name: 'TEST', title: 'T', color: '#ffffff', silhouette: 'player',
        hp: 999, par: 60, prefer: { close: 100, far: 400, back: 200 },
        attacks, patterns: { 1: [{ name: 'idle', steps: [{ wait: 99 }] }] }
      }, extra || {});
      g.clearWorld();
      g.player.hardReset();
      g.player.x = px;
      g.boss = new window.Boss(def, g);
      g.boss.x = bx;
      g.boss.state = 'wait'; g.boss.stateT = 99;
      g.hits = 0; g.ko = null; g.koT = 0; g.time = 0; g.lastHitBy = null;
      return def;
    },
    attack(id) { g.boss.beginAttack(id, { _approached: true }); },
    /* sec 초만큼 고정 스텝. each(g, t) 가 매 스텝 전에 불린다(입력 흉내). axis 는 이동 입력(-1/0/1) */
    run(sec, each, axis) {
      const n = Math.round(sec / DT);
      for (let i = 0; i < n; i++) {
        if (each) each(g, g.time);
        g.time += DT;
        g.stepWorld(DT, axis || 0, false);
      }
    }
  };
});

/* ---- 골격 (Task 2) -------------------------------------------------------- */
const base = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  out.hasMotions = typeof window.MOTIONS === 'object';
  const s = g.getState();
  out.fields = ['beams', 'pillars', 'marks', 'echoes'].every((k) => Array.isArray(s[k]));

  /* clearWorld 는 새 배열도 비운다 (Review Focus 1 — R 재도전·다음 보스에 표식·기둥이 남지 않게) */
  const dummy = { update() {}, dead: false };
  g.beams.push(dummy); g.pillars.push(dummy); g.marks.push(dummy); g.echoes.push(dummy);
  g.clearWorld();
  out.cleared = g.beams.length + g.pillars.length + g.marks.length + g.echoes.length === 0;

  /* 기존 reflect() 는 인자 없이 속도를 뒤집는다 */
  const pr = new window.Projectile({ x: 300, vx: -400, tell: 'gold' });
  pr.reflect();
  out.reflect = pr.vx === 400 * C.PROJECTILE.REFLECT_MULT && pr.owner === 'player';

  /* 기존 kind 의 attackState 에 remote 가 없다 */
  T.setup({ jab: { id: 'jab', label: 'JAB', tell: 'gold', kind: 'melee', windup: 0.5, active: 0.1, recover: 0.4,
                   reach: 150, approach: 0, damage: 1, swing: 'thrust', steal: null } }, 300, 420);
  T.attack('jab');
  const st = g.boss.attackState();
  out.meleeRemote = st && st.remote === undefined && st.stance === undefined;

  /* 투사체 volley — newShot/fire 추출 뒤에도 발수·간격이 같다 */
  T.setup({ tri: { id: 'tri', label: 'TRI', tell: 'gold', kind: 'projectile', windup: 0.4, active: 0.06, recover: 0.4,
                   proj: { speed: 500, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
                   volley: { count: 3, interval: 0.2 }, steal: null } }, 200, 700);
  g.player.iframes = 99;
  T.attack('tri');
  let maxShots = 0;
  T.run(0.9, (gg) => { maxShots = Math.max(maxShots, gg.projectiles.length); });
  out.volleyShots = maxShots;

  /* resolveRemoteHit — 퍼펙트는 훔치고 보스를 경직시키지 않는다 / 무입력은 피해 */
  const def = { id: 'r', label: 'R', tell: 'gold', steal: { id: 'RMT', label: 'RMT', kind: 'slash', damage: 10 } };
  T.setup({}, 300, 600);
  g.player.startParry();
  g.resolveRemoteHit({ tell: 'gold', def: def, damage: 1, fromX: 600, label: 'R', kind: 'mark' });
  out.remotePerfect = g.player.hand.length === 1 && g.player.hand[0].id === 'RMT' && g.boss.state !== 'stagger' && g.hits === 0;
  T.setup({}, 300, 600);
  g.resolveRemoteHit({ tell: 'gold', def: def, damage: 1, fromX: 600, label: 'R', kind: 'mark' });
  out.remoteHit = g.hits === 1 && g.lastHitBy && g.lastHitBy.kind === 'mark';
  return out;
});
check('MOTIONS 표가 있다', base.hasMotions);
check('getState 에 새 배열 4개', base.fields);
check('clearWorld 가 새 배열도 비운다', base.cleared);
check('기존 reflect() 는 속도를 뒤집는다', base.reflect);
check('기존 kind 의 attackState 에 remote·stance 가 없다', base.meleeRemote);
check('투사체 volley 3발 그대로', base.volleyShots === 3, `(${base.volleyShots})`);
check('resolveRemoteHit — 퍼펙트는 훔치고 보스 경직 없음', base.remotePerfect);
check('resolveRemoteHit — 무입력은 피해 1', base.remoteHit);

/* ---- 새 동작 검사는 이 줄 위에 추가한다 ------------------------------------ */

check('pageerror 0', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
if (failures.length) { console.log(`MOTIONS FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('MOTIONS PASSED — all checks green');
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/motions.mjs`
Expected: FAIL — `MOTIONS 표가 있다`·`getState 에 새 배열 4개` 등(아직 없다).

- [ ] **Step 3: 상수 블록을 넣는다 — `js/config.js`**

`ZONE: { ... },` 블록 바로 뒤에 넣는다.

```js
    /* ---- 새 공격 동작 (챕터 2·3 재설계, 스펙 2026-09-23 §3) ---------------
     * 동작 공통 규칙만. 보스별 수치(속도·폭·지연)는 보스 파일이 소유한다. */
    MOTION: {
      BOOMERANG_SPEED_MAX: 900,    // 귀환 속도 상한(px/s). 하한은 없다 — 받는 거리(PARRY.PROJECTILE_CATCH) 안에서 돌면 부서진다
      PINCER_MIN_ROOM: 160,        // 플레이어 등 뒤 공간이 이보다 좁으면 협공 스텝을 건너뛴다 (뒤 탄이 설 자리)
      PINCER_SPAWN_PAD: 20,        // 뒤 탄이 아레나 끝에서 생길 때 경계 안쪽 여유(px)
      BEAM_MIN_ROOM: 160,          // 빔이 나올 등 뒤 공간 하한 — 좁으면 예고 직후 닿는다
      BEAM_H: 200,                 // 빔 높이(그리기)
      BEAM_ALPHA: 0.55,
      BEAM_WARN_ALPHA: 0.22,       // 예고(pending) 중 빔 윤곽
      PILLAR_H: 150,
      PILLAR_ALPHA: 0.85,
      MARK_R: 30,                  // 표식 링 반지름 — 남은 시간만큼 줄어든다
      MARK_Y: 96,                  // 표식 링 중심 높이(바닥 위 px, 플레이어 머리 위)
      STANCE_POP: 'GUARD',         // 반격 자세에 리포스트가 맞았을 때 뜨는 글자
      STANCE_RING_R: 58,           // 자세 표시 링(회색 점선) 반지름 — 텔 색이 아니라 상태 표시
      SCORE_PIP_Y: 108,            // 악보 음표 줄 높이(바닥 위 px, 보스 머리 위)
      SCORE_PIP_PX: 40,            // 음표 가로 간격 = 시각(초) × 이 값 — 리듬이 눈에도 보인다
      SCORE_PIP_R: 4,
      SCORE_PIP_LIFE: 0.30,        // 음표가 울릴 때의 작은 링 수명
      ECHO_ALPHA: 0.45,            // 메아리 잔상 불투명도
      ECHO_FADE: 0.25              // 잔상이 친 뒤 사라지는 시간
    },
```

- [ ] **Step 4: 동작 표 파일 — `js/motions.js`**

```js
/* =============================================================================
 * RIPOSTE — js/motions.js
 * 새 공격 동작 표 (챕터 2·3 재설계, 스펙 docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md §3).
 * boss.js 는 def.kind 가 이 표에 있으면 여기로 넘긴다. 기존 kind(melee·projectile·zone·charge)는 여기 없다.
 *
 * 항목 필드 (전부 선택):
 *   melee      true 면 근접 판정(접근·lunge·testMelee·궤적)을 쓴다
 *   noApproach true 면 근접이라도 먼저 붙지 않는다 (끌어당김)
 *   remote     true 면 windup 끝에 몸으로 때리지 않는다 — attackState().remote (봇이 헛패리하지 않게)
 *   canBegin(boss, def, game)  false 면 그 스텝을 건너뛴다 (돌진 MIN_CHARGE_RUN 과 같은 규칙)
 *   extraWindup(def)           windup 총길이에 더할 초 (악보의 콜)
 *   begin(boss, a, game)       windup 시작 (텔 플래시 직후)
 *   tick(boss, a, dt, game)    windup 중 매 스텝
 *   active(boss, a, game)      active 시작
 *   activeEnd(boss, a, game)   active 끝. true 를 돌려주면 recover 대신 자기가 다음 단계를 정했다
 *
 * 🔴 정의(def)는 읽기만 한다. 진행 상태는 공격 인스턴스(a)나 월드 엔티티에 둔다 (tests/state.mjs).
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;
  var B = C.BOSS;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  /** 플레이어 등 뒤 방향 (보스 반대쪽): -1 = 왼쪽, 1 = 오른쪽 */
  function behindDir(boss, p) { return boss.x >= p.x ? -1 : 1; }
  /** 플레이어 등 뒤 벽까지 거리 */
  function roomBehind(boss, p) { return behindDir(boss, p) < 0 ? p.x - V.MIN_X : V.MAX_X - p.x; }

  var MOTIONS = {};

  /* ---- 동작 항목은 이 줄 위에 추가한다 ---- */

  global.MOTIONS = MOTIONS;
})(window);
```

⚠️ `clamp`·`behindDir`·`roomBehind` 는 Task 4·5 가 쓴다. 이 태스크에서는 아직 안 쓰인다.

- [ ] **Step 5: 로딩 — `index.html`**

`<script src="js/boss.js"></script>` 바로 다음 줄에 넣는다.

```html
  <script src="js/motions.js"></script>
```

- [ ] **Step 6: `js/boss.js` — 헬퍼**

`stepOpt` 함수 바로 뒤에 넣는다.

```js
  /** 새 공격 동작 표(js/motions.js). 기존 kind(melee·projectile·zone·charge)는 null — 기존 경로를 그대로 탄다 */
  function motionOf(def) { return (def && global.MOTIONS && global.MOTIONS[def.kind]) || null; }
  /** 근접 판정(접근·lunge·testMelee·궤적)을 쓰는 공격인가 — melee + 근접류 새 동작 */
  function isMelee(def) { var M = motionOf(def); return def.kind === 'melee' || !!(M && M.melee); }
```

- [ ] **Step 7: `js/boss.js` — `beginAttack` 위임**

돌진 벽 검사 블록 바로 뒤, 근접 접근 블록을 바꾼다.

```js
    // 새 동작이 지금 설 수 없다고 하면(기둥 칸 폭·빔/협공 뒷공간 부족) 그 스텝을 건너뛴다 — 돌진 MIN_CHARGE_RUN 과 같은 규칙
    var M = motionOf(def);
    if (M && M.canBegin && !M.canBegin(this, def, this.game)) { this.nextStep(); return; }

    // 근접 공격이면 사거리 안으로 먼저 붙는다 (패턴이 헛치지 않도록)
    if (isMelee(def) && !(M && M.noApproach) && !opt._approached) {
```

(기존 줄은 `if (def.kind === 'melee' && !opt._approached) {` — 그 한 줄만 위 두 블록으로 바뀐다. 블록 본문은 그대로.)

`var windupTotal = windup + hold + second;` 바로 다음 줄에 넣는다.

```js
    if (M && M.extraWindup) windupTotal += M.extraWindup(def);   // 악보의 콜 — 배수가 걸리지 않는 시간
```

공격 인스턴스 `a` 의 `zones: [],` 줄 다음에 넣는다.

```js
      spawns: [],                   // 새 동작이 깐 빔·기둥 — pending 이면 취소될 때 같이 사라진다
```

`beginAttack` 끝의 두 줄(`this.flash(def.tell);` 과 `if (this.def.onAttackStart) this.def.onAttackStart(this, a, this.game);`) 사이에 넣는다. ⚠️ `this.flash(def.tell);` 은 파일에 세 번 나온다(318·356·397행) — **`onAttackStart` 바로 앞의 것**이다.

```js
    this.flash(def.tell);
    if (M && M.begin) M.begin(this, a, this.game);
    if (this.def.onAttackStart) this.def.onAttackStart(this, a, this.game);
```

- [ ] **Step 8: `js/boss.js` — `updateAttack` 위임**

`updateAttack` 머리의 `var def = a.def;`(바로 위가 `if (!a) { this.state = 'idle'; return; }` 인 것 — 348행. 415행 `onActiveStart` 의 같은 줄과 혼동하지 않는다) 다음 줄에 `var M = motionOf(def);` 를 넣는다.

windup 분기의 feint 2차 플래시 블록 다음(근접 lunge 블록 앞)에 넣는다.

```js
      if (M && M.tick) M.tick(this, a, dt, this.game);
```

근접 lunge 조건 `if (def.kind === 'melee' && def.approach) {` 를 `if (isMelee(def) && def.approach) {` 로, active 분기의 `if (def.kind === 'melee' && !a.hasHit) this.testMelee(a);` 를 `if (isMelee(def) && !a.hasHit) this.testMelee(a);` 로 바꾼다.

active 끝의 `a.hitsDone++;` 다음 줄에 넣는다.

```js
        if (M && M.activeEnd && M.activeEnd(this, a, this.game)) return;   // 악보 — 다음 타격을 자기가 정한다
```

- [ ] **Step 9: `js/boss.js` — 투사체 생성 추출 + `onActiveStart` 위임**

`onActiveStart` 바로 앞에 넣는다.

```js
  /** 이 공격의 투사체 하나 (정의의 proj 표). extra 의 필드를 덮어쓴다 — 부메랑·협공이 쓴다 */
  Boss.prototype.newShot = function (def, dir, extra) {
    var pj = def.proj;
    var o = {
      x: this.x + dir * (B.HALF_W + 10),
      y: V.FLOOR_Y - (pj.y === undefined ? 48 : pj.y),
      vx: dir * pj.speed,
      r: pj.r || 8,
      tell: def.tell,
      damage: pj.damage === undefined ? 1 : pj.damage,
      reflectDamage: pj.reflectDamage || 0,
      shape: pj.shape || 'arrow',
      skill: def.steal || null,
      label: def.label || def.id,
      owner: 'boss'
    };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    return new Projectile(o);
  };

  /** 연사 간격 — 페이즈 2 값이 있으면 그것 */
  Boss.prototype.volleyInterval = function (def) {
    return (this.phase === 2 && def.volley.p2Interval !== undefined) ? def.volley.p2Interval : def.volley.interval;
  };

  /** 첫 발 + 연사(volley) 예약. make() 가 매 발 새 투사체를 만든다 */
  Boss.prototype.fire = function (def, make) {
    var g = this.game;
    g.spawnProjectile(make());
    // 연사(triple) — 보스 테이블의 volley 표를 그대로 쓴다
    if (def.volley) {
      var iv = this.volleyInterval(def);
      for (var i = 1; i < def.volley.count; i++) g.scheduleProjectile(iv * i, make, true);
    }
    RAudio.swing();
  };
```

`onActiveStart` 의 머리(`var g = this.game;` 다음)에 위임을 넣고, 투사체 분기를 추출한 헬퍼로 바꾼다.

```js
    var M = motionOf(def);
    if (M) {
      if (M.active) M.active(this, a, g);
      if (M.melee) this.testMelee(a);
      return;
    }

    if (def.kind === 'projectile') {
      var self = this, dir = this.dirToPlayer();
      this.fire(def, function () { return self.newShot(def, dir); });
      return;
    }
```

(기존 `if (def.kind === 'projectile') { var pj = def.proj; ... RAudio.swing(); return; }` 블록 전체가 위 5줄로 바뀐다. 동작은 같다 — `make` 가 매번 같은 필드로 새 `Projectile` 을 만든다.)

- [ ] **Step 10: `js/boss.js` — 스폰 취소 + `attackState`**

`cancelAttackSpawns` 의 `a.zones.length = 0;` 다음 줄에 넣는다.

```js
    if (a.spawns) {
      for (var j = 0; j < a.spawns.length; j++) if (a.spawns[j].pending) a.spawns[j].dead = true;   // 아직 살아나지 않은 빔·기둥
      a.spawns.length = 0;
    }
```

`attackState` 의 마지막 `return { id: a.id, kind: a.def.kind, tell: a.tell, stage: a.stage, tRemain: tRemain, hitAt: a.hitAt };` 를 바꾼다.

```js
    var st = { id: a.id, kind: a.def.kind, tell: a.tell, stage: a.stage, tRemain: tRemain, hitAt: a.hitAt };
    var M = motionOf(a.def);
    if (M && M.remote) st.remote = true;          // windup 끝에 몸으로 때리지 않는다 — 위협은 월드 배열에 있다 (스펙 2026-09-23 §3.1)
    if (a.def.kind === 'stance' && a.stage === 'windup') st.stance = true;
    return st;
```

- [ ] **Step 11: `js/game.js` — 배열 · spawn · update · 원격 판정**

생성자의 `this.pendingShots = [];` 다음에 넣는다.

```js
    /* 새 동작의 월드 엔티티 (스펙 2026-09-23 §3.1) — 빔·기둥·표식·메아리 잔상 */
    this.beams = [];
    this.pillars = [];
    this.marks = [];
    this.echoes = [];
```

`clearWorld` 에 넣는다(`this.pendingShots.length = 0;` 다음).

```js
    this.beams.length = 0;
    this.pillars.length = 0;
    this.marks.length = 0;
    this.echoes.length = 0;
```

`scheduleProjectile` 정의 바로 뒤에 넣는다.

```js
  Game.prototype.spawnBeam = function (e) { this.beams.push(e); };
  Game.prototype.spawnPillar = function (e) { this.pillars.push(e); };
  Game.prototype.spawnMark = function (e) { this.marks.push(e); };
  Game.prototype.spawnEcho = function (e) { this.echoes.push(e); };

  /** 새 동작의 월드 엔티티 — 각자 update 하고 죽으면 뺀다 */
  Game.prototype.updateMotionWorld = function (dt) {
    var lists = [this.beams, this.pillars, this.marks, this.echoes];
    for (var k = 0; k < lists.length; k++) {
      var L = lists[k];
      for (var i = L.length - 1; i >= 0; i--) {
        L[i].update(dt, this);
        if (L[i].dead) L.splice(i, 1);
      }
    }
  };

  /**
   * 원격 타격 — 보스 몸이 아닌 곳(표식 폭발·메아리 잔상)에서 온다 (스펙 2026-09-23 §3.1).
   * 퍼펙트 = 훔침, 보스 경직은 없다(멀리서 보스를 끊는 보상은 주지 않는다). 블록·무적·피해는 근접과 같다.
   * @param {{tell:string, def:object, damage:number, fromX:number, label:string, kind:string}} src
   */
  Game.prototype.resolveRemoteHit = function (src) {
    var p = this.player;
    if (this.ko) return;
    if (src.tell === 'gold') {
      var win = p.parryWindow();
      if (win === 'perfect') { this.onPerfectParry(src.def, null); return; }
      if (win === 'block') { this.onBlock(src.def, { x: src.fromX }); return; }
    }
    if (p.isInvulnerable()) return;
    this.damagePlayer(src.damage, src.fromX, 0, { label: src.label, tell: src.tell, kind: src.kind });
  };
```

`stepWorld` 의 `this.updateZones(dt);` 다음 줄에 `this.updateMotionWorld(dt);` 를 넣는다.

`getState` 의 `zones` 배열을 만든 루프 다음에 넣는다.

```js
    /* 새 동작 (스펙 2026-09-23 §3.1) — 봇·테스트가 읽는다 */
    var beams = [], pillars = [], marks = [], echoes = [];
    for (i = 0; i < this.beams.length; i++) {
      var bm = this.beams[i];
      beams.push({ x: bm.x, w: bm.w, vx: bm.vx, pending: bm.pending });
    }
    for (i = 0; i < this.pillars.length; i++) {
      var pl = this.pillars[i];
      pillars.push({ x: pl.x, w: pl.w, tRise: pl.pending ? Math.max(0, pl.t) : 0, up: pl.pending ? pl.up : Math.max(0, pl.up) });
    }
    for (i = 0; i < this.marks.length; i++) {
      var mk = this.marks[i];
      marks.push({ x: mk.x, tRemain: Math.max(0, mk.t), tell: mk.tell });
    }
    for (i = 0; i < this.echoes.length; i++) {
      var ec = this.echoes[i];
      if (ec.stage === 'hit') continue;
      echoes.push({ x: ec.x, reach: ec.reach, tell: ec.tell,
                    hitAt: this.time + (ec.stage === 'wait' ? ec.wait + ec.windup : ec.t) });
    }
```

반환 객체의 `zones: zones` 를 바꾼다.

```js
      zones: zones,
      beams: beams,
      pillars: pillars,
      marks: marks,
      echoes: echoes
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `node tests/motions.mjs`
Expected: `MOTIONS PASSED`.

Run: `node tools/boss-overlap.mjs --check --only=vesper`
Expected: `OVERLAP PASSED` — `js/motions.js` 가 로드돼도(빈 표) 챕터 1 은 그대로 통과. `알 수 없는 kind` 위반이 없다(현재 보스는 기존 4종만 쓴다).

- [ ] **Step 13: 불변 회귀 (순차)**

Run: `node tests/smoke.mjs` → `SMOKE PASSED`
Run: `node tests/state.mjs` → `STATE PASSED`
Run: `node tests/zone.mjs` → `ZONE PASSED`
Run: `node tests/bot.mjs --all --seed=7`
Expected: `BOT PASSED`. 보스별 승패가 `docs/qa/balance-2026-09-19.md` §1 seed 7 열과 같다(시간 ±2s·hits ±2 는 회차 편차 — 교훈 10). 새 kind 를 쓰는 보스가 아직 없으므로 달라질 이유가 없다.

- [ ] **Step 14: 커밋** (사용자 확인 후)

```bash
git add js/motions.js tests/motions.mjs index.html js/config.js js/boss.js js/game.js
git commit -m "feat(engine): 새 공격 동작 골격 — MOTIONS 위임·원격 판정·새 월드 배열 (기존 동작 불변)"
```

---

## Task 3: 근접류 동작 — 끌어당김 · 반격 자세 · 악보

세 동작 모두 `melee: true` — 기존 근접 판정 위에 한 가지씩 얹는다.

**Files:**
- Modify: `js/motions.js` (항목 3개)
- Modify: `js/boss.js` (`stanceOpen`·`punishStance`)
- Modify: `js/game.js` (자세 벌 2곳)
- Modify: `js/render.js` (자세 링·악보 음표)
- Modify: `js/audio.js` (`RAudio.note`)
- Modify: `js/config.js` (`AUDIO.NOTE_HZ`·`NOTE_MS`)
- Test: `tests/motions.mjs`

**Interfaces:**
- Consumes: Task 2 의 위임 훅·하네스.
- Produces: 공격 정의 형식 —
  - `kind:'pull'` + `pull:{ speed }` (근접 필드 `reach`·`damage`·`swing`·`steal`·`plunder` 그대로).
  - `kind:'stance'` + `stance:{ counter:'<공격 id>' }`. 벌 반격 정의에는 `stanceCounter: true`(판정기 서명).
  - `kind:'score'` + `score:{ notes:[간격…] }`, `windup` = 콜 뒤 gap(배수가 걸리는 유일한 부분).
  - `Boss.prototype.stanceOpen() → bool`, `Boss.prototype.punishStance()`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/motions.mjs` 의 `/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 끌어당김 · 반격 자세 · 악보 (Task 3) ---------------------------------- */
const melee3 = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG, DT = T.DT;
  const out = {};
  const HAUL = { id: 'haul', label: 'HAUL', tell: 'gold', kind: 'pull', windup: 0.9, active: 0.12, recover: 0.6,
                 reach: 150, damage: 1, swing: 'arc', pull: { speed: 170 },
                 steal: { id: 'HAUL', label: 'HAUL', kind: 'slash', damage: 20 } };

  /* 끌어당김: 가만히 있으면 끌려가 맞는다 */
  T.setup({ haul: HAUL }, 300, 520);
  T.attack('haul'); T.run(1.1);
  out.pullIdleHit = g.hits === 1;
  /* 걸어서 버티면 사거리 밖 — 헛친다 */
  T.setup({ haul: HAUL }, 300, 520);
  T.attack('haul'); T.run(1.1, null, -1);
  out.pullResist = g.hits === 0 && Math.abs(g.boss.x - g.player.x) > HAUL.reach;
  /* 몸이 닿으면 멈춘다 (Review Focus 3) */
  T.setup({ haul: HAUL }, 300, 350);
  g.player.iframes = 99;
  T.attack('haul'); T.run(0.8);
  out.pullGap = Math.abs(g.boss.x - g.player.x) >= C.PLAYER.HALF_W + C.BOSS.HALF_W + 6 - 0.5;
  /* 대시 중에는 끌지 않는다 (Review Focus 3) — 공격이 없을 때와 같은 거리만 움직인다 */
  const dashDx = (withPull) => {
    T.setup({ haul: HAUL }, 400, 700);
    if (withPull) T.attack('haul');
    g.player.startDash(-1);
    T.run(C.DASH.DURATION);
    return 400 - g.player.x;
  };
  const dx0 = dashDx(false), dx1 = dashDx(true);
  out.pullDash = Math.abs(dx1 - dx0) < 0.5;

  /* 반격 자세 */
  const GUARD = { id: 'guard', label: 'GUARD', tell: 'gold', kind: 'stance', windup: 0.9, active: 0.12, recover: 0.62,
                  reach: 190, approach: 60, damage: 1, swing: 'arc', stance: { counter: 'retort' },
                  steal: { id: 'CLEAVE', label: 'CLEAVE', kind: 'slam', damage: 24 } };
  const RETORT = { id: 'retort', label: 'RETORT', tell: 'red', kind: 'melee', windup: 0.34, active: 0.12, recover: 0.6,
                   reach: 240, approach: 0, damage: 1, swing: 'thrust', stanceCounter: true, steal: null };
  const skill = { id: 'X', label: 'X', kind: 'slash', damage: 20 };
  /* 자세 중 리포스트 → 피해 0 · 즉시 적 반격. 자세 시작엔 전용 소리(3채널 — 색·모양·소리) */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  let guardSounds = 0;
  const guardSnd = window.RAudio.guard; window.RAudio.guard = function () { guardSounds++; };
  T.attack('guard'); T.run(0.3);
  window.RAudio.guard = guardSnd;
  out.stanceSound = guardSounds === 1;
  out.stanceFlag = g.boss.attackState().stance === true;
  g.resolveRiposteHit({ skill: skill, empowered: false });
  out.stancePunish = g.boss.hp === 999 && g.boss.attack && g.boss.attack.id === 'retort' && g.boss.attack.tell === 'red';
  /* 손패 shot 도 벌 / 반사탄(fromHand 없음)은 벌이 아니다 */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard'); T.run(0.3);
  g.resolveProjectileHitBoss({ damage: 10, fromHand: skill });
  out.stanceShot = g.boss.hp === 999 && g.boss.attack && g.boss.attack.id === 'retort';
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard'); T.run(0.3);
  g.resolveProjectileHitBoss({ damage: 10, fromHand: null });
  out.stanceReflect = g.boss.hp < 999 && !(g.boss.attack && g.boss.attack.id === 'retort');
  /* 방벽이 서 있으면 방벽 판정이 먼저 — 튕기고 자세는 그대로 */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420, { wall: { hits: 2, up: 6, breakStagger: 1.6 } });
  T.attack('guard'); T.run(0.3);
  g.resolveRiposteHit({ skill: skill, empowered: false });
  out.stanceWall = g.boss.attack && g.boss.attack.id === 'guard';
  /* 참으면 끝에 금 강타 — 패리하면 CLEAVE */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard');
  let parried = false;
  T.run(1.2, (gg) => {
    const a = gg.boss.attack;
    if (!parried && a && a.id === 'guard' && a.stage === 'windup' && a.hitAt - gg.time <= 0.05) { gg.player.startParry(); parried = true; }
  });
  out.stanceBash = g.player.hand.some((s) => s.id === 'CLEAVE') && g.hits === 0;

  /* 악보 — 콜 3음 → gap → 응답 3타, 플래시는 처음 한 번뿐 */
  const REFRAIN = { id: 'refrain', label: 'REFRAIN', tell: 'gold', kind: 'score', windup: 0.6, active: 0.1, recover: 0.45,
                    reach: 150, approach: 0, damage: 1, swing: 'arc', score: { notes: [0.45, 0.9] },
                    steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 } };
  const scoreRun = (phase) => {
    T.setup({ refrain: REFRAIN }, 300, 400);
    g.boss.phase = phase;
    g.player.iframes = 99;
    let flashes = 0, notes = 0;
    const times = [];
    g.boss.flash = function () { flashes++; };
    const note = window.RAudio.note; window.RAudio.note = function () { notes++; };
    g.resolveBossHit = function () { times.push(g.time); };
    T.attack('refrain');
    T.run(4.0);
    delete g.resolveBossHit;
    window.RAudio.note = note;
    return { flashes, notes, times };
  };
  const p1 = scoreRun(1), p2 = scoreRun(2);
  const iv = (t) => t.slice(1).map((v, i) => +(v - t[i]).toFixed(3));
  out.scoreP1Data = p1; out.scoreP2Data = p2;
  out.scoreFlash = p1.flashes === 1;
  out.scoreNotes = p1.notes === 3;
  out.scoreHits = p1.times.length === 3 && Math.abs(p1.times[0] - (1.35 + 0.6)) < 0.02;
  out.scoreRhythm = iv(p1.times).every((d, i) => Math.abs(d - [0.45, 0.9][i]) < 0.02);
  out.scoreP2 = p2.times.length === 3 && p2.times[0] < p1.times[0] - 0.05 &&
                iv(p2.times).every((d, i) => Math.abs(d - [0.45, 0.9][i]) < 0.02);

  /* 실제 판정으로 세 타를 전부 퍼펙트 — 중간 퍼펙트가 보스를 경직시켜 악보를 끊으면 2·3타가 오지 않아
     TWIN 이 3장이 되지 않는다. 경직은 마지막 타격 뒤에 한 번만 */
  T.setup({ refrain: REFRAIN }, 300, 400);
  const parriedAt = new Set();
  const staggerAt = [];
  const origStagger = g.boss.stagger;
  g.boss.stagger = function (d, c) { staggerAt.push(this.attack ? this.attack.scoreIdx : -1); return origStagger.call(this, d, c); };
  T.attack('refrain');
  T.run(4.0, (gg) => {
    const a = gg.boss.attack;
    if (a && a.id === 'refrain' && a.stage === 'windup' && a.hitAt - gg.time <= 0.05 && !parriedAt.has(a.hitAt)) {
      parriedAt.add(a.hitAt); gg.player.startParry();
    }
  });
  out.scoreStaggers = staggerAt;
  out.scoreParryAll = g.player.hand.filter((s) => s.id === 'TWIN').length === 3 && g.hits === 0 &&
                      staggerAt.length === 1 && staggerAt[0] === 2;
  return out;
});
check('끌어당김 — 가만히 있으면 끌려가 맞는다', melee3.pullIdleHit);
check('끌어당김 — 걸어서 버티면 헛친다', melee3.pullResist);
check('끌어당김 — 몸이 닿으면 멈춘다', melee3.pullGap);
check('끌어당김 — 대시 중에는 끌지 않는다', melee3.pullDash);
check('반격 자세 — attackState.stance', melee3.stanceFlag);
check('반격 자세 — 시작에 전용 소리 1회', melee3.stanceSound);
check('반격 자세 — 자세 중 리포스트는 피해 0 + 적 반격', melee3.stancePunish);
check('반격 자세 — 손패 shot 도 벌', melee3.stanceShot);
check('반격 자세 — 반사탄은 벌이 아니다', melee3.stanceReflect);
check('반격 자세 — 방벽이 서 있으면 방벽이 먼저', melee3.stanceWall);
check('반격 자세 — 참으면 끝의 금 강타를 훔친다', melee3.stanceBash);
check('악보 — 플래시는 처음 한 번', melee3.scoreFlash, JSON.stringify(melee3.scoreP1Data));
check('악보 — 콜 음표 3개', melee3.scoreNotes);
check('악보 — 첫 타격 = 콜 1.35 + gap 0.6', melee3.scoreHits, JSON.stringify(melee3.scoreP1Data.times));
check('악보 — 응답 간격 = 콜 간격', melee3.scoreRhythm);
check('악보 — P2 에서도 응답 간격은 콜과 같다(gap 만 짧다)', melee3.scoreP2, JSON.stringify(melee3.scoreP2Data.times));
check('악보 — 세 타 전부 퍼펙트로 받을 수 있다(중간 경직 없음)', melee3.scoreParryAll, `(stagger at scoreIdx ${JSON.stringify(melee3.scoreStaggers)})`);
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/motions.mjs`
Expected: FAIL — 끌어당김·자세·악보 항목(`kind` 가 표에 없어 알 수 없는 kind 로 떨어진다).

- [ ] **Step 3: 상수·소리**

`js/config.js` `AUDIO` 블록의 `STEAL_GAP_MS: 60,` 다음에 넣는다.

```js
      /* 악보 음표 (스펙 2026-09-23 §3.9) — 텔이 아니라 "예고의 예고". 금 텔(2200Hz tick)과 다른 음 */
      NOTE_HZ: 1320,
      NOTE_MS: 60,
      /* 반격 자세 (스펙 2026-09-23 §3.8) — "지금 치지 마라" 상태의 소리 채널. 금 tick 과 함께 울리는 낮은 울림 */
      GUARD_HZ: 150,
      GUARD_MS: 260,
```

`js/audio.js` 의 `RAudio.tellRed` 정의 바로 뒤에 넣는다.

```js
  /** 악보 음표: 삼각파 짧은 음 (금 텔과 구분된다) */
  RAudio.note = function () {
    if (!ok()) return;
    tone('triangle', A.NOTE_HZ, now(), A.NOTE_MS / 1000, 0.14);
  };

  /** 반격 자세: 낮은 사각파 울림 — 자세 표시(회색 점선 링)의 소리 채널 (색·모양·소리 3채널, 스펙 §2.2) */
  RAudio.guard = function () {
    if (!ok()) return;
    tone('square', A.GUARD_HZ, now(), A.GUARD_MS / 1000, 0.10);
  };
```

- [ ] **Step 4: 동작 항목 3개 — `js/motions.js`**

`/* ---- 동작 항목은 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
  /* ---- 끌어당김 (§3.5 AVARICE) -------------------------------------------
   * windup 동안 플레이어를 보스 쪽으로 끈다. pull.speed < PLAYER.SPEED 라 걸어서 버틸 수 있다 —
   * 버티면 사거리 밖에서 헛친다. 대시 중에는 끌지 않는다. */
  MOTIONS.pull = {
    melee: true,
    noApproach: true,                                  // 보스가 오지 않고 플레이어를 부른다
    tick: function (boss, a, dt, g) {
      var p = g.player;
      if (p.dashT > 0 || g.ko) return;
      var dir = boss.x >= p.x ? 1 : -1;                // 플레이어 → 보스
      var room = Math.abs(boss.x - p.x) - (C.PLAYER.HALF_W + B.HALF_W + 6);
      if (room <= 0) return;                           // 몸이 닿으면 멈춘다
      p.x += dir * Math.min(room, a.def.pull.speed * dt);
    }
  };

  /* ---- 반격 자세 (§3.8 ADAMANT) ------------------------------------------
   * windup = 자세. 이 동안 맞으면 벌(game.js → boss.punishStance), 참으면 끝에 금 강타.
   * 자세 표시는 색(회색)·모양(점선 링, render.js)·소리(RAudio.guard) 3채널이다. */
  MOTIONS.stance = {
    melee: true,
    begin: function () { RAudio.guard(); }
  };

  /* ---- 악보 (§3.9 CHORUS) ------------------------------------------------
   * 콜: 첫 플래시와 함께 음표를 notes 간격대로 들려준다. 응답: gap 뒤 같은 간격으로 친다, 플래시 없이.
   * 배수(P2·하드·어시스트)는 gap(def.windup)에만 걸린다 — 콜과 응답의 리듬은 불변. */
  function scoreNotes(def) {                          // 모든 간격은 MIN_VOLLEY_GAP 이상 — 받고 다음을 받을 수 있어야 한다
    var n = def.score.notes, out = [];
    for (var i = 0; i < n.length; i++) out.push(Math.max(B.MIN_VOLLEY_GAP, n[i]));
    return out;
  }
  function scorePip(boss) {
    FX.ring(boss.x, V.FLOOR_Y - C.MOTION.SCORE_PIP_Y, 2, 12, C.COLORS.GOLD, C.MOTION.SCORE_PIP_LIFE, 2);
    RAudio.note();
  }
  MOTIONS.score = {
    melee: true,
    /* 남은 타격이 있으면 퍼펙트 패리가 보스를 경직시키지 않는다 — 경직은 공격을 지워 악보를 끊는다 (game.js onPerfectParry) */
    holdOnParry: function (a) { return a.scoreIdx < scoreNotes(a.def).length; },
    extraWindup: function (def) {
      var n = scoreNotes(def), s = 0;
      for (var i = 0; i < n.length; i++) s += n[i];
      return s;
    },
    begin: function (boss, a) {
      var n = scoreNotes(a.def), t = 0;
      a.callAt = [0];
      for (var i = 0; i < n.length; i++) { t += n[i]; a.callAt.push(t); }
      a.callNext = 1;
      a.scoreIdx = 0;
      scorePip(boss);                                  // 첫 음표 = 텔 플래시와 같은 순간
    },
    tick: function (boss, a) {
      if (a.scoreIdx > 0) return;                      // 응답(타격) 중에는 음표가 없다
      var elapsed = a.windupTotal - a.t;
      while (a.callNext < a.callAt.length && elapsed >= a.callAt[a.callNext]) { scorePip(boss); a.callNext++; }
    },
    activeEnd: function (boss, a, g) {
      var n = scoreNotes(a.def);
      if (a.scoreIdx >= n.length) return false;         // 마지막 타격 — 평소대로 recover
      var wait = n[a.scoreIdx] - (a.def.active === undefined ? 0.08 : a.def.active);
      a.scoreIdx++;
      a.stage = 'windup';
      a.t = wait;
      a.windupTotal = wait;
      a.hitAt = g.time + wait;
      a.hasHit = false;
      a.lungeDone = 0;
      a.feintFlashed = true;                            // 플래시 없음 — 콜에서 들려준 리듬 그대로 친다
      return true;
    }
  };
```

- [ ] **Step 5: 자세 벌 — `js/boss.js`**

`interrupt` 정의 바로 뒤에 넣는다.

```js
  /** 반격 자세(스펙 2026-09-23 §3.8) 중인가 — 이 윈드업은 카운터 창이 아니라 벌 창이다 */
  Boss.prototype.stanceOpen = function () {
    var a = this.attack;
    return !this.dead && this.state === 'attack' && !!a && a.stage === 'windup' && a.def.kind === 'stance';
  };

  /** 자세 중에 맞았다 — 진행 중 공격을 버리고 곧바로 반격(def.stance.counter, 접근 없음). 피해 0, 손패 환급 없음 */
  Boss.prototype.punishStance = function () {
    var id = this.attack.def.stance.counter;
    this.cancelAttackSpawns();
    this.attack = null;
    FX.pop(C.MOTION.STANCE_POP, this.x, V.FLOOR_Y - B.HEIGHT - 16, C.COLORS.GREY, { size: 17 });
    RAudio.parryBlock();
    this.beginAttack(id, { _approached: true });
  };
```

`js/game.js` `resolveRiposteHit` 의 `if (!b || b.dead) return;` 다음 줄에 넣는다.

```js
    // 반격 자세(스펙 2026-09-23 §3.8) — 참지 못한 리포스트는 피해 0, 곧바로 적 반격. 방벽 판정이 먼저다
    if (!b.wallUp() && b.stanceOpen()) { b.punishStance(); return; }
```

`resolveProjectileHitBoss` 의 `var b = this.boss;` 다음 줄에 넣는다.

```js
    // 손패 shot 도 "참지 못한" 리포스트다. 반사탄(fromHand 없음)은 자세를 건드리지 않는다
    if (pr.fromHand && !b.wallUp() && b.stanceOpen()) { b.punishStance(); return; }
```

`onPerfectParry` 의 보스 경직 줄을 바꾼다(악보의 남은 타격을 지키는 `holdOnParry`).

```js
    if (projectile) projectile.reflect();
    else if (boss && !boss.dead && !this.bossIsInvulnerable(boss) && !this.parryHolds(boss)) {
      boss.stagger(C.PARRY.FLINCH, false);   // 포효 중이면 경직으로 덮어쓰지 않는다
    }
```

(기존: `else if (boss && !boss.dead && !this.bossIsInvulnerable(boss)) {` — 조건 하나만 더한다. 첫 줄 `projectile.reflect()` 는 Task 4 가 다시 바꾼다.)

`onPerfectParry` 정의 바로 앞에 넣는다.

```js
  /** 진행 중인 새 동작이 퍼펙트 패리의 경직을 막는가 (악보 — 남은 타격이 있다, 스펙 2026-09-23 §3.9) */
  Game.prototype.parryHolds = function (boss) {
    var a = boss.attack, M = a && global.MOTIONS ? global.MOTIONS[a.def.kind] : null;
    return !!(M && M.holdOnParry && M.holdOnParry(a));
  };
```

- [ ] **Step 6: 그리기 — `js/render.js`**

`drawBossTells` 에서 근접 궤적 조건 `if (b.attack && b.attack.stage === 'active' && b.attack.def.kind === 'melee') {` 를 바꾼다(근접류 새 동작도 궤적을 그린다).

```js
    var Mk = b.attack && global.MOTIONS ? global.MOTIONS[b.attack.def.kind] : null;
    if (b.attack && b.attack.stage === 'active' && (b.attack.def.kind === 'melee' || (Mk && Mk.melee))) {
```

`drawBossTells` 함수 끝(닫는 `}` 바로 앞)에 넣는다.

```js
    // 반격 자세 — 회색 점선 링. 텔 색이 아니라 "지금 치면 안 된다"는 상태 표시 (스펙 2026-09-23 §2.3)
    var M = C.MOTION;
    if (b.attack && b.attack.stage === 'windup' && b.attack.def.kind === 'stance') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = C.COLORS.GREY;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(b.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.55, M.STANCE_RING_R, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 악보 콜 — 음표 줄. 가로 간격 = 시각 × SCORE_PIP_PX 라 리듬이 보인다. 울린 음표만 금색
    var sa = b.attack;
    if (sa && sa.def.kind === 'score' && sa.scoreIdx === 0 && sa.callAt) {
      var span = sa.callAt[sa.callAt.length - 1] * M.SCORE_PIP_PX;
      var x0 = b.x - span / 2, py = V.FLOOR_Y - M.SCORE_PIP_Y;
      ctx.save();
      for (var i = 0; i < sa.callAt.length; i++) {
        var lit = i < sa.callNext;
        ctx.globalAlpha = lit ? 1 : 0.35;
        ctx.fillStyle = lit ? C.COLORS.GOLD : C.COLORS.GREY;
        ctx.beginPath();
        ctx.arc(x0 + sa.callAt[i] * M.SCORE_PIP_PX, py, M.SCORE_PIP_R, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
```

(`js/render.js` 의 IIFE 인자 이름은 `global`, `TAU`·`clamp` 는 파일 머리에 이미 있다 — 확인됨.)

- [ ] **Step 7: 테스트 통과 + 회귀**

Run: `node tests/motions.mjs` → `MOTIONS PASSED`
Run: `node tests/audio-smoke.mjs` → 통과(새 공개 메서드 `note`·`guard` 도 자동 호출된다)
Run: `node tests/smoke.mjs` → `SMOKE PASSED`

- [ ] **Step 8: 커밋** (사용자 확인 후)

```bash
git add js/motions.js js/boss.js js/game.js js/render.js js/audio.js js/config.js tests/motions.mjs
git commit -m "feat(motion): 끌어당김·반격 자세·악보 — 근접류 새 동작 3종 + 단위 검증"
```

---

## Task 4: 투사체류 동작 — 부메랑 · 협공

**Files:**
- Modify: `js/entities.js` (Projectile 필드 + `reflect(toward)`)
- Modify: `js/motions.js` (항목 2개)
- Modify: `js/game.js` (`turnBoomerang`·귀환 포획·반사 방향)
- Test: `tests/motions.mjs`

**Interfaces:**
- Consumes: `Boss.newShot/fire/volleyInterval`(Task 2).
- Produces: 공격 정의 형식 —
  - `kind:'boomerang'` + `proj` + `boomerang:{ turnDist, backTime, backTell }`. 정의 `tell` = 나갈 때 색.
  - `kind:'pincer'` + `proj`(앞 탄, volley 가능) + `pincer:{ backDist, backSpeed, backTell, gap, y, r, shape }`. 정의 `tell` = 앞 탄 색.
  - `Projectile` 필드 `boomerang`·`returning`·`fromBehind`, `Projectile.prototype.reflect(toward)` — `toward`(±1)가 있으면 그 방향으로, 없으면 기존대로 뒤집는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 부메랑 · 협공 (Task 4) ------------------------------------------------ */
const shots = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const ORB = { id: 'orb', label: 'ORB', tell: 'red', kind: 'boomerang', windup: 0.6, active: 0.06, recover: 0.5,
                proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                boomerang: { turnDist: 200, backTime: 0.6, backTell: 'gold' },
                steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 } };
  const bossShot = () => g.projectiles.find((p) => p.owner === 'boss' || p.boomerang);

  /* 적으로 와서 대시로 넘기고 → 등 뒤에서 금으로 돌아온다 → 받으면 보스 쪽으로 반사 + 훔침 */
  T.setup({ orb: ORB }, 400, 750);
  T.attack('orb');
  out.orbRemote = g.boss.attackState().remote === true;
  let dashed = false, parried = false, turn = null;
  T.run(4.0, (gg) => {
    const pr = bossShot(); if (!pr) return;
    const p = gg.player, d = Math.abs(pr.x - p.x);
    if (!pr.returning && !dashed && d < 60) { p.startDash(1); dashed = true; }
    if (pr.returning && !turn) turn = { tell: pr.tell, vx: pr.vx, behind: pr.x < p.x };
    if (pr.returning && pr.owner === 'boss' && !parried && d <= 45) { p.startParry(); parried = true; }
  });
  out.orbTurn = turn && turn.tell === 'gold' && turn.vx > 0 && turn.behind;
  out.orbSteal = g.player.hand.some((s) => s.id === 'ORB') && g.hits === 0;
  out.orbToBoss = g.boss.hp < 999;                 // 반사된 귀환탄이 보스를 맞혔다 (벽 쪽으로 갔다면 hp 그대로)

  /* 보스가 귀환 경로 위(플레이어와 도는 지점 사이)에 서 있어도 귀환탄은 플레이어까지 온다 */
  T.setup({ orb: ORB }, 400, 750);
  g.player.iframes = 99;
  T.attack('orb');
  let reached = false, moved = false;
  T.run(4.0, (gg) => {
    const pr = gg.projectiles.find((p) => p.boomerang); if (!pr) return;
    if (pr.returning && !moved) { gg.boss.x = gg.player.x - 110; moved = true; }   // LANTERN P2 orb-behind-flicker 자리
    if (pr.returning && Math.abs(pr.x - gg.player.x) <= C.PROJECTILE.HIT_DIST) reached = true;
  });
  out.orbPassBoss = moved && reached;

  /* 벽 코앞(받는 거리 안)에서 돌게 되면 부서진다 — 예고와 타격이 같은 순간이 되지 않게 */
  T.setup({ orb: ORB }, 90, 800);
  g.player.iframes = 99;
  T.attack('orb');
  let returned = false;
  T.run(4.0, () => { if (g.projectiles.some((p) => p.boomerang && p.returning)) returned = true; });
  out.orbWallBreak = !returned && g.projectiles.every((p) => !p.boomerang);

  /* 두 번째 텔 → 교차가 backTime 으로 일정 — 보통 거리와 벽 코앞 (Review Focus 2) */
  const crossTime = (px) => {
    T.setup({ orb: ORB }, px, 800);
    g.player.iframes = 99;
    T.attack('orb');
    let t0 = null, t1 = null, lastSide = null;
    T.run(5.0, (gg) => {
      const pr = g.projectiles.find((p) => p.boomerang); if (!pr) return;
      if (pr.returning && t0 === null) { t0 = gg.time; lastSide = Math.sign(pr.x - gg.player.x); }
      if (t0 !== null && t1 === null) {
        const side = Math.sign(pr.x - gg.player.x);
        if (side !== lastSide) t1 = gg.time;
      }
    });
    return t0 === null || t1 === null ? null : +(t1 - t0).toFixed(3);
  };
  out.crossOpen = crossTime(400);
  out.crossWall = crossTime(130);
  out.orbConst = out.crossOpen !== null && out.crossWall !== null &&
                 Math.abs(out.crossOpen - 0.6) < 0.03 && Math.abs(out.crossWall - 0.6) < 0.03;

  /* 협공 — 앞(금) 뒤 gap 초에 등 뒤(적) */
  const SQUALL = { id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer', windup: 0.6, active: 0.06, recover: 0.6,
                   proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                   pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
                   steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 } };
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  out.pincerRemote = g.boss.attackState().remote === true;
  let front = null, rear = null, rearInfo = null;
  T.run(3.0, (gg) => {
    const p = gg.player;
    for (const pr of gg.projectiles) {
      if (pr.owner !== 'boss') continue;
      const d = Math.abs(pr.x - p.x);
      if (pr.tell === 'gold' && !pr.fromBehind && front === null && d <= C.PARRY.PROJECTILE_CATCH) front = gg.time;
      if (pr.fromBehind) {
        if (!rearInfo) rearInfo = { tell: pr.tell, behind: pr.x < p.x, vx: pr.vx };
        if (rear === null && d <= C.PARRY.PROJECTILE_CATCH) rear = gg.time;
      }
    }
  });
  out.pincerGap = front !== null && rear !== null ? +(rear - front).toFixed(3) : null;
  out.pincerOk = out.pincerGap !== null && Math.abs(out.pincerGap - 0.45) < 0.03 &&
                 rearInfo.tell === 'red' && rearInfo.behind && rearInfo.vx > 0;
  /* 등 뒤 공간이 없으면 스텝을 건너뛴다 */
  T.setup({ squall: SQUALL }, 150, 700);
  T.attack('squall');
  out.pincerSkip = g.boss.attack === null;
  /* 예고 뒤 플레이어가 벽으로 물러서면 뒤 탄은 생기지 않는다 (몸 위에 예고 없이 생기지 않게) */
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  T.run(0.3);
  g.player.x = 70;
  let rearSeen = false;
  T.run(2.5, (gg) => { if (gg.projectiles.some((p) => p.fromBehind)) rearSeen = true; });
  out.pincerRetreat = !rearSeen;
  return out;
});
check('부메랑 — attackState.remote', shots.orbRemote);
check('부메랑 — 적으로 가서 등 뒤에서 금으로 돌아온다', shots.orbTurn);
check('부메랑 — 귀환탄을 받으면 훔치고 무피격', shots.orbSteal);
check('부메랑 — 받은 귀환탄은 보스 쪽으로 가서 맞힌다', shots.orbToBoss);
check('부메랑 — 보스가 귀환 경로 위에 있어도 플레이어까지 온다', shots.orbPassBoss);
check('부메랑 — 벽 코앞에서 돌게 되면 부서진다', shots.orbWallBreak);
check('부메랑 — 두 번째 텔 → 교차 = backTime (보통 거리)', shots.orbConst, `(open ${shots.crossOpen} · wall ${shots.crossWall})`);
check('협공 — attackState.remote', shots.pincerRemote);
check('협공 — 앞 금 → gap 뒤 등 뒤 적', shots.pincerOk, `(gap ${shots.pincerGap})`);
check('협공 — 등 뒤 공간이 없으면 건너뛴다', shots.pincerSkip);
check('협공 — 예고 뒤 벽으로 물러서면 뒤 탄이 생기지 않는다', shots.pincerRetreat);
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/motions.mjs`
Expected: FAIL — 부메랑·협공 항목.

- [ ] **Step 3: `Projectile` — `js/entities.js`**

생성자의 `this.trail = [];` 다음에 넣는다.

```js
    /* 새 동작 (스펙 2026-09-23 §3.2·3.3) */
    this.boomerang = o.boomerang || null;   // 부메랑 표 {turnDist, backTime, backTell} — 정의 공유, 읽기만
    this.returning = false;                 // 부메랑이 돌아서 오는 중
    this.fromBehind = !!o.fromBehind;       // 협공 뒤 탄 — 플레이어 등 뒤에서 생겼다
```

`reflect` 를 바꾼다.

```js
  /**
   * 퍼펙트 패리 반사. toward(±1)가 있으면 그 방향으로 보낸다 — 등 뒤에서 온 탄(부메랑 귀환·협공 뒤 탄)만 넘긴다.
   * 없으면 기존대로 속도를 뒤집는다 (보스 쪽에서 온 탄은 뒤집으면 보스 쪽이다).
   */
  Projectile.prototype.reflect = function (toward) {
    var speed = Math.abs(this.vx) * C.PROJECTILE.REFLECT_MULT;
    this.vx = (toward === undefined || toward === null) ? -this.vx * C.PROJECTILE.REFLECT_MULT : toward * speed;
    this.owner = 'player';
    this.tell = 'player';
    this.color = C.COLORS.PLAYER;
    this.damage = this.reflectDamage || this.damage;
    this.trail.length = 0;
    this.deflectTried = false;           // 새 왕복 — 보스가 다시 되받을 수 있다
  };
```

- [ ] **Step 4: 동작 항목 2개 — `js/motions.js`**

`/* ---- 동작 항목은 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
  /* ---- 부메랑 (§3.2 LANTERN) ---------------------------------------------
   * 나간다(def.tell) → 플레이어를 turnDist 지나거나 벽에서 돈다(game.turnBoomerang) → backTell 로 돌아온다. */
  MOTIONS.boomerang = {
    remote: true,
    active: function (boss, a) {
      var def = a.def, dir = boss.dirToPlayer();
      boss.fire(def, function () { return boss.newShot(def, dir, { boomerang: def.boomerang }); });
    }
  };

  /* ---- 협공 (§3.3 TEMPEST) -----------------------------------------------
   * 앞 탄(마지막 발)이 받는 거리에 닿고 gap 초 뒤, 등 뒤 backDist 에서 생긴 탄이 받는 거리에 닿도록 예약한다.
   * 뒤 탄은 생기는 순간 그 자리에서 텔 버스트 — 생성 → 도착이 일정하다. */
  function backShot(boss, def, g) {
    var pc = def.pincer, p = g.player, side = behindDir(boss, p);
    var pad = C.MOTION.PINCER_SPAWN_PAD;
    // 그새 플레이어가 등 뒤 벽으로 물러섰다 — 뒤 탄이 몸 위에 예고 없이 생기므로 쏘지 않는다 (null = 발사 취소)
    if (roomBehind(boss, p) - pad < C.MOTION.PINCER_MIN_ROOM) return null;
    var x = clamp(p.x + side * pc.backDist, V.MIN_X + pad, V.MAX_X - pad);
    var y = V.FLOOR_Y - pc.y;
    var red = pc.backTell === 'red';
    FX.tellBurst(x, y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
    return new Projectile({
      x: x, y: y, vx: -side * pc.backSpeed, r: pc.r, tell: pc.backTell,
      damage: pc.damage === undefined ? 1 : pc.damage, reflectDamage: pc.reflectDamage || 0, shape: pc.shape || 'bolt',
      skill: red ? null : (def.steal || null), label: def.label || def.id,
      owner: 'boss', fromBehind: true
    });
  }
  MOTIONS.pincer = {
    remote: true,
    canBegin: function (boss, def, g) { return roomBehind(boss, g.player) >= C.MOTION.PINCER_MIN_ROOM; },
    active: function (boss, a, g) {
      var def = a.def, pc = def.pincer, p = g.player, dir = boss.dirToPlayer();
      boss.fire(def, function () { return boss.newShot(def, dir); });
      var catchD = C.PARRY.PROJECTILE_CATCH;
      var lastFront = def.volley ? boss.volleyInterval(def) * (def.volley.count - 1) : 0;
      var spawnX = boss.x + dir * (B.HALF_W + 10);
      var eta = Math.max(0, Math.abs(p.x - spawnX) - catchD) / def.proj.speed + lastFront;
      var backTravel = Math.max(0, pc.backDist - catchD) / pc.backSpeed;
      g.scheduleProjectile(Math.max(0, eta + pc.gap - backTravel), function () { return backShot(boss, def, g); }, false);
    }
  };
```

- [ ] **Step 5: 회전·포획·반사 방향 — `js/game.js`**

`stepWorld` 의 예약 발사 루프에서 `make()` 가 null 을 돌려줄 수 있게 한다(협공 뒤 탄 취소). 기존 두 줄을 바꾼다.

```js
        var proj = ps.make();
        if (!proj) continue;                 // 발사 취소 (협공 뒤 탄 — 등 뒤 공간이 사라졌다). 기존 make 는 null 을 돌려주지 않는다
        this.spawnProjectile(proj);
```

(기존: `var proj = ps.make();` 다음 줄이 바로 `this.spawnProjectile(proj);`.)

`updateProjectiles` 의 `pr.update(dt);` 다음에 넣는다.

```js
      // 부메랑(스펙 2026-09-23 §3.2) — 플레이어를 turnDist 지나거나 아레나 끝에 닿으면 돌아온다
      if (pr.boomerang && !pr.returning && pr.owner === 'boss') this.turnBoomerang(pr);
      if (pr.dead) { this.projectiles.splice(i, 1); continue; }        // 벽 코앞에서 부서진 부메랑
      // 받지 못한 귀환탄·등 뒤 탄은 **플레이어를 지나간 뒤** 보스에 닿으면 사라진다 (보스가 받는다).
      // 지나가기 전이면 보스 몸을 그냥 통과한다 — 보스가 순간이동해 귀환 경로 위에 서 있어도 탄을 먹지 않게
      if (pr.owner === 'boss' && (pr.returning || pr.fromBehind) && b &&
          (pr.x - p.x) * pr.vx > 0 && Math.abs(pr.x - b.x) <= C.BOSS.HALF_W) {
        this.projectiles.splice(i, 1);
        continue;
      }
```

`updateProjectiles` 정의 바로 뒤에 넣는다.

```js
  /**
   * 부메랑 회전. 속도 = 남은 거리 / backTime — 벽 코앞에서 돌아도 "두 번째 텔 → 교차"가 backTime 으로 일정하다.
   * 도는 순간 그 자리에서 텔 버스트(두 번째 예고). 플레이어가 벽에 붙어 받는 거리 안에서 돌게 되면 부서진다 —
   * 예고와 타격이 같은 순간이 되는 억울한 귀환을 만들지 않는다.
   */
  Game.prototype.turnBoomerang = function (pr) {
    var p = this.player, bm = pr.boomerang;
    var dir = pr.vx >= 0 ? 1 : -1;
    var past = (pr.x - p.x) * dir;                                  // 플레이어를 지나간 거리
    var atWall = (dir > 0 && pr.x >= V.MAX_X) || (dir < 0 && pr.x <= V.MIN_X);
    if (past < bm.turnDist && !atWall) return;
    var dist = Math.abs(pr.x - p.x);
    if (dist <= C.PARRY.PROJECTILE_CATCH) {                          // 벽 코앞 — 돌 자리가 없다
      FX.sparks(pr.x, pr.y, C.FX.BLOCK_SPARKS, pr.color, { speed: 160, life: 0.3, size: 2 });
      pr.dead = true;
      return;
    }
    var speed = Math.min(C.MOTION.BOOMERANG_SPEED_MAX, dist / bm.backTime);
    var red = bm.backTell === 'red';
    pr.returning = true;
    pr.vx = -dir * speed;
    pr.tell = bm.backTell;
    pr.color = red ? C.COLORS.RED : C.COLORS.GOLD;
    pr.pierced = false;
    pr.trail.length = 0;
    FX.tellBurst(pr.x, pr.y, pr.color, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
  };
```

`onPerfectParry` 의 `if (projectile) projectile.reflect();` 를 바꾼다.

```js
    // 등 뒤에서 온 탄(부메랑 귀환·협공 뒤 탄)은 뒤집으면 벽으로 간다 — 보스 쪽으로 보낸다
    if (projectile) projectile.reflect((projectile.returning || projectile.fromBehind) && boss
      ? (boss.x >= projectile.x ? 1 : -1) : undefined);
```

- [ ] **Step 6: 테스트 통과 + 회귀**

Run: `node tests/motions.mjs` → `MOTIONS PASSED`
Run: `node tests/bot.mjs --all --seed=7` → `BOT PASSED`, 승패가 Task 2 Step 13 과 같다(투사체 생성 경로가 바뀌었으므로 챕터 1 투사체 보스 SERAPH·GRAVEN·MIRROR 를 특히 본다).

- [ ] **Step 7: 커밋** (사용자 확인 후)

```bash
git add js/entities.js js/motions.js js/game.js tests/motions.mjs
git commit -m "feat(motion): 부메랑·협공 — 등 뒤에서 오는 투사체, 반사는 보스 쪽으로"
```

---

## Task 5: 월드 엔티티 동작 — 쓸기 빔 · 기둥

**Files:**
- Modify: `js/entities.js` (`Beam`·`Pillar`)
- Modify: `js/motions.js` (항목 2개)
- Modify: `js/game.js` (`onBeamTouch`·`onPillarRise`·`blockByPillars`)
- Modify: `js/render.js` (`drawBeam`·`drawPillar`·`drawHazards`)
- Test: `tests/motions.mjs`

**Interfaces:**
- Consumes: `game.spawnBeam/spawnPillar`·`a.spawns`(Task 2).
- Produces: 공격 정의 형식 —
  - `kind:'sweep'` + `beam:{ w, speed, damage }`. 정의 `tell` = 'red'.
  - `kind:'pillar'` + `pillar:{ w, up, dist, count, damage }`(count 1 = 등 뒤, 2 = 등 뒤 + 플레이어와 보스 사이). 정의 `tell` = 'red'.
  - `window.Beam`·`window.Pillar`(`side` 필드 — 설 때 플레이어가 있던 쪽).
  - `Game.prototype.cellWidth(px, extra) → px` 가 든 칸의 폭(기둥·벽 사이). `Game.prototype.blockByPillars()`(인자 없음, `stepWorld` 에서 두 번).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 쓸기 빔 · 기둥 (Task 5) ------------------------------------------------ */
const area = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const LINE = { id: 'line', label: 'LINE', tell: 'red', kind: 'sweep', windup: 0.85, active: 0.06, recover: 0.6,
                 beam: { w: 90, speed: 320, damage: 1 }, steal: null };
  /* 빔 — 가만히 있으면 맞는다 */
  T.setup({ line: LINE }, 300, 700);
  T.attack('line');
  out.beamRemote = g.boss.attackState().remote === true;
  out.beamPendingSafe = (() => { T.run(0.8); return g.hits === 0 && g.beams.length === 1 && g.beams[0].pending; })();
  T.run(2.0);
  out.beamIdle = g.hits === 1 && g.lastHitBy && g.lastHitBy.kind === 'beam';
  /* 빔 반대쪽(보스 쪽)으로 대시하면 따라잡혀 맞는다 / 빔 쪽으로 대시하면 넘는다 */
  const dashRun = (dir) => {
    T.setup({ line: LINE }, 300, 700);
    T.attack('line');
    let dashed = false;
    T.run(3.0, (gg) => {
      const bm = gg.beams[0]; if (!bm || bm.pending || dashed) return;
      const front = bm.x + bm.w / 2, back = gg.player.x - C.PLAYER.HALF_W;
      if (back - front <= 20) { gg.player.startDash(dir); dashed = true; }
    });
    return g.hits;
  };
  out.beamWrong = dashRun(1) === 1;
  out.beamRight = dashRun(-1) === 0;
  /* 등 뒤 공간이 없으면 건너뛴다 */
  T.setup({ line: LINE }, 100, 700);
  T.attack('line');
  out.beamSkip = g.boss.attack === null && g.beams.length === 0;

  const GATE = { id: 'gate', label: 'GATE', tell: 'red', kind: 'pillar', windup: 0.9, active: 0.1, recover: 0.5,
                 pillar: { w: 34, up: 4.0, dist: 150, count: 1, damage: 1 }, steal: null };
  const CAGE = { id: 'cage', label: 'CAGE', tell: 'red', kind: 'pillar', windup: 0.95, active: 0.1, recover: 0.55,
                 pillar: { w: 34, up: 3.5, dist: 150, count: 2, damage: 1 }, steal: null };
  const edge = 250 + 17 + C.PLAYER.HALF_W;                 // 등 뒤 기둥(250) 오른쪽 면에 몸이 닿는 x
  /* 기둥 — 등 뒤에 서서 걷기·대시를 막는다, up 뒤 사라진다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate');
  out.pillarRemote = g.boss.attackState().remote === true;
  T.run(1.0);
  out.pillarUp = g.pillars.length === 1 && !g.pillars[0].pending && Math.abs(g.pillars[0].x - 250) < 1;
  T.run(1.0, null, -1);
  out.pillarWalk = g.player.x >= edge - 0.5;
  g.player.dashCd = 0; g.player.stamina = C.STAMINA.MAX;
  g.player.startDash(-1); T.run(0.3);
  out.pillarDash = g.player.x >= edge - 0.5;
  /* 블록 밀림(40px, 기둥 쪽)이 기둥을 넘지 못한다 — 순간 이동도 설 때 있던 쪽으로 되돌린다 */
  g.player.x = edge;
  g.onBlock(null, { x: 600 });
  T.run(T.DT * 2);
  out.pillarBlockPush = g.player.x >= edge - 0.5;
  T.run(4.0); T.run(1.0, null, -1);
  out.pillarGone = g.pillars.length === 0 && g.player.x < edge - 20;
  /* 기둥 자리에 서 있으면 맞고 바깥으로 밀려난다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.player.x = 250;
  T.run(0.8);
  out.pillarRise = g.hits === 1 && Math.abs(g.player.x - 250) >= 17 + C.PLAYER.HALF_W - 0.5;
  /* 아레나 밖·칸이 좁으면 서지 않는다 */
  T.setup({ gate: GATE }, 180, 600);
  T.attack('gate');
  out.pillarOut = g.boss.attack === null && g.pillars.length === 0;
  T.setup({ cage: CAGE }, 400, 560);
  T.attack('cage');
  out.cageNarrow = g.boss.attack === null && g.pillars.length === 0;
  /* windup 동안 기둥 자리 너머로 걸어가면(칸 [60, 233] = 173 < 200) 서지 않는다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.player.x = 200;
  T.run(0.8);
  out.pillarRecheck = g.pillars.length === 0 && g.hits === 0;
  /* windup 중 보스가 경직되면 기둥은 서지 않는다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.boss.stagger(1.0, false);
  T.run(1.0);
  out.pillarCancel = g.pillars.length === 0;
  return out;
});
check('빔 — attackState.remote', area.beamRemote);
check('빔 — 예고 중에는 맞지 않는다', area.beamPendingSafe);
check('빔 — 가만히 있으면 맞는다', area.beamIdle);
check('빔 — 반대쪽으로 대시하면 따라잡힌다', area.beamWrong);
check('빔 — 빔 쪽으로 대시하면 넘는다', area.beamRight);
check('빔 — 등 뒤 공간이 없으면 건너뛴다', area.beamSkip);
check('기둥 — attackState.remote', area.pillarRemote);
check('기둥 — 등 뒤 150 에 선다', area.pillarUp);
check('기둥 — 걷기를 막는다', area.pillarWalk);
check('기둥 — 대시를 막는다', area.pillarDash);
check('기둥 — 블록 밀림도 넘지 못한다', area.pillarBlockPush);
check('기둥 — up 뒤 사라진다', area.pillarGone);
check('기둥 — 자리에 서 있으면 맞고 밀려난다', area.pillarRise);
check('기둥 — 아레나 밖이면 서지 않는다', area.pillarOut);
check('기둥 — 칸이 SAFE_MIN_W 보다 좁으면 서지 않는다', area.cageNarrow);
check('기둥 — 서는 순간 칸이 좁아졌으면 서지 않는다', area.pillarRecheck);
check('기둥 — windup 중 경직되면 서지 않는다', area.pillarCancel);
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/motions.mjs`
Expected: FAIL — 빔·기둥 항목.

- [ ] **Step 3: 엔티티 — `js/entities.js`**

`Zone` 정의 끝(`global.Player = Player;` 앞)에 넣는다.

```js
  /* =========================================================================
   * Beam — 쓸기 빔 (스펙 2026-09-23 §3.4). pending(예고) 동안 벽에 서 있다가 dir 로 움직인다.
   * 판정은 game.onBeamTouch 가 한다 — 무적(대시) 중이면 계속 살핀다.
   * ====================================================================== */
  function Beam(o) {
    this.x = o.x;
    this.w = o.w;
    this.dir = o.dir;
    this.speed = o.speed;
    this.vx = 0;
    this.t = o.delay;
    this.damage = o.damage || 1;
    this.label = o.label || 'BEAM';
    this.pending = true;
    this.hitDone = false;
    this.dead = false;
  }

  Beam.prototype.contains = function (x) {
    return x > this.x - this.w / 2 - C.PLAYER.HALF_W && x < this.x + this.w / 2 + C.PLAYER.HALF_W;
  };

  Beam.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.pending) {
      this.t -= dt;
      if (this.t <= 0) { this.pending = false; this.vx = this.dir * this.speed; }
      return;
    }
    this.x += this.vx * dt;
    if (!this.hitDone && this.contains(game.player.x)) game.onBeamTouch(this);
    if (this.x < V.MIN_X - this.w || this.x > V.MAX_X + this.w) this.dead = true;
  };

  /* =========================================================================
   * Pillar — 기둥 (스펙 2026-09-23 §3.6). pending(바닥 경고) → 선다(game.onPillarRise) → up 초 뒤 사라진다.
   * 선 동안 플레이어의 걷기·대시·밀림을 막는다(game.blockByPillars). 보스·투사체는 통과한다.
   * ====================================================================== */
  function Pillar(o) {
    this.x = o.x;
    this.w = o.w;
    this.t = o.delay;
    this.delay = o.delay;
    this.up = o.up;
    this.damage = o.damage || 1;
    this.label = o.label || 'PILLAR';
    this.pending = true;
    this.side = 0;             // 설 때 플레이어가 있던 쪽(-1 왼쪽 / 1 오른쪽) — 그 쪽으로만 막는다 (game.blockByPillars)
    this.dead = false;
  }

  Pillar.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.pending) {
      this.t -= dt;
      if (this.t <= 0) { this.pending = false; game.onPillarRise(this); }
      return;
    }
    this.up -= dt;
    if (this.up <= 0) this.dead = true;
  };
```

파일 끝 내보내기에 더한다(`global.Zone = Zone;` 다음).

```js
  global.Beam = Beam;
  global.Pillar = Pillar;
```

- [ ] **Step 4: 동작 항목 2개 — `js/motions.js`**

`/* ---- 동작 항목은 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
  /* ---- 쓸기 빔 (§3.4 SENTINEL) -------------------------------------------
   * 플레이어 등 뒤 벽에 빔이 예고(pending)로 서고 windup 끝에 보스 쪽으로 움직인다.
   * 도망치면 따라잡힌다(빔 320 > 걷기 265) — 빔 쪽으로 대시해야 넘는다. */
  MOTIONS.sweep = {
    remote: true,
    canBegin: function (boss, def, g) { return roomBehind(boss, g.player) >= C.MOTION.BEAM_MIN_ROOM; },
    begin: function (boss, a, g) {
      var bm = a.def.beam, side = behindDir(boss, g.player);
      var x = side < 0 ? V.MIN_X : V.MAX_X;
      var beam = new Beam({ x: x, w: bm.w, dir: -side, speed: bm.speed, delay: a.windupTotal,
                            damage: bm.damage, label: a.def.label || a.def.id });
      a.spawns.push(beam);
      g.spawnBeam(beam);
      FX.tellBurst(x - side * bm.w * 0.5, V.FLOOR_Y - C.MOTION.BEAM_H * 0.5, C.COLORS.RED, 'red');   // 빔 자리 예고
    }
  };

  /* ---- 기둥 (§3.6 BASTION) -----------------------------------------------
   * 등 뒤(과 count 2 면 플레이어·보스 사이)에 선다. 플레이어 칸이 SAFE_MIN_W 미만이 되거나
   * 아레나 밖이면 스텝을 건너뛴다 — 갇히는 일은 없어야 한다. */
  function pillarSpots(boss, def, g) {
    var pl = def.pillar, p = g.player, half = pl.w / 2, i;
    var xs = [p.x + behindDir(boss, p) * pl.dist];
    if (pl.count >= 2) xs.push((p.x + boss.x) / 2);
    var extra = [];
    for (i = 0; i < xs.length; i++) {
      if (xs[i] - half < V.MIN_X || xs[i] + half > V.MAX_X) return null;
      extra.push({ x: xs[i], w: pl.w });
    }
    return g.cellWidth(p.x, extra) >= C.ARENA.SAFE_MIN_W ? xs : null;
  }
  MOTIONS.pillar = {
    remote: true,
    canBegin: function (boss, def, g) { return pillarSpots(boss, def, g) !== null; },
    begin: function (boss, a, g) {
      var pl = a.def.pillar, xs = pillarSpots(boss, a.def, g);
      if (!xs) return;
      for (var i = 0; i < xs.length; i++) {
        var pil = new Pillar({ x: xs[i], w: pl.w, delay: a.windupTotal, up: pl.up,
                               damage: pl.damage, label: a.def.label || a.def.id });
        a.spawns.push(pil);
        g.spawnPillar(pil);
      }
    }
  };
```

- [ ] **Step 5: 판정 — `js/game.js`**

`resolveRemoteHit` 정의 바로 뒤에 넣는다.

```js
  /** 빔이 플레이어에 겹쳤다. 무적(대시)이면 판정하지 않고 계속 살핀다 — 무적이 끝났는데 겹쳐 있으면 맞는다 */
  Game.prototype.onBeamTouch = function (bm) {
    var p = this.player;
    if (this.ko || p.isInvulnerable()) return;
    bm.hitDone = true;
    this.damagePlayer(bm.damage, bm.x, 0, { label: bm.label, tell: 'red', kind: 'beam' });
  };

  /**
   * px 가 들어 있는 칸의 폭 — 살아 있는(설 예정 포함) 기둥과 아레나 벽 사이.
   * @param {Array<{x:number,w:number}>} [extra] 더해 볼 기둥 (새로 세울 자리)
   */
  Game.prototype.cellWidth = function (px, extra) {
    var walls = (extra || []).slice(), left = V.MIN_X, right = V.MAX_X, i;
    for (i = 0; i < this.pillars.length; i++) if (!this.pillars[i].dead) walls.push(this.pillars[i]);
    for (i = 0; i < walls.length; i++) {
      var half = walls[i].w / 2;
      if (walls[i].x < px) left = Math.max(left, walls[i].x + half);
      else right = Math.min(right, walls[i].x - half);
    }
    return right - left;
  };

  /**
   * 기둥이 서려 한다. 그 자리에 있었으면 공간이 있는 쪽 바깥으로 밀려나며 맞는다(대시 중이면 무사).
   * 🔴 서는 순간 한 번 더 잰다 — windup 동안 플레이어가 기둥 자리 너머로 걸어가 칸이 SAFE_MIN_W 보다 좁아지면 서지 않는다.
   * 선 기둥은 플레이어가 있던 쪽(side)을 기억한다 — 블록 밀림 같은 순간 이동이 기둥을 넘어도 그 쪽으로 되돌린다.
   */
  Game.prototype.onPillarRise = function (pl) {
    var p = this.player;
    var half = pl.w / 2 + C.PLAYER.HALF_W;
    var inside = Math.abs(p.x - pl.x) < half;
    var toLeft = p.x < pl.x;
    if (inside) {
      if (toLeft && pl.x - half < V.MIN_X) toLeft = false;
      if (!toLeft && pl.x + half > V.MAX_X) toLeft = true;
    }
    var nx = inside ? (toLeft ? pl.x - half : pl.x + half) : p.x;
    if (this.cellWidth(nx) < C.ARENA.SAFE_MIN_W) { pl.dead = true; return; }   // 갇힌다 — 서지 않는다
    pl.side = toLeft ? -1 : 1;
    FX.addShake(C.SHAKE.BLOCK);
    FX.sparks(pl.x, V.FLOOR_Y, C.FX.DUST, C.COLORS.GREY,
      { speed: 220, life: 0.4, dir: -Math.PI / 2, spread: Math.PI * 0.8, size: 2.2 });
    RAudio.swing();
    if (!inside) return;
    if (!this.ko && !p.isInvulnerable()) {
      this.damagePlayer(pl.damage, pl.x, 0, { label: pl.label, tell: 'red', kind: 'pillar' });
    }
    p.x = nx;
  };

  /** 선 기둥은 플레이어의 걷기·대시·밀림·끌림·블록 밀림이 넘지 못한다 — 설 때 있던 쪽(side)으로만 자른다 */
  Game.prototype.blockByPillars = function () {
    var p = this.player;
    for (var i = 0; i < this.pillars.length; i++) {
      var pl = this.pillars[i];
      if (pl.pending || pl.dead || !pl.side) continue;
      var lo = pl.x - pl.w / 2 - C.PLAYER.HALF_W, hi = pl.x + pl.w / 2 + C.PLAYER.HALF_W;
      if (pl.side < 0 && p.x > lo) { p.x = lo; if (p.vx > 0) p.vx = 0; p.knock = 0; }
      else if (pl.side > 0 && p.x < hi) { p.x = hi; if (p.vx < 0) p.vx = 0; p.knock = 0; }
    }
  };
```

`stepWorld` 머리의 `if (b) b.update(dt);` 다음 줄에 넣는다.

```js
    this.blockByPillars();             // 걷기·대시·보스 끌어당김까지 끝난 위치를 기둥으로 자른다 (스펙 2026-09-23 §3.6)
```

`stepWorld` 끝(`this.updateMotionWorld(dt);` 다음 줄)에 한 번 더 넣는다 — 투사체 블록 밀림(`onBlock`)·기둥 상승 밀림이 그 뒤에 일어난다.

```js
    this.blockByPillars();
```

- [ ] **Step 6: 그리기 — `js/render.js`**

`drawZone` 정의 바로 뒤에 넣는다.

```js
  /** 쓸기 빔 — 예고(pending) 중엔 옅은 윤곽, 움직이면 진한 띠. 앞머리 선이 오는 방향을 보여준다 */
  function drawBeam(ctx, bm) {
    var M = C.MOTION, x0 = bm.x - bm.w / 2, top = V.FLOOR_Y - M.BEAM_H;
    ctx.save();
    ctx.globalAlpha = bm.pending ? M.BEAM_WARN_ALPHA : M.BEAM_ALPHA;
    ctx.fillStyle = C.COLORS.RED;
    ctx.shadowColor = C.COLORS.RED;
    ctx.shadowBlur = bm.pending ? 0 : 24;
    ctx.fillRect(x0, top, bm.w, M.BEAM_H);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = C.COLORS.RED;
    ctx.lineWidth = 3;
    var head = bm.x + bm.dir * bm.w / 2;
    ctx.beginPath(); ctx.moveTo(head, top); ctx.lineTo(head, V.FLOOR_Y); ctx.stroke();
    ctx.restore();
  }

  /** 기둥 — 예고 중엔 바닥 스트립 + 차오르는 윤곽, 선 뒤엔 회색 기둥 */
  function drawPillar(ctx, pl) {
    var M = C.MOTION, x0 = pl.x - pl.w / 2;
    ctx.save();
    if (pl.pending) {
      var prog = 1 - clamp(pl.t / pl.delay, 0, 1);
      ctx.globalAlpha = 0.35 + 0.4 * prog;
      ctx.fillStyle = C.COLORS.RED;
      ctx.fillRect(x0, V.FLOOR_Y - C.ZONE.STRIP_H, pl.w, C.ZONE.STRIP_H);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = C.COLORS.RED;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, V.FLOOR_Y - M.PILLAR_H * prog, pl.w, M.PILLAR_H * prog);
    } else {
      ctx.globalAlpha = M.PILLAR_ALPHA;
      ctx.fillStyle = C.COLORS.GREY;
      ctx.fillRect(x0, V.FLOOR_Y - M.PILLAR_H, pl.w, M.PILLAR_H);
      ctx.strokeStyle = C.COLORS.TEXT;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, V.FLOOR_Y - M.PILLAR_H, pl.w, M.PILLAR_H);
    }
    ctx.restore();
  }

  /** 바닥 위험물 — 존·빔·기둥. 어둠이 있으면 어둠 위에서 부른다 (스펙 §2.2 어둠 규칙) */
  function drawHazards(ctx, game) {
    var i;
    for (i = 0; i < game.zones.length; i++) drawZone(ctx, game.zones[i]);
    for (i = 0; i < game.pillars.length; i++) drawPillar(ctx, game.pillars[i]);
    for (i = 0; i < game.beams.length; i++) drawBeam(ctx, game.beams[i]);
  }
```

`Render.drawWorld` 의 두 존 그리기 줄을 바꾼다.

```js
    if (!dark) drawHazards(ctx, game);
```

(기존: `if (!dark) for (i = 0; i < game.zones.length; i++) drawZone(ctx, game.zones[i]);`)

```js
      drawHazards(ctx, game);
```

(기존: 어둠 블록 안의 `for (i = 0; i < game.zones.length; i++) drawZone(ctx, game.zones[i]);`)

- [ ] **Step 7: 테스트 통과 + 회귀**

Run: `node tests/motions.mjs` → `MOTIONS PASSED`
Run: `node tests/zone.mjs` → `ZONE PASSED`
Run: `node tests/smoke.mjs` → `SMOKE PASSED`

- [ ] **Step 8: 커밋** (사용자 확인 후)

```bash
git add js/entities.js js/motions.js js/game.js js/render.js tests/motions.mjs
git commit -m "feat(motion): 쓸기 빔·기둥 — 방향을 고르는 대시, 물러설 곳을 막는 벽 (갇힘 방지 하한)"
```

---

## Task 6: 원격 타격 동작 — 표식 · 메아리

**Files:**
- Modify: `js/entities.js` (`Mark`·`Echo`)
- Modify: `js/motions.js` (`mark`·`echo`)
- Modify: `js/boss.js` (근접 분기의 메아리 호출)
- Modify: `js/game.js` (`onEchoFlash`·`onEchoStrike`)
- Modify: `js/render.js` (`drawMark`·`drawEcho`)
- Test: `tests/motions.mjs`

**Interfaces:**
- Consumes: `resolveRemoteHit`·`spawnMark/spawnEcho`(Task 2).
- Produces: 공격 정의 형식 —
  - `kind:'mark'` + `mark:{ delay, damage }`. 표식 색 = 정의 `tell`.
  - 근접 정의(`kind:'melee'`)의 표지 `echo:{ delay }` — 판정기 서명 `melee/<tell>/echo`.
  - `window.Mark`·`window.Echo`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 표식 · 메아리 (Task 6) ------------------------------------------------ */
const remote = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T;
  const out = {};
  const BRAND = { id: 'brand', label: 'BRAND', tell: 'gold', kind: 'mark', windup: 0.7, active: 0.06, recover: 0.45,
                  mark: { delay: 1.4, damage: 1 }, steal: { id: 'BRAND', label: 'BRAND', kind: 'lunge', damage: 20 } };
  /* 붙고, 따라다니고, delay 뒤 터진다 — 받으면 훔치고 보스는 경직되지 않는다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand');
  out.markRemote = g.boss.attackState().remote === true;
  T.run(0.75);
  out.markOn = g.marks.length === 1;
  let attachAt = null;
  T.setup({ brand: BRAND }, 300, 700);             // 부착 시각을 스텝 단위로 잰다
  T.attack('brand');
  T.run(0.75, (gg) => { if (attachAt === null && gg.marks.length) attachAt = gg.time; });
  T.run(0.5, null, 1);
  out.markFollow = g.marks.length === 1 && Math.abs(g.marks[0].x - g.player.x) < 0.01;
  let parried = false, boomAt = null;
  T.run(1.2, (gg) => {
    const m = gg.marks[0];
    if (m && !parried && m.t <= 0.05) { gg.player.startParry(); parried = true; }
    if (!m && boomAt === null) boomAt = gg.time;
  });
  out.markSteal = g.player.hand.some((s) => s.id === 'BRAND') && g.hits === 0 && g.boss.state !== 'stagger';
  out.markDelay = boomAt !== null && attachAt !== null && Math.abs((boomAt - attachAt) - 1.4) < 0.02;
  /* 붙은 뒤에는 보스가 경직돼도 터진다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.75);
  g.boss.stagger(1.0, false);
  T.run(1.6);
  out.markPersist = g.hits === 1 && g.lastHitBy.kind === 'mark';
  /* 붙기 전(windup)에 끊기면 붙지 않는다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.3);
  g.boss.stagger(1.0, false);
  T.run(2.5);
  out.markCancel = g.marks.length === 0 && g.hits === 0;
  /* KO 중에는 아무것도 안 한다 (Review Focus 5) */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.75);
  g.ko = 'victory'; g.koT = 999;                  // koT 를 크게 — 메인 루프가 승리 처리로 넘어가지 않게
  T.run(1.6);
  out.markKo = g.hits === 0;
  g.ko = null; g.koT = 0;

  const CANON = { id: 'canon', label: 'CANON', tell: 'gold', kind: 'melee', windup: 0.55, active: 0.1, recover: 0.5,
                  reach: 150, approach: 0, damage: 1, swing: 'thrust', echo: { delay: 0.7 },
                  steal: { id: 'CANON', label: 'CANON', kind: 'lunge', damage: 15 } };
  /* 친 자리에서 delay 뒤 잔상이 같은 windup 으로 다시 친다 — 보스가 건너가 있어도 */
  T.setup({ canon: CANON }, 300, 420);
  g.player.iframes = 0.9;                         // 원 타격은 무적으로 흘린다
  T.attack('canon'); T.run(0.6);
  g.boss.x = 150;                                 // 보스는 반대편으로
  T.run(0.8);
  out.echoAt = g.echoes.length === 1 && g.echoes[0].x === 420;
  T.run(0.8);
  out.echoHit = g.hits === 1 && g.lastHitBy.kind === 'echo';
  /* 잔상 사거리 밖이면 맞지 않는다 */
  T.setup({ canon: CANON }, 300, 420);
  g.player.iframes = 0.9;
  T.attack('canon'); T.run(0.6);
  g.boss.x = 150; g.player.x = 200;
  T.run(1.6);
  out.echoMiss = g.hits === 0;
  /* 원 공격이 windup 중 끊기면 메아리도 없다 */
  T.setup({ canon: CANON }, 300, 420);
  T.attack('canon'); T.run(0.3);
  g.boss.interrupt(0.45);
  T.run(2.0);
  out.echoCancel = g.echoes.length === 0 && g.hits === 0;
  return out;
});
check('표식 — attackState.remote', remote.markRemote);
check('표식 — windup 끝에 붙는다', remote.markOn);
check('표식 — 플레이어를 따라다닌다', remote.markFollow);
check('표식 — 받으면 훔치고 보스 경직 없음', remote.markSteal);
check('표식 — 붙은 뒤 delay 에 터진다', remote.markDelay);
check('표식 — 붙은 뒤엔 보스 경직으로 안 사라진다', remote.markPersist);
check('표식 — windup 중 끊기면 붙지 않는다', remote.markCancel);
check('표식 — KO 중에는 아무것도 안 한다', remote.markKo);
check('메아리 — 친 자리에 잔상이 선다', remote.echoAt);
check('메아리 — 잔상이 다시 친다', remote.echoHit);
check('메아리 — 잔상 사거리 밖이면 무사', remote.echoMiss);
check('메아리 — 원 공격이 끊기면 없다', remote.echoCancel);
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/motions.mjs`
Expected: FAIL — 표식·메아리 항목.

- [ ] **Step 3: 엔티티 — `js/entities.js`**

`Pillar` 정의 뒤에 넣는다.

```js
  /* =========================================================================
   * Mark — 표식 (스펙 2026-09-23 §3.7). 플레이어를 따라다니다 delay 뒤 그 자리에서 터진다.
   * 붙은 뒤에는 보스가 끊겨도 사라지지 않는다(이미 약속된 타격).
   * ====================================================================== */
  function Mark(o) {
    this.x = o.x;
    this.t = o.delay;
    this.delay = o.delay;
    this.tell = o.tell || 'gold';
    this.damage = o.damage || 1;
    this.def = o.def || null;
    this.label = o.label || 'MARK';
    this.dead = false;
  }

  Mark.prototype.update = function (dt, game) {
    if (this.dead) return;
    this.x = game.player.x;
    this.t -= dt;
    if (this.t > 0) return;
    this.dead = true;
    game.resolveRemoteHit({ tell: this.tell, def: this.def, damage: this.damage,
      fromX: game.boss ? game.boss.x : this.x, label: this.label, kind: 'mark' });
  };

  /* =========================================================================
   * Echo — 메아리 잔상 (스펙 2026-09-23 §3.10). 원 공격이 친 자리에서 wait 뒤 나타나
   * 자기 플래시(game.onEchoFlash)를 찍고, 원 windup 뒤 같은 reach 로 친다(game.onEchoStrike).
   * ====================================================================== */
  function Echo(o) {
    this.x = o.x;
    this.facing = o.facing;
    this.def = o.def;
    this.tell = o.def.tell;
    this.reach = o.def.reach;
    this.damage = o.damage || 1;
    this.label = o.label || 'ECHO';
    this.color = o.color;
    this.build = o.build;
    this.wait = o.delay;
    this.windup = o.windup;
    this.t = o.windup;
    this.stage = 'wait';       // wait → windup → hit
    this.fade = 0;
    this.dead = false;
  }

  Echo.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.stage === 'wait') {
      this.wait -= dt;
      if (this.wait <= 0) { this.stage = 'windup'; game.onEchoFlash(this); }
      return;
    }
    if (this.stage === 'windup') {
      this.t -= dt;
      if (this.t <= 0) { this.stage = 'hit'; this.fade = C.MOTION.ECHO_FADE; game.onEchoStrike(this); }
      return;
    }
    this.fade -= dt;
    if (this.fade <= 0) this.dead = true;
  };
```

내보내기에 더한다.

```js
  global.Mark = Mark;
  global.Echo = Echo;
```

- [ ] **Step 4: 동작 항목 — `js/motions.js`**

`/* ---- 동작 항목은 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
  /* ---- 표식 (§3.7 HOLLOW) ------------------------------------------------
   * active 에 플레이어에게 붙는다 — 그 순간 두 번째 텔 버스트. 붙은 뒤 delay 에 터진다(일정). */
  MOTIONS.mark = {
    remote: true,
    active: function (boss, a, g) {
      var mk = a.def.mark, p = g.player, red = a.def.tell === 'red';
      g.spawnMark(new Mark({ x: p.x, delay: mk.delay, tell: a.def.tell, damage: mk.damage,
                             def: a.def, label: a.def.label || a.def.id }));
      FX.tellBurst(p.x, V.FLOOR_Y - C.MOTION.MARK_Y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
      if (red) RAudio.tellRed(); else RAudio.tellGold();
    }
  };

  /* ---- 메아리 (§3.10 CHORUS) ---------------------------------------------
   * kind 가 아니라 근접 정의의 표지 def.echo — boss.js onActiveStart 근접 분기가 부른다.
   * 타격이 실제로 일어난 공격만 메아리친다(windup 중 끊기면 active 에 오지 않는다). */
  MOTIONS.echo = {
    spawn: function (boss, a, g) {
      var def = a.def;
      g.spawnEcho(new Echo({
        x: boss.x, facing: boss.facing, def: def, delay: def.echo.delay,
        windup: Math.max(B.MIN_WINDUP, def.windup * boss.windupMult()),
        damage: a.damage, color: boss.color, build: boss.silhouette, label: def.label || def.id
      }));
    }
  };
```

⚠️ `MOTIONS.echo` 는 `kind` 로 쓰이지 않는다 — 보스 정의에 `kind:'echo'` 를 쓰지 않는다.

- [ ] **Step 5: 근접 분기에서 메아리를 부른다 — `js/boss.js`**

`onActiveStart` 의 **함수 마지막 줄** `this.testMelee(a);`(`if (def.shockwaveFx) { ... }` 블록 바로 뒤 — Task 2 가 머리에 넣은 `if (M.melee) this.testMelee(a);` 가 아니다) 바로 앞에 넣는다.

```js
    if (def.echo) global.MOTIONS.echo.spawn(this, a, g);   // 메아리 (스펙 2026-09-23 §3.10)
```

- [ ] **Step 6: 잔상 판정 — `js/game.js`**

`onPillarRise` 정의 뒤에 넣는다.

```js
  /** 잔상이 나타났다 — 플레이어를 보고 무기 끝에서 자기 텔을 찍는다 (잔상 텔 → 타격 = 원 windup) */
  Game.prototype.onEchoFlash = function (e) {
    e.facing = (this.player.x >= e.x) ? 1 : -1;
    var t = Render.tipOf(e.build, e.facing, 'windup');
    var red = e.tell === 'red';
    FX.tellBurst(e.x + t.x, V.FLOOR_Y + t.y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
  };

  /** 잔상이 친다 — 원 공격과 같은 reach 로, 잔상 자리 기준 */
  Game.prototype.onEchoStrike = function (e) {
    if (Math.abs(this.player.x - e.x) > e.reach) return;
    this.resolveRemoteHit({ tell: e.tell, def: e.def, damage: e.damage, fromX: e.x, label: e.label, kind: 'echo' });
  };
```

- [ ] **Step 7: 그리기 — `js/render.js`**

`drawHazards` 정의 뒤에 넣는다.

```js
  /** 표식 — 줄어드는 링(남은 시간) + 도착선. 적 표식은 X 자를 겹친다 (색 없이도 읽히게, §2.2) */
  function drawMark(ctx, m) {
    var M = C.MOTION, k = clamp(m.t / m.delay, 0, 1);
    var red = m.tell === 'red', col = red ? C.COLORS.RED : C.COLORS.GOLD;
    var cy = V.FLOOR_Y - M.MARK_Y, inner = M.MARK_R * 0.35;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(m.x, cy, inner + (M.MARK_R - inner) * k, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(m.x, cy, inner, 0, TAU); ctx.stroke();
    if (red) {
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(m.x - inner, cy - inner); ctx.lineTo(m.x + inner, cy + inner);
      ctx.moveTo(m.x + inner, cy - inner); ctx.lineTo(m.x - inner, cy + inner);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 메아리 잔상 — 반투명 실루엣. 치는 순간 원 공격과 같은 궤적 */
  function drawEcho(ctx, e) {
    var M = C.MOTION;
    var pose = e.stage === 'wait' ? 'idle' : (e.stage === 'windup' ? 'windup' : 'active');
    var alpha = M.ECHO_ALPHA * (e.stage === 'hit' ? clamp(e.fade / M.ECHO_FADE, 0, 1) : 1);
    drawFighter(ctx, {
      x: e.x, facing: e.facing, color: e.color, build: e.build,
      t: 0, pose: pose, poseP: e.stage === 'windup' ? 1 - e.t / Math.max(0.01, e.windup) : 0.5,
      vx: 0, moving: false, alpha: alpha
    });
    if (e.stage === 'hit') {
      var bh = BUILD[e.build] ? BUILD[e.build].h : 84;
      drawSwing(ctx, e.x, e.facing, bh, e.tell === 'red' ? C.COLORS.RED : C.COLORS.GOLD,
        e.def.swing || 'thrust', e.reach, 1 - clamp(e.fade / M.ECHO_FADE, 0, 1), 0.7);
    }
  }
```

`Render.drawWorld` 에서 `if (b) drawBoss(ctx, b, bp, false);` 다음 줄에 넣는다.

```js
    for (i = 0; i < game.echoes.length; i++) drawEcho(ctx, game.echoes[i]);
```

`drawPlayer(ctx, p, pp, false);` 다음 줄에 넣는다(표식은 어둠 위 — 플레이어가 달고 다니는 빛이다).

```js
    for (i = 0; i < game.marks.length; i++) drawMark(ctx, game.marks[i]);
```

⚠️ 메아리 잔상은 보스 몸처럼 어둠 아래에 그려진다. 그러나 잔상의 **텔 버스트**는 `FX.tellBurst` 라 `drawParticles` 에서 어둠 위에 그려진다(규칙 충족). 어둠 보스(HOLLOW)는 메아리를 쓰지 않는다.

- [ ] **Step 8: 테스트 통과 + 회귀**

Run: `node tests/motions.mjs` → `MOTIONS PASSED`
Run: `node tests/state.mjs` → `STATE PASSED`
Run: `node tests/smoke.mjs` → `SMOKE PASSED`

- [ ] **Step 9: 커밋** (사용자 확인 후)

```bash
git add js/entities.js js/motions.js js/boss.js js/game.js js/render.js tests/motions.mjs
git commit -m "feat(motion): 표식·메아리 — 몸의 빛을 읽는 카운트다운, 있던 자리가 다시 친다"
```

---

## Task 7: 봇 — 새 위협 원천

봇이 새 동작을 읽어야 보스 태스크(8~15)의 봇 게이트가 의미를 갖는다. **새 배열이 비어 있으면 기존 동작과 한 줄도 다르지 않아야 한다.**

**Files:**
- Modify: `tests/bot.mjs` (`installBot` 의 `tick`)

**Interfaces:**
- Consumes: `getState()` 의 `beams`·`pillars`·`marks`·`echoes`·`currentAttack.remote`(Task 2).

- [ ] **Step 1: `remote` 공격은 몸 타격 위협에서 뺀다**

위협 수집의 첫 줄을 바꾼다.

```js
    // remote = 이 공격은 windup 끝에 몸으로 때리지 않는다(빔·기둥·표식·부메랑·협공) — 위협은 아래 월드 배열이 준다
    if (ca && !ca.remote && (ca.stage === 'windup' || (ca.stage === 'active' && ca.hitAt > now))) {
```

- [ ] **Step 2: 새 위협 원천을 더한다**

투사체 루프(`for (const p of s.projectiles) { ... }`) 바로 뒤, `threats.sort(...)` 앞에 넣는다.

```js
    /* 새 동작 (스펙 2026-09-23 §4) — 배열이 비어 있으면 위의 기존 위협만 남는다 */
    for (const bm of (s.beams || [])) {
      if (bm.pending || !bm.vx) continue;
      const dir = bm.vx > 0 ? 1 : -1;
      const gap = (s.playerX - bm.x) * dir - bm.w / 2;          // 빔 앞머리 → 플레이어 중심 (다가오면 양수)
      if (gap < -bm.w) continue;                                 // 이미 지나감
      // 빔 쪽으로 대시해야 넘는다 — 빔이 오는 쪽 방향키
      threats.push({ t: (gap - TUNE.PROJ_HIT) / Math.abs(bm.vx), kind: 'dash', src: 'beam',
                     dir: dir > 0 ? 'ArrowLeft' : 'ArrowRight' });
    }
    for (const pl of (s.pillars || [])) {
      if (pl.tRise <= 0 || Math.abs(s.playerX - pl.x) > pl.w / 2 + TUNE.PROJ_HIT) continue;
      threats.push({ t: pl.tRise, kind: 'dash', src: 'pillar' });
    }
    for (const m of (s.marks || [])) {
      threats.push({ t: m.tRemain, kind: m.tell === 'gold' ? 'parry' : 'dash', src: 'mark' });
    }
    for (const e of (s.echoes || [])) {
      if (Math.abs(s.playerX - e.x) > e.reach) continue;
      threats.push({ t: e.hitAt - now, kind: e.tell === 'gold' ? 'parry' : 'dash', src: 'echo' });
    }
```

- [ ] **Step 3: 방향 있는 대시**

게임은 대시 방향을 **다음 고정 스텝**의 `Input.axis()` 로 읽는다(`js/game.js` stepFight). 그 전에 봇의 다음 tick(16ms)이 이동 키를 다시 정하면 방향 키가 풀린다 — 방향을 잠깐 잠근다.

`let lastParry = -9, ...` 줄 다음에 넣는다.

```js
  let forceDir = null, forceUntil = -9;       // 방향 있는 대시(빔) — 게임이 대시를 읽을 때까지 방향 키를 붙잡는다
```

이동 블록의 두 줄 `hold(toBoss, needClose);` · `hold(away, false);` 를 바꾼다.

```js
    if (forceDir && now < forceUntil) {
      hold(forceDir === toBoss ? away : toBoss, false);
      hold(forceDir, true);
    } else {
      forceDir = null;
      hold(toBoss, needClose);
      hold(away, false);
    }
```

방어 블록의 대시 분기 `tap('Space'); lastDash = now; stats.dashes++; acted = true;` 를 바꾼다.

```js
        // 빔은 방향이 있다 — 반대 방향키를 놓고 빔 쪽 방향키를 쥔 채 대시한다
        if (th.dir) {
          forceDir = th.dir; forceUntil = now + TUNE.FORCE_DIR;
          hold(th.dir === toBoss ? away : toBoss, false); hold(th.dir, true);
        }
        tap('Space'); lastDash = now; stats.dashes++; acted = true;
```

`TUNE` 에 한 줄 더한다(`TAP_MS: 40,` 다음).

```js
  FORCE_DIR: 0.08,        // 방향 있는 대시의 방향 키 유지(시뮬레이션 초) — 게임이 다음 스텝에 대시 방향을 읽을 때까지
```

- [ ] **Step 4: 불변 회귀**

Run: `node tests/bot.mjs --all --seed=7`
Expected: `BOT PASSED`. 1~12 승패가 Task 4 Step 6 과 같다(새 동작 보스가 아직 없다 — `remote`·새 배열이 한 번도 나타나지 않는다).
Run: `node tests/mash.mjs --all --seeds=7 --riposte --expect-lose`
Expected: 전패.

- [ ] **Step 5: 커밋** (사용자 확인 후)

```bash
git add tests/bot.mjs
git commit -m "test(bot): 새 동작 위협 원천 — 빔(방향 대시)·기둥·표식·메아리, remote 공격은 몸 타격 위협에서 제외"
```

---

## 보스 태스크(8~15) 공통 규칙

- **출발값이다.** 스펙 §2.4 의 수치는 판정기·봇이 확정한다. hp·par·gap 은 Task 16 이 정한다 — 여기서는 기존 값을 그대로 둔다.
- 각 보스 파일에서 **`attacks: {...}` 와 `patterns: {...}` 블록만** 바꾸고(Edit), 머리 주석의 설계 요약 한두 줄을 새 동작에 맞게 고친다. 이름·색·실루엣·드론·아레나·prefer 는 그대로다.
- 모든 패턴에 **금 공격을 하나 이상**(손패 공급 — HOLLOW 교훈). 금으로 돌아오는 부메랑(`backTell:'gold'`)은 금 공격으로 센다 — 정의 색은 적이지만 받아서 훔칠 수 있다.
- 패턴 사이에서도 **붉은 위협 두 개가 대시 쿨다운(`C.DASH.COOLDOWN` 0.55s)보다 가깝게 붙지 않게** 본다 — 봇 hitLog 에서 대시가 필요한 원천 두 개가 0.55초 안에 연달아 찍히면 그 패턴 조합의 wait·gap 을 늘린다.
- 게이트(보스마다 순서대로):
  1. `node tools/boss-overlap.mjs --check --only=<key>` → `OVERLAP PASSED`. 걸리면 **구성·패턴 모양을 바꾼다.**
  2. `node tests/bot.mjs --boss=<N> --seed=7` → VICTORY (완벽, 빠른 진단)
  3. `node tests/bot.mjs --boss=<N> --seed=7 --jitter=0.05 --miss=0.15 --think=0.25` → 결과 기록(채택 판정은 Task 16)
  4. 봇 hitLog 에 **같은 원천의 연속 피격**(예: `LINE@…, LINE@…` 1초 안)이 있으면 갇힘 의심 — 스펙 §6 되돌릴 기준.
  5. `node tests/state.mjs` → `STATE PASSED` (새 kind 가 정의를 오염시키지 않는다)
- 커밋 메시지: `feat(boss): <N> <NAME> 재설계 — <새 동작> (재활용 1: <기본기>)`. 커밋은 사용자 확인 후.

---

## Task 8: 보스 5 LANTERN — 부메랑

**Files:** Modify `js/bosses/lantern.js`

- [ ] **Step 1: 머리 주석을 고친다**

```js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5 · 2026-09-23 재설계 §2.4
 * 부메랑(적으로 나가 금으로 돌아온다) + 등 뒤 순간이동(move:'behind'). 색이 비행 중에 바뀐다.
```

- [ ] **Step 2: 공격표를 바꾼다**

```js
    attacks: {
      flicker: {                                   // 기본기 — 챕터 1 과 서명이 같은 유일한 공격 (스펙 2026-09-23 §2.1)
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      orb: {                                       // 부메랑 — 적으로 가서 등 뒤에서 금으로 돌아온다 (§3.2)
        id: 'orb', label: 'ORB', tell: 'red', kind: 'boomerang',
        windup: 0.60, active: 0.06, recover: 0.50,
        proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        boomerang: { turnDist: 200, backTime: 0.60, backTell: 'gold' },
        steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 }
      },
      orb2: {                                      // P2 — 두 발. 간격 0.30 은 대시 한 번(무적 0.20s)에 둘 다 넘는 폭
        id: 'orb2', label: 'ORB', tell: 'red', kind: 'boomerang',
        windup: 0.55, active: 0.06, recover: 0.55,
        proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        boomerang: { turnDist: 200, backTime: 0.60, backTell: 'gold' },
        volley: { count: 2, interval: 0.30 },
        steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 }
      }
    },
```

- [ ] **Step 3: 패턴을 바꾼다**

```js
    patterns: {
      1: [
        { name: 'behind-flicker',   steps: [{ move: 'behind' }, { atk: 'flicker' }] },
        { name: 'orb',              steps: [{ atk: 'orb' }] },
        { name: 'far-orb',          steps: [{ move: 'far' }, { atk: 'orb' }] },
        { name: 'flicker-orb',      steps: [{ atk: 'flicker' }, { wait: 0.5 }, { atk: 'orb' }] }
      ],
      2: [
        { name: 'orb2',             steps: [{ atk: 'orb2' }] },
        { name: 'behind-flicker-orb', steps: [{ move: 'behind' }, { atk: 'flicker' }, { atk: 'orb' }] },
        { name: 'orb-behind-flicker', steps: [{ atk: 'orb' }, { move: 'behind' }, { atk: 'flicker' }] },   // 귀환 중 순간이동 — P2 만 (§2.4)
        { name: 'double-blink',     steps: [{ move: 'behind' }, { atk: 'flicker' }, { move: 'behind' }, { atk: 'flicker' }] }
      ]
    }
```

⚠️ `orb` 패턴은 금이 귀환탄뿐이다 — 대시로 넘긴 뒤 귀환을 받아야 손패가 찬다. 숙련 봇 손패가 마르면(퍼펙트 수 급감) `orb` 단독 패턴을 `flicker-orb` 류로 바꾼다.

- [ ] **Step 4: 공통 게이트** (`--only=lantern`, `--boss=5`)

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 5 LANTERN 재설계 — 부메랑 (재활용 1: flicker)`

---

## Task 9: 보스 6 CHORUS — 악보 · 메아리

**Files:** Modify `js/bosses/chorus.js`

- [ ] **Step 1: 머리 주석**

```js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6 · 2026-09-23 재설계 §2.4
 * 악보(콜을 들려주고 같은 리듬으로 친다) + 메아리(친 자리의 잔상이 다시 친다) + 좌우 교차(move:'cross').
 * "하나가 묻고, 하나가 답한다."
```

- [ ] **Step 2: 공격표**

```js
    attacks: {
      refrain: {                                   // 악보 — 콜 3음(0.45·0.90) → gap → 같은 리듬 3타 (§3.9)
        id: 'refrain', label: 'REFRAIN', tell: 'gold', kind: 'score',
        windup: 0.60, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        score: { notes: [0.45, 0.90] },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      refrain2: {                                  // P2 — 4타 (0.35·0.35·0.70)
        id: 'refrain2', label: 'REFRAIN', tell: 'gold', kind: 'score',
        windup: 0.55, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        score: { notes: [0.35, 0.35, 0.70] },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      canon: {                                     // 메아리 — 친 자리에서 0.7초 뒤 잔상이 다시 친다 (§3.10)
        id: 'canon', label: 'CANON', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 150, approach: 60, damage: 1, swing: 'thrust',
        echo: { delay: 0.70 },
        steal: { id: 'CANON', label: 'CANON', kind: 'lunge', damage: 15 }
      },
      scissor: {                                   // 기본기(P2) — 양쪽을 동시에 베는 가위, 대시로만
        id: 'scissor', label: 'SCISSOR', tell: 'red', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.70,
        reach: 200, approach: 40, damage: 1, swing: 'arc',
        steal: null
      }
    },
```

- [ ] **Step 3: 패턴**

```js
    patterns: {
      1: [
        { name: 'refrain',          steps: [{ atk: 'refrain' }] },
        { name: 'canon',            steps: [{ atk: 'canon' }] },
        { name: 'canon-cross-canon', steps: [{ atk: 'canon' }, { move: 'cross' }, { atk: 'canon' }] },   // 잔상 둘이 양쪽에
        { name: 'cross-refrain',    steps: [{ move: 'cross' }, { atk: 'refrain' }] }
      ],
      2: [
        { name: 'refrain2',         steps: [{ atk: 'refrain2' }] },
        { name: 'canon-cross-refrain2', steps: [{ atk: 'canon' }, { move: 'cross' }, { atk: 'refrain2' }] },
        { name: 'cross-canon-scissor', steps: [{ move: 'cross' }, { atk: 'canon' }, { atk: 'scissor' }] },
        { name: 'scissor-canon',    steps: [{ atk: 'scissor' }, { wait: 0.3 }, { atk: 'canon' }] }
      ]
    }
```

⚠️ 스펙 §2.4 의 P2 `[scissor]` 단독은 금이 없어 `scissor-canon` 으로 바꿨다(공통 규칙: 모든 패턴에 금 ≥1).

- [ ] **Step 4: 공통 게이트** (`--only=chorus`, `--boss=6`). 추가 확인: 봇이 악보 3타째에서 반복 피격하면(`REFRAIN@…` 연속) `notes` 간격 차이를 키운다 — 스펙 §6.

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 6 CHORUS 재설계 — 악보·메아리 (재활용 1: scissor)`

---

## Task 10: 보스 7 BASTION — 기둥

**Files:** Modify `js/bosses/bastion.js`

- [ ] **Step 1: 머리 주석**

```js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기 + 문). 스펙 §3.7 · 2026-09-23 재설계 §2.4
 * gate 는 플레이어 등 뒤에 서는 기둥 — 물러설 곳이 막혀 아머 보스를 정면으로 받아낸다.
 * cage(P2)는 등 뒤 + 사이에 둘 — 투사체만 오가는 방에서 되받아치기 랠리.
```

- [ ] **Step 2: 공격표**

```js
    attacks: {
      salvo: {                                     // 기본기 — 지면 투사체, 반사되면 deflect 대상
        id: 'salvo', label: 'VOLLEY', tell: 'gold', kind: 'projectile',
        windup: 0.65, active: 0.10, recover: 0.55,
        proj: { speed: 380, r: 13, y: 18, damage: 1, reflectDamage: 20, shape: 'wave' },
        steal: { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 }
      },
      gate: {                                      // 기둥 — 등 뒤 150px, 4초 (§3.6)
        id: 'gate', label: 'GATE', tell: 'red', kind: 'pillar',
        windup: 0.90, active: 0.10, recover: 0.50,
        pillar: { w: 34, up: 4.0, dist: 150, count: 1, damage: 1 },
        steal: null
      },
      cage: {                                      // P2 — 등 뒤 + 플레이어·보스 사이. 칸이 좁으면 서지 않는다
        id: 'cage', label: 'CAGE', tell: 'red', kind: 'pillar',
        windup: 0.95, active: 0.10, recover: 0.55,
        pillar: { w: 34, up: 3.5, dist: 150, count: 2, damage: 1 },
        steal: null
      }
    },
```

- [ ] **Step 3: 패턴** (금 공급원은 salvo 하나 — 모든 패턴에 salvo)

```js
    patterns: {
      1: [
        { name: 'salvo',           steps: [{ atk: 'salvo' }] },
        { name: 'gate-salvo',      steps: [{ atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'far-salvo-salvo', steps: [{ move: 'far' }, { atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'gate-wait-salvo', steps: [{ atk: 'gate' }, { wait: 0.5 }, { atk: 'salvo' }] }
      ],
      2: [
        { name: 'cage-rally',      steps: [{ atk: 'cage' }, { atk: 'salvo' }, { wait: 0.4 }, { atk: 'salvo' }] },
        { name: 'gate-salvo-salvo', steps: [{ atk: 'gate' }, { atk: 'salvo' }, { atk: 'salvo' }] },
        { name: 'far-gate-salvo',  steps: [{ move: 'far' }, { atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'salvo-far-salvo', steps: [{ atk: 'salvo' }, { move: 'far' }, { atk: 'salvo' }] }
      ]
    }
```

⚠️ 기존 `ward`(근접 금)가 빠져 BASTION 은 근접 금 공격이 없다. 숙련 봇 손패가 마르면 salvo 패턴 비중을 올린다 — ward 를 되살리면 재활용 2 로 판정기에 걸린다.
⚠️ BASTION 은 이봉 보스다(handover) — 게이트 3 결과는 3회 돌려 다수결을 기록한다.

- [ ] **Step 4: 공통 게이트** (`--only=bastion`, `--boss=7`)

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 7 BASTION 재설계 — 기둥 (재활용 1: salvo)`

---

## Task 11: 보스 8 AVARICE — 끌어당김 · 죽은 되돌림 사본 제거

**Files:** Modify `js/bosses/avarice.js` · Modify `tests/state.mjs`(손패 심기)

**근거**: 되돌림 사본 7종(thrust·slash·arrow·slam·flicker·glow·ward)은 도달할 수 없다 — `Game.startBoss` 가 `player.hardReset()`(`js/game.js:204`)으로 손패를 비우므로 AVARICE 전투의 손패·loot 에는 AVARICE 가 준 카드만 들어온다. 지우면 `overlapIntended` 도 필요 없다.

- [ ] **Step 1: 사본 도달 불가를 확인한다**

Run: `grep -n "hardReset\|this.hand = \[\]" js/game.js js/entities.js`
Expected: `startBoss` 안의 `this.player.hardReset();` 와 `Player.reset` 의 `this.hand = [];`. 둘 다 있으면 진행.

- [ ] **Step 2: 머리 주석 · 상단 표를 바꾼다**

머리 주석:

```js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8 · 2026-09-23 재설계 §2.4
 * 끌어당김 — "저도 걷는 사람이라서요". haul(금)은 끌어와 베고, plunder(적)는 끌어와 손패 전부를 걷는다.
 * 빼앗은 손패({mirror:'loot'})와 플레이어 손패({mirror:'all'})를 되돌려 쓴다 — 되돌림 대상은 자기 카드(COUNT·HAUL)뿐이다
 * (보스마다 손패가 비워지므로 다른 보스의 카드는 이 전투에 없다).
```

`WINDUP_MULT`·`BASE_WINDUP`·`w()` 세 줄을 지우고 `MIRROR_MAP` 을 바꾼다.

```js
  /* 손패 기술 id → 이 보스의 되돌림 공격 id. 이 전투의 손패에는 AVARICE 가 준 카드만 있다 */
  var MIRROR_MAP = { COUNT: 'count', HAUL: 'haul' };
```

정의에서 `overlapIntended: ...,` 줄과 `windupMultNote: WINDUP_MULT,` 줄을 지운다(`mirrorMap: MIRROR_MAP,` 은 둔다).

- [ ] **Step 3: 공격표**

```js
    attacks: {
      count: {                                     // 기본기 · fallback — 플레이어가 첫 카드를 훔칠 금색
        id: 'count', label: 'COUNT', tell: 'gold', kind: 'melee',
        windup: 0.90, active: 0.14, recover: 0.70,
        reach: 190, approach: 50, damage: 1, swing: 'arc',
        steal: { id: 'COUNT', label: 'COUNT', kind: 'slash', damage: 25 }
      },
      haul: {                                      // 끌어당김 + 금 타격 (§3.5) — 걸어서 버티면 헛친다
        id: 'haul', label: 'HAUL', tell: 'gold', kind: 'pull',
        windup: 0.90, active: 0.12, recover: 0.60,
        reach: 150, damage: 1, swing: 'arc',
        pull: { speed: 170 },
        steal: { id: 'HAUL', label: 'HAUL', kind: 'slash', damage: 20 }
      },
      plunder: {                                   // 끌어당김 + 적 잡기 — 피해 1 + 손패 전부 강탈, 대시로만
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'pull',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 170, damage: 1, swing: 'thrust', plunder: true,
        pull: { speed: 150 },
        steal: null
      }
    },
```

- [ ] **Step 4: 패턴**

```js
    patterns: {
      1: [
        { name: 'loot',        steps: [{ mirror: 'loot' }] },
        { name: 'haul',        steps: [{ atk: 'haul' }] },
        { name: 'close-loot',  steps: [{ move: 'close' }, { mirror: 'loot' }] },
        { name: 'plunder-haul', steps: [{ atk: 'plunder' }, { atk: 'haul' }] }
      ],
      2: [
        { name: 'mirror-hand', steps: [{ mirror: 'all' }] },
        { name: 'haul-loot',   steps: [{ atk: 'haul' }, { mirror: 'loot' }] },
        { name: 'plunder-loot', steps: [{ atk: 'plunder' }, { mirror: 'loot' }] },
        { name: 'loot-chain',  steps: [{ mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }] }
      ]
    },
```

⚠️ 스펙 §2.4 의 P1 `[plunder]` 단독은 금이 없어 `plunder-haul` 로 바꿨다. `loot` 은 비었으면 fallback `count`(금)라 금이 있다.

- [ ] **Step 5: `tests/state.mjs` 가 새 약탈 경로를 실데이터로 돌게 한다**

지금 state.mjs 는 기술 표 앞 3장(THRUST·SLASH·ARROW — 챕터 1 카드)을 손패에 심는다. 새 `MIRROR_MAP`(COUNT·HAUL)은 이 카드를 매핑하지 않아 AVARICE 의 `{mirror:'loot'}` 가 fallback `count` 만 돈다 — 끌어당김(`haul`) 되돌림 경로가 불변 검사를 안 탄다. **그 보스 자신의 카드를 우선 심는다.** 손패 심기 블록을 바꾼다.

```js
  // 손패를 심어 두면 약탈 보스(AVARICE)의 loot 큐와 {mirror:'loot'} 가 실데이터로 돈다 — 그래야 뒤의 불변 비교가 의미를 갖는다.
  // 그 보스가 주는 카드를 먼저 심는다(되돌림 표 MIRROR_MAP 이 자기 카드만 매핑한다). 없으면 기술 표 앞에서.
  await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    const own = Object.values(g.boss.def.attacks).map((a) => a.steal).filter(Boolean).map((s) => s.id);
    const ids = [...new Set(own.concat(Object.keys(g.skillTable)))].slice(0, 3);
    ids.forEach((k) => g.player.pushHand(g.skillTable[k]));
  });
```

Run: `node tests/state.mjs` → `STATE PASSED`

- [ ] **Step 6: 공통 게이트** (`--only=avarice`, `--boss=8`). 추가: `node tools/boss-overlap.mjs` 표에서 AVARICE 가 `의도된 복제` 가 아니라 `OK` 로 나와야 한다.

- [ ] **Step 7: 커밋** (사용자 확인 후) — `feat(boss): 8 AVARICE 재설계 — 끌어당김, 도달 불가 되돌림 사본 7종 제거 (재활용 1: count)` (`js/bosses/avarice.js`·`tests/state.mjs`)

---

## Task 12: 보스 9 SENTINEL — 쓸기 빔

**Files:** Modify `js/bosses/sentinel.js`

- [ ] **Step 1: 머리 주석**

```js
 * SENTINEL — 창의 파수꾼 (챕터 3 첫 보스). 스펙 §3.9 · 2026-09-23 재설계 §2.4
 * 지속 구역 claim(설 자리를 지운다) + 쓸기 빔 line(등 뒤 벽에서 경계선이 쓸고 온다). 이동하지 않는다.
```

- [ ] **Step 2: 공격표** — `sweep`(근접 금)을 지우고 `line` 을 더한다. `lance`·`claim` 은 그대로.

```js
      line: {                                      // 쓸기 빔 — 빔 쪽으로 대시해야 넘는다 (§3.4)
        id: 'line', label: 'LINE', tell: 'red', kind: 'sweep',
        windup: 0.85, active: 0.06, recover: 0.60,
        beam: { w: 90, speed: 320, damage: 1 },
        steal: null
      }
```

- [ ] **Step 3: 패턴** (금 공급원은 lance 하나 — 모든 패턴에 lance. **claim 과 line 은 한 패턴에 넣지 않는다**)

```js
    patterns: {
      1: [
        { name: 'lance',        steps: [{ atk: 'lance' }] },
        { name: 'line-lance',   steps: [{ atk: 'line' }, { wait: 0.3 }, { atk: 'lance' }], tag: 'line' },
        { name: 'claim-lance',  steps: [{ atk: 'claim' }, { wait: 0.3 }, { atk: 'lance' }] },
        { name: 'lance-lance',  steps: [{ atk: 'lance' }, { wait: 0.45 }, { atk: 'lance' }] }
      ],
      2: [
        { name: 'claim-lance',  steps: [{ atk: 'claim' }, { wait: 0.3 }, { atk: 'lance' }] },
        { name: 'line-lance',   steps: [{ atk: 'line' }, { atk: 'lance' }], tag: 'line' },
        { name: 'double-lance', steps: [{ atk: 'lance' }, { wait: 0.35 }, { atk: 'lance' }] },
        { name: 'lance-line',   steps: [{ atk: 'lance' }, { wait: 0.3 }, { atk: 'line' }], tag: 'line' }
      ]
    },

    /* ---- 훅: 구역이 살아 있으면 빔 패턴을 뽑지 않는다 ------------------------
     * "한 패턴에 claim·line 금지"만으로는 모자란다 — claim 이 패턴 끝 가까이 있으면 linger 가
     * 다음 패턴의 line 과 겹친다(패턴 사이 gap 0.6~0.85 < linger 1.8). 빔을 넘는 대시의 착지점이 구역이면 갇힌다. */
    onPickPattern: function (boss, game) {
      var pool = boss.def.patterns[boss.phase] || boss.def.patterns[1];
      if (!game.zones.length) return pool;
      var out = [];
      for (var i = 0; i < pool.length; i++) if (pool[i].tag !== 'line') out.push(pool[i]);
      return out.length ? out : pool;
    }
```

(`patterns` 블록 뒤에 `onPickPattern` 을 더하므로 `patterns: {...}` 끝에 쉼표가 붙는다.)

패턴 주석의 "🔴 한 패턴에 claim 은 최대 하나" 블록 아래에 한 줄 더한다.

```js
     * 🔴 claim 과 line 은 한 패턴에 넣지 않고, 구역이 살아 있으면 line 패턴(tag 'line')을 뽑지 않는다(onPickPattern) —
     *    빔을 넘는 대시의 착지점이 지속 구역일 수 있다(갇힘, 스펙 2026-09-23 §2.4).
```

- [ ] **Step 4: 공통 게이트** (`--only=sentinel`, `--boss=9`). 추가: hitLog 에 `LINE` 뒤 1초 안의 `CLAIM` 피격(대시 착지 → 구역)이 있으면 claim linger 가 다음 패턴의 line 과 겹친 것 — `gap` 을 늘린다.

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 9 SENTINEL 재설계 — 쓸기 빔 (재활용 1: lance)`

---

## Task 13: 보스 10 TEMPEST — 협공

**Files:** Modify `js/bosses/tempest.js`

- [ ] **Step 1: 머리 주석**

```js
 * TEMPEST — 폭풍 (챕터 3 두 번째 보스). 스펙 §3.10 · 2026-09-23 재설계 §2.4
 * 협공 — 앞(금)과 등 뒤(적)에서 일정한 시차로 온다. 전부는 못 받는다, 버릴 것을 고른다.
```

- [ ] **Step 2: 공격표** — `shear`·`deluge`·`gust` 를 지우고 `squall`·`squall2` 를 더한다. `surge` 는 그대로.

```js
      squall: {                                    // 협공 — 앞 금 1발 → 0.45초 뒤 등 뒤 적 1발 (§3.3)
        id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer',
        windup: 0.60, active: 0.06, recover: 0.60,
        proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
        steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 }
      },
      squall2: {                                   // P2 — 앞은 큰 탄 3연발, 마지막 앞 탄 0.45초 뒤 등 뒤 적
        id: 'squall2', label: 'SQUALL', tell: 'gold', kind: 'pincer',
        windup: 0.60, active: 0.06, recover: 0.65,
        proj: { speed: 380, r: 16, y: 52, damage: 1, reflectDamage: 12, shape: 'arrow' },
        volley: { count: 3, interval: 0.26, p2Interval: 0.26 },
        pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
        steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 }
      }
```

- [ ] **Step 3: 패턴** (태그 유지 — near 는 물러난 뒤에만 쏜다)

```js
    patterns: {
      1: [
        { name: 'surge',        steps: [{ atk: 'surge' }], tag: 'far' },
        { name: 'squall',       steps: [{ atk: 'squall' }], tag: 'far' },
        { name: 'drift-squall', steps: [{ move: 'left' }, { atk: 'squall' }], tag: 'far' },
        { name: 'surge-squall', steps: [{ atk: 'surge' }, { wait: 0.85 }, { atk: 'squall' }], tag: 'far' },
        { name: 'back-surge',   steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' },
        { name: 'back-squall',  steps: [{ move: 'back' }, { atk: 'squall' }], tag: 'near' }
      ],
      2: [
        { name: 'squall2',            steps: [{ atk: 'squall2' }], tag: 'far' },
        { name: 'surge-drift-squall', steps: [{ atk: 'surge' }, { move: 'right' }, { atk: 'squall' }], tag: 'far' },
        { name: 'drift-squall2',      steps: [{ move: 'left' }, { atk: 'squall2' }], tag: 'far' },
        { name: 'squall-surge',       steps: [{ atk: 'squall' }, { wait: 0.5 }, { atk: 'surge' }], tag: 'far' },
        { name: 'back-squall2',       steps: [{ move: 'back' }, { atk: 'squall2' }], tag: 'near' },
        { name: 'back-surge',         steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' }
      ]
    },
```

`onPickPattern` 은 그대로 둔다(`any` 태그 패턴이 없어도 near/far 가 모든 거리를 덮는다).

- [ ] **Step 4: 공통 게이트** (`--only=tempest`, `--boss=10`). 추가: 숙련 봇 피격이 `SQUALL`(뒤 적)에 몰리면 `gap` 을 늘린다 — 읽을 수 없는 게 아니라 손이 모자란 것인지 사람 플레이테스트로 가른다.

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 10 TEMPEST 재설계 — 협공 (재활용 1: surge)`

---

## Task 14: 보스 11 HOLLOW — 표식

**Files:** Modify `js/bosses/hollow.js`

- [ ] **Step 1: 머리 주석 · 로컬 표**

```js
 * HOLLOW — 어둠 (챕터 3 세 번째 보스). 스펙 §3.11 · 2026-09-23 재설계 §2.4
 * 설계 축은 "시야" — 아레나가 어두워지고 남는 빛은 텔과, 플레이어 몸에 붙은 표식뿐이다.
 * 표식은 보스를 보지 않고 자기 몸의 카운트다운을 읽게 한다(표식 링은 어둠 위에 그린다).
```

`RANGE` 표와 정의의 `range: RANGE,` 줄, `onPickPattern` 훅을 지운다 — 새 패턴은 전부 거리와 무관하다(snuff 가 빠져 far 태그가 없다).

- [ ] **Step 2: 공격표** — `grasp`·`rend`·`snuff` 를 지우고 `brand`·`brand-red` 를 더한다. `ember` 는 그대로.

```js
      brand: {                                     // 금 표식 — 붙고 1.4초 뒤 터진다, 받으면 훔친다 (§3.7)
        id: 'brand', label: 'BRAND', tell: 'gold', kind: 'mark',
        windup: 0.70, active: 0.06, recover: 0.45,
        mark: { delay: 1.40, damage: 1 },
        steal: { id: 'BRAND', label: 'BRAND', kind: 'lunge', damage: 20 }
      },
      'brand-red': {                               // 적 표식 — 터지는 순간 대시
        id: 'brand-red', label: 'BRAND', tell: 'red', kind: 'mark',
        windup: 0.70, active: 0.06, recover: 0.45,
        mark: { delay: 1.40, damage: 1 },
        steal: null
      }
```

- [ ] **Step 3: 패턴** (ember 는 반드시 back 뒤 — 기존 규칙 유지)

```js
    patterns: {
      1: [
        { name: 'brand',            steps: [{ atk: 'brand' }] },
        { name: 'back-ember',       steps: [{ move: 'back' }, { atk: 'ember' }] },
        { name: 'brand-back-ember', steps: [{ atk: 'brand' }, { move: 'back' }, { atk: 'ember' }] },   // 표식이 도는 동안 탄
        { name: 'back-ember-brand', steps: [{ move: 'back' }, { atk: 'ember' }, { atk: 'brand' }] }
      ],
      2: [
        { name: 'brand-red-brand',      steps: [{ atk: 'brand-red' }, { atk: 'brand' }] },
        { name: 'brand-back-ember',     steps: [{ atk: 'brand' }, { move: 'back' }, { atk: 'ember' }] },
        { name: 'back-ember-brand-red', steps: [{ move: 'back' }, { atk: 'ember' }, { atk: 'brand-red' }] },
        { name: 'brand-wait-brand-red', steps: [{ atk: 'brand' }, { wait: 0.3 }, { atk: 'brand-red' }] }
      ]
    }
```

- [ ] **Step 4: 공통 게이트** (`--only=hollow`, `--boss=11`). 🔴 어둠·표식 겹침은 **봇이 못 재는 읽기**다 — 사람 플레이테스트 항목에 적는다(Task 17).

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 11 HOLLOW 재설계 — 표식 (재활용 1: ember)`

---

## Task 15: 보스 12 ADAMANT — 반격 자세

**Files:** Modify `js/bosses/adamant.js`

- [ ] **Step 1: 머리 주석**

```js
 * ADAMANT — 벽 그 자체 (챕터 3 마지막 = 최종 보스). 스펙 §3.12 · 2026-09-23 재설계 §2.4
 * 방벽(반사탄으로 깬다) + 반격 자세 guard(이 윈드업에 치면 벌을 받는다) + P2 카운터 전용.
 * "어느 윈드업은 치고, 어느 윈드업은 참는가" — 12스테이지가 가르친 것의 기말고사.
```

- [ ] **Step 2: 공격표** — `cleave`·`advance`·`quake` 를 지우고 `guard`·`retort` 를 더한다. `shards` 는 그대로.

```js
      guard: {                                     // 반격 자세 — 참으면 끝에 금 강타(CLEAVE), 치면 retort (§3.8)
        id: 'guard', label: 'GUARD', tell: 'gold', kind: 'stance',
        windup: 0.90, active: 0.12, recover: 0.62,
        reach: 190, approach: 60, damage: 1, swing: 'arc',
        stance: { counter: 'retort' },
        steal: { id: 'CLEAVE', label: 'CLEAVE', kind: 'slam', damage: 24 }
      },
      retort: {                                    // 벌 반격 — 자세 중에 맞았을 때만. 패턴이 직접 부르지 않는다
        id: 'retort', label: 'RETORT', tell: 'red', kind: 'melee',
        windup: 0.34, active: 0.12, recover: 0.60,
        reach: 240, approach: 0, damage: 1, swing: 'thrust',
        stanceCounter: true,                       // 판정기 서명 stance/counter — 자세 동작의 일부 (tools/boss-overlap.mjs)
        steal: null
      }
```

`retort.windup` 0.34 = `C.BOSS.MIN_WINDUP` — 반응 하한 그대로다(P2 배수를 먹어도 하한에 걸린다).

- [ ] **Step 3: 패턴**

```js
    patterns: {
      1: [
        { name: 'far-shards',             steps: [{ move: 'far' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'far-shards-close-guard', steps: [{ move: 'far' }, { atk: 'shards' }, { move: 'close' }, { atk: 'guard' }], tag: 'wall' },
        { name: 'guard',                  steps: [{ atk: 'guard' }], tag: 'any' },
        { name: 'close-guard',            steps: [{ move: 'close' }, { atk: 'guard' }], tag: 'any' }
      ],
      2: [
        { name: 'far-shards-shards',      steps: [{ move: 'far' }, { atk: 'shards' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'far-shards-close-guard', steps: [{ move: 'far' }, { atk: 'shards' }, { move: 'close' }, { atk: 'guard' }], tag: 'wall' },
        { name: 'guard-guard',            steps: [{ atk: 'guard' }, { wait: 0.4 }, { atk: 'guard' }], tag: 'any' },
        { name: 'close-guard',            steps: [{ move: 'close' }, { atk: 'guard' }], tag: 'any' }
      ]
    },
```

패턴 주석의 공격 설명 블록(금색 둘 / 붉은 둘 …)을 새 구성에 맞게 고친다.

```js
    /* ---- 공격 테이블 (스펙 §3.12 · 2026-09-23 §2.4) --------------------------
     * shards(금, 방벽을 깨는 재료) · guard(금, 반격 자세) · retort(적, 자세 벌 — 패턴이 부르지 않는다).
     * 붉은 공격을 패턴이 직접 쓰지 않는다 — 이 보스의 위협은 "참지 못함"에서 온다.
     * -------------------------------------------------------------------- */
```

- [ ] **Step 4: 공통 게이트** (`--only=adamant`, `--boss=12`) + **전체 판정기**

Run: `node tools/boss-overlap.mjs --check`
Expected: exit 0, `OVERLAP PASSED` — 8보스 재활용 ≤1·새 서명 ≥1, `overlapIntended` 는 MIRROR 하나만 남는다(챕터 1).

Run: `node tests/mash.mjs --boss=12 --seeds=7 --riposte --expect-lose`
Expected: 패배 — 연타 봇은 자세에 벌을 받는다.

- [ ] **Step 5: 커밋** (사용자 확인 후) — `feat(boss): 12 ADAMANT 재설계 — 반격 자세 (재활용 1: shards)`

---

## Task 15.1: 엔진 — 끊긴 공격의 예약 발사(연사 후속탄·협공 뒤 탄) 취소

(컨트롤러가 추가한 태스크 — Task 14·15 구현 중 발견된 엔진 결함. 판정 근거: ledger "Ruling (engine bug found in T14/T15)".)

**문제**: 연사(volley)의 2·3발째와 협공 뒤 탄은 `game.scheduleProjectile` 로 예약된다. 보스가 경직(`stagger`)되거나 2페이즈 포효(`enterPhase2`)·사망(`die`)으로 공격이 끊겨도 `cancelAttackSpawns()` 가 존·빔·기둥만 지우고 **예약 발사는 그대로 남아**, 공격 상태(`currentAttack`)가 없는 채로 탄이 나간다. 플레이어가 경직 창(ADAMANT 방벽 파괴 카운터 창)을 노리고 붙으면 탄이 **코앞에서** 생겨 반응할 수 없다(Task 15 계측: ADAMANT t=13.95 `bossState:stagger`, `currentAttack:null` 에 shards 2발째 발사 · HOLLOW t=8.98 포효 중 ember 2발째 발사). 기존 원칙("보스를 끊었는데 결과가 그대로 온다 = 텔과 결과가 어긋난다", `cancelAttackSpawns` 주석)과 같은 결함이다.

**컨트롤러 판정**: 엔진 전체에 적용한다 — 끊긴 공격이 예약한 발사는 같이 취소한다. 챕터 1 SERAPH triple 도 도중에 끊기면 남은 화살이 안 나가게 된다(수용한 편차 — G3 은 Task 16 봇 승패로 확인).

**Files:**
- Modify: `js/game.js` (`scheduleProjectile` 에 출처 인자, `cancelScheduled` 신설)
- Modify: `js/boss.js` (`fire` 가 출처를 넘긴다, `cancelAttackSpawns` 가 예약 발사를 지운다)
- Modify: `js/motions.js` (`MOTIONS.pincer.active` 가 출처를 넘긴다)
- Test: `tests/motions.mjs` (새 블록)

**Interfaces:**
- `Game.prototype.scheduleProjectile(delay, make, cue, src)` — `src`(선택) = 예약한 공격 인스턴스 `a`. 기존 3인자 호출은 그대로 동작한다.
- `Game.prototype.cancelScheduled(src)` — `pendingShots` 에서 `ps.src === src` 인 항목을 모두 뺀다. `src` 가 falsy 면 아무것도 하지 않는다.

- [ ] **Step 1: 실패하는 테스트** — `tests/motions.mjs` 의 `/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 끊긴 공격의 예약 발사 취소 (Task 15.1) ------------------------------- */
const cancelShots = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T;
  const out = {};
  const TRI = { id: 'tri', label: 'TRI', tell: 'gold', kind: 'projectile', windup: 0.4, active: 0.06, recover: 0.6,
                proj: { speed: 300, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
                volley: { count: 3, interval: 0.2 }, steal: null };
  const countShots = (interrupt) => {
    T.setup({ tri: TRI }, 200, 700);
    g.player.iframes = 99;
    let spawned = 0;
    const orig = g.spawnProjectile;
    g.spawnProjectile = function (p) { if (p.owner === 'boss') spawned++; return orig.call(this, p); };
    T.attack('tri');
    T.run(0.45);                                   // 첫 발만 나간 뒤
    if (interrupt) interrupt();
    T.run(1.0);
    g.spawnProjectile = orig;
    return spawned;
  };
  out.none = countShots(null);
  out.stagger = countShots(() => g.boss.stagger(1.0, false));
  out.phase2 = countShots(() => g.boss.enterPhase2());

  const SQUALL = { id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer', windup: 0.6, active: 0.06, recover: 0.6,
                   proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                   pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
                   steal: null };
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  T.run(0.7);                                      // 앞 탄 발사 직후, 뒤 탄은 아직 예약 중
  g.boss.stagger(1.0, false);
  let rear = false;
  T.run(2.0, (gg) => { if (gg.projectiles.some((p) => p.fromBehind)) rear = true; });
  out.pincerCancel = !rear;
  return out;
});
check('예약 발사 — 끊기지 않으면 연사 3발 그대로', cancelShots.none === 3, `(${cancelShots.none})`);
check('예약 발사 — 경직되면 남은 연사는 나가지 않는다', cancelShots.stagger === 1, `(${cancelShots.stagger})`);
check('예약 발사 — 2페이즈 포효로 끊겨도 나가지 않는다', cancelShots.phase2 === 1, `(${cancelShots.phase2})`);
check('예약 발사 — 경직되면 협공 뒤 탄도 나가지 않는다', cancelShots.pincerCancel);
```

- [ ] **Step 2: 실패 확인** — `node tests/motions.mjs` → 새 검사 중 stagger/phase2/pincerCancel FAIL (none 은 통과).

- [ ] **Step 3: `js/game.js`** — `scheduleProjectile` 을 바꾸고 바로 뒤에 `cancelScheduled` 를 넣는다.

```js
  /** src = 예약한 공격 인스턴스(선택). 그 공격이 끊기면 cancelScheduled(src) 로 같이 취소된다 */
  Game.prototype.scheduleProjectile = function (delay, make, cue, src) {
    this.pendingShots.push({ t: delay, make: make, cue: !!cue, src: src || null });
  };

  /** 끊긴 공격이 예약해 둔 발사를 지운다 — "보스를 끊었는데 탄이 그대로 나온다" 를 막는다 (Task 15.1) */
  Game.prototype.cancelScheduled = function (src) {
    if (!src) return;
    for (var i = this.pendingShots.length - 1; i >= 0; i--) {
      if (this.pendingShots[i].src === src) this.pendingShots.splice(i, 1);
    }
  };
```

- [ ] **Step 4: `js/boss.js`**
  - `fire` 의 예약 줄을 `for (var i = 1; i < def.volley.count; i++) g.scheduleProjectile(iv * i, make, true, this.attack);` 로 바꾼다(`fire` 는 `onActiveStart` 에서 불리므로 그때 `this.attack` 이 그 공격 인스턴스다).
  - `cancelAttackSpawns` 의 `a.spawns` 블록 다음(함수 끝 `};` 앞)에 넣는다:

```js
    this.game.cancelScheduled(a);                  // 연사 후속탄·협공 뒤 탄 — 끊긴 공격이 예약한 발사 (Task 15.1)
```

  - ⚠️ 함수 머리의 `if (!a || !a.zones) return;` 는 그대로 둔다(새 줄은 그 뒤에 온다).

- [ ] **Step 5: `js/motions.js`** — `MOTIONS.pincer.active` 의 `g.scheduleProjectile(Math.max(0, eta + pc.gap - backTravel), function () { return backShot(boss, def, g); }, false);` 에 4번째 인자 `a` 를 더한다.

- [ ] **Step 6: 통과 + 회귀 (순차, 헤드리스)**
  - `node tests/motions.mjs` → `MOTIONS PASSED`
  - `node tests/state.mjs` → `STATE PASSED`
  - `node tests/bot.mjs --all --seed=7` → 12/12 VICTORY (보스 1~4 승패 기준선과 같다 — 시간·hits 편차는 노이즈). HOLLOW·ADAMANT 완벽 봇 피격이 줄었는지 hitLog 를 보고 기록한다.

- [ ] **Step 7: 커밋** — `fix(engine): 끊긴 공격의 예약 발사 취소 — 경직·포효 중 연사 후속탄이 코앞에서 나가던 결함` (파일: js/game.js js/boss.js js/motions.js tests/motions.mjs)

---

## Task 16: 밸런스 — 8보스 3시드

**Files:**
- Modify: `js/bosses/lantern.js` … `adamant.js` (hp·par·gap·동작 수치만)
- Create: `docs/qa/balance-2026-09-2x.md` (x = 실행일)

- [ ] **Step 1: 기준을 읽는다** — `docs/qa/balance-2026-09-19.md` §5·§6, handover 교훈 3(hp 는 길이 레버가 아니다)·10(`--all` 로 채택)·14(3시드)·15(A/B).

- [ ] **Step 2: 세 프로파일 × 3시드를 순차로 돌린다** (9회, 동시 실행 금지)

```bash
for S in 7 11 23; do
  node tests/bot.mjs --all --seed=$S
  node tests/bot.mjs --all --seed=$S --jitter=0.05 --miss=0.15 --think=0.25
  node tests/bot.mjs --all --seed=$S --miss=0.3 --jitter=0.09 --think=0.45
done
```

기준(스펙 §5 G3·G4): 보스 1~4 승패가 기준선(Task 0)과 같다 · 완벽 12/12 매 시드 · 숙련 5~11 은 3시드 중 2 이상(BASTION 1/3 허용), 12 ADAMANT 1/3 이상 · 평균 5~12 는 3시드 중 2 이상 DEFEAT.

- [ ] **Step 3: 레버를 하나씩** — 기준을 벗어난 보스만. 순서: 패턴 구성(금 공급) → gap → 동작 수치(스펙 §6 표의 방향) → par. 변경 전후를 각각 3시드로 잰다(교훈 15). **hp 로 길이를 맞추지 않는다.**

- [ ] **Step 4: par 확정** — 숙련 승리 시간 중앙값 × 2 (스펙 §0 관행).

- [ ] **Step 5: 연타·하드**

```bash
node tests/mash.mjs --all --seeds=7,11,23 --riposte --expect-lose
node tests/bot.mjs --all --seed=7 --hard
```

Expected: 연타 0/36 · 하드 12/12.

- [ ] **Step 6: 기록** — `docs/qa/balance-2026-09-2x.md`: 기준선(Task 0 표) · 3프로파일 × 3시드 표(보스 1~12) · 시도한 레버 전부(되돌린 것 포함, 이유와 함께) · 확정 hp·par. 형식은 `balance-2026-09-19.md` 와 같게.

- [ ] **Step 7: 커밋** (사용자 확인 후) — `balance: 챕터 2·3 재설계 8보스 hp·par 확정 — 3시드 실측 근거 포함`

---

## Task 16.1: 엔진 — 반응 시간이 없는 되받아치기(deflect) 금지

(컨트롤러가 추가한 태스크 — Task 16 밸런스 실측에서 발견. 판정 근거: ledger "Ruling (T16 deflect)".)

**문제**: BASTION 은 플레이어 쪽 투사체가 보스의 `C.BOSS.DEFLECT_REACH`(120) 안에 들어온 첫 스텝에 확률로 되받아친다(`Boss.prototype.tryDeflect`). 플레이어가 보스 가까이에서 손패 shot(VOLLEY)을 쏘면 탄이 쏘자마자 되받혀 **플레이어에게서 28px 떨어진 곳**에서 되돌아오고 0.01초 뒤 맞는다(Task 16 실측: 되받힌 손패 VOLLEY 15/15). 되받기는 확률이라 박자로 예측할 수도 없다 — 사람도 봇도 반응할 수 없는 타격이다. 기둥(gate/cage)이 플레이어를 보스 가까이 붙게 만들어 더 자주 일어난다. 기존 원칙("코앞에서 생긴 탄은 받을 수 없다" — HOLLOW·ADAMANT·TEMPEST 주석)과 같은 결함이다.

**컨트롤러 판정**: 되돌아온 탄이 플레이어의 받는 거리(`C.PARRY.PROJECTILE_CATCH`)에 닿기까지 `C.BOSS.DEFLECT_MIN_REACT` 초 미만이면 **되받지 않는다**(탄은 그대로 보스에게 간다). 되받기 확률(rng) 추첨보다 **먼저** 검사한다 — 되받을 수 없는 탄에 확률을 쓰지 않는다. deflect 를 쓰는 보스는 BASTION 하나뿐이라 챕터 1 은 영향이 없다.

**Files:**
- Modify: `js/config.js` (`BOSS.DEFLECT_MIN_REACT`)
- Modify: `js/boss.js` (`tryDeflect`)
- Test: `tests/motions.mjs` (새 블록)

- [ ] **Step 1: 실패하는 테스트** — `tests/motions.mjs` 의 `/* ---- 새 동작 검사는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다.

```js
/* ---- 반응 시간이 없는 되받아치기 금지 (Task 16.1) ------------------------- */
const deflect = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const oldP1 = C.BOSS.DEFLECT_CHANCE_P1;
  C.BOSS.DEFLECT_CHANCE_P1 = 1;                      // 확률 제거 — 되받을 수 있으면 반드시 되받는다
  const shoot = (px, bx) => {
    T.setup({}, px, bx, { deflect: true });
    const skill = { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 };
    const pr = new window.Projectile({ x: px + 22, y: C.VIEW.FLOOR_Y - 48, vx: C.RIPOSTE_KINDS.shot.projSpeed,
                                       r: 9, tell: 'player', owner: 'player', damage: 20, fromHand: skill });
    g.projectiles.push(pr);
    let deflectedAt = null, catchAt = null;
    T.run(1.5, (gg) => {
      if (deflectedAt === null && pr.owner === 'boss') deflectedAt = gg.time;
      if (deflectedAt !== null && catchAt === null && Math.abs(pr.x - gg.player.x) <= C.PARRY.PROJECTILE_CATCH) catchAt = gg.time;
    });
    return { deflected: deflectedAt !== null, react: deflectedAt !== null && catchAt !== null ? +(catchAt - deflectedAt).toFixed(3) : null,
             bossHp: g.boss.hp };
  };
  out.far = shoot(300, 700);                          // 멀리서 쏜 탄 — 되받는다, 반응 시간 ≥ DEFLECT_MIN_REACT
  out.near = shoot(560, 700);                         // 코앞에서 쏜 탄 — 되받지 않는다, 보스가 맞는다
  C.BOSS.DEFLECT_CHANCE_P1 = oldP1;
  out.min = C.BOSS.DEFLECT_MIN_REACT;
  return out;
});
check('되받기 — 멀리서 쏜 탄은 되받는다(반응 시간 ≥ 하한)',
  deflect.far.deflected && deflect.far.react !== null && deflect.far.react >= deflect.min - 0.02, JSON.stringify(deflect.far));
check('되받기 — 코앞에서 쏜 탄은 되받지 않는다(보스가 맞는다)',
  !deflect.near.deflected && deflect.near.bossHp < 999, JSON.stringify(deflect.near));
```

- [ ] **Step 2: 실패 확인** — `node tests/motions.mjs` → `코앞에서 쏜 탄은 되받지 않는다` FAIL(현재는 되받는다). `멀리서` 는 통과할 수 있다(상한을 넣기 전에도 멀면 되받으므로) — 그래도 반응 시간 값이 기록된다.

- [ ] **Step 3: 상수 — `js/config.js`** — `BOSS` 블록의 `DEFLECT_RECOVER: 0.45,` 줄 다음에 넣는다.

```js
      /* 되받은 탄이 플레이어의 받는 거리(PARRY.PROJECTILE_CATCH)에 닿기까지 이만큼(초)은 걸려야 되받는다 (Task 16.1).
         MIN_WINDUP(0.34, 반응 하한) + 여유. 되받기는 확률이라 박자로 예측할 수 없으므로 반응 시간을 보장해야 한다 */
      DEFLECT_MIN_REACT: 0.40,
```

- [ ] **Step 4: `js/boss.js` `tryDeflect`** — `if (!open) return false;` 다음 줄에 넣고, 아래쪽의 기존 `var speed = Math.min(B.DEFLECT_SPEED_MAX, Math.abs(pr.vx) * B.DEFLECT_SPEED_MULT);` 줄은 **지운다**(위에서 계산한 `speed` 를 그대로 쓴다).

```js
    // 반응 시간이 없는 되받기는 하지 않는다 — 코앞에서 쏜 탄을 그 자리에서 되돌리면 받는 거리 안에서
    // 되돌아와 반응할 수 없다 (Task 16.1). 확률 추첨보다 먼저 본다
    var speed = Math.min(B.DEFLECT_SPEED_MAX, Math.abs(pr.vx) * B.DEFLECT_SPEED_MULT);
    var room = Math.abs(pr.x - this.game.player.x) - C.PARRY.PROJECTILE_CATCH;
    if (room / speed < B.DEFLECT_MIN_REACT) return false;
```

- [ ] **Step 5: 통과 + 회귀 (순차, 헤드리스)**
  - `node tests/motions.mjs` → `MOTIONS PASSED`
  - `node tests/state.mjs` → `STATE PASSED`
  - `node tests/bot.mjs --boss=7 --seed=7` (완벽) · `--seed=11` · `--seed=23` → 결과 기록(채택 판정은 Task 16 재측정). hitLog 에 `DEFLECT@…` 가 남는지, 남으면 그 순간 플레이어–탄 거리가 충분했는지 기록.

- [ ] **Step 6: 커밋** — `fix(engine): 반응 시간이 없는 되받아치기 금지 — 코앞에서 쏜 손패 탄이 28px 에서 되돌아오던 결함` (파일: js/config.js js/boss.js tests/motions.mjs)

---

## Task 16.5: 재미 QA — 봇 지표 · 화면 점검 · 플레이어 관점 검토단 (사용자 요청 2026-09-23)

사용자 결정: "보스 재작성 뒤 풀 QA". 재미 **자체**는 기계가 못 잰다 — 이 태스크는 **재미를 해치는 신호**를 찾아 사용자 플레이테스트(G8)가 볼 곳을 좁힌다. 결과는 Task 17 의 플레이테스트 체크리스트에 보스별 "여기를 봐 달라" 항목으로 들어간다.

**Files:**
- Create: `tools/funqa.mjs` (헤드리스 계측 — 게임 코드는 건드리지 않는다. 페이지 안에서 `FX.tellBurst`·`Game.prototype.damagePlayer` 를 감싸 시각을 기록한다)
- Create: `docs/qa/funqa-2026-09-2x.md`

- [ ] **Step 1: 계측 도구** — `tools/funqa.mjs --all --seeds=7,11,23 [--profile=skilled|average]`. `tests/bot.mjs` 의 `installBot`·`TUNE` 을 import 해 같은 봇으로 돌리고(`tools/shots.mjs` 선례), 보스마다 기록한다:
  - **억울한 피격**: 피격 직전 `C.BOSS.MIN_WINDUP`(0.34s) 안에 그 원천의 텔 버스트가 없었던 피격 · 같은 원천 1초 안 연속 피격 · 텔 없이 몸 위에서 생긴 위협.
  - **죽은 시간**: `currentAttack`·투사체·존·빔·기둥·표식·메아리가 모두 비어 있는 구간이 1.5s 를 넘는 비율.
  - **사망 원인 쏠림**: 피격 원천(label) 분포 — 한 원천이 60% 를 넘으면 표시.
  - **실력 변별**: 숙련 대 평균 프로파일의 승률·피격 수 차 — 차가 없으면 "실력이 결과를 안 가른다".
  - **결정 밀도**: 초당 위협 수, 패턴 반복(같은 패턴 연속 선택 비율).
  - 출력은 보스 × 지표 표(JSON + 콘솔 요약). 🔴 브라우저 측정은 직렬.
- [ ] **Step 2: 화면 점검** — 보스마다 새 동작이 나오는 순간을 헤드리스로 연속 캡처(`tests/shots/funqa-<boss>-*.png`)해 텔이 다른 효과·실루엣에 가려지는지, 어둠(HOLLOW)에서 표식 링이 보이는지 본다.
- [ ] **Step 3: 플레이어 관점 검토단** — 오케스트레이터가 Workflow 로 돌린다: 서로 다른 플레이어 페르소나(소울류 숙련자 · 캐주얼 · 리듬게임 유저 · 색 구분이 어려운 플레이어)가 Step 1 표·Step 2 캡처·보스 정의를 보고 "재미 위험"을 보스별로 제출 → 다른 에이전트들이 반박(적대적 검증) → 2표 이상 살아남은 것만 채택.
- [ ] **Step 4: 기록** — `docs/qa/funqa-2026-09-2x.md`: 지표 표, 캡처 목록, 살아남은 재미 위험(보스별, 근거와 함께), 봇이 못 재는 항목(악보 외우기·반격 자세 참기·어둠 속 표식·협공 순서감)의 명시. 수치로 고칠 수 있는 위험은 스펙 §6 되돌릴 기준 대로 Task 16 레버로 되돌려 보내고, 축 문제는 사용자 판단으로 넘긴다.
- [ ] **Step 5: 커밋** — `tools/funqa.mjs`·`docs/qa/funqa-*.md` (로컬, push 없음).

---

## Task 17: QA · 문서 · 플레이테스트 준비

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-riposte-design.md` (§3.5~3.12 교체, §3 공통 판정 규칙, §7 파일 구조)
- Modify: `docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md` (상태 줄)
- Modify: `README.md` (보스 표 챕터 II·III 행)
- Modify: `CLAUDE.md` (테스트 목록에 `motions.mjs`, 참조에 이 스펙·계획)
- Modify: `docs/handover.md`
- Create: `docs/qa/playtest-ch23-attacks.md`

- [ ] **Step 1: 전 게이트를 직렬로**

```bash
node tests/story.mjs
node tools/boss-overlap.mjs --check
node tests/motions.mjs
node tests/zone.mjs
node tests/smoke.mjs
node tests/state.mjs
node tests/audio-smoke.mjs
node tests/pad.mjs
node tests/options.mjs
node tests/dev.mjs
```

Expected: 전부 PASSED. (봇·연타·하드는 Task 16 결과를 인용한다 — 그 뒤 `js/` 가 바뀌었으면 다시 돈다.)

- [ ] **Step 2: 눈 검사** — `?boss=N&story=0&mute=1` 로 헤드리스 스크린샷(`tests/shots/`): 부메랑 귀환 텔 · 협공 뒤 탄 텔 · 빔 예고/이동 · 기둥 · 표식 링(HOLLOW 어둠 위) · 반격 자세 링 · 악보 음표 줄 · 메아리 잔상. **텔 대비가 모든 아레나에서 유지되는지** 본다. 브라우저 창을 띄우지 않는다(헤드리스만).

- [ ] **Step 3: 플레이테스트 체크리스트 — `docs/qa/playtest-ch23-attacks.md`**

```markdown
# 챕터 2·3 공격 재설계 — 사람 플레이테스트 (스펙 2026-09-23 §5 G8)

봇이 못 재는 것: 외우기(악보)·참기(반격 자세)·어둠 속 표식·색이 바뀌는 탄의 읽기.
진입: 타이틀 → BOSS SELECT, 또는 `index.html?boss=N&story=0` (저장 안 함).

| # | 보스 | 새 동작 | 질문 (예/아니오 + 한 줄) |
|---|---|---|---|
| 5 | LANTERN | 부메랑 | 적 탄을 넘긴 뒤, 등 뒤에서 금으로 돌아오는 것을 **보고** 받았나? 모르고 맞았나? |
| 6 | CHORUS | 악보·메아리 | 콜을 듣고 3타째까지 외워서 받을 수 있나? 잔상이 어디서 칠지 기억했나? |
| 7 | BASTION | 기둥 | 물러설 곳이 막혔을 때 "정면으로 받아낸다"로 느꼈나, "갈 곳이 없다"로 느꼈나? |
| 8 | AVARICE | 끌어당김 | 버틸지 받을지 **고를 수** 있었나? |
| 9 | SENTINEL | 쓸기 빔 | 빔 쪽으로 대시해야 한다는 걸 몇 번 만에 알았나? |
| 10 | TEMPEST | 협공 | 앞을 받고 뒤를 넘는 순서가 읽혔나, 손이 모자랐나? **"그냥 패리하고 대시하는 순서"로만 느껴졌나?** (그렇다면 스펙 §6 — gap 을 줄여 겹치게) |
| 11 | HOLLOW | 표식 | 어둠 속에서 표식 링만 보고 타이밍을 잡았나? |
| 12 | ADAMANT | 반격 자세 | 자세(회색 점선 링)와 보통 윈드업을 가를 수 있었나? 벌이 억울했나? |

공통: 이 보스가 "챕터 1 과 다른 걸 하고 있다"고 느꼈나? (G8 채택 조건)
되돌릴 기준은 스펙 §6. 채택/보류/폐기를 보스마다 적는다.
```

- [ ] **Step 4: 문서 갱신**
  - 설계 스펙 §3.5~3.12: 각 보스의 공격 표·패턴·"챕터 1 이 쓰지 않는 공간 모양"을 새 구성으로 바꾸고, 확정 hp·par(Task 16)를 제목에 반영. §3 공통의 판정 규칙에 (d) 재활용 검사 1문장. §7 파일 구조에 `js/motions.js`·`tests/motions.mjs`.
  - `README.md` 보스 표: 챕터 II·III 행의 설명을 새 동작으로.
  - `CLAUDE.md`: Vitals 테스트 목록에 `` `motions.mjs`(새 공격 동작) `` 를 더하고, 참조에 이 스펙·계획 경로와 `docs/qa/playtest-ch23-attacks.md`. 100줄 이내 유지.
  - `docs/handover.md`: 상태 줄(브랜치 `feat/ch23-attacks`, 사용자 플레이 대기) · 교훈(판정기가 수치 변주를 못 잡은 이유 — 서명에 행동을 바꾸는 표지만 넣는다) · 남은 과제(플레이테스트 결과 반영, 챕터 1·2 기준선 재조정 미결). 🔴 handover 09-19 의 "`feat/chapter3-attacks` 착수" 문구는 그 브랜치가 만들어진 적이 없으므로 이 브랜치로 정정한다.
  - 새 스펙(`2026-09-23-riposte-ch23-attacks-design.md`) 상태 줄: "구현 완료 — 사용자 플레이 판정 대기". §2.4 머리에 "확정 구성은 설계 스펙 §3.5~3.12 가 정본 — 이 절은 출발안 기록" 한 줄을 넣는다(구현 뒤 낡은 목록이 정본처럼 읽히지 않게).

- [ ] **Step 5: 커밋** (사용자 확인 후)

```bash
git add docs README.md CLAUDE.md
git commit -m "docs: 챕터 2·3 공격 재설계 반영 — 스펙 §3.5~3.12·README·핸드오버·플레이테스트 체크리스트"
```

- [ ] **Step 6: main 머지·push 는 하지 않는다.** 사용자 플레이테스트(G8) 뒤 사용자 결정. push 는 Pages 배포 트리거라 매번 확인(전역 규칙).

---

## Task 18: 사용자 플레이테스트 반영 (사용자 결정 뒤)

- [ ] **Step 1:** 사용자가 `docs/qa/playtest-ch23-attacks.md` 에 적은 판정을 읽는다.
- [ ] **Step 2:** "폐기"된 동작은 스펙 §6 되돌릴 기준대로 되돌리거나 축을 바꾼다 — **수치로 덮지 않는다.** 되돌린 보스는 Task 16 의 3시드 측정을 그 보스에 대해 다시 한다.
- [ ] **Step 3:** 전원 채택이면 `superpowers:finishing-a-development-branch` 로 머지 방식을 사용자와 정한다.
