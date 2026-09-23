/* =============================================================================
 * RIPOSTE — js/bosses/adamant.js
 * ADAMANT — 벽 그 자체 (챕터 3 마지막 = 최종 보스). 스펙 §3.12 · 2026-09-23 재설계 §2.4
 * 방벽(반사탄으로 깬다) + 반격 자세 guard(이 윈드업에 치면 벌을 받는다) + P2 카운터 전용.
 * "어느 윈드업은 치고, 어느 윈드업은 참는가" — 12스테이지가 가르친 것의 기말고사.
 * 이 파일이 Adamant 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var ADAMANT = {
    key: 'adamant',
    name: 'ADAMANT',
    title: 'THE WALL',
    color: '#c9b8ff',
    silhouette: 'adamant',     // 가장 크고 가장 두껍다 — 대검 하나
    hp: 340,
    par: 75,                    // 2026-09-19 수정 1 유지: 숙련 승 33.6~52.7s ×2 ≈ 67~105 → 75 유지(중앙 33.7×2). 완벽 26.4~33.9s > 25
    armor: false,
    spawnX: 700,
    droneHz: 36,
    arena: 'wall',             /* 아레나 (C.ARENA) */
    /* 드론 변주 — 톱니파, 가장 낮고 가장 느리게 흔들린다. 벽이 우는 소리 */
    drone: { wave: 'sawtooth', lfo: 0.06, lfoDepth: 24, cutoff: 200, cutoffP2: 520, detune: 8 },
    weaponTip: { dx: 70, dy: 60 },

    /* ---- 엔진 방벽 (스펙 §2.4, C.BOSS.WALL_*) -------------------------------
     * hits: 반사탄 몇 발이면 깨지는가 — shards 한 볼리(2발)를 전부 받아 되돌리면 정확히 깨진다.
     * up: 서 있는 시간 — 4.0 → 6.0 (09-19 수정 1): 4.0 은 far 이동 + 예고 + 왕복이 한 번 겨우 들어가, 첫 볼리를 하나라도
     *     놓치면 보상 없이 내려갔다(완벽 봇 21.4 / 33.2 / 67.7s 로 세 배 편차). 6.0 은 볼리 두 번 — 완벽 26.4~33.9s(비 1.28).
     * breakStagger: 깨진 뒤 카운터 경직 — 리포스트 셋이 들어갈 길이. */
    wall: { hits: 2, up: 6.0, breakStagger: 1.6 },

    /* ---- Phase 2 카운터 전용 (스펙 §2.4) --------------------------------
     * softMult 를 두지 않으면 일반 피해 0. 완벽 봇이 Phase 2 를 못 넘으면 0.2 로 내린다(스펙 허용). */
    counterOnly: {},

    /* 크고 느리다 — 멀찍이 서서 쏘고, 붙어서 벤다 */
    prefer: { close: 170, far: 400, back: 200 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.9, 2: 0.65 },

    /* ---- 공격 테이블 (스펙 §3.12 · 2026-09-23 §2.4) --------------------------
     * shards(금, 방벽을 깨는 재료) · guard(금, 반격 자세) · retort(적, 자세 벌 — 패턴이 부르지 않는다).
     * 붉은 공격을 패턴이 직접 쓰지 않는다 — 이 보스의 위협은 "참지 못함"에서 온다.
     * -------------------------------------------------------------------- */
    attacks: {
      guard: {                                     // 반격 자세 — 참으면 끝에 금 강타(CLEAVE), 치면 retort (§3.8)
        id: 'guard', label: 'GUARD', tell: 'gold', kind: 'stance',
        windup: 0.90, active: 0.12, recover: 0.62,
        reach: 190, approach: 60, damage: 1, swing: 'arc',
        stance: { counter: 'retort' },
        steal: { id: 'CLEAVE', label: 'CLEAVE', kind: 'slam', damage: 24 }
      },
      retort: {                                     // 벌 반격 — 자세 중에 맞았을 때만. 패턴이 직접 부르지 않는다
        id: 'retort', label: 'RETORT', tell: 'red', kind: 'melee',
        windup: 0.34, active: 0.12, recover: 0.60,
        reach: 240, approach: 0, damage: 1, swing: 'thrust',
        stanceCounter: true,                       // 판정기 서명 stance/counter — 자세 동작의 일부 (tools/boss-overlap.mjs)
        steal: null
      },
      shards: {                                  // 벽 조각 두 발 — 받아서 벽에 되돌리는 것이 정답
        id: 'shards', label: 'SHARDS', tell: 'gold', kind: 'projectile',
        windup: 0.62, active: 0.06, recover: 0.55,
        /* 각 탄의 플래시 → 타격 간격은 windup 하나로 고정이다(Global Constraints) */
        proj: { speed: 360, r: 13, y: 46, damage: 1, reflectDamage: 14, shape: 'arrow' },
        volley: { count: 2, interval: 0.5, p2Interval: 0.42 },
        steal: { id: 'SHARD', label: 'SHARD', kind: 'shot', damage: 12 }
      }
    },

    /* ---- 패턴 (스펙 §2.4) ------------------------------------------------
     * tag 'wall' = 방벽이 서 있을 때 뽑는 풀 — 전부 shards 를 포함한다. 벽이 서면 반드시 탄이 온다,
     * 그래야 벽을 깰 재료가 손에 들어온다(기믹의 리턴을 운에 맡기지 않는다). tag 'any' = 상관없음.
     * 🔴 shards 는 far 뒤에만 쏜다 — 코앞에서 생성된 탄은 받아낼 수 없다(task-4-report 교훈 1).
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'far-shards',             steps: [{ move: 'far' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'far-shards-close-guard', steps: [{ move: 'far' }, { atk: 'shards' }, { move: 'close' }, { atk: 'guard' }], tag: 'wall' },
        { name: 'guard',                  steps: [{ atk: 'guard' }], tag: 'any' },
        { name: 'close-guard',            steps: [{ move: 'close' }, { atk: 'guard' }], tag: 'any' }
      ],
      2: [
        { name: 'far-shards-shards',      steps: [{ move: 'far' }, { atk: 'shards' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'far-shards-close-guard', steps: [{ move: 'far' }, { atk: 'shards' }, { move: 'close' }, { atk: 'guard' }], tag: 'wall' },
        { name: 'guard-guard',            steps: [{ atk: 'guard' }, { wait: 0.4 }, { atk: 'guard' }], tag: 'any' },
        { name: 'close-guard',            steps: [{ move: 'close' }, { atk: 'guard' }], tag: 'any' }
      ]
    },

    /* ---- 훅: 방벽이 서 있으면 shards 가 든 패턴만 뽑는다 (TEMPEST·HOLLOW 선례) ---- */
    onPickPattern: function (boss, game) {
      var pool = boss.def.patterns[boss.phase] || boss.def.patterns[1];
      if (!boss.wallUp()) return pool;
      var out = [];
      for (var i = 0; i < pool.length; i++) if (pool[i].tag === 'wall') out.push(pool[i]);
      return out.length ? out : pool;
    }
  };

  global.BOSSES.push(ADAMANT);
})(window);
