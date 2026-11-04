const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../collection.js'),'utf8');
function setup(mode){
 const ctx={settings:{folderSort:mode},cfCustom:()=>['나','가'],CF_ALL:[{id:'다'}],items:[{collection:'나',folder:'다',stamp:9},{collection:'가',folder:'다',stamp:3}],savedTimestamp:x=>x.stamp,folderOf:x=>x.folder};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function cfOrderFolders('),source.indexOf('function cfFolderToolbar(')),ctx);return ctx;
}
const folders=[{id:'나',title:'나',attr:'custom'},{id:'가',title:'가',attr:'custom'},{id:'다',title:'다'}];
test('folder creation order uses existing custom order and leaves category folders last',()=>{
 assert.deepEqual(Array.from(setup('new').cfOrderFolders(folders),x=>x.id),['가','나','다']);
 assert.deepEqual(Array.from(setup('old').cfOrderFolders(folders),x=>x.id),['나','가','다']);
});
test('folder names sort in both directions without changing source data',()=>{
 const before=JSON.stringify(folders);
 assert.deepEqual(Array.from(setup('name').cfOrderFolders(folders),x=>x.id),['가','나','다']);
 assert.deepEqual(Array.from(setup('name-desc').cfOrderFolders(folders),x=>x.id),['다','나','가']);
 assert.equal(JSON.stringify(folders),before);
});
test('recently saved ordering derives from content timestamps',()=>{
 assert.deepEqual(Array.from(setup('saved').cfOrderFolders(folders),x=>x.id),['나','다','가']);
});
test('custom folder deletion retains content, memo and saved time',()=>{
 const items=[{id:1,collection:'나',memo:'메모',savedAt:'2026-11-01'},{id:2,collection:'가',memo:'유지'}];
 const ctx={actions:{},cfFolderToDelete:'나',settings:{customFolders:['나','가']},items,COLLECTIONS:[['나'],['가']],cfCustom:()=>ctx.settings.customFolders,afterChange(){},$:()=>({close(){}}),render(){},window:{scrollTo(){}},toast(){}};
 vm.createContext(ctx);const a=source.indexOf('actions.cfdelfolderok = () => {'),b=source.indexOf('\n};',a)+3;vm.runInContext(source.slice(a,b),ctx);ctx.actions.cfdelfolderok();
 assert.deepEqual(Array.from(ctx.settings.customFolders),['가']);assert.equal(items.length,2);assert.equal(items[0].collection,'');assert.equal(items[0].memo,'메모');assert.equal(items[0].savedAt,'2026-11-01');assert.equal(items[1].collection,'가');
});
