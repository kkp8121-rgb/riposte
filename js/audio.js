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
    _kickTimer: null,
    _want: null        // 재생돼야 할 BGM 상태 {root, bpm, phase2} — 준비/음소거 해제 시 복구
  };

  function Ctor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }
  RAudio.supported = !!Ctor();

  /** AudioContext 의 현재 상태 ('none'|'suspended'|'running'|'closed') */
  RAudio.state = function () { return RAudio.ctx ? RAudio.ctx.state : 'none'; };

  /** ctx 가 실제로 running 이 된 뒤에만 ready — 그 시점에 밀린 BGM 을 복구한다. */
  function markReady() {
    if (!RAudio.ctx || RAudio.ctx.state !== 'running') return;
    RAudio.ready = true;
    resumeWanted();
  }

  /**
   * 첫 사용자 입력에서 호출 — AudioContext 생성/resume.
   * 멱등(idempotent): 매 keydown 마다 불러도 안전하고, running 이 될 때까지 resume 을 재시도한다.
   * (Shift·Tab 처럼 브라우저가 user activation 을 주지 않는 키로 첫 입력이 들어와도
   *  다음 키에서 다시 시도하므로 영구 무음에 빠지지 않는다.)
   */
  RAudio.init = function () {
    if (RAudio.muted) return;
    if (RAudio.ready && RAudio.ctx && RAudio.ctx.state === 'running') return;
    var C = Ctor();
    if (!C) return;
    if (!RAudio.ctx) {
      try {
        RAudio.ctx = new C();
        RAudio.master = RAudio.ctx.createGain();
        RAudio.master.gain.value = A.MASTER;
        RAudio.master.connect(RAudio.ctx.destination);
      } catch (e) {
        RAudio.ctx = null;
        RAudio.master = null;
        RAudio.ready = false;
        return;
      }
    }
    if (RAudio.ctx.state === 'running') { markReady(); return; }
    try {
      var pr = RAudio.ctx.resume();
      if (pr && pr.then) pr.then(markReady, function () { /* 다음 입력에서 재시도 */ });
    } catch (e) { /* 다음 입력에서 재시도 */ }
    markReady();
  };

  RAudio.setMuted = function (m) {
    RAudio.muted = !!m;
    if (RAudio.muted) {
      stopDroneNodes();                    // _want 는 유지 — 음소거 해제 시 되살린다
      if (RAudio.master) RAudio.master.gain.value = 0;
    } else {
      RAudio.init();
      if (RAudio.master) RAudio.master.gain.value = A.MASTER;
      resumeWanted();
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

  /** 스태미너 부족 — 짧고 둔탁한 헛손질 */
  RAudio.staminaEmpty = function () {
    if (!ok()) return;
    var t = now();
    noise(t, 0.09, 0.07, 'lowpass', 300, 0.7);
    tone('sine', 110, t, 0.10, 0.07);
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

  /**
   * 디튠 saw 2개 + lowpass + LFO. Phase 2 에서 cutoff 상승 + 심박 킥.
   * 아직 오디오가 준비되지 않았어도 "무엇이 울려야 하는지"(_want)는 기억한다.
   * => ?boss=N 부팅처럼 전투가 이미 시작된 뒤 오디오가 열려도 드론이 살아난다.
   */
  RAudio.startDrone = function (rootHz, bpm) {
    RAudio._want = { root: rootHz, bpm: bpm, phase2: false };
    if (!ok()) return;
    stopDroneNodes();
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
    if (RAudio._want) RAudio._want.phase2 = true;
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

  /** 노드만 정리한다 (_want 는 남긴다 — 음소거 토글용) */
  function stopDroneNodes() {
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
  }

  /** 기억해 둔 BGM 상태를 실제로 재생한다 (오디오 준비 완료 / 음소거 해제 시) */
  function resumeWanted() {
    var w = RAudio._want;
    if (!w || !ok()) return;
    RAudio.startDrone(w.root, w.bpm);      // _want 를 다시 기록한다 (phase2=false)
    if (w.phase2) RAudio.dronePhase2();    // phase2 였다면 즉시 되살린다
  }

  /** 전투 종료 — BGM 을 완전히 끈다 (기억도 지운다) */
  RAudio.stopDrone = function () {
    RAudio._want = null;
    stopDroneNodes();
  };

  global.RAudio = RAudio;
})(window);
