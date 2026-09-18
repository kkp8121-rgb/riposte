# RIPOSTE 챕터 2 보스 재설계 구현 계획 (차별화 원칙 적용)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 챕터 2 보스 4종을 스펙 §3.5~3.8(2026-09-18 재설계)대로 다시 만들어 `tools/boss-overlap.mjs --check` 를 통과시키고, 봇 3프로파일로 밸런스를 재확정한 뒤 main 에 push 한다.

**Architecture:** 엔진 델타는 이동 스텝 2종(`move:'behind'` 순간이동, `move:'cross'` 달려 넘어감)과 존 앵커(`zone.anchor:'boss'`)뿐이고, 렌더 델타는 실루엣 4종(체형표 4행 + 무기 그리기 3케이스)이다. 보스 4파일은 순수 데이터로 다시 쓴다. 차별화 판정기가 첫 게이트, 봇 실측이 둘째 게이트다. 스토리(대사·이름·목소리)는 건드리지 않는다.

**Tech Stack:** 바닐라 JS(ES5 IIFE, classic `<script>`), Canvas 2D, playwright-core 헤드리스 테스트, Node 24.

**Spec:** `docs/superpowers/specs/2026-09-09-riposte-design.md` §3 공통(차별화 원칙)·§3.5~3.8 · 재설계 근거 `docs/superpowers/specs/2026-09-18-riposte-chapter2-redesign.md`

## Global Constraints

- 바닐라 JS + Canvas 2D, classic `<script>` 순서 로딩. 외부 의존성 0. `file://`·GitHub Pages 동작.
- 매직넘버 금지: 전역 상수는 `js/config.js`, 보스 수치는 각 `js/bosses/*.js`.
- 정의 테이블 불변(`window.BOSSES`·`window.STORY`). 인스턴스 상태는 `Boss` 인스턴스에만.
- 텔 문법: 금 = 패리 가능(`steal` 있음), 적 = 대시(`steal: null`). windup 하한 `BOSS.MIN_WINDUP` 0.34.
- **신규 보스 차별화 원칙(스펙 §3 공통)**: `node tools/boss-overlap.mjs --check` 통과 — 실루엣 동일 금지, 비기본 패턴 모양 겹침 50% 미만, 공격 구성 유사도 75% 미만. 의도된 복제는 `overlapIntended`.
- 챕터 1 보스 파일·봇 튜닝(`TUNE`)·스토리 파일은 바꾸지 않는다.
- 테스트는 `window.__RIPOSTE` 훅만. 브라우저 창 띄우기 금지(헤드리스만).
- 코드 주석은 기존 한국어 스타일. Git author 전역 설정, Conventional Commits, 트레일러 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. push 는 Task 5 에서만.
- 브랜치 `feat/chapter2-redesign` 에서 작업, Task 5 에서 main 으로 fast-forward.

---

## 파일 구조

| 파일 | 변경 |
|---|---|
| `js/config.js` | `BOSS.BLINK_PAUSE`·`BLINK_GHOSTS`·`CROSS_SPEED`·`ZONE_OFFSET_DEFAULT` |
| `js/boss.js` | `nextStep` 이동 분기(`behind`/`cross`), `blinkBehind()`, `beginMove` 의 `cross` 목표·속도, `update` 'move' 케이스 속도, `beginAttack` 존 앵커 |
| `js/render.js` | `BUILD` 4행(`lantern/twin/shield/taker`, 구 `blade/spear` 행 삭제), `WEAPON_LEN` 3키, `drawWeapon` 케이스 3개 |
| `js/bosses/lantern.js` `chorus.js` `bastion.js` `avarice.js` | 전면 재작성(데이터) |
| `docs/qa/balance-2026-09-18.md` | 재실측 |
| `README.md` `CLAUDE.md` `docs/handover.md` 스펙 | 문서 |

---

### Task 1: 엔진·렌더 델타 (이동 스텝 2종, 존 앵커, 실루엣 4종)

**Files:**
- Modify: `js/config.js` (`BOSS` 블록 끝, `DEFLECT_RECOVER` 뒤)
- Modify: `js/boss.js` (`nextStep` 의 `if (step.move)` 앞, `beginMove`, `update` 의 `case 'move'`, `beginAttack` 의 zone 분기, 새 메서드 `blinkBehind`)
- Modify: `js/render.js` (`BUILD` 17-27행, `WEAPON_LEN` 41-43행, `drawWeapon` switch)

