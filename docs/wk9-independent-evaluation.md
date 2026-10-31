# 9주차 독립 평가 — 고정 기준 a49e0a9

평가일: 2026-10-31 (Asia/Seoul). 대상: 홈·지도·저장목록(컬렉션 기본 폴더 화면), 앱 프레임 402×874.

**18개 평가행: 통과 5 / 실패 10 / 판단 불가 3.** 이는 아래 행 단위 집계이며 개별 위반 개수나 전체 앱 합격률이 아니다. 실패는 현재 명세와의 불일치이며 이번 평가에서 생긴 회귀라는 뜻이 아니다. 구조를 크게 바꾸기보다 기존 스타일의 우선순위와 누락된 토큰 연결을 먼저 정리할 필요가 있다.

## 기준과 방법

- 로컬 HEAD는 `a49e0a9e270374be80bb03575b44cdc7c04bc4d5`, 시작 시 작업 트리는 깨끗했다. 앱 코드·DESIGN.md·sources/는 수정하지 않았다. 이 문서만 작성했다. 서버 실행, UI 조작, GitHub 업로드, 배포는 하지 않았다.
- 규칙은 `DESIGN.md`, `tokens.css`, `components/index.md`, Button/Input/Card/Map의 CONTRACT.md를 직접 읽었다. 구현자의 `docs/wk9-verification.md` 판정은 근거로 사용하지 않았다.
- 아래 세 PNG를 직접 열어 시각 확인하고 같은 이름의 DOM 및 metrics JSON을 대조했다. PNG는 바깥 미리보기까지 포함하므로 전체 이미지 크기를 앱 크기로 오인하지 않았다. JSON의 viewport는 402×874이며 rect는 앱 내부 좌표다.
- **적용 전은 제공된 고정 기준, 적용 후는 이번 평가 종료 시점**을 뜻한다. 이번에는 시각 변경이 없고 별도 after 캡처도 만들지 않았다. 모든 행의 ‘이번 기준 대비 변경 없음’은 수정 완료 주장이 아니다. 이전 보정 전 자료와의 개선량은 근거 부족으로 평가하지 않는다.
- DOM은 접근성 트리이고 JSON은 일부 요소만 수집한 자료다. 숨김 요소·화면 밖 카드도 포함한다. 목록에 있다고 모두 화면에 보인다고 간주하지 않는다. computed font는 CSS 서체 선언을 확인하지만 실제 폰트 파일 로드 성공까지 입증하지 않는다.
- 표의 통과는 명시한 범위의 정적 적합성에 한정한다. 사진/유리 합성 대비, 실제 인터랙션, Dark 화면, 최신 Figma 내부 설정은 별도 미검증이며 통과에 포함하지 않는다.

### 고정 캡처

- [홈 캡처](../../outputs/wk9-fixed-baseline-a49e0a9/home-before.png)
- [지도 캡처](../../outputs/wk9-fixed-baseline-a49e0a9/map-before.png)
- [저장목록 캡처](../../outputs/wk9-fixed-baseline-a49e0a9/saved-before.png)

이하 `B/`는 `../../outputs/wk9-fixed-baseline-a49e0a9/`, 파일 뒤 `:숫자`는 해당 파일의 줄 번호다. 캡처 내 위치는 앱 내부 기준으로 서술한다. JSON 줄 번호는 해당 요소 블록 시작 부근을 가리킨다.

## 홈 평가

