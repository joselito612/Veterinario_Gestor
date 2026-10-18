import { createPool, type DbPool } from '../src/db/pool.js';
import { initDatabase } from '../src/db/seed.js';
import { buildApp } from '../src/http/app.js';

export async function createTestApp() {
  process.env.USE_PG_MEMORY = 'true';
  process.env.JWT_SECRET = 'secreto-pruebas';
  const pool: DbPool = createPool();
  await initDatabase(pool);
  const app = buildApp(pool);
  return { app, pool };
}

export const adminCredentials = { email: 'admin@veterinaria.cl', password: 'Admin123!' };
export const vetCredentials = { email: 'vet@veterinaria.cl', password: 'Vet123!' };

export async function loginAs(app: any, credentials: { email: string; password: string }): Promise<string> {
  const request = (await import('supertest')).default;
  const res = await request(app).post('/auth/login').send(credentials);
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    sku: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: 'Antibiótico prueba',
    category: 'MEDICAMENTOS',
    unit: 'Unidad',
    batch: 'LOTE-001',
    sanitaryReg: 'RS-12345',
    costPrice: 1000,
    salePrice: 1500,
    currentStock: 10,
    minStock: 2,
    expirationDate: '2030-01-01',
    supplier: 'Proveedor prueba',
    ...overrides
  };
}

export function validPatient(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Firulais',
    species: 'Canino',
    breed: 'Mestizo',
    age: 3,
    weight: 12.5,
    ownerName: 'María González',
    ownerRut: '12345678-9',
    ownerPhone: '+56912345678',
    ownerEmail: 'maria@correo.cl',
    ...overrides
  };
}
