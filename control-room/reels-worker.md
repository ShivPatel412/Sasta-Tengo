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
Both platform release checks run every two minutes. A failed cover holds the
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

Verify JavaScript with `node --test tests/*.test.mjs` and collector joins with
`python3 -m unittest discover -s control-room -p test_reels_tracking.py`.
