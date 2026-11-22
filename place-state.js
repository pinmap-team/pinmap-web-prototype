// A saved post can contain several independent places. Keep UI-only numeric
// content IDs out of persisted course and favorite references.
(function(root){
  const demoCoords={1:[37.5461,127.0434],4:[37.5441,127.0495],6:[37.5445,127.0374],8:[37.5490,127.0460],9:[37.7720,128.9470],13:[37.5447,127.0557]};
  const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const sourceId=item=>String(item.backendId??item.id);
  const key=(item,index=0)=>`place:${sourceId(item)}:${index}`;
  function forItem(item){
    if(!item||item.pending)return [];
    const locations=Array.isArray(item.mapLocations)&&item.mapLocations.length
      ?item.mapLocations : item.address&&(['맛집/카페','전시/팝업','여행'].includes(item.type)||item.contentKind==='place')
        ?[{name:item.title,address:item.address,coordinates:{lat:item.lat??demoCoords[item.id]?.[0],lng:item.lng??demoCoords[item.id]?.[1]}}]:[];
    return locations.map((loc,index)=>{
      const lat=loc?.coordinates?.lat,lng=loc?.coordinates?.lng;
      if(!valid(lat,lng))return null;
      const id=key(item,index);
      const image=typeof root.PinmapPlacePhotos?.preferredImage==='function'
        ?root.PinmapPlacePhotos.preferredImage(loc,item.photo):item.photo;
      return {id,placeId:id,backendId:id,sourceBackendId:item.backendId,sourceId:item.id,
        sourceItem:item,locationIndex:index,title:loc.name||item.title,address:loc.address||item.address||'',
        lat,lng,photo:image||item.photo||'',art:item.art,type:item.type,category:item.category,
        desc:item.desc,memo:item.memo,savedAt:item.savedAt,ago:item.ago,
        favorite:Array.isArray(item.placeFavorites)&&item.placeFavorites.includes(id),
        onFavoriteChange(value){
          const previous=new Set(item.placeFavorites||[]);
          if(value)previous.add(id);else previous.delete(id);
          item.placeFavorites=[...previous];
        }};
    }).filter(Boolean);
  }
  const all=items=>(Array.isArray(items)?items:[]).flatMap(forItem);
  const legacyKey=(items,id)=>forItem((Array.isArray(items)?items:[]).find(item=>item.id===id))[0]?.id||null;
  root.PinmapPlaces={all,forItem,key,legacyKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapPlaces;
})(typeof window!=='undefined'?window:globalThis);
