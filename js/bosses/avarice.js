/* =============================================================================
 * RIPOSTE — js/bosses/avarice.js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8
 * 실루엣 = 플레이어형. Mirror 세트 + 챕터 2 기술을 windup ×0.80 으로 되돌린다.
 * stealOnHit: 피격마다 손패 맨 앞을 빼앗아(game.js damagePlayer) loot 큐에 넣고,
 * {mirror:'loot'} 스텝이 그것을 순서대로 되돌려 쓴다. plunder 는 손패 전부를 빼앗는다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var WINDUP_MULT = 0.80;
  var BASE_WINDUP = { thrust: 0.60, slash: 0.50, arrow: 0.45, slam: 0.85, flicker: 0.55, bolt: 0.42, ward: 0.80 };
  function w(k) { return +(BASE_WINDUP[k] * WINDUP_MULT).toFixed(4); }

  /* 손패 기술 id → 이 보스의 공격 id (되돌림표). 챕터 2 기술도 되돌린다. */
  var MIRROR_MAP = {
    THRUST: 'thrust', SLASH: 'slash', KICK: 'slash', ARROW: 'arrow', SHOCKWAVE: 'arrow', SLAM: 'slam',
    FLICKER: 'flicker', SWEEP: 'slash', TWIN: 'slash', BOLT: 'bolt', WARD: 'ward', VOLLEY: 'bolt'
  };

  var AVARICE = {
    key: 'avarice',
    name: 'AVARICE',
    title: 'THE TAKER',
    color: '#ff2fa6',
    silhouette: 'mirror',
    hp: 400,
    par: 55,
    armor: false,
    stealOnHit: true,
    spawnX: 680,
    droneHz: 41.20,             // E1
    weaponTip: { dx: 46, dy: 56 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    feintHold: 0.45,
    mirrorGap: 0.35,
    fallbackAttack: 'thrust',
    windupMultNote: WINDUP_MULT,
    mirrorMap: MIRROR_MAP,

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
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: w('flicker'), active: 0.10, recover: 0.48,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      bolt: {
        id: 'bolt', label: 'BOLT', tell: 'gold', kind: 'projectile',
        windup: w('bolt'), active: 0.06, recover: 0.42,
        proj: { speed: 600, r: 7, y: 52, damage: 1, reflectDamage: 11, shape: 'bolt' },
        steal: { id: 'BOLT', label: 'BOLT', kind: 'shot', damage: 11 }
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: w('ward'), active: 0.12, recover: 0.56,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 26 }
      },
      plunder: {                                   // P2 — 적, 대시로만 회피, 손패 전부 강탈
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'melee',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 230, approach: 90, damage: 1, swing: 'thrust', plunder: true,
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.8) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'thrust',        steps: [{ atk: 'thrust' }] },
        { name: 'loot',          steps: [{ mirror: 'loot' }] },
        { name: 'feint-flicker', steps: [{ feint: 'flicker' }] },
        { name: 'arrow-close-slash', steps: [{ atk: 'arrow' }, { move: 'close' }, { atk: 'slash' }] },
        { name: 'ward',          steps: [{ atk: 'ward' }] }
      ],
      2: [
        { name: 'mirror-hand',   steps: [{ mirror: 'all' }] },
        { name: 'plunder',       steps: [{ atk: 'plunder' }] },
        { name: 'loot-thrust',   steps: [{ mirror: 'loot' }, { wait: 0.3 }, { atk: 'thrust' }] },
        { name: 'bolt-bolt-slam', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { wait: 0.35 }, { atk: 'slam' }] }
      ]
    },

    /* ---- 훅: 'loot' 이면 빼앗은 손패, 그 외엔 플레이어 손패를 되돌린다 ---------- */
    mirrorIds: function (boss, game, source) {
      var src = (source === 'loot') ? boss.loot : game.player.hand;
      var ids = [];
      for (var i = 0; i < src.length; i++) {
        var id = MIRROR_MAP[src[i].id];
        if (id) ids.push(id);
      }
      if (!ids.length) ids.push(boss.def.fallbackAttack);
      return ids;
    }
  };

  global.BOSSES.push(AVARICE);
})(window);
