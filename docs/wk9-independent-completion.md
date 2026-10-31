# 9주차 독립 재평가 완료 기록

평가일: 2026-10-31 (Asia/Seoul). 대상: 로컬 작업본의 홈·지도·저장목록, 402×874 CSS px 모바일 프레임. 기준 HEAD는 `3b1039a84fb145fcb03387665e12d936b8e3df44`이며 미커밋 변경을 포함한다.

**기존과 같은 18개 평가 항목: 통과 18 / 실패 0 / 판단 불가 0.** 이전에 판단 불가였던 H6·M6·S6는 실제 조작 후속 증거를 검토하고, 증거가 서로 달랐던 저장함 Enter를 별도 브라우저에서 직접 재현하여 이번 기록에서 통과로 판정했다. 빨간 D-3 배지의 흰 글자 대비도 두 테마에서 기준을 충족한다.

이 결과는 아래에 지정한 요소·시나리오에 한정한다. **전체 앱 접근성 인증, 강의 제출 조건 전체 충족, 모든 상태·기기 통과를 뜻하지 않는다.** 기존 독립 평가 원본의 15통과·3판단불가 결과는 당시 기록으로 보존한다.

## 평가의 독립성과 근거

이번 평가자는 이번 빨간색 보정과 이전 앱 구현에 참여하지 않은 별도 평가 에이전트다. 구현자가 제출한 결론만 옮기지 않고 캡처·접근성 상태·측정 JSON·관련 코드와 회귀 검사 내용을 대조했다. 같은 대화 안에서 분리된 평가 에이전트가 수행했으며, **사용자가 별도로 연 새 대화에서 수행한 평가와 동일하다고 주장하지 않는다.** 강의의 ‘새 대화’ 요구를 엄격히 적용하면 이 구분을 제출 시 명시해야 한다.

- 규칙: [DESIGN.md](../DESIGN.md), [tokens.css](../tokens.css), [컴포넌트 목차](../components/index.md) 및 Button/Input/Card/Map 계약.
- F: [기존 전후 비교 폴더](../../outputs/wk9-fixed-baseline-a49e0a9/final-comparison/). 각 `*-metrics.json`은 당시 렌더의 수치이며 이번에 새로 측정한 값처럼 쓰지 않는다.
- I: [실제 조작 증거 폴더](../../outputs/wk9-interaction-20261031/). 파일명 뒤 확장자를 생략한 항목은 같은 이름의 PNG와 TXT를 뜻한다. [구현자 후속 검증](wk9-interaction-verification.md)의 30개 시나리오에 대한 실행 증거다.
- N: [이번 대비·독립 재현 증거 폴더](../../outputs/wk9-badge-contrast-20261031/).
- 이전 판단과 적용 전 값: [직전 독립 평가](wk9-independent-final.md). 이미 통과했던 정적 15항목은 해당 한정 범위를 유지하며 후속 실화면에서 구조 회귀가 없는지 대조했다. 15항목 전체를 새 DOM 계측으로 다시 측정했다는 뜻은 아니다.

I의 manifest에 기록된 **103개 증거 파일의 SHA-256을 재계산해 모두 일치**함을 확인했다. `app.js`, `map-live.js`, `theme-mode.js`, `design-alignment.css`, Input 계약은 I의 기록과 현재 바이트가 일치한다. `app.html`과 `tokens.css`는 변경되어 과거 실행물과 동일하다고 간주하지 않았다. 새 토큰의 실제 렌더는 N의 computed 색·캡처로, 저장함 Enter는 새 실행으로 확인했다. 대조 결과와 현재 소스 해시는 [독립 무결성·대비 계산](../../outputs/wk9-badge-contrast-20261031/independent-integrity-and-contrast.json)에 있다.

## 홈 — 6항목

