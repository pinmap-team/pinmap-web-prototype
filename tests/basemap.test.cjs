const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function setup(config){
  const elements=[];
  const element=tag=>({tag,style:{},dataset:{},children:[],setAttribute(){},remove(){},prepend(child){this.children.unshift(child)},append(child){this.children.push(child)},replaceChildren(...children){this.children=children},querySelector(selector){return selector==='.pm-map-error'?this.children.find(child=>child.className==='pm-map-error')||null:null}});
  const host=element('div');
  host.getBoundingClientRect=()=>({top:0,width:402,height:874});
  host.closest=()=>null;
  const map={getContainer:()=>host,getCenter:()=>({lat:37.5,lng:127}),getZoom:()=>14,containerPointToLatLng:()=>({lat:37.5,lng:127}),on(){}};
  const window={};
  let googleOptions;
  const google={maps:{Map:class{constructor(surface,options){googleOptions=options;this.surface=surface}setCenter(){}setZoom(){}},event:{clearInstanceListeners(){}}}};
  const document={createElement:tag=>{const node=element(tag);elements.push(node);return node},head:{append(script){window.__pinmapGoogleMapsReady()}}};
  const context={window,document,google,fetch:async()=>({ok:true,json:async()=>config}),setTimeout,clearTimeout,requestAnimationFrame:callback=>{callback();return 1},cancelAnimationFrame(){}};
  vm.runInNewContext(fs.readFileSync('map-providers.js','utf8'),context);
  return {window,host,map,elements,getGoogleOptions:()=>googleOptions};
}

const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('every map view delegates to the single Google background',()=>{
  const calls=[];
  const window={PinmapMapProviders:{attach:(map,onChange)=>{calls.push({map,onChange});return 'google'}}};
  vm.runInNewContext(fs.readFileSync('integration.js','utf8'),{window});
  const map={};
  assert.equal(window.attachPinmapBasemap(map,()=>{}),'google');
  assert.equal(calls.length,1);
  assert.equal(calls[0].map,map);
});

test('Google loads without a saved provider choice or alternate basemap',async()=>{
  const app=setup({available:{google:true},googleBrowserKey:'test-browser-key',defaultProvider:'naver'});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  assert(app.elements.some(node=>node.tag==='script'&&node.src.startsWith('https://maps.googleapis.com/maps/api/js?')));
  assert.equal(app.getGoogleOptions().zoom,14);
  assert.equal(app.host.querySelector('.pm-map-error'),null);
});

test('missing Google configuration shows an error instead of another map',async()=>{
  const app=setup({available:{google:false},googleBrowserKey:''});
  let message='';
  app.window.PinmapMapProviders.attach(app.map,state=>{message=state.error||''});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  assert.equal(app.host.dataset.mapError,'true');
  assert.match(message,/구글 지도 설정/);
  assert.equal(app.elements.filter(node=>node.tag==='script').length,0);
});
