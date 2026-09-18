/* =============================================================================
 * RIPOSTE — js/bosses/lantern.js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5 (2026-09-18 재설계)
 * 색 읽기(금/적 쌍둥이) + 등 뒤 순간이동(move:'behind'). 챕터 1 은 보스가 항상 정면에서 온다.
 * 이 파일이 Lantern 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var LANTERN = {
    key: 'lantern',
    name: 'LANTERN',
    title: 'THE ILLUSIONIST',
    color: '#7dff9a',
    silhouette: 'lantern',
    hp: 280,
    par: 45,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: false,
    spawnX: 660,
    droneHz: 61.74,             // B1
    weaponTip: { dx: 44, dy: 58 },

    prefer: { close: 110, far: 290, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    attacks: {
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      'flicker-red': {                             // flicker 와 동일 박자·리치 — 색만 다르다
        id: 'flicker-red', label: 'FLICKER', tell: 'red', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: null
      },
      glow: {                                      // 느린 빛 구슬 — 패리 시 반사
        id: 'glow', label: 'GLOW', tell: 'gold', kind: 'projectile',
        windup: 0.50, active: 0.06, recover: 0.45,
        proj: { speed: 240, r: 11, y: 50, damage: 1, reflectDamage: 12, shape: 'wave' },
        steal: { id: 'GLOW', label: 'GLOW', kind: 'shot', damage: 12 }
      }
    },

    patterns: {
      1: [
        { name: 'behind-flicker',      steps: [{ move: 'behind' }, { atk: 'flicker' }] },
        { name: 'flicker-red',         steps: [{ atk: 'flicker-red' }] },
        { name: 'glow-behind-flicker', steps: [{ atk: 'glow' }, { move: 'behind' }, { atk: 'flicker' }] },
        { name: 'color-rhythm',        steps: [{ atk: 'flicker' }, { wait: 0.3 }, { atk: 'flicker-red' }, { wait: 0.3 }, { atk: 'flicker' }] }
      ],
      2: [
        { name: 'behind-flicker-red',  steps: [{ move: 'behind' }, { atk: 'flicker-red' }] },
        { name: 'glow-glow-behind',    steps: [{ atk: 'glow' }, { wait: 0.3 }, { atk: 'glow' }, { move: 'behind' }, { atk: 'flicker' }] },
        { name: 'double-blink',        steps: [{ move: 'behind' }, { atk: 'flicker' }, { move: 'behind' }, { atk: 'flicker-red' }] },
        { name: 'red-gold',            steps: [{ atk: 'flicker-red' }, { wait: 0.25 }, { atk: 'flicker' }] }
      ]
    }
  };

  global.BOSSES.push(LANTERN);
})(window);