**Interfaces:**
- Produces: 스텝 `{ move: 'behind' }`(순간이동), `{ move: 'cross' }`(반대편으로 달려 넘어감), 존 정의 `zone: { w, damage, anchor: 'boss', offset }`, 실루엣 키 `lantern`/`twin`/`shield`/`taker`.

- [ ] **Step 1: `js/config.js` — `BOSS` 블록 끝에 추가**

```js
      DEFLECT_RECOVER: 0.45,      // 되받은 직후 경직 = 카운터 창
      /* 챕터 2 재설계 (스펙 §3.5~3.7) */
      BLINK_PAUSE: 0.12,          // move:'behind' 순간이동 뒤 멈춤 — 잔상을 볼 시간
      BLINK_GHOSTS: 3,            // 순간이동 잔상 수
      CROSS_SPEED: 700,           // move:'cross' 플레이어를 지나쳐 반대편으로 달리는 속도
      SIDE_MIN_RATIO: 0.6,        // 반대편 목표가 prefer.close 의 이 비율보다 가까우면(벽) 이동 스텝을 건너뛴다
      ZONE_OFFSET_DEFAULT: 140    // zone.anchor:'boss' 존의 보스 앞 거리 기본값
    },
```

- [ ] **Step 2: `js/boss.js` — 반대편 목표 헬퍼 + 순간이동 + 달려 넘어가기**

`beginMove` 앞에 헬퍼와 메서드 추가:

```js
  /** 플레이어 반대편 prefer.close 지점. 벽에 막혀 너무 가까우면 null (그 스텝은 건너뛴다) */
  Boss.prototype.oppositeSideX = function () {
    var p = this.game.player;
    var pref = this.def.prefer || { close: 90 };
    var side = (this.x >= p.x) ? 1 : -1;
    var target = clamp(p.x - side * pref.close, V.MIN_X, V.MAX_X);
    if (Math.abs(target - p.x) < pref.close * B.SIDE_MIN_RATIO) return null;
    return target;
  };

  /** 순간이동 — 플레이어 등 뒤로 (스펙 §3.5 LANTERN). 잔상을 남기고 BLINK_PAUSE 만큼 멈춘 뒤 다음 스텝. */
  Boss.prototype.blinkBehind = function () {
    var target = this.oppositeSideX();
    if (target === null) { this.nextStep(); return; }
    var fromX = this.x;
    for (var i = 0; i < B.BLINK_GHOSTS; i++) {
      FX.ghost(fromX + (target - fromX) * (i / B.BLINK_GHOSTS), V.FLOOR_Y, this.facing, this.color, 'dash');
    }
    this.x = target;
    this.vx = 0;
    this.facing = this.dirToPlayer();
    RAudio.swing();
    this.state = 'wait';
    this.stateT = B.BLINK_PAUSE;
  };
```

`nextStep` 의 `if (step.move) { this.beginMove(step.move); return; }` 을 다음으로 교체:

```js
    if (step.move === 'behind') { this.blinkBehind(); return; }
    if (step.move) { this.beginMove(step.move); return; }
```

`beginMove` 교체(`cross` 목표와 이동 속도):

```js
  Boss.prototype.beginMove = function (kind) {
    var p = this.game.player;
    var pref = this.def.prefer || { close: 90, far: 340, back: 200 };
    var side = (this.x >= p.x) ? 1 : -1;
    var target = this.x;
    if (kind === 'close') target = p.x + side * pref.close;
    else if (kind === 'far') target = p.x + side * pref.far;
    else if (kind === 'back') target = this.x + side * pref.back;
    else if (kind === 'left') target = this.x - B.STRAFE;
    else if (kind === 'right') target = this.x + B.STRAFE;
    else if (kind === 'cross') {
      // 플레이어를 지나쳐 반대편으로 (스펙 §3.6 CHORUS) — 벽에 막히면 스텝을 건너뛴다
      var opp = this.oppositeSideX();
      if (opp === null) { this.nextStep(); return; }
      target = opp;
    }
    this.moveTarget = clamp(target, V.MIN_X, V.MAX_X);
    this.moveSpeed = (kind === 'cross') ? B.CROSS_SPEED : B.WALK_SPEED;
    this.state = 'move';
    this.stateT = B.MOVE_TIMEOUT;
  };
```

`update` 의 `case 'move'` 에서 `this.stepTo(this.moveTarget, B.WALK_SPEED, dt)` → `this.stepTo(this.moveTarget, this.moveSpeed || B.WALK_SPEED, dt)`.