| 규칙 | 적용 전 | 적용 후 / 확인한 범위 | 판정 | 근거캡처·측정 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| H1 색: 가시 내비·전체보기·오늘·카테고리의 semantic 역할 | 내비 #73777D/#202124, 전체보기 #3A3A3A, 오늘 #EFEFF1, 카테고리 #2E2E2E | F의 내비 #6B6B70/#111111, 전체보기·카테고리 #111111, 오늘 #E8E8EA를 유지. D-3 배지는 흰 글자와 Light 4.7234:1, Dark 4.7190:1 | 통과 | F/home-before·home-after와 metrics, N/light-home·dark-home PNG/JSON | 기존 역할 보정 유지, 이번 error 배경 명도 보정. 사진·유리 전체 대비는 이 판정에 포함하지 않음 |
| H2 타입: 날짜 label-md, 요일 body-sm, 대표·섹션 제목 headline-md | 날짜 15/24, 요일 600 12/16 | 날짜 600 14/20, 요일 400 12/16, 제목 700 22/30. 최신 실화면에서도 제목·날짜 구성 유지 | 통과 | F/home-before·home-live-after metrics, I/H10-scroll-categories, N/light-home | 이전 타이포 보정 유지. 외부 그래픽·전체 텍스트 전수 판정 아님 |
| H3 간격: 일정행·전체보기·요일 | gap10/9, 요일 padding5/gap2, 중간 보정의 일정행 padding1/6 | F의 cnrow padding0/8·gap8, 전체보기 gap8, 요일 padding4/gap4. 해당 최종 CSS 유지 | 통과 | F/home-after-metrics, I/H10-scroll-categories, design-alignment.css | 기존 토큰 간격 보정 유지 |
| H4 형태: 카테고리 캡슐과 대표 사진 스택 예외 | 칩 높이44/radius18, 대표 사진 radius30 | 칩 높이44/radius999, 대표 사진 radius30 예외 유지 | 통과 | F/home-before·home-after metrics, I/H10-scroll-categories | 캡슐 보정 유지, 사진 스택 형태 보존 |
| H5 컴포넌트: 일정·카테고리44 이상, 두 행 비중첩·노출 | 일정322×34, 칩 행 사이6px 중첩 | 일정322×44, 칩44 높이·행간8. 실제 스크롤 후 두 행과 최근 목록을 내비 위로 노출 | 통과 | F/home-after-metrics, I/H10-scroll-categories PNG/TXT | 기존 터치·행 간격 보정 유지. 초기 부유 내비의 일부 가림은 남으나 실제 스크롤로 접근 가능 |
| H6 상태: 키보드·캐러셀·날짜 선택·빈 홈 | 실행 근거 부족으로 판단 불가 | 드래그로 서울숲, 방향키로 숙소·Enter 상세 진입. 상세 복귀 카드 포커스, 날짜3일 전시 선택→4일 선택 해제, 월 Escape 포커스, 빈 개발 홈 확인 | 통과 | I/H02·H03·H04, H06-calendar-selected, H07-calendar-empty-day, H08-calendar-escape-focus, H09-return-focus-fixed, E01-empty-home | 구현자가 상세 복귀 포커스를 보정. 독립 평가자는 후속 실행 근거와 회귀 검사 내용을 대조. 네이티브 모바일 키보드·모든 기기 검사는 제외 |

## 지도 — 6항목

| 규칙 | 적용 전 | 적용 후 / 확인한 범위 | 판정 | 근거캡처·측정 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| M1 색: 위치·검색 on-surface, 코스 primary, 내비 secondary/primary | 제목·검색 #17191B, 코스 #222222 | F의 제목·검색 #111111, 코스 #111111/글자 #F4F4F5, 내비 #6B6B70/#111111 유지. 활성 하트는 공유 error 토큰 참조 | 통과 | F/map-before·map-after metrics, I/M01-heart-on·M12-heart-off, design-alignment.css | 기존 가시 역할 유지. 이번 error 토큰 공유에 따라 활성 하트도 보정된 빨강 사용 |
| M2 타입: 제목 headline-lg, 카드 label-md, 카테고리·내비 body-sm | 기존 조합 일치 | F의 700 28/36, 600 14/20, 400 12/16 유지. 실화면에서 기존 구성 유지 | 통과 | F/map-after-metrics, I/M13-drag-sync·M14-selected-motion | 신규 타이포 변경 없음 |
| M3 간격: 제목과 카테고리 | 제목 끝72→카테고리77, 간격5 | F의 제목 y28/h44, 카테고리 y80으로 간격8. 최종 CSS 유지 | 통과 | F/map-after-metrics, I/M14-selected-motion, design-alignment.css | 이전 space-sm 보정 유지 |
| M4 모서리: 카드md12·원형 예외·검색 완전한 캡슐 | 검색 높이44/radius20 | 검색 펼침354×44/radius999, 카드12·원형50% 유지 | 통과 | F/map-search-focus metrics, I/M05-search-saved·M06-search-close | 기존 검색 radius 보정 유지 |
| M5 컴포넌트: 위치44, 하트·상세44 비중첩, 정사각형 사진 | 위치154.27×36 | F의 위치154.27×44, 하트·상세44 비중첩, 카드334×112.55·사진111.22×111.22. I의 실화면에서 구성 유지 | 통과 | F/map-after-metrics, I/M13-drag-sync·M14-selected-motion | 기존 위치 버튼 보정 유지. 카드와 사진 높이가 테두리까지 정확히 같다는 주장은 하지 않음 |
| M6 상태: 포커스·검색·하트 유지·마커/캐러셀 동기화·모션 | 일부 포커스 표현만 확인, 실행 부족으로 판단 불가 | 검색 열기/닫기 버튼 rect 동일, 유효 Enter 키보드 종료, 짧은 검색 안내·빈 결과·503 오류→복구. 하트 true→재시작 유지→false. 뱃지/드래그 카드 연동, 확대70px 및 0.36s 전환 정의, 상세 복귀 포커스 확인 | 통과 | I/M01·M02·M04·M06·M08·M10·M11·M12·M13·M14, T04-dark-map-persist, F01-loading·F02-error·F03-recovery, search-geometry.json, marker-measurement.json | 구현자의 Enter blur·오류 문구 표시·복귀 포커스 보정 확인. 통과는 검사한 흐름에 한정. 모션 매 프레임 성능·실제 외부 서비스 장애 검증 아님 |

