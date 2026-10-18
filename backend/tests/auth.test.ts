import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

describe('RF-1 Autenticación y acceso', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('permite acceder con credenciales válidas según el rol', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const admin = await request(ctx.app).post('/auth/login').send(adminCredentials);
    expect(admin.status).toBe(200);
    expect(admin.body.user.role).toBe('ADMIN');
    const vet = await request(ctx.app).post('/auth/login').send(vetCredentials);
    expect(vet.status).toBe(200);
    expect(vet.body.user.role).toBe('VETERINARIO');
  });

  it('rechaza credenciales inválidas sin revelar información sensible', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const res = await request(ctx.app).post('/auth/login').send({ email: 'admin@veterinaria.cl', password: 'ClaveMala1!' });
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Credenciales inválidas.');
  });

  it('bloquea a personas no autenticadas', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const res = await request(ctx.app).get('/productos');
    expect(res.status).toBe(401);
  });

  it('bloquea acciones sin permiso y reserva la auditoría al administrador', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${vetToken}`);
    expect(audit.status).toBe(403);
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const auditAdmin = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(auditAdmin.status).toBe(200);
  });

  it('solo el administrador puede gestionar cuentas e impide el acceso a desactivadas', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const forbidden = await request(ctx.app).post('/usuarios').set('Authorization', `Bearer ${vetToken}`).send({
      name: 'Otro', email: 'otro@correo.cl', password: 'Clave123!', role: 'VETERINARIO'
    });
    expect(forbidden.status).toBe(403);

    const adminToken = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/usuarios').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Temporal', email: 'temporal@correo.cl', password: 'Clave123!', role: 'VETERINARIO'
    });
    expect(created.status).toBe(201);
    const off = await request(ctx.app).patch(`/usuarios/${created.body.id}/desactivar`).set('Authorization', `Bearer ${adminToken}`);
    expect(off.status).toBe(200);
    const loginOff = await request(ctx.app).post('/auth/login').send({ email: 'temporal@correo.cl', password: 'Clave123!' });
    expect(loginOff.status).toBe(401);
  });
});
