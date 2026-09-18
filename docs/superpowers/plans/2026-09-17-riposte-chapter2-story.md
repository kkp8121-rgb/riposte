# RIPOSTE 챕터 2(보스 5~8) + 헬테이커식 스토리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 스펙대로 보스 4종(LANTERN·CHORUS·BASTION·AVARICE)과 전투 경계 대화(STORY)·챕터 INTERLUDE·새 ENDING 을 추가해 8보스 게임을 완성하고, 전 테스트 통과 후 `kkp8121-rgb/riposte` main 에 push 한다.

**Architecture:** 콘텐츠는 전부 데이터 테이블(`js/bosses/*.js`, `js/story.js`)이고 엔진 변경은 세 가지뿐이다 — 근접 연타(melee volley, 재-windup), 되받아치기(deflect), 약탈(stealOnHit/loot). 화면은 `game.js` 상태 머신에 `STORY`·`INTERLUDE` 장면 2개를 더하고 `ui.js` 가 그린다. 진행·저장은 지금처럼 `window.BOSSES` 순서를 따르고 챕터 경계만 `config.CHAPTERS` 가 정한다.

**Tech Stack:** 바닐라 JS(ES5 스타일, classic `<script>`), Canvas 2D, WebAudio 합성, playwright-core 1.63 헤드리스 테스트(`node tests/*.mjs`), Node 24.

**Spec:** `docs/superpowers/specs/2026-09-09-riposte-design.md` (§2.6·2.7·3.5~3.8·6·7·8·10) · 대사 정본 `docs/superpowers/specs/2026-09-17-riposte-story-bible.md` · 설계 근거 `docs/superpowers/specs/2026-09-17-riposte-chapter2-proposal.md`

## Global Constraints

- 바닐라 JS + Canvas 2D, **classic `<script>` 태그 순서 로딩**. ES module·CDN·외부 폰트·이미지·오디오 파일 **0**. `file://` 과 GitHub Pages 하위 경로 모두에서 동작.
- **매직넘버 금지**: 전역 상수는 `js/config.js`, 보스 수치는 각 `js/bosses/*.js` 로컬 테이블. 코드 로직에 숫자를 쓰지 않는다.
- **정의 테이블 불변**: `window.BOSSES`·`window.STORY` 는 절대 변형하지 않는다. 인스턴스 상태(loot 등)는 `Boss` 인스턴스에만 둔다(`tests/state.mjs` 가 검사).
- 텔 문법: 금 = 패리, 적 = 대시. 플래시 → 타격 시간은 공격별 일정. windup 하한 `BOSS.MIN_WINDUP` 0.34s.
- 대사: 한국어 정본, 한 장면 ≤ 4줄, 느낌표 0, 보스별 전속 어미(바이블 §3 표). 보스 이름·챕터 제목·엔딩 문구는 영어.
- 테스트는 디버그 훅 `window.__RIPOSTE` 만 사용. 브라우저 자동 실행(`start`/`open`) 금지, 헤드리스만.
- 코드 주석은 기존 파일과 같은 한국어 스타일. 영어 기술 용어는 통용어 또는 원어(deflect, loot, volley).
- Git: author = 전역 설정(BHS), 커밋은 Conventional Commits, 트레일러 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. push 는 Task 8 에서만, `kkp8121-rgb` 계정으로.
- 작업 폴더: `C:\Projects\riposte` (worktree 미사용 — 단독 저장소, main 직접 작업. 커밋 단위로 되돌릴 수 있게 Task 마다 커밋).

## 스펙과 다른 설계 결정 2건 (구현 중 발견 — Task 7 에서 스펙에 반영)

1. **근접 연타(§3.6)는 `wait` 스텝이 아니라 한 공격의 `volley` 로 만든다.** 기존 엔진은 공격 생명주기가 windup→active→recover 라 `[twin, wait .32, twin]` 은 실제 타격 간격이 recover+wait+windup ≈ 1.2s 가 된다(GRAVEN double slam 도 같은 방식이라 "0.35s 간격" 이 실제로는 1.85s). 연속 패리를 가르치려면 타격이 정말 0.35s 간격이어야 하므로, 근접 공격 정의에 `volley: { count, interval }` 을 두고 active 가 끝나면 recover 대신 **짧은 windup 으로 되돌아가 새 금색 플래시를 찍는다**(각 타격이 예고되고 패리·훔침 가능). interval 하한 `BOSS.MIN_VOLLEY_GAP` = **0.35**(= `MIN_WINDUP` 0.34 보다 크고 `PERFECT_WINDOW`+`RECOVERY_ON_SUCCESS` 0.28 보다 큼). 투사체의 기존 `volley` 필드와 같은 이름·같은 모양.
2. **deflect 확률은 게임 RNG(`game.rng.chance`) 를 쓴다.** 스펙 §7 "보스 패턴 선택만 RNG" 에 두 번째 소비자가 생긴다 — 결정론(`?seed`)은 유지된다. Task 7 에서 §7 문장을 고친다.

---

## 파일 구조

| 파일 | 역할 | 이번 변경 |
|---|---|---|
| `js/config.js` | 전역 상수 SSoT | `FONT` 한글 폴백, `BOSS.MIN_VOLLEY_GAP`·`DEFLECT_*`, `CHAPTERS`, `STORY`, `ENDING`, `HAND.LOOT_*`, `AUDIO.BPM` 4키, `SCENE.INTERLUDE_MIN` |
| `js/rng.js` | 시드 RNG | 변경 없음(`chance(p)` 이미 있음) |
| `js/boss.js` | 보스 베이스 | `loot` 인스턴스 큐, `mirror:'loot'`, melee volley 재-windup, `tryDeflect(pr)` |
| `js/bosses/lantern.js` `chorus.js` `bastion.js` `avarice.js` | 챕터 2 데이터 | 신규 4파일 |
| `js/story.js` | 대사 테이블 `window.STORY` | 신규 |
| `js/entities.js` | Player/Projectile/Zone | `Projectile.reflect()` 에서 `deflectTried` 리셋, `rally` 필드 |
| `js/game.js` | 상태 머신 | stealOnHit/plunder, deflect 호출, 챕터·INTERLUDE·advanceAfterBoss, STORY 상태 머신, getState 확장, 세이브 마이그레이션 |
| `js/render.js` | 드로잉 | `BUILD.blade`·`BUILD.spear`, `Render.drawStoryScene` |
| `js/ui.js` | HUD·화면 | `drawStory`·`drawTaken`·`drawInterlude`, `drawEnding` 재구성, loot 슬롯, 타이틀 CONTINUE 문구 |
| `js/main.js` | 부트 | `?story=0`, `?boss=N`→noStory, draw 분기 2개, getState 그대로 |
| `index.html` | 로딩 순서 | 보스 4파일 + `js/story.js` 태그 |
| `tests/story.mjs` | 대사 테이블 검사(브라우저 없음) | 신규 |
| `tests/state.mjs` | 정의 불변 | 8보스 + `window.STORY` 스냅샷 |
| `tests/smoke.mjs` | 부팅·흐름 | STORY 통과·선택지·R 재도전 시 STORY 없음 |
| `tests/bot.mjs` | 반응형 봇 | `--all` 이 `BOSSES.length` 를 따름 |
| `tests/audio-smoke.mjs` | 오디오 | 타이틀 경로 URL 에 `&story=0` |
| `README.md` `CLAUDE.md` `docs/handover.md` 스펙 | 문서 | Task 7 |

---

### Task 1: 상수·실루엣·대사 테이블·대사 검사 (엔진 무관, 브라우저 불필요)

**Files:**
- Modify: `js/config.js` (`FONT` 52-56, `BOSS` 128-150, `AUDIO.BPM` 279, `SCENE` 235-238, `HAND` 101-107, 파일 끝 `TUTORIAL` 뒤에 새 섹션)
- Modify: `js/render.js:17-23` (`BUILD`)
- Create: `js/story.js`
- Modify: `index.html:24-28`
- Create: `tests/story.mjs`

**Interfaces:**
- Produces: `CONFIG.CHAPTERS[]`, `CONFIG.STORY.*`, `CONFIG.ENDING.*`, `CONFIG.BOSS.MIN_VOLLEY_GAP/DEFLECT_*`, `CONFIG.HAND.LOOT_*`, `CONFIG.SCENE.INTERLUDE_MIN`, `window.STORY[bossKey] = { before, after, choice? }`, `BUILD.blade/spear`.

- [ ] **Step 1: `tests/story.mjs` 를 먼저 쓴다 (실패해야 정상)**

