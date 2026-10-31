# 9주차 최종 독립 평가

평가일: 2026-10-31 (Asia/Seoul). 대상: 로컬 홈·지도·저장목록, 앱 프레임402×874.

**18행: 통과15 / 실패0 / 판단 불가3.** 직전 평가의 수치 위반3개(H3, M4, S4)는 최신 캡처·metrics·코드에서 해소됨을 확인했다. 이는 앞서 정한 제한된 검사 범위의 결과이며 **전체 앱·모든 상태·강의 요구사항 전체 완료를 뜻하지 않는다.** 이전 두 독립 평가 문서는 수정하지 않았다.

## 근거와 비교 방법

규칙은 DESIGN.md, tokens.css, components/index.md 및 Button/Input/Card/Map 계약이다. 범위는 직전 독립 후속 평가와 동일하게 유지했다. 새 기능이나 큰 범위의 검사를 추가하지 않았다.

- `F/` = `../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/`.
- `R/` = `F/review-round-2/`: 직전12통과/3실패/3판단불가 때의 보존본.
- `A` = 현재 `design-alignment.css`. 파일 뒤 숫자는 줄 번호 또는 JSON 요소 블록 부근이다.
- 표의 전은 앞선 보정 이전 관측을 유지하며, 이번 세 수정행에는 직전 R/ 값을 명시한다. 나머지15행은 직전 평가의 근거와 범위를 유지하고 최신 수집값과 비교했다. 없는 개선을 만들어내지 않았다.

최신 home-after/map-after/saved-after/map-search-focus PNG 네 장을 직접 열어 확인했다. 홈의 마지막 수정은 동일 DOM에서 CSS를 바꾼 정적 비교로, 실제 앱 인터랙션 증거가 아니다. home-live-after는 앞선 보정의 실제 앱 증거지만 마지막 카테고리 및 여백 변경 전 자료다. home-scrolled-after도 앞서 확인한 정적 스크롤 배치 증거이며 이번 여백 변경 후 실시간 조작 증거로 간주하지 않는다.

직전 R/과 최신 JSON을 요소 순서·내용으로 대조했다. 홈72개 요소 중 달라진 공통 필드는 cnrow 두 요소의 padding뿐, 지도71개는 검색 폼 radius 하나, 저장목록34개도 검색 radius 하나였다. 수집된 rect·font·color·gap 등 다른 공통 필드는 동일했다. 이 비교는 수집된 속성에 한정하며 미수집 DOM 전체를 보증하지 않는다. 각 화면의 images(src/alt) 배열도 직전과 동일했다.

상위 manifest의 PNG11개와 코드4개 SHA-256을 재계산해 모두 일치했다. R/independent-report.md는 기존 wk9-independent-follow-up.md와 바이트가 동일함도 확인했다. 최초 before가 이전 CSS URL 두 개를 로드했다는 [README](../../outputs/wk9-fixed-baseline-a49e0a9/README.md)·[manifest](../../outputs/wk9-fixed-baseline-a49e0a9/manifest.json)의 제한은 그대로 적용한다. 최초 before를 기준 커밋a49e0a9의 바이트 동일 브라우저 실행으로 보증하지 않는다.

지도 카메라와 바깥 브라우저 여백은 전후 동일하지 않다. 지도 핀/타일 위치 차이를 UI 수정이나 회귀로 해석하지 않는다. 큰 PNG 바깥 폭을 넓은 앱 화면 테스트로 세지 않는다.

