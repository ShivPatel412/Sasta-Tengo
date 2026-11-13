# MacBook development setup — Sasta Tengo

Verified 13 November 2026. Local checkout: `~/Developer/Sasta-Tengo`, branch `main`, remote https://github.com/ShivPatel412/Sasta-Tengo.

## Architecture and environment separation

This checkout is named `shivpatel-portfolio` in package.json. It contains Next.js 16.4.3, React 19.3.1, JavaScript/JSX and ES modules, custom CSS, App Router pages and server-side route handlers. There is no TypeScript configuration, Tailwind dependency, or native iOS project in this checkout. Do not install those tools merely because the original setup brief listed them.

- `app/`: public website, dashboard, API routes, jobs, and authenticated assets.
- `components/`: public interface and same-origin API client.
- `lib/`: MySQL access, authentication, validation, read-only guards, media, notifications, project automation, and Instagram Studio.
- `scripts/`: audits, database setup/migrations, and optional local master tooling. These are not all safe setup commands; some provision databases or connect external services.
- `tests/`: Node test-runner tests. `docs/`: existing deployment, database, acceptance, automation, and Studio guides.
- `control-room/`: existing Windows/WSL automation, Python collector/workers, Docker configuration and web assets. Keep these on the existing server; do not run its deployment/install scripts on the Mac.

The Mac runs the editor, Git, Node/pnpm, and local Next.js preview. Windows remains the Docker/WSL2/n8n/Cloudflare Tunnel server. Hostinger remains the production hosting/database specified by the owner.

**Repository discrepancy:** README and deployment documentation describe a Next.js migration and Vercel integrations, and AGENTS.md says a push to main triggers a live Vercel deployment. That does not establish where the current production website or database is hosted. This setup does not perform a hosting cutover or change either provider. Older branch names and validation counts in other documents are historical; inspect current main before following them. Next.js requires a Node server for its APIs; static-file hosting alone cannot run this application.

## MacBook requirements and observed software

| Requirement | Observed |
| --- | --- |
| macOS | 26.6.2, build 25G83 |
| CPU | arm64 / Apple Silicon |
| RAM | 16 GiB reported by macOS (brief stated 18 GB) |
| Disk | Approximately 313 GiB available at inspection |
| Git | 2.54.0 (Apple Git-157) |
| Node | v24.11.0, satisfies project >=22 |
| pnpm | 11.13.1 via Corepack, `/opt/homebrew/bin/pnpm` |
| Homebrew | Present at `/opt/homebrew/bin/brew` |
| Xcode | 27.2, build 27B52, developer tools selected |
| VS Code | 1.133.0, installed with Homebrew; CLI at `/opt/homebrew/bin/code` |

Existing Node and Xcode were retained. No nvm, Docker, MySQL server, WSL, n8n, or Cloudflare Tunnel installation is required for this preview.

For a future machine, install missing Git/developer tools and Node >=22 only after inspecting existing installations. With the current Corepack installation, the exact pnpm setup used was:

```sh
corepack prepare pnpm@11.13.1 --activate
corepack enable pnpm --install-directory /opt/homebrew/bin
/opt/homebrew/bin/pnpm --version
```

Homebrew installs VS Code with `brew install --cask visual-studio-code`. Open a new terminal and check `node --version`, `pnpm --version`, `git --version`, and `code --version`. If an agent/runtime injects another pnpm earlier in PATH, use `/opt/homebrew/bin/pnpm` explicitly; do not update the project lockfile to match the injected version.

## Checkout and dependency installation

Reuse the existing checkout and preserve local edits. On a genuinely new machine only:

```sh
mkdir -p ~/Developer
git clone https://github.com/ShivPatel412/Sasta-Tengo.git ~/Developer/Sasta-Tengo
```

Then:

```sh
cd ~/Developer/Sasta-Tengo
git status
pnpm install --frozen-lockfile
code .
```

The frozen installation passed with pnpm 11.13.1. package.json, pnpm-lock.yaml and pnpm-workspace.yaml were not changed. The local `.pnpm-store/` cache is now ignored alongside node_modules, .next, .local and private environment files.

## Local environment

An existing ignored, mode-600 `.env.local` was retained. No existing values were overwritten. The preview uses:

