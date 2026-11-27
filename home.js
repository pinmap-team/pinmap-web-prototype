// 홈 화면 (레이아웃 개편) · calendar.js 다음에 불러와요
// 구성: 마감 임박 띠배너(맨 위 고정) → 최근 저장 카드 → 캘린더 위젯 → 카테고리 · 최근 저장

/* ---------- 홈 관심 키워드 추가 (온보딩 선택지에는 나오지 않아요) ---------- */
PinmapCategories.all.forEach(c=>{homeSections[c.id]=()=>({list:items.filter(x=>PinmapCategories.of(x).id===c.id)});});
/* ---------- 마감 임박 띠배너: 맨 위 고정 · 자동 롤링 · 오늘 다시 보지 않기 ---------- */
// 개발 단계라 저장하지 않아요: 새로고침하면 다시 뜨고, 앱 안에서 다른 화면에 갔다 와도 숨긴 상태가 유지돼요
let stripHidden = false;
const stripHiddenToday = () => stripHidden;
const dLabel = x => x.eventCandidate ? '확인 필요' : calDays(x) < 0 ? '지난 일정' : calDays(x) === 0 ? 'D-day' : 'D-' + calDays(x);
const dueSoon = x => !x.eventCandidate && calDays(x) >= 0 && calDays(x) <= 3;
function stripBar(){
  const due = calDueList().filter(x => calDue(x) >= calToday && calDays(x) <= 14 && x.dueLabel !== '행사 시작');
  if (!due.length || stripHiddenToday()) return '';
  const item = x => `<button class="strip-item ${dueSoon(x) ? 'soon' : ''}" data-detail="${x.id}"><b>${dLabel(x)}</b><span>${esc(x.title)}</span></button>`;
  // 끝에서 처음으로 자연스럽게 이어지도록 첫 항목을 한 번 더 붙여요
  return `<div class="strip" role="region" aria-label="마감 임박 콘텐츠"><div class="strip-roll"><div class="strip-track" data-n="${due.length}">${due.map(item).join('')}${due.length > 1 ? item(due[0]) : ''}</div></div><button class="strip-hide" data-action="striphide">오늘 다시 보지 않기</button></div>`;
}
let stripIdx = 0;
setInterval(() => {
  const t = document.querySelector('.strip-track'); if (!t) return;
  const n = Number(t.dataset.n); if (n < 2) return;
  stripIdx++;
  t.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
  t.style.transform = `translateY(${-stripIdx * 100 / (n + 1)}%)`;
  if (stripIdx === n) setTimeout(() => { stripIdx = 0; t.style.transition = 'none'; t.style.transform = 'translateY(0)'; }, 480);
}, 3000);
actions.striphide = () => {
  stripHidden = true;
  const y = window.scrollY; render(); window.scrollTo(0, y);
  toast('오늘은 마감 임박 배너를 보지 않아요.'); $('#snackbar').classList.add('oneline');
};

