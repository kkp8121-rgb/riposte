/* =============================================================================
 * RIPOSTE — js/bosses/chorus.js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6 (2026-09-18 재설계)
 * 근접 연타(volley 재-windup) + 좌우 교차(move:'cross' — 플레이어를 지나쳐 반대편으로).
 * ========================================================================== */
(function (global) {
  'use strict';

  var CHORUS = {
    key: 'chorus',
    name: 'CHORUS',
    title: 'THE TWIN BLADES',
    color: '#4d9dff',
    silhouette: 'twin',
    hp: 300,
    par: 45,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: false,
    spawnX: 680,
    droneHz: 65.41,             // C2
    weaponTip: { dx: 46, dy: 60 },

    prefer: { close: 115, far: 300, back: 210 },
    gap: { 1: 0.75, 2: 0.5 },

    attacks: {
      twin: {
        id: 'twin', label: 'TWIN', tell: 'gold', kind: 'melee',
        windup: 0.45, active: 0.10, recover: 0.40,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        volley: { count: 2, interval: 0.35 },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      bolt: {
        id: 'bolt', label: 'BOLT', tell: 'gold', kind: 'projectile',
        windup: 0.42, active: 0.06, recover: 0.45,
        proj: { speed: 600, r: 7, y: 52, damage: 1, reflectDamage: 11, shape: 'bolt' },
        steal: { id: 'BOLT', label: 'BOLT', kind: 'shot', damage: 11 }
      },
      triad: {                                     // P2 전용 3연타
        id: 'triad', label: 'TRIAD', tell: 'gold', kind: 'melee',
        windup: 0.50, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        volley: { count: 3, interval: 0.35 },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      scissor: {                                   // P2 전용 — 양쪽을 동시에 베는 가위, 대시로만 회피
        id: 'scissor', label: 'SCISSOR', tell: 'red', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.70,
        reach: 200, approach: 40, damage: 1, swing: 'arc',
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'cross-twin',       steps: [{ move: 'cross' }, { atk: 'twin' }] },
        { name: 'twin',             steps: [{ atk: 'twin' }] },
        { name: 'bolt-cross-twin',  steps: [{ atk: 'bolt' }, { move: 'cross' }, { atk: 'twin' }] },
        { name: 'weave',            steps: [{ move: 'cross' }, { atk: 'twin' }, { move: 'cross' }, { atk: 'twin' }] }
      ],
      2: [
        { name: 'triad',            steps: [{ atk: 'triad' }] },
        { name: 'cross-triad-scissor', steps: [{ move: 'cross' }, { atk: 'triad' }, { atk: 'scissor' }] },
        { name: 'bolt-bolt-cross-triad', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { move: 'cross' }, { atk: 'triad' }] },
        { name: 'scissor',          steps: [{ atk: 'scissor' }] }
      ]
    }
  };

  global.BOSSES.push(CHORUS);
})(window);
