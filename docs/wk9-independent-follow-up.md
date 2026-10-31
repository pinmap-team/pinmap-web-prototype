# 9주차 독립 후속 평가

평가일: 2026-10-31 (Asia/Seoul). 대상: 로컬 작업 트리의 홈·지도·저장목록, 402×874.

**18행 판정: 통과 12 / 실패 3 / 판단 불가 3.** 통과는 각 행에서 명시한 측정 대상에 한정한다. 전 화면·모든 상태의 합격 선언이 아니다. 최초 평가 원문 `wk9-independent-evaluation.md`는 보존하며, 이 문서는 보정 후 자료에 대한 새로운 판단이다. 기존 실패 중 개선된 부분이 많지만 홈 일정행의 잔여 padding과 검색창의 엄밀한 캡슐 수치가 남아 있다. 마지막 홈 갱신에서 카테고리 색과 행간 겹침은 해소되었다.

## 자료와 비교의 한계

기준 규칙은 `DESIGN.md`, `tokens.css`, `components/index.md` 및 Button/Input/Card/Map 계약이다. 현재 DESIGN 변경은 cascade 설명 및 평가 상태/링크 정리이며 이번 판정의 수치 기준을 완화한 변경은 아니다. `docs/wk9-follow-up.md`의 구현자 판정은 채택하지 않고 제공된 이미지·수치·코드를 직접 대조했다.

이하 `F/`는 `../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/`, `A`는 `design-alignment.css`를 뜻한다. 파일 뒤 숫자는 줄 번호이며 JSON은 해당 요소 블록 부근이다. 전/후 열은 이번 제공된 비교 자료를 뜻하며 최초 평가의 PNG와 같은 자료라고 혼동하지 않는다.

- 홈 `home-before/after.png`를 직접 확인했다. 이는 같은 렌더 DOM에서 CSS만 바꾼 정적 비교다. 동작 증거가 아니다. `home-live-after.png`, DOM, metrics를 따로 확인해 실제 앱에서도 날짜·일정 버튼 수치가 보정되었음을 대조했다. 마지막 카테고리 색/행 높이 갱신은 최신 home-after와 home-scrolled-after 정적 자료 및 코드로 확인했다. home-live-after는 이 마지막 갱신 이전 자료이므로 최신 칩 색/좌표의 실제 앱 증거로 사용하지 않는다. 정적 홈 상단 D-11과 live 홈 D-3 차이는 롤링 상태 차이이며 CSS 수정 효과로 해석하지 않는다.
- 지도·저장목록 before/after는 실제 앱 자료다. 지도 카메라와 바깥 브라우저 여백은 같지 않다. 지도 사진 핀/타일 위치의 이동을 CSS 회귀나 보존 증거로 사용하지 않았다. 앱 viewport는 모두402×874다.
- 상위 [README](../../outputs/wk9-fixed-baseline-a49e0a9/README.md)와 [manifest](../../outputs/wk9-fixed-baseline-a49e0a9/manifest.json)는 최초 before가 map-refresh.css 및 design-alignment.css의 이전 URL을 로드했다고 명시한다. 동일 값 별칭 및 빈 오류 숨김 차이라는 제작 기록은 확인했으나 당시 브라우저 응답을 다시 재현하지 않았다. 따라서 before를 a49e0a9의 바이트 동일 실행 결과로 보증하지 않는다. 관측된 전후 수치와 현재 코드의 대응을 판단했다.
- 마지막 갱신된 manifest의 PNG SHA-256 11개 및 코드 SHA-256 4개를 직접 재계산해 모두 일치함을 확인했다. 이것은 자료 식별 확인이며 당시 렌더 과정 전체의 재현성 검증은 아니다.
- JSON의 `images` 배열(src/alt 포함)을 직접 비교했다. 홈23개, 지도19개, 저장목록15개 각각 전후 동일하다. 이미지 바이너리 전체의 무변경이나 CSS 배경이미지까지 보증하는 검사는 아니다.
- 정적 JSON은 일부 요소만 수집한다. 숨겨진 검색 폼·화면 밖 하트도 포함되어 있으므로 이를 모두 가시 화면으로 간주하지 않는다. computed font는 CSS 조합 증거이며 폰트 파일 로드 성공의 별도 증거는 아니다.

