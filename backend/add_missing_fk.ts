import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'nexus_business_manager'
  });

  // Add missing company_id FK to suggestions
  console.log('Adding fk_suggestions_company to suggestions...');
  await conn.query(`
    ALTER TABLE suggestions
      ADD CONSTRAINT fk_suggestions_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  `);
  console.log('Added fk_suggestions_company');

  // Add created_by FK to crm_leads
  console.log('Adding fk_crm_leads_created_by to crm_leads...');
  await conn.query(`
    ALTER TABLE crm_leads
      ADD CONSTRAINT fk_crm_leads_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  `);
  console.log('Added fk_crm_leads_created_by');

  // Verify
  const [fkRows] = await conn.query(`
    SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'nexus_business_manager' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
    AND TABLE_NAME IN ('crm_leads', 'suggestions')
  `);
  console.log('\nAll FKs:', fkRows);

  await conn.end();
  console.log('\n✅ All missing FKs added!');
}

fix().catch(console.error);