/* ---------- 메인 최근 저장 카드 (크게 · 좌우로 넘기기) ---------- */
function homePicks(){
  return items.slice(0,8).map(x => ({x,id:null}));
}
function pickCard({x, id}, i, total = 1){
  // 저장된 콘텐츠의 카테고리를 보여줘요.
  const tag = PinmapCategories.of(x).label;
  const desc = (x.desc || '').trim().replace(/[.。]+$/, '');
  return `<button class="pick" data-detail="${x.id}" data-i="${i}">
    <span class="pickimg">${libThumb(x)}</span>
    <span class="pickword" aria-hidden="true">${esc(tag)}</span>
    <span class="picktext"><b>${esc(x.title)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
    ${total > 1 ? `<span class="pickdots" aria-hidden="true">${Array.from({length:total}, (_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>` : ''}
  </button>`;
}

// Reuse the banner's existing cards and content slots without inventing content.
function emptyPickCards(){
  return Array.from({length:3},()=>`<div class="pick pick-placeholder" aria-hidden="true">
    <span class="pickimg"></span><span class="pickword"><i></i></span>
    <span class="picktext"><b><i></i></b><small><i></i></small></span>
    <span class="pickdots"><i></i><i></i><i></i></span>
  </div>`).join('');
}

/* ---------- 캘린더 위젯: 선택한 날짜의 일정만 표시 ---------- */
function calWidget(){
  const selected = calSelDate();
  const weekStart = calWeekStartDate(selected);
  const days = Array.from({length:7},(_,i)=>{const day=new Date(weekStart);day.setDate(weekStart.getDate()+i);return day;});
  const due = calDueList().filter(x => calKey(calDue(x)) === calSel);
  return `<section class="hwidget calw">
    <div class="hwhead"><h2>${calToday.getMonth()+1}월 일정</h2><button type="button" class="calgo" data-action="gocal" aria-label="캘린더 전체보기">전체보기${icon('chevright')}</button></div>
    <div class="calw-days" role="group" aria-label="날짜 선택">${days.map(day=>`<button type="button" data-calday="${calKey(day)}" aria-pressed="${calKey(day)===calSel}" aria-label="${day.getMonth()+1}월 ${day.getDate()}일"><span>${['일','월','화','수','목','금','토'][day.getDay()]}</span><b>${day.getDate()}</b></button>`).join('')}</div>
    ${due.length ? `<div class="calnext">${due.map(x => `<button class="cnrow" data-detail="${x.id}"><span class="cncontent"><span class="cntext">${esc(x.title)}</span></span><span class="cnbadge ${dueSoon(x) ? 'soon' : ''}">${dLabel(x)}</span></button>`).join('')}</div>` : '<p class="hint calnone">이 날짜에 등록된 일정이 없어요.</p>'}
  </section>`;
}

/* ---------- 작은 위젯 · 최근 저장 ---------- */
// 관심 키워드에서 켠 것들의 콘텐츠를 모아 보여줘요 (아무것도 안 켰으면 최근 저장)
const rcard = x => `<button class="rcard" data-detail="${x.id}"><span class="rcimg">${libThumb(x)}</span><b>${esc(x.title)}</b><small>${esc(savedAgo(x))} 저장</small></button>`;
function subWidgets(){
  const list = items.slice(0, 12);
  return `<section class="recentw">
      <h2 class="rwtitle">최근 저장한 목록</h2>
      ${list.length ? `<div class="recentrow">${list.map(rcard).join('')}</div>` : '<p class="muted rwempty">아직 저장한 콘텐츠가 없어요.</p>'}
    </section>`;
}

/* ---------- 키워드 카테고리 페이지: 칩을 누르면 바로 이동 ---------- */
let topicId = null;
pageName.topic = '카테고리';
pages.topic = function(){
  const o = interestOf(topicId), list = (homeSections[topicId]?.().list) || [];
  return `<div class="subhead topichead"><button class="subback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button><h1>${esc(o.short || o.label)}</h1><span class="hint">${list.length}개</span></div>
    ${list.length ? `<div class="libgrid">${list.map(x => libCard(x, false)).join('')}</div>` : `<div class="empty"><p class="muted">이 카테고리로 저장한 콘텐츠가 아직 없어요.</p></div>`}`;
};
// 홈 칩은 켜고 끄지 않고 카테고리 페이지로 (pinmap.js의 켜기/끄기보다 먼저 받아요)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-homeint]'); if (!b) return;
  e.stopImmediatePropagation(); topicId = b.dataset.homeint; go('topic');
}, true);

/* ---------- 저장된 카테고리만 표시 ---------- */
function savedHomeCategories(){
  const saved = new Set(items.map(folderOf));
  return cfCategories().filter(category => saved.has(category.id));
}
// 2026-11-27: 홈 카테고리 칩은 Figma 'Chip fill' 면 아이콘. 아이콘·글자 모두 icon-muted, 마우스 올림·포커스 icon-hover.
function homeCategoryChips(){
  const categories = savedHomeCategories();
  if (!categories.length) return '';
  return `<div class="chiprows homecategories" role="group" aria-label="저장한 카테고리 바로가기">${categories.map(category => `<button class="prefchip" data-homecategory="${esc(category.id)}"><span class="pm-home-category-art" aria-hidden="true"><span class="pm-chip-fill" style="--pm-chip-icon:url('img/category/${esc(PinmapCategories.get(category.id)?.id||'other')}-chip-fill.svg?v=20261127d')"></span></span><b>${esc(category.id)}</b></button>`).join('')}</div>`;
}
function layoutHomeCategories(){
  // 2026-11-23: 한 줄에 다 들어가면 한 줄, 아니면 최대 2줄로 나누고 줄마다 옆으로 밀어서 봐요.
  const host = document.querySelector('.homecategories');
  if (!host) return;
  const chips = [...host.querySelectorAll('.prefchip')];
  const controls = [...host.querySelectorAll(':scope > [data-home-widget-grab], :scope > [data-home-widget-remove]')];
  host.replaceChildren(...chips);
  const gap = 8, widths = chips.map(chip => chip.getBoundingClientRect().width);
  const total = widths.reduce((sum, w) => sum + w, 0) + Math.max(0, chips.length - 1) * gap;
  const rows = [document.createElement('div')];
  if (total > host.clientWidth + 1 && chips.length > 1) {
    rows.push(document.createElement('div'));
    let first = 0, used = 0;
    while (first < chips.length - 1 && used + widths[first] / 2 < total / 2) { used += widths[first] + gap; first++; }
    first = Math.max(1, first);
    rows[0].append(...chips.slice(0, first)); rows[1].append(...chips.slice(first));
  } else rows[0].append(...chips);
  rows.forEach(row => { row.className = 'hc-row'; });
  host.replaceChildren(...rows);
  host.append(...controls);
  host.classList.toggle('two-rows', rows.length > 1);
}
window.addEventListener('resize', layoutHomeCategories);
document.addEventListener('click', e => {
  const button = e.target.closest('[data-homecategory]'); if (!button) return;
  query = ''; collection = null; filter = button.dataset.homecategory;
  backHome = true; page = 'library'; detailId = null; cfChipScroll = 0;
  render(); window.scrollTo(0, 0);
});

/* ---------- 홈 ---------- */
// 2026-11-23: '추가' 버튼은 홈 화면 대신 하단 메뉴 가운데에 있어요 (app.js nav()).
const homeAddMarkup = () => `<div class="home-add-menu t-goo-anchor" id="home-add-menu" data-open="false">
  <svg class="t-goo-layer" viewBox="0 0 200 140" aria-hidden="true" focusable="false"><defs>
    <filter id="pinmap-goo-filter" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
      <feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape"/>
      <feColorMatrix in="shape" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -29.5" result="ring-solid"/>
      <feMorphology in="ring-solid" operator="dilate" radius="1" result="ring-a"/>
      <feFlood flood-color="#000000" flood-opacity="0.06" result="ring-c"/>
      <feComposite in="ring-c" in2="ring-a" operator="in" result="ring"/>
      <feGaussianBlur in="shape" stdDeviation="3" result="s2-b"/>
      <feOffset in="s2-b" dy="2" result="s2-o"/>
      <feFlood flood-color="#000000" flood-opacity="0.05" result="s2-c"/>
      <feComposite in="s2-c" in2="s2-o" operator="in" result="s2"/>
      <feGaussianBlur in="shape" stdDeviation="21" result="s3-b"/>
      <feOffset in="s3-b" dy="4" result="s3-o"/>
      <feFlood flood-color="#000000" flood-opacity="0.06" result="s3-c"/>
      <feComposite in="s3-c" in2="s3-o" operator="in" result="s3"/>
      <feMerge><feMergeNode in="s3"/><feMergeNode in="s2"/><feMergeNode in="ring"/><feMergeNode in="shape"/></feMerge>
    </filter></defs><g filter="url(#pinmap-goo-filter)">
      <circle class="t-goo-blob" cx="100" cy="100" r="20" style="--fx:-54px;--fy:-34px;--i:0"/>
      <circle class="t-goo-blob" cx="100" cy="100" r="20" style="--fx:0px;--fy:-64px;--i:1"/>
      <circle class="t-goo-blob" cx="100" cy="100" r="20" style="--fx:54px;--fy:-34px;--i:2"/>
      <circle class="t-goo-blob t-goo-blob-main" cx="100" cy="100" r="20"/>
    </g></svg>
  <div class="home-add-options" id="home-add-options" role="group" aria-label="콘텐츠 추가 방법" aria-hidden="true" inert>
    <button type="button" class="t-goo-item" style="--fx:-54px;--fy:-34px;--i:0" data-action="zipimport" aria-label="Instagram ZIP 가져오기" tabindex="-1">${icon('folder')}</button>
    <button type="button" class="t-goo-item" style="--fx:0px;--fy:-64px;--i:1" data-action="linkimport" aria-label="Instagram 링크로 저장" tabindex="-1">${icon('link')}</button>
    <button type="button" class="t-goo-item" style="--fx:54px;--fy:-34px;--i:2" data-action="screenshotimport" aria-label="캡처 화면으로 추가" tabindex="-1">${icon('galleryAdd')}</button>
  </div>
  <button type="button" class="home-add-fab t-goo-main" data-action="addoptions" aria-label="콘텐츠 추가하기" aria-expanded="false" aria-controls="home-add-options"><span class="t-goo-swap"><span class="t-goo-icon">${icon('plus')}</span></span></button>
</div>`;
pages.home = function(){
  const chips = homeCategoryChips();
  const picks = homePicks();
  const accountError = PM_ENV.requiresAuth && !items.length && window.PinmapAccountLoadError;
  const accountLoading = PM_ENV.requiresAuth && !items.length && !window.PinmapAccountLoaded && !accountError;
  const emptyHome = PM_ENV.development && !items.length && !accountError && !accountLoading;
  const heroSkeleton = '<span class="pm-skel-hero"></span><span class="pm-skel-hero-line"></span><span class="pm-skel-hero-line short"></span>';
  const pickMarkup = `<div class="mainpick" role="group" aria-label="최근 저장한 콘텐츠">${picks.map((p, i) => pickCard(p, i, picks.length)).join('')}</div>`;
  const main = accountError
    ? '<div class="empty small" role="status"><p class="muted">저장한 콘텐츠를 불러오지 못했어요.</p><button class="tonal" data-action="accountretry">다시 불러오기</button></div>'
    : accountLoading || picks.length
    ? `<div class="mainwrap">${accountSkeletonSlot('home-hero', heroSkeleton, pickMarkup, accountLoading, 'pm-skel-home')}</div>`
    : emptyHome
    ? `<div class="mainwrap"><div class="mainpick" ${picks.length?'role="group" aria-label="최근 저장한 콘텐츠"':'data-placeholder="true" aria-hidden="true"'}>${picks.length?picks.map((p, i) => pickCard(p, i, picks.length)).join(''):emptyPickCards()}</div>${emptyHome ? `<section class="home-first-save" aria-label="첫 콘텐츠 추가"><h2>첫 콘텐츠를 저장해 볼까요?</h2><p>다시 보고 싶은 콘텐츠를 모아 보세요.</p><button type="button" class="home-share-help" data-action="sharehelp">공유로 저장하는 방법</button></section>` : ''}</div>`
    : `<div class="empty small"><p class="muted">아직 저장한 콘텐츠가 없어요.</p></div>`;
  if (!accountLoading && !picks.length) pendingSkeletonSlots.delete('home-hero');
  const brand = '<div class="homebrand" aria-label="Pinmap"><img class="homebrand-symbol" src="img/pinmap-symbol-splash.svg" alt=""><span class="homebrand-name" aria-hidden="true">Pinmap</span></div>';
  if(accountLoading||accountError)return brand+main+(accountLoading?'':stripBar()+chips);
  return brand+homeWidgetLayout([
    ['featured',main,picks.length>0],['calendar',emptyHome?`<div class="home-empty-calendar" inert aria-hidden="true">${calWidget()}</div>`:calWidget(),!emptyHome],
    ['deadlines',stripBar()],['categories',chips],['recent',emptyHome?'':subWidgets()],['end','']
  ]);
};

const homeWidgetCatalog = {
  featured:{title:'최근 저장',icon:'bookmark',wide:true},
  deadlines:{title:'마감 임박',icon:'clock'},
  places:{title:'저장한 장소',icon:'pin'},
  calendar:{title:'주간 일정',icon:'calendar',wide:true},
  categories:{title:'카테고리',icon:'folder',wide:true},
  recent:{title:'최근 저장한 목록',icon:'image',wide:true},
  favorites:{title:'즐겨찾기',icon:'star'},
  folders:{title:'내 폴더',icon:'folder'},
  'photo-stack':{title:'사진 스택',icon:'image'},
  'deadline-stack':{title:'D-day 스택',icon:'clock',wide:true}
};
const homeWidgetNote=text=>`<p class="home-widget-note">${esc(text)}</p>`;
function homeWidgetMetric(widget,attributes,value,unit,caption){
  return `<button type="button" class="home-widget-metric" ${attributes}><span class="home-metric-head">${icon(widget.icon)}<span>${widget.title}</span>${icon('chevright')}</span><strong>${esc(value)}${unit?`<small>${unit}</small>`:''}</strong><span class="home-metric-caption">${esc(caption)}</span></button>`;
}
let homePhotoFrontId=null;
function homeWidgetPhotoStack(widget){
  const seen=new Set();
  const photos=[];
  for(const item of items){
    const url=libPhoto(item);
    if(!url||seen.has(url))continue;
    seen.add(url);
    photos.push(item);
    if(photos.length===3)break;
  }
  if(!photos.length)return homeWidgetMetric(widget,'data-action="golib"','0','장','저장한 사진이 여기에 보여요.');
  const current=Math.max(0,photos.findIndex(item=>String(item.id)===homePhotoFrontId));
  const front=photos[current];
  return `<button type="button" class="home-photo-widget" data-detail="${front.id}" aria-label="${esc(front.title)} 상세 보기"${photos.length>1?' aria-keyshortcuts="ArrowLeft ArrowRight"':''}>
    <span class="home-photo-widget-title">${widget.title}</span>
    <span class="home-photo-stack" aria-hidden="true">${photos.map((item,index)=>
      `<span class="home-photo-stack-card" data-photo-depth="${(index-current+photos.length)%photos.length}" data-photo-id="${item.id}" data-photo-title="${esc(item.title)}">${libThumb(item)}</span>`
    ).join('')}</span>
  </button>`;
}

function advanceHomePhoto(button,step){
  const cards=[...button.querySelectorAll('[data-photo-depth]')];
  if(cards.length<2)return;
  for(const card of cards)card.dataset.photoDepth=String((Number(card.dataset.photoDepth)-step+cards.length)%cards.length);
  const front=cards.find(card=>card.dataset.photoDepth==='0');
  homePhotoFrontId=front.dataset.photoId;
  button.dataset.detail=homePhotoFrontId;
  button.setAttribute('aria-label',front.dataset.photoTitle+' 상세 보기');
}

let homePhotoPress=null,homePhotoSwipeClick=null,homePhotoWheelLock=0;
document.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  homePhotoSwipeClick=null;
  const button=event.target.closest('.home-photo-widget');
  if(button?.querySelector('[data-photo-depth="1"]')){
    homePhotoPress={button,id:event.pointerId,x:event.clientX,y:event.clientY,sliding:false};
  }
});
document.addEventListener('pointermove',event=>{
  const press=homePhotoPress;
  if(!press||press.id!==event.pointerId)return;
  if(!press.button.isConnected){homePhotoPress=null;return;}
  const dx=event.clientX-press.x,dy=event.clientY-press.y;
  if(!press.sliding){
    if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;
    if(Math.abs(dy)>=Math.abs(dx)){homePhotoPress=null;return;}
    press.sliding=true;
    press.button.setPointerCapture(event.pointerId);
    press.button.classList.add('is-photo-sliding');
  }
  press.button.style.setProperty('--photo-pan',`${Math.max(-34,Math.min(34,dx*.28))}px`);
});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
  const press=homePhotoPress;
  if(!press||press.id!==event.pointerId)return;
  homePhotoPress=null;
  if(!press.sliding)return;
  homePhotoSwipeClick=press.button;
  press.button.classList.remove('is-photo-sliding');
  press.button.style.removeProperty('--photo-pan');
  const dx=event.clientX-press.x;
  if(type==='pointerup'&&Math.abs(dx)>=24)advanceHomePhoto(press.button,dx<0?1:-1);
});
document.addEventListener('click',event=>{
  if(!event.detail||!homePhotoSwipeClick||!homePhotoSwipeClick.contains(event.target))return;
  homePhotoSwipeClick=null;
  event.preventDefault();
  event.stopImmediatePropagation();
},true);
document.addEventListener('dragstart',event=>{
  if(event.target.closest('.home-photo-widget'))event.preventDefault();
});
document.addEventListener('keydown',event=>{
  const button=event.target.closest('.home-photo-widget');
  if(!button||!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();
  advanceHomePhoto(button,event.key==='ArrowRight'?1:-1);
});
document.addEventListener('wheel',event=>{
  const button=event.target.closest('.home-photo-widget');
  if(!button?.querySelector('[data-photo-depth="1"]')||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
  event.preventDefault();
  if(Math.abs(event.deltaX)<6||performance.now()<homePhotoWheelLock)return;
  homePhotoWheelLock=performance.now()+330;
  advanceHomePhoto(button,event.deltaX>0?1:-1);
},{passive:false});

function homeDeadlineBanner(event,index,depth){
  const date=calDue(event);
  return `<button type="button" class="t-stack-banner" data-depth="${depth}" data-deadline-index="${index}" data-detail="${event.id}" ${depth?'inert aria-hidden="true"':''}>
    <strong>${dLabel(event)}</strong>
    <span class="home-deadline-copy"><b>${esc(event.title)}</b><small>${date.getMonth()+1}월 ${date.getDate()}일${event.dueLabel?` · ${esc(event.dueLabel)}`:''}</small></span>
    ${icon('chevright')}
  </button>`;
}

function homeWidgetDeadlineStack(widget){
  const events=calDueList().filter(event=>calDue(event)>=calToday&&event.dueLabel!=='행사 시작'&&!event.eventCandidate);
  return `<div class="home-deadline-widget">
    <div class="home-deadline-head"><h3>${widget.title}</h3>
      ${events.length>1?`<button type="button" class="home-deadline-next" data-home-deadline-next aria-label="다음 마감 일정">${icon('chevright')}</button>`:''}
    </div>
    ${events.length?`<div class="t-stack" data-current="0" data-home-deadline-stack>
      ${events.slice(0,3).map((event,index)=>homeDeadlineBanner(event,index,index)).join('')}
    </div>${events.length>1?`<div hidden>${events.map((event,index)=>`<template data-home-deadline-banner>${homeDeadlineBanner(event,index,0)}</template>`).join('')}</div><span class="sr" role="status" data-home-deadline-status></span>`:''}`
    : `<p class="home-widget-note home-deadline-empty">다가오는 마감 일정이 없어요.</p>`}
  </div>`;
}

// transitions.dev Banner stacking. A new deadline arrives at depth zero and pushes the previous ones back.
document.addEventListener('click',event=>{
  const nextButton=event.target.closest('[data-home-deadline-next]');
  if(!nextButton)return;
  const widget=nextButton.closest('.home-deadline-widget');
  const stack=widget.querySelector('[data-home-deadline-stack]');
  const templates=widget.querySelectorAll('[data-home-deadline-banner]');
  const next=(Number(stack.dataset.current)+1)%templates.length;
  const banner=templates[next].content.firstElementChild.cloneNode(true);
  const duplicate=stack.querySelector(`.t-stack-banner[data-deadline-index="${next}"]`);
  duplicate?.remove();
  banner.classList.add('is-enter');
  stack.prepend(banner);
  const previous=[...stack.children].filter(element=>element!==banner&&!element.classList.contains('is-leaving'));
  previous.forEach((element,index)=>{
    element.inert=true;
    element.setAttribute('aria-hidden','true');
    if(index<2)element.dataset.depth=String(index+1);
    else{
      element.classList.add('is-leaving');
      const closeMs=parseFloat(getComputedStyle(stack).getPropertyValue('--stack-close'));
      setTimeout(()=>element.remove(),closeMs||250);
    }
  });
  stack.dataset.current=String(next);
  void banner.offsetWidth;
  banner.classList.remove('is-enter');
  widget.querySelector('[data-home-deadline-status]').textContent=[
    banner.querySelector('strong').textContent,banner.querySelector('.home-deadline-copy').textContent.trim()
  ].join(' ');
});

function homeWidgetContent(id){
  const widget=homeWidgetCatalog[id];
  switch(id){
    case 'photo-stack': return homeWidgetPhotoStack(widget);
    case 'deadline-stack': return homeWidgetDeadlineStack(widget);
    case 'featured': {
      const item=items[0];
      return item
        ? `<button type="button" class="home-widget-picture" data-detail="${item.id}">${libThumb(item)}<span><small>${widget.title}</small><b>${esc(item.title)}</b></span></button>`
        : homeWidgetMetric(widget,'data-action="golib"','0','개','저장한 콘텐츠가 여기에 보여요.');
    }
    case 'deadlines': {
      const due=calDueList().find(x=>calDue(x)>=calToday&&calDays(x)<=14&&x.dueLabel!=='행사 시작');
      return homeWidgetMetric(widget,due?`data-detail="${due.id}"`:'data-action="gocal"',due?dLabel(due):'—','',due?due.title:'다가오는 마감 없음');
    }
    case 'places': {
      const places=PinmapPlaces.all(items);
      return homeWidgetMetric(widget,'data-page="map"',places.length,'곳',places[0]?.title||'지도 열기');
    }
    case 'calendar': {
      const start=calWeekStartDate(calToday);
      const end=new Date(start);
      end.setDate(end.getDate()+7);
      const week=calDueList().filter(entry=>{const date=calDue(entry);return date>=start&&date<end;});
      return homeWidgetMetric(widget,'data-action="gocal"',week.length,'건',week[0]?.title||'이번 주 일정 없음');
    }
    case 'categories': {
      const categories=savedHomeCategories();
      return homeWidgetMetric(widget,'data-action="golib"',categories.length,'개',categories.map(category=>category.id).slice(0,3).join(' · ')||'카테고리 모아보기');
    }
    case 'recent':
      return `<div class="home-widget-recent"><h3>${widget.title}</h3>${items.length?`<div class="home-widget-thumbs">${items.slice(0,3).map(rcard).join('')}</div>`:homeWidgetNote('아직 저장한 콘텐츠가 없어요.')}</div>`;
    case 'favorites': {
      const count=items.filter(item=>item.favorite).length+PinmapPlaces.favorites(items).length;
      return homeWidgetMetric(widget,'data-page="favorites"',count,'개','게시물과 장소');
    }
    case 'folders': {
      const folders=cfCustom();
      return homeWidgetMetric(widget,'data-action="golib"',folders.length,'개',folders[0]||'컬렉션 열기');
    }
  }
}

let homeWidgetEditing=false, homeWidgetDrag=null;
const homeWidgetPlacements=()=>PinmapUserState.normalizeHomeWidgets(settings.pinnedHomeWidgets);
const homeHiddenWidgets=()=>PinmapUserState.normalizeHiddenHomeWidgets(settings.hiddenHomeWidgets);

function homeWidgetRemoveButton(id,isDefault=false){
  const title=homeWidgetCatalog[id].title;
  return `<button type="button" class="home-widget-remove" data-home-widget-remove="${id}" ${isDefault?'data-home-widget-remove-default':''} aria-label="${isDefault?'기본 ':''}${title} 홈에서 빼기"><span aria-hidden="true">−</span></button>`;
}

function homeWidgetLayout(sections){
  const placements=homeWidgetPlacements();
  const hidden=new Set(homeHiddenWidgets());
  const defaults=new Map(sections.map(([id,content,removable=true])=>[
    id,{content:hidden.has(id)&&removable?'':content,removable}
  ]));
  const moved=new Set(placements.filter(place=>place.isDefault&&defaults.get(place.id)?.removable).map(place=>place.id));
  const renderDefault=(id,relocated=false)=>{
    const {content,removable}=defaults.get(id);
    if(!content||!removable||(!relocated&&!homeWidgetEditing))return content;
    return content.replace(/^(<[a-z]+)([^>]*)>/i,(_,tag,attributes)=>{
      const controls=homeWidgetEditing?`<button type="button" class="home-widget-grab" data-home-widget-grab="${id}" data-home-widget-grab-default aria-label="기본 ${homeWidgetCatalog[id].title} 위치 옮기기"></button>${homeWidgetRemoveButton(id,true)}`:'';
      return `${tag}${attributes}${relocated?' data-home-widget-moved':''}${homeWidgetEditing?` data-home-widget-default="${id}"`:''}>${controls}`;
    });
  };
  const toolbar=homeWidgetEditing
    ? `<div class="home-widget-toolbar" aria-label="홈 위젯 편집"><button type="button" data-home-widget-edit>${icon('pen')}편집</button><button type="button" data-home-widget-done>완료</button></div>`
    : '';
  return toolbar+sections.map(([slot])=>{
    const content=moved.has(slot)?'':renderDefault(slot);
    const cards=placements.filter(place=>place.slot===slot).map(({id,isDefault})=>{
      if(isDefault)return moved.has(id)?renderDefault(id,true):'';
      const widget=homeWidgetCatalog[id];
      const controls=homeWidgetEditing?`
        <button type="button" class="home-widget-grab" data-home-widget-grab="${id}" aria-label="${widget.title} 위치 옮기기"></button>
        ${homeWidgetRemoveButton(id)}`:'';
      return `<section class="home-widget${widget.wide?' is-wide':''}" data-home-widget-pinned="${id}" aria-label="${widget.title}"><div class="home-widget-preview" ${homeWidgetEditing?'inert':''}>${homeWidgetContent(id)}</div>${controls}</section>`;
    }).join('');
    if(!cards&&(!homeWidgetEditing||(!content&&!moved.has(slot)&&slot!=='end')))return content;
    const target=homeWidgetEditing?`<button type="button" class="home-widget-drop" data-home-widget-drop aria-label="${content?homeWidgetCatalog[slot].title+' 앞에 놓기':slot==='end'?'홈 끝에 놓기':moved.has(slot)?homeWidgetCatalog[slot].title+' 원래 위치에 놓기':'이 구간에 놓기'}">배치</button>`:'';
    return `<div class="home-widget-slot" data-home-widget-slot="${slot}">${cards?`<div class="home-widget-grid home-widget-pins" aria-label="홈 위젯">${cards}</div>`:''}${target}</div>${content}`;
  }).join('');
}

function renderHomeWidgetEdit(){
  const y=scrollY;
  render();
  scrollTo(0,y);
}

function enterHomeWidgetEdit(){
  if(homeWidgetEditing)return;
  homeWidgetEditing=true;
  pickDrag=null;
  navigator.vibrate?.(18);
  renderHomeWidgetEdit();
  $('[data-home-widget-edit]')?.focus({preventScroll:true});
}

function showHomeWidgets(){
  const sheet=$('#sheet');
  const y=sheet.open?sheet.scrollTop:0;
  if(!sheet.open){
    sheet.dataset.homeWidgetSheet='';
    sheet.setAttribute('aria-label','홈 위젯');
    sheet.addEventListener('close',()=>{
      if(sheet.open)return;
      delete sheet.dataset.homeWidgetSheet;
      sheet.removeAttribute('aria-label');
    },{once:true});
  }
  const restore=homeHiddenWidgets().map(id=>
    `<button type="button" data-home-widget-restore="${id}" aria-label="기본 ${homeWidgetCatalog[id].title} 복원">${icon('plus')}${homeWidgetCatalog[id].title}</button>`
  );
  const pinned=new Set(homeWidgetPlacements().filter(place=>!place.isDefault).map(place=>place.id));
  const cards=Object.entries(homeWidgetCatalog).filter(([id])=>!pinned.has(id)).map(([id,widget])=>
    `<section class="home-widget${widget.wide?' is-wide':''}" aria-label="${widget.title}"><div class="home-widget-preview" inert>${homeWidgetContent(id)}</div><button type="button" class="home-widget-hold" data-home-widget-pin="${id}" aria-label="${widget.title} 위치 선택"></button></section>`
  );
  const recovery=restore.length?`<section class="home-widget-restore"><h3>기본 위젯 복원</h3><div>${restore.join('')}</div></section>`:'';
  const gallery=cards.length?`<p class="home-widget-note">위젯을 꾹 눌러 원하는 곳으로 끌어 놓으세요.</p><div class="home-widget-grid">${cards.join('')}</div>`:homeWidgetNote('모든 위젯이 홈에 있어요.');
  modal('홈 위젯',recovery+gallery);
  sheet.scrollTop=y;
}

function saveHomeWidgetLayout(placements,hidden=homeHiddenWidgets()){
  settings.pinnedHomeWidgets=placements;
  settings.hiddenHomeWidgets=hidden;
  renderHomeWidgetEdit();
  if(PM_ENV.requiresAuth)void window.PinmapAccountState.persist();
  else afterChange();
}

function homeWidgetDropAt(x,y){
  const main=$('.main:has(.home-widget-toolbar)');
  const bounds=main?.getBoundingClientRect();
  if(!bounds||x<bounds.left||x>bounds.right||y<48||y>innerHeight-46)return null;
  const drag=homeWidgetDrag;
  const gap=drag.gap?.getBoundingClientRect();
  if(gap&&x>=gap.left&&x<=gap.right&&y>=gap.top&&y<=gap.bottom)return drag.target;
  const hovered=document.elementFromPoint(x,y);
  const card=hovered?.closest('[data-home-widget-pinned],[data-home-widget-default]');
  const onto=card&&card!==drag.source?card:null;
  const direct=hovered?.closest('[data-home-widget-slot]');
  if(direct){
    if(!onto)return {node:direct};
    const rect=onto.getBoundingClientRect();
    const narrow=rect.width<direct.offsetWidth*.75;
    const after=narrow?x>rect.left+rect.width/2:y>rect.top+rect.height/2;
    const siblings=[...onto.parentElement.children].filter(element=>element!==drag.source&&element!==drag.gap);
    return {node:direct,before:after?siblings[siblings.indexOf(onto)+1]:onto};
  }
  const slots=[...main.querySelectorAll('[data-home-widget-slot]')];
  if(onto?.dataset.homeWidgetDefault){
    const index=slots.findIndex(slot=>slot.dataset.homeWidgetSlot===onto.dataset.homeWidgetDefault);
    if(index>=0){
      const rect=onto.getBoundingClientRect();
      return {node:slots[y>rect.top+rect.height/2?Math.min(index+1,slots.length-1):index]};
    }
  }
  const distance=slot=>{
    const rect=slot.getBoundingClientRect();
    return Math.max(rect.top-y,y-rect.bottom,0);
  };
  const node=slots.reduce((best,slot)=>!best||distance(slot)<distance(best)?slot:best,null);
  return node?{node}:null;
}

function reflowHomeWidgetGap(drag,target){
  if(target?.node===drag.target?.node&&target?.before===drag.target?.before&&(!target||drag.gap.isConnected))return;
  const rows=[...document.querySelectorAll('.main [data-home-widget-default],.main [data-home-widget-pinned]')]
    .filter(row=>row!==drag.source);
  const move=()=>{
    const oldGrid=drag.gap.parentElement;
    if(target){
      let grid=target.node.querySelector(':scope > .home-widget-grid');
      if(!grid){
        grid=document.createElement('div');
        grid.className='home-widget-grid home-widget-pins home-widget-gap-grid';
        target.node.prepend(grid);
      }
      grid.insertBefore(drag.gap,target.before||null);
    }else drag.gap.remove();
    if(oldGrid?.classList.contains('home-widget-gap-grid')&&!oldGrid.childElementCount)oldGrid.remove();
    drag.source?.classList.toggle('is-widget-out-of-flow',Boolean(target));
    drag.target=target;
  };
  if(window.PinmapFx)PinmapFx.flipRows(rows,move,{horizontal:true});
  else move();
}

function positionHomeWidgetDrag(){
  const drag=homeWidgetDrag;
  if(!drag?.ghost)return;
  const left=Math.max(8,Math.min(drag.x-drag.width/2,innerWidth-drag.width-8));
  drag.ghost.style.transform=`translate3d(${left}px,${drag.y-drag.offsetY}px,0)`;
  if(!drag.moved)return;
  if(!drag.fromGallery&&!drag.source?.isConnected){
    drag.source=$(`[${drag.isDefault?'data-home-widget-default':'data-home-widget-pinned'}="${drag.id}"]`);
    drag.source?.classList.add('is-widget-lifted');
  }
  reflowHomeWidgetGap(drag,homeWidgetDropAt(drag.x,drag.y));
}

function scrollHomeWidgetDrag(){
  const drag=homeWidgetDrag;
  if(!drag?.ghost)return;
  const edge=100;
  const delta=drag.y<edge?-Math.ceil((edge-drag.y)/8)
    : drag.y>innerHeight-edge?Math.ceil((drag.y-innerHeight+edge)/8):0;
  if(delta&&drag.moved){
    scrollBy(0,delta);
    positionHomeWidgetDrag();
  }
  drag.frame=requestAnimationFrame(scrollHomeWidgetDrag);
}

function liftHomeWidget(button,press){
  const id=button.dataset.homeWidgetPin||button.dataset.homeWidgetGrab;
  if(!id||homeWidgetDrag)return;
  const fromGallery=Boolean(button.dataset.homeWidgetPin);
  const isDefault=button.hasAttribute('data-home-widget-grab-default');
  const card=button.closest('.home-widget,[data-home-widget-default]');
  const bounds=card.getBoundingClientRect();
  if(fromGallery)$('#sheet').close();
  const drag={id,isDefault,fromGallery,pointer:press?.id,moved:false};
  homeWidgetDrag=drag;
  document.body.classList.add('home-widget-dragging');
  if(!press){
    document.body.classList.add('home-widget-keyboard-placement');
    $('[data-home-widget-drop]')?.focus();
    return;
  }
  navigator.vibrate?.(12);
  const ghost=card.cloneNode(true);
  ghost.querySelectorAll('button[data-home-widget-pin],button[data-home-widget-grab],button[data-home-widget-remove]').forEach(node=>node.remove());
  ghost.removeAttribute('data-home-widget-default');
  ghost.removeAttribute('data-home-widget-moved');
  ghost.classList.add('home-widget-ghost');
  ghost.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  ghost.inert=true;
  ghost.setAttribute('aria-hidden','true');
  ghost.style.width=`${bounds.width}px`;
  document.body.append(ghost);
  const gap=document.createElement('div');
  gap.className='home-widget-gap';
  gap.setAttribute('aria-hidden','true');
  gap.style.height=`${bounds.height}px`;
  if(isDefault||homeWidgetCatalog[id].wide)gap.classList.add('is-wide');
  Object.assign(drag,{ghost,gap,source:fromGallery?null:card,width:bounds.width,offsetY:Math.min(bounds.height/2,64),x:press.x,y:press.y});
  drag.source?.classList.add('is-widget-lifted');
  document.body.setPointerCapture(press.id);
  positionHomeWidgetDrag();
  drag.frame=requestAnimationFrame(scrollHomeWidgetDrag);
}

function finishHomeWidgetDrag(target,{reopen=false}={}){
  const drag=homeWidgetDrag;
  if(!drag)return;
  homeWidgetDrag=null;
  cancelAnimationFrame(drag.frame);
  drag.ghost?.remove();
  const gapGrid=drag.gap?.parentElement;
  drag.gap?.remove();
  if(gapGrid?.classList.contains('home-widget-gap-grid')&&!gapGrid.childElementCount)gapGrid.remove();
  drag.source?.classList.remove('is-widget-lifted','is-widget-out-of-flow');
  document.body.classList.remove('home-widget-dragging','home-widget-keyboard-placement');
  if(drag.pointer!=null&&document.body.hasPointerCapture(drag.pointer))document.body.releasePointerCapture(drag.pointer);
  if(!target){
    if(reopen&&drag.fromGallery&&homeWidgetEditing&&!$('#sheet').open)showHomeWidgets();
    return;
  }
  const slot=target.node.dataset.homeWidgetSlot;
  const placements=homeWidgetPlacements().filter(place=>place.id!==drag.id||Boolean(place.isDefault)!==drag.isDefault);
  const beforeId=target.before?.dataset.homeWidgetDefault||target.before?.dataset.homeWidgetPinned;
  const beforeIsDefault=Boolean(target.before?.dataset.homeWidgetDefault);
  const index=placements.findIndex(place=>place.id===beforeId&&Boolean(place.isDefault)===beforeIsDefault);
  if(!drag.isDefault||slot!==drag.id||target.before){
    placements.splice(index<0?placements.length:index,0,drag.isDefault?{id:drag.id,slot,isDefault:true}:{id:drag.id,slot});
  }
  saveHomeWidgetLayout(placements);
  requestAnimationFrame(()=>{
    const card=$(`[${drag.isDefault?'data-home-widget-default':'data-home-widget-pinned'}="${drag.id}"]`);
    card?.scrollIntoView({block:'nearest'});
    if(!drag.ghost)card?.querySelector('[data-home-widget-grab]')?.focus({preventScroll:true});
  });
}

let homeWidgetPress=null, homeWidgetPressTimer, homeWidgetClickBlockedUntil=0;
function clearHomeWidgetPress(){
  clearTimeout(homeWidgetPressTimer);
  homeWidgetPress=null;
}
function homeWidgetHoldArea(target){
  if(page!=='home'||detailId||target.closest('[data-home-widget-remove]'))return null;
  if($('#sheet').open)return target.closest('#sheet[data-home-widget-sheet] [data-home-widget-pin]');
  if(homeWidgetEditing)return target.closest('[data-home-widget-grab]');
  const main=target.closest('.main:has(>.homebrand)');
  return main&&!target.closest('.topbar')?main:null;
}
function activateHomeWidgetHold(area,press){
  homeWidgetClickBlockedUntil=performance.now()+300;
  if(press){press.activated=true;homeWidgetClickBlockedUntil=Infinity;}
  if(area.matches('[data-home-widget-pin],[data-home-widget-grab]'))liftHomeWidget(area,press);
  else enterHomeWidgetEdit();
}
document.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||homeWidgetDrag)return;
  homeWidgetClickBlockedUntil=0;
  const area=homeWidgetHoldArea(event.target);
  if(!area)return;
  const press={id:event.pointerId,x:event.clientX,y:event.clientY,lastY:event.clientY,activated:false};
  homeWidgetPress=press;
  const draggable=area.matches('[data-home-widget-pin],[data-home-widget-grab]');
  if(draggable&&event.pointerType==='touch')press.scroller=area.closest('#sheet')||window;
  homeWidgetPressTimer=setTimeout(()=>{
    if(homeWidgetPress===press&&homeWidgetHoldArea(area))activateHomeWidgetHold(area,press);
  },draggable?410:520);
});
document.addEventListener('pointermove',event=>{
  const drag=homeWidgetDrag;
  if(drag?.pointer===event.pointerId){
    drag.x=event.clientX;drag.y=event.clientY;
    drag.moved ||= Math.hypot(drag.x-homeWidgetPress.x,drag.y-homeWidgetPress.y)>10;
    positionHomeWidgetDrag();
    return;
  }
  const press=homeWidgetPress;
  if(!press||press.activated||event.pointerId!==press.id)return;
  if(!press.scrolling&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<=8)return;
  if(!press.scroller){clearHomeWidgetPress();return;}
  clearTimeout(homeWidgetPressTimer);
  press.scrolling=true;
  press.scroller.scrollBy(0,press.lastY-event.clientY);
  press.lastY=event.clientY;
});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
  if(event.pointerId!==homeWidgetPress?.id)return;
  const drag=homeWidgetDrag;
  if(homeWidgetPress.activated)homeWidgetClickBlockedUntil=performance.now()+300;
  clearHomeWidgetPress();
  if(drag?.pointer!==event.pointerId)return;
  const target=type==='pointerup'&&drag.moved?homeWidgetDropAt(event.clientX,event.clientY):null;
  finishHomeWidgetDrag(target,{reopen:true});
});
document.body.addEventListener('lostpointercapture',event=>{
  if(event.target!==document.body||event.pointerId!==homeWidgetDrag?.pointer)return;
  clearHomeWidgetPress();
  homeWidgetClickBlockedUntil=0;
  finishHomeWidgetDrag(null,{reopen:true});
});
window.addEventListener('scroll',()=>{
  if(homeWidgetPress&&!homeWidgetPress.activated&&!homeWidgetPress.scrolling)clearHomeWidgetPress();
},{capture:true,passive:true});
document.addEventListener('contextmenu',event=>{
  const area=homeWidgetHoldArea(event.target);
  if(!area)return;
  event.preventDefault();
  if(!area.matches('[data-home-widget-pin],[data-home-widget-grab]'))activateHomeWidgetHold(area,homeWidgetPress);
});
document.addEventListener('click',event=>{
  if(performance.now()>=homeWidgetClickBlockedUntil||event.detail===0)return;
  event.preventDefault();
  event.stopImmediatePropagation();
},true);
let pendingHomeWidgetRemoval=null;
function askHomeWidgetRemoval(button){
  finishHomeWidgetDrag(null);
  const id=button.dataset.homeWidgetRemove;
  const isDefault=button.hasAttribute('data-home-widget-remove-default');
  pendingHomeWidgetRemoval={id,isDefault};
  confirmPop(`‘${homeWidgetCatalog[id].title}’ 위젯을 삭제할까요?`,
    isDefault?'편집에서 기본 위젯을 다시 복원할 수 있어요.':'편집에서 위젯을 다시 추가할 수 있어요.',
    'homewidgetremoveconfirm','삭제','취소');
  const sheet=$('#sheet');
  sheet.querySelector('.cfkeep')?.focus();
  sheet.addEventListener('close',()=>{if(!sheet.open)pendingHomeWidgetRemoval=null;},{once:true});
}
actions.homewidgetremoveconfirm=()=>{
  if(!pendingHomeWidgetRemoval)return;
  const {id,isDefault}=pendingHomeWidgetRemoval;
  pendingHomeWidgetRemoval=null;
  $('#sheet').close();
  const placements=homeWidgetPlacements().filter(place=>place.id!==id||Boolean(place.isDefault)!==isDefault);
  saveHomeWidgetLayout(placements,isDefault?[...homeHiddenWidgets(),id]:homeHiddenWidgets());
  $('[data-home-widget-edit]')?.focus({preventScroll:true});
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-home-widget-edit],[data-home-widget-done],[data-home-widget-remove],[data-home-widget-pin],[data-home-widget-grab],[data-home-widget-drop],[data-home-widget-restore]');
  if(!button)return;
  if(button.hasAttribute('data-home-widget-edit'))showHomeWidgets();
  else if(button.hasAttribute('data-home-widget-done')){
    finishHomeWidgetDrag(null);
    homeWidgetEditing=false;
    renderHomeWidgetEdit();
  }else if(button.dataset.homeWidgetRemove){
    askHomeWidgetRemoval(button);
  }else if(button.dataset.homeWidgetRestore){
    saveHomeWidgetLayout(homeWidgetPlacements(),homeHiddenWidgets().filter(id=>id!==button.dataset.homeWidgetRestore));
    showHomeWidgets();
    ($('#sheet [data-home-widget-restore]')||$('#sheet .dialoghead button'))?.focus({preventScroll:true});
  }else if(button.hasAttribute('data-home-widget-drop'))finishHomeWidgetDrag({node:button.closest('[data-home-widget-slot]')});
  else if(event.detail===0)liftHomeWidget(button);
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!homeWidgetEditing||$('#sheet').open)return;
  event.preventDefault();
  if(homeWidgetDrag){
    finishHomeWidgetDrag(null);
    clearHomeWidgetPress();
    homeWidgetClickBlockedUntil=0;
  }else{
    homeWidgetEditing=false;
    renderHomeWidgetEdit();
  }
});
window.addEventListener('pinmap:account-cleared',()=>{
  finishHomeWidgetDrag(null);
  clearHomeWidgetPress();
  homePhotoFrontId=null;
  homePhotoPress=null;
  homePhotoSwipeClick=null;
  homeWidgetEditing=false;
  homeWidgetClickBlockedUntil=0;
  const sheet=$('#sheet');
  if(sheet.open&&(sheet.hasAttribute('data-home-widget-sheet')||pendingHomeWidgetRemoval))sheet.close();
});

