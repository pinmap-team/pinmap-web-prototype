/* Paddle opens _ptxn and payment-method update links during initialization. */
(async() => {
  const status=document.getElementById('checkout-status');
  try{
  const prototype=new URLSearchParams(window.location.search).get('mode')==='prototype';
  const response=prototype?null:await fetch('/api/billing/config',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  const config=prototype?window.PINMAP_PADDLE:await response.json();
  if((response&&!response.ok)||!config||!['sandbox','live'].includes(config.environment)||!new RegExp('^'+(config.environment==='live'?'live':'test')+'_[A-Za-z0-9_]+$').test(config.clientToken||'')||!window.Paddle||prototype&&config.environment!=='sandbox'){
    status.textContent='결제창을 불러오지 못했어요. 핀맵으로 돌아가 다시 시도해 주세요.';return;
  }
  document.getElementById('checkout-mode').textContent=config.environment==='live'?'안전한 결제':'테스트 결제';
  document.getElementById('checkout-note').textContent=config.environment==='live'?'결제창에 표시된 요금과 결제 주기를 확인해 주세요. 이용권은 서버에서 결제를 확인한 뒤 계정에 반영돼요.':'샌드박스 환경으로 실제 요금은 청구되지 않아요.';
  if(config.environment==='sandbox')window.Paddle.Environment.set('sandbox');
  window.Paddle.Initialize({token:config.clientToken,checkout:{settings:{locale:'ko',displayMode:'overlay',theme:'light'}},eventCallback:event=>{
    if(event.name==='checkout.completed')status.textContent='결제를 완료했어요. 핀맵에서 이용권을 새로고침해 주세요.';
    if(event.name==='checkout.closed')status.textContent='핀맵에서 결제 또는 구독 상태를 확인할 수 있어요.';
    if(event.name==='checkout.error')status.textContent='결제 정보를 확인하지 못했어요. 핀맵에서 다시 시도해 주세요.';
  }});
  status.textContent='결제창에서 결제 또는 결제 수단 변경을 진행해 주세요.';
  }catch{status.textContent='결제 연결을 확인하지 못했어요. 핀맵에서 다시 시도해 주세요.';}
  finally{document.getElementById('checkout-loading').hidden=true;}
})();
