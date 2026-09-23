/* =============================================================================
 * RIPOSTE — js/bosses/hollow.js
 * HOLLOW — 어둠 (챕터 3 세 번째 보스). 스펙 §3.11 · 2026-09-23 재설계 §2.4
 * 설계 축은 "시야" — 아레나가 어두워지고 남는 빛은 텔과, 플레이어 몸에 붙은 표식뿐이다.
 * 표식은 보스를 보지 않고 자기 몸의 카운트다운을 읽게 한다(표식 링은 어둠 위에 그린다).
 * 이 파일이 Hollow 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var HOLLOW = {
    key: 'hollow',
    name: 'HOLLOW',
    title: 'THE DARK',
    color: '#8a7fb0',
    silhouette: 'hollow',      // 무기 없이 키만 크고 몹시 가늘다 — 빈 것
    hp: 300,
    par: 75,                    // 2026-09-19 수정 1: 숙련 승 34.7~42.7s ×2 ≈ 75 · 완벽 25.6s > 75/3. 숙련 2/3 — docs/qa/balance-2026-09-19.md §5 수정 1
    armor: false,
    spawnX: 720,
    droneHz: 40,
    arena: 'void',             /* 아레나 (C.ARENA) — 유일하게 darkness 가 붙은 무대 */
    /* 드론 변주 — 사인파, 거의 흔들리지 않는다. 어둠 속에서 들리는 낮은 울림 */
    drone: { wave: 'sine', lfo: 0.08, lfoDepth: 20, cutoff: 220, cutoffP2: 600, detune: 4 },
    weaponTip: { dx: 40, dy: 70 },

    /* 붙었다 떨어졌다를 반복한다 — 어둠 속에서 거리를 잃게 만드는 것이 이 보스의 이동이다 */
    prefer: { close: 150, far: 380, back: 200 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.9, 2: 0.65 },

    /* ---- 공격 테이블 (스펙 §2.3) ----------------------------------------
     * 표식 둘(brand·brand-red)과 ember 뿐이다 — 전부 읽기 쉽다. brand 는 금(받으면 훔친다),
     * brand-red 는 적(터지는 순간 대시). 둘 다 붙고 1.4초 뒤 터진다 — 보스가 아니라
     * 자기 몸에 붙은 표식의 카운트다운을 읽게 한다.
     * -------------------------------------------------------------------- */
    attacks: {
      brand: {                                     // 금 표식 — 붙고 1.4초 뒤 터진다, 받으면 훔친다 (§3.7)
        id: 'brand', label: 'BRAND', tell: 'gold', kind: 'mark',
        windup: 0.70, active: 0.06, recover: 0.45,
        mark: { delay: 1.40, damage: 1 },
        steal: { id: 'BRAND', label: 'BRAND', kind: 'lunge', damage: 20 }
      },
      'brand-red': {                               // 적 표식 — 터지는 순간 대시
        id: 'brand-red', label: 'BRAND', tell: 'red', kind: 'mark',
        windup: 0.70, active: 0.06, recover: 0.45,
        mark: { delay: 1.40, damage: 1 },
        steal: null
      },
      ember: {                                   // 어둠 속 빛 두 점 — 받아내면 훔친다
        id: 'ember', label: 'EMBER', tell: 'gold', kind: 'projectile',
        windup: 0.72, active: 0.06, recover: 0.50,
        /* 각 탄의 플래시 → 타격 간격은 windup 하나로 고정이다(Global Constraints) */
        proj: { speed: 340, r: 12, y: 44, damage: 1, reflectDamage: 12, shape: 'arrow' },
        volley: { count: 2, interval: 0.45, p2Interval: 0.38 },
        steal: { id: 'EMBER', label: 'EMBER', kind: 'shot', damage: 14 }    // 12 → 14 (09-19 수정 1)
      }
    },

    /* ---- 패턴 (스펙 §2.3) ------------------------------------------------
     * 표식(brand·brand-red)과 ember — 전부 거리와 무관하다(snuff 가 빠져 far 태그가 없다).
     * 🔴 ember 는 반드시 back 뒤에만 쏜다 — 코앞(PARRY_CATCH 안)에서 생성된 탄은 받아낼 수
     *    없다(task-4-report 교훈 1).
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'brand',            steps: [{ atk: 'brand' }] },
        { name: 'back-ember',       steps: [{ move: 'back' }, { atk: 'ember' }] },
        { name: 'brand-back-ember', steps: [{ atk: 'brand' }, { wait: 0.2 }, { move: 'back' }, { atk: 'ember' }] },   // 표식이 도는 동안 탄
        { name: 'back-ember-brand', steps: [{ move: 'back' }, { atk: 'ember' }, { atk: 'brand' }] }
      ],
      2: [
        { name: 'brand-red-brand',      steps: [{ atk: 'brand-red' }, { atk: 'brand' }] },
        { name: 'brand-back-ember',     steps: [{ atk: 'brand' }, { wait: 0.2 }, { move: 'back' }, { atk: 'ember' }] },
        { name: 'back-ember-brand-red', steps: [{ move: 'back' }, { atk: 'ember' }, { atk: 'brand-red' }] },
        { name: 'brand-wait-brand-red', steps: [{ atk: 'brand' }, { wait: 0.3 }, { atk: 'brand-red' }] }
      ]
    }
  };

  global.BOSSES.push(HOLLOW);
})(window);
