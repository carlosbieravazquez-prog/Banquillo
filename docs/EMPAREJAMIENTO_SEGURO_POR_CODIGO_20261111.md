# Banquillo · Emparejamiento seguro por código

## Entrenadores
- Se incorporan exclusivamente con cuenta autenticada y correo confirmado.
- El código único del equipo envía una solicitud PENDIENTE, no concede acceso directo.
- El director deportivo ve las solicitudes y asigna el cargo: principal, segundo, tercero, delegado u otro.
- Solo entonces se habilita el acceso a la temporada y sus actas.
- Al expulsar, se elimina la membresía de temporada y el cliente limpia los datos protegidos.
- Los entrenadores heredados de temporadas compartidas se reconocen por su cuenta real, no por nombres escritos.

## Directores
- Máximo dos directores con cuentas independientes.
- Incorporación mediante código de un solo uso de 10 minutos.
- Expulsión o salida con transferencia de propiedad del club y de las temporadas vinculadas cuando corresponde.
- Inserciones directas en las tablas de directores y cuerpo técnico deshabilitadas.

## Equipos y compatibilidad
- Crear un equipo de club prepara su temporada propia sin consumir silbatos de equipo independiente.
- El antiguo código general no permite saltarse la aprobación de Dirección Deportiva.
- Copias JSON: solo configuración; nunca crean cuentas o cargos ficticios.
- La demo muestra datos ficticios pero ya no ofrece añadir personas mediante texto libre.

## Pruebas de Supabase ejecutadas con rollback
- Equipo, temporada y código único: correcto.
- Solicitud pendiente: sin lectura de jugadores ni actas.
- Aprobación: crea acceso real y asigna cargo.
- Autoaprobación denegada; expulsión revoca acceso.
- Rechazo y reintento con código: correcto.
- Código general antiguo no salta la aprobación.
- Código temporal de segundo director, expulsión y transferencias: correctos.
- Bloqueada la inserción directa de directores/entrenadores ficticios.

## Pendiente
No se ha certificado una prueba visual end-to-end con dos cuentas y dos navegadores reales. Confirmar registro, invitación, aprobación, cargo, apertura de actas y expulsión en GitHub Pages. Revisar también los avisos de seguridad pendientes de Supabase Auth antes de apertura general.
