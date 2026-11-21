const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const accountSource = fs.readFileSync('categories.js','utf8')+'\n'+fs.readFileSync('account-content.js', 'utf8');
const eventRecord = {
  id:'10', source_url:'https://www.instagram.com/p/Dfvw0zmE3kW/',
  content_kind:'event', status:'needs_review', created_at:'2026-11-16T00:00:00Z',
  ai_title:'전시 모음', events:[
    {title:'첫 전시',event_type:'exhibition',start_date:'2026-12-11',end_date:'2027-04-11',
      date_text:'26.12.11~27.04.11',venue_name:'서울 전시관',needs_review:true},
    {title:'둘째 전시',date_text:'12.11~04.11',venue_name:'부산 전시관',needs_review:true}
  ], places:[], map_locations:[]
};

test('event-only account content keeps schedules separate from map pins', () => {
  const source = accountSource.split('\nif (PM_ENV.requiresAuth)')[0];
  const item = vm.runInNewContext(`${source}\npinmapAccountItem(record, 7)`, {record:eventRecord});
  assert.equal(item.type, '전시/팝업');
  assert.equal(item.contentKind, 'event');
  assert.equal(item.extractedPlaceCount, 0);
  assert.equal(item.mapLocations.length, 0);
  assert.equal(item.pending, false);
  assert.equal(item.events.length, 2);
  assert.equal(item.events[0].start_date, '2026-12-11');
  assert.equal(item.events[0].end_date, '2027-04-11');
});

test('summary-only account content uses AI category without creating a place or schedule', () => {
  const source=accountSource.split('\nif (PM_ENV.requiresAuth)')[0];
  for(const [category,type] of [['travel','여행'],['shopping','쇼핑'],['recipe','레시피'],['lifestyle','생활 정보']]) {
    const record={...eventRecord,content_kind:'unknown',status:'extracted',places:[],events:[],
      ai_title:'일상의 아이디어',ai_summary:'게시물의 주요 내용을 요약했어요.',
      classification:{source:'gemini_decisions',model:'gemini-decision-1',status:'classified',
        kind:'unknown',category,confidence:.93}};
    const item=vm.runInNewContext(`${source}\npinmapAccountItem(record, 7)`,{record});
    assert.equal(item.type,type);
    assert.equal(item.category,require('../categories.js').get(category).label);
    assert.equal(item.contentKind,'unknown');
    assert.equal(item.status,'extracted');
    assert.equal(item.desc,'게시물의 주요 내용을 요약했어요.');
    assert.equal(item.aiClassified,true);
    assert.equal(item.mapLocations.length,0);
    assert.equal(item.events.length,0);
    assert.equal(item.pending,false);
  }
});

