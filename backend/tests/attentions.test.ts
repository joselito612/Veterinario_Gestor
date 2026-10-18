import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

async function setup(app: any, token: string) {
  const product = await request(app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct({ currentStock: 5 }));
  const patient = await request(app).post('/pacientes').set('Authorization', `Bearer ${token}`).send(validPatient());
  return { product: product.body, patient: patient.body };
}

const receta = (productId: string, quantity = 2) => ({ productId, quantity, dosis: 'Cada 12 horas por 7 días' });

describe('RF-4 Registro, cierre y receta de atenciones', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('crea un borrador sin alterar el stock', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe('BORRADOR');
  });

  it('valida diagnóstico, tratamiento, producto, cantidad y dosis obligatoria', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { product, patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const badItems = await request(ctx.app).put(`/atenciones/${draft.body.id}/insumos`).set('Authorization', `Bearer ${vetToken}`).send({ items: [{ productId: product.id, quantity: 0, dosis: 'Dosis' }] });
    expect(badItems.status).toBe(422);
    const sinDosis = await request(ctx.app).put(`/atenciones/${draft.body.id}/insumos`).set('Authorization', `Bearer ${vetToken}`).send({ items: [{ productId: product.id, quantity: 1 }] });
    expect(sinDosis.status).toBe(422);
    const dosisVacia = await request(ctx.app).put(`/atenciones/${draft.body.id}/insumos`).set('Authorization', `Bearer ${vetToken}`).send({ items: [{ productId: product.id, quantity: 1, dosis: '  ' }] });
    expect(dosisVacia.status).toBe(422);
    const badClose = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({ diagnosis: '', treatment: 'Reposo' });
    expect(badClose.status).toBe(422);
  });

  it('el veterinario cierra con receta descontando el stock disponible', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { product, patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Infección', treatment: 'Antibiótico', items: [receta(product.id, 2)]
    });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CERRADA');
    expect(closed.body.items[0].dosis).toBe('Cada 12 horas por 7 días');
    expect(closed.body.avisosStock.length).toBe(0);
    const current = await request(ctx.app).get(`/productos/${product.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(3);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(audit.body.some((e: any) => e.action === 'CERRAR_ATENCION')).toBe(true);
    expect(audit.body.some((e: any) => e.action === 'DESCUENTO_STOCK_ATENCION')).toBe(true);
  });

  it('el veterinario cierra con receta parcial cuando el stock no alcanza, con aviso detallado', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { product, patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Cirugía', treatment: 'Quirófano', items: [receta(product.id, 99)]
    });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CERRADA');
    expect(closed.body.avisosStock.length).toBeGreaterThan(0);
    expect(closed.body.avisosStock[0]).toContain('entregadas 5 de 99');
    expect(closed.body.avisosStock[0]).toContain('faltante 94');
    const current = await request(ctx.app).get(`/productos/${product.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(0);
  });

  it('con stock 15 y receta 16 descuenta 15, deja 0 e informa el faltante externo', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const fifteen = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 15 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Infección', treatment: 'Antibiótico', items: [receta(fifteen.body.id, 16)]
    });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CERRADA');
    expect(closed.body.avisosStock[0]).toContain('entregadas 15 de 16');
    expect(closed.body.avisosStock[0]).toContain('faltante 1');
    const current = await request(ctx.app).get(`/productos/${fifteen.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(0);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    const descuento = audit.body.find((e: any) => e.action === 'DESCUENTO_STOCK_ATENCION');
    expect(descuento.details).toContain('15');
    expect(descuento.details).toContain('faltantes 1');
  });

  it('con producto sin stock cierra sin descontar y avisa compra externa', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const empty = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 0 }));
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.body.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({
      diagnosis: 'Control', treatment: 'Reposo', items: [receta(empty.body.id, 2)]
    });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CERRADA');
    expect(closed.body.avisosStock[0]).toContain('sin stock');
    const current = await request(ctx.app).get(`/productos/${empty.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(0);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(audit.body.some((e: any) => e.action === 'DESCUENTO_STOCK_ATENCION')).toBe(false);
  });

  it('el administrador cierra con consumo interno y descuenta exacto', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { product, patient } = await setup(ctx.app, adminToken);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const closed = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Infección', treatment: 'Antibiótico', items: [receta(product.id, 2)]
    });
    expect(closed.status).toBe(200);
    const current = await request(ctx.app).get(`/productos/${product.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(current.body.current_stock)).toBe(3);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(audit.body.some((e: any) => e.action === 'DESCUENTO_STOCK_ATENCION')).toBe(true);
  });

  it('permite cerrar sin insumos y el admin bloquea todo descuento ante stock insuficiente', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { product, patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);

    const noItems = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const closedEmpty = await request(ctx.app).post(`/atenciones/${noItems.body.id}/cierre`).set('Authorization', `Bearer ${vetToken}`).send({ diagnosis: 'Chequeo', treatment: 'Sin tratamiento' });
    expect(closedEmpty.status).toBe(200);

    const other = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ currentStock: 10 }));
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${adminToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    const blocked = await request(ctx.app).post(`/atenciones/${draft.body.id}/cierre`).set('Authorization', `Bearer ${adminToken}`).send({
      diagnosis: 'Cirugía', treatment: 'Quirófano',
      items: [receta(product.id, 99), receta(other.body.id, 1)]
    });
    expect(blocked.status).toBe(422);
    const first = await request(ctx.app).get(`/productos/${product.id}`).set('Authorization', `Bearer ${adminToken}`);
    const second = await request(ctx.app).get(`/productos/${other.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(Number(first.body.current_stock)).toBe(5);
    expect(Number(second.body.current_stock)).toBe(10);
  });

  it('lista atenciones con paciente y estado para ambos roles y exige autenticación', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const { patient } = await setup(ctx.app, adminToken);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const draft = await request(ctx.app).post('/atenciones').set('Authorization', `Bearer ${vetToken}`).send({ patientId: patient.id, attentionDate: '2026-09-28' });
    expect(draft.status).toBe(201);

    const sinAuth = await request(ctx.app).get('/atenciones');
    expect(sinAuth.status).toBe(401);

    for (const token of [vetToken, adminToken]) {
      const list = await request(ctx.app).get('/atenciones').set('Authorization', `Bearer ${token}`);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);
      expect(list.body.length).toBe(1);
      expect(list.body[0].id).toBe(draft.body.id);
      expect(list.body[0].patient_name).toBe(patient.name);
      expect(list.body[0].status).toBe('BORRADOR');
    }
  });
});
