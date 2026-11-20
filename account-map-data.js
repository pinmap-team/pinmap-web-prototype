// Small user-created map records and edits are stored separately from the
// trusted Instagram extraction result. IDs remain stable across page loads.
(function(root){
  const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  const coords=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function normalizePins(value){
    if(!Array.isArray(value))return [];
    const seen=new Set(),pins=[];
    for(const raw of value.slice(0,50)){
      if(!raw||!idPattern.test(raw.id||'')||seen.has(raw.id))continue;
      const title=text(raw.title,80),address=text(raw.address,200),type=text(raw.type,40);
      if(!title||!type||!coords(raw.lat,raw.lng))continue;
      seen.add(raw.id);
      pins.push({id:raw.id,title,address,type,memo:text(raw.memo,300),lat:raw.lat,lng:raw.lng,
        savedAt:Number.isFinite(Date.parse(raw.savedAt))?raw.savedAt:new Date().toISOString()});
    }
    return pins;
  }
  function normalizeEdits(value){
    const result=Object.create(null);
    if(!value||typeof value!=='object'||Array.isArray(value))return result;
    for(const [id,raw] of Object.entries(value).slice(0,100)){
      if(!id||id.length>200||!raw||typeof raw!=='object')continue;
      const title=text(raw.title,50),address=text(raw.address,200),type=text(raw.type,40),category=text(raw.category,40);
      if(!title||!type||!category)continue;
      result[id]={title,address,type,category,
        ...(coords(raw.lat,raw.lng)?{lat:raw.lat,lng:raw.lng}:{})};
    }
    return result;
  }
  function manualItem(pin,id){
    return {id,backendId:'manual:'+pin.id,manualId:pin.id,title:pin.title,address:pin.address,
      type:pin.type,category:pin.type==='맛집/카페'?'카페':pin.type==='전시/팝업'?'전시':pin.type,
      source:'직접 추가',savedAt:pin.savedAt,desc:'',memo:pin.memo,manualMemo:pin.memo,
      art:pin.type==='전시/팝업'?'exhibit':'cafe',lat:pin.lat,lng:pin.lng,
      mapKind:pin.type==='전시/팝업'?'event':pin.type==='여행'?'walk':'cafe',
      contentKind:'place',pending:false,aiClassified:false,
      mapLocations:[{name:pin.title,address:pin.address,coordinates:{lat:pin.lat,lng:pin.lng},review_required:false}]};
  }
  function applyEdit(item,edit){
    if(!edit)return item;
    const addressChanged=edit.address!==item.address;
    Object.assign(item,{title:edit.title,address:edit.address,type:edit.type,category:edit.category,
      folderCategory:edit.category,
      aiClassified:false,pending:addressChanged?(!edit.address||!coords(edit.lat,edit.lng)):item.pending,
      mapKind:edit.type==='전시/팝업'?'event':edit.type==='여행'?'walk':'cafe'});
    if(!addressChanged)return item;
    if(coords(edit.lat,edit.lng)){
      item.lat=edit.lat;item.lng=edit.lng;
      const first=item.mapLocations?.[0]||{};
      item.mapLocations=[{...first,name:edit.title,address:edit.address,
        coordinates:{lat:edit.lat,lng:edit.lng},review_required:true},...(item.mapLocations||[]).slice(1)];
    }else{
      delete item.lat;delete item.lng;
      item.mapLocations=(item.mapLocations||[]).slice(1);
    }
    return item;
  }
  root.PinmapAccountMapData={normalizePins,normalizeEdits,manualItem,applyEdit,coords};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PinmapAccountMapData;
})(typeof window!=='undefined'?window:globalThis);
