// Search only fields that belong to a saved content item.
const PinmapContentSearch = (() => {
  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();
  const fields = item => {
    const placeFields = place => [place?.name, place?.address, place?.area_hint];
    const eventFields = event => [event?.title, event?.venue_name, event?.address];
    return [item.title, item.desc, item.summary, item.searchSummary, item.type, item.category,
      item.collection, item.memo, item.address, item.mapQuery, item.shop,
      ...(Array.isArray(item.extractionPlaces) ? item.extractionPlaces.flatMap(placeFields) : []),
      ...(Array.isArray(item.places) ? item.places.flatMap(placeFields) : []),
      ...(Array.isArray(item.mapLocations) ? item.mapLocations.flatMap(placeFields) : []),
      ...(Array.isArray(item.events) ? item.events.flatMap(eventFields) : [])];
  };
  function matches(item, query, extra = []) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const text = [...fields(item), ...extra].map(normalize).filter(Boolean).join(' ');
    return words.every(word => text.includes(word));
  }
  return {matches};
})();
if (typeof module === 'object' && module.exports) module.exports = PinmapContentSearch;
