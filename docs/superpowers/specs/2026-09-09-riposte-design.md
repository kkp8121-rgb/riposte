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
- 입력: **키보드 전용**. 마우스 미사용.
- 플레이어 판타지: "상대의 기술로 상대를 꺾는 무결점의 카운터 파이터".
- 1회 플레이: 보스 8종(챕터 2개 × 4) × 15~60초(숙련 기준, 재도전 포함 시 10~20분). 보스 단위 즉시 재시작. par는 숙련 인간형 봇 실측의 약 2배로 설정(챕터 1 실측 15~24초 · 챕터 2 는 구현 후 실측).

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

### 2.1 조작 (키보드 전용)

| 키 | 동작 |
|---|---|
| ← → / A D | 이동 |
| **K** / Z | **패리** (Parry) |
| **J** / X | **리포스트** (훔친 공격 사용) |
| **Space** / L / C / Shift | **대시** (무적 프레임, 붉은 공격 회피) |
| Enter | 확인 / 시작 / 다음 |
| R | 현재 보스 재시작 |
| M | 음소거 토글 |
| Esc | 타이틀로 |

### 2.2 텔(Tell) 문법 — 두 가지 색만 쓴다

- **금색 플래시** = 패리 가능. 플래시 → 타격까지 시간은 공격별로 **항상 일정**(리듬 학습).
- **붉은 플래시** = 패리 불가. **대시**로 통과해야 한다. 패리하면 그냥 맞는다.
- 플래시와 동시에 짧은 오디오 큐(금: 높은 "tick", 적: 낮은 "thud")가 난다.

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

### 2.7 랭크

| 랭크 | 조건 |
|---|---|
| S | 피격 0 **그리고** 시간 ≤ par |
| A | 피격 ≤ 1 **또는** 시간 ≤ par |
| B | 피격 ≤ 3 |
| C | 그 외 |

챕터 랭크 = 그 챕터 4보스 랭크 평균, 종합 랭크 = 8보스 랭크 평균(S=4, A=3, B=2, C=1 → 반올림).

---

## 3. 보스 8종 — 챕터 2개 (모두 데이터 테이블로 정의)

공통: 아레나 논리 해상도 960×540, 바닥 y=440, 플레이어 x∈[60, 900]. 보스는 선호 거리를 유지하려 이동.

챕터(2026-09-17 확장): `config.CHAPTERS = [{ id: 1, name: 'CHAPTER I — THE HAND', bosses: ['vesper','seraph','graven','mirror'] }, { id: 2, name: 'CHAPTER II — THE DEBT', bosses: ['lantern','chorus','bastion','avarice'] }]`. 진행은 지금처럼 `window.BOSSES` 순서를 따르고, 챕터 마지막 보스 격파 시 INTERLUDE 카드가 끼어든다. 챕터 선택 화면은 만들지 않는다(`?boss=5..8` 로 충분). 챕터 1 이 "동사를 배운다"(패리→반사→강화→인내)면 챕터 2 는 "상대가 나를 안다" — 같은 동사를 상대가 역이용한다. 설계 근거·대안 비교는 `2026-09-17-riposte-chapter2-proposal.md`.

**신규 보스 차별화 원칙 (2026-09-18, 사용자 지시)**: 새 보스는 먼저 등록된 보스와 **패턴·컨셉이 겹치면 안 된다** — 의도된 기획(예: MIRROR 가 챕터 1 기술을 되돌려 쓰는 것)이 아니라면. 판정은 `node tools/boss-overlap.mjs --check` 가 한다: (a) 실루엣 동일 금지, (b) 패턴 모양(스텝 열 형태)이 먼저 등록된 보스와 50% 이상 겹침 금지, (c) 공격 구성(kind/tell) 유사도 75% 이상 금지. 의도된 복제는 보스 정의에 `overlapIntended: '<이유>'` 로 선언한다. 이 검사는 보스 추가·수정 PR 의 게이트이며, 기획서(§3.x)에는 "챕터 1 이 쓰지 않은 공간 모양 1개 이상" 을 명시한다. (배경: 2026-09-17 챕터 2 1차 구현이 챕터 1 패턴 모양을 16/18 복제 — 기획·QA·밸런스 전 단계에 차별화 기준이 없었던 결함.)

