# RIPOSTE 상용 스토어 출시 리서치 — 기술 경로·기능 최저선·비즈니스 관행

> 조사일: 2026-09-18. 대상: RIPOSTE(바닐라 JS + Canvas 2D, 빌드 없음, 외부 에셋 0, 논리 해상도 960×540,
> 키보드 전용, 사이드뷰 1:1 보스러시, 한국어 스토리·영어 UI, 1회 10~20분, 보스 8종, 현재 GitHub Pages 무료 배포).
> 목적: 잼 출품작을 Steam 등 **상용 스토어**에 낼 때 필요한 요건을 실사례·공식 문서 기반으로 정리.
> 표기 원칙: 수치·주장에는 출처를 병기한다. 출처 불명확·비공식 확인만 있는 항목은 "확인 필요"로 표시했다.

---

## 1. 기술 경로 비교 — HTML5/Canvas 게임을 Steam에 패키징하는 방법

RIPOSTE는 빌드 과정이 없는 순수 정적 HTML/JS다. Steam은 실행 파일(.exe 등) 배포가 기본이므로,
웹 게임을 그대로 올릴 수 없고 **데스크톱 래퍼**로 감싸야 한다.

| 경로 | 정체 | 빌드 크기(대략) | 게임 성능 | Steamworks 연동 | 실사례 | 리스크 |
|---|---|---|---|---|---|---|
| **Electron** | Chromium + Node.js 번들 | ~100~200MB (macOS 실측 92MB) [1] | Chromium 엔진 그대로 → 최고 (Canvas/WebGL 풀 성능) [2] | **공식 지원** — `steamworks.js`(npm, 주간 다운로드 활발) [3][4], 구형 `Greenworks`(8년+ 미갱신, 커뮤니티 포크로 명맥 유지) [5] | Cookie Clicker(Steam판, Electron 래퍼 + achievement 무결성 보호용 sandbox) [6][7] | 빌드 용량 큼, CUPS 의존으로 **Steam Linux Runtime(SteamOS 컨테이너) 안에서 직접 구동 불가** 사례 보고(Valve 공식 이슈) [8] |
| **NW.js** | Chromium + Node.js, DOM·Node API 단일 컨텍스트 | Electron과 유사(대형) [2] | Electron과 동급 | **공식 지원** — `Greenworks` 원 설계 대상 [5] | CrossCode(impact.js 기반 100% HTML5, Steam 출시 후 컴파일 방식으로 Switch 이식) [9][10] | Electron 대비 생태계·문서·채용 풀이 작음 [2] |
| **Tauri** | OS 기본 WebView(WebKit/WebView2) + Rust 셸 | ~3~10MB (Electron 대비 20~50배 작음, RAM도 대폭 절감) [11][12] | **WebKit 계열은 Chromium 대비 그래픽/WebGL 성능이 낮음** — 특히 Canvas 집약적 게임에는 불리 [2][11] | **비공식 — Steam 배포용 주요 라이브러리(steamworks.js/Greenworks)가 Electron·NW.js만 공식 지원** [2] | 게임 사례 희소(주로 유틸리티 앱) | Steam 통합을 직접 FFI로 구현해야 함, WebView 버전 편차(OS마다 렌더링 차이) |
| **PWA(가장 가벼운 대안)** | 브라우저 자체 "앱으로 설치" | 사실상 0 | 브라우저와 동일 | 없음(스토어 무관 개념) | — | Steam 등록 자체가 불가 — 참고용일 뿐 실제 경로 아님 [2] |

**결론(기술 경로)**: RIPOSTE처럼 순수 Canvas 렌더링 게임을 Steam에 내려면 **Electron + steamworks.js**가 사실상 유일한 실전 검증 경로다.
Tauri는 빌드 용량은 매력적이지만 (a) Steamworks 연동 라이브러리가 공식 지원하지 않고 (b) WebGL/Canvas 성능이 떨어져
액션 게임(패리 타이밍 중요)에는 리스크가 크다[2][11]. RIPOSTE는 빌드 시스템이 없으므로 Electron 래퍼는
"기존 `index.html`을 그대로 담고 Node 통합만 끄는" 수준의 얇은 셸로 구현 가능 — 게임 코드 자체를 고칠 필요는 없다.

### "브라우저 게임 포팅" 리뷰 스티그마
직접적으로 "Flash 게임 같다"는 식의 낙인이 찍힌 사례를 특정하지는 못했으나, 다음 정황이 확인된다:
- Steam 커뮤니티에는 브라우저 기반/모바일 이식 게임에 대한 회의적 시선이 존재한다 — "아직 기술이 안 됐다"는 인식 [13].
- 성공한 HTML5 출신 게임들(Vampire Survivors, CrossCode)은 모두 **Steam 출시 전후로 네이티브 엔진(Unity, 컴파일된 C++)으로
  전환**했다는 공통점이 있다 — Vampire Survivors는 수천 개 엔티티 처리 한계로 Phaser→Unity 이관[14][15],
  CrossCode는 Switch 이식을 위해 JS를 C++로 AOT 컴파일[10]. 즉 "브라우저에서 왔다"는 사실 자체보다
  **PC/콘솔 수준 성능을 실제로 내는지**가 리뷰·이식 성패를 갈랐다.
