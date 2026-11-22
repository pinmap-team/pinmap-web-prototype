const {chromium}=require(process.env.PINMAP_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const output=process.env.PINMAP_CHECK_OUTPUT||os.tmpdir();
const origin=process.env.PINMAP_BROWSER_ORIGIN||'http://127.0.0.1:8093';
fs.mkdirSync(output,{recursive:true});

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PINMAP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/auth-client.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.PinmapAuth={
    ready:async()=>({auth:{
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      initialize:async()=>({error:null}),getSession:async()=>({data:{session:null}}),
      signUp:async()=>({data:{session:null},error:null})
    }}),callback:()=>location.origin+'/',message:error=>error?.message||'오류'
  };`}));
  try{
    await page.goto(origin+'/index.html');
    await page.frameLocator('.phone-frame').locator('#auth-gate').waitFor();
    await checkFit(page,'.phone-frame','login gate');
    await page.goto(origin+'/auth.html?screen=welcome');
    await page.locator('#auth-main[data-screen="welcome"]').waitFor();
    for(const [width,height] of [[320,640],[402,874],[1440,700],[1440,960]]){
      await page.setViewportSize({width,height});
      await checkFit(page,'#auth-main',`auth welcome ${width}x${height}`);
      if(height===640||height===700) await page.screenshot({path:path.join(output,`pinmap-auth-welcome-${width}x${height}.png`)});
    }
    await page.setViewportSize({width:402,height:874});
    await page.locator('[data-auth="signin"]').click();
    await page.locator('#auth-main[data-screen="signin"]').waitFor();
    await checkAuthSizes(page,'sign in');
    await page.locator('[data-auth="signup"]').click();
    await page.locator('#auth-main[data-screen="signup"]').waitFor();
    await checkAuthSizes(page,'sign up');
    await page.screenshot({path:path.join(output,'pinmap-auth-signup-402x874.png')});
    await page.locator('#auth-email').fill('test@example.com');
    await page.locator('#auth-password').fill('password123');
    await page.locator('#auth-confirm').fill('password123');
    await page.locator('#auth-form [type="submit"]').click();
    await page.locator('#auth-main[data-screen="verify"]').waitFor();
    await checkAuthSizes(page,'email verification');
    await page.locator('[data-auth="signin"]').click();
    await page.locator('[data-auth="reset"]').click();
    await page.locator('#auth-main[data-screen="reset"]').waitFor();
    await checkAuthSizes(page,'password reset');
    await page.goto(origin+'/index.html?mode=prototype');
    await page.waitForURL(/\/auth\.html\?screen=welcome/);
    await page.locator('#auth-main[data-screen="welcome"]').waitFor();
    assert.deepEqual(errors,[]);
    console.log('phone viewport passed: login gate, welcome, sign in, sign up, email verification, reset and legacy URL at mobile and desktop sizes');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

async function checkFit(page,selector,label){
  const {width,height}=page.viewportSize();
  const scale=Math.min(1,width/402,height/874);
  await page.waitForFunction(({selector,scale})=>{
    const node=document.querySelector(selector);
    return node&&Math.abs(Number(node.style.getPropertyValue('--phone-scale'))-scale)<.001;
  },{selector,scale});
  const bounds=await page.locator(selector).evaluate(node=>{
    const rect=node.getBoundingClientRect();
    return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,
      pageWidth:document.documentElement.scrollWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight};
  });
  assert(Math.abs(bounds.width-402*scale)<1&&Math.abs(bounds.height-874*scale)<1,
    `${label} must preserve iPhone 17 aspect ratio: ${JSON.stringify(bounds)}`);
  assert(Math.abs(bounds.left-(width-bounds.width)/2)<1&&Math.abs(bounds.top-(height-bounds.height)/2)<1,
    `${label} must be centered: ${JSON.stringify(bounds)}`);
  assert(bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=height&&bounds.pageWidth<=width,
    `${label} must fit in the browser: ${JSON.stringify(bounds)}`);
}

async function checkAuthSizes(page,label){
  for(const [width,height] of [[320,640],[402,874],[1440,700]]){
    await page.setViewportSize({width,height});
    await checkFit(page,'#auth-main',`${label} ${width}x${height}`);
  }
  await page.setViewportSize({width:402,height:874});
  await checkFit(page,'#auth-main',label);
}
