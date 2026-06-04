import { query } from "./database/connection";
import { RowDataPacket } from "mysql2/promise";

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await query<RowDataPacket[]>("SELECT 1 AS health_check");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
