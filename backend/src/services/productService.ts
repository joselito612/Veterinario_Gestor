import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { conflict, forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';

function codigo(input: any): string {
  const code = String(input.barcode ?? input.sku ?? '').trim();
  if (!code) throw unprocessable('Código de barras es obligatorio.');
  return code;
}

function exigirMedicamento(state: { category: string; batch: string; sanitaryReg: string; expirationDate: string | null }) {
  if (state.category !== 'MEDICAMENTOS') return;
  const faltantes: string[] = [];
  if (!state.batch || state.batch.trim().length === 0) faltantes.push('Lote es obligatorio para medicamentos.');
  if (!state.sanitaryReg || state.sanitaryReg.trim().length === 0) faltantes.push('Registro sanitario es obligatorio para medicamentos.');
  if (!state.expirationDate || Number.isNaN(Date.parse(String(state.expirationDate)))) {
    faltantes.push('Fecha de vencimiento válida es obligatoria para medicamentos.');
  }
  if (faltantes.length > 0) throw unprocessable(faltantes.join(' '));
}

function esDuplicado(err: any): boolean {
  return err?.code === '23505' || /products_(sku|barcode)_key/i.test(String(err?.message ?? ''));
}

export async function createProduct(pool: DbPool, actor: AuthUser, input: any) {
  if (!can(actor.role, 'products.write')) throw forbidden();
  const code = codigo(input);
  exigirMedicamento({
    category: input.category,
    batch: String(input.batch ?? ''),
    sanitaryReg: String(input.sanitaryReg ?? ''),
    expirationDate: input.expirationDate ?? null
  });
  try {
    const res = await pool.query(
      `INSERT INTO products (id, sku, barcode, name, category, subcategory, brand, description, unit, batch, sanitary_reg,
        cost_price, sale_price, current_stock, min_stock, expiration_date, supplier, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [
        randomUUID(), code, code, input.name.trim(), input.category,
        String(input.subcategory ?? '').trim(), String(input.brand ?? '').trim(), String(input.description ?? '').trim(),
        input.unit.trim(), String(input.batch ?? '').trim(), String(input.sanitaryReg ?? '').trim(),
        input.costPrice, input.salePrice, input.currentStock, input.minStock,
        input.expirationDate ?? null, input.supplier.trim(), input.isActive ?? true
      ]
    );
    const row = res.rows[0];
    await writeAudit(pool, actor, 'CREAR_PRODUCTO', 'PRODUCTO', row.id, `Se creó el producto ${row.sku} ${row.name}.`);
    return row;
  } catch (err: any) {
    if (esDuplicado(err)) throw conflict('Ya existe un producto con ese código de barras.');
    throw err;
  }
}

export async function updateProduct(pool: DbPool, actor: AuthUser, id: string, input: any) {
  if (!can(actor.role, 'products.write')) throw forbidden();
  const current = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  const row = current.rows[0];
  if (!row) throw notFound('Producto no encontrado.');
  const map: Record<string, string> = {
    name: 'name', category: 'category', subcategory: 'subcategory', brand: 'brand', description: 'description',
    unit: 'unit', batch: 'batch', sanitaryReg: 'sanitary_reg', costPrice: 'cost_price', salePrice: 'sale_price',
    currentStock: 'current_stock', minStock: 'min_stock', expirationDate: 'expiration_date',
    supplier: 'supplier', isActive: 'is_active'
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const merged = {
    category: row.category as string,
    batch: (row.batch ?? '') as string,
    sanitaryReg: (row.sanitary_reg ?? '') as string,
    expirationDate: (row.expiration_date ?? null) as string | null
  };
  let code: string | undefined;
  if (input.barcode !== undefined || input.sku !== undefined) {
    code = String(input.barcode ?? input.sku ?? '').trim();
    if (!code) throw unprocessable('Código de barras no puede estar vacío.');
    fields.push(`sku = $${i++}`, `barcode = $${i++}`);
    values.push(code, code);
  }
  for (const [key, column] of Object.entries(map)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = $${i++}`);
      values.push(typeof input[key] === 'string' ? input[key].trim() : input[key]);
    }
  }
  if (input.category !== undefined) merged.category = input.category;
  if (input.batch !== undefined) merged.batch = String(input.batch);
  if (input.sanitaryReg !== undefined) merged.sanitaryReg = String(input.sanitaryReg);
  if (input.expirationDate !== undefined) merged.expirationDate = input.expirationDate ?? null;
  if (merged.expirationDate !== null && merged.expirationDate !== '' && Number.isNaN(Date.parse(String(merged.expirationDate)))) {
    throw unprocessable('Fecha de vencimiento debe ser una fecha válida.');
  }
  exigirMedicamento(merged);
  if (fields.length === 0) throw conflict('Debe enviar al menos un campo para actualizar.');
  fields.push(`updated_at = NOW()`);
  values.push(id);
  try {
    const res = await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    const updated = res.rows[0];
    if (!updated) throw notFound('Producto no encontrado.');
    await writeAudit(pool, actor, 'MODIFICAR_PRODUCTO', 'PRODUCTO', id, `Se modificó el producto ${updated.sku}.`);
    return updated;
  } catch (err: any) {
    if (esDuplicado(err)) throw conflict('Ya existe un producto con ese código de barras.');
    throw err;
  }
}

function disponibilidadStock(row: { current_stock: number; min_stock?: number | null }): string {
  if (row.current_stock === 0) return 'sin_stock';
  if (row.current_stock <= (row.min_stock ?? 0)) return 'bajo_stock';
  return 'disponible';
}

export async function listProducts(pool: DbPool, actor: AuthUser, category?: string) {
  if (!can(actor.role, 'products.read')) throw forbidden();
  let sql = 'SELECT * FROM products WHERE is_active = TRUE';
  const values: unknown[] = [];
  if (category) {
    sql += ` AND category = $${values.length + 1}`;
    values.push(category);
  }
  sql += ' ORDER BY name ASC';
  const res = await pool.query(sql, values);
  return res.rows.map((row: any) => ({
    ...row,
    stock_disponible: disponibilidadStock(row)
  }));
}

export async function getProduct(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'products.read')) throw forbidden();
  const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  const row = res.rows[0];
  if (!row) throw notFound('Producto no encontrado.');
  return row;
}

export async function deactivateProduct(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'products.write')) throw forbidden();
  const res = await pool.query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
  const row = res.rows[0];
  if (!row) throw notFound('Producto no encontrado.');
  await writeAudit(pool, actor, 'DAR_BAJA_PRODUCTO', 'PRODUCTO', id, `Se dio de baja el producto ${row.sku}.`);
  return row;
}
