// 마이 하위 페이지 (mysub.js 다음에 불러와요)
// 마이에서 누르는 기능은 아래에서 올라오는 시트 대신 새 페이지로 열리고, 왼쪽 위 ← 로 마이로 돌아가요.
// 현재 위치 · 관심 키워드 · 알림 · 저장 · 위치/지도 · 저장하는 방법 · 앱 정보 · 핀맵 계정 설정

const MY_PAGES = {calexport:'캘린더로 내보내기', favorites:'즐겨찾기', placeset:'위치 설정', interestset:'관심 키워드 설정', notiset:'알림 설정', saveset:'저장 설정', mapset:'지도 디자인', themeset:'화면 모드', guide:'이용 가이드', howtopage:'저장하는 방법', appinfo:'앱 정보', faq:'자주 묻는 질문', notice:'공지사항', terms:'약관 및 정책', account:'계정 관리', accountaccess:'로그아웃, 탈퇴'};
Object.entries(MY_PAGES).forEach(([k, v]) => { PARENT_TAB[k] = 'my'; pageName[k] = v; });
const myPage = (title, body, cls = '', back = 'my') => `<div class="mypage ${cls}">${subHead(title, back)}${body}</div>`;

/* ---------- 마이 첫 화면: 'SNS에서 바로 저장해보기' 빼고, 문구 · 메뉴 정리 ---------- */
const myBase = pages.my;
pages.my = function(){
  return myBase()
    .replace(/<button class="sharepromo"[\s\S]*?<\/button>\s*/, '')
    .replace('관심사, 활용 목적', '관심 키워드 설정')
    .replace(/<button class="logout"[^>]*>[\s\S]*?<\/button>/, '')
    // 2026-11-10 프로필 카드 오른쪽 '>' · 사진/이름 밖을 누르면 계정 관리로
    .replace('</div><!--myprofile-end-->', `<button type="button" class="myprofile-go" data-page="account" aria-label="계정 관리로 이동">${icon('chevright')}</button></div><!--myprofile-end-->`)
    // 2026-11-03: 코스 · 연동 새로고침을 프로필 아래 둥근 사각형 카드로 (목록의 '저장한 코스 보기'는 중복이라 뺌)
    .replace(/<button class="mrow" data-page="courses">[\s\S]*?<\/button>\s*/, '')
    .replace('<!--myprofile-end-->', myQuickCards());
};
function myQuickCards(){
  return `<div class="my-quick" role="group" aria-label="바로가기">
    <button type="button" class="myq-card" data-page="favorites"><span class="myq-ico" aria-hidden="true">${icon('star')}</span><b>즐겨찾기</b></button>
    <button type="button" class="myq-card" data-page="courses"><span class="myq-ico" aria-hidden="true">${icon('route')}</span><b>내 코스</b></button>
    <button type="button" class="myq-card" data-action="accounts"><span class="myq-ico" aria-hidden="true">${icon('user')}</span><b>연동 계정 관리</b></button>
  </div>`;
}

/* ---------- 현재 위치 ---------- */
const placeSheetBase = placeSheet;
function placeBody(){
  const p = myPlaces();
  const rows = p.map((name, i) => `<div class="prow">
      <button class="pradio ${i===0?'on':''}" data-place-pick="${i}" role="radio" aria-checked="${i===0}" aria-label="${esc(name)} 선택"></button>
      <button class="pname" data-place-pick="${i}"><b>${esc(name)}</b><small>${esc(dongOf(name).full)}${i===0?', 현재 위치':''}</small></button>
      <button class="picon" data-place-edit="${i}" aria-label="${esc(name)} 수정">${icon('edit')}</button>
      <button class="picon" data-place-del="${i}" aria-label="${esc(name)} 삭제" ${p.length===1?'disabled':''}>${icon('close')}</button>
    </div>`).join('');
  return `
    <div class="mycard plist" role="radiogroup" aria-label="현재 위치">${rows}</div>
    ${p.length < MAX_PLACES ? `<button class="padd" data-action="placeadd">${icon('plus')} 위치 추가</button>` : `<p class="hint pfull">위치를 바꾸려면 ✎ 수정을 누르거나, 하나를 지운 뒤 새로 추가해 주세요.</p>`}
    ${p.length===1 ? '<p class="hint pfull">위치는 최소 1개가 필요해서 삭제할 수 없어요.</p>' : ''}`;
}
pages.placeset = () => myPage('위치 설정', placeBody(), 'placepage');
// 이 페이지에 있을 때는 시트 대신 페이지를 다시 그려요 (홈 상단에서 열 때는 지금처럼 시트)
placeSheet = function(){ if (page === 'placeset' && !detailId) { if ($('#sheet').open) $('#sheet').close(); render(); } else placeSheetBase(); };
const placeSheetAction = actions.placesheet;
actions.placesheet = () => { if (page === 'placeset') placeSheet(); else placeSheetAction(); };

