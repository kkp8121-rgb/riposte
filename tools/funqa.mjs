/* =============================================================================
 * RIPOSTE — tools/funqa.mjs
 * Task 16.5 Step 1·2(metrics 부분) — "재미 QA" 계측 도구.
 *
 * 재미 자체는 기계가 못 잰다. 이 도구는 재미를 "해치는" 신호만 잰다 —
 * 억울한 피격(텔 없이 맞음) · 같은 원천 연속 피격 · 죽은 시간 · 사망 원인 쏠림 ·
 * 실력 변별(숙련 대 평균) · 결정 밀도 · 패턴 반복. 사람 플레이테스트(G8)가
 * 어디를 봐야 하는지 좁히는 용도다 — 판정기가 아니다.
 *
 * 게임 코드(js/)·기존 테스트는 한 줄도 건드리지 않는다. tests/bot.mjs 의
 * installBot·TUNE 을 그대로 가져다 쓰고(tools/shots.mjs 선례), 페이지 "안"에서
 * Boss.prototype.flash · FX.tellBurst · Game.prototype.spawnProjectile ·
 * Game.prototype.damagePlayer 를 감싸 계측한다(원 함수는 항상 그대로 부른다 —
 * 게임 동작에 영향을 주지 않는다).
 *
 *   node tools/funqa.mjs --bosses=1-12 --seeds=7,11,23 --profile=skilled --out=docs/qa/funqa-2026-09-23.skilled.json
 *   node tools/funqa.mjs --bosses=1-12 --seeds=7,11,23 --profile=average --out=docs/qa/funqa-2026-09-23.average.json
 *
 * 🔴 브라우저 측정은 언제나 하나씩(직렬) — 이 도구 자체도 보스×시드를 순차로 돈다.
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { installBot, TUNE as BASE_TUNE } from '../tests/bot.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- CLI ------------------------------------------------------------------ */
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};

function parseRangeList(s, max) {
  // "1-12" | "5,7,9" | "1-4,7,9-12" -> [1,2,3,4,7,9,10,11,12]
  const out = [];
  for (const part of s.split(',')) {
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      for (let i = a; i <= b; i++) out.push(i);
    } else if (part.trim()) {
      out.push(parseInt(part.trim(), 10));
    }
  }
  return out.filter((n) => Number.isFinite(n) && n >= 1 && (!max || n <= max));
}

const BOSSES_ARG = arg('bosses', '1-12');
const SEEDS = arg('seeds', '7,11,23').split(',').map((s) => parseInt(s.trim(), 10));
const PROFILE = arg('profile', 'skilled');
const OUT = arg('out', join(ROOT, 'docs', 'qa', `funqa-run.${PROFILE}.json`));

const PROFILES = {
  perfect: { jitter: 0, miss: 0, think: 0 },
  skilled: { jitter: 0.05, miss: 0.15, think: 0.25 },
  average: { miss: 0.3, jitter: 0.09, think: 0.45 }
};
if (!PROFILES[PROFILE]) {
  console.error(`unknown --profile=${PROFILE} (skilled|average|perfect)`);
  process.exit(1);
}

const VIEWPORT = { width: 960, height: 540 };
const LAUNCH_ARGS = [
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows'
];

/* =========================================================================
 * 페이지 안에서 도는 계측기 (이 함수 본문이 브라우저로 직렬화된다)
 * 원 함수는 항상 apply 로 그대로 호출한다 — 게임 동작·판정에는 손대지 않는다.
 * ====================================================================== */
