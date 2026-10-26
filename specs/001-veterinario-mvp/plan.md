# Plan de implementación: MVP de atención e inventario veterinario

## Alcance y trazabilidad
| Parte | Responsabilidad | RF cubiertos |
|---|---|---|
| Autenticación y autorización | Identificar al usuario, iniciar sesión y evaluar permisos por rol. | RF-1 |
| Productos e inventario | Registrar, validar, consultar y modificar productos; exponer stock disponible. | RF-2 |
| Pacientes | Registrar, validar, consultar y modificar pacientes con su historial. | RF-3 |
| Atenciones | Crear borradores, asociar paciente y veterinario, añadir insumos y cerrarlos. | RF-4 |
| Movimientos de stock | Aplicar o revertir consumos completos de una atención, sin stock negativo. | RF-4, RF-5 |
| Anulación | Anular una atención cerrada una sola vez, restaurar sus insumos y conservar su historial. | RF-5 |
| Auditoría | Registrar operaciones relevantes de forma inmutable y permitir su consulta autorizada. | RF-2, RF-3, RF-4, RF-5, RF-6 |
| Migraciones y persistencia | Aplicar migraciones SQL versionadas en orden antes de aceptar tráfico y persistir todo en PostgreSQL real. | RF-10 |
| Navegación y gestión en frontend | Submenús Registrar/Listar por módulo, tablas con búsqueda y filtros, ventana de modificación y baja con confirmación según rol. | RF-11 |
| Listado de productos por categoría con stock | Filtrado de productos por categoría cerrada con indicador de disponibilidad de stock. | RF-13 |
| Ventanas emergentes con SweetAlert2 | Diálogos de confirmación, aviso y éxito con SweetAlert2 en productos, atenciones, mascotas y cierre de sesión. | RF-15 |
| Panel de control y métricas (Dashboard) | Tarjetas de métricas y gráficos con Recharts: distribución por categoría, mayor y menor stock, evolución de entradas y salidas, productos próximos a agotarse. | RF-16 |

## Secuencia de trabajo
1. Definir los roles, permisos y el ciclo de vida de usuarios y atenciones. RF-1, RF-4, RF-5.
2. Crear el modelo persistente mediante migraciones SQL versionadas con tabla de control, sus restricciones de integridad y los datos iniciales de usuarios. RF-1 a RF-6, RF-10.
3. Implementar autenticación y autorización antes de exponer operaciones de negocio. RF-1.
4. Implementar productos e inventario con sus validaciones y registro de auditoría. RF-2, RF-6.
5. Implementar pacientes y su consulta de historial. RF-3, RF-6.
6. Implementar atenciones como borradores, su cierre atómico y los movimientos de stock asociados. RF-4, RF-6.
7. Implementar anulación idempotente con reversión atómica de stock. RF-5, RF-6.
8. Implementar consulta de auditoría y comprobación transversal de permisos. RF-1, RF-6.
9. Ejecutar pruebas unitarias, de integración y de aceptación por cada RF. RF-1 a RF-6.
10. Implementar ventanas emergentes con SweetAlert2 (confirmar agregar producto, receta sin medicamentos, cerrar receta, registro de mascota con aviso de campo faltante, cerrar sesión con layout negro). RF-15.
11. Implementar el módulo Dashboard con su sección de navegación, tarjetas de métricas y los cuatro gráficos con Recharts. RF-16.

