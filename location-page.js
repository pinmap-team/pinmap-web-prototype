// Full-page address selection. Saved place keys remain compatible with place.js.
(() => {
  PARENT_TAB.addresses='map'; PARENT_TAB.addressedit='map';
  pageName.addresses='위치 편집'; pageName.addressedit='위치 편집';
  // 마이 > 위치 편집: 같은 위치 정보·화면을 쓰는 별도 페이지. 뒤로 가면 마이로 돌아가요.
  PARENT_TAB.myaddresses='my'; PARENT_TAB.myaddressedit='my';
  pageName.myaddresses='위치 편집'; pageName.myaddressedit='위치 편집';
  let searchMatches=[], draftAddress='', draftCoords=null;
  let queryText='', editing=false, editKey=null, pendingDelete=null, origin='map';
  const fromMy=()=>origin==='my';
  const textValue=value=>typeof value==='string'?value:'';
  function recordOf(name){
    const detail=Object.hasOwn(settings.placeDetails||{},name)?settings.placeDetails[name]:null;
    return {name,label:textValue(settings.placeLabels?.[name])||name,address:textValue(detail?.address)||dongOf(name).full,memo:textValue(detail?.memo)};
  }
  function focusHeading(){requestAnimationFrame(()=>$('#app .address-page h1')?.focus());}
  function showList(){go(editing?(fromMy()?'myaddressmanage':'addressmanage'):(fromMy()?'myaddresses':'addresses'));focusHeading();}
  for(const key of ['addressmanage','myaddressmanage','addresssearch','myaddresssearch']){PARENT_TAB[key]=key.startsWith('my')?'my':'map';pageName[key]=key.endsWith('manage')?'위치 편집':'위치 검색';}
  function currentSelection(){return window.PinmapLocation?.selected()??null;}
  function listBody(){
    const selectedName=currentSelection();
    const all=myPlaces().map(recordOf).sort((a,b)=>Number(b.name===selectedName)-Number(a.name===selectedName)),q=queryText.trim().toLocaleLowerCase();
    const list=all.filter(record=>[record.label,record.name,record.address,record.memo].join(' ').toLocaleLowerCase().includes(q));
    if(!list.length)return `<div class="address-empty"><p>${q?'일치하는 저장 위치가 없어요.':'아직 저장한 위치가 없어요.'}</p><small>${q?'다른 이름이나 위치로 검색해 보세요.':'자주 가는 위치를 위치로 저장해 보세요.'}</small></div>`;
    return list.map(record=>{const selected=currentSelection()===record.name;return `<article class="address-row">
      <button type="button" class="address-select" data-address-select="${esc(record.name)}" aria-pressed="${selected}">
        <span class="address-row-icon" aria-hidden="true">${icon(/집|home/i.test(record.label)?'home':'pin')}</span>
        <span class="address-copy"><span class="address-name"><b>${esc(record.label)}</b></span><span class="address-detail">${esc(record.address)}</span>${record.memo?`<span class="address-memo">${esc(record.memo)}</span>`:''}</span>
        ${selected?'<span class="address-badge">현재 설정된 위치</span>':''}
      </button>
      ${editing?`<div class="address-row-edit"><button type="button" data-address-edit="${esc(record.name)}" aria-label="${esc(record.label)} 위치 수정">${icon('edit')} 수정</button><button type="button" data-address-delete="${esc(record.name)}" aria-label="${esc(record.label)} 위치 삭제" ${all.length===1?'disabled':''}>${icon('trash')} 삭제</button></div>`:''}
    </article>`;}).join('');
  }
  pages.addresses=()=>`<section class="address-page">
    <header class="address-header"><button type="button" data-action="addressback" aria-label="${fromMy()?'마이로 돌아가기':'지도로 돌아가기'}">${icon('back')}</button><h1 tabindex="-1">위치 편집</h1><button type="button" data-action="addressmanage" aria-label="${editing?'저장 위치 편집 완료':'저장 위치 편집'}" aria-pressed="${editing}">${editing?'완료':icon('edit')}</button></header>
    <button type="button" class="address-search address-search-entry" data-action="addressadd" aria-label="위치 검색 열기">${icon('search')}<span>장소 이름이나 동네로 검색</span></button>
    <button type="button" class="address-locate" data-action="addresscurrent">${icon('target')} 현재 위치로 찾기</button>
    <div id="address-results" aria-label="저장한 위치 목록">${listBody()}</div>
  </section>`;
  pages.myaddresses=()=>pages.addresses();
  pages.addressedit=()=>{
    const record=editKey?recordOf(editKey):{label:draftCoords?'현재 위치':'',address:draftAddress,memo:''};
    return `<section class="address-page"><header class="address-header"><button type="button" data-action="addresslist" aria-label="위치 목록으로 돌아가기">${icon('back')}</button><h1 tabindex="-1">${editKey?'위치 편집':'위치 추가'}</h1></header>
    <form id="address-edit-form" class="address-edit-form">
      <label class="field"><span>위치 이름 <small>선택</small></span><input name="label" aria-label="위치 이름" placeholder="집, 학교 등" maxlength="24" value="${esc(record.label)}"></label>
      <label class="field"><span>위치</span><input name="address" aria-label="위치" placeholder="장소 이름, 동네 또는 도로명" required maxlength="200" value="${esc(record.address)}"></label>
      <label class="field"><span>위치 메모 <small>선택</small></span><textarea name="memo" aria-label="위치 메모" placeholder="건물명, 상세 위치 등" maxlength="300" rows="3">${esc(record.memo)}</textarea></label>
      <button type="submit" class="filled address-save">저장</button>
    </form></section>`;
  };
  pages.myaddressedit=()=>pages.addressedit();

  pages.addressmanage=()=>`<section class="address-page address-manage address-slide"><header class="address-header"><button data-action="addressmanageback" aria-label="위치 페이지로 돌아가기">${icon('back')}</button><h1 tabindex="-1">위치 편집</h1></header><div id="address-results">${listBody()}</div></section>`;
  pages.myaddressmanage=pages.addressmanage;
  pages.addresssearch=()=>`<section class="address-page address-slide"><header class="address-header"><button data-action="addresslist" aria-label="위치 목록으로 돌아가기">${icon('back')}</button><h1>위치 검색</h1></header><h2 class="address-intro">자주 가는 곳의 위치를<br>찾아 볼까요?</h2><form id="address-new-search" class="address-search">${icon('search')}<input id="address-new-query" type="search" aria-label="추가할 위치 검색" placeholder="장소 이름이나 동네로 검색" enterkeyhint="search" autocomplete="off"><button type="submit" aria-label="위치 찾기">${icon('arrow')}</button></form><div class="address-help"><b>자주 가는 곳을 등록해 보세요</b><p>주변에 저장한 콘텐츠를 다시 찾기 쉬워져요.<br>학교, 회사, 자주 가는 동네로 검색해 보세요.</p></div><button class="address-locate" data-action="addressnewcurrent">${icon('target')} 현재 위치로 찾기</button><div id="address-new-results" aria-live="polite"></div></section>`;
  pages.myaddresssearch=pages.addresssearch;
  actions.addressmanageback=()=>{editing=false;showList();};
  let confirmMap=null, confirmHost=null, geoVersion=0;
  const onConfirm=()=>['addressconfirm','myaddressconfirm'].includes(page)&&$('#location-confirm-map')===confirmHost;
  for(const key of ['addressconfirm','myaddressconfirm']){PARENT_TAB[key]=key.startsWith('my')?'my':'map';pageName[key]='지도에서 위치 확인';}
  pages.addressconfirm=()=>`<section class="location-confirm address-slide" aria-label="지도에서 위치 확인">
    <header class="address-header"><button data-action="locationconfirmback" aria-label="위치 검색으로 돌아가기">${icon('back')}</button><h1>지도에서 위치 확인</h1></header>
    <div class="location-confirm-canvas"><div id="location-confirm-map" aria-label="확인할 위치 지도"></div><div class="location-confirm-marker" hidden><b>표시된 위치가 맞나요?</b><span>${icon('pin')}</span></div><button class="location-confirm-recenter" data-action="locationconfirmretry" aria-label="현재 위치 다시 찾기">${icon('target')}</button></div>
    <div class="location-confirm-panel" aria-live="polite"><h2 id="location-confirm-title">현재 위치를 찾고 있어요</h2><p id="location-confirm-detail">위치 접근을 허용하면 지도에서 확인할 수 있어요.</p><p class="location-confirm-notice">표시된 위치가 맞는지 확인해 주세요.</p><button class="filled" id="location-confirm-save" data-action="locationconfirmuse" disabled>이 위치로 등록</button></div>
  </section>`;
  pages.myaddressconfirm=pages.addressconfirm;
  function clearConfirmMap(){geoVersion++;confirmMap?.remove();confirmMap=null;confirmHost=null;}
  new MutationObserver(()=>{if(confirmHost&&!confirmHost.isConnected)clearConfirmMap();}).observe($('#app'),{childList:true,subtree:true});
  function describePoint(point){
    if(!onConfirm())return;
    draftCoords={lat:point.lat,lng:point.lng};draftAddress=`위도 ${point.lat.toFixed(6)}, 경도 ${point.lng.toFixed(6)}`;
    $('#location-confirm-title').textContent='선택한 위치';$('#location-confirm-detail').textContent=draftAddress+' · 위치 이름은 다음 화면에서 입력해 주세요.';
    $('#location-confirm-save').disabled=false;
  }
  function locateConfirmation(){
    const version=++geoVersion;
    $('#location-confirm-title').textContent='현재 위치를 찾고 있어요';$('#location-confirm-save').disabled=true;
    const fail=message=>{if(version!==geoVersion||!onConfirm())return;$('#location-confirm-title').textContent='현재 위치를 확인하지 못했어요';$('#location-confirm-detail').textContent=message;$('#location-confirm-save').disabled=!draftCoords;};
    if(PM_ENV.development){fail('아직 위치 기능이 연결되지 않았어요.');return;}
    if(!navigator.geolocation){fail('이 기기는 위치 찾기를 지원하지 않아요. 돌아가서 위치를 검색해 주세요.');return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      if(version!==geoVersion||!onConfirm())return;
      const point={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(!window.L){fail('지도를 불러오지 못했어요. 돌아가서 다시 시도해 주세요.');return;}
      if(!confirmMap){
        confirmMap=L.map(confirmHost,{zoomControl:false}).setView([point.lat,point.lng],17);
        attachPinmapBasemap(confirmMap);
        confirmMap.on('moveend',()=>{if(onConfirm())describePoint(confirmMap.getCenter());});
        $('#app .location-confirm-marker').hidden=false;
        requestAnimationFrame(()=>{if(onConfirm())confirmMap.invalidateSize();});
      }else confirmMap.setView([point.lat,point.lng],17);
      describePoint(point);
    },error=>fail(error.code===1?'위치 권한을 허용하거나, 돌아가서 위치를 검색해 주세요.':'잠시 후 우측 아래 버튼으로 다시 시도해 주세요.'),{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
  }
  actions.addressnewcurrent=()=>{clearConfirmMap();draftCoords=null;draftAddress='';go(fromMy()?'myaddressconfirm':'addressconfirm');confirmHost=$('#location-confirm-map');locateConfirmation();};
  actions.locationconfirmretry=locateConfirmation;
  actions.locationconfirmback=()=>{clearConfirmMap();go(fromMy()?'myaddresssearch':'addresssearch');};
  actions.locationconfirmuse=()=>{if(!onConfirm()||!draftCoords)return;clearConfirmMap();openEditor(null);};
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='address-new-search')return;event.preventDefault();
    const input=$('#address-new-query'),q=input.value.trim(),host=$('#address-new-results');
    if(q.length<2){host.textContent='두 글자 이상 입력해 주세요.';return;}
    if(PM_ENV.development){host.textContent='아직 위치 검색이 연결되지 않았어요.';return;}
    input.blur();host.textContent='위치를 찾고 있어요…';
    try{
      const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&lat=37.55&lon=126.98&limit=6');
      if(!response.ok)throw Error('search');const data=await response.json();
      if(!host.isConnected)return;
      searchMatches=(data.features||[]).map(f=>({address:[f.properties.name,f.properties.city,f.properties.street,f.properties.housenumber].filter(Boolean).join(' '),lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]}));
      host.innerHTML=searchMatches.length?searchMatches.map((r,i)=>`<button class="address-search-result" data-new-address="${i}">${icon('pin')}<span>${esc(r.address)}</span>${icon('arrow')}</button>`).join(''):'찾은 위치가 없어요. 장소 이름이나 동네를 바꿔 검색해 보세요.';
    }catch{if(host.isConnected)host.textContent='검색을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';}
  });
  document.addEventListener('click',event=>{const b=event.target.closest('[data-new-address]');if(!b)return;const r=searchMatches[Number(b.dataset.newAddress)];if(!r)return;draftAddress=r.address;draftCoords={lat:r.lat,lng:r.lng};openEditor(null);});

  function commit(next){
    if(PM_ENV.development){toast('아직 데이터가 연결되지 않았어요.');return false;}
    try{localStorage.setItem(STORAGE,JSON.stringify({items,preferences,onboardDone,settings:next}));}
    catch{toast('위치를 저장하지 못했어요. 다시 시도해 주세요.');return false;}
    settings=next;return true;
  }
  function openEditor(name){editKey=name;go(fromMy()?'myaddressedit':'addressedit');focusHeading();}
  Object.assign(actions,{
    mapaddresses:()=>{origin='map';queryText='';editing=false;showList();},
    myaddresses:()=>{origin='my';queryText='';editing=false;showList();},
    addresslist:showList,
    addressback:()=>{if(fromMy()){go('my');requestAnimationFrame(()=>$('#app [data-action="myaddresses"]')?.focus());return;}go('map');requestAnimationFrame(()=>$('#app .lm-location-title')?.focus());},
    addressmanage:()=>{editing=true;queryText='';showList();},
    addresscurrent:()=>actions.addressnewcurrent(),
    addressadd:()=>{if(myPlaces().length>=MAX_PLACES){toast(`위치는 최대 ${MAX_PLACES}개까지 저장할 수 있어요.`);return;}draftAddress='';draftCoords=null;go(fromMy()?'myaddresssearch':'addresssearch');$('#address-new-query')?.focus();},
    addressclear:()=>{queryText='';const input=$('#address-search');if(input)input.value='';updateResults();input?.focus();},
    addressdeleteconfirm:()=>{
      const name=pendingDelete;if(!name||!myPlaces().includes(name)||myPlaces().length<=1)return;
      const labels={...settings.placeLabels},details={...settings.placeDetails};delete labels[name];delete details[name];
      const next={...settings,places:myPlaces().filter(value=>value!==name),placeLabels:labels,placeDetails:details};
      if(!commit(next))return;
      window.PinmapLocation?.clear(name);pendingDelete=null;$('#sheet').close();showList();toast('저장한 위치를 삭제했어요.');
    }
  });
  function updateResults(){
    const host=$('#address-results');if(host)host.innerHTML=listBody();
    const clear=$('#app [data-action="addressclear"]');if(clear)clear.hidden=!queryText;
  }
  document.addEventListener('input',event=>{if(event.target.id!=='address-search')return;queryText=event.target.value;updateResults();});
  document.addEventListener('click',event=>{
    const select=event.target.closest('[data-address-select]');
    if(select&& !editing){window.PinmapLocation?.choose(select.dataset.addressSelect);return;}
    const edit=event.target.closest('[data-address-edit]');
    if(edit){openEditor(edit.dataset.addressEdit);return;}
    const remove=event.target.closest('[data-address-delete]');
    if(remove&&!remove.disabled){
      pendingDelete=remove.dataset.addressDelete;
      // 2026-11-04: 아래 시트 대신 화면 가운데 확인 팝업 (로그아웃·탈퇴와 같은 모양)
      if(typeof confirmPop==='function')confirmPop(`‘${esc(recordOf(pendingDelete).label)}’ 위치를 삭제할까요?`,'저장한 콘텐츠는 그대로 있어요.','addressdeleteconfirm','위치 삭제','닫기');
      else modal('위치 삭제',`<p>‘${esc(recordOf(pendingDelete).label)}’ 위치를 삭제할까요? 저장한 콘텐츠는 유지돼요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button type="button" class="filled" data-action="addressdeleteconfirm">위치 삭제</button></div>`);
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='address-search-form'){event.preventDefault();$('#address-search')?.blur();return;}
    if(event.target.id!=='address-edit-form')return;
    event.preventDefault();
    const form=new FormData(event.target),address=String(form.get('address')||'').trim().slice(0,200),label=String(form.get('label')||'').trim().slice(0,24),memo=String(form.get('memo')||'').trim().slice(0,300);
    if(!address){toast('위치를 입력해 주세요.');return;}
    const places=[...myPlaces()],name=editKey||address;
    if((!editKey&&places.includes(name))||places.some(key=>key!==editKey&&recordOf(key).address===address)){toast('이미 저장한 위치예요.');return;}
    if(!editKey&&places.length>=MAX_PLACES){toast(`위치는 최대 ${MAX_PLACES}개까지 저장할 수 있어요.`);return;}
    if(!editKey)places.push(name);
    const old=settings.placeDetails?.[name]||{};
    const detail={...old,address,memo};
    if(old.address!==address){delete detail.lat;delete detail.lng;}
    if(!editKey&&draftCoords&&address===draftAddress)Object.assign(detail,draftCoords);
    const labels={...settings.placeLabels,[name]:label||name};
    const next={...settings,places,placeLabels:labels,placeDetails:{...settings.placeDetails,[name]:detail}};
    if(!commit(next))return;
    queryText='';showList();toast('위치를 저장했어요.');
  });
})();
