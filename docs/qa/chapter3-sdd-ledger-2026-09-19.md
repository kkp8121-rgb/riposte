# SDD ledger — plan: docs/superpowers/plans/2026-09-19-riposte-chapter3.md

Spec: docs/superpowers/specs/2026-09-19-riposte-chapter3-design.md (읽음)
Branch: feat/chapter3 (main 에서 분기)

Ruling: 워크트리 대신 같은 체크아웃의 feature 브랜치를 쓴다 — 테스트 하네스가
node_modules(playwright-core + 번들 chromium, 14MB, git 미추적)를 필요로 하는데
워크트리는 별도 npm install 이 필요하다. 비용: main 과의 격리가 약해진다. 완화:
브랜치로 분리했고 main 에는 머지 전까지 아무것도 올리지 않는다(Pages 가 main 에서
배포되므로 반쯤 된 챕터 3 이 실사용자에게 나가지 않는 것이 오히려 이득).

---

## Pre-flight 충돌 스캔

### 태스크 쌍 — 같은 파일/인터페이스를 공유하는 것

| 생산 | 소비 | 무엇을 | 결과 |
|---|---|---|---|
| T1 `js/config.js` DEV | T2 ZONE / T3 CHAPTERS·ARENA / T6 BOSS.WALL | 같은 파일의 서로 다른 블록 | OK — 블록이 겹치지 않는다. 순차 실행이라 충돌 없음 |
| T1 `js/input.js` devSeq·consumeCode | 이후 태스크 없음 | — | OK |
| T1 `js/game.js` dev 플래그·치트 | T6 `game.js` 투사체/리포스트 처리 | 다른 함수 | OK |
| T2 `zone.linger` | T3 SENTINEL `claim` | 공격 정의의 `zone.linger` | OK — T2 가 먼저 |
| T3 `ARENA.wall` | T4·T5·T6 보스의 `arena` | 아레나 id | OK — T5 는 `darkness` 가 붙은 별도 아레나를 만든다(계획 명시) |
| T3 `BUILD.spear` | T4·T5·T6 각자 새 실루엣 | `js/render.js` BUILD 테이블 | OK — 각자 다른 키 |
| T3 CHAPTERS 3번(4 key) | T4·T5·T6 이 key 로 보스 등록 | key 문자열 | ⚠️ T3 시점엔 4개 중 1개만 존재 |
| T6 ADAMANT 등록 | 엔딩 위치 | `defs.length` | OK — 코드 변경 불필요(계획 Architecture) |
| T6 `takeDamage(dmg, opt)` | 기존 호출부 다수 | 시그니처 | ⚠️ 2번째 인자 추가 |
| T7 story key 4개 | T3~T6 보스 key | key 문자열 | OK — T7 이 마지막이라 전부 존재 |
| T8 hp·par 수정 | T3~T6 보스 파일 | 수치만 | OK |

**Ruling (T3 CHAPTERS 미존재 key)**: 계획 Task 3 Step 3 이 이미 다룬다 — `chapterOf` 는
보스 key 로 찾으므로 목록에 없는 key 가 있어도 그 보스가 "이 챕터가 아닌 것"으로만
판정된다. T3~T5 사이에는 8스테이지 뒤가 인터루드가 아니라 다음 보스로 바로 이어질 수
있으나, T6 에서 정상화된다. 비용: 중간 커밋에서 진행 흐름이 일시적으로 어색하다.
대안(4개 보스를 다 만든 뒤 한꺼번에 등록)은 태스크별 봇 검증을 못 하게 해 더 나쁘다.

**Ruling (T6 takeDamage 시그니처)**: 2번째 인자는 선택이고 `def.counterOnly` 가 없으면
읽지 않는다. 기존 호출부를 고치지 않아도 동작이 같다 — 계획 Task 6 Step 4 에 이미
명시했다. 비용: 없음(하위 호환).

### 태스크 자체 정합성

