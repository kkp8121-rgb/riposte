# RIPOSTE — 게임 설계 스펙 (Phase 1 콘셉트 선정 + Phase 2 구현 스펙)

- 작성일: 2026-09-09
- 프로젝트: tenkaichi-ai #12 (itch.io 게임잼 출품 목표, 공식 Theme 없음 → 자체 선정)
- 상태: 콘셉트 자율 확정 → 구현 진입. 사용자 승인은 플레이 가능 상태에서 결과 제시로 갈음.
- 배포: `kkp8121-rgb/riposte` (Public) → GitHub Pages `https://kkp8121-rgb.github.io/riposte/`

---

## 0. 한 줄 Hook

**"당신에게는 검이 없다. 완벽하게 받아내라 — 그 공격은 이제 당신의 것이다."**
(You have no sword. Parry perfectly, and their attack becomes yours.)

- 제목: **RIPOSTE** — 펜싱 용어 "패리 직후의 되받아치기".
- 주제(자체 선정): **"빼앗은 것만이 내 것이다" (Nothing is given, everything is taken)**
  - 규칙: 플레이어는 자기 공격이 0개. 모든 공격 수단은 보스의 공격을 **퍼펙트 패리**해서 훔친다.
  - 승패: 보스를 쓰러뜨리려면 반드시 먼저 보스의 공격을 받아내야 한다 → 공격과 방어가 한 동작.
  - 진행: 보스마다 다른 공격을 훔친다. 챕터 1 의 마지막 보스는 훔친 기술을 그대로 되돌려 쓰고(거울), 챕터 2 의 마지막 보스는 손패를 빼앗아 되돌려 쓴다(약탈자). (2026-09-17 챕터 2 확장)
- 장르: 사이드뷰 1:1 보스러시 액션 (패리 중심 듀얼). 점프 없음, 1차원 레인.
- 입력: **키보드 + 게임패드**(마우스 미사용). 패드는 버튼을 누르는 순간 인식되고 키보드와 동시에 쓸 수 있다 — 연결 전에는 폴링 비용 0(§7).
- 플레이어 판타지: "상대의 기술로 상대를 꺾는 무결점의 카운터 파이터".
- 1회 플레이: 보스 12종(챕터 3개 × 4) × 15~75초(숙련 기준, 재도전 포함 시 15~30분). 보스 단위 즉시 재시작. par는 숙련 인간형 봇 실측의 약 2배로 설정(챕터 1 실측 15~24초 · 챕터 2·3 은 구현 후 실측 — `docs/qa/balance-2026-09-18.md` · `balance-2026-09-19.md`).

---

## 1. Phase 1 — 콘셉트 선정 기록

### 1.1 형제 프로젝트(#1~#10) 분석 → 차별화 제약

| # | 게임 | 카메라/구조 | 입력 | 핵심 |
|---|---|---|---|---|
| 1 | SOOT | 사이드 서바이벌 | 원버튼 | 추진 배기 = 자기 위협 |
| 2 | ONE MOON | 탑다운 방어 | 마우스 | 중력 |
| 3 | ENSŌ | 탑다운 서바이벌 | 마우스 | 먹선 고리 봉인 |
| 4 | Nosferatoo Late | 탑다운 타임어택 | WASD | 그림자 축소 |
| 5 | SALTBOUND | 탑다운 서바이벌 | 마우스 | 소금 고리 포획 |
| 6 | SHOT CLOCK | 탑다운 슈터 | 키+마우스 | 쏠 때만 시간 진행 |
| 7 | PERIHELION | 탑다운 서바이벌 | 마우스 | 혜성 꼬리 채찍 |
| 8 | LAPSE | 탑다운 레이싱 | 키보드 | 지나온 선이 도로 |
| 9 | HARD DROP | 사이드 플랫포머 | 키보드 | 테트리스 내부 |
| 10 | DOWNWORD | 수직 하강 | 타이핑 | 단어가 바닥 |

비어 있는 축: **1:1 듀얼/보스러시, 퍼즐, 전략, 의사 3D, 리듬**. 탑다운·서바이벌 웨이브·마우스 조작은 금지 축으로 둔다.

### 1.2 후보 비교 (장르·조작·카메라·메커니즘·구조·목표가 모두 다른 6종, 10점 만점)

| 후보 | 장르 / 카메라 / 입력 | Hook | 재미 | 독창 | 30초 | 손맛 | 구현 | 차별 | 합계 |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **RIPOSTE** (선정) | 보스러시 듀얼 / 사이드 고정 / 키보드 | 검이 없다. 패리한 공격이 내 공격이 된다. | 9 | 8 | 8 | 10 | 8 | 9 | **52** |
| TURNKEY | 퍼즐 / 그리드 / 방향키+QE | 레벨 전체를 돌리면 모든 게 떨어진다. | 7 | 6 | 7 | 6 | 6 | 9 | 41 |
| LAST MILE | 레이싱 / 의사 3D 후방 / 방향키 | 도로가 3초 뒤에서 무너진다. | 7 | 6 | 8 | 8 | 5 | 10 | 44 |
| VANGUARD | 턴제 전술 / 그리드 / 커서키 | 적은 예고하고, 너는 자리를 바꾼다. | 7 | 5 | 5 | 5 | 6 | 9 | 37 |
| DRAFT | 덱빌딩 / 카드 UI / 숫자키 | 카드를 낼 때마다 덱이 줄어든다. | 7 | 5 | 5 | 4 | 6 | 9 | 36 |
| METRONOME | 리듬 러너 / 사이드 스크롤 / 2키 | 세상은 박자에만 움직인다. | 7 | 6 | 8 | 8 | 5 | 8 | 42 |

**선정 근거**: 손맛(hit stop·패리 스파크·슬로모)에 폴리싱 시간을 집중할 수 있고, Hook이 한 문장으로 즉시 전달되며, 콘텐츠가 **데이터(보스 패턴 테이블)** 로 확장되어 병렬 제작이 가능하다. 탈락 사유 — TURNKEY(퍼즐 레벨 디자인 품질에 시간 과다), LAST MILE(의사 3D 튜닝 리스크·재미 불확실), VANGUARD/DRAFT(첫 30초 느림, UI 버튼 비중 큼), METRONOME(음악 동기화 리스크).

---

## 2. 핵심 규칙

### 2.1 조작 (키보드 + 게임패드, 마우스 미사용)

| 키 | 패드 (Standard Gamepad) | 동작 |
|---|---|---|
| ← → / A D | 좌스틱 X(데드존 0.35) · D-Pad 14/15 | 이동 |
| **K** / Z | **2 (X / □)** | **패리** (Parry) |
| **J** / X | **3 (Y / △)** | **리포스트** (훔친 공격 사용) |
| **Space** / L / C / Shift | **1 (B / ○) · 5 (RB) · 7 (RT)** | **대시** (무적 프레임, 붉은 공격 회피) |
| Enter | 0 (A / ×) | 확인 / 시작 / 다음 |
| R | 8 (Select) | 현재 보스 재시작 |
| M | — | 음소거 토글 |
| Esc | 9 (Start) | 타이틀로 |

- **동사를 늘리지 않는다** — 패드는 기존 액션 이름에만 매핑된다. 버튼 인덱스·데드존은 `js/config.js`의 `PAD` 블록.
- 패드 입력은 키보드와 **같은 `_buffer`/`down` 경로**로 합류해 `justPressed`가 "고정 스텝 1회에서만 true"인 의미를 유지한다. 두 입력을 동시에 써도 서로를 끊지 않는다(패드가 스스로 쥔 액션만 놓는다).
- 🔴 **연결 전에는 폴링 비용 0.** `_padCount`가 0이면 `navigator`조차 건드리지 않는다. 프레임 루프에 붙는 작은 비용도 BASTION 같은 예민한 보스의 결과를 바꿀 수 있어서다(§8 게이트·handover 참조). 패드 연결·해제는 `gamepadconnected`/`gamepaddisconnected`로 추적하고, 해제 시 쥐고 있던 액션을 전부 놓는다.
- 검증: `node tests/pad.mjs` — 가짜 패드로 버튼·스틱·홀드 1회 발동·연결 해제 정리를 확인한다.

### 2.2 텔(Tell) 문법 — 두 가지 색만 쓴다

- **금색 플래시** = 패리 가능. 플래시 → 타격까지 시간은 공격별로 **항상 일정**(리듬 학습).
- **붉은 플래시** = 패리 불가. **대시**로 통과해야 한다. 패리하면 그냥 맞는다.
- 플래시와 동시에 짧은 오디오 큐(금: 높은 "tick", 적: 낮은 "thud")가 난다.
- **모양도 다르다 (2026-09-18 추가 — 접근성).** 금은 방사선 8줄, **적은 굵은 X자 4줄**(45/135/225/315도 고정). Game Accessibility Guidelines 1급 권고가 "고정된 색 하나만으로 정보를 전달하지 말 것"이라, 색·소리·모양 세 채널로 이중화한다 — 음소거 상태에서도, 색 구분이 어려워도 읽힌다. 수치는 `C.TELL.RED_*`. 호출부(`Boss.flash`)가 텔 종류를 **명시적으로** 넘긴다(색 문자열로 자동 판정하지 않는다).
- 색 재사용 금지: 세 번째 대응 유형이 필요해지면 색을 돌려 쓰지 말고 새 색·새 모양을 배정한다(Sekiro가 한 기호로 3종 대응을 표시해 "몸에 가려 못 읽는다"는 불만을 산 사례).
- **어둠 규칙 (2026-09-19 추가 — HOLLOW §3.11)**: **텔은 절대 어두워지지 않는다.** 아레나 `darkness` 는 배경·기둥·바닥·보스 몸통만 덮고, 금 버스트·적 X자·투사체·존·플레이어·HUD 는 어둠 레이어 **위에** 그린다(렌더 순서가 규칙, 계수는 세기일 뿐). `?nofx=1` 로 꺼지지 않는다 — 판정의 일부다.
- **악보 예외 (2026-09-23 추가 — CHORUS §3.6)**: 이 게임에서 유일하게, 첫 타격 뒤로는 플래시가 없다. 첫 플래시가 예고인 동시에 "이후 타격이 올 시각 전부"를 약속하고(간격은 공격별로 항상 일정), 플레이어는 그때부터 반응이 아니라 **기억**으로 받는다 — §2.2 의 "예고 → 타격은 항상 일정하다"는 원칙은 그대로 지킨다.
- **자세 상태 표시 (2026-09-23 추가 — ADAMANT §3.12)**: 회색 점선 링 + 낮은 울림(`RAudio.guard`) + 팝 `GUARD`는 **텔이 아니라 보스 상태 표시**다(GRAVEN 아머·ADAMANT 방벽과 같은 부류). 대응 색은 여전히 금(패리)·적(대시) 둘뿐 — 반격 자세가 세 번째 텔 색을 만들지 않는다.

