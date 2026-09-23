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

/* ---- 부메랑 · 협공 (Task 4) ------------------------------------------------ */
const shots = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const ORB = { id: 'orb', label: 'ORB', tell: 'red', kind: 'boomerang', windup: 0.6, active: 0.06, recover: 0.5,
                proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                boomerang: { turnDist: 200, backTime: 0.6, backTell: 'gold' },
                steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 } };
  const bossShot = () => g.projectiles.find((p) => p.owner === 'boss' || p.boomerang);

  /* 적으로 와서 대시로 넘기고 → 등 뒤에서 금으로 돌아온다 → 받으면 보스 쪽으로 반사 + 훔침 */
  T.setup({ orb: ORB }, 400, 750);
  T.attack('orb');
  out.orbRemote = g.boss.attackState().remote === true;
  let dashed = false, parried = false, turn = null;
  T.run(4.0, (gg) => {
    const pr = bossShot(); if (!pr) return;
    const p = gg.player, d = Math.abs(pr.x - p.x);
    if (!pr.returning && !dashed && d < 60) { p.startDash(1); dashed = true; }
    if (pr.returning && !turn) turn = { tell: pr.tell, vx: pr.vx, behind: pr.x < p.x };
    if (pr.returning && pr.owner === 'boss' && !parried && d <= 45) { p.startParry(); parried = true; }
  });
  out.orbTurn = turn && turn.tell === 'gold' && turn.vx > 0 && turn.behind;
  out.orbSteal = g.player.hand.some((s) => s.id === 'ORB') && g.hits === 0;
  out.orbToBoss = g.boss.hp < 999;                 // 반사된 귀환탄이 보스를 맞혔다 (벽 쪽으로 갔다면 hp 그대로)

  /* 보스가 귀환 경로 위(플레이어와 도는 지점 사이)에 서 있어도 귀환탄은 플레이어까지 온다 */
  T.setup({ orb: ORB }, 400, 750);
  g.player.iframes = 99;
  T.attack('orb');
  let reached = false, moved = false;
  T.run(4.0, (gg) => {
    const pr = gg.projectiles.find((p) => p.boomerang); if (!pr) return;
    if (pr.returning && !moved) { gg.boss.x = gg.player.x - 110; moved = true; }   // LANTERN P2 orb-behind-flicker 자리
    if (pr.returning && Math.abs(pr.x - gg.player.x) <= C.PROJECTILE.HIT_DIST) reached = true;
  });
  out.orbPassBoss = moved && reached;

  /* 벽 코앞(받는 거리 안)에서 돌게 되면 부서진다 — 예고와 타격이 같은 순간이 되지 않게 */
  T.setup({ orb: ORB }, 90, 800);
  g.player.iframes = 99;
  T.attack('orb');
  let returned = false;
  T.run(4.0, () => { if (g.projectiles.some((p) => p.boomerang && p.returning)) returned = true; });
  out.orbWallBreak = !returned && g.projectiles.every((p) => !p.boomerang);

  /* 두 번째 텔 → 교차가 backTime 으로 일정 — 보통 거리와 벽 코앞 (Review Focus 2) */
  const crossTime = (px) => {
    T.setup({ orb: ORB }, px, 800);
    g.player.iframes = 99;
    T.attack('orb');
    let t0 = null, t1 = null, lastSide = null;
    T.run(5.0, (gg) => {
      const pr = g.projectiles.find((p) => p.boomerang); if (!pr) return;
      if (pr.returning && t0 === null) { t0 = gg.time; lastSide = Math.sign(pr.x - gg.player.x); }
      if (t0 !== null && t1 === null) {
        const side = Math.sign(pr.x - gg.player.x);
        if (side !== lastSide) t1 = gg.time;
      }
    });
    return t0 === null || t1 === null ? null : +(t1 - t0).toFixed(3);
  };
  out.crossOpen = crossTime(400);
  out.crossWall = crossTime(130);
  out.orbConst = out.crossOpen !== null && out.crossWall !== null &&
                 Math.abs(out.crossOpen - 0.6) < 0.03 && Math.abs(out.crossWall - 0.6) < 0.03;

  /* 협공 — 앞(금) 뒤 gap 초에 등 뒤(적) */
  const SQUALL = { id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer', windup: 0.6, active: 0.06, recover: 0.6,
                   proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                   pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
                   steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 } };
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  out.pincerRemote = g.boss.attackState().remote === true;
  let front = null, rear = null, rearInfo = null;
  T.run(3.0, (gg) => {
    const p = gg.player;
    for (const pr of gg.projectiles) {
      if (pr.owner !== 'boss') continue;
      const d = Math.abs(pr.x - p.x);
      if (pr.tell === 'gold' && !pr.fromBehind && front === null && d <= C.PARRY.PROJECTILE_CATCH) front = gg.time;
      if (pr.fromBehind) {
        if (!rearInfo) rearInfo = { tell: pr.tell, behind: pr.x < p.x, vx: pr.vx };
        if (rear === null && d <= C.PARRY.PROJECTILE_CATCH) rear = gg.time;
      }
    }
  });
  out.pincerGap = front !== null && rear !== null ? +(rear - front).toFixed(3) : null;
  out.pincerOk = out.pincerGap !== null && Math.abs(out.pincerGap - 0.45) < 0.03 &&
                 rearInfo.tell === 'red' && rearInfo.behind && rearInfo.vx > 0;
  /* 등 뒤 공간이 없으면 스텝을 건너뛴다 */
  T.setup({ squall: SQUALL }, 150, 700);
  T.attack('squall');
  out.pincerSkip = g.boss.attack === null;
  /* 예고 뒤 플레이어가 벽으로 물러서면 뒤 탄은 생기지 않는다 (몸 위에 예고 없이 생기지 않게) */
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  T.run(0.3);
  g.player.x = 70;
  let rearSeen = false;
  T.run(2.5, (gg) => { if (gg.projectiles.some((p) => p.fromBehind)) rearSeen = true; });
  out.pincerRetreat = !rearSeen;
  return out;
});
check('부메랑 — attackState.remote', shots.orbRemote);
check('부메랑 — 적으로 가서 등 뒤에서 금으로 돌아온다', shots.orbTurn);
check('부메랑 — 귀환탄을 받으면 훔치고 무피격', shots.orbSteal);
check('부메랑 — 받은 귀환탄은 보스 쪽으로 가서 맞힌다', shots.orbToBoss);
check('부메랑 — 보스가 귀환 경로 위에 있어도 플레이어까지 온다', shots.orbPassBoss);
check('부메랑 — 벽 코앞에서 돌게 되면 부서진다', shots.orbWallBreak);
check('부메랑 — 두 번째 텔 → 교차 = backTime (보통 거리)', shots.orbConst, `(open ${shots.crossOpen} · wall ${shots.crossWall})`);
check('협공 — attackState.remote', shots.pincerRemote);
check('협공 — 앞 금 → gap 뒤 등 뒤 적', shots.pincerOk, `(gap ${shots.pincerGap})`);
check('협공 — 등 뒤 공간이 없으면 건너뛴다', shots.pincerSkip);
check('협공 — 예고 뒤 벽으로 물러서면 뒤 탄이 생기지 않는다', shots.pincerRetreat);

