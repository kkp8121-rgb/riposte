/* =============================================================================
 * RIPOSTE — js/touch.js
 * 모바일 터치 조작 — 화면 위 가상 버튼 (docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md)
 *
 * 버튼은 기존 액션 이름만 누른다(Input.touchAction) — 동사를 늘리지 않는다.
 * 터치 모드는 부팅 때 한 번 정한다: ?touch=1/0 이 우선, 없으면 주 입력이 손가락인가(pointer: coarse).
 * 터치 모드가 아니면 리스너를 붙이지 않고 main.js 도 update/draw 를 부르지 않는다 — PC 프레임 비용 0.
 * 버튼 좌표는 화면 CSS px(캔버스 = 창 전체)다 — 게임 좌표(960×540)가 아니다(좌우 레터박스 여백까지 쓴다).
 * 브라우저 내장 window.Touch(터치 이벤트의 Touch 생성자)를 덮어쓰지 않으려고 이름이 TouchUI 다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = global.CONFIG;
  var T = C.TOUCH;

  var TouchUI = {
    on: false,        // 터치 모드 (부팅 때 한 번 판별)
    visible: false,   // 버튼을 그리는가
    blocked: false,   // 세로 — 게임을 멈추고 회전 안내만 그린다
    set: [],          // 지금 화면의 버튼 id 목록 (C.TOUCH.SETS[scene])
    _ptr: {},         // pointerId -> 버튼 id (버튼 밖이면 null)
    _count: {},       // 액션 -> 그 액션을 쥔 손가락 수
    _hold: {},        // 꾹 누르기 버튼 id -> 누르기 시작한 시각(초)
    _fired: {},       // 꾹 누르기 버튼 id -> 이번 누름에서 이미 발동했나
    _safe: { t: 0, r: 0, b: 0, l: 0 },   // 안전 영역(노치) px
    _probe: null      // 안전 영역 측정용 div
  };

  function nowSec() { return (global.performance ? global.performance.now() : Date.now()) / 1000; }

  /** 터치 모드 판별 — ?touch=1/0 이 우선, 없으면 주 입력이 손가락인가(pointer: coarse).
      터치스크린 노트북은 주 입력이 마우스라 false — PC 로 분류돼 버튼이 안 나온다 (스펙 §2). */
  TouchUI.detect = function (param, coarse) {
    if (param === '1') return true;
    if (param === '0') return false;
    return !!coarse;
  };

  /** 안전 영역(노치) — 보이지 않는 div 의 padding: env(safe-area-inset-*) 를 읽는다.
      env() 를 모르는 브라우저는 선언이 버려져 0 이 된다. */
  function readSafe() {
    var d = global.document;
    if (!TouchUI._probe) {
      var p = d.createElement('div');
      p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      d.body.appendChild(p);
      TouchUI._probe = p;
    }
    var cs = global.getComputedStyle(TouchUI._probe);
    TouchUI._safe = {
      t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0
    };
  }

  /** 버튼 중심(화면 CSS px). anchor 모서리의 여백선(EDGE + 안전 영역)에서 dx·dy 만큼 안쪽. */
  TouchUI.center = function (id) {
    var b = T.BUTTONS[id], s = TouchUI._safe, e = T.EDGE;
    var W = global.innerWidth, H = global.innerHeight;
    var left = e + s.l, right = W - e - s.r, top = e + s.t, bottom = H - e - s.b;
    if (b.anchor === 'bl') return { x: left + b.dx, y: bottom - b.dy };
    if (b.anchor === 'br') return { x: right - b.dx, y: bottom - b.dy };
    return { x: right - b.dx, y: top + b.dy };   // 'tr'
  };

  function pickSet(scene) {
    return (T.SETS[scene] || []).slice();
  }

  /** 화면 좌표 → 버튼 id (판정 원 = 반지름 + HIT_PAD, 겹치면 중심이 가까운 쪽). 없으면 null */
  function hitTest(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < TouchUI.set.length; i++) {
      var id = TouchUI.set[i], c = TouchUI.center(id), b = T.BUTTONS[id];
      var dx = x - c.x, dy = y - c.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= b.r + T.HIT_PAD && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  function press(id) {
    var b = T.BUTTONS[id];
    if (b.hold) { TouchUI._hold[id] = nowSec(); TouchUI._fired[id] = false; return; }
    var n = TouchUI._count[b.action] || 0;
    TouchUI._count[b.action] = n + 1;
    if (n === 0) Input.touchAction(b.action, true);
  }

  function release(id) {
    var b = T.BUTTONS[id];
    if (b.hold) { delete TouchUI._hold[id]; delete TouchUI._fired[id]; return; }
    var n = (TouchUI._count[b.action] || 0) - 1;
    if (n > 0) { TouchUI._count[b.action] = n; return; }
    delete TouchUI._count[b.action];
    Input.touchAction(b.action, false);
  }

  /** 쥔 버튼을 전부 놓는다 — 손가락 추적은 남기되(버튼 없음) 액션은 모두 뗀다.
      화면(세트)이 바뀌거나 세로로 돌면 부른다 — 눌린 채 다음 화면으로 넘어가 멈추지 않는 키가 생기지 않게. */
  function releaseAll() {
    for (var pid in TouchUI._ptr) {
      if (TouchUI._ptr.hasOwnProperty(pid)) TouchUI._ptr[pid] = null;
    }
    for (var a in TouchUI._count) {
      if (TouchUI._count.hasOwnProperty(a)) Input.touchAction(a, false);
    }
    TouchUI._count = {};
    TouchUI._hold = {};
    TouchUI._fired = {};
  }

  /** 포커스를 잃거나 탭이 숨으면 — 손가락 추적까지 비운다(그 뒤 오는 pointerup 은 무시된다) */
  function reset() {
    releaseAll();
    TouchUI._ptr = {};
  }

  function onDown(e) {
    e.preventDefault();
    TouchUI.visible = true;
    var id = hitTest(e.clientX, e.clientY);
    TouchUI._ptr[e.pointerId] = id;
    if (id) press(id);
  }

  function onMove(e) {
    if (!TouchUI._ptr.hasOwnProperty(e.pointerId)) return;   // 누르지 않은 포인터(마우스 hover 등)
    e.preventDefault();
    var old = TouchUI._ptr[e.pointerId];
    var id = hitTest(e.clientX, e.clientY);
    if (id === old) return;
    TouchUI._ptr[e.pointerId] = id;
    if (old) release(old);   // 버튼 밖으로 미끄러지면 놓고
    if (id) press(id);       // 다른 버튼으로 들어가면 그 버튼을 누른다 (◀ → ▶ 미끄러뜨리기)
  }

  function onUp(e) {
    if (!TouchUI._ptr.hasOwnProperty(e.pointerId)) return;
    e.preventDefault();
    var id = TouchUI._ptr[e.pointerId];
    delete TouchUI._ptr[e.pointerId];
    if (id) release(id);
  }

  /** 프레임마다 (main.js frame — 터치 모드일 때만). scene 으로 버튼 세트를 고르고 꾹 누르기를 센다. */
  TouchUI.update = function (scene) {
    var set = pickSet(scene);
    if (set.join(',') !== TouchUI.set.join(',')) { TouchUI.set = set; releaseAll(); }
    var t = nowSec();
    for (var id in TouchUI._hold) {
      if (!TouchUI._hold.hasOwnProperty(id) || TouchUI._fired[id]) continue;
      if (t - TouchUI._hold[id] < T.HOLD_TIME) continue;
      TouchUI._fired[id] = true;
      var a = T.BUTTONS[id].action;
      Input.touchAction(a, true);    // 탭 한 번 — 눌렀다 바로 뗀 것과 같다(다음 고정 스텝에 justPressed 한 번)
      Input.touchAction(a, false);
    }
  };

  /** 디버그 훅 getState().touch — JSON 직렬화 가능 */
  TouchUI.state = function () {
    if (!TouchUI.on) return { on: false };
    var held = [];
    for (var a in TouchUI._count) {
      if (TouchUI._count.hasOwnProperty(a)) held.push(a);
    }
    return { on: true, visible: TouchUI.visible, set: TouchUI.set.slice(), held: held, blocked: TouchUI.blocked };
  };

  /** 부팅 (main.js boot). param = URL 의 ?touch 값(없으면 undefined) */
  TouchUI.init = function (canvas, param) {
    var mq = global.matchMedia ? global.matchMedia('(pointer: coarse)') : null;
    TouchUI.on = TouchUI.detect(param, !!(mq && mq.matches));
    if (!TouchUI.on) return;              // PC — 리스너도 붙이지 않는다 (프레임 비용 0)
    TouchUI.visible = true;
    readSafe();
    global.addEventListener('resize', readSafe);
    canvas.addEventListener('pointerdown', onDown, { passive: false });
    canvas.addEventListener('pointermove', onMove, { passive: false });
    canvas.addEventListener('pointerup', onUp, { passive: false });
    canvas.addEventListener('pointercancel', onUp, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // 길게 누르기 메뉴
    global.addEventListener('blur', reset);
    if (global.document) {
      global.document.addEventListener('visibilitychange', function () {
        if (global.document.hidden) reset();
      });
    }
  };

  global.TouchUI = TouchUI;
})(window);
