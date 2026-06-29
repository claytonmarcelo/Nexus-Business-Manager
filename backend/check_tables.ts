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

  const tables = ['crm_leads', 'suggestions'];
  
  for (const table of tables) {
    const [rows] = await conn.query(`SHOW CREATE TABLE ${table}`);
    console.log(`\n=== ${table} ===`);
    console.log(rows[0]['Create Table']);
  }
  
  await conn.end();
}

check().catch(console.error);