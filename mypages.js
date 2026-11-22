// 마이 하위 페이지 (mysub.js 다음에 불러와요)
// 마이에서 누르는 기능은 아래에서 올라오는 시트 대신 새 페이지로 열리고, 왼쪽 위 ← 로 마이로 돌아가요.
// 현재 위치 · 관심 키워드 · 알림 · 저장 · 위치/지도 · 저장하는 방법 · 앱 정보 · 핀맵 계정 설정

const MY_PAGES = {calexport:'캘린더로 내보내기', favorites:'즐겨찾기', interestset:'관심 키워드 설정', notiset:'알림 설정', saveset:'저장 설정', themeset:'화면 모드', guide:'이용 가이드', howtopage:'저장하는 방법', appinfo:'앱 정보', faq:'자주 묻는 질문', notice:'공지사항', terms:'약관 및 정책', account:'계정 관리'};
Object.entries(MY_PAGES).forEach(([k, v]) => { PARENT_TAB[k] = 'my'; pageName[k] = v; });
const myPage = (title, body, cls = '', back = 'my') => `<div class="mypage ${cls}">${subHead(title, back)}${body}</div>`;

/* ---------- 마이 첫 화면의 공통 바로가기 ---------- */
function myQuickCards(){
  return `<div class="my-quick" role="group" aria-label="바로가기">
    <button type="button" class="myq-card" data-page="favorites"><span class="myq-ico" aria-hidden="true">${likeHeartIcon()}</span><b>즐겨찾기</b></button>
    <button type="button" class="myq-card" data-page="courses"><span class="myq-ico" aria-hidden="true">${icon('route')}</span><b>내 코스</b></button>
    <div class="myq-card"><span class="myq-ico" aria-hidden="true">${icon('question')}</span><b>미정</b></div>
  </div>`;
}

/* ---------- 관심 키워드 설정 (온보딩으로 가지 않고 이 페이지에서 바로 바꿔요) ---------- */
pages.interestset = function(){
  const opts = PinmapCategories.all.map(c=>({id:c.id,short:c.label}));
  return myPage('관심 키워드 설정', `
    <p class="muted mpdesc kwdesc">고른 키워드에 맞는 저장 콘텐츠를 홈에서 먼저 보여드려요.\n아무것도 고르지 않으면 최근 저장한 순서로 보여드려요.</p>
    <div class="kwgrid" role="group" aria-label="관심 키워드">${opts.map(o => { const on = preferences.some(id=>PinmapCategories.get(id)?.id===o.id);
      return `<button class="kwopt ${on ? 'on' : ''}" data-kw="${o.id}" role="checkbox" aria-checked="${on}"><span class="kwico" aria-hidden="true">${PinmapCategories.icon(o.id,on)}</span><span>${o.short}</span></button>`; }).join('')}</div>
`, 'kwpage');
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-kw]'); if (!b) return;
  const id = b.dataset.kw;
  preferences = [...new Set(preferences.map(v=>PinmapCategories.get(v)?.id).filter(Boolean))];
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
Object.assign(actions, {
  notisheet: () => go('notiset'),
  notisettings: () => go('notiset'),
  savesheet: () => go('saveset'),
  appinfo: () => go('appinfo'),
  account: () => go('account'),
  guide: () => go('guide'),
  howto: () => go('howtopage')
});
// 마이의 '현재 위치' 줄은 페이지로 (홈 상단의 위치 버튼은 지금처럼 시트)
document.addEventListener('click', e => {
  const b = e.target.closest('.mgroup [data-action="placesheet"]');
  if (b && page === 'my') { e.stopImmediatePropagation(); go('myaddresses'); }
}, true);

