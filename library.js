// 컬렉션(구 저장함) 화면 리디자인 (Figma 시안 반영)
// 하단 메뉴와 화면 이름을 ‘컬렉션’으로 바꿔요
pageName.library = '컬렉션';
// 기존 기능(검색 · 카테고리 필터 · 모음 · 갤러리 보기 · 상세 열기 · 새로 저장)은 그대로 쓰고 화면 모양만 바꿉니다.
// 공통 카드·정렬·검색 결과는 여기서 정의하고, 최종 컬렉션 화면은 collection.js에서 등록합니다.

// 추가 아이콘
Object.assign(paths, {
  chevron:'m6 9 6 6 6-6', chevleft:'M15 5l-7 7 7 7',
  nodes:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  pen:'M4 20h4L19 9l-4-4L4 16z M14 6l4 4'
});
let libSort = 'recent'; // 정렬: recent(최신 저장 순) · near(가까운 순)
const LIB_SORTS = {recent:'최신 저장 순', near:'가까운 순'};

// 주소에서 동네 이름만 꺼내기 (예: '서울 성동구 성수동 · 예시 장소' → '성수동')
// 동·읍·면이 없으면 구·시·군으로 (예: '서울 성동구 뚝섬로 273' → '성동구')
function libArea(x){
  const words = (x.address || '').split(/[·,]/)[0].trim().split(/\s+/);
  return [...words].reverse().find(w => /(동|읍|면)$/.test(w)) || [...words].reverse().find(w => /(구|시|군)$/.test(w)) || '';
}

