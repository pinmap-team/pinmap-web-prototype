const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const lib=fs.readFileSync('library.js','utf8');
const shared=lib.slice(lib.indexOf('function pinmapAgeRestricted'),lib.indexOf('function libCard'));
function api(){return vm.runInNewContext(shared+';({isRestricted:pinmapAgeRestricted,thumb:libThumb,photo:libPhoto})',{PM_ENV:{development:true},art:()=>{throw Error('Unexpected example illustration')},esc:x=>x});}
test('explicit age gates and legacy extraction notes show the restricted state',()=>{
 const a=api();for(const x of [{accessStatus:'age_restricted'},{extractionNotes:['Instagram이 연령 제한 화면을 표시했습니다.']},{extractionNotes:['age_restricted']}])assert.equal(a.isRestricted(x),true);
 for(const x of [{},{extractionNotes:['로그인하지 않아 원본을 확인할 수 없습니다.']},{extractionNotes:['삭제된 게시물입니다.']}])assert.equal(a.isRestricted(x),false);
});
test('restricted thumbnails replace cover and example illustrations with a safe state',()=>{
 const a=api(),x={accessStatus:'age_restricted',photo:'https://example.com/photo.jpg',art:'book'};
 assert.equal(a.photo(x),'');assert.match(a.thumb(x),/pm-restricted-cover/);assert(!a.thumb(x).includes('<img'));
 assert.equal(a.photo({photo:'https://example.com/photo.jpg'}),'https://example.com/photo.jpg');
});
test('account records preserve the explicit age restriction status',()=>{
 const src=fs.readFileSync('account-content.js','utf8').split('\nasync function pinmapReadAccountPages')[0];
 const record={source_url:'https://www.instagram.com/p/example/',status:'age_restricted'};
 const item=vm.runInNewContext(src+';pinmapAccountItem(record,1)',{record,PinmapCategories:require('../categories.js')});
 assert.equal(item.accessStatus,'age_restricted');
});