```js
/* =============================================================================
 * RIPOSTE — tests/story.mjs
 * 대사 테이블(js/story.js) 검사 — 브라우저 없이 node 만으로 돈다.
 *   - 챕터 테이블의 8보스 전부에 대사가 있다
 *   - 장면(before/after)당 1~STORY.MAX_LINES 줄, 줄당 40자 이하, before 첫 줄은 콜드 오픈
 *   - 느낌표 0 (바이블 §2: 톤은 부호 예산으로 결정)
 *   - 선택지 3개(vesper·lantern·avarice): ok:true 하나 + ok:false 하나
 *   - 보스별 전속 어미가 다른 보스에 새지 않는다 (바이블 §3 표)
 *   node tests/story.mjs
 * ========================================================================== */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* classic script 를 가짜 window 에 로드한다 */
const window = {};
window.window = window;
for (const f of ['js/config.js', 'js/story.js']) {
  vm.runInNewContext(readFileSync(join(ROOT, f), 'utf8'), { window });
}
const C = window.CONFIG;
const STORY = window.STORY;

const failures = [];
function check(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`);
  else { console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`); failures.push(name); }
}
const textOf = (line) => (typeof line === 'string' ? line : line.text);
const bosses = C.CHAPTERS.flatMap((ch) => ch.bosses);

check('STORY table exists', !!STORY && typeof STORY === 'object');
check('8 bosses in CHAPTERS', bosses.length === 8, `(${bosses.join(',')})`);

const allLines = [];   // { boss, text, kind }
for (const key of bosses) {
  const s = STORY[key];
  check(`${key}: has story`, !!s && Array.isArray(s.before) && Array.isArray(s.after));
  if (!s) continue;
  for (const beat of ['before', 'after']) {
    const lines = s[beat];
    check(`${key}.${beat}: 1..${C.STORY.MAX_LINES} lines`, lines.length >= 1 && lines.length <= C.STORY.MAX_LINES, `(${lines.length})`);
    lines.forEach((l, i) => allLines.push({ boss: key, text: textOf(l), kind: beat }));
    check(`${key}.${beat}: every line <= 40 chars`, lines.every((l) => [...textOf(l)].length <= 40));
  }
  check(`${key}.before[0]: cold open (hideSpeaker)`, typeof s.before[0] === 'object' && s.before[0].hideSpeaker === true);
  if (s.choice) {
    check(`${key}.choice.at is before|after`, s.choice.at === 'before' || s.choice.at === 'after');
    const oks = [s.choice.K.ok, s.choice.J.ok].filter(Boolean).length;
    check(`${key}.choice: exactly one correct answer`, oks === 1);
    allLines.push({ boss: key, text: s.choice.K.reply, kind: 'reply' });
    allLines.push({ boss: key, text: s.choice.J.reply, kind: 'reply' });
  }
}
const withChoice = bosses.filter((k) => STORY[k] && STORY[k].choice);
check('exactly 3 choices (vesper, lantern, avarice)', withChoice.join(',') === 'vesper,lantern,avarice', `(${withChoice.join(',')})`);

check('zero exclamation marks', allLines.every((l) => !/!/.test(l.text)));

/* 전속 어미 — 문장 끝(.|?) 직전 문자열 */
const leak = (re, owner) => allLines.filter((l) => l.boss !== owner && re.test(l.text)).map((l) => `${l.boss}: ${l.text}`);
check('~네 only VESPER', leak(/네[.?]/, 'vesper').length === 0, leak(/네[.?]/, 'vesper').join(' | '));
check('~거든. only SERAPH', leak(/거든\./, 'seraph').length === 0, leak(/거든\./, 'seraph').join(' | '));
check('~잖아/~는데 only MIRROR', leak(/(잖아|는데)[.?]/, 'mirror').length === 0, leak(/(잖아|는데)[.?]/, 'mirror').join(' | '));
check('~군. only BASTION', leak(/군[.?]/, 'bastion').length === 0, leak(/군[.?]/, 'bastion').join(' | '));
const lanternLines = allLines.filter((l) => l.boss === 'lantern');
const lanternPlain = lanternLines.filter((l) => !/\?$/.test(l.text.trim()));
check('LANTERN: all questions but exactly one plain line', lanternPlain.length === 1, `(${lanternPlain.map((l) => l.text).join(' | ')})`);

const short = allLines.filter((l) => [...l.text.replace(/[\s.,?…"'\/()]/g, '')].length <= 10).length;
check('>= 30% lines are 10 chars or fewer', short / allLines.length >= 0.3, `(${short}/${allLines.length})`);

console.log('');
if (failures.length) { console.log(`STORY FAILED (${failures.length}): ${failures.join(', ')}`); process.exit(1); }
console.log(`STORY PASSED — ${allLines.length} lines, table consistent with the bible`);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/story.mjs`
Expected: 예외 또는 FAIL (`js/story.js` 없음 → `ENOENT`).

- [ ] **Step 3: `js/config.js` 수정**

`FONT` 블록(52-56행)을 다음으로 교체:

```js
    FONT: {
      /* 한글 대사(스펙 §10)를 위해 OS 한글 폰트를 폴백에 둔다 — 외부 폰트 로드는 없다 */
      UI: '"Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif',
      TITLE: '"Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Helvetica, Arial, sans-serif',
      MONO: 'ui-monospace, Consolas, "Courier New", monospace'
    },
```

`HAND` 블록(101-107행)에 loot 슬롯 상수 추가:

```js
    HAND: {
      SIZE: 3,
      SLOT_W: 92,
      SLOT_H: 40,
      SLOT_GAP: 10,
      BOTTOM_MARGIN: 18,
      /* 약탈 보스(스펙 §3.8)가 빼앗아 간 손패 — 보스 HP 바 아래 작은 슬롯 */
      LOOT_SLOT_W: 64,
      LOOT_SLOT_H: 20,
      LOOT_GAP: 6,
      LOOT_Y: 56,
      LOOT_LABEL: 'TAKEN'
    },
```

`BOSS` 블록 끝(`HURT_FLASH: 0.12` 뒤)에 추가:

```js
      HURT_FLASH: 0.12,
      /* 근접 연타(volley) — active 가 끝나면 recover 대신 이 간격의 짧은 windup 으로 되돌아가
         새 플래시를 찍는다 (스펙 §3.6). MIN_WINDUP(0.34)·PERFECT_WINDOW+RECOVERY_ON_SUCCESS(0.28) 보다 커야 한다. */
      MIN_VOLLEY_GAP: 0.35,
      /* 되받아치기(deflect) — 스펙 §3.7. 플레이어 쪽 투사체가 이 거리 안이면 판정 */
      DEFLECT_REACH: 120,
      DEFLECT_CHANCE_P1: 0.6,
      DEFLECT_CHANCE_P2: 0.9,
      DEFLECT_FORCE_RALLY: 3,     // 랠리 3회째부터는 반드시 되받는다 (2026-09-18 폐기: DEFLECT_MAX_RALLY 상한으로 반전 — 무한 랠리 결함)
      DEFLECT_SPEED_MULT: 1.25,
      DEFLECT_SPEED_MAX: 720,
      DEFLECT_RECOVER: 0.45       // 되받은 직후 경직 = 카운터 창
    },
```

`SCENE` 블록(235-238행):

```js
    SCENE: {
      INTRO_TIME: 1.2,
      PHASE2_BANNER: 1.4,
      INTERLUDE_MIN: 0.4        // 챕터 카드가 뜬 직후 Enter 를 받지 않는 시간 (연타 방지)
    },
```

`AUDIO.BPM`(279행):

```js
      BPM: { vesper: 96, seraph: 104, graven: 84, mirror: 116,
             lantern: 100, chorus: 120, bastion: 88, avarice: 124 }
```

`TUTORIAL` 블록 뒤(294행 `}` 다음, `};` 앞)에 새 섹션 3개 추가:

```js
    },

    /* ---- 챕터 (스펙 §3 공통) — 진행은 BOSSES 순서, 경계만 여기서 정한다 ------- */
    CHAPTERS: [
      { id: 1, name: 'CHAPTER I',  subtitle: 'THE HAND', bosses: ['vesper', 'seraph', 'graven', 'mirror'] },
      { id: 2, name: 'CHAPTER II', subtitle: 'THE DEBT', bosses: ['lantern', 'chorus', 'bastion', 'avarice'] }
    ],

    /* ---- 스토리 (스펙 §10) ---------------------------------------------- */
    STORY: {
      CPS: 24,                 // 타자기 속도 (한글 글자/초)
      SKIP_HOLD: 0.6,          // Enter 를 이만큼 누르고 있으면 장면 스킵
      MAX_LINES: 4,
      TAKEN_FLASH: 0.4,        // 오답 카드 붉은 비네트
      ENDING_SLOT_DROP: 0.4,   // 엔딩에서 손패가 한 칸씩 비는 간격
      DISSOLVE: 0.8,           // AVARICE 정답 반응 중 실루엣 소멸 시간
      SCALE: 1.6,              // 대화 장면 실루엣 배율
      PLAYER_X: 250,
      BOSS_X: 710,
      BOX_X: 90, BOX_Y: 386, BOX_W: 780, BOX_H: 124,
      TEXT_X: 130, TEXT_Y: 448,
      SPEAKER_Y: 412,
      TEXT_SIZE: 19,
      SPEAKER_SIZE: 12,
      CHOICE_Y: 440, CHOICE_GAP: 28,
      UNKNOWN_SPEAKER: '???',
      TAKEN_TEXT: 'TAKEN.',
      PROMPT_NEXT: 'ENTER',
      PROMPT_SKIP: 'HOLD ENTER  —  SKIP',
      VOICE_SPLIT: ' / '       // CHORUS 두 목소리 교대 구분자
    },

    /* ---- 엔딩 카드 (스펙 §10) ------------------------------------------- */
    ENDING: {
      LINES: ['NOTHING IS GIVEN.', 'EVERYTHING IS TAKEN.', 'NOTHING IS KEPT.'],
      LINE_Y: [54, 84, 114],
      ROWS_Y: 152,
      ROW_H: 22,
      SLOTS_Y: 438
    }
  };
```

(주의: 기존 `TUTORIAL` 블록의 닫는 `}` 뒤에 쉼표를 붙이고 위 세 섹션을 넣은 뒤 `};` 로 닫는다.)

- [ ] **Step 4: `js/render.js` `BUILD` 에 실루엣 2종 추가 (17-23행)**

```js
  var BUILD = {
    player:  { h: 76,  w: 15, head: 0.085, hood: false, weapon: 'none',   thick: 7 },
    mirror:  { h: 76,  w: 15, head: 0.085, hood: false, weapon: 'none',   thick: 7 },
    rapier:  { h: 84,  w: 13, head: 0.078, hood: false, weapon: 'rapier', thick: 6 },
    bow:     { h: 84,  w: 16, head: 0.095, hood: true,  weapon: 'bow',    thick: 7 },
    hammer:  { h: 98,  w: 27, head: 0.090, hood: false, weapon: 'hammer', thick: 12 },
    /* 챕터 2 (스펙 §3.5~3.6) — 무기 그리기(blade/spear)는 drawWeapon 에 이미 있다 */
    blade:   { h: 84,  w: 14, head: 0.082, hood: false, weapon: 'blade',  thick: 6 },
    spear:   { h: 86,  w: 14, head: 0.080, hood: true,  weapon: 'spear',  thick: 6 }
  };
```

- [ ] **Step 5: `js/story.js` 작성 (바이블 §6 v3 그대로 — 한 글자도 바꾸지 않는다)**

```js
/* =============================================================================
 * RIPOSTE — js/story.js
 * 대사 테이블 window.STORY (보스 key → before / after / choice). 스펙 §10.
 * 정본은 docs/superpowers/specs/2026-09-17-riposte-story-bible.md 다 — 대사를 고칠 땐 그쪽을 먼저 고친다.
 * 정의 테이블이다: 절대 변형하지 않는다 (tests/state.mjs 가 불변을 검사한다).
 *
 * 줄 형식: 문자열 | { text, hideSpeaker: true }(콜드 오픈 — 화자 라벨 ???).
 *          '……' 만 있는 줄은 침묵행(타자기 없이 즉시 표시).
 *          ' / ' 는 CHORUS 두 목소리 교대(ui 가 색을 번갈아 칠한다).
 * choice: { at: 'before'|'after', K: { text, ok, reply }, J: { text, ok, reply, dissolve? } }
 *         K = PARRY(받아넘김) / J = RIPOSTE(되받아침). ok:false 의 reply 는 TAKEN 카드 본문.
 *         dissolve:true 는 reply 중 보스 실루엣이 사라진다(AVARICE 정답 — 엔딩 직전).
 * ========================================================================== */
(function (global) {
  'use strict';

  function cold(text) { return { text: text, hideSpeaker: true }; }

  var STORY = {
    vesper: {
      before: [
        cold('검이 없네.'),
        '빈손으로 여기까지 오다니. 겁이 없는 건가, 생각이 없는 건가.',
        '검은 닿기 전에 빛나네. 금빛이 보이면 받아치게.',
        '그래서, 항복인가?'
      ],
      choice: {
        at: 'before',
        K: { text: '아직.', ok: true,  reply: '아직, 이라. 좋네. 나도 아직일세.' },
        J: { text: '절대.', ok: false, reply: '\'절대\' 는 검 쥔 사람이나 하는 말일세. 자네 손엔 뭐가 있나.' }
      },
      after: [
        '잘 받았네.',
        '찌르기, 그거. 스무 해 내 것이었지. 그 전엔 스승님 것이었고.',
        '다음은 궁수일세. 자네를 가까이 두지 않을 걸세.'
      ]
    },

    seraph: {
      before: [
        cold('거기 서.'),
        '더 오면 쏜다.',
        '네가 그 빈손? 결투가 찌르기를 뺏었다는.',
        '난 안 뺏겨. 쏜 건 다 돌아오거든.'
      ],
      after: [
        '……그게 돌아와?',
        '가져가. 어차피 빌린 화살이야.',
        '다음은 거한. 아무리 쳐도 안 아파하는 놈이거든.'
      ]
    },

    graven: {
      before: [
        cold('쳐 봐.'),
        '안 아파.',
        '세 번 받아내고 쳐.'
      ],
      after: [
        '……',
        '아팠다.',
        '망치, 받은 거 아니다. 뺏었다.',
        '다음은 거울. 너다.'
      ]
    },

    mirror: {
      before: [
        cold('어서 와, 나.'),
        '어떻게 하는지 알잖아. 나한테 배웠는데.',
        '다 가지면 뭐가 되는지, 보여 줘.'
      ],
      after: [
        '그게 다 가진 나야.',
        '안 어울리는데. 누구한테도 안 어울렸는데.',
        '그 사람이 찾으러 올 거야. 빌려주기만 하고, 주는 법은 없는 사람.'
      ]
    },

    lantern: {
      before: [
        cold('손님? 아, 그 빈손 손님?'),
        '그 사람이 손님 짐을 세고 있는 건 알아?',
        '퀴즈. 이 손엔 금, 저 손엔 빨강. 어느 쪽 받을래?'
      ],
      choice: {
        at: 'before',
        K: { text: '금.',   ok: false, reply: '금이 어디 있었을까? 손님, 색 보고 움직인 거 맞아?' },
        J: { text: '거짓말.', ok: true,  reply: '정답. 그거, 빠르게도 돼?' }
      },
      after: [
        '색을 본 거야? 습관을 이긴 거야?',
        '다들 습관 때문에 죽는데, 손님은 뭘로 죽을까?',
        '다음은 둘. 하나가 아니야.'
      ]
    },

    chorus: {
      before: [
        cold('홀수다. / 홀수가 왔다.'),
        '하나가 묻고. / 하나가 답한다.',
        '그 사이에 / 네 자리는 없다.'
      ],
      after: [
        '사이. / 사이를 찾았다.',
        '둘 다 가져가라. / 처음부터 하나였다.',
        '문지기가 문을 지킨다. / 그 뒤에 우리 빚이 있다.'
      ]
    },

    bastion: {
      before: [
        cold('다음.'),
        '뭘 보내든 돌려보낸다. 그게 내 일이다.',
        '이 문 넘은 놈은 없다. 한 놈도.'
      ],
      after: [
        '……한 놈 생겼군.',
        '들어가라. 문 열렸다고 전해라.',
        '돈 받는 동안은 잘 지켰다고도. 그 사람, 셈은 정확하니까.'
      ]
    },

    avarice: {
      before: [
        cold('어서 오세요, 고객님.'),
        '이 집 검도, 활도, 망치도 전부 대여품입니다. 빌려드린 거죠. 제가.',
        '하나, 둘, 셋. 잘도 걷어 오셨더군요.',
        '괜찮습니다. 저도 걷는 사람이라서요.'
      ],
      after: [
        '……가져가십시오. 전부.',
        '하나만 여쭙죠. 전부 가진 고객님은, 뭡니까?'
      ],
      choice: {
        at: 'after',
        K: { text: '빈손.', ok: true,  reply: '빈손……이요. 그럼, 여기엔', dissolve: true },
        J: { text: '전부.', ok: false, reply: '그럼 고객님이 그걸 가진 게 아니라, 그게 고객님을 가진 거죠.' }
      }
    }
  };

  global.STORY = STORY;
})(window);
```

- [ ] **Step 6: `index.html` 스크립트 태그 (24-27행 뒤)**

```html
  <script src="js/bosses/vesper.js"></script>
  <script src="js/bosses/seraph.js"></script>
  <script src="js/bosses/graven.js"></script>
  <script src="js/bosses/mirror.js"></script>
  <script src="js/bosses/lantern.js"></script>
  <script src="js/bosses/chorus.js"></script>
  <script src="js/bosses/bastion.js"></script>
  <script src="js/bosses/avarice.js"></script>
  <script src="js/story.js"></script>
  <script src="js/render.js"></script>
```

(보스 파일 4개는 Task 3 에서 만든다. Task 1 시점에 `index.html` 을 미리 바꾸면 브라우저가 404 를 내므로 **이 스텝은 Task 3 Step 6 에서 실행**한다 — 여기서는 최종 형태만 적어 둔다. Task 1 에서는 `<script src="js/story.js"></script>` 한 줄만 `mirror.js` 태그 뒤에 넣는다.)

- [ ] **Step 7: 통과 확인**

Run: `node tests/story.mjs`
Expected: `STORY PASSED — 57 lines, table consistent with the bible` (줄 수는 51±6 범위면 정상 — 선택지 reply 6줄 포함).

Run: `node tests/smoke.mjs`
Expected: 기존과 동일하게 `SMOKE PASSED` (config/render/story 추가만으로 기존 흐름이 깨지지 않는다).

- [ ] **Step 8: Commit**

```bash
git add js/config.js js/render.js js/story.js index.html tests/story.mjs
git commit -m "feat(story): 대사 테이블 js/story.js + 챕터/스토리 상수 + 실루엣 blade/spear + tests/story.mjs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 엔진 — 근접 연타(volley)·되받아치기(deflect)·약탈(loot)·챕터 진행

**Files:**
- Modify: `js/boss.js` (`reset` 47-76, `nextStep` mirror 분기 137-152, `beginAttack` a 객체 222-238, `updateAttack` active 분기 321-329, 새 메서드 `tryDeflect`)
- Modify: `js/entities.js` (`Projectile` 생성자 230-247, `reflect` 257-264)
- Modify: `js/game.js` (`loadSave` 16-31, `stepVictory` 243-255, `step` switch 209-216, `resolveBossHit` 472-473, `damagePlayer` 564-584, `updateProjectiles` 624-629, `getState` 801-818, 새 메서드)

**Interfaces:**
- Consumes: `CONFIG.BOSS.MIN_VOLLEY_GAP/DEFLECT_*`, `CONFIG.CHAPTERS`, `CONFIG.SCENE.INTERLUDE_MIN` (Task 1).
- Produces:
  - 보스 정의 필드: `attacks[x].volley = { count, interval }` (melee 에서는 재-windup 연타), `def.deflect = true`, `def.stealOnHit = true`, `attacks[x].plunder = true`, 스텝 `{ mirror: 'loot' }`, 훅 `def.mirrorIds(boss, game, source)` (source = 'all' | 'loot' | 기타).
  - `Boss.prototype.tryDeflect(pr) -> boolean`, `boss.loot: skill[]`.
  - `Game.prototype.advanceAfterBoss()`, `Game.prototype.afterVictory()`, `Game.prototype.chapterOf(index) -> chapter|null`, `Game.prototype.isChapterEnd(index) -> boolean`, `Game.prototype.chapterRank(chapter) -> 'S'|'A'|'B'|'C'`, 장면 `'INTERLUDE'`, `getState().loot`, `getState().chapter`.

- [ ] **Step 1: `js/boss.js` — 인스턴스 loot 큐 (`reset`, 73행 `this.chargeDir = -1;` 뒤)**

```js
    this.chargeDir = -1;
    /* 약탈 보스(스펙 §3.8)가 빼앗아 간 손패. 정의 테이블(def)이 아니라 인스턴스에만 둔다. */
    this.loot = [];
```

- [ ] **Step 2: `js/boss.js` — `mirror:'loot'` (137-152행 교체)**

```js
    if (step.mirror) {
      // 'all' = 플레이어 손패 전부, 'loot' = 빼앗은 손패 전부, 그 외 = 손패 맨 앞 하나
      var ids = this.def.mirrorIds ? this.def.mirrorIds(this, this.game, step.mirror) : null;
      if (!ids || !ids.length) { this.beginAttack(this.def.fallbackAttack || 'thrust', {}); return; }
      if (step.mirror === 'all' || step.mirror === 'loot') {
        var ins = [];
        for (var i = 0; i < ids.length; i++) {
          ins.push({ atk: ids[i] });
          if (i < ids.length - 1) ins.push({ wait: this.def.mirrorGap || 0.35 });
        }
        Array.prototype.splice.apply(this.pattern, [this.stepIndex, 0].concat(ins));
      } else {
        this.pattern.splice(this.stepIndex, 0, { atk: ids[0] });
      }
      this.nextStep();
      return;
    }
```

- [ ] **Step 3: `js/boss.js` — melee volley (재-windup 연타)**

`beginAttack` 의 `a` 객체(222-238행)에 필드 하나 추가:

```js
      zones: [],                    // 이 공격이 깐 존 — 취소되면 같이 사라져야 한다
      hitsDone: 0,                  // 근접 연타(volley) — 끝난 타격 수
      damage: def.damage === undefined ? 1 : def.damage
```

`updateAttack` 의 active 분기(321-329행)를 교체:

```js
    if (a.stage === 'active') {
      if (def.kind === 'melee' && !a.hasHit) this.testMelee(a);
      a.t -= dt;
      if (a.t <= 0) {
        a.hitsDone++;
        // 근접 연타(스펙 §3.6): recover 대신 짧은 windup 으로 되돌아가 새 플래시를 찍는다.
        // 각 타격이 예고되므로 전부 패리·훔침 가능하다 (텔 문법 §2.2 유지).
        if (def.kind === 'melee' && def.volley && a.hitsDone < def.volley.count) {
          var gap = Math.max(B.MIN_VOLLEY_GAP, def.volley.interval);
          a.stage = 'windup';
          a.t = gap;
          a.windupTotal = gap;
          a.hitAt = this.game.time + gap;
          a.hasHit = false;
          a.lungeDone = 0;
          a.feintFlashed = true;
          this.flash(def.tell);
          return;
        }
        a.stage = 'recover';
        a.t = def.recover * (this.phase === 2 ? 0.9 : 1);
      }
      return;
    }
```

- [ ] **Step 4: `js/boss.js` — `tryDeflect` (`attackState` 앞, 622행 `/* ---- 디버그 훅용 상태` 위에 추가)**

```js
  /* ---- 되받아치기 (스펙 §3.7) --------------------------------------------- */

  /**
   * 플레이어 쪽에서 되돌아오는 투사체를 되받아친다. true 면 투사체는 다시 보스 것이 됐다.
   * 조건: def.deflect, 살아 있음, 무적 아님, idle/wait/move 또는 공격 recover 중.
   * 랠리(pr.rally)가 DEFLECT_FORCE_RALLY 회째부터는 반드시 되받는다.
   * (2026-09-18 폐기: DEFLECT_MAX_RALLY 상한으로 반전 — 무한 랠리 결함)
   * 되받은 직후 DEFLECT_RECOVER 만큼 경직 = 모든 리포스트가 카운터 판정(stagger counter).
   */
  Boss.prototype.tryDeflect = function (pr) {
    if (!this.def.deflect || this.dead || this.invuln > 0) return false;
    var open = this.state === 'idle' || this.state === 'wait' || this.state === 'move' ||
               (this.state === 'attack' && this.attack && this.attack.stage === 'recover');
    if (!open) return false;

    var rally = pr.rally || 0;
    var chance = (rally + 1 >= B.DEFLECT_FORCE_RALLY) ? 1  // (2026-09-18 폐기: DEFLECT_MAX_RALLY 상한으로 반전 — 무한 랠리 결함)
               : (this.phase === 2 ? B.DEFLECT_CHANCE_P2 : B.DEFLECT_CHANCE_P1);
    if (!this.game.rng.chance(chance)) return false;

    pr.rally = rally + 1;
    var speed = Math.min(B.DEFLECT_SPEED_MAX, Math.abs(pr.vx) * B.DEFLECT_SPEED_MULT);
    pr.vx = (pr.vx > 0 ? -1 : 1) * speed;      // 플레이어 쪽으로 되돌린다
    pr.owner = 'boss';
    pr.tell = 'gold';                          // 다시 패리 가능 (텔 문법 유지)
    pr.color = C.COLORS.GOLD;
    pr.skill = pr.fromHand || pr.skill || null; // 다시 퍼펙트 패리하면 훔친다
    pr.reflectDamage = pr.damage;              // 되돌리면 같은 피해로 보스에게 간다
    pr.damage = 1;                             // 보스 투사체 피해 = 하트 1
    pr.fromHand = null;
    pr.pierced = false;
    pr.trail.length = 0;

    this.cancelAttackSpawns();
    this.attack = null;
    this.pendingAttack = null;
    this.stagger(B.DEFLECT_RECOVER, true);      // 되받은 직후 = 카운터 창

    var tip = this.weaponTip();
    FX.sparks(tip.x, tip.y, C.FX.BLOCK_SPARKS, C.COLORS.GOLD, { speed: 240, life: 0.32, size: 2.2 });
    FX.pop('DEFLECT', this.x, V.FLOOR_Y - B.HEIGHT - 14, C.COLORS.GOLD, { size: 15 });
    RAudio.parryBlock();
    return true;
  };
```

- [ ] **Step 5: `js/entities.js` — Projectile 필드 2개**

생성자(243행 `this.shape = ...` 뒤):

```js
    this.shape = o.shape || 'arrow';     // 'arrow' | 'wave' | 'bolt'
    this.rally = 0;                      // 되받아치기(deflect) 횟수 — 스펙 §3.7
    this.deflectTried = false;           // 이번 왕복에서 deflect 판정을 이미 했는가
```

`reflect`(257-264행) 끝에 리셋 추가:

```js
  Projectile.prototype.reflect = function () {
    this.vx = -this.vx * C.PROJECTILE.REFLECT_MULT;
    this.owner = 'player';
    this.tell = 'player';
    this.color = C.COLORS.PLAYER;
    this.damage = this.reflectDamage || this.damage;
    this.trail.length = 0;
    this.deflectTried = false;           // 새 왕복 — 보스가 다시 되받을 수 있다
  };
```

- [ ] **Step 6: `js/game.js` — deflect 호출 (`updateProjectiles` 624-629행 교체)**

```js
      } else if (pr.owner === 'player' && b && !b.dead) {
        // 되받아치기(스펙 §3.7): 사거리에 들어온 첫 스텝에 한 번만 판정한다
        if (!pr.deflectTried && Math.abs(pr.x - b.x) <= C.BOSS.DEFLECT_REACH) {
          pr.deflectTried = true;
          if (b.tryDeflect(pr)) continue;
        }
        if (Math.abs(pr.x - b.x) <= C.BOSS.HALF_W + pr.r + 6) {
          pr.dead = true;
          this.resolveProjectileHitBoss(pr);
        }
      }
