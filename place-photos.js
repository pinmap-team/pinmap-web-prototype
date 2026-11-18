/* Google photo URLs live only in displayed DOM, never in items, storage or the database. */
(() => {
 const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
 const pending=new Map(),queue=[];let active=0,generation=0,sdk;
 const imageUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)googleusercontent\.com$/.test(u.hostname)?u.href:null;}catch{return null;}};
 const link=value=>{try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)google\.com$/.test(u.hostname)?u.href:null;}catch{return null;}};
 function markup(id,index,image,extra=''){
  const fallback=image||PM_ENV.placeholderImage;
  const needs=PM_ENV.requiresAuth&&uuid.test(id||'')&&Number.isInteger(index)&&index>=0&&index<40&&!/^data:image\/(?:jpeg|png|webp);base64,/.test(fallback);
  return `<figure class="pm-place-photo ${esc(extra)}"${needs?` data-pm-photo-id="${esc(id)}" data-pm-photo-index="${index}"`:''}><img src="${esc(fallback)}" alt=""><figcaption class="pm-photo-credit" hidden></figcaption></figure>`;
 }
 async function retrieve(id,index,epoch){
  const client=await PinmapAuth.ready();if(epoch!==generation)throw Error('account_changed');
  sdk=client;const {data}=await client.auth.getSession();if(!data?.session?.access_token)throw Error('signed_out');
  const r=await fetch('/api/content-photo',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({content_id:id,location_index:index}),cache:'no-store'});
  if(!r.ok)throw Error('photo_unavailable');return r.json();
 }
 function request(id,index){
  const key=generation+':'+id+':'+index;if(pending.has(key))return pending.get(key);
  const epoch=generation,promise=new Promise((resolve,reject)=>queue.push({id,index,epoch,resolve,reject}));
  pending.set(key,promise);promise.finally(()=>pending.delete(key)).catch(()=>{});pump();return promise;
 }
 function pump(){while(active<3&&queue.length){const job=queue.shift();active++;retrieve(job.id,job.index,job.epoch).then(job.resolve,job.reject).finally(()=>{active--;pump();});}}
 async function hydrate(node){
  if(node.dataset.pmPhotoStarted||!node.isConnected)return;node.dataset.pmPhotoStarted='1';observer?.unobserve(node);
  const epoch=generation,id=node.dataset.pmPhotoId,index=Number(node.dataset.pmPhotoIndex);
  try{
   const photo=await request(id,index);if(epoch!==generation||!node.isConnected)return;
   const url=photo.source==='post'&&/^data:image\/(jpeg|png|webp);base64,/.test(photo.url)?photo.url:imageUrl(photo.url);
   if(!url)return;
   const img=node.querySelector('img'),credit=node.querySelector('figcaption');
   img.onerror=()=>{img.onerror=null;img.src=PM_ENV.placeholderImage;credit.hidden=true;};
   img.src=url;
   if(photo.source==='google'){
    credit.replaceChildren();const source=document.createElement('a');source.textContent='Google Maps';source.href=link(photo.google_maps_uri)||'https://www.google.com/maps/';source.target='_blank';source.rel='noopener noreferrer';credit.append(source);
    for(const author of photo.attributions||[]){if(typeof author.name!=='string')continue;credit.append(document.createTextNode(' · '));const a=document.createElement(link(author.uri)?'a':'span');a.textContent=author.name;if(a.tagName==='A'){a.href=link(author.uri);a.target='_blank';a.rel='noopener noreferrer';}credit.append(a);}
    credit.hidden=false;
   }
  }catch{/* Keep the existing neutral placeholder and allow retry after the next render. */}
 }
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)hydrate(e.target);},{rootMargin:'80px'}):null;
 function scan(){for(const node of document.querySelectorAll('[data-pm-photo-id]:not([data-pm-photo-started])')){if(observer)observer.observe(node);else hydrate(node);}}
 let frame=0;new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;scan();});}).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',event=>{if(event.target.closest('.pm-photo-credit'))event.stopPropagation();},true);
 window.addEventListener('pinmap:account-cleared',()=>{generation++;for(const job of queue.splice(0))job.reject(Error('signed_out'));pending.clear();});
 window.PinmapPlacePhotos={markup,scan};scan();
})();
