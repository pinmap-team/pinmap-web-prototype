const {test}=require('node:test');
const assert=require('node:assert/strict');
const Places=require('../place-state.js');
const Favorites=require('../favorite-state.js');
const State=require('../user-state.js');

const post=()=>({id:7,backendId:'saved-post',title:'카페 모음',type:'맛집/카페',
  mapLocations:[
    {name:'첫 카페',address:'서울 성동구 첫길 1',coordinates:{lat:37.55,lng:127.04}},
    {name:'둘째 카페',address:'서울 성동구 둘길 2',coordinates:{lat:37.56,lng:127.05}}
  ]});

test('one post exposes independent places for course stops and favorites',()=>{
  const item=post(),places=Places.all([item]);
  assert.deepEqual(places.map(place=>place.id),['place:saved-post:0','place:saved-post:1']);
  assert.deepEqual(places.map(place=>place.title),['첫 카페','둘째 카페']);
  Favorites.toggle(places[1]);
  assert.deepEqual(Places.all([item]).map(place=>place.favorite),[false,true]);
  const saved=State.encodeCourses([{id:'course',title:'오후',date:'2026-11-22',
    days:[[{id:places[1].id,time:'14:00'},{id:places[0].id,time:'15:00'}]]}],[item]);
  assert.deepEqual(saved[0].days[0].map(stop=>stop.placeId),['place:saved-post:1','place:saved-post:0']);
  const loaded=State.decodeCourses(saved,[{...post(),id:999}]);
  assert.deepEqual(loaded[0].days[0].map(stop=>stop.id),['place:saved-post:1','place:saved-post:0']);
});

test('post and place likes stay independent on the same post',()=>{
  const item={...post(),favorite:true};
  assert.deepEqual(Places.all([item]).map(place=>place.favorite),[false,false]);
  Favorites.toggle(Places.all([item])[0]);
  assert.equal(item.favorite,true);
  assert.deepEqual(Places.all([item]).map(place=>place.favorite),[true,false]);
  Favorites.toggle(item);
  assert.equal(item.favorite,false);
  assert.deepEqual(Places.all([item]).map(place=>place.favorite),[true,false]);
  Favorites.toggle(Places.all([item])[1]);
  assert.deepEqual(Places.all([item]).map(place=>place.favorite),[true,true]);
});

test('legacy account course keeps its first place without inventing extra stops',()=>{
  const old=[{id:'old',title:'기존 코스',date:'2026-11-22',
    days:[[{contentId:'saved-post',time:'10:00'}]]}];
  const decoded=State.decodeCourses(old,[post()]);
  assert.deepEqual(decoded[0].days[0].map(stop=>stop.id),['place:saved-post:0']);
  assert.deepEqual(State.encodeCourses(decoded,[post()])[0].days[0],
    [{placeId:'place:saved-post:0',time:'10:00'}]);
});

test('all extracted places can be liked, including those awaiting a map position',()=>{
  const item={...post(),extractionPlaces:[
    {name:'첫 카페',address:'서울 성동구 첫길 1',hasCoordinates:true},
    {name:'찾는 중인 카페',address:'',hasCoordinates:false},
    {name:'둘째 카페',address:'서울 성동구 둘길 2',hasCoordinates:true}
  ]};
  const places=Places.forExtracted(item);
  assert.deepEqual(places.map(place=>place.id),[
    'place:saved-post:0','place:saved-post:unlocated:1','place:saved-post:1']);
  places.forEach(place=>Favorites.toggle(place));
  assert.deepEqual(Places.favorites([item]).map(place=>place.id),places.map(place=>place.id));
  assert.deepEqual(Places.all([item]).map(place=>place.id),['place:saved-post:0','place:saved-post:1']);
  Favorites.toggle(Places.forExtracted(item)[1]);
  assert.deepEqual(Places.favorites([item]).map(place=>place.id),[
    'place:saved-post:0','place:saved-post:1']);
});
