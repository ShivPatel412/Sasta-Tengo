-- Additive: no existing portfolio, lead, account or n8n records are changed.
CREATE TABLE IF NOT EXISTS next_workspace_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  project_name VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
  priority ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  due_date DATE NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX (owner_id,status,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS next_workflow_runs (
  request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  workflow_id VARCHAR(128) NOT NULL,
  state ENUM('dispatching','accepted','rejected','uncertain') NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (owner_id,created_at)
) ENGINE=InnoDB;
