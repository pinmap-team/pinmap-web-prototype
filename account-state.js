/* Account adapter for settings, onboarding and courses. */
if(PM_ENV.requiresAuth)(()=>{
  let userId=null,store=null,version=0,pending=0,confirmed=null,courses=[],courseOwner=null,revision=0;
  let lastRequested=null,appearanceApplying=false;
  const snapshot=()=>PinmapUserState.normalize({settings,preferences,appearance:PinmapTheme.mode,onboardingDone:onboardDone});
  function apply(value){
    const v=PinmapUserState.normalize(value);
    Object.assign(settings,v.settings);
    preferences=v.preferences.map(id=>PinmapCategories.get(id)?.id).filter(Boolean);homeViewIds=null;
    onboardDone=v.onboardingDone;
    appearanceApplying=true;try{PinmapTheme.set(v.appearance);}finally{appearanceApplying=false;}
    window.PinmapLocation?.restore?.(settings.selectedPlace);
  }
  function clear(){
    revision++;version++;userId=null;store=null;pending=0;confirmed=null;lastRequested=null;courses=[];courseOwner=null;
    apply(null);window.PinmapCourses?.restore([],null);
  }
  const service={
    clear,
    hydrate(user,client,readRevision=revision){
      if(userId===user.id&&readRevision!==revision)return;
      if(userId!==user.id){clear();userId=user.id;const owner=userId,epoch=version;store=PinmapUserState.createStore(client,owner,()=>owner===userId&&epoch===version);}
      if(pending)return;
      confirmed=PinmapUserState.normalize(user.user_metadata?.pinmap_preferences);lastRequested=JSON.stringify(confirmed);apply(confirmed);
      if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('pinmap:account-profile-loaded',{detail:{userId}}));
      courses=Array.isArray(user.user_metadata?.pinmap_courses)?user.user_metadata.pinmap_courses:[];courseOwner=userId;
    },
    resolveCourses(){window.PinmapCourses?.restore(courses,courseOwner);},
    async persist(){
      if(!store){toast('계정 설정을 불러온 뒤 다시 변경해 주세요.');return false;}
      const value=snapshot(),serialized=JSON.stringify(value),epoch=version;
      if(serialized===lastRequested){try{await store.flush();return epoch===version;}catch{return false;}}
      lastRequested=serialized;revision++;pending++;
      try{await store.write({pinmap_preferences:value});if(epoch!==version)return false;confirmed=value;return true;}
      catch(error){if(epoch===version&&lastRequested===serialized){lastRequested=JSON.stringify(confirmed);apply(confirmed);render();toast(error.message||'계정 설정을 저장하지 못했어요.');}return false;}
      finally{if(epoch===version)pending--;}
    },
    async saveCourses(next){
      if(!store||!window.PinmapAccountLoaded||window.PinmapAccountLoadError)throw Error('저장 목록을 불러온 뒤 코스를 저장해 주세요.');
      const records=PinmapUserState.encodeCourses(next,items),epoch=version;
      if(records.length>100||JSON.stringify(records).length>180000)throw Error('저장할 코스가 너무 많아요.');
      revision++;pending++;
      try{await store.write({pinmap_courses:records});if(epoch!==version)throw Error('계정이 변경됐어요.');courses=records;return true;}
      finally{if(epoch===version)pending--;}
    },
    get revision(){return revision;},get userId(){return userId;},flush:()=>store?.flush()
  };
  window.PinmapAccountState=service;
  window.addEventListener('pinmap:account-cleared',clear);
  window.addEventListener('pinmap:theme-changed',()=>{if(!appearanceApplying&&userId)void service.persist();});
})();
