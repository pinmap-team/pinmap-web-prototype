const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
let debugPage,debugCalls;
const base=process.env.PINMAP_QA_BASE_URL||'http://127.0.0.1:8096';
assert.equal(new URL(base).hostname,'127.0.0.1','Run against the isolated local fixture server only');
const out=process.env.PINMAP_QA_OUTPUT||'/private/tmp/pinmap-auth-qa';fs.mkdirSync(out,{recursive:true});
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'test@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})+'.signature';
const session={access_token:token,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PINMAP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:402,height:874}});
 const errors=[],calls=[];debugCalls=calls;let failPassword=false,expireCode=false,unconfirmed=false;
 await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===base)return route.continue();
   if(url.host!=='pinmap-auth-test.supabase.co')return route.abort();
   const body=req.postDataJSON();calls.push({path:url.pathname,query:url.search,body,url:url.href});
   const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},body:JSON.stringify(body)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
   if(url.pathname.endsWith('/authorize')){const dest=new URL(url.searchParams.get('redirect_to'));dest.searchParams.set('code',url.searchParams.get('provider')+'-success');return route.fulfill({status:302,headers:{location:dest.href}});}
   if(url.pathname.endsWith('/token')){
     if(url.searchParams.get('grant_type')==='password'&&unconfirmed)return json({code:'email_not_confirmed',msg:'Email not confirmed'},400);
     if(url.searchParams.get('grant_type')==='password'&&failPassword)return json({code:'invalid_credentials',msg:'Invalid login credentials'},400);
     if(url.searchParams.get('grant_type')==='pkce'&&expireCode)return json({code:'flow_state_expired',msg:'expired'},400);
     return json(session);
   }
   if(url.pathname.endsWith('/user'))return json(user);
   if(url.pathname.endsWith('/signup'))return json({user,session:null});
   if(url.pathname.endsWith('/recover'))return json({});
   if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
   return json({});
 });
 const page=await context.newPage();debugPage=page;page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/auth.html');await page.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
 await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);

 for (const [width,height,name] of [[402,874,'mobile'],[1440,960,'desktop']]) {
   await page.setViewportSize({width,height});
   await page.screenshot({path:out+'/google-'+name+'.png'});
   assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
 }
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:402,height:874});
 await page.screenshot({path:out+'/google-dark.png'});
 for(const provider of ['google','kakao']) {
   await page.goto(base+'/auth.html?screen=welcome');
   await page.getByRole('button',{name:provider==='google'?'구글로 시작하기':'카카오로 시작하기',exact:true}).focus();
   await page.keyboard.press('Enter');await page.waitForURL(base+'/index.html');
   await page.frameLocator('.phone-frame').locator('.bottomnav').waitFor();
   const oauth=calls.find(x=>x.path.endsWith('/authorize')&&new URL(x.url).searchParams.get('provider')===provider);
   assert(oauth);assert(new URL(oauth.url).searchParams.get('code_challenge'));
   assert.equal(new URL(oauth.url).searchParams.get('redirect_to'),base+'/');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: Google and Kakao keyboard activation, PKCE callback, app return, mobile/desktop/dark layout. Mock auth only.');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
