/* =============================================================================
 * RIPOSTE — tests/bot.mjs
 *
 * 반응형 봇: window.__RIPOSTE.getState() 를 ~16ms 주기로 폴링하며 텔을 읽고
 * 패리 / 대시 / 리포스트를 입력한다. 각 보스를 par 의 4배 안에 격파해야 통과.
 * 무입력(passive) 봇은 반드시 패배해야 한다. (스펙 §8.2)
 *
 *   node tests/bot.mjs                 -> 보스 1
 *   node tests/bot.mjs --boss=3        -> 보스 3
 *   node tests/bot.mjs --all           -> 보스 1..4 순차 + 무입력 패배 검증
 *   node tests/bot.mjs --seed=7
 *
 * installBot / TUNE 은 export 되어 tools/shots.mjs 가 같은 봇으로 스크린샷을 찍는다.
 * (직접 실행할 때만 테스트 본체가 돈다 — import 해도 브라우저가 뜨지 않는다.)
 *
 * [설계 메모] 판단 루프는 페이지 "안"에서 돈다.
 *   퍼펙트 패리 창은 0.15s 인데 Node -> CDP 왕복이 이 환경에서 90~170ms 라
 *   바깥에서 16ms 주기로 반응하는 것이 물리적으로 불가능하다. 그래서 봇 루프를
 *   page 안의 setInterval(16ms) 로 넣고, 키는 게임이 실제로 듣는 것과 똑같은
 *   window keydown/keyup 이벤트로 보낸다 (js/input.js 의 입력 경로 그대로).
 *   Node 쪽은 지휘 / 판정 / 스크린샷 / 리포트만 담당한다.
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOTS = join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

/* ---- CLI ----------------------------------------------------------------- */
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const ALL = argv.includes('--all');
const BOSS = parseInt(arg('boss', '1'), 10);
const SEED = parseInt(arg('seed', '7'), 10);

const VIEWPORT = { width: 960, height: 540 };
const LAUNCH_ARGS = [
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows'
];

