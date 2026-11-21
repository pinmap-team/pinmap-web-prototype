/* Paddle opens _ptxn and payment-method update links during initialization. */
(() => {
  const config=window.PINMAP_PADDLE||{},status=document.getElementById('checkout-status');
  if(config.environment!=='sandbox'||!/^test_[A-Za-z0-9_]+$/.test(config.clientToken||'')||!window.Paddle){
    status.textContent='결제창을 불러오지 못했어요. 핀맵으로 돌아가 다시 시도해 주세요.';return;
  }
  window.Paddle.Environment.set('sandbox');
  window.Paddle.Initialize({token:config.clientToken,checkout:{settings:{locale:'ko',displayMode:'overlay',theme:'light'}},eventCallback:event=>{
    if(event.name==='checkout.completed')status.textContent='결제를 완료했어요. 핀맵에서 이용권을 새로고침해 주세요.';
    if(event.name==='checkout.closed')status.textContent='핀맵에서 결제 또는 구독 상태를 확인할 수 있어요.';
    if(event.name==='checkout.error')status.textContent='결제 정보를 확인하지 못했어요. 핀맵에서 다시 시도해 주세요.';
  }});
  status.textContent='결제창에서 결제 또는 결제 수단 변경을 진행해 주세요.';
})();
