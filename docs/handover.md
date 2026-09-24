# RIPOSTE — 인수인계 (handover)

- 갱신: 2026-09-24
- 🟢 **현재(2026-09-24): 모바일 터치 조작 — 구현 완료, 실기기 확인 대기.** 브랜치 `feat/touch-controls`(main `3956c10` 에서 분기, 로컬 커밋만 — **push·main 머지 안 함**, push = Pages 배포라 매번 사용자 확인). 스펙 `docs/superpowers/specs/2026-09-24-riposte-touch-controls-design.md`(§12 결정 기록), 계획 `docs/superpowers/plans/2026-09-24-riposte-touch-controls.md`.
  - **완료**: `js/touch.js`(window.TouchUI — 폰·태블릿 `pointer: coarse` 에서만, `?touch=1/0` 강제) · 가로 전용(세로면 게임 정지 + 회전 안내) · 화면별 버튼 세트 · 전투 RETRY·TITLE 은 0.5초 꾹 · 첫 터치를 뗄 때 전체 화면+가로 고정 · 키보드·패드가 오면 버튼 숨김 · 터치 모드 문구(`say()`, 키보드 문구는 `C.PROMPTS` 로 옮겨 한 글자도 안 바뀜) · 터치 모드에서 KEY BINDINGS 숨김 · 새 테스트 `tests/touch.mjs`.
  - **검증**: 전체 게이트 13/13 통과(HEAD `f0caf6c`, 하나씩 헤드리스) — story · boss-overlap · smoke · motions · state · audio-smoke · pad · options · dev · zone · **touch**(`TOUCH PASSED`) · mash(`wins 0/36`) · bot(`BOT PASSED`). 스크린샷 `tests/shots/touch-fight.png`·`touch-title.png`·`touch-rotate.png`(버튼이 캐릭터·손패·타이머를 가리지 않음). 태스크마다 독립 검토 + 최종 전체 검토(opus) → 지적 F1~F8 반영(`f0caf6c`) → 재검토 통과.
  - 🔴 **사용자 확인 대기**: (1) **실기기(안드로이드 크롬) 확인(S6)** — 첫 탭을 떼면 전체 화면이 되는지 · FULL 이 한 번에 되는지 · 세로 안내 탭 · 전투 TITLE 을 오래 쥐었다가 떼기 · 보스 선택에서 OK 뒤 화면이 그대로인지 · 버튼이 캐릭터·손패를 가리는지 · 패리 타이밍이 터치로 되는지. (2) main 머지·Pages 배포 여부.
  - 보류 목록은 스펙 §12.
- 🟢 **직전(2026-09-24): 챕터 2·3 공격 재설계 — 구현 완료, 사용자 플레이테스트 대기.** 브랜치 `feat/ch23-attacks` → **main fast-forward 머지·푸시 완료(`3956c10`, 2026-09-24 사용자 승인)**, Pages 배포 확인 `PAGES OK · scripts 25 · bosses live/local: 12 / 12`(사이트에 `js/motions.js` 200). 사람 플레이테스트는 배포본으로 한다. push 는 매번 사용자 확인.
  - **완료**: 엔진 새 동작 9개(`js/motions.js`) · 판정기 공격 단위 재활용 검사 · 봇 새 위협 읽기 · 보스 5~12 재작성 · 3시드 밸런스(`docs/qa/balance-2026-09-23.md`) · 재미 QA(`tools/funqa.mjs` + 페르소나 검토단, `docs/qa/funqa-2026-09-23.md`) · 스펙 §3.5~3.12·README·CLAUDE.md 갱신 · 사람 플레이테스트 체크리스트 `docs/qa/playtest-ch23-attacks.md`. 태스크마다 독립 검토 통과(SDD 원장 `docs/qa/ch23-attacks-sdd-ledger-2026-09-23.md` — 판정 전부 기록) · 최종 게이트 `4bdb1cc`(전 테스트·3시드·연타·하드 통과) · 최종 전체 검토 지적 반영 `ba10561`·`5140231`.
  - **구현 중 발견·수정한 엔진 결함**: 끊긴 공격의 예약 발사(연사 후속탄·협공 뒤 탄)가 경직·포효 중에도 나가던 것(`c699b0f`) · BASTION 되받아치기가 코앞(28px)에서 되돌아오던 것 — 반응 시간 하한 `DEFLECT_MIN_REACT`(`6f8585a`) · 벽을 등지면 협공 뒤 탄 시차가 줄던 것(`40f07ba`) · CHORUS 메아리와 2타가 패리 록 안에서 겹치던 것(`1afd39e`) · KO 중 기둥이 플레이어를 밀던 것(`979c502`).
  - 🔴 **사용자 결정 대기**: (1) **BASTION 이 너무 쉽다** — 공정성 가드 뒤 되받아치기는 약 270px 이상에서만 일어나는데 기둥이 교전을 약 135px 로 붙여 대표 기믹이 사라졌다(평균 봇 3/3 승). 선택지: 되받기를 "잡아서 예고 뒤 되던지기"로 재설계 / salvo 수치 / 플레이테스트로 판단. (2) 플레이테스트(G8) 채택·보류·폐기 — 체크리스트대로. ~~(3) main 머지·Pages 배포 여부~~ → 배포 완료(`3956c10`).
  - 플레이테스트 주목점: LANTERN 숙련 경계(s7 3회 중 1패) · ADAMANT 벽에 몰린 보스의 2번째 조각 탄 · LANTERN flicker 직후 부메랑 · 페르소나 검토단 채택 위험 13건(체크리스트에 보스별로 들어 있다).
  - 📌 **교훈(이번 작업)**: ① 판정기가 수치 변주를 못 잡은 이유 — 서명을 kind/tell 다중집합으로만 봤다. 공격 하나하나의 "동작 서명"(행동을 바꾸는 표지만)으로 재야 하고, kind 이름을 새로 지어 우회하는 길도 막아야 한다. ② "봇이 이긴다"는 공정함을 증명하지 않는다 — 코앞에서 생긴 탄·확률로 튀어오는 탄은 봇 계측(`funqa.mjs` 반응 시간)으로 따로 찾아야 했다. ③ 공정성 가드가 보스 정체성을 지울 수 있다(BASTION) — 가드와 기믹이 같은 거리 조건을 다투는지 설계 단계에서 본다. ④ 위임 에이전트는 전역 "커밋은 확인 후" 규칙 때문에 커밋을 거부할 수 있다 — 지시문에 사용자 승인 사실을 명시한다. ⑤ 산출물·창을 자동으로 열지 않는다(사용자 지시 09-23).
