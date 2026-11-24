(() => {
  const frame = document.querySelector('.phone-frame');
  const skeleton = document.querySelector('.phone-entry-skeleton');
  if (!frame || !skeleton) return;
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    skeleton.classList.add('is-revealed');
    skeleton.setAttribute('aria-hidden', 'true');
    const motion = getComputedStyle(skeleton);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 :
      parseFloat(motion.getPropertyValue('--reveal-dur')) || 400;
    setTimeout(() => skeleton.remove(), duration + 40);
  }
  addEventListener('message', event => {
    if (event.source === frame.contentWindow && event.origin === location.origin && event.data?.type === 'pinmap:entry-ready') reveal();
  });
  // If a network request stalls, uncover the app's own error state.
  setTimeout(reveal, 20000);
})();