/* ---- 봇 튜닝 ("조작 습관" — 게임 상수와 독립) ------------------------------ */
export const TUNE = {
  POLL_MS: 16,
  PARRY_LEAD: 0.05,       // 금색 공격은 hitAt - 0.05s 에 패리
  DASH_LEAD: 0.10,        // 붉은 공격 / 존 / 붉은 투사체는 hitAt - 0.10s 에 대시
  PROJ_PARRY_DIST: 110,   // 금색 투사체는 110px 안이면 패리 사거리로 본다
  PROJ_DASH_DIST: 120,    // 붉은 투사체는 120px 안이면 대시
  PARRY_CATCH: 52,        // CONFIG.PARRY.PROJECTILE_CATCH 와 같은 값
  PROJ_HIT: 26,           // CONFIG.PROJECTILE.HIT_DIST 와 같은 값
  PARRY_COOLDOWN: 0.12,
  DASH_COOLDOWN: 0.58,
  RIPOSTE_COOLDOWN: 0.28,
  SAFE_GAP: 0.34,         // 이만큼 여유가 있어야 리포스트를 시도
  REACH_MARGIN: 0.82,
  APPROACH_MIN: 150,      // 손패가 비었을 때 이 거리보다 멀면 붙는다
  STUCK_MELEE: 2.5,       // 근접 기술이 이만큼 안 닿으면 흘려보내 큐를 돌린다
  TAP_MS: 40
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = [];
const log = (...a) => console.log(...a);

/* =========================================================================
 * 페이지 안에서 도는 봇 드라이버 (이 함수 본문이 브라우저로 직렬화된다)
 * ====================================================================== */
export function installBot(TUNE) {
  const R = window.__RIPOSTE;

  /* 손패 기술 id -> {kind, reach}. shot 은 사거리 무제한. */
  const skills = {};
  for (const k in R.game.skillTable) {
    const s = R.game.skillTable[k];
    skills[k] = { kind: s.kind, reach: s.kind === 'shot' ? Infinity : s.reach };
  }

  const held = Object.create(null);
  const fire = (code, down) => window.dispatchEvent(new KeyboardEvent(
    down ? 'keydown' : 'keyup', { code: code, bubbles: true, cancelable: true }));

  function hold(code, on) {
    if (on && !held[code]) { held[code] = true; fire(code, true); }
    else if (!on && held[code]) { delete held[code]; fire(code, false); }
  }
  function tap(code) {
    fire(code, true);
    setTimeout(function () { fire(code, false); }, TUNE.TAP_MS);
  }
  function releaseAll() { for (const c in held) { delete held[c]; fire(c, false); } }

  const stats = { parries: 0, dashes: 0, ripostes: 0, ticks: 0 };
  let lastParry = -9, lastDash = -9, lastRiposte = -9, meleeStuckSince = null;

  function tick() {
    const s = R.getState();
    stats.ticks++;
    if (s.scene !== 'FIGHT') { releaseAll(); return; }

    const now = s.time;
    const ca = s.currentAttack;
    const dist = Math.abs(s.bossX - s.playerX);
    const toBoss = s.bossX >= s.playerX ? 'ArrowRight' : 'ArrowLeft';
    const away = toBoss === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';

    /* --- 위협 수집: 가장 먼저 닿는 것부터 --------------------------------- */
    const threats = [];
    // windup 중이거나, charge 처럼 active 인데 타격 시점이 아직 앞에 있는 것만
    if (ca && (ca.stage === 'windup' || (ca.stage === 'active' && ca.hitAt > now))) {
      threats.push({ t: ca.hitAt - now, kind: ca.tell === 'gold' ? 'parry' : 'dash', src: 'attack' });
    }
    for (const z of s.zones) threats.push({ t: z.tRemain, kind: 'dash', src: 'zone' });
    for (const p of s.projectiles) {
      const dir = p.vx >= 0 ? 1 : -1;
      const gap = (s.playerX - p.x) * dir;          // 다가오는 중이면 양수
      if (gap < -40) continue;                      // 이미 지나감
      const speed = Math.abs(p.vx) || 1;
      if (p.tell === 'gold') {
        if (gap > TUNE.PROJ_PARRY_DIST + 60) continue;
        threats.push({ t: (gap - TUNE.PARRY_CATCH) / speed, kind: 'parry', src: 'proj', gap: gap });
      } else {
        if (gap > TUNE.PROJ_DASH_DIST + 80) continue;
        threats.push({ t: (gap - TUNE.PROJ_HIT) / speed, kind: 'dash', src: 'proj', gap: gap });
      }
    }
    threats.sort(function (a, b) { return a.t - b.t; });
    const th = threats[0];

    /* --- 이동 ------------------------------------------------------------ */
    // charge 는 안으로 파고들어 대시로 통과한다 (스펙 §2.4)
    const charging = ca && ca.id === 'charge';
    const front = s.hand.length ? skills[s.hand[0]] : null;
    const reach = front ? front.reach : 0;
    const inReach = front ? (reach === Infinity || dist <= reach * TUNE.REACH_MARGIN) : false;
    const needClose = charging || (front ? (reach !== Infinity && !inReach)
                                         : dist > TUNE.APPROACH_MIN);
    hold(toBoss, needClose);
    hold(away, false);

    /* --- 방어 ------------------------------------------------------------ */
    let acted = false;
    if (th && th.t > 0) {
      if (th.kind === 'parry' && th.t <= TUNE.PARRY_LEAD &&
          now - lastParry > TUNE.PARRY_COOLDOWN &&
          (th.src !== 'proj' || th.gap <= TUNE.PROJ_PARRY_DIST)) {
        tap('KeyK'); lastParry = now; stats.parries++; acted = true;
      } else if (th.kind === 'dash' && th.t <= TUNE.DASH_LEAD &&
                 now - lastDash > TUNE.DASH_COOLDOWN &&
                 (th.src !== 'proj' || th.gap <= TUNE.PROJ_DASH_DIST + 40)) {
        tap('Space'); lastDash = now; stats.dashes++; acted = true;
      }
    }

    /* --- 리포스트 -------------------------------------------------------- */
    if (!acted && s.hand.length && now - lastRiposte > TUNE.RIPOSTE_COOLDOWN) {
      const bossOpen = !ca || ca.stage === 'recover';
      const safe = !th || th.t > TUNE.SAFE_GAP;
      if (bossOpen && safe && inReach) {
        tap('KeyJ'); lastRiposte = now; stats.ripostes++; meleeStuckSince = null;
      } else if (!inReach) {
        // 근접 기술인데 계속 닿지 않으면 흘려보내 큐를 돌린다
        if (meleeStuckSince === null) meleeStuckSince = now;
        else if (now - meleeStuckSince > TUNE.STUCK_MELEE && safe && bossOpen) {
          tap('KeyJ'); lastRiposte = now; meleeStuckSince = null;
        }
      } else meleeStuckSince = null;
    }
  }

  const timer = setInterval(tick, TUNE.POLL_MS);
  window.__BOT = { stats: stats, stop: function () { clearInterval(timer); releaseAll(); } };
  return true;
}

/* =========================================================================
 * 한 보스 실행
 * ====================================================================== */
async function runBoss(browser, bossNum, { passive = false } = {}) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href +
    `?boss=${bossNum}&mute=1&seed=${SEED}`;
  await page.goto(url, { waitUntil: 'load' });

  const ready = await until(page, (s) => s.scene === 'FIGHT', 8000);
  if (!ready) {
    await page.close();
    return { ok: false, outcome: 'NO-FIGHT', elapsed: 0, par: 1, errors };
  }

  const meta = await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    return { name: g.boss.name, par: g.boss.par, maxHp: g.boss.maxHp };
  });

  if (!passive) await page.evaluate(installBot, TUNE);

  const budgetMs = passive ? 60000 : meta.par * 4 * 1000;
  const t0 = Date.now();
  let outcome = null, shotSeq = 0, nextShotAt = 2500;

  while (Date.now() - t0 < budgetMs) {
    const s = await page.evaluate(() => window.__RIPOSTE.getState()).catch(() => null);
    if (!s) break;
    if (s.scene === 'VICTORY') { outcome = 'VICTORY'; break; }
    if (s.scene === 'DEFEAT') { outcome = 'DEFEAT'; break; }

    if (Date.now() - t0 > nextShotAt) {
      nextShotAt += 9000;
      await page.screenshot({
        path: join(SHOTS, `bot-b${bossNum}${passive ? '-passive' : ''}-${shotSeq++}.png`)
      });
    }
    await sleep(120);
  }

  const stats = passive ? null
    : await page.evaluate(() => { window.__BOT.stop(); return window.__BOT.stats; }).catch(() => null);

  await sleep(900);   // 승리 / 패배 카드 연출이 자리 잡은 뒤 찍는다
  const final = await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    return { state: g.getState(), result: g.result || g.lastResult || null };
  }).catch(() => ({ state: null, result: null }));

  await page.screenshot({ path: join(SHOTS, `bot-b${bossNum}${passive ? '-passive' : ''}-final.png`) });
  await page.close();

  return {
    ok: true,
    outcome: outcome || (final.state ? final.state.scene : 'TIMEOUT'),
    elapsed: (Date.now() - t0) / 1000,
    boss: meta.name,
    par: meta.par,
    result: final.result,
    stats: stats,
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
 * 진입점 — 직접 실행(node tests/bot.mjs)일 때만 돈다
 * ====================================================================== */
const IS_MAIN = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (IS_MAIN) (async () => {
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  const list = ALL ? [1, 2, 3, 4] : [BOSS];

  log(`RIPOSTE bot test — bosses [${list.join(', ')}]  seed=${SEED}`);
  log('');

  for (const n of list) {
    const r = await runBoss(browser, n);
    const res = r.result || {};
    const won = r.outcome === 'VICTORY';
    const withinBudget = won && r.elapsed <= r.par * 4;

    log(
      `  BOSS ${n}  ${String(r.boss || '?').padEnd(7)}  ` +
      `${won ? 'VICTORY' : String(r.outcome).padEnd(7)}  ` +
      `time ${(res.time ?? r.elapsed).toFixed(2)}s (par ${r.par}s)  ` +
      `hits ${res.hits ?? '?'}  perfects ${res.perfects ?? '?'}  rank ${res.rank ?? '-'}` +
      (r.stats ? `   [parry ${r.stats.parries} dash ${r.stats.dashes} riposte ${r.stats.ripostes}]` : '')
    );
    if (r.errors && r.errors.length) {
      log(`        page errors (${r.errors.length}): ${r.errors.slice(0, 3).join(' | ')}`);
      fail.push(`boss ${n} page errors`);
    }
    if (!won) fail.push(`boss ${n} did not win (${r.outcome})`);
    else if (!withinBudget) fail.push(`boss ${n} exceeded 4x par (${r.elapsed.toFixed(1)}s > ${r.par * 4}s)`);
    else if (res.time > r.par * 2) log(`        NOTE: balance — bot time ${res.time.toFixed(1)}s > 2x par (too slow)`);
    else if (res.time < r.par / 3) log(`        NOTE: balance — bot time ${res.time.toFixed(1)}s < par/3 (par is generous for optimal play)`);
  }

  // 무입력 봇은 반드시 진다 (위협이 실재함을 증명)
  log('');
  const pas = await runBoss(browser, list[0], { passive: true });
  log(`  PASSIVE (no input) on boss ${list[0]}  ->  ${pas.outcome}  after ${pas.elapsed.toFixed(1)}s`);
  if (pas.outcome !== 'DEFEAT') fail.push('passive bot did not lose');
  if (pas.errors && pas.errors.length) fail.push('passive run page errors');

  await browser.close();

  log('');
  if (fail.length) {
    log(`BOT FAILED (${fail.length}): ${fail.join('; ')}`);
    process.exit(1);
  }
  log('BOT PASSED — every boss beaten by the reactive bot, passive bot defeated, 0 page errors');
  process.exit(0);
})().catch((e) => {
  console.error('bot test crashed:', e);
  process.exit(1);
});
