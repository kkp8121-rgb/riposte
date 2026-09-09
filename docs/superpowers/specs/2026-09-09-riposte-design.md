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
  - 진행: 보스마다 다른 공격을 훔치며, 마지막 보스는 플레이어가 훔친 기술을 그대로 되돌려 쓴다(거울).
- 장르: 사이드뷰 1:1 보스러시 액션 (패리 중심 듀얼). 점프 없음, 1차원 레인.
- 입력: **키보드 전용**. 마우스 미사용.
- 플레이어 판타지: "상대의 기술로 상대를 꺾는 무결점의 카운터 파이터".
- 1회 플레이: 보스 4종 × 60~100초 ≈ 6~8분. 보스 단위 즉시 재시작.

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

- 키를 누른 순간부터 `PARRY_PERFECT_WINDOW`(0.15s) 동안 **퍼펙트 창**, 이어 `PARRY_BLOCK_WINDOW`(0.30s)까지 **블록 창**.
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
- 4번째 보스 격파 → **ENDING** (총 시간, 총 피격, 총 퍼펙트, 종합 랭크). localStorage에 보스별 최고 랭크·진행도 저장.

### 2.7 랭크

| 랭크 | 조건 |
|---|---|
| S | 피격 0 **그리고** 시간 ≤ par |
| A | 피격 ≤ 1 **또는** 시간 ≤ par |
| B | 피격 ≤ 3 |
| C | 그 외 |

종합 랭크 = 보스 랭크 평균(S=4, A=3, B=2, C=1 → 반올림).

---

## 3. 보스 4종 (모두 데이터 테이블로 정의)

공통: 아레나 논리 해상도 960×540, 바닥 y=440, 플레이어 x∈[60, 900]. 보스는 선호 거리를 유지하려 이동.

공통 하한: **windup 은 배수(P2 ×0.8)를 먹여도 `BOSS.MIN_WINDUP`(0.34s) 아래로 내려가지 않는다** — 플래시를 보고 반응할 수 있는 최소 시간을 보장한다. 돌진(charge)은 진행 방향 벽까지 `BOSS.MIN_CHARGE_RUN`(260px)이 안 나오면 그 스텝을 건너뛴다(시작하자마자 자기 경직으로 끝나는 무의미한 돌진 방지).

### 3.1 VESPER — 결투가 (HP 150, par 60s) — 튜토리얼 보스

| 공격 | 텔 | windup | active | recover | reach | 접근 | 훔친 기술 |
|---|---|---|---|---|---|---|---|
| thrust | 금 | 0.60 | 0.10 | 0.55 | 160 | 80px | THRUST (lunge, 16) |
| slash | 금 | 0.50 | 0.10 | 0.50 | 130 | 30px | SLASH (slash, 14) |
| coup (P2) | **적** | 0.90 | 0.14 | 0.80 | 210 | 120px | — |

- P1 패턴: `[thrust]`, `[slash]`, `[close, slash]`, `[thrust, wait .6, thrust]`
- P2 패턴: `[thrust, slash]`(간격 .25), `[coup]`, `[slash, wait .2, thrust]`, `[back, thrust]`
- **튜토리얼 HUD 프롬프트(이 보스 P1 한정)**: 첫 퍼펙트 패리 전 "K — 금색 플래시에 패리", 손패가 생기면 "J — 훔친 THRUST로 리포스트", 첫 붉은 텔에 "SPACE — 붉은 공격은 대시". 각 프롬프트는 해당 행동 성공 시 사라진다.

### 3.2 SERAPH — 궁수 (HP 190, par 70s)

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

### 3.3 GRAVEN — 거한 (HP 250, par 80s) — 아머

| 공격 | 텔 | windup | 비고 | 훔친 기술 |
|---|---|---|---|---|
| slam | 금 | 0.85 | reach 180, 피해 1, 충격파 연출 | SLAM (slam, 28, reach 260) |
| shockwave | 금 (지면 투사체, 속도 300) | 0.70 | 패리 시 반사 | SHOCKWAVE (shot, 14, 느림) |
| charge | **적** | 0.70 | 아레나 반대편까지 돌진 (이동 히트박스), 벽에 닿으면 0.9s 경직 | — |
| double slam (P2) | 금 ×2 (0.35s 간격) | 0.85 | 둘 다 패리 가능 | SLAM |
| charge→slam (P2) | 적 → 금 | — | 돌진 후 즉시 slam | SLAM |

- 아머: 일반 리포스트에 flinch/interrupt 없음. 엠파워(스트릭 ≥3) 리포스트만 interrupt. 벽 충돌 경직 중에는 모든 리포스트가 카운터 판정.

### 3.4 MIRROR — 거울 (HP 320, par 100s) — 최종

- 실루엣 = 플레이어와 동일(백색). 앞선 보스들의 thrust / slash / arrow / slam 을 windup ×0.85로 사용.
- **feint**: 금색 플래시 → (가짜) windup → 무기가 `FEINT_HOLD`(0.45s) 동안 멈춤 → **두 번째 플래시** → 그 공격의 **정상 windup** → 실제 타격. 즉 2차 플래시부터 타격까지의 간격은 그 공격의 평소 리듬과 정확히 같다(§2.2의 약속을 페인트도 지킨다). 배운 박자대로 1차 플래시에 패리하면 허공을 치고(무피해·무보상), 2차 플래시를 기다린 사람만 받아낸다 — 인내를 가르친다.
- **P2 "mirror"**: 플레이어 손패에 든 기술을 순서대로 그대로 사용(손패가 비면 기본 thrust). 훔친 기술이 거울에 비쳐 돌아온다 = 주제의 결말.
- **execution** (적): 0.95s windup 후 reach 240 잡기. 대시로만 회피. 피해 2.
- P1 패턴: `[thrust]`, `[feint-thrust]`, `[slash, thrust]`, `[arrow, close, slash]`, `[slam]`
- P2 패턴: `[mirror ×hand.length]`, `[feint-slash, thrust]`, `[execution]`, `[arrow, arrow, slam]`

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
- 색: 플레이어 `#5ee6ff`, Vesper `#ff4d6d`, Seraph `#b78cff`, Graven `#ffb347`, Mirror `#ffffff`, 금 텔 `#ffd166`, 적 텔 `#ff3b3b`.

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

