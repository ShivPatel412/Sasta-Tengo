# Shiv Control Room and Nextcloud

## 3D gaming café

Open **https://dashboard.shivpatel.in/3d**, or choose **Enter 3D gaming café** in
the classic control room. The Next.js portfolio does not host this experience;
its old `/dashboard/3d` address only redirects here. This directory is the
maintained source in the Sasta-Tengo repository; the old workspace `shiv-control`
folder is a historical source copy. Deployment remains the existing Python web
service at `/opt/shiv-control`, not Vercel.

The café uses Three.js, React Three Fiber and Rapier, all free/open-source.
Furniture, coffee equipment, plants, avatars and materials are built in code;
there are no paid assets or external asset-provider dependencies. Wood grain is
procedural and floorboards are instanced. One directional shadow, bounded/adaptive
pixel resolution, lazy-loaded game code and disposable monitor textures keep the
classic dashboard independent from the renderer. This is a stylized playable
first room; licensed animated human GLBs, sitting and photoreal asset work remain
later refinements. No 60 FPS guarantee has been benchmarked on representative hardware.

WASD moves; Shift runs; mouse capture or click/drag looks around; E inspects a
nearby aimed-at station; Escape releases focus/closes the panel; V switches
first-person, third-person, free and overview cameras; M toggles the minimap.
Overview markers navigate to station approaches. Free camera supports orbit,
zoom and pan. Game settings expose quality, FOV and sensitivity. Desktop keyboard
and mouse is the supported playable input; touch movement is not implemented.

The existing `/api/overview` supplies actual workflows, execution history,
configured AI workflows, Codex chat history, Docker state and physical disk data.
It is polled every 30 seconds, not a WebSocket feed. Stale/failed n8n sources
disable live counts and the human's running pose; publication never implies
execution progress. CPU, RAM, exact server uptime, conversational agent replies
and node execution bodies are not in the collector and are labelled unavailable.
No workflow is started, stopped or changed by entering the café.

`/3d` uses the existing session check. Signed-out visitors return to the existing
login form and are sent back after signing in. Assets are served from a bounded
JS/CSS allowlist. Only the `/3d` document adds CSP `wasm-unsafe-eval`, required by
Rapier's WebAssembly; ordinary JavaScript eval, inline scripts, cross-origin
connections and classic page policy remain disallowed/unchanged.

Build and test from this directory:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
python3 -m unittest test_server test_website_auth
```

The generated `static/hq` files are committed for the Python service, which does
not need Node at runtime. Deploy only dashboard source/static assets using
`python3 deploy_hq.py` as root inside WSL. It keeps a timestamped rollback copy
under `/var/lib/shiv-control/backups/before-hq-*`, restarts only the dashboard,
and leaves the collector, workflows, cloud volumes, accounts and DNS untouched.
The restart expires existing in-memory control-room sessions; sign in again.

Two self-hosted services, separate from the portfolio website:

- **https://dashboard.shivpatel.in** — private control room; use the same email and password as the website dashboard.
- **https://cloud.shivpatel.in** — Nextcloud 34.0.5; username `shiv`.
- **http://localhost:8787** — same dashboard on the Windows PC through WSL localhost forwarding.

The owner created passwords in the local first-run screen. The control room now delegates authentication to the existing website account: only that website's allowed administrator can sign in. The separate `shiv` control-room password is disabled by `/var/lib/shiv-control/use-website-login`; local account setup is also disabled. Website passwords are sent only to `https://www.shivpatel.in/api/admin/login` over verified HTTPS and are not saved by the control room. A website session token is held only in server memory and checked against the website on protected requests; signing out revokes that token. Redirects during authentication are rejected. Website outages deny access without falling back to the old local password. Browser cookies remain private to each hostname, so each site can still ask for sign-in, but both accept one existing account. Nextcloud keeps its separate `shiv` account and password.

No passwords belong in this source directory. Secrets and the database password live under `/var/lib/shiv-control`, with restricted Linux permissions. Dashboard sessions expire after eight hours and restart invalidates them. First-run cloud password is emptied once Nextcloud initializes. The old control-room password hash is retained privately for recovery but is never consulted while website authentication is enabled.

## What is connected

- All unarchived n8n workflows, publication state, AI agent-node counts, last 30 executions, and today's execution totals in Asia/Kolkata.
- Local Codex chats and spawned agent metadata via the documented `codex app-server` `thread/list` interface. No turns are started and no transcripts are stored by the collector. A separate app-server cannot determine running state in the existing desktop process; cards deliberately show **history**, not an invented running/completed status. All nonarchived threads are paged up to 5,000; `truncated` reports that limit.
- Docker container names/state, physical Windows disk usage, and Nextcloud account quota/usage.
- Search and filters, links to the source applications, desktop and phone layouts.

The dashboard is read-only. Starting, editing and stopping workflows remains in n8n. It does not publish Instagram posts. Automatic photo selection/captions/publishing are not connected yet.

## Storage

### External 4 TB HDD (connected 4 November 2026)

Open Nextcloud as `shiv` and upload into **4 TB HDD**. This folder stores files in
`D:\ShivCloud` on the NTFS My Passport drive. Its capacity is separate from the
2 GB account home-folder quota on C:. Existing files stay in their original folders.
Choose `4 TB HDD` as the destination for phone auto-uploads that should use the HDD.

