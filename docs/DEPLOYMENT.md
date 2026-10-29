# GitHub and Vercel preparation

This app runs from the repository root. Preview deployment is separate from the existing production site. No live DNS change is included. Do not upload the local inspection tree, original ZIP, secrets or backups.

## GitHub

This migration is prepared for the existing repository https://github.com/ShivPatel412/Sasta-Tengo on branch `codex/nextjs-only`. This branch contains only the Next.js application; legacy implementations remain recoverable in Git history.

To work from a fresh checkout:

```powershell
git clone --branch codex/nextjs-portfolio-migration https://github.com/ShivPatel412/Sasta-Tengo.git
cd Sasta-Tengo
pnpm install --frozen-lockfile
```

For updates, commit the reviewed files on this branch and push normally. Never force-push or commit `.env.local`, database backups, private uploads, `node_modules` or `.next`. The repository-root GitHub Action builds/tests the root application using `pnpm-lock.yaml`. It does not validate real database records or network integrations.

## Vercel preview

Import that GitHub repository in Vercel. Select the Next.js preset, Root Directory left empty (repository root), a supported Node.js 22+ runtime, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, and default output settings. There is server code: **do not use static export** or point the output to a hand-built `dist` directory. Keep the initial deployment off your live custom domain.

Vercel uses the configured production branch for production and other branches for previews. Configure Preview variables with staging database/storage/SMTP credentials only. Use a stable branch preview URL for `APP_ORIGIN`, or test on a dedicated staging project/origin. Exact-origin protection intentionally rejects dashboard mutations from other commit URLs. Public APIs remain same-origin relative `/api` calls; no CORS wildcard or public backend URL is needed.

Create the environment variables from `.env.example` privately in Vercel settings. Keep database passwords, SMTP credentials, Blob token and secrets server-only. Never use `NEXT_PUBLIC_` for them. `ADMIN_EMAIL` must match an existing single-owner user, not a new default account. Generate independent 32+ character random `RATE_LIMIT_SECRET` and `CRON_SECRET` in a password manager. Keep `MIGRATION_READ_ONLY=1` until staging is ready. Environment variable changes require a new deployment.

## Database and storage

Use a persistent MySQL-compatible database that the selected Vercel function region can reach over verified TLS. Pick a region close to it. Hostinger shared MySQL is not assumed externally reachable: confirm remote connectivity, firewall rules, CA requirements and connection limits with the provider. If it is not reachable safely, restore to an appropriate managed MySQL service and validate before cutover. Do not expose MySQL to every Internet address or disable TLS verification to bypass connectivity problems.

The code uses a small reusable pool of three connections per function instance; the total can grow across instances. Confirm provider capacity and use a compatible managed connection proxy if necessary. Runtime access needs SELECT on relevant legacy tables, INSERT on contacts/appointments/projects/experience/project_types, UPDATE on the editable tables, DELETE only where dashboard deletion is intended, and appropriate CRUD on the new support tables. Schema installation uses a separate account. A read-only audit account needs SELECT/metadata access only.

Vercel's function filesystem is ephemeral. Never save customer records, SQLite files or new uploads inside the deployed project. Restore old public media at `MEDIA_BASE_URL`, ending in `/`, using stable object keys. For new uploads, attach a public Vercel Blob store to the correct environment and set its server token. Only intended public portfolio images go there. Browser uploads are capped at 4 MB each; SVGs and arbitrary document uploads are rejected. Originals are retained when editing/deleting projects; cleanup requires separate backup review.

## Notifications

Contacts and project-request inserts queue an outbox record in the same DB transaction. Normal bookings retain the old behavior without emails. Configure SMTP and verified `SMTP_FROM`/`LEAD_RECIPIENT`. Use an external scheduler or a plan-appropriate Vercel Cron to GET `/api/jobs/notifications` with `Authorization: Bearer <CRON_SECRET>`; don't put the secret in a URL. Vercel sends this header automatically for its configured Cron jobs. No scheduler is enabled in this package.

After notification tests and recipient approval, a plan allowing five-minute schedules can add the following `crons` property to the existing root `vercel.json`:

```json
{ "crons": [{ "path": "/api/jobs/notifications", "schedule": "*/5 * * * *" }] }
```

Hobby plans are limited to daily Cron scheduling according to current docs; use a permitted external scheduler or a suitable plan for prompt mail. Each call handles at most 10 jobs. Monitor unsent jobs/attempts privately, especially `attempts >= 10`. A plain acknowledgement goes to the submitter, and an alert without customer details goes to the configured owner. SMTP is at-least-once delivery; failures after successful SMTP acceptance can produce a duplicate. Rate/session expiration cleanup also runs in this worker; if mail is intentionally disabled, arrange separate maintenance for expired session/rate rows.

## Production

Initially deploy this migration branch to a separate Vercel project or Preview environment. Do not connect the live domain or replace the existing production branch until staging acceptance and explicit cutover approval.

Complete `ACCEPTANCE.md`, backup/restore rehearsal and the write-freeze procedure in `MIGRATION.md`. Then set Production variables to the new production resources, deploy the accepted commit and follow `DOMAINS.md`. Keep secrets out of build/runtime diagnostic output and turn on appropriate Vercel access/log retention controls. Review notification failures without copying customer data into public issues.

## Official references

- [GitHub: adding locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [Vercel Git deployment](https://vercel.com/docs/git) and [environment separation](https://vercel.com/docs/deployments/environments)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel storage](https://vercel.com/docs/storage) and [ephemeral filesystem guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)
- [Vercel Cron security and plan limits](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js October 2026 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026): this candidate pins 16.4.3, above the 16.4.1 fixes described there. Recheck advisories before launch.
