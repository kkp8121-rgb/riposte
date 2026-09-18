/* =============================================================================
 * RIPOSTE — tests/mash.mjs
 *
 * "패리 키를 연타하면 운이 좋으면 대부분의 보스가 그냥 깨진다" 는 사용자 보고를
 * 재현 수치로 확인하는 측정기다. 텔을 전혀 읽지 않는 순수 연타 봇 — 반드시
 * 패배해야 한다는 가설을 검증한다 (tests/bot.mjs 의 무입력 패시브 봇과 대칭점).
 *
 * 동작: 16ms 마다 KeyK 를 keydown → 다음 틱에 keyup 으로 토글한다. 이동·대시·
 * 리포스트 없음. --riposte 를 주면 손패가 있을 때 KeyJ 도 같은 방식으로 연타.
 *
 *   node tests/mash.mjs                              -> 보스 1, seed 7/11/23
 *   node tests/mash.mjs --boss=3 --seeds=7
 *   node tests/mash.mjs --all                        -> 보스 1..N x seed 7/11/23
 *   node tests/mash.mjs --all --riposte
 *   node tests/mash.mjs --all --riposte --set=PARRY.RECOVERY=0.8
 *   node tests/mash.mjs --all --expect-lose          -> VICTORY 가 하나라도 있으면 exit 1
 *
 * --set=PATH=VAL,PATH=VAL  는 FIGHT 진입 전에 window.CONFIG 의 중첩 키에 숫자를
 * 대입한다 (예: PARRY.RECOVERY=1.0). js/config.js 의 CONFIG 는 전역(window.CONFIG)
 * 이고 Object.freeze 되어 있지 않으며, 나머지 모듈은 C.PARRY.RECOVERY 처럼 매
 * 호출마다 프로퍼티를 읽으므로(값을 변수에 캐시하지 않음) 페이지 로드 뒤 아무
 * 때나 대입해도 이후 판정에 반영된다 — 실측 확인함(js/entities.js 등).
 *
 * 판단 루프는 tests/bot.mjs 와 같은 이유로 페이지 "안" 에서 돈다: 퍼펙트 패리
 * 창(0.15s) 대비 Node -> CDP 왕복이 90~170ms 라 바깥 루프로는 16ms 반응이 불가능.
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ---- CLI ------------------------------------------------------------------
 * arg() 는 접두사 이후를 통째로 잘라낸다 (--set=PARRY.RECOVERY=1.0 처럼 값 안에
 * '=' 이 또 나오는 옵션이 있어서 bot.mjs 의 split('=')[1] 로는 잘린다). */
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const prefix = `--${k}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit !== undefined ? hit.slice(prefix.length) : d;
};
const ALL = argv.includes('--all');
const RIPOSTE = argv.includes('--riposte');
const EXPECT_LOSE = argv.includes('--expect-lose');
const BOSS = parseInt(arg('boss', '1'), 10);
const SEEDS = arg('seeds', '7,11,23').split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
const TIMEOUT = parseFloat(arg('timeout', '120')) || 120;
const SET = arg('set', '');
const SET_PAIRS = SET ? SET.split(',').map((pair) => {
  const eq = pair.indexOf('=');
  return [pair.slice(0, eq), parseFloat(pair.slice(eq + 1))];
}) : [];

const VIEWPORT = { width: 960, height: 540 };
const LAUNCH_ARGS = [
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows'
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

/* =========================================================================
 * 페이지 안에서 도는 연타 루프 (이 함수 본문이 브라우저로 직렬화된다)
 * ====================================================================== */
export function installMasher(TUNE) {
  const R = window.__RIPOSTE;
  const held = Object.create(null);
  const fire = (code, down) => window.dispatchEvent(new KeyboardEvent(
    down ? 'keydown' : 'keyup', { code: code, bubbles: true, cancelable: true }));
  function setKey(code, on) {
    if (on && !held[code]) { held[code] = true; fire(code, true); }
    else if (!on && held[code]) { delete held[code]; fire(code, false); }
  }
  function releaseAll() { for (const c in held) { delete held[c]; fire(c, false); } }

  const stats = { ticks: 0 };
  let mash = false;

  function tick() {
    const s = R.getState();
    stats.ticks++;
    if (s.scene !== 'FIGHT') { releaseAll(); return; }

    mash = !mash;                         // 텔 무시 — 순수 토글 연타
    setKey('KeyK', mash);
    if (TUNE.RIPOSTE) {
      const hasHandInfo = Array.isArray(s.hand);
      setKey('KeyJ', mash && (!hasHandInfo || s.hand.length > 0));
    }
  }

  const timer = setInterval(tick, TUNE.POLL_MS);
  window.__MASH = { stats: stats, stop: function () { clearInterval(timer); releaseAll(); } };
  return true;
}

/* =========================================================================
 * 한 보스 x 시드 실행
 * ====================================================================== */
async function runOne(browser, bossNum, seed) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href +
    `?boss=${bossNum}&mute=1&seed=${seed}&story=0`;
  await page.goto(url, { waitUntil: 'load' });

  if (SET_PAIRS.length) {
    await page.evaluate((pairs) => {
      for (const [path, val] of pairs) {
        const parts = path.split('.');
        let obj = window.CONFIG;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = val;
      }
    }, SET_PAIRS);
  }

  const ready = await until(page, (s) => s.scene === 'FIGHT', 8000);
  if (!ready) {
    await page.close();
    return { ok: false, bossNum: bossNum, boss: '?', seed: seed, outcome: 'NO-FIGHT', time: 0, hits: 0, perfects: 0, errors: errors };
  }

  const meta = await page.evaluate(() => ({ name: window.__RIPOSTE.game.boss.name }));
  await page.evaluate(installMasher, { POLL_MS: 16, RIPOSTE: RIPOSTE });

  const budgetMs = TIMEOUT * 1000;
  const t0 = Date.now();
  let outcome = null;

  while (Date.now() - t0 < budgetMs) {
    const s = await page.evaluate(() => window.__RIPOSTE.getState()).catch(() => null);
    if (!s) break;
    if (s.scene === 'VICTORY') { outcome = 'VICTORY'; break; }
    if (s.scene === 'DEFEAT') { outcome = 'DEFEAT'; break; }
    await sleep(120);
  }

  await page.evaluate(() => { if (window.__MASH) window.__MASH.stop(); }).catch(() => {});
  await sleep(400);   // 승리 / 패배 카드 연출이 자리 잡은 뒤 상태를 읽는다

  const final = await page.evaluate(() => window.__RIPOSTE.getState()).catch(() => null);
  await page.close();

  return {
    ok: true,
    bossNum: bossNum,
    boss: meta.name,
    seed: seed,
    outcome: outcome || 'TIMEOUT',
    time: final ? final.time : (Date.now() - t0) / 1000,
    hits: final ? final.hits : 0,
    perfects: final ? final.perfects : 0,
    errors: errors
  };
}

async function until(page, pred, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await page.evaluate(() => window.__RIPOSTE && window.__RIPOSTE.getState()).catch(() => null);
    if (s && pred(s)) return true;
    await sleep(30);
  }
  return false;
}

/* =========================================================================
 * 진입점 — 직접 실행(node tests/mash.mjs)일 때만 돈다
 * ====================================================================== */
const IS_MAIN = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (IS_MAIN) (async () => {
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const count = await (async () => {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1', { waitUntil: 'load' });
    await until(p, (s) => !!s, 5000);
    const n = await p.evaluate(() => window.BOSSES.length);
    await p.close();
    return n;
  })();
  const bossList = ALL ? Array.from({ length: count }, (_, i) => i + 1) : [BOSS];

  log(`RIPOSTE mash test — bosses [${bossList.join(', ')}]  seeds [${SEEDS.join(', ')}]` +
    (RIPOSTE ? '  +riposte(J)' : '') + (SET_PAIRS.length ? `  set=${SET}` : ''));
  log('');

  const results = [];
  for (const n of bossList) {
    for (const seed of SEEDS) {
      const r = await runOne(browser, n, seed);
      results.push(r);
      log(
        `  BOSS ${n}  ${String(r.boss || '?').padEnd(7)}  seed=${String(seed).padEnd(3)}  ` +
        `${r.outcome.padEnd(7)}  time ${r.time.toFixed(2)}s  hits ${r.hits}  perfects ${r.perfects}`
      );
      if (r.errors && r.errors.length) log(`        page errors (${r.errors.length}): ${r.errors.slice(0, 3).join(' | ')}`);
    }
  }

  await browser.close();

  /* ---- 보스별 요약 --------------------------------------------------- */
  log('');
  log('  boss  name       win/total  avg time  avg hits');
  const byBoss = new Map();
  for (const r of results) {
    if (!byBoss.has(r.bossNum)) byBoss.set(r.bossNum, []);
    byBoss.get(r.bossNum).push(r);
  }
  let totalWins = 0;
  for (const [n, rs] of byBoss) {
    const wins = rs.filter((r) => r.outcome === 'VICTORY').length;
    totalWins += wins;
    const avgTime = rs.reduce((a, r) => a + r.time, 0) / rs.length;
    const avgHits = rs.reduce((a, r) => a + r.hits, 0) / rs.length;
    log(`  ${String(n).padEnd(4)}  ${String(rs[0].boss || '?').padEnd(9)}  ${wins}/${rs.length}       ${avgTime.toFixed(2)}s    ${avgHits.toFixed(1)}`);
  }

  log('');
  log(`MASH-SUMMARY: wins ${totalWins}/${results.length}`);

  if (EXPECT_LOSE && totalWins > 0) process.exit(1);
  process.exit(0);
})().catch((e) => {
  console.error('mash test crashed:', e);
  process.exit(1);
});
