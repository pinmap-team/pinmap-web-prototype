/* Shared check layers used by the supplied import window. */
(() => {
  function markup(state = 'spinning') {
    return `<span class="t-check-blur-wrap"><span class="t-check-badge" data-state="${state}" role="img" aria-label="처리 상태">
      <span class="t-check-ring"></span><span class="t-check-arc"></span><span class="t-check-fill"></span>
      <span class="t-check-disc"><svg viewBox="0 0 24 24"><path class="t-check-mark" d="M8 12.5L10.8 15.5L16.4 9.5"/></svg></span>
    </span></span>`;
  }
  window.PinmapCheckMorph = Object.freeze({markup});
})();

/* Save state drives the supplied import window; no separate progress window is rendered. */
(() => {
  let job = null;
  let dismiss = null;
  function render() {
    const form = document.getElementById('saveform');
    const button = form?.querySelector('button[type="submit"]');
    if (button && job?.phase === 'running') {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = '저장 중…';
    } else if (button?.getAttribute('aria-busy') === 'true') {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = '저장하기';
    }
    window.dispatchEvent(new CustomEvent('pinmap:save-progress', {detail:job && {...job}}));
  }
  function clear() {
    clearTimeout(dismiss);
    dismiss = null;
    job = null;
    render();
  }
  function start(kind = 'link') {
    if (job?.phase === 'running') return false;
    clear();
    job = {kind, phase:'running', started:Date.now(), error:''};
    render();
    return true;
  }
  function finish(error, info = {}) {
    if (!job || job.phase !== 'running') return;
    job.phase = error ? 'failed' : 'done';
    job.error = error || '';
    job.category = info.category || '';
    render();
    dismiss = setTimeout(clear, error ? 8000 : 5000);
  }
  window.PinmapSaveProgress = Object.freeze({start, finish, clear, render,
    state:() => job && {...job}, isRunning:() => job?.phase === 'running'});
})();
