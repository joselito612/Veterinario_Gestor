import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { conflict, forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AttentionItemInput, AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';
import { withLock } from './mutex.js';

function dedupe(items: AttentionItemInput[]): AttentionItemInput[] {
  const map = new Map<string, { quantity: number; dosis: string }>();
  for (const item of items) {
    const prev = map.get(item.productId);
    if (prev) {
      map.set(item.productId, {
        quantity: prev.quantity + item.quantity,
        dosis: prev.dosis || (item.dosis ?? '')
      });
    } else {
      map.set(item.productId, { quantity: item.quantity, dosis: item.dosis ?? '' });
    }
  }
  return [...map.entries()].map(([productId, v]) => ({ productId, quantity: v.quantity, dosis: v.dosis }));
}

function assertValidItem(item: AttentionItemInput): void {
  if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw unprocessable('Cantidad debe ser mayor que cero.');
  if (!item.dosis || item.dosis.trim().length === 0) throw unprocessable('Dosis no puede estar vacía.');
}

export async function createDraft(pool: DbPool, actor: AuthUser, input: { patientId: string; attentionDate: string }) {
  if (!can(actor.role, 'attentions.create')) throw forbidden();
  const patient = await pool.query('SELECT id FROM patients WHERE id = $1', [input.patientId]);
  if (!patient.rows[0]) throw notFound('Paciente no encontrado.');
  const res = await pool.query(
    'INSERT INTO attentions (id, patient_id, professional_id, attention_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [randomUUID(), input.patientId, actor.id, input.attentionDate, 'BORRADOR']
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'CREAR_ATENCION', 'ATENCION', row.id, 'Se creó una atención en borrador.');
  return row;
}

export async function setDraftItems(pool: DbPool, actor: AuthUser, attentionId: string, items: AttentionItemInput[]) {
  if (!can(actor.role, 'attentions.create')) throw forbidden();
  const att = await pool.query('SELECT * FROM attentions WHERE id = $1', [attentionId]);
  const attention = att.rows[0];
  if (!attention) throw notFound('Atención no encontrada.');
  if (attention.status !== 'BORRADOR') throw conflict('Solo se pueden modificar insumos en una atención en borrador.');
  const clean = dedupe(items);
  for (const item of clean) {
    assertValidItem(item);
    const prod = await pool.query('SELECT id, name, sku, sale_price, is_active FROM products WHERE id = $1', [item.productId]);
    if (!prod.rows[0]) throw notFound('Producto no encontrado.');
    if (!prod.rows[0].is_active) throw unprocessable('El producto no está disponible para nuevas atenciones.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM attention_items WHERE attention_id = $1', [attentionId]);
    for (const item of clean) {
      const prod = await client.query('SELECT id, name, sku, sale_price FROM products WHERE id = $1', [item.productId]);
      const p = prod.rows[0];
      await client.query(
        'INSERT INTO attention_items (attention_id, product_id, quantity, dosis, product_name, product_sku, sale_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [attentionId, item.productId, item.quantity, item.dosis.trim(), p.name, p.sku, p.sale_price]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getAttention(pool, actor, attentionId);
}

export async function listAttentions(pool: DbPool, actor: AuthUser) {
  if (!can(actor.role, 'patients.read')) throw forbidden();
  const res = await pool.query(
    `SELECT a.id, a.attention_date, a.diagnosis, a.treatment, a.status,
            a.created_at, a.closed_at, a.annulled_at,
            a.patient_id, p.name AS patient_name, p.species AS patient_species,
            a.professional_id
       FROM attentions a
       JOIN patients p ON p.id = a.patient_id
      ORDER BY a.created_at DESC`
  );
  return res.rows;
}

export async function getAttention(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'patients.read')) throw forbidden();
  const att = await pool.query('SELECT * FROM attentions WHERE id = $1', [id]);
  const attention = att.rows[0];
  if (!attention) throw notFound('Atención no encontrada.');
  const items = await pool.query('SELECT * FROM attention_items WHERE attention_id = $1', [id]);
  return { ...attention, items: items.rows };
}

export async function closeAttention(
  pool: DbPool,
  actor: AuthUser,
  attentionId: string,
  input: { diagnosis: string; treatment: string; items?: AttentionItemInput[] }
) {
  if (!can(actor.role, 'attentions.close')) throw forbidden();
  return withLock('stock', async () => {
    const client = await pool.connect();
    let avisosStock: string[] = [];
    try {
      await client.query('BEGIN');
      const attRes = await client.query('SELECT * FROM attentions WHERE id = $1', [attentionId]);
      const attention = attRes.rows[0];
      if (!attention) throw notFound('Atención no encontrada.');
      if (attention.status !== 'BORRADOR') throw conflict('La atención ya fue cerrada o anulada.');

      let items: AttentionItemInput[];
      if (input.items !== undefined) {
        items = dedupe(input.items);
        await client.query('DELETE FROM attention_items WHERE attention_id = $1', [attentionId]);
        for (const item of items) {
          assertValidItem(item);
          const prod = await client.query('SELECT id, name, sku, sale_price, current_stock, is_active FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
          const p = prod.rows[0];
          if (!p) throw notFound('Producto no encontrado.');
          if (!p.is_active) throw unprocessable('El producto no está disponible para nuevas atenciones.');
          await client.query(
            'INSERT INTO attention_items (attention_id, product_id, quantity, dosis, product_name, product_sku, sale_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [attentionId, item.productId, item.quantity, item.dosis.trim(), p.name, p.sku, p.sale_price]
          );
        }
      } else {
        const existing = await client.query('SELECT product_id AS "productId", quantity, dosis FROM attention_items WHERE attention_id = $1', [attentionId]);
        items = existing.rows as AttentionItemInput[];
        for (const item of items) assertValidItem({ ...item, dosis: (item as any).dosis ?? '' });
      }

      // Verificar disponibilidad con bloqueo de filas (solo informativo para veterinario)
      const insufficient: string[] = [];
      const products = new Map<string, any>();
      for (const item of items) {
        const prod = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
        const p = prod.rows[0];
        if (!p) throw notFound('Producto no encontrado.');
        if (!p.is_active) throw unprocessable('El producto no está disponible para nuevas atenciones.');
        products.set(item.productId, p);
        if (Number(p.current_stock) < item.quantity) insufficient.push(`${p.sku} (disponible ${p.current_stock}, requerido ${item.quantity})`);
      }

      if (actor.role === 'VETERINARIO') {
        // Receta con descuento parcial: se entrega hasta agotar stock sin bloquear el cierre.
        avisosStock = [];
        for (const item of items) {
          const p = products.get(item.productId);
          const available = Number(p.current_stock);
          const needed = Number(item.quantity);
          const delivered = Math.min(available, needed);
          const missing = needed - delivered;
          if (delivered > 0) {
            await client.query('UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2', [available - delivered, item.productId]);
            await client.query(
              'INSERT INTO stock_movements (id, product_id, quantity, reason, attention_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
              [randomUUID(), item.productId, -delivered, 'CIERRE_ATENCION', attentionId, actor.id]
            );
            await writeAudit(
              client,
              actor,
              'DESCUENTO_STOCK_ATENCION',
              'PRODUCTO',
              item.productId,
              `Descuento parcial de ${delivered} unidad(es) de ${p.sku} por atención ${attentionId} (recetadas ${needed}, faltantes ${missing} para compra externa).`
            );
          }
          if (missing > 0) {
            avisosStock.push(
              delivered > 0
                ? `${p.sku} (entregadas ${delivered} de ${needed}, faltante ${missing})`
                : `${p.sku} (sin stock, recetadas ${needed})`
            );
          }
        }
        await client.query(
          "UPDATE attentions SET diagnosis = $1, treatment = $2, status = 'CERRADA', closed_at = NOW() WHERE id = $3",
          [input.diagnosis.trim(), input.treatment.trim(), attentionId]
        );
        await writeAudit(
          client,
          actor,
          'CERRAR_ATENCION',
          'ATENCION',
          attentionId,
          `Se cerró la atención con ${items.length} ítem(s) de receta con descuento parcial de stock.` +
            (avisosStock.length > 0 ? ` Aviso de stock: ${avisosStock.join('; ')}. Debe adquirirse por otros medios.` : '')
        );
        await client.query('COMMIT');
      } else {
        // Consumo interno (admin): bloqueante y con descuento atómico.
        if (insufficient.length > 0) {
          throw unprocessable(`Stock insuficiente: ${insufficient.join('; ')}. No se descontó ningún insumo.`);
        }
        for (const item of items) {
          const p = products.get(item.productId);
          const newStock = Number(p.current_stock) - Number(item.quantity);
          await client.query('UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2', [newStock, item.productId]);
          await client.query(
            'INSERT INTO stock_movements (id, product_id, quantity, reason, attention_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [randomUUID(), item.productId, -Number(item.quantity), 'CIERRE_ATENCION', attentionId, actor.id]
          );
        }
        await client.query(
          "UPDATE attentions SET diagnosis = $1, treatment = $2, status = 'CERRADA', closed_at = NOW() WHERE id = $3",
          [input.diagnosis.trim(), input.treatment.trim(), attentionId]
        );
        await writeAudit(
          client,
          actor,
          'CERRAR_ATENCION',
          'ATENCION',
          attentionId,
          `Se cerró la atención con ${items.length} insumo(s) y descuento automático de stock.`
        );
        for (const item of items) {
          const p = products.get(item.productId);
          await writeAudit(client, actor, 'DESCUENTO_STOCK_ATENCION', 'PRODUCTO', item.productId, `Descuento de ${item.quantity} unidad(es) de ${p.sku} por atención ${attentionId}.`);
        }
        await client.query('COMMIT');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    const closed = await getAttention(pool, actor, attentionId);
    return { ...closed, avisosStock };
  });
}

export async function annulAttention(pool: DbPool, actor: AuthUser, attentionId: string) {
  if (!can(actor.role, 'attentions.annul')) throw forbidden();
  return withLock('stock', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const attRes = await client.query('SELECT * FROM attentions WHERE id = $1 FOR UPDATE', [attentionId]);
      const attention = attRes.rows[0];
      if (!attention) throw notFound('Atención no encontrada.');
      if (attention.status === 'ANULADA') throw conflict('La atención ya está anulada.');
      if (attention.status !== 'CERRADA') throw conflict('Solo se puede anular una atención cerrada.');
      const itemsRes = await client.query('SELECT * FROM attention_items WHERE attention_id = $1', [attentionId]);
      const movesRes = await client.query(
        "SELECT product_id, quantity FROM stock_movements WHERE attention_id = $1 AND reason = 'CIERRE_ATENCION'",
        [attentionId]
      );
      const deducted = new Map<string, number>();
      for (const m of movesRes.rows) {
        deducted.set(m.product_id, (deducted.get(m.product_id) ?? 0) + Math.abs(Number(m.quantity)));
      }
      for (const item of itemsRes.rows) {
        if (!deducted.has(item.product_id)) continue;
        const prodRes = await client.query('SELECT current_stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
        const restored = Number(prodRes.rows[0].current_stock) + Number(item.quantity);
        await client.query('UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2', [restored, item.product_id]);
        await client.query(
          'INSERT INTO stock_movements (id, product_id, quantity, reason, attention_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
          [randomUUID(), item.product_id, item.quantity, 'ANULACION_ATENCION', attentionId, actor.id]
        );
        await writeAudit(client, actor, 'REVERSO_STOCK_ANULACION', 'PRODUCTO', item.product_id, `Reversión de ${item.quantity} unidad(es) por anulación de ${attentionId}.`);
      }
      await client.query("UPDATE attentions SET status = 'ANULADA', annulled_at = NOW() WHERE id = $1", [attentionId]);
      await writeAudit(
        client,
        actor,
        'ANULAR_ATENCION',
        'ATENCION',
        attentionId,
        deducted.size > 0
          ? 'Se anuló la atención y se restauró el stock.'
          : 'Se anuló la atención con receta sin movimientos de stock.'
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return getAttention(pool, actor, attentionId);
  });
}
