/* Photo place markers, real user-submitted place search, and shared navigation. */
(() => {
  const originalRender = render;
  let detailMap;
  let liveMap, pinLayer, locationMarker, locationHeadingMarker, searchController, placeController, mapProviderController;
  let expandedKey=null, sheetStage='peek', sheetDrag=null, suppressSheetClickUntil=0;
  let mapLocationName=null, searchOpen=false;
  if(!paths.list)paths.list='M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01';
  let listOpen=false, pinning=false, listGesture=null; // 2026-11-10 목록 시트 · 직접 핀 찍기
  let automaticLocation=false;
  const markerEntries=new Map();
  let userPosition = null;
  const locationTracker=window.PinmapLocation.createTracker();
  let userHeading = null, locationWatch = null, orientationActive = false;
  let locationBusy = false;
  let center = PM_ENV.development ? [20,0] : [37.5445,127.043], zoom = PM_ENV.development ? 2 : 15, category = 'all';
  let searchResults = null, searchQuery = '';
  const savedCoords = PM_ENV.development ? [] : [
    {id:1, lat:37.5461, lng:127.0434, kind:'cafe', image:'img/cafe.jpg'},
    {id:4, lat:37.5441, lng:127.0495, kind:'event', image:'img/exhibit.jpg'},
    {id:6, lat:37.5445, lng:127.0374, kind:'walk', image:'img/park.jpg'},
    {id:8, lat:37.5490, lng:127.0460, kind:'eat', image:'img/brunch.jpg'},
    {id:13, lat:37.5447, lng:127.0557, kind:'event', image:'img/popup-store.jpg'}, // 성수 오브젝트 팝업 (예시 위치)
    {id:9, lat:37.7720, lng:128.9470, kind:'walk', image:'img/sea-room.jpg'}  // 바다 앞 작은 숙소 · 강릉 (예시 위치)
  ];
  const cats = [['all','전체'],['eat','맛집'],['cafe','카페'],['event','전시/팝업'],['walk','산책'],['shop','쇼핑']];
  // Figma: Pinmap / Category icon (24px, same geometry for both states).
  // App category keys stay unchanged so existing filters and saved places are preserved.
  const categoryGlyphs = {
    eat: "<g class=\"lm-category-face\"><circle cx=\"14\" cy=\"12\" r=\"7\"/></g><path d=\"M4 3v18 M2 3v5a2 2 0 0 0 4 0V3\"/><path class=\"lm-category-detail\" d=\"M14 8a4 4 0 0 1 0 8\"/>",
    cafe: "<g class=\"lm-category-face\"><path d=\"M4 5h12v9a6 6 0 0 1-12 0Z\"/></g><path d=\"M16 7h2a3 3 0 0 1 0 6h-2 M3 22h15\"/><path class=\"lm-category-detail\" d=\"M7 8h6\"/>",
    event: "<g class=\"lm-category-face\"><path d=\"M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z\"/></g><path class=\"lm-category-detail\" d=\"M16 7v2 M16 11v2 M16 15v2 M7 9h5 M7 13h3\"/>",
    walk: "<g class=\"lm-category-face\"><path d=\"M12 3a4 4 0 0 0-4 4 4 4 0 0 0 0 8h8a4 4 0 0 0 0-8 4 4 0 0 0-4-4Z\"/></g><path d=\"M12 15v6 M8 21h8\"/><path class=\"lm-category-detail\" d=\"M12 7v6 M9 10l3 2 3-2\"/>",
    shop: "<g class=\"lm-category-face\"><path d=\"M8 3l-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z\"/></g><path class=\"lm-category-detail\" d=\"M9 6a5 5 0 0 0 6 0\"/>"
  };
  const categoryIcon = kind => `<svg class="lm-category-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${kind==='all'?`<path class="lm-category-all" d="${paths.spark}"/>`:categoryGlyphs[kind] || `<path d="${paths.pin}"/>`}</svg>`;
  const localPhoto = kind => PM_ENV.development ? PM_ENV.placeholderImage : ({eat:'img/brunch.jpg',cafe:'img/cafe.jpg',event:'img/exhibit.jpg',walk:'img/park.jpg',shop:'img/lamp.jpg'})[kind] || 'img/park.jpg';
  const categoryLabel = tag => ({station:'역',stop:'정류장',park:'공원',restaurant:'식당',cafe:'카페',museum:'박물관',gallery:'갤러리',shop:'상점',water:'호수',residential:'주거 지역'})[tag] || tag;
  const kindOf = tag => /restaurant|food|fast_food|bar|pub/.test(tag) ? 'eat' : /cafe|coffee|bakery/.test(tag) ? 'cafe' : /museum|gallery|theatre|artwork/.test(tag) ? 'event' : /park|garden|forest|wood/.test(tag) ? 'walk' : /shop|mall|market/.test(tag) ? 'shop' : 'walk';
  const round = (name, symbol) => `<button class="lm-round" data-lm="locate" aria-label="${name}" title="${name}">${icon(symbol)}</button>`;
  const safe = value => esc(value || '');
  const LM_RECENT_KEY='pinmap.map.recent-searches.v1';
  let recentSearches=[];
  try{const stored=JSON.parse(localStorage.getItem(LM_RECENT_KEY)||'[]');if(Array.isArray(stored))recentSearches=stored.filter(x=>typeof x==='string'&&x.trim()&&x.length<=80).slice(0,8);}catch{}
  function persistRecentSearches(){try{localStorage.setItem(LM_RECENT_KEY,JSON.stringify(recentSearches));}catch{}}
  function rememberSearch(q){const text=String(q||'').trim().replace(/\s+/g,' ').slice(0,80);if(!text)return;recentSearches=[text,...recentSearches.filter(x=>x.toLocaleLowerCase()!==text.toLocaleLowerCase())].slice(0,8);persistRecentSearches();}
  function mapRecentContent(){return recentSearchMarkup(recentSearches,{pick:'data-lm-recent',remove:'data-lm-recent-remove',clear:'data-lm-recent-clear',target:'장소'});}
  function refreshRecentSearches(){const panel=$('#lm-recent');if(!panel)return;panel.hidden=!searchOpen||!!$('#lm-search input')?.value.trim();panel.innerHTML=mapRecentContent();}
  document.addEventListener('click',event=>{
    if(page!=='map')return;
    const pick=event.target.closest('[data-lm-recent]'),remove=event.target.closest('[data-lm-recent-remove]');
    if(pick){const q=recentSearches[Number(pick.dataset.lmRecent)];if(!q)return;const input=$('#lm-search input');input.value=q;$('#lm-search [data-lm="clear-search"]').hidden=false;refreshRecentSearches();input.blur();searchPlaces(q);return;}
    if(remove){recentSearches.splice(Number(remove.dataset.lmRecentRemove),1);persistRecentSearches();refreshRecentSearches();$('#lm-recent .cf-recent-remove')?.focus();return;}
    if(event.target.closest('[data-lm-recent-clear]')){recentSearches=[];persistRecentSearches();refreshRecentSearches();$('#lm-search input')?.focus();}
  });
  const savedPlaces = () => {
    const pinned = savedCoords.map(position => {
      const item = items.find(x => x.id === position.id);
      return item && !item.pending ? {...position, image:libPhoto(item)||position.image, title:item.title, address:item.address || '주소 확인 필요', category:item.category || item.type, description:item.desc || '', savedLabel:savedAgo(item)+' 저장', source:'저장한 콘텐츠', saved:true, favorite:!!item.favorite} : null;
    }).filter(Boolean);
    const own = items.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && !x.pending && !savedCoords.some(y => y.id === x.id))
      .map(x => ({id:x.id,lat:x.lat,lng:x.lng,kind:x.mapKind||kindOf(x.category || ''),image:libPhoto(x)||localPhoto(x.mapKind||kindOf(x.category || '')),title:x.title,address:x.address || '',category:x.category || x.type,description:x.desc || '',savedLabel:savedAgo(x)+' 저장',source:'저장한 콘텐츠',saved:true,favorite:!!x.favorite}));
    return [...pinned,...own.flatMap(place=>{const item=items.find(x=>x.id===place.id);return item?.mapLocations?.length?item.mapLocations.filter(loc=>Number.isFinite(loc.coordinates?.lat)&&Number.isFinite(loc.coordinates?.lng)).map((loc,index)=>({...place,title:loc.name||place.title,lat:loc.coordinates.lat,lng:loc.coordinates.lng,address:loc.address||'주소 확인 필요',image:loc.image_data_url||PM_ENV.placeholderImage,savedLabel:loc.review_required?'지도 검색 위치 · 확인 필요':place.savedLabel,locationIndex:index})): [place];})];
  };
  function content() {
    return `<section class="live-map" aria-label="지도에서 장소 탐색"><div id="live-map-canvas"></div>
      <header class="lm-header">
        <h1 class="lm-sr-only">지도에서 저장한 장소 찾기</h1>
        <div class="lm-location-header"><button type="button" class="lm-location-title" data-action="mapaddresses">${icon('pin')}<span>${safe((n => n ? (settings.placeLabels?.[n] || n) : '현재 위치')(mapLocationName || (typeof myPlaces === 'function' ? myPlaces()[0] : null)))}</span>${icon('chevron')}</button><button type="button" class="lm-header-search" data-lm="toggle-search" aria-label="${searchOpen?'검색창 닫기':'지도에서 장소 검색'}" aria-expanded="${searchOpen}" aria-controls="lm-search-row"><span class="lm-search-open-icon">${icon('search')}</span><span class="lm-search-close-icon">${icon('close')}</span></button></div>
        <div class="lm-search-row cfpage${searchOpen?' is-open':''}" id="lm-search-row" aria-hidden="${!searchOpen}" ${searchOpen?'':'inert'}><form class="libsearch" id="lm-search" role="search"><input name="q" type="search" enterkeyhint="search" aria-label="지도 장소 검색" placeholder="어디로 가고 싶어요?" value="${safe(searchQuery)}" autocomplete="off" maxlength="80" ${searchOpen?'':'tabindex="-1"'}><button type="button" class="iconbtn" data-lm="clear-search" aria-label="검색 지우기" ${searchQuery?'':'hidden'}>${icon('close')}</button></form></div>
        <section class="cf-recent lm-recent" id="lm-recent" aria-label="최근 지도 검색어" ${searchOpen&&!searchQuery.trim()?'':'hidden'}>${mapRecentContent()}</section>
        <div class="lm-categories" role="group" aria-label="지도 카테고리" style="--lm-category-position:${Math.max(0,cats.findIndex(([id])=>id===category))*100}%">${cats.map(([id,label]) => `<button type="button" data-lm-cat="${id}" class="${category===id?'selected':''}" aria-pressed="${category===id}"><span class="lm-category-art">${categoryIcon(id)}</span><b>${label}</b></button>`).join('')}<span class="lm-category-indicator" aria-hidden="true"></span></div>
      </header>
      <details class="lm-map-credits"><summary aria-label="지도 출처 보기" title="지도 출처 보기">ⓘ</summary><div class="lm-map-credits-panel"><strong>지도 출처</strong><p class="lm-map-credits-vector"><a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>, © <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p><p class="lm-map-credits-fallback">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p><p class="lm-map-credits-google">지도 © Google</p><p class="lm-map-credits-kakao">지도 © Kakao</p><p class="lm-map-credits-naver">지도 © NAVER</p><p class="lm-map-credits-subway">지하철 출입구 © <a href="https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0" target="_blank" rel="noopener noreferrer">행정안전부·Esri Korea</a></p></div></details>
      <div class="lm-status" role="status" hidden></div>
      <div class="lm-search-results" id="lm-search-results" hidden></div>
      <div class="lm-floating-actions"><button type="button" class="lm-pin-button" data-lm="pin-start" aria-label="지도에 직접 핀 찍기" title="지도에 직접 핀 찍기">${icon('pin')}</button><button type="button" class="lm-course-button" data-lm="new-course" aria-label="새 코스 만들기" title="새 코스 만들기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4.2" cy="4.2" r="2.1"/><path d="M6.3 4.2h9.2a5.1 5.1 0 0 1 0 10.2H10a3.2 3.2 0 0 0 0 6.4h7.7"/><circle cx="19.8" cy="20.8" r="2.1"/></svg></button></div>
      <div class="lm-locate-top">${round('현재 위치로 이동','target')}</div>
      <div class="lm-pin-target" aria-hidden="true">${icon('pin')}</div>
      <div class="lm-pin-bar" role="group" aria-label="직접 핀 찍기"><p>지도를 움직여 핀을 원하는 곳에 맞춰 주세요.</p><div><button type="button" class="lm-pin-cancel" data-lm="pin-cancel">취소</button><button type="button" class="lm-pin-confirm" data-lm="pin-confirm">이 위치 저장</button></div></div>
      <div class="lm-list-scrim" data-lm="close-list" hidden></div><section class="lm-list-sheet" id="lm-list-sheet" role="dialog" aria-label="저장한 장소 목록" hidden></section>
      <section class="lm-selected-host" id="lm-selected-place" aria-label="이 근방 저장된 장소"></section>
      <nav class="bottomnav lm-shared-nav" aria-label="하단 메뉴">${nav()}</nav></section>`;
  }
  function status(message) { const el = $('#app .lm-status'); if (el) { el.textContent = message; el.hidden = !/못|실패|입력|확인|검색하고/.test(message); } }
  function hideProviderOptions() {
    const control=$('#app .lm-map-provider-control');
    if(!control)return;
    control.querySelector('.lm-map-provider-options').hidden=true;
    control.querySelector('.lm-map-provider-toggle').setAttribute('aria-expanded','false');
  }
  function updateProviderUi(state) {
    const control=$('#app .lm-map-provider-control');
    if(control)control.querySelector('.lm-map-provider-current').textContent=state.labels[state.current];
    control?.querySelectorAll('[data-provider]').forEach(option=>{
      option.disabled=!state.available[option.dataset.provider];
      option.setAttribute('aria-pressed',String(option.dataset.provider===state.current));
    });
    const notice=$('#app .lm-status');
    if(state.error&&notice){notice.textContent=state.error;notice.hidden=false;}
    else if(notice && /^(구글|카카오|네이버) 지도/.test(notice.textContent)){
      notice.textContent='';
      notice.hidden=true;
    }
  }
  function selectCategory(next) {
    category=next;
    const bar=document.querySelector('.lm-categories');
    bar?.style.setProperty('--lm-category-position',`${Math.max(0,cats.findIndex(([id])=>id===next))*100}%`);
    bar?.querySelectorAll('[data-lm-cat]').forEach(button=>{
      const selected=button.dataset.lmCat===next;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  function visiblePlaces() {
    const list = searchResults || savedPlaces();
    return list.filter(x => category === 'all' || x.kind === category);
  }
  const placeKey=place=>`${place.saved?'saved':'search'}:${place.id}${place.locationIndex==null?'':':'+place.locationIndex}`;
  function markerIcon(place,expanded=false) {
    const photo=safe(place.image||localPhoto(place.kind));
    return L.divIcon({className:`lm-photo-marker${expanded?' is-selected':''}`,
      html:`<span class="lm-place-badge"><span class="lm-badge-image"><img class="lm-badge-backdrop" src="${photo}" alt=""><img class="lm-badge-photo" src="${photo}" alt=""></span><span class="lm-badge-category">${categoryIcon(place.kind)}</span></span>`,
      iconSize:[60,60],iconAnchor:[30,30]});
  }
  function updateMarker(entry,expanded) {
    // Keep the existing photo/SVG nodes and Leaflet anchor so CSS can interpolate.
    entry.marker.setZIndexOffset(expanded?2000:0);
    const element=entry.marker.getElement();
    element?.classList.toggle('is-selected',expanded);
    element?.setAttribute('aria-label',`${entry.place.title}, ${entry.place.category}, 장소 정보 보기`);
    element?.setAttribute('aria-current',String(expanded));
    element?.setAttribute('aria-controls','lm-selected-place');
  }
  function clearSelection() {
    if(expandedKey&&markerEntries.has(expandedKey))updateMarker(markerEntries.get(expandedKey),false);
    expandedKey=null;
    $('#app .live-map')?.classList.remove('has-selected-place');
  }
  function nearbyPlaces() {
    const bounds=liveMap?.getBounds().pad(1);
    return savedPlaces().filter(place=>(category==='all'||place.kind===category)&&(!bounds||bounds.contains([place.lat,place.lng])));
  }
  function setSheetStage(stage) {
    sheetStage=stage;
    const sheet=$('#lm-selected-place .lm-sheet');if(!sheet)return;
    sheet.style.removeProperty('--lm-sheet-height');sheet.classList.remove('is-dragging','is-peek','is-half','is-full');sheet.classList.add('is-'+stage);
    sheet.closest('.live-map')?.style.removeProperty('--lm-actions-sheet-height');
    const handle=sheet.querySelector('.lm-sheet-handle');
    handle?.setAttribute('aria-expanded',String(stage!=='peek'));
  }
  function bindSheetHandle(sheet) {
    const handle=sheet.querySelector('.lm-sheet-handle');
    handle.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      sheetDrag={id:event.pointerId,y:event.clientY,height:sheet.getBoundingClientRect().height,moved:false};
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove',event=>{
      if(!sheetDrag||event.pointerId!==sheetDrag.id)return;
      const delta=sheetDrag.y-event.clientY;
      if(Math.abs(delta)>6)sheetDrag.moved=true;
      if(!sheetDrag.moved)return;
      event.preventDefault();sheet.classList.add('is-dragging');
      const min=expandedKey?sheet.parentElement.clientHeight*.5:162;
      const height=Math.max(min,Math.min(sheet.parentElement.clientHeight,sheetDrag.height+delta));
      sheet.style.setProperty('--lm-sheet-height',height+'px');
      sheet.closest('.live-map')?.style.setProperty('--lm-actions-sheet-height',height+'px');
    });
    const finish=event=>{
      if(!sheetDrag||event.pointerId!==sheetDrag.id)return;
      const drag=sheetDrag;sheetDrag=null;
      if(!drag.moved)return;
      suppressSheetClickUntil=Date.now()+350;
      const delta=drag.y-event.clientY;
      const stages=expandedKey?['half','full']:['peek','half','full'];
      const index=stages.indexOf(sheetStage);
      setSheetStage(stages[Math.max(0,Math.min(stages.length-1,index+(delta>35?1:delta< -35?-1:0)))]);
    };
    handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    handle.addEventListener('click',()=>{
      if(Date.now()<suppressSheetClickUntil)return;
      const stages=expandedKey?['half','full']:['peek','half','full'];
      setSheetStage(stages[(stages.indexOf(sheetStage)+1)%stages.length]);
    });
    handle.addEventListener('keydown',event=>{
      if(!['ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const stages=expandedKey?['half','full']:['peek','half','full'];
      setSheetStage(stages[Math.max(0,Math.min(stages.length-1,stages.indexOf(sheetStage)+(event.key==='ArrowUp'?1:-1)))]);
    });
  }
  const favoriteButton = place => place.saved ? `<button type="button" class="lm-carousel-heart${place.favorite?' is-active':''}" data-lm="toggle-favorite" data-place-key="${safe(placeKey(place))}" aria-pressed="${!!place.favorite}" aria-label="${safe(place.title)} 즐겨찾기">${icon('star')}</button>` : '';
  function renderSheet() {
    const host=$('#lm-selected-place');if(!host)return;
    const list=visiblePlaces();
    const activeIndex=Math.max(0,list.findIndex(place=>placeKey(place)===expandedKey));
    host.setAttribute('aria-label','지도 장소 카드');
    // 2026-11-10 카드 전체가 상세로 가는 버튼(제목 버튼을 카드 크기로 늘림). 저장 시점 · 화살표는 두지 않음. 위로 밀면 목록 시트
    host.innerHTML=list.length?`<button type="button" class="lm-list-tab" data-lm="open-list" aria-expanded="${listOpen}" aria-controls="lm-list-sheet" aria-label="장소 목록 열기, ${list.length}곳">${icon('list')}</button><div class="lm-carousel" role="region" aria-label="지도 장소 카드 캐러셀"><div class="lm-carousel-track" tabindex="0" aria-label="장소 카드, 좌우로 넘기기">${list.map((place,index)=>`<article class="lm-carousel-card" data-place-key="${safe(placeKey(place))}" aria-label="${index+1}번째 장소, ${safe(place.title)}"><div class="lm-carousel-photo"><img src="${safe(place.image||localPhoto(place.kind))}" alt=""></div><div class="lm-carousel-copy"><div class="lm-carousel-top"><button type="button" class="lm-card-open" data-lm="open-place" data-place-key="${safe(placeKey(place))}" aria-label="${safe(place.title)} ${place.saved?'상세 보기':'지도 앱에서 보기'}"><strong>${safe(place.title)}</strong></button>${favoriteButton(place)}</div><div class="lm-carousel-bottom"><small>${safe(place.category||'검색 결과')}</small><p>${safe(place.address||'주소 정보 없음')}</p></div></div></article>`).join('')}</div></div>`:'<div class="lm-carousel-empty">표시할 장소가 없어요.</div>';
    if(listOpen)renderList();
    const track=host.querySelector('.lm-carousel-track');
    if(!track)return;
    if(activeIndex)requestAnimationFrame(()=>{track.children[activeIndex]?.scrollIntoView({block:'nearest',inline:'center'});});
    let drag=null;
    track.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('.lm-carousel-heart'))return;
      drag={id:event.pointerId,x:event.clientX,left:track.scrollLeft,moved:false}; // 캡처는 실제로 끌 때만(카드 누르기는 버튼 클릭으로 남김)
    });
    track.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      const distance=event.clientX-drag.x;
      if(Math.abs(distance)>5&&!drag.moved){drag.moved=true;try{track.setPointerCapture(event.pointerId);}catch{}}
      if(drag.moved)track.scrollLeft=drag.left-distance;
    });
    track.addEventListener('pointerup',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      if(drag.moved)track.classList.add('just-dragged');
      drag=null;
      setTimeout(()=>track.classList.remove('just-dragged'),100);
    });
    let scrollTimer;
    track.addEventListener('scroll',()=>{
      clearTimeout(scrollTimer);
      scrollTimer=setTimeout(()=>{
        const cards=[...track.children];
        const center=track.scrollLeft+track.clientWidth/2;
        const index=cards.reduce((best,card,i)=>Math.abs(card.offsetLeft+card.offsetWidth/2-center)<Math.abs(cards[best].offsetLeft+cards[best].offsetWidth/2-center)?i:best,0);
        const place=list[index];if(place&&placeKey(place)!==expandedKey)expandPlace(place,true,false);
      },90);
    },{passive:true});
  }
  function renderList(){
    const sheet=$('#lm-list-sheet');if(!sheet)return;
    const list=visiblePlaces();
    sheet.innerHTML=`<div class="lm-list-head"><h2>${searchResults?'검색 결과':'이 근처 저장한 곳'} <span>${list.length}곳</span></h2><button type="button" class="lm-list-close" data-lm="close-list" aria-label="목록 닫기">${icon('close')}</button></div><ul class="lm-list">${list.map(place=>`<li><button type="button" class="lm-list-row" data-lm="open-place" data-place-key="${safe(placeKey(place))}"><img src="${safe(place.image||localPhoto(place.kind))}" alt=""><span><b>${safe(place.title)}</b><small>${safe(place.category||'검색 결과')}</small><em>${safe(place.address||'주소 정보 없음')}</em></span></button>${favoriteButton(place)}</li>`).join('')}</ul>`;
  }
  function setList(open,focus=true){
    listOpen=open;const sheet=$('#lm-list-sheet'),map=$('#app .live-map');if(!sheet)return;
    if(open)renderList();
    sheet.hidden=!open;const scrim=$('#app .lm-list-scrim');if(scrim)scrim.hidden=!open;map?.classList.toggle('is-listing',open);
    $('#lm-selected-place .lm-list-tab')?.setAttribute('aria-expanded',String(open));
    if(focus)requestAnimationFrame(()=>(open?sheet.querySelector('.lm-list-close'):$('#lm-selected-place .lm-list-tab'))?.focus());
  }
  function setPinning(on){
    pinning=on;const map=$('#app .live-map');if(!map)return;
    map.classList.toggle('is-pinning',on);if(on){setList(false,false);requestAnimationFrame(()=>$('#app .lm-pin-confirm')?.focus());}
    else $('#app .lm-pin-button')?.focus();
  }
  // 아래 카드 · 목록 손잡이를 위/아래로 밀면 목록 시트를 열고 닫아요(가로로 넘기는 동작과 구분)
  document.addEventListener('pointerdown',event=>{
    if(page!=='map')return;
    const zone=event.target.closest('#lm-selected-place .lm-list-tab,#lm-list-sheet');
    if(zone)listGesture={id:event.pointerId,x:event.clientX,y:event.clientY,closing:!!zone.closest('#lm-list-sheet')};
  });
  document.addEventListener('pointerup',event=>{
    if(!listGesture||listGesture.id!==event.pointerId)return;
    const g=listGesture;listGesture=null;
    const dx=event.clientX-g.x,dy=event.clientY-g.y;
    if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy)*1.2)return; // 왼쪽 책갈피를 오른쪽으로 밀면 열고, 목록을 왼쪽으로 밀면 닫아요
    suppressSheetClickUntil=Date.now()+350;
    if(!g.closing&&dx>0)setList(true);else if(g.closing&&dx<0)setList(false);
  });
  document.addEventListener('pointercancel',()=>{listGesture=null;});
  document.addEventListener('keydown',event=>{
    if(page!=='map'||event.key!=='Escape')return;
    if(listOpen){setList(false);}else if(pinning){setPinning(false);}
  });
  async function dropPin(){
    const point=liveMap.getCenter(),lat=Number(point.lat.toFixed(6)),lng=Number(point.lng.toFixed(6));
    const types=TYPES.filter(t=>t.place);
    modal('핀 저장하기',`<form id="lm-pin-form" class="lm-pin-form"><input type="hidden" name="lat" value="${lat}"><input type="hidden" name="lng" value="${lng}"><label class="field"><span>장소 이름</span><input name="title" maxlength="80" required placeholder="예: 다시 가고 싶은 카페"></label><label class="field"><span>주소 또는 위치 설명</span><input name="address" maxlength="200" required placeholder="주소를 찾고 있어요"></label><label class="field"><span>유형</span><select name="type">${types.map(t=>`<option value="${esc(t.id)}">${esc(t.id)}</option>`).join('')}</select></label><label class="field"><span>내 메모, 선택</span><textarea name="memo" maxlength="300" rows="2" placeholder="이 장소에 가고 싶은 이유"></textarea></label><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">저장하기</button></div></form>`);
    requestAnimationFrame(()=>$('#lm-pin-form [name="title"]')?.focus());
    const address=$('#lm-pin-form [name="address"]');
    try{
      const response=await fetch('https://photon.komoot.io/reverse?lat='+lat+'&lon='+lng+'&limit=1');
      const f=(await response.json()).features?.[0]?.properties||{};
      const text=[f.city||f.county,f.district,f.locality||f.suburb,f.street,f.housenumber].filter(Boolean).join(' ')||f.name||'';
      if(address&&!address.value&&text)address.value=text;
    }catch{}
    if(address){address.placeholder='예: 서울 성동구 성수동';}
  }
  document.addEventListener('submit',event=>{
    if(event.target.id!=='lm-pin-form')return;
    event.preventDefault();
    const data=new FormData(event.target);
    const title=String(data.get('title')||'').trim(),address=String(data.get('address')||'').trim(),type=String(data.get('type')||'');
    const lat=Number(data.get('lat')),lng=Number(data.get('lng'));
    if(!title||!address||!typeOf(type).place||!Number.isFinite(lat)||!Number.isFinite(lng))return;
    const mapKind=type==='전시/팝업'?'event':type==='여행'?'walk':'cafe';
    const item={id:Date.now(),title,address,type,category:shortType(type),source:'직접 추가',ago:'방금',savedAt:new Date().toISOString(),desc:'',memo:String(data.get('memo')||'').trim(),art:typeOf(type).art,lat,lng,mapKind,aiClassified:false};
    items.unshift(item);afterChange();$('#sheet').close();
    setPinning(false);markers();
    const entry=markerEntries.get(placeKey({saved:true,id:item.id}));if(entry)expandPlace(entry.place);
    toast(`${josa(title,'을/를')} 지도에 저장했어요.`);
  });
  function expandPlace(place,moveMap=true,scrollCard=true) {
    const key=placeKey(place),entry=markerEntries.get(key);if(!entry)return;
    if(expandedKey!==key){clearSelection();expandedKey=key;updateMarker(entry,true);}
    if(scrollCard){
      const card=[...document.querySelectorAll('.lm-carousel-card')].find(node=>node.dataset.placeKey===key);
      card?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    }
    const resultsPanel=$('#lm-search-results');if(resultsPanel)resultsPanel.hidden=true;
    if(moveMap)liveMap.setView([place.lat,place.lng],Math.max(liveMap.getZoom(),15),{animate:true});
  }
  function markers() {
    if (!liveMap) return;
    clearSelection();markerEntries.clear();pinLayer.clearLayers();
    const list = visiblePlaces();
    list.forEach(place => {
      const marker=L.marker([place.lat,place.lng],{title:place.title,icon:markerIcon(place),bubblingMouseEvents:false}).addTo(pinLayer);
      const entry={place,marker};markerEntries.set(placeKey(place),entry);updateMarker(entry,false);
      marker.on('click',()=>expandPlace(place));
    });
    renderSheet();
    status(searchResults ? `${list.length}개 실제 장소 검색 결과` : `${list.length}개 저장 장소`);
  }
  function mount() {
    if (!window.L) { status('지도 라이브러리를 불러오지 못했어요.'); return; }
    liveMap = L.map('live-map-canvas',{zoomControl:false,zoomAnimation:false}).setView(center,zoom);
    window.attachPinmapBasemap(liveMap);
    mapProviderController=window.PinmapMapProviders?.attach(liveMap,updateProviderUi,settings.mapApp);
    pinLayer = L.layerGroup().addTo(liveMap); markers(); drawLocation();
    if(!PM_ENV.development&&!mapLocationName){automaticLocation=true;locate();automaticLocation=false;}
    if(!PM_ENV.development&&typeof window.DeviceOrientationEvent?.requestPermission!=='function')startOrientation();
    liveMap.on('moveend', () => { center=[liveMap.getCenter().lat,liveMap.getCenter().lng]; zoom=liveMap.getZoom(); });
    requestAnimationFrame(() => liveMap?.invalidateSize());
  }
  // The detail preview uses the exact same saved-place resolver, marker and basemap.
  function mountDetailMap(){
    const host=document.getElementById('detail-map-canvas');
    if(!host)return;
    const fallback=document.getElementById('detail-map-fallback');
    const place=savedPlaces().find(p=>p.id===detailId);
    if(!window.L || !place){
      fallback.hidden=false;
      if(!place)fallback.textContent='저장된 좌표가 없어요. 장소 위치를 먼저 확인해 주세요.';
      return;
    }
    try {
      detailMap=L.map(host,{zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,zoomAnimation:false}).setView([place.lat,place.lng],15);
      window.attachPinmapBasemap(detailMap);
      detailMap.attributionControl?.remove();
      L.marker([place.lat,place.lng],{title:place.title,icon:markerIcon(place),interactive:false}).addTo(detailMap);
      requestAnimationFrame(()=>detailMap?.invalidateSize());
    } catch(error){
      detailMap?.remove(); detailMap=null; fallback.hidden=false;
    }
  }
  render = function() {
    if(detailMap){detailMap.remove();detailMap=null;}
    searchController?.abort();
    sheetDrag=null;expandedKey=null;sheetStage='peek';markerEntries.clear();
    window.unmountCourseMap?.();
    window.unmountCourseThumbnails?.();
    stopLocation();
    if (liveMap) { liveMap.remove(); liveMap=null; mapProviderController=null; locationMarker=null; locationHeadingMarker=null; }
    const isMap = page === 'map' && !detailId;
    document.body.classList.toggle('live-map-page',isMap);
    // 상세 페이지 '지도에서 보기' → 그 장소로 이동해 핀을 펼쳐요
    const focusId = isMap ? window.pmMapFocus : null;
    if (focusId != null) { window.pmMapFocus = null; searchResults = null; searchQuery = ''; category = 'all';
      const f = savedPlaces().find(p => p.id === focusId); if (f) { center = [f.lat, f.lng]; zoom = 15; } }
    if (isMap) { $('#app').innerHTML=content(); mount(); if(searchResults) showResults();
      if (focusId != null) { const focused=savedPlaces().filter(p=>p.id===focusId); if (focused.length>1 && liveMap) liveMap.fitBounds(focused.map(p=>[p.lat,p.lng]),{maxZoom:15,padding:[48,48]});
        const f=focused[0]; if (f && liveMap) expandPlace(f,false); } }
    else { originalRender(); if(detailId)mountDetailMap(); if(page==='course' && !detailId) window.mountCourseMap?.(); if(page==='courses' && !detailId) window.mountCourseThumbnails?.(); }
  };
  function drawLocation() {
    if(!liveMap)return;
    if(PM_ENV.development&&!userPosition)return;
    const demo=!userPosition;
    const point=userPosition || [37.5425,127.042];
    const heading=demo?35:userHeading;
    const label=demo?'성수동 예시 위치, 방향 예시':heading==null?'현재 위치, 방향 정보 없음':`현재 위치, 북쪽 기준 ${Math.round(heading)}도`;
    // Draw the position as a geographic vector point, never a viewport overlay.
    // The decorative heading/label is separate and cannot take focus or pan the map.
    if(locationMarker)locationMarker.setLatLng(point);
    else locationMarker=L.circleMarker(point,{radius:8,weight:3,color:'var(--color-surface)',fillColor:'var(--color-secondary)',fillOpacity:1,interactive:false,className:'lm-current-position-dot'}).addTo(liveMap);
    const element=locationMarker.getElement();
    element?.setAttribute('role','img');element?.setAttribute('aria-label',label);
    const locationIcon=L.divIcon({className:'lm-location-marker',html:`<span class="lm-location-person${heading==null?' no-heading':''}" style="--heading:${heading??0}deg"><span class="lm-heading-cone" aria-hidden="true"></span>${demo?'<span class="lm-location-demo">예시 위치</span>':''}</span>`,iconSize:[92,92],iconAnchor:[46,46]});
    if(locationHeadingMarker)locationHeadingMarker.setLatLng(point).setIcon(locationIcon);
    else locationHeadingMarker=L.marker(point,{zIndexOffset:0,icon:locationIcon,interactive:false,keyboard:false,autoPanOnFocus:false}).addTo(liveMap);
    const decoration=locationHeadingMarker.getElement();
    if(decoration){decoration.style.pointerEvents='none';decoration.setAttribute('aria-hidden','true');}
  }

  function updateHeading(event) {
    const angle=Number.isFinite(event.webkitCompassHeading)?event.webkitCompassHeading:event.absolute&&Number.isFinite(event.alpha)?(360-event.alpha)%360:null;
    if(angle==null||!liveMap)return;
    userHeading=(angle+360)%360;
    if(!userPosition)return;
    const person=locationHeadingMarker?.getElement()?.querySelector('.lm-location-person');
    person?.classList.remove('no-heading');person?.style.setProperty('--heading',userHeading+'deg');
    if(userPosition)locationMarker?.getElement()?.setAttribute('aria-label',`현재 위치, 북쪽 기준 ${Math.round(userHeading)}도`);
  }
  function startOrientation() {
    if(orientationActive)return;
    window.addEventListener('deviceorientation',updateHeading);
    window.addEventListener('deviceorientationabsolute',updateHeading);
    orientationActive=true;
  }
  function stopLocation() {
    if(locationWatch!==null)navigator.geolocation?.clearWatch(locationWatch);
    locationWatch=null;locationBusy=false;
    window.removeEventListener('deviceorientation',updateHeading);
    window.removeEventListener('deviceorientationabsolute',updateHeading);orientationActive=false;
  }
  function locate() {
    if(PM_ENV.development){toast('위치 데이터가 아직 연결되지 않았어요.');return;}
    if(!liveMap||locationBusy)return;
    const automatic=automaticLocation;
    const request=window.DeviceOrientationEvent?.requestPermission;
    if(!automatic&&typeof request==='function'){
      try{Promise.resolve(request.call(window.DeviceOrientationEvent,true)).then(result=>{if(result==='granted'&&page==='map'&&liveMap)startOrientation();}).catch(()=>{});}catch{}
    }else if(typeof request!=='function')startOrientation();
    if(userPosition){liveMap.setView(userPosition,16);drawLocation();if(locationWatch!==null)return;}
    if(!navigator.geolocation){toast('이 기기에서는 현재 위치를 확인할 수 없어요.');return;}
    locationBusy=true;
    locationWatch=navigator.geolocation.watchPosition(position=>{
      if(!liveMap||page!=='map')return;
      locationBusy=false;
      const fix=locationTracker.accept(position);if(!fix)return;
      const first=!userPosition;userPosition=[fix.latitude,fix.longitude];
      // A GPS travel heading is not the direction the person is facing.
      if(first&&!mapLocationName)liveMap.setView(userPosition,16);
      drawLocation();
    },()=>{if(!liveMap||page!=='map')return;locationBusy=false;if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);locationWatch=null;if(!automatic)toast('위치 권한을 확인해 주세요.');},{enableHighAccuracy:true,maximumAge:30000,timeout:12000});
  }
  function showResults() {
    const panel=$('#lm-search-results'); if(!panel) return;
    if(!searchResults) { panel.hidden=true; return; }
    const list=visiblePlaces(); panel.hidden=false;
    panel.innerHTML=`<div class="lm-results-head"><b>장소 검색, ${list.length}곳</b><button data-lm="clear-search" aria-label="검색 닫기">✕</button></div><small class="lm-result-credit">저장한 장소 우선 검색, 외부 장소 © OpenStreetMap / Photon</small>`+
      (list.length ? list.map((x,i) => `<button class="lm-result-row" data-result="${i}"><img src="${safe(x.image)}" alt=""><span><b>${safe(x.title)}</b><small>${safe(x.address)}</small></span>${icon('arrow')}</button>`).join('') : '<p>일치하는 장소가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>');
  }
  async function searchPlaces(q) {
    if(PM_ENV.development){toast('장소 데이터가 아직 연결되지 않았어요.');return;}
    if (q.length < 2) { status('검색어를 2자 이상 입력해 주세요.'); return; }
    rememberSearch(q);refreshRecentSearches();
    searchController?.abort(); searchController=new AbortController();
    const current=searchController;
    status('실제 장소를 검색하고 있어요…');
    const input=$('#lm-search input'); if(input) input.disabled=true;
    try {
      const local=savedPlaces().filter(x=>[x.title,x.address,x.category].join(' ').toLowerCase().includes(q.toLowerCase()));
      let found=local;
      if(!local.length){
        const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&lat='+center[0]+'&lon='+center[1]+'&limit=12',{signal:current.signal});
        if(!response.ok)throw new Error('장소 검색 연결을 확인해 주세요.');
        const data=await response.json();
        found=(data.features||[]).map(f=>{const p=f.properties,kind=kindOf(p.osm_value||'');return {id:p.osm_id,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],title:p.name||q,address:[p.city,p.district,p.street,p.housenumber].filter(Boolean).join(' '),category:categoryLabel(p.osm_value||'장소'),kind,image:localPhoto(kind),saved:false}});
      }
      if (!liveMap || current !== searchController) return;
      searchQuery=q;searchResults=found;
      selectCategory('all');
      markers();showResults();
      if(searchResults.length) liveMap.fitBounds(searchResults.map(x=>[x.lat,x.lng]),{maxZoom:16,paddingTopLeft:[80,200],paddingBottomRight:[80,240]});
    } catch(error) { if(error.name!=='AbortError') status('검색 연결을 확인해 주세요. 저장한 장소명으로 다시 검색할 수 있어요.'); }
    finally { if(current===searchController && input) input.disabled=false; }
  }
  document.addEventListener('click',event => {
    const providerControl=$('#app .lm-map-provider-control');
    if(providerControl && !providerControl.contains(event.target))hideProviderOptions();
    const card=event.target.closest('.lm-carousel-card');
    if(card&&!event.target.closest('button')){if(card.closest('.just-dragged'))return;const place=markerEntries.get(card.dataset.placeKey)?.place;if(place)expandPlace(place);return;}
    const result=event.target.closest('[data-result]');
    if(result){const found=visiblePlaces()[Number(result.dataset.result)];if(found) expandPlace(found);return;}
    const cat=event.target.closest('[data-lm-cat]');
    if(cat){selectCategory(cat.dataset.lmCat);markers();showResults();return;}
    const button=event.target.closest('[data-lm]'); if(!button)return;
    switch(button.dataset.lm){
      case 'toggle-map-provider':{
        const menu=$('#app .lm-map-provider-options');
        menu.hidden=!menu.hidden;
        button.setAttribute('aria-expanded',String(!menu.hidden));
        break;
      }
      case 'select-map-provider':{
        hideProviderOptions();
        mapProviderController?.select(button.dataset.provider,true).catch(error=>status(error.message));
        break;
      }
      case 'new-course':window.startNewCourse?.(expandedKey&&expandedKey.startsWith('saved:')?[Number(expandedKey.slice(6))]:[]);break;
      case 'open-list':if(Date.now()<suppressSheetClickUntil)break;setList(!listOpen);break;
      case 'close-list':if(Date.now()<suppressSheetClickUntil)break;setList(false);break;
      case 'pin-start':setPinning(true);break;
      case 'pin-cancel':setPinning(false);break;
      case 'pin-confirm':dropPin();break;
      case 'locate':mapLocationName=null;$('#app .lm-location-title span').textContent='현재 위치';locate();break;
      case 'toggle-search':{
        searchOpen=!searchOpen;
        const row=$('#app .lm-search-row'),input=$('#lm-search input');
        row.classList.toggle('is-open',searchOpen);
        row.setAttribute('aria-hidden',String(!searchOpen));
        row.inert=!searchOpen;
        const toggle=$('#app .lm-header-search');
        toggle.setAttribute('aria-expanded',String(searchOpen));
        toggle.setAttribute('aria-label',searchOpen?'검색창 닫기':'지도에서 장소 검색');
        input.tabIndex=searchOpen?0:-1;
        if(searchOpen)requestAnimationFrame(()=>input.focus());
        else {input.blur();$('#lm-search-results').hidden=true;}
        refreshRecentSearches();
        break;
      }
      case 'toggle-favorite':{
        const place=markerEntries.get(button.dataset.placeKey)?.place;
        const item=place?.saved&&items.find(x=>x.id===place.id);
        if(!item)break;
        item.favorite=!item.favorite;
        place.favorite=item.favorite;
        afterChange();
        document.querySelectorAll('.lm-carousel-heart').forEach(node=>{if(node.dataset.placeKey!==button.dataset.placeKey)return;node.classList.toggle('is-active',item.favorite);node.setAttribute('aria-pressed',String(item.favorite));});
        toast(item.favorite?'즐겨찾기에 추가했어요.':'즐겨찾기에서 뺐어요.');
        break;
      }
      case 'select-place':{const place=markerEntries.get(button.dataset.placeKey)?.place;if(place)expandPlace(place);break;}
      case 'close-place':clearSelection();renderSheet();break;
      case 'open-place':{if(button.closest('.just-dragged'))break;const place=markerEntries.get(button.dataset.placeKey)?.place;if(!place)break;if(place.saved)openDetail(place.id,button);else window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.lat+','+place.lng),'_blank','noopener,noreferrer');break;}
      case 'clear-search':searchResults=null;searchQuery='';$('#lm-search input').value='';$('#lm-search [data-lm="clear-search"]').hidden=true;$('#lm-search-results').hidden=true;refreshRecentSearches();markers();break;
    }
  });
  document.addEventListener('error',event=>{if(event.target.matches?.('.lm-badge-image img'))event.target.hidden=true;},true);
  document.addEventListener('keydown',event=>{if(page==='map'&&event.key===' '&&event.target.closest('.lm-photo-marker')){event.preventDefault();event.target.closest('.lm-photo-marker').click();}});
  document.addEventListener('keydown',event=>{if(page==='map'&&event.key==='Escape')hideProviderOptions();});
  document.addEventListener('input',event=>{if(event.target.matches('#lm-search input')){$('#lm-search [data-lm="clear-search"]').hidden=!event.target.value;refreshRecentSearches();}});
  document.addEventListener('submit',event => {
    if(event.target.id!=='lm-search')return;
    event.preventDefault();
    const q=new FormData(event.target).get('q').trim();
    // Native Enter and the preview keyboard's search button share the same dismissal.
    if(q.length>=2)event.target.querySelector('input')?.blur();
    searchPlaces(q);
  });
  window.addEventListener('pinmap:place-changed',async event=>{
    if(page!=='map'||!liveMap||PM_ENV.development)return;
    const name=event.detail?.name;
    if(!name)return;
    mapLocationName=name;
    const label=$('#app .lm-location-title span');if(label)label.textContent=settings.placeLabels?.[name]||name;
    placeController?.abort();
    const current=placeController=new AbortController();
    try{
      const known={성수동:[37.5445,127.043],청파동:[37.5484522,126.9672724]};
      const details=settings.placeDetails?.[name];
      let point=Number.isFinite(details?.lat)&&Number.isFinite(details?.lng) ? [details.lat,details.lng] : ((!details?.address||details.address===dongOf(name).full)&&Object.hasOwn(known,name) ? known[name] : null);
      if(!point){
        const url='https://photon.komoot.io/api/?q='+encodeURIComponent(details?.address || name)+'&lat=37.55&lon=126.98&limit=10';
        const response=await fetch(url,{signal:current.signal});
        if(!response.ok)throw new Error('location lookup failed');
        const features=(await response.json()).features||[];
        const match=details?.address ? features[0] : features.find(f=>f.properties?.name===name)||features.find(f=>f.properties?.name?.startsWith(name.replace(/동$/,'')));
        if(match){const [lng,lat]=match.geometry.coordinates;if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat>33&&lat<39&&lng>124&&lng<132)point=[lat,lng];}
      }
      if(current!==placeController||!liveMap||page!=='map')return;
      if(point){center=point;zoom=15;liveMap.setView(point,zoom);}
      else toast(`'${name}' 지도 위치를 찾지 못했어요.`);
    }catch(error){if(error.name!=='AbortError'&&current===placeController)toast('선택한 위치로 지도를 이동하지 못했어요.');}
  });
  // Address settings page shares the existing map selection and location behavior.
  function chooseAddressOnMap(name){
    if(name!==null&&!myPlaces().includes(name))return false;
    mapLocationName=name;searchOpen=false;
    go('map');
    if(name)window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name}}));
    else locate();
    requestAnimationFrame(()=>$('#app .lm-location-title')?.focus());
    return true;
  }
  window.PinmapLocation={
    selected:()=>mapLocationName,
    choose:chooseAddressOnMap,
    clear:name=>{if(mapLocationName===name)mapLocationName=null;}
  };
  render();
})();
