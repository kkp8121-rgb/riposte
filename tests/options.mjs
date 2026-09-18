/* =============================================================================
 * RIPOSTE — tests/options.mjs
 * 타이틀 메뉴 · 옵션 화면 · 보스 선택 확인 (playwright-core 헤드리스).
 *
 *   1) 타이틀 커서 기본값이 0번(NEW RUN) — Enter 한 번이 그대로 시작
 *   2) 볼륨 변경이 저장되고 새로고침 뒤에도 남는다
 *   3) ASSIST 를 바꾸면 getState().assist 와 저장값에 반영된다
 *   4) 키 재지정 후 그 키가 실제로 패리를 발동한다 (충돌 키는 거부)
 *   5) RESET TO DEFAULTS 가 전부 되돌린다
 *   6) 세 화면(타이틀 메뉴 · 옵션 · 보스 선택) 스크린샷을 tests/shots/ 에 남긴다
 *
 *   node tests/options.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS = join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

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

const URL_BASE = pathToFileURL(join(ROOT, 'index.html')).href;

/** 메뉴 커서를 idx 로 옮긴다 (아래로만 이동 — 메뉴는 순환한다) */
async function moveTo(page, idx) {
  for (let i = 0; i < idx; i++) { await page.keyboard.press('ArrowDown'); await sleep(70); }
  await sleep(60);
}

async function press(page, key, ms = 140) {
  await page.keyboard.press(key);
  await sleep(ms);
}