`reset()` 에 `this.moveSpeed = B.WALK_SPEED;` 추가(`this.loot = [];` 뒤).

`beginAttack` 의 zone 분기 교체:

```js
    if (def.kind === 'zone') {
      // anchor:'boss' 면 보스 앞 offset 에 고정 (스펙 §3.7 gate), 기본은 플레이어 현재 위치 (rain)
      var zx = (def.zone.anchor === 'boss')
        ? this.x + this.dirToPlayer() * (def.zone.offset === undefined ? B.ZONE_OFFSET_DEFAULT : def.zone.offset)
        : this.game.player.x;
      var z = new Zone({
        x: clamp(zx, V.MIN_X, V.MAX_X),
        w: def.zone.w,
        delay: windupTotal,
        damage: def.zone.damage === undefined ? 1 : def.zone.damage,
        tell: def.tell,
        label: def.label || def.id
      });
      a.zones.push(z);
      this.game.spawnZone(z);
    }
```

- [ ] **Step 3: `js/render.js` — 실루엣**

`BUILD` 를 다음으로 교체(구 `blade`·`spear` 행 삭제 — 더 이상 쓰는 보스가 없다):

```js
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
    taker:   { h: 90,  w: 17, head: 0.084, hood: true,  weapon: 'none',   thick: 8 }
  };
```

`WEAPON_LEN` 에 추가: `dagger: 0.28, twin: 0.30, shield: 0.26`.

`drawWeapon` switch 에 케이스 3개 추가(`spear` 케이스 뒤):

```js
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
```

- [ ] **Step 4: 회귀 확인**

Run: `node tests/state.mjs && node tests/smoke.mjs`
Expected: 둘 다 PASSED (구 챕터 2 보스가 `blade`/`spear` 실루엣을 잃어 `BUILD.player` 로 그려지지만 이 태스크에서는 정상 — Task 2 가 교체한다).

- [ ] **Step 5: Commit**

```bash
git add js/config.js js/boss.js js/render.js
git commit -m "feat(engine): 이동 스텝 behind/cross · 존 앵커 boss · 챕터 2 실루엣 4종" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 보스 4종 재작성 + 차별화 게이트 통과

**Files:**
- Rewrite: `js/bosses/lantern.js`, `js/bosses/chorus.js`, `js/bosses/bastion.js`, `js/bosses/avarice.js`

**Interfaces:**
- Consumes: Task 1 의 스텝·앵커·실루엣, 기존 volley/deflect/stealOnHit/loot/`mirrorIds(boss, game, source)`.
- Produces: 훔친 기술 id FLICKER·GLOW·TWIN·BOLT·VOLLEY·WARD·COUNT.

- [ ] **Step 1: 게이트가 현재 FAIL 임을 확인**

Run: `node tools/boss-overlap.mjs --check` → Expected: `OVERLAP FAILED (4)`.

- [ ] **Step 2: `js/bosses/lantern.js` 전면 교체**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/lantern.js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5 (2026-09-18 재설계)
 * 색 읽기(금/적 쌍둥이) + 등 뒤 순간이동(move:'behind'). 챕터 1 은 보스가 항상 정면에서 온다.
 * 이 파일이 Lantern 의 모든 수치를 소유한다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var LANTERN = {
    key: 'lantern',
    name: 'LANTERN',
    title: 'THE ILLUSIONIST',
    color: '#7dff9a',
    silhouette: 'lantern',
    hp: 280,
    par: 45,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: false,
    spawnX: 660,
    droneHz: 61.74,             // B1
    weaponTip: { dx: 44, dy: 58 },

    prefer: { close: 110, far: 290, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    attacks: {
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      'flicker-red': {                             // flicker 와 동일 박자·리치 — 색만 다르다
        id: 'flicker-red', label: 'FLICKER', tell: 'red', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: null
      },
      glow: {                                      // 느린 빛 구슬 — 패리 시 반사
        id: 'glow', label: 'GLOW', tell: 'gold', kind: 'projectile',
        windup: 0.50, active: 0.06, recover: 0.45,
        proj: { speed: 240, r: 11, y: 50, damage: 1, reflectDamage: 12, shape: 'wave' },
        steal: { id: 'GLOW', label: 'GLOW', kind: 'shot', damage: 12 }
      }
    },

    patterns: {
      1: [
        { name: 'behind-flicker',      steps: [{ move: 'behind' }, { atk: 'flicker' }] },
        { name: 'flicker-red',         steps: [{ atk: 'flicker-red' }] },
        { name: 'glow-behind-flicker', steps: [{ atk: 'glow' }, { move: 'behind' }, { atk: 'flicker' }] },
        { name: 'color-rhythm',        steps: [{ atk: 'flicker' }, { wait: 0.3 }, { atk: 'flicker-red' }, { wait: 0.3 }, { atk: 'flicker' }] }
      ],
      2: [
        { name: 'behind-flicker-red',  steps: [{ move: 'behind' }, { atk: 'flicker-red' }] },
        { name: 'glow-glow-behind',    steps: [{ atk: 'glow' }, { wait: 0.3 }, { atk: 'glow' }, { move: 'behind' }, { atk: 'flicker' }] },
        { name: 'double-blink',        steps: [{ move: 'behind' }, { atk: 'flicker' }, { move: 'behind' }, { atk: 'flicker-red' }] },
        { name: 'red-gold',            steps: [{ atk: 'flicker-red' }, { wait: 0.25 }, { atk: 'flicker' }] }
      ]
    }
  };

  global.BOSSES.push(LANTERN);
})(window);
```

