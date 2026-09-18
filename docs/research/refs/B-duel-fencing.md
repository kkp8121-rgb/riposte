# 펜싱/검술 1:1 듀얼 게임 및 1D 레인 결투 게임 레퍼런스 조사

> 대상 프로젝트: RIPOSTE(itch.io 게임잼, 바닐라 JS+Canvas 2D, 사이드뷰 1:1 보스러시 패리 듀얼, 1차원 레인, 벡터 실루엣 저에셋).
> 조사 방법: WebSearch/WebFetch(2026-09-18 시점). 추측 없이 확인된 사실만 기재, 확인 못 한 항목은 "확인 필요"로 표기.

---

## 1. 게임별 요약 표

| 게임 | 핵심 동사 수 | 리포스트/카운터 모델 | 시각 스타일 | RIPOSTE와의 관계 |
|---|---|---|---|---|
| **En Garde!** (2023, Fireplace Games) | 4~5(공격/패리/대시/발차기 등 환경 상호작용 포함) | 텔 색상 이분법(금=패리 가능, 적=대시 전용) — RIPOSTE의 금/적 플래시 문법과 사실상 동일 | 3D 만화풍, 저예산 아님(전문 스튜디오) | 텔 색상 문법의 선행 사례 — 가장 근접한 참조 |
| **Nidhogg** (2014) | 3(상/중/하 검 위치, 돌진, 던지기) | 검 높이를 맞추면 자동 패리(상호 반동), 확정 반격 개념 약함 | 8비트 미니멀 픽셀 | "느리게 기다리다 한 번에 찌른다"는 리듬의 원류 |
| **Nidhogg 2** (2017) | Nidhogg 1과 동일 | 동일 | 디테일한 만화풍(관람자용으로 의도적 전환, 팬 반발) | 미니멀 아트의 정체성 가치를 반증하는 반례 |
| **Hellish Quart** | 4(방향별 공격) + 자동가드 | 물리 기반 바인드/약점-강점 존(fencing leverage), 확정 리포스트 프레임 없음 | 실사풍 액티브 래그돌 3D | 물리 시뮬레이션 극단 — RIPOSTE와 반대 축 |
| **Bushido Blade** (1997) | 이동+베기+3스탠스 | 즉사(원힛킬), 부위 손상, 확정 리포스트 개념 없음 | PS1 3D 저폴리 | 즉사 긴장감의 명암을 보여주는 원조 사례 |
| **Samurai Gunn** | 베기(=패리 겸용)+총+대시+점프 | 검이 검·총알을 동시에 튕겨냄(단일 입력의 이중 용도), "Showdown"(단칼 서든데스) 모드 | 저해상도 픽셀 실루엣 | 단일 동사의 공격/방어 겸용 설계, 서든데스 듀얼 모드 |
| **Samurai Gunn 2** | 동일+확장 | 동일 | 동일 계열 | 후속작, 러닝커브 비판(가이드 필요) |
| **First Cut: Samurai Duel** | 3(조준 방어/패리/대시-찌르기) | 방향 조준 블록+패리, 커뮤니티는 "방향 무관하게 다 막힌다"고 비판 | 3D 사실적 | 패리 판정의 방향성 실패 사례(반면교사) |
| **Sclash** | 4(베기/패리/대시/폼멜인터럽트, 각 스태미나) | 즉사, 패리는 일반공격만 가능(차지공격 불가), 확정 리포스트 없음 | 로우폴리 3D | 스태미나 자원 관리형 패리 — AI가 차지공격에 붕괴하는 반례 |
| **One Strike** (Steam) | 이동+공격+방어(유인) | 단 1히트로 승부, 확정 반격 개념 없음(상대를 무리한 공격으로 유인) | 레트로 픽셀아트 | 극단적 짧은 라운드(10초 이내) 참고 사례 |
| **Punch-Out!!** | 좌우 이동+가드+펀치(선택적) | N/A(플레이어 공격 위주, 방어는 회피/가드) | 만화풍 3D(WiiVer)/2D(NES) | "텔이 곧 패턴 교육"이라는 1D 레인 읽기 게임의 원형 |
| **For Honor** (참고용) | 3방향 스탠스+공격+가드브레이크+패리 | 패리=하드어택을 정확히 타이밍에 내밀기, 확정 가드브레이크 연계 | 실사풍 3D | PvP 읽기 심리전의 참고, 싱글 보스전 이식 여부는 확인 필요 |
| **Clash: Artifacts of Chaos** | 공격+패리(즉시)+대시+2스탠스 | 패리 성공 시 공격 게이지 축적, 확정 반격은 스탠스 전환과 결합 | 실사풍 3D | 패리 신뢰도에 대한 리뷰 갈림(반면교사) |
| **Ghost of Tsushima: Standoff** (참고용) | 홀드+타이밍 릴리즈 1개 버튼 | 성공 시 연출용 즉사, 이후 통상전투 진입(연속 스탠드오프 스킬 가능) | 실사풍 3D | 단발 승부 연출의 참고, 상시 전투 규칙은 아님 |
| **Bleak Sword (DX)** | 공격+패리/가드+이동(디오라마 내 제한) | 소울라이크식 타이밍 방어, 확정 리포스트 프레임 약함 | 흑백+적색 포인트, 미니멀 실루엣 | 저에셋 미니멀 스타일의 성공 사례이자 "단조로움" 반례 |
| **Deepest Sword** | N/A | N/A | 3D | **부적합 — 검 길이 조절 플랫포머, 듀얼 게임 아님** |
| FOOTSIES(HiFight, 추가 발견) | 이동(좌우만)+공격 1버튼 | N/A(순수 spacing/whiff-punish) | 매치스틱 인간, 극단 미니멀 2D | 순수 1D 거리 조절만으로 재미가 성립함을 증명하는 구조적 참조 |
| DÖNGÜ(The Cycle, 추가 발견) | 슬래시(3방향)+패리/닷지(스와이프) | **포스처 브레이크 후 단일 확정 리포스트로 즉사** — RIPOSTE와 개념적으로 가장 근접 | 브라우저 미니멀 3D/벡터 | 직접적 컨셉 경쟁작 — 가장 강한 참조 후보 |
| AlleZ(추가 발견, 잼 프로토타입) | 이동+3방향 공격=패리 겸용(미러링) | 상대 동작을 그대로 따라 하면 패리 성립 | 색상 구분 실루엣 | 8시간 잼 프로토타입 수준, 참고 가치 제한적 |

