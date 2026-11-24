/* One progress window for single links, pasted links, and Instagram ZIP links. */
(() => {
  const stage = document.createElement('div');
  stage.className = 'dl-stage';
  stage.hidden = true;
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', '링크 가져오기 진행 상태');
  stage.innerHTML = `<div class="dl-card" id="dl-win"><div class="dl-full" id="dl-full">
      <div class="dl-link" data-open="false"><div class="dl-link-clip"><div class="dl-input-head"><button class="dl-input-close" type="button" aria-label="입력창 닫기"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="dl-link-row">
        <label class="dl-field"><textarea id="dl-link-input" rows="1" inputmode="url" aria-label="Instagram 링크 붙여넣기" placeholder="링크 붙여넣기"></textarea><span class="dl-file-label" hidden>ZIP 파일 선택</span>
          <svg class="dl-field-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" aria-hidden="true" hidden><path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
          <span class="dl-photo-label" hidden>앨범에서 사진 선택</span><img class="dl-photo-thumb" alt="" hidden>
          <input id="dl-zip-input" class="dl-zip-input" type="file" accept=".zip,application/zip" aria-label="Instagram ZIP 파일 선택" tabindex="-1"><input id="dl-photo-input" class="dl-zip-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="캡처 이미지 선택" tabindex="-1"></label>
        <button class="dl-btn dl-paste" id="dl-paste" type="button"><span class="t-text-swap" id="dl-paste-label">붙여넣기</span></button>
      </div><p class="dl-input-error" role="alert" hidden></p></div></div>
      <div class="dl-body" data-open="true"><div class="dl-body-clip"><div class="dl-head"><div class="dl-texts"><span class="dl-title t-text-swap" id="dl-title"></span><span class="dl-sub" aria-live="polite"><span class="t-text-swap" id="dl-done">0</span>개 처리</span></div>
        <button class="dl-btn t-resize" id="dl-btn" type="button"><span class="t-text-swap" id="dl-btn-label"></span></button>
        <button class="dl-transport" id="dl-transport" type="button" hidden aria-label="일시정지" data-state="pause"><svg class="dl-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><svg class="dl-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg></button>
        <button class="dl-close" id="dl-close" type="button" aria-label="진행창 접기"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" aria-hidden="true"><path d="M6 18 18 6M6 6l12 12"/></svg></button></div>
      <div class="dl-bar" role="progressbar" aria-label="링크 처리 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="dl-bar-fill" id="dl-bar-fill"></span></div>
      <ul class="dl-list"></ul><p class="dl-error" role="alert" hidden></p>
    </div></div></div><button class="dl-ring" id="dl-ring" type="button" aria-label="진행창 펼치기" tabindex="-1">
      <svg class="dl-ring-svg" viewBox="0 0 64 64" aria-hidden="true"><circle class="dl-ring-track" cx="32" cy="32" r="26"/><circle class="dl-ring-prog" id="dl-ring-prog" cx="32" cy="32" r="26" pathLength="100"/></svg>
      <span class="dl-ring-center"><span class="dl-ring-pct" id="dl-ring-pct">0%</span><span class="dl-ring-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" aria-hidden="true"><path d="M5.25 12.7033 9.40385 17.37 18.75 6.87"/></svg></span></span>
    </button></div>`;
  document.body.append(stage);
  const get = selector => stage.querySelector(selector);
  const win = get('.dl-card'), full = get('.dl-full'), ring = get('.dl-ring');
  const linkPanel = get('.dl-link'), bodyPanel = get('.dl-body');
  const linkInput = get('#dl-link-input'), zipInput = get('#dl-zip-input'), photoInput = get('#dl-photo-input');
  const rows = new Map();
  let current = null, identity = '', minTimer = 0, inputMode = null, inputPending = false, inputDismissed = false;
  let deletePending = false, resumeAfterDeleteDismiss = false;
  let zipReadController = null;
  let inputMorphFrame = 0, inputMorphLayer = null;
  let photoName = '', photoPreviewUrl = '';
  const duration = (name, fallback) => {
    const raw = getComputedStyle(stage).getPropertyValue(name).trim();
    const number = parseFloat(raw);
    return Number.isFinite(number) ? (raw.endsWith('ms') ? number : raw.endsWith('s') ? number * 1000 : number) : fallback;
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function swapText(node, next, instant = false) {
    if (!node || node.dataset.text === next || (node.dataset.text === undefined && node.textContent === next)) return;
    node.dataset.text = next;
    clearTimeout(node._swapTimer);
    if (instant || reduced() || !node.textContent) {
      node.classList.remove('is-exit', 'is-enter-start');
      node.textContent = next;
      return;
    }
    node.classList.remove('is-enter-start');
    node.classList.add('is-exit');
    node._swapTimer = setTimeout(() => {
      if (!node.isConnected) return;
      node.textContent = node.dataset.text;
      node.classList.remove('is-exit');
      node.classList.add('is-enter-start');
      void node.offsetHeight;
      node.classList.remove('is-enter-start');
    }, duration('--text-swap-dur', 150));
  }
  function button(label, disabled) {
    const node = get('#dl-btn'), text = get('#dl-btn-label');
    const oldWidth = node.getBoundingClientRect().width;
    node.disabled = disabled;
    if (text.dataset.text === label) return;
    node.style.width = oldWidth + 'px';
    swapText(text, label, label === '이어하기');
    clearTimeout(node._resizeTimer);
    node._resizeTimer = setTimeout(() => {
      if (!node.isConnected) return;
      node.style.width = text.offsetWidth + 24 + 'px';
      node._resizeTimer = setTimeout(() => node.style.removeProperty('width'), duration('--resize-dur', 300) + 40);
    }, duration('--text-swap-dur', 150) + 20);
  }
  function minimize(min, focus = false) {
    const rect = win.getBoundingClientRect();
    win.style.width = rect.width + 'px';
    win.style.height = rect.height + 'px';
    void win.offsetWidth;
    win.classList.toggle('is-min', min);
    stage.classList.toggle('is-min', min);
    full.inert = min;
    ring.tabIndex = min ? 0 : -1;
    win.style.width = (min ? 64 : 320) + 'px';
    win.style.height = (min ? 64 : full.offsetHeight) + 'px';
    clearTimeout(minTimer);
    minTimer = setTimeout(() => {
      if (!min) { win.style.removeProperty('width'); win.style.removeProperty('height'); }
    }, duration('--min-dur', 450) + 40);
    if (focus) (min ? ring : get('.dl-close')).focus({preventScroll:true});
  }
  function setBadge(row, status) {
    const badge = row.querySelector('.t-check-badge');
    const next = ['saved','review'].includes(status) ? 'done' : status === 'running' ? 'spinning' : 'queued';
    if (badge.dataset.state === next) return;
    badge.dataset.state = next;
    const wrap = row.querySelector('.t-check-blur-wrap');
    clearTimeout(wrap._blurTimer);
    if (next === 'queued' || reduced()) return;
    wrap.classList.add('is-crossing');
    wrap._blurTimer = setTimeout(() => wrap.classList.remove('is-crossing'), duration('--check-fill-dur',350) * .45);
  }
  const labels = {queued:'대기 중',running:'분석 중',saved:'저장됨',review:'검토 필요',skipped:'중복 건너뜀',processed:'처리됨',paused:'일시정지'};
  function rowName(entry) {
    if (entry.label) return entry.label;
    try { const url = new URL(entry.url); return `${url.hostname.replace(/^www\./,'')}${url.pathname}`; }
    catch { return `링크 ${entry.index + 1}`; }
  }
  function inputError(message = '') {
    const node = get('.dl-input-error');
    node.textContent = message;
    node.hidden = !message;
  }
  function stopInputMorph() {
    cancelAnimationFrame(inputMorphFrame);
    inputMorphLayer?.remove();
    inputMorphLayer = null;
    win.style.removeProperty('opacity');
    stage.style.removeProperty('pointer-events');
  }
  function animateInputFrom(origin) {
    if (!origin?.width || reduced()) return;
    stopInputMorph();
    const target = win.getBoundingClientRect();
    if (!target.width || !target.height) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'dl-goo-morph');
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs><filter id="dl-input-goo-filter" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7.8" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs><g filter="url(#dl-input-goo-filter)"><circle class="dl-goo-source"/><circle class="dl-goo-drop"/><rect class="dl-goo-card"/></g>`;
    document.body.append(svg);
    inputMorphLayer = svg;
    const source = svg.querySelector('.dl-goo-source');
    const drop = svg.querySelector('.dl-goo-drop');
    const card = svg.querySelector('.dl-goo-card');
    const cx = origin.left + origin.width / 2, cy = origin.top + origin.height / 2;
    const radius = Math.min(origin.width, origin.height) / 2;
    const landingX = Math.max(target.left + radius, Math.min(cx, target.right - radius));
    const landingY = target.bottom - radius * .5;
    const start = performance.now();
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    win.style.opacity = '0';
    stage.style.pointerEvents = 'none';
    function frame(now) {
      if (inputMorphLayer !== svg || stage.hidden || !inputMode) { stopInputMorph(); return; }
      const t = Math.min(1, (now - start) / 430);
      const travel = smooth(Math.min(1, t / .48));
      const grow = smooth(Math.max(0, Math.min(1, (t - .38) / .62)));
      const dropX = lerp(cx, landingX, travel), dropY = lerp(cy, landingY, travel);
      const sourceRadius = radius * (1 - smooth(Math.max(0, Math.min(1, (t - .2) / .42))));
      const dropRadius = radius * (1 - smooth(Math.max(0, Math.min(1, (t - .5) / .42))));
      source.setAttribute('cx', cx);
      source.setAttribute('cy', cy);
      source.setAttribute('r', Math.max(0, sourceRadius));
      drop.setAttribute('cx', dropX);
      drop.setAttribute('cy', dropY);
      drop.setAttribute('r', Math.max(0, dropRadius));
      card.setAttribute('x', lerp(dropX - radius, target.left, grow));
      card.setAttribute('y', lerp(dropY - radius, target.top, grow));
      card.setAttribute('width', Math.max(0, lerp(radius * 2, target.width, grow)));
      card.setAttribute('height', Math.max(0, lerp(radius * 2, target.height, grow)));
      card.setAttribute('rx', lerp(radius, 24, grow));
      const surfaceMix = Math.round(smooth(Math.max(0, Math.min(1, (t - .3) / .5))) * 100);
      const fill = `color-mix(in srgb, var(--color-primary) ${100 - surfaceMix}%, var(--color-surface) ${surfaceMix}%)`;
      source.style.fill = fill;
      drop.style.fill = fill;
      card.style.fill = fill;
      win.style.opacity = String(smooth(Math.max(0, Math.min(1, (t - .68) / .28))));
      svg.style.opacity = String(1 - smooth(Math.max(0, Math.min(1, (t - .75) / .25))));
      if (t < 1) inputMorphFrame = requestAnimationFrame(frame);
      else stopInputMorph();
    }
    inputMorphFrame = requestAnimationFrame(frame);
  }
  function open(kind = 'links', prefill = '', origin = null) {
    stopInputMorph();
    const batch = window.PinmapZipImport?.state();
    if (batch && batch.phase !== 'done') {
      inputMode = null;
      inputDismissed = false;
      stage.classList.remove('is-min');
      win.classList.remove('is-min');
      full.inert = false;
      ring.tabIndex = -1;
      update();
      return;
    }
    if (window.PinmapSaveProgress?.isRunning()) {
      inputMode = null;
      update();
      return;
    }
    inputMode = kind === 'zip' ? 'zip' : kind === 'photo' ? 'photo' : 'links';
    inputPending = false;
    inputDismissed = false;
    identity = '';
    stage.hidden = false;
    stage.classList.remove('is-min');
    win.classList.remove('is-min');
    win.style.removeProperty('width'); win.style.removeProperty('height');
    full.inert = false; ring.tabIndex = -1;
    linkInput.hidden = inputMode !== 'links';
    get('.dl-file-label').hidden = inputMode !== 'zip';
    get('.dl-field-icon').toggleAttribute('hidden', inputMode !== 'photo');
    get('.dl-photo-label').hidden = inputMode !== 'photo';
    get('.dl-photo-thumb').hidden = true;
    get('.dl-field').classList.toggle('is-photo', inputMode === 'photo');
    zipInput.disabled = inputMode !== 'zip';
    photoInput.disabled = inputMode !== 'photo';
    zipInput.value = '';
    photoInput.value = '';
    photoName = '';
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    photoPreviewUrl = '';
    get('.dl-photo-thumb').removeAttribute('src');
    get('.dl-photo-label').textContent = '앨범에서 사진 선택';
    get('.dl-file-label').textContent = 'ZIP 파일 선택';
    linkInput.value = prefill;
    get('.dl-field').classList.toggle('is-filled', Boolean(prefill));
    swapText(get('#dl-paste-label'), inputMode === 'zip' ? '파일 선택' : inputMode === 'photo' ? '선택' : prefill ? '가져오기' : '붙여넣기');
    get('.dl-paste').disabled = false;
    inputError();
    update();
    if (origin) animateInputFrom(origin);
    if (inputMode === 'links') linkInput.focus({preventScroll:true});
  }
  async function submitLinks() {
    if (inputPending || inputMode !== 'links') return;
    if (!linkInput.value.trim()) {
      try { linkInput.value = await navigator.clipboard.readText(); }
      catch { linkInput.focus(); return; }
    }
    if (!linkInput.value.trim()) { linkInput.focus(); return; }
    inputPending = true;
    get('.dl-paste').disabled = true;
    inputError();
    try { await window.PinmapSubmitLinks(linkInput.value); }
    catch (error) { if (inputMode) inputError(error.message || '링크를 확인해 주세요.'); }
    finally { inputPending = false; get('.dl-paste').disabled = false; }
  }
  async function submitZip(file) {
    if (inputPending || inputMode !== 'zip' || !file) return;
    inputPending = true;
    zipReadController = new AbortController();
    const controller = zipReadController;
    get('.dl-paste').disabled = true;
    get('.dl-file-label').textContent = file.name;
    get('.dl-field').classList.add('is-filled');
    swapText(get('#dl-paste-label'), '확인 중');
    inputError();
    try { await window.PinmapStartZipFile(file, controller.signal); }
    catch (error) { if (inputMode) inputError(error.message || 'ZIP 파일을 확인해 주세요.'); }
    finally { if (zipReadController === controller) zipReadController = null; inputPending = false; get('.dl-paste').disabled = false; }
  }
  async function preparePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const photo = new Image();
      photo.src = url;
      await photo.decode();
      const ratio = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * ratio));
      canvas.getContext('2d').drawImage(photo, 0, 0, canvas.width, canvas.height);
      for (const quality of [.82, .68, .5]) {
        const image = canvas.toDataURL('image/jpeg', quality);
        if (image.length <= 2700000) return image;
      }
      throw Error('이미지가 너무 커요. 더 작은 사진을 선택해 주세요.');
    } finally { URL.revokeObjectURL(url); }
  }
  async function submitPhoto(file) {
    if (inputPending || inputMode !== 'photo' || !file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      inputError('PNG, JPG, WebP 이미지(10MB 이하)를 선택해 주세요.');
      photoInput.value = '';
      return;
    }
    inputPending = true;
    get('.dl-paste').disabled = true;
    photoName = file.name;
    photoPreviewUrl = URL.createObjectURL(file);
    const thumb = get('.dl-photo-thumb');
    thumb.src = photoPreviewUrl;
    thumb.hidden = false;
    get('.dl-photo-label').textContent = file.name;
    get('.dl-field').classList.add('is-filled');
    swapText(get('#dl-paste-label'), '선택됨');
    inputError();
    try {
      const image = await preparePhoto(file);
      await new Promise(resolve => setTimeout(resolve, reduced() ? 0 : duration('--acc-dur',250)));
      if (!window.PinmapCaptureSave) throw Error('사진 분석·저장은 로그인 후 사용할 수 있어요.');
      await window.PinmapCaptureSave(image, crypto.randomUUID());
    } catch (error) { if (inputMode) inputError(error.message || '사진을 확인해 주세요.'); }
    finally { inputPending = false; get('.dl-paste').disabled = false; }
  }
  function renderRows(entries) {
    const list = get('.dl-list');
    const visible = new Set();
    for (const entry of entries) {
      visible.add(entry.index);
      let row = rows.get(entry.index);
      if (!row) {
        row = document.createElement('li');
        row.className = 'dl-row';
        row.innerHTML = `${window.PinmapCheckMorph.markup('queued')}<span class="dl-name"></span><span class="dl-meta t-text-swap"></span>`;
        const mark = row.querySelector('.t-check-mark');
        row.querySelector('.t-check-badge').style.setProperty('--check-mark-len', String(Math.ceil(mark.getTotalLength())));
        rows.set(entry.index, row);
      }
      row.querySelector('.dl-name').textContent = rowName(entry);
      row.querySelector('.t-check-badge').setAttribute('aria-label', labels[entry.status] || '처리 상태');
      setBadge(row, entry.status);
      swapText(row.querySelector('.dl-meta'), labels[entry.status] || '대기 중');
      list.append(row);
    }
    for (const [key,row] of rows) if (!visible.has(key)) { row.remove(); rows.delete(key); }
  }
  function update() {
    const single = window.PinmapSaveProgress?.state();
    const batch = window.PinmapZipImport?.state();
    const showSingle = single && (single.phase === 'running' || !batch || batch.phase === 'done');
    const state = showSingle ? {kind:'single',source:single.kind,phase:single.phase,total:1,processed:single.phase === 'done' ? 1 : 0,
      entries:[{index:0,url:document.querySelector('#saveform #es-url')?.value || '',
        label:single.kind === 'capture' ? photoName || '캡처 이미지' : '',
        status:single.phase === 'done' ? 'saved' : single.phase === 'failed' ? 'paused' : 'running'}],
      error:single.error || ''} : batch ? {...batch,kind:'batch'} : null;
    const enteredProgress = inputMode && inputPending && state?.phase === 'running' &&
      (inputMode === 'photo' ? state.kind === 'single' && state.source === 'capture' :
        inputMode === 'zip' ? state.kind === 'batch' && state.source === 'zip' :
        state.kind === 'single' && state.source === 'link' || state.kind === 'batch' && state.source === 'links');
    if (enteredProgress) { inputMode = null; inputDismissed = false; }
    stage.classList.toggle('is-input', Boolean(inputMode));
    stage.hidden = inputDismissed || (!state && !inputMode);
    current = state;
    linkPanel.dataset.open = inputMode ? 'true' : 'false';
    bodyPanel.dataset.open = inputMode ? 'false' : 'true';
    if (inputMode) return;
    if (!state) { identity = ''; return; }
    const nextIdentity = state.kind === 'single' ? `single:${single.started}` : `batch:${state.name}:${state.total}`;
    if (identity !== nextIdentity) {
      identity = nextIdentity;
      rows.clear(); get('.dl-list').replaceChildren();
      win.classList.remove('is-min'); stage.classList.remove('is-min'); full.inert = false; ring.tabIndex = -1;
      win.style.removeProperty('width'); win.style.removeProperty('height');
    }
    const done = state.phase === 'done' && (state.kind === 'single' || state.saved > 0);
    const processed = Math.min(state.total, state.processed);
    const percent = state.phase === 'done' ? 100 : Math.round(processed / Math.max(1,state.total) * 100);
    const subject = state.source === 'capture' ? '캡처' : '링크';
    const title = state.kind === 'batch' ? state.phase === 'done' ? `링크 ${state.total}개 처리 완료`
      : state.phase === 'paused' ? '링크 처리 일시정지' : `링크 ${state.total}개 처리 중`
      : state.phase === 'done' ? `${subject} 저장 완료` : state.phase === 'failed'
      ? `${subject} 저장 중단` : `${subject} 저장 중`;
    swapText(get('#dl-title'), title);
    swapText(get('#dl-done'), `${processed}/${state.total}`);
    renderRows(state.entries);
    get('.dl-bar').setAttribute('aria-valuenow', String(percent));
    get('.dl-bar-fill').style.transform = `scaleX(${percent / 100})`;
    get('.dl-ring-prog').style.strokeDashoffset = String(100 - percent);
    get('.dl-ring-pct').textContent = `${percent}%`;
    ring.classList.toggle('is-done', done);
    const error = get('.dl-error'); error.hidden = !state.error; error.textContent = state.error || '';
    const zipJob = state.kind === 'batch' && state.source === 'zip';
    const transport = get('.dl-transport');
    transport.hidden = !zipJob || state.phase === 'done';
    transport.dataset.state = state.phase === 'paused' ? 'play' : 'pause';
    transport.setAttribute('aria-label', state.phase === 'paused' ? 'ZIP 작업 재생' : 'ZIP 작업 일시정지');
    get('#dl-btn').hidden = zipJob && state.phase !== 'done';
    get('.dl-close').setAttribute('aria-label', zipJob ? 'ZIP 작업 삭제' : '진행창 접기');
    button(state.kind === 'single' ? (state.phase === 'running' ? '진행 중' : '닫기')
      : state.phase === 'paused' ? '이어하기' : state.phase === 'running' ? '일시정지' : '닫기',
      state.kind === 'single' && state.phase === 'running');
  }
  function deleteZipJob() {
    window.PinmapZipImport?.forget();
    inputDismissed = false;
    update();
    document.querySelector('.home-add-fab')?.focus({preventScroll:true});
  }
  actions.zipdeleteyes = () => {
    if (!deletePending) return;
    deletePending = false;
    resumeAfterDeleteDismiss = false;
    document.getElementById('sheet')?.close();
    deleteZipJob();
  };
  document.getElementById('sheet')?.addEventListener('close', () => {
    if (!deletePending) return;
    deletePending = false;
    if (!resumeAfterDeleteDismiss) return;
    resumeAfterDeleteDismiss = false;
    void window.PinmapZipImport?.resume().catch(error => {
      const node = get('.dl-error');
      node.hidden = false;
      node.textContent = error.message;
    });
  });
  get('.dl-close').addEventListener('click', () => {
    if (current?.kind !== 'batch' || current.source !== 'zip') { minimize(true,true); return; }
    resumeAfterDeleteDismiss = current.phase === 'running';
    if (resumeAfterDeleteDismiss) window.PinmapZipImport?.pause();
    deletePending = true;
    confirmPop('ZIP 작업을 삭제할까요?', '진행 기록이 삭제돼요. 이미 저장된 콘텐츠는 그대로 남아요.', 'zipdeleteyes', '작업 삭제', '계속하기');
  });
  get('.dl-transport').addEventListener('click', () => {
    if (current?.kind !== 'batch' || current.source !== 'zip') return;
    if (current.phase === 'running') window.PinmapZipImport?.pause();
    else if (current.phase === 'paused') void window.PinmapZipImport?.resume().catch(error => {
      const node = get('.dl-error'); node.hidden = false; node.textContent = error.message;
    });
    update();
  });
  document.addEventListener('pointerdown', event => {
    if (stage.hidden || stage.classList.contains('is-min') || !current || inputMode || deletePending || stage.contains(event.target)) return;
    minimize(true);
  });
  function closeInput() {
    if (!inputMode || (inputPending && inputMode !== 'zip')) return;
    stopInputMorph();
    zipReadController?.abort();
    inputMode = null;
    inputDismissed = true;
    update();
  }
  get('.dl-input-close').addEventListener('click', closeInput);
  ring.addEventListener('click', () => minimize(false,true));
  get('.dl-paste').addEventListener('click', () => {
    if (inputMode === 'zip') zipInput.click();
    else if (inputMode === 'photo') photoInput.click();
    else void submitLinks();
  });
  linkInput.addEventListener('input', () => {
    get('.dl-field').classList.toggle('is-filled', Boolean(linkInput.value.trim()));
    swapText(get('#dl-paste-label'), linkInput.value.trim() ? '가져오기' : '붙여넣기');
  });
  linkInput.addEventListener('paste', () => setTimeout(() => { if (inputMode === 'links') void submitLinks(); }, 0));
  linkInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void submitLinks(); }
  });
  zipInput.addEventListener('change', () => void submitZip(zipInput.files?.[0]));
  photoInput.addEventListener('change', () => void submitPhoto(photoInput.files?.[0]));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && inputMode && !inputPending) closeInput();
  });
  get('#dl-btn').addEventListener('click', () => {
    if (!current) return;
    if (current.kind === 'batch') {
      if (current.phase === 'running') window.PinmapZipImport.pause();
      else if (current.phase === 'paused') void window.PinmapZipImport.resume().catch(error => { get('.dl-error').hidden = false; get('.dl-error').textContent = error.message; });
      else window.PinmapZipImport.forget();
    } else if (current.phase !== 'running') window.PinmapSaveProgress.clear();
    update();
  });
  window.addEventListener('pinmap:save-progress', update);
  window.addEventListener('pinmap:zip-progress', update);
  window.PinmapLinkProgress = Object.freeze({open});
  update();
})();
