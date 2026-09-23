/* =============================================================================
 * RIPOSTE — tests/motions.mjs
 * 새 공격 동작 단위 검증 (스펙 docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md §3).
 * 메인 루프를 멈추고(g.speed = 0) 합성 보스 하나로 월드를 직접 민다 —
 * 봇·패턴 선택·프레임 페이싱과 무관하게 "동작이 약속대로 움직이는가"만 본다.
 *
 *   node tests/motions.mjs
 * ========================================================================== */
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!cond) failures.push(name);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?boss=1&story=0&mute=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__RIPOSTE && window.__RIPOSTE.getState().scene === 'FIGHT', null, { timeout: 8000 });

/* ---- 하네스 (페이지 안) --------------------------------------------------- */
await page.evaluate(() => {
  const g = window.__RIPOSTE.game, C = window.CONFIG, DT = C.LOOP.FIXED_DT;
  g.speed = 0;                                   // 메인 루프 정지 — 이 테스트가 직접 스텝을 민다
  window.__T = {
    DT,
    /* 합성 보스 — attacks 만 바꿔 끼운다. 패턴은 "오래 기다리기" 하나라 스스로 공격하지 않는다 */
    setup(attacks, px, bx, extra) {
      const def = Object.assign({
        key: 'test', name: 'TEST', title: 'T', color: '#ffffff', silhouette: 'player',
        hp: 999, par: 60, prefer: { close: 100, far: 400, back: 200 },
        attacks, patterns: { 1: [{ name: 'idle', steps: [{ wait: 99 }] }] }
      }, extra || {});
      g.clearWorld();
      g.player.hardReset();
      g.player.x = px;
      g.boss = new window.Boss(def, g);
      g.boss.x = bx;
      g.boss.state = 'wait'; g.boss.stateT = 99;
      g.hits = 0; g.ko = null; g.koT = 0; g.time = 0; g.lastHitBy = null;
      return def;
    },
    attack(id) { g.boss.beginAttack(id, { _approached: true }); },
    /* sec 초만큼 고정 스텝. each(g, t) 가 매 스텝 전에 불린다(입력 흉내). axis 는 이동 입력(-1/0/1) */
    run(sec, each, axis) {
      const n = Math.round(sec / DT);
      for (let i = 0; i < n; i++) {
        if (each) each(g, g.time);
        g.time += DT;
        g.stepWorld(DT, axis || 0, false);
      }
    }
  };
});