Ubuntu mounts D: at `/srv/shivcloud-hdd` through `/etc/fstab`. Both cloud and cron
containers bind only its `ShivCloud` subfolder, with automatic host-directory
creation disabled. `shiv-cloud-hdd.timer` checks the drive identity every minute,
stops file services if the expected drive is absent, and starts them after it returns.
Do not remove `.shivcloud-drive-id` from the drive root. Keep the drive letter D:.
Close uploads before unplugging the HDD; use safe removal. The guard is not a UPS
and cannot prevent interrupted writes during a sudden disconnection or power loss.

Public links require passwords and expire within seven days. The drive is only
available to the existing `shiv` account unless its applicability is deliberately changed.
The Windows sign-in startup entry launches WSL hidden; this does not provide service
before Windows sign-in. PC sleep is already disabled while plugged in.

Verified: public HTTPS upload/download byte comparison against the HDD, deletion,
password-protected sharing with automatic expiry, test-token revocation, and guard
tests for missing/wrong drive identities. Large-file transfers, physical unplugging,
and full Windows reboot have not been tested. A database/configuration snapshot is
under `/var/lib/shiv-control/backups/before-hdd-*` on the same PC; it is not an
independent file backup.

```sh
systemctl status shiv-cloud-hdd.timer
docker exec -u www-data shiv-nextcloud php occ files_external:verify 1
```

Nextcloud has a dedicated PostgreSQL database/user (`shiv_nextcloud`) on the existing Postgres container, Redis locking, persistent named Docker volumes, and a cron container. The `shiv` account starts with a **2 GB quota** because the physical C: drive has limited free space. WSL's much larger virtual disk capacity is not used as the available storage figure.

Photo folders created:

```text
Sastatengo/Inbox
Sastatengo/Approved
Sastatengo/Posted
```

Data volumes: `shiv-cloud_nextcloud_html` and `shiv-cloud_nextcloud_data`. The metadata database is inside the existing Postgres volume. A volume is persistent storage, **not an independent backup**. Do not remove phone originals until a separate backup exists. Keep normal phone auto-upload outside `Sastatengo/Inbox`.

Install the official Nextcloud phone app, enter `https://cloud.shivpatel.in`, and sign in with `shiv` and the Nextcloud password. Upload a few test photos before configuring full-library sync. The PC, WSL, Docker and Cloudflare Tunnel must remain on for remote access.

## Runtime paths

| Item | Location |
|---|---|
| Deployed source | `/opt/shiv-control` |
| Dashboard state | `/var/lib/shiv-control` |
| Web service | `shiv-dashboard.service`, unprivileged `shivdash` user |
| Metadata collection | `shiv-collector.timer`, every 30 seconds after the previous run |
| Nextcloud stack | `/opt/shiv-control/compose.yml` |
| Tunnel configuration | `/etc/cloudflared/config.yml` |

The web service binds to `127.0.0.1:8787`; Nextcloud binds to `127.0.0.1:8788`. Cloudflare Tunnel supplies public HTTPS. No Docker socket or database credentials are exposed to the web process or browser. The privileged collector issues fixed read-only SQL and exports a sanitized snapshot; it does not export n8n nodes, prompts, credentials or execution bodies. Existing n8n stacks were not edited.

Before publication, the old tunnel config is copied to `/etc/cloudflared/config.yml.before-shiv-<UTC timestamp>`. Existing tunnel routes are preserved; only the two requested hostnames are added.

## Maintenance

```sh
systemctl status shiv-dashboard.service shiv-collector.timer cloudflared
journalctl -u shiv-collector.service -n 20
docker compose -f /opt/shiv-control/compose.yml ps
```

To stop only the added services, without deleting their data:

```sh
systemctl stop shiv-dashboard.service shiv-collector.timer
docker compose -f /opt/shiv-control/compose.yml stop
```

Do not run `down -v`: it deletes Nextcloud volumes. Plan an independent backup of both the Nextcloud volumes and its PostgreSQL database before relying on it as the sole copy of files. SMTP password recovery is not configured. Passwords are owner-managed; store them securely.

Source changes can be copied to `/opt/shiv-control`. Restart `shiv-dashboard` after Python changes; static assets need only a browser reload. Changing the Compose configuration requires `docker compose up -d`. Run the authentication checks with `python3 -m unittest discover -s . -p test_server.py` and JavaScript syntax check with `node --check static/app.js`.

## Verification

Passed: authentication/session/logout, CSRF/origin rejection, public-setup denial, password validation and login rate-limiting tests; JavaScript syntax; live desktop workflow search/active filter; n8n/Codex agent-source filters; storage quota/folder scan; public dashboard HTTPS and anonymous data rejection; public Nextcloud HTTPS status via verified DNS address; existing n8n HTTPS remained available. Phone layout uses responsive CSS but has not been tested on a physical phone. Phone uploads and an independent backup remain to be verified/configured. The PC's resolver initially cached NXDOMAIN for the new cloud hostname, while Cloudflare DNS and HTTPS were already working.

## Sources used during implementation

- [Official Nextcloud Docker image](https://github.com/nextcloud/docker)
- [Nextcloud reverse proxy settings](https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/reverse_proxy_configuration.html)
- [Codex app-server thread listing](https://learn.chatgpt.com/docs/app-server)
