const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.PINMAP_BROWSER_ORIGIN||'http://127.0.0.1:8093';
const output=process.env.PINMAP_CHECK_OUTPUT||require('node:os').tmpdir();
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PINMAP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:402,height:874},hasTouch:true});
 let metadata={},getCount=0,delay=600,fail=false,failFolder=false;
 const records=[{id:'one',source_url:'https://www.instagram.com/p/Test/',ai_title:'테스트 전시',content_kind:'event',events:[{title:'전시',event_type:'exhibition'}],created_at:'2026-11-17T00:00:00Z'}];
 await context.route('**/__test-user',async r=>{
   if(r.request().method()==='POST'){
     if(failFolder)return r.fulfill({status:500,contentType:'application/json',body:'{"error":{"message":"저장 실패 테스트"}}'});
     metadata={...metadata,...r.request().postDataJSON().data};
   }
   return r.fulfill({contentType:'application/json',body:JSON.stringify({data:{user:{id:'test-account',email:'test@example.com',user_metadata:metadata}}})});
 });
 await context.route('**/vendor/supabase.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getUser:async()=>fetch('/__test-user').then(r=>r.json()),updateUser:async data=>fetch('/__test-user',{method:'POST',body:JSON.stringify(data)}).then(r=>r.json()),getSession:async()=>({data:{session:{access_token:'x'.repeat(30)}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};`}));
 await context.route('**/api/auth/config',r=>r.fulfill({contentType:'application/json',body:'{"url":"https://example.supabase.co","publishableKey":"pk_test"}'}));
 await context.route('**/api/map-config',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await context.route('**/api/content-save*',async r=>{
   getCount++;await new Promise(resolve=>setTimeout(resolve,delay));
   return r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{error:'unavailable'}:{items:records,next_offset:null})});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   if(window.DeviceOrientationEvent)window.DeviceOrientationEvent.requestPermission=async()=> 'granted';
   window.__watches=new Map();window.__geoMode='success';window.__watchCounter=0;
   Object.defineProperty(navigator,'geolocation',{value:{
     watchPosition(success,error){const id=++window.__watchCounter;window.__watches.set(id,{success,error});setTimeout(()=>{
       if(!window.__watches.has(id))return;
       if(window.__geoMode==='denied')error({code:1});
       else success({coords:{latitude:37.5,longitude:127.1,accuracy:5},timestamp:Date.now()});
     },30);return id;},clearWatch(id){window.__watches.delete(id);}
   }});
 });
 const open=async()=>{
   await page.goto(origin+'/index.html?mode=development&auth=required');
   return page.frameLocator('.phone-frame');
 };
 const pull=async(frame,dy=160,dx=0,cancel=false)=>frame.locator('.main').evaluate((node,{dy,dx,cancel})=>{
   window.scrollTo(0,0);
   const fire=(type,x,y)=>node.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,
     touches:type==='touchend'||type==='touchcancel'?[]:[new Touch({identifier:1,target:node,clientX:x,clientY:y})]}));
   fire('touchstart',20,130);fire('touchmove',20+dx,130+dy);fire(cancel?'touchcancel':'touchend',20+dx,130+dy);
 },{dy,dx,cancel});
 try{
   let frame=await open();
   await frame.locator('#app .pm-loading .pm-spinner').waitFor();
   assert.equal(await frame.locator('#app .pm-loading').innerText(),'');
   await frame.locator('.home-add-fab').waitFor();delay=0;
   const fab=frame.locator('.home-add-fab');
   assert.equal(await fab.innerText(),'');assert.equal(await fab.getAttribute('aria-label'),'콘텐츠 추가하기');
   const fabBefore=await fab.boundingBox();assert.equal(fabBefore.width,56);assert.equal(fabBefore.height,56);
   const mouseStart=getCount;
   await page.mouse.move(20,130);await page.mouse.down();await page.mouse.move(20,210,{steps:8});
   const pulling=await frame.locator('#app').evaluate(el=>el.getBoundingClientRect().top);
   assert(pulling>=38&&pulling<=42,'Content follows a partial drag');
   assert.equal((await fab.boundingBox()).y,fabBefore.y,'Fixed add button must not move with content');
   assert.equal(getCount,mouseStart);await page.mouse.up();await page.waitForTimeout(350);
   assert.equal(await frame.locator('#app').evaluate(el=>el.getBoundingClientRect().top),0);
   assert.equal(getCount,mouseStart,'Short mouse pulls do not refresh');
   delay=500;
   await page.mouse.move(20,130);await page.mouse.down();await page.mouse.move(20,310,{steps:12});
   await frame.locator('.pm-refresh.is-ready').waitFor();
   await page.screenshot({path:output+'/pinmap-drag-ready.png'});
   await page.mouse.up();await frame.locator('.pm-refresh[aria-busy="true"]').waitFor();
   await page.waitForTimeout(180);await page.screenshot({path:output+'/pinmap-refresh-spinning.png'});
   await frame.locator('.pm-refresh[aria-busy="true"]').waitFor({state:'hidden'});
   assert.equal(getCount,mouseStart+1);assert.equal(await frame.locator('body').evaluate(()=>detailId),null);
   await page.waitForTimeout(300);await page.mouse.move(20,130);await page.mouse.wheel(0,-180);
   await frame.locator('.pm-refresh[aria-busy="true"]').waitFor();
   for(let i=0;i<3;i++)await page.mouse.wheel(0,-90);
   await frame.locator('.pm-refresh[aria-busy="true"]').waitFor({state:'hidden'});await page.waitForTimeout(350);
   assert.equal(getCount,mouseStart+2,'Trackpad momentum must not trigger duplicate refreshes');
   assert.equal(await frame.locator('#app').evaluate(el=>el.getBoundingClientRect().top),0);
   delay=0;
   await fab.focus();await page.keyboard.press('Enter');await frame.locator('#es-url').waitFor();
   await frame.locator('.esclose').click();

   const nav=await frame.locator('.navitem').evaluateAll(nodes=>nodes.filter(n=>n.closest('.bottomnav')).map(n=>{
     const i=n.querySelector('.navicon').getBoundingClientRect(),l=n.querySelector('.pm-nav-label').getBoundingClientRect();
     return {text:n.textContent.trim(),center:Math.abs((i.left+i.right-l.left-l.right)/2),below:l.top>=i.bottom-1,height:l.height};
   }));
   assert.equal(nav.length,4);assert(nav.every(x=>x.center<1&&x.below&&x.height>0),JSON.stringify(nav));
   await frame.locator('[data-page="library"]').last().click();
   assert.equal(await frame.locator('.cf-add').count(),1);
   assert.deepEqual(await frame.locator('.cf-title').allTextContents(),['전시/팝업']);
   await frame.locator('[data-action="cftogglesearch"]').click();
   await frame.locator('#search').fill('테스트');
   assert.equal(await frame.locator('.libsearch').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   assert.equal(await frame.locator('#search').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   await page.waitForTimeout(550);await page.screenshot({path:output+'/pinmap-search-clean.png'});
   await frame.locator('[data-action="cftogglesearch"]').click();
   await frame.locator('.cf-add').click();await frame.locator('#cfname').fill('주말');
   failFolder=true;await frame.locator('#cfnewform [type="submit"]').click();
   await frame.locator('#cferr').filter({hasText:'저장 실패'}).waitFor();
   assert.equal(metadata.pinmap_collections,undefined);
   failFolder=false;await frame.locator('#cfnewform [type="submit"]').click();
   await frame.locator('[data-action="cfpick"]').click();
   await frame.locator('#cfpickform input[name="pick"]').first().check();
   await frame.locator('#cfpickok').click();await frame.locator('.cf-item').waitFor();
   assert.equal(metadata.pinmap_collections.assignments.one,'주말');
   await page.goto('about:blank');frame=await open();await frame.locator('.home-add-fab').waitFor();
   await frame.locator('[data-page="library"]').last().click();
   assert.deepEqual((await frame.locator('.cf-title').allTextContents()).sort(),['전시/팝업','주말'].sort());
   await page.waitForTimeout(550);await page.screenshot({path:output+'/pinmap-folders-mobile.png'});
   await frame.locator('[data-collection="주말"]').click();
   await frame.locator('[data-action="cfdelfolder"]').click();await frame.locator('[data-action="cfdelfolderok"]').click();
   await frame.locator('.cf-add').waitFor();assert.equal(records.length,1);assert.equal(metadata.pinmap_collections.names.length,0);
   await frame.locator('[data-page="my"]').last().click();
   assert.equal(await frame.locator('.auth-current-user').count(),0);
   assert.equal(await frame.locator('.myprofile-name svg').count(),0);
   await frame.locator('.myprofile-name').click();await frame.locator('#profilepage input').waitFor();
   await frame.locator('[data-action="profilecancel"]').click();
   await page.waitForTimeout(550);await page.screenshot({path:output+'/pinmap-profile-clean.png'});
   await frame.locator('[data-page="home"]').last().click();
   const initial=getCount;await pull(frame,50);await pull(frame,160,220);await pull(frame,160,0,true);
   await page.waitForTimeout(80);assert.equal(getCount,initial);
   delay=500;
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:20,y:130}]});
   for(const y of [150,180,220,260,300])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:20,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame.locator('.pm-refresh[aria-busy="true"]').waitFor();
   await page.waitForTimeout(220);
   console.log('refresh-visual',await frame.locator('.pm-refresh').evaluate(el=>({opacity:getComputedStyle(el).opacity,top:el.getBoundingClientRect().top,animation:getComputedStyle(el.firstElementChild).animationName})));
   await page.screenshot({path:output+'/pinmap-pull-refresh.png'});
   await frame.locator('.pm-refresh[aria-busy="true"]').waitFor({state:'hidden'});
   assert.equal(getCount,initial+1);assert.equal(await frame.locator('.pick').count(),1);
   fail=true;await pull(frame);await frame.locator('.pm-refresh[aria-busy="true"]').waitFor({state:'hidden'});
   assert.equal(await frame.locator('.pick').count(),1);fail=false;delay=0;
   await frame.locator('body').evaluate(()=>{
     window.attachPinmapBasemap=map=>{window.__map=map;};window.PinmapMapProviders={attach:()=>null};
   });
   await frame.locator('[data-page="map"]').last().click();
   await frame.locator('.lm-current-position-dot').waitFor();
   const loc=await frame.locator('body').evaluate(()=>({center:window.__map.getCenter(),title:document.querySelector('.lm-location-title').textContent}));
   assert(Math.abs(loc.center.lat-37.5)<.0001&&Math.abs(loc.center.lng-127.1)<.0001);assert.equal(loc.title,'현재 위치');
   assert.equal(await frame.locator('.lm-location-person.no-heading').count(),1);
   await frame.locator('[data-lm="locate"]').click();
   await frame.locator('body').evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute',{absolute:true,alpha:285})));
   assert.match(await frame.locator('.lm-current-position-dot').getAttribute('aria-label'),/75도/);
   await frame.locator('body').evaluate(()=>window.__map.panTo([37.6,127.2]));
   await frame.locator('[data-lm="locate"]').click();
   assert(Math.abs(await frame.locator('body').evaluate(()=>window.__map.getCenter().lat)-37.5)<.0001);
   await frame.locator('[data-page="my"]').last().click();
   assert.equal(await frame.locator('body').evaluate(()=>window.__watches.size),0);
   await frame.locator('[data-page="map"]').last().click();
   await frame.locator('body').evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute',{absolute:true,alpha:180})));
   assert.match(await frame.locator('.lm-current-position-dot').getAttribute('aria-label'),/180도/);
   await frame.locator('[data-page="my"]').last().click();
   await frame.locator('body').evaluate(()=>{window.__geoMode='denied';});
   await frame.locator('[data-page="map"]').last().click();
   await frame.locator('#snackbar').filter({hasText:'위치 접근'}).waitFor();
   // A previously verified GPS position may remain, but no watch runs after denial.
   assert.equal(await frame.locator('body').evaluate(()=>window.__watches.size),0);
   await frame.locator('[data-page="library"]').last().click();
   await page.setViewportSize({width:1440,height:960});await page.waitForTimeout(550);await page.screenshot({path:output+'/pinmap-folders-wide.png'});
   const selected=await frame.locator('.bottomnav .pm-nav-main').evaluate(el=>{const a=el.querySelector('.active').getBoundingClientRect(),b=el.querySelector('.pm-nav-indicator').getBoundingClientRect();return Math.abs(a.left+a.width/2-b.left-b.width/2);});assert(selected<2,'Active pill must center on selected tab');
   const box=await page.locator('.phone-frame').boundingBox();assert.equal(box.width,402);assert.equal(box.height,874);
   assert.deepEqual(errors,[]);
   console.log('PASS: loading, vertical nav, search focus, account folders + failure + reload, profile, pull refresh + cancel + failure, GPS + heading + recenter + denial, wide frame');
 }catch(error){await page.waitForTimeout(550);await page.screenshot({path:output+'/pinmap-mobile-failure.png'});throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
