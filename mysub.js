// 마이 하위 페이지: 프로필 편집 (home.js 다음에 불러와요)
// 하단 시트가 아니라 페이지로 넘어가고, 왼쪽 위 ← 버튼으로 마이로 돌아가요.

/* ---------- 프로필 사진 ---------- */
const avatarHtml = (cls = '') => PM_ENV.development && !settings.avatar ? `<span class="pavatar ${cls}" aria-hidden="true">${icon('user')}</span>` : `<span class="pavatar ${cls}" aria-hidden="true"><img src="${settings.avatar || 'img/profile-demo.png'}" alt=""></span>`;
const subHead = (title, back = 'my') => `<div class="subhead"><button class="subback" data-page="${back}" aria-label="${back === 'guide' ? '이용 가이드로' : back === 'account' ? '프로필 및 계정으로' : back === 'calsettings' ? '캘린더 설정으로' : back === 'settingspage' ? '설정으로' : '마이로'} 돌아가기">${icon('back')}</button><h1>${title}</h1></div>`;

pages.profile = function(){
  return subHead('프로필 편집', 'account') + `
  <div class="pfedit">
    <div class="pfphoto">${avatarHtml('big')}
      <label class="pfchange" aria-label="프로필 사진 변경">${icon('galleryAdd')}<input type="file" id="avatarfile" accept="image/*" hidden></label>
    </div>
    <div class="pfbtns"><label class="tonal small" for="avatarfile">사진 변경</label>${settings.avatar ? '<button class="textbtn" data-action="avatarreset">기본 이미지로</button>' : ''}</div>
    <form id="profilepage" class="pfform">
      <label class="field"><span>닉네임</span><input name="nickname" value="${esc(settings.nickname)}" required maxlength="12"></label>
      <p class="hint">${PM_ENV.requiresAuth ? '닉네임과 사진은 로그인 계정에 저장돼요.' : '위치는 ‘위치 편집’에서 바꿀 수 있어요. 이 브라우저에만 저장돼요.'}</p>
      <button class="filled pfsave" type="submit">저장</button>
    </form>
  </div>`;
};
// 사진을 정사각형으로 잘라 작게 줄인 뒤 저장해요
document.addEventListener('change', e => {
  if (e.target.id !== 'avatarfile' || !e.target.files?.[0]) return;
  const file = e.target.files[0];
  if (!file.type.startsWith('image/')) { toast('이미지 파일만 올릴 수 있어요.'); return; }
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'), size=PM_ENV.requiresAuth?120:240; c.width = c.height = size;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    URL.revokeObjectURL(url);
    const avatar=c.toDataURL('image/jpeg', .72);
    if(PM_ENV.requiresAuth){
      window.PinmapAccountProfile?.save({avatar}).then(()=>toast('프로필 사진을 바꿨어요.')).catch(error=>toast(error.message||'사진을 저장하지 못했어요.'));
    }else{settings.avatar=avatar;afterChange();render();toast('프로필 사진을 바꿨어요.');}
  };
  img.onerror = () => toast('사진을 불러오지 못했어요.');
  img.src = url;
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'profilepage') return;
  e.preventDefault();
  const nick = e.target.nickname.value.trim(); if (!nick) return;
  if(PM_ENV.requiresAuth){
    try{await window.PinmapAccountProfile.save({nickname:nick});toast('프로필을 저장했어요.');}
    catch(error){toast(error.message||'프로필을 저장하지 못했어요.');}
  }else{settings.nickname=nick;afterChange();render();toast('프로필을 저장했어요.');}
});

const toastBaseSync=toast;
toast=function(t){$('#snackbar').classList.remove('oneline');return toastBaseSync(String(t).replace(/([.!?])\s+(?=\S)/g,'$1\n'));};
actions.profile = () => go('profile');
actions.profilephoto = () => $('#avatarfile')?.click();
actions.avatarreset = () => {
  if(PM_ENV.requiresAuth)window.PinmapAccountProfile?.save({avatar:''}).then(()=>toast('기본 이미지로 바꿨어요.')).catch(error=>toast(error.message||'사진을 변경하지 못했어요.'));
  else{delete settings.avatar;afterChange();render();toast('기본 이미지로 바꿨어요.');}
};
/* 하위 페이지와 캘린더에서도 하단 메뉴의 해당 탭이 켜져 있게 */
const PARENT_TAB = {profile:'my', courses:'my', course:'my', calendar:'home', topic:'home'};

/* 홈 검색 버튼: 저장됨 탭의 검색으로 */
// 홈 검색은 home.js에서 같은 줄에 펼쳐지는 검색창으로 열어요 (2026-11-04).