## Modelo de datos
| Entidad | Datos y restricciones principales | RF cubiertos |
|---|---|---|
| Usuario | Identificador, nombre, correo único, credencial protegida, rol y estado. Los roles son administrador y veterinario. | RF-1, RF-6 |
| Producto | Identificador, SKU único, nombre, categoría, precios, stocks, fecha de vencimiento, proveedor y estado. Los precios y stocks no pueden ser negativos; la fecha debe ser válida. | RF-2, RF-4, RF-5 |
| Paciente | Identificador, nombre, especie, raza, edad, peso, y tutor con nombre, RUT, teléfono y correo electrónico; edad y peso no pueden ser negativos. | RF-3, RF-4 |
| Atención | Identificador, paciente, profesional, fecha válida, diagnóstico, tratamiento, estado, fechas de creación y cierre. Estados: borrador, cerrada y anulada. | RF-3, RF-4, RF-5 |
| Insumo de atención | Atención, producto, cantidad positiva y datos descriptivos del producto al momento del cierre. Cada producto solo puede aparecer una vez por atención. | RF-4, RF-5 |
| Movimiento de stock | Producto, cantidad con signo, motivo, atención de origen, usuario y fecha. Un cierre genera consumos; una anulación genera reversos. | RF-4, RF-5, RF-6 |
| Evento de auditoría | Identificador, fecha y hora, usuario, rol, acción, entidad, identificador de entidad y descripción. No admite actualización ni eliminación. | RF-2 a RF-6 |
| Control de esquema | Versión de migración aplicada y fecha. Cada versión se registra una sola vez y nunca se re-aplica. | RF-10 |

## Relaciones e integridad
- Un paciente puede tener muchas atenciones; una atención pertenece a un solo paciente y a un veterinario.
- Una atención puede tener varios insumos; cada insumo referencia un producto.
- Cada cierre o anulación debe persistir, en una única operación indivisible, los cambios de estado, movimientos de stock y eventos de auditoría. RF-4, RF-5, RF-6.
- El stock se modifica únicamente mediante movimientos asociados a una operación de negocio, no mediante edición libre del saldo. RF-2, RF-4, RF-5.
- El cierre debe verificar y reservar el stock frente a operaciones simultáneas para que nunca resulte negativo. RF-4.
- Los datos históricos de un insumo usado deben conservarse aunque el producto cambie o quede inactivo. RF-4, RF-5.
- Las migraciones se aplican en orden de versión una sola vez, registradas en la tabla de control; cada migración corre en una única transacción y su fallo aborta el arranque con mensaje en español. RF-10.
- En desarrollo y producción la persistencia es PostgreSQL real; el almacenamiento en memoria queda reservado a pruebas automatizadas. RF-10.

## Decisiones justificadas
| Decisión | Justificación | Alternativa descartada | RF cubiertos |
|---|---|---|---|
| Mantener atenciones en borrador hasta su cierre. | Separa la captura de información del efecto irreversible sobre inventario. | Descontar stock mientras se edita la atención. | RF-4 |
| Cerrar y anular mediante operaciones atómicas. | Evita consumos parciales, stock negativo y auditorías incompletas. | Ejecutar actualizaciones independientes y compensarlas ante errores. | RF-4, RF-5, RF-6 |
| Registrar movimientos de stock en lugar de cambiar solo el saldo. | Permite explicar y verificar cada descuento o reversión. | Conservar únicamente el stock actual del producto. | RF-4, RF-5, RF-6 |
| Anular, no editar, una atención cerrada. | Protege el historial clínico y hace visible la corrección. | Permitir editar una atención cerrada y ajustar diferencias. | RF-5 |
| Desactivar productos con historial en vez de eliminarlos. | Conserva referencias de atenciones, movimientos y auditoría. | Eliminación definitiva de productos relacionados. | RF-2, RF-4, RF-5 |
| Separar permisos por acción y rol. | “Usuario autorizado” debe ser verificable y no depender de la interfaz. | Autorizar todo a cualquier usuario autenticado. | RF-1 a RF-6 |
| Permitir que el administrador cree y cierre atenciones. | El administrador tiene acceso operativo completo y puede cubrir la atención clínica. | Limitar la creación y el cierre al veterinario. | RF-1, RF-4 |
| Adoptar los campos de producto, paciente, tutor y atención de `agent.md`. | Alinea la ficha clínica y el inventario con el contexto aprobado del proyecto. | Mantener un conjunto mínimo de campos sin trazabilidad clínica suficiente. | RF-2, RF-3, RF-4 |
| Limitar las categorías a alimentos, medicamentos y accesorios. | Respeta la categorización estricta del contexto y hace verificable la validación. | Aceptar categorías libres. | RF-2 |
| Reservar la auditoría al administrador. | El contexto otorga auditoría completa al administrador y no la incluye en el acceso del veterinario. | Permitir consulta parcial al veterinario sin una regla definida. | RF-1, RF-6 |
| Permitir solo al administrador crear y desactivar cuentas, con datos iniciales precargados. | Garantiza trazabilidad del acceso sin alta autónoma ni recuperación en el MVP. | Permitir alta autónoma de usuarios. | RF-1, RF-6 |
| Persistir datos clínicos, inventario y auditoría en PostgreSQL. | Es obligatorio por la constitución y evita pérdidas de trazabilidad. | Datos solo en memoria o almacenamiento local. | RF-1 a RF-6 |
| Versionar el esquema en archivos SQL numerados con tabla de control. | Da orden, idempotencia y trazabilidad frente a ALTERs dispersos en el arranque. | DDL monolítico más parches ad-hoc en cada inicio. | RF-10 |
| Usar PostgreSQL real por defecto y reservar la memoria a pruebas. | Cumple la constitución y evita perder lo generado al reiniciar. | Memoria en memoria por defecto también en desarrollo. | RF-10 |
| Buscar y filtrar en el frontend sin nuevos endpoints. | El listado completo ya expone nombre, código de barras y dueño; evita API redundante. | Parámetros de búsqueda en cada GET. | RF-11 |
| Usar un adaptador compatible con PostgreSQL para pruebas sin servidor externo. | Permite ejecutar la suite sin PostgreSQL instalado sin cambiar las sentencias SQL. | Exigir un servidor PostgreSQL local para cada ejecución de pruebas. | RF-1 a RF-6 |

