/* Integration layer: keep collection/detail implementations untouched. */
(() => {
  const navGlyph=(name,active)=>typeof PinmapSolar !== 'undefined' ? PinmapSolar.icon(name,'icon pm-nav-glyph'+(active?' is-selected':''),active?'bold':'linear') : icon(name);

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
    const entry=(p,label,glyph)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${navGlyph(glyph,active)}</span><span class="pm-nav-label" aria-hidden="true">${label}</span></button>`};
    return `<span class="pm-nav-main" data-nav-target="${index}" style="--nav-index:${index};--nav-shift:${index>=2?1:0}"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈','home')}${entry('map','지도','map')}<span class="pm-nav-gap" aria-hidden="true"></span>${entry('library','컬렉션','bookmark')}${entry('my','마이','user')}</span>${typeof homeAddMarkup==='function'?homeAddMarkup():''}`;
  };
  // All map views share the same Google background and Leaflet overlay.
  window.attachPinmapBasemap=(map,onChange)=>window.PinmapMapProviders.attach(map,onChange);
})();
