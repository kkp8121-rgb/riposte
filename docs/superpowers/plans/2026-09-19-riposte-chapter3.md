# 챕터 3 (THE WALL) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 9~12스테이지(챕터 III — THE WALL) 보스 4종과 그에 필요한 최소 엔진 훅을 넣고, 전 12스테이지 밸런스·QA 를 통과시킨다.

**Architecture:** 보스는 전부 `js/bosses/*.js` 의 데이터 테이블이다. 엔진에는 훅 4개(`Zone.linger` · 아레나 `darkness` · `wall` · `counterOnly`)만 더한다. 새 플레이어 동사는 0개다. 엔딩·인터루드 흐름은 `C.CHAPTERS` 와 보스 배열 길이로만 결정되므로 **챕터 3 을 등록하는 것만으로 8스테이지가 인터루드가 되고 엔딩이 12스테이지 뒤로 간다 — `js/game.js` 흐름 코드는 건드리지 않는다.**

**Tech Stack:** 바닐라 JS + Canvas 2D, classic `<script>` 로딩, 빌드 없음, 외부 에셋 0. 테스트는 playwright-core 헤드리스.

**Spec:** `docs/superpowers/specs/2026-09-19-riposte-chapter3-design.md`

## Global Constraints

스펙에서 그대로 옮긴다. **모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다.**

- 플레이어 자기 공격 0개. **새 플레이어 동사 0개** — 가드 브레이크·홀드 패리·점프 금지.
- 금 = 패리, 적 = 대시. **세 번째 색·세 번째 대응을 만들지 않는다.**
- 플래시 → 타격 시간은 공격별로 **항상 일정**. 같은 공격이 회차마다 다른 박자를 가지면 안 된다.
- 아레나 경계 상수 `V.MIN_X`(60) / `V.MAX_X`(900) 를 **바꾸지 않는다.**
- 매직넘버 금지 — 전역 수치는 `js/config.js`, 보스 수치는 그 보스 파일.
- 기존 파일은 **Edit(부분 치환)만**. Write 전체 덮어쓰기 금지.
- 코드 주석은 한국어. 영어 기술 용어를 어색한 한자어로 직역하지 않는다(버퍼·존·페이즈 등 통용어/원어).
- `window.__RIPOSTE.getState()` 는 **필드 추가만**. 기존 필드를 바꾸면 하네스가 깨진다.
- 🔴 **`node tools/boss-overlap.mjs --check` 를 `overlapIntended` 선언 없이 통과해야 한다.** 판정기가 걸리면 **수치를 만지지 말고 공격 구성(kind/tell)이나 패턴 모양을 바꾼다.**
- 🔴 **브라우저 측정은 동시에 돌리지 않는다.** 실행 전 `Get-CimInstance Win32_Process -Filter "name='node.exe'" | ? { $_.CommandLine -match 'tests/' }` 가 비어 있는지 확인한다.
- 🔴 **BASTION(보스 7) 은 숙련 프로파일 승률이 약 1/3 이다.** 1회 DEFEAT 는 회귀가 아니다 — 3회 중 1회 VICTORY 면 통과(`docs/qa/balance-2026-09-18.md` 정정 절).
- 🔴 **되돌릴 기준**(스펙 §7): 어떤 축이든 "근본의 재미를 해친다"는 신호가 보이면 **수치로 덮지 말고 축을 버린다.**

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `js/config.js` | 전역 상수 | `CHAPTERS` 3번 추가, `ARENA.wall`, `ZONE.LINGER_*`, `DEV`, `BOSS.WALL_*` |
| `js/input.js` | 입력 | dev 커맨드 시퀀스 감지(물리 키 코드) |
| `js/game.js` | 상태·판정·저장 | dev 모드 플래그·치트 키 처리, `getState` 필드 추가 |
| `js/ui.js` | HUD·화면 | DEV 배지, dev 오버레이 |
| `js/entities.js` | Zone·Projectile·Player | `Zone.linger` |
| `js/boss.js` | 보스 상태 머신 | `wall` 생명주기, `counterOnly` 피해 게이트 |
| `js/render.js` | 그리기 | 어둠 레이어, 방벽 그리기, 새 실루엣 3종 |
| `js/bosses/sentinel.js` | 보스 9 정의 | 신규 |
| `js/bosses/tempest.js` | 보스 10 정의 | 신규 |
| `js/bosses/hollow.js` | 보스 11 정의 | 신규 |
| `js/bosses/adamant.js` | 보스 12 정의 | 신규 |
| `js/story.js` | 대사 테이블 | 4보스 × before/after |
| `index.html` | 스크립트 로딩 | 보스 4개 `<script>` |
| `tests/dev.mjs` | dev 모드·치트 검증 | 신규 |

---

## Task 1: dev 모드 + 개발용 치트

가장 먼저 한다 — 이후 모든 태스크의 확인 비용을 줄인다. 12스테이지를 손으로 도는 대신 원하는 보스로 바로 갈 수 있어야 한다.

**Files:**
- Modify: `js/config.js` (새 `DEV` 블록)
- Modify: `js/input.js` (커맨드 시퀀스 감지)
- Modify: `js/game.js` (dev 플래그·치트 키·`getState`)
- Modify: `js/ui.js` (DEV 배지·오버레이)
- Modify: `js/main.js` (`?dev=1`)
- Test: `tests/dev.mjs` (신규)

**Interfaces:**
- Consumes: 없음(첫 태스크)
- Produces: `game.dev` (bool) · `game.devOverlay` (bool) · `getState().dev` (bool). 이후 태스크의 테스트가 `?dev=1` 로 특정 보스에 바로 진입해 확인할 수 있다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/dev.mjs` 를 만든다. 기존 `tests/pad.mjs` 의 구조(헤더 주석·`check()` 헬퍼·`PAD PASSED` 형식 판정 줄·exit code)를 그대로 따른다.

```js
/* =============================================================================
 * RIPOSTE — tests/dev.mjs
 * dev 모드(타이틀에서 THIEF 입력 / ?dev=1)와 개발용 치트 검증.
 * 기본은 꺼져 있어야 하고, 치트 판은 저장하지 않아야 한다.
 * ========================================================================== */
