# RIPOSTE — 인수인계 (handover)

- 갱신: 2026-09-09
- 상태: 플레이 가능 완성본. GitHub `kkp8121-rgb/riposte` (Public) → Pages `https://kkp8121-rgb.github.io/riposte/`
- 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md` · 상수 SSoT: `js/config.js` + `js/bosses/*.js`

## 무엇을 왜 택했나 (요약)
- 형제 프로젝트 10종이 탑다운·마우스·서바이벌에 몰려 있어 **사이드뷰 1:1 보스러시 패리 듀얼(키보드 전용)** 을 골랐다. 후보 6종 비교표는 스펙 §1.2.
- 콘텐츠를 **보스 데이터 테이블**(attacks/patterns/hooks)로 만들어 보스 추가·밸런스가 코드 수정 없이 가능하도록 했다.
- classic `<script>` 로딩(ES module 금지) — `file://`와 Pages 하위 경로 양쪽에서 동작해야 하므로.

## 검증 하네스 (모두 헤드리스, `node ...`)
| 명령 | 검증 내용 |
|---|---|
| `tests/smoke.mjs` | pageerror 0, 타이틀→FIGHT 진입, 무입력 60s 내 DEFEAT(위협 존재) |
| `tests/bot.mjs --all` | 반응형 봇이 보스 4종 전부 승리 + 무입력 봇 패배. `--jitter/--miss/--think`로 인간형 프로파일 |
| `tests/state.mjs` | 전투 전후 `window.BOSSES` JSON 동일 — 정의 테이블 불변성(과거 결함 회귀 방지) |
| `tests/audio-smoke.mjs` | unmuted 헤드리스에서 AudioContext `running`, 모든 사운드 경로 무예외, mute→unmute 드론 복구 |
| `tools/check-pages.mjs [url]` | 실제 Pages URL 로드: 404·pageerror·FIGHT 진입 |
| `tools/shots.mjs` | README용 스크린샷(`docs/media/`) 재촬영 |

## 실패했던 시도와 교훈
1. **봇 테스트 통과 ≠ 정상**: 1차 구현은 스모크·봇 전부 통과했지만 읽기 전용 opus 리뷰가 19건을 찾았다. 특히 (a) 패턴 스텝 객체를 그대로 opt로 넘겨 `_approached`가 정적 보스 정의를 영구 오염(R 재시작·시드 결정론 붕괴), (b) Phase 2를 유발한 타격의 후속 stagger가 포효 무적을 덮어씀, (c) 첫 키 latch + suspended AudioContext → Shift가 첫 키면 영구 무음. 셋 다 "로드→1전투→종료" 테스트로는 원리적으로 못 잡는다 → `tests/state.mjs`·`tests/audio-smoke.mjs`를 추가했다.
2. **Node 쪽 봇 루프는 불가**: Node↔CDP 왕복 90~170ms라 0.15s 퍼펙트 창에 못 들어간다. 봇 결정 루프는 페이지 안(`installBot`)에서 돌고 Node는 오케스트레이션·단언만 한다.
3. **HP 상향은 전투 길이를 거의 안 늘린다**: 봇의 처치 시간은 "보스가 패리 가능한 공격을 얼마나 자주 주느냐"에 묶여 있다. 길이 레버는 HP가 아니라 엠파워(×2)·카운터(×1.5) 배수 스택과 패턴 간격(gap)이다.
4. feint는 "2차 플래시 → 그 공격의 정상 windup → 타격"이어야 §2.2(플래시→타격 항상 일정)를 지킨다. 별도 짧은 간격을 두면 리듬 학습이 깨진다.

## 남은 과제 / 아이디어
- 밸런스 최종(2026-09-10, 사용자 결정 "이 정도로 멈추자 — 적당히 어려운 것이 도전욕구를 자극"): VESPER HP 120, par 30/35/40/50s, MIRROR gap 0.85/0.55, 패리 창 0.18/0.34s. 실측 — 완벽 봇 8~18s 전부 S/A, 숙련 프로파일(`--jitter=0.05 --miss=0.15 --think=0.25`) 10~28s 전부 승리, 평균 프로파일(`--miss=0.3 --jitter=0.09 --think=0.45`)은 사망. 추가 완화는 의도적으로 하지 않음.
- `?nofx=1`은 텍스트 팝·파티클만 끄고 히트스톱·흔들림·텔 버스트는 유지(의도).
- 모바일 터치 UI 없음(키보드 전용이 설계).
