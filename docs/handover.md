# RIPOSTE — 인수인계 (handover)

- 갱신: 2026-09-18
- 상태: 챕터 2 보스 4종 차별화 재설계 완료(커밋 8ad2f17, 밸런스 확정) + 트라이 수 표시 기능 진행 중(병렬 태스크). GitHub `kkp8121-rgb/riposte` (Public) → Pages `https://kkp8121-rgb.github.io/riposte/`
- 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md` · 스토리 대사 SSoT: `docs/superpowers/specs/2026-09-17-riposte-story-bible.md` · 상수 SSoT: `js/config.js` + `js/bosses/*.js`

## 무엇을 왜 택했나 (요약)
- 형제 프로젝트 10종이 탑다운·마우스·서바이벌에 몰려 있어 **사이드뷰 1:1 보스러시 패리 듀얼(키보드 전용)** 을 골랐다. 후보 6종 비교표는 스펙 §1.2.
- 콘텐츠를 **보스 데이터 테이블**(attacks/patterns/hooks)로 만들어 보스 추가·밸런스가 코드 수정 없이 가능하도록 했다.
- classic `<script>` 로딩(ES module 금지) — `file://`와 Pages 하위 경로 양쪽에서 동작해야 하므로.

## 검증 하네스 (모두 헤드리스, `node ...`)
| 명령 | 검증 내용 |
|---|---|
| `tests/smoke.mjs` | pageerror 0, 타이틀→STORY(선택지·held Enter 체크)→FIGHT 진입, 무입력 60s 내 DEFEAT, R 재도전은 STORY 없이 INTRO 직행 |
| `tests/bot.mjs --all` | 반응형 봇이 보스 8종 전부 승리 + 무입력 봇 패배. `--jitter/--miss/--think`로 인간형 프로파일 |
| `tests/state.mjs` | 전투 전후 `window.BOSSES` · `window.STORY` JSON 동일 — 정의 테이블 불변성(과거 결함 회귀 방지) |
| `tests/audio-smoke.mjs` | unmuted 헤드리스에서 AudioContext `running`, 모든 사운드 경로 무예외, mute→unmute 드론 복구 |
| `tests/story.mjs` | 대사 테이블(`js/story.js`) 검사 — 브라우저 불필요. 8보스 전부 대사 존재, 장면당 ≤4줄, 느낌표 0, 선택지 3개 ok:true/false 각 1, 보스 전속 어미 교차 0 |
| `tools/check-pages.mjs [url]` | 실제 Pages URL 로드: 404·pageerror·FIGHT 진입 |
| `tools/shots.mjs` | README용 스크린샷(`docs/media/`) 재촬영 — title·story·perfect-parry·mirror-phase2 4장 |
| `tools/boss-overlap.mjs --check` | 신규 보스 차별화 게이트 — 패턴 모양·공격 구성·실루엣이 기존 보스와 의도치 않게 겹치면(`overlapIntended` 미선언) FAIL |

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
10. **`tests/bot.mjs --boss=N` 단독 실행은 `--all` 과 다른 결과를 낼 수 있다**: 원인은 RNG 공유가 아니다(보스마다 새 페이지 + 같은 시드로 `hrng` 를 새로 만든다 — 공유 경로가 없다). 실제 원인은 **헤드리스 프레임 타이밍(wall-clock)**: 보고되는 `time` 은 게임 시간이 아니라 `Date.now()` 기준이라 `--all` 로 앞선 보스들을 먼저 돌리는 동안의 실행 부하가 뒤 보스의 결과를 바꾼다(완벽 프로파일조차 예외 없음 — BASTION 22.16s 단독 / 41.70s `--all`). ⇒ 빠른 진단은 `--boss=N`, **채택 판정은 반드시 `--all`**. 상세: `docs/qa/balance-2026-09-18.md`.

## 남은 과제 / 아이디어
- 밸런스 최종(2026-09-10, 사용자 결정 "이 정도로 멈추자 — 적당히 어려운 것이 도전욕구를 자극"): VESPER HP 120, par 30/35/40/50s, MIRROR gap 0.85/0.55, 패리 창 0.18/0.34s. 실측 — 완벽 봇 8~18s 전부 S/A, 숙련 프로파일(`--jitter=0.05 --miss=0.15 --think=0.25`) 10~28s 전부 승리, 평균 프로파일(`--miss=0.3 --jitter=0.09 --think=0.45`)은 사망. 추가 완화는 의도적으로 하지 않음.
- 챕터 2 재설계 밸런스 최종(2026-09-18, 스펙 §3.5~3.8 확정): LANTERN HP 280/par 65s, CHORUS HP 300/par 45s, BASTION HP 310/par 50s, AVARICE HP 400/par 55s. 실측·레버 기록은 `docs/qa/balance-2026-09-18.md` — 완벽 8/8·숙련 8/8 VICTORY, 평균 8/8 DEFEAT(전부 막을 수 있는 금 텔에 죽음). 2026-09-17 의 확정값은 복제된 기반 위의 값이라 폐기(`docs/qa/balance-2026-09-17.md` 는 이력만).
- **재실행 편차**: 같은 시드라도 헤드리스 프레임 타이밍 때문에 봇의 hits 가 회차마다 ±2 흔들린다(`docs/qa/balance-2026-09-17.md` 참고). 밸런스 판단은 단발 실측이 아니라 여러 번 돌려 하한을 보는 쪽이 안전하다.
- **BASTION 완벽 봇 41.70s > 숙련 23.00s 역전 미해소**: 폭은 크게 줄었지만(96s → 42s) 완전히는 안 사라졌다. 원인은 봇의 리포스트 게이트(`SAFE_GAP`)가 투사체 위협 앞에서 계속 닫히는 쪽으로 보이나, `tests/bot.mjs` 의 `TUNE` 은 브리프가 불변으로 명시해 손대지 않았다 — `SAFE_GAP` 을 투사체 위협에 한해 완화하는 것이 다음 후보.
- **보스 7(BASTION) 이 보스 5(LANTERN) 보다 짧다**: 숙련 23.0s vs 33.4s — 챕터 2 진행 길이 곡선이 뒤집혀 있다. BASTION `hp` 를 380 으로 늘려 봤으나 완벽·숙련 둘 다 DEFEAT 라 되돌렸다(`docs/qa/balance-2026-09-18.md` 레버 13). 길이를 늘리려면 hp 가 아니라 패턴 수 쪽이 맞아 보인다 — 미조치.
- `?nofx=1`은 텍스트 팝·파티클만 끄고 히트스톱·흔들림·텔 버스트는 유지(의도).
- 모바일 터치 UI 없음(키보드 전용이 설계).
