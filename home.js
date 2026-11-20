// 홈 화면 (레이아웃 개편) · calendar.js 다음, navlabels.js 앞에 불러와요
// 구성: 마감 임박 띠배너(맨 위 고정) → 내 동네 · 알림 → 관심 키워드 → 메인 추천 카드 → 캘린더 위젯 → 작은 위젯 · 최근 저장

/* ---------- 홈 관심 키워드 추가 (온보딩 선택지에는 나오지 않아요) ---------- */
interestOptions.push(
  {id:'cafe', emoji:'☕', label:'카페 갈 때', short:'카페', extra:true},
  {id:'exhibit', emoji:'🖼', label:'전시/팝업 볼 때', short:'전시/팝업', extra:true},
  {id:'recipe', emoji:'🍳', label:'레시피 볼 때', short:'레시피', extra:true},
  {id:'tips', emoji:'🏠', label:'생활 정보 찾을 때', short:'생활 정보', extra:true},
  {id:'weekend', emoji:'🌳', label:'주말 나들이', short:'주말 나들이', extra:true},
  {id:'due', emoji:'⏰', label:'마감 전에 볼 것', short:'마감 임박', extra:true}
);
const listOf = f => () => ({list: items.filter(x => !x.pending && f(x))});
Object.assign(homeSections, {
  cafe: listOf(x => x.type === '맛집/카페' && /카페|디저트/.test(x.category || '')),
  exhibit: listOf(x => x.type === '전시/팝업'),
  recipe: listOf(x => x.type === '레시피'),
  tips: listOf(x => x.type === '생활 정보'),
  weekend: listOf(x => x.collection === '이번 주말 성수'),
  due: listOf(x => x.deadline)
});

/* ---------- 마감 임박 띠배너: 맨 위 고정 · 자동 롤링 · 오늘 다시 보지 않기 ---------- */
// 개발 단계라 저장하지 않아요: 새로고침하면 다시 뜨고, 앱 안에서 다른 화면에 갔다 와도 숨긴 상태가 유지돼요
let stripHidden = false;
const stripHiddenToday = () => stripHidden;
const dLabel = x => x.eventCandidate ? '확인 필요' : calDays(x) === 0 ? 'D-day' : 'D-' + calDays(x);
function stripBar(){
  const due = calDueList().filter(x => calDue(x) >= calToday && calDays(x) <= 14);
  if (!due.length || stripHiddenToday()) return '';
  const item = x => `<button class="strip-item ${calDays(x) <= 3 ? 'soon' : ''}" data-detail="${x.id}"><b>${dLabel(x)}</b><span>${esc(x.title)}</span></button>`;
  // 끝에서 처음으로 자연스럽게 이어지도록 첫 항목을 한 번 더 붙여요
  return `<div class="strip" role="region" aria-label="마감 임박 콘텐츠"><div class="strip-roll"><div class="strip-track" data-n="${due.length}">${due.map(item).join('')}${due.length > 1 ? item(due[0]) : ''}</div></div><button class="strip-hide" data-action="striphide">오늘 다시 보지 않기</button></div>`;
}
let stripIdx = 0;
setInterval(() => {
  const t = document.querySelector('.strip-track'); if (!t) return;
  const n = Number(t.dataset.n); if (n < 2) return;
  stripIdx++;
  t.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)';
  t.style.transform = `translateY(${-stripIdx * 100 / (n + 1)}%)`;
  if (stripIdx === n) setTimeout(() => { stripIdx = 0; t.style.transition = 'none'; t.style.transform = 'translateY(0)'; }, 480);
}, 3000);
actions.striphide = () => {
  stripHidden = true;
  const y = window.scrollY; render(); window.scrollTo(0, y);
  toast('오늘은 마감 임박 배너를 보지 않아요.'); $('#snackbar').classList.add('oneline');
};

