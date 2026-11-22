const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {matches, findPlaces, nearbyPlaces} = require('../search-content.js');

test('map search returns individual places and ranks place details above post context', () => {
  const places = [
    {id:1,locationIndex:0,title:'느린 서점',address:'서울 종로구 북촌로 5',sourceTitle:'북촌 산책 코스',searchSummary:'서점과 카페를 방문해요.'},
    {id:1,locationIndex:1,title:'달빛 카페',address:'서울 종로구 삼청로 8',sourceTitle:'북촌 산책 코스',searchSummary:'서점과 카페를 방문해요.'},
    {id:2,locationIndex:0,title:'북촌 사진관',address:'서울 종로구 북촌로 8',sourceTitle:'사진 기록'}
  ];
  assert.deepEqual(findPlaces(places,'달빛 카페').map(x=>x.locationIndex),[1]);
  assert.deepEqual(findPlaces(places,'달').map(x=>x.title),['달빛 카페']);
  assert.deepEqual(findPlaces(places,'삼청로').map(x=>x.title),['달빛 카페']);
  assert.deepEqual(findPlaces(places,'카페 서점').map(x=>x.title),['느린 서점','달빛 카페']);
  assert.deepEqual(findPlaces(places,'북촌').map(x=>x.title),['느린 서점','북촌 사진관','달빛 카페']);
  assert.deepEqual(findPlaces(places,'부산').map(x=>x.title),[]);
});

test('map suggestions put closer places first without changing saved place records', () => {
  const places = [
    {title:'먼 카페',lat:37.7,lng:127.1,saved:true},
    {title:'가까운 서점',lat:37.546,lng:127.044,saved:true},
    {title:'가까운 저장 장소',lat:37.546,lng:127.044,saved:true}
  ];
  assert.deepEqual(nearbyPlaces(places,[37.546,127.043]).map(x=>x.title),
    ['가까운 서점','가까운 저장 장소','먼 카페']);
  assert.equal(places[0].title,'먼 카페');
});

test('searches title, summary and place fields across words', () => {
  const item = {
    title:'주말에 가기 좋은 곳',
    desc:'조용한 창가에서 디저트를 즐길 수 있어요.',
    extractionPlaces:[{name:'달빛 카페',address:'서울 마포구 연남동 12',hasCoordinates:false}],
    mapLocations:[{name:'달빛 카페',address:'서울 마포구 연남동 12'}]
  };
  assert.equal(matches(item,'주말'),true);
  assert.equal(matches(item,'디저트'),true);
  assert.equal(matches(item,'연남동 카페'),true);
  assert.equal(matches(item,'카페 디저트'),true);
  assert.equal(matches(item,'강남 카페'),false);
});

test('account analysis keeps unlocated places and event venues searchable', () => {
  const source = (fs.readFileSync('categories.js','utf8')+'\n'+fs.readFileSync('account-content.js','utf8')).split('\nif (PM_ENV.requiresAuth)')[0];
  const record = {
    id:'record-1',source_url:'https://www.instagram.com/p/Example123/',
    content_kind:'mixed',status:'needs_review',ai_title:'하루 코스',
    ai_summary:'서점과 전시를 함께 둘러보는 코스. '+ '소개 '.repeat(180) + '마지막 단서',
    places:[{name:'느린 서점',address:'서울 종로구 북촌로 5',needs_review:true}],
    events:[{title:'종이의 시간',venue_name:'파란 전시장',address:'서울 종로구 삼청로 8'}],
    map_locations:[]
  };
  const item = vm.runInNewContext(`${source}\npinmapAccountItem(record, 1)`,{record});
  assert.equal(matches(item,'서점'),true);
  assert.equal(matches(item,'마지막 단서'),true);
  assert.equal(matches(item,'북촌로'),true);
  assert.equal(matches(item,'파란 전시장'),true);
  assert.equal(matches(item,'삼청로 전시'),true);
  assert.equal(matches(item,'부산'),false);
});

test('empty and legacy items remain searchable without nested analysis', () => {
  assert.equal(matches({title:'성수 카페',memo:'친구와 방문'},'  '),true);
  assert.equal(matches({title:'성수 카페',memo:'친구와 방문'},'친구 성수'),true);
  assert.equal(matches({title:'성수 카페'},'다른 장소'),false);
});
