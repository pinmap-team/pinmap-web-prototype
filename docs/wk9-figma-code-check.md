# Figma ↔ 코드 대조 — 현재 상태 미확인

2026-10-31 재조회도 Starter MCP 호출 한도로 실패했다. 아래 값은 **코드에서 확인한 기대값**이며 Figma에서 읽은 값이 아니다. Figma 완료 표시는 하지 않는다.

| 확인 항목 | 코드 / 문서 기준 | 현재 Figma | 판정 |
| --- | --- | --- | --- |
| 공식 기준 | DESIGN.md / tokens.css / components 계약 | 별도 대조 필요 | 코드 확인, Figma 미확인 |
| 색상 역할 | Light/Dark 각각 동일한9역할, 값 중복은 역할 구분 | 미확인 | 보류 |
| Primitive→Semantic | CSS semantic과 t-/pm- 호환 별칭 연결. CSS 자체가 Figma Primitive 등록의 증거는 아님 | alias ID와 실제 resolve 확인 필요 | 보류 |
| Light/Dark | 두 모드값 정의, 단색 대비 자동 검사 | 모드명/누락/alias resolve 미확인 | 보류 |
| Scope | Color는 사용처별, spacing은 gap/패딩, rounded는 radius | 실제 scopes 미확인 | 보류 |
| 타이포 | Pretendard5조합 → Text Styles, 웹 asset 이름 Pretendard Variable | family/style/5개조합 미확인 | 보류 |
| 그림자 | 2논리 역할 → Effect Styles; 모드별 객체 수와 구분 | 효과종류/값/이름 미확인 | 보류 |

Primitive의 이름은 기존 Figma 등록값을 읽기 전 새로 지정하거나 확정하지 않는다. 같은 HEX라도 on-surface/primary처럼 역할이 다른 semantic은 남긴다. native 변수 개수와 논리적25개 토큰을 혼동하지 않는다.

## 코드 기대값 25개

| CSS 이름 | Light | Dark | 등록 방식 | Scope 기준 | 현재 Figma |
| --- | --- | --- | --- | --- | --- |
| --color-neutral | #F4F4F5 | #111111 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-surface | #FFFFFF | #1B1B1D | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-on-surface | #111111 | #F4F4F5 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-secondary | #6B6B70 | #B4B4B8 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-border | #6B6B70 | #8A8A8E | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-primary | #111111 | #F4F4F5 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-primary-pressed | #333333 | #D4D4D8 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-disabled | #E8E8EA | #333333 | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --color-error | #EF4D4D | #EE3A3A | Variable / COLOR | 색 역할에 맞는 FILL·STROKE·TEXT_FILL | 미확인 |
| --space-xs | 4px | 4px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --space-sm | 8px | 8px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --space-md | 12px | 12px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --space-lg | 16px | 16px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --space-xl | 24px | 24px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --space-2xl | 32px | 32px | Variable / FLOAT | GAP·패딩 | 미확인 |
| --rounded-sm | 8px | 8px | Variable / FLOAT | CORNER_RADIUS | 미확인 |
| --rounded-md | 12px | 12px | Variable / FLOAT | CORNER_RADIUS | 미확인 |
| --rounded-lg | 16px | 16px | Variable / FLOAT | CORNER_RADIUS | 미확인 |
| --type-headline-lg | 700 28px/36px var(--font-family) | 700 28px/36px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 미확인 |
| --type-headline-md | 700 22px/30px var(--font-family) | 700 22px/30px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 미확인 |
| --type-body-md | 400 16px/24px var(--font-family) | 400 16px/24px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 미확인 |
| --type-label-md | 600 14px/20px var(--font-family) | 600 14px/20px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 미확인 |
| --type-body-sm | 400 12px/16px var(--font-family) | 400 12px/16px var(--font-family) | Text Style | 글꼴/크기/행간/굵기 조합; 단일 Variable 아님 | 미확인 |
| --shadow-sm | 0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06) | 0 1px 2px rgba(0,0,0,.24),0 8px 24px rgba(0,0,0,.36) | Effect Style | DROP_SHADOW; 단일 Variable 아님 | 미확인 |
| --shadow-md | 0 12px 40px rgba(0,0,0,.12) | 0 12px 40px rgba(0,0,0,.48) | Effect Style | DROP_SHADOW; 단일 Variable 아님 | 미확인 |

참조 이름/값의 구조화 데이터: [wk9-figma-code-check.json](wk9-figma-code-check.json). 이 파일로 Figma를 덮어쓰지 말고 기존 컬렉션·별칭을 먼저 읽는다.