### 2.3 패리 (K)

- 키를 누른 순간부터 `PARRY_PERFECT_WINDOW`(0.18s) 동안 **퍼펙트 창**, 이어 `PARRY_BLOCK_WINDOW`(0.34s)까지 **블록 창**.
- 보스 공격의 active 히트박스가 플레이어와 겹치는 순간:
  - 퍼펙트 창 안 → **PERFECT PARRY**: 피해 0, 공격을 **훔쳐 손패(hand)에 추가**, 스트릭 +1, 히트스톱 0.09s, 스파크, 보스 0.35s 경직(flinch). 투사체는 **반사**되어 보스 쪽으로 되돌아간다(맞으면 피해).
  - 블록 창 안 → **BLOCK**: 피해 0, 훔치기 없음, 플레이어 40px 밀림, 스트릭 유지(증가 없음).
  - 창 밖 / 붉은 공격 → **HIT**.
- 패리 키 입력 후 `PARRY_RECOVERY`(0.40s) 동안 재입력 불가(연타 방지). 헛친 패리 = 0.4s 무방비.
- 단, **패리가 성공하면 재입력 불가 시간이 `RECOVERY_ON_SUCCESS`(0.10s)로 단축된다** — 연속으로 날아오는 공격(§3.2 triple 등)을 연달아 받아낼 수 있어야 하기 때문이다. 성공 직후 `PARRY_SUCCESS_GRACE`(0.05s) 동안은 판정이 유지돼, 같은 순간에 겹쳐 도착한 두 번째 투사체도 "받아냈는데 맞는" 일이 없다.

### 2.4 대시 (Space)

- 지속 0.22s, 무적 0.20s, 이동 190px, 쿨다운 0.55s. 방향은 현재 이동 입력 방향(없으면 보스 반대쪽).
- 붉은 공격(charge, coup, rain, execution)의 유일한 대응. 대시 중 보스 몸통을 통과할 수 있다.

### 2.5 손패(Hand)와 리포스트 (J)

- 손패 3슬롯 FIFO 큐. 가득 찬 상태에서 훔치면 가장 오래된 것을 버린다.
- J = 큐의 맨 앞 공격을 실행. 훔친 공격은 종류(kind)별로 다르게 동작한다:
  - `lunge`: 앞으로 짧게 돌진하며 찌른다 (reach 170).
  - `slash`: 제자리 광역 호(arc) 베기 (reach 130, 넓은 판정).
  - `shot`: 투사체 발사 (사거리 무제한).
  - `slam`: 내려찍기 광역 (reach 260, 느린 선딜).
- **카운터 히트**: 보스가 **windup 중**일 때 리포스트가 명중하면 공격 취소(interrupt) + 피해 ×1.5.
- **엠파워**: 퍼펙트 패리 스트릭 3 이상이면 다음 리포스트 피해 ×2 (사용 시 스트릭 유지, 카운터는 소모됨). 스트릭은 **피해를 입을 때만** 0으로 리셋.
- 아머(armor) 보스(Graven)는 엠파워 리포스트에만 interrupt된다.

### 2.6 체력·승패

- 플레이어 HP 5 (하트). 피격 시 0.8s 무적, 밀림 120px, 붉은 비네트.
- 보스 HP는 보스별 테이블. HP 50% 이하 시 **Phase 2** 진입(1.0s 포효, 무적, 화면 플래시, windup ×0.8, 신규 패턴 해금).
- 보스 HP 0 → 슬로모 0.25× 1.4s + 줌인 → **VICTORY 카드**(시간, 피격, 퍼펙트 수, 랭크) → Enter로 다음 보스.
- 플레이어 HP 0 → 슬로모 → **DEFEAT** ("R: 재도전", "Esc: 타이틀").
- 4번째 보스(챕터 1 마지막) 격파 → **INTERLUDE** (챕터 I 랭크·시간 카드) → Enter → 5번째 보스 STORY/INTRO. 8번째 보스 격파 → **ENDING** (총 시간, 총 피격, 총 퍼펙트, 종합 랭크). localStorage에 보스별 최고 랭크·진행도 저장. 챕터 경계는 `config.CHAPTERS` 테이블이 정한다(§3 공통).
- **트라이 수 (2026-09-18, 사용자 요청)**: 보스별 **전투 시작 횟수**를 런 단위로 센다(`run.tries[key]` — 첫 도전 1, DEFEAT 뒤 R 재도전마다 +1, 타이틀로 나가 Continue 하면 새 런이라 1부터, `?boss=N` 도 센다). 표시: VICTORY 카드 `TRIES N`(저장된 최소 기록이 있으면 `best M` 병기), INTERLUDE·ENDING 보스 행에 트라이 열, DEFEAT 화면 `TRY N`. 저장: 보스별 최소 트라이 `bestTries[key]`(승리 시 갱신, `?boss=N` 판은 저장 안 함). `getState().tries` 로 노출(테스트가 R 재도전 후 2 가 되는지 본다).

### 2.6.1 스태미너 (2026-09-18 추가 — 연타 결함 수정)

> **왜 넣었나.** 패리 키를 연타하면 보스가 그냥 깨지는 결함이 있었다. 실측: K+J 연타 봇이 24판 중 9승(SERAPH 3/3 · BASTION 3/3 · GRAVEN 2/3 · MIRROR 1/3), K만 연타해도 VESPER에게 115초 동안 피격 0. 근본 원인은 **판정 창(0.34s) < 재입력 잠금(0.40s)** 이라 헛쳐도 실질 무방비가 0.06초뿐이고, 블록도 "성공"으로 취급돼 잠금이 0.10초로 줄어 연타가 끊기지 않는 것이다. 측정기 = `tests/mash.mjs`(회귀 게이트 `--expect-lose`).

- 스태미너 `MAX` 100에서 시작. **패리 입력 시 `PARRY_COST`(30), 대시 시작 시 `DASH_COST`(20) 소모** — 성공 여부와 무관하게 누르는 순간 나간다.
- 마지막 소모 후 `REGEN_DELAY`(0.5s)가 지나면 초당 `REGEN`(25)으로 회복.
- **환급은 §2.3의 판정 사다리를 그대로 따른다.** 정확히 읽으면 공짜, 타이밍만 맞추면 절반, 못 읽으면 전액 부담이다.

  | 판정 | 환급 | 실질 비용 |
  |---|---|---|
  | PERFECT | `PERFECT_REFUND` 30 (= 소모값) | **0** |
  | BLOCK | `BLOCK_REFUND` 15 | 15 |
  | 헛침 | 0 | 30 |

  퍼펙트가 순소모 0이라 §2.5의 "무결점이면 무한" 판타지가 수치로 지켜진다. 블록에 절반을 돌려주는 이유는 **정확히 읽고도 마르는 일을 막기 위해서다** — 환급이 퍼펙트뿐이면 패리 횟수가 가장 많은 BASTION(완벽 봇 34회, 되받아치기 랠리가 짧은 간격의 연속 패리를 요구)에서 숙련 플레이가 먼저 바닥난다(실측: 숙련 봇 DEFEAT). 연타는 대부분 **헛침**이라 이 완화의 혜택을 받지 못한다.
- 잔량이 부족하면 패리·대시 입력이 **무시되고, 입력 버퍼에도 쌓이지 않는다.** (버퍼에 쌓으면 잠금이 풀리는 순간 자동 재입력돼 연타가 그대로 살아남는다 — 이게 핵심이다.) 이때 스태미너 바가 `EMPTY_FLASH`(0.25s) 점멸하고 둔탁한 헛손질 음이 난다.
- HUD: 하트 바로 아래 얇은 바(`C.HUD.STAMINA_*`). 잔량이 패리 1회분 미만이면 붉게 칠한다 — 이 장르 리뷰의 1순위 불만이 "왜 안 먹혔는지 모르겠다"라서 상태를 눈에 보이게 한다.
- 상수는 전부 `js/config.js`의 `STAMINA` 블록. 보스 전환·재도전 시 `Player.reset()`이 `MAX`로 되돌린다.

**기각한 안 (실측 근거)**: 재입력 잠금만 늘리는 방식. `PARRY.RECOVERY` 0.40 → **0.8**이면 연타는 0/24로 막히지만 숙련 프로파일 봇이 MIRROR 페인트에 죽어 7/8. **0.6**도 숙련 봇이 BASTION 되받아치기 랠리에 죽어 7/8. ⇒ 실수 한 번을 과하게 벌하면 정상 플레이가 먼저 무너진다. 스태미너는 "연속 헛침"만 벌하고 단발 실수는 한 칸으로 끝난다.

### 2.7 랭크

| 랭크 | 조건 |
|---|---|
| S | 피격 0 **그리고** 시간 ≤ par |
| A | 피격 ≤ 1 **또는** 시간 ≤ par |
| B | 피격 ≤ 3 |
| C | 그 외 |

챕터 랭크 = 그 챕터 4보스 랭크 평균, 종합 랭크 = 12보스 랭크 평균(S=4, A=3, B=2, C=1 → 반올림).

---

## 3. 보스 12종 — 챕터 3개 (모두 데이터 테이블로 정의)

공통: 아레나 논리 해상도 960×540, 바닥 y=440, 플레이어 x∈[60, 900]. 보스는 선호 거리를 유지하려 이동.

챕터(2026-09-17 확장): `config.CHAPTERS = [{ id: 1, name: 'CHAPTER I — THE HAND', bosses: ['vesper','seraph','graven','mirror'] }, { id: 2, name: 'CHAPTER II — THE DEBT', bosses: ['lantern','chorus','bastion','avarice'] }, { id: 3, name: 'CHAPTER III — THE WALL', bosses: ['sentinel','tempest','hollow','adamant'] }]`(챕터 3 은 2026-09-19 추가). 진행은 지금처럼 `window.BOSSES` 순서를 따르고, 챕터 마지막 보스 격파 시 INTERLUDE 카드가 끼어든다(마지막 챕터 뒤는 ENDING). 챕터 선택 화면은 만들지 않는다(`?boss=5..12` 로 충분). 챕터 1 이 "동사를 배운다"(패리→반사→강화→인내)면 챕터 2 는 "상대가 나를 안다" — 같은 동사를 상대가 역이용한다. 챕터 3 은 "빼앗기가 통하지 않는다"(THE WALL) — 주지도 되빼앗지도 않고 막아선다. 설계 근거·대안 비교는 `2026-09-17-riposte-chapter2-proposal.md` · `2026-09-19-riposte-chapter3-design.md`.

