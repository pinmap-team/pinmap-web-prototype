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
  // Four equal tabs keep their labels below their icons.
  // 2026-11-23: 가운데(지도와 컬렉션 사이)에 '추가' 버튼 자리 64px을 비워요.
  const NAV_GAP=64;
  let lastNavIndex=null, navMotionFrame;
  function slideNav(index,from){
    cancelAnimationFrame(navMotionFrame);
    navMotionFrame=requestAnimationFrame(()=>{
      const dock=document.querySelector('.bottomnav .pm-nav-main');
      if(dock?.dataset.navTarget!==String(index))return;
      const marker=dock.querySelector('.pm-nav-indicator');
      if(!marker || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const tab=(dock.clientWidth-8-NAV_GAP)/4, pos=i=>i*tab+(i>=1.5?NAV_GAP:0);
      const distance=pos(from)-pos(index);
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
      ? (()=>{const tab=(previousDock.clientWidth-8-NAV_GAP)/4,x=previousMarker.getBoundingClientRect().left-previousDock.getBoundingClientRect().left-previousDock.clientLeft-4;return x>=1.5*tab+NAV_GAP/2?(x-NAV_GAP)/tab:x/tab;})()
      : lastNavIndex??index;
    queueMicrotask(()=>{lastNavIndex=index;});
    if(Math.abs(from-index)>.01)slideNav(index,from);
    const entry=(p,label,glyph)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${active?solid(glyph):icon(glyph)}</span><span class="pm-nav-label" aria-hidden="true">${label}</span></button>`};
    return `<span class="pm-nav-main" data-nav-target="${index}" style="--nav-index:${index};--nav-shift:${index>=2?1:0}"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈','home')}${entry('map','지도','map')}<span class="pm-nav-gap" aria-hidden="true"></span>${entry('library','컬렉션','bookmark')}${entry('my','마이','user')}</span>${typeof homeAddMarkup==='function'?homeAddMarkup():''}`;
  };
  // All map views share the same Google background and Leaflet overlay.
  window.attachPinmapBasemap=(map,onChange)=>window.PinmapMapProviders.attach(map,onChange);
})();