## 홈 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| H1 색: 가시 내비·전체보기·오늘·카테고리의 semantic 색 역할 | 내비 #73777D/#202124, 전체보기 #3A3A3A, 오늘 #EFEFF1, 카테고리 #2E2E2E | 최신 정적 after에서 내비 #6B6B70/#111111, 전체보기 #111111, 오늘 #E8E8EA, 카테고리 #111111. 지정된 역할 연결 확인 | 통과 | F/home-before.png, 최신 home-after.png, home-scrolled-after.png 및 각 metrics의 prefchip/내비; A:123–124,131,141,145; DESIGN.md:56–70,156 | 마지막 갱신에서 칩 on-surface 적용. 날짜/내비는 이전 live-after와도 대조했으나 최신 칩 변경의 live 재현은 미확인. 사진/유리 합성 대비를 포함한 전 화면 색 합격은 아님 |
| H2 타입: 날짜 label-md, 요일 body-sm, 대표/섹션 제목 headline-md | 날짜600/800 15/24, 오늘 요일600 12/16. 대표/일정 제목700 22/30 | 날짜600 14/20, 요일400 12/16으로 보정. 대표/일정 제목 조합 유지. 수집된 가시 대상의 조합 일치 | 통과 | F/home-before.png와 home-live-after.png 일정; F/home-before-metrics.json:753 이후 날짜 블록, F/home-live-after-metrics.json:819 이후 날짜 블록; A:143–144,149–151; tokens.css:8–12 | 날짜와 요일의 font 전체 조합 적용. 최근 저장 제목도 최신 F/home-scrolled-after.png와 metrics의 rwtitle에서700 22/30으로 추가 확인. 정적 렌더 증거이며 실제 앱 스크롤 동작 검증은 아님 |
| H3 간격: 4/8/12/16/24/32 | 일정행 gap10, 전체보기9, 요일 padding-top5/gap2 | 각각8,8,4/4로 보정. 다만 일정행 자체 padding은 여전히1px 6px이며 토큰 목록 밖. 모든 내부 간격 정리 완료는 아님 | 실패 | F/home-before/after.png 일정; F/home-live-after-metrics.json:819,1281–1324; A:139–142; DESIGN.md:21,78,157 | 기존 gap/요일 padding은 보정됨. 버튼 기본 padding도 명시적으로0 또는 승인 토큰으로 정리하고 정렬 재확인. 44px 높이는 간격 토큰 개수와 구분 |
| H4 모서리: 홈 카테고리의 일반 버튼sm 또는 완전한 캡슐, 대표 사진 스택 예외 | 칩 높이44/radius18로 캡슐 아님. 대표 사진radius30 | 칩44/radius999로 완전한 캡슐. 대표 사진radius30 유지 | 통과 | F/home-before/after.png 카테고리·사진 스택; F/home-before-metrics.json:1259, F/home-live-after-metrics.json:1325; A:131; components/Card/CONTRACT.md:6; DESIGN.md:86 | 칩 반지름만 보정. 사진 스택 기하 예외 유지. 이 행은 칩과 대표 스택에 한정 |
| H5 컴포넌트: 일정/카테고리44×44 이상, 카테고리 두 행 비중첩 | 일정322×34. 칩44 높이지만 행 시작 간격38으로6px 겹침 | 일정322×44. 최신 칩 두 행 y777.74/829.74, 높이44 →8px 간격. 스크롤 정적 캡처는 y385.74/437.74로 두 행과 최근 목록이 내비 위에 노출됨 | 통과 | F/home-before.png, 최신 home-after.png, home-scrolled-after.png 및 해당 metrics의 cnrow/prefchip; A:132–133,139; home.css:283; components/Button/CONTRACT.md:8 | 명시적 행을44로 보정하고8 간격 유지. 초기 화면에서는 부유 내비가 칩 일부를 가리지만 스크롤된 배치에서 노출 확인. 통과는 크기/행 비중첩/정적 노출에 한정하며 클릭·포커스·실제 스크롤 조작성은 H6 미확인 |
| H6 상태: 키보드·캐러셀·날짜 선택·빈 홈 | 초기 화면만으로 인터랙션 미확인 | 실제 홈 after는 있으나 조작 과정/포커스 복귀/모션 기록 없음. 정적 frozen HTML은 스크립트 제거됨 | 판단 불가 | F/home-before/after/live-after.png 및 각 DOM; DESIGN.md:140–152; A:84–95; components/Card/CONTRACT.md:9–10 | 상태 스타일 존재와 실행 결과를 분리. 키보드·날짜·스와이프·빈 데이터 시나리오 추가 확인 필요 |

