# RIPOSTE — 프로젝트 지침 (목차형)

> itch.io 게임잼 출품작. 사이드뷰 1:1 보스러시 패리 듀얼. 키보드 전용. 바닐라 JS + Canvas 2D.

## Vitals
- 설계 SSoT: `docs/superpowers/specs/2026-09-09-riposte-design.md` — 규칙·수치·보스 테이블·파일 구조는 여기만 본다.
- 상수 SSoT: `js/config.js` (전역) + 각 `js/bosses/*.js` (보스 로컬 테이블). 매직넘버 하드코딩 금지.
- 스크립트 로딩: classic `<script>` 순서 로딩. ES module·CDN·외부 폰트·이미지 금지 (`file://`와 GitHub Pages 모두에서 동작).
- 디버그 훅: `window.__RIPOSTE` (스펙 §7). 테스트는 이 훅만 사용한다.
- 테스트: `npm install`(최초 1회, playwright-core) → `node tests/smoke.mjs` · `bot.mjs --all` ·
  `state.mjs` · `audio-smoke.mjs` · `story.mjs`(브라우저 불필요) — 로컬 chromium. Pages 배포 확인은
  `node tools/check-pages.mjs [url]`.
- 브라우저 자동 실행 금지 (`start`/`open` 사용 금지). 헤드리스만 허용.
- Git: author = 전역 설정(BHS). GitHub 계정 = `kkp8121-rgb`. 시크릿 커밋 금지.

## 참조
- 설계 스펙: `docs/superpowers/specs/2026-09-09-riposte-design.md`
- 스토리 대사 SSoT: `docs/superpowers/specs/2026-09-17-riposte-story-bible.md`
- 챕터 2 제안서: `docs/superpowers/specs/2026-09-17-riposte-chapter2-proposal.md`
- 구현 계획: `docs/superpowers/plans/2026-09-17-riposte-chapter2-story.md`
- 밸런스 실측: `docs/qa/balance-2026-09-17.md`
- 인수인계: `docs/handover.md` (세션 종료 시 갱신)
