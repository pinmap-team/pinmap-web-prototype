const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('detail.js','utf8').split('\ndetail = function(){')[0];
const match=(places,locations)=>Array.from(vm.runInNewContext(`${source}\ndtPlacePhotoIndexes(places,locations)`,{places,locations}));

test('detail place covers match each location, including reordered and unlocated places',()=>{
  const places=[{name:'리니어 카페',address:'서울 서초구',hasCoordinates:true},
    {name:'주소 확인 중',hasCoordinates:false},
    {name:'노즈커피',address:'서울 강남구',hasCoordinates:true}];
  const locations=[{name:'노즈커피',address:'서울 강남구'},
    {name:'리니어 카페',address:'서울 서초구'}];
  assert.deepEqual(match(places,locations),[1,-1,0]);
  assert.deepEqual(match(places,locations.slice(0,1)),[-1,-1,0]);
});

test('edited place keeps its cover by original located order',()=>{
  assert.deepEqual(match([{name:'기존 장소',address:'기존 주소',hasCoordinates:true}],
    [{name:'수정한 장소',address:'새 주소'}]),[0]);
  assert.deepEqual(match([{name:'수정한 장소',address:'새 주소',hasCoordinates:true},
    {name:'노즈커피',address:'서울 강남구',hasCoordinates:true}],
    [{name:'노즈커피',address:'서울 강남구'},
      {name:'기존 장소',address:'기존 주소'}]),[1,0]);
});

test('older extracted places still connect to their located map entries',()=>{
  const places=[{name:'첫 카페',address:'서울 성동구 첫길 1',hasCoordinates:false},
    {name:'둘째 카페',address:'서울 성동구 둘길 2',hasCoordinates:false}];
  const locations=[{name:'둘째 카페',address:'서울 성동구 둘길 2'},
    {name:'첫 카페',address:'서울 성동구 첫길 1'}];
  assert.deepEqual(match(places,locations),[1,0]);
});
