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
  const records = [eventRecord, {...eventRecord,id:'11',source_url:'https://www.instagram.com/p/second/'},
    {...eventRecord,id:'12',source_url:'https://www.instagram.com/p/third/'}];
  const sdk = {auth:{getUser:async()=>({data:{user:{id:'user-a'}}}),
    getSession:async()=>({data:{session:{access_token:'token'}}}),onAuthStateChange:()=>{}}};
  let finished;
  const done = new Promise(resolve=>{finished=resolve;});
  const context = {
    PinmapFolders:require('../account-folders.js'),settings:{customFolders:[]},COLLECTIONS:[],cfCustom:()=>[],cfSyncCollections:()=>{},
    PM_ENV:{requiresAuth:true}, PinmapAuth:{ready:async()=>sdk},
    document:{addEventListener:()=>{}}, window:{}, actions:{save:()=>{}},
    items:[], detailId:null, toast:()=>{},
    render:()=>{if(context.items.length===3) finished();},
    fetch:async(path,options)=>{
      requests.push({path,method:options.method,authorization:options.headers.Authorization});
      const url = new URL(path,'https://pinmap.example');
      const limit = Number(url.searchParams.get('limit'));
      const offset = Number(url.searchParams.get('offset'));
      assert.equal(limit,2);
      const items = records.slice(offset,offset+limit);
      return {ok:true,json:async()=>({items,next_offset:items.length===limit?offset+limit:null})};
    }
  };
  vm.runInNewContext(accountSource,context);
  let timer;
  try { await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('History did not load')),1000);})]); }
  finally {clearTimeout(timer);}
  assert.deepEqual(requests.map(x=>new URL(x.path,'https://pinmap.example').searchParams.get('offset')),['0','2']);
  assert(requests.every(x=>x.authorization==='Bearer token'));
  assert.equal(context.items.length,3);
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
    PM_ENV:{requiresAuth:true},PinmapAuth:{ready:async()=>sdk},
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
      const items=records.slice(offset,offset+2);
      return {ok:true,json:async()=>({items,next_offset:items.length===2?offset+2:null})};
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
