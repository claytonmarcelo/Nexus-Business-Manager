CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('maintenance_active', 'false'),
  ('maintenance_message', 'Sistema em manutenção. Voltaremos em breve!'),
  ('maintenance_return_time', NULL),
  ('maintenance_allowed_ips', '[]'),
  ('maintenance_background', ''),
  ('preloader_active', 'true'),
  ('preloader_admin', 'true'),
  ('preloader_site', 'true')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS supervised_action_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  details JSON,
  requested_by INT NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  role ENUM('admin', 'manager', 'operator', 'viewer') NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  UNIQUE KEY unique_module_role (module_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modules (name, label, description, icon) VALUES
  ('dashboard', 'Dashboard', 'Painel principal com KPIs e gráficos', 'ChartBarIcon'),
  ('clients', 'Clientes', 'Gestão de clientes', 'UserGroupIcon'),
  ('suppliers', 'Fornecedores', 'Gestão de fornecedores', 'TruckIcon'),
  ('products', 'Produtos', 'Catálogo de produtos', 'CubeIcon'),
  ('stock', 'Estoque', 'Controle de estoque', 'ClipboardDocumentListIcon'),
  ('purchases', 'Compras', 'Gestão de compras', 'ShoppingCartIcon'),
  ('sales', 'Vendas', 'Gestão de vendas', 'CurrencyDollarIcon'),
  ('financial', 'Financeiro', 'Controle financeiro', 'CreditCardIcon'),
  ('crm', 'CRM', 'Gestão de relacionamento com clientes', 'BuildingOfficeIcon'),
  ('appointments', 'Agenda', 'Agendamento de compromissos', 'CalendarDaysIcon'),
  ('reports', 'Relatórios', 'Relatórios e exportações', 'ChartPieIcon'),
  ('notifications', 'Notificações', 'Central de notificações', 'BellIcon'),
  ('audit', 'Auditoria', 'Logs de auditoria', 'ShieldCheckIcon'),
  ('users', 'Usuários', 'Gestão de usuários', 'UsersIcon'),
  ('companies', 'Empresas', 'Configurações da empresa', 'Cog6ToothIcon'),
  ('suggestions', 'Sugestões', 'Central de sugestões', 'LightBulbIcon'),
  ('nexus_ai', 'Nexus AI', 'Assistente com inteligência artificial', 'LightBulbIcon'),
  ('backup', 'Backup', 'Backup e restauração', 'ArrowPathIcon'),
  ('import', 'Importação', 'Importação de dados', 'DocumentArrowUpIcon'),
  ('logs', 'Logs', 'Registros do sistema', 'ClipboardDocumentCheckIcon'),
  ('settings', 'Configurações', 'Configurações do sistema', 'Cog6ToothIcon'),
  ('subscription', 'Assinatura', 'Planos e assinaturas', 'CreditCardIcon')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO module_permissions (module_id, role, can_view, can_create, can_edit, can_delete)
SELECT m.id, 'admin', TRUE, TRUE, TRUE, TRUE FROM modules m
WHERE NOT EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.module_id = m.id AND mp.role = 'admin');

INSERT INTO module_permissions (module_id, role, can_view, can_create, can_edit, can_delete)
SELECT m.id, 'manager', TRUE, TRUE, TRUE, FALSE FROM modules m
WHERE NOT EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.module_id = m.id AND mp.role = 'manager');

INSERT INTO module_permissions (module_id, role, can_view, can_create, can_edit, can_delete)
SELECT m.id, 'operator', TRUE, TRUE, FALSE, FALSE FROM modules m
WHERE NOT EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.module_id = m.id AND mp.role = 'operator');

INSERT INTO module_permissions (module_id, role, can_view, can_create, can_edit, can_delete)
SELECT m.id, 'viewer', TRUE, FALSE, FALSE, FALSE FROM modules m
WHERE NOT EXISTS (SELECT 1 FROM module_permissions mp WHERE mp.module_id = m.id AND mp.role = 'viewer');
