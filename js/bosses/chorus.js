/* =============================================================================
 * RIPOSTE — js/bosses/chorus.js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6 · 2026-09-23 재설계 §2.4
 * 악보(콜을 들려주고 같은 리듬으로 친다) + 메아리(친 자리의 잔상이 다시 친다) + 좌우 교차(move:'cross').
 * "하나가 묻고, 하나가 답한다."
 * ========================================================================== */
(function (global) {
  'use strict';

  var CHORUS = {
    key: 'chorus',
    name: 'CHORUS',
    title: 'THE TWIN BLADES',
    color: '#4d9dff',
    silhouette: 'twin',
    hp: 250,                    // 300 → 250 (2026-09-23): 카드 피해 13~15 라 완벽 봇도 퍼펙트 10~17회(ADAMANT 외 챕터 2·3 보스 8~10회) — 금 타격마다 놓칠 확률이 쌓여 숙련 봇 1/3. 250 에서 3/3. docs/qa/balance-2026-09-23.md
    par: 35,                    // 2026-09-23 재설계 실측: 숙련 승 9.5~25.9s(중앙 18.3) ×2 ≈ 36 · 완벽 13.2~19.9s > 35/3
    armor: false,
    spawnX: 680,
    droneHz: 65.41,             // C2
    arena: 'gate',             /* 아레나 (C.ARENA) */
    /* 드론 변주 (두 목소리 — 디튠을 크게 벌려 둘로 들린다) — 작곡이 아니라 파라미터다 */
    drone: { wave: 'sawtooth', lfo: 0.7, lfoDepth: 120, cutoff: 460, cutoffP2: 1200, detune: 33 },
    weaponTip: { dx: 46, dy: 60 },

    prefer: { close: 115, far: 300, back: 210 },
    gap: { 1: 0.75, 2: 0.5 },

    attacks: {
      refrain: {                                   // 악보 — 콜 3음(0.45·0.90) → gap → 같은 리듬 3타 (§3.9)
        id: 'refrain', label: 'REFRAIN', tell: 'gold', kind: 'score',
        windup: 0.60, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        score: { notes: [0.45, 0.90] },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      refrain2: {                                  // P2 — 4타 (0.35·0.35·0.70)
        id: 'refrain2', label: 'REFRAIN', tell: 'gold', kind: 'score',
        windup: 0.55, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        score: { notes: [0.35, 0.35, 0.70] },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      canon: {                                     // 메아리 — 친 자리에서 0.7초 뒤 잔상이 다시 친다 (§3.10)
        id: 'canon', label: 'CANON', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 150, approach: 60, damage: 1, swing: 'thrust',
        echo: { delay: 0.70 },
        steal: { id: 'CANON', label: 'CANON', kind: 'lunge', damage: 15 }
      },
      scissor: {                                   // 기본기(P2) — 양쪽을 동시에 베는 가위, 대시로만
        id: 'scissor', label: 'SCISSOR', tell: 'red', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.70,
        reach: 200, approach: 40, damage: 1, swing: 'arc',
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'refrain',          steps: [{ atk: 'refrain' }] },
        { name: 'canon',            steps: [{ atk: 'canon' }] },
        // wait 0.45 — cross 뒤 곧바로 치면 첫 캐논의 메아리(echo, delay 0.70+windup 0.55=1.25)와
        // 두 번째 캐논의 실타격이 0.35(MIN_VOLLEY_GAP) 아래로(벽 근처에서는 역전까지) 붙어 패리 록(RECOVERY_ON_SUCCESS
        // 0.10) 안에 들어간다 — 실측 docs/qa 사이드파인딩. 캐논 수치는 그대로 두고 사이 간격만 늘려 뗀다.
        { name: 'canon-cross-canon', steps: [{ atk: 'canon' }, { move: 'cross' }, { wait: 0.45 }, { atk: 'canon' }] },   // 잔상 둘이 양쪽에
        { name: 'cross-refrain',    steps: [{ move: 'cross' }, { atk: 'refrain' }] }
      ],
      2: [
        { name: 'refrain2',         steps: [{ atk: 'refrain2' }] },
        { name: 'canon-cross-refrain2', steps: [{ atk: 'canon' }, { move: 'cross' }, { atk: 'refrain2' }] },
        { name: 'cross-canon-scissor', steps: [{ move: 'cross' }, { atk: 'canon' }, { atk: 'scissor' }] },
        { name: 'scissor-canon',    steps: [{ atk: 'scissor' }, { wait: 0.3 }, { atk: 'canon' }] }
      ]
    }
  };

  global.BOSSES.push(CHORUS);
})(window);
