/* Integration layer: keep collection/detail implementations untouched. */
(() => {
  if (typeof document!=='undefined') document.documentElement.classList.add('nav-icononly');
  // 2026-11-24: 선택 전·후 모양이 같은 내비 아이콘. 선택되면 같은 윤곽을 채우고 안쪽 선만 비워요(mask). 홈 선택은 문 구멍 아래 바닥 선이 이어져요. 지도는 카테고리 '여행·명소'와 같은 아이콘.
  const NAV_GLYPHS={
    // 2026-11-27 Figma 'Nav / home': 18×18 정사각 비율 · 꺾인 모서리 1(다른 아이콘과 같은 둥글기), 선택은 같은 바깥 크기로 채우고 문 구멍 5.1×6.3(모서리 0.85).
    home:{outline:'M 9,21 L 9,14.588 C 9,14.036 9.448,13.588 10,13.588 L 14,13.588 C 14.552,13.588 15,14.036 15,14.588 L 15,21 M 4,21 L 20,21 C 20.552,21 21,20.552 21,20 L 21,10.884 C 21,10.585 20.866,10.302 20.636,10.112 L 12.636,3.524 C 12.266,3.219 11.734,3.219 11.364,3.524 L 3.364,10.112 C 3.134,10.302 3,10.585 3,10.884 L 3,20 C 3,20.552 3.448,21 4,21',selected:'M 10.824,2.867 C 11.507,2.305 12.493,2.305 13.176,2.867 L 21.176,9.456 C 21.602,9.808 21.85,10.331 21.85,10.884 L 21.85,20 C 21.849,21.022 21.022,21.85 20,21.85 L 4,21.85 C 2.978,21.85 2.151,21.022 2.15,20 L 2.15,10.884 C 2.15,10.331 2.398,9.808 2.824,9.456 L 10.824,2.867 M 10.3,13.85 C 9.83,13.85 9.45,14.231 9.45,14.7 L 9.45,19.3 C 9.45,19.769 9.83,20.149 10.3,20.149 L 13.7,20.149 C 14.17,20.149 14.55,19.769 14.55,19.3 L 14.55,14.7 C 14.55,14.231 14.17,13.85 13.7,13.85 L 10.3,13.85'},
    // 2026-11-27 Figma 'Nav / map·bookmark·user' 선택 상태: 선 두께까지 포함한 바깥선(모서리 둥글게)을 그대로 채워요. 기본과 같은 크기로 보여요.
    map:{outline:'M 15,5 L 9,3 L 3.684,4.772 C 3.275,4.908 3,5.29 3,5.721 L 3,19.613 C 3,20.295 3.669,20.777 4.316,20.561 L 9,19 M 9,3 L 9,19 L 15,21 L 20.316,19.228 C 20.725,19.092 21,18.71 21,18.279 L 21,4.387 C 21,3.705 20.331,3.223 19.684,3.439 L 15,5 L 15,21',selected:'M 9.394,2.247 C 9.458,2.261 9.522,2.278 9.585,2.299 L 14.952,4.088 C 14.983,4.098 15.017,4.098 15.048,4.088 L 19.415,2.633 C 20.613,2.234 21.849,3.125 21.85,4.388 L 21.85,18.279 C 21.85,19.076 21.34,19.782 20.585,20.034 L 15.585,21.701 C 15.523,21.722 15.459,21.737 15.396,21.751 C 15.665,21.609 15.85,21.326 15.85,21 L 15.85,5 C 15.85,4.531 15.469,4.15 15,4.15 C 14.531,4.15 14.15,4.531 14.15,5 L 14.15,21 C 14.15,21.326 14.334,21.609 14.604,21.751 C 14.54,21.737 14.477,21.722 14.415,21.701 L 9.048,19.912 C 9.017,19.902 8.983,19.902 8.952,19.912 L 4.585,21.367 C 3.387,21.766 2.15,20.875 2.15,19.612 L 2.15,5.721 C 2.15,4.925 2.66,4.218 3.415,3.966 L 8.415,2.299 C 8.478,2.278 8.541,2.261 8.605,2.247 C 8.335,2.389 8.15,2.673 8.15,3 L 8.15,19 C 8.15,19.469 8.531,19.85 9,19.85 C 9.469,19.85 9.85,19.469 9.85,19 L 9.85,3 C 9.85,2.673 9.665,2.389 9.394,2.247',rule:'nonzero'},
    bookmark:{outline:'M 7.555,19.964 L 11.445,17.37 C 11.781,17.146 12.219,17.146 12.555,17.37 L 16.445,19.964 C 17.11,20.407 18,19.93 18,19.131 L 18,4 C 18,3.448 17.552,3 17,3 L 7,3 C 6.448,3 6,3.448 6,4 L 6,19.131 C 6,19.93 6.89,20.407 7.555,19.964',selected:'M 17,2.15 C 18.022,2.15 18.85,2.978 18.85,4 L 18.85,19.132 C 18.849,20.609 17.203,21.49 15.974,20.671 L 12.083,18.077 C 12.033,18.044 11.967,18.044 11.917,18.077 L 8.026,20.671 C 6.797,21.49 5.151,20.609 5.15,19.132 L 5.15,4 C 5.15,2.978 5.978,2.15 7,2.15 L 17,2.15',rule:'nonzero'},
    user:{outline:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0',selected:'M12 3.15039C13.2863 3.15039 14.5201 3.66076 15.4297 4.57031C16.3392 5.47986 16.8496 6.7137 16.8496 8C16.8496 9.2863 16.3392 10.5201 15.4297 11.4297C15.0267 11.8327 14.5593 12.1559 14.0527 12.3926C15.6319 12.7692 17.0911 13.5754 18.2578 14.7422C19.9175 16.4019 20.8496 18.6528 20.8496 21C20.8496 21.2254 20.76 21.4412 20.6006 21.6006C20.4412 21.76 20.2254 21.8496 20 21.8496H4C3.53056 21.8496 3.15039 21.4694 3.15039 21C3.15039 18.6528 4.08249 16.4019 5.74219 14.7422C6.9087 13.5757 8.36748 12.7693 9.94629 12.3926C9.44002 12.1559 8.97306 11.8324 8.57031 11.4297C7.66076 10.5201 7.15039 9.2863 7.15039 8C7.15039 6.7137 7.66076 5.47986 8.57031 4.57031C9.47986 3.66076 10.7137 3.15039 12 3.15039Z',rule:'nonzero'}
  };
  let navMaskSeq=0;
  const navGlyph=(name,active)=>{
    const g=NAV_GLYPHS[name];
    if(!active)return `<svg class="icon pm-nav-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="${g.outline}${g.detail?' '+g.detail:''}"/></svg>`;
    if(g.selected)return `<svg class="icon pm-nav-glyph is-selected" viewBox="0 0 24 24" aria-hidden="true"><path class="pm-nav-fill" fill-rule="${g.rule||'evenodd'}" clip-rule="${g.rule||'evenodd'}" d="${g.selected}"/></svg>`;
    const id=`pm-nav-cut-${name}-${++navMaskSeq}`;
    const mask=g.cut?`<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" style="fill:#fff;stroke:none"/><path d="${g.cut}" style="fill:${g.cutFill?'#000':'none'};stroke:#000"/></mask></defs>`:'';
    return `<svg class="icon pm-nav-glyph is-selected" viewBox="0 0 24 24" aria-hidden="true">${mask}<path class="pm-nav-fill" d="${g.filled||g.outline}"${g.cut?` mask="url(#${id})"`:''}/></svg>`;
  };
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
  function navState(){
    const current=(typeof PARENT_TAB!=='undefined'&&PARENT_TAB[page])||page;
    const activePage=['course','courses'].includes(current)?'map':current;
    const index=Math.max(0,['home','map','library','my'].indexOf(activePage));
    return {activePage,index};
  }
  function navMarkup(){
    const {activePage,index}=navState();
    const entry=(p,label,glyph)=>{const active=activePage===p;return `<button class="navitem ${active?'active':''}" data-page="${p}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="navicon">${navGlyph(glyph,active)}</span><span class="pm-nav-label" aria-hidden="true">${label}</span></button>`};
    return `<span class="pm-nav-main" data-nav-target="${index}" style="--nav-index:${index};--nav-shift:${index>=2?1:0}"><span class="pm-nav-indicator" aria-hidden="true"></span>${entry('home','홈','home')}${entry('map','지도','map')}<span class="pm-nav-gap" aria-hidden="true"></span>${entry('library','컬렉션','bookmark')}${entry('my','마이','user')}</span>${typeof homeAddMarkup==='function'?homeAddMarkup():''}`;
  }
  let bottomNav;
  const showBottomNav=()=>['home','map','library','my'].includes(page)
    && !detailId && (page!=='library' || (!collection && filter==='전체'));
  function syncBottomNav(){
    const {activePage,index}=navState();
    const dock=bottomNav.querySelector('.pm-nav-main');
    if (!dock) return;
    const marker=dock.querySelector('.pm-nav-indicator');
    const from=marker && dock.clientWidth>NAV_GAP+8 && lastNavIndex!==null
      ? (()=>{const tab=(dock.clientWidth-8-NAV_GAP)/4,x=marker.getBoundingClientRect().left-dock.getBoundingClientRect().left-dock.clientLeft-4;return x>=1.5*tab+NAV_GAP/2?(x-NAV_GAP)/tab:x/tab;})()
      : lastNavIndex??index;
    dock.dataset.navTarget=String(index);
    dock.style.setProperty('--nav-index',String(index));
    dock.style.setProperty('--nav-shift',index>=2?'1':'0');
    for (const button of dock.querySelectorAll('.navitem')) {
      const active=button.dataset.page===activePage;
      if (button.classList.contains('active')!==active) {
        button.classList.toggle('active',active);
        button.querySelector('.navicon').innerHTML=navGlyph({home:'home',map:'map',library:'bookmark',my:'user'}[button.dataset.page],active);
      }
      if (active) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
    if (Math.abs(from-index)>.01) {
      const stage=bottomNav.querySelector('#home-add-menu');
      if (stage?.dataset.open==='true') {
        stage.dataset.open='false';
        stage.classList.remove('is-anticipating');
        const trigger=stage.querySelector('.home-add-fab');
        trigger?.setAttribute('aria-expanded','false');
        trigger?.setAttribute('aria-label','콘텐츠 추가하기');
        const options=stage.querySelector('.home-add-options');
        if(options){options.setAttribute('aria-hidden','true');options.inert=true;options.querySelectorAll('button').forEach(button=>{button.tabIndex=-1;});}
      }
      slideNav(index,from);
    }
    lastNavIndex=index;
  }
  window.PinmapBottomNav=Object.freeze({mount(){
    if (typeof document==='undefined') return;
    if (!bottomNav) {
      bottomNav=document.createElement('nav');
      bottomNav.className='bottomnav';
      bottomNav.setAttribute('aria-label','하단 메뉴');
    }
    if (!bottomNav.hasChildNodes()) bottomNav.innerHTML=navMarkup();
    if (!bottomNav.isConnected) document.body.append(bottomNav);
    bottomNav.hidden=!showBottomNav();
    if (bottomNav.hidden) {
      const stage=bottomNav.querySelector('#home-add-menu');
      if(stage?.dataset.open==='true'){
        stage.dataset.open='false';
        stage.classList.remove('is-anticipating');
        const trigger=stage.querySelector('.home-add-fab');
        trigger?.setAttribute('aria-expanded','false');
        trigger?.setAttribute('aria-label','콘텐츠 추가하기');
        const options=stage.querySelector('.home-add-options');
        if(options){options.setAttribute('aria-hidden','true');options.inert=true;options.querySelectorAll('button').forEach(button=>{button.tabIndex=-1;});}
      }
    }
    syncBottomNav();
  },get element(){return bottomNav}});
  if (typeof document!=='undefined' && document.querySelector('#app .layout,#app .live-map')) window.PinmapBottomNav.mount();
  // All map views share the same Google background and Leaflet overlay.
  window.attachPinmapBasemap=(map,onChange,options)=>window.PinmapMapProviders.attach(map,onChange,options);
})();
