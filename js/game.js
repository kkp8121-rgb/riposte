/* =============================================================================
 * RIPOSTE — js/game.js
 * 상태 머신 · 고정 스텝 업데이트 · 판정 · 점수 · 저장 (스펙 §2, §6)
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* =========================================================================
   * 저장 (localStorage — file:// 에서 막힐 수 있으므로 전부 try/catch)
   * ====================================================================== */
  function loadSave() {
    var fallback = { unlocked: 1, ranks: {}, bestTimes: {} };
    try {
      var raw = global.localStorage.getItem(C.STORAGE.KEY);
      if (!raw) return fallback;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return fallback;
      return {
        unlocked: clamp(o.unlocked || 1, 1, 4),
        ranks: o.ranks || {},
        bestTimes: o.bestTimes || {}
      };
    } catch (e) { return fallback; }
  }

  function writeSave(save) {
    try { global.localStorage.setItem(C.STORAGE.KEY, JSON.stringify(save)); }
    catch (e) { /* file:// 등에서 차단 — 무시 */ }
  }

  /* =========================================================================
   * Game
   * ====================================================================== */
  function Game(opts) {
    opts = opts || {};
    this.seed = opts.seed === undefined ? 1337 : opts.seed;
    this.speed = opts.speed || 1;
    this.debugScale = 1;
    this.rng = new RNG(this.seed);

    this.player = new Player(this);
    this.boss = null;
    this.bossIndex = 0;
    this.defs = global.BOSSES.slice();

    this.projectiles = [];
    this.zones = [];
    this.pendingShots = [];

    this.scene = 'TITLE';
    this.sceneT = 0;
    this.time = 0;
    this.acc = 0;

    this.hits = 0;
    this.perfects = 0;
    this.blocks = 0;
    this.ko = null;            // null | 'victory' | 'defeat'
    this.koT = 0;
    this.result = null;
    this.lastResult = null;

    this.banner = null;
    this.tut = null;
    this.save = loadSave();
    this.run = this.newRun();

    this.skillTable = this.buildSkillTable();
  }

  Game.prototype.newRun = function () {
    return { time: 0, hits: 0, perfects: 0, ranks: [], bosses: [] };
  };

  /** 모든 보스의 steal 정의를 모아 기술 표를 만든다 (봇/HUD 가 참조) */
  Game.prototype.buildSkillTable = function () {
    var t = {};
    for (var i = 0; i < this.defs.length; i++) {
      var atks = this.defs[i].attacks;
      for (var k in atks) {
        if (!atks.hasOwnProperty(k)) continue;
        var s = atks[k].steal;
        if (!s) continue;
        var kd = C.RIPOSTE_KINDS[s.kind];
        t[s.id] = { id: s.id, label: s.label || s.id, kind: s.kind, damage: s.damage, reach: kd.reach };
      }
    }
    return t;
  };

  /* ---- 장면 전환 ---------------------------------------------------------- */

  Game.prototype.setScene = function (s) {
    if (this.scene === 'FIGHT' && s !== 'FIGHT') RAudio.stopDrone();
    this.scene = s;
    this.sceneT = 0;
  };

  Game.prototype.goTitle = function () {
    this.setScene('TITLE');
    this.boss = null;
    this.clearWorld();
    FX.reset();
  };

  Game.prototype.clearWorld = function () {
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.pendingShots.length = 0;
  };

  Game.prototype.startRun = function (fromIndex) {
    this.run = this.newRun();
    this.startBoss(fromIndex || 0);
  };

  Game.prototype.startBoss = function (index) {
    this.bossIndex = clamp(index, 0, this.defs.length - 1);
    var def = this.defs[this.bossIndex];
    this.boss = new Boss(def, this);
    this.player.hardReset();
    this.clearWorld();
    FX.reset();
    this.rng.reset(this.seed + this.bossIndex * 7919);
    this.time = 0;
    this.acc = 0;
    this.hits = 0;
    this.perfects = 0;
    this.blocks = 0;
    this.ko = null;
    this.koT = 0;
    this.result = null;
    this.banner = { name: def.name, title: def.title, t: 0 };
    this.tut = def.tutorial
      ? { parryDone: false, riposteDone: false, dashDone: false, redSeen: false, active: true }
      : null;
    this.setScene('INTRO');
  };

  Game.prototype.beginFight = function () {
    this.setScene('FIGHT');
    this.time = 0;
    var def = this.defs[this.bossIndex];
    RAudio.startDrone(def.droneHz, C.AUDIO.BPM[def.key]);
  };

  Game.prototype.restartBoss = function () {
    this.startBoss(this.bossIndex);
  };

  /* ---- 메인 업데이트 ------------------------------------------------------ */

  /** rawDt = 실제 경과 시간(초). FX 는 실시간, 월드는 히트스톱/슬로모 반영. */
  Game.prototype.update = function (rawDt) {
    if (rawDt > C.LOOP.MAX_FRAME_DT) rawDt = C.LOOP.MAX_FRAME_DT;
    FX.update(rawDt);
    if (FX.hitstop > 0) return;                    // 히트스톱 — 월드 정지

    // KO 연출은 "실제 시간"으로 센다 — 슬로모가 대기 시간을 늘리지 않도록.
    if (this.ko && this.scene === 'FIGHT') {
      this.koT -= rawDt;
      if (this.koT <= 0) {
        if (this.ko === 'victory') this.finishVictory();
        else this.setScene('DEFEAT');
      }
    }

    var dt = rawDt * FX.timeScale() * this.speed * this.debugScale;
    this.acc += dt;
    var steps = 0;
    while (this.acc >= C.LOOP.FIXED_DT && steps < C.LOOP.MAX_STEPS) {
      this.step(C.LOOP.FIXED_DT);
      this.acc -= C.LOOP.FIXED_DT;
      steps++;
    }
    if (steps >= C.LOOP.MAX_STEPS) this.acc = 0;
  };

  Game.prototype.step = function (dt) {
    Input.beginStep();
    this.sceneT += dt;
    if (this.banner) this.banner.t += dt;

    // 전역 키
    if (Input.consume('mute')) {
      var m = RAudio.toggleMute();
      FX.pop(m ? 'MUTED' : 'SOUND ON', V.W - 90, 56, C.COLORS.TEXT_DIM, { size: 13, rise: 10 });
    }

    switch (this.scene) {
      case 'TITLE':   this.stepTitle(dt); break;
      case 'INTRO':   this.stepIntro(dt); break;
      case 'FIGHT':   this.stepFight(dt); break;
      case 'VICTORY': this.stepVictory(dt); break;
      case 'DEFEAT':  this.stepDefeat(dt); break;
      case 'ENDING':  this.stepEnding(dt); break;
    }
  };

  Game.prototype.stepTitle = function (dt) {
    if (Input.consume('newgame')) {
      RAudio.ui(true);
      this.save.unlocked = 1;
      writeSave(this.save);
      this.startRun(0);
      return;
    }
    if (Input.consume('confirm')) {
      RAudio.ui(true);
      this.startRun(this.save.unlocked - 1);
    }
  };

  Game.prototype.stepIntro = function (dt) {
    if (Input.consume('confirm') || this.sceneT >= C.SCENE.INTRO_TIME) {
      this.beginFight();
    }
    if (Input.consume('back')) this.goTitle();
  };

  Game.prototype.stepVictory = function (dt) {
    if (Input.consume('confirm')) {
      RAudio.ui(true);
      if (this.bossIndex + 1 >= this.defs.length) this.setScene('ENDING');
      else this.startBoss(this.bossIndex + 1);
    }
    if (Input.consume('back')) this.goTitle();
  };

  Game.prototype.stepDefeat = function (dt) {
    if (Input.consume('restart')) { RAudio.ui(true); this.restartBoss(); return; }
    if (Input.consume('back')) this.goTitle();
  };

  Game.prototype.stepEnding = function (dt) {
    if (Input.consume('confirm') || Input.consume('back')) { RAudio.ui(true); this.goTitle(); }
  };

  /* ---- FIGHT -------------------------------------------------------------- */

  Game.prototype.stepFight = function (dt) {
    var p = this.player;
    var b = this.boss;

    if (this.ko) {
      // 카운트다운은 update() 가 실제 시간으로 처리한다. 여기서는 연출만 계속 굴린다.
      this.stepWorld(dt, 0, true);
      return;
    }

    this.time += dt;

    if (Input.consume('back')) { this.goTitle(); return; }
    if (Input.consume('restart')) { this.restartBoss(); return; }

    var axis = Input.axis();

    // 패리
    if (Input.consume('parry')) {
      if (p.canParry()) { p.startParry(); RAudio.swing(); }
    }
    // 대시 — 방향은 이동 입력, 없으면 보스 반대쪽
    if (Input.consume('dash')) {
      if (p.canDash()) {
        var dir = axis !== 0 ? axis : (b && b.x >= p.x ? -1 : 1);
        p.startDash(dir);
        RAudio.dash();
        FX.sparks(p.x, V.FLOOR_Y - 6, C.FX.DUST, C.COLORS.PLAYER,
          { speed: 130, life: 0.28, size: 1.8, gravity: 220 });
      }
    }
    // 리포스트 (짧은 입력 버퍼)
    if (Input.consume('riposte')) p.riposteBuffer = C.COMBAT.RIPOSTE_BUFFER;
    if (p.riposteBuffer > 0 && p.canRiposte()) { p.riposteBuffer = 0; this.doRiposte(); }

    this.stepWorld(dt, axis, false);
  };

  Game.prototype.stepWorld = function (dt, axis, koMode) {
    var p = this.player;
    var b = this.boss;

    p.update(dt, koMode ? 0 : axis, b ? b.x : null);
    if (b) b.update(dt);

    // 리포스트 판정
    var rp = p.riposte;
    if (rp && b && !b.dead) {
      if (rp.stage === 'active' && rp.kind === 'shot' && !rp.fired) {
        rp.fired = true;
        this.spawnProjectile(new Projectile({
          x: p.x + p.facing * 22,
          y: V.FLOOR_Y - 48,
          vx: p.facing * rp.k.projSpeed,
          r: rp.k.projR,
          tell: 'player',
          owner: 'player',
          color: C.COLORS.PLAYER,
          shape: rp.skill.kind === 'shot' && rp.skill.id === 'SHOCKWAVE' ? 'wave' : 'arrow',
          damage: this.riposteDamage(rp)
        }));
        RAudio.swing();
      }
      if (rp.stage === 'active' && rp.kind !== 'shot' && !rp.hasHit) {
        if (Math.abs(b.x - p.x) <= rp.k.reach) {
          rp.hasHit = true;
          this.resolveRiposteHit(rp);
        }
      }
    }

    // 예약 발사 (triple 등)
    for (var i = this.pendingShots.length - 1; i >= 0; i--) {
      var ps = this.pendingShots[i];
      ps.t -= dt;
      if (ps.t <= 0) {
        this.pendingShots.splice(i, 1);
        var proj = ps.make();
        this.spawnProjectile(proj);
        if (ps.cue && b && !b.dead) b.flash(proj.tell);
      }
    }

    this.updateProjectiles(dt);
    this.updateZones(dt);
  };

  /* ---- 리포스트 ----------------------------------------------------------- */

  Game.prototype.doRiposte = function () {
    var p = this.player;
    var skill = p.hand.shift();
    if (!skill) return;
    p.startRiposte(skill);
    RAudio.swing();
    if (this.tut && !this.tut.riposteDone) this.tut.riposteDone = true;
  };

  Game.prototype.riposteDamage = function (rp) {
    var mult = 1;
    if (rp.empowered) mult *= C.COMBAT.EMPOWER_MULT;
    return Math.round(rp.skill.damage * mult);
  };

  Game.prototype.resolveRiposteHit = function (rp, fromProjectile) {
    var b = this.boss;
    if (!b || b.dead) return;

    var counter = false;
    if (b.state === 'attack' && b.attack && b.attack.stage === 'windup') counter = true;
    if (b.state === 'stagger' && b.staggerCounter) counter = true;

    var mult = 1;
    if (rp.empowered) mult *= C.COMBAT.EMPOWER_MULT;
    if (counter) mult *= C.COMBAT.COUNTER_MULT;
    var dmg = Math.round(rp.skill.damage * mult);
    var applied = b.takeDamage(dmg);

    // 밀림이 붙은 기술(KICK)은 보스를 밀어낸다
    if (rp.skill.push && !b.armor) {
      var pushDir = (b.x >= this.player.x) ? 1 : -1;
      b.x = Math.max(C.VIEW.MIN_X, Math.min(C.VIEW.MAX_X, b.x + pushDir * rp.skill.push));
    }

    var canInterrupt = !b.armor || rp.empowered;
    if (!b.dead) {
      if (counter && canInterrupt) b.interrupt(C.COMBAT.COUNTER_FLINCH);
      else if (!b.armor) b.stagger(C.COMBAT.RIPOSTE_FLINCH, false);
    }

    // 연출 (스펙 §4)
    FX.addHitstop(C.HITSTOP.RIPOSTE);
    FX.addShake(C.SHAKE.RIPOSTE);
    var hx = b.x, hy = V.FLOOR_Y - C.BOSS.HEIGHT * 0.55;
    FX.sparks(hx, hy, C.FX.RIPOSTE_SPARKS, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.PLAYER,
      { speed: 300, life: 0.45, size: 2.6 });
    FX.ring(hx, hy, 6, 44, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.PLAYER, 0.28, 3);
    FX.pop('-' + applied, hx, hy - 20, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.WHITE,
      { size: rp.empowered ? 26 : 21 });
    if (counter) {
      FX.pop('COUNTER!', hx, hy - 52, C.COLORS.COUNTER, { size: 20, shake: true });
      RAudio.counter();
    }
    RAudio.riposteHit(rp.empowered);
  };

  /* ---- 판정: 보스 근접/돌진 히트 ------------------------------------------ */

  Game.prototype.resolveBossHit = function (boss, a) {
    var p = this.player;
    if (this.ko) return;

    if (p.isInvulnerable()) {
      // 대시 통과 성공
      if (a.tell === 'red' && this.tut && !this.tut.dashDone) this.tut.dashDone = true;
      FX.sparks(p.x, V.FLOOR_Y - 40, 6, C.COLORS.PLAYER,
        { speed: 180, life: 0.24, size: 1.8 });
      return;
    }

    if (a.tell === 'gold') {
      var win = p.parryWindow();
      if (win === 'perfect') { this.onPerfectParry(a.def, boss); return; }
      if (win === 'block') { this.onBlock(a.def, boss); return; }
    }
    this.damagePlayer(a.damage, boss.x, a.def.push);
  };

  Game.prototype.onZoneStrike = function (zone) {
    var p = this.player;
    FX.addShake(C.SHAKE.RIPOSTE);
    FX.sparks(zone.x, V.FLOOR_Y, C.FX.HIT_SPARKS, C.COLORS.RED,
      { speed: 320, life: 0.5, dir: -Math.PI / 2, spread: Math.PI * 0.9, size: 2.6 });
    RAudio.tellRed();
    if (this.ko) return;
    if (!zone.contains(p.x)) return;
    if (p.isInvulnerable()) {
      if (this.tut && !this.tut.dashDone) this.tut.dashDone = true;
      return;
    }
    this.damagePlayer(zone.damage, zone.x);
  };

  Game.prototype.onChargeWall = function (boss, ch) {
    FX.addHitstop(C.HITSTOP.CHARGE_WALL);
    FX.addShake(C.SHAKE.CHARGE_WALL);
    var wx = boss.x + boss.chargeDir * C.BOSS.HALF_W;
    FX.sparks(wx, V.FLOOR_Y - 40, C.FX.HIT_SPARKS, boss.color,
      { speed: 340, life: 0.55, dir: boss.chargeDir > 0 ? Math.PI : 0, spread: Math.PI, size: 2.8 });
    FX.ring(wx, V.FLOOR_Y - 40, 8, 60, boss.color, 0.3, 3);
    FX.pop('STUNNED', boss.x, V.FLOOR_Y - C.BOSS.HEIGHT - 16, C.COLORS.GREY, { size: 16 });
    RAudio.playerHit();
  };

  /* ---- 판정: 퍼펙트 / 블록 ------------------------------------------------ */

  Game.prototype.onPerfectParry = function (def, boss, projectile) {
    var p = this.player;
    p.onParrySuccess();
    p.streak++;
    p.streakPulse = C.PLAYER.STREAK_PULSE_TIME;
    this.perfects++;

    var px = p.x + p.facing * 34;
    var py = V.FLOOR_Y - C.PLAYER.HEIGHT * 0.58;

    FX.addHitstop(C.HITSTOP.PERFECT);
    FX.addShake(C.SHAKE.PERFECT);
    FX.flashWhite(C.FLASH.PERFECT_WHITE);
    FX.setSlowmo(C.SLOWMO.PERFECT_SCALE, C.SLOWMO.PERFECT_TIME);
    FX.sparks(px, py, C.FX.PERFECT_SPARKS, C.COLORS.GOLD,
      { speed: 380, life: 0.55, size: 2.8 });
    FX.ring(px, py, 8, 66, C.COLORS.GOLD, 0.34, 3);
    RAudio.parryPerfect();

    if (def && def.steal) {
      p.pushHand(def.steal);
      FX.pop('STOLEN: ' + (def.steal.label || def.steal.id), px, py - 46, C.COLORS.GOLD, { size: 19 });
      RAudio.steal();
    } else {
      FX.pop('PERFECT', px, py - 46, C.COLORS.GOLD, { size: 19 });
    }

    if (projectile) projectile.reflect();
    else if (boss && !boss.dead) boss.stagger(C.PARRY.FLINCH, false);

    if (this.tut && !this.tut.parryDone) this.tut.parryDone = true;
  };

  Game.prototype.onBlock = function (def, boss, projectile) {
    var p = this.player;
    p.onParrySuccess();
    this.blocks++;

    var px = p.x + p.facing * 30;
    var py = V.FLOOR_Y - C.PLAYER.HEIGHT * 0.58;

    FX.addHitstop(C.HITSTOP.BLOCK);
    FX.addShake(C.SHAKE.BLOCK);
    FX.sparks(px, py, C.FX.BLOCK_SPARKS, C.COLORS.GREY, { speed: 220, life: 0.35, size: 2.1 });
    FX.pop('BLOCK', px, py - 40, C.COLORS.GREY, { size: 16 });
    RAudio.parryBlock();

    if (projectile) projectile.dead = true;
    var away = boss ? (p.x >= boss.x ? 1 : -1) : p.facing * -1;
    p.x = clamp(p.x + away * C.PARRY.BLOCK_PUSH, V.MIN_X, V.MAX_X);
  };

  /* ---- 피해 -------------------------------------------------------------- */

  Game.prototype.damagePlayer = function (dmg, fromX, extraPush) {
    var p = this.player;
    if (this.ko || p.isInvulnerable()) return;

    p.takeDamage(dmg);
    this.hits++;

    var away = (p.x >= fromX) ? 1 : -1;
    p.knock = away * (C.PLAYER.HURT_KNOCKBACK + (extraPush || 0)) * C.PLAYER.KNOCK_DECAY;

    FX.addHitstop(C.HITSTOP.PLAYER_HIT);
    FX.addShake(C.SHAKE.PLAYER_HIT);
    FX.flashTint(C.FLASH.VIGNETTE);
    FX.sparks(p.x, V.FLOOR_Y - C.PLAYER.HEIGHT * 0.5, C.FX.HIT_SPARKS, C.COLORS.HEART,
      { speed: 300, life: 0.5, size: 2.6 });
    FX.pop('-' + dmg, p.x, V.FLOOR_Y - C.PLAYER.HEIGHT - 10, C.COLORS.HEART, { size: 20 });
    RAudio.playerHit();

    if (p.hp <= 0) this.onPlayerDown();
  };

  /* ---- 투사체 / 존 -------------------------------------------------------- */

  Game.prototype.spawnProjectile = function (p) { this.projectiles.push(p); };
  Game.prototype.spawnZone = function (z) { this.zones.push(z); };
  Game.prototype.scheduleProjectile = function (delay, make, cue) {
    this.pendingShots.push({ t: delay, make: make, cue: !!cue });
  };

  Game.prototype.updateProjectiles = function (dt) {
    var p = this.player, b = this.boss;
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var pr = this.projectiles[i];
      pr.update(dt);

      if (pr.owner === 'boss' && !this.ko) {
        var d = Math.abs(pr.x - p.x);
        if (!pr.pierced) {
          if (pr.tell === 'gold' && d <= C.PARRY.PROJECTILE_CATCH) {
            var win = p.parryWindow();
            if (win === 'perfect') {
              // 반사 — 투사체는 살아서 보스 쪽으로 되돌아간다 (스펙 §2.3)
              this.onPerfectParry({ steal: pr.skill }, b, pr);
              continue;
            }
            if (win === 'block') { this.onBlock(null, b, pr); pr.dead = true; }
          }
          if (!pr.dead && d <= C.PROJECTILE.HIT_DIST) {
            if (p.isInvulnerable()) {
              pr.pierced = true;
              if (pr.tell === 'red' && this.tut && !this.tut.dashDone) this.tut.dashDone = true;
            } else {
              this.damagePlayer(pr.damage, pr.x);
              pr.dead = true;
            }
          }
        }
      } else if (pr.owner === 'player' && b && !b.dead) {
        if (Math.abs(pr.x - b.x) <= C.BOSS.HALF_W + pr.r + 6) {
          pr.dead = true;
          this.resolveProjectileHitBoss(pr);
        }
      }

      if (pr.dead) this.projectiles.splice(i, 1);
    }
  };

  Game.prototype.resolveProjectileHitBoss = function (pr) {
    var b = this.boss;
    var counter = (b.state === 'attack' && b.attack && b.attack.stage === 'windup') ||
                  (b.state === 'stagger' && b.staggerCounter);
    var empowered = this.player.isEmpowered();
    var mult = counter ? C.COMBAT.COUNTER_MULT : 1;
    var dmg = Math.round(pr.damage * mult);
    var applied = b.takeDamage(dmg);

    if (!b.dead) {
      var canInterrupt = !b.armor || empowered;
      if (counter && canInterrupt) b.interrupt(C.COMBAT.COUNTER_FLINCH);
      else if (!b.armor) b.stagger(C.COMBAT.RIPOSTE_FLINCH, false);
    }

    FX.addHitstop(C.HITSTOP.RIPOSTE);
    FX.addShake(C.SHAKE.RIPOSTE);
    var hy = V.FLOOR_Y - C.BOSS.HEIGHT * 0.55;
    FX.sparks(b.x, hy, C.FX.RIPOSTE_SPARKS, C.COLORS.PLAYER, { speed: 290, life: 0.42, size: 2.5 });
    FX.pop('-' + applied, b.x, hy - 20, C.COLORS.WHITE, { size: 20 });
    if (counter) { FX.pop('COUNTER!', b.x, hy - 50, C.COLORS.COUNTER, { size: 19 }); RAudio.counter(); }
    RAudio.riposteHit(false);
  };

  Game.prototype.updateZones = function (dt) {
    for (var i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].update(dt, this);
      if (this.zones[i].dead) this.zones.splice(i, 1);
    }
  };

  /* ---- 페이즈 2 / KO ------------------------------------------------------ */

  Game.prototype.onPhase2 = function (boss) {
    FX.addHitstop(C.HITSTOP.PHASE2);
    FX.addShake(C.SHAKE.PHASE2);
    FX.flashWhite(C.FLASH.PHASE2_WHITE);
    FX.ring(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, 10, 220, boss.color, 0.6, 4);
    FX.sparks(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, C.FX.PERFECT_SPARKS, boss.color,
      { speed: 420, life: 0.7, size: 3 });
    this.banner = { name: boss.name, title: '— PHASE II', t: 0, phase2: true };
    RAudio.roar();
    RAudio.dronePhase2();
  };

  Game.prototype.onBossDown = function (boss) {
    this.ko = 'victory';
    this.koT = C.SLOWMO.KO_TIME;
    this.result = {
      boss: boss.name, key: boss.key,
      time: this.time, hits: this.hits, perfects: this.perfects,
      par: boss.par,
      rank: this.rankFor(this.hits, this.time, boss.par)
    };
    FX.setSlowmo(C.SLOWMO.KO_SCALE, C.SLOWMO.KO_TIME);
    FX.setZoom(C.SLOWMO.KO_ZOOM);
    FX.addShake(C.SHAKE.BOSS_DEATH);
    FX.flashWhite(C.FLASH.DEATH_WHITE);
    FX.sparks(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, C.FX.DEATH_SHARDS, boss.color,
      { speed: 430, life: 1.1, size: 3.4, gravity: 460 });
    FX.ring(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, 10, 180, C.COLORS.WHITE, 0.6, 4);
    RAudio.bossDown();
    RAudio.stopDrone();
  };

  Game.prototype.onPlayerDown = function () {
    this.ko = 'defeat';
    this.koT = C.SLOWMO.DEFEAT_TIME;
    this.result = {
      boss: this.boss ? this.boss.name : '',
      time: this.time, hits: this.hits, perfects: this.perfects
    };
    FX.setSlowmo(C.SLOWMO.DEFEAT_SCALE, C.SLOWMO.DEFEAT_TIME);
    FX.addShake(C.SHAKE.PLAYER_HIT);
    RAudio.defeat();
    RAudio.stopDrone();
  };

  Game.prototype.finishVictory = function () {
    var r = this.result;
    this.lastResult = r;
    this.run.time += r.time;
    this.run.hits += r.hits;
    this.run.perfects += r.perfects;
    this.run.ranks.push(r.rank);
    this.run.bosses.push({ name: r.boss, time: r.time, hits: r.hits, perfects: r.perfects, rank: r.rank });

    // 저장 — 진행도 + 보스별 최고 랭크
    this.save.unlocked = clamp(Math.max(this.save.unlocked, this.bossIndex + 2), 1, this.defs.length);
    var prev = this.save.ranks[r.key];
    if (!prev || C.RANK.VALUE[r.rank] > C.RANK.VALUE[prev]) this.save.ranks[r.key] = r.rank;
    var bt = this.save.bestTimes[r.key];
    if (!bt || r.time < bt) this.save.bestTimes[r.key] = r.time;
    writeSave(this.save);

    FX.setZoom(1);
    this.setScene('VICTORY');
  };

  /* ---- 랭크 (스펙 §2.7) --------------------------------------------------- */

  Game.prototype.rankFor = function (hits, time, par) {
    if (hits <= C.RANK.S_HITS && time <= par) return 'S';
    if (hits <= C.RANK.A_HITS || time <= par) return 'A';
    if (hits <= C.RANK.B_HITS) return 'B';
    return 'C';
  };

  Game.prototype.overallRank = function () {
    var rs = this.run.ranks;
    if (!rs.length) return 'C';
    var sum = 0;
    for (var i = 0; i < rs.length; i++) sum += C.RANK.VALUE[rs[i]];
    var avg = Math.round(sum / rs.length);
    return C.RANK.LETTERS[clamp(avg - 1, 0, 3)];
  };

  /* ---- 튜토리얼 프롬프트 (스펙 §3.1) -------------------------------------- */

  Game.prototype.tutorialPrompt = function () {
    var t = this.tut;
    if (!t || !this.boss || this.scene !== 'FIGHT' || this.ko) return null;
    // 붉은 텔이 한 번이라도 보이면 대시 프롬프트 우선
    if (this.boss.attack && this.boss.attack.tell === 'red') t.redSeen = true;
    if (t.redSeen && !t.dashDone) return C.TUTORIAL.DASH;
    if (this.boss.phase !== 1) return null;
    if (!t.parryDone) return C.TUTORIAL.PARRY;
    if (this.player.hand.length > 0 && !t.riposteDone) return C.TUTORIAL.RIPOSTE;
    return null;
  };

  /* ---- 디버그 훅 (스펙 §7) ------------------------------------------------ */

  Game.prototype.getState = function () {
    var b = this.boss;
    var p = this.player;
    var i, hand = [];
    for (i = 0; i < p.hand.length; i++) hand.push(p.hand[i].id);

    var projs = [];
    for (i = 0; i < this.projectiles.length; i++) {
      var pr = this.projectiles[i];
      if (pr.owner !== 'boss') continue;
      projs.push({ x: pr.x, vx: pr.vx, tell: pr.tell });
    }

    var zones = [];
    for (i = 0; i < this.zones.length; i++) {
      var z = this.zones[i];
      if (z.struck) continue;
      zones.push({ x: z.x, w: z.w, tRemain: Math.max(0, z.t) });
    }

    return {
      scene: this.scene,
      bossId: this.bossIndex + 1,
      bossHp: b ? b.hp : 0,
      bossMaxHp: b ? b.maxHp : 0,
      phase: b ? b.phase : 1,
      playerHp: p.hp,
      playerX: p.x,
      bossX: b ? b.x : 0,
      hand: hand,
      streak: p.streak,
      time: this.time,
      hits: this.hits,
      perfects: this.perfects,
      currentAttack: b ? b.attackState() : null,
      projectiles: projs,
      zones: zones
    };
  };

  global.Game = Game;
})(window);
