const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const adapter=fs.readFileSync('online-place-test.js','utf8').split('\nif (PM_ENV.cloudPlaceTest) {')[0];
function item(report) {
  return vm.runInNewContext(`${adapter}\npinmapPlaceReportItem(report)`,{report,Date,Number,Error});
}

test('an extraction report retains map pins, author, summary and unlocated place reasons',()=>{
  const report={source_url:'https://www.instagram.com/p/abc/',ai_title:'서울의 바 세 곳',
    ai_summary:'골목 안의 바를 소개해요.',author_username:'city.finder',cover_data_url:'data:image/jpeg;base64,AAA',
    places:[{name:'첫 바',address:'서울 마포구',coordinates:{lat:37.5,lng:126.9}},
      {name:'둘째 바',map_lookup:{status:'not_found'}}],
    map_locations:[{name:'첫 바',address:'서울 마포구',coordinates:{lat:37.5,lng:126.9},image_data_url:'data:image/jpeg;base64,BBB',needs_review:true},
      {name:'잘못된 좌표',coordinates:{lat:null,lng:126.9}}]};
  const actual=item(report);
  assert.equal(actual.title,'서울의 바 세 곳');
  assert.equal(actual.authorUsername,'city.finder');
  assert.equal(actual.desc,'골목 안의 바를 소개해요.');
  assert.equal(actual.photo,'data:image/jpeg;base64,AAA');
  assert.equal(actual.mapLocations.length,1);
  assert.equal(actual.mapLocations[0].image_data_url,'data:image/jpeg;base64,BBB');
  assert.equal(actual.mapLocations[0].review_required,true);
  assert.equal(actual.extractionPlaces.length,2);
  assert.match(actual.extractionPlaces[1].reason,/찾지 못/);
  assert.equal(actual.pending,false);
});

test('places without coordinates remain reviewable in detail instead of becoming false map pins',()=>{
  const actual=item({places:[{name:'위치 미확인',map_lookup:{status:'ambiguous'}}],map_locations:[]});
  assert.equal(actual.pending,true);
  assert.equal(actual.mapLocations.length,0);
  assert.match(actual.extractionPlaces[0].reason,/동명이점/);
});

test('prototype frame bridge forwards only trusted backend reports',()=>{
  const sent=[];
  const iframe={postMessage:(message,origin)=>sent.push({to:'iframe',message,origin})};
  const opener={postMessage:(message,origin)=>sent.push({to:'backend',message,origin})};
  const listeners={};
  vm.runInNewContext(fs.readFileSync('place-report-bridge.js','utf8'),{
    location:{origin:'https://pinmap-prototype.vercel.app'},
    document:{querySelector:()=>({contentWindow:iframe,getAttribute:()=> 'app.html?mode=development'})},
    window:{opener,addEventListener:(name,fn)=>listeners[name]=fn}
  });
  listeners.message({source:iframe,origin:'https://pinmap-prototype.vercel.app',data:{type:'pinmap:place-report-ready'}});
  assert.equal(sent[0].to,'backend');
  assert.equal(sent[0].origin,'https://pinmap-backend.vercel.app');
  listeners.message({source:iframe,origin:'https://pinmap-prototype.vercel.app',data:{type:'pinmap:place-report-failed',reason:'분석 결과가 비어 있습니다.'}});
  assert.equal(sent[1].to,'backend');
  assert.equal(sent[1].message.reason,'분석 결과가 비어 있습니다.');
  const report={places:[{name:'첫 바'}]};
  listeners.message({source:opener,origin:'https://other.example',data:{type:'pinmap:place-report',report}});
  assert.equal(sent.length,2);
  listeners.message({source:opener,origin:'https://pinmap-backend.vercel.app',data:{type:'pinmap:place-report',report}});
  assert.equal(sent[2].to,'iframe');
  assert.equal(sent[2].message.report,report);
});
