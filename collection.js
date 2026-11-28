// 컬렉션 화면: 카테고리 폴더 그리드 (library.js 다음, home.js 전에 불러와요)
// 저장 데이터(items)와 카테고리(TYPES)는 그대로 두고, 화면에서만 폴더로 묶어 보여줘요.
// - 모음(collection)을 열었을 때는 library.js의 기존 목록 화면을 그대로 써요.
// - 검색 · 정렬 · 카드 · 삭제는 library.js의 기능을 그대로 재사용해요.

/* ---------- 폴더 정의 ---------- */
Object.assign(paths, {
  fork:paths.eat,
  ticket:paths.event,
  plane:'M3 13.5 21 6l-4 14-5-5-3 4v-6z M12 15l9-9',
  bag:paths.shop,
  folderplus:'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z M12 10.5v6 M9 13.5h6',
  pushpin:'M14.5 3.5l6 6 M16 5l-4.5 4.5-4 .5L6 11.5l6.5 6.5 1.5-1.5.5-4L19 8 M9.25 14.75 4 20',
  chef:'M7 14a4 4 0 0 1-.7-7.9 5 5 0 0 1 11.4 0A4 4 0 0 1 17 14 M7 14v6h10v-6 M7 17h10'
});
// 칩과 폴더에 쓰는 카테고리 (순서 = 화면 순서)
const CF_FOLDERS = PinmapCategories.all.map(c=>({id:c.label,icon:c.id}));
function cfCategories(){return CF_FOLDERS;}
const CF_ALL_FOLDER = {id:'전체 저장', title:'전체', icon:'bookmark'};
function folderOf(x){return PinmapCategories.of(x).label;}
// 다른 화면에서 넘어온 필터(예: 홈의 '맛집·카페')도 폴더로 바꿔요
const CF_ALIAS = {};
const cfSelected = () => filter === '전체' ? [] : (cfCategories().some(f => f.id === filter) ? [filter] : []);

// 검색어와 선택한 폴더에 맞는 콘텐츠 (items는 최신 저장 순)
function cfMatches(){
  const sel = cfSelected();
  return items.filter(x => (!sel.length || sel.includes(folderOf(x)))
    && PinmapContentSearch.matches(x, query, [folderOf(x)]));
}

// 썸네일 URL: 사진이 없으면 공통 이미지 안내를 사용해 임의의 콘텐츠 그림을 넣지 않아요.
const cfThumbUrl = x => libPhoto(x) || PM_ENV.placeholderImage;
// 실제 저장 시각이 최신인 콘텐츠부터. 시각이 같을 때만 사진을 우선한다.
const cfThumbs = list => [...list].sort((a,b) => ((savedTimestamp(b) ?? -Infinity) - (savedTimestamp(a) ?? -Infinity)) || (libPhoto(b)?1:0) - (libPhoto(a)?1:0)).slice(0, 3).map(cfThumbUrl);

function cfFolderData(list){
  const q = query.trim(), sel = cfSelected();
  const categories=cfCategories();
  let defs = sel.length ? categories.filter(f => sel.includes(f.id)) : categories;
  return defs.map(f => {
    const inFolder = list.filter(x => folderOf(x) === f.id);
    return {id:f.id, title:f.id, icon:f.icon, count:inFolder.length, thumbnails:cfThumbs(inFolder), selected:sel.includes(f.id)};
  }).filter(f => f.count > 0); // 저장된 콘텐츠가 있는 폴더만 표시
}

