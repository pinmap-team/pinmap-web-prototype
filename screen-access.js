/* Guard old controls even when an outdated embed or cached page supplies them. */
(() => {
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');
    if(button&&!PinmapScreenPolicy.allowsAction(button.dataset.action)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  const retiredForms=new Set(['accform','pm-newform','profileform','place-label-form','lm-pin-form']);
  document.addEventListener('submit',event=>{
    if(retiredForms.has(event.target.id)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  actions.placesheet=actions.placesheetmy=()=>actions.myaddresses();
  // Retired routes are not registered, even though old parent-tab labels may exist.
  delete pages.placeset;delete pages.accountaccess;
})();
