import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateSupplierInput, UpdateSupplierInput } from './suppliers.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface SupplierRow extends RowDataPacket {
  id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export async function listSuppliers(companyId: number, params: PaginationParams): Promise<PaginatedResult<SupplierRow>> {
  const where = ['active = TRUE', 'company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.search) {
    where.push('(company_name LIKE ? OR phone LIKE ? OR email LIKE ? OR contact_name LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM suppliers WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<SupplierRow[]>(
    `SELECT id, company_name, phone, email, contact_name, active, created_at, updated_at FROM suppliers WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getSupplierById(id: number, companyId: number): Promise<SupplierRow> {
  const suppliers = await query<SupplierRow[]>(
    'SELECT id, company_name, phone, email, contact_name, active, created_at, updated_at FROM suppliers WHERE id = ? AND company_id = ?', [id, companyId]
  );
  if (suppliers.length === 0) throw new AppError('Fornecedor nao encontrado', 404);
  return suppliers[0];
}

export async function createSupplier(data: CreateSupplierInput, userId: number, companyId: number): Promise<SupplierRow> {
  const result = await execute(
    'INSERT INTO suppliers (company_name, phone, email, contact_name, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)',
    [data.company_name, data.phone || null, data.email || null, data.contact_name || null, userId, companyId]
  );
  return getSupplierById(result.insertId, companyId);
}

export async function updateSupplier(id: number, data: UpdateSupplierInput, companyId: number): Promise<SupplierRow> {
  await getSupplierById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.company_name !== undefined) { fields.push('company_name = ?'); values.push(data.company_name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.contact_name !== undefined) { fields.push('contact_name = ?'); values.push(data.contact_name); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getSupplierById(id, companyId);
}

export async function deleteSupplier(id: number, companyId: number): Promise<void> {
  await getSupplierById(id, companyId);
  await execute('UPDATE suppliers SET active = FALSE WHERE id = ? AND company_id = ?', [id, companyId]);
}
