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

  const [rows] = await conn.query('SHOW CREATE TABLE system_settings');
  console.log(rows[0]['Create Table']);
  
  const [cols] = await conn.query('SHOW COLUMNS FROM system_settings');
  console.log('\nColumns:', cols.map(c => c.Field).join(', '));
  
  await conn.end();
}

check().catch(console.error);