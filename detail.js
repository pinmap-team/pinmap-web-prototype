// 콘텐츠 상세 화면 리디자인 (레퍼런스 시안 반영)
// 상세 정보와 게시물에서 찾은 장소를 표시합니다.
// app.js의 detail()을 이 파일에서 다시 정의합니다. library.js 다음에 불러와야 해요(사진·아이콘을 같이 씁니다).

// 저장한 곳 로고 (출처 이름이나 링크 주소로 판단, 모르는 곳은 첫 글자)
function dtLogo(src){
  const s = String(src).toLowerCase();
  if (/instagram|instagr\.am/.test(s)) return 'img/logo-instagram.png';
  if (/youtube|youtu\.be/.test(s)) return 'img/logo-youtube.png';
  if (/tiktok/.test(s)) return 'img/logo-tiktok.png';
  if (/^x$|^x\.com|twitter/.test(s)) return 'img/logo-x.png';
  return '';
}

function dtEventDate(value){
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year,month,day] = value.split('-').map(Number), date = new Date(year,month-1,day);
  return date.getFullYear() === year && date.getMonth() === month-1 && date.getDate() === day ? value.replaceAll('-', '.') : '';
}
function dtEventInfo(events){
  if(!Array.isArray(events)||!events.length)return '';
  return `<section class="dtsec dt-extraction dt-events"><h2>게시물에서 찾은 행사 일정</h2><p class="dt-extraction-count">${events.length}건 · 게시물에서 추출한 일정</p><ul>${events.map(event => {
    const start = dtEventDate(event.start_date), end = dtEventDate(event.end_date);
    const hasDate=!!(start||end);
    const date = start ? `${start}${end && end !== start ? ' – ' + end : ''}` : end || event.date_text || '날짜 확인 필요';
    const kind = {exhibition:'전시',pop_up:'팝업',other:'행사'}[event.event_type] || '행사';
    const notes = Array.isArray(event.notes) ? event.notes.filter(note => typeof note === 'string').slice(0, 3) : [];
    return `<li><div><strong>${esc(event.title || '행사 이름 확인 필요')}</strong><span class="${hasDate?'dt-extraction-ready':'dt-extraction-pending'}">${kind} · ${hasDate?'날짜 추출':'날짜 확인 필요'}</span></div><p>${icon('calendar')}${esc(date)}${hasDate ? '' : ' · 확정 날짜 아님'}</p>${event.time_text ? `<p>${icon('clock')}${esc(event.time_text)}</p>` : ''}${event.venue_name || event.address ? `<p>${icon('pin')}${esc([event.venue_name,event.address].filter(Boolean).join(' · '))}</p>` : ''}${notes.map(note => `<p>${esc(note)}</p>`).join('')}</li>`;
  }).join('')}</ul></section>`;
}

