import test from 'node:test';
import assert from 'node:assert/strict';
import { submitHireInquiry } from '../lib/hire-inquiry.mjs';
import { contactSchema } from '../lib/validation.mjs';

function inquiry() {
  const form = new FormData();
  Object.entries({ name: ' Jane Doe ', email: 'jane@example.com', service: 'Website design', message: ' A new business website. ' }).forEach(([key, value]) => form.set(key, value));
  return form;
}
test('landing page uses the existing contact and notification contract', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/contacts');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'same-origin');
    const payload = contactSchema.parse(JSON.parse(options.body));
    assert.deepEqual(payload, { name: 'Jane Doe', email: 'jane@example.com', phone: '', subject: 'Freelance landing page: Website design', message: 'A new business website.' });
    return Response.json({ message: 'Your message has been received.' }, { status: 201 });
  });
  assert.equal((await submitHireInquiry(inquiry())).data.message, 'Your message has been received.');
});
test('failed enquiries reject and preserve their details for retry', async t => {
  const form = inquiry();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Please try again.' }, { status: 503 }));
  await assert.rejects(submitHireInquiry(form), /Please try again/);
  assert.equal(form.get('email'), 'jane@example.com');
  assert.equal(form.get('message'), ' A new business website. ');
});
