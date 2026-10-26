import cors from 'cors';
import express from 'express';
import type { DbPool } from '../db/pool.js';
import { AppError } from '../domain/errors.js';
import {
  appointmentSchema,
  attentionCloseSchema,
  attentionCreateSchema,
  attentionItemsSchema,
  clientSchema,
  clientUpdateSchema,
  loginSchema,
  patientSchema,
  patientUpdateSchema,
  paymentSchema,
  petSchema,
  productSchema,
  productUpdateSchema,
  userCreateSchema
} from '../domain/validators.js';
import { login, registerUser, deactivate, listAllUsers, loadAuthUser } from '../services/authService.js';
import { createProduct, updateProduct, listProducts, getProduct, deactivateProduct } from '../services/productService.js';
import { createPatient, updatePatient, listPatients, getPatientWithHistory, registerPet } from '../services/patientService.js';
import { createClient, updateClient, listClients, getClientWithPets } from '../services/clientService.js';
import { scheduleAppointment, checkinAppointment, cancelAppointment, listAppointments, getAppointment } from '../services/appointmentService.js';
import { registerPayment, listPayments } from '../services/paymentService.js';
import { createDraft, setDraftItems, getAttention, listAttentions, closeAttention, annulAttention } from '../services/attentionService.js';
import { listAudit } from '../repositories/audit.js';
import { listMovimientos } from '../services/movementService.js';
import { can } from '../domain/permissions.js';
import type { AuthUser } from '../domain/types.js';

function parseZod(schema: any, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((i: any) => i.message);
    const err = new AppError(messages.join(' '), 422, result.error.issues);
    throw err;
  }
  return result.data;
}

