USE nexus_business_manager;

INSERT INTO companies (name, document) VALUES
  ('Empresa Exemplo Ltda', '00.000.000/0001-00');

-- senha: admin123 (bcrypt hash)
INSERT INTO users (company_id, name, email, password_hash, role) VALUES
  (1, 'Administrador', 'admin@nexus.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfJEavmP0MlmFXZMUq4nJ3J6zZ0q', 'admin');
