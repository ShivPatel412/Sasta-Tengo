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

## Other workflow endpoints

Apply `scripts/009-job-hunter-workflows-supabase.sql` after the ingestion schema.
All routes use the same server-only bearer authentication and Supabase connection.

| Method | Path under `/api/job-hunter` | Behavior |
| --- | --- | --- |
| POST | `/score` | Upsert the AI score by job ID; leave the job's application status unchanged. |
| POST | `/resume-drafts` | Save a review-required resume draft. |
| POST | `/application-drafts` | Save a review-required application draft; never submit it. |
| POST | `/interview-packs` | Save a review-required interview pack. |
| POST | `/agent-tasks` | Queue a task that requires approval; never execute it. |
| GET | `/follow-ups?days=7` | Return at most 100 oldest eligible jobs without existing reminders. |
| POST | `/reminders` | Save internal follow-up reminders; never send messages. |

Score and draft routes accept the workflows' `{id, verified_profile, ai, ...jobFields}` payloads.
`job_id` can replace `id`; conflicting IDs are rejected. The job must exist.
The `ai` object is validated against each workflow's prompt contract.
A non-placeholder verified profile is required; profile contents are not copied into storage.
Validation cannot independently establish that AI-generated statements are true; every draft requires review.
Repeated identical draft/task payloads and reminders are deduplicated. Changed drafts are retained as new versions.

Agent tasks accept `{message, job_id, skill, reason, requires_approval:true, status:"queued"}`.
Targeted score, resume, application, and interview tasks require a job ID.
Only the seven supported skills are accepted; there is no submission skill.

Follow-ups require a job in `applied` or `awaiting_reply`, an explicit `applied_at` older than the requested
1–365 day threshold, `follow_up_completed:false`, and no saved reminder.
Discovery dates are never treated as application dates. Jobs lacking an application date are excluded.
The read-only database function uses caller privileges and is executable only by the service role.
Existing reminders are excluded before limiting the result, so already-reminded jobs cannot block later candidates.

Reminders accept `{reminders:[{job_id,company?,title?,reminder_type:"review_followup",send_external_message:false}]}`.
Company/title are optional workflow metadata and are not used to overwrite the stored job.
Each job must still be applied, have a recorded nonfuture application date, and have an incomplete follow-up.
An empty reminder list succeeds without writes. Repeated reminders are ignored.

These routes store data only. They do not call an AI provider, dispatch tasks, submit applications, or activate workflows.
Keep all seven workflows unpublished until AI credentials and the verified candidate profile are configured separately.
