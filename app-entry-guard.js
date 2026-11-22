/* Only the authenticated account app may load this bundle. */
(() => {
  const params=new URLSearchParams(location.search);
  const valid=!params.has('place-test') && params.get('mode')==='development' && params.get('auth')==='required';
  if(window.self===window.top){location.replace(valid?'index.html':'auth.html?screen=welcome');return;}
  if(!valid){
    document.documentElement.style.visibility='hidden';
    window.top.location.replace('auth.html?screen=welcome');
  } else {
    document.documentElement.classList.add('auth-pending');
  }
})();
