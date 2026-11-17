// Authenticated development mode uses the account API as its content source.
// The prototype and the anonymous extraction preview keep their own flows.
function pinmapAccountItem(record, id) {
  if (!record || typeof record !== 'object') throw Error('저장된 콘텐츠 형식이 올바르지 않습니다.');
  const text = (value, limit = 300) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const url = text(record.source_url, 2048);
  if (!/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/.test(url)) {
    throw Error('저장된 게시물 주소가 올바르지 않습니다.');
  }
  const places = Array.isArray(record.places) ? record.places.filter(x => x && typeof x === 'object') : [];
  const events = Array.isArray(record.events) ? record.events.filter(x => x && typeof x === 'object') : [];
  const located = value => Number.isFinite(value?.coordinates?.lat) && Number.isFinite(value?.coordinates?.lng)
    && Math.abs(value.coordinates.lat) <= 90 && Math.abs(value.coordinates.lng) <= 180;
  const mapLocations = (Array.isArray(record.map_locations) ? record.map_locations : [])
    .filter(located).map(x => ({...x, review_required:!!(x.review_required ?? x.needs_review)}));
  const extractionPlaces = places.map(place => {
    const hasCoordinates = located(place);
    const reason = hasCoordinates ? '' : ({
      not_found:'지도에서 같은 이름의 장소를 찾지 못했어요.',
      ambiguous:'동명이점이 있어 위치를 확정하지 못했어요.',
      lookup_failed:'지도 검색에 실패했어요.'
    }[place?.map_lookup?.status] || (place?.address ? '주소의 정확한 위치를 확인하지 못했어요.' : '장소 주소를 확인하지 못했어요.'));
    return {name:text(place.name, 120) || '이름 확인 필요', address:text(place.address),
      hasCoordinates, reason, needsReview:!!place.needs_review};
  });
  const kind = ['place','event','mixed','unknown'].includes(record.content_kind)
    ? record.content_kind : events.length && places.length ? 'mixed' : events.length ? 'event' : places.length ? 'place' : 'unknown';
  const hasEvents = events.length > 0 || kind === 'event' || kind === 'mixed';
  const type = hasEvents ? '전시/팝업' : places.length ? '맛집/카페' : '기타';
  const first = mapLocations[0];
  const eventName = text(events[0]?.title, 120);
  const title = text(record.ai_title, 120) || eventName || text(places[0]?.name, 120) || 'Instagram 게시물';
  const rawCover = text(record.cover_data_url, 700000);
  const cover = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(rawCover) ? rawCover : '';
  const savedAt = typeof record.created_at === 'string' && Number.isFinite(Date.parse(record.created_at))
    ? record.created_at : null;
  const notes = [...(Array.isArray(record.extraction_notes) ? record.extraction_notes : []),
    ...(Array.isArray(record.media_warnings) ? record.media_warnings : [])]
    .map(x => typeof x === 'string' ? x : typeof x?.message === 'string' ? x.message : '')
    .filter(x => x.trim()).map(x => x.trim().slice(0, 300));
  return {id, backendId:record.id, title, type,
    category:hasEvents ? ({exhibition:'전시',pop_up:'팝업'}[events[0]?.event_type] || '행사') : places.length ? '장소' : '기타',
    contentKind:kind, status:text(record.status, 80),
    source:'Instagram', savedAt, desc:text(record.ai_summary, 500), aiSummary:!!text(record.ai_summary),
    art:hasEvents ? 'exhibit' : places.length ? 'cafe' : 'book', photo:cover,
    url, memo:'', collection:'', aiClassified:false,
    authorUsername:text(record.author_username, 80), authorProfilePhoto:text(record.author_profile_data_url, 700000),
    extractionPlaces, extractedPlaceCount:extractionPlaces.length, events, extractionNotes:notes,
    mapLocations, address:text(first?.address), lat:first?.coordinates.lat, lng:first?.coordinates.lng,
    mapKind:hasEvents ? 'event' : 'eat', pending:places.length > 0 && !first};
}

