# Especificación: MVP de atención e inventario veterinario

## Contexto y objetivo
Una clínica necesita registrar clientes y pacientes, controlar sus insumos y conservar trazabilidad de cada atención, cita y pago. El MVP permite gestionar pacientes y productos, cerrar atenciones con receta registrada en la ficha con descuento parcial hasta agotar stock desde el rol veterinario, y anularlas sin perder el historial. La operación diaria del administrador agrega agenda de citas con check-in e historial de pagos por cita.

## Usuarios
- Administrador: registra clientes y mascotas, modifica sus datos básicos, agenda citas, realiza el check-in, crea, cierra y anula atenciones desde el frontend web conectado a la API, incluyendo consumo interno de insumos; consulta la ficha con historial clínico y el historial de pagos por cita; y consulta la auditoría.
- Veterinario: registra pacientes, crea y cierra atenciones asignando receta desde el frontend web conectado a la API, y consulta la disponibilidad de inventario solo para informar, sin descontar stock.

## Historias de usuario
- Como administrador, quiero registrar y mantener productos con sus datos comerciales para conocer el stock disponible antes de una atención.
- Como administrador, quiero que al registrar un medicamento se exijan lote, fecha de vencimiento y registro sanitario para cumplir la trazabilidad sanitaria.
- Como veterinario, quiero registrar pacientes para asociarles su historial de atenciones.
- Como veterinario, quiero cerrar una atención asignando una receta al paciente para que quede registrada en su ficha, sin descontar stock.
- Como veterinario, quiero recibir un aviso cuando un medicamento recetado no tenga stock suficiente, sin que eso impida cerrar la atención, para indicar que debe adquirirse por otros medios.
- Como veterinario, quiero gestionar las atenciones desde la interfaz web conectada a la API para no depender de llamadas directas a la API.
- Como administrador, quiero anular una atención para corregir un registro cerrado y restaurar sus insumos.
- Como administrador, quiero registrar al cliente dueño y a su mascota para mantener sus datos básicos actualizados.
- Como administrador, quiero agendar citas y realizar el check-in para controlar la asistencia diaria.
- Como administrador, quiero ver el historial de la mascota y su historial de pagos por cita para informar al tutor.
- Como administrador, quiero consultar la auditoría para conocer quién realizó cada acción relevante.

## Requisitos funcionales
### RF-1. Autenticación y acceso
- Cuando una persona ingrese credenciales válidas, el sistema deberá permitirle acceder según su rol.
- Si las credenciales son inválidas, el sistema deberá rechazar el acceso e informar el motivo sin revelar información sensible.
- Mientras una persona no esté autenticada, el sistema no deberá permitirle consultar ni modificar información clínica o de inventario.
- Cuando un usuario no tenga permisos para una acción, el sistema deberá bloquearla e informar que no está autorizado.
- Cuando se gestione una cuenta de usuario, el sistema deberá permitir únicamente que el administrador cree o desactive cuentas, y deberá impedir el acceso a las cuentas desactivadas.

### RF-2. Gestión de productos por el administrador
- Cuando un administrador registre un producto, el sistema deberá exigir nombre, tipo, código de barras único, precio de compra, precio de venta, unidad de medida y proveedor.
- Cuando un administrador registre un producto, el sistema deberá aceptar como opcionales categoría, marca y descripción con texto libre.
- Cuando el tipo de producto sea medicamento, el sistema deberá exigir además lote, fecha de vencimiento válida y registro sanitario, todos con texto o fecha no vacíos.
- Cuando se registre o actualice un producto, el sistema deberá exigir textos no vacíos en los campos obligatorios, tipo perteneciente a alimento, medicamento o accesorio, precios y stocks numéricos no negativos, y código de barras único.
- Cuando se intente registrar o actualizar un medicamento sin lote, sin fecha de vencimiento válida o sin registro sanitario, el sistema deberá rechazar la operación e identificar cada campo faltante.
- Cuando se intente registrar un identificador de producto ya existente, el sistema deberá rechazar la operación.
- Cuando un usuario autorizado consulte el inventario, el sistema deberá mostrar los productos con su nombre, tipo, código de barras, stock actual y estado activo.
- Cuando un administrador modifique un producto, el sistema deberá conservar la modificación, mantener las exigencias condicionales de medicamento y registrar la acción en la auditoría.
- Cuando un veterinario intente crear, modificar o dar de baja productos, el sistema deberá denegar la operación por falta de permiso.

