/* =============================================================================
 * RIPOSTE — js/bosses/bastion.js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기). 스펙 §3.7
 * 반사돼 돌아온 투사체를 되받아친다(boss.js tryDeflect). 되받은 직후 경직에만 카운터가 열린다.
 * 아머: Graven 규칙 계승 — 엠파워 리포스트만 interrupt.
 * ========================================================================== */
(function (global) {
  'use strict';

  var BASTION = {
    key: 'bastion',
    name: 'BASTION',
    title: 'THE WARDEN',
    color: '#a8b8c8',
    silhouette: 'hammer',       // 기존 실루엣 재사용 — 색으로 구분
    hp: 310,
    par: 50,
    armor: true,
    deflect: true,              // 확률·사거리·경직은 CONFIG.BOSS.DEFLECT_*
    spawnX: 700,
    droneHz: 46.25,             // F#1
    weaponTip: { dx: 58, dy: 76 },

    prefer: { close: 150, far: 330, back: 220 },
    gap: { 1: 0.75, 2: 0.55 },

    attacks: {
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: 0.80, active: 0.12, recover: 0.60,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 30 }
      },
      salvo: {                                     // 지면 투사체 — 반사되면 deflect 대상
        id: 'salvo', label: 'VOLLEY', tell: 'gold', kind: 'projectile',
        windup: 0.65, active: 0.10, recover: 0.55,
        proj: { speed: 280, r: 13, y: 18, damage: 1, reflectDamage: 20, shape: 'wave' },
        steal: { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 }
      },
      bulwark: {                                   // P2 전용, 패리 불가 돌진
        id: 'bulwark', label: 'BULWARK', tell: 'red', kind: 'charge',
        windup: 0.70, active: 0.10, recover: 0.30,
        charge: { speed: 880, damage: 1, wallStun: 0.9 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'ward',        steps: [{ atk: 'ward' }] },
        { name: 'salvo',       steps: [{ atk: 'salvo' }] },
        { name: 'salvo-ward',  steps: [{ atk: 'salvo' }, { wait: 0.4 }, { atk: 'ward' }] },
        { name: 'close-ward',  steps: [{ move: 'close' }, { atk: 'ward' }] }
      ],
      2: [
        { name: 'bulwark',      steps: [{ atk: 'bulwark' }] },
        { name: 'salvo-salvo',  steps: [{ atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'salvo-ward',   steps: [{ atk: 'salvo' }, { wait: 0.4 }, { atk: 'ward' }] },
        { name: 'ward-ward',    steps: [{ atk: 'ward' }, { wait: 0.35 }, { atk: 'ward' }] }
      ]
    }
  };

  global.BOSSES.push(BASTION);
})(window);
