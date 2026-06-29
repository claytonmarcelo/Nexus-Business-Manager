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

  const [cols] = await conn.query('SHOW COLUMNS FROM crm_leads WHERE Field = "created_by"');
  console.log('created_by column:', cols[0]);

  const [usersCols] = await conn.query('SHOW COLUMNS FROM users WHERE Field = "id"');
  console.log('users.id column:', usersCols[0]);

  await conn.end();
}

check().catch(console.error);