```

- [ ] **Step 7: `js/game.js` — 약탈 (stealOnHit / plunder)**

`resolveBossHit` 의 `damagePlayer` 호출(472-473행)에 `plunder` 전달:

```js
    this.damagePlayer(a.damage, boss.x, a.def.push,
      { label: a.def.label || a.id, tell: a.tell, kind: a.def.kind, plunder: !!a.def.plunder });
```

`damagePlayer`(564-584행)에서 `if (src) this.lastHitBy = src;` 뒤에 추가:

```js
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
```

- [ ] **Step 8: `js/game.js` — 챕터 · INTERLUDE · advanceAfterBoss**

`step` 의 switch(209-216행)에 장면 추가:

```js
      case 'VICTORY': this.stepVictory(dt); break;
      case 'INTERLUDE': this.stepInterlude(dt); break;
      case 'DEFEAT':  this.stepDefeat(dt); break;
```

`stepVictory`(243-255행) 교체:

```js
  Game.prototype.stepVictory = function (dt) {
    if (Input.consume('confirm')) { RAudio.ui(true); this.afterVictory(); }
    if (Input.consume('back')) this.goTitle();
  };

  /** 승리 카드 다음 — Task 4 에서 STORY(after) 분기가 앞에 붙는다 */
  Game.prototype.afterVictory = function () {
    this.advanceAfterBoss();
  };

  /** 다음 보스 / 챕터 카드 / 엔딩 (스펙 §2.6) */
  Game.prototype.advanceAfterBoss = function () {
    if (this.bossIndex + 1 >= this.defs.length) {
      if (!this.noSave) {                // 완주 — 타이틀 문구가 바뀐다
        this.save.cleared = true;
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
```

`finishVictory`(731행) 의 `run.bosses.push` 에 `key` 를 넣는다:

```js
    this.run.bosses.push({ key: r.key, name: r.boss, time: r.time, hits: r.hits, perfects: r.perfects, rank: r.rank });
```

생성자(77행 `this.run = this.newRun();` 뒤):

```js
    this.run = this.newRun();
    this.endingHand = [];
```

- [ ] **Step 9: `js/game.js` — 세이브 마이그레이션 (`loadSave` 24-29행 교체)**

```js
      var unlocked = clamp(o.unlocked || 1, 1, n);   // 보스 수는 테이블이 결정한다
      var cleared = !!o.cleared;
      // 챕터 2 추가(2026-09-17) 전에 챕터 1 을 완주한 세이브: 4보스 기준 cleared 였으면
      // 5번째 보스부터 이어 간다 (스펙 §6 "Continue — CHAPTER II")
      if (cleared && unlocked < n) { cleared = false; unlocked = Math.min(n, unlocked + 1); }
      return {
        unlocked: unlocked,
        cleared: cleared,
        ranks: o.ranks || {},
        bestTimes: o.bestTimes || {}
      };
```

- [ ] **Step 10: `js/game.js` — `getState` 확장 (801-818행)**

`hand` 다음에 `loot`, `zones` 다음에 `chapter` 를 추가:

```js
    var loot = [];
    if (b && b.loot) for (i = 0; i < b.loot.length; i++) loot.push(b.loot[i].id);
    var ch = this.chapterOf(this.bossIndex);

    return {
      scene: this.scene,
      bossId: this.bossIndex + 1,
      chapter: ch ? ch.id : 0,
      bossHp: b ? b.hp : 0,
      bossMaxHp: b ? b.maxHp : 0,
      phase: b ? b.phase : 1,
      playerHp: p.hp,
      playerX: p.x,
      bossX: b ? b.x : 0,
      hand: hand,
      loot: loot,
      streak: p.streak,
      time: this.time,
      hits: this.hits,
      perfects: this.perfects,
      currentAttack: b ? b.attackState() : null,
      projectiles: projs,
      zones: zones
    };
```

- [ ] **Step 11: 회귀 확인 (엔진 변경이 챕터 1 을 깨지 않는다)**

Run: `node tests/state.mjs`
Expected: `STATE PASSED` (4보스 기준 — Task 3 에서 8로 늘린다).

Run: `node tests/bot.mjs --all`
Expected: `BOT PASSED` — 4보스 전부 VICTORY, passive DEFEAT. (INTERLUDE 는 4번째 뒤에 뜨지 않는다 — `isChapterEnd` 는 뒤에 보스가 있을 때만 true.)

- [ ] **Step 12: Commit**

```bash
git add js/boss.js js/entities.js js/game.js
git commit -m "feat(engine): 근접 연타 volley·되받아치기 deflect·약탈 loot·챕터 INTERLUDE 진행" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 챕터 2 보스 4종 데이터 + 정의 불변 테스트 8보스

**Files:**
- Create: `js/bosses/lantern.js`, `js/bosses/chorus.js`, `js/bosses/bastion.js`, `js/bosses/avarice.js`
- Modify: `index.html:24-28` (Task 1 Step 6 의 최종 형태)
- Modify: `tests/state.mjs` (`snapshot` 37-40, 루프 81)

**Interfaces:**
- Consumes: Task 2 의 정의 필드(`volley`, `deflect`, `stealOnHit`, `plunder`, `mirrorIds(boss, game, source)`, `{ mirror: 'loot' }`).
- Produces: `window.BOSSES[4..7]` = lantern, chorus, bastion, avarice (로딩 순서 = 진행 순서). 훔친 기술 id: FLICKER, SWEEP, TWIN, BOLT, WARD, VOLLEY.

- [ ] **Step 1: `tests/state.mjs` 를 8보스 + STORY 로 확장 (먼저 — 새 보스가 없으면 FAIL 이어야 한다)**

`snapshot`(37-40행) 교체:

```js
/** 정의 테이블 스냅샷 — 함수는 JSON 에 안 실리므로 키 목록도 같이 찍는다. 대사 테이블도 불변이다. */
const snapshot = () => JSON.stringify({
  defs: window.BOSSES,
  shape: window.BOSSES.map((b) => Object.keys(b).sort().join(',')),
  story: window.STORY
});
```

루프(81행) 와 마지막 메시지(106행) 교체:

```js
  const count = await (async () => {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1', { waitUntil: 'load' });
    await until(p, () => !!window.__RIPOSTE, 5000);
    const n = await p.evaluate(() => window.BOSSES.length);
    await p.close();
    return n;
  })();
  check('8 bosses registered', count === 8, `(got ${count})`);

  for (let n = 1; n <= count; n++) {
```

```js
  console.log(`STATE PASSED — boss & story definitions immutable across all ${count} fights  [${secs}s]`);
```

Run: `node tests/state.mjs` → Expected: `FAIL  8 bosses registered (got 4)`.

- [ ] **Step 2: `js/bosses/lantern.js` (스펙 §3.5)**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/lantern.js
 * LANTERN — 환술사 (챕터 2 첫 보스). 스펙 §3.5
 * 같은 박자·같은 리치의 금/적 쌍둥이 공격. 리듬 암기가 통하지 않고 색이 정보의 전부다.
 * 이 파일이 Lantern 의 모든 수치를 소유한다. 엔진 변경 0.
 * ========================================================================== */
(function (global) {
  'use strict';

  var LANTERN = {
    key: 'lantern',
    name: 'LANTERN',
    title: 'THE ILLUSIONIST',
    color: '#7dff9a',
    silhouette: 'blade',
    hp: 280,
    par: 40,
    armor: false,
    spawnX: 660,
    droneHz: 61.74,            // B1
    weaponTip: { dx: 48, dy: 58 },

    prefer: { close: 110, far: 290, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    /* ---- 공격 테이블 — 금/적 쌍둥이는 색 말고 전부 같다 ------------------- */
    attacks: {
      flicker: {
        id: 'flicker', label: 'FLICKER', tell: 'gold', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: { id: 'FLICKER', label: 'FLICKER', kind: 'lunge', damage: 18 }
      },
      'flicker-red': {
        id: 'flicker-red', label: 'FLICKER', tell: 'red', kind: 'melee',
        windup: 0.55, active: 0.10, recover: 0.50,
        reach: 160, approach: 80, damage: 1, swing: 'thrust',
        steal: null
      },
      sweep: {
        id: 'sweep', label: 'SWEEP', tell: 'gold', kind: 'melee',
        windup: 0.48, active: 0.10, recover: 0.48,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: { id: 'SWEEP', label: 'SWEEP', kind: 'slash', damage: 15 }
      },
      'sweep-red': {                               // P2 전용
        id: 'sweep-red', label: 'SWEEP', tell: 'red', kind: 'melee',
        windup: 0.48, active: 0.10, recover: 0.48,
        reach: 130, approach: 30, damage: 1, swing: 'arc',
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.5) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'flicker',        steps: [{ atk: 'flicker' }] },
        { name: 'flicker-red',    steps: [{ atk: 'flicker-red' }] },
        { name: 'sweep-flicker',  steps: [{ atk: 'sweep' }, { wait: 0.3 }, { atk: 'flicker' }] },
        { name: 'close-sweep',    steps: [{ move: 'close' }, { atk: 'sweep' }] }
      ],
      2: [
        { name: 'flicker-flicker-red', steps: [{ atk: 'flicker' }, { wait: 0.25 }, { atk: 'flicker-red' }] },
        { name: 'sweep-red-flicker',   steps: [{ atk: 'sweep-red' }, { wait: 0.25 }, { atk: 'flicker' }] },
        { name: 'feint-flicker',       steps: [{ feint: 'flicker' }] },
        { name: 'back-flicker-red',    steps: [{ move: 'back' }, { atk: 'flicker-red' }] }
      ]
    }
  };

  global.BOSSES.push(LANTERN);
})(window);
```

- [ ] **Step 3: `js/bosses/chorus.js` (스펙 §3.6 — volley 는 한 공격의 연타)**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/chorus.js
 * CHORUS — 쌍검 (챕터 2). 스펙 §3.6
 * 근접 연타(volley): 한 공격이 count 번 타격하고 타격 사이는 interval 의 짧은 windup +
 * 새 플래시다 (boss.js updateAttack). 성공 시 단축 리커버리(§2.3)를 몸으로 익힌다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var CHORUS = {
    key: 'chorus',
    name: 'CHORUS',
    title: 'THE TWIN BLADES',
    color: '#4d9dff',
    silhouette: 'spear',
    hp: 300,
    par: 45,
    armor: false,
    spawnX: 680,
    droneHz: 65.41,            // C2
    weaponTip: { dx: 56, dy: 60 },

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
      lance: {                                     // P2 전용, 패리 불가 돌진
        id: 'lance', label: 'LANCE', tell: 'red', kind: 'charge',
        windup: 0.65, active: 0.10, recover: 0.30,
        charge: { speed: 900, damage: 1, wallStun: 0.7 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'twin',        steps: [{ atk: 'twin' }] },
        { name: 'bolt',        steps: [{ atk: 'bolt' }] },
        { name: 'bolt-twin',   steps: [{ atk: 'bolt' }, { wait: 0.35 }, { atk: 'twin' }] },
        { name: 'close-twin',  steps: [{ move: 'close' }, { atk: 'twin' }] }
      ],
      2: [
        { name: 'triad',       steps: [{ atk: 'triad' }] },
        { name: 'lance',       steps: [{ atk: 'lance' }] },
        { name: 'lance-triad', steps: [{ atk: 'lance' }, { atk: 'triad' }] },
        { name: 'bolt-bolt-twin', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { move: 'close' }, { atk: 'twin' }] }
      ]
    }
  };

  global.BOSSES.push(CHORUS);
})(window);
```

- [ ] **Step 4: `js/bosses/bastion.js` (스펙 §3.7)**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/bastion.js
 * BASTION — 수문장 (챕터 2, 아머 + 되받아치기). 스펙 §3.7
 * 반사돼 돌아온 투사체를 되받아친다(boss.js tryDeflect). 되받은 직후 경직에만 카운터가 열린다.
 * 아머: Graven 규칙 계승 — 엠파워 리포스트만 interrupt.
 * ========================================================================== */
(function (global) {
  'use strict';

  var BASTION = {
    key: 'bastion',
    name: 'BASTION',
    title: 'THE WARDEN',
    color: '#a8b8c8',
    silhouette: 'hammer',       // 기존 실루엣 재사용 — 색으로 구분
    hp: 340,
    par: 50,
    armor: true,
    deflect: true,              // 확률·사거리·경직은 CONFIG.BOSS.DEFLECT_*
    spawnX: 700,
    droneHz: 46.25,             // F#1
    weaponTip: { dx: 58, dy: 76 },

    prefer: { close: 150, far: 330, back: 220 },
    gap: { 1: 0.75, 2: 0.55 },

    attacks: {
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: 0.80, active: 0.12, recover: 0.60,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 26 }
      },
      salvo: {                                     // 지면 투사체 — 반사되면 deflect 대상
        id: 'salvo', label: 'VOLLEY', tell: 'gold', kind: 'projectile',
        windup: 0.65, active: 0.10, recover: 0.55,
        proj: { speed: 280, r: 13, y: 18, damage: 1, reflectDamage: 16, shape: 'wave' },
        steal: { id: 'VOLLEY', label: 'VOLLEY', kind: 'shot', damage: 16 }
      },
      bulwark: {                                   // P2 전용, 패리 불가 돌진
        id: 'bulwark', label: 'BULWARK', tell: 'red', kind: 'charge',
        windup: 0.70, active: 0.10, recover: 0.30,
        charge: { speed: 880, damage: 1, wallStun: 0.9 },
        steal: null
      }
    },

    patterns: {
      1: [
        { name: 'ward',        steps: [{ atk: 'ward' }] },
        { name: 'salvo',       steps: [{ atk: 'salvo' }] },
        { name: 'salvo-ward',  steps: [{ atk: 'salvo' }, { wait: 0.4 }, { atk: 'ward' }] },
        { name: 'close-ward',  steps: [{ move: 'close' }, { atk: 'ward' }] }
      ],
      2: [
        { name: 'bulwark',      steps: [{ atk: 'bulwark' }] },
        { name: 'salvo-salvo',  steps: [{ atk: 'salvo' }, { wait: 0.45 }, { atk: 'salvo' }] },
        { name: 'bulwark-ward', steps: [{ atk: 'bulwark' }, { atk: 'ward' }] },
        { name: 'ward-ward',    steps: [{ atk: 'ward' }, { wait: 0.35 }, { atk: 'ward' }] }
      ]
    }
  };

  global.BOSSES.push(BASTION);
})(window);
```

- [ ] **Step 5: `js/bosses/avarice.js` (스펙 §3.8 — mirror.js 를 바탕으로)**

```js
/* =============================================================================
 * RIPOSTE — js/bosses/avarice.js
 * AVARICE — 약탈자 (챕터 2 보스). 스펙 §3.8
 * 실루엣 = 플레이어형. Mirror 세트 + 챕터 2 기술을 windup ×0.80 으로 되돌린다.
 * stealOnHit: 피격마다 손패 맨 앞을 빼앗아(game.js damagePlayer) loot 큐에 넣고,
 * {mirror:'loot'} 스텝이 그것을 순서대로 되돌려 쓴다. plunder 는 손패 전부를 빼앗는다.
 * ========================================================================== */