test('account edits and direct pins survive account reload and can be removed', async () => {
  let metadata={};
  const record={...eventRecord,id:'place-1',content_kind:'place',events:[],places:[{name:'카페'}],map_locations:[]};
  const sdk={auth:{
    getUser:async()=>({data:{user:{id:'user-a',user_metadata:metadata}}}),
    updateUser:async({data})=>{metadata={...metadata,...data};return {data:{user:{id:'user-a',user_metadata:metadata}}};},
    getSession:async()=>({data:{session:{access_token:'token'}}}),onAuthStateChange:()=>{}
  }};
  const context={PinmapFolders:require('../account-folders.js'),PinmapFavorites:require('../favorite-state.js'),
    PinmapAccountMapData:require('../account-map-data.js'),PM_ENV:{requiresAuth:true},
    PinmapAuth:{ready:async()=>sdk,verifiedUser:client=>client.auth.getUser()},
    window:{},document:{addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null},
    actions:{save:()=>{}},settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
    items:[],detailId:null,render:()=>{},toast:()=>{},crypto:require('node:crypto'),
    fetch:async(path,options)=>({ok:true,json:async()=>options.method==='GET'
      ? {items:new URL(path,'https://pinmap.example').searchParams.get('offset')==='0'?[record]:[],next_offset:null}
      : {deleted:true}})
  };
  vm.runInNewContext(accountSource,context);
  for(let attempt=0;attempt<30&&!context.window.PinmapAccountLoaded;attempt++)
    await new Promise(resolve=>setImmediate(resolve));
  assert(context.window.PinmapAccountLoaded);
  const original=context.items[0];
  await context.window.PinmapContentPersistence.saveEdit(original,
    {...original,title:'수정한 카페',address:'서울 송파구 올림픽로 424',category:'카페',
      memo:'직접 확인',lat:37.5,lng:127.1,mapLocations:[{name:'수정한 카페',address:'서울 송파구 올림픽로 424',coordinates:{lat:37.5,lng:127.1}}]},
    {folder:'category:카페'});
  const pin={id:123,title:'직접 찍은 핀',address:'서울 성동구',type:'여행',memo:'산책',
    lat:37.55,lng:127.04,savedAt:'2026-11-20T01:00:00Z'};
  await context.window.PinmapContentPersistence.savePin(pin);
  assert.equal(metadata.pinmap_manual_pins.length,1);
  metadata.pinmap_favorites=['manual:'+pin.manualId];
  metadata.pinmap_memos={...metadata.pinmap_memos,['manual:'+pin.manualId]:'산책'};
  metadata.pinmap_collections={names:['여행 후보'],assignments:{['manual:'+pin.manualId]:'여행 후보'}};
  await context.window.PinmapAccountContent.refresh();
  assert.equal(context.items.length,2);
  assert.equal(context.items.find(item=>item.backendId==='place-1').address,'서울 송파구 올림픽로 424');
  assert.equal(context.items.find(item=>item.backendId==='place-1').memo,'직접 확인');
  const restoredPin=context.items.find(item=>item.manualId===pin.manualId);
  assert.equal(restoredPin.mapLocations[0].coordinates.lng,127.04);
  await context.window.PinmapAccountContent.remove(restoredPin);
  assert.equal(metadata.pinmap_manual_pins.length,0);
  assert.equal(metadata.pinmap_favorites.length,0);
  assert.equal(metadata.pinmap_memos['manual:'+pin.manualId],undefined);
  assert.equal(metadata.pinmap_memos['place-1'],'직접 확인');
  assert.equal(Object.keys(metadata.pinmap_collections.assignments).length,0);
  assert.equal(context.items.length,1);
});

