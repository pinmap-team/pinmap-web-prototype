(() => {
  const frame = document.querySelector('[data-phone-viewport]');
  if (!frame) return;
  const fit = () => frame.style.setProperty('--phone-scale', String(Math.min(1, innerWidth / 402, innerHeight / 874)));
  fit();
  addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
})();
