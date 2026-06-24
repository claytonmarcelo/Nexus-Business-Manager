-- Índices de performance para tabelas principais

-- Índices para sales
CREATE INDEX IF NOT EXISTS idx_sales_company_id_status ON sales(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);

-- Índices para purchases
CREATE INDEX IF NOT EXISTS idx_purchases_company_id_status ON purchases(company_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_company_id_active ON products(company_id, active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Índices para clients
CREATE INDEX IF NOT EXISTS idx_clients_company_id_active ON clients(company_id, active);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id_active ON suppliers(company_id, active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(company_name);

-- Índices para stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_company_id_active ON users(company_id, active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Índices para crm_leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_id ON crm_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(`read`);
