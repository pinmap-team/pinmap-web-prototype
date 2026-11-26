const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function setup(config,{naverAvailable=true,naverReadyAfterCallback=false,mainMap=false}={}){
  const elements=[];
  const element=tag=>({tag,style:{},dataset:{},children:[],setAttribute(){},remove(){},prepend(child){this.children.unshift(child)},append(child){this.children.push(child)},replaceChildren(...children){this.children=children},querySelector(selector){return selector==='.pm-map-error'?this.children.find(child=>child.className==='pm-map-error')||null:null}});
  const host=element('div');
  host.getBoundingClientRect=()=>({top:0,width:402,height:874});
  host.closest=selector=>mainMap&&['.lm-drawn-map','.live-map'].includes(selector)?{querySelector:()=>null}:null;
  const mapListeners={};
  const map={getContainer:()=>host,getCenter:()=>({lat:37.5,lng:127}),getZoom:()=>14,containerPointToLatLng:()=>({lat:37.5,lng:127}),on(name,handler){mapListeners[name]=handler}};
  const listeners={};
  const window={addEventListener(name,handler){listeners[name]=handler},removeEventListener(name){delete listeners[name]}};
  let googleOptions,naverOptions,updatedOptions;
  const cameraMoves=[],naverMoves=[];
  const google={maps:{Map:class{constructor(surface,options){googleOptions=options;this.surface=surface}moveCamera(options){cameraMoves.push(options)}setOptions(options){updatedOptions=options}},event:{clearInstanceListeners(){}}}};
  const naver={maps:{LatLng:class{constructor(lat,lng){this.lat=lat;this.lng=lng}},Size:class{constructor(width,height){this.width=width;this.height=height}},Map:class{constructor(surface,options){naverOptions=options;this.surface=surface}setSize(size){naverMoves.push({size})}setCenter(center){naverMoves.push({center})}setZoom(zoom){naverMoves.push({zoom})}}}};
  const document={documentElement:{dataset:{theme:'light'}},createElement:tag=>{const node=element(tag);elements.push(node);return node},head:{append(script){if(script.src.includes('maps.googleapis.com'))window.__pinmapGoogleMapsReady();else if(!naverAvailable)script.onerror();else {if(!naverReadyAfterCallback)window.naver=naver;window.__pinmapNaverMapsReady();if(naverReadyAfterCallback)setTimeout(()=>{window.naver=naver},5)}}}};
  const context={window,document,google,naver,fetch:async()=>({ok:true,json:async()=>config}),setTimeout,clearTimeout,requestAnimationFrame:callback=>{callback();return 1},cancelAnimationFrame(){}};
  vm.runInNewContext(fs.readFileSync('map-providers.js','utf8'),context);
  return {window,host,map,mapListeners,cameraMoves,naverMoves,elements,document,listeners,getGoogleOptions:()=>googleOptions,getNaverOptions:()=>naverOptions,getUpdatedOptions:()=>updatedOptions};
}

const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('every map view delegates to the shared background provider',()=>{
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

test('missing map configuration shows an error',async()=>{
  const app=setup({available:{google:false},googleBrowserKey:''});
  let message='';
  app.window.PinmapMapProviders.attach(app.map,state=>{message=state.error||''});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'loading');
  assert.equal(app.host.dataset.mapError,'true');
  assert.match(message,/지도 설정/);
  assert.equal(app.elements.filter(node=>node.tag==='script').length,0);
});

test('Naver is the background when a current browser client ID is configured',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
  assert(app.elements.some(node=>node.tag==='script'&&node.src.includes('ncpKeyId=naver-test')));
  assert.equal(app.getNaverOptions().zoom,14);
  assert.equal(app.getGoogleOptions(),undefined);
  const before=app.naverMoves.length;
  app.map.containerPointToLatLng=()=>({lat:37.6,lng:127.1});
  app.mapListeners['move zoom resize']();
  assert.equal(app.naverMoves.length,before+3);
  assert.equal(app.naverMoves.at(-2).center.lat,37.6);
});

