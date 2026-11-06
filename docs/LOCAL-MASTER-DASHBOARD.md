# Local master dashboard

Run `pnpm dev:master` from this repository, then open **http://localhost:3001**.
Sign in again with the existing website administrator account and password.
Sessions from the public website are intentionally not copied. No password was
changed. Both dashboard toolsets use this one local entry point.

## Current architecture

The existing Next.js website dashboard supplies authentication, navigation,
project editors, forms, preferences and portfolio APIs. Its sidebar includes
the existing control-room information and tools:

| Module | Local address | Implementation reused |
| --- | --- | --- |
| Overview | `/dashboard` | Website statistics and collector summary |
| Projects | `/dashboard/projects` | Website project editor and gallery |
| Project approvals | `/dashboard/approvals` | GitHub/Gemini draft review using the existing project API/data model |
| Contacts and inquiries | `/dashboard/contacts`, `/dashboard/appointments` | Existing website records and editors |
| Experience, types, settings | Existing `/dashboard/…` paths | Existing editors and appearance preferences |
| Workflows and agents | `/dashboard/workflows`, `/dashboard/agents` | Existing collector metadata |
| Cloud and services | `/dashboard/cloud`, `/dashboard/services` | Existing Nextcloud/Docker metadata |
| 3D café | `/dashboard/3d` | Existing compiled 3D experience, protected by master authentication |
| Instagram photos | `/dashboard/photos` | Existing photo review tool; generation/publishing remain disabled locally |

The interface retains the requested flat ivory surfaces, charcoal navigation,
lime selection, local Manrope font and responsive phone navigation. n8n and
Nextcloud retain their own accounts when opening their full applications.

## Local data and existing services

Editable local mode uses the isolated Docker container `shiv-master-mysql`,
bound to `127.0.0.1:3307`, database `shiv_master_local`, persistent volume
`shiv-master-mysql-data`. The initial copy contains the existing administrator,
projects, experience, project types and preferences. Active sessions, rate
limits and outgoing mail were not copied. Local approval changes this local
portfolio copy, not the public database.

The ignored `.env.master.local` configures this database and machine tokens.
The launcher refuses editable mode if its database target differs from the
expected local target. Without this file, master mode uses the original
read-only fallback. Do not remove the file to troubleshoot editable mode.

The existing WSL collector snapshot is connected directly through
`CONTROL_ROOM_SNAPSHOT_PATH`; its existing timer continues to refresh it.
The existing photo inventory is connected through its private worker token.
Neither cloud files nor existing service volumes/accounts were moved.

One-time setup scripts, already run on this PC:

- `scripts/connect-local-services.mjs`: connect existing sanitized collector and photo inventory.
- `scripts/provision-local-mysql.py`: provision only the isolated local database.
- `scripts/setup-local-master.mjs`: copy source records read-only and initialize local automation storage. It refuses a nonempty target.

Normal startup needs only `pnpm dev:master`. Keep WSL/Docker running for the
database, n8n bridge and existing services. The local project worker and its
hourly schedule run while this launcher is running; they are not an installed
Windows background service.

## GitHub to approval queue

The native Python worker listens only on `127.0.0.1:8793`. It checks the owner's
public repositories hourly, processing one repository per scan. Private,
forked, disabled and archived repositories are skipped. A revision fingerprint
and one draft per repository prevent duplicates. Rejected unchanged revisions
remain rejected. Changed live records cause a review conflict instead of
silently overwriting manual changes.

Gemini requests go through the new **Shiv Portfolio | Gemini generation bridge**
workflow in the existing n8n installation. It reuses the existing Gemini
credential without extracting its API key. Existing workflows were retained.
Text currently uses `gemini-3.1-flash-lite`; covers request
`gemini-3.1-flash-image`. Credentials and worker configuration stay under ignored
`.local/` files and private environment settings.

Screenshots come from a real Chromium browser. Captures wait for the website's
loading screen to disappear and reject blank/error pages. Approved public
hosts are checked before navigation. Local media is content-addressed, private
and served only to authenticated administrators. Conceptual AI covers and real
website screenshots are identified separately.

Open **Project approvals** to check GitHub, inspect/edit a draft, reject it, or
approve it into the local portfolio. Automatic publishing is disabled in this
local setup. The first real Sasta-Tengo draft has Gemini-written details and a
verified capture of the actual portfolio website.

### Remaining provider blocker

The existing Gemini account returns image-generation quota **0** (HTTP 429).
Until its image quota/billing is enabled, drafts use an explicitly labelled
GitHub repository preview. They are marked **AI cover pending**, and approval
is blocked. Provider retry instructions are persisted to avoid repeated calls.
After enabling quota for the existing Gemini credential, use **Retry AI covers**
in the approval queue. This clears the local backoff and retries generation.
No API key should be pasted into chat or committed.

## Verification

The local HTTP integration check creates a temporary session and test project,
then removes only its own records:

```powershell
node --env-file=.env.local --env-file=.env.master.local scripts/test-local-master.mjs
```

It checks authenticated collector/photo access, private image access, machine
ingestion, duplicate prevention, cross-origin rejection, local publish,
repeated approval, manual-edit conflicts and rejection. Node and Python tests
cover validation, missing-cover approval blocking, screenshot handling and
provider errors. Use `pnpm test` and `pnpm exec next build --webpack` for the
Next.js checks. Verification passed: 65 Node tests, 9 worker tests, the local
HTTP integration check and an authenticated browser check of the approvals
queue at desktop and 390px phone sizes without horizontal overflow. Webpack is
used because Turbopack encountered an internal
compiler error in this Windows workspace.

No domain/DNS change, public website migration, Git push or dashboard deployment
was made. A later move to `dashboard.shivpatel.in` still needs an explicit
production configuration and deployment after local acceptance.
