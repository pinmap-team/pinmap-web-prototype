// 홈과 지도 상단 '내 동네' (최대 2개)
// 메인 동네는 검정 큰 글씨, 서브 동네는 회색 작은 글씨. 서브를 누르면 서로 자리가 바뀌어요.
// 메인 동네를 누르면 '내 동네 설정' 시트가 올라와 추가 · 삭제 · 수정할 수 있어요.
const MAX_PLACES = Infinity; // 2026-11-04: 저장 위치 개수 제한 없음
// 검색용 동네 목록 (예시)
const DONGS = (PM_ENV.development ? [] : [
  ['성수동','서울 성동구'],['성수1가1동','서울 성동구'],['성수2가3동','서울 성동구'],['행당동','서울 성동구'],['왕십리동','서울 성동구'],['금호동','서울 성동구'],['옥수동','서울 성동구'],
  ['자양동','서울 광진구'],['화양동','서울 광진구'],['구의동','서울 광진구'],
  ['청파동','서울 용산구'],['효창동','서울 용산구'],['남영동','서울 용산구'],['후암동','서울 용산구'],['이태원동','서울 용산구'],['한남동','서울 용산구'],['용산동','서울 용산구'],
  ['서교동','서울 마포구'],['합정동','서울 마포구'],['연남동','서울 마포구'],['망원동','서울 마포구'],['상수동','서울 마포구'],
  ['삼청동','서울 종로구'],['익선동','서울 종로구'],['혜화동','서울 종로구'],['을지로동','서울 중구'],['명동','서울 중구'],
  ['신사동','서울 강남구'],['압구정동','서울 강남구'],['역삼동','서울 강남구'],['잠실3동','서울 송파구'],['문정동','서울 송파구'],['가락2동','서울 송파구']
]).map(([name, gu]) => ({name, full:`${gu} ${name}`}));
const dongOf = name => DONGS.find(d => d.name === name) || {name, full:name};

const myPlaces = () => {
  if (!Array.isArray(settings.places)) settings.places = PM_ENV.development ? [] : ['성수동'];
  if (settings.places.length > MAX_PLACES) {
    settings.archivedPlaces = [...new Set([...(settings.archivedPlaces || []), ...settings.places.slice(MAX_PLACES)])];
    settings.places.length = MAX_PLACES;
    afterChange();
  }
  return settings.places;
};
const mainPlace = () => myPlaces()[0] || '';
// 저장 장소가 메인 동네에 있는지 (동 이름의 숫자·'가'를 빼고 주소와 비교)
const inMainPlace = x => !!mainPlace() && (x.address||'').includes(mainPlace().replace(/\d+가?\d*동$|동$/, ''));

let placeSwapped = false; // 위치를 바꿨을 때만 글자 애니메이션
function placebar(){
  if(!myPlaces().length)return `<div class="placebar"><button class="placemain" data-action="mapaddresses">${icon('pin')}<b>위치를 아직 설정하지 않았어요</b></button></div>`;
  const [main, ...others] = myPlaces();
  const mainLabel = settings.placeLabels?.[main] || main;
  const swapped = placeSwapped; placeSwapped = false;
  return `<div class="placebar${swapped ? ' swapped' : ''}" role="group" aria-label="현재 위치">
    <button class="placemain" data-action="placesheet" aria-label="현재 위치 설정, ${esc(mainLabel)}, ${esc(main)}">${icon('pin')}<b>${esc(mainLabel)}</b>${others.length ? '' : icon('chevron')}</button>
    ${others.map((name,index) => `<button class="placesub" data-place-swap="${index+1}" aria-label="${esc(settings.placeLabels?.[name] || name)}, ${esc(name)} 위치 선택">${esc(settings.placeLabels?.[name] || name)}</button>`).join('')}
  </div>`;
}
paths.chevron = 'm6 9 6 6 6-6';
paths.edit = 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4';

function setMain(i){
  const p = myPlaces();
  if (i <= 0 || i >= p.length) return;
  const [picked] = p.splice(i, 1); p.unshift(picked); placeSwapped = true;
  afterChange(); render();
  window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name:picked}}));
  toast(`위치를 '${settings.placeLabels?.[picked] || picked}'${josa(settings.placeLabels?.[picked] || picked, '으로/로').slice(String(settings.placeLabels?.[picked] || picked).length)} 변경했어요.`);
}

// Location editing uses the canonical full-page editor.
actions.placesheet=()=>go('myaddresses');
actions.placeadd=()=>{go('myaddresses');actions.addressadd();};
document.addEventListener('click',event=>{const button=event.target.closest('[data-place-swap]');if(button)setMain(Number(button.dataset.placeSwap));});