- [ ] **Step 3: `js/bosses/chorus.js` 전면 교체**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/chorus.js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6 (2026-09-18 재설계)
 * 근접 연타(volley 재-windup) + 좌우 교차(move:'cross' — 플레이어를 지나쳐 반대편으로).
 * ========================================================================== */
(function (global) {
  'use strict';

  var CHORUS = {
    key: 'chorus',
    name: 'CHORUS',
    title: 'THE TWIN BLADES',
    color: '#4d9dff',
    silhouette: 'twin',
    hp: 300,
    par: 45,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: false,
    spawnX: 680,
    droneHz: 65.41,             // C2
    weaponTip: { dx: 46, dy: 60 },

    prefer: { close: 115, far: 300, back: 210 },
    gap: { 1: 0.75, 2: 0.5 },

    attacks: {
      twin: {
        id: 'twin', label: 'TWIN', tell: 'gold', kind: 'melee',
        windup: 0.45, active: 0.10, recover: 0.40,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        volley: { count: 2, interval: 0.35 },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      bolt: {
        id: 'bolt', label: 'BOLT', tell: 'gold', kind: 'projectile',
        windup: 0.42, active: 0.06, recover: 0.45,
        proj: { speed: 600, r: 7, y: 52, damage: 1, reflectDamage: 11, shape: 'bolt' },
        steal: { id: 'BOLT', label: 'BOLT', kind: 'shot', damage: 11 }
      },
      triad: {                                     // P2 전용 3연타
        id: 'triad', label: 'TRIAD', tell: 'gold', kind: 'melee',
        windup: 0.50, active: 0.10, recover: 0.45,
        reach: 150, approach: 60, damage: 1, swing: 'arc',
        volley: { count: 3, interval: 0.35 },
        steal: { id: 'TWIN', label: 'TWIN', kind: 'slash', damage: 13 }
      },
      scissor: {                                   // P2 전용 — 양쪽을 동시에 베는 가위, 대시로만 회피
        id: 'scissor', label: 'SCISSOR', tell: 'red', kind: 'melee',
        windup: 0.70, active: 0.12, recover: 0.70,
        reach: 200, approach: 40, damage: 1, swing: 'arc',
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'cross-twin',       steps: [{ move: 'cross' }, { atk: 'twin' }] },
        { name: 'twin',             steps: [{ atk: 'twin' }] },
        { name: 'bolt-cross-twin',  steps: [{ atk: 'bolt' }, { move: 'cross' }, { atk: 'twin' }] },
        { name: 'weave',            steps: [{ move: 'cross' }, { atk: 'twin' }, { move: 'cross' }, { atk: 'twin' }] }
      ],
      2: [
        { name: 'triad',            steps: [{ atk: 'triad' }] },
        { name: 'cross-triad-scissor', steps: [{ move: 'cross' }, { atk: 'triad' }, { atk: 'scissor' }] },
        { name: 'bolt-bolt-cross-triad', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { move: 'cross' }, { atk: 'triad' }] },
        { name: 'scissor',          steps: [{ atk: 'scissor' }] }
      ]
    }
  };

  global.BOSSES.push(CHORUS);
})(window);
```

- [ ] **Step 4: `js/bosses/bastion.js` 전면 교체**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/bastion.js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기 + 문). 스펙 §3.7 (2026-09-18 재설계)
 * gate 는 보스 앞에 고정되는 적색 존(zone.anchor:'boss') — 문이 닫히면 원거리만 통한다.
 * 되받아치기(boss.js tryDeflect)가 전투의 축. 돌진은 GRAVEN 과 겹쳐 없앴다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var BASTION = {
    key: 'bastion',
    name: 'BASTION',
    title: 'THE WARDEN',
    color: '#a8b8c8',
    silhouette: 'shield',
    hp: 310,
    par: 50,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: true,
    deflect: true,              // 확률·사거리·경직은 CONFIG.BOSS.DEFLECT_*
    spawnX: 700,
    droneHz: 46.25,             // F#1
    weaponTip: { dx: 44, dy: 68 },

    prefer: { close: 170, far: 360, back: 220 },
    gap: { 1: 0.75, 2: 0.55 },

    attacks: {
      salvo: {                                     // 지면 투사체 — 반사되면 deflect 대상
        id: 'salvo', label: 'VOLLEY', tell: 'gold', kind: 'projectile',
        windup: 0.65, active: 0.10, recover: 0.55,
        proj: { speed: 280, r: 13, y: 18, damage: 1, reflectDamage: 20, shape: 'wave' },
        steal: { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 20 }
      },
      gate: {                                      // 문 — 보스 앞 고정 존, 대시로만 통과
        id: 'gate', label: 'GATE', tell: 'red', kind: 'zone',
        windup: 1.00, active: 0.10, recover: 0.60,
        zone: { w: 220, damage: 1, anchor: 'boss', offset: 140 },
        steal: null
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: 0.80, active: 0.12, recover: 0.60,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 30 }
      }
    },

    patterns: {
      1: [
        { name: 'salvo',           steps: [{ atk: 'salvo' }] },
        { name: 'gate-salvo',      steps: [{ atk: 'gate' }, { atk: 'salvo' }] },
        { name: 'far-salvo-salvo', steps: [{ move: 'far' }, { atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'ward',            steps: [{ atk: 'ward' }] }
      ],
      2: [
        { name: 'gate-rally',      steps: [{ atk: 'gate' }, { atk: 'salvo' }, { wait: 0.4 }, { atk: 'salvo' }, { wait: 0.4 }, { atk: 'salvo' }] },
        { name: 'far-gate',        steps: [{ move: 'far' }, { atk: 'gate' }] },
        { name: 'ward-gate',       steps: [{ atk: 'ward' }, { atk: 'gate' }] },
        { name: 'salvo-far-salvo', steps: [{ atk: 'salvo' }, { move: 'far' }, { atk: 'salvo' }] }
      ]
    }
  };

  global.BOSSES.push(BASTION);
})(window);
```

