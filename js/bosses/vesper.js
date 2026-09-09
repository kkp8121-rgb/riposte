/* =============================================================================
 * RIPOSTE — js/bosses/vesper.js
 * VESPER — 결투가 (튜토리얼 보스). 스펙 §3.1
 * 이 파일이 Vesper 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VESPER = {
    key: 'vesper',
    name: 'VESPER',
    title: 'THE DUELIST',
    color: '#ff4d6d',
    silhouette: 'rapier',      // 가느다란 레이피어 결투가
    hp: 100,
    par: 60,
    armor: false,
    spawnX: 660,
    droneHz: 55,               // A1
    weaponTip: { dx: 52, dy: 58 },

    /* 선호 거리 — close 보다 가까우면 물러나고, far 보다 멀면 붙는다 */
    prefer: { close: 105, far: 285, back: 200 },

    /* 패턴 사이 간격: P1 은 느리게 열어서 패리를 몸으로 가르친다 */
    gap: { 1: 0.95, 2: 0.55 },

    /* ---- 공격 테이블 (스펙 §3.1) ---------------------------------------- */
    attacks: {
      thrust: {
        id: 'thrust', label: 'THRUST', tell: 'gold', kind: 'melee',
        windup: 0.60, active: 0.10, recover: 0.55,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'THRUST', label: 'THRUST', kind: 'lunge', damage: 16 }
      },
      slash: {
        id: 'slash', label: 'SLASH', tell: 'gold', kind: 'melee',
        windup: 0.50, active: 0.10, recover: 0.50,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: { id: 'SLASH', label: 'SLASH', kind: 'slash', damage: 14 }
      },
      coup: {                                    // P2 전용, 패리 불가
        id: 'coup', label: 'COUP', tell: 'red', kind: 'melee',
        windup: 0.90, active: 0.14, recover: 0.80,
        reach: 210, approach: 120, damage: 1, swing: 'thrust',
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.1) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'thrust',       steps: [{ atk: 'thrust' }] },
        { name: 'slash',        steps: [{ atk: 'slash' }] },
        { name: 'close-slash',  steps: [{ move: 'close' }, { atk: 'slash' }] },
        { name: 'double-thrust', steps: [{ atk: 'thrust' }, { wait: 0.6 }, { atk: 'thrust' }] }
      ],
      2: [
        { name: 'thrust-slash', steps: [{ atk: 'thrust' }, { wait: 0.25 }, { atk: 'slash' }] },
        { name: 'coup',         steps: [{ atk: 'coup' }] },
        { name: 'slash-thrust', steps: [{ atk: 'slash' }, { wait: 0.2 }, { atk: 'thrust' }] },
        { name: 'back-thrust',  steps: [{ move: 'back' }, { atk: 'thrust' }] }
      ]
    },

    /* ---- 훅 -------------------------------------------------------------- */
    /* 튜토리얼 프롬프트는 Vesper P1 에서만 동작한다 (game.js 가 참조) */
    tutorial: true
  };

  global.BOSSES.push(VESPER);
})(window);
