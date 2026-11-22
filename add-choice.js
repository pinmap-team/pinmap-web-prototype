// The lower-right add buttons choose an input method.
(() => {
  const sheet = document.getElementById('sheet');
  let openTimer;
  let screenshotPreviewUrl;
  let captureId;
  function clearScreenshotPreview() {
    if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    screenshotPreviewUrl = null;
  }
  function setAddMenuOpen(open, restoreFocus = false) {
    const stage = document.getElementById('home-add-menu');
    if (!stage) return;
    clearTimeout(openTimer);
    stage.removeAttribute('data-sink');
    stage.dataset.open = String(open);
    const trigger = stage.querySelector('.home-add-fab');
    const options = stage.querySelector('.home-add-options');
    const optionFocused = options.contains(document.activeElement);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.tabIndex = open ? -1 : 0;
    options.setAttribute('aria-hidden', String(!open));
    options.inert = !open;
    if (restoreFocus || (!open && optionFocused)) trigger.focus();
  }
  actions.addoptions = () => {
    const stage = document.getElementById('home-add-menu');
    if (!stage || stage.dataset.sink === 'true') return;
    if (stage.dataset.open === 'true') { setAddMenuOpen(false, true); return; }
    stage.dataset.sink = 'true';
    openTimer = window.setTimeout(() => {
      if (!stage.isConnected) return;
      setAddMenuOpen(true);
      stage.querySelector('.home-add-options button')?.focus();
    }, 60);
  };
  actions.linkimport = () => {
    setAddMenuOpen(false);
    sheet.className = '';
    actions.save();
  };
  actions.zipimport = () => {
    setAddMenuOpen(false);
    sheet.className = 'zip-import-sheet';
    modal('Instagram ZIP 가져오기', `<form id="zipimportform" class="zip-import-form">
      <p>Instagram에서 내보낸 저장 게시물 ZIP 파일을 선택해 주세요.</p>
      <label class="zip-import-picker"><span>ZIP 파일 선택</span><input type="file" name="archive" accept=".zip,application/zip" aria-label="Instagram 내보내기 ZIP 파일" required></label>
      <p id="zip-file-name" class="zip-import-filename" role="status">선택한 파일 없음</p>
      <p class="zip-import-note">파일은 아직 전송되지 않아요. ZIP 자동 분석은 다음 단계에서 연결됩니다.</p>
      <p id="zip-import-error" class="eserror" role="alert"></p>
      <div class="dialogactions"><button type="button" class="textbtn" data-action="zipback">뒤로</button><button type="submit" class="filled">파일 확인</button></div>
    </form>`);
  };
  actions.screenshotimport = () => {
    setAddMenuOpen(false);
    clearScreenshotPreview();
    captureId = crypto.randomUUID();
    sheet.className = 'zip-import-sheet screenshot-import-sheet';
    modal('캡처 화면으로 추가', `<form class="zip-import-form" id="screenshotimportform">
      <p>저장할 콘텐츠의 캡처 이미지를 선택해 주세요.</p>
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
    sheet.classList.remove('zip-import-sheet', 'screenshot-import-sheet');
  });
  document.addEventListener('pointerdown', event => {
    const stage = document.getElementById('home-add-menu');
    if (!stage || stage.dataset.open !== 'true') return;
    if(stage.contains(event.target))return;
    const box = stage.querySelector('.home-add-body').getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setAddMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('home-add-menu')?.dataset.open === 'true') {
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
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'zipimportform') return;
    event.preventDefault();
    const form = event.target, file = form.elements.namedItem('archive').files?.[0];
    const error = form.querySelector('#zip-import-error');
    if (!file) { error.textContent = 'ZIP 파일을 선택해 주세요.'; return; }
    const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (!/\.zip$/i.test(file.name) || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      error.textContent = 'Instagram 내보내기 ZIP 파일인지 확인해 주세요.'; return;
    }
    error.textContent = '';
    form.querySelector('#zip-file-name').textContent = `${file.name} · 파일 선택 완료`;
  }, true);
})();
