/* =============================================================================
 * RIPOSTE — js/bosses/avarice.js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8 · 2026-09-23 재설계 §2.4
 * 끌어당김 — "저도 걷는 사람이라서요". haul(금)은 끌어와 베고, plunder(적)는 끌어와 손패 전부를 걷는다.
 * 빼앗은 손패({mirror:'loot'})와 플레이어 손패({mirror:'all'})를 되돌려 쓴다 — 되돌림 대상은 자기 카드(COUNT·HAUL)뿐이다
 * (보스마다 손패가 비워지므로 다른 보스의 카드는 이 전투에 없다).
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 손패 기술 id → 이 보스의 되돌림 공격 id. 이 전투의 손패에는 AVARICE 가 준 카드만 있다 */
  var MIRROR_MAP = { COUNT: 'count', HAUL: 'haul' };

  var AVARICE = {
    key: 'avarice',
    name: 'AVARICE',
    title: 'THE TAKER',
    color: '#ff2fa6',
    silhouette: 'taker',
    hp: 400,
    par: 55,                    // Task 3 봇 실측 확정 (숙련 29.9s ×2 = 60, 기존 55 와 차이 <10 → 유지)
    armor: false,
    stealOnHit: true,
    spawnX: 680,
    droneHz: 41.20,             // E1
    arena: 'gate',             /* 아레나 (C.ARENA) */
    /* 드론 변주 (약탈자 — 가장 불안하게 흔들린다) — 작곡이 아니라 파라미터다 */
    drone: { wave: 'sawtooth', lfo: 0.9, lfoDepth: 260, cutoff: 620, cutoffP2: 1600, detune: 40 },
    weaponTip: { dx: 40, dy: 60 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    mirrorGap: 0.35,
    fallbackAttack: 'count',    // loot·손패가 비면 — 플레이어가 첫 카드를 훔칠 유일한 금색
    mirrorMap: MIRROR_MAP,

    attacks: {
      count: {                                     // 기본기 · fallback — 플레이어가 첫 카드를 훔칠 금색
        id: 'count', label: 'COUNT', tell: 'gold', kind: 'melee',
        windup: 0.90, active: 0.14, recover: 0.70,
        reach: 190, approach: 50, damage: 1, swing: 'arc',
        steal: { id: 'COUNT', label: 'COUNT', kind: 'slash', damage: 25 }
      },
      haul: {                                      // 끌어당김 + 금 타격 (§3.5) — 걸어서 버티면 헛친다
        id: 'haul', label: 'HAUL', tell: 'gold', kind: 'pull',
        windup: 0.90, active: 0.12, recover: 0.60,
        reach: 150, damage: 1, swing: 'arc',
        pull: { speed: 170 },
        steal: { id: 'HAUL', label: 'HAUL', kind: 'slash', damage: 20 }
      },
      plunder: {                                   // 끌어당김 + 적 잡기 — 피해 1 + 손패 전부 강탈, 대시로만
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'pull',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 170, damage: 1, swing: 'thrust', plunder: true,
        pull: { speed: 150 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'loot',        steps: [{ mirror: 'loot' }] },
        { name: 'haul',        steps: [{ atk: 'haul' }] },
        { name: 'close-loot',  steps: [{ move: 'close' }, { mirror: 'loot' }] },
        { name: 'plunder-haul', steps: [{ atk: 'plunder' }, { atk: 'haul' }] }
      ],
      2: [
        { name: 'mirror-hand', steps: [{ mirror: 'all' }] },
        { name: 'haul-loot',   steps: [{ atk: 'haul' }, { mirror: 'loot' }] },
        { name: 'plunder-loot', steps: [{ atk: 'plunder' }, { mirror: 'loot' }] },
        { name: 'loot-chain',  steps: [{ mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }] }
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
