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

  // Check for orphaned created_by values
  const [orphans] = await conn.query(`
    SELECT cl.created_by, COUNT(*) as cnt
    FROM crm_leads cl
    LEFT JOIN users u ON cl.created_by = u.id
    WHERE u.id IS NULL
    GROUP BY cl.created_by
  `);
  console.log('Orphaned created_by values:', orphans);

  await conn.end();
}

check().catch(console.error);