// 카드 둘째 줄: 기간 또는 저장 시점 + 동네 · 판매처
function libSub(x){
  const parts = [x.period ? x.period.replace(', 예시 기간','') + ' 운영' : `${savedAgo(x)} 저장`];
  if (isPlace(x) && !x.pending && libArea(x)) parts.push(libArea(x));
  else if (x.type === '쇼핑' && x.shop) parts.push(x.shop);
  else if (!isPlace(x) && x.type !== '쇼핑' && x.type !== '레시피') parts.push(x.desc);
  return parts.filter(Boolean).map(esc).join('<i class="libsep" aria-hidden="true"></i>');
}
// 카드 셋째 줄: 거리 · 가격 · 조리 정보
const libMetaLine = (ic, text, cls='') => `<p class="libmeta m-${ic} ${cls}">${icon(ic)}<span>${esc(text)}</span></p>`;
function libMeta(x){
  if (isPlace(x)) {
    if (x.pending) return libMetaLine('pin', '위치 확인 필요', 'warn');
    return x.distance ? libMetaLine('pin', x.distance) : '';
  }
  if (x.type === '쇼핑' && x.price) return libMetaLine('bookmark', x.price.replace(/, (예시|참고) 가격/,''));
  if (x.type === '레시피' && x.recipe) return libMetaLine('clock', x.recipe);
  return '';
}
// 카드 사진: img 폴더에 사진이 있으면 사진, 없으면 기존 일러스트 (일러스트 종류별로 연결)
const LIB_PHOTOS = {};
// 예시 콘텐츠별 사진 (id 기준 · 브라우저에 저장된 예전 데이터에도 적용돼요)
const LIB_PHOTOS_BY_ID = PM_ENV.development ? {} : {
  1:'img/cafe-window.jpg',  // 햇살이 머무는 성수 카페 (큰 창 · 햇살)
  2:'img/lamp-orange.jpg',  // 작은 방을 바꾸는 조명
  6:'img/park-picnic.jpg',  // 서울숲에서 잠깐 쉬어가기
  4:'img/exhibit.jpg',      // 초록 사이, 주말의 전시
  7:'img/cafe-corner.jpg',  // 댓글에서 발견한 카페 (골목 모퉁이 디저트 카페)
  8:'img/brunch-toast.jpg', // 골목 안 작은 브런치 식당
  9:'img/sea-room.jpg',     // 바다 앞 작은 숙소
  3:'img/pasta.jpg',        // 15분, 바질 토마토 파스타
  11:'img/desk-organizer.jpg', // 원룸 수납 정리 아이디어
  12:'img/classroom.jpg',   // 2026 하반기 청년 디자인 장학생 모집
  10:'img/tote-bag.jpg',    // 매일 드는 캔버스 토트백
  5:'img/notebook.jpg',     // 취향을 기록하는 방법
  13:'img/popup-store.jpg'  // 성수 오브젝트 팝업 스토어
};
// A restriction is shown only when the source explicitly reports an age gate.
function pinmapAgeRestricted(x){
  if(['age_restricted','age_restriction'].includes(x?.accessStatus))return true;
  return (Array.isArray(x?.extractionNotes)?x.extractionNotes:[]).some(note=>
    typeof note==='string'&&/연령\s*제한|나이\s*제한|age[-_ ]restrict(?:ed|ion)|age[-_ ]gat(?:e|ed)/i.test(note));
}
const ANALYSIS_FAILURE_STATES={
  age:{label:'연령 제한',title:'Instagram에서 확인이 필요해요',description:'연령 제한으로 게시물의 사진과 내용을 확인하지 못했어요. Instagram에 로그인한 뒤 원본을 확인해 주세요.',hint:'Instagram에서 확인해 주세요',icon:'user',action:'original',actionLabel:'Instagram에서 확인'},
  private:{label:'비공개 게시물',title:'공개된 게시물만 분석할 수 있어요',description:'계정 또는 게시물이 비공개여서 내용을 가져오지 못했어요. Instagram에서 공개 범위를 확인해 주세요.',hint:'원본의 공개 범위를 확인해 주세요',icon:'user',action:'original',actionLabel:'Instagram에서 확인'},
  deleted:{label:'원본 확인 불가',title:'원본 게시물을 찾을 수 없어요',description:'게시물이 삭제되었거나 더 이상 제공되지 않아 내용을 가져오지 못했어요. 저장한 링크와 메모는 유지돼요.',hint:'원본 링크를 확인해 주세요',icon:'close',action:'original',actionLabel:'원본 링크 확인'},
  login:{label:'로그인 필요',title:'Instagram에서 로그인해 주세요',description:'Instagram이 로그인 화면을 표시해 내용을 가져오지 못했어요. 원본에서 접근 가능한지 확인해 주세요. 로그인만으로 자동 재분석되지는 않아요.',hint:'Instagram에서 접근 상태를 확인해 주세요',icon:'link',action:'original',actionLabel:'Instagram에서 확인'},
  media:{label:'미디어 확인 실패',title:'사진과 영상을 불러오지 못했어요',description:'미디어를 가져오지 못해 분석을 시작하거나 완료할 수 없었어요. 원본이 정상 재생되는지 확인해 주세요.',hint:'사진·영상의 재생 상태를 확인해 주세요',icon:'image',action:'original',actionLabel:'원본에서 확인'},
  temporary:{label:'분석 연결 오류',title:'분석을 완료하지 못했어요',description:'응답 지연이나 일시적인 분석 서비스 오류로 결과를 받지 못했어요. 잠시 후 같은 링크를 다시 추가할 수 있어요.',hint:'잠시 후 다시 시도해 주세요',icon:'clock',action:'analysisretry',actionLabel:'링크 다시 추가'},
  quota:{label:'이용 한도 도달',title:'분석 이용 한도를 확인해 주세요',description:'이용 한도에 도달해 게시물을 분석하지 못했어요. 요금제와 다음 이용 가능 시점을 확인해 주세요.',hint:'분석 이용량을 확인해 주세요',icon:'clock',action:'billing',actionLabel:'이용량 확인'},
  unknown:{label:'분석 확인 필요',title:'분석 결과를 얻지 못했어요',description:'결과가 없지만 정확한 실패 원인은 확인되지 않았어요. 원본이 열리는지 확인한 뒤 다시 시도해 주세요.',hint:'원본 상태를 확인해 주세요',icon:'spark',action:'original',actionLabel:'원본에서 확인'}
};
function pinmapAnalysisFailure(x){
  // Any useful analysis keeps the normal result screen, including partial success.
  if(x?.desc?.trim()||x?.searchSummary?.trim()||x?.aiSummary===true||x?.aiClassified||x?.extractionPlaces?.length||x?.events?.length||x?.mapLocations?.length||x?.address)return null;
  const code=String(x?.analysisFailureCode||x?.accessStatus||x?.status||'').toLowerCase();
  const notes=(Array.isArray(x?.extractionNotes)?x.extractionNotes:[]).filter(n=>typeof n==='string').join(' ');
  let kind=null;
  if(pinmapAgeRestricted(x))kind='age';
  else if(/^(private|private_account|private_post)$/.test(code)||/비공개 (계정|게시물)|private (account|post)/i.test(notes))kind='private';
  else if(x?.deleted||/^(deleted|source_deleted|source_not_found|post_not_found)$/.test(code)||/게시물이 삭제|삭제된 게시물|post (?:was )?deleted/i.test(notes))kind='deleted';
  else if(/^(login_required|instagram_login_required)$/.test(code)||/로그인 화면|로그인이 필요|login required/i.test(notes))kind='login';
  else if(/^(media_download_failed|media_fetch_failed|media_unavailable)$/.test(code)||/미디어.*(?:다운로드|수집).*실패|(?:사진|영상).*불러오지 못/i.test(notes))kind='media';
  else if(/^(monthly_analysis_limit|free_monthly_analysis_limit|daily_extraction_limit)$/.test(code))kind='quota';
  else if(/^(timeout|analysis_timeout|ai_error|ai_unavailable|service_unavailable)$/.test(code)||/시간 초과|응답 시간|timed? ?out|AI.*오류/i.test(notes))kind='temporary';
  else if(/^(failed|error|analysis_failed)$/.test(code)||(x?.contentKind==='unknown'&&x?.status==='needs_review'&&notes))kind='unknown';
  return kind?{kind,...ANALYSIS_FAILURE_STATES[kind]}:null;
}
function restrictedCover(state=ANALYSIS_FAILURE_STATES.age){return `<span class="pm-restricted-cover"><span class="pm-restricted-symbol" aria-hidden="true">${state===ANALYSIS_FAILURE_STATES.age||state.kind==='age'?'<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>':icon(state.icon)}</span><b>${esc(state.label)}</b><span class="pm-restricted-hint">${esc(state.hint)}</span></span>`;}
const MISSING_COVER_STATE={kind:'missing-cover',label:'이미지를 불러오지 못했어요',hint:'원본에서 이미지를 확인해 주세요',icon:'image'};
const libPhoto = x => pinmapAnalysisFailure(x) ? '' : x.photo || (PM_ENV.development ? '' : LIB_PHOTOS_BY_ID[x.id] || LIB_PHOTOS[x.art]);
const libThumb = x => {
  const failure=pinmapAnalysisFailure(x);
  if(failure)return restrictedCover(failure);
  const photo=libPhoto(x);
  return photo ? `<img class="pm-cover-img" src="${esc(photo)}" alt="" loading="lazy">` : restrictedCover(MISSING_COVER_STATE);
};
document.addEventListener('error',event=>{
  const image=event.target;
  if(image.matches?.('.pm-cover-img'))image.outerHTML=restrictedCover(MISSING_COVER_STATE);
},true);
function libCard(x, gallery){
  const ratio = gallery ? [1.2,1.5,1.3,1.6][x.id % 4] : 2.1;
  return `<div class="libcard" role="button" tabindex="0" data-detail="${x.id}" aria-label="${esc(x.title)} 상세 보기">
    <div class="libart" style="aspect-ratio:${ratio}">${libThumb(x)}<button type="button" class="libmark" data-unsave="${x.id}" aria-label="${esc(x.title)} 컬렉션에서 삭제">${icon('bookmark')}</button></div>
    <div class="libbody">
      <h3>${esc(x.title)}</h3>
      <p class="libsub">${libSub(x)}</p>
      ${libMeta(x)}
      <div class="libtags"><span class="libpill">${esc(x.type)}</span>${x.deadline ? `<span class="libpill due">${esc(x.deadline)}</span>` : ''}</div>
    </div>
  </div>`;
}
// 홈 · 지도 등 다른 화면의 카드도 같은 모양으로 (app.js의 card · gcard 대체)
card = x => libCard(x, false);
gcard = x => libCard(x, true);
function libList(){
  const list = filtered();
  return libSort === 'near' ? [...list].sort((a,b) => distanceOf(a) - distanceOf(b)) : list;
}

