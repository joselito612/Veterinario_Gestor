import { randomUUID } from 'node:crypto';
import type { DbPool } from '../db/pool.js';
import { conflict, forbidden, notFound, unprocessable } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { writeAudit } from '../repositories/audit.js';

export function normalizeRut(rut: string): string {
  return rut.trim().toUpperCase();
}

export async function createClient(pool: DbPool, actor: AuthUser, input: { name: string; rut: string; phone: string; email: string }) {
  if (!can(actor.role, 'clients.write')) throw forbidden();
  const rut = normalizeRut(input.rut);
  const dup = await pool.query('SELECT id FROM clients WHERE rut = $1', [rut]);
  if (dup.rows[0]) throw conflict('Ya existe un cliente con ese RUT.');
  const res = await pool.query(
    `INSERT INTO clients (id, name, rut, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [randomUUID(), input.name.trim(), rut, input.phone.trim(), input.email.trim().toLowerCase()]
  );
  const row = res.rows[0];
  await writeAudit(pool, actor, 'CREAR_CLIENTE', 'CLIENTE', row.id, `Se registró el cliente ${row.name} (${row.rut}).`);
  return row;
}

export async function updateClient(pool: DbPool, actor: AuthUser, id: string, input: { name?: string; rut?: string; phone?: string; email?: string }) {
  if (!can(actor.role, 'clients.write')) throw forbidden();
  if (input.rut !== undefined) {
    const rut = normalizeRut(input.rut);
    const dup = await pool.query('SELECT id FROM clients WHERE rut = $1 AND id <> $2', [rut, id]);
    if (dup.rows[0]) throw conflict('Ya existe otro cliente con ese RUT.');
    input = { ...input, rut };
  }
  const map: Record<string, string> = { name: 'name', rut: 'rut', phone: 'phone', email: 'email' };
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, column] of Object.entries(map)) {
    const v = (input as any)[key];
    if (v !== undefined) {
      fields.push(`${column} = $${i++}`);
      values.push(typeof v === 'string' ? (key === 'email' ? v.trim().toLowerCase() : v.trim()) : v);
    }
  }
  if (fields.length === 0) throw unprocessable('Debe enviar al menos un campo para actualizar.');
  fields.push('updated_at = NOW()');
  values.push(id);
  const res = await pool.query(`UPDATE clients SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  const row = res.rows[0];
  if (!row) throw notFound('Cliente no encontrado.');
  await writeAudit(pool, actor, 'MODIFICAR_CLIENTE', 'CLIENTE', id, `Se modificó el cliente ${row.name}.`);
  return row;
}

export async function listClients(pool: DbPool, actor: AuthUser) {
  if (!can(actor.role, 'clients.read')) throw forbidden();
  const res = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
  return res.rows;
}

export async function getClientWithPets(pool: DbPool, actor: AuthUser, id: string) {
  if (!can(actor.role, 'clients.read')) throw forbidden();
  const client = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
  if (!client.rows[0]) throw notFound('Cliente no encontrado.');
  const pets = await pool.query('SELECT * FROM patients WHERE client_id = $1 ORDER BY created_at DESC', [id]);
  return { client: client.rows[0], pets: pets.rows };
}
