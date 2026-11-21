/* Google owns the styled background. Leaflet continues to own places and gestures. */
(() => {
  let scriptPromise;
  let authenticationFailed = false;
  const failureListeners = new Set();
  const lightStyles = [
    {elementType:'geometry',stylers:[{color:'#FCFAF6'}]},
    {elementType:'labels.text.fill',stylers:[{color:'#665C52'}]},
    {elementType:'labels.text.stroke',stylers:[{color:'#FFFFFF'}]},
    {featureType:'road',elementType:'geometry',stylers:[{color:'#FFFFFF'}]},
    {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#F4E9D9'}]},
    {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#594F46'}]},
    {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#EDF3E4'}]},
    {featureType:'water',elementType:'geometry',stylers:[{color:'#E8ECE7'}]},
    {featureType:'poi.business',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'road.local',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'administrative.locality',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'administrative.neighborhood',elementType:'labels',stylers:[{visibility:'off'}]}
  ];
  const darkStyles = [
    {elementType:'geometry',stylers:[{color:'#24201D'}]},
    {elementType:'labels.text.fill',stylers:[{color:'#E5DDD3'}]},
    {elementType:'labels.text.stroke',stylers:[{color:'#24201D'}]},
    {featureType:'road',elementType:'geometry',stylers:[{color:'#423B36'}]},
    {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#E5DDD3'}]},
    {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#3D4738'}]},
    {featureType:'water',elementType:'geometry',stylers:[{color:'#333A37'}]},
    {featureType:'poi.business',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'road.local',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'administrative.locality',elementType:'labels',stylers:[{visibility:'off'}]},
    {featureType:'administrative.neighborhood',elementType:'labels',stylers:[{visibility:'off'}]}
  ];
  const currentStyles = () => document.documentElement?.dataset?.theme === 'dark' ? darkStyles : lightStyles;

  function loadGoogle(key) {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callback = '__pinmapGoogleMapsReady';
      let timer;
      const fail = () => {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        scriptPromise = null;
        reject(new Error('구글 지도를 불러오지 못했어요. 연결을 확인해 주세요.'));
      };
      window[callback] = () => {
        clearTimeout(timer);
        delete window[callback];
        resolve();
      };
      window.gm_authFailure = () => {
        authenticationFailed = true;
        failureListeners.forEach(listener => listener('구글 지도 인증을 확인해 주세요.'));
      };
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&loading=async&v=weekly&language=ko&callback=' + callback;
      script.onerror = fail;
      timer = setTimeout(fail, 15000);
      document.head.append(script);
    });
    return scriptPromise;
  }

  function attach(map, onChange) {
    const host = map.getContainer();
    const nativeHost = document.createElement('div');
    nativeHost.className = 'pm-native-map';
    nativeHost.setAttribute('aria-hidden', 'true');
    host.prepend(nativeHost);
    host.dataset.mapProvider = 'google';
    let nativeMap = null, disposed = false, frame = 0;

    function showError(message) {
      if (disposed) return;
      host.dataset.mapError = 'true';
      let notice = host.querySelector('.pm-map-error');
      if (!notice) {
        notice = document.createElement('div');
        notice.className = 'pm-map-error';
        notice.setAttribute('role', 'status');
        host.append(notice);
      }
      notice.textContent = message;
      onChange?.({current: 'google', error: message});
    }

    function sync() {
      if (!nativeMap || disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!nativeMap || disposed) return;
        const canvas = host.getBoundingClientRect();
        const header = host.closest('.live-map')?.querySelector('.lm-header')?.getBoundingClientRect();
        const top = Math.max(0, Math.round((header?.bottom ?? canvas.top) - canvas.top));
        nativeHost.style.top = top + 'px';
        const center = map.containerPointToLatLng([canvas.width / 2, (top + canvas.height) / 2]);
        try {
          nativeMap.setCenter({lat: center.lat, lng: center.lng});
          nativeMap.setZoom(map.getZoom());
        } catch {
          showError('구글 지도 연결을 확인해 주세요.');
        }
      });
    }

    const onFailure = message => showError(message);
    const onThemeChange = () => nativeMap?.setOptions({styles:currentStyles()});
    failureListeners.add(onFailure);
    window.addEventListener?.('pinmap:theme-changed', onThemeChange);
    map.on('move zoom resize', sync);
    map.on('unload', () => {
      disposed = true;
      failureListeners.delete(onFailure);
      window.removeEventListener?.('pinmap:theme-changed', onThemeChange);
      cancelAnimationFrame(frame);
      if (nativeMap) window.google?.maps?.event?.clearInstanceListeners?.(nativeMap);
      nativeHost.remove();
    });

    fetch('/api/map-config', {cache: 'no-store'})
      .then(response => {
        if (!response.ok) throw new Error('구글 지도 설정을 확인해 주세요.');
        return response.json();
      })
      .then(async config => {
        if (disposed) return;
        if (!config.available?.google || !config.googleBrowserKey) throw new Error('구글 지도 설정을 확인해 주세요.');
        await loadGoogle(config.googleBrowserKey);
        if (disposed) return;
        if (authenticationFailed) throw new Error('구글 지도 인증을 확인해 주세요.');
        const surface = document.createElement('div');
        surface.className = 'pm-native-map-surface';
        nativeHost.replaceChildren(surface);
        const center = map.getCenter();
        nativeMap = new google.maps.Map(surface, {
          center: {lat: center.lat, lng: center.lng},
          zoom: map.getZoom(),
          styles: currentStyles(),
          disableDefaultUI: true,
          gestureHandling: 'none',
          clickableIcons: false,
          keyboardShortcuts: false
        });
        delete host.dataset.mapError;
        host.querySelector('.pm-map-error')?.remove();
        sync();
        onChange?.({current: 'google'});
      })
      .catch(error => showError(error.message || '구글 지도 연결을 확인해 주세요.'));

    return {get current() { return 'google'; }, setLocation() {}};
  }

  window.PinmapMapProviders = {attach};
})();
