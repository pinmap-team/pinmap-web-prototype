const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');const policy=require('../screen-policy.js');
const read=name=>fs.readFileSync(name,'utf8');
test('only supported own screen functions can render; old aliases resolve to current screens',()=>{
 const pages=Object.fromEntries(policy.screens.map(name=>[name,()=>name]));
 for(const name of policy.screens)assert.equal(policy.resolve(name,pages),name);
 assert.equal(policy.resolve('placeset',pages),'myaddresses');assert.equal(policy.resolve('accountaccess',pages),'account');
 for(const name of ['__proto__','constructor','pushdemo','snsdemo','accounts','development','missing',null])assert.equal(policy.resolve(name,pages),'home');
 assert.equal(policy.resolve('profile',{}),'home');assert.equal(policy.resolve('profile',{profile:'not a component'}),'home');
});
test('retired actions are blocked in the account app while current actions remain available',()=>{
 for(const name of ['snsdemo','sample','pushdemo','pushallow','pushdeny','localways','location','allow','later','resetdata','accounts','accadd','accsync'])assert.equal(policy.allowsAction(name),false,name);
 for(const name of ['save','edit','linkimport','zipimport','screenshotimport','logoutask','leaveask','leaveyes','billing'])assert.equal(policy.allowsAction(name),true,name);
 for(const mode of ['account']){
  let click;const actions={},pages={placeset(){},accountaccess(){}};
  vm.runInNewContext(read('screen-access.js'),{document:{addEventListener:(name,fn)=>{if(name==='click')click=fn}},actions,pages,PinmapScreenPolicy:policy,go(){}});
  let stopped=false;click({target:{closest:()=>({dataset:{action:'snsdemo'}})},preventDefault(){},stopImmediatePropagation(){stopped=true}});
  assert(stopped,mode);assert(!Object.hasOwn(pages,'placeset'));assert(!Object.hasOwn(pages,'accountaccess'));
 }
});
test('iframe guard permits only the authenticated app route',()=>{
 function enter(search,top=false){const urls=[],style={},classes=[];const self={};vm.runInNewContext(read('app-entry-guard.js'),{window:{self,top:top?self:{location:{replace:url=>urls.push(url)}}},location:{search,hash:'',replace:url=>urls.push(url)},URLSearchParams,document:{documentElement:{style,classList:{add:value=>classes.push(value)}}}});return {urls,style,classes};}
 for(const search of ['', '?mode=development','?mode=unknown','?mode=development&place-test=1','?mode=prototype'])assert.deepEqual(enter(search).urls,['auth.html?screen=welcome']);
 assert.deepEqual(enter('?mode=development&auth=required').urls,[]);
 assert.deepEqual(enter('?mode=development&auth=required').classes,['auth-pending']);
 assert.deepEqual(enter('?mode=development&auth=required',true).urls,['index.html']);
});
test('retired assets are deleted, public documents cannot load them, and archive URLs are excluded',()=>{
 const retired=['share.js','share.css','push.js','push.css','development.js','online-place-test.js','place-report-bridge.js','pull-refresh.js'];
 for(const file of ['app.html','index.html','auth.html','checkout.html','plans.html','terms.html','privacy.html','refunds.html']){
  const html=read(file);assert(!html.includes('archive/'),file);
  for(const name of retired)assert(!new RegExp('(?:src|href)="'+name.replace('.','\\.')+'[?"\\s]').test(html),name);
 }
 for(const name of retired){assert(!fs.existsSync(name));assert(!fs.existsSync('archive/legacy-ui/'+name));}
 assert(/^archive\/$/m.test(read('.vercelignore')));
 assert(read('scripts/dev-auth-server.cjs').includes("pathname.startsWith('/archive/')"));
});
test('the public app has no fake share/permission controls or retired fallback forms',()=>{
 const source=['app.js','my.js','mypages.js','auth-app.js'].map(read).join('\n');
 for(const name of ['snsdemo','pushdemo','allow','later','location'])assert(!source.includes('data-action="'+name+'"'),name);
 assert(!source.includes('function saveDialog('));assert(!source.includes('function editDialog('));assert(!source.includes('function locationDialog('));
 assert(read('mypages.js').includes('data-action="leaveask"'));
 assert(read('auth-app.js').includes('/api/account-delete'));
 assert(read('mypages.js').includes('data-action="linkimport"'));
});
test('map is explicitly registered and removed pin/legacy location form handlers cannot return',()=>{
 const map=read('map-live.js');assert(map.includes('pages.map=content;'));
 for(const marker of ['function dropPin(',"id!=='lm-pin-form'",'data-lm="pin-confirm"','function setPinning('])assert(!map.includes(marker),marker);
 const place=read('place.js');for(const marker of ['function placeSheet(','function placeSearch(','function placeLabelSheet(','data-place-choose='])assert(!place.includes(marker),marker);
 assert(place.includes("go('myaddresses')"));
});
test('only the eight intentional HTML entry documents exist in the public root',()=>{
 assert.deepEqual(fs.readdirSync('.').filter(name=>name.endsWith('.html')).sort(),['app.html','auth.html','checkout.html','index.html','plans.html','privacy.html','refunds.html','terms.html']);
});
test('stale retired forms cannot submit or navigate even if an old embed recreates them',()=>{
 const listeners={};vm.runInNewContext(read('screen-access.js'),{document:{addEventListener:(name,fn)=>listeners[name]=fn},PinmapScreenPolicy:policy,actions:{},pages:{},go(){}});
 for(const id of ['accform','pm-newform','profileform','place-label-form','lm-pin-form']){
  let prevented=false,stopped=false;listeners.submit({target:{id},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});assert(prevented&&stopped,id);
 }
 let prevented=false;listeners.submit({target:{id:'profilepage'},preventDefault(){prevented=true},stopImmediatePropagation(){}});assert.equal(prevented,false);
});
