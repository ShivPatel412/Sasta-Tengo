# Start with a new portfolio database

The owner chose a fresh database on 29 October 2026. The uploaded event/invitation database is unrelated to the portfolio schema and must stay untouched. No old projects or submissions are imported in this workflow.

## 1. Create a separate database

In Hostinger, open Websites → Manage site → Databases → Management. Create a new database and database user, using a distinct suffix such as `portfolio_next`. Hostinger adds the account prefix: copy the full resulting names exactly. Enter a new strong database password privately in hPanel. Keep the old databases.

Hostinger references: [create a database](https://support.hostinger.com/en/articles/1583542-how-to-create-a-new-mysql-database), [import SQL](https://www.hostinger.com/support/1864324-how-to-upload-and-set-up-your-database-at-hostinger/), [remote MySQL access](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/).

## 2. Create the tables

Choose one method:

- **phpMyAdmin:** select the new, empty database and import `scripts/000-fresh-portfolio.sql`, followed by `scripts/001-next-support.sql`. The supplied combined `new-portfolio-database.sql` contains both in that order. It does not create/drop databases or contain passwords, accounts or sample customer records.
- **Terminal:** put the new database credentials in an ignored `.env.local`, set `LOCAL_PREVIEW=0`, and run `pnpm db:init`. This command refuses to touch a database containing any tables. Use a setup account with CREATE privileges; the app itself needs only SELECT, INSERT, UPDATE and DELETE after setup.

There are 12 tables: users, services, project_types, projects, contacts, appointments, experience, education, next_sessions, next_rate_limits, next_mail_outbox and next_booking_mutex. Only the booking mutex row is inserted automatically. Projects, leads and other content start empty; the public website retains its built-in service cards when the service table is empty.

MySQL DDL is not transactional. If an import fails midway, inspect the error and partial tables privately; do not delete or reset an existing database. Correct the problem or create another empty database before retrying setup.

## 3. Create the dashboard owner

Set `ADMIN_EMAIL=info@shivpatel.in` in the ignored environment file. Then choose one:

```powershell
pnpm db:admin
```

This prompts for a new password twice, hides input and stores only its bcrypt hash in the database. Use at least 12 characters, at most 72 UTF-8 bytes. It refuses if any user already exists and does not reset passwords.

If remote MySQL access is not available yet:

```powershell
pnpm db:admin:sql
```

This generates an ignored `private/initial-admin.sql` containing a password hash, without contacting a database. Import it into the new portfolio database through phpMyAdmin, then remove the private SQL file. It does not change an existing user. Do not commit this generated file or share password hashes publicly. Never set a public admin password in source code or expect `ADMIN_PASSWORD` to create an account automatically.

## 4. Connect Vercel

Use `.env.example` for the server-only environment variable names. The required values include `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `ADMIN_EMAIL`, a random 32+ character `RATE_LIMIT_SECRET`, and `APP_ORIGIN`. Set `LOCAL_PREVIEW=0` and initially `MIGRATION_READ_ONLY=1`.

`DB_HOST` is the remote server hostname shown in Hostinger's Remote MySQL section, not the database/user name and not `localhost`. Confirm TLS support and any CA requirements with the provider; keep certificate verification enabled for hosted connections. Network allowlisting must admit the actual deployment egress addresses. Do not open database access to every address as a shortcut. If the hosting plan cannot provide a suitably protected connection, choose a compatible database hosting arrangement before deployment.

Set `APP_ORIGIN` to the exact canonical domain used in the browser, including `https://` and `www` if applicable. Use separate credentials for preview and production environments. Redeploy after changing Vercel variables.

After read-only checks pass on the new database, set `MIGRATION_READ_ONLY=0` and redeploy to enable submissions and editing. Sign in at `/dashboard/login`. Verify a controlled submission persists and is visible in the dashboard. Database creation does not configure SMTP, uploads or the notification scheduler; leave those disabled until separately verified.

## Local instance prepared in this workspace

A new local database named `shivpatel_nextjs` runs on `127.0.0.1:3307` with a restricted application user. Existing XAMPP and hosted databases were not changed. The generated local dashboard credentials are stored in ignored `private/local-dashboard.json`; they are not a production password and must not be uploaded. The original frontend-only `.env.local` was retained privately for rollback.

Real local HTTP checks passed for login/logout and session cookies, dashboard stats, project/type management, contact deduplication, wizard answer persistence, request updates, appointment collision locking and outbox queuing. Test records were removed and no email was sent. Hosted database access, SMTP delivery, Blob uploads and hosted login remain unverified.