| 규칙 | 적용 전 | 적용 후 | 통과·실패·판단 불가 | 근거 캡처 및 파일·라인 | 수정 제안 |
| --- | --- | --- | --- | --- | --- |
| H1 색 — 9개 semantic 역할, 미선택 메뉴 secondary | 하단 미선택 글자 #73777D, 선택 #202124로 각각 #6B6B70/#111111과 다름. D-3은 #EF4D4D 바탕·#111111 글자로 규칙에 맞지만 화면 전체 색 일치는 아님 | 이번 기준 대비 변경 없음 | 실패 | home-before.png 하단 메뉴·상단 D-3; B/home-metrics.json:1496,1454; map-refresh.css:184–185; DESIGN.md:61–70,156; tokens.css:5–7 | 메뉴 색을 semantic 참조로 연결. 유리 alpha·blur와 사진은 유지하고 합성 대비를 따로 측정 |
| H2 타입 — 다섯 크기/줄높이/굵기 조합 | 대표 제목 700 22/30과 일정 제목은 일치. 날짜는 600 또는 800 15/24, 오늘 요일 600 12/16, 최근 저장 제목 700 17/24로 규칙 밖 | 이번 기준 대비 변경 없음 | 실패 | home-before.png 일정·최하단 제목; B/home-metrics.json:782–844,1412; home.css:84,182,222–223; design-alignment.css:107–109; DESIGN.md:16–20,74,159 | 날짜와 최근 목록 제목의 역할을 정하고 font 전체 조합 적용. 현재 요일의 굵기 덮어쓰기 제거 또는 승인된 규칙으로 명시 |
| H3 간격 — 4/8/12/16/24/32, 바깥 24 | 상단 strip x=24, 항목과 닫기 사이 8은 일치. 일정 행 gap=10, 요일 padding-top=5·gap=2, 전체보기 gap=9는 목록 밖 | 이번 기준 대비 변경 없음 | 실패 | home-before.png 일정; B/home-metrics.json:761–802,1223; home.css:46,83; DESIGN.md:21,78,157; design-alignment.css:99–104 | 일정 내부 gap/padding을 가장 가까운 토큰으로 조정. 사진 스택 좌표는 기하 예외와 구분 |
| H4 모서리 — 일반 버튼 sm, 원·완전한 캡슐·사진 스택 예외 | 홈 카테고리 버튼 높이44/radius18. 반높이22에 못 미쳐 완전한 캡슐도 아니고 sm8도 아님. 대표 사진 스택 radius30은 Card 계약의 기하 예외이므로 실패 근거에서 제외 | 이번 기준 대비 변경 없음 | 실패 | home-before.png 카테고리·대표 사진; B/home-metrics.json:1265–1283; DESIGN.md:86,158; components/Card/CONTRACT.md:6 | 작은 버튼은 sm로 맞추거나 현재 캡슐 의도를 유지하려면 충분히 큰 반지름 적용. 대표 사진 스택은 보존 |
| H5 컴포넌트 — 실제 버튼 44×44 이상, 겹치지 않음 | 검색/알림44×44와 strip44 높이는 충족. 일정의 두 cnrow는 각각322×34로 10px 부족 | 이번 기준 대비 변경 없음 | 실패 | home-before.png 일정 두 행; B/home-metrics.json:1223–1262; B/home-dom.txt:58–63; home.css:86; design-alignment.css:104; components/Button/CONTRACT.md:8 | .calw .cnrow의 높은 선택자 우선순위 때문에 min-height44가 밀림. 최종 계층에서 실제44 높이를 확보하고 카드 전체 높이·인접 영역 재확인 |
| H6 상태 — 키보드 포커스, 날짜 선택, 캐러셀·빈 홈 동작 | 캡처에는 오늘과 마감 점, 추천 스택이 보임. 클릭·스와이프·포커스 이동·빈 홈은 정지 화면으로 확인 불가 | 이번 기준 대비 변경 없음 | 판단 불가 | home-before.png; B/home-dom.txt:21–63; DESIGN.md:140–152; design-alignment.css:84–95; components/Card/CONTRACT.md:9–10 | 키보드/스와이프 및 빈 데이터 시나리오를 별도 실행. 이번 코드 테스트 결과를 UI 동작 통과로 대체하지 않음 |

## 지도 평가

