import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { DbPool } from './pool.js';
import { applyMigrations } from './migrate.js';

export async function initDatabase(pool: DbPool): Promise<void> {
  await applyMigrations(pool);
  await ensureSeedUser(pool, 'Administradora', 'admin@veterinaria.cl', 'Admin123!', 'ADMIN');
  await ensureSeedUser(pool, 'Veterinario', 'vet@veterinaria.cl', 'Vet123!', 'VETERINARIO');
}

async function ensureSeedUser(pool: DbPool, name: string, email: string, password: string, role: string): Promise<void> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
    [randomUUID(), name, email.toLowerCase(), passwordHash, role]
  );
}
