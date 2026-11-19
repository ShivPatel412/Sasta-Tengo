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

export async function ingestJobs(request) {
  return handle(async () => {
    jobHunterAuth(request);
    const { jobs } = batchSchema.parse(await body(request, 2000000));
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!base || !key) throw new HttpError(503, 'Job Hunter storage is not configured.');
    const origin = new URL(base);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new HttpError(503, 'Job Hunter storage is not configured.');
    }
    const records = [...new Map(jobs.map(job => {
      const url = new URL(job.url);
      url.hash = '';
      const normalized = url.href;
      const url_hash = createHash('sha256').update(normalized).digest('hex');
      return [url_hash, { ...job, url: normalized, url_hash }];
    })).values()];
    const endpoint = new URL('/rest/v1/job_hunter_jobs', origin);
    endpoint.searchParams.set('on_conflict', 'url_hash');
    endpoint.searchParams.set('select', 'id');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(records),
      signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store'
    });
    if (!response.ok) throw new HttpError(503, 'Job Hunter could not save jobs. Please retry.');
    const saved = await response.json();
    if (!Array.isArray(saved)) throw new HttpError(503, 'Job Hunter could not confirm saved jobs. Please retry.');
    return Response.json({ received: jobs.length, inserted: saved.length, duplicates: jobs.length - saved.length },
      { headers: { 'Cache-Control': 'no-store' } });
  });
}
