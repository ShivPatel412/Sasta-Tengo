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

## Remaining cutover requirements

The Instagram photo tool still runs on the PC. Its existing localhost worker
API is not remotely accessible from Vercel; it must be integrated separately
before retiring the old interface. Keep that link available during migration.
Do not stop the collector, n8n, Nextcloud, photo workers or Cloudflare Tunnel
when removing duplicate dashboard UI. Website authentication endpoints are also
still used by the old control room until its UI is retired.

Retire the old subdomain interface only after authenticated acceptance passes
for every required feature. No DNS change is necessary for this source change.
Rollback: disable MASTER_DASHBOARD_ENABLED and redeploy; the original website
dashboard returns. Stop shiv-master-push.timer to pause uploads without deleting
the snapshot table or any other service data.
