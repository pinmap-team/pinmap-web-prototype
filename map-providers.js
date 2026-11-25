/* The configured map owns the background. Leaflet owns places and gestures. */
(() => {
  let googleScriptPromise, naverScriptPromise;
  let authenticationFailed = false;
  const failureListeners = new Set();
  function loadGoogle(key) {
    if (googleScriptPromise) return googleScriptPromise;
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callback = '__pinmapGoogleMapsReady';
      let timer;
      const fail = () => {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        googleScriptPromise = null;
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
    return googleScriptPromise;
  }

  function loadNaver(clientId) {
    if (window.naver?.maps?.Map) return Promise.resolve();
    if (naverScriptPromise) return naverScriptPromise;
    naverScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callback = '__pinmapNaverMapsReady';
      let timer, pollTimer, settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(pollTimer);
        delete window[callback];
        script.remove();
        naverScriptPromise = null;
        reject(new Error('네이버 지도를 불러오지 못했어요. 연결을 확인해 주세요.'));
      };
      const ready = () => {
        if (settled) return;
        if (!window.naver?.maps?.Map) {
          if (!pollTimer) pollTimer = setTimeout(() => { pollTimer = null; ready(); }, 50);
          return;
        }
        settled = true;
        clearTimeout(timer);
        clearTimeout(pollTimer);
        delete window[callback];
        resolve();
      };
      window[callback] = ready;
      script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' + encodeURIComponent(clientId) + '&callback=' + callback;
      script.onload = ready;
      script.onerror = fail;
      timer = setTimeout(fail, 15000);
      document.head.append(script);
    });
    return naverScriptPromise;
  }

  // A coarse peninsula outline avoids classifying nearby Fukuoka as Korea.
  const peninsula = [[126.1,38.6],[127.1,38.7],[128.4,38.5],[129.5,37.2],
    [129.5,35.5],[129.2,35.0],[128.3,34.3],[127.3,34.2],[126.1,34.3],
    [125.9,35.0],[126.0,36.3],[126.2,37.3]];
  function inPolygon(lat,lng,polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
      if((yi>lat)!==(yj>lat)&&lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
  }
  const isKoreanCoordinate = ({lat, lng, countryCode, country_code} = {}) => {
    const country=String(countryCode||country_code||'').toUpperCase();
    if(country)return country==='KR';
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
    return inPolygon(lat,lng,peninsula)
      || (lat>=33.1&&lat<=33.65&&lng>=126.1&&lng<=127.05) // Jeju
      || (lat>=37.3&&lat<=37.7&&lng>=130.7&&lng<=131.2) // Ulleungdo
      || (lat>=37.1&&lat<=37.4&&lng>=131.7&&lng<=132); // Dokdo
  };
  const needsGoogle = place => Boolean(place && (!isKoreanCoordinate(place) || /^google_places$/i.test(place.coordinateSource || '')));

  function attach(map, onChange, {places = []} = {}) {
    const host = map.getContainer();
    const header = host.closest('.live-map')?.querySelector('.lm-header');
    const nativeHost = document.createElement('div');
    nativeHost.className = 'pm-native-map';
    nativeHost.setAttribute('aria-hidden', 'true');
    host.prepend(nativeHost);
    host.dataset.mapProvider = 'loading';
    let nativeMap = null, activeProvider = '', disposed = false, naverAuthObserver = null;
    let config = null, selectedPlace = null, requestId = 0, naverFailed = false;
    let renderedPlaces = places;

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
      onChange?.({current: activeProvider || 'loading', error: message});
    }

    function sync() {
      if (!nativeMap || disposed) return;
      const canvas = host.getBoundingClientRect();
      const headerBounds = header?.getBoundingClientRect();
      const top = host.closest('.lm-drawn-map') ? 0 : Math.max(0, Math.round((headerBounds?.bottom ?? canvas.top) - canvas.top));
      nativeHost.style.top = top + 'px';
      const center = map.containerPointToLatLng([canvas.width / 2, (top + canvas.height) / 2]);
      try {
        // Leaflet moves badges in the current pointer event. Keep the Google
        // camera on that same event instead of waiting for a later paint frame.
        if (activeProvider === 'naver') {
          nativeMap.setSize(new naver.maps.Size(nativeHost.clientWidth, nativeHost.clientHeight));
          nativeMap.setCenter(new naver.maps.LatLng(center.lat, center.lng));
          nativeMap.setZoom(map.getZoom());
        } else nativeMap.moveCamera({center: {lat: center.lat, lng: center.lng}, zoom: map.getZoom()});
      } catch {
        showError(`${activeProvider === 'naver' ? '네이버' : '구글'} 지도 연결을 확인해 주세요.`);
      }
    }

    const onFailure = message => { if (activeProvider === 'google') showError(message); };
    failureListeners.add(onFailure);
    map.on('move zoom resize', sync);
    map.on('moveend', refreshProvider);
    // Search collapses the header without moving Leaflet. Keep Google's top edge aligned.
    const headerObserver = header && new ResizeObserver(sync);
    if (headerObserver) headerObserver.observe(header);
    map.on('unload', () => {
      disposed = true;
      headerObserver?.disconnect();
      naverAuthObserver?.disconnect();
      failureListeners.delete(onFailure);
      if (activeProvider === 'google' && nativeMap) window.google?.maps?.event?.clearInstanceListeners?.(nativeMap);
      nativeHost.remove();
    });

    async function showProvider(provider, config, id) {
      if (provider === 'naver') await loadNaver(config.naverClientId);
      else {
        await loadGoogle(config.googleBrowserKey);
        if (authenticationFailed) throw new Error('구글 지도 인증을 확인해 주세요.');
      }
      if (disposed || id !== requestId) return;
      naverAuthObserver?.disconnect();
      if (activeProvider === 'google' && nativeMap) window.google?.maps?.event?.clearInstanceListeners?.(nativeMap);
      const surface = document.createElement('div');
      surface.className = 'pm-native-map-surface';
      nativeHost.replaceChildren(surface);
      const center = map.getCenter();
      activeProvider = provider;
      nativeMap = provider === 'naver'
        ? new naver.maps.Map(surface, {
          center: new naver.maps.LatLng(center.lat, center.lng), zoom: map.getZoom(),
          draggable: false, scrollWheel: false, disableDoubleClickZoom: true,
          disableTwoFingerTapZoom: true, keyboardShortcuts: false, zoomControl: false,
          scaleControl: false
        })
        : new google.maps.Map(surface, {
          center: {lat: center.lat, lng: center.lng}, zoom: map.getZoom(),
          disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false,
          keyboardShortcuts: false
        });
      host.dataset.mapProvider = provider;
      delete host.dataset.mapError;
      host.querySelector('.pm-map-error')?.remove();
      sync();
      onChange?.({current: provider});
      if (provider === 'naver' && typeof MutationObserver === 'function') {
        naverAuthObserver?.disconnect();
        naverAuthObserver = new MutationObserver(() => {
          if (disposed || !surface.style.backgroundImage.includes('auth_fail')) return;
          naverAuthObserver.disconnect();
          naverFailed = true;
          refreshProvider();
        });
        naverAuthObserver.observe(surface, {attributes: true, attributeFilter: ['style']});
      }
    }

    async function refreshProvider() {
      if (!config || disposed) return;
      const id = ++requestId;
      const target = needsGoogle(selectedPlace) || needsGoogle(map.getCenter()) || renderedPlaces.some(needsGoogle) ? 'google' : 'naver';
      const hasNaver = config.available?.naver && config.naverClientId && !naverFailed;
      const hasGoogle = config.available?.google && config.googleBrowserKey;
      const provider = target === 'google' ? 'google' : hasNaver ? 'naver' : 'google';
      if (provider === activeProvider && nativeMap) { sync(); return; }
      if ((provider === 'google' && !hasGoogle) || (provider === 'naver' && !hasNaver)) {
        showError(target === 'google' ? '해외 장소에 필요한 구글 지도 설정을 확인해 주세요.' : '지도 설정을 확인해 주세요.');
        return;
      }
      try { await showProvider(provider, config, id); }
      catch (error) {
        if (id !== requestId || disposed) return;
        if (provider === 'naver') { naverFailed = true; refreshProvider(); }
        else showError(error.message || '지도 연결을 확인해 주세요.');
      }
    }

    fetch('/api/map-config', {cache: 'no-store'})
      .then(response => {
        if (!response.ok) throw new Error('지도 설정을 확인해 주세요.');
        return response.json();
      })
      .then(result => {
        if (disposed) return;
        config = result;
        refreshProvider();
      })
      .catch(error => showError(error.message || '지도 연결을 확인해 주세요.'));

    return {
      get current() { return activeProvider || 'loading'; },
      selectPlace(place) { selectedPlace = place || null; refreshProvider(); },
      setPlaces(nextPlaces) { renderedPlaces = Array.isArray(nextPlaces) ? nextPlaces : []; refreshProvider(); },
      setLocation() {}
    };
  }

  window.PinmapMapProviders = {attach, isKoreanCoordinate, needsGoogle};
})();
