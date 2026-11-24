const {test}=require('node:test');
const assert=require('node:assert/strict');
const zip=require('../vendor/fflate.js');
const parser=require('../zip-parser.js');
const createQueue=require('../zip-import.js');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const ENTRY='your_instagram_activity/saved/saved_posts.json';
const post=url=>({label_values:[{label:'URL',href:url}]});
const archive=(records,name=ENTRY)=>zip.zipSync({[name]:zip.strToU8(JSON.stringify(records))});

test('Instagram ZIP reads only saved post links, normalizes and deduplicates them',()=>{
  const result=parser.parseBytes(archive([
    post('https://www.instagram.com/p/abc123/?igsh=tracking'),
    post('https://instagram.com/p/abc123/'),
    post('https://www.instagram.com/reel/def456/'),
    post('https://example.com/private')
  ]));
  assert.deepEqual(result.urls,['https://www.instagram.com/p/abc123/',
    'https://www.instagram.com/reel/def456/']);
  assert.equal(result.exported,4);
  assert.equal(result.duplicates,2);
  assert.deepEqual(parser.parseBytes(archive([post('https://instagram.com/p/abc123/')],
    'instagram-user-2026/your_instagram_activity/saved/saved_posts.json')).urls,
    ['https://www.instagram.com/p/abc123/']);
});

test('ZIP rejects missing, duplicate, malformed and oversized saved post lists',()=>{
  assert.throws(()=>parser.parseBytes(zip.zipSync({'other.json':zip.strToU8('[]')})),/목록/);
  assert.throws(()=>parser.parseBytes(archive({invalid:true})),/목록/);
  assert.throws(()=>parser.parseBytes(archive([post('https://example.com/')])) ,/링크/);
  assert.throws(()=>parser.parseBytes(new Uint8Array([1,2,3])),/ZIP/);
});

test('ZIP import saves sequentially, skips saved links and resumes after a quota pause',async()=>{
  const values=new Map(), storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const urls=['https://www.instagram.com/p/one/','https://www.instagram.com/p/two/',
    'https://www.instagram.com/p/three/'];
  let blocked=true;
  const sent=[];
  const account={userId:()=> 'user-a',loaded:()=>true,knownUrls:()=>[urls[0]],
    importLink:async url=>{sent.push(url);if(blocked)throw Error('이번 달 분석 한도');return {contentKind:'place',status:'extracted'};},
    refresh:async()=>{}};
  const changes=[];
  const options={storage,account,canonical:parser.canonical,publish:state=>changes.push(state)};
  const queue=createQueue(options);
  await queue.start(urls,'saved.zip');
  assert.equal(queue.state().phase,'paused');
  assert.equal(queue.state().processed,1);
  assert.equal(queue.state().skipped,1);
  assert.match(queue.state().error,/한도/);
  assert.deepEqual(sent,[urls[1]]);
  blocked=false;
  const restored=createQueue(options);
  restored.attach('user-a');
  await restored.resume();
  assert.equal(restored.state().phase,'done');
  assert.equal(restored.state().processed,3);
  assert.equal(restored.state().saved,2);
  assert.deepEqual(restored.state().entries.map(entry=>entry.status),['skipped','saved','saved']);
  assert.deepEqual(sent,[urls[1],urls[1],urls[2]]);
  assert(changes.some(state=>state?.phase==='done'));
});

test('multiple pasted links use the same queue and report their source and counts',async()=>{
  const values=new Map(), storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const one='https://www.instagram.com/p/one/';
  const two='https://www.instagram.com/p/two/';
  const sent=[];
  const queue=createQueue({storage,canonical:parser.canonical,
    account:{userId:()=> 'user-b',loaded:()=>true,knownUrls:()=>[one],
      importLink:async url=>{sent.push(url);return {contentKind:'event',status:'extracted'};}},
    publish:()=>{}});
  await queue.start([one,two,two],'링크 3개');
  assert.equal(queue.state().source,'links');
  assert.equal(queue.state().phase,'done');
  assert.equal(queue.state().total,2);
  assert.equal(queue.state().saved,1);
  assert.equal(queue.state().skipped,1);
  assert.deepEqual(sent,[two]);
});

test('forget removes a running ZIP job and does not restore it after the active request settles',async()=>{
  const values=new Map();
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),
    removeItem:key=>values.delete(key)};
  const urls=['https://www.instagram.com/p/one/','https://www.instagram.com/p/two/'];
  let settle;
  const started=new Promise(resolve=>{settle=resolve;});
  let complete;
  const request=new Promise(resolve=>{complete=resolve;});
  const sent=[];
  const account={userId:()=> 'user-c',loaded:()=>true,knownUrls:()=>[],
    importLink:async url=>{sent.push(url);settle();await request;return {contentKind:'place',status:'extracted'};}};
  const queue=createQueue({storage,account,canonical:parser.canonical});
  const running=queue.start(urls,'saved.zip');
  await started;
  assert.equal(queue.forget(),true);
  assert.equal(queue.state(),null);
  assert.equal(values.size,0);
  complete();
  await running;
  assert.deepEqual(sent,[urls[0]]);
  assert.equal(values.size,0);
  const restored=createQueue({storage,account,canonical:parser.canonical});
  restored.attach('user-c');
  assert.equal(restored.state(),null);
});

test('ZIP importer initializes in the login app mode',()=>{
  const listeners=new Map();
  const window={
    addEventListener:(name,handler)=>listeners.set(name,handler),
    dispatchEvent:()=>{},
    PinmapAccountLoaded:false
  };
  const context=vm.createContext({window,document:{},localStorage:{getItem:()=>null,setItem:()=>{}},
    CustomEvent:class {constructor(name,options){this.type=name;this.detail=options.detail;}}});
  vm.runInContext('const PM_ENV = {requiresAuth:true};',context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../zip-import.js'),'utf8'),context);
  assert.equal(typeof window.PinmapZipImport?.start,'function');
  assert(listeners.has('pinmap:account-loaded'));
});
