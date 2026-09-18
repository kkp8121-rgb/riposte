/* =============================================================================
 * RIPOSTE — js/input.js
 * 키 상태 / justPressed / 리매핑 테이블. 키보드 전용 (스펙 §2.1)
 *
 * justPressed 의미: keydown 은 버퍼에 쌓이고, 고정 스텝 update 한 번에서만
 * true 가 된다 (Input.beginStep() 이 버퍼를 스텝 큐로 옮긴다).
 * ========================================================================== */
(function (global) {
  'use strict';

  /* 액션 -> KeyboardEvent.code 목록 (스펙 §2.1) */
  var KEYMAP = {
    left:    ['ArrowLeft', 'KeyA'],
    right:   ['ArrowRight', 'KeyD'],
    parry:   ['KeyK', 'KeyZ'],
    riposte: ['KeyJ', 'KeyX'],
    dash:    ['Space', 'KeyL', 'KeyC', 'ShiftLeft', 'ShiftRight'],
    confirm: ['Enter', 'NumpadEnter'],
    restart: ['KeyR'],
    mute:    ['KeyM'],
    back:    ['Escape'],
    newgame: ['KeyN']
  };

  /* 스크롤/기본동작을 막아야 하는 코드.
     Tab 은 매핑이 없으므로 넣지 않는다 — 막으면 키보드 포커스가 페이지에 갇힌다(a11y). */
  var PREVENT = {
    Space: 1, ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1,
    Enter: 1
  };

  var codeToActions = {};
  (function build() {
    for (var action in KEYMAP) {
      if (!KEYMAP.hasOwnProperty(action)) continue;
      var codes = KEYMAP[action];
      for (var i = 0; i < codes.length; i++) {
        var c = codes[i];
        if (!codeToActions[c]) codeToActions[c] = [];
        codeToActions[c].push(action);
      }
    }
  })();

  var Input = {
    KEYMAP: KEYMAP,
    down: {},      // action -> bool (현재 눌림)
    _buffer: {},   // keydown 누적 (다음 beginStep 에서 소비)
    _just: {},     // 현재 고정 스텝에서 true
    _padHeld: {},  // 패드가 "스스로" 쥐고 있는 액션 — 놓을 때만 false 를 내보내 키보드 동시입력을 보호
    _padCount: 0,  // 연결된 패드 수 — 0이면 pollGamepad 가 navigator 를 아예 건드리지 않는다 (매 프레임 비용 방지)
    _anyKey: false,
    enabled: true,
    /* 모든 keydown 에서 호출된다 (첫 입력 한 번이 아니다).
       AudioContext 는 user activation 을 주지 않는 키(Shift/Tab 등)로는 열리지 않으므로
       running 이 될 때까지 매 입력마다 재시도해야 영구 무음에 빠지지 않는다. */
    onGesture: null
  };

  function setAction(action, isDown) {
    if (isDown) {
      if (!Input.down[action]) Input._buffer[action] = true;
      Input.down[action] = true;
    } else {
      Input.down[action] = false;
    }
  }

  function handleDown(e) {
    if (!Input.enabled) return;
    if (PREVENT[e.code]) e.preventDefault();
    if (e.repeat) return;
    // 매핑 여부와 무관하게 제스처 훅을 먼저 친다 (오디오 resume 재시도)
    Input._anyKey = true;
    if (typeof Input.onGesture === 'function') {
      try { Input.onGesture(); } catch (err) { /* 오디오 없음 — 무시 */ }
    }
    var actions = codeToActions[e.code];
    if (!actions) return;
    for (var i = 0; i < actions.length; i++) setAction(actions[i], true);
  }

  function handleUp(e) {
    if (PREVENT[e.code]) e.preventDefault();
    var actions = codeToActions[e.code];
    if (!actions) return;
    for (var i = 0; i < actions.length; i++) setAction(actions[i], false);
  }

  function handleBlur() {
    Input.down = {};
    Input._buffer = {};
    Input._just = {};
  }

  Input.attach = function (target) {
    var t = target || global;
    t.addEventListener('keydown', handleDown, { passive: false });
    t.addEventListener('keyup', handleUp, { passive: false });
    global.addEventListener('blur', handleBlur);
    // 탭이 숨겨지면 keyup 이 오지 않는다 — 눌린 키가 그대로 붙어 있지 않도록 비운다
    if (global.document) {
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.hidden) handleBlur();
      });
    }
    // 패드 연결/해제 — 연결 수를 세어 pollGamepad 가 패드 없을 때 navigator 를 건드리지 않게 게이팅한다.
    // 해제 시엔 패드가 쥐고 있던 액션도 정리한다(눌린 채로 남지 않게).
    global.addEventListener('gamepadconnected', handleGamepadConnected);
    global.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    // Chrome 은 버튼을 눌러야 패드를 노출하므로 위 이벤트가 표준 경로다.
    // 페이지 로드 전에 이미 연결된 패드가 있는 경우를 위해 부팅 시 1회만 훑는다 (매 프레임이 아니라 1회뿐).
    if (global.navigator && typeof global.navigator.getGamepads === 'function') {
      var initialPads = global.navigator.getGamepads();
      if (initialPads) {
        for (var gi = 0; gi < initialPads.length; gi++) {
          if (initialPads[gi] && initialPads[gi].connected) Input._padCount++;
        }
      }
    }
  };

  /** 고정 스텝 시작 — 버퍼된 keydown 을 이번 스텝의 justPressed 로 옮긴다. */
  Input.beginStep = function () {
    Input._just = Input._buffer;
    Input._buffer = {};
  };

  Input.pressed = function (action) { return !!Input.down[action]; };
  Input.justPressed = function (action) { return !!Input._just[action]; };

  /** 이번 스텝의 justPressed 를 소비(1회성)한다. */
  Input.consume = function (action) {
    if (Input._just[action]) { Input._just[action] = false; return true; }
    return false;
  };

  /** 이동 축 (-1 / 0 / +1) */
  Input.axis = function () {
    var a = 0;
    if (Input.down.left) a -= 1;
    if (Input.down.right) a += 1;
    return a;
  };

  /** 패드 연결/해제 카운터 — pollGamepad 의 navigator 접근을 게이팅한다. */
  function handleGamepadConnected() {
    Input._padCount++;
  }
  function handleGamepadDisconnected() {
    Input._padCount = Math.max(0, Input._padCount - 1);
    clearPadHeld();
  }

  /** 패드가 쥐고 있던 액션을 전부 놓는다 (연결 해제 시 눌린 채로 남는 키 방지). */
  function clearPadHeld() {
    for (var action in Input._padHeld) {
      if (Input._padHeld.hasOwnProperty(action) && Input._padHeld[action]) setAction(action, false);
    }
    Input._padHeld = {};
  }

  /** 패드 액션 하나의 전이를 처리한다.
      누를 때만 setAction(true) — 뗄 때는 "패드 스스로 쥐고 있던" 액션만 false 로 내린다.
      매 프레임 무조건 false 를 내보내면 패드가 연결만 돼 있고 안 쓰일 때도
      키보드가 쥐고 있는 같은 액션을 매 프레임 끊어버리게 된다. */
  function applyPadAction(action, isDown) {
    var wasHeld = !!Input._padHeld[action];
    if (isDown) {
      Input._anyKey = true;
      if (!wasHeld && typeof Input.onGesture === 'function') {
        try { Input.onGesture(); } catch (err) { /* 오디오 없음 — 무시 */ }
      }
      setAction(action, true);
    } else if (wasHeld) {
      setAction(action, false);
    }
    Input._padHeld[action] = isDown;
  }

  /** 게임패드 폴링 — js/main.js 프레임 루프 시작에서 rAF 마다 1회 호출.
      버튼 전이를 키보드와 같은 setAction() 경로로 합류시켜 justPressed 가
      "고정 스텝 1회에서만 true" 인 의미를 그대로 유지한다.
      navigator.getGamepads 가 없거나 연결된 패드가 없으면 아무 일도 하지 않는다. */
  Input.pollGamepad = function () {
    if (!Input.enabled) return;
    if (!Input._padCount) return;   // 연결된 패드가 없으면 navigator 도 건드리지 않는다 — 프레임 비용 0
    var nav = global.navigator;
    if (!nav || typeof nav.getGamepads !== 'function') return;
    var pads = nav.getGamepads();
    if (!pads) return;

    var P = global.CONFIG.PAD;
    var pressedNow = {};   // 이번 폴링에서 눌린 것으로 판정된 액션 (여러 패드 OR)
    var padConnected = false;

    for (var i = 0; i < pads.length; i++) {
      var pad = pads[i];
      if (!pad || !pad.connected) continue;
      padConnected = true;

      var a = pad.axes ? pad.axes[P.AXIS_X] : 0;
      var left = typeof a === 'number' && a < -P.DEADZONE;
      var right = typeof a === 'number' && a > P.DEADZONE;
      var dl = pad.buttons && pad.buttons[P.DPAD_LEFT];
      var dr = pad.buttons && pad.buttons[P.DPAD_RIGHT];
      if (dl && dl.pressed) left = true;
      if (dr && dr.pressed) right = true;
      if (left) pressedNow.left = true;
      if (right) pressedNow.right = true;

      for (var action in P.BUTTONS) {
        if (!P.BUTTONS.hasOwnProperty(action) || pressedNow[action]) continue;
        var idxList = P.BUTTONS[action];
        for (var j = 0; j < idxList.length; j++) {
          var btn = pad.buttons && pad.buttons[idxList[j]];
          if (btn && btn.pressed) { pressedNow[action] = true; break; }
        }
      }
    }
    if (!padConnected) return;

    applyPadAction('left', !!pressedNow.left);
    applyPadAction('right', !!pressedNow.right);
    for (var act in P.BUTTONS) {
      if (!P.BUTTONS.hasOwnProperty(act)) continue;
      applyPadAction(act, !!pressedNow[act]);
    }
  };

  global.Input = Input;
})(window);
