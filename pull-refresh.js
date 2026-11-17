/* Touch-only vertical pull at the top of a scrollable app page. Map gestures,
   horizontal carousels, form controls and open sheets keep their own handlers. */
(() => {
  let gesture=null,refreshing=false,timer;
  const indicator=document.createElement('div');
  indicator.className='pm-refresh';indicator.setAttribute('role','status');
  indicator.innerHTML='<span class="pm-spinner" aria-hidden="true"></span><span class="sr"></span>';
  document.body.append(indicator);
  document.documentElement.classList.add('pm-refresh-enabled');
  const eligible=()=>!detailId&&['home','library','my','calendar'].includes(page)&&!document.querySelector('dialog[open],#onboarding')&&!document.documentElement.classList.contains('auth-pending');
  const atTop=target=>{
    for(let node=target;node&&node!==document.body;node=node.parentElement){
      if(node.scrollTop>0)return false;
    }
    return (document.scrollingElement?.scrollTop||0)<=0;
  };
  function hide(){
    indicator.classList.remove('is-pulling');indicator.style.opacity='0';
    indicator.style.transform='translate(-50%,-60px)';indicator.removeAttribute('aria-busy');
  }
  document.addEventListener('touchstart',event=>{
    if(refreshing||event.touches.length!==1||!eligible()||!atTop(event.target)||event.target.closest('input,textarea,select,button,a,[contenteditable],.pickrow,.lm-carousel-track'))return;
    const touch=event.touches[0];gesture={x:touch.clientX,y:touch.clientY,page,amount:0,claimed:false};
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!gesture)return;
    if(event.touches.length!==1||!eligible()||gesture.page!==page){gesture=null;hide();return;}
    const touch=event.touches[0],dx=Math.abs(touch.clientX-gesture.x),dy=touch.clientY-gesture.y;
    if(!gesture.claimed&&(dy<0||dx>12&&dx>dy)){gesture=null;return;}
    if(!gesture.claimed&&dy<10)return;
    gesture.claimed=true;if(event.cancelable)event.preventDefault();
    gesture.amount=Math.min(96,Math.max(0,dy*.5));
    indicator.classList.add('is-pulling');indicator.style.opacity=String(Math.min(1,gesture.amount/32));
    indicator.style.transform=`translate(-50%,${gesture.amount-48}px)`;
    indicator.style.setProperty('--pull-turn',gesture.amount*4+'deg');
    indicator.querySelector('.sr').textContent=gesture.amount>=64?'놓으면 새로고침':'아래로 당겨 새로고침';
  },{passive:false});
  document.addEventListener('touchend',async()=>{
    if(!gesture)return;
    const ready=gesture.amount>=64&&eligible()&&gesture.page===page;gesture=null;
    if(!ready){hide();return;}
    refreshing=true;clearTimeout(timer);indicator.classList.remove('is-pulling');
    indicator.style.transform='translate(-50%,16px)';indicator.style.opacity='1';
    indicator.setAttribute('aria-busy','true');indicator.querySelector('.sr').textContent='새로고침 중';
    try{
      const refresh=PM_ENV.requiresAuth?window.PinmapAccountContent?.refresh:()=>render();
      if(!refresh)throw Error('로그인 연결을 확인하고 있어요.');
      await Promise.all([refresh(),new Promise(resolve=>setTimeout(resolve,450))]);
      indicator.querySelector('.sr').textContent=window.PinmapAccountLoadError?'새로고침 실패':'새로고침 완료';
    }catch(error){toast(error.message||'새로고침하지 못했어요. 다시 시도해 주세요.');}
    finally{refreshing=false;timer=setTimeout(hide,250);}
  },{passive:true});
  document.addEventListener('touchcancel',()=>{gesture=null;if(!refreshing)hide();},{passive:true});
})();
