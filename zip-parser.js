/* Instagram's saved-post export is read locally; only normalized post links leave the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/fflate.js'));
  else root.PinmapZipParser = factory(root.fflate);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (archive) {
  const MAX_ZIP = 40 * 1024 * 1024;
  const MAX_LIST = 32 * 1024 * 1024;
  const ENTRY = /^(?:[^/]+\/)?your_instagram_activity\/saved\/saved_posts\.json$/;
  function canonical(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) ||
          url.username || url.password || !/^\/(?:p|reel|tv)\/[A-Za-z0-9_-]{1,50}\/?$/.test(url.pathname)) return null;
      return `https://www.instagram.com${url.pathname.endsWith('/') ? url.pathname : url.pathname + '/'}`;
    } catch { return null; }
  }
  function parseBytes(bytes) {
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_ZIP)
      throw Error('Instagram ZIP 파일은 40MB 이하만 가져올 수 있어요.');
    if (!archive?.unzipSync) throw Error('ZIP 읽기 기능을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
    let matches = 0, tooLarge = false, files;
    try {
      files = archive.unzipSync(bytes, {filter(info) {
        if (!ENTRY.test(info.name)) return false;
        matches++;
        if (info.originalSize > MAX_LIST) { tooLarge = true; return false; }
        return matches === 1;
      }});
    } catch { throw Error('ZIP 파일을 읽을 수 없어요. Instagram 내보내기 파일인지 확인해 주세요.'); }
    if (tooLarge) throw Error('ZIP 안의 저장 게시물 목록이 너무 커요.');
    if (matches !== 1) throw Error('ZIP 안에서 저장 게시물 목록을 하나만 찾을 수 있어야 해요.');
    const list = Object.values(files)[0];
    if (!list || list.length > MAX_LIST) throw Error('저장 게시물 목록의 크기를 확인해 주세요.');
    let records;
    try { records = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(list).replace(/^\uFEFF/, '')); }
    catch { throw Error('saved_posts.json을 읽을 수 없어요. JSON 형식을 확인해 주세요.'); }
    if (!Array.isArray(records) || records.length > 10000) throw Error('저장 게시물 목록은 최대 1만 건까지 가져올 수 있어요.');
    const urls = [], seen = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object' || !Array.isArray(record.label_values)) continue;
      const field = record.label_values.find(value => value?.label === 'URL');
      const url = canonical(field?.href || field?.value);
      if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
    }
    if (!urls.length) throw Error('ZIP에서 Instagram 저장 게시물 링크를 찾지 못했어요.');
    return {urls, exported:records.length, duplicates:records.length - urls.length};
  }
  async function parseFile(file) {
    if (!file || !/\.zip$/i.test(file.name) || file.size > MAX_ZIP)
      throw Error('40MB 이하의 Instagram 내보내기 ZIP 파일을 선택해 주세요.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)
      throw Error('ZIP 파일 형식을 확인해 주세요.');
    return parseBytes(bytes);
  }
  return Object.freeze({parseBytes, parseFile, canonical});
});