/* ---------- CollectionFolder 컴포넌트 ---------- */
// 사진 슬롯 3개는 모든 폴더에서 같은 자리 · 같은 각도 (collection.css의 .cf-slot0~2)
// thumbnails[0] = 가장 최근 → 가운데 맨 앞
const CF_EDGE = 'M0 40.16Q0 32 9 32L30 32C39 32 41 41.6 50 41.6L91 41.6Q100 41.6 100 49.76'; // 앞판 top 40% · cfFrontClip과 같은 가장자리
const CF_FRONT_GOO_PATH = 'M0 .17Q0 0 .09 0L.3 0C.39 0 .41 .2 .5 .2L.91 .2Q1 .2 1 .37L1 .83Q1 1 .91 1L.09 1Q0 1 0 .83Z';
// The supplied pin-linear.svg / pin-bold.svg are the source for both menu states and the folder badge.
const cfPinIcon = variant => `<span class="icon cf-pin-icon is-${variant}" aria-hidden="true"></span>`;
const cfPinMark16 = () => cfPinIcon('bold');
const cfUnpinIcon = () => cfPinIcon('unpin');
function CollectionFolder({id, title, icon:ic, count, thumbnails = [], selected = false, attr, pinned = false}){
  // 있는 사진만 보여줘요 (사진이 없으면 가운데 자리표시 1장)
  const shown = Math.max(1, Math.min(3, thumbnails.length));
  const slot = i => {
    if (i >= shown) return '';
    const src = thumbnails[i];
    return `<span class="cf-photo cf-slot${i}${src ? '' : ' cf-empty'}">${src
      ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=PM_ENV.placeholderImage">` : ''}</span>`;
  };
  return `<button type="button" class="cf-folder${selected ? ' on' : ''}${pinned ? ' is-pinned' : ''}" ${attr || `data-cffolder="${esc(id)}"`}>
    <span class="cf-shell">
      <span class="cf-back"><span class="cf-backshape"></span></span>
      ${[2, 1, 0].map(slot).join('')}
      <svg class="cf-shade" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${CF_EDGE}"/></svg>
      <span class="cf-front"></span>
      <svg class="cf-hi" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${CF_EDGE}"/></svg>
      <span class="cf-meta">${pinned ? `<span class="cf-pinmark" aria-hidden="true">${cfPinMark16()}</span>` : ''}<span class="cf-title">${esc(title)}</span><span class="cf-count">${count}<span class="sr">개 저장된 폴더${pinned ? ', 상단 고정됨' : ''}</span></span></span>
    </span>
  </button>`;
}
// 폴더 모양 (clipPath · 블러는 한 번만 정의해 모든 폴더가 같이 써요)
const CF_DEFS = `<svg class="cf-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <clipPath id="cfFrontClip" clipPathUnits="objectBoundingBox"><path d="${CF_FRONT_GOO_PATH}"/></clipPath>
  <clipPath id="cfBackClip" clipPathUnits="objectBoundingBox"><path d="M0 .14Q0 0 .09 0L.32 0C.37 0 .39 .07 .44 .07L.91 .07Q1 .07 1 .21L1 .86Q1 1 .91 1L.09 1Q0 1 0 .86Z"/></clipPath>
  <filter id="cfBlur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
</svg>`;

/* ---------- 내가 만든 폴더 (모음과 같은 데이터: item.collection) ---------- */
// 새 폴더 이름은 settings.customFolders에 저장돼요 (pinmap.js가 브라우저에 보관)
const cfCustom = () => Array.isArray(settings.customFolders) ? settings.customFolders : [];
/* 상단 고정 폴더: 'c:이름'(내가 만든 폴더) · 'k:카테고리'. 전체 폴더 뒤에 마지막으로 고정한 순서대로 놓아요. */
const cfPinned = () => Array.isArray(settings.pinnedFolders) ? settings.pinnedFolders.filter(k => typeof k === 'string') : [];
const cfFolderKey = f => (f.attr ? 'c:' : 'k:') + f.id;
const cfTileKey = tile => tile?.dataset.collection != null ? 'c:' + tile.dataset.collection : tile?.dataset.cffolder != null && tile.dataset.cffolder !== CF_ALL_FOLDER.id ? 'k:' + tile.dataset.cffolder : null;
function cfSetPinned(key, on){
  settings.pinnedFolders = [...(on ? [key] : []), ...cfPinned().filter(k => k !== key)].slice(0, 50);
}
// 저장 · 수정 대화상자의 ‘모음’ 목록에도 새 폴더가 나오도록
function cfSyncCollections(){
  cfCustom().forEach(n => { if (!COLLECTIONS.some(c => c[0] === n)) COLLECTIONS.push([n, 'folder', '내가 만든 폴더']); });
}
document.addEventListener('DOMContentLoaded', cfSyncCollections);

/* Folder ordering does not change saved content or content-level sorting. */
const CF_FOLDER_SORTS=[['saved','최근 담은 순'],['oldest','오래 담은 순'],['name','이름 오름차순'],['name-desc','이름 내림차순'],['count-desc','저장 많은 순'],['count-asc','저장 적은 순']];
function cfCompareSavedTime(left,right,oldest=false){
  if(!Number.isFinite(left))return Number.isFinite(right)?1:0;
  if(!Number.isFinite(right))return -1;
  return oldest?left-right:right-left;
}
function cfOrderFolders(folders){
  const mode=CF_FOLDER_SORTS.some(([k])=>k===settings.folderSort)?settings.folderSort:'saved',custom=cfCustom();
  const latest=f=>items.filter(x=>f.attr ? x.collection===f.id : folderOf(x)===f.id).reduce((max,x)=>Math.max(max,savedTimestamp(x)??-Infinity),-Infinity);
  return [...folders].sort((a,b)=>{
    if(mode==='name'||mode==='name-desc')return a.title.localeCompare(b.title,'ko',{numeric:true})*(mode==='name-desc'?-1:1);
    if(mode==='count-desc'||mode==='count-asc')return (a.count-b.count)*(mode==='count-desc'?-1:1)||cfCompareSavedTime(latest(a),latest(b))||a.title.localeCompare(b.title,'ko');
    if(mode==='saved'||mode==='oldest')return cfCompareSavedTime(latest(a),latest(b),mode==='oldest')||a.title.localeCompare(b.title,'ko');
    const ai=custom.indexOf(a.id),bi=custom.indexOf(b.id);
    if(ai>=0 && bi>=0)return mode==='old'?ai-bi:bi-ai;
    if(ai>=0 || bi>=0)return ai>=0?-1:1;
    return cfCategories().findIndex(f=>f.id===a.id)-cfCategories().findIndex(f=>f.id===b.id);
  });
}
function cfFolderToolbar(){
  return `<div class="cf-folder-toolbar"><label class="libsort"><span class="sr">폴더 정렬</span><select data-folder-sort aria-label="폴더 정렬">${CF_FOLDER_SORTS.map(([value,label])=>`<option value="${value}" ${value===(CF_FOLDER_SORTS.some(([k])=>k===settings.folderSort)?settings.folderSort:'saved')?'selected':''}>${label}</option>`).join('')}</select></label></div>`;
}
document.addEventListener('change',e=>{
  if(!e.target.matches('select[data-folder-sort]'))return;
  if(!CF_FOLDER_SORTS.some(([key])=>key===e.target.value))return;
  settings.folderSort=e.target.value;afterChange();render();
  requestAnimationFrame(()=>document.querySelector('[data-folder-sort]')?.parentElement.querySelector('button')?.focus());
});

/* ---------- 화면 ---------- */
const libraryResultCards = resultCards;  // 기존 목록 (참고용으로 남겨둬요)
const cfQ = () => query.trim().toLowerCase();
const cfHit = x => PinmapContentSearch.matches(x, query, [folderOf(x)]);
// 지금 열린 폴더: 카테고리 폴더(칩 · 폴더) 또는 모음 폴더(collection)
const cfOpenTitle = () => collection || (filter === CF_ALL_FOLDER.id ? CF_ALL_FOLDER.title : (cfSelected().length ? (CF_ALIAS[filter] ? filter : cfSelected()[0]) : ''));
const cfOpenList = () => collection ? items.filter(x => x.collection === collection && cfHit(x)) : cfMatches();

// 열린 폴더의 전체 저장 개수 (검색과 상관없이)
const cfTotal = () => collection ? items.filter(x => x.collection === collection).length : filter === CF_ALL_FOLDER.id ? items.length : items.filter(x => cfSelected().includes(folderOf(x))).length;
function cfStatus(){
  if (!cfOpenTitle() && !cfQ()) return `폴더 ${1 + cfFolderData(items).length + cfCustom().length}개`;
  return `콘텐츠 ${cfOpenList().length}개`;
}
/* ---------- 폴더 안 콘텐츠: 1단 카드 리스트 ---------- */
// 폴더 안 콘텐츠는 폴더 목록과 같은 저장 시각 기준으로 정렬합니다.
const CF_SORTS = {recent:'최근 담은 순', oldest:'오래 담은 순', name:'이름 오름차순', 'name-desc':'이름 내림차순'};
const cfHasPlaces = list => list.some(x => isPlace(x) && !x.pending && x.address);
// 날짜 미상은 마지막에 두고 실제 저장 시각으로 정렬합니다.
function cfSort(list){
  if (libSort === 'name' || libSort === 'name-desc') return [...list].sort((a,b) => String(a.title).localeCompare(String(b.title),'ko',{numeric:true}) * (libSort === 'name-desc' ? -1 : 1));
  return [...list].sort((a,b) => cfCompareSavedTime(savedTimestamp(a),savedTimestamp(b),libSort==='oldest'));
}
// 선택 모드: null이면 꺼짐, Set이면 선택한 콘텐츠 id
let cfSel = null, cfSelKey = '';

// 카드 아래 한 줄 정보: 동네 · 거리 · 저장 시점 (유형마다 다르게)
function cfMetaLine(x){
  const parts = [];
  let ic = '';
  if (isPlace(x)) {
    ic = 'pin';
    if (x.pending) { if (libArea(x)) parts.push(libArea(x)); }
    else { if (libArea(x)) parts.push(libArea(x)); if (x.distance) parts.push(x.distance); }
  } else if (x.type === '쇼핑') {
    if (x.price) parts.push(x.price.replace(/, (예시|참고) 가격/, ''));
    if (x.shop) parts.push(x.shop);
  } else if (x.type === '레시피' && x.recipe) { ic = 'clock'; parts.push(x.recipe.split(', ')[0]); }
  if (x.deadline) parts.push(x.deadline);
  if (!parts.length) return '';
  return `<p class="cf-itemmeta">${ic ? icon(ic) : ''}<span>${parts.map(esc).join('<i aria-hidden="true">, </i>')}</span></p>`;
}
function cfItem(x){
  const on = cfSel?.has(x.id);
  const role = cfSel ? `role="checkbox" aria-checked="${!!on}"` : `role="button" data-detail="${x.id}"`;
  return `<div class="cf-item${on ? ' on' : ''}" tabindex="0" ${role} data-cfitem="${x.id}" aria-label="${esc(x.title)}${cfSel ? '' : ' 상세 보기'}">
    <div class="cf-itemimg">${libPhoto(x) ? `<span class="cf-itemback" aria-hidden="true"><img src="${esc(libPhoto(x))}" alt="" loading="lazy"></span>` : ''}${libThumb(x)}${cfSel ? `<span class="cf-check cf-glass" aria-hidden="true">${icon('check')}</span>` : `<button type="button" class="cf-fav lm-heart-motion t-like${x.favorite ? ' is-active' : ''}" data-cf-fav="${x.id}" data-liked="${!!x.favorite}" aria-pressed="${!!x.favorite}" aria-label="${esc(x.title)} 즐겨찾기"><span class="lm-heart-glyph t-like-icon">${likeHeartIcon(!!x.favorite)}</span></button>`}</div>
    <div class="cf-itembody">
      <div class="cf-itemtext"><h3>${esc(x.title)}</h3><p class="cf-itemdesc">${esc(x.desc || x.memo || '')}</p>${cfMetaLine(x)}</div>
    </div>
  </div>`;
}
function cfCards(list, pick, canSelect){
  const sorts = Object.entries(CF_SORTS);
  if (!sorts.some(([k]) => k === libSort)) libSort = 'recent';
  const selBtn = canSelect ? (cfSel
    ? `<button type="button" class="cf-textbtn" data-action="cfselectoff">취소</button>`
    : `<button type="button" class="cf-textbtn" data-action="cfselect">선택</button>`) : '';
  // 폴더 안에서는 개수를 제목 옆에 보여주고, 여기에는 정렬 · 선택만 (검색 결과일 때만 개수 표시)
  const lead = canSelect ? '' : `<h2 class="cf-resulthead">검색 결과 <span>${list.length}</span></h2>`;
  return `<div class="libsection cf-sec">
      ${lead}
      <div class="cf-tools">${pick && !cfSel ? `<button type="button" class="cf-pickbtn" data-action="cfpick">${icon('plus')}담기</button>` : ''}
      <label class="libsort"><span class="sr">정렬</span><select data-libsort>${sorts.map(([k,v]) => `<option value="${k}" ${libSort===k?'selected':''}>${v}</option>`).join('')}</select>${icon('chevron')}</label>${selBtn}</div>
    </div>
    <div class="cf-items">${cfSort(list).map(cfItem).join('')}</div>`;
}
const cfEmpty = (ic, h, p, btn) => `<div class="cf-list"><div class="empty">${icon(ic)}<h3>${h}</h3><p class="muted">${p}</p>${btn}</div></div>`;

const accountResultCards = function(){
  const q = cfQ(), open = cfOpenTitle();
  // 폴더 안: 폴더 카드 없이 콘텐츠만
  if (open) {
    const list = cfOpenList();
    if (list.length) {
      return cfCards(list, !!collection, true);
    }
    if (q) return cfEmpty('search', '찾는 콘텐츠가 없어요', '다른 키워드로 다시 찾아 보세요.', `<button class="tonal" data-action="clear">검색 지우기</button>`);
    return collection
      ? cfEmpty('folder', '아직 담긴 콘텐츠가 없어요', '저장한 콘텐츠를 골라 이 폴더에 담아 보세요.', `<button class="tonal" data-action="cfpick">콘텐츠 담기</button>`)
      : cfEmpty('bookmark', '아직 저장한 콘텐츠가 없어요', 'SNS에서 공유 → 핀맵으로 담아 보세요.', `<button class="tonal" data-action="save">새로 저장</button>`);
  }
  // 전체: 카테고리 폴더 + 내가 만든 폴더
  const list = cfMatches();
  // 내가 만든 폴더는 가장 최근 것부터 맨 앞(좌측 상단)에, 그 뒤로 카테고리 폴더
  const mine = q ? [] : cfCustom().map(n => {
    const inFolder = items.filter(x => x.collection === n);
    return {id:n,title:n,icon:'folder',count:inFolder.length,thumbnails:cfThumbs(inFolder),attr:`data-collection="${esc(n)}"`};
  });
  // 새 폴더 추가 타일: 항상 맨 앞(좌측 상단) · 검색 중엔 숨겨요
  const addTile = q ? [] : [`<button type="button" class="cf-folder cf-add" data-action="newfolder" aria-label="새 폴더 만들기">
    <span class="cf-shell" aria-hidden="true">
      <span class="cf-back"><span class="cf-backshape"></span></span>
      <span class="cf-front"></span>
      <svg class="cf-hi" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="${CF_EDGE}"/></svg>
      <span class="cf-addplus">${icon('plus')}</span>
    </span>
  </button>`];
  const allFolder = q ? [] : [CollectionFolder({...CF_ALL_FOLDER,count:items.length,thumbnails:cfThumbs(items)})];
  const ordered = cfOrderFolders([...mine.filter(f => f.count > 0), ...cfFolderData(list)]);
  // 새 폴더 타일 뒤에는 전체 폴더를 먼저 놓고, 그다음 상단 고정 폴더를 마지막에 고정한 순서대로 놓아요.
  const pins = q ? [] : cfPinned(), pinned = pins.map(k => ordered.find(f => cfFolderKey(f) === k)).filter(Boolean);
  const rest = ordered.filter(f => !pinned.includes(f));
  const folders = [...addTile, ...allFolder, ...pinned.map(f => CollectionFolder({...f, pinned:true})), ...rest.map(CollectionFolder)];
  const grid = folders.length ? `<div class="cf-grid">${folders.join('')}</div>` : '';
  if (!q) return cfFolderToolbar() + grid;
  if (!list.length) return cfEmpty('search', '찾는 콘텐츠가 없어요', '다른 키워드나 카테고리로 다시 찾아 보세요.', `<button class="tonal" data-action="resetfilter">전체 컬렉션 보기</button>`);
  return grid + cfCards(list, false, false);
};
resultCards = function(){
  const loading = PM_ENV.requiresAuth && !items.length && !window.PinmapAccountLoaded && !window.PinmapAccountLoadError;
  if (window.PinmapAccountLoadError) pendingSkeletonSlots.delete('collection-results');
  const skeleton = '<span class="pm-skel-card"></span><span class="pm-skel-card"></span>';
  return accountSkeletonSlot('collection-results', skeleton, loading ? '' : accountResultCards(), loading, 'pm-skel-collection pm-skel-auto-height');
};

let cfSearchOpen = false;
const CF_RECENT_KEY='pinmap.collection.recent-searches.v1';
let cfRecent=[];
try{const stored=JSON.parse(localStorage.getItem(CF_RECENT_KEY)||'[]');if(Array.isArray(stored))cfRecent=stored.filter(x=>typeof x==='string'&&x.trim()&&x.length<=80).slice(0,8);}catch{}
function cfPersistRecent(){try{localStorage.setItem(CF_RECENT_KEY,JSON.stringify(cfRecent));}catch{}}
function cfRememberSearch(value){
  const text=String(value||'').trim().replace(/\s+/g,' ').slice(0,80);if(!text)return;
  cfRecent=[text,...cfRecent.filter(x=>x.toLocaleLowerCase()!==text.toLocaleLowerCase())].slice(0,8);cfPersistRecent();
}
function recentSearchMarkup(entries,{pick='data-cf-recent',remove='data-cf-recent-remove',clear='data-cf-recent-clear',target='콘텐츠'}={}){
  return `<div class="cf-recent-head"><h2>최근 검색</h2>${entries.length?`<button type="button" ${clear}>전체 삭제</button>`:''}</div>${entries.length?`<ul class="cf-recent-list">${entries.map((text,index)=>`<li><button type="button" class="cf-recent-query" ${pick}="${index}" aria-label="${esc(text)} 다시 검색">${icon('clock')}<span>${esc(text)}</span></button><button type="button" class="cf-recent-remove" ${remove}="${index}" aria-label="${esc(text)} 검색 기록 삭제">${icon('trash')}</button></li>`).join('')}</ul>`:`<p class="cf-recent-empty">최근 검색어가 없어요.<br>찾고 싶은 ${esc(target)}를 검색해 보세요.</p>`}`;
}
function cfRecentContent(){return recentSearchMarkup(cfRecent);}
function cfRefreshRecent(){
  const panel=document.getElementById('cf-recent');if(!panel)return;
  panel.hidden=!cfSearchOpen||!!query.trim();panel.innerHTML=cfRecentContent();
}
document.addEventListener('click',event=>{
  if(page!=='library')return;
  const pick=event.target.closest('[data-cf-recent]'),remove=event.target.closest('[data-cf-recent-remove]');
  if(pick){
    const text=cfRecent[Number(pick.dataset.cfRecent)];if(!text)return;
    const input=document.querySelector('.cf-search-header #search');if(!input)return;
    cfRememberSearch(text);input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();return;
  }
  if(remove){cfRecent.splice(Number(remove.dataset.cfRecentRemove),1);cfPersistRecent();cfRefreshRecent();document.querySelector('.cf-recent-remove')?.focus();return;}
  if(event.target.closest('[data-cf-recent-clear]')){cfRecent=[];cfPersistRecent();cfRefreshRecent();document.querySelector('.cf-search-header #search')?.focus();}
});
document.addEventListener('click',event=>{
  if(page==='library'&&cfSearchOpen&&!cfSel&&query.trim()&&(event.target.closest('[data-cfitem]')||event.target.closest('#pm-keyboard-preview [data-key="search"]')))cfRememberSearch(query);
},true);

pages.library = function(){
  cfSyncCollections();
  const open = cfOpenTitle();
  // 다른 폴더로 가면 선택 모드는 꺼요
  if (cfSelKey !== open) { cfSel = null; cfSelKey = open; }
  // 제목 줄: 높이를 고정해 폴더 안 · 밖, 홈에서 들어온 경우 모두 제목 · 검색창 위치가 같아요
  const back = open
    ? `<button type="button" class="subback cf-back-btn" data-action="cfback" aria-label="컬렉션으로 돌아가기">${icon('back')}</button>`
    : ((typeof backHome !== "undefined" && backHome) ? `<button type="button" class="subback cf-back-btn" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '');
  if(query)cfSearchOpen=true;
  const ph = open ? `${open}에서 찾기` : '제목, 설명, 장소 검색';
  const n = cfSel?.size || 0;
  const selbar = cfSel ? `<div class="cf-selbar" role="toolbar" aria-label="선택한 콘텐츠">
      <button type="button" class="cf-selall" data-action="cfselall">${cfOpenList().length && cfOpenList().every(x => cfSel.has(x.id)) ? '선택 해제' : '전체 선택'}</button>
      <span class="cf-selcount" aria-live="polite">${n ? `${n}개 선택` : ''}</span>
      <button type="button" class="cf-seldel" data-action="cfdelete" ${n ? '' : 'disabled'}>${icon('close')}삭제</button>
    </div>` : '';
  return `<div class="libpage cfpage ${open ? 'cf-infolder' : ''} ${cfSel ? 'cf-selecting' : ''}">${CF_DEFS}
    <div class="cf-search-header">
    <div class="libhead cf-fhead${back ? ' hasback' : ''}">${back}<h1>${esc(open || '컬렉션')}</h1>${open ? `<span class="cf-hcount" aria-label="저장 ${cfTotal()}개">${cfTotal()}</span>` : ''}${collection && cfCustom().includes(collection) && !cfSel ? `<button type="button" class="cf-delfolder" data-action="cfdelfolder" aria-label="‘${esc(collection)}’ 폴더 삭제">${icon('trash')}</button>` : ''}</div>
      <div class="cf-search-row${cfSearchOpen?' is-open':''}" id="cf-search-row" aria-hidden="${!cfSearchOpen}" ${cfSearchOpen?'':'inert'}>
        <label class="libsearch"><input id="search" type="search" enterkeyhint="search" aria-label="${esc(ph)}" placeholder="${esc(ph)}" value="${esc(query)}" autocomplete="off" maxlength="80" ${cfSearchOpen?'':'tabindex="-1"'}></label>
      </div>
      <button type="button" class="cf-header-search" data-action="cftogglesearch" aria-label="${cfSearchOpen?'컬렉션 검색창 닫기':'컬렉션에서 콘텐츠 검색'}" aria-expanded="${cfSearchOpen}" aria-controls="cf-search-row"><span class="lm-search-open-icon">${icon('search')}</span><span class="lm-search-close-icon">${icon('close')}</span></button>
      <section class="cf-recent" id="cf-recent" aria-label="최근 검색어" ${cfSearchOpen&&!query.trim()?'':'hidden'}>${cfRecentContent()}</section>
    </div>
    <p id="resultcount" class="sr" role="status">${cfStatus()}</p>
    <div id="results" class="cf-results">${resultCards()}</div>
    ${selbar}
  </div>`;
};

