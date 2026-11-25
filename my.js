// 마이 페이지 (프로필 · 온보딩 설정 · 모음 · 환경설정) + 알림
// interestOf, preferences, openOnboarding, STORAGE는 pinmap.js에 있고, 화면을 그릴 때 사용합니다.

/* ---------- 알림 ---------- */
// 설정에서 켠 알림만 만들어요.
const dueNum = x => Number(String(x.deadline || '').replace(/\D/g, '')); // 'D-3' → 3 (calendar.js보다 먼저 쓰일 수 있어 따로 둬요)
function notifications(){
  const list = [];
  // 달력은 시작일과 종료일을 모두 표시하지만, 마감 알림은 종료일만 알립니다.
  const dates=settings.notiDeadline
    ? (typeof calDueList==='function'?calDueList().filter(x=>!x.eventCandidate&&calDue(x)>=calToday):items.filter(x=>x.deadline))
    : [];
  const seenEvents=new Set();
  dates.forEach(x=>{
    const source=items.find(item=>item.id===x.id)||x,days=typeof calDays==='function'?calDays(x):dueNum(x);
    if(days>3 || x.dueLabel==='행사 시작')return;
    const dateKey=x.eventDate||x.deadline;
    const eventKey=x.eventDate ? dateKey+'-'+String(x.title||'').normalize('NFKC').toLocaleLowerCase('ko').replace(/[^\p{L}\p{N}]/gu,'') : '';
    if(eventKey&&seenEvents.has(eventKey))return;
    if(eventKey)seenEvents.add(eventKey);
    list.push({id:'due-'+(source.backendId??source.id)+'-'+dateKey+'-'+(x.dueLabel||''),emoji:'⏰',
      title:['마감',days===0?'오늘':`D-${days}`,x.title].join(' '),body:(x.period?x.period+' 운영, ':'')+'끝나기 전에 확인해 보세요.',
      time:typeof calDue==='function'&&calDue(x)?fmtDay(calDue(x)):'다가오는 일정',detail:source.id});
  });
  if (settings.notiNearby) {
    const near = readyPlaces().filter(x => distanceOf(x) < 999).sort((a,b) => distanceOf(a)-distanceOf(b));
    if (near.length) list.push({id:'near', emoji:'📍', title:`${settings.placeLabels?.[mainPlace()]||mainPlace()||'선택한 지역'} 주변 저장 장소 ${near.length}곳`, body:`${near[0].title} 외, 선택한 지역에 저장한 장소예요.`, time:'저장한 지역 기준', page:'map'});
  }
  const pending = items.filter(x => isPlace(x) && (x.pending || !x.address));
  if (pending.length) list.push({id:'pending', emoji:'🔎', title:`장소 확인이 필요한 콘텐츠 ${pending.length}개`, body:'AI가 위치를 확정하지 못했어요. 주소를 확인해 주세요.', time:'위치 확인 필요', detail:pending[0].id});
  if (settings.notiReminder && items.length) {
    const old = items[items.length-1];
    list.push({id:'remind-'+(old.backendId??old.id), emoji:'🔖', title:'잊고 있던 저장, 다시 볼까요?', body:`${old.title}, ${savedAgo(old)} 저장`, time:savedAgo(old), detail:old.id});
  }
  return list;
}
unreadCount = () => notifications().filter(n => !settings.readNoti.includes(n.id)).length;

function notiSheet(){
  const list = notifications(), allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  const rows = list.map(n => { const unread = !settings.readNoti.includes(n.id);
    return `<button class="notirow ${unread?'unread':''}" data-noti="${esc(n.id)}"><span class="notiemoji" aria-hidden="true">${n.emoji}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${n.time}${unread?', 새 알림':''}</small></div></button>`; }).join('');
  modal('알림', `${rows ? `<div class="notilist">${rows}</div>` : `<div class="empty small"><p class="muted">${allOff?'알림이 모두 꺼져 있어요.':'새 알림이 없어요.'}</p></div>`}
    <div class="dialogactions">${list.some(n=>!settings.readNoti.includes(n.id))?'<button class="textbtn" data-action="readall">모두 읽음</button>':''}<button class="tonal" data-action="notisettings">알림 설정</button></div>`);
}
const markRead = ids => { settings.readNoti = [...new Set([...settings.readNoti, ...ids])]; afterChange(); };

