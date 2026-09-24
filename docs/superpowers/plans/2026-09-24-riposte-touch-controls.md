# RIPOSTE 모바일 터치 조작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 안드로이드 크롬으로 GitHub Pages 를 열면 타이틀부터 엔딩까지 화면 버튼만으로 플레이할 수 있고, PC 에서는 버튼이 절대 보이지 않는다.

**Architecture:** 새 파일 `js/touch.js`(`window.TouchUI`)가 캔버스의 pointer 이벤트를 손가락마다 추적해 화면 CSS px 좌표의 원형 버튼과 맞추고, 누른 버튼을 기존 액션 이름으로 `Input.touchAction` 에 넣는다(패드의 `applyPadAction` 과 같은 경로). 터치 모드는 부팅 때 한 번 `pointer: coarse`(또는 `?touch=1/0`)로 정하고, 꺼져 있으면 리스너 0·프레임당 분기 두 번뿐이다. 화면(scene)마다 버튼 세트가 `C.TOUCH.SETS` 에서 바뀌고, 세로면 게임 update 를 멈추고 회전 안내를 그린다.

**Tech Stack:** 바닐라 ES5 JS(classic `<script>`, `var`/`function` 만), Canvas 2D, Pointer Events, Fullscreen·Screen Orientation API, playwright-core 헤드리스 chromium + CDP `Input.dispatchTouchEvent`.

**Spec:** `docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md` (상위 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md`)

## Global Constraints

- `js/` 는 ES5 — `let`/`const`/화살표 함수/템플릿 문자열/클래스 금지. classic `<script>` 순서 로딩, ES module·CDN·외부 폰트·이미지 금지.
- 버튼은 기존 액션 이름만 누른다: `left`·`right`·`parry`·`riposte`·`dash`·`confirm`·`back`·`restart`·`up`·`down`·`newgame` — 새 동사 금지.
- 전투 규칙·판정 수치·보스 데이터 변경 금지.
- 터치 모드가 꺼져 있으면(PC) 리스너를 붙이지 않고 `TouchUI.update`/`TouchUI.draw` 를 부르지 않는다 — PC 프레임 비용 0.
- 새 전역 이름은 `TouchUI` (브라우저 내장 `window.Touch` 를 덮어쓰지 않는다).
- 수치·문구는 `js/config.js` 의 `TOUCH`·`PROMPTS` 블록에만 둔다(매직넘버·문구 하드코딩 금지).
- 테스트는 게임 상태를 `window.__RIPOSTE` 훅으로만 읽는다(훅에 `touch: TouchUI` 를 더한다). 캔버스 API(`fillText` 가로채기·`getImageData`)는 관찰용으로 쓸 수 있다.
- 헤드리스만. 파일·이미지·브라우저 창을 자동으로 열지 않는다(`start`/`open`/`Invoke-Item` 금지) — 산출물은 경로만 보고한다.
- 브라우저 테스트는 동시에 두 개를 돌리지 않는다. 브라우저 테스트가 도는 동안 `js/` 를 고치지 않는다.
- Git: author = 전역 설정(BHS). 태스크마다 로컬 커밋(push 금지). 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **손가락을 쥔 채 화면이 바뀜**(전투 끝 → 승리 화면 등) → 쥔 액션이 풀려야 한다. 다음 화면에서 멈추지 않는 이동이 생기면 안 된다. — Task 1 `tRelease` RF1.
2. **OS 가 터치를 취소함**(알림 끌어내리기·제스처 → `pointercancel`) → 쥔 액션이 풀린다. — Task 1 `tRelease` RF2.
3. **쥔 채 창이 포커스를 잃음**(`blur`·탭 숨김) → 풀린다. 그 뒤 손가락을 떼도 오류가 없다. — Task 1 `tRelease` RF3.
4. **키보드와 터치가 같은 액션을 동시에 쥠**(블루투스 키보드) → 손가락을 떼도 키보드로 쥔 이동이 끊기지 않는다. — Task 1 `tFight` RF4.
5. **쥔 채 세로로 돌림** → 쥔 액션이 풀리고 게임 시간이 멈춘다. 다시 가로로 돌리면 재개한다. — Task 2 `tPortrait`.

---

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `js/touch.js` (새) | 터치 모드 판별, 버튼 배치(화면 px), 손가락 추적·판정, 꾹 누르기, 화면별 세트, 세로 정지, 전체 화면, 그리기 | 1·2 |
| `js/input.js` | `Input.touchAction`·`_touchHeld`(1), `Input.onNonTouch`(2) | 1·2 |
| `js/config.js` | `TOUCH` 블록(1·2·3), `PROMPTS` 블록(3) | 1·2·3 |
| `js/main.js` | `TouchUI.init`·`update`·훅(1), 세로면 update 생략·`TouchUI.draw`(2) | 1·2 |
| `js/game.js` | `getState().touch`(1), `optionRows()`(3) | 1·3 |
| `js/ui.js` | `say()` 헬퍼, 박힌 문구 → `C.PROMPTS`, 옵션 행 | 3 |
| `index.html` | `<script src="js/touch.js">`(1), 메타 설명(4) | 1·4 |
| `style.css` | 길게 누르기 선택·메뉴 막기 | 1 |
| `tests/touch.mjs` (새) | 터치 검사 전부 | 1·2·3 |
| 문서 | 스펙 §2.1·§7·§9, README, CLAUDE.md, handover | 4·5 |

**실행 순서**: Task 1 → Task 2 → Task 3 → Task 5. Task 4(문서, 브라우저 없음)는 Task 1 이 끝난 뒤 Task 2·3 과 **병렬**로 돌릴 수 있다(겹치는 파일 없음 — Task 4 는 `index.html` 의 메타 한 줄만, Task 2·3 은 `index.html` 을 안 건드린다).

---

### Task 1: 터치 입력 코어

**Files:**
- Create: `js/touch.js`
- Modify: `js/config.js` (PAD 블록 뒤에 `TOUCH` 블록), `js/input.js`, `js/main.js`, `js/game.js` (getState), `index.html` (스크립트 태그), `style.css`
- Test: `tests/touch.mjs` (새)

**Interfaces:**
- Produces:
  - `Input.touchAction(action: string, isDown: boolean): void` — 터치 전이. 뗄 때는 터치가 쥔 액션만, 키보드·패드가 같은 액션을 쥐고 있지 않을 때만 내린다.
  - `window.TouchUI` — `on: bool`, `visible: bool`, `blocked: bool`, `set: string[]`, `detect(param: string|undefined, coarse: bool): bool`, `init(canvas, param): void`, `center(id: string): {x, y}`(화면 CSS px), `update(scene: string): void`, `state(): object`.
  - `getState().touch` — `{ on: false }` 또는 `{ on: true, visible, set: [...], held: [액션...], blocked }`.
  - `window.__RIPOSTE.touch` = `TouchUI`.
  - `C.TOUCH.BUTTONS[id]` = `{ action, anchor: 'bl'|'br'|'tr', dx, dy, r, shape?: 'left'|'right'|'up'|'down', label?, color?: C.COLORS 키, hold?: true }`, `C.TOUCH.SETS[scene] = [id...]`.
  - `tests/touch.mjs` 의 헬퍼: `check`, `sleep`, `waitFor`, `state`, `url(q)`, `PHONE`, `hookErrors(page)`, `openPhone(browser, q)`, `fingers(page, cdp)` → `{ start(id, target), move(id, target), end(id), cancel(), hold(target, ms), tap(target) }` (target = 버튼 id 문자열 또는 `{x, y}`), 삽입 표지 두 개.

- [ ] **Step 1: 실패하는 테스트 — `tests/touch.mjs` 를 만든다**

```js
/* =============================================================================
 * RIPOSTE — tests/touch.mjs
 * 모바일 터치 조작 (docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md §8).
 * 헤드리스 chromium 으로 가로 폰(915×412, 터치)을 흉내 내고 CDP Input.dispatchTouchEvent 로
 * 멀티터치를 보낸다. 게임 상태는 window.__RIPOSTE 훅으로만 읽는다.
 *
 *   node tests/touch.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS = join(__dirname, 'shots');

const failures = [];
const errors = [];
const t0 = Date.now();

function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return true;
    await sleep(50);
  }
  console.log(`  ...timeout waiting for ${label} (${timeoutMs}ms)`);
  return false;
}

const state = () => window.__RIPOSTE.getState();
const url = (q) => pathToFileURL(join(ROOT, 'index.html')).href + q;
/* 가로 폰 — 갤럭시 S 계열 20:9 (스펙 §5 기준 화면) */
const PHONE = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function hookErrors(page) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
}

/* 손가락 — CDP 는 "지금 닿아 있는 손가락 전부" 를 받는다. target = 버튼 id 또는 {x, y}(화면 CSS px) */
function fingers(page, cdp) {
  const down = new Map();
  const pos = (target) => (typeof target === 'string'
    ? page.evaluate((id) => window.__RIPOSTE.touch.center(id), target)
    : Promise.resolve(target));
  const pts = () => [...down.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id }));
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  return {
    async start(id, target) { down.set(id, await pos(target)); await send('touchStart', pts()); },
    async move(id, target) { down.set(id, await pos(target)); await send('touchMove', pts()); },
    // 한 손가락만 뗄 때는 남은 손가락 목록으로 touchMove 를 보낸다(목록에서 빠진 손가락이 떼어진다).
    // CDP 는 touchEnd·touchCancel 에 손가락 목록을 받지 않는다 — 전부 뗄 때만 쓴다.
    async end(id) { down.delete(id); const p = pts(); await send(p.length ? 'touchMove' : 'touchEnd', p); },
    async cancel() { down.clear(); await send('touchCancel', []); },
    async hold(target, ms) { await this.start(99, target); await sleep(ms); await this.end(99); await sleep(120); },
    async tap(target) { await this.hold(target, 80); },
  };
}

async function openPhone(browser, q) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  hookErrors(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(url(q), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  return { ctx, page, f: fingers(page, cdp) };
}

/* ---- T-detect: 판별 ------------------------------------------------------- */
async function tDetect(browser) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const d = await page.evaluate(() => {
    const T = window.__RIPOSTE.touch;
    return [T.detect(undefined, true), T.detect(undefined, false), T.detect('1', false), T.detect('0', true)];
  });
  check('T-detect: detect() — coarse on · fine off · ?touch=1 forces on · ?touch=0 forces off',
    d.join() === 'true,false,true,false', JSON.stringify(d));
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (coarse) {
    const s = await page.evaluate(state);
    check('T-detect: phone emulation (pointer: coarse) turns touch mode on without ?touch', s.touch.on === true, JSON.stringify(s.touch));
    check('T-detect: buttons are visible from boot on a phone', s.touch.visible === true);
  } else {
    console.log('  NOTE  this emulation does not report pointer: coarse — boot detection is covered by detect() above');
  }
  await ctx.close();
}