// (상세 구현은 pad.mjs 를 본뜬다)

// 검사 1: 기본은 꺼짐 — 치트 키를 눌러도 아무 일도 없다
await page.goto(url + '?boss=1&story=0&mute=1');
await until(page, (s) => s.scene === 'FIGHT', 8000);
const hp0 = (await state()).bossHp;
await press('F2');                      // 켜지지 않았으므로 무시돼야 한다
check('치트는 기본으로 꺼져 있다', (await state()).bossHp === hp0);

// 검사 2: 타이틀에서 THIEF 를 치면 켜진다
await page.goto(url + '?story=0&mute=1');
await until(page, (s) => s.scene === 'TITLE', 8000);
for (const c of ['KeyT','KeyH','KeyI','KeyE','KeyF']) await press(c);
check('THIEF 입력으로 dev 모드가 켜진다', (await state()).dev === true);

// 검사 3: 전투 중에는 커맨드가 먹지 않는다
// (?boss=1 로 FIGHT 진입 후 THIEF 를 쳐도 dev 가 false 여야 한다)

// 검사 4: F2 는 보스 HP 를 25% 깎는다  (?dev=1&boss=1)
// 검사 5: F3 는 보스를 즉시 처치한다 (scene 이 VICTORY 로 간다)
// 검사 6: F4 는 다음 보스로 간다 (bossId 가 바뀐다)
// 검사 7: 치트 판은 저장하지 않는다 (localStorage 의 unlocked 가 늘지 않는다)
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node tests/dev.mjs`
Expected: FAIL — `getState().dev` 가 `undefined` 라 검사 2 가 떨어진다.

- [ ] **Step 3: 상수를 넣는다**

`js/config.js` 의 `MENU` 블록 뒤에 추가한다.

```js
    /* ---- 개발용 (스펙 §5.5) — 기본 꺼짐. 배포본에서 우연히 밟히면 안 된다 ---- */
    DEV: {
      /* 타이틀에서 이 물리 키 코드를 순서대로 누르면 토글. 액션이 아니라 코드를 본다 —
         키 리바인드와 서로 간섭하지 않는다. 지금 어떤 액션에도 안 묶인 글자만 골랐다. */
      CODE: ['KeyT', 'KeyH', 'KeyI', 'KeyE', 'KeyF'],
      CODE_GAP: 2.0,          // 글자 사이가 이보다 벌어지면 버퍼를 비운다 (초)
      HP_CUT: 0.25,           // F2 한 번에 깎는 보스 최대 HP 비율
      BADGE: 'DEV',
      BADGE_X: 906, BADGE_Y: 16
    },
```

- [ ] **Step 4: 커맨드 감지를 넣는다**

`js/input.js` — `handleDown` 안, 액션 매핑 **앞**에 시퀀스 버퍼를 둔다. 액션 처리는 그대로 두고 감지만 얹는다(이 글자들은 어떤 액션에도 안 묶여 있으므로 충돌하지 않는다).

```js
  /* dev 커맨드 — 물리 키 코드 시퀀스. 타이틀에서만 소비한다(게임이 판단).
     여기서는 "방금 코드가 완성됐다"만 알려 준다. */
  Input._devSeq = 0;
  Input._devT = 0;
  Input.onDevCode = null;          // 게임이 붙인다

  function feedDevCode(code, nowSec) {
    var C2 = global.CONFIG.DEV;
    if (nowSec - Input._devT > C2.CODE_GAP) Input._devSeq = 0;
    Input._devT = nowSec;
    if (code === C2.CODE[Input._devSeq]) {
      Input._devSeq++;
      if (Input._devSeq >= C2.CODE.length) {
        Input._devSeq = 0;
        if (typeof Input.onDevCode === 'function') Input.onDevCode();
      }
    } else {
      Input._devSeq = (code === C2.CODE[0]) ? 1 : 0;
    }
  }
```

`handleDown` 에서 `feedDevCode(e.code, (global.performance ? global.performance.now() : Date.now()) / 1000)` 를 부른다.

- [ ] **Step 5: 게임 쪽 처리를 넣는다**

`js/game.js` 생성자에 `this.dev = !!opts.dev; this.devOverlay = false;` 를 더한다. `js/main.js` 의 URL 파싱에 `dev: p.dev !== undefined` 를 넘긴다.

`Input.onDevCode` 를 붙여 **`scene === 'TITLE'` 일 때만** 토글한다.

```js
  Input.onDevCode = (function (g) {
    return function () {
      if (g.scene !== 'TITLE') return;   // 전투 중 오발동 방지
      g.dev = !g.dev;
      RAudio.ui(g.dev);
    };
  })(this);
```

치트 키는 `stepFight` 의 입력 처리에 더한다. **`this.dev` 가 아니면 한 줄도 실행되지 않는다.**

```js
    /* 개발용 치트 — dev 모드에서만. 이 판은 저장하지 않는다 */
    if (this.dev) {
      if (Input.consumeCode('F1')) this.devOverlay = !this.devOverlay;
      if (Input.consumeCode('F2') && b) { this.noSave = true; b.takeDamage(b.maxHp * C.DEV.HP_CUT); }
      if (Input.consumeCode('F3') && b) { this.noSave = true; b.takeDamage(b.hp); }
      if (Input.consumeCode('F4')) {
        this.noSave = true;
        var dir = Input.down.dash ? -1 : 1;      // Shift 를 누른 채면 이전 보스
        this.startBoss(clamp(this.bossIndex + dir, 0, this.defs.length - 1), { skipBefore: true });
      }
    }
