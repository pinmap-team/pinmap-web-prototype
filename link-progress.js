/* One progress window for single links, pasted links, and Instagram ZIP links. */
(() => {
  const stage = document.createElement('div');
  stage.className = 'dl-stage';
  stage.hidden = true;
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', '링크 가져오기 진행 상태');
  stage.innerHTML = `<div class="dl-card" id="dl-win"><div class="dl-full" id="dl-full">
      <div class="dl-link" data-open="false"><div class="dl-link-clip"><div class="dl-link-row">
        <div class="dl-field"><span class="dl-field-icon">${icon('link')}</span><textarea id="dl-link-input" rows="1" inputmode="url" aria-label="Instagram 링크 붙여넣기" placeholder="링크 붙여넣기"></textarea><span class="dl-file-label" hidden>ZIP 파일 선택</span>
          <span class="dl-photo-label" hidden>앨범에서 사진 선택</span><img class="dl-photo-thumb" alt="" hidden>
          <input id="dl-zip-input" class="dl-zip-input" type="file" accept=".zip,application/zip" aria-label="Instagram ZIP 파일 선택" tabindex="-1"><input id="dl-photo-input" class="dl-zip-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="캡처 이미지 선택" tabindex="-1"></div>

      </div><p class="dl-input-error" role="alert" hidden></p></div></div>
      <div class="dl-body" data-open="true"><div class="dl-body-clip"><div class="dl-head"><div class="dl-texts"><span class="dl-title t-text-swap" id="dl-title"></span><span class="dl-sub" aria-live="polite"><span class="t-text-swap" id="dl-done">0</span>개 처리</span></div>
        <button class="dl-btn t-resize" id="dl-btn" type="button"><span class="t-text-swap" id="dl-btn-label"></span></button>
        <button class="dl-transport" id="dl-transport" type="button" hidden aria-label="일시정지" data-state="pause"><svg class="dl-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg><svg class="dl-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg></button>
        <button class="dl-close" id="dl-close" type="button" aria-label="진행창 접기"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" aria-hidden="true"><path d="M6 18 18 6M6 6l12 12"/></svg></button></div>
      <div class="dl-bar" role="progressbar" aria-label="링크 처리 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="dl-bar-fill" id="dl-bar-fill"></span></div>
      <ul class="dl-list"></ul><p class="dl-error" role="alert" hidden></p>
    </div></div></div>      <button class="dl-input-close" type="button" aria-label="입력창 닫기"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button>
<button class="dl-ring" id="dl-ring" type="button" aria-label="진행창 펼치기" tabindex="-1">
      <svg class="dl-ring-svg" viewBox="0 0 64 64" aria-hidden="true"><circle class="dl-ring-track" cx="32" cy="32" r="26"/><circle class="dl-ring-prog" id="dl-ring-prog" cx="32" cy="32" r="26" pathLength="100"/></svg>
      <span class="dl-ring-center"><span class="dl-ring-pct" id="dl-ring-pct">0%</span></span>
      <span class="dl-ring-success t-success-check" data-state="out" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="currentColor"/><path d="M23 33l6 6 12-14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </button></div>`;
  document.body.append(stage);
  const get = selector => stage.querySelector(selector);
  const win = get('.dl-card'), full = get('.dl-full'), ring = get('.dl-ring');
  const linkPanel = get('.dl-link'), bodyPanel = get('.dl-body');
  const linkInput = get('#dl-link-input'), zipInput = get('#dl-zip-input'), photoInput = get('#dl-photo-input');
  const successCheck = get('.dl-ring-success');
  const successPath = successCheck.querySelector('path');
  successPath.style.setProperty('--success-path-length', String(Math.ceil(successPath.getTotalLength())));
  const rows = new Map();
  let current = null, identity = '', minTimer = 0, inputMode = null, inputPending = false, inputDismissed = false;
  let zipReadController = null;
  let inputMorphFrame = 0, inputMorphLayer = null;
  let inputCloseTimer = 0;
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
    win.classList.remove('is-min-settled');
    stage.classList.toggle('is-min', min);
    full.inert = min;
    ring.tabIndex = min ? 0 : -1;
    const expandedWidth = Math.min(320, Math.max(64, innerWidth - 48));
    win.style.width = (min ? 64 : expandedWidth) + 'px';
    if (!min) full.style.maxWidth = expandedWidth + 'px';
    const expandedHeight = full.offsetHeight;
    win.style.height = (min ? 64 : expandedHeight) + 'px';
    if (min) full.style.removeProperty('max-width');
    clearTimeout(minTimer);
    successCheck.dataset.state = 'out';
    const finish = () => {
      if (min && stage.classList.contains('is-min')) {
        win.classList.add('is-min-settled');
        if (ring.classList.contains('is-done')) successCheck.dataset.state = 'in';
      } else if (!min) { win.style.removeProperty('width'); win.style.removeProperty('height'); full.style.removeProperty('max-width'); }
    };
    if (reduced()) finish();
    else minTimer = setTimeout(finish, duration('--min-dur', 450) + 40);
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
  function drawLiquidNeck(path, ax, ay, ar, bx, by, br, radius) {
    const dx = bx - ax, dy = by - ay, distance = Math.hypot(dx, dy);
    const gap = distance - ar - br, maxGap = radius * 1.3;
    if (distance < 1 || ar < 1 || br < 1 || gap < 0 || gap >= maxGap) { path.setAttribute('d', ''); return; }
    const ux = dx / distance, uy = dy / distance, px = -uy, py = ux;
    const thickness = Math.min(ar, br) * .42 * (1 - gap / maxGap);
    const aX = ax + ux * ar * .7, aY = ay + uy * ar * .7;
    const bX = bx - ux * br * .7, bY = by - uy * br * .7;
    const c1X = ax + ux * (ar + gap * .35), c1Y = ay + uy * (ar + gap * .35);
    const c2X = bx - ux * (br + gap * .35), c2Y = by - uy * (br + gap * .35);
    path.setAttribute('d', `M${aX + px * thickness},${aY + py * thickness} C${c1X + px * thickness * .6},${c1Y + py * thickness * .6} ${c2X + px * thickness * .6},${c2Y + py * thickness * .6} ${bX + px * thickness},${bY + py * thickness} L${bX - px * thickness},${bY - py * thickness} C${c2X - px * thickness * .6},${c2Y - py * thickness * .6} ${c1X - px * thickness * .6},${c1Y - py * thickness * .6} ${aX - px * thickness},${aY - py * thickness} Z`);
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
    svg.innerHTML = `<g><path class="dl-goo-neck"/><circle class="dl-goo-source"/><circle class="dl-goo-drop"/><rect class="dl-goo-card"/></g>`;
    document.body.append(svg);
    inputMorphLayer = svg;
    const source = svg.querySelector('.dl-goo-source');
    const drop = svg.querySelector('.dl-goo-drop');
    const card = svg.querySelector('.dl-goo-card');
    const neck = svg.querySelector('.dl-goo-neck');
    const cx = origin.left + origin.width / 2, cy = origin.top + origin.height / 2;
    const radius = Math.min(origin.width, origin.height) / 2;
    const landingX = Math.max(target.left + radius, Math.min(cx, target.right - radius));
    const landingY = target.top + target.height / 2;
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
      drawLiquidNeck(neck, cx, cy, sourceRadius, dropX, dropY, dropRadius, radius);
      card.setAttribute('x', lerp(dropX - radius, target.left, grow));
      card.setAttribute('y', lerp(dropY - radius, target.top, grow));
      card.setAttribute('width', Math.max(0, lerp(radius * 2, target.width, grow)));
      card.setAttribute('height', Math.max(0, lerp(radius * 2, target.height, grow)));
      card.setAttribute('rx', lerp(radius, 24, grow));
      const surfaceMix = Math.round(smooth(Math.max(0, Math.min(1, (t - .3) / .5))) * 100);
      const fill = `color-mix(in srgb, var(--color-primary) ${100 - surfaceMix}%, var(--color-on-surface) ${surfaceMix}%)`;
      source.style.fill = fill;
      drop.style.fill = fill;
      card.style.fill = fill;
      neck.style.fill = fill;
      win.style.opacity = String(smooth(Math.max(0, Math.min(1, (t - .68) / .28))));
      svg.style.opacity = String(1 - smooth(Math.max(0, Math.min(1, (t - .75) / .25))));
      if (t < 1) inputMorphFrame = requestAnimationFrame(frame);
      else stopInputMorph();
    }
    inputMorphFrame = requestAnimationFrame(frame);
  }
  function animateInputTo(origin) {
    if (!origin?.width || reduced()) return false;
    stopInputMorph();
    const target = win.getBoundingClientRect();
    if (!target.width || !target.height) return false;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'dl-goo-morph');
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<g><path class="dl-goo-neck"/><circle class="dl-goo-source"/><circle class="dl-goo-drop"/><rect class="dl-goo-card"/></g>`;
    document.body.append(svg);
    inputMorphLayer = svg;
    const source = svg.querySelector('.dl-goo-source');
    const drop = svg.querySelector('.dl-goo-drop');
    const card = svg.querySelector('.dl-goo-card');
    const neck = svg.querySelector('.dl-goo-neck');
    const cx = origin.left + origin.width / 2, cy = origin.top + origin.height / 2;
    const radius = Math.min(origin.width, origin.height) / 2;
    const landingX = Math.max(target.left + radius, Math.min(cx, target.right - radius));
    const landingY = target.top + target.height / 2;
    const start = performance.now();
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const clamp = t => Math.max(0, Math.min(1, t));
    stage.style.pointerEvents = 'none';
    function frame(now) {
      if (inputMorphLayer !== svg || stage.hidden || !inputMode) { stopInputMorph(); return; }
      const t = clamp((now - start) / 430), u = 1 - t;
      const travel = smooth(clamp(u / .48));
      const grow = smooth(clamp((u - .38) / .62));
      const dropX = lerp(cx, landingX, travel), dropY = lerp(cy, landingY, travel);
      source.setAttribute('cx', cx); source.setAttribute('cy', cy);
      source.setAttribute('r', Math.max(0, radius * (1 - smooth(clamp((u - .2) / .42)))));
      drop.setAttribute('cx', dropX); drop.setAttribute('cy', dropY);
      drop.setAttribute('r', Math.max(0, radius * (1 - smooth(clamp((u - .5) / .42)))));
      drawLiquidNeck(neck, cx, cy, +source.getAttribute('r'), dropX, dropY, +drop.getAttribute('r'), radius);
      card.setAttribute('x', lerp(dropX - radius, target.left, grow));
      card.setAttribute('y', lerp(dropY - radius, target.top, grow));
      card.setAttribute('width', Math.max(0, lerp(radius * 2, target.width, grow)));
      card.setAttribute('height', Math.max(0, lerp(radius * 2, target.height, grow)));
      card.setAttribute('rx', lerp(radius, 24, grow));
      const surfaceMix = Math.round(smooth(clamp((u - .3) / .5)) * 100);
      const fill = `color-mix(in srgb, var(--color-primary) ${100 - surfaceMix}%, var(--color-on-surface) ${surfaceMix}%)`;
      source.style.fill = fill; drop.style.fill = fill; card.style.fill = fill; neck.style.fill = fill;
      win.style.opacity = String(1 - smooth(clamp(t / .22)));
      svg.style.opacity = String(smooth(clamp(t / .18)) * (1 - smooth(clamp((t - .82) / .18))));
      if (t < 1) inputMorphFrame = requestAnimationFrame(frame);
    }
    inputMorphFrame = requestAnimationFrame(frame);
    return true;
  }
  function open(kind = 'links', prefill = '', origin = null, linkCenterY = null) {
    clearTimeout(inputCloseTimer);
    stage.classList.remove('is-input-closing');
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
    if (window.PinmapSaveProgress?.isActive()) {
      inputMode = null;
      update();
      return;
    }
    inputMode = kind === 'zip' ? 'zip' : kind === 'photo' ? 'photo' : 'links';
    stage.style.setProperty('--dl-input-link-center', Number.isFinite(linkCenterY) ? `${linkCenterY}px` : 'calc(100dvh - 162px)');
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
    get('.dl-field-icon').innerHTML = icon(inputMode === 'zip' ? 'folder' : inputMode === 'photo' ? 'galleryAdd' : 'link');
    get('.dl-photo-label').hidden = inputMode !== 'photo';
    get('.dl-photo-thumb').hidden = true;
    get('.dl-field').classList.toggle('is-photo', inputMode === 'photo');
    get('.dl-field').setAttribute('role', inputMode === 'links' ? 'group' : 'button');
    get('.dl-field').tabIndex = inputMode === 'links' ? -1 : 0;
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
    get('.dl-field').classList.remove('is-pending');
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
    get('.dl-field').classList.add('is-pending');
    inputError();
    try { await window.PinmapSubmitLinks(linkInput.value); }
    catch (error) { if (inputMode) inputError(error.message || '링크를 확인해 주세요.'); }
    finally { inputPending = false; get('.dl-field').classList.remove('is-pending'); }
  }
  async function submitZip(file) {
    if (inputPending || inputMode !== 'zip' || !file) return;
    inputPending = true;
    zipReadController = new AbortController();
    const controller = zipReadController;
    get('.dl-field').classList.add('is-pending');
    get('.dl-file-label').textContent = file.name;
    get('.dl-field').classList.add('is-filled');
    inputError();
    try { await window.PinmapStartZipFile(file, controller.signal); }
    catch (error) { if (inputMode && !stage.classList.contains('is-input-closing')) inputError(error.message || 'ZIP 파일을 확인해 주세요.'); }
    finally { if (zipReadController === controller) zipReadController = null; inputPending = false; get('.dl-field').classList.remove('is-pending'); }
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
    get('.dl-field').classList.add('is-pending');
    photoName = file.name;
    photoPreviewUrl = URL.createObjectURL(file);
    const thumb = get('.dl-photo-thumb');
    thumb.src = photoPreviewUrl;
    thumb.hidden = false;
    get('.dl-photo-label').textContent = file.name;
    get('.dl-field').classList.add('is-filled');
    inputError();
    try {
      const image = await preparePhoto(file);
      await new Promise(resolve => setTimeout(resolve, reduced() ? 0 : duration('--acc-dur',250)));
      if (!window.PinmapCaptureSave) throw Error('사진 분석과 저장은 로그인 후 사용할 수 있어요.');
      await window.PinmapCaptureSave(image, crypto.randomUUID());
    } catch (error) { if (inputMode) inputError(error.message || '사진을 확인해 주세요.'); }
    finally { inputPending = false; get('.dl-field').classList.remove('is-pending'); }
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
        status:single.phase === 'done' ? 'saved' : ['paused','failed'].includes(single.phase) ? 'paused' : 'running'}],
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
    if (!state) { identity = ''; win.classList.remove('is-success'); return; }
    const nextIdentity = state.kind === 'single' ? `single:${single.started}` : `batch:${state.name}:${state.total}`;
    if (identity !== nextIdentity) {
      identity = nextIdentity;
      rows.clear(); get('.dl-list').replaceChildren();
      win.classList.remove('is-min', 'is-min-settled'); stage.classList.remove('is-min'); full.inert = false; ring.tabIndex = -1;
      win.style.removeProperty('width'); win.style.removeProperty('height');
    }
    const done = state.phase === 'done' && (state.kind === 'single' || state.saved > 0);
    win.classList.toggle('is-success', done);
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
    successCheck.dataset.state = done && win.classList.contains('is-min-settled') ? 'in' : 'out';
    const error = get('.dl-error'); error.hidden = !state.error; error.textContent = state.error || '';
    const controllable = state.kind === 'single' || state.kind === 'batch';
    const transport = get('.dl-transport');
    transport.hidden = !controllable || state.phase === 'done';
    transport.dataset.state = ['paused','failed'].includes(state.phase) ? 'play' : 'pause';
    transport.setAttribute('aria-label', ['paused','failed'].includes(state.phase) ? '작업 재생' : '작업 일시정지');
    get('#dl-btn').hidden = controllable && state.phase !== 'done';
    get('.dl-close').setAttribute('aria-label', state.phase === 'done' ? '진행창 닫기' : '작업 즉시 취소');
    button(state.phase === 'done' ? '닫기' : state.phase === 'paused' ? '이어하기' : '진행 중', state.phase === 'running');
  }
  function controlledJob() {
    return current?.kind === 'single' ? window.PinmapSaveProgress : window.PinmapZipImport;
  }
  get('.dl-close').addEventListener('click', () => {
    if (!current) return;
    controlledJob()?.[current.kind === 'single' ? 'clear' : 'forget']();
    inputDismissed = false;
    update();
    document.querySelector('.home-add-fab')?.focus({preventScroll:true});
  });
  get('.dl-transport').addEventListener('click', () => {
    if (!current || current.phase === 'done') return;
    const job = controlledJob();
    if (current.phase === 'running') job?.pause();
    else if (['paused','failed'].includes(current.phase)) void job?.resume().catch(error => {
      const node = get('.dl-error'); node.hidden = false; node.textContent = error.message;
    });
    update();
  });
  document.addEventListener('pointerdown', event => {
    if (stage.hidden || stage.contains(event.target)) return;
    if (inputMode) { closeInput(); return; }
    if (stage.classList.contains('is-min') || !current) return;
    minimize(true);
  });
  function closeInput() {
    if (!inputMode || stage.classList.contains('is-input-closing') || (inputPending && inputMode !== 'zip')) return;
    stopInputMorph();
    zipReadController?.abort();
    const closingMode = inputMode;
    const focusedInside = stage.contains(document.activeElement);
    const addButton = document.querySelector('.home-add-fab');
    const addRect = addButton?.getBoundingClientRect();
    const finish = () => {
      stopInputMorph();
      stage.classList.remove('is-input-closing');
      if (inputMode !== closingMode) return;
      inputMode = null;
      inputDismissed = true;
      update();
      if (focusedInside) document.querySelector('.home-add-fab')?.focus({preventScroll:true});
    };
    stage.classList.add('is-input-closing');
    if (!animateInputTo(addRect)) { finish(); return; }
    clearTimeout(inputCloseTimer);
    inputCloseTimer = setTimeout(finish, 430);
  }
  ring.addEventListener('click', () => minimize(false,true));
  get('.dl-input-close').addEventListener('click', closeInput);
  get('.dl-field').addEventListener('click', () => {
    if (inputPending) return;
    if (inputMode === 'zip') zipInput.click();
    else if (inputMode === 'photo') photoInput.click();
    else linkInput.focus();
  });
  get('.dl-field').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (inputMode === 'zip' || inputMode === 'photo') { event.preventDefault(); (inputMode === 'zip' ? zipInput : photoInput).click(); }
  });
  linkInput.addEventListener('input', () => {
    get('.dl-field').classList.toggle('is-filled', Boolean(linkInput.value.trim()));
  });
  linkInput.addEventListener('paste', () => setTimeout(() => { if (inputMode === 'links') void submitLinks(); }, 0));
  linkInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitLinks(); }
  });
  zipInput.addEventListener('change', () => void submitZip(zipInput.files?.[0]));
  photoInput.addEventListener('change', () => void submitPhoto(photoInput.files?.[0]));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && inputMode && (!inputPending || inputMode === 'zip')) closeInput();
  });
  get('#dl-btn').addEventListener('click', () => {
    if (!current) return;
    if (current.phase === 'done') controlledJob()?.[current.kind === 'single' ? 'clear' : 'forget']();
    update();
  });
  window.addEventListener('pinmap:save-progress', update);
  window.addEventListener('pinmap:zip-progress', update);
  window.PinmapLinkProgress = Object.freeze({open});
  update();
})();
