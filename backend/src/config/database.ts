import mysql from "mysql2/promise";
import { env } from "./env";

let pool: mysql.Pool;

export async function getPool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}
