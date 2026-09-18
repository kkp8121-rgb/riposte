/* =============================================================================
 * RIPOSTE — js/bosses/hollow.js
 * HOLLOW — 어둠 (챕터 3 세 번째 보스). 스펙 §2.3
 * 설계 축은 "시야" — 아레나가 어두워지고(C.ARENA.void.darkness) 남는 것은 텔 빛뿐이다.
 * 보스 자체는 단순하게 둔다. 어려움은 공격이 아니라 텔 하나만 보고 싸우는 데서 나와야
 * 하고, 두 축을 겹치면 무엇이 재미를 만들었는지 가를 수 없다(handover 교훈 8).
 * 이 파일이 Hollow 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 이 보스의 거리 판단 임계값 (로컬 테이블) */
  var RANGE = {
    OPEN: 200         // 이 거리보다 멀 때만 돌진(snuff) 패턴을 뽑는다 — 아래 패턴 주석 참조
  };

  var HOLLOW = {
    key: 'hollow',
    name: 'HOLLOW',
    title: 'THE DARK',
    color: '#8a7fb0',
    silhouette: 'hollow',      // 무기 없이 키만 크고 몹시 가늘다 — 빈 것
    hp: 300,
    par: 60,                    // 숙련 봇 실측 ~48s (seed 7) — Task 8 밸런스에서 재확정
    armor: false,
    spawnX: 720,
    droneHz: 40,
    arena: 'void',             /* 아레나 (C.ARENA) — 유일하게 darkness 가 붙은 무대 */
    /* 드론 변주 — 사인파, 거의 흔들리지 않는다. 어둠 속에서 들리는 낮은 울림 */
    drone: { wave: 'sine', lfo: 0.08, lfoDepth: 20, cutoff: 220, cutoffP2: 600, detune: 4 },
    weaponTip: { dx: 40, dy: 70 },
    range: RANGE,

    /* 붙었다 떨어졌다를 반복한다 — 어둠 속에서 거리를 잃게 만드는 것이 이 보스의 이동이다 */
    prefer: { close: 150, far: 380, back: 200 },

    /* 패턴 사이 간격 */
    gap: { 1: 0.9, 2: 0.65 },

    /* ---- 공격 테이블 (스펙 §2.3) ----------------------------------------
     * 공격은 넷뿐이고 전부 읽기 쉽다. 금색 둘(grasp·ember)은 플래시 → 타격 간격이 서로
     * 다르게 고정돼 있어(0.62 / 0.72) 어둠 속에서 "어느 텔인지" 를 시간으로 읽게 한다.
     * 붉은 둘(rend·snuff)은 "어둠은 받아낼 수 없다 — 빠져나갈 뿐" 이다.
     * 판정기: ember 를 붉게 두면 봇이 붉은 텔에 보스 쪽으로 대시해 탄과 코앞에서 만났다
     * (task-4-report 교훈 3). 금색 단발로 바꾸면 GRAVEN 과 구성 75%(한계)라, 2연발(volley)로
     * 갈라 40% 로 내렸다. 수치가 아니라 구성으로 풀었다.
     * -------------------------------------------------------------------- */
    attacks: {
      grasp: {                                   // 손을 뻗는다 — 파고드는 찌르기
        id: 'grasp', label: 'GRASP', tell: 'gold', kind: 'melee',
        windup: 0.62, active: 0.10, recover: 0.50,
        reach: 170, approach: 70, damage: 1, swing: 'thrust',
        steal: { id: 'GRASP', label: 'GRASP', kind: 'lunge', damage: 18 }
      },
      rend: {                                    // 느리고 넓은 호 — 패리 불가, 텔이 길다
        id: 'rend', label: 'REND', tell: 'red', kind: 'melee',
        windup: 0.80, active: 0.12, recover: 0.55,
        reach: 140, approach: 0, damage: 1, swing: 'arc',
        steal: null
      },
      snuff: {                                   // 어둠이 덮쳐온다 — 돌진, 패리 불가
        id: 'snuff', label: 'SNUFF', tell: 'red', kind: 'charge',
        windup: 0.75, active: 0.10, recover: 0.35,
        charge: { speed: 820, damage: 1, wallStun: 0.9 },
        steal: null
      },
      ember: {                                   // 어둠 속 빛 두 점 — 받아내면 훔친다
        id: 'ember', label: 'EMBER', tell: 'gold', kind: 'projectile',
        windup: 0.72, active: 0.06, recover: 0.50,
        /* 각 탄의 플래시 → 타격 간격은 windup 하나로 고정이다(Global Constraints) */
        proj: { speed: 340, r: 12, y: 44, damage: 1, reflectDamage: 12, shape: 'arrow' },
        volley: { count: 2, interval: 0.45, p2Interval: 0.38 },
        steal: { id: 'EMBER', label: 'EMBER', kind: 'shot', damage: 12 }
      }
    },

    /* ---- 패턴 (스펙 §2.3) ------------------------------------------------
     * 붙었다 떨어졌다를 반복해 어둠 속에서 거리를 다시 재게 만든다.
     * 🔴 ember 는 반드시 back 뒤에만 쏜다 — 코앞(PARRY_CATCH 안)에서 생성된 탄은 받아낼 수
     *    없다(task-4-report 교훈 1). 봇 실측: 단독 ember 패턴은 근접에서 매번 맞았다.
     * 🔴 snuff(돌진)는 거리가 있을 때(tag far, RANGE.OPEN 밖)만, 그것도 back 뒤에만 쓴다 —
     *    붙은 상태에서 돌진 예고가 뜨면 플레이어가 예고 중에 보스를 지나쳐 버리고, 돌진이
     *    등 뒤에서 따라와 대시가 끝난 자리를 맞힌다(봇 실측, 트레이서). tag any = 상관없음.
     * -------------------------------------------------------------------- */
    patterns: {
      1: [
        { name: 'grasp',            steps: [{ atk: 'grasp' }], tag: 'any' },
        { name: 'rend',             steps: [{ atk: 'rend' }], tag: 'any' },
        { name: 'back-ember',       steps: [{ move: 'back' }, { atk: 'ember' }], tag: 'any' },
        { name: 'back-snuff',       steps: [{ move: 'back' }, { atk: 'snuff' }], tag: 'far' },
        { name: 'close-grasp-rend', steps: [{ move: 'close' }, { atk: 'grasp' }, { wait: 0.4 }, { atk: 'rend' }], tag: 'any' }
      ],
      2: [
        { name: 'grasp-rend',             steps: [{ atk: 'grasp' }, { wait: 0.35 }, { atk: 'rend' }], tag: 'any' },
        { name: 'back-snuff-grasp',       steps: [{ move: 'back' }, { atk: 'snuff' }, { atk: 'grasp' }], tag: 'far' },
        { name: 'back-ember-snuff',       steps: [{ move: 'back' }, { atk: 'ember' }, { atk: 'snuff' }], tag: 'far' },
        { name: 'close-rend-back-ember',  steps: [{ move: 'close' }, { atk: 'rend' }, { move: 'back' }, { atk: 'ember' }], tag: 'any' },
        { name: 'back-ember-close-grasp', steps: [{ move: 'back' }, { atk: 'ember' }, { wait: 0.3 }, { move: 'close' }, { atk: 'grasp' }], tag: 'any' }
      ]
    },

    /* ---- 훅: 거리에 따라 패턴 풀을 고른다 (TEMPEST 선례) ------------------- */
    onPickPattern: function (boss, game) {
      var pool = boss.def.patterns[boss.phase] || boss.def.patterns[1];
      var open = boss.dist() > RANGE.OPEN;
      var out = [];
      for (var i = 0; i < pool.length; i++) {
        var p = pool[i];
        if (p.tag === 'any' || (open && p.tag === 'far')) out.push(p);
      }
      return out.length ? out : pool;
    }
  };

  global.BOSSES.push(HOLLOW);
})(window);