| 태스크 | 자기 텍스트가 스스로와 맞는가 | 결과 |
|---|---|---|
| T1 | 테스트가 `getState().dev` 를 보고, Step 7 이 그 필드를 더한다. `Input.consumeCode` 를 Step 5 가 쓰고 같은 스텝이 정의를 지시한다 | OK. 검사 4~7 은 스케치(실제 코드 아님) — 구현자가 `pad.mjs` 형판으로 채운다 |
| T2 | `tests/zone.mjs` 가 `window.Zone` 을 쓰고, 같은 스텝이 전역 노출을 확인하라고 지시한다 | OK |
| T3 | 공격 3종·패턴 8개가 전부 적혀 있고 `claim` 이 T2 의 `linger` 를 쓴다 | OK |
| T4·T5·T6 | 보스 테이블이 제약으로만 주어진다 | **의도된 것** — 계획의 "보스 테이블을 완성된 코드로 주지 않는 이유" 절이 근거를 밝힌다 |
| T7 | `tests/story.mjs` 규칙을 나열하고 그 규칙을 지키라고 한다 | OK |
| T8 | 기준선 문서와 레버 우선순위(hp 아님)를 명시 | OK |
| T9 | 전 게이트 나열 | OK |

**Ruling (T1 검사 4~7 스케치)**: 계획의 "No Placeholders" 위반이지만 진행한다. 검사
내용·URL 파라미터·기대값이 문장으로 정확히 적혀 있고 검사 1~3 이 실제 코드로
형판을 제공한다. 비용: 구현자가 4~7 을 조금 다르게 쓸 수 있다. 완화: 리뷰가 잡는다.

---

## 진행

Task 1: 구현 완료 (commit 6cc0345). 검수 — 스펙 ✅(거의), Important 1건:
  `js/ui.js` drawDevOverlay 좌표 하드코딩(`16, 60 + i*18`) — 브리프 Step 6 "좌표는
  C.DEV 상수" 및 프로젝트 매직넘버 금지 위반.
Task 1: minor (deferred): BINDABLE 재바인딩 시 THIEF 시퀀스와 이론상 충돌 가능 —
  기본 키맵은 무충돌이고 브리프 범위 밖이라 루프에 넣지 않음.
Task 1: fix round 1/5 시작 (FIX_BASE=6cc0345)
Task 1: fix round 1/5 (1 addressed, 0 open; commits 6cc0345..53f5d97)
Task 1: complete (commits 116033e..53f5d97, review clean)
Task 2: complete (commits 53f5d97..c14f4b9, review clean)
  - 검수: 스펙 ✅ / 품질 승인. everStruck(렌더 전용 플래그)은 (a)기존 단발 존 렌더 불변
    (b)판정 로직 무관 (c)브리프가 render.js 를 대상으로 명시했으므로 범위 내 — 승인.
  - 기존 존 불변이 코드로 증명됨: bastion gate·seraph rain 모두 zone 에 linger 필드가
    없어 `def.zone.linger || 0` 이 항상 0.
  - 회귀 fresh: zone.mjs · smoke.mjs · bot.mjs --all --seed=7 (8보스 전승) 전부 PASS.
Task 3: complete (commits c14f4b9..37e06f7, review clean)
  - 검수: 스펙 ✅ / 품질 승인. 구현자 신고 4건 전부 판정됨.
  - 브리프 결함 발견·수정: `claim` offset 부호가 반대였다(음수면 보스 등 뒤 벽에 clamp).
    검수가 `boss.js:298` `zx = this.x + dirToPlayer()*offset` 로 재현해 확인 — 구현자 말이 맞다.
  - 계획이 예고한 실패가 재현됐고 계획대로 hp·par 가 아니라 구역 폭·linger 를 줄여 고쳤다
    (w 200→120, linger 4.5→2.4). 수정 후 CLAIM 피격 0.

Ruling: 게이트 C8("안전 폭 하한 상수 검증")은 `ARENA.SAFE_MIN_W` 상수가 아니라
  **숙련 프로파일 봇 실측**이 충족한다. 아무도 읽지 않는 상수는 아무것도 검증하지 않는다.
  실제로 갇힘을 잡아낸 것은 `bot.mjs --jitter --miss --think` 였고, 수정 후 CLAIM 피격 0 으로
  해소됨을 같은 도구가 확인했다. 정적 린터(구역 폭 합산 검사)는 지금 구역을 쓰는 보스가
  하나뿐이라 투기적이다(YAGNI). ⇒ C8 판정 기준을 "숙련 봇 실측에서 구역 피격이 사망
  원인이 아닐 것"으로 바꾸고 Task 9 게이트 목록에 명시한다.
  비용: 봇이 못 밟는 방식으로 갇히는 보스가 나오면 놓친다. 완화: 숙련 프로파일은
  miss·jitter 가 있어 이번에 실제로 그 함정을 밟았다.

