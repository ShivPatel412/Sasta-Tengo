# Security findings

Verified 20 November 2026. These are findings, not claims that exploitation occurred. Local fixes remain undeployed; live workflows remain unchanged.

| System | Current status | Verified evidence | Problems found | Fixes completed | Remaining work |
|---|---|---|---|---|---|
| Media shell execution | Unsafe draft, unpublished | REELS-04 input reaches single-quoted SSH command | Handle/subtitle quote injection | Offline validator candidate, five checks | Review/back up/approve workflow patch before invocation |
| WhatsApp | Published safeguards missing | LEAD-01 draft/published comparison | Dedup/takeover/sync/failure handling drift | Source takeover/opt-out precedence fixed | Publish reviewed guards with approval and controlled tests |
| Publish concurrency | Race remains | Ledger indexes and reservation filters inspected | No unique job key or conditional claim | No live data change | Back up, inspect duplicates, approve atomic claims |
| Project/lead API scopes | Shared scope | WhatsApp jobs imports project automation auth | Project key grants lead operations | No caller-breaking key rotation | Independent scoped key and coordinated rollout |
| JOB-00 webhook | Unpublished, unauthenticated draft | Webhook authentication metadata | Unsafe to activate publicly | Remains unpublished | Add authentication/replay policy before activation |
| Runtime MySQL permissions | Excess privileges | Configured connection grants include DDL | Application can alter/drop schema | No grants altered | Confirm exact production target; use migration-only account |
| Next.js dependency | Patched locally | Seven moderate advisories before patch; zero known after | Version 16.4.3 missing fixes | Version 16.4.5 pinned and built | Approved production rollout |
| Browser policy | Narrow provider repair local | Actual Google Identity/Picker URLs and policy test | Required provider endpoints blocked | Explicit script/style/frame/connect allowances | Signed-in OAuth/Picker acceptance |
| Network exposure | Host binds confirmed | Docker maps n8n 5678, Postgres 5432, Dockhand 3050, Homarr 7575 on all interfaces | More host exposure than loopback | No firewall changes | Check LAN/internet reachability; restrict with access plan |
| Secrets and accounts | Verification limited | Production settings partly redacted as literal [SENSITIVE] | Cannot identify Supabase target or prove token scopes | No secrets committed; no invented credentials | Verify privately with provider/account owner |

## Dependency evidence

`pnpm audit --audit-level=moderate` reports **No known vulnerabilities found** after the minimal patch. This is a dependency database result, not a guarantee of application security. Relevant primary advisories include [Next.js SVG optimizer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) and [Next.js Edge HttpOnly cookie advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2). Exploitability depends on the deployed route/runtime; the old claim that all findings were cache-only was not reused.

## Browser and API boundaries

Admin/session checks, same-origin mutation guards and read-only protections remain. Unsupported social mutation routes now fail explicitly rather than claiming success. Job task dispatch requires the existing long machine token and validated durable storage; it does not execute a runner. No anonymous mutation or real customer operation was used to test these boundaries.

Google policy allowances follow [Identity setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [Drive Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker). Policy changes do not configure OAuth consent, approved domains or API permissions.

## Storage, logs and retention

MySQL metadata and grants were inspected without changing records. Supabase schema SQL in the repo is intended design, not proof of an applied live migration. Backup existence and restore procedures were not verified. Retained Nextcloud volumes may contain personal data: do not delete them on the basis of an obsolete route alone. Do not commit production env exports, credential values, raw execution bodies, CVs or customer conversations.

No complete historical secret scan, token rotation, provider penetration test or public exposure scan was performed. No numerical security score is assigned.
