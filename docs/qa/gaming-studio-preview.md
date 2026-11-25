# Gaming Studio preview

The existing /dashboard/funny-reels route now presents Gaming Studio. The master navigation and authentication are reused. The prior dashboard mixed legacy progress milestones with progress percentages, returned whole worker records to the browser, and sent intake to a webhook that could start work immediately.

| Feature | Status | Evidence or dependency |
|---|---|---|
| Current execution, timeline and activity | Completed and verified locally | Authenticated browser rendered collector execution 61413 at 102/118 segments. Job state, stage progress, elapsed time, heartbeat, retry count and run link come from recorded fields. An unmeasured overall percentage is indeterminate. |
| Refresh, staleness and recovery | Completed and verified locally | Initial server read uses the existing session. A single visible-tab 10-second poll reads the existing snapshot. Older timestamps are ignored, events are deduplicated and bounded, and requests are canceled on cleanup. Simulated refresh failure retained the last view and manual refresh recovered. |
| Reel library | Completed for collected metadata and receipts | Public receipt links require matching platform status, ID and URL. A clip needs both receipts for a full publication badge. Covers use the existing authenticated proxy, with an available YouTube image or placeholder on failure. Worker media delivery could not be verified using isolated settings. |
| Queue and intake | Blocked | The existing intake starts work immediately. No verified queue-only contract or atomic source/concurrency guarantee was found. POST validates rights and the source, checks collected records, and returns 503 rather than dispatching. Moving and removing jobs require a backend contract. |
| Recovery and controls | Blocked | Requires a worker-supported safe checkpoint/lock contract. No workflow was changed or started. |
| Health | Partially verified | Disk usage and n8n container/collector status were read. GPU, CPU, RAM and VRAM have no feed in the inspected snapshot. |
| V6 / V7 | V6 read path verified, V7 pending | Current production worker records render through the same stage mapping. Optional V7 fields and stage names can be consumed when supplied. No ChatCut progress or V7 runtime was verified. |
| Supabase Realtime | Blocked | The current Gaming source is n8n/Postgres plus the existing workstation collector and MySQL snapshot. No verified Gaming tables, producer or scoped subscriptions were found in Supabase. The preview uses the existing feed without adding a second dispatcher or store. |
| Responsive UI | Completed and verified locally | Browser checks at 1440, 1280, 1024, 768 and 390px. Mobile studio axe scan found zero violations. Typeface uses the requested Geist names with installed-system fallbacks. |

The collector read was from WSL. Its snapshot uploader reported success. No job, workflow, Docker service, media file or publishing receipt was modified. The API projects explicit fields and strips raw worker diagnostics and paths. Private media stays behind the existing authenticated proxy. No worker credentials reach the browser.

Changes: the Gaming component and scoped CSS replace the old tabbed studio and obsolete panel styles. The dashboard page loads an authenticated initial snapshot. The existing Funny Reels GET returns a bounded read model and POST fails closed. No new routes or database migrations. The view model and regression tests are in lib/gaming-studio.mjs and tests/gaming-studio.test.mjs.

Verification: 184 Node tests passed, Next production build passed, isolated local session and read-only collector data passed browser checks. Screenshots are in the ignored .local/gaming-studio folder. There is no standalone lint or TypeScript script in this JSX project.

Rollback: discard the preview branch or revert its change if it is later promoted. No migration or workflow rollback is required. Production promotion requires explicit approval.
