import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestJobs } from '../lib/job-hunter.mjs';

const token = 'test-token-'.repeat(4);
const job = { source: 'manual', title: 'React Developer', url: 'https://example.com/jobs/123', published_at: 'Wed, 18 Nov 2026 12:00:00 GMT' };
const request = (payload, authorization = `Bearer ${token}`, contentType = 'application/json') => new Request('https://example.com/api/job-hunter/ingest', {
  method: 'POST', headers: { authorization, 'content-type': contentType }, body: typeof payload === 'string' ? payload : JSON.stringify(payload)
});

test('ingestion authenticates before parsing, validates whole batches, and persists safely', async t => {
  process.env.SHIV_JOB_API_TOKEN = token;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json(JSON.parse(options.body).map(record => ({ id: '11111111-1111-4111-8111-111111111111', url_hash: record.url_hash })));
  });

  for (const auth of ['', 'Bearer wrong', `Basic ${token}`, `Bearer ${'é'.repeat(40)}`]) {
    assert.equal((await ingestJobs(request('invalid json', auth))).status, 401);
  }
  delete process.env.SHIV_JOB_API_TOKEN;
  assert.equal((await ingestJobs(request({ jobs: [job] }))).status, 503);
  process.env.SHIV_JOB_API_TOKEN = token;
  assert.equal((await ingestJobs(request('broken'))).status, 400);
  assert.equal((await ingestJobs(request({}, `Bearer ${token}`, 'text/plain'))).status, 415);
  assert.equal((await ingestJobs(request(' '.repeat(2000001)))).status, 413);
  for (const payload of [null, {}, { jobs: [] }, { jobs: Array(101).fill(job) },
    { jobs: [job, { ...job, title: ' ' }] }, { jobs: [{ ...job, url: 'javascript:alert(1)' }] },
    { jobs: [{ ...job, url: 'https://user:password@example.com/job' }] },
    { jobs: [{ ...job, published_at: 'invalid' }] }, { jobs: [{ ...job, status: 'applied' }] },
    { jobs: [{ ...job, description: 'x'.repeat(16001) }] }, { jobs: [{ ...job, unexpected: true }] }]) {
    assert.equal((await ingestJobs(request(payload))).status, 422);
  }
  assert.equal(calls.length, 0);

  delete process.env.SUPABASE_SECRET_KEY;
  assert.equal((await ingestJobs(request({ jobs: [job] }))).status, 503);
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';
  const response = await ingestJobs(request({ jobs: [job, { ...job, url: job.url + '#details' }] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: 2, inserted: 1, duplicates: 1, inserted_jobs: [{ ...job, description: '', company: null, location: null, status: 'discovered', id: '11111111-1111-4111-8111-111111111111', published_at: '2026-11-18T12:00:00.000Z' }] });
  const { url, options } = calls[0];
  assert.equal(url.origin, process.env.SUPABASE_URL);
  assert.equal(url.searchParams.get('on_conflict'), 'url_hash');
  assert.equal(options.headers.apikey, 'test-server-key');
  assert.equal(options.headers.Authorization, undefined);
  assert.match(options.headers.Prefer, /ignore-duplicates/);
  assert.equal(options.redirect, 'error');
  const records = JSON.parse(options.body);
  assert.equal(records.length, 1);
  assert.equal(records[0].status, 'discovered');
  assert.equal(records[0].published_at, '2026-11-18T12:00:00.000Z');
  assert.match(records[0].url_hash, /^[a-f0-9]{64}$/);

  globalThis.fetch.mock.mockImplementation(async () => Response.json([]));
  assert.deepEqual(await (await ingestJobs(request({ jobs: [job] }))).json(), { received: 1, inserted: 0, duplicates: 1, inserted_jobs: [] });
  globalThis.fetch.mock.mockImplementation(async () => new Response('private database diagnostics', { status: 500 }));
  const failure = await ingestJobs(request({ jobs: [job] }));
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /private database/);
  globalThis.fetch.mock.mockImplementation(async () => { throw new Error('secret transport diagnostics'); });
  assert.equal((await ingestJobs(request({ jobs: [job] }))).status, 503);
});
