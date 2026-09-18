/* =============================================================================
 * RIPOSTE — js/bosses/adamant.js
 * ADAMANT — 벽 그 자체 (챕터 3 마지막 = 최종 보스). 스펙 §2.4
 * 설계 축은 "리턴이 있는 기믹". 엔진 방벽(def.wall)이 서 있는 동안 리포스트는 튕기고,
 * 반사탄 둘로 벽을 깨면 카운터 경직(breakStagger)이 열린다 — 그 창의 모든 리포스트가 ×1.5 다.
 * 벽은 깨지 않아도 up 초 뒤 저절로 내려간다. 기믹은 의무가 아니라 노리는 기회다.
 * Phase 2 는 counterOnly — 윈드업·카운터 경직 중 명중만 피해가 들어간다(완화안 softMult).
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
    par: 75,
    armor: false,
    spawnX: 700,
    droneHz: 36,
    arena: 'wall',             /* 아레나 (C.ARENA) */
    /* 드론 변주 — 톱니파, 가장 낮고 가장 느리게 흔들린다. 벽이 우는 소리 */
    drone: { wave: 'sawtooth', lfo: 0.06, lfoDepth: 24, cutoff: 200, cutoffP2: 520, detune: 8 },
    weaponTip: { dx: 70, dy: 60 },

    /* ---- 엔진 방벽 (스펙 §2.4, C.BOSS.WALL_*) -------------------------------
     * hits: 반사탄 몇 발이면 깨지는가 — shards 한 볼리(2발)를 전부 받아 되돌리면 정확히 깨진다.
     * up: 서 있는 시간 — 볼리 예고(0.62) + 왕복 비행(~2s) 이 들어갈 여유.
     * breakStagger: 깨진 뒤 카운터 경직 — 리포스트 셋이 들어갈 길이. */
    wall: { hits: 2, up: 4.0, breakStagger: 1.6 },

    /* ---- Phase 2 카운터 전용 (스펙 §2.4) --------------------------------
     * softMult 를 두지 않으면 일반 피해 0. 완벽 봇이 Phase 2 를 못 넘으면 0.2 로 내린다(스펙 허용). */
    counterOnly: {},

    /* 크고 느리다 — 멀찍이 서서 쏘고, 붙어서 벤다 */
    prefer: { close: 170, far: 400, back: 200 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.9, 2: 0.65 },

    /* ---- 공격 테이블 (스펙 §2.4) ----------------------------------------
     * 금색 둘(cleave·shards)은 플래시 → 타격 간격이 다르게 고정돼 있다(0.78 / 0.62).
     * 붉은 둘(advance·quake)은 자리를 옮기게 한다 — 벽을 등지고 서 있게 두지 않는다.
     * 판정기: 구성이 HOLLOW(charge/melee/volley)와 60% 로 한계(75%) 아래. 멀리서 붙는 이동
     * 모양(m:far … m:close)은 아무도 쓰지 않았다.
     * -------------------------------------------------------------------- */
    attacks: {
      cleave: {                                  // 대검 한 번 — 느리고 크고 무겁다
        id: 'cleave', label: 'CLEAVE', tell: 'gold', kind: 'melee',
        windup: 0.78, active: 0.12, recover: 0.62,
        reach: 190, approach: 60, damage: 1, swing: 'arc',
        steal: { id: 'CLEAVE', label: 'CLEAVE', kind: 'slam', damage: 24 }
      },
      shards: {                                  // 벽 조각 두 발 — 받아서 벽에 되돌리는 것이 정답
        id: 'shards', label: 'SHARDS', tell: 'gold', kind: 'projectile',
        windup: 0.62, active: 0.06, recover: 0.55,
        /* 각 탄의 플래시 → 타격 간격은 windup 하나로 고정이다(Global Constraints) */
        proj: { speed: 360, r: 13, y: 46, damage: 1, reflectDamage: 14, shape: 'arrow' },
        volley: { count: 2, interval: 0.5, p2Interval: 0.42 },
        steal: { id: 'SHARD', label: 'SHARD', kind: 'shot', damage: 12 }
      },
      advance: {                                 // 벽이 걸어온다 — 돌진, 패리 불가. 아레나 벽에 박으면 경직
        id: 'advance', label: 'ADVANCE', tell: 'red', kind: 'charge',
        windup: 0.80, active: 0.10, recover: 0.40,
        charge: { speed: 700, damage: 1, wallStun: 1.0 },
        steal: null
      },
      quake: {                                   // 발밑이 갈라진다 — 보스 앞 구역, 패리 불가
        id: 'quake', label: 'QUAKE', tell: 'red', kind: 'zone',
        windup: 0.90, active: 0.10, recover: 0.65,
        /* anchor boss + 기본 offset(ZONE_OFFSET_DEFAULT) — 붙어 있던 자리를 지운다. linger 없음 */
        zone: { w: 160, damage: 1, anchor: 'boss' },
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §2.4) ------------------------------------------------
     * tag 'wall' = 방벽이 서 있을 때 뽑는 풀 — 전부 shards 를 포함한다. 벽이 서면 반드시 탄이 온다,
     * 그래야 벽을 깰 재료가 손에 들어온다(기믹의 리턴을 운에 맡기지 않는다). tag 'any' = 상관없음.
     * 🔴 shards 는 far 뒤에만 쏜다 — 코앞에서 생성된 탄은 받아낼 수 없다(task-4-report 교훈 1).
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'far-shards',              steps: [{ move: 'far' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'cleave',                  steps: [{ atk: 'cleave' }], tag: 'any' },
        { name: 'quake-cleave',            steps: [{ atk: 'quake' }, { wait: 0.4 }, { atk: 'cleave' }], tag: 'any' },
        { name: 'far-shards-close-cleave', steps: [{ move: 'far' }, { atk: 'shards' }, { move: 'close' }, { atk: 'cleave' }], tag: 'wall' },
        { name: 'advance-cleave',          steps: [{ atk: 'advance' }, { atk: 'cleave' }], tag: 'any' }
      ],
      2: [
        { name: 'far-shards-shards',             steps: [{ move: 'far' }, { atk: 'shards' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'quake-advance',                 steps: [{ atk: 'quake' }, { atk: 'advance' }], tag: 'any' },
        { name: 'close-cleave-far-shards',       steps: [{ move: 'close' }, { atk: 'cleave' }, { wait: 0.3 }, { move: 'far' }, { atk: 'shards' }], tag: 'wall' },
        { name: 'far-shards-quake-close-cleave', steps: [{ move: 'far' }, { atk: 'shards' }, { atk: 'quake' }, { move: 'close' }, { atk: 'cleave' }], tag: 'wall' },
        { name: 'advance-cleave',                steps: [{ atk: 'advance' }, { atk: 'cleave' }], tag: 'any' }
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
