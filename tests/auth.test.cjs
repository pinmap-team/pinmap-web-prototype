const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const handler=require('../api/auth/config');
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const jwt=role=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role})).toString('base64url'),'signature'].join('.');
test('Auth config normalizes both project and Data API URLs to the origin',()=>{
  for(const url of ['https://test.supabase.co','https://test.supabase.co/','https://test.supabase.co/rest/v1','https://test.supabase.co/rest/v1/'])assert.equal(handler.projectUrl(url),'https://test.supabase.co');
  for(const url of ['','bad','http://test.supabase.co','https://user:pass@test.supabase.co','https://test.supabase.co/rest/v1/users','https://test.supabase.co/?key=secret','https://test.supabase.co/#secret'])assert.equal(handler.projectUrl(url),null);
});
test('Auth config never publishes secret keys, service_role JWTs or arbitrary strings',()=>{
  for(const value of ['','sb_secret_private','random',jwt('service_role'),jwt('authenticated')])assert.equal(handler.publicKey(value),null);
  assert.equal(handler.publicKey('sb_publishable_public'),'sb_publishable_public');
  assert.equal(handler.publicKey(jwt('anon')),jwt('anon'));
});
test('Auth config fails closed, emits no-store and only exposes public credentials',()=>{
  const names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','KAKAO_CLIENT_SECRET'];
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try{
    process.env.SUPABASE_URL='https://test.supabase.co/rest/v1/';
    process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_public';
    process.env.SUPABASE_SERVICE_ROLE_KEY='private-service-key';
    process.env.KAKAO_CLIENT_SECRET='private-kakao-key';
    let res=response();handler({method:'GET'},res);
    assert.equal(res.code,200);assert.deepEqual(res.body,{url:'https://test.supabase.co',publishableKey:'sb_publishable_public'});assert.equal(res.headers['Cache-Control'],'no-store');
    res=response();handler({method:'POST'},res);assert.equal(res.code,405);
    process.env.SUPABASE_PUBLISHABLE_KEY=jwt('service_role');res=response();handler({method:'GET'},res);assert.equal(res.code,503);assert(!JSON.stringify(res.body).includes('signature'));
    delete process.env.SUPABASE_URL;res=response();handler({method:'GET'},res);assert.equal(res.code,503);
  }finally{for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}}
});
test('root forwards PKCE, implicit recovery and OAuth failure to standalone auth without dropping callback data',()=>{
  for(const [search,hash] of [['?code=abc&__supabase_flow_id=flow',''],['','#access_token=test&type=recovery'],['?error=access_denied',''],['','#error=access_denied']]){
    let redirected;vm.runInNewContext(fs.readFileSync('entry-router.js','utf8'),{URLSearchParams,location:{search,hash,replace:value=>redirected=value}});
    assert.equal(redirected,'auth.html'+search+hash);
  }
});
