const {test}=require('node:test');
const assert=require('node:assert/strict');
const data=require('../account-map-data.js');

test('account map edits restore the address and pin position after a reload',()=>{
  const original={title:'원본',address:'',type:'맛집/카페',category:'장소',pending:true,mapLocations:[]};
  const edits=data.normalizeEdits({'post-1':{title:'수정한 카페',address:'서울 송파구 올림픽로 424',type:'맛집/카페',category:'카페',lat:37.5,lng:127.1}});
  const item=data.applyEdit({...original,mapLocations:[]},edits['post-1']);
  assert.equal(item.address,'서울 송파구 올림픽로 424');
  assert.equal(item.pending,false);
  assert.deepEqual(item.mapLocations[0].coordinates,{lat:37.5,lng:127.1});
  assert.equal(item.folderCategory,'카페');
  assert.equal(original.address,'');
});

test('direct pins keep stable identifiers and coordinates after normalization',()=>{
  const id='123e4567-e89b-42d3-a456-426614174000';
  const pins=data.normalizePins([{id,title:'직접 추가',type:'여행',address:'',memo:'가 보고 싶다',lat:37.55,lng:127.04,savedAt:'2026-11-20T01:00:00Z'}]);
  const item=data.manualItem(pins[0],15);
  assert.equal(item.backendId,'manual:'+id);
  assert.equal(item.pending,false);
  assert.equal(item.mapLocations[0].coordinates.lng,127.04);
  assert.equal(item.memo,'가 보고 싶다');
});
