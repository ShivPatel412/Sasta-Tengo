-- Additive only. Apply once to the existing portfolio database before enabling automation.
CREATE TABLE IF NOT EXISTS project_automation_drafts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  repository VARCHAR(150) NOT NULL,
  revision CHAR(64) NOT NULL,
  payload JSON NOT NULL,
  provenance JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  project_id BIGINT UNSIGNED NULL,
  project_updated_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY automation_repository (repository)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
