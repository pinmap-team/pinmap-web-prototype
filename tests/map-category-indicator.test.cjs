const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('map-live.js','utf8');
const align=vm.runInNewContext('('+source.match(/function alignCategoryIndicator\(bar\) \{[\s\S]*?\n  \}/)[0]+')');
function position({left=0,width=60,barLeft=20,scale=1,scroll=0}){
 const values={},indicator={style:{}};
 const bar={offsetWidth:360,scrollLeft:scroll,style:{setProperty:(k,v)=>values[k]=v},getBoundingClientRect:()=>({left:barLeft,width:360*scale}),querySelector:s=>s.includes('selected')?{getBoundingClientRect:()=>({left:barLeft+(left-scroll)*scale,width:width*scale})}:indicator};
 align(bar);return{left:parseFloat(values['--lm-category-position']),width:parseFloat(indicator.style.width)};
}
test('indicator follows the rendered second button even when the source category index was different',()=>assert.deepEqual(position({left:60}),{left:60,width:60}));
test('indicator keeps the selected button center after scrolling and scaled rendering',()=>{
 const result=position({left:420,width:60,scale:.75,scroll:180});
 assert.deepEqual(result,{left:420,width:60});
 assert.equal(result.left-180+result.width/2,270);
});
test('empty category layouts do not emit invalid coordinates',()=>{
 align(null);assert.doesNotThrow(()=>align({querySelector:()=>null}));
});
