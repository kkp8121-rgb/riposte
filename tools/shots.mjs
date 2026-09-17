/* =============================================================================
 * RIPOSTE — tools/shots.mjs
 * README 용 스크린샷 3장을 헤드리스로 찍어 docs/media/ 에 저장한다.
 *
 *   1. title.png         — 타이틀 (실루엣 대치 + 금색 펄스)
 *   2. story.png         — STORY 콜드 오픈(VESPER before, 첫 줄)
 *   3. perfect-parry.png — VESPER 전, 퍼펙트 패리 스파크가 터진 순간
 *   4. mirror-phase2.png — MIRROR Phase II 진입
 *
 * 결정적인 순간을 잡기 위해 "페이지 안에서" 조건을 감지한 뒤 그 프레임에서
 * game.update / FX.update 를 정지시킨다(드로우는 계속 돈다). Node -> CDP 왕복이
 * 100ms 넘어 스파크가 사라지는 문제를 피하는 유일한 방법.
 * 전투는 tests/bot.mjs 의 실제 반응형 봇이 그대로 몬다 (연출을 위한 조작 없음).
 *
 *   node tools/shots.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, statSync } from 'node:fs';
import { installBot, TUNE } from '../tests/bot.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEDIA = join(ROOT, 'docs', 'media');
mkdirSync(MEDIA, { recursive: true });

const VIEWPORT = { width: 960, height: 540 };
const SEED = 7;
const MAX_KB = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --only=title|story|parry|mirror 로 한 장만 다시 찍을 수 있다 */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const want = (name) => !ONLY || ONLY === name;

/** 페이지 안에서 조건이 참이 되는 프레임에 월드를 얼린다 */
function installFreezer(cond) {
  const R = window.__RIPOSTE;
  const origFX = FX.update;
  const origGame = R.game.update.bind(R.game);
  window.__FROZEN = false;

  const fn = new Function('R', 'FX', 'return (' + cond + ');');

  FX.update = function (dt) { if (!window.__FROZEN) origFX.call(FX, dt); };
  R.game.update = function (dt) {
    if (window.__FROZEN) return;
    origGame(dt);
    let hit = false;
    try { hit = !!fn(R, FX); } catch (e) { hit = false; }
    if (hit) window.__FROZEN = true;
  };
  return true;
}

async function until(page, fn, timeoutMs, arg) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await page.evaluate(fn, arg).catch(() => null);
    if (v) return true;
    await sleep(40);
  }
  return false;
}

async function shot(page, name) {
  const path = join(MEDIA, name);
  await page.screenshot({ path });
  const kb = statSync(path).size / 1024;
  console.log(`  ${name.padEnd(20)} ${kb.toFixed(0)} KB${kb > MAX_KB ? '   !! over budget' : ''}`);
  return kb;
}

async function newPage(browser, query) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + query, { waitUntil: 'load' });
  await until(page, () => !!window.__RIPOSTE, 5000);
  page.__errors = errors;
  return page;
}

(async () => {
  console.log('RIPOSTE screenshots -> docs/media/');
  const browser = await chromium.launch({ headless: true });
  const sizes = [];
  const errors = [];

  /* --- 1. 타이틀 -------------------------------------------------------- */
  if (want('title')) {
    const page = await newPage(browser, `?mute=1&seed=${SEED}`);
    // "PRESS ENTER" 가 가장 밝고 금색 펄스가 최고점인 위상에서 멈춘다
    await page.evaluate(installFreezer, 'R.game.scene === "TITLE" && R.game.sceneT > 1.2 && Math.sin(R.game.sceneT * R.CONFIG.TITLE.BLINK_HZ) > 0.985');
    await until(page, () => window.__FROZEN, 8000);
    await sleep(120);
    sizes.push(await shot(page, 'title.png'));
    errors.push(...page.__errors);
    await page.close();
  }

  /* --- 2. STORY 콜드 오픈 ------------------------------------------------ */
  if (want('story')) {
    const page = await newPage(browser, `?mute=1&seed=${SEED}`);
    await page.keyboard.press('Enter'); // TITLE -> STORY (VESPER before, 첫 진입)
    await sleep(1500);
    sizes.push(await shot(page, 'story.png'));
    errors.push(...page.__errors);
    await page.close();
  }

  /* --- 3. 퍼펙트 패리 (VESPER) ------------------------------------------ */
  if (want('parry')) {
    const page = await newPage(browser, `?boss=1&mute=1&seed=${SEED}`);
    await until(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000);
    /* 퍼펙트 패리의 "그 프레임":
         - 백색 프레임 플래시(0.055s)는 끝났고  → 화면이 하얗게 날아가지 않는다
         - 아직 히트스톱(0.09s) 안이라 월드가 멈춰 있고 패리 포즈가 살아 있다
         - 훔친 기술이 손패에 막 들어와 있다 (봇은 ~0.09s 뒤에 바로 리포스트로 태운다) */
    await page.evaluate(installFreezer,
      'FX.whiteFlash <= 0 && FX.particles.length > 14 && FX.rings.length > 0 && ' +
      'R.game.player.parryFlash > 0 && R.game.player.hand.length > 0 && ' +
      'FX.pops.some(function(p){ return p.text.indexOf("STOLEN") === 0; })');
    await page.evaluate(installBot, TUNE);
    await until(page, () => window.__FROZEN, 20000);
    await sleep(120);
    sizes.push(await shot(page, 'perfect-parry.png'));
    errors.push(...page.__errors);
    await page.close();
  }

  /* --- 4. MIRROR Phase II ------------------------------------------------ */
  if (want('mirror')) {
    const page = await newPage(browser, `?boss=4&mute=1&seed=${SEED}`);
    await until(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 8000);
    /* 포효 배너가 완전히 뜬 구간 + 두 실루엣이 겹쳐 보이지 않을 만큼 떨어졌을 때 */
    await page.evaluate(installFreezer,
      'R.game.boss && R.game.boss.phase === 2 && R.game.banner && R.game.banner.phase2 && ' +
      'R.game.banner.t > 0.8 && R.game.banner.t < 1.2');
    await page.evaluate(installBot, TUNE);
    const got = await until(page, () => window.__FROZEN, 40000);
    if (!got) console.log('  (mirror phase 2 not reached in time — capturing current frame)');
    await sleep(120);
    sizes.push(await shot(page, 'mirror-phase2.png'));
    errors.push(...page.__errors);
    await page.close();
  }

  await browser.close();

  if (errors.length) {
    console.log(`\nFAILED — ${errors.length} page error(s): ${errors.slice(0, 3).join(' | ')}`);
    process.exit(1);
  }
  const over = sizes.filter((k) => k > MAX_KB);
  if (over.length) {
    console.log(`\nFAILED — ${over.length} shot(s) over ${MAX_KB} KB`);
    process.exit(1);
  }
  console.log(`\nOK — 4 screenshots written to docs/media/ (all under ${MAX_KB} KB)`);
  process.exit(0);
})().catch((e) => {
  console.error('screenshot tool crashed:', e);
  process.exit(1);
});
