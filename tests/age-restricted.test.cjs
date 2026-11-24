const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const lib=fs.readFileSync('library.js','utf8');
const shared=lib.slice(lib.indexOf('function pinmapAgeRestricted'),lib.indexOf('function libCard'));
function api(){const handlers={};return vm.runInNewContext(shared+';({isRestricted:pinmapAgeRestricted,thumb:libThumb,photo:libPhoto,failure:pinmapAnalysisFailure,handlers})',{PM_ENV:{development:true,requiresAuth:true},document:{addEventListener:(name,handler)=>handlers[name]=handler},handlers,icon:name=>`<svg>${name}</svg>`,art:()=>{throw Error('Unexpected example illustration')},esc:x=>x});}
test('explicit age gates and legacy extraction notes show the restricted state',()=>{
 const a=api();for(const x of [{accessStatus:'age_restricted'},{extractionNotes:['Instagram이 연령 제한 화면을 표시했습니다.']},{extractionNotes:['age_restricted']}])assert.equal(a.isRestricted(x),true);
 for(const x of [{},{extractionNotes:['로그인하지 않아 원본을 확인할 수 없습니다.']},{extractionNotes:['삭제된 게시물입니다.']}])assert.equal(a.isRestricted(x),false);
});
test('restricted thumbnails replace cover and example illustrations with a safe state',()=>{
 const a=api(),x={accessStatus:'age_restricted',photo:'https://example.com/photo.jpg',art:'book'};
 assert.equal(a.photo(x),'');assert.match(a.thumb(x),/pm-restricted-cover/);assert(!a.thumb(x).includes('<img'));
 assert.equal(a.photo({photo:'https://example.com/photo.jpg'}),'https://example.com/photo.jpg');
});
test('missing and broken cover images use the existing guidance cover instead of a book illustration',()=>{
 const a=api();
 for(const x of [{art:'book',desc:'요약된 게시물'},{art:'cafe',desc:'요약된 게시물'}]){
  assert.match(a.thumb(x),/pm-restricted-cover/);
  assert.match(a.thumb(x),/이미지를 불러오지 못했어요/);
  assert(!a.thumb(x).includes('<img'));
 }
 assert.match(a.thumb({photo:'https://example.com/broken.jpg',desc:'요약된 게시물'}),/pm-cover-img/);
 const image={matches:selector=>selector==='.pm-cover-img',outerHTML:''};
 a.handlers.error({target:image});
 assert.match(image.outerHTML,/이미지를 불러오지 못했어요/);
 const app=fs.readFileSync('app.js','utf8');
 assert(!app.includes('Small</text>'));
 assert(!app.includes('svgs.book'));
 const artSource=app.slice(app.indexOf('function art(kind)'),app.indexOf('/* ---------- 카드 ---------- */'));
 const legacyArt=vm.runInNewContext(artSource+';art("book")',{PM_ENV:{placeholderImage:'data:image/svg+xml,placeholder'}});
 assert.match(legacyArt,/data:image\/svg\+xml,placeholder/);
 assert(!legacyArt.includes('<text'));
 assert(!fs.readFileSync('account-content.js','utf8').includes("|| 'book'"));
});
test('account records preserve the explicit age restriction status',()=>{
 const src=fs.readFileSync('account-content.js','utf8').split('\nasync function pinmapReadAccountPages')[0];
 const record={source_url:'https://www.instagram.com/p/example/',status:'age_restricted'};
 const item=vm.runInNewContext(src+';pinmapAccountItem(record,1)',{record,PinmapCategories:require('../categories.js')});
 assert.equal(item.accessStatus,'age_restricted');
});

test('failed posts have distinct reasons and practical actions',()=>{
 const a=api();for(const [code,kind] of [['private_account','private'],['post_not_found','deleted'],['login_required','login'],['media_download_failed','media'],['analysis_timeout','temporary'],['monthly_analysis_limit','quota'],['analysis_failed','unknown']]){
  const state=a.failure({analysisFailureCode:code});assert.equal(state.kind,kind);assert(state.actionLabel);
 }
 assert.equal(a.failure({contentKind:'unknown',status:'needs_review',extractionNotes:['정확한 원인 없음']}).kind,'unknown');
 assert.equal(a.failure({status:'pending'}),null);
});
test('every partially analyzed post retains its result screen even with failure notes',()=>{
 const a=api();for(const patch of [{desc:'요약 결과'},{searchSummary:'요약 결과'},{aiClassified:true},{extractionPlaces:[{name:'장소'}]},{mapLocations:[{}]},{events:[{}]},{address:'주소'}]){
  assert.equal(a.failure({analysisFailureCode:'analysis_failed',extractionNotes:['미디어 수집 실패'],...patch}),null);
 }
});
test('retry action opens the shared link input with the existing URL without submitting an analysis',()=>{
 const src=fs.readFileSync('add-choice.js','utf8').match(/actions\.analysisretry=\(\)=>\{[\s\S]*?\n  \};/)[0];
 const opened=[];
 const context={actions:{linkimport:url=>opened.push(url)},items:[{id:7,url:'https://www.instagram.com/p/example/'}],detailId:7};
 vm.runInNewContext(src,context);context.actions.analysisretry();
 assert.deepEqual(opened,[context.items[0].url]);
});
