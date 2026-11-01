const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function focusOutHandler(){
  const source=fs.readFileSync('choice-menu.js','utf8');
  const start=source.indexOf("host.addEventListener('focusout'");
  const end=source.indexOf('\n      });',start)+10;
  let handler,closes=0;
  const inside={inside:true},outside={inside:false};
  vm.runInNewContext(source.slice(start,end),{
    host:{addEventListener:(name,callback)=>handler=callback,contains:target=>target.inside===true},
    closeMenus:()=>closes++
  });
  return {fire:relatedTarget=>handler({relatedTarget}),inside,outside,closes:()=>closes};
}
test('Safari pointer blur keeps category options present until their click',()=>{
  const menu=focusOutHandler();menu.fire(null);assert.equal(menu.closes(),0);
});
test('keyboard focus can move inside options and closes the menu on leaving',()=>{
  const menu=focusOutHandler();menu.fire(menu.inside);assert.equal(menu.closes(),0);
  menu.fire(menu.outside);assert.equal(menu.closes(),1);
});