// Android 공유 안내: 실제 설치나 공유 수신이 연결된 것으로 표시하지 않아요.
actions.sharehelp = () => modal('공유로 저장하기', `<div class="home-share-guide">
  <p>안드로이드에서는 별도의 단축어가 필요 없어요.</p>
  <ol><li><b>저장할 콘텐츠에서 공유 누르기</b><span>인스타그램/유튜브 등에서 공유 메뉴를 열어요.</span></li><li><b>공유할 앱에서 핀맵 선택하기</b><span>공유받기 기능이 연결된 핀맵 앱을 설치한 뒤 사용할 수 있어요.</span></li><li><b>핀맵에서 내용 확인 후 저장하기</b><span>카테고리와 메모를 확인해 저장해요.</span></li></ol>
  <p class="home-share-note">현재 웹에서는 공유받기가 연결되지 않았어요. Instagram 링크는 복사해 추가창에 붙여넣고, 다른 콘텐츠는 캡처 화면으로 추가해 주세요.</p>
  <button type="button" data-action="save">Instagram 링크로 저장하기</button>
</div>`);

/* 캘린더 위젯의 날짜를 누르면 그 날짜가 선택된 캘린더로 */
document.addEventListener('click', e => { const d = e.target.closest('[data-calday]'); if (d && page === 'home') { calSel = d.dataset.calday; const date = calSelDate(); calMonth = new Date(date.getFullYear(),date.getMonth(),1); const y = window.scrollY; render(); window.scrollTo(0,y); } });

