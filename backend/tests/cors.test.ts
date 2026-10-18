import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

describe('RNF Acceso CORS del frontend a la API', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('responde al preflight OPTIONS de /auth/login con Access-Control-Allow-Origin', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const res = await request(ctx.app)
      .options('/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('incluye Access-Control-Allow-Origin en el login real', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const res = await request(ctx.app)
      .post('/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'admin@veterinaria.cl', password: 'Admin123!' });
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
