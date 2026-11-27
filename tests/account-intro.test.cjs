const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function signIn({done=false, seen=false, testAccount=false, failSave=false}={}) {
  const user={id:'subscriber',user_metadata:{pinmap_intro_seen:seen}};
  const session={data:{session:{user}}};
  const app={}, sheet={}, nodes={app,sheet}, events={}, actions={};
  let intro, guides=0, writes=0, hasTestFlag=testAccount;
  const classes=new Set();
  const document={documentElement:{classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)}},
    body:{append:n=>{nodes[n.id]=n;n.isConnected=true;}},
    createElement:()=>({setAttribute(){},remove(){delete nodes[this.id];this.isConnected=false;}}),
    getElementById:id=>nodes[id]};
  const client={auth:{onAuthStateChange(){},getSession:async()=>session}};
  vm.runInNewContext(fs.readFileSync('auth-app.js','utf8'),{
    PM_ENV:{requiresAuth:true},window:{PinmapAccountState:{userId:user.id},addEventListener:(k,v)=>events[k]=v},document,
    PinmapAuth:{ready:async()=>client,verifiedUser:async()=>({data:{user}})},
    sessionStorage:{getItem:()=>hasTestFlag?user.id:null,removeItem:()=>{hasTestFlag=false;}},
    PinmapUserState:{createStore:(_,owner,current)=>({write:async patch=>{
      assert.equal(owner,user.id);assert.ok(current());assert.equal(patch.pinmap_intro_seen,true);
      if(failSave){failSave=false;throw Error();}writes++;
    }})},actions,onboardDone:done,render(){},closeOnboarding(){},toast(){},
    openOnboarding:()=>guides++,showPinmapIntro:(_,finish)=>intro=finish
  });
  await new Promise(resolve=>setImmediate(resolve));
  return {get intro(){return intro;},replay:actions.intro,get guides(){return guides;},get writes(){return writes;},app};
}
test('new account sees stories and can retry a failed completion before setup',async()=>{
  const state=await signIn({failSave:true});assert.equal(typeof state.intro,'function');
  await state.intro();assert.equal(state.app.inert,true);assert.equal(state.guides,0);
  await state.intro();assert.equal(state.writes,1);assert.equal(state.guides,1);
});
test('returning users resume setup or home, test sign-in can replay',async()=>{
  assert.equal((await signIn({seen:true})).guides,1);
  assert.equal((await signIn({done:true})).intro,undefined);
  const replay=await signIn({testAccount:true,done:true});await replay.intro();assert.equal(replay.writes,0);
});

test('replaying stories from the guide returns to the guide without writing account state',async()=>{
  const state=await signIn({seen:true});
  assert.equal(state.guides,1);
  state.replay();
  assert.equal(state.app.inert,true);
  await state.intro();
  assert.equal(state.app.inert,false);
  assert.equal(state.guides,1);
  assert.equal(state.writes,0);
});
