/* =============================================================================
 * RIPOSTE — js/rng.js
 * 시드 RNG (mulberry32). 보스 패턴 선택에만 사용해 결정론을 유지한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    this.seed = (seed >>> 0) || 1;
    this._next = mulberry32(this.seed);
  }

  RNG.prototype.reset = function (seed) {
    if (seed !== undefined) this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  };

  /** [0,1) */
  RNG.prototype.next = function () { return this._next(); };

  /** [min,max) */
  RNG.prototype.range = function (min, max) { return min + this._next() * (max - min); };

  /** [min,max] 정수 */
  RNG.prototype.int = function (min, max) {
    return Math.floor(min + this._next() * (max - min + 1));
  };

  /** 배열에서 하나 */
  RNG.prototype.pick = function (arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(this._next() * arr.length) % arr.length];
  };

  /** 직전 선택과 다른 것을 우선 (같은 패턴 연속 방지) */
  RNG.prototype.pickAvoid = function (arr, avoid) {
    if (!arr || !arr.length) return null;
    if (arr.length === 1) return arr[0];
    for (var i = 0; i < 6; i++) {
      var v = this.pick(arr);
      if (v !== avoid) return v;
    }
    return this.pick(arr);
  };

  RNG.prototype.chance = function (p) { return this._next() < p; };

  /* 비결정 연출(파티클)용 — 게임 판정에는 쓰지 않는다. */
  global.RNG = RNG;
  global.makeRNG = function (seed) { return new RNG(seed); };
})(window);
