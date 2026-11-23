/* One supported screen registry for the authenticated account app. This is UI
   routing, not authorization: account and billing APIs still verify users. */
(function(root){
  const screens=new Set(['home','map','library','my','calendar','topic','profile','courses','course',
    'interestset','notiset','saveset','themeset','favorites','appinfo','faq','notice','terms','guide','howtopage','account','calexport','calsettings','calweek','billing',
    'addresses','addressedit','addressmanage','addresssearch','addressconfirm','myaddresses','myaddressedit','myaddressmanage','myaddresssearch','myaddressconfirm']);
  const aliases={placeset:'myaddresses',accountaccess:'account'};
  const retired=new Set(['snsdemo','sample','pushdemo','pushallow','pushdeny','localways','nearbyon','location','allow','later','resetdata','accounts','accadd','accsync']);
  function resolve(value,pages){
    const key=Object.hasOwn(aliases,value)?aliases[value]:value;
    return screens.has(key)&&Object.hasOwn(pages,key)&&typeof pages[key]==='function'?key:'home';
  }
  root.PinmapScreenPolicy=Object.freeze({resolve,allowsAction:name=>typeof name==='string'&&!retired.has(name),screens:Object.freeze([...screens])});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapScreenPolicy;
})(typeof window!=='undefined'?window:globalThis);
