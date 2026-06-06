import { query } from '../../shared/database/connection';
import { RowDataPacket } from 'mysql2';

export interface BusinessContext {
  currentModule: string;
  currentPage: string;
  companyName: string;
  totalClients: number;
  totalProducts: number;
  lowStockCount: number;
  totalSales: number;
  totalRevenue: number;
  totalExpense: number;
  balance: number;
  inactiveClients: number;
  upcomingAppointments: number;
  upcomingBills: number;
  overdueBills: number;
}

export async function getBusinessContext(companyId: number, module?: string, page?: string): Promise<BusinessContext> {
  const context: BusinessContext = {
    currentModule: module || '',
    currentPage: page || '',
    companyName: '',
    totalClients: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalExpense: 0,
    balance: 0,
    inactiveClients: 0,
    upcomingAppointments: 0,
    upcomingBills: 0,
    overdueBills: 0,
  };

  try {
    const [company] = await query<RowDataPacket[]>('SELECT name FROM companies WHERE id = ?', [companyId]);
    if (company) context.companyName = company.name || '';
  } catch { /* noop */ }

  const queries: [string, any[], (val: any) => void][] = [
    ['SELECT COUNT(*) as c FROM clients WHERE company_id = ? AND active = 1', [companyId], (v) => { context.totalClients = v; }],
    ['SELECT COUNT(*) as c FROM products WHERE company_id = ? AND active = 1', [companyId], (v) => { context.totalProducts = v; }],
    ['SELECT COUNT(*) as c FROM products WHERE company_id = ? AND active = 1 AND quantity <= 5', [companyId], (v) => { context.lowStockCount = v; }],
    ['SELECT COUNT(*) as c FROM sales WHERE company_id = ?', [companyId], (v) => { context.totalSales = v; }],
    ['SELECT COALESCE(SUM(CASE WHEN type = \'revenue\' THEN value ELSE 0 END), 0) as rev, COALESCE(SUM(CASE WHEN type = \'expense\' THEN value ELSE 0 END), 0) as exp FROM transactions WHERE company_id = ? AND MONTH(transaction_date) = MONTH(CURDATE()) AND YEAR(transaction_date) = YEAR(CURDATE())', [companyId], (v) => { context.totalRevenue = Number(v.rev); context.totalExpense = Number(v.exp); context.balance = Number(v.rev) - Number(v.exp); }],
    ['SELECT COUNT(*) as c FROM clients WHERE company_id = ? AND active = 1 AND (last_purchase_date IS NULL OR last_purchase_date < DATE_SUB(CURDATE(), INTERVAL 60 DAY))', [companyId], (v) => { context.inactiveClients = v; }],
    ['SELECT COUNT(*) as c FROM appointments WHERE company_id = ? AND appointment_date >= CURDATE() AND status = \'scheduled\'', [companyId], (v) => { context.upcomingAppointments = v; }],
    ['SELECT COUNT(*) as c FROM transactions WHERE company_id = ? AND type = \'expense\' AND transaction_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)', [companyId], (v) => { context.upcomingBills = v; }],
    ['SELECT COUNT(*) as c FROM transactions WHERE company_id = ? AND type = \'expense\' AND transaction_date < CURDATE()', [companyId], (v) => { context.overdueBills = v; }],
  ];

  await Promise.all(queries.map(([sql, params, setter]) =>
    query<RowDataPacket[]>(sql, params).then((rows) => {
      if (rows.length > 0) {
        setter(rows[0]);
      }
    }).catch(() => { /* table may not exist */ })
  ));

  return context;
}