### RF-3. Gestión de pacientes
- Cuando un usuario autorizado registre un paciente, el sistema deberá exigir nombre, especie, raza, edad, peso y los datos de su tutor: nombre, RUT, teléfono y correo electrónico.
- Cuando se registre o actualice un paciente, el sistema deberá exigir textos no vacíos, edad y peso numéricos no negativos, RUT válido, teléfono no vacío y correo electrónico válido.
- Cuando se intente registrar o actualizar un paciente con datos obligatorios inválidos, el sistema deberá rechazar la operación e identificar cada campo inválido.
- Cuando un usuario autorizado consulte un paciente, el sistema deberá mostrar sus datos y sus atenciones vigentes y anuladas.
- Cuando un usuario autorizado modifique un paciente, el sistema deberá conservar la modificación y registrar la acción en la auditoría.

### RF-4. Registro, cierre y receta de atenciones
- Cuando un veterinario o administrador cree una atención, el sistema deberá asociarla a un paciente, al usuario autenticado y a una fecha válida.
- Cuando un veterinario o administrador cierre una atención, el sistema deberá exigir el diagnóstico y el tratamiento registrados.
- Cuando un veterinario asigne un ítem de receta a una atención, el sistema deberá exigir un producto existente, una cantidad mayor que cero y una dosis obligatoria con texto no vacío.
- Cuando se intente asignar una receta sin dosis o con dosis vacía, el sistema deberá rechazar la operación e identificar el campo inválido.
- Cuando un veterinario cierre una atención con receta y el stock disponible cubra lo recetado, el sistema deberá descontar exactamente las cantidades recetadas.
- Cuando un veterinario cierre una atención con receta y el stock disponible sea mayor que cero pero menor que lo recetado, el sistema deberá descontar el stock disponible hasta cero, cerrar la atención igualmente y dejar constancia por producto de la cantidad entregada y la faltante, indicando que el faltante debe adquirirse por medios externos o farmacia.
- Cuando un veterinario cierre una atención con receta y el producto no tenga stock disponible, el sistema deberá cerrar la atención sin descontar stock de ese producto y avisar que debe adquirirse por otros medios.
- Cuando se consulte un paciente, su ficha deberá mostrar las recetas asignadas en sus atenciones vigentes y anuladas.
- Cuando un administrador cierre una atención con consumo interno de insumos, el sistema deberá descontar exactamente las cantidades indicadas de cada producto y registrar la atención como cerrada.
- Si algún insumo de consumo interno no tiene stock suficiente al intentar cerrar una atención, el sistema deberá bloquear el cierre, no descontar stock de ningún producto y señalar los insumos insuficientes; esta regla aplica solo al consumo interno del administrador y no a la receta del veterinario.
- Cuando una atención se cierre correctamente, el sistema deberá registrar en la auditoría el cierre, el descuento de cada insumo de consumo interno y, para receta de veterinario, cada descuento parcial con su cantidad entregada y faltante.

### RF-5. Anulación de atenciones
- Cuando un administrador anule una atención cerrada con consumo interno, el sistema deberá restaurar exactamente las cantidades de insumos descontadas y marcar la atención como anulada.
- Cuando un administrador anule una atención cerrada con descuento parcial de receta, el sistema deberá restaurar exactamente las cantidades efectivamente descontadas y marcar la atención como anulada, conservando la constancia del faltante externo.
- Cuando un administrador anule una atención cerrada que solo contiene receta sin ningún descuento aplicado, el sistema deberá marcar la atención como anulada sin mover stock, conservando la receta para trazabilidad.
- Cuando una atención haya sido anulada, el sistema deberá conservar su contenido, incluida su receta, y mostrar que no está vigente.
- Si se intenta anular una atención que ya está anulada, el sistema deberá rechazar la operación sin alterar el stock.
- Cuando una atención se anule, el sistema deberá registrar la anulación y la restauración de stock en la auditoría.

### RF-6. Auditoría
- Cuando ocurra una creación, modificación, cierre, descuento de stock o anulación, el sistema deberá registrar fecha y hora, usuario, rol, acción, entidad afectada y descripción.
- Cuando un administrador consulte la auditoría, el sistema deberá mostrar los eventos sin permitir modificarlos ni eliminarlos.
- Cuando un veterinario intente consultar la auditoría, el sistema deberá denegar el acceso por falta de permiso.
- Cuando un administrador consulte la auditoría desde el frontend web, el sistema deberá mostrar los eventos en una tabla ordenada de más recientes a más antiguos con columnas fecha y hora, usuario, rol, acción, módulo/entidad y descripción, con mensajes en español, en lugar de un volcado de datos sin formato.