```

`Input.consumeCode(code)` 를 `js/input.js` 에 더한다 — 액션이 아니라 물리 키 코드를 한 스텝에서 한 번만 소비한다(F키는 어떤 액션에도 안 묶이므로 별도 경로가 맞다).

- [ ] **Step 6: 배지와 오버레이를 그린다**

`js/ui.js` — `game.dev` 면 `C.DEV.BADGE` 를 우상단에 그린다. `game.devOverlay` 면 보스·HP·스태미너·페이즈·시드를 한 줄씩 그린다. 좌표는 `C.DEV` 상수.

보스 선택 화면은 `game.dev` 면 클리어 여부와 무관하게 전부 띄운다.

- [ ] **Step 7: `getState` 에 필드를 더한다**

```js
      dev: this.dev,
```

- [ ] **Step 8: 테스트가 통과하는지 본다**

Run: `node tests/dev.mjs`
Expected: `DEV PASSED — all checks green`

- [ ] **Step 9: 회귀를 본다**

Run (순차): `node tests/smoke.mjs` · `node tests/pad.mjs` · `node tests/options.mjs` · `node tests/bot.mjs --all --seed=7`
Expected: 전부 통과. dev 가 기본 꺼짐이라 기존 동작이 바뀌면 안 된다.

- [ ] **Step 10: 커밋**

```bash
git add js/config.js js/input.js js/game.js js/ui.js js/main.js tests/dev.mjs
git commit -m "feat(dev): 타이틀에서 THIEF 입력으로 dev 모드 — 보스 HP 감소·즉시 처치·스테이지 이동"
```

---

## Task 2: 엔진 — 지속형 위험 구역 (`Zone.linger`)

SENTINEL 이 쓸 "서 있으면 맞는" 영역. 지금 `Zone` 은 `delay` 뒤 한 번 때리고 0.22초 만에 사라진다.

**Files:**
- Modify: `js/config.js` (`ZONE.LINGER_TICK`)
- Modify: `js/entities.js:304-332` (`Zone`)
- Modify: `js/boss.js:296-311` (존 생성 시 `linger` 전달)
- Modify: `js/render.js` (지속 구역 그리기)
- Test: `tests/zone.mjs` (신규)

**Interfaces:**
- Consumes: Task 1 의 dev 모드(확인용)
- Produces: 공격 정의에 `zone: { w, damage, linger: <초> }` 를 쓰면 그 시간 동안 남아 주기적으로 때리는 구역. SENTINEL(Task 3)이 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/zone.mjs` 를 만든다. 브라우저에서 `Zone` 을 직접 만들어 `linger` 동작만 본다(보스가 없어도 검증할 수 있다).

```js
/* =============================================================================
 * RIPOSTE — tests/zone.mjs
 * 지속형 위험 구역(Zone.linger) 단위 검증. 기존 단발 존의 동작이 바뀌지 않는지도 본다.
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
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?boss=1&story=0&mute=1',
  { waitUntil: 'load' });

/* 단발 존 — linger 없이 만들면 때린 뒤 STRIKE_TIME 안에 죽어야 한다 */
const once = await page.evaluate(() => {
  const C = window.CONFIG;
  const g = window.__RIPOSTE.game;
  const z = new window.Zone({ x: 300, w: 100, delay: 0, damage: 1, tell: 'red', label: 'T' });
  z.update(0.001, g);                       // 낙하
  const struckNow = z.struck;
  z.update(C.ZONE.STRIKE_TIME + 0.01, g);   // 타격 연출 종료
  return { struckNow, dead: z.dead };
});
check('단발 존은 한 번 때리고 사라진다', once.struckNow && once.dead === true,
  JSON.stringify(once));

/* 지속 존 — linger 를 주면 같은 시간이 지나도 살아 있고 다시 때린다 */
const kept = await page.evaluate(() => {
  const C = window.CONFIG;
  const g = window.__RIPOSTE.game;
  const z = new window.Zone({ x: 300, w: 100, delay: 0, damage: 1, tell: 'red',
                              label: 'T', linger: C.ZONE.LINGER_TICK * 2.5 });
  z.update(0.001, g);
  z.update(C.ZONE.STRIKE_TIME + 0.01, g);
  const aliveAfterFirst = !z.dead;
  z.update(C.ZONE.LINGER_TICK + 0.01, g);   // 다음 타격
  const struckAgain = z.struck;
  return { aliveAfterFirst, struckAgain };
});
check('지속 존은 첫 타격 뒤에도 살아 있다', kept.aliveAfterFirst, JSON.stringify(kept));
check('지속 존은 LINGER_TICK 뒤 다시 때린다', kept.struckAgain, JSON.stringify(kept));

await browser.close();
if (failures.length) { console.log(`ZONE FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('ZONE PASSED — all checks green');
```

⚠️ `Zone` 이 전역에 노출돼 있지 않으면 이 테스트가 못 돈다. `js/entities.js` 끝에서 `global.Zone = Zone;` 로 내보내고 있는지 `grep -n "global.Zone" js/entities.js` 로 확인한다. 없으면 **내보내는 한 줄을 더한다**(다른 엔티티들이 어떻게 노출되는지 그 파일의 기존 방식을 따른다).

- [ ] **Step 2: 상수를 넣는다**

`js/config.js` 의 `ZONE` 블록에 추가한다.

```js
    ZONE: {
      STRIKE_TIME: 0.22,
      STRIP_H: 10,
      COLUMN_ALPHA: 0.20,
      /* 지속형 구역(스펙 §4) — linger 가 있으면 그 시간 동안 남아 이 간격으로 다시 때린다.
         간격은 피격 무적(PLAYER.HURT_IFRAMES 0.8)보다 커야 "서 있으면 계속 맞는" 것이 아니라
         "나가라"는 신호가 된다. */
      LINGER_TICK: 0.9
    },