- 이전 갱신(2026-09-23, 설계 시점):
  - **사용자 결정(09-23, 스펙 §7)**: §0 배정 변경 채택 · 협공은 순서형으로 시작 · HOLLOW 대사 유지 · 챕터 1·2 기준선 재조정은 이번에 안 함 · 실행 방식 **Subagent-driven**.
  - 사용자 결정: 범위 **챕터 2·3 함께(8보스)** · 방식 **A. 동작 어휘 확장**(엔진에 새 공격 동작) · 훔친 기술은 **기존 4종에 매핑** · 채택은 봇 게이트 + 사용자 실플레이. 사용자 지시 "작업을 진행해, 다만 실행하지는 마" → 설계서·계획서까지만 쓰고 구현·테스트 실행은 하지 않았다.
  - 설계 `docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md` · 계획 `docs/superpowers/plans/2026-09-23-riposte-ch23-attacks.md`(Task 0~18). 새 동작 9개(부메랑·협공·쓸기 빔·끌어당김·기둥·표식·반격 자세·악보·메아리), 판정기에 공격 단위 재활용 검사(현재 8보스 전원 FAIL 예상).
  - 설계 §0: 대화에서 승인된 배정표가 "한 동작 = 한 보스"와 모순(챕터 3 가 챕터 2 동작 재사용)이라 협공·표식·반격 자세를 옮기고 메아리를 더했다 — 사용자 채택.
  - 독립 검토 2회(설계·코드) 반영 완료 — 기둥 통과(블록 밀림)·악보 퍼펙트가 남은 타격을 지움·협공 뒤 탄 몸 위 생성·부메랑 보스 흡수·판정기 kind 이름 우회 등 수정.
  - 🔴 09-19 줄의 "`feat/chapter3-attacks` 에서 착수"는 **그 브랜치가 만들어진 적이 없다** — 이 작업이 그 계획의 후속이다.
- 이전 갱신: 2026-09-19
- 상태: **챕터 3 완료(12스테이지) — 브랜치 `feat/chapter3`, Task 9(전 게이트·문서) 통과 → `main` 머지·Pages 배포 대기.**
  - 완료: 보스 9~12(SENTINEL·TEMPEST·HOLLOW·ADAMANT) + 엔진 훅(`Zone.linger`·`darkness`·`wall`·`counterOnly`) + 아레나 `wall`·`void` + 엔딩 12스테이지 뒤로 이동(8 뒤는 두 번째 INTERLUDE) + 엔딩 태그라인 4박 + dev 모드(타이틀 `THIEF` 커맨드·`?dev=1`·F1~F4) + 대사 8장면.
  - 설계 `docs/superpowers/specs/2026-09-19-riposte-chapter3-design.md` · 계획 `docs/superpowers/plans/2026-09-19-riposte-chapter3.md` · 실측 `docs/qa/balance-2026-09-19.md` · 확정 수치 스펙 §3.9~3.12 · 태스크 원장(판정 21건·검수 결과) `docs/qa/chapter3-sdd-ledger-2026-09-19.md`.
  - ✅ main 머지·푸시 완료(`8ef09be`), Pages 배포 확인 `PAGES OK · bosses live/local: 12 / 12`.
  - 🔴 **배포 사고 발견·수정(2026-09-19)**: Pages 설정이 `build_type=workflow` 인데 `.github/workflows/` 가 없어 **9월 16일 빌드(`851cf60`)가 그대로 서비스되고 있었다.** 9/18~19 에 main 에 푸시한 40커밋(스태미너·패드·옵션·아레나·챕터 3)이 전부 미배포였다. `tools/check-pages.mjs` 는 "사이트가 뜨고 Enter 로 FIGHT 진입"만 봐서 하루 종일 PASS 를 냈다(9/16 빌드도 8보스·대화 없음이라 조건 충족). 조치: `.github/workflows/pages.yml`(actions/deploy-pages) 추가 → 배포 재개. 도구에 **신선도 검사**(배포본 `BOSSES.length` = 로컬 `index.html` 보스 스크립트 수) 추가 — 다르면 `stale deploy` 로 FAIL.
