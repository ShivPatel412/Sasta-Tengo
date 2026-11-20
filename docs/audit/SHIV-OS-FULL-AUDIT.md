What this repo does: SHIV OS combines the public portfolio and private master dashboard with MySQL, Job Hunter's Supabase API and existing n8n workflows. It manages projects, forms, leads and media jobs. Assumed load: one owner, concurrent workers/webhooks, and public visitors.

Audit date: 20 November 2026 (Asia/Calcutta). Baseline `0fb00b9`, branch `codex/shiv-os-audit-20261120`. Findings distinguish source repairs from still-running production behavior. See the [system inventory](SHIV-OS-SYSTEM-INVENTORY.md) for status, evidence, fixes and remaining work for every system.

## Must fix

1. **Media input can break shell quoting** (n8n `E9mNbyn7ZetDGfH6`, ValidateAuthorizedFinishedClip and SSH render path).
   - **What this is:** REELS-04 builds an FFmpeg shell command from intake fields.
   - **Problem:** Handle/subtitle fields containing a quote can escape the command's quotes. The workflow is currently unpublished; this is a concrete risk if invoked or activated.
   - **Fix:** Validate handles and trusted subtitle paths before constructing commands. Five offline cases pass for a candidate; no live patch or shell execution was performed.
   - **If we skip it:** Untrusted intake can execute unintended commands when this path is enabled.

2. **Published WhatsApp flow lacks draft safeguards** (n8n `huJ04u2rwGa65Tyy`, published `29174145-ecaa-480a-8ee2-937958a1538e`).
   - **What this is:** LEAD-01 receives messages and produces AI/customer actions.
   - **Problem:** Eleven draft guards, including deduplication, dashboard takeover and failure handling, are absent from the published graph.
   - **Fix:** Back up current versions, review and approve the guard publication, then test duplicate IDs, takeover and failed delivery with controlled fixtures.
   - **If we skip it:** Draft safeguards give false confidence while production can repeat actions or ignore a human handoff.

3. **Concurrent publishing can claim the same job** (Instagram ledger `8aPwNmzYRPGzoTKX`, YouTube ledger `mpJSsahLGSp5xc90`, reservation nodes).
   - **What this is:** Scheduled and manual publishers reserve ledger jobs.
   - **Problem:** No unique job key and no expected-state condition on reservation updates allow overlapping runs to reserve one item twice.
   - **Fix:** Inspect duplicates, back up ledgers, then approve unique keys and an atomic conditional claim before allowing posts.
   - **If we skip it:** Concurrent runs can upload or publish duplicate content even at this owner's expected load.

4. **Dashboard actions acknowledged work that was not connected** (`app/api/admin/funny-reels/route.js`, `jobs/route.js`, `youtube/route.js`, `linkedin/route.js`).
   - **What this is:** Buttons request queueing, privacy changes, retry or deletion.
   - **Problem:** Some handlers returned success from fabricated objects or unauthenticated, unawaited webhook calls.
   - **Fix:** Fixed locally: unsupported social operations return unavailable responses and buttons explain the limitation. Job tasks use validated durable ingestion and explicitly say execution has not started.
   - **If we skip it:** Users trust work that never ran; production retains the old behavior until this branch is deployed.

5. **Job Hunter reads and updates disagree with storage** (`lib/job-hunter.mjs:29`, `:190`, `:296`).
   - **What this is:** Shared Supabase REST access powers jobs, scores, drafts and task views.
   - **Problem:** HTTP 204 was parsed as JSON; score filters targeted the wrong table; totals used page length; provider failures looked like empty success; draft edits violated review constraints.
   - **Fix:** Fixed locally: handle empty writes, join/filter scores correctly, preserve exact totals, normalize score rows, propagate errors and validate draft kind/content with review required. Regression tests cover these cases.
   - **If we skip it:** Successful saves appear failed and job lists hide data or give wrong counts. Seven unpublished JOB workflows remain a separate live blocker.

6. **Lead state could release human control or miss an opt-out** (`lib/shiv-whatsapp-leads.mjs:33`).
   - **What this is:** Incoming automation updates merge into lead status.
   - **Problem:** Qualification could overwrite human takeover; a closed state could prevent a later opt-out.
   - **Fix:** Fixed locally: preserve takeover, keep opt-out sticky, let new opt-out override closed. Two regression tests added.
   - **If we skip it:** Production may resume AI activity after handoff or fail to record withdrawal.

7. **GitHub automation does not implement the requested approval policy** (n8n `znWH2q245LqTt8kK`; `lib/project-automation.mjs`).
   - **What this is:** PORT-02 scans GitHub hourly and can update portfolio projects.
   - **Problem:** Current flags disable AI covers and genuine screenshots while allowing auto-publish. Edits made before draft staging can be overwritten by generated copy.
   - **Fix:** Obtain approval for draft-only policy, preserve manual content explicitly, and verify image quota, real screenshots and approval before any publication. No live policy was silently changed.
   - **If we skip it:** A green schedule does not deliver the requested images or approval gate and may change curated copy.

8. **Runtime database account can change schema** (configured MySQL grants, read-only inspection).
   - **What this is:** The website connects using an account with DML plus CREATE, ALTER, DROP, EVENT and TRIGGER privileges.
   - **Problem:** Application compromise or a misrouted migration has a larger data-loss impact. The inspected target lacks lead tables; production target equality cannot be proved from redacted settings.
   - **Fix:** Verify the target and backups; split migration privileges from runtime permissions. No grants or schemas were changed.
   - **If we skip it:** A runtime mistake can destroy schema, and missing tables block lead tracking.

