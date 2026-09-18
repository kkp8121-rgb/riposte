/* =============================================================================
 * RIPOSTE — tests/pad.mjs
 * 게임패드 입력 단위 확인 (playwright-core 헤드리스, navigator.getGamepads 모킹).
 * 실제 패드가 없는 CI/헤드리스 환경이므로 진짜 패드 대신 가짜 Gamepad 객체를
 * navigator.getGamepads 가 반환하도록 덮어써서 js/input.js 의 Input.pollGamepad()
 * 가 그 상태를 읽고 반응하는지만 확인한다 (스펙 §8, Phase1 그룹2).
 *
 *   1) parry 버튼(인덱스 2) 누름 -> stamina 감소 (실제로 패리가 발동)
 *   2) 좌/우 축 입력 -> playerX 이동
 *   3) 버튼을 누른 채 여러 프레임이 지나도 패리는 한 번만 발동 (justPressed 의미 유지)
 *   4) (보너스) gamepaddisconnected -> 쥐고 있던 액션이 정리된다
 *
 *   node tests/pad.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const failures = [];
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

/* 페이지 안에 가짜 Standard Gamepad 를 심는다.
   버튼 16개 + 축 4개(스틱 2개분)를 비워 두고, navigator.getGamepads() 가
   이 객체 하나짜리 배열을 반환하도록 덮어쓴다 — 이후 값만 바꾸면 다음 폴링에 반영된다. */
function installFakePad() {
  const buttons = [];
  for (let i = 0; i < 16; i++) buttons.push({ pressed: false, value: 0 });
  window.__fakePad = { connected: true, axes: [0, 0, 0, 0], buttons };
  navigator.getGamepads = () => [window.__fakePad];
  // pollGamepad 는 이제 Input._padCount 가 0이면 navigator 를 아예 안 건드린다 —
  // 실제 연결처럼 gamepadconnected 를 직접 쏴서 카운트를 올려줘야 폴링이 시작된다.
  window.dispatchEvent(new Event('gamepadconnected'));
}

(async () => {
  console.log('RIPOSTE pad test');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href + '?boss=1&story=0&mute=1';
  await page.goto(url, { waitUntil: 'load' });

  const booted = await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  check('debug hook window.__RIPOSTE exists', booted);
  if (!booted) { await browser.close(); return finish(); }

  await page.evaluate(installFakePad);

  // ?boss=1 는 INTRO 를 거쳐 FIGHT 로 자동 진입한다 (CONFIG.SCENE.INTRO_TIME 뒤)
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 5000, 'FIGHT');
  check('boss=1 reaches FIGHT', inFight, `(scene ${(await page.evaluate(state)).scene})`);

  const s0 = await page.evaluate(state);
  check('stamina starts full', s0.stamina === 100, `(stamina ${s0.stamina})`);
  const x0 = s0.playerX;

  // 패드가 연결만 돼 있고 아무 것도 안 눌렀을 때 상태를 한 번 흘려보내 —
  // pollGamepad 가 유휴 패드로 인해 아무 것도 깨뜨리지 않는지 확인
  await sleep(100);
  const sIdle = await page.evaluate(state);
  check('connected-but-idle pad does not move/act on its own',
    sIdle.stamina === 100 && sIdle.playerX === x0,
    `(stamina ${sIdle.stamina}, playerX ${sIdle.playerX})`);

  // ---- (1)(3) parry 버튼(인덱스 2) 을 누른 채 계속 쥔다 --------------------
  await page.evaluate(() => { window.__fakePad.buttons[2].pressed = true; window.__fakePad.buttons[2].value = 1; });

  await sleep(150);
  const s1 = await page.evaluate(state);
  check('(1) parry button press triggers a parry — stamina drops by PARRY_COST',
    s1.stamina === 70, `(stamina ${s1.stamina}, expected 70)`);

  // PARRY.RECOVERY(0.40s) 락이 풀린 뒤에도 계속 쥐고 있는데 — 더 깎이면 justPressed 가
  // 매 프레임 재발화한 것(버그). 정상이면 REGEN_DELAY(0.5s) 전이라 그대로 70이거나
  // 그 이후 회복분만큼만 올라간다(내려가지는 않는다).
  await sleep(500);
  const s2 = await page.evaluate(state);
  check('(3) holding the button across many frames fires parry only once',
    s2.stamina >= 65, `(stamina ${s2.stamina}, would be <=40 if it kept re-firing)`);

  await page.evaluate(() => { window.__fakePad.buttons[2].pressed = false; window.__fakePad.buttons[2].value = 0; });
  await sleep(50);

  // ---- (2) 좌스틱 축 입력 -> playerX 이동 ----------------------------------
  const xBefore = (await page.evaluate(state)).playerX;
  await page.evaluate(() => { window.__fakePad.axes[0] = -1; }); // CONFIG.PAD.AXIS_X 인덱스, 왼쪽 최대
  await sleep(300);
  const sMoved = await page.evaluate(state);
  check('(2) left stick axis moves playerX (left = decreasing x)',
    sMoved.playerX < xBefore - 5, `(before ${xBefore.toFixed(1)}, after ${sMoved.playerX.toFixed(1)})`);
  await page.evaluate(() => { window.__fakePad.axes[0] = 0; });
  await sleep(50);

  // ---- (보너스) gamepaddisconnected -> 쥐고 있던 액션 정리 -----------------
  await page.evaluate(() => { window.__fakePad.axes[0] = 1; }); // 오른쪽을 쥔 채
  await sleep(100);
  const heldRight = await page.evaluate(() => window.Input.down.right === true);
  check('(bonus) right is held via pad before disconnect', heldRight);
  // 실제 브라우저는 해제된 패드를 getGamepads() 목록에서 아예 빼버린다 —
  // 가짜 패드도 똑같이 치워야 다음 폴링이 "여전히 눌려 있다"고 되살리지 않는다.
  await page.evaluate(() => {
    navigator.getGamepads = () => [];
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await sleep(20);
  const clearedAfterDisconnect = await page.evaluate(() => window.Input.down.right === false);
  check('(bonus) gamepaddisconnected clears the held action (no stuck key)', clearedAfterDisconnect);

  check('zero page/console errors', errors.length === 0,
    errors.length ? `\n        ${errors.slice(0, 6).join('\n        ')}` : '');

  await browser.close();
  finish();
})().catch((e) => {
  console.error('pad test crashed:', e);
  process.exit(1);
});

function finish() {
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`PAD FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`PAD PASSED — all checks green  [${secs}s]`);
  process.exit(0);
}
