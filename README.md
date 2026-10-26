# Gestión Veterinaria · MVP 001

MVP de atención e inventario veterinario: pacientes, productos, cierre atómico con descuento de stock, anulación con reversión y auditoría inmutable. Incluye panel de control (Dashboard) con métricas y gráficos del inventario y las atenciones.

## Tecnologías y versiones

### Frontend (Vite + React)
| Tecnología | Versión | Uso |
|---|---|---|
| React | ^18.3.1 | Interfaz de usuario |
| React DOM | ^18.3.1 | Renderizado en DOM |
| SweetAlert2 | ^11.26.25 | Ventanas emergentes de confirmación, aviso y éxito |
| Recharts | ^3.10.1 | Gráficos del panel de control (Dashboard) |
| Tailwind CSS | ^4.3.3 | Framework de estilos (temática pastel veterinaria) |
| TypeScript | ^5.4.5 | Tipado estático |
| Vite | ^5.3.0 | Servidor de desarrollo y bundler |

### Backend (Node.js + Express + PostgreSQL)
| Tecnología | Versión | Uso |
|---|---|---|
| Express | ^4.19.2 | Servidor web y API REST |
| pg | ^8.12.0 | Controlador de PostgreSQL |
| bcryptjs | ^2.4.3 | Hash de contraseñas |
| cors | ^2.8.6 | Origen cruzado para el frontend |
| dotenv | ^16.4.5 | Variables de entorno |
| jsonwebtoken | ^9.0.2 | Autenticación por token JWT |
| zod | ^3.23.8 | Validación de esquemas |
| pg-mem | ^2.9.1 | PostgreSQL en memoria para pruebas |
| vitest | ^2.0.0 | Framework de pruebas |
| tsx | ^4.11.0 | Ejecutar TypeScript en desarrollo |
| TypeScript | ^5.4.5 | Tipado estático |

### Infraestructura
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 20+ | Entorno de ejecución |
| PostgreSQL | — | Base de datos de producción (`DATABASE_URL`) |

## Requisitos

- Node.js 20+
- PostgreSQL para producción (`DATABASE_URL`). Sin servidor externo, las pruebas usan un adaptador compatible con PostgreSQL en memoria.

## Puesta en marcha

```sh
# Instalar y levantar el backend (aplica migraciones y usuarios iniciales)
npm --prefix backend install
cp backend/.env.example backend/.env
npm --prefix backend run dev
```

Frontend:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

El frontend corre por defecto en `http://localhost:5173` y el backend en `http://localhost:3001`.

## Pruebas

```sh
npm --prefix backend test
```

## Datos de prueba (seed)

Cargar datos de ejemplo (productos, clientes, pacientes, atenciones, citas y pagos) contra la base de PostgreSQL, tras aplicar las migraciones y crear los usuarios iniciales:

```sh
# 1. Levantar el backend (aplica migraciones y usuarios iniciales)
npm --prefix backend run dev

# 2. Ejecutar el seed de datos de ejemplo
psql "$DATABASE_URL" -f backend/src/db/seed_data.sql
```

Si no dispones del cliente `psql`, ejecuta el SQL desde cualquier cliente de PostgreSQL conectado a la misma `DATABASE_URL`.

## Cuentas iniciales

- Administración: `admin@veterinaria.cl` / `Admin123!`
- Veterinaria: `vet@veterinaria.cl` / `Vet123!`

## Reglas aplicadas

- Solo el administrador gestiona cuentas, productos y auditoría.
- Veterinario y administrador pueden crear y cerrar atenciones; solo el administrador anula.
- El cierre descuenta todo el stock o nada; nunca deja valores negativos.
- La auditoría no admite modificación ni eliminación.
- Cada módulo ofrece submenús Registrar/Listar; el veterinario solo crea atenciones y lee pacientes, sin botones de modificar ni eliminar.
- Las ventanas emergentes usan SweetAlert2 con mensajes en español (confirmaciones Sí/No, avisos y éxito con Aceptar).
- El módulo Dashboard es de solo lectura y accesible para ambos roles.

---

## Estructura del proyecto

El repositorio se divide en tres carpetas principales: `backend`, `frontend` y `specs`, además de los archivos de configuración en la raíz.