function installQA() {
  const R = window.__RIPOSTE;
  const Q = (window.__QA = {
    flashes: [],      // 첫 텔(윈드업 시작) — Boss.prototype.flash
    bursts: [],        // 텔 버스트 전부(첫 텔 경유분 포함 + 두 번째 텔: 부메랑 턴·협공 뒤·표식 부착·메아리·빔 자리)
    spawns: [],         // 투사체 생성(보스 소유만) — 생성 시각·거리
    hits: [],            // 피격
    firstSeen: [],        // 빔·기둥·표식·메아리 최초 등장(개수 증가 시점, 봇과 같은 16ms 주기 폴링)
    patternLog: [],        // patternName 이 바뀔 때만 기록 — 선택된 패턴 시퀀스
    ticks: []                // {t, empty} — 죽은 시간 계산용
  });

  // flash() 가 tellBurst 를 내부에서 부르는 동안만 label 을 채운다 — 그 버스트가
  // "이 공격의 첫 텔"임을 표시한다. 다른 6곳(부메랑 턴·협공 뒤·표식 부착·메아리·빔 자리)은
  // flash() 밖에서 불리므로 label 이 null 로 남는다(그 자체가 유효한 신호라 걸러내지 않는다) —
  // "가장 최근 같은 색 버스트" 매칭이 마침 겹친 **다른 공격**의 새 플래시를 집어가는 오탐을 막는다
  // (실측: ADAMANT far-shards-close-guard 에서 SHARDS 2 발째가 날아가는 중에 GUARD 가 곧바로
  // flash 해 그 gold 가 더 최근이라 잘못 골랐다 — 문서 참고).
  let currentFlashLabel = null;
  const origFlash = Boss.prototype.flash;
  Boss.prototype.flash = function (tell) {
    const a = this.attack;
    currentFlashLabel = a ? (a.def.label || a.def.id) : null;
    Q.flashes.push({
      t: this.game.time, tell: tell,
      attackId: a ? a.id : null,
      attackKind: a ? a.def.kind : null,
      attackLabel: currentFlashLabel,
      bossX: this.x
    });
    const ret = origFlash.apply(this, arguments);
    currentFlashLabel = null;
    return ret;
  };

  const origBurst = FX.tellBurst;
  FX.tellBurst = function (x, y, color, shape) {
    Q.bursts.push({ t: R.game.time, x: x, y: y, tell: shape === 'red' ? 'red' : 'gold', label: currentFlashLabel });
    return origBurst.apply(this, arguments);
  };

  const origSpawn = Game.prototype.spawnProjectile;
  Game.prototype.spawnProjectile = function (p) {
    if (p.owner === 'boss') {
      Q.spawns.push({
        t: this.time, x: p.x, vx: p.vx, tell: p.tell,
        boomerang: !!p.boomerang, fromBehind: !!p.fromBehind,
        label: p.label || null, playerX: this.player.x, dist: Math.abs(p.x - this.player.x)
      });
    }
    return origSpawn.apply(this, arguments);
  };

  const origDamage = Game.prototype.damagePlayer;
  Game.prototype.damagePlayer = function (dmg, fromX, extraPush, src) {
    const b = this.boss;
    Q.hits.push({
      t: this.time, dmg: dmg,
      label: src ? (src.label || '?') : '?',
      tell: src ? src.tell : null,
      kind: src ? src.kind : null,
      playerX: this.player.x, bossX: b ? b.x : null,
      bossState: b ? b.state : null, phase: b ? b.phase : null
    });
    return origDamage.apply(this, arguments);
  };

  /* 봇과 같은 주기(16ms)로 도는 독립 폴러 — world-first-seen · 죽은 시간 · 패턴 시퀀스.
   * 개수가 늘 때만 "새로 나타났다"로 본다(움직이는 빔을 좌표로 추적하면 프레임 흔들림에
   * 오탐한다 — 개수 기반이 더 튼튼하다). */
  const prevCount = { beam: 0, pillar: 0, mark: 0, echo: 0 };
  function trackFirstSeen(list, kind, t) {
    const n = list.length, prev = prevCount[kind];
    if (n > prev) {
      for (let i = 0; i < n - prev; i++) {
        const e = list[list.length - 1 - i];
        // 표식은 금·적 두 색이 한 번에 같이 있을 수 있다(HOLLOW P2 brand+brand-red) — tell 을
        // 같이 기록해 매칭에서 색이 다른 표식을 걸러낸다(실측: 안 그러면 다른 색 표식의 부착을
        // 이 표식의 텔로 잘못 고른다 — 문서 참고). 빔·기둥은 항상 red 하나뿐이라 안 필요하다.
        Q.firstSeen.push({ t: t, kind: kind, x: e ? e.x : null, tell: (kind === 'mark' && e) ? e.tell : null });
      }
    }
    prevCount[kind] = n;
  }

  let lastPattern = null;
  const timer = setInterval(function () {
    const s = R.getState();
    if (s.scene !== 'FIGHT') return;
    trackFirstSeen(s.beams, 'beam', s.time);
    trackFirstSeen(s.pillars, 'pillar', s.time);
    trackFirstSeen(s.marks, 'mark', s.time);
    trackFirstSeen(s.echoes, 'echo', s.time);

    const pn = R.game.boss ? R.game.boss.patternName : null;
    if (pn !== lastPattern) { Q.patternLog.push({ t: s.time, name: pn }); lastPattern = pn; }

    const empty = !s.currentAttack && s.projectiles.length === 0 && s.zones.length === 0 &&
      s.beams.length === 0 && s.pillars.length === 0 && s.marks.length === 0 && s.echoes.length === 0;
    Q.ticks.push({ t: s.time, empty: empty });
  }, 16);

  window.__QA_STOP = function () { clearInterval(timer); };
  return true;
}

