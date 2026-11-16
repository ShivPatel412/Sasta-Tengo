CREATE TABLE IF NOT EXISTS next_lead_conversations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  resource ENUM('contacts','appointments') NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  phone VARCHAR(16) NOT NULL,
  consent_version VARCHAR(64) NOT NULL,
  consented_at DATETIME NOT NULL,
  state ENUM('queued','dispatching','accepted','uncertain','collecting','appointment_requested','human_takeover','opted_out','error') NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  preferred_call_at DATETIME NULL,
  timezone VARCHAR(80) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY lead_source (resource,record_id),
  INDEX dispatch_queue (state,created_at)
) ENGINE=InnoDB;
