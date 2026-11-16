# Dashboard and portfolio verification — 16 November 2026

## Changes

- Restored actual n8n execution history to the unified workflow page, before workflow cards, with publication state and AI-node counts.
- Added 30-second workflow refresh with timer cleanup and last-known-state warnings on failed reads.
- Removed the unused duplicate workflow-monitoring branch and unused import from ControlPanels.
- Checked individual source timestamps and errors; a fresh upload no longer makes nine-day-old cloud usage appear current.
- Fixed the exported n8n final-publication node to honor autoPublish=false and preserve manual approval. The installed workflow could not be updated in this session.
- Updated stale deployment/cutover notes and documented the master flag and independent upload secret.

## Production evidence before deployment

- Deployed main: e599d9614a09b1b474cdb2f3489c06faefc151f5; Vercel project sasta-tengo.
- Collector and upload timers active; uploads succeed every 30 seconds. Database snapshot and authenticated master API contain 123 workflows and 30 recent executions.
- Authenticated session, analytics, projects, experience, contacts, service inquiries, tasks, CRM, workflows, collector status and project drafts all returned HTTP 200. Signed-out protected APIs returned 401.
- Public portfolio contains 10 projects. All seven GitHub automation rows are published and reference IDs present in the public project API.
- Hourly GitHub workflow znWH2q245LqTt8kK is active. Execution 8796 succeeded and skipped unchanged repositories. Existing covers are reused; two projects have saved real browser captures.
- Legacy Python dashboard service is disabled and inactive; the old hostname returns HTTP 404. Collector/storage/worker services were preserved.

## Validation

- 104 current-main Node tests pass, including publication switch, source freshness and workflow metadata regressions.
- Production application compiles with Webpack. The isolated checkout shares dependencies with the original checkout; Turbopack's workspace boundary rejects that junction, so local build verification uses --webpack. The deployment uses its normal clean dependency install.
- Headless browser on the corrected build with actual authenticated data: 30 rendered executions; a second workflow request after 30 seconds; agents/projects/overview load; 390px viewport has no horizontal overflow; temporary task create/update/cleanup passes.
- Contact and service-request handlers save complete answers and update dashboard statistics in the guarded isolated local database. Missing consent is rejected. Test records and queued notifications were removed; no test email was sent.
- Temporary browser sessions were deleted. Existing uncommitted work in portfolio-site was preserved in its original branch.

## Remaining work and risks

- n8n tool rejected both the one-node workflow update and image-provider test: requires approval, but approval policy is never. Manual run and provider billing/quota could not be verified. Exported fix is ready; installed workflow is unchanged.
- Gemini and OpenAI credentials are connected; funded image access is unverified. No Browserless credential was found. Both recurring media switches remain off. New repositories without covers stay pending.
- No WORKSPACE_N8N_WORKFLOWS execution webhooks are configured; dashboard Run buttons remain disabled. Monitoring works; dashboard dispatch is not live-connected.
- Cloud source reports URLError with last successful source timestamp 7 November. UI now marks usage unavailable. Nextcloud service repair was outside this dashboard/portfolio change.
- No new repository was published as a test because seven real imported projects are already published. No DNS, stored media, service volumes or user content was deleted.
- This review covers the dashboard/automation routes, shared auth/database/validation, collector boundary, workflow export, callers and tests. It is not an exhaustive audit of unrelated iOS, 3D, Instagram or archived workspace code.
