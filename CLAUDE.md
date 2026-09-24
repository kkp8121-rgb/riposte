# RIPOSTE — 프로젝트 지침 (목차형)

> itch.io 게임잼 출품작. 사이드뷰 1:1 보스러시 패리 듀얼. 키보드 전용. 바닐라 JS + Canvas 2D.

## Vitals
- 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md` — 규칙·수치·보스 테이블·파일 구조는 여기만 본다.
- 상수 SSoT: `js/config.js` (전역) + 각 `js/bosses/*.js` (보스 로컬 테이블). 매직넘버 하드코딩 금지.
- 스크립트 로딩: classic `<script>` 순서 로딩. ES module·CDN·외부 폰트·이미지 금지 (`file://`와 GitHub Pages 모두에서 동작).
- 디버그 훅: `window.__RIPOSTE` (스펙 §7). 테스트는 이 훅만 사용한다.
- 테스트: `npm install`(최초 1회, playwright-core) → `node tests/smoke.mjs` · `bot.mjs --all` ·
  `state.mjs` · `audio-smoke.mjs` · `story.mjs`(브라우저 불필요) · `mash.mjs --all --riposte --expect-lose`
  (연타 봇은 반드시 전패) · `pad.mjs` · `options.mjs` · `dev.mjs`(dev 모드는 꺼져 있으면 무효) · `zone.mjs`(지속 구역 `linger` 동작 — 단발 존 불변·재타격) ·
  `motions.mjs`(새 공격 동작 단위 검증) · `touch.mjs`(터치 조작 — PC 에서는 버튼이 안 뜬다) — 로컬 chromium. Pages 배포 확인은 `node tools/check-pages.mjs [url]`(main 배포본 기준),
  재미 QA 계측은 `tools/funqa.mjs`.
- **브라우저 측정은 동시에 돌리지 않는다** — 헤드리스 프레임 페이싱이 흔들려 봇 결과가 어긋난다(실측 사고 2026-09-18).
- 브라우저 자동 실행 금지 (`start`/`open` 사용 금지). 헤드리스만 허용.
- **신규 보스 차별화 원칙**: 새 보스는 기존 보스와 패턴·컨셉·실루엣이 겹치면 안 된다(의도된 기획은 `overlapIntended` 선언). 보스 추가·수정 후 `node tools/boss-overlap.mjs --check` 통과 필수 (스펙 §3 공통).
- **새 공격 동작은 `js/motions.js` 에 등록한 동작만** — 수치 변주에 새 kind 이름을 붙이지 않는다(`boss-overlap.mjs` 가 보스당 재활용 공격 ≤1 개를 강제).
- Git: author = 전역 설정(BHS). GitHub 계정 = `kkp8121-rgb`. 시크릿 커밋 금지.

## 참조
- 설계 스펙: `docs/superpowers/specs/2026-09-09-riposte-design.md`
- 스토리 대사 SSoT: `docs/superpowers/specs/2026-09-17-riposte-story-bible.md`
- 챕터 2 제안서: `docs/superpowers/specs/2026-09-17-riposte-chapter2-proposal.md`
- 챕터 2 재설계안: `docs/superpowers/specs/2026-09-18-riposte-chapter2-redesign.md` (구현 완료, 커밋 8ad2f17)
- 챕터 3 설계: `docs/superpowers/specs/2026-09-19-riposte-chapter3-design.md` (구현 완료, 확정 수치는 스펙 §3.9~3.12)
- 챕터 2·3 공격 재설계(동작 어휘 확장): `docs/superpowers/specs/2026-09-23-riposte-ch23-attacks-design.md` (구현 완료 — 사용자 플레이 판정 대기)
- 구현 계획: `docs/superpowers/plans/2026-09-17-riposte-chapter2-story.md` · `docs/superpowers/plans/2026-09-18-riposte-chapter2-redesign.md` · `docs/superpowers/plans/2026-09-19-riposte-chapter3.md` · `docs/superpowers/plans/2026-09-23-riposte-ch23-attacks.md`
- 밸런스 실측: `docs/qa/balance-2026-09-17.md`(구 기반, 폐기) · `docs/qa/balance-2026-09-18.md`(챕터 2 확정) · `docs/qa/balance-2026-09-19.md`(챕터 3 확정, 3시드) · `docs/qa/balance-2026-09-23.md`(챕터 2·3 재설계 확정, 3시드)
- 재미 QA 계측: `docs/qa/funqa-2026-09-23.md`(봇 지표로 억울한 피격·죽은 시간 등을 잰다 — 재미 자체는 못 잰다)
- 플레이테스트 체크리스트: `docs/qa/playtest-ch23-attacks.md`(봇이 못 재는 것 — 외우기·참기·어둠 속 표식 읽기, G8)
- 상용 스토어 레퍼런스 조사·업데이트 방향: `docs/research/2026-09-18-reference-games.md` (원문 8건은 `docs/research/refs/`)
- 인수인계: `docs/handover.md` (세션 종료 시 갱신)