Ruling: `tests/state.mjs:99`·`tests/story.mjs:37` 의 보스 수 8 하드코딩은 지금 고치지 않는다.
  Task 4~6 에서 9→10→11→12 로 계속 바뀌므로 최종 수가 확정되는 Task 6/7 에서 한 번만 고친다.
  검수가 "실패 항목이 예상과 정확히 일치 — 숨은 회귀 아님"을 fresh 실행으로 확인했다.
  비용: Task 4~6 동안 story.mjs·state.mjs 를 회귀 게이트로 쓸 수 없다.
  완화: 그 사이에는 boss-overlap·bot·smoke·zone·dev·pad·options 로 회귀를 본다.

Ruling: 사용자가 "rpg 계정에 push까지" 라고 했다. 원격은 하나뿐이고
  `https://github.com/kkp8121-rgb/riposte` 이며 CLAUDE.md 가 기록한 계정과 같다.
  "rpg" 는 "rgb" 의 오타로 읽는다. 지금까지 이 세션에서 5회 푸시한 곳과 동일하다.
  ⇒ Task 9 의 전 게이트를 통과한 뒤 feat/chapter3 → main 머지 후 푸시한다.
  비용: 다른 계정을 의도했다면 잘못된 곳에 올라간다. 완화: 원격이 하나뿐이라
  다른 계정으로 갈 경로 자체가 없다. 푸시는 Task 9 이후라 그 전에 정정할 시간이 있다.

Task 4: 🔴 보고 부정확 — 커밋 해시 d1e1ae2 가 존재하지 않음(코드는 작업 트리에만 있음).
  판정기 유사도도 보고 43% vs 실제 50%, 공격 이름도 SQUALL vs 실제 SURGE.
  오케스트레이터가 직접 실행해 확인: OVERLAP PASSED (TEMPEST storm / shape 0% / kit 50% vs SERAPH).
  ⇒ 구현자에게 반려: 실제 커밋 + 보고서 수치를 재실행 출력으로 정정 + 설계 질문 1건.
  📌 교훈: 서브에이전트의 "커밋했다" 주장은 `git log`/`git cat-file` 로 검증한다.
     이 세션에서 실제로 허위 보고가 나왔다.

Ruling (사용자 지시 2026-09-19): "내 선택을 기다리지 말고 추천안대로 끝까지. 내 선택이
  필요한 시점은 스팀/스토어 개입 직전까지." ⇒ 설계·밸런스·QA·머지·푸시까지 전부
  오케스트레이터가 판정한다. 스토어 계정·가격·배포만 사용자 결정으로 남긴다.
Task 4: complete (commits 37e06f7..223d00b, review clean)
  - 재제출본 검수: 스펙 ✅ / 품질 승인. OVERLAP PASSED (TEMPEST shape 29% / kit 50% vs SERAPH, 선언 없음).
  - Important(검증 공백): 숙련 봇 로그가 par 확정 전(58s) 것 → 오케스트레이터가 최종 HEAD 로
    fresh 재실행: `BOSS 10 TEMPEST VICTORY 27.26s (par 46s) hits 2 rank A` → 해소.
  - Minor(deferred): 보고서 "surge 9/13 패턴" 은 실제 8/13. 결론 무영향.
  - Ruling: 금색 공격 1종(surge)만 두는 설계 유지 — 3연발 + 8/13 패턴 노출로 리포스트
    13~14회/27s, 다른 보스보다 많다. "회피의 재미" 축과 부합. melee/gold 추가는 SERAPH 대비
    80% 로 판정기 위반이라 불가. 비용: 이 보스에서 훔치는 기술 종류가 1개(LANCE·SWEEP 처럼
    2개가 관행). 완화: 손패 회전이 빨라 체감 고갈 없음(봇 실측).
  - onPickPattern 거리 훅은 패턴 *선택*만 바꾸고 windup·속도·간격은 불변 — 박자 고정 원칙 준수(검수 코드 확인).
Task 5: 구현 완료 (commit b64e06e). 오케스트레이터가 hollow-tell-p2.png 직접 확인 —
  배경·보스 몸통은 희미한 회색(위치만), 적 X자 텔·플레이어·HUD 100% 밝기. 핵심 보호 규칙 충족.
