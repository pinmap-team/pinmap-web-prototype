# Figma ↔ 코드 대조 — 25개 역할 정렬 및 재조회 완료

2026-10-31 Figma 데스크톱의 Plugin API로 기존 등록값을 읽고 최신 DESIGN.md/tokens.css와 대조·수정했다. 수정 후 별도 읽기 실행으로 다시 조회하여 **25개 역할 × Light/Dark = 50개 대조를 통과**했다. 실제 Variables 화면 캡처도 보관했다.

## 공식 등록 위치

- 파일: [사용자경험디자인2 (26-2)](https://www.figma.com/design/LdXCdWJrA53sBN9aBgQEDy?node-id=1277-4655), 컴포넌트 페이지의 `Pinmap · WK9 · 25 tokens · Light & Dark` 보드.
- Light: `Pinmap / Tokens 25 / Light` (`VariableCollectionId:1277:4597`).
- Dark: `Pinmap / Tokens 25 / Dark` (`VariableCollectionId:1277:4598`).
- 원본: `Pinmap / Primitives · WK9`. 기존 원본을 재사용하고 빠진 값만 추가했다.
- 텍스트: `Pinmap 25 / typography/`의 5 Text Styles. 그림자: `Pinmap 25 / shadows/{sm,md}/{Light,Dark}`의 4 Effect Styles.

## 모드 제한과 개수의 의미

MCP는 호출 한도로 사용할 수 없었고, 데스크톱에서 기존 두 번째 모드를 수정할 때 `cannot modify modes beyond limit of 1` 오류가 발생했다. 따라서 **한 컬렉션 안의 두 모드가 아니라, Light/Dark 별도 단일 모드 컬렉션**으로 등록했다. 양쪽 모두 색상 역할은 9개다. 기존 Workshop 컬렉션은 Archive로 구분하고 이전 시안의 연결을 보존했다. 다른 과거 컬렉션과 기존 카테고리 컴포넌트는 삭제하지 않았다.

논리적 토큰은 25개다. 네이티브 변수는 각 컬렉션25개씩 총50개이며, 이 중 타이포5개는 글자 크기 보조 변수, 그림자2개는 CSS 내보내기용 문자열이다. **전체 타이포는 Text Style, 실제 그림자는 Effect Style로 사용한다.** 원본43개는 과거 값과 그림자 알파도 포함하므로 ‘색상 역할9개’와 같은 개념이 아니다. 동일 HEX를 공유하는 서로 다른 semantic 역할은 유지한다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 색상 역할과 값 | 각9개, 두 테마 모두 CSS 값 일치 |
| Primitive → Semantic | 50개 alias의 원본을 재귀 해석, 누락·순환 없음 |
| Scope | 색상 fill/stroke, border stroke, 간격 GAP, 모서리 CORNER_RADIUS 확인 |
| 타이포 | Pretendard Variable, 굵기·크기·픽셀 행간5조합 일치 |
| 그림자 | 2역할의 Light/Dark4개 Effect Styles, offset/blur/alpha 일치 |
| 코드 이름 | color/space/rounded/shadow CSS 참조 확인; 타이포는 Text Style 설명에 shorthand 연결 |
| 클라우드 동기화 | 앱에서 수정·로컬 .fig 저장 완료. 새 브라우저에서 새 보드 표시 확인. 앱의 다른 미동기화 변경까지 모두 해소됐다는 뜻은 아님 |

근거: `outputs/wk9-figma-alignment-20261031/verified-read.json`, `validation.json`, `variables-light.png`, `variables-dark.png`, `cloud-board.png`. 실제 ID·값은 [구조화 대조표](wk9-figma-code-check.json)에 포함했다. Figma 수정이 tokens.css를 자동 갱신하는 파이프라인을 만든 것은 아니다.

## 코드와 대조한 25개 역할

| CSS 이름 | Light | Dark | 등록 방식 | Scope 기준 | 현재 Figma |
| --- | --- | --- | --- | --- | --- |
| --color-neutral | #F4F4F5 | #111111 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-surface | #FFFFFF | #1B1B1D | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-on-surface | #111111 | #F4F4F5 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-secondary | #6B6B70 | #B4B4B8 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-border | #6B6B70 | #8A8A8E | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-primary | #111111 | #F4F4F5 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-primary-pressed | #333333 | #D4D4D8 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-disabled | #E8E8EA | #333333 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --color-error | #D13D3D | #D73535 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 통과 · 앱 실측 |
| --space-xs | 4px | 4px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --space-sm | 8px | 8px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --space-md | 12px | 12px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --space-lg | 16px | 16px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --space-xl | 24px | 24px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --space-2xl | 32px | 32px | Variable / FLOAT | GAP·패딩 | 통과 · 앱 실측 |
| --rounded-sm | 8px | 8px | Variable / FLOAT | CORNER_RADIUS | 통과 · 앱 실측 |
| --rounded-md | 12px | 12px | Variable / FLOAT | CORNER_RADIUS | 통과 · 앱 실측 |
| --rounded-lg | 16px | 16px | Variable / FLOAT | CORNER_RADIUS | 통과 · 앱 실측 |
| --type-headline-lg | 700 28px/36px var(--font-family) | 700 28px/36px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 통과 · 앱 실측 |
| --type-headline-md | 700 22px/30px var(--font-family) | 700 22px/30px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 통과 · 앱 실측 |
| --type-body-md | 400 16px/24px var(--font-family) | 400 16px/24px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 통과 · 앱 실측 |
| --type-label-md | 600 14px/20px var(--font-family) | 600 14px/20px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 통과 · 앱 실측 |
| --type-body-sm | 400 12px/16px var(--font-family) | 400 12px/16px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 통과 · 앱 실측 |
| --shadow-sm | 0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06) | 0 1px 2px rgba(0,0,0,.24),0 8px 24px rgba(0,0,0,.36) | Effect Style | DROP_SHADOW; 단일 Variable 아님 | 통과 · 앱 실측 |
| --shadow-md | 0 12px 40px rgba(0,0,0,.12) | 0 12px 40px rgba(0,0,0,.48) | Effect Style | DROP_SHADOW; 단일 Variable 아님 | 통과 · 앱 실측 |


## 흰 글자 배지 대비 후속 보정

2026-10-31 error 역할을 Light #D13D3D / Dark #D73535로 갱신했다. 기존 semantic ID를 유지하고 새 primitive를 참조한다. 별도 재조회에서 50개 역할·테마 일치를 확인했다. 최신 근거는 `outputs/wk9-badge-contrast-20261031/figma-verified-read.json`, `validation.json`, `figma-cloud-after.png`다. 새 브라우저에서 두 새 HEX가 표시된 보드를 확인했으며, 파일 전체의 동기화 경고 해소를 뜻하지 않는다. 앞의 Variables 표 캡처는 빨강 보정 전 이력으로 보존한다.
