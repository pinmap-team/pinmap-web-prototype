const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function boot(auth=true){
 let opened,callback,active=false;const calls=[];const status={environment:'sandbox',active:false,status:'free',used:0,remaining:300,monthlyLimit:300};
 const client={auth:{getSession:async()=>({data:{session:{access_token:'test-token',user:{id:'user-a'}}}})}};
 const message={textContent:''},button={};const sdk={Environment:{set:v=>assert.equal(v,'sandbox')},Initialize:o=>callback=o.eventCallback,Checkout:{open:o=>opened=o,close:()=>{}}};
 const c={window:{PINMAP_PADDLE:{environment:'sandbox',clientToken:'test_token',monthlyPriceId:'pri_'+'a'.repeat(26)},Paddle:sdk,top:{location:{}}},PM_ENV:{requiresAuth:auth},PARENT_TAB:{},pageName:{},pages:{},actions:{},page:'billing',render(){},myPage:(title,body)=>body,esc:v=>String(v),toast(){},go(){},Date,URL,AbortSignal,PinmapAuth:{ready:async()=>client},PinmapButton:{run:async(b,f)=>f()},setTimeout:()=>{},document:{documentElement:{dataset:{}},getElementById:()=>message,querySelector:()=>button,createElement:()=>({}),head:{append:s=>s.onload()},addEventListener(){}},fetch:async(url,options)=>{calls.push(options);return {ok:true,json:async()=>options.method==='POST'?{transactionId:'txn_server'}:{...status,active}};}};
 vm.runInNewContext(fs.readFileSync('billing.js','utf8'),c);
 return {c,calls,status,message,opened:()=>opened,callback:()=>callback,activate:()=>active=true};
}
test('account checkout uses a server transaction; callback alone cannot grant access',async()=>{
 const b=boot();await b.c.actions.paddlecheckout();assert.equal(b.opened().transactionId,'txn_server');assert.equal(b.opened().items,undefined);
 assert.equal(JSON.parse(b.calls[0].body).action,'checkout');
 b.callback()({name:'checkout.completed'});await b.c.window.PinmapBilling.refresh();assert.match(b.c.pages.billing(),/아직 구독 중인 이용권이 없어요/);
 b.activate();await b.c.window.PinmapBilling.refresh();assert.match(b.c.pages.billing(),/월간 이용권 이용 중/);assert.match(b.c.pages.billing(),/구독 중/);
});
test('prototype uses only sandbox checkout and never requests account billing',async()=>{
 const b=boot(false);await b.c.actions.paddlecheckout();assert.equal(b.calls.length,0);assert.equal(b.opened().items[0].quantity,1);assert.equal(b.opened().transactionId,undefined);
 assert.match(b.c.pages.billing(),/매월 콘텐츠 분석 300개/);
});
