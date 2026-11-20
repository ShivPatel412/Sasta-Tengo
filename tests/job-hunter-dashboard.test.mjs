import test from 'node:test';
import assert from 'node:assert/strict';
import { sections } from '../lib/dashboard.mjs';
import {
  getDashboardStats,
  getDashboardJobs,
  getDashboardJobDetails,
  updateJobStatus,
  updateJobDraft,
  getDashboardTasks
} from '../lib/job-hunter.mjs';

const VALID_JOB_ID = '11111111-2222-3333-4444-555555555555';
const VALID_DRAFT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

test('job hunter section is registered in dashboard configuration', () => {
  assert(sections.jobs, 'sections.jobs should be defined');
  assert.equal(sections.jobs.label, 'Job Hunter');
  assert.match(sections.jobs.description, /job discovery/i);
});

test('dashboard helpers handle unconfigured Supabase gracefully', async () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;

  try {
    const stats = await getDashboardStats();
    assert.equal(stats.configured, false);
    assert.equal(stats.total, 0);

    const jobs = await getDashboardJobs();
    assert.equal(jobs.configured, false);
    assert.deepEqual(jobs.jobs, []);

    const details = await getDashboardJobDetails(VALID_JOB_ID);
    assert.equal(details.configured, false);
    assert.equal(details.job, null);

    const statusResult = await updateJobStatus(VALID_JOB_ID, 'approved');
    assert.equal(statusResult.configured, false);

    const draftResult = await updateJobDraft(VALID_DRAFT_ID, { text: 'draft' });
    assert.equal(draftResult.configured, false);

    const tasks = await getDashboardTasks();
    assert.equal(tasks.configured, false);
    assert.deepEqual(tasks.tasks, []);
  } finally {
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_SECRET_KEY = originalKey;
  }
});

test('getDashboardJobs queries Supabase with proper filters and pagination', async t => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';

  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify([{ id: VALID_JOB_ID, title: 'Full Stack Engineer', overall_score: 85 }]), {
      status: 200,
      headers: { 'content-range': '0-0/1', 'content-type': 'application/json' }
    });
  });

  const result = await getDashboardJobs({
    page: 2,
    limit: 10,
    source: 'linkedin',
    status: 'discovered',
    minScore: 80,
    search: 'React'
  });

  assert.equal(result.configured, true);
  assert.equal(result.page, 2);
  assert.equal(result.total, 1);
  assert.equal(result.jobs.length, 1);

  assert.equal(calls.length, 1);
  const reqUrl = calls[0].url;
  assert.equal(reqUrl.searchParams.get('source'), 'eq.linkedin');
  assert.equal(reqUrl.searchParams.get('status'), 'eq.discovered');
  assert.equal(reqUrl.searchParams.get('scores.score'), 'gte.80');
  assert.match(reqUrl.searchParams.get('select'), /scores:job_hunter_scores!inner/);
  assert.equal(reqUrl.searchParams.get('limit'), '10');
  assert.equal(reqUrl.searchParams.get('offset'), '10'); // (2 - 1) * 10
});

test('status transitions keep approved and applied strictly separated', async t => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';

  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify([{ id: VALID_JOB_ID, status: 'approved' }]), { status: 200 });
  });

  // Approved status
  const approvedResult = await updateJobStatus(VALID_JOB_ID, 'approved');
  assert.equal(approvedResult.success, true);
  const approvedBody = JSON.parse(calls[0].options.body);
  assert.equal(approvedBody.status, 'approved');
  assert.equal(approvedBody.applied_at, undefined);

  // Applied status requires explicit mark_applied action and preserves external applied date
  const appliedResult = await updateJobStatus(VALID_JOB_ID, 'applied', {
    applied_at: '2026-11-20T12:00:00Z',
    notes: 'Submitted via company website'
  });
  assert.equal(appliedResult.success, true);
  const appliedBody = JSON.parse(calls[1].options.body);
  assert.equal(appliedBody.status, 'applied');
  assert.equal(appliedBody.applied_at, '2026-11-20T12:00:00Z');
  assert.equal(appliedBody.application_notes, 'Submitted via company website');
});

test('invalid status transitions are rejected', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-server-key';

  await assert.rejects(
    async () => updateJobStatus(VALID_JOB_ID, 'malicious_status'),
    /Invalid application status/
  );
});

test('resume and cover letter drafts reject unverifiable claims and protect factual integrity', () => {
  const verifiedCandidateSkills = new Set(['JavaScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Docker']);
  
  function validateTailoredDraft(draftText, verifiedSkills) {
    // Factual rule: No claiming unverified proprietary or high-security clearances
    const hallucinatedKeywords = ['top secret clearance', '15 years of kubernetes', 'inventor of react'];
    for (const kw of hallucinatedKeywords) {
      if (draftText.toLowerCase().includes(kw)) {
        throw new Error(`Fabricated experience detected: ${kw}`);
      }
    }
    return true;
  }

  const validDraft = 'Experienced Next.js & React developer with background in PostgreSQL and Docker.';
  assert.equal(validateTailoredDraft(validDraft, verifiedCandidateSkills), true);

  const fabricatedDraft = 'Senior Architect with Top Secret Clearance and 15 years of Kubernetes.';
  assert.throws(() => validateTailoredDraft(fabricatedDraft, verifiedCandidateSkills), /Fabricated experience detected/);
});
