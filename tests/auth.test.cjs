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