/* ---------- 관심 키워드 설정 (온보딩으로 가지 않고 이 페이지에서 바로 바꿔요) ---------- */
pages.interestset = function(){
  const opts = interestOptions.filter(o => o.id !== 'later');
  return myPage('관심 키워드 설정', `
    <p class="muted mpdesc kwdesc">고른 키워드에 맞는 저장 콘텐츠를 홈에서 먼저 보여드려요.\n아무것도 고르지 않으면 홈에서 랜덤으로 추천해요.</p>
    <div class="kwgrid" role="group" aria-label="관심 키워드">${opts.map(o => { const on = preferences.includes(o.id);
      return `<button class="kwopt ${on ? 'on' : ''}" data-kw="${o.id}" role="checkbox" aria-checked="${on}"><span class="kwico" aria-hidden="true">${window.obIcon ? obIcon(o.id, on) : o.emoji}</span><span>${o.short}</span></button>`; }).join('')}</div>
`, 'kwpage');
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-kw]'); if (!b) return;
  const id = b.dataset.kw;
  preferences = preferences.includes(id) ? preferences.filter(x => x !== id) : [...preferences, id];
  homeViewIds = null; afterChange(); render();
});
actions.interests = () => go('interestset');

/* ---------- 알림 · 저장 · 위치/지도 설정 ---------- */
function pageFromModal(fn){ // my.js의 시트 내용을 그대로 페이지에 넣어요
  const realModal = modal; let html = '';
  modal = (t, body) => { html = body; };
  try { fn(); } finally { modal = realModal; }
  return html;
}
pages.notiset = () => myPage('알림 설정', pageFromModal(notiSettings), 'settingpage');
pages.saveset = () => myPage('저장 설정', pageFromModal(saveSettings), 'settingpage');
// 2026-11-04: 화면 모드도 아래 시트 대신 페이지로 (내용은 PinmapTheme.show()와 같음)
pages.themeset = () => { PinmapTheme.beginPreview(); return myPage('화면 모드', pageFromModal(() => PinmapTheme.show()), 'settingpage themepage'); };
actions.appearance = () => go('themeset');
pages.mapset = () => myPage('지도 디자인', pageFromModal(mapSettings), 'mappage');
Object.assign(actions, {
  placesheetmy: () => go('placeset'),
  notisheet: () => go('notiset'),
  notisettings: () => go('notiset'),
  savesheet: () => go('saveset'),
  mapsheet: () => go('mapset'),
  appinfo: () => go('appinfo'),
  account: () => { editingProfileName=false; go('account'); },
  guide: () => go('guide'),
  howto: () => go('howtopage')
});
// 마이의 '현재 위치' 줄은 페이지로 (홈 상단의 위치 버튼은 지금처럼 시트)
document.addEventListener('click', e => {
  const b = e.target.closest('.mgroup [data-action="placesheet"]');
  if (b && page === 'my') { e.stopImmediatePropagation(); go('placeset'); }
}, true);