/* 홈의 캘린더 위젯 · 전체 보기로 들어간 화면: 왼쪽 위 ← 버튼으로 홈으로 */
let backHome = false;
actions.gocal = () => { backHome = true; go('calendar'); };
actions.golib = () => { backHome = true; go('library'); };
actions.backhome = () => { backHome = false; go('home'); };
document.addEventListener('click', e => { if (e.target.closest('.bottomnav [data-page], .rail [data-page]')) backHome = false; }, true);
const backBtn = () => backHome ? `<button class="subback pageback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '';
for (const p of ['calendar', 'library']) { const base = pages[p]; pages[p] = function(){ return backBtn() + base(); }; }

/* ---------- 메인 카드 캐러셀 ----------
   브라우저 스크롤 대신 위치값(pickPos) 하나로 카드 배치를 계산해요.
   · 끌면 손가락을 그대로 따라오고, 놓으면 0.5초 동안 부드럽게 제자리로
   · 처음과 끝이 이어져(무한 반복) 양옆 카드가 항상 보여요
   · 화면을 다시 그려도 보던 카드 그대로, 혼자 움직이지 않아요 */
let pickPos = 0, pickAnim = null, pickDrag = null, pickJustDragged = false;
const PICK = {scale:0.84, peek:38, dur:520}; // 10/19: 옆 카드 작게 · 가운데 카드 뒤에서 조금만 보이게
const pickTrack = () => document.querySelector('.mainpick');
const pickCount = () => pickTrack()?.children.length || 0;
const wrapIdx = (i, n) => ((Math.round(i) % n) + n) % n;
function pickOffset(i, pos, n){ // 카드 i가 가운데에서 몇 칸 떨어져 있는지 (-n/2 ~ n/2)
  let d = i - pos;
  if (n >= 3) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
  return d;
}
function layoutPicks(){
  const track = pickTrack(); if (!track) return;
  const cs = [...track.children], n = cs.length; if (!n) return;
  const w = cs[0].offsetWidth, half = track.clientWidth / 2;
  // 옆 카드(1칸)는 바깥쪽 끝이 peek만큼 보이도록, 2칸째는 그 뒤로 숨어요
  // 옆 카드 바깥쪽 끝 = 가운데 카드 끝 + peek (화면 가장자리에 여백이 남아요)
  const x1 = Math.min(w / 2 + PICK.peek - w * PICK.scale / 2, half - w * PICK.scale / 2);
  cs.forEach((c, i) => {
    const d = pickOffset(i, pickPos, n), a = Math.abs(d), sg = Math.sign(d);
    const k = Math.min(a, 1), sc = 1 - k * (1 - PICK.scale);
    const x = a <= 1 ? d * x1 : sg * (x1 + (a - 1) * x1 * 0.35);
    c.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${sc.toFixed(4)})`;
    // 보조 카드는 흐리고 어둡게 두어 가운데 카드를 강조해요.
    c.style.opacity = a <= 1 ? String((1 - k * 0.18).toFixed(3)) : String(Math.max(0, 0.82 - (a - 1) * 1.6));
    c.style.filter = k > 0.01 ? `brightness(${(1 - k * 0.30).toFixed(3)}) blur(${(k * 2).toFixed(2)}px)` : '';
    c.style.zIndex = String(100 - Math.round(a * 10));
    c.style.visibility = a > 1.7 ? 'hidden' : '';
    c.setAttribute('aria-hidden', a > 0.5 ? 'true' : 'false'); c.tabIndex = track.dataset.placeholder==='true' || a > 0.5 ? -1 : 0;
  });
}
const easeOut = t => 1 - Math.pow(1 - t, 3);
function animatePick(to){
  cancelAnimationFrame(pickAnim);
  const from = pickPos, t0 = performance.now(), dist = Math.abs(to - from);
  if (dist < 0.001) { pickPos = to; layoutPicks(); return; }
  const dur = PICK.dur * Math.min(1, 0.55 + dist * 0.45);
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    pickPos = from + (to - from) * easeOut(t); layoutPicks();
    if (t < 1) pickAnim = requestAnimationFrame(step);
    else { const n = pickCount(); pickPos = n >= 3 ? wrapIdx(to, n) : to; layoutPicks(); pickAnim = null; }
  };
  pickAnim = requestAnimationFrame(step);
}
function goPick(target){ // target: 이동할 위치 (현재 위치 기준 가까운 쪽으로)
  const n = pickCount(); if (!n) return;
  const to = n >= 3 ? target : Math.max(0, Math.min(n - 1, target));
  animatePick(to);
}
const renderBeforeHome = render;
render = function(){ if(page!=='home'||detailId){finishHomeWidgetDrag(null);homeWidgetEditing=false;} cancelAnimationFrame(pickAnim); pickAnim = null; renderBeforeHome(); layoutHomeCategories(); const n = pickCount(); if (n) { pickPos = n >= 3 ? wrapIdx(pickPos, n) : Math.max(0, Math.min(n - 1, Math.round(pickPos))); } layoutPicks(); };
window.addEventListener('resize', layoutPicks);

