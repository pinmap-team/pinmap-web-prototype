# Pinmap 실제 컴포넌트 목차

현재 앱은 HTML/CSS/전역 JavaScript 함수로 구성된다. 아래 경로는 문서용 계약이며 React 파일이나 import를 새로 만들지 않는다. 공통 값은 ../tokens.css, 최종 공통 스타일은 ../design-alignment.css, 사용 화면은 ../app.html이다.

| 구성 | 실제 구현 | 계약 |
| --- | --- | --- |
| Button | style.css, theme.css, design-alignment.css, button-state.js | [Button](Button/CONTRACT.md) |
| Input / Search | collection.js, map-live.js, detail.js, ui-unify.css | [Input](Input/CONTRACT.md) |
| Card / Folder | CollectionFolder(), cfItem() — collection.js; home.js | [Card](Card/CONTRACT.md) |
| MapMarker / PlaceCarousel / Category | map-live.js, map-refresh.css, ui-unify.css | [Map](Map/CONTRACT.md) |

사용 순서: DESIGN.md → 이 목차 → 해당 계약 → 실제 구현. 새 기능 전 실제 함수명·DOM·이벤트를 확인한다. 문서 경로를 실행 모듈로 import하지 않는다.