---

## 2. 게임별 상세

### En Garde! (2023, Fireplace Games / Kepler Interactive)
17세기 배경 3인칭 스워시버클링 액션. 파나쉬 게이지를 채우는 패리-리포스트-런지 삼각 루프가 핵심이다. 텔이 **적색으로 번쩍이면 패리 불가·대시로만 회피 가능**하고, 일부 적은 체력 게이지 옆에 번개 아이콘이 떠 "모든 텔을 패리·회피로 온전히 처리해야 기절시킬 수 있다"는 규칙을 표시하며, 하나라도 놓치면 번개 게이지가 리셋된다. 아달리아의 전투 스탠스는 "1대1 결투 전용"으로 설계돼, 주변 환경(굴러가는 통, 떨어지는 샹들리에)을 이용해 우위를 만드는 것이 전략의 축이다. 리뷰는 8/10, 4시간 분량, "환경 의존적 해법이 정해져 있어 예측 가능해질 수 있다"는 단점을 지적했다.
출처: [GameLuster 리뷰](https://gameluster.com/en-garde-review-beautifully-balanced-riposte/), [En Garde! 위키백과](https://en.wikipedia.org/wiki/En_Garde!_(video_game)), [noisypixel 리뷰](https://noisypixel.net/en-garde-review/)

### Nidhogg (2014, Messhof)
검을 상/중/하 3위치로 두고, 상대 찌르기 높이에 맞춰 칼을 들면 자동 패리(양측 소폭 반동)가 성립한다. 찌르기(런지)는 검 끝이 상대보다 살짝 앞에 있어야 맞으며, 연속 찌르기 입력 시 조금씩 전진해 헛찌르기 후 재시도가 쉬워지는 리듬이 생긴다. 개발자는 Bushido Blade처럼 "상대가 먼저 움직이길 기다리는" 느린 템포를 의도했다. 입력은 단순하지만 조합으로 다리 후리기·드롭킥·검 던지기 등 표현이 풍부해진다.
출처: [Mechanics of Magic 분석](https://mechanicsofmagic.com/2021/04/08/mechanics-and-dynamics-of-nidhogg/), [Enemy Slime 리뷰](http://enemyslime.com/2014/01/review-nidhogg/), [Nidhogg 위키백과](https://en.wikipedia.org/wiki/Nidhogg_(video_game))

### Nidhogg 2 (2017)
전투 규칙은 1편과 동일하나, 아트를 8비트 미니멀에서 디테일한 그로테스크 만화풍으로 전환해 팬덤이 갈렸다. 개발자 Mark Essen은 "관람자 게임(spectator game)"으로 재정의하며 구경하는 사람이 볼 거리가 많아지도록 스타일을 바꿨다고 밝혔고, 1편의 미니멀리즘은 "선택이 아니라 예산 제약의 결과"였다고 언급했다. 전반적 평가는 긍정적이나 아트 스타일 자체는 지속적으로 논쟁 대상이었다.
출처: [VideoGamer](https://www.videogamer.com/news/nidhogg-2s-new-art-style-has-divided-fans/), [Nidhogg 2 위키백과](https://en.wikipedia.org/wiki/Nidhogg_2)

### Hellish Quart (Kubold)
액티브 래그돌과 실시간 물리로 구현한 펜싱 시뮬레이터. 무기마다 실제 무게(그램 단위)와 강한/약한 구간(레버리지 원리)이 있어 모든 바인드·패리·공격이 물리 연산으로 판정된다. 공격을 하지 않을 때는 자동으로 방어 자세(오토가드)를 취한다. 스팀 유저 리뷰 87% 긍정이나, AI는 "최고 난이도에서도 반복적", "차지/입력리딩이 오락실 동전 먹는 수준", "가끔 완전히 멈춰 선다"는 비판이 다수다.
출처: [Steam 페이지](https://store.steampowered.com/app/1000360/Hellish_Quart/), [PC Gamer](https://www.pcgamer.com/physics-based-sword-dueling-in-hellish-quart-is-looking-real-good/), [Steam 토론(AI 불만)](https://steamcommunity.com/app/1000360/discussions/0/603037248743765594/)

### Bushido Blade (1997, Squaresoft)
디렉터 나카타 슈히코가 "검술 시뮬레이터"를 표방해 몸통·머리·팔다리 각각에 히트박스를 부여, 다리를 베면 그 다리를 못 쓰게 되는 등 부위 손상이 실제 전투에 영향을 준다. 3가지 스탠스로 타격 스타일이 바뀐다. 원힛킬 시스템은 "혁신적이지만 결함 있다"는 평가를 받았다 — 상대를 팔다리까지 다 잘라놓고도 우연한 일격에 죽는 좌절감이 반복 지적됐다. 반면 "패리·카운터를 계속 계산해야 해서 매우 기술적"이라는 긍정 평가도 공존한다.
출처: [Bushido Blade 위키백과](https://en.wikipedia.org/wiki/Bushido_Blade_(video_game)), [Infinity Retro 리뷰](https://infinityretro.com/bushido-blade-review/), [Game Developer 분석](https://www.gamedeveloper.com/game-platforms/analysis-i-bushido-blade-i---an-honorable-game)

### Samurai Gunn / Samurai Gunn 2
검이 총알을 튕겨내고(검 vs 총알), 검끼리 부딪히면 둘 다 반동한다 — 같은 휘두르기 입력이 공격·방어를 겸한다는 점이 설계의 핵심. 스코어가 10:9이거나 동점일 때는 "Showdown"이라는 별도 1v1 서든데스 모드로 전환되며, 총은 못 쓰고 단 한 번의 칼질로 승부가 갈린다(번개가 칠 때만 보이는 암전 무대 등 전용 스테이지 존재). "최고의 1v1 듀얼 플랫폼 중 하나"라는 평가를 받았다. 후속작 Samurai Gunn 2는 스팀 유저 92% 긍정이나 "메커닉 이해에 가이드가 필요하다"는 진입장벽 지적이 있다.
출처: [PC Gamer 리뷰](https://www.pcgamer.com/samurai-gunn-review/), [Hardcore Gaming 101](http://www.hardcoregaming101.net/samurai-gunn/), [Samurai Gunn 2 Steam](https://store.steampowered.com/app/1397790/Samurai_Gunn_2/)

### First Cut: Samurai Duel
검을 조준해 막는 방향성 블록 + 패리 + 대시 + 밀치기(shove) 인터럽트로 구성된다. 커뮤니티 토론에서는 "공격 애니메이션의 어느 방향, 어느 단계든 검 궤적끼리는 다 막아버린다"는 방향 판정의 부정확함, "패리-리포스트가 형편없다", "상대 자세를 완벽히 맞추지 않으면 그냥 죽는다"는 불만이 제기됐다.
출처: [Steam 토론(패리 불만)](https://steamcommunity.com/app/2193490/discussions/0/4133808627038974158/), [First Cut Steam 페이지](https://store.steampowered.com/app/2193490/First_Cut_Samurai_Duel/)

### Sclash
슬래시·패리·대시·폼멜인터럽트 4개 동사가 각각 스태미나 자원 하나씩을 소모한다. 차지 공격은 패리 불가라 "패리+대시로 상대 자원을 소진시키는" 것이 핵심 전략이다. 즉사(원힛킬) 전투. 다만 AI는 차지 공격 앞에서 "패리를 아예 시도하지 않고 그냥 돌진해 버리는" 붕괴 현상이 보고됐고, 차지 공격 판정 범위가 캐릭터 뒤쪽까지 뚫려 있어 이 패턴이 악용 가능하다는 지적이 있다.
출처: [GameGrin 리뷰](https://www.gamegrin.com/reviews/sclash-review/), [Phenixx Gaming 리뷰](https://web.phenixxgaming.com/2023/08/09/sclash-pc-review/)

### One Strike (Steam, 2D 픽셀 격투)
단 한 번의 공격으로 승부가 갈리며, 한 판이 대개 10초를 넘지 않는다. 상대를 무리한 공격으로 유인해 빈틈을 만드는 것이 핵심 전략으로 제시된다. 레트로 픽셀아트, 6명의 파이터, 아케이드/원라이프/팀듀얼 등 모드가 있다.
출처: [Steam 페이지](https://store.steampowered.com/app/718730/One_Strike/)

### Punch-Out!! (원형 참조)
각 상대는 고정된 패턴을 가지고 있고, 게임의 본질은 그 패턴과 "텔"을 읽어내는 것이다. 공격 전 항상 관측 가능한 예비 동작(윈드업)이 있으며, 이를 학습해 대응하는 것이 순전한 반사신경보다 우선한다는 점이 디자인 철학의 핵심으로 반복 인용된다 — "보스가 자기 패턴을 스스로 가르친다"는 표현이 대표적이다.
출처: [Bugnet Blog](https://bugnet.io/blog/how-to-design-a-boss-that-teaches-its-own-pattern), [nextgamenavigator](https://nextgamenavigator.com/en/how-to-read-boss-attack-patterns-counter-any-boss)

### For Honor (참고용)
블록 버튼이 따로 없고, 좌/우/상 3방향 스탠스로 무기 위치를 미리 잡아 대응해야 한다. 패리는 "정확한 타이밍에 하드어택을 들어오는 공격에 맞춰 내미는" 방식으로 성립하며, 성공 시 가드브레이크 등으로 확정 연계가 가능하다. PvP 심리전(페인트·스탠스 읽기) 중심 설계로, 싱글 보스전에 그대로 이식됐는지는 확인 필요.
출처: [Game Developer "Rock, Paper, Guard Breaks"](https://www.gamedeveloper.com/design/rock-paper-guard-breaks-a-mechanics-deep-dive-into-for-honor), [For Honor Wiki: Stance](https://forhonor.fandom.com/wiki/Stance)

### Clash: Artifacts of Chaos
패리는 반사신경만으로 즉시 성립하며 성공 시 공격 게이지가 쌓인다. 2개 스탠스 전환과 결합해 깊이를 만들지만, 리뷰들은 "패리·회피보다 특수공격의 애니메이션을 외워 피하는 게 더 안정적"이라는 신뢰도 문제를 지적했다.
출처: [Steam 토론(패리)](https://steamcommunity.com/app/1430680/discussions/0/3792632416044663508/), [Console Creatures 리뷰](https://www.consolecreatures.com/review-clash-artifacts-of-chaos/)

### Ghost of Tsushima: Standoff (참고용)
버튼을 누르고 있다가 적이 공격하는 정확한 순간에 떼면 연출용 즉사가 성립하는 단발 미니게임으로, 통상 전투와는 분리된 진입 의식에 가깝다. 사무라이 영화(구로사와 등) 오마주가 명시적 설계 의도이며, 이후 스킬로 여러 적을 연속 스탠드오프로 처치할 수도 있다. 상시 전투 규칙이 아니라 "조우 개시 연출"이라는 점에서 RIPOSTE의 보스전 규칙과는 성격이 다르다.
출처: [Ghost of Tsushima 위키백과](https://en.wikipedia.org/wiki/Ghost_of_Tsushima), [Ghost Franchise Wiki: Standoff](https://ghostfranchise.fandom.com/wiki/Standoff)

### Bleak Sword (DX)
소울라이크 전투를 극단적으로 축약한 미니멀 액션. 각 스테이지가 작은 정사각형 "디오라마"에 갇혀 있고, 흑백 화면에 적색만 강조색(피, 체력바)으로 쓰는 실루엣 스타일이다. "배우기 쉽고 숙달하기 어려운" 긍정 평가와 동시에 "미니멀함이 오래 하면 지루해진다", "다른 요소가 부실해 짧게 나눠 즐기는 게 낫다"는 단조로움 비판이 함께 나온다.
출처: [Unity Blog](https://unity.com/blog/games/more8bit-bleak-sword-minimalist-mobile-game-design), [MKAU Gaming 리뷰](https://www.mkaugaming.com/all-review-list/bleak-sword-dx-steam-review/)

### Deepest Sword — 부적합 확인
조사 결과 이 게임은 듀얼 게임이 아니라 "검이 항상 너무 짧거나 너무 길어지는" 물리 기반 플랫포머(Ludum Dare 48 잼작)다. 펜싱/1:1 결투와 무관해 상세 분석에서 제외한다.
출처: [Destructoid](https://www.destructoid.com/deepest-sword-maddening-platformer-little-sword-that-grows/)

### FOOTSIES (HiFight) — 추가 발견
좌우 이동만 가능한 2방향·1버튼 격투 게임으로, "중립 게임(neutral game)"만 순수 추출해 가르치기 위해 만들어졌다. 점프도 없고 공격 판정 거리·이동 속도의 상호작용만으로 거리 조절(spacing)·헛치기 punish의 재미가 성립함을 보여주는 구조적 증거다. RIPOSTE가 목표하는 "좌우 이동만으로 긴장을 만드는" 설계의 최소 사례.
출처: [SuperCombo.gg](https://supercombo.gg/2022/06/16/footsies-fighting-games-distilled/), [HiFight 공식 페이지](https://hifight.github.io/footsies/)

### DÖNGÜ (The Cycle, Alperengll) — 추가 발견, 가장 근접한 컨셉 경쟁작
"HP바를 깎는 소모전이 아니라, 상대 포스처를 깨고 단 한 번의 치명적 리포스트로 끝낸다"는 규칙을 명시한다. 검광(글린트)이 번쩍이면 방향에 맞춰 스와이프(좌/우=패리, 아래=닷지)해야 하며, 타이밍과 페인트가 매 공격마다 랜덤화돼 있어 "암기가 아니라 읽기"를 강제한다고 소개한다. 6종 적, 로그라이크 런 구조, 브라우저 플레이. RIPOSTE의 "패리→리포스트" 핵심 루프와 개념적으로 가장 가까운 사례다.
출처: [DÖNGÜ itch.io](https://alperengll.itch.io/cycle-rpg-roguelike)

### AlleZ (Gumboot) — 추가 발견, 참고 가치 제한적
72시간 잼(Triple TriJam 2020) 프로토타입. 상대 공격을 "그대로 따라 하는(미러링)" 방식으로 패리가 성립하는 실험적 설계이며, 흑/녹/남색으로 구분된 실루엣 스타일이다. 완성도 높은 상용작이 아니라 프로토타입 수준이라 시사점은 제한적이다.
출처: [AlleZ itch.io](https://gumboot.itch.io/allez)

---

## 3. RIPOSTE에 주는 시사점 (10개 이내)

**1. Punch-Out!! — 텔이 곧 패턴 교육이라는 설계 철학**
관찰: Punch-Out!!은 "보스가 자기 패턴을 스스로 가르친다"는 표현으로 요약될 만큼, 모든 공격에 학습 가능한 예비 동작을 강제한다.
차이: RIPOSTE도 "플래시→타격 시간이 공격별로 항상 일정"이라는 동일 철학을 이미 스펙에 채택했다.
제안: 변경 불필요 — 기존 설계가 이 장르의 검증된 원칙과 일치함을 확인하는 수준. 추가 조치 없음.

**2. DÖNGÜ — 가장 근접한 컨셉 경쟁작, 비교 플레이 권장**
관찰: DÖNGÜ는 "포스처 브레이크+단일 확정 리포스트, 글린트 텔, 랜덤 타이밍/페인트"로 RIPOSTE와 개념이 거의 겹친다.
차이: RIPOSTE는 HP 시스템+손패 3슬롯 훔치기가 추가로 있어 더 복잡한 자원 루프를 가진다(차별점).
제안: 규칙 변경 제안이 아니라 조사 권고 — 텔 가독성·피드백 타이밍 비교를 위해 직접 플레이해볼 가치가 있음(구현 작업 아님).

**3. Bushido Blade / One Strike — 즉사 시스템의 좌절감 vs RIPOSTE의 회복형 페널티**
관찰: 즉사형 게임들은 "우연한 일격에 죽는다"는 좌절 리뷰가 반복된다.
차이: RIPOSTE는 패리 실패 시 즉사가 아니라 0.4s 무방비(회복 가능한 페널티)로 설계돼 이 문제를 원천 회피한다.
제안: 변경 불필요 — 현재 설계가 이미 이 장르의 알려진 함정을 피하고 있음을 문서화할 가치만 있음.

**4. First Cut / Clash — 패리 방향·신뢰도 불만 vs RIPOSTE의 이분법 텔**
관찰: 두 게임 모두 "패리가 방향 무관하게 다 먹힌다"거나 "패리보다 애니메이션 암기가 더 안정적"이라는 신뢰도 비판을 받는다.
차이: RIPOSTE는 금색=패리 가능/적색=패리 불가(대시 전용)로 이분화해 있어 이 혼란이 구조적으로 발생하기 어렵다.
제안: 변경 불필요. 다만 QA 시 "텔 색상 오인식"이 실제로 없는지 실측 확인은 유효.

**5. Hellish Quart / Sclash — AI가 특정 공격 유형에 붕괴하는 패턴**
관찰: 두 게임 모두 AI가 차지 공격이나 특정 상황에서 "패리를 포기하고 돌진"하거나 "가만히 멈추는" 붕괴 현상을 보인다.
차이: RIPOSTE 보스는 AI가 아니라 데이터 기반 패턴 테이블(스펙 §3)이라 이런 종류의 "판단 오류"는 애초에 발생 구조가 다르다.
제안: 신규 패턴 추가 시 "플레이어 상태(대시/패리 중)와 무관하게 텔-판정이 항상 유효한가"를 회귀 테스트에 포함 — 이미 `boss-overlap.mjs` 게이트가 있으므로 확장 검토만 권고, 신규 도구 제안 아님.

**6. Nidhogg 2 아트 논쟁 — RIPOSTE의 벡터 실루엣 정체성 재확인**
관찰: Nidhogg 2가 미니멀 픽셀에서 디테일한 아트로 바꿨다가 팬 반발을 겪었고, 개발자는 미니멀리즘이 "선택이 아니라 예산 제약"이었다고 밝혔다.
차이: RIPOSTE는 벡터 실루엣을 예산 제약이자 스펙 SSoT로 명시하고 있어 동일한 갈등 소지가 적다.
제안: 변경 없음 — 미니멀 스타일 유지 결정을 뒷받침하는 외부 근거로만 참고.

**7. Bleak Sword의 "미니멀함이 오래 하면 지루해진다"는 비판**
관찰: 미니멀 전투 자체가 장시간 반복되면 단조로움을 유발한다는 지적이 반복된다.
차이: RIPOSTE는 8보스×2챕터, 1회 플레이 10~20분, 보스 간 차별화 게이트(`boss-overlap.mjs --check`)를 이미 강제하고 있어 이 리스크가 구조적으로 완화돼 있다.
제안: 변경 불필요 — 기존 게이트가 이미 이 문제에 대응하고 있음을 확인.

**8. FOOTSIES — 순수 1D 거리 조절이 재미의 축이 될 수 있음, 단 RIPOSTE는 "내 공격"이 없음**
관찰: FOOTSIES는 좌우 이동+공격거리 상호작용만으로 spacing 재미가 성립함을 증명한다.
차이: RIPOSTE는 플레이어 자기 공격이 0개(패리 전용)라 전통적 footsies(때리고 빠지기)가 존재하지 않는다 — 대시(회피)와 리포스트의 유효 사거리가 "거리 조절"의 실질적 축인지는 스펙 확인 필요.
제안: 신규 동사 추가 없이, 기존 대시 이동거리·리포스트 판정거리 파라미터가 "가까이 붙어야 유리/멀어야 안전"이라는 긴장을 만드는지 기획 검토 권고(비목표와 충돌 없음 — 파라미터 튜닝 범위).

**9. Sekiro류(DÖNGÜ 인용)/For Honor — 확정 반격의 "수치" 못지않게 "체감 피드백"이 중요**
관찰: 패리 성공 후 확정 반격을 수치(프레임 유리, 데미지 배율)로 명확히 하는 것 자체보다, 성공 여부를 즉각 체감하게 하는 시청각 피드백(히트스탑·이펙트·사운드)이 리뷰에서 더 자주 만족도와 연결된다.
차이: RIPOSTE는 스트릭 3+ 리포스트 ×2, 윈드업 카운터 ×1.5로 수치 보상은 이미 명확하나, 성공 순간의 시청각 피드백 강도는 스펙 문서 열람만으로는 확인 필요.
제안: 신규 동사 아닌 UX 폴리싱 범위 — 패리/리포스트 성공 시 히트스탑·이펙트가 이미 있는지 스펙 §7(디버그 훅)·구현 코드에서 확인 후, 없다면 보강 검토(비목표와 충돌 없음).

**10. Samurai Gunn "Showdown" / Ghost of Tsushima Standoff — 단발 즉사 듀얼은 참고만, 규칙 편입은 비권장**
관찰: 두 게임 모두 "단 한 번의 칼질로 끝나는" 별도 모드/연출을 두어 극적 긴장을 만든다.
차이: RIPOSTE는 항상 다회 HP 소모전이며, 고정 타이밍 리듬 학습이라는 이미 채택된 설계로 유사한 긴장을 대체하고 있다.
제안: 신규 모드·규칙(원힛킬 서든데스)을 RIPOSTE에 추가하는 것은 명시된 비목표(새 플레이어 동사 없음)와 충돌 가능성이 있으므로 **채택 비권장**, 연출적 참고로만 기록.

---

## 4. 출처 목록

- [En Garde! Review - GameLuster](https://gameluster.com/en-garde-review-beautifully-balanced-riposte/)
- [En Garde! (video game) - Wikipedia](https://en.wikipedia.org/wiki/En_Garde!_(video_game))
- [En Garde! Review - noisypixel](https://noisypixel.net/en-garde-review/)
- [Nidhogg (video game) - Wikipedia](https://en.wikipedia.org/wiki/Nidhogg_(video_game))
- [Mechanics and Dynamics of Nidhogg](https://mechanicsofmagic.com/2021/04/08/mechanics-and-dynamics-of-nidhogg/)
- [Nidhogg Review - Enemy Slime](http://enemyslime.com/2014/01/review-nidhogg/)
- [Nidhogg 2 - Wikipedia](https://en.wikipedia.org/wiki/Nidhogg_2)
- [Nidhogg 2's new art style has divided fans - VideoGamer](https://www.videogamer.com/news/nidhogg-2s-new-art-style-has-divided-fans/)
- [Hellish Quart - Steam](https://store.steampowered.com/app/1000360/Hellish_Quart/)
- [Physics-based fencing in Hellish Quart - PC Gamer](https://www.pcgamer.com/physics-based-sword-dueling-in-hellish-quart-is-looking-real-good/)
- [Hellish Quart AI 불만 - Steam 토론](https://steamcommunity.com/app/1000360/discussions/0/603037248743765594/)
- [Bushido Blade (video game) - Wikipedia](https://en.wikipedia.org/wiki/Bushido_Blade_(video_game))
- [Bushido Blade Review - Infinity Retro](https://infinityretro.com/bushido-blade-review/)
- [Analysis: Bushido Blade - Game Developer](https://www.gamedeveloper.com/game-platforms/analysis-i-bushido-blade-i---an-honorable-game)
- [Samurai Gunn review - PC Gamer](https://www.pcgamer.com/samurai-gunn-review/)
- [Samurai Gunn - Hardcore Gaming 101](http://www.hardcoregaming101.net/samurai-gunn/)
- [Samurai GUNN 2 - Steam](https://store.steampowered.com/app/1397790/Samurai_Gunn_2/)
- [First Cut: Samurai Duel - Steam](https://store.steampowered.com/app/2193490/First_Cut_Samurai_Duel/)
- [First Cut 패리 불만 - Steam 토론](https://steamcommunity.com/app/2193490/discussions/0/4133808627038974158/)
- [Sclash Review - GameGrin](https://www.gamegrin.com/reviews/sclash-review/)
- [Sclash Review - Phenixx Gaming](https://web.phenixxgaming.com/2023/08/09/sclash-pc-review/)
- [One Strike - Steam](https://store.steampowered.com/app/718730/One_Strike/)
- [How to Design a Boss That Teaches Its Own Pattern - Bugnet](https://bugnet.io/blog/how-to-design-a-boss-that-teaches-its-own-pattern)
- [Read Any Boss Attack in 5 Steps - nextgamenavigator](https://nextgamenavigator.com/en/how-to-read-boss-attack-patterns-counter-any-boss)
- [Rock, Paper, Guard Breaks: For Honor - Game Developer](https://www.gamedeveloper.com/design/rock-paper-guard-breaks-a-mechanics-deep-dive-into-for-honor)
- [Stance - For Honor Wiki](https://forhonor.fandom.com/wiki/Stance)
- [Clash: Artifacts of Chaos 패리 - Steam 토론](https://steamcommunity.com/app/1430680/discussions/0/3792632416044663508/)
- [Clash: Artifacts of Chaos Review - Console Creatures](https://www.consolecreatures.com/review-clash-artifacts-of-chaos/)
- [Ghost of Tsushima - Wikipedia](https://en.wikipedia.org/wiki/Ghost_of_Tsushima)
- [Standoff - Ghost Franchise Wiki](https://ghostfranchise.fandom.com/wiki/Standoff)
- [Bleak Sword's minimalist approach - Unity Blog](https://unity.com/blog/games/more8bit-bleak-sword-minimalist-mobile-game-design)
- [Bleak Sword DX Review - MKAU Gaming](https://www.mkaugaming.com/all-review-list/bleak-sword-dx-steam-review/)
- [Deepest Sword - Destructoid](https://www.destructoid.com/deepest-sword-maddening-platformer-little-sword-that-grows/)
- [FOOTSIES — fighting games, distilled - SuperCombo.gg](https://supercombo.gg/2022/06/16/footsies-fighting-games-distilled/)
- [FOOTSIES - HiFight 공식 페이지](https://hifight.github.io/footsies/)
- [DÖNGÜ - itch.io](https://alperengll.itch.io/cycle-rpg-roguelike)
- [AlleZ - itch.io](https://gumboot.itch.io/allez)
- [Riposte (damajogames, 부적합 확인) - itch.io](https://damajogames.itch.io/riposte)

---

## 확인 필요 항목
- En Garde!의 GDC 발표/공식 포스트모템 원문(Gamasutra 아카이브 링크 미확인, 학생작 시절 IGF 기사만 언급됨).
- For Honor의 스탠스/패리 시스템이 싱글플레이 보스전에 그대로 이식돼 성공적으로 평가받는지 여부.
- RIPOSTE 자체의 패리/리포스트 성공 시 시청각 피드백(히트스탑 등) 존재 여부 — 본 조사는 외부 게임만 대상으로 하여 RIPOSTE 코드는 확인하지 않음.
