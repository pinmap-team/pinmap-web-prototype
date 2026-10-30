// 마이 하위 페이지 (mysub.js 다음에 불러와요)
// 마이에서 누르는 기능은 아래에서 올라오는 시트 대신 새 페이지로 열리고, 왼쪽 위 ← 로 마이로 돌아가요.
// 현재 위치 · 관심 키워드 · 알림 · 저장 · 위치/지도 · 저장하는 방법 · 앱 정보 · 핀맵 계정 설정

const MY_PAGES = {placeset:'위치 설정', interestset:'관심 키워드 설정', notiset:'알림 설정', saveset:'저장 설정', mapset:'위치 · 지도', guide:'이용 가이드', howtopage:'저장하는 방법', appinfo:'앱 정보', account:'프로필 및 계정', resetsettings:'항목별 초기화'};
Object.entries(MY_PAGES).forEach(([k, v]) => { PARENT_TAB[k] = 'my'; pageName[k] = v; });
const myPage = (title, body, cls = '', back = 'my') => `<div class="mypage ${cls}">${subHead(title, back)}${body}</div>`;

/* ---------- 마이 첫 화면: 'SNS에서 바로 저장해보기' 빼고, 문구 · 메뉴 정리 ---------- */
const myBase = pages.my;
pages.my = function(){
  return myBase()
    .replace(/<button class="sharepromo"[\s\S]*?<\/button>\s*/, '')
    .replace('관심사 · 활용 목적', '관심 키워드 설정')
    .replace(/<button class="logout"[^>]*>[\s\S]*?<\/button>/, '');
};

/* ---------- 현재 위치 ---------- */
const placeSheetBase = placeSheet;
function placeBody(){
  const p = myPlaces();
  const rows = p.map((name, i) => `<div class="prow">
      <button class="pradio ${i===0?'on':''}" data-place-pick="${i}" role="radio" aria-checked="${i===0}" aria-label="${esc(name)} 선택"></button>
      <button class="pname" data-place-pick="${i}"><b>${esc(name)}</b><small>${esc(dongOf(name).full)}${i===0?' · 현재 위치':''}</small></button>
      <button class="picon" data-place-edit="${i}" aria-label="${esc(name)} 수정">${icon('edit')}</button>
      <button class="picon" data-place-del="${i}" aria-label="${esc(name)} 삭제" ${p.length===1?'disabled':''}>${icon('close')}</button>
    </div>`).join('');
  return `<p class="muted psub">최대 ${MAX_PLACES}개의 위치를 선택할 수 있어요.</p>
    <div class="mycard plist" role="radiogroup" aria-label="현재 위치">${rows}</div>
    ${p.length < MAX_PLACES ? `<button class="padd" data-action="placeadd">${icon('plus')} 위치 추가</button>` : `<p class="hint pfull">위치를 바꾸려면 ✎ 수정을 누르거나, 하나를 삭제한 뒤 추가하세요.</p>`}
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
    <p class="muted mpdesc">고른 키워드에 맞는 저장 콘텐츠를 홈에서 먼저 보여드려요. 복수 선택이 가능해요</p>
    <div class="kwgrid" role="group" aria-label="관심 키워드">${opts.map(o => { const on = preferences.includes(o.id);
      return `<button class="kwopt ${on ? 'on' : ''}" data-kw="${o.id}" role="checkbox" aria-checked="${on}"><span class="kwico" aria-hidden="true">${o.emoji}</span><span>${o.short}</span></button>`; }).join('')}</div>
    <p class="hint mpnote">${preferences.length ? `${preferences.length}개 선택됨 · 바로 저장돼요` : '아무것도 고르지 않으면 홈에서 랜덤으로 추천해요'}</p>`);
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
pages.notiset = () => myPage('알림 설정', pageFromModal(notiSettings));
pages.saveset = () => myPage('저장 설정', pageFromModal(saveSettings));
pages.mapset = () => myPage('위치 · 지도', pageFromModal(mapSettings));
Object.assign(actions, {
  placesheetmy: () => go('placeset'),
  notisheet: () => go('notiset'),
  notisettings: () => go('notiset'),
  savesheet: () => go('saveset'),
  mapsheet: () => go('mapset'),
  appinfo: () => go('appinfo'),
  account: () => go('account'),
  guide: () => go('guide'),
  howto: () => go('howtopage')
});
// 마이의 '현재 위치' 줄은 페이지로 (홈 상단의 위치 버튼은 지금처럼 시트)
document.addEventListener('click', e => {
  const b = e.target.closest('.mgroup [data-action="placesheet"]');
  if (b && page === 'my') { e.stopImmediatePropagation(); go('placeset'); }
}, true);

