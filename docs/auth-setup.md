# 이메일 · 카카오 · 구글 로그인 연결

2026-11-09 로컬 구현. 실제 Supabase 프로젝트의 인증과 메일 발송은 배포 후 확인해야 한다. GitHub 업로드·PR·Vercel 배포는 수행하지 않았다.

## 연결 구조

- `auth.html`: 프레임 밖에서 실행되는 실제 로그인·회원가입·비밀번호 재설정 화면.
- `auth-client.js`: Supabase JS 클라이언트. PKCE, 세션 보관과 자동 갱신을 사용한다.
- `auth-page.js`: 이메일 가입/로그인, 카카오 OAuth, 비밀번호 재설정·변경.
- `api/auth/config.js`: Vercel 환경 변수에서 브라우저용 URL·공개 키만 전달한다.
- `auth-app.js`: 개발 테스트 버전의 로그인 상태 확인, 로그인 계정 표시, 실제 로그아웃. 프로토타입 체험 모드와 기존 저장 데이터는 유지한다.
- `entry-router.js`: Supabase가 루트 Site URL로 돌려보낸 code/error/token을 `auth.html`로 전달한다.
- `vendor/supabase.js`: 공식 `@supabase/supabase-js` 2.119.0 UMD 배포본. MIT 라이선스는 `vendor/supabase-LICENSE.txt`.

로그인은 버전 선택 화면의 ‘이메일 · 카카오로 로그인하기’ 또는 개발 테스트 버전에서 시작한다. 인증 성공 후 빈 개발 모드 앱으로 진입한다. 구글 버튼과 OAuth 호출도 연결했으며, 실제 사용에는 Google Cloud와 Supabase의 공급자 설정이 필요하다. 가입·로그인은 저장 콘텐츠의 계정별 DB 동기화와 별개다. 개발 모드의 기존 빈 데이터 정책과 프로토타입의 기존 브라우저 저장을 바꾸지 않았다. 회원 탈퇴는 구현하지 않았으며, 실제 계정에 기존 체험용 데이터 삭제 동작을 실행하지 않는다.

## Vercel

Production(미리보기에서도 테스트하면 Preview 포함)에 다음 두 변수를 등록한다.

| 변수 | 값 |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` 공개 키 |

잘못 등록된 `https://<project-ref>.supabase.co/rest/v1/`도 서버에서 프로젝트 origin으로 정규화한다. 임의 하위 경로, HTTP 주소, URL 내 계정/비밀번호/쿼리는 거부한다. Secret key와 service_role JWT는 전달하지 않는다. 카카오 로그인 Client Secret은 Supabase에만 둔다. 지도 SDK 키는 별개다.

## Supabase

Authentication → Sign In / Providers:
- 신규 가입 허용, Email 활성화, Confirm email ON.
- Kakao 활성화. Client ID = 카카오 REST API 키, Client Secret = 카카오 로그인 Client Secret.
- 카카오 이메일 권한 없이 테스트한다면 Allow users without an email ON.

Authentication → URL Configuration:
- Site URL: `https://pinmap-prototype.vercel.app`.
- 이 구현은 `redirectTo`와 `emailRedirectTo`로 동일 출처 루트 `/`를 사용한다. 별도의 `/auth/callback` 경로는 요구하지 않는다.
- 로컬 테스트도 한다면 Redirect URLs에 `http://127.0.0.1:8095/` 추가. 다른 포트는 실제 포트와 일치시킨다.
- PKCE 이메일 인증·재설정 링크는 요청했던 브라우저에서 연다. 다른 브라우저나 만료 링크는 새 링크 요청 안내로 처리한다.
- 실제 일반 사용자에게 가입/재설정 메일을 발송하려면 Custom SMTP를 설정하고 발송 테스트를 수행한다. 기본 발송 서비스의 제한을 실제 출시용 메일 발송으로 간주하지 않는다.

## 카카오