### RF-7. Uso de atenciones desde el frontend web conectado a la API
- Cuando un veterinario inicie sesión desde el frontend web, el sistema deberá permitirle listar pacientes y disponibilidad de productos, listar atenciones, crear una atención en borrador asociada a un paciente, asignarle receta y cerrarla consumiendo la API (`GET /pacientes`, `GET /productos`, `GET /atenciones`, `POST /atenciones`, `PUT /atenciones/:id/insumos` solo como receta sin descuento, `POST /atenciones/:id/cierre`).
- Cuando un veterinario recete un producto sin stock suficiente desde el frontend web, el sistema deberá mostrar un aviso de falta de disponibilidad y permitir completar la receta igualmente.
- Cuando un veterinario consulte atenciones desde el frontend web, el sistema deberá permitirle ver el detalle de una atención (`GET /atenciones/:id`) y las recetas en el historial del paciente.
- Cuando un administrador inicie sesión desde el frontend web, el sistema deberá permitirle además gestionar consumo interno de insumos, consultar una atención y anularla consumiendo la API (`GET /atenciones`, `GET /atenciones/:id`, `POST /atenciones/:id/anulacion`).
- Cuando el frontend invoque operaciones de atenciones, el sistema deberá enviar el token de sesión (`Authorization: Bearer`) y presentar mensajes en español ante éxito, falta de permiso, stock insuficiente o datos inválidos.
- Mientras la sesión sea de veterinario, el sistema no deberá ofrecer ni invocar la anulación de atenciones.
- Cuando un usuario entre al módulo de Atenciones, el sistema deberá mostrar por defecto la vista Registrar atención (formulario de borrador, receta y cierre) y no la vista Listar.
- Cuando un usuario abra el submenú Listar atenciones, el sistema deberá mostrar las atenciones en formato de tabla con columnas identificador/fecha, paciente, estado (vigente o anulada), diagnóstico y acciones (ver detalle y, solo administrador, anular), con mensajes en español y aviso cuando no haya registros.
- Cuando se agreguen ítems a la receta en Registrar atención, el sistema deberá mostrarlos en una tabla pequeña con columnas producto, cantidad, dosis, disponibilidad y acción para quitar, en lugar de texto plano.
- Cuando se intente agregar a la receta un producto sin stock suficiente, el sistema deberá mostrar una ventana emergente de confirmación con el texto «Sin stock suficiente: quedará registrado para compra externa» y opciones Aceptar y Cancelar; si el usuario cancela, el sistema no deberá agregar el ítem; si acepta, deberá agregarlo y conservar el aviso de stock en el cierre y en la ficha, como hasta ahora.
- Cuando existan avisos de falta de stock en el módulo de Atenciones, el sistema deberá mostrar la alerta de aviso de stock arriba de todo el contenido del módulo para que sea visible sin desplazar la vista.
- Cuando una atención se cierre correctamente desde el frontend web, el sistema deberá mostrar una ventana emergente de éxito (p. ej. «Atención cerrada correctamente») con botón Aceptar, además del mensaje y la alerta de stock cuando corresponda.
- El identificador interno de la atención no deberá mostrarse en la interfaz; la atención en curso se identifica por su paciente y fecha.

### RF-8. Administración de clientes, mascotas, citas y check-in
- Cuando un administrador registre un cliente dueño, el sistema deberá exigir nombre con texto no vacío, RUT válido, teléfono no vacío y correo electrónico válido.
- Cuando se intente registrar o actualizar un cliente con datos inválidos, el sistema deberá rechazar la operación e identificar cada campo inválido.
- Cuando se intente registrar un cliente con un RUT ya existente, el sistema deberá rechazar la operación.
- Cuando un administrador registre una mascota, el sistema deberá asociarla a un cliente existente y exigir nombre, especie, raza, edad y peso numéricos no negativos.
- Cuando un administrador modifique los datos básicos de un cliente o de una mascota, el sistema deberá conservar la modificación y registrar la acción en la auditoría.
- Cuando un administrador agende una cita, el sistema deberá asociarla a una mascota existente, a una fecha y hora futuras válidas y a un motivo con texto no vacío.
- Cuando se intente agendar una cita con mascota inexistente, fecha pasada o inválida, o motivo vacío, el sistema deberá rechazar la operación e identificar el motivo.
- Cuando un administrador realice el check-in de una cita programada, el sistema deberá marcarla como registrada y conservar su fecha de check-in.
- Si se intenta hacer check-in de una cita ya registrada, atendida o cancelada, el sistema deberá rechazar la operación sin alterar su estado.
- Cuando un veterinario intente agendar citas o realizar check-in, el sistema deberá denegar la operación por falta de permiso.