- Kingdom Rush는 Flash 원작이지만 Steam판은 처음부터 Unity/C#으로 새로 작성했다(HTML5 경유 없음)[16].
- Bloons TD 6는 애초 Unity로 개발되어 모바일→Steam으로 확장된 사례로, HTML5 경로와 무관하다[17].

RIPOSTE에 대한 시사점: 보스 8종·10~20분 분량의 경량 게임이라 Vampire Survivors식 "엔티티 폭증" 문제는 없을 가능성이 높지만,
**Steam Deck을 포함한 실제 성능 실측(프레임 페이싱)**은 출시 전 검증이 필요하다(§2 참고).

---

## 2. Steam 기능 최저선 체크리스트

| 항목 | 기대치 | 근거 | RIPOSTE 현재 |
|---|---|---|---|
| **컨트롤러/게임패드 지원** | Steam Input 완전 지원, 메인 메뉴부터 컨트롤러만으로 네비게이션 가능해야 Deck Verified 통과. 키보드 전용 액션 게임에 대해 "컨트롤러 지원 없인 안 산다"는 반발이 흔함(개발자 커뮤니티 공개 촉구 사례)[18]. 단, "컨트롤러 지원은 필수 아니다"는 반박 스레드도 존재(장르·타겟에 따라 갈림, 확인 필요: 액션 장르에서 실제 판매 영향 정량 데이터는 못 찾음)[19] | [18][19][20] | **×** — `js/input.js`에 gamepad 코드 없음, 키보드 전용이 기획 의도 |
| **Steam Deck Verified** | 4대 기준: ①컨트롤러 완전 지원 + 정확한 입력 아이콘 ②텍스트 최소 9px(1280×800 기준, 12px+ 권장)+대비 ③기본 해상도(1280×800/1280×720) 대응 및 플레이 가능한 기본 그래픽 설정 ④런처 有 시 컨트롤러 네비게이션 가능[20][21] | [20][21] | **× (미검증)** — 960×540 고정 해상도는 레터박스 스케일이라 원칙적으로 대응되나, 텍스트 크기·컨트롤러 요건 둘 다 미충족 |
| **업적(Achievements)** | 2025년 기준 플레이어들이 "당연히 있는 기능"으로 인식하기 시작함(baseline expectation)[22] | [22][23] | **×** — 없음. Steamworks API(`ISteamUserStats`)로 비교적 저비용 구현 가능[23] |
| **클라우드 세이브** | 업적과 함께 baseline 기대 항목으로 언급[22] | [22] | **×** — localStorage만 사용(기기 종속). Steam Cloud는 파일 동기화만 설정하면 되어 구현 비용 낮음 |
| **리더보드** | 필수는 아니나 스킬 기반 게임(패리 타이밍 등)에는 재플레이 동기 부여로 자연스러운 매치 — Steamworks가 API 기본 제공[24] | [24] | **× (권장)** — 트라이 수 기록은 로컬에 있으나(최근 커밋) 글로벌 리더보드 없음 |
| **Rich Presence** | 선택 기능. 구현 여부는 개발자 재량이며 "필수"로 요구되는 사례는 확인 안 됨[25][26] | [25][26] | **×** — 필수 아님, 우선순위 낮음 |
| **옵션 메뉴 — 해상도/풀스크린** | 없음(RIPOSTE는 창 크기와 무관한 레터박스 스케일 설계) — 다만 "풀스크린 토글"은 CLAUDE.md에 명시적으로 "없음"으로 기재된 현재 설계 | 프로젝트 CLAUDE.md 명시 | **×(설계상 의도적 제외)** — 상용화 시 최소한 풀스크린 토글은 재검토 필요 |
| **옵션 메뉴 — 볼륨/음소거** | Steam 상용 게임 최저선 관행(수치 확인은 출처 없음, 업계 관행으로 통용) | 확인 필요(업계 통념) | **△** — on/off 뮤트 토글은 있음(`RAudio.setMuted`), 슬라이더형 볼륨 조절 없음 |
| **키 리바인드** | CLAUDE.md에 "옵션 메뉴·키 리바인드 없음"으로 명시된 현재 설계 | 프로젝트 CLAUDE.md | **×** — 없음. 키보드 전용 게임에서 리바인드 부재는 접근성 이슈로 지적될 수 있음 |
| **접근성 옵션(색맹 모드·자막)** | Steam 공식 가이드는 색상만으로 정보를 전달하지 말 것을 권고하며(모양/패턴/텍스트 병행), 색맹 프리셋 제공 시 개별 색상 커스터마이즈도 권장[27][28]. 2026년 인디 쇼케이스 출품작 다수가 3종 색맹 모드 + 한손 조작 옵션을 기본 탑재[29] | [27][28][29] | **×** — 없음. 패리 타이밍은 색상보다 애니메이션/타이밍 신호에 의존하는 것으로 보이나(코드 미검토 완료) 확인 필요 |

