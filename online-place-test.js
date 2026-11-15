// The backend extracts places; the empty development app displays its report.
function pinmapPlaceReportItem(report, options = {}) {
  if (!report || typeof report !== 'object' || report.status === 'collection_failed') {
    throw Error(report?.notes?.[0] || 'Instagram 원본에 접근하지 못했어요.');
  }
  const located = place => Number.isFinite(place?.coordinates?.lat) && Number.isFinite(place?.coordinates?.lng);
  const mapLocations = (Array.isArray(report.map_locations) ? report.map_locations : [])
    .filter(located).map(place => ({...place, review_required:!!(place.review_required ?? place.needs_review)}));
  const extractionPlaces = (Array.isArray(report.places) ? report.places : []).map(place => {
    const hasCoordinates = located(place);
    const status = place?.map_lookup?.status;
    const reason = hasCoordinates ? '' : ({
      not_found:'지도에서 같은 이름의 장소를 찾지 못했어요.',
      ambiguous:'동명이점이 있어 위치를 확정하지 못했어요.',
      lookup_failed:'지도 검색에 실패했어요.'
    }[status] || (place?.address ? '주소의 정확한 위치를 확인하지 못했어요.' : '장소 주소를 확인하지 못했어요.'));
    return {name:place?.name || '이름 확인 필요', address:place?.address || '', hasCoordinates,
      reason, needsReview:!!place?.needs_review};
  });
  if (!extractionPlaces.length) throw Error(report.notes?.[0] || '게시물에서 장소를 찾지 못했어요.');
  const first = mapLocations[0];
  return {
    id:Date.now(), title:options.title || report.ai_title || 'Instagram 장소 게시물',
    type:'맛집/카페', category:'장소', mapKind:'eat', source:'Instagram', savedAt:new Date().toISOString(),
    desc:report.ai_summary || '', aiSummary:!!report.ai_summary,
    extractedPlaceCount:extractionPlaces.length, extractionPlaces,
    authorUsername:report.author_username || '', authorProfilePhoto:report.author_profile_data_url || '',
    memo:options.memo || '', art:'cafe', photo:report.cover_data_url || '',
    collection:options.collection || '', url:report.source_url || options.url || '',
    address:first?.address || '', lat:first?.coordinates.lat, lng:first?.coordinates.lng,
    mapLocations, pending:!first, aiClassified:false
  };
}

if (PM_ENV.cloudPlaceTest) {
  // Opened from the backend result button: show the empty map immediately.
  if (new URLSearchParams(location.search).get('place-test') === '1') closeOnboarding();
  const importReport = (report, options = {}) => {
    const item = pinmapPlaceReportItem(report, options);
    items.unshift(item);
    afterChange();
    closeOnboarding();
    document.getElementById('sheet')?.close();
    if (item.mapLocations.length) {
      window.pmMapFocus = item.id;
      go('map');
    } else {
      go('home');
      openDetail(item.id);
    }
    toast(`장소 ${item.extractedPlaceCount}곳 확인 · 지도 표시 ${item.mapLocations.length}곳`);
    return item;
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin ||
        event.data?.type !== 'pinmap:place-report') return;
    try {
      importReport(event.data.report);
      window.parent.postMessage({type:'pinmap:place-report-imported'}, location.origin);
    } catch (error) {
      toast(error.message || '장소 결과를 표시하지 못했어요.');
      window.parent.postMessage({type:'pinmap:place-report-failed', reason:error.message || '장소 결과를 표시하지 못했어요.'}, location.origin);
    }
  });
  if (window.parent !== window) window.parent.postMessage({type:'pinmap:place-report-ready'}, location.origin);
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
    const progress = form.querySelector('#saveprogress');
    const hint = form.querySelector('.eshint,.hint');
    const hintText = hint?.textContent;
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = '저장 중…';
    }
    if (progress) {
      progress.textContent = '저장 중 · 게시물에서 장소를 찾고 있어요. 몇 분 걸릴 수 있어요.';
      progress.hidden = false;
    }
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
      importReport(data.results?.[0], {
        url, title:form.elements.namedItem('title').value.trim(),
        memo:form.elements.namedItem('memo').value.trim(),
        collection:form.elements.namedItem('collection').value
      });
    } catch (cause) {
      if (error) error.textContent = cause.message;
    } finally {
      delete form.dataset.busy;
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = submitLabel;
      }
      if (progress) {
        progress.hidden = true;
        progress.textContent = '';
      }
      if (hint) hint.textContent = hintText;
    }
  }, true);
}
