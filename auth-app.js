// Authentication is explicit: only the app entered after the login test requires it.
// Direct development and prototype previews remain available without signing in.
if (PM_ENV.requiresAuth) (() => {
  let client, user, resolving = false;
  const app = document.getElementById('app');
  const login = () => PinmapAuth.login();
  function gate(message = '로그인하고 나만의 핀맵을 시작하세요.') {
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
    node.innerHTML = `<img src="img/pinmap-symbol-splash.svg" alt="" width="48" height="48"><h1>나의 취향을 한곳에</h1><p>${esc(message)}</p><button class="filled auth-submit" id="auth-enter">로그인 · 회원가입</button><a class="auth-home" href="index.html" target="_top">시작 화면으로 돌아가기</a>`;
    node.querySelector('button').onclick = login;
  }
  function unlock() {
    document.getElementById('auth-gate')?.remove();
    document.documentElement.classList.remove('auth-pending');
    app.inert = false; render();
  }
  // Expose identity in the account page without persisting it into the shared
  // prototype settings. A cloud content database is a separate integration.
  const accountPage = pages.account;
  const myPageWithProfile = pages.my;
  pages.my = () => `<p class="auth-current-user" aria-label="로그인 계정">${esc(user?.email || '카카오 계정으로 로그인됨')}</p>` + myPageWithProfile();
  pages.account = () => accountPage().replace('<section class="account-identity"', `<section class="auth-account-status" aria-label="로그인 계정"><b>로그인 계정</b><p>${esc(user?.email || '카카오 계정으로 로그인됨')}</p><small>저장 콘텐츠의 계정별 동기화는 준비 중이에요.</small></section><section class="account-identity"`);
  const logout = async () => {
    if (!client) {login(); return;}
    const button = document.querySelector('[data-action="logoutyes"]');
    try {
      await PinmapButton.run(button, async () => {
        const {error} = await client.auth.signOut({scope:'local'});
        if (error) throw error;
        user = null; window.top.location.replace(new URL('auth.html',location.href).href);
      },'로그아웃 중');
    } catch (error) {toast(PinmapAuth.message(error));}
  };
  actions.logout = logout;
  actions.logoutask = () => confirmPop('로그아웃할까요?', '이 브라우저의 로그인 상태를 종료해요.', 'logoutyes','로그아웃','취소');
  actions.logoutyes = logout;
  // Never run the old prototype's destructive local reset as account deletion.
  actions.leaveask = actions.leaveyes = () => toast('회원 탈퇴는 아직 연결되지 않았어요.');
  async function verify() {
    if (resolving) return; resolving = true;
    try {
      const {data,error} = await client.auth.getUser();
      if (error || !data.user) {user = null; gate(); return;}
      user = data.user; unlock();
    } catch {gate('로그인 상태를 확인하지 못했어요. 다시 연결해 주세요.');}
    finally {resolving = false;}
  }
  gate('로그인 상태를 확인하고 있어요.');
  PinmapAuth.ready().then(async sdk => {
    client = sdk;
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {user = null; gate();}
      if (['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)) setTimeout(verify,0);
    });
    await verify();
  }).catch(error => gate(PinmapAuth.message(error)));
})();
