# Dashboard and public route status

Verified 20 November 2026. A production build proves routes compile; it does not prove private pages, credentials or external jobs work. No new authenticated browser acceptance was completed in this audit.

| System | Current status | Verified evidence | Problems found | Fixes completed | Remaining work |
|---|---|---|---|---|---|
| `/` and public portfolio API | Live read verified | Six projects, three experience records; public API 200; no broken images/console errors | Data calls ~1.7–1.8s in one navigation | Existing content preserved | Measure repeated/cold requests before optimization |
| `/#projects` | Broken direct navigation | Fresh hash removed; page scrolled top; Home.jsx lines 69–86 | Valid section link discarded | None | Honor valid hash and check browser back/forward |
| `/cv.pdf` | 404 | Public read | Missing real CV | None | Owner-approved CV asset |
| `/dashboard` | Existing shell compiles | Catch-all page passes section to existing Dashboard; session/admin design retained | Private acceptance not verified | No duplicate dashboard created | Sign-in, refresh and logout acceptance |
| `/dashboard/workflows` | Snapshot source available | Fresh n8n source; project scope; matching public-instance IDs | Cloud error and scope can hide/misrepresent global inventory | No invented workflow state added | Verify signed-in full scoped list and refresh |
| `/dashboard/jobs` | Source repaired; live runner blocked | Regression tests for store/count/score/draft/errors | Seven JOB workflows unpublished; target schema unverified | Shared store and durable task ingestion repairs | Verify actual Supabase target and live job data |
| Lead / CRM panels | Source state repaired | Merge-state regression tests; workflow version inspection | Published flow lacks takeover/dashboard safeguards; configured DB lacks tables | Takeover and opt-out precedence | Approved migration and flow update; signed-in handoff test |
| Funny Reels / content panels | Honest read-only state locally | Media API source and source-contract tests | No authenticated durable dispatcher; missing automation telemetry | Unavailable actions gated; no fake queued job | Build on actual MEDIA-API contract after approval |
| YouTube panel | No verified live public publishing | One private upload in ledger; source tests | Prior false privacy actions and fake channel default | Unavailable mutations explicit; unknown identity stays unknown | OAuth, atomic claims and provider readback |
| LinkedIn panel | Paused | Existing paused policy retained | Prior fake action acknowledgements | Unsupported changes return unavailable | Keep paused until separately authorized |
| Instagram studio / Google Picker | Source present; worker stopped | CSP regression test; SOC-01/worker inspection | OAuth and private media flow not exercised | Narrow provider policy repair | Signed-in consent/Picker and worker recovery |
| Projects / draft approvals | Existing architecture retained | PORT-02 graph and project worker inspected | Active sync disables screenshots/covers and permits auto-publish | No unapproved policy change | Approve draft-only policy, verify manual-edit protection and real screenshots |
| Forms / appointments / auth / stats | Preserved | Shared build and regression suite pass | Contact form had premature reset | Await/retain/retry contact behavior | Authenticated and delivery acceptance using controlled fixtures |
| Retired 3D / cloud app | App removed | No current app routes; `three` still used by public hero | Old infra remains | No recreation | Separate approved infrastructure cleanup |

## Local repair verification

157 Node tests pass. Added checks cover Job Hunter edge cases, lead status precedence, Google policy, unsupported social controls and async contact delivery. Source-contract tests for buttons are deliberately limited: they do not prove external integration. No private-page screenshot or real contact submission is claimed.

Build: `pnpm build`, Next.js 16.4.5/Turbopack, successful; migration flags unset. Public desktop single-navigation timings: TTFB 148ms, DOM ready 857ms, load 1029ms, FCP 796ms. Actual mobile width was 355px with document width 341px, no overflow there. No Lighthouse score or field Core Web Vitals is claimed.
