# Pinmap 작업 안내

UI를 만들거나 고치기 전에 [DESIGN.md](DESIGN.md)를 읽는다.

- 디자인 값과 공통 판단은 루트 DESIGN.md, 실제 토큰은 tokens.css를 기준으로 한다. 과거 토큰 조사안과 다르면 루트 명세를 우선한다.
- 기존 구조·사진·폴더 윤곽·메뉴 순서와 저장 데이터를 유지한다. 기존 컴포넌트/함수를 재사용하고 없는 import 경로나 Props를 추측하지 않는다.
- 프로젝트는 일반 HTML/CSS/JavaScript다. index.html은 프레임, app.html은 실제 앱이다. README.md와 CONTRIBUTING.md의 실행·협업 절차를 따른다.
- 실행: `python3 -m http.server 8093 --bind 127.0.0.1` 후 루트에서 프로토타입 버전을 선택한다.
- CSS/JS 변경 후 `python3 scripts/refresh-asset-versions.py`를 실행하고 `node --test tests/*.test.cjs`로 검증한다.
- 모바일 402×874와 넓은 화면에서 수정 부분의 렌더링·입력·키보드 동작을 확인한다.
- 저장 시점은 savedAt과 savedAgo()를 사용한다. 기존 저장 항목과 메모를 삭제하거나 새로고침마다 저장 날짜를 재설정하지 않는다.
- 프로토타입의 예시 AI 요약·분류를 실제 서버 연동으로 표현하지 않는다.
- 작업 브랜치와 PR로 변경한다. main 병합은 연결된 Vercel 공개 배포를 일으킨다.
- 독립 평가를 수행하지 않았다면 완료했다고 쓰지 않는다. 새 판단이나 예외는 DESIGN.md에 근거와 함께 남긴다.

- GitHub 반영·브랜치 업로드·PR 생성은 사용자가 최종 반영을 명시적으로 요청할 때만 수행한다. 그전에는 로컬 미리보기에서 수정한다.