## Decisiones pendientes de aprobación
- Ninguna: T03, T04 y T05 quedaron resueltas con el contexto del proyecto.

## Estrategia de pruebas
| Nivel | Cobertura | Casos mínimos | RF cubiertos |
|---|---|---|---|
| Unitarias de reglas de negocio | Validación, permisos, transiciones de estado, cálculo de movimientos y datos inválidos. | Credenciales inválidas; rol sin permiso; código duplicado; cantidad no positiva; transición cerrada o anulada inválida. | RF-1 a RF-6 |
| Integración de persistencia | Restricciones, relaciones, transacciones y auditoría inmutable. | Stock cero permitido; stock negativo rechazado; cierre con varios insumos; fallo de un insumo sin cambios parciales; anulación duplicada. | RF-2, RF-4, RF-5, RF-6 |
| Concurrencia | Cierres y anulaciones simultáneos que comparten productos o atenciones. | Dos cierres que compiten por el último insumo; doble anulación concurrente. | RF-4, RF-5 |
| Aceptación por flujo | Recorridos completos desde la autenticación hasta el resultado observable. | Administrador gestiona producto y revisa auditoría; veterinario registra paciente y cierra atención; bloqueo por stock insuficiente; anulación con reversión. | RF-1 a RF-6 |
| Regresión | Toda corrección de una regla de negocio añade una prueba que la reproduzca. | Ejecución completa de la suite antes de aprobar cambios. | RF-1 a RF-6 |

## Matriz de aceptación
| RF | Evidencia requerida |
|---|---|
| RF-1 | Acceso válido, rechazo de credenciales inválidas y denegación por rol verificados. |
| RF-2 | Alta, validaciones, unicidad, consulta, modificación y auditoría del producto verificadas. |
| RF-3 | Alta, validaciones, modificación y consulta de historial del paciente verificadas. |
| RF-4 | Cierre con stock suficiente, sin insumos y con stock insuficiente verificados sin efectos parciales. |
| RF-5 | Anulación única, reversión exacta, conservación histórica y rechazo de segunda anulación verificados. |
| RF-6 | Registro completo de eventos, inmutabilidad y consulta filtrada por permisos verificados. |
| RF-10 | Migraciones aplicadas en orden, idempotencia, conservación tras reinicio y aborto en español ante fallo verificados. |
| RF-11 | Submenús Registrar/Listar, tabla con búsqueda por nombre o código de barras, filtro de mascotas por dueño, modificación en ventana emergente y baja con confirmación solo para administrador verificados. |
| RF-13 | Listado de productos filtrado por categoría (medicamento, accesorio, alimento para animales), solo productos activos y disponibilidad de stock por producto verificados. |