/* ---------- 마이 페이지 ---------- */
const sw = (key, label, desc) => `<label class="setrow"><div><b>${label}</b><small>${desc}</small></div><input type="checkbox" role="switch" data-setting="${key}" ${settings[key]?'checked':''}><i class="sw t-toggle" data-on="${!!settings[key]}" aria-hidden="true"><span class="t-toggle-thumb"></span></i></label>`;
// 마이: 첫 화면은 요약만 · 자세한 설정은 누르면 아래에서 올라오는 시트에서 바꿔요
const myRow = (act, emoji, label, value='') => `<button class="mrow" data-action="${act}"><span class="mrico" aria-hidden="true">${emoji}</span><span class="mrlabel">${label}</span>${value ? `<span class="mrval">${value}</span>` : ''}${icon('chevron')}</button>`;
const myNoticeIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="1.5" class="solar solar-volume-loud-bold icon" aria-hidden="true">
  <path d="M9.64844 6.19164C11.9868 4.54764 13.1563 3.72547 14.1377 4.08227C14.3259 4.15074 14.5082 4.2504 14.6709 4.37231C15.5192 5.00819 15.584 6.48716 15.7129 9.44555C15.7606 10.541 15.793 11.4787 15.793 12.0002C15.793 12.5218 15.7606 13.4594 15.7129 14.5549C15.584 17.5133 15.5192 18.9923 14.6709 19.6282C14.5082 19.7501 14.3259 19.8497 14.1377 19.9182C13.1563 20.275 11.9868 19.4528 9.64844 17.8088C9.05567 17.3921 8.75916 17.1838 8.42871 17.0627C8.36014 17.0376 8.29091 17.0146 8.2207 16.9954C7.88238 16.9025 7.52711 16.9026 6.81738 16.9026C4.83047 16.9026 3.83649 16.9029 3.08398 16.2678C2.94663 16.1519 2.78259 15.9801 2.6709 15.8362C2.05918 15.0477 2.04026 14.1264 2.00293 12.2844C2.00097 12.1878 2 12.0929 2 12.0002C2 11.9076 2.00097 11.8127 2.00293 11.7161C2.04026 9.87406 2.05918 8.95276 2.6709 8.1643C2.78259 8.02038 2.94663 7.84862 3.08398 7.73266C3.83649 7.09753 4.83047 7.09789 6.81738 7.09789C7.52711 7.09789 7.88238 7.098 8.2207 7.00512C8.29091 6.98584 8.36014 6.96285 8.42871 6.93774C8.75916 6.81667 9.05567 6.6084 9.64844 6.19164Z" fill="currentColor"/>
  <path d="M19.2744 5.42406C19.5925 5.15898 20.0658 5.2018 20.3311 5.51977L19.8369 5.93188C20.3264 5.524 20.332 5.52077 20.332 5.52074L20.3369 5.5266C20.339 5.52917 20.341 5.53294 20.3438 5.53637C20.3494 5.54342 20.357 5.55207 20.3652 5.56274C20.3819 5.58427 20.4037 5.61322 20.4297 5.64965C20.4819 5.72277 20.5519 5.82636 20.6328 5.96117C20.7947 6.23097 21.0014 6.62684 21.2051 7.15649C21.6132 8.21784 22.0049 9.80904 22.0049 12.0002C22.0049 14.1914 21.6132 15.7826 21.2051 16.844C21.0014 17.3736 20.7947 17.7695 20.6328 18.0393C20.5519 18.1741 20.4819 18.2777 20.4297 18.3508C20.4037 18.3873 20.3819 18.4162 20.3652 18.4377C20.357 18.4484 20.3494 18.457 20.3438 18.4641C20.341 18.4675 20.339 18.4713 20.3369 18.4739L20.332 18.4788C20.3308 18.4779 20.3046 18.4584 19.7549 18.0002L20.3311 18.4807C20.0659 18.7987 19.5926 18.8415 19.2744 18.5764C18.9762 18.3277 18.9201 17.8963 19.1328 17.5813L19.1748 17.5256L19.1758 17.5237L19.1777 17.5217L19.1787 17.5198C19.1841 17.5128 19.1944 17.4991 19.209 17.4788C19.2387 17.4371 19.2861 17.3671 19.3457 17.2678C19.4651 17.0689 19.6335 16.7511 19.8047 16.3059C20.1465 15.4173 20.5049 14.0086 20.5049 12.0002C20.5049 9.99187 20.1465 8.58319 19.8047 7.69457C19.6335 7.2494 19.4651 6.93158 19.3457 6.73266C19.2861 6.6334 19.2387 6.56336 19.209 6.52172L19.1787 6.48071L19.1328 6.41918C18.9201 6.10411 18.9762 5.67273 19.2744 5.42406Z" fill="currentColor"/>
  <path d="M17.7568 8.41625C18.0897 8.21905 18.5103 8.34655 18.6953 8.70141V8.70336L18.6963 8.70434L18.6982 8.70727L18.7012 8.7141L18.71 8.73266C18.7166 8.74638 18.725 8.7635 18.7344 8.78442C18.7532 8.8266 18.7776 8.88418 18.8047 8.95629C18.8588 9.10056 18.9254 9.30584 18.9902 9.57543C19.1201 10.1156 19.2412 10.9122 19.2412 12.0002C19.2412 13.0886 19.1201 13.8858 18.9902 14.426C18.9254 14.6958 18.8588 14.9009 18.8047 15.0452C18.7777 15.1172 18.7532 15.1739 18.7344 15.2161C18.725 15.2371 18.7166 15.255 18.71 15.2688L18.7012 15.2864L18.6982 15.2932L18.6963 15.2961L18.6953 15.2981C18.6924 15.2966 18.6521 15.2736 18.0918 14.9416L18.6953 15.2981C18.5103 15.6531 18.0898 15.7824 17.7568 15.5852C17.4268 15.3896 17.3062 14.9475 17.4844 14.594L17.4893 14.5842C17.4955 14.5701 17.5075 14.5419 17.5234 14.4993C17.5555 14.4137 17.6042 14.2689 17.6543 14.0608C17.7543 13.645 17.8623 12.9707 17.8623 12.0002C17.8623 11.0302 17.7542 10.3565 17.6543 9.94067C17.6042 9.73252 17.5555 9.5877 17.5234 9.50219C17.5074 9.45954 17.4956 9.43138 17.4893 9.41723L17.4844 9.40746C17.3062 9.05402 17.4269 8.61191 17.7568 8.41625Z" fill="currentColor"/>