test('map button can switch a Korean view between Naver and Google without resetting its camera',async()=>{
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(controller.current,'naver');
  assert.equal(controller.setPreferredProvider('google').current,'google');
  await flush();
  assert.equal(controller.current,'google');
  assert.equal(app.getGoogleOptions().zoom,14);
  app.mapListeners.moveend();
  await flush();
  assert.equal(controller.current,'google');
  assert.equal(controller.setPreferredProvider('naver').current,'naver');
  await flush();
  assert.equal(controller.current,'naver');
});

test('main map changes provider only through its switch, not place selection, filtering or panning',async()=>{
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'},{mainMap:true});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(controller.current,'naver');
  const googlePlace={lat:37.5,lng:127,coordinateSource:'google_places'};
  controller.setPlaces([googlePlace]);
  controller.selectPlace(googlePlace);
  controller.setPlaces([]);
  await flush();
  assert.equal(controller.current,'naver');
  app.map.getCenter=()=>({lat:35.68,lng:139.69});
  app.mapListeners.moveend();
  await flush();
  assert.equal(controller.current,'naver');
  assert.equal(controller.setPreferredProvider('google').current,'google');
  await flush();
  assert.equal(controller.current,'google');
  app.map.getCenter=()=>({lat:37.5,lng:127});
  controller.selectPlace(googlePlace);
  assert.equal(controller.setPreferredProvider('naver').current,'naver');
  await flush();
  assert.equal(controller.current,'naver');
  assert.equal(controller.setPreferredProvider('google').current,'google');
  await flush();
  app.map.getCenter=()=>({lat:37.5,lng:127});
  controller.selectPlace(null);
  controller.setPlaces([{lat:37.5,lng:127,coordinateSource:'naver'}]);
  app.mapListeners.moveend();
  await flush();
  assert.equal(controller.current,'google');
  assert.equal(controller.setPreferredProvider('naver').current,'naver');
  await flush();
  assert.equal(controller.current,'naver');
});

test('main map sends the same latitude and longitude to both base map providers',async()=>{
  const point={lat:37.5445,lng:127.044};
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'},{mainMap:true});
  app.map.getCenter=()=>point;
  app.map.containerPointToLatLng=()=>point;
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.getNaverOptions().center.lat,point.lat);
  assert.equal(app.getNaverOptions().center.lng,point.lng);
  controller.setPreferredProvider('google');
  await flush();
  assert.equal(app.getGoogleOptions().center.lat,point.lat);
  assert.equal(app.getGoogleOptions().center.lng,point.lng);
  assert.equal(app.cameraMoves.at(-1).center.lat,point.lat);
  assert.equal(app.cameraMoves.at(-1).center.lng,point.lng);
});

test('main map restores a user-selected provider after its view remounts',async()=>{
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'},{mainMap:true});
  const controller=app.window.PinmapMapProviders.attach(app.map,undefined,{preferredProvider:'google'});
  await flush();
  assert.equal(controller.current,'google');
  controller.setPlaces([{lat:37.5,lng:127,coordinateSource:'naver'}]);
  await flush();
  assert.equal(controller.current,'google');
});

test('manual Naver cannot override the required Google map for an overseas place',async()=>{
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  controller.selectPlace({lat:35.68,lng:139.69});
  await flush();
  assert.equal(controller.current,'google');
  assert.match(controller.setPreferredProvider('naver').error,/구글 지도/);
  assert.equal(controller.current,'google');
});

