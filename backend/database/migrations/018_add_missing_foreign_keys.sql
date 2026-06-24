-- audit_logs: both FKs already exist (company_id, user_id)
-- crm_leads: company_id FK exists, missing created_by FK
ALTER TABLE crm_leads ADD CONSTRAINT fk_crm_leads_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
-- suggestions: missing both company_id and user_id FKs
ALTER TABLE suggestions ADD CONSTRAINT fk_suggestions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE suggestions ADD CONSTRAINT fk_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
