# SHIV OS Local Architecture & Service Inventory

*Generated via read-only system inspection on 2026-11-20.*

---

## 1. Executive Summary

**SHIV OS** is a hybrid multi-service ecosystem spanning:
1. **Next.js Portfolio & Master Dashboard** (deployed to Vercel; developed locally in WSL2 and Windows).
2. **Local Automation Core (n8n)** running on Docker inside WSL2 Ubuntu with 200+ workflows.
3. **Control Room Daemon & Status Bridge** running natively in WSL2 (`/opt/shiv-control`, systemd services/timers).
4. **Self-Hosted Storage & Nextcloud** running in Docker with external 4 TB NTFS storage mount.
5. **Local Background Workers** for photo and reel rendering/automation.
6. **Edge Ingress & Tunnels** via Cloudflare Tunnel (`cloudflared`) and Traefik reverse proxy.

---

## 2. Source Code Locations & Git Topology

### Workspaces on Disk

| Role | Filesystem Path | Environment | Description |
|---|---|---|---|
| **Local Preview Workspace** | `~/shiv-master-preview`<br>`(/home/patelsastatengo/shiv-master-preview)` | WSL2 Ubuntu (ext4) | Dedicated Linux workspace for high-performance Next.js local development (`pnpm dev:master`). Extracted from `portfolio-site` at commit `04f879b` without `.git` to avoid 9P filesystem latency. |
| **Primary Git Repository** | `/mnt/c/Users/patel/OneDrive/Documents/ChatGPT/Shiv Patel/portfolio-site`<br>`(C:\Users\patel\OneDrive\Documents\ChatGPT\Shiv Patel\portfolio-site)` | Windows / DrvFs (9P mount) | Main version-controlled Git working tree connected to GitHub. |
| **Control Room Daemon** | `/opt/shiv-control` | WSL2 Ubuntu (ext4) | Deployed Python system daemon, status collector, and Docker compose configuration for control services. |
| **Control Room State** | `/var/lib/shiv-control` | WSL2 Ubuntu (ext4) | Runtime snapshots (`snapshot.json`), environment secrets, and push configuration. |
| **Docker Compose Stacks** | `~/docker`<br>`(/home/patelsastatengo/docker)` | WSL2 Ubuntu (ext4) | Central Docker Compose configurations (Databases, n8n, Traefik, Homarr, Dockhand). |
| **Media Probes & Scratch** | `~/projects/shiv-os-funny/probes` | WSL2 Ubuntu (ext4) | Processing directory for video clips, audio samples, and generated reel artifacts. |

### Git Metadata & State

- **GitHub Remote:** `https://github.com/ShivPatel412/Sasta-Tengo.git`
- **Active Branch in primary repo (`portfolio-site`):** `feature/instagram-ai-studio` (HEAD: `ff2cb23`)
- **Main Branch:** `main` (commit `3491327`, remote `origin/main` at `64e6bae`)
- **Active Worktrees:**
  - `codex/dashboard-automation-audit`
  - `codex/privacy-and-terms`
  - `codex/freelance-landing`
  - `codex/github-media-recovery`
  - `codex/job-hunter-ingest`
- **Git Status in `portfolio-site`:** 81 modified files and 1 untracked directory (`control-room/photo-automation/`).
- **`shiv-master-preview` Note:** Does not maintain a `.git` subfolder directly. It is a working snapshot pinned to the local master dashboard integration.

---

## 3. Local Development Commands

The project uses Node v24 (managed via NVM) and `pnpm`.

```bash
# Ensure Node and pnpm are loaded in WSL
source ~/.nvm/nvm.sh

# Navigate to project
cd ~/shiv-master-preview

# Run full test suite (58/58 unit and integration tests passing)
pnpm test

# Launch Local Master Dashboard (Next.js with Webpack on port 3001)
# Binds to 127.0.0.1:3001 with read-only migration safeguards
pnpm dev:master

# Standard Next.js development server
pnpm dev

# Production build compilation
pnpm build

# Database utility scripts
pnpm db:init        # Initialize database schema (scripts/setup-database.mjs)
pnpm db:admin       # Create administrator user (scripts/create-admin.mjs)
pnpm db:admin:sql   # Output admin insertion SQL without executing
pnpm audit:data     # Audit database data integrity
```

