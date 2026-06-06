CREATE TABLE IF NOT EXISTS suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('general', 'improvement', 'feature', 'complaint', 'praise') NOT NULL DEFAULT 'general',
  status ENUM('pending', 'under_review', 'approved', 'rejected', 'implemented') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  is_offensive TINYINT(1) NOT NULL DEFAULT 0,
  offensive_reason VARCHAR(255) NULL,
  accepted_terms TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_status (status),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
