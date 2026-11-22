const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const origin=process.env.PINMAP_BROWSER_ORIGIN||'http://127.0.0.1:8093';
assert.equal(new URL(origin).hostname,'127.0.0.1');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PINMAP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 for(const viewport of [{width:402,height:874},{width:1440,height:960}]){
  const page=await browser.newPage({viewport});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/auth-client.js*',r=>r.fulfill({contentType:'text/javascript',body:`(()=>{const user={id:'qa-user',email:'qa@example.com',user_metadata:JSON.parse(localStorage.getItem('qa-metadata')||'{}')};const client={auth:{getSession:async()=>({data:{session:{user,access_token:'qa-token'}},error:null}),getUser:async()=>({data:{user},error:null}),updateUser:async({data})=>{Object.assign(user.user_metadata,data);localStorage.setItem('qa-metadata',JSON.stringify(user.user_metadata));return {data:{user},error:null}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};window.PinmapAuth={ready:async()=>client,verifiedUser:async()=>({data:{user},error:null}),login:()=>{},message:e=>e?.message||'오류'};})();`}));
  await page.route('**/api/content-save*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],next_offset:null})}));
  await page.route('**/api/map-config',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(origin+'/index.html');
  const frame=page.frameLocator('.phone-frame');
  await frame.locator('#onboarding').waitFor({timeout:15000});
  assert.equal(await frame.locator('#auth-gate').count(),0);
  await frame.locator('[data-ob="skip"]').click();
  await frame.locator('#coach').waitFor({timeout:5000});
  assert.match(await frame.locator('#coach').innerText(),/첫 콘텐츠 저장하기/);
  await frame.locator('[data-coach="next"]').click();
  assert.match(await frame.locator('#coach').innerText(),/콘텐츠 추가하기/);
  await frame.locator('[data-coach="skip"]').click();
  await page.reload();
  await frame.locator('.bottomnav').waitFor({timeout:15000});
  await page.waitForTimeout(500);
  assert.equal(await frame.locator('#onboarding').count(),0);
  await page.goto(origin+'/index.html?mode=prototype');
  await page.waitForURL(/auth\.html\?screen=welcome/);
  assert.deepEqual(errors,[]);
  results.push({viewport,errors});
  await page.close();
 }
 console.log(JSON.stringify(results));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
