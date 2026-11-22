/* One in-tab save request can outlive the save sheet and page renders. */
(() => {
  let job = null;
  let ticker = null;
  let dismiss = null;
  const panel = document.createElement('div');
  panel.id = 'pinmap-save-status';
  panel.className = 'pm-save-status';
  panel.hidden = true;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  document.body.append(panel);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);

  function progressMarkup() {
    const percent = job.percent;
    const title = job.phase === 'running' ? '링크 저장 중' : job.phase === 'done' ? '저장 완료' : '저장 실패';
    const detail = job.phase === 'running'
      ? `예상 진행률 ${percent}% · 게시물을 분석하고 저장 중이에요.`
      : job.phase === 'done' ? '저장 결과를 확인했어요.' : escapeHtml(job.error);
    return `${job.phase === 'running' ? '<div class="pm-loading pm-loading-compact"><span class="pm-spinner" aria-hidden="true"></span></div>' : ''}<div class="pm-save-status-row"><strong>${title}</strong><span>${percent}%</span></div>
      <div class="pm-save-meter" role="progressbar" aria-label="${title} 예상 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
      <p>${detail}</p>`;
  }
  function render() {
    panel.hidden = !job;
    panel.setAttribute('aria-live', job?.phase === 'running' ? 'off' : 'polite');
    if (job) panel.innerHTML = progressMarkup();
    const form = document.getElementById('saveform');
    if (!form) return;
    const progress = form.querySelector('#saveprogress');
    const button = form.querySelector('button[type="submit"]');
    if (progress) {
      progress.hidden = !job;
      progress.setAttribute('aria-live', job?.phase === 'running' ? 'off' : 'polite');
      progress.innerHTML = job ? progressMarkup() : '';
    }
    if (button && job?.phase === 'running') {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = '저장 중…';
    } else if (button?.getAttribute('aria-busy') === 'true') {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = '저장하기';
    }
  }
  function clear() {
    clearInterval(ticker);
    clearTimeout(dismiss);
    ticker = dismiss = null;
    job = null;
    render();
  }
  function start() {
    if (job?.phase === 'running') return false;
    clear();
    job = {phase:'running', percent:2, started:Date.now(), error:''};
    render();
    // The current API sends one response after analysis and storage. This is
    // explicitly an elapsed-time estimate; never show 100 before confirmation.
    ticker = setInterval(() => {
      if (!job || job.phase !== 'running') return;
      const seconds = (Date.now() - job.started) / 1000;
      const next = Math.min(95, 2 + Math.floor(93 * (1 - Math.exp(-seconds / 65))));
      if (next !== job.percent) { job.percent = next; render(); }
    }, 1000);
    return true;
  }
  function finish(error) {
    if (!job || job.phase !== 'running') return;
    clearInterval(ticker);
    ticker = null;
    job.phase = error ? 'failed' : 'done';
    job.error = error || '';
    if (!error) job.percent = 100;
    render();
    dismiss = setTimeout(clear, error ? 8000 : 5000);
  }
  window.PinmapSaveProgress = Object.freeze({start, finish, clear, render,
    isRunning:() => job?.phase === 'running'});
})();
