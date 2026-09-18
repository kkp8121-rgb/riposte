# 리서치 H — 미니멀 아트 상용 액션 게임의 프레젠테이션 기준

> 조사 대상: RIPOSTE(사이드뷰 1:1 보스러시 패리 듀얼, 바닐라 JS+Canvas 2D, 외부 에셋 0, 절차 애니메이션, WebAudio 실시간 합성)를 상용 출시 수준으로 끌어올리기 위한 아트·애니메이션·VFX·음악·UI·스토어 페이지 기준 조사.
> 조사 방식: WebSearch 15회 + WebFetch 18회(세션 WebSearch 예산이 소진되어 이후는 WebFetch로 1차 출처를 직접 열람). 수치는 출처가 있는 것만 기재하고, 확인 못 한 항목은 전부 "확인 필요"로 표기했다.

---

## 1. 미니멀 상용작 표

| 게임 | 아트 방식 | 해상도 | 애니메이션 | 음악 | 리뷰의 아트 평가 인용 | RIPOSTE 대비 한 줄 |
|---|---|---|---|---|---|---|
| **Downwell** | 8비트 픽셀아트, black/white/red 3색 고정 팔레트 | 확인 필요(PS Vita판 세로 tate mode 지원은 확인) | 스프라이트 기반(절차 애니메이션 여부 확인 필요) | Eirik Suhrke 작곡(인간 작곡, 합성 아님) | Vlambeer Rami Ismail: "fast, lovingly crafted, and its design is pure"[^1] / 개발자 Adam Saltsman: "모든 요소가 조화롭게 맞아떨어지는 방식을 즉시 볼 수 있었다"[^6] | RIPOSTE도 3색 원칙에 가깝지만 배경이 단일 팔레트 1종 — Downwell은 적색 하나로 "위협 신호"를 표준화 |
| **Ape Out** | 벡터 실루엣, no-outline, 포스터(Saul Bass·Olly Moss) 영감 | 확인 필요 | 절차적이진 않고 스프라이트+화면 전체 팔레트 전환(캠페인마다 색 교체) | 절차적 드럼 생성 — "intensity" 수치 기반 샘플 선택, 신경망 일부 활용[^7] | PC Gamer 계열: "high-contrast construction paper"로 만든 듯한 urban pop-art[^2] | RIPOSTE는 배경색 고정 1종, Ape Out은 캠페인(레벨 묶음)마다 팔레트를 통째로 바꿔 "새 구역" 신호를 줌 |
| **Thomas Was Alone** | 순수 기하 도형(사각형), Mondrian 영감 | 확인 필요 | 단순 이동/점프 트윈(절차 애니메이션 아님) | Steve Kamb/David Housden 작곡 | "sparse, geometric visuals celebrated for their elegance"[^3], 단 "pretentious" 비판도 존재 | RIPOSTE의 서사 미니멀리즘과 유사 방향이나, 이 게임은 내레이션(음성)으로 감정을 보완 — RIPOSTE는 텍스트뿐 |
| **Minit** | 순수 흑백(회색조차 없음), 1비트 도트 | 확인 필요 | 픽셀 프레임 애니메이션 | 칩튠, 4인 개발팀 | "downright beautiful", "a gorgeous artistic accomplishment"[^4] / 단점: "일부 지역이 시각적으로 구분 안 됨"[^4] | RIPOSTE의 보스별 색 분리가 Minit의 "지역 구분 실패" 반례 — 최소 1색 랜드마크가 필요하다는 근거 |
| **SUPERHOT** | red(적)/black(무기)/white(환경) 3색, 기능적 색상 코딩 | 확인 필요 | 폴리곤 캐릭터, 시간 흐름 연동 애니메이션 | Karl Flodin 작곡. UI는 MS-DOS/Norton Commander 오마주[^11] | "red enemies, black weapons, white world let you know exactly where everything is at all times"[^5] | RIPOSTE도 "위협=붉은/금색 텔레그래프" 색 코딩을 이미 쓰고 있음 — SUPERHOT 수준으로 전신 강화 여지 |
| **Nidhogg(1)** | 초저해상도 스틱피겨 | 확인 필요 | 픽셀 프레임(수 프레임 루프) | Daedelus 작곡, 절차적 트리거로 긴장감 조절[^12] | "minimalist duel between two monochromatic stick figures"가 핵심 매력으로 평가[^8] | 속편 Nidhogg 2가 디테일한 아트로 바꿨다가 반발을 샀다[^9] — 미니멀이 브랜드 정체성이었다는 반증 사례 |
| **Bleak Sword DX** | 2D 픽셀 스프라이트 + 3D 디오라마 혼합, red/black/white | 확인 필요 | 픽셀 프레임 + 3D 카메라 무빙(번개·그림자 연출) | Jim Guthrie 작곡(인간)[^13] | "small diorama", "eerie sway of the camera over the hand-crafted diorama"[^10] | RIPOSTE는 배경이 정적 — Bleak Sword는 카메라 무빙·번개 이펙트로 같은 저폴리곤에도 연출감을 더함 |
| **Kill Knight** | 네온 미니멀 아이소메트릭, "lo-fi brutalism" | 확인 필요 | 스프라이트 | 신스 사운드트랙(작곡가 확인 필요) | "polished, minimalist aesthetic... neon-soaked arcades of the 90s"[^14] | RIPOSTE와 구조 유사(아레나별 보스)이나 Kill Knight는 핸드크래프트 아레나 5종 — RIPOSTE는 1종으로 추정 |
| **Sclash** | 잉크워시/유화 파스텔, 손그림 스크롤 질감 | 확인 필요 | 손으로 그린 프레임(절차 아님) | 확인 필요 | "absolutely beautiful", "stunning look that makes everything appear hand-painted"[^15] | RIPOSTE의 "외부 에셋 0/벡터 실루엣" 원칙과 정반대 접근 — 참고는 되지만 채택 시 원칙 파기 필요 |
| **Kingdom** | 모던 픽셀아트, 미니멀 컨트롤 | 확인 필요 | 픽셀 프레임 | 칩튠 | "beautiful, modern pixel art aesthetic"[^16] | RIPOSTE와 무관한 장르지만 "미니멀 컨트롤+아트"가 함께 리뷰에서 호평받은 사례 |
| **Limbo** | 흑백 실루엣, 그레인/필름 이펙트 | 확인 필요 | 키프레임 애니메이션 — 애니메이터 1명이 3년간 전담[^17] (절차 애니메이션 아님) | 미니멀 앰비언트 | IGN: "매우 독창적이고 분위기 있으며 일관되게 뛰어난"[^17] | 중요: RIPOSTE의 절차 애니메이션 전제와 달리 Limbo는 수작업 키프레임으로 실루엣의 "인간적 무게감"을 만듦 — 절차 애니메이션만으로 동일 품질 도달은 검증 필요 |
| **Inside** | 모노크롬 + 포인트 컬러, 커스텀 렌더링(temporal reprojection) | 확인 필요 | 실사 모션캡처 참고 키프레임(확인 필요) | 미니멀 앰비언트, Best Audio Design 수상[^18] | Giant Bomb "Best-Looking Game" 수상, IGN "Super Limbo in the Best Possible Way"[^18] | RIPOSTE는 조명 이펙트가 단순 — Inside는 자체 안티앨리어싱/포스트프로세싱 셰이더로 "고급스러움"을 확보 |
| **Sayonara Wild Hearts** | 네온 드림팝, 실루엣+글로우 | 확인 필요 | 스프라이트/3D 혼합 | 신스팝 원곡 작곡(합성 아님) | "art style feels simple but the color palettes are breathtaking"[^19] | RIPOSTE의 골드 스파크·화이트 플래시 VFX가 이 게임의 "네온 글로우" 문법과 근접 — 팔레트 다양화 여지 |
| **Thumper** | 미니멀 지오메트리, 강렬한 대비 색 | 확인 필요 | 절차적 트랙 생성 | "rhythm-violence" 퍼커션, 2인 개발[^20] | Paste 10/10, IGN/Gamespot 9/10 — 단 "사운드트랙이 화면 신호와 무관하다"는 비판도 존재[^20] | 미니멀+강렬한 사운드로 상용 성공했지만, 음악-비주얼 연동 실패 시 혹평받는 반례 |
| **Lorns Lure** | PS1 로우폴리, 안개·원근 흐림 | 확인 필요 | 3D 모델 애니메이션 | 미니멀 앰비언트[^21] | "retro look adds charm and a welcome sense of eeriness"[^21] | RIPOSTE의 "어두운 단색+원거리 기둥"과 유사한 절제된 배경 문법, 안개로 깊이감 추가하는 저비용 기법 참고 가능 |
| **Gris** | 수채화 애니메이션, 색 회복=감정 메커니즘 | 확인 필요 | 수작업 애니메이션(고퀄리티) | 오케스트라 원곡 | Apple: "영혼을 감동시키는 디지털 아트 작품"[^22] | RIPOSTE와 예산 규모 차이가 커 직접 비교는 부적합(참고용 상한선) |
| **Devil Daggers / Hyper Demon** | 의도적 저품질 텍스처, 90년대 3D 결함 재현("polygon jitter") | 확인 필요 | 3D 모델 | 확인 필요 | 평가 엇갈림 — PC Gamer "oppressive" 호평 vs GameSpot/IGN "과도한 시각적 혼란"[^23] | 반례: 미니멀/로파이가 항상 먹히는 건 아니다 — 가독성 실패 시 "혼란스럽다"는 혹평으로 직결 |
| **Titan Souls** | 16비트풍 실루엣, 환경 대비 거대 보스 | 확인 필요 | 픽셀 프레임 | "빠른 보스곡과 환경의 미니멀 대비"[^24] | 아트 호평이나 "환경 디자인은 일반적이고 따분하다" 비판 존재[^24] | RIPOSTE의 "아레나 1종" 리스크와 정확히 일치하는 비판 사례 — 아레나 다양화가 리뷰 감점 포인트를 막는 근거 |

