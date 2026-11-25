/* Apply before paint; this preference is shared by the entry and app frames. */
(() => {
  const key='pinmap-appearance', labels={system:'기기 설정',light:'라이트',dark:'다크'};
  const media=matchMedia('(prefers-color-scheme: dark)');
  let mode='system';
  try { const saved=localStorage.getItem(key); if(Object.hasOwn(labels,saved))mode=saved; } catch {}
  function apply(){
    const theme=mode==='system'?(media.matches?'dark':'light'):mode;
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#1E1E1E':'#F4F4F4');
    window.dispatchEvent(new CustomEvent('pinmap:theme-changed',{detail:{theme,mode}}));
  }
  function set(value){
    if(!Object.hasOwn(labels,value))return;
    mode=value;
    try { localStorage.setItem(key,mode); } catch {}
    apply();
  }
  window.PinmapTheme={set,get mode(){return mode;}};
  media.addEventListener('change',()=>{if(mode==='system')apply();});
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){mode=Object.hasOwn(labels,event.newValue)?event.newValue:'system';apply();}});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  apply();
})();