- [ ] **Step 5: `js/bosses/avarice.js` 전면 교체**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/avarice.js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8 (2026-09-18 재설계)
 * 자기 기술이 없다: 패턴이 직접 부르는 공격은 count(금)·plunder(적) 둘뿐이고,
 * 나머지는 빼앗은 손패({mirror:'loot'})와 플레이어 손패({mirror:'all'})를 되돌려 쓴다.
 * 되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다 — 차별화 검사에 overlapIntended 로 선언.
 * ========================================================================== */
(function (global) {
  'use strict';

  var WINDUP_MULT = 0.80;
  var BASE_WINDUP = { thrust: 0.60, slash: 0.50, arrow: 0.45, slam: 0.85, flicker: 0.55, glow: 0.50, ward: 0.80 };
  function w(k) { return +(BASE_WINDUP[k] * WINDUP_MULT).toFixed(4); }

  /* 손패 기술 id → 이 보스의 되돌림 공격 id */
  var MIRROR_MAP = {
    THRUST: 'thrust', SLASH: 'slash', KICK: 'slash', ARROW: 'arrow', SHOCKWAVE: 'arrow', SLAM: 'slam',
    FLICKER: 'flicker', GLOW: 'glow', TWIN: 'slash', BOLT: 'arrow', VOLLEY: 'arrow', WARD: 'ward', COUNT: 'count'
  };

  var AVARICE = {
    key: 'avarice',
    name: 'AVARICE',
    title: 'THE TAKER',
    color: '#ff2fa6',
    silhouette: 'taker',
    overlapIntended: '되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다 (스펙 §3.8)',
    hp: 400,
    par: 55,                    // 출발점 — Task 3 봇 실측으로 확정
    armor: false,
    stealOnHit: true,
    spawnX: 680,
    droneHz: 41.20,             // E1
    weaponTip: { dx: 40, dy: 60 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    mirrorGap: 0.35,
    fallbackAttack: 'count',    // loot·손패가 비면 — 플레이어가 첫 카드를 훔칠 유일한 금색
    windupMultNote: WINDUP_MULT,
    mirrorMap: MIRROR_MAP,

    attacks: {
      /* ---- 직접 호출하는 둘 ------------------------------------------------ */
      count: {                                     // "하나, 둘, 셋" — 느린 큰 휘두르기 (금)
        id: 'count', label: 'COUNT', tell: 'gold', kind: 'melee',
        windup: 0.90, active: 0.14, recover: 0.70,
        reach: 190, approach: 50, damage: 1, swing: 'arc',
        steal: { id: 'COUNT', label: 'COUNT', kind: 'slash', damage: 15 }
      },
      plunder: {                                   // 적 잡기 — 손패 전부 강탈, 대시로만 회피
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'melee',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 230, approach: 90, damage: 1, swing: 'thrust', plunder: true,
        steal: null
      },
      /* ---- 되돌림용 (패턴이 직접 부르지 않는다) --------------------------- */
      thrust: {
        id: 'thrust', label: 'THRUST', tell: 'gold', kind: 'melee',
        windup: w('thrust'), active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'THRUST', label: 'THRUST', kind: 'lunge', damage: 16 }
      },
      slash: {
        id: 'slash', label: 'SLASH', tell: 'gold', kind: 'melee',
        windup: w('slash'), active: 0.10, recover: 0.46,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: { id: 'SLASH', label: 'SLASH', kind: 'slash', damage: 14 }
      },
      arrow: {
        id: 'arrow', label: 'ARROW', tell: 'gold', kind: 'projectile',
        windup: w('arrow'), active: 0.06, recover: 0.42,
        proj: { speed: 560, r: 8, y: 50, damage: 1, reflectDamage: 10, shape: 'arrow' },
        steal: { id: 'ARROW', label: 'ARROW', kind: 'shot', damage: 10 }
      },
      slam: {
        id: 'slam', label: 'SLAM', tell: 'gold', kind: 'melee',
        windup: w('slam'), active: 0.12, recover: 0.60,
        reach: 180, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'SLAM', label: 'SLAM', kind: 'slam', damage: 28 }
      },
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: w('flicker'), active: 0.10, recover: 0.48,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      glow: {
        id: 'glow', label: 'GLOW', tell: 'gold', kind: 'projectile',
        windup: w('glow'), active: 0.06, recover: 0.42,
        proj: { speed: 240, r: 11, y: 50, damage: 1, reflectDamage: 12, shape: 'wave' },
        steal: { id: 'GLOW', label: 'GLOW', kind: 'shot', damage: 12 }
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: w('ward'), active: 0.12, recover: 0.56,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 30 }
      }
    },

    patterns: {
      1: [
        { name: 'loot',        steps: [{ mirror: 'loot' }] },
        { name: 'loot-loot',   steps: [{ mirror: 'loot' }, { mirror: 'loot' }] },
        { name: 'close-loot',  steps: [{ move: 'close' }, { mirror: 'loot' }] },
        { name: 'plunder',     steps: [{ atk: 'plunder' }] }
      ],
      2: [
        { name: 'mirror-hand', steps: [{ mirror: 'all' }] },
        { name: 'loot-chain',  steps: [{ mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }, { wait: 0.3 }, { mirror: 'loot' }] },
        { name: 'plunder-loot', steps: [{ atk: 'plunder' }, { mirror: 'loot' }] },
        { name: 'count',       steps: [{ atk: 'count' }] }
      ]
    },

    /* ---- 훅: 'loot' 이면 빼앗은 손패, 그 외엔 플레이어 손패를 되돌린다 ---------- */
    mirrorIds: function (boss, game, source) {
      var src = (source === 'loot') ? boss.loot : game.player.hand;
      var ids = [];
      for (var i = 0; i < src.length; i++) {
        var id = MIRROR_MAP[src[i].id];
        if (id) ids.push(id);
      }
      if (!ids.length) ids.push(boss.def.fallbackAttack);
      return ids;
    }
  };

  global.BOSSES.push(AVARICE);
})(window);
```

- [ ] **Step 6: 게이트·회귀**

Run: `node tools/boss-overlap.mjs --check` → Expected: `OVERLAP PASSED` (LANTERN·CHORUS·BASTION OK, AVARICE 의도된 복제).
Run: `node tests/state.mjs` → `STATE PASSED` (8보스).
Run: `node tests/bot.mjs --boss=5`, `--boss=6`, `--boss=7`, `--boss=8` → 각 VICTORY, page errors 0. 봇이 지면 수치를 바꾸지 말고 결과(outcome·time·stats·slain by)를 리포트에 적는다 — Task 3 몫. **단 다음은 이 태스크에서 고친다**: page error, 보스가 6초 watchdog 에 반복해서 걸리는 것(`behind`/`cross` 가 벽에서 무한 skip 되는 등), AVARICE 가 금색을 한 번도 안 내는 교착.

- [ ] **Step 7: Commit**

```bash
git add js/bosses/lantern.js js/bosses/chorus.js js/bosses/bastion.js js/bosses/avarice.js
git commit -m "feat(bosses): 챕터 2 보스 4종 재설계 — 순간이동·좌우 교차·문·되돌림 연쇄, 차별화 게이트 통과" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 봇 3프로파일 재실측 · 밸런스 재확정

