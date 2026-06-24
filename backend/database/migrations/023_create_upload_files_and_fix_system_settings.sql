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

-- Adicionar todas as colunas em uma única alteração
ALTER TABLE system_settings
  ADD COLUMN company_id INT NULL AFTER id,
  ADD INDEX idx_system_settings_company_id (company_id),
  ADD COLUMN system_name VARCHAR(150) NULL AFTER company_id,
  ADD COLUMN logo_url VARCHAR(500) NULL AFTER system_name,
  ADD COLUMN favicon_url VARCHAR(500) NULL AFTER logo_url,
  ADD COLUMN primary_color VARCHAR(50) NULL AFTER favicon_url,
  ADD COLUMN theme_mode VARCHAR(50) NULL AFTER primary_color;
