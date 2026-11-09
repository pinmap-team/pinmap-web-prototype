// Optional portfolio tour. Keep the app on its own origin for map SDKs and APIs.
(() => {
  if (window.parent === window || new URLSearchParams(location.search).get('portfolio-demo') !== '1') return;
  const portfolioOrigin = 'https://ji-hyeon-jeong.vercel.app';
  try { if (new URL(document.referrer).origin !== portfolioOrigin) return; }
  catch { return; }
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = portfolioOrigin + '/pinmap-preview.css?v=2';
  document.head.append(style);
  const script = document.createElement('script');
  script.id = 'portfolio-live-controller';
  script.src = portfolioOrigin + '/pinmap-preview.js?v=2';
  document.body.append(script);
})();
