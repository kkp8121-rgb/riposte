# RIPOSTE 레퍼런스 리서치 D — 타이밍 판정·리듬 전투·게임 필·접근성

> 조사일: 2026-09-18. 대상: RIPOSTE(itch.io 게임잼 출품작, 바닐라 JS + Canvas 2D, 사이드뷰 1:1 보스러시 패리 듀얼).
> 원칙: 추측 금지. 출처 없는 수치는 "확인 필요"로 표기. 영어 기술 용어(히트스톱·버퍼·프레임 등)는 직역하지 않음.

---

## 1. 판정 창 비교 표

프레임 수치는 특별한 언급이 없으면 60fps 기준. RIPOSTE는 1/120s 고정 스텝 시뮬레이션을 쓰므로 괄호에 120fps 환산도 병기.

| 게임 | 퍼펙트 창 | 일반 가드/블록 창 | 실패 페널티 | 출처 |
|---|---|---|---|---|
| **RIPOSTE (현재)** | 0.18s(≈11f@60, ≈22틱@120) — 키 입력 순간부터 카운트 | 이어서 0.34s 블록 창(총 ≈0.52s 방어 가능 구간) | 헛치면 0.40s 무방비(재입력 불가). 성공 시 재입력 불가 0.10s로 단축 | 프로젝트 스펙(`docs/superpowers/specs/2026-09-09-riposte-design.md`) |
| **Sekiro (deflect)** | 12f(0.2s) 디플렉트 창, 방어 버튼 연타 시 4f~0f까지 축소 | 이어서 13~36f(총 0.6s)가 블록 창 | 창을 벗어나면 일반 블록(자세 피해) 또는 피격 | [Fextralife: Deflection](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection), ["The Truth About Sekiro Parry Frames"](https://www.youtube.com/watch?v=GRdHVXfVbfI) |
| **Elden Ring (Buckler Parry)** | 30fps 기준 4f 스타트업+5f 액티브 → 60fps 환산 약 8~10 액티브 프레임 | 방패마다 다름(버클러가 가장 넓음) | 스타트업/리커버리 중 피격 시 방어와 동일한 스태미나 피해 | [Fextralife: Buckler Parry](https://eldenring.wiki.fextralife.com/Buckler_Parry) |
| **Bloodborne (gun parry)** | 확인 필요 — 정확한 프레임 수 출처 못 찾음. "매직 디스턴스"(적과 대시 1회 거리) 기준으로 타이밍 표준화 | 확인 필요 | 확인 필요(빗나가면 피격) | [Fextralife: Parry](https://bloodborne.wiki.fextralife.com/Parry), [SectorGaming: gun frame-data 비교](https://sectorgaming.blog/best-gun-parrying-bloodborne) |
| **Lies of P (Perfect Guard)** | 8f(≈130ms) | 창을 벗어나면 일반 가드(체력 소모) | 연타 시 ≈30프레임 입력 락아웃 발생, 그동안 패리 불가 | [Steam 토론](https://steamcommunity.com/app/1627720/discussions/0/3887227031494470246/?ctp=2) |
| **Nine Sols** | 0.133s(≈8f@60) 퍼펙트 | 이어서 0.5s까지는 "부정확한(imprecise) 패리" — 피해 50%가 내상(internal damage)으로 전환 | 부정확 패리는 0.6s간 경직. 연타 시 퍼펙트 창이 0.133s→0.1s→0(3회째 무력화)로 축소 | [Switchblade Gaming 가이드](https://www.switchbladegaming.com/action-rpg/parry-timing-guide/) |
| **Metal Gear Rising: Revengeance** | 확인 필요 — 난이도별로 창이 달라진다는 서술만 확인(Revengeance 난이도에서 더 타이트), 정확한 프레임 수 출처 못 찾음 | 확인 필요 | 확인 필요 | [TheGamer 가이드](https://www.thegamer.com/metal-gear-rising-revengeance-beginner-tips-parry-blade-mode/) |
| **Street Fighter III: 3rd Strike (Parry)** | 지상 공격: 10f(방향 유지 시 6f). 공중→지상 피격: 5f. 공중 패리: 7f(유지 시 6f) | 레드 패리(연속 패리): 일반기 3f, 특수기/슈퍼 2f | 패리 성공 시 16f 프리즈(그 안에서 연속 패리·잡기 테크 가능). 실패 시 그대로 피격 | [SuperCombo Wiki](https://wiki.supercombo.gg/w/Street_Fighter_3:_3rd_Strike/System), [3sos-blog 프레임 데이터](https://3sos-blog.tumblr.com/post/7840889745/parry-frame-data) |
| **Street Fighter 6 Perfect Parry** | 확인 필요 — 이번 조사에서 직접 검색하지 못함 | 확인 필요 | 확인 필요 | — |
| **Guilty Gear (Strive) Just Defense** | 2f (피격 시점 기준 앞뒤 2프레임) | 창을 벗어나면 일반 가드 | 확인 필요(넉백 감소 등 이점만 확인, 실패 시 페널티 명시 못 찾음) | [Red Bull 가이드](https://www.redbull.com/ca-en/guilty-gear-strive-how-to-get-started-guide) |
| **Hi-Fi Rush** | 정성적 설계(비트에 맞춘 원 겹침 판정), 정확한 ms 수치 확인 필요 | 확인 필요 | 확인 필요 | [Hi-Fi Rush Fandom: Rhythm Parry](https://hifi-rush.fandom.com/wiki/Rhythm_Parry) |
| **Cuphead (parry)** | ≈0.5s (출처 신뢰도 낮음 — 공식 프레임 데이터 아닌 팬 가이드 추정치, 참고용) | 해당 없음(패리 전용, 가드 개념 없음) | 실패 시 피격 | [ludo.guide](https://www.ludo.guide/guide/cuphead/tips-advanced-strategies/advanced-strategies-techniques/parry-timing-mastery) — ⚠️ 낮은 신뢰도 |
| **Punch-Out!! (Wii)** | 최상급 공략 기준 일부 패턴은 2~3프레임 창(예: Bald Bull 타이틀전 언더컷 카운터 3프레임) | 일반 회피는 여유 있음(정확한 프레임 확인 필요) | 실패 시 피격(스타 소실) | [TASVideos 런](https://tasvideos.org/7295S) |
| **Stellar Blade** | 9f(0.15s) 기본, "Focus Boost" 스킬 +0.04s·"Reflex-Type Exospine" 장비 +0.04s(중첩 가능) | 확인 필요 | 확인 필요 | [Game8 가이드](https://game8.co/games/Stellar-Blade/archives/451200) |
| **The First Berserker: Khazan** | 무기별 기본 150ms(9f@60). 커뮤니티 모드로 500ms(패리)·700ms(리플렉션/카운터)까지 확장 가능(비공식) | 확인 필요 | 확인 필요 | [Steam 토론](https://steamcommunity.com/app/2680010/discussions/0/595145468747471031/) |

**RIPOSTE 위치 판정**: 퍼펙트 0.18s(≈11f@60)는 Sekiro(0.2s)보다 살짝 좁고, Lies of P·Nine Sols·Stellar Blade·Khazan(0.13~0.15s대)보다는 넓다 — 즉 조사한 "정통 소울라이크/액션" 군의 중간~중상 난이도 구간에 위치한다. 이어지는 블록 창 0.34s(총 방어 가능 구간 0.52s)는 Sekiro의 총 0.6s 구조와 가장 유사한 "퍼펙트+완화 구간" 2단 설계다.

---

## 2. 입력 처리 관행

- **"입력 시점부터 창이 열림" vs "타격 시점 기준 ±창"**: 두 방식이 혼재한다. Sekiro·Lies of P는 **가드 버튼을 누르는 순간 그 프레임부터 카운트되는 창**이 열리는 구조로("버튼 누를 때마다 애니메이션 첫 프레임에 창이 생성"), RIPOSTE의 "패리 키 누른 순간부터 퍼펙트 창 0.18s"와 구조적으로 동일하다. 반대로 Nine Sols는 **타격 시점을 기준으로 그 이전 0.133s가 퍼펙트, 그 이전 0.5s까지가 완화 구간**인 식으로 타격 이벤트 기준 역산 창을 쓴다. 전자는 "언제 눌러도 그 순간부터 유예가 시작"이라 선입력에 관대하지 않고, 후자는 "정확히 타격 직전 구간에만 눌러야" 하지만 그 대신 이르게 누른 것도 완화 등급으로 구제된다. ([Lies of P 가이드](https://gamerant.com/lies-of-p-how-to-perfect-guard-parry/), [Nine Sols 가이드](https://www.switchbladegaming.com/action-rpg/parry-timing-guide/))
- **헛침 페널티 길이 관행**: Nine Sols 부정확 패리는 0.6s 경직, RIPOSTE 헛침은 0.40s 무방비 — 같은 자릿수(0.4~0.6s)다. Lies of P·Khazan은 정확한 페널티 길이보다 "연타 시 락아웃"(Lies of P ≈30프레임) 쪽을 더 명확히 문서화하고 있다.
- **연속 패리 시 리커버리 단축 사례**: SF3rd Strike는 패리 성공 시 16프레임 프리즈 동안 다음 패리·잡기 테크를 이어갈 수 있어 사실상 "성공이 다음 방어를 쉽게 만드는" 체인 구조다. Guilty Gear Just Defense도 성공 시 넉백이 줄어 다음 방어가 유리해진다. RIPOSTE의 "성공 시 재입력 불가 0.10s로 단축"은 이 관행과 같은 방향이다.
- **연타(spam) 억제 메커닉**: Sekiro(연타 시 창 축소), Nine Sols(2회 연타 후 창이 0.133s→0.1s, 3회째 완전 비활성화), Lies of P(연타 시 락아웃)가 공통적으로 "막 누르면 손해"인 안티스팸 규칙을 내장한다.
- **초심자 보조(가변 창)**: 네이티브 난이도 옵션으로 패리 창을 넓히는 메뉴 토글은 조사 범위에서 확인되지 않았다. Stellar Blade는 인게임 스킬/장비로 +0.04s씩 누적 확장(빌드 선택), Khazan·Lies of P는 비공식 커뮤니티 모드로만 확장 가능하다 — 즉 이 장르에서 "공식 접근성 옵션으로서의 타이밍 창 확대"는 드물다.
- **코요테 타임·입력 버퍼**: 플랫포머 계열 용어이나 원리는 동일 참조 가능. 코요테 타임(발판을 벗어난 뒤에도 점프를 받아주는 유예, 통상 5~8프레임)과 입력 버퍼(착지 전 미리 누른 입력을 받아주는 유예, 통상 6~9프레임)는 "판정을 가르는 프레임이 눈에 보이지 않되 체감된다"는 설계 철학을 공유한다. 접근성 지향 플랫포머는 이 유예를 120~180ms까지 늘리기도 한다. ([GameJuice 아티클](https://www.gamejuice.co.uk/articles/coyote-time-input-buffering))

## 3. 최소 입력 리듬 전투 레퍼런스

- **One Finger Death Punch**: 좌우 두 버튼만으로 사이드뷰 대결을 처리하며, 판정은 "적과의 거리·방향"으로 결정된다. 핵심은 반응 속도가 아니라 "신호를 읽고 리듬에 올라타는 것" — 난타(버튼 연타)는 오히려 죽는 지름길이라고 개발사가 명시한다. ([Game Developer: 애니메이션 기반 설계](https://www.gamedeveloper.com/design/one-finger-death-punch-and-animation-based-design))
- **Rhythm Heaven**: 개발 총괄 Tsunku의 철학은 "시각적 박자 미터 없이" 순수 콜앤리스폰스로 리듬을 가르친다는 것. "리듬이 몸에 들어오면 이전엔 못 깨던 스테이지를 반복해서 돌파하게 된다"는 발언대로, 게임은 숫자·바를 보여주지 않고 반복 노출만으로 체화시키는 데 집중한다. RIPOSTE의 "플래시→타격 간격이 공격별로 항상 일정"이라는 설계는 이 철학과 정확히 같은 축 위에 있다. ([Wikipedia: Rhythm Heaven](https://en.wikipedia.org/wiki/Rhythm_Heaven))
- **Crypt of the NecroDancer**: "리듬을 최대한 적게 요구하도록 설계된 리듬 게임"이라는 역설적 목표를 표방한다. 모든 적·보스가 음악에 동기화된 엄격한 주기로 움직여 플레이어가 음악적 신호를 체화하도록 강제하지만, 동시에 공정함을 잃지 않게 설계됐다. ([Game Developer 딥다이브](https://www.gamedeveloper.com/audio/game-design-deep-dive-finding-the-beat-in-i-crypt-of-the-necrodancer-i-))
- **Hi-Fi Rush**: 패리는 음악 비트와 함께 시각 신호(분홍/하늘색 원 겹침)로 텔레그래프되고, 일반 공격 대부분은 흔한 게임 문법(예비 동작)만으로도 "첫 시도에" 반응 가능할 만큼 직관적으로 설계됐다고 평가된다. 체력이 낮아진 적은 "리듬 패리 공격(RPA)"이라는 고정 반복 패턴 시퀀스로 유도한다. ([dotesports 가이드](https://dotesports.com/general/news/how-to-parry-in-hi-fi-rush))
- **Furi**: 3단계 난이도(Promenade/Furi/Furier)가 창 크기 자체보다 보스의 공격 패턴을 바꿔 패리를 더 어렵게 만드는 방식으로 난이도를 조절한다 — "판정 수치는 고정, 패턴 복잡도로 난이도 조절"이라는 대안 축.
- **공통 설계 원칙**: 텔레그래프→타격까지 간격이 공격마다 고정될수록 플레이어는 "반응"이 아니라 "리듬 학습"으로 성공률을 올릴 수 있다는 것이 이들 사례의 공통 결론이며, RIPOSTE의 "플래시→타격 시간은 공격별로 항상 일정" 설계 목표와 정확히 부합한다.

## 4. 게임 필(feel) 정전(canon)

- **"The Art of Screenshake" (Jan Willem Nijman, Vlambeer)**: 2013 INDIGO Classes 강연(GDC 정식 세션은 아니나 게임 필 논의에서 가장 널리 인용되는 자료 중 하나). 단순한 2D 슈터 프로토타입에 30개의 작은 트릭(총알 크기·화면 흔들림·타격 정지 등)을 누적 적용하며 "각 변경은 미미하지만 합쳐지면 체감이 완전히 달라진다"를 실연했다. ([INDIGO Classes 영상](https://www.youtube.com/watch?v=AJdEqssNZ-U))
- **"Juice It or Lose It" (Martin Jonasson & Petri Purho, GDC Europe 2012)**: "juicy한 게임은 최소한의 입력에도 연쇄적인 반응과 피드백을 쏟아낸다"를 핵심 명제로, 밋밋한 Breakout 클론에 스쿼시·파티클·트레일·사운드를 실시간으로 얹어 게임 필의 정전급 데모로 남았다. 업계에서 "juice"라는 용어 자체의 출처로 통용된다. ([GDC Vault](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose), [YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg))
- **히트스톱 길이 관행**: Final Fight(1989)는 캐릭터·공격 종류에 무관하게 **6프레임(60fps 기준 0.1s)의 균일한 히트스톱**을 적용한 사례로 자주 인용된다. Street Fighter 2에서는 일반기의 캔슬 가능 구간(원래 5프레임)이 히트스톱으로 인해 체감상 약 10프레임까지 늘어나는 부수 효과가 있었다고 분석된다. 대부분의 격투/액션 게임은 데미지·공격 강도에 비례해 히트스톱을 늘리되 **최대치를 상한선으로 캡**해 과도한 정지를 막는다. ([CritPoints: Hitstop 정리](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/), [Shane Sicienski 블로그](https://shane-sicienski.com/blog/blog-post-title-one-55pmn))
- **RIPOSTE 수치와 비교**: 퍼펙트 패리 히트스톱 0.09s(≈5.4f@60), 리포스트 명중 0.06s(≈3.6f@60), 피격 0.10s(≈6f@60) — 모두 Final Fight의 6프레임(0.1s) 기준선과 같은 자릿수이며, 업계 관행 범위(수 프레임~0.15s 내외)를 벗어나지 않는다. 보스 격파 슬로모(0.25×, 1.4s)·줌(1.15×)은 빈도가 게임당 8회(보스 수만큼)로 제한돼 있어 "juice" 강연들이 경고하는 상시 남용 리스크는 낮다고 판단되나, **"슬로모·줌 남용 경고"에 대한 구체적 정량 인용은 이번 조사에서 확인하지 못했다(확인 필요)** — 일반적으로 game feel 논의에서 반복적으로 등장하는 정성적 경고임을 참고.

## 5. 접근성

- **색약 판별 가능성**: Game Accessibility Guidelines는 "고정된 색 하나만으로 정보를 전달하지 말 것"을 1급 권고로 명시한다. 적록색약(protanopia/deuteranopia)이 남성의 약 8~10%로 가장 흔하며, 청황색약(tritanopia)은 훨씬 드물다. RIPOSTE의 텔 색상 쌍은 **금(노랑)/적**이며, 이는 가장 흔한 적록색약이 취약한 **빨강/초록** 쌍이 아니라는 점에서 상대적으로 안전하다. 다만 가이드라인은 색상 단독 전달 자체를 지양하라고 하므로, RIPOSTE가 이미 갖춘 **오디오 큐(금: 높은 tick, 적: 낮은 thud) 이중화**는 이 권고를 충족하는 방향이다. ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/))
- **광과민성(photosensitive epilepsy)**: 약 4,000명 중 1명이 점멸광에 발작 반응을 보일 수 있다는 통계가 통용된다. 가이드라인상 위험 임계는 대체로 "휘도 10% 이상 변화하는 플래시가 초당 3회를 넘고, 화면의 20~25% 이상을 덮을 때"로 정의된다(단체별로 5초 연속 노출 조건 등 세부는 다름). 고빈도 화면 흔들림도 시각적으로 플래시와 유사한 주파수를 만들어 낼 수 있어 별도 주의 대상이다. ([Xbox Accessibility Guideline 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118), [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/))
- **타이밍 보조 옵션 사례와 하드코어 반응**: Celeste의 Assist Mode(게임 속도·스태미나·에어대시 횟수·무적 등 조정)는 "Cheat Mode"라는 초기 명칭이 심판적으로 들린다는 이유로 개조됐고, 도전과제도 Assist Mode에서 동일하게 해금되도록 유지했다 — "우리에게 도전과제는 지위의 상징이 아니다"라는 개발사 설명이 하드코어 커뮤니티의 반발(도전과제 가치 희석 우려)에 대한 공식 답변이었다. RIPOSTE처럼 판정 수치가 게임의 정체성인 장르에서 옵트인 보조 옵션을 넣을 경우, 이 프레이밍(강제 아님, 성취 훼손 아님)이 참고할 만한 선례다. ([Vice: Celeste Assist Mode 변경](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility/))

## 6. 웹/브라우저 게임 한정 이슈

- **WebAudio 스케줄링**: `AudioContext.currentTime`은 하드웨어 타임스탬프 기반의 고정밀 시계를 제공하며, `setTimeout` 같은 JS 타이머는 메인 스레드 지연에 취약해 오디오 재생 트리거로는 권장되지 않는다. 정석은 **약 100ms 룩어헤드로 재생 시각을 미리 예약**하는 방식이다. RIPOSTE처럼 "플래시와 동시에 오디오 큐"가 판정 학습의 핵심 신호인 경우, 재생 호출이 즉시재생(콜백 내 `start(0)`)인지 룩어헤드 스케줄링인지에 따라 체감 지연이 달라질 수 있다. ([web.dev: A tale of two clocks](https://web.dev/articles/audio-scheduling))
- **rAF 프레임 페이싱**: `requestAnimationFrame`은 디스플레이 주사율에 맞춰 발생하지만, **탭이 백그라운드로 가면 콜백이 아예 멈췄다가 포커스 복귀 시 누적된 거대한 델타 하나를 한 번에 반환**하는 것이 대표적인 브라우저 함정이다. 고정 스텝 시뮬레이션은 이 델타를 반드시 클램프해야 폭주 시뮬레이션(한 번에 수백 틱 처리)을 막을 수 있다.
- **입력 이벤트와 시뮬레이션 정렬**: 키보드 이벤트는 rAF 콜백과 비동기로 발생하므로, 권장 패턴은 **입력을 큐에 타임스탬프와 함께 쌓아두고 고정 스텝 루프가 그 시각 기준으로 소비**하는 것이다. rAF 틱마다 키 상태를 단순 폴링하면 최대 한 프레임(60Hz 기준 ≈16.7ms)까지 판정이 밀릴 수 있는데, 이는 RIPOSTE의 0.18s 퍼펙트 창 기준 약 9%에 해당하는 오차로 무시하기엔 애매한 크기다. ([Isaac Sukin: JS 게임 루프와 타이밍](https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing), [Simplified Media: Fixed Timestep Loops](https://simplified.media/guides/fixed-timestep-loops))

---

## RIPOSTE에 주는 시사점 (10개 이내)

1. **관찰**: Sekiro(0.2s)·Lies of P/Nine Sols/Stellar Blade/Khazan(0.13~0.15s대)와 비교하면 RIPOSTE 퍼펙트 창(0.18s)은 이 레퍼런스 군의 중간~중상 난이도 구간에 위치한다. → **차이**: 없음, 정확히 의도한 "높은 난이도"를 정량적으로 뒷받침하는 위치다. → **제안**: 수치 변경 불필요. 스펙 문서에 이 비교표를 근거로 남겨 향후 밸런스 논쟁 시 참조.

2. **관찰**: Sekiro·Lies of P·Nine Sols는 공통적으로 "연타 시 판정 창이 줄어들거나 사라지는" 안티스팸 규칙을 명시적으로 갖고 있다(Nine Sols는 0.133s→0.1s→비활성화 3단계). → **차이**: RIPOSTE는 헛침 0.40s 무방비로 연타를 억제하지만, 연속 입력 자체에 대한 창 축소 규칙은 스펙상 확인되지 않는다. → **제안**: 현재 헛침 페널티만으로 스팸 억제가 충분한지 QA 실측이 먼저이고, 부족하면 판정 로직 내부 튜닝으로 추가(비목표와 충돌 없음).

3. **관찰**: SF3rd Strike(패리 성공 시 16프레임 프리즈 동안 연속 패리 가능)·Guilty Gear Just Defense(성공 시 넉백 감소로 다음 방어 유리)는 공통적으로 "성공이 다음 방어를 쉽게 만드는" 체인 설계다. → **차이**: RIPOSTE도 성공 시 재입력 불가를 0.10s로 단축해 같은 방향으로 이미 구현돼 있다. → **제안**: 변경 불필요 — 기존 설계가 격투게임 관행과 부합함을 재확인.

4. **관찰**: 조사한 소울라이크 계열(Elden Ring·Khazan·Lies of P) 대부분에 네이티브 "패리 창 확대" 접근성 옵션이 없고 커뮤니티 모드로만 존재한다. Stellar Blade만 인게임 스킬(+0.04s씩 중첩)로 부분 완화를 제공한다. → **차이**: RIPOSTE도 현재 타이밍 접근성 옵션이 없다(`?nofx=1`은 파티클만 제어). → **제안**: 하드코어 난이도 유지가 사용자의 명시적 결정이므로 기본값 변경은 불필요. 다만 옵트인 "판정 창 확대/슬로모 연습 모드" 토글 하나는 새 플레이어 동사를 추가하지 않으므로 비목표와 충돌하지 않는다 — 시간이 허락하면 고려할 선택지로만 제시.

5. **관찰**: Rhythm Heaven(비주얼 미터 없는 콜앤리스폰스)·Crypt of NecroDancer(리듬 최소화 설계)·Hi-Fi Rush(비트 동기 텔레그래프)는 모두 "일정한 간격을 리듬으로 학습시킨다"는 원칙을 공유한다. → **차이**: RIPOSTE의 "플래시→타격 시간이 공격별로 항상 일정"이라는 설계는 이미 이 원칙과 정확히 일치하며 구현도 완료된 상태다. → **제안**: 변경 불필요. 오히려 이 정합성을 스토어 페이지·트레일러 문구에서 "반응 테스트가 아니라 리듬 학습"으로 명시적 셀링 포인트로 쓸 것을 제안(디자인 논의용, 판정 로직과 무관).

6. **관찰**: 업계 히트스톱 관행은 Final Fight의 6프레임(0.1s) 균일 적용을 대표 사례로, 대체로 수 프레임~0.15s 범위에서 상한을 캡한다. → **차이**: RIPOSTE 퍼펙트 패리 0.09s·리포스트 0.06s·피격 0.10s 모두 이 범위 안에 있어 과도하지 않다. → **제안**: 수치 변경 불필요. 근거 문서화만 권장.

7. **관찰(접근성/광과민성)**: 연타 공격 최소 간격 0.35s이면 초당 최대 약 2.86회까지 패리가 발생할 수 있는데, 광과민성 가이드라인의 발작 유발 임계는 "초당 3회 이상 + 화면 20~25% 이상을 덮는 플래시"다. → **차이**: RIPOSTE의 퍼펙트 패리 백색 프레임 플래시(1프레임)가 전체 화면을 덮는지, 그리고 `?nofx=1`이 이 플래시까지 끄는지(스펙상 "파티클만 끄고 히트스톱·흔들림은 유지"라 플래시는 유지될 가능성) 확인되지 않았다. → **제안**: 백색 플래시의 실제 화면 점유율과 지속시간을 실측하고, 필요 시 파티클과 별개로 "전체화면 플래시 끄기" 옵션을 분리 제공(광과민성 안전은 하드코어 난이도 유지와 무관하므로 비목표와 충돌 없음).

8. **관찰**: Game Accessibility Guidelines는 "고정된 색상만으로 정보를 전달하지 말 것"을 1급 권고로 명시하며, 가장 흔한 색약은 적록(빨강/초록) 조합이다. → **차이**: RIPOSTE의 금(노랑)/적 텔 쌍은 적록 조합이 아니어서 상대적으로 안전하고, 오디오 큐(고음/저음)로 이미 색상 외 채널을 병행 중이다. → **제안**: 음소거 상태를 가정했을 때도 시각적으로 모양 차이(플래시 형태·이펙트 궤적 등)가 존재하는지 1회 점검 — 색상+타이밍만으로 구분된다면 청각 접근이 없는 경우를 위한 최소 모양 보강을 검토.

9. **관찰**: WebAudio 정밀 스케줄링 관행은 `setTimeout` 대신 `AudioContext.currentTime` 기반의 룩어헤드(약 100ms) 예약을 권장한다. → **차이**: RIPOSTE가 텔 플래시와 동시에 오디오 큐를 재생하는 구현 방식(즉시재생 vs 룩어헤드 스케줄링)이 스펙만으로 확인되지 않는다. → **제안**: 0.18s처럼 좁은 창에서는 수 ms 지연도 체감될 수 있으므로, 오디오 재생이 고정 스텝 틱 시각 기준으로 스케줄링되는지 코드 레벨 확인 권장(구현 검증 태스크, 설계 변경 아님).

10. **관찰**: rAF는 탭 백그라운드 시 멈췄다가 복귀 시 거대한 델타를 반환하는 함정이 있고, 키보드 입력은 rAF와 비동기라 폴링 방식이면 최대 한 프레임(≈16.7ms@60Hz) 오차가 생길 수 있다(0.18s 창 기준 약 9%). → **차이**: RIPOSTE는 고정 스텝 1/120s 시뮬레이션을 이미 사용해 구조적으로 유리한 위치지만, 델타 클램프와 입력 타임스탬프 처리 방식이 스펙만으로 확인되지 않는다. → **제안**: (a) 탭 복귀 시 델타 클램프 존재 확인, (b) 입력을 `event.timeStamp` 기준으로 고정 스텝에 정렬하는지 확인 — 실측 없이 "괜찮다"고 단정하지 않는다.

---

## 출처 목록

### 판정 창 (§1~2)
- [Sekiro — Fextralife: Deflection](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection)
- ["The Truth About Sekiro Parry Frames" (YouTube)](https://www.youtube.com/watch?v=GRdHVXfVbfI)
- [Elden Ring — Fextralife: Buckler Parry](https://eldenring.wiki.fextralife.com/Buckler_Parry)
- [Bloodborne — Fextralife: Parry](https://bloodborne.wiki.fextralife.com/Parry)
- [SectorGaming — Bloodborne 총기 프레임 데이터 비교](https://sectorgaming.blog/best-gun-parrying-bloodborne)
- [Lies of P — Steam 토론: Perfect Guard window](https://steamcommunity.com/app/1627720/discussions/0/3887227031494470246/?ctp=2)
- [Lies of P — GameRant: How to Perfect Guard](https://gamerant.com/lies-of-p-how-to-perfect-guard-parry/)
- [Nine Sols — Switchblade Gaming 패리 타이밍 가이드](https://www.switchbladegaming.com/action-rpg/parry-timing-guide/)
- [Metal Gear Rising — TheGamer 초보 팁](https://www.thegamer.com/metal-gear-rising-revengeance-beginner-tips-parry-blade-mode/)
- [SF3rd Strike — SuperCombo Wiki: System](https://wiki.supercombo.gg/w/Street_Fighter_3:_3rd_Strike/System)
- [SF3rd Strike — 3sos-blog 프레임 데이터](https://3sos-blog.tumblr.com/post/7840889745/parry-frame-data)
- [Guilty Gear Strive — Red Bull 초심자 가이드](https://www.redbull.com/ca-en/guilty-gear-strive-how-to-get-started-guide)
- [Hi-Fi Rush — Fandom: Rhythm Parry](https://hifi-rush.fandom.com/wiki/Rhythm_Parry)
- [Hi-Fi Rush — dotesports 패리 가이드](https://dotesports.com/general/news/how-to-parry-in-hi-fi-rush)
- [Cuphead — ludo.guide 패리 타이밍 (신뢰도 낮음)](https://www.ludo.guide/guide/cuphead/tips-advanced-strategies/advanced-strategies-techniques/parry-timing-mastery)
- [Punch-Out!! Wii — TASVideos 런 제출](https://tasvideos.org/7295S)
- [Stellar Blade — Game8: How to Perfect Parry](https://game8.co/games/Stellar-Blade/archives/451200)
- [Khazan — Steam 토론: Parry timing](https://steamcommunity.com/app/2680010/discussions/0/595145468747471031/)
- [GameJuice — 코요테 타임·입력 버퍼](https://www.gamejuice.co.uk/articles/coyote-time-input-buffering)

### 리듬 전투 (§3)
- [One Finger Death Punch — Game Developer 딥다이브](https://www.gamedeveloper.com/design/one-finger-death-punch-and-animation-based-design)
- [Rhythm Heaven — Wikipedia](https://en.wikipedia.org/wiki/Rhythm_Heaven)
- [Crypt of the NecroDancer — Game Developer 딥다이브](https://www.gamedeveloper.com/audio/game-design-deep-dive-finding-the-beat-in-i-crypt-of-the-necrodancer-i-)

### 게임 필 (§4)
- [Jan Willem Nijman — "The Art of Screenshake" (INDIGO Classes 2013)](https://www.youtube.com/watch?v=AJdEqssNZ-U)
- [Martin Jonasson & Petri Purho — "Juice It or Lose It" (GDC Vault)](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose)
- [Martin Jonasson & Petri Purho — "Juice It or Lose It" (YouTube)](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
- [CritPoints — Hitstop/Hitfreeze/Hitlag 정리](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)
- [Shane Sicienski — Capcom Beat 'Em Up 히트스톱 분석](https://shane-sicienski.com/blog/blog-post-title-one-55pmn)

### 접근성 (§5)
- [Game Accessibility Guidelines — 색상 단독 전달 금지](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)
- [Game Accessibility Guidelines — 점멸/반복 패턴 회피](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)
- [Xbox Accessibility Guideline 118 (Microsoft Learn)](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118)
- [Vice — Celeste Assist Mode 변경 배경](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility/)

### 웹/브라우저 이슈 (§6)
- [web.dev — A tale of two clocks (WebAudio 스케줄링)](https://web.dev/articles/audio-scheduling)
- [Isaac Sukin — JS 게임 루프와 타이밍 상세 설명](https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing)
- [Simplified Media — Fixed Timestep Loops in the Browser](https://simplified.media/guides/fixed-timestep-loops)
