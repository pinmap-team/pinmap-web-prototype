// A saved post can contain several independent places. Keep UI-only numeric
// content IDs out of persisted course and favorite references.
(function(root){
  const demoCoords={1:[37.5461,127.0434],4:[37.5441,127.0495],6:[37.5445,127.0374],8:[37.5490,127.0460],9:[37.7720,128.9470],13:[37.5447,127.0557]};
  const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const sourceId=item=>String(item.backendId??item.id);
  const key=(item,index=0)=>`place:${sourceId(item)}:${index}`;
  // Extracted rows and map locations can have different orders, and some rows
  // have no verified coordinates at all.
  function matchExtracted(places,locations){
    const mapped=places.filter(place=>place.hasCoordinates).length,used=new Set(),indexes=places.map(()=>-1);
    const clean=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
    for(const rule of ['both','name','address']){
      places.forEach((place,placeIndex)=>{
        if(indexes[placeIndex]>=0)return;
        const name=clean(place.name),address=clean(place.address);
        const index=locations.findIndex((loc,i)=>!used.has(i)&&(
          rule==='both'?name&&address&&clean(loc.name)===name&&clean(loc.address)===address:
          rule==='name'?name&&clean(loc.name)===name:
          address&&clean(loc.address)===address));
        if(index>=0){indexes[placeIndex]=index;used.add(index);}
      });
    }
    if(locations.length===mapped||locations.length===places.length){
      let order=0;
      places.forEach((place,placeIndex)=>{
        if(locations.length!==places.length&&!place.hasCoordinates)return;
        if(indexes[placeIndex]<0&&!used.has(order)){indexes[placeIndex]=order;used.add(order);}
        order++;
      });
      const remaining=places.map((place,i)=>(locations.length===places.length||place.hasCoordinates)&&indexes[i]<0?i:-1).filter(i=>i>=0);
      const unused=locations.map((_,i)=>used.has(i)?-1:i).filter(i=>i>=0);
      if(remaining.length===1&&unused.length===1)indexes[remaining[0]]=unused[0];
    }
    return indexes;
  }
  const onFavoriteChange=(item,id)=>value=>{
    const previous=new Set(item.placeFavorites||[]);
    if(value)previous.add(id);else previous.delete(id);
    item.placeFavorites=[...previous];
  };
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
        onFavoriteChange:onFavoriteChange(item,id)};
    }).filter(Boolean);
  }
  function forExtracted(item){
    if(!item)return [];
    const rows=Array.isArray(item.extractionPlaces)?item.extractionPlaces:[];
    const locations=Array.isArray(item.mapLocations)?item.mapLocations:[];
    const indexes=matchExtracted(rows,locations);
    const located=new Map(forItem(item).map(place=>[place.locationIndex,place]));
    return rows.map((row,index)=>{
      const matched=located.get(indexes[index]);
      if(matched)return {...matched,extractionIndex:index};
      const id=`place:${sourceId(item)}:unlocated:${index}`;
      return {id,placeId:id,backendId:id,sourceBackendId:item.backendId,sourceId:item.id,
        sourceItem:item,locationIndex:-1,extractionIndex:index,unlocated:true,
        title:row.name||'이름 확인 필요',address:row.address||'',lat:null,lng:null,photo:'',
        art:item.art,type:item.type,category:item.category,desc:item.desc,memo:item.memo,
        savedAt:item.savedAt,ago:item.ago,
        favorite:Array.isArray(item.placeFavorites)&&item.placeFavorites.includes(id),
        onFavoriteChange:onFavoriteChange(item,id)};
    });
  }
  const all=items=>(Array.isArray(items)?items:[]).flatMap(forItem);
  const favorites=items=>(Array.isArray(items)?items:[]).flatMap(item=>{
    const entries=[...forExtracted(item),...forItem(item)];
    return [...new Map(entries.map(place=>[place.id,place])).values()].filter(place=>place.favorite);
  });
  const legacyKey=(items,id)=>forItem((Array.isArray(items)?items:[]).find(item=>item.id===id))[0]?.id||null;
  root.PinmapPlaces={all,forItem,forExtracted,matchExtracted,favorites,key,legacyKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapPlaces;
})(typeof window!=='undefined'?window:globalThis);