**Files:**
- Modify(수치만): `js/bosses/{lantern,chorus,bastion,avarice}.js` (hp / par / gap / interval / 피해), 필요 시 `js/config.js` 의 `BOSS.DEFLECT_*`·`BLINK_PAUSE`·`CROSS_SPEED`
- Create: `docs/qa/balance-2026-09-18.md`

- [ ] **Step 1~3**: `node tests/bot.mjs --all --seed=7` / `--jitter=0.05 --miss=0.15 --think=0.25` / `--miss=0.3 --jitter=0.09 --think=0.45`. 기준: perfect 8/8 · skilled 8/8 · average 는 챕터 2 어딘가 DEFEAT · par = 숙련 time ×2(5초 단위) · perfect time 이 par/3 아래면 par 하향.
- [ ] **Step 4: 조정 규칙** — 한 번에 한 레버. 죽음의 원인은 봇 DEFEAT 로그의 `slain by` 로 본다. 미스 기반 죽음이면 텔 수(피해 상향·HP 하향)를, 특정 공격이면 그 공격의 windup/reach/interval 을. `behind` 직후 공격을 못 받으면 `BLINK_PAUSE` 를 0.12→0.18. `cross` 중 피격이 많으면 `CROSS_SPEED` 를 낮추지 말고 `weave` 패턴의 두 번째 cross 를 뺀다. 챕터 1·TUNE·MIN_WINDUP·MIN_VOLLEY_GAP 불변.
- [ ] **Step 5**: 최종 수치로 세 프로파일 재실행 → 표·채택/폐기 레버·이유를 `docs/qa/balance-2026-09-18.md` 에. `node tests/state.mjs && node tests/smoke.mjs && node tools/boss-overlap.mjs --check` PASS.
- [ ] **Step 6: Commit** `tune(ch2): 재설계 보스 4종 봇 3프로파일 실측으로 par/HP 확정` (+ 트레일러).

