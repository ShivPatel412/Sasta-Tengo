# Database

Migration: `scripts/005-instagram-studio.sql`, additive `CREATE TABLE IF NOT EXISTS`.
No existing schema or data is modified. All owned records include `owner_id`.

| Table | Stores |
| --- | --- |
| studio_photos | SHA-256, dHash, private storage reference, dimensions/source/tags/favorite/AI description |
| studio_albums | Owner and custom album name |
| studio_album_photos | Album membership, unique album/photo pair |
| studio_drafts | Revision, status and JSON containing photos, selected order, locks/overrides, captions, alt text, hashtags, location, music and analysis |
| studio_jobs | Durable request/result, attempt, state, owner, draft revision, deadline and sanitized error |
| studio_job_events | State transition audit trail |
| studio_settings | Owner scoring weights and retention interval |
| studio_post_history | Future verified published media ID and photo IDs; approval does not insert here |

The application uses ownership checks and transactions rather than foreign keys
against the legacy website schema. Draft saves verify every referenced photo.
Cleanup and saves lock photos so expired uploads cannot race into saved drafts.
Unique owner/hash prevents concurrent duplicate file records.

Only the isolated local database was migrated during implementation. To repeat
the additive setup locally in PowerShell:

```powershell
$env:STUDIO_ALLOW_MIGRATION='1'
node --env-file=.env.local --env-file=.env.master.local scripts/migrate-instagram-studio.mjs
```

Production migration requires the owner's separate deployment approval and a
backup/review of the intended database target. Do not use the local master
environment when migrating production.

Retention is configurable in Studio Settings. Maintenance is dry-run by default:

```powershell
$env:NODE_ENV='development'
$env:MASTER_DASHBOARD_LOCAL='1'
node --env-file=.env.local --env-file=.env.master.local scripts/cleanup-instagram-studio.mjs
```

Add `--apply` only after reviewing eligible counts. It removes expired normalized
Studio copies only when no draft, album, active job, favorite or publishing
history references them. It scans up to 1000 oldest photos per run. Schedule
this maintenance only after production setup approval. Photos referenced by
saved drafts are intentionally retained.
