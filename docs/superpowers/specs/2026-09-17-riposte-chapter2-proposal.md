# RIPOSTE — 8스테이지(챕터 2) 확장 제안

- 작성일: 2026-09-17 · 상태: **승인(2026-09-17, 사용자)** — §5 결정 3건 전부 승인: B안 채택 · AVARICE 콘셉트 · INTERLUDE 카드 포함. 스펙 반영 완료(2026-09-17): §3.5~3.8 · §2.6/2.7 · §6 · §7 · §8 · §10 스토리. 스토리 바이블 v3 승인. 다음: 구현 계획(writing-plans).
- 전제(사용자): 4스테이지 MIRROR = 챕터 1 보스. 5~8스테이지 = 챕터 2, 8스테이지 = 챕터 2 보스.
- 근거 실측: `js/boss.js`(공격 kind: melee/projectile/zone/charge · 스텝: atk/feint/mirror/wait/move · 훅: onPickPattern/mirrorIds/armor/volley/push) ·
  `js/game.js`(진행은 `BOSSES` 배열 길이로 결정, ENDING = 마지막 보스 격파) · `js/render.js`(무기 rapier/blade/hammer/bow/spear 이미 존재, blade·spear 는 미사용) ·
  `tests/bot.mjs`(텔 색만 읽는 범용 봇 — charge 만 특수 처리).

---

## 1. 접근 3안

| 안 | 내용 | 엔진 변경 | 위험 |
|---|---|---|---|
| **A. 순수 데이터 확장** | 기존 kind·스텝·훅만 재조합한 보스 4종 + ENDING 을 8번째로 이동 | 0 | "같은 것 4개 더" 로 읽힐 위험. 챕터 2 의 정체성이 없다 |
| **B. 데이터 + 소형 엔진 트위스트 2개 (권장)** | A + (1) 보스가 반사 투사체를 되받아치는 `deflect`, (2) 피격 시 손패를 빼앗는 `stealOnHit`. 챕터 테이블을 `config.js` 에 둔다 | 소 (~2 기능, 각 20~40줄 추정) | 밸런스 재측정 필요 — 기존 봇 하네스로 가능 |
| C. 새 동사 추가 | 챕터 2 에서 플레이어 동사(가드 브레이크·홀드 패리 등) 추가 | 대 | §2.2 "두 색, 두 동사" 문법과 §9 YAGNI 위반. 튜토리얼·HUD·봇 전부 재작업 |

**권장 = B.** 챕터 1 이 "동사를 배운다"(패리→반사→강화→인내) 였다면, 챕터 2 는 **"상대가 나를 안다"** — 같은 동사를 상대가 역이용한다.
주제 문장의 후반부를 완성한다: *Nothing is given, everything is taken — **from you, too.***

---

## 2. 챕터 2 보스 4종 (제안)

수치는 챕터 1 과 같은 방법으로 **봇 실측 후 확정**한다(par ≈ 숙련 프로파일 봇의 약 2배, HP 는 길이 레버가 아님 — handover 교훈 3). 아래 값은 출발점.

| # | 보스 | 부제 | 가르치는 것 | 훔치는 기술 | HP / par | 엔진 변경 |
|---|---|---|---|---|---|---|
| 5 | **LANTERN** | The Illusionist | **색 읽기** — 같은 박자·같은 리치의 금/적 쌍둥이 공격. 리듬 암기만으로는 못 넘는다 | FLICKER(lunge 18) · SWEEP(slash 15) | 280 / 40s | 0 (데이터) |
| 6 | **CHORUS** | The Twin Blades | **연속 패리** — 근접 볼리(0.22s 간격 2~3연타)와 화살 볼리를 섞는다. 성공 시 단축 리커버리(0.10s)를 몸으로 익힌다 | TWIN(slash 13, 2연타 아님 — 단일) · BOLT(shot 11) | 300 / 45s | 0 (melee volley 는 스텝 wait 로 구성 가능, projectile volley 기존) |
| 7 | **BASTION** | The Warden | **반사 의존 탈피** — 느린 충격파를 쏘고, 반사돼 돌아온 투사체를 **되받아친다(deflect)**. 랠리마다 속도 상승. 되받아친 직후 경직에만 카운터가 열린다 | WARD(slam 26) · VOLLEY(shot 16) | 340 / 50s | **deflect** 신규 |
| 8 | **AVARICE** | The Taker (챕터 2 보스) | **빼앗김** — 피격 1회마다 손패 맨 앞을 **빼앗아 자기 것으로 쓴다**(mirror 스텝 재사용). P2 `plunder`(적, 잡기): 손패 전부 강탈. 스트릭뿐 아니라 손패도 무결점이어야 지킨다 | 전부(챕터 2 기술 포함) | 400 / 60s | **stealOnHit** 신규 + mirror 훅 재사용 |

