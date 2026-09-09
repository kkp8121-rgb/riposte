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

  Input.clear = handleBlur;

  global.Input = Input;
})(window);
