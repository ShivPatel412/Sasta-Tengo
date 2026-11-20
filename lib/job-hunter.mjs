import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { body, handle, HttpError } from './db.mjs';

const jobSchema = z.object({
  source: z.enum(['remoteok', 'weworkremotely', 'rss', 'linkedin', 'indeed', 'wellfound', 'greenhouse', 'lever', 'manual']),
  title: z.string().trim().min(1).max(250),
  url: z.url().max(2048).refine(value => {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  }, 'Use an HTTP or HTTPS job URL without credentials.'),
  description: z.string().max(16000).default(''),
  company: z.string().trim().max(250).nullable().default(null),
  location: z.string().trim().max(500).nullable().default(null),
  published_at: z.string().max(100).refine(value => Number.isFinite(Date.parse(value)), 'Invalid publication date.')
    .transform(value => new Date(value).toISOString()).nullable().default(null),
  status: z.literal('discovered').default('discovered')
}).strict();
const batchSchema = z.object({ jobs: z.array(jobSchema).min(1).max(100) }).strict();

export function jobHunterAuth(request) {
  const token = process.env.SHIV_JOB_API_TOKEN;
  if (!token || token.length < 32) throw new HttpError(503, 'Job Hunter authentication is not configured.');
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(401, 'Unauthorized.');
}

async function jobHunterStore(path, { method = 'GET', data, query = {}, prefer } = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new HttpError(503, 'Job Hunter storage is not configured.');
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new HttpError(503, 'Job Hunter storage is not configured.');
  }
  const endpoint = new URL(`/rest/v1/${path}`, origin);
  endpoint.search = new URLSearchParams(query).toString();
  const response = await fetch(endpoint, {
    method, headers: { apikey: key, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store'
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.code === '23503') throw new HttpError(404, 'Job not found.');
    throw new HttpError(503, 'Job Hunter could not save or read data. Please retry.');
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new HttpError(503, 'Job Hunter could not confirm data. Please retry.');
  return rows;
}

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const ignoreDuplicates = 'resolution=ignore-duplicates,return=representation';
const digest = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');

export async function ingestJobs(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const { jobs } = batchSchema.parse(await body(request, 2000000));
    const records = [...new Map(jobs.map(job => {
      const url = new URL(job.url);
      url.hash = '';
      const normalized = url.href;
      const url_hash = createHash('sha256').update(normalized).digest('hex');
      return [url_hash, { ...job, url: normalized, url_hash }];
    })).values()];
    const saved = await jobHunterStore('job_hunter_jobs', {
      method: 'POST', data: records, prefer: ignoreDuplicates, query: { on_conflict: 'url_hash', select: 'id' }
    });
    return Response.json({ received: jobs.length, inserted: saved.length, duplicates: jobs.length - saved.length },
      noStore);
  });
}

const text = z.string().trim().min(1).max(4000);
const strings = z.array(text).max(100);
const outline = z.union([text, strings]);
// The AI prompts leave project/exercise/plan item shapes open; bound their JSON by the request size.
const structuredItems = z.array(z.union([text, z.record(z.string().max(100), z.json())])).max(100);
const verifiedProfile = z.string().trim().min(1).max(32000).refine(value =>
  !/^(profile missing|missing verified profile|profile not provided)/i.test(value), 'A verified candidate profile is required.');
const jobReference = z.object({ id: z.uuid().optional(), job_id: z.uuid().optional() }).refine(
  data => (data.id || data.job_id) && (!data.id || !data.job_id || data.id === data.job_id),
  'Supply a job id or job_id; both must match when supplied.');
const scoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.record(z.string().min(1).max(80), z.number().min(0).max(100)).refine(value => Object.keys(value).length <= 10),
  matched_skills: strings, gaps: strings, eligibility: z.enum(['eligible', 'ineligible', 'unknown']),
  salary_fit: z.enum(['match', 'mismatch', 'unknown']), reasons: strings, recommendation: z.enum(['high', 'review', 'archive'])
}).strict();
const draftSchemas = {
  resume: z.object({ headline: text, summary: text, ordered_skills: strings,
    experience_bullets: z.array(z.object({ employer: text, bullet: text }).strict()).max(100),
    projects: structuredItems, missing_facts: strings, review_required: z.literal(true) }).strict(),
  application: z.object({ cover_letter: text.refine(value => value.split(/\s+/).length <= 250, 'Cover letter must be at most 250 words.'),
    recruiter_message: z.string().max(500), screening_answers: z.array(z.object({ question: text, draft: text,
      requires_confirmation: z.boolean() }).strict()).max(100), questions_for_candidate: strings, review_required: z.literal(true) }).strict(),
  interview: z.object({ questions: z.array(z.object({ question: text, focus: text, answer_outline: outline }).strict()).min(1).max(100),
    coding_exercises: structuredItems, study_plan: structuredItems, questions_to_ask_interviewer: strings, review_required: z.literal(true) }).strict()
};

