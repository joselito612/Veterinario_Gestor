# agent.md - Especificación Técnica del Proyecto: Sistema de Gestión Veterinaria

## 1. Contexto y Objetivos del Proyecto
Este proyecto es una aplicación web de gestión veterinaria diseñada como un producto de software real y funcional, orientada a servir como proyecto principal de portafolio y base para servicios de desarrollo independiente.

El objetivo principal es resolver problemas operativos reales de una clínica veterinaria: control estricto de inventario, auditoría de acciones, trazabilidad médica de pacientes e integración automática entre las atenciones médicas y el consumo de insumos.

---

## 2. Arquitectura y Stack Tecnológico

### Frontend
* **Core:** React 18+ con TypeScript (`.tsx`).
* **Estilos y Componentes:** Tailwind CSS + UI Framework (ej. shadcn/ui o Lucide React para iconografía).
* **Gestión de Estado y Data Fetching:** React Context API / Zustand / TanStack Query (React Query).
* **Visualización de Datos / Gráficos:** Recharts (componentes declarativos para React: PieChart, BarChart, LineChart, etc.).
* **Exportación de Datos:** `xlsx` (SheetJS) para reportes en Excel, `@react-pdf/renderer` o `jspdf` para fichas/reportes PDF.

### Backend / Persistencia (Inicial / Mock / API)
* **Contrato de Tipos:** TypeScript Interfaces compartidas de forma estricta.
* **Capa de Datos:** Mock Service Worker (MSW) / LocalStorage / Node.js Express API con PostgreSQL (según etapa de desarrollo).

---

## 3. Módulos y Funcionalidades Clave

[ Dashboard ] ───> [ Métricas / Gráficos / Alertas ]
[ Inventario ] ──> [ CRUD Categorizado + Control Stock + Exportación ]
[ Pacientes ] ───> [ Ficha Médica + Descuento Automático de Stock ]
[ Auditoría ] ───> [ Registro de Operaciones y Usuarios ]


### 3.1. Dashboard Principal
* **Tarjetas de Métricas:**
  * Valor total del inventario ($ CLP).
  * Alerta de capital en riesgo (productos próximos a vencer dentro del mes).
  * Total de atenciones/consultas médicas del mes.
  * Cantidad de productos con stock crítico.
* **Gráficos (generados con Recharts):**
  * Distribución de unidades por categoría (gráfico circular).
  * Productos con mayor y menor stock (gráfico de barras).
  * Evolución de entradas y salidas (gráfico de líneas o de área).
  * Productos próximos a agotarse (gráfico de barras).
* **Cajas de Notificación de Stock:**
  * Componente visual destacado con alertas dinámicas cuando un producto alcance su nivel de stock mínimo.

### 3.2. Módulo de Inventario
* **Categorización Estricta (3 Categorías Principales):**
  1. Alimentos animales.
  2. Medicamentos.
  3. Accesorios animales.
* **Funcionalidad CRUD Completa:**
  * Crear, listar, editar y dar de baja productos.
  * Campos obligatorios: Código/SKU, Nombre, Categoría, Precio de Costo, Precio de Venta, Stock Actual, Stock Mínimo, Fecha de Vencimiento, Proveedor.
* **Filtros y Búsqueda Avanzada:**
  * Búsqueda por texto libre, filtrado por categoría y por estado de stock (Normal, Bajo, Crítico, Vencido).
* **Exportación de Reportes:**
  * Botón para exportar el inventario completo o filtrado a formato Excel (`.xlsx`).

### 3.3. Módulo de Pacientes y Ficha Médica
* **Registro de Clientes y Mascotas:**
  * Datos del Tutor/Dueño (Nombre, RUT, Teléfono, Email).
  * Ficha de la Mascota (Nombre, Especie, Raza, Edad, Peso, Historial).
* **Consulta / Atenciones Médicas:**
  * Generación de una nueva atención vinculada a un veterinario.
  * Selección de medicamentos o insumos utilizados durante la consulta.
  * **Integración Automática:** Al finalizar la consulta, el sistema descuenta automáticamente las unidades consumidas del inventario y genera un evento de auditoría.
  * Exportación de la Ficha Clínica o Receta a formato PDF.

### 3.4. Módulo de Auditoría y Seguridad
* **Gestión de Roles:**
  * `Admin`: Acceso completo a métricas, inventario, auditoría, configuración y gestión de usuarios.
  * `Veterinario`: Acceso a consulta médica, registro de pacientes, vista de stock y alertas.
* **Registro de Eventos (Audit Log):**
  * Tabla inmutable de eventos del sistema.
  * Registra: Fecha/Hora, Usuario, Rol, Acción (`CREAR_PRODUCTO`, `MODIFICAR_PRECIO`, `DESCUENTO_STOCK_ATENCION`, `ELIMINAR_REGISTRO`), Módulo y Descripción detallada.
  * Filtro por rango de fechas, usuario o tipo de acción.

---

## 4. Estructura de Datos (TypeScript Interfaces Core)

```typescript
export type Role = 'ADMIN' | 'VETERINARIO';

export type Category = 'ALIMENTOS' | 'MEDICAMENTOS' | 'ACCESORIOS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: Category;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerName: string;
  ownerPhone: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  veterinarianId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  suppliesUsed: {
    inventoryItemId: string;
    quantity: number;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: 'INVENTARIO' | 'PACIENTES' | 'AUTENTICACION' | 'AUDITORIA';
  details: string;
}
5. Criterios de Calidad y Estándares de Desarrollo
Clean Code & Componentización: Separación clara entre lógica de negocio (custom hooks), UI (componentes reutilizables) y vistas/páginas.

Manejo de Errores y Validaciones: Formularios validados (ej. Zod + React Hook Form) para evitar registros inconsistentes o stock negativo.

User Experience (UX): Interfaz responsive, retroalimentación clara mediante notificadores (toasts), estados de carga (skeletons) y diálogos de confirmación para acciones críticas.

Demostración para Portafolio: Código documentado, Readme detallado con captura de pantallas, métricas explicadas y despliegue funcional en producción (ej. Vercel/Netlify).