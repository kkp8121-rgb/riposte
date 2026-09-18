# RIPOSTE — 챕터 2 보스 재설계안 (차별화 원칙 적용)

- 작성일: 2026-09-18 · 상태: **구현 완료(커밋 8ad2f17), 밸런스 확정**. 스펙 §3.5~3.8 에 반영 완료. 구현 계획: `docs/superpowers/plans/2026-09-18-riposte-chapter2-redesign.md`. 밸런스 실측: `docs/qa/balance-2026-09-18.md`.
- 배경: 2026-09-17 챕터 2 1차 구현은 판정 규칙(색·연타·되받기·약탈)만 다르고 공격 구성·패턴 모양·실루엣을 챕터 1 에서 복제했다. 사용자 지시(2026-09-18): **"새 보스는 의도된 기획이 아니라면 이전 보스와 중복된 패턴·컨셉을 가지면 안 된다."** 기획서에 그 기준이 없었으므로 QA(스펙 준수 검수)와 밸런스(복제된 기반 위 수치 조정)까지 연쇄로 잘못됐다.
- 조치 1(완료): 원칙을 스펙 §3 공통과 CLAUDE.md 에 명문화하고, 판정기 `tools/boss-overlap.mjs --check` 를 게이트로 추가. 현재 실측: 챕터 1 전부 OK, 챕터 2 전부 VIOLATION.
- 조치 2(이 문서): 챕터 2 보스 4종을 아래처럼 다시 설계한다. 스토리 바이블의 이름·목소리(환술사·쌍검·수문장·약탈자)는 유지되며 대사 수정은 없다.

## 0. 설계 규칙 (각 보스가 반드시 가질 것)

1. **챕터 1 이 쓰지 않은 공간 모양 1개 이상** — 이동·위치·거리의 새 문법. 판정기의 "비기본 패턴 모양" 이 챕터 1 과 0% 겹치는 것을 목표로 한다.
2. **고유 실루엣** — 기존 5종(player/mirror/rapier/bow/hammer) 재사용 금지. 신규 체형표 1행 + 무기 그리기 1케이스.
3. **공격 구성(kind/tell) 유사도 75% 미만** — 챕터 1 의 어느 보스와도.
4. **판정 규칙 하나** — 1차 설계의 규칙(색 읽기·연타·되받기·약탈)은 살린다. 그 규칙을 공간 모양이 받쳐 준다.
5. 텔 문법·windup 하한·정의 테이블 불변 등 기존 제약은 그대로.

## 1. LANTERN — 환술사: "등 뒤에서 온다"

| 항목 | 내용 |
|---|---|
| 판정 규칙(유지) | 금/적 쌍둥이 — 같은 박자·같은 리치, 색만 다르다 |
| **새 공간 모양** | **순간이동** — 스텝 `{ move: 'behind' }`: 플레이어 등 뒤 `prefer.close` 거리로 즉시 이동(엔진: `beginMove` 분기 1줄 + 잔상 FX). 챕터 1 은 보스가 항상 정면에서 온다 |
| 실루엣 | 신규 `lantern` — 한 손에 등불(원형 광원), 다른 손에 짧은 단검. 무기 `dagger` 케이스 |
| 공격표 | `flicker` 금 근접(lunge 계열, 훔침 FLICKER) · `flicker-red` 적 근접(동일 박자) · `glow` 금 투사체(느린 빛 구슬, 속도 240, 훔침 GLOW shot 12) — sweep 계열 삭제 |
| 패턴 P1 | `[behind, flicker]` · `[flicker-red]` · `[glow, behind, flicker]` · `[flicker, wait, flicker-red, wait, flicker]`(색 교대 리듬) |
| 패턴 P2 | `[behind, flicker-red]` · `[glow, glow, behind, flicker]` · `[behind, flicker, behind, flicker-red]`(연속 순간이동) |
| 가르침 | 색을 읽되 **방향도 읽어라** — 뒤에서 오는 금은 뒤로 돌아 패리해야 한다(플레이어는 항상 보스를 본다 = 자동 회전, 그래도 잔상 순간에 반응이 필요) |
| 예상 판정 | 실루엣 고유 · 비기본 모양 0% · kit [m/g, m/r, p/g] vs VESPER 50% |

## 2. CHORUS — 쌍검: "양옆에서 번갈아"

| 항목 | 내용 |
|---|---|
| 판정 규칙(유지) | 근접 연타 volley(0.35s 재-windup) |
| **새 공간 모양** | **좌우 교차** — 새 스텝 `move:'cross'`(플레이어를 지나쳐 반대편으로 빠르게 달려 넘어감, 엔진 3줄)로 `[cross, twin, cross, twin]` 처럼 **같은 패턴 안에서 플레이어의 반대편으로 넘어간다**. 기존 `left/right` 는 절대 방향 스트레이프라 플레이어 기준 교차가 되지 않아 쓰지 않는다. LANTERN 의 순간이동과 달리 눈에 보이는 이동 |
| 실루엣 | 신규 `twin` — 양손 단검 두 자루(무기 `twin` 케이스: 짧은 날 2개), 마른 체형 |
| 공격표 | `twin` 금 근접 volley 2 · `triad`(P2) 금 근접 volley 3 · `bolt` 금 투사체 · **`lance` 삭제**(GRAVEN 돌진과 중복) → 대신 `scissor` 적 근접(양쪽을 동시에 베는 가위, reach 200, 훔침 없음) |
| 패턴 P1 | `[cross, twin]` · `[twin]` · `[bolt, cross, twin]` · `[cross, twin, cross, twin]` |
| 패턴 P2 | `[triad]` · `[cross, triad, scissor]` · `[bolt, bolt, cross, triad]` · `[scissor]` |
| 가르침 | 연타 사이 **몸을 돌려** 받아라 |
| 예상 판정 | 실루엣 고유 · 비기본 모양 0%(m:left/m:right 조합은 챕터 1 에 없음) · kit [m/g/volley ×2, p/g, m/r] vs VESPER 25% |