**신규 보스 차별화 원칙 (2026-09-18, 사용자 지시)**: 새 보스는 먼저 등록된 보스와 **패턴·컨셉이 겹치면 안 된다** — 의도된 기획(예: MIRROR 가 챕터 1 기술을 되돌려 쓰는 것)이 아니라면. 판정은 `node tools/boss-overlap.mjs --check` 가 한다: (a) 실루엣 동일 금지, (b) 패턴 모양(스텝 열 형태)이 먼저 등록된 보스와 50% 이상 겹침 금지, (c) 공격 구성(kind/tell) 유사도 75% 이상 금지, (d) **(2026-09-23 추가)** 챕터 2 이후 보스는 먼저 등록된 보스 누구와든 **동작 서명**(`kind`/`tell` + 행동을 바꾸는 표지 — `linger`·`echo`. `volley`·`anchor`·수치는 서명에 넣지 않는다)이 같은 공격을 최대 1개까지만 가진다(손패 공급용 기본기 1장). `kind` 는 엔진이 아는 것(기존 4종 + `js/motions.js` 에 등록된 동작)만 허용한다 — 새 kind 이름을 붙여 수치 변주를 새 서명으로 통과시키는 길을 막는다. 의도된 복제는 보스 정의에 `overlapIntended: '<이유>'` 로 선언한다(단, (d)는 `overlapIntended` 로 면제되지 않는다). 이 검사는 보스 추가·수정 PR 의 게이트이며, 기획서(§3.x)에는 "챕터 1 이 쓰지 않은 공간 모양 1개 이상" 을 명시한다. (배경: 2026-09-17 챕터 2 1차 구현이 챕터 1 패턴 모양을 16/18 복제 — 기획·QA·밸런스 전 단계에 차별화 기준이 없었던 결함.)

공통 하한: **windup 은 배수(P2 ×0.8)를 먹여도 `BOSS.MIN_WINDUP`(0.34s) 아래로 내려가지 않는다** — 플래시를 보고 반응할 수 있는 최소 시간을 보장한다. 돌진(charge)은 진행 방향 벽까지 `BOSS.MIN_CHARGE_RUN`(260px)이 안 나오면 그 스텝을 건너뛴다(시작하자마자 자기 경직으로 끝나는 무의미한 돌진 방지).

🔴 **공정성 수정 2건 (챕터 2·3 구현 중 발견, 2026-09-23)**: (1) 경직·포효로 공격이 끊기면 그 공격이 예약해 둔 후속 발사(연사 volley·협공 뒤 탄 등, `a.spawns`)도 함께 취소된다 — 끊은 공격의 결과가 뒤늦게 코앞에서 나오지 않는다(commit `c699b0f`). (2) 되받아치기(deflect)는 되받은 탄이 플레이어의 받는 거리에 `C.BOSS.DEFLECT_MIN_REACT`(0.40s) 이상 걸려야 발동한다 — 반응할 수 없는 거리(코앞)에서는 되받지 않는다(commit `6f8585a`, §3.7 BASTION).

### 3.1 VESPER — 결투가 (HP 120, par 30s) — 튜토리얼 보스

| 공격 | 텔 | windup | active | recover | reach | 접근 | 훔친 기술 |
|---|---|---|---|---|---|---|---|
| thrust | 금 | 0.60 | 0.10 | 0.55 | 160 | 80px | THRUST (lunge, 16) |
| slash | 금 | 0.50 | 0.10 | 0.50 | 130 | 30px | SLASH (slash, 14) |
| coup (P2) | **적** | 0.90 | 0.14 | 0.80 | 210 | 120px | — |

- P1 패턴: `[thrust]`, `[slash]`, `[close, slash]`, `[thrust, wait .6, thrust]`
- P2 패턴: `[thrust, slash]`(간격 .25), `[coup]`, `[slash, wait .2, thrust]`, `[back, thrust]`
- **튜토리얼 HUD 프롬프트(이 보스 P1 한정)**: 첫 퍼펙트 패리 전 "K — 금색 플래시에 패리", 손패가 생기면 "J — 훔친 THRUST로 리포스트", 첫 붉은 텔에 "SPACE — 붉은 공격은 대시". 각 프롬프트는 해당 행동 성공 시 사라진다.

### 3.2 SERAPH — 궁수 (HP 190, par 35s)

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| arrow | 금 (투사체, 속도 560) | 0.45 | 패리 시 반사(10 피해) | ARROW (shot, 10) |
| triple | 금 ×3 (0.22s 간격) | 0.50 | 각각 패리 가능 | ARROW |
| kick | 금 (근접, reach 110) | 0.35 | 플레이어가 240px 이내일 때 | KICK (slash, 12, 밀림) |
| backstep | — | 0.20 | 220px 후퇴 (플레이어 근접 시) | — |
| rain | **적** (존) | 1.00 | 플레이어 현재 x 중심 폭 160 존에 1.0s 후 낙하 | — |
| pierce (P2) | **적** (투사체, 속도 760) | 0.40 | 대시로만 회피 | — |

- 행동: 거리 ≥ 350 유지 시도. P2에서 arrow windup 0.36, triple 간격 0.18.
- 아레나 폭 제한으로 코너에 몰리면 kick 또는 rain을 쓴다.

### 3.3 GRAVEN — 거한 (HP 250, par 40s) — 아머

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| slam | 금 | 0.85 | reach 180, 피해 1, 충격파 연출 | SLAM (slam, 28, reach 260) |
| shockwave | 금 (지면 투사체, 속도 300) | 0.70 | 패리 시 반사 | SHOCKWAVE (shot, 14, 느림) |
| charge | **적** | 0.70 | 아레나 반대편까지 돌진 (이동 히트박스), 벽에 닿으면 0.9s 경직 | — |
| double slam (P2) | 금 ×2 (0.35s 간격) | 0.85 | 둘 다 패리 가능 | SLAM |
| charge→slam (P2) | 적 → 금 | — | 돌진 후 즉시 slam | SLAM |

- 아머: 일반 리포스트에 flinch/interrupt 없음. 엠파워(스트릭 ≥3) 리포스트만 interrupt. 벽 충돌 경직 중에는 모든 리포스트가 카운터 판정.

### 3.4 MIRROR — 거울 (HP 320, par 50s) — 챕터 1 최종

- 실루엣 = 플레이어와 동일(백색). 앞선 보스들의 thrust / slash / arrow / slam 을 windup ×0.85로 사용.
- **feint**: 금색 플래시 → (가짜) windup → 무기가 `FEINT_HOLD`(0.45s) 동안 멈춤 → **두 번째 플래시** → 그 공격의 **정상 windup** → 실제 타격. 즉 2차 플래시부터 타격까지의 간격은 그 공격의 평소 리듬과 정확히 같다(§2.2의 약속을 페인트도 지킨다). 배운 박자대로 1차 플래시에 패리하면 허공을 치고(무피해·무보상), 2차 플래시를 기다린 사람만 받아낸다 — 인내를 가르친다.
- **P2 "mirror"**: 플레이어 손패에 든 기술을 순서대로 그대로 사용(손패가 비면 기본 thrust). 훔친 기술이 거울에 비쳐 돌아온다 = 주제의 결말.
- **execution** (적): 0.95s windup 후 reach 240 잡기. 대시로만 회피. 피해 2.
- P1 패턴: `[thrust]`, `[feint-thrust]`, `[slash, thrust]`, `[arrow, close, slash]`, `[slam]`
- P2 패턴: `[mirror ×hand.length]`, `[feint-slash, thrust]`, `[execution]`, `[arrow, arrow, slam]`

### 3.5 LANTERN — 환술사 (HP 280, par 50) — 챕터 2 · 부메랑 + 등 뒤 순간이동 (2026-09-23 재설계)