---

## 4. Database Connection Architecture

*Note: All credentials, passwords, and private hashes are omitted.*

```
+---------------------------------------------------------------------------------------+
|                                    DATABASE TOPOLOGY                                  |
+---------------------------------------------------------------------------------------+

  [Vercel Production] ----------------(TLS / Port 3306)------------> [Hostinger Remote MySQL]
  (www.shivpatel.in)                                                  srv1947.hstgr.io
                                                                      DB: u165370995_portfolio_next

  [Local Master Next.js] -------------(Port 3307 / No TLS)---------> [Local Docker MySQL 8.4]
  (localhost:3001)                                                    Container: shiv-master-mysql
                                                                      DB: shiv_master_local

  [Local n8n Automation] ------------(Docker Network 'db-net')-----> [Local Docker Postgres 16]
  (n8n container)                                                     Container: postgres_shared (pgvector)
                                                                      DB: n8n_local (schema: n8n)

  [Local Nextcloud] -----------------(Docker Network 'db-net')-----> [Local Docker Postgres 16]
  (shiv-nextcloud container)                                          Container: postgres_shared
                                                                      DB: shiv_nextcloud

  [Job Hunter Workflows] ------------(HTTPS REST / API)------------> [Remote Supabase PostgreSQL]
```

1. **Remote Production MySQL (Hostinger):**
   - Host: `srv1947.hstgr.io:3306`
   - Database: `u165370995_portfolio_next`
   - Role: Stores live public portfolio items, experience, contact inquiries, client appointments, and website administrator accounts.
2. **Local Master MySQL (Docker):**
   - Container: `shiv-master-mysql` (Image: `mysql:8.4`)
   - Host Binding: `127.0.0.1:3307 -> 3306`
   - Database: `shiv_master_local`
   - Role: Isolated local database used by `.env.master.local` for offline development and testing.
3. **Local Shared PostgreSQL + pgvector (Docker):**
   - Container: `postgres_shared` (Image: `pgvector/pgvector:pg16`)
   - Host Binding: `0.0.0.0:5432 -> 5432`
   - Databases hosted:
     - `n8n_local`: Backs all local n8n workflows, credentials, and execution logs.
     - `shiv_nextcloud`: Backs Nextcloud user metadata, file indices, and activity.
4. **Remote Supabase PostgreSQL:**
   - Role: Used by private external workflows (e.g. Job Hunter ingestion).

---

## 5. n8n Automation Integration & Deployment

### Deployment Specifications

- **Container Name:** `n8n` (`docker.n8n.io/n8nio/n8n:latest`)
- **Compose Directory:** `~/docker/apps/automation/n8n/docker-compose.yml`
- **Port:** `5678` (bound to host and proxied via Traefik)
- **Networks:** `traefik-net`, `db-net`
- **Volume Mounts:**
  - `./data/n8n` -> `/home/node/.n8n`
  - `~/n8n-certs` -> `/opt/custom-certificates`
- **Public Ingress:** `https://n8n.shivpatel.in` (routed via Cloudflare Tunnel `05c94711-...` to Traefik on port 443 with TLS verification bypassed for loopback).
- **Timezone:** `Asia/Kolkata`

### Key SHIV OS Workflows Active in PostgreSQL (`n8n_local`)

