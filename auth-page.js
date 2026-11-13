(() => {
  const content = document.getElementById('auth-content');
  const main = document.getElementById('auth-main');
  let client, mode = 'welcome', busy = false, unsubscribe;
  let lastEmail = '', verificationPurpose = 'signup', resendAfter = 0, resendTimer;
  const pendingKey = 'pinmap.auth.pending-email';
  let resumeVerification = false;
  try {
    const pending = JSON.parse(sessionStorage.getItem(pendingKey));
    if (pending && typeof pending.email === 'string' && pending.email.length <= 254 && ['signup','reset'].includes(pending.purpose) && Date.now() - pending.createdAt < 86400000) {
      lastEmail = pending.email; verificationPurpose = pending.purpose;
      resendAfter = Number(pending.resendAfter) || 0; resumeVerification = true;
    }
  } catch {}
  const recoveryKey = 'pinmap.auth.recovery';
  const fragment = new URLSearchParams(location.hash.slice(1));
  const params = new URLSearchParams(location.search);
  const showLoginChoice = params.get('screen') === 'welcome';
  const callbackError = fragment.has('error') || params.has('error');
  let recovering = fragment.get('type') === 'recovery' || sessionStorage.getItem(recoveryKey) === '1';
  const fieldIcon = type => type === 'email'
    ? '<span class="auth-input-icon" aria-hidden="true">@</span>'
    : '<span class="auth-input-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="10" width="12" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/></svg></span>';
  const emailField = `<label class="auth-field" for="auth-email"><span class="auth-field-label">이메일</span><span class="auth-input-shell">${fieldIcon('email')}<input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="이메일 주소" maxlength="254" required></span></label>`;
  const passwordField = fresh => `<label class="auth-field" for="auth-password"><span class="auth-field-label">${mode === 'password' ? '새 비밀번호' : '비밀번호'}</span><span class="auth-input-shell auth-password">${fieldIcon('password')}<input id="auth-password" name="password" type="password" autocomplete="${fresh ? 'new-password' : 'current-password'}" ${fresh ? 'minlength="8"' : ''} aria-describedby="auth-password-help" maxlength="128" placeholder="${mode === 'password' ? '새 비밀번호 · 8자 이상' : fresh ? '8자 이상 입력해 주세요' : '비밀번호'}" required><button type="button" data-auth="reveal" aria-controls="auth-password" aria-label="비밀번호 표시" aria-pressed="false">보기</button></span></label>`;
  const confirmation = `<label class="auth-field" for="auth-confirm"><span class="auth-field-label">비밀번호 확인</span><span class="auth-input-shell">${fieldIcon('password')}<input id="auth-confirm" name="confirm" type="password" placeholder="비밀번호 확인" autocomplete="new-password" minlength="8" maxlength="128" aria-describedby="auth-confirm-help" required></span><small id="auth-confirm-help" class="auth-field-help" aria-live="polite"></small></label>`;
  const kakao = '<button class="auth-kakao" type="button" data-auth="kakao" aria-label="카카오로 시작하기"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-.9 3.3c-.1.3.2.5.5.3l3.9-2.6c.7.1 1.3.2 2 .2 5.5 0 10-3.5 10-7.7S17.5 3 12 3Z"/></svg></button>';
  const google = '<button class="auth-google" type="button" data-auth="google" aria-label="구글로 시작하기"><svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true"><path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.67-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.17v5h6.6c3.86-3.55 6.09-8.78 6.09-14.67Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.82 13.52-4.87l-6.6-5c-1.82 1.22-4.15 1.94-6.92 1.94-5.32 0-9.82-3.59-11.43-8.42H5.75v5.16A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.57 27.65a12 12 0 0 1 0-7.3v-5.16H5.75a20 20 0 0 0 0 17.62l6.82-5.16Z"/><path fill="#EA4335" d="M24 11.93c3 0 5.68 1.03 7.8 3.06l5.85-5.85C34.1 5.83 29.5 4 24 4a20 20 0 0 0-18.25 11.19l6.82 5.16C14.18 15.52 18.68 11.93 24 11.93Z"/></svg></button>';
  function notice(text, error = false) {
    const node = document.getElementById('auth-message');
    node.classList.toggle('is-error', error); node.textContent = text;
  }
  function updateResend() {
    const button = content.querySelector('[data-auth="resend"]');
    const help = document.getElementById('auth-resend-help');
    if (!button || !help) return;
    const seconds = Math.max(0, Math.ceil((resendAfter - Date.now()) / 1000));
    button.disabled = busy || seconds > 0;
    help.textContent = seconds ? `${seconds}초 후 다시 보낼 수 있어요.` : '메일이 없다면 스팸함을 확인하거나 다시 보내기를 눌러 주세요.';
  }
  function fillEmail() {
    const field = document.getElementById('auth-email');
    if (field && lastEmail) field.value = lastEmail;
  }
  function signupProgress(current) {
    return `<ol class="auth-progress" aria-label="회원가입 단계">${['정보 입력','이메일 인증','가입 완료'].map((label,index) => {
      const step = index + 1;
      const state = step < current ? 'done' : step === current ? 'current' : 'upcoming';
      const symbol = state === 'done' ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12 4 4 8-8"/></svg>' : step;
      return `<li class="auth-step is-${state}" ${state === 'current' ? 'aria-current="step"' : ''}><span class="auth-step-number" aria-hidden="true">${symbol}</span><span class="auth-step-label">${label}<span class="auth-sr-only"> · ${state === 'done' ? '완료' : state === 'current' ? '현재 단계' : '예정'}</span></span></li>`;
    }).join('')}</ol>`;
  }
  function verificationScreen() {
    try {sessionStorage.setItem(pendingKey,JSON.stringify({email:lastEmail,purpose:verificationPurpose,resendAfter,createdAt:Date.now()}));} catch {}
    const signup = verificationPurpose === 'signup';
    content.innerHTML = `<button class="auth-back" type="button" data-auth="${signup ? 'signup' : 'reset'}" aria-label="이메일 입력으로 돌아가기">←</button>
      ${signup ? signupProgress(2) : ''}
      <div class="auth-mail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></div>
      <header class="auth-heading"><h1>${signup ? '인증 메일을<br>확인해 주세요' : '재설정 메일을<br>확인해 주세요'}</h1><p class="auth-verification-email" id="auth-sent-email"></p></header>
      <ol class="auth-mail-steps"><li>받은 메일에서 ${signup ? '이메일 인증' : '비밀번호 재설정'} 링크를 눌러 주세요.</li><li>${signup ? '인증을 마치면 이 화면으로 돌아와 로그인해 주세요.' : '메일에서 열린 화면에서 새 비밀번호를 설정해 주세요.'}</li></ol>
      <p class="auth-field-help">자동으로 연결되지 않아도 괜찮아요. 가입한 이메일과 비밀번호로 로그인할 수 있어요.</p>
      <button class="filled auth-submit" type="button" data-auth="verified-login">${signup ? '인증했어요 · 로그인하기' : '로그인으로 돌아가기'}</button>
      <button class="auth-secondary" type="button" data-auth="resend" aria-describedby="auth-resend-help">${signup ? '인증 메일 다시 보내기' : '재설정 메일 다시 보내기'}</button>
      <p id="auth-resend-help" class="auth-field-help"></p>
      <p class="auth-message" id="auth-message" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="auth-mail-links"><button type="button" data-auth="${signup ? 'signup' : 'reset'}">이메일 주소 수정</button>${signup ? '<button type="button" data-auth="signin">이미 가입했다면 로그인</button>' : ''}</div>`;
    document.getElementById('auth-sent-email').textContent = lastEmail;
    updateResend(); resendTimer = setInterval(updateResend, 1000);
  }
  function render(next = mode) {
    clearInterval(resendTimer);
    mode = next; main.dataset.screen = mode;
    if (mode === 'verify') {verificationScreen(); main.setAttribute('aria-busy','false'); return;}
    try {sessionStorage.removeItem(pendingKey);} catch {}
    resumeVerification = false;
    if (mode === 'welcome') {
      content.innerHTML = `<div class="auth-social"><p>간편하게 시작하기</p><div class="auth-social-buttons">${kakao}${google}</div></div><nav class="auth-entry-links" aria-label="이메일 계정"><button type="button" data-auth="signin">이메일 로그인</button><span class="auth-entry-divider" aria-hidden="true"></span><button type="button" data-auth="signup">회원가입</button></nav><p class="auth-message" id="auth-message" role="status" aria-live="polite" aria-atomic="true"></p>`;
      main.setAttribute('aria-busy','false'); return;
    }
    const title = {signin:'이메일 로그인',signup:'회원가입',reset:'비밀번호 재설정',password:'새 비밀번호 설정'}[mode];
    const description = {signin:'저장한 취향을 다시 만나요.',signup:'이메일로 나만의 핀맵을 시작해 보세요.',reset:'가입한 이메일로 링크를 보내드려요.',password:'앞으로 사용할 비밀번호를 입력해 주세요.'}[mode];
    const submit = {signin:'이메일로 로그인',signup:'가입하고 인증 메일 받기',reset:'재설정 링크 보내기',password:'비밀번호 변경'}[mode];
    content.innerHTML = `<button class="auth-back" type="button" data-auth="welcome" aria-label="로그인 방식 선택으로 돌아가기"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><header class="auth-heading"><h1>${title}</h1><p>${description}</p></header>
      ${mode === 'signup' ? signupProgress(1) : ''}
      <form id="auth-form">${mode !== 'password' ? emailField : ''}${mode !== 'reset' ? passwordField(mode !== 'signin') : ''}${mode !== 'reset' ? `<small id="auth-password-help" class="auth-field-help">${mode === 'signin' ? '가입할 때 설정한 비밀번호를 입력해 주세요.' : '8자 이상 입력해 주세요.'}</small>` : ''}${['signup','password'].includes(mode) ? confirmation : ''}
      ${mode === 'signin' ? '<button class="auth-forgot" type="button" data-auth="reset" aria-label="비밀번호 재설정">비밀번호를 잊으셨나요?</button>' : ''}
      <button class="filled auth-submit auth-submit-wide" type="submit" aria-label="${submit}"><span>${submit}</span></button></form>
      <p class="auth-message" id="auth-message" role="status" aria-live="polite" aria-atomic="true"></p>
      ${mode === 'signin' ? '<p class="auth-switch"><button type="button" data-auth="signup">회원가입</button></p>' : mode !== 'password' ? '<p class="auth-switch"><button type="button" data-auth="signin">로그인으로 돌아가기</button></p>' : ''}`;
    fillEmail();
    main.setAttribute('aria-busy','false');
  }
  function enterApp() {try {sessionStorage.removeItem(pendingKey);} catch {} location.replace('index.html?mode=development&auth=required'); }
  function loading(value) {
    busy = value; main.setAttribute('aria-busy', String(value));
    main.querySelectorAll('button').forEach(button => {button.disabled = value;});
    updateResend();
  }
  function connectionScreen(retry=false) {
    main.dataset.screen=retry?'error':'connecting';
    main.setAttribute('aria-busy',String(!retry));
    content.innerHTML=`<div class="auth-connection"><span class="auth-connection-symbol" aria-hidden="true"></span><header class="auth-heading" role="status" aria-live="polite"><h1>잠시 연결을<br>기다려 주세요</h1></header>${retry?'<button class="filled auth-submit auth-submit-wide" data-auth="retry">다시 연결하기</button><a class="auth-home" href="index.html">시작 화면으로 돌아가기</a>':''}</div>`;
  }
  async function boot() {
    connectionScreen();
    try {
      client = await PinmapAuth.ready();
      unsubscribe?.();
      const {data} = client.auth.onAuthStateChange((event, session) => {
        // Do not call async Supabase methods inside the SDK's auth lock.
        if (event === 'SIGNED_IN' && mode === 'verify' && verificationPurpose === 'signup' && session?.user?.email_confirmed_at && session.user.email?.toLowerCase() === lastEmail.toLowerCase()) setTimeout(enterApp,0);
        if (event === 'PASSWORD_RECOVERY') {
          recovering = true; sessionStorage.setItem(recoveryKey,'1'); render('password');
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const {error:initialError} = await client.auth.initialize();
      if (initialError) {
        recovering = false; sessionStorage.removeItem(recoveryKey);
        history.replaceState(null,'',location.pathname + (showLoginChoice ? '?screen=welcome' : '')); render('signin');
        notice('인증 링크를 확인하지 못했어요. 이메일에서 인증을 마쳤다면 가입한 이메일과 비밀번호로 로그인해 주세요. 비밀번호 재설정 링크라면 새 링크를 요청해 주세요.',true); return;
      }
      const {data:sessionData, error} = await client.auth.getSession();
      if (error) throw error;
      // SDK consumes tokens/code before we clear any remaining callback data.
      history.replaceState(null,'',location.pathname + (showLoginChoice ? '?screen=welcome' : ''));
      if (callbackError) { recovering = false; sessionStorage.removeItem(recoveryKey); render(); notice('인증을 완료하지 못했어요. 다시 로그인하거나 새 인증 링크를 요청해 주세요.',true); return; }
      if (recovering) {
        if (sessionData.session) { render('password'); return; }
        recovering = false; sessionStorage.removeItem(recoveryKey); render('reset');
        notice('재설정 링크가 만료되었어요. 새 링크를 요청해 주세요.',true); return;
      }
      if (sessionData.session) {
        const {data:userData,error:userError} = await client.auth.getUser();
        if (userError) throw userError;
        if (userData.user && !showLoginChoice) {enterApp(); return;}
      }
      if (params.has('code') || fragment.has('access_token')) {render('signin'); notice('인증 링크를 확인하지 못했어요. 이메일에서 인증을 마쳤다면 가입한 이메일과 비밀번호로 로그인해 주세요.',true);} else render(resumeVerification ? 'verify' : mode);
    } catch (error) {
      // Keep connection failures distinct from field validation errors.
      connectionScreen(true);
      if (error?.message === 'AUTH_LOCAL_FILE') {
        content.querySelector('h1').textContent = '서버 주소로 열어 주세요';
        const retry = content.querySelector('[data-auth="retry"]');
        retry.outerHTML = '<a class="filled auth-submit auth-submit-wide" href="http://127.0.0.1:8095/auth.html">로컬 서버에서 열기</a>';
      }
    }
  }
  main.addEventListener('click', async event => {
    const button = event.target.closest('[data-auth]');
    if (!button || busy) return;
    const action = button.dataset.auth;
    if (action === 'retry') {await boot(); return;}
    if (action === 'verified-login') {
      render('signin'); notice('이메일 인증을 마쳤다면 비밀번호를 입력해 로그인해 주세요.');
      document.getElementById('auth-password').focus(); return;
    }
    if (action === 'resend' && client && lastEmail && Date.now() >= resendAfter) {
      await PinmapButton.run(button, async () => {
        loading(true); notice('메일을 다시 요청하고 있어요.');
        try {
          const result = verificationPurpose === 'signup'
            ? await client.auth.resend({type:'signup',email:lastEmail,options:{emailRedirectTo:PinmapAuth.callback()}})
            : await client.auth.resetPasswordForEmail(lastEmail,{redirectTo:PinmapAuth.callback()});
          if (result.error) throw result.error;
          resendAfter = Date.now() + 60000;
          try {sessionStorage.setItem(pendingKey,JSON.stringify({email:lastEmail,purpose:verificationPurpose,resendAfter,createdAt:Date.now()}));} catch {}
          notice('메일을 다시 요청했어요. 받은 편지함과 스팸함을 확인해 주세요.');
        } catch (error) {notice(PinmapAuth.message(error),true);}
        finally {loading(false);}
      },'인증 메일 재발송 중');
      updateResend(); return;
    }
    if (action === 'reveal') {
      const input = document.getElementById('auth-password'); const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password'; button.textContent = visible ? '숨김' : '보기';
      button.setAttribute('aria-pressed', String(visible)); button.setAttribute('aria-label', visible ? '비밀번호 숨기기' : '비밀번호 표시'); return;
    }
    if (['welcome','signin','signup','reset'].includes(action) && client) {lastEmail = document.getElementById('auth-email')?.value.trim() || lastEmail; render(action); (action === 'signin' && lastEmail ? document.getElementById('auth-password') : content.querySelector('input'))?.focus(); return;}
    if (['kakao','google'].includes(action) && client) {
      const providerName = action === 'google' ? '구글' : '카카오';
      await PinmapButton.run(button, async () => {
        loading(true); notice(`${providerName} 로그인으로 이동하고 있어요.`);
        try {
          const {error} = await client.auth.signInWithOAuth({provider:action, options:{redirectTo:PinmapAuth.callback()}});
          if (error) throw error;
        } catch (error) {notice(PinmapAuth.message(error),true);}
        finally {loading(false);}
      },`${providerName} 로그인 연결 중`);
    }
  });
  content.addEventListener('submit', async event => {
    if (event.target.id !== 'auth-form') return;
    event.preventDefault(); if (busy || !client) return;
    const form = event.target;
    const email = form.elements.email?.value.trim();
    const password = form.elements.password?.value;
    if (email) lastEmail = email;
    if (form.elements.confirm && form.elements.confirm.value !== password) {
      notice('비밀번호가 일치하지 않아요.',true); form.elements.confirm.setAttribute('aria-invalid','true'); form.elements.confirm.focus(); return;
    }
    const submittedMode = mode;
    await PinmapButton.run(form.querySelector('[type="submit"]'), async () => {
      loading(true); notice('처리하고 있어요.');
      try {
        let result;
        if (submittedMode === 'signin') result = await client.auth.signInWithPassword({email,password});
        if (submittedMode === 'signup') result = await client.auth.signUp({email,password,options:{emailRedirectTo:PinmapAuth.callback()}});
        if (submittedMode === 'reset') result = await client.auth.resetPasswordForEmail(email,{redirectTo:PinmapAuth.callback()});
        if (submittedMode === 'password') result = await client.auth.updateUser({password});
        if (result.error) throw result.error;
        if (submittedMode === 'signin' || (submittedMode === 'signup' && result.data.session)) {enterApp(); return;}
        if (submittedMode === 'password') {
          recovering = false; sessionStorage.removeItem(recoveryKey); enterApp(); return;
        }
        form.reset(); verificationPurpose = submittedMode === 'signup' ? 'signup' : 'reset';
        resendAfter = Date.now() + 60000; render('verify');
        notice(submittedMode === 'signup' ? '가입 가능한 이메일이면 인증 메일이 도착해요. 이미 가입한 이메일이라면 로그인으로 진행해 주세요.' : '가입된 이메일이면 재설정 링크가 도착해요. 받은 편지함과 스팸함을 확인해 주세요.');
      } catch (error) {
        if (error.code === 'email_not_confirmed' && email) {verificationPurpose = 'signup'; resendAfter = 0; render('verify');}
        notice(PinmapAuth.message(error),true);
      } finally {loading(false);}
    },'로그인 요청 처리 중');
  });
  content.addEventListener('invalid', event => {
    const field = event.target; field.setAttribute('aria-invalid','true');
    const text = field.validity.valueMissing ? '필수 항목을 모두 입력해 주세요.' : field.validity.typeMismatch ? '올바른 이메일 주소를 입력해 주세요.' : field.validity.tooShort ? '비밀번호는 8자 이상 입력해 주세요.' : '입력한 내용을 확인해 주세요.';
    notice(text,true);
  },true);
  content.addEventListener('input', event => {
    event.target.removeAttribute('aria-invalid');
    if (document.getElementById('auth-message')?.classList.contains('is-error')) notice('');
    const password = document.getElementById('auth-password');
    const confirm = document.getElementById('auth-confirm');
    const help = document.getElementById('auth-confirm-help');
    if (password && confirm && help && confirm.value) {
      const matches = confirm.value === password.value;
      help.textContent = matches ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.';
      confirm.setAttribute('aria-invalid',String(!matches));
    }
  });
  boot();
})();
