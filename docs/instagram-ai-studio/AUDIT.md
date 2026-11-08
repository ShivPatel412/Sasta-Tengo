# Instagram AI Studio: audit before implementation

Audited 8 November 2026. No application changes preceded this audit.

## Existing architecture

- Next.js 16.4.3 App Router, React 19.3.1; Node >=22, pnpm 11.13.1.
- `/dashboard/[[...path]]/workspace.jsx` provides the shared authenticated shell,
  editors, responsive navigation and appearance controls. Manrope, Phosphor icons,
  named CSS typography/spacing tokens and native form controls are already used.
- `lib/auth.mjs` authenticates the existing administrator with hashed, expiring
  MySQL sessions. Mutations use exact-origin checks and rate limits.
- `lib/db.mjs` supplies mysql2 prepared statements, transactions, bounded JSON
  reads, write guards and sanitized errors. SQL migrations live in `scripts/`.
- The public project uploader uses public Vercel Blob objects and is unsuitable
  for private user photos. Its local token is unconfigured. Local project media
  already demonstrates authenticated, content-addressed filesystem storage.
- Production is on Vercel from GitHub main. The local editable master uses an
  isolated MySQL copy on 127.0.0.1:3307. Existing production records must not change.

## n8n and photo integrations

- The WSL collector reads n8n metadata and uploads sanitized snapshots to
  `/api/control-room/snapshot`; the website stores them in `next_control_snapshot`.
  Its independent status key grants no workflow execution or browser session.
  This monitoring path is working and must remain unchanged.
- Existing authenticated project-generation and photo webhooks are separate
  execution integrations. Gemini credentials remain inside n8n.
- `/dashboard/photos` is a legacy HTML photo tool. Its Next.js API is explicitly
  local-only. Vercel cannot call the PC's loopback port 8792.
- The pre-existing, untracked `control-room/photo-automation/` directory belongs
  to earlier work and will not be overwritten or included in this feature.
  It contains useful reference logic for EXIF stripping, dHash, safe image
  decoding, duplicate hints, captions and approval-gated posting.
- No website Google OAuth/Picker token lifecycle was found. The Google Drive
  connector available to this coding session does not authorize this web app.
- Nextcloud exists at cloud.shivpatel.in; the website has no configured scoped
  WebDAV credential. Do not reuse an account password or assume API access.

## Gaps and risks

Missing: browser uploads, private production storage, persistent multi-source
library, albums, editable saved carousels, asynchronous owned jobs/callbacks,
OAuth setup, configurable scoring and a native Studio page.

Risks: Vercel request size/time limits; malicious/oversized image decoding;
private URLs and EXIF/GPS leakage; PC offline; model hallucination; stale results
overwriting manual choices; retries duplicating jobs; approving mistaken content.
No face identification, engagement guarantees or automatic posting will be added.
HEIC requires a decoder supporting it and must fail explicitly otherwise.

## Proposed additive design and sequence

1. Feature branch, preserve unrelated work. No production secret changes,
   migrations, workflow activation, merge or deployment without approval.
2. Add Studio-owned MySQL tables for photos, albums, drafts, jobs/events and
   settings. Apply migration only to the isolated local copy for verification.
3. Normalize uploads to metadata-free JPEGs, compute original SHA-256 and dHash,
   store private bytes locally or in a configured private Blob store. Serve
   only to the owner or short-lived job-scoped signed media requests.
4. Add owner-scoped library/albums/drafts APIs, optimistic draft revisions and
   explicit approval that never calls Instagram. Retain publishing history
   schema for future verified publishing.
5. Add durable jobs, independent webhook/callback secrets, per-attempt identity,
   bounded dispatch, cancel/retry/timeouts and idempotent callback handling.
   Provide inactive importable n8n workflow using existing Gemini credentials.
6. Build `/dashboard/instagram` inside the shell: eight Studio sections, dark
   surfaces/lime accent, mobile file picker, upload progress/cancel/retry,
   selection overrides, keyboard and drag ordering, previews and exports.
7. Provide honest provider readiness/configuration interfaces. Use least-
   privilege Google Picker setup rather than inventing connected OAuth.
8. Test ownership, media bounds, duplicate similarity, locked selections,
   callback races, offline recovery, draft persistence and responsive UI;
   document actual results and external dependencies.

The smallest new dependency justified here is an image decoder/normalizer for
server-side validation, dimensions, thumbnail/hash generation and metadata removal.
Reuse all other platform APIs and existing components where practical.
