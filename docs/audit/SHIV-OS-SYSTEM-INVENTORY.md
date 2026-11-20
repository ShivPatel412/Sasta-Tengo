# SHIV OS system inventory

Verified 20 November 2026, Asia/Calcutta. Source repairs are local on `codex/shiv-os-audit-20261120`, based on `0fb00b9`. No deployment, production data writes, workflow changes, publishing, messages, DNS changes or resource deletions were performed.

| System | Current status | Verified evidence | Problems found | Fixes completed | Remaining work |
|---|---|---|---|---|---|
| Website / portfolio | Public reads working | 6 real projects, 3 experience records; no broken images or console errors | Contact reset early; CV 404; project deep link removed | Contact pending/retry lifecycle fixed locally | Restore real CV and deep links; approve deployment |
| Master dashboard | Build passes; private acceptance outstanding | Existing session/admin guards and catch-all dashboard retained | Unsupported social actions claimed success | Actions gated; API failures explicit; fabricated metrics removed | Authenticated browser acceptance and real dispatch integration |
| Monitoring | Partially connected | Fresh n8n snapshot: 150 workflows, scoped project UWCIZeLCvuUGM9uC | Cloud stale/error; automation ledger payload empty | Availability requires actual media telemetry | Update deployed collector; connect ledger feed |
| Job Hunter | Live orchestration blocked | Seven JOB workflows unpublished | 204 parsing, score filter/count, swallowed failures, draft review constraint | Source store/query/error/draft fixes tested | Identify actual Supabase target; verify schema and data; approve runner activation |
| WhatsApp leads | Published safety drift | LEAD-01 published graph lacks 11 draft safeguards | Takeover overwrite and opt-out precedence; missing configured-DB lead tables | Source state precedence fixed | Approve backed-up workflow safety update and reviewed migrations |
| Funny Reels / media | Not working end to end | Media workers stopped; intake workflows unpublished | Unsafe shell input; no durable authenticated dispatcher | False queue claims removed; offline validator candidate tested | Approve workflow patch, worker recovery and authorized test clip |
| Instagram / YouTube | Partial ledger evidence | One Instagram receipt/permalink; one private YouTube row | No external readback; duplicate reservation race; no telemetry feed | Receipt-based display; unknown specs remain unknown | Atomic claim/uniqueness; OAuth verification; provider readback |
| Photo Studio | Worker unavailable | SOC-01 active with draft/published drift; worker exited 137 | Calls worker on 8792 that is stopped | No runtime change | Inspect logs/resources and verify storage/OAuth |
| GitHub automation | Active; requested features incomplete | PORT-02 hourly; success 10538; earlier failure 8851 website 503 | Cover/screenshot flags false; autoPublish true | No policy changed | Approve draft-only policy and manual-copy protection; verify Gemini quota/screenshots |
| Workflow Manager / agents | Monitoring only | OPS-01 six-hour schedule, applyEnabled=false | Credential references do not establish scopes or validity | No new agent permissions | Verify tools and provider scopes individually |
| Database / storage | Configured source reachable | 25 MySQL tables/indexes inspected; runtime user has DDL grants | Lead tables absent on inspected target; backup restore untested | No schema/grant changes | Confirm production target; separate migration account; test restore |
| Docker / tunnel | Mixed health | n8n/Postgres/Traefik/Dockhand/Homarr/local MySQL running | Several all-interface host binds; render workers stopped | No runtime change | Review firewall/binds and recover workers after diagnosis |
| Retired 3D / Nextcloud | App removed; infrastructure retained | Cloud route 8788; active HDD timer; stopped Nextcloud containers; two volumes | Deployment drift and retained data | No recreation or deletion | Confirm retention/backup; approve exact cleanup |
| Connections | Mixed | GitHub metadata/fetch and Vercel CLI work; remote Homarr connector 404 | Two n8n connectors target different instances | Inventory attributed using matching IDs and N8N_HOST | Fix connector endpoint; keep inventories separate |

Canonical repo: `ShivPatel412/Sasta-Tengo`, Windows `portfolio-site`; fetched origin/main equalled baseline. Earlier feature worktrees are historical branches, not independent production backends. Expected WSL `~/shiv-master-preview` was absent.

Production at inspection: Vercel `dpl_BVwiTVh7iqygmpiUbVNpdJjBQsEN`, Ready, aliases `www.shivpatel.in` and `shivpatel.in`. Master dashboard lives at `/dashboard`; old dashboard subdomain is absent from current tunnel ingress. Audit branch is not deployed.

Stack: Next.js locally patched 16.4.3 to 16.4.5, React 19.3.1, Node 24.18, pnpm 11.13.1, MySQL, Supabase REST for Job Hunter, n8n/Docker/Traefik/Cloudflare. Existing auth, projects, forms, agents and stats retained. No replacement dashboard/backend was created.

The public n8n instance has 150 nonarchived workflows, eight active. A different connector returned 170 workflows and 28 active from another instance; excluded here. Dashboard monitoring is project scoped, so it will not necessarily display all workflows in the instance.
