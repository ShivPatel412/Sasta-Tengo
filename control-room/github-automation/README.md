# GitHub review drafts

Workflow `znWH2q245LqTt8kK` imports changed public repositories owned by `ShivPatel412` into website review drafts, at most three per hourly run. Unchanged revisions are skipped.

Current mode uses public GitHub metadata and repository preview images. `generateCover` and `captureScreenshots` are false because Gemini image generation returned HTTP 429 with quota 0 and no Browserless credential exists. Missing artwork is recorded as `cover_status: unavailable`; the website blocks publication of these drafts. Missing screenshots are explicitly disclosed. No generated artwork or screenshots are fabricated.

The four website nodes share the scoped `Shiv GitHub website automation` Header Auth credential, matching production `PROJECT_AUTOMATION_KEY`. Secret values stay in n8n and Vercel. The exported workflow remains inactive for safe import.

Before enabling artwork, provide Gemini image quota and configure a separate **public** cover-image store. The private Instagram store must never host public project covers. Before enabling screenshots, assign Browserless Query Auth (`token`) to the capture node. Change `pipelineVersion` when enabling these features so previously imported repository revisions are reconsidered. Test manually before publishing the workflow. Keep one scheduler active.
