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
      UI: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
      TITLE: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
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
      BOTTOM_MARGIN: 18
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
      HURT_FLASH: 0.12
    },

    /* ---- 텔 / 투사체 / 존 ------------------------------------------------ */
    TELL: {
      BURST_R: 26,
      RAYS: 8,
      RAY_LEN: 46,
      LIFE: 0.30
    },

    PROJECTILE: {
      HIT_DIST: 26,
      REFLECT_MULT: 1.15,
      TRAIL: 6
    },

    ZONE: {
      STRIKE_TIME: 0.22,
      STRIP_H: 10,
      COLUMN_ALPHA: 0.20
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

    /* ---- 화면 (스펙 §6) -------------------------------------------------- */
    SCENE: {
      INTRO_TIME: 1.2,
      PHASE2_BANNER: 1.4
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
      TELL_GOLD_HZ: 2200,
      TELL_GOLD_MS: 40,
      TELL_RED_HZ: 90,
      TELL_RED_MS: 120,
      PARRY_PARTIALS: [1800, 2700, 4100],
      PARRY_DECAY: 0.5,
      RIPOSTE_HZ: 120,
      STEAL_ARPEGGIO: [523.25, 659.25, 783.99], // C5 E5 G5
      STEAL_GAP_MS: 60,
      /* Phase 2 심박 킥 BPM (보스별) */
      BPM: { vesper: 96, seraph: 104, graven: 84, mirror: 116 }
    },

    /* ---- 저장 ------------------------------------------------------------ */
    STORAGE: {
      KEY: 'riposte.progress.v1'
    },

    /* ---- 튜토리얼 (스펙 §3.1 — Vesper P1 한정) --------------------------- */
    TUTORIAL: {
      PARRY: 'K  —  PARRY THE GOLD FLASH',
      RIPOSTE: 'J  —  RIPOSTE WITH THE STOLEN ATTACK',
      DASH: 'SPACE  —  DASH THROUGH RED',
      Y: 132,
      PULSE_HZ: 2.4
    }
  };

  /* 헬퍼 — 폰트 문자열 조립 */
  CONFIG.font = function (weight, size, family) {
    return weight + ' ' + size + 'px ' + (family || CONFIG.FONT.UI);
  };

  global.CONFIG = CONFIG;
})(window);
