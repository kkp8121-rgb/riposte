/* =============================================================================
 * RIPOSTE — js/config.js
 * 전역 상수 테이블 (SSoT). 다른 파일에 매직넘버를 두지 않는다.
 * 보스별 수치(HP / par / 공격 테이블)는 js/bosses/*.js 의 로컬 테이블이 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var CONFIG = {

    /* ---- 아레나 / 논리 해상도 -------------------------------------------- */
    VIEW: {
      W: 960,
      H: 540,
      FLOOR_Y: 440,
      MIN_X: 60,
      MAX_X: 900,
      HORIZON_Y: 250
    },

    /* ---- 아레나 3종 (Phase1 그룹4) ----------------------------------------
     * 보스 정의의 `arena: 'id'` 가 고른다. 바꾸는 것은 색·기둥 개수·간격·시차 계수·
     * 바닥 색뿐이고 도형·렌더 패스는 늘리지 않는다 (이미지 에셋 0 유지).
     * 🔴 배경은 세 아레나 모두 어둡게 유지한다 — 금(#ffd166)/적(#ff3b3b) 텔 대비가 살아야 한다.
     * 바닥선 y 는 V.FLOOR_Y(물리 지면)라 바꾸지 않는다. 높이감은 기둥·색으로만 낸다.
     * ------------------------------------------------------------------- */
    ARENA: {
      DEFAULT: 'hall',
      SEED: 20260909,          // 배치 생성 시드 — 고정이라 매 실행 같은 그림이다
      STAR_Y: [10, 20],        // 별 y 범위 (아래값은 HORIZON_Y 에서 뺀다)
      STAR_SIZE: [0.6, 1.6],
      /* 지속 구역(zone.linger)이 깔려도 플레이어가 갇히지 않기 위한 안전 지대 폭 하한.
         근거: 대시 한 번이 190px(C.DASH.DISTANCE)이므로, 남는 맨바닥이 그보다 좁으면
         대시로 빠져나갈 수 없어 구역에 끼어 죽는다. 190 에 여유 10 을 더해 200 으로 둔다.
         아레나 폭은 840px(MIN_X 60 ~ MAX_X 900)이므로 동시에 살아 있는 구역 폭의 합은
         840 - 200 = 640px 를 넘지 않아야 한다. */
      SAFE_MIN_W: 200,
      /* hall — 현행 값 그대로 (기존 스크린샷이 깨지지 않게) */
      hall: {
        bg: ['#070910', '#0b0d14', '#0e1220'], bgMid: 0.62,
        floor: '#1a1f2e', line: '#232a3d', reflect: 'rgba(94,230,255,0.07)',
        farColor: '#11151f', farAlpha: 0.9, nearColor: '#161b28', nearAlpha: 1,
        farStep: 118, farJitter: 18, farW: [38, 62], farH: [150, 260], farPar: 0.06,
        nearStep: 214, nearJitter: 24, nearW: [56, 96], nearH: [210, 330], nearPar: 0.16,
        stars: 60, starAlpha: [0.06, 0.30]
      },
      /* range — 원거리 보스. 더 어둡고 기둥이 멀고 낮다(넓은 공간) */
      range: {
        bg: ['#04060c', '#070a12', '#0a0e18'], bgMid: 0.58,
        floor: '#141827', line: '#1c2233', reflect: 'rgba(94,230,255,0.05)',
        farColor: '#0c1018', farAlpha: 0.85, nearColor: '#10141e', nearAlpha: 1,
        farStep: 168, farJitter: 26, farW: [30, 50], farH: [110, 190], farPar: 0.04,
        nearStep: 300, nearJitter: 34, nearW: [44, 74], nearH: [160, 250], nearPar: 0.11,
        stars: 84, starAlpha: [0.08, 0.36]
      },
      /* gate — 닫힌 문 앞. 기둥이 촘촘하고 높다 */
      gate: {
        bg: ['#08070e', '#0e0c16', '#13101e'], bgMid: 0.66,
        floor: '#1e1a2c', line: '#2b2440', reflect: 'rgba(168,184,200,0.06)',
        farColor: '#14101c', farAlpha: 0.95, nearColor: '#1b1626', nearAlpha: 1,
        farStep: 84, farJitter: 12, farW: [42, 70], farH: [200, 300], farPar: 0.08,
        nearStep: 150, nearJitter: 16, nearW: [62, 104], nearH: [280, 400], nearPar: 0.20,
        stars: 34, starAlpha: [0.05, 0.20]
      },
      /* wall — 챕터 3 "THE WALL". gate 를 본뜨되 더 차갑고(보라 → 청회색) 기둥이 벽처럼 촘촘하다.
         배경 밝기는 gate 이하로 유지한다 — 금(#ffd166)/적(#ff3b3b) 텔 대비가 살아야 한다. */
      wall: {
        bg: ['#05080d', '#080c13', '#0c1119'], bgMid: 0.68,
        floor: '#161d26', line: '#222c38', reflect: 'rgba(143,227,200,0.05)',
        farColor: '#0f151c', farAlpha: 0.95, nearColor: '#141c24', nearAlpha: 1,
        farStep: 62, farJitter: 8, farW: [46, 66], farH: [230, 320], farPar: 0.07,
        nearStep: 112, nearJitter: 10, nearW: [70, 108], nearH: [310, 420], nearPar: 0.18,
        stars: 22, starAlpha: [0.04, 0.16]
      },
      /* void — HOLLOW 전용 (스펙 §2.3). wall 과 같은 무대에 어둠 계수만 더한다.
         darkness 는 배경·기둥·바닥·보스 몸통을 덮는 검정의 불투명도(Phase 1 / Phase 2).
         🔴 텔·투사체·존·플레이어·HUD 는 이 위에 그린다 — 렌더 순서가 규칙이고 계수는 세기일 뿐이다.
         ?nofx=1 로 꺼지지 않는다(판정의 일부). */
      void: {
        bg: ['#05080d', '#080c13', '#0c1119'], bgMid: 0.68,
        floor: '#161d26', line: '#222c38', reflect: 'rgba(143,227,200,0.05)',
        farColor: '#0f151c', farAlpha: 0.95, nearColor: '#141c24', nearAlpha: 1,
        farStep: 62, farJitter: 8, farW: [46, 66], farH: [230, 320], farPar: 0.07,
        nearStep: 112, nearJitter: 10, nearW: [70, 108], nearH: [310, 420], nearPar: 0.18,
        stars: 22, starAlpha: [0.04, 0.16],
        darkness: { p1: 0.72, p2: 0.85 }
      }
    },

    /* ---- 하드 모드 "RIPOSTE+" (Phase1 그룹4) -------------------------------
     * 엔딩 클리어 후 언락. 기존 보스에 이 배율 하나를 곱할 뿐이고
     * 새 공격·새 패턴·새 실루엣을 만들지 않는다 (적 컨셉 중복 금지 원칙).
     * ------------------------------------------------------------------- */
    HARD: {
      NAME: 'RIPOSTE+',
      MENU_LABEL: 'NEW RUN (RIPOSTE+)',
      BADGE: '+',              // 랭크 옆에 붙는 배지 — 일반 기록과 섞이지 않는다는 표시
      WINDUP: 0.85,            // 텔에서 타격까지 (MIN_WINDUP 하한은 그대로 적용된다)
      GAP: 0.85,               // 패턴 사이 간격
      PHASE2_AT: 0.6           // Phase 2 진입 HP 비율 (기본 0.5)
    },

    /* ---- 루프 ------------------------------------------------------------ */
    LOOP: {
      FIXED_DT: 1 / 120,
      MAX_FRAME_DT: 0.25,
      MAX_STEPS: 16
    },

    /* ---- 색 (스펙 §4) ---------------------------------------------------- */
    COLORS: {
      BG: '#0b0d14',
      BG_FAR: '#070910',
      FLOOR: '#1a1f2e',
      FLOOR_LINE: '#232a3d',
      PILLAR_FAR: '#11151f',
      PILLAR_NEAR: '#161b28',
      PLAYER: '#5ee6ff',
      GOLD: '#ffd166',
      RED: '#ff3b3b',
      WHITE: '#ffffff',
      GREY: '#8b93a7',
      TEXT: '#e6ebf5',
      TEXT_DIM: '#7d879e',
      HP_BOSS: '#e8556d',
      HP_BACK: '#202634',
      HEART: '#ff5c7a',
      HEART_EMPTY: '#2a3145',
      EMPOWER: '#ffd166',
      COUNTER: '#ffe08a',
      VIGNETTE: '#ff2233'
    },

    FONT: {
      /* 한글 대사(스펙 §10)를 위해 OS 한글 폰트를 폴백에 둔다 — 외부 폰트 로드는 없다 */
      UI: '"Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif',
      TITLE: '"Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif',
      MONO: 'ui-monospace, Consolas, "Courier New", monospace'
    },

    /* ---- 플레이어 -------------------------------------------------------- */
    PLAYER: {
      HP: 5,
      SPEED: 265,
      ACCEL: 3200,
      FRICTION: 2600,
      HALF_W: 14,
      HEIGHT: 76,
      SPAWN_X: 300,
      HURT_IFRAMES: 0.8,
      HURT_KNOCKBACK: 120,
      KNOCK_DECAY: 9,          // 밀림 감쇠율 — 총 이동거리 = KNOCKBACK px
      HEART_BREAK_TIME: 0.45,
      STREAK_PULSE_TIME: 0.4,
      BREATH_RATE: 2.1,
      BREATH_AMP: 2.2,
      LEAN_MAX: 0.26
    },

    /* ---- 패리 (스펙 §2.3) ------------------------------------------------ */
    PARRY: {
      PERFECT_WINDOW: 0.18,
      BLOCK_WINDOW: 0.34,
      RECOVERY: 0.40,           // 헛친 패리 = 0.40s 무방비
      RECOVERY_ON_SUCCESS: 0.10, // 성공 시 즉시 회복 (연속 패리 허용 — 스펙 §3.2 triple 대응)
      SUCCESS_GRACE: 0.05,      // 패리 성공 직후 유예 — 같은 스텝에 겹쳐 온 두 번째 투사체도 받아낸다
      PROJECTILE_CATCH: 52,     // 패리 중 투사체를 쳐내는 전방 거리
      BLOCK_PUSH: 40,
      POSE_TIME: 0.26,
      FLINCH: 0.35              // 퍼펙트 패리 시 보스 경직
    },

    /* ---- 스태미너 (행동마다 소모, 서서히 회복) ---------------------------- */
    STAMINA: {
      MAX: 100,
      PARRY_COST: 30,        // 패리 창이 열릴 때 소모 (성공 여부 무관)
      DASH_COST: 20,         // 대시 시작 시 소모
      REGEN: 25,             // 초당 회복량
      REGEN_DELAY: 0.5,      // 마지막 소모 후 회복이 시작되기까지
      /* 환급은 판정 사다리를 그대로 따른다 (퍼펙트 / 블록 / 헛침).
         정확히 읽으면 공짜, 타이밍만 맞추면 절반, 못 읽으면 전액 부담 —
         "무결점이면 무한"이라는 §2.5 판타지를 지키면서 연타(=대부분 헛침)만 벌한다. */
      PERFECT_REFUND: 30,    // = PARRY_COST → 퍼펙트는 순소모 0
      BLOCK_REFUND: 15,      // 블록은 절반만 (순소모 15). 헛침은 환급 0 (순소모 30)
      EMPTY_FLASH: 0.25      // 잔량 부족 상태에서 눌렀을 때 바 점멸 시간
    },

    /* ---- 대시 (스펙 §2.4) ------------------------------------------------ */
    DASH: {
      DURATION: 0.22,
      IFRAMES: 0.20,
      DISTANCE: 190,
      COOLDOWN: 0.55,
      GHOSTS: 6,
      GHOST_LIFE: 0.18
    },

    /* ---- 손패 / 리포스트 (스펙 §2.5) ------------------------------------- */
    HAND: {
      SIZE: 3,
      SLOT_W: 92,
      SLOT_H: 40,
      SLOT_GAP: 10,
      BOTTOM_MARGIN: 18,
      /* 약탈 보스(스펙 §3.8)가 빼앗아 간 손패 — 보스 HP 바 아래 작은 슬롯 */
      LOOT_SLOT_W: 64,
      LOOT_SLOT_H: 20,
      LOOT_GAP: 6,
      LOOT_Y: 56,
      LOOT_LABEL: 'TAKEN'
    },

    /* ---- HUD 배치 (하트 아래 스태미너 바) --------------------------------- */
    HUD: {
      STAMINA_X: 17,
      STAMINA_Y: 44,
      STAMINA_W: 130,
      STAMINA_H: 5
    },

    COMBAT: {
      EMPOWER_STREAK: 3,
      EMPOWER_MULT: 2,
      COUNTER_MULT: 1.5,
      INPUT_BUFFER: 0.16,     // 리포스트/패리 입력 버퍼 (락 중 눌린 입력을 흘리지 않는다)
      RIPOSTE_FLINCH: 0.20,   // 일반 리포스트 명중 시 경직 (아머 보스는 면역)
      COUNTER_FLINCH: 0.45    // 카운터 히트 interrupt 경직
    },

    /* 훔친 기술의 종류별 실행 파라미터 (스펙 §2.5) */
    RIPOSTE_KINDS: {
      lunge: { startup: 0.10, active: 0.09, recover: 0.22, reach: 170, step: 62 },
      slash: { startup: 0.09, active: 0.11, recover: 0.24, reach: 130, step: 10 },
      shot:  { startup: 0.12, active: 0.03, recover: 0.26, reach: Infinity, step: 0,
               projSpeed: 660, projR: 9 },
      slam:  { startup: 0.26, active: 0.11, recover: 0.38, reach: 260, step: 18 }
    },

    /* ---- 보스 공통 ------------------------------------------------------- */
    BOSS: {
      HALF_W: 20,
      HEIGHT: 84,
      SPAWN_X: 660,
      WALK_SPEED: 175,
      APPROACH_SPEED: 235,
      APPROACH_TIMEOUT: 1.6,
      APPROACH_RATIO: 0.78,     // reach * 이 값 이내로 붙은 뒤 windup 시작
      MOVE_TIMEOUT: 1.2,
      STRAFE: 140,
      PATTERN_GAP_DEFAULT: 0.6,
      WATCHDOG_IDLE: 2.0,       // 2초 이상 idle 이면 강제로 새 패턴
      PHASE2_HP_RATIO: 0.5,
      PHASE2_WINDUP_MULT: 0.8,
      PHASE2_ROAR: 1.0,
      MIN_WINDUP: 0.34,         // 배수를 먹여도 이 아래로는 내려가지 않는다 (반응 하한)
      MIN_CHARGE_RUN: 260,      // 돌진 방향 벽까지 이 거리가 안 나오면 charge 스텝을 건너뛴다
      FEINT_HOLD: 0.45,         // 스펙 §3.4 feint — 1차 플래시 후 무기가 멈춰 있는 시간
      /* feint 2차 플래시 → 타격 간격은 그 공격의 "정상 windup" 과 같다.
         (고정 상수를 쓰면 배운 리듬과 어긋난다 — 스펙 §2.2) */
      FLASH_TIME: 0.16,
      HURT_FLASH: 0.12,
      /* 근접 연타(volley) — active 가 끝나면 recover 대신 이 간격의 짧은 windup 으로 되돌아가
         새 플래시를 찍는다 (스펙 §3.6). MIN_WINDUP(0.34)·PERFECT_WINDOW+RECOVERY_ON_SUCCESS(0.28) 보다 커야 한다. */
      MIN_VOLLEY_GAP: 0.35,
      /* 되받아치기(deflect) — 스펙 §3.7. 플레이어 쪽 투사체가 이 거리 안이면 판정 */
      DEFLECT_REACH: 120,
      DEFLECT_CHANCE_P1: 0.35,
      DEFLECT_CHANCE_P2: 0.55,
      DEFLECT_MAX_RALLY: 3,       // 랠리 상한 — 3회째엔 되받지 않는다. rally 는 reflect() 로 리셋되지 않으므로 이게 없으면 무한 랠리
      DEFLECT_SPEED_MULT: 0.55,
      DEFLECT_SPEED_MAX: 380,
      DEFLECT_RECOVER: 0.45,      // 되받은 직후 경직 = 카운터 창
      /* 챕터 2 재설계 (스펙 §3.5~3.7) */
      BLINK_PAUSE: 0.12,          // move:'behind' 순간이동 뒤 멈춤 — 잔상을 볼 시간
      BLINK_GHOSTS: 3,            // 순간이동 잔상 수
      CROSS_SPEED: 700,           // move:'cross' 플레이어를 지나쳐 반대편으로 달리는 속도
      SIDE_MIN_RATIO: 0.6,        // 반대편 목표가 prefer.close 의 이 비율보다 가까우면(벽) 이동 스텝을 건너뛴다
      ZONE_OFFSET_DEFAULT: 140,   // zone.anchor:'boss' 존의 보스 앞 거리 기본값
      /* 엔진 방벽 (챕터 3 스펙 §2.4 — ADAMANT). 보스 정의의 wall:{hits,up,breakStagger} 가 켠다.
         방벽이 서 있는 동안 리포스트는 튕기고(피해 0·손패 환급) 반사탄만 hits 를 깎는다.
         hits 가 0 이 되면 breakStagger 동안 카운터 경직(보상) → WALL_DOWN 뒤 다시 선다.
         up 초 동안 깨지지 않으면 보상 없이 저절로 내려간다 — 기믹은 의무가 아니라 노리는 기회다. */
      WALL_DOWN: 5.0,             // 방벽이 내려가 있는 시간 (깨졌든 저절로 내려갔든)
      WALL_GAP: 46,               // 방벽 슬래브의 보스 앞 거리 (px)
      WALL_W: 16,                 // 슬래브 두께
      WALL_H: 118,                // 슬래브 높이
      WALL_ALPHA: 0.55,           // 슬래브 불투명도
      WALL_POP: 'WALL',           // 리포스트가 방벽에 튕겼을 때 뜨는 글자
      WALL_BREAK_POP: 'BREAK',    // 방벽이 깨졌을 때
      COUNTER_POP: 'COUNTER ONLY' // counterOnly 게이트에 튕겼을 때 (스펙 §2.4)
    },

    /* ---- 텔 / 투사체 / 존 ------------------------------------------------ */
    TELL: {
      BURST_R: 26,
      RAYS: 8,
      RAY_LEN: 46,
      LIFE: 0.30,
      /* 적 텔 — 방사선 대신 굵은 X자 4줄로 색 없이도 금 텔과 구분 (접근성) */
      RED_RAYS: 4,
      RED_LINE_W: 4.5,
      RED_CROSS_LEN: 40
    },

    PROJECTILE: {
      HIT_DIST: 26,
      REFLECT_MULT: 1.15,
      TRAIL: 6
    },

    ZONE: {
      STRIKE_TIME: 0.22,
      STRIP_H: 10,
      COLUMN_ALPHA: 0.20,
      /* 지속형 구역(스펙 §4) — linger 가 있으면 그 시간 동안 남아 이 간격으로 다시 때린다.
         간격은 피격 무적(PLAYER.HURT_IFRAMES 0.8)보다 커야 "서 있으면 계속 맞는" 것이 아니라
         "나가라"는 신호가 된다. */
      LINGER_TICK: 0.9
    },

    /* ---- 새 공격 동작 (챕터 2·3 재설계, 스펙 2026-09-23 §3) ---------------
     * 동작 공통 규칙만. 보스별 수치(속도·폭·지연)는 보스 파일이 소유한다. */
    MOTION: {
      BOOMERANG_SPEED_MAX: 900,    // 귀환 속도 상한(px/s). 하한은 없다 — 받는 거리(PARRY.PROJECTILE_CATCH) 안에서 돌면 부서진다
      PINCER_MIN_ROOM: 160,        // 플레이어 등 뒤 공간이 이보다 좁으면 협공 스텝을 건너뛴다 (뒤 탄이 설 자리)
      PINCER_SPAWN_PAD: 20,        // 뒤 탄이 아레나 끝에서 생길 때 경계 안쪽 여유(px)
      BEAM_MIN_ROOM: 160,          // 빔이 나올 등 뒤 공간 하한 — 좁으면 예고 직후 닿는다
      BEAM_H: 200,                 // 빔 높이(그리기)
      BEAM_ALPHA: 0.55,
      BEAM_WARN_ALPHA: 0.22,       // 예고(pending) 중 빔 윤곽
      PILLAR_H: 150,
      PILLAR_ALPHA: 0.85,
      MARK_R: 30,                  // 표식 링 반지름 — 남은 시간만큼 줄어든다
      MARK_Y: 96,                  // 표식 링 중심 높이(바닥 위 px, 플레이어 머리 위)
      STANCE_POP: 'GUARD',         // 반격 자세에 리포스트가 맞았을 때 뜨는 글자
      STANCE_RING_R: 58,           // 자세 표시 링(회색 점선) 반지름 — 텔 색이 아니라 상태 표시
      SCORE_PIP_Y: 108,            // 악보 음표 줄 높이(바닥 위 px, 보스 머리 위)
      SCORE_PIP_PX: 40,            // 음표 가로 간격 = 시각(초) × 이 값 — 리듬이 눈에도 보인다
      SCORE_PIP_R: 4,
      SCORE_PIP_LIFE: 0.30,        // 음표가 울릴 때의 작은 링 수명
      ECHO_ALPHA: 0.45,            // 메아리 잔상 불투명도
      ECHO_FADE: 0.25              // 잔상이 친 뒤 사라지는 시간
    },

    /* ---- 게임 필 (스펙 §4) ----------------------------------------------- */
    HITSTOP: {
      PERFECT: 0.09,
      BLOCK: 0.04,
      RIPOSTE: 0.06,
      PLAYER_HIT: 0.10,
      PHASE2: 0.20,
      CHARGE_WALL: 0.07
    },

    SHAKE: {
      PERFECT: 4,
      BLOCK: 2,
      RIPOSTE: 6,
      PLAYER_HIT: 10,
      PHASE2: 8,
      BOSS_DEATH: 14,
      CHARGE_WALL: 9,
      DECAY: 7.5
    },

    FLASH: {
      PERFECT_WHITE: 0.055,
      PHASE2_WHITE: 0.22,
      DEATH_WHITE: 0.30,
      VIGNETTE: 0.40
    },

    SLOWMO: {
      KO_SCALE: 0.25,
      KO_TIME: 1.4,
      KO_ZOOM: 1.15,
      DEFEAT_SCALE: 0.35,
      DEFEAT_TIME: 1.2,
      PERFECT_SCALE: 0.45,
      PERFECT_TIME: 0.08
    },

    FX: {
      PERFECT_SPARKS: 24,
      BLOCK_SPARKS: 8,
      RIPOSTE_SPARKS: 14,
      VOLLEY_SPARKS: 8,        // 연사 2·3발째 "발사" 스파크 (텔 플래시 아님)
      HIT_SPARKS: 16,
      DEATH_SHARDS: 46,
      DUST: 10,
      MAX_PARTICLES: 420,
      POP_LIFE: 0.85,
      POP_RISE: 46,
      RING_LIFE: 0.35
    },

    /* ---- 랭크 (스펙 §2.7) ------------------------------------------------ */
    RANK: {
      S_HITS: 0,
      A_HITS: 1,
      B_HITS: 3,
      VALUE: { S: 4, A: 3, B: 2, C: 1 },
      LETTERS: ['C', 'B', 'A', 'S'],
      CARD_SCALE_TIME: 0.45
    },

    /* ---- 트라이 수 표시 문구 (스펙 §2.6) ----------------------------------- */
    TRIES: {
      LABEL: 'TRIES',
      BEST: 'best',
      TRY: 'TRY',
      UNIT: 'try'
    },

    /* ---- 화면 (스펙 §6) -------------------------------------------------- */
    SCENE: {
      INTRO_TIME: 1.2,
      PHASE2_BANNER: 1.4,
      INTERLUDE_MIN: 0.4        // 챕터 카드가 뜬 직후 Enter 를 받지 않는 시간 (연타 방지)
    },

    /* ---- 타이틀 연출 (플레이어 vs VESPER 실루엣 대치) --------------------- */
    TITLE: {
      FADE: 0.6,             // 타이틀 페이드 인 시간
      BLINK_HZ: 4,           // "PRESS ENTER" 점멸 = 금색 텔 펄스와 같은 주기
      /* 조작표 텍스트 블록(x≈330~700)을 피해 아레나 바깥쪽에 세운다 */
      PLAYER_X: 206,
      BOSS_X: 764,
      SWAY: 3.5,             // 좌우 미세 흔들림 진폭(px)
      SWAY_HZ: 0.55,
      PULSE_R: 9,            // 무기 끝 금색 펄스 반경
      ALPHA: 0.92
    },

    /* ---- 패배 화면 학습 문구 (텔 색으로 무엇을 눌렀어야 했는지 가르친다) --- */
    DEFEAT: {
      SLAIN_BY: 'SLAIN BY ',
      HINT_GOLD: 'Gold flash  —  press K as it lands',
      HINT_RED:  'Red flash  —  dash through with SPACE',
      HINT_ZONE: 'Red zone  —  dash out before it lands'
    },

    /* ---- 오디오 (스펙 §5) ------------------------------------------------ */
    AUDIO: {
      MASTER: 0.35,
      DRONE_GAIN: 0.10,
      DRONE_CUTOFF_P1: 420,
      DRONE_CUTOFF_P2: 980,
      DRONE_DETUNE: 11,
      DRONE_LFO_HZ: 0.15,
      /* 보스 정의의 drone 블록이 없을 때 쓰는 기본값 + Phase 2 변조 (작곡 없이 파라미터만) */
      DRONE_WAVE: 'sawtooth',
      DRONE_LFO_DEPTH: 90,       // LFO 가 컷오프를 흔드는 폭(Hz)
      DRONE_DETUNE_P2: 2.2,      // Phase 2 에서 디튠에 곱하는 배율
      DRONE_P2_RAMP: 1.0,        // Phase 2 변조에 걸리는 시간(초)
      TELL_GOLD_HZ: 2200,
      TELL_GOLD_MS: 40,
      TELL_RED_HZ: 90,
      TELL_RED_MS: 120,
      PARRY_PARTIALS: [1800, 2700, 4100],
      PARRY_DECAY: 0.5,
      RIPOSTE_HZ: 120,
      STEAL_ARPEGGIO: [523.25, 659.25, 783.99], // C5 E5 G5
      STEAL_GAP_MS: 60,
      /* 악보 음표 (스펙 2026-09-23 §3.9) — 텔이 아니라 "예고의 예고". 금 텔(2200Hz tick)과 다른 음 */
      NOTE_HZ: 1320,
      NOTE_MS: 60,
      /* 반격 자세 (스펙 2026-09-23 §3.8) — "지금 치지 마라" 상태의 소리 채널. 금 tick 과 함께 울리는 낮은 울림 */
      GUARD_HZ: 150,
      GUARD_MS: 260,
      /* Phase 2 심박 킥 BPM (보스별) */
      BPM: { vesper: 96, seraph: 104, graven: 84, mirror: 116,
             lantern: 100, chorus: 120, bastion: 88, avarice: 124,
             sentinel: 80, tempest: 108, hollow: 72, adamant: 64 } // 최종 보스 — 챕터 3에서 가장 느리고 무겁게(hollow 72 보다 낮음)
    },

    /* ---- 저장 ------------------------------------------------------------ */
    STORAGE: {
      KEY: 'riposte.progress.v1'
    },

    /* ---- 옵션 기본값 (별도 키를 만들지 않고 STORAGE.KEY 안 settings 에 합류) ---- */
    SETTINGS: {
      DEFAULTS: {
        volume: 100,        // 0~100, VOLUME_STEP 단위. 0 이면 음소거와 같다
        fullscreen: false,
        flash: true,        // FX.whiteFlashEnabled (= ?flash=0 의 UI 판)
        particles: true,    // FX.enabled (= ?nofx=1 의 UI 판)
        assistHp: 0,        // ASSIST.HP 인덱스
        assistWindup: 0,    // ASSIST.WINDUP 인덱스
        keys: null          // 액션 -> code 목록 (null 이면 Input 기본 KEYMAP)
      },
      VOLUME_STEP: 10,
      VOLUME_MAX: 100
    },

    /* ---- 접근성 보조 (옵트인 — 기본값이 아니면 랭크·최고 기록을 저장하지 않는다) ---- */
    ASSIST: {
      HP:     [{ mult: 1, label: 'x1' }, { mult: 1.5, label: 'x1.5' }, { mult: 2, label: 'x2' }],
      WINDUP: [{ mult: 1, label: 'x1' }, { mult: 1.2, label: 'x1.2' }, { mult: 1.5, label: 'x1.5' }]
    },

    /* ---- 메뉴 (타이틀 세로 메뉴 · 옵션 · 보스 선택 · 키 설정) -------------- */
    MENU: {
      ITEM_Y: 398, ITEM_GAP: 28, ITEM_SIZE: 18,
      CURSOR: '>',
      CURSOR_X: 300, LABEL_X: 330, VALUE_X: 660,
      PANEL_X: 200, PANEL_Y: 96, PANEL_W: 560, PANEL_H: 380,
      HEAD_Y: 132, ROW_Y: 182, ROW_GAP: 34, ROW_SIZE: 15,
      MSG_Y: 462, HINT_Y: 502, RANKS_Y: 520,
      TITLE_HINT: 'W S / ARROWS  MOVE      ENTER  SELECT',
      OPTION_HINT: 'LEFT RIGHT  CHANGE      ENTER  SELECT      ESC  BACK',
      BIND_HINT: 'ENTER  REBIND      ESC  BACK',
      PRESS_KEY: 'PRESS A KEY',
      CONFLICT: 'KEY ALREADY USED',
      RESERVED: 'ENTER / ESC CANNOT BE REBOUND',
      MSG_TIME: 1.8,
      ON: 'ON', OFF: 'OFF',
      ASSIST_BADGE: 'ASSIST  —  NO RANK SAVED',
      NO_BOSSES: 'NO BOSSES CLEARED YET',
      /* 옵션 행 — type: range(좌우 증감) / toggle / choice(ASSIST 표) / action(Enter) */
      OPTIONS: [
        { id: 'volume',       label: 'MASTER VOLUME',      type: 'range' },
        { id: 'fullscreen',   label: 'FULLSCREEN',         type: 'toggle' },
        { id: 'flash',        label: 'SCREEN FLASH',       type: 'toggle' },
        { id: 'particles',    label: 'PARTICLES',          type: 'toggle' },
        { id: 'assistHp',     label: 'ASSIST: PLAYER HP',  type: 'choice', table: 'HP' },
        { id: 'assistWindup', label: 'ASSIST: BOSS WINDUP', type: 'choice', table: 'WINDUP' },
        { id: 'keys',         label: 'KEY BINDINGS',       type: 'action' },
        { id: 'reset',        label: 'RESET TO DEFAULTS',  type: 'action' }
      ],
      /* 재지정 가능한 액션 — confirm(Enter)·back(Esc) 는 메뉴 탈출 경로라 제외 */
      BINDABLE: ['left', 'right', 'parry', 'riposte', 'dash', 'restart', 'mute'],
      /* 재지정 금지 코드 */
      RESERVED_CODES: ['Enter', 'NumpadEnter', 'Escape']
    },

    /* ---- 개발용 (스펙 §5.5) — 기본 꺼짐. 배포본에서 우연히 밟히면 안 된다 ---- */
    DEV: {
      /* 타이틀에서 이 물리 키 코드를 순서대로 누르면 토글. 액션이 아니라 코드를 본다 —
         키 리바인드와 서로 간섭하지 않는다. 지금 어떤 액션에도 안 묶인 글자만 골랐다. */
      CODE: ['KeyT', 'KeyH', 'KeyI', 'KeyE', 'KeyF'],
      CODE_GAP: 2.0,          // 글자 사이가 이보다 벌어지면 버퍼를 비운다 (초)
      HP_CUT: 0.25,           // F2 한 번에 깎는 보스 최대 HP 비율
      BADGE: 'DEV',
      /* 우상단 타이머(ui.js L.TIMER_Y 26 + PAR 줄 17) 바로 아래 — 타이머와 겹치지 않는 자리 */
      BADGE_X: 938, BADGE_Y: 50,
      /* F1 오버레이 (보스/HP/스태미너/페이즈/시드 5줄) — 좌상단, 한 줄씩 아래로 */
      OVERLAY_X: 16, OVERLAY_Y: 60, OVERLAY_LINE_H: 18
    },

    /* ---- 튜토리얼 (스펙 §3.1 — Vesper P1 한정) --------------------------- */
    TUTORIAL: {
      PARRY: 'K  —  PARRY THE GOLD FLASH',
      RIPOSTE: 'J  —  RIPOSTE WITH THE STOLEN ATTACK',
      DASH: 'SPACE  —  DASH THROUGH RED',
      Y: 132,
      PULSE_HZ: 2.4
    },

    /* ---- 챕터 (스펙 §3 공통) — 진행은 BOSSES 순서, 경계만 여기서 정한다 ------- */
    CHAPTERS: [
      { id: 1, name: 'CHAPTER I',  subtitle: 'THE HAND', bosses: ['vesper', 'seraph', 'graven', 'mirror'] },
      { id: 2, name: 'CHAPTER II', subtitle: 'THE DEBT', bosses: ['lantern', 'chorus', 'bastion', 'avarice'] },
      { id: 3, name: 'CHAPTER III', subtitle: 'THE WALL', bosses: ['sentinel', 'tempest', 'hollow', 'adamant'] }
    ],

    /* ---- 스토리 (스펙 §10) ---------------------------------------------- */
    STORY: {
      CPS: 24,                 // 타자기 속도 (한글 글자/초)
      SKIP_HOLD: 0.6,          // Enter 를 이만큼 누르고 있으면 장면 스킵
      MAX_LINES: 4,
      TAKEN_FLASH: 0.4,        // 오답 카드 붉은 비네트
      ENDING_SLOT_DROP: 0.4,   // 엔딩에서 손패가 한 칸씩 비는 간격
      DISSOLVE: 0.8,           // AVARICE 정답 반응 중 실루엣 소멸 시간
      SCALE: 1.6,              // 대화 장면 실루엣 배율
      PLAYER_X: 250,
      BOSS_X: 710,
      BOX_X: 90, BOX_Y: 386, BOX_W: 780, BOX_H: 124,
      TEXT_X: 130, TEXT_Y: 448,
      SPEAKER_Y: 412,
      TEXT_SIZE: 19,
      SPEAKER_SIZE: 12,
      CHOICE_Y: 440, CHOICE_GAP: 28,
      UNKNOWN_SPEAKER: '???',
      TAKEN_TEXT: 'TAKEN.',
      PROMPT_NEXT: 'ENTER',
      PROMPT_SKIP: 'HOLD ENTER  —  SKIP',
      VOICE_SPLIT: ' / '       // CHORUS 두 목소리 교대 구분자
    },

    /* ---- 엔딩 카드 (스펙 §10) ------------------------------------------- */
    ENDING: {
      LINES: ['NOTHING IS GIVEN.', 'EVERYTHING IS TAKEN.', 'NOTHING IS KEPT.', 'NOTHING IS LEFT TO TAKE.'],
      LINE_Y: [40, 64, 88, 118],
      LINE_AT: [0, 0.5, 1.0, 2.4],  // 각 줄이 뜨는 시각(s) — 마지막 줄은 손패가 다 빈 2.2s(1.0 + 3×ENDING_SLOT_DROP)에서 0.2s 숨 고른 뒤
      ROWS_Y: 150,
      ROW_H: 19,                    // 12보스 행이 손패 위에 들어가야 한다
      SLOTS_Y: 438
    },

    /* ---- 게임패드 (Phase1 그룹2 — 동사는 늘리지 않는다, KEYMAP 과 같은 액션 이름만) ---- */
    PAD: {
      DEADZONE: 0.35,        // 좌스틱 X축 데드존
      AXIS_X: 0,              // Standard Gamepad 좌스틱 X축 인덱스
      AXIS_Y: 1,              // 좌스틱 Y축 — 메뉴 커서 전용
      DPAD_LEFT: 14,           // Standard Gamepad D-Pad 좌
      DPAD_RIGHT: 15,          // Standard Gamepad D-Pad 우
      DPAD_UP: 12,             // D-Pad 상 — 메뉴 커서 전용
      DPAD_DOWN: 13,           // D-Pad 하 — 메뉴 커서 전용
      BUTTONS: {               // 액션 -> 버튼 인덱스 목록 (KEYMAP 과 동일한 액션 이름만 사용)
        confirm: [0],           // A / ×
        dash:    [1, 5, 7],     // B / ○ + RB·RT (소울라이크 관행 — 회피 = 오른쪽 숄더 계열)
        parry:   [2],           // X / □
        riposte: [3],           // Y / △
        restart: [8],           // Select / Share
        back:    [9]            // Start
      }
    }
  };

  /* 헬퍼 — 폰트 문자열 조립 */
  CONFIG.font = function (weight, size, family) {
    return weight + ' ' + size + 'px ' + (family || CONFIG.FONT.UI);
  };

  global.CONFIG = CONFIG;
})(window);