if (PM_ENV.requiresAuth) (() => {
  let client, currentUserId = null, loadVersion = 0, nextLocalId = 9000000000000;
  window.PinmapAccountLoaded = false;
  window.PinmapAccountLoadError = false;
  const localIds = new Map();
  let folderState=PinmapFolders.normalize(null),folderSaving=false;
  function applyFolders(value){
    for(const name of cfCustom()){
      const index=COLLECTIONS.findIndex(entry=>entry[0]===name);
      if(index>=0)COLLECTIONS.splice(index,1);
    }
    folderState=PinmapFolders.normalize(value);
    settings.customFolders=[...folderState.names];cfSyncCollections();
    for(const item of items)item.collection=folderState.assignments[String(item.backendId)]||'';
  }
  // Only non-sensitive folder preferences use user metadata. Never use this
  // client-editable field for authorization or copy other users' organization.
  async function saveFolder(operation){
    if(folderSaving)throw Error('폴더를 저장 중이에요. 잠시 기다려 주세요.');
    folderSaving=true;
    const expected=currentUserId;
    try{
      const {data,error}=await client.auth.getUser();
      if(error||!expected||data?.user?.id!==expected||currentUserId!==expected)throw Error('로그인 계정을 다시 확인해 주세요.');
      const value=PinmapFolders.change(data.user.user_metadata?.pinmap_collections,operation,items);
      const result=await client.auth.updateUser({data:{pinmap_collections:value}});
      if(result.error)throw result.error;
      if(currentUserId!==expected)throw Error('계정이 변경됐어요.');
      loadVersion++; // Do not let an older list response undo new folder metadata.
      applyFolders(value);
    }finally{folderSaving=false;}
  }
  const localId = record => {
    const key = String(record.id || record.source_url || '');
    if (!localIds.has(key)) localIds.set(key, nextLocalId++);
    return localIds.get(key);
  };
  const message = (status, response) => {
    if (status === 401) return '로그인 상태가 만료됐어요. 다시 로그인해 주세요.';
    if (status === 403) return '이 계정의 저장 목록에 접근할 수 없어요.';
    if (status === 409 && response?.error === 'saved_content_limit') return '저장할 수 있는 콘텐츠 100개에 도달했어요. 기존 콘텐츠를 정리한 뒤 다시 시도해 주세요.';
    if (status === 429 && response?.error === 'daily_extraction_limit') return '오늘의 게시물 분석 횟수를 모두 사용했어요. 내일 다시 시도해 주세요.';
    if (status === 429) return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    if (status === 503) return '저장 서버가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.';
    if (status === 400) return 'Instagram 게시물 또는 릴스 링크를 확인해 주세요.';
    return typeof response?.error === 'string' && response.error.length < 150
      ? response.error : '저장 서버에 연결하지 못했어요. 다시 시도해 주세요.';
  };
  async function accountRequest(method, body, query = '', expectedUserId = currentUserId) {
    if (!client) throw Error('로그인 연결을 확인하고 있어요.');
    const {data, error} = await client.auth.getSession();
    if (error || !data?.session?.access_token) throw Error('로그인 상태가 만료됐어요. 다시 로그인해 주세요.');
    if (!expectedUserId || currentUserId !== expectedUserId)
      throw Error('계정이 변경됐어요. 다시 로그인한 뒤 시도해 주세요.');
    const response = await fetch('/api/content-save' + query, {
      method, headers:{'Authorization':'Bearer ' + data.session.access_token,
        ...(body ? {'Content-Type':'application/json'} : {})},
      ...(body ? {body:JSON.stringify(body)} : {}), cache:'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(message(response.status, result));
    return result;
  }
  function clearAccount() {
    loadVersion++;
    currentUserId = null;
    window.PinmapAccountLoaded = false;
    window.PinmapAccountLoadError = false;
    items = [];
    applyFolders(null);
    detailId = null;
    render();
  }
  async function loadAccount() {
    if (!client) return;
    const version = ++loadVersion;
    window.PinmapAccountLoadError = false;
    let userId=currentUserId;
    try {
      const {data, error} = await client.auth.getUser();
      if(version!==loadVersion)return;
      if(error)throw error;
      if(!data?.user?.id){clearAccount();return;}
      userId=data.user.id;
      if(currentUserId&&currentUserId!==userId){items=[];applyFolders(null);detailId=null;}
      currentUserId=userId;
      const records = [];
      let offset = 0;
      for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
        const result = await accountRequest('GET', null, `?limit=2&offset=${offset}`);
        if (!Array.isArray(result.items)) throw Error('저장 목록 응답 형식이 올바르지 않습니다.');
        records.push(...result.items);
        const next = result.next_offset;
        if (next == null) break;
        if (!Number.isSafeInteger(next) || next <= offset) throw Error('저장 목록 페이지를 이어 읽지 못했어요.');
        offset = next;
        if (pageNumber === 99) throw Error('저장 목록이 너무 많아 모두 불러오지 못했어요.');
      }
      if (version !== loadVersion || currentUserId !== userId) return;
      items = records.map(record => pinmapAccountItem(record, localId(record)));
      applyFolders(data.user.user_metadata?.pinmap_collections);
      window.PinmapAccountLoaded = true;
      window.PinmapAccountLoadError = false;
      render();
    } catch (error) {
      if (version === loadVersion && currentUserId === userId) {
        window.PinmapAccountLoaded = true;
        window.PinmapAccountLoadError = true;
        render();
        toast(error.message || '저장 목록을 불러오지 못했어요.');
      }
    }
  }
  const originalSave = actions.save;
  actions.accountretry = () => loadAccount();
  actions.save = () => {
    originalSave();
    const form = document.getElementById('saveform');
    if (!form) return;
    const header = form.querySelector('.eshead p');
    if (header) header.textContent = 'Instagram 게시물에서 장소와 행사 일정을 찾아 저장해요.';
    for (const selector of ['.esshare','.esdivider','.essample']) {
      const node = form.querySelector(selector);
      if (node) node.style.display = 'none';
    }
    for (const name of ['title','type','collection','memo']) {
      const node = form.elements.namedItem(name)?.closest('.esfield');
      if (node) node.style.display = 'none';
    }
    const hint = form.querySelector('.eshint');
    if (hint) hint.textContent = '결과는 로그인한 계정에 저장돼요. 지도 위치와 행사 일정은 각각 확인할 수 있어요.';
  };
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'saveform') return;
    event.preventDefault(); event.stopImmediatePropagation();
    const form = event.target;
    if (form.dataset.busy) return;
    const errorNode = form.querySelector('#saveerror');
    const url = form.elements.namedItem('url').value.trim();
    if (!/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/.test(url)) {
      if (errorNode) errorNode.textContent = 'Instagram 게시물 또는 릴스 링크를 입력해 주세요.';
      return;
    }
    if (errorNode) errorNode.textContent = '';
    form.dataset.busy = '1';
    const button = form.querySelector('button[type="submit"]');
    const label = button?.textContent;
    const progress = form.querySelector('#saveprogress');
    if (button) {button.disabled = true; button.setAttribute('aria-busy','true'); button.textContent = '저장 중…';}
    if (progress) {progress.hidden = false; progress.textContent = '게시물을 분석하고 계정에 저장 중이에요. 몇 분 걸릴 수 있어요.';}
    const userId = currentUserId;
    try {
      const result = await accountRequest('POST', {url,content_types:['place','event']}, '', userId);
      if (!result.item || typeof result.item !== 'object') throw Error('저장 결과를 확인하지 못했어요.');
      if (currentUserId !== userId) return;
      const item = pinmapAccountItem(result.item, localId(result.item));
      item.collection=folderState.assignments[String(item.backendId)]||'';
      items = [item, ...items.filter(x => x.url !== item.url)];
      document.getElementById('sheet')?.close();
      closeOnboarding();
      if (item.mapLocations.length && !item.events.length) {window.pmMapFocus = item.id; go('map');}
      else {go('library'); openDetail(item.id);}
      const warningCount = (Array.isArray(result.warnings) ? result.warnings : []).length;
      toast(item.contentKind === 'unknown'
        ? '링크를 저장했어요. 분석은 완료하지 못했어요. 상세에서 이유를 확인해 주세요.'
        : `저장했어요 · 장소 ${item.extractedPlaceCount}곳 · 행사 ${item.events.length}건${warningCount ? ' · 확인할 안내가 있어요' : ''}`);
    } catch (error) {
      if (errorNode) errorNode.textContent = error.message || '저장하지 못했어요. 다시 시도해 주세요.';
    } finally {
      delete form.dataset.busy;
      if (button) {button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = label;}
      if (progress) {progress.hidden = true; progress.textContent = '';}
    }
  }, true);
  window.PinmapAccountContent = {remove:async item => {
    if (!item?.url) throw Error('삭제할 콘텐츠 주소를 확인하지 못했어요.');
    const userId = currentUserId;
    await accountRequest('DELETE', {url:item.url}, '', userId);
    if (currentUserId !== userId) return;
    items = items.filter(x => x.id !== item.id);
    if (detailId === item.id) detailId = null;
    document.getElementById('sheet')?.close();
    render();
    toast('계정의 저장 목록에서 삭제했어요.');
  }, removeMany:async selected => {
    const userId = currentUserId, removed = [], failed = [];
    for (const item of selected) {
      if (currentUserId !== userId) return;
      try { await accountRequest('DELETE', {url:item.url}, '', userId); removed.push(item.id); }
      catch { failed.push(item.id); }
    }
    if (currentUserId !== userId) return;
    const removedIds = new Set(removed);
    items = items.filter(item => !removedIds.has(item.id));
    cfSel = null;
    document.getElementById('sheet')?.close();
    render();
    toast(failed.length ? `${removed.length}개를 삭제했어요. ${failed.length}개는 삭제하지 못해 목록에 남겼어요.`
      : `콘텐츠 ${removed.length}개를 삭제했어요.`);
  }, refresh:loadAccount};
  const unsupportedContent = () => toast('계정 콘텐츠의 수정·즐겨찾기는 준비 중이에요. 저장된 정보는 그대로예요.');
  for (const name of ['edit','fav']) actions[name] = unsupportedContent;
  actions.cfdelfolderok=async()=>{
    const name=cfFolderToDelete;if(!name)return;
    const button=document.querySelector('[data-action="cfdelfolderok"]');
    try{await PinmapButton.run(button,async()=>{
      await saveFolder({type:'remove',name});cfFolderToDelete=null;
      document.getElementById('sheet').close();collection=null;filter='전체';query='';render();
      toast('폴더를 삭제했어요. 콘텐츠는 그대로 남아 있어요.');
    });}catch(error){toast(error.message||'폴더를 삭제하지 못했어요.');}
  };
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!['cfnewform','cfpickform'].includes(form.id))return;
    event.preventDefault();event.stopImmediatePropagation();
    const creating=form.id==='cfnewform',data=new FormData(form);
    const name=creating?String(data.get('name')||'').trim().replace(/\s+/g,' '):collection;
    if(creating&&(!name||[...CF_ALL.map(x=>x.id),'전체',...cfCustom()].includes(name))){
      document.getElementById('cferr').textContent=name?'같은 이름의 폴더가 이미 있어요.':'폴더 이름을 입력해 주세요.';return;
    }
    const button=form.querySelector('[type="submit"]');
    try{await PinmapButton.run(button,async()=>{
      await saveFolder({type:creating?'create':'assign',name,ids:data.getAll('pick').map(Number)});
      document.getElementById('sheet').close();page='library';detailId=null;filter='전체';query='';collection=name;render();window.scrollTo(0,0);
      toast(creating?'폴더를 만들었어요. 콘텐츠를 담아 보세요.':'폴더에 담은 콘텐츠를 저장했어요.');
    },'폴더 저장 중');}catch(error){
      const errorNode=form.querySelector('#cferr');
      if(errorNode)errorNode.textContent=error.message||'폴더를 저장하지 못했어요.';
      else toast(error.message||'폴더를 저장하지 못했어요.');
    }
  },true);
  actions.cfdelconfirm = () => {
    const selected = items.filter(item => cfSel?.has(item.id));
    if (!selected.length) return;
    const button = document.querySelector('[data-action="cfdelconfirm"]');
    if (button?.disabled) return;
    if (button) {button.disabled = true; button.textContent = '삭제 중…';}
    window.PinmapAccountContent.removeMany(selected).catch(error => {
      if (button) {button.disabled = false; button.textContent = `${selected.length}개 삭제`;}
      toast(error.message || '계정의 콘텐츠를 삭제하지 못했어요.');
    });
  };
  document.addEventListener('submit', event => {
    if (!['editform','lm-pin-form'].includes(event.target.id)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    unsupportedContent();
  }, true);
  PinmapAuth.ready().then(sdk => {
    client = sdk;
    sdk.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {clearAccount(); return;}
      if (['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)) setTimeout(loadAccount, 0);
    });
    loadAccount();
  }).catch(() => toast('로그인 연결을 확인하지 못했어요.'));
})();
