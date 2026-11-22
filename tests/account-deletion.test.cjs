const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const userId = '12345678-1234-1234-1234-123456789012';

async function app(response) {
  const calls = [], classes = {add() {}, remove() {}};
  const sheet = {open: false, close() {}, classList: classes};
  const button = {disabled: false};
  const client = {auth: {
    getSession: async () => ({data: {session: {user: {id: userId}, access_token: 'account-token'}}}),
    onAuthStateChange: () => ({data: {subscription: {unsubscribe() {}}}}),
    signOut: async () => {calls.push('signout'); return {error: null};}
  }};
  const document = {
    documentElement: {classList: classes}, body: {append() {}},
    getElementById: id => id === 'app' ? {inert: false} : id === 'sheet' ? sheet : null,
    createElement: () => ({setAttribute() {}, querySelector: () => ({onclick: null})}),
    querySelector: () => button
  };
  const actions = {};
  const location = {href: 'https://example.com/app.html'};
  const window = {top: {location: {replace: url => calls.push(['redirect', url])}},
    addEventListener() {}, PinmapAccountIdentity: null, PinmapZipImport: {pause: () => calls.push('pause')}};
  const context = {PM_ENV: {requiresAuth: true}, document, window, location, actions,
    closeOnboarding() {}, render() {}, confirmPop() {}, toast: text => calls.push(['toast', text]),
    esc: value => value, setTimeout, URL, AbortSignal,
    PinmapAuth: {login() {}, ready: async () => client,
      verifiedUser: async () => ({data: {user: {id: userId, email: 'owner@example.com'}}})},
    PinmapButton: {run: async (node, task) => task()},
    localStorage: {removeItem: key => calls.push(['remove', key])},
    fetch: async (url, options) => {calls.push(['request', url, options.method, options.headers.Authorization]); return response;}
  };
  vm.runInNewContext(fs.readFileSync('auth-app.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return {actions, calls};
}

test('confirmed account deletion uses authenticated API and clears local session only after success', async () => {
  const state = await app({ok: true, status: 200, json: async () => ({deleted: true})});
  await state.actions.leaveyes();
  assert.deepEqual(state.calls.find(x => Array.isArray(x) && x[0] === 'request'),
    ['request', '/api/account-delete', 'DELETE', 'Bearer account-token']);
  assert(state.calls.indexOf('signout') > state.calls.findIndex(x => Array.isArray(x) && x[0] === 'request'));
  assert(state.calls.some(x => Array.isArray(x) && x[0] === 'remove' && x[1] === `pinmap.zip-import.v1.${userId}`));
  assert(state.calls.some(x => Array.isArray(x) && x[0] === 'redirect' && x[1].includes('deleted=1')));
});

test('failed server deletion keeps the signed-in session for retry', async () => {
  const state = await app({ok: false, status: 503, json: async () => ({error: 'subscription_cancellation_failed'})});
  await state.actions.leaveyes();
  assert(state.calls.some(x => Array.isArray(x) && x[0] === 'toast' && x[1].includes('구독 해지')));
  assert.equal(state.calls.includes('signout'), false);
  assert.equal(state.calls.some(x => Array.isArray(x) && x[0] === 'redirect'), false);
});