| Workflow ID | Workflow Name | Active State | Purpose |
|---|---|---|---|
| `AmbLkPhRqNiydTo8` | `SHIV OS \| OPS-01 - Workflow Manager (AUTO - SAFE DRAFT)` | **Active** | Operational workflow manager and orchestrator |
| `ShivPhotoPosts01` | `SHIV OS \| SOC-01 - Instagram Photo Publisher` | **Active** | Instagram photo publishing pipeline |
| `ShivProjectGemini01` | `SHIV OS \| PORT-01 - Gemini Generation Bridge` | **Active** | Gemini AI project description and metadata bridge |
| `uFAzLSFG7vb8GLXl` | `SHIV OS \| REELS-03 - Auto Publish Verified Reels` | **Active** | Automatic publishing of verified reels to Meta |
| `znWH2q245LqTt8kK` | `SHIV OS \| PORT-02 - GitHub Dashboard Sync` | **Active** | Hourly sync of public GitHub repos into project review drafts |
| `ShivInstagramStudio01` | `Shiv Instagram AI Studio \| private analysis` | Inactive | 5-node analysis bridge for Instagram drafts |
| `ShivReelsPreview1` | `Sastatengo \| Cloud Videos → ChatCut` | Inactive | Nextcloud video ingestion for editing |

Workflow definitions are version-controlled in the repository under `control-room/github-automation/workflow.json` and `control-room/instagram-studio/workflow.json`.

---

## 6. Media & Storage Architecture

```
+-----------------------------------------------------------------------------------+
|                                 MEDIA & STORAGE MAP                               |
+-----------------------------------------------------------------------------------+

  [Public Portfolio Images] ----------> Vercel Blob (Public Store via BLOB_READ_WRITE_TOKEN)
                                        Max 4 MB/file; SVGs and executables blocked

  [Instagram Studio Drafts] ----------> Vercel Blob Private Store (store_AF5YQzrhr0sYloGX)
                                        Region: Mumbai; short-lived OIDC credentials

  [Nextcloud Account Files] ----------> Docker Volume: shiv-cloud_nextcloud_data
  (cloud.shivpatel.in)                 Quota: 2 GB on C: root drive

  [External Bulk Storage] ------------> 4 TB External NTFS HDD (WD My Passport)
                                        Windows Mount: D:\ShivCloud
                                        WSL2 Mount: /srv/shivcloud-hdd (via /etc/fstab)
                                        Monitored by: shiv-cloud-hdd.timer (checks .shivcloud-drive-id)

  [AI Reel / Video Probes] -----------> WSL2 Filesystem: ~/projects/shiv-os-funny/probes/
                                        Raw MP4 streams, cut samples, rendered reel files

  [Local Photo Worker] ---------------> Bind Mount: /var/lib/shiv-photos/data
                                        Source Ingest: /mnt/c/Users/patel/Downloads/New folder
```

---

## 7. Control Room, Status Push & Vercel Relationship

### The Status Telemetry Loop

The Next.js website dashboard at `https://www.shivpatel.in/dashboard` displays real-time health for local WSL2 and Docker services without exposing internal ports or private networks:

```
[WSL2 Background Timers]
        │
        ▼ (Every 30s)
1. `shiv-collector.timer`
   Executes /opt/shiv-control/collector.py
   Reads Docker states, n8n stats, disk usage, and Codex threads
   Writes sanitized JSON to /var/lib/shiv-control/snapshot.json
        │
        ▼ (Every 30s)
2. `shiv-master-push.timer`
   Executes /opt/shiv-control/push_snapshot.py as user 'shivdash'
   Reads /var/lib/shiv-control/snapshot.json
   Reads CONTROL_ROOM_PUSH_KEY from /var/lib/shiv-control/master-push.env
        │
        ▼ HTTPS POST (Bearer Token, 2 MB limit, redirects rejected)
3. Destination: `https://www.shivpatel.in/api/control-room/snapshot`
   Vercel serverless endpoint receives payload
   Writes snapshot into MySQL database table `control_room_snapshot`
        │
        ▼
4. Web Dashboard at `https://www.shivpatel.in/dashboard`
   Authenticated admin views workflows, agent counts, disk space, and Docker health.
