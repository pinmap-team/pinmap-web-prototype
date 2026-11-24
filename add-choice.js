// The lower-right add buttons choose an input method.
(() => {
  const sheet = document.getElementById('sheet');
  let openTimer;
  let screenshotPreviewUrl;
  let captureId;
  let uploadCloseTimer;
  let uploadReader;
  const uploadSwapTimers = new WeakMap();
  const uploadReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function swapUploadText(node, value) {
    if (!node || node.textContent === value) return;
    clearTimeout(uploadSwapTimers.get(node));
    node.classList.remove('is-exit', 'is-enter-start');
    if (uploadReducedMotion()) { node.textContent = value; return; }
    node.classList.add('is-exit');
    uploadSwapTimers.set(node, setTimeout(() => {
      if (!node.isConnected) return;
      node.textContent = value;
      node.classList.remove('is-exit');
      node.classList.add('is-enter-start');
      void node.offsetHeight;
      node.classList.remove('is-enter-start');
    }, 150));
  }
  function uploadProgress(form, percent) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    const bar = form.querySelector('.pm-upload-bar');
    if (bar) { bar.setAttribute('aria-valuenow', String(value)); bar.querySelector('span').style.transform = `scaleX(${value / 100})`; }
    const count = form.querySelector('.pm-upload-percent');
    if (count) count.textContent = `${value}%`;
  }
  function uploadPhase(form, phase, status) {
    const zone = form.querySelector('.pm-upload-zone');
    if (!zone) return;
    zone.dataset.phase = phase;
    zone.querySelector('.pm-upload-drop').setAttribute('aria-hidden', String(phase !== 'idle'));
    zone.querySelector('.pm-upload-file').setAttribute('aria-hidden', String(phase === 'idle'));
    zone.querySelector('.pm-upload-icon-swap').dataset.state = phase === 'done' || phase === 'analyzing' ? 'b' : 'a';
    zone.querySelector('input[type="file"]').disabled = phase === 'reading' || phase === 'analyzing';
    swapUploadText(form.querySelector('.pm-upload-file-status'), status || (phase === 'done' ? '파일 준비 완료' : phase === 'reading' ? '파일 읽는 중' : '선택됨'));
    const button = form.querySelector('.pm-upload-submit');
    if (button) {
      button.disabled = phase !== 'selected';
      swapUploadText(button.querySelector('.pm-upload-button-label'), phase === 'reading' ? '파일 읽는 중' : phase === 'analyzing' ? '분석 중' : phase === 'done' ? '준비 완료' : '분석하고 저장');
    }
  }
  function selectedUploadFile(form, file) {
    if (!form || !file) return;
    form.querySelector('.pm-upload-name').textContent = file.name;
    form.querySelector('.pm-upload-size').textContent = file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    uploadProgress(form, 0);
    uploadPhase(form, 'selected', '선택됨');
  }
  function readUploadFile(file, form) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      uploadReader = reader;
      reader.onprogress = event => { if (event.lengthComputable) uploadProgress(form, 100 * event.loaded / event.total); };
      reader.onload = () => { if (uploadReader === reader) uploadReader = null; resolve(new Uint8Array(reader.result)); };
      reader.onerror = () => { if (uploadReader === reader) uploadReader = null; reject(Error('파일을 읽지 못했어요. 다시 선택해 주세요.')); };
      reader.onabort = () => { if (uploadReader === reader) uploadReader = null; reject(Error('파일 읽기를 취소했어요.')); };
      reader.readAsArrayBuffer(file);
    });
  }
  function uploadMarkup(kind) {
    const zip = kind === 'zip';
    const inputName = zip ? 'archive' : 'screenshot';
    const fileLabel = zip ? 'Instagram 내보내기 ZIP 파일' : '캡처 이미지 파일';
    return `<form id="${zip ? 'zipimportform' : 'screenshotimportform'}" class="pm-upload-form">
      <p class="pm-upload-meta">${zip ? 'Instagram ZIP · 최대 40MB' : 'PNG, JPG, WebP · 최대 10MB'}</p>
      <label class="pm-upload-zone" data-phase="idle">
        <input type="file" name="${inputName}" accept="${zip ? '.zip,application/zip' : 'image/png,image/jpeg,image/webp'}" aria-label="${fileLabel}" required>
        <span class="pm-upload-drop" aria-hidden="false">${icon(zip ? 'folder' : 'image')}<strong>파일을 여기에 놓거나 선택</strong></span>
        <span class="pm-upload-file" aria-hidden="true"><span class="pm-upload-row"><span class="pm-upload-file-icon"><span class="pm-upload-icon-swap" data-state="a"><span class="pm-upload-icon" data-icon="a">${icon(zip ? 'folder' : 'image')}</span><span class="pm-upload-icon" data-icon="b">${icon('check')}</span></span></span><span class="pm-upload-file-copy"><strong class="pm-upload-name" id="${zip ? 'zip-file-name' : 'screenshot-file-name'}"></strong><small><span class="pm-upload-file-status">선택됨</span> · <span class="pm-upload-size"></span></small></span><span class="pm-upload-percent">0%</span></span><span class="pm-upload-bar" role="progressbar" aria-label="파일 읽기 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></span></span>
      </label>
      ${zip ? '<p class="pm-upload-note">ZIP은 기기에서 읽고 게시물 링크만 전송해요. 중복은 건너뜁니다.</p>' : '<img id="screenshot-preview" class="pm-upload-hidden-preview" alt="" hidden><p class="pm-upload-note">이미지에서 장소와 일정, 설명을 찾아 저장해요.</p>'}
      <p id="${zip ? 'zip-import-error' : 'screenshot-import-error'}" class="eserror pm-upload-error" role="alert"></p>
      <div class="pm-upload-foot"><button type="button" class="pm-upload-button is-secondary" data-upload-close>취소</button><button type="button" class="pm-upload-button pm-upload-submit" id="${zip ? 'zip-import-start' : 'screenshot-analysis-button'}"><span class="pm-upload-button-label">분석하고 저장</span></button></div>
    </form>`;
  }
  function openUpload(kind) {
    clearTimeout(uploadCloseTimer);
    sheet.className = 'pm-upload-modal';
    modal(kind === 'zip' ? 'ZIP 파일 업로드' : '캡처 이미지 업로드', uploadMarkup(kind));
    const close = sheet.querySelector('.dialoghead [data-action="close"]');
    close?.removeAttribute('data-action');
    close?.setAttribute('data-upload-close', '');
    uploadPhase(sheet.querySelector('.pm-upload-form'), 'idle');
    requestAnimationFrame(() => { if (sheet.open && sheet.classList.contains('pm-upload-modal')) sheet.classList.add('is-open'); });
  }
  function closeUpload() {
    if (!sheet.open || !sheet.classList.contains('pm-upload-modal') || sheet.classList.contains('is-closing')) return;
    sheet.classList.remove('is-open');
    sheet.classList.add('is-closing');
    if (uploadReader) uploadReader.abort();
    uploadCloseTimer = setTimeout(() => { if (sheet.open) sheet.close(); }, uploadReducedMotion() ? 0 : 150);
  }
  let batchExpanded = false;
  const batchFloating = document.createElement('div');
  batchFloating.className = 'batch-save-floating';
  batchFloating.hidden = true;
  document.body.append(batchFloating);
  const batchEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function batchMarkup(state) {
    const finished = state.phase === 'done';
    const paused = state.phase === 'paused';
    const count = Math.min(state.processed, state.total);
    const percent = Math.round(count / Math.max(1, state.total) * 100);
    const steps = [
      ['링크 확인', `${state.total}개 링크 준비 완료`, 'done'],
      ['중복 확인', `${state.skipped}개 건너뜀`, 'done'],
      ['콘텐츠 분석·저장', `${count}/${state.total}개 처리 · ${state.saved}개 저장`, finished ? 'done' : paused ? 'paused' : 'active'],
      ['결과 확인', `${state.saved}개 저장 · ${state.skipped}개 중복${state.review ? ` · ${state.review}개 검토 필요` : ''}`, finished ? 'done' : 'waiting']
    ];
    const current = finished ? 4 : 3;
    return `<section class="batch-save-card" aria-label="여러 콘텐츠 저장 진행 상태">
      <header class="batch-save-head"><span class="batch-save-badge" aria-hidden="true">✦</span><span class="batch-save-heading"><strong>${batchEscape(state.name)}</strong><small>${finished ? '완료' : paused ? '일시정지' : '저장 중'} · ${current}/4단계</small></span><button type="button" class="batch-save-dismiss" data-batch-action="collapse" aria-label="진행 카드 접기">×</button></header>
      <div class="batch-save-track" role="progressbar" aria-label="콘텐츠 저장 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
      <ol class="batch-save-steps">${steps.map(([title,detail,phase]) => `<li class="batch-save-step is-${phase}"><span class="batch-save-check" aria-hidden="true">${phase === 'done' ? '✓' : phase === 'active' ? '<span class="batch-save-pulse"></span>' : phase === 'paused' ? 'Ⅱ' : ''}</span><span><strong>${title}</strong><small>${detail}</small></span></li>`).join('')}</ol>
      ${state.error ? `<p class="batch-save-error" role="alert">${batchEscape(state.error)}</p>` : ''}
      <div class="batch-save-actions"><button type="button" data-batch-action="forget">작업 기록 삭제</button>${finished ? '' : `<button type="button" data-batch-action="${paused ? 'resume' : 'pause'}">${paused ? '이어하기' : '일시정지'}</button>`}</div>
    </section>`;
  }
  function renderZipStatus() {
    const state = window.PinmapZipImport?.state();
    const start = document.querySelector('#zipimportform #zip-import-start');
    if (start) start.disabled = start.closest('.pm-upload-form')?.querySelector('.pm-upload-zone')?.dataset.phase !== 'selected' || state?.phase === 'running' || state?.phase === 'paused';
    const linkSubmit = document.querySelector('#saveform button[type="submit"]');
    if (linkSubmit) linkSubmit.disabled = state?.source === 'links' && state.phase !== 'done';
    batchFloating.hidden = !state;
    if (batchFloating.hidden) { batchFloating.innerHTML = ''; return; }
    const percent = Math.round(state.processed / Math.max(1,state.total) * 100);
    const label = state.phase === 'done' ? '저장 완료' : state.phase === 'paused' ? '저장 일시정지' : '저장 진행 중';
    batchFloating.innerHTML = `<button type="button" class="batch-save-trigger is-${state.phase}" data-batch-action="toggle" aria-label="${label} · ${state.processed}/${state.total}개 처리 · 진행 상황 ${batchExpanded ? '접기' : '보기'}" aria-expanded="${batchExpanded}" aria-controls="batch-save-popover" style="--batch-percent:${percent}%"><span class="batch-save-trigger-ring" aria-hidden="true"><span class="batch-save-trigger-mark">${state.phase === 'done' ? '✓' : '◆'}</span></span></button><div id="batch-save-popover" class="batch-save-popover" ${batchExpanded ? '' : 'hidden'}>${batchExpanded ? batchMarkup(state) : ''}</div>`;
  }
  window.PinmapBatchStatus = Object.freeze({render:renderZipStatus, reset:() => {batchExpanded = false; renderZipStatus();}});
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-batch-action]')?.dataset.batchAction;
    if (!action) return;
    if (action === 'toggle' || action === 'collapse') {
      batchExpanded = action === 'toggle' ? !batchExpanded : false;
      renderZipStatus();
      batchFloating.querySelector('.batch-save-trigger')?.focus();
    }
    if (action === 'forget') {
      if (!window.confirm('이 저장 작업의 진행 기록을 삭제할까요? 이미 저장된 콘텐츠는 유지됩니다.')) return;
      window.PinmapZipImport?.forget();
      batchExpanded = false;
      renderZipStatus();
    }
    if (action === 'pause') window.PinmapZipImport?.pause();
    if (action === 'resume') void window.PinmapZipImport?.resume().catch(error => {
      const node = document.querySelector('#zip-import-error, #saveerror');
      if (node) node.textContent = error.message;
      else toast(error.message);
    });
  });
  function clearScreenshotPreview() {
    if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    screenshotPreviewUrl = null;
  }
  // 2026-11-23: 추가 버튼이 하단 메뉴에 들어가면서 지도용 메뉴에도 같은 버튼이 있어요. 지금 보이는 것을 써요.
  const addStage = () => [...document.querySelectorAll('#home-add-menu')].find(node => node.getClientRects().length) || document.getElementById('home-add-menu');
  function setAddMenuOpen(open, restoreFocus = false) {
    const stage = addStage();
    if (!stage) return;
    clearTimeout(openTimer);
    const trigger = stage.querySelector('.home-add-fab');
    const options = stage.querySelector('.home-add-options');
    const optionFocused = options.contains(document.activeElement);
    const wasOpen = stage.dataset.open === 'true';
    const styles = getComputedStyle(stage);
    const blur = Number.parseFloat(styles.getPropertyValue('--goo-blur')) || 6;
    const contrast = Number.parseFloat(styles.getPropertyValue('--goo-contrast')) || 18;
    stage.querySelector('feGaussianBlur[result="blur"]')?.setAttribute('stdDeviation', String(blur));
    stage.querySelector('feColorMatrix[result="goo"]')?.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${-(contrast * 7 / 18)}`);
    stage.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? '추가 메뉴 닫기' : '콘텐츠 추가하기');
    options.setAttribute('aria-hidden', String(!open));
    options.inert = !open;
    options.querySelectorAll('button').forEach(button => { button.tabIndex = open ? 0 : -1; });
    stage.classList.remove('is-anticipating');
    if (wasOpen && !open && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.classList.add('is-anticipating');
      const duration = Number.parseFloat(styles.getPropertyValue('--goo-anticip-dur')) || 700;
      openTimer = window.setTimeout(() => stage.classList.remove('is-anticipating'), duration + 50);
    }
    if (restoreFocus || (!open && optionFocused)) trigger.focus();
  }
  actions.addoptions = () => {
    const stage = addStage();
    if (!stage) return;
    if (stage.dataset.open === 'true') { setAddMenuOpen(false, true); return; }
    setAddMenuOpen(true);
    stage.querySelector('.home-add-options button')?.focus();
  };
  actions.analysisretry=()=>{
    const item=items.find(x=>x.id===detailId);
    actions.linkimport();
    const input=document.getElementById('es-url');
    if(input&&item?.url){input.value=item.url;input.focus();}
  };
  actions.linkimport = () => {
    setAddMenuOpen(false);
    sheet.className = '';
    actions.save();
    sheet.classList.add('add-import-sheet');
    renderZipStatus();
  };
  actions.zipimport = () => {
    setAddMenuOpen(false);
    openUpload('zip');
    document.getElementById('zip-import-start').addEventListener('click', () => actions.zipstart());
    renderZipStatus();
  };
  window.addEventListener('pinmap:zip-progress', renderZipStatus);
  actions.screenshotimport = () => {
    setAddMenuOpen(false);
    clearScreenshotPreview();
    captureId = crypto.randomUUID();
    openUpload('screenshot');
    document.getElementById('screenshot-analysis-button').addEventListener('click', () => actions.screenshotanalysis());
  };
  actions.screenshotback = closeUpload;
  actions.zipback = closeUpload;
  sheet.addEventListener('click', event => {
    if (sheet.classList.contains('pm-upload-modal') && event.target === sheet) {
      const rect = sheet.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        event.stopImmediatePropagation(); closeUpload();
      }
    }
  }, true);
  sheet.addEventListener('cancel', event => {
    if (sheet.classList.contains('pm-upload-modal')) { event.preventDefault(); closeUpload(); }
  });
  sheet.addEventListener('click', event => {
    if (event.target.closest('[data-upload-close]')) closeUpload();
  });
  sheet.addEventListener('dragover', event => {
    const zone = event.target.closest('.pm-upload-zone');
    if (!zone || zone.querySelector('input').disabled) return;
    event.preventDefault(); zone.classList.add('is-dragover');
  });
  sheet.addEventListener('dragleave', event => {
    const zone = event.target.closest('.pm-upload-zone');
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover');
  });
  sheet.addEventListener('drop', event => {
    const zone = event.target.closest('.pm-upload-zone');
    if (!zone || zone.querySelector('input').disabled) return;
    event.preventDefault(); zone.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const transfer = new DataTransfer(); transfer.items.add(file);
    const input = zone.querySelector('input'); input.files = transfer.files;
    input.dispatchEvent(new Event('change', {bubbles:true}));
  });
  sheet.addEventListener('close', () => {
    clearScreenshotPreview();
    if (uploadReader) uploadReader.abort();
    clearTimeout(uploadCloseTimer);
    sheet.classList.remove('pm-upload-modal', 'is-open', 'is-closing', 'zip-import-sheet', 'screenshot-import-sheet', 'add-import-sheet');
    renderZipStatus();
  });
  document.addEventListener('pointerdown', event => {
    const stage = addStage();
    if (!stage || stage.dataset.open !== 'true') return;
    if (!stage.contains(event.target)) setAddMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && batchExpanded) {
      batchExpanded = false;
      renderZipStatus();
      batchFloating.querySelector('.batch-save-trigger')?.focus();
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && addStage()?.dataset.open === 'true') {
      event.preventDefault();
      setAddMenuOpen(false, true);
    }
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('#zipimportform input[name="archive"]')) return;
    const file = event.target.files?.[0];
    const form = event.target.form;
    const error = form.querySelector('#zip-import-error');
    error.textContent = '';
    if (!file || !/\.zip$/i.test(file.name) || file.size > 40 * 1024 * 1024) {
      if (file) error.textContent = '40MB 이하의 ZIP 파일을 선택해 주세요.';
      event.target.value = ''; uploadPhase(form, 'idle'); return;
    }
    selectedUploadFile(form, file);
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('#screenshotimportform input[name="screenshot"]')) return;
    const file = event.target.files?.[0];
    const form = event.target.form;
    const preview = document.getElementById('screenshot-preview');
    const error = document.getElementById('screenshot-import-error');
    clearScreenshotPreview();
    preview.hidden = true;
    preview.removeAttribute('src');
    error.textContent = '';
    if (!file) { uploadPhase(form, 'idle'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      error.textContent = 'PNG, JPG, WebP 이미지(10MB 이하)를 선택해 주세요.';
      event.target.value = '';
      uploadPhase(form, 'idle');
      return;
    }
    selectedUploadFile(form, file);
    form.querySelector('.pm-upload-submit').disabled = true;
    screenshotPreviewUrl = URL.createObjectURL(file);
    preview.onload = () => { if (form.isConnected) form.querySelector('.pm-upload-submit').disabled = false; };
    preview.onerror = () => {
      preview.hidden = true;
      error.textContent = '이미지 파일을 열 수 없어요. 다른 캡처를 선택해 주세요.';
      clearScreenshotPreview();
      event.target.value = '';
      uploadPhase(form, 'idle');
    };
    preview.src = screenshotPreviewUrl;
  });
  actions.screenshotanalysis = async () => {
    const form = document.getElementById('screenshotimportform');
    if (!form) return;
    const preview = form.querySelector('#screenshot-preview');
    const error = form.querySelector('#screenshot-import-error');
    const button = form.querySelector('#screenshot-analysis-button');
    if (!window.PinmapCaptureSave) {
      error.textContent = '캡처 분석·저장은 로그인 후 사용할 수 있어요.';
      return;
    }
    if (!preview.naturalWidth) {
      error.textContent = '먼저 열 수 있는 캡처 이미지를 선택해 주세요.';
      return;
    }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1600 / Math.max(preview.naturalWidth, preview.naturalHeight));
    canvas.width = Math.max(1, Math.round(preview.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(preview.naturalHeight * ratio));
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
    let image;
    for (const quality of [.82, .68, .5]) {
      image = canvas.toDataURL('image/jpeg', quality);
      if (image.length <= 2700000) break;
    }
    if (image.length > 2700000) {
      error.textContent = '캡처 이미지가 너무 커요. 더 작은 이미지를 선택해 주세요.';
      return;
    }
    error.textContent = '';
    button.setAttribute('aria-busy', 'true');
    uploadPhase(form, 'reading');
    try {
      await readUploadFile(form.elements.namedItem('screenshot').files[0], form);
      if (!form.isConnected) return;
      uploadProgress(form, 100);
      uploadPhase(form, 'done');
      await new Promise(resolve => setTimeout(resolve, uploadReducedMotion() ? 0 : 200));
      if (!form.isConnected) return;
      uploadPhase(form, 'analyzing');
      await window.PinmapCaptureSave(image, captureId);
    }
    catch (reason) { if (form.isConnected) error.textContent = reason.message || '캡처를 저장하지 못했어요.'; }
    finally {
      if (form.isConnected) {
        button.removeAttribute('aria-busy');
        uploadPhase(form, 'selected');
      }
    }
  };
  actions.zipstart = async () => {
    const form = document.getElementById('zipimportform');
    if (!form) return;
    const file = form.elements.namedItem('archive').files?.[0];
    const error = form.querySelector('#zip-import-error');
    if (!file) { error.textContent = 'ZIP 파일을 선택해 주세요.'; return; }
    if (!window.PinmapZipImport) {
      error.textContent = 'ZIP 분석·저장은 로그인 후 사용할 수 있어요.';
      return;
    }
    error.textContent = '';
    window.PinmapBatchStatus?.reset();
    const button = form.querySelector('#zip-import-start');
    button.setAttribute('aria-busy', 'true');
    uploadPhase(form, 'reading');
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const bytes = await readUploadFile(file, form);
      if (!form.isConnected) return;
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)
        throw Error('ZIP 파일 형식을 확인해 주세요.');
      const parsed = window.PinmapZipParser.parseBytes(bytes);
      uploadProgress(form, 100);
      uploadPhase(form, 'done', `게시물 ${parsed.urls.length}건 확인`);
      await new Promise(resolve => setTimeout(resolve, uploadReducedMotion() ? 0 : 200));
      if (!form.isConnected) return;
      void window.PinmapZipImport.start(parsed.urls, file.name).catch(reason => {
        if (sheet.open && form.isConnected) error.textContent = reason.message || 'ZIP 가져오기를 시작하지 못했어요.';
        else toast(reason.message || 'ZIP 가져오기를 시작하지 못했어요.');
      });
      if (window.PinmapZipImport.state()?.phase === 'running') closeUpload();
    } catch (reason) { if (form.isConnected) error.textContent = reason.message || 'ZIP 파일을 읽지 못했어요.'; }
    finally {
      if (form.isConnected) {
        button.removeAttribute('aria-busy');
        if (!sheet.classList.contains('is-closing')) uploadPhase(form, 'selected');
        renderZipStatus();
      }
    }
  };
})();
