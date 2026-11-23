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

test('login tokens stay in memory while PKCE verifier survives only the redirect',async()=>{
  const session=new Map(),local=new Map([['pinmap.auth.v1','old-token']]);
  let options;
  const window={};window.top=window;
  window.supabase={createClient:(_url,_key,config)=>{options=config.auth;return {auth:{}}}};
  const context={window,location:{protocol:'https:',origin:'https://pinmap.test/',href:'https://pinmap.test/auth.html'},
    sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
    localStorage:{getItem:k=>local.get(k)??null,removeItem:k=>local.delete(k)},
    crypto:{randomUUID:()=> 'tab-123'},AbortSignal:{timeout:()=>null},
    fetch:async()=>({ok:true,json:async()=>({url:'https://auth.test',publishableKey:'public'})})};
  vm.runInNewContext(fs.readFileSync('auth-client.js','utf8'),context);
  await window.PinmapAuth.ready();
  assert.equal(local.has('pinmap.auth.v1'),false);
  assert.equal(options.storageKey,'pinmap.auth.tab.tab-123');
  options.storage.setItem(options.storageKey,'access-and-refresh-token');
  assert.equal(session.has(options.storageKey),false);
  assert.equal(local.has(options.storageKey),false);
  assert.equal(options.storage.getItem(options.storageKey),'access-and-refresh-token');
  options.storage.setItem(options.storageKey+'-code-verifier','temporary-verifier');
  assert.equal(session.get(options.storageKey+'-code-verifier'),'temporary-verifier');
  options.storage.removeItem(options.storageKey+'-code-verifier');
  assert.equal(session.has(options.storageKey+'-code-verifier'),false);
});
