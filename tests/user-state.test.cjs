const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const State=require('../user-state.js');
function server(){
 let current='a',fail=false,slow=null;
 const users={a:{id:'a',user_metadata:{pinmap_favorites:['keep'],pinmap_collections:{names:['keep']}}},b:{id:'b',user_metadata:{}}};
 const client={auth:{getUser:async()=>({data:{user:structuredClone(users[current])}}),updateUser:async({data})=>{if(slow)await slow;if(fail)throw Error('offline');Object.assign(users[current].user_metadata,structuredClone(data));return {data:{user:structuredClone(users[current])}};}}};
 return {client,users,switch:id=>{current=id},fail:(value=true)=>{fail=value},pause:p=>{slow=p}};
}
test('settings whitelist retains addresses and preferences without importing account identity or billing',()=>{
 const value=State.normalize({settings:{places:['학교','학교'],placeLabels:{학교:'학교',__proto__:{evil:1}},placeDetails:{학교:{address:'서울',memo:'메모',lat:37,lng:127}},notiDeadline:true,avatar:'secret',active:true},preferences:['cafe'],appearance:'dark'});
 assert.deepEqual(value.settings.places,['학교']);assert.equal(value.settings.placeDetails.학교.lat,37);assert.equal(value.settings.notiDeadline,true);
 assert.equal(value.settings.active,undefined);assert.equal(value.settings.avatar,undefined);assert.equal({}.evil,undefined);
 assert.equal(State.normalize({settings:{placeDetails:{bad:{lat:99}}}}).settings.placeDetails.bad,undefined);
});
test('courses persist backend references and resolve after numeric item IDs change; missing places remain recoverable',()=>{
 const values=[{id:'course',title:'나의 코스',date:'2026-11-22',days:[[{id:1,time:'10:00'},{id:2,time:'11:30'}]]}];
 const stored=State.encodeCourses(values,[{id:1,backendId:'post-a'},{id:2,backendId:'manual:pin-b'}]);
 assert.equal(stored[0].days[0][0].id,undefined);
 const restored=State.decodeCourses(stored,[{id:9001,backendId:'post-a'},{id:9009,backendId:'manual:pin-b'}]);
 assert.deepEqual(restored[0].days[0].map(s=>s.id),[9001,9009]);
 const missing=State.decodeCourses(stored,[]);assert.equal(missing[0].days[0][0].contentId,'post-a');
 assert.deepEqual(State.encodeCourses(missing,[]),stored);
});
test('serialized account writes retain unrelated metadata, survive a new session, and isolate users',async()=>{
 const db=server();let current='a';const store=State.createStore(db.client,'a',()=>current==='a');
 const settings=State.normalize({settings:{notiNearby:true,places:['집']},preferences:['cafe'],appearance:'dark'});
 await Promise.all([store.write({pinmap_preferences:settings}),store.write({pinmap_courses:[{id:'trip'}]})]);
 const reloaded=await db.client.auth.getUser();assert.equal(reloaded.data.user.user_metadata.pinmap_preferences.settings.notiNearby,true);
 assert.deepEqual(reloaded.data.user.user_metadata.pinmap_favorites,['keep']);assert.equal(reloaded.data.user.user_metadata.pinmap_courses[0].id,'trip');
 current='b';db.switch('b');await assert.rejects(store.write({pinmap_preferences:settings}),/계정/);assert.equal(db.users.b.user_metadata.pinmap_preferences,undefined);
});
test('a failed metadata update rejects and a later retry can succeed',async()=>{
 const db=server(),store=State.createStore(db.client,'a',()=>true);db.fail();await assert.rejects(store.write({pinmap_courses:[]}),/offline/);assert.equal(db.users.a.user_metadata.pinmap_courses,undefined);
 db.fail(false);await store.write({pinmap_courses:[]});assert.deepEqual(db.users.a.user_metadata.pinmap_courses,[]);
});
function ui(){
 const db=server(),events={},messages=[];
 const context=vm.createContext({PM_ENV:{requiresAuth:true},PinmapUserState:State,PinmapCategories:{get:id=>['cafe','food'].includes(id)?{id}:null},settings:{},preferences:[],homeViewIds:null,items:[],PinmapAccountLoaded:true,PinmapAccountLoadError:false,
  PinmapTheme:{mode:'system',set(v){this.mode=v}},render(){},toast:m=>messages.push(m),console});
 context.window=context;context.addEventListener=(name,fn)=>events[name]=fn;
 vm.runInContext(fs.readFileSync('account-state.js','utf8'),context);
 return {db,context,events,messages,api:context.PinmapAccountState};
}
test('account adapter saves settings, rolls back errors, reloads them, and clears on sign out',async()=>{
 const {db,context,api,events,messages}=ui();api.hydrate(db.users.a,db.client);
 context.settings.notiNearby=true;context.settings.places=['집'];context.preferences=['cafe'];assert.equal(await api.persist(),true);
 context.settings.notiNearby=false;api.hydrate(db.users.a,db.client);assert.equal(context.settings.notiNearby,true);assert.equal(context.preferences[0],'cafe');
 db.fail();context.settings.notiNearby=false;assert.equal(await api.persist(),false);assert.equal(context.settings.notiNearby,true);assert(messages.includes('offline'));
 events['pinmap:account-cleared']();assert.equal(context.settings.places.length,0);assert.equal(context.preferences.length,0);assert.equal(api.userId,null);
});
test('development preview restrictions never run in the signed-in app',()=>{
 const ctx=vm.createContext({PM_ENV:{development:true,requiresAuth:true,cloudPlaceTest:false}});
 vm.runInContext(fs.readFileSync('development.js','utf8'),ctx);
 assert(!Object.hasOwn(ctx,'notifications'));
});
test('a metadata read started before a settings change cannot roll the UI back',async()=>{
 const {db,context,api}=ui();api.hydrate(db.users.a,db.client);
 const oldUser=structuredClone(db.users.a),readRevision=api.revision;
 context.settings.notiReminder=true;await api.persist();
 api.hydrate(oldUser,db.client,readRevision);
 assert.equal(context.settings.notiReminder,true);
});
test('rapid settings updates are serialized and a failed earlier write cannot roll back a later success',async()=>{
 const {db,context,api}=ui();api.hydrate(db.users.a,db.client);
 const update=db.client.auth.updateUser;let calls=0;
 db.client.auth.updateUser=async change=>{if(++calls===1)throw Error('first write failed');return update(change)};
 context.settings.notiNearby=true;const first=api.persist();
 context.settings.notiReminder=true;const second=api.persist();
 assert.deepEqual(await Promise.all([first,second]),[false,true]);
 assert.equal(context.settings.notiNearby,true);assert.equal(context.settings.notiReminder,true);
 assert.equal(db.users.a.user_metadata.pinmap_preferences.settings.notiReminder,true);
});