/* ---- 쓸기 빔 · 기둥 (Task 5) ------------------------------------------------ */
const area = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const LINE = { id: 'line', label: 'LINE', tell: 'red', kind: 'sweep', windup: 0.85, active: 0.06, recover: 0.6,
                 beam: { w: 90, speed: 320, damage: 1 }, steal: null };
  /* 빔 — 가만히 있으면 맞는다 */
  T.setup({ line: LINE }, 300, 700);
  T.attack('line');
  out.beamRemote = g.boss.attackState().remote === true;
  out.beamPendingSafe = (() => { T.run(0.8); return g.hits === 0 && g.beams.length === 1 && g.beams[0].pending; })();
  T.run(2.0);
  out.beamIdle = g.hits === 1 && g.lastHitBy && g.lastHitBy.kind === 'beam';
  /* 빔 반대쪽(보스 쪽)으로 대시하면 따라잡혀 맞는다 / 빔 쪽으로 대시하면 넘는다 */
  const dashRun = (dir) => {
    T.setup({ line: LINE }, 300, 700);
    T.attack('line');
    let dashed = false;
    T.run(3.0, (gg) => {
      const bm = gg.beams[0]; if (!bm || bm.pending || dashed) return;
      const front = bm.x + bm.w / 2, back = gg.player.x - C.PLAYER.HALF_W;
      if (back - front <= 20) { gg.player.startDash(dir); dashed = true; }
    });
    return g.hits;
  };
  out.beamWrong = dashRun(1) === 1;
  out.beamRight = dashRun(-1) === 0;
  /* 등 뒤 공간이 없으면 건너뛴다 */
  T.setup({ line: LINE }, 100, 700);
  T.attack('line');
  out.beamSkip = g.boss.attack === null && g.beams.length === 0;

  const GATE = { id: 'gate', label: 'GATE', tell: 'red', kind: 'pillar', windup: 0.9, active: 0.1, recover: 0.5,
                 pillar: { w: 34, up: 4.0, dist: 150, count: 1, damage: 1 }, steal: null };
  const CAGE = { id: 'cage', label: 'CAGE', tell: 'red', kind: 'pillar', windup: 0.95, active: 0.1, recover: 0.55,
                 pillar: { w: 34, up: 3.5, dist: 150, count: 2, damage: 1 }, steal: null };
  const edge = 250 + 17 + C.PLAYER.HALF_W;                 // 등 뒤 기둥(250) 오른쪽 면에 몸이 닿는 x
  /* 기둥 — 등 뒤에 서서 걷기·대시를 막는다, up 뒤 사라진다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate');
  out.pillarRemote = g.boss.attackState().remote === true;
  T.run(1.0);
  out.pillarUp = g.pillars.length === 1 && !g.pillars[0].pending && Math.abs(g.pillars[0].x - 250) < 1;
  T.run(1.0, null, -1);
  out.pillarWalk = g.player.x >= edge - 0.5;
  g.player.dashCd = 0; g.player.stamina = C.STAMINA.MAX;
  g.player.startDash(-1); T.run(0.3);
  out.pillarDash = g.player.x >= edge - 0.5;
  /* 블록 밀림(40px, 기둥 쪽)이 기둥을 넘지 못한다 — 순간 이동도 설 때 있던 쪽으로 되돌린다 */
  g.player.x = edge;
  g.onBlock(null, { x: 600 });
  T.run(T.DT * 2);
  out.pillarBlockPush = g.player.x >= edge - 0.5;
  T.run(4.0); T.run(1.0, null, -1);
  out.pillarGone = g.pillars.length === 0 && g.player.x < edge - 20;
  /* 기둥 자리에 서 있으면 맞고 바깥으로 밀려난다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.player.x = 250;
  T.run(0.8);
  out.pillarRise = g.hits === 1 && Math.abs(g.player.x - 250) >= 17 + C.PLAYER.HALF_W - 0.5;
  /* 아레나 밖·칸이 좁으면 서지 않는다 */
  T.setup({ gate: GATE }, 180, 600);
  T.attack('gate');
  out.pillarOut = g.boss.attack === null && g.pillars.length === 0;
  T.setup({ cage: CAGE }, 400, 560);
  T.attack('cage');
  out.cageNarrow = g.boss.attack === null && g.pillars.length === 0;
  /* windup 동안 기둥 자리 너머로 걸어가면(칸 [60, 233] = 173 < 200) 서지 않는다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.player.x = 200;
  T.run(0.8);
  out.pillarRecheck = g.pillars.length === 0 && g.hits === 0;
  /* windup 중 보스가 경직되면 기둥은 서지 않는다 */
  T.setup({ gate: GATE }, 400, 600);
  T.attack('gate'); T.run(0.3);
  g.boss.stagger(1.0, false);
  T.run(1.0);
  out.pillarCancel = g.pillars.length === 0;
  return out;
});
check('빔 — attackState.remote', area.beamRemote);
check('빔 — 예고 중에는 맞지 않는다', area.beamPendingSafe);
check('빔 — 가만히 있으면 맞는다', area.beamIdle);
check('빔 — 반대쪽으로 대시하면 따라잡힌다', area.beamWrong);
check('빔 — 빔 쪽으로 대시하면 넘는다', area.beamRight);
check('빔 — 등 뒤 공간이 없으면 건너뛴다', area.beamSkip);
check('기둥 — attackState.remote', area.pillarRemote);
check('기둥 — 등 뒤 150 에 선다', area.pillarUp);
check('기둥 — 걷기를 막는다', area.pillarWalk);
check('기둥 — 대시를 막는다', area.pillarDash);
check('기둥 — 블록 밀림도 넘지 못한다', area.pillarBlockPush);
check('기둥 — up 뒤 사라진다', area.pillarGone);
check('기둥 — 자리에 서 있으면 맞고 밀려난다', area.pillarRise);
check('기둥 — 아레나 밖이면 서지 않는다', area.pillarOut);
check('기둥 — 칸이 SAFE_MIN_W 보다 좁으면 서지 않는다', area.cageNarrow);
check('기둥 — 서는 순간 칸이 좁아졌으면 서지 않는다', area.pillarRecheck);
check('기둥 — windup 중 경직되면 서지 않는다', area.pillarCancel);

