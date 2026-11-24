// 지도에서 여는 단일 코스 편집 화면.
(() => {
  const storageKey=PM_ENV.development?'pinmap.dev.courses.v1':'pinmap-courses-v1';
  const draftKey=PM_ENV.development?'pinmap.dev.course-draft.v1':'pinmap-course-draft-v1';
  const stopColor=index => index%3===2?'#21c5ad':index%2===1?'#ed607c':'#a65ef2';
  const now=new Date();
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const newId=()=>crypto.randomUUID();
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
  const normalize=value=>{
    if(!value||!Array.isArray(value.days)||!value.days.length)return null;
    const seen=new Set();
    const stops=value.days.flatMap(day=>Array.isArray(day)?day:[]).map(stop=>({
      id:typeof stop?.placeId==='string'?stop.placeId:typeof stop?.id==='string'&&stop.id.startsWith('place:')?stop.id:PinmapPlaces.legacyKey(items,stop?.id),
      time:stop?.time
    })).filter(stop=>{
      if(!stop.id||!/^\d{2}:\d{2}$/.test(stop.time)||seen.has(stop.id))return false;
      seen.add(stop.id);return true;
    });
    return {
      id:typeof value.id==='string'?value.id:newId(),
      title:typeof value.title==='string'?value.title.slice(0,50):'새 코스',
      date:validDate(value.date)?value.date:today,
      days:[stops]
    };
  };
  let courses=[],course={id:newId(),title:'새 코스',date:today,days:[[]]},draft=null;
  let pickerOpen=false,courseMap=null,editing=false,courseOrigin='courses',pickRange='all',freshCourse=false; // 2026-11-10 지도에서 열면 뒤로가기는 지도로
  const thumbnailMaps=[];
  try {
    const stored=PM_ENV.development?null:localStorage.getItem(storageKey);
    if(stored!==null){const values=JSON.parse(stored);if(Array.isArray(values))courses=values.map(normalize).filter(Boolean);}
    else if(!PM_ENV.development) {
      const legacy=normalize(JSON.parse(localStorage.getItem('pinmap-course-v2')));
      if(legacy){courses=[legacy];localStorage.setItem(storageKey,JSON.stringify(courses));}
    }
  } catch {}
  let courseOwner=null,courseSaving=false;
  window.PinmapCourses={restore(records,owner){
    courses=PinmapUserState.decodeCourses(records,items);
    if(courseOwner!==owner){courseOwner=owner;draft=null;course={id:newId(),title:'새 코스',date:today,days:[[]]};editing=false;pickerOpen=false;}
  }};
  // Editing saves a recoverable draft; only the Save button updates the saved list.
  const save=()=>{draft=clone(course);if(PM_ENV.development)return true;try{localStorage.setItem(draftKey,JSON.stringify(draft));return true}catch{toast('임시 저장 공간을 확인해 주세요.');return false}};
  const openCourse=value=>{freshCourse=false;courseOrigin=page==='map'?'map':'courses';course=clone(value);pickerOpen=false;editing=false;save();go('course')};
  // 2026-11-10 지도에서 고른 핀이 있으면 그 장소로 코스를 시작하고, 새 코스는 이름 정하기부터 시작해요.
  window.startNewCourse=(ids=[])=>{const first=(Array.isArray(ids)?ids:[]).map(id=>typeof id==='string'?id:PinmapPlaces.legacyKey(items,id)).filter(id=>eligible().some(item=>item.id===id)).map((id,i)=>({id,time:`${String(9+i*2).padStart(2,'0')}:00`}));openCourse({id:newId(),title:'새 코스',date:today,days:[first]});freshCourse=true;if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{const t=typeof document!=='undefined'&&document.querySelector('[data-course-field="title"]');if(t&&freshCourse){t.readOnly=false;t.focus();t.select();}});};
  const eligible=()=>PinmapPlaces.all(items).filter(place=>place.address);
  const dayStops=()=>course.days[0];
  const findPlace=id=>eligible().find(item=>item.id===id);
  // 장소 사진이 '사진 없음' 자리표시이면 게시물 대표 사진을 써요
  const thumbnail=item=>{const own=item.photo&&item.photo!==PM_ENV.placeholderImage?item.photo:'';return own||(typeof libPhoto==='function'?libPhoto(item.sourceItem):'')||PM_ENV.placeholderImage;};
  const stopTime=()=>{const last=dayStops().at(-1)?.time||'08:30';const [h,m]=last.split(':').map(Number);const total=Math.min(h*60+m+90,23*60+45);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`};
  const coordinates=item=>item.lat!=null&&item.lng!=null?[item.lat,item.lng]:undefined;
  /* 2026-11-24 코스 목록 카드 · 사진 경로 지도 · 순서 타임라인 */
  const cssVar=name=>(typeof getComputedStyle==='function'&&getComputedStyle(document.documentElement).getPropertyValue(name).trim())||'#333333';
  const categoryOf=place=>{const label=place.category||'';const c=typeof PinmapCategories!=='undefined'&&PinmapCategories.all.find(x=>x.label===label||(x.aliases||[]).includes(label));return {id:c?.id||'other',label:c?.label||label||'장소'};};
  const chip=place=>{const c=categoryOf(place);return `<span class="course-chip"><i class="course-chip-icon" style="--chip-icon:url('img/category/${esc(c.id)}-inactive.svg')" aria-hidden="true"></i>${esc(c.label)}</span>`;};
  const chips=(places,max=2)=>{const seen=new Map();places.forEach(place=>{const c=categoryOf(place);if(!seen.has(c.label))seen.set(c.label,place)});const list=[...seen.values()];return list.slice(0,max).map(chip).join('')+(list.length>max?`<span class="course-chip course-chip-more">+${list.length-max}</span>`:'');};
  const legKm=(a,b)=>{const p=coordinates(a),q=coordinates(b);return p&&q?kmBetween(p,q):null;};
  const legText=km=>km==null?'':km<1?`약 ${Math.max(50,Math.round(km*1000/50)*50)}m`:`약 ${km.toFixed(1)}km`;
  const routeKm=places=>places.slice(1).reduce((sum,place,i)=>{const km=legKm(places[i],place);return km==null?sum:sum+km;},0);
  const routeMeta=places=>{const km=routeKm(places);return places.length>1&&km>0?`<span>${icon('route')}직선 ${legText(km).replace('약 ','약 ')}</span>`:'';};
  const legMinutes=km=>Math.max(1,Math.round(km*1.3/4.2*60)); // 직선거리 × 1.3 ÷ 도보 4.2km/h
  // 지도 화면의 장소 핀과 같은 원형 사진 핀 + 순서 번호
  // 사진은 잘리지 않게 원 안에 전부 보이고(contain), 남는 자리는 같은 사진을 흐리게 채워요 (지도 화면 핀과 같은 방식)
  const photoPin=(place,index,size)=>{const src=esc(thumbnail(place));return `<span class="course-photo-pin is-${size}"><span class="course-photo-pin-img"><img class="course-photo-pin-back" src="${src}" alt=""><img class="course-photo-pin-front" src="${src}" alt=""></span><i>${index+1}</i></span>`;};
  // 코스의 장소(지도 핀 · 순서 카드)를 누르면 그 장소가 나온 게시물 상세로 이동해요. 뒤로 가면 코스로 돌아와요.
  const openStopDetail=(place,trigger)=>{const item=place?.sourceItem;if(!item||typeof openDetail!=='function')return;window.pmDetailPlace={id:place.id,index:place.locationIndex};openDetail(item.id,trigger);};
  pageName.course='코스 만들기';
  pageName.courses='저장한 코스';
  pages.courses=function(){
    return `<section class="coursepage course-list-page">
      <header class="cx-head"><button class="cx-back" data-page="my" aria-label="마이페이지로 돌아가기">${icon('back')}</button><h1>저장한 코스</h1></header>
      <div class="cx-body">
        <p class="cx-lead">나만의 동선을 모아두고 다시 꺼내 보세요.</p>
        <button class="cx-new" data-course-new>${icon('plus')}새 코스 만들기</button>
        <div class="cx-section-head"><h2>코스 ${courses.length}개</h2></div>
        ${courses.length?`<div class="cx-plan-list">${courses.map(saved=>{const places=saved.days.flat().map(stop=>findPlace(stop.id)).filter(Boolean);return `<button class="cx-plan" data-course-open="${esc(saved.id)}" aria-label="${esc(saved.title)}, 장소 ${places.length}곳 코스 열기">
          <span class="cx-plan-copy"><b>${esc(saved.title)}</b><span class="cx-meta"><span>${icon('map')}장소 ${places.length}곳</span>${routeMeta(places)}</span><span class="cx-chips">${places.length?chips(places):''}</span></span>
          ${places.some(place=>coordinates(place))?`<span class="cx-plan-map course-map-pattern"><span class="course-saved-map" data-course-map="${esc(saved.id)}" role="img" aria-label="${esc(saved.title)} 장소 순서 지도" inert></span></span>`:`<span class="cx-plan-map course-map-pattern is-empty">${icon('map')}</span>`}
        </button>`}).join('')}</div><p class="cx-credit">지도 © Google</p>`:`<div class="course-list-empty">${icon('route')}<h2>아직 저장한 코스가 없어요.</h2><p>저장한 장소로 첫 코스를 만들어 보세요.</p></div>`}
      </div></section>`;
  };
  pages.course=function(){
    const stops=dayStops().map(stop=>({...stop,place:findPlace(stop.id)})).filter(stop=>stop.place);
    const places=stops.map(stop=>stop.place);
    return `<section class="coursepage cx-detail ${editing?'is-editing':''}">
      <header class="cx-head"><button class="cx-back" data-page="${courseOrigin}" aria-label="${courseOrigin==='map'?'지도로 돌아가기':'저장한 코스로 돌아가기'}">${icon('back')}</button>
        <input class="cx-title" data-course-field="title" aria-label="코스 이름, 눌러서 수정" title="눌러서 이름 수정" maxlength="50" value="${esc(course.title)}" readonly>
        <button class="cx-save course-save" data-course-save>저장</button></header>
      <div class="cx-body">
        <div class="cx-map course-map-wrap course-map-pattern"><div id="course-map" aria-label="코스 장소와 이동 순서 지도"></div></div>
        <div class="course-edit-bar" ${editing?'':'hidden'}><span>드래그로 순서 변경, ×로 삭제</span><button data-course-done ${editing?'':'hidden'}>완료</button></div>
        ${stops.length?`<div class="cx-section-head"><h2>코스 순서</h2><span class="cx-meta"><span>${icon('map')}장소 ${stops.length}곳</span>${routeMeta(places)}</span></div>
        <ol class="course-timeline cx-timeline">${stops.map((stop,index)=>`<li class="course-row" data-course-id="${esc(stop.id)}"><span class="cx-num" aria-hidden="true">${index+1}</span><article class="course-card cx-stop" tabindex="0" data-course-stop="${esc(stop.id)}" aria-label="${index+1}번째, ${esc(stop.place.title)}. 눌러서 상세 보기, 왼쪽 손잡이로 순서 변경"><button class="course-drag-handle cx-grip" data-course-drag aria-label="${esc(stop.place.title)} 순서 변경" title="끌어서 순서 변경, 방향키 위/아래로 이동">${icon('drag')}</button><span class="cx-stop-copy"><small>${index+1}번째 장소</small><b>${esc(stop.place.title)}</b><span class="cx-stop-address">${esc(stop.place.address)}</span><span class="cx-chips">${chip(stop.place)}</span></span><img class="cx-stop-photo" src="${esc(thumbnail(stop.place))}" alt=""><button class="course-remove" data-course-remove="${esc(stop.id)}" aria-label="${esc(stop.place.title)} 삭제" ${editing?'':'hidden'}>${icon('close')}</button></article></li>`).join('')}</ol>
        <p class="cx-note">거리는 장소 사이 직선거리로 계산한 예상값이에요.</p>`:'<div class="course-empty">코스가 비어 있어요.<br>저장한 장소를 추가해 보세요.</div>'}
        <button type="button" class="cx-add course-add-place" data-course-picker aria-haspopup="dialog">${icon('plus')}장소 추가하기</button>
      </div>
    </section>`;
  };
  // 2026-11-10 '장소 추가하기'는 화면 안에 목록을 펼치지 않고 아래 시트로 열어요. 여러 곳을 연달아 추가할 수 있어요.
  // 2026-11-10 코스 만드는 순서: 이름 정하기 → 장소 고르기 → 순서 확인 → 저장
  function courseSteps(count){
    const saved=courses.find(value=>value.id===course.id);
    const done=[course.title.trim()&&course.title!=='새 코스',count>0,count>1,!!saved&&JSON.stringify(saved)===JSON.stringify(course)];
    const current=done.findIndex(v=>!v);
    return `<ol class="course-steps" aria-label="코스 만드는 순서">${['이름 정하기','장소 고르기','순서 확인','저장'].map((label,i)=>`<li class="${done[i]?'done':''} ${i===current?'now':''}" ${i===current?'aria-current="step"':''}><span>${done[i]?icon('check'):i+1}</span>${label}</li>`).join('')}</ol>`;
  }
  // 장소 추가 시트의 거리 기준: 지금 고른 위치(마이 '위치 편집'의 첫 위치)에서 직선거리
  const RANGES=[['all','전체',Infinity],['walk1','도보 1km',1],['walk3','도보 3km',3],['car10','차량 10km',10]];
  const refPoint=()=>{const name=typeof myPlaces==='function'?myPlaces()[0]:'';const d=typeof settings!=='undefined'&&settings.placeDetails?.[name];if(Number.isFinite(d?.lat)&&Number.isFinite(d?.lng))return {name,point:[d.lat,d.lng]};return {name:name||'성수동',point:({청파동:[37.5485,126.9673]})[name]||[37.5445,127.043]};};
  const kmBetween=(a,b)=>{const r=Math.PI/180,dLat=(b[0]-a[0])*r,dLng=(b[1]-a[1])*r,h=Math.sin(dLat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLng/2)**2;return 12742*Math.asin(Math.sqrt(h));};
  function pickerBody(){
    const ref=refPoint(),limit=(RANGES.find(r=>r[0]===pickRange)||RANGES[0])[2];
    const available=eligible().filter(item=>!dayStops().some(stop=>stop.id===item.id)).filter(item=>{if(limit===Infinity)return true;const p=coordinates(item);return p&&kmBetween(ref.point,p)<=limit;});
    return `<div class="course-range" role="group" aria-label="거리 기준">${RANGES.map(([key,label])=>`<button type="button" data-course-range="${key}" aria-pressed="${pickRange===key}">${label}</button>`).join('')}</div><p class="hint course-picker-hint">${pickRange==='all'?'저장한 장소 중에서 골라 주세요.':`${esc(ref.name)}에서 ${esc((RANGES.find(r=>r[0]===pickRange)||RANGES[0])[1])} 안에 있는 장소예요.`} 추가한 순서대로 코스가 이어져요.</p><div class="course-picker">${available.length?available.map(item=>`<div class="course-option"><img src="${esc(thumbnail(item))}" alt=""><div><b>${esc(item.title)}</b><small>${esc(item.category||item.type)}, ${esc(item.address)}</small></div><button type="button" data-course-add="${esc(item.id)}" aria-label="${esc(item.title)} 코스에 추가">추가</button></div>`).join(''):(pickRange==='all'?'<p class="course-picker-empty">추가할 수 있는 장소를 모두 담았어요.</p>':'<p class="course-picker-empty">이 거리 안에 저장한 장소가 없어요.<br>거리 기준을 넓혀 보세요.</p>')}</div>`;
  }
  function openPicker(){
    if(typeof modal!=='function')return;
    modal('장소 추가',pickerBody());
    const sheet=document.querySelector('#sheet');if(!sheet)return;
    sheet.classList.add('course-picker-sheet');
    sheet.addEventListener('close',()=>sheet.classList.remove('course-picker-sheet'),{once:true});
  }
  window.unmountCourseThumbnails=()=>{thumbnailMaps.splice(0).forEach(map=>map.remove())};
  window.mountCourseThumbnails=()=>{
    window.unmountCourseThumbnails();
    if(!window.L)return;
    document.querySelectorAll('[data-course-map]').forEach(element=>{
      const saved=courses.find(value=>value.id===element.dataset.courseMap);if(!saved)return;
      const stops=saved.days.flat().map(stop=>findPlace(stop.id)).filter(Boolean);
      const points=stops.map((place,index)=>({point:coordinates(place),index})).filter(stop=>stop.point);
      if(!points.length)return;
      const map=L.map(element,{zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,dragging:false,keyboard:false,zoomAnimation:false,fadeAnimation:false}).setView(points[0].point,15);
      thumbnailMaps.push(map);
      if(points.length>1){
        map.fitBounds(points.map(stop=>stop.point),{padding:[26,26],maxZoom:16});
        L.polyline(points.map(stop=>stop.point),{color:cssVar('--color-on-surface'),weight:2,opacity:.8,lineJoin:'round',interactive:false}).addTo(map);
      }
      points.forEach(({point})=>L.circleMarker(point,{radius:2.5,weight:0,fillColor:cssVar('--color-on-surface'),fillOpacity:1,interactive:false}).addTo(map));
      points.forEach(({point,index})=>L.marker(point,{interactive:false,keyboard:false,icon:L.divIcon({className:'course-photo-marker',html:photoPin(stops[index],index,'sm'),iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map));
      window.attachPinmapBasemap(map);
      map.attributionControl.remove();
    });
  };
  window.unmountCourseMap=()=>{if(courseMap){courseMap.remove();courseMap=null}};
  window.mountCourseMap=()=>{
    window.unmountCourseMap();
    if(!window.L||!document.getElementById('course-map'))return;
    courseMap=L.map('course-map',{zoomControl:false,attributionControl:false,scrollWheelZoom:false,zoomAnimation:false,dragging:true,keyboard:false}).setView([37.5665,126.978],14);
    L.control.zoom({position:'bottomleft',zoomInTitle:'지도 확대',zoomOutTitle:'지도 축소'}).addTo(courseMap);
    const points=[],ink=cssVar('--color-on-surface');
    dayStops().forEach((stop,index)=>{const place=findPlace(stop.id),point=place&&coordinates(place);if(!point)return;points.push({point,place,index})});
    // 사진 핀 아래로 이동 경로(방문 순서대로 잇는 선)와 장소 점을 그려요
    if(points.length>1)L.polyline(points.map(p=>p.point),{color:ink,weight:2.5,opacity:.85,lineJoin:'round',lineCap:'round',interactive:false}).addTo(courseMap);
    points.forEach(({point})=>L.circleMarker(point,{radius:3.5,weight:0,fillColor:ink,fillOpacity:1,interactive:false}).addTo(courseMap));
    points.forEach(({point,place,index})=>L.marker(point,{keyboard:true,title:`${index+1}. ${place.title} 상세 보기`,alt:`${index+1}번째 ${place.title}`,riseOnHover:true,icon:L.divIcon({className:'course-photo-marker is-clickable',html:photoPin(place,index,'md'),iconSize:[48,48],iconAnchor:[24,24]})}).on('click',event=>openStopDetail(place,event.originalEvent?.target)).addTo(courseMap));
    if(points.length>1)courseMap.fitBounds(points.map(p=>p.point),{padding:[44,44],maxZoom:16});
    else if(points.length===1)courseMap.setView(points[0].point,15);
    window.attachPinmapBasemap(courseMap);
    requestAnimationFrame(()=>courseMap?.invalidateSize());
  };
  const renderInPlace=()=>{const y=window.scrollY;render();window.scrollTo(0,y);requestAnimationFrame(()=>window.scrollTo(0,y))};
  const refresh=()=>{save();renderInPlace()};
  let gesture=null,holdTimer=null,dragFrame=null,suppressClickUntil=0;
  const enterEdit=()=>{
    editing=true;
    document.querySelector('.coursepage')?.classList.add('is-editing');
    document.querySelector('.course-edit-bar')?.removeAttribute('hidden');
    document.querySelectorAll('.course-remove,[data-course-done]').forEach(el=>el.hidden=false);
  };
  function dragTick(){
    if(!gesture?.active)return;
    const g=gesture;
    if(!g.row.isConnected){endGesture(true);return;}
    g.ghost.style.top=`${g.y-g.offset}px`;
    const edge=85, height=window.innerHeight;
    const speed=g.y<edge?-Math.ceil((edge-g.y)/7):g.y>height-edge?Math.ceil((g.y-height+edge)/7):0;
    if(speed)window.scrollBy(0,speed);
    placeRow(g);
    dragFrame=requestAnimationFrame(dragTick);
  }
  function placeRow(g){
    const rows=[...g.row.parentNode.querySelectorAll('.course-row')].filter(row=>row!==g.row);
    const next=rows.find(row=>{const rect=row.getBoundingClientRect();return g.y<rect.top+rect.height/2});
    if(g.row.nextElementSibling===(next||null))return;
    const move=()=>g.row.parentNode.insertBefore(g.row,next||null);
    window.PinmapFx?window.PinmapFx.flipRows(rows,move):move();
  }
  function activateDrag(){
    if(!gesture||!gesture.row.isConnected)return;
    enterEdit();
    const g=gesture,rect=g.row.getBoundingClientRect();
    g.active=true;g.offset=g.y-rect.top;
    // 끌고 다니는 카드는 코스 목록과 같은 틀(ol.cx-timeline) 안에 넣어 원래 카드와 똑같은 크기·모양을 유지해요
    const clone=g.row.cloneNode(true);clone.removeAttribute('data-course-id');
    g.ghost=document.createElement('ol');g.ghost.className=`${g.row.parentNode.className} course-drag-ghost`;g.ghost.setAttribute('aria-hidden','true');g.ghost.append(clone);
    Object.assign(g.ghost.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`});
    (document.querySelector('.coursepage')||document.body).append(g.ghost);g.row.classList.add('course-drag-placeholder');
    document.body.classList.add('course-dragging');dragTick();
  }
  function startGesture(target,x,y,id){
    const handle=target.closest('[data-course-drag]');
    if(page!=='course'||(!handle&&target.closest('button,input,a,select')))return;
    const row=target.closest('.course-row');if(!row||(!handle&&!target.closest('.course-card')))return;
    endGesture(true);
    gesture={row,x,y,startX:x,startY:y,id,active:false};
    if(editing||handle)activateDrag();else holdTimer=setTimeout(activateDrag,450);
  }
  function moveGesture(x,y,event){
    if(!gesture)return;
    if(!gesture.active&&Math.hypot(x-gesture.startX,y-gesture.startY)>10){endGesture(true);return;}
    gesture.x=x;gesture.y=y;
    if(gesture.active&&event.cancelable)event.preventDefault();
  }
  function endGesture(cancelled=false){
    clearTimeout(holdTimer);cancelAnimationFrame(dragFrame);
    const g=gesture;gesture=null;if(!g)return;
    g.ghost?.remove();g.row.classList.remove('course-drag-placeholder');document.body.classList.remove('course-dragging');
    if(!g.active)return;
    suppressClickUntil=Date.now()+350;
    if(!cancelled&&g.row.isConnected){
      placeRow(g);
      const ids=[...g.row.parentNode.querySelectorAll('[data-course-id]')].map(row=>row.dataset.courseId);
      const original=dayStops();course.days[0]=[...ids.map(id=>original.find(stop=>stop.id===id)).filter(Boolean),...original.filter(stop=>!ids.includes(stop.id))];
      save();
    }
    if(page==='course')renderInPlace();
  }
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0){if(event.target.closest('[data-course-drag]')||(event.target.closest('.course-card')&&!event.target.closest('button,input,a,select')))event.preventDefault();startGesture(event.target,event.clientX,event.clientY,event.pointerId)}});
  document.addEventListener('pointermove',event=>{if(gesture?.id===event.pointerId)moveGesture(event.clientX,event.clientY,event)});
  document.addEventListener('pointerup',event=>{if(gesture?.id===event.pointerId){gesture.y=event.clientY;endGesture()}});
  document.addEventListener('pointercancel',()=>endGesture(true));
  document.addEventListener('touchstart',event=>{if(event.touches.length!==1){endGesture(true);return;}const t=event.touches[0];startGesture(event.target,t.clientX,t.clientY,'touch')},{passive:true});
  document.addEventListener('touchmove',event=>{if(gesture?.id==='touch'){const t=event.touches[0];moveGesture(t.clientX,t.clientY,event)}},{passive:false});
  document.addEventListener('touchend',()=>{if(gesture?.id==='touch')endGesture()});
  document.addEventListener('touchcancel',()=>endGesture(true));
  window.addEventListener('blur',()=>endGesture(true));
  document.addEventListener('contextmenu',event=>{if(event.target.closest('.course-card,[data-course-drag]'))event.preventDefault()});
  document.addEventListener('click',event=>{if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
  document.addEventListener('keydown',event=>{
    const card=event.target.closest('.course-card,[data-course-drag]');if(!card||event.target!==card)return;
    const handle=card.hasAttribute('data-course-drag');
    if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!handle&&!editing){openStopDetail(findPlace(card.dataset.courseStop),card);return;}enterEdit();}
    if((editing||handle)&&['ArrowUp','ArrowDown'].includes(event.key)){
      enterEdit();
      event.preventDefault();const id=card.closest('[data-course-id]').dataset.courseId,list=dayStops(),index=list.findIndex(stop=>stop.id===id),next=index+(event.key==='ArrowUp'?-1:1);
      if(next>=0&&next<list.length){[list[index],list[next]]=[list[next],list[index]];refresh();[...document.querySelectorAll('[data-course-id]')].find(row=>row.dataset.courseId===id)?.querySelector(handle?'[data-course-drag]':'.course-card')?.focus()}
    }
    if(event.key==='Escape'){editing=false;render()}
  });
  function shareText(){
    const stops=dayStops().map(stop=>findPlace(stop.id)).filter(Boolean);
    return `${course.title}\n${course.date}\n\n`+stops.map((place,index)=>`${index+1}. ${place.title}\n${place.address||''}`).join('\n\n');
  }
  function shareFallback(text){
    const dialog=document.getElementById('sheet');
    dialog.innerHTML=`<section class="course-share-sheet"><h2>코스 공유</h2><p>코스 내용을 복사해서 친구에게 보내 보세요.</p><textarea aria-label="공유할 코스" readonly>${esc(text)}</textarea><div><button data-course-share-close>닫기</button><button data-course-share-copy>복사하기</button></div></section>`;
    dialog.showModal();
    dialog.querySelector('[data-course-share-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-course-share-copy]').onclick=async()=>{
      try{await navigator.clipboard.writeText(text);toast('코스를 복사했어요.');dialog.close();}
      catch{dialog.querySelector('textarea').select();toast('선택된 내용을 복사해 주세요.');}
    };
  }
  document.addEventListener('click',async event=>{
    if(['map','courses'].includes(page)&&event.target.closest('[data-course-new]')){
      window.startNewCourse();return;
    }
    if(page==='courses'){
      const button=event.target.closest('[data-course-open]');const saved=button&&courses.find(value=>value.id===button.dataset.courseOpen);if(saved)openCourse(saved);
      return;
    }
    if(page!=='course')return;
    const rangeBtn=event.target.closest('[data-course-range]');
    if(rangeBtn&&rangeBtn.dataset){pickRange=rangeBtn.dataset.courseRange;openPicker();return;}
    if(event.target.closest('[data-course-save]')){
      if(!course.days.flat().some(stop=>findPlace(stop.id))){toast('저장할 장소를 한 곳 이상 추가해 주세요.');return;}
      course.title=course.title.trim()||'새 코스';
      const updated=clone(course),next=courses.some(value=>value.id===course.id)?courses.map(value=>value.id===course.id?updated:value):[updated,...courses];
      if(courseSaving)return;
      courseSaving=true;
      const saveButton=event.target.closest('[data-course-save]');saveButton.disabled=true;
      try{
        if(PM_ENV.requiresAuth)await window.PinmapAccountState.saveCourses(next);
        else localStorage.setItem(storageKey,JSON.stringify(next));
      }catch(error){toast(PM_ENV.requiresAuth?(error.message||'코스를 저장하지 못했어요. 다시 시도해 주세요.'):'코스를 저장하지 못했어요. 저장 공간을 확인해 주세요.');return;}
      finally{courseSaving=false;if(saveButton.isConnected)saveButton.disabled=false;}
      courses=next;draft=null;
      if(!PM_ENV.requiresAuth)try{localStorage.removeItem(draftKey)}catch{}
      go('courses');toast('코스를 저장했어요.');return;
    }
    if(event.target.closest('[data-course-drag]')){enterEdit();return;}
    if(event.target.closest('[data-course-edit-title],.cx-title[readonly]')){
      const title=document.querySelector('[data-course-field="title"]');
      if(title){title.readOnly=false;title.focus();title.select()}
      return;
    }
    if(event.target.closest('[data-course-share]')){
      const text=shareText();
      if(navigator.share){try{await navigator.share({title:course.title,text});}catch(error){if(error.name!=='AbortError')shareFallback(text);}}
      else shareFallback(text);
      return;
    }
    const button=event.target.closest('[data-course-picker],[data-course-add],[data-course-remove],[data-course-done]');
    if(!button){const card=!editing&&event.target.closest('[data-course-stop]');if(card)openStopDetail(findPlace(card.dataset.courseStop),card);return;}
    if(button.hasAttribute('data-course-done')){editing=false;render();return}
    if(button.hasAttribute('data-course-picker')){openPicker();return}
    if(button.dataset.courseAdd){const id=button.dataset.courseAdd;if(findPlace(id)&&!dayStops().some(stop=>stop.id===id)){dayStops().push({id,time:stopTime()});refresh();const sheet=document.querySelector('#sheet');if(sheet?.open&&sheet.classList.contains('course-picker-sheet')){openPicker();sheet.querySelector('[data-course-add]')?.focus();toast?.('코스에 추가했어요.');}}return}
    if(button.dataset.courseRemove&&editing){course.days[0]=dayStops().filter(stop=>stop.id!==button.dataset.courseRemove);refresh();return}

  });
  document.addEventListener('input',event=>{if(page==='course'&&event.target.dataset.courseField==='title'){course.title=event.target.value;save()}});
  document.addEventListener('focusout',event=>{if(page==='course'&&event.target.dataset.courseField==='title'){event.target.readOnly=true;freshCourse=false;if(!course.title.trim()){course.title='새 코스';event.target.value=course.title;}save();}});
  document.addEventListener('change',event=>{if(page!=='course')return;if(event.target.dataset.courseField==='date'){if(!validDate(event.target.value)){event.target.value=course.date;toast('출발일을 선택해 주세요.');return;}course.date=event.target.value;refresh()}else if(event.target.dataset.courseTime){const stop=dayStops().find(item=>item.id===event.target.dataset.courseTime);if(stop){stop.time=event.target.value;save()}}});
})();