### RF-9. Historial de la mascota e historial de pagos por cita
- Cuando un administrador consulte la ficha de una mascota, el sistema deberá mostrar sus datos básicos, su cliente dueño, sus citas programadas, registradas, atendidas y canceladas, y sus atenciones vigentes y anuladas con sus recetas.
- Cuando un administrador registre un pago de una cita, el sistema deberá asociarlo a una cita existente y exigir monto mayor que cero, método con texto no vacío y fecha válida.
- Cuando se intente registrar un pago con cita inexistente, monto no positivo o datos inválidos, el sistema deberá rechazar la operación e identificar cada campo inválido.
- Cuando un administrador consulte el historial de pagos, el sistema deberá mostrar los pagos por cita y por mascota sin permitir modificarlos ni eliminarlos.
- Cuando ocurra una creación o modificación de cliente o mascota, agenda o check-in de cita, o registro de pago, el sistema deberá registrar fecha y hora, usuario, rol, acción, entidad afectada y descripción en la auditoría.

### RF-10. Migraciones y persistencia en PostgreSQL
- Cuando la aplicación inicie con PostgreSQL configurado, el sistema deberá aplicar las migraciones versionadas pendientes en orden antes de aceptar tráfico.
- Cuando se aplique una migración, el sistema deberá registrarla en la tabla de control de esquema y no deberá volver a aplicarla en arranques posteriores.
- Cuando se genere cualquier dato (usuario, producto, cliente, paciente, atención con su receta o consumo, cita, pago o evento de auditoría), el sistema deberá conservarlo en PostgreSQL y deberá recuperarlo tras un reinicio.
- Mientras la aplicación opere en desarrollo o producción, el sistema no deberá usar almacenamiento solo en memoria como persistencia; el almacenamiento en memoria queda reservado únicamente para pruebas automatizadas.
- Si alguna migración falla, el sistema deberá abortar el arranque, informar el error en español y no dejar el esquema a medias mediante ejecución transaccional por migración.

### RF-11. Navegación por submenús Registrar/Listar y gestión en tabla
- Cada módulo (productos, pacientes y mascotas, clientes, citas, pagos y atenciones) deberá ofrecer dos submenús: Registrar ... y Listar ..., respetando los permisos del rol autenticado.
- Cuando un usuario entre a un submenú Listar, el sistema deberá mostrar los registros en formato de tabla con sus datos clave y mensajes en español.
- Cuando un usuario busque en Listar Productos, el sistema deberá ofrecer un campo y un botón de búsqueda por nombre o por código de barras con coincidencia parcial insensible a mayúsculas; sin coincidencias deberá mostrar la tabla vacía con un aviso, no un error.
- Cuando un usuario liste mascotas, el sistema deberá ofrecer filtrarlas por su dueño, ya que un dueño puede tener más de una mascota.
- Cuando un usuario pulse el botón Editar a la derecha de una fila, el sistema deberá abrir una ventana emergente de modificación (p. ej. «Modificar producto») con el mismo formulario de registro precargado con los datos vigentes; al cancelar no deberá alterar ningún dato.
- Cuando un usuario pulse el botón Eliminar de una fila, el sistema deberá pedir confirmación y, al confirmar, aplicar la baja lógica conservando el historial y registrándola en la auditoría; nunca deberá eliminar el registro de forma definitiva.
- Solo el administrador deberá ver e invocar los botones de modificar y eliminar; cuando un veterinario use el frontend, el sistema no deberá ofrecerle ni invocar modificación ni eliminación de datos.
- Cuando un veterinario use el frontend, el sistema deberá permitirle crear atenciones y leer pacientes y disponibilidad de productos, sin ofrecerle eliminar ni modificar pacientes.
- Cuando un usuario entre al módulo de Atenciones, el sistema deberá abrir por defecto el submenú Registrar atención; el submenú Listar atenciones queda disponible como tabla pero no como vista inicial.

### RF-12. Estilo visual veterinario con Tailwind CSS
- Cuando el frontend se construya, el sistema deberá usar Tailwind CSS como framework de estilos (dependencia justificada: ya previsto en `agent.md` §2, utility-first para tablas, formularios y submenús Registrar/Listar sin CSS artesanal disperso).

### RF-13. Listado de productos por categoría con disponibilidad de stock
- Cuando un usuario autorizado consulte el listado de productos, el sistema deberá ofrecer un filtro por categoría con los valores cerrados: medicamento, accesorio y alimento para animales.
- Cuando el usuario seleccione una categoría, el sistema deberá mostrar únicamente los productos activos pertenecientes a esa categoría.
- El listado por categoría deberá considerar el stock de cada producto y deberá indicar su disponibilidad (disponible, bajo stock o sin stock) conforme al stock actual registrado.
- Este comportamiento aplica por igual a medicamentos, accesorios y alimentos para animales.
- Cuando no haya productos activos en la categoría seleccionada, el sistema deberá mostrar la tabla vacía con un aviso en español, sin mostrar un error.
- Cuando se aplique la temática veterinaria, el sistema deberá usar una paleta pastel celeste y blanco como base visual: fondo principal blanco (`#FFFFFF`), fondo suave celeste pastel (`#E0F2FE` / `sky-100`), primario celeste (`#38BDF8` / `sky-400`), primario oscuro para texto y botones (`#0369A1` / `sky-700` para contraste AA) y texto neutro (`slate-800`).
- Cuando se muestren los módulos (productos, pacientes y mascotas, clientes, citas, pagos, atenciones, auditoría), el sistema deberá aplicar la temática de forma consistente a navegación, submenús Registrar/Listar, tablas, formularios, ventanas emergentes de modificación y diálogos de confirmación de baja lógica.
- Cuando se muestren estados de stock (Normal, Bajo, Crítico, Vencido) y avisos de receta sin stock, el sistema deberá conservar un código de color semántico distinguible sobre la base pastel y mensajes en español, sin depender solo del color (texto o icono de apoyo).
- Cuando el frontend se use en escritorio y móvil, el sistema deberá mantener un layout responsive con la misma temática, sin romper la tabla ni los submenús definidos en RF-11.