---

## 3. 가격·길이·리뷰 관계

- **길이별 가격 관행(2026 가이드 기준)**: 3~4시간 이하 게임은 **$7.99~$9.99**, 6~15시간 폴리시드 인디는 **$14.99~$19.99**가
  "강한 기본값"으로 제시된다[30]. RIPOSTE(1회 10~20분, 8보스 클리어까지 총 플레이타임은 재도전 포함 수 시간 예상되나 확인 필요)는
  전자 구간에 해당할 가능성이 높다.
- **가격은 품질의 대리 신호로 쓰인다**: 동일 게임이라도 $19.99 표기가 $4.99보다 "더 고품질"로 인식된다는 관찰이 있다[31].
  즉 너무 낮은 가격 자체가 "이 게임은 별로다"라는 신호로 오독될 위험이 있다(정량 데이터는 못 찾음, 확인 필요).
- **"가격 대비 짧다" 리뷰가 나오는 구체 시간/가격 조합**: 명확한 임계값(예: "N시간 미만+M달러 이상이면 반드시 이런 리뷰가 나온다")을
  제시하는 출처는 찾지 못했다 — **확인 필요**. 다만 짧은 게임/바이럴 co-op 컨셉은 $7.99~$9.99 구간에서 성립한다는 관찰은 있다[30].
- **위시리스트 → 판매 전환율**: 2026년 벤치마크로 **출시 첫 주 전환율 10~25%, 생애 전체 20~40%**가 통용 수치로 제시된다[32][33].
  가격이 $10 이상이면 전환율이 낮은 쪽(10~15%)으로 수렴하는 경향, 25,000+ 위시리스트 보유 게임은 15% 근방[32][33].
  10,000 위시리스트 → 첫 주 1,500~2,500건 판매라는 경험칙도 제시된다[32].
- **Steam Next Fest**: 데모를 페스티벌 종료 후에도 유지한 게임은 이후 몇 달간 위시리스트가 20~30% 더 늘었다는 관찰이 있다[34].
  2026년 6월 행사는 역대 최대 규모(4,382~4,931개 데모)로, 경쟁이 치열해지는 추세다[35].
- **할인 관행**: 이번 조사에서 정량 데이터(할인율·주기 표준)는 확보하지 못함 — **확인 필요**.

---

## 4. 스토어별 요약표

| 스토어 | 수수료 | 진입 장벽 | 도달률/특징 | RIPOSTE 적합성 |
|---|---|---|---|---|
| **Steam** | 30%(누적 $10M↑ 25%, $50M↑ 20%)[36] + **게임당 $100 제출 수수료**(첫 $1,000 매출 후 환급/기부 처리)[36] | 중간 — $100 수수료가 "저효과 프로젝트 필터" 역할[36] | 압도적 최대 시장, 개인화 발견 큐 보유하나 기존 트랙션 있는 게임에 유리한 알고리즘[36] | Electron 래퍼 필요(§1). 가장 유력한 1차 타겟 |
| **itch.io** | 개발자가 직접 설정(기본 90/10, 자유 조정 가능)[36] | 매우 낮음 — 무료 등록, 몇 분 내 업로드[36] | 게임잼이 핵심 발견 경로. 전체 인디 매출 기여도는 1~5% 수준(상대적으로 작음)[36] | **이미 배포 중인 원채널**. Steam과 병행 가능(§6 가격 정합성 이슈 주의) |
| **Epic Games Store** | 첫 $1M/제품/연 **100%**, 이후 88/12[37][38] | 높음 — 수동 큐레이션, 전 제출물 개별 검토[38] | MAU 7,800만(2025.12 기준)[37], "Epic First Run"은 6개월 100% 수익 인센티브[38] | 큐레이션 통과가 관건. 기술 경로는 Steam과 동일(Electron) |
| **GOG** | 확인 필요(표준 수수료 공개 안 됨) | 높음 — 비공개 큐레이션 기준, 높은 거절률. 제작 완성도·기존 화제성 선호[39] | 전체 인디 매출 기여 3~12%[36], DRM-free 오프라인 인스톨러 요구[39][40] | 소규모 타이틀엔 진입 난도 높음 |
| **Nintendo Switch eShop** | 확인 필요 | 매우 높음 — **HTML5 네이티브 지원 없음**[41]. CrossCode 사례처럼 JS→C++ AOT 컴파일 등 포팅 파트너 필요[10]. Nintendo는 인디 파트너를 선별적으로 고른다[42] | 콘솔 인증(Lot Check) 추가, 개발키트 수백 달러~[43][44][45] | RIPOSTE 규모로는 포팅 비용 대비 수익성 낮음 — 후순위 |
| **모바일(프리미엄)/Apple Arcade** | 확인 필요 | Apple Arcade는 초청/계약 기반(Bleak Sword는 최초 Arcade 독점, 이후 DX로 Switch/PC 확장)[46][47] | 구독형 모델 — 개별 판매 아님 | 키보드 전용 액션은 터치 재설계 필요 — 별도 프로젝트 규모 |
| **콘솔 인증(공통, PS/Xbox/Switch)** | 인증 제출 자체에 $10K~$50K 수준 비용 언급, 실패 시 재제출로 4~8주 큐 리셋 + 약 15% 추가 비용[44] | 매우 높음 | Sony=TRC, MS=XR, Nintendo=Lot Check로 각기 다른 기술·콘텐츠 심사[43][44] | 현재 규모에서는 비현실적 |