// Match the map's inline expansion without changing live collection filtering.
actions.cftogglesearch = () => {
  cfSearchOpen=!cfSearchOpen;
  const row=$('#cf-search-row'),input=$('.cf-search-header #search'),toggle=$('.cf-header-search');
  if(!row || !input || !toggle)return;
  row.classList.toggle('is-open',cfSearchOpen);
  row.setAttribute('aria-hidden',String(!cfSearchOpen));row.inert=!cfSearchOpen;
  input.tabIndex=cfSearchOpen?0:-1;
  toggle.setAttribute('aria-expanded',String(cfSearchOpen));
  toggle.setAttribute('aria-label',cfSearchOpen?'컬렉션 검색창 닫기':'컬렉션에서 콘텐츠 검색');
  cfRefreshRecent();
  if(cfSearchOpen)requestAnimationFrame(()=>input.focus());
  else {
    input.blur();input.value='';query='';
    $('#results').innerHTML=resultCards();$('#resultcount').textContent=cfStatus();toggle.focus();
  }
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && cfSearchOpen && e.target.closest('.cf-search-header')){
    e.preventDefault();actions.cftogglesearch();
  }
});

/* ---------- 선택 삭제 ---------- */
function cfSyncSel(){
  const n = cfSel?.size || 0, list = cfOpenList();
  const c = $('.cf-selcount'); if (c) c.textContent = n ? `${n}개 선택` : '';
  const d = $('.cf-seldel'); if (d) d.disabled = !n;
  const all = $('.cf-selall'); if (all) all.textContent = list.length && list.every(x => cfSel.has(x.id)) ? '선택 해제' : '전체 선택';
}
actions.cfselect = () => { cfSel = new Set(); cfSelKey = cfOpenTitle(); render(); };
actions.cfselectoff = () => { cfSel = null; render(); };
actions.cfselall = () => {
  const list = cfOpenList(), every = list.every(x => cfSel.has(x.id));
  list.forEach(x => every ? cfSel.delete(x.id) : cfSel.add(x.id));
  $('#results').innerHTML = resultCards(); cfSyncSel();
};
actions.cfdelete = () => {
  const n = cfSel?.size || 0; if (!n) return;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>콘텐츠 ${n}개를 삭제할까요?</h2><p>삭제하면 메모, 폴더 정보도 함께 지워져요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><p class="eshint">원본 SNS 게시물은 그대로 남아 있어요.</p></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-action="cfdelconfirm">${n}개 삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
};
actions.cfdelconfirm = () => {
  const ids = cfSel || new Set(), n = ids.size;
  items = items.filter(x => !ids.has(x.id)); afterChange();
  $('#sheet').close(); cfSel = null; render();
  toast(`콘텐츠 ${n}개를 삭제했어요.`);
};
// 선택 모드에서는 카드를 누르면 상세 대신 선택돼요 (app.js보다 먼저 처리)
document.addEventListener('click', e => {
  if (!cfSel) return;
  const it = e.target.closest('[data-cfitem]'); if (!it) return;
  e.stopPropagation();
  const id = Number(it.dataset.cfitem);
  cfSel.has(id) ? cfSel.delete(id) : cfSel.add(id);
  it.classList.toggle('on', cfSel.has(id)); it.setAttribute('aria-checked', cfSel.has(id));
  cfSyncSel();
}, true);
// 카드도 키보드 Enter · Space로 열거나 선택해요
document.addEventListener('keydown', e => {
  const c = e.target.closest?.('.cf-item');
  if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); c.click();
});

