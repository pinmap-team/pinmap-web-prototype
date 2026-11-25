// The lower-right add buttons choose an input method.
(() => {
  let openTimer;
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
    actions.linkimport(item?.url || '');
  };
  function openFromAddMenu(action, kind, prefill = '') {
    const stage = addStage();
    const menuOpen = stage?.dataset.open === 'true';
    const origin = menuOpen ? stage.querySelector(`[data-action="${action}"]`)?.getBoundingClientRect() : null;
    const linkButton = menuOpen ? stage.querySelector('[data-action="linkimport"]')?.getBoundingClientRect() : null;
    const linkCenterY = linkButton ? linkButton.top + linkButton.height / 2 : null;
    setAddMenuOpen(false);
    window.PinmapLinkProgress?.open(kind, prefill, origin, linkCenterY);
  }
  actions.linkimport = (prefill = '') => {
    openFromAddMenu('linkimport', 'links', typeof prefill === 'string' ? prefill : '');
  };
  actions.zipimport = () => {
    openFromAddMenu('zipimport', 'zip');
  };
  window.PinmapStartZipFile = async (file, signal) => {
    if (!file || !/\.zip$/i.test(file.name) || file.size > 40 * 1024 * 1024)
      throw Error('40MB 이하의 Instagram 내보내기 ZIP 파일을 선택해 주세요.');
    if (!window.PinmapZipImport) throw Error('ZIP 분석·저장은 로그인 후 사용할 수 있어요.');
    signal?.throwIfAborted();
    const bytes = new Uint8Array(await new Promise((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      signal?.addEventListener('abort', abort, {once:true});
      reader.onload = () => { signal?.removeEventListener('abort', abort); resolve(reader.result); };
      reader.onerror = () => { signal?.removeEventListener('abort', abort); reject(reader.error); };
      reader.onabort = () => { signal?.removeEventListener('abort', abort); reject(signal?.reason || new DOMException('ZIP 읽기가 중단됐어요.', 'AbortError')); };
      reader.readAsArrayBuffer(file);
    }));
    signal?.throwIfAborted();
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)
      throw Error('ZIP 파일 형식을 확인해 주세요.');
    const parsed = window.PinmapZipParser.parseBytes(bytes);
    signal?.throwIfAborted();
    await window.PinmapZipImport.start(parsed.urls, file.name);
  };
  actions.screenshotimport = () => {
    openFromAddMenu('screenshotimport', 'photo');
  };
  document.addEventListener('pointerdown', event => {
    const stage = addStage();
    if (!stage || stage.dataset.open !== 'true') return;
    if (!stage.contains(event.target)) setAddMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && addStage()?.dataset.open === 'true') {
      event.preventDefault();
      setAddMenuOpen(false, true);
    }
  });

})();