기존 지도용 Pinmap 앱을 사용할 수 있다.
- 카카오 로그인 사용 설정 ON.
- 사용할 REST API 키의 카카오 로그인 리다이렉트 URI에 Supabase의 `https://<project-ref>.supabase.co/auth/v1/callback` 등록.
- 카카오 로그인 Client Secret 활성화.
- 사용할 닉네임·프로필 이미지 동의항목 확인. 이메일 미제공 허용은 Supabase에서 별도 설정.
- 이번 OAuth 연결에는 OpenID Connect를 추가하지 않는다.

## 로컬 실행

`.env.example`을 `.env.local`에 복사하고 실제 값을 직접 입력한다. 실제 키는 커밋하거나 검증 캡처에 넣지 않는다.

```sh
node --env-file=.env.local scripts/dev-auth-server.cjs
```

`http://127.0.0.1:8095/auth.html`에서 확인한다. 일반 Python 정적 서버는 `/api/auth/config`를 실행하지 않으므로 실제 로그인 대신 연결 대기 안내가 나온다.

## 배포 후 필수 확인

1. `/api/auth/config`가 프로젝트 origin과 공개 키만 반환하는지 확인.
2. 이메일 가입 → 메일 수신 → 같은 브라우저에서 인증 링크 → 로그인.
3. 잘못된 비밀번호와 미인증 이메일의 오류 안내.
4. 비밀번호 재설정 메일 → 새 비밀번호 변경 → 새 비밀번호 로그인.
5. 카카오 로그인 → 동의 → 앱 복귀. 취소/만료 시 재시도 가능 여부.
6. 마이 → 계정에서 실제 이메일 또는 카카오 로그인 안내 확인.
7. 새 탭의 로그인 복원, 로그아웃 후 다른 탭의 접근 차단.
8. 기존 프로토타입 체험 저장 데이터 유지, 라이트·다크·모바일 입력 확인.

## 공식 문서

- [Supabase 이메일/비밀번호](https://supabase.com/docs/guides/auth/passwords)
- [카카오 연결](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao)
- [리다이렉트 URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

로컬 자동 검증과 브라우저 재현 방법은 [auth-verification.md](auth-verification.md)에 기록했다.

## 화면 검토용 시작 순서 (최신)

루트 `/`에서 개발 테스트·프로토타입 체험·로그인 테스트 중 고른다. 개발 테스트는 로그인 없이 빈 화면으로 진입하고, 로그인 테스트만 `auth.html?screen=welcome`로 진입한다. 로그인 완료 후 실제 세션이 필요한 앱은 `index.html?mode=development&auth=required`로 연다. 이는 서버 데이터 동기화 구현과 별개이며 기존 프로토타입 데이터는 유지한다.

## 구글 로그인 (2026-11-10)

1. Google Cloud → Google Auth Platform에서 프로젝트를 선택하고 Branding, Audience, Data Access를 설정한다. 기본 범위는 openid, userinfo.email, userinfo.profile이다.
2. Clients → Create client → Web application. Authorized JavaScript origins에 `https://pinmap-prototype.vercel.app`과 필요한 로컬 테스트 주소를 등록한다.
3. Authorized redirect URIs에는 Supabase Google 화면의 Callback URL을 그대로 등록한다. 현재 프로젝트: `https://tgwryxkdhkkqvmhuyzse.supabase.co/auth/v1/callback`.
4. Client ID와 Client Secret을 Supabase → Authentication → Sign In / Providers → Google에 입력하고 Enable Sign in with Google을 켜서 저장한다. Secret은 저장소나 브라우저 코드에 넣지 않는다.
5. Supabase Site URL 및 Redirect URLs는 기존 설정을 공유한다. Vercel에 구글 전용 변수를 추가할 필요는 없다.
6. 로그인 테스트에서 구글 버튼 → 계정 선택 → 동의 → 핀맵 복귀를 실제 계정으로 확인한다. 테스트 대상은 Google Auth Platform Audience에서 확인한다.

공식 안내: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