| 규칙 | 적용 전 | 적용 후 | 통과·실패·판단 불가 | 근거 캡처 및 파일·라인 | 수정 제안 |
| --- | --- | --- | --- | --- | --- |
| M1 색 — 제목/아이콘 on-surface, 행동 primary, 메뉴 secondary | 제목·검색 #17191B, 코스 바탕 #222222, 하단 메뉴 #73777D/#202124로 토큰과 다름. 카테고리 #6B6B70/#111111은 일치 | 이번 기준 대비 변경 없음 | 실패 | map-before.png 상단·우측·하단; B/map-metrics.json:26–65 및 lm-course-button 블록; map-live.css:1; ui-unify.css:87; map-refresh.css:184–185; DESIGN.md:56–70,156 | 기존 모양을 유지하고 실제 우선하는 !important 선언까지 토큰에 연결. 지도 타일 그래픽 색은 앱 UI와 구분 |
| M2 타입 — 보이는 위치 제목 headline-lg, 좁은 카드 제목 label-md, 카테고리/내비 body-sm | 위치 제목700 28/36, 카드 제목600 14/20, 카테고리와 내비400 12/16 확인. 이 행은 수집된 가시 텍스트에 한정 | 이번 기준 대비 변경 없음 | 통과 | map-before.png 상단·카드·내비; B/map-metrics.json:26–44, 카테고리 B 및 첫 STRONG 블록,1055; design-alignment.css:11,17–21; tokens.css:8–12 | 이 조합 유지. 숨김 h1·예시 위치 라벨 등 미수집/별도 텍스트를 포함한 화면 전체 타이포 완료로 확대하지 않음 |
| M3 간격 — 내부 간격 토큰, 승인된 캐러셀 스냅28 예외 | 제목 행 y28/h44의 끝72에서 카테고리 y77까지5px. 카테고리 내부 gap8/padding8·12는 일치. 5px 상단 간격은 허용 목록 밖 | 이번 기준 대비 변경 없음 | 실패 | map-before.png 헤더; B/map-metrics.json:47–65 및 selected 블록; ui-unify.css:58; design-alignment.css:97; DESIGN.md:21,78,174 | margin-top5를 토큰값으로 조정하고 헤더 경계 밑줄 위치 재확인. 28px 스냅 여백은 유지 |
| M4 모서리 — 콘텐츠 카드 md12, 지도 원형 버튼·마커 예외 | 보이는 가로 카드의 둥근 사각형과 원형 지도 버튼/사진 배지가 명세 형태와 일치. 최종 CSS는 카드12, 버튼50%로 지정 | 이번 기준 대비 변경 없음 | 통과 | map-before.png 하단 카드·우측 버튼·사진 배지; design-alignment.css:43; ui-unify.css:69,87; map-refresh.css:35–38; B/map-metrics.json의 lm-course-button/lm-round radius50%; DESIGN.md:86 | 유지. JSON에는 카드 컨테이너 radius가 없어 12px은 최종 CSS 근거이며 직접 computed 측정으로 오인하지 않음 |
| M5 컴포넌트 — 위치 선택도44×44 이상; 캐러셀 사진·하트·상세 유지 | 위치 제목 버튼154.27×36으로 높이8 부족. 하트/상세는44×44이며 첫 카드 기준 y657.11–701.11 / y724.33–768.33으로 겹치지 않음. 카드·사진·화살표와 X/점 없음은 확인 | 이번 기준 대비 변경 없음 | 실패 | map-before.png 위치 제목·하단 카드; B/map-metrics.json:26–44,425–443,488–506; B/map-dom.txt:28–54; design-alignment.css:57,67–70; components/Button/CONTRACT.md:8; components/Map/CONTRACT.md:4–5 | 부모 행44만으로 자식 버튼44가 되지 않음. 위치 제목 버튼 자체 min-height44 확보. 캐러셀 구성을 유지 |
| M6 상태 — 검색 펼침/포커스, 하트 영속성, 마커·캐러셀 연동과360ms 모션 | ‘전체’ pressed, 예시 위치, 하트 pressed 데이터는 존재. 실제 전환·저장 후 재로드·DOM 앵커 유지·reduced-motion 실행 결과는 없음 | 이번 기준 대비 변경 없음 | 판단 불가 | map-before.png; B/map-dom.txt:10–11,32,63; map-live.js:81–89,151,390; map-refresh.css:37–40,107; components/Map/CONTRACT.md:7–9 | 동작을 별도 검증. 특히 ui-unify.css:50의 focus-within outline:none!important가 최종 공통 포커스를 막는 코드상 위험을 먼저 해소하고 키보드 확인 |

