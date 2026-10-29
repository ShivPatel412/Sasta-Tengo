# Shiv Patel — Next.js migration candidate

This repository is a single full-stack Next.js 16.4.3 application at the repository root. Public pages are editable components using Next.js App Router and Link; the dashboard and backend use Next.js route handlers. The separate Laravel backend, React/Vite application, compiled JavaScript loader, Apache deployment files and old archive have been removed from this branch. Earlier versions remain in Git history. React remains a required Next.js dependency. Production cutover is on hold until database and media restoration is verified.

## Start here

For a frontend-only local preview without restored data, create an ignored `.env.local` containing `LOCAL_PREVIEW=1`, `MIGRATION_READ_ONLY=1` and `APP_ORIGIN=http://localhost:3000`, with no DB settings, then run `pnpm dev`. The page shows a preview notice and public collection APIs return empty lists so the existing interface can use its built-in defaults. No records are fabricated or saved. Login and submissions still require the database. This mode is limited to development and switches off when any DB connection setting is present; it never conceals a production/database outage.

1. Read [the migration plan](docs/MIGRATION.md) and restore a private staging copy of your existing MySQL database and media.
2. Use Node.js 22 or newer and pnpm 11.13.1. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local`. Fill values privately. Start with `MIGRATION_READ_ONLY=1`; use `DB_SSL=false` only for a local non-networked development database. The live database credentials must never be used for a preview.
4. Review and apply `scripts/001-next-support.sql` to staging using a database administrator account. Grant the app only the runtime privileges it needs; it does not need CREATE/DROP privileges.
5. Run `pnpm audit:data` and compare its counts/hashes with the source snapshot. This script reads data; it does not import or modify legacy tables.
6. Run `pnpm test`, `pnpm build`, then `pnpm dev`. Open `http://localhost:3000` or `/dashboard/login`.
7. On staging only, set `MIGRATION_READ_ONLY=0` after reconciliation, then complete [acceptance testing](docs/ACCEPTANCE.md). The existing administrator must have a bcrypt password and an email matching `ADMIN_EMAIL`. No default admin password is created.

## Included

- Public `/api/v1` read APIs and contact, booking and project-request submissions, with compatible response shapes.
- Protected dashboard: summary/pipeline, paginated contacts and requests, notes/status, project and experience management, project type management, and optional durable image uploads.
- Existing MySQL names, primary keys, JSON fields, media paths and bcrypt credentials retained. No ORM reset, seed or destructive schema migration runs at build/start.
- Server-side sessions, exact-origin checks for dashboard writes, validated input, parameterized SQL, persisted submission/login limits, a read-only switch and a notification outbox.
- Optional SMTP delivery and Vercel Blob uploads. Existing uploads are served from `MEDIA_BASE_URL` after copying to durable public media storage.
- Repository-root GitHub Actions build/test workflow and a reproducible dependency lockfile at the repository root.

## Limits to resolve before launch

The public pages use client components for interactive effects and forms. Services retain their original built-in fallback cards; a screen that looks populated is not evidence your database was migrated. The dashboard is a new functional implementation, not a pixel-identical Blade conversion. It adds lead-stage editing and keeps existing read state unless you explicitly save a change. Media uploads are limited to 4 MB each for serverless requests, versus 5 MB in Laravel. No original media is deleted when editing/deleting a project.

Real database connectivity, SQL behavior, old-password login, uploads, emails, restored records and end-to-end form submissions require staging validation. Existing Argon2 passwords need a separate password reset/migration. Public CV download is unresolved because `/cv.pdf` is absent. Notification styling is simplified to a plain-text acknowledgement; delivery is at least once, so a worker crash after SMTP accepts a message can cause a duplicate. The worker retains failed jobs for retry and requires monitoring after ten failures.

Use [GitHub/Vercel deployment](docs/DEPLOYMENT.md), [domain setup](docs/DOMAINS.md) and [migration/rollback](docs/MIGRATION.md). Recheck upstream dependency advisories before production.
