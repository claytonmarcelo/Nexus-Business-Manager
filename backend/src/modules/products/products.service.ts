import { query, execute } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/app-error';
import { CreateProductInput, UpdateProductInput } from './products.schema';
import { RowDataPacket } from 'mysql2';

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  quantity: number;
  image: string | null;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export async function listProducts(): Promise<ProductRow[]> {
  return query<ProductRow[]>(
    'SELECT id, name, sku, category, price, quantity, image, created_by, active, created_at, updated_at FROM products WHERE active = TRUE ORDER BY created_at DESC'
  );
}

export async function getProductById(id: number): Promise<ProductRow> {
  const products = await query<ProductRow[]>(
    'SELECT id, name, sku, category, price, quantity, image, created_by, active, created_at, updated_at FROM products WHERE id = ?',
    [id]
  );
  if (products.length === 0) throw new AppError('Produto nao encontrado', 404);
  return products[0];
}

export async function createProduct(data: CreateProductInput, userId: number): Promise<ProductRow> {
  const existing = await query<ProductRow[]>('SELECT id FROM products WHERE sku = ?', [data.sku]);
  if (existing.length > 0) throw new AppError('SKU ja cadastrado', 409);

  const result = await execute(
    'INSERT INTO products (name, sku, category, price, quantity, image, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.sku, data.category || null, data.price, data.quantity, data.image || null, userId]
  );
  return getProductById(result.insertId);
}

export async function updateProduct(id: number, data: UpdateProductInput): Promise<ProductRow> {
  await getProductById(id);

  if (data.sku) {
    const existing = await query<ProductRow[]>(
      'SELECT id FROM products WHERE sku = ? AND id != ?',
      [data.sku, id]
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
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

  if (fields.length > 0) {
    values.push(id);
    await execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return getProductById(id);
}

export async function deleteProduct(id: number): Promise<void> {
  await getProductById(id);
  await execute('UPDATE products SET active = FALSE WHERE id = ?', [id]);
}