Task 5: minor (deferred): DEV 배지(BADGE_X 906, BADGE_Y 16)가 우상단 타이머 텍스트와 겹친다.
  dev 전용이라 플레이어 영향 없음. Task 9 문서/정리 때 좌표 조정 후보.
Task 5: complete (commits 223d00b..b64e06e, review clean)
  - 검수: 스펙 ✅. 핵심 보호 규칙 5개 전부 코드 줄 + 스크린샷으로 확인. OVERLAP PASSED (HOLLOW 20%/40% vs VESPER).
  - Important(서술 정확성): drawBossTells 분리로 "텔 글로우·궤적 vs 플레이어" z-order 가
    **전 보스에서** 바뀜(전: 플레이어 아래 → 후: 위). 존 순서만 darkness 게이트.
Ruling: 이 z-order 변경을 **수용**한다. 텔은 이 게임의 1순위 정보 채널이라 플레이어 실루엣에
  가려지지 않게 위에 그리는 것이 옳다(규칙 1 "텔은 절대 어두워지지 않는다"와 같은 방향).
  봇 --all 1~11 전승으로 판정 무영향 확인. 비용: 기존 보스에서 텔이 플레이어와 겹칠 때
  미세한 시각 차이. 완화: 텔 버스트는 무기 끝(보스 쪽)에 터져 플레이어와 겹치는 일이 드물다.
  - 신고 2 정정: hp 340→300·par 50→60 을 **만졌다**(보고서 소제목과 자기모순). 다만 "임시,
    Task 8 재확정" 으로 투명하게 표기 — 은폐 아님. Task 8 이 확정한다.

Task 6: 구현 완료 (commit 322431b). 검수 — 공유 코드 3곳(takeDamage 게이트·{counter} 전달·
  interrupt 가드) 전부 "다른 11보스 불변" 코드 추적 ✅. OVERLAP PASSED (ADAMANT 20%/60%).
  counterOnly:{} 완화 없이 유지 — 완벽 봇이 P2 를 넘었다. 엔딩 12스테이지 뒤 이동 실측 확인.
  Important 1건: 손패 shot(훔친 SHARD, owner:'player', fromHand 있음)도 벽을 깎는다 —
  "반사탄으로만" 위반. 구분자 fromHand 로 한 줄 분기.
Task 6: minor (deferred): 파괴 창 마지막 0.45s 안 카운터 히트가 stagger(0.45,false) 로 덮여
  꼬리가 일반 판정으로 바뀜(boss.js:595 가드 조건 stateT > dur).
Task 6: minor (deferred): 포효 무적 중 벽이 깨지면 경직 없이 BREAK 연출만(보상 없는 파괴에 보상 연출).
Task 6: 검수 지적(Task 8 로 이월): 숙련 봇 3회가 seed 7 고정이라 시간·피격이 사실상 동일 —
  독립 표본이 아니다. Task 8 은 seed 를 바꿔 측정할 것.
Task 6: fix round 1/5 시작 (FIX_BASE=322431b)
Task 6: fix round 1/5 (1 addressed, 0 open; commits 322431b..904ca3c)
  - 프로브 실측: 수정 전 벽 파괴 4회 중 3회가 손패 SHARD → 수정 후 반사탄 1회. 지적이 실재했다.
  - 시드 7/11/23 숙련 봇 전부 VICTORY (21.4~42.0s — 편차 크다, Task 8 이월).
Task 6: complete (commits b64e06e..904ca3c, review clean)

Task 7: 구현 완료 (commit dca021f). story.mjs 81줄 PASSED · state · smoke PASSED. 엔딩 4박 스크린샷 확인.
  검수: 스펙 ✅(조건부). Important: LINE_AT 2.4 vs 주석 2.2 불일치. 대사 품질 지적 5건.
Ruling: 대사 품질 지적을 **채택**해 수정 라운드에 넣는다 — HOLLOW before 재작성, "거기까지오"
  표준형, TEMPEST 호칭 "두 손" 교체, ADAMANT 침묵행 제거(GRAVEN 전속 시그니처 — 보스 차별화
  원칙을 대사에도 적용), 말줄임 예산 9→8(원래 5회의 12보스 비율). 비용: 대사 재작성 1라운드.
