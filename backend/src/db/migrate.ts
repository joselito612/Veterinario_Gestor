import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DbPool } from './pool.js';

export interface MigrationFile {
  version: string;
  file: string;
}

export function migrationsDir(): string {
  const override = process.env.MIGRATIONS_DIR;
  if (override) return override;
  return join(__dirname, 'migrations');
}

export function listMigrationFiles(dir: string): MigrationFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ version: name.replace(/\.sql$/, ''), file: join(dir, name) }));
}

export async function applyMigrations(pool: DbPool, dir?: string): Promise<string[]> {
  const folder = dir ?? migrationsDir();
  await ensureMigrationsTable(pool);
  const appliedRows = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.rows.map((row: any) => row.version as string));
  const pending = listMigrationFiles(folder).filter((m) => !applied.has(m.version));
  const done: string[] = [];
  for (const migration of pending) {
    await applyOne(pool, migration);
    done.push(migration.version);
  }
  return done;
}

async function ensureMigrationsTable(pool: DbPool): Promise<void> {
  try {
    await pool.query('SELECT version FROM schema_migrations LIMIT 1');
    return;
  } catch {
    // La tabla no existe: se crea. Se evita CREATE TABLE IF NOT EXISTS
    // porque el adaptador de pruebas lo revalida aunque ya exista.
  }
  await pool.query(
    'CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'
  );
}

async function applyOne(pool: DbPool, migration: MigrationFile): Promise<void> {
  const sql = readFileSync(migration.file, 'utf8');
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const statement of statements) {
      if (/^CREATE EXTENSION/i.test(statement)) {
        if (!pool.isMemory) await client.query(statement);
        continue;
      }
      await client.query(statement);
    }
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignorar: el error importante es el de la migración.
    }
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo aplicar la migración ${migration.version}: ${detail}`);
  } finally {
    client.release();
  }
}
