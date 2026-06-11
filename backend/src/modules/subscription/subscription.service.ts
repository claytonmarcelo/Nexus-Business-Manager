import { query } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';

const VALID_PLANS = ['free', 'pro', 'enterprise'] as const;

export async function getSubscription(companyId: number, _userId: number) {
  const rows = await query<any[]>(
    `SELECT id, plan, status, start_date, next_billing, payment_method, users_limit, 
            (SELECT COUNT(*) FROM users WHERE company_id = ? AND active = TRUE) as users_used
     FROM companies WHERE id = ?`,
    [companyId, companyId]
  );

  if (!rows || rows.length === 0) {
    return {
      plan: 'free',
      status: 'active',
      start_date: new Date().toISOString(),
      next_billing: new Date(Date.now() + 30 * 86400000).toISOString(),
      users_used: 1,
      users_limit: 3,
      payment_method: null,
    };
  }

  const row = rows[0];
  return {
    plan: row.plan || 'free',
    status: row.status || 'active',
    start_date: row.start_date?.toISOString() || new Date().toISOString(),
    next_billing: row.next_billing?.toISOString() || new Date(Date.now() + 30 * 86400000).toISOString(),
    users_used: Number(row.users_used) || 1,
    users_limit: Number(row.users_limit) || 3,
    payment_method: row.payment_method ? JSON.parse(row.payment_method) : null,
  };
}

export async function changePlan(companyId: number, plan: string) {
  if (!VALID_PLANS.includes(plan as any)) {
    throw new AppError('Plano invalido', 400);
  }

  const limits: Record<string, number> = { free: 3, pro: 15, enterprise: 999 };
  const newLimit = limits[plan] || 3;

  await query(
    `UPDATE companies SET plan = ?, users_limit = ?, updated_at = NOW() WHERE id = ?`,
    [plan, newLimit, companyId]
  );
}

export async function cancelSubscription(companyId: number) {
  await query(
    `UPDATE companies SET plan = 'free', status = 'canceled', users_limit = 3, updated_at = NOW() WHERE id = ?`,
    [companyId]
  );
}

export async function getInvoices(companyId: number) {
  const rows = await query<any[]>(
    `SELECT id, invoice_number as number, plan, amount, status, due_date, paid_at, pdf_url
     FROM invoices WHERE company_id = ?
     ORDER BY due_date DESC LIMIT 12`,
    [companyId]
  );

  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((r: any) => ({
    id: String(r.id),
    number: r.number,
    plan: r.plan,
    amount: Number(r.amount),
    status: r.status,
    due_date: r.due_date?.toISOString?.() || r.due_date,
    paid_at: r.paid_at?.toISOString?.() || r.paid_at || null,
    pdf_url: r.pdf_url || null,
  }));
}
