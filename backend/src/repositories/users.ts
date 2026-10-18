import { randomUUID } from 'node:crypto';
import type { DbClient } from '../db/pool.js';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'VETERINARIO';
  is_active: boolean;
}

export async function findUserByEmail(db: DbClient, email: string): Promise<UserRow | null> {
  const res = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return (res.rows[0] as UserRow) ?? null;
}

export async function findUserById(db: DbClient, id: string): Promise<UserRow | null> {
  const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return (res.rows[0] as UserRow) ?? null;
}

export async function createUser(
  db: DbClient,
  input: { name: string; email: string; passwordHash: string; role: 'ADMIN' | 'VETERINARIO' }
): Promise<UserRow> {
  const res = await db.query(
    'INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
    [randomUUID(), input.name, input.email.toLowerCase(), input.passwordHash, input.role]
  );
  return res.rows[0] as UserRow;
}

export async function deactivateUser(db: DbClient, id: string): Promise<UserRow | null> {
  const res = await db.query('UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
  return (res.rows[0] as UserRow) ?? null;
}

export async function listUsers(db: DbClient): Promise<UserRow[]> {
  const res = await db.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at ASC');
  return res.rows as UserRow[];
}