/* ---- T-desktop: PC 에서는 절대 안 켜진다 ---------------------------------- */
async function tDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const s0 = await page.evaluate(state);
  check('T-desktop: PC (no touch) — touch mode off', s0.touch.on === false, JSON.stringify(s0.touch));
  await page.mouse.click(480, 270);
  await sleep(150);
  const s1 = await page.evaluate(state);
  check('T-desktop: clicking the canvas does not turn it on', s1.touch.on === false, JSON.stringify(s1.touch));
  await page.close();
}

/* ---- T-scenes: 모든 scene 에 세트가 있고, 버튼은 기존 액션만 누른다 -------- */
async function tScenes(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  const src = readFileSync(join(ROOT, 'js', 'game.js'), 'utf8');
  const scenes = [...src.matchAll(/case '([A-Z]+)':\s*this\.step/g)].map((m) => m[1]);
  const T = await page.evaluate(() => {
    const t = window.__RIPOSTE.CONFIG.TOUCH;
    return { sets: t.SETS, buttons: t.BUTTONS };
  });
  const missing = scenes.filter((s) => !T.sets[s]);
  check('T-scenes: every scene in js/game.js has a touch button set', scenes.length >= 11 && missing.length === 0,
    `(scenes ${scenes.length}, missing [${missing}])`);
  const VERBS = ['left', 'right', 'parry', 'riposte', 'dash', 'confirm', 'back', 'restart', 'up', 'down', 'newgame'];
  const bad = [];
  for (const [scene, ids] of Object.entries(T.sets)) {
    for (const id of ids) {
      const b = T.buttons[id];
      if (!b) bad.push(`${scene}:${id}?`);
      else if (!b.special && !VERBS.includes(b.action)) bad.push(`${id}->${b.action}`);
    }
  }
  check('T-scenes: every button exists and presses an existing action (no new verbs)', bad.length === 0, bad.join(' '));
  await page.close();
}

/* ---- T-multi · T-slide · RF4 · T-hold: 전투 -------------------------------- */
async function tFight(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  check('fight: ?boss=1 reaches FIGHT on the phone', inFight);
  const s0 = await page.evaluate(state);
  const want = await page.evaluate(() => window.__RIPOSTE.CONFIG.TOUCH.SETS.FIGHT.join());
  check('fight: FIGHT shows the fight button set', s0.touch.set.join() === want, s0.touch.set.join());

  // T-multi — 오른쪽을 쥔 채 PARRY 를 누른다
  await f.start(1, 'right');
  await sleep(250);
  await f.start(2, 'parry');
  await sleep(60);
  const sMid = await page.evaluate(state);
  await f.end(2);
  await sleep(150);
  const sHold = await page.evaluate(state);
  await f.end(1);
  await sleep(100);
  const sUp = await page.evaluate(state);
  check('T-multi: holding RIGHT moves the player right', sHold.playerX > s0.playerX + 10,
    `(${s0.playerX.toFixed(1)} -> ${sHold.playerX.toFixed(1)})`);
  check('T-multi: PARRY tapped while RIGHT is held fires a parry (stamina spent)', sMid.stamina < s0.stamina,
    `(stamina ${s0.stamina} -> ${sMid.stamina})`);
  check('T-multi: RIGHT stays held while the other finger lifts', sHold.touch.held.join() === 'right', sHold.touch.held.join());
  check('T-multi: all fingers up -> nothing held', sUp.touch.held.length === 0, sUp.touch.held.join());

  // T-slide — ◀ 에서 ▶ 로 미끄러뜨린다
  await f.start(1, 'left');
  await sleep(80);
  const a = await page.evaluate(state);
  await f.move(1, 'right');
  await sleep(80);
  const b = await page.evaluate(state);
  await f.end(1);
  await sleep(80);
  check('T-slide: a finger on LEFT holds left', a.touch.held.join() === 'left', a.touch.held.join());
  check('T-slide: sliding onto RIGHT switches to right', b.touch.held.join() === 'right', b.touch.held.join());

  // RF4 — 키보드와 터치가 같은 액션을 쥔다: 손가락을 떼도 키보드 이동은 계속된다
  await page.keyboard.down('ArrowRight');
  await f.tap('right');
  const xa = (await page.evaluate(state)).playerX;
  await sleep(200);
  const xb = (await page.evaluate(state)).playerX;
  await page.keyboard.up('ArrowRight');
  check('RF4: lifting a finger from RIGHT does not cut the keyboard\'s held RIGHT', xb > xa + 5,
    `(${xa.toFixed(1)} -> ${xb.toFixed(1)})`);

  // T-hold — 전투 중 RETRY·TITLE 은 꾹 눌러야 한다
  await f.hold('title', 150);
  check('T-hold: a short tap on TITLE (hold button) does nothing', (await page.evaluate(state)).scene === 'FIGHT');
  const tries0 = (await page.evaluate(state)).tries;
  await f.hold('retry', 800);                   // 0.5초에 발동 — hold() 는 뗀 뒤 120ms 더 기다린다
  const tries1 = (await page.evaluate(state)).tries;
  check('T-hold: holding RETRY restarts the boss', tries1 === tries0 + 1, `(tries ${tries0} -> ${tries1})`);
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT again');
  await f.hold('title', 800);
  const home = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 3000, 'TITLE');
  check('T-hold: holding TITLE returns to the title', home);
  await ctx.close();
}

/* ---- RF1~RF3: 쥔 채 화면 전환·취소·포커스 잃음 ---------------------------- */
async function tRelease(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');

  await f.start(1, 'left');
  await sleep(80);
  await f.cancel();
  await sleep(80);
  check('RF2: pointercancel releases the held action', (await page.evaluate(state)).touch.held.length === 0);

  await f.start(1, 'left');
  await sleep(80);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await sleep(80);
  check('RF3: window blur releases the held action', (await page.evaluate(state)).touch.held.length === 0);
  await f.end(1);
  await sleep(80);
  check('RF3: lifting the finger after blur leaves nothing held', (await page.evaluate(state)).touch.held.length === 0);

  await f.start(1, 'right');
  await sleep(100);
  await page.evaluate(() => window.__RIPOSTE.game.goTitle());
  await sleep(150);
  const s = await page.evaluate(state);
  check('RF1: a scene change while a finger holds RIGHT releases it', s.scene === 'TITLE' && s.touch.held.length === 0,
    `(scene ${s.scene}, held [${s.touch.held}])`);
  await f.end(1);
  await ctx.close();
}

/* ---- 새 검사 함수는 이 줄 위에 추가한다 ---- */

