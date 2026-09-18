/* =============================================================================
 * RIPOSTE — tests/dev.mjs
 * dev 모드(타이틀에서 THIEF 입력 / ?dev=1)와 개발용 치트 검증.
 * 기본은 꺼져 있어야 하고, 치트 판은 저장하지 않아야 한다.
 *
 *   1) 기본은 꺼짐 — dev 가 false 이면 F2 를 눌러도 아무 일도 없다
 *   2) 타이틀에서 THIEF(KeyT-H-I-E-F) 를 치면 dev 가 켜진다
 *   3) 전투 중에는 THIEF 커맨드가 먹지 않는다 (오발동 방지)
 *   4) F2 는 보스 HP 를 25%(C.DEV.HP_CUT) 깎는다
 *   5) F4 는 다음 보스로 간다 (bossId 가 바뀐다)
 *   6) F3 는 보스를 즉시 처치한다 (scene 이 VICTORY 로 간다)
 *   7) 치트로 끝낸 판은 저장하지 않는다 (localStorage 의 unlocked 가 늘지 않는다)
 *
 *   node tests/dev.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const failures = [];
const errors = [];
const t0 = Date.now();

function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = () => window.__RIPOSTE.getState();

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

/** 물리 키 코드 하나를 keydown+keyup 으로 흘려보낸다.
    js/input.js 는 액션이든 dev 커맨드든 e.code 만 보므로 실제 브라우저 키 대신
    window.dispatchEvent 로 KeyboardEvent 를 직접 쏜다 (bot.mjs 와 같은 방식). */
async function press(page, code, ms = 100) {
  await page.evaluate((c) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true, cancelable: true }));
  }, code);
  await sleep(ms);
}

async function pressSeq(page, codes, ms) {
  for (const c of codes) await press(page, c, ms);
}

const URL_BASE = pathToFileURL(join(ROOT, 'index.html')).href;
const THIEF = ['KeyT', 'KeyH', 'KeyI', 'KeyE', 'KeyF'];

(async () => {
  console.log('RIPOSTE dev test');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(URL_BASE + '?boss=1&story=0&mute=1', { waitUntil: 'load' });
  const booted = await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  check('debug hook window.__RIPOSTE exists', booted);
  if (!booted) { await browser.close(); return finish(); }

  // ---- (1) 기본은 꺼짐 -----------------------------------------------------
  const inFight0 = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT');
  check('(1) boss=1 reaches FIGHT', inFight0);
  const s0a = await page.evaluate(state);
  check('(1) dev defaults to false', s0a.dev === false, `(dev ${s0a.dev})`);
  const hp0 = s0a.bossHp;
  await press(page, 'F2');
  const s0b = await page.evaluate(state);
  check('(1) F2 cheat does nothing while dev is off', s0b.bossHp === hp0, `(before ${hp0}, after ${s0b.bossHp})`);

  // ---- (2) 타이틀에서 THIEF -> dev 켜짐 -------------------------------------
  await page.goto(URL_BASE + '?story=0&mute=1', { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot for (2)');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 5000, 'TITLE for (2)');
  await pressSeq(page, THIEF, 30);
  await sleep(50);
  const s2 = await page.evaluate(state);
  check('(2) THIEF at TITLE turns dev on', s2.dev === true, `(dev ${s2.dev})`);

  // ---- (3) 전투 중에는 THIEF 가 안 먹는다 -----------------------------------
  await page.goto(URL_BASE + '?boss=1&story=0&mute=1', { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot for (3)');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT for (3)');
  await pressSeq(page, THIEF, 30);
  await sleep(50);
  const s3 = await page.evaluate(state);
  check('(3) THIEF during FIGHT is ignored', s3.dev === false, `(dev ${s3.dev})`);

  // ---- (4)(5)(6) ?dev=1&boss=1 -> 치트 키 -----------------------------------
  await page.goto(URL_BASE + '?dev=1&boss=1&story=0&mute=1', { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot for (4)');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT for (4)');
  const s4a = await page.evaluate(state);
  check('(4) ?dev=1 enters with dev already on', s4a.dev === true, `(dev ${s4a.dev})`);
  const maxHp = s4a.bossMaxHp;
  const hpBefore = s4a.bossHp;
  await press(page, 'F2');
  const s4b = await page.evaluate(state);
  const expectHp = maxHp * (1 - 0.25);
  check('(4) F2 cuts boss HP by 25% of max',
    Math.abs(s4b.bossHp - expectHp) < 1, `(before ${hpBefore}, after ${s4b.bossHp}, expected ~${expectHp})`);

  const bossIdBefore = s4b.bossId;
  await press(page, 'F4');
  const s5a = await page.evaluate(state);
  check('(5) F4 moves to the next boss', s5a.bossId === bossIdBefore + 1,
    `(before ${bossIdBefore}, after ${s5a.bossId})`);
  // F4 는 다음 보스를 INTRO 로 다시 여니 그 FIGHT 진입을 기다린다
  const inFight5 = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT after F4');
  check('(5) reaches FIGHT again after boss switch', inFight5);

  await press(page, 'F3');
  const inVictory = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'VICTORY', 4000, 'VICTORY after F3');
  check('(6) F3 instantly defeats the boss', inVictory, `(scene ${(await page.evaluate(state)).scene})`);

  // ---- (7) 치트로 끝낸 판은 저장하지 않는다 ----------------------------------
  // ?boss=N 진입은 그 자체로 noSave 이므로, 치트 자체의 noSave 를 독립적으로 검증하려면
  // TITLE -> NEW RUN(진행도 저장이 켜진 정상 경로)으로 들어가야 한다.
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* 무시 */ } });
  await page.goto(URL_BASE + '?dev=1&story=0&mute=1', { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot for (7)');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'TITLE', 5000, 'TITLE for (7)');
  await press(page, 'Enter');   // NEW RUN — 메뉴 0번은 dev 여부와 무관하게 고정
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT for (7)');
  await press(page, 'F3');
  await waitFor(page, () => window.__RIPOSTE.getState().scene === 'VICTORY', 4000, 'VICTORY for (7)');
  await sleep(100);
  const saveRaw = await page.evaluate(() => {
    try { return localStorage.getItem('riposte.progress.v1'); } catch (e) { return null; }
  });
  const save7 = saveRaw ? JSON.parse(saveRaw) : null;
  check('(7) cheat-ended run does not persist progress',
    !save7 || save7.unlocked <= 1, `(save ${saveRaw})`);

  check('zero page/console errors', errors.length === 0,
    errors.length ? `\n        ${errors.slice(0, 6).join('\n        ')}` : '');

  await browser.close();
  finish();
})().catch((e) => {
  console.error('dev test crashed:', e);
  process.exit(1);
});

function finish() {
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`DEV FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`DEV PASSED — all checks green  [${secs}s]`);
  process.exit(0);
}
