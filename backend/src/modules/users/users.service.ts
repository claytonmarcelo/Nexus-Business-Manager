import bcrypt from 'bcryptjs';
import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateUserInput, UpdateUserInput } from './users.schema';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export async function listUsers(companyId: number): Promise<UserRow[]> {
  return query<UserRow[]>(
    'SELECT id, name, email, role, active, company_id, created_at, updated_at FROM users WHERE company_id = ? ORDER BY created_at DESC',
    [companyId]
  );
}

export async function getUserById(id: number): Promise<UserRow> {
  const users = await query<UserRow[]>(
    'SELECT id, name, email, role, active, company_id, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  if (users.length === 0) throw new AppError('Usuario nao encontrado', 404);
  return users[0];
}

export async function createUser(data: CreateUserInput, companyId: number): Promise<UserRow> {
  const existing = await query<UserRow[]>('SELECT id FROM users WHERE email = ?', [data.email]);
  if (existing.length > 0) throw new AppError('Email ja cadastrado', 409);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await execute(
    'INSERT INTO users (name, email, password, role, company_id) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.email, hashedPassword, data.role, companyId]
  );

  return getUserById(result.insertId);
}

export async function updateUser(id: number, data: UpdateUserInput): Promise<UserRow> {
  await getUserById(id);

  if (data.email) {
    const existing = await query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [data.email, id]
    );
    if (existing.length > 0) throw new AppError('Email ja cadastrado', 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name) { fields.push('name = ?'); values.push(data.name); }
  if (data.email) { fields.push('email = ?'); values.push(data.email); }
  if (data.role) { fields.push('role = ?'); values.push(data.role); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }
  if (data.password) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    fields.push('password = ?');
    values.push(hashedPassword);
  }

  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return getUserById(id);
}

export async function deleteUser(id: number): Promise<void> {
  await getUserById(id);
  await execute('UPDATE users SET active = FALSE WHERE id = ?', [id]);
}