[^1]: https://opencritic.com/game/1966/downwell , https://gamingtrend.com/reviews/simply-satisfying-downwell-review/
[^2]: https://www.pcgamer.com/ape-out-review/
[^3]: https://www.nintendolife.com/reviews/wiiu-eshop/thomas_was_alone
[^4]: https://techcrunch.com/2018/04/03/minit-is-a-monochromatic-adventure-that-eats-up-hours-60-seconds-at-a-time/
[^5]: https://oberlinreview.org/9962/arts/superhot-a-minimalist-take-on-shooter-genre/
[^6]: https://www.gamedeveloper.com/design/elegance-not-simplicity-devs-weigh-in-on-i-downwell-s-i-irresistible-charm
[^7]: https://mcvuk.com/development-news/when-we-made-ape-out/
[^8]: https://www.trustedreviews.com/reviews/nidhogg-2
[^9]: https://www.gamedeveloper.com/design/why-i-nidhogg-2-i-ditches-the-minimalism-of-the-original , https://www.videogamer.com/news/nidhogg-2s-new-art-style-has-divided-fans/
[^10]: https://www.nintendolife.com/reviews/switch-eshop/bleak-sword-dx
[^11]: https://en.wikipedia.org/wiki/SUPERHOT
[^12]: https://en.wikipedia.org/wiki/Nidhogg_(video_game)
[^13]: https://en.wikipedia.org/wiki/Bleak_Sword
[^14]: https://store.steampowered.com/app/2694420/KILL_KNIGHT/ , https://punishedbacklog.com/kill-knight-review/
[^15]: https://medium.com/@Kaldrin/how-we-chose-an-original-painterly-art-style-and-how-it-served-our-production-in-sclash-433a7f2a3a4b
[^16]: https://kingdomthegame.com/
[^17]: https://en.wikipedia.org/wiki/Limbo_(video_game)
[^18]: https://en.wikipedia.org/wiki/Inside_(video_game)
[^19]: https://muscat-holiday.com/reviews/sayonara-wild-hearts-review-dream-pop-synesthesia-in-a-portable-package/
[^20]: https://ropname.substack.com/p/the-dark-souls-of-rhythm-games-my , https://www.pcgamer.com/thumper-review/
[^21]: https://www.destructoid.com/reviews/review-lorns-lure/
[^22]: https://en.wikipedia.org/wiki/Gris_(video_game)
[^23]: https://en.wikipedia.org/wiki/Devil_Daggers
[^24]: https://en.wikipedia.org/wiki/Titan_Souls