### RF-14. Datos de ejemplo semilla para pruebas
- Cuando un administrador necesite datos de prueba para validar el MVP, el sistema deberá disponibilizar un script de inserciones SQL con datos de ejemplo (productos, clientes, pacientes, atenciones, citas y pagos) listo para ejecutar contra la base de PostgreSQL tras aplicar las migraciones.
- Las inserciones deberán respetar las restricciones del esquema: códigos y RUT únicos, stock no negativo, cantidades positivas, fechas válidas y referencias válidas entre entidades.
- El README del proyecto deberá documentar los comandos para cargar esos datos de prueba en la base de datos.

### RF-15. Ventanas emergentes con SweetAlert2

- RF-15.1: Cuando el frontend se construye y el usuario ejecuta una acción que requiere confirmación, aviso o éxito, el sistema mostrará la ventana emergente mediante SweetAlert2 en lugar de diálogos nativos del navegador, para homogeneizar los mensajes en español y la experiencia de usuario en todos los módulos.
- RF-15.2: Cuando un administrador pulse el botón «Agregar producto» en el módulo Productos, el sistema mostrará una ventana emergente con el texto «¿Desea agregar producto?» y las opciones Sí y No; si el usuario selecciona Sí, se registrará el producto, y si selecciona No, se conservarán los datos del formulario sin modificarlos, para que el usuario pueda corregir campos equivocados antes de reintentar.
- RF-15.3: Cuando un usuario pulse «Agregar a la receta» en el módulo Atenciones y existan campos obligatorios faltantes o inválidos, el sistema mostrará una ventana emergente de SweetAlert2 indicando el dato faltante que el usuario deberá completar, para que la información sea legible visualmente antes de continuar.
- RF-15.4: Cuando un usuario pulse «Agregar a la receta» en el módulo Atenciones y no haya ningún ítem válido para agregar, el sistema mostrará una ventana emergente con el texto «Aún no hay medicamentos agregados a la receta.», para informar al usuario del estado vacío de la receta.
- RF-15.5: Cuando un veterinario o administrador intente cerrar una atención que tenga ítems en la receta, el sistema mostrará una ventana emergente preguntando «¿Desea cerrar la receta?» con opciones Sí y No; si el usuario selecciona No, se cancelará completamente el cierre de la atención, la atención permanecerá en borrador y no se alterarán los datos, para evitar cierres no intencionados.
- RF-15.6: Cuando un administrador registre una mascota, el sistema mostrará primero una ventana emergente preguntando «¿Desea registrar a la mascota?» con opciones Sí y No; si el usuario selecciona Sí y algún campo obligatorio está vacío, el sistema mostrará una ventana emergente de SweetAlert2 avisando el dato faltante que deberá poner el usuario antes de registrar la mascota; si selecciona No, se conservarán los valores del formulario.
- RF-15.7: Cuando un usuario pulse «Cerrar sesión» en el layout de navegación, el sistema mostrará una ventana emergente «¿Desea cerrar sesión?» sobre un fondo negro que bloquee toda interacción con el resto de la pantalla, con botones Sí y No; el sistema cerrará la sesión solo si el usuario selecciona Sí, y si selecciona No la sesión permanecerá activa, para forzar una decisión explícita antes de salir.
- RF-15.8: Cuando deban mostrarse varias ventanas emergentes de SweetAlert2 como consecuencia de una misma acción, el sistema las mostrará en secuencia, una tras otra, sin omitir ninguna, hasta resolver todas las condiciones, para garantizar que el usuario atienda cada aviso o confirmación.
- RF-15.9: Todas las ventanas emergentes de SweetAlert2 presentarán mensajes en español, con botones Sí/No o Aceptar/Cancelar según corresponda, y respetarán la temática pastel veterinaria definida en RF-12, para mantener consistencia visual y lingüística.
- RF-15.10: El sistema proporcionará una utilidad reutilizable para mostrar ventanas emergentes de SweetAlert2 con mensajes genéricos que admitan texto dinámico, para evitar redefinir los diálogos en cada llamada y mantener la mantenibilidad.