---

### Task 4: 문서

**Files:** `README.md`(보스 표 챕터 2 행의 "What it teaches / What you take"), `CLAUDE.md`(테스트 줄에 `tools/boss-overlap.mjs --check`), `docs/handover.md`(교훈 8: 차별화 기준 부재 → 원칙·게이트, 재실측 결과 링크), 스펙 §3.5~3.8 의 par/HP 를 Task 3 최종값으로, `docs/superpowers/specs/2026-09-18-riposte-chapter2-redesign.md` 상태를 "구현 완료" 로. `tools/shots.mjs` 로 `docs/media/` 재촬영(mirror-phase2 는 `?boss=4` 그대로).
- [ ] Commit `docs: 챕터 2 재설계 반영 — README 보스 표·CLAUDE.md 게이트·handover 교훈 8·스펙 수치` (+ 트레일러).

---


### Task 4b: 트라이 수 — 승리 카드·INTERLUDE·ENDING·DEFEAT 표시 + 최소 기록 저장 (스펙 §2.6, 2026-09-18 사용자 요청)

**Files:**
- Modify: `js/game.js` (`newRun`, `loadSave`/세이브 필드, `startBoss`, `onBossDown`/`onPlayerDown` result, `finishVictory` 저장, `getState`)
- Modify: `js/ui.js` (`drawVictory` rows, `drawDefeat`, `drawInterlude` 행, `drawEnding` 행)
- Modify: `tests/smoke.mjs` (R 재도전 뒤 `getState().tries === 2` 단언)
- Modify: `js/config.js` (`RANK` 또는 `SCENE` 근처에 표시 문구 상수 `TRIES: { LABEL: 'TRIES', BEST: 'best', TRY: 'TRY' }`)

