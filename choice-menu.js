// Keep the existing select values and change handlers; replace only their UI.
(() => {
  const categoryIcons = {'맛집/카페':'coffee','전시/팝업':'ticket','여행':'plane','쇼핑':'bag','레시피':'chef','생활 정보':'note','기타':'bookmark',ai:'spark'};
  const sortIcons = {recent:'clock',old:'clock',near:'pin',new:'clock',name:'text','name-desc':'text',saved:'bookmark'};
  function closeMenus(except){
    document.querySelectorAll('.pm-choice.is-open').forEach(host => {
      if(host === except)return;
      host.classList.remove('is-open');
      host.querySelector('.pm-choice-trigger').setAttribute('aria-expanded','false');
      host.querySelector('.pm-choice-options').hidden=true;
    });
  }
  let panelId=0;
  function enhance(){
    document.querySelectorAll('#app select:not([multiple]), #sheet select:not([multiple])').forEach(select => {
      let host=select.parentElement;
      const fieldName=select.getAttribute('aria-label') || select.labels?.[0]?.querySelector('span')?.textContent.trim() || '항목';
      if(!host.matches('.esselect,.libsort,.pm-choice')){
        const wrapper=document.createElement('span');wrapper.className='pm-choice-field';select.before(wrapper);wrapper.append(select);host=wrapper;
      }
      if(host.classList.contains('pm-choice'))return;
      const isSort=select.hasAttribute('data-libsort')||select.hasAttribute('data-folder-sort');
      host.classList.add('pm-choice');
      select.hidden=true;
      [...host.children].filter(el=>el!==select).forEach(el=>el.remove());
      const trigger=document.createElement('button');
      trigger.type='button';trigger.className='pm-choice-trigger';
      trigger.setAttribute('aria-expanded','false');
      trigger.disabled=select.disabled;
      const panel=document.createElement('div');
      panel.className='pm-choice-options';panel.hidden=true;
      panel.id='pm-choice-panel-'+(++panelId);trigger.setAttribute('aria-controls',panel.id);
      panel.setAttribute('role','group');panel.setAttribute('aria-label',isSort?'정렬 선택':(/선택$/.test(fieldName)?fieldName:fieldName+' 선택'));
      // 2026-11-10 정렬 선택은 앞 픽토그램 없이 글자만(카테고리 선택은 그대로)
      const iconFor=option=>isSort?'':icon(option.dataset.icon || categoryIcons[option.value] || 'grid');
      if(isSort)host.classList.add('pm-choice-sort');
      const update=()=>{
        const selected=select.selectedOptions[0];if(!selected)return;
        trigger.innerHTML=iconFor(selected)+'<span></span>'+icon('chevron');
        trigger.querySelector('span').textContent=selected.textContent;
        trigger.setAttribute('aria-label',(isSort?'정렬: ':fieldName+': ')+selected.textContent);
        panel.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(select.options[i].selected)));
      };
      let previousGroup=null;
      [...select.options].forEach(option=>{
        const group=option.parentElement.tagName==='OPTGROUP'?option.parentElement:null;
        if(group && group!==previousGroup){
          const heading=document.createElement('div');heading.className='pm-choice-group';heading.textContent=group.label;panel.append(heading);
        }
        previousGroup=group;
        const button=document.createElement('button');button.type='button';
        button.innerHTML=iconFor(option)+'<span></span>'+icon('check');
        button.querySelector('span').textContent=option.textContent;
        button.disabled=option.disabled || option.parentElement.disabled===true;
        button.addEventListener('click',event=>{
          event.preventDefault();select.value=option.value;update();closeMenus();trigger.focus();
          select.dispatchEvent(new Event('change',{bubbles:true}));
        });
        panel.append(button);
      });
      const positionPanel=()=>{
        const rect=trigger.getBoundingClientRect(),bounds=host.closest('dialog')?.getBoundingClientRect();
        const below=Math.min(innerHeight,bounds?.bottom??innerHeight)-rect.bottom;
        const above=rect.top-Math.max(0,bounds?.top??0);
        const upwards=below<Math.min(panel.scrollHeight,320)+16 && above>below;
        host.classList.toggle('opens-up',upwards);
        panel.style.maxHeight=Math.max(96,Math.min(320,(upwards?above:below)-16))+'px';
      };
      trigger.addEventListener('click',event=>{
        event.preventDefault();const open=!host.classList.contains('is-open');closeMenus(host);
        host.classList.toggle('is-open',open);panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
        if(open)positionPanel();
      });
      host.addEventListener('keydown',event=>{
        const buttons=[...panel.querySelectorAll('button:not(:disabled)')];
        if(event.key==='Escape'){event.preventDefault();closeMenus();trigger.focus();}
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();host.classList.add('is-open');panel.hidden=false;trigger.setAttribute('aria-expanded','true');positionPanel();
          const index=buttons.indexOf(document.activeElement);
          const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(index+1)%buttons.length:(index-1+buttons.length)%buttons.length;
          buttons[next]?.focus();
        }
      });
      // Safari may blur the trigger without focusing a pointer-clicked option.
      // Do not hide that option before its click; outside clicks are handled below.
      host.addEventListener('focusout',event=>{
        if(event.relatedTarget && !host.contains(event.relatedTarget))closeMenus();
      });
      select.addEventListener('change',update);
      host.append(trigger,panel);update();
    });
  }
  document.addEventListener('click',event=>{if(!event.target.closest('.pm-choice'))closeMenus();});
  for(const id of ['app','sheet']){const root=document.getElementById(id);if(root)new MutationObserver(enhance).observe(root,{childList:true,subtree:true});}
  enhance();
})();
