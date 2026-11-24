(() => {
  const frame = document.querySelector('[data-phone-viewport]');
  if (!frame) return;
  const fit = () => {
    const scale = String(Math.min(1, innerWidth / 402, innerHeight / 874));
    frame.style.setProperty('--phone-scale', scale);
    document.querySelector('.phone-entry-skeleton')?.style.setProperty('--phone-scale', scale);
  };
  fit();
  addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
})();
