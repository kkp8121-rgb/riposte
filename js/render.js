/* =============================================================================
 * RIPOSTE — js/render.js
 * 아레나(패럴랙스 기둥 · 바닥 반사) · 벡터 실루엣 캐릭터(절차 애니메이션) ·
 * 텔 플래시 · 투사체 · 존 (스펙 §4)
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;
  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* 실루엣 체형 표 — 보스마다 명확히 다른 실루엣 (스펙 §4) */
  var BUILD = {
    player:  { h: 76,  w: 15, head: 0.085, hood: false, weapon: 'none',   thick: 7 },
    mirror:  { h: 76,  w: 15, head: 0.085, hood: false, weapon: 'none',   thick: 7 },
    rapier:  { h: 84,  w: 13, head: 0.078, hood: false, weapon: 'rapier', thick: 6 },
    bow:     { h: 84,  w: 16, head: 0.095, hood: true,  weapon: 'bow',    thick: 7 },
    hammer:  { h: 98,  w: 27, head: 0.090, hood: false, weapon: 'hammer', thick: 12 },
    /* 챕터 2 재설계 (스펙 §3.5~3.8) — 보스마다 고유 실루엣 (차별화 원칙) */
    lantern: { h: 82,  w: 13, head: 0.080, hood: true,  weapon: 'dagger', thick: 6 },
    twin:    { h: 84,  w: 12, head: 0.078, hood: false, weapon: 'twin',   thick: 5 },
    shield:  { h: 96,  w: 30, head: 0.088, hood: false, weapon: 'shield', thick: 13 },
    taker:   { h: 90,  w: 17, head: 0.084, hood: true,  weapon: 'none',   thick: 8 },
    /* 챕터 3 (스펙 §2.1) — 움직이지 않는 파수꾼. 키가 크고 창이 길다 */
    spear:   { h: 104, w: 18, head: 0.075, hood: false, weapon: 'spear',  thick: 9 },
    /* 챕터 3 (스펙 §2.2) — 던지는 자. 무기 없이 어깨가 넓고 머리가 작다 */
    storm:   { h: 88,  w: 26, head: 0.066, hood: false, weapon: 'none',   thick: 11 },
    /* 챕터 3 (스펙 §2.3) — 빈 것. 무기 없이 키만 크고 몹시 가늘다. 머리가 가장 작다 */
    hollow:  { h: 98,  w: 12, head: 0.060, hood: false, weapon: 'none',   thick: 5 },
    /* 챕터 3 (스펙 §2.4) — 최종 보스. 가장 크고 가장 두껍다. 대검 하나 */
    adamant: { h: 116, w: 36, head: 0.082, hood: false, weapon: 'great',  thick: 15 }
  };

  /* 포즈별 무기팔 각도(rad). 0 = 정면(facing 방향), 음수 = 위. */
  var POSE_ARM = {
    idle:    -0.35,
    walk:    -0.30,
    windup:  -2.30,
    hold:    -2.05,
    active:   0.05,
    recover: -0.75,
    parry:   -1.25,
    dash:    -1.90,
    stagger: -0.10,
    roar:    -1.95,
    dead:     0.30
  };

  /* 무기 길이 (실루엣 기준 비율) — 텔 버스트를 무기 "끝"에 정확히 찍기 위해 필요 */
  var WEAPON_LEN = {
    none: 0.10, rapier: 0.62, blade: 0.50, hammer: 0.52, bow: 0.26, spear: 0.66,
    dagger: 0.28, twin: 0.30, shield: 0.26, great: 0.58
  };

  var Render = {};

  /* ---- 고정 그라디언트 캐시 -----------------------------------------------
   * createLinearGradient 는 프레임마다 새로 만들 이유가 없다 (좌표가 고정).
   * 한 번 만들어 재사용한다 — HP 바만 보스 색이 바뀔 때 다시 만든다.
   * ---------------------------------------------------------------------- */
  var GRAD = {};
  function gradient(ctx, key, x0, y0, x1, y1, stops) {
    var g = GRAD[key];
    if (g) return g;
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    GRAD[key] = g;
    return g;
  }

  /**
   * 특정 포즈에서 무기 끝의 로컬 좌표 (발밑 원점, y 는 위가 음수).
   * boss.js 가 텔 플래시 위치를 잡을 때 쓴다 — 그림과 완전히 같은 식.
   */
  Render.tipOf = function (buildKey, facing, poseName, weaponKind) {
    var b = BUILD[buildKey] || BUILD.player;
    var f = facing >= 0 ? 1 : -1;
    var h = b.h, w = b.w;
    var armA = POSE_ARM[poseName] === undefined ? POSE_ARM.idle : POSE_ARM[poseName];
    var armLen = h * 0.30;
    var shY = -h * 0.82;
    var handX = f * w * 0.22 + Math.cos(armA) * armLen * f;
    var handY = shY + Math.sin(armA) * armLen;
    var wl = h * (WEAPON_LEN[weaponKind || b.weapon] === undefined ? 0.1 : WEAPON_LEN[weaponKind || b.weapon]);
    return { x: handX + Math.cos(armA) * wl * f, y: handY + Math.sin(armA) * wl };
  };

  /* ---- 배경 생성 (아레나별 고정 레이아웃) ----------------------------------
   * C.ARENA 테이블이 색·개수·간격·시차 계수를 전부 소유한다. 여기서는 표를 읽어
   * 배치를 한 번 만들어 캐시할 뿐이다 (도형 종류·렌더 패스는 아레나마다 같다).
   * ---------------------------------------------------------------------- */
  var SCENES = {};

  function arenaKey(id) { return (id && C.ARENA[id] && id !== 'DEFAULT') ? id : C.ARENA.DEFAULT; }

  /** 아레나 배치를 만들어 캐시하고 돌려준다 (id 당 1회 생성) */
  Render.initScene = function (id) {
    var key = arenaKey(id);
    if (SCENES[key]) return SCENES[key];
    var A = C.ARENA, a = A[key];
    var r = new RNG(A.SEED);
    var far = [], near = [];
    var i, x;
    for (x = -a.farStep; x < V.W + a.farStep * 2; x += a.farStep) {
      far.push({ x: x + r.range(-a.farJitter, a.farJitter), w: r.range(a.farW[0], a.farW[1]), h: r.range(a.farH[0], a.farH[1]) });
    }
    for (x = -a.nearStep; x < V.W + a.nearStep * 2; x += a.nearStep) {
      near.push({ x: x + r.range(-a.nearJitter, a.nearJitter), w: r.range(a.nearW[0], a.nearW[1]), h: r.range(a.nearH[0], a.nearH[1]) });
    }
    var st = [];
    for (i = 0; i < a.stars; i++) {
      st.push({ x: r.range(0, V.W), y: r.range(A.STAR_Y[0], V.HORIZON_Y - A.STAR_Y[1]),
                a: r.range(a.starAlpha[0], a.starAlpha[1]), s: r.range(A.STAR_SIZE[0], A.STAR_SIZE[1]) });
    }
    SCENES[key] = { id: key, def: a, pillars: { far: far, near: near }, stars: st };
    return SCENES[key];
  };

  /* ---- 아레나 ------------------------------------------------------------- */

  /* 기둥 그리기 — 프레임마다 클로저를 새로 만들지 않도록 모듈 스코프에 둔다 */
  function drawPillars(ctx, list, off, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (var k = 0; k < list.length; k++) {
      var p = list[k];
      var px = p.x - off;
      ctx.fillRect(px, V.FLOOR_Y - p.h, p.w, p.h);
      // 기둥 상단 캡
      ctx.fillRect(px - 5, V.FLOOR_Y - p.h - 8, p.w + 10, 8);
    }
    ctx.restore();
  }

  var STAR_COLOR = '#9fb3d9';
  var ARENA_EDGES = [V.MIN_X, V.MAX_X];      // 프레임마다 배열을 새로 만들지 않는다

  function drawBackground(ctx, camX, sc) {
    var a = sc.def;
    ctx.fillStyle = gradient(ctx, 'bg:' + sc.id, 0, 0, 0, V.FLOOR_Y, [
      [0, a.bg[0]], [a.bgMid, a.bg[1]], [1, a.bg[2]]
    ]);
    ctx.fillRect(0, 0, V.W, V.FLOOR_Y);

    // 먼 입자
    var i, s;
    ctx.save();
    ctx.fillStyle = STAR_COLOR;
    for (i = 0; i < sc.stars.length; i++) {
      s = sc.stars[i];
      ctx.globalAlpha = s.a;
      ctx.fillRect(s.x - camX * 0.02, s.y, s.s, s.s);
    }
    ctx.restore();

    // 패럴랙스 기둥 2층
    drawPillars(ctx, sc.pillars.far, camX * a.farPar, a.farColor, a.farAlpha);
    drawPillars(ctx, sc.pillars.near, camX * a.nearPar, a.nearColor, a.nearAlpha);
  }

  function drawFloor(ctx, sc) {
    var a = sc.def;
    ctx.fillStyle = a.floor;
    ctx.fillRect(0, V.FLOOR_Y, V.W, V.H - V.FLOOR_Y);

    // 바닥 반사 그라디언트
    ctx.fillStyle = gradient(ctx, 'floor:' + sc.id, 0, V.FLOOR_Y, 0, V.H, [
      [0, a.reflect],
      [0.45, 'rgba(10,13,22,0.0)'],
      [1, 'rgba(6,8,14,0.55)']
    ]);
    ctx.fillRect(0, V.FLOOR_Y, V.W, V.H - V.FLOOR_Y);

    ctx.strokeStyle = a.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, V.FLOOR_Y + 0.5);
    ctx.lineTo(V.W, V.FLOOR_Y + 0.5);
    ctx.stroke();

    // 아레나 경계 표시
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = a.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < ARENA_EDGES.length; i++) {
      ctx.moveTo(ARENA_EDGES[i], V.FLOOR_Y - 14);
      ctx.lineTo(ARENA_EDGES[i], V.FLOOR_Y + 14);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---- 캐릭터 실루엣 ------------------------------------------------------ */

  /**
   * 벡터 실루엣 + 절차 애니메이션.
   * o = { x, facing, color, build, t, pose, poseP, vx, moving, alpha, flash, scale, weaponOverride }
   */
  function drawFighter(ctx, o) {
    var b = BUILD[o.build] || BUILD.player;
    var h = b.h * (o.scale || 1);
    var w = b.w * (o.scale || 1);
    var f = o.facing >= 0 ? 1 : -1;
    var pose = o.pose || 'idle';

    var moving = !!o.moving;
    var breath = Math.sin(o.t * C.PLAYER.BREATH_RATE) * C.PLAYER.BREATH_AMP * (moving ? 0.35 : 1);
    var lean = clamp((o.vx || 0) / C.PLAYER.SPEED, -1, 1) * C.PLAYER.LEAN_MAX;
    if (pose === 'stagger') lean = -f * 0.22;
    if (pose === 'dead') lean = -f * 0.5;

    var stride = moving ? Math.sin(o.t * 9.5) : 0;
    var hipY = -h * 0.45 - breath * 0.4;
    var shY = -h * 0.82 - breath;
    var headY = -h * 0.93 - breath;
    var headR = h * b.head;

    // 접지 그림자 — 캐릭터를 바닥에 붙여준다
    if (!o.noShadow) {
      ctx.save();
      ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * 0.35;
      ctx.fillStyle = '#04060c';
      ctx.beginPath();
      ctx.ellipse(o.x, V.FLOOR_Y + 2, w * 1.5, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(o.x, V.FLOOR_Y);
    ctx.rotate(lean);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;

    var col = o.color;
    var flash = o.flash || 0;
    var bodyCol = flash > 0 ? C.COLORS.WHITE : col;

    ctx.strokeStyle = bodyCol;
    ctx.fillStyle = bodyCol;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 글로우 — 바닥 반사 패스(noShadow)에서는 끈다 (같은 실루엣을 두 번 blur 하지 않는다)
    ctx.shadowColor = bodyCol;
    ctx.shadowBlur = o.noShadow ? 0 : (flash > 0 ? 26 : 12);

    /* 다리 */
    ctx.lineWidth = Math.max(3, b.thick * 0.62);
    var legSwing = stride * w * 1.5;
    leg(f * (w * 0.55) + legSwing, f * (w * 0.95) + legSwing * 1.4);
    leg(-f * (w * 0.45) - legSwing, -f * (w * 0.85) - legSwing * 1.4);
    function leg(kneeX, footX) {
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.quadraticCurveTo(kneeX, hipY * 0.45, footX, -Math.abs(stride) * 3);
      ctx.stroke();
    }

    /* 몸통 */
    ctx.lineWidth = b.thick;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(f * w * 0.12, shY);
    ctx.stroke();

    // 어깨 라인
    ctx.lineWidth = Math.max(3, b.thick * 0.7);
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, shY + 2);
    ctx.lineTo(w * 0.55, shY - 2);
    ctx.stroke();

    /* 머리 (후드면 각진 실루엣) */
    var hx = f * w * 0.18;
    if (b.hood) {
      ctx.beginPath();
      ctx.moveTo(hx - f * headR * 1.1, headY + headR * 0.9);
      ctx.lineTo(hx - f * headR * 0.5, headY - headR * 1.3);
      ctx.lineTo(hx + f * headR * 1.4, headY + headR * 0.2);
      ctx.lineTo(hx + f * headR * 0.6, headY + headR * 1.0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(hx, headY, headR, 0, TAU);
      ctx.fill();
    }

    /* 팔 + 무기 */
    var baseA = POSE_ARM[pose] === undefined ? POSE_ARM.idle : POSE_ARM[pose];
    var p = o.poseP === undefined ? 0 : o.poseP;
    var armA = baseA;
    if (pose === 'windup') armA = lerp(POSE_ARM.windup, POSE_ARM.hold, p);
    if (pose === 'active') armA = lerp(POSE_ARM.hold, POSE_ARM.active, Math.min(1, p * 2.4));

    var armLen = h * 0.30;
    var shoulderX = f * w * 0.22;
    var handX = shoulderX + Math.cos(armA) * armLen * f;
    var handY = shY + Math.sin(armA) * armLen;

    // 뒷팔
    ctx.lineWidth = Math.max(3, b.thick * 0.55);
    ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * 0.65;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shY);
    ctx.quadraticCurveTo(-f * w * 0.5, shY + armLen * 0.55, -f * w * 0.75, shY + armLen * 0.9);
    ctx.stroke();
    ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha);

    // 앞팔
    ctx.lineWidth = Math.max(3, b.thick * 0.62);
    ctx.beginPath();
    ctx.moveTo(shoulderX, shY);
    ctx.quadraticCurveTo(shoulderX + Math.cos(armA - 0.5) * armLen * 0.55 * f,
                         shY + Math.sin(armA - 0.5) * armLen * 0.55,
                         handX, handY);
    ctx.stroke();

    // 패리 자세면 반대팔도 앞으로 올린다
    if (pose === 'parry') {
      ctx.beginPath();
      ctx.moveTo(shoulderX, shY);
      ctx.quadraticCurveTo(f * w * 0.9, shY - armLen * 0.2, f * w * 1.5, shY - armLen * 0.55);
      ctx.stroke();
    }

    /* 무기 */
    var weapon = o.weaponOverride || b.weapon;
    drawWeapon(ctx, weapon, handX, handY, armA, f, h, bodyCol, pose, p);

    ctx.restore();
  }

  function drawWeapon(ctx, kind, hx, hy, angle, f, h, color, pose, p) {
    if (kind === 'none') return;
    ctx.save();
    ctx.translate(hx, hy);
    // scale → rotate 순서여야 손 방향 벡터 (cos*f, sin) 와 일치한다
    ctx.scale(f, 1);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';

    switch (kind) {
      case 'rapier':
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(h * 0.62, 0); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(2, 7); ctx.stroke();
        break;
      case 'blade':
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(h * 0.30, -h * 0.10, h * 0.50, -h * 0.02);
        ctx.stroke();
        break;
      case 'hammer':
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(h * 0.44, 0); ctx.stroke();
        ctx.fillRect(h * 0.40, -h * 0.15, h * 0.17, h * 0.30);
        break;
      case 'bow':
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(h * 0.12, 0, h * 0.26, -1.15, 1.15);
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(h * 0.12 + Math.cos(-1.15) * h * 0.26, Math.sin(-1.15) * h * 0.26);
        ctx.lineTo(h * 0.12 + Math.cos(1.15) * h * 0.26, Math.sin(1.15) * h * 0.26);
        ctx.stroke();
        break;
      case 'spear':
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(h * 0.66, 0); ctx.stroke();
        break;
      case 'great':                                    // ADAMANT — 넓은 대검 + 긴 크로스가드
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(h * 0.58, 0); ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(4, -13); ctx.lineTo(4, 13); ctx.stroke();
        break;
      case 'dagger':                                   // LANTERN — 단검 + 등불
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(h * 0.28, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-h * 0.12, h * 0.10, h * 0.06, 0, TAU); ctx.fill();
        break;
      case 'twin':                                     // CHORUS — 단검 두 자루
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(h * 0.30, -9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(h * 0.30, 9); ctx.stroke();
        break;
      case 'shield':                                   // BASTION — 방패 + 짧은 철퇴
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(h * 0.26, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(h * 0.26, 0, h * 0.05, 0, TAU); ctx.fill();
        ctx.fillRect(-h * 0.06, -h * 0.22, h * 0.10, h * 0.44);
        break;
    }
    ctx.restore();
  }

  /* 스윙 종류별 궤적 파라미터 — 찌르기와 베기가 확실히 달라 보이도록 */
  var SWING = {
    thrust: { from: -0.25, to: 0.05 },
    arc:    { from: -1.95, to: 0.55 },
    slam:   { from: -2.25, to: -0.05 }
  };
  var SWING_BY_KIND = { lunge: 'thrust', slash: 'arc', slam: 'slam', shot: 'arc' };

  /**
   * 무기 호 궤적 글로우 (active 중).
   * thrust 는 호 대신 직선 랜스로 그린다.
   */
  function drawSwing(ctx, x, faceDir, h, color, kind, reach, k, alpha) {
    var sw = SWING[kind] || SWING.arc;
    var radius = Math.min(reach, 220) * (kind === 'slam' ? 0.52 : 0.58);
    ctx.save();
    ctx.translate(x, V.FLOOR_Y - h * 0.82);
    ctx.scale(faceDir, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    if (kind === 'thrust') {
      var len = Math.min(reach, 240) * Math.min(1, k * 1.8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, h * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(len, h * 0.04, 6, 0, TAU);
      ctx.fill();
    } else {
      var a1 = sw.from + (sw.to - sw.from) * Math.min(1, k * 1.15);
      // 스윕 궤적
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, sw.from, a1);
      ctx.stroke();
      // 궤적을 어깨에 붙여주는 "칼날" 선 — 공중에 뜬 초승달로 보이지 않게 한다
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a1) * radius * 0.12, Math.sin(a1) * radius * 0.12);
      ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      if (kind === 'slam' && k > 0.55) {
        // 지면 충격 라인
        ctx.globalAlpha = alpha * (1 - (k - 0.55) / 0.45);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.82);
        ctx.lineTo(Math.min(reach, 240), h * 0.82);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- 캐릭터 상태 → 포즈 ------------------------------------------------- */

  function playerPose(p) {
    if (p.hp <= 0) return { pose: 'dead', p: 0 };
    if (p.dashT > 0) return { pose: 'dash', p: 1 - p.dashT / C.DASH.DURATION };
    if (p.riposte) {
      var rp = p.riposte;
      if (rp.stage === 'startup') return { pose: 'windup', p: 1 - rp.t / rp.k.startup };
      if (rp.stage === 'active') return { pose: 'active', p: 1 - rp.t / rp.k.active };
      return { pose: 'recover', p: 1 - rp.t / rp.k.recover };
    }
    if (p.parryPose > 0) return { pose: 'parry', p: 1 - p.parryPose / C.PARRY.POSE_TIME };
    if (Math.abs(p.vx) > 20) return { pose: 'walk', p: 0 };
    return { pose: 'idle', p: 0 };
  }

  function bossPose(b) {
    if (b.dead) return { pose: 'dead', p: 0 };
    if (b.state === 'roar') return { pose: 'roar', p: 0 };
    if (b.state === 'stagger') return { pose: 'stagger', p: 0 };
    if (b.state === 'charging') return { pose: 'active', p: 1 };
    if (b.attack) {
      var a = b.attack;
      if (a.stage === 'windup') return { pose: 'windup', p: 1 - a.t / a.windupTotal };
      if (a.stage === 'active') return { pose: 'active', p: 1 - a.t / Math.max(0.01, a.def.active) };
      return { pose: 'recover', p: 1 - a.t / Math.max(0.01, a.def.recover) };
    }
    if (Math.abs(b.vx) > 20) return { pose: 'walk', p: 0 };
    return { pose: 'idle', p: 0 };
  }

  /** 플레이어가 리포스트 중이면 훔친 무기를 손에 들고 있는 것으로 그린다 */
  function playerWeapon(p) {
    if (!p.riposte) return 'none';
    switch (p.riposte.kind) {
      case 'lunge': return 'rapier';
      case 'slash': return 'blade';
      case 'shot':  return 'bow';
      case 'slam':  return 'hammer';
    }
    return 'none';
  }

  /* ---- 투사체 / 존 -------------------------------------------------------- */

  function drawProjectile(ctx, pr) {
    var col = pr.owner === 'player' ? C.COLORS.PLAYER
            : (pr.tell === 'red' ? C.COLORS.RED : C.COLORS.GOLD);
    var dir = pr.vx >= 0 ? 1 : -1;

    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;

    // 트레일
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = pr.r * 0.7;
    ctx.beginPath();
    for (var i = 0; i < pr.trail.length; i++) {
      if (i === 0) ctx.moveTo(pr.trail[i], pr.y); else ctx.lineTo(pr.trail[i], pr.y);
    }
    if (pr.trail.length) { ctx.lineTo(pr.x, pr.y); ctx.stroke(); }
    ctx.globalAlpha = 1;

    if (pr.shape === 'wave') {
      // 지면 충격파 — 반원 리플
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pr.x, V.FLOOR_Y, pr.r * 1.9, Math.PI, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(pr.x, V.FLOOR_Y, pr.r * 3.1, Math.PI, TAU);
      ctx.stroke();
    } else if (pr.shape === 'bolt') {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.x - dir * pr.r * 3.2, pr.y);
      ctx.lineTo(pr.x + dir * pr.r * 1.6, pr.y);
      ctx.stroke();
    } else {
      // 화살 — 길쭉한 다이아
      ctx.beginPath();
      ctx.moveTo(pr.x + dir * pr.r * 2.0, pr.y);
      ctx.lineTo(pr.x, pr.y - pr.r * 0.7);
      ctx.lineTo(pr.x - dir * pr.r * 2.0, pr.y);
      ctx.lineTo(pr.x, pr.y + pr.r * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawZone(ctx, z) {
    var x0 = z.x - z.w / 2;
    ctx.save();
    if (!z.struck) {
      // 지속 구역(everStruck)이 재무장 대기 중일 때는 최초 낙하 delay 가 아니라
      // LINGER_TICK 을 기준으로 게이지를 채운다 — 그래야 "다음 타격까지"가 맞게 보인다.
      var cycle = z.everStruck ? C.ZONE.LINGER_TICK : z.delay;
      var prog = 1 - clamp(z.t / cycle, 0, 1);
      // 바닥 경고 스트립
      ctx.globalAlpha = 0.30 + 0.35 * Math.abs(Math.sin(prog * 14));
      ctx.fillStyle = C.COLORS.RED;
      ctx.fillRect(x0, V.FLOOR_Y - C.ZONE.STRIP_H, z.w, C.ZONE.STRIP_H);
      // 채워지는 게이지
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, V.FLOOR_Y - C.ZONE.STRIP_H, z.w * prog, C.ZONE.STRIP_H);
      // 위쪽 예고 기둥
      ctx.globalAlpha = C.ZONE.COLUMN_ALPHA * (0.4 + prog * 0.6);
      ctx.fillStyle = gradient(ctx, 'zone', 0, V.FLOOR_Y - 240, 0, V.FLOOR_Y, [
        [0, 'rgba(255,59,59,0)'], [1, 'rgba(255,59,59,0.9)']
      ]);
      ctx.fillRect(x0, V.FLOOR_Y - 240, z.w, 240);
      // 경계선
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = C.COLORS.RED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, V.FLOOR_Y - 240); ctx.lineTo(x0, V.FLOOR_Y);
      ctx.moveTo(x0 + z.w, V.FLOOR_Y - 240); ctx.lineTo(x0 + z.w, V.FLOOR_Y);
      ctx.stroke();
    } else {
      var k = clamp(z.strikeT / C.ZONE.STRIKE_TIME, 0, 1);
      ctx.globalAlpha = k;
      ctx.fillStyle = C.COLORS.RED;
      ctx.shadowColor = C.COLORS.RED;
      ctx.shadowBlur = 30;
      ctx.fillRect(x0, 0, z.w, V.FLOOR_Y);
    }
    ctx.restore();
  }

  /** 쓸기 빔 — 예고(pending) 중엔 옅은 윤곽, 움직이면 진한 띠. 앞머리 선이 오는 방향을 보여준다 */
  function drawBeam(ctx, bm) {
    var M = C.MOTION, x0 = bm.x - bm.w / 2, top = V.FLOOR_Y - M.BEAM_H;
    ctx.save();
    ctx.globalAlpha = bm.pending ? M.BEAM_WARN_ALPHA : M.BEAM_ALPHA;
    ctx.fillStyle = C.COLORS.RED;
    ctx.shadowColor = C.COLORS.RED;
    ctx.shadowBlur = bm.pending ? 0 : 24;
    ctx.fillRect(x0, top, bm.w, M.BEAM_H);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = C.COLORS.RED;
    ctx.lineWidth = 3;
    var head = bm.x + bm.dir * bm.w / 2;
    ctx.beginPath(); ctx.moveTo(head, top); ctx.lineTo(head, V.FLOOR_Y); ctx.stroke();
    ctx.restore();
  }

  /** 기둥 — 예고 중엔 바닥 스트립 + 차오르는 윤곽, 선 뒤엔 회색 기둥 */
  function drawPillar(ctx, pl) {
    var M = C.MOTION, x0 = pl.x - pl.w / 2;
    ctx.save();
    if (pl.pending) {
      var prog = 1 - clamp(pl.t / pl.delay, 0, 1);
      ctx.globalAlpha = 0.35 + 0.4 * prog;
      ctx.fillStyle = C.COLORS.RED;
      ctx.fillRect(x0, V.FLOOR_Y - C.ZONE.STRIP_H, pl.w, C.ZONE.STRIP_H);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = C.COLORS.RED;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, V.FLOOR_Y - M.PILLAR_H * prog, pl.w, M.PILLAR_H * prog);
    } else {
      ctx.globalAlpha = M.PILLAR_ALPHA;
      ctx.fillStyle = C.COLORS.GREY;
      ctx.fillRect(x0, V.FLOOR_Y - M.PILLAR_H, pl.w, M.PILLAR_H);
      ctx.strokeStyle = C.COLORS.TEXT;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, V.FLOOR_Y - M.PILLAR_H, pl.w, M.PILLAR_H);
    }
    ctx.restore();
  }

  /** 바닥 위험물 — 존·빔·기둥. 어둠이 있으면 어둠 위에서 부른다 (스펙 §2.2 어둠 규칙) */
  function drawHazards(ctx, game) {
    var i;
    for (i = 0; i < game.zones.length; i++) drawZone(ctx, game.zones[i]);
    for (i = 0; i < game.pillars.length; i++) drawPillar(ctx, game.pillars[i]);
    for (i = 0; i < game.beams.length; i++) drawBeam(ctx, game.beams[i]);
  }

  /* ---- 파티클 / 링 / 텔 버스트 -------------------------------------------- */

  function drawParticles(ctx) {
    var i, p;
    ctx.save();
    // 파티클은 shadowBlur 대신 가산 합성으로 발광시킨다 (수백 개일 때 훨씬 싸다)
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < FX.particles.length; i++) {
      p = FX.particles[i];
      var a = clamp(p.life / p.life0, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < FX.rings.length; i++) {
      var r = FX.rings[i];
      var k = 1 - r.life / r.life0;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, lerp(r.r0, r.r1, k), 0, TAU);
      ctx.stroke();
    }
    for (i = 0; i < FX.bursts.length; i++) {
      var b = FX.bursts[i];
      var t = 1 - b.life / b.life0;
      ctx.globalAlpha = (1 - t) * 0.95;
      ctx.strokeStyle = b.color;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 22;
      // 원형 버스트
      ctx.lineWidth = 3 * (1 - t);
      ctx.beginPath();
      ctx.arc(b.x, b.y, C.TELL.BURST_R * (0.3 + t * 1.5), 0, TAU);
      ctx.stroke();
      // 방사선(금) / 굵은 X자(적) — 색 없이도 형태로 구분 (접근성)
      if (b.shape === 'red') {
        ctx.lineWidth = C.TELL.RED_LINE_W * (1 - t);
        for (var k2 = 0; k2 < C.TELL.RED_RAYS; k2++) {
          var ang = Math.PI / 4 + (k2 / C.TELL.RED_RAYS) * TAU; // 45/135/225/315도 고정 — 항상 X 모양
          var r0 = C.TELL.BURST_R * (0.5 + t * 1.1);
          var r1 = r0 + C.TELL.RED_CROSS_LEN * (1 - t) * 0.9;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(ang) * r0, b.y + Math.sin(ang) * r0);
          ctx.lineTo(b.x + Math.cos(ang) * r1, b.y + Math.sin(ang) * r1);
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = 2.2 * (1 - t);
        for (var k2 = 0; k2 < b.rays; k2++) {
          var ang = b.seed + (k2 / b.rays) * TAU;
          var r0 = C.TELL.BURST_R * (0.5 + t * 1.1);
          var r1 = r0 + C.TELL.RAY_LEN * (1 - t) * 0.9;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(ang) * r0, b.y + Math.sin(ang) * r0);
          ctx.lineTo(b.x + Math.cos(ang) * r1, b.y + Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawPops(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < FX.pops.length; i++) {
      var p = FX.pops[i];
      var k = 1 - p.life / p.life0;
      var scale = k < 0.18 ? lerp(0.4, 1.15, k / 0.18) : lerp(1.15, 1, Math.min(1, (k - 0.18) / 0.2));
      var jitter = p.shake ? (Math.random() - 0.5) * 3 * (1 - k) : 0;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.font = C.font(p.weight, Math.round(p.size * scale));
      ctx.fillText(p.text, p.x + jitter, p.y - p.rise * k + jitter);
    }
    ctx.restore();
  }

  /* ---- 전체 드로우 -------------------------------------------------------- */

  /** 배경 + 바닥만 (타이틀/엔딩 배경으로도 쓴다). arenaId 를 안 주면 기본 아레나. */
  Render.drawArena = function (ctx, camX, arenaId) {
    var sc = Render.initScene(arenaId);
    drawBackground(ctx, camX || 0, sc);
    drawFloor(ctx, sc);
  };

  /** 바닥 반사는 아래로 갈수록 사라진다 (하단 HUD 와 겹치지 않게) */
  function drawReflectionFade(ctx) {
    ctx.save();
    ctx.fillStyle = gradient(ctx, 'reflect', 0, V.FLOOR_Y, 0, V.H, [
      [0, 'rgba(11,13,20,0)'],
      [0.55, 'rgba(11,13,20,0.55)'],
      [1, 'rgba(8,10,16,0.95)']
    ]);
    ctx.fillRect(0, V.FLOOR_Y, V.W, V.H - V.FLOOR_Y);
    ctx.restore();
  }

  /* ---- 타이틀 화면 ---------------------------------------------------------
   * 플레이어와 VESPER 가 아레나에서 마주 본 채 숨만 쉬고 있다.
   * 무기 끝의 금색 펄스는 "PRESS ENTER" 점멸과 같은 주기로 뛴다 —
   * 게임을 시작하기 전에 이미 텔 문법을 한 번 보여 준다.
   * ---------------------------------------------------------------------- */
  Render.drawTitleScene = function (ctx, t) {
    Render.drawArena(ctx, 0);

    var T = C.TITLE;
    var bossDef = (global.BOSSES && global.BOSSES[0]) || null;
    var bossColor = bossDef ? bossDef.color : C.COLORS.WHITE;
    var bossBuild = bossDef ? bossDef.silhouette : 'rapier';

    var px = T.PLAYER_X + Math.sin(t * T.SWAY_HZ) * T.SWAY;
    var bx = T.BOSS_X - Math.sin(t * T.SWAY_HZ * 0.8 + 1.1) * T.SWAY;

    var pOpt = {
      x: px, facing: 1, color: C.COLORS.PLAYER, build: 'player',
      t: t, pose: 'idle', poseP: 0, vx: 0, moving: false, alpha: T.ALPHA
    };
    var bOpt = {
      x: bx, facing: -1, color: bossColor, build: bossBuild,
      t: t * 0.87 + 1.4, pose: 'idle', poseP: 0, vx: 0, moving: false, alpha: T.ALPHA
    };

    // 바닥 반사 (전투 화면과 같은 처리)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, V.FLOOR_Y, V.W, V.H - V.FLOOR_Y);
    ctx.clip();
    ctx.translate(0, V.FLOOR_Y * 2);
    ctx.scale(1, -1);
    pOpt.alpha = 0.17; pOpt.noShadow = true; drawFighter(ctx, pOpt);
    bOpt.alpha = 0.17; bOpt.noShadow = true; drawFighter(ctx, bOpt);
    ctx.restore();
    drawReflectionFade(ctx);

    pOpt.alpha = T.ALPHA; pOpt.noShadow = false; drawFighter(ctx, pOpt);
    bOpt.alpha = T.ALPHA; bOpt.noShadow = false; drawFighter(ctx, bOpt);

    // 금색 텔 펄스 — 무기 끝에서 조용히 뛴다
    var pulse = 0.5 + 0.5 * Math.sin(t * T.BLINK_HZ);
    var tip = Render.tipOf(bossBuild, -1, 'idle');
    ctx.save();
    ctx.globalAlpha = 0.18 + pulse * 0.55;
    ctx.fillStyle = C.COLORS.GOLD;
    ctx.shadowColor = C.COLORS.GOLD;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(bx + tip.x, V.FLOOR_Y + tip.y, T.PULSE_R * (0.7 + pulse * 0.5), 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /* ---- 대화 장면 (스펙 §10) -----------------------------------------------
   * 아레나 위에 플레이어(좌)와 보스(우) 실루엣을 STORY.SCALE 배로 세운다.
   * 보스 알파는 game.story.bossAlpha (ADAMANT after 마지막 줄에서 0 으로 내려간다).
   * ---------------------------------------------------------------------- */
  Render.drawStoryScene = function (ctx, game) {
    var b = game.boss;
    Render.drawArena(ctx, 0, b && b.def ? b.def.arena : null);
    drawReflectionFade(ctx);
    var S = C.STORY;
    var t = game.sceneT;
    var alpha = game.story ? game.story.bossAlpha : 1;

    function bigFighter(o) {
      ctx.save();
      ctx.translate(o.x, V.FLOOR_Y);
      ctx.scale(S.SCALE, S.SCALE);
      ctx.translate(-o.x, -V.FLOOR_Y);
      drawFighter(ctx, o);
      ctx.restore();
    }

    bigFighter({
      x: S.PLAYER_X, facing: 1, color: C.COLORS.PLAYER, build: 'player',
      t: t, pose: 'idle', poseP: 0, vx: 0, moving: false, alpha: C.TITLE.ALPHA
    });
    if (b && alpha > 0) {
      bigFighter({
        x: S.BOSS_X, facing: -1, color: b.color, build: b.silhouette,
        t: t * 0.87 + 1.4, pose: 'idle', poseP: 0, vx: 0, moving: false, alpha: C.TITLE.ALPHA * alpha
      });
    }
  };

  Render.drawWorld = function (ctx, game) {
    var p = game.player;
    var b = game.boss;
    var camX = p.x - V.W / 2;

    // 아레나는 보스 정의가 고른다 (C.ARENA 테이블)
    Render.drawArena(ctx, camX, b && b.def ? b.def.arena : null);

    /* 어둠 (스펙 §2.3) — 아레나에 darkness 가 있으면 존은 어둠 위에 그린다(붉은 텔이다) */
    var dark = b && b.def && C.ARENA[b.def.arena] && C.ARENA[b.def.arena].darkness;
    var i;
    if (!dark) drawHazards(ctx, game);

    var pp = playerPose(p);
    var bp = b ? bossPose(b) : null;

    // 바닥 반사 (실루엣을 위아래로 뒤집어 옅게)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, V.FLOOR_Y, V.W, V.H - V.FLOOR_Y);
    ctx.clip();
    ctx.translate(0, V.FLOOR_Y * 2);
    ctx.scale(1, -1);
    if (b) drawBoss(ctx, b, bp, true);
    drawPlayer(ctx, p, pp, true);
    ctx.restore();

    drawReflectionFade(ctx);

    // 대시 잔상
    for (i = 0; i < FX.ghosts.length; i++) {
      var g = FX.ghosts[i];
      drawFighter(ctx, {
        x: g.x, facing: g.facing, color: g.color, build: g.build || 'player',
        t: 0, pose: g.pose || 'dash', poseP: 0.5, vx: 0, moving: false,
        alpha: (g.life / g.life0) * 0.32
      });
    }

    if (b) drawBoss(ctx, b, bp, false);
    if (b && b.wallUp()) drawWall(ctx, b);

    /* 어둠 (스펙 §2.3) — 배경·기둥·바닥·보스 몸통만 덮는다. 텔(무기 끝 글로우·궤적)·존·투사체·
       플레이어·파티클·HUD 는 전부 이 뒤에(= 어둠 위에) 그린다. 정보를 없애는 것이 아니라 채널을
       텔 하나로 줄이는 것이다. ?nofx=1 과 무관 — 판정의 일부다. */
    if (dark) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,3,7,' + (b.phase === 2 ? dark.p2 : dark.p1) + ')';
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
      drawHazards(ctx, game);
    }

    drawPlayer(ctx, p, pp, false);
    if (b) drawBossTells(ctx, b);

    for (i = 0; i < game.projectiles.length; i++) drawProjectile(ctx, game.projectiles[i]);

    drawParticles(ctx);
    drawPops(ctx);
  };

  function drawPlayer(ctx, p, pose, isReflection) {
    var alpha = 1;
    if (p.iframes > 0 && !isReflection) {
      alpha = (Math.floor(p.animT * 22) % 2) ? 0.35 : 1;
    }
    if (p.dashInvuln()) alpha *= 0.8;

    drawFighter(ctx, {
      x: p.x, facing: p.facing, color: C.COLORS.PLAYER, build: 'player',
      t: p.animT, pose: pose.pose, poseP: pose.p, vx: p.vx,
      moving: Math.abs(p.vx) > 20 && p.dashT <= 0,
      alpha: isReflection ? 0.17 : alpha,
      noShadow: isReflection,
      flash: p.parryFlash > 0 ? 1 : 0,
      weaponOverride: playerWeapon(p)
    });

    // 패리 창 표시 — 몸 앞의 반원 가드
    if (p.parryT >= 0 && !isReflection) {
      var win = p.parryWindow();
      var col = win === 'perfect' ? C.COLORS.GOLD : C.COLORS.GREY;
      var k = 1 - clamp(p.parryT / C.PARRY.BLOCK_WINDOW, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + k * 0.55;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, V.FLOOR_Y - C.PLAYER.HEIGHT * 0.5, 34,
              p.facing > 0 ? -1.2 : Math.PI - 1.2 - 0.2,
              p.facing > 0 ? 1.2 : Math.PI + 1.2 + 0.2);
      ctx.stroke();
      ctx.restore();
    }

    // 리포스트 무기 호 궤적
    if (p.riposte && p.riposte.stage === 'active' && !isReflection && p.riposte.kind !== 'shot') {
      var rp = p.riposte;
      var kk = 1 - rp.t / Math.max(0.01, rp.k.active);
      drawSwing(ctx, p.x, p.facing, C.PLAYER.HEIGHT,
        p.isEmpowered() ? C.COLORS.EMPOWER : C.COLORS.PLAYER,
        SWING_BY_KIND[rp.kind] || 'arc', rp.k.reach, kk, 0.8);
    }
  }

  function drawBoss(ctx, b, pose, isReflection) {
    var alpha = 1;
    if (b.invuln > 0 && !isReflection) alpha = (Math.floor(b.animT * 18) % 2) ? 0.5 : 1;
    if (b.dead) alpha *= 0.5;

    drawFighter(ctx, {
      x: b.x, facing: b.facing, color: b.color, build: b.silhouette,
      t: b.animT, pose: pose.pose, poseP: pose.p, vx: b.vx,
      moving: Math.abs(b.vx) > 20,
      alpha: isReflection ? 0.17 : alpha,
      noShadow: isReflection,
      flash: b.hurtFlash > 0 ? 1 : 0
    });

    // charge 중 잔상 (몸통과 함께 어두워진다)
    if (b.state === 'charging' && !isReflection) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.chargeDir * 90, V.FLOOR_Y - C.BOSS.HEIGHT, 90, C.BOSS.HEIGHT);
      ctx.restore();
    }
  }

  /** 엔진 방벽 (스펙 §2.4) — 보스 앞에 선 슬래브. 남은 hits 만큼 가로 칸이 밝고, 깎인 칸은 갈라진다 */
  function drawWall(ctx, b) {
    var W = C.BOSS;
    var x = b.x + b.facing * W.WALL_GAP - W.WALL_W * 0.5;
    var top = V.FLOOR_Y - W.WALL_H;
    var total = b.def.wall.hits;
    var segH = W.WALL_H / total;
    ctx.save();
    ctx.globalAlpha = W.WALL_ALPHA;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 18;
    for (var i = 0; i < total; i++) {
      var y = top + i * segH;
      var alive = i >= total - b.wallHits;      // 위에서부터 깎인다
      ctx.fillStyle = alive ? b.color : C.COLORS.GREY;
      ctx.globalAlpha = W.WALL_ALPHA * (alive ? 1 : 0.35);
      ctx.fillRect(x, y + 2, W.WALL_W, segH - 4);
    }
    ctx.restore();
  }

  /** 보스의 텔 — 무기 끝 글로우·공격 궤적. 몸통과 분리해 어둠 레이어 위에 그린다 (스펙 §2.3) */
  function drawBossTells(ctx, b) {
    // 텔 플래시가 살아있는 동안 무기 끝 글로우
    if (b.flashT > 0) {
      var tip = b.weaponTip();
      var k = b.flashT / C.BOSS.FLASH_TIME;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = b.flashColor;
      ctx.shadowColor = b.flashColor;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 7 + (1 - k) * 6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 공격 active 중 무기 호 궤적
    var Mk = b.attack && global.MOTIONS ? global.MOTIONS[b.attack.def.kind] : null;
    if (b.attack && b.attack.stage === 'active' && (b.attack.def.kind === 'melee' || (Mk && Mk.melee))) {
      var a = b.attack;
      var kk = 1 - a.t / Math.max(0.01, a.def.active);
      var bh = BUILD[b.silhouette] ? BUILD[b.silhouette].h : 84;
      var sk = a.def.swing || (a.def.steal ? SWING_BY_KIND[a.def.steal.kind] : 'thrust');
      drawSwing(ctx, b.x, b.facing, bh,
        a.tell === 'red' ? C.COLORS.RED : C.COLORS.GOLD,
        sk, a.def.reach, kk, 0.75);
    }

    // 반격 자세 — 회색 점선 링. 텔 색이 아니라 "지금 치면 안 된다"는 상태 표시 (스펙 2026-09-23 §2.3)
    var M = C.MOTION;
    if (b.attack && b.attack.stage === 'windup' && b.attack.def.kind === 'stance') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = C.COLORS.GREY;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(b.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.55, M.STANCE_RING_R, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 악보 콜 — 음표 줄. 가로 간격 = 시각 × SCORE_PIP_PX 라 리듬이 보인다. 울린 음표만 금색
    var sa = b.attack;
    if (sa && sa.def.kind === 'score' && sa.scoreIdx === 0 && sa.callAt) {
      var span = sa.callAt[sa.callAt.length - 1] * M.SCORE_PIP_PX;
      var x0 = b.x - span / 2, py = V.FLOOR_Y - M.SCORE_PIP_Y;
      ctx.save();
      for (var i = 0; i < sa.callAt.length; i++) {
        var lit = i < sa.callNext;
        ctx.globalAlpha = lit ? 1 : 0.35;
        ctx.fillStyle = lit ? C.COLORS.GOLD : C.COLORS.GREY;
        ctx.beginPath();
        ctx.arc(x0 + sa.callAt[i] * M.SCORE_PIP_PX, py, M.SCORE_PIP_R, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---- 화면 전체 플래시 / 비네트 ------------------------------------------ */

  Render.drawOverlay = function (ctx) {
    if (FX.whiteFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(FX.whiteFlash / FX.whiteFlashMax, 0, 1) * 0.85;
      ctx.fillStyle = C.COLORS.WHITE;
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
    if (FX.tintFlash > 0) {
      // 세기는 globalAlpha 로 준다 — 그라디언트 자체는 한 번만 만든다
      var a = clamp(FX.tintFlash / FX.tintFlashMax, 0, 1);
      if (!GRAD.vignette) {
        var g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.W * 0.28, V.W / 2, V.H / 2, V.W * 0.62);
        g.addColorStop(0, 'rgba(255,34,51,0)');
        g.addColorStop(0.55, 'rgba(255,34,51,0.275)');
        g.addColorStop(1, 'rgba(255,34,51,1)');
        GRAD.vignette = g;
      }
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = GRAD.vignette;
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
  };

  Render.drawFighter = drawFighter;
  Render.BUILD = BUILD;
  global.Render = Render;
})(window);
