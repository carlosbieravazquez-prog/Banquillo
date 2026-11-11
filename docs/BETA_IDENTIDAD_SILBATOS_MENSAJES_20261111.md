# Banquillo Beta · identidad, silbatos y mensajería interna

## Funciones realizadas

### Directores
- La sesión autenticada determina la identidad; la demo ya no ofrece «Cambiar a este director».
- Máximo dos directores. Ambas cuentas pueden expulsar a la otra o abandonar el club. Cuando se expulsa al propietario y el otro sigue en el club, la titularidad y las temporadas del club pasan al director restante de forma transaccional.
- La salida del único responsable se bloquea para evitar clubes sin administrador.
- Los códigos nuevos son de **un solo uso** y caducan tras **10 minutos**. La pantalla de Dirección Deportiva los genera **solo tras pulsar un botón**, los renueva si están a punto de caducar y los oculta cuando vuelve a estar completo el cupo.
- Se han revocado los permisos de ejecución de las RPC antiguas de códigos y baja que no respetaban las nuevas reglas.
- **Atención:** expulsar de la Dirección Deportiva no cambia automáticamente la titularidad o los permisos independientes de temporadas del entrenador. Revisar aparte los miembros de cada temporada.

### Silbatos de gestión
- Se crea un saldo independiente de los Silbatos de IA, para no alterar sus informes ni suscripciones.
- 20 silbatos por año deportivo, con reposición al iniciar sesión o usar el saldo desde el **1 de agosto** (hasta 20, sin acumulación).
- 10 por club, 5 por temporada/equipo individual, 0 adicionales por equipos creados dentro de un club.
- Reembolso **una sola vez** al cerrar o eliminar un club o cerrar una temporada individual en el mismo año deportivo en el que se pagó; no se reembolsan cargos anteriores al período vigente.
- Toda deducción y devolución se procesa en SQL dentro de una única transacción. La información se muestra en Configuración de Dirección Deportiva, no en otras pestañas.
- No se cambia el contador de Silbatos utilizado para la IA.

### Mensajes
- No se abre WhatsApp, tampoco desde la demostración.
- Dirección Deportiva envía un mensaje por equipo desde Comunicaciones o Avisos. El servidor lo entrega solo a las cuentas con rol **editor** en la temporada exacta asociada al equipo.
- Los entrenadores reciben la notificación en su página Inicio, pueden marcar como leído y **abrir directamente la jornada** asociada al aviso.
- Al guardar el acta con ambos resultados, el servidor resuelve el mensaje de acta. La confirmación de convocatoria también resuelve su aviso correspondiente.
- Se guarda un evento interno para Dirección Deportiva, y la página consulta los cambios periódicamente. No hay dependencia de correo ni de WhatsApp.
- Se mantienen RLS, grants limitados y validaciones server-side. No se añaden datos de menores a las notificaciones.

## Pruebas SQL, en transacciones revertidas
- Código temporal con expiración de diez minutos: correcto.
- Código de un solo uso y código caducado: rechazados cuando corresponde.
- Segundo director puede expulsar al propietario: titularidad transferida.
- El director único no puede abandonar sin transferir o cerrar; salida con transferencia: correcto.
- El director envía aviso a editor autorizado de la temporada; editor puede leerlo y marcarlo leído.
- Acta cerrada: aviso resuelto y evento al director.
- Coste de club 10, equipo individual 5, reembolsos 10 y 5, sin devoluciones repetidas.
- Tablas de saldo y mensajes denegadas para el rol anónimo.
- Todas las pruebas anteriores revertidas y sin datos falsos persistentes.

## Límites y revisiones recomendadas antes de producción general
- No se han realizado pruebas de navegador real con dos cuentas en móvil/ordenador ni auditoría independiente completa. Validación de sintaxis no es una prueba visual.
- El saldo de gestión se renueva **perezosamente** en el primer acceso/acción desde agosto, no requiere un cron activo para cuentas inactivas.
- Las notificaciones se muestran dentro de la web (consulta cada 20 segundos) mientras esté abierta; no son notificaciones push del dispositivo.
- Para compartir avisos con entrenadores, deben estar unidos a la temporada del equipo como editores. Los nombres escritos solo en «Cuerpo técnico» no son una cuenta con acceso.
- La planificación avanzada y algunos avisos previos que permanecían como demo no están conectados por completo a la versión real.
- Revisar los avisos del auditor Supabase, especialmente protección de contraseñas filtradas y permisos de funciones definer.
