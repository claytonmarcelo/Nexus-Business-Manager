-- Nexus Business Manager - Migration 014: Indexes, Status e Performance
-- Adiciona indices para performance e colunas de status padronizadas

ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ATIVO' AFTER notes;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ATIVO' AFTER image;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ABERTA' AFTER total_value;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDENTE' AFTER total_value;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDENTE' AFTER value;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(80) AFTER description;

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id, active);
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(company_id, name, email, phone, document);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id, active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_company ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(company_id, type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(company_id, type);
CREATE INDEX IF NOT EXISTS idx_appointments_company ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(company_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(company_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id, active);