export async function saveJobScore(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const input = await body(request, 128000);
    const reference = jobReference.parse(input);
    verifiedProfile.parse(input.verified_profile);
    const ai = scoreSchema.parse(input.ai);
    const job_id = reference.job_id || reference.id;
    await jobHunterStore('job_hunter_scores', { method: 'POST',
      data: { job_id, ...ai, updated_at: new Date().toISOString() },
      prefer: 'resolution=merge-duplicates,return=representation', query: { on_conflict: 'job_id', select: 'job_id' } });
    return Response.json({ saved: true, job_id, score: ai.score }, noStore);
  });
}

export async function saveJobDraft(request, kind) {
  return handle(async () => {
    jobHunterAuth(request);
    const input = await body(request, 128000);
    const reference = jobReference.parse(input);
    verifiedProfile.parse(input.verified_profile);
    const content = draftSchemas[kind].parse(input.ai);
    const job_id = reference.job_id || reference.id;
    const saved = await jobHunterStore('job_hunter_drafts', { method: 'POST',
      data: { job_id, kind, content, content_hash: digest(content), review_required: true },
      prefer: ignoreDuplicates, query: { on_conflict: 'job_id,kind,content_hash', select: 'id' } });
    return Response.json({ saved: true, job_id, kind, status: 'draft', review_required: true, duplicate: saved.length === 0 }, noStore);
  });
}

const taskSchema = z.object({ message: z.string().trim().min(1).max(3000), job_id: z.uuid().nullable().default(null),
  skill: z.enum(['discover', 'score', 'resume', 'application', 'tracker', 'interview', 'help']),
  reason: z.string().trim().min(1).max(3000), requires_approval: z.literal(true).default(true), status: z.literal('queued').default('queued')
}).strict().refine(data => !['score', 'resume', 'application', 'interview'].includes(data.skill) || data.job_id,
  'This skill requires a job_id.');

export async function queueJobTask(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const task = taskSchema.parse(await body(request, 16000));
    const saved = await jobHunterStore('job_hunter_agent_tasks', { method: 'POST', data: { ...task, content_hash: digest(task) },
      prefer: ignoreDuplicates, query: { on_conflict: 'content_hash', select: 'id' } });
    return Response.json({ queued: true, skill: task.skill, job_id: task.job_id, requires_approval: true, duplicate: saved.length === 0 }, noStore);
  });
}

export async function jobFollowUps(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const params = new URL(request.url).searchParams;
    const value = params.get('days') ?? '7';
    if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > 365 || params.getAll('days').length > 1) {
      throw new HttpError(422, 'days must be an integer between 1 and 365.');
    }
    const jobs = await jobHunterStore('rpc/job_hunter_follow_ups', { method: 'POST', data: { p_days: Number(value) } });
    return Response.json({ jobs }, noStore);
  });
}

const reminderSchema = z.object({ job_id: z.uuid(), company: z.string().max(250).optional(), title: z.string().max(250).optional(),
  reminder_type: z.literal('review_followup'), send_external_message: z.literal(false)
}).strict();

export async function saveJobReminders(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const { reminders } = z.object({ reminders: z.array(reminderSchema).max(100) }).strict().parse(await body(request, 128000));
    if (!reminders.length) return Response.json({ received: 0, inserted: 0, duplicates: 0 }, noStore);
    const records = [...new Map(reminders.map(({ job_id, reminder_type, send_external_message }) =>
      [job_id, { job_id, reminder_type, send_external_message }])).values()];
    const jobs = await jobHunterStore('job_hunter_jobs', { query: {
      id: `in.(${records.map(record => record.job_id).join(',')})`, select: 'id,status,applied_at,follow_up_completed'
    } });
    if (jobs.length !== records.length) throw new HttpError(404, 'Job not found.');
    if (jobs.some(job => !['applied', 'awaiting_reply'].includes(job.status) || job.follow_up_completed ||
      !job.applied_at || !Number.isFinite(Date.parse(job.applied_at)) || Date.parse(job.applied_at) > Date.now())) {
      throw new HttpError(409, 'Reminders require an applied job with a recorded application date and an incomplete follow-up.');
    }
    const saved = await jobHunterStore('job_hunter_reminders', { method: 'POST', data: records,
      prefer: ignoreDuplicates, query: { on_conflict: 'job_id,reminder_type', select: 'id' } });
    return Response.json({ received: reminders.length, inserted: saved.length, duplicates: reminders.length - saved.length }, noStore);
  });
}

