import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateClientInput, UpdateClientInput } from './clients.schema';
import { RowDataPacket } from 'mysql2';

interface ClientRow extends RowDataPacket {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export async function listClients(): Promise<ClientRow[]> {
  return query<ClientRow[]>(
    'SELECT id, name, phone, email, document, address, notes, created_by, active, created_at, updated_at FROM clients WHERE active = TRUE ORDER BY created_at DESC'
  );
}

export async function getClientById(id: number): Promise<ClientRow> {
  const clients = await query<ClientRow[]>(
    'SELECT id, name, phone, email, document, address, notes, created_by, active, created_at, updated_at FROM clients WHERE id = ?',
    [id]
  );
  if (clients.length === 0) throw new AppError('Cliente nao encontrado', 404);
  return clients[0];
}

export async function createClient(data: CreateClientInput, userId: number): Promise<ClientRow> {
  const result = await execute(
    'INSERT INTO clients (name, phone, email, document, address, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.phone || null, data.email || null, data.document || null, data.address || null, data.notes || null, userId]
  );
  return getClientById(result.insertId);
}

export async function updateClient(id: number, data: UpdateClientInput): Promise<ClientRow> {
  await getClientById(id);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.document !== undefined) { fields.push('document = ?'); values.push(data.document); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return getClientById(id);
}

export async function deleteClient(id: number): Promise<void> {
  await getClientById(id);
  await execute('UPDATE clients SET active = FALSE WHERE id = ?', [id]);
}
