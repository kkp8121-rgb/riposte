/* =============================================================================
 * RIPOSTE — js/bosses/chorus.js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6
 * 근접 연타(volley): 한 공격이 count 번 타격하고 타격 사이는 interval 의 짧은 windup +
 * 새 플래시다 (boss.js updateAttack). 성공 시 단축 리커버리(§2.3)를 몸으로 익힌다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var CHORUS = {
    key: 'chorus',
    name: 'CHORUS',
    title: 'THE TWIN BLADES',
    color: '#4d9dff',
    silhouette: 'spear',
    hp: 300,
    par: 45,
    armor: false,
    spawnX: 680,
    droneHz: 65.41,            // C2
    weaponTip: { dx: 56, dy: 60 },

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
      lance: {                                     // P2 전용, 패리 불가 돌진
        id: 'lance', label: 'LANCE', tell: 'red', kind: 'charge',
        windup: 0.65, active: 0.10, recover: 0.30,
        charge: { speed: 900, damage: 1, wallStun: 0.7 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'twin',        steps: [{ atk: 'twin' }] },
        { name: 'bolt',        steps: [{ atk: 'bolt' }] },
        { name: 'bolt-twin',   steps: [{ atk: 'bolt' }, { wait: 0.35 }, { atk: 'twin' }] },
        { name: 'close-twin',  steps: [{ move: 'close' }, { atk: 'twin' }] }
      ],
      2: [
        { name: 'triad',       steps: [{ atk: 'triad' }] },
        { name: 'lance',       steps: [{ atk: 'lance' }] },
        { name: 'lance-triad', steps: [{ atk: 'lance' }, { atk: 'triad' }] },
        { name: 'bolt-bolt-twin', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { move: 'close' }, { atk: 'twin' }] }
      ]
    }
  };

  global.BOSSES.push(CHORUS);
})(window);
