# Tareas: MVP de atención e inventario veterinario

Todas las tareas están estimadas en menos de 30 minutos. Cada tarea de comportamiento empieza con su prueba automatizada correspondiente.

## Decisiones previas
- [x] T01 · Confirmar permisos del administrador sobre atenciones. RF-1, RF-4.
  Hecho cuando: la spec indica explícitamente si el administrador puede crear y cerrar atenciones.
- [x] T02 · Confirmar campos obligatorios de producto, paciente, tutor y atención. RF-2, RF-3, RF-4.
  Hecho cuando: la spec enumera los campos obligatorios y sus validaciones básicas.
- [x] T03 · Resolver categorías de producto frente a `agent.md`. RF-2.
  Hecho cuando: la spec y el contexto no contienen requisitos contradictorios de producto.
- [x] T04 · Confirmar visibilidad de auditoría para veterinarios. RF-1, RF-6.
  Hecho cuando: la spec define qué eventos puede consultar cada rol.
- [x] T05 · Confirmar alta, desactivación y administración de cuentas. RF-1, RF-6.
  Hecho cuando: la spec define quién puede administrar cuentas y cómo existen los usuarios iniciales.

## Base persistente y reglas transversales
- [x] T06 · Crear la estructura persistente de usuarios y roles. RF-1, RF-6.
  Hecho cuando: usuarios con correo único, rol y estado se guardan y las restricciones se verifican con pruebas de integración.
- [x] T07 · Crear la estructura persistente de productos y sus restricciones. RF-2.
  Hecho cuando: código único, precios no negativos y stock no negativo se rechazan o aceptan conforme a pruebas.
- [x] T08 · Crear la estructura persistente de pacientes. RF-3.
  Hecho cuando: los datos obligatorios definidos para paciente y tutor se persisten y se validan con pruebas.
- [x] T09 · Crear la estructura persistente de atenciones, insumos y estados. RF-4, RF-5.
  Hecho cuando: una atención puede relacionar paciente, veterinario e insumos, y solo admite los estados aprobados.
- [x] T10 · Crear la estructura persistente de movimientos de stock. RF-4, RF-5, RF-6.
  Hecho cuando: cada movimiento identifica producto, cantidad, motivo, atención, usuario y fecha mediante una prueba de integración.
- [x] T11 · Crear la estructura persistente de eventos de auditoría. RF-2, RF-3, RF-4, RF-5, RF-6.
  Hecho cuando: un evento conserva todos los datos exigidos y las operaciones de actualización o eliminación son rechazadas por pruebas.
- [x] T12 · Crear datos iniciales de usuarios autorizados. RF-1.
  Hecho cuando: existe al menos un administrador y un veterinario utilizables según la regla de cuentas aprobada.

## Autenticación y autorización
- [x] T13 · Probar y habilitar el inicio de sesión con credenciales válidas. RF-1.
  Hecho cuando: una prueba confirma acceso de cada rol con credenciales válidas.
- [x] T14 · Probar y manejar credenciales inválidas. RF-1.
  Hecho cuando: una prueba confirma que el acceso se rechaza con un mensaje en español sin revelar información sensible.
- [x] T15 · Probar y aplicar la denegación por falta de autenticación. RF-1.
  Hecho cuando: una prueba confirma que una persona no autenticada no puede consultar ni modificar datos protegidos.
- [x] T16 · Probar y aplicar permisos por rol para cada acción. RF-1, RF-2, RF-3, RF-4, RF-5, RF-6.
  Hecho cuando: una matriz de pruebas confirma acciones permitidas y denegadas para administrador y veterinario.

## Productos e inventario
- [x] T17 · Probar y registrar productos válidos. RF-2.
  Hecho cuando: una prueba confirma que un producto con todos los campos obligatorios se guarda y queda consultable.
- [x] T18 · Probar validaciones y unicidad de productos. RF-2.
  Hecho cuando: pruebas rechazan código duplicado y cada valor inválido definido en la spec.
- [x] T19 · Probar consulta y modificación autorizada de productos. RF-2, RF-6.
  Hecho cuando: pruebas confirman consulta de stock, conservación del cambio y evento de auditoría.
- [x] T20 · Probar desactivación de productos con historial. RF-2, RF-4, RF-5.
  Hecho cuando: una prueba confirma que el producto no se elimina, conserva sus referencias y no se ofrece para nuevas selecciones.

## Pacientes
- [x] T21 · Probar y registrar pacientes válidos. RF-3.
  Hecho cuando: una prueba confirma que un paciente con sus campos obligatorios queda guardado y consultable.
