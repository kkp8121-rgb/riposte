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

  /* ---- 동작 항목은 이 줄 위에 추가한다 ---- */

  global.MOTIONS = MOTIONS;
})(window);