detail = function(){
  requestAnimationFrame(dtSheetLayout);
  const x = items.find(i => i.id === detailId);
  if (!x) { detailId = null; return pages[page](); }
  const failure=pinmapAnalysisFailure(x);
  const restricted=!!failure;
  const t = typeOf(x.type);
  const src = x.source || 'SNS';
  const author = /^[A-Za-z0-9._]{1,30}$/.test(x.authorUsername || '') ? x.authorUsername : '';
  const authorPhoto = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.authorProfilePhoto || '') ? x.authorProfilePhoto : '';
  const extracted = Array.isArray(x.extractionPlaces) ? x.extractionPlaces : [];
  const locations=Array.isArray(x.mapLocations)?x.mapLocations:[];
  const photoIndexes=PinmapPlaces.matchExtracted(extracted,locations);
  const extractedPlaces=PinmapPlaces.forExtracted(x);
  const mappedCount=photoIndexes.filter(index=>index>=0).length;
  const extractionInfo = extracted.length ? `<section class="dtsec dt-extraction"><h2>게시물에서 찾은 장소</h2><p class="dt-extraction-count">${extracted.length}곳 찾음 · 지도 표시 ${mappedCount}곳</p><ul>${extracted.map((place,i) => {
    const index=photoIndexes[i],favorite=extractedPlaces[i],located=index>=0&&!favorite.unlocated;
    const address=String((index>=0?locations[index]?.address:'')||place.address||'').trim();
    const addressInfo=address ? `<div class="dt-extraction-address"><span>${esc(address)}</span><button type="button" class="dt-extraction-copy-button" data-dt-copy-place="${i}" aria-label="${esc(place.name || '장소')} 주소 복사" title="주소 복사">${icon('copy')}</button></div>${!located&&place.reason?`<p>${esc(place.reason)}</p>`:''}` : `<p>${esc(located?'지도 위치 확인됨':place.reason||'주소를 확인하지 못했어요.')}</p>`;
    return `<li class="dt-extraction-place">${located?PinmapPlacePhotos.markup(x.backendId,index,PinmapPlacePhotos.preferredImage(locations[index],x.photo),'dt-extraction-photo'):''}<div class="dt-extraction-copy"><div class="dt-extraction-heading"><strong>${esc(place.name || '이름 확인 필요')}</strong></div>${addressInfo}</div><button type="button" class="dt-extraction-heart lm-heart-motion t-like${favorite.favorite?' is-active':''}" data-fav-place-id="${esc(favorite.id)}" data-liked="${!!favorite.favorite}" aria-pressed="${!!favorite.favorite}" aria-label="${esc(favorite.title)} 장소 즐겨찾기"><span class="lm-heart-glyph t-like-icon">${likeHeartIcon()}</span></button></li>`;
  }).join('')}</ul></section>` : '';
  const eventInfo=dtEventInfo(x.events);
  const memoInfo = `<section class="dtsec dtmemo"><div class="dtsechead"><h2>내 메모</h2></div><button type="button" class="dtmemobox" data-action="edit" aria-label="메모 수정"><span>${esc(x.memo || '아직 메모가 없어요. 눌러서 남겨 보세요.')}</span>${icon('chevron')}</button></section>`;

  // 유형별 정보
  let info = '';
  if (x.period) info += `<section class="dtsec"><h2>운영 기간</h2><div class="dtrow">${icon('calendar')}<span>${esc(x.period)}</span>${x.deadline ? `<b class="dtdue">마감 ${esc(x.deadline)}</b>` : ''}</div></section>`;
  // 2026-11-10 가격을 크게(headline-md), 안내는 body-md. '예시 가격' → '참고 가격'
  if (x.type === '쇼핑') { const amount = String(x.price || '').replace(/,\s*(예시|참고) 가격$/, '').trim();
    info += `<section class="dtsec dtbuy"><h2>구매 정보</h2>${amount ? `<p class="dtprice"><span class="sr">참고 가격 </span>${esc(amount)}</p>` : '<p class="dtprice none">가격 정보 없음</p>'}<p class="dtpricehint">${x.shop ? `${esc(x.shop)}에서 본 참고 가격이에요.` : '판매처 정보가 없어요.'}<br>가격과 재고는 원본에서 한 번 더 확인해 주세요.</p></section>`; }
  if (x.type === '레시피') info += `<section class="dtsec"><h2>간단 정보</h2><div class="dtrow dtrecipe">${icon('clock')}<span>${esc(x.recipe || '정보 없음')}</span></div><p class="dthint">자세한 조리법은 원본 콘텐츠에서 확인해요.</p></section>`;
  if (x.deleted) info += `<section class="dtsec"><h2>원본 콘텐츠</h2><div class="dtgone"><b>삭제된 게시물이에요.</b><p>원본을 열 수 없지만 ${t.place ? '장소 정보와 ' : ''}내 메모는 그대로 남아 있어요.</p></div></section>`;

  // 아래 고정 버튼: 원본 보기 또는 분석 실패 시 안내 동작
  const bottom = [];
  if(failure){
    bottom.push(`<button class="dtprimary" data-action="${failure.action}">${icon(failure.action==='original'?'image':failure.action==='billing'?'clock':'link')}${esc(failure.actionLabel)}</button>`);
  }
  else if (!x.deleted) {
    const originalLabel = failure?.action==='original' ? failure.actionLabel : x.source === '캡처' ? '캡처 미리보기' : '원본 보기';
    bottom.push(`<button class="dtprimary" data-action="original">${icon('image')}${originalLabel}</button>`);
  }

  return `<article class="dt dt-photo${restricted?' dt-restricted':''}${bottom.length?'':' dt-no-actions'}">
    <div class="dtambient" aria-hidden="true">${libThumb(x)}</div>
    <div class="dthero">${libThumb(x)}<div class="dtshade" aria-hidden="true"></div>
      <div class="dttop"><button class="dtbtn" data-action="back" aria-label="돌아가기">${icon('chevleft')}</button>
        <div class="dttopr">
          <button type="button" class="dtbtn dtfavorite lm-heart-motion t-like${x.favorite?' is-active':''}" data-action="fav" aria-label="${esc(x.title)} 게시물 즐겨찾기" title="즐겨찾기" data-liked="${!!x.favorite}" aria-pressed="${!!x.favorite}"><span class="lm-heart-glyph t-like-icon">${likeHeartIcon()}</span></button>
          <button type="button" class="dtbtn dtsharebtn" data-action="dtshare" aria-label="게시물 공유하기" title="공유">${icon('plane')}</button>
          <button class="dtbtn dtmorebtn" data-action="dtmore" aria-label="더보기" aria-haspopup="menu" aria-expanded="false" aria-controls="dtmenu">${icon('more')}</button>
        </div></div>
      <div class="dtsrc dthtitle">
        <span class="dthpill">${esc(failure?failure.label:x.category || shortType(x.type))}</span>
        <h1>${esc(failure&&x.title==='Instagram 게시물'?'분석 결과가 없는 게시물':x.title)}</h1>
        <small>${esc(src)}, ${esc(savedAgo(x))} 저장</small>
      </div>
    </div>
    <div class="dtmenu" id="dtmenu" role="menu" aria-label="콘텐츠 메뉴" hidden>
      <button type="button" role="menuitem" data-action="edit">${icon('pen')}수정</button>
      <button type="button" role="menuitem" class="dtmenu-danger" data-unsave="${x.id}">${icon('trash')}삭제</button>
    </div>
    <section class="dtsheet" id="detail-info" aria-label="콘텐츠 상세 정보">
      <button type="button" class="dt-sheet-handle" data-action="dtsheettoggle" aria-label="상세 정보 펼치기" aria-controls="detail-info" aria-expanded="false"><span aria-hidden="true"></span></button>
      ${author ? `<div class="dt-author">${authorPhoto ? `<img src="${esc(authorPhoto)}" alt="">` : `<span class="dt-author-fallback" aria-hidden="true">@</span>`}<span>게시물 작성자 <b>@${esc(author)}</b></span></div>` : ''}
      ${x.desc ? x.source === '직접 추가' || x.aiSummary === false
        ? `<section class="dtsum" data-dtsum><h2>${icon('spark')}장소 설명</h2>${dtSummaryBody(x.desc)}</section>`
        : `<section class="dtsum dtai-review"><h2 class="dtai">${dtAiSparkIcon()}<span class="dtai-title t-shimmer" data-text="AI 컨텐츠 요약">AI 컨텐츠 요약</span><button type="button" class="dtai-info-button" data-dtai-info aria-label="AI 컨텐츠 요약 안내">${icon('info')}</button></h2>${dtAiSummaryBody(x)}</section>` : ''}
      ${extractionInfo}
      ${eventInfo}
      ${memoInfo}
      ${info}
    </section>
    ${bottom.length ? `<div class="dtbar ${bottom.length === 1 ? 'one' : ''}">${bottom.join('')}</div>` : ''}
  </article>`;
};