```

- [ ] **Step 3: `Zone` 에 linger 를 더한다**

`js/entities.js` `Zone` 생성자에 `this.linger = o.linger || 0;` 를 더하고, `update` 의 `strikeT <= 0` 분기를 고친다.

```js
    } else {
      this.strikeT -= dt;
      if (this.strikeT <= 0) {
        if (this.linger > 0) {
          this.linger -= C.ZONE.LINGER_TICK;   // 다음 타격까지
          this.struck = false;
          this.t = C.ZONE.LINGER_TICK;
          if (this.linger <= 0) this.dead = true;
        } else {
          this.dead = true;
        }
      }
    }
```

- [ ] **Step 4: 보스가 넘기게 한다**

`js/boss.js` 존 생성부(약 302행)의 `new Zone({...})` 에 `linger: def.zone.linger || 0` 을 더한다.

- [ ] **Step 5: 브라우저로 확인한다**

`?dev=1&boss=7&story=0&mute=1`(BASTION 은 `gate` 존을 쓴다)로 열고, 콘솔에서 `window.__RIPOSTE.getState().zones` 가 정상인지 본다. **기존 존은 `linger` 가 없으므로 동작이 한 줄도 바뀌면 안 된다.**

- [ ] **Step 6: 회귀를 본다**

Run (순차): `node tests/zone.mjs` · `node tests/bot.mjs --all --seed=7` · `node tests/smoke.mjs`
Expected: `ZONE PASSED` + 나머지 전부 통과. `linger` 를 쓰는 보스가 아직 없으므로 봇 결과는 기존과 같아야 한다.

- [ ] **Step 7: 커밋**

```bash
git add js/config.js js/entities.js js/boss.js tests/zone.mjs
git commit -m "feat(zone): 지속형 위험 구역 linger — 기존 존 동작은 불변"
```

---

## Task 3: 보스 9 SENTINEL + 챕터 3 등록 + 아레나 `wall`

**Files:**
- Create: `js/bosses/sentinel.js`
- Modify: `index.html` (스크립트 태그)
- Modify: `js/config.js` (`CHAPTERS` 3번, `ARENA.wall`)
- Modify: `js/render.js` (`BUILD.spear` — 실루엣)

**Interfaces:**
- Consumes: Task 2 의 `zone.linger`
- Produces: `BOSSES[8]`(key `sentinel`). 이후 보스들이 같은 아레나 `wall` 을 쓴다.

**설계 근거(스펙 §2.1):** 움직이지 않는 유일한 보스. 긴 리치 찌르기 + 가장자리부터 깔리는 지속 구역.

- [ ] **Step 1: 실루엣을 더한다**

`js/render.js` 의 `BUILD` 에 추가한다. `spear` 무기 렌더러는 이미 있고 아무도 쓰지 않는다.

```js
    spear:   { h: 104, w: 18, head: 0.075, hood: false, weapon: 'spear',  thick: 9 },
```

- [ ] **Step 2: 아레나를 더한다**

`js/config.js` 의 `ARENA` 에 `wall` 을 더한다. 값은 `gate` 를 본뜨되 **더 차갑고 기둥이 벽처럼 촘촘**하게. 🔴 금(`#ffd166`)·적(`#ff3b3b`) 텔 대비가 유지돼야 한다 — 배경을 밝히지 않는다.

- [ ] **Step 3: 챕터 3 을 등록한다**

```js
      { id: 3, name: 'CHAPTER III', subtitle: 'THE WALL', bosses: ['sentinel', 'tempest', 'hollow', 'adamant'] }
```

⚠️ 이 시점에는 `tempest`·`hollow`·`adamant` 파일이 아직 없다. `chapterOf` 는 보스 key 로 찾으므로 **없는 key 가 목록에 있어도 동작에 문제가 없다**(찾지 못하면 그 보스는 이 챕터가 아닌 것으로 본다). Task 6 까지 가면 채워진다.

- [ ] **Step 4: 보스 정의를 쓴다**

`js/bosses/sentinel.js` — `js/bosses/vesper.js` 의 구조를 그대로 따른다.

```js
  var SENTINEL = {
    key: 'sentinel', name: 'SENTINEL', title: 'THE SPEAR',
    color: '#8fe3c8', silhouette: 'spear',
    hp: 320, par: 55,                  // 출발값 — Task 8 밸런스가 확정한다
    armor: false, spawnX: 700, droneHz: 46,
    arena: 'wall',
    drone: { wave: 'triangle', lfo: 0.05, lfoDepth: 30, cutoff: 260, cutoffP2: 700, detune: 6 },
    weaponTip: { dx: 66, dy: 54 },
    /* 움직이지 않는다 — prefer 를 넓게 잡아 접근·후퇴 스텝이 발동하지 않게 한다 */
    prefer: { close: 60, far: 860, back: 0 },
    gap: { 1: 0.85, 2: 0.6 },
    attacks: {
      lance: {   /* 긴 찌르기 — 움직이지 않으므로 리치가 위협의 전부다 */
        id: 'lance', label: 'LANCE', tell: 'gold', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.55,
        reach: 260, approach: 0, damage: 1, swing: 'thrust',
        steal: { id: 'LANCE', label: 'LANCE', kind: 'lunge', damage: 22 }
      },
      sweep: {   /* 제자리 광역 — 붙으면 맞는다 */
        id: 'sweep', label: 'SWEEP', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.12, recover: 0.5,
        reach: 150, approach: 0, damage: 1, swing: 'arc',
        steal: { id: 'SWEEP', label: 'SWEEP', kind: 'slash', damage: 18 }
      },
      claim: {   /* 가장자리를 지운다 — 지속 구역 */
        id: 'claim', label: 'CLAIM', tell: 'red', kind: 'zone',
        windup: 0.95, active: 0.10, recover: 0.7,
        zone: { w: 200, damage: 1, anchor: 'boss', offset: -340, linger: 4.5 },
        steal: null
      }
    },
    /* 패턴 — 움직이지 않으므로 move 스텝이 없다. claim 으로 공간을 지우고 lance 로 거리를 강제한다.
       🔴 동시에 살아 있는 claim 이 둘을 넘지 않게 짠다(안전 폭 하한, 아래 주석 참조). */
    patterns: {
      1: [
        { name: 'lance',        steps: [{ atk: 'lance' }] },
        { name: 'sweep',        steps: [{ atk: 'sweep' }] },
        { name: 'claim-left',   steps: [{ atk: 'claim' }] },
        { name: 'lance-sweep',  steps: [{ atk: 'lance' }, { wait: 0.45 }, { atk: 'sweep' }] }
      ],
      2: [
        { name: 'claim-lance',  steps: [{ atk: 'claim' }, { wait: 0.3 }, { atk: 'lance' }] },
        { name: 'double-lance', steps: [{ atk: 'lance' }, { wait: 0.35 }, { atk: 'lance' }] },
        { name: 'sweep-claim',  steps: [{ atk: 'sweep' }, { wait: 0.4 }, { atk: 'claim' }] },
        { name: 'lance',        steps: [{ atk: 'lance' }] }
      ]
    }
  };
```