## 저장목록 — 6항목

| 규칙 | 적용 전 | 적용 후 / 확인한 범위 | 판정 | 근거캡처·측정 | 수정내용 |
| --- | --- | --- | --- | --- | --- |
| S1 색: 입력on-surface, 미선택secondary, 선택primary/neutral | 입력 #292929, 칩 #3A3A3E, 선택글자 #FFF | F의 입력 #111111, 칩 #6B6B70, 선택 #111111/#F4F4F5 유지. 이번 직접 재현에서도 검색·필터 구성 유지 | 통과 | F/saved-before·saved-after metrics, N/independent-saved-enter.png | 기존 semantic 연결 유지. 사진 위 저장 시점·유리 대비는 제외 |
| S2 타입: 제목·입력·폴더·칩·내비의 지정 조합 | 기본 가시 대상 조합 일치 | F의 제목700 28/36, 입력400 16/24, 폴더·칩600 14/20, 내비400 12/16 유지 | 통과 | F/saved-after-metrics, N/independent-saved-enter.png | 기존 조합 유지. 미수집 텍스트까지 전면 승인하지 않음 |
| S3 간격: 바깥24·폴더 격자24·제목-검색12 | 기존 측정값 일치 | F의 바깥24, 폴더 간격24, 검색 내부16/8·gap8 유지. 새 실행에서 기존 배치 유지 | 통과 | F/saved-after-metrics, N/independent-saved-enter.png | 기존 배치와 간격 유지 |
| S4 모서리: 검색·필터 캡슐, 폴더 실루엣 예외 | 검색50/radius24 | F의 검색354×50/radius999, 필터44/radius999, 폴더 윤곽 유지 | 통과 | F/saved-after-metrics, N/independent-saved-before-enter·independent-saved-enter | 기존 검색 radius 보정 유지 |
| S5 컴포넌트: 검색 이름·폴더·기본 터치 크기 | 검색 이름 있음, 폴더161×138.46, 칩 최소49.54×44 | 기본 대상의 이름·크기 유지. 실제 검색은 ‘저장한 콘텐츠 찾기’, 지우기는 별도 이름 있는 버튼이며 결과 유지 확인 | 통과 | F/saved-after-dom·metrics, N/independent-saved-enter.txt, I/S04-clear-recovery | 기존 제한 범위 유지. 숨겨진 모든 버튼의 터치 영역 전수 통과를 뜻하지 않음 |
| S6 상태: 즉시 필터·Enter·빈 결과·선택/저장 유지 | 정적 빈 결과만 확인, 나머지 판단 불가 | ‘카페’ 즉시3건, Enter 후 동일 결과와 내비 복구·키보드 숨김을 평가자가 직접 재현. 0건→지우기 복구, 선택0개 삭제disabled→1개enabled, 취소·메모 재시작 유지·상세 복귀 포커스의 실행 증거 확인 | 통과 | N/independent-saved-enter PNG/TXT/JSON, I/S01·S03·S04·S06·S07·S08·S09·S10 | 구현자의 공통 상세 복귀 보정 확인. 기존 S02 캡처 불일치는 새 직접 재현으로 보완. 실제 삭제 실행은 검사하지 않음 |

## 발견한 증거 불일치와 독립 재현

I/S02-enter.txt에는 키보드가 사라지고 내비가 복구되어 있지만 같은 이름의 PNG에는 키보드가 남아 있었다. 두 자료만으로 ‘키보드 종료 확인’을 확정하지 않았다. 캡처 시점 차이가 가능한 설명이나 원인으로 단정하지 않는다.

평가자는 구현자와 분리한 `http://localhost:60910/index.html`에서 버전 선택→프로토타입→온보딩 건너뛰기→사용 안내 종료→저장함→‘카페’ 입력→물리 Return을 직접 수행했다. [입력 중](../../outputs/wk9-badge-contrast-20261031/independent-saved-before-enter.png)과 [제출 후](../../outputs/wk9-badge-contrast-20261031/independent-saved-enter.png)를 별도 저장했다. 제출 후 검색어와 결과3개 유지, 입력 포커스 해제, 키보드 `visibility:hidden`·`aria-hidden:true`, 하단 내비 `display:flex`, 304×68px·y792를 확인했다. [측정값](../../outputs/wk9-badge-contrast-20261031/independent-saved-enter.json)과 [접근성 상태](../../outputs/wk9-badge-contrast-20261031/independent-saved-enter.txt)가 새 캡처와 일치한다.