test('account history loads all pages using the backend page-size contract', async () => {
  const requests = [];
  let sessionReads = 0;
  const records = [eventRecord, {...eventRecord,id:'11',source_url:'https://www.instagram.com/p/second/'},
    {...eventRecord,id:'12',source_url:'https://www.instagram.com/p/third/'}];
  const profileUpdates=[];
  const sdk = {auth:{getUser:async()=>({data:{user:{id:'user-a',user_metadata:{pinmap_favorites:['10']}}}}),
    updateUser:async payload=>{profileUpdates.push(payload);return {data:{user:{id:'user-a'}}};},
    getSession:async()=>{sessionReads++;return {data:{session:{access_token:'token'}}};},onAuthStateChange:()=>{}}};
  let finished;
  const done = new Promise(resolve=>{finished=resolve;});
  const visible = [];
  const submitHandlers=[];
  const context = {
    PinmapFolders:require('../account-folders.js'),PinmapFavorites:require('../favorite-state.js'),PinmapAccountMapData:require('../account-map-data.js'),settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
    PM_ENV:{requiresAuth:true}, PinmapAuth:{ready:async()=>sdk,verifiedUser:client=>client.auth.getUser()},
    document:{addEventListener:(type,handler)=>{if(type==='submit')submitHandlers.push(handler);},getElementById:()=>({close:()=>{}})}, window:{}, actions:{save:()=>{}},
    FormData:class{get(){return '현장 메모';}},
    items:[], detailId:null, toast:()=>{},
    render:()=>{visible.push({count:context.items.length,loaded:context.window.PinmapAccountLoaded});if(context.items.length===3) finished();},
    fetch:async(path,options)=>{
      requests.push({path,method:options.method,authorization:options.headers.Authorization});
      const url = new URL(path,'https://pinmap.example');
      const limit = Number(url.searchParams.get('limit'));
      const offset = Number(url.searchParams.get('offset'));
      assert.equal(limit,offset===0?1:2);
      const items = records.slice(offset,offset+limit);
      return {ok:true,json:async()=>({items,next_offset:items.length===limit?offset+limit:null})};
    }
  };
  vm.runInNewContext(accountSource,context);
  let timer;
  try { await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('History did not load')),1000);})]); }
  finally {clearTimeout(timer);}
  assert.deepEqual(requests.map(x=>new URL(x.path,'https://pinmap.example').searchParams.get('offset')),['0','1','3']);
  assert(requests.every(x=>x.authorization==='Bearer token'));
  assert.equal(sessionReads,1);
  assert(visible.findIndex(x=>x.count===0)<visible.findIndex(x=>x.count===1));
  assert(visible.findIndex(x=>x.count===1)<visible.findIndex(x=>x.count===3));
  assert(visible.some(x=>x.count===1 && x.loaded===false));
  assert.equal(context.items.length,3);
  assert.equal(context.items[0].favorite,true);
  assert.equal(context.items[1].favorite,false);
  await context.window.PinmapAccountProfile.save({nickname:'테스트 이름'});
  assert.equal(context.settings.nickname,'테스트 이름');
  assert.equal(profileUpdates[0].data.pinmap_profile.nickname,'테스트 이름');
  await context.window.PinmapAccountProfile.save({avatar:'data:image/jpeg;base64,AA=='});
  assert.equal(profileUpdates[1].data.pinmap_profile.avatar,'data:image/jpeg;base64,AA==');
  await context.window.PinmapContentPersistence.saveEdit(context.items[0],
    {...context.items[0],memo:'현장 메모'}, {folder:'category:전시'});
  assert.equal(context.items[0].memo,'현장 메모');
  assert.equal(profileUpdates[2].data.pinmap_memos['10'],'현장 메모');
  context.items[1].favorite=true;
  await context.PinmapFavorites.removeMany([context.items[0],context.items[1]]);
  assert.equal(profileUpdates.length,4);
  assert.deepEqual(Array.from(profileUpdates[3].data.pinmap_favorites),[]);
  assert.equal(context.items[0].favorite,false);
  assert.equal(context.items[1].favorite,false);
});

test('account pages load concurrently but keep saved order', async () => {
  const source = accountSource.split('\nif (PM_ENV.requiresAuth)')[0];
  const records = Array.from({length:12},(_,index)=>({id:index}));
  let active = 0, peak = 0;
  const requestPage = async (offset,limit) => {
    active++; peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,offset===3?15:1));
    active--;
    const items=records.slice(offset,offset+limit);
    return {items,next_offset:items.length===limit?offset+limit:null};
  };
  const seen=[];
  const result = await vm.runInNewContext(`${source}\npinmapReadAccountPages(requestPage, item => seen.push(item.id))`,{requestPage,seen});
  assert.deepEqual(Array.from(result,item=>item.id),records.map(item=>item.id));
  assert.deepEqual(seen,records.map(item=>item.id));
  assert.equal(peak,4);
});

test('the first saved post appears before later page requests complete', async () => {
  const source=accountSource.split('\nif (PM_ENV.requiresAuth)')[0];
  let releaseLater;
  const later=new Promise(resolve=>{releaseLater=resolve;});
  const seen=[];
  const requestPage=async (offset,limit) => {
    if (offset===0) return {items:[{id:1}],next_offset:1};
    await later;
    return {items:[],next_offset:null};
  };
  const loading=vm.runInNewContext(`${source}\npinmapReadAccountPages(requestPage, item => seen.push(item.id))`,{requestPage,seen});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(seen,[1]);
  releaseLater();
  await loading;
});

