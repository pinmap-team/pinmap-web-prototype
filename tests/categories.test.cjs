const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const categories=require('../categories.js');
test('24 categories have the exact two Figma master exports and one catalog',()=>{
 const catalog=JSON.parse(fs.readFileSync('categories.json','utf8'));
 const masters=JSON.parse(fs.readFileSync('category-masters.json','utf8'));
 assert.equal(catalog.length,24);assert.equal(new Set(catalog.map(c=>c.id)).size,24);
 assert.deepEqual(categories.all,catalog);
 for(const m of masters){const [label,id]=m.name.split(' · ');assert.equal(categories.get(label).id,id);
 for(const state of ['Inactive','Active'])assert.equal(fs.readFileSync(`img/category/${id}-${state.toLowerCase()}.svg`,'utf8'),m.states[`State=${state}`]);}
});
test('legacy labels share one category; empty saved categories remain hidden',()=>{
 assert.deepEqual(categories.saved([]),[]);
 const posts=[{category:'카페'},{category:'카페·디저트'},{category:'팝업'},{category:'전시'},{category:'유머·밈'}];
 assert.deepEqual(categories.saved(posts).map(c=>c.id),['cafe','exhibition','humor']);
 assert.equal(categories.of({category:'unknown label'}).id,'other');
 assert.match(categories.icon('카페',true),/cafe-active.svg/);
 assert.match(categories.icon('카페',false),/cafe-inactive.svg/);
});
test('every backend category maps to its canonical label without inventing places or events',()=>{
 const source=fs.readFileSync('categories.js','utf8')+'\n'+fs.readFileSync('account-content.js','utf8').split('\nif (PM_ENV.requiresAuth)')[0];
 for(const c of categories.all){const record={id:'post',source_url:'https://www.instagram.com/p/example/',status:'extracted',content_kind:'unknown',ai_summary:'요약',classification:{source:'gemini_decisions',model:'gemini-decision-1',status:'classified',category:c.id,kind:'unknown',confidence:.95}};
 const item=vm.runInNewContext(source+'\npinmapAccountItem(record,1)',{record});
 assert.equal(item.category,c.label);assert.equal(item.aiClassified,true);assert.equal(item.events.length,0);assert.equal(item.mapLocations.length,0);}
});

test('map category chips only show categories containing saved places',()=>{
 const source=fs.readFileSync('map-live.js','utf8');
 const start=source.indexOf('const mapCategories =');
 const end=source.indexOf('  const categoryIcon',start);
 const context={PinmapCategories:categories,savedPlaces:()=>[{categoryId:'cafe'},{categoryId:'cafe'},{categoryId:'exhibition'}],items:[{category:'레시피'},{category:'쇼핑'}]};
 const actual=vm.runInNewContext(source.slice(start,end)+'\nmapCategories()',context);
 const expected=[['all','전체'],['cafe','카페'],['exhibition','전시']];
 assert.deepEqual(Array.from(actual,x=>Array.from(x)),expected);
 context.savedPlaces=()=>[];
 assert.deepEqual(Array.from(vm.runInNewContext('mapCategories()',context),x=>Array.from(x)),[['all','전체']]);
});
