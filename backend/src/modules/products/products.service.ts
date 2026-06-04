import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateProductInput, UpdateProductInput } from './products.schema';
import { RowDataPacket } from 'mysql2';
import { PaginationParams, PaginatedResult, buildPaginatedResponse } from '../../shared/utils/pagination';

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  quantity: number;
  image: string | null;
  status: string;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export async function listProducts(companyId: number, params: PaginationParams): Promise<PaginatedResult<ProductRow>> {
  const where = ['active = TRUE', 'company_id = ?'];
  const values: unknown[] = [companyId];

  if (params.search) {
    where.push('(name LIKE ? OR sku LIKE ? OR category LIKE ?)');
    const term = `%${params.search}%`;
    values.push(term, term, term);
  }

  const countResult = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM products WHERE ${where.join(' AND ')}`, values);
  const total = countResult[0].total;

  const data = await query<ProductRow[]>(
    `SELECT id, name, sku, category, price, quantity, image, status, created_by, active, created_at, updated_at FROM products WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, params.limit, params.offset]
  );

  return buildPaginatedResponse(data, total, params);
}

export async function getProductById(id: number, companyId: number): Promise<ProductRow> {
  const products = await query<ProductRow[]>(
    'SELECT id, name, sku, category, price, quantity, image, status, created_by, active, created_at, updated_at FROM products WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  if (products.length === 0) throw new AppError('Produto nao encontrado', 404);
  return products[0];
}

export async function createProduct(data: CreateProductInput, userId: number, companyId: number): Promise<ProductRow> {
  const existing = await query<ProductRow[]>('SELECT id FROM products WHERE sku = ? AND company_id = ?', [data.sku, companyId]);
  if (existing.length > 0) throw new AppError('SKU ja cadastrado nesta empresa', 409);

  const result = await execute(
    'INSERT INTO products (name, sku, category, price, quantity, image, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.sku, data.category || null, data.price, data.quantity, data.image || null, data.status || 'ATIVO', userId, companyId]
  );
  return getProductById(result.insertId, companyId);
}

export async function updateProduct(id: number, data: UpdateProductInput, companyId: number): Promise<ProductRow> {
  await getProductById(id, companyId);

  if (data.sku) {
    const existing = await query<ProductRow[]>(
      'SELECT id FROM products WHERE sku = ? AND id != ? AND company_id = ?',
      [data.sku, id, companyId]
    );
    if (existing.length > 0) throw new AppError('SKU ja cadastrado', 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
  if (data.image !== undefined) { fields.push('image = ?'); values.push(data.image); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id, companyId);
    await execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, values);
  }

  return getProductById(id, companyId);
}

export async function deleteProduct(id: number, companyId: number): Promise<void> {
  await getProductById(id, companyId);
  await execute('UPDATE products SET active = FALSE WHERE id = ? AND company_id = ?', [id, companyId]);
}