## 지도 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| M1 색: 위치/검색 on-surface, 코스 primary, 내비 secondary/primary | 제목/검색 #17191B, 코스 배경#222222, 내비 #73777D/#202124 | 가시 제목/검색#111111, 코스#111111/글자#F4F4F5, 내비#6B6B70/#111111. 카테고리 semantic 색 유지 | 통과 | F/map-before/after.png 상단·코스·내비; F/map-after-metrics.json:27 및 lm-header-search/lm-course-button,1413,1457; A:123–126,134–135; tokens.css:5–7 | 지적된 가시 색 역할 보정. 숨김 검색 close의 #17191B 등 전 상태의 색은 이 통과 범위 밖이며 전체 지도 색 완료를 의미하지 않음 |
| M2 타입: 가시 위치 제목 headline-lg, 카드 label-md, 카테고리/내비 body-sm | 700 28/36,600 14/20,400 12/16 | 같은 조합 유지. 이번 기준 대비 변경 없음 | 통과 | F/map-before/after.png; F/map-after-metrics.json:27, STRONG 및 카테고리 B,1413; A:11,17–21; tokens.css:8–12 | 별도 타입 개선으로 주장하지 않음. 외부 타일·숨김 h1·미수집 예시 위치 라벨까지 승인하지 않음 |
| M3 간격: 제목-카테고리 간격 목록 사용 | 제목 행 끝72, 카테고리 시작77 →5 | 제목 y28/h44, 카테고리 y80 →8. 내부 카테고리 gap8/padding8·12 유지 | 통과 | F/map-before/after.png 헤더; F/map-after-metrics.json:27,137; A:137,97; ui-unify.css:58; DESIGN.md:21,78 | margin-top을 space-sm으로 보정. 검사 대상은 해당 헤더 간격이며 모든 지도 내부 margin/padding 완료를 뜻하지 않음 |
| M4 모서리: 카드md12, 원형 버튼 예외, 검색은 완전한 캡슐 | 이전 평가에서는 카드와 원형 버튼만 확인했고 검색은 닫혀 있었음 | 카드radius12와 버튼50%는 유지/확인. 추가 수집된 검색 폼은 높이44/radius20, 펼친 포커스 캡처도 같은 CSS 사용. 반높이22 미만으로 엄밀한 완전한 캡슐 규칙에는 불일치 | 실패 | F/map-after.png 카드, map-search-focus.png 검색; F/map-after-metrics.json:71,467; ui-unify.css:49; A:60; DESIGN.md:94,158 | 카드·원형은 변경 불필요. 검색에999px 등 충분한 반지름 적용 필요. 이전 통과 범위 밖이던 검색의 추가 발견이며 보정으로 새로 발생했다고 주장하지 않음. metrics 폼 폭45.33은 닫힘 상태이므로 펼침 폭 실측으로 사용하지 않음 |
| M5 컴포넌트: 위치 버튼44, 하트/상세44 비중첩, 사진 정사각형 | 위치154.27×36, 하트/상세44. 캐러셀 약334×113은 코드 계산만 있었음 | 위치154.27×44. 하트/상세44이며 첫 카드 y657.11–701.11 /724.33–768.33로 비중첩. 카드334×112.55, 사진111.22×111.22 직접 수치 확인 | 통과 | F/map-before/after.png 카드·제목; F/map-after-metrics.json:27,467–489 및 lm-carousel-heart/lm-carousel-detail; A:136,67–70; components/Map/CONTRACT.md:4–5 | 위치 버튼 자체 min-height44 적용. 사진/카드 수치는 테두리 안쪽/바깥쪽 차이가 있어 사진과 카드 전체 높이가 완전 동일하다고 쓰지 않음. X/점 없이 기존 제목·하트·저장 시점·주소·화살표 구성 유지 |
| M6 상태: 포커스·검색·하트 저장·마커/캐러셀 연동·모션 | 포커스 outline:none!important 충돌, 실행 확인 없음 | map-search-focus.png에서 검정 포커스 테두리와 같은 행 검색 펼침 확인. CSS 충돌 해결. 하트 영속성·모션·실패/로딩·키보드 전 과정은 미확인 | 판단 불가 | F/map-search-focus.png; F/map-after-dom.txt:28–43,49–64; A:138; ui-unify.css:50; map-live.js:89,151,390; components/Map/CONTRACT.md:7–9 | focus-within에 최종 !important 적용. 특정 포커스 상태가 확인되었다는 부분 성과만 인정하고 전체 상태 통과로 확대하지 않음 |

## 저장목록 — 6행

