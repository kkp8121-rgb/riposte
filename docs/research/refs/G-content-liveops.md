# 상용 보스러시/듀얼 액션 게임 — 콘텐츠 수명·재플레이 리서치

> 대상: RIPOSTE(사이드뷰 1:1 보스러시 패리 듀얼, 플레이어 자기 공격 0개가 핵심 규칙, 키보드 전용, 보스 8종×2챕터, 랭크 S/A/B/C, 보스별 트라이 기록, `?seed=N`·`?speed=`·`?boss=N` 존재, 보스는 데이터 테이블). itch.io 잼 출품작을 상용 스토어 게임 수준으로 업데이트하기 위한 레퍼런스 조사.
> 조사 방식: 4개 병렬 리서치로 WebSearch·WebFetch(Steam 공식 API·공식 뉴스피드·Wikipedia·리뷰 매체) 수행. 세션 WebSearch 예산이 중간에 소진돼 후반 두 리서치는 Steam appdetails/appreviews API와 공식 뉴스 API로 대체 확인했다. **확인 필요**로 표기된 항목은 추측하지 않고 미확인으로 남겼다.

---

## 1. 게임별 출시 모드 구성 표

| 게임 | 난이도 옵션 | 보조/감상 모드 | 언락 요소 | 리더보드·데일리 | 출시 후 주요 추가(무료 표기 없으면 유료) |
|---|---|---|---|---|---|
| **Furi** (2016) | Promenade/Furi/Furier 3단(Furier는 클리어 후 언락, 패턴 자체를 재설계한 하드코어) | 없음(출시 시) | 스피드런 모드(Furier 클리어 후) | 스피드런 리더보드 | 2019-04 Freedom Update(무료): **Invincible Mode**(감상용 무적)+숨은 최종보스 Bernard+대체 조작. 2022-05 Onnamusha DLC(유료, 신규 플레이어블 캐릭터)+누적 무료 개선 통합 |
| **Titan Souls** (2015) | 클리어 후 언락되는 Hard/Ironman/No Dodge/Run/Truth 모드를 **자유 조합**(일부 조합 제약) | 없음 | 모디파이어 조합 자체 | 확인 필요(근거 없음) | 확인 필요 — 출시 후 대형 업데이트 근거를 찾지 못함 |
| **Katana Zero** (2019) | 스토리 모드 단일 출시 → 후속 **Hard Mode**(클리어 후 언락, 레벨 리믹스+보스 재설계) | 없음(확인 필요) | Hard Mode | **Speedrun Mode**(구간별 타이머, speedrun.com 공식 허브) | Hard Mode + Speedrun Mode 업데이트(무료, 정확한 날짜 확인 필요). 스토리 확장 무료 DLC는 예고 후 **6년째 미출시**(2025-04 기준 "완성 임박") |
| **Cuphead** (2017) | Simple/Regular/Expert 3단(최종보스 2개는 Simple 없음) | **Simple = 사실상 연습 모드**(클리어해도 진행 보상 없음) | 무기·참(charm) — 소울 컨트랙트로 구매 | 확인 필요 | 2022-06-30 The Delicious Last Course(유료 DLC) — 신규 캐릭터 Ms. Chalice, **King's Leap**(무기 금지, 패리로만 데미지를 주는 5연전 챌린지) |
| **Sifu** (2022) | 출시 시 단일 → 2022-05 **Student/Disciple/Master 3단** 후속 추가(무료) | 스코어 기반 모디파이어(bullet time, low gravity 등) | 아우핏·치트·모디파이어(스코어 연동) | 확인 필요(스코어링만 확인) | 2022 로드맵 순차 실행: 난이도(5월)→모디파이어(여름)→Replay Editor(12월 TU3)→**Arenas 모드**(12월 TU4)→2023-09 Final Content Update(아레나 6개+**Custom 모드**+Modifier Randomizer). 전부 무료 |
| **Nine Sols** (2024) | 인게임 **피해/체력 배율 슬라이더**(리뷰로 확인, 출시 시점 포함 여부는 확인 필요) | 위 슬라이더가 접근성 모드 역할 겸함 | 확인 필요 | 확인 필요 | 2024-11-26 콘솔 출시와 동시 무료 패치 — **Battle Memories**(보스 개별 재도전, Jade 자유 조합). 단, 여러 보스를 이어서 도는 "진짜" 보스러시는 미지원(커뮤니티 요청 지속 중) |
| **Sekiro** (2019) | **옵션 난이도 없음**(고정) — 끝까지 추가 안 함 | 없음 | 의상 3종(GOTY 업데이트, 게임 내 조건) | Remnants(고스트 공유, 순위 아님) | 2020-10 GOTY 무료 업데이트(출시 19개월 후) — **Gauntlet of Strength**(단일 목숨 보스 연속전, 일부 보스 신규 패턴), **Reflection of Strength**(개별 재도전), 의상 3종 |
| **One Finger Death Punch 2** (2019) | Student/Master/Grandmaster 3단(전작 기준, 2편 동일 여부 확인 필요) | 없음 | 스킬 26개 | Steam 공식 리더보드 | 2021-05·2022-05 신규 챕터 추가(출시 3년 후에도 지속). Endless Survival Tower 4종은 출시 시 포함 |
| **Kill Knight** (2024) | 4단계(출시 시부터) | 없음(패치 1.2.1 "설정 옵션 추가" 세부는 확인 필요) | 도전과제 기반 무기고 언락 | **글로벌 리더보드**(출시 시부터) | 2024-12-18 KRYSTALIZED UPDATE(출시 약 2.5개월 후, 무료) — **Weekly Descent**(매주 무작위 장비+층 조합, 주간 리더보드), 신규 무기 4종 |
| **Shogun Showdown** (2024 1.0) | 별도 옵션 없음(로그라이크 자체 난이도 곡선) | 없음 | **사망 루프로 캐릭터·공격·스킬 순차 언락**(메타 성장) | 데일리 챌린지·리더보드 확인 필요(Steam Leaderboards 카테고리 없음) | EA 기간 영웅 순차 추가(2023-10 Jujitsuka) → 2024-09-05 1.0 정식 출시(신규 영웅·지역·타일·스킬) |
| *참조* **Slay the Spire** | — | — | — | **데일리 챌린지**: 고정 시드+사전 조건, 전원 동일 조건 경쟁(1일 1회) | — |
| *참조* **Balatro** | — | — | — | Seeded runs(수동 시드 공유)는 있음. 공식 자동 "데일리" 로테이션은 확인 필요 | — |
| *참조* **Hades** | — | God Mode(실패할수록 강해지는 접근성 옵션) | — | 데일리 시드 없음. 대신 **Pact of Punishment**(Heat 시스템 — 항목별 수동 난이도 상향) | — |

