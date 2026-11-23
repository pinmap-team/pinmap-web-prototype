const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const State=require('../user-state.js');

function calendar(){
  const context=vm.createContext({NAV:[],pageName:{},pages:{},items:[],settings:{calSeeded:true,calendarWeekStart:'sunday'},
    PM_ENV:{development:true},afterChange(){},render(){},document:{addEventListener(){}},
    icon:()=>'',esc:String,fmtDay:()=>'',libPhoto:()=>false,libThumb:()=>'',Date,Math,Number});
  vm.runInContext(fs.readFileSync('calendar.js','utf8'),context);
  const home=fs.readFileSync('home.js','utf8');
  vm.runInContext(home.slice(home.indexOf('function calWidget()'),home.indexOf('/* ---------- 작은 위젯')),context);
  return context;
}

test('default Sunday and selected Monday order both calendar and home week across month boundary',()=>{
  const context=calendar();
  vm.runInContext('calMonth=new Date(2026,10,1);calSel="2026-11-1"',context);
  assert.equal(State.normalize({}).settings.calendarWeekStart,'sunday');
  assert.equal(vm.runInContext('calWeekLabels()[0]',context),'일');
  assert.equal((context.pages.calendar().match(/calcell calblank/g)||[]).length,0);
  assert.match(vm.runInContext('calWidget()',context),/data-calday="2026-11-1"/);
  context.settings.calendarWeekStart='monday';
  assert.equal(vm.runInContext('calWeekLabels()[0]',context),'월');
  assert.equal((context.pages.calendar().match(/calcell calblank/g)||[]).length,6);
  assert.match(vm.runInContext('calWidget()',context),/data-calday="2026-10-26"/);
  assert.equal(State.normalize({settings:{calendarWeekStart:'monday'}}).settings.calendarWeekStart,'monday');
  assert.equal(State.normalize({settings:{calendarWeekStart:'invalid'}}).settings.calendarWeekStart,'sunday');
});

test('week start preference survives account metadata save and remains account-specific',async()=>{
  const users={a:{id:'a',user_metadata:{}},b:{id:'b',user_metadata:{}}};
  let current='a';
  const client={auth:{getUser:async()=>({data:{user:users[current]}}),updateUser:async({data})=>{Object.assign(users[current].user_metadata,structuredClone(data));return {data:{user:users[current]}};}}};
  const store=State.createStore(client,'a',()=>current==='a');
  await store.write({pinmap_preferences:State.normalize({settings:{calendarWeekStart:'monday'}})});
  assert.equal(State.normalize(users.a.user_metadata.pinmap_preferences).settings.calendarWeekStart,'monday');
  current='b';
  assert.equal(State.normalize(users.b.user_metadata.pinmap_preferences).settings.calendarWeekStart,'sunday');
});