---

## 2. "스타일 vs 싸구려" 분기 요인

위 표를 관통하는 패턴에서, 미니멀 아트가 "스타일"로 읽히는 작품과 "싸구려/플레이스홀더"로 읽히는 작품을 가르는 요인은 다음 5가지로 수렴한다.

1. **기능적 색상 코딩이 있는가** — SUPERHOT·Downwell·Bleak Sword DX는 색을 "정보"로 쓴다(적=위협, 흰=안전 등). Minit은 이게 부족해서 "지역 구분 실패" 비판을 받았다. 색이 장식이 아니라 신호일 때 미니멀은 "의도된 설계"로 읽힌다.
2. **일관된 제약(self-imposed constraint)을 끝까지 지키는가** — Minit의 "흑백+60초", SUPERHOT의 "red/black/white", Thumper의 퍼커션 전용 사운드처럼 하나의 규칙을 예외 없이 지킬 때 리뷰어는 "우아함(elegance)"이라 부른다. 일부만 미니멀이고 일부는 디테일하면 "미완성"으로 읽힌다.
3. **디테일이 반응성(reactivity)에 쓰이는가, 장식에 쓰이는가** — Ape Out의 절차적 드럼("every hit is playing a sample, every drum simulates its own sound")과 SUPERHOT의 시간 흐름 연동은 미니멀한 표현을 플레이어 행동에 직결시킨다. 리뷰어들은 "반응성"을 "스타일"로, "고정된 단순함"을 "싸구려"로 구분하는 경향이 뚜렷하다.
4. **가독성이 실패하는 순간 미니멀은 즉시 "혼란"으로 전락한다** — Devil Daggers/Hyper Demon은 의도적 로파이 텍스처가 일부 리뷰(GameSpot·IGN)에서 "과도한 시각적 혼란"으로 지적됐다. 미니멀은 "정보량이 적다"가 아니라 "필요한 정보만 남긴다"여야 스타일로 읽힌다.
5. **환경/아레나 다양성 부족은 아트 미니멀리즘과 별개로 감점된다** — Titan Souls는 아트 자체는 호평받았지만 "환경 디자인이 일반적이고 따분하다"는 비판을 받았다. 캐릭터 미니멀리즘과 레벨/아레나 미니멀리즘은 리뷰에서 분리되어 평가된다 — RIPOSTE처럼 아레나가 1종으로 추정될 경우 캐릭터 아트가 아무리 좋아도 별개로 감점 요인이 된다.