resultCards = function(){
  const list = libList(), gallery = galleryMode();
  return list.map(x => libCard(x, gallery)).join('')
    || `<div class="empty">${icon('search')}<h3>아직 찾는 콘텐츠가 없어요</h3><p class="muted">다른 키워드나 유형으로 다시 찾아 보세요.</p><button class="tonal" data-action="resetfilter">전체 콘텐츠 보기</button></div>`;
};

// 검색할 때 개수 배지 갱신 (app.js의 검색 처리 다음에 실행돼요)
document.addEventListener('input', e => {
  if (e.target.id !== 'search' || page !== 'library') return;
  const n = $('#resultcount'); if (n) n.textContent = filtered().length;
});
// 스크롤하는 동안만 보이는 얇은 스크롤 바 (화면 · 팝업 · 온보딩 등 세로로 스크롤되는 모든 곳)
(() => {
  const bar = document.createElement('div');
  bar.id = 'scrollhint'; bar.setAttribute('aria-hidden', 'true');
  let hideTimer;
  addEventListener('scroll', e => {
    const page = e.target === document || e.target === document.documentElement;
    const el = page ? document.documentElement : e.target;
    if (!(el instanceof Element) || el.scrollHeight <= el.clientHeight + 1) return; // 가로 스크롤(칩 줄 등)은 제외
    // 팝업(top layer) 안이면 팝업 안에 붙여야 위에 보여요
    const host = page ? document.body : (el.closest('dialog') || document.body);
    if (bar.parentNode !== host) host.append(bar);
    const r = page ? {top:0, bottom:innerHeight, right:innerWidth} : el.getBoundingClientRect();
    const top = r.top + 8, bottom = page && $('.bottomnav') && getComputedStyle($('.bottomnav')).display !== 'none' ? 92 : 8;
    const track = (r.bottom - r.top) - 8 - bottom, view = el.clientHeight, total = el.scrollHeight;
    const h = Math.max(32, track * view / total);
    const y = top + (track - h) * Math.min(1, el.scrollTop / (total - view));
    Object.assign(bar.style, {height: h + 'px', top: '0px', left: (r.right - 7) + 'px', right: 'auto', transform: `translateY(${y}px)`});
    bar.classList.add('on');
    clearTimeout(hideTimer); hideTimer = setTimeout(() => bar.classList.remove('on'), 700);
  }, {passive: true, capture: true});
})();

