# Banquillo Beta — Gestión de cuentas, equipos y temporadas

Fecha: 11 de noviembre de 2026 · Revisión de acceso y experiencia de usuario.

## Cambios visibles
- **Temporadas (entrenador):** muestra el correo de la cuenta autenticada para distinguir perfiles; identifica el club y equipo, el cargo/rol de acceso, si es independiente o pertenece al club y las solicitudes pendientes. Botón de actualizar permisos y de cambiar de cuenta.
- **Cuenta entrenadora de un club:** puede abandonar su equipo. La baja es real: revoca su membresía y el acceso a actas, jugadores y avisos; el director conserva el historial.
- **Director deportivo desde Temporadas:** puede abrir el club, retirar equipos (archivo recuperable), abandonar el club y, si es el titular, eliminar el club con confirmación escribiendo el nombre.
- **Equipo independiente:** un miembro puede abandonarlo; su titular puede eliminarlo **permanentemente** con confirmación escrita del nombre. No se permite borrar temporadas vinculadas a clubes desde esa operación.
- **Dirección Deportiva:** «Temporadas» muestra la cuenta utilizada, accesos de eliminación/abandono del club y botones de retirada recuperable por equipo. El archivo conserva las estadísticas y revoca el antiguo código de acceso.
- **Botón copiar:** tras copiar, cambia a «✓ Copiado» en verde durante 1,9 segundos en las vistas de director y entrenador. Fallback de selección manual si el navegador impide la copia.
- **Caché:** se añade un identificador de versión a los recursos JavaScript y CSS modificados para evitar que GitHub Pages siga mostrando la interfaz anterior.

## Seguridad de los datos
- Nuevas RPC: `banquillo_my_season_context`, `banquillo_leave_team` y `banquillo_archive_club_team`.
- Los métodos antiguos `leave_season` y `delete_season` ya no pueden usarse para desincronizar o eliminar equipos de club.
- `banquillo_delete_club` revoca también los permisos de los entrenadores y directores asociados, sin destruir actas ni la propiedad deportiva del titular; el club se conserva en «Recuperables».
- RLS y validación de cuentas en Supabase. La web no añade personas ni permite suplantar cuentas escribiendo nombres.

## Pruebas realizadas — todas revertidas (ROLLBACK)
Siete aserciones: alta por código, retirar solicitud propia, identificación del contexto, cierre del método antiguo, abandono que revoca acceso, protección de temporada de club y eliminación de temporada independiente.

Seis aserciones: entrenador no puede eliminar equipo de club, aprobación crea acceso, eliminación figura en recuperables, conservación de historial, baja de entrenador revoca acceso y cargo.

Cuatro aserciones: entrenador no puede archivar equipo, director sí puede, datos de la temporada intactos, y código de equipo archivado deja de funcionar.

Se ha probado también en seis escenarios de interfaz: entrenador de club, director titular, segundo director, propietario de equipo independiente, miembro de equipo independiente y estado de permisos todavía no cargados. Los seis JavaScript modificados superan la validación sintáctica.

**Todas las pruebas SQL modificaron datos solo dentro de transacciones revertidas. No se han borrado ni alterado los clubes o equipos reales del usuario.**

## Límites y pendientes
- No se ha ejecutado un navegador con sesión autenticada de dos personas, ni se ha certificado el despliegue final de GitHub Pages. Las pruebas SQL y sintácticas no sustituyen una revisión visual en móvil.
- Supabase Security Advisor sigue señalando funciones con privilegios elevados (41 avisos) y la protección de contraseñas filtradas desactivada; requieren una auditoría separada antes de abrir Banquillo a todos los clubes.
- La integración completa del calendario avanzado F7/F11 y sus horarios sigue pendiente; no se presenta como terminada en esta revisión.