---

## 2. 재플레이 장치 카탈로그

| 장치 | 채택 게임 | 리뷰 언급(요지) | 구현 비용 감 |
|---|---|---|---|
| 클리어 후 언락형 하드 난이도 | Furi(Furier), Katana Zero(Hard Mode), Titan Souls(Hard) | Furi/Katana Zero 모두 "쉬운 옵션을 늘리기"보다 "어려운 옵션을 후속 언락"하는 동일 패턴 채택 | 데이터만 — 기존 보스 테이블에 windup·패턴 배율만 추가 |
| 보스 개별 재도전(리플레이) | Sekiro(Reflection of Strength), Nine Sols(Battle Memories) | 둘 다 "원할 때 원하는 보스만" 요구를 충족시키려 사후 추가 | 데이터만 — RIPOSTE는 `?boss=N`이 이미 존재, UI 메뉴화만 필요 |
| 보스 러시(연속전, 공유 체력) | Sekiro(Gauntlet of Strength), *Nine Sols 팬 요청(미구현)* | Nine Sols Steam 토론에서 "Jade 전환 옵션과 함께 이어서 도전하는 공식 보스러시"를 지속 요청 — 개별 재도전과는 별개 수요임이 실증됨 | 소규모 엔진 — 보스 순서 큐 + 생명/체력 이월 로직 필요 |
| 데일리/위클리 시드 챌린지 | Slay the Spire(Daily), Kill Knight(Weekly Descent), *Balatro(seeded runs, 자동 로테이션은 확인 필요)* | Kill Knight 공식 문구: "Claim the highest score and beat your friends" — 시드 고정 경쟁이 명시적 재플레이 동력으로 마케팅됨 | 데이터만 — RIPOSTE는 이미 `?seed=N`으로 패턴 RNG 결정론화됨. 날짜 기반 시드 산출 함수 하나만 추가하면 됨 |
| 리더보드(시간·무피격) | Kill Knight(글로벌), OFDP2(Steam 공식), Furi(스피드런) | Kill Knight는 출시 시부터 리더보드를 핵심 기능으로 배치 | 소규모 엔진(로컬 랭킹) ~ 대규모(글로벌 서버) — RIPOSTE 랭크(S/A/B/C)·트라이 기록이 이미 있어 로컬 리더보드는 그 확장 |
| 모디파이어·치트(옵트인 변형자) | Sifu(Custom 모드, Modifier Randomizer), Titan Souls(4종 조합) | GamesRadar+: "push your abilities to the absolute limit, or let you beat on enemies stress-free" — 양방향(하드/감상) 설계로 호평 | 소규모 엔진 — 기존 파라미터(HP·windup 배율)를 토글로 노출 |
| 스피드런 타이머·리플레이 | Katana Zero(구간 타이머+통계), Sifu(Replay Editor) | Katana Zero는 개발사가 speedrun.com 공식 허브를 직접 지원 — 커뮤니티 자생보다 공식 지원이 참여율에 영향 준다는 방증 | 데이터만(타이머) ~ 소규모 엔진(리플레이 녹화) |
| 감상/무적 모드 | Furi(Invincible Mode) | 쉬운 난이도 확장 대신 "무적으로 감상"을 별도 축으로 분리 — 접근성 논쟁을 정면 대응 대신 우회한 사례 | 데이터만 — RIPOSTE는 `?speed=`가 이미 있어 UI 노출만 필요 |
| 언락형 코스메틱(팔레트/의상/숨은 보스) | Sekiro(의상 3종), Sifu(아우핏), Furi(숨은 보스 Bernard) | 접근성/난이도 논쟁과 무관하게 꾸준히 채택되는 저위험 재플레이 유인 | 데이터만 ~ 소규모 엔진(팔레트 스왑이면 데이터만) |
| 로그라이크 메타 성장(사망마다 언락) | Shogun Showdown(캐릭터·스킬 언락) | 공식 설명: "death is not the end, but the beginning of your journey towards mastery" | 대규모 — 영구 성장은 RIPOSTE 비목표와 정면 충돌 |
| 로그라이트 런 구조+랜덤 보상 | Godstrike(선택 모드), Absolum(코어 구조) | Godstrike 부정 리뷰: "It just feels like I'm getting lucky more often than actually winning based on skill" — RNG가 스킬 기반 승리감을 훼손한다는 비판이 반복됨 | 대규모 — RIPOSTE의 패리 타이밍 기반 스킬 게임 정체성과 충돌 위험 큼 |
| 접근성 슬라이더(피해/체력 배율) | Nine Sols, Celeste(Assist Mode) | 둘 다 "코어 난이도는 무손상 + 옵트인 조절"로 설계 — 리뷰에서 강제 하향이 아니라는 점이 호감 요인으로 명시 인용됨 | 데이터만 — 기존 HP/damage 상수에 배율 곱만 추가 |

