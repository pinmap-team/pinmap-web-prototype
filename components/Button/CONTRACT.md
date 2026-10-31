# Button 계약

- 구현: ../../button-state.js, ../../design-alignment.css. app.html에서 map-live.js보다 먼저 로드한다.
- 기존 유형: primary `.filled/.ob-next/.cm-next`, secondary `.outlined/.tonal`, ghost `.textbtn` 및 아이콘 버튼, danger `.dtdelete`와 기존 삭제 확인 흐름.
- 입력: 실제 `<button>`, `disabled`, 접근 가능한 이름. 선택 토글은 `aria-pressed`, 펼침은 `aria-expanded`로 현재 상태를 표시한다.
- 비동기 API: `PinmapButton.run(button, task, busyLabel)` → task의 결과/오류를 그대로 반환한다. pending 중 disabled+aria-busy, 완료/실패 시 원래 disabled 및 aria-label 복원. pending 또는 disabled이면 재실행하지 않는다.
- 상태: default, pressed(:active), focus(:focus-visible), disabled(native), loading(aria-busy + 진행 표시). 오류 문구는 실제 호출부에서 처리한다.
- 크기: 실제 터치 박스 최소 44×44px, 일반 버튼 높이 44/48/56px. 시각적 아이콘 크기는 별도이며 겹치는 가상 터치 영역으로 늘리지 않는다.
- 검증: 키보드 Tab 포커스, Enter 동작, 비활성 클릭 차단, 중복 호출 차단, 성공/오류 후 재사용 가능 여부. 자동 검사 tests/button-state.test.cjs.

정상 예:
```js
await PinmapButton.run(searchButton, () => searchPlaces(query), '장소 검색 중');
```
반례: CSS로만 흐리게 하고 클릭을 허용하기; 로딩 스피너만 보이며 중복 요청하기; 존재하지 않는 React Button을 import하기.
