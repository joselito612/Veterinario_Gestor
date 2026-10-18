import { z } from 'zod';

const textoNoVacio = (campo: string) =>
  z.string({ required_error: `${campo} es obligatorio.` }).trim().min(1, `${campo} no puede estar vacío.`);

export const categorySchema = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim().toUpperCase();
    if (t === 'ALIMENTO') return 'ALIMENTOS';
    if (t === 'MEDICAMENTO') return 'MEDICAMENTOS';
    if (t === 'ACCESORIO') return 'ACCESORIOS';
    return t;
  },
  z.enum(['ALIMENTOS', 'MEDICAMENTOS', 'ACCESORIOS'], {
    errorMap: () => ({ message: 'Tipo debe ser alimento, medicamento o accesorio.' })
  })
);

function exigeMedicamento(v: any, ctx: z.RefinementCtx) {
  if (v?.category !== 'MEDICAMENTOS') return;
  if (!v?.batch || String(v.batch).trim().length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['batch'], message: 'Lote es obligatorio para medicamentos.' });
  }
  if (!v?.sanitaryReg || String(v.sanitaryReg).trim().length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sanitaryReg'], message: 'Registro sanitario es obligatorio para medicamentos.' });
  }
  if (!v?.expirationDate || Number.isNaN(Date.parse(String(v.expirationDate)))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expirationDate'], message: 'Fecha de vencimiento válida es obligatoria para medicamentos.' });
  }
}

const productBase = z.object({
  sku: z.string().trim().min(1, 'Código de barras no puede estar vacío.').optional(),
  barcode: z.string().trim().min(1, 'Código de barras no puede estar vacío.').optional(),
  name: textoNoVacio('Nombre'),
  category: categorySchema,
  subcategory: z.string().trim().optional().default(''),
  brand: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  unit: textoNoVacio('Unidad de medida'),
  batch: z.string().trim().optional().default(''),
  sanitaryReg: z.string().trim().optional().default(''),
  costPrice: z.number({ required_error: 'Precio de compra es obligatorio.' }).min(0, 'Precio de compra no puede ser negativo.'),
  salePrice: z.number({ required_error: 'Precio de venta es obligatorio.' }).min(0, 'Precio de venta no puede ser negativo.'),
  currentStock: z.number({ required_error: 'Stock actual es obligatorio.' }).int('Stock actual debe ser un número entero.').min(0, 'Stock actual no puede ser negativo.'),
  minStock: z.number({ required_error: 'Stock mínimo es obligatorio.' }).int('Stock mínimo debe ser un número entero.').min(0, 'Stock mínimo no puede ser negativo.'),
  expirationDate: z.string().trim().optional(),
  supplier: textoNoVacio('Proveedor'),
  isActive: z.boolean().optional()
});

export const productSchema = productBase.superRefine((v, ctx) => {
  if (!v.sku && !v.barcode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['barcode'], message: 'Código de barras es obligatorio.' });
  }
  if (v.expirationDate !== undefined && v.expirationDate !== '' && Number.isNaN(Date.parse(v.expirationDate))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expirationDate'], message: 'Fecha de vencimiento debe ser una fecha válida.' });
  }
  exigeMedicamento(v, ctx);
});

export const productUpdateSchema = productBase.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});

const rutRegex = /^[0-9]{7,8}-[0-9kK]$/;

export const patientSchema = z.object({
  name: textoNoVacio('Nombre de la mascota'),
  species: textoNoVacio('Especie'),
  breed: textoNoVacio('Raza'),
  age: z.number({ required_error: 'Edad es obligatoria.' }).min(0, 'Edad no puede ser negativa.'),
  weight: z.number({ required_error: 'Peso es obligatorio.' }).min(0, 'Peso no puede ser negativo.'),
  ownerName: textoNoVacio('Nombre del tutor'),
  ownerRut: z.string({ required_error: 'RUT del tutor es obligatorio.' }).trim().regex(rutRegex, 'RUT del tutor debe tener formato 12345678-9.'),
  ownerPhone: textoNoVacio('Teléfono del tutor'),
  ownerEmail: z.string({ required_error: 'Correo del tutor es obligatorio.' }).trim().email('Correo del tutor debe ser válido.')
});

export const patientUpdateSchema = patientSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});

export const clientSchema = z.object({
  name: textoNoVacio('Nombre del cliente'),
  rut: z.string({ required_error: 'RUT del cliente es obligatorio.' }).trim().regex(rutRegex, 'RUT del cliente debe tener formato 12345678-9.'),
  phone: textoNoVacio('Teléfono del cliente'),
  email: z.string({ required_error: 'Correo del cliente es obligatorio.' }).trim().email('Correo del cliente debe ser válido.')
});

export const clientUpdateSchema = clientSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});

export const petSchema = z.object({
  clientId: textoNoVacio('Cliente'),
  name: textoNoVacio('Nombre de la mascota'),
  species: textoNoVacio('Especie'),
  breed: textoNoVacio('Raza'),
  age: z.number({ required_error: 'Edad es obligatoria.' }).min(0, 'Edad no puede ser negativa.'),
  weight: z.number({ required_error: 'Peso es obligatorio.' }).min(0, 'Peso no puede ser negativo.')
});

export const appointmentSchema = z.object({
  patientId: textoNoVacio('Paciente'),
  scheduledAt: z.string({ required_error: 'Fecha y hora son obligatorias.' }).refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha y hora deben ser válidas.'),
  reason: textoNoVacio('Motivo')
});

export const paymentSchema = z.object({
  appointmentId: textoNoVacio('Cita'),
  amount: z.number({ required_error: 'Monto es obligatorio.' }).positive('Monto debe ser mayor que cero.'),
  method: textoNoVacio('Método de pago'),
  paidAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de pago debe ser válida.').optional()
});

export const attentionCreateSchema = z.object({
  patientId: textoNoVacio('Paciente'),
  attentionDate: z.string({ required_error: 'Fecha de la atención es obligatoria.' }).refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de la atención debe ser válida.')
});

export const attentionItemSchema = z.object({
  productId: textoNoVacio('Producto'),
  quantity: z.number({ required_error: 'Cantidad es obligatoria.' }).int('Cantidad debe ser un número entero.').positive('Cantidad debe ser mayor que cero.'),
  dosis: textoNoVacio('Dosis')
});

export const attentionItemsSchema = z.object({
  items: z.array(attentionItemSchema).min(0)
});

export const attentionCloseSchema = z.object({
  diagnosis: textoNoVacio('Diagnóstico'),
  treatment: textoNoVacio('Tratamiento'),
  items: z.array(attentionItemSchema).optional()
});

export const loginSchema = z.object({
  email: z.string({ required_error: 'Correo es obligatorio.' }).trim().email('Correo debe ser válido.'),
  password: z.string({ required_error: 'Contraseña es obligatoria.' }).min(1, 'Contraseña no puede estar vacía.')
});

export const userCreateSchema = z.object({
  name: textoNoVacio('Nombre'),
  email: z.string({ required_error: 'Correo es obligatorio.' }).trim().email('Correo debe ser válido.'),
  password: z.string({ required_error: 'Contraseña es obligatoria.' }).min(6, 'Contraseña debe tener al menos 6 caracteres.'),
  role: z.enum(['ADMIN', 'VETERINARIO'], {
    errorMap: () => ({ message: 'Rol debe ser ADMIN o VETERINARIO.' })
  })
});
