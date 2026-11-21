/* Sandbox checkout only. Browser events never grant subscription access. */
(() => {
  const config = window.PINMAP_PADDLE || {};
  const ready = () => config.environment === 'sandbox' && /^test_[A-Za-z0-9_]+$/.test(config.clientToken || '') && /^pri_[a-z0-9]{26}$/.test(config.monthlyPriceId || '');
  let loading, account=null, accountError='', accountPending;
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
    if(!PM_ENV.requiresAuth)return;
    if(accountPending)return accountPending;
    accountPending=request().then(value=>{account=value;accountError='';}).catch(error=>{account=null;accountError=error.message;}).finally(()=>{accountPending=null;if(page==='billing')render();});
    return accountPending;
  }
  window.PinmapBilling={refresh:refreshAccount};
  if(PM_ENV.requiresAuth)document.addEventListener('DOMContentLoaded',()=>{
    PinmapAuth.ready().then(client=>client.auth.onAuthStateChange(()=>{account=null;accountError='';})).catch(()=>{});
  });
  function paddle(){
    if(loading)return loading;
    loading = new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload=()=>{
        try {
          window.Paddle.Environment.set('sandbox');
          window.Paddle.Initialize({token:config.clientToken,eventCallback:event=>{
            if(event.name==='checkout.completed'){
              window.Paddle.Checkout.close();
              const message=document.getElementById('billing-message');
              if(message)message.textContent=PM_ENV.requiresAuth?'결제를 완료했어요. 서버에서 이용권을 확인하고 있어요.':'테스트 결제를 완료했어요. 계정 이용권은 로그인 후 확인할 수 있어요.';
              if(PM_ENV.requiresAuth){
                let attempts=0;
                const poll=async()=>{await refreshAccount();if(!account?.active&&++attempts<10)setTimeout(poll,2000);};poll();
              }
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
  PARENT_TAB.billing='my';pageName.billing='요금제 및 결제';
  pages.billing=()=>myPage('요금제 및 결제',`
    <section class="billing-plan" aria-label="월간 요금제">
      <span class="billing-tag">월간 이용권</span>
      <h2>핀맵 월간</h2>
      <p class="billing-price"><strong>5,000원</strong><span>/ 월</span></p>
      <p class="muted">매월 콘텐츠 분석 300개를 제공해요.</p>
      <dl class="billing-details"><div><dt>결제 주기</dt><dd>매월</dd></div><div><dt>이용 요금</dt><dd>월 5,000원</dd></div><div><dt>분석 한도</dt><dd>결제 주기마다 300개</dd></div><div><dt>결제 서비스</dt><dd>Paddle</dd></div></dl>
      <p class="billing-note">${ready()?'테스트 결제 모드예요. 실제 요금은 청구되지 않아요.':'현재는 테스트 결제 준비 중이에요. 실제 요금은 청구되지 않아요.'}</p>
      ${PM_ENV.requiresAuth?`<div class="billing-account" role="status"><b>${account?.active?'월간 이용권 이용 중':account?'이용권 확인':'구독 상태'}</b><p>${accountError?esc(accountError):account?account.active?`이번 주기 ${account.used} / 300개 사용 · ${account.remaining}개 남음`:account.status==='free'?'아직 구독 중인 이용권이 없어요.':'이용권이 활성 상태가 아니에요.':'구독 정보를 확인하려면 아래 버튼을 눌러 주세요.'}</p>${account?.periodEnd?`<p>${account.cancelAt?'해지 예정 · ':'다음 주기 · '}${esc(new Date(account.periodEnd).toLocaleDateString('ko-KR'))}</p>`:''}<button type="button" class="textbtn" data-action="billingrefresh">이용권 새로고침</button>${account&&account.status!=='free'?'<button type="button" class="outlined" data-action="billingportal">구독 관리 · 해지</button>':''}</div>`:''}
      <button type="button" class="filled billing-checkout" data-action="paddlecheckout" ${ready()&&!account?.active?'':'disabled'}>${account?.active?'구독 중':'테스트 결제하기'}</button>
      <p id="billing-message" class="muted" role="status">${ready()?'Paddle의 테스트 결제창으로 이동해요.':'결제 서비스 연결 후 테스트할 수 있어요.'}</p>
    </section>
    <p class="muted billing-caption">분석에 성공한 콘텐츠만 차감돼요. 남은 횟수는 다음 결제 주기로 이월되지 않아요.</p>`, 'billingpage');
  actions.billing=()=>{account=null;accountError='';go('billing');refreshAccount();};
  actions.billingrefresh=()=>refreshAccount();
  actions.billingportal=async()=>{
    try{const result=await request('portal');const url=new URL(result.url);if(url.protocol!=='https:'||!['buyer-portal.paddle.com','sandbox-customer-portal.paddle.com','customer-portal.paddle.com'].includes(url.hostname))throw Error('구독 관리 주소를 확인하지 못했어요.');window.top.location.href=url.href;}
    catch(error){toast(error.message);}
  };
  actions.paddlecheckout=async()=>{
    if(!ready())return;
    const button=document.querySelector('[data-action="paddlecheckout"]');
    try{await PinmapButton.run(button,async()=>{
      const sdk=await paddle();
      const checkout=PM_ENV.requiresAuth?await request('checkout'):null;
      sdk.Checkout.open({...checkout?{transactionId:checkout.transactionId}:{items:[{priceId:config.monthlyPriceId,quantity:1}]},settings:{displayMode:'overlay',locale:'ko',theme:document.documentElement.dataset.theme==='dark'?'dark':'light'}});
    },'결제창 여는 중');}
    catch(error){const message=document.getElementById('billing-message');if(message)message.textContent=error.message||'결제창을 열지 못했어요.';}
  };
})();