// The information sheet rides over the sticky photo using native page scrolling.
let dtSheetDrag=null,dtSheetIgnoreClickUntil=0;
function dtSheetStop(){
  const title=document.querySelector('.dt-photo .dthtitle'),hero=document.querySelector('.dt-photo .dthero');
  if(!title||!hero)return 240;
  const bottom=title.getBoundingClientRect().bottom-hero.getBoundingClientRect().top;
  return Math.min(Math.max(120,bottom+24),Math.max(120,innerHeight-260));
}
function dtSheetLayout(){
  const sheet=document.getElementById('detail-info');if(!sheet)return;
  sheet.style.setProperty('--dt-sheet-top',`${dtSheetStop()}px`);
  dtSheetSync();
}
function dtSheetTarget(){
  const sheet=document.getElementById('detail-info');
  return sheet?Math.max(0,sheet.getBoundingClientRect().top+scrollY-dtSheetStop()):0;
}
addEventListener('resize',dtSheetLayout);
document.fonts?.ready.then(dtSheetLayout);
function dtSheetScroll(expand){
  const top=expand?dtSheetTarget():0;
  if(!expand){const sheet=document.getElementById('detail-info');if(sheet)sheet.scrollTop=0;}
  scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
actions.dtsheettoggle=()=>{
  if(performance.now()<dtSheetIgnoreClickUntil)return;
  dtSheetScroll(document.querySelector('.dt-sheet-handle')?.getAttribute('aria-expanded')!=='true');
};
function dtSheetSync(){
  const handle=document.querySelector('.dt-sheet-handle');if(!handle)return;
  const expanded=scrollY>=dtSheetTarget()-2;
  const sheet=handle.closest('.dtsheet');
  sheet.classList.toggle('is-expanded',expanded);
  if(!expanded&&sheet.scrollTop)sheet.scrollTop=0;
  handle.setAttribute('aria-expanded',String(expanded));
  handle.setAttribute('aria-label',expanded?'상세 정보 접기':'상세 정보 펼치기');
}
// Wheel/trackpad scrolling lifts the sheet before scrolling its contents.
document.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.deltaY<=0||!event.target.closest?.('.dt-photo')||document.querySelector('#sheet[open]'))return;
  const sheet=document.getElementById('detail-info');if(!sheet)return;
  const remaining=Math.max(0,dtSheetTarget()-scrollY);
  if(remaining<=2)return;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  event.preventDefault();
  scrollTo({top:Math.min(dtSheetTarget(),scrollY+delta),behavior:'instant'});
  dtSheetSync();
  if(delta>remaining&&sheet.classList.contains('is-expanded'))sheet.scrollTop+=delta-remaining;
},{passive:false});

