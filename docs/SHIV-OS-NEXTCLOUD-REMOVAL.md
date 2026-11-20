# SHIV OS — Nextcloud Discovery & Uninstallation Inventory

*Status: Ready for Owner Review & Authorization*  
*Date: 2026-11-20*  

---

## 1. Executive Summary

This document presents the complete discovery, dependency check, and deletion inventory for the uninstallation of Nextcloud and removal of the `cloud.shivpatel.in` public routing from SHIV OS.

In accordance with strict safety protocols:
- **No containers have been deleted.**
- **No databases have been dropped.**
- **No storage volumes or files have been erased.**
- **No Cloudflare records have been mutated.**

This inventory is staged awaiting explicit owner confirmation before any irreversible destruction is executed.

---

## 2. Dependency Audit Across SHIV OS Services

Before scheduling deletion, all other SHIV OS subsystems were audited for dependencies on Nextcloud:

| Subsystem | Uses Nextcloud? | Evidence / Inspection Finding | Safe to Delete? |
|---|---|---|---|
| **GitHub Portfolio Automation** | **NO** | Ingests from GitHub API into local draft tables and Vercel Blob. Zero Nextcloud references. | **YES** |
| **Instagram Photo Automation** | **NO** | `shiv-photo-worker` binds `/var/lib/shiv-photos/data` and `/mnt/c/Users/patel/Downloads/New folder`. Zero Nextcloud calls. | **YES** |
| **Funny Reel AI / YouTube Shorts** | **NO** | Uses raw MP4 streams in `~/projects/shiv-os-funny/probes/`. The only workflow referencing Nextcloud was `ShivReelsPreview1` (`Sastatengo | Cloud Videos → ChatCut`), which is inactive (`active: false`). | **YES** |
| **WhatsApp Lead AI** | **NO** | Handled via external webhook / OpenAI / Gemini provider. Zero Nextcloud calls. | **YES** |
| **Job Hunter Ingestion** | **NO** | Communicates directly with Supabase PostgreSQL. Zero Nextcloud calls. | **YES** |
| **Master Dashboard Web UI** | **NO** | Cloud dashboard panels, routes, and icons have been removed on branch `codex/remove-cloud-and-3d`. | **YES** |
| **Active n8n Workflows** | **NO** | Audited all 204 workflows in `n8n_local` PostgreSQL. All 5 active SHIV OS workflows have 0 Nextcloud references. | **YES** |

**Conclusion:** Nextcloud is completely isolated from all active production and automation pipelines. Its removal will have zero impact on portfolio automation, n8n, photo generation, or video workflows.

---

## 3. Exact Inventory for Permanent Deletion

### A. Docker Containers to Stop & Remove
| Container Name | Container ID | Image | Current State | Action |
|---|---|---|---|---|
| `shiv-nextcloud` | `f5506c1b84a6` | `nextcloud:34.0.5-apache` | Exited (12 days ago) | `docker rm -f shiv-nextcloud` |
| `shiv-nextcloud-cron` | `2947662d956c` | `nextcloud:34.0.5-apache` | Exited (12 days ago) | `docker rm -f shiv-nextcloud-cron` |
| `shiv-nextcloud-redis` | `b814bb0ce115` | `redis:7.4-alpine` | Exited (28 hours ago) | `docker rm -f shiv-nextcloud-redis` |

### B. Dedicated Docker Volumes to Delete
| Volume Name | Mountpoint in WSL Host | Reclaimed Space |
|---|---|---|
| `shiv-cloud_nextcloud_html` | `/var/lib/docker/volumes/shiv-cloud_nextcloud_html/_data` | ~1.1 GB (Apache & Nextcloud app source) |
| `shiv-cloud_nextcloud_data` | `/var/lib/docker/volumes/shiv-cloud_nextcloud_data/_data` | ~2.0 GB (Local account data on C: drive) |