/* ---- 표식 · 메아리 (Task 6) ------------------------------------------------ */
const remote = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T;
  const out = {};
  const BRAND = { id: 'brand', label: 'BRAND', tell: 'gold', kind: 'mark', windup: 0.7, active: 0.06, recover: 0.45,
                  mark: { delay: 1.4, damage: 1 }, steal: { id: 'BRAND', label: 'BRAND', kind: 'lunge', damage: 20 } };
  /* 붙고, 따라다니고, delay 뒤 터진다 — 받으면 훔치고 보스는 경직되지 않는다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand');
  out.markRemote = g.boss.attackState().remote === true;
  T.run(0.75);
  out.markOn = g.marks.length === 1;
  let attachAt = null;
  T.setup({ brand: BRAND }, 300, 700);             // 부착 시각을 스텝 단위로 잰다
  T.attack('brand');
  T.run(0.75, (gg) => { if (attachAt === null && gg.marks.length) attachAt = gg.time; });
  T.run(0.5, null, 1);
  out.markFollow = g.marks.length === 1 && Math.abs(g.marks[0].x - g.player.x) < 0.01;
  let parried = false, boomAt = null;
  T.run(1.2, (gg) => {
    const m = gg.marks[0];
    if (m && !parried && m.t <= 0.05) { gg.player.startParry(); parried = true; }
    if (!m && boomAt === null) boomAt = gg.time;
  });
  out.markSteal = g.player.hand.some((s) => s.id === 'BRAND') && g.hits === 0 && g.boss.state !== 'stagger';
  out.markDelay = boomAt !== null && attachAt !== null && Math.abs((boomAt - attachAt) - 1.4) < 0.02;
  /* 붙은 뒤에는 보스가 경직돼도 터진다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.75);
  g.boss.stagger(1.0, false);
  T.run(1.6);
  out.markPersist = g.hits === 1 && g.lastHitBy.kind === 'mark';
  /* 붙기 전(windup)에 끊기면 붙지 않는다 */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.3);
  g.boss.stagger(1.0, false);
  T.run(2.5);
  out.markCancel = g.marks.length === 0 && g.hits === 0;
  /* KO 중에는 아무것도 안 한다 (Review Focus 5) */
  T.setup({ brand: BRAND }, 300, 700);
  T.attack('brand'); T.run(0.75);
  g.ko = 'victory'; g.koT = 999;                  // koT 를 크게 — 메인 루프가 승리 처리로 넘어가지 않게
  T.run(1.6);
  out.markKo = g.hits === 0;
  g.ko = null; g.koT = 0;

  const CANON = { id: 'canon', label: 'CANON', tell: 'gold', kind: 'melee', windup: 0.55, active: 0.1, recover: 0.5,
                  reach: 150, approach: 0, damage: 1, swing: 'thrust', echo: { delay: 0.7 },
                  steal: { id: 'CANON', label: 'CANON', kind: 'lunge', damage: 15 } };
  /* 친 자리에서 delay 뒤 잔상이 같은 windup 으로 다시 친다 — 보스가 건너가 있어도 */
  T.setup({ canon: CANON }, 300, 420);
  g.player.iframes = 0.9;                         // 원 타격은 무적으로 흘린다
  T.attack('canon'); T.run(0.6);
  g.boss.x = 150;                                 // 보스는 반대편으로
  T.run(0.8);
  out.echoAt = g.echoes.length === 1 && g.echoes[0].x === 420;
  T.run(0.8);
  out.echoHit = g.hits === 1 && g.lastHitBy.kind === 'echo';
  /* 잔상 사거리 밖이면 맞지 않는다 */
  T.setup({ canon: CANON }, 300, 420);
  g.player.iframes = 0.9;
  T.attack('canon'); T.run(0.6);
  g.boss.x = 150; g.player.x = 200;
  T.run(1.6);
  out.echoMiss = g.hits === 0;
  /* 원 공격이 windup 중 끊기면 메아리도 없다 */
  T.setup({ canon: CANON }, 300, 420);
  T.attack('canon'); T.run(0.3);
  g.boss.interrupt(0.45);
  T.run(2.0);
  out.echoCancel = g.echoes.length === 0 && g.hits === 0;
  /* 연타(volley) 는 windup→active 를 타격마다 다시 돈다(onActiveStart 재호출) — 잔상은 원 공격당 하나(첫 타격만) */
  const CANON_VOLLEY = { id: 'canonv', label: 'CANONV', tell: 'gold', kind: 'melee', windup: 0.55, active: 0.1, recover: 0.5,
                         reach: 150, approach: 0, damage: 1, swing: 'thrust', echo: { delay: 0.7 },
                         volley: { count: 3, interval: 0.35 },
                         steal: { id: 'CANONV', label: 'CANONV', kind: 'lunge', damage: 15 } };
  T.setup({ canonv: CANON_VOLLEY }, 300, 420);
  g.player.iframes = 2.0;                         // 전 구간 무적으로 흘려 곁가지 판정을 배제한다
  T.attack('canonv');
  T.run(1.6);
  out.echoVolleyOnce = g.echoes.length === 1;
  return out;
});
check('표식 — attackState.remote', remote.markRemote);
check('표식 — windup 끝에 붙는다', remote.markOn);
check('표식 — 플레이어를 따라다닌다', remote.markFollow);
check('표식 — 받으면 훔치고 보스 경직 없음', remote.markSteal);
check('표식 — 붙은 뒤 delay 에 터진다', remote.markDelay);
check('표식 — 붙은 뒤엔 보스 경직으로 안 사라진다', remote.markPersist);
check('표식 — windup 중 끊기면 붙지 않는다', remote.markCancel);
check('표식 — KO 중에는 아무것도 안 한다', remote.markKo);
check('메아리 — 친 자리에 잔상이 선다', remote.echoAt);
check('메아리 — 잔상이 다시 친다', remote.echoHit);
check('메아리 — 잔상 사거리 밖이면 무사', remote.echoMiss);
check('메아리 — 원 공격이 끊기면 없다', remote.echoCancel);
check('메아리 — 연타 공격도 잔상은 하나', remote.echoVolleyOnce);

