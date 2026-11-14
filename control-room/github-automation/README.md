# GitHub project publishing

Workflow `znWH2q245LqTt8kK` checks owned public repositories hourly and processes at most three changes per run. The exported workflow remains inactive for safe import; the installed workflow has one active scheduler.

## Source inspection

New revisions read repository metadata, README, languages, the source tree and up to eight bounded implementation or dependency files. The shared website inspector identifies frameworks and libraries from actual manifests and imports, and extracts supported project capabilities. It never executes repository code, reads backups or environment files, or invents business results. A failed inspection leaves the project unchanged and returns to the batch loop.

Inspection uses four GitHub API requests per project; source text comes from public raw file URLs. Production can optionally use `GITHUB_TOKEN` to increase API limits. If GitHub throttles inspection, the project retries on a later run.

## Covers and layout

Covers use a portrait 4:5 product-showcase composition: project title, relevant software presentation, realistic devices, warm off-white, lavender, charcoal and restrained violet. Covers fill the preview panel using `object-fit: cover`. Descriptions scroll independently on desktop; the mobile dialog scrolls normally.

Generated interface concepts are illustrative cover artwork. The gallery contains real browser captures only. Existing covers and galleries are reused across repository revisions. Missing covers still block publishing; provider access is never fabricated.

## Automatic publishing

Automatic publication is explicitly enabled by the workflow's `autoPublish` configuration. The cover checkpoint still uses `manual_approval: true` so a partial media save cannot publish. After optional screenshot capture, the final request removes that checkpoint flag and sends `auto_publish: true`. A generated cover is required; a screenshot and a live URL are optional. Missing covers stay pending, and rejected revisions remain rejected.

Media-only recovery uses the saved revision and preserves dashboard edits. New repository revisions refresh descriptions and technologies from inspected evidence. Existing project IDs, featured placement and manually added gallery images are retained. Stale revisions and conflicting live edits fail rather than silently overwrite data.

## Provider configuration

- Website API nodes reuse `Shiv GitHub website automation` Header Auth: `Authorization: Bearer <PROJECT_AUTOMATION_KEY>`.
- Production requires the matching automation key, `PROJECT_GITHUB_OWNER=ShivPatel412` and an existing administrator identified by `ADMIN_EMAIL`.
- Gemini generation uses the assigned Google credential and requires working image quota. Its prompt now matches the product-showcase art direction.
- Browserless capture uses templated Custom Auth with query parameter `token`.
- Provider uploads require a public Blob store; do not use the private Instagram store.

The Gemini and Browserless switches remain off until their access is ready. Existing generated covers support automatic publication now. New repositories without a generated cover remain pending until generation is configured. Keep one scheduler active and avoid overlapping manual runs.
