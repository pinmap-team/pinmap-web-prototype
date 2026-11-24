const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');
function boot(mode,entries={}) {
  const stored=new Map(Object.entries(entries));
  const context=vm.createContext({location:{search:mode?'?mode='+mode:''},URLSearchParams,encodeURIComponent,NAV:[],pageName:{},localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},console});
  vm.runInContext(read('environment.js'),context);
  vm.runInContext(read('categories.js'),context);
  vm.runInContext(read('app.js').split('/* ---------- 일러스트')[0],context);
  vm.runInContext(read('pinmap.js').split('/* ---------- 관심사 기반 홈')[0],context);
  vm.runInContext(read('calendar.js').split('/* ---------- 날짜 계산')[0],context);
  return {context,stored,value:expr=>JSON.parse(vm.runInContext('JSON.stringify('+expr+')',context))};
}
test('development starts with no seeded content, profile, accounts or places',()=>{
  const app=boot('development');
  assert.equal(app.value('items.length'),0);
  assert.deepEqual(app.value('COLLECTIONS'),[]);
  assert.equal(app.value('settings.nickname'),'');
  assert.deepEqual(app.value('settings.places'),[]);
  assert.deepEqual(app.value('settings.accounts'),[]);
  assert.equal(app.value('STORAGE'),'pinmap.dev.v1');
});
test('all app states require an account and start without sample data',()=>{
  assert.equal(boot('development').value('PM_ENV.requiresAuth'),true);
  assert.equal(boot('prototype').value('PM_ENV.requiresAuth'),true);
  assert.equal(boot('development&auth=required').value('PM_ENV.requiresAuth'),true);
  assert.equal(boot('prototype&auth=required').value('items.length'),0);
});
test('initial development screens ignore stored data without changing or deleting any saved records',()=>{
  const payload=JSON.stringify({items:[{id:1,title:'Existing content',type:'기타'}],settings:{nickname:'Existing user',calSeeded:true}});
  const entries={'pinmap.v3':payload,'pinmap.v2':payload,'pinmap.dev.v1':payload};
  const app=boot('development',entries);
  assert.equal(app.value('items.length'),0);
  assert.equal(app.value('settings.nickname'),'');
  vm.runInContext("items.push({id:9001,title:'In-memory draft',type:'기타'});persist();",app.context);
  for(const [key,value] of Object.entries(entries))assert.equal(app.stored.get(key),value);
  const reload=boot('development',Object.fromEntries(app.stored));
  assert.equal(reload.value('items.length'),0);
  const oldLink=boot('prototype',Object.fromEntries(app.stored));
  assert.equal(oldLink.value('items.length'),0);
});
test('sample pools, map coordinates, photos and neighborhoods are absent in development',()=>{
  const {context,value}=boot('development');
  for(const [file,expression] of [
    ['map-live.js',/const savedCoords = ([\s\S]*?\n  \]);/],
    ['library.js',/const LIB_PHOTOS_BY_ID = ([\s\S]*?\n\});/],
    ['place.js',/const DONGS = ([\s\S]*?);\nconst dongOf/],
  ]) {
    const match=read(file).match(expression);assert(match,file);
    const data=vm.runInContext('('+match[1]+')',context);
    assert(data===null||Object.keys(data).length===0,file);
  }
  assert.equal(value('LEGACY_KEYS.length'),0);
  assert(read('course.js').includes("'pinmap.dev.courses.v1'"));
  assert(read('course.js').includes('else if(!PM_ENV.development)'));
});
function route(search, navigationType='navigate') {
  const frame={src:'about:blank'},replacements=[],redirects=[],removed=[];
  vm.runInNewContext(read('entry-router.js'),{
    location:{search,pathname:'/index.html',hash:'',replace:url=>redirects.push(url)},
    performance:{getEntriesByType:()=>[{type:navigationType}]},
    history:{replaceState:(state,title,url)=>replacements.push(url)},
    URLSearchParams,localStorage:{removeItem:key=>removed.push(key)},document:{querySelector:()=>frame}
  });
  return {src:frame.src,replacements,redirects,removed};
}
test('fresh links enter the authenticated account app',()=>{
  assert.equal(route('').src,'app.html?mode=development&auth=required');
  assert.deepEqual(route('').redirects,[]);
  const result=route('?mode=development&auth=required');
  assert.equal(result.src,'app.html?mode=development&auth=required');
  assert.deepEqual(result.redirects,[]);
  assert.deepEqual(result.replacements,['/index.html']);
});
test('refresh clears the local session and opens login; legacy links return to login',()=>{
  const refreshed=route('','reload');
  assert.equal(refreshed.src,'about:blank');
  assert.deepEqual(refreshed.removed,['pinmap.auth.v1']);
  assert.deepEqual(refreshed.redirects,['auth.html?screen=welcome']);
  assert.deepEqual(route('?mode=prototype').redirects,['auth.html?screen=welcome']);
  assert.deepEqual(route('?mode=development').redirects,['auth.html?screen=welcome']);
  assert.deepEqual(route('?mode=invalid').redirects,['auth.html?screen=welcome']);
  assert.deepEqual(route('?mode=development&place-test=1').redirects,['auth.html?screen=welcome']);
});
test('old account link is normalized without discarding other query parameters',()=>{
  const result=route('?mode=development&auth=required');
  assert.deepEqual(result.redirects,[]);
  assert.equal(result.src,'app.html?mode=development&auth=required');
  assert.deepEqual(result.replacements,['/index.html']);
  assert.deepEqual(route('?mode=development&auth=required&v=review','reload').redirects,['auth.html?screen=welcome']);
});