</svg>`;
const myBillingIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="1.5" class="solar solar-bill-list-linear icon" aria-hidden="true">
  <path d="M7.24502 2H16.755C17.9139 2 18.4933 2 18.9606 2.16261C19.8468 2.47096 20.5425 3.18719 20.842 4.09946C21 4.58055 21 5.17705 21 6.37006V20.3742C21 21.2324 20.015 21.6878 19.3919 21.1176C19.0258 20.7826 18.4742 20.7826 18.1081 21.1176L17.625 21.5597C16.9834 22.1468 16.0166 22.1468 15.375 21.5597C14.7334 20.9726 13.7666 20.9726 13.125 21.5597C12.4834 22.1468 11.5166 22.1468 10.875 21.5597C10.2334 20.9726 9.26659 20.9726 8.625 21.5597C7.98341 22.1468 7.01659 22.1468 6.375 21.5597L5.8919 21.1176C5.52583 20.7826 4.97417 20.7826 4.6081 21.1176C3.985 21.6878 3 21.2324 3 20.3742V6.37006C3 5.17705 3 4.58055 3.15795 4.09946C3.45748 3.18719 4.15322 2.47096 5.03939 2.16261C5.50671 2 6.08614 2 7.24502 2Z" stroke-linecap="round" stroke="currentColor"/>
  <path d="M10.5 11L17 11" stroke-linecap="round" stroke="currentColor"/>
  <path d="M7 11H7.5" stroke-linecap="round" stroke="currentColor"/>
  <path d="M7 7.5H7.5" stroke-linecap="round" stroke="currentColor"/>
  <path d="M7 14.5H7.5" stroke-linecap="round" stroke="currentColor"/>
  <path d="M10.5 7.5H17" stroke-linecap="round" stroke="currentColor"/>
  <path d="M10.5 14.5H17" stroke-linecap="round" stroke="currentColor"/>
</svg>`;
pages.my = function(){
  window.PinmapBilling?.maybeRefresh();
  const billing = window.PinmapBilling?.view();
  const quota = billing?.account;
  const quotaLimit = quota?.active ? 300 : 50;
  const quotaUsed = Number.isInteger(quota?.used) ? Math.max(0,Math.min(quota.used,quotaLimit)) : null;
  const quotaPercent = quotaUsed === null ? 0 : Math.round(quotaUsed / quotaLimit * 100);
  const quotaTitle = quota?.active ? '월간 이용권 분석' : '무료 분석';
  const quotaDetail = PM_ENV.requiresAuth ? billing?.error ? '사용량을 불러오지 못했어요.' : quotaUsed === null ? '사용량을 확인하고 있어요.' : `${quotaUsed}회 사용 · ${Math.max(0,quotaLimit-quotaUsed)}회 남음` : '로그인하면 사용량을 확인할 수 있어요.';
  const cols = collectionNames(), places = items.filter(isPlace).length;
  const prefs = preferences.map(id => interestOf(id).short);
  const prefText = prefs.length ? (prefs.length > 1 ? `${prefs[0]} 외 ${prefs.length-1}개` : prefs[0]) : '선택 안 함';
  const notiOn = ['notiNearby','notiDeadline','notiReminder'].filter(k => settings[k]).length;
  return `
  <div class="mprofile profilecard myprofile" role="group" aria-label="프로필">
    <button type="button" class="myprofile-photo" data-action="profilephoto" aria-label="프로필 사진 변경">${avatarHtml()}<span class="account-photo-edit" aria-hidden="true">${icon('image')}</span></button>
    <input type="file" id="avatarfile" accept="image/*" hidden>
    <span class="myprofile-name"><b>${esc(settings.nickname || '이름 설정')}</b></span>
    <button type="button" class="myprofile-go" data-page="account" aria-label="계정 관리로 이동">${icon('chevright')}</button>
  </div>${myQuickCards()}
  <section class="my-quota mgroup my-section" aria-label="월간 분석 사용량">
    <div class="my-quota-head"><div><b>${quotaTitle}</b><small>매월 ${quotaLimit}회</small></div><strong>${quotaUsed === null ? '—' : `${quotaUsed} / ${quotaLimit}`}</strong></div>
    <div class="my-quota-track" role="progressbar" aria-label="${quotaTitle} 사용량" aria-valuemin="0" aria-valuemax="${quotaLimit}" ${quotaUsed === null ? '' : `aria-valuenow="${quotaUsed}"`}><span style="--quota-progress:${quotaPercent}%"></span></div>
    <p role="status">${esc(quotaDetail)}</p>
  </section>

  <section class="mgroup my-section" aria-label="위치와 관심 키워드">
    ${myRow('myaddresses','📍','위치 편집', esc(myPlaces().join(', ')))}
    ${myRow('interests','💡','관심 키워드 설정', esc(prefText))}
  </section>
  <section class="mgroup my-section" aria-label="앱 설정">
    ${myRow('billing',myBillingIcon(),'요금제 및 결제','월 5,000원')}
    ${myRow('savesheet','✨','저장 설정', settings.aiDefault ? 'AI 자동 분류' : '직접 분류')}
    ${myRow('appearance','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>','화면 모드',`<span data-theme-label>${PinmapTheme.label()}</span>`)}
    ${myRow('notisheet','🔔','알림 설정', notiOn ? `${notiOn}개 켜짐` : '꺼짐')}
    ${myRow('calsettings',icon('calendar'),'캘린더 설정')}
  </section>
  <section class="mgroup my-section" aria-label="도움말">
    ${myRow('guide','📚','이용 가이드')}
    ${myRow('faq','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7 M12 17h.01"/></svg>','자주 묻는 질문')}
    ${myRow('notice',myNoticeIcon(),'공지사항')}
    ${myRow('terms','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7"/></svg>','약관 및 정책')}
    ${myRow('appinfo','ℹ️','앱 정보','로그인 서비스')}
  </section>`;
};