## 홈 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| H1 색: 가시 내비·전체보기·오늘·카테고리의 semantic 색 역할 | 내비 #73777D/#202124, 전체보기 #3A3A3A, 오늘 #EFEFF1, 카테고리 #2E2E2E |최신 정적 after에서 내비 #6B6B70/#111111, 전체보기 #111111, 오늘 #E8E8EA, 카테고리 #111111. 지정된 역할 연결 확인 직전 평가 대비 새 변경 없음. | 통과 | F/home-before.png, 최신 home-after.png, home-scrolled-after.png 및 각 metrics의 prefchip/내비; A:123–124,132,142,146; DESIGN.md:56–70,156 | 마지막 갱신에서 칩 on-surface 적용. 날짜/내비는 이전 live-after와도 대조했으나 최신 칩 변경의 live 재현은 미확인. 사진/유리 합성 대비를 포함한 전 화면 색 합격은 아님 |
| H2 타입: 날짜 label-md, 요일 body-sm, 대표/섹션 제목 headline-md | 날짜600/800 15/24, 오늘 요일600 12/16. 대표/일정 제목700 22/30 |날짜600 14/20, 요일400 12/16으로 보정. 대표/일정 제목 조합 유지. 수집된 가시 대상의 조합 일치 직전 평가 대비 새 변경 없음. | 통과 | F/home-before.png와 home-live-after.png 일정; F/home-before-metrics.json:753 이후 날짜 블록, F/home-live-after-metrics.json:819 이후 날짜 블록; A:144–145,150–152; tokens.css:8–12 | 날짜와 요일의 font 전체 조합 적용. 최근 저장 제목도 최신 F/home-scrolled-after.png와 metrics의 rwtitle에서700 22/30으로 추가 확인. 정적 렌더 증거이며 실제 앱 스크롤 동작 검증은 아님 |
| H3 간격: 앞서 검사한 일정행·전체보기·요일의 토큰 간격 | 최초 gap10/9, 요일padding-top5/gap2. 직전 평가에서는 gap 보정 후에도 일정행 padding1px 6px이 남음 | 최신 고정 DOM에서 두 cnrow 모두 padding0px 8px, gap8. 전체보기gap8, 요일padding4/gap4 유지. 일정 크기322×44와 좌표 유지 | 통과 | F/home-after.png 및 home-after-metrics.json:1215,1237; R/home-after-metrics.json의 같은 요소; A:140–143; DESIGN.md:21,78,157 | 이번에 .calw .cnrow padding을0 var(--space-sm)으로 명시. 검사했던 여백 불일치 해소. 모든 홈 요소의 간격을 전수 검사한 것은 아님 |
| H4 모서리: 홈 카테고리의 일반 버튼sm 또는 완전한 캡슐, 대표 사진 스택 예외 | 칩 높이44/radius18로 캡슐 아님. 대표 사진radius30 |칩44/radius999로 완전한 캡슐. 대표 사진radius30 유지 직전 평가 대비 새 변경 없음. | 통과 | F/home-before/after.png 카테고리·사진 스택; F/home-before-metrics.json:1259, F/home-live-after-metrics.json:1325; A:132; components/Card/CONTRACT.md:6; DESIGN.md:86 | 칩 반지름만 보정. 사진 스택 기하 예외 유지. 이 행은 칩과 대표 스택에 한정 |
| H5 컴포넌트: 일정/카테고리44×44 이상, 카테고리 두 행 비중첩 | 일정322×34. 칩44 높이지만 행 시작 간격38으로6px 겹침 |일정322×44. 최신 칩 두 행 y777.74/829.74, 높이44 →8px 간격. 스크롤 정적 캡처는 y385.74/437.74로 두 행과 최근 목록이 내비 위에 노출됨 직전 평가 대비 새 변경 없음. | 통과 | F/home-before.png, 최신 home-after.png, home-scrolled-after.png 및 해당 metrics의 cnrow/prefchip; A:133–134,140; home.css:283; components/Button/CONTRACT.md:8 | 명시적 행을44로 보정하고8 간격 유지. 초기 화면에서는 부유 내비가 칩 일부를 가리지만 스크롤된 배치에서 노출 확인. 통과는 크기/행 비중첩/정적 노출에 한정하며 클릭·포커스·실제 스크롤 조작성은 H6 미확인 |
| H6 상태: 키보드·캐러셀·날짜 선택·빈 홈 | 초기 화면만으로 인터랙션 미확인 |실제 홈 after는 있으나 조작 과정/포커스 복귀/모션 기록 없음. 정적 frozen HTML은 스크립트 제거됨 직전 평가 대비 새 변경 없음. | 판단 불가 | F/home-before/after/live-after.png 및 각 DOM; DESIGN.md:140–152; A:84–95; components/Card/CONTRACT.md:9–10 | 상태 스타일 존재와 실행 결과를 분리. 키보드·날짜·스와이프·빈 데이터 시나리오 추가 확인 필요 |

