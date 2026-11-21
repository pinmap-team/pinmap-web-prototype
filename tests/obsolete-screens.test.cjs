const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');

test('the old illustrated map and superseded screens cannot render',()=>{
  const app=read('app.js');
  assert.doesNotMatch(app,/저장한 곳, 지금 가까이에|mapdrawing|예시 지도, 실제 거리와 다를 수 있어요/);
  assert.doesNotMatch(app,/pages\.(?:home|library|map)\s*=/);
  assert.match(app,/pages\[page\] \|\| unavailableScreen/);
  assert.doesNotMatch(read('pinmap.js'),/pages\.home\s*=/);
  assert.doesNotMatch(read('library.js'),/pages\.library\s*=/);
  assert.match(read('home.js'),/pages\.home\s*=/);
  assert.match(read('collection.js'),/pages\.library\s*=/);
  assert.doesNotMatch(read('mypages.js'),/myBase\(\)|pages\.my\s*=/);
});