공통 하한: **windup 은 배수(P2 ×0.8)를 먹여도 `BOSS.MIN_WINDUP`(0.34s) 아래로 내려가지 않는다** — 플래시를 보고 반응할 수 있는 최소 시간을 보장한다. 돌진(charge)은 진행 방향 벽까지 `BOSS.MIN_CHARGE_RUN`(260px)이 안 나오면 그 스텝을 건너뛴다(시작하자마자 자기 경직으로 끝나는 무의미한 돌진 방지).

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

### 3.5 LANTERN — 환술사 (HP 280, par 미정) — 챕터 2 · 색 읽기 + 등 뒤 순간이동 (2026-09-18 재설계)

실루엣 신규 `lantern`(등불 + 단검, 무기 `dagger`), 색 `#7dff9a`. 엔진 변경: 스텝 `{ move: 'behind' }`(플레이어 등 뒤 `prefer.close` 거리로 즉시 이동 + 잔상, `BOSS.BLINK_PAUSE` 0.12s 정지 후 다음 스텝).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| flicker | 금 | 0.55 | reach 160, lunge 계열 | FLICKER (lunge, 18) |
| flicker-red | **적** | 0.55 | **flicker 와 동일 박자·리치.** 색만 다르다 | — |
| glow | 금 (투사체, 속도 240, 느린 빛 구슬) | 0.50 | 패리 시 반사 | GLOW (shot, 12) |

- P1 패턴: `[behind, flicker]`, `[flicker-red]`, `[glow, behind, flicker]`, `[flicker, wait .3, flicker-red, wait .3, flicker]`(색 교대 리듬)
- P2 패턴: `[behind, flicker-red]`, `[glow, wait .3, glow, behind, flicker]`, `[behind, flicker, behind, flicker-red]`(연속 순간이동), `[flicker-red, wait .25, flicker]`
- 챕터 1 이 쓰지 않는 공간 모양: **뒤에서 온다.** 플레이어는 자동으로 보스를 보지만 잔상 순간에 방향이 뒤집힌다. 색과 방향을 같이 읽어야 한다.
- 판정기 예상: 실루엣 고유 · 비기본 패턴 모양 챕터 1 과 0% · 공격 구성 [m/g, m/r, p/g] vs VESPER 50%.

### 3.6 CHORUS — 쌍검 (HP 300, par 미정) — 챕터 2 · 연속 패리 + 좌우 교차 (2026-09-18 재설계)

실루엣 신규 `twin`(양손 단검 2자루, 무기 `twin`), 색 `#4d9dff`. 엔진 변경: 스텝 `{ move: 'cross' }`(플레이어를 **지나쳐** 반대편 `prefer.close` 거리로 `BOSS.CROSS_SPEED` 700px/s 로 달려 넘어간다 — LANTERN 의 순간이동과 달리 눈에 보이는 이동. 히트박스 없음).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| twin | 금 ×2 (volley interval 0.35) | 0.45 | 근접 2연타 — active 뒤 recover 대신 0.35s windup + 새 플래시 (`BOSS.MIN_VOLLEY_GAP`) | TWIN (slash, 13) |
| bolt | 금 (투사체, 속도 600) | 0.42 | 패리 시 반사 | BOLT (shot, 11) |
| triad (P2) | 금 ×3 (volley interval 0.35) | 0.50 | 근접 3연타 | TWIN |
| scissor (P2) | **적** (근접 광역, reach 200) | 0.70 | 양쪽을 동시에 베는 가위 — 대시로만 회피 | — |

- P1 패턴: `[cross, twin]`, `[twin]`, `[bolt, cross, twin]`, `[cross, twin, cross, twin]`
- P2 패턴: `[triad]`, `[cross, triad, scissor]`, `[bolt, wait .3, bolt, cross, triad]`, `[scissor]`
- 챕터 1 이 쓰지 않는 공간 모양: **한 패턴 안에서 플레이어의 반대편으로 넘어간다.** 연타 사이에 몸을 돌려 받아야 한다. 적색 돌진(lance)은 GRAVEN 과 겹쳐 삭제.
- 판정기 예상: 실루엣 고유 · 비기본 모양(`m:cross …`) 0% · 공격 구성 [m/g/volley ×2, p/g, m/r] vs VESPER 17%.

### 3.7 BASTION — 수문장 (HP 310, par 미정) — 챕터 2 · 아머 + 되받아치기 + 문 (2026-09-18 재설계)

