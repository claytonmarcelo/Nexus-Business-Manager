import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schema';
import { RowDataPacket } from 'mysql2';

interface CompanyRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  active: number;
  created_at: string;
}

export async function listCompanies(): Promise<CompanyRow[]> {
  return query<CompanyRow[]>('SELECT * FROM companies WHERE active = TRUE ORDER BY name');
}

export async function getCompanyById(id: number): Promise<CompanyRow> {
  const companies = await query<CompanyRow[]>('SELECT * FROM companies WHERE id = ?', [id]);
  if (companies.length === 0) throw new AppError('Empresa nao encontrada', 404);
  return companies[0];
}

export async function createCompany(data: CreateCompanyInput): Promise<CompanyRow> {
  const existing = await query<CompanyRow[]>('SELECT id FROM companies WHERE slug = ?', [data.slug]);
  if (existing.length > 0) throw new AppError('Slug ja utilizado', 409);

  const result = await execute(
    'INSERT INTO companies (name, slug, document, phone, email) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.slug, data.document || null, data.phone || null, data.email || null]
  );
  return getCompanyById(result.insertId);
}

export async function updateCompany(id: number, data: UpdateCompanyInput): Promise<CompanyRow> {
  await getCompanyById(id);

  if (data.slug) {
    const existing = await query<CompanyRow[]>('SELECT id FROM companies WHERE slug = ? AND id != ?', [data.slug, id]);
    if (existing.length > 0) throw new AppError('Slug ja utilizado', 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
  if (data.document !== undefined) { fields.push('document = ?'); values.push(data.document); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
  }
  return getCompanyById(id);
}