```dotenv
LOCAL_PREVIEW=1
MIGRATION_READ_ONLY=1
APP_ORIGIN=http://localhost:3000
```

For a new preview environment, put those three lines in a new `.env.local` only if the file does not already exist. Leave DB_HOST, DB_NAME, DB_USER and other database/automation/mail/storage credentials unset or empty. Do not copy the example's nonempty database placeholders into a frontend-only preview. Any nonempty DB_HOST, DB_NAME or DB_USER disables the preview bypass. Inherited shell variables can override `.env.local`; check their presence privately before starting.

Local preview works only under `pnpm dev`; production mode deliberately disables the bypass. Public collection APIs return empty lists and the interface may show built-in fallback cards. Login, saved dashboard data, submissions, uploads and database-backed jobs are unavailable. Fallback content is not evidence of restored records.

A separate development/staging database is required for backend integration. Configure privately:

- Database: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL and optionally DB_SSL_CA. Use verified TLS for network databases; never use production credentials.
- Authentication: ADMIN_EMAIL matching an existing staging administrator, a separate random RATE_LIMIT_SECRET of at least 32 characters, and exact APP_ORIGIN. Login/rate limiting can write session/rate rows even when MIGRATION_READ_ONLY=1, so that switch does not make production credentials safe locally.
- Optional email: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, LEAD_RECIPIENT. Use sandbox delivery credentials locally.
- Optional media: MEDIA_BASE_URL and a separate development BLOB_READ_WRITE_TOKEN; Studio requires its own private storage credentials.
- Optional jobs: independent CRON_SECRET, PROJECT_AUTOMATION_KEY, and Studio keys below. Leave automatic publishing disabled.

Keep secrets server-side and never prefix them with NEXT_PUBLIC_. Use `.env.example` and the relevant feature docs for optional settings. Do not paste secrets into tickets, logs, chat, or Git.

## Development and checks

```sh
cd ~/Developer/Sasta-Tengo
pnpm dev --hostname 127.0.0.1 --port 3000
```

Open http://localhost:3000. Binding to loopback keeps the preview on this Mac. Stop with Ctrl+C. Default `pnpm dev` also works, but may expose a LAN listener. Do not start a second instance on the same port. No background service or auto-start was installed.

Run tests independently. Stop dev before building because both commands write `.next`:

```sh
pnpm test
STUDIO_ALLOW_MIGRATION=0 PROJECT_ALLOW_MIGRATION=0 pnpm build
```

The build script contains opt-in migration hooks. Keep both guards unset or zero in the shell AND environment files. Do not set either to 1 during ordinary builds. Do not run db:init, db:admin, migration SQL/scripts, local-master setup/provisioning or connect-local-services automatically.

`pnpm audit:data` requires staging database credentials in `.env.local` and the expected schema. It reads a consistent read-only snapshot and reports counts/hashes. It was skipped because this preview intentionally has no database. Only run it after verifying a separate staging target; do not create tables just to make the audit pass.

Verification on this Mac:

- Frozen dependency installation: passed with pnpm 11.13.1.
- `pnpm test`: 79 passed, zero failed/skipped.
- Guarded `pnpm build`: passed compilation, page generation and route collection without a database.
- HTTP checks: homepage, booking and dashboard login returned 200; homepage contains the preview notice.
- Services/projects/experience/education APIs returned empty preview lists. Contact, appointment and project-request POSTs returned 503 with the preview-disabled message before DB access.
- `pnpm audit:data`: not run; no staging credentials.
- No real database, SMTP, uploads, authenticated login, AI processing, or physical iOS device was tested.

## GitHub synchronization and switching computers

GitHub CLI authenticated to ShivPatel412 through the macOS keychain. Remote main matched local main at inspection; a dry-run push succeeded without uploading changes. Keep the existing HTTPS remote. If authentication later expires, use `gh auth login --hostname github.com` privately and, if required, `gh auth setup-git`; never embed a token in the remote URL.

Before switching away from either computer, save files and inspect changes:

```sh
git status
git diff
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "Describe changes"
git push origin main
```

Review every staged path before committing. Never commit .env.local, other private env files, tokens, data backups, node_modules, .pnpm-store or build output. Main pushes may trigger the existing Vercel deployment; use a feature branch for work that should not deploy.