export function buildApp(pool: DbPool) {
  const app = express();
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.use(
    cors({
      origin: allowedOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
  app.use(express.json());

  app.get('/salud', (_req, res) => res.json({ estado: 'ok' }));

  async function auth(req: any, _res: any, next: any) {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw new AppError('Debe iniciar sesión.', 401);
      const { verifyToken } = await import('../services/authService.js');
      const payload = verifyToken(token);
      req.user = await loadAuthUser(pool, payload.id);
      next();
    } catch (err: any) {
      if (err?.name === 'JsonWebTokenError') return next(new AppError('Sesión no válida.', 401));
      next(err);
    }
  }

  app.post('/auth/login', async (req, res, next) => {
    try {
      const body = parseZod(loginSchema, req.body);
      const result = await login(pool, body.email, body.password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/usuarios', auth, async (req: any, res, next) => {
    try {
      res.json(await listAllUsers(pool, req.user as AuthUser));
    } catch (err) {
      next(err);
    }
  });

  app.post('/usuarios', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(userCreateSchema, req.body);
      const created = await registerUser(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/usuarios/:id/desactivar', auth, async (req: any, res, next) => {
    try {
      await deactivate(pool, req.user as AuthUser, req.params.id);
      res.json({ mensaje: 'Usuario desactivado.' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/productos', auth, async (req: any, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      res.json(await listProducts(pool, req.user as AuthUser, category));
    } catch (err) {
      next(err);
    }
  });

  app.post('/productos', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(productSchema, req.body);
      const created = await createProduct(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/productos/:id', auth, async (req: any, res, next) => {
    try {
      res.json(await getProduct(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.put('/productos/:id', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(productUpdateSchema, req.body);
      res.json(await updateProduct(pool, req.user as AuthUser, req.params.id, body));
    } catch (err) {
      next(err);
    }
  });

  app.patch('/productos/:id/baja', auth, async (req: any, res, next) => {
    try {
      res.json(await deactivateProduct(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.get('/pacientes', auth, async (req: any, res, next) => {
    try {
      res.json(await listPatients(pool, req.user as AuthUser));
    } catch (err) {
      next(err);
    }
  });

  app.post('/pacientes', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(patientSchema, req.body);
      const created = await createPatient(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/pacientes/:id', auth, async (req: any, res, next) => {
    try {
      res.json(await getPatientWithHistory(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.put('/pacientes/:id', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(patientUpdateSchema, req.body);
      res.json(await updatePatient(pool, req.user as AuthUser, req.params.id, body));
    } catch (err) {
      next(err);
    }
  });

  app.post('/atenciones', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(attentionCreateSchema, req.body);
      const created = await createDraft(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/atenciones', auth, async (req: any, res, next) => {
    try {
      res.json(await listAttentions(pool, req.user as AuthUser));
    } catch (err) {
      next(err);
    }
  });

  app.get('/atenciones/:id', auth, async (req: any, res, next) => {
    try {
      res.json(await getAttention(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.put('/atenciones/:id/insumos', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(attentionItemsSchema, req.body);
      res.json(await setDraftItems(pool, req.user as AuthUser, req.params.id, body.items));
    } catch (err) {
      next(err);
    }
  });

  app.post('/atenciones/:id/cierre', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(attentionCloseSchema, req.body);
      res.json(await closeAttention(pool, req.user as AuthUser, req.params.id, body));
    } catch (err) {
      next(err);
    }
  });

  app.post('/atenciones/:id/anulacion', auth, async (req: any, res, next) => {
    try {
      res.json(await annulAttention(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.get('/clientes', auth, async (req: any, res, next) => {
    try {
      res.json(await listClients(pool, req.user as AuthUser));
    } catch (err) {
      next(err);
    }
  });

  app.post('/clientes', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(clientSchema, req.body);
      const created = await createClient(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/clientes/:id', auth, async (req: any, res, next) => {
    try {
      res.json(await getClientWithPets(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.put('/clientes/:id', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(clientUpdateSchema, req.body);
      res.json(await updateClient(pool, req.user as AuthUser, req.params.id, body));
    } catch (err) {
      next(err);
    }
  });

  app.post('/mascotas', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(petSchema, req.body);
      const created = await registerPet(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/citas', auth, async (req: any, res, next) => {
    try {
      const patientId = typeof req.query.pacienteId === 'string' ? req.query.pacienteId : undefined;
      res.json(await listAppointments(pool, req.user as AuthUser, patientId));
    } catch (err) {
      next(err);
    }
  });

  app.post('/citas', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(appointmentSchema, req.body);
      const created = await scheduleAppointment(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/citas/:id', auth, async (req: any, res, next) => {
    try {
      res.json(await getAppointment(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post('/citas/:id/checkin', auth, async (req: any, res, next) => {
    try {
      res.json(await checkinAppointment(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post('/citas/:id/cancelacion', auth, async (req: any, res, next) => {
    try {
      res.json(await cancelAppointment(pool, req.user as AuthUser, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.get('/pagos', auth, async (req: any, res, next) => {
    try {
      const appointmentId = typeof req.query.citaId === 'string' ? req.query.citaId : undefined;
      const patientId = typeof req.query.pacienteId === 'string' ? req.query.pacienteId : undefined;
      res.json(await listPayments(pool, req.user as AuthUser, { appointmentId, patientId }));
    } catch (err) {
      next(err);
    }
  });

  app.post('/pagos', auth, async (req: any, res, next) => {
    try {
      const body = parseZod(paymentSchema, req.body);
      const created = await registerPayment(pool, req.user as AuthUser, body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get('/movimientos', auth, async (req: any, res, next) => {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
      res.json(await listMovimientos(pool, req.user as AuthUser, from, to, productId));
    } catch (err) {
      next(err);
    }
  });

  app.get('/auditoria', auth, async (req: any, res, next) => {
    try {
      if (!can((req.user as AuthUser).role, 'audit.read')) {
        throw new AppError('No tiene permiso para consultar la auditoría.', 403);
      }
      res.json(await listAudit(pool));
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ mensaje: err.message });
    }
    console.error(err);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  });

  return app;
}