(async () => {
  console.log('RIPOSTE options test');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(URL_BASE + '?mute=1&seed=7', { waitUntil: 'load' });
  const booted = await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  check('debug hook window.__RIPOSTE exists', booted);
  if (!booted) { await browser.close(); return finish(); }

  // 이전 테스트가 남긴 저장값을 비우고 깨끗한 상태에서 시작한다
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot');
  await sleep(200);

  // ---- (1) 타이틀 커서 기본값 --------------------------------------------
  const s0 = await page.evaluate(state);
  check('(1) title cursor defaults to item 0 (NEW RUN)', s0.scene === 'TITLE' && s0.menuIndex === 0,
    `(scene ${s0.scene}, menuIndex ${s0.menuIndex})`);
  const items = await page.evaluate(() => window.__RIPOSTE.game.titleItems().map((i) => i.id));
  check('(1) fresh save shows NEW RUN + OPTIONS only', items.join(',') === 'new,options', `(${items.join(',')})`);
  await sleep(500);   // 페이드 인 완료
  await page.screenshot({ path: join(SHOTS, 'menu-title.png') });

  // ---- 옵션 화면 진입 -----------------------------------------------------
  await moveTo(page, items.indexOf('options'));
  await press(page, 'Enter');
  const inOptions = (await page.evaluate(state)).scene === 'OPTIONS';
  check('title menu opens OPTIONS', inOptions);
  await sleep(200);
  await page.screenshot({ path: join(SHOTS, 'menu-options.png') });

  // ---- (2) 볼륨 --------------------------------------------------------
  const vol0 = (await page.evaluate(state)).settings.volume;
  await press(page, 'ArrowLeft');
  await press(page, 'ArrowLeft');
  const vol1 = (await page.evaluate(state)).settings.volume;
  check('(2) LEFT lowers MASTER VOLUME by VOLUME_STEP each press',
    vol1 === vol0 - 2 * 10, `(${vol0} -> ${vol1})`);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem(window.__RIPOSTE.CONFIG.STORAGE.KEY)).settings.volume);
  check('(2) volume is written to the existing STORAGE key', stored === vol1, `(stored ${stored})`);
  const gain = await page.evaluate(() => window.RAudio.volume);
  check('(2) RAudio master volume follows the setting', Math.abs(gain - vol1 / 100) < 1e-6, `(${gain})`);

  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot');
  await sleep(200);
  const volAfter = (await page.evaluate(state)).settings.volume;
  check('(2) volume survives a reload', volAfter === vol1, `(${volAfter})`);

  // ---- (3) ASSIST -------------------------------------------------------
  await moveTo(page, 1);            // OPTIONS
  await press(page, 'Enter');
  await moveTo(page, 4);            // ASSIST: PLAYER HP
  await press(page, 'ArrowRight');
  const sA = await page.evaluate(state);
  check('(3) ASSIST: PLAYER HP raises max HP and flags the run',
    sA.settings.assistHp === 1 && sA.assist.on === true && sA.assist.hp > 5,
    `(idx ${sA.settings.assistHp}, maxHp ${sA.assist.hp}, on ${sA.assist.on})`);
  await press(page, 'ArrowDown');   // ASSIST: BOSS WINDUP
  await press(page, 'ArrowRight');
  const sB = await page.evaluate(state);
  check('(3) ASSIST: BOSS WINDUP multiplies boss windup',
    sB.settings.assistWindup === 1 && sB.assist.windup > 1, `(x${sB.assist.windup})`);
  const storedAssist = await page.evaluate(() =>
    JSON.parse(localStorage.getItem(window.__RIPOSTE.CONFIG.STORAGE.KEY)).settings.assistHp);
  check('(3) ASSIST choice is saved', storedAssist === 1, `(stored ${storedAssist})`);

  // ---- (4) 키 재지정 -----------------------------------------------------
  await moveTo(page, 1);            // KEY BINDINGS (assistWindup=5 -> keys=6)
  await press(page, 'Enter');
  check('(4) KEY BINDINGS opens', (await page.evaluate(state)).scene === 'KEYBIND');

  await moveTo(page, 2);            // parry
  await press(page, 'Enter');
  check('(4) rebind waits for a key', await page.evaluate(() => window.__RIPOSTE.game.bindWait === 'parry'));
  await press(page, 'KeyJ');        // riposte 가 이미 쓰는 키 — 거부돼야 한다
  const conflict = await page.evaluate(() => ({
    msg: window.__RIPOSTE.game.menuMsg,
    parry: window.Input.KEYMAP.parry.join(',')
  }));
  check('(4) a key already used by another action is rejected',
    conflict.parry === 'KeyK,KeyZ' && !!conflict.msg, `(parry ${conflict.parry}, msg "${conflict.msg}")`);

  await press(page, 'Enter');       // 다시 재지정
  await press(page, 'KeyP');
  const bound = await page.evaluate(() => window.Input.KEYMAP.parry.join(','));
  check('(4) parry rebinds to the pressed key', bound === 'KeyP', `(${bound})`);
  await page.screenshot({ path: join(SHOTS, 'menu-keybind.png') });

  // 실제로 동작하는지 — 전투에 들어가 P 로 패리한다.
  // 대화를 건너뛰어야 Enter 한 번이 바로 INTRO->FIGHT 로 간다 (?story=0)
  await page.goto(URL_BASE + '?mute=1&seed=7&story=0', { waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot');
  await sleep(200);
  await press(page, 'Enter');       // NEW RUN (커서 0번)
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000, 'FIGHT');
  check('(4) NEW RUN with one Enter still reaches FIGHT', inFight);
  if (inFight) {
    const stam0 = (await page.evaluate(state)).stamina;
    await press(page, 'KeyK', 250);   // 옛 키 — 아무 일도 없어야 한다
    const stamK = (await page.evaluate(state)).stamina;
    check('(4) the old key no longer parries', stamK === stam0, `(stamina ${stamK})`);
    await press(page, 'KeyP', 250);
    const stamP = (await page.evaluate(state)).stamina;
    check('(4) the rebound key actually parries (stamina drops)', stamP < stam0,
      `(${stam0} -> ${stamP})`);
  }

  // ---- (5) RESET TO DEFAULTS ---------------------------------------------
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot');
  await sleep(200);
  const keptKeys = await page.evaluate(() => window.Input.KEYMAP.parry.join(','));
  check('(5) rebind survives a reload', keptKeys === 'KeyP', `(${keptKeys})`);

  const titleItems = await page.evaluate(() => window.__RIPOSTE.game.titleItems().map((i) => i.id));
  await moveTo(page, titleItems.indexOf('options'));
  await press(page, 'Enter');
  await moveTo(page, 7);            // RESET TO DEFAULTS
  await press(page, 'Enter', 250);
  const sR = await page.evaluate(() => ({
    st: window.__RIPOSTE.getState(),
    parry: window.Input.KEYMAP.parry.join(',')
  }));
  check('(5) RESET restores volume, assist and key bindings',
    sR.st.settings.volume === 100 && sR.st.settings.assistHp === 0 &&
    sR.st.settings.assistWindup === 0 && sR.st.assist.on === false && sR.parry === 'KeyK,KeyZ',
    `(vol ${sR.st.settings.volume}, assist ${sR.st.settings.assistHp}/${sR.st.settings.assistWindup}, parry ${sR.parry})`);

  // ---- (6) 보스 선택 -----------------------------------------------------
  await page.evaluate(() => {
    const K = window.__RIPOSTE.CONFIG.STORAGE.KEY;
    const o = JSON.parse(localStorage.getItem(K)) || {};
    o.unlocked = 4;                       // 1~3번 보스를 클리어한 세이브
    o.ranks = { vesper: 'S', seraph: 'A', graven: 'B' };
    localStorage.setItem(K, JSON.stringify(o));
  });
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => !!window.__RIPOSTE, 5000, 'reboot');
  await sleep(200);
  const items2 = await page.evaluate(() => window.__RIPOSTE.game.titleItems().map((i) => i.id));
  check('(6) cleared save adds CONTINUE and BOSS SELECT',
    items2.join(',') === 'new,continue,bosses,options', `(${items2.join(',')})`);
  await moveTo(page, items2.indexOf('bosses'));
  await press(page, 'Enter');
  const inSelect = (await page.evaluate(state)).scene === 'BOSSSELECT';
  check('(6) BOSS SELECT opens', inSelect);
  const listed = await page.evaluate(() => window.__RIPOSTE.game.clearedBosses());
  check('(6) only cleared bosses are listed', listed.join(',') === '0,1,2', `(${listed.join(',')})`);
  await sleep(200);
  await page.screenshot({ path: join(SHOTS, 'menu-bossselect.png') });

  await moveTo(page, 1);            // 2번 보스
  await press(page, 'Enter');
  const started = await waitFor(page, () => {
    const s = window.__RIPOSTE.getState();
    return s.scene === 'INTRO' || s.scene === 'FIGHT';
  }, 6000, 'boss select start');
  const sel = await page.evaluate(() => ({ id: window.__RIPOSTE.getState().bossId, noSave: window.__RIPOSTE.game.noSave }));
  check('(6) picking a boss starts it and does not save progress',
    started && sel.id === 2 && sel.noSave === true, `(bossId ${sel.id}, noSave ${sel.noSave})`);

  // 다른 테스트가 같은 file:// 오리진의 저장값을 물려받지 않게 치운다
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  check('zero page/console errors', errors.length === 0,
    errors.length ? `\n        ${errors.slice(0, 6).join('\n        ')}` : '');

  await browser.close();
  finish();
})().catch((e) => {
  console.error('options test crashed:', e);
  process.exit(1);
});

function finish() {
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log(`  shots: tests/shots/menu-title.png  menu-options.png  menu-keybind.png  menu-bossselect.png`);
  if (failures.length) {
    console.log(`OPTIONS FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`OPTIONS PASSED — all checks green  [${secs}s]`);
  process.exit(0);
}
