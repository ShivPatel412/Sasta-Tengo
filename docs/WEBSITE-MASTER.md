# Website master dashboard

Canonical dashboard: https://www.shivpatel.in/dashboard. Keep the public website
and its existing administrator account, database, content APIs and login intact.
The earlier website-dashboard retirement implementation has been removed.

Set server-only `MASTER_DASHBOARD_ENABLED=1` in Vercel production to enable the
merged website/control-room navigation and same-session 3D assets. Production
status reads the latest sanitized collector snapshot from MySQL, not the PC's
filesystem. Missing/stale/offline sources remain visibly unavailable.

## Activate the status connection

1. Run `node --env-file=.env.local scripts/migrate-control-snapshot.mjs` with the
   existing database configuration in a private terminal. It adds one table;
   no existing data is rewritten. The runtime DB user needs SELECT/INSERT/UPDATE
   on this table. Setup needs CREATE privilege.
2. Generate an independent random 32-byte secret. Configure its hex encoding as
   `CONTROL_ROOM_PUSH_KEY` in Vercel production and in the PC's protected
   `/var/lib/shiv-control/master-push.env` file, formatted as
   `CONTROL_ROOM_PUSH_KEY=...`. Do not reuse the website password or other tokens.
   The environment file must be root-owned, mode 600; systemd reads it before
   dropping privileges to shivdash. Never put this key in browser code.
3. Deploy the source to Vercel. Copy push_snapshot.py to /opt/shiv-control and
   the shiv-master-push.service/.timer files to /etc/systemd/system on Ubuntu.
   Run `sudo systemctl daemon-reload`, then
   `sudo systemctl enable --now shiv-master-push.timer`.
4. Check `sudo systemctl start shiv-master-push.service` and its journal. A 401
   means mismatched keys; 422 means malformed/stale collector data; 503 can mean
   missing key, missing table or database connectivity. Do not print the key.
5. Sign in to the website dashboard and verify website editors, workflow and
   agent status, cloud/services, and 3D entry/return. Confirm signed-out requests
   to /api/admin/control-room and /hq assets are rejected.

The PC sends HTTPS POSTs every 30 seconds to the fixed canonical website URL;
redirects are rejected to prevent forwarding the secret. The upload key can
replace status only; it cannot create a browser session, edit portfolio records,
execute workflows or publish photos. Uploads have a 2 MB body limit and old
snapshots cannot overwrite newer ones. The collector exports metadata only;
the upload further discards unrelated top-level fields. No task bodies, prompts
or credentials should ever be added to the collector feed.

## Verified production state — 16 November 2026

The production snapshot table and upload key are configured. The PC uploader succeeds every 30 seconds; the authenticated master API returns 123 workflows and 30 recent executions. Missing individual source timestamps, source errors and stale snapshots suppress live metrics. Nextcloud currently reports a collector connection error; old cloud usage is not live usage.

The unified workflow page now displays actual n8n execution history and refreshes every 30 seconds. Execution requests are separate from completed n8n runs. Run buttons require explicitly configured authenticated webhooks in WORKSPACE_N8N_WORKFLOWS; none were configured during this review. Monitoring remains available without them.

The legacy shiv-dashboard.service is already disabled/inactive and dashboard.shivpatel.in returns HTTP 404. Keep the collector, upload timer, n8n, Nextcloud, photo workers, storage volumes and tunnel. The master serves its own protected 3D experience and routes /dashboard/photos to Instagram Studio. Historical local photo tools are not equivalent to the hosted Instagram Studio and their source/data was retained.

Authenticated production reads passed for session, analytics, projects, experience, contacts, service requests, tasks, CRM, workflows, collector status and project drafts. Signed-out status/workflow/job requests returned 401. Seven imported GitHub repositories are published and present in the public portfolio.

Rollback: disable MASTER_DASHBOARD_ENABLED and redeploy to restore the portfolio-only navigation. The old subdomain is retired and is not a rollback target. Stop shiv-master-push.timer only to pause uploads; retain its snapshot table and service data.

## Personal workspace scope — 16 November 2026

The n8n feed includes every unarchived workflow owned by the Personal project UWCIZeLCvuUGM9uC: workflows at the project root and inside every folder, including Sasta Tengo, Infrastructure, Personal Projects and Bugle. This is the Personal workspace shown in the n8n sidebar; it is not limited to the similarly named Personal Projects folder.

Lists, AI-node counts, recent executions and Asia/Kolkata daily totals all derive from the same project-ownership selection. Workflows belonging to other projects and archived workflows stay excluded. No workflows are moved, disabled or deleted.

The feed carries project_id UWCIZeLCvuUGM9uC and folder_id null. The website rejects the earlier two-workflow folder scope, unscoped data and other projects. Collector failures reuse only snapshots with this exact workspace scope. Configured execution hooks and request history outside the visible workspace are hidden.

## Workflow dashboard and folders

The Workflows page shows total/published workflows, today’s execution/failure totals, and the latest five executions with an option to expand the collected history. The browser uses the actual folder and parent-folder metadata collected read-only from the Personal project. Root workflows remain directly accessible; folder breadcrumbs navigate all nested levels. Folder cards show the total workflows beneath them and the number of immediate subfolders. Search matches workflow names and full folder paths across the workspace. No folders or workflows are created, moved or modified by browsing.
