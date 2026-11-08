/* Switch the main Leaflet map's background while leaving its markers and gestures intact. */
(() => {
  const labels = {openfree:'기본 지도', google:'구글 지도'};
  const choiceKey = 'pinmap.map-provider.v1';
  const emptyConfig = {defaultProvider:'openfree',available:{openfree:true,google:false},googleBrowserKey:''};
  let googleScript;
  const readChoice = () => { try { return localStorage.getItem(choiceKey); } catch { return null; } };
  const saveChoice = value => { try { localStorage.setItem(choiceKey,value); } catch {} };
  const config = () => fetch('/api/map-config',{cache:'no-store'})
    .then(response => response.ok ? response.json() : emptyConfig)
    .then(data => ({...emptyConfig,...data,available:{...emptyConfig.available,...data.available}}))
    .catch(() => emptyConfig);
  function loadScript(key) {
    if (googleScript) return googleScript;
    const promise = new Promise((resolve,reject) => {
      const script=document.createElement('script');
      let timer;
      const fail=() => { clearTimeout(timer); script.remove(); googleScript=null; reject(new Error('구글 지도를 불러오지 못했어요.')); };
      const callback='__pinmapGoogleMapsReady';
      window[callback]=() => { clearTimeout(timer); delete window[callback]; resolve(); };
      script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&loading=async&v=weekly&language=ko&callback='+callback;
      script.onerror=fail;
      timer=setTimeout(fail,15000);
      document.head.append(script);
    });
    googleScript=promise;
    return promise;
  }
  function attach(map, onChange) {
    const host=map.getContainer();
    const nativeHost=document.createElement('div');
    nativeHost.className='pm-native-map';
    nativeHost.setAttribute('aria-hidden','true');
    host.prepend(nativeHost);
    let current='openfree', native=null, providerConfig=emptyConfig, disposed=false, request=0, frame=0;
    const notify=() => onChange?.({current,available:providerConfig.available,labels});
    function sync() {
      if(!native || disposed)return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(() => {
        if(!native || disposed)return;
        const canvas=host.getBoundingClientRect();
        const header=document.querySelector('.live-map .lm-header')?.getBoundingClientRect();
        const cards=document.querySelector('.live-map .lm-selected-host')?.getBoundingClientRect();
        const top=Math.max(0,Math.round((header?.bottom ?? canvas.top+170)-canvas.top));
        const bottom=Math.max(top+100,Math.round((cards?.top ?? canvas.bottom-200)-canvas.top));
        nativeHost.style.top=top+'px';
        nativeHost.style.bottom=Math.max(0,Math.round(canvas.height-bottom))+'px';
        const center=map.containerPointToLatLng([canvas.width/2,(top+bottom)/2]);
        const zoom=map.getZoom();
        try {
          native.map.setCenter({lat:center.lat,lng:center.lng});
          native.map.setZoom(zoom);
        } catch {
          select('openfree');
          onChange?.({current:'openfree',available:providerConfig.available,labels,error:'구글 지도 연결을 확인해 주세요.'});
        }
      });
    }
    function clearNative() {
      cancelAnimationFrame(frame);
      if(native) window.google?.maps?.event?.clearInstanceListeners?.(native.map);
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
      const key=providerConfig.googleBrowserKey;
      try {
        window.gm_authFailure=() => {
          if(disposed || id!==request)return;
          select('openfree');
          onChange?.({current:'openfree',available:providerConfig.available,labels,error:'구글 지도 인증을 확인해 주세요.'});
        };
        await loadScript(key);
        if(disposed || id!==request)return false;
        clearNative();
        const surface=document.createElement('div');
        surface.className='pm-native-map-surface';
        nativeHost.replaceChildren(surface);
        const instance=new google.maps.Map(surface,{center:{lat:37.5445,lng:127.043},zoom:15,disableDefaultUI:true,gestureHandling:'none',clickableIcons:false,keyboardShortcuts:false});
        native={map:instance};current=next;host.dataset.mapProvider=next;
        sync();
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
      const preferred=readChoice();
      const desired=providerConfig.available[preferred] ? preferred : providerConfig.defaultProvider;
      if(desired!=='openfree') {
        try { await select(desired); }
        catch(error) { onChange?.({current,available:providerConfig.available,labels,error:error.message}); }
      }
    });
    return {select,get current(){return current;}};
  }
  window.PinmapMapProviders={attach,labels};
})();