| 규칙 | 전 | 후 | 판정 | 근거 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| S1 색: 입력on-surface, 미선택secondary, 선택primary/neutral | 입력#292929, 칩#3A3A3E, 선택글자#FFFFFF, 내비#73777D/#202124 | 입력#111111, 칩#6B6B70, 선택#111111/#F4F4F5, 내비#6B6B70/#111111 | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:49–113,599,687; A:123–130; DESIGN.md:56–68 | 해당 역할 연결 보정. 폴더 재질/유리 합성 대비는 별도 미확인 |
| S2 타입: 제목headline-lg, 입력body-md, 폴더/칩label-md, 내비body-sm | 해당 가시 대상은 다섯 조합에 일치 | 700 28/36,400 16/24,600 14/20,400 12/16 유지. 이번 기준 대비 변경 없음 | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:5–113, cf-title 및599; A:10–16,21; tokens.css:8–12 | 기존 일치 상태 유지. 폴더 개수 등 미수집 텍스트까지 전면 승인하지 않음 |
| S3 간격: 바깥24/폴더격자24, 제목행-검색12 | 제목x24, 폴더x28/213·폭161. 다음 행 시작차162.458 | 좌표/크기 동일: 213−28−161=24, 380.458−218−138.458=24. 검색x24/y80 및 padding16/8, gap8 확인 | 통과 | F/saved-before/after.png; F/saved-after-metrics.json:27,247–335; A:3,26,39; ui-unify.css:5; DESIGN.md:78,96 | 검증한 바깥/격자/검색 내부는 유지. 칩 줄의 다른 margin/padding은 포함하지 않음 |
| S4 모서리: 칩은sm 또는 완전한 캡슐, 검색은 완전한 캡슐, 폴더 예외 | 칩44/radius20. 검색50/radius24는 이전 평가에서 수치 미수집 | 칩44/radius999로 해결. 검색은50/radius24 그대로라 반높이25보다1px 작음. 폴더 실루엣 유지 | 실패 | F/saved-before/after.png 필터·검색; F/saved-after-metrics.json:27,71; A:129; ui-unify.css:10; DESIGN.md:94,158; components/Card/CONTRACT.md:6 | 칩 보정은 확인. 검색 반지름을 충분히 크게 하면 작은 수정으로 해결 가능. 1px 수치 불일치이며 시각적 대규모 결함으로 과장하지 않음. 검색은 신규 발견이지 신규 회귀가 아님 |
| S5 컴포넌트: 기본 검색 이름·폴더 버튼·터치 크기·실루엣 | 이름 있는 검색, 폴더161×138.46, 칩최소49.54×44 | 이름/개수/기본 폴더 구성과 크기 유지. 이번 기준 대비 구조 변경 없음 | 통과 | F/saved-before/after.png; F/saved-after-dom.txt:3–41; F/saved-after-metrics.json:71,247–291; collection.js:65–74,235; components/Input/CONTRACT.md:5 | 기본 화면에서 확인한 구성 유지. 검색어 입력 후 지우기 버튼/빈 결과 버튼의 실제 크기는 이 통과 범위 밖 |
| S6 상태: 즉시 필터·Enter·빈 결과·선택/저장 유지 | 초기 전체 pressed만 확인 | saved-empty-result.png에서 입력어와 ‘찾는 콘텐츠가 없어요’, 복귀 버튼 확인. 즉시 반응 시점/Enter 닫힘/복귀 작동/선택/재로드는 없음 | 판단 불가 | F/saved-empty-result.png; F/saved-after-dom.txt:4–19; collection.js:235,283–294,387; components/Input/CONTRACT.md:8–10 | 빈 결과 표현은 부분 확인. 상태 전체 통과는 보류. 빈 결과 캡처의 키보드와 내비 중첩도 보여 실제 키보드 종료/내비 숨김 과정 추가 확인 필요 |

## 보존과 미확인 범위

**사진·구성:** 전후 src/alt 배열 동일과 캡처에서 홈 브런치 사진 스택, 저장 폴더 윤곽·기울어진 사진, 지도 캐러셀 구성이 유지됨을 확인했다. 홈 중심 카드 rect는 전후264×322.07, x69/y150으로 같다. 사진을 바꿔서 개선된 것처럼 해석하지 않는다. 최초 평가 홈의 파스타와 이번 브런치 차이는 비교 집합/추천 상태 차이이며 동일 DOM 전후 비교에서는 브런치가 유지된다.

