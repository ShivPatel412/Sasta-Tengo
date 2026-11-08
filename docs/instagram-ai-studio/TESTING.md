# Verification

Verified on the local isolated database, 8 November 2026. No private user photos,
production workflow activation or Instagram publishing were used.

## Automated

`pnpm test`: **74 tests passed**, including existing authentication, forms,
project editors, media handling and n8n status-feed tests plus nine Studio tests.
New cases cover schema/identity limits, duplicate IDs, locked selection and late
positions, manual caption preservation, malformed/unsafe images, EXIF removal,
dHash bounds, restricted webhook destinations, ZIP structure, and inactive n8n
workflow/header authentication/callback-target checks.

`pnpm exec next build --webpack`: passed production compilation, type checking,
route collection and static-page generation. There is no repository lint script.

Local integration command:

```powershell
$env:NODE_ENV='development'
$env:MASTER_DASHBOARD_LOCAL='1'
node --env-file=.env.local --env-file=.env.master.local scripts/test-instagram-studio.mjs --browser
```

Passed with the dev master running:

- Existing admin session and collector access; signed-out Studio/media rejection.
- Real local and phone-source uploads, SHA duplicate reuse and malformed/oversized rejection.
- Owner isolation, album membership and 30-photo persisted batch.
- Exact-origin and stale revision protection.
- Durable waiting jobs, duplicate job creation prevention and cancellation.
- Real HTTP dispatch to a loopback n8n mock, bounded normalized previews,
  immediate acknowledgement and actual protected callback/database completion.
- Unauthorized/repeated callbacks, old attempts, provider failures and late results.
- Locked photo position and manual caption persistence.
- Approval saves approved status and leaves publishing history empty.
- Authenticated browser: eight tabs, actual file-input upload, draft save/reopen,
  drag and arrow ordering, undo, ZIP download (valid JPEGs without EXIF), disabled
  unconfigured Google button, no page errors and no overflow at 390px.

The test guards the exact isolated database target. It creates synthetic images,
short-lived sessions, drafts/jobs/albums and removes only those fixture records
and stored copies. It resets only new Studio rate-limit buckets in that local
test environment, never production/login limits. Browser screenshots under
ignored `.local/instagram-studio-*.png` contain synthetic images, not examples
of real AI quality. The cleanup command's dry run passed with no eligible data.

## Not verified externally

- Real Gemini visual scores/captions, quotas and new n8n workflow activation.
- Private production Blob upload/read/retention.
- Real Google account consent, permissions, import, expiration or revocation.
- Physical phone gallery/network testing; mobile coverage was emulated.
- HEIC on every deployed decoder. Unsupported formats fail explicitly.
- Nextcloud browsing/import, Meta posting and music attachment (not enabled).

Mocked analysis results are explicitly synthetic fixtures. They demonstrate
transport/persistence/override correctness, not model quality or provider access.
