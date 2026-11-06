/* Apply before paint; this preference is shared by the entry and app frames. */
(() => {
  const key='pinmap-appearance', labels={system:'기기 설정',light:'라이트',dark:'다크'};
  const media=matchMedia('(prefers-color-scheme: dark)');
  let mode='system', previewMode=null;
  const resolved=value=>value==='system'?(media.matches?'dark':'light'):value;
  function updatePreview(){
    const chosen=previewMode??mode;
    document.querySelectorAll('.pm-theme-preview').forEach(el=>el.dataset.theme=resolved(chosen));
    document.querySelectorAll('[data-theme-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeChoice===chosen)));
  }
  try { const saved=localStorage.getItem(key); if(Object.hasOwn(labels,saved))mode=saved; } catch {}
  function apply(){
    const theme=mode==='system'?(media.matches?'dark':'light'):mode;
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#111111':'#F4F4F5');
    document.querySelectorAll('[data-theme-label]').forEach(el=>el.textContent=labels[mode]);
    document.querySelectorAll('[data-theme-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeChoice===mode)));
    updatePreview();
    window.dispatchEvent(new CustomEvent('pinmap:theme-changed',{detail:{theme,mode}}));
  }
  function set(value){
    if(!Object.hasOwn(labels,value))return;
    mode=value;
    try { localStorage.setItem(key,mode); } catch {}
    apply();
  }
  window.PinmapTheme={set,beginPreview(){if(previewMode===null)previewMode=mode;},preview(value){if(Object.hasOwn(labels,value)){previewMode=value;updatePreview();}},commitPreview(){if(previewMode===null)return;const value=previewMode;previewMode=null;set(value);},get mode(){return mode;},label:()=>labels[mode],show(){
    modal('화면 모드',`<section class="mycard settings"><p class="muted">편하게 볼 수 있는 화면을 선택해 주세요.</p><div class="pm-theme-options" role="group" aria-label="화면 모드">${Object.entries(labels).map(([value,label])=>`<button type="button" data-theme-choice="${value}" aria-pressed="${(previewMode??mode)===value}">${label}</button>`).join('')}</div><p class="hint">기기 설정을 선택하면 기기의 밝은 화면/어두운 화면 설정을 따라가요.</p>
      <div class="pm-theme-preview" data-theme="${resolved(previewMode??mode)}" role="img" aria-label="선택한 화면 모드의 핀맵 홈 미리보기">
        <div class="pm-preview-header"><b>Pinmap</b><span aria-hidden="true">${icon('search')}${icon('bell')}</span></div>
        <div class="pm-preview-card"><img src="img/cafe.jpg" alt=""><div><b>다시 꺼내 보고 싶은 순간</b><small>좋아하는 장소를 모아 보세요</small></div></div>
        <div class="pm-preview-list"><b>최근 저장한 목록</b><div><i aria-hidden="true">${icon('bookmark')}</i><span><b>마음에 드는 카페</b><small>오늘 저장</small></span></div></div>
        <div class="pm-preview-nav" aria-hidden="true">${icon('home')}${icon('map')}${icon('bookmark')}${icon('user')}</div>
      </div></section>`);
  }};
  document.addEventListener('click',event=>{const button=event.target.closest('[data-theme-choice]');if(button){if(button.closest('.themepage'))window.PinmapTheme.preview(button.dataset.themeChoice);else set(button.dataset.themeChoice);}});
  media.addEventListener('change',()=>{if(mode==='system')apply();});
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){mode=Object.hasOwn(labels,event.newValue)?event.newValue:'system';apply();}});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  apply();
})();
