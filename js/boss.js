/* =============================================================================
 * RIPOSTE — js/boss.js
 * Boss 베이스: 패턴 실행기 + 공격 생명주기(windup→active→recover).
 * feint / charge / zone / projectile / armor / mirror 지원 (스펙 §3, §7).
 *
 * 텔 플래시는 windup 시작에 발생하고 타격은 windup 끝에 발생한다.
 * => "플래시 → 타격" 시간이 공격마다 항상 일정 (스펙 §2.2).
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;
  var B = C.BOSS;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* =========================================================================
   * Boss
   * ====================================================================== */
  function Boss(def, game) {
    this.def = def;
    this.game = game;
    this.key = def.key;
    this.name = def.name;
    this.title = def.title;
    this.color = def.color;
    this.silhouette = def.silhouette;
    this.armor = !!def.armor;
    this.maxHp = def.hp;
    this.par = def.par;
    this.reset();
  }

  Boss.prototype.reset = function () {
    this.hp = this.maxHp;
    this.phase = 1;
    this.x = this.def.spawnX === undefined ? B.SPAWN_X : this.def.spawnX;
    this.vx = 0;
    this.facing = -1;

    this.state = 'idle';       // idle|wait|move|approach|attack|charging|roar|stagger|dead
    this.stateT = 0;
    this.idleTime = 0;
    this.gap = this.patternGap();
    this.watch = 0;

    this.attack = null;
    this.pattern = null;
    this.patternName = null;
    this.stepIndex = 0;
    this.lastPattern = null;

    this.invuln = 0;
    this.hurtFlash = 0;
    this.flashT = 0;
    this.flashColor = C.COLORS.GOLD;
    this.staggerCounter = false;   // 경직 중 모든 리포스트가 카운터 판정
    this.dead = false;
    this.animT = 0;
    this.chargeDir = -1;

    if (this.def.onReset) this.def.onReset(this, this.game);
  };

  Boss.prototype.patternGap = function () {
    var g = this.def.gap;
    if (!g) return B.PATTERN_GAP_DEFAULT;
    return g[this.phase] === undefined ? B.PATTERN_GAP_DEFAULT : g[this.phase];
  };

  Boss.prototype.windupMult = function () {
    return this.phase === 2 ? B.PHASE2_WINDUP_MULT : 1;
  };

  Boss.prototype.dist = function () {
    return Math.abs(this.game.player.x - this.x);
  };
  Boss.prototype.dirToPlayer = function () {
    return (this.game.player.x >= this.x) ? 1 : -1;
  };

  /** 텔 플래시가 찍힐 무기 끝 좌표. 렌더와 완전히 같은 포즈 식을 쓴다. */
  Boss.prototype.weaponTip = function () {
    var pose = 'windup';
    if (this.attack && this.attack.stage === 'active') pose = 'active';
    if (global.Render && global.Render.tipOf) {
      var t = global.Render.tipOf(this.silhouette, this.facing, pose);
      return { x: this.x + t.x, y: V.FLOOR_Y + t.y };
    }
    var f = this.def.weaponTip || { dx: 40, dy: 54 };
    return { x: this.x + this.facing * f.dx, y: V.FLOOR_Y - f.dy };
  };

  /* ---- 패턴 실행기 -------------------------------------------------------- */

  Boss.prototype.pickPattern = function () {
    var pool = this.def.patterns[this.phase] || this.def.patterns[1];
    if (this.def.onPickPattern) {
      var forced = this.def.onPickPattern(this, this.game);
      if (forced) pool = forced;
    }
    var entry = this.game.rng.pickAvoid(pool, this.lastPattern);
    this.lastPattern = entry;
    this.pattern = entry.steps.slice();
    this.patternName = entry.name;
    this.stepIndex = 0;
    this.nextStep();
  };

  Boss.prototype.nextStep = function () {
    if (this.dead) return;
    if (!this.pattern || this.stepIndex >= this.pattern.length) {
      this.pattern = null;
      this.state = 'idle';
      this.idleTime = 0;
      this.gap = this.patternGap();
      return;
    }
    var step = this.pattern[this.stepIndex++];

    if (step.atk) { this.beginAttack(step.atk, step); return; }
    if (step.feint) { this.beginAttack(step.feint, { feint: true }); return; }

    if (step.mirror) {
      var ids = this.def.mirrorIds ? this.def.mirrorIds(this, this.game) : null;
      if (!ids || !ids.length) { this.beginAttack(this.def.fallbackAttack || 'thrust', {}); return; }
      if (step.mirror === 'all') {
        var ins = [];
        for (var i = 0; i < ids.length; i++) {
          ins.push({ atk: ids[i] });
          if (i < ids.length - 1) ins.push({ wait: this.def.mirrorGap || 0.35 });
        }
        Array.prototype.splice.apply(this.pattern, [this.stepIndex, 0].concat(ins));
      } else {
        this.pattern.splice(this.stepIndex, 0, { atk: ids[0] });
      }
      this.nextStep();
      return;
    }

    if (step.wait !== undefined) {
      this.state = 'wait';
      // {wait: p1값, p2: p2값} — 페이즈별 간격을 보스 테이블이 소유한다
      this.stateT = (this.phase === 2 && step.p2 !== undefined) ? step.p2 : step.wait;
      return;
    }

    if (step.move) { this.beginMove(step.move); return; }

    // 알 수 없는 스텝 — 건너뛴다 (스톨 방지)
    this.nextStep();
  };

  Boss.prototype.beginMove = function (kind) {
    var p = this.game.player;
    var pref = this.def.prefer || { close: 90, far: 340, back: 200 };
    var side = (this.x >= p.x) ? 1 : -1;
    var target = this.x;
    if (kind === 'close') target = p.x + side * pref.close;
    else if (kind === 'far') target = p.x + side * pref.far;
    else if (kind === 'back') target = this.x + side * pref.back;
    else if (kind === 'left') target = this.x - B.STRAFE;
    else if (kind === 'right') target = this.x + B.STRAFE;
    this.moveTarget = clamp(target, V.MIN_X, V.MAX_X);
    this.state = 'move';
    this.stateT = B.MOVE_TIMEOUT;
  };

  /* ---- 공격 --------------------------------------------------------------- */

  Boss.prototype.beginAttack = function (id, opt) {
    var def = this.def.attacks[id];
    if (!def) { this.nextStep(); return; }
    opt = opt || {};

    // 근접 공격이면 사거리 안으로 먼저 붙는다 (패턴이 헛치지 않도록)
    if (def.kind === 'melee' && !opt._approached) {
      var need = def.reach * B.APPROACH_RATIO + (def.approach || 0) * 0.5;
      if (this.dist() > need) {
        this.state = 'approach';
        this.stateT = B.APPROACH_TIMEOUT;
        this.pendingAttack = { id: id, opt: opt, need: need };
        return;
      }
    }
    this.pendingAttack = null;

    var mult = this.windupMult();
    var windup = def.windup * mult;
    var feint = !!(opt.feint || def.feint);
    var hold = 0, second = 0;
    if (feint) {
      hold = (this.def.feintHold === undefined ? B.FEINT_HOLD : this.def.feintHold);
      second = (this.def.feintSecond === undefined ? B.FEINT_SECOND : this.def.feintSecond) * mult;
    }
    var windupTotal = windup + hold + second;

    var a = {
      id: id,
      def: def,
      tell: def.tell,
      stage: 'windup',
      t: windupTotal,
      windupTotal: windupTotal,
      feint: feint,
      flash2At: second,             // 남은 windup 이 이 값 이하가 되면 2차 플래시 (feint)
      feintFlashed: !feint,
      hitAt: this.game.time + windupTotal,
      startX: this.x,
      lungeDone: 0,
      hasHit: false,
      damage: def.damage === undefined ? 1 : def.damage
    };
    this.attack = a;
    this.state = 'attack';
    this.watch = 0;

    // 존(rain)은 windup 시작에 바닥 경고 스트립을 깔고 windup 끝에 낙하한다.
    // => 존의 tRemain 과 attack.hitAt 이 항상 일치한다.
    if (def.kind === 'zone') {
      this.game.spawnZone(new Zone({
        x: clamp(this.game.player.x, V.MIN_X, V.MAX_X),
        w: def.zone.w,
        delay: windupTotal,
        damage: def.zone.damage === undefined ? 1 : def.zone.damage,
        tell: def.tell
      }));
    }

    this.flash(def.tell);
    if (this.def.onAttackStart) this.def.onAttackStart(this, a, this.game);
  };

  Boss.prototype.flash = function (tell) {
    this.flashT = B.FLASH_TIME;
    this.flashColor = (tell === 'red') ? C.COLORS.RED : C.COLORS.GOLD;
    var tip = this.weaponTip();
    FX.tellBurst(tip.x, tip.y, this.flashColor);
    if (tell === 'red') RAudio.tellRed(); else RAudio.tellGold();
  };

  Boss.prototype.updateAttack = function (dt) {
    var a = this.attack;
    if (!a) { this.state = 'idle'; return; }
    var def = a.def;

    if (a.stage === 'windup') {
      a.t -= dt;

      // feint 2차 플래시 — 무기가 멈췄다가 다시 살아난다
      if (!a.feintFlashed && a.t <= a.flash2At) {
        a.feintFlashed = true;
        this.flash(def.tell);
      }

      // 근접 lunge — windup 마지막 구간에서 approach px 만큼 파고든다
      if (def.kind === 'melee' && def.approach) {
        var lungeSpan = Math.min(0.18, a.windupTotal * 0.35);
        if (a.t < lungeSpan) {
          var want = def.approach * (1 - Math.max(0, a.t) / lungeSpan);
          var delta = want - a.lungeDone;
          a.lungeDone = want;
          var dir = this.dirToPlayer();
          var minGap = C.PLAYER.HALF_W + B.HALF_W + 6;
          var nx = this.x + dir * delta;
          if (Math.abs(this.game.player.x - nx) >= minGap) this.x = nx;
        }
      }

      if (a.t <= 0) {
        a.stage = 'active';
        a.t = def.active === undefined ? 0.08 : def.active;
        this.onActiveStart(a);
      }
      return;
    }

    if (a.stage === 'active') {
      if (def.kind === 'melee' && !a.hasHit) this.testMelee(a);
      a.t -= dt;
      if (a.t <= 0) {
        a.stage = 'recover';
        a.t = def.recover * (this.phase === 2 ? 0.9 : 1);
      }
      return;
    }

    // recover
    a.t -= dt;
    if (a.t <= 0) {
      this.attack = null;
      this.nextStep();
    }
  };

  Boss.prototype.onActiveStart = function (a) {
    var def = a.def;
    var g = this.game;

    if (def.kind === 'projectile') {
      var pj = def.proj;
      var dir = this.dirToPlayer();
      var self = this;
      var make = function () {
        return new Projectile({
          x: self.x + dir * (B.HALF_W + 10),
          y: V.FLOOR_Y - (pj.y === undefined ? 48 : pj.y),
          vx: dir * pj.speed,
          r: pj.r || 8,
          tell: def.tell,
          damage: pj.damage === undefined ? 1 : pj.damage,
          reflectDamage: pj.reflectDamage || 0,
          shape: pj.shape || 'arrow',
          skill: def.steal || null,
          owner: 'boss'
        });
      };
      g.spawnProjectile(make());
      // 연사(triple) — 보스 테이블의 volley 표를 그대로 쓴다
      if (def.volley) {
        var iv = (this.phase === 2 && def.volley.p2Interval !== undefined)
          ? def.volley.p2Interval : def.volley.interval;
        for (var i = 1; i < def.volley.count; i++) {
          g.scheduleProjectile(iv * i, make, true);
        }
      }
      RAudio.swing();
      return;
    }

    if (def.kind === 'zone') {
      // 존은 windup 시작에 이미 예고돼 있고 여기서 낙하 판정이 난다.
      return;
    }

    if (def.kind === 'charge') {
      this.state = 'charging';
      this.chargeDir = this.dirToPlayer();
      a.chargeHit = false;
      FX.addShake(C.SHAKE.RIPOSTE * 0.5);
      return;
    }

    // melee
    if (def.shockwaveFx) {
      // slam 착탄 충격파 연출 (스펙 §3.3)
      FX.ring(this.x + this.facing * def.reach * 0.35, V.FLOOR_Y, 6, def.reach * 1.15,
              this.color, 0.34, 4);
      FX.sparks(this.x + this.facing * def.reach * 0.35, V.FLOOR_Y, C.FX.DUST * 2, this.color,
        { speed: 340, life: 0.55, dir: -Math.PI / 2, spread: Math.PI * 1.1, size: 2.6 });
      FX.addShake(C.SHAKE.RIPOSTE);
    }
    this.testMelee(a);
  };

  Boss.prototype.testMelee = function (a) {
    var p = this.game.player;
    if (Math.abs(p.x - this.x) <= a.def.reach) {
      a.hasHit = true;
      this.game.resolveBossHit(this, a);
    }
  };

  Boss.prototype.updateCharge = function (dt) {
    var a = this.attack;
    if (!a) { this.state = 'idle'; return; }
    var ch = a.def.charge;
    this.x += this.chargeDir * ch.speed * dt;
    this.facing = this.chargeDir;

    // 이동 히트박스
    var p = this.game.player;
    if (!a.chargeHit && Math.abs(p.x - this.x) <= (B.HALF_W + C.PLAYER.HALF_W + 10)) {
      a.chargeHit = true;
      a.hasHit = true;
      this.game.resolveBossHit(this, a);
    }

    if (this.x <= V.MIN_X || this.x >= V.MAX_X) {
      this.x = clamp(this.x, V.MIN_X, V.MAX_X);
      this.game.onChargeWall(this, ch);
      this.stagger(ch.wallStun, true);
    }
  };

  /* ---- 피격 / 경직 / 페이즈 ---------------------------------------------- */

  Boss.prototype.takeDamage = function (dmg) {
    if (this.dead || this.invuln > 0) return 0;
    var applied = Math.min(this.hp, dmg);
    this.hp -= applied;
    this.hurtFlash = B.HURT_FLASH;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else if (this.phase === 1 && this.hp <= this.maxHp * B.PHASE2_HP_RATIO) {
      this.enterPhase2();
    }
    return applied;
  };

  /** 경직. counter=true 면 경직 동안 모든 리포스트가 카운터 판정. */
  Boss.prototype.stagger = function (dur, counter) {
    if (this.dead) return;
    this.attack = null;
    this.pendingAttack = null;
    this.state = 'stagger';
    this.stateT = dur;
    this.staggerCounter = !!counter;
    this.vx = 0;
  };

  /** 공격 취소 + 경직 (카운터 히트 interrupt) */
  Boss.prototype.interrupt = function (dur) {
    this.stagger(dur === undefined ? C.PARRY.FLINCH : dur, false);
  };

  Boss.prototype.enterPhase2 = function () {
    this.phase = 2;
    this.attack = null;
    this.pendingAttack = null;
    this.pattern = null;
    this.state = 'roar';
    this.stateT = B.PHASE2_ROAR;
    this.invuln = B.PHASE2_ROAR;
    this.game.onPhase2(this);
    if (this.def.onPhase2) this.def.onPhase2(this, this.game);
  };

  Boss.prototype.die = function () {
    this.dead = true;
    this.attack = null;
    this.pattern = null;
    this.state = 'dead';
    this.game.onBossDown(this);
  };

  /* ---- 업데이트 ---------------------------------------------------------- */

  Boss.prototype.update = function (dt) {
    this.animT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.dead) return;

    var p = this.game.player;
    if (this.state !== 'charging') this.facing = this.dirToPlayer();

    this.watch += dt;
    if (this.watch > 6 && this.state !== 'idle') {
      // 안전망: 어떤 상태에도 6초 이상 머물지 않는다
      this.attack = null;
      this.state = 'idle';
      this.idleTime = B.WATCHDOG_IDLE;
      this.watch = 0;
    }

    switch (this.state) {

      case 'idle':
        this.idleTime += dt;
        this.drift(dt);
        if (this.idleTime >= this.gap || this.idleTime >= B.WATCHDOG_IDLE) {
          this.watch = 0;
          this.pickPattern();
        }
        break;

      case 'wait':
        this.stateT -= dt;
        this.drift(dt);
        if (this.stateT <= 0) { this.watch = 0; this.nextStep(); }
        break;

      case 'move':
        this.stateT -= dt;
        var reached = this.stepTo(this.moveTarget, B.WALK_SPEED, dt);
        if (reached || this.stateT <= 0) { this.watch = 0; this.nextStep(); }
        break;

      case 'approach':
        this.stateT -= dt;
        var need = this.pendingAttack ? this.pendingAttack.need : 100;
        var side = (this.x >= p.x) ? 1 : -1;
        var tx = clamp(p.x + side * (need * 0.7), V.MIN_X, V.MAX_X);
        var done = this.stepTo(tx, B.APPROACH_SPEED, dt);
        if (done || this.dist() <= need || this.stateT <= 0) {
          var pend = this.pendingAttack;
          this.pendingAttack = null;
          this.watch = 0;
          if (pend) {
            pend.opt._approached = true;
            this.beginAttack(pend.id, pend.opt);
          } else this.nextStep();
        }
        break;

      case 'attack':
        this.updateAttack(dt);
        break;

      case 'charging':
        this.updateCharge(dt);
        break;

      case 'roar':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'idle';
          this.idleTime = 0;
          this.gap = this.patternGap();
          this.watch = 0;
        }
        break;

      case 'stagger':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.staggerCounter = false;
          this.watch = 0;
          // 경직이 풀리면 진행 중이던 패턴을 이어간다 (charge→slam 같은 연결 보존)
          if (this.pattern && this.stepIndex < this.pattern.length) this.nextStep();
          else {
            this.state = 'idle';
            this.idleTime = 0;
            this.gap = this.patternGap() * 0.5;
          }
        }
        break;
    }

    this.x = clamp(this.x, V.MIN_X, V.MAX_X);
  };

  /** 선호 거리로 천천히 표류 (idle/wait 중) */
  Boss.prototype.drift = function (dt) {
    var pref = this.def.prefer;
    if (!pref) return;
    var d = this.dist();
    var side = (this.x >= this.game.player.x) ? 1 : -1;
    var want = null;
    if (d < pref.close * 0.8) want = this.game.player.x + side * pref.close;
    else if (d > pref.far) want = this.game.player.x + side * pref.far;
    if (want === null) { this.vx = 0; return; }
    this.stepTo(clamp(want, V.MIN_X, V.MAX_X), B.WALK_SPEED * 0.75, dt);
  };

  /** targetX 로 한 스텝 이동. 도달하면 true. */
  Boss.prototype.stepTo = function (targetX, speed, dt) {
    var d = targetX - this.x;
    var step = speed * dt;
    if (Math.abs(d) <= step) { this.x = targetX; this.vx = 0; return true; }
    var dir = d > 0 ? 1 : -1;
    this.x += dir * step;
    this.vx = dir * speed;
    return false;
  };

  /* ---- 디버그 훅용 상태 --------------------------------------------------- */

  Boss.prototype.attackState = function () {
    var a = this.attack;
    if (!a) return null;
    var tRemain = Math.max(0, a.t);

    // charge 는 "달려와서 닿는 순간"이 실제 타격 시점이므로 hitAt 을 거리로 예측한다.
    if (a.def.kind === 'charge') {
      var gap = B.HALF_W + C.PLAYER.HALF_W + 10;
      var d = Math.max(0, Math.abs(this.game.player.x - this.x) - gap);
      var travel = d / a.def.charge.speed;
      var windupRemain = (a.stage === 'windup') ? tRemain : 0;
      if (this.state === 'charging') {
        var wall = this.chargeDir > 0 ? V.MAX_X : V.MIN_X;
        tRemain = Math.abs(wall - this.x) / a.def.charge.speed;
      }
      return {
        id: a.id, tell: a.tell,
        stage: (this.state === 'charging') ? 'active' : a.stage,
        tRemain: tRemain,
        hitAt: this.game.time + windupRemain + travel
      };
    }

    return { id: a.id, tell: a.tell, stage: a.stage, tRemain: tRemain, hitAt: a.hitAt };
  };

  global.Boss = Boss;
  global.BOSSES = global.BOSSES || [];
})(window);
