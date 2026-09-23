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

/* ---- 새 동작 검사는 이 줄 위에 추가한다 ------------------------------------ */

check('pageerror 0', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
if (failures.length) { console.log(`MOTIONS FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log('MOTIONS PASSED — all checks green');
