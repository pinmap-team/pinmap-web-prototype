/* Shared data contracts. Account metadata contains preferences and course references,
   never entitlement, authorization, content copies or temporary numeric UI IDs. */
(function(root){
  const PinmapPlaces=root.PinmapPlaces||(typeof require==='function'?require('./place-state.js'):null);
  const text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
  const list=(v,n=100)=>[...new Set((Array.isArray(v)?v:[]).filter(x=>typeof x==='string').map(x=>text(x)).filter(Boolean))].slice(0,n);
  const defaults={notiDeadline:false,notiNearby:false,notiReminder:false,aiDefault:false,push:false,locPerm:'none',readNoti:[],places:[],recentPlaces:[],placeLabels:{},placeDetails:{},selectedPlace:null};
  function normalize(value){
    const v=value&&typeof value==='object'?value:{},s=v.settings||{};
    const settings={...defaults};
    for(const key of ['notiDeadline','notiNearby','notiReminder','aiDefault','push'])settings[key]=s[key]===true;
    settings.locPerm=['none','using','always'].includes(s.locPerm)?s.locPerm:'none';
    settings.places=list(s.places);settings.recentPlaces=list(s.recentPlaces,5);settings.readNoti=list(s.readNoti,500);
    settings.placeLabels=Object.create(null);settings.placeDetails=Object.create(null);
    for(const name of settings.places){
      const label=s.placeLabels?.[name];if(typeof label==='string')settings.placeLabels[name]=text(label,24);
      const d=s.placeDetails?.[name];if(d&&typeof d==='object'){
        const detail={address:text(d.address),memo:text(d.memo,300)};
        if(Number.isFinite(d.lat)&&Math.abs(d.lat)<=90&&Number.isFinite(d.lng)&&Math.abs(d.lng)<=180)Object.assign(detail,{lat:d.lat,lng:d.lng});
        settings.placeDetails[name]=detail;
      }
    }
    settings.selectedPlace=settings.places.includes(s.selectedPlace)?s.selectedPlace:null;
    return {settings,preferences:list(v.preferences,24),appearance:['light','dark','system'].includes(v.appearance)?v.appearance:'system'};
  }
  function encodeCourses(courses,items){
    const places=PinmapPlaces.all(items),byId=new Map(places.map(place=>[place.id,place]));
    return courses.map(course=>({id:course.id,title:text(course.title,50),date:course.date,days:course.days.map(day=>day.map(stop=>{
      const placeId=stop.placeId||byId.get(stop.id)?.id||PinmapPlaces.legacyKey(items,stop.id);
      if(typeof placeId!=='string'||!placeId.startsWith('place:')||placeId.length>200)throw Error('코스의 저장 장소를 확인해 주세요.');
      return {placeId,time:stop.time};
    }))}));
  }
  function decodeCourses(value,items){
    return (Array.isArray(value)?value:[]).slice(0,100).filter(c=>c&&typeof c.id==='string'&&typeof c.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.date)&&Number.isFinite(Date.parse(c.date))&&Array.isArray(c.days)).map(c=>{
      const seen=new Set();
      return {id:text(c.id,100),title:text(c.title,50),date:c.date,days:[c.days.flat().map(s=>{
        const legacyItem=typeof s?.contentId==='string'?items.find(item=>String(item.backendId)===s.contentId):null;
        const legacy=legacyItem?PinmapPlaces.forItem(legacyItem)[0]?.id:typeof s?.contentId==='string'?`place:${s.contentId}:0`:null;
        return {...s,placeId:s?.placeId||legacy};
      }).filter(s=>s&&typeof s.placeId==='string'&&s.placeId.length<=200&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s.time)&&!seen.has(s.placeId)&&(seen.add(s.placeId),true)).slice(0,100).map(s=>({id:s.placeId,placeId:s.placeId,time:s.time}))]};
    });
  }
  function createStore(client,userId,isCurrent){
    let tail=Promise.resolve();
    const write=patch=>{
      const task=tail.catch(()=>{}).then(async()=>{
        if(!isCurrent())throw Error('계정이 변경됐어요.');
        const {data,error}=await client.auth.getUser();
        if(error||data?.user?.id!==userId||!isCurrent())throw Error('로그인 계정을 다시 확인해 주세요.');
        const result=await client.auth.updateUser({data:patch});
        if(result.error)throw result.error;
        if(!isCurrent()||result.data?.user?.id!==userId)throw Error('계정이 변경됐어요.');
        return result.data.user;
      });
      tail=task;return task;
    };
    return {write,flush:()=>tail};
  }
  root.PinmapUserState={normalize,encodeCourses,decodeCourses,createStore};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapUserState;
})(typeof window!=='undefined'?window:globalThis);
