# 9주차 후속 적용 기록

2026-10-31, 로컬 `feat/wk9-design-alignment`. 기준 커밋은 `a49e0a9e270374be80bb03575b44cdc7c04bc4d5`다. 이는 앞선 8가지 보정까지 포함한 새 출발점이며, 그 이전 디자인을 적용 전으로 위장하지 않는다. 추가 수정은 현재 작업 트리에 있고 GitHub/Vercel에는 올리지 않았다.

## 기준과 문서

공식 규칙은 루트 DESIGN.md, 실제 값은 tokens.css, 실제 구조/사용법은 components/*/CONTRACT.md다. 모든 서체 기준은 Pretendard이며 웹 이름은 Pretendard Variable이다. 색 역할 9개(두 모드 동일 역할), 타이포 5개, 간격 6개, 모서리 3개, 그림자 2개를 유지한다. 동일 값의 semantic 역할과 Primitive 원본 수는 서로 다르다.

일반 모서리는 8/12/16px, 완전한 캡슐/원/기존 폴더 실루엣/대표 사진 스택은 명시한 기하 예외다. 사진 스크림과 유리 재질의 내부 효과는 일반 외부 그림자와 구분한다. 마지막 CSS가 자동으로 모든 기존 스타일을 이긴다는 문구는 실제 우선순위 검증 규칙으로 정정했다.

## 같은 콘텐츠 전후 자료

[세 화면 전후 모아보기](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/comparison.html) — 브라우저 여백을 제외한 앱 프레임으로 나란히 표시한다.

앱 프레임은 세 화면 모두 **402×874**이며 사진 요소 src/alt 목록은 각 전후 쌍에서 동일하다. 스크린샷 바깥 브라우저 여백은 다르므로 앱 프레임을 기준으로 비교한다.

| 화면 | 적용 전 | 적용 후 | 방법/제약 |
| --- | --- | --- | --- |
| 홈 | [전](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/home-before.png) | [후](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/home-after.png) | 추천 콘텐츠 무작위 변경 방지: 실제 렌더된 DOM을 고정해 a49e0a9/최종 CSS를 각각 적용. 상호작용 없는 정적 비교. 실제 후 화면은 home-live-after.png로 별도 보관 |
| 지도 | [전](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/map-before.png) | [후](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/map-after.png) | 실제 앱. 전체 카테고리/첫 카드/같은 사진·정보. 지도 카메라는 완전히 고정되지 않아 타일 좌표 차이는 보정 성과로 평가하지 않음 |
| 저장목록 | [전](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/saved-before.png) | [후](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/saved-after.png) | 실제 앱. 전체 필터/동일 7개 폴더/같은 사진 |

[manifest.json](../../outputs/wk9-fixed-baseline-a49e0a9/manifest.json)에 기준 SHA, 화면 크기, 사진 동일성, 파일 SHA-256, 제한을 기록했다. 최초 브라우저의 CSS 2개 URL은 기준 파일보다 앞선 버전이었다(동일 색값 별칭 연결과 빈 오류 숨김 차이). 코드 커밋과 브라우저 캐시가 완전히 같았다고 주장하지 않는다. 중간 comparison/의 잘못된 대상 캡처는 최종 자료에서 제외했다. 최초 독립 평가가 사용한 루트 자료는 보존했다.

## 최소 보정과 실제 수치

사진/폴더 윤곽/캐러셀 폭과 정사각형 사진/픽토그램 SVG/마커 확대 모션의 코드는 변경하지 않았다. 이번 UI 수정은 design-alignment.css 및 그 파일 버전 참조뿐이다.

| 항목 | 전 | 후/검증 |
| --- | --- | --- |
| 내비 색 역할 | #73777D / #202124 | secondary #6B6B70 / primary #111111, 실제 computed 확인 |
| 지도 제목·검색·코스 색 | #17191B / #222222 등 | on-surface / primary / neutral로 참조 |
| 저장 검색·미선택 칩 | #292929 / #3A3A3E | on-surface / secondary, 실제 computed 확인 |
| 보조 글자 | 대표 사진 설명 opacity .88 | 1로 변경. 사진/유리의 최저 합성 대비 전체 측정은 아직 미완료 |
| 홈 날짜/최근 제목 | 임의 15px·17px·굵기 | 날짜 label-md, 요일 body-sm, 최근 섹션 headline-md. 기존 큰 사진 제목은 유지 |
| 내부 간격 | 일정 gap10/요일 gap2/전체보기 gap9/지도 상단5 | 각 8/4/8/8px로 참조 |
| 칩 모서리/부유 그림자 | 반쪽 캡슐18·20, 별도 그림자 | 완전한 캡슐999px, 일반 외부 shadow-sm. 폴더 실루엣과 유리 효과 유지 |
| 홈 카테고리 두 줄 | 44px 버튼에 30px 행이 남아 겹침 | 행 높이 44px × 2, 행 간격 8px, 글자 on-surface. home-after 및 home-scrolled-after로 재측정 |
| 홈 일정 터치 | 322×34 | 322×44, actual rect 확인 |
| 지도 위치 터치 | 높이36 | 높이44, actual rect 확인 |
| 지도 검색 포커스 | 이전 !important에 의해 outline 제거 | 2px primary, offset -2px로 내부 표시. 실제 펼침 상태 측정·캡처 |

## 실행 검증

- `node --test tests/*.test.cjs`: 34 통과, 0 실패. UI 전체 통과와 동일시하지 않는다.
- 지도 돋보기는 닫힘/펼침 모두 24×24px, 중심 (356,50). 입력창은 같은 행, 카테고리 y80/h75 유지.
- 지도 하트 false→true→false 동작 확인 후 원래 값으로 복구했다. 카페 선택 시 해당 카드만 표시되고 전체로 돌아가는 동작을 확인했다. 저장 지속성·스와이프 전체·동작 줄이기 실행은 이번 후속 검증 범위 밖이다.
- 저장 검색에 없는 문자열을 넣으면 콘텐츠 0개/빈 안내가 표시된다. Enter와 지우기 후 기본 폴더 복귀를 확인했다.
- 증거: map-search-focus.png, saved-empty-result.png, 세 화면 metrics JSON. 브라우저 프레임은 402×874다. 615×935의 넓은 브라우저에서는 가로 넘침이 없고 일정 버튼44px를 확인했다(앱 콘텐츠의 최대 폭은 기존대로 유지). 실제 Dark 화면은 미검증이다.

## 독립 평가와 Figma

별도 대화 `01a190b8-4a58-76a1-8806-9de2dcb9b8fb`에서 최초 기준의 18개 기록을 작성했다: 통과 5 / 실패 10 / 판단 불가 3. [기준 평가 원문](wk9-independent-evaluation.md)은 바꾸지 않았다. 이 수치를 보정 후 평가인 것처럼 재사용하지 않는다.

[최종 독립 평가](wk9-independent-final.md): **18행 중 통과15 / 실패0 / 판단 불가3**. 각 행에 명시한 검사 범위의 판정이며 전 화면·전체 인터랙션 통과는 아니다. 직전 후속 평가(12/3/3)도 별도 원문으로 보존했다.

Figma 대조는 [25개 역할별 기대값](wk9-figma-code-check.md)과 JSON을 준비했다. 최신 Primitive→Semantic alias, Light/Dark 실제 값, Scope, Text/Effect Style 객체는 MCP 호출 한도로 읽지 못했다. **Figma 내부 검증·수정은 미완료**다. CSS 선언만으로 Figma 등록 완료라 표시하지 않는다.

후속 범위: 홈 카테고리의 두 행이 서로 겹치던 값을 보정하고 동일 DOM 전후 자료를 갱신했다. 첫 화면에서 부유 내비 아래에 일부 콘텐츠가 보이는 기존 스크롤 구조는 유지하며, 정적 고정 화면에서 아래로 스크롤해 카테고리/최근 목록 접근을 확인했다.

최종 수치 보정: 홈 일정행의 브라우저 기본 padding 1px 6px를 0/space-sm으로 명시하고, 지도44px/저장50px 검색창 반지름을 999px로 통일했다. 사진/카드/검색창 크기는 유지했다. 이전 12통과·3실패·3판단불가 평가 시점의 자료는 final-comparison/review-round-2/에 별도 보존했다. 최종 독립 재평가 결과는 wk9-independent-final.md를 따른다.