## 저장목록 평가

| 규칙 | 적용 전 | 적용 후 | 통과·실패·판단 불가 | 근거 캡처 및 파일·라인 | 수정 제안 |
| --- | --- | --- | --- | --- | --- |
| S1 색 — 입력/필터/메뉴 semantic 연결 | 입력 color#292929, 비선택 칩#3A3A3E, 내비#73777D/#202124. 폴더 제목#111111은 일치하지만 화면 색 연결은 미완료 | 이번 기준 대비 변경 없음 | 실패 | saved-before.png 검색·필터·하단; B/saved-metrics.json:26–86,551,635; ui-unify.css:12; collection.css:21; map-refresh.css:184–185; DESIGN.md:61,156 | 입력 on-surface, 비선택 필터 secondary 등 역할대로 연결. 유리 재질은 유지하며 최종 대비 별도 확인 |
| S2 타입 — 제목 headline-lg, 입력 body-md, 폴더·칩 label-md, 내비 body-sm | 수집된 텍스트는700 28/36,400 16/24,600 14/20,400 12/16에 각각 일치 | 이번 기준 대비 변경 없음 | 통과 | saved-before.png; B/saved-metrics.json:5–86,257–275,551; design-alignment.css:10–16,21; tokens.css:8–12 | 유지. 폴더 개수 등 미수집 요소와 실제 폰트 로드 성공까지 일괄 통과하지 않음 |
| S3 간격 — 바깥24, 폴더 격자24, 제목-검색12 | 제목 x24. 폴더 x28/w161, 다음 x213 → 가로24. 다음 행 y380.458−(218+138.458)=24. 폴더 추가4px inset은 space-xs. 제목 행40과 margin12, 검색 y80의 구조가 CSS와 캡처에 부합 | 이번 기준 대비 변경 없음 | 통과 | saved-before.png 제목·폴더 격자; B/saved-metrics.json:5–23,215–296; design-alignment.css:3,26; ui-unify.css:5; DESIGN.md:78,96 | 검증한 격자/바깥/제목 간격 유지. 칩 줄의 별도 padding·음수 margin 등 전 화면 간격 모두를 승인한 것은 아님 |
| S4 모서리 — 일반 버튼sm, 완전한 캡슐 예외; 폴더 실루엣 유지 | 칩 높이44/radius20으로 일반 버튼sm8도 완전한 캡슐22 이상도 아님. 폴더 외곽20은 기존 실루엣 예외로 제외 | 이번 기준 대비 변경 없음 | 실패 | saved-before.png 필터·폴더; B/saved-metrics.json:47–86,236–254; DESIGN.md:86,158; components/Card/CONTRACT.md:6; design-alignment.css:116 | 칩을 sm 또는 완전한 캡슐로 명확히 적용. 폴더 외곽·사진 기울기는 보존 |
| S5 컴포넌트 — 이름 있는 검색·실제 폴더 버튼·기존 실루엣 | searchbox ‘저장한 콘텐츠 찾기’, 새 폴더·각 폴더의 이름/개수 제공. 폴더161×138.46, 수집 칩 최소49.54×44로 터치 크기 충족. 사진이 삽입된 폴더 형태 확인 | 이번 기준 대비 변경 없음 | 통과 | saved-before.png; B/saved-dom.txt:3–41; B/saved-metrics.json:47–254; collection.js:65–74,198,235; components/Input/CONTRACT.md:5; components/Card/CONTRACT.md:5 | 현재 기본 화면 구성 유지. 숨겨진 지우기 버튼이나 폴더 내부 카드까지 이 통과 범위에 포함하지 않음 |
| S6 상태 — 즉시 검색·Enter·선택·빈 결과·저장 시점 보존 | 초기 ‘전체’ pressed와 폴더 수만 확인. 검색어/빈 결과/선택 모드/폴더 내부 저장 시점 배지는 캡처에 없음 | 이번 기준 대비 변경 없음 | 판단 불가 | saved-before.png; B/saved-dom.txt:4–19; collection.js:235,283–294,387; components/Input/CONTRACT.md:8–10; components/Card/CONTRACT.md:10 | 검색·지우기·Enter·선택/해제·리로드를 별도 확인. savedAgo 단위 테스트를 저장 UI 전체 동작으로 확대하지 않음 |