---

## 3. 주제별 상세

### 3.1 실루엣 캐릭터 + 절차 애니메이션 상용 사례

절차 애니메이션이라는 용어를 쓸 수 있는 사례는 생각보다 적다. **Limbo는 실제로는 절차가 아니라 키프레임**이다 — 애니메이터 한 명이 3년간 소년의 움직임만 전담했고[^17], 핵심 팀 규모도 8명(최대 16명)이었다. "실루엣=저비용"이 아니라 "실루엣이라도 손이 많이 들어간다"는 반증 사례로 다뤄야 한다. Ape Out은 애니메이션 자체는 스프라이트지만 **절차적인 것은 음악(드럼 강도 시스템)**이며, 실루엣 아트는 Saul Bass·Olly Moss 포스터 레퍼런스를 수작업으로 만들었다[^7]. Nidhogg(1)의 스틱피겨는 프레임 수가 극히 적은 루프 애니메이션으로, "미니멀"이 곧 "제작비 절감"으로 직결된 유일한 사례에 가깝다 — 다만 음악의 절차적 트리거로 보완했다[^12]. Thomas Was Alone은 단순 트윈(이동/점프) 애니메이션에 성우 내레이션으로 감정을 보완했다[^3]. 즉 "타격감·가독성"은 애니메이션 기법(절차든 키프레임이든)보다 **색상 코딩·히트스톱·카메라 반응** 같은 프레임 밖 연출로 확보되는 경우가 많다 — 이는 RIPOSTE가 이미 갖춘 히트스톱·화이트플래시·스파크 체계와 정합적이다. 보스 실루엣 차별화 사례로는 Kill Knight의 5개 핸드크래프트 아레나+괴물 디자인, Bleak Sword DX의 디오라마별 카메라 무빙이 있으나, "8종 이상을 실루엣만으로 구분한" 명시적 사례는 검색 범위 내에서 확인하지 못했다 — 확인 필요.

### 3.2 음악 — BGM 부재/드론, 절차 생성, 페이즈 전환, OST 외주 비용

