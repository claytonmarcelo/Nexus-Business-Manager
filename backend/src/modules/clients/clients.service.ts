import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateClientInput, UpdateClientInput } from './clients.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface ClientRow extends RowDataPacket {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export async function listClients(companyId: number, params: PaginationParams): Promise<PaginatedResult<ClientRow>> {
  const where = ['active = TRUE', 'company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.search) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR document LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM clients WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<ClientRow[]>(
    `SELECT id, name, phone, email, document, address, notes, status, created_by, active, created_at, updated_at FROM clients WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getClientById(id: number, companyId: number): Promise<ClientRow> {
  const clients = await query<ClientRow[]>(
    'SELECT id, name, phone, email, document, address, notes, status, created_by, active, created_at, updated_at FROM clients WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  if (clients.length === 0) throw new AppError('Cliente nao encontrado', 404);
  return clients[0];
}

export async function createClient(data: CreateClientInput, userId: number, companyId: number): Promise<ClientRow> {
  const result = await execute(
    'INSERT INTO clients (name, phone, email, document, address, notes, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.phone || null, data.email || null, data.document || null, data.address || null, data.notes || null, data.status || 'ATIVO', userId, companyId]
  );
  return getClientById(result.insertId, companyId);
}

export async function updateClient(id: number, data: UpdateClientInput, companyId: number): Promise<ClientRow> {
  await getClientById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.document !== undefined) { fields.push('document = ?'); values.push(data.document); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getClientById(id, companyId);
}

export async function deleteClient(id: number, companyId: number): Promise<void> {
  await getClientById(id, companyId);
  await execute('UPDATE clients SET active = FALSE WHERE id = ? AND company_id = ?', [id, companyId]);
}