- [x] T22 · Probar validaciones y modificación de pacientes. RF-3, RF-6.
  Hecho cuando: pruebas rechazan datos inválidos, conservan modificaciones válidas y registran la auditoría.
- [x] T23 · Probar la consulta del historial del paciente. RF-3.
  Hecho cuando: una prueba confirma que se muestran atenciones cerradas y anuladas del paciente correcto.

## Atenciones y movimientos de stock
- [x] T24 · Probar la creación de una atención en borrador. RF-4.
  Hecho cuando: una prueba confirma asociación con paciente y veterinario autenticado sin alterar stock.
- [x] T25 · Probar validaciones de cierre e insumos. RF-4.
  Hecho cuando: pruebas rechazan diagnóstico, tratamiento, producto o cantidad inválidos y aceptan una atención sin insumos.
- [x] T26 · Probar el cierre con stock suficiente. RF-4, RF-6.
  Hecho cuando: una prueba confirma descuento exacto, estado cerrada, movimientos y eventos de auditoría.
- [x] T27 · Probar el bloqueo de cierre por stock insuficiente. RF-4.
  Hecho cuando: una prueba confirma que ningún stock, movimiento, estado ni auditoría de cierre cambia cuando falla un insumo.
- [x] T28 · Probar cierre concurrente sobre el último insumo. RF-4.
  Hecho cuando: una prueba concurrente confirma que solo un cierre se completa y el stock nunca es negativo.
- [x] T29 · Probar la conservación de datos históricos del insumo. RF-4, RF-5.
  Hecho cuando: una prueba confirma que una atención cerrada conserva sus datos de insumo tras cambiar o desactivar el producto.

## Anulación y auditoría
- [x] T30 · Probar la anulación autorizada de una atención cerrada. RF-5, RF-6.
  Hecho cuando: una prueba confirma estado anulada, reversión exacta, movimientos de reverso y eventos de auditoría.
- [x] T31 · Probar el rechazo de una segunda anulación. RF-5.
  Hecho cuando: una prueba confirma que una atención ya anulada no altera stock, movimientos ni eventos.
- [x] T32 · Probar la anulación concurrente. RF-5.
  Hecho cuando: una prueba concurrente confirma que solo una anulación produce la reversión de stock.
- [x] T33 · Probar la consulta inmutable de auditoría. RF-6.
  Hecho cuando: pruebas confirman que un administrador ve eventos completos y que no puede modificarlos ni eliminarlos.
- [x] T34 · Probar la consulta de auditoría restringida por rol. RF-1, RF-6.
  Hecho cuando: pruebas confirman que el veterinario ve exactamente los eventos definidos en la decisión aprobada.

## Validación final
- [x] T35 · Ejecutar la matriz de aceptación completa. RF-1 a RF-6.
  Hecho cuando: cada RF tiene una prueba automatizada aprobada y enlazada a su criterio de aceptación.
- [x] T36 · Revisar regresiones y mensajes al usuario. RF-1 a RF-6.
  Hecho cuando: la suite completa pasa y todos los mensajes expuestos por los flujos cubiertos están en español.

## Acceso web del frontend (RNF CORS)
- [x] T37 · Permitir el acceso del frontend a la API mediante CORS configurable. RNF.
  Hecho cuando: el preflight `OPTIONS` a `/auth/login` y el login real incluyen `Access-Control-Allow-Origin` para `http://localhost:5173` con prueba automatizada en `tests/cors.test.ts`.

## Migraciones y persistencia (RF-10)
- [x] T38 · Versionar el esquema en migraciones SQL ordenadas con tabla de control. RF-10.
  Hecho cuando: `db/migrations/*.sql` se aplican en orden, cada versión queda registrada y no se re-aplica en el siguiente arranque.
- [x] T39 · Usar PostgreSQL real por defecto y reservar la memoria a pruebas. RF-10.
  Hecho cuando: sin `USE_PG_MEMORY` el backend exige `DATABASE_URL` y persiste lo generado tras reinicio; las pruebas siguen usando memoria.
- [x] T40 · Probar idempotencia, conservación y fallo de migraciones. RF-10.
  Hecho cuando: pruebas confirman que re-ejecutar migraciones no duplica ni falla, que un dato creado queda en la base y que una migración inválida aborta con mensaje en español.

## Navegación y gestión en frontend (RF-11)
- [x] T41 · Probar y usar submenús Registrar/Listar por módulo según rol. RF-11.
  Hecho cuando: cada módulo ofrece Registrar y Listar, el veterinario solo crea atenciones y lee pacientes sin botones de modificar ni eliminar.