BGM이 사실상 없거나 드론에 가까운 상용 액션 게임의 리뷰 반응 실사례는 검색 범위 내에서 직접 확인하지 못했다(확인 필요) — 다만 Hi-Fi Rush 사례가 근접 참고가 된다: 리듬 연동 자체는 The Game Awards 2023 "최고의 오디오 디자인"을 수상했지만, PC Gamer는 "음악 선곡이 제한적이고 구식"이라 지적했다[^HFR] — **음악의 양적 다양성 부족은 리듬/타이밍 시스템이 아무리 좋아도 별도로 감점된다**는 근거다. 절차/생성 음악의 상용 성공 사례로는 Ape Out(절차적 드럼, 신경망 일부 활용)[^7]과 Nidhogg(절차적 트리거)[^12]가 확인됐다. Rez의 제너러티브 음악 시스템은 자료를 확보하지 못했다(확인 필요). 보스전 음악의 페이즈 전환 관행: Furi는 보스마다 다른 아티스트가 전용 트랙을 작곡했고 전투 중 상호작용+짧은 컷신으로 스토리를 전달한다(Metacritic 74~77)[^Furi]. Cuphead는 51곡의 빅밴드 재즈를 실제 세션 녹음으로 제작했고(빈티지 녹음 기법 사용), 이는 "이 시대의 최고 게임 사운드트랙 중 하나"로 평가받았다[^Cuphead] — 다만 제작진이 집을 담보로 잡아 자금을 조달했을 만큼 고비용이었다. 소규모 인디의 OST 외주 비용 관행은 출처를 확보하지 못했다(확인 필요) — 단, Bleak Sword DX(Jim Guthrie)·Sclash·Thumper(2인 개발)처럼 소규모 팀도 작곡가를 기용한 사례는 많아, "0원 자체 합성"보다 "소액 외주"가 업계 표준에 가깝다고 추정된다(추정, 확인 필요).

### 3.3 스토어 프레젠테이션 — 캡슐·트레일러·태그

Steam 공식 문서(Steamworks partner 사이트) 기준 캡슐 규격은 다음과 같다[^cap]: **Header Capsule 920×430**(스토어 상단·추천·빅픽처), **Small Capsule 462×174**(검색결과·리스트), **Main Capsule 1232×706**(홈페이지 캐러셀), **Vertical Capsule 748×896**(세일 페이지), 스크린샷은 **최소 1920×1080, 5장 이상** 필수이며 "제목 외 텍스트·인용구를 캡슐에 넣지 말라"는 가이드가 명시돼 있다. 트레일러는 **최대 1920×1080, 16:9 권장(4:3 허용), 30 또는 60fps, H.264/AAC, 5,000Kbps 이상**이며, 공식 문서가 강조하는 핵심은 "**Discovery Queue에서 10초 안에 시청자의 관심을 끌어야 하며, 첫 트레일러는 무조건 게임플레이 위주(HUD 노출 포함)여야 한다**"는 점, 그리고 "음성 없이도 이해되도록 자막을 넣으라"는 점이다[^trailer]. 미니멀 아트 게임의 캡슐이 스토어에서 묻히는 문제와 그 구체적 해결 사례(Downwell·Minit·Kill Knight의 캡슐 디자인 실측 비교)는 검색 예산 소진으로 확인하지 못했다(확인 필요) — 다만 Kill Knight의 "네온 대비" 아트 방향과 SUPERHOT의 "red/black/white 기능색"은 둘 다 작은 캡슐 크기(462×174)에서도 실루엣이 살아남는 고대비 전략이라는 점은 표에서 확인된 사실로부터 추론 가능하다. Steam 태그(Boss Rush·Parry·Difficult·Minimalist·2D Fighter 등)의 팔로워 규모는 SteamDB/Steam 태그 페이지가 JS 렌더링 기반이라 WebFetch로 데이터를 가져오지 못했다(확인 필요) — 사용자가 직접 steamdb.info/tag/ 또는 store.steampowered.com/tag/ 페이지를 브라우저로 열어 확인하는 것을 권장한다.

### 3.4 UI·연출 최저선(상용 액션)

