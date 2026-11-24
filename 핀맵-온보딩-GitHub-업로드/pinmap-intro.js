// Shown after account sign-in.
function showPinmapIntro(main, enterApp) {
  const scenes = [
    ['search', '저장 검색', '그때 저장한 거,\n바로 찾으세요', '쌓아 둔 콘텐츠 중 지금 필요한 것만 빠르게 찾아보세요.', '북마크 더미에서 민트색 핀을 찾아낸 사람'],
    ['nearby', '근처 알림', '찜해 둔 카페가\n바로 이 근처예요', '저장한 장소 가까이 가면 핀맵이 알림을 보내요.', '카페 앞에서 알림을 확인하는 사람'],
    ['deadline', '마감 알림', '끝나기 전에\n챙겨 보세요', '저장한 콘텐츠의 마감이 다가오면 미리 알려드려요.', '달력에 민트색 핀을 꽂는 사람']
  ];
  const duration = 3500;
  let step = 0, elapsed = 0, last = performance.now();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  main.dataset.screen = 'story';
  const story = document.createElement('section');
  story.className = 'pm-story';
  story.setAttribute('aria-label','핀맵 소개');
  story.innerHTML = `<header><button class="story-skip">건너뛰기</button></header><nav aria-label="장면 선택">${scenes.map(([,name]) => '<button type="button" aria-label="'+name+' 보기"><i><b></b></i></button>').join('')}</nav>
    <div aria-live="polite"><h1 tabindex="-1"></h1><p></p></div>
    <figure><img></figure><button class="story-start filled" hidden>시작하기</button>`;
  main.append(story);
  const select = selector => story.querySelector(selector);
  const bars = [...story.querySelectorAll('nav button')];
  const start = select('.story-start');
  function drawProgress() {
    bars.forEach((bar,i) => {
      const fill = i < step ? 1 : i === step ? elapsed / duration : 0;
      bar.querySelector('b').style.transform = 'scaleX('+(reducedMotion && fill < 1 ? 0 : fill)+')';
    });
  }
  function show(i) {
    step = i; elapsed = 0; last = performance.now();
    const [file, , title, description, alt] = scenes[i];
    select('h1').textContent = title;
    select('p').textContent = description;
    select('img').src = 'img/onboarding-story/'+file+'.jpg';
    select('img').alt = alt;
    bars.forEach((bar,j) => bar.setAttribute('aria-current',i === j ? 'step' : 'false'));
    start.hidden = true;
    drawProgress();
  }
  bars.forEach((bar,i) => bar.onclick = () => show(i));
  story.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    if (step < scenes.length - 1) show(step + 1);
    else {
      elapsed = duration;
      drawProgress();
      start.hidden = false;
    }
  });
  start.onclick = select('.story-skip').onclick = enterApp;
  const resetClock = () => {last = performance.now();};
  document.addEventListener('visibilitychange', resetClock);
  function tick(now) {
    if (!document.hidden && elapsed < duration) {
      elapsed = Math.min(duration,elapsed + Math.max(0,now-last));
      drawProgress();
      if (elapsed === duration) {
        if (step < scenes.length-1) show(step+1);
        else start.hidden = false;
      }
    }
    last = now;
    if (story.isConnected) requestAnimationFrame(tick);
    else document.removeEventListener('visibilitychange', resetClock);
  }
  show(0); select('h1').focus(); requestAnimationFrame(tick);
}