---

## 3. 주제별 상세

### 3-2. 출시 후 무료 업데이트 패턴

상용 보스전/듀얼 액션 게임의 출시 후 무료 업데이트는 공통적으로 **"쉬운 옵션 확장"이 아니라 "재도전 구조 확장"** 쪽에 쏠려 있다. Sekiro는 출시 19개월 후 GOTY 무료 업데이트로 Gauntlet of Strength(연속 보스전)와 Reflection of Strength(개별 재도전)를 동시에 추가했는데, 정작 논쟁의 핵심이었던 난이도 옵션은 끝까지 넣지 않았다(PCGamesN: "pleasant surprise"로 평가, 이미 모드 커뮤니티가 유사 기능을 자체 제작해온 점이 공식화의 배경이었다). Furi도 마찬가지로 2019년 Freedom Update에서 이지 모드를 늘리는 대신 Invincible Mode(감상용 무적)와 숨은 보스, 스피드런 모드를 추가해 "난이도 논쟁"을 "재플레이 축 다변화"로 우회했다. Sifu는 유일하게 **난이도 옵션 자체를 사후 추가**한 사례지만(2022-05, 커뮤니티 요청 반영), 그 직후 로드맵은 곧바로 모디파이어·아레나·Custom 모드로 이동했다 — 즉 난이도 옵션은 "관문"이고 진짜 콘텐츠 수명은 아레나/모디파이어형 재도전 구조가 담당했다. Nine Sols는 콘솔 이식과 동시에(2024-11) Battle Memories(보스 개별 재도전)를 무료로 얹었지만, 정작 커뮤니티가 원하는 "여러 보스를 이어서 도는 공식 보스러시"는 아직 없다 — 개별 재도전과 연속 보스러시가 **서로 다른 수요**라는 점이 이 사례에서 실증된다. Kill Knight는 출시 2.5개월 만에(2024-12-18 KRYSTALIZED UPDATE) Weekly Descent(주간 시드 챌린지+주간 리더보드)를 추가했는데, 이는 순수 스킬 기반 경쟁이 로그라이트 없이도 재플레이를 만드는 가장 빠른 저비용 사례다. Katana Zero의 Hard/Speedrun Mode 업데이트는 반대로 "약속한 무료 콘텐츠가 6년째 미출시"라는 반면교사도 남긴다(2025-04 Triple-i 쇼케이스 기준 "완성 임박").

