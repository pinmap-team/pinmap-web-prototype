// 마이 페이지 (프로필 · 온보딩 설정 · 모음 · 환경설정) + 알림
// interestOf, preferences, openOnboarding, STORAGE는 pinmap.js에 있고, 화면을 그릴 때 사용합니다.

/* ---------- 알림 ---------- */
// 설정에서 켠 알림만 만들어요. 시간과 내용은 예시입니다.
const dueNum = x => Number(String(x.deadline || '').replace(/\D/g, '')); // 'D-3' → 3 (calendar.js보다 먼저 쓰일 수 있어 따로 둬요)
function notifications(){
  const list = [];
  // 홈 띠배너의 마감 임박 콘텐츠는 알림 목록에도 항상 보여줘요 (설정은 휴대폰 푸시 알림에만 적용)
  const dates=typeof calDueList==='function'?calDueList().filter(x=>!x.eventCandidate&&calDue(x)>=calToday):items.filter(x=>x.deadline);
  dates.forEach(x=>{
    const source=items.find(item=>item.id===x.id)||x,days=typeof calDays==='function'?calDays(x):dueNum(x);
    if(settings.notiDeadline&&days>3)return;
    const dateKey=x.eventDate||x.deadline;
    list.push({id:'due-'+(source.backendId??source.id)+'-'+dateKey+'-'+(x.dueLabel||''),emoji:'⏰',
      title:['마감',days===0?'오늘':`D-${days}`,x.title].join(' '),body:(x.period?x.period+' 운영, ':'')+'끝나기 전에 확인해 보세요.',
      time:typeof calDue==='function'&&calDue(x)?fmtDay(calDue(x)):'다가오는 일정',detail:source.id});
  });
  if (settings.notiNearby) {
    const near = readyPlaces().filter(x => distanceOf(x) < 999).sort((a,b) => distanceOf(a)-distanceOf(b));
    if (near.length) list.push({id:'near', emoji:'📍', title:`${settings.placeLabels?.[mainPlace()]||mainPlace()||'현재 위치'} 근처에 저장한 장소 ${near.length}곳`, body:`${near[0].title} 외, 지금 가까이에 있어요.`, time:'저장한 장소 기준', page:'map'});
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
const sw = (key, label, desc) => `<label class="setrow"><div><b>${label}</b><small>${desc}</small></div><input type="checkbox" role="switch" data-setting="${key}" ${settings[key]?'checked':''}><i class="sw" aria-hidden="true"></i></label>`;
// 마이: 첫 화면은 요약만 · 자세한 설정은 누르면 아래에서 올라오는 시트에서 바꿔요
const myRow = (act, emoji, label, value='') => `<button class="mrow" data-action="${act}"><span class="mrico" aria-hidden="true">${emoji}</span><span class="mrlabel">${label}</span>${value ? `<span class="mrval">${value}</span>` : ''}${icon('chevron')}</button>`;
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
    <div class="my-quota-track" role="progressbar" aria-label="${quotaTitle} 사용량" aria-valuemin="0" aria-valuemax="${quotaLimit}" ${quotaUsed === null ? '' : `aria-valuenow="${quotaUsed}"`}><span style="width:${quotaPercent}%"></span></div>
    <p role="status">${esc(quotaDetail)}</p>
  </section>

  <section class="mgroup my-section" aria-label="위치와 관심 키워드">
    ${myRow('myaddresses','📍','위치 편집', esc(myPlaces().join(', ')))}
    ${myRow('interests','💡','관심 키워드 설정', esc(prefText))}
  </section>
  <section class="mgroup my-section" aria-label="앱 설정">
    ${myRow('billing',icon('bookmark'),'요금제 및 결제','월 5,000원')}
    ${myRow('savesheet','✨','저장 설정', settings.aiDefault ? 'AI 자동 분류' : '직접 분류')}
    ${myRow('appearance','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>','화면 모드',`<span data-theme-label>${PinmapTheme.label()}</span>`)}
    ${myRow('notisheet','🔔','알림 설정', notiOn ? `${notiOn}개 켜짐` : '꺼짐')}
    ${myRow('calexport',icon('calendar'),'캘린더로 내보내기', typeof calExportList === 'function' ? `마감 ${calExportList().length}개` : '')}
  </section>
  <section class="mgroup my-section" aria-label="도움말">
    ${myRow('guide','📚','이용 가이드')}
    ${myRow('faq','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7 M12 17h.01"/></svg>','자주 묻는 질문')}
    ${myRow('notice','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l7 4V6l-7 4z M17 9.5a4 4 0 0 1 0 5"/></svg>','공지사항')}
    ${myRow('terms','<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7"/></svg>','약관 및 정책')}
    ${myRow('appinfo','ℹ️','앱 정보','Prototype 03')}
  </section>`;
};

/* ---------- 마이 설정 시트 (하단 시트) ---------- */
let mySheet = null; // 지금 열린 설정 시트 (설정을 바꾸면 다시 그려요)
function openMySheet(fn){ mySheet = fn; fn(); $('#sheet').classList.add('bottomsheet'); }
function notiSettings(){
  modal('알림 설정', `<div class="mycard settings">
    ${sw('notiNearby','현재 위치 기반 추천 알림','저장한 위치 기준으로 가까운 콘텐츠를 앱 안에서 알려드려요')}
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
  settings[key] = e.target.checked; afterChange();
  const y = window.scrollY; render(); window.scrollTo(0, y);
  mySheet?.(); // 열려 있는 설정 시트도 바로 갱신
});
