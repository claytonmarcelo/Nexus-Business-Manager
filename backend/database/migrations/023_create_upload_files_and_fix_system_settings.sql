-- Tabela para rastrear arquivos de upload
CREATE TABLE IF NOT EXISTS upload_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NULL,
  user_id INT NULL,
  original_name VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_upload_files_company_id (company_id),
  INDEX idx_upload_files_user_id (user_id),
  INDEX idx_upload_files_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela system_settings tem a estrutura correta
-- Se não tiver, adicionar as colunas necessárias
SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'company_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN company_id INT NULL AFTER id, ADD INDEX idx_system_settings_company_id (company_id)',
  'SELECT ''Column company_id already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'system_name'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN system_name VARCHAR(150) NULL AFTER company_id',
  'SELECT ''Column system_name already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'logo_url'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN logo_url VARCHAR(500) NULL AFTER system_name',
  'SELECT ''Column logo_url already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'favicon_url'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN favicon_url VARCHAR(500) NULL AFTER logo_url',
  'SELECT ''Column favicon_url already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'primary_color'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN primary_color VARCHAR(50) NULL AFTER favicon_url',
  'SELECT ''Column primary_color already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = 'system_settings'
  AND column_name = 'theme_mode'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE system_settings ADD COLUMN theme_mode VARCHAR(50) NULL AFTER primary_color',
  'SELECT ''Column theme_mode already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
