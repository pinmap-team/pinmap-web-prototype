/* A vertical pull at the page top follows touch, mouse and trackpad gestures.
   Maps, horizontal carousels, text fields and open sheets keep their controls. */
(() => {
  let gesture=null,refreshing=false,settleTimer,wheelTimer,wheelLock=0,suppressClickUntil=0;
  const root=document.documentElement;
  const indicator=document.createElement('div');
  indicator.className='pm-refresh';indicator.setAttribute('role','status');
  indicator.innerHTML='<span class="pm-spinner" aria-hidden="true"></span><span class="sr"></span>';
  document.body.append(indicator);root.classList.add('pm-refresh-enabled');
  const eligible=()=>!detailId&&['home','library','my','calendar'].includes(page)&&!document.querySelector('dialog[open],#onboarding')&&!root.classList.contains('auth-pending');
  const atTop=target=>{
    for(let node=target;node&&node!==document.body;node=node.parentElement)if(node.scrollTop>0)return false;
    return (document.scrollingElement?.scrollTop||0)<=0;
  };
  const blocked=target=>!target.closest?.('.main')||target.closest('input,textarea,select,button:not(.pick):not(.cf-folder),a,[contenteditable],.bottomnav');
  function hide(){
    root.classList.remove('pm-pulling');root.style.setProperty('--pull-content','0px');
    indicator.classList.remove('is-pulling','is-ready');indicator.style.opacity='0';
    indicator.style.transform='translate(-50%,-60px)';indicator.removeAttribute('aria-busy');
  }
  function cancel(){gesture=null;clearTimeout(wheelTimer);if(!refreshing)hide();}
  function start(kind,x,y,target,id){
    if(refreshing||gesture||!eligible()||!atTop(target)||blocked(target))return;
    clearTimeout(settleTimer);
    gesture={kind,id,x,y,page,amount:0,claimed:false,target,wheelDistance:0};
  }
  function move(x,y,event){
    if(!gesture)return;
    if(!eligible()||gesture.page!==page||!atTop(gesture.target)){cancel();return;}
    const dx=Math.abs(x-gesture.x),dy=y-gesture.y;
    if(!gesture.claimed&&(dy<0||dx>8&&dx>dy)){cancel();return;}
    if(!gesture.claimed&&dy<10)return;
    gesture.claimed=true;if(event?.cancelable)event.preventDefault();
    gesture.amount=Math.min(96,Math.max(0,dy*.5));
    root.classList.add('pm-pulling');root.style.setProperty('--pull-content',gesture.amount+'px');
    indicator.classList.add('is-pulling');indicator.classList.toggle('is-ready',gesture.amount>=64);
    indicator.style.opacity=String(Math.min(1,gesture.amount/24));
    indicator.style.transform=`translate(-50%,${gesture.amount-48}px)`;
    indicator.style.setProperty('--pull-turn',gesture.amount*4+'deg');
    indicator.querySelector('.sr').textContent=gesture.amount>=64?'놓으면 새로고침':'아래로 당겨 새로고침';
  }
  async function release(){
    if(!gesture)return;
    const pull=gesture;gesture=null;clearTimeout(wheelTimer);
    // A drag on a card must not turn into a click after releasing it.
    if(pull.claimed&&pull.kind!=='wheel')suppressClickUntil=performance.now()+500;
    const ready=pull.amount>=64&&eligible()&&pull.page===page;
    if(!ready){hide();return;}
    refreshing=true;wheelLock=performance.now()+250;
    root.classList.remove('pm-pulling');root.style.setProperty('--pull-content','64px');
    indicator.classList.remove('is-pulling','is-ready');
    indicator.style.transform='translate(-50%,16px)';indicator.style.opacity='1';
    indicator.setAttribute('aria-busy','true');indicator.querySelector('.sr').textContent='새로고침 중';
    try{
      const refresh=PM_ENV.requiresAuth?window.PinmapAccountContent?.refresh:()=>render();
      if(!refresh)throw Error('로그인 연결을 확인하고 있어요.');
      await Promise.all([refresh(),new Promise(resolve=>setTimeout(resolve,600))]);
      indicator.querySelector('.sr').textContent=window.PinmapAccountLoadError?'새로고침 실패':'새로고침 완료';
    }catch(error){toast(error.message||'새로고침하지 못했어요. 다시 시도해 주세요.');}
    finally{settleTimer=setTimeout(()=>{hide();refreshing=false;},200);}
  }
  document.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){cancel();return;}
    const touch=event.touches[0];start('touch',touch.clientX,touch.clientY,event.target,touch.identifier);
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(gesture?.kind!=='touch')return;
    if(event.touches.length!==1){cancel();return;}
    const touch=event.touches[0];move(touch.clientX,touch.clientY,event);
  },{passive:false});
  document.addEventListener('touchend',()=>{if(gesture?.kind==='touch')release();},{passive:true});
  document.addEventListener('touchcancel',()=>{if(gesture?.kind==='touch')cancel();},{passive:true});
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button===0)start('mouse',event.clientX,event.clientY,event.target,event.pointerId);
  });
  document.addEventListener('pointermove',event=>{
    if(gesture?.kind==='mouse'&&event.pointerId===gesture.id)move(event.clientX,event.clientY,event);
  },{passive:false});
  document.addEventListener('pointerup',event=>{if(gesture?.kind==='mouse'&&event.pointerId===gesture.id)release();});
  document.addEventListener('pointercancel',event=>{if(gesture?.kind==='mouse'&&event.pointerId===gesture.id)cancel();});
  document.addEventListener('pointerout',event=>{if(gesture?.kind==='mouse'&&!event.relatedTarget)cancel();});
  document.addEventListener('dragstart',event=>{if(gesture?.kind==='mouse')event.preventDefault();});
  window.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.addEventListener('blur',cancel);
  document.addEventListener('wheel',event=>{
    if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    if(refreshing||performance.now()<wheelLock){wheelLock=performance.now()+250;return;}
    if(gesture&&gesture.kind!=='wheel')return;
    if(event.deltaY>=0){if(gesture?.kind==='wheel')cancel();return;}
    start('wheel',0,0,event.target);
    if(gesture?.kind!=='wheel')return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    gesture.wheelDistance+=-event.deltaY*unit;
    move(0,gesture.wheelDistance,event);
    clearTimeout(wheelTimer);wheelTimer=setTimeout(release,160);
  },{passive:false});
})();
