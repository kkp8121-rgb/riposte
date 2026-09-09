/* =============================================================================
 * RIPOSTE — js/ui.js
 * HUD (보스 HP · 하트 · 손패 · 스트릭 · 타이머) + 화면 (타이틀/인트로/승리/패배/엔딩)
 * 스펙 §6
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;
  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* HUD 레이아웃 상수 (이 파일 로컬 표) */
  var L = {
    HP_W: 430, HP_H: 12, HP_Y: 34,
    NAME_Y: 22,
    HEART_X: 26, HEART_Y: 26, HEART_GAP: 26, HEART_R: 9,
    TIMER_X: V.W - 22, TIMER_Y: 26,
    STREAK_X: V.W - 22, STREAK_Y: V.H - 26,
    TITLE_Y: 150,
    CARD_W: 460, CARD_H: 268
  };

  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = C.font(o.weight || '600', o.size || 16, o.family);
    ctx.fillStyle = o.color || C.COLORS.TEXT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.glow) { ctx.shadowColor = o.glow === true ? (o.color || C.COLORS.TEXT) : o.glow; ctx.shadowBlur = o.blur || 14; }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.spacing) {
      var total = 0, i;
      for (i = 0; i < str.length; i++) total += ctx.measureText(str[i]).width + o.spacing;
      total -= o.spacing;
      var cx = (o.align === 'left') ? x : x - total / 2;
      for (i = 0; i < str.length; i++) {
        var w = ctx.measureText(str[i]).width;
        ctx.textAlign = 'left';
        ctx.fillText(str[i], cx, y);
        cx += w + o.spacing;
      }
    } else {
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  }

  function fmtTime(t) {
    if (t === undefined || t === null || !isFinite(t)) t = 0;
    var m = Math.floor(t / 60);
    var s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function heartPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.75);
    ctx.bezierCurveTo(-r * 1.5, -r * 0.35, -r * 0.55, -r * 1.35, 0, -r * 0.45);
    ctx.bezierCurveTo(r * 0.55, -r * 1.35, r * 1.5, -r * 0.35, 0, r * 0.75);
    ctx.closePath();
  }

  /**
   * 하트. break > 0 이면 "깨짐" 애니메이션 — 반쪽이 갈라져 떨어진다 (스펙 §4).
   */
  function heart(ctx, x, y, r, filled, brk) {
    if (brk > 0) {
      var k = 1 - brk;                    // 0 -> 1
      var spread = k * r * 1.5;
      var drop = k * k * r * 2.6;
      for (var side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.translate(x + side * spread, y + drop);
        ctx.rotate(side * k * 0.8);
        ctx.beginPath();
        ctx.rect(side < 0 ? -r * 1.6 : 0, -r * 1.5, r * 1.6, r * 3);
        ctx.clip();
        heartPath(ctx, r);
        ctx.fillStyle = C.COLORS.HEART;
        ctx.shadowColor = C.COLORS.HEART;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(x, y);
    heartPath(ctx, r);
    if (filled) {
      ctx.fillStyle = C.COLORS.HEART;
      ctx.shadowColor = C.COLORS.HEART;
      ctx.shadowBlur = 10;
      ctx.fill();
    } else {
      ctx.strokeStyle = C.COLORS.HEART_EMPTY;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  var UI = {};

  /* =========================================================================
   * HUD
   * ====================================================================== */
  UI.drawHUD = function (ctx, game) {
    var b = game.boss;
    var p = game.player;
    if (!b) return;

    /* 보스 이름 + HP 바 */
    var x0 = (V.W - L.HP_W) / 2;
    text(ctx, b.name + (b.phase === 2 ? '  ·  PHASE II' : ''), V.W / 2, L.NAME_Y,
      { size: 15, weight: '700', color: b.color, spacing: 3, glow: b.color, blur: 10 });

    ctx.save();
    ctx.fillStyle = C.COLORS.HP_BACK;
    ctx.fillRect(x0, L.HP_Y, L.HP_W, L.HP_H);

    var ratio = clamp(b.hp / b.maxHp, 0, 1);
    var grad = ctx.createLinearGradient(x0, 0, x0 + L.HP_W, 0);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, C.COLORS.HP_BOSS);
    ctx.fillStyle = grad;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;
    ctx.fillRect(x0, L.HP_Y, L.HP_W * ratio, L.HP_H);
    ctx.shadowBlur = 0;

    // 50% 마커
    ctx.strokeStyle = b.phase === 2 ? 'rgba(255,255,255,0.25)' : C.COLORS.WHITE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + L.HP_W * C.BOSS.PHASE2_HP_RATIO, L.HP_Y - 3);
    ctx.lineTo(x0 + L.HP_W * C.BOSS.PHASE2_HP_RATIO, L.HP_Y + L.HP_H + 3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 0.5, L.HP_Y - 0.5, L.HP_W + 1, L.HP_H + 1);
    ctx.restore();

    /* 하트 (잃은 직후 한 칸은 깨짐 애니메이션) */
    for (var i = 0; i < C.PLAYER.HP; i++) {
      var alive = i < p.hp;
      var brk = (i === p.heartBreak && p.heartBreakT > 0)
        ? p.heartBreakT / C.PLAYER.HEART_BREAK_TIME : 0;
      heart(ctx, L.HEART_X + i * L.HEART_GAP, L.HEART_Y, L.HEART_R, alive, brk);
    }

    /* 타이머 */
    text(ctx, fmtTime(game.time), L.TIMER_X, L.TIMER_Y,
      { size: 17, weight: '700', color: game.time > b.par ? C.COLORS.TEXT_DIM : C.COLORS.TEXT,
        align: 'right', family: C.FONT.MONO });
    text(ctx, 'PAR ' + b.par + 's', L.TIMER_X, L.TIMER_Y + 17,
      { size: 10, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });

    /* 손패 3슬롯 */
    UI.drawHand(ctx, game);

    /* 스트릭 */
    if (p.streak > 0) {
      var emp = p.isEmpowered();
      // 퍼펙트 패리 직후 펄스 + 엠파워 상시 맥동 (스펙 §4)
      var kick = p.streakPulse > 0 ? (p.streakPulse / C.PLAYER.STREAK_PULSE_TIME) * 0.45 : 0;
      var pulse = 1 + kick + (emp ? Math.sin(p.animT * 8) * 0.07 : 0);
      text(ctx, '×' + p.streak, L.STREAK_X, L.STREAK_Y,
        { size: Math.round(30 * pulse), weight: '800', align: 'right',
          color: emp ? C.COLORS.EMPOWER : C.COLORS.TEXT, glow: emp ? C.COLORS.EMPOWER : false });
      text(ctx, emp ? 'EMPOWERED' : 'STREAK', L.STREAK_X, L.STREAK_Y + 20,
        { size: 10, weight: '700', align: 'right', color: emp ? C.COLORS.EMPOWER : C.COLORS.TEXT_DIM, spacing: 1 });
    }

    /* 튜토리얼 프롬프트 */
    var tip = game.tutorialPrompt();
    if (tip) {
      var a = 0.65 + 0.35 * Math.sin(game.time * C.TUTORIAL.PULSE_HZ * Math.PI);
      text(ctx, tip, V.W / 2, C.TUTORIAL.Y,
        { size: 17, weight: '700', color: C.COLORS.GOLD, alpha: a, glow: C.COLORS.GOLD, blur: 12, spacing: 1 });
    }
  };

  UI.drawHand = function (ctx, game) {
    var p = game.player;
    var n = C.HAND.SIZE;
    var totalW = n * C.HAND.SLOT_W + (n - 1) * C.HAND.SLOT_GAP;
    var sx = (V.W - totalW) / 2;
    var sy = V.H - C.HAND.BOTTOM_MARGIN - C.HAND.SLOT_H;
    var emp = p.isEmpowered();

    for (var i = 0; i < n; i++) {
      var x = sx + i * (C.HAND.SLOT_W + C.HAND.SLOT_GAP);
      var skill = p.hand[i];
      var front = (i === 0 && skill);

      ctx.save();
      ctx.fillStyle = 'rgba(12,16,26,0.72)';
      ctx.fillRect(x, sy, C.HAND.SLOT_W, C.HAND.SLOT_H);

      if (front && emp) {
        ctx.strokeStyle = C.COLORS.EMPOWER;
        ctx.lineWidth = 3;
        ctx.shadowColor = C.COLORS.EMPOWER;
        ctx.shadowBlur = 14;
      } else if (front) {
        ctx.strokeStyle = C.COLORS.PLAYER;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = C.COLORS.PLAYER;
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = skill ? 'rgba(230,235,245,0.35)' : 'rgba(120,130,150,0.20)';
        ctx.lineWidth = 1.5;
      }
      ctx.strokeRect(x + 0.5, sy + 0.5, C.HAND.SLOT_W - 1, C.HAND.SLOT_H - 1);
      ctx.restore();

      if (skill) {
        text(ctx, skill.label || skill.id, x + C.HAND.SLOT_W / 2, sy + 15,
          { size: 13, weight: '800', color: front ? C.COLORS.WHITE : C.COLORS.TEXT, spacing: 1 });
        var dmg = skill.damage * (front && emp ? C.COMBAT.EMPOWER_MULT : 1);
        text(ctx, dmg + ' DMG', x + C.HAND.SLOT_W / 2, sy + 30,
          { size: 10, weight: '600', color: front && emp ? C.COLORS.EMPOWER : C.COLORS.TEXT_DIM });
      } else {
        text(ctx, '—', x + C.HAND.SLOT_W / 2, sy + C.HAND.SLOT_H / 2,
          { size: 14, weight: '600', color: 'rgba(120,130,150,0.35)' });
      }
    }

    text(ctx, p.hand.length ? 'J  RIPOSTE' : 'PARRY TO STEAL', V.W / 2,
      sy - 12, { size: 10, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
  };

  /* =========================================================================
   * 화면
   * ====================================================================== */

  function panel(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = 'rgba(8,10,18,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(230,235,245,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  function dim(ctx, a) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,5,10,' + a + ')';
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.restore();
  }

  var CONTROLS = [
    ['← →  /  A D', 'MOVE'],
    ['K  /  Z', 'PARRY  —  gold flash'],
    ['J  /  X', 'RIPOSTE  —  use stolen attack'],
    ['SPACE  /  L  /  C', 'DASH  —  red flash'],
    ['R  /  M  /  ESC', 'RETRY  /  MUTE  /  TITLE']
  ];

  UI.drawTitle = function (ctx, game) {
    dim(ctx, 0.55);

    var t = game.sceneT;
    text(ctx, 'RIPOSTE', V.W / 2, L.TITLE_Y,
      { size: 78, weight: '800', color: C.COLORS.WHITE, spacing: 12, glow: C.COLORS.PLAYER, blur: 26 });

    text(ctx, 'You have no sword. Parry perfectly, and their attack becomes yours.',
      V.W / 2, L.TITLE_Y + 54, { size: 16, weight: '600', color: C.COLORS.GOLD });

    // 조작표
    var ty = 268;
    text(ctx, 'CONTROLS', V.W / 2, ty - 24,
      { size: 11, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4 });
    for (var i = 0; i < CONTROLS.length; i++) {
      text(ctx, CONTROLS[i][0], V.W / 2 - 16, ty + i * 24,
        { size: 14, weight: '700', color: C.COLORS.TEXT, align: 'right', family: C.FONT.MONO });
      text(ctx, CONTROLS[i][1], V.W / 2 + 16, ty + i * 24,
        { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, align: 'left' });
    }

    var blink = 0.55 + 0.45 * Math.sin(t * 4);
    var hasSave = game.save.unlocked > 1;
    if (hasSave) {
      text(ctx, '[ENTER]  CONTINUE  —  BOSS ' + game.save.unlocked, V.W / 2, 452,
        { size: 19, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 2, glow: C.COLORS.PLAYER, blur: 12 });
      text(ctx, '[N]  NEW GAME', V.W / 2, 480,
        { size: 14, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
    } else {
      text(ctx, 'PRESS ENTER', V.W / 2, 462,
        { size: 22, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 4, glow: C.COLORS.PLAYER, blur: 14 });
    }

    // 저장된 랭크
    var keys = Object.keys(game.save.ranks || {});
    if (keys.length) {
      var line = '';
      for (var k = 0; k < game.defs.length; k++) {
        var d = game.defs[k];
        var r = game.save.ranks[d.key];
        line += d.name + ' ' + (r || '-') + (k < game.defs.length - 1 ? '   ' : '');
      }
      text(ctx, line, V.W / 2, 514, { size: 11, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 1 });
    }
  };

  UI.drawIntro = function (ctx, game) {
    var b = game.banner;
    if (!b) return;
    var t = clamp(b.t / C.SCENE.INTRO_TIME, 0, 1);
    var a = t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    dim(ctx, 0.5 * a);

    var slide = lerp(-30, 0, Math.min(1, t * 4));
    var def = game.defs[game.bossIndex];
    text(ctx, 'BOSS ' + (game.bossIndex + 1) + ' / ' + game.defs.length, V.W / 2, 200 + slide,
      { size: 12, weight: '800', color: C.COLORS.TEXT_DIM, alpha: a, spacing: 5 });
    text(ctx, b.name, V.W / 2, 250 + slide,
      { size: 64, weight: '800', color: def.color, alpha: a, spacing: 10, glow: def.color, blur: 24 });
    text(ctx, b.title, V.W / 2, 300 + slide,
      { size: 15, weight: '600', color: C.COLORS.TEXT, alpha: a, spacing: 4 });

    // 장식선
    ctx.save();
    ctx.globalAlpha = a * 0.6;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(V.W / 2 - 170, 322 + slide); ctx.lineTo(V.W / 2 + 170, 322 + slide);
    ctx.stroke();
    ctx.restore();
  };

  /** Phase 2 배너 (FIGHT 중 잠깐 뜬다) */
  UI.drawPhaseBanner = function (ctx, game) {
    var b = game.banner;
    if (!b || !b.phase2) return;
    var dur = C.SCENE.PHASE2_BANNER;
    if (b.t > dur) return;
    var t = b.t / dur;
    var a = t < 0.12 ? t / 0.12 : (t > 0.7 ? (1 - t) / 0.3 : 1);
    var col = game.boss ? game.boss.color : C.COLORS.RED;
    text(ctx, b.name, V.W / 2, 190,
      { size: 52, weight: '800', color: col, alpha: a, spacing: 8, glow: col, blur: 22 });
    text(ctx, b.title, V.W / 2, 232,
      { size: 18, weight: '700', color: C.COLORS.WHITE, alpha: a, spacing: 6 });
  };

  function rankColor(r) {
    return r === 'S' ? C.COLORS.GOLD
         : r === 'A' ? C.COLORS.PLAYER
         : r === 'B' ? C.COLORS.TEXT
         : C.COLORS.TEXT_DIM;
  }

  UI.drawVictory = function (ctx, game) {
    dim(ctx, 0.62);
    var r = game.result || {};
    var t = game.sceneT;
    var slide = lerp(40, 0, clamp(t / 0.35, 0, 1));
    var x = (V.W - L.CARD_W) / 2;
    var y = (V.H - L.CARD_H) / 2 + slide;

    panel(ctx, x, y, L.CARD_W, L.CARD_H, clamp(t / 0.25, 0, 1));

    text(ctx, 'VICTORY', V.W / 2, y + 36,
      { size: 34, weight: '800', color: C.COLORS.WHITE, spacing: 8, glow: C.COLORS.PLAYER, blur: 18 });
    text(ctx, r.boss || '', V.W / 2, y + 66,
      { size: 13, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 3 });

    var rows = [
      ['TIME', fmtTime(r.time) + '   (par ' + r.par + 's)'],
      ['HITS TAKEN', String(r.hits)],
      ['PERFECT PARRIES', String(r.perfects)]
    ];
    for (var i = 0; i < rows.length; i++) {
      var ry = y + 108 + i * 26;
      text(ctx, rows[i][0], x + 40, ry, { size: 13, weight: '600', color: C.COLORS.TEXT_DIM, align: 'left' });
      text(ctx, rows[i][1], x + L.CARD_W - 40, ry,
        { size: 15, weight: '700', color: C.COLORS.TEXT, align: 'right', family: C.FONT.MONO });
    }

    // 랭크 — 스케일 인
    var k = clamp((t - 0.3) / C.RANK.CARD_SCALE_TIME, 0, 1);
    if (k > 0) {
      var sc = k < 1 ? lerp(2.6, 1, k * k) : 1;
      var col = rankColor(r.rank);
      text(ctx, r.rank || 'C', V.W / 2, y + 212,
        { size: Math.round(58 * sc), weight: '800', color: col, glow: col, blur: 26, alpha: clamp(k * 1.6, 0, 1) });
      text(ctx, 'RANK', V.W / 2, y + 245,
        { size: 10, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: k });
    }

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, game.bossIndex + 1 >= game.defs.length ? 'ENTER  —  ENDING' : 'ENTER  —  NEXT BOSS',
      V.W / 2, y + L.CARD_H + 30,
      { size: 15, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

  UI.drawDefeat = function (ctx, game) {
    dim(ctx, 0.68);
    var t = game.sceneT;
    var r = game.result || {};
    text(ctx, 'DEFEAT', V.W / 2, 210,
      { size: 60, weight: '800', color: C.COLORS.HEART, spacing: 10, glow: C.COLORS.HEART, blur: 24 });
    text(ctx, (r.boss || '') + '  ·  ' + fmtTime(r.time) + '  ·  ' + (r.perfects || 0) + ' PERFECT',
      V.W / 2, 258, { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, spacing: 2 });
    text(ctx, 'Nothing is given. Everything is taken.', V.W / 2, 296,
      { size: 14, weight: '600', color: C.COLORS.TEXT_DIM });

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, 'R  —  RETRY', V.W / 2, 364,
      { size: 22, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
    text(ctx, 'ESC  —  TITLE', V.W / 2, 396,
      { size: 14, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
  };

  UI.drawEnding = function (ctx, game) {
    dim(ctx, 0.72);
    var t = game.sceneT;
    var run = game.run;

    text(ctx, 'EVERYTHING TAKEN', V.W / 2, 88,
      { size: 42, weight: '800', color: C.COLORS.WHITE, spacing: 8, glow: C.COLORS.GOLD, blur: 22 });
    text(ctx, 'You never drew a sword. You only took theirs.', V.W / 2, 126,
      { size: 15, weight: '600', color: C.COLORS.GOLD });

    // 보스별 결과
    var y = 182;
    for (var i = 0; i < run.bosses.length; i++) {
      var b = run.bosses[i];
      text(ctx, b.name, V.W / 2 - 200, y + i * 28,
        { size: 15, weight: '700', color: C.COLORS.TEXT, align: 'left', spacing: 2 });
      text(ctx, fmtTime(b.time), V.W / 2 + 20, y + i * 28,
        { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right', family: C.FONT.MONO });
      text(ctx, b.hits + ' hit', V.W / 2 + 100, y + i * 28,
        { size: 13, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.perfects + ' perfect', V.W / 2 + 190, y + i * 28,
        { size: 13, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.rank, V.W / 2 + 216, y + i * 28,
        { size: 19, weight: '800', color: rankColor(b.rank), align: 'left', glow: rankColor(b.rank), blur: 10 });
    }

    var ty = y + run.bosses.length * 28 + 26;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = C.COLORS.TEXT;
    ctx.beginPath();
    ctx.moveTo(V.W / 2 - 210, ty - 14); ctx.lineTo(V.W / 2 + 230, ty - 14);
    ctx.stroke();
    ctx.restore();

    text(ctx, 'TOTAL  ' + fmtTime(run.time) + '   ·   ' + run.hits + ' HITS   ·   ' + run.perfects + ' PERFECT',
      V.W / 2, ty + 4, { size: 14, weight: '700', color: C.COLORS.TEXT, spacing: 1 });

    var ov = game.overallRank();
    var k = clamp((t - 0.25) / C.RANK.CARD_SCALE_TIME, 0, 1);
    var sc = k < 1 ? lerp(2.8, 1, k * k) : 1;
    text(ctx, ov, V.W / 2, ty + 62,
      { size: Math.round(64 * sc), weight: '800', color: rankColor(ov), glow: rankColor(ov), blur: 28, alpha: clamp(k * 1.6, 0, 1) });
    text(ctx, 'OVERALL RANK', V.W / 2, ty + 100,
      { size: 10, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: k });

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, 'ENTER  —  TITLE', V.W / 2, V.H - 24,
      { size: 15, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

  UI.text = text;
  UI.fmtTime = fmtTime;
  global.UI = UI;
})(window);