## 지도 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| M1 색: 위치/검색 on-surface, 코스 primary, 내비 secondary/primary | 제목/검색 #17191B, 코스 배경#222222, 내비 #73777D/#202124 |가시 제목/검색#111111, 코스#111111/글자#F4F4F5, 내비#6B6B70/#111111. 카테고리 semantic 색 유지 직전 평가 대비 새 변경 없음. | 통과 | F/map-before/after.png 상단·코스·내비; F/map-after-metrics.json:27 및 lm-header-search/lm-course-button,1413,1457; A:123–126,135–136; tokens.css:5–7 | 지적된 가시 색 역할 보정. 숨김 검색 close의 #17191B 등 전 상태의 색은 이 통과 범위 밖이며 전체 지도 색 완료를 의미하지 않음 |
| M2 타입: 가시 위치 제목 headline-lg, 카드 label-md, 카테고리/내비 body-sm | 700 28/36,600 14/20,400 12/16 |같은 조합 유지. 이번 기준 대비 변경 없음 직전 평가 대비 새 변경 없음. | 통과 | F/map-before/after.png; F/map-after-metrics.json:27, STRONG 및 카테고리 B,1413; A:11,17–21; tokens.css:8–12 | 별도 타입 개선으로 주장하지 않음. 외부 타일·숨김 h1·미수집 예시 위치 라벨까지 승인하지 않음 |
| M3 간격: 제목-카테고리 간격 목록 사용 | 제목 행 끝72, 카테고리 시작77 →5 |제목 y28/h44, 카테고리 y80 →8. 내부 카테고리 gap8/padding8·12 유지 직전 평가 대비 새 변경 없음. | 통과 | F/map-before/after.png 헤더; F/map-after-metrics.json:27,137; A:138,97; ui-unify.css:58; DESIGN.md:21,78 | margin-top을 space-sm으로 보정. 검사 대상은 해당 헤더 간격이며 모든 지도 내부 margin/padding 완료를 뜻하지 않음 |
| M4 모서리: 콘텐츠 카드md12·원형 버튼 예외·검색 완전한 캡슐 | 직전 지도 검색 높이44/radius20, 카드12·원형50% | 최신 검색 높이44/radius999. 펼친 검색은354×44, radius999로 직접 수집. 카드12·원형50% 유지 | 통과 | F/map-after.png, map-search-focus.png; F/map-after-metrics.json:71 및 map-search-focus-metrics.json의 libsearch; R/map-after-metrics.json:71; A:128; DESIGN.md:94,158 | 지도 libsearch에999px 명시. 검색/버튼 크기와 카드 구성 유지. 닫힌 폼 폭45.33을 펼침 폭으로 오인하지 않음 |
| M5 컴포넌트: 위치 버튼44, 하트/상세44 비중첩, 사진 정사각형 | 위치154.27×36, 하트/상세44. 캐러셀 약334×113은 코드 계산만 있었음 |위치154.27×44. 하트/상세44이며 첫 카드 y657.11–701.11 /724.33–768.33로 비중첩. 카드334×112.55, 사진111.22×111.22 직접 수치 확인 직전 평가 대비 새 변경 없음. | 통과 | F/map-before/after.png 카드·제목; F/map-after-metrics.json:27,467–489 및 lm-carousel-heart/lm-carousel-detail; A:137,67–70; components/Map/CONTRACT.md:4–5 | 위치 버튼 자체 min-height44 적용. 사진/카드 수치는 테두리 안쪽/바깥쪽 차이가 있어 사진과 카드 전체 높이가 완전 동일하다고 쓰지 않음. X/점 없이 기존 제목·하트·저장 시점·주소·화살표 구성 유지 |
| M6 상태: 포커스·검색·하트 저장·마커/캐러셀 연동·모션 | 포커스 outline:none!important 충돌, 실행 확인 없음 |map-search-focus.png에서 검정 포커스 테두리와 같은 행 검색 펼침 확인. CSS 충돌 해결. 하트 영속성·모션·실패/로딩·키보드 전 과정은 미확인 직전 평가 대비 새 변경 없음. | 판단 불가 | F/map-search-focus.png; F/map-after-dom.txt:28–43,49–64; A:139; ui-unify.css:50; map-live.js:89,151,390; components/Map/CONTRACT.md:7–9 | focus-within에 최종 !important 적용. 특정 포커스 상태가 확인되었다는 부분 성과만 인정하고 전체 상태 통과로 확대하지 않음 |

