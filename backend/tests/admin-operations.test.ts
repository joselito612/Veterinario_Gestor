import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, adminCredentials, vetCredentials, loginAs, validPatient } from './helpers.js';
import type { DbPool } from '../src/db/pool.js';

function validClient(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Juan Pérez',
    rut: '12345678-9',
    phone: '+56912345678',
    email: 'juan@correo.cl',
    ...overrides
  };
}

function futureISO(days = 2): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('RF-8 Administración de clientes, mascotas, citas y check-in', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('registra un cliente válido y rechaza RUT duplicado o inválido', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const created = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${adminToken}`).send(validClient());
    expect(created.status).toBe(201);
    expect(created.body.rut).toBe('12345678-9');
    const dup = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${adminToken}`).send(validClient());
    expect(dup.status).toBe(409);
    const bad = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${adminToken}`).send(validClient({ rut: 'invalido', email: 'mal' }));
    expect(bad.status).toBe(422);
  });

  it('impide que el veterinario registre clientes', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const res = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${vetToken}`).send(validClient());
    expect(res.status).toBe(403);
  });

  it('registra una mascota asociada al cliente y modifica datos básicos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const client = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${adminToken}`).send(validClient());
    const pet = await request(ctx.app).post('/mascotas').set('Authorization', `Bearer ${adminToken}`).send({
      clientId: client.body.id, name: 'Firulais', species: 'Canino', breed: 'Mestizo', age: 3, weight: 12.5
    });
    expect(pet.status).toBe(201);
    expect(pet.body.client_id).toBe(client.body.id);
    expect(pet.body.owner_rut).toBe('12345678-9');
    const missing = await request(ctx.app).post('/mascotas').set('Authorization', `Bearer ${adminToken}`).send({
      clientId: '00000000-0000-0000-0000-000000000000', name: 'Otro', species: 'Felino', breed: 'Siamés', age: 1, weight: 4
    });
    expect(missing.status).toBe(404);
    const updated = await request(ctx.app).put(`/clientes/${client.body.id}`).set('Authorization', `Bearer ${adminToken}`).send({ phone: '+56987654321' });
    expect(updated.status).toBe(200);
    expect(updated.body.phone).toBe('+56987654321');
    const withPets = await request(ctx.app).get(`/clientes/${client.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(withPets.body.pets.length).toBe(1);
  });

  it('agenda citas futuras y rechaza pasadas o inválidas; el veterinario no puede agendar', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const ok = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Control anual'
    });
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('PROGRAMADA');
    const past = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: new Date(Date.now() - 86400000).toISOString(), reason: 'Tarde'
    });
    expect(past.status).toBe(422);
    const emptyReason = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: '  '
    });
    expect(emptyReason.status).toBe(422);
    const denied = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${vetToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Control'
    });
    expect(denied.status).toBe(403);
  });

  it('realiza el check-in una sola vez y el veterinario no puede hacerlo', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const cita = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Vacuna'
    });
    const checkin = await request(ctx.app).post(`/citas/${cita.body.id}/checkin`).set('Authorization', `Bearer ${adminToken}`);
    expect(checkin.status).toBe(200);
    expect(checkin.body.status).toBe('REGISTRADA');
    const second = await request(ctx.app).post(`/citas/${cita.body.id}/checkin`).set('Authorization', `Bearer ${adminToken}`);
    expect(second.status).toBe(409);
    const other = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Otra'
    });
    const vetDenied = await request(ctx.app).post(`/citas/${other.body.id}/checkin`).set('Authorization', `Bearer ${vetToken}`);
    expect(vetDenied.status).toBe(403);
  });
});

describe('RF-9 Historial de la mascota e historial de pagos', () => {
  let pool: DbPool | undefined;
  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('la ficha muestra citas y pagos; registra pagos válidos y rechaza inválidos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const client = await request(ctx.app).post('/clientes').set('Authorization', `Bearer ${adminToken}`).send(validClient());
    const pet = await request(ctx.app).post('/mascotas').set('Authorization', `Bearer ${adminToken}`).send({
      clientId: client.body.id, name: 'Firulais', species: 'Canino', breed: 'Mestizo', age: 3, weight: 12.5
    });
    const cita = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: pet.body.id, scheduledAt: futureISO(), reason: 'Consulta'
    });
    const pago = await request(ctx.app).post('/pagos').set('Authorization', `Bearer ${adminToken}`).send({
      appointmentId: cita.body.id, amount: 25000, method: 'Tarjeta'
    });
    expect(pago.status).toBe(201);
    const badAmount = await request(ctx.app).post('/pagos').set('Authorization', `Bearer ${adminToken}`).send({
      appointmentId: cita.body.id, amount: 0, method: 'Efectivo'
    });
    expect(badAmount.status).toBe(422);
    const missing = await request(ctx.app).post('/pagos').set('Authorization', `Bearer ${adminToken}`).send({
      appointmentId: '00000000-0000-0000-0000-000000000000', amount: 1000, method: 'Efectivo'
    });
    expect(missing.status).toBe(404);
    const ficha = await request(ctx.app).get(`/pacientes/${pet.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(ficha.status).toBe(200);
    expect(ficha.body.appointments.length).toBe(1);
    expect(ficha.body.payments.length).toBe(1);
    expect(ficha.body.payments[0].method).toBe('Tarjeta');
    const byPatient = await request(ctx.app).get(`/pagos?pacienteId=${pet.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(byPatient.body.length).toBe(1);
    const byAppointment = await request(ctx.app).get(`/pagos?citaId=${cita.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(byAppointment.body.length).toBe(1);
  });

  it('los pagos son inmutables y el veterinario no puede registrarlos ni consultarlos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const vetToken = await loginAs(ctx.app, vetCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const cita = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Consulta'
    });
    const vetPay = await request(ctx.app).post('/pagos').set('Authorization', `Bearer ${vetToken}`).send({
      appointmentId: cita.body.id, amount: 10000, method: 'Efectivo'
    });
    expect(vetPay.status).toBe(403);
    const vetList = await request(ctx.app).get('/pagos').set('Authorization', `Bearer ${vetToken}`);
    expect(vetList.status).toBe(403);
    expect((await request(ctx.app).put('/pagos/1').set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
    expect((await request(ctx.app).delete('/pagos/1').set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
  });

  it('la auditoría registra agenda, check-in y pagos', async () => {
    const ctx = await createTestApp();
    pool = ctx.pool;
    const adminToken = await loginAs(ctx.app, adminCredentials);
    const patient = await request(ctx.app).post('/pacientes').set('Authorization', `Bearer ${adminToken}`).send(validPatient());
    const cita = await request(ctx.app).post('/citas').set('Authorization', `Bearer ${adminToken}`).send({
      patientId: patient.body.id, scheduledAt: futureISO(), reason: 'Consulta'
    });
    await request(ctx.app).post(`/citas/${cita.body.id}/checkin`).set('Authorization', `Bearer ${adminToken}`);
    await request(ctx.app).post('/pagos').set('Authorization', `Bearer ${adminToken}`).send({
      appointmentId: cita.body.id, amount: 15000, method: 'Efectivo'
    });
    const audit = await request(ctx.app).get('/auditoria').set('Authorization', `Bearer ${adminToken}`);
    const actions = audit.body.map((e: any) => e.action);
    expect(actions).toContain('AGENDAR_CITA');
    expect(actions).toContain('CHECKIN_CITA');
    expect(actions).toContain('REGISTRAR_PAGO');
  });
});
