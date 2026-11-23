const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8096';
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',
  email:'test@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,aud:'authenticated',role:'authenticated',
  email:user.email,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})+'.signature';
const session={access_token:token,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user};

(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const context=await browser.newContext({viewport:{width:402,height:874}});
  const errors=[];
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',
      headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},body:JSON.stringify(body)});
    if(url.origin===base){
      if(url.pathname==='/api/auth/config')return json({url:'https://pinmap-auth-test.supabase.co',publishableKey:'public'});
      if(url.pathname.startsWith('/api/'))return json({items:[],places:[]});
      return route.continue();
    }
    if(url.host!=='pinmap-auth-test.supabase.co')return route.abort();
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
    if(url.pathname.endsWith('/authorize')){
      const redirect=new URL(url.searchParams.get('redirect_to'));
      redirect.searchParams.set('code','oauth-success');
      return route.fulfill({status:302,headers:{location:redirect.href}});
    }
    if(url.pathname.endsWith('/token'))return json(session);
    if(url.pathname.endsWith('/user'))return json(user);
    if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
    return json({});
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(10000);
  async function waitForApp(){
    await page.waitForFunction(()=>{
      const root=document.querySelector('.phone-frame')?.contentDocument?.documentElement;
      return root && !root.classList.contains('auth-pending');
    });
  }
  await page.goto(base+'/');
  await page.getByRole('button',{name:'이메일 로그인',exact:true}).click();
  await page.locator('#auth-email').fill(user.email);
  await page.locator('#auth-password').fill('test-password');
  await page.getByRole('button',{name:'이메일로 로그인',exact:true}).click();
  await waitForApp();
  assert.equal(await page.evaluate(()=>localStorage.getItem('pinmap.auth.v1')),null);
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>sessionStorage.getItem(key)?.includes('access_token'))),false);
  const fresh=await context.newPage();
  await fresh.goto(base+'/');
  await fresh.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
  assert.equal(await fresh.locator('.phone-frame').count(),0);
  await fresh.close();
  await page.reload();
  await page.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
  assert.equal(await page.locator('.phone-frame').count(),0);
  const beforeOAuth=await page.evaluate(()=>performance.timeOrigin);
  await page.getByRole('button',{name:'카카오로 시작하기',exact:true}).click();
  await page.waitForFunction(previous=>performance.timeOrigin>previous,beforeOAuth);
  await waitForApp();
  assert.equal(await page.evaluate(()=>localStorage.getItem('pinmap.auth.v1')),null);
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.includes('code-verifier'))),false);
  const skip=page.frameLocator('.phone-frame').getByRole('button',{name:'건너뛰기',exact:true});
  if(await skip.isVisible())await skip.click();
  await page.frameLocator('.phone-frame').locator('[data-page="my"]').last().click();
  await page.frameLocator('.phone-frame').locator('[data-page="account"]').first().click();
  await page.frameLocator('.phone-frame').locator('[data-action="logoutask"]').click();
  await page.frameLocator('.phone-frame').locator('[data-action="logoutyes"]').click();
  await page.getByRole('button',{name:'이메일 로그인',exact:true}).waitFor();
  await page.getByRole('button',{name:'이메일 로그인',exact:true}).click();
  await page.getByRole('button',{name:'비밀번호 재설정',exact:true}).click();
  await page.locator('#auth-email').fill(user.email);
  await page.getByRole('button',{name:'재설정 링크 보내기',exact:true}).click();
  await page.getByRole('heading',{name:'재설정 메일을 확인해 주세요'}).waitFor();
  await page.goto(base+'/?code=recovery-success');
  await page.getByRole('heading',{name:'새 비밀번호 설정'}).waitFor();
  await page.locator('#auth-password').fill('new-password');
  await page.locator('#auth-confirm').fill('new-password');
  await page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
  await waitForApp();
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS: email login, in-memory app, new tab and reload gate, OAuth, logout, recovery, no stored tokens');
})().catch(error=>{console.error(error);process.exit(1)});