## 추가 발견과 측정 한계

1. **최종 파일이 마지막에 로드된다는 사실만으로 통합이 보장되지 않는다.** 홈 `.calw .cnrow`는 더 높은 선택자 우선순위로 높이34를 유지한다. 지도 위치 버튼은 부모44 높이를 상속하지 않아36이다. 내비 색과 지도 버튼 재질/그림자는 앞 파일의 `!important`가 남는다. 실제 값이 기준이다.
2. **그림자도 전면 통과가 아니다.** 저장 칩의 JSON shadow는 `0 1px 2px .04 + 0 4px 12px .05`로 shadow-sm의 `0 1px 2px .04 + 0 8px 24px .06`과 다르다 (`collection.css:21`, `tokens.css:15`). 지도 현위치 버튼은 `ui-unify.css:20`의 `box-shadow:0 3px 12px #1112!important`가 `design-alignment.css:49`보다 우선한다. 이는 일반 부유 요소 외부 그림자라 재질 내부 하이라이트 예외로 자동 승인할 수 없다.
3. **사진/유리 합성 대비는 판단 불가.** 실제 최종 합성 배경의 텍스트별 최저 대비를 측정하지 않았다. 홈 스크림이 눈으로 어두워 보이거나 토큰끼리 대비가 높다고 4.5:1 통과로 쓰지 않는다. 저장 시점 유리 배지는 현재 폴더 기본 화면에 나오지 않는다. 해당 내부 카드 캡처가 추가로 필요하다. `home.css:215`에는 대표 설명 opacity .88도 남아 있어 `DESIGN.md:161`의 불투명 흰색 요구와 코드상 충돌한다. 기존 스타일 전체에서 최종 opacity를 별도 확인한 뒤 보정해야 한다.
4. **검색 포커스는 코드상 충돌이 있다.** 지도 `ui-unify.css:50`은 outline을 `none!important`로 지우고 입력도 같은 파일51행에서 outline0!important다. `design-alignment.css:84–86`이 존재한다는 이유로 지도 검색 포커스를 통과시킬 수 없다. 현재 검색은 닫힌 상태이므로 실제 포커스 표시의 결과는 M6 판단 불가로 유지한다.
5. 홈 하단 카테고리 일부 및 저장목록 마지막 폴더는 부유 내비에 가려져 보인다. 정지 화면만으로 스크롤 후 접근 가능성이나 최종 콘텐츠 padding 부족을 확정하지 않는다. 별도 스크롤 확인이 필요하다.

## 이미지·캐러셀·픽토그램·모션 보존

