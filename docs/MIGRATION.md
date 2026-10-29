# Safe migration and data preservation

## Inspection record — 29 October 2026

Input: `shivpatel-security-update-2026-10-29(1).zip`.

SHA-256: `E2DCC7481B1C3CD62CF418DDBC82337C265385C001DDA368BE6A0A920A31DC40`.

The archive contains Laravel routes/controllers/models/migrations, Blade dashboard views, static public assets, and the Vite-style compiled React JS/CSS. Its vendor tree was excluded from the working inspection copy. There is no frontend package/source tree, JS source map, `.env`, SQL dump or SQLite file. `storage/app/public` is empty. No customer/project records can be recovered from migrations or seeders; seeders are examples/default content, not a backup.

The editable public frontend was subsequently recovered from the GitHub repository and ported to Next.js components. The current branch is a single root Next.js app; original PHP and frontend implementations remain in Git history. Only reviewed public assets are included in this Next.js project. PHP configuration, seeders, logs, sessions and the original archive are not copied into the GitHub-ready folder. A limited credential-pattern check of the compiled bundle found no AWS access-key, GitHub-token, Stripe-live-secret or PEM-private-key matches; this does not prove the whole original archive is secret-free. Keep the original ZIP private.

## Data contract

| Existing table | Preservation requirement | New use |
|---|---|---|
| users | Keep IDs, email and password hashes; admin authorization remains single owner via ADMIN_EMAIL | Login; Laravel bcrypt `$2y$` is checked as compatible `$2b$`; old sessions/tokens are not reused |
| services | Keep IDs, content, price/duration, active flags | Public listing and service lookup |
| contacts | Keep all fields including read flag, lead_status, admin_notes and timestamps | Public create; protected list, notes, status and deletion |
| appointments | Keep service association, client fields, dates, status, lead_status, notes and full request_data JSON | Bookings and multi-step project requests; protected review/update |
| projects | Keep IDs, category, image, poster/gallery paths, JSON technologies, links, featured flag and order | Public portfolio; protected CRUD |
| project_types | Keep ID, name and stable category key | Rename only the display name; in-use types cannot be deleted |
| experience | Keep singular table name, dates, flags, summary, JSON highlights/technologies, media and order | Public listing; protected CRUD |
| education | Keep existing records and order | Public read; no dashboard editor existed in the supplied web routes |

Laravel-only cache, jobs, sessions, password reset tokens and personal access tokens remain untouched in the backup. They are not imported into Next.js authentication. The supplied Laravel migration history removed payments; do not rerun that history against a live/older database. If an actual database has extra tables/columns, retain them and investigate discrepancies rather than dropping them.

## 1. Inventory and backups

Export the current authoritative DNS zone, nameservers and TTLs, including all mail records. Record the current PHP deployment version and retain the full working Hostinger site. In a private location export the actual database using Hostinger's database backup/phpMyAdmin or `mysqldump` with a credential prompt/config file (never a password embedded in a command). Use a consistent snapshot for InnoDB, and account for nontransactional tables if present. Copy all `storage/app/public`, public uploads, CV and any externally hosted media. Record file paths, sizes and hashes in a private manifest.

Restore the database and media into isolated staging resources. A backup is usable only after a successful restore rehearsal. Keep timestamps, UTF-8/utf8mb4, auto-increment values, foreign keys and JSON intact. Use a compatible MySQL/MariaDB version first; changing database engines is a separate migration. Check the old app's timezone configuration and actual saved appointment values before interpreting them as UTC. This candidate writes new appointment instants in UTC.

## 2. Verify schema and records before enabling writes

Use a read-only DB account to run `pnpm audit:data` against source and restored staging, with credentials supplied privately in `.env.local`. Save stdout privately if needed. It reports required-column checks, counts, maximum IDs, column lists and SHA-256 digests of all rows ordered by ID, without printing names/emails/messages/passwords. It holds a repeatable-read consistent snapshot and reads in batches. Compare per-table counts, last IDs and digests (generatedAt may differ). It does not verify copied media bytes or all column types/indexes; compare those separately. Large tables require planning for snapshot duration.

Apply only `scripts/001-next-support.sql` using a separate administrator account, first to staging. It adds session/rate/outbox/mutex tables; it has no statements that alter/drop legacy tables. Check them after application. The application never creates tables automatically.

Copy public media to durable storage at a stable HTTPS origin. Set `MEDIA_BASE_URL` to the exact root corresponding to Laravel's `storage/`, ending in `/`; preserve nested object keys. A relative `projects/posters/a.jpg` is resolved from that root. New Blob URLs can coexist with old relative keys. Do not make the private Laravel storage tree public. Verify every referenced poster/gallery object against the private media manifest. The archive alone cannot satisfy this step.

## 3. Staging acceptance

Use staging credentials, staging public media and an SMTP test inbox. Set `APP_ORIGIN` to the exact stable preview origin, including protocol; it must match the browser Origin header. Begin read-only, then enable writes on staging for the acceptance tests. Keep production completely separate. Run the acceptance checklist and record results. Restore original production snapshots into staging again if test records are no longer needed.

## 4. Approved production cutover

Do not change live DNS until the owner approves a concrete before/after record list and the acceptance evidence.

For the lowest-risk data move, arrange a brief write freeze on the old public forms/dashboard (a clear maintenance response, not a false success). Take the final consistent DB export and media copy after the freeze. Restore to the new production database. Compare source/destination counts/digests and file hashes. Apply the additive support tables and verify privileges. Avoid deleting/reseeding/reassigning IDs. Do not run the new app against the old database while both systems can accept writes.

Deploy the verified commit to Vercel with production-specific credentials and `MIGRATION_READ_ONLY=1`. Review media and dashboard access. When explicitly approved, apply the documented web DNS records, verify HTTPS and redirects, and enable writes (`MIGRATION_READ_ONLY=0`, redeploy). During DNS propagation keep the old site in maintenance mode so it cannot collect a second stream of submissions. Check a real controlled submission and its persisted dashboard record, then monitor errors, notifications and upload behavior. Schedule any tests that send emails only with the owner's explicit recipient authorization.

## 5. Rollback without losing new submissions

Before new writes, rollback can restore the old DNS values and old application. After the new system accepts writes, freeze writes on both systems first and back up the new production database/media. Reconcile all post-cutover contacts, appointments, request JSON and edited projects/experiences/types back into the old system before reopening it. Use a reviewed transactional reconciliation by ID/timestamp with conflict review; do not blindly import a stale dump or overwrite newer rows. A DNS rollback or Vercel application rollback does not roll back database records or Blob objects.

Keep support tables harmlessly in place during rollback; do not drop data to revert code. Rotate session/rate/cron secrets when appropriate and invalidate Next sessions if reverting authentication. Disable the notification scheduler separately. Keep the old deployment and verified backups until the owner accepts the retention period; don't cancel Hostinger while mail/media/DNS or rollback depends on it.
