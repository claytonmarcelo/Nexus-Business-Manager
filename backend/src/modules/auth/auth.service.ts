import bcrypt from 'bcryptjs';
import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { LoginInput, RegisterInput } from './auth.schema';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  company_id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar_url: string | null;
  theme_preference: string | null;
}

export async function authenticateUser(data: LoginInput) {
  const users = await query<(UserRow & RowDataPacket)[]>(
    'SELECT id, company_id, name, email, password, role, avatar_url, theme_preference FROM users WHERE email = ? AND active = TRUE LIMIT 1',
    [data.email]
  );

  const user = users[0];
  if (!user) {
    throw new AppError('Email ou senha incorretos', 401);
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password);

  if (!passwordMatch) {
    throw new AppError('Email ou senha incorretos', 401);
  }

  return {
    id: user.id,
    companyId: user.company_id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url,
    themePreference: user.theme_preference,
  };
}

export async function registerUser(data: RegisterInput) {
  const existing = await query<(UserRow & RowDataPacket)[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [data.email]);
  if (existing.length > 0) {
    throw new AppError('Este email ja esta cadastrado', 409);
  }

  const companyResult = await execute(
    'INSERT INTO companies (name, slug, email) VALUES (?, ?, ?)',
    [data.name, data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), data.email]
  );

  const companyId = companyResult.insertId;

  const passwordHash = await bcrypt.hash(data.password, 10);

  await execute(
    'INSERT INTO users (company_id, name, email, password, role, active) VALUES (?, ?, ?, ?, ?, TRUE)',
    [companyId, data.name, data.email, passwordHash, 'viewer']
  );

  const updates: string[] = [];
  const updateVals: unknown[] = [];
  if (data.username) { updates.push('username = ?'); updateVals.push(data.username); }
  if (data.phone) { updates.push('phone = ?'); updateVals.push(data.phone); }
  if (updates.length > 0) {
    updateVals.push(data.email);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE email = ?`, updateVals);
  }

  const newUser = await query<(UserRow & RowDataPacket)[]>(
    'SELECT id, company_id, name, email, role, avatar_url, theme_preference FROM users WHERE email = ? LIMIT 1',
    [data.email]
  );

  if (!newUser[0]) throw new AppError('Erro ao criar usuario', 500);
  return {
    id: newUser[0].id,
    companyId: newUser[0].company_id,
    name: newUser[0].name,
    email: newUser[0].email,
    role: newUser[0].role,
    avatarUrl: newUser[0].avatar_url,
    themePreference: newUser[0].theme_preference,
  };
}