- [x] T42 · Probar y listar productos en tabla con búsqueda por nombre o código de barras. RF-11.
  Hecho cuando: la tabla filtra por coincidencia parcial insensible a mayúsculas y sin coincidencias muestra aviso sin error.
- [x] T43 · Probar y filtrar mascotas por dueño. RF-11.
  Hecho cuando: el listado de mascotas muestra solo las del dueño seleccionado.
- [x] T44 · Probar y modificar con ventana emergente y eliminar con confirmación solo como admin. RF-11.
  Hecho cuando: Editar abre «Modificar ...» precargado, Eliminar pide confirmación y aplica baja lógica con auditoría, y el veterinario no ve ninguno de los dos botones.

## Mejoras de atenciones: éxito, descuento parcial y limpieza (nuevo)
- [ ] T45 · Mostrar ventana emergente de éxito al cerrar una atención. RF-4, RF-7.
  Hecho cuando: cerrar una atención desde el frontend abre un modal de éxito con botón Aceptar, además del mensaje y la alerta de stock cuando corresponda.
- [ ] T46 · Probar y aplicar descuento parcial de receta con faltante externo. RF-4, RF-5, RF-6.
  Hecho cuando: pruebas confirman que con stock 15 y receta 16 se descuentan 15, el stock queda en 0, el aviso detalla por producto lo entregado y lo faltante para compra externa o farmacia, sin stock no se descuenta, el stock nunca queda negativo, el consumo interno del administrador sigue bloqueante y la anulación restaura lo efectivamente descontado.
- [ ] T47 · Ocultar el identificador interno de la atención en la interfaz. RF-7.
  Hecho cuando: ninguna vista muestra el UUID de la atención y la atención en curso se identifica por paciente y fecha.

## Listado de productos por categoría con stock (nuevo)
- [x] T48 · Probar filtrado de productos por categoría cerrada. RF-13.
  Hecho cuando: pruebas confirman que al seleccionar medicamento, accesorio o alimento para animales se muestran solo productos activos de esa categoría.
- [x] T49 · Probar indicador de disponibilidad de stock en el listado por categoría. RF-13.
  Hecho cuando: pruebas confirman que cada producto listado muestra disponible, bajo stock o sin stock según su stock actual.
- [x] T50 · Probar categoría sin productos activos muestra tabla vacía con aviso. RF-13.
  Hecho cuando: pruebas confirman que sin productos activos en la categoría seleccionada se muestra tabla vacía con aviso en español y no un error.

## Ventanas emergentes con SweetAlert2 (nuevo)
- [x] T51 · Instalar sweetalert2 en el frontend. RF-15.
  Hecho cuando: la dependencia `sweetalert2` está registrada en `frontend/package.json` y se puede importar en el frontend.
- [x] T52 · Confirmar «¿Desea agregar producto?» antes de registrar un producto. RF-15.
  Hecho cuando: al pulsar «Agregar producto» se abre una ventana emergente de SweetAlert2 con Sí/No y solo al confirmar se registra el producto; al cancelar se conservan los datos del formulario.
- [x] T53 · Ventana emergente «Aún no hay medicamentos agregados a la receta» y aviso de campo faltante al agregar a la receta. RF-15.
  Hecho cuando: al pulsar «Agregar a la receta» con campos faltantes se muestra SweetAlert2 indicando el dato faltante, y si la receta está vacía se muestra «Aún no hay medicamentos agregados a la receta.»
- [x] T54 · Confirmar cierre de receta al cerrar una atención con receta. RF-15.
  Hecho cuando: al cerrar una atención con receta se pregunta mediante SweetAlert2 «¿Desea cerrar la receta?» (Sí/No); si se elige No, el cierre se cancela y la atención permanece en borrador.
- [x] T55 · Confirmar registro de mascota y avisar campo faltante. RF-15.
  Hecho cuando: al registrar una mascota se pregunta primero «¿Desea registrar a la mascota?» (Sí/No); si elige Sí y falta un campo obligatorio, SweetAlert2 indica el dato faltante; si elige No, se conservan los valores del formulario.
- [x] T56 · Ventana emergente «¿Desea cerrar sesión?» con layout negro y botones Sí/No. RF-15.
  Hecho cuando: al pulsar «Cerrar sesión» se abre una ventana emergente con fondo negro (overlay oscuro) que bloquea toda interacción, botones Sí y No, y al confirmar se cierra la sesión; al cancelar la sesión permanece activa.
- [x] T57 · Reemplazar diálogos nativos (`window.confirm` / `alert`) por SweetAlert2 en todo el frontend. RF-15.
  Hecho cuando: el frontend no usa `window.confirm` ni `alert`; todas las confirmaciones, avisos y éxitos usan SweetAlert2 con mensajes en español.