```
veterinario/
├── README.md                 # Documentación del proyecto (este archivo)
├── agent.md                  # Contexto y convenciones de trabajo del agente
├── .gitignore                # Archivos y carpetas ignorados por Git
├── package.json              # Orquestador de scripts en la raíz
├── backend/                  # API: Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── server.ts         # Punto de entrada del servidor Express
│   │   ├── http/app.ts       # Configuración de la aplicación Express (rutas, CORS, middlewares)
│   │   ├── domain/           # Lógica de negocio pura (sin depender de React ni HTTP)
│   │   │   ├── types.ts      # Tipos y entidades de dominio
│   │   │   ├── validators.ts # Validaciones de esquemas con Zod
│   │   │   ├── errors.ts     # Errores de dominio
│   │   │   └── permissions.ts# Matriz de permisos por rol
│   │   ├── db/               # Capa de datos y migraciones
│   │   │   ├── migrations/   # Migraciones SQL versionadas (001_init.sql)
│   │   │   ├── migrate.ts    # Aplicación de migraciones en orden con tabla de control
│   │   │   ├── pool.ts       # Pool de conexiones a PostgreSQL
│   │   │   ├── seed.ts       # Script de carga de datos de ejemplo
│   │   │   └── seed_data.sql # Datos de prueba listos para ejecutar
│   │   ├── repositories/     # Acceso a datos (usuarios, auditoría)
│   │   │   ├── users.ts
│   │   │   └── audit.ts
│   │   └── services/         # Servicios de negocio por entidad
│   │       ├── appointmentService.ts
│   │       ├── attentionService.ts
│   │       ├── authService.ts
│   │       ├── clientService.ts
│   │       ├── movementService.ts
│   │       ├── mutex.ts      # Exclusión mutua para cierres concurrentes
│   │       ├── patientService.ts
│   │       ├── paymentService.ts
│   │       └── productService.ts
│   ├── tests/                # Pruebas automatizadas (unitarias, integración, aceptación)
│   │   ├── auth.test.ts
│   │   ├── products.test.ts
│   │   ├── patients.test.ts
│   │   ├── attentions.test.ts
│   │   ├── annulment.test.ts
│   │   ├── audit.test.ts
│   │   ├── concurrency.test.ts
│   │   ├── cors.test.ts
│   │   ├── historical.test.ts
│   │   ├── migrations.test.ts
│   │   ├── admin-operations.test.ts
│   │   └── helpers.ts
│   ├── scripts/copy-migrations.js
│   ├── .env                  # Variables de entorno (se crea copiando .env.example)
│   ├── .env.example          # Ejemplo de variables de entorno
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/                 # Interfaz web: Vite + React + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx           # Shell principal: login, navegación, submenús Registrar/Listar y todos los módulos
│   │   ├── main.tsx          # Punto de entrada de React
│   │   ├── index.css         # Estilos base y tema pastel veterinario (Tailwind)
│   │   ├── api.ts            # Cliente de API (fetch con token JWT y CORS)
│   │   ├── sweetalert.ts     # Envoltura reutilizable de SweetAlert2 (confirmar, avisar, exito, error)
│   │   └── components/dashboard/   # Módulo Dashboard
│   │       ├── Dashboard.tsx       # Vista del panel de control con tarjetas de métricas
│   │       ├── MetricCard.tsx      # Tarjeta de métrica individual
│   │       ├── CategoryDistributionChart.tsx   # Gráfico circular de stock por categoría
│   │       ├── StockRankingChart.tsx   # Gráfico de barras mayor/menor stock
│   │       ├── StockEvolutionChart.tsx   # Gráfico de líneas evolución de entradas y salidas
│   │       └── LowStockChart.tsx   # Gráfico de barras productos próximos a agotarse
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── specs/                    # Especificaciones del MVP (requisitos funcionales y plan)
│   └── 001-veterinario-mvp/
│       ├── spec.md           # Especificación detallada (RF-1 a RF-16)
│       ├── plan.md           # Plan de implementación, modelo de datos y decisiones
│       └── tasks.md          # Lista de tareas con criterios de aceptación
└── docs/
    └── constitution.md       # Constitución del proyecto (stack mínimo, reglas de trabajo)
```

### Qué hace cada parte

- **Backend (`backend/`)** — API REST en Node.js con Express que expone los endpoints de autenticación, productos, pacientes, atenciones, clientes, citas, pagos y auditoría. Toda la lógica de negocio vive en `domain/` y `services/`, sin depender de React ni de rutas HTTP. Los datos persisten en PostgreSQL mediante migraciones SQL versionadas en `db/migrations/`, y `pg-mem` se reserva únicamente para las pruebas automatizadas.

- **Frontend (`frontend/`)** — Aplicación React construida con Vite y Tailwind CSS. `App.tsx` es el shell principal que gestiona la sesión, la navegación por módulos (Productos, Pacientes, Atenciones, Clientes, Citas, Pagos, Auditoría y Dashboard) y los submenús Registrar/Listar. `sweetalert.ts` centraliza todas las ventanas emergentes en español. El módulo Dashboard, bajo `components/dashboard/`, renderiza tarjetas de métricas y cuatro gráficos con Recharts (distribución por categoría, ranking de stock, evolución de entradas y salidas, y productos con stock bajo).

- **Specs (`specs/`)** — Documentación del alcance y los requisitos del MVP: `spec.md` define los requisitos funcionales RF-1 a RF-16, `plan.md` describe el modelo de datos, decisiones justificadas y estrategia de pruebas, y `tasks.md` enumera las tareas de implementación con sus criterios de aceptación.

- **Docs (`docs/`)** — `constitution.md` establece las reglas del proyecto: stack mínimo (TypeScript, React, Node.js, PostgreSQL), justificación de cada dependencia, separación de la lógica de negocio de la interfaz, pruebas automatizadas por regla, persistencia en PostgreSQL y mensajes al usuario en español.

---

## Posibles mejoras

- **Dual Grid Layout en formularios**: organizar ciertos formularios (por ejemplo, registro de productos, registro de mascota y registro de cliente) en una cuadrícula de dos columnas para aprovechar mejor el espacio horizontal en pantallas de escritorio, dejando campos anchos (descripción, dirección) en una fila completa y campos cortos (stock, edad, precio) lado a lado.

- **Ajuste de tamaño de botones**: revisar y normalizar el tamaño de ciertos botones según su importancia (primarios, secundarios y de peligro) para mejorar la jerarquía visual y evitar que botones de acción secundaria compitan visualmente con los principales.

- **Iconos y ventanas emergentes para el stock**: implementar iconos de estado de stock (disponible, bajo, crítico, vencido) acompañados siempre de texto, y gestionar el stock de forma más intuitiva con ventanas emergentes. Por ejemplo, añadir un icono de campana en la esquina superior derecha de la interfaz que muestre notificaciones de productos con stock bajo o crítico, permitiendo al usuario revisar rápidamente qué insumos necesitan reposición sin entrar al módulo de productos.

---
