/* =============================================================================
 * RIPOSTE — tests/audio-smoke.mjs
 *
 * 오디오 경로가 헤드리스에서 실제로 살아나는지 본다 (스펙 §5).
 *   - 음소거 없이(?seed=7, mute 없음) 로드
 *   - Enter 한 번 = 사용자 제스처 -> AudioContext 가 'running' 이 되어야 한다
 *   - RAudio 의 모든 공개 재생/이벤트 메서드를 한 번씩 호출 -> 예외 0, pageerror 0
 *
 * [헤드리스 메모] 번들 Chromium 헤드리스에서는 Playwright 가 보내는 키 입력이
 *   진짜 user activation 으로 취급돼 `ctx.resume()` 이 통한다(실측: 플래그 없이 running).
 *   그래서 자동재생 플래그를 **일부러 쓰지 않는다** — 플래그를 켜면 제스처 경로가
 *   망가져도 테스트가 통과해 버려 회귀를 놓친다.
 *   다른 환경/빌드에서 계속 'suspended' 로 남는다면 브라우저 실행 인자에
 *   `--autoplay-policy=no-user-gesture-required` 를 추가하면 된다.
 *
 *   node tests/audio-smoke.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const LAUNCH_ARGS = [
  // 자동재생 우회 플래그는 쓰지 않는다 (위 헤드리스 메모 참조)
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding'
];

const failures = [];
const errors = [];
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}

async function until(page, fn, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return true;
    await sleep(50);
  }
  return false;
}

(async () => {
  console.log('RIPOSTE audio smoke test');
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href + '?seed=7';
  await page.goto(url, { waitUntil: 'load' });
  await until(page, () => !!window.__RIPOSTE, 5000);

  const supported = await page.evaluate(() => window.RAudio.supported);
  check('WebAudio is supported in this browser', supported);

  const beforeState = await page.evaluate(() => window.RAudio.state());
  check('RAudio.state() getter exists', typeof beforeState === 'string', `(before gesture: ${beforeState})`);

  // --- 사용자 제스처 -> ctx running ----------------------------------------
  await page.keyboard.press('Enter');
  const running = await until(page, () => window.RAudio.state() === 'running', 4000);
  const state = await page.evaluate(() => window.RAudio.state());
  check('AudioContext reaches "running" after a key gesture', running, `(state ${state})`);
  check('RAudio.ready is true once running', await page.evaluate(() => window.RAudio.ready === true));

  // 전투 진입 -> 드론이 실제로 물려 있어야 한다
  await until(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 4000);
  await sleep(300);
  check('BGM drone is live during FIGHT', await page.evaluate(() => !!window.RAudio._drone));

  // --- 음소거 토글 후 드론 복구 ---------------------------------------------
  await page.evaluate(() => window.RAudio.setMuted(true));
  const mutedDrone = await page.evaluate(() => !!window.RAudio._drone);
  await page.evaluate(() => window.RAudio.setMuted(false));
  await sleep(120);
  const unmutedDrone = await page.evaluate(() => !!window.RAudio._drone);
  check('mute stops the drone, unmute brings it back', mutedDrone === false && unmutedDrone === true,
    `(muted ${mutedDrone}, unmuted ${unmutedDrone})`);

  // --- 모든 공개 메서드 1회씩 호출 ------------------------------------------
  const called = await page.evaluate(() => {
    const R = window.RAudio;
    /* 인자가 필요한 메서드만 표로 준다. 나머지는 인자 없이 부른다. */
    const ARGS = {
      riposteHit: [true],
      startDrone: [55, 100],
      startHeartbeat: [100],
      setMuted: [false],
      ui: [true]
    };
    /* 상태를 바꾸는 것들은 마지막에 따로 부른다 (여기서 빼지 않는다 — 순서만 뒤로) */
    const LAST = ['setMuted', 'toggleMute', 'stopHeartbeat', 'stopDrone', 'init'];
    const names = [];
    for (const k in R) {
      if (typeof R[k] !== 'function') continue;
      if (k.charAt(0) === '_') continue;
      names.push(k);
    }
    names.sort((a, b) => (LAST.indexOf(a) - LAST.indexOf(b)) || 0);
    const order = names.filter((n) => LAST.indexOf(n) < 0).concat(LAST.filter((n) => names.indexOf(n) >= 0));

    const failed = [];
    for (const n of order) {
      try { R[n].apply(R, ARGS[n] || []); }
      catch (e) { failed.push(n + ': ' + e.message); }
    }
    return { order: order, failed: failed, muted: R.muted };
  });

  check('every public RAudio method callable without throwing',
    called.failed.length === 0,
    called.failed.length ? called.failed.join(' | ') : `(${called.order.length} methods: ${called.order.join(', ')})`);

  // toggleMute 가 홀수번 불렸을 수 있으니 원위치시키고 소리가 다시 나는지 본다
  await page.evaluate(() => window.RAudio.setMuted(false));
  await sleep(400);
  check('context still running after calling everything',
    (await page.evaluate(() => window.RAudio.state())) === 'running');

  await page.close();

  /* --- ?boss=N 부팅 경로: 전투가 먼저 시작되고 오디오가 나중에 열려도 BGM 이 산다 --- */
  {
    const p2 = await browser.newPage({ viewport: { width: 960, height: 540 } });
    p2.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    p2.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await p2.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?boss=2&seed=7', { waitUntil: 'load' });
    await until(p2, () => window.__RIPOSTE && window.__RIPOSTE.getState().scene === 'FIGHT', 6000);

    // 아직 입력이 없었다 -> ctx 는 열리지 않았지만 "울려야 할 BGM" 은 기억돼 있어야 한다
    const pending = await p2.evaluate(() => ({
      state: window.RAudio.state(),
      drone: !!window.RAudio._drone,
      want: !!window.RAudio._want
    }));
    check('fight started before audio: drone request is remembered', pending.want === true,
      `(state ${pending.state}, drone ${pending.drone})`);

    await p2.keyboard.press('KeyK');            // 첫 제스처 (Enter 아님 — 게임 진행과 무관한 키)
    const revived = await until(p2, () => !!window.RAudio._drone, 4000);
    check('drone starts as soon as audio becomes ready (?boss=N boot path)', revived,
      `(state ${await p2.evaluate(() => window.RAudio.state())})`);

    check('RAudio.init() is idempotent', await p2.evaluate(() => {
      const before = window.RAudio.ctx;
      window.RAudio.init(); window.RAudio.init(); window.RAudio.init();
      return window.RAudio.ctx === before && window.RAudio.state() === 'running';
    }));
    await p2.close();
  }

  check('zero page/console errors', errors.length === 0,
    errors.length ? `\n        ${errors.slice(0, 6).join('\n        ')}` : '');

  await browser.close();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`AUDIO SMOKE FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`AUDIO SMOKE PASSED — context running, every sound path callable, 0 page errors  [${secs}s]`);
  process.exit(0);
})().catch((e) => {
  console.error('audio smoke test crashed:', e);
  process.exit(1);
});