export async function getDashboardJobs({ page = 1, limit = 20, search = '', source = '', status = '', minScore, maxScore, score_min, score_max } = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { configured: false, jobs: [], total: 0 };
  const query = {
    select: '*,scores:job_hunter_scores(*),drafts:job_hunter_drafts(id,kind,created_at,review_required)',
    order: 'created_at.desc',
    limit: String(Math.min(100, Math.max(1, limit))),
    offset: String(Math.max(0, (page - 1) * limit))
  };
  if (source && source !== 'all') query.source = `eq.${source}`;
  if (status) query.status = `eq.${status}`;
  if (search) query.or = `(title.ilike.*${search}*,company.ilike.*${search}*,location.ilike.*${search}*)`;
  const sMin = minScore !== undefined ? minScore : score_min;
  const sMax = maxScore !== undefined ? maxScore : score_max;
  if (sMin !== undefined) query.overall_score = `gte.${sMin}`;
  if (sMax !== undefined) query.overall_score = `lte.${sMax}`;
  const rows = await jobHunterStore('job_hunter_jobs', { query, prefer: 'count=exact' });
  let filtered = rows;
  if (sMin !== undefined || sMax !== undefined) {
    const min = sMin !== undefined ? Number(sMin) : 0;
    const max = sMax !== undefined ? Number(sMax) : 100;
    filtered = rows.filter(j => {
      const s = j.scores?.[0]?.score ?? j.overall_score;
      return s !== undefined && s >= min && s <= max;
    });
  }
  return { configured: true, jobs: filtered, total: rows.length, page, limit };
}

export async function getDashboardJobDetails(jobId) {
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) throw new HttpError(422, 'Invalid job ID.');
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { configured: false, job: null };
  const [job] = await jobHunterStore('job_hunter_jobs', {
    query: {
      id: `eq.${jobId}`,
      select: '*,scores:job_hunter_scores(*),drafts:job_hunter_drafts(*),reminders:job_hunter_reminders(*)'
    }
  });
  if (!job) throw new HttpError(404, 'Job not found.');
  return { configured: true, job };
}

export async function getDashboardStats() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) {
    return {
      configured: false,
      total: 0,
      scored: 0,
      high_match: 0,
      review_queue: 0,
      resumes_generated: 0,
      applications_submitted: 0,
      interviews_scheduled: 0,
      rejected_archived: 0,
      sources: {}
    };
  }
  const [jobs, scores, drafts] = await Promise.all([
    jobHunterStore('job_hunter_jobs', { query: { select: 'id,source,status' } }).catch(() => []),
    jobHunterStore('job_hunter_scores', { query: { select: 'job_id,score' } }).catch(() => []),
    jobHunterStore('job_hunter_drafts', { query: { select: 'id,kind' } }).catch(() => [])
  ]);
  const sources = {};
  for (const j of jobs) {
    sources[j.source] = (sources[j.source] || 0) + 1;
  }
  return {
    configured: true,
    total: jobs.length,
    scored: scores.length,
    high_match: scores.filter(s => s.score >= 80).length,
    review_queue: jobs.filter(j => ['discovered', 'scored', 'draft_ready'].includes(j.status)).length,
    resumes_generated: drafts.filter(d => d.kind === 'resume').length,
    applications_submitted: jobs.filter(j => ['applied', 'interview', 'offer'].includes(j.status)).length,
    interviews_scheduled: jobs.filter(j => j.status === 'interview').length,
    rejected_archived: jobs.filter(j => ['rejected', 'archived'].includes(j.status)).length,
    sources
  };
}

export async function updateJobStatus(jobId, status, { applied_at, notes } = {}) {
  const allowed = ['discovered', 'scored', 'draft_ready', 'approved', 'applied', 'interview', 'offer', 'rejected', 'archived'];
  if (!allowed.includes(status)) throw new HttpError(422, 'Invalid application status.');
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) throw new HttpError(422, 'Invalid job ID.');
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { configured: false, success: false };
  const update = { status };
  if (status === 'applied') {
    update.applied_at = applied_at || new Date().toISOString();
    if (notes) update.application_notes = notes;
  }
  await jobHunterStore('job_hunter_jobs', {
    method: 'PATCH',
    query: { id: `eq.${jobId}` },
    data: update
  });
  return { ok: true, success: true, job_id: jobId, status };
}

export async function updateJobDraft(draftId, content) {
  if (!draftId || !/^[0-9a-f-]{36}$/i.test(draftId)) throw new HttpError(422, 'Invalid draft ID.');
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { configured: false, success: false };
  await jobHunterStore('job_hunter_drafts', {
    method: 'PATCH',
    query: { id: `eq.${draftId}` },
    data: { content, review_required: false }
  });
  return { ok: true, success: true, draft_id: draftId };
}

export async function getDashboardTasks() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { configured: false, tasks: [] };
  const tasks = await jobHunterStore('job_hunter_agent_tasks', {
    query: { select: '*', order: 'created_at.desc', limit: '30' }
  }).catch(() => []);
  return { configured: true, tasks };
}
