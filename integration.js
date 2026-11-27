/* Integration layer: keep collection/detail implementations untouched. */
(() => {
  if (typeof document!=='undefined') document.documentElement.classList.add('nav-icononly');
  // 2026-11-24: 선택 전·후 모양이 같은 내비 아이콘. 선택되면 같은 윤곽을 채우고 안쪽 선만 비워요(mask). 홈 선택은 문 구멍 아래 바닥 선이 이어져요. 지도는 카테고리 '여행·명소'와 같은 아이콘.
  const NAV_GLYPHS={
    // 2026-11-27 Figma 'Nav / home': 18×18 정사각 비율, 선택은 같은 바깥 크기로 채우고 문 구멍 5.1×6.3(모서리 0.85).
    home:{outline:'M3 10.4118 12 3l9 7.4118V21H3z',detail:'M9 21v-7.4118h6V21',selected:'M11.5825 2.25983C11.8837 2.09017 12.2649 2.11877 12.5396 2.3448L21.5396 9.7569C21.7354 9.91837 21.8491 10.1593 21.8491 10.4132V21.001C21.8487 21.4701 21.4687 21.8507 20.9995 21.8507H2.99951C2.53035 21.8507 2.15036 21.4701 2.1499 21.001V10.4132C2.1499 10.1593 2.26366 9.91837 2.45947 9.7569L11.4595 2.3448L11.5825 2.25983ZM10.3003 13.8507C9.83085 13.8507 9.44971 14.2308 9.44971 14.7003V19.2999C9.44971 19.7693 9.83085 20.1505 10.3003 20.1505H13.6997C14.1691 20.1505 14.5503 19.7693 14.5503 19.2999V14.7003C14.5503 14.2308 14.1691 13.8507 13.6997 13.8507H10.3003Z'},
    map:{outline:'M3 5 9 3l6 2 6-2v16l-6 2-6-2-6 2z',detail:'M9 3v16 M15 5v16',cut:'M9 3v16 M15 5v16'},
    bookmark:{outline:'M6 3h12v18l-6-4-6 4z'},
    user:{outline:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0',filled:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0z'}
  };
  let navMaskSeq=0;
  const navGlyph=(name,active)=>{
    const g=NAV_GLYPHS[name];
    if(!active)return `<svg class="icon pm-nav-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="${g.outline}${g.detail?' '+g.detail:''}"/></svg>`;
    if(g.selected)return `<svg class="icon pm-nav-glyph is-selected" viewBox="0 0 24 24" aria-hidden="true"><path class="pm-nav-fill" fill-rule="evenodd" clip-rule="evenodd" d="${g.selected}"/></svg>`;
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
