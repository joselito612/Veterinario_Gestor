# Gestión Veterinaria · MVP 001

MVP de atención e inventario: pacientes, productos, cierre atómico con descuento de stock, anulación con reversión y auditoría inmutable.

## Tecnologías y versiones

### Frontend (Vite + React)
| Tecnología | Versión | Uso |
|---|---|---|
| React | ^18.3.1 | Interfaz de usuario |
| React DOM | ^18.3.1 | Renderizado en DOM |
| SweetAlert2 | ^11.26.25 | Ventanas emergentes de confirmación, aviso y éxito |
| Recharts | ^2.x | Gráficos del panel de control (Dashboard) |
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
npm --prefix backend install
cp backend/.env.example backend/.env
npm --prefix backend run dev
```

Frontend:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

## Pruebas

```sh
npm --prefix backend test
```

## Datos de prueba (seed)

Cargar datos de ejemplo (productos, clientes, pacientes, atenciones, citas y pagos)
contra la base de PostgreSQL, tras aplicar las migraciones y crear los usuarios iniciales:

```sh
# 1. Levantar el backend (aplica migraciones y usuarios iniciales)
npm --prefix backend run dev

# 2. Ejecutar el seed de datos de ejemplo
psql "$DATABASE_URL" -f backend/src/db/seed_data.sql
```

Si no dispones del cliente `psql`, ejecuta el SQL desde cualquier cliente de PostgreSQL
conectado a la misma `DATABASE_URL`.

## Cuentas iniciales

- Administración: `admin@veterinaria.cl` / `Admin123!`
- Veterinaria: `vet@veterinaria.cl` / `Vet123!`

## Reglas aplicadas

- Solo el administrador gestiona cuentas, productos y auditoría.
- Veterinario y administrador pueden crear y cerrar atenciones; solo el administrador anula.
- El cierre descuenta todo el stock o nada; nunca deja valores negativos.
- La auditoría no admite modificación ni eliminación.
