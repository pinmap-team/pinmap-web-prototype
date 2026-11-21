const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('favorite-state.js','utf8');

test('account favorites use stable record IDs and discard invalid duplicates',()=>{
  const favorites=require('../favorite-state.js');
  assert.deepEqual(favorites.normalize(['10','10',11,{},null,'x'.repeat(201)]),['10','11']);
  assert.deepEqual(favorites.change(['10','11'],'10',false),['11']);
  assert.deepEqual(favorites.change(['11'],'10',true),['11','10']);
});

test('prototype favorite action stores the shared item immediately',()=>{
  let saves=0;
  const context={window:{},afterChange:()=>{saves++;}};
  vm.runInNewContext(source,context);
  const item={id:42,favorite:false};
  assert.equal(context.window.PinmapFavorites.toggle(item),true);
  assert.equal(item.favorite,true);
  assert.equal(saves,1);
  assert.equal(context.window.PinmapFavorites.toggle(item),false);
  assert.equal(item.favorite,false);
  assert.equal(saves,2);
});

test('removing several prototype favorites saves once and keeps the posts',async()=>{
  let saves=0;
  const context={window:{},afterChange:()=>{saves++;}};
  vm.runInNewContext(source,context);
  const items=[{id:1,favorite:true},{id:2,favorite:true},{id:3,favorite:false}];
  assert.equal(await context.window.PinmapFavorites.removeMany(items),2);
  assert.deepEqual(items.map(item=>item.favorite),[false,false,false]);
  assert.equal(items.length,3);
  assert.equal(saves,1);
});

test('failed batch save restores every selected favorite',async()=>{
  const context={window:{}};
  vm.runInNewContext(source,context);
  const items=[{id:1,backendId:'a',favorite:true},{id:2,backendId:'b',favorite:true}];
  let requests=0;
  context.window.PinmapFavorites.connectMany(async chosen=>{
    requests++;
    assert.equal(chosen.length,2);
    throw Error('저장 실패');
  });
  await assert.rejects(context.window.PinmapFavorites.removeMany(items),/저장 실패/);
  assert.deepEqual(items.map(item=>item.favorite),[true,true]);
  assert.equal(requests,1);
});
