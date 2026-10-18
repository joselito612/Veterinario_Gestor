import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, loginAs, validProduct } from './helpers.js';
import { applyMigrations } from '../src/db/migrate.js';
import type { DbPool } from '../src/db/pool.js';

describe('RF-10 Migraciones y persistencia', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('aplica las migraciones y las registra en la tabla de control', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const rows = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows[0].version).toMatch(/^001/);
  });

  it('re-ejecutar las migraciones no duplica ni falla y conserva los datos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct());
    expect(created.status).toBe(201);
    const again = await applyMigrations(pool);
    expect(again).toEqual([]);
    const kept = await pool.query('SELECT id FROM products WHERE id = $1', [created.body.id]);
    expect(kept.rows.length).toBe(1);
  });

  it('lo generado por el sistema queda guardado en la base de datos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct());
    expect(created.status).toBe(201);
    const inDb = await pool.query('SELECT sku, name FROM products WHERE id = $1', [created.body.id]);
    expect(inDb.rows[0]?.sku).toBe(created.body.sku);
    const audit = await pool.query('SELECT action FROM audit_logs WHERE entity_id = $1', [created.body.id]);
    expect(audit.rows.length).toBeGreaterThan(0);
  });

  it('una migración inválida aborta con un mensaje en español', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const dir = mkdtempSync(join(tmpdir(), 'mig-con-falla-'));
    writeFileSync(join(dir, '999_falla.sql'), 'CREATE TABLE debe_fallar (id TEXT);\nESTO NO ES SQL VALIDO;');
    await expect(applyMigrations(pool, dir)).rejects.toThrow(/No se pudo aplicar la migración 999_falla/);
  });
});