/* ---- 끊긴 공격의 예약 발사 취소 (Task 15.1) ------------------------------- */
const cancelShots = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T;
  const out = {};
  const TRI = { id: 'tri', label: 'TRI', tell: 'gold', kind: 'projectile', windup: 0.4, active: 0.06, recover: 0.6,
                proj: { speed: 300, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
                volley: { count: 3, interval: 0.2 }, steal: null };
  const countShots = (interrupt) => {
    T.setup({ tri: TRI }, 200, 700);
    g.player.iframes = 99;
    let spawned = 0;
    const orig = g.spawnProjectile;
    g.spawnProjectile = function (p) { if (p.owner === 'boss') spawned++; return orig.call(this, p); };
    T.attack('tri');
    T.run(0.45);                                   // 첫 발만 나간 뒤
    if (interrupt) interrupt();
    T.run(1.0);
    g.spawnProjectile = orig;
    return spawned;
  };
  out.none = countShots(null);
  out.stagger = countShots(() => g.boss.stagger(1.0, false));
  out.phase2 = countShots(() => g.boss.enterPhase2());

  const SQUALL = { id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer', windup: 0.6, active: 0.06, recover: 0.6,
                   proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
                   pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
                   steal: null };
  T.setup({ squall: SQUALL }, 420, 760);
  g.player.iframes = 99;
  T.attack('squall');
  T.run(0.7);                                      // 앞 탄 발사 직후, 뒤 탄은 아직 예약 중
  g.boss.stagger(1.0, false);
  let rear = false;
  T.run(2.0, (gg) => { if (gg.projectiles.some((p) => p.fromBehind)) rear = true; });
  out.pincerCancel = !rear;
  return out;
});
check('예약 발사 — 끊기지 않으면 연사 3발 그대로', cancelShots.none === 3, `(${cancelShots.none})`);
check('예약 발사 — 경직되면 남은 연사는 나가지 않는다', cancelShots.stagger === 1, `(${cancelShots.stagger})`);
check('예약 발사 — 2페이즈 포효로 끊겨도 나가지 않는다', cancelShots.phase2 === 1, `(${cancelShots.phase2})`);
check('예약 발사 — 경직되면 협공 뒤 탄도 나가지 않는다', cancelShots.pincerCancel);

