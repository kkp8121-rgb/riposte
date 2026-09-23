/* =============================================================================
 * RIPOSTE — js/bosses/bastion.js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기 + 문). 스펙 §3.7 · 2026-09-23 재설계 §2.4
 * gate 는 플레이어 등 뒤에 서는 기둥 — 물러설 곳이 막혀 아머 보스를 정면으로 받아낸다.
 * cage(P2)는 등 뒤 + 사이에 둘 — 투사체만 오가는 방에서 되받아치기 랠리.
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
    arena: 'gate',             /* 아레나 (C.ARENA) */
    /* 드론 변주 (수문장 — 거의 멈춘 저역 벽) — 작곡이 아니라 파라미터다 */
    drone: { wave: 'square', lfo: 0.06, lfoDepth: 40, cutoff: 200, cutoffP2: 560, detune: 8 },
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
      gate: {                                      // 기둥 — 등 뒤 150px, 4초 (§3.6)
        id: 'gate', label: 'GATE', tell: 'red', kind: 'pillar',
        windup: 0.90, active: 0.10, recover: 0.50,
        pillar: { w: 34, up: 4.0, dist: 150, count: 1, damage: 1 },
        steal: null
      },
      cage: {                                      // P2 — 등 뒤 + 플레이어·보스 사이. 칸이 좁으면 서지 않는다
        id: 'cage', label: 'CAGE', tell: 'red', kind: 'pillar',
        windup: 0.95, active: 0.10, recover: 0.55,
        pillar: { w: 34, up: 3.5, dist: 150, count: 2, damage: 1 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'salvo',           steps: [{ atk: 'salvo' }] },
        { name: 'gate-salvo',      steps: [{ atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'far-salvo-salvo', steps: [{ move: 'far' }, { atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'gate-wait-salvo', steps: [{ atk: 'gate' }, { wait: 0.5 }, { atk: 'salvo' }] }
      ],
      2: [
        { name: 'cage-rally',      steps: [{ atk: 'cage' }, { atk: 'salvo' }, { wait: 0.4 }, { atk: 'salvo' }] },
        { name: 'gate-salvo-salvo', steps: [{ atk: 'gate' }, { atk: 'salvo' }, { atk: 'salvo' }] },
        { name: 'far-gate-salvo',  steps: [{ move: 'far' }, { atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'salvo-far-salvo', steps: [{ atk: 'salvo' }, { move: 'far' }, { atk: 'salvo' }] }
      ]
    }
  };

  global.BOSSES.push(BASTION);
})(window);