### 3-4. 난이도·접근성 관행(상용)

가장 뚜렷하게 대비되는 두 진영은 **Sekiro(무옵션 고수)**와 **Celeste/Nine Sols(코어 유지 + 옵트인 슬라이더)**다. Sekiro는 2019년 3월 출시 직후부터 "이지 모드 부재" 논쟁이 있었고, 장애인 접근성 단체 AbleGamers의 COO Steve Spohn조차 "Sekiro가 접근성 반대 진영의 단골 논거가 된 게 안타깝다"고 언급할 만큼 논쟁이 길게 이어졌다. FromSoftware/미야자키는 "역경 극복이 게임의 핵심 테마"라는 입장을 고수했고, 2020년 GOTY 무료 업데이트에도 난이도 옵션은 끝내 포함하지 않았다. 반대로 Celeste는 Steam 리뷰에서 "You're introduced to Assist Mode with a completely inoffensive message before the first couple of easy stages"처럼 **비하적이지 않은 제시 방식** 자체가 호감 요인으로 직접 인용된다(Very Positive 97%, 61,821개 리뷰). Nine Sols는 인게임 슬라이더로 적/자신의 피해량을 직접 조절할 수 있게 했는데("I could have set my attack to 995%... BUUUUUT I didn't! Let you set your own challenge, or just enjoy the story"), 동시에 표준 난이도의 평판은 낮아지지 않았다("pretty hard in its standard mode... a bit harder than Silksong"). 즉 업계에서 반복 검증되는 패턴은 **"고정 난이도를 낮추는 게 아니라, 그 옆에 옵트인 조절 장치를 얹고 코어는 그대로 둔다"**는 것이며, Furi는 이 중간 지점에서 "쉬운 난이도 확장" 대신 "무적 감상 모드"라는 제3의 축으로 접근성 요구를 흡수했다. Cuphead의 Simple 모드는 또 다른 변형이다 — 쉬운 길을 열어주되 소울 컨트랙트(진행 보상)는 Regular 이상에서만 주어, "완주는 쉽게, 보상은 정규 난이도에" 구조로 접근성과 도전 정체성을 분리했다.

### 3-5. 로그라이트화의 득실

