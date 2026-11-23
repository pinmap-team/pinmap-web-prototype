const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

class FixedDate extends Date {
  constructor(...args){super(...(args.length?args:[2026,10,23]));}
}
const iso=offset=>{
  const date=new Date(2026,10,23);
  date.setDate(date.getDate()+offset);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
};
function reminderContext(endOffset){
  const items=[
    {id:1,backendId:'post-a',title:'샤갈 소개 1',events:[{title:'샤갈, 너머의 여정',start_date:iso(1),end_date:iso(endOffset)}]},
    {id:2,backendId:'post-b',title:'샤갈 소개 2',events:[{title:'샤갈 너머의 여정',start_date:iso(1),end_date:iso(endOffset)}]}
  ];
  const context={Date:FixedDate,Math,Number,String,Set,items,
    settings:{calSeeded:true,notiDeadline:true,notiNearby:false,notiReminder:false},
    PM_ENV:{development:true},NAV:[],pageName:{},pages:{},actions:{},
    afterChange(){},render(){},document:{addEventListener(){}},
    isPlace:()=>false,readyPlaces:()=>[],distanceOf:()=>0,mainPlace:()=>'',
    savedAgo:()=>'',fmtDay:date=>date.toISOString().slice(0,10)};
  vm.runInNewContext(fs.readFileSync('calendar.js','utf8'),context);
  vm.runInNewContext(fs.readFileSync('my.js','utf8').split('unreadCount =')[0],context);
  return context;
}

test('an exhibition opening tomorrow and closing months later creates no deadline alert',()=>{
  const context=reminderContext(125);
  assert.equal(vm.runInNewContext('calDueList().length',context),4);
  assert.equal(vm.runInNewContext('notifications().length',context),0);
});

test('two saved posts about the same exhibition create one closing alert',()=>{
  const context=reminderContext(2);
  const alerts=vm.runInNewContext('notifications()',context);
  assert.equal(alerts.length,1);
  assert.match(alerts[0].title,/^마감 D-2 샤갈/);
  assert.match(alerts[0].id,/^due-post-a-/);
  context.settings.notiDeadline=false;
  assert.equal(vm.runInNewContext('notifications().length',context),0);
});
