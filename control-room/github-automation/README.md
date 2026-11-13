# GitHub review drafts

Workflow `znWH2q245LqTt8kK` imports changed public repositories owned by `ShivPatel412` into website review drafts, at most three per hourly run. Unchanged revisions are skipped.

Current mode uses public GitHub metadata and repository preview images. `generateCover` and `captureScreenshots` are false because Gemini image generation returned HTTP 429 with quota 0 and no Browserless credential exists. Missing artwork is recorded as `cover_status: unavailable`; the website blocks publication of these drafts. Missing screenshots are explicitly disclosed. No generated artwork or screenshots are fabricated.

The four website nodes share the scoped `Shiv GitHub website automation` Header Auth credential, matching production `PROJECT_AUTOMATION_KEY`. Secret values stay in n8n and Vercel. The exported workflow remains inactive for safe import.

Verified live: execution `8637` saved the Sasta-Tengo review draft; repeat execution `8638` returned zero changed repositories; normal execution `8639` saved three more pending drafts. The installed workflow is published with one hourly schedule. The production draft table was created with the existing additive migration, preserving existing project, form and account counts.

Before enabling artwork, provide Gemini image quota and configure a separate **public** cover-image store. The private Instagram store must never host public project covers. Before enabling screenshots, assign Browserless Query Auth (`token`) to the capture node. Test one project before enabling either switch. Keep one scheduler active.

## Media recovery

Deploy the updated website API first. Authenticated pending rows now include their saved project and provenance; the workflow fails closed if the old API is deployed. Pending drafts retain their revision, edited fields and live URL until review. New repository metadata waits until that review is complete. Media switches no longer affect revision hashes, and no pipeline version bump is needed to retry missing media.

Generated covers are saved to the draft before screenshot capture. Later screenshot retries reuse that cover. Recovery adds media to the current database row without replacing edited text, category, technologies, placement or existing gallery images. Stale revisions, reviewed drafts, changed live URLs and full galleries are rejected. Screenshot retries cannot downgrade generated cover evidence or replace an edited cover. Removed gallery items are not restored from stale snapshots.

Missing media is retried only when its feature switch is enabled; screenshots also need a live URL. Candidate order rotates hourly to prevent failed projects starving the rest. Media failures go to `Record media retry` and return to the batch loop. Inspect execution results for `retry_pending`: an execution can succeed while individual media steps fail. Failures before the cover checkpoint can still repeat generation charges.

Every draft request sends `manual_approval: true`, preventing automatic publication even if `PROJECT_AUTOMATION_AUTO_PUBLISH` is enabled for another client. AI covers remain required for manual approval; screenshots are optional.

## Required credentials

- Website: reuse `Shiv GitHub website automation` Header Auth on all website nodes, including `Save screenshot to draft`: `Authorization: Bearer <PROJECT_AUTOMATION_KEY>`. Production also needs the matching key and `PROJECT_GITHUB_OWNER=ShivPatel412`.
- Gemini: the assigned `Xstream - Google Gemini(PaLM) Api account` needs billing/image quota for `gemini-3.1-flash-image`. The prior zero-quota result is historical, not a live check.
- Browserless: assign Query Auth to `Capture real website screenshot`, parameter name `token`, value your Browserless API token. It is currently unassigned.
- Storage: production `BLOB_READ_WRITE_TOKEN` must belong to a public Blob store. Both image types must be under 4 MB.

The image switches remain off until credentials and storage are ready. Only Sasta-Tengo, Ask-Her-For-Date and Ask-For-Date currently have live URLs; Ask-For-Date returned HTTP 500 during inspection. The other four drafts can receive covers and be manually approved without screenshots.