---

## 5. 로컬라이즈 판단

- **Steam 언어 구성 변화**: 2024년 중국어(간체)가 영어를 제치고 Steam 최대 사용 언어가 되었고(33.7% vs 33.5%)[48],
  2026년 3월 기준 영어가 다시 39.09%로 1위를 탈환했다(중국 신년 기간 중국어가 일시 50%+ 급등했던 변동 이후)[49].
  즉 **영어와 중국어 간체가 Steam 이용자 언어의 양대 축**이다.
- **리뷰 감정의 언어별 편차**: 가장 긍정적 리뷰 비중이 높은 언어는 스페인어·포르투갈어·루마니아어·베트남어·인도네시아어이고,
  가장 낮은 쪽은 일본어·중국어·한국어 사용자 리뷰라는 관찰이 있다[49]. Steam은 언어별 평점(전체 2,000건+·해당 언어 200건+ 시 노출)을
  2025년경 도입했다[49][50].
  → RIPOSTE처럼 **한국어 스토리를 포함한 게임이 한국 유저 리뷰를 받을 경우, 같은 게임이라도 언어별 평점이 갈릴 수 있음**을
  전제해야 한다.
- **로컬라이즈가 매출에 미치는 영향(사례 기반)**: 영어만 지원했던 한 코지 파밍 시뮬은 18개월간 $27K 매출에 그쳤으나
  5개 언어 로컬라이즈 이후 6개월간 $189K 추가 매출을 기록했다는 사례가 있다[51]. 완전 로컬라이즈된 게임은 비영어권에서
  평균 40% 더 많은 위시리스트를 받는다는 관찰도 있다[51]. **영어권 매출은 전체 게임 시장의 약 30%에 불과하고 나머지 70%는
  비영어권**이라는 업계 추정이 있다[51](추정치의 원출처는 명확히 확인 안 됨 — 확인 필요).
- **로컬라이즈 비용(텍스트 소량 게임 기준)**: 전문 번역 단가는 단어당 $0.10~$0.30(언어쌍에 따라, 동아시아 언어는 상단에 가까움)[52].
  소규모 인디(5,000~20,000단어, 1개 언어)는 $500~$5,000 수준[52]. **텍스트가 적은 게임은 최소 $2,000 선까지도 가능**하다는
  범위 제시가 있다[52].
- **"스토어 페이지 영어 필수" 여부**: Steamworks 공식 문서는 "스토어 페이지 로컬라이즈와 게임 내 로컬라이즈는 독립적으로 운영 가능하며
  둘 다 지원하는 것이 이상적"이라고만 안내할 뿐, **영어 필수를 명시한 공식 조항은 이번 조사에서 확인하지 못했다**[53].
  커뮤니티 답변 중 "영어는 어떤 Steam 게임 페이지에도 필요하다"는 개발자 발언이 있었으나 공식 문서 근거는 아니다 — **확인 필요**.

**RIPOSTE에 대한 판단**: UI 텍스트는 이미 영어이므로 스토어 페이지 자체는 영어로 작성 가능 — 추가 번역 부담 없음.
문제는 **스토리 대사가 한국어 전용**이라는 점이다. 액션 코어 루프(패리·회피)는 텍스트 의존도가 낮아 언어 장벽이 크지 않지만,
스토리를 세일즈 포인트로 내세운다면 최소 영어 자막 정도는 번역 비용이 크지 않다(텍스트량이 적은 편이라 $2,000 선 이하로
추정 가능하나 실제 대사 분량 집계는 확인 필요). **필수는 아니나, 스토리 요소를 마케팅에 쓸 계획이라면 권장**.
중국어 간체는 Steam 최대 사용자층 중 하나이므로 반응이 좋으면 2차 로컬라이즈 후보로 고려할 만하다.