function finish() {
  check('zero page/console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (failures.length) {
    console.log(`\nTOUCH FAILED — ${failures.length} check(s): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`\nTOUCH PASSED — all checks green  [${secs}s]`);
}

(async () => {
  console.log('RIPOSTE touch test');
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await tDetect(browser);
    await tDesktop(browser);
    await tScenes(browser);
    await tFight(browser);
    await tRelease(browser);
    // ---- 새 검사 호출은 이 줄 위에 추가한다 ----
  } finally {
    await browser.close();
  }
  finish();
})();
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/touch.mjs`
Expected: 예외로 중단 — `window.__RIPOSTE.touch` 가 없어 `T-detect` 의 `T.detect` 호출이 TypeError. (아직 `TouchUI` 가 없다.)

- [ ] **Step 3: `js/config.js` — PAD 블록 뒤에 `TOUCH` 블록**

`PAD` 블록의 끝(아래 old)을 new 로 바꾼다.

old:
```js
        restart: [8],           // Select / Share
        back:    [9]            // Start
      }
    }
  };
```
new:
```js
        restart: [8],           // Select / Share
        back:    [9]            // Start
      }
    },

    /* ---- 터치 조작 (2026-09-24 — docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md) ----
     * 버튼은 기존 액션 이름만 누른다(동사를 늘리지 않는다). 좌표는 화면 CSS px 이다(게임 좌표 960×540 이 아니다).
     * anchor: bl 왼쪽 아래 · br 오른쪽 아래 · tr 오른쪽 위. dx·dy = 가장자리 여백선에서 버튼 중심까지(안쪽이 +).
     * 기준 화면 = 가로 폰 915×412 — 버튼이 바닥선 아래 띠와 좌우 레터박스 여백에 들어간다. */
    TOUCH: {
      HOLD_TIME: 0.5,        // 꾹 누르기 버튼(hold) — 이만큼(초) 쥐어야 한 번 누른다. 잘못 눌러 판을 잃는 버튼에만
      HIT_PAD: 10,           // 판정 원 = 반지름 + 이만큼(px). 판정이 겹치면 중심이 가까운 버튼
      EDGE: 18,              // 화면 가장자리 여백(px) — 안전 영역(노치)은 따로 더한다
      BUTTONS: {
        /* 전투 — 왼손 이동, 오른손 동사 (PARRY 가 엄지가 쉬는 구석 — 가장 많이 누른다) */
        left:     { action: 'left',    anchor: 'bl', dx: 34,  dy: 34,  r: 34, shape: 'left' },
        right:    { action: 'right',   anchor: 'bl', dx: 114, dy: 34,  r: 34, shape: 'right' },
        parry:    { action: 'parry',   anchor: 'br', dx: 40,  dy: 40,  r: 40, label: 'PARRY',   color: 'GOLD' },
        dash:     { action: 'dash',    anchor: 'br', dx: 124, dy: 32,  r: 32, label: 'DASH',    color: 'RED' },
        riposte:  { action: 'riposte', anchor: 'br', dx: 40,  dy: 124, r: 32, label: 'RIPOSTE', color: 'PLAYER' },
        retry:    { action: 'restart', anchor: 'tr', dx: 84,  dy: 24,  r: 24, label: 'RETRY', hold: true },
        title:    { action: 'back',    anchor: 'tr', dx: 24,  dy: 24,  r: 24, label: 'TITLE', hold: true },
        /* 메뉴 — 왼쪽 십자, 오른쪽 OK(PARRY 자리)·BACK(DASH 자리) */
        mUp:      { action: 'up',      anchor: 'bl', dx: 96,  dy: 160, r: 30, shape: 'up' },
        mDown:    { action: 'down',    anchor: 'bl', dx: 96,  dy: 32,  r: 30, shape: 'down' },
        mLeft:    { action: 'left',    anchor: 'bl', dx: 32,  dy: 96,  r: 30, shape: 'left' },
        mRight:   { action: 'right',   anchor: 'bl', dx: 160, dy: 96,  r: 30, shape: 'right' },
        ok:       { action: 'confirm', anchor: 'br', dx: 40,  dy: 40,  r: 40, label: 'OK' },
        back:     { action: 'back',    anchor: 'br', dx: 124, dy: 32,  r: 32, label: 'BACK' },
        newgame:  { action: 'newgame', anchor: 'tr', dx: 24,  dy: 24,  r: 24, label: 'NEW', hold: true },
        /* 대사 — 선택지 [K]=parry · [J]=riposte 는 왼쪽, 진행은 오른쪽 */
        cParry:   { action: 'parry',   anchor: 'bl', dx: 40,  dy: 40,  r: 36, label: 'PARRY',   color: 'GOLD' },
        cRiposte: { action: 'riposte', anchor: 'bl', dx: 40,  dy: 124, r: 36, label: 'RIPOSTE', color: 'PLAYER' },
        skip:     { action: 'back',    anchor: 'br', dx: 124, dy: 32,  r: 32, label: 'SKIP' },
        /* 패배 — 판이 끝났으니 꾹 누르기가 아니다 */
        dRetry:   { action: 'restart', anchor: 'br', dx: 40,  dy: 40,  r: 40, label: 'RETRY' },
        dTitle:   { action: 'back',    anchor: 'br', dx: 124, dy: 32,  r: 32, label: 'TITLE' }
      },
      /* scene -> 버튼 id. js/game.js 의 모든 scene 이 여기 있어야 한다 (tests/touch.mjs T-scenes) */
      SETS: {
        FIGHT:      ['left', 'right', 'dash', 'parry', 'riposte', 'retry', 'title'],
        INTRO:      ['left', 'right', 'dash', 'parry', 'riposte', 'retry', 'title'],
        STORY:      ['cParry', 'cRiposte', 'ok', 'skip'],
        TITLE:      ['mUp', 'mDown', 'ok', 'newgame'],
        OPTIONS:    ['mUp', 'mDown', 'mLeft', 'mRight', 'ok', 'back'],
        BOSSSELECT: ['mUp', 'mDown', 'ok', 'back'],
        KEYBIND:    ['back'],
        VICTORY:    ['ok', 'back'],
        INTERLUDE:  ['ok', 'back'],
        ENDING:     ['ok', 'back'],
        DEFEAT:     ['dRetry', 'dTitle']
      }
    }
  };
```

- [ ] **Step 4: `js/input.js` — `touchAction`**

(a) `Input` 객체의 `_padCount: 0,` 줄 다음에 넣는다:
```js
    _touchHeld: {}, // 터치가 "스스로" 쥐고 있는 액션 — 뗄 때 이것만 내려 키보드·패드 동시입력을 보호 (js/touch.js)
```

(b) `handleBlur` 의 `Input._codeDown = {};` 다음 줄에 넣는다:
```js
    Input._touchHeld = {};
```

(c) `/** 패드 연결/해제 카운터` 주석 바로 위에 넣는다:
```js
  /** 키보드가 지금 이 액션을 쥐고 있나 — 물리 키 상태(_codeDown)로 본다(리바인드 반영) */
  function keyHolds(action) {
    var codes = KEYMAP[action] || [];
    for (var i = 0; i < codes.length; i++) {
      if (Input._codeDown[codes[i]]) return true;
    }
    return false;
  }

  /** 터치 버튼 전이 (js/touch.js). 패드의 applyPadAction 과 같은 규칙 —
      누를 때 setAction(true) + 제스처 훅(오디오 잠금 해제 재시도),
      뗄 때는 터치가 "스스로" 쥐고 있던 액션만, 그리고 키보드·패드가 같은 액션을 쥐고 있지 않을 때만 내린다
      (블루투스 키보드로 → 를 쥔 채 화면 ▶ 를 떼도 이동이 끊기지 않는다).
      눌렀다 같은 프레임에 떼면 버퍼에 한 번 남아 다음 고정 스텝에 justPressed 가 한 번 된다(꾹 누르기 버튼). */
  Input.touchAction = function (action, isDown) {
    if (!Input.enabled) return;
    var wasHeld = !!Input._touchHeld[action];
    if (isDown) {
      Input._anyKey = true;
      if (!wasHeld && typeof Input.onGesture === 'function') {
        try { Input.onGesture(); } catch (err) { /* 오디오 없음 — 무시 */ }
      }
      setAction(action, true);
    } else if (wasHeld && !keyHolds(action) && !Input._padHeld[action]) {
      setAction(action, false);
    }
    Input._touchHeld[action] = isDown;
  };

```

- [ ] **Step 5: `js/touch.js` 를 만든다**

```js
/* =============================================================================
 * RIPOSTE — js/touch.js
 * 모바일 터치 조작 — 화면 위 가상 버튼 (docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md)
 *
 * 버튼은 기존 액션 이름만 누른다(Input.touchAction) — 동사를 늘리지 않는다.
 * 터치 모드는 부팅 때 한 번 정한다: ?touch=1/0 이 우선, 없으면 주 입력이 손가락인가(pointer: coarse).
 * 터치 모드가 아니면 리스너를 붙이지 않고 main.js 도 update/draw 를 부르지 않는다 — PC 프레임 비용 0.
 * 버튼 좌표는 화면 CSS px(캔버스 = 창 전체)다 — 게임 좌표(960×540)가 아니다(좌우 레터박스 여백까지 쓴다).
 * 브라우저 내장 window.Touch(터치 이벤트의 Touch 생성자)를 덮어쓰지 않으려고 이름이 TouchUI 다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = global.CONFIG;
  var T = C.TOUCH;

  var TouchUI = {
    on: false,        // 터치 모드 (부팅 때 한 번 판별)
    visible: false,   // 버튼을 그리는가
    blocked: false,   // 세로 — 게임을 멈추고 회전 안내만 그린다
    set: [],          // 지금 화면의 버튼 id 목록 (C.TOUCH.SETS[scene])
    _ptr: {},         // pointerId -> 버튼 id (버튼 밖이면 null)
    _count: {},       // 액션 -> 그 액션을 쥔 손가락 수
    _hold: {},        // 꾹 누르기 버튼 id -> 누르기 시작한 시각(초)
    _fired: {},       // 꾹 누르기 버튼 id -> 이번 누름에서 이미 발동했나
    _safe: { t: 0, r: 0, b: 0, l: 0 },   // 안전 영역(노치) px
    _probe: null      // 안전 영역 측정용 div
  };

  function nowSec() { return (global.performance ? global.performance.now() : Date.now()) / 1000; }

  /** 터치 모드 판별 — ?touch=1/0 이 우선, 없으면 주 입력이 손가락인가(pointer: coarse).
      터치스크린 노트북은 주 입력이 마우스라 false — PC 로 분류돼 버튼이 안 나온다 (스펙 §2). */
  TouchUI.detect = function (param, coarse) {
    if (param === '1') return true;
    if (param === '0') return false;
    return !!coarse;
  };

  /** 안전 영역(노치) — 보이지 않는 div 의 padding: env(safe-area-inset-*) 를 읽는다.
      env() 를 모르는 브라우저는 선언이 버려져 0 이 된다. */
  function readSafe() {
    var d = global.document;
    if (!TouchUI._probe) {
      var p = d.createElement('div');
      p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      d.body.appendChild(p);
      TouchUI._probe = p;
    }
    var cs = global.getComputedStyle(TouchUI._probe);
    TouchUI._safe = {
      t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0
    };
  }

  /** 버튼 중심(화면 CSS px). anchor 모서리의 여백선(EDGE + 안전 영역)에서 dx·dy 만큼 안쪽. */
  TouchUI.center = function (id) {
    var b = T.BUTTONS[id], s = TouchUI._safe, e = T.EDGE;
    var W = global.innerWidth, H = global.innerHeight;
    var left = e + s.l, right = W - e - s.r, top = e + s.t, bottom = H - e - s.b;
    if (b.anchor === 'bl') return { x: left + b.dx, y: bottom - b.dy };
    if (b.anchor === 'br') return { x: right - b.dx, y: bottom - b.dy };
    return { x: right - b.dx, y: top + b.dy };   // 'tr'
  };

  function pickSet(scene) {
    return (T.SETS[scene] || []).slice();
  }

  /** 화면 좌표 → 버튼 id (판정 원 = 반지름 + HIT_PAD, 겹치면 중심이 가까운 쪽). 없으면 null */
  function hitTest(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < TouchUI.set.length; i++) {
      var id = TouchUI.set[i], c = TouchUI.center(id), b = T.BUTTONS[id];
      var dx = x - c.x, dy = y - c.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= b.r + T.HIT_PAD && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  function press(id) {
    var b = T.BUTTONS[id];
    if (b.hold) { TouchUI._hold[id] = nowSec(); TouchUI._fired[id] = false; return; }
    var n = TouchUI._count[b.action] || 0;
    TouchUI._count[b.action] = n + 1;
    if (n === 0) Input.touchAction(b.action, true);
  }

  function release(id) {
    var b = T.BUTTONS[id];
    if (b.hold) { delete TouchUI._hold[id]; delete TouchUI._fired[id]; return; }
    var n = (TouchUI._count[b.action] || 0) - 1;
    if (n > 0) { TouchUI._count[b.action] = n; return; }
    delete TouchUI._count[b.action];
    Input.touchAction(b.action, false);
  }

  /** 쥔 버튼을 전부 놓는다 — 손가락 추적은 남기되(버튼 없음) 액션은 모두 뗀다.
      화면(세트)이 바뀌거나 세로로 돌면 부른다 — 눌린 채 다음 화면으로 넘어가 멈추지 않는 키가 생기지 않게. */
  function releaseAll() {
    for (var pid in TouchUI._ptr) {
      if (TouchUI._ptr.hasOwnProperty(pid)) TouchUI._ptr[pid] = null;
    }
    for (var a in TouchUI._count) {
      if (TouchUI._count.hasOwnProperty(a)) Input.touchAction(a, false);
    }
    TouchUI._count = {};
    TouchUI._hold = {};
    TouchUI._fired = {};
  }

  /** 포커스를 잃거나 탭이 숨으면 — 손가락 추적까지 비운다(그 뒤 오는 pointerup 은 무시된다) */
  function reset() {
    releaseAll();
    TouchUI._ptr = {};
  }

  function onDown(e) {
    e.preventDefault();
    TouchUI.visible = true;
    var id = hitTest(e.clientX, e.clientY);
    TouchUI._ptr[e.pointerId] = id;
    if (id) press(id);
  }

  function onMove(e) {
    if (!TouchUI._ptr.hasOwnProperty(e.pointerId)) return;   // 누르지 않은 포인터(마우스 hover 등)
    e.preventDefault();
    var old = TouchUI._ptr[e.pointerId];
    var id = hitTest(e.clientX, e.clientY);
    if (id === old) return;
    TouchUI._ptr[e.pointerId] = id;
    if (old) release(old);   // 버튼 밖으로 미끄러지면 놓고
    if (id) press(id);       // 다른 버튼으로 들어가면 그 버튼을 누른다 (◀ → ▶ 미끄러뜨리기)
  }

  function onUp(e) {
    if (!TouchUI._ptr.hasOwnProperty(e.pointerId)) return;
    e.preventDefault();
    var id = TouchUI._ptr[e.pointerId];
    delete TouchUI._ptr[e.pointerId];
    if (id) release(id);
  }

  /** 프레임마다 (main.js frame — 터치 모드일 때만). scene 으로 버튼 세트를 고르고 꾹 누르기를 센다. */
  TouchUI.update = function (scene) {
    var set = pickSet(scene);
    if (set.join(',') !== TouchUI.set.join(',')) { TouchUI.set = set; releaseAll(); }
    var t = nowSec();
    for (var id in TouchUI._hold) {
      if (!TouchUI._hold.hasOwnProperty(id) || TouchUI._fired[id]) continue;
      if (t - TouchUI._hold[id] < T.HOLD_TIME) continue;
      TouchUI._fired[id] = true;
      var a = T.BUTTONS[id].action;
      Input.touchAction(a, true);    // 탭 한 번 — 눌렀다 바로 뗀 것과 같다(다음 고정 스텝에 justPressed 한 번)
      Input.touchAction(a, false);
    }
  };

  /** 디버그 훅 getState().touch — JSON 직렬화 가능 */
  TouchUI.state = function () {
    if (!TouchUI.on) return { on: false };
    var held = [];
    for (var a in TouchUI._count) {
      if (TouchUI._count.hasOwnProperty(a)) held.push(a);
    }
    return { on: true, visible: TouchUI.visible, set: TouchUI.set.slice(), held: held, blocked: TouchUI.blocked };
  };

  /** 부팅 (main.js boot). param = URL 의 ?touch 값(없으면 undefined) */
  TouchUI.init = function (canvas, param) {
    var mq = global.matchMedia ? global.matchMedia('(pointer: coarse)') : null;
    TouchUI.on = TouchUI.detect(param, !!(mq && mq.matches));
    if (!TouchUI.on) return;              // PC — 리스너도 붙이지 않는다 (프레임 비용 0)
    TouchUI.visible = true;
    readSafe();
    global.addEventListener('resize', readSafe);
    canvas.addEventListener('pointerdown', onDown, { passive: false });
    canvas.addEventListener('pointermove', onMove, { passive: false });
    canvas.addEventListener('pointerup', onUp, { passive: false });
    canvas.addEventListener('pointercancel', onUp, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // 길게 누르기 메뉴
    global.addEventListener('blur', reset);
    if (global.document) {
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.hidden) reset();
      });
    }
  };

  global.TouchUI = TouchUI;
})(window);
```

- [ ] **Step 6: `index.html` — 스크립트 태그**

`<script src="js/input.js"></script>` 다음 줄에 넣는다:
```html
  <script src="js/touch.js"></script>
```

- [ ] **Step 7: `js/main.js` — 부트·루프·훅**

(a) 부트 — old:
```js
    Input.attach(global);
```
new:
```js
    Input.attach(global);
    TouchUI.init(canvas, p.touch);   // 폰·태블릿(또는 ?touch=1)에서만 켜진다 — PC 는 리스너 0
```

(b) 루프 — old:
```js
    if (dt < 0) dt = 0;
    game.update(dt);
```
new:
```js
    if (dt < 0) dt = 0;
    if (TouchUI.on) TouchUI.update(game.scene);
    game.update(dt);
```

(c) 훅 — old:
```js
      game: game,
      CONFIG: C,
```
new:
```js
      game: game,
      CONFIG: C,
      touch: TouchUI,
```

- [ ] **Step 8: `js/game.js` — getState**

old:
```js
      marks: marks,
      echoes: echoes
    };
```
new:
```js
      marks: marks,
      echoes: echoes,
      touch: TouchUI.state()
    };
```

- [ ] **Step 9: `style.css` — 길게 누르기 선택·메뉴 막기**

`html, body {` 블록의 `touch-action: none;` 줄 다음에 넣는다:
```css
  -webkit-user-select: none;            /* 터치 — 길게 눌러도 글자 선택·복사 메뉴가 뜨지 않게 */
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
```

- [ ] **Step 10: 통과 확인**

Run: `node tests/touch.mjs`
Expected: `TOUCH PASSED`. `T-detect` 에서 `NOTE ... does not report pointer: coarse` 가 나오면 그대로 둔다(판별 함수 검사가 대신한다).

`T-multi: RIGHT stays held while the other finger lifts` 만 실패하고 `held` 에 `parry` 가 남아 있으면 CDP 가 touchMove 로 한 손가락 떼기를 지원하지 않는 것이다. 그때는 `fingers()` 의 `end` 를 고치지 말고 status BLOCKED 로 보고하고, 증거(그 줄의 출력)를 붙인다.

- [ ] **Step 11: 회귀 (하나씩, 헤드리스)**

Run: `node tests/smoke.mjs` → `SMOKE PASSED` · `node tests/pad.mjs` → `PAD PASSED` · `node tests/state.mjs` → `STATE PASSED` · `node tests/options.mjs` → `OPTIONS PASSED`

- [ ] **Step 12: 커밋**

```bash
git add js/touch.js js/config.js js/input.js js/main.js js/game.js index.html style.css tests/touch.mjs
git commit -m "feat(touch): 터치 입력 코어 — 폰에서만 켜지는 화면 버튼이 기존 액션을 누른다"
```

---

### Task 2: 그리기 · 세로 정지 · 전체 화면 · 키보드가 오면 숨김

**Files:**
- Modify: `js/config.js` (`TOUCH` 블록), `js/touch.js`, `js/input.js`, `js/main.js`
- Test: `tests/touch.mjs` (함수 3개 추가)

**Interfaces:**
- Consumes (Task 1): `TouchUI` 필드·`center`·`update`, `C.TOUCH.BUTTONS`/`SETS`, `fingers`/`openPhone` 헬퍼.
- Produces: `TouchUI.draw(ctx, dpr): void`, `TouchUI.requestLandscape(): void`, `Input.onNonTouch: function|null`, `C.TOUCH.TEXT` 객체(Task 3 이 키를 더한다), 버튼 `full`(`special: 'fullscreen'`).

- [ ] **Step 1: 실패하는 테스트 — `tests/touch.mjs`**

`/* ---- 새 검사 함수는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다:
```js
/* ---- T-portrait: 세로면 게임이 멈추고, 쥔 버튼이 풀린다 (RF5) ------------ */
async function tPortrait(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  await f.start(1, 'right');
  await sleep(100);
  await page.setViewportSize({ width: 412, height: 915 });
  await sleep(200);
  const s1 = await page.evaluate(state);
  await page.screenshot({ path: join(SHOTS, 'touch-rotate.png') });
  await sleep(400);
  const s2 = await page.evaluate(state);
  check('T-portrait: portrait blocks the game', s1.touch.blocked === true, JSON.stringify(s1.touch));
  check('RF5: rotating to portrait releases the held RIGHT', s1.touch.held.length === 0, s1.touch.held.join());
  check('T-portrait: game time does not advance while portrait', s2.time === s1.time, `(${s1.time} -> ${s2.time})`);
  await f.end(1);
  await page.setViewportSize({ width: 915, height: 412 });
  await sleep(300);
  const s3 = await page.evaluate(state);
  check('T-portrait: back to landscape resumes', s3.touch.blocked === false && s3.time > s2.time, `(${s2.time} -> ${s3.time})`);
  await ctx.close();
}

/* ---- T-hide: 키보드가 오면 버튼을 숨기고, 다음 터치에 다시 보인다 -------- */
async function tHide(browser) {
  const { ctx, page, f } = await openPhone(browser, '?boss=1&story=0&mute=1&touch=1');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT');
  await page.screenshot({ path: join(SHOTS, 'touch-fight.png') });
  check('T-hide: buttons visible in touch mode', (await page.evaluate(state)).touch.visible === true);
  await page.keyboard.press('ArrowUp');
  await sleep(80);
  check('T-hide: a keyboard key hides the buttons', (await page.evaluate(state)).touch.visible === false);
  await f.tap({ x: 457, y: 150 });
  check('T-hide: the next touch shows them again', (await page.evaluate(state)).touch.visible === true);
  await ctx.close();
}

/* ---- T-draw: 폰에서는 버튼이 그려지고, 터치 모드가 꺼지면 안 그려진다 ----- */
async function tDraw(browser) {
  const px = async (q) => {
    const { ctx, page } = await openPhone(browser, q);
    await sleep(700);
    const v = await page.evaluate(() => {
      const c = window.__RIPOSTE.touch.center('ok');
      const cv = document.getElementById('game');
      const k = cv.width / window.innerWidth;
      const d = cv.getContext('2d').getImageData(Math.round(c.x * k), Math.round(c.y * k) + 14, 1, 1).data;
      return [d[0], d[1], d[2]];
    });
    if (q.includes('touch=1')) await page.screenshot({ path: join(SHOTS, 'touch-title.png') });
    await ctx.close();
    return v;
  };
  const on = await px('?mute=1&touch=1');
  const off = await px('?mute=1&touch=0');
  // OK 버튼 자리(오른쪽 레터박스 여백, 라벨 아래 14px) — 꺼져 있으면 여백 색 #04050a 그대로다
  check('T-draw: touch mode off draws nothing at the OK spot', off.join() === '4,5,10', off.join());
  check('T-draw: touch mode on draws the OK button there', on.join() !== off.join(), `(on ${on} / off ${off})`);
}

```

`// ---- 새 검사 호출은 이 줄 위에 추가한다 ----` 바로 위에 넣는다:
```js
    await tPortrait(browser);
    await tHide(browser);
    await tDraw(browser);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/touch.mjs`
Expected: FAIL — `T-portrait: portrait blocks the game`(blocked 가 늘 false), `T-hide: a keyboard key hides the buttons`, `T-draw: touch mode on draws the OK button there`.

- [ ] **Step 3: `js/config.js` — 그리기 값·`full` 버튼·`TEXT`**

(a) `TOUCH` 블록의 `EDGE: 18, ...` 줄 다음에 넣는다:
```js
      /* 그리기 */
      ALPHA_IDLE: 0.38,      // 평소 — 게임을 가리지 않게 반투명
      ALPHA_DOWN: 0.85,      // 누르는 동안
      FILL: '#141824',
      FILL_DOWN: '#2c3654',
      STROKE: '#e6ebf5',     // color 가 없는 버튼의 테두리
      LINE_W: 2,
      RING_GAP: 5,           // 꾹 누르기 진행 링 — 버튼 바깥 간격(px)
      ARROW: 0.42,           // 방향 삼각형 크기 = 반지름 × 이만큼
      LABEL_SIZE: 11,
      LABEL_SIZE_SMALL: 9,   // 반지름이 SMALL_R 미만인 버튼
      SMALL_R: 30,
      /* 세로 회전 안내 */
      ROTATE_BG: '#04050a',
      ROTATE_PHONE_W: 120,   // 가로로 누운 폰 도형
      ROTATE_PHONE_H: 64,
      ROTATE_SIZE: 16,
      ROTATE_GAP: 30,        // 화면 중앙 → 안내 글
      ROTATE_SUB_GAP: 24,    // 안내 글 → 보조 글
      TEXT: {
        ROTATE: 'ROTATE TO LANDSCAPE',
        ROTATE_SUB: 'TAP FOR FULLSCREEN'
      },
```

(b) `BUTTONS` 의 `newgame:` 줄 다음에 넣는다:
```js
        full:     { special: 'fullscreen', anchor: 'tr', dx: 84, dy: 24, r: 24, label: 'FULL' },   // 전체 화면이 아니고 API 가 있을 때만
```

(c) `SETS` 의 TITLE 줄을 바꾼다 — old: `        TITLE:      ['mUp', 'mDown', 'ok', 'newgame'],` new:
```js
        TITLE:      ['mUp', 'mDown', 'ok', 'newgame', 'full'],
```

- [ ] **Step 4: `js/input.js` — `onNonTouch`**

(a) `Input` 객체의 `_touchHeld: {}, ...` 줄 다음에 넣는다:
```js
    onNonTouch: null, // 키보드·패드 입력이 들어오면 호출 — 터치 버튼을 숨긴다 (js/touch.js 가 붙인다, PC 에서는 null)
```

(b) `handleDown` 의 old:
```js
    // 매핑 여부와 무관하게 제스처 훅을 먼저 친다 (오디오 resume 재시도)
    Input._anyKey = true;
```
new:
```js
    // 터치 모드에서 키보드가 들어오면 화면 버튼을 숨긴다 (블루투스 키보드를 연결한 폰)
    if (typeof Input.onNonTouch === 'function') Input.onNonTouch();
    // 매핑 여부와 무관하게 제스처 훅을 먼저 친다 (오디오 resume 재시도)
    Input._anyKey = true;
```

(c) `applyPadAction` 의 old:
```js
      if (!wasHeld && typeof Input.onGesture === 'function') {
        try { Input.onGesture(); } catch (err) { /* 오디오 없음 — 무시 */ }
      }
      setAction(action, true);
    } else if (wasHeld) {
      setAction(action, false);
    }
    Input._padHeld[action] = isDown;
```
new:
```js
      if (!wasHeld && typeof Input.onGesture === 'function') {
        try { Input.onGesture(); } catch (err) { /* 오디오 없음 — 무시 */ }
      }
      if (!wasHeld && typeof Input.onNonTouch === 'function') Input.onNonTouch();
      setAction(action, true);
    } else if (wasHeld) {
      setAction(action, false);
    }
    Input._padHeld[action] = isDown;
```

- [ ] **Step 5: `js/touch.js` — 세로·전체 화면·그리기**

(a) `TouchUI` 객체의 `_probe: null ...` 줄을 old → new 로:
old:
```js
    _probe: null      // 안전 영역 측정용 div
  };
```
new:
```js
    _probe: null,     // 안전 영역 측정용 div
    _autoFs: false    // 첫 터치 자동 전체 화면 요청을 이미 했나 (부팅 후 한 번만)
  };
```

(b) `pickSet` 을 통째로 바꾼다:
```js
  function canFullscreen() {
    var d = global.document;
    return !!(d.documentElement.requestFullscreen && d.fullscreenEnabled !== false && !d.fullscreenElement);
  }

  /** scene 의 버튼 세트 — 세로면 비고, 전체 화면 버튼은 전체 화면이 아니고 API 가 있을 때만 */
  function pickSet(scene) {
    if (TouchUI.blocked) return [];
    var ids = T.SETS[scene] || [], out = [];
    for (var i = 0; i < ids.length; i++) {
      if (T.BUTTONS[ids[i]].special === 'fullscreen' && !canFullscreen()) continue;
      out.push(ids[i]);
    }
    return out;
  }
```

(c) `press` 의 첫 줄 `var b = T.BUTTONS[id];` 다음에 넣는다:
```js
    if (b.special === 'fullscreen') { TouchUI.requestLandscape(); return; }
```
`release` 의 첫 줄 `var b = T.BUTTONS[id];` 다음에 넣는다:
```js
    if (b.special) return;
```

(d) `onDown` 을 통째로 바꾼다:
```js
  function onDown(e) {
    e.preventDefault();
    TouchUI.visible = true;
    // 첫 터치 한 번만 전체 화면 + 가로 고정을 요청한다 (사용자가 빠져나오면 다시 강제하지 않는다)
    if (!TouchUI._autoFs) { TouchUI._autoFs = true; TouchUI.requestLandscape(); }
    // 세로 — 버튼이 없다. 안내를 탭하면 전체 화면 + 가로 고정을 다시 요청한다
    if (TouchUI.blocked) { TouchUI.requestLandscape(); return; }
    var id = hitTest(e.clientX, e.clientY);
    TouchUI._ptr[e.pointerId] = id;
    if (id) press(id);
  }
```

(e) `TouchUI.update` 의 첫 줄 `var set = pickSet(scene);` 앞에 넣는다:
```js
    var blocked = global.innerHeight > global.innerWidth;   // 가로 전용 — 세로면 게임을 멈춘다(main.js)
    if (blocked !== TouchUI.blocked) { TouchUI.blocked = blocked; releaseAll(); }
```

(f) `/** 디버그 훅 getState().touch` 주석 바로 위에 넣는다:
```js
  /** 전체 화면 + 가로 고정 (안드로이드 크롬). 지원하지 않거나 거절되면 조용히 넘어간다 — game.applyFullscreen 과 같은 태도 */
  TouchUI.requestLandscape = function () {
    var d = global.document, el = d.documentElement;
    function lock() {
      var o = global.screen && global.screen.orientation;
      if (!o || !o.lock) return;
      try {
        var r = o.lock('landscape');
        if (r && r['catch']) r['catch'](function () { /* 지원 안 함 — 무시 */ });
      } catch (err) { /* 무시 */ }
    }
    if (d.fullscreenElement || !el.requestFullscreen) { lock(); return; }
    try {
      var pr = el.requestFullscreen();
      if (pr && pr.then) pr.then(lock, function () { /* 브라우저 정책 — 무시 */ });
    } catch (err) { /* 무시 */ }
  };

  function isDown(id) {
    if (TouchUI._hold.hasOwnProperty(id)) return true;
    for (var pid in TouchUI._ptr) {
      if (TouchUI._ptr.hasOwnProperty(pid) && TouchUI._ptr[pid] === id) return true;
    }
    return false;
  }

  function drawArrow(ctx, x, y, s, dir) {
    var ang = dir === 'right' ? 0 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : -Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.6, -s * 0.8);
    ctx.lineTo(-s * 0.6, s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawButton(ctx, id) {
    var b = T.BUTTONS[id], c = TouchUI.center(id), down = isDown(id);
    ctx.globalAlpha = down ? T.ALPHA_DOWN : T.ALPHA_IDLE;
    ctx.beginPath();
    ctx.arc(c.x, c.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = down ? T.FILL_DOWN : T.FILL;
    ctx.fill();
    ctx.lineWidth = T.LINE_W;
    ctx.strokeStyle = b.color ? C.COLORS[b.color] : T.STROKE;   // PARRY 금·DASH 적 — 텔 색 문법(스펙 §2.2)
    ctx.stroke();
    ctx.fillStyle = C.COLORS.WHITE;
    if (b.shape) {
      drawArrow(ctx, c.x, c.y, b.r * T.ARROW, b.shape);
    } else {
      ctx.font = C.font('800', b.r < T.SMALL_R ? T.LABEL_SIZE_SMALL : T.LABEL_SIZE);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, c.x, c.y);
    }
    // 꾹 누르기 진행 링 — 다 차면 한 번 누른다
    if (b.hold && TouchUI._hold.hasOwnProperty(id)) {
      var k = Math.min(1, (nowSec() - TouchUI._hold[id]) / T.HOLD_TIME);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.COLORS.WHITE;
      ctx.beginPath();
      ctx.arc(c.x, c.y, b.r + T.RING_GAP, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawRotate(ctx) {
    var W = global.innerWidth, H = global.innerHeight;
    var pw = T.ROTATE_PHONE_W, ph = T.ROTATE_PHONE_H;
    ctx.globalAlpha = 1;
    ctx.fillStyle = T.ROTATE_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.COLORS.GOLD;
    ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - pw / 2, H / 2 - ph, pw, ph);   // 가로로 누운 폰
    ctx.fillStyle = C.COLORS.WHITE;
    ctx.font = C.font('800', T.ROTATE_SIZE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(T.TEXT.ROTATE, W / 2, H / 2 + T.ROTATE_GAP);
    ctx.fillStyle = C.COLORS.TEXT_DIM;
    ctx.font = C.font('600', T.LABEL_SIZE);
    ctx.fillText(T.TEXT.ROTATE_SUB, W / 2, H / 2 + T.ROTATE_GAP + T.ROTATE_SUB_GAP);
  }

  /** 그리기 (main.js draw 의 맨 끝 — 터치 모드일 때만). 화면 CSS px 좌표계로 게임 위에 그린다. */
  TouchUI.draw = function (ctx, dpr) {
    if (!TouchUI.on) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (TouchUI.blocked) {
      drawRotate(ctx);
    } else if (TouchUI.visible) {
      for (var i = 0; i < TouchUI.set.length; i++) drawButton(ctx, TouchUI.set[i]);
    }
    ctx.restore();
  };

```

(g) `TouchUI.init` 의 `TouchUI.visible = true;` 다음 줄에 넣는다:
```js
    Input.onNonTouch = function () { TouchUI.visible = false; };   // 키보드·패드가 오면 숨긴다 — 다음 터치에 다시 보인다
```

- [ ] **Step 6: `js/main.js` — 세로면 update 생략, 그리기**

(a) old:
```js
    if (TouchUI.on) TouchUI.update(game.scene);
    game.update(dt);
```
new:
```js
    if (TouchUI.on) TouchUI.update(game.scene);
    // 세로(터치 모드) — 게임 시간을 멈춘다. lastT 는 매 프레임 갱신되므로 풀릴 때 dt 가 튀지 않는다
    if (!TouchUI.blocked) game.update(dt);
```

(b) `draw()` 의 끝 — old:
```js
    if (game.dev) UI.drawDevBadge(ctx, game);
    if (game.dev && game.devOverlay) UI.drawDevOverlay(ctx, game);

    ctx.restore();
  }
```
new:
```js
    if (game.dev) UI.drawDevBadge(ctx, game);
    if (game.dev && game.devOverlay) UI.drawDevOverlay(ctx, game);

    ctx.restore();

    // 터치 버튼·회전 안내 — 화면 좌표(레터박스 여백 포함)로 모든 것 위에 그린다
    if (TouchUI.on) TouchUI.draw(ctx, dpr);
  }
```

- [ ] **Step 7: 통과 확인 + 화면 확인**

Run: `node tests/touch.mjs`
Expected: `TOUCH PASSED`.

첫 터치에서 전체 화면 요청 때문에 헤드리스 창 크기가 바뀌어 검사가 깨지면(`window.innerWidth` 가 915 가 아니게 됨) 해결하려 들지 말고 BLOCKED 로 보고한다(증거: 그 시점의 innerWidth·innerHeight).

`tests/shots/touch-fight.png`·`touch-title.png`·`touch-rotate.png` 가 생긴다. **파일을 열지 말고** 경로만 보고한다(검토자가 읽는다).

- [ ] **Step 8: 회귀 (하나씩)**

Run: `node tests/smoke.mjs` → `SMOKE PASSED` · `node tests/pad.mjs` → `PAD PASSED` · `node tests/options.mjs` → `OPTIONS PASSED`

- [ ] **Step 9: 커밋**

```bash
git add js/config.js js/touch.js js/input.js js/main.js tests/touch.mjs
git commit -m "feat(touch): 버튼 그리기·세로 정지·첫 터치 전체 화면·키보드가 오면 숨김"
```

---

### Task 3: 화면 문구 · 옵션 행 · 전 흐름

**Files:**
- Modify: `js/config.js` (`PROMPTS` 블록 추가, `TOUCH.TEXT` 에 키 추가), `js/ui.js`, `js/game.js`
- Test: `tests/touch.mjs` (함수 5개 추가)

**Interfaces:**
- Consumes: `TouchUI.on`, `C.TOUCH.TEXT`(Task 2), `fingers`/`openPhone`.
- Produces: `C.PROMPTS` (키보드 문구 — ui.js 에서 옮겨 온 것), `Game.prototype.optionRows(): row[]`, ui.js 내부 `say(key, kb)`.

- [ ] **Step 1: 실패하는 테스트 — `tests/touch.mjs`**

`/* ---- 새 검사 함수는 이 줄 위에 추가한다 ---- */` 바로 위에 넣는다:
```js
/* 캔버스에 그려진 글자를 모은다 — 글자 간격(spacing) 문구는 한 글자씩 그려지므로 이어 붙이면 원문이 된다 */
async function drawnText(page) {
  await page.evaluate(() => {
    if (!window.__spy) {
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (s, x, y, w) {
        if (window.__drawn) window.__drawn.push(String(s));
        return w === undefined ? orig.call(this, s, x, y) : orig.call(this, s, x, y, w);
      };
      window.__spy = true;
    }
    window.__drawn = [];
  });
  await sleep(150);
  return page.evaluate(() => window.__drawn.join(''));
}

async function titleIndex(page, id) {
  return page.evaluate((want) => window.__RIPOSTE.game.titleItems().map((i) => i.id).indexOf(want), id);
}

/* ---- T-options: 옵션 — KEY BINDINGS 숨김, ◀ ▶ 로 값 변경 ------------------ */
async function tOptions(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
  await sleep(300);
  const idx = await titleIndex(page, 'options');
  for (let i = 0; i < idx; i++) await f.tap('mDown');
  await f.tap('ok');
  check('T-options: ▼ + OK on the title opens OPTIONS',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'OPTIONS', 3000, 'OPTIONS'), `(index ${idx})`);
  const rows = await page.evaluate(() => window.__RIPOSTE.game.optionRows().map((r) => r.id));
  check('T-options: KEY BINDINGS is hidden in touch mode', rows.length > 0 && !rows.includes('keys'), rows.join());
  const v0 = (await page.evaluate(state)).settings.volume;
  await f.tap('mLeft');
  const v1 = (await page.evaluate(state)).settings.volume;
  check('T-options: ◀ changes the selected row (volume)', v1 !== v0, `(${v0} -> ${v1})`);
  await f.tap('back');
  check('T-options: BACK returns to the title',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 2000, 'TITLE'));
  await ctx.close();
}

/* ---- T-bossselect: ?dev=1 은 전 보스를 연다 — ▼ OK 로 두 번째 보스 ---------- */
async function tBossSelect(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1&dev=1&story=0');
  await sleep(300);
  const idx = await titleIndex(page, 'bosses');
  for (let i = 0; i < idx; i++) await f.tap('mDown');
  await f.tap('ok');
  check('T-bossselect: the title opens BOSS SELECT',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'BOSSSELECT', 3000, 'BOSSSELECT'), `(index ${idx})`);
  await f.tap('mDown');
  await f.tap('ok');
  const ok = await waitFor(page, () => {
    const s = window.__RIPOSTE.getState();
    return (s.scene === 'INTRO' || s.scene === 'FIGHT') && s.bossId === 2;
  }, 4000, 'boss 2');
  check('T-bossselect: ▼ + OK starts the second boss', ok);
  await ctx.close();
}

/* ---- T-story: 대사 — OK 진행 · PARRY 로 줄 완성·선택지 · SKIP · OK 꾹 ------- */
async function tStory(browser) {
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');                          // NEW RUN — 대화가 켜져 있으니 STORY 로 간다
    check('T-story: OK on the title starts a run into STORY',
      await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY'));
    const line0 = (await page.evaluate(state)).story.line;
    await f.tap('cParry');                      // 타자기 즉시 완성
    await f.tap('ok');                          // 다음 줄
    const line1 = (await page.evaluate(state)).story.line;
    check('T-story: PARRY completes the line, OK advances', line1 === line0 + 1, `(${line0} -> ${line1})`);
    let s = await page.evaluate(state);
    for (let i = 0; i < 20 && s.story && s.story.choice !== 'pending'; i++) {
      await f.tap('cParry');
      await f.tap('ok');
      s = await page.evaluate(state);
    }
    check('T-story: the VESPER choice is reached with OK', !!s.story && s.story.choice === 'pending', JSON.stringify(s.story));
    const txt = await drawnText(page);
    check('T-text: the choice labels name the buttons on a phone', txt.includes('[PARRY]') && txt.includes('[RIPOSTE]') && !txt.includes('[K]'));
    await f.tap('cParry');                      // [K] 아직. — ok:true -> reply
    s = await page.evaluate(state);
    check('T-story: PARRY picks the [K] answer', !!s.story && s.story.choice === 'reply', JSON.stringify(s.story));
    await ctx.close();
  }
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY');
    await f.tap('skip');
    check('T-story: SKIP leaves the story',
      await waitFor(page, () => window.__RIPOSTE.getState().scene !== 'STORY', 2000, 'leave STORY'));
    await ctx.close();
  }
  {
    const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1');
    await sleep(300);
    await f.tap('ok');
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 4000, 'STORY');
    await f.hold('ok', 1000);
    check('T-story: holding OK skips the story (existing HOLD ENTER rule)',
      await waitFor(page, () => window.__RIPOSTE.getState().scene !== 'STORY', 2000, 'leave STORY'));
    await ctx.close();
  }
}

/* ---- T-flow: 타이틀 → 전투 → 패배 → RETRY → TITLE(꾹) ---------------------- */
async function tFlow(browser) {
  const { ctx, page, f } = await openPhone(browser, '?mute=1&touch=1&story=0');
  await sleep(300);
  const t0txt = await drawnText(page);
  check('T-text: phone title wording names the buttons',
    t0txt.includes('HOLD NEW') && t0txt.includes('LEFT  RIGHT') && !t0txt.includes('K  /  Z'));
  await f.tap('ok');
  check('T-flow: title OK -> FIGHT', await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 5000, 'FIGHT'));
  const tries0 = (await page.evaluate(state)).tries;
  await page.evaluate(() => window.__RIPOSTE.setTimeScale(4));
  check('T-flow: a passive fight ends in DEFEAT',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'DEFEAT', 30000, 'DEFEAT'));
  await page.evaluate(() => window.__RIPOSTE.setTimeScale(1));
  await sleep(150);
  const sd = await page.evaluate(state);
  check('T-flow: DEFEAT shows RETRY / TITLE buttons', sd.touch.set.join() === 'dRetry,dTitle', sd.touch.set.join());
  const dtxt = await drawnText(page);
  check('T-text: phone DEFEAT says TAP RETRY, not the R key', dtxt.includes('TAP RETRY') && !dtxt.includes('R  —  RETRY'));
  await f.tap('dRetry');
  check('T-flow: RETRY restarts the boss', await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 6000, 'FIGHT again'));
  const tries1 = (await page.evaluate(state)).tries;
  check('T-flow: tries went up by one', tries1 === tries0 + 1, `(${tries0} -> ${tries1})`);
  await f.hold('title', 800);
  check('T-flow: holding TITLE returns to the title',
    await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 3000, 'TITLE'));
  await ctx.close();
}

/* ---- T-text (PC): 데스크톱 문구는 키보드 문구 그대로, KEY BINDINGS 도 있다 --- */
async function tTextDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  hookErrors(page);
  await page.goto(url('?mute=1'), { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  await sleep(300);
  const txt = await drawnText(page);
  check('T-text: PC title keeps keyboard wording',
    txt.includes('N  NEW GAME') && txt.includes('K  /  Z') && txt.includes('ENTER  SELECT') && !txt.includes('HOLD NEW'));
  const rows = await page.evaluate(() => window.__RIPOSTE.game.optionRows().map((r) => r.id));
  check('T-text: PC options still list KEY BINDINGS', rows.includes('keys'), rows.join());
  await page.close();
}

```

`// ---- 새 검사 호출은 이 줄 위에 추가한다 ----` 바로 위에 넣는다:
```js
    await tOptions(browser);
    await tBossSelect(browser);
    await tStory(browser);
    await tFlow(browser);
    await tTextDesktop(browser);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/touch.mjs`
Expected: FAIL — `optionRows is not a function`(T-options·T-text PC), `T-text: ... names the buttons` 등.

- [ ] **Step 3: `js/config.js` — `PROMPTS` 블록과 `TOUCH.TEXT` 키**

(a) `    /* ---- 터치 조작 (2026-09-24` 주석 줄 바로 위에 넣는다. **문자열은 `js/ui.js` 에서 지울 원문과 한 글자도 같아야 한다**(em dash `—`, 공백 수 그대로 — Step 5 에서 원문과 대조):
```js
    /* ---- 안내 문구 (2026-09-24 — js/ui.js 에 박혀 있던 키보드 문구를 옮겼다) ----
     * 터치 모드에서는 C.TOUCH.TEXT 의 같은 키가 대신 쓰인다(ui.js say). 키보드 문구는 이전과 한 글자도 같다. */
    PROMPTS: {
      TITLE_NEW: '      N  NEW GAME',          // 타이틀 힌트 꼬리
      CHOICE_K: '[K]',                          // 대사 선택지 — parry
      CHOICE_J: '[J]',                          // 대사 선택지 — riposte
      CHOICE_DX: 44,                            // 선택지 라벨 → 본문 간격(px)
      NEXT: 'ENTER  —  ',                      // 챕터 카드 — 뒤에 다음 보스 이름이 붙는다
      NEXT_BOSS: 'ENTER  —  NEXT BOSS',
      ENDING: 'ENTER  —  ENDING',
      RETRY: 'R  —  RETRY',
      TITLE_ESC: 'ESC  —  TITLE',
      TITLE_ENTER: 'ENTER  —  TITLE',
      CONTROLS: [                               // 타이틀 조작표
        ['← →  /  A D', 'MOVE'],
        ['K  /  Z', 'PARRY  —  gold flash'],
        ['J  /  X', 'RIPOSTE  —  use stolen attack'],
        ['SPACE  /  L  /  C', 'DASH  —  red flash'],
        ['R  /  M  /  ESC', 'RETRY  /  MUTE  /  TITLE']
      ]
    },

```

(b) `TOUCH.TEXT` 의 old:
```js
      TEXT: {
        ROTATE: 'ROTATE TO LANDSCAPE',
```
new:
```js
      TEXT: {
        /* 안내 문구 — C.PROMPTS·C.MENU·C.STORY 의 같은 키를 터치 모드에서 대신한다 (ui.js say) */
        TITLE_HINT: 'UP DOWN  MOVE      OK  SELECT',
        TITLE_NEW: '      HOLD NEW  —  NEW GAME',
        OPTION_HINT: 'LEFT RIGHT  CHANGE      OK  SELECT      BACK  RETURN',
        PROMPT_NEXT: 'OK',
        PROMPT_SKIP: 'HOLD OK  —  SKIP',
        CHOICE_K: '[PARRY]',
        CHOICE_J: '[RIPOSTE]',
        CHOICE_DX: 104,                         // 라벨이 길다 — 본문을 더 민다(px)
        NEXT: 'OK  —  ',
        NEXT_BOSS: 'OK  —  NEXT BOSS',
        ENDING: 'OK  —  ENDING',
        RETRY: 'TAP RETRY',
        TITLE_ESC: 'TAP TITLE',
        TITLE_ENTER: 'OK  —  TITLE',
        CONTROLS: [
          ['LEFT  RIGHT', 'MOVE'],
          ['PARRY', 'gold flash'],
          ['RIPOSTE', 'use stolen attack'],
          ['DASH', 'red flash'],
          ['HOLD RETRY  /  TITLE', 'RETRY  /  TITLE']
        ],
        ROTATE: 'ROTATE TO LANDSCAPE',
```

- [ ] **Step 4: `js/game.js` — `optionRows`**

(a) old:
```js
  Game.prototype.stepOptions = function (dt) {
    var rows = C.MENU.OPTIONS;
```
new:
```js
  /** 옵션 행 — 터치 모드에서는 KEY BINDINGS 를 숨긴다.
      키 재지정 대기는 키 입력만 받아 터치로는 빠져나올 수 없다 (터치 스펙 §4) */
  Game.prototype.optionRows = function () {
    var rows = C.MENU.OPTIONS;
    if (!TouchUI.on) return rows;
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id !== 'keys') out.push(rows[i]);
    }
    return out;
  };

  Game.prototype.stepOptions = function (dt) {
    var rows = this.optionRows();
```

(b) `grep -n "MENU.OPTIONS\|M.OPTIONS" js/*.js` 로 남은 사용처를 확인한다. `js/ui.js` 의 `drawOptions` 한 곳(Step 5)만 남아야 한다. 다른 곳이 있으면 같은 방식(`this.optionRows()` / `game.optionRows()`)으로 바꾸고 보고서에 적는다.

- [ ] **Step 5: `js/ui.js` — `say` 와 문구 교체**

(a) `function lerp(a, b, t) { return a + (b - a) * t; }` 줄 다음에 넣는다:
```js

  /** 안내 문구 — 터치 모드면 C.TOUCH.TEXT[key], 아니면 키보드 문구 kb (터치 스펙 §6) */
  function say(key, kb) {
    var t = C.TOUCH.TEXT[key];
    return TouchUI.on && t !== undefined ? t : kb;
  }
```

(b) `var CONTROLS = [ ... ];` 다섯 줄짜리 블록을 **지운다**. 지우기 전에 그 원문 문자열이 Step 3(a) `PROMPTS.CONTROLS` 와 한 글자도 같은지 대조한다(다르면 `PROMPTS` 쪽을 원문에 맞춘다).

(c) `drawTitle` 의 조작표 루프 — old:
```js
    for (var i = 0; i < CONTROLS.length; i++) {
      text(ctx, CONTROLS[i][0], V.W / 2 - 16, ty + i * 24,
        { size: 14, weight: '700', color: C.COLORS.TEXT, align: 'right', family: C.FONT.MONO, alpha: fade });
      text(ctx, CONTROLS[i][1], V.W / 2 + 16, ty + i * 24,
```
new:
```js
    var controls = say('CONTROLS', C.PROMPTS.CONTROLS);
    for (var i = 0; i < controls.length; i++) {
      text(ctx, controls[i][0], V.W / 2 - 16, ty + i * 24,
        { size: 14, weight: '700', color: C.COLORS.TEXT, align: 'right', family: C.FONT.MONO, alpha: fade });
      text(ctx, controls[i][1], V.W / 2 + 16, ty + i * 24,
```

(d) old: `    text(ctx, M.TITLE_HINT + '      N  NEW GAME', V.W / 2, M.HINT_Y,`
new: `    text(ctx, say('TITLE_HINT', M.TITLE_HINT) + say('TITLE_NEW', C.PROMPTS.TITLE_NEW), V.W / 2, M.HINT_Y,`

(e) `drawOptions` 의 old: `    var rows = M.OPTIONS;` new: `    var rows = game.optionRows();`

(f) 두 곳(`drawOptions`·`drawBossSelect`)의 old: `    text(ctx, M.OPTION_HINT, V.W / 2, M.HINT_Y,` new: `    text(ctx, say('OPTION_HINT', M.OPTION_HINT), V.W / 2, M.HINT_Y,` (Edit 의 replace_all).

(g) `drawStory` — old: `    text(ctx, S.PROMPT_SKIP, S.BOX_X + S.BOX_W - 16, S.BOX_Y + 14,`
new: `    text(ctx, say('PROMPT_SKIP', S.PROMPT_SKIP), S.BOX_X + S.BOX_W - 16, S.BOX_Y + 14,`

(h) 선택지 — old:
```js
      text(ctx, '[K]', S.TEXT_X, S.CHOICE_Y, { size: 14, weight: '800', color: C.COLORS.GOLD, align: 'left', spacing: 1 });
      text(ctx, st.choice.K.text, S.TEXT_X + 44, S.CHOICE_Y, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
      text(ctx, '[J]', S.TEXT_X, S.CHOICE_Y + S.CHOICE_GAP, { size: 14, weight: '800', color: C.COLORS.PLAYER, align: 'left', spacing: 1 });
      text(ctx, st.choice.J.text, S.TEXT_X + 44, S.CHOICE_Y + S.CHOICE_GAP, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
```
new:
```js
      var cdx = say('CHOICE_DX', C.PROMPTS.CHOICE_DX);
      text(ctx, say('CHOICE_K', C.PROMPTS.CHOICE_K), S.TEXT_X, S.CHOICE_Y, { size: 14, weight: '800', color: C.COLORS.GOLD, align: 'left', spacing: 1 });
      text(ctx, st.choice.K.text, S.TEXT_X + cdx, S.CHOICE_Y, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
      text(ctx, say('CHOICE_J', C.PROMPTS.CHOICE_J), S.TEXT_X, S.CHOICE_Y + S.CHOICE_GAP, { size: 14, weight: '800', color: C.COLORS.PLAYER, align: 'left', spacing: 1 });
      text(ctx, st.choice.J.text, S.TEXT_X + cdx, S.CHOICE_Y + S.CHOICE_GAP, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
```

(i) old: `      text(ctx, S.PROMPT_NEXT, S.BOX_X + S.BOX_W - 18, S.BOX_Y + S.BOX_H - 16,`
new: `      text(ctx, say('PROMPT_NEXT', S.PROMPT_NEXT), S.BOX_X + S.BOX_W - 18, S.BOX_Y + S.BOX_H - 16,`

(j) `drawTaken` — old: `    text(ctx, 'ENTER', V.W / 2, 330, { size: 14, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });`
new: `    text(ctx, say('PROMPT_NEXT', S.PROMPT_NEXT), V.W / 2, 330, { size: 14, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });`
(`C.STORY.PROMPT_NEXT` 는 `'ENTER'` — 원문과 같다.)

(k) 챕터 카드 — old: `    text(ctx, 'ENTER  —  ' + (next ? next.name : 'CONTINUE'), V.W / 2, V.H - 24,`
new: `    text(ctx, say('NEXT', C.PROMPTS.NEXT) + (next ? next.name : 'CONTINUE'), V.W / 2, V.H - 24,`

(l) 승리 — old: `    text(ctx, game.bossIndex + 1 >= game.defs.length ? 'ENTER  —  ENDING' : 'ENTER  —  NEXT BOSS',`
new: `    text(ctx, game.bossIndex + 1 >= game.defs.length ? say('ENDING', C.PROMPTS.ENDING) : say('NEXT_BOSS', C.PROMPTS.NEXT_BOSS),`

(m) 패배 — old: `    text(ctx, 'R  —  RETRY', V.W / 2, 392,` new: `    text(ctx, say('RETRY', C.PROMPTS.RETRY), V.W / 2, 392,`
old: `    text(ctx, 'ESC  —  TITLE', V.W / 2, 424,` new: `    text(ctx, say('TITLE_ESC', C.PROMPTS.TITLE_ESC), V.W / 2, 424,`

(n) 엔딩 — old: `    text(ctx, 'ENTER  —  TITLE', V.W / 2, V.H - 24,` new: `    text(ctx, say('TITLE_ENTER', C.PROMPTS.TITLE_ENTER), V.W / 2, V.H - 24,`

(o) 확인: `grep -n "'ENTER\|'ESC\|'R  —\|'\[K\]'\|'\[J\]'\|CONTROLS\[" js/ui.js` → 출력 없음.

- [ ] **Step 6: 통과 확인**

Run: `node tests/touch.mjs`
Expected: `TOUCH PASSED`.

- [ ] **Step 7: 회귀 (하나씩)**

Run: `node tests/smoke.mjs` → `SMOKE PASSED` · `node tests/options.mjs` → `OPTIONS PASSED` · `node tests/dev.mjs` → `DEV PASSED` · `node tests/state.mjs` → `STATE PASSED`

- [ ] **Step 8: 커밋**

```bash
git add js/config.js js/ui.js js/game.js tests/touch.mjs
git commit -m "feat(touch): 터치 모드 안내 문구·옵션 KEY BINDINGS 숨김 — 박힌 키보드 문구를 C.PROMPTS 로"
```

---

### Task 4: 문서 (Task 1 뒤, Task 2·3 과 병렬 — 브라우저를 쓰지 않는다)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-riposte-design.md` (§2.1·§7·§9), `index.html` (메타 설명), `README.md`, `CLAUDE.md`

**Interfaces:** 없음(문서). 코드 파일(`js/`·`tests/`)은 건드리지 않는다.

- [ ] **Step 1: 스펙 §2.1**

(a) old: `### 2.1 조작 (키보드 + 게임패드, 마우스 미사용)` new: `### 2.1 조작 (키보드 + 게임패드 + 터치, 마우스 미사용)`

(b) 표를 old → new 로 바꾼다.
old:
```
| 키 | 패드 (Standard Gamepad) | 동작 |
|---|---|---|
| ← → / A D | 좌스틱 X(데드존 0.35) · D-Pad 14/15 | 이동 |
| **K** / Z | **2 (X / □)** | **패리** (Parry) |
| **J** / X | **3 (Y / △)** | **리포스트** (훔친 공격 사용) |
| **Space** / L / C / Shift | **1 (B / ○) · 5 (RB) · 7 (RT)** | **대시** (무적 프레임, 붉은 공격 회피) |
| Enter | 0 (A / ×) | 확인 / 시작 / 다음 |
| R | 8 (Select) | 현재 보스 재시작 |
| M | — | 음소거 토글 |
| Esc | 9 (Start) | 타이틀로 |
```
new:
```
| 키 | 패드 (Standard Gamepad) | 터치 (폰·태블릿, 가로) | 동작 |
|---|---|---|---|
| ← → / A D | 좌스틱 X(데드존 0.35) · D-Pad 14/15 | ◀ ▶ | 이동 |
| **K** / Z | **2 (X / □)** | **PARRY** | **패리** (Parry) |
| **J** / X | **3 (Y / △)** | **RIPOSTE** | **리포스트** (훔친 공격 사용) |
| **Space** / L / C / Shift | **1 (B / ○) · 5 (RB) · 7 (RT)** | **DASH** | **대시** (무적 프레임, 붉은 공격 회피) |
| Enter | 0 (A / ×) | OK | 확인 / 시작 / 다음 |
| R | 8 (Select) | RETRY (전투 중에는 0.5초 꾹) | 현재 보스 재시작 |
| M | — | — (옵션의 볼륨) | 음소거 토글 |
| Esc | 9 (Start) | TITLE (전투 중에는 0.5초 꾹) · BACK | 타이틀로 |
```

(c) `- 검증: \`node tests/pad.mjs\` — 가짜 패드로 ...` 줄 다음에 넣는다:
```
- **터치 (2026-09-24)**: 폰·태블릿(주 입력이 손가락 — `pointer: coarse`, 강제는 `?touch=1/0`)에서만 화면 버튼이 뜬다. **PC 에서는 절대 안 보인다.** 가로 전용 — 세로면 게임을 멈추고 회전 안내를 띄운다. 버튼은 기존 액션 이름만 누른다(동사 불변). 배치·화면별 세트·문구는 `docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md`, 수치는 `js/config.js` 의 `TOUCH`. 검증: `node tests/touch.mjs`.
```

- [ ] **Step 2: 스펙 §7 파일 구조**

(a) `js/input.js           키 상태 / justPressed / 리매핑 테이블` 줄 다음에 넣는다:
```
js/touch.js           모바일 터치 버튼 window.TouchUI — 폰·태블릿에서만 켜진다, 버튼 → 기존 액션 이름 (2026-09-24)
```
(b) `tests/zone.mjs        존 linger 동작 ...` 줄 다음에 넣는다:
```
tests/touch.mjs       터치 조작 — 기기 판별(PC 에서는 버튼 없음)·멀티터치·화면별 버튼·세로 정지·안내 문구
```

- [ ] **Step 3: 스펙 §9 비목표**

old: `- 점프, 다단 레인, 콤보 트리, 장비/성장, 긴 스토리 컷신, 멀티플레이, 모바일 터치 UI, 외부 에셋.`
new:
```
- 점프, 다단 레인, 콤보 트리, 장비/성장, 긴 스토리 컷신, 멀티플레이, 외부 에셋.
- (2026-09-24 개정) 모바일 터치 UI 는 허용 — 가로 전용 화면 버튼. 정본: docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md
```

- [ ] **Step 4: `index.html` 메타 설명**

old: `A keyboard-only side-view boss-rush parry duel.">` new: `A side-view boss-rush parry duel for keyboard, gamepad and touch.">`

- [ ] **Step 5: `README.md`**

(a) old: `A side-view 1:1 boss-rush parry duel for keyboard or gamepad. You start with **zero attacks**. Every`
new: `A side-view 1:1 boss-rush parry duel for keyboard, gamepad or touch. You start with **zero attacks**. Every`

(b) `same time — nothing is polled until a pad actually connects.` 줄 다음에 빈 줄 하나와 이 문단을 넣는다:
```
**On a phone or tablet** (hold it sideways) on-screen buttons appear: ◀ ▶ to move on the left,
PARRY · RIPOSTE · DASH on the right, and OK / BACK in menus. RETRY and TITLE in a fight need a
half-second hold, so a stray thumb can't end the run. On a PC the buttons never show.
```

(c) 테스트 목록의 `node tests/zone.mjs ...` 줄 다음에 넣는다:
```
node tests/touch.mjs        # touch controls: phone vs PC detection, multi-touch, per-screen buttons, portrait pause
```

- [ ] **Step 6: `CLAUDE.md` 테스트 목록**

old: `  \`motions.mjs\`(새 공격 동작 단위 검증) — 로컬 chromium.`
new: `  \`motions.mjs\`(새 공격 동작 단위 검증) · \`touch.mjs\`(터치 조작 — PC 에서는 버튼이 안 뜬다) — 로컬 chromium.`
확인: `wc -l CLAUDE.md` 가 100 이하.

- [ ] **Step 7: 커밋**

```bash
git add docs/superpowers/specs/2026-09-09-riposte-design.md index.html README.md CLAUDE.md
git commit -m "docs(touch): 조작 표에 터치 열·파일 구조·비목표 개정·README·CLAUDE.md 테스트 목록"
```

---

### Task 5: 최종 게이트 (컨트롤러가 직접 — 하나씩, 헤드리스)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md` (상태 줄), `docs/handover.md`

- [ ] **Step 1: 전체 테스트 (하나씩)**

Run (순서대로, 동시에 돌리지 않는다):
`node tests/story.mjs` · `node tools/boss-overlap.mjs --check` · `node tests/smoke.mjs` · `node tests/motions.mjs` · `node tests/state.mjs` · `node tests/audio-smoke.mjs` · `node tests/pad.mjs` · `node tests/options.mjs` · `node tests/dev.mjs` · `node tests/zone.mjs` · `node tests/touch.mjs` · `node tests/mash.mjs --all --riposte --expect-lose` · `node tests/bot.mjs --all`
Expected: 전부 exit 0 · `MASH-SUMMARY: wins 0/36` · `BOT PASSED`.

- [ ] **Step 2: 화면 확인** — `tests/shots/touch-fight.png`·`touch-title.png`·`touch-rotate.png` 를 Read 로 본다(사용자 화면에 열지 않는다). 확인할 것: 버튼이 캐릭터·손패 슬롯을 가리지 않는다, 라벨이 원 안에 들어간다, 회전 안내가 읽힌다.

- [ ] **Step 3: 문서 상태**
  - 터치 스펙 2행 상태 → `**구현 완료 — 실기기(안드로이드 크롬) 확인 대기** (브랜치 \`feat/touch-controls\`, 구현 계획 \`../plans/2026-09-24-riposte-touch-controls.md\`)`
  - `docs/handover.md` 맨 위 "현재" 항목에 터치 조작 완료·검증 결과·남은 일(실기기 확인 S6, push·Pages 배포는 사용자 확인)을 적는다.

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md docs/handover.md
git commit -m "docs(touch): 최종 게이트 결과·handover — 실기기 확인 대기"
```

- [ ] **Step 5: push·배포는 사용자에게 묻는다** (main 머지·push = Pages 배포 트리거 — 매번 확인).
