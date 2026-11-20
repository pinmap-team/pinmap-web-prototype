// The lower-right add buttons choose an input method. ZIP analysis is not yet
// connected to the public account API; selecting a file never uploads it.
(() => {
  const sheet = document.getElementById('sheet');
  let openTimer;
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
  actions.zipback = () => {
    sheet.close();
    actions.addoptions();
  };
  sheet.addEventListener('close', () => sheet.classList.remove('zip-import-sheet'));
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
