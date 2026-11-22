// Both previews share favorite actions; record IDs identify posts and place IDs identify places.
(function(root){
  const normalize = value => [...new Set((Array.isArray(value) ? value : [])
    .filter(id => (typeof id === 'string' || typeof id === 'number') && String(id).length <= 200)
    .map(String))].slice(0, 500);
  const change = (value, id, favorite) => {
    const next = normalize(value).filter(entry => entry !== String(id));
    if (favorite) next.push(String(id));
    return next.slice(-500);
  };
  let persist = null;
  let persistMany = null;
  const pending = new Map();
  function toggle(item){
    if (!item) return null;
    const key = String(item.backendId ?? item.id);
    if(pending.get(key)?.batch)return null;
    const favorite = !item.favorite;
    item.favorite = favorite;
    item.onFavoriteChange?.(favorite);
    if (!persist) {
      if (typeof afterChange === 'function') afterChange();
      return favorite;
    }
    const existing=pending.get(key);
    if(existing){existing.desired=favorite;existing.item=item;return favorite;}
    const state={desired:favorite,confirmed:!favorite,item};
    pending.set(key,state);
    Promise.resolve().then(async()=>{
      while(true){
        const target=state.desired;
        await persist(state.item,target);
        state.confirmed=target;
        if(state.desired===target)break;
      }
    }).catch(error => {
      state.item.favorite=state.confirmed;
      state.item.onFavoriteChange?.(state.confirmed);
      root.render?.();
      root.toast?.(error.message || '즐겨찾기를 저장하지 못했어요.');
    }).finally(() => pending.delete(key));
    return favorite;
  }
  async function removeMany(items){
    const chosen=[...new Map(items.filter(item=>item?.favorite).map(item=>[String(item.backendId ?? item.id),item])).values()];
    if (!chosen.length) return 0;
    const keys=chosen.map(item=>String(item.backendId ?? item.id));
    if (keys.some(key=>pending.has(key))) throw Error('즐겨찾기 변경을 마친 뒤 다시 시도해 주세요.');
    keys.forEach(key=>pending.set(key,{desired:false,batch:true}));
    chosen.forEach(item=>{item.favorite=false;item.onFavoriteChange?.(false);});
    try {
      if (persistMany) await persistMany(chosen);
      else if (persist) for (const item of chosen) await persist(item,false);
      else if (typeof afterChange === 'function') afterChange();
      return chosen.length;
    } catch(error) {
      chosen.forEach(item=>{item.favorite=true;item.onFavoriteChange?.(true);});
      root.render?.();
      throw error;
    } finally { keys.forEach(key=>pending.delete(key)); }
  }
  root.PinmapFavorites = {normalize,change,toggle,removeMany,pendingChanges:()=>[...pending].map(([key,state])=>[key,state.desired]),connect:fn => {persist=fn;},connectMany:fn => {persistMany=fn;}};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PinmapFavorites;
})(typeof window !== 'undefined' ? window : globalThis);
