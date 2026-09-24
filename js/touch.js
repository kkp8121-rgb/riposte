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
    _ptr: {},         // pointerId -> 버튼 id (버튼 밖이면 null, 화면 전환 전부터 쥐고 있어 무시 중이면 false)
    _count: {},       // 액션 -> 그 액션을 쥔 손가락 수
    _hold: {},        // 꾹 누르기 버튼 id -> 누르기 시작한 시각(초)
    _fired: {},       // 꾹 누르기 버튼 id -> 이번 누름에서 이미 발동했나
    _safe: { t: 0, r: 0, b: 0, l: 0 },   // 안전 영역(노치) px
    _probe: null,     // 안전 영역 측정용 div
    _autoFs: false,   // 전체 화면을 이미 한 번 요청했나 (손가락을 뗄 때 한 번만)
    _scene: null,     // 지난 프레임의 scene — 버튼 세트가 바뀔 때 "어디서 왔는가" 판정용
    _graceUntil: 0    // 이 시각(초)까지는 새 터치를 무시한다 (전투 직후 유예, C.TOUCH.GRACE)
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

  function canFullscreen() {
    var d = global.document;
    return !!(d.documentElement.requestFullscreen && d.fullscreenEnabled !== false && !d.fullscreenElement);
  }

  /** scene 의 버튼 세트 — 세로면 비고, 전체 화면 버튼은 전체 화면이 아니고 API 가 있을 때만 */
  function pickSet(scene) {
    if (TouchUI.blocked) return [];
    var ids = T.SETS[scene] || [], out = [];
    for (var i = 0; i < ids.length; i++) {
      if (T.BUTTONS[ids[i]].special === 'fullscreen' && !canFullscreen()) continue;
      out.push(ids[i]);
    }
    return out;
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
    if (b.special) return;
    if (b.hold) {
      if (!TouchUI._hold.hasOwnProperty(id)) { TouchUI._hold[id] = nowSec(); TouchUI._fired[id] = false; }
      return;
    }
    var n = TouchUI._count[b.action] || 0;
    TouchUI._count[b.action] = n + 1;
    if (n === 0) Input.touchAction(b.action, true);
  }

  function release(id) {
    var b = T.BUTTONS[id];
    if (b.special) return;
    if (b.hold) {
      // 다른 손가락이 아직 이 버튼을 쥐고 있으면 놓지 않는다
      // (onUp 은 떼는 포인터를 release() 전에 지우고, onMove 는 old 를 release() 전에 새 버튼으로 옮겨 두므로
      //  이 손가락 자신이 루프에서 다시 걸리지는 않는다)
      for (var pid in TouchUI._ptr) {
        if (TouchUI._ptr.hasOwnProperty(pid) && TouchUI._ptr[pid] === id) return;
      }
      delete TouchUI._hold[id];
      delete TouchUI._fired[id];
      return;
    }
    var n = (TouchUI._count[b.action] || 0) - 1;
    if (n > 0) { TouchUI._count[b.action] = n; return; }
    delete TouchUI._count[b.action];
    Input.touchAction(b.action, false);
  }

  /** 쥔 버튼을 전부 놓는다 — 손가락 추적은 남기되(버튼 없음) 액션은 모두 뗀다.
      화면(세트)이 바뀌거나 세로로 돌면 부른다 — 화면이 바뀔 때 쥐고 있던 손가락은 뗄 때까지 무시한다
      (그래야 그 손가락이 움직여도 새 화면의 버튼을 누르지 않는다). */
  function releaseAll() {
    for (var pid in TouchUI._ptr) {
      if (TouchUI._ptr.hasOwnProperty(pid)) TouchUI._ptr[pid] = false;
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
    // 세로 — 버튼이 없다. 전체 화면 + 가로 고정 재요청은 손가락을 뗄 때(onUp) 한다
    if (TouchUI.blocked) { TouchUI._ptr[e.pointerId] = false; return; }
    // 전투 직후 유예 — 결과 화면 버튼 자리가 전투 버튼과 겹쳐 있어 오조작을 막는다
    if (nowSec() < TouchUI._graceUntil) { TouchUI._ptr[e.pointerId] = false; return; }
    var id = hitTest(e.clientX, e.clientY);
    TouchUI._ptr[e.pointerId] = id;
    if (id) press(id);
  }

  function onMove(e) {
    if (!TouchUI._ptr.hasOwnProperty(e.pointerId) || TouchUI._ptr[e.pointerId] === false) return;   // 누르지 않은 포인터(마우스 hover 등) 또는 화면 전환 전부터 쥐고 있던 손가락
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
    if (e.type !== 'pointerup') return;       // pointercancel 은 사용자 조작이 아니다
    var fs = !TouchUI._autoFs || TouchUI.blocked || (id && T.BUTTONS[id].special === 'fullscreen');
    TouchUI._autoFs = true;
    if (fs) TouchUI.requestLandscape();
  }

  /** 프레임마다 (main.js frame — 터치 모드일 때만). scene 으로 버튼 세트를 고르고 꾹 누르기를 센다. */
  TouchUI.update = function (scene) {
    var blocked = global.innerHeight > global.innerWidth;   // 가로 전용 — 세로면 게임을 멈춘다(main.js)
    if (blocked !== TouchUI.blocked) { TouchUI.blocked = blocked; releaseAll(); }
    var t = nowSec();
    var set = pickSet(scene);
    if (set.join(',') !== TouchUI.set.join(',')) {
      TouchUI.set = set;
      releaseAll();
      TouchUI._graceUntil = T.GRACE_AFTER.indexOf(TouchUI._scene) >= 0 ? t + T.GRACE : 0;
    }
    TouchUI._scene = scene;
    for (var id in TouchUI._hold) {
      if (!TouchUI._hold.hasOwnProperty(id) || TouchUI._fired[id]) continue;
      if (t - TouchUI._hold[id] < T.HOLD_TIME) continue;
      TouchUI._fired[id] = true;
      var a = T.BUTTONS[id].action;
      Input.touchAction(a, true);    // 탭 한 번 — 눌렀다 바로 뗀 것과 같다(다음 고정 스텝에 justPressed 한 번)
      Input.touchAction(a, false);
    }
  };

  /** 전체 화면 + 가로 고정 (안드로이드 크롬). 지원하지 않거나 거절되면 조용히 넘어간다 — game.applyFullscreen 과 같은 태도 */
  TouchUI.requestLandscape = function () {
    var d = global.document, el = d.documentElement;
    function lock() {
      var o = global.screen && global.screen.orientation;
      if (!o || !o.lock) return;
      try {
        var r = o.lock('landscape');
        if (r && r['catch']) r['catch'](function () { /* 지원 안 함 — 무시 */ });
      } catch (err) { /* 무시 */ }
    }
    if (d.fullscreenElement || !el.requestFullscreen) { lock(); return; }
    try {
      var pr = el.requestFullscreen();
      if (pr && pr.then) pr.then(lock, function () { /* 브라우저 정책 — 무시 */ });
    } catch (err) { /* 무시 */ }
  };

  function isDown(id) {
    if (TouchUI._hold.hasOwnProperty(id)) return true;
    for (var pid in TouchUI._ptr) {
      if (TouchUI._ptr.hasOwnProperty(pid) && TouchUI._ptr[pid] === id) return true;
    }
    return false;
  }

  function drawArrow(ctx, x, y, s, dir) {
    var ang = dir === 'right' ? 0 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : -Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * T.ARROW_BACK, -s * T.ARROW_HALF);
    ctx.lineTo(-s * T.ARROW_BACK, s * T.ARROW_HALF);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawButton(ctx, id) {
    var b = T.BUTTONS[id], c = TouchUI.center(id), down = isDown(id);
    ctx.globalAlpha = down ? T.ALPHA_DOWN : T.ALPHA_IDLE;
    ctx.beginPath();
    ctx.arc(c.x, c.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = down ? T.FILL_DOWN : T.FILL;
    ctx.fill();
    ctx.lineWidth = T.LINE_W;
    ctx.strokeStyle = b.color ? C.COLORS[b.color] : T.STROKE;   // PARRY 금·DASH 적 — 텔 색 문법(스펙 §2.2)
    ctx.stroke();
    ctx.fillStyle = C.COLORS.WHITE;
    if (b.shape) {
      drawArrow(ctx, c.x, c.y, b.r * T.ARROW, b.shape);
    } else {
      ctx.font = C.font('800', b.r < T.SMALL_R ? T.LABEL_SIZE_SMALL : T.LABEL_SIZE);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, c.x, c.y);
    }
    // 꾹 누르기 진행 링 — 다 차면 한 번 누른다
    if (b.hold && TouchUI._hold.hasOwnProperty(id)) {
      var k = Math.min(1, (nowSec() - TouchUI._hold[id]) / T.HOLD_TIME);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.COLORS.WHITE;
      ctx.beginPath();
      ctx.arc(c.x, c.y, b.r + T.RING_GAP, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawRotate(ctx) {
    var W = global.innerWidth, H = global.innerHeight;
    var pw = T.ROTATE_PHONE_W, ph = T.ROTATE_PHONE_H;
    ctx.globalAlpha = 1;
    ctx.fillStyle = T.ROTATE_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.COLORS.GOLD;
    ctx.lineWidth = T.ROTATE_LINE_W;
    ctx.strokeRect(W / 2 - pw / 2, H / 2 - ph, pw, ph);   // 가로로 누운 폰
    ctx.fillStyle = C.COLORS.WHITE;
    ctx.font = C.font('800', T.ROTATE_SIZE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(T.TEXT.ROTATE, W / 2, H / 2 + T.ROTATE_GAP);
    ctx.fillStyle = C.COLORS.TEXT_DIM;
    ctx.font = C.font('600', T.LABEL_SIZE);
    ctx.fillText(T.TEXT.ROTATE_SUB, W / 2, H / 2 + T.ROTATE_GAP + T.ROTATE_SUB_GAP);
  }

  /** 그리기 (main.js draw 의 맨 끝 — 터치 모드일 때만). 화면 CSS px 좌표계로 게임 위에 그린다. */
  TouchUI.draw = function (ctx, dpr) {
    if (!TouchUI.on) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (TouchUI.blocked) {
      drawRotate(ctx);
    } else if (TouchUI.visible) {
      for (var i = 0; i < TouchUI.set.length; i++) drawButton(ctx, TouchUI.set[i]);
    }
    ctx.restore();
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
    Input.onNonTouch = function () { TouchUI.visible = false; };   // 키보드·패드가 오면 숨긴다 — 다음 터치에 다시 보인다
    readSafe();
    global.addEventListener('resize', readSafe);
    var so = global.screen && global.screen.orientation;
    if (so && so.addEventListener) so.addEventListener('change', readSafe);   // 180도 회전 — 노치가 반대쪽으로 옮겨간다
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
