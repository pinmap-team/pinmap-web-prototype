// Shared SDK client for the standalone login page and the real app mode.
// The SDK owns session persistence/refresh; passwords are never saved by Pinmap.
(() => {
  let pending;
  function ready() {
    if (location.protocol === 'file:') return Promise.reject(new Error('AUTH_LOCAL_FILE'));
    if (!pending) pending = (async () => {
      const response = await fetch('/api/auth/config', {cache:'no-store', signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('AUTH_CONFIG');
      const config = await response.json();
      if (!window.supabase?.createClient) throw new Error('AUTH_SDK');
      return window.supabase.createClient(config.url, config.publishableKey, {
        auth:{storageKey:'pinmap.auth.v1', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, flowType:'pkce'}
      });
    })().catch(error => { pending = null; throw error; });
    return pending;
  }
  function message(error) {
    const code = error?.code || '';
    if (error?.message === 'AUTH_LOCAL_FILE') return '로그인은 파일을 직접 열어서는 사용할 수 없어요. 로컬 서버 주소로 접속해 주세요.';
    if (code === 'invalid_credentials') return '이메일 또는 비밀번호를 확인해 주세요.';
    if (code === 'email_not_confirmed') return '이메일 인증을 완료한 뒤 로그인해 주세요.';
    if (code === 'email_address_not_authorized') return '이메일 발송 설정을 확인해야 해요. 운영자에게 문의해 주세요.';
    if (code === 'email_address_invalid') return '이메일 주소를 다시 확인해 주세요.';
    if (code === 'signup_disabled') return '지금은 신규 회원가입이 중지되어 있어요. 잠시 후 다시 확인해 주세요.';
    if (code === 'same_password') return '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.';
    if (['over_email_send_rate_limit','over_request_rate_limit'].includes(code) || error?.status === 429) return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    if (code === 'user_already_exists') return '가입 정보를 확인하거나 비밀번호를 재설정해 주세요.';
    if (code === 'weak_password') return '더 안전한 비밀번호를 사용해 주세요. 최소 8자 이상 입력해 주세요.';
    if (['otp_expired','flow_state_expired','flow_state_not_found','bad_code_verifier','validation_failed'].includes(code)) return '인증 링크가 만료되었거나 유효하지 않아요. 이 브라우저에서 새 링크를 요청해 주세요.';
    if (error?.message === 'AUTH_CONFIG') return '로그인 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.';
    return '연결하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.';
  }
  window.PinmapAuth = {ready, message, callback:() => location.origin + '/', login:() => {window.top.location.href = new URL('auth.html', location.href).href;}};
})();
