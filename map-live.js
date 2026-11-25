/* Photo place markers, real user-submitted place search, and shared navigation. */
(() => {
  const originalRender = render;
  let categoryObserver;
  let liveMap, pinLayer, locationMarker, locationHeadingMarker, placeController, mapProviderController;
  let expandedKey=null, sheetStage='peek', sheetDrag=null, suppressSheetClickUntil=0;
  let mapLocationName=null, searchOpen=false;
  // 2026-11-24: 목록 아이콘 왼쪽 점은 선이 아니라 칠한 원(Figma Icon / list).
  const listIcon=()=>`<svg class="icon pm-list-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11 M9 12h11 M9 18h11"/><circle class="pm-list-dot" cx="4.5" cy="6" r="1.3"/><circle class="pm-list-dot" cx="4.5" cy="12" r="1.3"/><circle class="pm-list-dot" cx="4.5" cy="18" r="1.3"/></svg>`;
  let listOpen=false, listGesture=null; // 2026-11-10 목록 시트 · 직접 핀 찍기
  let followNextFix=false;
  const markerEntries=new Map();
  let userPosition = null;
  const locationTracker=window.PinmapLocation.createTracker();
  let userHeading = null, locationWatch = null, orientationActive = false, orientationGranted = false;
  let locationBusy = false;
  // A neutral city view remains until permission yields a real GPS fix.
  let center = [37.5665,126.978], zoom = 14, category = 'all';
  let searchResults = null, searchQuery = '';
  const savedCoords = PM_ENV.development ? [] : [
    {id:1, lat:37.5461, lng:127.0434, kind:'cafe', image:'img/cafe.jpg'},
    {id:4, lat:37.5441, lng:127.0495, kind:'event', image:'img/exhibit.jpg'},
    {id:6, lat:37.5445, lng:127.0374, kind:'walk', image:'img/park.jpg'},
    {id:8, lat:37.5490, lng:127.0460, kind:'eat', image:'img/brunch.jpg'},
    {id:13, lat:37.5447, lng:127.0557, kind:'event', image:'img/popup-store.jpg'}, // 성수 오브젝트 팝업 (예시 위치)
    {id:9, lat:37.7720, lng:128.9470, kind:'walk', image:'img/sea-room.jpg'}  // 바다 앞 작은 숙소 · 강릉 (예시 위치)
  ];
  const mapCategories = () => {
    const savedIds = new Set(savedPlaces().map(place=>place.categoryId));
    return [['all','전체'],...PinmapCategories.all.filter(c=>savedIds.has(c.id)).map(c=>[c.id,c.label])];
  };
  const categoryIcon = (kind,active=false) => kind==='all'?icon(active?'allBold':'all'):PinmapCategories.icon(({eat:'food',event:'exhibition',walk:'nature',shop:'fashion'}[kind]||kind),active);
  const localPhoto = kind => PM_ENV.development ? PM_ENV.placeholderImage : ({eat:'img/brunch.jpg',cafe:'img/cafe.jpg',event:'img/exhibit.jpg',walk:'img/park.jpg',shop:'img/lamp.jpg'})[kind] || 'img/park.jpg';
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
    if(pick){const q=recentSearches[Number(pick.dataset.lmRecent)];if(!q)return;const input=$('#lm-search input');input.value=q;input.blur();searchPlaces(q,true);return;}
    if(remove){recentSearches.splice(Number(remove.dataset.lmRecentRemove),1);persistRecentSearches();refreshRecentSearches();$('#lm-recent .cf-recent-remove')?.focus();return;}
    if(event.target.closest('[data-lm-recent-clear]')){recentSearches=[];persistRecentSearches();refreshRecentSearches();$('#lm-search input')?.focus();}
  });
  const savedPlaces = () => {
    return PinmapPlaces.all(items).map(place=>{
      const item=place.sourceItem,loc=item.mapLocations?.[place.locationIndex];
      const sample=savedCoords.find(entry=>entry.id===item.id);
      return {id:item.id,backendId:item.backendId,placeId:place.id,locationIndex:place.locationIndex,
        categoryId:PinmapCategories.of(item).id,lat:place.lat,lng:place.lng,
        kind:item.mapKind||sample?.kind||kindOf(item.category||''),
        image:place.photo||libPhoto(item)||sample?.image||localPhoto(item.mapKind||''),
        sourceTitle:item.title,title:place.title,address:place.address||'주소 확인 필요',
        areaHint:loc?.area_hint||'',category:item.category||item.type,
        description:item.desc||'',searchSummary:item.searchSummary||'',
        savedLabel:loc?.review_required?'지도 검색 위치 · 확인 필요':savedAgo(item)+' 저장',
        source:'저장한 콘텐츠',saved:true,favorite:place.favorite};
    });
  };
  function content() {
    if(!mapCategories().some(([id])=>id===category))category='all';
    return `<section class="live-map" aria-label="지도에서 장소 탐색"><div id="live-map-canvas"></div>
      <header class="lm-header">
        <h1 class="lm-sr-only">지도에서 저장한 장소 찾기</h1>
        <div class="lm-location-header"><button type="button" class="lm-location-title" data-action="mapaddresses">${icon('pin')}<span>${safe((n => n ? (settings.placeLabels?.[n] || n) : '현재 위치')(mapLocationName))}</span>${icon('chevron')}</button><button type="button" class="lm-header-search" data-lm="toggle-search" aria-label="${searchOpen?'검색창 닫기':'지도에서 장소 검색'}" aria-expanded="${searchOpen}" aria-controls="lm-search-row"><span class="lm-search-open-icon">${icon('search')}</span><span class="lm-search-close-icon">${icon('close')}</span></button></div>
        <div class="lm-search-row cfpage${searchOpen?' is-open':''}" id="lm-search-row" aria-hidden="${!searchOpen}" ${searchOpen?'':'inert'}><form class="libsearch" id="lm-search" role="search"><input name="q" type="search" enterkeyhint="search" aria-label="지도 저장 장소 검색" placeholder="저장한 장소명·주소 검색" value="${safe(searchQuery)}" autocomplete="off" maxlength="80" ${searchOpen?'':'tabindex="-1"'}></form></div>
        <section class="cf-recent lm-recent" id="lm-recent" aria-label="최근 지도 검색어" ${searchOpen&&!searchQuery.trim()?'':'hidden'}>${mapRecentContent()}</section>
        <div class="lm-categories" role="group" aria-label="지도 카테고리" style="--lm-category-position:${Math.max(0,mapCategories().findIndex(([id])=>id===category))*100}%">${mapCategories().map(([id,label]) => `<button type="button" data-lm-cat="${id}" class="${category===id?'selected':''}" aria-pressed="${category===id}"><span class="lm-category-art">${categoryIcon(id,category===id)}</span><b>${label.replace('·','·<wbr>')}</b></button>`).join('')}<span class="lm-category-indicator" aria-hidden="true"></span></div>
      </header>
      <details class="lm-map-credits"><summary aria-label="지도 출처 보기" title="지도 출처 보기">${icon('info')}</summary><div class="lm-map-credits-panel"><strong>지도 출처</strong><p>지도 © Google</p></div></details>
      <div class="lm-status" role="status" hidden></div>
      <div class="lm-search-results" id="lm-search-results" role="status" aria-live="polite" hidden></div>
      <div class="lm-locate-top">${round('현재 위치로 이동','target')}</div>
      <div class="lm-list-scrim" data-lm="close-list" hidden></div><section class="lm-list-sheet" id="lm-list-sheet" role="dialog" aria-label="저장한 장소 목록" hidden></section>
      <section class="lm-selected-host" id="lm-selected-place" aria-label="이 근방 저장된 장소"></section></section>`;
  }
  function status(message) { const el = $('#app .lm-status'); if (el) { el.textContent = message; el.hidden = !/못|실패|입력|확인|검색하고/.test(message); } }
  function updateMapState(state) {
    const notice=$('#app .lm-status');
    if(state.error&&notice){notice.textContent=state.error;notice.hidden=false;}
    else if(notice && /^구글 지도/.test(notice.textContent)){
      notice.textContent='';
      notice.hidden=true;
    }
  }
  function alignCategoryIndicator(bar) {
    const selected=bar?.querySelector('[data-lm-cat].selected');
    const indicator=bar?.querySelector('.lm-category-indicator');
    if(!selected||!indicator)return;
    const bounds=bar.getBoundingClientRect(),button=selected.getBoundingClientRect();
    const scale=bounds.width/bar.offsetWidth;
    if(!Number.isFinite(scale)||scale<=0)return;
    const left=(button.left-bounds.left+button.width/2)/scale+bar.scrollLeft-indicator.offsetWidth/2;
    bar.style.setProperty('--lm-category-position',`${left}px`);
  }
  function selectCategory(next) {
    category=next;
    const bar=document.querySelector('.lm-categories');
    bar?.querySelectorAll('[data-lm-cat]').forEach(button=>{
      const selected=button.dataset.lmCat===next;
      if(selected)button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
      const art=button.querySelector('.lm-category-art');if(art)art.innerHTML=categoryIcon(button.dataset.lmCat,selected);
    });
    alignCategoryIndicator(bar);
  }
  function visiblePlaces() {
    const list = searchResults || savedPlaces();
    return list.filter(x => category === 'all' || (x.categoryId || PinmapCategories.get(x.kind)?.id) === category);
  }
  const placeKey=place=>place.saved&&place.placeId?place.placeId:`search:${place.id}${place.locationIndex==null?'':':'+place.locationIndex}`;
  function markerIcon(place,expanded=false) {
    const photo=safe(place.image||localPhoto(place.kind));
    return L.divIcon({className:`lm-photo-marker${expanded?' is-selected':''}`,
      html:`<span class="lm-place-badge"><span class="lm-badge-image"><img class="lm-badge-backdrop" src="${photo}" alt=""><img class="lm-badge-photo" src="${photo}" alt=""></span><span class="lm-badge-category">${categoryIcon(place.categoryId||place.kind)}</span></span>`,
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
    return savedPlaces().filter(place=>(category==='all'||(place.categoryId || PinmapCategories.get(place.kind)?.id)===category)&&(!bounds||bounds.contains([place.lat,place.lng])));
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
  const favoriteButton = place => place.saved ? `<button type="button" class="lm-carousel-heart lm-heart-motion${place.favorite?' is-active':''}" data-lm="toggle-favorite" data-place-key="${safe(placeKey(place))}" aria-pressed="${!!place.favorite}" aria-label="${safe(place.title)} 장소 즐겨찾기"><span class="lm-heart-glyph">${likeHeartIcon()}</span></button>` : '';
  function playHeartMotion(button, liked) {
    button.querySelector('.lm-heart-burst')?.remove();
    button.classList.remove('is-bursting');
    if(!liked || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const burst=document.createElement('span');
    burst.className='lm-heart-burst';
    burst.setAttribute('aria-hidden','true');
    const bloom=document.createElement('span');
    bloom.className='lm-heart-bloom';
    burst.append(bloom);
    const colors=['#f48ea7','#cc8ef5','#8ce8c3','#91d2fa','#f5a524','#e5484d','#9fc7fa'];
    for(let index=0;index<7;index++){
      const spoke=document.createElement('span');
      spoke.className='lm-heart-spoke';
      spoke.style.setProperty('--angle',`${index*360/7-90}deg`);
      for(const color of [colors[index],colors[(index+3)%colors.length]]){
        const dot=document.createElement('i');
        dot.style.background=color;
        spoke.append(dot);
      }
      burst.append(spoke);
    }
    burst.style.setProperty('--fly','.5');
    button.append(burst);
    button.classList.add('is-bursting');
    window.setTimeout(()=>{if(!burst.isConnected)return;burst.remove();button.classList.remove('is-bursting');},830);
  }
  window.PinmapHeartMotion = playHeartMotion;
  function renderSheet() {
    const host=$('#lm-selected-place');if(!host)return;
    const list=visiblePlaces();
    const activeIndex=Math.max(0,list.findIndex(place=>placeKey(place)===expandedKey));
    host.setAttribute('aria-label','지도 장소 카드');
    // 2026-11-10 카드 전체가 상세로 가는 버튼(제목 버튼을 카드 크기로 늘림). 저장 시점 · 화살표는 두지 않음. 위로 밀면 목록 시트
    host.innerHTML=list.length?`<button type="button" class="lm-list-tab" data-lm="open-list" aria-expanded="${listOpen}" aria-controls="lm-list-sheet" aria-label="장소 목록 열기, ${list.length}곳">${listIcon()}</button><div class="lm-carousel" role="region" aria-label="지도 장소 카드 캐러셀"><div class="lm-carousel-track" role="group" tabindex="0" aria-label="장소 카드, 좌우로 넘기기">${list.map((place,index)=>`<article class="lm-carousel-card" data-place-key="${safe(placeKey(place))}" aria-label="${index+1}번째 장소, ${safe(place.title)}">${PinmapPlacePhotos.markup(place.backendId,place.locationIndex,place.image||localPhoto(place.kind),'lm-carousel-photo')}<div class="lm-carousel-copy"><div class="lm-carousel-top"><button type="button" class="lm-card-open" data-lm="open-place" data-place-key="${safe(placeKey(place))}" aria-label="${safe(place.title)} ${place.saved?'상세 보기':'지도 앱에서 보기'}"><strong>${safe(place.title)}</strong></button>${favoriteButton(place)}</div><div class="lm-carousel-bottom"><small>${safe(place.category||'검색 결과')}</small>${place.address ? `<button type="button" class="lm-carousel-address" data-lm="focus-address" data-place-key="${safe(placeKey(place))}" aria-label="${safe(place.title)} 주소로 지도 이동: ${safe(place.address)}">${safe(place.address)}</button>` : `<p>주소 정보 없음</p>`}</div></div></article>`).join('')}</div></div>`:'<div class="lm-carousel-empty">표시할 장소가 없어요.</div>';
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
    sheet.innerHTML=`<div class="lm-list-head"><h2>${searchResults?'검색 결과':'이 근처 저장한 곳'} <span>${list.length}곳</span></h2><button type="button" class="lm-list-close" data-lm="close-list" aria-label="목록 닫기">${icon('close')}</button></div><ul class="lm-list">${list.map(place=>`<li><div class="lm-list-row" data-lm="open-place" data-place-key="${safe(placeKey(place))}">${PinmapPlacePhotos.markup(place.backendId,place.locationIndex,place.image||localPhoto(place.kind))}<button type="button" class="lm-list-copy" data-lm="open-place" data-place-key="${safe(placeKey(place))}"><span><b>${safe(place.title)}</b><small>${safe(place.category||'검색 결과')}</small><em>${safe(place.address||'주소 정보 없음')}</em></span></button></div>${favoriteButton(place)}</li>`).join('')}</ul>`;
  }
  function setList(open,focus=true){
    listOpen=open;const sheet=$('#lm-list-sheet'),map=$('#app .live-map');if(!sheet)return;
    if(open)renderList();
    sheet.hidden=!open;const scrim=$('#app .lm-list-scrim');if(scrim)scrim.hidden=!open;map?.classList.toggle('is-listing',open);
    $('#lm-selected-place .lm-list-tab')?.setAttribute('aria-expanded',String(open));
    if(focus)requestAnimationFrame(()=>(open?sheet.querySelector('.lm-list-close'):$('#lm-selected-place .lm-list-tab'))?.focus());
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
    if(listOpen)setList(false);
  });
  function expandPlace(place,moveMap=true,scrollCard=true) {
    const key=placeKey(place),entry=markerEntries.get(key);if(!entry)return;
    if(expandedKey!==key){clearSelection();expandedKey=key;updateMarker(entry,true);window.PinmapFx?.landCard(key);}
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
    status(searchResults ? `${list.length}개 저장 장소 검색 결과` : `${list.length}개 저장 장소`);
  }
  function mount(followLocation=true) {
    if (!window.L) { status('지도 라이브러리를 불러오지 못했어요.'); return; }
    liveMap = L.map('live-map-canvas',{zoomControl:false,zoomAnimation:false}).setView(center,zoom);
    mapProviderController=window.attachPinmapBasemap(liveMap,updateMapState);
    pinLayer = L.layerGroup().addTo(liveMap); markers(); drawLocation();
    locate({recenter:followLocation&&!mapLocationName&&!searchResults,automatic:true});
    liveMap.on('moveend', () => { center=[liveMap.getCenter().lat,liveMap.getCenter().lng]; zoom=liveMap.getZoom(); if(searchOpen&&searchQuery&&!expandedKey)searchPlaces(searchQuery); });
    requestAnimationFrame(() => liveMap?.invalidateSize());
  }
  pages.map=content; // Register the active map renderer with the shared route policy.
  render = function() {
    categoryObserver?.disconnect();
    sheetDrag=null;expandedKey=null;sheetStage='peek';markerEntries.clear();
    window.unmountCourseMap?.();
    window.unmountCourseThumbnails?.();
    stopLocation();
    if (liveMap) { liveMap.remove(); liveMap=null; mapProviderController=null; locationMarker=null; locationHeadingMarker=null; }
    const isMap = page === 'map' && !detailId;
    document.body.classList.toggle('live-map-page',isMap);
    // 저장 직후 지도 탭으로 이동할 때 해당 장소를 펼쳐요.
    const focusId = isMap ? window.pmMapFocus : null;
    if (focusId != null) { window.pmMapFocus = null; searchResults = null; searchQuery = ''; category = 'all';
      const f = savedPlaces().find(p => p.id === focusId); if (f) { center = [f.lat, f.lng]; zoom = 15; } }
    if (isMap) { $('#app').innerHTML=content();
      window.PinmapBottomNav?.mount();
      const categoryBar=document.querySelector('.lm-categories');
      alignCategoryIndicator(categoryBar);
      categoryObserver=new ResizeObserver(()=>alignCategoryIndicator(categoryBar));
      categoryObserver.observe(categoryBar);
      mount(focusId==null); if(searchOpen&&searchQuery)searchPlaces(searchQuery); else if(searchResults)showResults();
      if (focusId != null) { const focused=savedPlaces().filter(p=>p.id===focusId); if (focused.length>1 && liveMap) liveMap.fitBounds(focused.map(p=>[p.lat,p.lng]),{maxZoom:15,padding:[48,48]});
        const f=focused[0]; if (f && liveMap) expandPlace(f,false); } }
    else { originalRender(); if(page==='course' && !detailId) window.mountCourseMap?.(); if(page==='courses' && !detailId) window.mountCourseThumbnails?.(); }
  };
  function drawLocation() {
    if(!liveMap)return;
    if(!userPosition)return;
    const demo=false;
    const point=userPosition;
    const heading=userHeading;
    const label=heading==null?'현재 위치, 방향 정보 없음':`현재 위치, 북쪽 기준 ${Math.round(heading)}도`;
    // Draw the position as a geographic vector point, never a viewport overlay.
    // The decorative heading/label is separate and cannot take focus or pan the map.
    if(locationMarker)locationMarker.setLatLng(point);
    else locationMarker=L.circleMarker(point,{radius:8,weight:3,color:'#ffffff',fillColor:'#2789ef',fillOpacity:1,interactive:false,className:'lm-current-position-dot'}).addTo(liveMap);
    const element=locationMarker.getElement();
    element?.setAttribute('role','img');element?.setAttribute('aria-label',label);
    const locationIcon=L.divIcon({className:'lm-location-marker',html:`<span class="lm-location-person${heading==null?' no-heading':''}" style="--heading:${heading??0}deg"><span class="lm-heading-cone" aria-hidden="true"></span>${demo?'<span class="lm-location-demo">예시 위치</span>':''}</span>`,iconSize:[92,92],iconAnchor:[46,46]});
    if(locationHeadingMarker)locationHeadingMarker.setLatLng(point).setIcon(locationIcon);
    else locationHeadingMarker=L.marker(point,{zIndexOffset:0,icon:locationIcon,interactive:false,keyboard:false,autoPanOnFocus:false}).addTo(liveMap);
    const decoration=locationHeadingMarker.getElement();
    if(decoration){decoration.style.pointerEvents='none';decoration.setAttribute('aria-hidden','true');}
    mapProviderController?.setLocation({point:[...point],heading,demo});
  }

  function updateHeading(event) {
    const angle=Number.isFinite(event.webkitCompassHeading)?event.webkitCompassHeading:event.absolute&&Number.isFinite(event.alpha)?(360-event.alpha)%360:null;
    if(angle==null||!liveMap)return;
    userHeading=(angle+360)%360;
    if(!userPosition)return;
    const person=locationHeadingMarker?.getElement()?.querySelector('.lm-location-person');
    person?.classList.remove('no-heading');person?.style.setProperty('--heading',userHeading+'deg');
    if(userPosition)locationMarker?.getElement()?.setAttribute('aria-label',`현재 위치, 북쪽 기준 ${Math.round(userHeading)}도`);
    mapProviderController?.setLocation({point:[...userPosition],heading:userHeading,demo:false});
  }
  function startOrientation() {
    if(orientationActive)return;
    window.addEventListener('deviceorientation',updateHeading);
    window.addEventListener('deviceorientationabsolute',updateHeading);
    orientationActive=true;
  }
  function stopLocation() {
    if(locationWatch!==null)navigator.geolocation?.clearWatch(locationWatch);
    locationWatch=null;locationBusy=false;followNextFix=false;userHeading=null;
    window.removeEventListener('deviceorientation',updateHeading);
    window.removeEventListener('deviceorientationabsolute',updateHeading);orientationActive=false;
  }
  function locate({recenter=true,automatic=false}={}) {
    if(!liveMap)return;
    if(recenter)followNextFix=true;
    const request=window.DeviceOrientationEvent?.requestPermission;
    if(!automatic&&typeof request==='function'){
      try{Promise.resolve(request.call(window.DeviceOrientationEvent,true)).then(result=>{if(result==='granted'){orientationGranted=true;if(page==='map'&&liveMap)startOrientation();}}).catch(()=>{});}catch{}
    }else if(typeof request!=='function'||orientationGranted)startOrientation();
    if(userPosition){if(recenter)liveMap.setView(userPosition,16);followNextFix=false;drawLocation();}
    if(locationWatch!==null||locationBusy)return;
    if(!navigator.geolocation){toast('이 기기에서는 현재 위치를 확인할 수 없어요.');return;}
    locationBusy=true;
    const activeMap=liveMap;
    locationWatch=navigator.geolocation.watchPosition(position=>{
      if(liveMap!==activeMap||page!=='map')return;
      locationBusy=false;
      const fix=locationTracker.accept(position)||locationTracker.current;if(!fix)return;
      userPosition=[fix.latitude,fix.longitude];
      // A GPS travel heading is not the direction the person is facing.
      if(followNextFix&&!mapLocationName){liveMap.setView(userPosition,16);followNextFix=false;}
      drawLocation();
    },error=>{if(liveMap!==activeMap||page!=='map')return;locationBusy=false;if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);locationWatch=null;toast(error.code===1?'현재 위치를 보려면 브라우저에서\n위치 접근을 허용해 주세요.':'현재 위치를 확인하지 못했어요. 현위치 버튼으로 다시 시도해 주세요.');},{enableHighAccuracy:true,maximumAge:30000,timeout:12000});
  }
  function showResults() {
    const panel=$('#lm-search-results'); if(!panel) return;
    if(!searchResults) { panel.hidden=true; return; }
    const list=visiblePlaces(); panel.hidden=false;
    panel.innerHTML=`<div class="lm-results-head"><b>저장한 장소, ${list.length}곳</b></div><small class="lm-result-credit">현재 지도 중심에서 가까운 순서</small>`+
      (list.length ? list.map((x,i) => `<button class="lm-result-row" data-result="${i}"><img src="${safe(x.image)}" alt=""><span><b>${safe(x.title)}</b><small>${safe(x.address)}</small></span>${icon('arrow')}</button>`).join('') : '<p>일치하는 저장 장소가 없어요. 다른 이름이나 주소로 검색해 보세요.</p>');
  }
  function searchPlaces(raw,remember=false) {
    if(!liveMap||page!=='map')return;
    const q=String(raw||'').trim();
    searchQuery=q;
    if(!q){searchResults=null;markers();showResults();refreshRecentSearches();return;}
    if(remember)rememberSearch(q);
    const point=liveMap.getCenter();
    searchResults=PinmapContentSearch.nearbyPlaces(
      PinmapContentSearch.findPlaces(savedPlaces(),q),[point.lat,point.lng]);
    selectCategory('all');
    markers();showResults();refreshRecentSearches();
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
      case 'open-list':if(Date.now()<suppressSheetClickUntil)break;setList(!listOpen);break;
      case 'close-list':if(Date.now()<suppressSheetClickUntil)break;setList(false);break;
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
        if(searchOpen){if(listOpen)setList(false,false);requestAnimationFrame(()=>input.focus());if(searchQuery)searchPlaces(searchQuery);}
        else {input.blur();searchQuery='';searchResults=null;$('#lm-search-results').hidden=true;input.value='';markers();toggle.focus();}
        refreshRecentSearches();
        break;
      }
      case 'toggle-favorite':{
        const place=markerEntries.get(button.dataset.placeKey)?.place;
        const item=place?.saved&&PinmapPlaces.all(items).find(x=>x.id===place.placeId);
        if(!item)break;
        const favorite=PinmapFavorites.toggle(item);if(favorite===null)break;
        place.favorite=favorite;
        searchResults?.forEach(result=>{if(result.placeId===item.id)result.favorite=favorite;});
        for(const entry of markerEntries.values())if(entry.place?.placeId===item.id)entry.place.favorite=favorite;
        document.querySelectorAll('.lm-carousel-heart').forEach(node=>{if(node.dataset.placeKey!==item.id)return;node.classList.toggle('is-active',favorite);node.setAttribute('aria-pressed',String(favorite));if(node.classList.contains('lm-heart-motion'))playHeartMotion(node,favorite);});
        toast(favorite?'장소를 즐겨찾기에 추가했어요.':'장소 즐겨찾기를 취소했어요.');
        break;
      }
      case 'select-place':{const place=markerEntries.get(button.dataset.placeKey)?.place;if(place)expandPlace(place);break;}
      case 'focus-address':{if(button.closest('.just-dragged'))break;const place=markerEntries.get(button.dataset.placeKey)?.place;if(place)expandPlace(place,true,false);break;}
      case 'close-place':clearSelection();renderSheet();break;
      case 'open-place':{if(button.closest('.just-dragged'))break;const place=markerEntries.get(button.dataset.placeKey)?.place;if(!place)break;window.pmDetailPlace={id:place.id,index:place.locationIndex};openDetail(place.id,button);break;}
    }
  });
  document.addEventListener('error',event=>{if(event.target.matches?.('.lm-badge-image img'))event.target.hidden=true;},true);
  document.addEventListener('keydown',event=>{if(page==='map'&&event.key===' '&&event.target.closest('.lm-photo-marker')){event.preventDefault();event.target.closest('.lm-photo-marker').click();}});
  document.addEventListener('input',event=>{if(event.target.matches('#lm-search input'))searchPlaces(event.target.value);});
  document.addEventListener('compositionend',event=>{if(event.target.matches('#lm-search input'))searchPlaces(event.target.value);});
  document.addEventListener('submit',event => {
    if(event.target.id!=='lm-search')return;
    event.preventDefault();
    const q=new FormData(event.target).get('q').trim();
    // Results already update while typing; Enter dismisses the keyboard and records the query.
    event.target.querySelector('input')?.blur();
    searchPlaces(q,true);
  });
  window.addEventListener('pinmap:place-changed',async event=>{
    if(page!=='map'||!liveMap||(PM_ENV.development&&!PM_ENV.requiresAuth))return;
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
    mapLocationName=name;settings.selectedPlace=name;afterChange();searchOpen=false;
    go('map');
    if(name)window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name}}));
    else locate();
    requestAnimationFrame(()=>$('#app .lm-location-title')?.focus());
    return true;
  }
  window.PinmapLocation={
    selected:()=>mapLocationName,
    restore:name=>{mapLocationName=myPlaces().includes(name)?name:null;},
    choose:chooseAddressOnMap,
    clear:name=>{if(mapLocationName===name)mapLocationName=null;}
  };
  render();
})();