// 끌어서 넘기기 (터치 · 마우스 공통). 세로로 움직이면 화면 스크롤에 양보해요
document.addEventListener('pointerdown', e => {
  const track = e.target.closest('.mainpick'); if (!track || track.dataset.placeholder==='true' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  cancelAnimationFrame(pickAnim); pickAnim = null;
  pickDrag = {id:e.pointerId, x:e.clientX, y:e.clientY, pos:pickPos, mode:null, track, w:track.children[0]?.offsetWidth || 300, hist:[[performance.now(), e.clientX]]};
});
document.addEventListener('pointermove', e => {
  const d = pickDrag; if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!d.mode) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    d.mode = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (d.mode === 'y') { pickDrag = null; goPick(Math.round(pickPos)); return; }
    try { d.track.setPointerCapture(e.pointerId); } catch {}
    d.track.classList.add('dragging');
  }
  e.preventDefault();
  const n = pickCount(); let pos = d.pos - dx / (d.w * 0.85);
  if (n < 3) { const lo = 0, hi = n - 1; if (pos < lo) pos = lo - (lo - pos) * 0.3; if (pos > hi) pos = hi + (pos - hi) * 0.3; } // 끝에서는 살짝만 늘어나요
  pickPos = pos; layoutPicks();
  d.hist.push([performance.now(), e.clientX]); if (d.hist.length > 6) d.hist.shift();
}, {passive:false});
function endPickDrag(e){
  const d = pickDrag; if (!d || e.pointerId !== d.id) return;
  pickDrag = null;
  if (d.mode !== 'x') return;
  d.track.classList.remove('dragging');
  pickJustDragged = true; setTimeout(() => { pickJustDragged = false; }, 60);
  const [t0, x0] = d.hist[0], v = (e.clientX - x0) / Math.max(1, performance.now() - t0); // px/ms
  const moved = d.pos - pickPos; // +면 다음 카드 쪽
  let target = Math.round(pickPos);
  if (Math.abs(v) > 0.35) target = Math.round(d.pos) + (v < 0 ? 1 : -1);        // 빠르게 튕기면 한 칸
  else if (Math.abs(moved) > 0.18) target = Math.round(d.pos) + (moved < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(moved))); // 조금만 끌어도 한 칸
  goPick(target);
}
document.addEventListener('pointerup', endPickDrag);
document.addEventListener('pointercancel', endPickDrag);
// 트랙패드 · 마우스 가로 휠
let wheelAcc = 0, wheelLock = 0;
document.addEventListener('wheel', e => {
  const track=e.target.closest?.('.mainpick');
  if (!track || track.dataset.placeholder==='true' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  e.preventDefault();
  if (performance.now() < wheelLock) return;
  wheelAcc += e.deltaX;
  if (Math.abs(wheelAcc) > 40) { goPick(Math.round(pickPos) + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = performance.now() + 450; }
}, {passive:false});
// 누르기: 가운데 카드는 상세, 옆 카드는 그 카드로 이동
document.addEventListener('click', e => {
  const card = e.target.closest('.mainpick .pick'); if (!card || card.classList.contains('pick-placeholder')) return;
  if (pickJustDragged) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  const n = pickCount(), i = Number(card.dataset.i), d = pickOffset(i, pickPos, n);
  if (Math.abs(d) > 0.5) { e.preventDefault(); e.stopImmediatePropagation(); goPick(Math.round(pickPos) + Math.round(d)); }
}, true);
document.addEventListener('dragstart', e => { if (e.target.closest?.('.mainpick')) e.preventDefault(); });
document.addEventListener('keydown', e => {
  const track=e.target.closest?.('.mainpick');
  if (!track || track.dataset.placeholder==='true' || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
  e.preventDefault(); goPick(Math.round(pickPos) + (e.key === 'ArrowRight' ? 1 : -1));
  setTimeout(() => pickTrack()?.querySelector('.pick[tabindex="0"]')?.focus(), PICK.dur);
});

/* ---------- 알림: 오른쪽에서 밀려 들어오는 전체 화면 ----------
   noti.js의 목록 · 읽음 처리는 그대로 쓰고, 아래 시트 대신 전체 화면으로 보여줘요 (왼쪽 위 ← 로 닫기) */
const NOTI_KINDS = [['due', '마감 임박'], ['place', '장소'], ['info', '정보']];
const notiKind = n => n.id.startsWith('due') ? 'due' : (n.id === 'near' || n.id === 'pending') ? 'place' : 'info';
function notiPanelHtml(){
  const list = notifications(), isNew = n => !settings.readNoti.includes(n.id);
  const fresh = list.filter(isNew), seen = list.filter(n => !isNew(n));
  const allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  const row = n => { const x = notiItem(n), unread = isNew(n);
    return `<button type="button" class="ntrow ${unread ? 'unread' : ''}" data-noti="${esc(n.id)}" aria-label="${esc(n.title)}${unread ? ', 안 읽음' : ''}">
      <span class="ntthumb">${x ? libThumb(x) : `<span class="ntemoji">${icon(notiBadge(n))}</span>`}</span>
      <span class="nttext"><b>${esc(n.title)}</b><span class="nttime">${esc(n.time)}</span><span class="ntbody">${esc(n.body)}</span></span>
      ${unread ? '<i class="ntdot" aria-hidden="true"></i>' : ''}</button>`; };
  const group = (label, arr) => arr.length ? `<section class="ntgroup"><h3>${label}</h3>${arr.map(row).join('')}</section>` : '';
  // 2026-11-04: 카테고리(마감 임박, 장소, 정보)별로 묶고, 묶음 안에서는 안 읽은 알림을 먼저 보여줘요
  const byKind = k => [...fresh, ...seen].filter(n => notiKind(n) === k);
  const body = list.length ? NOTI_KINDS.map(([k, label]) => group(label, byKind(k))).join('')
    : `<div class="ntempty">${icon('bell')}<b>${allOff ? '알림이 모두 꺼져 있어요' : '새 알림이 없어요'}</b><p>${allOff ? '알림 설정에서 필요한 알림을 켤 수 있어요.' : '마감 임박, 주변 장소 소식이 생기면 알려드릴게요.'}</p></div>`;
  return `<div class="npwrap">
    <header class="nphead"><button type="button" class="subback npback" data-action="notiback" aria-label="뒤로 가기">${icon('back')}</button><h1>알림${fresh.length ? ` <span>${fresh.length}</span>` : ''}</h1>
      ${fresh.length ? '<button type="button" class="npread" data-action="readall">모두 읽음</button>' : ''}</header>
    <div class="ntlist nplist">${body}</div>
  </div>`;
}
function closeNotiPanel(instant){
  const el = document.getElementById('notipanel'); if (!el) return;
  document.body.classList.remove('notipanel-open');
  if (instant) { el.remove(); return; }
  el.classList.remove('in'); setTimeout(() => el.remove(), 320);
}
notiSheet = function(){
  if ($('#sheet').open) $('#sheet').close();
  let el = document.getElementById('notipanel');
  if (el) { el.innerHTML = notiPanelHtml(); return; } // 열려 있으면 내용만 새로 그려요 (모두 읽음 등)
  el = document.createElement('section');
  el.id = 'notipanel'; el.className = 'ntsheet'; // 알림 시트(detail.css)의 목록 모양을 그대로 써요 el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '알림');
  el.innerHTML = notiPanelHtml(); document.body.append(el);
  document.body.classList.add('notipanel-open');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(() => el.querySelector('.npback')?.focus(), 50);
};
actions.noti = notiSheet;
actions.notiback = () => closeNotiPanel();
const notiSettingsBase = actions.notisettings;
actions.notisettings = () => { closeNotiPanel(true); notiSettingsBase(); };
// 알림을 누르면 패널을 닫고 해당 화면으로 (이동은 my.js에서 처리)
document.addEventListener('click', e => { if (e.target.closest('#notipanel [data-noti]')) closeNotiPanel(true); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('notipanel')) closeNotiPanel(); });
// 2026-11-27: iOS Safari에서도 누르는 동안(:active) 카테고리 버튼 민트가 보이도록 터치 리스너를 둬요.
document.addEventListener('touchstart',()=>{},{passive:true});
