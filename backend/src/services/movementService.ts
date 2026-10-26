import type { DbPool } from '../db/pool.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';

export async function listMovimientos(pool: DbPool, actor: AuthUser, from?: string, to?: string, productId?: string) {
  if (!can(actor.role, 'movements.read')) throw new Error('No tiene permiso para consultar movimientos de stock.');

  let sql = `
    SELECT sm.id, sm.product_id, p.name AS product_name, p.category, sm.quantity, sm.reason,
           sm.attention_id, sm.created_by, sm.created_at
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    WHERE 1 = 1
  `;
  const values: unknown[] = [];
  let i = 1;

  if (from) {
    sql += ` AND sm.created_at >= $${i++}`;
    values.push(from);
  }
  if (to) {
    sql += ` AND sm.created_at <= $${i++}`;
    values.push(to);
  }
  if (productId) {
    sql += ` AND sm.product_id = $${i++}`;
    values.push(productId);
  }

  sql += ` ORDER BY sm.created_at DESC`;

  const res = await pool.query(sql, values);
  return res.rows.map((row: any) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category,
    quantity: Number(row.quantity),
    reason: row.reason,
    attentionId: row.attention_id,
    createdBy: row.created_by,
    createdAt: row.created_at
  }));
}