document.addEventListener('pointerdown',event=>{
  const handle=event.target.closest('.dt-sheet-handle');
  if(!handle||event.button!==0)return;
  dtSheetDrag={id:event.pointerId,handle,y:event.clientY,start:scrollY,moved:false};
  handle.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  const drag=dtSheetDrag;if(!drag||event.pointerId!==drag.id)return;
  if(!drag.handle.isConnected){dtSheetDrag=null;return;}
  const delta=drag.y-event.clientY;
  if(Math.abs(delta)>4)drag.moved=true;
  if(drag.moved){event.preventDefault();scrollTo({top:Math.min(dtSheetTarget(),Math.max(0,drag.start+delta)),behavior:'instant'});}
},{passive:false});
function dtSheetRelease(event){
  const drag=dtSheetDrag;if(!drag||event.pointerId!==drag.id)return;
  dtSheetDrag=null;
  if(drag.handle.hasPointerCapture(event.pointerId))drag.handle.releasePointerCapture(event.pointerId);
  if(!drag.moved)return;
  dtSheetIgnoreClickUntil=performance.now()+250;
  if(event.type==='pointercancel'||!drag.handle.isConnected)return;
  const delta=drag.y-event.clientY;
  dtSheetScroll(Math.abs(delta)>32?delta>0:scrollY>dtSheetTarget()/2);
}
document.addEventListener('pointerup',dtSheetRelease);
document.addEventListener('pointercancel',dtSheetRelease);

// 2026-11-10 상단 미트볼(⋯) 메뉴: 공유 · 수정 · 삭제
const dtMenuSet = open => {
  const btn = document.querySelector('.dtmorebtn'), menu = document.getElementById('dtmenu');
  if (!btn || !menu) return;
  if (open) {
    const rect = btn.getBoundingClientRect();
    menu.style.setProperty('--dt-menu-top', `calc(${rect.bottom}px + var(--space-sm))`);
    menu.style.setProperty('--dt-menu-right', `max(var(--space-lg), ${innerWidth - rect.right}px)`);
  }
  menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('[role="menuitem"]')?.focus();
};
actions.dtmore = () => dtMenuSet(document.getElementById('dtmenu')?.hidden !== false);
document.addEventListener('click', e => {
  const menu = document.getElementById('dtmenu');
  if (!menu || menu.hidden) return;
  if (e.target.closest('[role="menuitem"]')) { menu.hidden = true; document.querySelector('.dtmorebtn')?.setAttribute('aria-expanded', 'false'); return; }
  if (!e.target.closest('.dtmenu,.dtmorebtn')) dtMenuSet(false);
}, true);
document.addEventListener('keydown', e => {
  const menu = document.getElementById('dtmenu');
  if (!menu || menu.hidden) return;
  const list = [...menu.querySelectorAll('[role="menuitem"]')], i = list.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); dtMenuSet(false); document.querySelector('.dtmorebtn')?.focus(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus(); }
});
addEventListener('scroll', () => {if (document.getElementById('dtmenu')?.hidden === false) dtMenuSet(false);}, true);
addEventListener('resize', () => {if (document.getElementById('dtmenu')?.hidden === false) dtMenuSet(false);});

