/* Only the authenticated account app may load this bundle. */
(() => {
  const params=new URLSearchParams(location.search);
  const valid=!params.has('place-test') && params.get('mode')==='development' && params.get('auth')==='required';
  if(performance.getEntriesByType('navigation')[0]?.type==='reload'){
    try{localStorage.removeItem('pinmap.auth.v1');}catch{}
    window.top.location.replace('auth.html?screen=welcome');return;
  }
  if(window.self===window.top){location.replace(valid?'index.html':'auth.html?screen=welcome');return;}
  if(!valid){
    document.documentElement.style.visibility='hidden';
    window.top.location.replace('auth.html?screen=welcome');
  } else {
    document.documentElement.classList.add('auth-pending');
  }
})();