(function (global) {
  'use strict';

  var WINDUP_MULT = 0.80;
  var BASE_WINDUP = { thrust: 0.60, slash: 0.50, arrow: 0.45, slam: 0.85, flicker: 0.55, bolt: 0.42, ward: 0.80 };
  function w(k) { return +(BASE_WINDUP[k] * WINDUP_MULT).toFixed(4); }

  /* 손패 기술 id → 이 보스의 공격 id (되돌림표). 챕터 2 기술도 되돌린다. */
  var MIRROR_MAP = {
    THRUST: 'thrust', SLASH: 'slash', KICK: 'slash', ARROW: 'arrow', SHOCKWAVE: 'arrow', SLAM: 'slam',
    FLICKER: 'flicker', SWEEP: 'slash', TWIN: 'slash', BOLT: 'bolt', WARD: 'ward', VOLLEY: 'bolt'
  };

  var AVARICE = {
    key: 'avarice',
    name: 'AVARICE',
    title: 'THE TAKER',
    color: '#ff2fa6',
    silhouette: 'mirror',
    hp: 400,
    par: 60,
    armor: false,
    stealOnHit: true,
    spawnX: 680,
    droneHz: 41.20,             // E1
    weaponTip: { dx: 46, dy: 56 },

    prefer: { close: 120, far: 300, back: 200 },
    gap: { 1: 0.8, 2: 0.5 },

    feintHold: 0.45,
    mirrorGap: 0.35,
    fallbackAttack: 'thrust',
    windupMultNote: WINDUP_MULT,
    mirrorMap: MIRROR_MAP,

    attacks: {
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
      bolt: {
        id: 'bolt', label: 'BOLT', tell: 'gold', kind: 'projectile',
        windup: w('bolt'), active: 0.06, recover: 0.42,
        proj: { speed: 600, r: 7, y: 52, damage: 1, reflectDamage: 11, shape: 'bolt' },
        steal: { id: 'BOLT', label: 'BOLT', kind: 'shot', damage: 11 }
      },
      ward: {
        id: 'ward', label: 'WARD', tell: 'gold', kind: 'melee',
        windup: w('ward'), active: 0.12, recover: 0.56,
        reach: 170, approach: 60, damage: 1, shockwaveFx: true, swing: 'slam',
        steal: { id: 'WARD', label: 'WARD', kind: 'slam', damage: 26 }
      },
      plunder: {                                   // P2 — 적, 대시로만 회피, 손패 전부 강탈
        id: 'plunder', label: 'PLUNDER', tell: 'red', kind: 'melee',
        windup: 0.95, active: 0.16, recover: 0.85,
        reach: 230, approach: 90, damage: 1, swing: 'thrust', plunder: true,
        steal: null
      }
    },

    /* ---- 패턴 (스펙 §3.8) ------------------------------------------------ */
    patterns: {
      1: [
        { name: 'thrust',        steps: [{ atk: 'thrust' }] },
        { name: 'loot',          steps: [{ mirror: 'loot' }] },
        { name: 'feint-flicker', steps: [{ feint: 'flicker' }] },
        { name: 'arrow-close-slash', steps: [{ atk: 'arrow' }, { move: 'close' }, { atk: 'slash' }] },
        { name: 'ward',          steps: [{ atk: 'ward' }] }
      ],
      2: [
        { name: 'mirror-hand',   steps: [{ mirror: 'all' }] },
        { name: 'plunder',       steps: [{ atk: 'plunder' }] },
        { name: 'loot-thrust',   steps: [{ mirror: 'loot' }, { wait: 0.3 }, { atk: 'thrust' }] },
        { name: 'bolt-bolt-slam', steps: [{ atk: 'bolt' }, { wait: 0.3 }, { atk: 'bolt' }, { wait: 0.35 }, { atk: 'slam' }] }
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

- [ ] **Step 6: `index.html` 을 Task 1 Step 6 의 최종 형태로**

`mirror.js` 태그 뒤에 `lantern.js`, `chorus.js`, `bastion.js`, `avarice.js` 태그를 순서대로 넣는다(`story.js` 태그는 그 뒤).

- [ ] **Step 7: 검증**

Run: `node tests/state.mjs`
Expected: `PASS  8 bosses registered`, 8보스 전부 `window.BOSSES unchanged`, `STATE PASSED`.

Run: `node tests/bot.mjs --boss=5`, `--boss=6`, `--boss=7`, `--boss=8` (각각)
Expected: 각 `VICTORY`. 실패하면 이유를 기록하고(예: 봇이 deflect 랠리에서 시간 초과) Task 6 밸런스로 넘긴다 — 단 `page errors` 가 있으면 여기서 고친다.

- [ ] **Step 8: Commit**

```bash
git add js/bosses/lantern.js js/bosses/chorus.js js/bosses/bastion.js js/bosses/avarice.js index.html tests/state.mjs
git commit -m "feat(bosses): 챕터 2 보스 4종 LANTERN·CHORUS·BASTION·AVARICE + state 테스트 8보스" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: STORY 장면 (상태 머신 · 그리기 · 부트) + INTERLUDE/ENDING 화면 + loot HUD

**Files:**
- Modify: `js/game.js` (생성자 41-79, `startRun` 129-133, `startBoss` 135-157, `restartBoss` 166-168, `step` switch, `afterVictory`(Task 2), `getState`, 새 메서드 `storyFor/beginStory/stepStory/finishStory`)
- Modify: `js/render.js` (`drawTitleScene` 뒤에 `Render.drawStoryScene`)
- Modify: `js/ui.js` (`drawHUD` 147-219 loot 슬롯, `drawTitle` 326-339, 새 `drawStory`·`drawTaken`·`drawInterlude`, `drawEnding` 492-541 재구성)
- Modify: `js/main.js` (`draw` 71-86, `boot` 111-128)

**Interfaces:**
- Consumes: `window.STORY`, `CONFIG.STORY/ENDING/HAND.LOOT_*`, `Game.advanceAfterBoss/chapterOf/chapterResults/chapterRank/endingHand`(Task 2).
- Produces: 장면 `'STORY'`, `game.story` 객체(아래 형태), `getState().story`, `Game` 옵션 `story:false`, `startRun(from, { noSave, noStory })`, `startBoss(index, { skipBefore })`.

`game.story` 형태:

```js
{ beat: 'before'|'after',
  lines: [{ text, hideSpeaker, silent }],   // silent = '……' 침묵행
  index: 0, shown: 0,                        // 현재 줄 / 찍힌 글자 수
  choice: null | { K, J },                   // 이 장면의 선택지(있으면)
  choiceState: null | 'pending' | 'reply' | 'taken',
  reply: null | { key:'K'|'J', text, ok, dissolve }, replyShown: 0,
  holdT: 0, takenT: 0, dissolveT: 0, bossAlpha: 1 }
```

- [ ] **Step 1: `tests/smoke.mjs` 를 새 흐름으로 먼저 고친다 (실패해야 정상)**

91-103행(`--- Enter -> FIGHT` 블록)을 교체:

```js
  // --- Enter -> STORY -> (Enter 연타, 선택지는 K) -> FIGHT -------------------
  await page.keyboard.press('Enter');
  const inStory = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'STORY', 3000, 'STORY');
  check('Enter enters STORY (boss 1 dialogue) within 3s', inStory);

  let presses = 0;
  for (; presses < 40; presses++) {
    const s = await page.evaluate(state);
    if (s.scene === 'FIGHT' || s.scene === 'INTRO') break;
    if (s.story && s.story.choice === 'pending') await page.keyboard.press('KeyK');
    else await page.keyboard.press('Enter');
    await sleep(120);
  }
  const inFight = await waitFor(page, () => window.__RIPOSTE.getState().scene === 'FIGHT', 4000, 'FIGHT');
  check('story advances to FIGHT with Enter/K', inFight, `(${presses} presses)`);

  await sleep(700);
  await page.screenshot({ path: join(SHOTS, 'smoke-fight.png') });

  const s1 = await page.evaluate(state);
  check('boss is loaded', s1.bossMaxHp > 0, `(bossId ${s1.bossId}, hp ${s1.bossHp}/${s1.bossMaxHp})`);
  check('no NaN positions', Number.isFinite(s1.playerX) && Number.isFinite(s1.bossX),
    `(playerX ${s1.playerX?.toFixed(1)}, bossX ${s1.bossX?.toFixed(1)})`);
```

110행(`smoke-defeat.png` 스크린샷) 뒤에 추가:

```js
  // --- R 재도전은 STORY 를 다시 틀지 않는다 (스펙 §10) -----------------------
  await page.keyboard.press('KeyR');
  await sleep(150);
  const s3 = await page.evaluate(state);
  check('R retry skips STORY (INTRO or FIGHT)', s3.scene === 'INTRO' || s3.scene === 'FIGHT', `(scene ${s3.scene})`);
```

Run: `node tests/smoke.mjs` → Expected: `FAIL  Enter enters STORY` (아직 STORY 장면이 없다).

- [ ] **Step 2: `js/game.js` — 옵션·시작 흐름**

생성자(43행 `this.seed = ...` 앞):

```js
    this.storyOn = opts.story !== false;   // ?story=0 이면 false — 대화 전부 건너뜀
    this.runStory = this.storyOn;          // 이번 런에서 대화를 트는가 (?boss=N 은 false)
    this.story = null;                     // STORY 장면 상태 (아래 beginStory)
```

`startRun`(129-133행) 교체:

```js
  /** opts.noSave = true 면 저장하지 않고, opts.noStory = true 면 대화도 틀지 않는다 (?boss=N) */
  Game.prototype.startRun = function (fromIndex, opts) {
    this.noSave = !!(opts && opts.noSave);
    this.runStory = this.storyOn && !(opts && opts.noStory);
    this.run = this.newRun();
    this.startBoss(fromIndex || 0);
  };
```

`startBoss`(135-157행) 시그니처와 끝을 바꾼다:

```js
  /** opts.skipBefore = true 면 전투 전 대화를 건너뛴다 (R 재도전) */
  Game.prototype.startBoss = function (index, opts) {
    ...(기존 본문 그대로)...
    this.tut = def.tutorial
      ? { parryDone: false, riposteDone: false, dashDone: false, redSeen: false, active: true }
      : null;
    if (this.runStory && !(opts && opts.skipBefore) && this.storyFor('before')) this.beginStory('before');
    else this.setScene('INTRO');
  };
```

`restartBoss`(166-168행):

```js
  Game.prototype.restartBoss = function () {
    this.startBoss(this.bossIndex, { skipBefore: true });
  };
```

`afterVictory`(Task 2 에서 만든 것) 교체:

```js
  /** 승리 카드 다음 — 전투 후 대화가 있으면 먼저 튼다 (스펙 §10) */
  Game.prototype.afterVictory = function () {
    if (this.runStory && this.storyFor('after')) this.beginStory('after');
    else this.advanceAfterBoss();
  };
```

`step` switch 에 `case 'STORY': this.stepStory(dt); break;` 추가.

- [ ] **Step 3: `js/game.js` — STORY 상태 머신 (`stepEnding` 뒤에 추가)**

```js
  /* ---- STORY (스펙 §10) — 전투 경계의 단문 대화 --------------------------- */

  /** 이 보스의 대사 테이블에 해당 장면이 있으면 그 테이블을 돌려준다 */
  Game.prototype.storyFor = function (beat) {
    var def = this.defs[this.bossIndex];
    var s = global.STORY && def ? global.STORY[def.key] : null;
    return (s && s[beat] && s[beat].length) ? s : null;
  };

  Game.prototype.beginStory = function (beat) {
    var s = this.storyFor(beat);
    var S = C.STORY;
    var lines = [];
    for (var i = 0; i < s[beat].length; i++) {
      var raw = s[beat][i];
      var t = (typeof raw === 'string') ? raw : raw.text;
      lines.push({ text: t, hideSpeaker: !!(raw && raw.hideSpeaker), silent: t === '……' });
    }
    this.story = {
      beat: beat, lines: lines, index: 0, shown: 0,
      choice: (s.choice && s.choice.at === beat) ? s.choice : null,
      choiceState: null, reply: null, replyShown: 0,
      holdT: 0, takenT: 0, dissolveT: 0, bossAlpha: 1
    };
    this.setScene('STORY');
  };

  Game.prototype.stepStory = function (dt) {
    var st = this.story;
    var S = C.STORY;
    if (!st) { this.finishStory(); return; }

    // 스킵: Esc 또는 Enter 길게. 선택지가 남아 있어도 스킵은 정답으로 간주한다.
    if (Input.pressed('confirm')) st.holdT += dt; else st.holdT = 0;
    if (Input.consume('back') || st.holdT >= S.SKIP_HOLD) { this.finishStory(); return; }

    if (st.choiceState === 'taken') {
      st.takenT += dt;
      if (Input.consume('confirm')) { RAudio.ui(true); st.choiceState = 'pending'; st.reply = null; }
      return;
    }

    if (st.choiceState === 'pending') {
      var key = Input.consume('parry') ? 'K' : (Input.consume('riposte') ? 'J' : null);
      if (!key) return;
      var opt = st.choice[key];
      st.reply = { key: key, text: opt.reply, ok: !!opt.ok, dissolve: !!opt.dissolve };
      st.replyShown = 0;
      st.takenT = 0;
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
    if (Input.consume('parry') || Input.consume('riposte') || Input.consume('dash')) st.shown = len;
    if (Input.consume('confirm')) {
      RAudio.ui(true);
      if (st.shown < len) { st.shown = len; return; }
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
```

`getState` 의 반환 객체에 추가:

```js
      chapter: ch ? ch.id : 0,
      story: this.story ? {
        beat: this.story.beat, line: this.story.index, total: this.story.lines.length,
        choice: this.story.choiceState
      } : null,
```

- [ ] **Step 4: `js/render.js` — 대화 장면 (`drawTitleScene` 뒤, `drawWorld` 앞에 추가)**

```js
  /* ---- 대화 장면 (스펙 §10) -----------------------------------------------
   * 아레나 위에 플레이어(좌)와 보스(우) 실루엣을 STORY.SCALE 배로 세운다.
   * 보스 알파는 game.story.bossAlpha (AVARICE 정답 반응에서 0 으로 내려간다).
   * ---------------------------------------------------------------------- */
  Render.drawStoryScene = function (ctx, game) {
    Render.drawArena(ctx, 0);
    drawReflectionFade(ctx);
    var S = C.STORY;
    var b = game.boss;
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
```

- [ ] **Step 5: `js/ui.js` — 대화 박스 · TAKEN 카드 · INTERLUDE · ENDING · loot 슬롯 · 타이틀 문구**

`drawHUD` 의 HP 바 블록 끝(179행 `ctx.restore();` 뒤)에 loot 슬롯:

```js
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
```

`drawTitle` 의 CONTINUE 분기(331-335행) 교체 — 챕터 표기:

```js
    } else if (game.save.unlocked > 1) {
      var ci = game.chapterOf(game.save.unlocked - 1);
      var within = ci ? (ci.bosses.indexOf(game.defs[game.save.unlocked - 1].key) + 1) : game.save.unlocked;
      var label = ci ? (ci.name.replace('CHAPTER ', 'CH.') + '  BOSS ' + within) : ('BOSS ' + game.save.unlocked);
      text(ctx, '[ENTER]  CONTINUE  —  ' + label, V.W / 2, 452,
        { size: 19, weight: '800', color: C.COLORS.WHITE, alpha: blink, spacing: 2, glow: C.COLORS.PLAYER, blur: 12 });
      text(ctx, '[N]  NEW GAME', V.W / 2, 480,
        { size: 14, weight: '700', color: C.COLORS.TEXT_DIM, spacing: 2, alpha: fade });
    } else {
```

새 함수들 — `drawVictory` 앞에 추가:

```js
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
```

`drawEnding`(492-541행) 전체 교체:

```js
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
      text(ctx, b.hits + ' hit', V.W / 2 + 100, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.perfects + ' perfect', V.W / 2 + 190, y + i * E.ROW_H, { size: 12, weight: '600', color: C.COLORS.TEXT_DIM, align: 'right' });
      text(ctx, b.rank, V.W / 2 + 216, y + i * E.ROW_H, { size: 16, weight: '800', color: rankColor(b.rank), align: 'left', glow: rankColor(b.rank), blur: 10 });
    }

    var ty = y + run.bosses.length * E.ROW_H + 18;
    text(ctx, 'TOTAL  ' + fmtTime(run.time) + '   ·   ' + run.hits + ' HITS   ·   ' + run.perfects + ' PERFECT',
      V.W / 2, ty, { size: 13, weight: '700', color: C.COLORS.TEXT, spacing: 1 });

    var ov = game.overallRank();
    var k = clamp((t - 0.25) / C.RANK.CARD_SCALE_TIME, 0, 1);
    var sc = k < 1 ? lerp(2.8, 1, k * k) : 1;
    text(ctx, ov, V.W / 2 + 300, ty - 4,
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
```

- [ ] **Step 6: `js/main.js` — 부트·그리기**

`draw`(71-72행) 교체:

```js
    if (game.scene === 'STORY') Render.drawStoryScene(ctx, game);
    else if (game.boss) Render.drawWorld(ctx, game);
    else Render.drawTitleScene(ctx, game.sceneT);
```

switch(79-86행)에 두 줄 추가:

```js
      case 'STORY':   UI.drawStory(ctx, game); break;
      case 'INTERLUDE': UI.drawInterlude(ctx, game); break;
```

`boot`(111-128행):

```js
    game = new Game({
      seed: numParam(p, 'seed', 20260909),
      speed: numParam(p, 'speed', 1),
      story: p.story !== '0'                  // ?story=0 — 대화 전부 건너뜀 (테스트/봇)
    });
    ...
    if (p.boss !== undefined) {
      var bi = Math.round(numParam(p, 'boss', 1)) - 1;
      // URL 로 바로 들어온 판은 진행도를 저장하지 않고 대화도 틀지 않는다
      game.startRun(Math.max(0, Math.min(global.BOSSES.length - 1, bi)), { noSave: true, noStory: true });
    }
```

- [ ] **Step 7: 다른 테스트의 진입 경로 정리**

`tests/audio-smoke.mjs` 59행: `'?seed=7'` → `'?seed=7&story=0'` (이 테스트의 목적은 제스처→AudioContext 이지 대화가 아니다).

`tests/bot.mjs` 305행: `const list = ALL ? [1, 2, 3, 4] : [BOSS];` 를 `BOSSES.length` 기준으로:

```js
  const count = await (async () => {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(join(ROOT, 'index.html')).href + '?mute=1', { waitUntil: 'load' });
    await until(p, (s) => !!s, 5000);
    const n = await p.evaluate(() => window.BOSSES.length);
    await p.close();
    return n;
  })();
  const list = ALL ? Array.from({ length: count }, (_, i) => i + 1) : [BOSS];
```

(`?boss=N` 경로는 이미 `noStory` 라 봇 루프는 그대로다.)

- [ ] **Step 8: 검증**

Run: `node tests/smoke.mjs`
Expected: `PASS  Enter enters STORY`, `PASS  story advances to FIGHT`, `PASS  R retry skips STORY`, `SMOKE PASSED`, 0 page errors.

Run: `node tests/audio-smoke.mjs` → `AUDIO PASSED` (또는 기존과 같은 결과).
Run: `node tests/state.mjs` → `STATE PASSED`.
Run: `node tests/story.mjs` → `STORY PASSED`.

수동 육안(헤드리스 스크린샷): `node -e` 로 playwright 를 띄워 `?seed=7&mute=1` 에서 Enter 1회 후 `tests/shots/story-vesper.png`, `?boss=8&seed=7&mute=1` 에서 K/J 선택 화면은 Task 5 밸런스 후 tools/shots 로 대체 — 여기서는 smoke 의 `smoke-fight.png` 와 아래 한 장만 찍는다:

```bash
node -e "
import('playwright-core').then(async ({chromium}) => {
  const b = await chromium.launch({headless:true}); const p = await b.newPage({viewport:{width:960,height:540}});
  await p.goto(require('url').pathToFileURL(require('path').resolve('index.html')).href + '?mute=1&seed=7', {waitUntil:'load'});
  await p.waitForFunction(() => !!window.__RIPOSTE); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  await p.screenshot({path:'tests/shots/story-vesper.png'}); await b.close(); });"
```

Expected: 좌 플레이어·우 VESPER 큰 실루엣, 하단 박스에 `???` 라벨과 "검이 없네." — 한글이 네모(tofu)로 깨지지 않는다.

- [ ] **Step 9: Commit**

```bash
git add js/game.js js/render.js js/ui.js js/main.js tests/smoke.mjs tests/audio-smoke.mjs tests/bot.mjs
git commit -m "feat(story): STORY 장면(타자기·선택지·TAKEN)·INTERLUDE·엔딩 태그라인·loot HUD + 테스트 흐름 갱신" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 전 보스 봇 실측 · 챕터 2 밸런스 확정 (스펙 §8-8)

**Files:**
- Modify(수치만): `js/bosses/lantern.js`, `chorus.js`, `bastion.js`, `avarice.js` (hp / par / gap / interval)
- Create: `docs/qa/balance-2026-09-17.md` (실측표)

**Interfaces:** 없음 (수치 조정).

- [ ] **Step 1: 완벽 봇**

Run: `node tests/bot.mjs --all --seed=7`
Expected: 8보스 전부 VICTORY, passive DEFEAT, page errors 0. 결과 8줄을 `docs/qa/balance-2026-09-17.md` 에 표로 옮긴다(보스·time·hits·perfects·rank·parry/dash/riposte 수).

- [ ] **Step 2: 숙련 프로파일**

Run: `node tests/bot.mjs --all --seed=7 --jitter=0.05 --miss=0.15 --think=0.25`
Expected: 8보스 전부 VICTORY. 챕터 1 기준(10~28s)과 비교해 챕터 2 가 15~45s 범위면 정상.

- [ ] **Step 3: 평균 프로파일**

Run: `node tests/bot.mjs --all --seed=7 --miss=0.3 --jitter=0.09 --think=0.45`
Expected: 챕터 2 어딘가에서 DEFEAT 가 나오는 것이 **정상**(챕터 1 과 같은 기준 — "적당히 어려운 것이 도전욕구를 자극"). 전부 VICTORY 면 챕터 2 가 너무 쉽다.

- [ ] **Step 4: 조정 규칙 (필요할 때만, 한 번에 한 레버)**

- par = 숙련 프로파일 time 의 약 2배(5초 단위 반올림). 40/45/50/60 과 10초 이상 어긋나면 par 를 바꾼다.
- 완벽 봇이 지면: 원인을 `tests/shots/bot-b{N}-*.png` 와 stats 로 본다. deflect 랠리 무한 → `DEFLECT_SPEED_MAX` 를 낮추지 말고 `DEFLECT_FORCE_RALLY` 를 2 로(2026-09-18 폐기: `DEFLECT_MAX_RALLY` 상한으로 반전 — 무한 랠리 결함). volley 두 번째 타격을 못 받으면 `interval` 을 0.40 으로.
- 길이 레버는 HP 가 아니라 `gap` 과 배수 스택이다(handover 교훈 3). 너무 길면 `gap` 을 0.1 줄이고, 너무 짧으면 HP 를 10% 올리기 전에 `gap` 을 0.1 늘린다.
- 바꾼 뒤 Step 1~3 을 다시 돌린다. 세 프로파일 결과를 문서에 갱신.

- [ ] **Step 5: 회귀 확인 + Commit**

Run: `node tests/state.mjs && node tests/smoke.mjs`
Expected: 둘 다 PASSED.

```bash
git add js/bosses docs/qa/balance-2026-09-17.md
git commit -m "tune(ch2): 봇 3프로파일 실측으로 챕터 2 par/HP/gap 확정" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 스크린샷 · README · CLAUDE.md · handover · 스펙 정정

**Files:**
- Modify: `tools/shots.mjs` (story 장면 1장 추가), `README.md`, `CLAUDE.md`, `docs/handover.md`
- Modify: `docs/superpowers/specs/2026-09-09-riposte-design.md` (§3.6 volley 설계, §7 RNG 문장, §10 데이터 스키마)

- [ ] **Step 1: `tools/shots.mjs` 에 `docs/media/story.png` 추가** — 기존 title 촬영 블록(94행 근처) 뒤에 같은 방식으로: `?mute=1&seed=7` 로 열고 Enter 1회 → 1.5s 뒤 `docs/media/story.png`. 기존 3장은 그대로.

Run: `node tools/shots.mjs` → `docs/media/` 4장 갱신.

- [ ] **Step 2: `README.md`** — 다음을 고친다(나머지는 유지):
  - 상단 소개: "Four bosses" → "Eight bosses across two chapters"; 4번째 문단 "one mirror waiting at the end" → 챕터 1 끝의 거울과 챕터 2 끝의 약탈자 한 문장.
  - `## The bosses` 표를 8행으로(스펙 §3 의 name/title/What it teaches/What you take). 챕터 구분선 2개.
  - 새 절 `## Between fights` — 헬테이커식 단문 대화 3~4문장(한국어 대사, K/J 선택지, 틀리면 TAKEN 카드, R 재도전은 반복 없음, `?story=0`), `![Story](docs/media/story.png)`.
  - `### URL parameters` 에 `?boss=1..8`, `?story=0` 행. `### Tests` 에 `node tests/story.mjs` 행과 `npm install` 한 줄.
- [ ] **Step 3: `CLAUDE.md`** Vitals 의 테스트 줄을 `npm install` → `node tests/smoke.mjs`·`bot.mjs --all`·`state.mjs`·`audio-smoke.mjs`·`story.mjs` 6종으로, 참조에 스토리 바이블·챕터 2 제안서·구현 계획 경로 추가. 100라인 이하 유지.
- [ ] **Step 4: `docs/handover.md`** 갱신일·상태(8보스+스토리), 검증 하네스 표에 `story.mjs`, "실패했던 시도와 교훈" 에 5·6번 추가 — (5) 근접 연타는 wait 스텝으로 만들 수 없었다(생명주기 때문에 실제 간격 1.2s) → 한 공격의 volley 재-windup; (6) 스토리 삽입 시 배너 시계·audio-smoke·bot 진입 경로처럼 "Enter 한 번 = FIGHT" 를 전제한 곳 3군데가 깨졌다 → `?story=0` 과 `skipBefore`. 밸런스 실측 결과 요약(Task 5 문서 링크).
- [ ] **Step 5: 스펙 정정 3곳**
  - §3.6 표의 twin/triad 행과 그 아래 하한 문장을 "volley: { count, interval 0.35 } — active 뒤 recover 대신 interval 의 windup + 새 플래시(재-windup). `MIN_VOLLEY_GAP` 0.35" 로.
  - §7 "결정론: 시드 RNG (`?seed=N`). 보스 패턴 선택만 RNG 사용." → "보스 패턴 선택과 되받아치기(deflect) 확률만 RNG 사용."
  - §10 데이터 줄: `choice: { at, K: { text, ok, reply }, J: { text, ok, reply, dissolve? } }` — prompt 필드 없음(장면 마지막 줄이 질문), `dissolve` 는 AVARICE 정답.
- [ ] **Step 6: Commit**

```bash
git add tools/shots.mjs docs/media README.md CLAUDE.md docs/handover.md docs/superpowers
git commit -m "docs: README 8보스·스토리 절, CLAUDE.md 테스트 6종, handover 교훈, 스펙 §3.6/§7/§10 정정, 계획서" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 최종 검증 · push (`kkp8121-rgb`)

- [ ] **Step 1: 전 하네스 순차 실행 (fresh 증거)**

```bash
node tests/story.mjs && node tests/state.mjs && node tests/audio-smoke.mjs && node tests/smoke.mjs && node tests/bot.mjs --all
```

Expected: 5개 전부 PASSED. 하나라도 FAIL 이면 push 하지 않는다.

- [ ] **Step 2: 작업 트리 확인**

Run: `git status --short` → 비어 있음. `git log --oneline -8` → Task 1~6 커밋 6개.

- [ ] **Step 3: push 인증을 `kkp8121-rgb` 로 고정 (평문 토큰 저장 없음 — 실행 시 gh 에서 꺼낸다)**

```bash
git config credential.helper ""
git config --add credential.helper '!f() { echo username=kkp8121-rgb; echo "password=$(gh auth token -u kkp8121-rgb)"; }; f'
git config user.email   # 전역 BHS 값 확인 (gustjd8121@gmail.com)
```

- [ ] **Step 4: push**

```bash
git push origin main
```

Expected: `main -> main` 성공. 이 push 가 GitHub Pages 배포를 트리거한다(사용자 승인 2026-09-17: "push진행해").

- [ ] **Step 5: 배포 확인**

```bash
sleep 90; node tools/check-pages.mjs https://kkp8121-rgb.github.io/riposte/
```

Expected: 200, pageerror 0, FIGHT 진입(도구가 `?boss=1` 을 쓰면 STORY 없이 바로). 캐시로 이전 버전이 보이면 60초 뒤 재시도(최대 3회).

---

## Self-Review (작성 후 점검)

- 스펙 커버리지: §2.6 INTERLUDE/ENDING(T2/T4) · §2.7 챕터 랭크(T2) · §3.5~3.8 4보스(T3) + 엔진 3종(T2) · §4 색(T3 파일) · §5 BPM(T1) · §6 흐름·CONTINUE 문구·STORY·INTERLUDE(T4) · §7 파일·URL·getState·상수(T1/T4) · §8 1~8(T4/T3/T5/T1) · §10 원칙 전부(T4: 배치·분량·콜드 오픈·선택지·침묵행·소멸·스킵·데이터) · §9 비목표 준수(챕터 선택 없음, 새 동사 없음).
- 플레이스홀더: 없음. Task 6 문서 절은 내용 항목을 열거했고 실제 문장은 워커가 README 톤에 맞춰 쓴다(코드 아님).
- 타입 일관성: `startBoss(index, opts.skipBefore)` / `startRun(from, {noSave, noStory})` / `mirrorIds(boss, game, source)` / `tryDeflect(pr)` / `story.choiceState ∈ {null,'pending','reply','taken'}` / `getState().story.choice` = choiceState — smoke 가 `'pending'` 을 본다. `run.bosses[].key` 를 T2 에서 넣었고 `chapterResults` 가 그것을 쓴다. `CONFIG.STORY.VOICE_SPLIT` 를 ui 와 story.js 주석이 같은 값(' / ')으로 쓴다.
