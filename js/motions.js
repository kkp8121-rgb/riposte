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

  /* ---- 동작 항목은 이 줄 위에 추가한다 ---- */

  global.MOTIONS = MOTIONS;
})(window);
