/* =============================================================================
 * RIPOSTE — js/bosses/lantern.js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5 · 2026-09-23 재설계 §2.4
 * 부메랑(적으로 나가 금으로 돌아온다) + 등 뒤 순간이동(move:'behind'). 색이 비행 중에 바뀐다.
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
    par: 65,                    // Task 3 봇 실측 확정 (숙련 33.4s ×2 → 65)
    armor: false,
    spawnX: 660,
    droneHz: 61.74,             // B1
    arena: 'range',             /* 아레나 (C.ARENA) */
    /* 드론 변주 (환술사 — 깜빡이는 컷오프) — 작곡이 아니라 파라미터다 */
    drone: { wave: 'triangle', lfo: 0.33, lfoDepth: 220, cutoff: 360, cutoffP2: 900, detune: 14 },
    weaponTip: { dx: 44, dy: 58 },

    prefer: { close: 110, far: 290, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    attacks: {
      flicker: {                                   // 기본기 — 챕터 1 과 서명이 같은 유일한 공격 (스펙 2026-09-23 §2.1)
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      orb: {                                       // 부메랑 — 적으로 가서 등 뒤에서 금으로 돌아온다 (§3.2)
        id: 'orb', label: 'ORB', tell: 'red', kind: 'boomerang',
        windup: 0.60, active: 0.06, recover: 0.50,
        proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        boomerang: { turnDist: 200, backTime: 0.60, backTell: 'gold' },
        steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 }
      },
      orb2: {                                      // P2 — 두 발. 간격 0.30 은 대시 한 번(무적 0.20s)에 둘 다 넘는 폭
        id: 'orb2', label: 'ORB', tell: 'red', kind: 'boomerang',
        windup: 0.55, active: 0.06, recover: 0.55,
        proj: { speed: 340, r: 11, y: 50, damage: 1, reflectDamage: 14, shape: 'arrow' },
        boomerang: { turnDist: 200, backTime: 0.60, backTell: 'gold' },
        volley: { count: 2, interval: 0.30 },
        steal: { id: 'ORB', label: 'ORB', kind: 'shot', damage: 14 }
      }
    },

    patterns: {
      1: [
        { name: 'behind-flicker',   steps: [{ move: 'behind' }, { atk: 'flicker' }] },
        { name: 'orb',              steps: [{ atk: 'orb' }] },
        { name: 'far-orb',          steps: [{ move: 'far' }, { atk: 'orb' }] },
        { name: 'flicker-orb',      steps: [{ atk: 'flicker' }, { wait: 0.5 }, { atk: 'orb' }] }
      ],
      2: [
        { name: 'orb2',             steps: [{ atk: 'orb2' }] },
        { name: 'behind-flicker-orb', steps: [{ move: 'behind' }, { atk: 'flicker' }, { atk: 'orb' }] },
        { name: 'orb-behind-flicker', steps: [{ atk: 'orb' }, { move: 'behind' }, { atk: 'flicker' }] },   // 귀환 중 순간이동 — P2 만 (§2.4)
        { name: 'double-blink',     steps: [{ move: 'behind' }, { atk: 'flicker' }, { move: 'behind' }, { atk: 'flicker' }] }
      ]
    }
  };

  global.BOSSES.push(LANTERN);
})(window);