/* ---------- 마이 설정 시트 (하단 시트) ---------- */
let mySheet = null; // 지금 열린 설정 시트 (설정을 바꾸면 다시 그려요)
function openMySheet(fn){ mySheet = fn; fn(); $('#sheet').classList.add('bottomsheet'); }
function notiSettings(){
  modal('알림 설정', `<div class="mycard settings">
    ${sw('notiNearby','저장 지역 주변 목록','선택한 지역의 저장 장소를 앱 안 알림 목록에 표시해요')}
    ${sw('notiDeadline','마감 임박 알림','전시/팝업이 끝나기 3일 전에 알려드려요')}
    ${sw('notiReminder','다시 보기 리마인드','잊고 있던 저장 콘텐츠를 가끔 꺼내드려요')}
  </div>`);
}
function saveSettings(){
  modal('저장 설정', `<div class="mycard settings">${sw('aiDefault','AI 자동 분류 기본 사용','끄면 저장할 때 카테고리를 직접 골라요')}</div>`);
}
$('#sheet').addEventListener('close', () => { mySheet = null; });

/* ---------- 동작 ---------- */
Object.assign(actions, {
  appearance: () => go('themeset'),
  noti: notiSheet,
  readall: () => { markRead(notifications().map(n => n.id)); notiSheet(); render(); },
  notisettings: () => go('notiset'),
  notisheet: () => go('notiset'),
  savesheet: () => go('saveset'),
  coachagain: () => { go('home'); setTimeout(() => {if(page==='home')startCoach(true);}, 300); },
  appinfo: () => go('appinfo'),
  howto: () => openOnboarding(1),
  profile: () => go('profile'),
  resetask: () => go('account'),
  resetdata: () => go('account'),
  logout: () => actions.logoutask?.()
});

document.addEventListener('click', e => {
  const n = e.target.closest('[data-noti]');
  if (n) {
    const item = notifications().find(x => x.id === n.dataset.noti);
    markRead([n.dataset.noti]); $('#sheet').close();
    if (item?.detail) { page = page === 'my' ? 'library' : page; openDetail(item.detail); }
    else if (item?.page) go(item.page);
    else render();
    return;
  }
});
document.addEventListener('change', e => {
  const key = e.target.dataset?.setting;
  if (!key) return;
  if (!['notiDeadline','notiNearby','notiReminder','aiDefault'].includes(key)) return;
  const track = e.target.nextElementSibling;
  track?.classList.add('is-init');
  if (track) track.dataset.on = String(e.target.checked);
  settings[key] = e.target.checked;
  afterChange();
  // 현재 설정 페이지의 스위치를 유지해야 전환이 끝까지 보입니다.
  // 저장 실패 시 계정 어댑터가 설정을 되돌리고 화면을 다시 그립니다.
  if (mySheet) window.setTimeout(() => { if (track?.isConnected) mySheet?.(); }, 350);
});
