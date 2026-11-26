const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('favorites show three per group, expand separately, and use source covers for places',()=>{
  const clicks=[];
  const posts=[1,2,3,4].map(id=>({id,backendId:String(id),title:`게시물 ${id}`,category:'카페',desc:'설명',photo:`post${id}.jpg`,favorite:true}));
  const places=posts.map(post=>({id:`place:${post.id}`,backendId:`place:${post.id}`,sourceId:post.id,sourceItem:post,title:`장소 ${post.id}`,category:'카페',desc:'설명',unlocated:true,photo:'',favorite:true}));
  const context={
    pages:{},actions:{},PARENT_TAB:{},pageName:{},items:posts,page:'favorites',
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
  assert.equal((html.match(/class="fav-group-list"/g)||[]).length,2);
  assert.equal((html.match(/class="lm-drawn-place-row fav-row/g)||[]).length,6);
  assert.equal((html.match(/data-fav-more=/g)||[]).length,2);
  assert.ok(!html.includes('8개'));
  assert.match(html,/data-favitem="place:1"[\s\S]*?src="post1.jpg"/);

  const moreHandler=clicks.find(handler=>handler.toString().includes('data-fav-more'));
  moreHandler({target:{closest:selector=>selector==='[data-fav-more]'?{dataset:{favMore:'place'}}:null},stopPropagation(){}});
  html=context.pages.favorites();
  assert.equal((html.match(/class="lm-drawn-place-row fav-row/g)||[]).length,7);
  assert.match(html,/data-fav-more="place" aria-expanded="true">접기/);
  assert.match(html,/data-fav-more="post" aria-expanded="false">더보기/);
});