/* ---- 골격 (Task 2) -------------------------------------------------------- */
const base = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  out.hasMotions = typeof window.MOTIONS === 'object';
  const s = g.getState();
  out.fields = ['beams', 'pillars', 'marks', 'echoes'].every((k) => Array.isArray(s[k]));

  /* clearWorld 는 새 배열도 비운다 (Review Focus 1 — R 재도전·다음 보스에 표식·기둥이 남지 않게) */
  const dummy = { update() {}, dead: false };
  g.beams.push(dummy); g.pillars.push(dummy); g.marks.push(dummy); g.echoes.push(dummy);
  g.clearWorld();
  out.cleared = g.beams.length + g.pillars.length + g.marks.length + g.echoes.length === 0;

  /* 기존 reflect() 는 인자 없이 속도를 뒤집는다 */
  const pr = new window.Projectile({ x: 300, vx: -400, tell: 'gold' });
  pr.reflect();
  out.reflect = pr.vx === 400 * C.PROJECTILE.REFLECT_MULT && pr.owner === 'player';

  /* 기존 kind 의 attackState 에 remote 가 없다 */
  T.setup({ jab: { id: 'jab', label: 'JAB', tell: 'gold', kind: 'melee', windup: 0.5, active: 0.1, recover: 0.4,
                   reach: 150, approach: 0, damage: 1, swing: 'thrust', steal: null } }, 300, 420);
  T.attack('jab');
  const st = g.boss.attackState();
  out.meleeRemote = st && st.remote === undefined && st.stance === undefined;

  /* 투사체 volley — newShot/fire 추출 뒤에도 발수·간격이 같다 */
  T.setup({ tri: { id: 'tri', label: 'TRI', tell: 'gold', kind: 'projectile', windup: 0.4, active: 0.06, recover: 0.4,
                   proj: { speed: 500, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
                   volley: { count: 3, interval: 0.2 }, steal: null } }, 200, 700);
  g.player.iframes = 99;
  T.attack('tri');
  let maxShots = 0;
  T.run(0.9, (gg) => { maxShots = Math.max(maxShots, gg.projectiles.length); });
  out.volleyShots = maxShots;

  /* resolveRemoteHit — 퍼펙트는 훔치고 보스를 경직시키지 않는다 / 무입력은 피해 */
  const def = { id: 'r', label: 'R', tell: 'gold', steal: { id: 'RMT', label: 'RMT', kind: 'slash', damage: 10 } };
  T.setup({}, 300, 600);
  g.player.startParry();
  g.resolveRemoteHit({ tell: 'gold', def: def, damage: 1, fromX: 600, label: 'R', kind: 'mark' });
  out.remotePerfect = g.player.hand.length === 1 && g.player.hand[0].id === 'RMT' && g.boss.state !== 'stagger' && g.hits === 0;
  T.setup({}, 300, 600);
  g.resolveRemoteHit({ tell: 'gold', def: def, damage: 1, fromX: 600, label: 'R', kind: 'mark' });
  out.remoteHit = g.hits === 1 && g.lastHitBy && g.lastHitBy.kind === 'mark';
  return out;
});
check('MOTIONS 표가 있다', base.hasMotions);
check('getState 에 새 배열 4개', base.fields);
check('clearWorld 가 새 배열도 비운다', base.cleared);
check('기존 reflect() 는 속도를 뒤집는다', base.reflect);
check('기존 kind 의 attackState 에 remote·stance 가 없다', base.meleeRemote);
check('투사체 volley 3발 그대로', base.volleyShots === 3, `(${base.volleyShots})`);
check('resolveRemoteHit — 퍼펙트는 훔치고 보스 경직 없음', base.remotePerfect);
check('resolveRemoteHit — 무입력은 피해 1', base.remoteHit);

