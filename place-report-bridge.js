// Pass a completed backend test report to the empty development app frame.
// Only the two fixed Pinmap origins may participate; no test code enters the URL.
(() => {
  const backendOrigin = 'https://pinmap-backend.vercel.app';
  const frame = document.querySelector('.phone-frame');
  if (!frame) return;
  window.addEventListener('message', event => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (event.source === frame.contentWindow && event.origin === location.origin) {
      if (message.type === 'pinmap:place-report-ready' || message.type === 'pinmap:place-report-imported' ||
          message.type === 'pinmap:place-report-failed') {
        window.opener?.postMessage({type:message.type, reason:message.reason}, backendOrigin);
      }
      return;
    }
    if (event.source !== window.opener || event.origin !== backendOrigin ||
        message.type !== 'pinmap:place-report' || !message.report ||
        !frame.getAttribute('src')?.includes('mode=development')) return;
    frame.contentWindow?.postMessage({type:message.type, report:message.report}, location.origin);
  });
})();