*Command:* `docker volume rm shiv-cloud_nextcloud_html shiv-cloud_nextcloud_data`

### C. Dedicated PostgreSQL Database & User to Drop
*Located inside container `postgres_shared` (Port 5432):*
- **Database:** `shiv_nextcloud`
- **Role/User:** `shiv_nextcloud`

*Safe Deletion SQL:*
```sql
DROP DATABASE IF EXISTS shiv_nextcloud;
DROP USER IF EXISTS shiv_nextcloud;
```

> [!CAUTION]
> Container `postgres_shared`, volume `postgres_shared_data`, and database `n8n_local` are **SHARED** and will be preserved. Only `shiv_nextcloud` is dropped.

### D. External HDD Data & Host Bind Mounts (Owner-Authorized)
- **Path:** `/srv/shivcloud-hdd/ShivCloud` (points to `D:\ShivCloud` on Windows NTFS external drive).
- **Subfolders:** `Sastatengo/Inbox`, `Sastatengo/Approved`, `Sastatengo/Posted`, `4 TB HDD`.
- **Space Reclaimed:** Variable based on user uploads.

### E. Nextcloud Host Configuration & Secrets
- File: `/opt/shiv-control/compose.yml` (Nextcloud Compose specification)
- File: `/opt/shiv-control/cloud-entrypoint.sh`
- State: `/var/lib/shiv-control/cloud-init/`
- Secret: `/var/lib/shiv-control/secrets/db-password`

### F. Systemd Timers & Services to Disable
- `shiv-cloud-hdd.timer` (runs `/opt/shiv-control/hdd-storage-check.sh` every minute)
- `shiv-cloud-hdd.service`
- Mount: `/etc/fstab` entry for `/srv/shivcloud-hdd` (optional cleanup)

*Commands:*
```bash
sudo systemctl disable --now shiv-cloud-hdd.timer shiv-cloud-hdd.service
sudo rm -f /etc/systemd/system/shiv-cloud-hdd.*
```

---

## 4. Cloudflare Tunnel & Hostname Deletion Plan

### Target Identifiers
- **Zone:** `shivpatel.in`
- **Tunnel Name:** `shiv-wsl`
- **Tunnel ID:** `05c94711-11af-48c7-91c3-f338b00c7f0f`
- **Tunnel Ingress Rule to Remove:**
  ```yaml
  - hostname: cloud.shivpatel.in
    service: http://127.0.0.1:8788
  ```
- **Configuration File:** `/etc/cloudflared/config.yml`
- **DNS Record:** `cloud.shivpatel.in CNAME 05c94711-11af-48c7-91c3-f338b00c7f0f.cfargotunnel.com`

### Preserved Cloudflare Routes
- `shivpatel.in` & `www.shivpatel.in` (Vercel Production) — **PRESERVED**
- `n8n.shivpatel.in` (n8n Automation Engine) — **PRESERVED**
- `dockhand.shivpatel.in` (Container Management) — **PRESERVED**

---

## 5. Execution Steps Upon Approval

When the owner provides confirmation, execution will proceed in this order:

1. Remove ingress rule for `cloud.shivpatel.in` from `/etc/cloudflared/config.yml`.
2. Reload systemd cloudflared client: `sudo systemctl restart cloudflared.service`.
3. Stop and remove Docker containers: `shiv-nextcloud`, `shiv-nextcloud-cron`, `shiv-nextcloud-redis`.
4. Drop PostgreSQL database `shiv_nextcloud` and user `shiv_nextcloud`.
5. Remove Docker volumes: `shiv-cloud_nextcloud_html`, `shiv-cloud_nextcloud_data`.
6. Disable systemd unit `shiv-cloud-hdd.timer`.
7. Clean Nextcloud storage directories from `/srv/shivcloud-hdd/ShivCloud`.
8. Verify `n8n.shivpatel.in` and `www.shivpatel.in` remain healthy and active.
