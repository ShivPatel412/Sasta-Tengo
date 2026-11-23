-- Apply to staging first. Not run by build/start; production application needs separate approval.
CREATE TABLE IF NOT EXISTS next_rsvps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY rsvps_request_unique (request_id)
) ENGINE=InnoDB;
