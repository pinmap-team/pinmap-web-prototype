/* Retired development previews never reach the application bundle, including
   direct iframe links. Keep OAuth callbacks owned by entry-router/auth.html. */
(() => {
  const params=new URLSearchParams(location.search);
  const valid=!params.has('place-test') && (params.get('mode')==='prototype' ||
    (params.get('mode')==='development'&&params.get('auth')==='required'));
  if(window.self===window.top){location.replace('index.html'+location.search+location.hash);return;}
  if(!valid){
    document.documentElement.style.visibility='hidden';
    location.replace('entry.html');
  }
})();
