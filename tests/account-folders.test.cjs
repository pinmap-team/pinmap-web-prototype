const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,change}=require('../account-folders.js');
const records=[{id:1,backendId:'a',savedAt:'2026-01-01',memo:'keep'},{id:2,backendId:'b'}];
test('folder membership survives serialized metadata and uses stable database IDs',()=>{
  let state=change(null,{type:'create',name:'주말'},records);
  state=change(state,{type:'assign',name:'주말',ids:[1]},records);
  const restored=normalize(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.assignments.a,'주말');assert.equal(restored.assignments.b,undefined);
  const changedLocalIds=records.map(x=>({...x,id:x.id+100}));
  state=change(restored,{type:'assign',name:'주말',ids:[102]},changedLocalIds);
  assert.equal(state.assignments.a,undefined);assert.equal(state.assignments.b,'주말');
});
test('removing a folder never deletes records or their saved times and notes',()=>{
  const before=JSON.stringify(records);
  const state=change({names:['주말'],assignments:{a:'주말'}},{type:'remove',name:'주말'},records);
  assert.deepEqual(state.names,[]);assert.deepEqual(Object.keys(state.assignments),[]);
  assert.equal(JSON.stringify(records),before);
});
test('invalid metadata cannot create phantom folders or inherit another account state',()=>{
  assert.equal(normalize(null).names.length,0);
  assert.equal(Object.keys(normalize({names:['실제'],assignments:{a:'없는 폴더'}}).assignments).length,0);
  assert.throws(()=>change({names:['실제']},{type:'create',name:'실제'},records),/이미/);
  assert.throws(()=>change(null,{type:'create',name:'a'.repeat(21)},records),/20/);
  assert.throws(()=>change(null,{type:'assign',name:'다른 계정'},records),/찾지/);
});
