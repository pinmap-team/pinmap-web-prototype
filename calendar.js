// 마감 캘린더 (하단 메뉴 '캘린더' 탭)
// 마감이 있는 저장 콘텐츠를 달력에 표시하고, 날짜별 · 곧 마감되는 콘텐츠를 보여줘요.
// pinmap.js 다음에 불러와야 해요(브라우저에 저장된 데이터를 읽은 뒤 실행).

/* ---------- 캘린더 화면 ---------- */
pageName.calendar = '캘린더';

/* ---------- 마감이 적힌 콘텐츠만 캘린더에 ---------- */
// 전시 기간 · 지원 마감처럼 원본 콘텐츠에 마감이 적혀 있는 것만 표시해요.
// 예전 미리보기에서 임의로 붙였던 예시 마감은 지워요.
const CAL_OLD = [1, 2, 9, 10];
items.forEach(x => {
  if (!x.calPatched) return;
  if (CAL_OLD.includes(x.id)) { delete x.deadline; delete x.dueLabel; }
  delete x.calPatched;
});
const e4 = items.find(x => x.id === 4); if (e4 && !e4.dueLabel) e4.dueLabel = '전시 종료';
// 마감이 적힌 예시 콘텐츠 2개 (한 번만 추가 · 지우면 다시 생기지 않아요)
if (!PM_ENV.development && !settings.calSeeded) {
  const seeds = [
    {id:12,title:'2026 하반기 청년 디자인 장학생 모집',type:'생활 정보',category:'장학금',source:'Instagram',ago:'3일 전',desc:'학기당 200만 원을 지원하고, 포트폴리오를 제출해야 해요.',memo:'포트폴리오 PDF 미리 정리해두기',art:'tips',collection:'',deadline:'D-5',dueLabel:'지원 마감',aiClassified:true},
    {id:13,title:'성수 오브젝트 팝업 스토어',type:'전시/팝업',category:'팝업',source:'Instagram',ago:'1일 전',desc:'리빙 브랜드 12곳이 2주 동안 모이는 팝업이에요.',memo:'친구랑 주말에 같이 가보기',art:'exhibit',distance:'도보 8분',collection:'이번 주말 성수',address:'서울 성동구 성수동, 예시 팝업',period:'10.03 (토) – 10.21 (수), 예시 기간',deadline:'D-11',dueLabel:'팝업 종료',aiClassified:true}
  ];
  seeds.forEach(x => { if (!items.some(i => i.id === x.id)) items.push(x); });
  settings.calSeeded = true;
}
afterChange();

