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

  /**
   * 패턴 스텝(정의 테이블의 객체)을 공격 옵션으로 복사한다.
   * 정의 객체는 절대 변형하지 않는다 — 변형하면 BOSSES 테이블이 영구 오염되어
   * 재시작·다음 보스·?seed 결정론이 모두 깨진다.
   */
  function stepOpt(step) {
    var o = {};
    if (!step) return o;
    for (var k in step) if (step.hasOwnProperty(k)) o[k] = step[k];
    return o;
  }

  /** 새 공격 동작 표(js/motions.js). 기존 kind(melee·projectile·zone·charge)는 null — 기존 경로를 그대로 탄다 */
  function motionOf(def) { return (def && global.MOTIONS && global.MOTIONS[def.kind]) || null; }
  /** 근접 판정(접근·lunge·testMelee·궤적)을 쓰는 공격인가 — melee + 근접류 새 동작 */
  function isMelee(def) { var M = motionOf(def); return def.kind === 'melee' || !!(M && M.melee); }

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
    /* 약탈 보스(스펙 §3.8)가 빼앗아 간 손패. 정의 테이블(def)이 아니라 인스턴스에만 둔다. */
    this.loot = [];
    this.moveSpeed = B.WALK_SPEED;
    /* 엔진 방벽 (스펙 §2.4) — def.wall 이 있을 때만 의미가 있다. 시작은 선 상태 */
    this.wallHits = this.def.wall ? this.def.wall.hits : 0;
    this.wallT = this.def.wall ? this.def.wall.up : 0;
    this.wallBreakStagger = false;

    if (this.def.onReset) this.def.onReset(this, this.game);
  };

  /** 하드 모드 "RIPOSTE+" — 같은 보스를 더 빠르게 돌린다 (새 공격·새 패턴 없음) */
  Boss.prototype.isHard = function () { return !!(this.game && this.game.hard); };

  Boss.prototype.patternGap = function () {
    var g = this.def.gap;
    var v = (!g || g[this.phase] === undefined) ? B.PATTERN_GAP_DEFAULT : g[this.phase];
    return this.isHard() ? v * C.HARD.GAP : v;
  };

  Boss.prototype.windupMult = function () {
    var m = this.phase === 2 ? B.PHASE2_WINDUP_MULT : 1;
    // ASSIST: BOSS WINDUP — 기본 ×1 이면 곱이 1이라 밸런스가 그대로다
    if (this.game && this.game.assistWindupMult) m *= this.game.assistWindupMult();
    if (this.isHard()) m *= C.HARD.WINDUP;   // MIN_WINDUP 하한은 그대로 걸린다
    return m;
  };

  /** Phase 2 진입 HP 비율 — 하드는 더 일찍 넘어간다 */
  Boss.prototype.phase2Ratio = function () {
    return this.isHard() ? C.HARD.PHASE2_AT : B.PHASE2_HP_RATIO;
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

    if (step.atk) { this.beginAttack(step.atk, stepOpt(step)); return; }
    if (step.feint) { this.beginAttack(step.feint, { feint: true }); return; }

    if (step.mirror) {
      // 'all' = 플레이어 손패 전부, 'loot' = 빼앗은 손패 전부, 그 외 = 손패 맨 앞 하나
      var ids = this.def.mirrorIds ? this.def.mirrorIds(this, this.game, step.mirror) : null;
      if (!ids || !ids.length) { this.beginAttack(this.def.fallbackAttack || 'thrust', {}); return; }
      if (step.mirror === 'all' || step.mirror === 'loot') {
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

    if (step.move === 'behind') { this.blinkBehind(); return; }
    if (step.move) { this.beginMove(step.move); return; }

    // 알 수 없는 스텝 — 건너뛴다 (스톨 방지)
    this.nextStep();
  };

  /** 플레이어 반대편 prefer.close 지점. 벽에 막혀 너무 가까우면 null (그 스텝은 건너뛴다) */
  Boss.prototype.oppositeSideX = function () {
    var p = this.game.player;
    var pref = this.def.prefer || { close: 90 };
    var side = (this.x >= p.x) ? 1 : -1;
    var target = clamp(p.x - side * pref.close, V.MIN_X, V.MAX_X);
    if (Math.abs(target - p.x) < pref.close * B.SIDE_MIN_RATIO) return null;
    return target;
  };

  /** 순간이동 — 플레이어 등 뒤로 (스펙 §3.5 LANTERN). 잔상을 남기고 BLINK_PAUSE 만큼 멈춘 뒤 다음 스텝. */
  Boss.prototype.blinkBehind = function () {
    var target = this.oppositeSideX();
    if (target === null) { this.nextStep(); return; }
    var fromX = this.x;
    for (var i = 0; i < B.BLINK_GHOSTS; i++) {
      FX.ghost(fromX + (target - fromX) * (i / B.BLINK_GHOSTS), V.FLOOR_Y, this.facing, this.color, 'dash', this.silhouette);
    }
    this.x = target;
    this.vx = 0;
    this.facing = this.dirToPlayer();
    RAudio.swing();
    this.state = 'wait';
    this.stateT = B.BLINK_PAUSE;
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
    else if (kind === 'cross') {
      // 플레이어를 지나쳐 반대편으로 (스펙 §3.6 CHORUS) — 벽에 막히면 스텝을 건너뛴다
      var opp = this.oppositeSideX();
      if (opp === null) { this.nextStep(); return; }
      target = opp;
    }
    this.moveTarget = clamp(target, V.MIN_X, V.MAX_X);
    this.moveSpeed = (kind === 'cross') ? B.CROSS_SPEED : B.WALK_SPEED;
    this.state = 'move';
    this.stateT = B.MOVE_TIMEOUT;
  };

  /* ---- 공격 --------------------------------------------------------------- */

  Boss.prototype.beginAttack = function (id, opt) {
    var def = this.def.attacks[id];
    if (!def) { this.nextStep(); return; }
    opt = opt || {};

    // 벽에 붙어서 시작하는 돌진은 즉시 자기 경직으로 끝난다 — 그런 스텝은 건너뛴다
    if (def.kind === 'charge') {
      var cdir = this.dirToPlayer();
      var wall = cdir > 0 ? V.MAX_X : V.MIN_X;
      if (Math.abs(wall - this.x) < B.MIN_CHARGE_RUN) { this.nextStep(); return; }
    }

    // 새 동작이 지금 설 수 없다고 하면(기둥 칸 폭·빔/협공 뒷공간 부족) 그 스텝을 건너뛴다 — 돌진 MIN_CHARGE_RUN 과 같은 규칙
    var M = motionOf(def);
    if (M && M.canBegin && !M.canBegin(this, def, this.game)) { this.nextStep(); return; }

    // 근접 공격이면 사거리 안으로 먼저 붙는다 (패턴이 헛치지 않도록)
    if (isMelee(def) && !(M && M.noApproach) && !opt._approached) {
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
    // 배수를 먹여도 반응 하한 아래로는 내려가지 않는다
    var windup = Math.max(B.MIN_WINDUP, def.windup * mult);
    var feint = !!(opt.feint || def.feint);
    var hold = 0, second = 0;
    if (feint) {
      // 1차(가짜) 플래시 → windup → 무기 정지(hold) → 2차 플래시 → 같은 windup → 타격.
      // 2차 플래시부터 타격까지가 그 공격의 정상 windup 과 정확히 같아야
      // "금색 플래시 → 항상 같은 시간 → 타격" 리듬이 유지된다 (스펙 §2.2 / §3.4).
      hold = (this.def.feintHold === undefined ? B.FEINT_HOLD : this.def.feintHold);
      second = windup;
    }
    var windupTotal = windup + hold + second;
    if (M && M.extraWindup) windupTotal += M.extraWindup(def);   // 악보의 콜 — 배수가 걸리지 않는 시간

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
      zones: [],                    // 이 공격이 깐 존 — 취소되면 같이 사라져야 한다
      spawns: [],                   // 새 동작이 깐 빔·기둥 — pending 이면 취소될 때 같이 사라진다
      hitsDone: 0,                  // 근접 연타(volley) — 끝난 타격 수
      damage: def.damage === undefined ? 1 : def.damage
    };
    this.attack = a;
    this.state = 'attack';
    this.watch = 0;

    // 존(rain)은 windup 시작에 바닥 경고 스트립을 깔고 windup 끝에 낙하한다.
    // => 존의 tRemain 과 attack.hitAt 이 항상 일치한다.
    if (def.kind === 'zone') {
      // anchor:'boss' 면 보스 앞 offset 에 고정 (스펙 §3.7 gate), 기본은 플레이어 현재 위치 (rain)
      var zx = (def.zone.anchor === 'boss')
        ? this.x + this.dirToPlayer() * (def.zone.offset === undefined ? B.ZONE_OFFSET_DEFAULT : def.zone.offset)
        : this.game.player.x;
      var z = new Zone({
        x: clamp(zx, V.MIN_X, V.MAX_X),
        w: def.zone.w,
        delay: windupTotal,
        damage: def.zone.damage === undefined ? 1 : def.zone.damage,
        tell: def.tell,
        label: def.label || def.id,
        linger: def.zone.linger || 0
      });
      a.zones.push(z);
      this.game.spawnZone(z);
    }

    this.flash(def.tell);
    if (M && M.begin) M.begin(this, a, this.game);
    if (this.def.onAttackStart) this.def.onAttackStart(this, a, this.game);
  };

  /** 텔 플래시 = "이제부터 일정 시간 뒤에 맞는다"는 약속. windup 시작에만 찍는다. */
  Boss.prototype.flash = function (tell) {
    // recover 중에는 절대 텔이 나가지 않는다 (거짓 예고 금지)
    if (this.attack && this.attack.stage === 'recover') return;
    this.flashT = B.FLASH_TIME;
    this.flashColor = (tell === 'red') ? C.COLORS.RED : C.COLORS.GOLD;
    var tip = this.weaponTip();
    FX.tellBurst(tip.x, tip.y, this.flashColor, tell === 'red' ? 'red' : 'gold');
    if (tell === 'red') RAudio.tellRed(); else RAudio.tellGold();
  };

  /**
   * 연사 2·3발째의 "발사" 표시. 텔(예고)이 아니라 이미 날아간 사실의 표시이므로
   * 금색 버스트도, 텔 오디오 큐도 쓰지 않는다 (스펙 §2.2 — 플래시는 예고 전용).
   */
  Boss.prototype.releaseSpark = function (tell) {
    var col = (tell === 'red') ? C.COLORS.RED : C.COLORS.GOLD;
    var tip = this.weaponTip();
    FX.sparks(tip.x, tip.y, C.FX.VOLLEY_SPARKS, col,
      { speed: 170, life: 0.22, size: 1.7, gravity: 140, drag: 3.4 });
    RAudio.swing();
  };

  Boss.prototype.updateAttack = function (dt) {
    var a = this.attack;
    if (!a) { this.state = 'idle'; return; }
    var def = a.def;
    var M = motionOf(def);

    if (a.stage === 'windup') {
      a.t -= dt;

      // feint 2차 플래시 — 무기가 멈췄다가 다시 살아난다
      if (!a.feintFlashed && a.t <= a.flash2At) {
        a.feintFlashed = true;
        this.flash(def.tell);
      }

      if (M && M.tick) M.tick(this, a, dt, this.game);

      // 근접 lunge — windup 마지막 구간에서 approach px 만큼 파고든다
      if (isMelee(def) && def.approach) {
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
      if (isMelee(def) && !a.hasHit) this.testMelee(a);
      a.t -= dt;
      if (a.t <= 0) {
        a.hitsDone++;
        if (M && M.activeEnd && M.activeEnd(this, a, this.game)) return;   // 악보 — 다음 타격을 자기가 정한다
        // 근접 연타(스펙 §3.6): recover 대신 짧은 windup 으로 되돌아가 새 플래시를 찍는다.
        // 각 타격이 예고되므로 전부 패리·훔침 가능하다 (텔 문법 §2.2 유지).
        if (def.kind === 'melee' && def.volley && a.hitsDone < def.volley.count) {
          var gap = Math.max(B.MIN_VOLLEY_GAP, def.volley.interval);
          a.stage = 'windup';
          a.t = gap;
          a.windupTotal = gap;
          a.hitAt = this.game.time + gap;
          a.hasHit = false;
          a.lungeDone = 0;
          a.feintFlashed = true;
          this.flash(def.tell);
          return;
        }
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

  /** 이 공격의 투사체 하나 (정의의 proj 표). extra 의 필드를 덮어쓴다 — 부메랑·협공이 쓴다 */
  Boss.prototype.newShot = function (def, dir, extra) {
    var pj = def.proj;
    var o = {
      x: this.x + dir * (B.HALF_W + 10),
      y: V.FLOOR_Y - (pj.y === undefined ? 48 : pj.y),
      vx: dir * pj.speed,
      r: pj.r || 8,
      tell: def.tell,
      damage: pj.damage === undefined ? 1 : pj.damage,
      reflectDamage: pj.reflectDamage || 0,
      shape: pj.shape || 'arrow',
      skill: def.steal || null,
      label: def.label || def.id,
      owner: 'boss'
    };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    return new Projectile(o);
  };

  /** 연사 간격 — 페이즈 2 값이 있으면 그것 */
  Boss.prototype.volleyInterval = function (def) {
    return (this.phase === 2 && def.volley.p2Interval !== undefined) ? def.volley.p2Interval : def.volley.interval;
  };

  /** 첫 발 + 연사(volley) 예약. make() 가 매 발 새 투사체를 만든다 */
  Boss.prototype.fire = function (def, make) {
    var g = this.game;
    g.spawnProjectile(make());
    // 연사(triple) — 보스 테이블의 volley 표를 그대로 쓴다
    if (def.volley) {
      var iv = this.volleyInterval(def);
      for (var i = 1; i < def.volley.count; i++) g.scheduleProjectile(iv * i, make, true, this.attack);
    }
    RAudio.swing();
  };

  Boss.prototype.onActiveStart = function (a) {
    var def = a.def;
    var g = this.game;

    var M = motionOf(def);
    if (M) {
      if (M.active) M.active(this, a, g);
      if (M.melee) this.testMelee(a);
      return;
    }

    if (def.kind === 'projectile') {
      var self = this, dir = this.dirToPlayer();
      this.fire(def, function () { return self.newShot(def, dir); });
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
    if (def.echo && a.hitsDone === 0) global.MOTIONS.echo.spawn(this, a, g);   // 메아리 — 연타여도 첫 타격만 (스펙 2026-09-23 §3.10)
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

  /* ---- 엔진 방벽 (스펙 §2.4) ------------------------------------------- */

  Boss.prototype.wallUp = function () { return this.wallHits > 0; };

  /** 방벽 타이머. 서 있으면 up 이 다 되면 저절로 내려가고(보상 없음), 내려가 있으면 WALL_DOWN 뒤 다시 선다 */
  Boss.prototype.updateWall = function (dt) {
    var w = this.def.wall;
    if (!w) return;
    this.wallT -= dt;
    if (this.wallT > 0) return;
    if (this.wallUp()) { this.wallHits = 0; this.wallT = B.WALL_DOWN; }
    else { this.wallHits = w.hits; this.wallT = w.up; }
  };

  /** 반사탄이 방벽에 맞았다. hits 가 0 이 되면 깨진다 = 카운터 경직(기믹의 리턴). true 면 깨졌다 */
  Boss.prototype.wallHit = function () {
    if (!this.wallUp()) return false;
    this.wallHits--;
    if (this.wallHits > 0) return false;
    this.wallT = B.WALL_DOWN;
    if (this.invuln <= 0) {                       // 포효는 덮어쓰지 않는다
      this.stagger(this.def.wall.breakStagger, true);
      this.wallBreakStagger = true;               // 이 창은 카운터 히트로 닫히지 않는다 (interrupt 참조)
    }
    return true;
  };

  /**
   * @param {object} [opt] — counter: 카운터 판정이었는가 (counterOnly 게이트용) · dev: 치트, 게이트 무시
   * 두 번째 인자는 선택이다. def.wall / def.counterOnly 가 없는 보스는 게이트를 읽지 않는다.
   */
  Boss.prototype.takeDamage = function (dmg, opt) {
    if (this.dead || this.invuln > 0) return 0;
    if (!(opt && opt.dev)) {
      /* 방벽이 서 있으면 리포스트는 튕긴다 — 반사탄은 game.js 가 먼저 wallHit 으로 처리한다 */
      if (this.wallUp()) { this.hurtFlash = B.HURT_FLASH; return 0; }
      /* counterOnly (스펙 §2.4) — Phase 2 는 카운터(윈드업·카운터 경직 중 명중)로만 피해가 들어간다.
         완화안(softMult)이 있으면 일반 피해도 그 배수로 통과시킨다 */
      var co = this.def.counterOnly;
      if (co && this.phase === 2 && !(opt && opt.counter)) {
        dmg = Math.round(dmg * (co.softMult === undefined ? 0 : co.softMult));
        if (dmg <= 0) { this.hurtFlash = B.HURT_FLASH; return 0; }
      }
    }
    var applied = Math.min(this.hp, dmg);
    this.hp -= applied;
    this.hurtFlash = B.HURT_FLASH;
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else if (this.phase === 1 && this.hp <= this.maxHp * this.phase2Ratio()) {
      this.enterPhase2();
    }
    return applied;
  };

  /**
   * 진행 중인 공격이 이미 월드에 뿌려 놓은 것(존)을 같이 취소한다.
   * 취소하지 않으면 "보스를 끊었는데 낙하는 그대로 온다" = 텔과 결과가 어긋난다.
   */
  Boss.prototype.cancelAttackSpawns = function () {
    var a = this.attack;
    if (!a || !a.zones) return;
    for (var i = 0; i < a.zones.length; i++) {
      var z = a.zones[i];
      if (z && !z.struck) z.dead = true;   // 아직 떨어지지 않았으면 소멸
    }
    a.zones.length = 0;
    if (a.spawns) {
      for (var j = 0; j < a.spawns.length; j++) if (a.spawns[j].pending) a.spawns[j].dead = true;   // 아직 살아나지 않은 빔·기둥
      a.spawns.length = 0;
    }
    this.game.cancelScheduled(a);                  // 연사 후속탄·협공 뒤 탄 — 끊긴 공격이 예약한 발사 (Task 15.1)
  };

  /** 경직. counter=true 면 경직 동안 모든 리포스트가 카운터 판정. */
  Boss.prototype.stagger = function (dur, counter) {
    if (this.dead) return;
    this.cancelAttackSpawns();
    this.attack = null;
    this.pendingAttack = null;
    this.state = 'stagger';
    this.stateT = dur;
    this.staggerCounter = !!counter;
    this.wallBreakStagger = false;
    this.vx = 0;
  };

  /** 공격 취소 + 경직 (카운터 히트 interrupt) */
  Boss.prototype.interrupt = function (dur) {
    dur = dur === undefined ? C.PARRY.FLINCH : dur;
    /* 방벽 파괴 보상 창(스펙 §2.4)은 카운터 히트가 들어와도 짧은 일반 경직으로 덮어 닫지 않는다 —
       "창 안의 리포스트 전부가 카운터" 라는 약속. def.wall 이 없는 보스는 이 분기를 타지 않는다 */
    if (this.wallBreakStagger && this.state === 'stagger' && this.stateT > dur) return;
    this.stagger(dur, false);
  };

  /** 반격 자세(스펙 2026-09-23 §3.8) 중인가 — 이 윈드업은 카운터 창이 아니라 벌 창이다 */
  Boss.prototype.stanceOpen = function () {
    var a = this.attack;
    return !this.dead && this.state === 'attack' && !!a && a.stage === 'windup' && a.def.kind === 'stance';
  };

  /** 자세 중에 맞았다 — 진행 중 공격을 버리고 곧바로 반격(def.stance.counter, 접근 없음). 피해 0, 손패 환급 없음 */
  Boss.prototype.punishStance = function () {
    var id = this.attack.def.stance.counter;
    this.cancelAttackSpawns();
    this.attack = null;
    FX.pop(C.MOTION.STANCE_POP, this.x, V.FLOOR_Y - B.HEIGHT - 16, C.COLORS.GREY, { size: 17 });
    RAudio.parryBlock();
    this.beginAttack(id, { _approached: true });
  };

  Boss.prototype.enterPhase2 = function () {
    this.phase = 2;
    this.cancelAttackSpawns();
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
    this.cancelAttackSpawns();
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
    this.updateWall(dt);

    var p = this.game.player;
    if (this.state !== 'charging') this.facing = this.dirToPlayer();

    this.watch += dt;
    if (this.watch > 6 && this.state !== 'idle') {
      // 안전망: 어떤 상태에도 6초 이상 머물지 않는다
      this.cancelAttackSpawns();
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
        var reached = this.stepTo(this.moveTarget, this.moveSpeed || B.WALK_SPEED, dt);
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
          this.wallBreakStagger = false;
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

  /* ---- 되받아치기 (스펙 §3.7) --------------------------------------------- */

  /**
   * 플레이어 쪽에서 되돌아오는 투사체를 되받아친다. true 면 투사체는 다시 보스 것이 됐다.
   * 조건: def.deflect, 살아 있음, 무적 아님, idle/wait/move 또는 공격 recover 중.
   * 랠리(pr.rally)가 DEFLECT_MAX_RALLY 회째가 되면 되받지 않는다 — 랠리는 반드시 끝난다.
   * 되받은 직후 DEFLECT_RECOVER 만큼 경직 = 모든 리포스트가 카운터 판정(stagger counter).
   */
  Boss.prototype.tryDeflect = function (pr) {
    if (!this.def.deflect || this.dead || this.invuln > 0) return false;
    var open = this.state === 'idle' || this.state === 'wait' || this.state === 'move' ||
               (this.state === 'attack' && this.attack && this.attack.stage === 'recover');
    if (!open) return false;

    var rally = pr.rally || 0;
    var chance = (rally + 1 >= B.DEFLECT_MAX_RALLY) ? 0
               : (this.phase === 2 ? B.DEFLECT_CHANCE_P2 : B.DEFLECT_CHANCE_P1);
    if (!this.game.rng.chance(chance)) return false;

    pr.rally = rally + 1;
    var speed = Math.min(B.DEFLECT_SPEED_MAX, Math.abs(pr.vx) * B.DEFLECT_SPEED_MULT);
    pr.vx = (pr.vx > 0 ? -1 : 1) * speed;      // 플레이어 쪽으로 되돌린다
    pr.owner = 'boss';
    pr.tell = 'gold';                          // 다시 패리 가능 (텔 문법 유지)
    pr.color = C.COLORS.GOLD;
    pr.skill = pr.fromHand || pr.skill || null; // 다시 퍼펙트 패리하면 훔친다
    pr.reflectDamage = pr.damage;              // 되돌리면 같은 피해로 보스에게 간다
    pr.damage = 1;                             // 보스 투사체 피해 = 하트 1
    pr.fromHand = null;
    pr.label = 'DEFLECT';             // 사인(死因)·패배 화면에서 되받아친 탄임을 구분
    pr.pierced = false;
    pr.trail.length = 0;

    this.stagger(B.DEFLECT_RECOVER, true);      // 경직이 공격 취소까지 맡는다 — 되받은 직후 = 카운터 창

    var tip = this.weaponTip();
    FX.sparks(tip.x, tip.y, C.FX.BLOCK_SPARKS, C.COLORS.GOLD, { speed: 240, life: 0.32, size: 2.2 });
    FX.pop('DEFLECT', this.x, V.FLOOR_Y - B.HEIGHT - 14, C.COLORS.GOLD, { size: 15 });
    RAudio.parryBlock();
    return true;
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
        id: a.id, kind: a.def.kind, tell: a.tell,
        stage: (this.state === 'charging') ? 'active' : a.stage,
        tRemain: tRemain,
        hitAt: this.game.time + windupRemain + travel
      };
    }

    var st = { id: a.id, kind: a.def.kind, tell: a.tell, stage: a.stage, tRemain: tRemain, hitAt: a.hitAt };
    var M = motionOf(a.def);
    if (M && M.remote) st.remote = true;          // windup 끝에 몸으로 때리지 않는다 — 위협은 월드 배열에 있다 (스펙 2026-09-23 §3.1)
    if (a.def.kind === 'stance' && a.stage === 'windup') st.stance = true;
    return st;
  };

  global.Boss = Boss;
  global.BOSSES = global.BOSSES || [];
})(window);
