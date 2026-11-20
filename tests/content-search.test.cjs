const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {matches} = require('../search-content.js');

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
  const source = fs.readFileSync('account-content.js','utf8').split('\nif (PM_ENV.requiresAuth)')[0];
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
