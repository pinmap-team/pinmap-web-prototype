// 콘텐츠 상세 화면 리디자인 (레퍼런스 시안 반영)
// 기존 기능(돌아가기 · 길찾기 · 원본 보기 · 분류·메모·장소 수정 · 장소 확인 필요 · 원본 삭제 · 모음 이동)은 그대로 쓰고 화면 모양만 바꿉니다.
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

detail = function(){
  const x = items.find(i => i.id === detailId);
  if (!x) { detailId = null; return pages[page](); }
  const t = typeOf(x.type), ready = t.place && x.address && !x.pending;
  const app = MAP_APPS[settings.mapApp] || MAP_APPS.naver;
  const mapHref = ready ? app.url(encodeURIComponent(x.mapQuery || x.address)) : '';
  const src = x.source || 'SNS';

  // 유형별 정보
  let info = '';
  if (x.period) info += `<section class="dtsec"><h2>운영 기간</h2><div class="dtrow">${icon('calendar')}<span>${esc(x.period)}</span>${x.deadline ? `<b class="dtdue">마감 ${esc(x.deadline)}</b>` : ''}</div></section>`;
  const factRow = x.distance && ready ? `<div class="dtfacts"><span>${icon('walk')}${esc(x.distance)}</span></div>` : '';
  if (t.place) info += ready
    ? `<section class="dtsec"><h2>${x.type === '여행' ? '여행지 정보' : '장소 정보'}</h2><div class="dtaddress">${icon('pin')}<span>${esc(x.address)}</span><button type="button" class="dtcopy" data-action="dtcopyaddr" aria-label="주소 복사" title="주소 복사">${icon('copy')}</button></div><div class="dtmap-preview"><div id="detail-map-canvas" role="img" aria-label="${esc(x.title)} 저장 위치 지도"></div><p class="dtmap-fallback" id="detail-map-fallback" hidden>지도를 불러오지 못했어요. 지도에서 위치를 확인해 주세요.</p></div>${factRow}</section>`
    : `<section class="dtsec"><h2>장소 정보</h2><div class="dtwarn"><b>장소 확인 필요</b><p>위치를 확정하지 못했어요. 원본에서 주소를 확인해 입력하면 지도에 표시돼요.</p><button class="dtsmall" data-action="edit">장소 직접 입력</button></div></section>`;
  // 2026-11-10 가격을 크게(headline-md), 안내는 body-md. '예시 가격' → '참고 가격'
  if (x.type === '쇼핑') { const amount = String(x.price || '').replace(/,\s*(예시|참고) 가격$/, '').trim();
    info += `<section class="dtsec dtbuy"><h2>구매 정보</h2>${amount ? `<p class="dtprice"><span class="sr">참고 가격 </span>${esc(amount)}</p>` : '<p class="dtprice none">가격 정보 없음</p>'}<p class="dtpricehint">${x.shop ? `${esc(x.shop)}에서 본 참고 가격이에요.` : '판매처 정보가 없어요.'}<br>가격과 재고는 원본에서 한 번 더 확인해 주세요.</p></section>`; }
  if (x.type === '레시피') info += `<section class="dtsec"><h2>간단 정보</h2><div class="dtrow dtrecipe">${icon('clock')}<span>${esc(x.recipe || '정보 없음')}</span></div><p class="dthint">자세한 조리법은 원본 콘텐츠에서 확인해요.</p></section>`;
  if (x.deleted) info += `<section class="dtsec"><h2>원본 콘텐츠</h2><div class="dtgone"><b>삭제된 게시물이에요.</b><p>원본을 열 수 없지만 ${t.place ? '장소 정보와 ' : ''}내 메모는 그대로 남아 있어요.</p></div></section>`;

  // 아래 고정 버튼: 길찾기 · 원본 보기 (장소가 아니면 원본 보기만)
  const bottom = [];
  if (ready) bottom.push(`<a class="dtghost" href="${mapHref}" target="_blank" rel="noopener noreferrer">${icon('send')}길찾기</a>`);
  else if (t.place) bottom.push(`<button class="dtghost" data-action="edit">${icon('pin')}장소 입력</button>`);
  if (!x.deleted) bottom.push(`<button class="dtprimary" data-action="original">${icon('image')}원본 보기</button>`);
  else if (!ready) bottom.push(`<button class="dtprimary" data-action="edit">${icon('pen')}정보 수정</button>`);
  if (bottom.length === 1) bottom[0] = bottom[0].replace('class="dtghost"', 'class="dtprimary"');

  return `<article class="dt">
    <div class="dthero">${libThumb(x)}<div class="dtshade" aria-hidden="true"></div>
      <div class="dttop"><button class="dtbtn" data-action="back" aria-label="돌아가기">${icon('chevleft')}</button>
        <div class="dttopr">
          <button type="button" class="dtbtn dtfavorite${x.favorite?' is-active':''}" data-action="fav" aria-label="${esc(x.title)} 즐겨찾기" aria-pressed="${!!x.favorite}">${icon('star')}</button>
          <button class="dtbtn dtmorebtn" data-action="dtmore" aria-label="더보기" aria-haspopup="menu" aria-expanded="false" aria-controls="dtmenu">${icon('more')}</button>
          <div class="dtmenu" id="dtmenu" role="menu" aria-label="콘텐츠 메뉴" hidden>
            <button type="button" role="menuitem" data-action="dtshare">${icon('share')}공유</button>
            <button type="button" role="menuitem" data-action="edit">${icon('pen')}수정</button>
            <button type="button" role="menuitem" class="dtmenu-danger" data-unsave="${x.id}">${icon('trash')}삭제</button>
          </div>
        </div></div>
      <div class="dtsrc dthtitle">
        <span class="dthpill">${esc(x.category || shortType(x.type))}</span>
        <h1>${esc(x.title)}</h1>
        <small>${esc(src)}, ${esc(savedAgo(x))} 저장</small>
      </div>
    </div>
    <div class="dtsheet">
      ${x.desc ? `<section class="dtsum"><h2${x.source === '직접 추가' ? '' : ' class="dtai"'}>${icon('spark')}${esc(x.source === '직접 추가' ? '장소 설명' : 'AI 요약')}</h2><p>${esc(x.desc)}</p></section>` : ''}
      <section class="dtsec dtmemo"><div class="dtsechead"><h2>내 메모</h2></div><button type="button" class="dtmemobox" data-action="edit" aria-label="메모 수정"><span>${esc(x.memo || '아직 메모가 없어요. 눌러서 남겨 보세요.')}</span>${icon('chevron')}</button></section>
      ${info}
    </div>
    <div class="dtbar ${bottom.length === 1 ? 'one' : ''}">${bottom.join('')}</div>
  </article>`;
};