test('bulk removal deletes on the server and keeps failed records visible', async () => {
  const records = [eventRecord,{...eventRecord,id:'11',source_url:'https://www.instagram.com/p/second/'}];
  const sdk = {auth:{getUser:async()=>({data:{user:{id:'user-a'}}}),
    getSession:async()=>({data:{session:{access_token:'token'}}}),onAuthStateChange:()=>{}}};
  let finished;
  const done = new Promise(resolve=>{finished=resolve;});
  const toasts = [], deletes = [];
  const context = {
    PinmapFolders:require('../account-folders.js'),PinmapFavorites:require('../favorite-state.js'),PinmapAccountMapData:require('../account-map-data.js'),settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
    PM_ENV:{requiresAuth:true},PinmapAuth:{ready:async()=>sdk,verifiedUser:client=>client.auth.getUser()},
    document:{addEventListener:()=>{},getElementById:()=>({close:()=>{}}),querySelector:()=>null},
    window:{},actions:{save:()=>{}},items:[],detailId:null,cfSel:null,
    toast:message=>toasts.push(message),render:()=>{if(context.items.length===2) finished();},
    fetch:async(path,options)=>{
      if(options.method==='DELETE') {
        const url=JSON.parse(options.body).url;deletes.push(url);
        if(url.endsWith('/second/')) throw Error('offline');
        return {ok:true,json:async()=>({deleted:true})};
      }
      const url=new URL(path,'https://pinmap.example');
      const offset=Number(url.searchParams.get('offset'));
      const limit=Number(url.searchParams.get('limit'));
      const items=records.slice(offset,offset+limit);
      return {ok:true,json:async()=>({items,next_offset:items.length===limit?offset+limit:null})};
    }
  };
  vm.runInNewContext(accountSource,context);
  let timer;
  try {await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('History did not load')),1000);})]);}
  finally {clearTimeout(timer);}
  await context.window.PinmapAccountContent.removeMany([...context.items]);
  assert.equal(deletes.length,2);
  assert.equal(context.items.length,1);
  assert.equal(context.items[0].url,'https://www.instagram.com/p/second/');
  assert.match(toasts.at(-1),/1개는 삭제하지 못해 목록에 남겼어요/);
});

test('only fully dated extracted events appear on the calendar', () => {
  const items = [{id:7,title:'전시 모음',events:eventRecord.events,art:'exhibit',photo:'',desc:'',contentKind:'event'}];
  const context = {NAV:[],pageName:{},items,settings:{calSeeded:true},PM_ENV:{development:true},
    afterChange:()=>{},render:()=>{},pages:{},actions:{},document:{addEventListener:()=>{}},
    Date,Number,Math};
  vm.runInNewContext(fs.readFileSync('calendar.js','utf8'),context);
  const entries = vm.runInNewContext('calDueList().map(x=>({title:x.title,eventDate:x.eventDate,eventCandidate:x.eventCandidate}))',context);
  assert.equal(entries.length,2);
  assert.deepEqual(Array.from(entries,x=>x.eventDate),['2026-12-11','2027-04-11']);
  assert(entries.every(x=>x.eventCandidate));
});

test('account category uses trusted Decisions result and keeps old records compatible', () => {
  const source=accountSource.split('\nif (PM_ENV.requiresAuth)')[0];
  const record={...eventRecord,content_kind:'place',events:[],places:[{name:'테스트 바'}],classification:{source:'gemini_decisions',model:'gemini-decision-1',status:'classified',kind:'place',category:'bar',confidence:.95}};
  let item=vm.runInNewContext(`${source}\npinmapAccountItem(record, 7)`,{record});
  assert.equal(item.category,'맛집');assert.equal(item.aiClassified,true);assert.equal(item.type,'맛집/카페');
  record.classification.confidence=.2;
  item=vm.runInNewContext(`${source}\npinmapAccountItem(record, 7)`,{record});
  assert.equal(item.category,'분류보류');assert.equal(item.aiClassified,false);
});
