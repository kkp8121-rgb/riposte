/* =============================================================================
 * RIPOSTE — js/motions.js
 * 새 공격 동작 표 (챕터 2·3 재설계, 스펙 docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md §3).
 * boss.js 는 def.kind 가 이 표에 있으면 여기로 넘긴다. 기존 kind(melee·projectile·zone·charge)는 여기 없다.
 *
 * 항목 필드 (전부 선택):
 *   melee      true 면 근접 판정(접근·lunge·testMelee·궤적)을 쓴다
 *   noApproach true 면 근접이라도 먼저 붙지 않는다 (끌어당김)
 *   remote     true 면 windup 끝에 몸으로 때리지 않는다 — attackState().remote (봇이 헛패리하지 않게)
 *   canBegin(boss, def, game)  false 면 그 스텝을 건너뛴다 (돌진 MIN_CHARGE_RUN 과 같은 규칙)
 *   extraWindup(def)           windup 총길이에 더할 초 (악보의 콜)
 *   begin(boss, a, game)       windup 시작 (텔 플래시 직후)
 *   tick(boss, a, dt, game)    windup 중 매 스텝
 *   active(boss, a, game)      active 시작
 *   activeEnd(boss, a, game)   active 끝. true 를 돌려주면 recover 대신 자기가 다음 단계를 정했다
 *
 * 🔴 정의(def)는 읽기만 한다. 진행 상태는 공격 인스턴스(a)나 월드 엔티티에 둔다 (tests/state.mjs).
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;
  var B = C.BOSS;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  /** 플레이어 등 뒤 방향 (보스 반대쪽): -1 = 왼쪽, 1 = 오른쪽 */
  function behindDir(boss, p) { return boss.x >= p.x ? -1 : 1; }
  /** 플레이어 등 뒤 벽까지 거리 */
  function roomBehind(boss, p) { return behindDir(boss, p) < 0 ? p.x - V.MIN_X : V.MAX_X - p.x; }

  var MOTIONS = {};

  /* ---- 끌어당김 (§3.5 AVARICE) -------------------------------------------
   * windup 동안 플레이어를 보스 쪽으로 끈다. pull.speed < PLAYER.SPEED 라 걸어서 버틸 수 있다 —
   * 버티면 사거리 밖에서 헛친다. 대시 중에는 끌지 않는다. */
  MOTIONS.pull = {
    melee: true,
    noApproach: true,                                  // 보스가 오지 않고 플레이어를 부른다
    tick: function (boss, a, dt, g) {
      var p = g.player;
      if (p.dashT > 0 || g.ko) return;
      var dir = boss.x >= p.x ? 1 : -1;                // 플레이어 → 보스
      var room = Math.abs(boss.x - p.x) - (C.PLAYER.HALF_W + B.HALF_W + 6);
      if (room <= 0) return;                           // 몸이 닿으면 멈춘다
      p.x += dir * Math.min(room, a.def.pull.speed * dt);
    }
  };

  /* ---- 반격 자세 (§3.8 ADAMANT) ------------------------------------------
   * windup = 자세. 이 동안 맞으면 벌(game.js → boss.punishStance), 참으면 끝에 금 강타.
   * 자세 표시는 색(회색)·모양(점선 링, render.js)·소리(RAudio.guard) 3채널이다. */
  MOTIONS.stance = {
    melee: true,
    begin: function () { RAudio.guard(); }
  };

  /* ---- 악보 (§3.9 CHORUS) ------------------------------------------------
   * 콜: 첫 플래시와 함께 음표를 notes 간격대로 들려준다. 응답: gap 뒤 같은 간격으로 친다, 플래시 없이.
   * 배수(P2·하드·어시스트)는 gap(def.windup)에만 걸린다 — 콜과 응답의 리듬은 불변. */
  function scoreNotes(def) {                          // 모든 간격은 MIN_VOLLEY_GAP 이상 — 받고 다음을 받을 수 있어야 한다
    var n = def.score.notes, out = [];
    for (var i = 0; i < n.length; i++) out.push(Math.max(B.MIN_VOLLEY_GAP, n[i]));
    return out;
  }
  function scorePip(boss) {
    FX.ring(boss.x, V.FLOOR_Y - C.MOTION.SCORE_PIP_Y, 2, 12, C.COLORS.GOLD, C.MOTION.SCORE_PIP_LIFE, 2);
    RAudio.note();
  }
  MOTIONS.score = {
    melee: true,
    /* 남은 타격이 있으면 퍼펙트 패리가 보스를 경직시키지 않는다 — 경직은 공격을 지워 악보를 끊는다 (game.js onPerfectParry) */
    holdOnParry: function (a) { return a.scoreIdx < scoreNotes(a.def).length; },
    extraWindup: function (def) {
      var n = scoreNotes(def), s = 0;
      for (var i = 0; i < n.length; i++) s += n[i];
      return s;
    },
    begin: function (boss, a) {
      var n = scoreNotes(a.def), t = 0;
      a.callAt = [0];
      for (var i = 0; i < n.length; i++) { t += n[i]; a.callAt.push(t); }
      a.callNext = 1;
      a.scoreIdx = 0;
      scorePip(boss);                                  // 첫 음표 = 텔 플래시와 같은 순간
    },
    tick: function (boss, a) {
      if (a.scoreIdx > 0) return;                      // 응답(타격) 중에는 음표가 없다
      var elapsed = a.windupTotal - a.t;
      while (a.callNext < a.callAt.length && elapsed >= a.callAt[a.callNext]) { scorePip(boss); a.callNext++; }
    },
    activeEnd: function (boss, a, g) {
      var n = scoreNotes(a.def);
      if (a.scoreIdx >= n.length) return false;         // 마지막 타격 — 평소대로 recover
      var wait = n[a.scoreIdx] - (a.def.active === undefined ? 0.08 : a.def.active);
      a.scoreIdx++;
      a.stage = 'windup';
      a.t = wait;
      a.windupTotal = wait;
      a.hitAt = g.time + wait;
      a.hasHit = false;
      a.lungeDone = 0;
      a.feintFlashed = true;                            // 플래시 없음 — 콜에서 들려준 리듬 그대로 친다
      return true;
    }
  };

  /* ---- 부메랑 (§3.2 LANTERN) ---------------------------------------------
   * 나간다(def.tell) → 플레이어를 turnDist 지나거나 벽에서 돈다(game.turnBoomerang) → backTell 로 돌아온다. */
  MOTIONS.boomerang = {
    remote: true,
    active: function (boss, a) {
      var def = a.def, dir = boss.dirToPlayer();
      boss.fire(def, function () { return boss.newShot(def, dir, { boomerang: def.boomerang }); });
    }
  };

  /* ---- 협공 (§3.3 TEMPEST) -----------------------------------------------
   * 앞 탄(마지막 발)이 받는 거리에 닿고 gap 초 뒤, 등 뒤 backDist 에서 생긴 탄이 받는 거리에 닿도록 예약한다.
   * 뒤 탄은 생기는 순간 그 자리에서 텔 버스트 — 생성 → 도착이 일정하다. */
  function backShot(boss, def, g) {
    var pc = def.pincer, p = g.player, side = behindDir(boss, p);
    var pad = C.MOTION.PINCER_SPAWN_PAD;
    // 그새 플레이어가 등 뒤 벽으로 물러섰다 — 뒤 탄이 몸 위에 예고 없이 생기므로 쏘지 않는다 (null = 발사 취소)
    if (roomBehind(boss, p) - pad < C.MOTION.PINCER_MIN_ROOM) return null;
    var x = clamp(p.x + side * pc.backDist, V.MIN_X + pad, V.MAX_X - pad);
    var y = V.FLOOR_Y - pc.y;
    var red = pc.backTell === 'red';
    FX.tellBurst(x, y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
    // 벽을 등지면 생기는 자리가 backDist 보다 가깝다 — 속도를 그대로 두면 짧아진 거리를 그대로 빨리
    // 주파해 일찍 도착한다(앞→뒤 gap 이 준다). 이동 "시간"을 backDist 기준과 같게 고정한다(부메랑 귀환과 같은 방식).
    var catchD = C.PARRY.PROJECTILE_CATCH;
    var nominalT = Math.max(0, pc.backDist - catchD) / pc.backSpeed;
    var d = Math.abs(x - p.x);
    var speed = nominalT > 0 ? Math.max(1, d - catchD) / nominalT : pc.backSpeed;
    return new Projectile({
      x: x, y: y, vx: -side * speed, r: pc.r, tell: pc.backTell,
      damage: pc.damage === undefined ? 1 : pc.damage, reflectDamage: pc.reflectDamage || 0, shape: pc.shape || 'bolt',
      skill: red ? null : (def.steal || null), label: def.label || def.id,
      owner: 'boss', fromBehind: true
    });
  }
  MOTIONS.pincer = {
    remote: true,
    // backShot 이 스스로 pad 를 빼고 재는 것과 같은 기준으로 미리 걸러야 한다 — 안 그러면
    // room 이 [PINCER_MIN_ROOM, +PAD) 사이일 때 canBegin 은 통과해 놓고 backShot 만 조용히
    // 취소해 앞탄만 나가는 "반쪽 협공"이 된다(최종 리뷰 C).
    canBegin: function (boss, def, g) {
      return roomBehind(boss, g.player) - C.MOTION.PINCER_SPAWN_PAD >= C.MOTION.PINCER_MIN_ROOM;
    },
    active: function (boss, a, g) {
      var def = a.def, pc = def.pincer, p = g.player, dir = boss.dirToPlayer();
      boss.fire(def, function () { return boss.newShot(def, dir); });
      var catchD = C.PARRY.PROJECTILE_CATCH;
      var lastFront = def.volley ? boss.volleyInterval(def) * (def.volley.count - 1) : 0;
      var spawnX = boss.x + dir * (B.HALF_W + 10);
      var eta = Math.max(0, Math.abs(p.x - spawnX) - catchD) / def.proj.speed + lastFront;
      var backTravel = Math.max(0, pc.backDist - catchD) / pc.backSpeed;
      g.scheduleProjectile(Math.max(0, eta + pc.gap - backTravel), function () { return backShot(boss, def, g); }, false, a);
    }
  };

  /* ---- 쓸기 빔 (§3.4 SENTINEL) -------------------------------------------
   * 플레이어 등 뒤 벽에 빔이 예고(pending)로 서고 windup 끝에 보스 쪽으로 움직인다.
   * 도망치면 따라잡힌다(빔 320 > 걷기 265) — 빔 쪽으로 대시해야 넘는다. */
  MOTIONS.sweep = {
    remote: true,
    canBegin: function (boss, def, g) { return roomBehind(boss, g.player) >= C.MOTION.BEAM_MIN_ROOM; },
    begin: function (boss, a, g) {
      var bm = a.def.beam, side = behindDir(boss, g.player);
      var x = side < 0 ? V.MIN_X : V.MAX_X;
      var beam = new Beam({ x: x, w: bm.w, dir: -side, speed: bm.speed, delay: a.windupTotal,
                            damage: bm.damage, label: a.def.label || a.def.id });
      a.spawns.push(beam);
      g.spawnBeam(beam);
      FX.tellBurst(x - side * bm.w * 0.5, V.FLOOR_Y - C.MOTION.BEAM_H * 0.5, C.COLORS.RED, 'red');   // 빔 자리 예고
    }
  };

  /* ---- 기둥 (§3.6 BASTION) -----------------------------------------------
   * 등 뒤(과 count 2 면 플레이어·보스 사이)에 선다. 플레이어 칸이 SAFE_MIN_W 미만이 되거나
   * 아레나 밖이면 스텝을 건너뛴다 — 갇히는 일은 없어야 한다. */
  function pillarSpots(boss, def, g) {
    var pl = def.pillar, p = g.player, half = pl.w / 2, i;
    var xs = [p.x + behindDir(boss, p) * pl.dist];
    if (pl.count >= 2) xs.push((p.x + boss.x) / 2);
    var extra = [];
    for (i = 0; i < xs.length; i++) {
      if (xs[i] - half < V.MIN_X || xs[i] + half > V.MAX_X) return null;
      extra.push({ x: xs[i], w: pl.w });
    }
    return g.cellWidth(p.x, extra) >= C.ARENA.SAFE_MIN_W ? xs : null;
  }
  MOTIONS.pillar = {
    remote: true,
    canBegin: function (boss, def, g) { return pillarSpots(boss, def, g) !== null; },
    begin: function (boss, a, g) {
      var pl = a.def.pillar, xs = pillarSpots(boss, a.def, g);
      if (!xs) return;
      for (var i = 0; i < xs.length; i++) {
        var pil = new Pillar({ x: xs[i], w: pl.w, delay: a.windupTotal, up: pl.up,
                               damage: pl.damage, label: a.def.label || a.def.id });
        a.spawns.push(pil);
        g.spawnPillar(pil);
      }
    }
  };

  /* ---- 표식 (§3.7 HOLLOW) ------------------------------------------------
   * active 에 플레이어에게 붙는다 — 그 순간 두 번째 텔 버스트. 붙은 뒤 delay 에 터진다(일정). */
  MOTIONS.mark = {
    remote: true,
    active: function (boss, a, g) {
      var mk = a.def.mark, p = g.player, red = a.def.tell === 'red';
      g.spawnMark(new Mark({ x: p.x, delay: mk.delay, tell: a.def.tell, damage: mk.damage,
                             def: a.def, label: a.def.label || a.def.id }));
      FX.tellBurst(p.x, V.FLOOR_Y - C.MOTION.MARK_Y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
      if (red) RAudio.tellRed(); else RAudio.tellGold();
    }
  };

  /* ---- 메아리 (§3.10 CHORUS) ---------------------------------------------
   * kind 가 아니라 근접 정의의 표지 def.echo — boss.js onActiveStart 근접 분기가 부른다.
   * 타격이 실제로 일어난 공격만 메아리친다(windup 중 끊기면 active 에 오지 않는다). */
  MOTIONS.echo = {
    spawn: function (boss, a, g) {
      var def = a.def;
      g.spawnEcho(new Echo({
        x: boss.x, facing: boss.facing, def: def, delay: def.echo.delay,
        windup: Math.max(B.MIN_WINDUP, def.windup * boss.windupMult()),
        damage: a.damage, color: boss.color, build: boss.silhouette, label: def.label || def.id
      }));
    }
  };

  /* ---- 동작 항목은 이 줄 위에 추가한다 ---- */

  global.MOTIONS = MOTIONS;
})(window);