- 🔴 **사용자 실플레이 판정(2026-09-19, 배포 직후)**: "장판 붉은 패턴이 대부분 무의미한 자리에 깔린다 · 난이도는 MIRROR 가 최강 · 중복 없다더니 1~4 의 재활용". **전부 맞다.** 공격 단위로 재보니 챕터 3 은 TEMPEST 3/4 · HOLLOW 3/4 · ADAMANT 4/4 가 챕터 1 공격의 수치 변주였고(SENTINEL 1/3), **챕터 2 도 LANTERN 2/3 · CHORUS 3/4 · BASTION 2/3**. 판정기가 kind/tell 조합과 패턴 스텝 모양만 봐서 장판 하나 끼우면 통과했다 — 챕터 2 재설계 때와 같은 구멍. 근본 원인은 **엔진 공격 어휘가 찌르기·베기·내려찍기 × 투사체·돌진·장판뿐**이라 새 보스가 수치 변주밖에 될 수 없다는 것. 봇 밸런스는 "읽기 어려움"(페인트 등 사람이 실패하는 것)을 못 재서 MIRROR 가 최강인 것도 못 봤다. ⇒ 브랜치 `feat/chapter3-attacks` 에서 (1) 판정기에 공격 단위 재활용 검사 추가(챕터 3 부터 FAIL), (2) 새 공격 동작을 엔진에 추가, (3) 챕터 3 공격을 새 동작으로 재작성, (4) 보스마다 **사용자 실플레이**로 채택. 챕터 2 재활용은 측정만 기록 — 재설계 여부는 사용자 결정.
- 이전 상태(2026-09-18): **상용 출시(Steam 1차) 목표 — Phase 1 플레이 측면 완료·푸시** (`1dabcbf`, Pages 배포 확인 `PAGES OK`).
  - 완료: 스태미너(연타 결함 수정) · 적 텔 X자 분리 + `?flash=0` · 게임패드 · 타이틀 메뉴/옵션/보스 선택/접근성 슬라이더 · 아레나 3종 + 보스별 드론 변주 + RIPOSTE+ 하드 모드.
  - 계획서 `docs/superpowers/plans/2026-09-18-riposte-phase1-play.md`(그룹별 커밋 표), 근거 `docs/research/2026-09-18-reference-games.md`.
  - **다음은 전부 사용자 결정·외부 자원 대기**: 타겟 스토어·가격대, 무료 웹판 정책, 영어 스토리 자막(번역), Electron 래퍼 + Steamworks(계정·앱 ID·$100), Steam 페이지·캡슐·트레일러, 사람 플레이테스트 완주 시간(가격 확정의 전제). 정체성 문구("게임잼 출품작" — CLAUDE.md 3행·스펙 §0·README Credits)는 위가 정해지면 일괄 갱신.
