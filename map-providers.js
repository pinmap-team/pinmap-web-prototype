/* Switch the main Leaflet map's background while leaving its markers and gestures intact. */
(() => {
  const labels = {openfree:'기본 지도', google:'구글 지도', kakao:'카카오 지도', naver:'네이버 지도'};
  const choiceKey = 'pinmap.map-provider.v1';
  const emptyConfig = {defaultProvider:'openfree',available:{openfree:true,google:false,kakao:false,naver:false},googleBrowserKey:'',kakaoJavaScriptKey:'',naverClientId:''};
  const scripts = new Map();
  const readChoice = () => { try { return localStorage.getItem(choiceKey); } catch { return null; } };
  const saveChoice = value => { try { localStorage.setItem(choiceKey,value); } catch {} };
  const config = () => fetch('/api/map-config',{cache:'no-store'})
    .then(response => response.ok ? response.json() : emptyConfig)
    .then(data => ({...emptyConfig,...data,available:{...emptyConfig.available,...data.available}}))
    .catch(() => emptyConfig);
  function loadScript(provider, key) {
    if (scripts.has(provider)) return scripts.get(provider);
    const promise = new Promise((resolve,reject) => {
      const script=document.createElement('script');
      let timer;
      const callback='__pinmapMapsReady_'+provider;
      const fail=() => { clearTimeout(timer); delete window[callback]; script.remove(); scripts.delete(provider); reject(new Error(`${labels[provider]}를 불러오지 못했어요.`)); };
      const ready=() => { clearTimeout(timer); delete window[callback]; resolve(); };
      if(provider==='google') {
        window[callback]=ready;
        script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&loading=async&v=weekly&language=ko&callback='+callback;
      } else if(provider==='kakao') {
        script.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey='+encodeURIComponent(key)+'&autoload=false';
        script.onload=() => window.kakao?.maps?.load ? window.kakao.maps.load(ready) : fail();
      } else {
        window[callback]=ready;
        script.src='https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId='+encodeURIComponent(key)+'&callback='+callback;
      }
      script.onerror=fail;
      timer=setTimeout(fail,15000);
      document.head.append(script);
    });
    scripts.set(provider,promise);
    return promise;
  }
  function attach(map, onChange, preferredProvider) {
    const host=map.getContainer();
    const nativeHost=document.createElement('div');
    nativeHost.className='pm-native-map';
    nativeHost.setAttribute('aria-hidden','true');
    host.prepend(nativeHost);
    let current='openfree', native=null, providerConfig=emptyConfig, disposed=false, request=0, frame=0, authObserver=null, location=null, kakaoLocation=null, locationContent=null;
    function drawNativeLocation() {
      if(current!=='kakao'||!native||!location)return;
      const position=new kakao.maps.LatLng(location.point[0],location.point[1]);
      if(!locationContent){
        locationContent=document.createElement('div');
        locationContent.className='lm-kakao-location';
        locationContent.setAttribute('aria-hidden','true');
        locationContent.innerHTML='<span class="lm-location-person"><span class="lm-heading-cone" aria-hidden="true"></span><span class="lm-location-dot"></span><span class="lm-location-demo">예시 위치</span></span>';
      }
      const person=locationContent.querySelector('.lm-location-person');
      person.classList.toggle('no-heading',location.heading==null);
      person.style.setProperty('--heading',(location.heading??0)+'deg');
      locationContent.querySelector('.lm-location-demo').hidden=!location.demo;
      if(kakaoLocation)kakaoLocation.setPosition(position);
      else kakaoLocation=new kakao.maps.CustomOverlay({map:native.map,position,content:locationContent,xAnchor:.5,yAnchor:.5,zIndex:1000,clickable:false});
      host.dataset.nativeLocation='kakao';
    }
    const notify=() => onChange?.({current,available:providerConfig.available,labels});
    function sync() {
      if(!native || disposed)return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(() => {
        if(!native || disposed)return;
        const canvas=host.getBoundingClientRect();
        const header=document.querySelector('.live-map .lm-header')?.getBoundingClientRect();
        const top=Math.max(0,Math.round((header?.bottom ?? canvas.top+170)-canvas.top));
        nativeHost.style.top=top+'px';
        nativeHost.style.bottom='0px';
        const center=map.containerPointToLatLng([canvas.width/2,(top+canvas.height)/2]);
        const zoom=map.getZoom();
        try {
          if(current==='google') {
            native.map.setCenter({lat:center.lat,lng:center.lng});
            native.map.setZoom(zoom);
          } else if(current==='kakao') {
            native.map.relayout();
            native.map.setCenter(new kakao.maps.LatLng(center.lat,center.lng));
            native.map.setLevel(Math.max(1,Math.min(14,18-zoom)));
          } else {
            native.map.setSize(new naver.maps.Size(nativeHost.clientWidth,nativeHost.clientHeight));
            native.map.setCenter(new naver.maps.LatLng(center.lat,center.lng));
            native.map.setZoom(zoom);
          }
        } catch {
          const failed=labels[current];
          select('openfree');
          onChange?.({current:'openfree',available:providerConfig.available,labels,error:`${failed} 연결을 확인해 주세요.`});
        }
      });
    }
    function clearNative() {
      cancelAnimationFrame(frame);
      authObserver?.disconnect();authObserver=null;
      kakaoLocation?.setMap(null);kakaoLocation=null;locationContent=null;delete host.dataset.nativeLocation;
      if(native?.provider==='google') window.google?.maps?.event?.clearInstanceListeners?.(native.map);
      native=null;
      nativeHost.replaceChildren();
    }
    async function select(next, remember=false) {
      if(disposed || !labels[next] || !providerConfig.available[next]) return false;
      const id=++request;
      if(next==='openfree') {
        clearNative();current=next;host.dataset.mapProvider=next;
        if(remember)saveChoice(next);
        notify();return true;
      }
      const key={google:providerConfig.googleBrowserKey,kakao:providerConfig.kakaoJavaScriptKey,naver:providerConfig.naverClientId}[next];
      try {
        if(next==='google') window.gm_authFailure=() => {
          if(disposed || id!==request)return;
          select('openfree');
          onChange?.({current:'openfree',available:providerConfig.available,labels,error:'구글 지도 인증을 확인해 주세요.'});
        };
        await loadScript(next,key);
        if(disposed || id!==request)return false;
        clearNative();
        const surface=document.createElement('div');
        surface.className='pm-native-map-surface';
        nativeHost.replaceChildren(surface);
        const center=map.getCenter(),zoom=map.getZoom();
        const instance=next==='google'
          ? new google.maps.Map(surface,{center:{lat:center.lat,lng:center.lng},zoom,disableDefaultUI:true,gestureHandling:'none',clickableIcons:false,keyboardShortcuts:false})
          : next==='kakao'
            ? new kakao.maps.Map(surface,{center:new kakao.maps.LatLng(center.lat,center.lng),level:Math.max(1,Math.min(14,18-zoom)),draggable:false,scrollwheel:false,disableDoubleClickZoom:true})
            : new naver.maps.Map(surface,{center:new naver.maps.LatLng(center.lat,center.lng),zoom,draggable:false,scrollWheel:false,disableDoubleClickZoom:true,disableTwoFingerTapZoom:true,keyboardShortcuts:false,zoomControl:false,scaleControl:false});
        native={map:instance,provider:next};current=next;host.dataset.mapProvider=next;
        if(next==='naver') {
          // The NAVER SDK paints auth_fail.png in the map surface instead of rejecting its loader.
          const checkAuth=() => {
            if(disposed || id!==request || !surface.style.backgroundImage.includes('auth_fail'))return;
            select('openfree',true);
            onChange?.({current:'openfree',available:providerConfig.available,labels,error:'네이버 지도 인증을 확인해 주세요.'});
          };
          authObserver=new MutationObserver(checkAuth);
          authObserver.observe(surface,{attributes:true,attributeFilter:['style']});
          checkAuth();
        }
        if(id!==request)return false;
        sync();drawNativeLocation();
        if(remember)saveChoice(next);
        notify();return true;
      } catch(error) {
        if(id===request){clearNative();current='openfree';host.dataset.mapProvider=current;notify();}
        throw new Error(`${labels[next]}를 표시하지 못했어요. 설정을 확인해 주세요.`);
      }
    }
    const onMove=() => { if(native)sync(); };
    map.on('move zoom resize',onMove);
    map.on('unload',() => {disposed=true;request++;clearNative();nativeHost.remove();});
    host.dataset.mapProvider=current;
    notify();
    config().then(async value => {
      if(disposed)return;
      providerConfig=value;
      notify();
      // My page selection is authoritative; the legacy map-only choice is a fallback.
      const preferred=labels[preferredProvider] ? preferredProvider : readChoice();
      const desired=providerConfig.available[preferred] ? preferred : preferredProvider ? 'openfree' : providerConfig.defaultProvider;
      if(preferred && !providerConfig.available[preferred])onChange?.({current,available:providerConfig.available,labels,error:`${labels[preferred] || '선택한 지도'} 연결을 확인해 주세요. 기본 지도를 표시해요.`});
      if(desired!=='openfree') {
        try { await select(desired); }
        catch(error) { onChange?.({current,available:providerConfig.available,labels,error:error.message}); }
      }
    });
    return {select,setLocation(value){location=value;drawNativeLocation();},get current(){return current;}};
  }
  window.PinmapMapProviders={attach,labels};
})();
