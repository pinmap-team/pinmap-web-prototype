const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function editor(folder,collection,overrides={}){
  const source=fs.readFileSync('app.js','utf8');
  const marker=source.indexOf("else if(e.target.id==='editform')");
  const start=source.indexOf('    e.preventDefault();',marker);
  const end=source.indexOf('\n  }\n});',start);
  const item={id:1,type:'여행',category:'여행',title:'Original place',address:'서울',memo:'Keep memo',collection:'',...overrides};
  const before=structuredClone(item);
  const settings={customFolders:['내 장소']};
  let closed=0,saved=0,synced=0,error='';
  const fields={folder,collection,type:item.type,title:item.title,address:item.address,memo:item.memo};
  const context={
    items:[item],detailId:1,settings,
    FormData:class{get(key){return fields[key]??null;}},
    e:{preventDefault(){},target:{}},
    cfCustom:()=>settings.customFolders,
    folderOf:x=>x.folderCategory||x.type,
    CF_ALL:['맛집','카페','여행','전시·팝업','쇼핑','레시피','기타'].map(id=>({id})),
    shortType:x=>x,typeOf:()=>({art:'sea'}),isPlace:x=>['여행','맛집·카페','전시·팝업'].includes(x.type),
    cfSyncCollections:()=>synced++,render(){},toast(){},afterChange:()=>saved++,
    $:selector=>selector==='#sheet'?{close:()=>closed++}:selector==='#es-folder-error'?{set textContent(value){error=value;}}:{focus(){}}
  };
  vm.runInNewContext('(function(){'+source.slice(start,end)+'})()',context);
  return {item,before,folders:settings.customFolders,closed,saved,synced,error};
}
test('edit moves to an existing custom folder without changing content type or memo',()=>{
  const r=editor('custom:내 장소','내 장소');
  assert.equal(r.item.collection,'내 장소');assert.equal(r.item.type,'여행');assert.equal(r.item.memo,'Keep memo');
  assert.equal(r.folders.length,1);assert.equal(r.saved,1);assert.equal(r.closed,1);
});
test('new folder is created and selected only when edit is submitted',()=>{
  const r=editor('new:','  주말 후보  ');
  assert.equal(r.item.collection,'주말 후보');assert(r.folders.includes('주말 후보'));assert.equal(r.synced,1);assert.equal(r.saved,1);
});
test('existing custom name is reused without a duplicate folder',()=>{
  const r=editor('new:','내 장소');assert.equal(r.folders.length,1);assert.equal(r.item.collection,'내 장소');
});
test('empty and reserved folder names reject submission before mutating saved data',()=>{
  for(const name of ['   ','카페','전체']){
    const r=editor('new:',name);assert.deepEqual(r.item,r.before);assert.equal(r.saved,0);assert.equal(r.closed,0);assert(r.error);
  }
});
test('moving from a custom folder to a category clears the collection and fixes cafe classification',()=>{
  const r=editor('category:카페','내 장소',{collection:'내 장소'});
  assert.equal(r.item.folderCategory,'카페');assert.equal(r.item.type,'맛집·카페');assert.equal(r.item.collection,'');
});