/* =========================================================================
 * Node 쪽 후처리 — 수집한 원시 이벤트에서 지표를 뽑는다 (매칭 규칙은 브리프·보고서 참고)
 * ====================================================================== */

/**
 * 피격이 "보였다"고 볼 시각을 찾는다.
 *  - beam·pillar·mark: 그 종류가 세계에 처음 나타난(개수가 는) 가장 최근 시각.
 *    (spawnBeam/spawnPillar 는 windup 시작 flash 와 같은 스텝, spawnMark 는 부착 버스트와
 *    같은 스텝이라 first-seen == 그 텔이 실제로 뜬 순간이다.)
 *  - 그 외(투사체·존·근접·메아리·부메랑·협공·반격 자세 벌 등): 피격 직전, 같은 색(금/적)
 *    텔 버스트 중 가장 최근 것. FX.tellBurst 는 6곳(첫 텔·부메랑 턴·협공 뒤·표식 부착·
 *    메아리·빔 자리)에서 전부 불리므로 "가장 최근" 이 곧 그 피격에 실제로 대응하는 텔이다
 *    (부메랑 귀환처럼 같은 투사체가 도중에 새 텔을 받는 경우도 이걸로 자연히 잡힌다).
 *    버스트는 "이 공격 자신의 첫 텔"(label 있음)과 "두 번째 텔"(label 없음 — 부메랑 턴·협공
 *    뒤·표식 부착·메아리·빔 자리) 두 종류다. label 이 있는데 이 피격의 label 과 다르면 후보에서
 *    뺀다 — 아니면 "가장 최근"이 **같은 색으로 우연히 겹친 다른 공격의 새 플래시**를 집어가는
 *    오탐이 난다(실측: ADAMANT far-shards-close-guard 에서 SHARDS 2 발째가 날아가는 중에 GUARD 가
 *    곧바로 flash 해 그 gold 가 더 최근이라 잘못 골랐다 — 라벨 없는 진짜 신호(SHARDS 첫 플래시)는
 *    1.35s 전이었다. LANTERN 도 같은 모양으로 flicker 가 겹쳤다. 문서 참고).
 *    표식은 색이 둘 있을 수 있어(HOLLOW P2 brand+brand-red 동시) first-seen 도 tell 로 거른다
 *    (실측: 안 그러면 다른 색 표식의 부착을 이 표식의 텔로 잘못 고른다).
 *    알려진 한계: 악보(score) 2~4 번째 타격은 설계상 새 텔이 없다(외워서 받는다) — 이때는
 *    그 악보 전체의 첫 플래시까지 거슬러 올라가 "오래전에 보였다"로 잡혀 unreactable 로
 *    플래그되지 않는다. 이건 매칭 규칙의 결함이 아니라 봇이 못 재는 축이다(문서 참고).
 */