Steam 리뷰 데이터를 직접 대조하면 **리뷰 점수는 로그라이트 채택 여부로 갈리지 않는다**(Absolum 93% > Furi 91% > Eldest Souls 76% > Titan Souls 71% > Godstrike 66% — 로그라이트/순수 보스러시가 점수 순위에 뒤섞여 나타난다). 다만 로그라이트가 **비판받을 때의 논리는 일관되게 두 가지**로 수렴한다. 첫째, RNG가 스킬 기반 승리감을 대체한다는 비판(Godstrike 부정 리뷰: "It's just random... go! All the time. It just feels like I'm getting lucky more often than actually winning based on skill"). 이는 패리 타이밍이 유일한 승패 축인 RIPOSTE에 직접적인 경고 신호다 — 순수 반응속도/타이밍 게임에 무작위 보상을 얹으면 "실력으로 이겼다"는 감각이 희석될 위험이 크다. 둘째, 보상이 하찮아 반복 자체가 무의미해진다는 비판(Absolum 부정 리뷰: "The progression system is absolutely pathetic", "repetitive map runs, weak rewards"). 반대로 순수 보스러시 진영(Furi, Titan Souls, Eldest Souls)이 비판받을 때는 로그라이트 부재가 아니라 **"보스 사이 이동/리스폰 마찰"**(Titan Souls: "you spend more time on a boring walk than actually fighting"; Eldest Souls: "20s walking segment between bosses")과 **"승리 후 보상감 부재"**(Eldest Souls: "Once you do beat a boss, there is no real satisfaction to it. It is more of a relief")였다. RIPOSTE는 보스 간 전환이 대화+선택지로 즉시 이어지고(이동 마�지 없음), 승리 시 랭크·트라이 카드로 즉각 피드백을 주는 구조라 이 두 실패 패턴을 이미 구조적으로 회피하고 있다는 근거가 된다. Parry Nightmare(패리 중심, Very Positive 83%, ~1시간 분량)는 로그라이트가 아예 없는 사례인데, 여기서의 불만은 로그라이트 부재가 아니라 순수 "분량 부족"이었다("just when you're fully locked in, the game ends") — RIPOSTE의 8보스×2챕터(10~20분) 분량이 이 특정 실패는 피해 있다는 참고점이 된다.

---

## 4. RIPOSTE 업데이트 메뉴 (12개 이내)

우선순위 태그: **[필수]** 출시 전 필요 · **[권장]** 출시 시 있으면 강함, 없어도 출시 가능 · **[사후]** 출시 후 업데이트로 미뤄도 되는 항목.

1. **[필수] 접근성 슬라이더(피해/체력 배율)** — 레퍼런스: Nine Sols·Celeste는 코어 난이도를 그대로 두고 옵트인 배율 슬라이더만 얹어 접근성 논쟁을 피했다. RIPOSTE 현재: 난도가 의도적으로 높고(숙련 봇 전승/평균 봇 전패) 난이도 조절 수단이 없다. 제안: 플레이어 HP·보스 windup 배율을 타이틀 옵션 슬라이더로 노출(핵심 규칙 "자기 공격 0개"는 불변, 데이터 상수 배율만 추가 — 비용: 데이터만).

2. **[필수] 보스 개별 재도전 메뉴화** — 레퍼런스: Sekiro Reflection of Strength, Nine Sols Battle Memories가 "원하는 보스만 다시" 요구를 충족시킨다. RIPOSTE 현재: `?boss=N` URL 파라미터로 이미 동일 기능이 존재하지만 UI 노출이 없다(진행 저장 안 됨). 제안: 클리어한 보스에 한해 타이틀에서 선택 가능한 메뉴로 승격 — 기존 로직 재사용, 비용: 데이터만(UI 한 화면).

3. **[권장] 무적/감상 모드 토글** — 레퍼런스: Furi가 쉬운 난이도 확장 대신 Invincible Mode로 접근성 요구를 우회했다. RIPOSTE 현재: `?speed=0.5` 타임스케일이 URL로만 존재. 제안: 타이틀 옵션에 "감상 모드"로 승격(피격 무효화 플래그 하나 추가) — 핵심 규칙과 무충돌, 비용: 데이터만.