/* ---------- 날짜 계산 ---------- */
const calToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
const calKey = d => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
function calAbsoluteDate(value){
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
const calDays = x => x.eventDate
  ? Math.round((Date.UTC(calDue(x).getFullYear(),calDue(x).getMonth(),calDue(x).getDate())
    - Date.UTC(calToday.getFullYear(),calToday.getMonth(),calToday.getDate())) / 86400000)
  : Number(String(x.deadline || '').replace(/\D/g, '')); // 기존 예시의 'D-3' → 3
function calDue(x){ // 서버 일정은 명시된 절대 날짜, 기존 예시는 D-n
  if (x.eventDate) return calAbsoluteDate(x.eventDate);
  if (!x.deadline) return null;
  const d = new Date(calToday); d.setDate(d.getDate() + calDays(x)); return d;
}
function calEventEntries(item){
  if (!Array.isArray(item.events)) return [];
  return item.events.flatMap(event => {
    if (!event || typeof event !== 'object') return [];
    const start = calAbsoluteDate(event.start_date), end = calAbsoluteDate(event.end_date);
    if (!start && !end) return []; // 연도가 빠진 날짜는 캘린더의 확정 날짜로 만들지 않아요.
    const title = typeof event.title === 'string' && event.title.trim() ? event.title.trim() : item.title;
    const base = {id:item.id,title,art:item.art,photo:item.photo,desc:item.desc,
      contentKind:item.contentKind,eventCandidate:false,period:event.date_text || ''};
    if (start && end && start.getTime() === end.getTime())
      return [{...base,eventDate:event.start_date,dueLabel:'행사 일정'}];
    return [
      ...(start ? [{...base,eventDate:event.start_date,dueLabel:'행사 시작'}] : []),
      ...(end ? [{...base,eventDate:event.end_date,dueLabel:'행사 종료'}] : [])
    ];
  });
}
const calDueList = () => {
  const seenEvents = new Set();
  return items.flatMap(item => {
    const eventEntries = calEventEntries(item);
    return eventEntries.length ? eventEntries : calDue(item) ? [item] : [];
  }).filter(entry => {
    if (!entry.eventDate) return true;
    const title = String(entry.title || '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[^\p{L}\p{N}]/gu, '');
    const key = [entry.eventDate, entry.dueLabel || '', title].join('|');
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  }).sort((a,b) => calDue(a) - calDue(b));
};
let calPick = false; // 월 선택 패널 열림
let calMonth = new Date(calToday.getFullYear(), calToday.getMonth(), 1);
let calSel = calKey(calToday);
const calSelDate = () => { const [y, m, d] = calSel.split('-').map(Number); return new Date(y, m - 1, d); };
const calWeekdays = ['일','월','화','수','목','금','토'];
const calWeekFirstDay = () => settings.calendarWeekStart === 'monday' ? 1 : 0;
const calWeekOffset = date => (date.getDay() - calWeekFirstDay() + 7) % 7;
const calWeekStartDate = date => { const start = new Date(date); start.setDate(date.getDate() - calWeekOffset(date)); return start; };
const calWeekLabels = () => calWeekdays.map((_,index) => calWeekdays[(index + calWeekFirstDay()) % 7]);


/* ---------- 2026-11-24 카테고리별 기간 보기 ---------- */
// 위쪽 카테고리 버튼을 누르면 그 카테고리 콘텐츠의 시작일~마감일을 막대로 이어서 보여줘요. '전체'는 기존처럼 점 표시.
let calCat = '';
const calItemOf = entry => items.find(i => i.id === entry.id) || entry;
const calCatOf = entry => PinmapCategories.of(calItemOf(entry));
function calSavedDate(item){
  if (typeof item.savedAt === 'string' && Number.isFinite(Date.parse(item.savedAt))) { const d = new Date(item.savedAt); d.setHours(0,0,0,0); return d; }
  const ago = String(item.ago || ''), d = new Date(calToday);
  const n = Number((ago.match(/\d+/) || [0])[0]);
  if (/어제/.test(ago)) d.setDate(d.getDate() - 1);
  else if (/일 전/.test(ago)) d.setDate(d.getDate() - n);
  else if (/주 전/.test(ago)) d.setDate(d.getDate() - n * 7);
  else if (/달 전|개월 전/.test(ago)) d.setMonth(d.getMonth() - n);
  return d;
}
function calPeriodStart(item, end){ // '10.03 (토) – 10.21 (수)' 같은 기간 글에서 시작일
  const m = String(item.period || '').match(/(\d{1,2})\.(\d{1,2})[^\d]+(\d{1,2})\.(\d{1,2})/);
  if (!m || !end) return null;
  const start = new Date(end.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  if (start > end) start.setFullYear(start.getFullYear() - 1);
  return start;
}
function calRanges(){
  const ranges = [];
  items.forEach(item => {
    const events = Array.isArray(item.events) ? item.events : [];
    const evs = events.map(e => [calAbsoluteDate(e?.start_date), calAbsoluteDate(e?.end_date), e]).filter(([a,b]) => a || b);
    if (evs.length) {
      evs.forEach(([a,b,e]) => { const start = a || b, end = b || a; ranges.push({item, start, end, title:(typeof e.title==='string'&&e.title.trim())||item.title,
        entry:{...item, eventDate:(b?e.end_date:e.start_date), dueLabel:a&&b&&a.getTime()!==b.getTime()?'행사 종료':'행사 일정'}}); });
      return;
    }
    const end = calDue(item); if (!end) return;
    let start = calPeriodStart(item, end) || calSavedDate(item);
    if (start > end) start = new Date(end);
    ranges.push({item, start, end, title:item.title, entry:item});
  });
  return ranges.filter(r => PinmapCategories.of(r.item).id === calCat).sort((a,b) => a.start - b.start || b.end - a.end).map((r, i) => ({...r, tone: i % 4}));
}
function calCategoryButtons(){
  if (typeof PinmapCategories === 'undefined') return '';
  const ids = new Set(calDueList().map(e => calCatOf(e).id));
  const cats = PinmapCategories.all.filter(c => ids.has(c.id));
  if (!cats.length) return '';
  if (calCat && !ids.has(calCat)) calCat = '';
  const chip = (id, label, iconHtml) => `<button type="button" class="calcat${calCat === id ? ' on' : ''}" data-calcat="${id}" aria-pressed="${calCat === id}">${iconHtml}<span>${esc(label)}</span></button>`;
  return `<div class="calcats" role="group" aria-label="카테고리별 일정">${chip('', '전체', `<img class="pm-category-icon" src="img/category/all-${calCat === '' ? 'active' : 'inactive'}.svg" width="24" height="24" alt="" aria-hidden="true">`)}${cats.map(c => chip(c.id, c.label, PinmapCategories.icon(c.id, calCat === c.id))).join('')}</div>`;
}

function calRow(x){
  const d = calDue(x), n = calDays(x);
  const candidate = !!x.eventCandidate;
  const badge = candidate ? '확인 필요' : n < 0 ? '지난 일정' : n === 0 ? 'D-day' : 'D-' + n;
  return `<button class="calrow" data-detail="${x.id}">
    <span class="calthumb">${libThumb(x)}</span>
    <span class="caltext"><b>${esc(x.title)}</b><small>${icon('clock')}${fmtDay(d)} ${esc(x.dueLabel || (x.period ? '운영 종료' : '마감'))}${candidate ? ' · 추출 일정 후보' : ''}</small></span>
    <span class="calbadge ${!candidate && n >= 0 && n <= 3 ? 'soon' : ''}">${badge}</span>
  </button>`;
}

pages.calendar = function(){
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = calWeekOffset(new Date(y, m, 1)), last = new Date(y, m + 1, 0).getDate();
  const dueByDay = {};
  const catRanges = calCat ? calRanges() : [];
  if (calCat) {
    // 막대 줄(lane) 배정: 겹치지 않는 기간끼리 같은 줄, 최대 3줄
    const laneEnds = [];
    catRanges.forEach(r => { let lane = laneEnds.findIndex(e => e < r.start); if (lane < 0) { lane = laneEnds.length; laneEnds.push(r.end); } else laneEnds[lane] = r.end; r.lane = lane; });
    catRanges.forEach(r => { for (const d = new Date(Math.max(r.start, new Date(y, m, 1))); d <= r.end && d.getMonth() === m && d.getFullYear() === y; d.setDate(d.getDate() + 1)) { const k = calKey(d); (dueByDay[k] = dueByDay[k] || []).push(r.entry); } });
  } else calDueList().forEach(x => { const k = calKey(calDue(x)); (dueByDay[k] = dueByDay[k] || []).push(x); });
  const laneCount = Math.min(3, Math.max(0, ...catRanges.map(r => r.lane + 1)));
  const barsFor = date => catRanges.filter(r => r.lane < 3 && r.start <= date && date <= r.end).map(r => {
    const col = calWeekOffset(date), isStart = r.start.getTime() === date.getTime(), isEnd = r.end.getTime() === date.getTime();
    const label = isStart || col === 0 || date.getDate() === 1;
    let span = 1; if (label) { const d = new Date(date); while (span < 7 - col) { d.setDate(d.getDate() + 1); if (d > r.end || d.getMonth() !== m) break; span++; } }
    return `<i class="calspan lane-${r.lane} tone-${r.tone}${isStart ? ' is-start' : ''}${isEnd ? ' is-end' : ''}" aria-hidden="true">${label ? `<em style="--span:${span}">${esc(r.title)}</em>` : ''}</i>`;
  }).join('');
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span class="calcell calblank"></span>');
  for (let d = 1; d <= last; d++) {
    const date = new Date(y, m, d), k = calKey(date), list = dueByDay[k] || [];
    // 선택한 하루만 표시합니다. 오늘부터 이어지는 기간 띠는 사용하지 않습니다.
    const cls = [k === calKey(calToday) ? 'today' : '', k === calSel ? 'sel' : '', date < calToday ? 'past' : '', list.length ? 'hasdue' : ''].join(' ');
    cells.push(`<button class="calcell ${cls}" data-calday="${k}" aria-pressed="${k === calSel}" aria-label="${m+1}월 ${d}일${list.length ? `, 일정 ${list.length}개` : ''}"><span>${d}</span>${calCat ? barsFor(date) : list.length ? '<i class="caldot"></i>' : ''}</button>`);
  }
  const [sy, sm, sd] = calSel.split('-').map(Number);
  const selList = dueByDay[calSel] || [];
  // 배경: 가장 가까운 마감 콘텐츠 사진을 흐리게 깔고 그 위에 유리 카드
  const bgItem = calDueList().find(x => calDue(x) >= calToday && libPhoto(x)) || calDueList().find(x => libPhoto(x));
  const bg = ''; // 유리 배경은 취소 (흰 카드 유지)
  const back = typeof backHome !== 'undefined' && backHome ? `<button class="calback" data-action="backhome" aria-label="홈으로 돌아가기">${icon('back')}</button>` : '';
  // 월 선택: 작년 ~ 내년을 연도별로 묶은 세로 스크롤 목록
  const y0 = calToday.getFullYear();
  const months = [y0 - 1, y0, y0 + 1].map(yy => `<div class="calyr"><b>${yy}년</b>${Array.from({length:12}, (_, i) => `<button class="calmon ${yy === y && i === m ? 'on' : ''} ${yy === y0 && i === calToday.getMonth() ? 'now' : ''}" data-calmon="${yy}-${i}" aria-label="${yy}년 ${i + 1}월" aria-pressed="${yy === y && i === m}">${i + 1}월${yy === y0 && i === calToday.getMonth() ? '<small>이번 달</small>' : ''}</button>`).join('')}</div>`).join('');
  return `<div class="calfhead">${back}<h1>캘린더</h1></div>` + `
    ${calCategoryButtons()}
    <section class="calbox">${bg}
      <div class="calhead">
        <button class="caltitle" data-calpick aria-expanded="${calPick}" aria-controls="cal-month-picker" aria-haspopup="dialog" aria-label="다른 달로 이동"><span>${y}년 ${m + 1}월${icon('chevron')}</span></button>
        ${`<div class="calnav"><button data-calnav="-1" aria-label="이전 달">${icon('chevleft')}</button><button data-calnav="1" aria-label="다음 달">${icon('chevright')}</button></div>`}
      </div>
      <div class="calweek" aria-hidden="true">${calWeekLabels().map(w => `<span class="${w==='일'?'cal-sunday':''}">${w}</span>`).join('')}</div>
      <div class="calgrid${calCat ? ' is-range' : ''}" style="--cal-lanes:${laneCount}">${cells.join('')}</div>
      ${calPick ? `<div class="cal-month-picker" id="cal-month-picker" role="dialog" aria-label="월 선택">
        <div class="cal-picker-head"><button type="button" data-calclose aria-label="월 선택 닫기">${icon('close')}</button></div>
        <div class="calmonths" role="group" aria-label="연도별 월 목록">${months}</div>
        <button type="button" class="cal-picker-today" data-caltoday>이번 달로 이동</button>
      </div>` : ''}
    </section>
    <div class="sectionhead calsec"><h2>${fmtDay(new Date(sy, sm - 1, sd))} 일정</h2></div>
    ${selList.length ? `<div class="callist">${selList.map(calRow).join('')}</div>` : '<p class="calnone">이 날짜에 등록된 일정이 없어요.</p>'}`;
};

function calClosePicker(){
  calPick = false; const y = scrollY; render(); scrollTo(0, y);
  document.querySelector('[data-calpick]')?.focus({preventScroll:true});
}
document.addEventListener('keydown', e => {
  if (calPick && page === 'calendar' && e.key === 'Escape') {
    e.preventDefault(); calClosePicker();
  }
});
document.addEventListener('click', e => {
  if (calPick && page !== 'calendar') calPick = false;
  if (calPick && !e.target.closest('.cal-month-picker,[data-calpick]')) { calClosePicker(); return; }
  const cat = e.target.closest('[data-calcat]');
  if (cat && page === 'calendar') { calCat = cat.dataset.calcat; const y = scrollY; render(); scrollTo(0, y); return; }
  const day = e.target.closest('[data-calday]');
  if (day && page === 'calendar') { calSel = day.dataset.calday; const y = scrollY; render(); scrollTo(0, y); return; }
  if (e.target.closest('[data-calclose]')) { calClosePicker(); return; }
  if (e.target.closest('[data-caltoday]')) {
    calMonth = new Date(calToday.getFullYear(), calToday.getMonth(), 1);
    calClosePicker(); return;
  }
  if (e.target.closest('[data-calpick]')) {
    calPick = !calPick; const y = scrollY; render(); scrollTo(0, y);
    const list = document.querySelector('.calmonths'), on = list?.querySelector('.calmon.on');
    if (list && on) {
      list.scrollTop += on.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2 + on.offsetHeight / 2;
      on.focus({preventScroll:true});
    }
    return;
  }
  const mon = e.target.closest('[data-calmon]');
  if (mon) { const [my, mm] = mon.dataset.calmon.split('-').map(Number); calMonth = new Date(my, mm, 1); calClosePicker(); return; }
  const nav = e.target.closest('[data-calnav]');
  if (nav) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(nav.dataset.calnav), 1); const y = scrollY; render(); scrollTo(0, y); }
});

render();
