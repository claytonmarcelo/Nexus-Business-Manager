import { query, execute, getPool } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

interface BackupRow extends RowDataPacket {
  id: number;
  filename: string;
  filepath: string;
  size: string | null;
  created_by: number;
  company_id: number;
  created_at: string;
}

const STORAGE_DIR = path.resolve(__dirname, '..', '..', '..', 'storage', 'backups');

export async function listBackups(companyId: number): Promise<BackupRow[]> {
  return query<BackupRow[]>(
    'SELECT * FROM backups WHERE company_id = ? ORDER BY created_at DESC',
    [companyId]
  );
}

export async function createBackup(userId: number, companyId: number): Promise<BackupRow> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [dbNameResult] = await connection.query<RowDataPacket[]>('SELECT DATABASE() as db');
    const dbName = dbNameResult[0].db;

    const tablesWithCompanyId = await connection.query<RowDataPacket[]>(
      `SELECT DISTINCT TABLE_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'company_id' AND TABLE_NAME != 'backups'`,
      [dbName]
    );

    const tableNames = tablesWithCompanyId[0].map((r: any) => r.TABLE_NAME);

    let sqlContent = `-- Nexus Business Manager - Backup\n`;
    sqlContent += `-- Generated at: ${new Date().toISOString()}\n`;
    sqlContent += `-- Company ID: ${companyId}\n\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const tableName of tableNames) {
      const [createResult] = await connection.query<RowDataPacket[]>(
        `SHOW CREATE TABLE \`${tableName}\``
      );
      const createStmt = createResult[0]['Create Table'];
      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlContent += `${createStmt};\n\n`;

      const rows = await connection.query<RowDataPacket[]>(
        `SELECT * FROM \`${tableName}\` WHERE company_id = ?`,
        [companyId]
      );

      if (rows[0].length > 0) {
        sqlContent += `INSERT INTO \`${tableName}\` VALUES\n`;
        const valueStrings = rows[0].map((row: any) => {
          const values = Object.values(row).map((val) => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${values.join(', ')})`;
        });
        sqlContent += valueStrings.join(',\n');
        sqlContent += ';\n\n';
      }
    }

    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `backup_company_${companyId}_${timestamp}.sql`;
    const filepath = path.join(STORAGE_DIR, filename);
    const size = Buffer.byteLength(sqlContent, 'utf-8').toString();

    fs.writeFileSync(filepath, sqlContent, 'utf-8');

    const result = await execute(
      'INSERT INTO backups (filename, filepath, size, created_by, company_id) VALUES (?, ?, ?, ?, ?)',
      [filename, filepath, size, userId, companyId]
    );

    return getBackupById(result.insertId, companyId);
  } finally {
    connection.release();
  }
}

export async function getBackupById(id: number, companyId: number): Promise<BackupRow> {
  const backups = await query<BackupRow[]>(
    'SELECT * FROM backups WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  if (backups.length === 0) throw new AppError('Backup nao encontrado', 404);
  return backups[0];
}

export function getBackupFilePath(backup: BackupRow): string {
  return backup.filepath;
}
