import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateSaleInput } from './sales.schema';
import { RowDataPacket } from 'mysql2';

interface SaleRow extends RowDataPacket {
  id: number;
  client_id: number | null;
  total_value: number;
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

export async function listSales(companyId: number): Promise<SaleRow[]> {
  return query<SaleRow[]>(
    `SELECT s.*, c.name as client_name
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     WHERE s.company_id = ?
     ORDER BY s.created_at DESC`,
    [companyId]
  );
}

export async function getSaleById(id: number, companyId: number): Promise<SaleRow> {
  const sales = await query<SaleRow[]>(
    `SELECT s.*, c.name as client_name
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     WHERE s.id = ? AND s.company_id = ?`, [id, companyId]
  );
  if (sales.length === 0) throw new AppError('Venda nao encontrada', 404);
  return sales[0];
}

export async function getSaleItems(saleId: number): Promise<SaleItemRow[]> {
  return query<SaleItemRow[]>(
    `SELECT si.*, pr.name as product_name
     FROM sale_items si
     JOIN products pr ON pr.id = si.product_id
     WHERE si.sale_id = ?`, [saleId]
  );
}

export async function createSale(data: CreateSaleInput, userId: number, companyId: number): Promise<SaleRow> {
  let totalValue = 0;
  const itemsToProcess: { product_id: number; quantity: number; unit_price: number; total_price: number }[] = [];

  for (const item of data.items) {
    const products = await query<ProductRow[]>(
      'SELECT id, quantity FROM products WHERE id = ? AND active = TRUE AND company_id = ?',
      [item.product_id, companyId]
    );
    if (products.length === 0) throw new AppError(`Produto ID ${item.product_id} nao encontrado`, 404);

    if (products[0].quantity < item.quantity) {
      throw new AppError(`Estoque insuficiente para o produto ID ${item.product_id}`, 400);
    }

    const totalPrice = item.quantity * item.unit_price;
    totalValue += totalPrice;
    itemsToProcess.push({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total_price: totalPrice });
  }

  const result = await execute(
    'INSERT INTO sales (client_id, total_value, notes, created_by, company_id) VALUES (?, ?, ?, ?, ?)',
    [data.client_id || null, totalValue, data.notes || null, userId, companyId]
  );

  const saleId = result.insertId;

  for (const item of itemsToProcess) {
    await execute(
      'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
      [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
    );

    const products = await query<ProductRow[]>(
      'SELECT id, quantity FROM products WHERE id = ?', [item.product_id]
    );
    const newQty = products[0].quantity - item.quantity;
    await execute('UPDATE products SET quantity = ? WHERE id = ?', [newQty, item.product_id]);

    await execute(
      'INSERT INTO stock_movements (product_id, type, quantity, description, reference_type, reference_id, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [item.product_id, 'out', item.quantity, 'Saida por venda', 'sale', saleId, userId, companyId]
    );
  }

  return getSaleById(saleId, companyId);
}
