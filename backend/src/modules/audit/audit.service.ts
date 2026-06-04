import { execute, query } from '../../shared/database/connection';
import { RowDataPacket } from 'mysql2';

interface AuditLogRow extends RowDataPacket {
  id: number;
  company_id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function log(
  userId: number,
  userName: string,
  action: string,
  entityType: string,
  entityId: number | null,
  oldValues: unknown | null,
  newValues: unknown | null,
  ipAddress: string | null,
  companyId: number
): Promise<void> {
  await execute(
    `INSERT INTO audit_logs (company_id, user_id, user_name, action, entity_type, entity_id, old_values, new_values, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      userId,
      userName,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
    ]
  );
}

export async function listLogs(companyId: number): Promise<AuditLogRow[]> {
  return query<AuditLogRow[]>(
    'SELECT * FROM audit_logs WHERE company_id = ? ORDER BY created_at DESC LIMIT 200',
    [companyId]
  );
}

export async function listLogsByEntity(companyId: number, entityType: string, entityId: number): Promise<AuditLogRow[]> {
  return query<AuditLogRow[]>(
    'SELECT * FROM audit_logs WHERE company_id = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
    [companyId, entityType, entityId]
  );
}
