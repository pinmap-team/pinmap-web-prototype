// Full-page address selection. Saved place keys remain compatible with place.js.
(() => {
  PARENT_TAB.addresses='map'; PARENT_TAB.addressedit='map';
  pageName.addresses='위치 편집'; pageName.addressedit='주소 편집';
  // 마이 > 위치 편집: 같은 주소 정보·화면을 쓰는 별도 페이지. 뒤로 가면 마이로 돌아가요.
  PARENT_TAB.myaddresses='my'; PARENT_TAB.myaddressedit='my';
  pageName.myaddresses='위치 편집'; pageName.myaddressedit='주소 편집';
  let queryText='', editing=false, editKey=null, pendingDelete=null, origin='map';
  const fromMy=()=>origin==='my';
  const textValue=value=>typeof value==='string'?value:'';
  function recordOf(name){
    const detail=Object.hasOwn(settings.placeDetails||{},name)?settings.placeDetails[name]:null;
    return {name,label:textValue(settings.placeLabels?.[name])||name,address:textValue(detail?.address)||dongOf(name).full,memo:textValue(detail?.memo)};
  }
  function focusHeading(){requestAnimationFrame(()=>$('#app .address-page h1')?.focus());}
  function showList(){go(fromMy()?'myaddresses':'addresses');focusHeading();}
  function currentSelection(){return window.PinmapLocation?.selected()??null;}
  function listBody(){
    const all=myPlaces().map(recordOf),q=queryText.trim().toLocaleLowerCase();
    const list=all.filter(record=>[record.label,record.name,record.address,record.memo].join(' ').toLocaleLowerCase().includes(q));
    if(!list.length)return `<div class="address-empty"><p>${q?'일치하는 저장 주소가 없어요.':'아직 저장한 주소가 없어요.'}</p><small>${q?'다른 이름이나 주소로 검색해 보세요.':'자주 가는 위치를 주소로 저장해 보세요.'}</small></div>`;
    return list.map(record=>{const selected=currentSelection()===record.name;return `<article class="address-row">
      <button type="button" class="address-select" data-address-select="${esc(record.name)}" aria-pressed="${selected}">
        <span class="address-row-icon" aria-hidden="true">${icon(/집|home/i.test(record.label)?'home':'pin')}</span>
        <span class="address-copy"><span class="address-name"><b>${esc(record.label)}</b>${selected?'<span class="address-badge">현재 설정된 위치</span>':''}</span><span class="address-detail">${esc(record.address)}</span>${record.memo?`<span class="address-memo">${esc(record.memo)}</span>`:''}</span>
        ${selected?`<span class="address-check" aria-hidden="true">${icon('check')}</span>`:''}
      </button>
      ${editing?`<div class="address-row-edit"><button type="button" data-address-edit="${esc(record.name)}" aria-label="${esc(record.label)} 주소 수정">${icon('edit')} 수정</button><button type="button" data-address-delete="${esc(record.name)}" aria-label="${esc(record.label)} 주소 삭제" ${all.length===1?'disabled':''}>${icon('trash')} 삭제</button></div>`:''}
    </article>`;}).join('');
  }
  pages.addresses=()=>`<section class="address-page">
    <header class="address-header"><button type="button" data-action="addressback" aria-label="${fromMy()?'마이로 돌아가기':'지도로 돌아가기'}">${icon('back')}</button><h1 tabindex="-1">위치 편집</h1><button type="button" data-action="addressmanage" aria-label="${editing?'저장 위치 편집 완료':'저장 위치 편집'}" aria-pressed="${editing}">${editing?'완료':icon('edit')}</button></header>
    <form id="address-search-form" class="address-search" role="search">${icon('search')}<input id="address-search" type="search" name="q" aria-label="저장 주소 검색" placeholder="도로명, 건물명, 지번 또는 이름으로 검색" value="${esc(queryText)}" enterkeyhint="search" autocomplete="off"><button type="button" data-action="addressclear" aria-label="주소 검색어 지우기" ${queryText?'':'hidden'}>${icon('close')}</button></form>
    <button type="button" class="address-locate" data-action="addresscurrent">${icon('target')} 현재 위치로 찾기</button>
    <div id="address-results" aria-label="저장한 주소 목록">${listBody()}</div>
    <button type="button" class="address-add" data-action="addressadd">${icon('plus')} 주소 추가</button>
  </section>`;
  pages.myaddresses=()=>pages.addresses();
  pages.addressedit=()=>{
    const record=editKey?recordOf(editKey):{label:'',address:'',memo:''};
    return `<section class="address-page"><header class="address-header"><button type="button" data-action="addresslist" aria-label="주소 목록으로 돌아가기">${icon('back')}</button><h1 tabindex="-1">${editKey?'주소 편집':'주소 추가'}</h1></header>
    <form id="address-edit-form" class="address-edit-form">
      <label class="field"><span>위치 이름 <small>선택</small></span><input name="label" aria-label="위치 이름" placeholder="집, 학교 등" maxlength="24" value="${esc(record.label)}"></label>
      <label class="field"><span>주소</span><input name="address" aria-label="주소" placeholder="도로명 또는 지번 주소" required maxlength="200" value="${esc(record.address)}"></label>
      <label class="field"><span>위치 메모 <small>선택</small></span><textarea name="memo" aria-label="위치 메모" placeholder="건물명, 상세 위치 등" maxlength="300" rows="3">${esc(record.memo)}</textarea></label>
      <button type="submit" class="filled address-save">저장</button>
    </form></section>`;
  };
  pages.myaddressedit=()=>pages.addressedit();
  function commit(next){
    if(PM_ENV.development){toast('아직 데이터가 연결되지 않았어요.');return false;}
    try{localStorage.setItem(STORAGE,JSON.stringify({items,preferences,onboardDone,settings:next}));}
    catch{toast('주소를 저장하지 못했어요. 다시 시도해 주세요.');return false;}
    settings=next;return true;
  }
  function openEditor(name){editKey=name;go(fromMy()?'myaddressedit':'addressedit');focusHeading();}
  Object.assign(actions,{
    mapaddresses:()=>{origin='map';queryText='';editing=false;showList();},
    myaddresses:()=>{origin='my';queryText='';editing=false;showList();},
    addresslist:showList,
    addressback:()=>{if(fromMy()){go('my');requestAnimationFrame(()=>$('#app [data-action="myaddresses"]')?.focus());return;}go('map');requestAnimationFrame(()=>$('#app .lm-location-title')?.focus());},
    addressmanage:()=>{editing=!editing;const y=window.scrollY;render();window.scrollTo(0,y);requestAnimationFrame(()=>$('#app [data-action="addressmanage"]')?.focus());},
    addresscurrent:()=>window.PinmapLocation?.choose(null),
    addressadd:()=>{if(myPlaces().length>=MAX_PLACES){toast(`위치는 최대 ${MAX_PLACES}개까지 저장할 수 있어요.`);return;}openEditor(null);},
    addressclear:()=>{queryText='';const input=$('#address-search');if(input)input.value='';updateResults();input?.focus();},
    addressdeleteconfirm:()=>{
      const name=pendingDelete;if(!name||!myPlaces().includes(name)||myPlaces().length<=1)return;
      const labels={...settings.placeLabels},details={...settings.placeDetails};delete labels[name];delete details[name];
      const next={...settings,places:myPlaces().filter(value=>value!==name),placeLabels:labels,placeDetails:details};
      if(!commit(next))return;
      window.PinmapLocation?.clear(name);pendingDelete=null;$('#sheet').close();showList();toast('저장한 주소를 삭제했어요.');
    }
  });
  function updateResults(){
    const host=$('#address-results');if(host)host.innerHTML=listBody();
    const clear=$('#app [data-action="addressclear"]');if(clear)clear.hidden=!queryText;
  }
  document.addEventListener('input',event=>{if(event.target.id!=='address-search')return;queryText=event.target.value;updateResults();});
  document.addEventListener('click',event=>{
    const select=event.target.closest('[data-address-select]');
    if(select){window.PinmapLocation?.choose(select.dataset.addressSelect);return;}
    const edit=event.target.closest('[data-address-edit]');
    if(edit){openEditor(edit.dataset.addressEdit);return;}
    const remove=event.target.closest('[data-address-delete]');
    if(remove&&!remove.disabled){
      pendingDelete=remove.dataset.addressDelete;
      // 2026-11-04: 아래 시트 대신 화면 가운데 확인 팝업 (로그아웃·탈퇴와 같은 모양)
      if(typeof confirmPop==='function')confirmPop(`‘${esc(recordOf(pendingDelete).label)}’ 주소를 삭제할까요?`,'저장한 콘텐츠는 그대로 있어요.','addressdeleteconfirm','삭제','취소');
      else modal('주소 삭제',`<p>‘${esc(recordOf(pendingDelete).label)}’ 주소를 삭제할까요? 저장한 콘텐츠는 유지돼요.</p><div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button type="button" class="filled" data-action="addressdeleteconfirm">주소 삭제</button></div>`);
    }
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='address-search-form'){event.preventDefault();$('#address-search')?.blur();return;}
    if(event.target.id!=='address-edit-form')return;
    event.preventDefault();
    const form=new FormData(event.target),address=String(form.get('address')||'').trim().slice(0,200),label=String(form.get('label')||'').trim().slice(0,24),memo=String(form.get('memo')||'').trim().slice(0,300);
    if(!address){toast('주소를 입력해 주세요.');return;}
    const places=[...myPlaces()],name=editKey||address;
    if((!editKey&&places.includes(name))||places.some(key=>key!==editKey&&recordOf(key).address===address)){toast('이미 저장한 주소예요.');return;}
    if(!editKey&&places.length>=MAX_PLACES){toast(`위치는 최대 ${MAX_PLACES}개까지 저장할 수 있어요.`);return;}
    if(!editKey)places.push(name);
    const old=settings.placeDetails?.[name]||{};
    const detail={...old,address,memo};
    if(old.address!==address){delete detail.lat;delete detail.lng;}
    const labels={...settings.placeLabels,[name]:label||name};
    const next={...settings,places,placeLabels:labels,placeDetails:{...settings.placeDetails,[name]:detail}};
    if(!commit(next))return;
    queryText='';showList();toast('주소를 저장했어요.');
  });
})();
