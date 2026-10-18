import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';

export async function createPatient(pool: DbPool, actor: AuthUser, input: any) {
  if (!can(actor.role, 'patients.write')) throw unprocessable('No tiene permiso para registrar pacientes.');
  const res = await pool.query(
    `INSERT INTO patients (id, name, species, breed, age, weight, owner_name, owner_rut, owner_phone, owner_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [randomUUID(), input.name.trim(), input.species.trim(), input.breed.trim(), input.age, input.weight, input.ownerName.trim(), input.ownerRut.trim(), input.ownerPhone.trim(), input.ownerEmail.trim().toLowerCase()]
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'CREAR_PACIENTE', 'PACIENTE', row.id, `Se registró el paciente ${row.name}.`);
  return row;
}

export async function updatePatient(pool: DbPool, actor: AuthUser, id: string, input: any) {
  if (!can(actor.role, 'patients.write')) throw forbidden();
  const map: Record<string, string> = {
    name: 'name', species: 'species', breed: 'breed', age: 'age', weight: 'weight',
    ownerName: 'owner_name', ownerRut: 'owner_rut', ownerPhone: 'owner_phone', ownerEmail: 'owner_email'
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, column] of Object.entries(map)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = $${i++}`);
      values.push(typeof input[key] === 'string' ? input[key].trim() : input[key]);
    }
  }
  if (fields.length === 0) throw unprocessable('Debe enviar al menos un campo para actualizar.');
  fields.push('updated_at = NOW()');
  values.push(id);
  const res = await pool.query(`UPDATE patients SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  const row = res.rows[0];
  if (!row) throw notFound('Paciente no encontrado.');
  await writeAudit(pool, actor, 'MODIFICAR_PACIENTE', 'PACIENTE', id, `Se modificó el paciente ${row.name}.`);
  return row;
}

export async function listPatients(pool: DbPool, actor: AuthUser) {
  if (!can(actor.role, 'patients.read')) throw forbidden();
  const res = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
  return res.rows;
}

export async function registerPet(
  pool: DbPool,
  actor: AuthUser,
  input: { clientId: string; name: string; species: string; breed: string; age: number; weight: number }
) {
  if (!can(actor.role, 'patients.write')) throw forbidden();
  const client = await pool.query('SELECT * FROM clients WHERE id = $1', [input.clientId]);
  if (!client.rows[0]) throw notFound('Cliente no encontrado.');
  const c = client.rows[0];
  const res = await pool.query(
    `INSERT INTO patients (id, client_id, name, species, breed, age, weight, owner_name, owner_rut, owner_phone, owner_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [randomUUID(), c.id, input.name.trim(), input.species.trim(), input.breed.trim(), input.age, input.weight, c.name, c.rut, c.phone, c.email]
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'CREAR_PACIENTE', 'PACIENTE', row.id, `Se registró la mascota ${row.name} del cliente ${c.name}.`);
  return row;
}

export async function getPatientWithHistory(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'patients.read')) throw forbidden();
  const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
  if (!patient.rows[0]) throw notFound('Paciente no encontrado.');
  const attentions = await pool.query('SELECT * FROM attentions WHERE patient_id = $1 ORDER BY created_at DESC', [id]);
  let appointments: any[] = [];
  let payments: any[] = [];
  try {
    appointments = (await pool.query('SELECT * FROM appointments WHERE patient_id = $1 ORDER BY scheduled_at DESC', [id])).rows;
    payments = (
      await pool.query(
        `SELECT p.* FROM payments p JOIN appointments a ON a.id = p.appointment_id WHERE a.patient_id = $1 ORDER BY p.created_at DESC`,
        [id]
      )
    ).rows;
  } catch {
    appointments = [];
    payments = [];
  }
  return { patient: patient.rows[0], attentions: attentions.rows, appointments, payments };
}
