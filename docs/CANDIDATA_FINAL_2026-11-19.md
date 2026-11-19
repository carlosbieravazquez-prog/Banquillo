# Banquillo · Candidata del 19 de noviembre de 2026

Rama `release/candidata-final-20261119`, basada en `9741c1a`. Candidata para revisión. El visto bueno para publicar depende de resolver los bloqueos indicados más abajo.

## Cambios

- Clubes abre Dirección Deportiva desde el menú, desde el alta sin temporadas y desde los enlaces antiguos con `#clubes`. Si falta sesión, el enlace de acceso abre directamente el formulario. La web oficial carga únicamente el módulo de Clubes del esquema `banquillo_*`.
- Se integra el diseño carbón y verde lima, con menús laterales fijos en escritorio y navegación adaptada al móvil. Las demos públicas de club y equipo tienen datos ficticios y navegación de solo lectura.
- Mis equipos presenta una tarjeta por equipo y temporada. Abrir los ajustes de una tarjeta conserva el equipo seleccionado. El diálogo filtra las acciones por permisos y permite gestionar el equipo independiente o abrir la ficha correspondiente en Dirección Deportiva.
- Se conservan la bandeja privada del entrenador, las solicitudes de incorporación y la comprobación de permisos de la versión oficial. Las respuestas tardías de códigos de equipo se descartan si cambia el contexto.
- Se integran mensajes de convocatoria, importación y exportación de actas Excel y exportación en PDF. Las actas cerradas protegen la edición. En F11, el cálculo descuenta una suspensión solamente de sanciones acumuladas antes de la jornada en que se cumple.
- Una temporada independiente cerrada queda en solo lectura en la interfaz. Su responsable puede reabrirla desde sus ajustes.

## Validación

- **108/108 pruebas Node** con controles de sesión, autenticación, permisos, rutas, importación, exportación, convocatorias, planificador y sanciones. Se comprobó la sintaxis del JavaScript y se revisaron las referencias a recursos locales.
- **4/4 recorridos en Chromium** con Supabase simulado y datos ficticios: visitante, entrenador en escritorio, entrenador en móvil y Dirección Deportiva. Se probaron el acceso directo a Clubes y la vuelta, dos tipos de tarjeta, ajustes por rol, convocatoria, mensaje, ficha Excel, invitaciones y pestañas de Dirección Deportiva. Las pruebas están en `tests/navigation.browser.cjs`, con dependencias Playwright y Chromium. Las pruebas de navegador interceptan las peticiones, incluidas las de Supabase, para aislarlas de los dos proyectos reales.
- **Prueba aislada de PostgreSQL superada.** Se aplicó la propuesta existente de `can_edit` sobre un esquema mínimo ficticio. Se comprobaron titular, segundo director, entrenador, cuenta ajena, archivo del equipo, revocación y escritura limitada a su temporada. Código en `tests/director-permissions.database.cjs`, ejecutable con `@electric-sql/pglite`.
- En Supabase se consultaron exclusivamente avisos y catálogos. Se verificó la presencia y el permiso de ejecución autenticado de las 27 RPC `banquillo_*` invocadas directamente por los módulos activos. La consulta de catálogos verifica el contrato visible, mientras que las pruebas con cuentas separadas en una copia aislada deben validar las políticas y los efectos reales.

## Validación posterior

La [validación de Supabase de la candidata](VALIDACION_SUPABASE_CANDIDATA.md) recoge el resultado de reproducir los flujos en el esquema reconstruido y los pasos pendientes para publicar.

## Bloqueos identificados inicialmente

| Prioridad | Hallazgo | Validación que falta |
| --- | --- | --- |
| Alta | En producción, `can_edit` sigue exigiendo membresía `owner` o `editor`. El cargo de segundo director por sí solo todavía no autoriza la edición de la temporada deportiva. | La propuesta de `supabase/permisos_directores_edicion_temporadas_20261113.sql` pasa la prueba local con un esquema mínimo. Falta comprobar la integración de esa propuesta y de los flujos de expulsión con una copia íntegra del esquema oficial. |
| Alta | Los roles cliente conservan permisos de tabla innecesarios en producción. Se constató el permiso `TRUNCATE` mediante catálogos. | Revocar privilegios innecesarios en una copia aislada, revisar los valores por defecto y volver a ejecutar las comprobaciones de permisos. |
| Alta | El proyecto Staging tiene un esquema distinto al de producción y las pruebas de navegador usan respuestas simuladas. | Validar de extremo a extremo altas, caducidad y rotación de códigos, aprobación del cuerpo técnico, cierre de temporada, actas y entrega de mensajes en una copia aislada del esquema oficial. |
| Media | El asesor de producción mantiene avisos sobre funciones privilegiadas ejecutables por usuarios autenticados y sobre la protección frente a contraseñas filtradas. | Revisar las RPC privilegiadas por función y validar cambios de Auth en un entorno de prueba. [RLS y permisos de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Media | La variante candidata incorpora lógica OCR, pero la interfaz activa de actas usa Excel, PDF e impresión. | Activar OCR solo cuando se valide la importación con actas ficticias escaneadas. |

La rama no se ha fusionado y no se ha desplegado la web. Las comprobaciones de Supabase no aplicaron migraciones, no escribieron en producción y no consultaron ni borraron datos deportivos reales.
