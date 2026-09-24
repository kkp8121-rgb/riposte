/* =============================================================================
 * RIPOSTE — js/game.js
 * 상태 머신 · 고정 스텝 업데이트 · 판정 · 점수 · 저장 (스펙 §2, §6)
 * ========================================================================== */
(function (global) {
  'use strict';

  var C = CONFIG;
  var V = C.VIEW;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* =========================================================================
   * 저장 (localStorage — file:// 에서 막힐 수 있으므로 전부 try/catch)
   * ====================================================================== */
  /** 옵션 값 — 기본값 위에 저장분을 덮어쓰고 범위를 강제한다 (별도 저장 키를 만들지 않는다) */
  function loadSettings(raw) {
    var d = C.SETTINGS.DEFAULTS, out = {}, k;
    for (k in d) { if (d.hasOwnProperty(k)) out[k] = d[k]; }
    if (raw && typeof raw === 'object') {
      for (k in out) { if (out.hasOwnProperty(k) && raw[k] !== undefined) out[k] = raw[k]; }
    }
    var step = C.SETTINGS.VOLUME_STEP;
    out.volume = clamp(Math.round((+out.volume || 0) / step) * step, 0, C.SETTINGS.VOLUME_MAX);
    out.assistHp = clamp(out.assistHp | 0, 0, C.ASSIST.HP.length - 1);
    out.assistWindup = clamp(out.assistWindup | 0, 0, C.ASSIST.WINDUP.length - 1);
    out.fullscreen = !!out.fullscreen;
    out.flash = !!out.flash;
    out.particles = !!out.particles;
    if (out.keys && typeof out.keys !== 'object') out.keys = null;
    return out;
  }

  /** 랭크·최고 기록 한 벌 (일반 / 하드가 각각 하나씩 가진다) */
  function emptyRecords() { return { ranks: {}, bestTimes: {}, bestTries: {} }; }

  function loadSave(bossCount) {
    var n = bossCount || 1;
    var fallback = { unlocked: 1, cleared: false, hardUnlocked: false,
                     ranks: {}, bestTimes: {}, bestTries: {},
                     hard: emptyRecords(), settings: loadSettings(null) };
    try {
      var raw = global.localStorage.getItem(C.STORAGE.KEY);
      if (!raw) return fallback;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return fallback;
      var unlocked = clamp(o.unlocked || 1, 1, n);   // 보스 수는 테이블이 결정한다
      var cleared = !!o.cleared;
      // 챕터 2 추가(2026-09-17) 전에 챕터 1 을 완주한 세이브: 4보스 기준 cleared 였으면
      // 5번째 보스부터 이어 간다 (스펙 §6 "Continue — CHAPTER II")
      if (cleared && unlocked < n) { cleared = false; unlocked = Math.min(n, unlocked + 1); }
      return {
        unlocked: unlocked,
        cleared: cleared,
        hardUnlocked: !!o.hardUnlocked,
        ranks: o.ranks || {},
        bestTimes: o.bestTimes || {},
        bestTries: o.bestTries || {},
        // 하드 판 기록은 일반 기록과 같은 모양으로 따로 둔다 (섞이지 않게)
        hard: o.hard && typeof o.hard === 'object'
          ? { ranks: o.hard.ranks || {}, bestTimes: o.hard.bestTimes || {}, bestTries: o.hard.bestTries || {} }
          : emptyRecords(),
        settings: loadSettings(o.settings)
      };
    } catch (e) { return fallback; }
  }

  function writeSave(save) {
    try { global.localStorage.setItem(C.STORAGE.KEY, JSON.stringify(save)); }
    catch (e) { /* file:// 등에서 차단 — 무시 */ }
  }

  /* =========================================================================
   * Game
   * ====================================================================== */
  function Game(opts) {
    opts = opts || {};
    this.storyOn = opts.story !== false;   // ?story=0 이면 false — 대화 전부 건너뜀
    this.runStory = this.storyOn;          // 이번 런에서 대화를 트는가 (?boss=N 은 false)
    this.story = null;                     // STORY 장면 상태 (아래 beginStory)
    this.seed = opts.seed === undefined ? 1337 : opts.seed;
    /* 하드 모드 "RIPOSTE+" — ?hard=1 로 들어오면 이 세션의 모든 런이 하드다 (테스트/밸런스용) */
    this.forceHard = !!opts.hard;
    this.hard = this.forceHard;
    this.speed = opts.speed || 1;
    /* dev 모드(스펙 §5.5) — 기본 꺼짐. 타이틀 THIEF 입력으로 토글하거나 ?dev=1 로 곧장 켠다 */
    this.dev = !!opts.dev;
    this.devOverlay = false;
    this.debugScale = 1;
    this.rng = new RNG(this.seed);

    this.player = new Player(this);
    this.boss = null;
    this.bossIndex = 0;
    this.defs = global.BOSSES.slice();

    this.projectiles = [];
    this.zones = [];
    this.pendingShots = [];
    /* 새 동작의 월드 엔티티 (스펙 2026-09-23 §3.1) — 빔·기둥·표식·메아리 잔상 */
    this.beams = [];
    this.pillars = [];
    this.marks = [];
    this.echoes = [];

    this.scene = 'TITLE';
    this.sceneT = 0;
    this.menuIndex = 0;        // 타이틀/옵션/보스 선택 공용 커서
    this.menuMsg = '';         // 옵션 화면 하단 경고 (키 충돌 등)
    this.menuMsgT = 0;
    this.bindWait = false;     // 키 재지정 대기 중인 액션 이름
    this.time = 0;
    this.acc = 0;

    this.hits = 0;
    this.perfects = 0;
    this.blocks = 0;
    this.ko = null;            // null | 'victory' | 'defeat'
    this.koT = 0;
    this.result = null;
    this.lastResult = null;

    this.banner = null;
    this.tut = null;
    this.lastHitBy = null;     // 마지막으로 플레이어를 때린 공격 {label, tell, kind}
    /* ?boss=N 으로 들어온 판은 진행도를 건드리지 않는다 (디버그/테스트 진입) */
    this.noSave = false;
    this.save = loadSave(this.defs.length);
    this.run = this.newRun();
    this.endingHand = [];

    this.skillTable = this.buildSkillTable();

    /* dev 커맨드 토글 — 타이틀 화면일 때만 반응한다(전투 중 오발동 방지) */
    Input.onDevCode = (function (g) {
      return function () {
        if (g.scene !== 'TITLE') return;
        g.dev = !g.dev;
        RAudio.ui(g.dev);
      };
    })(this);
  }

  Game.prototype.newRun = function () {
    return { time: 0, hits: 0, perfects: 0, ranks: [], bosses: [], tries: {} };
  };

  /** 저장 — URL 로 특정 보스에 바로 들어온 판은 진행도를 쓰지 않는다 */
  Game.prototype.persist = function () {
    if (this.noSave) return;
    writeSave(this.save);
  };

  /** 모든 보스의 steal 정의를 모아 기술 표를 만든다 (봇/HUD 가 참조) */
  Game.prototype.buildSkillTable = function () {
    var t = {};
    for (var i = 0; i < this.defs.length; i++) {
      var atks = this.defs[i].attacks;
      for (var k in atks) {
        if (!atks.hasOwnProperty(k)) continue;
        var s = atks[k].steal;
        if (!s) continue;
        var kd = C.RIPOSTE_KINDS[s.kind];
        t[s.id] = { id: s.id, label: s.label || s.id, kind: s.kind, damage: s.damage, reach: kd.reach };
      }
    }
    return t;
  };

  /* ---- 장면 전환 ---------------------------------------------------------- */

  Game.prototype.setScene = function (s) {
    if (this.scene === 'FIGHT' && s !== 'FIGHT') RAudio.stopDrone();
    this.scene = s;
    this.sceneT = 0;
  };

  Game.prototype.goTitle = function () {
    this.setScene('TITLE');
    this.menuIndex = 0;
    this.bindWait = false;
    this.boss = null;
    this.story = null;
    this.clearWorld();
    FX.reset();
  };

  Game.prototype.clearWorld = function () {
    this.projectiles.length = 0;
    this.zones.length = 0;
    this.pendingShots.length = 0;
    this.beams.length = 0;
    this.pillars.length = 0;
    this.marks.length = 0;
    this.echoes.length = 0;
  };

  /** opts.noSave = true 면 저장하지 않고, opts.noStory = true 면 대화도 틀지 않는다 (?boss=N) */
  Game.prototype.startRun = function (fromIndex, opts) {
    this.noSave = !!(opts && opts.noSave);
    this.hard = this.forceHard || !!(opts && opts.hard);
    this.runStory = this.storyOn && !(opts && opts.noStory);
    this.run = this.newRun();
    this.startBoss(fromIndex || 0);
  };

  /** opts.skipBefore = true 면 전투 전 대화를 건너뛴다 (R 재도전) */
  Game.prototype.startBoss = function (index, opts) {
    this.bossIndex = clamp(index, 0, this.defs.length - 1);
    var def = this.defs[this.bossIndex];
    this.run.tries[def.key] = (this.run.tries[def.key] || 0) + 1;
    this.boss = new Boss(def, this);
    this.player.hardReset();
    this.clearWorld();
    FX.reset();
    this.rng.reset(this.seed + this.bossIndex * 7919);
    this.time = 0;
    this.acc = 0;
    this.hits = 0;
    this.perfects = 0;
    this.blocks = 0;
    this.ko = null;
    this.koT = 0;
    this.result = null;
    this.lastHitBy = null;
    this.banner = { name: def.name, title: def.title, t: 0 };
    this.tut = def.tutorial
      ? { parryDone: false, riposteDone: false, dashDone: false, redSeen: false, active: true }
      : null;
    if (this.runStory && !(opts && opts.skipBefore) && this.storyFor('before')) this.beginStory('before');
    else this.setScene('INTRO');
  };

  Game.prototype.beginFight = function () {
    this.setScene('FIGHT');
    this.time = 0;
    var def = this.defs[this.bossIndex];
    RAudio.startDrone(def.droneHz, C.AUDIO.BPM[def.key], def.drone);
  };

  Game.prototype.restartBoss = function () {
    this.startBoss(this.bossIndex, { skipBefore: true });
  };

  /* ---- 메인 업데이트 ------------------------------------------------------ */

  /** rawDt = 실제 경과 시간(초). FX 는 실시간, 월드는 히트스톱/슬로모 반영. */
  Game.prototype.update = function (rawDt) {
    if (rawDt > C.LOOP.MAX_FRAME_DT) rawDt = C.LOOP.MAX_FRAME_DT;
    FX.update(rawDt);
    if (FX.hitstop > 0) return;                    // 히트스톱 — 월드 정지

    // KO 연출은 "실제 시간"으로 센다 — 슬로모가 대기 시간을 늘리지 않도록.
    if (this.ko && this.scene === 'FIGHT') {
      this.koT -= rawDt;
      if (this.koT <= 0) {
        if (this.ko === 'victory') this.finishVictory();
        else this.setScene('DEFEAT');
      }
    }

    var dt = rawDt * FX.timeScale() * this.speed * this.debugScale;
    this.acc += dt;
    var steps = 0;
    while (this.acc >= C.LOOP.FIXED_DT && steps < C.LOOP.MAX_STEPS) {
      this.step(C.LOOP.FIXED_DT);
      this.acc -= C.LOOP.FIXED_DT;
      steps++;
    }
    if (steps >= C.LOOP.MAX_STEPS) this.acc = 0;
  };

  Game.prototype.step = function (dt) {
    Input.beginStep();
    this.sceneT += dt;
    if (this.banner) this.banner.t += dt;

    // 전역 키
    if (Input.consume('mute')) {
      var m = RAudio.toggleMute();
      FX.pop(m ? 'MUTED' : 'SOUND ON', V.W - 90, 56, C.COLORS.TEXT_DIM, { size: 13, rise: 10 });
    }

    switch (this.scene) {
      case 'TITLE':   this.stepTitle(dt); break;
      case 'INTRO':   this.stepIntro(dt); break;
      case 'FIGHT':   this.stepFight(dt); break;
      case 'VICTORY': this.stepVictory(dt); break;
      case 'STORY':   this.stepStory(dt); break;
      case 'OPTIONS': this.stepOptions(dt); break;
      case 'BOSSSELECT': this.stepBossSelect(dt); break;
      case 'KEYBIND': this.stepKeybind(dt); break;
      case 'INTERLUDE': this.stepInterlude(dt); break;
      case 'DEFEAT':  this.stepDefeat(dt); break;
      case 'ENDING':  this.stepEnding(dt); break;
    }
  };

  Game.prototype.stepTitle = function (dt) {
    if (Input.consume('newgame')) {
      RAudio.ui(true);
      this.noSave = false;
      this.save.unlocked = 1;
      this.save.cleared = false;     // 진행도 초기화 ([N] NEW GAME — CLEAR PROGRESS)
      this.persist();
      this.startRun(0);
      return;
    }
    var items = this.titleItems();
    if (this.menuIndex >= items.length) this.menuIndex = 0;
    this.menuMove(items.length);
    if (!Input.consume('confirm')) return;
    RAudio.ui(true);
    var id = items[this.menuIndex].id;
    // NEW RUN 이 0번이라 "Enter 한 번 = 시작" 이 그대로 유지된다 (하네스 호환)
    if (id === 'new') this.startRun(0);
    else if (id === 'hard') this.startRun(0, { hard: true });
    else if (id === 'continue') this.startRun(this.save.cleared ? 0 : this.save.unlocked - 1);
    else if (id === 'bosses') { this.menuIndex = 0; this.setScene('BOSSSELECT'); }
    else if (id === 'options') { this.menuIndex = 0; this.setScene('OPTIONS'); }
  };

  /* =========================================================================
   * 메뉴 (타이틀 세로 메뉴 · 옵션 · 보스 선택 · 키 설정)
   * ====================================================================== */

  /** 위/아래 커서 이동 — 메뉴 전용 액션이고 전투 동사를 늘리지 않는다 */
  Game.prototype.menuMove = function (n) {
    var d = 0;
    if (Input.consume('up')) d -= 1;
    if (Input.consume('down')) d += 1;
    if (!d || n <= 0) return;
    this.menuIndex = (this.menuIndex + d + n) % n;
    RAudio.ui(false);
  };

  Game.prototype.setMenuMsg = function (m) { this.menuMsg = m; this.menuMsgT = C.MENU.MSG_TIME; };

  /** 클리어한 보스 인덱스 목록 (보스 선택 화면). dev 모드면 클리어 여부와 무관하게 전부 반환한다 */
  Game.prototype.clearedBosses = function () {
    var out = [];
    for (var i = 0; i < this.defs.length; i++) {
      if (this.dev || this.save.cleared || i < this.save.unlocked - 1) out.push(i);
    }
    return out;
  };

  Game.prototype.titleItems = function () {
    var items = [{ id: 'new', label: 'NEW RUN' }];
    // 하드는 0번이 아니다 — "Enter 한 번 = NEW RUN" 이 그대로 유지돼야 한다 (하네스 호환)
    if (this.save.hardUnlocked) items.push({ id: 'hard', label: C.HARD.MENU_LABEL });
    if (this.save.unlocked > 1 || this.save.cleared) items.push({ id: 'continue', label: 'CONTINUE' });
    if (this.clearedBosses().length) items.push({ id: 'bosses', label: 'BOSS SELECT' });
    items.push({ id: 'options', label: 'OPTIONS' });
    return items;
  };

  /** 이번 런이 쓰는 기록 한 벌 — 하드 판은 일반 기록과 섞이지 않는다 */
  Game.prototype.records = function () {
    if (!this.hard) return this.save;
    if (!this.save.hard) this.save.hard = emptyRecords();
    return this.save.hard;
  };

  /* ---- ASSIST (옵트인 — 기본값이면 배율이 1이라 밸런스가 그대로다) -------- */

  Game.prototype.assistMaxHp = function () {
    var s = this.save && this.save.settings;
    var e = C.ASSIST.HP[(s && s.assistHp) || 0] || C.ASSIST.HP[0];
    return Math.round(C.PLAYER.HP * e.mult);
  };

  Game.prototype.assistWindupMult = function () {
    var s = this.save && this.save.settings;
    var e = C.ASSIST.WINDUP[(s && s.assistWindup) || 0] || C.ASSIST.WINDUP[0];
    return e.mult;
  };

  /** 기본값이 아니면 true — 그 판은 랭크·최고 기록을 저장하지 않는다 */
  Game.prototype.assistOn = function () {
    var s = this.save && this.save.settings;
    return !!s && (s.assistHp > 0 || s.assistWindup > 0);
  };

  /* ---- 옵션 적용 / 조작 --------------------------------------------------- */

  /** 저장된 옵션을 실제 시스템에 반영한다 (부팅 1회 + 변경 시) */
  Game.prototype.applySettings = function () {
    var s = this.save.settings;
    FX.enabled = !!s.particles;
    FX.whiteFlashEnabled = !!s.flash;
    RAudio.setVolume(s.volume / C.SETTINGS.VOLUME_MAX);
    // 볼륨 0 = 음소거. 0 이 아닐 때 여기서 음소거를 풀지는 않는다 (M 키·?mute=1 존중)
    if (s.volume <= 0) RAudio.setMuted(true);
    Input.setKeymap(s.keys);
  };

  Game.prototype.applyFullscreen = function (on) {
    try {
      var d = global.document, pr;
      if (on && d.documentElement.requestFullscreen) pr = d.documentElement.requestFullscreen();
      else if (!on && d.exitFullscreen && d.fullscreenElement) pr = d.exitFullscreen();
      if (pr && pr['catch']) pr['catch'](function () { /* 브라우저 정책 — 조용히 무시 */ });
    } catch (e) { /* 무시 */ }
  };

  Game.prototype.optionToggle = function (row) {
    var s = this.save.settings;
    s[row.id] = !s[row.id];
    if (row.id === 'flash') FX.whiteFlashEnabled = s.flash;
    else if (row.id === 'particles') FX.enabled = s.particles;
    else if (row.id === 'fullscreen') this.applyFullscreen(s.fullscreen);
  };

  Game.prototype.optionAdjust = function (row, d) {
    var s = this.save.settings;
    if (row.type === 'range') {
      s.volume = clamp(s.volume + d * C.SETTINGS.VOLUME_STEP, 0, C.SETTINGS.VOLUME_MAX);
      RAudio.setVolume(s.volume / C.SETTINGS.VOLUME_MAX);
      RAudio.setMuted(s.volume <= 0);
    } else if (row.type === 'toggle') {
      this.optionToggle(row);
    } else if (row.type === 'choice') {
      var tbl = C.ASSIST[row.table];
      s[row.id] = (s[row.id] + d + tbl.length) % tbl.length;
      if (this.player) this.player.maxHp = this.assistMaxHp();
    } else {
      return;
    }
    RAudio.ui(d > 0);
    this.persist();
  };

  Game.prototype.resetSettings = function () {
    this.save.settings = loadSettings(null);
    this.applySettings();
    RAudio.setMuted(false);
    if (this.player) this.player.maxHp = this.assistMaxHp();
    this.persist();
    this.setMenuMsg('');
  };

  Game.prototype.stepOptions = function (dt) {
    var rows = C.MENU.OPTIONS;
    if (this.menuMsgT > 0) this.menuMsgT -= dt;
    this.menuMove(rows.length);
    var row = rows[this.menuIndex];
    var d = 0;
    if (Input.consume('left')) d -= 1;
    if (Input.consume('right')) d += 1;
    if (d) this.optionAdjust(row, d);
    if (Input.consume('confirm')) {
      RAudio.ui(true);
      if (row.id === 'keys') { this.menuIndex = 0; this.bindWait = false; this.setScene('KEYBIND'); return; }
      if (row.id === 'reset') { this.resetSettings(); return; }
      if (row.type === 'toggle') { this.optionToggle(row); this.persist(); }
    }
    if (Input.consume('back')) { this.persist(); this.menuIndex = 0; this.setScene('TITLE'); }
  };

  Game.prototype.stepBossSelect = function (dt) {
    var list = this.clearedBosses();
    this.menuMove(list.length);
    if (list.length && Input.consume('confirm')) {
      RAudio.ui(true);
      // 고른 판은 진행도를 저장하지 않는다 (?boss=N 과 같은 규칙)
      this.startRun(list[this.menuIndex], { noSave: true, noStory: true });
      return;
    }
    if (Input.consume('back')) { this.menuIndex = 0; this.setScene('TITLE'); }
  };

  Game.prototype.stepKeybind = function (dt) {
    if (this.menuMsgT > 0) this.menuMsgT -= dt;
    if (this.bindWait) return;              // 키 대기 중 — Input.captureKey 가 다음 keydown 을 가져간다
    var acts = C.MENU.BINDABLE;
    this.menuMove(acts.length);
    if (Input.consume('confirm')) { this.beginRebind(acts[this.menuIndex]); return; }
    if (Input.consume('back')) { this.persist(); this.menuIndex = 0; this.setScene('OPTIONS'); }
  };

  Game.prototype.beginRebind = function (action) {
    var self = this;
    this.bindWait = action;
    this.setMenuMsg('');
    RAudio.ui(true);
    Input.captureKey(function (code) { self.finishRebind(action, code); });
  };

  Game.prototype.finishRebind = function (action, code) {
    this.bindWait = false;
    if (C.MENU.RESERVED_CODES.indexOf(code) >= 0) { this.setMenuMsg(C.MENU.RESERVED); return; }
    var map = Input.KEYMAP;
    for (var a in map) {
      if (!map.hasOwnProperty(a) || a === action) continue;
      if (map[a].indexOf(code) >= 0) { this.setMenuMsg(C.MENU.CONFLICT); return; }
    }
    var keys = this.save.settings.keys || {};
    keys[action] = [code];
    this.save.settings.keys = keys;
    Input.setKeymap(keys);
    this.persist();
    RAudio.ui(true);
  };

  Game.prototype.stepIntro = function (dt) {
    if (Input.consume('confirm') || this.sceneT >= C.SCENE.INTRO_TIME) {
      this.beginFight();
    }
    if (Input.consume('back')) this.goTitle();
  };

  Game.prototype.stepVictory = function (dt) {
    if (Input.consume('confirm')) { RAudio.ui(true); this.afterVictory(); }
    if (Input.consume('back')) this.goTitle();
  };

  /** 승리 카드 다음 — 전투 후 대화가 있으면 먼저 튼다 (스펙 §10) */
  Game.prototype.afterVictory = function () {
    if (this.runStory && this.storyFor('after')) this.beginStory('after');
    else this.advanceAfterBoss();
  };

  /** 다음 보스 / 챕터 카드 / 엔딩 (스펙 §2.6) */
  Game.prototype.advanceAfterBoss = function () {
    if (this.bossIndex + 1 >= this.defs.length) {
      if (!this.noSave) {                // 완주 — 타이틀 문구가 바뀌고 RIPOSTE+ 가 열린다
        this.save.cleared = true;
        this.save.hardUnlocked = true;
        this.persist();
      }
      this.endingHand = this.snapshotHand();
      this.setScene('ENDING');
      return;
    }
    if (this.isChapterEnd(this.bossIndex)) { this.setScene('INTERLUDE'); return; }
    this.startBoss(this.bossIndex + 1);
  };

  Game.prototype.stepInterlude = function (dt) {
    if (this.sceneT >= C.SCENE.INTERLUDE_MIN && Input.consume('confirm')) {
      RAudio.ui(true);
      this.startBoss(this.bossIndex + 1);
      return;
    }
    if (Input.consume('back')) this.goTitle();
  };

  /* ---- 챕터 (config.CHAPTERS) -------------------------------------------- */

  Game.prototype.chapterOf = function (index) {
    var def = this.defs[index];
    if (!def) return null;
    for (var i = 0; i < C.CHAPTERS.length; i++) {
      if (C.CHAPTERS[i].bosses.indexOf(def.key) >= 0) return C.CHAPTERS[i];
    }
    return null;
  };

  /** 이 보스가 챕터의 마지막이고 뒤에 보스가 더 있으면 true (엔딩 직전은 false) */
  Game.prototype.isChapterEnd = function (index) {
    var ch = this.chapterOf(index);
    if (!ch) return false;
    var last = ch.bosses[ch.bosses.length - 1] === this.defs[index].key;
    return last && index + 1 < this.defs.length;
  };

  /** 챕터에 속한 이번 런의 보스 결과들 */
  Game.prototype.chapterResults = function (ch) {
    var out = [];
    for (var i = 0; i < this.run.bosses.length; i++) {
      var r = this.run.bosses[i];
      if (ch.bosses.indexOf(r.key) >= 0) out.push(r);
    }
    return out;
  };

  Game.prototype.chapterRank = function (ch) {
    var rs = this.chapterResults(ch);
    if (!rs.length) return 'C';
    var sum = 0;
    for (var i = 0; i < rs.length; i++) sum += C.RANK.VALUE[rs[i].rank];
    return C.RANK.LETTERS[clamp(Math.round(sum / rs.length) - 1, 0, 3)];
  };

  /** 엔딩 카드용 손패 스냅샷 — 3칸을 채워 "비어 가는" 연출이 항상 보이게 한다 */
  Game.prototype.snapshotHand = function () {
    var labels = [];
    var h = this.player.hand;
    for (var i = 0; i < h.length && labels.length < C.HAND.SIZE; i++) labels.push(h[i].label || h[i].id);
    var keys = Object.keys(this.skillTable);
    for (var k = 0; k < keys.length && labels.length < C.HAND.SIZE; k++) {
      if (labels.indexOf(keys[k]) < 0) labels.push(keys[k]);
    }
    return labels;
  };

  Game.prototype.stepDefeat = function (dt) {
    if (Input.consume('restart')) { RAudio.ui(true); this.restartBoss(); return; }
    if (Input.consume('back')) this.goTitle();
  };

  Game.prototype.stepEnding = function (dt) {
    if (Input.consume('confirm') || Input.consume('back')) { RAudio.ui(true); this.goTitle(); }
  };

  /* ---- STORY (스펙 §10) — 전투 경계의 단문 대화 --------------------------- */

  /** 이 보스의 대사 테이블에 해당 장면이 있으면 그 테이블을 돌려준다 */
  Game.prototype.storyFor = function (beat) {
    var def = this.defs[this.bossIndex];
    var s = global.STORY && def ? global.STORY[def.key] : null;
    return (s && s[beat] && s[beat].length) ? s : null;
  };

  Game.prototype.beginStory = function (beat) {
    var s = this.storyFor(beat);
    var lines = [];
    for (var i = 0; i < s[beat].length; i++) {
      var raw = s[beat][i];
      var t = (typeof raw === 'string') ? raw : raw.text;
      lines.push({ text: t, hideSpeaker: !!(raw && raw.hideSpeaker), silent: t === '……', dissolve: !!(raw && raw.dissolve) });
    }
    this.story = {
      beat: beat, lines: lines, index: 0, shown: 0,
      choice: (s.choice && s.choice.at === beat) ? s.choice : null,
      choiceState: null, reply: null, replyShown: 0,
      holdT: 0, holdArmed: false, dissolveT: 0, bossAlpha: 1
    };
    this.setScene('STORY');
  };

  Game.prototype.stepStory = function (dt) {
    var st = this.story;
    var S = C.STORY;
    if (!st) { this.finishStory(); return; }

    // 스킵: Esc 또는 Enter 길게. 선택지가 남아 있어도 스킵은 정답으로 간주한다.
    // 이전 장면에서 누른 채 넘어온 Enter 는 세지 않는다 — 장면 안에서 새로 눌러 유지할 때만.
    if (!Input.pressed('confirm')) st.holdArmed = true;
    if (st.holdArmed && Input.pressed('confirm')) st.holdT += dt; else st.holdT = 0;
    if (Input.consume('back') || st.holdT >= S.SKIP_HOLD) { this.finishStory(); return; }

    if (st.choiceState === 'taken') {
      if (Input.consume('confirm')) { RAudio.ui(true); st.choiceState = 'pending'; st.reply = null; }
      return;
    }

    if (st.choiceState === 'pending') {
      var key = Input.consume('parry') ? 'K' : (Input.consume('riposte') ? 'J' : null);
      if (!key) return;
      var opt = st.choice[key];
      st.reply = { key: key, text: opt.reply, ok: !!opt.ok, dissolve: !!opt.dissolve };
      st.replyShown = 0;
      if (opt.ok) { st.choiceState = 'reply'; RAudio.parryPerfect(); }
      else { st.choiceState = 'taken'; FX.flashTint(S.TAKEN_FLASH); RAudio.playerHit(); }
      return;
    }

    if (st.choiceState === 'reply') {
      var rlen = st.reply.text.length;
      st.replyShown = Math.min(rlen, st.replyShown + S.CPS * dt);
      if (st.reply.dissolve && st.replyShown >= rlen * 0.5) {
        st.dissolveT += dt;
        st.bossAlpha = 1 - clamp(st.dissolveT / S.DISSOLVE, 0, 1);
      }
      if (Input.consume('parry') || Input.consume('riposte') || Input.consume('dash')) st.replyShown = rlen;
      if (Input.consume('confirm')) {
        if (st.replyShown < rlen) { st.replyShown = rlen; return; }
        if (st.reply.dissolve && st.bossAlpha > 0) { st.bossAlpha = 0; return; }
        this.finishStory();
      }
      return;
    }

    // 일반 줄 — 타자기. 아무 액션 키로 즉시 완성, Enter 로 다음 줄.
    var line = st.lines[st.index];
    var len = line.text.length;
    st.shown = line.silent ? len : Math.min(len, st.shown + S.CPS * dt);
    // 소멸 줄(ADAMANT after 마지막 줄) — 절반 찍힌 뒤 실루엣이 사라진다. reply 의 dissolve 와 같은 규칙
    if (line.dissolve && st.shown >= len * 0.5) {
      st.dissolveT += dt;
      st.bossAlpha = 1 - clamp(st.dissolveT / S.DISSOLVE, 0, 1);
    }
    if (Input.consume('parry') || Input.consume('riposte') || Input.consume('dash')) st.shown = len;
    if (Input.consume('confirm')) {
      RAudio.ui(true);
      if (st.shown < len) { st.shown = len; return; }
      if (line.dissolve && st.bossAlpha > 0) { st.bossAlpha = 0; return; }
      st.index++;
      st.shown = 0;
      if (st.index >= st.lines.length) {
        if (st.choice) st.choiceState = 'pending';
        else this.finishStory();
      }
    }
  };

  Game.prototype.finishStory = function () {
    var beat = this.story ? this.story.beat : 'before';
    this.story = null;
    if (beat === 'before') {
      if (this.banner) this.banner.t = 0;      // 배너 시계는 STORY 동안에도 흘렀다 — 다시 0 부터
      this.setScene('INTRO');
    } else {
      this.advanceAfterBoss();
    }
  };

  /* ---- FIGHT -------------------------------------------------------------- */

  Game.prototype.stepFight = function (dt) {
    var p = this.player;
    var b = this.boss;

    if (this.ko) {
      // KO 슬로모 중에도 R / Esc 는 살아 있어야 한다 (연출을 기다리게 만들지 않는다)
      if (Input.consume('back')) { this.goTitle(); return; }
      if (Input.consume('restart')) { this.restartBoss(); return; }
      // 카운트다운은 update() 가 실제 시간으로 처리한다. 여기서는 연출만 계속 굴린다.
      this.stepWorld(dt, 0, true);
      return;
    }

    this.time += dt;

    if (Input.consume('back')) { this.goTitle(); return; }
    if (Input.consume('restart')) { this.restartBoss(); return; }

    var axis = Input.axis();

    // 패리 (짧은 입력 버퍼 — 대시/패리 락 중에 눌린 입력을 흘려버리지 않는다)
    if (Input.consume('parry')) {
      // 스태미너가 모자라면 버퍼에 쌓지 않는다 (락 해제 순간 자동 재입력 방지)
      if (p.stamina < C.STAMINA.PARRY_COST) p.staminaEmpty();
      else p.parryBuffer = C.COMBAT.INPUT_BUFFER;
    }
    if (p.parryBuffer > 0 && p.canParry()) {
      p.parryBuffer = 0;
      p.startParry();
      RAudio.swing();
    }
    // 대시 — 방향은 이동 입력, 없으면 보스 반대쪽
    if (Input.consume('dash')) {
      if (p.canDash()) {
        var dir = axis !== 0 ? axis : (b && b.x >= p.x ? -1 : 1);
        p.startDash(dir);
        RAudio.dash();
        FX.sparks(p.x, V.FLOOR_Y - 6, C.FX.DUST, C.COLORS.PLAYER,
          { speed: 130, life: 0.28, size: 1.8, gravity: 220 });
      } else if (p.stamina < C.STAMINA.DASH_COST) p.staminaEmpty();
    }
    // 리포스트 (짧은 입력 버퍼)
    if (Input.consume('riposte')) p.riposteBuffer = C.COMBAT.INPUT_BUFFER;
    if (p.riposteBuffer > 0 && p.canRiposte()) { p.riposteBuffer = 0; this.doRiposte(); }

    /* 개발용 치트 — dev 모드에서만. 이 판은 저장하지 않는다 */
    if (this.dev) {
      if (Input.consumeCode('F1')) this.devOverlay = !this.devOverlay;
      if (Input.consumeCode('F2') && b) { this.noSave = true; b.takeDamage(b.maxHp * C.DEV.HP_CUT, { dev: true }); }
      if (Input.consumeCode('F3') && b) { this.noSave = true; b.takeDamage(b.hp, { dev: true }); }
      if (Input.consumeCode('F4')) {
        this.noSave = true;
        // 물리 Shift 키로 판정 — dash 를 리바인드해도 "이전 보스" 가 깨지지 않는다 (스펙 C10)
        var dir = (Input.codeDown('ShiftLeft') || Input.codeDown('ShiftRight')) ? -1 : 1;
        this.startBoss(clamp(this.bossIndex + dir, 0, this.defs.length - 1), { skipBefore: true });
      }
    }

    this.stepWorld(dt, axis, false);
  };

  Game.prototype.stepWorld = function (dt, axis, koMode) {
    var p = this.player;
    var b = this.boss;

    p.update(dt, koMode ? 0 : axis, b ? b.x : null);
    if (b) b.update(dt);
    this.blockByPillars();             // 걷기·대시·보스 끌어당김까지 끝난 위치를 기둥으로 자른다 (스펙 2026-09-23 §3.6)

    // 리포스트 판정
    var rp = p.riposte;
    if (rp && b && !b.dead) {
      if (rp.stage === 'active' && rp.kind === 'shot' && !rp.fired) {
        rp.fired = true;
        this.spawnProjectile(new Projectile({
          x: p.x + p.facing * 22,
          y: V.FLOOR_Y - 48,
          vx: p.facing * rp.k.projSpeed,
          r: rp.k.projR,
          tell: 'player',
          owner: 'player',
          color: C.COLORS.PLAYER,
          shape: rp.skill.kind === 'shot' && rp.skill.id === 'SHOCKWAVE' ? 'wave' : 'arrow',
          damage: this.riposteDamage(rp),
          fromHand: rp.skill,         // 무적에 막혀 0딜이면 손패로 되돌려준다
          riposteT: rp.startT         // 자세 벌 판정 — 이 리포스트가 "시작"된 시각 (최종 리뷰 A)
        }));
        RAudio.swing();
      }
      if (rp.stage === 'active' && rp.kind !== 'shot' && !rp.hasHit) {
        if (Math.abs(b.x - p.x) <= rp.k.reach) {
          rp.hasHit = true;
          this.resolveRiposteHit(rp);
        }
      }
    }

    // 예약 발사 (triple 등)
    for (var i = this.pendingShots.length - 1; i >= 0; i--) {
      var ps = this.pendingShots[i];
      ps.t -= dt;
      if (ps.t <= 0) {
        this.pendingShots.splice(i, 1);
        var proj = ps.make();
        if (!proj) continue;                 // 발사 취소 (협공 뒤 탄 — 등 뒤 공간이 사라졌다). 기존 make 는 null 을 돌려주지 않는다
        this.spawnProjectile(proj);
        // 연사 후속탄은 "예고"가 아니라 "발사"다 — 텔 플래시가 아니라 작은 발사 스파크
        if (ps.cue && b && !b.dead) b.releaseSpark(proj.tell);
      }
    }

    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateMotionWorld(dt);
    this.blockByPillars();
  };

  /* ---- 리포스트 ----------------------------------------------------------- */

  Game.prototype.doRiposte = function () {
    var p = this.player;
    var skill = p.hand.shift();
    if (!skill) return;
    p.startRiposte(skill);
    RAudio.swing();
    if (this.tut && !this.tut.riposteDone) this.tut.riposteDone = true;
  };

  Game.prototype.riposteDamage = function (rp) {
    var mult = 1;
    if (rp.empowered) mult *= C.COMBAT.EMPOWER_MULT;
    return Math.round(rp.skill.damage * mult);
  };

  /** 무적/포효로 0딜이 났을 때 손패를 돌려준다 (슬롯을 헛되이 태우지 않는다) */
  Game.prototype.refundHand = function (skill) {
    if (!skill) return;
    var h = this.player.hand;
    if (h.length < C.HAND.SIZE) h.unshift(skill);
  };

  /** 보스가 무적(페이즈 전환 포효 포함)이라 타격이 통하지 않았음을 알린다 */
  Game.prototype.immunePop = function (b) {
    /* 막힌 이유를 그대로 읽힌다 — 방벽(스펙 §2.4) · 카운터 전용 · 포효 무적 */
    var label = 'IMMUNE';
    if (b.wallUp()) label = C.BOSS.WALL_POP;
    else if (b.def.counterOnly && b.phase === 2 && b.invuln <= 0) label = C.BOSS.COUNTER_POP;
    FX.pop(label, b.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.55, C.COLORS.GREY, { size: 15, rise: 26 });
    RAudio.parryBlock();
  };

  Game.prototype.resolveRiposteHit = function (rp, fromProjectile) {
    var b = this.boss;
    if (!b || b.dead) return;

    // 반격 자세(스펙 2026-09-23 §3.8) — 참지 못한 리포스트는 피해 0, 곧바로 적 반격. 방벽 판정이 먼저다.
    // 단, 벌은 자세가 "뜬 뒤에" 시작된 리포스트에만 준다 — 자세 전에 이미 날아가던 리포스트가
    // windup 중에 명중해도 그냥(비카운터) 히트로 처리한다(최종 리뷰 A). 자세 윈드업은 애초에
    // 카운터 창도 아니므로(§3.8 "카운터 판정과의 관계") 벌하지 않는 동안은 counter 도 강제로 끈다(최종 리뷰 B).
    var stance = !b.wallUp() && b.stanceOpen();
    if (stance) {
      var sa = b.attack;
      if (rp.startT >= sa.hitAt - sa.windupTotal) { b.punishStance(); return; }
    }

    var counter = false;
    if (!stance && b.state === 'attack' && b.attack && b.attack.stage === 'windup') counter = true;
    if (b.state === 'stagger' && b.staggerCounter) counter = true;

    var mult = 1;
    if (rp.empowered) mult *= C.COMBAT.EMPOWER_MULT;
    if (counter) mult *= C.COMBAT.COUNTER_MULT;
    var dmg = Math.round(rp.skill.damage * mult);
    var applied = b.takeDamage(dmg, { counter: counter });

    // 무적(포효 중)·방벽·counterOnly 에 막혔다 — 손패를 태우지 않고 이유만 띄운다
    if (applied <= 0) {
      this.refundHand(rp.skill);
      this.immunePop(b);
      return;
    }

    // 밀림이 붙은 기술(KICK)은 보스를 밀어낸다
    if (rp.skill.push && !b.armor) {
      var pushDir = (b.x >= this.player.x) ? 1 : -1;
      b.x = Math.max(C.VIEW.MIN_X, Math.min(C.VIEW.MAX_X, b.x + pushDir * rp.skill.push));
    }

    // 이 타격이 Phase 2 를 열었다면 포효/무적이 우선한다 — 경직도 히트 연출도 덮어쓰지 않는다
    if (this.bossIsInvulnerable(b)) return;

    var canInterrupt = !b.armor || rp.empowered;
    if (!b.dead) {
      if (counter && canInterrupt) b.interrupt(C.COMBAT.COUNTER_FLINCH);
      else if (!b.armor) b.stagger(C.COMBAT.RIPOSTE_FLINCH, false);
    }

    // 연출 (스펙 §4)
    FX.addHitstop(C.HITSTOP.RIPOSTE);
    FX.addShake(C.SHAKE.RIPOSTE);
    var hx = b.x, hy = V.FLOOR_Y - C.BOSS.HEIGHT * 0.55;
    FX.sparks(hx, hy, C.FX.RIPOSTE_SPARKS, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.PLAYER,
      { speed: 300, life: 0.45, size: 2.6 });
    FX.ring(hx, hy, 6, 44, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.PLAYER, 0.28, 3);
    FX.pop('-' + applied, hx, hy - 20, rp.empowered ? C.COLORS.EMPOWER : C.COLORS.WHITE,
      { size: rp.empowered ? 26 : 21 });
    if (counter) {
      FX.pop('COUNTER!', hx, hy - 52, C.COLORS.COUNTER, { size: 20, shake: true });
      RAudio.counter();
    }
    RAudio.riposteHit(rp.empowered);
  };

  /** 보스가 지금 타격을 받아들이지 않는 상태인가 (페이즈 전환 포효 포함) */
  Game.prototype.bossIsInvulnerable = function (b) {
    return !!b && !b.dead && (b.invuln > 0 || b.state === 'roar');
  };

  /* ---- 판정: 보스 근접/돌진 히트 ------------------------------------------ */

  Game.prototype.resolveBossHit = function (boss, a) {
    var p = this.player;
    if (this.ko) return;

    // 패리 판정을 무적 프레임보다 먼저 본다 — 피격 무적 중에도 퍼펙트 패리는 성립한다
    // (투사체 경로가 이미 그렇게 동작하므로 근접도 같은 규칙을 쓴다)
    if (a.tell === 'gold') {
      var win = p.parryWindow();
      if (win === 'perfect') { this.onPerfectParry(a.def, boss); return; }
      if (win === 'block') { this.onBlock(a.def, boss); return; }
    }

    if (p.isInvulnerable()) {
      // 대시 통과 성공
      if (a.tell === 'red' && this.tut && !this.tut.dashDone) this.tut.dashDone = true;
      FX.sparks(p.x, V.FLOOR_Y - 40, 6, C.COLORS.PLAYER,
        { speed: 180, life: 0.24, size: 1.8 });
      return;
    }

    this.damagePlayer(a.damage, boss.x, a.def.push,
      { label: a.def.label || a.id, tell: a.tell, kind: a.def.kind, plunder: !!a.def.plunder });
  };

  Game.prototype.onZoneStrike = function (zone) {
    var p = this.player;
    FX.addShake(C.SHAKE.RIPOSTE);
    FX.sparks(zone.x, V.FLOOR_Y, C.FX.HIT_SPARKS, C.COLORS.RED,
      { speed: 320, life: 0.5, dir: -Math.PI / 2, spread: Math.PI * 0.9, size: 2.6 });
    RAudio.tellRed();
    if (this.ko) return;
    if (!zone.contains(p.x)) return;
    if (p.isInvulnerable()) {
      if (this.tut && !this.tut.dashDone) this.tut.dashDone = true;
      return;
    }
    this.damagePlayer(zone.damage, zone.x, 0,
      { label: zone.label, tell: zone.tell, kind: 'zone' });
  };

  Game.prototype.onChargeWall = function (boss, ch) {
    FX.addHitstop(C.HITSTOP.CHARGE_WALL);
    FX.addShake(C.SHAKE.CHARGE_WALL);
    var wx = boss.x + boss.chargeDir * C.BOSS.HALF_W;
    FX.sparks(wx, V.FLOOR_Y - 40, C.FX.HIT_SPARKS, boss.color,
      { speed: 340, life: 0.55, dir: boss.chargeDir > 0 ? Math.PI : 0, spread: Math.PI, size: 2.8 });
    FX.ring(wx, V.FLOOR_Y - 40, 8, 60, boss.color, 0.3, 3);
    FX.pop('STUNNED', boss.x, V.FLOOR_Y - C.BOSS.HEIGHT - 16, C.COLORS.GREY, { size: 16 });
    RAudio.playerHit();
  };

  /* ---- 판정: 퍼펙트 / 블록 ------------------------------------------------ */

  /** 진행 중인 새 동작이 퍼펙트 패리의 경직을 막는가 (악보 — 남은 타격이 있다, 스펙 2026-09-23 §3.9) */
  Game.prototype.parryHolds = function (boss) {
    var a = boss.attack, M = a && global.MOTIONS ? global.MOTIONS[a.def.kind] : null;
    return !!(M && M.holdOnParry && M.holdOnParry(a));
  };

  Game.prototype.onPerfectParry = function (def, boss, projectile) {
    var p = this.player;
    p.onParrySuccess();
    p.gainStamina(C.STAMINA.PERFECT_REFUND);   // 퍼펙트만 환급
    p.streak++;
    p.streakPulse = C.PLAYER.STREAK_PULSE_TIME;
    this.perfects++;

    var px = p.x + p.facing * 34;
    var py = V.FLOOR_Y - C.PLAYER.HEIGHT * 0.58;

    FX.addHitstop(C.HITSTOP.PERFECT);
    FX.addShake(C.SHAKE.PERFECT);
    FX.flashWhite(C.FLASH.PERFECT_WHITE);
    FX.setSlowmo(C.SLOWMO.PERFECT_SCALE, C.SLOWMO.PERFECT_TIME);
    FX.sparks(px, py, C.FX.PERFECT_SPARKS, C.COLORS.GOLD,
      { speed: 380, life: 0.55, size: 2.8 });
    FX.ring(px, py, 8, 66, C.COLORS.GOLD, 0.34, 3);
    RAudio.parryPerfect();

    if (def && def.steal) {
      p.pushHand(def.steal);
      FX.pop('STOLEN: ' + (def.steal.label || def.steal.id), px, py - 46, C.COLORS.GOLD, { size: 19 });
      RAudio.steal();
    } else {
      FX.pop('PERFECT', px, py - 46, C.COLORS.GOLD, { size: 19 });
    }

    // 등 뒤에서 온 탄(부메랑 귀환·협공 뒤 탄)은 뒤집으면 벽으로 간다 — 보스 쪽으로 보낸다
    if (projectile) projectile.reflect((projectile.returning || projectile.fromBehind) && boss
      ? (boss.x >= projectile.x ? 1 : -1) : undefined);
    else if (boss && !boss.dead && !this.bossIsInvulnerable(boss) && !this.parryHolds(boss)) {
      boss.stagger(C.PARRY.FLINCH, false);   // 포효 중이면 경직으로 덮어쓰지 않는다
    }

    if (this.tut && !this.tut.parryDone) this.tut.parryDone = true;
  };

  Game.prototype.onBlock = function (def, boss, projectile) {
    var p = this.player;
    p.onParrySuccess();
    p.gainStamina(C.STAMINA.BLOCK_REFUND);   // 타이밍은 맞췄다 — 절반 환급 (퍼펙트는 전액, 헛침은 0)
    this.blocks++;

    var px = p.x + p.facing * 30;
    var py = V.FLOOR_Y - C.PLAYER.HEIGHT * 0.58;

    FX.addHitstop(C.HITSTOP.BLOCK);
    FX.addShake(C.SHAKE.BLOCK);
    FX.sparks(px, py, C.FX.BLOCK_SPARKS, C.COLORS.GREY, { speed: 220, life: 0.35, size: 2.1 });
    FX.pop('BLOCK', px, py - 40, C.COLORS.GREY, { size: 16 });
    RAudio.parryBlock();

    if (projectile) projectile.dead = true;
    var away = boss ? (p.x >= boss.x ? 1 : -1) : p.facing * -1;
    p.x = clamp(p.x + away * C.PARRY.BLOCK_PUSH, V.MIN_X, V.MAX_X);
  };

  /* ---- 피해 -------------------------------------------------------------- */

  /**
   * @param {object} [src] 무엇에 맞았는지 {label, tell, kind} — 패배 화면이 이걸로 가르친다
   */
  Game.prototype.damagePlayer = function (dmg, fromX, extraPush, src) {
    var p = this.player;
    if (this.ko || p.isInvulnerable()) return;

    p.takeDamage(dmg);
    this.hits++;
    if (src) this.lastHitBy = src;

    // 약탈(스펙 §3.8): 이 보스는 피격마다 손패 맨 앞을 빼앗아 되돌려 쓴다. plunder 는 전부.
    var b = this.boss;
    if (b && !b.dead && b.def.stealOnHit && p.hand.length) {
      var n = (src && src.plunder) ? p.hand.length : 1;
      var taken = null;
      for (var i = 0; i < n; i++) { taken = p.hand.shift(); b.loot.push(taken); }
      FX.pop('TAKEN: ' + (taken.label || taken.id) + (n > 1 ? '  +' + (n - 1) : ''),
        b.x, V.FLOOR_Y - C.BOSS.HEIGHT - 16, b.color, { size: 17, rise: 30 });
      RAudio.steal();
    }

    var away = (p.x >= fromX) ? 1 : -1;
    p.knock = away * (C.PLAYER.HURT_KNOCKBACK + (extraPush || 0)) * C.PLAYER.KNOCK_DECAY;

    FX.addHitstop(C.HITSTOP.PLAYER_HIT);
    FX.addShake(C.SHAKE.PLAYER_HIT);
    FX.flashTint(C.FLASH.VIGNETTE);
    FX.sparks(p.x, V.FLOOR_Y - C.PLAYER.HEIGHT * 0.5, C.FX.HIT_SPARKS, C.COLORS.HEART,
      { speed: 300, life: 0.5, size: 2.6 });
    FX.pop('-' + dmg, p.x, V.FLOOR_Y - C.PLAYER.HEIGHT - 10, C.COLORS.HEART, { size: 20 });
    RAudio.playerHit();

    if (p.hp <= 0) this.onPlayerDown();
  };

  /* ---- 투사체 / 존 -------------------------------------------------------- */

  Game.prototype.spawnProjectile = function (p) { this.projectiles.push(p); };
  Game.prototype.spawnZone = function (z) { this.zones.push(z); };
  /** src = 예약한 공격 인스턴스(선택). 그 공격이 끊기면 cancelScheduled(src) 로 같이 취소된다 */
  Game.prototype.scheduleProjectile = function (delay, make, cue, src) {
    this.pendingShots.push({ t: delay, make: make, cue: !!cue, src: src || null });
  };

  /** 끊긴 공격이 예약해 둔 발사를 지운다 — "보스를 끊었는데 탄이 그대로 나온다" 를 막는다 (Task 15.1) */
  Game.prototype.cancelScheduled = function (src) {
    if (!src) return;
    for (var i = this.pendingShots.length - 1; i >= 0; i--) {
      if (this.pendingShots[i].src === src) this.pendingShots.splice(i, 1);
    }
  };

  Game.prototype.spawnBeam = function (e) { this.beams.push(e); };
  Game.prototype.spawnPillar = function (e) { this.pillars.push(e); };
  Game.prototype.spawnMark = function (e) { this.marks.push(e); };
  Game.prototype.spawnEcho = function (e) { this.echoes.push(e); };

  /** 새 동작의 월드 엔티티 — 각자 update 하고 죽으면 뺀다 */
  Game.prototype.updateMotionWorld = function (dt) {
    var lists = [this.beams, this.pillars, this.marks, this.echoes];
    for (var k = 0; k < lists.length; k++) {
      var L = lists[k];
      for (var i = L.length - 1; i >= 0; i--) {
        L[i].update(dt, this);
        if (L[i].dead) L.splice(i, 1);
      }
    }
  };

  /**
   * 원격 타격 — 보스 몸이 아닌 곳(표식 폭발·메아리 잔상)에서 온다 (스펙 2026-09-23 §3.1).
   * 퍼펙트 = 훔침, 보스 경직은 없다(멀리서 보스를 끊는 보상은 주지 않는다). 블록·무적·피해는 근접과 같다.
   * @param {{tell:string, def:object, damage:number, fromX:number, label:string, kind:string}} src
   */
  Game.prototype.resolveRemoteHit = function (src) {
    var p = this.player;
    if (this.ko) return;
    if (src.tell === 'gold') {
      var win = p.parryWindow();
      if (win === 'perfect') { this.onPerfectParry(src.def, null); return; }
      if (win === 'block') { this.onBlock(src.def, { x: src.fromX }); return; }
    }
    if (p.isInvulnerable()) return;
    this.damagePlayer(src.damage, src.fromX, 0, { label: src.label, tell: src.tell, kind: src.kind });
  };

  /** 빔이 플레이어에 겹쳤다. 무적(대시)이면 판정하지 않고 계속 살핀다 — 무적이 끝났는데 겹쳐 있으면 맞는다 */
  Game.prototype.onBeamTouch = function (bm) {
    var p = this.player;
    if (this.ko || p.isInvulnerable()) return;
    bm.hitDone = true;
    this.damagePlayer(bm.damage, bm.x, 0, { label: bm.label, tell: 'red', kind: 'beam' });
  };

  /**
   * px 가 들어 있는 칸의 폭 — 살아 있는(설 예정 포함) 기둥과 아레나 벽 사이.
   * @param {Array<{x:number,w:number}>} [extra] 더해 볼 기둥 (새로 세울 자리)
   */
  Game.prototype.cellWidth = function (px, extra) {
    var walls = (extra || []).slice(), left = V.MIN_X, right = V.MAX_X, i;
    for (i = 0; i < this.pillars.length; i++) if (!this.pillars[i].dead) walls.push(this.pillars[i]);
    for (i = 0; i < walls.length; i++) {
      var half = walls[i].w / 2;
      if (walls[i].x < px) left = Math.max(left, walls[i].x + half);
      else right = Math.min(right, walls[i].x - half);
    }
    return right - left;
  };

  /**
   * 기둥이 서려 한다. 그 자리에 있었으면 공간이 있는 쪽 바깥으로 밀려나며 맞는다(대시 중이면 무사).
   * 🔴 서는 순간 한 번 더 잰다 — windup 동안 플레이어가 기둥 자리 너머로 걸어가 칸이 SAFE_MIN_W 보다 좁아지면 서지 않는다.
   * 선 기둥은 플레이어가 있던 쪽(side)을 기억한다 — 블록 밀림 같은 순간 이동이 기둥을 넘어도 그 쪽으로 되돌린다.
   */
  Game.prototype.onPillarRise = function (pl) {
    var p = this.player;
    if (this.ko) { return; }   // side 를 기록하지 않는다 — blockByPillars 가 !pl.side 로 건너뛰어 KO 중엔 아예 밀지 않는다
    var half = pl.w / 2 + C.PLAYER.HALF_W;
    var inside = Math.abs(p.x - pl.x) < half;
    var toLeft = p.x < pl.x;
    if (inside) {
      if (toLeft && pl.x - half < V.MIN_X) toLeft = false;
      if (!toLeft && pl.x + half > V.MAX_X) toLeft = true;
    }
    var nx = inside ? (toLeft ? pl.x - half : pl.x + half) : p.x;
    if (this.cellWidth(nx) < C.ARENA.SAFE_MIN_W) { pl.dead = true; return; }   // 갇힌다 — 서지 않는다
    pl.side = toLeft ? -1 : 1;
    FX.addShake(C.SHAKE.BLOCK);
    FX.sparks(pl.x, V.FLOOR_Y, C.FX.DUST, C.COLORS.GREY,
      { speed: 220, life: 0.4, dir: -Math.PI / 2, spread: Math.PI * 0.8, size: 2.2 });
    RAudio.swing();
    if (!inside) return;
    if (!this.ko && !p.isInvulnerable()) {
      this.damagePlayer(pl.damage, pl.x, 0, { label: pl.label, tell: 'red', kind: 'pillar' });
    }
    p.x = nx;
  };

  /** 잔상이 나타났다 — 플레이어를 보고 무기 끝에서 자기 텔을 찍는다 (잔상 텔 → 타격 = 원 windup) */
  Game.prototype.onEchoFlash = function (e) {
    e.facing = (this.player.x >= e.x) ? 1 : -1;
    var t = Render.tipOf(e.build, e.facing, 'windup');
    var red = e.tell === 'red';
    FX.tellBurst(e.x + t.x, V.FLOOR_Y + t.y, red ? C.COLORS.RED : C.COLORS.GOLD, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
  };

  /** 잔상이 친다 — 원 공격과 같은 reach 로, 잔상 자리 기준 */
  Game.prototype.onEchoStrike = function (e) {
    if (Math.abs(this.player.x - e.x) > e.reach) return;
    this.resolveRemoteHit({ tell: e.tell, def: e.def, damage: e.damage, fromX: e.x, label: e.label, kind: 'echo' });
  };

  /** 선 기둥은 플레이어의 걷기·대시·밀림·끌림·블록 밀림이 넘지 못한다 — 설 때 있던 쪽(side)으로만 자른다 */
  Game.prototype.blockByPillars = function () {
    var p = this.player;
    for (var i = 0; i < this.pillars.length; i++) {
      var pl = this.pillars[i];
      if (pl.pending || pl.dead || !pl.side) continue;
      var lo = pl.x - pl.w / 2 - C.PLAYER.HALF_W, hi = pl.x + pl.w / 2 + C.PLAYER.HALF_W;
      if (pl.side < 0 && p.x > lo) { p.x = lo; if (p.vx > 0) p.vx = 0; p.knock = 0; }
      else if (pl.side > 0 && p.x < hi) { p.x = hi; if (p.vx < 0) p.vx = 0; p.knock = 0; }
    }
  };

  Game.prototype.updateProjectiles = function (dt) {
    var p = this.player, b = this.boss;
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var pr = this.projectiles[i];
      pr.update(dt);

      // 부메랑(스펙 2026-09-23 §3.2) — 플레이어를 turnDist 지나거나 아레나 끝에 닿으면 돌아온다
      if (pr.boomerang && !pr.returning && pr.owner === 'boss') this.turnBoomerang(pr);
      if (pr.dead) { this.projectiles.splice(i, 1); continue; }        // 벽 코앞에서 부서진 부메랑
      // 받지 못한 귀환탄·등 뒤 탄은 **플레이어를 지나간 뒤** 보스에 닿으면 사라진다 (보스가 받는다).
      // 지나가기 전이면 보스 몸을 그냥 통과한다 — 보스가 순간이동해 귀환 경로 위에 서 있어도 탄을 먹지 않게
      if (pr.owner === 'boss' && (pr.returning || pr.fromBehind) && b &&
          (pr.x - p.x) * pr.vx > 0 && Math.abs(pr.x - b.x) <= C.BOSS.HALF_W) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.owner === 'boss' && !this.ko) {
        var d = Math.abs(pr.x - p.x);
        if (!pr.pierced) {
          if (pr.tell === 'gold' && d <= C.PARRY.PROJECTILE_CATCH) {
            var win = p.parryWindow();
            if (win === 'perfect') {
              // 반사 — 투사체는 살아서 보스 쪽으로 되돌아간다 (스펙 §2.3)
              // (성공 유예 PARRY.SUCCESS_GRACE 덕분에 같은 스텝에 겹쳐 온 두 번째 탄도 함께 받는다)
              this.onPerfectParry({ steal: pr.skill }, b, pr);
              continue;
            }
            if (win === 'block') { this.onBlock(null, b, pr); pr.dead = true; }
          }
          if (!pr.dead && d <= C.PROJECTILE.HIT_DIST) {
            if (p.isInvulnerable()) {
              pr.pierced = true;
              if (pr.tell === 'red' && this.tut && !this.tut.dashDone) this.tut.dashDone = true;
            } else {
              this.damagePlayer(pr.damage, pr.x, 0,
                { label: pr.label || 'SHOT', tell: pr.tell, kind: 'projectile' });
              pr.dead = true;
            }
          }
        }
      } else if (pr.owner === 'player' && b && !b.dead) {
        // 되받아치기(스펙 §3.7): 사거리에 들어온 첫 스텝에 한 번만 판정한다
        if (!pr.deflectTried && Math.abs(pr.x - b.x) <= C.BOSS.DEFLECT_REACH) {
          pr.deflectTried = true;
          if (b.tryDeflect(pr)) continue;
        }
        if (Math.abs(pr.x - b.x) <= C.BOSS.HALF_W + pr.r + 6) {
          pr.dead = true;
          /* 엔진 방벽(스펙 §2.4) — 서 있으면 **반사탄**(fromHand 없음)만 벽을 깎고 보스 피해는 없다.
             손패 shot(fromHand 있음)은 벽을 깎지 않는다 — resolveProjectileHitBoss 가 takeDamage→0→환급 경로를 탄다 */
          if (b.wallUp() && !pr.fromHand) this.onWallHit(b, pr, b.wallHit());
          else this.resolveProjectileHitBoss(pr);
        }
      }

      if (pr.dead) this.projectiles.splice(i, 1);
    }
  };

  /**
   * 부메랑 회전. 속도 = 남은 거리 / backTime — 벽 코앞에서 돌아도 "두 번째 텔 → 교차"가 backTime 으로 일정하다.
   * 도는 순간 그 자리에서 텔 버스트(두 번째 예고). 플레이어가 벽에 붙어 받는 거리 안에서 돌게 되면 부서진다 —
   * 예고와 타격이 같은 순간이 되는 억울한 귀환을 만들지 않는다.
   */
  Game.prototype.turnBoomerang = function (pr) {
    var p = this.player, bm = pr.boomerang;
    var dir = pr.vx >= 0 ? 1 : -1;
    var past = (pr.x - p.x) * dir;                                  // 플레이어를 지나간 거리
    var atWall = (dir > 0 && pr.x >= V.MAX_X) || (dir < 0 && pr.x <= V.MIN_X);
    if (past < bm.turnDist && !atWall) return;
    var dist = Math.abs(pr.x - p.x);
    if (dist <= C.PARRY.PROJECTILE_CATCH) {                          // 벽 코앞 — 돌 자리가 없다
      FX.sparks(pr.x, pr.y, C.FX.BLOCK_SPARKS, pr.color, { speed: 160, life: 0.3, size: 2 });
      pr.dead = true;
      return;
    }
    var speed = Math.min(C.MOTION.BOOMERANG_SPEED_MAX, dist / bm.backTime);
    var red = bm.backTell === 'red';
    pr.returning = true;
    pr.vx = -dir * speed;
    pr.tell = bm.backTell;
    pr.color = red ? C.COLORS.RED : C.COLORS.GOLD;
    pr.pierced = false;
    pr.trail.length = 0;
    FX.tellBurst(pr.x, pr.y, pr.color, red ? 'red' : 'gold');
    if (red) RAudio.tellRed(); else RAudio.tellGold();
  };

  /** 반사탄이 방벽에 맞았다 / 방벽이 깨졌다 (스펙 §2.4). broke=true 면 카운터 경직이 열렸다 */
  Game.prototype.onWallHit = function (b, pr, broke) {
    var wx = b.x + b.facing * C.BOSS.WALL_GAP;
    var wy = V.FLOOR_Y - C.BOSS.WALL_H * 0.5;
    if (broke) {
      FX.addHitstop(C.HITSTOP.CHARGE_WALL);
      FX.addShake(C.SHAKE.CHARGE_WALL);
      FX.sparks(wx, wy, C.FX.HIT_SPARKS, b.color, { speed: 360, life: 0.6, size: 3 });
      FX.ring(wx, wy, 8, 90, C.COLORS.COUNTER, 0.35, 3);
      FX.pop(C.BOSS.WALL_BREAK_POP, b.x, V.FLOOR_Y - C.BOSS.HEIGHT - 16, C.COLORS.COUNTER, { size: 19 });
      RAudio.counter();
    } else {
      FX.addShake(C.SHAKE.BLOCK);
      FX.sparks(wx, pr.y, C.FX.BLOCK_SPARKS, b.color, { speed: 240, life: 0.4, size: 2.4 });
      RAudio.parryBlock();
    }
  };

  Game.prototype.resolveProjectileHitBoss = function (pr) {
    var b = this.boss;
    // 손패 shot 도 "참지 못한" 리포스트다 — 자세가 뜬 뒤 시작된 것만 벌한다(최종 리뷰 A).
    // 반사탄(fromHand 없음)은 애초에 리포스트가 아니라 자세를 건드리지 않는다.
    var stance = !b.wallUp() && b.stanceOpen();
    if (stance && pr.fromHand) {
      var sa = b.attack;
      if (pr.riposteT >= sa.hitAt - sa.windupTotal) { b.punishStance(); return; }
    }
    // 자세 윈드업은 카운터 창이 아니다 — 벌하지 않는 동안(반사탄 포함)도 counter 는 끈다(최종 리뷰 B)
    var counter = !stance && ((b.state === 'attack' && b.attack && b.attack.stage === 'windup') ||
                  (b.state === 'stagger' && b.staggerCounter));
    var empowered = this.player.isEmpowered();
    var mult = counter ? C.COMBAT.COUNTER_MULT : 1;
    var dmg = Math.round(pr.damage * mult);
    var applied = b.takeDamage(dmg, { counter: counter });

    // 무적(포효)에 막힘 — 손패에서 쓴 탄이면 슬롯을 돌려준다
    if (applied <= 0) {
      this.refundHand(pr.fromHand);
      this.immunePop(b);
      return;
    }
    // 이 타격이 Phase 2 를 열었다면 포효/무적이 우선한다
    if (this.bossIsInvulnerable(b)) return;

    if (!b.dead) {
      var canInterrupt = !b.armor || empowered;
      if (counter && canInterrupt) b.interrupt(C.COMBAT.COUNTER_FLINCH);
      else if (!b.armor) b.stagger(C.COMBAT.RIPOSTE_FLINCH, false);
    }

    FX.addHitstop(C.HITSTOP.RIPOSTE);
    FX.addShake(C.SHAKE.RIPOSTE);
    var hy = V.FLOOR_Y - C.BOSS.HEIGHT * 0.55;
    FX.sparks(b.x, hy, C.FX.RIPOSTE_SPARKS, C.COLORS.PLAYER, { speed: 290, life: 0.42, size: 2.5 });
    FX.pop('-' + applied, b.x, hy - 20, C.COLORS.WHITE, { size: 20 });
    if (counter) { FX.pop('COUNTER!', b.x, hy - 50, C.COLORS.COUNTER, { size: 19 }); RAudio.counter(); }
    RAudio.riposteHit(false);
  };

  Game.prototype.updateZones = function (dt) {
    for (var i = this.zones.length - 1; i >= 0; i--) {
      this.zones[i].update(dt, this);
      if (this.zones[i].dead) this.zones.splice(i, 1);
    }
  };

  /* ---- 페이즈 2 / KO ------------------------------------------------------ */

  Game.prototype.onPhase2 = function (boss) {
    FX.addHitstop(C.HITSTOP.PHASE2);
    FX.addShake(C.SHAKE.PHASE2);
    FX.flashWhite(C.FLASH.PHASE2_WHITE);
    FX.ring(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, 10, 220, boss.color, 0.6, 4);
    FX.sparks(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, C.FX.PERFECT_SPARKS, boss.color,
      { speed: 420, life: 0.7, size: 3 });
    this.banner = { name: boss.name, title: '— PHASE II', t: 0, phase2: true };
    RAudio.roar();
    RAudio.dronePhase2();
  };

  Game.prototype.onBossDown = function (boss) {
    this.ko = 'victory';
    this.koT = C.SLOWMO.KO_TIME;
    this.result = {
      boss: boss.name, key: boss.key,
      time: this.time, hits: this.hits, perfects: this.perfects,
      tries: this.run.tries[boss.key],
      par: boss.par,
      rank: this.rankFor(this.hits, this.time, boss.par)
    };
    FX.setSlowmo(C.SLOWMO.KO_SCALE, C.SLOWMO.KO_TIME);
    FX.setZoom(C.SLOWMO.KO_ZOOM);
    FX.addShake(C.SHAKE.BOSS_DEATH);
    FX.flashWhite(C.FLASH.DEATH_WHITE);
    FX.sparks(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, C.FX.DEATH_SHARDS, boss.color,
      { speed: 430, life: 1.1, size: 3.4, gravity: 460 });
    FX.ring(boss.x, V.FLOOR_Y - C.BOSS.HEIGHT * 0.5, 10, 180, C.COLORS.WHITE, 0.6, 4);
    RAudio.bossDown();
    RAudio.stopDrone();
  };

  Game.prototype.onPlayerDown = function () {
    this.ko = 'defeat';
    this.koT = C.SLOWMO.DEFEAT_TIME;
    this.result = {
      boss: this.boss ? this.boss.name : '',
      key: this.boss ? this.boss.key : null,
      time: this.time, hits: this.hits, perfects: this.perfects,
      tries: this.boss ? this.run.tries[this.boss.key] : 0,
      slainBy: this.lastHitBy          // 무엇에 죽었는지 → 패배 화면이 대응법을 가르친다
    };
    FX.setSlowmo(C.SLOWMO.DEFEAT_SCALE, C.SLOWMO.DEFEAT_TIME);
    FX.addShake(C.SHAKE.PLAYER_HIT);
    RAudio.defeat();
    RAudio.stopDrone();
  };

  Game.prototype.finishVictory = function () {
    var r = this.result;
    this.lastResult = r;
    this.run.time += r.time;
    this.run.hits += r.hits;
    this.run.perfects += r.perfects;
    this.run.ranks.push(r.rank);
    this.run.bosses.push({ key: r.key, name: r.boss, time: r.time, hits: r.hits, perfects: r.perfects, rank: r.rank, tries: r.tries });

    // 저장 — 진행도 + 보스별 최고 랭크 (?boss=N 판은 메모리 상태도 건드리지 않는다)
    if (!this.noSave) {
      this.save.unlocked = clamp(Math.max(this.save.unlocked, this.bossIndex + 2), 1, this.defs.length);
      // ASSIST 가 켜진 판은 진행만 남기고 랭크·최고 기록은 갱신하지 않는다
      if (this.assistOn()) { this.persist(); FX.setZoom(1); this.setScene('VICTORY'); return; }
      var rec = this.records();
      var prev = rec.ranks[r.key];
      if (!prev || C.RANK.VALUE[r.rank] > C.RANK.VALUE[prev]) rec.ranks[r.key] = r.rank;
      var bt = rec.bestTimes[r.key];
      if (!bt || r.time < bt) rec.bestTimes[r.key] = r.time;
      var bt2 = rec.bestTries[r.key];
      if (!bt2 || r.tries < bt2) rec.bestTries[r.key] = r.tries;
      this.persist();
    }

    FX.setZoom(1);
    this.setScene('VICTORY');
  };

  /* ---- 랭크 (스펙 §2.7) --------------------------------------------------- */

  Game.prototype.rankFor = function (hits, time, par) {
    if (hits <= C.RANK.S_HITS && time <= par) return 'S';
    if (hits <= C.RANK.A_HITS || time <= par) return 'A';
    if (hits <= C.RANK.B_HITS) return 'B';
    return 'C';
  };

  Game.prototype.overallRank = function () {
    var rs = this.run.ranks;
    if (!rs.length) return 'C';
    var sum = 0;
    for (var i = 0; i < rs.length; i++) sum += C.RANK.VALUE[rs[i]];
    var avg = Math.round(sum / rs.length);
    return C.RANK.LETTERS[clamp(avg - 1, 0, 3)];
  };

  /* ---- 튜토리얼 프롬프트 (스펙 §3.1) -------------------------------------- */

  Game.prototype.tutorialPrompt = function () {
    var t = this.tut;
    if (!t || !this.boss || this.scene !== 'FIGHT' || this.ko) return null;
    // 붉은 텔이 한 번이라도 보이면 대시 프롬프트 우선
    if (this.boss.attack && this.boss.attack.tell === 'red') t.redSeen = true;
    if (t.redSeen && !t.dashDone) return C.TUTORIAL.DASH;
    if (this.boss.phase !== 1) return null;
    if (!t.parryDone) return C.TUTORIAL.PARRY;
    if (this.player.hand.length > 0 && !t.riposteDone) return C.TUTORIAL.RIPOSTE;
    return null;
  };

  /* ---- 디버그 훅 (스펙 §7) ------------------------------------------------ */

  Game.prototype.getState = function () {
    var b = this.boss;
    var p = this.player;
    var i, hand = [];
    for (i = 0; i < p.hand.length; i++) hand.push(p.hand[i].id);

    var projs = [];
    for (i = 0; i < this.projectiles.length; i++) {
      var pr = this.projectiles[i];
      if (pr.owner !== 'boss') continue;
      // 부메랑 외출탄은 봇이 관통 대시해야 한다
      projs.push({ x: pr.x, vx: pr.vx, tell: pr.tell, boomerang: !!pr.boomerang, returning: !!pr.returning });
    }

    var zones = [];
    for (i = 0; i < this.zones.length; i++) {
      var z = this.zones[i];
      if (z.struck) continue;
      zones.push({ x: z.x, w: z.w, tRemain: Math.max(0, z.t) });
    }

    /* 새 동작 (스펙 2026-09-23 §3.1) — 봇·테스트가 읽는다 */
    var beams = [], pillars = [], marks = [], echoes = [];
    for (i = 0; i < this.beams.length; i++) {
      var bm = this.beams[i];
      beams.push({ x: bm.x, w: bm.w, vx: bm.vx, pending: bm.pending });
    }
    for (i = 0; i < this.pillars.length; i++) {
      var pl = this.pillars[i];
      pillars.push({ x: pl.x, w: pl.w, tRise: pl.pending ? Math.max(0, pl.t) : 0, up: pl.pending ? pl.up : Math.max(0, pl.up) });
    }
    for (i = 0; i < this.marks.length; i++) {
      var mk = this.marks[i];
      marks.push({ x: mk.x, tRemain: Math.max(0, mk.t), tell: mk.tell });
    }
    for (i = 0; i < this.echoes.length; i++) {
      var ec = this.echoes[i];
      if (ec.stage === 'hit') continue;
      echoes.push({ x: ec.x, reach: ec.reach, tell: ec.tell,
                    hitAt: this.time + (ec.stage === 'wait' ? ec.wait + ec.windup : ec.t) });
    }

    var loot = [];
    if (b && b.loot) for (i = 0; i < b.loot.length; i++) loot.push(b.loot[i].id);
    var ch = this.chapterOf(this.bossIndex);

    return {
      scene: this.scene,
      dev: this.dev,
      menuIndex: this.menuIndex,
      hard: this.hard,
      arena: b ? (b.def.arena || C.ARENA.DEFAULT) : null,
      settings: this.save.settings,
      assist: { hp: this.assistMaxHp(), windup: this.assistWindupMult(), on: this.assistOn() },
      bossId: this.bossIndex + 1,
      chapter: ch ? ch.id : 0,
      story: this.story ? {
        beat: this.story.beat, line: this.story.index, total: this.story.lines.length,
        choice: this.story.choiceState
      } : null,
      bossHp: b ? b.hp : 0,
      bossMaxHp: b ? b.maxHp : 0,
      phase: b ? b.phase : 1,
      playerHp: p.hp,
      stamina: p.stamina,
      playerX: p.x,
      bossX: b ? b.x : 0,
      hand: hand,
      loot: loot,
      streak: p.streak,
      time: this.time,
      hits: this.hits,
      perfects: this.perfects,
      tries: b ? (this.run.tries[b.key] || 0) : 0,
      currentAttack: b ? b.attackState() : null,
      projectiles: projs,
      zones: zones,
      beams: beams,
      pillars: pillars,
      marks: marks,
      echoes: echoes,
      touch: TouchUI.state()
    };
  };

  global.Game = Game;
})(window);
