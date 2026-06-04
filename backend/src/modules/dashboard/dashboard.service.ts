import { query } from '../../shared/database/connection';
import { RowDataPacket } from 'mysql2';

interface DashboardStats extends RowDataPacket {
  total_clients: number;
  total_products: number;
  total_suppliers: number;
  total_sales: number;
  total_purchases: number;
  stock_value: number;
  total_revenue: number;
  total_expense: number;
  balance: number;
  low_stock_count: number;
}

interface ChartData extends RowDataPacket {
  label: string;
  value: number;
}

export async function getStats(companyId: number): Promise<DashboardStats> {
  const result = await query<DashboardStats[]>(
    `SELECT
       (SELECT COUNT(*) FROM clients WHERE active = TRUE AND company_id = ?) as total_clients,
       (SELECT COUNT(*) FROM products WHERE active = TRUE AND company_id = ?) as total_products,
       (SELECT COUNT(*) FROM suppliers WHERE active = TRUE AND company_id = ?) as total_suppliers,
       (SELECT COUNT(*) FROM sales WHERE company_id = ?) as total_sales,
       (SELECT COUNT(*) FROM purchases WHERE company_id = ?) as total_purchases,
       (SELECT COALESCE(SUM(price * quantity), 0) FROM products WHERE active = TRUE AND company_id = ?) as stock_value,
       (SELECT COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) FROM transactions WHERE company_id = ?) as total_revenue,
       (SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) FROM transactions WHERE company_id = ?) as total_expense,
       (SELECT COALESCE(SUM(CASE WHEN type = 'revenue' THEN value ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END), 0) FROM transactions WHERE company_id = ?) as balance,
       (SELECT COUNT(*) FROM products WHERE active = TRUE AND quantity <= 5 AND company_id = ?) as low_stock_count`,
    Array(11).fill(companyId)
  );
  return result[0];
}

export async function getRevenueByMonth(companyId: number): Promise<ChartData[]> {
  return query<ChartData[]>(
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') as label, SUM(value) as value
     FROM transactions WHERE type = 'revenue' AND company_id = ?
     GROUP BY label ORDER BY label LIMIT 12`,
    [companyId]
  );
}

export async function getExpenseByMonth(companyId: number): Promise<ChartData[]> {
  return query<ChartData[]>(
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') as label, SUM(value) as value
     FROM transactions WHERE type = 'expense' AND company_id = ?
     GROUP BY label ORDER BY label LIMIT 12`,
    [companyId]
  );
}

export async function getSalesByMonth(companyId: number): Promise<ChartData[]> {
  return query<ChartData[]>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as label, COUNT(*) as value
     FROM sales WHERE company_id = ?
     GROUP BY label ORDER BY label LIMIT 12`,
    [companyId]
  );
}

export async function getProductsByCategory(companyId: number): Promise<ChartData[]> {
  return query<ChartData[]>(
    `SELECT COALESCE(category, 'Sem categoria') as label, COUNT(*) as value
     FROM products WHERE active = TRUE AND company_id = ?
     GROUP BY category ORDER BY value DESC`,
    [companyId]
  );
}
