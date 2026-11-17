const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const output=process.env.PINMAP_CHECK_OUTPUT||os.tmpdir();
fs.mkdirSync(output,{recursive:true});

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PINMAP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
  const page=await browser.newPage({viewport:{width:402,height:874},deviceScaleFactor:1});
  const errors=[],resources=[];page.on('pageerror',error=>errors.push(error.stack || error.message));
  page.on('response',response=>{if(/\/(my|mysub|mypages|development)\.js/.test(response.url()))resources.push([response.url(),response.status()]);});
  page.on('requestfailed',request=>resources.push([request.url(),request.failure()]));
  const records=[];
  const record=(id,url)=>({id,user_id:'11111111-1111-4111-8111-111111111111',source_url:url,
    content_kind:'event',status:'needs_review',ai_title:'서울 전시 모음',ai_summary:'다양한 공간의 전시를 소개합니다.',
    author_username:'gallery.daily',created_at:'2026-11-16T00:00:00Z',events:[
      {title:'첫 전시',event_type:'exhibition',start_date:'2026-12-11',end_date:'2027-04-11',date_text:'26.12.11~27.04.11',venue_name:'서울 전시관',needs_review:true},
      {title:'둘째 전시',event_type:'exhibition',start_date:null,end_date:null,date_text:'12.11~04.11',venue_name:'부산 전시관',needs_review:true}],
    places:[],map_locations:[],extraction_notes:[],media_warnings:[]});
  records.push(record('one','https://www.instagram.com/p/Dfvw0zmE3kW/'));
  await page.route('**/vendor/supabase.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'test@example.com'}}}),getSession:async()=>({data:{session:{access_token:'x'.repeat(30)}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};`}));
  await page.route('**/api/auth/config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({url:'https://example.supabase.co',publishableKey:'pk_test'})}));
  await page.route('**/api/map-config',route=>route.fulfill({contentType:'application/json',body:'{}'}));
  await page.route('**/api/content-save*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='GET'){
      const offset=Number(url.searchParams.get('offset')); const list=records.slice(offset,offset+2);
      return route.fulfill({contentType:'application/json',body:JSON.stringify({items:list,next_offset:list.length===2?offset+2:null})});
    }
    if(request.method()==='POST'){
      const body=request.postDataJSON();const saved=record('two',body.url.split('?')[0]);records.unshift(saved);
      return route.fulfill({contentType:'application/json',body:JSON.stringify({item:saved,analysis_status:'needs_review',warnings:[]})});
    }
    if(request.method()==='DELETE'){
      const body=request.postDataJSON();const i=records.findIndex(x=>x.source_url===body.url);if(i>=0)records.splice(i,1);
      return route.fulfill({contentType:'application/json',body:JSON.stringify({deleted:i>=0})});
    }
  });
  try{
    await page.goto((process.env.PINMAP_BROWSER_ORIGIN||'http://127.0.0.1:8093')+'/index.html?mode=development&auth=required');
    const frame=page.frameLocator('.phone-frame');
    await frame.locator('.auth-gate').waitFor({state:'hidden',timeout:15000});
    await frame.locator('.pick').first().waitFor({timeout:15000}).catch(async error=>{
      console.error('home state:',(await frame.locator('body').innerText()).slice(0,1000));
      throw error;
    });
    const count=await frame.locator('body').evaluate(()=>items.length);assert.equal(count,1);
    assert.equal(await frame.locator('.home-first-save').count(),0);
    assert.equal(await frame.locator('.home-add-fab').count(),1);
    await frame.locator('.home-add-fab').click();
    await frame.locator('#es-url').waitFor({timeout:5000});
    await frame.locator('.esclose').click();
    assert.match(await frame.locator('.pick').first().innerText(),/서울 전시 모음/);
    for(const [width,height] of [[320,640],[402,874],[1440,700],[1440,960]]){
      await page.setViewportSize({width,height});
      await page.waitForTimeout(120);
      if(width!==402 && height!==960) await page.screenshot({path:path.join(output,`pinmap-account-home-${width}x${height}.png`)});
      const bounds=await page.locator('.phone-frame').evaluate(frame=>{
        const rect=frame.getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,
          pageWidth:document.documentElement.scrollWidth};
      });
      const scale=Math.min(1,width/402,height/874);
      assert(Math.abs(bounds.width-402*scale)<1 && Math.abs(bounds.height-874*scale)<1,
        `Frame must preserve 402:874 at ${width}x${height}: ${JSON.stringify(bounds)}`);
      assert(Math.abs(bounds.left-(width-bounds.width)/2)<1 && Math.abs(bounds.top-(height-bounds.height)/2)<1,
        `Frame must stay centered at ${width}x${height}: ${JSON.stringify(bounds)}`);
      assert(bounds.left>=0 && bounds.right<=width && bounds.pageWidth<=width,
        `Frame must fit ${width}x${height}: ${JSON.stringify(bounds)}`);
      const nav=await frame.locator('.bottomnav').evaluate(node=>{
        const rect=node.getBoundingClientRect();
        return {top:rect.top,bottom:rect.bottom,viewport:innerHeight};
      });
      assert(nav.top>=0 && nav.bottom<=874 && nav.viewport===874,
        `Navigation must fit ${width}x${height}: ${JSON.stringify(nav)}`);
    }
    await page.setViewportSize({width:402,height:874});
    await frame.locator('body').evaluate(()=>openDetail(items[0].id));
    assert.equal(await frame.locator('.home-add-fab').count(),0);
    assert.match(await frame.locator('body').innerText(),/게시물에서 찾은 행사 일정/);
    assert.match(await frame.locator('body').innerText(),/2026.12.11 – 2027.04.11/);
    assert.equal(await frame.locator('.dtlocation').count(),0);
    await page.screenshot({path:path.join(output,'pinmap-account-event-mobile.png')});
    await frame.locator('.dt-sheet-handle').click();
    await frame.locator('.dtsheet.is-expanded').waitFor({timeout:5000});
    await page.waitForTimeout(500);
    await frame.locator('.dtsheet').evaluate(sheet=>{
      const row=sheet.querySelector('.dt-events li:first-child');
      sheet.scrollTop+=row.getBoundingClientRect().top-sheet.getBoundingClientRect().top-80;
    });
    await page.waitForTimeout(100);
    const visible=await frame.locator('.dtsheet').evaluate(sheet=>{
      const row=sheet.querySelector('.dt-events li:first-child');
      const date=row.querySelector('p').getBoundingClientRect();
      const bar=document.querySelector('.dtbar').getBoundingClientRect();
      return {dateTop:date.top,dateBottom:date.bottom,barTop:bar.top};
    });
    assert(visible.dateTop>=0 && visible.dateBottom<visible.barTop,
      'The first extracted event date must be visible above the fixed action bar: '+JSON.stringify(visible));
    console.log('event-date-viewport:',JSON.stringify(visible));
    await page.screenshot({path:path.join(output,'pinmap-account-event-detail.png')});
    await frame.locator('body').evaluate(()=>{go('calendar');calMonth=new Date(2026,11,1);render();});
    assert.equal(await frame.locator('[data-calday="2026-12-11"] .caldot').count(),1);
    await frame.locator('body').evaluate(()=>actions.save());
    await frame.locator('#saveform [name="url"]').fill('https://www.instagram.com/p/newItem/');
    await frame.locator('#saveform button[type="submit"]').click();
    await frame.locator('.dt-events').waitFor({timeout:15000});
    assert.equal(await frame.locator('body').evaluate(()=>items.length),2);
    await frame.locator('.dtmorebtn').click();
    await frame.locator('.dtmenu [data-unsave]').click();
    await frame.locator('[data-delconfirm]').click();
    await frame.locator('.dt-events').waitFor({state:'hidden',timeout:15000});
    assert.equal(await frame.locator('body').evaluate(()=>items.length),1);
    assert.equal(records.length,1);
    await page.setViewportSize({width:1440,height:960});
    await page.screenshot({path:path.join(output,'pinmap-account-event-wide.png')});
    await page.frame({url:/\/app\.html\?/}).waitForFunction(()=>typeof window.attachPinmapBasemap==='function',null,{timeout:15000});
    await frame.locator('body').evaluate(()=>go('map'));
    await frame.locator('.live-map').waitFor({timeout:15000});
    for(const [width,height] of [[320,640],[1440,700]]){
      await page.setViewportSize({width,height});
      const map=await frame.locator('.live-map').evaluate(node=>{
        const rect=node.getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};
      });
      assert(map.left>=0 && map.right<=402 && map.top===0 && map.bottom===874,
        `Map must fit ${width}x${height}: ${JSON.stringify(map)}`);
    }
    assert.equal(errors.length,0,errors.join('; ')+'\n'+JSON.stringify(resources));
    console.log('browser-check passed: account load, event detail, calendar, save, delete, mobile/wide');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