/* ---------- 메인 추천 카드 (크게 · 좌우로 넘기기) ---------- */
// 고른 관심사를 우선하고, 선택하지 않았다면 최근 저장 순서를 유지해요.
function homePicks(){
  const ready = items;
  const photoFirst = (a,b) => (libPhoto(b)?1:0) - (libPhoto(a)?1:0);
  // Every saved post remains visible even if its map position needs review.
  if (!preferences.length) {
    return ready.slice(0,8).map(x => ({x,id:null}));
  }
  const seen = new Set(), lists = preferences.map(id => ({id, list: homeSections[id]().list.filter(x => !x.pending).sort(photoFirst)})), picks = [];
  // 관심사를 번갈아 하나씩 꺼내 고르게 섞어요
  for (let round = 0; picks.length < 8 && lists.some(l => l.list.length > round); round++)
    lists.forEach(({id, list}) => { const x = list[round]; if (x && !seen.has(x.id) && picks.length < 8) { seen.add(x.id); picks.push({x, id}); } });
  // 관심사 콘텐츠가 3개보다 적으면 다른 저장 콘텐츠로 조금 채워요
  if (picks.length < 3) ready.filter(x => !seen.has(x.id)).sort(photoFirst).slice(0, 3 - picks.length).forEach(x => picks.push({x, id:null}));
  return picks;
}
function pickCard({x, id}, i, total = 1){
  // 관심사 이름을 보여주고, '기타(나중에 보기)'나 최근 저장 순서이면 콘텐츠별 키워드를 보여줘요.
  const tag = id && id !== 'later' ? interestOf(id).short : (x.category || shortType(x.type));
  const desc = (x.desc || '').trim().replace(/[.。]+$/, '');
  return `<button class="pick" data-detail="${x.id}" data-i="${i}">
    <span class="pickimg">${libThumb(x)}</span>
    <span class="pickword" aria-hidden="true">${esc(tag)}</span>
    <span class="picktext"><b>${esc(x.title)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
    ${total > 1 ? `<span class="pickdots" aria-hidden="true">${Array.from({length:total}, (_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>` : ''}
  </button>`;
}

// Reuse the banner's existing cards and content slots without inventing content.
function emptyPickCards(){
  return Array.from({length:3},()=>`<div class="pick pick-placeholder" aria-hidden="true">
    <span class="pickimg"></span><span class="pickword"><i></i></span>
    <span class="picktext"><b><i></i></b><small><i></i></small></span>
    <span class="pickdots"><i></i><i></i><i></i></span>
  </div>`).join('');
}

/* ---------- 캘린더 위젯: 선택한 날짜의 일정만 표시 ---------- */
function calWidget(){
  const selected = calSelDate();
  const weekStart = new Date(selected); weekStart.setDate(selected.getDate() - selected.getDay());
  const days = Array.from({length:7},(_,i)=>{const day=new Date(weekStart);day.setDate(weekStart.getDate()+i);return day;});
  const due = calDueList().filter(x => calKey(calDue(x)) === calSel);
  return `<section class="hwidget calw">
    <div class="hwhead"><h2>${calToday.getMonth()+1}월 일정</h2><button type="button" class="calgo" data-action="gocal" aria-label="캘린더 전체보기">전체보기${icon('chevright')}</button></div>
    <div class="calw-days" role="group" aria-label="날짜 선택">${days.map(day=>`<button type="button" data-calday="${calKey(day)}" aria-pressed="${calKey(day)===calSel}" aria-label="${day.getMonth()+1}월 ${day.getDate()}일"><span>${['일','월','화','수','목','금','토'][day.getDay()]}</span><b>${day.getDate()}</b></button>`).join('')}</div>
    ${due.length ? `<div class="calnext">${due.map(x => `<button class="cnrow" data-detail="${x.id}"><span class="cncontent"><span class="cntext">${esc(x.title)}</span></span><span class="cnbadge ${calDays(x) <= 3 ? 'soon' : ''}">${dLabel(x)}</span></button>`).join('')}</div>` : '<p class="hint calnone">이 날짜에 등록된 일정이 없어요.</p>'}
  </section>`;
}

/* ---------- 작은 위젯 · 최근 저장 ---------- */
// 관심 키워드에서 켠 것들의 콘텐츠를 모아 보여줘요 (아무것도 안 켰으면 최근 저장)
const rcard = x => `<button class="rcard" data-detail="${x.id}"><span class="rcimg">${libThumb(x)}</span><b>${esc(x.title)}</b><small>${esc(savedAgo(x))} 저장</small></button>`;
function subWidgets(){
  const list = items.slice(0, 12);
  return `<section class="recentw">
      <h2 class="rwtitle">최근 저장한 목록</h2>
      ${list.length ? `<div class="recentrow">${list.map(rcard).join('')}</div>` : '<p class="muted rwempty">아직 저장한 콘텐츠가 없어요.</p>'}
    </section>`;
}

/* ---------- 키워드 카테고리 페이지: 칩을 누르면 바로 이동 ---------- */
let topicId = null;
pageName.topic = '카테고리';
pages.topic = function(){
  const o = interestOf(topicId), list = (homeSections[topicId]?.().list) || [];
  return `<div class="subhead topichead"><button class="subback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button><h1>${esc(o.short || o.label)}</h1><span class="hint">${list.length}개</span></div>
    ${list.length ? `<div class="libgrid">${list.map(x => libCard(x, false)).join('')}</div>` : `<div class="empty"><p class="muted">이 카테고리로 저장한 콘텐츠가 아직 없어요.</p></div>`}`;
};
// 홈 칩은 켜고 끄지 않고 카테고리 페이지로 (pinmap.js의 켜기/끄기보다 먼저 받아요)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-homeint]'); if (!b) return;
  e.stopImmediatePropagation(); topicId = b.dataset.homeint; go('topic');
}, true);

/* ---------- 저장된 카테고리만 표시 ---------- */
function savedHomeCategories(){
  const saved = new Set(items.map(folderOf));
  return CF_ALL.filter(category => saved.has(category.id));
}
function homeCategoryChips(){
  const categories = savedHomeCategories();
  if (!categories.length) return '';
  return `<div class="chiprows homecategories" role="group" aria-label="저장한 카테고리 바로가기">${categories.map(category => `<button class="prefchip" data-homecategory="${esc(category.id)}">${icon(category.icon)} ${esc(category.id)}</button>`).join('')}</div>`;
}
function layoutHomeCategories(){
  const host = document.querySelector('.homecategories');
  if (!host) return;
  const width = [...host.children].reduce((sum, chip) => sum + chip.getBoundingClientRect().width, 0) + Math.max(0, host.children.length - 1) * 8;
  host.classList.toggle('two-rows', width > host.clientWidth + 1);
}
window.addEventListener('resize', layoutHomeCategories);
document.addEventListener('click', e => {
  const button = e.target.closest('[data-homecategory]'); if (!button) return;
  query = ''; collection = null; filter = button.dataset.homecategory;
  backHome = true; page = 'library'; detailId = null; cfChipScroll = 0;
  render(); window.scrollTo(0, 0);
});

/* ---------- 홈 ---------- */
pages.home = function(){
  const chips = homeCategoryChips();
  const picks = homePicks();
  const accountError = PM_ENV.requiresAuth && !items.length && window.PinmapAccountLoadError;
  const emptyHome = PM_ENV.development && !items.length && !accountError;
  const main = accountError
    ? '<div class="empty small" role="status"><p class="muted">저장한 콘텐츠를 불러오지 못했어요.</p><button class="tonal" data-action="accountretry">다시 불러오기</button></div>'
    : picks.length || emptyHome
    ? `<div class="mainwrap"><div class="mainpick" ${picks.length?'role="group" aria-label="추천 저장 콘텐츠"':'data-placeholder="true" aria-hidden="true"'}>${picks.length?picks.map((p, i) => pickCard(p, i, picks.length)).join(''):emptyPickCards()}</div>${emptyHome ? `<section class="home-first-save" aria-label="첫 콘텐츠 추가"><h2>첫 콘텐츠를 저장해 볼까요?</h2><p>다시 보고 싶은 콘텐츠를 모아 보세요.</p><button type="button" class="home-share-help" data-action="sharehelp">공유로 저장하는 방법</button></section>` : ''}</div>`
    : `<div class="empty small"><p class="muted">선택한 관심사에 맞는 저장 콘텐츠가 아직 없어요.</p></div>`;
  const brand = '<div class="homebrand" aria-label="Pinmap"><img class="homebrand-symbol" src="img/pinmap-symbol-splash.svg" alt=""><span class="homebrand-name" aria-hidden="true">Pinmap</span></div>';
  const addButton = `<div class="home-add-menu" id="home-add-menu" data-open="false"><div class="home-add-body" aria-hidden="true"></div><button type="button" class="home-add-fab" data-action="addoptions" aria-label="콘텐츠 추가하기" aria-expanded="false" aria-controls="home-add-options">${icon('plus')}<span>추가</span></button><div class="home-add-options" id="home-add-options" role="group" aria-label="콘텐츠 추가 방법" aria-hidden="true" inert><button type="button" data-action="zipimport">${icon('folder')}<span>Instagram ZIP 가져오기</span></button><button type="button" data-action="linkimport">${icon('link')}<span>게시물 링크로 저장</span></button></div></div>`;
  return stripBar() + brand + main + (accountError ? '' : emptyHome ? `<div class="home-empty-calendar" inert aria-hidden="true">${calWidget()}</div>` : calWidget()) + chips + (emptyHome || accountError ? '' : subWidgets()) + addButton;
};

// Android 공유 안내: 실제 설치나 공유 수신이 연결된 것으로 표시하지 않아요.
actions.sharehelp = () => modal('공유로 저장하기', `<div class="home-share-guide">
  <p>안드로이드에서는 별도의 단축어가 필요 없어요.</p>
  <ol><li><b>저장할 콘텐츠에서 공유 누르기</b><span>인스타그램/유튜브 등에서 공유 메뉴를 열어요.</span></li><li><b>공유할 앱에서 핀맵 선택하기</b><span>공유받기 기능이 연결된 핀맵 앱을 설치한 뒤 사용할 수 있어요.</span></li><li><b>핀맵에서 내용 확인 후 저장하기</b><span>카테고리와 메모를 확인해 저장해요.</span></li></ol>
  <p class="home-share-note">현재 웹 미리보기는 앱 설치/공유받기가 연결되지 않았어요. 링크를 복사해 추가창에 붙여넣어 주세요.</p>
  <button type="button" data-action="save">링크 직접 추가하기</button>
</div>`);

/* 캘린더 위젯의 날짜를 누르면 그 날짜가 선택된 캘린더로 */
document.addEventListener('click', e => { const d = e.target.closest('[data-calday]'); if (d && page === 'home') { calSel = d.dataset.calday; const date = calSelDate(); calMonth = new Date(date.getFullYear(),date.getMonth(),1); const y = window.scrollY; render(); window.scrollTo(0,y); } });

/* 홈의 캘린더 위젯 · 전체 보기로 들어간 화면: 왼쪽 위 ← 버튼으로 홈으로 */
let backHome = false;
actions.gocal = () => { backHome = true; go('calendar'); };
actions.golib = () => { backHome = true; go('library'); };
actions.backhome = () => { backHome = false; go('home'); };
document.addEventListener('click', e => { if (e.target.closest('.bottomnav [data-page], .rail [data-page]')) backHome = false; }, true);
const backBtn = () => backHome ? `<button class="subback pageback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '';
for (const p of ['calendar', 'library']) { const base = pages[p]; pages[p] = function(){ return backBtn() + base(); }; }

/* ---------- 메인 카드 캐러셀 ----------
   브라우저 스크롤 대신 위치값(pickPos) 하나로 카드 배치를 계산해요.
   · 끌면 손가락을 그대로 따라오고, 놓으면 0.5초 동안 부드럽게 제자리로
   · 처음과 끝이 이어져(무한 반복) 양옆 카드가 항상 보여요
   · 화면을 다시 그려도 보던 카드 그대로, 혼자 움직이지 않아요 */
let pickPos = 0, pickAnim = null, pickDrag = null, pickJustDragged = false;
const PICK = {scale:0.84, peek:38, dur:520}; // 10/19: 옆 카드 작게 · 가운데 카드 뒤에서 조금만 보이게
const pickTrack = () => document.querySelector('.mainpick');
const pickCount = () => pickTrack()?.children.length || 0;
const wrapIdx = (i, n) => ((Math.round(i) % n) + n) % n;
function pickOffset(i, pos, n){ // 카드 i가 가운데에서 몇 칸 떨어져 있는지 (-n/2 ~ n/2)
  let d = i - pos;
  if (n >= 3) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
  return d;
}
function layoutPicks(){
  const track = pickTrack(); if (!track) return;
  const cs = [...track.children], n = cs.length; if (!n) return;
  const w = cs[0].offsetWidth, half = track.clientWidth / 2;
  // 옆 카드(1칸)는 바깥쪽 끝이 peek만큼 보이도록, 2칸째는 그 뒤로 숨어요
  // 옆 카드 바깥쪽 끝 = 가운데 카드 끝 + peek (화면 가장자리에 여백이 남아요)
  const x1 = Math.min(w / 2 + PICK.peek - w * PICK.scale / 2, half - w * PICK.scale / 2);
  cs.forEach((c, i) => {
    const d = pickOffset(i, pickPos, n), a = Math.abs(d), sg = Math.sign(d);
    const k = Math.min(a, 1), sc = 1 - k * (1 - PICK.scale);
    const x = a <= 1 ? d * x1 : sg * (x1 + (a - 1) * x1 * 0.35);
    c.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${sc.toFixed(4)})`;
    // 보조 카드는 흐리고 어둡게 두어 가운데 카드를 강조해요.
    c.style.opacity = a <= 1 ? String((1 - k * 0.18).toFixed(3)) : String(Math.max(0, 0.82 - (a - 1) * 1.6));
    c.style.filter = k > 0.01 ? `brightness(${(1 - k * 0.30).toFixed(3)}) blur(${(k * 2).toFixed(2)}px)` : '';
    c.style.zIndex = String(100 - Math.round(a * 10));
    c.style.visibility = a > 1.7 ? 'hidden' : '';
    c.setAttribute('aria-hidden', a > 0.5 ? 'true' : 'false'); c.tabIndex = track.dataset.placeholder==='true' || a > 0.5 ? -1 : 0;
  });
}
const easeOut = t => 1 - Math.pow(1 - t, 3);
function animatePick(to){
  cancelAnimationFrame(pickAnim);
  const from = pickPos, t0 = performance.now(), dist = Math.abs(to - from);
  if (dist < 0.001) { pickPos = to; layoutPicks(); return; }
  const dur = PICK.dur * Math.min(1, 0.55 + dist * 0.45);
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    pickPos = from + (to - from) * easeOut(t); layoutPicks();
    if (t < 1) pickAnim = requestAnimationFrame(step);
    else { const n = pickCount(); pickPos = n >= 3 ? wrapIdx(to, n) : to; layoutPicks(); pickAnim = null; }
  };
  pickAnim = requestAnimationFrame(step);
}
function goPick(target){ // target: 이동할 위치 (현재 위치 기준 가까운 쪽으로)
  const n = pickCount(); if (!n) return;
  const to = n >= 3 ? target : Math.max(0, Math.min(n - 1, target));
  animatePick(to);
}
const renderBeforeHome = render;
render = function(){ cancelAnimationFrame(pickAnim); pickAnim = null; renderBeforeHome(); layoutHomeCategories(); const n = pickCount(); if (n) { pickPos = n >= 3 ? wrapIdx(pickPos, n) : Math.max(0, Math.min(n - 1, Math.round(pickPos))); } layoutPicks(); };
window.addEventListener('resize', layoutPicks);

