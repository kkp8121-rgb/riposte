/* =============================================================================
 * RIPOSTE — js/bosses/seraph.js
 * SERAPH — 궁수. 스펙 §3.2
 * 거리 350 이상을 유지하려 하고, 코너에 몰리면 kick 또는 rain 을 쓴다.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 이 보스의 거리 판단 임계값 (로컬 테이블) */
  var RANGE = {
    KICK_MAX: 240,      // 이 거리 안이면 kick 사용
    CROWDED: 200,       // 이 거리 안이면 "몰렸다" 판정 → 후퇴/근접기
    STANDOFF: 350       // 유지하려는 거리 (스펙: 거리 ≥ 350)
  };

  var SERAPH = {
    key: 'seraph',
    name: 'SERAPH',
    title: 'THE ARCHER',
    color: '#b78cff',
    silhouette: 'bow',          // 후드를 쓴 궁수
    hp: 120,
    par: 70,
    armor: false,
    spawnX: 760,
    droneHz: 58.27,             // B♭1
    weaponTip: { dx: 40, dy: 62 },
    range: RANGE,

    prefer: { close: RANGE.STANDOFF, far: 470, back: 220 },
    gap: { 1: 0.7, 2: 0.5 },

    /* ---- 공격 테이블 (스펙 §3.2) ---------------------------------------- */
    attacks: {
      arrow: {
        id: 'arrow', label: 'ARROW', tell: 'gold', kind: 'projectile',
        windup: 0.45, active: 0.06, recover: 0.45,
        proj: { speed: 560, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
        steal: { id: 'ARROW', label: 'ARROW', kind: 'shot', damage: 10 }
      },
      triple: {
        id: 'triple', label: 'TRIPLE', tell: 'gold', kind: 'projectile',
        windup: 0.50, active: 0.06, recover: 0.55,
        proj: { speed: 560, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
        volley: { count: 3, interval: 0.22, p2Interval: 0.18 },
        steal: { id: 'ARROW', label: 'ARROW', kind: 'shot', damage: 10 }
      },
      kick: {
        id: 'kick', label: 'KICK', tell: 'gold', kind: 'melee',
        windup: 0.35, active: 0.10, recover: 0.45,
        reach: 110, approach: 40, damage: 1, push: 90, swing: 'arc',
        steal: { id: 'KICK', label: 'KICK', kind: 'slash', damage: 12, push: 90 }
      },
      rain: {
        id: 'rain', label: 'RAIN', tell: 'red', kind: 'zone',
        windup: 1.00, active: 0.10, recover: 0.60,
        zone: { w: 160, damage: 1 },
        steal: null
      },
      pierce: {                                  // P2 전용, 패리 불가
        id: 'pierce', label: 'PIERCE', tell: 'red', kind: 'projectile',
        windup: 0.40, active: 0.06, recover: 0.50,
        proj: { speed: 760, r: 7, y: 54, damage: 1, reflectDamage: 0, shape: 'bolt' },
        steal: null
      }
    },

    /* ---- 패턴 ------------------------------------------------------------ */
    patterns: {
      1: [
        { name: 'arrow',        steps: [{ atk: 'arrow' }], tag: 'far' },
        { name: 'arrow-arrow',  steps: [{ atk: 'arrow' }, { wait: 0.35 }, { atk: 'arrow' }], tag: 'far' },
        { name: 'triple',       steps: [{ atk: 'triple' }], tag: 'far' },
        { name: 'rain',         steps: [{ atk: 'rain' }], tag: 'any' },
        { name: 'kick-back',    steps: [{ atk: 'kick' }, { move: 'back' }], tag: 'near' },
        { name: 'backstep-arrow', steps: [{ move: 'back' }, { atk: 'arrow' }], tag: 'near' }
      ],
      2: [
        { name: 'triple',       steps: [{ atk: 'triple' }], tag: 'far' },
        { name: 'pierce',       steps: [{ atk: 'pierce' }], tag: 'far' },
        { name: 'arrow-pierce', steps: [{ atk: 'arrow' }, { wait: 0.3 }, { atk: 'pierce' }], tag: 'far' },
        { name: 'rain-arrow',   steps: [{ atk: 'rain' }, { atk: 'arrow' }], tag: 'any' },
        { name: 'kick-rain',    steps: [{ atk: 'kick' }, { move: 'back' }, { atk: 'rain' }], tag: 'near' },
        { name: 'backstep-triple', steps: [{ move: 'back' }, { atk: 'triple' }], tag: 'near' }
      ]
    },

    /* ---- 훅: 거리에 따라 패턴 풀을 고른다 -------------------------------- */
    onPickPattern: function (boss, game) {
      var pool = boss.def.patterns[boss.phase] || boss.def.patterns[1];
      var d = boss.dist();
      var wantNear = d <= RANGE.CROWDED;
      var out = [];
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i];
        if (p.tag === 'any') out.push(p);
        else if (wantNear && p.tag === 'near') out.push(p);
        else if (!wantNear && p.tag === 'far') out.push(p);
        else if (!wantNear && p.tag === 'near' && d <= RANGE.KICK_MAX) out.push(p);
      }
      return out.length ? out : pool;
    }
  };

  global.BOSSES.push(SERAPH);
})(window);
