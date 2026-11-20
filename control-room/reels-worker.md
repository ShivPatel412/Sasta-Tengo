The Funny Reels dashboard dispatches to MEDIA-API, which saves a durable job,
acknowledges its UUID, then starts FUNNY-02 asynchronously. The website's existing
`next_workflow_runs` table prevents redispatching a request after a lost receipt.
Source permission is required. The maximum is ten clips, with fewer permitted
when the source has fewer suitable moments.

`reels-progress.py` runs on WSL before worker milestones. It updates the existing
job table and appends to SHIV_OS_Funny_Reel_Events. Cover rendering also writes a
small clip manifest in that job's directory. The collector uses
`reels_tracking.py` to join milestones, worker failures, manifests, and separate
Instagram and YouTube receipts. A completed handoff is never a public-post receipt.

The active uploader checks that Meta returns account 17841467420993171 with
username `sastatengo.clips` before creating a container. Every caption includes
`@sastatengo`; the Reel container also sets its user tag. Instagram selects the
generated cover from the clip's cover intro. YouTube stays private until media
processing succeeds and its generated PNG is accepted as a custom thumbnail.
Both platform release checks run every thirty seconds, one queued item per check.
The reservation update matches both the job key and its pending state, so an
overlapping check cannot reserve a job already claimed for publication. A failed cover holds the
Short private and records an error instead of releasing it without its cover.

The website needs server-only REELS_N8N_WEBHOOK_URL and
REELS_N8N_WEBHOOK_AUTH. The latter matches the existing n8n Authorization Header
Auth credential, including its prefix. No credentials belong in source control.
The authenticated `/api/admin/reel-media` proxy serves only paths found in the
collector's manifests, through the authenticated MEDIA-API media webhook.

Runtime files are installed under `/opt/shiv-control`; job media stays under
`/home/patelsastatengo/projects/shiv-os-funny/jobs`. Keep the installed
collector's existing functions when replacing `automations_data`. The existing
snapshot uploader must retain `automations` in its allowlist. Runtime updates
have rollback copies under `/var/lib/shiv-control/backups`.

The dashboard checks collected state every ten seconds. Collection runs on the
existing timer, so short steps can appear together on the next refresh. Recent
history is bounded to twenty jobs, a thousand milestone events, and 250 receipts
per platform. Jobs remain stored in n8n after leaving this dashboard window.
Keep the PC, Docker, WSL, collector, and n8n running for automatic processing.

Speed update (20 November 2026): FUNNY-02 downloads up to four source fragments
concurrently. REELS-03 and YT-02 poll every 30 seconds rather than 120; ten ready
items need about five minutes of scheduling slots per platform instead of twenty,
excluding processing, network latency, other queued jobs and retries. These
parameter changes are published in n8n; no credentials or full workflow exports
are stored here. The ten-minute YouTube recovery schedule is unchanged.

The dashboard estimates the full finish window after the first analysis milestone.
Initial planning budgets are 90 seconds per analysis segment, 60 seconds for
selection, 120 seconds per clip cycle and 2–10 minutes plus queue slots for
publication. They are explicitly labelled provisional, not measured guarantees.
Consecutive segment/clip starts and public receipt timestamps refine the pace.
Worker estimates use a 0.7–1.5 multiplier; platform delays may exceed the range.
Stale tracking pauses estimates, overruns request recalculation, and only receipts
on both platforms mark completion. Estimates refresh with the existing ten-second
dashboard poll in both Start here and Track videos.

Local encoding check: a 12-second 1080x1920/60fps sample took 4.026 seconds with
libx264 fast and 3.994 seconds with veryfast. The gain was negligible, so the
existing quality settings remain. NVENC crashed with exit -11 in WSL, including
a simple synthetic-input probe, so GPU encoding was not enabled. A complete
ten-clip source-to-public batch has not yet been timed.

Verify JavaScript with `node --test tests/*.test.mjs` and collector joins with
`python3 -m unittest discover -s control-room -p test_reels_tracking.py`.
