/* Small, non-sensitive organization preferences stored in the signed-in user's
   Supabase metadata. Content and extraction results stay in the content database. */
(function(root){
  function normalize(value){
    const names=Array.isArray(value?.names)?[...new Set(value.names.filter(x=>typeof x==='string'&&x.trim()&&x.length<=20))].slice(0,100):[];
    const assignments=Object.create(null);
    if(value?.assignments&&typeof value.assignments==='object'){
      for(const [id,name] of Object.entries(value.assignments).slice(0,100)){
        if(id.length<=200&&names.includes(name))assignments[id]=name;
      }
    }
    return {names,assignments};
  }
  function change(value,operation,records){
    const state=normalize(value);
    const ids=new Set(records.map(x=>String(x.backendId)));
    for(const id of Object.keys(state.assignments))if(!ids.has(id))delete state.assignments[id];
    const name=String(operation.name||'').trim().replace(/\s+/g,' ');
    if(!name||name.length>20)throw Error('폴더 이름은 1~20자로 입력해 주세요.');
    if(operation.type==='create'){
      if(state.names.includes(name))throw Error('같은 이름의 폴더가 이미 있어요.');
      if(state.names.length>=100)throw Error('폴더는 100개까지 만들 수 있어요.');
      state.names.push(name);
    }else{
      if(!state.names.includes(name))throw Error('폴더를 찾지 못했어요. 목록을 새로고침해 주세요.');
      if(operation.type==='remove')state.names=state.names.filter(x=>x!==name);
      else if(operation.type!=='assign')throw Error('폴더 변경을 확인하지 못했어요.');
      const selected=new Set(operation.ids||[]);
      for(const record of records){
        const id=String(record.backendId);
        if(operation.type==='assign'&&selected.has(record.id))state.assignments[id]=name;
        else if(state.assignments[id]===name)delete state.assignments[id];
      }
    }
    return state;
  }
  root.PinmapFolders={normalize,change};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapFolders;
})(typeof window!=='undefined'?window:globalThis);
