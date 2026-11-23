import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source = readFileSync(new URL('../public/invitation/js/app.js', import.meta.url), 'utf8');

function invitation(fetch, storage = new Map()) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {}, disabled: false, hidden: true, value: '', listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name, value) { this[name] = value; },
      removeAttribute(name) { delete this[name]; },
      focus() { this.focused = true; },
      getContext() { return {}; }, close() {},
      showModal() { this.opened = true; }
    });
    return elements.get(id);
  }
  const form = element('partyForm');
  form.querySelectorAll = () => [{ value: 'Bowling 🎳' }];
  form.querySelector = selector => selector.includes('bottle') ? { value: 'Minti Jamun 🫐' } : null;
  for (const name of ['customDinner', 'customDessert', 'placeName', 'placeLink', 'placeNotes']) form[name] = element(name);
  form.reportValidity = () => true;
  let expired = false;
  let ready;
  const document = {
    getElementById: element,
    querySelector: element,
    addEventListener(name, callback) { if (name === 'DOMContentLoaded') ready = callback; }
  };
  const context = vm.createContext({
    document, window: { matchMedia: () => ({ matches: true }), addEventListener() {} },
    navigator: {}, crypto:webcrypto, setInterval() {}, Date, AbortSignal, fetch,
    localStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value)
    },
    ExpiryManager: { init() {}, markAsExpired() { expired = true; } }
  });
  vm.runInContext(source, context);
  ready();
  return { element, form, expired: () => expired, submit: () => element('confirmRsvpBtn').listeners.click() };
}

for (const [name, fetch] of [
  ['network failure', async () => { throw new TypeError('offline'); }],
  ['HTTP failure', async () => Response.json({ success: true, emailSent: true }, { status: 503 })],
  ['HTML response', async () => new Response('<html>Unavailable</html>')],
  ['undelivered email', async () => Response.json({ success: true, emailSent: false })]
]) {
  test(`invitation preserves choices and allows retry after ${name}`, async () => {
    const page = invitation(fetch);
    page.form.customDinner.value = 'My restaurant';
    await page.submit();
    assert.equal(page.expired(), false);
    assert.equal(page.element('confirmRsvpBtn').disabled, false);
    assert.equal(page.element('submitError').hidden, false);
    assert.equal(page.element('submitError').focused, true);
    assert.equal(page.form.customDinner.value, 'My restaurant');
    assert.notEqual(page.element('successOverlay').style.display, 'flex');
  });
}

test('invitation locks only after a durable receipt and renders suggestions as text', async () => {
  let payload;
  const page = invitation(async (url, options) => {
    assert.equal(url, '/api/submit-rsvp');
    assert.equal(page.expired(), false);
    assert.equal(page.element('confirmRsvpBtn').disabled, true);
    payload = JSON.parse(options.body);
    return Response.json({ accepted:true, request_id:payload.request_id });
  });
  page.form.customDinner.value = '<img src=x onerror=alert(1)>';
  await page.submit();
  assert.equal(page.expired(), true);
  assert.deepEqual(payload.activities, ['Bowling 🎳']);
  assert.equal(page.element('successOverlay').style.display, 'flex');
  assert.equal(page.element('mainContent').inert, true);
  assert.ok(page.element('successSummary').innerHTML.includes('&lt;img'));
  assert.ok(!page.element('successSummary').innerHTML.includes('<img'));
});

test('invitation keeps the idempotency key across a reload after an uncertain delivery', async () => {
  const storage = new Map();
  const requests = [];
  const fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    requests.push(payload);
    if (requests.length === 1) throw new TypeError('Connection closed after dispatch');
    return Response.json({ accepted: true, request_id: payload.request_id, duplicate: true });
  };
  const first = invitation(fetch, storage);
  first.form.placeNotes.value = 'Private draft note';
  await first.submit();
  const reloaded = invitation(fetch, storage);
  reloaded.form.placeNotes.value = first.form.placeNotes.value;
  await reloaded.submit();
  assert.equal(requests[0].request_id, requests[1].request_id);
  assert.equal(reloaded.expired(), true);
  assert.deepEqual([...storage.values()], [requests[0].request_id]);
});

test('invitation rejects non-web links before confirmation', () => {
  const page = invitation(async () => { throw Error('must not send'); });
  page.form.placeLink.value = 'javascript:alert(1)';
  page.element('openDisclaimerBtn').listeners.click();
  assert.equal(page.element('formError').hidden, false);
  assert.notEqual(page.element('sponsorshipModal').opened, true);
});

test('invitation prevents duplicate dispatch and dismissal while sending', async () => {
  let reply;
  let requests = 0;
  const page = invitation(async () => {
    requests++;
    return new Promise(resolve => { reply = resolve; });
  });
  const pending = page.submit();
  await new Promise(resolve => setImmediate(resolve));
  await page.submit();
  assert.equal(requests, 1);
  assert.equal(page.element('runawayBtn').disabled, true);
  let prevented = false;
  page.element('sponsorshipModal').listeners.cancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  reply(Response.json({ success: false }, { status: 503 }));
  await pending;
  assert.equal(page.element('runawayBtn').disabled, false);
});