// 2026-11-10 상단 미트볼(⋯) 메뉴: 공유 · 수정 · 삭제
const dtMenuSet = open => {
  const btn = document.querySelector('.dtmorebtn'), menu = document.getElementById('dtmenu');
  if (!btn || !menu) return;
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

// 즐겨찾기 (별표) · 브라우저에 함께 저장돼요
actions.fav = () => {
  const x = items.find(i => i.id === detailId); if (!x) return;
  x.favorite = !x.favorite; afterChange();
  const y = scrollY; render(); scrollTo(0, y);
  toast(x.favorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 뺐어요.');
};

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
        <span class="esselect"><select name="folder" id="es-folder" aria-label="카테고리 및 폴더 선택">${CF_ALL.map(f=>`<option value="category:${esc(f.id)}" data-icon="${esc(f.icon)}" ${currentFolder==='category:'+f.id?'selected':''}>${esc(f.id)}</option>`).join('')}${cfCustom().length?`<optgroup label="내가 만든 폴더">${cfCustom().map(name=>`<option value="custom:${esc(name)}" data-icon="folder" ${currentFolder==='custom:'+name?'selected':''}>${esc(name)}</option>`).join('')}</optgroup>`:''}<option value="new:" data-icon="folderplus">새 폴더 만들기</option></select></span>
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
      <p class="eshint">카테고리를 직접 바꾸면 ‘직접 분류’로 표시돼요.</p>
    </div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">수정 완료</button></div>
  </form>`);
  $('#sheet').classList.add('editsheet');
  esCounts();
}
actions.edit = editSheet;
paths.star = 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z';
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
      const name=value.slice(9),type=['맛집','카페'].includes(name)?'맛집/카페':name;
      $('#es-type').value=type;
      $('#es-addrwrap').hidden=!typeOf(type).place;
    }
    return;
  }
  if (e.target.id !== 'es-type') return;
  const ai = e.target.value === 'ai', t = typeOf(e.target.value);
  const emoji = $('.esform .esemoji'); if(emoji)emoji.textContent = ai ? '✨' : t.emoji;
  const folderSelect = $('#es-folder');
  if(folderSelect){ const folder = t.id==='맛집/카페' ? '카페' : CF_FOLDERS.some(f=>f.id===t.id) ? t.id : '기타'; folderSelect.value='category:'+folder; }
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
  const colChip = (name, text) => `<button type="button" class="eschip ${name===''?'on':''}" data-escol="${esc(name)}" aria-pressed="${name===''}">${esc(text)}</button>`;
  modal('', `<form id="saveform" class="esform" novalidate>
    <div class="eshead"><span class="esicon" aria-hidden="true">${icon('plus')}</span><div><h2>새로 저장</h2><p>SNS 링크를 붙여넣으면 바로 저장돼요.</p></div><button type="button" class="esclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody">
      <button type="button" class="esshare" data-action="snsdemo"><span class="esshareicon" aria-hidden="true">${icon('share')}</span><div><b>SNS에서 공유로 저장하기</b><small>게시물에서 공유 → 핀맵, 저장 과정을 체험해요</small></div>${icon('arrow')}</button>
      <div class="esdivider"><span>또는 링크로 저장</span></div>
      <label class="esfield">${label('link','링크', `<button type="button" class="essample" data-action="sample">예시 링크로 채우기</button>`)}
        <span class="esinput withicon">${icon('link')}<input type="url" name="url" id="es-url" placeholder="https://" required inputmode="url"></span>
      </label>
      <label class="esfield">${label('text','제목')}
        <span class="esinput"><input name="title" id="es-title" placeholder="다시 찾기 쉬운 이름" required maxlength="50"><small class="escount" data-for="es-title"></small></span>
      </label>
      <label class="esfield">${label('grid','카테고리')}
        <span class="esselect"><span class="esemoji" aria-hidden="true">${settings.aiDefault ? '✨' : typeOf('기타').emoji}</span><select name="type" id="es-type"><option value="ai" ${settings.aiDefault?'selected':''}>AI 자동 분류</option>${TYPES.map(t => `<option value="${t.id}" ${!settings.aiDefault&&t.id==='기타'?'selected':''}>${t.id}</option>`).join('')}</select>${icon('chevron')}</span>
      </label>
      <div class="esfield">${label('folder','모음', '<small class="esopt">선택</small>')}
        <input type="hidden" name="collection" id="es-col" value="">
        <div class="eschips">${colChip('', '나중에 정리')}${collectionNames().map(c => colChip(c, c)).join('')}<button type="button" class="eschip add" data-esnew>${icon('plus')}새 모음</button></div>
        <input class="esnewcol" id="es-newcol" maxlength="30" placeholder="새 모음 이름 (예: 10월 데이트)" hidden>
      </div>
      <label class="esfield">${label('note','저장한 이유', '<small class="esopt">선택</small>')}
        <span class="esinput area"><textarea name="memo" id="es-memo" rows="2" maxlength="200" placeholder="어떤 순간에 다시 보고 싶나요?"></textarea></span><small class="escount" data-for="es-memo"></small>
      </label>
      <p class="eshint">이 브라우저에 저장돼요. AI 분류는 프로토타입용 간단한 규칙이에요.</p>
      <p class="eserror" id="saveerror" role="alert"></p>
    </div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">저장하기</button></div>
  </form>`);
  $('#sheet').classList.add('editsheet');
  esCounts();
}
actions.save = saveSheet;
// 예시 링크로 채우기: 기존 동작 후 화면(글자 수 · 카테고리 · 모음 칩)도 맞춰요
const fillSample = actions.sample;
actions.sample = () => {
  fillSample();
  esCounts(); $('#saveerror').textContent = '';
  $('#es-type')?.dispatchEvent(new Event('change',{bubbles:true}));
  const v = $('#es-col').value;
  document.querySelectorAll('[data-escol]').forEach(b => { const on = b.dataset.escol === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
};
// 제목 · 링크를 비워둔 채 저장하면 안내 (app.js는 링크 형식만 확인해요)
document.addEventListener('submit', e => {
  if (e.target.id !== 'saveform') return;
  const f = e.target, err = $('#saveerror');
  if (!f.url.value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); err.textContent = '저장할 콘텐츠 링크를 붙여넣어 주세요.'; f.url.focus(); return; }
  if (!f.elements.namedItem('title').value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); err.textContent = '제목을 입력해 주세요.'; f.elements.namedItem('title').focus(); }
}, true);
paths.link = paths.link || 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1';

// 상세에서 사진 아래까지 스크롤하면 상태 표시줄 띠를 켜요
addEventListener('scroll', () => {
  const hero = document.querySelector('.dthero');
  document.body.classList.toggle('dtscrolled', !!hero && hero.getBoundingClientRect().bottom < 120);
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
actions.dtcopyaddr = async () => {
  const x = items.find(i => i.id === detailId); if (!x?.address) return;
  toast(await dtCopy(x.address) ? '주소를 복사했어요.' : `주소: ${x.address}`);
};
// 지도 누르면 핀맵 지도 탭으로 이동해 이 장소를 선택해요
actions.dtgomap = () => {
  const x = items.find(i => i.id === detailId); if (!x) return;
  selectedPin = x.id; window.pmMapFocus = x.id; go('map');
};