function findVisibleAt(hit, Q) {
  if (hit.kind === 'beam' || hit.kind === 'pillar' || hit.kind === 'mark') {
    const cands = Q.firstSeen.filter((e) => e.kind === hit.kind && e.t < hit.t &&
      (e.tell === null || e.tell === hit.tell));
    return cands.length ? cands[cands.length - 1].t : null;
  }
  if (hit.tell !== 'gold' && hit.tell !== 'red') return null;
  // 알려진 한계: label 없는 버스트(부메랑 턴·협공 뒤·표식 부착·메아리·빔 자리)는 이 피격의
  // label 과 무관하게 후보로 받아준다 — 그래서 this.attack 과 무관하게 살아있는 동시 위험
  // (다른 표식·기둥·빔·메아리)이 우연히 같은 색으로 새 텔을 내면 그게 "가장 최근"으로 골라져
  // 실제 텔보다 늦게 잡히고 반응 시간이 과소 보고될 수 있다.
  const cands = Q.bursts.filter((b) => b.tell === hit.tell && b.t < hit.t && hit.t - b.t <= 5.0 &&
    (b.label === null || b.label === undefined || b.label === hit.label));
  return cands.length ? cands[cands.length - 1].t : null;
}

function computeMetrics(Q, fightTime, minWindup) {
  const hits = Q.hits.slice().sort((a, b) => a.t - b.t);

  // 억울한 피격
  const unreactable = [];
  const unmatched = [];
  for (const h of hits) {
    const vis = findVisibleAt(h, Q);
    if (vis === null) { unmatched.push(h); continue; }
    const reaction = h.t - vis;
    if (reaction < minWindup) unreactable.push({ ...h, visibleAt: vis, reaction });
  }

  // 같은 원천 1초 안 연속 피격
  const sameSourceRepeats = [];
  for (let i = 1; i < hits.length; i++) {
    if (hits[i].label === hits[i - 1].label && hits[i].t - hits[i - 1].t <= 1.0) {
      sameSourceRepeats.push({ label: hits[i].label, t1: hits[i - 1].t, t2: hits[i].t, gap: hits[i].t - hits[i - 1].t });
    }
  }

  // 죽은 시간 비율 — empty 구간이 1.5s 를 넘는 스트레치만 합산
  const ticks = Q.ticks;
  let deadSum = 0, runStart = null, prevT = null;
  for (const tk of ticks) {
    if (tk.empty) {
      if (runStart === null) runStart = tk.t;
      prevT = tk.t;
    } else {
      if (runStart !== null) {
        const dur = prevT - runStart;
        if (dur > 1.5) deadSum += dur;
        runStart = null;
      }
    }
  }
  if (runStart !== null && prevT !== null) {
    const dur = prevT - runStart;
    if (dur > 1.5) deadSum += dur;
  }
  const deadTimeRatio = fightTime > 0 ? deadSum / fightTime : 0;

  // 사망 원인 쏠림
  const labelCounts = {};
  for (const h of hits) labelCounts[h.label] = (labelCounts[h.label] || 0) + 1;
  let topLabel = null, topShare = 0;
  for (const k in labelCounts) {
    const share = labelCounts[k] / hits.length;
    if (share > topShare) { topShare = share; topLabel = k; }
  }
  const deathCauseFlag = hits.length > 0 && topShare > 0.6;

  // 결정 밀도 · 패턴 반복
  const decisionDensity = fightTime > 0
    ? (Q.flashes.length + Q.spawns.length + Q.firstSeen.length) / fightTime : 0;
  const patternSeq = Q.patternLog.filter((p) => p.name !== null);
  let repeats = 0;
  for (let i = 1; i < patternSeq.length; i++) if (patternSeq[i].name === patternSeq[i - 1].name) repeats++;
  const patternRepeatRate = patternSeq.length > 1 ? repeats / (patternSeq.length - 1) : 0;

  return {
    unreactableHits: unreactable,
    unmatchedHits: unmatched,
    sameSourceRepeats,
    deadTimeRatio,
    labelCounts, topLabel, topShare, deathCauseFlag,
    decisionDensity,
    patternSeq: patternSeq.map((p) => p.name),
    patternRepeatRate
  };
}

/* =========================================================================
 * 한 보스×시드 실행
 * ====================================================================== */
async function until(page, pred, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await page.evaluate(() => window.__RIPOSTE && window.__RIPOSTE.getState()).catch(() => null);
    if (s && pred(s)) return true;
    await sleep(30);
  }
  return false;
}