## Requisitos no funcionales
- El sistema deberá presentar mensajes y validaciones en español claro, incluidos los avisos de receta sin stock.
- El sistema deberá impedir registros inconsistentes, en particular stock negativo y consumos parciales al cerrar una atención con consumo interno de administrador; la receta del veterinario descuenta hasta el stock disponible sin dejarlo negativo y registra el faltante externo.
- El sistema deberá conservar de forma persistente en PostgreSQL mediante migraciones versionadas clientes, pacientes, productos, atenciones, citas, pagos, usuarios y eventos de auditoría; el reinicio del backend no deberá perder datos generados.
- El sistema deberá mantener la trazabilidad entre una atención, los insumos consumidos y los eventos que generó.
- El sistema deberá permitir el acceso del frontend web a la API mediante CORS con origen permitido configurable (por defecto `http://localhost:5173` en desarrollo); las respuestas deberán incluir `Access-Control-Allow-Origin` y el preflight `OPTIONS` hacia `/auth/login` deberá responder con éxito.
- El sistema deberá aplicar la temática pastel celeste y blanco mediante Tailwind CSS (tokens/tema centralizado, sin estilos inline dispersos) y mantener contraste legible AA en textos y botones sobre fondos pasteles.

## Casos límite
- Un producto con código de barras duplicado no puede registrarse dos veces; la unicidad se evalúa por código normalizado.
- Un medicamento sin lote, sin vencimiento válido o sin registro sanitario no puede registrarse ni quedar como medicamento tras una modificación.
- Un cliente con RUT duplicado no puede registrarse dos veces; la unicidad se evalúa por RUT normalizado.
- Una cita no puede agendarse en el pasado; el check-in no puede duplicarse ni aplicarse a citas atendidas o canceladas.
- Un pago no puede registrarse con monto cero o negativo ni sobre una cita inexistente; los pagos registrados no se modifican ni eliminan.
- Un producto puede quedar con stock cero tras cerrar una atención con consumo interno; no puede quedar con stock negativo.
- Una atención con receta de veterinario puede cerrarse aunque uno o más medicamentos no tengan stock suficiente; el sistema descuenta el stock disponible hasta cero, avisa por producto lo entregado y lo faltante para compra externa o farmacia, y nunca deja stock negativo.
- Una atención con consumo interno puede cerrarse sin insumos si cumple los demás datos obligatorios.
- La insuficiencia de uno o más insumos de consumo interno impide el descuento de todos los insumos de esa atención; esta regla aplica solo al consumo interno del administrador y no a la receta del veterinario, que descuenta parcial hasta agotar stock.
- Anular una atención restaura el stock aunque el producto esté marcado como no disponible para nuevas selecciones.
- Un producto que ya tenga movimientos vinculados no debe perder su trazabilidad histórica.
- Una búsqueda por nombre o código de barras sin coincidencias muestra la tabla vacía con un aviso y no es un error.
- El filtro de mascotas por dueño muestra solo las mascotas de ese dueño; un dueño puede tener más de una mascota.
- La ventana de modificación precarga los datos vigentes y cancelar no altera nada.
- Un registro ya dado de baja no ofrece el botón Eliminar por segunda vez.
- El reinicio del backend con PostgreSQL real conserva todo lo generado; una migración ya aplicada no se re-ejecuta.
- El fallo de una migración bloquea el arranque y no deja cambios parciales de esa migración.
- Cancelar la confirmación de receta sin stock no agrega el ítem ni genera aviso; aceptarla lo agrega y conserva el aviso existente en el cierre y en la ficha.
- El listado de atenciones y la tabla de auditoría sin registros muestran un aviso en español y no un error.
- La tabla de receta sin ítems indica que aún no hay medicamentos agregados.
- La temática pastel se degrada de forma legible si Tailwind no carga (fondo blanco, texto oscuro); ningún estado de stock o acción crítica depende solo del color.
- Si el usuario cancela la ventana emergente de «¿Desea agregar producto?», no se registra el producto ni se altera el formulario.
- Si el usuario cancela la ventana emergente de cierre de receta, la atención no se cierra y se conserva el borrador actual.
- Si el usuario cancela la ventana emergente de registro de mascota, no se registra la mascota y se conservan los valores del formulario.
- Si el usuario cancela la ventana emergente de «¿Desea cerrar sesión?», la sesión permanece activa y no se navega al login.

