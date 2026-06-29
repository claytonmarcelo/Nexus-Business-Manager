import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'nexus_business_manager'
  });

  const tables = ['audit_logs', 'crm_leads', 'suggestions'];
  
  for (const table of tables) {
    const [fkRows] = await conn.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'nexus_business_manager' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME = ?
    `, [table]);
    console.log(`${table} foreign keys:`, fkRows);
  }
  
  await conn.end();
}

check().catch(console.error);