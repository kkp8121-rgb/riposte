/* =============================================================================
 * RIPOSTE — js/bosses/lantern.js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5
 * 같은 박자·같은 리치의 금/적 쌍둥이 공격. 리듬 암기가 통하지 않고 색이 정보의 전부다.
 * 이 파일이 Lantern 의 모든 수치를 소유한다. 엔진 변경 0.
 * ========================================================================== */
(function (global) {
  'use strict';

  var LANTERN = {
    key: 'lantern',
    name: 'LANTERN',
    title: 'THE ILLUSIONIST',
    color: '#7dff9a',
    silhouette: 'blade',
    hp: 280,
    par: 60,
    armor: false,
    spawnX: 660,
    droneHz: 61.74,            // B1
    weaponTip: { dx: 48, dy: 58 },

    prefer: { close: 110, far: 290, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    /* ---- 공격 테이블 — 금/적 쌍둥이는 색 말고 전부 같다 ------------------- */
    attacks: {
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      'flicker-red': {
        id: 'flicker-red', label: 'FLICKER', tell: 'red', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: null
      },
      sweep: {
        id: 'sweep', label: 'SWEEP', tell: 'gold', kind: 'melee',
        windup: 0.48, active: 0.10, recover: 0.48,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: { id: 'SWEEP', label: 'SWEEP', kind: 'slash', damage: 15 }
      },
      'sweep-red': {                               // P2 전용
        id: 'sweep-red', label: 'SWEEP', tell: 'red', kind: 'melee',
        windup: 0.48, active: 0.10, recover: 0.48,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.5) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'flicker',        steps: [{ atk: 'flicker' }] },
        { name: 'flicker-red',    steps: [{ atk: 'flicker-red' }] },
        { name: 'sweep-flicker',  steps: [{ atk: 'sweep' }, { wait: 0.3 }, { atk: 'flicker' }] },
        { name: 'close-sweep',    steps: [{ move: 'close' }, { atk: 'sweep' }] }
      ],
      2: [
        { name: 'flicker-flicker-red', steps: [{ atk: 'flicker' }, { wait: 0.25 }, { atk: 'flicker-red' }] },
        { name: 'sweep-red-flicker',   steps: [{ atk: 'sweep-red' }, { wait: 0.25 }, { atk: 'flicker' }] },
        { name: 'feint-flicker',       steps: [{ feint: 'flicker' }] },
        { name: 'back-flicker-red',    steps: [{ move: 'back' }, { atk: 'flicker-red' }] }
      ]
    }
  };

  global.BOSSES.push(LANTERN);
})(window);
