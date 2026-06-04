import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateMovementInput } from './stock.schema';
import { RowDataPacket } from 'mysql2';

interface StockMovementRow extends RowDataPacket {
  id: number;
  product_id: number;
  type: string;
  quantity: number;
  description: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_by: number;
  created_at: string;
  product_name: string;
}

interface ProductRow extends RowDataPacket {
  id: number;
  quantity: number;
}

export async function listMovements(companyId: number): Promise<StockMovementRow[]> {
  return query<StockMovementRow[]>(
    `SELECT sm.*, p.name as product_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     WHERE sm.company_id = ?
     ORDER BY sm.created_at DESC`,
    [companyId]
  );
}

export async function getMovementsByProduct(productId: number, companyId: number): Promise<StockMovementRow[]> {
  return query<StockMovementRow[]>(
    `SELECT sm.*, p.name as product_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     WHERE sm.product_id = ? AND sm.company_id = ?
     ORDER BY sm.created_at DESC`,
    [productId, companyId]
  );
}

async function getProduct(productId: number, companyId: number): Promise<ProductRow> {
  const products = await query<ProductRow[]>(
    'SELECT id, quantity FROM products WHERE id = ? AND active = TRUE AND company_id = ?',
    [productId, companyId]
  );
  if (products.length === 0) throw new AppError('Produto nao encontrado', 404);
  return products[0];
}

function updateProductStock(productId: number, type: string, quantity: number, currentQty: number): Promise<any> {
  const newQty = type === 'in' ? currentQty + quantity : currentQty - quantity;
  if (newQty < 0) throw new AppError('Estoque insuficiente para esta saida', 400);
  return execute('UPDATE products SET quantity = ? WHERE id = ?', [newQty, productId]);
}

export async function createMovement(data: CreateMovementInput, userId: number, companyId: number): Promise<StockMovementRow> {
  const product = await getProduct(data.product_id, companyId);
  await updateProductStock(data.product_id, data.type, data.quantity, product.quantity);

  const result = await execute(
    'INSERT INTO stock_movements (product_id, type, quantity, description, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)',
    [data.product_id, data.type, data.quantity, data.description || null, userId, companyId]
  );

  const movements = await query<StockMovementRow[]>(
    `SELECT sm.*, p.name as product_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     WHERE sm.id = ?`, [result.insertId]
  );
  return movements[0];
}