/* ---------- 동작 ---------- */
// 폴더 밖으로 (홈에서 들어온 경우의 ← 는 컬렉션 첫 화면에서 다시 보여요)
actions.cfback = () => { filter = '전체'; collection = null; query = ''; render(); window.scrollTo(0, 0); };

// 입력 즉시 검색하며 Enter로 키보드를 닫습니다.
document.addEventListener('keydown', e => {
  if (e.target.id === 'search' && page === 'library' && e.key === 'Enter') {
    e.preventDefault(); cfRememberSearch(query); cfRefreshRecent(); e.target.blur();
  }
});
// 새 폴더 만들기
actions.newfolder = () => {
  modal('새 폴더', `<form id="cfnewform" class="cf-form" novalidate>
    <label class="field"><span>폴더 이름</span><input id="cfname" name="name" maxlength="20" autocomplete="off" aria-describedby="cferr" placeholder="예: 제주 여행, 생일 선물"></label>
    <p class="error" id="cferr" role="alert"></p>
    <div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit">만들기</button></div>
  </form>`);
  $('#sheet').classList.add('cfsheet', 'cfcenter');
  setTimeout(() => $('#cfname')?.focus(), 50);
};
// 폴더에 콘텐츠 담기 (한 콘텐츠는 한 폴더에만 담겨요)
actions.cfpick = () => {
  const name = collection; if (!name) return;
  const words = x => [x.title, x.desc, folderOf(x), x.category, x.collection, x.memo].join(' ').toLowerCase();
  modal(`‘${esc(name)}’에 담기`, `<form id="cfpickform" class="cf-form">
    <label class="cf-picksearch">${icon('search')}<input id="cfpickq" type="search" enterkeyhint="search" autocomplete="off" aria-label="담을 콘텐츠 찾기" placeholder="담을 콘텐츠 찾기"></label>
    <div class="cf-pick">${items.map(x => `<label class="cf-pickrow" data-q="${esc(words(x))}"><input type="checkbox" name="pick" value="${x.id}" ${x.collection === name ? 'checked' : ''}>
      <span class="cf-pickthumb">${libThumb(x)}</span><span class="cf-picktext"><b>${esc(x.title)}</b><small>${esc(folderOf(x))}${x.collection && x.collection !== name ? `, ${esc(x.collection)}에 담겨 있음` : ''}</small></span></label>`).join('')}
      <p class="cf-picknone" hidden>찾는 콘텐츠가 없어요.</p></div>
    <p class="hint">다른 폴더에 담긴 콘텐츠를 고르면 이 폴더로 옮겨져요.</p>
    <div class="dialogactions"><button type="button" class="textbtn" data-action="close">취소</button><button class="filled" type="submit" id="cfpickok">담기</button></div>
  </form>`);
  $('#sheet').classList.add('cfsheet');
  cfPickCount();
  setTimeout(() => $('#cfpickq')?.focus(), 60);
};
// 담기 대화상자: 검색어로 목록 거르기 · 고른 개수 표시
function cfPickCount(){
  const n = document.querySelectorAll('#cfpickform input[name="pick"]:checked').length, b = $('#cfpickok');
  if (b) b.textContent = n ? `${n}개 담기` : '담기';
}
document.addEventListener('input', e => {
  if (e.target.id !== 'cfpickq') return;
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('#cfpickform .cf-pickrow').forEach(r => { const on = !q || r.dataset.q.includes(q); r.hidden = !on; shown += on; });
  $('.cf-picknone').hidden = !!shown;
});
document.addEventListener('change', e => { if (e.target.closest?.('#cfpickform') && e.target.name === 'pick') cfPickCount(); });
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('cfsheet', 'cfcenter'));
document.addEventListener('submit', e => {
  if (e.target.id === 'cfnewform') {
    e.preventDefault();
    const name = String(new FormData(e.target).get('name') || '').trim().replace(/\s+/g, ' ');
    const taken = [...cfCategories().map(f => f.id), '전체', ...collectionNames(), ...cfCustom()];
    const err = !name ? '폴더 이름을 입력해 주세요.' : taken.includes(name) ? '같은 이름의 폴더가 이미 있어요. 다른 이름을 입력해 주세요.' : '';
    if (err) { $('#cferr').textContent = err; $('#cfname').focus(); return; }
    settings.customFolders = [...cfCustom(), name]; cfSyncCollections(); afterChange();
    $('#sheet').close();
    page = 'library'; detailId = null; filter = '전체'; query = ''; collection = name;
    render(); window.scrollTo(0, 0);
    toast(`‘${name}’ 폴더를 만들었어요.`);
  } else if (e.target.id === 'cfpickform') {
    e.preventDefault();
    const name = collection, ids = new Set(new FormData(e.target).getAll('pick').map(Number));
    let n = 0;
    items.forEach(x => {
      if (ids.has(x.id)) { if (x.collection !== name) n++; x.collection = name; }
      else if (x.collection === name) x.collection = '';
    });
    afterChange(); $('#sheet').close(); render();
    toast(n ? `콘텐츠 ${n}개를 ‘${name}’에 담았어요.` : `‘${name}’ 폴더를 정리했어요.`);
  }
});

