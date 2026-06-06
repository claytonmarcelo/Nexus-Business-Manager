import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateLeadInput, UpdateLeadInput } from './crm.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface LeadRow extends RowDataPacket {
  id: number;
  company_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  value: number;
  notes: string | null;
  next_follow_up: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export async function listLeads(companyId: number, params: PaginationParams & { status?: string }): Promise<PaginatedResult<LeadRow>> {
  const where = ['company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.status) {
    where.push('status = ?');
    values.push(params.status);
  }

  if (params.search) {
    where.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM crm_leads WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<LeadRow[]>(
    `SELECT * FROM crm_leads WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getLeadById(id: number, companyId: number): Promise<LeadRow> {
  const leads = await query<LeadRow[]>('SELECT * FROM crm_leads WHERE id = ? AND company_id = ?', [id, companyId]);
  if (leads.length === 0) throw new AppError('Lead nao encontrado', 404);
  return leads[0];
}

export async function createLead(data: CreateLeadInput, userId: number, companyId: number): Promise<LeadRow> {
  const result = await execute(
    `INSERT INTO crm_leads (company_id, name, email, phone, company, status, value, notes, next_follow_up, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, data.name, data.email || null, data.phone || null, data.company || null,
     data.status, data.value, data.notes || null, data.next_follow_up || null, userId]
  );
  return getLeadById(result.insertId, companyId);
}

export async function updateLead(id: number, data: UpdateLeadInput, companyId: number): Promise<LeadRow> {
  await getLeadById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.company !== undefined) { fields.push('company = ?'); values.push(data.company); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.next_follow_up !== undefined) { fields.push('next_follow_up = ?'); values.push(data.next_follow_up); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE crm_leads SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getLeadById(id, companyId);
}

export async function deleteLead(id: number, companyId: number): Promise<void> {
  await getLeadById(id, companyId);
  await execute('DELETE FROM crm_leads WHERE id = ? AND company_id = ?', [id, companyId]);
}

export async function countByStatus(companyId: number): Promise<{ status: string; count: number }[]> {
  return query<any[]>('SELECT status, COUNT(*) as count FROM crm_leads WHERE company_id = ? GROUP BY status', [companyId]);
}
