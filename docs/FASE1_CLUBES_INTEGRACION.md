# Banquillo Beta · cierre técnico de clubes (11 de noviembre de 2026)

## Incorporado al proyecto
- Página `clubes.html`: autenticación de Supabase y acceso a clubes (sin datos ficticios).
- Creación de clubes y equipos; filtro F7/F11/Todos.
- Vinculación manual de una temporada existente, exclusivamente por su propietario.
- Marcador V/E/D, goles a favor/en contra, diferencia, goleadores, minutos y convocatorias calculados con `js/calc.js`.
- Consulta de entrenadores autorizada por `season_members_list`.
- Códigos aleatorios de 128 bits para incorporar hasta dos directores, renovación y revocación de membresías de dirección.
- Avisos al abrir el panel sobre partidos pasados sin cerrar y convocatorias próximas sin confirmar. **No se envían automáticamente.**

## Base de datos ya desplegada
Migraciones registradas en Supabase:
1. `banquillo_clubes_fase1_base_20261111`
2. `banquillo_clubes_directores_codigos_20261111`
3. `banquillo_seguridad_basica_beta_20261111`

Nuevas tablas: `banquillo_clubs`, `banquillo_club_directors`, `banquillo_teams`, `banquillo_club_codes`. RLS activado; vínculo de temporada autorizado en función de trigger, límite de doce equipos y dos directores adicionales. Tabla de códigos inaccesible directamente a cuentas públicas.

## Verificaciones completadas
- Consulta de catálogo: nuevas tablas presentes, con RLS y políticas en clubes/directores/equipos.
- Sin JWT ni sesión, no se observan clubes/equipos.
- Alta de un club y de un equipo como usuario autenticado, en transacción revertida.
- Prueba con dos usuarios: generar código, unirse al club, leerlo y revocar acceso; transacción revertida.
- Sintaxis de `js/clubs-beta.js` compilada correctamente.

## Limitaciones antes de declarar producción final
1. Falta realizar **prueba visual real con navegador** en móvil y escritorio. No se ha probado el despliegue de GitHub Pages extremo a extremo.
2. El acceso a un club **no concede acceso a las actas de una temporada**; es una separación deliberada de permisos. La dirección debe unirse también a la temporada existente mediante su invitación segura.
3. El código de club incorpora directores, **no entrenadores**. Las invitaciones y bajas del cuerpo técnico siguen en el flujo de temporada existente.
4. La agenda avanzada, el planificador de instalaciones, la auditoría de campos anterior/nuevo y los recordatorios automáticos a 7 días **solo están en demo o pendientes**, no conectados aún al backend real.
5. Activar «Leaked password protection» en Supabase Auth desde el panel del proyecto y verificar registro/recuperación.
6. Prueba real con las cuentas de administrador y de director, sin introducir datos personales de menores de prueba.
7. La demo `demo-club.html` sigue siendo ficticia y conserva almacenamiento local; la página real es `clubes.html`.

No afirmar que se haya realizado una revisión de seguridad independiente ni que toda la plataforma esté libre de vulnerabilidades.