**픽토그램·모션:** manifest 코드 해시 일치 및 현재 map-live.js:33,55,82의 공통 categoryIcon 사용을 확인했다. 이번 앱 변경 목록에 map-live.js/map-refresh.css는 없으며, map-refresh.css:37–40,107의360ms·1.4배·-10px·reduced-motion 선언은 유지된다. 이것은 코드 보존 근거다. 최신 Figma SVG와의 경로 동일성, 실제 전환 품질, 지도 앵커 유지 및 선택 연동은 실행 확인이 없어 판단 불가다. 지도 카메라 차이 때문에 핀 화면 좌표를 보존 판정에 쓰지 않는다.

**색 대비:** A:152에서 홈 대표 설명 opacity1 보정은 확인했으나 JSON에 opacity 실측은 없다. 사진과 스크림·유리 합성의 최저 대비를 측정하지 않았으므로 4.5:1 통과로 쓰지 않는다. 지도 타일 위 내비와 저장 시점 유리 배지도 같은 제한이 있다. 현재 저장 기본 폴더 캡처는 내부 카드 저장 시점 배지의 증거가 아니다.

**Figma·Dark·넓은 화면:** 최신 Variables 등록·Scope·Light/Dark 모드 연결·Primitive alias·Text/Effect Styles의 실제 객체는 이번에 접근하지 않았다. 미확인이다. CSS Dark 선언 존재와 실제 Dark 렌더 검증은 다르다. manifest에 home-wide-after.png가 추가되어 있으나 이번18행은402×874에 한정했고 해당 넓은 화면의 세부 검증은 수행하지 않았다. 바깥 브라우저 PNG가 넓다는 사실을 넓은 앱 화면 테스트로 세지 않는다.

## 추가 코드/수치 확인과 권고

- 홈 카테고리의 기존6px 겹침은 마지막 갱신에서 해결되었다. 명시적30px 행을44px로 바꿔44+8=52px 시작 간격이 되었으며 최신 정적 metrics도 일치한다. A:112의 auto 행 선언만으로 해결된 것이 아니라 A:132의 명시적 행 보정이 적용된 결과다.
- 최신 정적 after의 카테고리는 최초 비교 전 y745.74/783.74에서 y777.74/829.74로 이동했다. 초기 위치에서는 y797의 부유 내비와 가림이 있다. 새 home-scrolled-after는 화면을392px 스크롤한 배치로 두 행 y385.74/437.74와 최근 목록이 내비 위에 보인다. 따라서 항목이 영구적으로 가려진다고 단정하지 않는다. 정적 DOM이므로 클릭 가능성 및 실제 앱 스크롤/포커스 이동까지 확인한 것은 아니다.
- 홈 최근 저장 제목은 최신 스크롤 캡처에서 y517.74,700 22/30으로 확인된다. 초기 after 화면 밖으로 밀린 것이며 삭제된 것으로 해석하지 않는다. 최신 스크롤 자료도 src/alt 배열이 정적 before와 동일함을 별도 확인했다.
- 지도/저장 검색창의 캡슐 수치 불일치는 이번 추가 측정으로 발견한 기존 값이다. 이전 평가의 카드/필터 중심 통과·실패 범위와 달라졌으므로 총 통과 수 차이를 그대로 개선율로 계산하면 안 된다.
- 저장 지우기 버튼은 ui-unify.css:14/collection.css:342에서28px 지정이 남아 있다. 기본 after에서는 숨김이며 빈 결과 PNG에는 보이지만 별도 rect가 없어 정확한 실제 터치 크기는 미확인이다. 추가 검증 우선 항목이다.

## 자동 검사 — 시각 판정과 별도

작업 중 `node --test tests/*.test.cjs`를 실행했고 마지막 홈 갱신 후에도 다시 실행했다. **34 통과 / 0 실패 / 0 건너뜀**. 테스트는 비동기 버튼 중복 차단/복원, 저장 날짜 경계·이전, 데이터 모드, 에셋 버전, 코드의 토큰 정의 등을 확인한다. 사진/유리 대비, CSS cascade 전체, 키보드 전 과정, 모션, Figma를 검증하는 결과가 아니다. 자동 검사 통과와 표의 미해결 항목은 모순되지 않는다.

이 평가 작업에서는 새 문서 `docs/wk9-independent-follow-up.md`만 작성했다. 시작부터 존재한 DESIGN.md/app.html/design-alignment.css/검증 문서 등의 타 작업 변경을 수정하거나 되돌리지 않았다. 이전 독립 평가와 모든 캡처를 보존했다. 새 서버·UI 조작·업로드·배포는 수행하지 않았다.
