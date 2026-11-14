// Isolated, login-free link experiment. Activated only by ?mode=development&place-test=1.
if (PM_ENV.cloudPlaceTest && !PM_ENV.backend) {
  const save = actions.save;
  actions.save = () => {
    save();
    const form = document.getElementById('saveform');
    if (!form) return;
    const title = form.elements.namedItem('title');
    title.required = false;
    title.placeholder = '비워두면 Instagram 장소 게시물로 저장';
    form.elements.namedItem('type').value = '맛집/카페';
    form.elements.namedItem('type').closest('label').hidden = true;
    const heading = form.querySelector('.eshead p');
    if (heading) heading.textContent = 'Instagram 링크에서 장소를 찾아 지도에 표시해요.';
    for (const selector of ['.esshare','.esdivider','.essample']) {
      const element = form.querySelector(selector);
      if (element) element.hidden = true;
    }
    const hint = form.querySelector('.eshint,.hint');
    if (hint) hint.textContent = '링크에서 장소와 지도 좌표를 찾아 이 화면에 표시해요. 장소 후보는 방문 전에 확인해 주세요.';
  };

  document.addEventListener('submit', async event => {
    if (event.target.id !== 'saveform') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.target;
    if (form.dataset.busy) return;
    const error = document.getElementById('saveerror');
    if (error) error.textContent = '';
    const url = form.elements.namedItem('url').value.trim();
    if (!/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?(?:\?.*)?$/.test(url)) {
      if (error) error.textContent = 'Instagram 게시물 또는 릴스 링크를 입력해 주세요.';
      return;
    }
    let code = sessionStorage.getItem('pinmap.place-test-code');
    if (!code) {
      code = window.prompt('온라인 장소 추출 테스트 코드를 입력해 주세요.') || '';
      if (!code) return;
      sessionStorage.setItem('pinmap.place-test-code', code);
    }
    form.dataset.busy = '1';
    const submit = form.querySelector('button[type=submit]');
    const submitLabel = submit?.textContent;
    const hint = form.querySelector('.eshint,.hint');
    const hintText = hint?.textContent;
    if (submit) {
      submit.disabled = true;
      submit.textContent = '장소 분석 중…';
    }
    if (hint) hint.textContent = '장소를 찾고 있어요. 게시물에 사진·영상이 많으면 몇 분 걸릴 수 있어요.';
    try {
      const response = await fetch('/api/place-extract', {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-Pinmap-Test-Code':code},
        body: JSON.stringify({url}),
        cache: 'no-store'
      });
      const data = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem('pinmap.place-test-code');
        throw Error('테스트 코드를 확인해 주세요. 다시 저장하면 입력할 수 있어요.');
      }
      if (response.status === 503) throw Error('온라인 분석 서버 연결이 아직 준비되지 않았어요.');
      if (!response.ok) throw Error(data.error || '장소 분석 서버가 응답하지 않았어요.');
      const report = data.results?.[0];
      if (!report || report.status === 'collection_failed') throw Error(report?.notes?.[0] || 'Instagram 원본에 접근하지 못했어요.');
      const mapLocations = (report.map_locations || [])
        .filter(place => Number.isFinite(place.coordinates?.lat) && Number.isFinite(place.coordinates?.lng))
        .map(place => ({...place, review_required:place.needs_review}));
      if (!mapLocations.length) throw Error(report.notes?.[0] || '지도에 표시할 장소 좌표를 찾지 못했어요.');
      const first = mapLocations[0];
      const id = Date.now();
      items.unshift({
        id, title:form.elements.namedItem('title').value.trim() || 'Instagram 장소 게시물',
        type:'맛집/카페', category:'장소', mapKind:'eat', source:'Instagram', savedAt:new Date().toISOString(),
        desc:`장소 ${report.places?.length || mapLocations.length}곳 · 지도 좌표 ${mapLocations.length}곳`,
        memo:form.elements.namedItem('memo').value.trim(), art:'cafe',
        photo:report.cover_data_url || '', collection:form.elements.namedItem('collection').value,
        url:report.source_url || url, address:first.address || '', lat:first.coordinates.lat,
        lng:first.coordinates.lng, mapLocations, aiClassified:false
      });
      afterChange();
      document.getElementById('sheet')?.close();
      window.pmMapFocus = id;
      go('map');
      toast(`장소 ${mapLocations.length}곳을 지도에 표시했어요.`);
    } catch (cause) {
      if (error) error.textContent = cause.message;
    } finally {
      delete form.dataset.busy;
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
      if (hint) hint.textContent = hintText;
    }
  }, true);
}