test('manual Naver takes precedence over automatic Google selection for other visible Korean places',async()=>{
  const app=setup({available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  controller.setPlaces([{lat:37.5,lng:127,coordinateSource:'google_places'}]);
  await flush();
  assert.equal(controller.current,'google');
  controller.setPreferredProvider('naver');
  await flush();
  assert.equal(controller.current,'naver');
  assert.equal(controller.manual,true);
  app.mapListeners.moveend();
  await flush();
  assert.equal(controller.current,'naver');
});

test('Naver stays the default when its callback precedes the map constructor',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'},{naverReadyAfterCallback:true});
  app.window.PinmapMapProviders.attach(app.map);
  await new Promise(resolve=>setTimeout(resolve,70));
  assert.equal(app.host.dataset.mapProvider,'naver');
  assert.equal(app.getGoogleOptions(),undefined);
});

test('Korean places use Naver even when another saved place came from Google',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
  controller.selectPlace({lat:35.16,lng:129.06});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
  assert.equal(app.getGoogleOptions(),undefined);
});

test('foreign content switches to Google and domestic content returns to Naver',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  controller.selectPlace({lat:35.68,lng:139.69});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  controller.selectPlace({lat:33.45,lng:126.57});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
});

test('a selected domestic Google Places coordinate uses Google for its attribution',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  controller.selectPlace({lat:37.5,lng:127,coordinateSource:'google_places'});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
});

test('visible Google Places badges switch the background to Google and restore Naver when filtered out',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  const controller=app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
  controller.setPlaces([{lat:37.5,lng:127,coordinateSource:'google_places'}]);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  controller.setPlaces([{lat:37.5,lng:127,coordinateSource:'naver'}]);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
});

test('map center outside Korea also uses Google and returns on moving home',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  app.map.getCenter=()=>({lat:48.85,lng:2.35});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  app.map.getCenter=()=>({lat:37.5,lng:127});
  app.mapListeners.moveend();
  await flush();
  assert.equal(app.host.dataset.mapProvider,'naver');
});

test('a route containing an overseas stop uses Google even if its center is in Korea',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'naver-test'});
  app.window.PinmapMapProviders.attach(app.map,undefined,{places:[{lat:37.5,lng:127},{lat:35.68,lng:139.69}]});
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
});

test('domestic bounds include Jeju and Dokdo',()=>{
  const route=setup({available:{}}).window.PinmapMapProviders;
  assert.equal(route.needsGoogle({lat:37.46,lng:126.44}),false); // Incheon Airport
  assert.equal(route.needsGoogle({lat:35.18,lng:129.07}),false); // Busan
  assert.equal(route.needsGoogle({lat:33.45,lng:126.57}),false);
  assert.equal(route.needsGoogle({lat:37.24,lng:131.87}),false);
  assert.equal(route.needsGoogle({lat:33.59,lng:130.4}),true);
  assert.equal(route.needsGoogle({lat:35.68,lng:139.69}),true);
  assert.equal(route.needsGoogle({lat:35.68,lng:139.69,countryCode:'KR'}),false);
});

test('Google remains available when Naver fails to initialize',async()=>{
  const app=setup({defaultProvider:'naver',available:{google:true,naver:true},googleBrowserKey:'google-test',naverClientId:'invalid-test'},{naverAvailable:false});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.host.dataset.mapProvider,'google');
  assert.equal(app.getGoogleOptions().zoom,14);
});

test('map uses the unstyled Google default in every appearance mode',async()=>{
  const app=setup({available:{google:true},googleBrowserKey:'test-browser-key'});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  assert.equal(app.getGoogleOptions().styles,undefined);
  assert.equal(app.listeners['pinmap:theme-changed'],undefined);
});

test('Google camera follows a Leaflet move in the same event',async()=>{
  const app=setup({available:{google:true},googleBrowserKey:'test-browser-key'});
  app.window.PinmapMapProviders.attach(app.map);
  await flush();
  const before=app.cameraMoves.length;
  app.map.containerPointToLatLng=()=>({lat:37.6,lng:127.1});
  app.mapListeners['move zoom resize']();
  assert.equal(app.cameraMoves.length,before+1);
  assert.equal(app.cameraMoves.at(-1).center.lat,37.6);
  assert.equal(app.cameraMoves.at(-1).zoom,14);
});
