const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PINMAP_QA_BASE_URL||'http://127.0.0.1:8099';assert.equal(new URL(base).hostname,'127.0.0.1');
const OUT=process.env.PINMAP_QA_OUTPUT||'/tmp/pinmap-page-consistency-qa';fs.mkdirSync(OUT+'/screenshots',{recursive:true});const results=[],failures=[];
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const viewport of [{width:402,height:874},{width:1440,height:960}]){
 const c=await b.newContext({viewport,colorScheme:'light',reducedMotion:'reduce'}),p=await c.newPage();await p.goto(base+'/index.html?mode=prototype');await p.frameLocator('iframe').locator('#app').waitFor({state:'attached'});const f=p.frames().find(f=>f.url().includes('app.html'));await f.waitForFunction(()=>typeof CollectionFolder==='function');
 await f.evaluate(()=>{closeOnboarding();clearTimeout(onboardTimer);});
 const keys=await f.evaluate(()=>Object.keys(pages));
 for(const theme of ['light','dark']){
  await f.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  for(const name of keys){
   await f.evaluate(name=>{closeOnboarding();closeNotiPanel();closeShareDemo();closePushDemo();if(document.querySelector('#sheet').open)document.querySelector('#sheet').close();detailId=null;collection=null;filter='전체';query='';page=name;if(name==='topic')topicId='cafe';render();scrollTo(0,0);clearTimeout(toastTimer);document.querySelector('#snackbar').classList.remove('show');},name);
   await p.waitForTimeout(name.includes('address')?300:60);
   const r=await f.evaluate(()=>{
    const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.innerText||e.value||e.getAttribute('aria-label'),cls:e.className,x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,outline:s.outline}};
    const title=[...document.querySelectorAll('h1')].find(e=>{const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&getComputedStyle(e).display!=='none'});
    const field=document.querySelector('[data-course-field=title]');
    return {title:rect(title)||rect(field),profileSave:rect(document.querySelector('.pfsave')),courseButtons:[...document.querySelectorAll('.course-close,.course-share,.course-save,.course-title-edit')].map(rect),docWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight};
   });r.name=name;r.theme=theme;r.viewport=viewport;results.push(r);
   if(r.title&&['profile','accounts','placeset','interestset','notiset','saveset','themeset','favorites','appinfo','faq','notice','terms','guide','howtopage','account','accountaccess','calexport','topic','courses','course','addresses','myaddresses','addressedit','myaddressedit','addressmanage','myaddressmanage','addresssearch','myaddresssearch','addressconfirm','myaddressconfirm','calendar','library','my'].includes(name)){
    if(Math.abs(r.title.y-45)>.5)failures.push({name,theme,viewport,issue:'title-y',actual:r.title.y});
    if(r.title.weight!=='700')failures.push({name,theme,viewport,issue:'title-weight',actual:r.title.weight});
   }
   if(r.docWidth>r.width+1)failures.push({name,theme,issue:'horizontal overflow',actual:r.docWidth});
   if(r.profileSave&&r.profileSave.h!==56)failures.push({name,theme,issue:'profile button',actual:r.profileSave.h});
   for(const btn of r.courseButtons)if(btn.h<44||btn.w<44)failures.push({name,theme,issue:'course target',actual:btn});
   if(['library','profile','topic','courses','course','calendar','addresses','addressconfirm','my','howtopage'].includes(name))await p.screenshot({path:path.join(OUT,'screenshots',`${viewport.width}-${theme}-${name}.png`)});
  }
 }
 // Notifications are an overlay, so verify them separately from the page registry.
 for(const theme of ['light','dark']){
  await f.evaluate(theme=>{closeNotiPanel(true);document.documentElement.dataset.theme=theme;page='home';detailId=null;render();actions.noti()},theme);
  await p.waitForTimeout(400);
  const notification=await f.evaluate(()=>{
   const q=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,outline:s.outline}};
   return {title:q('.nphead h1'),header:q('.nphead'),back:q('.npback'),list:q('.nplist')};
  });
  results.push({name:'notifications',theme,viewport,notification});
  if(notification.title.x!==58||notification.title.y!==45||notification.title.size!=='22px'||notification.title.line!=='30px'||notification.title.weight!=='700'||notification.header.h!==56||notification.back.w!==44||notification.back.h!==44||notification.list.x!==24||!notification.back.outline.includes('none'))failures.push({name:'notifications',theme,viewport,actual:notification});
  await p.screenshot({path:path.join(OUT,'screenshots',`${viewport.width}-${theme}-notifications.png`)});
  await f.evaluate(()=>closeNotiPanel(true));
 }
 // Test title editing and map marker's actual computed font.
 await f.evaluate(()=>{page='home';detailId=null;render();startNewCourse([items[0].id]);});await p.waitForTimeout(400);
 const marker=await f.evaluate(()=>{const e=document.querySelector('.course-map-marker span');if(!e)return null;const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight}});results.push({name:'course-marker',viewport,marker});if(!marker||!marker.font.includes('Pretendard')||marker.size!=='14px'||marker.weight!=='700')failures.push({name:'course-marker',viewport,actual:marker});
 const field=f.locator('[data-course-field=title]');await field.fill('내용이 긴 코스 이름도 편집할 수 있는지 확인');assert.equal(await field.inputValue(),'내용이 긴 코스 이름도 편집할 수 있는지 확인');
 // The actual menu keyboard focus must remain visible through a fill change, without a ring.
 await f.evaluate(()=>{detailId=items[0].id;render();actions.dtmore();});await p.waitForTimeout(100);const focus=await f.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return {text:e.textContent,outline:s.outline,filter:s.filter}});results.push({name:'detail-focus',viewport,focus});if(!focus.outline.includes('none')||focus.filter==='none')failures.push({name:'focus',actual:focus});
 await p.screenshot({path:path.join(OUT,'screenshots',`${viewport.width}-focus-menu.png`)});await c.close();console.log('checked',viewport.width);
}
await b.close();fs.writeFileSync(OUT+'/verification.json',JSON.stringify({results,failures},null,2));console.log('FAILURES',JSON.stringify(failures));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);fs.writeFileSync(OUT+'/verification.json',JSON.stringify({results,failures,fatal:String(e)},null,2));process.exitCode=1});
