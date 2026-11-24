// The lower-right add buttons choose an input method.
(() => {
  const sheet = document.getElementById('sheet');
  let openTimer;
  let screenshotPreviewUrl;
  let captureId;
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
    if (start) start.disabled = state?.phase === 'running' || state?.phase === 'paused';
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
    sheet.className = 'zip-import-sheet add-import-sheet';
    modal('Instagram ZIP 가져오기', `<form id="zipimportform" class="zip-import-form">
      <p class="add-import-intro">Instagram에서 내보낸 저장 게시물 ZIP 파일을 선택해 주세요.</p>
      <label class="zip-import-picker"><span>ZIP 파일 선택</span><input type="file" name="archive" accept=".zip,application/zip" aria-label="Instagram 내보내기 ZIP 파일" required></label>
      <p id="zip-file-name" class="zip-import-filename" role="status">선택한 파일 없음</p>
      <p class="zip-import-note">ZIP은 기기에서 읽고 게시물 링크만 전송해요. 중복은 건너뛰며, 월간 분석 한도나 계정 저장 100개 한도에 닿으면 남은 목록을 일시정지해요.</p>
      ${PM_ENV.requiresAuth ? '' : '<a class="textbtn" href="auth.html?screen=welcome" target="_top">로그인하고 가져오기</a>'}
      <p id="zip-import-error" class="eserror" role="alert"></p>
      <div class="dialogactions"><button type="button" class="textbtn" data-action="zipback">뒤로</button><button type="button" class="filled" id="zip-import-start">분석하고 저장</button></div>
    </form>`);
    document.getElementById('zip-import-start').addEventListener('click', () => actions.zipstart());
    renderZipStatus();
  };
  window.addEventListener('pinmap:zip-progress', renderZipStatus);
  actions.screenshotimport = () => {
    setAddMenuOpen(false);
    clearScreenshotPreview();
    captureId = crypto.randomUUID();
    sheet.className = 'zip-import-sheet screenshot-import-sheet add-import-sheet';
    modal('캡처 화면으로 추가', `<form class="zip-import-form" id="screenshotimportform">
      <p class="add-import-intro">저장할 콘텐츠의 캡처 이미지를 선택해 주세요.</p>
      <label class="zip-import-picker"><span>캡처 이미지 선택</span><input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" aria-label="캡처 이미지 파일" required></label>
      <p id="screenshot-file-name" class="zip-import-filename" role="status">선택한 파일 없음</p>
      <img id="screenshot-preview" class="screenshot-import-preview" alt="선택한 캡처 이미지 미리보기" hidden>
      <p class="zip-import-note">이미지에서 장소와 일정, 콘텐츠 설명을 찾아 로그인한 계정에 저장해요.</p>
      ${PM_ENV.requiresAuth ? '' : '<a class="textbtn" href="auth.html?screen=welcome" target="_top">로그인하고 저장하기</a>'}
      <p id="screenshot-import-error" class="eserror" role="alert"></p>
      <div class="dialogactions"><button type="button" class="textbtn" data-action="screenshotback">뒤로</button><button type="button" class="filled" id="screenshot-analysis-button">분석하고 저장</button></div>
    </form>`);
    document.getElementById('screenshot-analysis-button').addEventListener('click', () => actions.screenshotanalysis());
  };
  actions.screenshotback = () => {
    sheet.close();
    actions.addoptions();
  };
  actions.zipback = () => {
    sheet.close();
    actions.addoptions();
  };
  sheet.addEventListener('close', () => {
    clearScreenshotPreview();
    sheet.classList.remove('zip-import-sheet', 'screenshot-import-sheet', 'add-import-sheet');
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
    document.getElementById('zip-file-name').textContent = file ? file.name : '선택한 파일 없음';
    document.getElementById('zip-import-error').textContent = '';
  });
  document.addEventListener('change', event => {
    if (!event.target.matches('#screenshotimportform input[name="screenshot"]')) return;
    const file = event.target.files?.[0];
    const name = document.getElementById('screenshot-file-name');
    const preview = document.getElementById('screenshot-preview');
    const error = document.getElementById('screenshot-import-error');
    clearScreenshotPreview();
    preview.hidden = true;
    preview.removeAttribute('src');
    error.textContent = '';
    name.textContent = file?.name || '선택한 파일 없음';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      error.textContent = 'PNG, JPG, WebP 이미지(10MB 이하)를 선택해 주세요.';
      event.target.value = '';
      return;
    }
    screenshotPreviewUrl = URL.createObjectURL(file);
    preview.onload = () => { preview.hidden = false; name.textContent = `${file.name} · 이미지 선택 완료`; };
    preview.onerror = () => {
      preview.hidden = true;
      error.textContent = '이미지 파일을 열 수 없어요. 다른 캡처를 선택해 주세요.';
      clearScreenshotPreview();
      event.target.value = '';
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
    if (preview.hidden || !preview.naturalWidth) {
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
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = '분석 중…';
    try { await window.PinmapCaptureSave(image, captureId); }
    catch (reason) { error.textContent = reason.message || '캡처를 저장하지 못했어요.'; }
    finally {
      if (form.isConnected) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = '분석하고 저장';
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
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'ZIP 읽는 중…';
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const parsed = await window.PinmapZipParser.parseFile(file);
      form.querySelector('#zip-file-name').textContent = `${file.name} · 게시물 ${parsed.urls.length}건 확인`;
      void window.PinmapZipImport.start(parsed.urls, file.name).catch(reason => {
        if (sheet.open && form.isConnected) error.textContent = reason.message || 'ZIP 가져오기를 시작하지 못했어요.';
        else toast(reason.message || 'ZIP 가져오기를 시작하지 못했어요.');
      });
      if (window.PinmapZipImport.state()?.phase === 'running') sheet.close();
    } catch (reason) { error.textContent = reason.message || 'ZIP 파일을 읽지 못했어요.'; }
    finally {
      if (form.isConnected) {
        button.removeAttribute('aria-busy');
        button.textContent = '분석하고 저장';
        renderZipStatus();
      }
    }
  };
})();
