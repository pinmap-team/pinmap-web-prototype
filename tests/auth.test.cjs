const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('root forwards PKCE, implicit recovery and OAuth failure to standalone auth without dropping callback data',()=>{
  for(const [search,hash] of [['?code=abc&__supabase_flow_id=flow',''],['','#access_token=test&type=recovery'],['?error=access_denied',''],['','#error=access_denied']]){
    let redirected;vm.runInNewContext(fs.readFileSync('entry-router.js','utf8'),{URLSearchParams,location:{search,hash,replace:value=>redirected=value}});
    assert.equal(redirected,'auth.html'+search+hash);
  }
});

test('simultaneous app and content identity checks share one Supabase request',async()=>{
  const context={window:{},location:{}};
  vm.runInNewContext(fs.readFileSync('auth-client.js','utf8'),context);
  let calls=0,resolveUser;
  const client={auth:{getUser:()=>{calls++;return new Promise(resolve=>{resolveUser=resolve;});}}};
  const first=context.window.PinmapAuth.verifiedUser(client);
  const second=context.window.PinmapAuth.verifiedUser(client);
  assert.equal(calls,1);
  resolveUser({data:{user:{id:'user-a'}}});
  const [a,b]=await Promise.all([first,second]);
  assert.equal(a.data.user.id,b.data.user.id);
  const third=context.window.PinmapAuth.verifiedUser(client);
  assert.equal(calls,2);
  resolveUser({data:{user:{id:'user-a'}}});
  await third;
});

test('auth SDK uses the shared session key and persistent refresh configuration',async()=>{
  let options;
  const window={};window.top=window;
  window.supabase={createClient:(_url,_key,config)=>{options=config.auth;return {auth:{}}}};
  const context={window,location:{protocol:'https:',origin:'https://pinmap.test/',href:'https://pinmap.test/auth.html'},
    AbortSignal:{timeout:()=>null},
    fetch:async()=>({ok:true,json:async()=>({url:'https://auth.test',publishableKey:'public'})})};
  vm.runInNewContext(fs.readFileSync('auth-client.js','utf8'),context);
  await window.PinmapAuth.ready();
  assert.equal(options.storageKey,'pinmap.auth.v1');
  assert.equal(options.persistSession,true);
  assert.equal(options.autoRefreshToken,true);
  assert.equal(options.detectSessionInUrl,true);
  assert.equal(options.flowType,'pkce');
});
