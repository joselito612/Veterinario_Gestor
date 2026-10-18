import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

const receta = (productId: string, quantity = 1) => ({ productId, quantity, dosis: 'Cada 8 horas por 5 días' });

describe('Trazabilidad histórica de insumos (T20, T29)', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('conserva la foto del insumo y la dosis tras modificar y dar de baja el producto', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Control', treatment: 'Dosis', items: [receta(product.body.id, 1)]
    });
    expect(closed.status).toBe(200);
    const originalName = closed.body.items[0].product_name;

    await request(ctx.app).put(`/productos/${product.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Nombre modificado', salePrice: 9999 });
    await request(ctx.app).patch(`/productos/${product.body.id}/baja`).set('Authorization', `Bearer ${adminToken}`);

    const fetched = await request(ctx.app).get(`/atenciones/${draft.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.items[0].product_name).toBe(originalName);
    expect(fetched.body.items[0].dosis).toBe('Cada 8 horas por 5 días');
  });

  it('rechaza productos dados de baja en nuevas recetas', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const product = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 5 }));
    await request(ctx.app).patch(`/productos/${product.body.id}/baja`).set('Authorization', `Bearer ${adminToken}`);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${vetToken}`).send(validPatient());
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const blocked = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Control', treatment: 'Dosis', items: [receta(product.body.id, 1)]
    });
    expect(blocked.status).toBe(422);
  });
});