/* ---------- 앱 정보 ---------- */
pages.appinfo = () => myPage('앱 정보', `<div class="mycard settings">
    <div class="setrow"><div><b>핀맵</b><small>저장을 다시, 일상으로</small></div></div>
    <div class="setrow"><div><b>버전</b><small>Prototype 03</small></div></div>
    <div class="setrow"><div><b>데이터 보관</b><small>예시 데이터로 체험하는 프로토타입이에요. 데이터는 이 브라우저에만 저장돼요.</small></div></div>
  </div>`);

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

/* ---------- 핀맵 계정 설정: 로그아웃 · 탈퇴하기 (한 번 더 묻는 팝업) ---------- */
pages.account = () => myPage('프로필 및 계정', `<div class="account-summary">${avatarHtml()}<div><b>${esc(settings.nickname || '프로필 설정')}</b><small>프로필과 계정 정보를 관리해요</small></div></div>
  <section class="account-section" aria-label="계정 정보">
    ${myRow('profile',icon('user'),'프로필 편집')}
    ${myRow('accounts','🔗','SNS 계정 연동', `${myAccounts().length}개 연결됨`)}
    ${syncBtn()}
  </section>
  <section class="account-section" aria-label="데이터 관리">
    ${myRow('resetsettings','↺','항목별 초기화')}
  </section>
  <section class="account-section" aria-label="로그아웃 및 탈퇴">
    ${myRow('logoutask',icon('user'),'로그아웃')}
    <button class="mrow account-leave" data-action="leaveask"><span class="mrlabel">탈퇴하기</span>${icon('chevron')}</button>
  </section>`, 'accountpage');

/* ---------- 항목별 초기화: 저장 콘텐츠와 코스는 보존 ---------- */
const RESET_OPTIONS = {
  connections: {label:'연동 초기화', description:'SNS 계정 연결과 연동 기록만 초기화해요. 이미 저장한 콘텐츠는 유지돼요.'},
  keywords: {label:'키워드 초기화', description:'선택한 관심 키워드만 해제해요. 저장한 카테고리와 콘텐츠는 유지돼요.'},
  notifications: {label:'알림 설정 초기화', description:'푸시와 마감·주변·리마인드 알림을 꺼요.'},
  saving: {label:'저장 설정 초기화', description:'AI 자동 분류 설정을 기본값으로 되돌려요.'}
};
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
    toast('변경 내용을 저장하지 못했어요. 초기화하지 않았습니다.'); return;
  }
  if (key === 'connections') cancelAccountSync();
  settings = next.settings; preferences = next.preferences;
  if (key === 'keywords') homeViewIds = null;
  $('#sheet').close(); render(); toast(`${RESET_OPTIONS[key].label}를 완료했어요.`);
}
pages.resetsettings = () => myPage('항목별 초기화', `<p class="muted mpdesc">초기화할 항목을 선택해 주세요. 저장한 콘텐츠와 코스는 삭제되지 않아요.</p>
  <div class="reset-options">${Object.entries(RESET_OPTIONS).map(([key, option]) => `<button class="setrow" data-action="resetask-${key}"><div><b>${option.label}</b><small>${option.description}</small></div>${icon('chevright')}</button>`).join('')}</div>`, 'resetpage', 'account');
actions.resetsettings = () => go('resetsettings');
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
  logoutask: () => confirmPop('로그아웃하시겠습니까?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes'),
  leaveask: () => confirmPop('탈퇴하시겠습니까?', '탈퇴하면 저장한 콘텐츠와 설정이 모두 지워지고 되돌릴 수 없어요.', 'leaveyes'),
  logoutyes: () => { $('#sheet').close(); go('home'); toast('로그아웃했어요. (체험)'); openOnboarding(0); },
  leaveyes: () => { try { [STORAGE, ...LEGACY_KEYS].forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); },
  resetask: () => go('resetsettings')
});

/* ---------- 온보딩 다시 보기: 처음 온보딩과 따로 · 고른 관심사는 반영하지 않고 끝나면 마이로 ---------- */
actions.intro = () => openOnboardingPreview();
