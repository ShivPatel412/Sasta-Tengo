import test from 'node:test';
import assert from 'node:assert/strict';
import { saveJobScore, saveJobDraft, queueJobTask, jobFollowUps, saveJobReminders } from '../lib/job-hunter.mjs';
import { verificationJobId, missingJobId, score, resume, application, interview, task, reminder, generated } from './fixtures/job-hunter.mjs';

const token = 'test-token-'.repeat(4);
const request = (input, path = '', auth = `Bearer ${token}`) => new Request(`https://example.com/api/job-hunter/${path}`, {
  method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(input)
});
const handlers = [saveJobScore, ...['resume', 'application', 'interview'].map(kind => request => saveJobDraft(request, kind)),
  queueJobTask, jobFollowUps, saveJobReminders];

test('all workflow endpoints authenticate first and reject invalid payloads without database requests', async t => {
  process.env.SHIV_JOB_API_TOKEN = token;
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not contact storage.'); });
  for (const handler of handlers) {
    assert.equal((await handler(request({}, '', ''))).status, 401);
    assert.equal((await handler(request({}, '', 'Bearer wrong'))).status, 401);
  }
  const invalidScores = [generated({ ...score, score: 101 }), generated({ ...score, score: 1.5 }),
    generated({ ...score, eligibility: 'probably' }), { ...generated(score), job_id: missingJobId },
    { ...generated(score), id: 'bad' }, { ai: score }, { ...generated(score), verified_profile: 'Profile missing: require manual review' }];
  for (const input of invalidScores) assert.equal((await saveJobScore(request(input))).status, 422);
  for (const [kind, ai] of Object.entries({ resume, application, interview })) {
    assert.equal((await saveJobDraft(request(generated({ ...ai, review_required: false })), kind)).status, 422);
  }
  assert.equal((await saveJobDraft(request(generated({ ...application, cover_letter: 'word '.repeat(251) })), 'application')).status, 422);
  for (const input of [{ ...task, requires_approval: false }, { ...task, skill: 'submit' },
    { ...task, skill: 'resume', job_id: null }, { ...task, status: 'completed' }]) {
    assert.equal((await queueJobTask(request(input))).status, 422);
  }
  for (const input of [{ reminders: [{ ...reminder, send_external_message: true }] }, { reminders: [{ ...reminder, reminder_type: 'send_email' }] },
    { reminders: [{ ...reminder, job_id: 'not-a-uuid' }] }, { reminders: Array(101).fill(reminder) }]) {
    assert.equal((await saveJobReminders(request(input))).status, 422);
  }
  for (const days of ['0', '-1', '1.5', '366', 'NaN', '7&days=8']) {
    assert.equal((await jobFollowUps(request({}, `follow-ups?days=${days}`))).status, 422);
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test('workflow payloads preserve job association, review gates, safe retries and private error responses', async t => {
  process.env.SHIV_JOB_API_TOKEN = token;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options, data: options.body ? JSON.parse(options.body) : null });
    return Response.json([{ id: verificationJobId }]);
  });
  assert.equal((await saveJobScore(request(generated(score)))).status, 200);
  assert.equal(calls[0].url.pathname, '/rest/v1/job_hunter_scores');
  assert.equal(calls[0].data.job_id, verificationJobId);
  assert.equal(calls[0].data.verified_profile, undefined);
  assert.equal(calls[0].data.eligibility, 'unknown');
  assert.match(calls[0].options.headers.Prefer, /merge-duplicates/);
  for (const [kind, ai] of Object.entries({ resume, application, interview })) {
    const result = await saveJobDraft(request(generated(ai)), kind);
    assert.equal(result.status, 200);
    assert.equal((await result.json()).review_required, true);
    const call = calls.at(-1);
    assert.equal(call.data.kind, kind);
    assert.equal(call.data.review_required, true);
    assert.deepEqual(call.data.content, ai);
    assert.match(call.data.content_hash, /^[a-f0-9]{64}$/);
    assert.match(call.options.headers.Prefer, /ignore-duplicates/);
  }
  assert.equal((await queueJobTask(request(task))).status, 200);
  assert.equal(calls.at(-1).data.status, 'queued');
  assert.equal(calls.at(-1).data.requires_approval, true);
  assert.equal((await jobFollowUps(request({}, 'follow-ups?days=14'))).status, 200);
  assert.equal(calls.at(-1).url.pathname, '/rest/v1/rpc/job_hunter_follow_ups');
  assert.deepEqual(calls.at(-1).data, { p_days: 14 });
  assert.equal((await jobFollowUps(request({}, 'follow-ups'))).status, 200);
  assert.deepEqual(calls.at(-1).data, { p_days: 7 });
  globalThis.fetch.mock.mockImplementation(async () => Response.json([]));
  for (const [kind, ai] of Object.entries({ resume, application, interview })) {
    assert.equal((await (await saveJobDraft(request(generated(ai)), kind)).json()).duplicate, true);
  }
  assert.equal((await (await queueJobTask(request(task))).json()).duplicate, true);
  const before = globalThis.fetch.mock.callCount();
  assert.deepEqual(await (await saveJobReminders(request({ reminders: [] }))).json(), { received: 0, inserted: 0, duplicates: 0 });
  assert.equal(globalThis.fetch.mock.callCount(), before);
  assert.equal((await saveJobReminders(request({ reminders: [reminder] }))).status, 404);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ code: '23503', details: 'private details' }, { status: 409 }));
  assert.equal((await saveJobScore(request(generated(score)))).status, 404);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ message: 'private database details' }, { status: 500 }));
  const failure = await saveJobScore(request(generated(score)));
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /private database/);
});

test('reminders validate stored job state and deduplicate a batch before inserting', async t => {
  process.env.SHIV_JOB_API_TOKEN = token;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';
  const calls = [];
  let state = { id: verificationJobId, status: 'applied', applied_at: '2026-01-01T00:00:00Z', follow_up_completed: false };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json(options.method === 'GET' ? [state] : [{ id: verificationJobId }]);
  });
  const response = await saveJobReminders(request({ reminders: [reminder, reminder] }));
  assert.deepEqual(await response.json(), { received: 2, inserted: 1, duplicates: 1 });
  assert.equal(calls[0].url.searchParams.get('id'), `in.(${verificationJobId})`);
  assert.deepEqual(JSON.parse(calls[1].options.body), [{ job_id: verificationJobId, reminder_type: 'review_followup', send_external_message: false }]);
  for (const patch of [{ status: 'discovered' }, { applied_at: null }, { applied_at: 'invalid' },
    { applied_at: '2999-01-01T00:00:00Z' }, { follow_up_completed: true }]) {
    state = { id: verificationJobId, status: 'applied', applied_at: '2026-01-01T00:00:00Z', follow_up_completed: false, ...patch };
    assert.equal((await saveJobReminders(request({ reminders: [reminder] }))).status, 409);
  }
});