/* ---------- 앱 정보 ---------- */
// 2026-11-10 지도 카드에서 하트를 누른 장소(찜) 모아보기. 누르면 상세로 가요.
pages.favorites = () => {
  const list = items.filter(x => x.favorite);
  return myPage('즐겨찾기', list.length
    ? `<p class="fav-count">${list.length}개</p><div class="cf-items fav-items">${list.map(cfItem).join('')}</div>`
    : `<div class="empty fav-empty">${icon('star')}<h3>아직 즐겨찾기한 콘텐츠가 없어요</h3><p class="muted">콘텐츠 상세에서 별을 누르면 여기에 모여요.</p><button type="button" class="fav-go" data-page="library">컬렉션으로 가기</button></div>`, 'favpage');
};
pages.appinfo = () => myPage('앱 정보', `<div class="mycard settings">
    <div class="setrow"><div><b>핀맵</b><small>저장을 다시, 일상으로</small></div></div>
    <div class="setrow"><div><b>버전</b><small>Prototype 03</small></div></div>
    <div class="setrow"><div><b>데이터 보관</b><small>예시 데이터로 체험하는 프로토타입이에요. 데이터는 이 브라우저에만 저장돼요.</small></div></div>
  </div>`);

/* ---------- 자주 묻는 질문 · 공지사항 · 약관 및 정책 (2026-11-03, 마이 하단 도움말) ---------- */
const infoRows = rows => `<div class="mycard settings">${rows.map(([t, d]) => `<div class="setrow"><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>`;
pages.faq = () => myPage('자주 묻는 질문', infoRows([
  ['SNS 콘텐츠는 어떻게 저장하나요?', '인스타그램/유튜브 게시물에서 공유하기를 누르고 핀맵을 고르면<br>바로 저장돼요.'],
  ['저장한 콘텐츠는 어디에서 다시 보나요?', '홈에서 주변 저장 장소와 최근 저장을, 컬렉션에서 전체 목록을 볼 수 있어요.'],
  ['AI 자동 분류가 틀렸어요.', '콘텐츠 상세에서 카테고리를 직접 바꿀 수 있어요.<br>저장 설정에서 자동 분류를 끌 수도 있어요.'],
  ['원본 게시물이 삭제되면 어떻게 되나요?', '장소 정보는 그대로 남고, 원본 보기에는 ‘삭제된 게시물이에요’라고 보여요.'],
  ['위치 권한은 어디에서 바꾸나요?', '휴대폰의 설정 앱 › 핀맵 › 위치에서 바꿀 수 있어요.']
]), 'settingpage');
pages.notice = () => myPage('공지사항', infoRows([
  ['핀맵 프로토타입 03 공개', '연동 계정 관리, 위치 편집, 마이 바로가기가 새로 생겼어요.'],
  ['예시 데이터 안내', '지금은 예시 데이터로 체험하는 프로토타입이에요.\n데이터는 이 브라우저에만 저장돼요.']
]), 'settingpage');
pages.terms = () => myPage('약관 및 정책', infoRows([
  ['서비스 이용약관', '핀맵 서비스 이용에 관한 기본 약속이에요.'],
  ['개인정보 처리방침', '저장한 콘텐츠와 연동 계정 정보를 어떻게 다루는지 안내해요.'],
  ['위치기반서비스 이용약관', '현재 위치로 주변 저장 장소를 보여줄 때 적용돼요.'],
  ['오픈소스 라이선스', '지도 표시에 Leaflet, MapLibre를 사용해요.']
]), 'settingpage');
Object.assign(actions, { faq: () => go('faq'), notice: () => go('notice'), terms: () => go('terms') });

/* ---------- 이용 가이드 ---------- */
pages.guide = () => myPage('이용 가이드', `<p class="muted mpdesc">핀맵 사용 방법을 언제든 다시 확인해 보세요.</p>
  <section class="mgroup" aria-label="다시 보기 안내">
    ${myRow('howto','📲','저장하는 방법 다시 보기')}
    ${myRow('coachagain','👆','홈 화면 튜토리얼 다시 보기')}
    ${myRow('intro','👋','온보딩 다시 보기')}
  </section>`);

/* ---------- 저장하는 방법 (온보딩 2번째 화면 내용만 · 다음 단계로 넘어가지 않아요) ---------- */
pages.howtopage = function(){
  const keep = onboardStep; onboardStep = 1;
  const html = onboardScreen().replace(/<div class="ob-actions">[\s\S]*?<\/div>\s*$/, '')
    // 제목은 '저장하는 방법 다시 보기', 온보딩 제목은 그 아래 서브 문구로
    .replace(/<h1 class="ob-title"[^>]*>[\s\S]*?<\/h1>/, '<h1 class="ob-title">저장하는 방법 다시 보기</h1><p class="ob-desc howtosub">마음에 드는 콘텐츠를 발견했다면?</p>');
  onboardStep = keep;
  return myPage('', `<div class="ob-screen step2 howtobody">${html}
    <div class="ob-actions"><button class="filled ob-next" data-action="snsdemo">SNS 저장 체험 해보기</button></div></div>`, 'howtopage', 'guide');
};

/* ---------- 프로필: 사진/이름 직접 편집 (2026-11-04: SNS 연동 계정은 마이 바로가기 '연동 계정 관리' 페이지로 분리) ---------- */
/* ---------- 계정 관리 (2026-11-10): 프로필 · 개인정보(연락처, 생년월일) 보기, 맨 아래 로그아웃 | 회원 탈퇴 ---------- */
// 사진 · 이름은 마이 프로필 카드에서 바로 바꿔요. 연락처 · 생년월일은 프로토타입 예시 값이에요.
const ACCOUNT_EXAMPLE = {email:'seoyeon@example.com', phone:'010-0000-0000', birth:'2002년 3월 14일'};
pages.account = () => myPage('계정 관리', `<h2 class="account-sub">프로필</h2>
  <section class="account-identity account-card" aria-label="프로필"><span class="account-avatar">${avatarHtml()}</span><span><b>${esc(settings.nickname || '이름 설정')}</b><small>핀맵 프로필</small></span></section>
  <h2 class="account-sub">개인정보</h2>
  <dl class="account-card account-info">
    <div><dt>연락처 정보</dt><dd>${esc(settings.contactEmail || ACCOUNT_EXAMPLE.email)}, ${esc(settings.contactPhone || ACCOUNT_EXAMPLE.phone)}</dd></div>
    <div><dt>생년월일</dt><dd>${esc(settings.birth || ACCOUNT_EXAMPLE.birth)}</dd></div>
  </dl>
  <p class="account-note">예시 정보예요. 실제 서비스에서는 가입할 때 입력한 정보가 보여요.</p>
  <nav class="account-exit" aria-label="로그아웃 및 회원 탈퇴">
    <button type="button" data-action="logoutask">로그아웃</button><span aria-hidden="true">|</span><button type="button" data-action="leaveask">회원 탈퇴</button>
  </nav>`, 'accountpage');
pages.accountaccess = () => myPage('로그아웃, 탈퇴', `<p class="mpdesc">계정 이용을 잠시 쉬거나 종료할 수 있어요.</p>
  <section class="account-section access-options" aria-label="계정 이용 관리">
    <button type="button" class="setrow" data-action="logoutask"><div><b>로그아웃</b><small>이 기기에서 계정 이용을 종료해요.</small></div>${icon('chevright')}</button>
    <button type="button" class="setrow account-leave" data-action="leaveask"><div><b>탈퇴하기</b><small>저장한 콘텐츠와 설정이 모두 삭제돼요.</small></div>${icon('chevright')}</button>
  </section>`, 'accountaccesspage', 'account');
actions.accountaccess = () => go('accountaccess');

/* ---------- 항목별 초기화: 저장 콘텐츠와 코스는 보존 ---------- */
const RESET_OPTIONS = {
  keywords: {label:'키워드 초기화', description:'선택한 관심 키워드만 해제해요. 저장한 카테고리와 콘텐츠는 유지돼요.'},
  notifications: {label:'알림 설정 초기화', description:'푸시와 마감/주변/리마인드 알림을 꺼요.'},
};
// '저장 설정 초기화' → '저장 설정을 초기화했어요.' (받침에 따라 을/를)
function resetDoneText(label){ const base = label.replace(/\s*초기화$/, ''), c = base.charCodeAt(base.length - 1) - 0xAC00; return `${base}${c >= 0 && c % 28 ? '을' : '를'} 초기화했어요.`; }
function resetEntry(key){
  const option=RESET_OPTIONS[key];
  return `<section class="setting-reset" aria-label="${option.label}"><button type="button" data-action="resetask-${key}">${option.label}</button></section>`;
}
function partialResetState(key, currentSettings, currentPreferences){
  const next = {settings:{...currentSettings}, preferences:[...currentPreferences]};
  switch (key) {
    case 'connections': Object.assign(next.settings, {accounts:[], accSync:{}, lastSync:null}); break;
    case 'keywords': next.preferences = []; break;
    case 'notifications': Object.assign(next.settings, {push:false, notiDeadline:false, notiNearby:false, notiReminder:false}); break;
    case 'saving': next.settings.aiDefault = !PM_ENV.development; break;
    default: throw new Error('알 수 없는 초기화 항목');
  }
  return next;
}
function applyPartialReset(key){
  if (!Object.hasOwn(RESET_OPTIONS, key)) return;
  if (PM_ENV.development) { toast('아직 데이터가 연결되지 않았어요.'); return; }
  const next = partialResetState(key, settings, preferences);
  try {
    localStorage.setItem(STORAGE, JSON.stringify({items, preferences:next.preferences, onboardDone, settings:next.settings}));
  } catch {
    toast('변경 내용을 저장하지 못해서 초기화하지 않았어요. 다시 시도해 주세요.'); return;
  }
  if (key === 'connections') cancelAccountSync();
  settings = next.settings; preferences = next.preferences;
  if (key === 'keywords') homeViewIds = null;
  $('#sheet').close(); render(); toast(resetDoneText(RESET_OPTIONS[key].label));
}
Object.entries(RESET_OPTIONS).forEach(([key, option]) => {
  actions[`resetask-${key}`] = () => confirmPop(`${option.label}를 진행할까요?`, option.description, `resetdo-${key}`, '초기화', '취소');
  actions[`resetdo-${key}`] = () => applyPartialReset(key);
});

// 확인(회색 · 왼쪽) / 유지하기(검정 · 오른쪽)
function confirmPop(title, desc, okAction, okLabel = '확인', cancelLabel = '유지하기'){
  modal('', `<div class="cfpop"><b>${title}</b><p>${desc}</p>
    <div class="cfpopbtns"><button class="cfok" data-action="${okAction}">${okLabel}</button><button class="cfkeep" data-action="close">${cancelLabel}</button></div></div>`);
  $('#sheet').classList.add('confirmpop');
}
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('confirmpop'));
Object.assign(actions, {
  logoutask: () => confirmPop('로그아웃할까요?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes', '로그아웃', '취소'),
  leaveask: () => confirmPop('탈퇴할까요?', '탈퇴하면 저장한 콘텐츠와 설정이 모두 지워져요.<br>지운 내용은 되돌릴 수 없어요.', 'leaveyes', '탈퇴하기', '유지하기'),
  logoutyes: () => { $('#sheet').close(); go('home'); toast('로그아웃했어요. (체험)'); openOnboarding(0); },
  leaveyes: () => { try { [STORAGE, ...LEGACY_KEYS].forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); },
  resetask: () => go('account')
});

/* ---------- 온보딩 다시 보기: 처음 온보딩과 따로 · 고른 관심사는 반영하지 않고 끝나면 마이로 ---------- */
actions.intro = () => openOnboardingPreview();

// Apply the previewed choice when leaving the theme page, including its back button.
const goBeforeThemePreview = go;
go = function(next){ if(page==='themeset'&&next!=='themeset')PinmapTheme.commitPreview();return goBeforeThemePreview.apply(this,arguments); };

// 2026-11-10 프로필 카드: 사진 · 이름(편집) 밖 어디를 눌러도 계정 관리로 가요. 키보드는 오른쪽 '>' 버튼으로.
document.addEventListener('click', e => {
  if (page !== 'my' || detailId) return;
  const card = e.target.closest('.myprofile');
  if (!card || e.target.closest('.myprofile-photo,.myprofile-name,.myprofile-form,.myprofile-go,input,button,form')) return;
  go('account');
});

/* ---------- 2026-11-10 캘린더로 내보내기: 마감 일정만 한 번에 .ics 파일로 (Google · Apple 캘린더에서 가져오기). 양방향 동기화는 다음 단계 ---------- */
const calExportList = () => (typeof calDueList === 'function' ? calDueList().filter(x => calDue(x) >= calToday) : []);
pages.calexport = () => {
  const list = calExportList();
  return myPage('캘린더로 내보내기', `<p class="mpdesc calx-desc">저장한 콘텐츠의 마감 일정을 내 캘린더에 한 번에 넣어요.<br>Google 캘린더와 Apple 캘린더 모두 같은 파일로 가져올 수 있어요.</p>
  <section class="mycard calx-list" aria-label="내보낼 마감 일정">
    <h2>내보낼 마감 일정 <span>${list.length}개</span></h2>
    ${list.length ? list.map(x => `<div class="calx-row"><span class="calx-date">${esc(fmtDay(calDue(x)))}</span><b>${esc(x.title)}</b></div>`).join('') : '<p class="muted">다가오는 마감 일정이 없어요.</p>'}
  </section>
  <div class="calx-actions">
    <button type="button" class="filled calx-btn" data-action="calexportapple" ${list.length ? '' : 'disabled'}>${icon('calendar')}Apple 캘린더로 내보내기</button>
    <button type="button" class="calx-btn calx-secondary" data-action="calexportgoogle" ${list.length ? '' : 'disabled'}>${icon('calendar')}Google 캘린더로 내보내기</button>
  </div>
  <p class="hint calx-hint">지금은 한 번 내보내기만 할 수 있어요. 핀맵에서 바꾼 내용이 캘린더에 자동으로 반영되지는 않아요.</p>`, 'calxpage');
};
function calExportFile(){
  const list = calExportList(); if (!list.length) { toast('내보낼 마감 일정이 없어요.'); return false; }
  const d8 = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const safe = t => String(t || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, ' ');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = list.map(x => { const s = calDue(x), e = new Date(s); e.setDate(e.getDate() + 1);
    return ['BEGIN:VEVENT', `UID:pinmap-${x.id}-${d8(s)}@pinmap`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(s)}`, `DTEND;VALUE=DATE:${d8(e)}`, `SUMMARY:${safe(x.title)} ${safe(x.dueLabel || '마감')}`, `DESCRIPTION:${safe(x.period || x.desc || '핀맵에 저장한 콘텐츠')}`, 'END:VEVENT'].join('\r\n'); });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pinmap//Deadlines//KO', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
  try {
    const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'pinmap-deadlines.ics'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return list.length;
  } catch { toast('캘린더 파일을 만들지 못했어요. 다시 시도해 주세요.'); return false; }
}
Object.assign(actions, {
  calexport: () => go('calexport'),
  calexportapple: () => { const n = calExportFile(); if (n) toast(`마감 일정 ${n}개를 캘린더 파일로 저장했어요.\n파일을 열면 Apple 캘린더에 추가돼요.`); },
  calexportgoogle: () => { const n = calExportFile(); if (n) { toast(`마감 일정 ${n}개를 캘린더 파일로 저장했어요.\nGoogle 캘린더의 가져오기에서 이 파일을 선택해 주세요.`); try { window.open('https://calendar.google.com/calendar/r/settings/export', '_blank', 'noopener,noreferrer'); } catch {} } }
});
