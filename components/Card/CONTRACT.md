# Card / Folder 계약

- 구현: ../../collection.js의 `CollectionFolder({id,title,icon,count,thumbnails,selected,attr})`, `cfItem(x)`; 홈 추천은 ../../home.js.
- CollectionFolder의 기본값: thumbnails=[], selected=false. 실제 함수가 받지 않는 props를 문서에 추가하지 않는다.
- 기존 사진·기울기·폴더 실루엣·저장 데이터·카테고리 순서를 유지한다. 제목/설명/개수는 실제 데이터에서 가져오고 사용자 텍스트를 escape한다.
- 일반 카드 rounded-md, 작은 사진 rounded-sm, 큰 패널 rounded-lg. 폴더 외곽과 홈 대표 사진 스택은 기존 기하 예외.
- 제목 label-md(좁은 카드), 보조 body-sm/secondary; 넓은 홈 대표 제목 headline-md. 사진 위 글자는 불투명 흰색+기존 스크림이며 합성 대비는 별도 검증한다.
- 간격은 space-*; 외부 그림자는 shadow-sm 또는 shadow-md. 투명 재질의 내부 하이라이트는 별도 예외.
- 빈 개발 모드는 새 가짜 데이터를 만들지 않고 기존 빈 레이아웃/첫 저장 안내를 보존한다.
- 검증: 긴 제목 잘림 정책, 사진 비율, 폴더 선택/열기, 검색 후 빈 상태, 이전 저장 시점 보존.

정상 예: cfItem(x)와 공통 savedAgo(x)를 재사용한다.
반례: 현재 날짜로 savedAt을 매번 덮어쓰기; 사진의 원본 콘텐츠를 임의 변경하기; 폴더 CSS를 일반 사각형으로 교체하기.
