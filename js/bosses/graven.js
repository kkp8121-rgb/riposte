/* =============================================================================
 * RIPOSTE — js/bosses/graven.js
 * GRAVEN — 거한 (아머). 스펙 §3.3
 * 아머: 일반 리포스트로는 flinch/interrupt 되지 않는다. 엠파워 리포스트만 통한다.
 *       벽 충돌 경직 중에는 모든 리포스트가 카운터 판정.
 * ========================================================================== */
(function (global) {
  'use strict';

  var GRAVEN = {
    key: 'graven',
    name: 'GRAVEN',
    title: 'THE BULWARK',
    color: '#ffb347',
    silhouette: 'hammer',       // 거대한 망치를 든 거한
    hp: 250,
    par: 80,
    armor: true,
    spawnX: 700,
    droneHz: 43.65,             // F1
    weaponTip: { dx: 58, dy: 76 },

    prefer: { close: 150, far: 330, back: 220 },
    gap: { 1: 0.75, 2: 0.55 },

    /* ---- 공격 테이블 (스펙 §3.3) ---------------------------------------- */
    attacks: {
      slam: {
        id: 'slam', label: 'SLAM', tell: 'gold', kind: 'melee',
        windup: 0.85, active: 0.12, recover: 0.65,
        reach: 180, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'SLAM', label: 'SLAM', kind: 'slam', damage: 28 }
      },
      shockwave: {
        id: 'shockwave', label: 'SHOCKWAVE', tell: 'gold', kind: 'projectile',
        windup: 0.70, active: 0.10, recover: 0.55,
        proj: { speed: 300, r: 13, y: 18, damage: 1, reflectDamage: 14, shape: 'wave' },
        steal: { id: 'SHOCKWAVE', label: 'SHOCKWAVE', kind: 'shot', damage: 14 }
      },
      charge: {
        id: 'charge', label: 'CHARGE', tell: 'red', kind: 'charge',
        windup: 0.70, active: 0.10, recover: 0.30,
        charge: { speed: 880, damage: 1, wallStun: 0.9 },
        steal: null
      }
    },

    /* ---- 패턴 ------------------------------------------------------------ */
    patterns: {
      1: [
        { name: 'slam',        steps: [{ atk: 'slam' }] },
        { name: 'shockwave',   steps: [{ atk: 'shockwave' }] },
        { name: 'charge',      steps: [{ atk: 'charge' }] },
        { name: 'wave-slam',   steps: [{ atk: 'shockwave' }, { wait: 0.4 }, { atk: 'slam' }] }
      ],
      2: [
        /* double slam — 0.35s 간격, 둘 다 패리 가능 */
        { name: 'double-slam', steps: [{ atk: 'slam' }, { wait: 0.35 }, { atk: 'slam' }] },
        /* charge → slam — 돌진 후 즉시 slam (벽 경직이 풀리면 이어진다) */
        { name: 'charge-slam', steps: [{ atk: 'charge' }, { atk: 'slam' }] },
        { name: 'wave-wave',   steps: [{ atk: 'shockwave' }, { wait: 0.45 }, { atk: 'shockwave' }] },
        { name: 'slam',        steps: [{ atk: 'slam' }] }
      ]
    }
  };

  global.BOSSES.push(GRAVEN);
})(window);