**Interfaces:**
- Produces: `game.run.tries[key]`(number), `result.tries`, `run.bosses[].tries`, `save.bestTries[key]`, `getState().tries`.

- [ ] **Step 1: `tests/smoke.mjs` 먼저** — 기존 "R retry skips STORY" 체크 뒤에 추가:

```js
  const s4 = await page.evaluate(state);
  check('retry counts as a second try', s4.tries === 2, `(tries ${s4.tries})`);
```
Run → Expected: FAIL (`tries undefined`).

- [ ] **Step 2: `js/game.js`**
  - `newRun()` 반환에 `tries: {}` 추가.
  - `loadSave` 의 fallback 과 반환 객체에 `bestTries: o.bestTries || {}`.
  - `startBoss` 에서 `def` 를 잡은 직후: `this.run.tries[def.key] = (this.run.tries[def.key] || 0) + 1;`
  - `onBossDown` result 와 `onPlayerDown` result 에 `tries: this.run.tries[boss.key]` / `this.run.tries[this.boss.key]`.
  - `finishVictory` 의 `run.bosses.push({...})` 에 `tries: r.tries`; 저장 블록에 `var bt2 = this.save.bestTries[r.key]; if (!bt2 || r.tries < bt2) this.save.bestTries[r.key] = r.tries;`
  - `getState()` 에 `tries: this.boss ? (this.run.tries[this.boss.key] || 0) : 0`.
- [ ] **Step 3: `js/ui.js`**
  - `drawVictory` rows 에 `[C.TRIES.LABEL, String(r.tries) + (best && best < r.tries ? '   (' + C.TRIES.BEST + ' ' + best + ')' : '')]` — `best = game.save.bestTries[r.key]`. 카드 높이(`L.CARD_H`)가 4행을 담도록 26px 늘리고 랭크·프롬프트 y 도 같이 내린다.
  - `drawDefeat` 의 보스명 줄에 `  ·  TRY N` 추가(`r.tries`).
  - `drawInterlude` 행과 `drawEnding` 행에 `b.tries + ' try'` 열 추가(기존 hit/perfect 열과 같은 스타일, x 위치는 겹치지 않게 조정).
- [ ] **Step 4: `node tests/smoke.mjs && node tests/state.mjs` PASS**, 스크린샷 1장(`?boss=1` 로 들어가 봇 승리 후 VICTORY 카드 — `tools/shots.mjs` 의 perfect-parry 블록 방식 재사용)으로 카드 레이아웃 육안 확인.
- [ ] **Step 5: Commit** `feat(ui): 보스별 트라이 수 — 승리 카드·챕터 카드·엔딩·패배 화면 표시 + 최소 기록 저장` (+ 트레일러).

---
### Task 5: 최종 검증 · 머지 · push

- [ ] `node tools/boss-overlap.mjs --check && node tests/story.mjs && node tests/state.mjs && node tests/audio-smoke.mjs && node tests/smoke.mjs && node tests/bot.mjs --all` 전부 PASS.
- [ ] `git checkout main && git merge --ff-only feat/chapter2-redesign && git push origin main` (자격증명 헬퍼는 저장소 로컬에 이미 설정됨 — `kkp8121-rgb`).
- [ ] Pages 반영은 계정 결제 상태에 막혀 있다(2026-09-17 확인). push 후 `gh run list -R kkp8121-rgb/riposte --limit 1` 로 워크플로 생성 여부만 기록.

## Self-Review

- 스펙 커버리지: §3.5(behind·glow·색 교대) T1/T2 · §3.6(cross·volley·scissor) T1/T2 · §3.7(gate 앵커·deflect·아머) T1/T2 · §3.8(count fallback·loot 연쇄·overlapIntended) T2 · 차별화 원칙(§3 공통) T2 게이트 · 밸런스 재확정 T3 · 문서 T4.
- 타입 일관성: `oppositeSideX()` 를 `blinkBehind`/`beginMove('cross')` 가 공유 · `moveSpeed` 는 `reset`/`beginMove`/`update` 세 곳 · 존 `anchor/offset` 은 `beginAttack` 한 곳 · 실루엣 키 4개가 BUILD·보스 파일에서 동일 · 훔친 기술 id 가 AVARICE `MIRROR_MAP` 에 전부 존재(FLICKER·GLOW·TWIN·BOLT·VOLLEY·WARD·COUNT).
- 교착 검사: AVARICE 는 loot·손패가 비면 `count`(금) 로 떨어지므로 플레이어가 항상 첫 카드를 훔칠 수 있다.
