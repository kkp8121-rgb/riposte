/* =============================================================================
 * RIPOSTE — js/bosses/avarice.js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8 (2026-09-18 재설계)
 * 자기 기술이 없다: 패턴이 직접 부르는 공격은 count(금)·plunder(적) 둘뿐이고,
 * 나머지는 빼앗은 손패({mirror:'loot'})와 플레이어 손패({mirror:'all'})를 되돌려 쓴다.
 * 되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다 — 차별화 검사에 overlapIntended 로 선언.
 * ========================================================================== */
(function (global) {
  'use strict';

  var WINDUP_MULT = 0.80;
  var BASE_WINDUP = { thrust: 0.60, slash: 0.50, arrow: 0.45, slam: 0.85, flicker: 0.55, glow: 0.50, ward: 0.80 };
  function w(k) { return +(BASE_WINDUP[k] * WINDUP_MULT).toFixed(4); }

  /* 손패 기술 id → 이 보스의 되돌림 공격 id */
  var MIRROR_MAP = {
    THRUST: 'thrust', SLASH: 'slash', KICK: 'slash', ARROW: 'arrow', SHOCKWAVE: 'arrow', SLAM: 'slam',
    FLICKER: 'flicker', GLOW: 'glow', TWIN: 'slash', BOLT: 'arrow', VOLLEY: 'arrow', WARD: 'ward', COUNT: 'count'
  };

  var AVARICE = {
    key: 'avarice',
    name: 'AVARICE',
    title: 'THE TAKER',
    color: '#ff2fa6',
    silhouette: 'taker',
    overlapIntended: '되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다 (스펙 §3.8)',
    hp: 400,
    par: 55,                    // Task 3 봇 실측 확정 (숙련 29.9s ×2 = 60, 기존 55 와 차이 <10 → 유지)
    armor: false,
    stealOnHit: true,
    spawnX: 680,
    droneHz: 41.20,             // E1
    weaponTip: { dx: 40, dy: 60 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    mirrorGap: 0.35,
    fallbackAttack: 'count',    // loot·손패가 비면 — 플레이어가 첫 카드를 훔칠 유일한 금색
    windupMultNote: WINDUP_MULT,
    mirrorMap: MIRROR_MAP,

    attacks: {
      /* ---- 직접 호출하는 둘 ------------------------------------------------ */
      count: {                                     // "하나, 둘, 셋" — 느린 큰 휘두르기 (금)
        id: 'count', label: 'COUNT', tell: 'gold', kind: 'melee',
        windup: 0.90, active: 0.14, recover: 0.70,
        reach: 190, approach: 50, damage: 1, swing: 'arc',
        steal: { id: 'COUNT', label: 'COUNT', kind: 'slash', damage: 25 }
      },
      plunder: {                                   // 적 잡기 — 손패 전부 강탈, 대시로만 회피
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'melee',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 230, approach: 90, damage: 1, swing: 'thrust', plunder: true,
        steal: null
      },
      /* ---- 되돌림용 (패턴이 직접 부르지 않는다) --------------------------- */
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
      glow: {
        id: 'glow', label: 'GLOW', tell: 'gold', kind: 'projectile',
        windup: w('glow'), active: 0.06, recover: 0.42,
        proj: { speed: 240, r: 11, y: 50, damage: 1, reflectDamage: 12, shape: 'wave' },
        steal: { id: 'GLOW', label: 'GLOW', kind: 'shot', damage: 12 }
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: w('ward'), active: 0.12, recover: 0.56,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 30 }
      }
    },

    patterns: {
      1: [
        { name: 'loot',        steps: [{ mirror: 'loot' }] },
        { name: 'loot-loot',   steps: [{ mirror: 'loot' }, { mirror: 'loot' }] },
        { name: 'close-loot',  steps: [{ move: 'close' }, { mirror: 'loot' }] },
        { name: 'plunder',     steps: [{ atk: 'plunder' }] }
      ],
      2: [
        { name: 'mirror-hand', steps: [{ mirror: 'all' }] },
        { name: 'loot-chain',  steps: [{ mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }] },
        { name: 'plunder-loot', steps: [{ atk: 'plunder' }, { mirror: 'loot' }] },
        { name: 'count',       steps: [{ atk: 'count' }] }
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