실루엣 신규 `shield`(큰 방패 + 짧은 철퇴, 무기 `shield`), 색 `#a8b8c8`, armor: true, deflect: true. 엔진 변경: 존 정의 `zone.anchor: 'boss'`(보스 앞 `zone.offset` px 에 고정 — 기본은 플레이어 위치).

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| salvo | 금 (지면 투사체, 속도 280) | 0.65 | 패리 시 반사. **반사되면 deflect 대상** | VOLLEY (shot, 20) |
| gate | **적** (존, 보스 앞 offset 140, 폭 220) | 1.00 | 문이 닫힌다 — 근접 접근 차단. 대시로만 통과 | — |
| ward | 금 | 0.80 | reach 170, slam 계열 | WARD (slam, 30) |

- P1 패턴: `[salvo]`, `[gate, salvo]`, `[far, salvo, wait .45, salvo]`, `[ward]`
- P2 패턴: `[gate, salvo, wait .4, salvo, wait .4, salvo]`(랠리), `[far, gate]`, `[ward, gate]`, `[salvo, far, salvo]`
- deflect(스펙 유지): 플레이어 쪽 투사체가 `DEFLECT_REACH` 안이면 idle/recover 중 확률(`DEFLECT_CHANCE_P1/P2`, 랠리 `DEFLECT_MAX_RALLY` 회째엔 0 (랠리 상한))로 되받는다. 되받은 직후 `DEFLECT_RECOVER` 경직 = 카운터 창.
- 챕터 1 이 쓰지 않는 공간 모양: **보스 앞이 막힌다.** 문이 닫힌 동안은 원거리(반사·shot)만 통하고, 되받는 순간만이 열린 틈. 돌진(bulwark)은 GRAVEN 과 겹쳐 삭제.
- 판정기 예상: 실루엣 고유 · 비기본 모양(`m:far …`) 0% · 공격 구성 [p/g, z/r, m/g] vs GRAVEN 50% · vs SERAPH 60%.

### 3.8 AVARICE — 약탈자 (HP 400, par 미정) — 챕터 2 보스 · 빼앗김 · 자기 기술 없음 (2026-09-18 재설계)

실루엣 신규 `taker`(후드 + 긴 외투, 무기 없음, player 보다 큼), 색 `#ff2fa6`, stealOnHit: true, `overlapIntended: '되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다'`.

- **되돌림용 공격표**(thrust/slash/arrow/slam/flicker/glow/ward, windup ×0.80)는 **패턴에서 직접 호출하지 않는다.** `{ mirror: 'loot' }`(빼앗은 손패)와 `{ mirror: 'all' }`(플레이어 현재 손패)로만 나온다.
- 직접 호출하는 공격은 둘뿐:

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| count | 금 (근접 광역, reach 190, 느린 선딜) | 0.90 | "하나, 둘, 셋" 세며 걷어가는 한 번의 큰 휘두르기. **fallbackAttack** — loot·손패가 비면 이것이 나온다(플레이어가 첫 카드를 훔칠 유일한 금색) | COUNT (slash, 15) |
| plunder | **적** (잡기, reach 230) | 0.95 | 피해 1 + 손패 전부 강탈. 대시로만 회피. **P1 부터** | — |

- P1 패턴: `[loot]`, `[loot, loot]`, `[close, loot]`, `[plunder]`
- P2 패턴: `[all]`, `[loot, wait .3, loot, wait .3, loot]`, `[plunder, loot]`, `[count]`
- stealOnHit(유지): 피격마다 손패 맨 앞 1장 → 보스 인스턴스 `loot`. plunder 는 전부. loot 는 def 가 아니라 인스턴스에만.
- 챕터 1 이 쓰지 않는 공간 모양: **되돌림의 연쇄.** MIRROR 는 손패를 한 번 통째로 비추고, AVARICE 는 빼앗은 것을 잘게 나눠 두 번 세 번 되돌린다. 맞을수록 내 기술이 상대 손에 쌓인다 — 무피격이 곧 공격권.
- 판정기 예상: 실루엣 고유 · 비기본 모양(`M M`, `m:close M`, `M w M w M`) 0% · 공격 구성은 `overlapIntended` 선언.

