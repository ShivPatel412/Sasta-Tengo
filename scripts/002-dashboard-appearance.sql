-- Additive dashboard appearance preferences. Existing portfolio data is not changed.
CREATE TABLE IF NOT EXISTS next_dashboard_preferences (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  primary_color CHAR(7) CHARACTER SET ascii NOT NULL,
  secondary_color CHAR(7) CHARACTER SET ascii NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;