/* ---------- 즐겨찾기 ---------- */
let favSel = null, favRemoving = false;
const favoriteItems = () => [
  ...items.filter(item=>item.favorite).map(item=>({
    id:`post:${item.backendId??item.id}`,backendId:item.backendId??String(item.id),kind:'post',
    sourceId:item.id,sourceItem:item,title:item.title,desc:item.desc,memo:item.memo,
    category:item.category,type:item.type,savedAt:item.savedAt,ago:item.ago,favorite:true,
    onFavoriteChange(value){item.favorite=value;}
  })),
  ...PinmapPlaces.favorites(items).map(place=>({...place,kind:'place'}))
];
function favSyncSelection(){
  if (!favSel) return;
  const list=favoriteItems(), count=favSel.size;
  const label=document.querySelector('.fav-selcount');
  if(label)label.textContent=count ? `${count}개 선택` : '게시물이나 장소를 골라 주세요';
  const all=document.querySelector('.fav-selall');
  if(all)all.textContent=list.length&&list.every(item=>favSel.has(item.id))?'선택 해제':'전체 선택';
  const remove=document.querySelector('.fav-remove');
  if(remove)remove.disabled=!count||favRemoving;
}
pages.favorites = () => {
  const list = favoriteItems();
  if(!list.length)favSel=null;
  else if(favSel)favSel=new Set([...favSel].filter(id=>list.some(item=>item.id===id)));
  const count=favSel?.size||0;
  const row = x => {
    const isPlace=x.kind==='place';
    const description = x.desc || x.memo;
    const place = isPlace&&x.address ? `${icon('pin')}<span>${esc(x.address)}</span>` : `<span>${esc(x.category || x.type || '')}</span>`;
    const on=favSel?.has(x.id);
    return `<button type="button" class="calrow fav-row${on?' on':''}" ${favSel?`role="checkbox" aria-checked="${!!on}"`:`data-detail="${x.sourceId}"`} data-favitem="${esc(x.id)}" data-fav-kind="${x.kind}" ${isPlace&&!x.unlocated?`data-fav-place-index="${x.locationIndex}"`:''} aria-label="${esc(x.title)} ${isPlace?'장소':'게시물'}${favSel?' 선택':' 상세 보기'}">
    <span class="calthumb${x.unlocated?' fav-unlocated-thumb':''}">${x.unlocated?icon('pin'):isPlace&&x.photo?`<img src="${esc(x.photo)}" alt="">`:libThumb(x.sourceItem)}</span>
    <span class="caltext fav-text"><b>${esc(x.title)}</b><small class="fav-kind">${isPlace?'장소':'게시물'}</small>${description ? `<small class="fav-desc">${esc(description)}</small>` : ''}
      <small class="fav-meta">${place}<span class="fav-time">${esc(savedAgo(x))} 저장</span></small></span>
    ${favSel?`<span class="fav-choice" aria-hidden="true">${icon('check')}</span>`:''}
  </button>`;
  };
  const posts=list.filter(entry=>entry.kind==='post'),places=list.filter(entry=>entry.kind==='place');
  return myPage('즐겨찾기', list.length
    ? `<div class="fav-header"><p class="fav-count">${list.length}개</p><button type="button" class="cf-textbtn" data-action="${favSel?'favselectoff':'favselect'}">${favSel?'취소':'선택'}</button></div>
      <div class="fav-items">${posts.length?`<section class="fav-group"><h2 class="fav-group-title">게시물 좋아요</h2>${posts.map(row).join('')}</section>`:''}${places.length?`<section class="fav-group"><h2 class="fav-group-title">장소 좋아요</h2>${places.map(row).join('')}</section>`:''}</div>
      ${favSel?`<div class="cf-selbar" role="toolbar" aria-label="선택한 즐겨찾기"><button type="button" class="cf-selall fav-selall" data-action="favselall">${list.every(item=>favSel.has(item.id))?'선택 해제':'전체 선택'}</button><span class="cf-selcount fav-selcount" aria-live="polite">${count?`${count}개 선택`:'게시물이나 장소를 골라 주세요'}</span><button type="button" class="cf-seldel fav-remove" data-action="favremove" ${count&&!favRemoving?'':'disabled'}>${likeHeartIcon()}좋아요 취소</button></div>`:''}`
    : `<div class="empty fav-empty">${likeHeartIcon()}<h3>아직 좋아요한 게시물이나 장소가 없어요</h3><p class="muted">게시물 상세나 지도에서 하트를 누르면 여기에 모여요.</p><button type="button" class="fav-go" data-page="map">지도로 가기</button></div>`, `favpage${favSel?' cf-selecting':''}`);
};
actions.favselect=()=>{favSel=new Set();render();};
actions.favselectoff=()=>{favSel=null;render();};
actions.favselall=()=>{
  if(!favSel||favRemoving)return;
  const list=favoriteItems(), all=list.every(item=>favSel.has(item.id));
  list.forEach(item=>all?favSel.delete(item.id):favSel.add(item.id));
  render();
};
actions.favremove=async()=>{
  if(!favSel?.size||favRemoving)return;
  const selected=favoriteItems().filter(item=>favSel.has(item.id));
  favRemoving=true;favSyncSelection();
  try{
    const count=await PinmapFavorites.removeMany(selected);
    favSel=null;render();toast(`${count}개의 좋아요를 취소했어요.`);
  }catch(error){toast(error.message||'좋아요를 취소하지 못했어요.');}
  finally{favRemoving=false;favSyncSelection();}
};
document.addEventListener('click',event=>{
  if(page!=='favorites')return;
  const card=event.target.closest('[data-favitem]');
  if(card&&!favSel){window.pmDetailPlace=card.dataset.favKind==='place'&&card.dataset.favPlaceIndex!=null?{id:Number(card.dataset.detail),index:Number(card.dataset.favPlaceIndex)}:null;return;}
  if(!favSel)return;
  if(card){
    event.stopPropagation();
    if(favRemoving)return;
    const id=card.dataset.favitem;
    favSel.has(id)?favSel.delete(id):favSel.add(id);
    card.classList.toggle('on',favSel.has(id));
    card.setAttribute('aria-checked',String(favSel.has(id)));
    favSyncSelection();
  }else if(event.target.closest('[data-page]'))favSel=null;
},true);
pages.appinfo = () => myPage('앱 정보', `<div class="mycard settings">
    <div class="setrow"><div><b>핀맵</b><small>저장을 다시, 일상으로</small></div></div>
    <div class="setrow"><div><b>이용 환경</b><small>로그인 서비스</small></div></div>
    <div class="setrow"><div><b>데이터 보관</b><small>저장한 콘텐츠와 설정은 로그인한 계정에서 다시 볼 수 있어요.</small></div></div>
  </div>`);

