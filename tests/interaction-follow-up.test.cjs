const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('detail return focuses the replacement card, not its detached original or another copy',()=>{
  const source=fs.readFileSync('app.js','utf8');
  const open=source.slice(source.indexOf('let detailReturnTarget='),source.indexOf('function toast('));
  const back=source.slice(source.indexOf('  back: () => {'),source.indexOf('  clear: () =>')).replace('back:','back =').trim().replace(/,$/,';');
  function button(id,kind,key=null){return {
    getAttribute:name=>({'data-detail':id,'data-place-key':key}[name]??null),
    classList:{0:kind,contains:value=>value===kind},matches:()=>true,
    focus(){this.focused=true;}
  };}
  const original=button('9','pick'),other=button('9','rcard'),replacement=button('9','pick'),close=button(null,'back');
  let candidates=[];
  const context={detailId:null,window:{scrollTo(){}},requestAnimationFrame:fn=>fn(),
    document:{activeElement:original,querySelector:()=>close,querySelectorAll:()=>candidates},
    render(){candidates=[other,replacement];}};
  vm.createContext(context);vm.runInContext(open+'\n'+back,context);
  vm.runInContext('openDetail(9);back();',context);
  assert.equal(close.focused,true);
  assert.equal(replacement.focused,true);
  assert.equal(original.focused,undefined);
  assert.equal(other.focused,undefined);
  assert.equal(context.detailId,null);
});

test('map connection errors remain visible and normal counts stay quiet',()=>{
  const source=fs.readFileSync('map-live.js','utf8');
  const fn=source.match(/  function status\(message\) \{[^\n]+/)[0];
  const el={};const context={$:()=>el};vm.createContext(context);vm.runInContext(fn,context);
  for(const message of ['검색 연결을 확인해 주세요. 저장한 장소명으로 다시 검색할 수 있어요.','검색어를 2자 이상 입력해 주세요.','실제 장소를 검색하고 있어요…']){
    context.message=message;vm.runInContext('status(message)',context);assert.equal(el.hidden,false);assert.equal(el.textContent,message);
  }
  vm.runInContext("status('6개 저장 장소')",context);assert.equal(el.hidden,true);
});
