# Job Hunter ingestion

`POST /api/job-hunter/ingest` requires `Authorization: Bearer <SHIV_JOB_API_TOKEN>`.
Configure a random server-only token of at least 32 characters and the same token in n8n's existing Header Auth credential.
Set server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Vercel production.
Apply `scripts/008-job-hunter-supabase.sql` to the dedicated Supabase Postgres project before ingestion.
This does not use or modify the portfolio's MySQL tables.

Send `{ "jobs": [{ "source": "manual", "title": "React Developer", "url": "https://example.com/jobs/123" }] }`.
The collector's optional `description`, `company`, `location`, `published_at`, and `status: "discovered"` fields are supported.
Every job is validated before the batch is sent to Supabase. Maximum: 100 jobs and 2 MB per request.
Publication dates are normalized to UTC; job URLs accept HTTP/HTTPS and have fragments removed.
Only the service role can read or insert jobs; browser and signed-in user roles have no table privileges or policies.

The response reports `received`, `inserted`, and `duplicates`.
Duplicate URLs are ignored atomically, preserving existing job details and progress.
Database errors return 503 without database diagnostics or keys; retrying the same batch is safe.
Missing/incorrect credentials return 401; missing server configuration returns 503.
Invalid JSON returns 400, invalid jobs 422, oversized bodies 413, and non-JSON content 415.

This endpoint only stores discovered jobs. It does not score jobs, submit applications, or activate workflows.
Keep all seven Job Hunter workflows unpublished while verifying the other backend endpoints separately.