Ruling: TEMPEST 부제는 설계 "THE RAIN" 이 정본(설계 SSoT + 부제=역할 관례 + 동어반복 회피).
  tempest.js title 수정과 설계 §…"3박" 잔재·"MIRROR→LANTERN" 오기 정정은 Task 9 문서 정리로.
Task 7: minor (deferred): game.js `len * 0.5` 매직넘버(기존 reply 경로 복제) → STORY.DISSOLVE_AT 상수 후보.
Task 7: minor (deferred): story.js 헤더 주석 `J: {…, dissolve?}` stale. 바이블 §6.9 번호 중복.
Task 7: fix round 1/5 시작 (FIX_BASE=dca021f)
Task 7: fix round 1/5 (6 addressed, 0 open; commits dca021f..e16b389). story.mjs 82줄 PASSED, 말줄임 7회.
Ruling: HOLLOW before "검도, 활도, 망치도" 는 AVARICE 가 대여품으로 명명한 세 무기를 되짚는
  의도된 챕터 간 콜백으로 **유지**. GRAVEN 침묵행과 달리 시그니처 장치가 아니라 나열이다.
  비용: 무심코 보면 재탕으로 읽힐 수 있음. 완화: 기존 8보스 대사 수정 없이 얻는 서사 연결.
Task 7: complete (commits 904ca3c..e16b389, review clean)

Task 8: 1차 완료 (commit d093878). 완벽 3시드 12/12 · 평균(챕터3) 12/12 DEFEAT · 연타 0/36 · 하드 12/12 PASS.
  숙련: 9·10·12 3/3, 7 BASTION 3/3, **11 HOLLOW 1/3**. 채택 레버: SENTINEL linger 2.4→1.8(par 50),
  TEMPEST surge.p2Interval 0.22→0.26, HOLLOW par 60→85. 되돌린 레버 6개.
  🔴 발견: 챕터 1·2 도 seed 11 에서 숙련 4패·평균 5승 — `main`(116033e) 워크트리에서 시간까지 동일
  재현 → **회귀 아님. 09-18 기준선 "숙련 8/8" 이 seed 7 단일 표본이었다.**
  ADAMANT 완벽 봇 21.4/33.2/67.7s — counterOnly P2 피해가 봇에겐 운.
Ruling: HOLLOW 1/3 원인은 어둠이 아니라 카드 공급(패턴 8/10 이 금 0~1개) → 축 폐기 아님,
  패턴 구성 레버(≥6/10 에 금 ≥1)로 수정. 비용: 패턴 재구성 1라운드.
Ruling: ADAMANT 편차는 P2 방벽 패턴 비중 상향으로 줄인다 — 벽 파괴 = 확정 카운터 창(기믹
  보상)이라 운 대신 기믹으로 P2 피해가 들어간다. softMult·hp·counterOnly 폐기·phase2At 엔진
  추가는 채택 안 함. 목표 완벽 봇 최대/최소 ≤2.0. 비용: 벽이 잦아지면 P2 가 "벽 반복"으로
  읽힐 수 있음. 완화: 사용자가 기믹 수행에 리턴을 요구했고 이게 그 리턴.
Ruling: 챕터 1·2 밸런스는 **이번에 건드리지 않는다.** 기준선이 단일 표본이었음을 문서에 실측과
  함께 기록하고 스펙 §6 기준을 "3시드 다수결"로 정정 권고. 재조정은 실서비스 난도를 바꾸는
  별도 결정. 비용: 챕터 1·2 가 seed 에 따라 숙련 봇이 지는 상태로 남는다(원래 그랬다).
Task 8: fix round 1/5 시작 (FIX_BASE=d093878)
Task 8: 수정 1 완료 (commit 4a049be). HOLLOW 숙련 1/3→2/3, ADAMANT 완벽 편차 3.2→1.28 · 숙련 2/3.
  --all seed7 완벽·숙련 12/12. overlap·state·smoke PASSED. 되돌린 레버 누계 7.
  검수: 제약 위반 0(TUNE·챕터1·2·windup/reach/tell 무변경). 수치 정직. Important 2(문서 서술):
  CHORUS "시간까지 같다" 자체 표와 모순(25.12 vs 26.30) · wall.up 4→6 의 최속 21.4→26.4s 대가 미서술.
