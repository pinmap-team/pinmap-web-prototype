(() => {
  const fit = () => document.querySelectorAll('[data-phone-viewport]').forEach(frame =>
    frame.style.setProperty('--phone-scale', String(Math.min(1, innerWidth / 402, innerHeight / 874))));
  fit();
  addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
})();