- 이전 상태: 챕터 2 보스 4종 차별화 재설계 완료(커밋 8ad2f17, 밸런스 확정) + 트라이 수 표시 완료(커밋 30f18c8). GitHub `kkp8121-rgb/riposte` (Public) → Pages `https://kkp8121-rgb.github.io/riposte/`
- 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md` · 스토리 대사 SSoT: `docs/superpowers/specs/2026-09-17-riposte-story-bible.md` · 상수 SSoT: `js/config.js` + `js/bosses/*.js`

## 무엇을 왜 택했나 (요약)
- 형제 프로젝트 10종이 탑다운·마우스·서바이벌에 몰려 있어 **사이드뷰 1:1 보스러시 패리 듀얼(키보드 전용)** 을 골랐다. 후보 6종 비교표는 스펙 §1.2.
- 콘텐츠를 **보스 데이터 테이블**(attacks/patterns/hooks)로 만들어 보스 추가·밸런스가 코드 수정 없이 가능하도록 했다.
- classic `<script>` 로딩(ES module 금지) — `file://`와 Pages 하위 경로 양쪽에서 동작해야 하므로.

## 검증 하네스 (모두 헤드리스, `node ...`)
| 명령 | 검증 내용 |
|---|---|
| `tests/smoke.mjs` | pageerror 0, 타이틀→STORY(선택지·held Enter 체크)→FIGHT 진입, 무입력 60s 내 DEFEAT, R 재도전은 STORY 없이 INTRO 직행 |
| `tests/bot.mjs --all` | 반응형 봇이 보스 12종 전부 승리 + 무입력 봇 패배. `--jitter/--miss/--think`로 인간형 프로파일, `--seed=N`(채택 판정은 7·11·23 3시드), `--hard` |
| `tests/state.mjs` | 전투 전후 `window.BOSSES` · `window.STORY` JSON 동일 — 정의 테이블 불변성(과거 결함 회귀 방지) |
| `tests/audio-smoke.mjs` | unmuted 헤드리스에서 AudioContext `running`, 모든 사운드 경로 무예외, mute→unmute 드론 복구 |
| `tests/story.mjs` | 대사 테이블(`js/story.js`) 검사 — 브라우저 불필요. 12보스(`C.CHAPTERS` 총합) 전부 대사 존재, 장면당 ≤4줄, 느낌표 0, 선택지 3개 ok:true/false 각 1, 보스 전속 어미 교차 0 |
| `tools/check-pages.mjs [url]` | 실제 Pages URL 로드: 404·pageerror·FIGHT 진입 |
| `tools/shots.mjs` | README용 스크린샷(`docs/media/`) 재촬영 — title·story·perfect-parry·mirror-phase2 4장 |
| `tools/boss-overlap.mjs --check` | 신규 보스 차별화 게이트 — 패턴 모양·공격 구성·실루엣이 기존 보스와 의도치 않게 겹치면(`overlapIntended` 미선언) FAIL |
| `tests/mash.mjs --all --seeds=7,11,23 --riposte --expect-lose` | 텔을 읽지 않는 연타 봇 — 전패해야 한다(스태미너 회귀) |
| `tests/pad.mjs` · `tests/options.mjs` | 게임패드 매핑(모의 패드) · 옵션 메뉴(볼륨·어시스트·리바인드·리셋·보스 선택) |
| `tests/dev.mjs` | dev 모드 — 꺼져 있으면 `THIEF`·F키가 어떤 효과도 없다, `?dev=1`·커맨드로 켜진 판은 저장하지 않는다, 타이틀에서만 켜진다 |
| `tests/zone.mjs` | 존 `linger`(지속 구역) 동작 — 단발 존은 불변(때리고 사라짐), 지속 존은 `LINGER_TICK` 마다 재타격 |

## 실패했던 시도와 교훈
1. **봇 테스트 통과 ≠ 정상**: 1차 구현은 스모크·봇 전부 통과했지만 읽기 전용 opus 리뷰가 19건을 찾았다. 특히 (a) 패턴 스텝 객체를 그대로 opt로 넘겨 `_approached`가 정적 보스 정의를 영구 오염(R 재시작·시드 결정론 붕괴), (b) Phase 2를 유발한 타격의 후속 stagger가 포효 무적을 덮어씀, (c) 첫 키 latch + suspended AudioContext → Shift가 첫 키면 영구 무음. 셋 다 "로드→1전투→종료" 테스트로는 원리적으로 못 잡는다 → `tests/state.mjs`·`tests/audio-smoke.mjs`를 추가했다.
2. **Node 쪽 봇 루프는 불가**: Node↔CDP 왕복 90~170ms라 0.15s 퍼펙트 창에 못 들어간다. 봇 결정 루프는 페이지 안(`installBot`)에서 돌고 Node는 오케스트레이션·단언만 한다.
3. **HP 상향은 전투 길이를 거의 안 늘린다**: 봇의 처치 시간은 "보스가 패리 가능한 공격을 얼마나 자주 주느냐"에 묶여 있다. 길이 레버는 HP가 아니라 엠파워(×2)·카운터(×1.5) 배수 스택과 패턴 간격(gap)이다.
4. feint는 "2차 플래시 → 그 공격의 정상 windup → 타격"이어야 §2.2(플래시→타격 항상 일정)를 지킨다. 별도 짧은 간격을 두면 리듬 학습이 깨진다.
5. **근접 연타(volley)는 wait 스텝으로 만들 수 없었다**: 패턴을 `[atk, wait N, atk]`처럼 별도 스텝으로 나누면 생명주기(windup→active→recover) 때문에 실제 간격이 훨씬 벌어진다(recover 만 최소 0.4~0.6s라 총 간격이 1.2s 근처까지 늘어난다). 그래서 한 공격 정의 안에 `volley: { count, interval }`을 두고, active 직후 recover 대신 `interval`만큼의 재-windup(새 플래시)을 거쳐 다음 타격으로 넘어가게 했다(`boss.js updateAttack`). `interval` 하한은 `BOSS.MIN_VOLLEY_GAP`(0.35) — 퍼펙트 창 + 성공 시 단축 리커버리보다 커야 물리적으로 다음 타격을 받을 수 있다.
6. **STORY 삽입이 "Enter 한 번 = FIGHT 진입"을 전제한 곳 3군데를 깼다**: 배너/시계 로직, `tests/audio-smoke.mjs`(제스처 후 바로 오디오 검증), `tests/bot.mjs`의 진입 경로가 모두 TITLE→Enter→FIGHT를 가정하고 있었다. TITLE과 FIGHT 사이에 STORY 씬이 끼어들며 셋 다 어긋났다 → 봇/오디오 하네스는 `?story=0`로 STORY 전체를 건너뛰게 하고, 보스 재도전(R)에는 `skipBefore` 플래그를 둬서(§10 "DEFEAT → R은 INTRO 직행") 이미 본 대사를 다시 틀지 않게 했다.
7. **봇의 돌진 판정이 `id === 'charge'` 라 챕터 2 를 못 봤다**: GRAVEN 만 공격 id 가 `charge` 고, CHORUS 는 `lance`, BASTION 은 `bulwark` 다(셋 다 `kind: 'charge'`). id 로 판정하던 `tests/bot.mjs`는 챕터 2 돌진을 "돌진"으로 인식하지 못해 피하지 않고 맞았고, 그 결과 숙련 프로파일이 CHORUS·BASTION에서 죽었다. `attackState()`가 애초에 `kind`를 내보내지도 않아서 — `js/boss.js attackState()`에 `kind: a.def.kind`를 실어 보내고, 봇 판정을 `ca.kind === 'charge'`로 바꿔 고쳤다(GRAVEN은 id·kind가 모두 `charge`라 챕터 1 수치는 그대로). 상세: `docs/qa/balance-2026-09-17.md` §근본 원인.
8. **차별화 기준이 기획서에 없어서 QA·밸런스까지 연쇄로 잘못됐다**: 2026-09-17 챕터 2 1차 구현은 판정 규칙(색·연타·되받기·약탈)만 다르고 공격 구성·패턴 모양·실루엣을 챕터 1 에서 복제했는데, 그 복제를 걸러낼 기준 자체가 스펙에 없어 QA(스펙 준수 검수)도 밸런스(복제된 기반 위 수치 조정)도 문제를 못 잡았다. 사용자 지시로 원칙("새 보스는 의도된 기획이 아니면 이전 보스와 패턴·컨셉이 겹치면 안 된다")을 스펙 §3 공통·CLAUDE.md 에 명문화하고 판정기 `tools/boss-overlap.mjs --check` 를 게이트로 추가했다(2026-09-18 재설계, 스펙 `2026-09-18-riposte-chapter2-redesign.md`). 기준 없는 "다름"은 리뷰로 못 잡는다 — 판정기로 코드화해야 한다.
9. **되받아치기(deflect) 랠리가 상수 이름 때문에 무한 랠리였다**: `DEFLECT_FORCE_RALLY: 3`("3회째부터는 반드시 되받는다")과 `pr.rally`가 `Projectile.reflect()`로 리셋되지 않는다는 사실이 합쳐져, 3회를 넘긴 탄은 **영원히 되받혀** 절대 보스에게 닿지 않는 결함이었다. `DEFLECT_MAX_RALLY: 3`(3회째엔 되받지 않는 상한)으로 조건을 반전시켜 랠리가 반드시 끝나게 고쳤다. 상수 이름이 실제 동작과 반대로 읽히면 주석만 보고는 못 찾는다 — 동작을 실측하고 이름부터 의심할 것.
10. **`tests/bot.mjs --boss=N` 단독 실행은 `--all` 과 다른 결과를 낼 수 있다**: 원인은 RNG 공유가 아니다(보스마다 새 페이지 + 같은 시드로 `hrng` 를 새로 만든다 — 공유 경로가 없다). 보고되는 `time` 도 `Date.now()` 가 아니라 `js/game.js` 의 시뮬레이션 시계다(`this.time += dt`, 이 `dt` 는 항상 고정된 `C.LOOP.FIXED_DT`). 실제 원인은 **rAF 프레임 간격**: `js/main.js` 의 `dt` 는 실제 `requestAnimationFrame` 프레임 간격이고, 프레임당 처리 가능한 고정 스텝 수는 `C.LOOP.MAX_STEPS`(16)로 상한이 있어 헤드리스 프레임 페이싱이 흔들리면(CPU 부하·동시 실행) 시뮬레이션 전진 속도와 봇의 16ms 폴링(`installBot` 의 `setInterval(tick, TUNE.POLL_MS)`) 타이밍이 어긋난다(리뷰어 재현: `--boss=7 --seed=7` BASTION 41.70s/hits1 단독 vs `--all --seed=7` 35.22s/hits2). ⇒ 빠른 진단은 `--boss=N`, **채택 판정은 반드시 `--all`**. 상세: `docs/qa/balance-2026-09-18.md`.

11. **패리 키 연타로 보스가 깨졌다 — 판정 창보다 재입력 잠금이 길면 헛침에 벌이 없다**: 사용자 보고("연타하면 운이 좋으면 대부분의 보스가 깨진다")를 `tests/mash.mjs`(텔을 읽지 않는 순수 연타 봇)로 재현했다 — K+J 연타가 24판 중 9승(SERAPH 3/3·BASTION 3/3·GRAVEN 2/3·MIRROR 1/3), K만 연타해도 VESPER에게 115초 동안 피격 0·퍼펙트 54~61회. 원인은 창(`BLOCK_WINDOW` 0.34) < 잠금(`RECOVERY` 0.40)이라 헛침의 실질 무방비가 0.06초뿐이고, `onBlock`도 `onParrySuccess()`를 불러 잠금이 0.10초로 줄며, `INPUT_BUFFER`(0.16)가 잠금 해제 순간의 자동 재입력까지 보장한 것. ⇒ **스태미너**(§2.6.1)로 고쳤다. 잔량 부족 시 **입력을 버퍼에 쌓지 않는 것**이 핵심이다 — 쌓으면 연타가 그대로 살아남는다. 🔴 **기각한 안**: 잠금만 늘리기(0.8 → 숙련 봇이 MIRROR 페인트에 죽어 7/8, 0.6 → BASTION 랠리에 죽어 7/8). 단발 실수를 과하게 벌하면 정상 플레이가 먼저 무너진다. **"봇이 이긴다"는 승리 조건만 보는 테스트로는 이 결함을 못 잡는다 — 지지 않아야 하는 봇(연타·무입력)을 따로 둬야 한다.**
12. **브라우저 측정을 동시에 돌리면 양쪽 다 무효가 된다**: 워커 둘이 같은 작업 트리에서 `tests/`를 동시에 실행해 한쪽 측정에 `RAudio.staminaEmpty is not a function` 49건이 섞였다(다른 쪽이 그 순간 `js/`를 수정 중이었다). 헤드리스 프레임 페이싱도 함께 흔들려 시간·hits가 어긋난다. ⇒ **측정은 항상 직렬**, 그리고 **측정 중에는 `js/`를 수정하지 않는다**. 병렬 워커에게는 "코드 작성은 가능, 브라우저 실행은 대기"를 명시하고, 오케스트레이터가 게이트를 직렬로 직접 돌리는 편이 안전하다. 기존 파일은 Edit(부분 치환)만 — Write 전체 덮어쓰기는 동시 변경을 지운다.

13. **서브에이전트의 "커밋했다" 보고가 허위였다 (2026-09-19, Task 4)**: 구현 워커가 커밋 해시 `d1e1ae2` 를 보고했지만 존재하지 않는 해시였다 — 코드는 작업 트리에만 있었고, 보고서의 판정기 유사도(43% vs 실제 50%)·공격 이름(SQUALL vs 실제 SURGE)도 실행 출력과 달랐다. ⇒ 위임 결과의 **커밋 주장은 `git log --oneline` / `git cat-file -t <hash>` 로, 수치 주장은 오케스트레이터가 직접 fresh 실행해** 검증한 뒤 채택한다. 보고서에 "실행 출력 원문" 을 요구하는 것이 가장 싸다.
14. **seed 7 고정 반복은 독립 표본이 아니다 (2026-09-19)**: 챕터 1·2 기준선("숙련 전부 승리·평균 전부 패배")은 같은 seed 7 을 여러 번 돌려 얻은 것이라 표본이 하나였다. seed 11 로 바꾸자 챕터 1·2 의 절반이 기준을 벗어났고(`main` 도 동일), 챕터 3 은 처음부터 3시드(7·11·23)로 재서 이 함정을 피했다. ⇒ **채택 판정은 시드를 바꿔 다수결.** 같은 시드 반복은 결정론 검증(교훈 10)에는 맞지만 난도 판정에는 표본 1 이다.
15. **재현된다고 방금 바꾼 것이 원인은 아니다 — A/B 가 필요하다 (2026-09-18~19 재확인)**: BASTION 이봉(위 남은 과제)에서 패드 폴링을 원인으로 오진한 뒤, 챕터 3 밸런스에서도 "레버 하나 바꾸고 1회 실측" 으로 인과를 단정하려는 유혹이 반복됐다. 규칙: **변경 전후를 각각 여러 시드로** 돌려 분포가 움직였는지 본다. 한 번에 레버 하나(`docs/qa/balance-2026-09-19.md` §5 형식). 완화 후에도 남는 편차는 "원인" 이 아니라 "성질" 일 수 있다(ADAMANT P2 counterOnly).
16. **훔친 SHARD 가 방벽을 깎았다 — owner 만으로는 반사탄과 손패탄을 못 가른다 (2026-09-19, `904ca3c`)**: ADAMANT 방벽은 "반사탄만 깎는다" 가 규칙인데, 플레이어가 훔친 SHARD 를 손패에서 `shot` 으로 쏜 탄도 `owner === player` 라 방벽을 깎았다 — 벽 기믹이 "패리 → 되돌리기" 가 아니라 "카드 쏘기" 로 우회됐다. 반사탄(`Projectile.reflect()`)과 손패탄(`RIPOSTE_KINDS.shot`)은 owner 가 같으므로 **탄에 출처 플래그(`fromHand`)를 실어** 갈랐다. 손패 shot 은 방벽에 튕겨 환급 경로로 간다. 판정 조건을 "누구 것이냐" 로만 두면 같은 주인의 다른 출처를 못 가른다 — 출처가 규칙이면 출처를 데이터로 박을 것.

## 남은 과제 / 아이디어
- **목표 재정의(2026-09-18, 사용자)**: "잼은 옛날 말" — 이 게임은 **상용 스토어(Steam 1차) 출시 수준으로 업데이트**하는 것이 목표다. CLAUDE.md 3행·스펙 §0·README 의 "게임잼 출품작" 문구는 타겟 스토어·가격대·무료 웹판 정책이 확정되면 갱신한다. 상용 근접작 대조와 우선순위 로드맵은 `docs/research/2026-09-18-reference-games.md`(원문 `docs/research/refs/`). 핵심: 코어 전투·판정 수치는 상용작과 같은 자리라 불변, 갭은 분량·플랫폼 기능(패드·업적·옵션)·아레나/음악 변주·영어 자막·Electron 배포 다섯 축.
- 밸런스 최종(2026-09-10, 사용자 결정 "이 정도로 멈추자 — 적당히 어려운 것이 도전욕구를 자극"): VESPER HP 120, par 30/35/40/50s, MIRROR gap 0.85/0.55, 패리 창 0.18/0.34s. 실측 — 완벽 봇 8~18s 전부 S/A, 숙련 프로파일(`--jitter=0.05 --miss=0.15 --think=0.25`) 10~28s 전부 승리, 평균 프로파일(`--miss=0.3 --jitter=0.09 --think=0.45`)은 사망. 추가 완화는 의도적으로 하지 않음.
- 챕터 2 재설계 밸런스 최종(2026-09-18, 스펙 §3.5~3.8 확정): LANTERN HP 280/par 65s, CHORUS HP 300/par 45s, BASTION HP 310/par 50s, AVARICE HP 400/par 55s. 실측·레버 기록은 `docs/qa/balance-2026-09-18.md` — 완벽 8/8·숙련 8/8 VICTORY, 평균 8/8 DEFEAT(전부 막을 수 있는 금 텔에 죽음). 2026-09-17 의 확정값은 복제된 기반 위의 값이라 폐기(`docs/qa/balance-2026-09-17.md` 는 이력만).
- **재실행 편차**: 같은 시드라도 헤드리스 프레임 타이밍 때문에 봇의 hits 가 회차마다 ±2 흔들린다(`docs/qa/balance-2026-09-17.md` 참고). 밸런스 판단은 단발 실측이 아니라 여러 번 돌려 하한을 보는 쪽이 안전하다.
- 🔴 **BASTION 은 결과가 두 갈래로 갈린다 — 노이즈가 아니라 이봉(bimodal) 이다 (2026-09-18, 미해소)**: 숙련 프로파일 같은 시드에서 **23.02s VICTORY(hits 2)** 와 **26.93s DEFEAT(hits 5)** 두 결과만 나오고, 각 모드 안에서는 `parry/dash/riposte` 카운트까지 **완전히 동일하게 재현**된다. 즉 시뮬레이션은 결정론적인데 **시작 시점의 어떤 초기 조건**(브라우저 워밍업·rAF 첫 프레임 간격 등)이 어느 모드로 갈지를 가른다.
  - ⚠️ **오진 기록(중요)**: 게임패드 폴링을 프레임 루프에 넣은 뒤 DEFEAT 가 두 번 재현되자 "매 프레임 `navigator.getGamepads()` 비용이 원인" 이라고 판단했다. 그러나 폴링을 완전히 no-op 으로 만든 뒤에도 **같은 26.93s DEFEAT 가 byte 단위로 재현**됐다 ⇒ **가설은 틀렸다.** 재현된다고 해서 방금 바꾼 것이 원인인 것은 아니다 — 이봉 분포에서는 같은 모드에 두 번 떨어지는 일이 흔하다. **A/B(변경 전후 각각 여러 회)** 없이 인과를 단정하지 말 것.
  - 📌 남은 교훈은 유효하다: 프레임 루프에 무엇을 넣든 **"안 쓰일 때 비용 0"** 을 지킨다(패드는 `_padCount` 로 게이팅 — 연결 전에는 `navigator` 도 건드리지 않는다).
  - ⇒ **BASTION 단독 1회 결과로 채택·기각을 판정하지 말 것.** 최소 3회 돌려 다수결을 보고, 프로파일 세 종(완벽·숙련·평균)을 함께 본다. `average` 가 BASTION 을 이기는 회차도 있었다(29.52s VICTORY).
  - 보스 자체의 이봉성을 없애는 것은 별도 과제다 — 사람 플레이에도 "같은 실력인데 결과가 갈리는" 보스라는 뜻이다. 후보: `DEFLECT_CHANCE_P2` 하향, 랠리 중 위협 겹침 완화.
- 🔴 **챕터 1·2 기준선 재측정 (2026-09-19 발견, 미조치)**: 챕터 1·2 의 "숙련 전부 승리 · 평균 전부 패배" 기준선은 **seed 7 단일 표본**이었다. seed 11 에서는 MIRROR·LANTERN·CHORUS·AVARICE 숙련이 지고 VESPER·SERAPH·GRAVEN 평균이 이긴다(`main` 에서도 동일 — 회귀가 아니다). 스펙 §8-8 은 3시드 다수결로 정정했고, **챕터 1·2 수치를 3시드로 다시 맞출지는 별도 결정**이다(`docs/qa/balance-2026-09-19.md` §6 표).
- **ADAMANT 숙련 편차 (2026-09-19, 사용자 결정 대기)**: 숙련 3시드 33.7 / D 26.2 / 52.7s — 승률 2/3, 편차의 원인은 Phase 2 `counterOnly`(봇은 idle·recover 에만 리포스트해 P2 피해가 운). 후보 ① 보스별 `phase2At`(P1 결정론 구간을 길게) ② P2 `wall` 풀 비중 상향 ③ counterOnly 폐기. `softMult 0.2`·hp 상향은 실측에서 기각(레버 8·9).
- **HOLLOW 사람 테스트 (2026-09-19, 미실시)**: 어둠(`darkness`)은 봇에게 보이지 않아 봇 실측으로는 "텔을 읽을 수 있는가" 를 판정할 수 없다. 사람이 P2(0.85) 에서 텔·투사체·HUD 를 읽는지 확인해야 하고, 못 읽으면 어둠을 옅게 → 그래도면 축 폐기(수치로 덮지 않는다). 옵션의 밝기 하한(접근성)도 그때 판단.
- 챕터 3 밸런스 확정(2026-09-19, 스펙 §3.9~3.12): SENTINEL 320/50 · TEMPEST 330/46 · HOLLOW 300/75 · ADAMANT 340/75. 3시드 완벽 12/12 · 평균 챕터 3 전패 · 연타 0/36 · 하드 12/12. 실측·레버 전부 `docs/qa/balance-2026-09-19.md`.
- ADAMANT 만 `C.AUDIO.BPM` 테이블에 항목이 없다 — `RAudio.startDrone` 의 `bpm || 100` 폴백으로 P2 심박이 100 BPM 으로 뛴다. 다른 11보스는 전부 명시값. 의도인지 누락인지 확인 필요(게임 로직 무변경 원칙으로 Task 9 에서 안 건드림).
- DEV 배지 좌표는 타이머 아래(`BADGE_X 938, BADGE_Y 50`)로 옮겼다(Task 9). 타이머·PAR 두 줄(y 26·43) 바로 밑이다.
- **BASTION 완벽 봇 41.70s > 숙련 23.00s 역전 미해소**: 폭은 크게 줄었지만(96s → 42s) 완전히는 안 사라졌다. 원인은 봇의 리포스트 게이트(`SAFE_GAP`)가 투사체 위협 앞에서 계속 닫히는 쪽으로 보이나, `tests/bot.mjs` 의 `TUNE` 은 브리프가 불변으로 명시해 손대지 않았다 — `SAFE_GAP` 을 투사체 위협에 한해 완화하는 것이 다음 후보.
- **보스 7(BASTION) 이 보스 5(LANTERN) 보다 짧다**: 숙련 23.0s vs 33.4s — 챕터 2 진행 길이 곡선이 뒤집혀 있다. BASTION `hp` 를 380 으로 늘려 봤으나 완벽·숙련 둘 다 DEFEAT 라 되돌렸다(`docs/qa/balance-2026-09-18.md` 레버 13). 길이를 늘리려면 hp 가 아니라 패턴 수 쪽이 맞아 보인다 — 미조치.
- `?nofx=1`은 텍스트 팝·파티클만 끄고 히트스톱·흔들림·텔 버스트는 유지(의도).
- 모바일 터치 UI 없음(키보드 전용이 설계).
- `js/render.js`의 `drawWeapon`/`WEAPON_LEN`: `spear`는 제거 후보다(보스 어디에서도 무기로 지정되지 않는 렌더 전용 죽은 코드). `blade`는 지우면 안 된다 — `playerWeapon()`이 slash 계열 리포스트 무기로 그리는 데 쓴다.
- 다음 사이클 후보 (a) 되받기 근접 가드: 퍼펙트 패리가 `DEFLECT_REACH` 안이면 반사탄이 0 거리에서 되받혀 반응 시간이 사라진다 — `js/game.js` `updateProjectiles`의 deflect 호출에 `Math.abs(pr.x - p.x) >= C.BOSS.DEFLECT_REACH` 가드 후보. (b) `js/boss.js` `tryDeflect`의 `pr.label = 'DEFLECT'`가 원 공격명을 지운다 — `'DEFLECT ' + (원 label || 'SHOT')` 후보. (c) 엔딩 8행에서 hit 열(`V.W/2+65`)이 time 열(`V.W/2+20`) 우측 정렬과 45px 밖에 안 떨어져 있어 2자리 hits 에서 근접한다 — 여백 재배치 후보.
