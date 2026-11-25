const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../collection.js'),'utf8');
function setup(mode){
 const ctx={settings:{folderSort:mode},cfCustom:()=>['나','가'],CF_ALL:[{id:'다'}],items:[{collection:'나',folder:'다',stamp:9},{collection:'가',folder:'다',stamp:3}],savedTimestamp:x=>x.stamp,folderOf:x=>x.folder};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const CF_FOLDER_SORTS='),source.indexOf('function cfFolderToolbar(')),ctx);return ctx;
}
const folders=[{id:'나',title:'나',attr:'custom'},{id:'가',title:'가',attr:'custom'},{id:'다',title:'다'}];
test('legacy creation-order settings fall back to the current saved-time order',()=>{
 assert.deepEqual(Array.from(setup('new').cfOrderFolders(folders),x=>x.id),['나','다','가']);
 assert.deepEqual(Array.from(setup('old').cfOrderFolders(folders),x=>x.id),['나','다','가']);
});
test('folder names sort in both directions without changing source data',()=>{
 const before=JSON.stringify(folders);
 assert.deepEqual(Array.from(setup('name').cfOrderFolders(folders),x=>x.id),['가','나','다']);
 assert.deepEqual(Array.from(setup('name-desc').cfOrderFolders(folders),x=>x.id),['다','나','가']);
 assert.equal(JSON.stringify(folders),before);
});
test('recently saved ordering derives from content timestamps',()=>{
 assert.deepEqual(Array.from(setup('saved').cfOrderFolders(folders),x=>x.id),['나','다','가']);
 const oldest=setup('oldest');oldest.items=[{collection:'나',stamp:9},{collection:'가',stamp:3},{folder:'다',stamp:6}];
 assert.deepEqual(Array.from(oldest.cfOrderFolders(folders),x=>x.id),['가','다','나']);
 oldest.items=[{collection:'나',stamp:9},{folder:'다',stamp:6}];
 assert.deepEqual(Array.from(oldest.cfOrderFolders(folders),x=>x.id),['다','나','가']);
});
test('folder content counts sort in both directions, breaking ties by latest save',()=>{
 const counted=[{...folders[0],count:2},{...folders[1],count:1},{...folders[2],count:2}];
 const before=JSON.stringify(counted);
 const records=[{collection:'나',folder:'가',stamp:9},{collection:'나',folder:'가',stamp:5},{collection:'가',folder:'가',stamp:3},{collection:'',folder:'다',stamp:10},{collection:'',folder:'다',stamp:4}];
 const descending=setup('count-desc');descending.items=records;
 const ascending=setup('count-asc');ascending.items=records;
 assert.deepEqual(Array.from(descending.cfOrderFolders(counted),x=>x.id),['다','나','가']);
 assert.deepEqual(Array.from(ascending.cfOrderFolders(counted),x=>x.id),['가','다','나']);
 assert.equal(JSON.stringify(counted),before);
});
test('custom folder deletion retains content, memo and saved time',()=>{
 const items=[{id:1,collection:'나',memo:'메모',savedAt:'2026-11-01'},{id:2,collection:'가',memo:'유지'}];
 const ctx={actions:{},cfFolderToDelete:'나',settings:{customFolders:['나','가']},items,COLLECTIONS:[['나'],['가']],cfCustom:()=>ctx.settings.customFolders,afterChange(){},$:()=>({close(){}}),render(){},window:{scrollTo(){}},toast(){}};
 vm.createContext(ctx);const a=source.indexOf('actions.cfdelfolderok = () => {'),b=source.indexOf('\n};',a)+3;vm.runInContext(source.slice(a,b),ctx);ctx.actions.cfdelfolderok();
 assert.deepEqual(Array.from(ctx.settings.customFolders),['가']);assert.equal(items.length,2);assert.equal(items[0].collection,'');assert.equal(items[0].memo,'메모');assert.equal(items[0].savedAt,'2026-11-01');assert.equal(items[1].collection,'가');
});
test('the all folder stays before pinned folders in the rendered collection grid',()=>{
 const ctx={
  items:[{collection:'내 폴더'}],collection:null,
  cfQ:()=>'',cfOpenTitle:()=>'',cfMatches:()=>[{collection:'내 폴더'}],
  cfCustom:()=>['내 폴더'],cfThumbs:()=>[],cfOrderFolders:folders=>folders,
  cfFolderData:()=>[{id:'고정',title:'고정'},{id:'일반',title:'일반'}],
  cfPinned:()=>['k:고정','c:내 폴더'],cfFolderKey:folder=>(folder.attr?'c:':'k:')+folder.id,
  CF_ALL_FOLDER:{id:'전체 저장',title:'전체'},CF_EDGE:'',esc:value=>value,icon:()=>'',
  CollectionFolder:folder=>`<folder data-id="${folder.id}"></folder>`,cfFolderToolbar:()=>''
 };
 vm.createContext(ctx);
 const start=source.indexOf('const accountResultCards = function(){');
 const end=source.indexOf('resultCards = function(){',start);
 vm.runInContext(source.slice(start,end)+'\nthis.build=accountResultCards;',ctx);
 const order=[...ctx.build().matchAll(/<folder data-id="([^"]+)"><\/folder>/g)].map(match=>match[1]);
 assert.deepEqual(order,['전체 저장','고정','내 폴더','일반']);
});
