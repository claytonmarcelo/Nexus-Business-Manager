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

  // The issue is created_by is NOT NULL but FK uses ON DELETE SET NULL
  // Need to make created_by nullable first
  console.log('Making created_by nullable...');
  await conn.query(`ALTER TABLE crm_leads MODIFY created_by INT(11) NULL`);
  console.log('Column made nullable');

  console.log('Adding FK fk_crm_leads_created_by...');
  await conn.query(`
    ALTER TABLE crm_leads
      ADD CONSTRAINT fk_crm_leads_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  `);
  console.log('FK added successfully');

  await conn.end();
  console.log('✅ Done!');
}

fix().catch(console.error);