test('old place-test mode cannot enable anonymous place results',()=>{
  assert.equal(boot('development').value('PM_ENV.cloudPlaceTest'),false);
  assert.equal(boot('development&auth=required').value('PM_ENV.cloudPlaceTest'),false);
  assert.equal(boot('prototype').value('PM_ENV.cloudPlaceTest'),false);
});

test('map search updates on one character using saved places without external requests',()=>{
  const source=read('map-live.js');
  let networkCalls=0,rendered=0;
  const context=vm.createContext({page:'map',liveMap:{getCenter:()=>({lat:37.546,lng:127.043})},
    searchQuery:'',searchResults:null,PinmapContentSearch:require('../search-content.js'),
    savedPlaces:()=>[{id:1,title:'카페 A',lat:37.546,lng:127.044,saved:true},
      {id:2,title:'카페 B',lat:37.7,lng:127.1,saved:true}],
    selectCategory:()=>{},markers:()=>{rendered++;},showResults:()=>{},refreshRecentSearches:()=>{},
    fetch:()=>{networkCalls++;throw Error('Unexpected network');}});
  const search=source.slice(source.indexOf('  function searchPlaces('),source.indexOf("  document.addEventListener('click',event =>"));
  vm.runInContext(search,context);
  vm.runInContext("searchPlaces('카')",context);
  assert.deepEqual(Array.from(context.searchResults,x=>x.title),['카페 A','카페 B']);
  vm.runInContext("searchPlaces('없는 장소')",context);
  assert.equal(context.searchResults.length,0);
  assert.equal(rendered,2);
  assert.equal(networkCalls,0);
});

test('map search refreshes on every Korean IME input event',()=>{
  const source=read('map-live.js');
  const listener=source.split('\n').find(line=>line.includes("document.addEventListener('input',event=>") && line.includes('#lm-search input'));
  let onInput;
  const values=[];
  vm.runInNewContext(listener,{
    document:{addEventListener:(type,callback)=>{assert.equal(type,'input');onInput=callback;}},
    searchPlaces:value=>values.push(value)
  });
  for(const value of ['ㄱ','가','가게'])onInput({target:{matches:()=>true,value},isComposing:true});
  assert.deepEqual(values,['ㄱ','가','가게']);
});

test('empty development home keeps decorative cards and a three-path home add menu',()=>{
  // 2026-11-23: 추가 메뉴는 홈 본문 대신 하단 메뉴 가운데에서 그려요(homeAddMarkup).
  const source=read('home.js'),start=source.indexOf('const homeAddMarkup = '),end=source.indexOf('\n};',start)+3;
  const placeholderStart=source.indexOf('function emptyPickCards(){'),placeholderEnd=source.indexOf('\n/* ---------- 캘린더',placeholderStart);
  const html=vm.runInNewContext(source.slice(placeholderStart,placeholderEnd)+source.slice(start,end)+';pages.home()+homeAddMarkup();',{
    PM_ENV:{development:true,requiresAuth:true},window:{PinmapAccountLoaded:false,PinmapAccountLoadError:false},items:[],pages:{},preferences:[],interestOptions:[],homePicks:()=>[],icon:()=>'<svg></svg>',
    homeCategoryChips:()=>'',stripBar:()=>'',calWidget:()=>'<section id="calendar"></section>',subWidgets:()=>'<section>최근 저장한 목록</section>',PM_IMG:{logo:'logo.png'}
  });
  assert(html.includes('class="mainpick" data-placeholder="true" aria-hidden="true"'));
  assert.equal((html.match(/class="pick pick-placeholder"/g)||[]).length,3);
  for(const slot of ['pickimg','pickword','picktext','pickdots'])assert(html.includes('class="'+slot+'"'));
  assert(!html.includes('data-detail='));
  assert.equal((html.match(/data-action="addoptions"/g)||[]).length,1);
  assert(html.includes('class="home-add-fab t-goo-main"'));
  assert(!html.includes('저장한 콘텐츠 불러오는 중'));
  assert(html.includes('class="home-add-menu t-goo-anchor"'));
  assert.equal((html.match(/class="t-goo-blob"/g)||[]).length,3);
  assert.equal((html.match(/class="t-goo-item"/g)||[]).length,3);
  assert(html.includes('aria-expanded="false" aria-controls="home-add-options"'));
  assert(html.includes('data-action="zipimport"'));
  assert(html.includes('data-action="linkimport"'));
  assert(html.includes('data-action="screenshotimport"'));
  assert(html.includes('aria-label="첫 콘텐츠 추가"'));
  assert(html.includes('콘텐츠 추가하기'));
  assert(html.includes('공유로 저장하는 방법'));
  assert(html.includes('class="home-empty-calendar" inert aria-hidden="true"'));
  assert(!html.includes('최근 저장한 목록'));
  assert(!html.includes('선택한 관심사에 맞는 저장 콘텐츠가 아직 없어요.'));
  assert(html.indexOf('mainpick')<html.indexOf('id="calendar"'));
});
test('home replaces the first-save prompt with account content after loading',()=>{
  const source=read('home.js');
  const start=source.indexOf('function homePicks(){');
  const end=source.indexOf('function pickCard(',start);
  const context=vm.createContext({
    PM_ENV:{development:true,requiresAuth:true},items:[],preferences:[],
    libPhoto:()=>false,homeSections:{},interestOf:()=>({short:'장소'})
  });
  vm.runInContext(source.slice(start,end),context);
  assert.equal(vm.runInContext('homePicks().length',context),0);
  vm.runInContext("items=[{id:1,title:'저장한 행사',pending:false},{id:2,title:'위치 확인 중인 장소',pending:true}]",context);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(homePicks().map(p=>p.x.title))',context)),
    ['저장한 행사','위치 확인 중인 장소']);
});
