const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('favorites share one list, filter posts and places, and use source covers for places',()=>{
  const clicks=[];
  const posts=[1,2,3,4].map(id=>({id,backendId:String(id),title:`게시물 ${id}`,category:'카페',desc:'설명',photo:`post${id}.jpg`,favorite:true}));
  const places=posts.map(post=>({id:`place:${post.id}`,backendId:`place:${post.id}`,sourceId:post.id,sourceItem:post,title:`장소 ${post.id}`,category:'카페',desc:'설명',unlocated:true,photo:'',favorite:true}));
  const context={
    pages:{},actions:{},PARENT_TAB:{},pageName:{},items:posts,page:'favorites',settings:{favSort:'name',favOrder:[]},
    document:{addEventListener(type,handler){if(type==='click')clicks.push(handler);},querySelector(){return {focus(){}};}},
    window:{addEventListener(){}},$(){return {addEventListener(){}};},
    PinmapPlaces:{favorites:()=>places},PinmapFavorites:{toggle:()=>false},
    subHead:title=>`<h1>${title}</h1>`,esc:value=>String(value),
    libPhoto:item=>item.photo,libThumb:item=>`<img src="${item.photo}">`,
    icon:name=>name,likeHeartIcon:()=>'<svg></svg>',render(){},toast(){}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('mypages.js','utf8'),context);
  let html=context.pages.favorites();
  assert.equal((html.match(/class="fav-group-list"/g)||[]).length,1);
  assert.equal((html.match(/class="lm-drawn-place-row fav-row/g)||[]).length,8);
  assert.match(html,/data-fav-filter="post"/);
  assert.match(html,/data-fav-filter="place"/);
  assert.ok(!html.includes('8개'));
  assert.match(html,/data-favitem="place:1"[\s\S]*?src="post1.jpg"/);

  const filterHandler=clicks.find(handler=>handler.toString().includes('data-fav-filter'));
  filterHandler({target:{closest:selector=>selector==='[data-fav-filter]'?{dataset:{favFilter:'place'}}:null},stopPropagation(){}});
  html=context.pages.favorites();
  assert.equal((html.match(/class="lm-drawn-place-row fav-row/g)||[]).length,4);
  assert.match(html,/aria-selected="true" data-fav-filter="place"/);
  assert.doesNotMatch(html,/data-favitem="post:/);
});
