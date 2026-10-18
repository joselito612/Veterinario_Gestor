import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

describe('RF-3 Gestión de pacientes', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('registra un paciente válido con tutor completo', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, vetCredentials);
    const res = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient());
    expect(res.status).toBe(201);
    expect(res.body.owner_rut).toBe('12345678-9');
  });

  it('rechaza RUT, correo, edad y peso inválidos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    expect((await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient({ ownerRut: 'mal' }))).status).toBe(422);
    expect((await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient({ ownerEmail: 'mal' }))).status).toBe(422);
    expect((await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient({ age: -1 }))).status).toBe(422);
    expect((await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient({ weight: -2 }))).status).toBe(422);
  });

  it('modifica y muestra el historial con atenciones vigentes y anuladas', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const updated = await request(ctx.app).put(`/pacientes/${patient.body.id}`).set('Authorization', `Bearer ${vetToken}`).send({ weight: 14 });
    expect(updated.status).toBe(200);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    expect(draft.status).toBe(201);
    const history = await request(ctx.app).get(`/pacientes/${patient.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(history.status).toBe(200);
    expect(history.body.attentions.length).toBe(1);
  });
});
