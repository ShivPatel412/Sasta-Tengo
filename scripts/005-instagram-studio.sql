CREATE TABLE IF NOT EXISTS studio_photos (
 id CHAR(36) PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL, sha256 CHAR(64) NOT NULL,
 dhash CHAR(16) NOT NULL, storage_key VARCHAR(512) NOT NULL, metadata JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY studio_photo_hash(owner_id,sha256), KEY studio_photo_owner(owner_id,created_at)
);
CREATE TABLE IF NOT EXISTS studio_albums (
 id CHAR(36) PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL, name VARCHAR(100) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY studio_album_owner(owner_id)
);
CREATE TABLE IF NOT EXISTS studio_album_photos (
 album_id CHAR(36) NOT NULL, photo_id CHAR(36) NOT NULL, PRIMARY KEY(album_id,photo_id)
);
CREATE TABLE IF NOT EXISTS studio_drafts (
 id CHAR(36) PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL, revision INT NOT NULL DEFAULT 1,
 status VARCHAR(20) NOT NULL DEFAULT 'draft', payload JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY studio_draft_owner(owner_id,updated_at)
);
CREATE TABLE IF NOT EXISTS studio_jobs (
 id CHAR(36) PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL, draft_id CHAR(36) NOT NULL,
 draft_revision INT NOT NULL, state VARCHAR(30) NOT NULL, attempt INT NOT NULL DEFAULT 0,
 request JSON NOT NULL, result JSON NULL, error VARCHAR(300) NULL,
 deadline_ms BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY studio_job_owner(owner_id), KEY studio_job_state(state,deadline_ms)
);
CREATE TABLE IF NOT EXISTS studio_job_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, job_id CHAR(36) NOT NULL,
 state VARCHAR(30) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY studio_event_job(job_id)
);
CREATE TABLE IF NOT EXISTS studio_settings (
 owner_id BIGINT UNSIGNED PRIMARY KEY, payload JSON NOT NULL
);
CREATE TABLE IF NOT EXISTS studio_post_history (
 id CHAR(36) PRIMARY KEY, owner_id BIGINT UNSIGNED NOT NULL, draft_id CHAR(36) NOT NULL,
 instagram_media_id VARCHAR(100) NOT NULL, photo_ids JSON NOT NULL, published_at DATETIME NOT NULL,
 UNIQUE KEY studio_published_media(instagram_media_id)
);
