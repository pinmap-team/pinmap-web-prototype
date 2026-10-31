/* Photo place markers, real user-submitted place search, and shared navigation. */
(() => {
  const originalRender = render;
  let detailMap;
  let liveMap, pinLayer, locationMarker, searchController, placeController;
  let expandedKey=null, sheetStage='peek', sheetDrag=null, suppressSheetClickUntil=0;
  let mapLocationName=null, locationMenuOpen=false, searchOpen=false;
  let automaticLocation=false;
  const markerEntries=new Map();
  let userPosition = null;
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
  const cats = [['all','전체'],['eat','맛집'],['cafe','카페'],['event','전시·팝업'],['walk','산책'],['shop','쇼핑']];
  // Use the same line style as the app navigation on every platform.
  const categoryPaths = {
    all: paths.spark,
    eat: paths.eat,
    cafe: paths.coffee,
    event: paths.event,
    walk: paths.walk,
    shop: paths.shop
  };
  const categorySolidPaths = {
    all: paths.spark,
    eat: 'M3 3h2v5h1V3h2v5h1V3h2v5a4 4 0 0 1-3 3.87V21H6v-9.13A4 4 0 0 1 3 8V3Z M20 3v18h-2v-8h-3V9c0-3.5 2-6 5-6Z',
    cafe: 'M4 4h12v1h2a4 4 0 0 1 0 8h-2v1a5 5 0 0 1-10 0V6H4V4Z M16 7v4h2a2 2 0 0 0 0-4h-2Z M3 20h16v2H3Z',
    event: 'M3 5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6V5Z M15 7v3h2V7h-2Z M15 11v2h2v-2h-2Z M15 14v3h2v-3h-2Z',
    walk: 'M11 15H8a4 4 0 0 1-1-7 5 5 0 0 1 10 0 4 4 0 0 1-1 7h-3v7h-2v-7Z',
    shop: 'M8 8V6a4 4 0 0 1 8 0v2h3l-1 13H6L5 8h3Z M10 8h4V6a2 2 0 0 0-4 0v2Z'
  };
  const categoryIcon = (kind, stableShape=false) => {
    const outline=stableShape ? (categorySolidPaths[kind] || paths.pin) : (categoryPaths[kind] || paths.pin);
    const solid=stableShape ? outline : (categorySolidPaths[kind] || paths.pin);
    return `<svg class="lm-category-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path class="lm-category-line" d="${outline}"/><path class="lm-category-solid" fill-rule="evenodd" d="${solid}"/></svg>`;
  };
  const localPhoto = kind => PM_ENV.development ? PM_ENV.placeholderImage : ({eat:'img/brunch.jpg',cafe:'img/cafe.jpg',event:'img/exhibit.jpg',walk:'img/park.jpg',shop:'img/lamp.jpg'})[kind] || 'img/park.jpg';
  const categoryLabel = tag => ({station:'역',stop:'정류장',park:'공원',restaurant:'식당',cafe:'카페',museum:'박물관',gallery:'갤러리',shop:'상점',water:'호수',residential:'주거 지역'})[tag] || tag;
  const kindOf = tag => /restaurant|food|fast_food|bar|pub/.test(tag) ? 'eat' : /cafe|coffee|bakery/.test(tag) ? 'cafe' : /museum|gallery|theatre|artwork/.test(tag) ? 'event' : /park|garden|forest|wood/.test(tag) ? 'walk' : /shop|mall|market/.test(tag) ? 'shop' : 'walk';
  const round = (name, symbol) => `<button class="lm-round" data-lm="locate" aria-label="${name}" title="${name}">${icon(symbol)}</button>`;
  const safe = value => esc(value || '');
  const savedPlaces = () => {
    const pinned = savedCoords.map(position => {
      const item = items.find(x => x.id === position.id);
      return item && !item.pending ? {...position, image:libPhoto(item)||position.image, title:item.title, address:item.address || '주소 확인 필요', category:item.category || item.type, description:item.desc || '', savedLabel:savedAgo(item)+' 저장', source:'저장한 콘텐츠', saved:true, favorite:!!item.favorite} : null;
    }).filter(Boolean);
    const own = items.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && !x.pending && !savedCoords.some(y => y.id === x.id))
      .map(x => ({id:x.id,lat:x.lat,lng:x.lng,kind:kindOf(x.category || ''),image:libPhoto(x)||localPhoto(kindOf(x.category || '')),title:x.title,address:x.address || '',category:x.category || x.type,description:x.desc || '',savedLabel:savedAgo(x)+' 저장',source:'저장한 콘텐츠',saved:true,favorite:!!x.favorite}));
    return [...pinned,...own];
  };
  function content() {
    return `<section class="live-map" aria-label="지도에서 장소 탐색"><div id="live-map-canvas"></div>
      <header class="lm-header">
        <h1 class="lm-sr-only">지도에서 저장한 장소 찾기</h1>
        <div class="lm-location-header"><button type="button" class="lm-location-title" data-lm="location-menu" aria-expanded="${locationMenuOpen}" aria-controls="lm-location-menu">${icon('pin')}<span>${safe(mapLocationName ? (settings.placeLabels?.[mapLocationName] || mapLocationName) : '현재 위치')}</span>${icon('chevron')}</button><button type="button" class="lm-header-search" data-lm="toggle-search" aria-label="지도에서 장소 검색" aria-expanded="${searchOpen}">${icon('search')}</button></div>
        <div class="lm-location-menu" id="lm-location-menu" ${locationMenuOpen?'':'hidden'}><button type="button" data-lm="choose-current" class="${mapLocationName?'':'is-active'}">현재 위치</button>${myPlaces().map(name=>`<button type="button" data-lm="choose-saved-location" data-location-name="${safe(name)}" class="${mapLocationName===name?'is-active':''}">${safe(settings.placeLabels?.[name] || name)}<small>${safe(name)}</small></button>`).join('')}<button type="button" data-action="placesheet">위치 추가·수정</button></div>
        <div class="lm-search-row cfpage${searchOpen?' is-open':''}" aria-hidden="${!searchOpen}" ${searchOpen?'':'inert'}><form class="libsearch" id="lm-search" role="search"><button type="button" class="lm-search-close" data-lm="toggle-search" aria-label="검색창 닫기">${icon('close')}</button><input name="q" type="search" enterkeyhint="search" aria-label="지도 장소 검색" placeholder="어디로 가고 싶으세요?" value="${safe(searchQuery)}" autocomplete="off" ${searchOpen?'':'tabindex="-1"'}><button type="button" class="iconbtn" data-lm="clear-search" aria-label="검색 지우기" ${searchQuery?'':'hidden'}>${icon('close')}</button><button type="submit" class="libgo" aria-label="장소 검색">${icon('search')}</button></form></div>
        <div class="lm-categories" role="group" aria-label="지도 카테고리" style="--lm-category-position:${Math.max(0,cats.findIndex(([id])=>id===category))*100}%">${cats.map(([id,label]) => `<button type="button" data-lm-cat="${id}" class="${category===id?'selected':''}" aria-pressed="${category===id}"><span class="lm-category-art">${categoryIcon(id,true)}</span><b>${label}</b></button>`).join('')}<span class="lm-category-indicator" aria-hidden="true"></span></div>
      </header>
      <div class="lm-status" role="status" hidden></div>
      <div class="lm-search-results" id="lm-search-results" hidden></div>
      <div class="lm-floating-actions"><button type="button" class="lm-course-button" data-lm="new-course" aria-label="새 코스 만들기" title="새 코스 만들기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4.2" cy="4.2" r="2.1"/><path d="M6.3 4.2h9.2a5.1 5.1 0 0 1 0 10.2H10a3.2 3.2 0 0 0 0 6.4h7.7"/><circle cx="19.8" cy="20.8" r="2.1"/></svg></button>${round('현재 위치로 이동','target')}</div>
      <section class="lm-selected-host" id="lm-selected-place" aria-label="이 근방 저장된 장소"></section>
      <nav class="bottomnav lm-shared-nav" aria-label="하단 메뉴">${nav()}</nav></section>`;
  }
  function status(message) { const el = $('#app .lm-status'); if (el) { el.textContent = message; el.hidden = !/못|실패|입력|확인하고|검색하고/.test(message); } }
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
  const placeKey=place=>`${place.saved?'saved':'search'}:${place.id}`;
  function markerIcon(place,expanded=false) {
    const photo=safe(place.image||localPhoto(place.kind));
    return L.divIcon({className:`lm-photo-marker${expanded?' is-selected':''}`,
      html:`<span class="lm-place-badge"><span class="lm-badge-image"><img class="lm-badge-backdrop" src="${photo}" alt=""><img class="lm-badge-photo" src="${photo}" alt=""></span><span class="lm-badge-category">${categoryIcon(place.kind)}</span></span>`,
      iconSize:expanded?[86,92]:[60,60],iconAnchor:expanded?[43,86]:[30,30]});
  }
  function updateMarker(entry,expanded) {
    entry.marker.setIcon(markerIcon(entry.place,expanded));
    entry.marker.setZIndexOffset(expanded?2000:0);
    const element=entry.marker.getElement();
    element?.setAttribute('aria-label',`${entry.place.title} · ${entry.place.category} · 장소 정보 보기`);
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
  const favoriteButton = place => place.saved ? `<button type="button" class="lm-carousel-heart${place.favorite?' is-active':''}" data-lm="toggle-favorite" data-place-key="${safe(placeKey(place))}" aria-pressed="${!!place.favorite}" aria-label="${safe(place.title)} 즐겨찾기">${icon('heart')}</button>` : '';
  function renderSheet() {
    const host=$('#lm-selected-place');if(!host)return;
    const list=visiblePlaces();
    const activeIndex=Math.max(0,list.findIndex(place=>placeKey(place)===expandedKey));
    host.setAttribute('aria-label','지도 장소 카드');
    host.innerHTML=list.length?`<div class="lm-carousel" role="region" aria-label="지도 장소 카드 캐러셀"><div class="lm-carousel-track" tabindex="0" aria-label="장소 카드, 좌우로 넘기기">${list.map((place,index)=>`<article class="lm-carousel-card" data-place-key="${safe(placeKey(place))}" aria-label="${index+1}번째 장소, ${safe(place.title)}"><div class="lm-carousel-photo"><img src="${safe(place.image||localPhoto(place.kind))}" alt=""></div><div class="lm-carousel-copy"><div class="lm-carousel-top"><strong>${safe(place.title)}</strong>${favoriteButton(place)}</div><div class="lm-carousel-bottom"><small>${safe(place.savedLabel||place.category||'검색 결과')}</small><p>${safe(place.address||'주소 정보 없음')}</p></div><button type="button" class="lm-carousel-detail" data-lm="open-place" data-place-key="${safe(placeKey(place))}" aria-label="${safe(place.title)} ${place.saved?'상세 보기':'지도에서 보기'}">${icon('arrow')}</button></div></article>`).join('')}</div></div>`:'<div class="lm-carousel-empty">표시할 장소가 없어요.</div>';
    const track=host.querySelector('.lm-carousel-track');
    if(!track)return;
    if(activeIndex)requestAnimationFrame(()=>{track.children[activeIndex]?.scrollIntoView({block:'nearest',inline:'center'});});
    let drag=null;
    track.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('button'))return;
      drag={id:event.pointerId,x:event.clientX,left:track.scrollLeft,moved:false};
      track.setPointerCapture(event.pointerId);
    });
    track.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      const distance=event.clientX-drag.x;
      if(Math.abs(distance)>5)drag.moved=true;
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
  function expandPlace(place,moveMap=true,scrollCard=true) {
    const key=placeKey(place),entry=markerEntries.get(key);if(!entry)return;
    clearSelection();expandedKey=key;updateMarker(entry,true);
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
    if (liveMap) { liveMap.remove(); liveMap=null; locationMarker=null; }
    const isMap = page === 'map' && !detailId;
    document.body.classList.toggle('live-map-page',isMap);
    // 상세 페이지 '지도에서 보기' → 그 장소로 이동해 핀을 펼쳐요
    const focusId = isMap ? window.pmMapFocus : null;
    if (focusId != null) { window.pmMapFocus = null; searchResults = null; searchQuery = ''; category = 'all';
      const f = savedPlaces().find(p => p.id === focusId); if (f) { center = [f.lat, f.lng]; zoom = 15; } }
    if (isMap) { $('#app').innerHTML=content(); mount(); if(searchResults) showResults();
      if (focusId != null) { const f = savedPlaces().find(p => p.id === focusId); if (f && liveMap) expandPlace(f); } }
    else { originalRender(); if(detailId)mountDetailMap(); if(page==='course' && !detailId) window.mountCourseMap?.(); if(page==='courses' && !detailId) window.mountCourseThumbnails?.(); }
  };
  function drawLocation() {
    if(!liveMap)return;
    if(locationMarker)liveMap.removeLayer(locationMarker);
    if(PM_ENV.development&&!userPosition)return;
    const demo=!userPosition;
    const point=userPosition || [37.5425,127.042];
    const heading=demo?35:userHeading;
    const label=demo?'성수동 예시 위치 · 방향 예시':heading==null?'현재 위치 · 방향 정보 없음':`현재 위치 · 북쪽 기준 ${Math.round(heading)}도`;
    locationMarker=L.marker(point,{zIndexOffset:1000,icon:L.divIcon({className:'lm-location-marker',html:`<span class="lm-location-person${heading==null?' no-heading':''}" style="--heading:${heading??0}deg"><span class="lm-heading-cone" aria-hidden="true"></span><span class="lm-location-dot"></span>${demo?'<span class="lm-location-demo">예시 위치</span>':''}</span>`,iconSize:[92,92],iconAnchor:[46,46]}),title:label}).addTo(liveMap);
    locationMarker.getElement()?.setAttribute('aria-label',label);
  }
  function updateHeading(event) {
    const angle=Number.isFinite(event.webkitCompassHeading)?event.webkitCompassHeading:event.absolute&&Number.isFinite(event.alpha)?(360-event.alpha)%360:null;
    if(angle==null||!liveMap)return;
    userHeading=(angle+360)%360;
    if(!userPosition)return;
    const person=locationMarker?.getElement()?.querySelector('.lm-location-person');
    person?.classList.remove('no-heading');person?.style.setProperty('--heading',userHeading+'deg');
    if(userPosition)locationMarker?.getElement()?.setAttribute('aria-label',`현재 위치 · 북쪽 기준 ${Math.round(userHeading)}도`);
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
      const first=!userPosition;locationBusy=false;userPosition=[position.coords.latitude,position.coords.longitude];
      // A GPS travel heading is not the direction the person is facing.
      if(first&&!mapLocationName)liveMap.setView(userPosition,16);
      drawLocation();
    },()=>{if(!liveMap||page!=='map')return;locationBusy=false;if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);locationWatch=null;if(!automatic)toast('위치 권한을 확인해 주세요.');},{enableHighAccuracy:true,maximumAge:30000,timeout:12000});
  }
  function showResults() {
    const panel=$('#lm-search-results'); if(!panel) return;
    if(!searchResults) { panel.hidden=true; return; }
    const list=visiblePlaces(); panel.hidden=false;
    panel.innerHTML=`<div class="lm-results-head"><b>장소 검색 · ${list.length}곳</b><button data-lm="clear-search" aria-label="검색 닫기">✕</button></div><small class="lm-result-credit">저장한 장소 우선 검색 · 외부 장소 © OpenStreetMap / Photon</small>`+
      (list.length ? list.map((x,i) => `<button class="lm-result-row" data-result="${i}"><img src="${safe(x.image)}" alt=""><span><b>${safe(x.title)}</b><small>${safe(x.address)}</small></span>${icon('arrow')}</button>`).join('') : '<p>일치하는 장소가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>');
  }
  async function searchPlaces(q) {
    if(PM_ENV.development){toast('장소 데이터가 아직 연결되지 않았어요.');return;}
    if (q.length < 2) { status('검색어를 2자 이상 입력해 주세요.'); return; }
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
    const card=event.target.closest('.lm-carousel-card');
    if(card&&!event.target.closest('button')){if(card.closest('.just-dragged'))return;const place=markerEntries.get(card.dataset.placeKey)?.place;if(place)expandPlace(place);return;}
    const result=event.target.closest('[data-result]');
    if(result){const found=visiblePlaces()[Number(result.dataset.result)];if(found) expandPlace(found);return;}
    const cat=event.target.closest('[data-lm-cat]');
    if(cat){selectCategory(cat.dataset.lmCat);markers();showResults();return;}
    const button=event.target.closest('[data-lm]'); if(!button)return;
    switch(button.dataset.lm){
      case 'new-course':window.startNewCourse?.();break;
      case 'locate':mapLocationName=null;$('#app .lm-location-title span').textContent='현재 위치';locate();break;
      case 'location-menu':locationMenuOpen=!locationMenuOpen;$('#lm-location-menu').hidden=!locationMenuOpen;button.setAttribute('aria-expanded',String(locationMenuOpen));break;
      case 'choose-current':mapLocationName=null;locationMenuOpen=false;$('#lm-location-menu').hidden=true;$('#app .lm-location-title span').textContent='현재 위치';$('#app .lm-location-title').setAttribute('aria-expanded','false');locate();break;
      case 'choose-saved-location':mapLocationName=button.dataset.locationName;locationMenuOpen=false;$('#lm-location-menu').hidden=true;$('#app .lm-location-title span').textContent=settings.placeLabels?.[mapLocationName]||mapLocationName;$('#app .lm-location-title').setAttribute('aria-expanded','false');window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name:mapLocationName}}));break;
      case 'toggle-search':{
        searchOpen=!searchOpen;
        const row=$('#app .lm-search-row'),input=$('#lm-search input');
        row.classList.toggle('is-open',searchOpen);
        row.setAttribute('aria-hidden',String(!searchOpen));
        row.inert=!searchOpen;
        $('#app .lm-header-search').setAttribute('aria-expanded',String(searchOpen));
        input.tabIndex=searchOpen?0:-1;
        if(searchOpen)requestAnimationFrame(()=>input.focus());
        else {input.blur();$('#lm-search-results').hidden=true;}
        break;
      }
      case 'toggle-favorite':{
        const place=markerEntries.get(button.dataset.placeKey)?.place;
        const item=place?.saved&&items.find(x=>x.id===place.id);
        if(!item)break;
        item.favorite=!item.favorite;
        place.favorite=item.favorite;
        afterChange();
        button.classList.toggle('is-active',item.favorite);
        button.setAttribute('aria-pressed',String(item.favorite));
        toast(item.favorite?'즐겨찾기에 추가했어요.':'즐겨찾기에서 뺐어요.');
        break;
      }
      case 'select-place':{const place=markerEntries.get(button.dataset.placeKey)?.place;if(place)expandPlace(place);break;}
      case 'close-place':clearSelection();renderSheet();break;
      case 'open-place':{const place=markerEntries.get(button.dataset.placeKey)?.place;if(!place)break;if(place.saved)openDetail(place.id);else window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place.lat+','+place.lng),'_blank','noopener,noreferrer');break;}
      case 'clear-search':searchResults=null;searchQuery='';$('#lm-search input').value='';$('#lm-search [data-lm="clear-search"]').hidden=true;$('#lm-search-results').hidden=true;markers();break;
    }
  });
  document.addEventListener('error',event=>{if(event.target.matches?.('.lm-badge-image img'))event.target.hidden=true;},true);
  document.addEventListener('keydown',event=>{if(page==='map'&&event.key===' '&&event.target.closest('.lm-photo-marker')){event.preventDefault();event.target.closest('.lm-photo-marker').click();}});
  document.addEventListener('input',event=>{if(event.target.matches('#lm-search input'))$('#lm-search [data-lm="clear-search"]').hidden=!event.target.value;});
  document.addEventListener('submit',event => { if(event.target.id==='lm-search'){event.preventDefault();searchPlaces(new FormData(event.target).get('q').trim());} });
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
      let point=known[name];
      if(!point){
        const url='https://photon.komoot.io/api/?q='+encodeURIComponent(name)+'&lat=37.55&lon=126.98&limit=10';
        const response=await fetch(url,{signal:current.signal});
        if(!response.ok)throw new Error('location lookup failed');
        const features=(await response.json()).features||[];
        const match=features.find(f=>f.properties?.name===name)||features.find(f=>f.properties?.name?.startsWith(name.replace(/동$/,'')));
        if(match){const [lng,lat]=match.geometry.coordinates;if(lat>37.4&&lat<37.8&&lng>126.7&&lng<127.3)point=[lat,lng];}
      }
      if(current!==placeController||!liveMap||page!=='map')return;
      if(point){center=point;zoom=15;liveMap.setView(point,zoom);}
      else toast(`'${name}' 지도 위치를 찾지 못했어요.`);
    }catch(error){if(error.name!=='AbortError'&&current===placeController)toast('선택한 위치로 지도를 이동하지 못했어요.');}
  });
  render();
})();
