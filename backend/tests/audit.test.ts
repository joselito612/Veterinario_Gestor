import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

describe('RF-6 Auditoría', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('registra eventos completos y conserva la trazabilidad atención-insumos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 4 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Otitis', treatment: 'Gotas', items: [{ productId: product.body.id, quantity: 1, dosis: '2 gotas cada 8 horas' }]
    });
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(audit.status).toBe(200);
    for (const event of audit.body) {
      expect(event.created_at ?? event.createdAt).toBeTruthy();
      expect(event.user_name ?? event.userName).toBeTruthy();
      expect(event.action).toBeTruthy();
      expect(event.entity).toBeTruthy();
      expect(event.details).toBeTruthy();
    }
    const actions = audit.body.map((e: any) => e.action);
    expect(actions).toContain('CREAR_PRODUCTO');
    expect(actions).toContain('CERRAR_ATENCION');
    expect(actions).toContain('DESCUENTO_STOCK_ATENCION');
  });

  it('la receta de veterinario audita el cierre con descuento parcial de stock', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 4 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Otitis', treatment: 'Gotas', items: [{ productId: product.body.id, quantity: 1, dosis: '2 gotas cada 8 horas' }]
    });
    expect(closed.status).toBe(200);
    const current = await request(ctx.app).get(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(3);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    const actions = audit.body.map((e: any) => e.action);
    expect(actions).toContain('CERRAR_ATENCION');
    expect(actions).toContain('DESCUENTO_STOCK_ATENCION');
  });

  it('no expone actualización ni eliminación de eventos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    expect((await request(ctx.app).put('/auditoria/1').set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
    expect((await request(ctx.app).delete('/auditoria/1').set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
  });
});