// 선택한 칩이 가로 스크롤 밖에 있으면 보이도록 (화면을 다시 그려도 칩 줄 위치 유지)
let cfChipScroll = 0;
function cfSyncChips(){
  const row = $('.cfchips'); if (!row) return;
  row.scrollLeft = cfChipScroll;
  const on = row.querySelectorAll('.libchip.on'), last = on[on.length - 1], first = on[0];
  if (!first || first.dataset.filter === '전체') return;
  const pad = 20;
  if (last.offsetLeft + last.offsetWidth > row.scrollLeft + row.clientWidth - pad) row.scrollLeft = last.offsetLeft + last.offsetWidth - row.clientWidth + pad;
  if (first.offsetLeft < row.scrollLeft + pad) row.scrollLeft = first.offsetLeft - pad;
}
document.addEventListener('click', e => {
  if (e.target.closest('.cfchips [data-filter]')) cfChipScroll = $('.cfchips')?.scrollLeft || 0;
}, true);
document.addEventListener('click', e => {
  if (e.target.closest('.cfchips [data-filter]')) { cfSyncChips(); return; }
  // 카테고리 폴더: 누르면 폴더 안으로
  const f = e.target.closest('[data-cffolder]'); if (!f) return;
  cfChipScroll = 0; filter = f.dataset.cffolder; query = '';
  render(); window.scrollTo(0, 0); cfSyncChips();
});
// 검색: app.js가 #results를 다시 그린 뒤 개수 안내를 맞춰요
document.addEventListener('input', e => {
  if (e.target.id !== 'search' || page !== 'library') return;
  const n = $('#resultcount'); if (n) n.textContent = cfStatus();
  cfRefreshRecent();
});