On the other computer:

```sh
git status
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

Pull only from a clean working tree. If edits exist, finish and commit/push them, or deliberately stash them locally before pulling. A stash exists only on that computer and does not synchronize through GitHub. If histories diverge, inspect and resolve the commits; never force-push, reset away edits or use `git clean` as a shortcut. Each computer keeps its own private `.env.local`; Git sync does not copy credentials or databases. Stop the local server before switching if it is no longer needed. Windows automation services can remain running.

## Existing n8n integration

https://n8n.shivpatel.in returned HTTPS 200 without invoking a workflow. This verifies homepage reachability only, not authentication or webhook execution.

The repository already has read-only monitoring/status ingestion, project automation, and optional Instagram Studio dispatch. The frontend preview needs none of them enabled. Do not install n8n on the Mac or change Windows workflows, credentials, Docker, WSL or Tunnel configuration.

For the existing Studio feature, `lib/instagram-jobs.mjs` accepts approved HTTPS webhook paths on n8n.shivpatel.in and sends a server-side Authorization Bearer header. Required server configuration is STUDIO_N8N_WEBHOOK_URL, independent STUDIO_N8N_WEBHOOK_KEY and STUDIO_CALLBACK_KEY (each key >=32 characters); optional recovery uses a separate STUDIO_DISPATCH_KEY. Documentation identifies `/webhook/shiv-instagram-studio` as the prepared workflow path, but its actual activation and credentials were not verified. Do not invoke or install it automatically.

Callbacks use `/api/jobs/instagram/callback`, per-job/per-attempt signatures, validated payloads and transaction checks. The current callback-origin allowlist accepts canonical website origins and, in development, localhost/127.0.0.1 port 3001. It does not accept this preview's port 3000. The prepared n8n workflow also validates canonical callback targets. Windows cannot call back to the Mac through its own localhost. Full local execution therefore requires a separately reviewed staging callback/network design; do not silently change APP_ORIGIN, reuse production callback credentials, or relocate the existing Tunnel. See docs/instagram-ai-studio/N8N_SETUP.md and ENVIRONMENT.md.

## iOS readiness

No Swift, Xcode project/workspace, React Native, Expo or Capacitor application was found in this repository. Xcode 27.2 and its developer tools are selected, but a separate iOS repository and its build instructions are needed to determine mobile framework, signing, simulator runtime, deployment target and API configuration. No mobile app was created.

The website API client currently uses relative same-origin `/api` URLs. There is no existing mobile API-base setting to configure here. For a future simulator integration, verify host access to the Mac's preview first. A physical iPhone cannot use localhost to reach the Mac: use an explicitly approved LAN listener and the Mac's LAN address or a reviewed staging HTTPS endpoint, with matching auth/origin requirements. Do not replace production endpoints or weaken App Transport Security globally. Backend mobile testing still needs a separate staging database and an approved authentication flow.

## Troubleshooting and production safety

- Wrong pnpm: use `/opt/homebrew/bin/pnpm --version` (11.13.1), then check PATH/Corepack. Do not run dependency upgrades as a fix.
- Port 3000 busy: inspect `lsof -nP -iTCP:3000 -sTCP:LISTEN`; stop only the server you recognize, not an arbitrary process.
- Preview banner missing or public API 503: check NODE_ENV=development, LOCAL_PREVIEW=1 and empty DB_HOST/DB_NAME/DB_USER, including inherited shell variables. Restart dev after changes.
- Login/submission unavailable: expected without staging DB. Do not solve it by adding production credentials or disabling write guards.
- Build/dev artifact errors: stop dev, build, then restart dev; do not run both against `.next` concurrently.
- n8n reachability failure: inspect existing PC/Tunnel connectivity without reinstalling services; HTTP 200 alone does not prove workflows work.
- VS Code command missing: open a fresh terminal or the app from Applications; confirm Homebrew's bin directory is on PATH.

Production databases, DNS, Hostinger services, Windows automation and existing credentials must stay untouched. No database initialization, migration, cutover, workflow activation or infrastructure relocation is part of workstation setup. Database schema changes and any new exposure of the Mac require explicit approval. Do not delete existing files, caches or private configuration just to clean Git status.