/* ---- 끌어당김 · 반격 자세 · 악보 (Task 3) ---------------------------------- */
const melee3 = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG, DT = T.DT;
  const out = {};
  const HAUL = { id: 'haul', label: 'HAUL', tell: 'gold', kind: 'pull', windup: 0.9, active: 0.12, recover: 0.6,
                 reach: 150, damage: 1, swing: 'arc', pull: { speed: 170 },
                 steal: { id: 'HAUL', label: 'HAUL', kind: 'slash', damage: 20 } };

  /* 끌어당김: 가만히 있으면 끌려가 맞는다 */
  T.setup({ haul: HAUL }, 300, 520);
  T.attack('haul'); T.run(1.1);
  out.pullIdleHit = g.hits === 1;
  /* 걸어서 버티면 사거리 밖 — 헛친다 */
  T.setup({ haul: HAUL }, 300, 520);
  T.attack('haul'); T.run(1.1, null, -1);
  out.pullResist = g.hits === 0 && Math.abs(g.boss.x - g.player.x) > HAUL.reach;
  /* 몸이 닿으면 멈춘다 (Review Focus 3) */
  T.setup({ haul: HAUL }, 300, 350);
  g.player.iframes = 99;
  T.attack('haul'); T.run(0.8);
  out.pullGap = Math.abs(g.boss.x - g.player.x) >= C.PLAYER.HALF_W + C.BOSS.HALF_W + 6 - 0.5;
  /* 대시 중에는 끌지 않는다 (Review Focus 3) — 공격이 없을 때와 같은 거리만 움직인다 */
  const dashDx = (withPull) => {
    T.setup({ haul: HAUL }, 400, 700);
    if (withPull) T.attack('haul');
    g.player.startDash(-1);
    T.run(C.DASH.DURATION);
    return 400 - g.player.x;
  };
  const dx0 = dashDx(false), dx1 = dashDx(true);
  out.pullDash = Math.abs(dx1 - dx0) < 0.5;

  /* 반격 자세 */
  const GUARD = { id: 'guard', label: 'GUARD', tell: 'gold', kind: 'stance', windup: 0.9, active: 0.12, recover: 0.62,
                  reach: 190, approach: 60, damage: 1, swing: 'arc', stance: { counter: 'retort' },
                  steal: { id: 'CLEAVE', label: 'CLEAVE', kind: 'slam', damage: 24 } };
  const RETORT = { id: 'retort', label: 'RETORT', tell: 'red', kind: 'melee', windup: 0.34, active: 0.12, recover: 0.6,
                   reach: 240, approach: 0, damage: 1, swing: 'thrust', stanceCounter: true, steal: null };
  const skill = { id: 'X', label: 'X', kind: 'slash', damage: 20 };
  /* 자세 중 리포스트 → 피해 0 · 즉시 적 반격. 자세 시작엔 전용 소리(3채널 — 색·모양·소리) */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  let guardSounds = 0;
  const guardSnd = window.RAudio.guard; window.RAudio.guard = function () { guardSounds++; };
  T.attack('guard'); T.run(0.3);
  window.RAudio.guard = guardSnd;
  out.stanceSound = guardSounds === 1;
  out.stanceFlag = g.boss.attackState().stance === true;
  g.resolveRiposteHit({ skill: skill, empowered: false });
  out.stancePunish = g.boss.hp === 999 && g.boss.attack && g.boss.attack.id === 'retort' && g.boss.attack.tell === 'red';
  /* 손패 shot 도 벌 / 반사탄(fromHand 없음)은 벌이 아니다 */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard'); T.run(0.3);
  g.resolveProjectileHitBoss({ damage: 10, fromHand: skill });
  out.stanceShot = g.boss.hp === 999 && g.boss.attack && g.boss.attack.id === 'retort';
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard'); T.run(0.3);
  g.resolveProjectileHitBoss({ damage: 10, fromHand: null });
  out.stanceReflect = g.boss.hp < 999 && !(g.boss.attack && g.boss.attack.id === 'retort');
  /* 방벽이 서 있으면 방벽 판정이 먼저 — 튕기고 자세는 그대로 */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420, { wall: { hits: 2, up: 6, breakStagger: 1.6 } });
  T.attack('guard'); T.run(0.3);
  g.resolveRiposteHit({ skill: skill, empowered: false });
  out.stanceWall = g.boss.attack && g.boss.attack.id === 'guard';
  /* 참으면 끝에 금 강타 — 패리하면 CLEAVE */
  T.setup({ guard: GUARD, retort: RETORT }, 300, 420);
  T.attack('guard');
  let parried = false;
  T.run(1.2, (gg) => {
    const a = gg.boss.attack;
    if (!parried && a && a.id === 'guard' && a.stage === 'windup' && a.hitAt - gg.time <= 0.05) { gg.player.startParry(); parried = true; }
  });
  out.stanceBash = g.player.hand.some((s) => s.id === 'CLEAVE') && g.hits === 0;

  /* 악보 — 콜 3음 → gap → 응답 3타, 플래시는 처음 한 번뿐 */
  const REFRAIN = { id: 'refrain', label: 'REFRAIN', tell: 'gold', kind: 'score', windup: 0.6, active: 0.1, recover: 0.45,
                    reach: 150, approach: 0, damage: 1, swing: 'arc', score: { notes: [0.45, 0.9] },
                    steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 } };
  const scoreRun = (phase) => {
    T.setup({ refrain: REFRAIN }, 300, 400);
    g.boss.phase = phase;
    g.player.iframes = 99;
    let flashes = 0, notes = 0;
    const times = [];
    g.boss.flash = function () { flashes++; };
    const note = window.RAudio.note; window.RAudio.note = function () { notes++; };
    g.resolveBossHit = function () { times.push(g.time); };
    T.attack('refrain');
    T.run(4.0);
    delete g.resolveBossHit;
    window.RAudio.note = note;
    return { flashes, notes, times };
  };
  const p1 = scoreRun(1), p2 = scoreRun(2);
  const iv = (t) => t.slice(1).map((v, i) => +(v - t[i]).toFixed(3));
  out.scoreP1Data = p1; out.scoreP2Data = p2;
  out.scoreFlash = p1.flashes === 1;
  out.scoreNotes = p1.notes === 3;
  out.scoreHits = p1.times.length === 3 && Math.abs(p1.times[0] - (1.35 + 0.6)) < 0.02;
  out.scoreRhythm = iv(p1.times).every((d, i) => Math.abs(d - [0.45, 0.9][i]) < 0.02);
  out.scoreP2 = p2.times.length === 3 && p2.times[0] < p1.times[0] - 0.05 &&
                iv(p2.times).every((d, i) => Math.abs(d - [0.45, 0.9][i]) < 0.02);

  /* 실제 판정으로 세 타를 전부 퍼펙트 — 중간 퍼펙트가 보스를 경직시켜 악보를 끊으면 2·3타가 오지 않아
     TWIN 이 3장이 되지 않는다. 경직은 마지막 타격 뒤에 한 번만 */
  T.setup({ refrain: REFRAIN }, 300, 400);
  const parriedAt = new Set();
  const staggerAt = [];
  const origStagger = g.boss.stagger;
  g.boss.stagger = function (d, c) { staggerAt.push(this.attack ? this.attack.scoreIdx : -1); return origStagger.call(this, d, c); };
  T.attack('refrain');
  T.run(4.0, (gg) => {
    const a = gg.boss.attack;
    if (a && a.id === 'refrain' && a.stage === 'windup' && a.hitAt - gg.time <= 0.05 && !parriedAt.has(a.hitAt)) {
      parriedAt.add(a.hitAt); gg.player.startParry();
    }
  });
  out.scoreStaggers = staggerAt;
  out.scoreParryAll = g.player.hand.filter((s) => s.id === 'TWIN').length === 3 && g.hits === 0 &&
                      staggerAt.length === 1 && staggerAt[0] === 2;
  return out;
});
check('끌어당김 — 가만히 있으면 끌려가 맞는다', melee3.pullIdleHit);
check('끌어당김 — 걸어서 버티면 헛친다', melee3.pullResist);
check('끌어당김 — 몸이 닿으면 멈춘다', melee3.pullGap);
check('끌어당김 — 대시 중에는 끌지 않는다', melee3.pullDash);
check('반격 자세 — attackState.stance', melee3.stanceFlag);
check('반격 자세 — 시작에 전용 소리 1회', melee3.stanceSound);
check('반격 자세 — 자세 중 리포스트는 피해 0 + 적 반격', melee3.stancePunish);
check('반격 자세 — 손패 shot 도 벌', melee3.stanceShot);
check('반격 자세 — 반사탄은 벌이 아니다', melee3.stanceReflect);
check('반격 자세 — 방벽이 서 있으면 방벽이 먼저', melee3.stanceWall);
check('반격 자세 — 참으면 끝의 금 강타를 훔친다', melee3.stanceBash);
check('악보 — 플래시는 처음 한 번', melee3.scoreFlash, JSON.stringify(melee3.scoreP1Data));
check('악보 — 콜 음표 3개', melee3.scoreNotes);
check('악보 — 첫 타격 = 콜 1.35 + gap 0.6', melee3.scoreHits, JSON.stringify(melee3.scoreP1Data.times));
check('악보 — 응답 간격 = 콜 간격', melee3.scoreRhythm);
check('악보 — P2 에서도 응답 간격은 콜과 같다(gap 만 짧다)', melee3.scoreP2, JSON.stringify(melee3.scoreP2Data.times));
check('악보 — 세 타 전부 퍼펙트로 받을 수 있다(중간 경직 없음)', melee3.scoreParryAll, `(stagger at scoreIdx ${JSON.stringify(melee3.scoreStaggers)})`);

/* ---- 새 동작 검사는 이 줄 위에 추가한다 ------------------------------------ */

check('pageerror 0', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
if (failures.length) { console.log(`MOTIONS FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('MOTIONS PASSED — all checks green');
