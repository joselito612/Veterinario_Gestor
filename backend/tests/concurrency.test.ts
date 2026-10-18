import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

const receta = (productId: string, quantity = 2) => ({ productId, quantity, dosis: 'Cada 12 horas por 7 días' });

describe('Concurrencia de stock y anulación', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('solo un cierre de consumo interno se completa cuando compiten por el último insumo', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 2 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const first = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const second = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const payload = (id: string) =>
      request(ctx.app).post(`/atenciones/${id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
        diagnosis: 'Urgencia', treatment: 'Dosis', items: [receta(product.body.id, 2)]
      });
    const [a, b] = await Promise.all([payload(first.body.id), payload(second.body.id)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 422]);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(0);
  });

  it('las recetas concurrentes de veterinario descuentan parcial y ambas se cierran', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 2 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const first = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const second = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const payload = (id: string) =>
      request(ctx.app).post(`/atenciones/${id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
        diagnosis: 'Urgencia', treatment: 'Dosis', items: [receta(product.body.id, 2)]
      });
    const [a, b] = await Promise.all([payload(first.body.id), payload(second.body.id)]);
    expect([a.status, b.status].sort()).toEqual([200, 200]);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(0);
  });

  it('solo una anulación concurrente produce la reversión', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Control', treatment: 'Dosis', items: [receta(product.body.id, 2)]
    });
    const [a, b] = await Promise.all([
      request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`),
      request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`)
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(5);
  });
});
