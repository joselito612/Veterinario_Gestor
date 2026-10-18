-- Datos de ejemplo (seed) para el MVP veterinario.
-- Ejecutar este script UNA SOLA VEZ contra PostgreSQL tras aplicar las migraciones
-- y crear los usuarios iniciales (seed.ts). No se ejecuta automáticamente al arrancar.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/src/db/seed_data.sql
--
-- Requiere la extensión pgcrypto (aplicada por la migración 001_init).

DO $$
DECLARE
  v_admin_id UUID;
  v_vet_id UUID;

  v_product_amox UUID;
  v_product_collar UUID;
  v_product_food UUID;

  v_client_juan UUID;
  v_client_maria UUID;

  v_patient_firu UUID;
  v_patient_michi UUID;

  v_attention_1 UUID;
  v_attention_2 UUID;

  v_appointment_1 UUID;
BEGIN
  ---------------------------------------------------------------------------
  -- Usuarios (se reutilizan si ya existen; si no, se crean con la contraseña
  -- por defecto del MVP).
  ---------------------------------------------------------------------------
  SELECT id INTO v_admin_id FROM users WHERE email = 'admin@veterinaria.cl';
  IF v_admin_id IS NULL THEN
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ('Administradora', 'admin@veterinaria.cl', crypt('Admin123!', gen_salt('bf')), 'ADMIN', TRUE)
    RETURNING id INTO v_admin_id;
  END IF;

  SELECT id INTO v_vet_id FROM users WHERE email = 'vet@veterinaria.cl';
  IF v_vet_id IS NULL THEN
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ('Veterinario', 'vet@veterinaria.cl', crypt('Vet123!', gen_salt('bf')), 'VETERINARIO', TRUE)
    RETURNING id INTO v_vet_id;
  END IF;

  ---------------------------------------------------------------------------
  -- Productos (una categoría por tipo; el medicamento lleva trazabilidad).
  ---------------------------------------------------------------------------
  INSERT INTO products (sku, barcode, name, category, subcategory, brand, description, unit,
                        batch, sanitary_reg, cost_price, sale_price, current_stock, min_stock,
                        expiration_date, supplier, is_active)
  VALUES ('MED-001', '1000000001', 'Amoxicilina 500 mg', 'MEDICAMENTOS', 'Antibióticos',
          'VetPharma', 'Antibiótico de amplio espectro para caninos y felinos', 'Tableta',
          'LOTE-A101', 'RS-2025-001', 2500, 4500, 30, 5, DATE '2027-06-30', 'Laboratorio Pharma', TRUE)
  ON CONFLICT (sku) DO NOTHING;
  SELECT id INTO v_product_amox FROM products WHERE sku = 'MED-001';

  INSERT INTO products (sku, barcode, name, category, subcategory, brand, description, unit,
                        batch, sanitary_reg, cost_price, sale_price, current_stock, min_stock,
                        expiration_date, supplier, is_active)
  VALUES ('ACC-002', '1000000002', 'Collar antipulgas', 'ACCESORIOS', 'Parásitos externo',
          'PetGuard', 'Collar repelente de pulgas y garrapatas', 'Unidad',
          '', '', 3500, 7990, 15, 3, NULL, 'Distribución Mascota', TRUE)
  ON CONFLICT (sku) DO NOTHING;
  SELECT id INTO v_product_collar FROM products WHERE sku = 'ACC-002';

  INSERT INTO products (sku, barcode, name, category, subcategory, brand, description, unit,
                        batch, sanitary_reg, cost_price, sale_price, current_stock, min_stock,
                        expiration_date, supplier, is_active)
  VALUES ('ALI-003', '1000000003', 'Croqueta adulto raza grande', 'ALIMENTOS', 'Seco para perros',
          'NutriCan', 'Alimento balanceado para perros adultos raza grande', 'Bolsa 15 kg',
          '', '', 18000, 29990, 20, 4, DATE '2026-12-15', 'Nutrición Animal S.A.', TRUE)
  ON CONFLICT (sku) DO NOTHING;
  SELECT id INTO v_product_food FROM products WHERE sku = 'ALI-003';

  ---------------------------------------------------------------------------
  -- Clientes (tutores).
  ---------------------------------------------------------------------------
  INSERT INTO clients (name, rut, phone, email)
  VALUES ('Juan Pérez Soto', '11.111.111-1', '+56911111111', 'juan.perez@email.com')
  ON CONFLICT (rut) DO NOTHING;
  SELECT id INTO v_client_juan FROM clients WHERE rut = '11.111.111-1';

  INSERT INTO clients (name, rut, phone, email)
  VALUES ('María García López', '22.222.222-2', '+56922222222', 'maria.garcia@email.com')
  ON CONFLICT (rut) DO NOTHING;
  SELECT id INTO v_client_maria FROM clients WHERE rut = '22.222.222-2';

  ---------------------------------------------------------------------------
  -- Pacientes (mascotas).
  ---------------------------------------------------------------------------
  INSERT INTO patients (client_id, name, species, breed, age, weight,
                        owner_name, owner_rut, owner_phone, owner_email)
  VALUES (v_client_juan, 'Firulais', 'Canino', 'Labrador Retriever', 3, 25.50,
          'Juan Pérez Soto', '11.111.111-1', '+56911111111', 'juan.perez@email.com')
  ON CONFLICT (id) DO NOTHING;
  SELECT id INTO v_patient_firu FROM patients WHERE client_id = v_client_juan AND name = 'Firulais';

  INSERT INTO patients (client_id, name, species, breed, age, weight,
                        owner_name, owner_rut, owner_phone, owner_email)
  VALUES (v_client_maria, 'Michi', 'Felino', 'Siames', 2, 4.20,
          'María García López', '22.222.222-2', '+56922222222', 'maria.garcia@email.com')
  ON CONFLICT (id) DO NOTHING;
  SELECT id INTO v_patient_michi FROM patients WHERE client_id = v_client_maria AND name = 'Michi';

  ---------------------------------------------------------------------------
  -- Atenciones.
  ---------------------------------------------------------------------------
  -- Atención 1: cerrada, con receta (amoxicilina) y descuento de stock parcial.
  INSERT INTO attentions (patient_id, professional_id, attention_date, diagnosis, treatment, status)
  VALUES (v_patient_firu, v_vet_id, DATE '2025-10-15', 'Dermatitis leve', 'Antibiótico por 7 días', 'CERRADA')
  RETURNING id INTO v_attention_1;

  -- Atención 2: borrador, sin cerrar (para probar flujos de borrador).
  INSERT INTO attentions (patient_id, professional_id, attention_date, diagnosis, treatment, status)
  VALUES (v_patient_michi, v_vet_id, DATE '2025-10-18', 'Control de peso', '', 'BORRADOR')
  RETURNING id INTO v_attention_2;

  ---------------------------------------------------------------------------
  -- Ítem de receta en la atención 1 (descuenta 1 unidad de amoxicilina).
  ---------------------------------------------------------------------------
  INSERT INTO attention_items (attention_id, product_id, quantity, dosis,
                               product_name, product_sku, sale_price)
  VALUES (v_attention_1, v_product_amox, 1, '1 tableta cada 12 horas por 7 días',
          'Amoxicilina 500 mg', 'MED-001', 4500);

  ---------------------------------------------------------------------------
  -- Movimiento de stock derivado del cierre de la atención 1.
  ---------------------------------------------------------------------------
  INSERT INTO stock_movements (product_id, quantity, reason, attention_id, created_by)
  VALUES (v_product_amox, -1, 'CIERRE_ATENCION', v_attention_1, v_vet_id);

  ---------------------------------------------------------------------------
  -- Citas.
  ---------------------------------------------------------------------------
  INSERT INTO appointments (patient_id, scheduled_at, reason, status, created_by)
  VALUES (v_patient_firu, TIMESTAMPTZ '2025-10-20 09:00:00-03', 'Control post-tratamiento', 'PROGRAMADA', v_admin_id)
  RETURNING id INTO v_appointment_1;

  ---------------------------------------------------------------------------
  -- Pago de la cita 1.
  ---------------------------------------------------------------------------
  INSERT INTO payments (appointment_id, amount, method, paid_at, created_by)
  VALUES (v_appointment_1, 15000, 'Transferencia', TIMESTAMPTZ '2025-10-20 09:30:00-03', v_admin_id);

  ---------------------------------------------------------------------------
  -- Auditoría de ejemplo (eventos representativos de las inserciones anteriores).
  ---------------------------------------------------------------------------
  INSERT INTO audit_logs (user_id, user_name, user_role, action, entity, entity_id, details)
  VALUES (v_vet_id, 'Veterinario', 'VETERINARIO', 'CREAR_ATENCION', 'attentions', v_attention_1::text,
          'Atención cerrada para Firulais con diagnóstico Dermatitis leve');

  INSERT INTO audit_logs (user_id, user_name, user_role, action, entity, entity_id, details)
  VALUES (v_vet_id, 'Veterinario', 'VETERINARIO', 'DESCUENTO_STOCK_ATENCION', 'products', v_product_amox::text,
          'Descontada 1 unidad de Amoxicilina 500 mg en atención ' || v_attention_1::text);

  INSERT INTO audit_logs (user_id, user_name, user_role, action, entity, entity_id, details)
  VALUES (v_admin_id, 'Administradora', 'ADMIN', 'REGISTRAR_PAGO', 'payments', v_appointment_1::text,
          'Pago de $15.000 registrado para cita de Firulais');

END $$;

-- Resumen de lo insertado (consulta de verificación).
SELECT 'usuarios' AS entidad, count(*) AS cantidad FROM users
UNION ALL SELECT 'productos', count(*) FROM products
UNION ALL SELECT 'clientes', count(*) FROM clients
UNION ALL SELECT 'pacientes', count(*) FROM patients
UNION ALL SELECT 'atenciones', count(*) FROM attentions
UNION ALL SELECT 'citas', count(*) FROM appointments
UNION ALL SELECT 'pagos', count(*) FROM payments;
