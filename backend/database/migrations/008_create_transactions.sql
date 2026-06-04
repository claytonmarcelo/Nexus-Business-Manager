CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('revenue', 'expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
