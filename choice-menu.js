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
  function enhance(){
    document.querySelectorAll('.esselect select, select[data-libsort], select[data-folder-sort]').forEach(select => {
      const host=select.parentElement;
      if(host.classList.contains('pm-choice'))return;
      const isSort=select.hasAttribute('data-libsort')||select.hasAttribute('data-folder-sort');
      host.classList.add('pm-choice');
      select.hidden=true;
      [...host.children].filter(el=>el!==select).forEach(el=>el.remove());
      const trigger=document.createElement('button');
      trigger.type='button';trigger.className='pm-choice-trigger';
      trigger.setAttribute('aria-expanded','false');
      const panel=document.createElement('div');
      panel.className='pm-choice-options';panel.hidden=true;
      panel.setAttribute('role','group');panel.setAttribute('aria-label',isSort?'정렬 선택':'카테고리 선택');
      const iconFor=option=>icon(option.dataset.icon || (isSort?sortIcons:categoryIcons)[option.value] || 'grid');
      const update=()=>{
        const selected=select.selectedOptions[0];if(!selected)return;
        trigger.innerHTML=iconFor(selected)+'<span></span>'+icon('chevron');
        trigger.querySelector('span').textContent=selected.textContent;
        trigger.setAttribute('aria-label',(isSort?'정렬: ':'카테고리: ')+selected.textContent);
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
        button.disabled=option.disabled;
        button.addEventListener('click',event=>{
          event.preventDefault();select.value=option.value;update();closeMenus();trigger.focus();
          select.dispatchEvent(new Event('change',{bubbles:true}));
        });
        panel.append(button);
      });
      trigger.addEventListener('click',event=>{
        event.preventDefault();const open=!host.classList.contains('is-open');closeMenus(host);
        host.classList.toggle('is-open',open);panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
      });
      host.addEventListener('keydown',event=>{
        const buttons=[...panel.querySelectorAll('button:not(:disabled)')];
        if(event.key==='Escape'){event.preventDefault();closeMenus();trigger.focus();}
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();host.classList.add('is-open');panel.hidden=false;trigger.setAttribute('aria-expanded','true');
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
  new MutationObserver(enhance).observe(document.getElementById('app'),{childList:true,subtree:true});
  new MutationObserver(enhance).observe(document.getElementById('sheet'),{childList:true,subtree:true});
  enhance();
})();
