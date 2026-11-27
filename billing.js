/* Server-selected account checkout. */
(() => {
  let config = null;
  const valid = value => !!value && ['sandbox','live'].includes(value.environment) && new RegExp('^'+(value.environment==='live'?'live':'test')+'_[A-Za-z0-9_]+$').test(value.clientToken||'') && /^pri_[a-z0-9]{26}$/.test(value.monthlyPriceId||'');
  const ready = () => valid(config);
  const isLive = () => ready() && config.environment==='live';
  let loading, loadedEnvironment, configPending, account=null, accountError='', accountPending, selectedPlan='monthly', labelTimer;
  async function loadConfig(){
    if(configPending)return configPending;
    configPending=(async()=>{
      const response=await fetch('/api/billing/config',{cache:'no-store',signal:AbortSignal.timeout(10000)});
      const value=await response.json();
      if(!response.ok||!valid(value))throw Error('결제 서비스 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
      if(loadedEnvironment&&loadedEnvironment!==value.environment)throw Error('결제 환경이 변경됐어요. 페이지를 새로고침해 주세요.');
      config=value;return config;
    })().finally(()=>{configPending=null;});
    return configPending;
  }
  async function request(action){
    const client=await PinmapAuth.ready();
    const {data}=await client.auth.getSession();
    if(!data.session?.access_token)throw Error('로그인이 필요해요.');
    const response=await fetch('/api/billing/account',{method:action?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+data.session.access_token,...(action?{'Content-Type':'application/json'}:{})},body:action?JSON.stringify({action}):undefined,signal:AbortSignal.timeout(20000)});
    const body=await response.json();
    const current=await client.auth.getSession();
    if(current.data.session?.user?.id!==data.session.user?.id)throw Error('계정이 변경됐어요. 다시 확인해 주세요.');
    if(!response.ok)throw Error(({subscription_exists:'이미 구독 중이에요. 구독 관리에서 확인해 주세요.',checkout_pending:'결제를 준비 중이에요. 잠시 후 다시 눌러 주세요.',payment_verification_pending:'이전 결제를 확인 중이에요. 이용권 새로고침을 눌러 주세요.',billing_not_configured:'결제 서버 연결을 준비 중이에요.',subscription_not_found:'연결된 구독이 없어요.'})[body.error]||'구독 정보를 확인하지 못했어요. 다시 시도해 주세요.');
    return body;
  }
  async function refreshAccount(){
    if(accountPending)return accountPending;
    accountPending=Promise.all([loadConfig(),request()]).then(([,value])=>{if(value.environment!==config.environment)throw Error('결제 환경이 변경됐어요. 다시 확인해 주세요.');account=value;accountError='';}).catch(error=>{account=null;config=null;accountError=error.message;}).finally(()=>{accountPending=null;if(page==='billing'||page==='my')render();});
    return accountPending;
  }
  let myRequested=false;
  window.PinmapBilling={refresh:refreshAccount,view:()=>({account,error:accountError,loading:!!accountPending}),maybeRefresh:()=>{if(!myRequested){myRequested=true;queueMicrotask(refreshAccount);}}};
  document.addEventListener('DOMContentLoaded',()=>{
    PinmapAuth.ready().then(client=>client.auth.onAuthStateChange(()=>{account=null;accountError='';myRequested=false;})).catch(()=>{});
  });
  function paddle(){
    if(loading)return loading;
    loading = new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload=()=>{
        try {
          if(config.environment==='sandbox')window.Paddle.Environment.set('sandbox');
          loadedEnvironment=config.environment;
          window.Paddle.Initialize({token:config.clientToken,eventCallback:event=>{
            if(event.name==='checkout.completed'){
              window.Paddle.Checkout.close();
              const message=document.getElementById('billing-message');
              if(message)message.textContent='결제를 완료했어요. 서버에서 이용권을 확인하고 있어요.';
              let attempts=0;
              const poll=async()=>{await refreshAccount();if(!account?.active&&++attempts<10)setTimeout(poll,2000);};poll();
            }
          }});
          resolve(window.Paddle);
        }catch(error){reject(error);}
      };
      script.onerror=()=>{script.remove();loading=null;reject(new Error('결제창을 불러오지 못했어요. 다시 시도해 주세요.'));};
      document.head.append(script);
    });
    return loading;
  }
  function selectPlan(plan){
    if(!['free','monthly'].includes(plan)||selectedPlan===plan)return;
    selectedPlan=plan;
    const card=document.querySelector('.billing-subscription');
    if(!card)return;
    card.dataset.plan=plan;
    for(const tab of card.querySelectorAll('[role="tab"]')){
      const selected=tab.dataset.plan===plan;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    }
    for(const panel of card.querySelectorAll('[role="tabpanel"]')){
      const selected=panel.dataset.plan===plan;
      panel.classList.toggle('on',selected);panel.setAttribute('aria-hidden',String(!selected));panel.inert=!selected;
    }
    const button=card.querySelector('[data-action="paddlecheckout"]');
    if(button){
      const label=plan==='free'?'무료 요금제':account?.active?'구독 중':isLive()?'월 5,000원 구독하기':'테스트 결제하기';
      button.disabled=plan==='free'||!ready()||!!account?.active;
      const text=button.querySelector('.billing-action-text');
      if(text){
        clearTimeout(labelTimer);
        const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if(reduce){text.textContent=label;text.classList.remove('is-exit','is-enter-start');}
        else{
          text.classList.add('is-exit');
          labelTimer=setTimeout(()=>{
            if(!text.isConnected)return;
            text.textContent=label;text.classList.remove('is-exit');
            text.classList.add('is-enter-start');
            requestAnimationFrame(()=>requestAnimationFrame(()=>text.classList.remove('is-enter-start')));
          },150);
        }
      }
    }
    if(plan==='monthly'){
      const digits=card.querySelector('.billing-price-digits');
      if(digits){digits.classList.remove('is-animating');void digits.offsetWidth;digits.classList.add('is-animating');}
    }
  }
  PARENT_TAB.billing='my';pageName.billing='요금제 및 결제';
  pages.billing=()=>myPage('요금제 및 결제',`
    <section class="billing-plan billing-subscription" data-plan="${selectedPlan}" aria-label="요금제 및 구독 관리">
      <div class="billing-sub-head"><h2>구독 관리</h2><span class="billing-cycle-pill">월간 결제</span></div>
      <div class="billing-tabs" role="tablist" aria-label="요금제 선택">
        <span class="billing-tabs-pill" aria-hidden="true"></span>
        <button type="button" role="tab" id="billing-tab-free" aria-controls="billing-panel-free" aria-selected="${selectedPlan==='free'}" tabindex="${selectedPlan==='free'?0:-1}" data-action="billingplanfree" data-plan="free">무료</button>
        <button type="button" role="tab" id="billing-tab-monthly" aria-controls="billing-panel-monthly" aria-selected="${selectedPlan==='monthly'}" tabindex="${selectedPlan==='monthly'?0:-1}" data-action="billingplanmonthly" data-plan="monthly">핀맵 월간</button>
      </div>
      <div class="billing-page-slide">
        <section class="billing-page billing-page-free${selectedPlan==='free'?' on':''}" role="tabpanel" id="billing-panel-free" aria-labelledby="billing-tab-free" aria-hidden="${selectedPlan!=='free'}" data-plan="free" ${selectedPlan==='free'?'':'inert'}>
          <div><p class="billing-sub-meta">무료 요금제</p><p class="billing-price"><strong>0원</strong><span>/ 월</span></p><p class="billing-sub-meta">매월 무료 이용</p></div>
          <div class="billing-divider"></div><ul class="billing-features"><li>매월 콘텐츠 분석 50회</li><li>장소 및 일정 추출</li><li>AI 설명과 카테고리 분류</li><li>저장한 콘텐츠 확인</li></ul>
        </section>
        <section class="billing-page billing-page-monthly${selectedPlan==='monthly'?' on':''}" role="tabpanel" id="billing-panel-monthly" aria-labelledby="billing-tab-monthly" aria-hidden="${selectedPlan!=='monthly'}" data-plan="monthly" ${selectedPlan==='monthly'?'':'inert'}>
          <div><p class="billing-sub-meta">핀맵 월간</p><p class="billing-price"><strong class="billing-price-digits"><span>5</span><span data-stagger="1">,</span><span data-stagger="2">000</span>원</strong><span>/ 월</span></p><p class="billing-sub-meta">매월 자동 결제, 세금 포함</p></div>
          <div class="billing-divider"></div>
          <ul class="billing-features"><li>결제 주기마다 콘텐츠 분석 300개</li><li>장소 및 일정 추출</li><li>AI 설명과 카테고리 분류</li><li>저장한 콘텐츠 확인</li></ul>
        </section>
      </div>
      <button type="button" class="filled billing-checkout" data-action="paddlecheckout" ${selectedPlan==='monthly'&&ready()&&!account?.active?'':'disabled'}><span class="billing-action-text">${selectedPlan==='free'?'무료 요금제':account?.active?'구독 중':isLive()?'월 5,000원 구독하기':'테스트 결제하기'}</span></button>
    </section>
    <div class="billing-account" role="status"><b>${account?.active?'월간 이용권 이용 중':account?'무료 이용 중':'구독 상태'}</b><p>${accountError?esc(accountError):account?account.active?`이번 주기 ${account.used} / 300개 사용, ${account.remaining}개 남음`:`이번 달 무료 분석 ${account.used} / 50회 사용, ${account.remaining}회 남음`:'구독 정보를 확인하려면 아래 버튼을 눌러 주세요.'}</p>${account?.periodEnd?`<p>${account.cancelAt?'해지 예정: ':'다음 주기: '}${esc(new Date(account.periodEnd).toLocaleDateString('ko-KR'))}</p>`:''}<div class="billing-account-actions"><button type="button" class="textbtn" data-action="billingrefresh">이용권 새로고침</button>${account&&account.status!=='free'?'<button type="button" class="outlined" data-action="billingportal">구독 관리 및 해지</button>':''}</div></div>
    <p class="billing-note">${isLive()?'매월 5,000원(세금 포함)이 자동 결제돼요. 구독 관리에서 해지할 수 있어요.':ready()?'테스트 결제 모드예요. 실제 요금은 청구되지 않아요.':'결제 서비스 연결을 확인하고 있어요.'}</p>
    <p id="billing-message" class="muted" role="status">${account?.active?'구독 관리에서 결제 내역과 해지를 확인할 수 있어요.':ready()?isLive()?'Paddle 결제창에서 요금과 결제 주기를 확인해 주세요.':'Paddle의 테스트 결제창으로 이동해요.':'결제 연결 후 이용할 수 있어요.'}</p>
    <p class="muted billing-caption">분석에 성공한 콘텐츠만 차감돼요. 남은 횟수는 다음 결제 주기로 이월되지 않아요.</p>`, 'billingpage');
  actions.billing=()=>{account=null;accountError='';selectedPlan='monthly';go('billing');refreshAccount();};
  actions.billingplanfree=()=>selectPlan('free');
  actions.billingplanmonthly=()=>selectPlan('monthly');
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest?.('.billing-tabs [role="tab"]');
    if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?'free':event.key==='End'?'monthly':tab.dataset.plan==='free'?'monthly':'free';
    selectPlan(next);
    document.querySelector(`.billing-tabs [data-plan="${next}"]`)?.focus();
  });
  actions.billingrefresh=()=>refreshAccount();
  actions.billingportal=async()=>{
    try{const result=await request('portal');const url=new URL(result.url);if(url.protocol!=='https:'||!['buyer-portal.paddle.com','sandbox-customer-portal.paddle.com','customer-portal.paddle.com'].includes(url.hostname))throw Error('구독 관리 주소를 확인하지 못했어요.');window.top.location.href=url.href;}
    catch(error){toast(error.message);}
  };
  actions.paddlecheckout=async()=>{
    const button=document.querySelector('[data-action="paddlecheckout"]');
    try{await PinmapButton.run(button,async()=>{
      await loadConfig();
      if(!ready())throw Error('결제 연결을 확인하지 못했어요.');
      await refreshAccount();
      if(selectedPlan!=='monthly'||!ready()||account?.active)return;
      const checkout=await request('checkout');
      if(checkout&&checkout.environment!==config.environment)throw Error('결제 환경이 변경됐어요. 페이지를 새로고침해 주세요.');
      const sdk=await paddle();
      sdk.Checkout.open({transactionId:checkout.transactionId,settings:{displayMode:'overlay',locale:'ko',theme:document.documentElement.dataset.theme==='dark'?'dark':'light'}});
    },'결제창 여는 중');}
    catch(error){const message=document.getElementById('billing-message');if(message)message.textContent=error.message||'결제창을 열지 못했어요.';}
  };
})();