---

## 6. 출시 형태 — Early Access vs 정식, 무료→유료 전환

- **Early Access 통계**: 약 80%의 Steam Early Access 타이틀이 정식 출시(1.0)까지 도달한다는 수치가 있다[54].
  다만 2014~2017년 초기에는 완성 의지 없는 프로젝트가 다수 유입되어 신뢰도 문제가 있었다는 역사적 맥락도 있다[54][55].
- Early Access 장점: 초기 판매로 개발 자금 확보, 실플레이어 피드백으로 밸런스 조정[54][55][56]. 단점: 첫 인상에서
  신뢰를 못 얻으면("120분 안에 증명해야") 이후 회복이 어렵다는 관찰[55].
- RIPOSTE는 보스 8종·10~20분 분량으로 **콘텐츠가 이미 완결된 소품 게임**에 가깝다 — Early Access보다는
  **정식 출시가 더 자연스러운 형태**로 판단된다(확장 계획이 있다면 예외).
- **무료 웹판 + 유료 Steam판 병행**: 전례가 있다.
  - Vampire Survivors: 2021년 3월 itch.io에서 **무료 브라우저판**으로 출시("데모에 가까운" 취급, 진행 저장 가능)[57][58],
    같은 해 12월 Steam Early Access $2.99로 유료 출시, 2022년 10월 1.0 시점 $4.99로 인상[57].
    브라우저판은 이후에도 남아있었다.
  - "her tears were my light"(HTML5 브라우저 게임) 사례: Steam에 보너스 콘텐츠를 추가해 유료 출시했으나,
    **Steam 가격 정합성 정책 때문에 itch.io에서 더 싸게 팔 수 없게 되어**, 대신 **무료 웹판을 별도로 유지**해
    돈이 없는 유저도 접근 가능하게 하고 다운로드판(유료, 풀 콘텐츠)은 가격을 맞췄다는 사례가 있다[59].
  - Cave Story: 원작 프리웨어가 지금도 무료로 남아있고, 리마스터판만 Steam 유료 판매[54](직접 출처는 확인 필요하나 널리 알려진 사례).
- **Steam 가격 정합성(Most-Favored-Nation) 이슈**: Valve의 공식 배포 계약서에는 가격 동일화가 명문화되어 있지 않지만,
  실제로는 계정 매니저를 통해 "다른 곳에서 더 싸게 팔지 말라"는 요구가 전달되고 미준수 시 노출 페널티가 있다는 소송 주장이
  존재한다(2026년 진행 중인 반독점 소송 다수)[60][61]. → **RIPOSTE가 무료 웹판을 유지하는 것 자체는 문제없지만,
  "웹판은 무료, Steam판은 유료"인 지금 구조에서 Steam판에만 추가 콘텐츠(보너스 챕터 등)를 얹는 방식이
  가장 안전한 절충안**으로 보인다(가격을 다르게 매기지 않고 콘텐츠 차등화).

---

## 7. RIPOSTE 상용화 작업 목록 (10개 이내)

1. **관찰**: Steam 배포에 필요한 Steamworks 연동 라이브러리(steamworks.js/Greenworks)는 Electron·NW.js만 공식 지원하고,
   빌드가 없는 RIPOSTE는 현재 실행 파일 형태가 아니다[2][3][5].
   **RIPOSTE 현재**: 빌드 없음, GitHub Pages 정적 호스팅뿐.
   **필요한 것(필수)**: Electron 래퍼 + steamworks.js 통합 셸 신규 작성(게임 코드 자체는 무수정 가능).

2. **관찰**: Steam Deck Verified는 텍스트 9px 이상(1280×800 기준)·컨트롤러 완전 대응을 요구한다[20][21].
   **RIPOSTE 현재**: 960×540 고정 해상도 레터박스 스케일, 컨트롤러 코드 없음.
   **필요한 것(필수, Deck 인증을 노린다면)**: 텍스트 크기 실측 검증 + 게임패드 입력 지원 추가.

3. **관찰**: 컨트롤러 미지원 액션 게임에 대한 플레이어 반발이 반복 관찰되나, 반례(컨트롤러 불필요론)도 존재해 절대 규칙은 아니다[18][19].
   **RIPOSTE 현재**: 키보드 전용이 기획 의도(패리 타이밍 특화).
   **필요한 것(권장)**: 최소 Steam Input을 통한 키보드 매핑 노출(네이티브 게임패드 구현 없이도 Steam이 자동 매핑 지원 가능한지 확인 필요) 또는 스토어 페이지에 "키보드 전용" 명시로 기대치 사전 관리.