async function runOne(browser, bossNum, seed, minWindup) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  const url = pathToFileURL(join(ROOT, 'index.html')).href + `?boss=${bossNum}&story=0&mute=1&seed=${seed}`;
  await page.goto(url, { waitUntil: 'load' });

  const ready = await until(page, (s) => s.scene === 'FIGHT', 8000);
  if (!ready) { await page.close(); return { ok: false, boss: bossNum, seed, outcome: 'NO-FIGHT', errors }; }

  const meta = await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    return { name: g.boss.name, par: g.boss.par };
  });

  await page.evaluate(installQA);
  const tuneCfg = PROFILES[PROFILE];
  const tune = Object.assign({}, BASE_TUNE, {
    SEED: seed, JITTER: tuneCfg.jitter || 0, MISS: tuneCfg.miss || 0, THINK: tuneCfg.think || 0
  });
  await page.evaluate(installBot, tune);

  const budgetMs = meta.par * 4 * 1000;
  const t0 = Date.now();
  let outcome = null;
  while (Date.now() - t0 < budgetMs) {
    const s = await page.evaluate(() => window.__RIPOSTE.getState()).catch(() => null);
    if (!s) break;
    if (s.scene === 'VICTORY') { outcome = 'VICTORY'; break; }
    if (s.scene === 'DEFEAT') { outcome = 'DEFEAT'; break; }
    await sleep(150);
  }

  await page.evaluate(() => { if (window.__BOT) window.__BOT.stop(); if (window.__QA_STOP) window.__QA_STOP(); }).catch(() => {});
  await sleep(200);

  const final = await page.evaluate(() => {
    const g = window.__RIPOSTE.game;
    return { state: g.getState(), result: g.result || g.lastResult || null, Q: window.__QA };
  }).catch(() => ({ state: null, result: null, Q: null }));

  await page.close();

  const Q = final.Q || { flashes: [], bursts: [], spawns: [], hits: [], firstSeen: [], patternLog: [], ticks: [] };
  const fightTime = (final.result && final.result.time) || (final.state && final.state.time) || 0;
  const metrics = computeMetrics(Q, fightTime, minWindup);

  return {
    ok: true, boss: bossNum, bossName: meta.name, seed, profile: PROFILE,
    outcome: outcome || (final.state ? final.state.scene : 'TIMEOUT'),
    par: meta.par,
    time: fightTime,
    hits: final.result ? final.result.hits : null,
    perfects: final.result ? final.result.perfects : null,
    rank: final.result ? final.result.rank : null,
    slainBy: final.result ? final.result.slainBy : null,
    errors,
    metrics
  };
}

/* =========================================================================
 * 진입점
 * ====================================================================== */