```

### Local Master vs Production Master

- **Local Preview (`pnpm dev:master`):**
  Reads `/var/lib/shiv-control/snapshot.json` directly from the local filesystem via the `CONTROL_ROOM_SNAPSHOT_PATH` environment variable.
- **Production (`www.shivpatel.in`):**
  Reads the latest pushed snapshot record stored in the database. When `MASTER_DASHBOARD_ENABLED=1` is set in Vercel, the website dashboard enables the unified control-room navigation.

---

## 8. Service Inventory: Local vs Remote Matrix

| Service / Component | Running Host / Location | Protocol / Port | Remote / Local | Status Verified |
|---|---|---|---|---|
| **Public Portfolio Web** | Vercel Edge / Serverless | HTTPS (443 via Cloudflare) | **Remote** | Up (`https://www.shivpatel.in`) |
| **Next.js Master Preview** | WSL2 Ubuntu | HTTP (`127.0.0.1:3001`) | **Local** | Ready (`pnpm dev:master`) |
| **Production MySQL** | Hostinger Cloud | MySQL (`srv1947.hstgr.io:3306`) | **Remote** | Up |
| **Local Master MySQL** | Docker in WSL2 (`shiv-master-mysql`) | MySQL (`127.0.0.1:3307`) | **Local** | Up (running 3+ days) |
| **Shared PostgreSQL 16** | Docker in WSL2 (`postgres_shared`) | PostgreSQL (`0.0.0.0:5432`) | **Local** | Up (healthy, pgvector) |
| **n8n Automation Engine** | Docker in WSL2 (`n8n`) | HTTP (`5678`) / HTTPS (n8n.shivpatel.in) | **Local (Proxied)** | Up (running 3+ days) |
| **Traefik Reverse Proxy** | Docker in WSL2 (`traefik`) | HTTP/HTTPS (80, 443) | **Local** | Up (running 3+ days) |
| **Cloudflare Tunnel Client**| Systemd in WSL2 (`cloudflared`) | Outbound HTTP/2 Tunnel | **Local** | Up (active) |
| **Dockhand Container UI** | Docker in WSL2 (`dockhand`) | HTTP (`3050`) / dockhand.shivpatel.in | **Local (Proxied)** | Up (healthy) |
| **Homarr Dashboard** | Docker in WSL2 (`homarr`) | HTTP (`7575`) / homarr.shivpatel.in | **Local (Proxied)** | Up (healthy) |
| **Nextcloud Apache** | Docker in WSL2 (`shiv-nextcloud`) | HTTP (`127.0.0.1:8788`) / cloud.shivpatel.in | **Local (Proxied)** | Exited (needs start) |
| **Nextcloud Redis Cache** | Docker in WSL2 (`shiv-nextcloud-redis`)| Internal Docker network | **Local** | Exited |
| **Photo Worker** | Docker in WSL2 (`shiv-photo-worker`) | Internal / Local | **Local** | Exited |
| **Reel Worker** | Docker in WSL2 (`shiv-reel-worker`) | Internal / Local | **Local** | Exited |
| **Status Collector Timer** | Systemd in WSL2 (`shiv-collector.timer`)| Runs every 30 seconds | **Local** | Active |
| **Status Push Timer** | Systemd in WSL2 (`shiv-master-push.timer`)| Runs every 30 seconds | **Local** | Active |
| **HDD Storage Guard** | Systemd in WSL2 (`shiv-cloud-hdd.timer`) | Runs every 60 seconds | **Local** | Active |
| **Legacy Python Dashboard** | Systemd in WSL2 (`shiv-dashboard.service`)| HTTP (`127.0.0.1:8787`) | **Local** | Inactive (superseded by Next.js master) |

---

## 9. Immediate Observations & Recommended Next Steps

1. **3D Assets & Overhead:**
   - The Next.js repository currently contains `three` (v0.167.1), `ogl` (v1.0.11), and heavy 3D canvas components (`components/site/component/LaserFlow.jsx`, `LightRays.jsx`, `app/dashboard/3d/`, etc.).
   - The separate Codex prompts for 3D removal will strip these dependencies and simplify the frontend bundle.
2. **Git Workspace Synchronization:**
   - Changes in `portfolio-site` can be synced into `~/shiv-master-preview` when needed, or `~/shiv-master-preview` can be initialized as a Git working copy linked to a specific branch if unified tracking is desired.
3. **No Services Modified:**
   - In accordance with instructions, all inspections were strictly read-only. No Docker containers were restarted, no migrations were executed, and no git states were modified.
