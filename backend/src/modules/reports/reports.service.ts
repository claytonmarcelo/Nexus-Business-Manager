import { query } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { RowDataPacket } from 'mysql2';

interface ReportRow extends RowDataPacket {
  [key: string]: unknown;
}

export async function generateClientReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, name, phone, email, document, address, notes, created_at
     FROM clients WHERE active = TRUE AND company_id = ? ORDER BY name`, [companyId]
  );
}

export async function generateProductReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, name, sku, category, price, quantity, (price * quantity) as stock_value, created_at
     FROM products WHERE active = TRUE AND company_id = ? ORDER BY name`, [companyId]
  );
}

export async function generateFinancialReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, type, category, description, value, transaction_date, created_at
     FROM transactions WHERE company_id = ? ORDER BY transaction_date DESC`, [companyId]
  );
}

export async function generateStockReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT p.id, p.name, p.sku, p.category, p.price, p.quantity, (p.price * p.quantity) as stock_value,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = p.id AND type = 'in' AND company_id = ?) as total_entries,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = p.id AND type = 'out' AND company_id = ?) as total_exits
     FROM products p WHERE p.active = TRUE AND p.company_id = ? ORDER BY p.name`,
    [companyId, companyId, companyId]
  );
}
