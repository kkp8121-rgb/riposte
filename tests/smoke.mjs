/* =============================================================================
 * RIPOSTE — tests/smoke.mjs
 * playwright-core 헤드리스 스모크 테스트 (스펙 §8.1)
 *   - pageerror / console error 0
 *   - 캔버스 존재 + TITLE 렌더
 *   - Enter -> 3초 안에 FIGHT 진입
 *   - 60초 무입력 -> DEFEAT 도달 (위협이 실재함을 증명)
 *   - tests/shots/ 에 title / fight / defeat 스크린샷
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

(async () => {
  console.log('RIPOSTE smoke test');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
  });

  const url = pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1&seed=7';
  await page.goto(url, { waitUntil: 'load' });

  // --- 부트 ---------------------------------------------------------------
  const booted = await waitFor(page, () => !!window.__RIPOSTE, 5000, '__RIPOSTE hook');
  check('debug hook window.__RIPOSTE exists', booted);
  if (!booted) { await browser.close(); finish(); }

  const hasCanvas = await page.evaluate(() => {
    const c = document.getElementById('game');
    return !!c && c.width > 0 && c.height > 0;
  });
  check('canvas #game exists and is sized', hasCanvas);

  const s0 = await page.evaluate(state);
  check('scene === TITLE', s0.scene === 'TITLE', `(got ${s0.scene})`);

  // 타이틀은 CONFIG.TITLE.FADE(0.6s) 동안 페이드 인한다 — 다 뜬 뒤에 픽셀을 센다
  await waitFor(page,
    () => window.__RIPOSTE.game.sceneT > window.__RIPOSTE.CONFIG.TITLE.FADE + 0.2,
    4000, 'title fade-in');

  // 타이틀이 실제로 픽셀을 그리는지 (전부 배경색이면 실패)
  const painted = await page.evaluate(() => {
    const c = document.getElementById('game');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4 * 97) {
      if (d[i] + d[i + 1] + d[i + 2] > 200) bright++;
    }
    return bright;
  });
  check('title screen renders content', painted > 20, `(bright samples ${painted})`);

  await page.screenshot({ path: join(SHOTS, 'smoke-title.png') });

  // --- Enter -> STORY -> (Enter 연타, 선택지는 K) -> FIGHT -------------------
  // 타이틀에서 누른 Enter 를 놓지 않고 1초 유지 — 그 Enter 는 STORY 의 스킵 홀드로 세면 안 된다
  await page.keyboard.down('Enter');
  const inStory = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 3000, 'STORY');
  check('Enter enters STORY (boss 1 dialogue) within 3s', inStory);
  await sleep(1000);
  const sHold = await page.evaluate(state);
  await page.keyboard.up('Enter');
  check('held-over Enter does not skip STORY', sHold.scene === 'STORY',
    `(scene ${sHold.scene}, line ${sHold.story ? sHold.story.line : '-'})`);

  let presses = 0;
  let triedWrong = false;
  for (; presses < 40; presses++) {
    const s = await page.evaluate(state);
    if (s.scene === 'FIGHT' || s.scene === 'INTRO') break;
    if (s.story && s.story.choice === 'pending') {
      if (!triedWrong) {
        // 첫 선택지에서는 일부러 오답(J)을 짚어 TAKEN 카드 → Enter 복귀 루프를 검증한다
        triedWrong = true;
        await page.keyboard.press('KeyJ');
        await sleep(150);
        const sTaken = await page.evaluate(state);
        check('wrong answer shows TAKEN card', sTaken.story && sTaken.story.choice === 'taken',
          `(choice ${sTaken.story ? sTaken.story.choice : '-'})`);
        await page.keyboard.press('Enter');
        await sleep(150);
        const sPending = await page.evaluate(state);
        check('Enter after TAKEN returns to the choice', sPending.story && sPending.story.choice === 'pending',
          `(choice ${sPending.story ? sPending.story.choice : '-'})`);
        continue;
      }
      await page.keyboard.press('KeyK');
    }
    else await page.keyboard.press('Enter');
    await sleep(120);
  }
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 4000, 'FIGHT');
  check('story advances to FIGHT with Enter/K', inFight, `(${presses} presses)`);

  await sleep(700);
  await page.screenshot({ path: join(SHOTS, 'smoke-fight.png') });

  const s1 = await page.evaluate(state);
  check('boss is loaded', s1.bossMaxHp > 0, `(bossId ${s1.bossId}, hp ${s1.bossHp}/${s1.bossMaxHp})`);
  check('no NaN positions', Number.isFinite(s1.playerX) && Number.isFinite(s1.bossX),
    `(playerX ${s1.playerX?.toFixed(1)}, bossX ${s1.bossX?.toFixed(1)})`);

  // --- 60초 무입력 -> DEFEAT ----------------------------------------------
  console.log('  ...idling 60s with no input (proving the boss is a real threat)');
  const dead = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'DEFEAT', 60000, 'DEFEAT');
  const s2 = await page.evaluate(state);
  check('60s of no input reaches DEFEAT', dead,
    `(scene ${s2.scene}, playerHp ${s2.playerHp}, t=${s2.time.toFixed(1)}s)`);
  await page.screenshot({ path: join(SHOTS, 'smoke-defeat.png') });

  // --- R 재도전은 STORY 를 다시 틀지 않는다 (스펙 §10) -----------------------
  await page.keyboard.press('KeyR');
  await sleep(150);
  const s3 = await page.evaluate(state);
  check('R retry skips STORY (INTRO or FIGHT)', s3.scene === 'INTRO' || s3.scene === 'FIGHT', `(scene ${s3.scene})`);

  const s4 = await page.evaluate(state);
  check('retry counts as a second try', s4.tries === 2, `(tries ${s4.tries})`);

  check('zero page/console errors', errors.length === 0, errors.length ? `\n        ${errors.slice(0, 6).join('\n        ')}` : '');

  await browser.close();
  finish();
})().catch((e) => {
  console.error('smoke test crashed:', e);
  process.exit(1);
});

function finish() {
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`SMOKE FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`SMOKE PASSED — all checks green, 0 page errors  [${secs}s]`);
  process.exit(0);
}
