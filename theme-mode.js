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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111111':'#F4F4F5');
    document.querySelectorAll('[data-theme-label]').forEach(el=>el.textContent=labels[mode]);
    document.querySelectorAll('[data-theme-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeChoice===mode)));
    window.dispatchEvent(new CustomEvent('pinmap:theme-changed',{detail:{theme,mode}}));
  }
  function set(value){
    if(!Object.hasOwn(labels,value))return;
    mode=value;
    try { localStorage.setItem(key,mode); } catch {}
    apply();
  }
  window.PinmapTheme={set,get mode(){return mode;},label:()=>labels[mode],show(){
    modal('화면 모드',`<p class="muted">편하게 볼 수 있는 화면을 선택해 주세요.</p><div class="pm-theme-options" role="group" aria-label="화면 모드">${Object.entries(labels).map(([value,label])=>`<button type="button" data-theme-choice="${value}" aria-pressed="${mode===value}">${label}</button>`).join('')}</div><p class="hint">기기 설정을 선택하면 기기의 밝은 화면·어두운 화면 설정을 따라가요.</p>`);
  }};
  document.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button)set(button.dataset.themeChoice);});
  media.addEventListener('change',()=>{if(mode==='system')apply();});
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){mode=Object.hasOwn(labels,event.newValue)?event.newValue:'system';apply();}});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  apply();
})();
