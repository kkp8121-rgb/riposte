/* =============================================================================
 * RIPOSTE — js/bosses/tempest.js
 * TEMPEST — 폭풍 (챕터 3 두 번째 보스). 스펙 §3.10 · 2026-09-23 재설계 §2.4
 * 협공 — 앞(금)과 등 뒤(적)에서 일정한 시차로 온다. 전부는 못 받는다, 버릴 것을 고른다.
 * 이 파일이 Tempest 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 이 보스의 거리 판단 임계값 (로컬 테이블) */
  var RANGE = {
    CROWDED: 180        // 이 거리 안이면 "붙었다" — 탄을 쏘지 않고 밀어내거나 물러난다
  };

  var TEMPEST = {
    key: 'tempest',
    name: 'TEMPEST',
    title: 'THE RAIN',
    color: '#7fc4ff',
    silhouette: 'storm',       // 무기 없는 넓은 어깨 — 던지는 자
    hp: 330,
    par: 46,                    // 2026-09-19 실측 유지: 숙련 23.5~26.0s ×2 ≈ 50(차 <10s) · 완벽 23.0~27.8s. docs/qa/balance-2026-09-19.md
    armor: false,
    spawnX: 720,
    droneHz: 52,
    arena: 'wall',             /* 아레나 (C.ARENA) */
    /* 드론 변주 — 톱니파 + 빠른 LFO. 쉬지 않고 흔들리는 바람 소리 */
    drone: { wave: 'sawtooth', lfo: 0.7, lfoDepth: 220, cutoff: 340, cutoffP2: 900, detune: 14 },
    weaponTip: { dx: 46, dy: 64 },
    range: RANGE,

    /* 옆으로 흘러다니며 거리를 지킨다. close/far 는 패턴에서 쓰이지 않는다.
       back 은 붙은 플레이어에서 떨어지는 거리 — 탄이 코앞(HIT_DIST 안)에서 생성되면
       피할 방법이 없으므로 near 패턴은 반드시 물러난 뒤에만 쏜다(봇 실측, task-4-report). */
    prefer: { close: 200, far: 420, back: 200 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.95, 2: 0.7 },

    /* ---- 공격 테이블 (스펙 §3.10 · 2026-09-23 재설계 §2.4) ----------------------------------------
     * surge(금, 3연발) · squall/squall2(협공 — 앞 발은 금, gap 뒤 등 뒤에서 오는 발은 적).
     * 앞만 받고 등 뒤를 포기할지, 물러나 등 뒤를 비울지가 이 보스의 선택이다.
     * -------------------------------------------------------------------- */
    attacks: {
      surge: {                                   // 큰 탄 연속 3발 — 전부 받아낼 수는 없다
        id: 'surge', label: 'SURGE', tell: 'gold', kind: 'projectile',
        windup: 0.55, active: 0.06, recover: 0.60,
        /* 크고 느린 탄. speed 380 · interval 0.26 → 탄 간격 99px 로 세 발이 동시에 떠 있다.
           각 탄의 플래시 → 타격 간격은 windup 하나로 고정이다(Global Constraints).
           간격을 더 벌리면(0.40) 첫 탄을 받은 뒤 다음 탄이 보이기 전에 반격을 시도하다
           맞는다 — 봇 실측. */
        proj: { speed: 380, r: 16, y: 52, damage: 1, reflectDamage: 12, shape: 'arrow' },
        /* p2Interval 0.22 → 0.26 (2026-09-19): 숙련 봇이 P2 에서 SURGE 3연속 피격으로 죽었다(seed 11). P1 과 같은 간격으로 */
        volley: { count: 3, interval: 0.26, p2Interval: 0.26 },
        steal: { id: 'SURGE', label: 'SURGE', kind: 'shot', damage: 14 }
      },
      squall: {                                    // 협공 — 앞 금 1발 → 0.45초 뒤 등 뒤 적 1발 (§3.3)
        id: 'squall', label: 'SQUALL', tell: 'gold', kind: 'pincer',
        windup: 0.60, active: 0.06, recover: 0.60,
        proj: { speed: 420, r: 12, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
        steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 }
      },
      squall2: {                                   // P2 — 앞은 큰 탄 3연발, 마지막 앞 탄 0.45초 뒤 등 뒤 적
        id: 'squall2', label: 'SQUALL', tell: 'gold', kind: 'pincer',
        windup: 0.60, active: 0.06, recover: 0.65,
        proj: { speed: 380, r: 16, y: 52, damage: 1, reflectDamage: 12, shape: 'arrow' },
        volley: { count: 3, interval: 0.26, p2Interval: 0.26 },
        pincer: { backDist: 260, backSpeed: 360, backTell: 'red', gap: 0.45, y: 30, r: 11, shape: 'bolt' },
        steal: { id: 'SQUALL', label: 'SQUALL', kind: 'shot', damage: 14 }
      }
    },

    /* ---- 패턴 (스펙 §3.10 · 2026-09-23 재설계 §2.4) ------------------------------------------------
     * 옆으로 흘러다니며(left/right) 각도를 바꾼다. tag: far = 거리가 있을 때만,
     * near = 붙었을 때만(밀어내거나 물러난 뒤 쏜다), any = 상관없음.
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'surge',        steps: [{ atk: 'surge' }], tag: 'far' },
        { name: 'squall',       steps: [{ move: 'far' }, { atk: 'squall' }], tag: 'far' },
        { name: 'drift-squall', steps: [{ move: 'left' }, { move: 'far' }, { atk: 'squall' }], tag: 'far' },
        { name: 'surge-squall', steps: [{ atk: 'surge' }, { wait: 0.85 }, { move: 'far' }, { atk: 'squall' }], tag: 'far' },
        { name: 'back-surge',   steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' },
        { name: 'back-squall',  steps: [{ move: 'back' }, { atk: 'squall' }], tag: 'near' }
      ],
      2: [
        { name: 'squall2',            steps: [{ move: 'far' }, { atk: 'squall2' }], tag: 'far' },
        { name: 'surge-drift-squall', steps: [{ atk: 'surge' }, { move: 'right' }, { move: 'far' }, { atk: 'squall' }], tag: 'far' },
        { name: 'drift-squall2',      steps: [{ move: 'left' }, { move: 'far' }, { atk: 'squall2' }], tag: 'far' },
        { name: 'squall-surge',       steps: [{ move: 'far' }, { atk: 'squall' }, { wait: 0.5 }, { atk: 'surge' }], tag: 'far' },
        { name: 'back-squall2',       steps: [{ move: 'back' }, { atk: 'squall2' }], tag: 'near' },
        { name: 'back-surge',         steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' }
      ]
    },

    /* ---- 훅: 거리에 따라 패턴 풀을 고른다 -------------------------------- */
    onPickPattern: function (boss, game) {
      var pool = boss.def.patterns[boss.phase] || boss.def.patterns[1];
      var near = boss.dist() <= RANGE.CROWDED;
      var out = [];
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i];
        if (p.tag === 'any' || p.tag === (near ? 'near' : 'far')) out.push(p);
      }
      return out.length ? out : pool;
    }
  };

  global.BOSSES.push(TEMPEST);
})(window);
