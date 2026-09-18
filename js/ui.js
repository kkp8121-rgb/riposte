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
    CARD_W: 460, CARD_H: 294
  };

  /* 자간(letter-spacing) 텍스트의 글자 폭 캐시.
     measureText 는 비싸다 — 프레임마다 글자당 2번씩 재는 대신 폰트+문자열로 캐시한다. */
  var _measCache = Object.create(null);
  var _measCount = 0;
  var MEAS_CACHE_MAX = 256;

  function charWidths(ctx, str, font) {
    var key = font + '|' + str;
    var hit = _measCache[key];
    if (hit) return hit;
    var w = new Array(str.length);
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      w[i] = ctx.measureText(str[i]).width;
      total += w[i];
    }
    if (_measCount >= MEAS_CACHE_MAX) { _measCache = Object.create(null); _measCount = 0; }
    _measCount++;
    hit = { w: w, total: total };
    _measCache[key] = hit;
    return hit;
  }

  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    var font = C.font(o.weight || '600', o.size || 16, o.family);
    ctx.font = font;
    ctx.fillStyle = o.color || C.COLORS.TEXT;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.glow) { ctx.shadowColor = o.glow === true ? (o.color || C.COLORS.TEXT) : o.glow; ctx.shadowBlur = o.blur || 14; }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.spacing) {
      var m = charWidths(ctx, str, font);
      var total = m.total + o.spacing * (str.length - 1);
      var cx = (o.align === 'left') ? x : (o.align === 'right' ? x - total : x - total / 2);
      ctx.textAlign = 'left';
      for (var i = 0; i < str.length; i++) {
        ctx.fillText(str[i], cx, y);
        cx += m.w[i] + o.spacing;
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

  /* HP 바 그라디언트 — 보스 색이 바뀔 때만 다시 만든다 (프레임마다 만들지 않는다) */
  var _hpGrad = null, _hpGradColor = null;
  function hpGradient(ctx, x0, color) {
    if (_hpGrad && _hpGradColor === color) return _hpGrad;
    var g = ctx.createLinearGradient(x0, 0, x0 + L.HP_W, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, C.COLORS.HP_BOSS);
    _hpGrad = g;
    _hpGradColor = color;
    return g;
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
    ctx.fillStyle = hpGradient(ctx, x0, b.color);
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

    /* 약탈 보스가 빼앗아 간 손패 (스펙 §3.8) — HP 바 아래 작은 슬롯 */
    if (b.loot && b.loot.length) {
      var H = C.HAND;
      var lw = b.loot.length * H.LOOT_SLOT_W + (b.loot.length - 1) * H.LOOT_GAP;
      var lx = (V.W - lw) / 2;
      text(ctx, H.LOOT_LABEL, lx - 10, H.LOOT_Y + H.LOOT_SLOT_H / 2,
        { size: 9, weight: '800', color: b.color, align: 'right', spacing: 2 });
      for (var li = 0; li < b.loot.length; li++) {
        var slotX = lx + li * (H.LOOT_SLOT_W + H.LOOT_GAP);
        ctx.save();
        ctx.fillStyle = 'rgba(12,16,26,0.72)';
        ctx.fillRect(slotX, H.LOOT_Y, H.LOOT_SLOT_W, H.LOOT_SLOT_H);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(slotX + 0.5, H.LOOT_Y + 0.5, H.LOOT_SLOT_W - 1, H.LOOT_SLOT_H - 1);
        ctx.restore();
        text(ctx, b.loot[li].label || b.loot[li].id, slotX + H.LOOT_SLOT_W / 2, H.LOOT_Y + H.LOOT_SLOT_H / 2,
          { size: 10, weight: '800', color: b.color, spacing: 1 });
      }
    }

    /* 하트 (잃은 직후 한 칸은 깨짐 애니메이션) */
    for (var i = 0; i < (p.maxHp || C.PLAYER.HP); i++) {
      var alive = i < p.hp;
      var brk = (i === p.heartBreak && p.heartBreakT > 0)
        ? p.heartBreakT / C.PLAYER.HEART_BREAK_TIME : 0;
      heart(ctx, L.HEART_X + i * L.HEART_GAP, L.HEART_Y, L.HEART_R, alive, brk);
    }

    /* 스태미너 바 (하트 바로 아래) — 패리 1회분이 안 남으면 붉게, 헛입력이면 점멸 */
    var HU = C.HUD;
    var stRatio = clamp(p.stamina / C.STAMINA.MAX, 0, 1);
    var low = p.stamina < C.STAMINA.PARRY_COST;
    ctx.save();
    if (p.staminaEmptyFlash > 0) {
      ctx.globalAlpha = (Math.sin(p.staminaEmptyFlash * TAU * 8) > 0) ? 1 : 0.25;
    }
    ctx.fillStyle = C.COLORS.HP_BACK;
    ctx.fillRect(HU.STAMINA_X, HU.STAMINA_Y, HU.STAMINA_W, HU.STAMINA_H);
    ctx.fillStyle = low ? C.COLORS.RED : C.COLORS.PLAYER;
    ctx.fillRect(HU.STAMINA_X, HU.STAMINA_Y, HU.STAMINA_W * stRatio, HU.STAMINA_H);
    ctx.restore();

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
    var t = game.sceneT;
    // 뒤에서 두 실루엣이 대치 중이다 — 타이틀은 그 위로 0.6s 동안 떠오른다
    var fade = clamp(t / C.TITLE.FADE, 0, 1);
    dim(ctx, 0.55 * fade);

    text(ctx, 'RIPOSTE', V.W / 2, L.TITLE_Y,
      { size: 78, weight: '800', color: C.COLORS.WHITE, spacing: 12, glow: C.COLORS.PLAYER, blur: 26,
        alpha: fade });

    text(ctx, 'You have no sword. Parry perfectly, and their attack becomes yours.',
      V.W / 2, L.TITLE_Y + 54, { size: 16, weight: '600', color: C.COLORS.GOLD, alpha: fade });

    // 조작표
    var ty = 268;
    text(ctx, 'CONTROLS', V.W / 2, ty - 24,
      { size: 11, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: fade });
    for (var i = 0; i < CONTROLS.length; i++) {
      text(ctx, CONTROLS[i][0], V.W / 2 - 16, ty + i * 24,
        { size: 14, weight: '700', color: C.COLORS.TEXT, align: 'right', family: C.FONT.MONO, alpha: fade });
      text(ctx, CONTROLS[i][1], V.W / 2 + 16, ty + i * 24,
        { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, align: 'left', alpha: fade });
    }

    // 세로 메뉴 — 커서 기본값 0번(NEW RUN)이라 Enter 한 번이 그대로 시작이다
    var M = C.MENU;
    var items = game.titleItems();
    var blink = (0.55 + 0.45 * Math.sin(t * C.TITLE.BLINK_HZ)) * fade;
    for (var m = 0; m < items.length; m++) {
      var on = m === game.menuIndex;
      var my = M.ITEM_Y + m * M.ITEM_GAP;
      var label = items[m].label;
      if (items[m].id === 'continue') label += '  —  ' + continueLabel(game);
      text(ctx, label, V.W / 2, my,
        { size: M.ITEM_SIZE, weight: '800', color: on ? C.COLORS.WHITE : C.COLORS.TEXT_DIM,
          spacing: 3, alpha: on ? blink : fade * 0.85,
          glow: on ? C.COLORS.PLAYER : false, blur: 12 });
      if (on) {
        text(ctx, M.CURSOR, M.CURSOR_X, my,
          { size: M.ITEM_SIZE, weight: '800', color: C.COLORS.GOLD, align: 'right', alpha: blink });
      }
    }
    text(ctx, M.TITLE_HINT + '      N  NEW GAME', V.W / 2, M.HINT_Y,
      { size: 10, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2, alpha: fade * 0.8 });

    // 저장된 랭크
    var keys = Object.keys(game.save.ranks || {});
    if (keys.length) {
      var line = '';
      for (var k = 0; k < game.defs.length; k++) {
        var d = game.defs[k];
        var r = game.save.ranks[d.key];
        line += d.name + ' ' + (r || '-') + (k < game.defs.length - 1 ? '   ' : '');
      }
      text(ctx, line, V.W / 2, M.RANKS_Y,
        { size: 11, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 1, alpha: fade });
    }
  };

  /* =========================================================================
   * 메뉴 화면 (OPTIONS · BOSS SELECT · KEY BINDINGS)
   * ====================================================================== */

  /** CONTINUE 오른쪽에 붙는 "어디서부터인지" 라벨 */
  function continueLabel(game) {
    if (game.save.cleared) return 'BEST RANKS';
    var i = game.save.unlocked - 1;
    var ci = game.chapterOf(i);
    if (!ci) return 'BOSS ' + game.save.unlocked;
    return ci.name.replace('CHAPTER ', 'CH.') + '  BOSS ' + (ci.bosses.indexOf(game.defs[i].key) + 1);
  }

  /** 메뉴 한 행 (라벨 + 값) — 커서가 있으면 금색 화살표 */
  function menuRow(ctx, y, label, value, on, valueColor) {
    var M = C.MENU;
    if (on) {
      text(ctx, M.CURSOR, M.PANEL_X + 24, y,
        { size: M.ROW_SIZE, weight: '800', color: C.COLORS.GOLD, align: 'left' });
    }
    text(ctx, label, M.PANEL_X + 48, y,
      { size: M.ROW_SIZE, weight: on ? '800' : '600', color: on ? C.COLORS.WHITE : C.COLORS.TEXT,
        align: 'left', spacing: 1 });
    if (value !== null && value !== undefined) {
      text(ctx, value, M.PANEL_X + M.PANEL_W - 40, y,
        { size: M.ROW_SIZE, weight: '700', color: valueColor || (on ? C.COLORS.GOLD : C.COLORS.TEXT_DIM),
          align: 'right', family: C.FONT.MONO });
    }
  }

  function menuFrame(ctx, game, head) {
    var M = C.MENU;
    dim(ctx, 0.74);
    panel(ctx, M.PANEL_X, M.PANEL_Y, M.PANEL_W, M.PANEL_H, 1);
    text(ctx, head, V.W / 2, M.HEAD_Y,
      { size: 26, weight: '800', color: C.COLORS.WHITE, spacing: 8, glow: C.COLORS.PLAYER, blur: 16 });
    if (game.menuMsgT > 0 && game.menuMsg) {
      text(ctx, game.menuMsg, V.W / 2, M.MSG_Y,
        { size: 12, weight: '800', color: C.COLORS.RED, spacing: 2 });
    }
  }

  /** 옵션 행의 현재 값 문자열 */
  function optionValue(game, row) {
    var M = C.MENU;
    var s = game.save.settings;
    if (row.type === 'range') return String(s.volume);
    if (row.type === 'toggle') return s[row.id] ? M.ON : M.OFF;
    if (row.type === 'choice') return C.ASSIST[row.table][s[row.id]].label;
    return '';
  }

  UI.drawOptions = function (ctx, game) {
    var M = C.MENU;
    menuFrame(ctx, game, 'OPTIONS');
    var rows = M.OPTIONS;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var assistOff = row.type === 'choice' && game.save.settings[row.id] > 0;
      menuRow(ctx, M.ROW_Y + i * M.ROW_GAP, row.label, optionValue(game, row), i === game.menuIndex,
        assistOff ? C.COLORS.GOLD : null);
    }
    if (game.assistOn()) {
      text(ctx, M.ASSIST_BADGE, V.W / 2, M.MSG_Y - 18,
        { size: 11, weight: '800', color: C.COLORS.GOLD, spacing: 3 });
    }
    text(ctx, M.OPTION_HINT, V.W / 2, M.HINT_Y,
      { size: 10, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
  };

  UI.drawBossSelect = function (ctx, game) {
    var M = C.MENU;
    menuFrame(ctx, game, 'BOSS SELECT');
    var list = game.clearedBosses();
    if (!list.length) {
      text(ctx, M.NO_BOSSES, V.W / 2, M.ROW_Y + 40,
        { size: 14, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
    }
    for (var i = 0; i < list.length; i++) {
      var d = game.defs[list[i]];
      var rk = game.save.ranks[d.key];
      menuRow(ctx, M.ROW_Y + i * M.ROW_GAP, (list[i] + 1) + '.  ' + d.name, rk || '-',
        i === game.menuIndex, rankColor(rk || 'C'));
    }
    text(ctx, M.OPTION_HINT, V.W / 2, M.HINT_Y,
      { size: 10, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
  };

  UI.drawKeybind = function (ctx, game) {
    var M = C.MENU;
    menuFrame(ctx, game, 'KEY BINDINGS');
    var acts = M.BINDABLE;
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      var codes = Input.KEYMAP[a] || [];
      var val = game.bindWait === a ? M.PRESS_KEY : codes.join(' / ');
      menuRow(ctx, M.ROW_Y + i * M.ROW_GAP, a.toUpperCase(), val, i === game.menuIndex,
        game.bindWait === a ? C.COLORS.GOLD : null);
    }
    text(ctx, M.BIND_HINT, V.W / 2, M.HINT_Y,
      { size: 10, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
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

  /* =========================================================================
   * STORY (스펙 §10) — 하단 텍스트 박스 + 선택지 + TAKEN 카드
   * ====================================================================== */

  /** ' / ' 로 나뉜 두 목소리를 색을 번갈아 그린다 (CHORUS). 나뉘지 않으면 한 색. */
  function voiceText(ctx, str, x, y, size, colorA, colorB) {
    var parts = str.split(C.STORY.VOICE_SPLIT);
    if (parts.length === 1) { text(ctx, str, x, y, { size: size, weight: '600', color: colorA, align: 'left' }); return; }
    var cx = x;
    ctx.save();
    ctx.font = C.font('600', size);
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i] + (i < parts.length - 1 ? C.STORY.VOICE_SPLIT : '');
      text(ctx, seg, cx, y, { size: size, weight: '600', color: i % 2 ? colorB : colorA, align: 'left' });
      cx += ctx.measureText(seg).width;
    }
    ctx.restore();
  }

  UI.drawStory = function (ctx, game) {
    var st = game.story;
    var S = C.STORY;
    if (!st) return;
    var b = game.boss;
    var bossColor = b ? b.color : C.COLORS.WHITE;

    panel(ctx, S.BOX_X, S.BOX_Y, S.BOX_W, S.BOX_H, 1);
    text(ctx, S.PROMPT_SKIP, S.BOX_X + S.BOX_W - 16, S.BOX_Y + 14,
      { size: 9, weight: '700', color: C.COLORS.TEXT_DIM, align: 'right', spacing: 1, alpha: 0.7 });

    if (st.choiceState === 'taken') { UI.drawTaken(ctx, game); return; }

    if (st.choiceState === 'pending') {
      // 두 동사 — K(받아넘김) / J(되받아침)
      text(ctx, '[K]', S.TEXT_X, S.CHOICE_Y, { size: 14, weight: '800', color: C.COLORS.GOLD, align: 'left', spacing: 1 });
      text(ctx, st.choice.K.text, S.TEXT_X + 44, S.CHOICE_Y, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
      text(ctx, '[J]', S.TEXT_X, S.CHOICE_Y + S.CHOICE_GAP, { size: 14, weight: '800', color: C.COLORS.PLAYER, align: 'left', spacing: 1 });
      text(ctx, st.choice.J.text, S.TEXT_X + 44, S.CHOICE_Y + S.CHOICE_GAP, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT, align: 'left' });
      return;
    }

    var speaker, body, shown;
    if (st.choiceState === 'reply') {
      speaker = b ? b.name : '';
      body = st.reply.text; shown = st.replyShown;
    } else {
      var line = st.lines[st.index];
      speaker = line.hideSpeaker ? S.UNKNOWN_SPEAKER : (b ? b.name : '');
      body = line.text; shown = st.shown;
    }
    var hidden = speaker === S.UNKNOWN_SPEAKER;
    text(ctx, speaker, S.TEXT_X, S.SPEAKER_Y,
      { size: S.SPEAKER_SIZE, weight: '800', color: hidden ? C.COLORS.TEXT_DIM : bossColor, align: 'left', spacing: 3,
        glow: hidden ? false : bossColor, blur: 8 });
    voiceText(ctx, body.substring(0, Math.floor(shown)), S.TEXT_X, S.TEXT_Y, S.TEXT_SIZE, C.COLORS.TEXT, bossColor);

    if (shown >= body.length) {
      var blink = 0.45 + 0.45 * Math.sin(game.sceneT * 5);
      text(ctx, S.PROMPT_NEXT, S.BOX_X + S.BOX_W - 18, S.BOX_Y + S.BOX_H - 16,
        { size: 10, weight: '800', color: C.COLORS.TEXT_DIM, align: 'right', spacing: 2, alpha: blink });
    }
  };

  /** 오답 카드 — 웃지 않고 덤덤하게 (바이블 §2 코미디 원리 M) */
  UI.drawTaken = function (ctx, game) {
    var st = game.story;
    var S = C.STORY;
    dim(ctx, 0.6);
    text(ctx, S.TAKEN_TEXT, V.W / 2, 200,
      { size: 60, weight: '800', color: C.COLORS.HEART, spacing: 10, glow: C.COLORS.HEART, blur: 24 });
    text(ctx, st.reply.text, V.W / 2, 262, { size: S.TEXT_SIZE, weight: '600', color: C.COLORS.TEXT });
    var blink = 0.5 + 0.5 * Math.sin(game.sceneT * 4);
    text(ctx, 'ENTER', V.W / 2, 330, { size: 14, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

  /* =========================================================================
   * INTERLUDE — 챕터 카드 (스펙 §2.6)
   * ====================================================================== */
  UI.drawInterlude = function (ctx, game) {
    dim(ctx, 0.72);
    var t = game.sceneT;
    var ch = game.chapterOf(game.bossIndex);
    var next = game.chapterOf(game.bossIndex + 1);
    if (!ch) return;
    var rows = game.chapterResults(ch);

    text(ctx, ch.name, V.W / 2, 120,
      { size: 40, weight: '800', color: C.COLORS.WHITE, spacing: 8, glow: C.COLORS.GOLD, blur: 22 });
    text(ctx, ch.subtitle, V.W / 2, 158, { size: 15, weight: '600', color: C.COLORS.GOLD, spacing: 4 });

    var y = 214, total = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      total += r.time;
      text(ctx, r.name, V.W / 2 - 180, y + i * 28, { size: 15, weight: '700', color: C.COLORS.TEXT, align: 'left', spacing: 2 });
      text(ctx, fmtTime(r.time), V.W / 2 + 60, y + i * 28, { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right', family: C.FONT.MONO });
      text(ctx, r.tries + ' ' + C.TRIES.UNIT, V.W / 2 + 110, y + i * 28, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, r.rank, V.W / 2 + 150, y + i * 28, { size: 19, weight: '800', color: rankColor(r.rank), align: 'left', glow: rankColor(r.rank), blur: 10 });
    }
    var cr = game.chapterRank(ch);
    var k = clamp((t - 0.25) / C.RANK.CARD_SCALE_TIME, 0, 1);
    var sc = k < 1 ? lerp(2.6, 1, k * k) : 1;
    text(ctx, cr, V.W / 2, 388,
      { size: Math.round(56 * sc), weight: '800', color: rankColor(cr), glow: rankColor(cr), blur: 26, alpha: clamp(k * 1.6, 0, 1) });
    text(ctx, 'CHAPTER RANK   ·   ' + fmtTime(total), V.W / 2, 424,
      { size: 10, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: k });

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, 'ENTER  —  ' + (next ? next.name : 'CONTINUE'), V.W / 2, V.H - 24,
      { size: 15, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

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
    text(ctx, (r.boss || '') + (game.hard ? '  ·  ' + C.HARD.NAME : ''), V.W / 2, y + 66,
      { size: 13, weight: '700', color: game.hard ? C.COLORS.GOLD : C.COLORS.TEXT_DIM, spacing: 3 });

    // 기록은 하드/일반이 각각 따로다 — 보이는 최고 기록도 이번 런의 것만 본다
    var best = r.key ? game.records().bestTries[r.key] : null;
    var rows = [
      ['TIME', fmtTime(r.time) + '   (par ' + r.par + 's)'],
      ['HITS TAKEN', String(r.hits)],
      ['PERFECT PARRIES', String(r.perfects)],
      [C.TRIES.LABEL, String(r.tries) + (best && best < r.tries ? '   (' + C.TRIES.BEST + ' ' + best + ')' : '')]
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
      // 하드 판 랭크에는 + 배지를 붙여 일반 기록과 섞이지 않는다는 것을 보인다
      text(ctx, (r.rank || 'C') + (game.hard ? C.HARD.BADGE : ''), V.W / 2, y + 238,
        { size: Math.round(58 * sc), weight: '800', color: col, glow: col, blur: 26, alpha: clamp(k * 1.6, 0, 1) });
      text(ctx, 'RANK', V.W / 2, y + 271,
        { size: 10, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: k });
    }

    if (game.assistOn()) {
      text(ctx, C.MENU.ASSIST_BADGE, V.W / 2, y + L.CARD_H - 12,
        { size: 10, weight: '800', color: C.COLORS.GOLD, spacing: 3 });
    }

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, game.bossIndex + 1 >= game.defs.length ? 'ENTER  —  ENDING' : 'ENTER  —  NEXT BOSS',
      V.W / 2, y + L.CARD_H + 30,
      { size: 15, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

  /** 무엇에 죽었는지 → 다음 판에 무엇을 눌러야 하는지 (텔 색이 곧 정답) */
  function defeatHint(src) {
    if (!src) return null;
    if (src.kind === 'zone') return C.DEFEAT.HINT_ZONE;
    return src.tell === 'gold' ? C.DEFEAT.HINT_GOLD : C.DEFEAT.HINT_RED;
  }

  UI.drawDefeat = function (ctx, game) {
    dim(ctx, 0.68);
    var t = game.sceneT;
    var r = game.result || {};
    text(ctx, 'DEFEAT', V.W / 2, 196,
      { size: 60, weight: '800', color: C.COLORS.HEART, spacing: 10, glow: C.COLORS.HEART, blur: 24 });
    text(ctx, (r.boss || '') + '  ·  ' + fmtTime(r.time) + '  ·  ' + (r.perfects || 0) + ' PERFECT' +
      '  ·  ' + C.TRIES.TRY + ' ' + (r.tries || 0),
      V.W / 2, 244, { size: 14, weight: '600', color: C.COLORS.TEXT_DIM, spacing: 2 });

    /* 죽인 공격 + 그 텔 색의 정답을 가르친다 */
    var src = r.slainBy;
    var hint = defeatHint(src);
    if (src && hint) {
      var tellCol = (src.kind === 'zone' || src.tell === 'red') ? C.COLORS.RED : C.COLORS.GOLD;
      text(ctx, C.DEFEAT.SLAIN_BY + (src.label || '?'), V.W / 2, 288,
        { size: 20, weight: '800', color: tellCol, spacing: 3, glow: tellCol, blur: 14 });
      text(ctx, hint, V.W / 2, 316,
        { size: 14, weight: '600', color: C.COLORS.TEXT });
    } else {
      text(ctx, 'Nothing is given. Everything is taken.', V.W / 2, 300,
        { size: 14, weight: '600', color: C.COLORS.TEXT_DIM });
    }

    /* 이 보스의 저장된 최고 랭크 */
    var best = r.key ? game.records().ranks[r.key] : null;
    if (best) {
      text(ctx, 'BEST RANK  ' + best + (game.hard ? C.HARD.BADGE : ''), V.W / 2, 344,
        { size: 12, weight: '700', color: rankColor(best), spacing: 2 });
    }

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, 'R  —  RETRY', V.W / 2, 392,
      { size: 22, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
    text(ctx, 'ESC  —  TITLE', V.W / 2, 424,
      { size: 14, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2 });
  };

  /** 엔딩 — 태그라인 3박 + 8보스 결과 + 종합 랭크 + 손패가 한 칸씩 비어 간다 (스펙 §10) */
  UI.drawEnding = function (ctx, game) {
    dim(ctx, 0.72);
    var t = game.sceneT;
    var run = game.run;
    var E = C.ENDING;

    for (var li = 0; li < E.LINES.length; li++) {
      var last = li === E.LINES.length - 1;
      text(ctx, E.LINES[li], V.W / 2, E.LINE_Y[li],
        { size: last ? 26 : 20, weight: '800', color: last ? C.COLORS.GOLD : C.COLORS.WHITE, spacing: 6,
          glow: last ? C.COLORS.GOLD : false, blur: 18, alpha: clamp((t - li * 0.5) / 0.4, 0, 1) });
    }

    var y = E.ROWS_Y;
    for (var i = 0; i < run.bosses.length; i++) {
      var b = run.bosses[i];
      text(ctx, b.name, V.W / 2 - 200, y + i * E.ROW_H, { size: 13, weight: '700', color: C.COLORS.TEXT, align: 'left', spacing: 2 });
      text(ctx, fmtTime(b.time), V.W / 2 + 20, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right', family: C.FONT.MONO });
      text(ctx, b.hits + ' hit', V.W / 2 + 65, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.perfects + ' perfect', V.W / 2 + 150, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.tries + ' ' + C.TRIES.UNIT, V.W / 2 + 215, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.rank, V.W / 2 + 250, y + i * E.ROW_H, { size: 16, weight: '800', color: rankColor(b.rank), align: 'left', glow: rankColor(b.rank), blur: 10 });
    }

    var ty = y + run.bosses.length * E.ROW_H + 18;
    text(ctx, 'TOTAL  ' + fmtTime(run.time) + '   ·   ' + run.hits + ' HITS   ·   ' + run.perfects + ' PERFECT',
      V.W / 2, ty, { size: 13, weight: '700', color: C.COLORS.TEXT, spacing: 1 });

    var ov = game.overallRank();
    var k = clamp((t - 0.25) / C.RANK.CARD_SCALE_TIME, 0, 1);
    var sc = k < 1 ? lerp(2.8, 1, k * k) : 1;
    text(ctx, ov + (game.hard ? C.HARD.BADGE : ''), V.W / 2 + 300, ty - 4,
      { size: Math.round(54 * sc), weight: '800', color: rankColor(ov), glow: rankColor(ov), blur: 28, alpha: clamp(k * 1.6, 0, 1) });
    text(ctx, 'OVERALL', V.W / 2 + 300, ty + 30, { size: 9, weight: '800', color: C.COLORS.TEXT_DIM, spacing: 4, alpha: k });

    // 손패 3칸이 ENDING_SLOT_DROP 간격으로 앞에서부터 비어 간다 — "Nothing is kept."
    var labels = game.endingHand || [];
    var dropped = Math.floor(Math.max(0, t - 1.0) / C.STORY.ENDING_SLOT_DROP);
    var n = C.HAND.SIZE;
    var totalW = n * C.HAND.SLOT_W + (n - 1) * C.HAND.SLOT_GAP;
    var sx = (V.W - totalW) / 2;
    for (var s = 0; s < n; s++) {
      var x = sx + s * (C.HAND.SLOT_W + C.HAND.SLOT_GAP);
      var keep = s >= dropped && labels[s];
      ctx.save();
      ctx.fillStyle = 'rgba(12,16,26,0.72)';
      ctx.fillRect(x, E.SLOTS_Y, C.HAND.SLOT_W, C.HAND.SLOT_H);
      ctx.strokeStyle = keep ? 'rgba(230,235,245,0.35)' : 'rgba(120,130,150,0.20)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, E.SLOTS_Y + 0.5, C.HAND.SLOT_W - 1, C.HAND.SLOT_H - 1);
      ctx.restore();
      text(ctx, keep ? labels[s] : '—', x + C.HAND.SLOT_W / 2, E.SLOTS_Y + C.HAND.SLOT_H / 2,
        { size: keep ? 13 : 14, weight: keep ? '800' : '600', color: keep ? C.COLORS.TEXT : 'rgba(120,130,150,0.35)', spacing: keep ? 1 : 0 });
    }

    var blink = 0.5 + 0.5 * Math.sin(t * 4);
    text(ctx, 'ENTER  —  TITLE', V.W / 2, V.H - 24,
      { size: 15, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 3 });
  };

  /* ---- 개발용 (스펙 §5.5) — dev 모드 배지 + 상태 오버레이 --------------- */

  /** 우상단 DEV 배지 — game.dev 인 동안 장면과 무관하게 그린다 */
  UI.drawDevBadge = function (ctx, game) {
    text(ctx, C.DEV.BADGE, C.DEV.BADGE_X, C.DEV.BADGE_Y,
      { size: 13, weight: '800', color: C.COLORS.RED, align: 'right', baseline: 'top',
        spacing: 2, glow: C.COLORS.RED, blur: 8 });
  };

  /** F1 오버레이 — 보스/HP/스태미너/페이즈/시드를 한 줄씩. 전투 중(보스 존재)에만 의미가 있다 */
  UI.drawDevOverlay = function (ctx, game) {
    var b = game.boss;
    if (!b) return;
    var p = game.player;
    var lines = [
      'BOSS   ' + b.name + '  (#' + (game.bossIndex + 1) + ')',
      'HP     ' + Math.ceil(b.hp) + ' / ' + b.maxHp,
      'STAM   ' + Math.ceil(p.stamina) + ' / ' + C.STAMINA.MAX,
      'PHASE  ' + b.phase,
      'SEED   ' + game.seed
    ];
    for (var i = 0; i < lines.length; i++) {
      text(ctx, lines[i], 16, 60 + i * 18,
        { size: 12, weight: '700', color: C.COLORS.TEXT, align: 'left', family: C.FONT.MONO });
    }
  };

  UI.text = text;
  UI.fmtTime = fmtTime;
  global.UI = UI;
})(window);
