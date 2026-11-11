# Banquillo — Integración de Beta avanzada en la web oficial
**Fecha:** 11 de noviembre de 2026  
**Rama de destino:** `main`  
**Aplicación oficial:** `clubes.html` y `index.html`

## Funciones que ya estaban en la oficial y se conservan
- Acceso y permisos de usuarios reales mediante Supabase, códigos de 8 caracteres y aprobación del DD.
- Clubes, temporadas, equipos independientes y enlaces de navegación autorizados.
- Director titular/segundo director, expulsión y abandono, archivo recuperable de equipos y clubes.
- Estadísticas reales: victorias, empates, derrotas, goles, minutos y convocatorias.
- Mensajería interna al equipo concreto; avisos de actas con enlace a la jornada y eventos de resolución.
- Exportación y restauración de configuración JSON, silbatos de gestión y herramientas del entrenador.
- Se mantiene la demo ficticia por separado como ejemplo, pero **nunca se importan sus jugadores, usuarios o jornadas** a Supabase.

## Funciones avanzadas incorporadas en esta integración
### Planificador de campos en producción
- Calendario semanal y mensual con días seleccionables.
- Resumen de partidos, partidos locales asignados/pendientes y partidos visitantes.
- Asignación de hora, duración y campo desde un formulario propio de Banquillo.
- Campos F7 independientes y campos F11 divididos en dos mitades F7.
- Sugerencias deterministas de huecos libres (no se presenta como IA generativa).
- Bloqueo de horarios superpuestos **en Supabase** para dos equipos en la misma instalación, o para el mismo equipo en dos campos.
- Modificación y retirada de reservas sin borrar el acta.
- Copiar la planificación para compartirla internamente, con iconos 🏠/✈️.
- Exportar el calendario de la semana o del mes como imagen PNG.

### Instalaciones y equipaciones
- Configuración de campos F11/F7 y selección de qué F11 son divisibles.
- Tres equipaciones con color de camiseta, pantalón y medias, con vista previa.
- Los colores quedan almacenados en `banquillo_club_settings.colors.kits` bajo RLS; se mantienen los demás ajustes del club.

## Base de datos y permisos
Tabla `banquillo_match_schedules` con RLS: solo usuarios autorizados ven las reservas de sus equipos; ningún navegador puede modificarla directamente. Las modificaciones pasan por `banquillo_schedule_home_match` y `banquillo_unschedule_home_match`, que comprueban en servidor la dirección deportiva, localía, existencia del partido, modalidad, disponibilidad del recurso y conflictos.

Los triggers eliminan reservas obsoletas si cambia la fecha/localía del partido, se borra el acta, el equipo cambia de modalidad o se archiva.

Migraciones:
- `planificador_real_partidos_locales_20261111.sql`
- `actualizar_reservas_al_cambiar_actas_20261111.sql`
- `limpiar_reservas_si_el_equipo_cambia_20261111.sql`

## Pruebas
**14 comprobaciones SQL pasadas con ROLLBACK**, sin modificar el club real:
1. Dos medios campos F7 simultáneos permitidos.
2. Partido F11 completo bloquea medios campos superpuestos.
3. F11 sin solapamiento permitido.
4. Doble ocupación de la misma mitad F7 rechazada.
5. Cuenta sin permisos no puede planificar.
6. Campo F7 programado y visible al responsable.
7. Cambio de fecha elimina reserva vieja.
8. Borrar acta elimina reserva, no otras.
9. Persona ajena no lee horarios privados.
10. Archivar equipo elimina la reserva.
11. Archivar equipo conserva actas.
12. Cuenta ajena no modifica el horario.
13. Nuevo horario correcto tras cambiar la fecha.
14. La reserva queda almacenada en Supabase dentro de la transacción de prueba.

**Pruebas de interfaz (sin sesión real):** generación de sugerencias, calendario semanal/mensual, formulario, advertencia de media cancha ocupada, texto de planificación y lectura de horarios. Los JS modificados pasan la validación de sintaxis.

## Pendientes de verificar
- Comprobar visualmente desde GitHub Pages con dos cuentas reales: login, guardar reserva, recargar y confirmar sincronización.
- Los escudos subidos en la demo mediante almacenamiento del navegador y otros elementos puramente ficticios **no se convierten automáticamente en imágenes públicas de Supabase**. Para una subida real de escudos hace falta Storage con autorización y límites.
- El calendario muestra solo los partidos que el director puede consultar conforme a la membresía real de su temporada.
- Supabase Security Advisor mantiene advertencias (funciones con privilegios elevados, RLS sin política en algunas tablas protegidas y protección de contraseñas filtradas). Esta integración no equivale a una auditoría de seguridad general.

## Publicación
Los estilos y scripts de `clubes.html` usan identificador `planificador-v3` para evitar la caché antigua. No se reemplaza la aplicación oficial por `demo-club.html` ni se modifican las contraseñas o las cuentas.
