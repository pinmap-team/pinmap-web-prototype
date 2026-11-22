// Both previews use the same place-level favorite action.
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
  const pending = new Set();
  function toggle(item){
    if (!item) return null;
    const key = String(item.backendId ?? item.id);
    if (pending.has(key)) return null;
    const favorite = !item.favorite;
    item.favorite = favorite;
    item.onFavoriteChange?.(favorite);
    if (!persist) {
      if (typeof afterChange === 'function') afterChange();
      return favorite;
    }
    pending.add(key);
    Promise.resolve().then(() => persist(item, favorite)).catch(error => {
      if (item.favorite === favorite) { item.favorite = !favorite; item.onFavoriteChange?.(!favorite); }
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
    keys.forEach(key=>pending.add(key));
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
  root.PinmapFavorites = {normalize,change,toggle,removeMany,connect:fn => {persist=fn;},connectMany:fn => {persistMany=fn;}};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PinmapFavorites;
})(typeof window !== 'undefined' ? window : globalThis);