### 2.1 LANTERN (5) — 실루엣 `blade`(기존 무기 재사용), 색 `#7dff9a`
| 공격 | 텔 | windup | reach | 비고 |
|---|---|---|---|---|
| flicker | 금 | 0.55 | 160 | lunge 계열. 훔침 FLICKER |
| flicker-red | **적** | 0.55 | 160 | **flicker 와 동일 박자·리치**. 색만 다르다 |
| sweep | 금 | 0.48 | 130 | 훔침 SWEEP |
| sweep-red (P2) | **적** | 0.48 | 130 | 동일 박자 |
- P1: `[flicker]` `[flicker-red]` `[sweep, wait .3, flicker]` `[close, sweep]` — P2: `[flicker, flicker-red]` `[sweep-red, flicker]` `[feint-flicker]` `[back, flicker-red]`
- 규칙 준수: §2.2 "플래시→타격 항상 일정" 유지. 색이 정보의 전부가 되는 첫 보스.

### 2.2 CHORUS (6) — 실루엣 `spear`(기존), 색 `#4d9dff`
| 공격 | 텔 | windup | 비고 |
|---|---|---|---|
| twin | 금 ×2 (0.22s) | 0.45 | 근접 2연타 = `[atk twin] [wait .22] [atk twin]` 로 구성. 각각 패리·훔침 가능 |
| bolt | 금 (투사체 600) | 0.42 | 훔침 BOLT |
| triad (P2) | 금 ×3 (0.20s) | 0.50 | 근접 3연타 |
| lance (P2) | **적** (charge 900) | 0.65 | Graven charge 재사용, wallStun 0.7 |
- 볼리 사이 간격은 `PARRY.RECOVERY_ON_SUCCESS`(0.10) + `PARRY_PERFECT_WINDOW`(0.18) 보다 커야 한다(0.22 ≥ 0.28? **아니다 — 0.22 는 창 합보다 짧다**). ⇒ 근접 볼리 간격 하한을 `config.BOSS.MIN_VOLLEY_GAP = 0.30` 으로 두고 twin 0.32 / triad 0.30 으로 시작. (SERAPH triple 0.22 는 투사체라 도착 시차가 있어 성립.)

### 2.3 BASTION (7) — 실루엣 `hammer`(기존, 색으로 구분) 또는 신규 `shield`, 색 `#a8b8c8`, armor: true
| 공격 | 텔 | windup | 비고 |
|---|---|---|---|
| ward | 금 | 0.80 | slam 계열, reach 170. 훔침 WARD |
| volley | 금 (지면 투사체 280) | 0.65 | 훔침 VOLLEY. **반사되면 deflect 대상** |
| bulwark (P2) | **적** (charge) | 0.70 | Graven 재사용 |
- **deflect(신규)**: 플레이어 쪽에서 오는 투사체가 보스 `DEFLECT_REACH`(120px) 안에 들어오면 보스가 idle/recover 중일 때 `DEFLECT_CHANCE`(P1 0.6 / P2 0.9) 로 되받아친다. 되받은 투사체 속도 ×1.25(상한 720), 보스는 `DEFLECT_RECOVER`(0.45s) 경직 = **카운터 창**. 랠리 3회째부터는 반드시 되받는다(무한 랠리 방지 아님 — 속도 상한 도달 시 플레이어가 블록으로 끊게 유도).
- 가르침: "반사만으로는 못 이긴다 — 되받는 순간을 찔러라". 아머라 엠파워 리포스트만 인터럽트(Graven 규칙 계승).

### 2.4 AVARICE (8, 챕터 2 보스) — 실루엣 `mirror`(플레이어형) 색 `#ff2fa6`
| 공격 | 텔 | windup | 비고 |
|---|---|---|---|
| thrust / slash / arrow / slam | 금 | ×0.80 | Mirror 세트 계승(windup 배수만 0.85→0.80) |
| flicker / bolt / ward | 금 | ×0.80 | 챕터 2 기술도 되돌린다 (mirrorMap 확장) |
| plunder (P2) | **적** (잡기 reach 230) | 0.95 | 피해 1 + **손패 전부 강탈**. 대시로만 회피 |
- **stealOnHit(신규)**: 이 보스에게 피격되면 `hand.shift()` 한 장이 보스 `loot` 큐로 이동. P1 부터 `[mirror: 'loot']` 스텝이 loot 큐를 순서대로 사용(비면 fallback thrust). P2 는 기존 `[mirror: 'all']`(현재 손패) + loot 를 번갈아 쓴다.
- HUD: 빼앗긴 슬롯은 보스 HP 바 아래 작은 슬롯으로 표시("TAKEN: THRUST"), 되찾는 방법 = 그 공격을 다시 퍼펙트 패리(기존 훔치기 규칙 그대로 — 새 규칙 0).
- 결말: 챕터 1 은 "내 손패가 비쳐 돌아온다", 챕터 2 는 "내 손패를 빼앗겨 맞는다". 주제 완결.

