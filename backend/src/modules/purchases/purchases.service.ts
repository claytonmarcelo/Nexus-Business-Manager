import { query, execute, getConnection } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreatePurchaseInput, UpdatePurchaseStatusInput } from './purchases.schema';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface PurchaseRow extends RowDataPacket {
  id: number;
  supplier_id: number | null;
  total_value: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier_name: string | null;
}

interface PurchaseItemRow extends RowDataPacket {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
}

export async function listPurchases(companyId: number, params: PaginationParams): Promise<PaginatedResult<PurchaseRow>> {
  const where = ['p.company_id = ?'];
  const values: unknown[] = [companyId];
  if (params.search) {
    where.push('(s.company_name LIKE ? OR p.notes LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }
  const countResult = await query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE ${where.join(' AND ')}`, values
  );
  const total = countResult[0].total;
  const data = await query<PurchaseRow[]>(
    `SELECT p.*, s.company_name as supplier_name
     FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );
  return buildPaginatedResponse(data, total, params);
}

export async function getPurchaseById(id: number, companyId: number): Promise<PurchaseRow> {
  const purchases = await query<PurchaseRow[]>(
    `SELECT p.*, s.company_name as supplier_name FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ? AND p.company_id = ?`, [id, companyId]
  );
  if (purchases.length === 0) throw new AppError('Compra nao encontrada', 404);
  return purchases[0];
}

export async function getPurchaseItems(purchaseId: number): Promise<PurchaseItemRow[]> {
  return query<PurchaseItemRow[]>(
    `SELECT pi.*, pr.name as product_name FROM purchase_items pi JOIN products pr ON pr.id = pi.product_id WHERE pi.purchase_id = ?`, [purchaseId]
  );
}

export async function createPurchase(data: CreatePurchaseInput, userId: number, companyId: number): Promise<PurchaseRow> {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    let totalValue = 0;
    for (const item of data.items) {
      totalValue += item.quantity * item.unit_price;
    }
    const [purchaseResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO purchases (supplier_id, total_value, status, notes, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.supplier_id || null, totalValue, data.status || 'PENDENTE', data.notes || null, userId, companyId]
    );
    const purchaseId = purchaseResult.insertId;
    for (const item of data.items) {
      const totalPrice = item.quantity * item.unit_price;
      await conn.execute(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_price, totalPrice]
      );
      if (data.status === 'RECEBIDA') {
        await conn.execute(
          'UPDATE products SET quantity = quantity + ? WHERE id = ? AND company_id = ?',
          [item.quantity, item.product_id, companyId]
        );
        await conn.execute(
          'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [item.product_id, 'in', item.quantity, 'Entrada por compra', 'purchase', purchaseId, userId, companyId]
        );
      }
    }
    await conn.commit();
    return getPurchaseById(purchaseId, companyId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function receivePurchase(id: number, userId: number, companyId: number): Promise<void> {
  const purchase = await getPurchaseById(id, companyId);
  if (purchase.status !== 'PENDENTE') throw new AppError('Compra ja foi processada', 400);
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const items = await getPurchaseItems(id);
    for (const item of items) {
      await conn.execute('UPDATE products SET quantity = quantity + ? WHERE id = ? AND company_id = ?', [item.quantity, item.product_id, companyId]);
      await conn.execute(
        'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.product_id, 'in', item.quantity, 'Entrada por compra', 'purchase', id, userId, companyId]
      );
    }
    await conn.execute("UPDATE purchases SET status = 'RECEBIDA' WHERE id = ? AND company_id = ?", [id, companyId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function cancelPurchase(id: number, companyId: number): Promise<PurchaseRow> {
  const purchase = await getPurchaseById(id, companyId);
  if (purchase.status === 'CANCELADA') throw new AppError('Compra ja esta cancelada', 400);
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    if (purchase.status === 'RECEBIDA') {
      const items = await getPurchaseItems(id);
      for (const item of items) {
        await conn.execute('UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?', [item.quantity, item.product_id, companyId]);
        await conn.execute(
          'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [item.product_id, 'out', item.quantity, 'Estorno por cancelamento de compra', 'purchase_cancel', id, 0, companyId]
        );
      }
    }
    await conn.execute("UPDATE purchases SET status = 'CANCELADA' WHERE id = ? AND company_id = ?", [id, companyId]);
    await conn.commit();
    return getPurchaseById(id, companyId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updatePurchaseStatus(id: number, data: UpdatePurchaseStatusInput, companyId: number): Promise<PurchaseRow> {
  await getPurchaseById(id, companyId);
  await execute('UPDATE purchases SET status = ? WHERE id = ? AND company_id = ?', [data.status, id, companyId]);
  return getPurchaseById(id, companyId);
}

export async function deletePurchase(id: number, companyId: number): Promise<void> {
  const purchase = await getPurchaseById(id, companyId);
  if (purchase.status === 'CANCELADA') throw new AppError('Compra ja esta cancelada', 400);
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    if (purchase.status === 'RECEBIDA') {
      const items = await getPurchaseItems(id);
      for (const item of items) {
        await conn.execute('UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?', [item.quantity, item.product_id, companyId]);
        await conn.execute(
          'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [item.product_id, 'out', item.quantity, 'Estorno por cancelamento de compra', 'purchase_cancel', id, 0, companyId]
        );
      }
    }
    await conn.execute("UPDATE purchases SET status = 'CANCELADA' WHERE id = ? AND company_id = ?", [id, companyId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