// 공유: 휴대폰 공유 메뉴 → 안 되면 제목 · 주소 · 링크를 복사
actions.dtshare = async () => {
  const x = items.find(i => i.id === detailId); if (!x) return;
  const text = [x.title, x.address && !x.pending ? x.address : '', x.url || ''].filter(Boolean).join('\n');
  try { if (navigator.share) { await navigator.share({title: x.title, text}); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('공유할 내용을 복사했어요.'); }
  catch { toast('이 브라우저에서는 공유할 수 없어요.'); }
};
paths.trash = 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3';
paths.walk = 'M13 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0 M9 21l2-6 2 2v4 M8 11l2-3 3 1 2 3 2 1 M11 15l1-5';

// 상세 상단은 게시물 즐겨찾기, 추출 장소 목록은 장소 즐겨찾기예요.
actions.fav = () => {
  const x = items.find(i => i.id === detailId); if (!x) return;
  const favorite = PinmapFavorites.toggle(x); if (favorite === null) return;
  const y = scrollY; render(); scrollTo(0, y);
  const button = document.querySelector('.dt-photo .dtfavorite');
  if (button) window.PinmapHeartMotion?.(button, favorite);
  toast(favorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 뺐어요.');
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-fav-place-id]');if(!button||detailId==null)return;
  const item=items.find(entry=>entry.id===detailId);
  const place=[...PinmapPlaces.forItem(item),...PinmapPlaces.forExtracted(item)].find(entry=>entry.id===button.dataset.favPlaceId);
  if(!place)return;
  const favorite=PinmapFavorites.toggle(place);if(favorite===null)return;
  button.classList.toggle('is-active',favorite);button.setAttribute('aria-pressed',String(favorite));
  window.PinmapHeartMotion?.(button,favorite);
  toast(favorite?'장소를 즐겨찾기에 추가했어요.':'장소 즐겨찾기를 취소했어요.');
});

/* ---------- 저장 정보 수정 (흰 시트) ---------- */
// app.js의 수정 처리(#editform 제출)를 그대로 쓰도록 입력 이름(type · title · address · memo · collection)을 유지해요.
function editSheet(){
  const x = items.find(i => i.id === detailId); if (!x) return;
  const currentFolder=cfCustom().includes(x.collection)?'custom:'+x.collection:'category:'+folderOf(x);
  const label = (ic, text, extra='') => `<div class="eslabel">${icon(ic)}<span>${text}</span>${extra}</div>`;
  modal('', `<form id="editform" class="esform">
    <div class="eshead"><span class="esicon" aria-hidden="true">${icon('bookmark')}</span><div><h2>저장 정보 수정</h2></div><button type="button" class="esclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody">
      <div class="esfield">${label('grid','카테고리')}
        <input type="hidden" name="type" id="es-type" value="${esc(x.type)}">
        <span class="esselect"><select name="folder" id="es-folder" aria-label="카테고리 및 폴더 선택">${cfCategories().map(f=>`<option value="category:${esc(f.id)}" data-icon="${esc(f.icon)}" ${currentFolder==='category:'+f.id?'selected':''}>${esc(f.id)}</option>`).join('')}${cfCustom().length?`<optgroup label="내가 만든 폴더">${cfCustom().map(name=>`<option value="custom:${esc(name)}" data-icon="folder" ${currentFolder==='custom:'+name?'selected':''}>${esc(name)}</option>`).join('')}</optgroup>`:''}<option value="new:" data-icon="folderplus">새 폴더 만들기</option></select></span>
      </div>
      <div class="esfield" id="es-newfolder" hidden><label for="es-newcol" class="eslabel">${icon('folderplus')}새 폴더 이름</label><span class="esinput"><input id="es-newcol" maxlength="30" placeholder="예: 이번 주말 가고 싶은 곳" autocomplete="off"></span><p class="eshint">수정 완료를 누르면 새 폴더를 만들고 여기에 담아요.</p><p id="es-folder-error" class="eserror" role="alert"></p></div>
      <label class="esfield">${label('text','제목')}
        <span class="esinput"><input name="title" id="es-title" value="${esc(x.title)}" required maxlength="50"></span><small class="escount" data-for="es-title"></small>
      </label>
      <label class="esfield" id="es-addrwrap" ${typeOf(x.type).place?'':'hidden'}>${label('pin','주소')}
        <span class="esinput withicon">${icon('pin')}<input name="address" id="es-address" value="${esc(x.address||'')}" maxlength="200" placeholder="원본에서 확인한 주소"></span>
      </label>
      <label class="esfield">${label('note','메모')}
        <span class="esinput area"><textarea name="memo" id="es-memo" rows="3" maxlength="200" placeholder="어떤 순간에 다시 보고 싶나요?">${esc(x.memo||'')}</textarea></span><small class="escount" data-for="es-memo"></small>
      </label>
      <input type="hidden" name="collection" id="es-col" value="${esc(x.collection||'')}">
      <p class="eshint">카테고리를 직접 바꾸면 ‘직접 분류’로 표시돼요. 새 주소의 지도 위치는 저장 전에 검색해요.</p><p id="es-save-error" class="eserror" role="alert"></p>
    </div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">수정 완료</button></div>
  </form>`);
  $('#sheet').classList.add('editsheet');
  esCounts();
}
actions.edit = editSheet;
paths.grid = 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z';
paths.text = 'M5 6V4h14v2 M12 4v16 M9 20h6';
const esCounts = () => document.querySelectorAll('.esform .escount').forEach(c => {
  const el = document.getElementById(c.dataset.for); if (el) c.textContent = `${el.value.length}/${el.maxLength}`;
});