## Fuera de alcance
- Panel de métricas, gráficos y alertas de vencimiento.
- Exportación de inventario, ficha clínica, receta, agenda o auditoría.
- Gestión de proveedores, compras y lotes.
- Eliminación definitiva de clientes, productos, pacientes, atenciones, citas, pagos o eventos de auditoría.
- Recuperación de contraseña, alta autónoma de usuarios y permisos configurables.
- Recordatorios automáticos, facturación tributaria y pagos en línea; el historial de pagos es solo registro y consulta.
- Reversión destructiva automática de migraciones ya aplicadas; ante fallo solo se bloquea el arranque.
- Modo oscuro, sistema de diseño propio fuera de Tailwind y animaciones complejas; la temática se limita a la paleta pastel celeste y blanco definida en RF-12.
- Animaciones personalizadas o sonidos en las ventanas emergentes de SweetAlert2 más allá del comportamiento por defecto de la librería.
- Almacenamiento de preferencias del usuario para omitir automáticamente futuras ventanas emergentes de confirmación.
- Notificaciones push o correos electrónicos disparados desde las ventanas emergentes.

## Criterios de finalización
- Un administrador puede autenticarse, gestionar productos con validación condicional por tipo, gestionar pacientes, registrar clientes y mascotas, modificar sus datos básicos, agendar citas, realizar check-in, ver la ficha con historial y consultar el historial de pagos y una auditoría inmutable.
- Un veterinario puede autenticarse, crear y cerrar una atención con receta vinculada a un paciente, con descuento parcial hasta agotar stock y constancia del faltante externo.
- Un veterinario puede, desde el frontend web conectado a la API, listar pacientes y disponibilidad, crear una atención desde la vista inicial Registrar atención, asignarle receta mostrada en tabla pequeña con confirmación emergente ante falta de stock (Aceptar agrega y conserva el aviso, Cancelar no agrega), cerrarla con ventana emergente de éxito y alerta de stock visible arriba de todo, sin mostrar el identificador interno, y ver su receta en la ficha; el submenú Listar atenciones muestra una tabla con estado y acciones; un administrador puede además gestionar consumo interno y anularla desde el frontend web.
- El cierre de una atención con consumo interno descuenta el stock completo o no realiza ningún descuento; el cierre con receta de veterinario descuenta hasta el stock disponible sin dejarlo negativo.
- La anulación autorizada restaura el stock efectivamente descontado (incluido el descuento parcial de receta) y conserva la atención y la auditoría.
- Cada requisito funcional cuenta con evidencia automatizada de sus criterios de aceptación.
- El inicio de sesión desde el frontend (`http://localhost:5173` → `http://localhost:3001/auth/login`) no es bloqueado por CORS y el preflight `OPTIONS` responde con éxito.
- El backend con PostgreSQL real aplica migraciones en orden, no re-aplica las ya registradas, conserva lo generado tras reinicio y aborta el arranque en español si una migración falla; en pruebas se sigue usando almacenamiento en memoria.
- Un administrador gestiona cada módulo con submenús Registrar/Listar, tabla con búsqueda por nombre o código de barras, filtro de mascotas por dueño, ventana de modificación y eliminación con confirmación como baja lógica; un veterinario crea atenciones y solo lee pacientes y disponibilidad, sin botones de modificar ni eliminar.
- La auditoría se presenta en el frontend como tabla ordenada de más recientes a más antiguos con fecha y hora, usuario, rol, acción, módulo/entidad y descripción, en lugar de un volcado de datos sin formato.
- El frontend compila con Tailwind CSS aplicado y muestra la temática pastel celeste y blanco de forma consistente en navegación, tablas, formularios, ventanas emergentes y diálogos, en escritorio y móvil, con estados de stock distinguibles y sin depender solo del color.
- Un usuario autorizado puede filtrar el listado de productos por categoría (medicamento, accesorio, alimento para animales), ver solo productos activos de esa categoría y consultar la disponibilidad de stock de cada uno; sin productos activos se muestra tabla vacía con aviso.
- Existe un script de inserciones de datos de ejemplo ejecutable contra PostgreSQL tras aplicar las migraciones, y su uso está documentado en el README.
- Al registrar un producto, el sistema muestra SweetAlert2 con «¿Desea agregar producto?» (Sí/No); al elegir Sí se registra el producto y al elegir No se conservan los datos del formulario sin modificarlos.
- Al intentar agregar a la receta con campos obligatorios faltantes o inválidos, el sistema muestra SweetAlert2 indicando el dato faltante que debe completar el usuario; cuando la receta está vacía, muestra «Aún no hay medicamentos agregados a la receta.»
- Al cerrar una atención con receta, el sistema muestra SweetAlert2 preguntando «¿Desea cerrar la receta?» (Sí/No); al elegir No la atención permanece en borrador sin alterar datos.
- Al registrar una mascota, el sistema muestra primero SweetAlert2 preguntando «¿Desea registrar a la mascota?» (Sí/No); si elige Sí y falta un campo obligatorio, muestra el aviso del dato faltante antes de registrar; si elige No, conserva los valores del formulario.
- Al pulsar «Cerrar sesión», el sistema muestra SweetAlert2 con fondo negro que bloquea toda interacción y botones Sí/No; cierra la sesión solo al elegir Sí.
- Varias ventanas emergentes derivadas de una misma acción se muestran en secuencia, una tras otra, sin omitir ninguna.
- Todas las ventanas emergentes usan SweetAlert2, presentan mensajes en español con botones Sí/No o Aceptar/Cancelar, respetan la temática pastel veterinaria y el frontend ya no depende de `window.confirm` ni `alert`.