🔴 **안전 폭 하한**: `claim` 구역이 여러 개 겹쳐도 안전한 폭이 대시 거리(190px)보다 넓어야 한다. 아레나 폭은 840px(60~900)이므로 **동시에 살아 있는 구역의 합이 650px 를 넘지 않게** 패턴을 짠다. 이 하한을 `js/config.js` `ARENA.SAFE_MIN_W: 200` 으로 박고 주석에 근거를 적는다.

- [ ] **Step 5: 로딩에 더한다**

`index.html` 의 `js/bosses/avarice.js` 뒤에 `<script src="js/bosses/sentinel.js"></script>`.

- [ ] **Step 6: 차별화 판정기를 돌린다**

Run: `node tools/boss-overlap.mjs --check`
Expected: `OVERLAP PASSED`. 걸리면 **수치가 아니라 공격 구성(kind/tell)이나 패턴 모양을 바꾼다.**

- [ ] **Step 7: 봇으로 이길 수 있는지 본다**

Run: `node tests/bot.mjs --boss=9 --seed=7`
Expected: VICTORY. 지면 hp·par 가 아니라 **패턴 밀도**를 먼저 의심한다(handover 교훈 3 — hp 는 길이 레버가 아니다).

- [ ] **Step 8: 갇히지 않는지 본다**

Run: `node tests/bot.mjs --boss=9 --seed=7 --jitter=0.05 --miss=0.15 --think=0.25`
Expected: VICTORY. **구역에 끼어 죽으면**(hits 가 `CLAIM` 으로 몰리면) 구역 폭·`linger` 를 줄인다 — 스펙 §7 되돌릴 기준.

- [ ] **Step 9: 커밋**

```bash
git add js/bosses/sentinel.js index.html js/config.js js/render.js
git commit -m "feat(boss): 9 SENTINEL — 움직이지 않는 창, 지속 구역으로 설 자리를 지운다"
```

---

## 보스 테이블을 이 계획이 "완성된 코드"로 주지 않는 이유

Task 3 의 SENTINEL 만 전체 테이블을 싣고, Task 4~6 은 **공격 구성(kind/tell)·리치·리듬의 제약**으로 준다. 이유는 하나다 — **보스 테이블의 정답은 `tools/boss-overlap.mjs --check` 와 봇 실측이 정한다.** 계획서가 수치를 찍어 주면 구현자가 그 수치를 지키려다 판정기에 걸리고, 그때 "수치를 만지는" 잘못된 수정으로 간다(챕터 2 가 그렇게 망가졌다).

구현자는 **SENTINEL 을 형판으로 삼아** 각 태스크의 제약을 만족하는 테이블을 쓰고, 판정기와 봇이 답을 준다. 제약은 기계가 검사할 수 있게 적었다.

---

## Task 4: 보스 10 TEMPEST

**Files:**
- Create: `js/bosses/tempest.js`
- Modify: `index.html`
- Modify: `js/render.js` (`BUILD.tempest` + 필요 시 무기 렌더)

**Interfaces:**
- Consumes: Task 3 의 아레나 `wall`
- Produces: `BOSSES[9]`(key `tempest`)

**설계 근거(스펙 §2.2):** 대형 투사체 물량. 전부 받아낼 수 없게 만들어 "무엇을 버릴지" 고르게 한다.

- [ ] **Step 1: 실루엣을 더한다** — `bow`·`spear` 와 겹치지 않는 체형. 무기 없음 계열이되 `taker`(후드)와 다르게.

- [ ] **Step 2: 보스 정의를 쓴다**

🔴 **판정기 주의(스펙 §2.2)**: SERAPH 와 같은 `projectile/gold` + `projectile/red` 구성이면 공격 구성 유사도가 한계(0.75)에 닿는다. **`zone` 또는 `melee` 를 섞어 갈라놓는다.** 출발 구성 제안 — `projectile/gold`(volley) · `projectile/red` · `zone/red` · `melee/gold`.

- 동시 비행 탄이 많아도 **각 탄의 플래시 → 타격 간격은 고정**이어야 한다(Global Constraints).
- 반사된 탄이 0 거리에서 되돌아오지 않게 `C.BOSS.DEFLECT_REACH` 관련 기존 동작을 확인한다.

- [ ] **Step 3: 로딩에 더한다** — `index.html`

