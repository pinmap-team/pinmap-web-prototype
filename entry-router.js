(() => {
  const params = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  // Supabase Site URL is the origin root. Forward callbacks intact to the
  // standalone page, before the version chooser can discard the auth code.
  if(params.has('code') || params.has('error') || fragment.has('access_token') || fragment.has('error')) {
    location.replace('auth.html' + location.search + location.hash);
    return;
  }
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    try { localStorage.removeItem('pinmap.auth.v1'); } catch {}
    location.replace('auth.html?screen=welcome');
    return;
  }
  const legacyMode = params.has('place-test') || (params.has('mode') &&
    (params.get('mode') !== 'development' || params.get('auth') !== 'required'));
  if (legacyMode) { location.replace('auth.html?screen=welcome'); return; }
  if (params.has('mode')) {
    params.delete('mode');
    params.delete('auth');
    params.delete('place-test');
    const query=params.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:'')+location.hash);
  }
  // A fresh document has no session; the login page keeps it only in memory.
  location.replace('auth.html?screen=welcome');
})();