실루엣 `lantern`(등불 + 단검, 무기 `dagger`), 색 `#7dff9a`. 엔진: 스텝 `{ move: 'behind' }`(순간이동, 유지) + 신규 `kind:'boomerang'`(§3 엔진 표 — 적으로 나가 등 뒤에서 금으로 돌아온다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| flicker | 금 | 0.55 | reach 160, lunge 계열 — 챕터 1 과 서명이 같은 유일한 기본기 | FLICKER (lunge, 18) |
| orb | 적→금 (부메랑, 속도 340) | 0.60 | 적으로 나가 `turnDist` 200 에서 돈다. 도는 자리에서 두 번째(금) 텔 버스트, `backTime` 0.60 으로 귀환 텔→타격이 일정. 퍼펙트 패리하면 보스 쪽으로 반사 | ORB (shot, 14) |
| orb2 (P2) | 적→금 ×2 (volley 0.30) | 0.55 | 부메랑 두 발 연속 | ORB |

- P1 패턴: `[behind, flicker]`, `[orb]`, `[far, orb]`, `[flicker, wait .5, orb]`
- P2 패턴: `[far, orb2]`(far 먼저 — 몸 옆에서 쏜 외출탄은 생기자마자 맞는다, 실측), `[behind, flicker, orb]`, `[far, orb, behind, flicker]`(귀환 비행 중 순간이동 — **P2 만**, 돌아오는 방향이 보스 쪽과 어긋나는 것을 읽기가 두 배로 어려워진다), `[behind, flicker, behind, flicker]`
- 챕터 1 이 쓰지 않는 공간 모양: **같은 탄의 색이 비행 중에 바뀐다.** 앞으로 오는 적색은 대시로 넘기고, 등 뒤에서 돌아오는 금색을 뒤돌아 받는다.
- 실측 교훈(`docs/qa/balance-2026-09-23.md`): 숙련 3시드 다수결 2/3 이지만 s7 칸이 회차에 따라 갈린다(기준 경계 — 플레이테스트에서 따로 볼 것). flicker 뒤 코앞 외출탄은 봇에겐 안 보이지만 사람에게는 붉은 근접과 같은 박자로 읽힐 수 있어 플레이테스트 항목.

### 3.6 CHORUS — 쌍검 (HP 250, par 35) — 챕터 2 · 악보 + 메아리 + 좌우 교차 (2026-09-23 재설계)

실루엣 `twin`(양손 단검 2자루, 무기 `twin`), 색 `#4d9dff`. 엔진: 스텝 `{ move: 'cross' }`(교차 이동, 유지) + 신규 `kind:'score'`(악보 — 콜을 들려주고 같은 리듬으로 친다) + 근접 정의의 표지 `echo`(메아리 — 친 자리의 잔상이 다시 친다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| refrain | 금 (악보, 콜 간격 0.45·0.90) | 0.60 | 첫 플래시가 콜을 들려준 뒤 같은 리듬으로 3타 — **두 번째 타격부터 플래시 없음**, 외워서 받는다 | TWIN (slash, 13) |
| refrain2 (P2) | 금 (악보, 콜 간격 0.35·0.35·0.70) | 0.55 | 4타 | TWIN |
| canon | 금 (메아리 `delay` 0.70) | 0.55 | 친 자리에서 0.7초 뒤 잔상이 같은 박자로 다시 친다 — 보스는 그새 반대편으로 건너가 있다, **위치를 기억**해야 한다 | CANON (lunge, 15) |
| scissor (P2, 기본기) | **적** (근접 광역, reach 200) | 0.70 | 양쪽을 동시에 베는 가위 — 대시로만 회피 | — |

- P1 패턴: `[refrain]`, `[canon]`, `[canon, cross, canon]`(잔상 둘이 양쪽에서), `[cross, refrain]`
- P2 패턴: `[refrain2]`, `[canon, cross, refrain2]`, `[cross, canon, scissor]`, `[scissor, wait .3, canon]`
- 챕터 1 이 쓰지 않는 공간 모양: **악보**(예고에서 불규칙한 리듬을 먼저 들려주고 그대로 친다, §2.2 악보 예외) + **메아리**(친 공격을 보스가 있던 자리의 잔상이 같은 박자로 다시 친다).
- 실측 교훈(`docs/qa/balance-2026-09-23.md`): 카드 피해가 13~15 라 완벽 봇도 퍼펙트 10~17회가 필요해 금 타격마다 붙는 놓칠 확률이 쌓여 숙련 봇이 1/3 로 졌다 → **hp 300 → 250**(길이 레버가 아니라 처치까지 받아야 하는 금 타격 수를 줄인 것)으로 숙련 3/3. par 45 → 35.

### 3.7 BASTION — 수문장 (HP 310, par 50) — 챕터 2 · 아머 + 되받아치기 + 기둥 (2026-09-23 재설계)

실루엣 `shield`(큰 방패 + 짧은 철퇴, 무기 `shield`), 색 `#a8b8c8`, armor: true, deflect: true. 엔진: 신규 `kind:'pillar'`(기둥 — 등 뒤(와 P2 는 사이에도) 서서 걷기·대시·밀림을 막는다, 칸 폭이 `C.ARENA.SAFE_MIN_W`(200) 미만이 되면 서지 않는다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| salvo | 금 (지면 투사체, 속도 380) | 0.65 | 패리 시 반사, **반사되면 deflect 대상**. 손패 공급원 하나라 모든 패턴에 있다 | VOLLEY (shot, 20) |
| gate | **적** (기둥, 등 뒤 150px, `up` 4.0s) | 0.90 | 물러설 곳이 막힌다 — 아머 보스를 정면으로 받게 만든다 | — |
| cage (P2) | **적** (기둥 2개 — 등 뒤 + 보스·플레이어 사이, `up` 3.5s) | 0.95 | 투사체만 오가는 방. 되받아치기 랠리는 기둥을 사이에 두고 계속된다 | — |

- P1 패턴: `[salvo]`, `[gate, salvo]`, `[far, salvo, wait .45, salvo]`, `[gate, wait .5, salvo]`
- P2 패턴: `[cage, salvo, wait .4, salvo]`(랠리, 2연사), `[gate, salvo, salvo]`, `[far, gate, salvo]`, `[salvo, far, salvo]`
- deflect(스펙 유지): 플레이어 쪽 투사체가 `DEFLECT_REACH` 안이면 idle/recover 중 확률(`DEFLECT_CHANCE_P1/P2` 0.35/0.55, 랠리 `DEFLECT_MAX_RALLY`(3) 회째엔 0)로 되받는다. 되받은 탄은 `DEFLECT_SPEED_MULT`(0.55)로 느려진다. 🔴 **2026-09-23 추가**: 되받은 탄이 받는 거리(`PARRY.PROJECTILE_CATCH`)에 닿기까지 `C.BOSS.DEFLECT_MIN_REACT`(0.40s) 보다 짧게 걸리면 되받지 않는다(§3 공통 공정성 수정 2 — commit `6f8585a`) — 코앞(28px)에서 되받혀 반응 시간이 0에 가깝던 결함을 막는다.
- 챕터 1 이 쓰지 않는 공간 모양: **보스 앞이 막힌다.** 기둥이 선 동안은 원거리(반사·shot)만 통하고, 되받는 순간만이 열린 틈.
- 실측 교훈(`docs/qa/balance-2026-09-23.md` §5): 완벽 12/12·숙련 3/3 이지만 **평균 프로파일이 3/3 VICTORY 로 기준(≥2/3 DEFEAT) 미달** — 허용 레버(구성·gap·hp) 3개로 못 바꿨다. 원인은 salvo 하나로 필요한 퍼펙트 수(6~8)가 정해지고, 봇이 기둥에 한 번도 부딪히지 않아서(전 판 `dash 0`) — 기둥의 "물러설 곳을 막는다"는 봇 수치에 드러나지 않는다. **사용자 결정 대기**: salvo 수치(피해·속도) 하향 / 되받기가 실제로 나오는 자리(설계) / 사람 플레이테스트로 넘김.

### 3.8 AVARICE — 약탈자 (HP 400, par 55) — 챕터 2 보스 · 끌어당김 · 빼앗김 (2026-09-23 재설계)

실루엣 `taker`(후드 + 긴 외투, 무기 없음, player 보다 큼), 색 `#ff2fa6`, stealOnHit: true. 엔진: 신규 `kind:'pull'`(끌어당김 — windup 동안 플레이어를 보스 쪽으로 끈다, `melee: true` 지만 접근하지 않는다).

- **되돌림은 이제 자기 카드뿐이다.** `MIRROR_MAP = { COUNT: 'count', HAUL: 'haul' }` — 보스마다 `Player.hardReset()` 이 손패를 비우므로 이 전투의 손패엔 AVARICE 가 준 카드만 있다(챕터 1·2 기술 사본 7종은 도달 불가능한 죽은 정의였다 — 2026-09-23 제거, `overlapIntended` 선언도 필요 없어졌다). `{ mirror: 'loot' }`(빼앗은 손패)와 `{ mirror: 'all' }`(플레이어 현재 손패)로 되돌려 쓴다.

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| count | 금 (근접 광역, reach 190) | 0.90 | **fallbackAttack** — loot·손패가 비면 나오는, 플레이어가 첫 카드를 훔칠 유일한 금색 | COUNT (slash, 25) |
| haul | 금 (끌어당김, `pull.speed` 170) | 0.90 | windup 동안 보스 쪽으로 끌려간다. `pull.speed`(170) < `PLAYER.SPEED`(265) 라 걸어서 버티면 사거리 밖에서 헛친다 | HAUL (slash, 20) |
| plunder | **적** (끌어당김 + 잡기, `pull.speed` 150) | 0.95 | 피해 1 + 손패 전부 강탈. 대시로만 회피 | — |

- P1 패턴: `[loot]`, `[haul]`, `[close, loot]`, `[plunder, haul]`
- P2 패턴: `[all]`, `[haul, loot]`, `[plunder, loot]`, `[loot, wait .3, loot, wait .3, loot]`
- stealOnHit(유지): 피격마다 손패 맨 앞 1장 → 보스 인스턴스 `loot`. plunder 는 전부. loot 는 def 가 아니라 인스턴스에만.
- 챕터 1 이 쓰지 않는 공간 모양: **끌어당김** — 예고 동안 보스 쪽으로 끌려간다. 버티며 걸어 나가 헛치게 만들지, 끌려가며 타이밍을 다시 잡을지 고른다. 빼앗긴 HAUL 을 되돌려 쓰면 다시 끌려간다.
- 실측 교훈(`docs/qa/balance-2026-09-23.md`): par 55 유지(숙련 중앙 31.8s×2=63.5, 완벽 최소×3=54.7, 차 0.3 → 10s 허용 안).

**챕터 2 수치는 2026-09-23 확정 — `docs/qa/balance-2026-09-23.md`.** 2026-09-18 의 par/HP 는 동작 재설계 전 값이라 폐기했다(LANTERN·CHORUS 만 값이 바뀌었다, 위 각 절 참조). HP 는 길이 레버가 아니다(handover 교훈 3). 이전 실측 기록은 `docs/qa/balance-2026-09-18.md`.

### 3.9 SENTINEL — 창의 파수꾼 (HP 320, par 50) — 챕터 3 첫 보스 · 지속 구역 + 쓸기 빔 (2026-09-19 초안, 2026-09-23 쓸기 빔 추가)

실루엣 `spear`(키 큰 파수꾼 + 긴 창 — 렌더러만 있고 아무 보스도 쓰지 않던 것을 살렸다), 색 `#8fe3c8`, 아레나 `wall`. **이동하지 않는다**(기존 전원 이동) — `prefer` 를 넓게 잡아 접근·후퇴 스텝이 발동하지 않고, 패턴에 move 스텝이 없다. 엔진: 존 `linger`(지속형 위험 구역, `LINGER_TICK` 단위 재타격) + `C.ARENA.SAFE_MIN_W`(200) + 신규 `kind:'sweep'`(쓸기 빔 — 등 뒤 벽에서 보스 쪽으로 쓸고 온다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| lance | 금 (reach 260, 찌르기) | 0.70 | 움직이지 않으므로 리치가 위협의 전부 | LANCE (lunge, 22) |
| line | **적** (쓸기 빔, 폭 90, 속도 320) | 0.85 | 등 뒤 벽에서 pending 예고로 나타나 windup 끝에 보스 쪽으로 움직인다. **빔 쪽으로 대시**하면 넘고(0.10s < 대시 무적 0.20s), 반대로 대시하면 걷기(265) < 빔(320) 이라 따라잡힌다 — 방향 선택이 강제된다 | — |
| claim | **적** (존, anchor boss, offset 320, 폭 120, **linger 1.8**) | 0.95 | 설 자리를 지운다. 대시로만 | — |

- P1 패턴: `[lance]`, `[line, wait .3, lance]`, `[claim, wait .3, lance]`, `[lance, wait .45, lance]`
- P2 패턴: `[claim, wait .3, lance]`, `[line, lance]`, `[lance, wait .35, lance]`, `[lance, wait .3, line]`
- 🔴 한 패턴에 claim 은 최대 하나 — 보스가 고정이라 살아 있는 구역은 최대 2개(합 400px), 남는 맨바닥이 `SAFE_MIN_W` 보다 넓다. 🔴 **claim 과 line 은 한 패턴에 넣지 않고, 구역이 살아 있으면 `onPickPattern` 이 line 패턴을 뽑지 않는다**(2026-09-23 추가) — 빔을 넘는 대시의 착지점이 지속 구역일 수 있다(갇힘). **플레이어가 물리적으로 갇히는 일은 없어야 한다.**
- 챕터 1·2 가 쓰지 않는 공간 모양: **설 자리가 줄어든다**(claim, 대시로 도망칠 곳이 자원 관리가 된다) + **등 뒤에서 쓸고 오는 빔**(line, 도망쳐도 따라잡혀 방향을 골라야 한다).
- 실측 교훈: `linger` 는 `LINGER_TICK`(0.9) 의 배수로만 의미가 있다(1.5 = 1.8). 2.4 에서는 존이 살아 있는 동안 플레이어가 창 리치 밖으로 물러나 금 텔이 오지 않는 죽은 시간이었다(완벽 봇 43.6s → 27.1s).

### 3.10 TEMPEST — 비 (HP 330, par 46) — 챕터 3 · 협공 (2026-09-23 재설계)

실루엣 `storm`(무기 없는 넓은 어깨 — 던지는 자), 색 `#7fc4ff`, 아레나 `wall`, 부제 THE RAIN. 옆으로 흘러다니며(left/right) 각도를 바꾸고, 붙으면(`RANGE.CROWDED` 180) 밀어내거나 물러난 뒤에만 쏜다(`onPickPattern` 이 far/near 태그로 풀을 고른다). 엔진: 신규 `kind:'pincer'`(협공 — 앞 탄과 등 뒤 탄이 일정한 시차로 온다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| surge | 금 (대형 투사체 r16, 속도 380, **3연발** 간격 0.26) | 0.55 | 세 발이 동시에 떠 있다 — 전부 받아낼 수 없다 | SURGE (shot, 14) |
| squall | 금→적 (협공, `gap` 0.45) | 0.60 | 앞 금 1발 → 0.45초 뒤 **등 뒤**에서 적 1발이 그 자리 텔 버스트와 함께 나타난다(`backDist/backSpeed` 로 텔→타격 일정). 등 뒤 공간이 `PINCER_MIN_ROOM`(160) 보다 좁으면 뒤 탄은 생기지 않는다 | SQUALL (shot, 14) |
| squall2 (P2) | 금×3→적 (협공) | 0.60 | 앞은 surge 와 같은 3연발, 마지막 앞 탄 0.45초 뒤 등 뒤 적 1발 | SQUALL |

- P1 패턴(far): `[surge]`, `[far, squall]`, `[left, far, squall]`, `[surge, wait .85, far, squall]` · (near) `[back, surge]`, `[back, squall]`
- P2 패턴(far): `[far, squall2]`, `[surge, right, far, squall]`, `[left, far, squall2]`, `[far, squall, wait .5, surge]` · (near) `[back, squall2]`, `[back, surge]`
- 🔴 각 탄의 플래시 → 타격 간격은 windup(또는 `backDist/backSpeed`) 하나로 고정(§2.2).
- 챕터 1·2 가 쓰지 않는 공간 모양: **협공.** 앞(금)과 등 뒤(적)에서 일정한 시차로 온다 — 앞을 받고 곧바로 뒤를 넘는다. 두 방향·두 색·순서를 같이 읽어야 한다.
- 실측 교훈: `gap` 0.45 순서형으로 시작(사용자 결정, `docs/qa/balance-2026-09-23.md`). 사람 플레이테스트에서 "패리하고 대시하는 순서 문제"로만 읽히면(설계 검토 지적) 재설계 스펙(2026-09-23) §6 되돌릴 기준대로 `gap` 을 줄여 앞·뒤가 겹치게 한다.

### 3.11 HOLLOW — 어둠 (HP 300, par 60) — 챕터 3 · 표식 (2026-09-23 재설계)

실루엣 `hollow`(무기 없이 키만 크고 몹시 가늘다), 색 `#8a7fb0`, 아레나 **`void`**(유일하게 `darkness: { p1: 0.72, p2: 0.85 }` 가 붙은 무대 — 그 외 값은 `wall` 과 같다). 엔진: 신규 `kind:'mark'`(표식 — 플레이어 몸에 붙어 따라다니는 카운트다운). 공격 구성을 표식·ember 둘로 좁혔다(grasp·rend·snuff 삭제) — 어려움은 공격 수가 아니라 텔 하나만 보고 싸우는 데서 나와야 한다.

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| brand | 금 (표식, `delay` 1.40) | 0.70 | active 순간 플레이어 위치에 두 번째 텔 버스트로 표식이 붙는다. 붙은 자리에서 1.4초 뒤 터진다 — **보스가 아니라 자기 몸의 카운트다운**을 읽는다. 받으면 훔친다 | BRAND (lunge, 20) |
| brand-red (P2) | **적** (표식, `delay` 1.40) | 0.70 | 터지는 순간 대시 | — |
| ember | 금 (투사체 r12, 속도 340, **2연발** 간격 0.45/0.38) | 0.72 | 어둠 속 빛 두 점. 반드시 back 뒤에만 — 코앞 생성 탄은 받아낼 수 없다 | EMBER (shot, 14) |

- P1 패턴: `[brand]`, `[back, ember]`, `[brand, wait .2, back, ember]`(표식이 도는 동안 탄이 온다 — 겹침이 이 동작의 핵심), `[back, ember, brand]`
- P2 패턴: `[brand-red, brand]`, `[brand, wait .2, back, ember]`, `[back, ember, brand-red]`, `[brand, wait .3, brand-red]`
- 표식은 붙은 뒤 보스가 경직돼도 사라지지 않는다(이미 약속된 타격) — 붙기 전(windup)에 끊기면 붙지 않는다. 표식·카운트다운 링은 어둠 **위에** 그린다.
- **핵심 보호 규칙(§2.2 어둠 규칙)**: 텔·투사체·존·플레이어·HUD 는 어두워지지 않는다. "내 주변만 밝고 보스는 어둠 속" 안은 기각 — 보스가 안 보이면 텔도 안 보인다.
- 챕터 1·2 가 쓰지 않는 공간 모양: **시야 + 표식.** 12스테이지 내내 "플래시를 읽어라" 라고 가르친 것을, 어둠 속에서는 보스가 아니라 자기 몸에 붙은 빛을 읽는 것으로 시험한다.
- 실측 교훈(`docs/qa/balance-2026-09-23.md`): par 75 → **60**. 어둠은 봇에겐 보이지 않으므로 봇 실측으로는 판정할 수 없다 — **사람 플레이테스트 항목**. 되돌릴 기준(재설계 스펙 §6): 표식과 다른 공격의 겹침이 "읽을 수 없다"면 표식 중에는 금 공격만 겹치게 제한한다.

### 3.12 ADAMANT — 벽 (HP 340, par 52) — 챕터 3 최종 · 방벽 + 반격 자세 (2026-09-19 초안 방벽, 2026-09-23 반격 자세로 재설계)

실루엣 `adamant`(가장 크고 가장 두껍다 — 대검 하나), 색 `#c9b8ff`, 아레나 `wall`. 엔진: **`wall: { hits: 2, up: 6.0, breakStagger: 1.6 }`**(유지) · **`counterOnly: {}`**(유지) · 신규 `kind:'stance'`(반격 자세 — 이 윈드업 중에 치면 벌을 받는다).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| shards | 금 (투사체 r13, 속도 360, **2연발** 간격 0.5/0.42, 반사 피해 14) | 0.62 | 방벽을 깨는 재료 — **반사탄만** `hits` 를 깎는다(손패에서 쏜 SHARD 는 안 깎는다). far 뒤에만 | SHARD (shot, 12) |
| guard | 금 (반격 자세) | 0.90 | 자세 표시 **3채널**(회색·점선 링·낮은 울림) — 텔은 여전히 금(끝의 강타를 약속). 끝까지 참으면 windup 끝에 금 강타 → 패리하면 CLEAVE 를 훔친다. 자세 중 리포스트가 맞으면 피해 0·환급 없음(팝 `GUARD`)에 즉시 `retort` | CLEAVE (slam, 24) |
| retort | **적** (자세 벌 반격, reach 240, windup `MIN_WINDUP` 0.34) | 0.34 | 자세 중 맞았을 때만 발동 — **패턴이 직접 부르지 않는다**(서명 `stance/counter`, `stanceCounter: true`) | — |

- P1 패턴(wall): `[far, shards]`, `[far, shards, close, guard]` · (any) `[guard]`, `[close, guard]`
- P2 패턴(wall): `[far, shards, shards]`, `[far, shards, close, guard]` · (any) `[guard, wait .4, guard]`, `[close, guard]`
- **방벽(Phase 1~2, 유지)**: 서 있는 동안 리포스트는 튕기고(피해 0·손패 환급, 팝 `WALL`) 반사탄만 `hits` 를 깎는다. `hits` 0 → `breakStagger` 동안 카운터 경직(보상, 팝 `BREAK`) → `WALL_DOWN`(5.0) 뒤 다시 선다. `up` 초 안에 깨지지 않으면 보상 없이 저절로 내려간다. 방벽이 서 있으면 `onPickPattern` 이 shards 가 든 풀만 뽑는다.
- **Phase 2 counterOnly(유지)**: 윈드업·카운터 경직 중 명중만 피해(팝 `COUNTER ONLY`).
- 반격 자세는 카운터 창이 아니다 — 방벽이 서 있으면 방벽 판정이 먼저다(방벽에 튕긴 리포스트는 벌을 받지 않는다).
- 챕터 1·2 가 쓰지 않는 공간 모양: 멀리서 붙는 이동(far…close) + **참기**(guard, 지금까지 "윈드업 중 명중 = 카운터"였던 규칙을 뒤집는다). GRAVEN 아머는 *위력* 조건(엠파워), ADAMANT 는 *타이밍* 조건 — 반사 + 카운터, 12스테이지가 가르친 것의 기말고사.
- 실측 교훈(`docs/qa/balance-2026-09-23.md`): par 75 → **52**. `wall.up` 6.0(볼리 두 번)에서 완벽 26.4~33.9s. 벽 코너(x=900)에 몰린 보스는 어떤 배치로도 멀어지지 못해 P2 SHARDS 두 번째 탄이 코앞에서 생기는 경우가 남는다 — 컨트롤러 판정: 엔진 수정 없음(연사 후속탄은 예고된 첫 탄 뒤 정해진 간격으로 오므로 읽을 수 있다), **사람 플레이테스트 항목**. 숙련 봇의 남은 패배는 GUARD(반격 자세) 오판이다.

**챕터 3 수치는 2026-09-23 확정 — `docs/qa/balance-2026-09-23.md`.** 3시드(7·11·23) 실측: 완벽 12/12(챕터 2·3 전체) · 숙련 5~11 전부 2/3 이상 · 평균 5·6·8~12 는 2/3 이상 DEFEAT(**BASTION 만 3/3 VICTORY로 미달**, §3.7) · 연타 0/36 · 하드 12/12 · 판정기(`tools/boss-overlap.mjs --check`) 8보스 전원 재활용 ≤1·새 서명 ≥1을 `overlapIntended` 없이 통과. 남은 과제(BASTION 평균 미달·LANTERN 숙련 경계·ADAMANT 벽 코너 후속탄·LANTERN 코앞 외출탄)는 전부 사람 플레이테스트로 넘겼다 — `docs/qa/playtest-ch23-attacks.md`. 설계 근거·되돌릴 기준은 `2026-09-23-riposte-ch23-attacks-design.md` §5~6, 2026-09-19 초안(방벽·claim·surge 등 1차 확정)은 `2026-09-19-riposte-chapter3-design.md`·`docs/qa/balance-2026-09-19.md`.

---

## 4. 게임 필(Feel) 체크리스트 — 구현 필수

| 이벤트 | 히트스톱 | 흔들림 | 연출 |
|---|---|---|---|
| 퍼펙트 패리 | 0.09s | 4px | 백색 프레임 플래시 1프레임, 금색 스파크 24개 + 확장 링, "STOLEN: THRUST" 텍스트 팝, 스트릭 카운터 펄스 |
| 블록 | 0.04s | 2px | 회색 스파크 8개 |
| 리포스트 명중 | 0.06s | 6px | 보스 실루엣 백색 점멸, 피해 숫자 팝, 카운터 시 "COUNTER!" |
| 플레이어 피격 | 0.10s | 10px | 붉은 비네트 0.4s, 하트 깨짐 애니 |
| Phase 2 진입 | 0.20s | 8px | 화면 플래시, 보스 이름 배너 재등장 ("— PHASE II"), 드론 음 상승 |
| 보스 격파 | 슬로모 0.25×/1.4s | 14px | 줌인 1.15×, 실루엣 파편화 파티클, 랭크 카드 슬라이드 인 |
| 텔 플래시 | — | — | 무기 끝 원형 버스트(금/적) + 방사선, 오디오 큐 |

- 캐릭터는 스프라이트 없이 **벡터 실루엣 + 절차 애니메이션**(이동 기울기, 호흡 바운스, 무기 호 궤적 글로우).
- 아레나: 어두운 배경 `#0b0d14`, 바닥선 `#1a1f2e`, 원거리 기둥 패럴랙스 2층, 바닥 반사 그라디언트.
- 색: 플레이어 `#5ee6ff`, Vesper `#ff4d6d`, Seraph `#b78cff`, Graven `#ffb347`, Mirror `#ffffff`, 금 텔 `#ffd166`, 적 텔 `#ff3b3b`. 챕터 2 — Lantern `#7dff9a`, Chorus `#4d9dff`, Bastion `#a8b8c8`, Avarice `#ff2fa6`.

## 5. 오디오 (WebAudio 합성, 외부 파일 0)

| 이벤트 | 합성 |
|---|---|
| 금 텔 | 2.2kHz 사인 tick 40ms |
| 적 텔 | 90Hz 사인 + 노이즈 thud 120ms |
| 퍼펙트 패리 | 노이즈 버스트 + 금속 배음(1.8k/2.7k/4.1kHz) 감쇠 0.5s |
| 블록 | 저역 노이즈 thud |
| 리포스트 명중 | 120Hz 스퀘어 펀치 + 노이즈 |
| 훔치기 | 3음 아르페지오(C5-E5-G5) 60ms 간격 |
| 피격 | 저역 붐 + 왜곡 |
| 보스 격파 | 긴 저역 붐 + 상승 셰퍼드풍 샤인 |
| 드론(BGM) | 디튠 saw 2개 + lowpass + LFO. Phase 2에서 cutoff 상승 + 심박 킥 추가(보스별 BPM 테이블) |

- 첫 사용자 입력에서 AudioContext resume. M 음소거. `?mute=1` 지원. AudioContext 없으면 no-op.
- 챕터 2 보스는 `AUDIO.BPM` 에 4키 추가(lantern 100 / chorus 120 / bastion 88 / avarice 124)와 각 보스 파일의 `droneHz` 만 정한다. 신규 합성 없음. STORY 장면은 드론 없음. 줄 넘김 `RAudio.ui`, 정답 `parryPerfect`, 오답 `playerHit` 효과음만 쓴다.

## 6. 화면 흐름

`TITLE` → (Enter) → `STORY`(before, §10) → `INTRO`(보스 이름 배너 1.2s) → `FIGHT` → `VICTORY`(카드) → (Enter) → `STORY`(after) → 다음 `STORY`(before) → `INTRO` …
4번째 `STORY`(after) → `INTERLUDE`(CHAPTER I 랭크·시간 카드) → (Enter) → 5번째 `STORY`(before) … → 8번째 `STORY`(after, 선택지) → **`INTERLUDE`(CHAPTER II)** → (Enter) → 9번째 `STORY`(before) … → **12번째 `STORY`(after, 마지막 줄 소멸) → `ENDING`** → (Enter) → `TITLE` (2026-09-19: 엔딩이 8스테이지 뒤에서 12스테이지 뒤로 이동. 8 뒤는 두 번째 INTERLUDE)
`FIGHT` → HP 0 → `DEFEAT` → (R) 같은 보스 `INTRO`(**STORY 없음**) / (Esc) `TITLE`

- TITLE: 제목, 한 줄 Hook, **세로 메뉴**. 항목은 진행도에 따라 달라진다 — `NEW RUN`(항상) / `CONTINUE`(저장 진행도가 있을 때) / `BOSS SELECT`(클리어한 보스 ≥1) / `OPTIONS`(항상). 챕터 1 을 이미 클리어한 기존 세이브(`cleared=true`)는 `CONTINUE` 가 챕터 II 로 이어 붙는다(`loadSave` 가 4보스 시절 cleared 세이브를 `cleared=false, unlocked+1` 로 옮긴다 — 디스크에 쓰지 않는 멱등 마이그레이션. 8보스 완주 세이브는 건드리지 않는다. 챕터 3 추가 후에도 같은 규칙 — 12보스 완주 세이브만 `cleared=true` 로 남는다).
  - 🔴 **커서 기본값은 `NEW RUN`(0번)** — Enter 한 번이 그대로 시작이어야 한다. `tests/smoke.mjs`·`bot.mjs`·`audio-smoke.mjs` 가 "TITLE→Enter→(STORY)→FIGHT" 를 전제하고, STORY 를 넣을 때 이 전제가 3군데에서 깨진 전례가 있다(handover 교훈 6).
  - 메뉴 이동은 `up`/`down` 액션(↑↓ · W/S · D-Pad 12·13 · 좌스틱 Y). **전투 동사는 늘리지 않는다** — 메뉴 전용이며 `left`/`right` 의 플레이어 이동 경로는 건드리지 않는다.
- OPTIONS (타이틀에서만 진입, 값은 전부 `C.STORAGE.KEY` 안 `settings` 필드에 합류 저장):

  | 항목 | 값 | 비고 |
  |---|---|---|
  | MASTER VOLUME | 0~100 (10 단위) | `RAudio` 마스터 게인. 0 = 음소거 |
  | FULLSCREEN | ON/OFF | `requestFullscreen()` — 브라우저가 거부하면 조용히 무시 |
  | SCREEN FLASH | ON/OFF | `FX.whiteFlashEnabled` (= `?flash=0`) |
  | PARTICLES | ON/OFF | `FX.enabled` (= `?nofx=1`) |
  | ASSIST: PLAYER HP | ×1 / ×1.5 / ×2 | 기본 ×1. `C.ASSIST.HP` |
  | ASSIST: BOSS WINDUP | ×1 / ×1.2 / ×1.5 | 기본 ×1(느릴수록 쉬움). `C.ASSIST.WINDUP` |
  | KEY BINDINGS | 하위 화면 | 충돌 키는 거부. `Esc`·`Enter` 는 재지정 금지 |
  | RESET TO DEFAULTS | 실행 | |

  - 🔴 **ASSIST 가 기본값(×1, ×1)이 아니면 그 판은 랭크·최고 기록(`ranks`·`bestTimes`·`bestTries`)을 저장하지 않는다.** 진행도(`unlocked`)는 남겨 계속 진행할 수 있다 — Celeste Assist Mode 관행("코어 난도 무손상 + 옵트인"). 승리 카드·옵션 화면에 `ASSIST — NO RANK SAVED` 배지.
  - 기본 난도 자체는 바꾸지 않는다(사용자 결정 2026-09-10).
  - 부팅 순서는 `applySettings()` → URL 파라미터라 `?nofx=1`·`?flash=0`·`?mute=1` 이 저장값을 이긴다.
- BOSS SELECT: 클리어한 보스만 목록에 띄운다. 고른 판은 **진행도를 저장하지 않는다**(`?boss=N` 규칙과 동일).

### 6.1 아레나 5종 (2026-09-18 추가 · 2026-09-19 `wall`·`void` 추가)

배경은 이미지가 아니라 테이블이다. 보스 정의의 `arena: 'id'` 가 `C.ARENA` 에서 한 벌을 고른다. 바꾸는 것은 **색·기둥 개수/간격/높이·시차 계수·별**뿐이고 **도형 추가·새 렌더 패스·이미지 에셋은 없다**.

| 아레나 | 보스 | 성격 |
|---|---|---|
| `hall` | VESPER · GRAVEN · MIRROR | 현행 값 그대로(기존 스크린샷 보존) |
| `range` | SERAPH · LANTERN | 더 어둡고 기둥이 멀고 낮다 — 원거리 보스의 넓은 공간 |
| `gate` | CHORUS · BASTION · AVARICE | 기둥이 촘촘하고 높다 — 닫힌 문 앞 |
| `wall` | SENTINEL · TEMPEST · ADAMANT | gate 를 본뜨되 더 차갑고(청회색) 기둥이 벽처럼 촘촘하다. 배경 밝기는 gate 이하 |
| `void` | HOLLOW | `wall` 과 같은 무대에 `darkness: { p1: 0.72, p2: 0.85 }` 만 더한다(§2.2 어둠 규칙) |

- 🔴 **`V.FLOOR_Y` 는 바꾸지 않는다** — 물리 지면이라 바꾸면 발이 뜬다. 높이감은 기둥·바닥색으로만 낸다.
- 🔴 아레나 색이 바뀌어도 **금(`#ffd166`)·적(`#ff3b3b`) 텔 대비가 유지**돼야 한다(§2.2). 배경을 밝히지 않는다.

### 6.2 RIPOSTE+ (하드 모드, 2026-09-18 추가)

엔딩 도달 시 언락(`save.hardUnlocked`), 타이틀 메뉴 2번째 항목. **커서 0번은 여전히 `NEW RUN`** 이라 하네스 호환이 유지된다.

- 배율은 `C.HARD` 한 벌뿐 — `WINDUP 0.85` · `GAP 0.85` · `PHASE2_AT 0.6`. `Boss.windupMult`/`patternGap`/`phase2Ratio` 세 곳에서만 곱한다. **보스 테이블은 한 수치도 바꾸지 않는다**(`tests/state.mjs` 불변 검증이 근거).
- 🔴 **새 보스·새 공격·새 실루엣을 만들지 않는다.** 같은 열두 보스를 빠르게 돌리는 것이다 — 적 컨셉 중복 금지 원칙(§3 공통)과 충돌할 여지 자체를 없앤다. 새 보스는 챕터 3 의 일이고, 그때는 `tools/boss-overlap.mjs --check` 통과가 채택 조건이다.
- 기록은 `save.hard` 에 따로 저장해 일반 기록과 섞이지 않고, 랭크에 `+` 배지가 붙는다.
- 진입: 메뉴 또는 `?hard=1`(언락 없이 — 테스트·밸런스용). `tests/bot.mjs --hard` 가 이 파라미터를 붙인다.
- 밸런스 기준: **하드에서 완벽 봇 12/12 VICTORY**(챕터 1·2 실측 6.99~27.49s, 일반 대비 약 10% 단축 · 챕터 3 은 2026-09-19 실측 19.9~48.9s). 숙련 봇은 져도 된다 — 그게 하드의 목적이다.
- STORY: 좌 플레이어 실루엣, 우 보스 실루엣(×1.6, idle), 하단 텍스트 박스. 첫 줄은 화자 라벨 `???`(콜드 오픈). 선택지는 `[K] …` / `[J] …` 두 줄. 오답 → `TAKEN.` 카드(붉은 비네트) → Enter → 선택지 복귀.
- INTERLUDE: 챕터 제목, 4보스 랭크, 챕터 시간, "ENTER — CHAPTER II"(8 뒤는 CHAPTER III).
- HUD: 상단 보스 이름·HP바(50% 마커), 좌상단 하트 5, 하단 중앙 손패 3슬롯(맨 앞 강조, 엠파워 시 금테), 우하단 스트릭 "×N", 우상단 타이머.

## 7. 기술

- 바닐라 JS + Canvas 2D, **classic `<script>` 태그** (ES module 금지 — `file://`에서도 열려야 함). 외부 CDN·폰트·이미지 0.
- 논리 해상도 960×540, 창에 맞춰 letterbox 스케일, DPR 대응. 고정 스텝 업데이트(1/120s 누적기), 렌더는 rAF.
- 결정론: 시드 RNG (`?seed=N`). 보스 패턴 선택과 되받아치기(deflect) 확률만 RNG 사용.
- 파일 구조:

```
index.html            style.css
js/config.js          전역 상수 테이블(타이밍·HP·랭크·색·히트스톱). 매직넘버 금지.
js/rng.js             시드 RNG
js/audio.js           window.RAudio (합성)
js/fx.js              파티클·흔들림·히트스톱·플래시·슬로모·텍스트 팝
js/input.js           키 상태 / justPressed / 리매핑 테이블
js/entities.js        Player, Projectile, Zone
js/boss.js            Boss 베이스: 패턴 실행기, 공격 생명주기(windup→active→recover), feint/charge/zone/projectile/armor/mirror 지원 (+ deflect, mirror:'loot' — 2026-09-17)
js/motions.js          새 공격 동작 표 window.MOTIONS[kind](부메랑·협공·쓸기 빔·끌어당김·기둥·표식·반격 자세·악보 + echo 표지) — boss.js 는 새 kind 를 이 표로 넘기기만 한다, 기존 kind(melee·projectile·zone·charge)는 그대로 (2026-09-23)
js/bosses/vesper.js  seraph.js  graven.js  mirror.js   — 챕터 1 데이터 정의 + 훅, window.BOSSES 등록
js/bosses/lantern.js chorus.js  bastion.js avarice.js  — 챕터 2 (2026-09-23 재설계: 부메랑·악보+메아리·기둥·끌어당김). 로딩 순서 = 진행 순서
js/bosses/sentinel.js tempest.js hollow.js adamant.js — 챕터 3 (2026-09-23 재설계: 쓸기 빔·협공·표식·반격 자세). 훅 onPickPattern(거리·방벽·구역 태그로 풀 선택)
js/story.js           대사 테이블 window.STORY (보스 key → before/after/choice). 정본: 2026-09-17-riposte-story-bible.md
js/render.js          아레나·캐릭터·텔·투사체 드로잉
js/ui.js              HUD·화면(타이틀/인트로/승리/패배/엔딩 + 스토리 박스/TAKEN 카드/인터루드)
js/game.js            상태 머신·업데이트·판정·점수·저장 (+ STORY/INTERLUDE 장면, stealOnHit)
js/main.js            부트·리사이즈·루프·디버그 훅
tests/smoke.mjs       playwright-core 헤드리스: 콘솔 에러 0, 타이틀→STORY→FIGHT 진입, 스크린샷
tests/bot.mjs         반응형 봇: 텔을 읽고 패리/대시/리포스트 → 각 보스 승리 가능 검증 + 무입력 봇은 패배 검증 (?story=0 로 진입)
tests/state.mjs       정의 테이블 불변 검증 (전투 전후 window.BOSSES · window.STORY 동일)
tests/story.mjs       대사 테이블 검사: 한 장면 ≤4줄, 느낌표 0, 보스별 전속 어미 교차 0 (바이블 §6.9 스크립트 이식)
tests/audio-smoke.mjs 오디오: 제스처 후 AudioContext running + 전 사운드 경로 호출 무예외
tests/pad.mjs · options.mjs  게임패드 · 옵션 화면
tests/mash.mjs        연타 봇 — --expect-lose 로 연타 전패 검증(스태미너 §2.6.1)
tests/dev.mjs         dev 모드(THIEF 커맨드·?dev=1·F키 치트·noSave) — 꺼져 있으면 어떤 키로도 발동하지 않는다
tests/zone.mjs        존 linger 동작 — 단발 존은 때리고 사라지고, 지속 존은 LINGER_TICK 마다 재타격
tests/motions.mjs     새 공격 동작 9종 단위 검증(부메랑 귀환·협공·빔 방향 선택·끌어당김·기둥 통행 차단·표식 지연 폭발·반격 자세 벌/보상·악보 무플래시 응답·메아리) + 기존 kind 불변 (2026-09-23)
tools/boss-overlap.mjs 보스 차별화 판정기(§3 공통, 2026-09-23 부터 동작 서명 재활용 검사 포함) · tools/check-pages.mjs Pages 배포 확인
tools/funqa.mjs        재미 QA 계측 — 봇 지표(퍼펙트/블록/피격 비율·되받기 발동 등)로 보스별 체감 난도 신호를 뽑는다
tools/shots.mjs       README 용 스크린샷 3장 → docs/media/
README.md
```

- 디버그 훅: `window.__RIPOSTE = { game, CONFIG, getState(), setTimeScale(n) }`.
  `getState()` → `{ scene, bossId, bossHp, bossMaxHp, phase, playerHp, stamina, playerX, bossX, hand:[id], streak, time, hits, perfects, tries, chapter, loot:[id], currentAttack: { id, tell, stage:'windup'|'active'|'recover', tRemain, hitAt } | null, projectiles:[{x,vx,tell}], zones:[{x,w,tRemain}] }`(`tries`: 현재 보스의 런 내 시도 횟수 · `chapter`: 현재 챕터 id · `loot`: 약탈 보스가 빼앗은 손패 id)
- URL 파라미터: `?boss=1..12` (해당 보스로 바로 — STORY 건너뜀, 저장 안 함), `?dev=1`(개발 모드 — 하네스용, §5.5 챕터 3 설계), `?story=0`(대화 전부 건너뜀), `?seed=N`, `?mute=1`, `?nofx=1`, `?flash=0`, `?speed=0.5`(타임스케일).
  - `?nofx=1` = 파티클·링·잔상·텍스트 팝만 끈다. `?flash=0` = **전체화면 백색 플래시만** 끈다(광과민성 옵트아웃 — 화면 100%·알파 0.85·0.055s이고 SERAPH `triple`(0.22/0.18s 간격)을 연속 퍼펙트로 받으면 0.44초 안에 3회라 WCAG·Xbox XAG 118의 "1초 내 3회 초과 + 화면 25% 이상" 임계에 닿는다). **둘 다 히트스톱·흔들림·슬로모·텔 버스트는 끄지 않는다** — 판정 타이밍의 일부다. 피격 붉은 비네트는 가장자리 그라디언트이고 무적 0.8s 때문에 초당 1회를 넘을 수 없어 `?flash=0` 대상이 아니다.
- `getState().scene` 에 `'STORY'`, `'INTERLUDE'` 추가. STORY 중에는 `story: { beat:'before'|'after', line, total, choice: null | 'pending' | 'taken' }` 를 함께 준다(`bossId` 는 최상위 필드; 테스트가 Enter 진행을 확인하는 데 쓴다).
- 상수: `config.CHAPTERS`(§3 공통), `config.STORY = { CPS: 24, SKIP_HOLD: 0.6, MAX_LINES: 4, TAKEN_FLASH: 0.4, ENDING_SLOT_DROP: 0.4, DISSOLVE: 0.8 }`, `config.BOSS` 에 `MIN_VOLLEY_GAP` · `DEFLECT_*`(§3.6~3.7) · `WALL_*`·`COUNTER_POP`(§3.12) · `LINGER_TICK`(§3.9), `config.ARENA.SAFE_MIN_W`·`void.darkness`(§3.9·3.11), `config.ENDING.LINES` 4박(§10), `config.DEV`(§5.5 챕터 3 설계). `config.FONT.UI` 에 한글 폴백 `"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR"` 추가(외부 폰트 로드 없음).

## 8. 성공 기준 (검증 방법)

1. `node tests/smoke.mjs` — pageerror 0, 타이틀 렌더, Enter 로 STORY 진입 → Enter 연타로 FIGHT 진입(VESPER 선택지는 K 로 통과), 60초 무입력 시 DEFEAT 도달(위협 존재 증명). DEFEAT → R 이 STORY 를 거치지 않고 INTRO 로 가는지 확인.
2. `node tests/bot.mjs --boss=N` (N=1..12) — 반응형 봇이 각 보스에게 승리(루프가 닫혀 있음을 증명). 봇 승리 시간이 par의 2배를 넘으면 밸런스 경고. `--all` 은 `BOSSES` 길이를 따르므로 12보스 자동 포함(`--boss=N` 과 `--all` 은 rAF 프레임 간격 차로 수치가 다르다 — 채택은 `--all`). deflect 는 봇의 반사가 자동 트리거하고, stealOnHit 는 봇이 손패를 상태에서 읽으므로 봇 수정 불필요.
3. 헤드리스 스크린샷 육안 점검: 타이틀·전투·패리 스파크·승리 카드·스토리 박스·인터루드·엔딩. (`node tools/shots.mjs` → `docs/media/`)
4. Pages 배포 후 `curl -I` 200, 헤드리스로 Pages URL 로드 시 pageerror 0.
5. `node tests/state.mjs` — 전투를 끝까지 굴린 뒤 `window.BOSSES` · `window.STORY` 가 부팅 직후와 완전히 동일(정의 테이블 불변 = 재시작·결정론 보장. AVARICE 의 loot 큐, 챕터 3 의 `wall`·`counterOnly`·`linger`·`darkness` 훅이 def 를 오염하지 않는지 여기서 잡는다).
6. `node tests/audio-smoke.mjs` — 음소거 없이 Enter 한 번으로 AudioContext 가 `running`, 모든 `RAudio` 공개 메서드 호출에 예외 0.
7. `node tests/story.mjs` — 대사 테이블: 장면당 ≤4줄, 느낌표 0, 보스별 전속 어미 교차 0(바이블 §3 표), 선택지 3개에 각각 `ok:true` 하나·`ok:false` 하나.
8. 밸런스: 새 챕터 보스 4종을 3프로파일(완벽·숙련 `--jitter=0.05 --miss=0.15 --think=0.25`·평균 `--miss=0.3 --jitter=0.09 --think=0.45`)로 실측해 par/HP 확정. **기준은 3시드(7·11·23) 다수결** — 완벽은 매 시드 승리, 숙련은 3시드 중 2 이상 승리(최종 보스·BASTION 은 1/3 허용), 평균은 3시드 중 2 이상 패배. (2026-09-19 정정: 이전 문구 "숙련 프로파일 전부 승리" 는 seed 7 단일 표본 위의 기준이었다 — 챕터 1·2 기준선이 seed 7 하나로만 측정됐음이 `docs/qa/balance-2026-09-19.md` §6 에서 확인됐고, seed 11 에서는 MIRROR·LANTERN·CHORUS·AVARICE 숙련이 지고 VESPER·SERAPH·GRAVEN 평균이 이긴다. `main` 에서도 같으므로 회귀가 아니라 기준선의 성질이다.) **챕터 1·2 재조정은 별도 결정이다** — 이 정정은 기준 문구만 고친다.
9. `node tests/dev.mjs` — dev 모드가 꺼져 있으면 F키·`THIEF` 가 아무 효과도 없고, 켜진 판은 저장하지 않는다. `node tests/zone.mjs` — 단발 존은 한 번 때리고 사라지고, 지속 존(linger)은 LINGER_TICK 마다 다시 때리는지 검증.
10. `node tests/motions.mjs`(2026-09-23) — 새 공격 동작 9종이 각각 "플레이어가 새로 하는 일"을 한 줄씩 검증(부메랑은 대시로 넘긴 뒤 등 뒤에서 금으로 돌아온다·빔은 빔 쪽 대시로만 넘는다·끌어당김은 걸어서 버티면 헛친다·기둥은 걷기·대시를 막고 칸이 좁으면 서지 않는다·표식은 부착 뒤 delay 에 터지고 경직으로 안 사라진다·반격 자세는 맞으면 벌·참으면 보상·악보는 두 번째 타격부터 플래시가 없다·메아리는 기록된 자리에서 친다) + 기존 kind(melee·projectile·zone·charge)는 한 줄도 다르지 않은지.

---

## 9. 비목표 (YAGNI)

- 점프, 다단 레인, 콤보 트리, 장비/성장, 긴 스토리 컷신, 멀티플레이, 모바일 터치 UI, 외부 에셋.
- (2026-09-17 개정) 헬테이커식 단문 대화(전투 경계에서 한 화면 4줄 이하, R 재도전 시 미반복, 스킵 가능)는 허용. 정본: docs/superpowers/specs/2026-09-17-riposte-story-bible.md
- 챕터 선택 화면, 새 플레이어 동사(가드 브레이크·홀드 패리 등), 대사 음성, 초상화 그림(실루엣 재사용으로 대신한다).

---

## 10. 스토리 — 헬테이커식 단문 대화 (2026-09-17 승인)

**대사 SSoT 는 `2026-09-17-riposte-story-bible.md`** 다. 대사 본문·보이스 설계표·자체 점검은 그쪽만 본다. 여기에는 시스템이 지켜야 할 규칙만 둔다.

- **배치**: 보스당 `before`(전투 전) 1장 + `after`(승리 후) 1장, 전투 경계에만. FIGHT 안 대사 0. `before` 는 그 보스 첫 진입 시만 — DEFEAT → R 은 INTRO 직행. Continue 로 들어오면 그 보스의 before 부터.
- **분량**: 한 장면 = 한 화면 ≤ 4줄(`STORY.MAX_LINES`), 줄당 한글 30자 안팎. 타자기(`STORY.CPS` 24자/s)는 아무 키에 즉시 완성, 완성 상태에서 Enter 로 다음 줄. Enter 길게(`SKIP_HOLD` 0.6s) 또는 Esc = 장면 스킵.
- **콜드 오픈**: `before` 1줄째는 화자 라벨 `???`. 2줄째부터 보스 이름·색.
- **선택지**: 두 동사만 — `K = PARRY`(받아넘김) / `J = RIPOSTE`(되받아침). 플레이어 답은 항상 한 단어. 오답 → `TAKEN.` 카드(붉은 비네트 `TAKEN_FLASH`, HP 손실 0) → Enter → 같은 선택지 복귀. 보스당 최대 1회, 총 3회(VESPER before · LANTERN before · AVARICE after). 챕터 3 에는 선택지를 두지 않았다(무리해서 늘리지 않는다). 정답은 항상 "겸손/의심/빈손" 쪽 — 오만·습관·소유가 벌을 받는다.
- **침묵행**: 본문이 `……` 뿐인 줄은 타자기 없이 즉시 표시, Enter 로 넘긴다.
- **엔딩 연출 (2026-09-19 개정 — 챕터 3)**: **ADAMANT `after` 마지막 줄**(`dissolve: true`)이 절반 찍힌 뒤 실루엣 알파를 0 으로(`DISSOLVE` 0.8s), 문장은 미완결로 남긴다. ENDING 카드 **4박** "NOTHING IS GIVEN. / EVERYTHING IS TAKEN. / NOTHING IS KEPT. / NOTHING IS LEFT TO TAKE."(`C.ENDING.LINES`·`LINE_AT`) 와 함께 손패 HUD 3칸이 `ENDING_SLOT_DROP`(0.4s) 간격으로 비어 가고, 마지막 줄은 손패가 다 빈 뒤 뜬다. 12보스 결과표. AVARICE `after` 정답 반응은 이제 소멸하지 않고 9번 보스(SENTINEL)를 예고한다 — 8 뒤는 두 번째 INTERLUDE.
- **스킵**: `?boss=N` · `?story=0` · `startBoss(opts.noStory)`. 봇·스모크 하네스는 `?story=0` 로 진입하고, smoke 만 기본 경로로 STORY 통과를 1회 검증한다(§8-1).
- **데이터**: `js/story.js` — `window.STORY[bossKey] = { before: [line…], after: [line…], choice?: { at, K: { text, ok, reply }, J: { text, ok, reply, dissolve? } } }`. `prompt` 필드는 없다 — 장면의 마지막 줄이 곧 질문이다. `dissolve: true` 는 choice 항목(reply) 또는 줄 객체에 붙는 연출 플래그 — 지금은 ADAMANT `after` 마지막 줄 하나(2026-09-19 이전엔 AVARICE `after` 선택지의 K). line 은 문자열 또는 `{ text, hideSpeaker: true }` 또는 `{ text, dissolve: true }`. 정의 테이블이므로 불변(§8-5). i18n 이 필요해지면 line 을 `{ ko, en }` 으로 바꾸고 조회 함수 하나만 추가한다.
- **줄기**(요약): 모든 보스의 기술도 빼앗은 것이고 원점은 "빌려줄 뿐 주지 않는" AVARICE. 챕터 1 = 되찾기(MIRROR), 챕터 2 = 빚의 주인, 챕터 3 = 주지도 뺏지도 않는 벽(ADAMANT). 결말 — 벽마저 넘고 나면 더는 가져갈 것이 없다(NOTHING IS LEFT TO TAKE). 별명 "빈손" 은 VESPER 가 붙이고 SERAPH·LANTERN 을 거쳐 퍼진다.
