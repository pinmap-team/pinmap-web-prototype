/* Shared asynchronous button state. Keeps the original disabled state and label. */
(function(root){
  const pending=new WeakMap();
  async function run(button,task,label='처리 중'){
    if(button&&(button.disabled||button.getAttribute('aria-disabled')==='true'||pending.has(button)))return;
    if(!button)return task();
    const original={disabled:button.disabled,label:button.getAttribute('aria-label')};
    pending.set(button,original);
    button.disabled=true;button.setAttribute('aria-busy','true');button.setAttribute('aria-label',label);
    try{return await task();}
    finally{
      pending.delete(button);button.disabled=original.disabled;button.removeAttribute('aria-busy');
      if(original.label===null)button.removeAttribute('aria-label');else button.setAttribute('aria-label',original.label);
    }
  }
  root.PinmapButton={run};
  if(typeof module!=='undefined'&&module.exports)module.exports={run};
})(typeof window!=='undefined'?window:globalThis);
