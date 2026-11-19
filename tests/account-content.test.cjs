const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const accountSource = fs.readFileSync('account-content.js', 'utf8');
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

test('account history loads all pages using the backend page-size contract', async () => {
  const requests = [];
  let sessionReads = 0;
  const records = [eventRecord, {...eventRecord,id:'11',source_url:'https://www.instagram.com/p/second/'},
    {...eventRecord,id:'12',source_url:'https://www.instagram.com/p/third/'}];
  const sdk = {auth:{getUser:async()=>({data:{user:{id:'user-a'}}}),
    getSession:async()=>{sessionReads++;return {data:{session:{access_token:'token'}}};},onAuthStateChange:()=>{}}};
  let finished;
  const done = new Promise(resolve=>{finished=resolve;});
  const visible = [];
  const context = {
    PinmapFolders:require('../account-folders.js'),settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
    PM_ENV:{requiresAuth:true}, PinmapAuth:{ready:async()=>sdk,verifiedUser:client=>client.auth.getUser()},
    document:{addEventListener:()=>{}}, window:{}, actions:{save:()=>{}},
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
    PinmapFolders:require('../account-folders.js'),settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
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
  assert.equal(item.category,'주점');assert.equal(item.aiClassified,true);assert.equal(item.type,'맛집/카페');
  record.classification.confidence=.2;
  item=vm.runInNewContext(`${source}\npinmapAccountItem(record, 7)`,{record});
  assert.equal(item.category,'장소');assert.equal(item.aiClassified,false);
});
