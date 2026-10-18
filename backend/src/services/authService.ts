import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { DbPool } from '../db/pool.js';
import { unauthorized, conflict, forbidden, notFound } from '../domain/errors.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';
import { findUserByEmail, findUserById, createUser, deactivateUser, listUsers } from '../repositories/users.js';
import { writeAudit } from '../repositories/audit.js';

function secret(): string {
  return process.env.JWT_SECRET ?? 'secreto-temporal-solo-pruebas';
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: '8h' });
}

export function verifyToken(token: string): { id: string; role: AuthUser['role'] } {
  return jwt.verify(token, secret()) as { id: string; role: AuthUser['role'] };
}

export async function login(pool: DbPool, email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const row = await findUserByEmail(pool, email);
  if (!row || !row.is_active) throw unauthorized('Credenciales inválidas.');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw unauthorized('Credenciales inválidas.');
  const user: AuthUser = { id: row.id, name: row.name, email: row.email, role: row.role };
  return { token: signToken(user), user };
}

export async function loadAuthUser(pool: DbPool, id: string): Promise<AuthUser> {
  const row = await findUserById(pool, id);
  if (!row || !row.is_active) throw unauthorized('Sesión no válida.');
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function registerUser(
  pool: DbPool,
  actor: AuthUser,
  input: { name: string; email: string; password: string; role: AuthUser['role'] }
): Promise<AuthUser> {
  if (!can(actor.role, 'users.manage')) throw forbidden();
  const existing = await findUserByEmail(pool, input.email);
  if (existing) throw conflict('Ya existe un usuario con ese correo.');
  const passwordHash = await bcrypt.hash(input.password, 10);
  const row = await createUser(pool, { ...input, passwordHash });
  await writeAudit(pool, actor, 'CREAR_USUARIO', 'USUARIO', row.id, `Se creó el usuario ${row.email} con rol ${row.role}.`);
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function deactivate(pool: DbPool, actor: AuthUser, id: string): Promise<void> {
  if (!can(actor.role, 'users.manage')) throw forbidden();
  if (actor.id === id) throw conflict('No puede desactivar su propia cuenta.');
  const row = await deactivateUser(pool, id);
  if (!row) throw notFound('Usuario no encontrado.');
  await writeAudit(pool, actor, 'DESACTIVAR_USUARIO', 'USUARIO', id, `Se desactivó el usuario ${row.email}.`);
}

export async function listAllUsers(pool: DbPool, actor: AuthUser) {
  if (!can(actor.role, 'users.manage')) throw forbidden();
  return listUsers(pool);
}