## 6. 화면 흐름

`TITLE` → (Enter) → `INTRO`(보스 이름 배너 1.2s) → `FIGHT` → `VICTORY`(카드) → (Enter) → 다음 `INTRO` … → `ENDING` → (Enter) → `TITLE`
`FIGHT` → HP 0 → `DEFEAT` → (R) 같은 보스 `INTRO` / (Esc) `TITLE`

- TITLE: 제목, 한 줄 Hook, 조작표, "PRESS ENTER". 저장 진행도가 있으면 "[Enter] Continue — Boss N / [N] New Game".
- HUD: 상단 보스 이름·HP바(50% 마커), 좌상단 하트 5, 하단 중앙 손패 3슬롯(맨 앞 강조, 엠파워 시 금테), 우하단 스트릭 "×N", 우상단 타이머.

## 7. 기술

- 바닐라 JS + Canvas 2D, **classic `<script>` 태그** (ES module 금지 — `file://`에서도 열려야 함). 외부 CDN·폰트·이미지 0.
- 논리 해상도 960×540, 창에 맞춰 letterbox 스케일, DPR 대응. 고정 스텝 업데이트(1/120s 누적기), 렌더는 rAF.
- 결정론: 시드 RNG (`?seed=N`). 보스 패턴 선택만 RNG 사용.
- 파일 구조:

```
index.html            style.css
js/config.js          전역 상수 테이블(타이밍·HP·랭크·색·히트스톱). 매직넘버 금지.
js/rng.js             시드 RNG
js/audio.js           window.RAudio (합성)
js/fx.js              파티클·흔들림·히트스톱·플래시·슬로모·텍스트 팝
js/input.js           키 상태 / justPressed / 리매핑 테이블
js/entities.js        Player, Projectile, Zone
js/boss.js            Boss 베이스: 패턴 실행기, 공격 생명주기(windup→active→recover), feint/charge/zone/projectile/armor/mirror 지원
js/bosses/vesper.js  seraph.js  graven.js  mirror.js   — 데이터 정의 + 훅, window.BOSSES 등록
js/render.js          아레나·캐릭터·텔·투사체 드로잉
js/ui.js              HUD·화면(타이틀/인트로/승리/패배/엔딩)
js/game.js            상태 머신·업데이트·판정·점수·저장
js/main.js            부트·리사이즈·루프·디버그 훅
tests/smoke.mjs       playwright-core 헤드리스: 콘솔 에러 0, 타이틀→FIGHT 진입, 스크린샷
tests/bot.mjs         반응형 봇: 텔을 읽고 패리/대시/리포스트 → 각 보스 승리 가능 검증 + 무입력 봇은 패배 검증
tests/state.mjs       보스 정의 테이블 불변 검증 (전투 전후 window.BOSSES 동일)
tests/audio-smoke.mjs 오디오: 제스처 후 AudioContext running + 전 사운드 경로 호출 무예외
tools/shots.mjs       README 용 스크린샷 3장 → docs/media/
README.md
```

- 디버그 훅: `window.__RIPOSTE = { game, CONFIG, getState(), setTimeScale(n) }`.
  `getState()` → `{ scene, bossId, bossHp, bossMaxHp, phase, playerHp, playerX, bossX, hand:[id], streak, time, hits, perfects, currentAttack: { id, tell, stage:'windup'|'active'|'recover', tRemain, hitAt } | null, projectiles:[{x,vx,tell}], zones:[{x,w,tRemain}] }`
- URL 파라미터: `?boss=1..4` (해당 보스로 바로), `?seed=N`, `?mute=1`, `?nofx=1`, `?speed=0.5`(타임스케일).

## 8. 성공 기준 (검증 방법)

1. `node tests/smoke.mjs` — pageerror 0, 타이틀 렌더, Enter로 FIGHT 진입, 60초 무입력 시 DEFEAT 도달(위협 존재 증명).
2. `node tests/bot.mjs --boss=N` (N=1..4) — 반응형 봇이 각 보스에게 승리(루프가 닫혀 있음을 증명). 봇 승리 시간이 par의 2배를 넘으면 밸런스 경고.
3. 헤드리스 스크린샷 육안 점검: 타이틀·전투·패리 스파크·승리 카드·엔딩. (`node tools/shots.mjs` → `docs/media/`)
4. Pages 배포 후 `curl -I` 200, 헤드리스로 Pages URL 로드 시 pageerror 0.
5. `node tests/state.mjs` — 전투를 끝까지 굴린 뒤 `window.BOSSES` 가 부팅 직후와 완전히 동일(정의 테이블 불변 = 재시작·결정론 보장).
6. `node tests/audio-smoke.mjs` — 음소거 없이 Enter 한 번으로 AudioContext 가 `running`, 모든 `RAudio` 공개 메서드 호출에 예외 0.

---

## 9. 비목표 (YAGNI)

- 점프, 다단 레인, 콤보 트리, 장비/성장, 스토리 컷신, 멀티플레이, 모바일 터치 UI, 외부 에셋.
