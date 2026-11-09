const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../portfolio-embed.js'), 'utf8');
function run({ embedded = true, search = '?portfolio-demo=1', referrer = 'https://ji-hyeon-jeong.vercel.app/' } = {}) {
  const appended = [];
  const window = {}; window.parent = embedded ? {} : window;
  vm.runInNewContext(source, {window, location: {search}, URL, URLSearchParams,
    document: {referrer, createElement: tag => ({tag}), head: {append: e => appended.push(e)}, body: {append: e => appended.push(e)}}});
  return appended;
}
test('ordinary visits and untrusted embeds load no portfolio code', () => {
  for (const options of [{embedded:false}, {search:''}, {referrer:''}, {referrer:'https://example.com/'}, {referrer:'https://ji-hyeon-jeong.vercel.app.evil.example/'}]) assert.equal(run(options).length, 0);
});
test('explicit canonical portfolio embed loads only the fixed tour assets', () => {
  const assets = run();
  assert.equal(assets.length, 2);
  assert.equal(assets[0].href, 'https://ji-hyeon-jeong.vercel.app/pinmap-preview.css?v=2');
  assert.equal(assets[1].src, 'https://ji-hyeon-jeong.vercel.app/pinmap-preview.js?v=2');
});
