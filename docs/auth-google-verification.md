# 구글 로그인 검증 — 2026-11-10

- 규칙: 기존 Supabase PKCE 인증과 루트 콜백을 공유하고 기존 로그인 선택·토큰을 유지한다.
- 적용 전: 카카오 버튼만 있으며 Google 호출은 없음.
- 적용 후: 카카오 오른쪽에 Google 버튼 추가. provider=google로 요청하고 동일한 인증 복귀 경로를 사용한다. 이메일 없는 계정의 표시 문구를 공급자 중립적으로 변경했다.
- 판정: Chrome + 실제 번들 Supabase SDK + 모의 Auth 서버에서 Google·Kakao 버튼의 키보드 Enter 실행, PKCE code_challenge, redirect_to, 루트 콜백 및 인증 앱 복귀 검증 통과. 402×874, 1440×960, 다크 모드 캡처를 확인했다.
- 근거: scripts/check-google-auth-browser.cjs. 실제 Google 계정 로그인과 Supabase 공급자 설정은 아직 확인하지 않았으며 공개 배포하지 않았다.
- 전체 테스트: 60개 중 51개 통과, 9개 실패. HEAD 원본을 별도 /private/tmp 폴더로 추출해 동일한 9개 실패를 재현했다. 코스·정렬·escape allowlist의 기존 문제이며 이번 변경과 별개다.
- 기존 scripts/check-auth-browser.cjs는 최신 마이 화면의 로그아웃 선택자와 맞지 않아 중단된다. 해당 스크립트는 변경하지 않고 이번 OAuth 범위를 별도 스크립트로 검증했다.