/* ---- 반응 시간이 없는 되받아치기 금지 (Task 16.1) ------------------------- */
const deflect = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T, C = window.CONFIG;
  const out = {};
  const oldP1 = C.BOSS.DEFLECT_CHANCE_P1;
  C.BOSS.DEFLECT_CHANCE_P1 = 1;                      // 확률 제거 — 되받을 수 있으면 반드시 되받는다
  const shoot = (px, bx) => {
    T.setup({}, px, bx, { deflect: true });
    const skill = { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 };
    const pr = new window.Projectile({ x: px + 22, y: C.VIEW.FLOOR_Y - 48, vx: C.RIPOSTE_KINDS.shot.projSpeed,
                                       r: 9, tell: 'player', owner: 'player', damage: 20, fromHand: skill });
    g.projectiles.push(pr);
    let deflectedAt = null, catchAt = null;
    T.run(1.5, (gg) => {
      if (deflectedAt === null && pr.owner === 'boss') deflectedAt = gg.time;
      if (deflectedAt !== null && catchAt === null && Math.abs(pr.x - gg.player.x) <= C.PARRY.PROJECTILE_CATCH) catchAt = gg.time;
    });
    return { deflected: deflectedAt !== null, react: deflectedAt !== null && catchAt !== null ? +(catchAt - deflectedAt).toFixed(3) : null,
             bossHp: g.boss.hp };
  };
  out.far = shoot(300, 700);                          // 멀리서 쏜 탄 — 되받는다, 반응 시간 ≥ DEFLECT_MIN_REACT
  out.near = shoot(560, 700);                         // 코앞에서 쏜 탄 — 되받지 않는다, 보스가 맞는다
  C.BOSS.DEFLECT_CHANCE_P1 = oldP1;
  out.min = C.BOSS.DEFLECT_MIN_REACT;
  return out;
});
check('되받기 — 멀리서 쏜 탄은 되받는다(반응 시간 ≥ 하한)',
  deflect.far.deflected && deflect.far.react !== null && deflect.far.react >= deflect.min - 0.02, JSON.stringify(deflect.far));
