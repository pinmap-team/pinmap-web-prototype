const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../button-state.js');
function button(disabled=false,label='검색'){
 const attrs=new Map(label===null?[]:[['aria-label',label]]);
 return {disabled,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
}
test('busy button blocks duplicate execution and restores label and enabled state',async()=>{
 const b=button();let finish,calls=0;
 const first=run(b,()=>{calls++;return new Promise(r=>finish=r)},'검색 중');
 assert.equal(b.disabled,true);assert.equal(b.getAttribute('aria-busy'),'true');
 await run(b,()=>calls++);assert.equal(calls,1);
 finish('done');assert.equal(await first,'done');
 assert.equal(b.disabled,false);assert.equal(b.getAttribute('aria-label'),'검색');assert.equal(b.getAttribute('aria-busy'),null);
});
test('failed request releases the button; absent labels and original disabled controls are preserved',async()=>{
 const b=button(false,null);await assert.rejects(run(b,async()=>{throw Error('offline')}),/offline/);
 assert.equal(b.disabled,false);assert.equal(b.getAttribute('aria-label'),null);
 let ran=false;await run(button(true),()=>ran=true);assert.equal(ran,false);
});