// 끌어서 넘기기 (터치 · 마우스 공통). 세로로 움직이면 화면 스크롤에 양보해요
document.addEventListener('pointerdown', e => {
  const track = e.target.closest('.mainpick'); if (!track || track.dataset.placeholder==='true' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  cancelAnimationFrame(pickAnim); pickAnim = null;
  pickDrag = {id:e.pointerId, x:e.clientX, y:e.clientY, pos:pickPos, mode:null, track, w:track.children[0]?.offsetWidth || 300, hist:[[performance.now(), e.clientX]]};
});
document.addEventListener('pointermove', e => {
  const d = pickDrag; if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!d.mode) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    d.mode = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (d.mode === 'y') { pickDrag = null; goPick(Math.round(pickPos)); return; }
    try { d.track.setPointerCapture(e.pointerId); } catch {}
    d.track.classList.add('dragging');
  }
  e.preventDefault();
  const n = pickCount(); let pos = d.pos - dx / (d.w * 0.85);
  if (n < 3) { const lo = 0, hi = n - 1; if (pos < lo) pos = lo - (lo - pos) * 0.3; if (pos > hi) pos = hi + (pos - hi) * 0.3; } // 끝에서는 살짝만 늘어나요
  pickPos = pos; layoutPicks();
  d.hist.push([performance.now(), e.clientX]); if (d.hist.length > 6) d.hist.shift();
}, {passive:false});
function endPickDrag(e){
  const d = pickDrag; if (!d || e.pointerId !== d.id) return;
  pickDrag = null;
  if (d.mode !== 'x') return;
  d.track.classList.remove('dragging');
  pickJustDragged = true; setTimeout(() => { pickJustDragged = false; }, 60);
  const [t0, x0] = d.hist[0], v = (e.clientX - x0) / Math.max(1, performance.now() - t0); // px/ms
  const moved = d.pos - pickPos; // +면 다음 카드 쪽
  let target = Math.round(pickPos);
  if (Math.abs(v) > 0.35) target = Math.round(d.pos) + (v < 0 ? 1 : -1);        // 빠르게 튕기면 한 칸
  else if (Math.abs(moved) > 0.18) target = Math.round(d.pos) + (moved < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(moved))); // 조금만 끌어도 한 칸
  goPick(target);
}
document.addEventListener('pointerup', endPickDrag);
document.addEventListener('pointercancel', endPickDrag);
// 트랙패드 · 마우스 가로 휠
let wheelAcc = 0, wheelLock = 0;
document.addEventListener('wheel', e => {
  const track=e.target.closest?.('.mainpick');
  if (!track || track.dataset.placeholder==='true' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  e.preventDefault();
  if (performance.now() < wheelLock) return;
  wheelAcc += e.deltaX;
  if (Math.abs(wheelAcc) > 40) { goPick(Math.round(pickPos) + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; wheelLock = performance.now() + 450; }
}, {passive:false});
// 누르기: 가운데 카드는 상세, 옆 카드는 그 카드로 이동
document.addEventListener('click', e => {
  const card = e.target.closest('.mainpick .pick'); if (!card || card.classList.contains('pick-placeholder')) return;
  if (pickJustDragged) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  const n = pickCount(), i = Number(card.dataset.i), d = pickOffset(i, pickPos, n);
  if (Math.abs(d) > 0.5) { e.preventDefault(); e.stopImmediatePropagation(); goPick(Math.round(pickPos) + Math.round(d)); }
}, true);
document.addEventListener('dragstart', e => { if (e.target.closest?.('.mainpick')) e.preventDefault(); });
document.addEventListener('keydown', e => {
  const track=e.target.closest?.('.mainpick');
  if (!track || track.dataset.placeholder==='true' || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
  e.preventDefault(); goPick(Math.round(pickPos) + (e.key === 'ArrowRight' ? 1 : -1));
  setTimeout(() => pickTrack()?.querySelector('.pick[tabindex="0"]')?.focus(), PICK.dur);
});

/* ---------- 알림: 오른쪽에서 밀려 들어오는 전체 화면 ----------
   noti.js의 목록 · 읽음 처리는 그대로 쓰고, 아래 시트 대신 전체 화면으로 보여줘요 (왼쪽 위 ← 로 닫기) */
const NOTI_KINDS = [['due', '마감 임박'], ['place', '장소'], ['info', '정보']];
const notiKind = n => n.id.startsWith('due') ? 'due' : (n.id === 'near' || n.id === 'pending') ? 'place' : 'info';
function notiPanelHtml(){
  const list = notifications(), isNew = n => !settings.readNoti.includes(n.id);
  const fresh = list.filter(isNew), seen = list.filter(n => !isNew(n));
  const allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  const row = n => { const x = notiItem(n), unread = isNew(n);
    return `<button type="button" class="ntrow ${unread ? 'unread' : ''}" data-noti="${esc(n.id)}" aria-label="${esc(n.title)}${unread ? ', 안 읽음' : ''}">
      <span class="ntthumb">${x ? libThumb(x) : `<span class="ntemoji">${icon(notiBadge(n))}</span>`}</span>
      <span class="nttext"><b>${esc(n.title)}</b><span class="nttime">${esc(n.time)}</span><span class="ntbody">${esc(n.body)}</span></span>
      ${unread ? '<i class="ntdot" aria-hidden="true"></i>' : ''}</button>`; };
  const group = (label, arr) => arr.length ? `<section class="ntgroup"><h3>${label}</h3>${arr.map(row).join('')}</section>` : '';
  // 2026-11-04: 카테고리(마감 임박, 장소, 정보)별로 묶고, 묶음 안에서는 안 읽은 알림을 먼저 보여줘요
  const byKind = k => [...fresh, ...seen].filter(n => notiKind(n) === k);
  const body = list.length ? NOTI_KINDS.map(([k, label]) => group(label, byKind(k))).join('')
    : `<div class="ntempty">${icon('bell')}<b>${allOff ? '알림이 모두 꺼져 있어요' : '새 알림이 없어요'}</b><p>${allOff ? '알림 설정에서 필요한 알림을 켤 수 있어요.' : '마감 임박, 주변 장소 소식이 생기면 알려드릴게요.'}</p></div>`;
  return `<div class="npwrap">
    <header class="nphead"><button type="button" class="subback npback" data-action="notiback" aria-label="뒤로 가기">${icon('back')}</button><h1>알림${fresh.length ? ` <span>${fresh.length}</span>` : ''}</h1>
      ${fresh.length ? '<button type="button" class="npread" data-action="readall">모두 읽음</button>' : ''}</header>
    <div class="ntlist nplist">${body}</div>
  </div>`;
}
function closeNotiPanel(instant){
  const el = document.getElementById('notipanel'); if (!el) return;
  document.body.classList.remove('notipanel-open');
  if (instant) { el.remove(); return; }
  el.classList.remove('in'); setTimeout(() => el.remove(), 320);
}
notiSheet = function(){
  if ($('#sheet').open) $('#sheet').close();
  let el = document.getElementById('notipanel');
  if (el) { el.innerHTML = notiPanelHtml(); return; } // 열려 있으면 내용만 새로 그려요 (모두 읽음 등)
  el = document.createElement('section');
  el.id = 'notipanel'; el.className = 'ntsheet'; // 알림 시트(detail.css)의 목록 모양을 그대로 써요 el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '알림');
  el.innerHTML = notiPanelHtml(); document.body.append(el);
  document.body.classList.add('notipanel-open');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(() => el.querySelector('.npback')?.focus(), 50);
};
actions.noti = notiSheet;
actions.notiback = () => closeNotiPanel();
const notiSettingsBase = actions.notisettings;
actions.notisettings = () => { closeNotiPanel(true); notiSettingsBase(); };
// 알림을 누르면 패널을 닫고 해당 화면으로 (이동은 my.js에서 처리)
document.addEventListener('click', e => { if (e.target.closest('#notipanel [data-noti]')) closeNotiPanel(true); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('notipanel')) closeNotiPanel(); });
