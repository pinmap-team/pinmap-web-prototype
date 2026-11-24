// The account app is the only supported application entry.
if (PM_ENV.requiresAuth) (() => {
  let client, user, resolving = false, onboardingUserId = null, leavingAccount = false;
  const app = document.getElementById('app');
  const login = () => window.top.location.replace(new URL('auth.html?screen=welcome', location.href).href);
  function maybeStartOnboarding() {
    if (!user?.id || window.PinmapAccountState?.userId !== user.id || onboardDone ||
        document.documentElement.classList.contains('auth-pending') || document.getElementById('onboarding') ||
        onboardingUserId === user.id) return;
    onboardingUserId = user.id;
    openOnboarding(1);
  }
  window.addEventListener('pinmap:account-profile-loaded',maybeStartOnboarding);
  function gate(loading=false) {
    onboardingUserId = null;
    document.documentElement.classList.add('auth-pending');
    app.inert = true;
    closeOnboarding();
    if(document.getElementById('coach')){document.getElementById('coach').remove();lockScroll(false);}
    app.inert = true;
    if (document.getElementById('sheet').open) document.getElementById('sheet').close();
    if (!loading) { if (!leavingAccount) login(); return; }
    let node = document.getElementById('auth-gate');
    if (!node) {
      node = document.createElement('section'); node.id = 'auth-gate';
      node.className = 'pm-auth auth-gate'; node.setAttribute('aria-label','핀맵 로그인');
      document.body.append(node);
    }
    node.innerHTML='<div class="pm-loading" role="status" aria-label="로그인 상태 확인 중"><span class="pm-spinner" aria-hidden="true"></span></div>';
  }
  function unlock() {
    document.getElementById('auth-gate')?.remove();
    document.documentElement.classList.remove('auth-pending');
    app.inert = false; render(); maybeStartOnboarding();
    window.PinmapEntryFrameReady?.();
  }
  // Account identity is read by the common account page, never copied to demo settings.
  const logout = async () => {
    if (!client) {login(); return;}
    const button = document.querySelector('[data-action="logoutyes"]');
    try {
      await PinmapButton.run(button, async () => {
        leavingAccount = true;
        const {error} = await client.auth.signOut({scope:'local'});
        if (error) throw error;
        user = null; window.PinmapAccountIdentity = null; window.top.location.replace(new URL('auth.html',location.href).href);
      },'로그아웃 중');
    } catch (error) {leavingAccount = false;toast(PinmapAuth.message(error));}
  };
  actions.logout = logout;
  actions.logoutask = () => confirmPop('로그아웃할까요?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes','로그아웃','취소');
  actions.logoutyes = logout;
  // Never run the old prototype's destructive local reset as account deletion.
  actions.leaveask = () => confirmPop('탈퇴할까요?', '탈퇴하면 저장한 콘텐츠와 설정이 모두 지워져요.<br>이용 중인 구독도 즉시 해지되며, 되돌릴 수 없어요.', 'leaveyes', '탈퇴하기', '유지하기');
  actions.leaveyes = async () => {
    const button = document.querySelector('[data-action="leaveyes"]');
    try {
      await PinmapButton.run(button, async () => {
        if (!client) throw Error('로그인 상태를 확인하지 못했어요.');
        const {data, error} = await PinmapAuth.verifiedUser(client);
        if (error || !data?.user?.id || data.user.id !== user?.id)
          throw Error('로그인 계정을 다시 확인해 주세요.');
        const session = await client.auth.getSession();
        if (session.error || session.data?.session?.user?.id !== data.user.id ||
            !session.data.session.access_token) throw Error('다시 로그인한 뒤 탈퇴해 주세요.');
        const response = await fetch('/api/account-delete', {
          method: 'DELETE',
          headers: {Authorization: `Bearer ${session.data.session.access_token}`},
          cache: 'no-store', signal: AbortSignal.timeout(30000)
        });
        let result;
        try { result = await response.json(); } catch { result = {}; }
        if (!response.ok || result.deleted !== true) {
          if (response.status === 403 && result.error === 'test_account_cannot_delete')
            throw Error('공용 테스트 계정은 탈퇴할 수 없어요.');
          if (result.error === 'checkout_pending')
            throw Error('결제 처리 중이에요. 결제 상태가 확정된 뒤 다시 시도해 주세요.');
          if (result.error === 'subscription_cancellation_failed')
            throw Error('구독 해지를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
          throw Error('탈퇴를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
        window.PinmapZipImport?.pause();
        leavingAccount = true;
        try { await client.auth.signOut({scope: 'local'}); } catch {}
        try {
          localStorage.removeItem('pinmap.auth.v1');
          localStorage.removeItem(`pinmap.zip-import.v1.${data.user.id}`);
        } catch {}
        user = null; window.PinmapAccountIdentity = null;
        window.top.location.replace(new URL('auth.html?screen=welcome&deleted=1', location.href).href);
      }, '탈퇴 처리 중');
    } catch (error) { toast(error.message || '탈퇴를 완료하지 못했어요. 다시 시도해 주세요.'); }
  };
  async function verify() {
    if (resolving) return; resolving = true;
    try {
      const {data,error} = await PinmapAuth.verifiedUser(client);
      if (error || !data.user) {user = null; window.PinmapAccountIdentity = null; gate(); return;}
      const alreadyOpen = user?.id === data.user.id && !document.documentElement.classList.contains('auth-pending');
      user = data.user;
      window.PinmapAccountIdentity = {email:user.email || ''};
      if (!alreadyOpen) unlock();
    } catch {gate();}
    finally {resolving = false;}
  }
  gate(true);
  PinmapAuth.ready().then(async sdk => {
    client = sdk;
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {user = null; window.PinmapAccountIdentity = null; gate();}
      if (['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)) setTimeout(verify,0);
    });
    const {data,error} = await client.auth.getSession();
    if (error || !data?.session?.user) {gate(); return;}
    // The app starts with an empty account view; server data still requires verification.
    user = data.session.user;
    window.PinmapAccountIdentity = {email:user.email || ''};
    unlock();
    void verify();
  }).catch(() => gate());
})();
