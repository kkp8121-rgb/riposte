/* =============================================================================
 * RIPOSTE — js/bosses/bastion.js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기 + 문). 스펙 §3.7 (2026-09-18 재설계)
 * gate 는 보스 앞에 고정되는 적색 존(zone.anchor:'boss') — 문이 닫히면 원거리만 통한다.
 * 되받아치기(boss.js tryDeflect)가 전투의 축. 돌진은 GRAVEN 과 겹쳐 없앴다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var BASTION = {
    key: 'bastion',
    name: 'BASTION',
    title: 'THE WARDEN',
    color: '#a8b8c8',
    silhouette: 'shield',
    hp: 310,
    par: 50,                    // Task 3 봇 실측 확정 (숙련 23.0s ×2 = 46 → 50 유지, 차이 4.0s<10)
    armor: true,
    deflect: true,              // 확률·사거리·경직은 CONFIG.BOSS.DEFLECT_*
    spawnX: 700,
    droneHz: 46.25,             // F#1
    weaponTip: { dx: 44, dy: 68 },

    prefer: { close: 170, far: 360, back: 220 },
    gap: { 1: 0.75, 2: 0.55 },

    attacks: {
      salvo: {                                     // 지면 투사체 — 반사되면 deflect 대상
        id: 'salvo', label: 'VOLLEY', tell: 'gold', kind: 'projectile',
        windup: 0.65, active: 0.10, recover: 0.55,
        proj: { speed: 380, r: 13, y: 18, damage: 1, reflectDamage: 20, shape: 'wave' },
        steal: { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 }
      },
      gate: {                                      // 문 — 보스 앞 고정 존, 대시로만 통과
        id: 'gate', label: 'GATE', tell: 'red', kind: 'zone',
        windup: 1.00, active: 0.10, recover: 0.60,
        zone: { w: 220, damage: 1, anchor: 'boss', offset: 140 },
        steal: null
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: 0.80, active: 0.12, recover: 0.60,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 30 }
      }
    },

    patterns: {
      1: [
        { name: 'salvo',           steps: [{ atk: 'salvo' }] },
        { name: 'gate-salvo',      steps: [{ atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'far-salvo-salvo', steps: [{ move: 'far' }, { atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'ward',            steps: [{ atk: 'ward' }] }
      ],
      2: [
        { name: 'gate-rally',      steps: [{ atk: 'gate' }, { atk: 'salvo' }, { wait: 0.4 }, { atk: 'salvo' }] },
        { name: 'far-gate',        steps: [{ move: 'far' }, { atk: 'gate' }] },
        { name: 'ward-gate',       steps: [{ atk: 'ward' }, { atk: 'gate' }] },
        { name: 'salvo-far-salvo', steps: [{ atk: 'salvo' }, { move: 'far' }, { atk: 'salvo' }] }
      ]
    }
  };

  global.BOSSES.push(BASTION);
})(window);
