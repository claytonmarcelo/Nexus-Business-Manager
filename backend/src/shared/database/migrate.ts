import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function migrate(): Promise<void> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });

  const dbName = process.env.DB_NAME || 'nexus_business_manager';

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${dbName}\``);

  const migrationsDir = path.resolve(__dirname, '..', '..', '..', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Executando migracao: ${file}`);
    await connection.query(sql);
    console.log(`Migracao concluida: ${file}`);
  }

  await connection.end();
  console.log('Todas as migracoes foram executadas com sucesso!');
}

migrate().catch((err) => {
  console.error('Erro ao executar migracoes:', err);
  process.exit(1);
});
