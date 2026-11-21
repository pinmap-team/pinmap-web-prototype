const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){const window={addEventListener(){}};const context={window,PM_ENV:{requiresAuth:true,placeholderImage:'data:image/svg+xml,placeholder'},esc:s=>String(s).replaceAll('"','&quot;'),document:{documentElement:{},querySelectorAll:()=>[],addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame(){}};vm.runInNewContext(fs.readFileSync('place-photos.js','utf8'),context);return window.PinmapPlacePhotos;}
test('an SVG no-photo placeholder still requests a real saved-place photo',()=>{const p=setup();assert.match(p.markup('11111111-1111-4111-8111-111111111111',0,''),/data-pm-photo-id=/);});
test('an existing post image takes priority and demo items never request account photos',()=>{const p=setup();assert.doesNotMatch(p.markup('11111111-1111-4111-8111-111111111111',0,'data:image/jpeg;base64,YQ=='),/data-pm-photo-id=/);assert.doesNotMatch(p.markup(undefined,0,''),/data-pm-photo-id=/);});
test('missing venue image uses its post cover, including an unlocated venue',()=>{
 const p=setup(),cover='data:image/jpeg;base64,YQ==';
 assert.equal(p.preferredImage({image_data_url:'data:image/jpeg;base64,Yg=='},cover),'data:image/jpeg;base64,Yg==');
 assert.equal(p.preferredImage({image_data_url:null},cover),cover);
 assert.equal(p.preferredImage(null,cover),cover);
 assert.doesNotMatch(p.markup('11111111-1111-4111-8111-111111111111',0,p.preferredImage({},cover)),/data-pm-photo-id=/);
 assert.equal(p.preferredImage({},''),'data:image/svg+xml,placeholder');
});
