import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { conflict, forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';

export async function scheduleAppointment(
  pool: DbPool,
  actor: AuthUser,
  input: { patientId: string; scheduledAt: string; reason: string }
) {
  if (!can(actor.role, 'appointments.write')) throw forbidden();
  const patient = await pool.query('SELECT id FROM patients WHERE id = $1', [input.patientId]);
  if (!patient.rows[0]) throw notFound('Paciente no encontrado.');
  const when = Date.parse(input.scheduledAt);
  if (Number.isNaN(when)) throw unprocessable('Fecha y hora deben ser válidas.');
  if (when <= Date.now()) throw unprocessable('La cita debe agendarse en una fecha y hora futuras.');
  const res = await pool.query(
    `INSERT INTO appointments (id, patient_id, scheduled_at, reason, status, created_by)
     VALUES ($1,$2,$3,$4,'PROGRAMADA',$5) RETURNING *`,
    [randomUUID(), input.patientId, new Date(when).toISOString(), input.reason.trim(), actor.id]
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'AGENDAR_CITA', 'CITA', row.id, `Se agendó la cita para el paciente ${input.patientId}.`);
  return row;
}

export async function checkinAppointment(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'appointments.checkin')) throw forbidden();
  const res = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  const row = res.rows[0];
  if (!row) throw notFound('Cita no encontrada.');
  if (row.status !== 'PROGRAMADA') throw conflict('Solo se puede hacer check-in de una cita programada.');
  const updated = await pool.query(
    `UPDATE appointments SET status = 'REGISTRADA', checked_in_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  await writeAudit(pool, actor, 'CHECKIN_CITA', 'CITA', id, 'Se registró la asistencia de la cita.');
  return updated.rows[0];
}

export async function cancelAppointment(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'appointments.write')) throw forbidden();
  const res = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  const row = res.rows[0];
  if (!row) throw notFound('Cita no encontrada.');
  if (row.status === 'ATENDIDA' || row.status === 'CANCELADA') {
    throw conflict('La cita ya fue atendida o cancelada.');
  }
  const updated = await pool.query(
    `UPDATE appointments SET status = 'CANCELADA' WHERE id = $1 RETURNING *`,
    [id]
  );
  await writeAudit(pool, actor, 'CANCELAR_CITA', 'CITA', id, 'Se canceló la cita.');
  return updated.rows[0];
}

export async function listAppointments(pool: DbPool, actor: AuthUser, patientId?: string) {
  if (!can(actor.role, 'clients.read')) throw forbidden();
  if (patientId) {
    const res = await pool.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY scheduled_at DESC', [patientId]);
    return res.rows;
  }
  const res = await pool.query('SELECT * FROM appointments ORDER BY scheduled_at DESC');
  return res.rows;
}

export async function getAppointment(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'clients.read')) throw forbidden();
  const res = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  if (!res.rows[0]) throw notFound('Cita no encontrada.');
  const payments = await pool.query('SELECT * FROM payments WHERE appointment_id = $1 ORDER BY created_at DESC', [id]);
  return { ...res.rows[0], payments: payments.rows };
}