// 정렬 바꾸기
document.addEventListener('change', e => {
  if (!e.target.matches('[data-libsort]')) return;
  libSort = e.target.value;
  $('#results').innerHTML = resultCards();
});

/* ---------- 북마크를 눌러 컬렉션에서 삭제 ---------- */
function unsaveSheet(id){
  const x = items.find(i => i.id === id); if (!x) return;
  modal('', `<div class="esform delsheet">
    <div class="nthead"><div><h2>컬렉션에서 삭제할까요?</h2><p>삭제하면 메모, 모음 정보도 함께 지워져요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody"><div class="delitem"><span class="delthumb">${libThumb(x)}</span><span><b>${esc(x.title)}</b><small>${esc(x.type)}, ${esc(savedAgo(x))} 저장</small></span></div>
      <p class="eshint">원본 SNS 게시물은 그대로 남아 있어요.</p></div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button type="button" class="essubmit deldanger" data-delconfirm="${x.id}">삭제</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
}
// 카드 안 북마크 · 삭제 확인은 카드 열기보다 먼저 처리해요
document.addEventListener('click', e => {
  const un = e.target.closest('[data-unsave]');
  if (un) { e.stopPropagation(); e.preventDefault(); unsaveSheet(Number(un.dataset.unsave)); return; }
  const ok = e.target.closest('[data-delconfirm]');
  if (ok) {
    e.stopPropagation();
    const id = Number(ok.dataset.delconfirm), x = items.find(i => i.id === id);
    if (PM_ENV.requiresAuth) {
      if (!window.PinmapAccountContent) {toast('계정 연결을 확인하고 있어요. 다시 시도해 주세요.'); return;}
      if (ok.disabled) return;
      ok.disabled = true;
      ok.textContent = '삭제 중…';
      window.PinmapAccountContent.remove(x).catch(error => {
        ok.disabled = false;
        ok.textContent = '삭제';
        toast(error.message || '계정에서 삭제하지 못했어요.');
      });
      return;
    }
    items = items.filter(i => i.id !== id); afterChange();
    $('#sheet').close();
    if (detailId === id) detailId = null;
    const y = scrollY; render(); scrollTo(0, y);
    toast(`‘${x ? x.title : '콘텐츠'}’${josa(x ? x.title : '콘텐츠', '을/를').slice((x ? x.title : '콘텐츠').length)} 컬렉션에서 삭제했어요.`);
  }
}, true);
// 카드(div)도 키보드 Enter · Space로 열려요
document.addEventListener('keydown', e => {
  const c = e.target.closest?.('.libcard[data-detail]');
  if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); c.click();
});
