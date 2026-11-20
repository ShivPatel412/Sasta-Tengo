# Repair roadmap and rollout record

Audit date: 20 November 2026 (Asia/Calcutta). Baseline `0fb00b9`; dedicated branch `codex/shiv-os-audit-20261120`. Local logical commits are listed by `git log 0fb00b9..HEAD`; subjects below identify the repair groups without embedding self-referential commit hashes. No push or deployment was performed.

## Completed source changes

| System | Current status | Verified evidence | Problems found | Fixes completed | Remaining work |
|---|---|---|---|---|---|
| Job Hunter / leads | Local repair ready | Mocked provider and state regressions pass | Data/query/update and takeover bugs | Shared service fixes; no new backend | Confirm live schema and deploy with approval |
| Dashboard actions / contact | Local repair ready | Suite passes; source contracts and async checks | False action receipts; inquiry loss | Honest unavailable controls and real contact lifecycle | Authenticated acceptance and approved rollout |
| Browser/dependencies | Local repair ready | Build and dependency audit pass | Google CSP omissions and Next advisories | Narrow policy repair and patched Next | OAuth acceptance and approved deployment |
| n8n / workers / infra | Diagnosed; unchanged | Read-only inventory, history, ledger/index and runtime inspection | Safety drift, injection, claim race, stopped workers | Offline validator candidate only | Back up and obtain approval before production-impacting work |

Local source commits:

- `6984240` — Job Hunter storage and lead safety states.
- `8c96223` — truthful automation controls and contact retry.
- `c1d1381` — Next.js patch and Google browser policy.

Logical source groups:

1. **Repair Job Hunter storage and preserve lead safety states:** `lib/job-hunter.mjs`, `lib/shiv-whatsapp-leads.mjs`, `tests/job-hunter-audit.test.mjs`, `tests/job-hunter-dashboard.test.mjs`, `tests/whatsapp-leads.test.mjs`.
2. **Make dashboard automation actions truthful and retain failed inquiries:** four `app/api/admin/{funny-reels,jobs,youtube,linkedin}/route.js` files; three social components in `app/dashboard/[[...path]]`; `lib/funny-reels.mjs`; `components/site/components/TerminalForm.jsx`; `lib/terminal-contact.mjs`; automation-dashboard/social-controls/terminal-contact tests.
3. **Patch Next.js and allow required Google browser endpoints:** `next.config.mjs`, `package.json`, `pnpm-lock.yaml`, `tests/google-picker-csp.test.mjs`.
4. **Document verified SHIV OS audit and production blockers:** the six reports in this directory.

## Verification completed

- `node --test tests/*.test.mjs`: **157 passed, zero failed/skipped**.
- `pnpm build`: successful Next.js 16.4.5 Turbopack production build; migration flags unset, no migration run.
- `pnpm audit --audit-level=moderate`: no known vulnerabilities.
- `git diff --check`: passed.
- REELS-04 candidate: five offline validator checks passed; no SSH or workflow execution.
- Public page/API inspection and read-only n8n/DB/runtime inspection. Full details and limits are in the other five reports.

## P0 / P1 next: production safety before functionality

1. Review this branch and approve its deployment. Run authenticated acceptance against an isolated preview and real account, without external sends. Build alone does not prove login or API data access.
2. Export exact LEAD-01 published/draft JSON and relevant ledger data. Approve the eleven missing WhatsApp safeguards; test duplicate IDs, takeover, opt-out and failure receipts with controlled fixtures before customer traffic.
3. Back up REELS-04; patch input validation and safe command arguments. Keep it unpublished until approved tests pass. Offline candidate is in workspace `outputs/shiv-os-audit-20261120`, outside the canonical repo; it is not a deployed fix.
4. Review publishing duplicate keys; implement unique job keys and atomic expected-state claims with a backup and rollback migration. Keep LinkedIn paused. Require actual provider IDs and readback before a public-success claim.
5. Confirm Job Hunter Supabase destination privately and compare applied schema with repository migrations. Configure authenticated JOB-00 and runner callbacks, then approve activation of needed orchestration. A stored task is not a started task.
6. Diagnose photo/reel exit-137 logs and memory limits before restart. Verify workflow SSH user/path and tools. Use only an owner-authorized test clip; record real ffprobe dimensions/fps and private output before any publishing.
7. Approve PORT-02 draft-only operation, enable verified Gemini image generation and genuine screenshot capture, and protect existing manual content. Do not silently rewrite the current active workflow policy.