## Decisiones adoptadas
- El tipo de producto es la clasificación principal con valores cerrados alimento, medicamento o accesorio; la categoría pasa a texto descriptivo opcional y el SKU actual de la API corresponde al código de barras único.
- Los medicamentos exigen lote, fecha de vencimiento y registro sanitario de forma condicional; el resto de tipos no los exige.
- Solo el administrador puede consultar la auditoría; el veterinario no tiene acceso a dicho módulo.
- Solo el administrador puede crear y desactivar cuentas; el sistema inicia con un administrador y un veterinario; no existe alta autónoma ni recuperación de contraseña en el MVP.
- La receta del veterinario descuenta stock disponible de forma parcial sin bloquear el cierre: si el stock cubre lo recetado se descuenta exacto; si es mayor que cero pero insuficiente se descuenta hasta cero y se registra por producto lo entregado y lo faltante para compra externa o farmacia; sin stock no se descuenta y se avisa. El bloqueo total ante insuficiencia aplica solo al consumo interno del administrador; la anulación restaura lo efectivamente descontado en ambos casos.
- El administrador concentra la operación diaria: clientes, mascotas, agenda, check-in e historial de pagos; el veterinario no agenda ni hace check-in.
- El cliente dueño pasa a entidad propia con RUT único y mascotas asociadas; los pagos son inmutables y siempre pertenecen a una cita existente.
- La persistencia operativa es PostgreSQL con migraciones SQL versionadas y tabla de control; `pg-mem` queda solo para pruebas; el arranque aplica pendientes en transacción y falla cerrado ante error.
- Cada módulo del frontend se navega con submenús Registrar/Listar; el listado es una tabla con búsqueda parcial por nombre o código de barras, filtro de mascotas por dueño, edición en ventana emergente precargada y eliminación como baja lógica con confirmación, reservada al administrador.
- El módulo de Atenciones abre por defecto en Registrar atención; Listar atenciones es una tabla con identificador/fecha, paciente, estado, diagnóstico y acciones, y no la vista inicial.
- La receta en curso se muestra como tabla pequeña (producto, cantidad, dosis, disponibilidad, quitar); agregar un ítem sin stock exige confirmación emergente («Sin stock suficiente: quedará registrado para compra externa», Aceptar/Cancelar; cancelar no agrega) y la alerta de aviso de stock se ubica arriba de todo el contenido del módulo.
- El cierre exitoso muestra una ventana emergente de éxito con botón Aceptar; el identificador interno de la atención nunca se muestra en la interfaz y la atención en curso se identifica por paciente y fecha.
- La auditoría se presenta en tabla ordenada de más recientes a más antiguos con fecha y hora, usuario, rol, acción, módulo/entidad y descripción, en lugar de un volcado sin formato.
- Tailwind CSS es el framework de estilos del frontend (justificación según constitución §1: ya previsto en `agent.md` §2 y evita CSS disperso); la temática es pastel veterinaria celeste y blanco con tokens centralizados (`#FFFFFF`, `#E0F2FE`, `#38BDF8`, `#0369A1`, `slate-800`), contraste AA y estados semánticos de stock siempre acompañados de texto o icono.
- El listado de productos se filtra por categoría cerrada (medicamento, accesorio, alimento para animales) y cada producto muestra su disponibilidad de stock (disponible, bajo stock o sin stock); cuando no hay productos activos en la categoría se muestra tabla vacía con aviso, sin error.
- El script de datos de ejemplo se mantiene como un archivo SQL independiente (`backend/src/db/seed_data.sql`) ejecutado explícitamente por el administrador tras aplicar las migraciones, no como parte del arranque automático de `initDatabase`, para evitar poblar la base sin intención.
- El frontend usa SweetAlert2 como única librería de ventanas emergentes (confirmaciones, avisos y éxito) en todos los módulos, sustituyendo los diálogos nativos del navegador, para homogeneizar la experiencia de usuario y los mensajes en español.
