import bcrypt from 'bcryptjs';
import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateUserInput, UpdateUserInput } from './users.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  theme_preference?: string;
}

export async function listUsers(companyId: number, params: PaginationParams): Promise<PaginatedResult<UserRow>> {
  const where = ['company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.search) {
    where.push('(name LIKE ? OR email LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM users WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<UserRow[]>(
    `SELECT id, name, email, role, active, company_id, created_at, updated_at, avatar_url, theme_preference FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getUserById(id: number): Promise<UserRow> {
  const users = await query<UserRow[]>(
    'SELECT id, name, email, role, active, company_id, created_at, updated_at, avatar_url, theme_preference FROM users WHERE id = ?',
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
  const currentUser = await getUserById(id);
  const companyId = currentUser.company_id;

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
  if (data.role) {
    if (currentUser.email === 'marcelolimadez@gmail.com' && data.role !== 'admin') {
      throw new AppError('Este usuario administrador e reservado para testes do sistema e nao pode ser rebaixado.', 403);
    }
    // Prevent non-admins from promoting users to admin role
    if (data.role === 'admin') {
      throw new AppError('Apenas administradores podem promover usuarios ao cargo de admin.', 403);
    }
    fields.push('role = ?'); values.push(data.role);
  }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }
  if (data.avatarUrl) { fields.push('avatar_url = ?'); values.push(data.avatarUrl); }
  if (data.themePreference) { fields.push('theme_preference = ?'); values.push(data.themePreference); }
  if (data.password && data.password.length >= 8) {
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

export async function updateTheme(userId: number, theme: string): Promise<void> {
  await execute('UPDATE users SET theme_preference = ? WHERE id = ?', [theme, userId]);
}

export async function updateAvatar(userId: number, avatarUrl: string): Promise<void> {
  await execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
}

export async function deleteUser(id: number): Promise<void> {
  const user = await getUserById(id);
  if (user.email === 'marcelolimadez@gmail.com') {
    throw new AppError('Este usuario administrador e reservado para testes do sistema e nao pode ser removido.', 403);
  }
  await execute('UPDATE users SET active = FALSE WHERE id = ?', [id]);
}