(async () => {
  const bosses = parseRangeList(BOSSES_ARG);
  console.log(`RIPOSTE funqa — bosses [${bosses.join(', ')}]  seeds [${SEEDS.join(', ')}]  profile=${PROFILE}`);
  console.log('');

  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });

  // 페이지 안 상수(MIN_WINDUP) 를 한 번 읽어 온다 — 하드코딩하지 않는다
  const probe = await browser.newPage();
  await probe.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1', { waitUntil: 'load' });
  await until(probe, (s) => !!s, 5000);
  const minWindup = await probe.evaluate(() => window.__RIPOSTE.CONFIG.BOSS.MIN_WINDUP);
  await probe.close();
  console.log(`C.BOSS.MIN_WINDUP = ${minWindup}s\n`);

  const runs = [];
  for (const boss of bosses) {
    for (const seed of SEEDS) {
      const r = await runOne(browser, boss, seed, minWindup);
      runs.push(r);
      const m = r.metrics || {};
      const flags = [];
      if (m.unreactableHits && m.unreactableHits.length) flags.push(`억울한피격x${m.unreactableHits.length}`);
      if (m.unmatchedHits && m.unmatchedHits.length) flags.push(`미매칭x${m.unmatchedHits.length}`);
      if (m.sameSourceRepeats && m.sameSourceRepeats.length) flags.push(`연속피격x${m.sameSourceRepeats.length}`);
      if (m.deathCauseFlag) flags.push(`쏠림:${m.topLabel}(${(m.topShare * 100).toFixed(0)}%)`);
      console.log(
        `  BOSS ${String(boss).padStart(2)} ${String(r.bossName || '?').padEnd(8)} seed=${seed}  ` +
        `${r.outcome.padEnd(7)}  t=${(r.time || 0).toFixed(1)}s hits=${r.hits ?? '?'} perfects=${r.perfects ?? '?'}  ` +
        `dead=${((m.deadTimeRatio || 0) * 100).toFixed(0)}%  dens=${(m.decisionDensity || 0).toFixed(2)}/s  ` +
        `patRep=${((m.patternRepeatRate || 0) * 100).toFixed(0)}%` +
        (flags.length ? `  [${flags.join(' ')}]` : '')
      );
      if (r.errors && r.errors.length) console.log(`        page errors (${r.errors.length}): ${r.errors.slice(0, 3).join(' | ')}`);
    }
  }

  await browser.close();

  // 보스별 롤업 (3시드 합)
  const byBoss = bosses.map((boss) => {
    const rs = runs.filter((r) => r.boss === boss);
    const wins = rs.filter((r) => r.outcome === 'VICTORY').length;
    const allHits = rs.flatMap((r) => (r.metrics ? Object.entries(r.metrics.labelCounts || {}) : []));
    const pooled = {};
    for (const [label, n] of allHits) pooled[label] = (pooled[label] || 0) + n;
    const totalHits = Object.values(pooled).reduce((a, b) => a + b, 0);
    let topLabel = null, topShare = 0;
    for (const k in pooled) { const s = pooled[k] / totalHits; if (s > topShare) { topShare = s; topLabel = k; } }
    return {
      boss, bossName: rs[0] ? rs[0].bossName : null,
      winRate: `${wins}/${rs.length}`,
      avgTime: rs.reduce((a, r) => a + (r.time || 0), 0) / rs.length,
      avgHits: rs.reduce((a, r) => a + (r.hits || 0), 0) / rs.length,
      avgDeadTimeRatio: rs.reduce((a, r) => a + (r.metrics ? r.metrics.deadTimeRatio : 0), 0) / rs.length,
      avgDecisionDensity: rs.reduce((a, r) => a + (r.metrics ? r.metrics.decisionDensity : 0), 0) / rs.length,
      avgPatternRepeatRate: rs.reduce((a, r) => a + (r.metrics ? r.metrics.patternRepeatRate : 0), 0) / rs.length,
      pooledLabelCounts: pooled, pooledTopLabel: topLabel, pooledTopShare: topShare,
      pooledDeathCauseFlag: totalHits > 0 && topShare > 0.6,
      unreactableHitCount: rs.reduce((a, r) => a + (r.metrics ? r.metrics.unreactableHits.length : 0), 0),
      unmatchedHitCount: rs.reduce((a, r) => a + (r.metrics ? r.metrics.unmatchedHits.length : 0), 0),
      sameSourceRepeatCount: rs.reduce((a, r) => a + (r.metrics ? r.metrics.sameSourceRepeats.length : 0), 0)
    };
  });

  console.log('\n-- 보스별 롤업 (3시드) -------------------------------------------------');
  for (const b of byBoss) {
    console.log(
      `  ${String(b.boss).padStart(2)} ${String(b.bossName || '?').padEnd(8)} win=${b.winRate}  ` +
      `avgHits=${b.avgHits.toFixed(1)}  dead=${(b.avgDeadTimeRatio * 100).toFixed(0)}%  ` +
      `dens=${b.avgDecisionDensity.toFixed(2)}/s  patRep=${(b.avgPatternRepeatRate * 100).toFixed(0)}%  ` +
      `쏠림=${b.pooledTopLabel || '-'}(${(b.pooledTopShare * 100).toFixed(0)}%)${b.pooledDeathCauseFlag ? ' ⚠' : ''}  ` +
      `억울=${b.unreactableHitCount}  미매칭=${b.unmatchedHitCount}  연속=${b.sameSourceRepeatCount}`
    );
  }

  const out = { profile: PROFILE, seeds: SEEDS, bosses, minWindup, generatedAt: new Date().toISOString(), runs, byBoss };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\nJSON -> ${OUT}`);
  process.exit(0);
})().catch((e) => {
  console.error('funqa crashed:', e);
  process.exit(1);
});
