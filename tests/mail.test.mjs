import test from 'node:test';
import assert from 'node:assert/strict';
import { deliver } from '../lib/mail.mjs';

test('an empty SMTP password leaves queued enquiries untouched', async t => {
  t.mock.property(process, 'env', { ...process.env, SMTP_HOST: 'smtp.hostinger.com', SMTP_FROM: 'Shiv Patel <info@shivpatel.in>', SMTP_USER: 'info@shivpatel.in', SMTP_PASSWORD: '', LEAD_RECIPIENT: 'info@shivpatel.in' });
  await assert.rejects(deliver(), /SMTP not configured/);
});
