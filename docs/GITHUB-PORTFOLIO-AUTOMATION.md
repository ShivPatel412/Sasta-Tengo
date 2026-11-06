# Hourly GitHub portfolio automation

Implementation is prepared locally. It has not been activated or verified against
production. The n8n connector failed and browser access to n8n was declined.

## Behavior

The existing worker reads public repositories owned by `ShivPatel412`, excludes
forks and archived repositories, and compares repository revisions with the
portfolio API. Changed repositories receive factual descriptions from README,
language and topic data, GitHub and live links, a generated black and `#98FF02`
cover, and a genuine Chromium screenshot of their live website. Images are
uploaded to the existing Vercel Blob storage before project ingestion.

The website can publish automatically with the configured administrator recorded
as publisher. Missing screenshots leave projects pending; capture is retried on
the next scan and successful generated content is reused. Existing featured
placement and gallery images are preserved. Rejected and published revisions
are skipped. A live project changed during processing produces a conflict.

Repositories without a deployed website remain drafts until a live URL is added
to GitHub's homepage field or the worker's `live_urls` mapping. A generated cover
is conceptual artwork, never a replacement for a real screenshot.

## Required production setup

1. Deploy the project automation API and helpers with the website. Apply the
   additive migration using `node --env-file=.env.local scripts/migrate-project-automation.mjs`
   with the intended production database configuration.
2. Configure website environment variables privately:
   `PROJECT_GITHUB_OWNER=ShivPatel412`, `PROJECT_AUTOMATION_KEY` (32+ random
   characters), `PROJECT_AUTOMATION_AUTO_PUBLISH=1`, existing `ADMIN_EMAIL`,
   `BLOB_READ_WRITE_TOKEN`, and `MIGRATION_READ_ONLY=0`. Redeploy after changing
   Vercel environment variables. The machine key can publish projects when this
   opt-in is enabled; it cannot log in as the administrator.
3. Keep the worker configuration outside Git, using
   `control-room/project-worker/config.example.json` as its shape. Set
   `portfolio_origin=https://www.shivpatel.in`, matching `portfolio_key`, the
   existing worker token and Gemini bridge settings (or an existing Gemini API
   key), verified text/image model IDs, and an existing website project category.
   Preserve all private credentials already configured. Remove the earlier
   `include_repositories: ["Sasta-Tengo"]` test restriction to scan all owned
   public repositories. Set `auto_publish=true` and `max_per_scan=3`.
4. Use a functioning Python environment with the worker's Playwright and Pillow
   dependencies and installed Chromium. The existing Windows Python executable
   could not load its `encodings` standard-library module during verification.
5. Choose one scheduler. For the worker's own scheduler set
   `schedule_enabled=true` and `interval_seconds=3600`, then run it under the
   existing service supervisor. It scans at startup and hourly thereafter.
   For an n8n Schedule Trigger, use every 1 hour, then HTTP POST the worker's
   reachable `/run` endpoint with JSON `{}` and its existing bearer credential;
   leave the internal scheduler disabled. Do not expose the worker publicly.
   The n8n container's `localhost` refers to that container; use the actual
   established host/service route to port 8793.
6. Test one repository before enabling the schedule: `/status` must report
   configured, `/run` must queue, and completed status must report a published
   project. Verify its cover, screenshot, GitHub link and live link on the public
   website, then repeat the scan to confirm it adds no duplicate.

## Verification in this session

All 63 Node tests passed, including automatic-publishing opt-in, missing
screenshot handling, rejected revision preservation, screenshot retry evidence,
and preservation of edited draft text. Live execution, production migration,
deployment and schedule activation remain unverified. Image generation requires
working provider access and can incur provider charges for changed repositories.
