/* =============================================================================
 * RIPOSTE — js/bosses/tempest.js
 * TEMPEST — 폭풍 (챕터 3 두 번째 보스). 스펙 §2.2
 * 설계 축은 "회피의 재미" — 큰 탄을 여러 발 동시에 띄워 전부 받아낼 수 없게 만들고,
 * 무엇을 버릴지 고르게 한다.
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

    /* ---- 공격 테이블 (스펙 §2.2) ----------------------------------------
     * surge 만 금색(패리 가능)이다. 나머지 셋은 전부 적색 — 받아낼 수 없는 것을
     * 피하는 동안 surge 몇 발을 포기할지가 이 보스의 선택이다.
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
      shear: {                                   // 낮은 한 발 — 패리 불가, 대시로만
        id: 'shear', label: 'SHEAR', tell: 'red', kind: 'projectile',
        windup: 0.60, active: 0.06, recover: 0.50,
        /* 속도를 올리면(620) 텔에 반응한 대시가 끝나기 전에 도착해 두 번째 대시가 안 나온다 */
        proj: { speed: 340, r: 12, y: 26, damage: 1, reflectDamage: 0, shape: 'bolt' },
        steal: null
      },
      deluge: {                                  // 서 있던 자리로 쏟아진다 — 패리 불가
        id: 'deluge', label: 'DELUGE', tell: 'red', kind: 'zone',
        windup: 0.95, active: 0.10, recover: 0.60,
        /* anchor 를 주지 않으면 예고 시점의 플레이어 위치에 깔린다.
           linger 를 두지 않는다 — 탄이 떠 있는 동안 발밑까지 계속 맞으면 갇힌다. */
        zone: { w: 150, damage: 1 },
        steal: null
      },
      gust: {                                    // 붙으면 밀려난다 — 패리 불가
        id: 'gust', label: 'GUST', tell: 'red', kind: 'melee',
        windup: 0.50, active: 0.10, recover: 0.45,
        reach: 130, approach: 0, damage: 1, push: 120, swing: 'arc',
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §2.2) ------------------------------------------------
     * 옆으로 흘러다니며(left/right) 각도를 바꾼다. tag: far = 거리가 있을 때만,
     * near = 붙었을 때만(밀어내거나 물러난 뒤 쏜다), any = 상관없음.
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'surge',        steps: [{ atk: 'surge' }], tag: 'far' },
        { name: 'shear-back',   steps: [{ atk: 'shear' }, { move: 'back' }], tag: 'far' },
        { name: 'drift-surge',  steps: [{ move: 'left' }, { atk: 'surge' }], tag: 'far' },
        { name: 'surge-shear',  steps: [{ atk: 'surge' }, { wait: 0.85 }, { atk: 'shear' }], tag: 'far' },
        { name: 'deluge-drift', steps: [{ atk: 'deluge' }, { move: 'right' }], tag: 'any' },
        { name: 'gust-back',    steps: [{ atk: 'gust' }, { move: 'back' }], tag: 'near' },
        { name: 'back-surge',   steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' }
      ],
      2: [
        { name: 'surge-drift-surge', steps: [{ atk: 'surge' }, { move: 'right' }, { atk: 'surge' }], tag: 'far' },
        { name: 'drift-surge-shear', steps: [{ move: 'left' }, { atk: 'surge' }, { wait: 0.75 }, { atk: 'shear' }], tag: 'far' },
        { name: 'deluge-surge',      steps: [{ atk: 'deluge' }, { wait: 0.3 }, { atk: 'surge' }], tag: 'far' },
        { name: 'shear-shear',       steps: [{ atk: 'shear' }, { wait: 0.35 }, { atk: 'shear' }], tag: 'far' },
        { name: 'gust-drift',        steps: [{ atk: 'gust' }, { move: 'left' }], tag: 'near' },
        { name: 'back-surge',        steps: [{ move: 'back' }, { atk: 'surge' }], tag: 'near' }
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
