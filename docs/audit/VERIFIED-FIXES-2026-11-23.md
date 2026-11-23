# Verified audit repairs — 23 November 2026

Source repairs only. No production data, database schema/grants, credentials or n8n workflows were modified. The migration described below is intentionally not executed by build/start.

## High-priority repairs

- **RSVP intake:** bounded 12KB JSON parser, strict schema, same-origin/write guards and existing persisted rate limiting. Unknown telemetry/location fields and unsafe URL schemes are rejected. Removed direct, unvalidated SMTP dispatch and raw provider diagnostics.
- **Mail safety:** RSVP uses the existing durable notification outbox and plain text. SMTP keeps certificate verification enabled, requires STARTTLS on the explicit-upgrade path and supports implicit TLS on port 465. Ordinary contact/admin/client notifications retain their behavior.
- **Honest acceptance:** choices and one notification job are committed together. A stable client request UUID protects retries; conflicting answers under one UUID return 409. The browser requires a matching accepted receipt before success/lockout, retains choices on failure and re-enables retry. Acceptance confirms storage, not email delivery. SMTP remains at-least-once: a crash after server acceptance can still repeat a notification; a stable Message-ID is supplied.
- **Privacy:** removed the tracking script and all device/GPS/IP-geolocation collection, external lookup permission and sensitive local summary storage for new submissions. The browser stores only its completion flag. No historical customer records or browser summaries were purged. Privacy text explains saved choices and queued host notifications.

## Production prerequisite: RSVP storage

`scripts/014-rsvps.sql` creates `next_rsvps` with a unique request ID and JSON payload. Existing `next_mail_outbox` stores its notification reference. The SQL passed a real database check using temporary tables on the isolated loopback local MySQL database, including transaction commit, duplicate retry and conflicting-answer rejection. No durable local or production record was created by that check.

**This migration was not applied to production. Until it is applied, RSVP submission returns an error and retains the visitor's choices; it does not claim success.** Source containment is complete, but successful live RSVP persistence is pending the approved schema step.

Before enabling live acceptance, an authorized database administrator should review and apply the additive migration to staging, then to the correct backed-up production database. Verify existing outbox schema, the notification scheduler, and private SMTP settings. Configure the canonical `APP_ORIGIN` and the existing `RATE_LIMIT_SECRET`; retain the intended write-mode setting. Do not paste credentials into chat or commit them. A controlled live RSVP/email test needs separate recipient and data-write authorization.

## Other verified source repairs

| Audit finding | Result |
|---|---|
| Match analysis missing from Activity | Uses the actual `updated_at` score field, with a legacy `created_at` fallback; migration-shaped regression added. |
| Hire and login contrast | Darkened secondary text, retained contrast during heading animation and fixed login-brand/form helper colors. |
| Invitation zoom restriction | Removed in the integrated invitation layout. Both HTML entry files remain synchronized. |
| Broken advertised CV download | Replaced with an honest `Request my CV` email action. No approved PDF was available; none was invented. |
| Project hash links discarded | Removed the forced hash deletion/scroll-to-top effect; fresh `/#projects` navigation works. |
| Booking steps not keyboard-scrollable | Focusable, labeled progress region. |

Concurrent upstream invitation layout, keyboard feedback, reduced-motion, countdown timezone and asset-version changes were preserved. Frontend tests now validate durable receipts rather than the removed synchronous email response contract.

## Verified findings intentionally pending

1. **Runtime MySQL privileges:** no GRANT/REVOKE or account change. A database owner must separate migration privileges from runtime DML, test staging, then coordinate the application account switch. Do not revoke privileges blindly on a shared account.
2. **Missing lead tables:** existing migrations `007-lead-conversations.sql` and `012-shiv-whatsapp-leads.sql` are available, but were not applied. Confirm the intended production target and feature flags before provisioning and controlled lead tests.
3. **Project/lead credential scope:** no credential or auth contract was silently rotated. Switching the WhatsApp endpoint to an independent key requires matching changes in its existing n8n caller. That production coordination is outside the explicit no-workflow-change constraint, so the shared-key finding remains open.

The unverified proxy-header risk, capped Supabase summaries, broad script policy and backup/scheduler readiness from the audit were not represented as repaired verified defects.

## Validation

- Full suite after integrating upstream changes: **180 tests passed**, zero failed/skipped. Node-module coverage: **90.91% lines**, **82.62% branches**, **88.72% functions**; browser JSX coverage excluded.
- Direct Next.js production build passed; optional migration hooks were bypassed during local checks.
- Temporary-table SQL integration passed on the guarded isolated local target. No email was sent.
- Browser checks: failed/mismatched RSVP receipts preserve values; retry keeps the same UUID; confirmed receipt displays success; injected suggestion text stays inert; no tracking request or stored sensitive summary; direct project link and CV request work.
- Accessibility and no-overflow checks at 1440x1000, 768x1024 and 375x812 cover hire, login, booking and invitation. Local artifacts and detailed outcomes are in `.local/audit-fixes-20261123/`.
- Dependency advisory check reports no known vulnerabilities. Working diff reviewed for credentials, conflict markers and unintended changes.

## Rollback and remaining acceptance

Revert the reviewed source commits to roll back the application. Do not drop RSVP/outbox records or restore an old database dump to roll back code. No database rollback is required for this work because no production migration ran. If migration 014 is later approved and populated, retain it and its responses across application rollback; do not let an older outbox worker misinterpret queued `rsvp` jobs.

No real SMTP/provider send, authenticated production write, production schema/grant change, n8n change or credential rotation was tested or performed. RSVP live acceptance remains blocked on the explicit migration prerequisite above.