// First entry places the caret at the end; later taps can still reposition it.
const esCaretOnEntry = new WeakSet();
function esEditable(target){
  return target?.matches?.('#editform input:not([type="hidden"]), #editform textarea') && typeof target.setSelectionRange === 'function';
}
function esCaretToEnd(field){
  if(document.activeElement !== field)return;
  field.setSelectionRange(field.value.length,field.value.length);
  field.scrollLeft=field.scrollWidth;
}
document.addEventListener('pointerdown',e=>{
  if(!esEditable(e.target))return;
  esCaretOnEntry.delete(e.target);
  if(document.activeElement!==e.target)esCaretOnEntry.add(e.target);
},true);
document.addEventListener('focusin',e=>{
  if(esEditable(e.target))requestAnimationFrame(()=>esCaretToEnd(e.target));
});
document.addEventListener('click',e=>{
  if(!esEditable(e.target)||!esCaretOnEntry.has(e.target))return;
  esCaretOnEntry.delete(e.target);esCaretToEnd(e.target);
});
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('editsheet'));
document.addEventListener('input', e => {
  if (!e.target.closest?.('.esform')) return;
  esCounts();
  const err = $('#saveerror'); if (err) err.textContent = '';
  if (e.target.id === 'es-newcol') { if($('#es-folder'))$('#es-folder').value='new:'; $('#es-col').value = e.target.value.trim(); document.querySelectorAll('[data-escol]').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed','false'); }); }
});
document.addEventListener('change', e => {
  if(e.target.id === 'es-folder'){
    const value=e.target.value,newFolder=value==='new:';
    $('#es-newfolder').hidden=!newFolder;$('#es-newcol').required=newFolder;
    $('#es-folder-error').textContent='';
    if(newFolder){$('#es-col').value=$('#es-newcol').value.trim();$('#es-newcol').focus();}
    else if(value.startsWith('custom:'))$('#es-col').value=value.slice(7);
    else if(value.startsWith('category:')){
      const name=value.slice(9),type=PinmapCategories.presentation(name);
      $('#es-type').value=type;
      $('#es-addrwrap').hidden=!typeOf(type).place;
    }
    return;
  }
  if (e.target.id !== 'es-type') return;
  const ai = e.target.value === 'ai', t = typeOf(e.target.value);
  const emoji = $('.esform .esemoji'); if(emoji)emoji.textContent = ai ? '✨' : t.emoji;
  const folderSelect = $('#es-folder');
  if(folderSelect){ const folder = t.id==='맛집/카페' ? '카페' : t.id==='전시/팝업' ? '전시' : CF_FOLDERS.some(f=>f.id===t.id) ? t.id : ''; if(folder)folderSelect.value='category:'+folder; }
  const addr = $('#es-addrwrap'); if (addr) addr.hidden = !t.place;
});
document.addEventListener('click', e => {
  const c = e.target.closest('[data-escol]');
  if (c) {
    $('#es-col').value = c.dataset.escol; $('#es-newcol').hidden = true; $('#es-newcol').value = '';
    document.querySelectorAll('[data-escol]').forEach(b => { const on = b === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    return;
  }
  if (e.target.closest('[data-esnew]')) { const n = $('#es-newcol'); n.hidden = false; n.focus(); }
});

/* ---------- 새로 저장 (흰 시트) ---------- */
// app.js의 저장 처리(#saveform 제출)를 그대로 쓰도록 입력 이름(url · title · type · collection · memo)과 #saveerror를 유지해요.
function saveSheet(){
  const label = (ic, text, extra='') => `<div class="eslabel">${icon(ic)}<span>${text}</span>${extra}</div>`;
    modal('Instagram 링크로 저장', `<form id="saveform" class="esform" novalidate>
      <div class="esbody">
        <p class="add-import-intro">Instagram 게시물 또는 릴스 링크를 입력해 주세요. 여러 개는 줄을 바꿔 붙여넣을 수 있어요.</p>
        <label class="esfield">${label('link','게시물 주소 (URL)')}
          <span class="esinput withicon">${icon('link')}<textarea name="url" id="es-url" rows="2" placeholder="https://www.instagram.com/p/…/" required inputmode="url"></textarea></span>
        </label>
        <input type="hidden" name="title" value="">
        <input type="hidden" name="type" value="ai">
        <input type="hidden" name="collection" value="">
        <input type="hidden" name="memo" value="">
        <p class="eshint">이 브라우저에 저장돼요. 장소·일정 자동 추출은 로그인 화면에서 이용할 수 있어요.</p>
        <p class="eserror" id="saveerror" role="alert"></p>
      </div>
      <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">저장하기</button></div>
    </form>`);
    $('#sheet').classList.add('editsheet', 'add-import-sheet');

}
actions.save = saveSheet;
// 링크를 비워둔 채 저장하면 안내 (제목은 선택 사항이에요).
document.addEventListener('submit', e => {
  if (e.target.id !== 'saveform') return;
  const f = e.target, err = $('#saveerror');
  if (!f.url.value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); err.textContent = '저장할 콘텐츠 링크를 붙여넣어 주세요.'; f.url.focus(); return; }
}, true);
paths.link = paths.link || 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1';

// 상세에서 사진 아래까지 스크롤하면 상태 표시줄 띠를 켜요
addEventListener('scroll', () => {
  const hero = document.querySelector('.dthero');
  const sheet=document.getElementById('detail-info');
  document.body.classList.toggle('dtscrolled',sheet?sheet.getBoundingClientRect().top<80:!!hero&&hero.getBoundingClientRect().bottom<120);
  dtSheetSync();
}, {passive: true});

// 주소 복사 (클립보드 → 안 되면 선택 복사)
async function dtCopy(text){
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
document.addEventListener('click', async event => {
  const button=event.target.closest('[data-dt-copy-place]');
  if(!button||detailId==null)return;
  const x=items.find(item=>item.id===detailId);
  const extracted=Array.isArray(x?.extractionPlaces)?x.extractionPlaces:[];
  const index=Number(button.dataset.dtCopyPlace);
  if(!Number.isInteger(index)||index<0||index>=extracted.length)return;
  const locations=Array.isArray(x.mapLocations)?x.mapLocations:[];
  const locationIndex=PinmapPlaces.matchExtracted(extracted,locations)[index];
  const address=String((locationIndex>=0?locations[locationIndex]?.address:'')||extracted[index].address||'').trim();
  if(!address)return;
  toast(await dtCopy(address)?'주소를 복사했어요.':`주소: ${address}`);
});

/* 직접 추가한 장소 설명은 첫 문장을 접힌 상태로 보여 줍니다. */
// AI 요약에는 사용자가 지정한 세 개의 선형 별을 사용해요.
// 2026-11-27: AI 컨텐츠 요약 아이콘은 Figma 'Icon / spark / accent' Color=Gradient(Pinmap/gradients/accent)
function dtAiSparkIcon(){
  return `<svg class="icon dtai-spark" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="dtai-spark-gradient" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C6F5E1"/><stop offset="1" stop-color="#AFF3E4"/></linearGradient></defs><path d="${figmaIconPath('spark')}"/></svg>`;
}
function dtSummaryBody(text){
  const all = String(text || '').trim();
  const parts = all.split(/(?<=[.!?。])\s+/);
  const head = parts[0] || all, rest = parts.slice(1).join(' ');
  return `<button type="button" class="dtsum-head" data-dtsum-toggle aria-expanded="false"><span class="dtsum-line">${esc(head)}</span>${icon('chevron')}</button>${rest ? `<p class="dtsum-rest">${esc(rest)}</p>` : ''}`;
}
function dtAiSummaryBody(item){
  const title=String(item.title||'저장한 콘텐츠').trim(), body=String(item.desc||'').trim();
  const keywords=[...(Array.isArray(item.keywords)?item.keywords:[]),item.category]
    .filter(value=>typeof value==='string').map(value=>value.normalize('NFKC').trim().replace(/\s+/g,' '))
    .filter(value=>value.length>=2&&value.length<=24&&!['분류보류','기타','미분류'].includes(value));
  const stopwords=new Set(['여러','보며','깨달','깨달은','숨겨진','대한','관련','소개','이야기','게시물','콘텐츠','컨텐츠','모음','정리','영상','사진','다양한','그리고','때문에','있어요','합니다']);
  const words=text=>(text.match(/[\p{L}\p{N}]{2,}/gu)||[])
    .map(word=>word.replace(/(?:에서|으로|에게|까지|부터|처럼|보다|들을|들이|을|를|은|는|이|가|의|에|와|과|도)$/u,''))
    .filter(word=>word.length>=2&&word.length<=24&&!stopwords.has(word));
  const tags=[...new Set([...keywords,...words(title).slice(0,2)])].slice(0,5);
  const kind={place:'장소',event:'행사',mixed:'장소·행사'}[item.contentKind]||'게시물';
  for(const word of [...words(body),item.type,item.source,kind,'저장 콘텐츠']){
    if(tags.length>=2)break;
    const value=typeof word==='string'?word.trim():'';
    if(value.length>=2&&value.length<=24&&!['기타','분류보류'].includes(value)&&!tags.includes(value))tags.push(value);
  }
  return `<strong class="dtai-keyline" title="${esc(title)}">${esc(title)}</strong><p class="dtai-body t-shimmer" data-text="${esc(body)}">${esc(body)}</p><div class="dtai-tags" aria-label="콘텐츠 키워드">${tags.map(tag=>`<span class="dtai-tag">${esc(tag)}</span>`).join('')}</div>`;
}
function dtFitSummaries(){
  document.querySelectorAll('[data-dtsum]:not([data-fit])').forEach(box => {
    box.dataset.fit = '1';
    const line = box.querySelector('.dtsum-line');
    const more = box.querySelector('.dtsum-rest') || (line && line.scrollWidth > line.clientWidth + 1);
    if (!more) { box.classList.add('is-single'); const b = box.querySelector('[data-dtsum-toggle]'); b?.setAttribute('tabindex', '-1'); b?.removeAttribute('aria-expanded'); }
  });
}
new MutationObserver(() => { if (document.querySelector('[data-dtsum]:not([data-fit])')) requestAnimationFrame(dtFitSummaries); if(dtAiTooltipButton&&!dtAiTooltipButton.isConnected)dtAiInfoHide(); }).observe(document.body, {childList:true, subtree:true});
const dtAiInfoText='저장한 콘텐츠를 바탕으로 AI가 작성한 요약이에요. 중요한 정보는 원본에서 확인해 주세요.';
let dtAiTooltip=null,dtAiTooltipButton=null,dtAiTooltipPinned=false;
function dtAiInfoHide(){
  dtAiTooltipButton?.removeAttribute('aria-describedby');
  dtAiTooltip?.remove();
  dtAiTooltip=null;dtAiTooltipButton=null;dtAiTooltipPinned=false;
}
function dtAiInfoShow(button,pinned=false){
  if(dtAiTooltipButton===button&&dtAiTooltip){dtAiTooltipPinned ||= pinned;return;}
  dtAiInfoHide();
  const tip=document.createElement('div');
  tip.id='dtai-info-tooltip';tip.className='dtai-info-tooltip';tip.setAttribute('role','tooltip');tip.textContent=dtAiInfoText;
  document.body.append(tip);
  dtAiTooltip=tip;dtAiTooltipButton=button;dtAiTooltipPinned=pinned;
  button.setAttribute('aria-describedby',tip.id);
  const rect=button.getBoundingClientRect(),width=tip.offsetWidth,height=tip.offsetHeight;
  const center=rect.left+rect.width/2;
  const left=Math.max(width/2+12,Math.min(innerWidth-width/2-12,center));
  const below=rect.top-height-10<8;
  tip.classList.toggle('is-below',below);
  tip.style.left=`${left}px`;tip.style.top=`${below?rect.bottom+10:rect.top-10}px`;
  tip.style.setProperty('--dtai-arrow-left',`${Math.max(16,Math.min(width-16,center-left+width/2))}px`);
}
document.addEventListener('pointerover',event=>{const button=event.target.closest?.('[data-dtai-info]');if(button&&event.pointerType!=='touch')dtAiInfoShow(button);});
document.addEventListener('pointerout',event=>{const button=event.target.closest?.('[data-dtai-info]');if(button&&!button.contains(event.relatedTarget)&&!dtAiTooltipPinned)dtAiInfoHide();});
document.addEventListener('focusin',event=>{const button=event.target.closest?.('[data-dtai-info]');if(button)dtAiInfoShow(button);});
document.addEventListener('focusout',event=>{const button=event.target.closest?.('[data-dtai-info]');if(button&&!dtAiTooltipPinned)dtAiInfoHide();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&dtAiTooltip)dtAiInfoHide();});
window.addEventListener('scroll',dtAiInfoHide,true);
window.addEventListener('resize',dtAiInfoHide);
document.addEventListener('click', event => {
  const info=event.target.closest('[data-dtai-info]');
  if(info){if(dtAiTooltipButton===info&&dtAiTooltipPinned)dtAiInfoHide();else dtAiInfoShow(info,true);return;}
  if(dtAiTooltip)dtAiInfoHide();
  const toggle = event.target.closest('[data-dtsum-toggle]'); if (!toggle) return;
  const box = toggle.closest('[data-dtsum]'); if (!box || box.classList.contains('is-single')) return;
  const open = !box.classList.contains('is-open'); box.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open));
});
