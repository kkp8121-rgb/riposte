/* =============================================================================
 * RIPOSTE — js/bosses/mirror.js
 * MIRROR — 거울 (최종). 스펙 §3.4
 * 실루엣 = 플레이어와 동일(백색). 앞선 보스들의 기술을 windup ×0.85 로 쓴다.
 * P2 의 mirror 스텝은 플레이어 손패에 든 기술을 순서대로 그대로 되돌려준다.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 원본 보스들의 windup 을 그대로 가져와 배수만 건다 (스펙: windup ×0.85) */
  var WINDUP_MULT = 0.85;
  var BASE_WINDUP = { thrust: 0.60, slash: 0.50, arrow: 0.45, slam: 0.85 };
  function w(k) { return +(BASE_WINDUP[k] * WINDUP_MULT).toFixed(4); }

  /* 손패 기술 id → 이 보스의 공격 id (거울 반사표) */
  var MIRROR_MAP = {
    THRUST: 'thrust',
    SLASH: 'slash',
    KICK: 'slash',
    ARROW: 'arrow',
    SHOCKWAVE: 'arrow',
    SLAM: 'slam'
  };

  var MIRROR = {
    key: 'mirror',
    name: 'MIRROR',
    title: 'YOUR REFLECTION',
    color: '#ffffff',
    silhouette: 'mirror',       // 플레이어 실루엣, 백색
    hp: 200,
    par: 100,
    armor: false,
    spawnX: 680,
    droneHz: 49.0,              // G1
    weaponTip: { dx: 46, dy: 56 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.7, 2: 0.45 },

    /* feint 타이밍 (스펙 §3.4: 0.45s 뒤 두 번째 플래시) */
    feintHold: 0.45,
    feintSecond: 0.30,
    mirrorGap: 0.35,
    fallbackAttack: 'thrust',

    windupMultNote: WINDUP_MULT,
    mirrorMap: MIRROR_MAP,

    /* ---- 공격 테이블 ----------------------------------------------------- */
    attacks: {
      thrust: {
        id: 'thrust', label: 'THRUST', tell: 'gold', kind: 'melee',
        windup: w('thrust'), active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'THRUST', label: 'THRUST', kind: 'lunge', damage: 16 }
      },
      slash: {
        id: 'slash', label: 'SLASH', tell: 'gold', kind: 'melee',
        windup: w('slash'), active: 0.10, recover: 0.46,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: { id: 'SLASH', label: 'SLASH', kind: 'slash', damage: 14 }
      },
      arrow: {
        id: 'arrow', label: 'ARROW', tell: 'gold', kind: 'projectile',
        windup: w('arrow'), active: 0.06, recover: 0.42,
        proj: { speed: 560, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
        steal: { id: 'ARROW', label: 'ARROW', kind: 'shot', damage: 10 }
      },
      slam: {
        id: 'slam', label: 'SLAM', tell: 'gold', kind: 'melee',
        windup: w('slam'), active: 0.12, recover: 0.60,
        reach: 180, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'SLAM', label: 'SLAM', kind: 'slam', damage: 28 }
      },
      execution: {                               // 적 — 대시로만 회피, 피해 2
        id: 'execution', label: 'EXECUTION', tell: 'red', kind: 'melee',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 240, approach: 90, damage: 2, swing: 'thrust',
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.4) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'thrust',       steps: [{ atk: 'thrust' }] },
        { name: 'feint-thrust', steps: [{ feint: 'thrust' }] },
        { name: 'slash-thrust', steps: [{ atk: 'slash' }, { wait: 0.25 }, { atk: 'thrust' }] },
        { name: 'arrow-close-slash', steps: [{ atk: 'arrow' }, { move: 'close' }, { atk: 'slash' }] },
        { name: 'slam',         steps: [{ atk: 'slam' }] }
      ],
      2: [
        { name: 'mirror-hand',  steps: [{ mirror: 'all' }] },
        { name: 'feint-slash-thrust', steps: [{ feint: 'slash' }, { wait: 0.2 }, { atk: 'thrust' }] },
        { name: 'execution',    steps: [{ atk: 'execution' }] },
        { name: 'arrow-arrow-slam', steps: [{ atk: 'arrow' }, { wait: 0.3 }, { atk: 'arrow' }, { wait: 0.35 }, { atk: 'slam' }] }
      ]
    },

    /* ---- 훅: 플레이어 손패를 그대로 되돌려준다 ---------------------------- */
    mirrorIds: function (boss, game) {
      var hand = game.player.hand;
      var ids = [];
      for (var i = 0; i < hand.length; i++) {
        var id = MIRROR_MAP[hand[i].id];
        if (id) ids.push(id);
      }
      if (!ids.length) ids.push(boss.def.fallbackAttack);
      return ids;
    }
  };

  global.BOSSES.push(MIRROR);
})(window);