## 3. BASTION — 수문장: "문을 닫는다"

| 항목 | 내용 |
|---|---|
| 판정 규칙(유지) | 되받아치기 deflect — 반사된 투사체를 되받아치고 경직 = 카운터 창 |
| **새 공간 모양** | **접근 차단 존** — `gate` 적 존: 보스 **앞** 고정 폭 220 의 바닥 존(SERAPH rain 은 플레이어 위치 낙하). 문이 닫히면 근접 리포스트가 막히고 원거리(반사·shot)만 통한다 → 되받기 랠리가 전투의 축이 된다. 존 kind 재사용, 위치만 `zone.anchor: 'boss'` 옵션 추가(엔진 2줄) |
| 실루엣 | 신규 `shield` — 큰 방패 + 짧은 철퇴, 넓은 체형(hammer 와 다른 폭·높이). 무기 `shield` 케이스 |
| 공격표 | `salvo` 금 지면 투사체(되받기 대상, 훔침 VOLLEY shot 20) · `gate` 적 존(보스 앞) · `ward` 금 근접(훔침 WARD slam 30) · **`bulwark` 돌진 삭제** |
| 패턴 P1 | `[salvo]` · `[gate, salvo]` · `[far, salvo, salvo]` · `[ward]` |
| 패턴 P2 | `[gate, salvo, salvo, salvo]`(랠리) · `[far, gate]` · `[ward, gate]` · `[salvo, far, salvo]` |
| 아머 | 유지(엠파워만 interrupt) |
| 가르침 | 문이 닫혔을 때는 **되받는 순간** 만이 열린 틈 |
| 예상 판정 | 실루엣 고유 · 비기본 모양(`m:far …`) 0% · kit [p/g, z/r, m/g] vs GRAVEN 50% · vs SERAPH 60% |

## 4. AVARICE — 약탈자: "자기 기술이 없다"

| 항목 | 내용 |
|---|---|
| 판정 규칙(유지) | 약탈 stealOnHit/loot + plunder |
| **새 공간 모양** | **손패 되돌림의 연쇄** — `[loot, loot]`, `[close, loot]`, `[loot, wait, loot]` 처럼 **미러 스텝을 겹쳐 쓴다**. MIRROR 는 손패를 한 번 통째로 비추고(`mirror:'all'`), AVARICE 는 빼앗은 것을 잘게 나눠 두 번 세 번 되돌린다 |
| 실루엣 | 신규 `taker` — 후드 + 긴 외투, 무기 없음(`none`), player 보다 키 큼. 흰색이 아닌 자기 색 |
| 공격표 | 되돌림용 기술 7종(thrust/slash/arrow/slam/flicker/glow/ward — 챕터 2 재설계 기술 반영) 은 **패턴에서 직접 호출하지 않는다**. 직접 호출은 `plunder`(적 잡기, P1 부터) 와 `count`(**금** 근접 광역, 느린 선딜 — "하나, 둘, 셋" 세며 걷어감, 훔침 COUNT slash 15) 둘뿐. 손패·loot 가 비면 fallback 은 `count` — 플레이어가 첫 카드를 훔칠 유일한 금색이라 반드시 금이어야 한다(적이면 훔칠 것이 없어 교착) |
| 패턴 P1 | `[loot]` · `[loot, loot]` · `[close, loot]` · `[plunder]` |
| 패턴 P2 | `[all]`(플레이어 현재 손패 전부) · `[loot, wait, loot, wait, loot]` · `[plunder, loot]` · `[count]` |
| 선언 | `overlapIntended: '되돌림용 공격표는 챕터 1·2 기술 정의를 그대로 담는다 (스펙 §3.8)'` — kit 유사도는 의도된 것 |
| 가르침 | 맞을수록 **내 기술이 상대 손에** 쌓인다 — 무피격이 곧 공격권 |
| 예상 판정 | 실루엣 고유 · 비기본 모양(`M M`, `m:close M`, `M w M w M`) 0% · kit 은 선언으로 예외 |

## 5. 엔진·렌더 델타 (전부 소형)

| 변경 | 위치 | 크기 |
|---|---|---|
| 스텝 `move:'behind'`(순간이동) · `move:'cross'`(달려 넘어감) | `js/boss.js nextStep/beginMove` | 메서드 1개 + 분기 3줄 + 잔상 FX |
| 존 `anchor:'boss'` | `js/boss.js beginAttack` zone 분기 | 2줄 |
| 실루엣 4종 `lantern/twin/shield/taker` | `js/render.js BUILD` 4행 + `drawWeapon` 케이스 3개(dagger/twin/shield) | ~40줄 |
| 차별화 게이트 | `tools/boss-overlap.mjs --check` 를 `tests/` 실행 목록과 CLAUDE.md 에 포함(완료) | — |

## 6. 이후 절차

1. 이 문서 승인 → 스펙 §3.5~3.8 을 이 내용으로 교체 → 구현 계획 작성.
2. 구현(보스 4파일 재작성 + 엔진·렌더 델타) → `tools/boss-overlap.mjs --check` PASS 가 첫 게이트.
3. 봇 3프로파일 재실측 → par/HP 재확정(현재 수치는 폐기 — 복제된 기반 위의 값이므로).
4. 스토리 바이블은 무수정(이름·목소리·대사 그대로). README 보스 표의 "What it teaches" 만 갱신.
5. 커밋·push. Pages 반영은 계정 결제 정리 후.