- **이번 기준 대비 변경 없음:** 앱/에셋을 편집하지 않았으므로 이번 평가로 인한 사진 교체, 폴더 윤곽 변경, 메뉴 재배치, 모션 삭제는 없다. 기준 이전 원본과의 동일성은 별도 비교 자료 부족으로 확정하지 않는다.
- 홈 캡처에서 파스타 중심 사진, 양옆 사진 스택, 점 표시를 직접 확인했다. 지도 계약의 ‘점 없음’은 지도 캐러셀에만 적용하므로 홈 점을 잘못된 변경으로 판정하지 않았다.
- 지도 캡처는 왼쪽 사진과 오른쪽 제목/하트/저장 시점/주소/상세 화살표 구성을 보여준다. `ui-unify.css:63–71`에서 높이는 clamp(108px,28vw,132px), 402px 기준112.56px이며 사진은 aspect-ratio1/1이다. 28px 양쪽 여백을 가정한 트랙 콘텐츠346px에서 카드 폭은334px이다. 이는 코드 계산이며 카드/이미지 bounding box 실측값으로 쓰지 않는다. 캡처에서는 오른쪽 다음 카드가 드러나고 왼쪽 이전 카드는 보이지 않는다. 초기 첫 카드의 경계 상태인지 모든 위치에서 한쪽만 보이는지 정지 자료로 확정할 수 없다.
- `map-live.js:33,55,82`에서 상단 카테고리와 사진 서브 배지가 같은 `categoryIcon()`을 호출함을 확인했다. 캡처에서도 음식/카페/전시/자연/의류 도형이 보인다. **최신 Figma 원본 SVG와의 경로 동일성은 미검증**이다.
- `map-refresh.css:37–40,107`의360ms·scale1.4·translateY(-10px) 및 reduced-motion 선언, `map-live.js:89`의 클래스 토글은 코드로 확인했다. 실제 모션 품질, DOM/지도 앵커가 전체 상호작용에서 유지되는지, 카드 넘김과 지도 이동 동기화는 실행하지 않았으므로 판단 불가다.

## 자동 검사 — 시각 평가와 분리

2026-10-31 로컬 기준에서 `node --test tests/*.test.cjs` 실행: **34 통과, 0 실패, 0 건너뜀**.

- `tests/button-state.test.cjs`: 중복 실행 차단 및 성공/실패 후 복원에 대한 테스트 통과. 모든 화면 버튼의 실제 키보드/포커스/서버 동작 통과를 뜻하지 않는다.
- `tests/saved-time.test.cjs`: 한국 날짜 경계·미래값·이전 데이터 이전·정렬 관련 테스트 통과. 현재 화면의 저장 배지 시각/합성 대비를 검증하지 않는다.
- `tests/design-tokens.test.cjs:6–13`: 역할 개수9+5+6+3+2, Light/Dark 색 키, 일부 단색 대비 및 폰트 선언 검사 통과. 구현상 각 색값이 DESIGN.md에 등장하는지 확인하므로 모든 역할 매핑·cascade·전체 화면 사용을 증명하는 테스트가 아니다.
- 나머지 에셋 버전·예시/개발 데이터·코스·escape·지도 스타일 테스트도 통과했다. 테스트 수와 표의18개 시각 평가행은 서로 다른 집계다.

## 미완료 범위와 권장 순서

**최신 Figma Variables 등록 수, Scope, Light/Dark 모드 연결, Primitive alias, Text/Effect Styles 실제 객체는 이 평가에서 접근·검증하지 않았다. 완료로 표시할 수 없다.** CSS의 Dark 선언 존재와 실제 Dark 화면 적합성도 구분한다. 넓은 화면 역시 이번 캡처 범위 밖이다.

우선 홈 일정 버튼34→44 및 지도 위치 버튼36→44의 실제 터치 영역을 확보하고, 검색 포커스 충돌을 확인한다. 다음으로 색·타이포·간격·칩 모서리·외부 그림자의 기존 선언을 토큰에 연결한다. 마지막으로 밝은 사진/유리별 합성 대비와 인터랙션을 별도 검증한다. 사진·캐러셀 구성·폴더 실루엣·픽토그램·모션은 보존하는 범위의 수정 제안이며, 이번 문서 작성 중에는 어느 수정도 적용하지 않았다.
