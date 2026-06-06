import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateSuggestionInput, UpdateSuggestionInput } from './suggestions.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface SuggestionRow extends RowDataPacket {
  id: number;
  company_id: number;
  user_id: number;
  user_name: string;
  title: string;
  description: string;
  category: string;
  status: string;
  admin_notes: string | null;
  is_offensive: number;
  offensive_reason: string | null;
  accepted_terms: number;
  created_at: string;
  updated_at: string;
}

const OFFENSIVE_WORDS = [
  'puta', 'caralho', 'foda', 'filho da puta', 'merda', 'bosta',
  'cusão', 'viado', 'vadia', 'otário', 'arrombado', 'desgraça',
  'imbecil', 'idiota', 'babaca', 'escroto', 'fdp', 'pqp', 'vs fd',
];

function checkOffensiveContent(text: string): { isOffensive: boolean; reason: string | null } {
  const lower = text.toLowerCase();
  for (const word of OFFENSIVE_WORDS) {
    if (lower.includes(word)) {
      return { isOffensive: true, reason: `Conteudo ofensivo detectado: "${word}"` };
    }
  }
  return { isOffensive: false, reason: null };
}

export async function listSuggestions(companyId: number, params: PaginationParams & { status?: string; category?: string }): Promise<PaginatedResult<SuggestionRow>> {
  const where = ['company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.status) {
    where.push('status = ?');
    values.push(params.status);
  }

  if (params.category) {
    where.push('category = ?');
    values.push(params.category);
  }

  if (params.search) {
    where.push('(title LIKE ? OR description LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM suggestions WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<SuggestionRow[]>(
    `SELECT * FROM suggestions WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getSuggestionById(id: number, companyId: number): Promise<SuggestionRow> {
  const suggestions = await query<SuggestionRow[]>(
    'SELECT * FROM suggestions WHERE id = ? AND company_id = ?', [id, companyId]
  );
  if (suggestions.length === 0) throw new AppError('Sugestao nao encontrada', 404);
  return suggestions[0];
}

export async function createSuggestion(data: CreateSuggestionInput, userId: number, userName: string, companyId: number): Promise<{ suggestion: SuggestionRow; blocked: boolean }> {
  const titleCheck = checkOffensiveContent(data.title);
  const descCheck = checkOffensiveContent(data.description);
  const isOffensive = titleCheck.isOffensive || descCheck.isOffensive;
  const offensiveReason = titleCheck.reason || descCheck.reason;

  const result = await execute(
    `INSERT INTO suggestions (company_id, user_id, user_name, title, description, category, accepted_terms, is_offensive, offensive_reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, userId, userName, data.title, data.description, data.category, data.accepted_terms ? 1 : 0, isOffensive ? 1 : 0, offensiveReason, isOffensive ? 'rejected' : 'pending']
  );

  const suggestion = await getSuggestionById(result.insertId, companyId);
  return { suggestion, blocked: isOffensive };
}

export async function updateSuggestion(id: number, data: UpdateSuggestionInput, companyId: number): Promise<SuggestionRow> {
  await getSuggestionById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.admin_notes !== undefined) { fields.push('admin_notes = ?'); values.push(data.admin_notes); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE suggestions SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getSuggestionById(id, companyId);
}

export async function deleteSuggestion(id: number, companyId: number): Promise<void> {
  await getSuggestionById(id, companyId);
  await execute('DELETE FROM suggestions WHERE id = ? AND company_id = ?', [id, companyId]);
}

interface StatusCountRow extends RowDataPacket {
  status: string;
  count: number;
}

export async function countByStatus(companyId: number): Promise<StatusCountRow[]> {
  return query<StatusCountRow[]>(
    'SELECT status, COUNT(*) as count FROM suggestions WHERE company_id = ? GROUP BY status',
    [companyId]
  );
}