## P2 next: management, access and cleanup

Deploy collector/source parity and automation ledger telemetry. Keep scope visible; do not mix the unrelated n8n connector instance into this inventory. Repair remote Homarr connector separately from the healthy local Homarr container. Verify least-privilege database and tool permissions, backup restore and service bind/firewall requirements.

Retired resources needing explicit retention/cleanup approval: Cloudflare `cloud.shivpatel.in -> 127.0.0.1:8788` ingress; active cloud-HDD timer and its `/opt/shiv-control/hdd-storage-check.sh`; stopped `shiv-nextcloud`, `shiv-nextcloud-cron`, `shiv-nextcloud-redis`; volumes `shiv-cloud_nextcloud_data` and `shiv-cloud_nextcloud_html`. Confirm backups before any volume deletion. Do not delete shared tunnel/Traefik/Postgres/n8n or the public hero's `three` dependency. Do not recreate 3D/Nextcloud.

Fix genuine public CV asset and hash navigation. Measure repeat/cold API latency before adding caching or another service.

## Credentials and external decisions

Private server settings, never chat/committed source:

- Existing auth/MySQL/SMTP and `RATE_LIMIT_SECRET`, `APP_ORIGIN`: verify actual production target; retain current account model.
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SHIV_JOB_API_TOKEN`: exported production values were redacted, so configured target/validity could not be established. Do not use the literal `[SENSITIVE]` as a value.
- `PROJECT_AUTOMATION_KEY`: currently shared with WhatsApp jobs; approve independently scoped lead credentials and coordinated rotation.
- `CONTROL_ROOM_PUSH_KEY`: keep separate from action webhooks; working snapshot upload does not prove media dispatch.
- `STUDIO_N8N_WEBHOOK_URL`, `STUDIO_N8N_WEBHOOK_KEY`, private Blob token/store ID: verify matching authenticated workflow and worker. A configured URL alone is insufficient.
- `NEXT_PUBLIC_STUDIO_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_STUDIO_GOOGLE_PICKER_KEY`, `NEXT_PUBLIC_STUDIO_GOOGLE_APP_ID`: not present in inspected production export; configure approved domains/OAuth and browser API restrictions privately.
- `LEADS_N8N_WEBHOOK_URL`, `LEADS_N8N_WEBHOOK_KEY`, `LEADS_DISPATCH_KEY`, `LEADS_CALLBACK_KEY`: not present in inspected production export; review intended architecture and migrations before enabling.
- `WORKSPACE_N8N_WORKFLOWS`: absent in inspected production export; verify intended editable workflow allowlist and project scope before exposing controls.
- Existing Gemini credential previously reported image-generation quota zero; billing/quota has not been reverified. Meta/YouTube OAuth consent, token validity and scopes have not been reverified. Preserve LinkedIn pause.

Owner approvals required: source deployment; published n8n/version/activation changes; schema/grant changes; worker/runtime changes; external sends/publishing; deletion or retention decisions; any DNS/routing change.

## Rollback

No production rollback is necessary yet: this audit did not deploy. To discard a proposed source group, use `git revert <reviewed-commit>` on this branch; do not reset unrelated worktrees or force-push. For an approved deployment, record current production deployment ID (audit baseline `dpl_BVwiTVh7iqygmpiUbVNpdJjBQsEN`) and the new deployment; promote the previous known-good deployment if acceptance fails.

Before workflow rollout, save exact active/draft JSON plus credential reference IDs privately and record versions from N8N-WORKFLOW-STATUS.md. Restore that version and previous activation state if controlled checks fail. Before schema/grant changes, export affected rows/index definitions/grants and test restore. Do not roll back a uniqueness change by deleting receipts or rerun a publisher blindly.

## Success criteria not yet met

One existing 2D dashboard and public portfolio remain. Full success is not claimed: actual Job Hunter data access, published WhatsApp safeguards, media processing, provider publication/readback, genuine GitHub cover/screenshots, accurate automation telemetry, backup restore and infrastructure retirement still require the steps above.