**챕터 2 수치는 재설계 후 재실측 대상이다(2026-09-18).** 2026-09-17 의 par/HP 확정값은 복제된 기반 위의 값이라 폐기한다. 챕터 1 과 같은 3프로파일(완벽·숙련·평균) 봇 실측으로 par/HP 를 다시 확정한다. HP 는 길이 레버가 아니다(handover 교훈 3) — 레버는 엠파워·카운터 배수 스택과 패턴 간격(gap). 이전 실측·레버 기록은 `docs/qa/balance-2026-09-17.md`, 재실측은 `docs/qa/balance-2026-09-18.md`.

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
4번째 `STORY`(after) → `INTERLUDE`(CHAPTER I 랭크·시간 카드) → (Enter) → 5번째 `STORY`(before) … → 8번째 `STORY`(after, 선택지) → `ENDING` → (Enter) → `TITLE`
`FIGHT` → HP 0 → `DEFEAT` → (R) 같은 보스 `INTRO`(**STORY 없음**) / (Esc) `TITLE`

- TITLE: 제목, 한 줄 Hook, 조작표, "PRESS ENTER". 저장 진행도가 있으면 "[Enter] Continue — CH.II BOSS 2 / [N] New Game". 챕터 1 을 이미 클리어한 기존 세이브(`cleared=true`)는 "[Enter] Continue — CHAPTER II" 로 이어 붙인다(`loadSave` 가 4보스 시절 cleared 세이브를 `cleared=false, unlocked+1` 로 옮긴다 — 디스크에 쓰지 않는 멱등 마이그레이션. 8보스 완주 세이브는 건드리지 않는다).
- STORY: 좌 플레이어 실루엣, 우 보스 실루엣(×1.6, idle), 하단 텍스트 박스. 첫 줄은 화자 라벨 `???`(콜드 오픈). 선택지는 `[K] …` / `[J] …` 두 줄. 오답 → `TAKEN.` 카드(붉은 비네트) → Enter → 선택지 복귀.
- INTERLUDE: 챕터 제목, 4보스 랭크, 챕터 시간, "ENTER — CHAPTER II".
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
js/bosses/vesper.js  seraph.js  graven.js  mirror.js   — 챕터 1 데이터 정의 + 훅, window.BOSSES 등록
js/bosses/lantern.js chorus.js  bastion.js avarice.js  — 챕터 2 (2026-09-17). 로딩 순서 = 진행 순서
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
tools/shots.mjs       README 용 스크린샷 3장 → docs/media/
README.md
```

- 디버그 훅: `window.__RIPOSTE = { game, CONFIG, getState(), setTimeScale(n) }`.
  `getState()` → `{ scene, bossId, bossHp, bossMaxHp, phase, playerHp, playerX, bossX, hand:[id], streak, time, hits, perfects, currentAttack: { id, tell, stage:'windup'|'active'|'recover', tRemain, hitAt } | null, projectiles:[{x,vx,tell}], zones:[{x,w,tRemain}] }`
- URL 파라미터: `?boss=1..8` (해당 보스로 바로 — STORY 건너뜀, 저장 안 함), `?story=0`(대화 전부 건너뜀), `?seed=N`, `?mute=1`, `?nofx=1`, `?speed=0.5`(타임스케일).
- `getState().scene` 에 `'STORY'`, `'INTERLUDE'` 추가. STORY 중에는 `story: { beat:'before'|'after', line, total, choice: null | 'pending' | 'taken' }` 를 함께 준다(`bossId` 는 최상위 필드; 테스트가 Enter 진행을 확인하는 데 쓴다).
- 상수: `config.CHAPTERS`(§3 공통), `config.STORY = { CPS: 24, SKIP_HOLD: 0.6, MAX_LINES: 4, TAKEN_FLASH: 0.4, ENDING_SLOT_DROP: 0.4, DISSOLVE: 0.8 }`, `config.BOSS` 에 `MIN_VOLLEY_GAP` · `DEFLECT_*`(§3.6~3.7). `config.FONT.UI` 에 한글 폴백 `"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR"` 추가(외부 폰트 로드 없음).

## 8. 성공 기준 (검증 방법)

1. `node tests/smoke.mjs` — pageerror 0, 타이틀 렌더, Enter 로 STORY 진입 → Enter 연타로 FIGHT 진입(VESPER 선택지는 K 로 통과), 60초 무입력 시 DEFEAT 도달(위협 존재 증명). DEFEAT → R 이 STORY 를 거치지 않고 INTRO 로 가는지 확인.
2. `node tests/bot.mjs --boss=N` (N=1..8) — 반응형 봇이 각 보스에게 승리(루프가 닫혀 있음을 증명). 봇 승리 시간이 par의 2배를 넘으면 밸런스 경고. `--all` 은 `BOSSES` 길이를 따르므로 8보스 자동 포함. deflect 는 봇의 반사가 자동 트리거하고, stealOnHit 는 봇이 손패를 상태에서 읽으므로 봇 수정 불필요.
3. 헤드리스 스크린샷 육안 점검: 타이틀·전투·패리 스파크·승리 카드·스토리 박스·인터루드·엔딩. (`node tools/shots.mjs` → `docs/media/`)
4. Pages 배포 후 `curl -I` 200, 헤드리스로 Pages URL 로드 시 pageerror 0.
5. `node tests/state.mjs` — 전투를 끝까지 굴린 뒤 `window.BOSSES` · `window.STORY` 가 부팅 직후와 완전히 동일(정의 테이블 불변 = 재시작·결정론 보장. AVARICE 의 loot 큐가 def 를 오염하지 않는지 여기서 잡는다).
6. `node tests/audio-smoke.mjs` — 음소거 없이 Enter 한 번으로 AudioContext 가 `running`, 모든 `RAudio` 공개 메서드 호출에 예외 0.
7. `node tests/story.mjs` — 대사 테이블: 장면당 ≤4줄, 느낌표 0, 보스별 전속 어미 교차 0(바이블 §3 표), 선택지 3개에 각각 `ok:true` 하나·`ok:false` 하나.
8. 밸런스: 챕터 2 보스 4종을 3프로파일(완벽·숙련 `--jitter=0.05 --miss=0.15 --think=0.25`·평균 `--miss=0.3 --jitter=0.09 --think=0.45`)로 실측해 par/HP 확정. 숙련 프로파일 전부 승리, 평균 프로파일은 사망이 챕터 1 과 같은 기준.

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
- **선택지**: 두 동사만 — `K = PARRY`(받아넘김) / `J = RIPOSTE`(되받아침). 플레이어 답은 항상 한 단어. 오답 → `TAKEN.` 카드(붉은 비네트 `TAKEN_FLASH`, HP 손실 0) → Enter → 같은 선택지 복귀. 보스당 최대 1회, 총 3회(VESPER before · LANTERN before · AVARICE after). 정답은 항상 "겸손/의심/빈손" 쪽 — 오만·습관·소유가 벌을 받는다.
- **침묵행**: 본문이 `……` 뿐인 줄은 타자기 없이 즉시 표시, Enter 로 넘긴다.
- **엔딩 연출**: AVARICE 정답 반응은 마지막 글자 전에 실루엣 알파를 0 으로(`DISSOLVE` 0.8s), 문장은 미완결로 남긴다. ENDING 카드 "NOTHING IS GIVEN. / EVERYTHING IS TAKEN. / NOTHING IS KEPT." 와 함께 손패 HUD 3칸이 `ENDING_SLOT_DROP`(0.4s) 간격으로 비어 간다.
- **스킵**: `?boss=N` · `?story=0` · `startBoss(opts.noStory)`. 봇·스모크 하네스는 `?story=0` 로 진입하고, smoke 만 기본 경로로 STORY 통과를 1회 검증한다(§8-1).
- **데이터**: `js/story.js` — `window.STORY[bossKey] = { before: [line…], after: [line…], choice?: { at, K: { text, ok, reply }, J: { text, ok, reply, dissolve? } } }`. `prompt` 필드는 없다 — 장면의 마지막 줄이 곧 질문이다. `dissolve: true` 는 정답 쪽에만 붙는(AVARICE `after` 선택지의 K) 연출 플래그. line 은 문자열 또는 `{ text, hideSpeaker: true }`. 정의 테이블이므로 불변(§8-5). i18n 이 필요해지면 line 을 `{ ko, en }` 으로 바꾸고 조회 함수 하나만 추가한다.
- **줄기**(요약): 모든 보스의 기술도 빼앗은 것이고 원점은 "빌려줄 뿐 주지 않는" AVARICE. 챕터 1 = 되찾기(MIRROR), 챕터 2 = 빚의 주인. 결말 — 전부 쥔 채 "빈손" 이라 답하면 가져갈 것이 없어진다. 별명 "빈손" 은 VESPER 가 붙이고 SERAPH·LANTERN 을 거쳐 퍼진다.
