/* Integration layer: keep collection/detail implementations untouched. */
(() => {
  const silhouettes={
    home:'M12 2 1 11h3v11h6v-7h4v7h6V11h3Z',
    map:'M2 5 8 2v17l-6 3Zm8-3 5 3v17l-5-3Zm7 3 5-3v17l-5 3Z',
    bookmark:'M6 2h12a1 1 0 0 1 1 1v20l-7-5-7 5V3a1 1 0 0 1 1-1Z',
    user:'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 22v-2a8 8 0 0 1 16 0v2Z',
    plus:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7Z',
    folderplus:'M2 5a2 2 0 0 1 2-2h5l3 3h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Zm9 5v3H8v2h3v3h2v-3h3v-2h-3v-3Z'
  };
  const solid=name=>`<svg class="pm-solid" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${silhouettes[name]}"></path></svg>`;
  // One expanded active tab and three icon-only tabs share the same dock.
  let lastNavIndex=null, navMotionFrame;
  function slideNav(index,from){
    cancelAnimationFrame(navMotionFrame);
    navMotionFrame=requestAnimationFrame(()=>{
      const dock=document.querySelector('.bottomnav .pm-nav-main');
      if(dock?.dataset.navTarget!==String(index))return;
      const marker=dock.querySelector('.pm-nav-indicator');
      if(!marker || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const distance=(from-index)*(dock.clientWidth-8)/4.25;
      if(Math.abs(distance)<.5)return;
      marker.getAnimations().forEach(animation=>animation.cancel());
      marker.animate([{transform:`translateX(${distance}px)`},{transform:'translateX(0)'}],
        {duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
    });
  }
  nav=function(){
    const current=(typeof PARENT_TAB!=='undefined'&&PARENT_TAB[page])||page;
    const activePage=['course','courses'].includes(current)?'map':current;
    const index=Math.max(0,['home','map','library','my'].indexOf(activePage));
    const previousDock=document.querySelector('.bottomnav .pm-nav-main');
    const previousMarker=previousDock?.querySelector('.pm-nav-indicator');
    // Read the live visual position, including any unfinished animation.
    const from=previousMarker
      ? (previousMarker.getBoundingClientRect().left-previousDock.getBoundingClientRect().left-previousDock.clientLeft-4)/((previousDock.clientWidth-8)/4.25)
      : lastNavIndex??index;
    queueMicrotask(()=>{lastNavIndex=index;});
    if(Math.abs(from-index)>.01)slideNav(index,from);
    const entry=(p,label,glyph)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${active?solid(p==='library'?'bookmark':p):icon(glyph)}</span><span class="pm-nav-label" aria-hidden="true">${label}</span></button>`};
    return `<span class="pm-nav-main" data-nav-target="${index}" style="--nav-index:${index}"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈','home')}${entry('map','지도','map')}${entry('library','저장함','bookmark')}${entry('my','마이','user')}</span>`;
  };
  // Keep the loaded basemap in the same moving pane as the markers.
  const attachFallbackBasemap=map=>{
    let current=null,pending=null,timer,disposed=false;
    function position(view){
      const scale=map.getZoomScale(map.getZoom(),view.zoom);
      const point=map.latLngToLayerPoint(view.nw);
      view.el.style.transform=`translate3d(${point.x}px,${point.y}px,0) scale(${scale})`;
    }
    function load(){
      if(disposed)return;
      // Reuse the overscanned map while swiping nearby places.
      const covers=view=>view&&view.zoom===map.getZoom()&&view.bounds.contains(map.getBounds());
      if(covers(pending))return;
      if(covers(current)){pending?.el.remove();pending=null;return;}
      if(pending)pending.el.remove();
      const size=map.getSize().add([320,320]),zoom=map.getZoom();
      const center=map.project(map.getCenter(),zoom),half=size.divideBy(2);
      const nw=map.unproject(center.subtract(half),zoom),se=map.unproject(center.add(half),zoom);
      const el=document.createElement('div');el.className='pm-basemap-layer';
      Object.assign(el.style,{width:size.x+'px',height:size.y+'px',opacity:'0'});
      const frame=document.createElement('iframe');frame.title='지도';frame.tabIndex=-1;
      const bounds=L.latLngBounds(map.unproject(center.subtract(half.multiplyBy(.99)),zoom),map.unproject(center.add(half.multiplyBy(.99)),zoom));
      frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].join('%2C')+'&layer=mapnik';
      el.append(frame);map.getPane('tilePane').append(el);
      const view={el,nw,zoom,bounds};pending=view;position(view);
      frame.onload=()=>{if(disposed||pending!==view)return;position(view);el.style.opacity='1';current?.el.remove();current=view;pending=null;};
    }
    const sync=()=>{if(current)position(current);if(pending)position(pending);};
    map.on('zoom viewreset',sync);
    map.on('moveend resize',()=>{clearTimeout(timer);timer=setTimeout(load,100);});
    map.on('unload',()=>{disposed=true;clearTimeout(timer);current?.el.remove();pending?.el.remove();});
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    load();
  };
  // Share one vector basemap across the place map, course editor and previews.
  window.attachPinmapBasemap=map=>{
    const host=map.getContainer();
    try {
      const layer=L.maplibreGL({
        style:'map-style.json?v=47c49842960b',
        interactive:false,
        attributionControl:{customAttribution:'<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a>, © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, 출구 © <a href="https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0" target="_blank" rel="noopener">행정안전부·Esri Korea</a>'}
      }).addTo(map);
      host.dataset.basemap='warm-minimal';
      const vectorMap=layer.getMaplibreMap();
      let originalPaint=null;
      const applyAppearance=()=>{
        if(!originalPaint)return;
        const dark=document.documentElement.dataset.theme==='dark';
        for(const entry of originalPaint){
          for(const [property,value] of Object.entries(entry.paint)){
            if(!property.endsWith('-color'))continue;
            let night=value;
            if(property==='background-color')night='#111111';
            else if(property==='text-color')night='#B4B4B8';
            else if(property==='text-halo-color')night='#111111';
            else if(property==='fill-color')night=/water/.test(entry.id)?'#1B2B33':/park|wood|landcover/.test(entry.id)?'#202B26':'#242426';
            else if(property==='line-color')night=/water/.test(entry.id)?'#263E49':/boundary/.test(entry.id)?'#626267':'#414145';
            vectorMap.setPaintProperty(entry.id,property,dark?night:value);
          }
          if(entry.type==='raster')vectorMap.setPaintProperty(entry.id,'raster-brightness-max',dark?.3:(entry.paint['raster-brightness-max']??1));
        }
      };
      vectorMap.on('style.load',()=>{
        originalPaint=vectorMap.getStyle().layers.map(entry=>({id:entry.id,type:entry.type,paint:{...entry.paint}}));
        applyAppearance();
      });
      vectorMap.on('load',()=>{host.dataset.basemapReady='true';});
      window.addEventListener('pinmap:theme-changed',applyAppearance);
      map.on('unload',()=>window.removeEventListener('pinmap:theme-changed',applyAppearance));
      return layer;
    } catch(error) {
      // Keep maps usable on devices without WebGL support.
      host.dataset.basemap='osm-fallback';
      return attachFallbackBasemap(map);
    }
  };
})();
