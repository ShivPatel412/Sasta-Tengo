# Instagram AI Studio delivery report

## 1. Existing system audit

See AUDIT.md, written before application changes. Reused the existing Next.js
App Router dashboard, administrator/session authentication, MySQL connection,
origin protection, sanitized errors, shared typography/navigation, Phosphor
icons and installed image-decoder version. The read-only n8n collector and live
status feed were not modified. Earlier untracked photo-automation source was
preserved and is not part of this feature commit.

## 2. Implemented functionality

The native `/dashboard/instagram` module has Overview, Create Post, Photo Library,
Smart Albums, AI Analysis, Drafts, Post History and Settings. The Studio uses
dark surfaces and #98FF02 accents inside the existing dashboard shell.

Working locally: browser/phone-compatible multi-select and drop uploads, progress,
cancel/retry, decoded image/dimension/size validation, metadata stripping,
original-byte duplicate reuse, perceptual similarity hints, favorites, tags,
search, categories, custom album membership, recent-use and previously-posted
filters, mixed source metadata, saved/reopenable drafts and optimistic revisions.
The recent-use/history filters reflect the latest 100 draft/history records.

Carousel editing supports force include/exclude, locked positions, cover changes,
drag order, keyboard-accessible arrow controls, maximum selection, photo
replacement via library/removal, undo/redo and restoration of AI recommendations
without losing locks. Preview supports phone/desktop widths, selected sequence,
three caption options, manual caption/hashtag/location/music/alt-text editing,
clipboard copy and ordered JPEG ZIP export. Approval saves a private approved
draft and never publishes. The publishing history stays empty until a future
verified publishing integration records an actual Instagram media ID.

Real processing infrastructure is implemented: durable owned jobs, waiting,
processing, completion, failure/cancellation, per-attempt callback signatures,
rate limits, request deadlines, retry/recovery, transaction locks, idempotent
callbacks and protection against overwriting edits made during analysis.
The transport was tested against a local HTTP n8n mock. No live model inference
was substituted with fake scores in the product: unanalysed photos say so.

Google Picker/import code is implemented behind configuration readiness. The
button is disabled without app credentials. Personal cloud is honestly disabled
because a scoped Nextcloud application integration is unavailable. Standard
authenticated mobile gallery selection is used instead of adding a QR access
path. HEIC is accepted only when the actual decoder supports it; otherwise the
user receives an explicit JPEG conversion message.

## 3. Files changed

| Group | Files |
| --- | --- |
| Shared shell | app/dashboard/[[...path]]/workspace.jsx |
| Studio UI | app/dashboard/[[...path]]/instagram-studio.jsx, instagram-studio.css, instagram-google.js |
| Owned APIs | app/api/admin/instagram/[[...path]]/route.js |
| Machine callbacks/recovery | app/api/jobs/instagram/[action]/route.js |
| Data, validation, media, jobs, editor helpers | lib/instagram-core.mjs, instagram-media.mjs, instagram-store.mjs, instagram-jobs.mjs, instagram-editor.mjs |
| Database and maintenance | scripts/005-instagram-studio.sql, migrate-instagram-studio.mjs, cleanup-instagram-studio.mjs |
| n8n source | control-room/instagram-studio/build_workflow.py, workflow.json |
| Tests | tests/instagram-studio.test.mjs, scripts/test-instagram-studio.mjs, scripts/test-instagram-browser.py |
| Configuration | .env.example, package.json, pnpm-lock.yaml, pnpm-workspace.yaml |
| Documentation | All nine Markdown files in docs/instagram-ai-studio/ |

The only direct dependency added is sharp 0.35.5, reusing the version already in
the Next.js dependency tree. No additional database/service was introduced.

## 4. Database changes

Eight additive Studio tables; see DATABASE.md. Only the isolated local database
was migrated. No production record or schema was changed. Photos belong to the
existing administrator; all retrievals/edits verify ownership.

## 5. n8n integration

See N8N_SETUP.md. The inactive importable workflow accepts separate authenticated
execution requests, uses the existing Gemini credential reference, evaluates
each normalized preview and returns photo metrics/order, three captions,
hashtags, music moods and alt text. The Next.js callback validates output and
applies weighted scores. Model output is untrusted and cannot publish posts.
The new execution key is independent of monitoring credentials.

## 6. External dependencies

- Production private Blob store/token is not configured.
- New Studio n8n webhook Header Auth credential and approved activation are needed.
- Live Gemini vision generation/quota has not been verified for this workflow.
- Google OAuth web client, restricted Picker key, project number and consent are missing.
- Personal cloud needs a scoped, approved Nextcloud integration.
- Recovery/retention scheduling and any future Meta publishing require separate setup.

None of these missing integrations was represented as operational.

## 7. Tests

See TESTING.md for commands and exact limitations. Node tests, real local HTTP
integration, mocked n8n transport/callback, desktop/390px browser checks and a
production webpack build passed. Tests used synthetic images and AI results,
not private user photos or an Instagram publishing endpoint. No lint script is
configured in this repository.

## 8. Local testing

The existing local master database and private `.env.master.local` are in use.
Run from the repository root:

```powershell
pnpm install
$env:STUDIO_ALLOW_MIGRATION='1'
node --env-file=.env.local --env-file=.env.master.local scripts/migrate-instagram-studio.mjs
pnpm dev:master
```

Open http://localhost:3001/dashboard/instagram and sign in with the existing
website account. No password was changed. Local normalized media is private
under ignored `.local/instagram-media/`.

To run local integration/browser tests from another terminal:

```powershell
$env:NODE_ENV='development'
$env:MASTER_DASHBOARD_LOCAL='1'
node --env-file=.env.local --env-file=.env.master.local scripts/test-instagram-studio.mjs --browser
```

The browser test needs the existing local Python virtual environment with
Playwright/Pillow and downloaded Chromium. It uses a temporary administrator
session only in the guarded local database and removes its own test records.
STUDIO_CALLBACK_KEY must be configured locally for both launcher and test;
the current PC has independently generated local test keys in the ignored env.

## 9. Deployment readiness

This is a local feature branch, not a deployed production feature. No production
secrets, n8n activation, merge or Instagram publishing were performed. Review
DEPLOYMENT.md before approval. The current live `/dashboard/photos` legacy tool
was preserved; the new local module is `/dashboard/instagram`.

## 10. Remaining work, in priority order

1. Approve/configure private production storage and the additive production migration.
2. Assign independent n8n execution credentials, run a synthetic live Gemini
   vision/callback test, then separately approve activation.
3. Configure Google Picker/OAuth and test real consent/import/expiration/revocation.
4. Verify real phone gallery and decoder-specific HEIC behaviour.
5. Approve production release and recovery/retention scheduling; run authenticated acceptance.
6. Add scoped Nextcloud browsing/import when authorized credentials are available.
7. Future only: verified Meta publishing/account connection and history recording.

Known limits: dHash does not reliably find every crop/pose/burst and can flag
false matches; original files are never deleted. No face recognition, inferred
precise location, engagement prediction, auto posting or automatic music
attachment is provided. Browser undo is limited to the current editor session;
saved edits/locks/order persist in the database. A changed draft retains late
AI results on its job instead of applying them silently.