4. **[권장] 클리어 후 언락형 하드 난이도** — 레퍼런스: Furi(Furier)·Katana Zero(Hard Mode) 둘 다 쉬운 옵션 대신 어려운 옵션을 후속 언락으로 배치했다. RIPOSTE 현재: 보스 8종이 이미 데이터 테이블(js/bosses/*.js)로 구성돼 있어 windup·패턴 배율 변형이 구조적으로 쉽다. 제안: 엔딩 클리어 후 "Riposte+" 난이도(windup 단축, Phase 2 조기 진입)를 보스 테이블 변형으로 추가 — 신규 보스 차별화 원칙과 무관(같은 보스의 수치 변형), 비용: 데이터만.

5. **[권장] 날짜 기반 데일리 시드 챌린지** — 레퍼런스: Slay the Spire Daily(고정 시드+동일 조건 경쟁), Kill Knight Weekly Descent(주간 시드+리더보드)가 순수 스킬 게임에서도 로그라이트 없이 재플레이를 만든 사례다. RIPOSTE 현재: `?seed=N`이 이미 보스 패턴 RNG·되받아치기 확률을 결정론화한다. 제안: 날짜 문자열을 시드로 변환하는 함수 하나만 추가해 "오늘의 시드" 모드로 노출 — 로그라이트 비목표와 무충돌(런 구조·랜덤 보상 없음, 순수 시드 고정), 비용: 데이터만(함수 1개).

6. **[권장] 무피격·시간 기반 로컬 리더보드** — 레퍼런스: Kill Knight·OFDP2가 Steam 공식 리더보드를 핵심 재플레이 축으로 배치했다. RIPOSTE 현재: 랭크(S/A/B/C)와 트라이 기록이 localStorage에 이미 저장된다. 제안: 같은 데이터(피격 수·클리어 시간)를 보스별 로컬 최고 기록표로 확장 노출 — 비용: 데이터만(기존 저장값 재사용, 서버 불필요).

7. **[사후] 보스 러시(연속전, 생명 공유) 모드** — 레퍼런스: Sekiro Gauntlet of Strength, Nine Sols 커뮤니티가 지속 요청 중인 "이어서 도전" 모드. RIPOSTE 현재: 챕터 구조(config.CHAPTERS)로 보스 4종씩 순차 진행은 이미 있으나 챕터 간 HP 리셋됨. 제안: 엔딩 클리어 후 "전 보스 연속전" 모드(플레이어 HP만 이월, 보스는 매번 풀피)를 별도 씬으로 추가 — 데이터 재사용 큼, 비용: 소규모 엔진(씬 전환 로직).

8. **[사후] 옵트인 모디파이어(치트류)** — 레퍼런스: Sifu Custom 모드·Modifier Randomizer가 "한계까지 밀어붙이거나 반대로 스트레스 없이"를 양방향 제공해 호평받았다. RIPOSTE 현재: config.js에 수치 상수가 이미 SSoT로 분리돼 있다. 제안: 1히트 즉사, 무한 체력, 랜덤 패턴 순서 같은 토글을 설정 화면에 추가 — 기존 상수 배율 조정, 비용: 데이터만.

9. **[사후] 구간별 스피드런 타이머·리플레이 요약** — 레퍼런스: Katana Zero Speedrun Mode(구간 타이머+개발사 공식 speedrun.com 지원)가 커뮤니티 스피드런 문화를 직접 육성했다. RIPOSTE 현재: VICTORY 카드에 전체 시간만 표시. 제안: 보스별 구간 시간을 별도 기록(랭크 par 판정에 이미 시간을 쓰고 있어 확장 비용 작음) — 비용: 데이터만(리플레이 녹화는 비목표로 제외, 타이머 통계만).

10. **[사후] 언락형 코스메틱(팔레트·엔딩 갤러리)** — 레퍼런스: Sekiro 의상 3종, Sifu 아우핏, Furi 숨은 보스가 공통적으로 저위험 재플레이 유인으로 쓰였다. RIPOSTE 현재: 색상 테이블(COLORS)이 config.js SSoT로 이미 분리돼 있다. 제안: 종합 랭크 S 달성 시 플레이어 색상 팔레트 언락 — 게임플레이 수치 무변경, 비용: 데이터만(팔레트 스왑).

11. **[원칙 유지] 로그라이트 런 구조·랜덤 보상 도입하지 않는다** — 레퍼런스: Godstrike("RNG가 스킬 기반 승리감을 훼손한다"는 반복 비판), Absolum("보상이 하찮아 반복이 무의미") — 두 사례 모두 순수 스킬 게임에 얹힌 로그라이트가 오히려 정체성을 흐렸다. RIPOSTE 현재: 영구 성장·장비·콤보 트리는 이미 설계상 비목표로 명시돼 있다. 제안: 위 항목 1~10 어떤 것도 런 구조나 무작위 보상을 추가하지 않도록 구현 시 재확인 — 핵심 규칙·비목표와 완전 합치, 비용: 없음(하지 않기).

12. **[원칙 유지] 보스 간 이동 마찰 없음 + 승리 피드백 유지** — 레퍼런스: Titan Souls·Eldest Souls의 최다 비판이 로그라이트 부재가 아니라 "리스폰~보스 도보 이동 마찰"과 "승리 후 보상감 부재"였다. RIPOSTE 현재: 보스 전환이 대화+선택지로 즉시 이어지고 랭크·트라이 카드가 즉각 피드백을 준다. 제안: 향후 어떤 업데이트(특히 항목 7 보스러시 모드)도 이 두 구조를 훼손하지 않도록 설계 시 고정 제약으로 삼는다 — 비용: 없음(기존 설계 유지가 곧 대응).

---

## 5. 출처 목록

**Furi**
- https://steamcommunity.com/app/423230/discussions/0/350540780275265453/
- https://furigame.fandom.com/wiki/Patch_Notes
- https://www.thegamebakers.com/furi-freedom-update/
- https://www.thesixthaxis.com/2019/04/05/furi-gets-easier-and-speedier-with-freedom-update/
- https://news.xbox.com/en-us/2019/04/11/freedom-update-furi-available-now/
- https://www.thegamebakers.com/furi-patch-notes-june-21th-2022/
- https://www.gematsu.com/2022/05/furi-coming-to-ps5-alongside-dlc-onnamusha-and-free-update-on-may-17
- https://kotaku.com/indie-boss-battler-furi-is-the-wrong-kind-of-hard-1783130485
- https://en.wikipedia.org/wiki/Furi
- https://store.steampowered.com/app/423230/Furi/, https://store.steampowered.com/appreviews/423230

**Titan Souls**
- https://titansouls.fandom.com/wiki/Game_Modes
- https://gameguideworld.net/titan-souls-secrets/
- https://www.metacritic.com/game/titan-souls/
- https://store.steampowered.com/app/297130/Titan_Souls/, https://store.steampowered.com/appreviews/297130

**Katana Zero**
- https://www.pcgamer.com/katana-zero-adds-hard-mode-speedrun-mode-in-latest-update/
- https://store.steampowered.com/news/app/460950/view/5154889050469321014
- https://www.player.one/katana-zero-gets-two-new-game-modes-months-update-126460
- https://katana-zero.fandom.com/wiki/Speedrun_Mode
- https://www.speedrun.com/katana_zero
- https://www.pcgamer.com/games/action/6-years-after-launch-my-favorite-action-platformer-katana-zero-is-still-getting-that-long-promised-free-dlc-thats-nearly-the-size-of-the-base-game/
- https://gameinformer.com/2025/04/10/after-six-years-katana-zeros-free-dlc-is-finally-almost-ready
- https://en.wikipedia.org/wiki/Katana_Zero

**Cuphead**
- https://cuphead.fandom.com/wiki/Difficulty_Rankings
- https://en.wikipedia.org/wiki/Cuphead
- https://screenrant.com/cuphead-delicious-last-course-dlc-reviews-roundup/
- https://store.steampowered.com/app/1117850/Cuphead__The_Delicious_Last_Course/
- https://cuphead.wiki.gg/wiki/Cuphead:_The_Delicious_Last_Course
- https://dotesports.com/general/news/all-new-weapons-in-cuphead-the-delicious-last-course-dlc

**Sifu**
- https://primagames.com/news/sifu-2022-roadmap-new-outfits-difficulty-options-arena-mode
- https://www.sifugame.com/news/patch-1-19-1-20-arenas-day-1-patch
- https://www.sifugame.com/news/patch-1-22-hotfix
- https://www.sifugame.com/news/patch-1-24-the-final-content-update-is-out
- https://gamingbolt.com/sifu-final-content-update-is-out-now-adds-6-new-arenas-custom-mode-and-more
- https://www.sifugame.com/news/updated-content-roadmap
- https://www.gamesradar.com/sifus-new-modifiers-can-push-your-skills-to-the-absolute-limit-or-let-you-beat-on-enemies-stress-free/
- https://www.player.one/sifu-update-112-bring-2-new-outfits-several-cheatsmodifiers-and-more-150282

**Nine Sols**
- https://en.wikipedia.org/wiki/Nine_Sols
- https://store.steampowered.com/app/1809540/Nine_Sols/, https://store.steampowered.com/appreviews/1809540
- https://steamdb.info/patchnotes/14587834/
- https://steamcommunity.com/app/1809540/eventcomments/4633736485039852491/
- https://steamcommunity.com/app/1809540/discussions/0/4633736723121050961/
- https://www.speedrun.com/nine_sols/forums/z5p4m

**Sekiro**
- https://blog.activision.com/sekiro/2020-10/The-Game-of-the-Year-Free-Update-is-Here
- https://www.pcgamesn.com/sekiro-shadows-die-twice/boss-rush-release-date
- https://sekiroshadowsdietwice.wiki.fextralife.com/Gauntlets_of_Strength
- https://sekiroshadowsdietwice.wiki.fextralife.com/Reflections_of_Strength
- https://www.psu.com/news/sekiro-shadows-die-twice-update-1-05-patch-notes-add-boss-rush-combat-arts-and-more/
- https://akhaledblog.medium.com/sekiro-accessibility-difficulty-be265c58b3b8
- https://www.digitaltrends.com/gaming/sekiro-shadows-die-twice-accessiblity-equal-mode/

**One Finger Death Punch 2**
- https://store.steampowered.com/app/980300/One_Finger_Death_Punch_2/
- https://store.steampowered.com/api/appdetails?appids=980300
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=980300
- https://en.wikipedia.org/wiki/One_Finger_Death_Punch

**Kill Knight**
- https://store.steampowered.com/app/2694420/KILL_KNIGHT/
- https://store.steampowered.com/api/appdetails?appids=2694420
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2694420

**Shogun Showdown**
- https://store.steampowered.com/app/2084000/Shogun_Showdown/
- https://store.steampowered.com/api/appdetails?appids=2084000
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2084000

**데일리 시드 참조**
- https://en.wikipedia.org/wiki/Slay_the_Spire
- https://store.steampowered.com/api/appdetails?appids=2379780, https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2379780 (Balatro)
- https://en.wikipedia.org/wiki/Hades_(video_game)

**로그라이트화 득실 — Steam 리뷰/스토어**
- https://store.steampowered.com/app/1476170/Godstrike/, https://store.steampowered.com/appreviews/1476170
- https://store.steampowered.com/app/1904480/Absolum/, https://store.steampowered.com/appreviews/1904480
- https://store.steampowered.com/app/2081230/Parry_Nightmare/, https://store.steampowered.com/appreviews/2081230
- https://store.steampowered.com/app/1108590/Eldest_Souls/, https://store.steampowered.com/appreviews/1108590

**난이도·접근성 — Steam 리뷰**
- https://store.steampowered.com/app/504230/Celeste/, https://store.steampowered.com/appreviews/504230

---

## 조사 한계(정직 표기)

- **DÖNGÜ**: 검색엔진 접근 제한(WebSearch 예산 소진 후 CAPTCHA로 스크래핑 차단)으로 존재 여부조차 확인하지 못함. 확인 필요.
- Titan Souls·Shogun Showdown의 출시 후 대형 업데이트, OFDP2 데일리 챌린지 여부, Balatro 공식 데일리 로테이션 여부는 확인 필요로 남겼다.
- 매출·플레이어 수(SteamDB/SteamCharts) 정량 데이터는 이번 조사에서 대부분 확보하지 못했다 — WebSearch 세션 예산이 4개 병렬 리서치 초반에 집중 소모돼 후반 두 리서치는 Steam 공식 API·Wikipedia로 대체했다. 정량적 매출/플레이어 수 영향 근거가 필요하면 별도 세션에서 SteamDB 직접 조회를 권장한다.