## 흰 글자와 빨간 배지 대비

| 테마 | 적용 전 배경 / 흰색 대비 | 적용 후 배경 / 흰색 대비 | 판정 |
| --- | --- | --- | --- |
| Light | #EF4D4D / 3.5966:1 | #D13D3D / 4.7234:1 | 4.5:1 이상 통과 |
| Dark | #EE3A3A / 3.9610:1 | #D73535 / 4.7190:1 | 4.5:1 이상 통과 |

평가자가 sRGB 상대휘도 공식으로 별도 계산했다. N/light-home·dark-home·light-calendar·dark-calendar JSON에서 실제 글자 `rgb(255,255,255)`, 배경 각각 `rgb(209,61,61)`/`rgb(215,53,53)`, 요소 opacity1을 확인했다. [렌더 대비8건](../../outputs/wk9-badge-contrast-20261031/contrast-validation.json)은 임박 띠의 복제 요소를 포함하며 배지 유형은 테마당3종이다. 캡처에서는 홈 일정·캘린더와 다크 홈 임박 띠의 D-3 배지를 대조했다. 라이트 홈 캡처의 자동 전환 띠는 D-5 프레임이므로 라이트 띠 D-3의 근거는 해당 computed 기록이다. 해당 선택자는 `.strip-item.soon b`, `.cnbadge.soon`, `.calbadge.soon`이다. **이 세 배지 유형의 기존 흰 글자 대비 미달 예외는 해소**되었다. 사진 자체에 얹힌 다른 흰 글자나 유리 배지를 같은 결과로 처리하지 않는다.

추가로 구현자가 Figma 앱에서 다시 읽어 저장한 [객체 기록](../../outputs/wk9-badge-contrast-20261031/figma-verified-read.json)과 [50개 역할 대조 결과](../../outputs/wk9-badge-contrast-20261031/validation.json)를 검토했다. Light error `1277:4618`은 Primitive `1277:4732`(#D13D3D), Dark error `1277:4619`는 `1277:4733`(#D73535)를 참조한다. 두 semantic의 scope는 ALL_FILLS/STROKE_COLOR, WEB 이름은 `var(--color-error)`다. 새 값과 alias는 코드와 일치한다. 평가자가 Figma UI를 직접 조작한 결과는 아니며, 이 자료의 클라우드 동기화 상태는 unconfirmed다.

## 결과를 확대하지 않는 범위

- 원래 before가 이전 CSS URL을 사용했고 지도 카메라·바깥 브라우저 여백도 전후 달랐다는 기존 제한은 유지한다. 최초 캡처를 기준 커밋의 바이트 동일 실행으로 소급 보증하지 않는다.
- 사진·반투명 유리 위 글자의 최저 합성 대비는 전수 측정하지 않았다. 이번 검사18항목 통과와 앱 전체 대비4.5:1 충족은 다른 주장이다.
- Light/Dark 실제 전환·재시작 유지의 후속 증거는 확인했지만, 정적 치수15항목을 모든 테마에서 새로 계측한 것은 아니다.
- 실제 GPS·방향 센서, 실기기 네이티브 키보드, 운영체제 동작 줄이기 전환, 프레임별 모션 성능은 범위 밖이다. 화면 키보드와 데스크톱 키 입력을 검사했다.
- Figma 앱 재조회 자료의 새 error 값·alias·Scope와 50개 역할 대조 결과를 검토했으나, 평가자가 Figma UI나 클라우드 저장 상태를 직접 확인하지는 않았다. 파일 전체의 클라우드 동기화 완료와 구분한다.
- 자동 검사40개 통과는 구현자의 실행 로그·보고로 확인했다. 평가자가 이번에40개 전체를 다시 실행했다는 뜻이 아니다. 자동 검사가 인터랙션·Figma·합성 대비를 대체하지 않는다.
- 앱 전체 콘솔 오류0, GitHub 업로드·Vercel 배포, 강의의 엄격한 ‘별도 새 대화’ 형식 충족을 선언하지 않는다.

이번 평가자는 이 문서와 N의 `independent-*` 증거만 새로 작성했다. 앱 코드·기존 평가 문서·과거 캡처는 수정하지 않았다. 기존 판단 불가3건을 독립 검토 가능한 근거로 해소하는 평가 작업은 여기서 완료한다.
