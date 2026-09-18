/* =============================================================================
 * RIPOSTE — js/main.js
 * 부트 · 캔버스 레터박스(DPR) · rAF 루프 · URL 파라미터 · 디버그 훅 (스펙 §7)
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;

  var canvas, ctx, game;
  var cssW = 0, cssH = 0, dpr = 1, scale = 1, offX = 0, offY = 0;
  var lastT = 0;

  /* ---- URL 파라미터 ------------------------------------------------------ */
  function params() {
    var out = {};
    var q = global.location.search;
    if (q && q.length > 1) {
      var parts = q.substring(1).split('&');
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] === undefined ? '1' : kv[1]);
      }
    }
    return out;
  }

  function numParam(p, key, def) {
    if (p[key] === undefined) return def;
    var n = parseFloat(p[key]);
    return isFinite(n) ? n : def;
  }

  /* ---- 리사이즈 ---------------------------------------------------------- */
  function resize() {
    dpr = global.devicePixelRatio || 1;
    cssW = Math.max(1, global.innerWidth);
    cssH = Math.max(1, global.innerHeight);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    scale = Math.min(cssW / V.W, cssH / V.H);
    offX = (cssW - V.W * scale) / 2;
    offY = (cssH - V.H * scale) / 2;
  }

  /* ---- 드로우 ------------------------------------------------------------ */
  function draw() {
    // 레터박스 바깥
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, V.W, V.H);
    ctx.clip();

    // 월드 (줌 + 흔들림)
    ctx.save();
    if (FX.zoom !== 1) {
      ctx.translate(V.W / 2, V.H / 2);
      ctx.scale(FX.zoom, FX.zoom);
      ctx.translate(-V.W / 2, -V.H / 2);
    }
    ctx.translate(FX.shakeX, FX.shakeY);

    if (game.scene === 'STORY') Render.drawStoryScene(ctx, game);
    else if (game.boss) Render.drawWorld(ctx, game);
    else Render.drawTitleScene(ctx, game.sceneT);

    ctx.restore();

    Render.drawOverlay(ctx);

    // UI
    switch (game.scene) {
      case 'TITLE':   UI.drawTitle(ctx, game); break;
      case 'STORY':   UI.drawStory(ctx, game); break;
      case 'INTERLUDE': UI.drawInterlude(ctx, game); break;
      case 'INTRO':   UI.drawHUD(ctx, game); UI.drawIntro(ctx, game); break;
      case 'FIGHT':   UI.drawHUD(ctx, game); UI.drawPhaseBanner(ctx, game); break;
      case 'VICTORY': UI.drawVictory(ctx, game); break;
      case 'DEFEAT':  UI.drawDefeat(ctx, game); break;
      case 'ENDING':  UI.drawEnding(ctx, game); break;
    }

    ctx.restore();
  }

  /* ---- 루프 -------------------------------------------------------------- */
  function frame(now) {
    global.requestAnimationFrame(frame);
    Input.pollGamepad();
    if (!lastT) lastT = now;
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (dt < 0) dt = 0;
    game.update(dt);
    draw();
  }

  /* ---- 부트 -------------------------------------------------------------- */
  function boot() {
    var p = params();

    canvas = global.document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });

    Render.initScene();

    game = new Game({
      seed: numParam(p, 'seed', 20260909),
      speed: numParam(p, 'speed', 1),
      story: p.story !== '0'                  // ?story=0 — 대화 전부 건너뜀 (테스트/봇)
    });

    if (p.nofx !== undefined) FX.enabled = false;
    if (p.flash === '0') FX.whiteFlashEnabled = false;   // 전체화면 백색 플래시만 옵트아웃 (히트스톱/흔들림/슬로모/텔 버스트는 유지)
    if (p.mute !== undefined) RAudio.setMuted(true);

    Input.attach(global);
    // 매 입력마다 재시도한다 — 첫 키가 user activation 을 주지 않아도 무음에 갇히지 않는다
    Input.onGesture = function () { RAudio.init(); };
    global.addEventListener('pointerdown', function () { RAudio.init(); });

    if (p.boss !== undefined) {
      var bi = Math.round(numParam(p, 'boss', 1)) - 1;
      // URL 로 바로 들어온 판은 진행도를 저장하지 않고 대화도 틀지 않는다
      game.startRun(Math.max(0, Math.min(global.BOSSES.length - 1, bi)), { noSave: true, noStory: true });
    }

    global.addEventListener('resize', resize);
    resize();

    /* 디버그 훅 (스펙 §7) — 테스트는 이 훅만 사용한다 */
    global.__RIPOSTE = {
      game: game,
      CONFIG: C,
      getState: function () { return game.getState(); },
      setTimeScale: function (n) {
        var v = parseFloat(n);
        game.debugScale = isFinite(v) && v > 0 ? v : 1;
        return game.debugScale;
      }
    };

    global.requestAnimationFrame(frame);
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
