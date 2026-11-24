/* A ZIP contributes only post URLs. Each post uses the authenticated save path. */
(function (root, factory) {
  const makeQueue = factory();
  if (typeof module === 'object' && module.exports) module.exports = makeQueue;
  if (!root.window || !root.document || typeof PM_ENV === 'undefined' || !PM_ENV.requiresAuth) return;
  const account = {
    userId:() => root.window.PinmapAccountContent?.userId(),
    loaded:() => root.window.PinmapAccountLoaded && !root.window.PinmapAccountLoadError,
    knownUrls:() => root.window.PinmapAccountContent?.knownUrls() || [],
    importLink:(url, userId) => root.window.PinmapAccountContent.importZipLink(url, userId),
    refresh:() => root.window.PinmapAccountContent?.refresh()
  };
  const queue = makeQueue({storage:root.localStorage, account,
    canonical:url => root.window.PinmapZipParser?.canonical(url),
    publish:state => root.window.dispatchEvent(new CustomEvent('pinmap:zip-progress', {detail:state})),
    finish:() => { void root.window.PinmapBilling?.refresh?.(); }});
  root.window.PinmapZipImport = queue;
  root.window.addEventListener('pinmap:account-loaded', event => queue.attach(event.detail.userId));
  root.window.addEventListener('pinmap:account-cleared', () => queue.pause());
  root.window.addEventListener('storage', event => {
    if (event.key === 'pinmap.zip-import.v1.' + account.userId() && event.newValue === null) queue.forget();
  });
  if (account.loaded()) queue.attach(account.userId());
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KEY = 'pinmap.zip-import.v1.';
  const MAX_POSTS = 10000;
  function createQueue({storage, account, canonical, publish = () => {}, finish = () => {}}) {
    let userId = null, job = null, running = false, pauseRequested = false, pendingAttach = null;
    const state = () => job && ({phase:job.phase, name:job.name, source:job.source || 'zip', total:job.urls.length,
      processed:job.index, saved:job.saved, skipped:job.skipped, review:job.review,
      error:job.error || ''});
    function notify() { publish(state()); }
    function persist() { storage.setItem(KEY + userId, JSON.stringify(job)); notify(); }
    function attach(id) {
      if (!id || (running && userId === id)) return;
      if (running) { pauseRequested = true; pendingAttach = id; return; }
      userId = id;
      let stored;
      try { stored = JSON.parse(storage.getItem(KEY + id) || 'null'); } catch { stored = null; }
      job = stored && Array.isArray(stored.urls) && stored.urls.length <= MAX_POSTS &&
        stored.urls.every(url => canonical(url) === url) && Number.isSafeInteger(stored.index) &&
        stored.index >= 0 && stored.index <= stored.urls.length &&
        ['running','paused','done'].includes(stored.phase) ? stored : null;
      notify();
      if (job?.phase === 'running' && account.loaded()) void run();
    }
    async function start(urls, name) {
      const id = account.userId();
      if (!id || !account.loaded()) throw Error('저장 목록을 불러온 뒤 다시 시도해 주세요.');
      if (running || (job && job.phase !== 'done' && job.index < job.urls.length))
        throw Error('진행 중인 여러 콘텐츠 저장을 먼저 완료해 주세요.');
      if (!Array.isArray(urls) || !urls.length || urls.length > MAX_POSTS ||
          urls.some(url => canonical(url) !== url)) throw Error('ZIP의 게시물 링크 목록을 확인해 주세요.');
      userId = id;
      job = {phase:'running', name:String(name || 'Instagram ZIP').slice(0, 120),
          source:/\.zip$/i.test(String(name || '')) ? 'zip' : 'links',
          urls:[...new Set(urls)], index:0, saved:0, skipped:0, review:0, error:''};
      pauseRequested = false;
      persist();
      return run();
    }
    async function run() {
      if (running || !job || job.phase === 'done') return;
      if (!account.loaded() || account.userId() !== userId) return;
      const activeJob = job;
      running = true;
      pauseRequested = false;
      job.phase = 'running'; job.error = '';
      persist();
      try {
        const known = new Set(account.knownUrls());
        while (job === activeJob && job.index < job.urls.length && !pauseRequested && account.userId() === userId) {
          const url = job.urls[job.index];
          try {
            if (known.has(url)) job.skipped++;
            else {
              const item = await account.importLink(url, userId);
              if (job !== activeJob) break;
              known.add(url);
              job.saved++;
              if (item.contentKind === 'unknown' || !['extracted','needs_review'].includes(item.status)) job.review++;
            }
            job.index++;
            persist();
          } catch (error) {
            if (job !== activeJob) break;
            job.phase = 'paused';
            job.error = error?.message || '게시물 저장이 중단됐어요. 다시 시도해 주세요.';
            persist();
            break;
          }
        }
        if (job !== activeJob) return;
        if (job.index === job.urls.length) { job.phase = 'done'; job.error = ''; persist(); finish(); }
        else if (job.phase === 'running') { job.phase = 'paused'; persist(); }
      } finally {
        running = false; pauseRequested = false;
        if (pendingAttach) { const next = pendingAttach; pendingAttach = null; attach(next); }
      }
    }
    function pause() { if (running) pauseRequested = true; else if (job?.phase === 'running') { job.phase = 'paused'; persist(); } }
    function forget() {
      if (!job || !userId) return false;
      pauseRequested = true;
      storage.removeItem(KEY + userId);
      job = null;
      notify();
      return true;
    }
    async function resume() {
      if (!job || job.phase === 'done') throw Error('이어 할 콘텐츠 저장이 없어요.');
      if (running) return;
      if (!account.loaded() || account.userId() !== userId) throw Error('같은 계정으로 로그인한 뒤 다시 시도해 주세요.');
      await account.refresh();
      if (!account.loaded() || account.userId() !== userId) throw Error('저장 목록을 불러오지 못했어요.');
      return run();
    }
    return Object.freeze({attach, start, resume, pause, forget, state, isRunning:() => running});
  }
  return createQueue;
});