4. **관찰**: 2025년 기준 업적·클라우드 세이브는 Steam 플레이어의 baseline 기대 기능으로 자리잡았다[22].
   **RIPOSTE 현재**: 둘 다 없음(localStorage만).
   **필요한 것(필수)**: Steamworks 업적 API 연동(보스 8종 클리어·챕터 완주 등 자연스러운 후보 존재) + Steam Cloud 세이브 동기화.

5. **관찰**: 옵션 메뉴 최저선(볼륨 슬라이더·풀스크린·키 리바인드)이 상용 게임 관행으로 통용되나 RIPOSTE는 현재 on/off 뮤트뿐이고
   풀스크린·리바인드는 CLAUDE.md에 명시적으로 "없음"이라 기재돼 있다.
   **RIPOSTE 현재**: 뮤트 토글만 존재, 옵션 메뉴 없음.
   **필요한 것(필수)**: 최소 볼륨 슬라이더 + 풀스크린 토글. 키 리바인드는 권장(접근성 관점에서 특히).

6. **관찰**: Steam 공식 접근성 가이드는 색상 단독 신호 금지·색맹 모드를 권고하며, 2026년 인디 쇼케이스 다수가 이를 기본 탑재했다[27][28][29].
   **RIPOSTE 현재**: 접근성 옵션 없음(패리 신호가 색상에 의존하는지는 코드 확인 필요).
   **필요한 것(권장)**: 색맹 모드/고대비 옵션 또는 패리 신호가 이미 형태·타이밍 기반임을 확인 후 문서화.

7. **관찰**: 스토리 대사가 한국어 전용이면 Steam 최대 사용자층 중 하나인 영어권에 스토리 요소가 전달되지 않는다.
   UI는 이미 영어라 큰 장벽은 아니지만, 텍스트량이 적은 게임의 로컬라이즈 비용은 $2,000 선까지 낮아질 수 있다[52].
   **RIPOSTE 현재**: 스토리 한국어 전용, UI만 영어.
   **필요한 것(권장, 필수 아님)**: 스토리 대사 영어 자막 최소 지원 — 스토리를 마케팅 포인트로 쓸 경우 권장도 상승.

8. **관찰**: 1~3시간 스킬 게임은 $7.99~$9.99가 강한 기본값으로 제시된다[30]. RIPOSTE 실플레이타임(재도전 포함 총량)이
   이 구간에 맞는지 데이터가 없다.
   **RIPOSTE 현재**: 가격 미정, 실측 플레이타임 데이터 없음.
   **필요한 것(필수)**: QA 실측으로 평균 완주 시간 수집 후 $7.99~$9.99 구간 내 확정, 근거로 스토어 페이지에 명시.

9. **관찰**: Steam 판매는 위시리스트 축적이 선행돼야 하고(첫 주 전환율 10~25%[32][33]), Next Fest 데모 유지 게임은
   위시리스트가 20~30% 더 늘었다[34].
   **RIPOSTE 현재**: 위시리스트·데모·Next Fest 참가 계획 없음(현재는 완성 무료 게임을 그대로 공개 중).
   **필요한 것(필수)**: Steam 페이지를 먼저 개설해 위시리스트 축적 기간 확보 + Next Fest 데모 출품 검토.

10. **관찰**: 무료 웹판과 유료 Steam판을 병행한 전례(Vampire Survivors, her tears were my light)가 있으나,
    Steam의 가격 정합성 요구 때문에 "다른 곳에서 더 싸게" 파는 것은 리스크가 있다[59][60][61].
    **RIPOSTE 현재**: GitHub Pages에 완전한 무료 버전이 이미 공개돼 있고 챕터 2까지 포함.
    **필요한 것(필수, 의사결정)**: (a) 웹판을 무료로 유지하되 Steam판에만 보너스 콘텐츠(신규 챕터·보스 등)를 얹어 차등화하거나,
    (b) 웹판을 데모/일부 챕터로 축소하고 풀버전을 Steam 유료로 분리 — 가격 자체를 다르게 매기는 방식은 피할 것.

---

## 8. 출처 목록

