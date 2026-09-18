/* =============================================================================
 * RIPOSTE — js/bosses/sentinel.js
 * SENTINEL — 창의 파수꾼 (챕터 3 첫 보스). 스펙 §2.1
 * 이 파일이 Sentinel 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var SENTINEL = {
    key: 'sentinel',
    name: 'SENTINEL',
    title: 'THE SPEAR',
    color: '#8fe3c8',
    silhouette: 'spear',       // 키 큰 파수꾼 + 긴 창
    hp: 320,
    par: 50,                    // 2026-09-19 실측: 숙련 22.0~43.8s(중앙 27.6) · 완벽 17.5~27.1s — 17.54 < 55/3 라 하향. docs/qa/balance-2026-09-19.md
    armor: false,
    spawnX: 700,
    droneHz: 46,
    arena: 'wall',             /* 아레나 (C.ARENA) */
    /* 드론 변주 — 삼각파 + 얕은 LFO. 움직이지 않는 보스라 소리도 거의 흔들리지 않는다 */
    drone: { wave: 'triangle', lfo: 0.05, lfoDepth: 30, cutoff: 260, cutoffP2: 700, detune: 6 },
    weaponTip: { dx: 66, dy: 54 },

    /* 움직이지 않는다 — prefer 를 넓게 잡아 접근·후퇴 스텝이 발동하지 않게 한다
       (패턴에 move 스텝이 없으므로 실제로 참조될 일도 없다) */
    prefer: { close: 60, far: 860, back: 0 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.85, 2: 0.6 },

    /* ---- 공격 테이블 (스펙 §2.1) ---------------------------------------- */
    attacks: {
      lance: {                                   // 긴 찌르기 — 움직이지 않으므로 리치가 위협의 전부다
        id: 'lance', label: 'LANCE', tell: 'gold', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.55,
        reach: 260, approach: 0, damage: 1, swing: 'thrust',
        steal: { id: 'LANCE', label: 'LANCE', kind: 'lunge', damage: 22 }
      },
      sweep: {                                   // 제자리 광역 — 붙으면 맞는다
        id: 'sweep', label: 'SWEEP', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.12, recover: 0.5,
        reach: 150, approach: 0, damage: 1, swing: 'arc',
        steal: { id: 'SWEEP', label: 'SWEEP', kind: 'slash', damage: 18 }
      },
      claim: {                                   // 설 자리를 지운다 — 지속 구역, 패리 불가
        id: 'claim', label: 'CLAIM', tell: 'red', kind: 'zone',
        windup: 0.95, active: 0.10, recover: 0.7,
        /* offset 은 양수 = 플레이어 쪽. 보스는 x=700 에 고정이므로 구역 중심은 380,
           즉 320~440 을 덮는다. 뒤쪽 맨바닥 60~320 이 260px 로 C.ARENA.SAFE_MIN_W(200)보다
           넓어, 물러나는 방향으로 대시(190) 한 번이면 빠져나간다.
           w·linger 는 봇 실측으로 내린 값이다 — 200/4.5 에서는 뒤로 물러난 자리가 그대로
           구역이라 LINGER_TICK 마다 다시 맞고 갇혔다(task-3-report 참조). */
        /* linger 2.4 → 1.8 (2026-09-19): 존이 살아 있는 동안 플레이어는 창 리치 밖으로 물러나 금 텔이 아예 오지 않는
           죽은 시간이었다 — 완벽 봇 43.6s → 27.1s. 존 재타격은 LINGER_TICK(0.9) 단위라 1.5 와 1.8 은 같다(2회) */
        zone: { w: 120, damage: 1, anchor: 'boss', offset: 320, linger: 1.8 },
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §2.1) ------------------------------------------------
     * 움직이지 않으므로 move 스텝이 없다. claim 으로 공간을 지우고 lance 로 거리를 강제한다.
     * 🔴 한 패턴에 claim 은 최대 하나다. 보스가 고정이라 연속 claim 은 같은 자리에 겹칠 뿐이고,
     *    플레이어가 반대편으로 돌아가도 살아 있는 구역은 최대 2개(합 400px) — 남는 맨바닥이
     *    SAFE_MIN_W(200)보다 넓다.
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'lance',        steps: [{ atk: 'lance' }] },
        { name: 'sweep',        steps: [{ atk: 'sweep' }] },
        { name: 'claim',        steps: [{ atk: 'claim' }] },
        { name: 'lance-sweep',  steps: [{ atk: 'lance' }, { wait: 0.45 }, { atk: 'sweep' }] }
      ],
      2: [
        { name: 'claim-lance',  steps: [{ atk: 'claim' }, { wait: 0.3 }, { atk: 'lance' }] },
        { name: 'double-lance', steps: [{ atk: 'lance' }, { wait: 0.35 }, { atk: 'lance' }] },
        { name: 'sweep-claim',  steps: [{ atk: 'sweep' }, { wait: 0.4 }, { atk: 'claim' }] },
        { name: 'lance',        steps: [{ atk: 'lance' }] }
      ]
    }
  };

  global.BOSSES.push(SENTINEL);
})(window);