---

## 3. 진행·화면·저장 변경 (최소)

- `config.js` 에 `CHAPTERS: [{ id: 1, name: 'CHAPTER I', bosses: ['vesper','seraph','graven','mirror'] }, { id: 2, name: 'CHAPTER II', bosses: [...] }]`. `game.js` 는 지금처럼 `BOSSES` 순서대로 진행하되, **챕터 마지막 보스 격파 시 `INTERLUDE` 카드**(챕터 랭크·총 시간, Enter→다음 챕터 INTRO). 8번째 격파 → 기존 ENDING(종합 랭크 = 8보스 평균).
- 저장: `unlocked` 는 지금처럼 보스 인덱스 1~8. 타이틀 "CONTINUE — BOSS N" 을 "CONTINUE — CH.II BOSS 2" 식으로만 바꾼다. 챕터 선택 화면은 만들지 않는다(`?boss=5..8` 로 충분, YAGNI).
- 기존 세이브 호환: `clamp(unlocked, 1, n)` 이 이미 테이블 길이를 따르므로 마이그레이션 불필요. `cleared=true` 인 기존 유저는 "NEW GAME" 대신 **"CONTINUE — CHAPTER II"** 로 이어 붙인다(챕터 1 클리어 = 챕터 2 해금).
- 오디오: `AUDIO.BPM` 에 4키 추가, 각 보스 `droneHz`. 신규 합성 없음.
- 렌더: LANTERN(blade)·CHORUS(spear) 는 기존 무기 재사용 → 0 작업. BASTION 은 hammer 재사용 시 0, 방패 실루엣을 원하면 `BUILD` 1행 + `drawWeapon` case 1개. AVARICE 는 mirror 실루엣 재사용.

## 4. 검증 (기존 하네스 그대로)

- `tests/bot.mjs --all` 이 `BOSSES` 길이를 따르므로 8보스 자동 포함. deflect 는 봇의 반사가 자동 트리거되므로 특수 처리 불필요, stealOnHit 는 봇이 손패를 상태에서 읽으므로 무영향.
- `tests/state.mjs` 로 신규 훅(loot 큐)이 정의 테이블을 오염하지 않는지 검증 — handover 교훈 1 과 같은 결함 방지. loot 는 `boss` 인스턴스에만 두고 `def` 에 쓰지 않는다.
- 밸런스: 챕터 1 과 같은 3프로파일(완벽·숙련·평균) 실측 후 par/HP 확정.

## 5. 결정이 필요한 것

1. 접근 **B** 채택 여부 (A 로 줄이면 5·6·8 은 유지하되 7 BASTION 은 아머+충격파 재조합으로 대체, 8 은 stealOnHit 없이 "챕터 2 기술까지 되돌리는 Mirror II").
2. 8스테이지 보스 콘셉트 **AVARICE(빼앗김)** 승인 여부.
3. 챕터 사이 INTERLUDE 카드 유무 (없애면 ENDING 만 8번째로 옮긴다).

승인되면: 스펙 §3 에 3.5~3.8 추가 → `writing-plans` 로 구현 계획 → 보스 4종은 데이터 파일이라 병렬 제작 가능.

## 6. 스토리 (2026-09-17 승인 — 헬테이커식 단문 대화)

- 결정: 채택. 근거(사용자 전달, 태령): 스테이지 나열의 중간다리 · 캐릭터성 · 저비용 · 행사에서 넘어가는 흐름이 리듬을 안 해침.
- 언어(사용자 결정): 인게임 대사는 한국어 정본. i18n 은 나중에 필요해지면 고려(데이터 파일이 문자열 테이블이라 그때 키 하나 추가로 확장).
- 스펙 §9 "스토리 컷신" 비목표는 "긴 컷신 금지 · 단문 대화 허용" 으로 개정(2026-09-17).
- 정본: 2026-09-17-riposte-story-bible.md (원칙 5 · 줄기 · 보스 8종 목소리 · 장면별 대사 · 선택지 · UI 상수).
- 순서: 스토리 바이블(검토) → 스펙 §3.5~3.8 확장 → 구현 계획. 대화 모듈은 보스 데이터와 독립이라 병렬.