/* ---------- 자주 묻는 질문 · 공지사항 · 약관 및 정책 (2026-11-03, 마이 하단 도움말) ---------- */
const infoRows = rows => `<div class="mycard settings">${rows.map(([t, d]) => `<div class="setrow"><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>`;
pages.faq = () => myPage('자주 묻는 질문', infoRows([
  ['SNS 콘텐츠는 어떻게 저장하나요?', '홈 추가 메뉴에서 Instagram 링크·저장 ZIP·캡처 이미지를 선택해 주세요.'],
  ['저장한 콘텐츠는 어디에서 다시 보나요?', '홈에서 주변 저장 장소와 최근 저장을, 컬렉션에서 전체 목록을 볼 수 있어요.'],
  ['AI 자동 분류가 틀렸어요.', '콘텐츠 상세에서 카테고리를 직접 바꿀 수 있어요.<br>저장 설정에서 자동 분류를 끌 수도 있어요.'],
  ['원본 게시물이 삭제되면 어떻게 되나요?', '원본 링크가 열리지 않을 수 있어요. 핀맵에 저장된 장소 정보와 내 메모는 남지만, 원본 삭제 여부를 자동으로 확인하지는 않아요.'],
  ['위치 권한은 어디에서 바꾸나요?', '브라우저의 사이트 설정에서 위치 권한을 바꿀 수 있어요.']
]), 'settingpage');
pages.notice = () => myPage('공지사항', infoRows([
  ['콘텐츠 추가 안내', 'Instagram 게시물·릴스 링크, 저장 게시물 ZIP 또는 캡처 이미지를 추가할 수 있어요.'],
  ['웹 공유받기 안내', '현재 웹에서는 다른 앱의 공유 메뉴에서 핀맵으로 바로 저장할 수 없어요. Instagram 링크를 복사해 추가창에 붙여넣거나 캡처 화면으로 추가해 주세요.']
]), 'settingpage');
pages.terms = () => myPage('약관 및 정책', `<div class="mycard settings policy-list">
  <a class="setrow" href="terms.html" target="_top"><div><b>서비스 이용약관</b><small>계정·콘텐츠 분석·월간 이용권의 이용 조건이에요.</small></div></a>
  <a class="setrow" href="privacy.html" target="_top"><div><b>개인정보 처리방침</b><small>계정·콘텐츠·구독 정보의 처리와 삭제 안내예요.</small></div></a>
  <a class="setrow" href="refunds.html" target="_top"><div><b>환불·해지 정책</b><small>구독 해지와 Paddle 환불 요청 방법을 확인해요.</small></div></a>
  <a class="setrow" href="plans.html" target="_top"><div><b>서비스·요금제 및 문의</b><small>월 5,000원·매월 분석 300개와 문의처를 확인해요.</small></div></a>