1. dev.to, "Electron vs Tauri: 120MB vs 8MB. Here's What Changed" — https://dev.to/royce_fabbd83cb268312e928/electron-vs-tauri-120mb-vs-8mb-heres-what-changed-218a
2. webgamedev.com, "Desktop" 배포 가이드 — https://www.webgamedev.com/publishing/desktop
3. npm, steamworks.js — https://www.npmjs.com/package/steamworks.js
4. GitHub, ceifa/steamworks.js — https://github.com/ceifa/steamworks.js/
5. GitHub, greenheartgames/greenworks — https://github.com/greenheartgames/greenworks
6. Steam, Cookie Clicker 스토어 페이지 — https://store.steampowered.com/app/1454400/Cookie_Clicker/
7. PCGamingWiki, Cookie Clicker — https://www.pcgamingwiki.com/wiki/Cookie_Clicker
8. GitHub, ValveSoftware/steam-runtime Issue #579(Electron/CUPS) — https://github.com/ValveSoftware/steam-runtime/issues/579
9. TCRF, CrossCode — https://tcrf.net/CrossCode
10. Siliconera, "CrossCode Interview: Radical Fish Games on Console Ports" — https://www.siliconera.com/crosscode-interview-radical-fish-games-on-console-ports-and-whats-next/
11. tech-insider.org, "Tauri vs Electron 2026" — https://tech-insider.org/tauri-vs-electron-2026/
12. rustify.rs, "Tauri vs Electron 2026" — https://rustify.rs/articles/rust-tauri-vs-electron-2026
13. Steam Community, Eldevin 토론("Browser based game in steam? Seriously?") — https://steamcommunity.com/app/298160/discussions/0/620696934084453212/
14. Wikipedia, Vampire Survivors — https://en.wikipedia.org/wiki/Vampire_Survivors
15. GamingOnLinux, "Vampire Survivors switching to new game engine" — https://www.gamingonlinux.com/2023/07/vampire-survivors-switching-to-new-game-engine-on-august-17/
16. Ironhide Game Studio, "An Open Love Letter to our PC Fans" — https://www.ironhidegames.com/News/Details/101
17. Wikipedia, Bloons TD 6 — https://en.wikipedia.org/wiki/Bloons_TD_6
18. GameSpew, "Developers: For the love of god, put controller support in your games" — https://www.gamespew.com/2024/07/developers-put-controller-support-in-your-games/
19. Steam Community, Escape From Duckov 토론("Hot Take: Controller Support is a Non-Issue") — https://steamcommunity.com/app/3167020/discussions/0/596289845780890112/
20. Steamworks 공식 문서, "Steam Deck and Steam Machine Compatibility Review" — https://partner.steamgames.com/doc/steamhardware/compat
21. gamineai.com, "Steam Deck Verified Review in 2026 - 9 Submission Fails" — https://gamineai.com/blog/steam-deck-verified-review-2026-submission-fails-small-team-builds
22. indielaunchlab.com, "20K+ Games Launched on Steam in 2025" — https://indielaunchlab.com/blog/20k-games-launched-on-steam-in-2025-what-the-data-reveals-about-your-competition
23. Steamworks 공식 문서, "Stats and Achievements" — https://partner.steamgames.com/doc/features/achievements
24. Steamworks 공식 문서, "Steam Leaderboards" — https://partner.steamgames.com/doc/features/leaderboards
25. Steamworks 공식 문서, "Enhanced Rich Presence" — https://partner.steamgames.com/doc/features/enhancedrichpresence
26. Grid Sage Games, "Steam Rich Presence"(Cogmind 개발기) — https://www.gridsagegames.com/blog/2019/11/steam-rich-presence/
27. Steam Community 가이드, "Accessibility Guide" — https://steamcommunity.com/sharedfiles/filedetails/?id=2970275150
28. Steamworks 공식 문서, "Accessibility Features" — https://partner.steamgames.com/doc/accessibility_features
29. gamineai.com, "20 Free Accessibility Guidelines & Plugins for Games (2026 Edition)" — https://gamineai.com/resources/20-free-accessibility-guidelines-plugins-games
30. gtstu.com, "How to Price Your Indie Game on Steam (2026 Guide)" — https://gtstu.com/steam-indie-game-pricing-strategy/
31. howtomarketagame.com, "Are indie games too cheap?" — https://howtomarketagame.com/2022/08/17/are-indie-games-too-cheap/
32. steamforecast.app, "Steam Wishlist Conversion Rate: 10–25% Launch Week (2026 Benchmarks)" — https://steamforecast.app/guides/steam-wishlist-conversion-rate
33. Immutable, "What's the average Steam wishlist conversion rate in 2026?" — https://www.immutable.com/insights/steam-wishlist-conversion-rates
34. entaltostudios.com, "Steam Next Fest: How to Boost Visibility" — https://entaltostudios.com/steam-next-fest-how-maximize-visibility/
35. tech-insider.org, "Steam Next Fest June 2026: 4,200+ Demos Mark Record Event" — https://tech-insider.org/steam-next-fest-june-2026/
36. fungies.io, "Steam vs Itch.io for Indie Developers: Complete Platform Comparison 2026" — https://fungies.io/steam-vs-itch-io-indie-developers/
37. tech-insider.org, "Epic Games Store 2026: 78M MAU Record, 100% Dev Revenue Share" — https://tech-insider.org/ca/epic-games-store-2026-canada/
38. Epic Games Store 공식 뉴스, "Epic Games Store Updates Revenue Share" — https://store.epicgames.com/en-US/news/epic-games-store-updates-revenue-share-keep-100-of-the-first-1m-per-product-per-year
39. GOG, 인디 제출 폼 — https://www.gog.com/indie
40. GOG Support Center, "Releasing your game on GOG | FAQ" — https://support.gog.com/hc/en-us/articles/11382878039197-Releasing-your-game-on-GOG-FAQ
41. Construct 포럼, "Nintendo Switch Will Not Support HTML5" — https://www.construct.net/en/forum/construct-3/general-discussion-7/nintendo-switch-not-support-136439
42. Game Developer, "Here's how Nintendo chooses its indie partners on Switch" — https://www.gamedeveloper.com/business/here-s-how-nintendo-chooses-its-indie-partners-on-switch
43. gamestudio.n-ix.com, "Console certification process and releasing a game on PlayStation, Xbox, and Switch" — https://gamestudio.n-ix.com/console-certification-process-and-releasing-a-game-on-playstation-xbox-and-switch-what-you-should-know/
44. GameDev.net 포럼, "Pricing for publishing on different platforms?" — https://gamedev.net/forums/topic/667941-pricing-for-publishing-on-different-platforms/
45. gamedo.live, "How to Port Your Indie Game to Consoles in 2026" — https://gamedo.live/news/how-to-port-indie-game-consoles-2026/
46. Wikipedia, Bleak Sword — https://en.wikipedia.org/wiki/Bleak_Sword
47. DualShockers, "Apple Arcade Exclusive Bleak Sword DX Is Coming To PC And Switch" — https://www.dualshockers.com/bleak-sword-dx-releases-switch-pc/
48. gamedevreports.substack.com, "Valve: Chinese language surpassed English in popularity on Steam in 2024" — https://gamedevreports.substack.com/p/valve-chinese-language-surpassed
49. PC Gamer, "Steam launches 'language-specific' review scores" — https://www.pcgamer.com/games/steam-launches-language-specific-review-scores-because-customers-in-different-regions-of-the-world-may-have-vastly-different-experiences-from-each-other-for-the-same-game/
50. games.alphacrc.com, "Investigating Steam's new language-specific review scores" — https://games.alphacrc.com/investigating-steams-new-language-specific-review-scores/
51. LCP Localizations, "The Real ROI of Game Localization" — https://lcplocalizations.com/the-real-roi-of-game-localization-a-deep-dive-into-game-discovery-and-sales/
52. Transphere, "Game Localization Costs (2026)" — https://www.transphere.com/game-localization-costs/
53. Steamworks 공식 문서, "Localization and Languages" — https://partner.steamgames.com/doc/store/localization
54. GameMaker.io, "Must-Know Pros And Cons of Early Access Games" — https://gamemaker.io/en/blog/early-access-games
55. jaleopr.com, "Steam Early Access: Pros, cons, risks, and opportunities" — https://jaleopr.com/blog/steam-early-access-pros-cons/
56. howtomarketagame.com, "Should you do Early Access?" — https://howtomarketagame.com/2023/07/27/should-you-do-early-access/
57. Wikipedia, Vampire Survivors(가격 변동·Early Access 이력) — https://en.wikipedia.org/wiki/Vampire_Survivors
58. HowToGeek, "Play Hit Viral Game 'Vampire Survivors' for Free" — https://www.howtogeek.com/781765/play-hit-viral-game-vampire-survivors-for-free/
59. itch.io devlog, "her tears were my light" 웹 버전 공지 — https://itch.io/devlog/617542/web-version-available.amp
60. Rain Intelligence, "How Price Parity Clauses Became the Common Thread in Antitrust Cases" — https://www.rainintelligence.com/blog/price-parity-mfn-clause-antitrust
61. gamediscover 뉴스레터, "Does Steam 'price fix', and does that make them an unfair monopoly?" — https://newsletter.gamediscover.co/p/does-steam-price-fix-and-does-that

### 조사 중 확보하지 못한 항목 (확인 필요로 남긴 것)
- "가격 대비 짧다" 리뷰가 나오는 정확한 시간/가격 임계값 정량 데이터
- Steam 표준 할인 주기·할인율 관행의 정량 출처
- Steam 스토어 페이지 영어 콘텐츠 의무 여부의 **공식** 근거(공식 문서에서는 확인 못함, 커뮤니티 답변만 존재)
- GOG·Switch eShop·모바일/Apple Arcade의 정확한 수수료율
- RIPOSTE 자체의 실측 완주 플레이타임(QA 데이터 미존재)
- "영어권 매출 30% vs 비영어권 70%" 추정치의 1차 출처
