import { query, execute, getConnection } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateSaleInput, UpdateSaleInput } from './sales.schema';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface SaleRow extends RowDataPacket {
  id: number;
  client_id: number | null;
  total_value: number;
  status: string;
  notes: string | null;
  created_at: string;
  client_name: string | null;
}

interface SaleItemRow extends RowDataPacket {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
}

interface ProductRow extends RowDataPacket {
  id: number;
  quantity: number;
}

export async function listSales(companyId: number, params: PaginationParams): Promise<PaginatedResult<SaleRow>> {
  const where = ['s.company_id = ?'];
  const values: unknown[] = [companyId];
  if (params.search) {
    where.push('(c.name LIKE ? OR s.notes LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term);
  }
  const countResult = await query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM sales s LEFT JOIN clients c ON c.id = s.client_id WHERE ${where.join(' AND ')}`, values
  );
  const total = countResult[0].total;
  const data = await query<SaleRow[]>(
    `SELECT s.*, c.name as client_name
     FROM sales s LEFT JOIN clients c ON c.id = s.client_id
     WHERE ${where.join(' AND ')}
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );
  return buildPaginatedResponse(data, total, params);
}

export async function getSaleById(id: number, companyId: number): Promise<SaleRow> {
  const sales = await query<SaleRow[]>(
    `SELECT s.*, c.name as client_name FROM sales s LEFT JOIN clients c ON c.id = s.client_id WHERE s.id = ? AND s.company_id = ?`, [id, companyId]
  );
  if (sales.length === 0) throw new AppError('Venda nao encontrada', 404);
  return sales[0];
}

export async function getSaleItems(saleId: number): Promise<SaleItemRow[]> {
  return query<SaleItemRow[]>(
    `SELECT si.*, pr.name as product_name FROM sale_items si JOIN products pr ON pr.id = si.product_id WHERE si.sale_id = ?`, [saleId]
  );
}

export async function createSale(data: CreateSaleInput, userId: number, companyId: number): Promise<SaleRow> {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    let totalValue = 0;
    const itemsToProcess: { product_id: number; quantity: number; unit_price: number; total_price: number }[] = [];
    for (const item of data.items) {
      const [products] = await conn.execute<ProductRow[] & ResultSetHeader>(
        'SELECT id, quantity FROM products WHERE id = ? AND active = TRUE AND company_id = ? FOR UPDATE', [item.product_id, companyId]
      );
      if (products.length === 0) throw new AppError(`Produto ID ${item.product_id} nao encontrado`, 404);
      if ((products as any)[0].quantity < item.quantity) {
        throw new AppError(`Estoque insuficiente para o produto ID ${item.product_id}`, 400);
      }
      const totalPrice = item.quantity * item.unit_price;
      totalValue += totalPrice;
      itemsToProcess.push({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total_price: totalPrice });
    }
    const [saleResult] = await conn.execute<ResultSetHeader>(
      'INSERT INTO sales (client_id, total_value, status, notes, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.client_id || null, totalValue, data.status || 'CONCLUIDA', data.notes || null, userId, companyId]
    );
    const saleId = saleResult.insertId;
    for (const item of itemsToProcess) {
      await conn.execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
      await conn.execute('UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?', [item.quantity, item.product_id, companyId]);
      await conn.execute(
        'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.product_id, 'out', item.quantity, 'Saida por venda', 'sale', saleId, userId, companyId]
      );
    }
    await conn.commit();
    return getSaleById(saleId, companyId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateSale(id: number, data: UpdateSaleInput, companyId: number): Promise<SaleRow> {
  await getSaleById(id, companyId);
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.client_id !== undefined) { fields.push('client_id = ?'); values.push(data.client_id); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE sales SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }
  return getSaleById(id, companyId);
}

export async function deleteSale(id: number, companyId: number): Promise<void> {
  await getSaleById(id, companyId);
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const items = await getSaleItems(id);
    for (const item of items) {
      await conn.execute('UPDATE products SET quantity = quantity + ? WHERE id = ? AND company_id = ?', [item.quantity, item.product_id, companyId]);
    }
    await conn.execute('UPDATE sales SET status = ? WHERE id = ? AND company_id = ?', ['CANCELADA', id, companyId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
