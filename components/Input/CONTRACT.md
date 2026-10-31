# Input / Search 계약

- 구현: ../../map-live.js `searchPlaces()`, ../../collection.js 검색 이벤트, ../../detail.js `editSheet()` / `saveSheet()`.
- DOM: 지도 `#lm-search`, `.lm-search-row`, `.lm-header-search`; 저장함 `.cfpage .libsearch`; 수정 입력 `.esinput`.
- 입력 이름은 label 또는 aria-label. placeholder는 힌트이며 이름을 대체하지 않는다.
- 지도 입력창은 같은 상단 행에서 왼쪽으로 확장한다. 카테고리를 아래로 밀지 않는다. 접힘/펼침 돋보기는 24px, 같은 중심이다.
- 지도는 2글자 이상 검색, Enter/돋보기 제출. 로컬 저장 장소 우선; 없을 때 기존 외부 검색 요청. 개발 모드는 데이터 미연결 안내만 제공한다.
- 저장함은 즉시 필터링, Enter로 키보드 닫기. 검색 결과 없음 상태를 정상 처리한다.
- 흰 surface 바탕, body-md, secondary placeholder, primary focus outline. 검색창은 캡슐 예외, 일반 입력은 rounded-md. 서로 다른 높이는 기존 화면 구조를 유지한다.
- 검증: 빈 입력·한 글자·정상 검색·결과 없음, 포커스, 닫기/지우기, 키보드, 검색 아이콘 위치/크기, 로딩 중 중복 차단.

정상 예: 기존 `.libsearch`를 재사용하고 aria-label을 명시한다.
반례: placeholder만 이름으로 쓰기; 검색을 열 때 헤더 행을 추가하기; 새 검색 API를 연결하지 않고 실제 결과라고 표시하기.
