import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateTransactionInput, UpdateTransactionInput } from './financial.schema';
import { RowDataPacket } from 'mysql2';

interface TransactionRow extends RowDataPacket {
  id: number;
  type: string;
  category: string;
  description: string;
  value: number;
  transaction_date: string;
  created_at: string;
}

interface CashFlowRow extends RowDataPacket {
  total_revenue: number;
  total_expense: number;
  balance: number;
}

export async function listTransactions(companyId: number): Promise<TransactionRow[]> {
  return query<TransactionRow[]>(
    'SELECT * FROM transactions WHERE company_id = ? ORDER BY transaction_date DESC, created_at DESC',
    [companyId]
  );
}

export async function getTransactionById(id: number, companyId: number): Promise<TransactionRow> {
  const transactions = await query<TransactionRow[]>(
    'SELECT * FROM transactions WHERE id = ? AND company_id = ?', [id, companyId]
  );
  if (transactions.length === 0) throw new AppError('Transacao nao encontrada', 404);
  return transactions[0];
}

export async function createTransaction(data: CreateTransactionInput, userId: number, companyId: number): Promise<TransactionRow> {
  const result = await execute(
    'INSERT INTO transactions (type, category, description, value, transaction_date, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.type, data.category, data.description, data.value, data.transaction_date, userId, companyId]
  );
  return getTransactionById(result.insertId, companyId);
}

export async function updateTransaction(id: number, data: UpdateTransactionInput, companyId: number): Promise<TransactionRow> {
  await getTransactionById(id, companyId);

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
  if (data.transaction_date !== undefined) { fields.push('transaction_date = ?'); values.push(data.transaction_date); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getTransactionById(id, companyId);
}

export async function deleteTransaction(id: number, companyId: number): Promise<void> {
  await getTransactionById(id, companyId);
  await execute('DELETE FROM transactions WHERE id = ? AND company_id = ?', [id, companyId]);
}

export async function getCashFlow(companyId: number): Promise<CashFlowRow> {
  const result = await query<CashFlowRow[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) as total_revenue,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) as total_expense,
       COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) -
       COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) as balance
     FROM transactions WHERE company_id = ?`,
    [companyId]
  );
  return result[0] || { total_revenue: 0, total_expense: 0, balance: 0 };
}

export async function getCashFlowByPeriod(startDate: string, endDate: string, companyId: number): Promise<CashFlowRow> {
  const result = await query<CashFlowRow[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) as total_revenue,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) as total_expense,
       COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) -
       COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) as balance
     FROM transactions WHERE transaction_date BETWEEN ? AND ? AND company_id = ?`,
    [startDate, endDate, companyId]
  );
  return result[0] || { total_revenue: 0, total_expense: 0, balance: 0 };
}