## 저장목록 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| S1 색: 입력on-surface, 미선택secondary, 선택primary/neutral | 입력#292929, 칩#3A3A3E, 선택글자#FFFFFF, 내비#73777D/#202124 |입력#111111, 칩#6B6B70, 선택#111111/#F4F4F5, 내비#6B6B70/#111111 직전 평가 대비 새 변경 없음. | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:49–113,599,687; A:123–131; DESIGN.md:56–68 | 해당 역할 연결 보정. 폴더 재질/유리 합성 대비는 별도 미확인 |
| S2 타입: 제목headline-lg, 입력body-md, 폴더/칩label-md, 내비body-sm | 해당 가시 대상은 다섯 조합에 일치 |700 28/36,400 16/24,600 14/20,400 12/16 유지. 이번 기준 대비 변경 없음 직전 평가 대비 새 변경 없음. | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:5–113, cf-title 및599; A:10–16,21; tokens.css:8–12 | 기존 일치 상태 유지. 폴더 개수 등 미수집 텍스트까지 전면 승인하지 않음 |
| S3 간격: 바깥24/폴더격자24, 제목행-검색12 | 제목x24, 폴더x28/213·폭161. 다음 행 시작차162.458 |좌표/크기 동일: 213−28−161=24, 380.458−218−138.458=24. 검색x24/y80 및 padding16/8, gap8 확인 직전 평가 대비 새 변경 없음. | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:27,247–335; A:3,26,39; ui-unify.css:5; DESIGN.md:78,96 | 검증한 바깥/격자/검색 내부는 유지. 칩 줄의 다른 margin/padding은 포함하지 않음 |
| S4 모서리: 필터·검색 완전한 캡슐, 폴더 실루엣 예외 | 직전 필터44/radius999는 일치. 검색50/radius24가 남음 | 최신 검색354×50/radius999. 필터44/radius999와 폴더 윤곽 유지 | 통과 | F/saved-after.png, saved-after-metrics.json:27,71; R/saved-after-metrics.json:27; A:128,130; DESIGN.md:94,158; components/Card/CONTRACT.md:6 | 저장 libsearch에999px 명시. 기존 검색 크기와 좌표는 유지 |
| S5 컴포넌트: 기본 검색 이름·폴더 버튼·터치 크기·실루엣 | 이름 있는 검색, 폴더161×138.46, 칩최소49.54×44 |이름/개수/기본 폴더 구성과 크기 유지. 이번 기준 대비 구조 변경 없음 직전 평가 대비 새 변경 없음. | 통과 | F/saved-before/after.png; F/saved-after-dom.txt:3–41; F/saved-after-metrics.json:71,247–291; collection.js:65–74,235; components/Input/CONTRACT.md:5 | 기본 화면에서 확인한 구성 유지. 검색어 입력 후 지우기 버튼/빈 결과 버튼의 실제 크기는 이 통과 범위 밖 |
| S6 상태: 즉시 필터·Enter·빈 결과·선택/저장 유지 | 초기 전체 pressed만 확인 |saved-empty-result.png에서 입력어와 ‘찾는 콘텐츠가 없어요’, 복귀 버튼 확인. 즉시 반응 시점/Enter 닫힘/복귀 작동/선택/재로드는 없음 직전 평가 대비 새 변경 없음. | 판단 불가 | F/saved-empty-result.png; F/saved-after-dom.txt:4–19; collection.js:235,283–294,387; components/Input/CONTRACT.md:8–10 | 빈 결과 표현은 부분 확인. 상태 전체 통과는 보류. 빈 결과 캡처의 키보드와 내비 중첩도 보여 실제 키보드 종료/내비 숨김 과정 추가 확인 필요 |