</div>${infoRows([
  ['위치기반서비스 안내', '현재 위치의 처리와 권한 설정은 개인정보 처리방침에서 확인할 수 있어요.'],
  ['오픈소스 라이선스', '지도 표시에 Leaflet을 사용해요.']
])}`, 'settingpage');
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
    .replace(/<h1 class="ob-title"[^>]*>[\s\S]*?<\/h1>/, '<p class="ob-desc howtosub">마음에 드는 콘텐츠를 발견했다면?</p>');
  onboardStep = keep;
  return myPage('저장하는 방법 다시 보기', `<div class="ob-screen step2 howtobody">${html}
    <div class="ob-actions"><button class="filled ob-next" data-action="linkimport">Instagram 링크로 저장하기</button></div></div>`, 'howtopage', 'guide');
};

/* ---------- 프로필: 사진/이름 직접 편집 ---------- */
/* ---------- 계정 관리 (2026-11-10): 프로필 · 개인정보(연락처, 생년월일) 보기, 맨 아래 로그아웃 | 회원 탈퇴 ---------- */
// 사진 · 이름은 마이 프로필 카드에서 바로 바꿔요. 연락처 · 생년월일은 프로토타입 예시 값이에요.
const ACCOUNT_EXAMPLE = {email:'seoyeon@example.com', phone:'010-0000-0000', birth:'2002년 3월 14일'};
pages.account = () => myPage('계정 관리', `<h2 class="account-sub">프로필</h2>
  <section class="account-identity account-card" aria-label="프로필"><span class="account-avatar">${avatarHtml()}</span><span><b>${esc(settings.nickname || '이름 설정')}</b><small>핀맵 프로필</small></span><button type="button" class="account-edit iconbtn" data-page="profile" aria-label="프로필 편집">${icon('chevright')}</button></section>
  <h2 class="account-sub">개인정보</h2>
  <dl class="account-card account-info">
    <div><dt>이메일</dt><dd>${esc(PM_ENV.requiresAuth ? (window.PinmapAccountIdentity?.email || '확인 중') : (settings.contactEmail || ACCOUNT_EXAMPLE.email))}</dd></div>
    <div><dt>연락처</dt><dd>${esc(PM_ENV.requiresAuth ? (settings.contactPhone || '등록된 정보 없음') : (settings.contactPhone || ACCOUNT_EXAMPLE.phone))}</dd></div>
    <div><dt>생년월일</dt><dd>${esc(PM_ENV.requiresAuth ? (settings.birth || '등록된 정보 없음') : (settings.birth || ACCOUNT_EXAMPLE.birth))}</dd></div>
  </dl>
  ${PM_ENV.requiresAuth ? '' : '<p class="account-note">프로토타입 예시 정보예요.</p>'}
  <nav class="account-exit" aria-label="로그아웃 및 회원 탈퇴">
    <button type="button" data-action="logoutask">로그아웃</button><span aria-hidden="true">|</span><button type="button" data-action="leaveask">회원 탈퇴</button>
  </nav>`, 'accountpage');
/* ---------- 항목별 초기화: 저장 콘텐츠와 코스는 보존 ---------- */
const RESET_OPTIONS = {
  keywords: {label:'키워드 초기화', description:'선택한 관심 키워드만 해제해요. 저장한 카테고리와 콘텐츠는 유지돼요.'},
  notifications: {label:'알림 설정 초기화', description:'앱 안 마감/주변/리마인드 알림을 꺼요.'},
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
    case 'keywords': next.preferences = []; break;
    case 'notifications': Object.assign(next.settings, {push:false, notiDeadline:false, notiNearby:false, notiReminder:false}); break;
    case 'saving': next.settings.aiDefault = false; break;
    default: throw new Error('알 수 없는 초기화 항목');
  }
  return next;
}
async function applyPartialReset(key){
  if (!Object.hasOwn(RESET_OPTIONS, key)) return;
  const next = partialResetState(key, settings, preferences);
  if(PM_ENV.requiresAuth){
    const before={settings,preferences};settings=next.settings;preferences=next.preferences;
    if(!await persist()){settings=before.settings;preferences=before.preferences;return;}
  }else{
    try {localStorage.setItem(STORAGE,JSON.stringify({items,preferences:next.preferences,onboardDone,settings:next.settings}));}
    catch {toast('변경 내용을 저장하지 못해서 초기화하지 않았어요. 다시 시도해 주세요.');return;}
  }
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
  modal('', `<div class="cfpop"><b id="confirm-title">${title}</b><p id="confirm-desc">${desc}</p>
    <div class="cfpopbtns"><button class="cfok" data-action="${okAction}">${okLabel}</button><button class="cfkeep" data-action="close">${cancelLabel}</button></div></div>`);
  $('#sheet').classList.add('confirmpop');
  $('#sheet').setAttribute('aria-labelledby','confirm-title');
  $('#sheet').setAttribute('aria-describedby','confirm-desc');
}
$('#sheet').addEventListener('close', () => { if($('#sheet').open)return; $('#sheet').classList.remove('confirmpop'); $('#sheet').removeAttribute('aria-labelledby'); $('#sheet').removeAttribute('aria-describedby'); });
Object.assign(actions, {
  logoutask: () => confirmPop('로그아웃할까요?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes', '로그아웃', '취소'),
  leaveask: () => confirmPop('탈퇴할까요?', '탈퇴하면 저장한 콘텐츠와 설정이 모두 지워져요.<br>이용 중인 구독도 즉시 해지되며, 되돌릴 수 없어요.', 'leaveyes', '탈퇴하기', '유지하기'),
  logoutyes: () => { $('#sheet').close(); go('home'); toast('로그아웃했어요. (체험)'); openOnboarding(1); },
  leaveyes: () => { try { [STORAGE, ...LEGACY_KEYS].forEach(k => localStorage.removeItem(k)); } catch {} location.reload(); },
  resetask: () => go('account')
});

/* ---------- 온보딩 다시 보기: 처음 온보딩과 따로 · 고른 관심사는 반영하지 않고 끝나면 마이로 ---------- */
actions.intro = () => openOnboardingPreview();

// Apply the previewed choice when leaving the theme page, including its back button.
const goBeforeThemePreview = go;
go = function(next){ if(page==='themeset'&&next!=='themeset')PinmapTheme.commitPreview();return goBeforeThemePreview.apply(this,arguments); };

// 프로필 사진 버튼 밖의 카드를 누르면 계정 관리로 가요.
document.addEventListener('click', e => {
  if (page !== 'my' || detailId) return;
  const card = e.target.closest('.myprofile');
  if (!card || e.target.closest('.myprofile-photo,.myprofile-go,input,button,form')) return;
  go('account');
});

/* ---------- 2026-11-10 캘린더로 내보내기: 마감 일정만 한 번에 .ics 파일로 (Google · Apple 캘린더에서 가져오기). 양방향 동기화는 다음 단계 ---------- */
// An unverified extracted date stays visible as a candidate in Pinmap, but is
// not exported into a personal calendar as a confirmed appointment.
const calExportList = () => (typeof calDueList === 'function' ? calDueList().filter(x => calDue(x) >= calToday && !x.eventCandidate) : []);
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
