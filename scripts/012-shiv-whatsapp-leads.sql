-- SHIV OS WhatsApp leads, separate from website form consent records.
-- Apply in staging first, then production using the existing migration process.
CREATE TABLE IF NOT EXISTS shiv_whatsapp_message_claims (
  message_id VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  sender VARCHAR(20) NOT NULL,
  claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_claim_sender_time (sender,claimed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shiv_whatsapp_leads (
  sender VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '',
  service VARCHAR(255) NOT NULL DEFAULT '',
  budget VARCHAR(255) NOT NULL DEFAULT '',
  timeline VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'new',
  source VARCHAR(40) NOT NULL DEFAULT 'whatsapp',
  summary TEXT,
  booking_request TEXT,
  handoff_requested TINYINT(1) NOT NULL DEFAULT 0,
  follow_up_at DATETIME NULL,
  last_message_id VARCHAR(191) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_leads_status (status),
  KEY idx_leads_followup (follow_up_at,status),
  KEY idx_leads_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
