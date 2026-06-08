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
    multipleStatements: false,
  });

  const dbName = process.env.DB_NAME || 'nexus_business_manager';

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${dbName}\``);

  await connection.query(
    `CREATE TABLE IF NOT EXISTS _migrations_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [rows] = await connection.query<any[]>('SELECT filename FROM _migrations_log');
  const applied = new Set(rows.map((r: any) => r.filename));

  const migrationsDir = path.resolve(__dirname, '..', '..', '..', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    if (applied.has(file)) {
      console.log(`Pulando: ${file} (ja executada)`);
      continue;
    }

    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = content
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))
      .map((s) => s.endsWith(';') ? s : s + ';');

    console.log(`Executando: ${file} (${statements.length} comando(s))`);

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (err: any) {
        if (err.code === 'ER_DUP_KEYNAME' || err.message?.includes('already exists')) {
          console.log(`  Aviso: constraint/index ja existe, ignorando`);
          continue;
        }
        if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column')) {
          console.log(`  Aviso: coluna ja existe, ignorando`);
          continue;
        }
        throw err;
      }
    }

    await connection.query('INSERT INTO _migrations_log (filename) VALUES (?)', [file]);
    console.log(`Concluida: ${file}`);
  }

  await connection.end();
  console.log('Todas as migracoes foram executadas com sucesso!');
}

migrate().catch((err) => {
  console.error('Erro ao executar migracoes:', err);
  process.exit(1);
});