옵션 메뉴 구성·키 리바인드 UI의 업계 표준 상세 스펙은 확인하지 못했다(확인 필요) — 다만 RIPOSTE가 "옵션 메뉴 없음, 키 리바인드 없음" 상태인 것은 조사된 모든 상용 액션 게임(Furi·Cuphead·Sekiro·Katana Zero 포함) 대비 이례적으로 보인다. 보스 인트로 카드·페이즈 전환 연출 관행: Cuphead는 보스마다 서로 다른 전투 형식(일부는 슈팅 게임 전환)을 갖는다[^Cuphead]. Sekiro는 전투 자체의 "포스처(posture)" 시스템과 패리 타이밍이 "아름답다"는 평가를 받았다[^Sekiro] — 다만 위키피디아 자료에서는 사망 화면·카드 연출의 구체 디자인은 확인하지 못했다(확인 필요). 아레나 다양성: Furi는 보스마다 고유 섬(아레나)을 가지며 이는 "가디언"이라는 세계관 설정과 직결된다[^Furi]. Titan Souls는 아트 자체는 호평이었지만 환경(아레나) 디자인이 "일반적이고 따분하다"는 비판을 받았다[^TitanSouls] — 이는 §2의 분기 요인 5번과 직결된다. 텍스트 기반 스토리 연출: Katana Zero는 실시간 대화 트리에서 플레이어가 NPC 대사를 언제든 끊을 수 있고 "show-don't-tell" 원칙을 지킨다[^KatanaZero]. Helltaker는 무료 배포임에도 스테이지 종료 후 "캐릭터 성격을 추론해 답하는" 짧은 질의응답형 대화로 개성을 압축 전달한다[^Helltaker]. 한국어 단문 대화의 로컬라이즈 시 톤 유지 관행에 대한 자료는 확인하지 못했다(확인 필요).

### 3.5 해상도·화면

RIPOSTE의 960×540 논리 해상도(16:9, 정수 배율로 1920×1080=2배, 2880×1620=3배 등에 깔끔히 대응)는 업계 관행과 부합한다. 확인된 수치는 **Steam Deck 1280×800**뿐이다[^deck] — 960×540 기준 1.333배(비정수)이므로 Steam Deck에서는 레터박스 또는 비정수 스케일 처리가 필요하다(대응 방식은 확인 필요). Celeste(320×180 정수 배율 스케일링 관행)와 Katana Zero(저해상도 픽셀 렌더링)는 일반적으로 알려진 사실이나, 이번 조사의 1차 출처(Wikipedia)에서는 정확한 내부 렌더링 해상도 수치를 확인하지 못했다(확인 필요 — 공식 인터뷰·기술 블로그 재조사 권장). Downwell은 PS Vita 이식판에서 "tate mode"(세로 모드)를 지원한다는 사실만 확인했다[^Downwell] — 이는 벡터/저해상도 게임이 이식 시 화면비를 유연하게 재정의할 수 있음을 보여주는 사례다. 울트라와이드 대응 관행은 확인하지 못했다(확인 필요).

---

## 4. RIPOSTE 프레젠테이션 업그레이드 제안 (10개 이내)

각 항목: 관찰 → RIPOSTE 현재 → 제안(외부 에셋 0 원칙 준수/파기 구분).

