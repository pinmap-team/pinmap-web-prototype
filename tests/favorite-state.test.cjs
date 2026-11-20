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
