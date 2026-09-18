/* =============================================================================
 * RIPOSTE — tests/state.mjs
 *
 * 보스 정의 테이블(window.BOSSES)은 불변이어야 한다.
 *
 * 회귀 방지 대상: 패턴 실행기가 스텝 객체(정의 테이블의 원본)를 공격 옵션으로
 * 그대로 넘기고 접근(approach)이 끝날 때 그 객체에 `_approached = true` 를 찍던
 * 버그. entry.steps.slice() 는 얕은 복사라 원본 스텝이 영구 오염되고,
 * 그 뒤로는 그 스텝이 두 번 다시 접근하지 않아 근접 공격이 허공을 벤다
 * (Vesper slash 가 285px 에서 헛침). R 재시작 · 다음 보스 · ?seed 결정론이 모두 깨진다.
 *
 * 검증: 각 보스의 전투를 끝까지 굴린 뒤 JSON.stringify(window.BOSSES) 가
 *       부팅 직후와 완전히 동일한지 본다.
 *
 * STORY 장면 실행은 smoke 가 맡고, 여기서는 테이블 직렬화 불변만 본다
 * (`?boss=N` 진입은 noStory 라 STORY 코드 자체가 실행되지 않는다 — 설계).
 *
 *   node tests/state.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SPEED = 4;            // setTimeScale — 전투를 빨리 굴린다 (판정 로직은 그대로)
const FIGHT_TIMEOUT = 40000;

const failures = [];
const t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}

/** 정의 테이블 스냅샷 — 함수는 JSON 에 안 실리므로 키 목록도 같이 찍는다. 대사 테이블도 불변이다. */
const snapshot = () => JSON.stringify({
  defs: window.BOSSES,
  shape: window.BOSSES.map((b) => Object.keys(b).sort().join(',')),
  story: window.STORY
});

async function until(page, fn, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return true;
    await sleep(60);
  }
  return false;
}

async function runBoss(browser, n) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href + `?boss=${n}&mute=1&seed=7`;
  await page.goto(url, { waitUntil: 'load' });
  await until(page, () => !!window.__RIPOSTE, 5000);

  const before = await page.evaluate(snapshot);
  await page.evaluate((s) => window.__RIPOSTE.setTimeScale(s), SPEED);

  // 손패를 심어 두면 약탈 보스(AVARICE)의 loot 큐와 {mirror:'loot'} 가 실데이터로 돈다 — 그래야 뒤의 불변 비교가 의미를 갖는다
  await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    Object.keys(g.skillTable).slice(0, 3).forEach((k) => g.player.pushHand(g.skillTable[k]));
  });

  // 무입력으로 전투를 끝까지 굴린다 (approach / 패턴 실행기를 충분히 돌린다)
  const ended = await until(page,
    () => ['DEFEAT', 'VICTORY', 'ENDING'].indexOf(window.__RIPOSTE.getState().scene) >= 0,
    FIGHT_TIMEOUT);

  const after = await page.evaluate(snapshot);
  const state = await page.evaluate(() => window.__RIPOSTE.getState());
  await page.close();

  return { before, after, ended, scene: state.scene, errors };
}

(async () => {
  console.log('RIPOSTE state test — boss definition tables must stay immutable');
  const browser = await chromium.launch({ headless: true });

  const count = await (async () => {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1', { waitUntil: 'load' });
    await until(p, () => !!window.__RIPOSTE, 5000);
    const n = await p.evaluate(() => window.BOSSES.length);
    const inChapters = await p.evaluate(() => window.CONFIG.CHAPTERS.reduce((a, ch) => a + ch.bosses.length, 0));
    await p.close();
    return { n, inChapters };
  })().then((r) => {
    // 등록 보스 수 = CHAPTERS 총합 (정합성) — 숫자를 박지 않는다. 엔딩 위치는 이 길이로 정해진다
    check('BOSSES matches CHAPTERS total', r.n === r.inChapters, `(BOSSES ${r.n}, CHAPTERS ${r.inChapters})`);
    return r.n;
  });

  for (let n = 1; n <= count; n++) {
    const r = await runBoss(browser, n);
    check(`boss ${n}: fight reached an end scene`, r.ended, `(scene ${r.scene})`);

    let detail = '';
    if (r.before !== r.after) {
      // 첫 차이 지점을 뽑아 보여 준다
      let i = 0;
      while (i < r.before.length && i < r.after.length && r.before[i] === r.after[i]) i++;
      detail = `\n        before: ...${r.before.slice(Math.max(0, i - 70), i + 70)}` +
               `\n        after : ...${r.after.slice(Math.max(0, i - 70), i + 70)}`;
    }
    check(`boss ${n}: window.BOSSES / window.STORY unchanged after a full fight`, r.before === r.after, detail);
    check(`boss ${n}: zero page/console errors`, r.errors.length === 0,
      r.errors.length ? r.errors.slice(0, 3).join(' | ') : '');
  }

  await browser.close();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  if (failures.length) {
    console.log(`STATE FAILED (${failures.length}): ${failures.join(', ')}  [${secs}s]`);
    process.exit(1);
  }
  console.log(`STATE PASSED — boss & story definitions immutable across all ${count} fights  [${secs}s]`);
  process.exit(0);
})().catch((e) => {
  console.error('state test crashed:', e);
  process.exit(1);
});
