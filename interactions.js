/* 2026-11-23 인터랙션: 저장 완료 · 지도 카드와 핀 · 마감 임박 · 코스 단계와 순서 (온보딩·AI 분류는 각 화면 코드에서 호출) */
(() => {
  const reduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // 같은 요소에 같은 움직임을 다시 줄 때: 클래스를 뺐다가 다음 프레임에 다시 넣어요.
  const replay = (el, cls) => {
    if (!el || reduce()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), {once:true});
  };
  const libraryTab = () => document.querySelector('.bottomnav .navitem[data-page="library"]');

  // 1. 저장 완료: '저장됨' 체크가 그려지고, 작은 점이 컬렉션 탭으로 날아가 탭이 통 튀며 +1이 떠올라요.
  function celebrateSave(label = '') {
    document.querySelector('.pm-savefx')?.remove();
    const fx = document.createElement('div');
    fx.className = 'pm-savefx'; fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = `${typeof PinmapSolar !== 'undefined' ? PinmapSolar.icon('check', 'pm-savefx-check', 'bold') : icon('check')}<b>저장됨</b>${label ? `<span>${esc(label)}</span>` : ''}`;
    document.body.append(fx);
    // 저장 진행 안내가 떠 있으면 그 위에 띄워 겹치지 않게 해요.
    const panel = document.getElementById('pinmap-save-status');
    if (panel && !panel.hidden) fx.style.bottom = `${window.innerHeight - panel.getBoundingClientRect().top + 12}px`;
    if (reduce() || !libraryTab()) { setTimeout(() => fx.remove(), 1500); return; }
    setTimeout(() => {
      const tab = libraryTab(); if (!tab || !fx.isConnected) { fx.remove(); return; }
      const a = fx.getBoundingClientRect(), b = tab.getBoundingClientRect();
      const dot = document.createElement('i');
      dot.className = 'pm-savefx-fly'; dot.setAttribute('aria-hidden', 'true');
      dot.style.left = `${a.left + a.width / 2 - 14}px`; dot.style.top = `${a.top + a.height / 2 - 14}px`;
      dot.style.setProperty('--dx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
      dot.style.setProperty('--dy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
      document.body.append(dot); fx.classList.add('is-leaving');
      dot.addEventListener('animationend', () => {
        dot.remove(); fx.remove();
        const target = libraryTab(); if (!target) return;
        replay(target, 'pm-nav-bump');
        const plus = document.createElement('i'); // span은 하단 메뉴에서 화면 밖 글자로 처리돼서 i를 써요
        plus.className = 'pm-nav-plus'; plus.setAttribute('aria-hidden', 'true'); plus.textContent = '+1';
        target.append(plus); setTimeout(() => plus.remove(), 1000);
      }, {once:true});
    }, 900);
  }

  // 4. 지도: 카드를 넘기거나 핀을 누르면 선택한 카드가 살짝 내려앉아요(핀이 튀는 움직임은 CSS).
  function landCard(key) {
    const card = [...document.querySelectorAll('.lm-carousel-card')].find(node => node.dataset.placeKey === key);
    replay(card, 'pm-land');
  }

  // 5. 마감 임박: 홈에서 D-3 이내 배지가 처음 보일 때 한 번만 흔들려요(방문마다 한 번).
  let attnDone = false;
  try { attnDone = sessionStorage.getItem('pinmap.fx.deadline') === '1'; } catch {}
  function deadlineAttention() {
    if (attnDone || page !== 'home') return;
    const badge = document.querySelector('.strip-item.soon b, .cnbadge.soon');
    if (!badge) return;
    attnDone = true;
    try { sessionStorage.setItem('pinmap.fx.deadline', '1'); } catch {}
    setTimeout(() => replay(badge.isConnected ? badge : document.querySelector('.strip-item.soon b, .cnbadge.soon'), 'pm-attn'), 400);
  }

  // 7. 코스: 단계가 하나 더 채워질 때 그 단계 원이 통 튀어요.
  let stepCount = null;
  function courseStepsFill() {
    const steps = document.querySelector('.coursepage .course-steps');
    if (!steps) { stepCount = null; return; }
    const done = [...steps.querySelectorAll('li.done')];
    if (stepCount !== null && done.length > stepCount) replay(done[done.length - 1].querySelector('span') || done[done.length - 1], 'pm-step-fill');
    stepCount = done.length;
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; deadlineAttention(); courseStepsFill(); });
  }).observe(document.getElementById('app') || document.body, {childList:true, subtree:true});

  // 7. 코스 순서 바꾸기: 끌고 있는 카드에 밀려난 카드가 부드럽게 비켜나요(FLIP).
  function flipRows(rows, mutate) {
    if (reduce()) { mutate(); return; }
    const before = new Map(rows.map(row => [row, row.getBoundingClientRect().top]));
    mutate();
    rows.forEach(row => {
      const dy = before.get(row) - row.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) row.animate([{transform:`translateY(${dy}px)`}, {transform:'none'}], {duration:180, easing:'cubic-bezier(.2,.8,.3,1)'});
    });
  }

  window.PinmapFx = Object.freeze({replay, celebrateSave, landCard, flipRows});
  window.PinmapSaveFx = celebrateSave;
})();
