-- Review and run on the RESTORED STAGING database first.
-- Additive only: no existing Laravel table, record, password or ID is changed.
CREATE TABLE IF NOT EXISTS next_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX (expires_at), INDEX (user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS next_rate_limits (
  bucket CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  hits INT UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  INDEX (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS next_mail_outbox (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(20) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  locked_until DATETIME NULL,
  admin_sent_at DATETIME NULL,
  sent_at DATETIME NULL,
  INDEX (sent_at,attempts)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS next_booking_mutex (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO next_booking_mutex (id) VALUES (1);
