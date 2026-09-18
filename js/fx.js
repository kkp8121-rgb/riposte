/* =============================================================================
 * RIPOSTE — js/fx.js
 * 파티클 · 화면 흔들림 · 히트스톱 · 플래시 · 슬로모 · 텍스트 팝 (스펙 §4)
 *
 * 히트스톱은 "월드 업데이트를 멈추는" 값이라 game.js 가 소비한다.
 * 슬로모는 timeScale 배수로 dt 에 곱해진다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;

  var FX = {
    /* ?nofx=1 이면 false — 파티클·링·잔상·텍스트 팝이 꺼진다.
       히트스톱/흔들림/슬로모는 판정 타이밍의 일부라 그대로 유지된다 (README 참조). */
    enabled: true,
    particles: [],
    pops: [],
    rings: [],
    ghosts: [],
    bursts: [],             // 텔 플래시 (원형 버스트 + 방사선)
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    hitstop: 0,
    whiteFlash: 0,
    whiteFlashMax: 0.001,
    tintFlash: 0,           // 붉은 비네트 (피격)
    tintFlashMax: 0.001,
    slowmo: 0,              // 남은 시간
    slowmoScale: 1,
    zoom: 1,
    zoomTarget: 1,
    _r: Math.random
  };

  FX.reset = function () {
    FX.particles.length = 0;
    FX.pops.length = 0;
    FX.rings.length = 0;
    FX.ghosts.length = 0;
    FX.bursts.length = 0;
    FX.shake = 0; FX.shakeX = 0; FX.shakeY = 0;
    FX.hitstop = 0;
    FX.whiteFlash = 0; FX.tintFlash = 0;
    FX.slowmo = 0; FX.slowmoScale = 1;
    FX.zoom = 1; FX.zoomTarget = 1;
  };

  /* ---- 트리거 ------------------------------------------------------------ */

  FX.addHitstop = function (s) { if (s > FX.hitstop) FX.hitstop = s; };

  FX.addShake = function (mag) { if (mag > FX.shake) FX.shake = mag; };

  FX.flashWhite = function (dur) {
    FX.whiteFlash = Math.max(FX.whiteFlash, dur);
    FX.whiteFlashMax = Math.max(0.001, dur);
  };

  FX.flashTint = function (dur) {
    FX.tintFlash = Math.max(FX.tintFlash, dur);
    FX.tintFlashMax = Math.max(0.001, dur);
  };

  FX.setSlowmo = function (scale, dur) {
    FX.slowmoScale = scale;
    FX.slowmo = Math.max(FX.slowmo, dur);
  };

  FX.setZoom = function (z) { FX.zoomTarget = z; };

  FX.timeScale = function () { return FX.slowmo > 0 ? FX.slowmoScale : 1; };

  /* ---- 파티클 ------------------------------------------------------------ */

  function push(arr, obj, cap) {
    if (arr.length >= (cap || C.FX.MAX_PARTICLES)) arr.shift();
    arr.push(obj);
  }

  /**
   * 스파크 버스트.
   * @param {number} x @param {number} y @param {number} count
   * @param {string} color @param {object} [opt] {speed, spread, dir, life, size, gravity}
   */
  FX.sparks = function (x, y, count, color, opt) {
    if (!FX.enabled) return;
    opt = opt || {};
    var speed = opt.speed || 260;
    var dir = opt.dir === undefined ? null : opt.dir;
    var spread = opt.spread === undefined ? Math.PI * 2 : opt.spread;
    for (var i = 0; i < count; i++) {
      var a = dir === null
        ? FX._r() * Math.PI * 2
        : dir + (FX._r() - 0.5) * spread;
      var sp = speed * (0.45 + FX._r() * 0.85);
      push(FX.particles, {
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (opt.life || 0.5) * (0.6 + FX._r() * 0.7),
        life0: 0,
        size: (opt.size || 2.4) * (0.6 + FX._r() * 0.9),
        color: color,
        gravity: opt.gravity === undefined ? 620 : opt.gravity,
        drag: opt.drag === undefined ? 2.2 : opt.drag
      });
      FX.particles[FX.particles.length - 1].life0 = FX.particles[FX.particles.length - 1].life;
    }
  };

  /** 확장 링 */
  FX.ring = function (x, y, r0, r1, color, life, width) {
    if (!FX.enabled) return;
    push(FX.rings, {
      x: x, y: y, r0: r0, r1: r1, color: color,
      life: life || C.FX.RING_LIFE, life0: life || C.FX.RING_LIFE,
      width: width || 3
    }, 64);
  };

  /** 텍스트 팝 ("STOLEN: THRUST", 피해 숫자, "COUNTER!") — ?nofx=1 이면 나오지 않는다 */
  FX.pop = function (text, x, y, color, opt) {
    if (!FX.enabled) return;
    opt = opt || {};
    push(FX.pops, {
      text: text, x: x, y: y, color: color,
      life: opt.life || C.FX.POP_LIFE, life0: opt.life || C.FX.POP_LIFE,
      rise: opt.rise === undefined ? C.FX.POP_RISE : opt.rise,
      size: opt.size || 18,
      weight: opt.weight || '700',
      shake: !!opt.shake
    }, 32);
  };

  /** 대시 잔상 */
  FX.ghost = function (x, y, facing, color, pose, build) {
    if (!FX.enabled) return;
    push(FX.ghosts, {
      x: x, y: y, facing: facing, color: color, pose: pose, build: build || 'player',
      life: C.DASH.GHOST_LIFE, life0: C.DASH.GHOST_LIFE
    }, 24);
  };

  /** 텔 플래시 — 무기 끝 원형 버스트 + 방사선 (스펙 §4 마지막 행) */
  FX.tellBurst = function (x, y, color) {
    push(FX.bursts, {
      x: x, y: y, color: color,
      life: C.TELL.LIFE, life0: C.TELL.LIFE,
      rays: C.TELL.RAYS, seed: FX._r() * Math.PI
    }, 16);
  };

  /* ---- 업데이트 ---------------------------------------------------------- */

  /** dt 는 "실제(스케일 안 된)" 시간 — 연출은 히트스톱 중에도 흐른다. */
  FX.update = function (dt) {
    var i, p;

    for (i = FX.particles.length - 1; i >= 0; i--) {
      p = FX.particles[i];
      p.life -= dt;
      if (p.life <= 0) { FX.particles.splice(i, 1); continue; }
      var k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > C.VIEW.FLOOR_Y) { p.y = C.VIEW.FLOOR_Y; p.vy *= -0.35; p.vx *= 0.7; }
    }

    for (i = FX.rings.length - 1; i >= 0; i--) {
      FX.rings[i].life -= dt;
      if (FX.rings[i].life <= 0) FX.rings.splice(i, 1);
    }
    for (i = FX.pops.length - 1; i >= 0; i--) {
      FX.pops[i].life -= dt;
      if (FX.pops[i].life <= 0) FX.pops.splice(i, 1);
    }
    for (i = FX.ghosts.length - 1; i >= 0; i--) {
      FX.ghosts[i].life -= dt;
      if (FX.ghosts[i].life <= 0) FX.ghosts.splice(i, 1);
    }
    for (i = FX.bursts.length - 1; i >= 0; i--) {
      FX.bursts[i].life -= dt;
      if (FX.bursts[i].life <= 0) FX.bursts.splice(i, 1);
    }

    if (FX.shake > 0) {
      FX.shake = Math.max(0, FX.shake - FX.shake * C.SHAKE.DECAY * dt - dt * 2);
      FX.shakeX = (FX._r() - 0.5) * 2 * FX.shake;
      FX.shakeY = (FX._r() - 0.5) * 2 * FX.shake;
    } else { FX.shakeX = 0; FX.shakeY = 0; }

    if (FX.whiteFlash > 0) FX.whiteFlash = Math.max(0, FX.whiteFlash - dt);
    if (FX.tintFlash > 0) FX.tintFlash = Math.max(0, FX.tintFlash - dt);
    if (FX.slowmo > 0) FX.slowmo = Math.max(0, FX.slowmo - dt);
    if (FX.hitstop > 0) FX.hitstop = Math.max(0, FX.hitstop - dt);

    FX.zoom += (FX.zoomTarget - FX.zoom) * Math.min(1, dt * 4.5);
  };

  global.FX = FX;
})(window);
