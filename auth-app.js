// Authentication is explicit: only the app entered after the login test requires it.
// Direct development and prototype previews remain available without signing in.
if (PM_ENV.requiresAuth) (() => {
  let client, user, resolving = false;
  const app = document.getElementById('app');
  const login = () => PinmapAuth.login();
  function gate(message = '로그인하고 나만의 핀맵을 시작해 보세요.',loading=false) {
    document.documentElement.classList.add('auth-pending');
    app.inert = true;
    closeOnboarding();
    app.inert = true;
    if (document.getElementById('sheet').open) document.getElementById('sheet').close();
    let node = document.getElementById('auth-gate');
    if (!node) {
      node = document.createElement('section'); node.id = 'auth-gate';
      node.className = 'pm-auth auth-gate'; node.setAttribute('aria-label','핀맵 로그인');
      document.body.append(node);
    }
    if(loading){node.innerHTML='<div class="pm-loading" role="status" aria-label="로그인 상태 확인 중"><span class="pm-spinner" aria-hidden="true"></span></div>';return;}
    node.innerHTML = `<img src="img/pinmap-symbol-splash.svg" alt="" width="48" height="48"><h1>나의 취향을 한곳에</h1><p>${esc(message)}</p><button class="filled auth-submit" id="auth-enter">로그인 · 회원가입</button><a class="auth-home" href="index.html" target="_top">시작 화면으로 돌아가기</a>`;
    node.querySelector('button').onclick = login;
  }
  function unlock() {
    document.getElementById('auth-gate')?.remove();
    document.documentElement.classList.remove('auth-pending');
    app.inert = false; render();
  }
  // Account identity is read by the common account page, never copied to demo settings.
  const logout = async () => {
    if (!client) {login(); return;}
    const button = document.querySelector('[data-action="logoutyes"]');
    try {
      await PinmapButton.run(button, async () => {
        const {error} = await client.auth.signOut({scope:'local'});
        if (error) throw error;
        user = null; window.PinmapAccountIdentity = null; window.top.location.replace(new URL('auth.html',location.href).href);
      },'로그아웃 중');
    } catch (error) {toast(PinmapAuth.message(error));}
  };
  actions.logout = logout;
  actions.logoutask = () => confirmPop('로그아웃할까요?', '다시 로그인하면 저장한 콘텐츠를 그대로 볼 수 있어요.', 'logoutyes','로그아웃','취소');
  actions.logoutyes = logout;
  async function verify() {
    if (resolving) return; resolving = true;
    try {
      const {data,error} = await PinmapAuth.verifiedUser(client);
      if (error || !data.user) {user = null; window.PinmapAccountIdentity = null; gate(); return;}
      const alreadyOpen = user?.id === data.user.id && !document.documentElement.classList.contains('auth-pending');
      user = data.user;
      window.PinmapAccountIdentity = {email:user.email || ''};
      if (!alreadyOpen) unlock();
    } catch {gate('로그인 상태를 확인하지 못했어요. 다시 연결해 주세요.');}
    finally {resolving = false;}
  }
  gate('',true);
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
  }).catch(error => gate(PinmapAuth.message(error)));
})();
