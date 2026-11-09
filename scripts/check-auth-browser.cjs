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
   if(url.pathname.endsWith('/authorize')){const dest=new URL(url.searchParams.get('redirect_to'));dest.searchParams.set('code','kakao-success');return route.fulfill({status:302,headers:{location:dest.href}});}
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
 await page.screenshot({path:out+'/welcome-mobile.png'});await page.getByRole('button',{name:'이메일 로그인',exact:true}).click();await page.screenshot({path:out+'/signin-mobile.png'});
 await page.getByRole('button',{name:'회원가입',exact:true}).click();
 await page.locator('#auth-email').fill('test@example.com');await page.locator('#auth-password').fill('test-password');await page.locator('#auth-confirm').fill('different-password');
 await page.locator('#auth-form').evaluate(form=>form.requestSubmit());await page.locator('#auth-message').getByText('비밀번호가 일치하지 않아요.',{exact:true}).waitFor();
 assert(!calls.some(x=>x.path.endsWith('/signup')));
 await page.locator('#auth-confirm').fill('test-password');assert.equal(await page.locator('#auth-confirm-help').innerText(),'비밀번호가 일치해요.');await page.screenshot({path:out+'/signup-form.png'});
 await page.locator('#auth-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
 await page.getByText(/가입 가능한 이메일이면/).waitFor();assert.equal(calls.filter(x=>x.path.endsWith('/signup')).length,1);
 assert.equal(calls.find(x=>x.path.endsWith('/signup')).body.email,'test@example.com');
 assert(calls.find(x=>x.path.endsWith('/signup')).body.code_challenge);
 await page.getByRole('heading',{name:'인증 메일을 확인해 주세요'}).waitFor();assert.equal(await page.locator('#auth-sent-email').innerText(),'test@example.com');assert.equal(await page.getByRole('button',{name:'인증 메일 다시 보내기',exact:true}).isDisabled(),true);
 await page.reload();await page.getByRole('heading',{name:'인증 메일을 확인해 주세요'}).waitFor();assert.equal(await page.locator('#auth-sent-email').innerText(),'test@example.com');
 await page.clock.install();await page.clock.fastForward(61000);await page.getByRole('button',{name:'인증 메일 다시 보내기',exact:true}).click();assert.equal(calls.filter(x=>x.path.endsWith('/resend')).length,1);assert.equal(await page.getByRole('button',{name:'인증 메일 다시 보내기',exact:true}).isDisabled(),true);
 await page.screenshot({path:out+'/signup-mobile.png'});
 await page.getByRole('button',{name:'인증했어요 · 로그인하기',exact:true}).click();assert.equal(await page.locator('#auth-email').inputValue(),'test@example.com');
 failPassword=true;await page.locator('#auth-email').fill('test@example.com');await page.locator('#auth-password').fill('bad-password');await page.getByRole('button',{name:'이메일로 로그인',exact:true}).click();
 await page.getByText('이메일 또는 비밀번호를 확인해 주세요.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'이메일로 로그인',exact:true}).isEnabled(),true);
 unconfirmed=true;failPassword=false;await page.getByRole('button',{name:'이메일로 로그인',exact:true}).click();await page.getByRole('heading',{name:'인증 메일을 확인해 주세요'}).waitFor();assert.equal(await page.getByRole('button',{name:'인증 메일 다시 보내기',exact:true}).isEnabled(),true);await page.getByRole('button',{name:'인증했어요 · 로그인하기',exact:true}).click();unconfirmed=false;
 await page.getByRole('button',{name:'비밀번호 재설정',exact:true}).click();await page.locator('#auth-email').fill('test@example.com');await page.getByRole('button',{name:'재설정 링크 보내기',exact:true}).click();
 await page.getByText(/가입된 이메일이면/).waitFor();assert(calls.find(x=>x.path.endsWith('/recover')).body.code_challenge);
 await page.goto(base+'/?code=recovery-success');await page.getByRole('heading',{name:'새 비밀번호 설정'}).waitFor();
 assert(page.url().endsWith('/auth.html'));await page.reload();await page.getByRole('heading',{name:'새 비밀번호 설정'}).waitFor();
 await page.locator('#auth-password').fill('new-password');await page.locator('#auth-confirm').fill('new-password');await page.screenshot({path:out+'/password-mobile.png'});
 await page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
 await page.waitForURL(base+'/index.html');const app=page.frameLocator('.phone-frame');await app.getByRole('button',{name:'마이',exact:true}).or(app.getByRole('link',{name:'마이',exact:true})).first().waitFor({timeout:15000});
 assert(calls.find(x=>x.path.endsWith('/user')&&x.body?.password==='new-password'));
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('pinmap.auth.recovery')),null);
 // Authenticated app identity and logout are real SDK requests.
 await app.locator('[data-page="my"]').last().click();await app.getByText('test@example.com',{exact:true}).waitFor();
 await page.screenshot({path:out+'/account-mobile.png'});
 await app.locator('[data-action="logoutask"]').click();await app.locator('[data-action="logoutyes"]').click();await page.waitForURL(base+'/auth.html');await page.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
 assert(calls.some(x=>x.path.endsWith('/logout')));
 // Kakao redirects out of the frame and returns through the root callback.
 await page.getByRole('button',{name:'카카오로 시작하기',exact:true}).click();await page.waitForURL(base+'/index.html');await page.frameLocator('.phone-frame').locator('.bottomnav').waitFor();
 const oauth=calls.find(x=>x.path.endsWith('/authorize'));assert.equal(new URL(oauth.url).searchParams.get('provider'),'kakao');assert(new URL(oauth.url).searchParams.get('code_challenge'));
 // Session persists across a new page in the same browser context.
 const second=await context.newPage();await second.goto(base+'/auth.html');await second.waitForURL(base+'/index.html');await second.frameLocator('.phone-frame').locator('.bottomnav').waitFor();
 await second.goto(base+'/auth.html?screen=welcome');await second.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();await second.reload();await second.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();await second.goto(base+'/auth.html');await second.waitForURL(base+'/index.html');await second.frameLocator('.phone-frame').locator('.bottomnav').waitFor();
 await page.frameLocator('.phone-frame').locator('[data-page="my"]').last().click();await page.frameLocator('.phone-frame').locator('[data-action="logoutask"]').click();await page.frameLocator('.phone-frame').locator('[data-action="logoutyes"]').click();await page.waitForURL(base+'/auth.html');await second.frameLocator('.phone-frame').locator('#auth-gate').waitFor();await second.close();
 // Expired PKCE links return a usable sign-in choice with an explanation.
 await page.getByRole('button',{name:'이메일 로그인',exact:true}).click();
 await page.getByRole('button',{name:'비밀번호 재설정',exact:true}).click();await page.locator('#auth-email').fill('test@example.com');await page.getByRole('button',{name:'재설정 링크 보내기',exact:true}).click();await page.getByText(/가입된 이메일이면/).waitFor();expireCode=true;await page.goto(base+'/?code=expired');await page.getByText(/인증 링크를 확인하지 못했어요/).waitFor();await page.getByRole('button',{name:'이메일로 로그인',exact:true}).waitFor();expireCode=false;
 // An email callback opened without this browser's PKCE verifier still offers password sign-in.
 await page.goto(base+'/');await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('pinmap.auth.v1')&&key.includes('code-verifier'))localStorage.removeItem(key);});
 await page.goto(base+'/?code=other-browser-email');await page.getByRole('button',{name:'이메일로 로그인',exact:true}).waitFor();await page.getByText(/이메일에서 인증을 마쳤다면/).waitFor();
 await page.locator('#auth-email').fill('test@example.com');await page.locator('#auth-password').fill('new-password');await page.getByRole('button',{name:'이메일로 로그인',exact:true}).click();await page.waitForURL(base+'/index.html');await page.frameLocator('.phone-frame').locator('.bottomnav').waitFor();
 // New unauthenticated browser, missing config cannot offer a working form.
 const absent=await browser.newContext();const absentPage=await absent.newPage();await absentPage.route('**/api/auth/config',r=>r.fulfill({status:503,json:{error:'not configured'}}));
 await absentPage.goto(base+'/auth.html');await absentPage.getByRole('button',{name:'다시 연결하기',exact:true}).waitFor();assert.equal(await absentPage.locator('input').count(),0);await absent.close();
 // Desktop, narrow screen and dark mode layout.
 await page.goto(base+'/');await page.evaluate(()=>{localStorage.removeItem('pinmap.auth.v1');sessionStorage.clear();});await page.goto(base+'/auth.html');await page.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
 await page.setViewportSize({width:1440,height:960});await page.screenshot({path:out+'/welcome-desktop.png'});
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:402,height:874});await page.screenshot({path:out+'/welcome-dark.png'});
 await page.setViewportSize({width:320,height:568});assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'회원가입',exact:true}).click();await page.locator('#auth-email').fill('test@example.com');await page.screenshot({path:out+'/signup-narrow.png'});
 // Existing prototype entry never invokes account auth nor changes seed storage.
 await page.goto(base+'/index.html?mode=prototype');await page.frameLocator('.phone-frame').locator('#onboarding').waitFor();assert.equal(await page.frameLocator('.phone-frame').locator('#auth-gate').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({passed:true,sdk:'2.119.0',requests:calls.map(x=>({path:x.path,query:x.query})),pageErrors:errors},null,2));
 console.log('PASS: signup, mismatch, duplicate submit, invalid password, PKCE recovery, recovery reload, password update, identity, logout, Kakao PKCE callback, session restore, missing config, desktop/mobile/dark/narrow, prototype preservation.');
 await browser.close();
})().catch(async error=>{console.error(error.message);console.log(await debugPage?.locator('body').innerText());console.log(JSON.stringify(debugCalls?.slice(-4)));await debugPage?.screenshot({path:out+'/failure.png'});process.exit(1)});