check('되받기 — 코앞에서 쏜 탄은 되받지 않는다(보스가 맞는다)',
  !deflect.near.deflected && deflect.near.bossHp < 999, JSON.stringify(deflect.near));

/* ---- 기둥 — KO 중에는 조용히 선다 (검토 잔여 정리) -------------------------
 * onPillarRise 를 직접 호출해 그 함수 자체의 효과만 본다 — stepWorld 를 더 돌리면
 * blockByPillars(매 tick, side 만 있으면 항상 적용되는 정상적인 벽 충돌)가 같은 자리로
 * 밀어붙여 구분이 안 된다. 여기서는 그 한 호출 안에서 밀림·피격이 없는지만 확인한다. */
const koPillar = await page.evaluate(() => {
  const g = window.__RIPOSTE.game, T = window.__T;
  T.setup({}, 250, 600);
  const pillar = new window.Pillar({ x: 250, w: 34, delay: 0, up: 4.0, damage: 1, label: 'GATE' });
  const oldKo = g.ko, oldKoT = g.koT;
  g.ko = 'victory'; g.koT = 999;
  g.onPillarRise(pillar);
  const out = { hits: g.hits, x: g.player.x, side: pillar.side };
  g.ko = oldKo; g.koT = oldKoT;
  return out;
});
check('기둥 — KO 중에는 조용히 선다', koPillar.hits === 0 && koPillar.x === 250, JSON.stringify(koPillar));

/* ---- 새 동작 검사는 이 줄 위에 추가한다 ------------------------------------ */

check('pageerror 0', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
if (failures.length) { console.log(`MOTIONS FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('MOTIONS PASSED — all checks green');