// 담기 검색창에서 Enter는 검색만 (대화상자가 닫히지 않게)
document.addEventListener('keydown', e => { if (e.target.id === 'cfpickq' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

/* ---------- 내가 만든 폴더 삭제 (콘텐츠는 남아요) ---------- */
let cfFolderToDelete=null;
function cfAskDeleteFolder(name){
  if(!name || !cfCustom().includes(name))return;
  cfFolderToDelete=name;
  const n = items.filter(x => x.collection === name).length;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>‘${esc(name)}’ 폴더를 삭제할까요?</h2><p>${n ? `안에 담긴 콘텐츠 ${n}개는 지워지지 않고 컬렉션에 그대로 남아요.` : '빈 폴더예요.'}</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-action="cfdelfolderok">폴더 삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
};
actions.cfdelfolder = () => cfAskDeleteFolder(collection);
actions.cfdelfolderok = () => {
  const name = cfFolderToDelete; if (!name || !cfCustom().includes(name)) return;
  cfFolderToDelete=null;
  settings.customFolders = cfCustom().filter(n => n !== name);
  if (Array.isArray(settings.pinnedFolders)) settings.pinnedFolders = settings.pinnedFolders.filter(k => k !== 'c:' + name);
  items.forEach(x => { if (x.collection === name) x.collection = ''; });
  const i = COLLECTIONS.findIndex(c => c[0] === name); if (i >= 0) COLLECTIONS.splice(i, 1);
  afterChange(); $('#sheet').close();
  collection = null; filter = '전체'; query = ''; render(); window.scrollTo(0, 0);
  toast(`‘${name}’ 폴더를 삭제했어요.`);
};

/* 폴더를 꾹 누르면(또는 우클릭) 메뉴: 상단 고정/해제 · 내가 만든 폴더는 삭제도. 스크롤과 일반 탭은 그대로예요. */
let cfMenuKey=null;
let cfHoldMenu=null,cfHoldMenuTile=null;
function cfCloseFolderMenu({restoreFocus=false,immediate=false}={}){
  const menu=cfHoldMenu;if(!menu)return;
  const tile=menu._folderTile;
  cfHoldMenu=null;cfHoldMenuTile=null;
  if(cfMenuKey===menu._folderKey)cfMenuKey=null;
  cancelAnimationFrame(menu._trackFrame);
  menu.dataset.open='false';
  menu._backdrop.dataset.open='false';
  menu._focus.dataset.open='false';
  menu.querySelectorAll('.cf-goo-action').forEach(button=>{button.tabIndex=-1;});
  if(tile?._cfGooMenu===menu)tile._cfGooMenu=null;
  const release=()=>{menu.remove();menu._backdrop.remove();menu._focus.remove();};
  if(immediate||matchMedia('(prefers-reduced-motion: reduce)').matches)release();
  else setTimeout(release,300);
  if(restoreFocus)tile?.focus();
}
function cfOpenFolderMenu(tile,point){
  const key=cfTileKey(tile);if(!key)return;
  if(!tile.isConnected){tile=[...document.querySelectorAll('.cf-folder')].find(node=>cfTileKey(node)===key);if(!tile)return;}
  const custom=key.startsWith('c:'),name=key.slice(2);
  if(custom&&!cfCustom().includes(name))return;
  if(cfHoldMenuTile===tile&&cfHoldMenu?.dataset.open==='true')return;
  cfCloseFolderMenu({immediate:true});
  document.querySelectorAll('.cf-goo-menu,.cf-menu-backdrop,.cf-menu-focus').forEach(node=>node.remove());
  cfMenuKey=key;
  const pinned=cfPinned().includes(key);
  const rect=tile.getBoundingClientRect();
  const front=tile.querySelector('.cf-front').getBoundingClientRect();
  const width=front.width,frontTop=front.top-rect.top,frontHeight=front.height;
  const frontBottom=front.bottom-rect.top;
  const centerX=Math.max(78-rect.left,Math.min(innerWidth-78-rect.left,(point?.x??rect.left+width/2)-rect.left));
  const centerY=frontBottom-27;
  const id='cf-goo-'+Math.random().toString(36).slice(2);
  const backdrop=document.createElement('div');backdrop.className='cf-menu-backdrop';backdrop.dataset.open='false';backdrop.setAttribute('aria-hidden','true');
  const focus=document.createElement('div');focus.className='cfpage cf-menu-focus';focus.dataset.open='false';focus.setAttribute('aria-hidden','true');
  const visual=tile.cloneNode(true);visual.tabIndex=-1;visual.removeAttribute('data-cffolder');visual.removeAttribute('data-collection');visual.removeAttribute('data-action');focus.append(visual);
  focus.style.left=`${rect.left}px`;focus.style.top=`${rect.top}px`;focus.style.width=`${rect.width}px`;focus.style.height=`${rect.height}px`;
  const menu=document.createElement('div');
  menu.className='cf-goo-menu';menu.dataset.open='false';
  menu.style.left=`${rect.left}px`;menu.style.top=`${rect.top}px`;
  menu.style.width=`${width}px`;menu.style.height=`${frontBottom+104}px`;
  menu.setAttribute('role','group');menu.setAttribute('aria-label',`‘${name}’ 폴더 메뉴`);
  menu.innerHTML=`<svg class="cf-goo-layer" viewBox="0 0 ${width} ${frontBottom+104}" aria-hidden="true" focusable="false">
    <defs><filter id="${id}" x="-70%" y="-70%" width="240%" height="240%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
      <feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape"/>
      <feGaussianBlur in="shape" stdDeviation="4" result="shadow-blur"/><feOffset in="shadow-blur" dy="3" result="shadow-offset"/>
      <feFlood flood-color="#000" flood-opacity=".12" result="shadow-color"/><feComposite in="shadow-color" in2="shadow-offset" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="shape"/></feMerge>
    </filter><clipPath id="${id}-reveal"><rect x="-32" y="${frontBottom-2}" width="${width+64}" height="106"/></clipPath></defs>
    <g clip-path="url(#${id}-reveal)"><g filter="url(#${id})">
      <path class="cf-goo-folder" d="${CF_FRONT_GOO_PATH}" transform="translate(0 ${frontTop}) scale(${width} ${frontHeight})"/>
      <circle class="cf-goo-blob cf-goo-left" cx="${centerX}" cy="${centerY}" r="27"/>
      <circle class="cf-goo-blob cf-goo-right" cx="${centerX}" cy="${centerY}" r="27"/>
    </g></g></svg>
    <button type="button" class="cf-goo-action cf-goo-left" style="left:${centerX-27}px;top:${centerY-27}px" data-action="cfpintoggle" aria-label="${pinned?'상단 고정 해제':'상단에 고정'}" title="${pinned?'상단 고정 해제':'상단에 고정'}" tabindex="-1">${pinned?cfUnpinIcon():cfPinIcon('linear')}</button>
    <button type="button" class="cf-goo-action cf-goo-right is-danger" style="left:${centerX-27}px;top:${centerY-27}px" data-action="cfmenudelete" aria-label="폴더 삭제" title="폴더 삭제" tabindex="-1">${icon('trash')}</button>`;
  menu._folderTile=tile;menu._folderKey=key;menu._backdrop=backdrop;menu._focus=focus;
  tile._cfGooMenu=menu;cfHoldMenu=menu;cfHoldMenuTile=tile;
  document.body.append(backdrop,focus,menu);
  const track=()=>{
    if(cfHoldMenu!==menu)return;
    let live=menu._folderTile;
    if(!live.isConnected){live=[...document.querySelectorAll('.cf-folder')].find(node=>cfTileKey(node)===key);if(!live){cfCloseFolderMenu({immediate:true});return;}menu._folderTile=live;cfHoldMenuTile=live;live._cfGooMenu=menu;}
    const current=live.getBoundingClientRect();
    menu.style.left=`${current.left}px`;menu.style.top=`${current.top}px`;
    focus.style.left=`${current.left}px`;focus.style.top=`${current.top}px`;
    menu._trackFrame=requestAnimationFrame(track);
  };
  menu._trackFrame=requestAnimationFrame(track);
  requestAnimationFrame(()=>{if(cfHoldMenu===menu){backdrop.dataset.open='true';focus.dataset.open='true';menu.dataset.open='true';menu.querySelectorAll('.cf-goo-action').forEach(button=>button.tabIndex=0);menu.querySelector('.cf-goo-action')?.focus({preventScroll:true});}});
}
actions.cfpintoggle = () => {
  const key=cfMenuKey;if(!key)return;cfMenuKey=null;
  cfCloseFolderMenu();
  const on=!cfPinned().includes(key);cfSetPinned(key,on);
  afterChange();render();
  toast(on?`‘${key.slice(2)}’ 폴더를 상단에 고정했어요.`:`‘${key.slice(2)}’ 폴더 고정을 해제했어요.`);
};
actions.cfmenudelete = () => {
  const key=cfMenuKey;cfMenuKey=null;if(!key)return;
  cfCloseFolderMenu();
  setTimeout(()=>key.startsWith('c:') ? cfAskDeleteFolder(key.slice(2)) : cfAskDeleteCategory(key.slice(2)),matchMedia('(prefers-reduced-motion: reduce)').matches?0:260);
};
document.addEventListener('pointerdown',e=>{if(cfHoldMenu&&!cfHoldMenu.contains(e.target)&&!cfHoldMenuTile?.contains(e.target))cfCloseFolderMenu();},true);
document.addEventListener('keydown',e=>{if(cfHoldMenu&&e.key==='Escape'){e.preventDefault();cfCloseFolderMenu({restoreFocus:true});}},true);
document.addEventListener('scroll',()=>cfCloseFolderMenu(),{capture:true,passive:true});
/* 카테고리 폴더 삭제 = 그 카테고리로 저장된 콘텐츠를 모두 삭제. 기존 선택 삭제(cfdelconfirm)를 그대로 써서
   계정 모드에서는 백엔드에서도 지워요. 확인창을 닫으면 임시 선택은 풀어요. */
let cfCatDeleting=false;
function cfAskDeleteCategory(id){
  const list=items.filter(x=>folderOf(x)===id);if(!list.length)return;
  cfSel=new Set(list.map(x=>x.id));cfCatDeleting=true;
  const inMine=list.filter(x=>x.collection).length;
  modal('', `<div class="esform delsheet cf-catdel">
    <div class="nthead"><div><h2>‘${esc(id)}’ 폴더를 삭제할까요?</h2><p>폴더 안의 콘텐츠 ${list.length}개가 모두 함께 삭제돼요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><section class="cf-catwarn" role="note" aria-label="삭제 전 확인">
      <h3>${icon('warning')}<span>삭제한 콘텐츠는 되돌릴 수 없어요</span></h3>
      <ul>
        <li>메모, 즐겨찾기, 추출한 장소와 일정도 함께 지워져요.</li>
        ${inMine ? `<li>내가 만든 폴더에 담긴 ${inMine}개도 그 폴더에서 빠져요.</li>` : ''}
        <li>원본 SNS 게시물은 그대로 남아 있어요.</li>
      </ul>
    </section></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-action="cfdelconfirm" data-cat-delete="${esc(id)}">${list.length}개 모두 삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-cat-delete]');if(!b||b.disabled)return;
  if(Array.isArray(settings.pinnedFolders))settings.pinnedFolders=settings.pinnedFolders.filter(k=>k!=='k:'+b.dataset.catDelete);
},true);
document.getElementById('sheet')?.addEventListener('close',e=>{
  // 메뉴 → 확인창으로 넘어갈 때의 close는 무시해요 (확인창이 이미 다시 열려 있어요)
  if(!cfCatDeleting||e.currentTarget.open)return;cfCatDeleting=false;
  if(cfSel){cfSel=null;render();}
});
let cfHoldTimer=null,cfHoldStart=null,cfBlockClick=null;
function cfCancelHold(){clearTimeout(cfHoldTimer);cfHoldTimer=null;cfHoldStart=null;}
const cfHoldTile=target=>{const tile=target.closest?.('.cf-folder:not(.cf-add)');return tile&&cfTileKey(tile)?tile:null;};
document.addEventListener('pointerdown',e=>{
  cfCancelHold();if(e.button!==0)return;
  const tile=cfHoldTile(e.target);if(!tile)return;
  cfHoldStart={x:e.clientX,y:e.clientY};
  cfHoldTimer=setTimeout(()=>{
    const key=cfTileKey(tile);
    const current=tile.isConnected?tile:[...document.querySelectorAll('.cf-folder')].find(node=>cfTileKey(node)===key);
    if(current){cfBlockClick={tile:current,until:Date.now()+1200};navigator.vibrate?.(12);cfOpenFolderMenu(current,cfHoldStart);}
    cfCancelHold();
  },550);
});
document.addEventListener('pointermove',e=>{if(cfHoldStart&&Math.hypot(e.clientX-cfHoldStart.x,e.clientY-cfHoldStart.y)>10)cfCancelHold();},{passive:true});
['pointerup','pointercancel','scroll'].forEach(type=>document.addEventListener(type,cfCancelHold,{capture:true,passive:true}));
document.addEventListener('click',e=>{
  if(cfBlockClick&&Date.now()<cfBlockClick.until&&cfBlockClick.tile.contains(e.target)){
    e.preventDefault();e.stopImmediatePropagation();cfBlockClick=null;
  }
},true);
document.addEventListener('contextmenu',e=>{
  const tile=cfHoldTile(e.target);if(!tile)return;
  e.preventDefault();cfCancelHold();cfOpenFolderMenu(tile,{x:e.clientX,y:e.clientY});
});
// 키보드: 폴더에 초점을 두고 Shift+F10 또는 메뉴 키로 같은 메뉴를 열어요
document.addEventListener('keydown',e=>{
  if(!(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')))return;
  const tile=cfHoldTile(e.target);if(!tile)return;
  e.preventDefault();cfOpenFolderMenu(tile);
});

// 2026-11-24 폴더 안 콘텐츠 카드: 저장 시점 대신 즐겨찾기(별). 카드 열기와 따로 동작해요.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-cf-fav]'); if (!button) return;
  event.preventDefault(); event.stopPropagation();
  const x = items.find(i => String(i.id) === button.dataset.cfFav); if (!x) return;
  const favorite = PinmapFavorites.toggle(x); if (favorite === null) return;
  button.classList.toggle('is-active', favorite); button.setAttribute('aria-pressed', String(favorite));
  window.PinmapHeartMotion?.(button, favorite);
  toast(favorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 뺐어요.');
}, true);
document.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.closest?.('[data-cf-fav]')) event.stopPropagation(); }, true);