- [ ] **Step 4: 판정기**

Run: `node tools/boss-overlap.mjs --check`
Expected: `OVERLAP PASSED`. **걸리면 공격 구성을 바꾼다.**

- [ ] **Step 5: 봇**

Run: `node tests/bot.mjs --boss=10 --seed=7` → VICTORY
Run: `node tests/bot.mjs --boss=10 --seed=7 --jitter=0.05 --miss=0.15 --think=0.25` → VICTORY
Expected: 둘 다 승리. 숙련 봇이 "읽을 수 없어서" 죽으면(피격이 여러 공격에 고르게 퍼지면) **동시 발수를 줄인다** — 스펙 §7.

- [ ] **Step 6: 커밋**

```bash
git add js/bosses/tempest.js index.html js/render.js
git commit -m "feat(boss): 10 TEMPEST — 대형 투사체 물량, 무엇을 버릴지 고르게 한다"
```

---

## Task 5: 엔진 어둠 + 보스 11 HOLLOW

**Files:**
- Modify: `js/config.js` (`ARENA.<id>.darkness`)
- Modify: `js/render.js:793-830` (어둠 레이어)
- Create: `js/bosses/hollow.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 3 아레나 테이블
- Produces: `BOSSES[10]`(key `hollow`), 아레나 `darkness` 계수

**🔴 핵심 보호 규칙(스펙 §2.3) — 이 태스크의 성패를 가른다**

1. **텔은 절대 어두워지지 않는다.** 금 버스트·적 X자·투사체·무기 궤적 글로우는 항상 100% 밝기.
2. 어두워지는 것은 **배경·기둥·바닥·보스 몸통뿐**.
3. **HUD 는 어두워지지 않는다.**
4. "내 주변만 밝고 보스는 어둠" 안은 **기각** — 텔 문법 위반이다.

- [ ] **Step 1: 그리기 순서를 확인한다**

현재 `js/render.js` 의 순서: `drawArena` → (반사) `drawBoss`/`drawPlayer` → `drawBoss`/`drawPlayer` → `drawParticles`(텔 버스트 포함) → 백색 플래시.
투사체·존이 어디서 그려지는지 `grep -n "drawProjectile\|drawZone" js/render.js` 로 확인한다.

**어둠 레이어는 `drawBoss`/`drawPlayer` 뒤, `drawParticles` 앞에 넣는다.** 그래야 보스는 어두워지고 텔은 밝다. 투사체·존이 어둠보다 앞에 그려지면 순서를 옮긴다.

- [ ] **Step 2: 어둠을 그린다**

```js
    /* 어둠 (스펙 §2.3) — 배경·보스를 덮고, 텔·투사체·HUD 는 이 위에 그린다.
       정보를 없애는 것이 아니라 채널을 텔 하나로 줄이는 것이다. */
    var dark = arena && arena.darkness;
    if (dark) {
      var k = b && b.phase === 2 ? dark.p2 : dark.p1;
      ctx.save();
      ctx.fillStyle = 'rgba(2,3,7,' + k + ')';
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
```

출발값 `darkness: { p1: 0.72, p2: 0.85 }`.

- [ ] **Step 3: 보스 정의를 쓴다** — `js/bosses/hollow.js`. 아레나는 `wall` 을 쓰되 `darkness` 가 붙은 별도 아레나 `void` 를 만드는 편이 깔끔하다(다른 챕터 3 보스는 어두워지면 안 된다).

- [ ] **Step 4: 눈으로 본다**

헤드리스로 `?dev=1&boss=11&story=0&mute=1` 를 열고 텔이 뜬 순간 스크린샷을 `tests/shots/hollow-tell.png` 로 저장한다. **텔·투사체·HUD 가 또렷한지** 확인한다. 안 보이면 어둠 계수가 아니라 **그리기 순서**가 틀린 것이다.

- [ ] **Step 5: 판정기 + 봇**

Run: `node tools/boss-overlap.mjs --check` → PASSED
Run: `node tests/bot.mjs --boss=11 --seed=7` → VICTORY
Run: `node tests/bot.mjs --boss=11 --seed=7 --jitter=0.05 --miss=0.15 --think=0.25` → VICTORY

⚠️ 봇은 `getState()` 를 읽으므로 **어둠에 영향받지 않는다.** 봇이 이긴다고 사람이 읽을 수 있다는 뜻이 아니다 — Step 4 의 스크린샷이 진짜 검증이다.

- [ ] **Step 6: 커밋**

```bash
git add js/config.js js/render.js js/bosses/hollow.js index.html
git commit -m "feat(boss): 11 HOLLOW — 어둠 속에서 텔만 남는다 (텔·투사체·HUD 는 덮지 않는다)"
```

---

## Task 6: 엔진 방벽 + 카운터 전용 + 보스 12 ADAMANT

**Files:**
- Modify: `js/config.js` (`BOSS.WALL_*`)
- Modify: `js/boss.js` (`wall` 생명주기, `counterOnly` 게이트, `takeDamage`)
- Modify: `js/render.js` (방벽 그리기)
- Modify: `js/game.js` (반사탄이 방벽에 맞는 판정)
- Create: `js/bosses/adamant.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 3 아레나
- Produces: `BOSSES[11]`(key `adamant`) — 12스테이지. 이 보스가 등록되는 순간 **엔딩이 자동으로 12스테이지 뒤로 간다**(`advanceAfterBoss` 가 배열 길이로 판단).

- [ ] **Step 1: 방벽을 세운다**

보스 정의에 `wall: { hits: 2, up: 3.0, breakStagger: 1.6 }`. 방벽이 서 있는 동안 `takeDamage` 가 리포스트 피해를 무시한다.

- [ ] **Step 2: 반사탄으로만 깨지게 한다**

`js/game.js` 의 투사체 처리에서, **플레이어가 반사한 탄**(`owner === 'player'`)이 보스에 닿을 때 방벽이 있으면 `hits` 를 1 깎는다.

- [ ] **Step 3: 🔴 기믹에 리턴을 준다 (스펙 §2.4)**

방벽이 깨지는 순간 `boss.stagger(def.wall.breakStagger, true)` — **카운터 판정 경직**이다. 기존 `stagger(dur, counter)` 를 그대로 쓴다. 이 창 동안 리포스트가 전부 카운터(×1.5)로 들어간다.

기믹은 **의무가 아니라 노리는 기회**여야 한다. 벽 깨기가 "귀찮은 관문"으로 읽히면 보상을 키우거나 `hits` 를 낮춘다.

- [ ] **Step 4: Phase 2 를 카운터 전용으로**

`Boss.prototype.takeDamage` 에 게이트를 더한다.

```js
  Boss.prototype.takeDamage = function (dmg, opt) {
    if (this.dead || this.invuln > 0) return 0;
    /* counterOnly (스펙 §2.4) — Phase 2 는 카운터(윈드업 중 명중)로만 피해가 들어간다.
       완화안이 켜져 있으면 일반 피해도 배수를 먹여 통과시킨다 */
    var co = this.def.counterOnly;
    if (co && this.phase === 2 && !(opt && opt.counter)) {
      dmg *= (co.softMult === undefined ? 0 : co.softMult);
      if (dmg <= 0) { this.hurtFlash = B.HURT_FLASH; return 0; }
    }
    ...
```

호출부(`js/game.js` 리포스트 명중 처리)가 `{ counter: true }` 를 넘기게 한다.

🔴 **시그니처 호환**: `takeDamage(dmg)` 를 부르는 기존 호출부가 여러 곳이다(`grep -rn "takeDamage(" js/`). 두 번째 인자는 **선택**이고 `def.counterOnly` 가 없으면 아예 읽지 않으므로 기존 호출은 그대로 둬도 된다. **`{ counter: true }` 를 넘겨야 하는 곳은 카운터 판정이 이미 계산된 리포스트 명중 한 곳뿐이다** — 그 지점에서 기존에 카운터 배수(`C.COMBAT.COUNTER_MULT`)를 곱하는 코드를 찾아 같은 조건을 쓴다.

- [ ] **Step 5: 판정기**

Run: `node tools/boss-overlap.mjs --check` → PASSED (선언 없이)

- [ ] **Step 6: 봇 — 여기가 가장 위험하다**

Run: `node tests/bot.mjs --boss=12 --seed=7` → VICTORY
Run: `node tests/bot.mjs --boss=12 --seed=7 --jitter=0.05 --miss=0.15 --think=0.25` → **3회 실행**

⚠️ 봇은 카운터를 노리는 로직이 없다(윈드업 중 명중은 우연히 일어난다). **완벽 봇이 Phase 2 를 못 넘으면 `counterOnly` 가 사람에게도 과한 것이다.** 그때 `softMult: 0.2` 완화안으로 내린다 — 스펙 §2.4 가 이미 허용한 경로다. 🔴 **`tests/bot.mjs` 의 `TUNE` 은 건드리지 않는다.**

- [ ] **Step 7: 엔딩이 12스테이지로 갔는지 본다**

Run: `node tests/bot.mjs --all --seed=7`
Expected: 12보스 전승. 8스테이지 뒤가 ENDING 이 아니라 INTERLUDE 인지, 12스테이지 뒤가 ENDING 인지 로그로 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add js/config.js js/boss.js js/render.js js/game.js js/bosses/adamant.js index.html
git commit -m "feat(boss): 12 ADAMANT — 반사로 깨는 방벽(경직 보상) + Phase 2 카운터 전용"
```

---

## Task 7: 스토리 — 새 보스 4종 대사 + 태그라인 4박

**Files:**
- Modify: `js/story.js`
- Modify: `docs/superpowers/specs/2026-09-17-riposte-story-bible.md` (보스 8종 → 12종)
- Modify: `js/config.js` (`STORY` 엔딩 태그라인)

**Interfaces:**
- Consumes: Task 3~6 의 보스 key 4개
- Produces: `STORY.sentinel/tempest/hollow/adamant`

- [ ] **Step 1: 바이블 규칙을 읽는다**

`docs/superpowers/specs/2026-09-17-riposte-story-bible.md` §1 원칙 5, §3 보이스 설계표를 읽는다. `tests/story.mjs` 가 검사하는 규칙: **장면당 ≤4줄 · 느낌표 0 · 보스 전속 어미 교차 0 · 선택지는 `ok:true` 하나 `ok:false` 하나 · 첫 줄은 화자 라벨 `???`**.

- [ ] **Step 2: AVARICE 의 `after` 마지막 줄을 고친다**

지금은 엔딩으로 이어진다. 바이블 원리("모든 after 마지막 줄은 다음 보스 예고")에 맞춰 **9번 보스(SENTINEL) 예고**로 바꾼다.

- [ ] **Step 3: 새 대사 8장면을 쓴다** (4보스 × before/after). 보스별 전속 어미를 새로 배정하고 바이블 §3 표에 추가한다.

- [ ] **Step 4: 엔딩 태그라인을 4박으로**

`NOTHING IS GIVEN. / EVERYTHING IS TAKEN. / NOTHING IS KEPT. / NOTHING IS LEFT TO TAKE.`

- [ ] **Step 5: 테스트**

Run: `node tests/story.mjs`
Expected: PASSED. 줄 수·느낌표·어미 교차가 걸리면 대사를 고친다 — **테스트를 고치지 않는다.**

- [ ] **Step 6: 스모크**

Run: `node tests/smoke.mjs` → PASSED (STORY 씬이 늘어도 타이틀→전투 경로가 유지되는지)

- [ ] **Step 7: 커밋**

```bash
git add js/story.js js/config.js docs/superpowers/specs/2026-09-17-riposte-story-bible.md
git commit -m "feat(story): 챕터 3 대사 8장면 + 엔딩 태그라인 4박"
```

---

## Task 8: 전 12스테이지 밸런스 실측

**Files:**
- Modify: `js/bosses/sentinel.js` · `tempest.js` · `hollow.js` · `adamant.js` (hp·par·gap 만)
- Create: `docs/qa/balance-2026-09-19.md`

**Interfaces:**
- Consumes: Task 3~6
- Produces: 확정 hp·par

- [ ] **Step 1: 기준을 읽는다**

`docs/qa/balance-2026-09-18.md` — 특히 정정 절(BASTION 숙련 승률 1/3)과 handover 교훈 3(**hp 는 길이 레버가 아니다. 레버는 엠파워·카운터 배수와 패턴 간격 gap 이다**).

- [ ] **Step 2: 세 프로파일을 순차로 돌린다**

```bash
node tests/bot.mjs --all --seed=7                                              # 완벽
node tests/bot.mjs --all --seed=7 --jitter=0.05 --miss=0.15 --think=0.25       # 숙련
node tests/bot.mjs --all --seed=7 --miss=0.3 --jitter=0.09 --think=0.45        # 평균
```

기준: 완벽 12/12 VICTORY · 숙련 9~11 매번 VICTORY(12 는 3회 중 1회 이상, 7 BASTION 은 1/3 허용) · 평균 12/12 DEFEAT.

- [ ] **Step 3: par 를 정한다** — 숙련 봇 실측 시간의 약 2배(스펙 §0 관행).

- [ ] **Step 4: 난도 곡선을 본다**

9 → 12 로 갈수록 길어지는가. 뒤 보스가 앞 보스보다 짧으면(BASTION 이 LANTERN 보다 짧았던 전례) **hp 가 아니라 패턴 수**를 본다.

- [ ] **Step 5: 시도한 레버를 전부 기록한다** — `docs/qa/balance-2026-09-19.md`. 되돌린 것도 이유와 함께 적는다(handover 관행).

- [ ] **Step 6: 커밋**

```bash
git add js/bosses docs/qa/balance-2026-09-19.md
git commit -m "balance: 챕터 3 보스 4종 hp·par 확정 — 실측 근거 포함"
```

---

## Task 9: 전 12스테이지 QA + 문서

**Files:**
- Modify: `README.md` · `docs/superpowers/specs/2026-09-09-riposte-design.md` · `CLAUDE.md` · `docs/handover.md`
- Modify: `tools/shots.mjs` (필요 시)

- [ ] **Step 1: 전 게이트를 직렬로 돌린다**

```bash
node tests/story.mjs
node tools/boss-overlap.mjs --check
node tests/smoke.mjs
node tests/state.mjs
node tests/audio-smoke.mjs
node tests/pad.mjs
node tests/options.mjs
node tests/dev.mjs
node tests/bot.mjs --all --seed=7
node tests/bot.mjs --all --seed=7 --jitter=0.05 --miss=0.15 --think=0.25
node tests/bot.mjs --all --seed=7 --miss=0.3 --jitter=0.09 --think=0.45
node tests/mash.mjs --all --seeds=7,11,23 --riposte --expect-lose
node tests/bot.mjs --all --seed=7 --hard
```

🔴 `tests/state.mjs` 가 특히 중요하다 — 새 훅(`wall`·`counterOnly`·`linger`)이 **보스 정의 테이블을 오염시키면** 안 된다. AVARICE 의 loot 에서 같은 결함이 있었다.

- [ ] **Step 2: 스크린샷으로 눈 검사**

아레나 `wall`·HOLLOW 어둠·ADAMANT 방벽·챕터 III 인터루드·새 엔딩 카드를 `tests/shots/` 에 저장한다. **텔 대비**가 모든 새 아레나에서 유지되는지 본다.

- [ ] **Step 3: 문서를 갱신한다**

- `README.md` — 보스 표에 챕터 III 4행, `?dev=1`·`THIEF` 는 **적지 않는다**(개발용)
- 스펙 §3 에 §3.9~3.12 추가, §6 화면 흐름의 엔딩 위치, §2.2 에 어둠 규칙
- `CLAUDE.md` 테스트 목록에 `tests/dev.mjs`
- `docs/handover.md` — 상태·교훈

- [ ] **Step 4: Pages 확인**

Run: `node tools/check-pages.mjs`
Expected: `PAGES OK`

- [ ] **Step 5: 커밋 + 푸시**

```bash
git add -A
git commit -m "docs: 챕터 3 반영 — 스펙 §3.9~3.12·README 보스 표·핸드오버"
git push origin main
```

---

## 되돌릴 기준 (스펙 §7 — 채택 조건이다)

| 신호 | 되돌릴 것 |
|---|---|
| 숙련 봇이 `CLAIM` 구역에 끼어 죽는다 | SENTINEL 구역 폭·`linger` |
| 동시 비행 탄이 많아 피격이 여러 공격에 고르게 퍼진다 | TEMPEST 동시 발수 |
| 스크린샷에서 텔·투사체·HUD 가 안 보인다 | HOLLOW 그리기 순서(계수가 아니다) → 그래도 안 되면 축 폐기 |
| 완벽 봇이 ADAMANT Phase 2 를 못 넘는다 | `counterOnly.softMult: 0.2` 완화안 |
| 벽 깨기가 "귀찮은 관문"으로 읽힌다 | `breakStagger` 상향 또는 `hits` 하향, 그래도면 기믹 폐기 |
| 챕터 3 이 챕터 1·2 보다 재미없다 | **축 자체를 바꾼다. 수치 조정으로 덮지 않는다.** |