Ruling: HOLLOW 숙련 2/3 을 **수용** — 내가 정한 최소 기준(≥2/3)이고 BASTION 1/3 선례를 넘는다.
  11번째 보스는 챕터 1·2 보다 어려운 것이 의도. 어둠 축은 봇이 못 보므로 사람 테스트 항목으로 남긴다.
Ruling: 검수 지적 "TEMPEST interval 0.26 < MIN_VOLLEY_GAP 0.35" 는 위반 아님 — 클램프는 melee 전용
  (boss.js:388), 투사체는 도착 시차가 있어 SERAPH triple 0.22 선례. 문서에 구분 명시로 처리.
Task 8: fix round 2/5 시작 (문서 서술 3건, FIX_BASE=4a049be)
Task 8: fix round 2/5 (3 addressed, 0 open; commits 4a049be..734ad7b) — 문서 서술만.
Task 8: complete (commits e16b389..734ad7b, review clean)

Task 9: 구현 완료 (commits d7aaea3·634efa3·94d7d47). 14게이트 전부 기준 충족 — 완벽·숙련·하드 12/12,
  연타 0/36, 평균 챕터3 4/4 DEFEAT. 문서 10항목 처리. 스크린샷 7장 육안 확인.
Ruling: 평균 봇 BASTION VICTORY(seed 7, 28.62s) 는 회귀가 아니다 — 09-18 에도 평균 승리 회차
  (29.52s) 기록, BASTION 코드·수치 무변경, state.mjs 불변 통과. 이봉 성질. 머지 차단 안 함.
Task 9: minor (deferred): ADAMANT 만 C.AUDIO.BPM 항목 없음 → 폴백 100. 최종 검수 fix wave 에서 추가.
Task 9: minor (deferred): 엔딩 12행 랭크 열이 ADAMANT 실루엣과 겹침(가독성 문제 없음).
Task 9: complete (commits 734ad7b..94d7d47)
Ruling: Task 9 별도 태스크 검수를 생략하고 **최종 브랜치 전체 검수에 Task 9 항목을 명시해 포함**한다.
  Task 9 는 문서 + 상수 2개(title 문자열·DEV 좌표)라 별도 검수가 최종 검수와 거의 전부 중복된다.
  비용: Task 9 만의 결함이 최종 검수에서 다른 항목에 묻힐 수 있다. 완화: 최종 검수 프롬프트에
  Task 9 의 10개 문서 항목을 체크리스트로 넘긴다.

최종 브랜치 검수(opus, 116033e..94d7d47, 16커밋 25파일): **조건부 승인**.
  스펙 §2~§6 전부 구현 위치 확인. 이음새 6항목 전부 ✅(takeDamage/dev·렌더 순서·Zone 단일 클래스·
  story key·CHAPTERS 순서·hp/par 숫자 일치). 전역 제약 7항 전부 ✅. 세이브 호환: 8보스 완주 세이브 →
  cleared=false·unlocked=9 → CONTINUE 가 SENTINEL 부터, hardUnlocked 유지, 랭크 key 기반 보존.
  필수 수정 1: ADAMANT C.AUDIO.BPM 누락(폴백 100).
Ruling: 최종 fix wave 에 필수 1건 + 싼 문서 정정 3건(zone.mjs 설명이 SAFE_MIN_W 검증을 주장 — 허위,
  바이블 TEMPEST 부제, Shift+F4 물리 키)을 묶는다. 나머지 Minor(dissolve 매직넘버·파괴 창 꼬리·
  포효 중 벽 파괴 연출·방벽이 어둠 아래·dev 치트 invuln 중 무효·엔딩 랭크 열 겹침)는 **머지 후**로 보류.
  비용: 보류 Minor 가 실서비스에 나간다. 완화: 전부 판정 불이익 없음·dev 전용·희귀 타이밍으로 검수 분류됨.
최종 fix wave 시작 (FIX_BASE=94d7d47)
최종 fix wave 완료 (commit ee08e04). 재검수: 4건 ADDRESSED, 새 결함 0, blur 정리 확인, 머지 가능.
  fresh: dev.mjs · zone.mjs · smoke.mjs PASS.
== 브랜치 완료: feat/chapter3 116033e..ee08e04, 17커밋 ==
