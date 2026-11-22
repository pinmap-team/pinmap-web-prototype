const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const detailHelpers=fs.readFileSync('detail.js','utf8').split('\ndetail = function(){')[0];

test('detail marks a full extracted date without a review-needed badge',()=>{
  const context={esc:value=>String(value),icon:()=>'',Date};
  vm.runInNewContext(detailHelpers,context);
  const markup=vm.runInNewContext(`dtEventInfo([
    {title:'겨울 전시',event_type:'exhibition',start_date:'2026-12-11',end_date:'2027-04-11',needs_review:true},
    {title:'날짜 미상 전시',event_type:'exhibition',date_text:'12월 중',needs_review:true}
  ])`,context);
  const [dated,undated]=markup.match(/<li>.*?<\/li>/g);
  assert.match(dated,/전시 · 날짜 추출/);
  assert.match(dated,/2026\.12\.11 – 2027\.04\.11/);
  assert.doesNotMatch(dated,/확인 필요/);
  assert.match(undated,/전시 · 날짜 확인 필요/);
});

test('invalid calendar dates do not become dated event badges',()=>{
  const context={esc:value=>String(value),icon:()=>'',libThumb:()=>'',fmtDay:()=>'',
    NAV:[],pageName:{},items:[{id:7,title:'전시 모음',art:'exhibit',events:[
      {title:'겨울 전시',start_date:'2026-12-11',needs_review:true},
      {title:'날짜 오류',start_date:'2026-02-30',needs_review:true}]}],
    settings:{calSeeded:true},PM_ENV:{development:true},afterChange:()=>{},render:()=>{},pages:{},actions:{},
    document:{addEventListener:()=>{}},Date,Number,Math};
  vm.runInNewContext(fs.readFileSync('calendar.js','utf8'),context);
  assert.equal(vm.runInNewContext('calDueList().length',context),1);
  const markup=vm.runInNewContext('calRow(calDueList()[0])',context);
  assert.doesNotMatch(markup,/확인 필요|추출 일정 후보/);
});
