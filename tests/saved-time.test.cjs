const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const context=vm.createContext({Date});
vm.runInContext(source.slice(source.indexOf('const SAVED_DAY'),source.indexOf('/* ---------- 일러스트')),context);
const now=Date.parse('2026-10-30T12:00:00+09:00');
const ago=days=>context.savedAgo({savedAt:new Date(now-days*86400000).toISOString()},now);
test('saved time boundaries: today, days, weeks, months, absolute date',()=>{
  for(const [days,label] of [[0,'오늘'],[1,'1일 전'],[6,'6일 전'],[7,'1주 전'],[14,'2주 전'],[30,'4주 전'],[31,'1달 전'],[60,'2달 전'],[364,'12달 전'],[365,'2025.10.30']])assert.equal(ago(days),label);
});
test('saved days follow Seoul midnight and future dates never show negative days',()=>{
  assert.equal(context.savedAgo({savedAt:'2026-10-29T14:59:00Z'},Date.parse('2026-10-29T15:01:00Z')),'1일 전');
  assert.equal(context.savedAgo({savedAt:'2026-10-31T12:00:00+09:00'},now),'오늘');
  for(const value of [undefined,null,'','bad-date'])assert.equal(context.savedAgo({savedAt:value},now),'저장일 확인 필요');
});
test('legacy time labels migrate once and retain their original anchor after reload',()=>{
  for(const [text,days] of [['어제',1],['2일 전',2],['2주 전',14],['3달 전',90],['방금',0]]){
    const item={id:1,ago:text,memo:'keep me'};context.normalizeSavedAt(item,now);
    assert.equal(Date.parse(item.savedAt),now-days*86400000);
    assert.equal(item.savedAtEstimated,true);
    const reloaded=JSON.parse(JSON.stringify(item));context.normalizeSavedAt(reloaded,now+86400000);
    assert.equal(reloaded.savedAt,item.savedAt);assert.equal(reloaded.memo,'keep me');
  }
});
test('user timestamp ids recover exact dates; valid savedAt always takes priority',()=>{
  const item={id:now-86400000,ago:'방금'};context.normalizeSavedAt(item,now);
  assert.equal(Date.parse(item.savedAt),now-86400000);assert.equal(item.savedAtEstimated,undefined);
  const dated={id:now,savedAt:'2025-01-01T00:00:00Z'};context.normalizeSavedAt(dated,now);
  assert.equal(dated.savedAt,'2025-01-01T00:00:00Z');
  const unknown={id:1,ago:'unknown'};context.normalizeSavedAt(unknown,now);assert.equal(unknown.savedAt,undefined);
});
test('recent and old sorting use timestamps, with unknown dates last',()=>{
  context.libSort='recent';context.cfHasPlaces=()=>false;
  const collection=fs.readFileSync('collection.js','utf8');
  vm.runInContext(collection.slice(collection.indexOf('function cfSort('),collection.indexOf('// 선택 모드:')),context);
  const items=[{id:1,savedAt:'2026-01-01T00:00:00Z'},{id:3},{id:2,savedAt:'2026-10-01T00:00:00Z'}];
  assert.deepEqual(Array.from(context.cfSort(items),x=>x.id),[2,1,3]);
  context.libSort='old';assert.deepEqual(Array.from(context.cfSort(items),x=>x.id),[1,2,3]);
});