9. **A project automation key also grants lead access** (`app/api/jobs/whatsapp-leads/route.js:1`).
   - **What this is:** The WhatsApp jobs endpoint imports the project automation authenticator.
   - **Problem:** One key grants access across project and lead-data boundaries rather than an independent lead scope.
   - **Fix:** Coordinate an independent scoped key with n8n, rotate privately, then deploy both sides together. Existing callers were preserved during this audit.
   - **If we skip it:** Disclosure of a project worker key also exposes lead operations.

10. **Contact inquiry could be cleared before delivery** (`components/site/components/TerminalForm.jsx:129`).
    - **What this is:** The terminal-style contact form submits the owner's inquiry.
    - **Problem:** Timed progress/reset cleared answers independently of the actual request result.
    - **Fix:** Fixed locally: await real delivery, prevent duplicate pending submissions and retain answers on failure. Two async lifecycle regression tests pass.
    - **If we skip it:** A failed request loses the visitor's message while appearing finished.

11. **Known Next.js security fixes were missing** (`package.json`, `pnpm-lock.yaml`).
    - **What this is:** Production source used Next.js 16.4.3.
    - **Problem:** Dependency audit identified seven moderate advisories. Not all are cache-only or universally applicable; no exploitation is claimed.
    - **Fix:** Locally patched to 16.4.5; dependency audit now reports no known vulnerabilities and production build passes.
    - **If we skip it:** Deployed code retains the unpatched dependency until rollout.

## Should fix

12. **Media screens invented verification and render details** (`lib/funny-reels.mjs:156`, `:213`; social dashboard components).
    - **What this is:** Dashboard adapters display published media and AI highlights.
    - **Problem:** Missing metadata became sample previews, scores, credits, 60fps/spec claims or verified identities. A fresh general snapshot was treated as media connectivity even when its automation payload was empty.
    - **Fix:** Fixed locally: require receipts for publication counts, keep unknown metadata unknown and require automation-specific telemetry. External readback and real ledger ingestion remain outstanding.
    - **If we skip it:** The dashboard presents guesses as verified work.

13. **Google sign-in/Picker blocked by CSP** (`next.config.mjs`).
    - **What this is:** Browser policy restricts script, frame, style and connection origins.
    - **Problem:** Actual Google Identity and Drive Picker endpoints were missing, so otherwise configured integrations could fail to open.
    - **Fix:** Fixed locally with narrow provider allowances and a policy regression test; no wildcard relaxation. OAuth consent and account permissions still need a real signed-in test.
    - **If we skip it:** Credentials alone cannot make the browser integration work.

14. **Stopped workers and stale deployed collectors contradict source** (WSL Docker and `/opt/shiv-control`).
    - **What this is:** Photo/reel workers and monitoring services support dashboard features.
    - **Problem:** Both workers exited 137. Collector still reports removed cloud state; automation payload is empty. n8n/Postgres/Dockhand/Homarr bind host ports on all interfaces.
    - **Fix:** Inspect logs/memory before worker restart; deploy reviewed collector changes; restrict binds after confirming access requirements. Internet reachability was not established by bind inspection.
    - **If we skip it:** Media remains unavailable and the dashboard cannot prove real system state.

15. **Retired cloud paths can leave or recreate obsolete infrastructure** (Cloudflare config, cloud-HDD timer, legacy deploy scripts).
    - **What this is:** App-level 3D/cloud removal left runtime services and historical deployment paths.
    - **Problem:** Cloud routes to 8788, a timer still runs, stopped Nextcloud containers and volumes remain. Deleting volumes without retention approval risks data loss.
    - **Fix:** Back up/confirm retention; approve exact cleanup and retire obsolete script execution paths. Keep `three`: the public LaserFlow hero still uses it.
    - **If we skip it:** Drift persists or old scripts recreate retired resources. No blanket dependency deletion is safe.

16. **Public deep link and CV are broken** (`components/site/pages/Home.jsx:69`; `/cv.pdf`).
    - **What this is:** Direct portfolio-section links and the CV download are public entry points.
    - **Problem:** Fresh `/#projects` loses its hash and scrolls to the top; CV endpoint returns 404.
    - **Fix:** Preserve valid section hashes and supply the owner's real approved CV asset. Neither was fabricated or silently replaced.
    - **If we skip it:** Shared section links and hiring downloads remain unreliable.

## Verification and limits

- **157/157 Node tests passed**, zero skipped/failing. Five additional offline REELS-04 validator cases passed outside the application suite; no workflow or SSH command ran.
- `pnpm build` passed with Next.js 16.4.5/Turbopack. Migration flags were unset. No database migration was run.
- `pnpm audit --audit-level=moderate`: no known vulnerabilities. `git diff --check` passed.
- Public browser observation: TTFB 148ms, DOM ready 857ms, load 1029ms, FCP 796ms. Three public data calls each took about 1.7–1.8s. These are single-navigation lab observations, not field Core Web Vitals or Lighthouse scores.
- Mobile viewport actually measured 355px, document width 341px: no overflow there. A requested 390px override did not produce 390px, so that width is not claimed verified.
- Business logic tests use mocked provider responses. Social UI tests inspect source contracts; they do not establish provider integration or authenticated route behavior. Contact lifecycle tests do not replace a browser form submission. No customer inquiry was sent.
- Live n8n/DB inspection was read-only and sanitized. No customer details, credentials, raw conversations or videos are committed. Report includes all 22 scoped workflow IDs and versions in the companion workflow report.

Verdict: deploy the tested source fixes only after approval, then repair WhatsApp guard drift, publishing claims and stopped orchestration before describing SHIV OS as fully operational.

Not checked: authenticated dashboard acceptance, external publication/readback, actual Supabase project/schema, OAuth scopes/refresh, Gemini image quota, backup restore, real authorized media render, internet exposure and exhaustive historical execution bodies. No production fixes were applied.
