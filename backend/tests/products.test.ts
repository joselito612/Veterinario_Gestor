import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validProduct } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

describe('RF-2 Gestión de productos', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('registra un producto válido y lo deja consultable', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct());
    expect(created.status).toBe(201);
    const listed = await request(ctx.app).get('/productos').set('Authorization', `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.some((p: any) => p.sku === created.body.sku)).toBe(true);
  });

  it('rechaza datos inválidos, SKU duplicado y categoría fuera del catálogo', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const base = validProduct();
    const first = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(base);
    expect(first.status).toBe(201);
    const dup = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(base);
    expect(dup.status).toBe(409);
    const negative = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct({ currentStock: -1 }));
    expect(negative.status).toBe(422);
    const category = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(validProduct({ category: 'JUGUETES' }));
    expect(category.status).toBe(422);
  });

  it('permite al veterinario consultar pero no crear productos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const denied = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${vetToken}`).send(validProduct());
    expect(denied.status).toBe(403);
    const listed = await request(ctx.app).get('/productos').set('Authorization', `Bearer ${vetToken}`);
    expect(listed.status).toBe(200);
  });

  it('modifica un producto y registra la auditoría', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct());
    const updated = await request(ctx.app).put(`/productos/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ salePrice: 1999 });
    expect(updated.status).toBe(200);
    expect(Number(updated.body.sale_price)).toBe(1999);
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    expect(audit.body.some((e: any) => e.action === 'MODIFICAR_PRODUCTO')).toBe(true);
  });

  it('registra un accesorio sin datos de medicamento y conserva marca y unidad', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const { expirationDate, batch, sanitaryReg, ...rest } = validProduct({ category: 'ACCESORIOS' }) as any;
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send({
      ...rest, brand: 'Marca Prueba', description: 'Pelota resistente', unit: 'Unidad', subcategory: 'Juguetes'
    });
    expect(created.status).toBe(201);
    expect(created.body.brand).toBe('Marca Prueba');
    expect(created.body.unit).toBe('Unidad');
    expect(created.body.barcode).toBe(created.body.sku);
  });

  it('rechaza medicamentos sin lote, registro sanitario o vencimiento', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const { batch, ...sinLote } = validProduct();
    expect((await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(sinLote)).status).toBe(422);
    const { sanitaryReg, ...sinRegistro } = validProduct();
    expect((await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(sinRegistro)).status).toBe(422);
    const { expirationDate, ...sinVencimiento } = validProduct();
    expect((await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(sinVencimiento)).status).toBe(422);
    const sinBarras = validProduct({ sku: undefined, barcode: undefined } as any);
    delete (sinBarras as any).sku;
    expect((await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(sinBarras)).status).toBe(422);
  });

  it('rechaza código de barras duplicado y exige completar datos al cambiar a medicamento', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const token = await loginAs(ctx.app, adminCredentials);
    const base = validProduct({ category: 'ACCESORIOS', batch: '', sanitaryReg: '', expirationDate: undefined });
    delete (base as any).expirationDate;
    const first = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send(base);
    expect(first.status).toBe(201);
    const dup = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${token}`).send({ ...validProduct(), barcode: first.body.sku });
    expect(dup.status).toBe(409);
    const aMedicamento = await request(ctx.app).put(`/productos/${first.body.id}`).set('Authorization', `Bearer ${token}`).send({ category: 'medicamento' });
    expect(aMedicamento.status).toBe(422);
    const completo = await request(ctx.app).put(`/productos/${first.body.id}`).set('Authorization', `Bearer ${token}`).send({
      category: 'MEDICAMENTOS', batch: 'LOTE-9', sanitaryReg: 'RS-9', expirationDate: '2031-05-05'
    });
    expect(completo.status).toBe(200);
    expect(completo.body.batch).toBe('LOTE-9');
  });

  it('impide al veterinario modificar o dar de baja productos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct());
    expect((await request(ctx.app).put(`/productos/${created.body.id}`).set('Authorization', `Bearer ${vetToken}`).send({ salePrice: 5 })).status).toBe(403);
    expect((await request(ctx.app).patch(`/productos/${created.body.id}/baja`).set('Authorization', `Bearer ${vetToken}`)).status).toBe(403);
  });

  it('da de baja lógica sin eliminar el historial', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct());
    const off = await request(ctx.app).patch(`/productos/${created.body.id}/baja`).set('Authorization', `Bearer ${adminToken}`);
    expect(off.status).toBe(200);
    expect(off.body.is_active).toBe(false);
    const fetched = await request(ctx.app).get(`/productos/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(fetched.status).toBe(200);
  });

  it('filtra productos por categoría mostrando solo activos con indicador de stock', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);

    const med = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ category: 'MEDICAMENTOS', currentStock: 10, minStock: 2, name: 'Amoxicilina' }));
    expect(med.status).toBe(201);
    const acc = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ category: 'ACCESORIOS', currentStock: 0, minStock: 1, name: 'Collar' }));
    expect(acc.status).toBe(201);
    const ali = await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ category: 'ALIMENTOS', currentStock: 1, minStock: 5, name: 'Croqueta' }));
    expect(ali.status).toBe(201);

    // Dar de baja un medicamento para que no aparezca
    await request(ctx.app).patch(`/productos/${med.body.id}/baja`).set('Authorization', `Bearer ${adminToken}`);

    const listMed = await request(ctx.app).get('/productos?category=MEDICAMENTOS').set('Authorization', `Bearer ${adminToken}`);
    expect(listMed.status).toBe(200);
    expect(listMed.body.length).toBe(0);

    const listAcc = await request(ctx.app).get('/productos?category=ACCESORIOS').set('Authorization', `Bearer ${adminToken}`);
    expect(listAcc.status).toBe(200);
    expect(listAcc.body.length).toBe(1);
    expect(listAcc.body[0].stock_disponible).toBe('sin_stock');

    const listAli = await request(ctx.app).get('/productos?category=ALIMENTOS').set('Authorization', `Bearer ${adminToken}`);
    expect(listAli.status).toBe(200);
    expect(listAli.body.length).toBe(1);
    expect(listAli.body[0].stock_disponible).toBe('bajo_stock');

    const listAll = await request(ctx.app).get('/productos').set('Authorization', `Bearer ${adminToken}`);
    expect(listAll.status).toBe(200);
    expect(listAll.body.some((p: any) => p.category === 'ACCESORIOS' && p.stock_disponible === 'sin_stock')).toBe(true);
    expect(listAll.body.some((p: any) => p.category === 'ALIMENTOS' && p.stock_disponible === 'bajo_stock')).toBe(true);
    expect(listAll.body.some((p: any) => p.is_active === false)).toBe(false);
  });

  it('listado sin categoría devuelve todos los productos activos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ category: 'MEDICAMENTOS' }));
    await request(ctx.app).post('/productos').set('Authorization', `Bearer ${adminToken}`).send(validProduct({ category: 'ACCESORIOS' }));
    const list = await request(ctx.app).get('/productos').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
    list.body.forEach((p: any) => {
      expect(p.is_active).toBe(true);
      expect(['disponible', 'bajo_stock', 'sin_stock']).toContain(p.stock_disponible);
    });
  });
});
