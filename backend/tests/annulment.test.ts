import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

const receta = (productId: string, quantity = 2) => ({ productId, quantity, dosis: 'Cada 12 horas por 7 días' });

describe('RF-5 Anulación de atenciones', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('anula una receta de veterinario restaurando el descuento parcial y conserva el historial', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Herida', treatment: 'Curación', items: [receta(product.body.id, 2)]
    });
    expect(closed.status).toBe(200);
    const afterClose = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(afterClose.body.current_stock)).toBe(3);
    const annulled = await request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`);
    expect(annulled.status).toBe(200);
    expect(annulled.body.status).toBe('ANULADA');
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(5);
    const fetched = await request(ctx.app).get(`/atenciones/${draft.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(fetched.body.status).toBe('ANULADA');
    expect(fetched.body.items.length).toBe(1);
    expect(fetched.body.items[0].dosis).toBeTruthy();
  });

  it('anula un consumo interno de admin restaurando el stock exacto', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Herida', treatment: 'Curación', items: [receta(product.body.id, 2)]
    });
    expect(closed.status).toBe(200);
    const afterClose = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(afterClose.body.current_stock)).toBe(3);
    const annulled = await request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`);
    expect(annulled.status).toBe(200);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(5);
  });

  it('rechaza la segunda anulación sin alterar el stock', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Fiebre', treatment: 'Control', items: [receta(product.body.id, 1)]
    });
    expect((await request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);
    const second = await request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${adminToken}`);
    expect(second.status).toBe(409);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(5);
  });

  it('impide que el veterinario anule', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Dolor', treatment: 'Analgésico', items: [receta(product.body.id, 1)]
    });
    const denied = await request(ctx.app).post(`/atenciones/${draft.body.id}/anulacion`).set('Authorization', `Bearer ${vetToken}`);
    expect(denied.status).toBe(403);
  });
});
