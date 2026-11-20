// Both previews use the same favorite action. The account adapter persists
// backend IDs to the signed-in user's metadata; the prototype uses its seed.
(function(root){
  const normalize = value => [...new Set((Array.isArray(value) ? value : [])
    .filter(id => (typeof id === 'string' || typeof id === 'number') && String(id).length <= 200)
    .map(String))].slice(0, 100);
  const change = (value, id, favorite) => {
    const next = normalize(value).filter(entry => entry !== String(id));
    if (favorite) next.push(String(id));
    return next.slice(-100);
  };
  let persist = null;
  const pending = new Set();
  function toggle(item){
    if (!item) return null;
    const key = String(item.backendId ?? item.id);
    if (pending.has(key)) return null;
    const favorite = !item.favorite;
    item.favorite = favorite;
    if (!persist) {
      if (typeof afterChange === 'function') afterChange();
      return favorite;
    }
    pending.add(key);
    Promise.resolve().then(() => persist(item, favorite)).catch(error => {
      if (item.favorite === favorite) item.favorite = !favorite;
      root.render?.();
      root.toast?.(error.message || '즐겨찾기를 저장하지 못했어요.');
    }).finally(() => pending.delete(key));
    return favorite;
  }
  root.PinmapFavorites = {normalize,change,toggle,connect:fn => {persist=fn;}};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PinmapFavorites;
})(typeof window !== 'undefined' ? window : globalThis);
