// 핀맵 기본 데이터 · 화면 렌더링 · 공통 동작
const $ = s => document.querySelector(s);
const paths = {
  home:'M3 10 12 3l9 7v10H3z M9 20v-7h6v7', bookmark:'M6 3h12v18l-6-4-6 4z',
  map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16', folder:'M3 7V4h7l3 3h8v13H3z',
  plus:'M12 5v14 M5 12h14', search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow:'M5 12h14 M13 6l6 6-6 6', back:'M15 5l-7 7 7 7', close:'m6 6 12 12 M18 6 6 18',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  coffee:'M4 4h12v10a5 5 0 0 1-10 0V4 M16 5h2a3 3 0 0 1 0 6h-2 M3 21h16', check:'m5 12 4 4L20 5',
  external:'M14 3h7v7 M21 3 10 14 M11 3H3v18h18v-8', spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  target:'M12 2v4 M12 18v4 M2 12h4 M18 12h4 M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', calendar:'M4 5h16v15H4z M4 10h16 M9 3v4 M15 3v4',
  heart:'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', comment:'M4 5h16v11H9l-5 4z',
  send:'M21 3 3 10l7 3 3 7z M10 13 21 3',
  link:'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  share:'M12 15V3 M7 8l5-5 5 5 M5 13v7h14v-7', story:'M12 3a9 9 0 1 0 9 9 M12 8v4l3 2',
  more:'M5 12h.01 M12 12h.01 M19 12h.01', image:'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9h.01',
  mail:'M3 6h18v12H3z M3 6l9 7 9-7', user:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0',
  bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4', note:'M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4', copy:'M8 8h12v12H8z M4 16V4h12',
  eat:'M7 3v18 M4 3v5a3 3 0 0 0 6 0V3 M17 21v-9h3V3c-4 0-5 6-3 9',
  event:'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M16 5v3 M16 11v2 M16 16v3',
  walk:'M12 22v-7 M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z',
  shop:'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  route:'M7 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8 M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M21 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  question:'M9 9a3 3 0 1 1 5.1 2.1c-1.6 1-2.1 1.7-2.1 3.4 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
};
const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.bookmark}"/></svg>`;
// Bencho Like's Lucide heart, without its pill and count.
const likeHeartIcon = () => '<svg class="icon lm-like-heart" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path></svg>';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 콘텐츠 유형 (저장 카테고리) ---------- */
// place: 지도에 표시하는 장소형 콘텐츠. 나머지는 썸네일·제목·간단 정보 + 원본 보기.
const TYPES = [
  {id:'맛집/카페', emoji:'☕', place:true, art:'cafe'},
  {id:'전시/팝업', emoji:'🖼️', place:true, art:'exhibit'},
  {id:'여행', emoji:'✈️', place:true, art:'sea'},
  {id:'쇼핑', emoji:'🛍️', art:'bag'},
  {id:'레시피', emoji:'🍳', art:'food'},
  {id:'생활 정보', emoji:'💡', art:'tips'},
  {id:'기타', emoji:'🔖', art:'missing'}
];
const typeIds = TYPES.map(t => t.id);
const categories = ['전체', ...typeIds];
const typeOf = id => TYPES.find(t => t.id === id) || TYPES[TYPES.length-1];
const isPlace = x => !!typeOf(x.type).place;
// 2026-11-10 날짜 표기 통일: 11.14 (금). Date 또는 'YYYY-MM-DD'를 받아요.
const fmtDay = v => { const d = v instanceof Date ? v : new Date(`${v}T00:00:00`); if (isNaN(d)) return String(v || ''); return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${'일월화수목금토'[d.getDay()]})`; };
// 2026-11-04 조사 고르기: 받침에 맞춰 을/를, 이/가, 은/는, 으로/로 (ㄹ받침은 로)
const josa = (word, pair) => { const w = String(word), c = w.charCodeAt(w.length - 1) - 0xAC00, has = c >= 0 && c <= 11171 ? c % 28 : (/[0-9]$/.test(w) ? '013678'.includes(w.slice(-1)) ? 1 : 0 : 0), [a, b] = pair.split('/'); if (pair === '으로/로') return w + (has && has !== 8 ? '으로' : '로'); return w + (has ? a : b); };
const shortType = id => id.split(/[·/]/)[0].trim();
const COLLECTIONS = PM_ENV.development ? [] : [
  ['이번 주말 성수','coffee','카페, 전시, 산책까지 주말 외출 후보'],
  ['나의 작은 공간','home','집을 조금 더 나답게'],
  ['일상에 영감','spark','요리부터 기록까지']
];
const collectionNames = () => [...new Set([...COLLECTIONS.map(c => c[0]), ...items.map(x => x.collection).filter(Boolean)])];

// 예시 데이터 · 실제 SNS 계정과 연결되지 않습니다.
let items = PM_ENV.development ? [] : [
  {id:1,title:'햇살이 머무는 성수 카페',type:'맛집/카페',category:'카페',source:'Instagram',ago:'2일 전',desc:'큰 창 옆에서 커피 한 잔과 함께 느긋한 오후를 보내기 좋아요.',memo:'성수에서 친구 만나기 전에 들러보기. 창가 자리!',art:'cafe',distance:'도보 5분',collection:'이번 주말 성수',address:'서울 성동구 성수동, 예시 장소',saves:128,aiClassified:true},
  {id:2,title:'작은 방을 바꾸는 조명',type:'쇼핑',category:'조명',source:'Instagram',ago:'어제',desc:'공간의 분위기를 바꿔 주는 작은 조명이에요.',memo:'책상 옆에 두고 싶은 따뜻한 조명.',art:'lamp',collection:'나의 작은 공간',price:'49,000원, 참고 가격',shop:'예시 리빙 스토어',aiClassified:true},
  {id:3,title:'15분, 바질 토마토 파스타',type:'레시피',category:'파스타',source:'YouTube',ago:'3일 전',desc:'퇴근 후에도 가볍게 만들 수 있는 한 접시예요.',memo:'방울토마토, 바질, 파스타면만 준비하면 끝.',art:'food',collection:'일상에 영감',recipe:'15분, 재료 4가지, 1인분',saves:96,aiClassified:true},
  {id:4,title:'초록 사이, 주말의 전시',type:'전시/팝업',category:'전시',source:'Instagram',ago:'4일 전',desc:'식물과 일상의 사물을 새롭게 볼 수 있는 전시예요.',memo:'이번 주말 성수에 가면 같이 보기.',art:'exhibit',distance:'도보 12분',collection:'이번 주말 성수',deadline:'D-3',period:'10.01 (목) – 10.08 (목), 예시 기간',address:'서울 성동구 성수동, 예시 전시',deleted:true,saves:74,aiClassified:true},
  {id:5,title:'취향을 기록하는 방법',type:'생활 정보',category:'기록',source:'YouTube',ago:'5일 전',desc:'좋아하는 것을 모아 나만의 언어로 기록하는 방법이에요.',memo:'기록이 막힐 때 다시 꺼내보기.',art:'tips',collection:'일상에 영감',aiClassified:true},
  {id:6,title:'서울숲에서 잠깐 쉬어가기',type:'여행',category:'산책',source:'Instagram',ago:'1주 전',desc:'도시 한가운데에서 초록을 만날 수 있는 곳이에요.',memo:'커피를 마신 뒤 가볍게 산책하기.',art:'park',distance:'도보 9분',collection:'이번 주말 성수',address:'서울 성동구 뚝섬로 273',mapQuery:'서울숲',aiClassified:false},
  {id:7,title:'댓글에서 발견한 카페',type:'맛집/카페',category:'카페',source:'Instagram',ago:'방금',desc:'위치를 확인하고 지도에 담아 보세요.',memo:'원본에서 주소 확인하기',art:'cafe',collection:'이번 주말 성수',pending:true,aiClassified:true},
  {id:8,title:'골목 안 작은 브런치 식당',type:'맛집/카페',category:'맛집',source:'Instagram',ago:'6일 전',desc:'주말 아침에 천천히 먹기 좋은 한 접시예요.',memo:'주말 브런치 약속 장소 후보.',art:'food',distance:'도보 7분',collection:'이번 주말 성수',address:'서울 성동구 성수동, 예시 맛집',mapQuery:'성수동 브런치',saves:61,aiClassified:true},
  {id:9,title:'바다 앞 작은 숙소',type:'여행',category:'숙소',source:'Instagram',ago:'2주 전',desc:'창문을 열면 바로 바다가 보이는 숙소예요.',memo:'가을 휴가 후보. 일출 보기!',art:'sea',distance:'차로 약 3시간',address:'강원 강릉시, 예시 여행지',mapQuery:'강릉 바다',aiClassified:true},
  {id:10,title:'매일 드는 캔버스 토트백',type:'쇼핑',category:'가방',source:'Instagram',ago:'1주 전',desc:'노트북도 들어가는 넉넉한 크기예요.',memo:'세일하면 사기.',art:'bag',collection:'나의 작은 공간',price:'32,000원, 참고 가격',shop:'예시 패션 스토어',aiClassified:true},
  {id:11,title:'원룸 수납 정리 아이디어',type:'생활 정보',category:'수납',source:'Instagram',ago:'3주 전',desc:'좁은 방을 넓게 쓰는 선반 배치 방법이에요.',memo:'이사 가면 참고하기.',art:'tips',collection:'일상에 영감',saves:142,aiClassified:true}
];
let page='home', filter='전체', query='', detailId=null, selectedPin=1, collection=null, locationAllowed=false, toastTimer;
// 마이 > 프로필 · 설정 (pinmap.js가 브라우저에 저장합니다)
let settings = PM_ENV.development ? {nickname:'',area:'',notiDeadline:false,notiNearby:false,notiReminder:false,aiDefault:false,readNoti:[],push:false,locPerm:'none',places:[],recentPlaces:[],accounts:[],calSeeded:true} : {nickname:'서연', area:'성수동', notiDeadline:true, notiNearby:true, notiReminder:false, aiDefault:true, readNoti:[], push:false, locPerm:'none', places:['성수동','청파동'], recentPlaces:['한남동','연남동','잠실3동']};
const LOC_PERM = {always:'항상 허용', using:'앱을 사용하는 동안', none:'허용 안 함'};
let dueDismissed = false; // 마감 임박 배너를 닫으면 이번 방문 동안 숨김
let unreadCount = () => 0; // my.js가 알림 개수 계산을 연결합니다
const pages = {};          // 화면 렌더 함수 (pinmap.js가 home을 개인화 버전으로 바꿉니다)
let afterChange = () => {}; // 데이터가 바뀌면 호출 (pinmap.js가 브라우저 저장을 연결합니다)
// Screens call the same persistence boundary in both modes. The account data
// source replaces these methods after authentication is initialized.
globalThis.PinmapContentPersistence={
  async saveEdit(item,draft,{folder}){
    Object.assign(item,draft);
    if(folder==='new:'){
      settings.customFolders=[...new Set([...(settings.customFolders||[]),draft.collection])];
      cfSyncCollections();
    }
    afterChange();
  },
  async savePin(item){items.unshift(item);afterChange();}
};

/* ---------- 저장 시점: 실제 타임스탬프를 기준으로 표시 ---------- */
const SAVED_DAY = 86400000;
const SAVED_KST = 9 * 3600000;
function savedTimestamp(x){
  if (x.savedAt == null || x.savedAt === '') return null;
  const value = typeof x.savedAt === 'number' ? x.savedAt : Date.parse(x.savedAt);
  return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
}
function normalizeSavedAt(x, now = Date.now()){
  if (savedTimestamp(x) !== null) return;
  // 이전 사용자 저장 항목은 Date.now()로 만든 id에서 실제 저장 시점을 복원합니다.
  if (Number.isFinite(x.id) && x.id >= 1000000000000 && x.id <= now) {
    x.savedAt = new Date(x.id).toISOString(); return;
  }
  // 과거 예시 데이터에는 ago만 있습니다. 최초 이전 때 한 번 추정해 고정합니다.
  const text = String(x.ago || '').trim();
  const match = text.match(/^(\d+)\s*(분|시간|일|주|개월|달|년)\s*전$/);
  let offset;
  if (text === '방금' || text === '오늘') offset = 0;
  else if (text === '어제') offset = SAVED_DAY;
  else if (match) offset = Number(match[1]) * ({'분':60000,'시간':3600000,'일':SAVED_DAY,'주':7*SAVED_DAY,'개월':30*SAVED_DAY,'달':30*SAVED_DAY,'년':365*SAVED_DAY})[match[2]];
  if (offset !== undefined && Number.isFinite(offset)) {
    x.savedAt = new Date(now - offset).toISOString();
    x.savedAtEstimated = true;
  }
}
function savedAgo(x, now = Date.now()){
  const timestamp = savedTimestamp(x);
  if (timestamp === null) return '저장일 확인 필요';
  // 한국 날짜 경계로 계산해 같은 날 저장한 항목에 0일 전이 나타나지 않게 합니다.
  const days = Math.max(0, Math.floor((now + SAVED_KST) / SAVED_DAY) - Math.floor((timestamp + SAVED_KST) / SAVED_DAY));
  if (days === 0) return '오늘';
  if (days < 7) return `${days}일 전`;
  if (days <= 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}달 전`;
  const date = new Date(timestamp + SAVED_KST);
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth()+1).padStart(2,'0')}.${String(date.getUTCDate()).padStart(2,'0')}`;
}

/* ---------- 일러스트 (직접 만든 SVG) ---------- */
function art(kind){const base='<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';const svgs={
cafe:'<rect width="400" height="230" fill="#D9D1BF"/><path d="M0 180 400 55v175H0" fill="#B6AA91"/><rect x="58" y="0" width="177" height="150" rx="2" fill="#E6ECE0"/><path d="M145 0v150 M58 75h177" stroke="#8C9886" stroke-width="7"/><path d="m60 150 125 80h155L232 150" fill="#F5E2B5"/><ellipse cx="260" cy="174" rx="73" ry="17" fill="#786E5B"/><path d="M246 183v47" stroke="#786E5B" stroke-width="9"/><ellipse cx="260" cy="166" rx="72" ry="17" fill="#EAE1CF"/><path d="M243 141h29v23q-14 14-29 0z" fill="#FFFDF5"/><path d="M272 146q20-2 13 12h-13" fill="none" stroke="#FFFDF5" stroke-width="6"/><path d="M336 136v-60" stroke="#577154" stroke-width="4"/><ellipse cx="324" cy="84" rx="15" ry="29" fill="#64865D" transform="rotate(-35 324 84)"/><ellipse cx="349" cy="63" rx="14" ry="26" fill="#80966A" transform="rotate(35 349 63)"/><path d="m319 130 8 29h22l8-29" fill="#A97050"/>',
lamp:'<rect width="400" height="230" fill="#E9DECE"/><rect y="180" width="400" height="50" fill="#C5AF93"/><ellipse cx="217" cy="186" rx="60" ry="9" fill="#A18B7266"/><path d="M214 85v95" stroke="#725D44" stroke-width="8"/><path d="M160 100q5-93 110 0z" fill="#AC6C49"/><ellipse cx="215" cy="100" rx="55" ry="10" fill="#F7CF91"/><ellipse cx="215" cy="179" rx="33" ry="8" fill="#8B6A4B"/><path d="M39 179v-38h55v38" fill="#B4BEA2"/><path d="m52 142-9-36 M67 140l19-49" stroke="#687B57" stroke-width="5"/><rect x="304" y="145" width="57" height="35" fill="#DED4BE"/>',
food:'<rect width="400" height="230" fill="#DDDCC5"/><path d="M0 45h400 M0 115h400 M0 185h400 M55 0v230 M145 0v230 M235 0v230 M325 0v230" stroke="#F2F0DB" stroke-width="2"/><ellipse cx="207" cy="116" rx="102" ry="97" fill="#F8F7EC"/><ellipse cx="207" cy="116" rx="76" ry="71" fill="#E5B867"/><path d="M157 100q75-75 107 10t-103 37q-35-50 54-68t28 78q-70 15-70-40t65-9" fill="none" stroke="#F4D797" stroke-width="9"/><g fill="#B95438"><circle cx="168" cy="81" r="15"/><circle cx="237" cy="143" r="17"/><circle cx="249" cy="90" r="13"/><circle cx="173" cy="146" r="12"/></g><path d="M191 105q-24-30 0-34 25 13 0 34 M203 104q32-24 36 0-17 19-36 0" fill="#527448"/><path d="M65 63v124 M53 62v35q12 14 24 0V62" fill="none" stroke="#868A77" stroke-width="5"/>',
exhibit:'<rect width="400" height="230" fill="#D9E1D4"/><rect x="35" y="22" width="330" height="186" fill="#F8F3DF"/><text x="58" y="75" font-size="44" font-weight="700" fill="#365940">GREEN</text><text x="58" y="117" font-size="44" font-weight="700" fill="#365940">MOMENTS</text><path d="M273 185q-75-23-32-65 61-19 32 65 M273 185q66-66 59-7-19 27-59 7" fill="#819F6D"/><path d="M58 150h120" stroke="#7A8A65"/><text x="58" y="174" font-size="11" letter-spacing="2" fill="#52654B">ART, NATURE, EVERYDAY</text>',
park:'<rect width="400" height="230" fill="#CFDFD0"/><path d="M0 154q110-60 220 0t180 0v76H0" fill="#A0BC8A"/><path d="M183 230q-60-70 16-106h37q-54 43 42 106" fill="#E2D3B3"/><g fill="#78996B"><circle cx="73" cy="92" r="48"/><circle cx="340" cy="75" r="63"/></g><g fill="#91AF80"><circle cx="104" cy="57" r="43"/><circle cx="295" cy="51" r="41"/></g><path d="M85 103v93 M327 89v94" stroke="#6F7D56" stroke-width="9"/><path d="M241 170h54 M248 163v23 M287 163v23" stroke="#8A7457" stroke-width="6"/>',
bag:'<rect width="400" height="230" fill="#E4DCCF"/><rect y="185" width="400" height="45" fill="#CDBFA8"/><path d="M155 88q0-52 45-52t45 52" fill="none" stroke="#6E5B45" stroke-width="8"/><path d="M118 85h164l-14 112H132z" fill="#F3EBDD"/><path d="M118 85h164" stroke="#D8CCB8" stroke-width="4"/><rect x="168" y="122" width="64" height="34" rx="4" fill="#9FD9BD"/><ellipse cx="200" cy="198" rx="82" ry="7" fill="#A8977E55"/><circle cx="324" cy="150" r="22" fill="#B9C7A6"/><path d="M324 172v14" stroke="#7C8B67" stroke-width="5"/>',
tips:'<rect width="400" height="230" fill="#E3E6DD"/><rect x="70" y="36" width="260" height="168" rx="6" fill="#F6F3EA"/><path d="M70 95h260 M70 150h260" stroke="#CFC6B3" stroke-width="5"/><rect x="90" y="54" width="40" height="38" rx="4" fill="#B9C7A6"/><rect x="140" y="61" width="55" height="31" rx="4" fill="#E2B98F"/><rect x="250" y="49" width="60" height="43" rx="6" fill="#9FB7BF"/><rect x="95" y="112" width="70" height="36" rx="5" fill="#D9CDB6"/><circle cx="230" cy="128" r="18" fill="#9FD9BD"/><rect x="270" y="108" width="40" height="40" rx="5" fill="#C7A98A"/><rect x="110" y="165" width="180" height="28" rx="6" fill="#DCD3C2"/>',
sea:'<rect width="400" height="230" fill="#CFE3EA"/><circle cx="300" cy="62" r="26" fill="#F7E3A6"/><path d="M0 120h400v110H0z" fill="#8DB9C8"/><path d="M0 130q50-10 100 0t100 0 100 0 100 0" fill="none" stroke="#E8F3F5" stroke-width="4"/><path d="M0 165q50-10 100 0t100 0 100 0 100 0" fill="none" stroke="#D3E8EC" stroke-width="3"/><path d="M0 190q120-40 260-10t140 10v40H0z" fill="#E9DCC0"/><path d="M60 190v-50 M60 140q-20 0-30 12 M60 140q20-5 32 8 M60 140q-6-16-22-18 M60 140q10-16 26-14" stroke="#6F8A5C" stroke-width="5" fill="none"/>'
};return svgs[kind] ? base+svgs[kind]+'</svg>' : `<img src="${PM_ENV.placeholderImage}" alt="">`}

/* ---------- 카드 ---------- */
// 카드 구현은 library.js에서 등록하고 모든 화면이 공유한다.
let card, gcard;

/* ---------- 공통 레이아웃 ---------- */
const NAV = [['home','home','홈'],['map','map','지도'],['library','bookmark','저장함'],['my','user','마이']];
const pageName = {home:'홈',map:'지도',library:'저장함',my:'마이'};
function nav(){return NAV.map(([p,i,l])=>`<button class="navitem ${page===p&&!detailId?'active':''}" data-page="${p}" ${page===p?'aria-current="page"':''}><span class="navicon">${icon(i)}</span><span>${l}</span></button>`).join('')}
function filtered(){return items.filter(x=>(filter==='전체'||x.type===filter)&&(!collection||x.collection===collection)&&PinmapContentSearch.matches(x,query))}
const galleryMode = () => !collection && filter!=='전체' && !typeOf(filter).place;

/* ---------- 화면 ---------- */
// 실제 화면은 뒤에서 각 화면 모듈이 등록한다. 로드 실패 시 오래된 예시 화면을 보여주지 않는다.
const unavailableScreen = () => '<div class="empty small" role="status"><p class="muted">화면을 불러오지 못했어요. 새로고침해 주세요.</p></div>';
let resultCards = unavailableScreen;

const readyPlaces = () => items.filter(x=>isPlace(x)&&x.address&&!x.pending);
const distanceOf = x => /도보/.test(x.distance||'') ? Number(String(x.distance).replace(/\D/g,''))||99 : 999;

let detail = unavailableScreen;

function render(){
  page=PinmapScreenPolicy.resolve(page,pages);
  const content=detailId?detail():(pages[page] || unavailableScreen)();
  $('#app').innerHTML=`<div class="layout"><aside class="rail"><a href="#" class="brand" data-page="home"><b class="brandmark">${icon('bookmark')}</b><span>핀맵</span></a><button class="filled" data-action="save">${icon('plus')}<span>새로 저장</span></button><nav aria-label="주 메뉴">${nav()}</nav><div class="railfoot">저장을 다시, 일상으로.<button data-action="intro">사용 방법 알아보기</button><span>Prototype 03</span></div></aside><main class="main"><header class="topbar"><span class="breadcrumb">핀맵 / ${detailId?'콘텐츠 상세':pageName[page]}</span>${page==='my'&&!detailId?'<h1 class="toptitle">마이</h1>':`<a href="#" class="brand mobilebrand" data-page="home"><b class="brandmark">${icon('bookmark')}</b>핀맵</a>`}<div class="topactions">${(page === 'home' || page === 'my') && !detailId ? (n=>`<button class="bellbtn" data-action="noti" aria-label="알림${n?` ${n} 개 안 읽음`:''}">${icon('bell')}${n?`<span class="belldot" aria-hidden="true">${n}</span>`:''}</button>`)(unreadCount()) : ''}</div></header>${content}<footer class="footer"><span>핀맵, 저장을 다시, 일상으로.</span><span>예시 데이터로 체험하는 프로토타입</span></footer></main><nav class="bottomnav" aria-label="하단 메뉴">${nav()}</nav></div>`;
}
function go(p){p=PinmapScreenPolicy.resolve(p,pages);page=p;detailId=null;collection=null;filter='전체';query='';render();window.scrollTo(0,0)}
let detailReturnTarget=null;
function openDetail(id,trigger=document.activeElement){
  detailReturnTarget=trigger?.matches?.('[data-detail],[data-lm="open-place"]') ? {
    id:trigger.getAttribute('data-detail'),
    key:trigger.getAttribute('data-place-key'),
    className:trigger.classList[0]
  } : null;
  detailId=id;render();window.scrollTo(0,0);
  requestAnimationFrame(()=>document.querySelector('[data-action="back"]')?.focus({preventScroll:true}));
}
function toast(t){$('#snackbar').textContent=t;$('#snackbar').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#snackbar').classList.remove('show'),3200)}
function modal(title,body){const d=$('#sheet');d.innerHTML=`<div class="handle"></div><div class="dialoghead"><h2>${title}</h2><button class="iconbtn" data-action="close" aria-label="닫기">${icon('close')}</button></div>${body}`;if(!d.open)d.showModal()}

/* ---------- AI 분류 (프로토타입용 간단한 규칙) ---------- */
function guessType(text){
  const t=text.toLowerCase();
  if(/카페|커피|맛집|브런치|식당|베이커리|디저트/.test(t)) return '맛집/카페';
  if(/전시|팝업|미술관|갤러리|공연/.test(t)) return '전시/팝업';
  if(/여행|숙소|호텔|바다|여행지|캠핑/.test(t)) return '여행';
  if(/레시피|요리|만들기|파스타|recipe/.test(t)) return '레시피';
  if(/구매|가방|조명|옷|신발|템|shop|store/.test(t)) return '쇼핑';
  if(/정리|꿀팁|방법|팁|공부|자료/.test(t)) return '생활 정보';
  return '기타';
}

/* ---------- 대화상자 ---------- */
// Active screen modules register the save/edit/onboarding UI. A failed module
// must never resurrect the retired fallback forms or simulated permission UI.
const unavailableAction=()=>toast('화면을 불러오지 못했어요. 새로고침해 주세요.');
let intro=unavailableAction;

/* ---------- 동작 ---------- */
const actions = {
  save: unavailableAction, intro: () => intro(), close: () => $('#sheet').close(),
  back: () => {
    const target=detailReturnTarget;
    detailId=null;render();detailReturnTarget=null;
    requestAnimationFrame(()=>{
      const candidates=document.querySelectorAll('[data-detail],[data-lm="open-place"]');
      const button=[...candidates].find(el=>target&&el.getAttribute('data-detail')===target.id&&el.getAttribute('data-place-key')===target.key&&el.classList.contains(target.className));
      button?.focus({preventScroll:true});
    });
  },
  clear: () => { query=''; render(); $('#search')?.focus(); },
  resetfilter: () => { query=''; filter='전체'; render(); },
  edit: unavailableAction,
  duedismiss: () => { dueDismissed = true; render(); },
  original: () => { const x=items.find(x=>x.id===detailId); if(!x)return;
    let url='';
    if(x.url&&!x.sample&&x.source!=='캡처'){
      try{const destination=new URL(x.url);if(['https:','http:'].includes(destination.protocol))url=destination.href;}catch{}
    }
    if(url){window.top.location.assign(url);return;}
    modal(x.source==='캡처'?'캡처 미리보기':'원본 콘텐츠 보기',x.source==='캡처'?`${x.photo?`<img class="screenshot-import-preview" src="${esc(x.photo)}" alt="저장한 캡처 화면 미리보기">`:'<p>캡처 미리보기를 저장하지 못했어요.</p>'}<div class="dialogactions"><button class="filled" data-action="close">닫기</button></div>`:`<p>‘${esc(x.title)}’은 체험용 콘텐츠예요.</p><p class="muted">실제 서비스에서는 이 단계에서 저장한 ${esc(x.source)} 게시물로 이동해요.</p><div class="dialogactions"><button class="filled" data-action="close">확인</button></div>`); }
};
function action(a){ if(!PinmapScreenPolicy.allowsAction(a))return; (Object.hasOwn(actions,a)&&typeof actions[a]==='function'?actions[a]:(()=>{}))(); }

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-page],[data-detail],[data-filter],[data-action],[data-collection],[data-pin],[data-libfilter],[data-libquery]');
  if(!b)return;
  const d=b.dataset;
  if(d.page){e.preventDefault();go(d.page);}
  else if(d.detail){openDetail(Number(d.detail),b);}
  else if(d.filter){filter=d.filter;render();}
  else if(d.collection){page='library';detailId=null;collection=d.collection;filter='전체';query='';render();window.scrollTo(0,0);}
  else if(d.pin){selectedPin=Number(d.pin);render();}
  else if(d.libfilter||d.libquery){page='library';detailId=null;collection=null;filter=d.libfilter||'전체';query=d.libquery||'';render();window.scrollTo(0,0);}
  else action(d.action);
});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#results').innerHTML=resultCards();$('#resultcount').textContent=filtered().length+'개의 콘텐츠'}});
document.addEventListener('submit',async e=>{
  if(e.target.id==='saveform'){
    e.preventDefault();const f=e.target;let u;
    try{u=new URL(f.url.value);if(!['https:','http:'].includes(u.protocol))throw Error()}catch{$('#saveerror').textContent='http 또는 https 링크를 입력해 주세요.';return}
    const sourceName=/^(?:www\.)?instagram\.com$/i.test(u.hostname)?'Instagram 게시물':/^(?:www\.)?(?:youtube\.com|youtu\.be)$/i.test(u.hostname)?'YouTube 영상':`${u.hostname.replace(/^www\./,'')} 링크`;
    const title=f.elements.namedItem('title').value.trim()||sourceName.slice(0,50), ai=!PM_ENV.development&&f.type.value==='ai', type=ai?guessType(title+' '+u.href):f.type.value, sample=!PM_ENV.development&&f.url.value.includes('sample-prototype');
    const x={id:Date.now(),title,type,category:shortType(type),source:sample?'YouTube':u.hostname.replace(/^www\./,''),ago:'방금',savedAt:new Date().toISOString(),desc:PM_ENV.development?'':'새롭게 담아둔 나의 취향',memo:f.memo.value,art:typeOf(type).art,collection:f.collection.value,url:u.href,sample,aiClassified:ai};
    if(typeOf(type).place)x.pending=true;
    items.unshift(x);afterChange();$('#sheet').close();page='library';openDetail(x.id);window.PinmapSaveFx?.(ai?shortType(type):'');
    toast(ai?`저장했어요. AI가 ‘${type}’로 분류했어요.`:'저장했어요. 필요할 때 다시 꺼내 보세요.');
  } else if(e.target.id==='editform'){
    e.preventDefault();const data=new FormData(e.target),x=items.find(x=>x.id===detailId);
    if(!x)return;
    const draft={...x};
    const folderValue=String(data.get('folder')||'');
    if(folderValue==='new:'){
      const name=String(data.get('collection')||'').trim();
      if(!name || ['전체',...cfCategories().map(f=>f.id)].includes(name)){
        const error=$('#es-folder-error');if(error)error.textContent=name?'다른 폴더 이름을 입력해 주세요.':'새 폴더 이름을 입력해 주세요.';
        $('#es-newcol')?.focus();return;
      }
    }
    const previousFolder=cfCustom().includes(x.collection)?'custom:'+x.collection:'category:'+folderOf(x), previousCollection=x.collection||'';
    const type=String(data.get('type'));
    if(type!==draft.type){delete draft.folderCategory;draft.aiClassified=false;draft.category=shortType(type);draft.art=draft.art||typeOf(type).art;}
    draft.type=type;
    for(const k of ['title','address','memo','collection']) draft[k]=String(data.get(k)||'').trim();
    const folder = String(data.get('folder') || '');
    if(folder.startsWith('category:')){
      const name = folder.slice(9);
      if(cfCategories().some(f=>f.id===name)){
        draft.folderCategory = name;
        const folderType = PinmapCategories.presentation(name);
        if(draft.type!==folderType || draft.category!==name)draft.aiClassified=false;
        draft.type=folderType; draft.category=name; draft.collection=folder===previousFolder?previousCollection:'';
      }
    } else if(folder.startsWith('custom:') || folder==='new:'){
      const name = folder==='new:' ? draft.collection : folder.slice(7);
      if(name){
        draft.collection=name;
      }
    }
    try{
      if(draft.address!==x.address){
        if(draft.address){
          const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(draft.address)+'&limit=1');
          if(!response.ok)throw Error('주소의 지도 위치를 찾지 못했어요. 다시 확인해 주세요.');
          const feature=(await response.json()).features?.[0];
          const [lng,lat]=feature?.geometry?.coordinates||[];
          if(!Number.isFinite(lat)||!Number.isFinite(lng))throw Error('주소의 지도 위치를 찾지 못했어요. 다시 확인해 주세요.');
          draft.lat=lat;draft.lng=lng;
          const first=draft.mapLocations?.[0]||{};
          draft.mapLocations=[{...first,name:draft.title,address:draft.address,coordinates:{lat,lng},review_required:true},...(draft.mapLocations||[]).slice(1)];
        }else{delete draft.lat;delete draft.lng;draft.mapLocations=(draft.mapLocations||[]).slice(1);}
        draft.mapQuery=draft.address;
      }
      draft.pending=isPlace(draft)&&!draft.address;
      await window.PinmapContentPersistence.saveEdit(x,draft,{folder,previousFolder});
      $('#sheet').close();render();toast('저장 정보를 수정했어요.');
    }catch(error){
      const node=document.getElementById('es-save-error');
      if(node)node.textContent=error.message||'저장하지 못했어요. 다시 시도해 주세요.';
      else toast(error.message||'저장하지 못했어요. 다시 시도해 주세요.');
    }
  }
});
$('#sheet').addEventListener('click',e=>{if(e.target===$('#sheet')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});

// 브라우저가 WebMCP를 지원하면 같은 검색 동작을 노출합니다.
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'search_saved_content',description:'Search saved account content and show matching cards. Does not save or modify records.',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input.query!=='string')throw new Error('query must be a string');page='library';detailId=null;collection=null;filter='전체';query=input.query;render();return {count:filtered().length,items:filtered().map(x=>({id:x.id,title:x.title,type:x.type}))}}})).catch(()=>{})}catch{}}
