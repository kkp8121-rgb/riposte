/* =============================================================================
 * RIPOSTE — js/entities.js
 * Player · Projectile · Zone
 * 판정(퍼펙트/블록/히트)은 game.js 가 소유한다. 여기는 상태 + 이동만.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;

  /* =========================================================================
   * Player
   * ====================================================================== */
  function Player(game) {
    this.game = game;
    this.reset();
  }

  Player.prototype.reset = function () {
    this.x = C.PLAYER.SPAWN_X;
    this.vx = 0;
    this.facing = 1;
    // 최대 HP 는 ASSIST 배율이 붙는다 (기본 ×1 = 지금 수치 그대로)
    this.maxHp = (this.game && this.game.assistMaxHp) ? this.game.assistMaxHp() : C.PLAYER.HP;
    this.hp = this.maxHp;

    this.iframes = 0;
    this.hurtFlash = 0;
    this.knock = 0;            // 남은 밀림 속도

    this.parryT = -1;          // 패리 입력 후 경과 (>=0 이면 창 진행 중)
    this.parryLock = 0;        // 재입력 불가 잔여
    this.parryPose = 0;        // 포즈 연출 잔여
    this.parryFlash = 0;
    this.parryBuffer = 0;      // 락/대시 중에 눌린 패리 입력 (버퍼)
    this.parryGrace = 0;       // 패리 성공 직후 유예 — 같은 순간 겹쳐 온 두 번째 위협도 받아낸다

    this.stamina = C.STAMINA.MAX;   // 패리·대시가 깎고 시간이 채운다
    this.staminaDelay = 0;          // 회복 시작까지 남은 시간
    this.staminaEmptyFlash = 0;     // 잔량 부족 입력 점멸 잔여

    this.dashT = 0;
    this.dashCd = 0;
    this.dashDir = 1;
    this.ghostT = 0;

    this.riposte = null;       // { skill, k, stage, t, hasHit, empowered }
    this.riposteBuffer = 0;

    this.hand = [];
    this.streak = 0;

    this.animT = 0;
    this.streakPulse = 0;      // 퍼펙트 패리 시 스트릭 카운터 펄스 (스펙 §4)
    this.heartBreak = -1;      // 방금 깨진 하트 인덱스
    this.heartBreakT = 0;
  };

  Player.prototype.hardReset = function () { this.reset(); };

  /* ---- 상태 질의 --------------------------------------------------------- */

  Player.prototype.dashInvuln = function () {
    return this.dashT > 0 && this.dashT > (C.DASH.DURATION - C.DASH.IFRAMES);
  };
  Player.prototype.isInvulnerable = function () {
    return this.iframes > 0 || this.dashInvuln();
  };
  Player.prototype.parryWindow = function () {
    // 성공 직후 유예: 같은 프레임에 함께 도착한 두 번째 투사체가
    // "받아냈는데 맞았다"가 되지 않게 한다
    if (this.parryGrace > 0) return 'perfect';
    if (this.parryT < 0) return 'none';
    if (this.parryT < C.PARRY.PERFECT_WINDOW) return 'perfect';
    if (this.parryT < C.PARRY.BLOCK_WINDOW) return 'block';
    return 'none';
  };
  Player.prototype.canParry = function () {
    return this.parryLock <= 0 && this.parryT < 0 && this.dashT <= 0 &&
           this.stamina >= C.STAMINA.PARRY_COST &&
           !(this.riposte && this.riposte.stage !== 'recover');
  };
  Player.prototype.canDash = function () {
    return this.dashCd <= 0 && this.dashT <= 0 &&
           this.stamina >= C.STAMINA.DASH_COST &&
           !(this.riposte && this.riposte.stage !== 'recover');
  };
  Player.prototype.canRiposte = function () {
    return this.hand.length > 0 && !this.riposte && this.dashT <= 0 && this.parryT < 0;
  };
  Player.prototype.isEmpowered = function () {
    return this.streak >= C.COMBAT.EMPOWER_STREAK;
  };

  /* ---- 액션 -------------------------------------------------------------- */

  /* 스태미너 — 소모하면 회복 대기가 다시 걸린다 */
  Player.prototype.spendStamina = function (cost) {
    this.stamina = Math.max(0, this.stamina - cost);
    this.staminaDelay = C.STAMINA.REGEN_DELAY;
  };
  Player.prototype.gainStamina = function (amount) {
    this.stamina = Math.min(C.STAMINA.MAX, this.stamina + amount);
  };
  /** 잔량이 모자란 채로 눌렀다 — 점멸 + 둔탁음 (점멸 중엔 다시 울리지 않는다) */
  Player.prototype.staminaEmpty = function () {
    if (this.staminaEmptyFlash > 0) return;
    this.staminaEmptyFlash = C.STAMINA.EMPTY_FLASH;
    RAudio.staminaEmpty();
  };

  Player.prototype.startParry = function () {
    this.spendStamina(C.STAMINA.PARRY_COST);
    this.parryT = 0;
    this.parryLock = C.PARRY.RECOVERY;
    this.parryPose = C.PARRY.POSE_TIME;
    // 리포스트 후딜은 패리로 캔슬 가능 (연출/조작감)
    if (this.riposte && this.riposte.stage === 'recover') this.riposte = null;
  };

  Player.prototype.onParrySuccess = function () {
    this.parryLock = Math.min(this.parryLock, C.PARRY.RECOVERY_ON_SUCCESS);
    this.parryT = -1;
    this.parryGrace = C.PARRY.SUCCESS_GRACE;
    this.parryFlash = C.BOSS.FLASH_TIME;
  };

  Player.prototype.startDash = function (dir) {
    this.spendStamina(C.STAMINA.DASH_COST);
    this.dashT = C.DASH.DURATION;
    this.dashCd = C.DASH.COOLDOWN;
    this.dashDir = dir;
    this.ghostT = 0;
    this.parryT = -1;
    this.parryGrace = 0;
    this.riposte = null;
    this.knock = 0;
  };

  Player.prototype.startRiposte = function (skill) {
    var k = C.RIPOSTE_KINDS[skill.kind];
    this.riposte = {
      skill: skill, k: k, kind: skill.kind,
      stage: 'startup', t: k.startup, hasHit: false,
      empowered: this.isEmpowered(),
      fired: false
    };
    this.parryT = -1;
  };

  Player.prototype.pushHand = function (skill) {
    this.hand.push(skill);
    while (this.hand.length > C.HAND.SIZE) this.hand.shift();
  };

  Player.prototype.takeDamage = function (dmg) {
    this.heartBreak = this.hp - 1;
    this.heartBreakT = C.PLAYER.HEART_BREAK_TIME;
    this.hp -= dmg;
    this.iframes = C.PLAYER.HURT_IFRAMES;
    this.hurtFlash = 0.3;
    this.streak = 0;
    this.parryT = -1;
    this.parryGrace = 0;
    this.riposte = null;
    if (this.hp < 0) this.hp = 0;
  };

  /* ---- 업데이트 ---------------------------------------------------------- */

  Player.prototype.update = function (dt, axis, bossX) {
    this.animT += dt;

    if (this.iframes > 0) this.iframes -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.parryLock > 0) this.parryLock -= dt;
    if (this.parryPose > 0) this.parryPose -= dt;
    if (this.parryFlash > 0) this.parryFlash -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.streakPulse > 0) this.streakPulse -= dt;
    if (this.heartBreakT > 0) this.heartBreakT -= dt;
    if (this.riposteBuffer > 0) this.riposteBuffer -= dt;
    if (this.parryBuffer > 0) this.parryBuffer -= dt;
    if (this.parryGrace > 0) this.parryGrace -= dt;
    if (this.staminaEmptyFlash > 0) this.staminaEmptyFlash -= dt;

    // 스태미너 회복 — 마지막 소모 후 REGEN_DELAY 가 지나야 차오른다
    if (this.staminaDelay > 0) this.staminaDelay -= dt;
    else if (this.stamina < C.STAMINA.MAX) {
      this.stamina = Math.min(C.STAMINA.MAX, this.stamina + C.STAMINA.REGEN * dt);
    }

    if (this.parryT >= 0) {
      this.parryT += dt;
      if (this.parryT >= C.PARRY.BLOCK_WINDOW) this.parryT = -1;
    }

    // 리포스트 생명주기
    var rp = this.riposte;
    if (rp) {
      rp.t -= dt;
      if (rp.t <= 0) {
        if (rp.stage === 'startup') { rp.stage = 'active'; rp.t = rp.k.active; }
        else if (rp.stage === 'active') { rp.stage = 'recover'; rp.t = rp.k.recover; }
        else this.riposte = null;
      }
    }

    // 이동
    if (this.dashT > 0) {
      this.dashT -= dt;
      var dashSpeed = C.DASH.DISTANCE / C.DASH.DURATION;
      this.x += this.dashDir * dashSpeed * dt;
      this.vx = this.dashDir * dashSpeed;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = C.DASH.DURATION / C.DASH.GHOSTS;
        FX.ghost(this.x, V.FLOOR_Y, this.facing, C.COLORS.PLAYER, 'dash');
      }
      if (this.dashT <= 0) this.vx = 0;
    } else {
      var canMove = !this.riposte || this.riposte.stage === 'recover';
      var moveScale = (this.riposte ? 0.45 : 1);
      var target = canMove ? axis * C.PLAYER.SPEED * moveScale : 0;
      if (this.riposte && this.riposte.kind === 'lunge' && this.riposte.stage === 'startup') {
        target = 0;
      }
      var accel = (Math.abs(target) > Math.abs(this.vx)) ? C.PLAYER.ACCEL : C.PLAYER.FRICTION;
      if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
      else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
      this.x += this.vx * dt;
    }

    // lunge 리포스트의 전진 스텝
    if (rp && rp.stage === 'active' && rp.k.step > 0 && !rp.stepped) {
      rp.stepped = true;
      this.x += this.facing * rp.k.step;
    }

    // 밀림
    if (this.knock !== 0) {
      this.x += this.knock * dt;
      this.knock -= this.knock * Math.min(1, dt * C.PLAYER.KNOCK_DECAY);
      if (Math.abs(this.knock) < 4) this.knock = 0;
    }

    // 방향: 항상 보스를 본다 (대시 중엔 대시 방향 유지 안 함 — 시선은 보스)
    if (bossX !== undefined && bossX !== null) {
      this.facing = (bossX >= this.x) ? 1 : -1;
    }
    if (axis !== 0 && this.dashT <= 0) this.moveDir = axis;

    // 아레나 경계
    if (this.x < V.MIN_X) { this.x = V.MIN_X; if (this.vx < 0) this.vx = 0; this.knock = 0; }
    if (this.x > V.MAX_X) { this.x = V.MAX_X; if (this.vx > 0) this.vx = 0; this.knock = 0; }
  };

  /* =========================================================================
   * Projectile
   * ====================================================================== */
  function Projectile(o) {
    this.x = o.x;
    this.y = o.y === undefined ? V.FLOOR_Y - 46 : o.y;
    this.vx = o.vx;
    this.r = o.r || 8;
    this.tell = o.tell || 'gold';        // 'gold' | 'red' | 'player'
    this.damage = o.damage || 1;
    this.owner = o.owner || 'boss';
    this.color = o.color || (o.tell === 'red' ? C.COLORS.RED : C.COLORS.GOLD);
    this.skill = o.skill || null;        // 패리 시 훔칠 기술
    this.fromHand = o.fromHand || null;  // 손패에서 쓴 리포스트 탄이면 그 기술 (0딜이면 환불)
    this.label = o.label || null;        // 패배 화면 "SLAIN BY ..." 용
    this.reflectDamage = o.reflectDamage || 0;
    this.shape = o.shape || 'arrow';     // 'arrow' | 'wave' | 'bolt'
    this.rally = 0;                      // 되받아치기(deflect) 횟수 — 스펙 §3.7
    this.deflectTried = false;           // 이번 왕복에서 deflect 판정을 이미 했는가
    this.dead = false;
    this.age = 0;
    this.trail = [];
    /* 새 동작 (스펙 2026-09-23 §3.2·3.3) */
    this.boomerang = o.boomerang || null;   // 부메랑 표 {turnDist, backTime, backTell} — 정의 공유, 읽기만
    this.returning = false;                 // 부메랑이 돌아서 오는 중
    this.fromBehind = !!o.fromBehind;       // 협공 뒤 탄 — 플레이어 등 뒤에서 생겼다
  }

  Projectile.prototype.update = function (dt) {
    this.age += dt;
    if (this.trail.length >= C.PROJECTILE.TRAIL) this.trail.shift();
    this.trail.push(this.x);
    this.x += this.vx * dt;
    if (this.x < -60 || this.x > V.W + 60) this.dead = true;
  };

  /**
   * 퍼펙트 패리 반사. toward(±1)가 있으면 그 방향으로 보낸다 — 등 뒤에서 온 탄(부메랑 귀환·협공 뒤 탄)만 넘긴다.
   * 없으면 기존대로 속도를 뒤집는다 (보스 쪽에서 온 탄은 뒤집으면 보스 쪽이다).
   */
  Projectile.prototype.reflect = function (toward) {
    var speed = Math.abs(this.vx) * C.PROJECTILE.REFLECT_MULT;
    this.vx = (toward === undefined || toward === null) ? -this.vx * C.PROJECTILE.REFLECT_MULT : toward * speed;
    this.owner = 'player';
    this.tell = 'player';
    this.color = C.COLORS.PLAYER;
    this.damage = this.reflectDamage || this.damage;
    this.trail.length = 0;
    this.deflectTried = false;           // 새 왕복 — 보스가 다시 되받을 수 있다
  };

  /* =========================================================================
   * Zone — 지면 낙하 존 (rain). 스스로 카운트다운하고 스스로 판정한다.
   * ====================================================================== */
  function Zone(o) {
    this.x = o.x;
    this.w = o.w;
    this.t = o.delay;          // 낙하까지 남은 시간
    this.delay = o.delay;
    this.damage = o.damage || 1;
    this.tell = o.tell || 'red';
    this.label = o.label || 'ZONE';
    this.struck = false;
    this.strikeT = 0;
    this.dead = false;
    this.linger = o.linger || 0;   // > 0 이면 첫 타격 뒤에도 남아 LINGER_TICK 마다 다시 때린다
    this.everStruck = false;       // 렌더 전용 — 한 번이라도 때렸는지(재무장 구간 표시용)
  }

  Zone.prototype.contains = function (x) {
    return x > this.x - this.w / 2 && x < this.x + this.w / 2;
  };

  Zone.prototype.update = function (dt, game) {
    if (this.dead) return;      // 취소된 존(보스 경직/페이즈 전환)은 절대 낙하하지 않는다
    if (!this.struck) {
      this.t -= dt;
      if (this.t <= 0) {
        this.struck = true;
        this.everStruck = true;
        this.strikeT = C.ZONE.STRIKE_TIME;
        game.onZoneStrike(this);
      }
    } else {
      this.strikeT -= dt;
      if (this.strikeT <= 0) {
        if (this.linger > 0) {
          this.linger -= C.ZONE.LINGER_TICK;   // 다음 타격까지
          this.struck = false;
          this.t = C.ZONE.LINGER_TICK;
          if (this.linger <= 0) this.dead = true;
        } else {
          this.dead = true;
        }
      }
    }
  };

  /* =========================================================================
   * Beam — 쓸기 빔 (스펙 2026-09-23 §3.4). pending(예고) 동안 벽에 서 있다가 dir 로 움직인다.
   * 판정은 game.onBeamTouch 가 한다 — 무적(대시) 중이면 계속 살핀다.
   * ====================================================================== */
  function Beam(o) {
    this.x = o.x;
    this.w = o.w;
    this.dir = o.dir;
    this.speed = o.speed;
    this.vx = 0;
    this.t = o.delay;
    this.damage = o.damage || 1;
    this.label = o.label || 'BEAM';
    this.pending = true;
    this.hitDone = false;
    this.dead = false;
  }

  Beam.prototype.contains = function (x) {
    return x > this.x - this.w / 2 - C.PLAYER.HALF_W && x < this.x + this.w / 2 + C.PLAYER.HALF_W;
  };

  Beam.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.pending) {
      this.t -= dt;
      if (this.t <= 0) { this.pending = false; this.vx = this.dir * this.speed; }
      return;
    }
    this.x += this.vx * dt;
    if (!this.hitDone && this.contains(game.player.x)) game.onBeamTouch(this);
    if (this.x < V.MIN_X - this.w || this.x > V.MAX_X + this.w) this.dead = true;
  };

  /* =========================================================================
   * Pillar — 기둥 (스펙 2026-09-23 §3.6). pending(바닥 경고) → 선다(game.onPillarRise) → up 초 뒤 사라진다.
   * 선 동안 플레이어의 걷기·대시·밀림을 막는다(game.blockByPillars). 보스·투사체는 통과한다.
   * ====================================================================== */
  function Pillar(o) {
    this.x = o.x;
    this.w = o.w;
    this.t = o.delay;
    this.delay = o.delay;
    this.up = o.up;
    this.damage = o.damage || 1;
    this.label = o.label || 'PILLAR';
    this.pending = true;
    this.side = 0;             // 설 때 플레이어가 있던 쪽(-1 왼쪽 / 1 오른쪽) — 그 쪽으로만 막는다 (game.blockByPillars)
    this.dead = false;
  }

  Pillar.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.pending) {
      this.t -= dt;
      if (this.t <= 0) { this.pending = false; game.onPillarRise(this); }
      return;
    }
    this.up -= dt;
    if (this.up <= 0) this.dead = true;
  };

  /* =========================================================================
   * Mark — 표식 (스펙 2026-09-23 §3.7). 플레이어를 따라다니다 delay 뒤 그 자리에서 터진다.
   * 붙은 뒤에는 보스가 끊겨도 사라지지 않는다(이미 약속된 타격).
   * ====================================================================== */
  function Mark(o) {
    this.x = o.x;
    this.t = o.delay;
    this.delay = o.delay;
    this.tell = o.tell || 'gold';
    this.damage = o.damage || 1;
    this.def = o.def || null;
    this.label = o.label || 'MARK';
    this.dead = false;
  }

  Mark.prototype.update = function (dt, game) {
    if (this.dead) return;
    this.x = game.player.x;
    this.t -= dt;
    if (this.t > 0) return;
    this.dead = true;
    game.resolveRemoteHit({ tell: this.tell, def: this.def, damage: this.damage,
      fromX: game.boss ? game.boss.x : this.x, label: this.label, kind: 'mark' });
  };

  /* =========================================================================
   * Echo — 메아리 잔상 (스펙 2026-09-23 §3.10). 원 공격이 친 자리에서 wait 뒤 나타나
   * 자기 플래시(game.onEchoFlash)를 찍고, 원 windup 뒤 같은 reach 로 친다(game.onEchoStrike).
   * ====================================================================== */
  function Echo(o) {
    this.x = o.x;
    this.facing = o.facing;
    this.def = o.def;
    this.tell = o.def.tell;
    this.reach = o.def.reach;
    this.damage = o.damage || 1;
    this.label = o.label || 'ECHO';
    this.color = o.color;
    this.build = o.build;
    this.wait = o.delay;
    this.windup = o.windup;
    this.t = o.windup;
    this.stage = 'wait';       // wait → windup → hit
    this.fade = 0;
    this.dead = false;
  }

  Echo.prototype.update = function (dt, game) {
    if (this.dead) return;
    if (this.stage === 'wait') {
      this.wait -= dt;
      if (this.wait <= 0) { this.stage = 'windup'; game.onEchoFlash(this); }
      return;
    }
    if (this.stage === 'windup') {
      this.t -= dt;
      if (this.t <= 0) { this.stage = 'hit'; this.fade = C.MOTION.ECHO_FADE; game.onEchoStrike(this); }
      return;
    }
    this.fade -= dt;
    if (this.fade <= 0) this.dead = true;
  };

  global.Player = Player;
  global.Projectile = Projectile;
  global.Zone = Zone;
  global.Beam = Beam;
  global.Pillar = Pillar;
  global.Mark = Mark;
  global.Echo = Echo;
})(window);
