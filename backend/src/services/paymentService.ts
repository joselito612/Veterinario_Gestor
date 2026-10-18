import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';

export async function registerPayment(
  pool: DbPool,
  actor: AuthUser,
  input: { appointmentId: string; amount: number; method: string; paidAt?: string }
) {
  if (!can(actor.role, 'payments.write')) throw forbidden();
  const appt = await pool.query('SELECT id FROM appointments WHERE id = $1', [input.appointmentId]);
  if (!appt.rows[0]) throw notFound('Cita no encontrada.');
  if (!(input.amount > 0)) throw unprocessable('Monto debe ser mayor que cero.');
  if (!input.method || input.method.trim().length === 0) throw unprocessable('Método de pago no puede estar vacío.');
  let paidAt = new Date().toISOString();
  if (input.paidAt !== undefined) {
    const t = Date.parse(input.paidAt);
    if (Number.isNaN(t)) throw unprocessable('Fecha de pago debe ser válida.');
    paidAt = new Date(t).toISOString();
  }
  const res = await pool.query(
    `INSERT INTO payments (id, appointment_id, amount, method, paid_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [randomUUID(), input.appointmentId, input.amount, input.method.trim(), paidAt, actor.id]
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'REGISTRAR_PAGO', 'PAGO', row.id, `Se registró un pago de ${row.amount} por la cita ${input.appointmentId}.`);
  return row;
}

export async function listPayments(pool: DbPool, actor: AuthUser, filters: { appointmentId?: string; patientId?: string }) {
  if (!can(actor.role, 'payments.read')) throw forbidden();
  if (filters.appointmentId) {
    const res = await pool.query('SELECT * FROM payments WHERE appointment_id = $1 ORDER BY created_at DESC', [filters.appointmentId]);
    return res.rows;
  }
  if (filters.patientId) {
    const res = await pool.query(
      `SELECT p.* FROM payments p JOIN appointments a ON a.id = p.appointment_id
       WHERE a.patient_id = $1 ORDER BY p.created_at DESC`,
      [filters.patientId]
    );
    return res.rows;
  }
  const res = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
  return res.rows;
}