| 우선순위 | 제안 |
|---|---|
| **출시 필수** | **1. 기능적 색상 코딩 전신 확산.** 관찰: SUPERHOT·Downwell·Bleak Sword DX는 색을 "정보"로 쓴다(§2 요인1). 현재: RIPOSTE는 퍼펙트 패리 시 금색 스파크만 색 코딩. 제안: **원칙 준수형** — 보스별 "위협 색"(찌르기=빨강, 광역=보라 등) 텔레그래프 색상 규칙을 8종 보스에 일관 적용(코드만 추가, 신규 에셋 불요). |
| **출시 필수** | **2. 아레나 최소 2~3종 분리.** 관찰: Titan Souls는 아트 호평에도 "환경이 따분하다"는 감점을 받았다(§2 요인5, §3.4). 현재: 아레나 1종 추정. 제안: **원칙 준수형** — Canvas 2D 절차 배경(색상 팔레트·기둥 배치·바닥선 기울기만 변경)으로 3종 분기, 신규 이미지 에셋 0. |
| **출시 필수** | **3. Steam 캡슐 세트 제작.** 관찰: Header 920×430·Small 462×174·Main 1232×706·Vertical 748×896·스크린샷 1920×1080 이상 5장이 Valve 공식 필수 규격[^cap]. 현재: 미확인(제작 여부 확인 필요). 제안: 원칙과 무관(마케팅 산출물) — 고대비 실루엣 1개를 캡슐 전 사이즈에 재배치, 텍스트·인용구 배제. |
| **권장** | **4. 절차 애니메이션에 "인간적 지연" 1개 추가.** 관찰: Limbo는 절차가 아니라 3년 키프레임으로 "무게감"을 만들었다(§3.1). 현재: RIPOSTE 절차 애니메이션(호흡 바운스·기울기)은 균일한 사인파에 가까울 위험. 제안: **원칙 준수형** — 착지/피격 시 1~2프레임의 미세한 비대칭 딜레이(랜덤 시드 고정)만 추가, 신규 에셋 불요. |
| **권장** | **5. 보스전 음악에 최소 1단계 페이즈 전환.** 관찰: Furi·Cuphead·Hi-Fi Rush 모두 보스전 음악이 국면에 따라 변한다(§3.2). 현재: BGM은 2오실레이터 드론 고정. 제안: **원칙 준수형** — Phase 2 배너 시점에 드론의 두 번째 오실레이터 주파수/디튠 폭만 코드로 변조(작곡 없이 파라미터 변경), WebAudio 내 구현. |
| **권장** | **6. 트레일러 첫 10초 = 게임플레이 우선 재구성.** 관찰: Valve 공식 가이드가 "Discovery Queue 10초 내 흥미 유발, 첫 트레일러는 게임플레이 위주+HUD 노출" 명시[^trailer]. 현재: 미확인. 제안: 원칙과 무관 — 퍼펙트 패리 히트스톱+금색 스파크 장면을 트레일러 0:00~0:03에 배치. |
| **권장** | **7. 음악 다양성 부족에 대한 선제 방어선(보스별 드론 변주).** 관찰: Hi-Fi Rush조차 "음악 선곡 제한적" 비판을 받았다(§3.2) — 드론 하나뿐인 RIPOSTE는 더 큰 리스크. 현재: BGM 전곡 동일 드론. 제안: **원칙 준수형** — 보스마다 드론의 베이스 음정·LFO 속도만 테이블화(js/bosses/*.js 로컬 상수)해 "같은 악기, 다른 곡"처럼 들리게 최소 변주. |
| **이후** | **8. 키 리바인드 UI 추가.** 관찰: 조사된 모든 상용 액션 게임이 리바인드를 지원하는 것으로 통상 기대됨(§3.4, 개별 스펙은 확인 필요). 현재: 없음. 제안: 원칙과 무관 — localStorage 기반 키맵 저장 UI, 신규 화면 1개. |
| **이후** | **9. Steam 태그 전략 확정 전 실측.** 관찰: Boss Rush·Parry·Minimalist 등 태그의 팔로워 규모를 이번 조사에서 확인하지 못함(§3.3). 현재: 미정. 제안: 원칙과 무관 — 출시 전 steamdb.info/tag/ 브라우저 실측 후 상위 태그 5개 확정(사람이 직접 확인 필요). |
| **이후** | **10. Nidhogg 2 교훈 — 디테일 강화 유혹 경계.** 관찰: 미니멀을 디테일로 바꿨다가 반발을 산 유일한 반례(§1)[^9]. 현재: 해당 없음(RIPOSTE는 아직 미니멀 유지 중). 제안: 원칙과 무관 — 향후 업데이트에서 "디테일 추가" 요청이 오면 이 사례를 근거로 재검토 게이트 삼을 것. |

> 우선순위 표기 기준: **출시 필수** = 리뷰 감점이 직접 예상되는 항목(§2 분기 요인과 1:1 대응), **권장** = 상용 게임 평균 기준선에 근접시키는 항목, **이후** = 출시 이후에도 늦지 않는 항목.

---

## 5. 출처 목록

- https://opencritic.com/game/1966/downwell
- https://gamingtrend.com/reviews/simply-satisfying-downwell-review/
- https://toucharcade.com/2015/10/15/downwell-review/
- https://www.gamedeveloper.com/design/elegance-not-simplicity-devs-weigh-in-on-i-downwell-s-i-irresistible-charm
- https://switchplayer.net/2019/03/16/downwell-review/
- https://en.wikipedia.org/wiki/Downwell_(video_game)
- https://www.pcgamer.com/ape-out-review/
- https://explosionnetwork.com/ape-out-review/
- https://mcvuk.com/development-news/when-we-made-ape-out/
- https://cliqist.com/2019/03/08/sound-and-style-make-ape-out-unforgettable/
- https://www.nintendolife.com/reviews/wiiu-eshop/thomas_was_alone
- https://en.wikipedia.org/wiki/Thomas_Was_Alone
- https://www.nintendojo.com/reviews/review-minit-switch
- https://techcrunch.com/2018/04/03/minit-is-a-monochromatic-adventure-that-eats-up-hours-60-seconds-at-a-time/
- https://en.wikipedia.org/wiki/Minit
- https://oberlinreview.org/9962/arts/superhot-a-minimalist-take-on-shooter-genre/
- https://washburnreview.org/7037/features/game-superhot-features-a-minimalist-art-style-engaging-mechanics/
- https://en.wikipedia.org/wiki/Superhot
- https://www.trustedreviews.com/reviews/nidhogg-2
- https://www.gamedeveloper.com/design/why-i-nidhogg-2-i-ditches-the-minimalism-of-the-original
- https://blog.playstation.com/2017/07/14/why-messhof-built-an-entirely-new-art-style-for-nidhogg-2-out-august-15/
- https://www.videogamer.com/news/nidhogg-2s-new-art-style-has-divided-fans/
- https://en.wikipedia.org/wiki/Nidhogg_2
- https://en.wikipedia.org/wiki/Nidhogg_(video_game)
- https://www.metacritic.com/game/bleak-sword-dx/
- https://www.nintendolife.com/reviews/switch-eshop/bleak-sword-dx
- https://noisypixel.net/bleak-sword-dx-review/
- https://en.wikipedia.org/wiki/Bleak_Sword
- https://store.steampowered.com/app/2694420/KILL_KNIGHT/
- https://punishedbacklog.com/kill-knight-review/
- https://nichegamer.com/reviews/kill-knight-review/
- https://opencritic.com/game/15366/sclash
- https://www.gamespew.com/2024/05/sclash-review-one-hit-wonder/
- https://medium.com/@Kaldrin/how-we-chose-an-original-painterly-art-style-and-how-it-served-our-production-in-sclash-433a7f2a3a4b
- https://www.metacritic.com/game/kingdom-2015/
- https://kingdomthegame.com/
- https://en.wikipedia.org/wiki/Limbo_(video_game)
- https://www.dualshockers.com/limbo-review-nintendo-switch/
- https://en.wikipedia.org/wiki/Inside_(video_game)
- https://pixune.com/blog/monochrome-art-style/
- https://www.thesixthaxis.com/2019/09/17/sayonara-wild-hearts-review/
- https://muscat-holiday.com/reviews/sayonara-wild-hearts-review-dream-pop-synesthesia-in-a-portable-package/
- https://en.wikipedia.org/wiki/Sayonara_Wild_Hearts
- https://ropname.substack.com/p/the-dark-souls-of-rhythm-games-my
- https://www.pcgamer.com/thumper-review/
- https://www.popmatters.com/thumper-requires-only-one-word-to-describe-it-brutal-2495409420.html
- https://opencritic.com/game/17575/lorns-lure/reviews
- https://www.destructoid.com/reviews/review-lorns-lure/
- https://en.wikipedia.org/wiki/Gris_(video_game)
- https://en.wikipedia.org/wiki/Devil_Daggers
- https://en.wikipedia.org/wiki/Titan_Souls
- https://en.wikipedia.org/wiki/Furi
- https://en.wikipedia.org/wiki/Hi-Fi_Rush
- https://en.wikipedia.org/wiki/Cuphead
- https://en.wikipedia.org/wiki/Sekiro:_Shadows_Die_Twice
- https://en.wikipedia.org/wiki/Katana_Zero
- https://en.wikipedia.org/wiki/Helltaker
- https://en.wikipedia.org/wiki/Steam_Deck
- https://en.wikipedia.org/wiki/Celeste_(video_game)
- https://partner.steamgames.com/doc/store/assets/standard (Steam 캡슐 규격)
- https://partner.steamgames.com/doc/store/trailer (Steam 트레일러 가이드라인)

[^HFR]: https://en.wikipedia.org/wiki/Hi-Fi_Rush
[^Furi]: https://en.wikipedia.org/wiki/Furi
[^Cuphead]: https://en.wikipedia.org/wiki/Cuphead
[^Sekiro]: https://en.wikipedia.org/wiki/Sekiro:_Shadows_Die_Twice
[^TitanSouls]: https://en.wikipedia.org/wiki/Titan_Souls
[^KatanaZero]: https://en.wikipedia.org/wiki/Katana_Zero
[^Helltaker]: https://en.wikipedia.org/wiki/Helltaker
[^deck]: https://en.wikipedia.org/wiki/Steam_Deck
[^cap]: https://partner.steamgames.com/doc/store/assets/standard
[^trailer]: https://partner.steamgames.com/doc/store/trailer