## 범위별 미확인 사항과 보존

- **상태3행은 판단 불가 유지:** 홈의 키보드·날짜 선택·캐러셀·빈 상태, 지도의 검색 전체 흐름·하트 영속성·카드/마커 연동·모션, 저장목록의 즉시 필터 시점·Enter·선택/복귀·재로드는 전체 실행 증거가 없다. 지도 검색은 최신 focus metrics에서 outline `rgb(17,17,17) solid 2px`, offset−2px와354×44 크기를 확인했으므로 특정 포커스 표현만 확인된 상태다. 빈 결과 PNG도 특정 결과 표현만 보여준다.
- **사진/유리 대비 미확인:** 최종 합성 배경의 최저 대비를 측정하지 않았다. 흰 글자·스크림·opacity1 선언이나 단색 토큰 대비만으로4.5:1을 통과시킬 수 없다. 저장 기본 폴더 캡처는 내부 카드 저장 시점 유리 배지의 증거가 아니다.
- **Figma 미확인:** 최신 Variables·Scope·Light/Dark·Primitive alias·Text/Effect Styles 실제 객체 및 SVG 원본 경로 일치 여부를 확인하지 않았다. CSS 선언이나 대조 문서를 Figma 구현 완료로 해석하지 않는다.
- **실제 Dark·넓은 앱 폭 미확인:** 이번18행은402×874에 한정한다. 추가 산출물의 파일/해시 존재는 해당 화면의 디자인 검증이 아니다.
- **이미지·구조 보존:** 직전 자료와 최신 src/alt 배열이 동일하고 사진 스택·폴더 실루엣·지도 캐러셀의 보이는 구성이 유지된다. 수집된 사진/카드 rect도 그대로다. 모든 이미지 바이너리 및 CSS 배경이미지를 전수 비교한 것은 아니다.
- **픽토그램·모션 보존의 수준:** 앞서 확인한 map-live.js의 공통 categoryIcon 사용과 map-refresh.css의360ms·scale1.4·translateY(−10px)·reduced-motion 선언이 유지되는 코드 근거는 있다. 실제 동작/앵커 유지와 최신 Figma SVG 동일성은 미확인이다.
- **홈 하단 가림:** 초기 캡처에서 부유 내비가 카테고리 일부를 가린다. 앞선 home-scrolled-after에서는 두 행과 최근 목록의 노출이 확인되어 영구적으로 접근 불가라고 단정하지 않는다. 정적 스크롤 위치의 노출 확인과 실제 클릭/키보드 접근성 검증은 구분한다.
- **기타 범위 밖 관측:** 저장 검색 지우기 버튼은 이전 코드에서28px 선언이 관측되었으나 별도 실제 rect/조작 검증이 없다. 현재 기본 화면 컴포넌트 통과를 숨김 버튼을 포함한 전체 상태의 터치 영역 통과로 확대하지 않는다.

## 자동 검사와 작업 경계

이번 최종 단계에서는 요청대로 자동 검사를 반복 실행하지 않았다. 이전 독립 평가 단계에서 직접 실행한34개 통과 기록이 있으며, 마지막 세 수치 보정 후34개 재통과는 구현 대화에서 전달받은 결과다. 이를 이번 평가자가 재실행한 결과로 쓰지 않는다. 어느 경우에도 해당 자동 검사는 실제 인터랙션 전체·합성 대비·Figma 검증을 대체하지 않는다.

이번에는 `docs/wk9-independent-final.md`만 새로 작성했다. 앱 코드·DESIGN.md·이전 두 평가·다른 문서·sources/·캡처는 수정하지 않았다. 서버/UI 조작·GitHub 업로드·배포는 수행하지 않았다. 확인된 세 수치 보정의 평가를 여기서 마무리하며 위 미확인 범위는 완료로 전환하지 않는다.
