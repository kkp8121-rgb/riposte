/* =============================================================================
 * RIPOSTE — js/audio.js  →  window.RAudio
 * WebAudio 합성 전용. 외부 오디오 파일 0 (스펙 §5).
 * AudioContext 가 없거나 mute 면 모든 API 가 no-op.
 * ========================================================================== */
(function (global) {
  'use strict';

  var A = CONFIG.AUDIO;

  var RAudio = {
    ctx: null,
    master: null,
    muted: false,
    ready: false,
    supported: false,
    _drone: null,
    _kick: null,
    _kickTimer: null
  };

  function Ctor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }
  RAudio.supported = !!Ctor();

  /** 첫 사용자 입력에서 호출 — AudioContext 생성/resume */
  RAudio.init = function () {
    if (RAudio.ready || RAudio.muted) return;
    var C = Ctor();
    if (!C) return;
    try {
      RAudio.ctx = new C();
      RAudio.master = RAudio.ctx.createGain();
      RAudio.master.gain.value = A.MASTER;
      RAudio.master.connect(RAudio.ctx.destination);
      RAudio.ready = true;
    } catch (e) {
      RAudio.ctx = null;
      RAudio.ready = false;
      return;
    }
    if (RAudio.ctx.state === 'suspended') {
      try { RAudio.ctx.resume(); } catch (e) { /* noop */ }
    }
  };

  RAudio.setMuted = function (m) {
    RAudio.muted = !!m;
    if (RAudio.muted) {
      RAudio.stopDrone();
      if (RAudio.master) RAudio.master.gain.value = 0;
    } else {
      if (!RAudio.ready) RAudio.init();
      if (RAudio.master) RAudio.master.gain.value = A.MASTER;
    }
    return RAudio.muted;
  };

  RAudio.toggleMute = function () { return RAudio.setMuted(!RAudio.muted); };

  function ok() { return RAudio.ready && !RAudio.muted && RAudio.ctx; }
  function now() { return RAudio.ctx.currentTime; }

  /* ---- 원시 빌딩 블록 ---------------------------------------------------- */

  function env(node, t0, peak, attack, decay) {
    var g = RAudio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    node.connect(g);
    g.connect(RAudio.master);
    return g;
  }

  function tone(type, freq, t0, dur, peak, detune) {
    var o = RAudio.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    env(o, t0, peak, 0.005, dur);
    o.start(t0);
    o.stop(t0 + dur + 0.06);
    return o;
  }

  function sweep(type, f0, f1, t0, dur, peak) {
    var o = RAudio.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    env(o, t0, peak, 0.006, dur);
    o.start(t0);
    o.stop(t0 + dur + 0.06);
    return o;
  }

  var _noiseBuf = null;
  function noiseBuffer() {
    if (_noiseBuf) return _noiseBuf;
    var len = Math.floor(RAudio.ctx.sampleRate * 1.0);
    var b = RAudio.ctx.createBuffer(1, len, RAudio.ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    _noiseBuf = b;
    return b;
  }

  function noise(t0, dur, peak, filterType, cutoff, q) {
    var s = RAudio.ctx.createBufferSource();
    s.buffer = noiseBuffer();
    var f = RAudio.ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.setValueAtTime(cutoff || 1200, t0);
    if (q) f.Q.setValueAtTime(q, t0);
    s.connect(f);
    env(f, t0, peak, 0.004, dur);
    s.start(t0);
    s.stop(t0 + dur + 0.06);
    return s;
  }

  /* ---- 이벤트 사운드 (스펙 §5 표) ---------------------------------------- */

  /** 금 텔: 2.2kHz 사인 tick 40ms */
  RAudio.tellGold = function () {
    if (!ok()) return;
    var t = now();
    tone('sine', A.TELL_GOLD_HZ, t, A.TELL_GOLD_MS / 1000, 0.22);
    tone('sine', A.TELL_GOLD_HZ * 1.5, t, (A.TELL_GOLD_MS / 1000) * 0.6, 0.09);
  };

  /** 적 텔: 90Hz 사인 + 노이즈 thud 120ms */
  RAudio.tellRed = function () {
    if (!ok()) return;
    var t = now(), d = A.TELL_RED_MS / 1000;
    tone('sine', A.TELL_RED_HZ, t, d, 0.42);
    noise(t, d * 0.8, 0.16, 'lowpass', 320, 1);
  };

  /** 퍼펙트 패리: 노이즈 버스트 + 금속 배음 감쇠 0.5s */
  RAudio.parryPerfect = function () {
    if (!ok()) return;
    var t = now();
    noise(t, 0.09, 0.30, 'highpass', 3200, 0.8);
    for (var i = 0; i < A.PARRY_PARTIALS.length; i++) {
      tone('sine', A.PARRY_PARTIALS[i], t, A.PARRY_DECAY * (1 - i * 0.18), 0.17 - i * 0.045);
    }
  };

  /** 블록: 저역 노이즈 thud */
  RAudio.parryBlock = function () {
    if (!ok()) return;
    var t = now();
    noise(t, 0.13, 0.26, 'lowpass', 480, 1);
    tone('sine', 140, t, 0.10, 0.18);
  };

  /** 리포스트 명중: 120Hz 스퀘어 펀치 + 노이즈 */
  RAudio.riposteHit = function (empowered) {
    if (!ok()) return;
    var t = now();
    tone('square', A.RIPOSTE_HZ * (empowered ? 1.25 : 1), t, 0.13, empowered ? 0.30 : 0.24);
    noise(t, 0.07, 0.20, 'bandpass', 1500, 1.2);
    if (empowered) tone('sine', 880, t + 0.02, 0.18, 0.10);
  };

  /** 카운터 히트 */
  RAudio.counter = function () {
    if (!ok()) return;
    var t = now();
    sweep('square', 300, 900, t, 0.16, 0.20);
    noise(t, 0.10, 0.18, 'bandpass', 2400, 1.5);
  };

  /** 훔치기: 3음 아르페지오 C5-E5-G5, 60ms 간격 */
  RAudio.steal = function () {
    if (!ok()) return;
    var t = now(), g = A.STEAL_GAP_MS / 1000;
    for (var i = 0; i < A.STEAL_ARPEGGIO.length; i++) {
      tone('triangle', A.STEAL_ARPEGGIO[i], t + i * g, 0.20, 0.16);
    }
  };

  /** 피격: 저역 붐 + 왜곡 */
  RAudio.playerHit = function () {
    if (!ok()) return;
    var t = now();
    sweep('sawtooth', 180, 45, t, 0.34, 0.34);
    noise(t, 0.20, 0.24, 'lowpass', 900, 0.7);
  };

  /** 대시 */
  RAudio.dash = function () {
    if (!ok()) return;
    var t = now();
    noise(t, 0.16, 0.14, 'bandpass', 900, 0.6);
    sweep('sine', 620, 240, t, 0.14, 0.08);
  };

  /** 리포스트 발동(휘두름) */
  RAudio.swing = function () {
    if (!ok()) return;
    var t = now();
    noise(t, 0.11, 0.10, 'bandpass', 2000, 0.8);
  };

  /** Phase 2 포효 */
  RAudio.roar = function () {
    if (!ok()) return;
    var t = now();
    sweep('sawtooth', 70, 150, t, 0.9, 0.30);
    noise(t, 0.8, 0.16, 'lowpass', 600, 0.6);
    tone('sine', 55, t, 1.1, 0.24);
  };

  /** 보스 격파: 긴 저역 붐 + 상승 셰퍼드풍 샤인 */
  RAudio.bossDown = function () {
    if (!ok()) return;
    var t = now();
    sweep('sine', 120, 32, t, 1.6, 0.40);
    noise(t, 0.9, 0.22, 'lowpass', 700, 0.5);
    for (var i = 0; i < 4; i++) {
      sweep('triangle', 300 * Math.pow(2, i * 0.5), 1400 * Math.pow(2, i * 0.5),
            t + i * 0.08, 1.1, 0.07);
    }
  };

  /** 패배 */
  RAudio.defeat = function () {
    if (!ok()) return;
    var t = now();
    sweep('sawtooth', 200, 40, t, 1.4, 0.28);
    tone('sine', 62, t + 0.1, 1.2, 0.18);
  };

  /** UI 확인음 */
  RAudio.ui = function (up) {
    if (!ok()) return;
    var t = now();
    tone('triangle', up ? 660 : 420, t, 0.10, 0.12);
  };

  /* ---- 드론 BGM ---------------------------------------------------------- */

  /** 디튠 saw 2개 + lowpass + LFO. Phase 2 에서 cutoff 상승 + 심박 킥. */
  RAudio.startDrone = function (rootHz, bpm) {
    if (!ok()) return;
    RAudio.stopDrone();
    var t = now();
    var g = RAudio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(A.DRONE_GAIN, t + 1.2);

    var lp = RAudio.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(A.DRONE_CUTOFF_P1, t);
    lp.Q.setValueAtTime(4, t);

    var o1 = RAudio.ctx.createOscillator();
    var o2 = RAudio.ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(rootHz, t);
    o2.frequency.setValueAtTime(rootHz, t);
    o1.detune.setValueAtTime(-A.DRONE_DETUNE, t);
    o2.detune.setValueAtTime(A.DRONE_DETUNE, t);

    var lfo = RAudio.ctx.createOscillator();
    var lfoGain = RAudio.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(A.DRONE_LFO_HZ, t);
    lfoGain.gain.setValueAtTime(90, t);
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    o1.connect(lp); o2.connect(lp);
    lp.connect(g); g.connect(RAudio.master);
    o1.start(t); o2.start(t); lfo.start(t);

    RAudio._drone = { o1: o1, o2: o2, lfo: lfo, lp: lp, g: g, bpm: bpm || 100 };
  };

  RAudio.dronePhase2 = function () {
    if (!ok() || !RAudio._drone) return;
    var t = now();
    RAudio._drone.lp.frequency.cancelScheduledValues(t);
    RAudio._drone.lp.frequency.setValueAtTime(A.DRONE_CUTOFF_P1, t);
    RAudio._drone.lp.frequency.linearRampToValueAtTime(A.DRONE_CUTOFF_P2, t + 1.0);
    RAudio.startHeartbeat(RAudio._drone.bpm);
  };

  RAudio.startHeartbeat = function (bpm) {
    if (!ok()) return;
    RAudio.stopHeartbeat();
    var period = 60000 / (bpm || 100);
    RAudio._kickTimer = global.setInterval(function () {
      if (!ok()) return;
      var t = now();
      sweep('sine', 150, 44, t, 0.18, 0.26);
      sweep('sine', 130, 40, t + period / 3000, 0.14, 0.15);
    }, period);
  };

  RAudio.stopHeartbeat = function () {
    if (RAudio._kickTimer) { global.clearInterval(RAudio._kickTimer); RAudio._kickTimer = null; }
  };

  RAudio.stopDrone = function () {
    RAudio.stopHeartbeat();
    var d = RAudio._drone;
    RAudio._drone = null;
    if (!d || !RAudio.ctx) return;
    try {
      var t = now();
      d.g.gain.cancelScheduledValues(t);
      d.g.gain.setValueAtTime(Math.max(0.0002, d.g.gain.value), t);
      d.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      d.o1.stop(t + 0.4); d.o2.stop(t + 0.4); d.lfo.stop(t + 0.4);
    } catch (e) { /* noop */ }
  };

  global.RAudio = RAudio;
})(window);
