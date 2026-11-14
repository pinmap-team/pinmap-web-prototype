(() => {
  const params = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  // Supabase Site URL is the origin root. Forward callbacks intact to the
  // standalone page, before the version chooser can discard the auth code.
  if(params.has('code') || params.has('error') || fragment.has('access_token') || fragment.has('error')) {
    location.replace('auth.html' + location.search + location.hash);
    return;
  }
  const reloading = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const mode = reloading ? null : params.get('mode');
  const requiresAuth = mode === 'development' && params.get('auth') === 'required';
  const placeTest = mode === 'development' && params.get('place-test') === '1';
  // A mode is a one-time entry choice, not a route to restore on refresh.
  if(params.has('mode')) {
    params.delete('mode');
    params.delete('auth');
    params.delete('place-test');
    const query=params.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:'')+location.hash);
  }
  // Explicit assignment also prevents a browser restoring the previous iframe.
  document.querySelector('.phone-frame').src = mode === 'development' || mode === 'prototype'
    ? 'app.html?mode=' + mode + (requiresAuth ? '&auth=required' : '') + (placeTest ? '&place-test=1' : '')
    : 'entry.html';
})();
