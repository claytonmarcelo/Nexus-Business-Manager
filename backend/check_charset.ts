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

  const [crmTable] = await conn.query('SHOW CREATE TABLE crm_leads');
  console.log('crm_leads charset:', crmTable[0]['Create Table']);

  const [usersTable] = await conn.query('SHOW CREATE TABLE users');
  console.log('users charset:', usersTable[0]['Create Table']);

  await conn.end();
}

check().catch(console.error);