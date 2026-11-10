# Banquillo — Documento maestro de proyecto

> Documento vivo de continuidad. Se actualizará al cerrar cada bloque de análisis, implementación y pruebas.
> Última actualización: 10 de noviembre de 2026.
> Estado: auditoría inicial completada; Fase 1 aún no implementada.

## 1. Propósito y visión

**Banquillo / El Banquillo del Entrenador** es una plataforma web para gestionar clubes y equipos de fútbol base. Debe servir a distintos clubes, directores deportivos y cuerpos técnicos, no quedar limitada al equipo actual.

Objetivos:
- Aplicación web para móvil y ordenador, escalable y mantenible.
- Cuentas individuales, clubes, equipos y temporadas.
- Roles diferenciados para dirección deportiva y entrenadores.
- Gestión de plantilla, partidos, convocatorias, entrenamientos, asistencia, estadísticas, informes e historial.
- Trabajo compartido entre miembros autorizados y sistema de avisos.
- Seguridad y privacidad adecuadas al tratar datos deportivos de menores.
- Proyecto independiente de Claude, mantenido desde GitHub y Supabase.

## 2. Decisiones funcionales acordadas

### Fase 1 — alcance confirmado

1. Crear estructura de **clubes y equipos**.
2. Incorporar el rol de **director deportivo**, con capacidad de consultar y editar los equipos del club.
3. Permitir al director crear equipos desde su panel.
4. Establecer inicialmente un límite fijo de equipos por club (referencia acordada: 12); sin pagos ni suscripciones en esta fase.
5. Registrar los cambios relevantes, conservando el valor anterior y el nuevo.
6. Añadir una campanita con notificaciones agrupadas para el cuerpo técnico.
7. Vincular el equipo Prebenjamín actual del usuario al club correspondiente, preservando temporada y datos.

### Fuera de Fase 1
- Cobros, planes, suscripciones y pagos automáticos.
- Avisos generados por IA.
- Identidad única de jugador entre temporadas/categorías y ascensos.
- Botón para deshacer cambios.

### Funcionalidades aplazadas — no canceladas
Orden acordado después de Fase 1:
1. Panel de avisos de IA (ej. equipos sin asistencia registrada).
2. Jugadores que suben de categoría, identidad única e historial/estadísticas entre equipos y temporadas.
3. Deshacer cambios del director con resolución de conflictos.

## 3. Infraestructura conocida

- Repositorio: https://github.com/carlosbieravazquez-prog/Banquillo
- Rama principal observada: `main`.
- Web publicada indicada por el usuario: https://carlosbieravazquez-prog.github.io/Banquillo/
- Ruta compartida para comprobación: `/#partido-2`.
- Backend: Supabase, proyecto `dsewztxveqgwhyuyyyoq`, región `eu-central-1` (Frankfurt), PostgreSQL 17.
- URL: `https://dsewztxveqgwhyuyyyoq.supabase.co`.
- Frontend actual: HTML, CSS y JavaScript; despliegue mediante GitHub Pages.
- No se ha confirmado un entorno de staging separado.
- El historial de migraciones consultado en Supabase estaba vacío. El repositorio contiene `supabase/schema.sql`; establecer un flujo de migraciones versionadas antes de cambios estructurales importantes.

**Credenciales:** el frontend usa una clave publishable/anon, diseñada para ser pública y que no sustituye a RLS. Nunca guardar/publicar claves secret/service_role, claves de proveedores IA, contraseñas ni tokens privados. No solicitar contraseñas por chat.

## 4. Auditoría técnica inicial — estado observado

### 4.1 Frontend

Archivos principales:
- `index.html`: página pública y punto de entrada.
- `css/app.css`: estilos.
- `js/auth.js`: registro, login, recuperación, unión a temporadas y gestión de miembros.
- `js/cloud.js`: cliente Supabase, RPC, sincronización, realtime y llamada a IA.
- `js/store.js`: estado, serialización y persistencia de temporadas/documentos.
- `js/core.js`: navegación, renderizado y avisos de interfaz.
- `js/views1.js`: inicio y partidos.
- `js/views2.js`: plantilla, ficha de jugador y entrenamientos.
- `js/views3.js`: informes, temporadas, ajustes y asistente de creación.
- `js/calc.js`, `js/util.js`, `js/export.js`: cálculos, utilidades y exportación.

La aplicación actual contempla registro, login, recuperación, temporadas, códigos de invitación, roles de propietario/editor/lector, jugadores, partidos, convocatorias, entrenamientos, informes, exportaciones y sincronización.

### 4.2 Modelo de datos actual

Tablas en `public`:
- `profiles`
- `seasons_meta`
- `season_members`
- `docs`
- `join_attempts`

Los datos funcionales de una temporada se guardan en `docs` como documentos JSONB, con rutas como:
- `seasons/{season_id}`
- `seasons/{season_id}/players/{player_id}`
- `seasons/{season_id}/matches/{match_id}`
- `seasons/{season_id}/training/main`
- `seasons/{season_id}/reports/{player_id}`

La tabla `docs` aplica políticas para miembros y editores de temporada. La aplicación obtiene roles desde `season_members`.

### 4.3 Datos existentes (recuento, sin exponer datos personales)

Consulta de solo lectura del 9-11-2026:
- 2 cuentas en Auth y 2 perfiles.
- 1 temporada.
- 1 miembro registrado en `season_members`.
- 33 documentos: 1 raíz de temporada, 16 jugadores, 15 partidos y 1 documento de entrenamientos.
- No se detectaron tablas específicas de clubes, equipos, auditoría de cambios ni notificaciones.
- No hay Edge Functions desplegadas en el proyecto según la consulta realizada.

Es una fotografía del momento de auditoría; los recuentos pueden cambiar.

### 4.4 Funciones SQL existentes

Gestión: `create_season`, `join_season`, `season_share`, `regenerate_join_code`, `set_code_enabled`.
Miembros: `season_members_list`, `set_member_role`, `remove_member`, `leave_season`.
Temporadas/cuenta: `delete_season`, `delete_my_account`, `my_profile`.
Autorización: `is_member`, `can_edit`, `is_owner`.
Créditos/IA: `spend_tokens`, `refund_tokens`, `refill_if_due`.

### 4.5 Avisos de seguridad y mantenimiento detectados

Resultados de los asesores Supabase:
- RLS activado sin políticas en `seasons_meta` y `join_attempts`. Revisar exposición efectiva y permisos antes de decidir corrección; no añadir políticas genéricas sin entender el flujo RPC.
- `handle_new_user()` y `rls_auto_enable()` aparecen como SECURITY DEFINER ejecutables por PUBLIC/anon/authenticated. Deben limitarse sus permisos al uso necesario. `handle_new_user` está asociado al trigger de alta de usuario y `rls_auto_enable` al event trigger `ensure_rls`; no son operaciones que deban exponerse como RPC de la aplicación. La consulta de `pg_event_trigger` confirmó ese vínculo.
- Protección de contraseñas filtradas desactivada en Auth.
- Índice pendiente en la FK `seasons_meta.owner_id`.
- Aviso de optimización de `profiles_select_own` por evaluación repetida de `auth.uid()`.
- `join_attempts` no tiene clave primaria.

Los avisos son hallazgos para investigar, no prueba automática de una brecha explotable. No cambiar permisos/políticas sin revisar dependencias y probar registro, acceso, invitación y sincronización.

### 4.6 Estado de Fase 1

Las funcionalidades específicas de clubes/equipos/director deportivo, registro de cambios y notificaciones agrupadas **no aparecen implementadas** en el modelo de datos ni en las vistas examinadas. La aplicación existente se organiza alrededor de temporadas individuales.

### 4.7 Despliegue, estructura y otros hallazgos

- `index.html` carga expresamente los módulos desde `js/` y los estilos desde `css/`; esas son las rutas activas del frontend publicado.
- El repositorio conserva copias antiguas en la raíz de varios archivos que también existen en `js/` y `css/`. En algunos casos coinciden, pero `core.js` de la raíz y `js/core.js` tienen hashes distintos. Para evitar editar el archivo equivocado, los cambios del frontend deben hacerse en las rutas que carga `index.html`.
- Hay páginas legales tanto en la raíz como en `legal/`; el HTML principal enlaza las páginas dentro de `legal/`. La documentación debe señalar una única fuente canónica y revisar los textos legales antes de un lanzamiento público.
- El código fuente de la Edge Function `ai-report` está en `supabase/functions/ai-report/`, pero el proyecto Supabase no devuelve ninguna función desplegada. Por tanto, la función IA no debe darse por operativa en producción.
- El archivo `GUIA.md` describe la publicación mediante GitHub Pages y la configuración del proyecto. Debe actualizarse cuando se consolide el nuevo modelo de clubes y equipos.
- El usuario facilitó la URL publicada y un enlace directo a `/#partido-2`. La herramienta de navegación no pudo recuperar la página en esta sesión; la URL por sí sola no confirma que la ruta cargue correctamente en el navegador del usuario.

## 5. Plan de trabajo

### Bloque A — preservar y entender
- [x] Acceder al repositorio y Supabase.
- [x] Inventariar archivos principales.
- [x] Inspeccionar tablas, funciones, políticas y recuentos.
- [x] Crear este documento maestro inicial.
- [ ] Confirmar que el enlace publicado carga correctamente en navegador.
- [ ] Revisar completamente funciones SQL sensibles y reglas RLS.
- [ ] Obtener/exportar una copia de seguridad verificable antes de cambios.
- [ ] Definir estrategia de migraciones versionadas y rollback.

### Bloque B — seguridad y preparación
- [ ] Revisar permisos de funciones SECURITY DEFINER y triggers.
- [ ] Revisar Auth, confirmación de correo y protección de contraseñas.
- [ ] Verificar RLS con pruebas de dos cuentas y roles distintos.
- [ ] Corregir hallazgos confirmados y volver a ejecutar asesores.
- [ ] Definir migración compatible para el modelo de temporadas.

### Bloque C — Fase 1 funcional
- [ ] Diseñar entidades Club, Team y membresías/roles de club.
- [ ] Definir relación de temporadas actuales con equipos sin perder datos.
- [ ] Crear panel del director deportivo.
- [ ] Crear y gestionar equipos con límite por club.
- [ ] Permitir al director acceder a todos los equipos de su club.
- [ ] Implementar registro de cambios: actor, fecha, entidad, campo, valor anterior y nuevo.
- [ ] Implementar notificaciones agrupadas y estados de lectura.
- [ ] Vincular el Prebenjamín existente al club.
- [ ] Probar permisos de propietario, director, entrenador y lector.

### Bloque D — validación y entrega
- [ ] Pruebas funcionales en escritorio y móvil.
- [ ] Pruebas de aislamiento entre clubes.
- [ ] Pruebas de invitación, revocación y cambios de rol.
- [ ] Verificar que temporadas, jugadores, partidos y asistencias siguen intactos.
- [ ] Actualizar este documento con cambios, migraciones, commits y resultados.
- [ ] Dar Fase 1 por terminada solo tras las pruebas.

### Fases posteriores
- [ ] Fase 2: panel de avisos de IA.
- [ ] Fase 3: identidad e historial de jugadores entre temporadas/categorías.
- [ ] Fase 4: deshacer cambios con gestión de conflictos.

## 6. Reglas de trabajo y seguridad

1. Auditar antes de modificar.
2. No borrar ni sobrescribir datos sin copia de seguridad y autorización explícita.
3. Priorizar migraciones aditivas y compatibles; no reconstruir la base desde cero.
4. No usar datos reales de menores en pruebas; utilizar datos ficticios.
5. Diseñar permisos con mínimo privilegio y probar accesos entre clubes.
6. No usar `user_metadata` editable por el usuario para decisiones de autorización.
7. No exponer claves secret/service_role ni credenciales privadas en frontend.
8. Tras cada cambio: ejecutar pruebas, consultar asesores y registrar resultado.
9. Cada commit relevante debe quedar reflejado aquí con fecha, archivos afectados y motivo.
10. Mantener las funcionalidades aplazadas en la hoja de ruta.

## 7. Registro de actividad

| Fecha | Trabajo | Resultado |
|---|---|---|
| 2026-11-09 | Conexión a GitHub y Supabase | Acceso a repositorio y proyecto confirmado |
| 2026-11-09 | Auditoría inicial de repositorio | Aplicación HTML/CSS/JS con gestión de temporadas identificada |
| 2026-11-09 | Auditoría inicial de Supabase | 5 tablas, 1 temporada y 33 documentos; sin migraciones registradas |
| 2026-11-09 | Revisión de seguridad inicial | Hallazgos RLS, SECURITY DEFINER, Auth e índices documentados; confirmado que rls_auto_enable es event trigger ensure_rls |
| 2026-11-09 | Documento maestro | Primera versión creada; Fase 1 pendiente |
| 2026-11-09 | Revisión de rutas y despliegue | `index.html` confirma uso de `js/` y `css/`; detectadas copias duplicadas y Edge Function IA no desplegada |

## 8. Pendiente inmediato

Completar la revisión de funciones y políticas, comprobar la web publicada en una sesión de prueba, y preparar una copia de seguridad verificable. Después presentar el diseño de migración de clubes/equipos antes de aplicar cambios.

## 9. Revisión de continuidad — 9 de noviembre de 2026

### 9.1 GitHub y separación entre ramas

- Rama auditada: `main`. HEAD observado antes de esta actualización: `19faea9c739d08bc421778bb9061ef24bf6ca8af` (`docs: clarify trigger function security findings`).
- Los tres commits más recientes de `main` son documentales: `19faea9`, `33c9bfe` y `528cb85`. Los dos commits anteriores del listado son cargas iniciales de archivos. No se observan cambios recientes de código en `main`.
- El estado combinado de CI para el HEAD consultado no devuelve comprobaciones registradas; esto no equivale a una compilación o prueba superada.
- Existe `feature/fase-1-clubes-equipos`, que está **50 commits por delante y 0 por detrás** de `main`. No está fusionada ni publicada por esta revisión.
- Esa rama incorpora prototipos y documentación adicionales, entre ellos `demo-club.html`, `js/demo-club.js`, un catálogo de competiciones y un planificador. La documentación de esa rama describe el demo con 15 equipos ficticios y dos directores deportivos equivalentes; usa almacenamiento local y no está conectado a Auth ni a Supabase. Calendario y comunicaciones siguen pendientes en el prototipo.
- Diferencia funcional relevante: `js/store.js` de `main` no persiste `kit`, `meetingTime`, `meetingPlace` ni `callMessageMode`; esos campos sí aparecen en la rama de desarrollo. Por tanto, las mejoras recientes de mensajes de convocatoria no forman parte de `main` ni deben darse por publicadas.
- Antes de fusionar, revisar los 50 commits como conjunto, separar prototipos de funcionalidades terminadas y validar regresiones. No se ha realizado merge ni despliegue.

### 9.2 Estado vivo de Supabase — consulta de solo lectura

- Proyecto: estado `ACTIVE_HEALTHY`, PostgreSQL 17.11, región `eu-central-1` (Frankfurt).
- Siguen existiendo 5 tablas públicas: `profiles` (2 filas), `seasons_meta` (1), `season_members` (1), `docs` (33) y `join_attempts` (0).
- No hay migraciones registradas y no hay Edge Functions desplegadas.
- No existen todavía tablas de clubes, equipos, membresías de club, auditoría de cambios ni notificaciones. La Fase 1 no está implementada en la base de datos.
- RLS está activado en las cinco tablas. Hay seis políticas: cuatro en `docs` (SELECT/INSERT/UPDATE/DELETE), una en `profiles` (solo perfil propio) y una en `season_members` (miembros de la temporada). `seasons_meta` y `join_attempts` no tienen políticas.
- ACL de tablas comprobadas en vivo: `anon` no tiene privilegios directos sobre ninguna de las cinco tablas. `authenticated` tiene CRUD en `docs`, SELECT en `profiles` y `season_members`, y ningún privilegio directo en `seasons_meta` ni `join_attempts`. Por ello, el aviso de RLS sin políticas en estas dos últimas tablas no implica por sí solo acceso directo por REST; el acceso previsto se canaliza mediante funciones SECURITY DEFINER y debe seguir revisándose función por función.
- Hay 17 funciones SECURITY DEFINER ejecutables por `authenticated`. Solo dos de ellas, `handle_new_user()` y `rls_auto_enable()`, también son ejecutables por `anon`. La primera está asociada al trigger `on_auth_user_created` de `auth.users`; la segunda al event trigger `ensure_rls`. Son funciones internas, no RPC de la aplicación, y sus permisos requieren una revocación específica y probada. No revocar en bloque las RPC de temporada que sí necesita la aplicación.
- Las funciones internas de Silbatos consultadas (`spend_tokens`, `refund_tokens`, `refill_if_due`) no son ejecutables por `anon` ni por `authenticated`. Las funciones SECURITY DEFINER consultadas tienen `search_path` fijado; `rls_auto_enable` usa `pg_catalog`.
- Asesores de seguridad: dos avisos INFO por RLS sin políticas; dos funciones SECURITY DEFINER accesibles por anon (WARN); 17 accesibles por usuarios autenticados (WARN); y protección de contraseñas filtradas desactivada (WARN).
- Asesores de rendimiento: FK `seasons_meta.owner_id` sin índice; optimización pendiente de `profiles_select_own` por evaluación de `auth.uid()`; `join_attempts` sin clave primaria; e índice `join_attempts_idx` sin uso observado. El asesor de salud no devuelve hallazgos.
- No se han modificado datos, tablas, funciones, permisos, políticas ni configuración de Auth. Tampoco se ha aplicado ninguna migración.

### 9.3 Comprobaciones del frontend en main

- Se comprobó la sintaxis de los 11 módulos JavaScript cargados por `index.html`: **11/11 parsean sin errores** (`calc`, `util`, `store`, `core`, `views1`, `views2`, `export`, `views3`, `cloud`, `auth`, `boot`).
- Es una comprobación estática de sintaxis, no una prueba de ejecución. No se ha probado la web en navegador, móvil, escritorio, ni el portapapeles. No se afirma que la aplicación funcione correctamente en esos entornos.
- La landing de `main` anuncia informes con IA y menciona un plan premium/Silbatos, pero el proyecto no tiene Edge Functions desplegadas. El esquema conserva campos heredados de plan y créditos. Antes de un lanzamiento debe revisarse que la landing no prometa IA operativa que no está desplegada. No se implementarán cobros ni suscripciones en Fase 1; estos elementos existentes no amplían el alcance acordado.

### 9.4 Estado y siguientes pasos

La Fase 1 sigue pendiente en `main` y en la base de datos: clubes, equipos, director deportivo, límite inicial de 12 equipos por club, auditoría con valor anterior/nuevo, notificaciones agrupadas y vinculación compatible del Prebenjamín existente.

Orden recomendado:
1. Obtener una copia de seguridad y comprobar que el procedimiento de restauración es utilizable antes de cualquier DDL o cambio de permisos.
2. Revisar los cuerpos y ACL de las funciones SECURITY DEFINER, preparar una corrección mínima para `handle_new_user` y `rls_auto_enable`, y definir pruebas de alta de cuenta y event trigger. No aplicar todavía.
3. Revisar la configuración Auth y valorar activar la protección de contraseñas filtradas, con autorización y prueba de recuperación/registro.
4. Preparar migraciones versionadas y rollback para Club, Team, membresías, auditoría y notificaciones, manteniendo las tablas y documentos de temporada actuales.
5. Probar con cuentas ficticias los roles de propietario, director deportivo, entrenador y lector, incluido aislamiento entre clubes y conservación íntegra de los documentos existentes.
6. Revisar y validar la rama de desarrollo antes de decidir qué cambios se integran en `main`.

Se mantiene fuera de Fase 1 cualquier cobro o suscripción. Se mantienen en la hoja de ruta posterior los avisos de IA, la identidad e historial de jugadores entre categorías/temporadas y la opción de deshacer cambios.

### 9.5 Actividad de esta revisión

| Fecha | Trabajo | Resultado |
|---|---|---|
| 2026-11-09 | Revisión de commits y ramas de GitHub | HEAD de main `19faea9`; tres commits recientes documentales; rama feature 50 commits por delante, sin merge |
| 2026-11-09 | Comparación de frontend entre ramas | Confirmado que los campos de equipación y mensaje de convocatoria están en feature, no en main |
| 2026-11-09 | Auditoría de tablas, RLS y ACL en Supabase | Cinco tablas; seis políticas; sin acceso directo de anon a tablas; seasons_meta y join_attempts sin grants directos a usuarios de API |
| 2026-11-09 | Revisión de funciones y event triggers | 17 funciones SECURITY DEFINER para authenticated; handle_new_user y rls_auto_enable también accesibles por anon y vinculadas a triggers |
| 2026-11-09 | Asesores de Supabase | Persisten avisos de seguridad y rendimiento; salud sin hallazgos |
| 2026-11-09 | Validación estática de JavaScript en main | 11/11 módulos parseados; sin prueba de navegador |
| 2026-11-09 | Cambios de producción | Ninguno: solo lecturas; sin migraciones, cambios de permisos ni modificaciones de datos |


## 10. Revisión de continuidad — 10 de noviembre de 2026

### 10.1 Cambios nuevos detectados en `main`

- Comparación entre el commit documental anterior `247cbab430a9e4e323ea28db5ca29e905d70d352` y `main`: **3 commits posteriores**, con cambios en **8 archivos**: `css/app.css`, `css/demo-club.css`, `demo-club.html`, `docs/GUIA_PRESENTACION_BANQUILLO.md`, `index.html`, `js/calc.js`, `js/demo-club.js` y `js/views1.js`. No son cambios únicamente documentales: incluyen interfaz y lógica JavaScript.
- El `main` observado antes de actualizar este documento corresponde a `1e369f6830786556ffb66a837decd62a6cb7a2fa`. La landing enlaza ahora explícitamente a `demo-club.html` y aclara que la gestión de clubes conectada a cuentas está en desarrollo.
- Se añadió una guía de presentación de 5–7 minutos. El código de `js/demo-club.js` confirma que la demo usa datos ficticios y `localStorage`, no Auth ni Supabase. Incluye equipos, dos perfiles de dirección, instalaciones, calendario, avisos de ejemplo y comunicaciones. Su existencia en `main` no acredita pruebas funcionales de navegador.
- **Advertencia de alcance:** la demo contiene **15 equipos ficticios**, mientras que la Fase 1 acordada limita inicialmente a **12 equipos por club**. La demo no representa todavía una regla de negocio validada en servidor; antes de implementar Fase 1, definir el tratamiento de clubes con más de 12 equipos y aplicar el límite en backend con transacciones/validaciones seguras, no solo en interfaz.
- La rama `feature/fase-1-clubes-equipos` ha divergido respecto de `main`: comparación actual **59 commits por delante y 4 por detrás**. No fusionar automáticamente: revisar las diferencias y resolver el desfase antes de integrar mejoras de convocatorias y el prototipo.
- No se ha ejecutado una prueba de navegador ni se ha comprobado la publicación efectiva de GitHub Pages; no se declara la web validada.

### 10.2 Estado vivo de Supabase (solo lectura, 2026-11-10)

- Proyecto `ACTIVE_HEALTHY`, PostgreSQL 17.11; las cinco tablas públicas siguen con RLS activo.
- Recuentos aproximados devueltos por el listado de tablas: `profiles` 2, `seasons_meta` **2**, `season_members` **3**, `docs` **54**, `join_attempts` 0. Frente al 9-11, han aumentado temporadas, membresías y documentos. **Son recuentos del conector, no una auditoría de quién los creó ni una verificación de integridad**; no se han consultado identidades ni documentos de menores.
- Consulta SQL de metadatos de solo lectura: **6 políticas RLS**, **17 funciones SECURITY DEFINER ejecutables por authenticated**, **2 por anon**, y **0 tablas de Fase 1** entre `clubs`, `teams`, `club_members`, `audit_log` y `notifications`.
- **0 migraciones registradas** y **0 Edge Functions desplegadas**. El crecimiento de registros no demuestra por sí solo cambios de esquema.
- Los asesores de seguridad mantienen: dos tablas con RLS sin políticas (`seasons_meta`, `join_attempts`), las dos funciones SECURITY DEFINER accesibles por anon (`handle_new_user`, `rls_auto_enable`), 17 accesibles por authenticated y protección de contraseñas filtradas desactivada.
- Los asesores de rendimiento señalan FK sin índice (`seasons_meta.owner_id`), optimización de `profiles_select_own` y ausencia de PK en `join_attempts`. El asesor de salud no devuelve hallazgos. No se debe interpretar cada aviso como una vulnerabilidad explotada.
- **No se han realizado escrituras en Supabase, migraciones, cambios de Auth, RLS, permisos ni datos.**

### 10.3 Próximas acciones priorizadas

1. **Respaldo verificable y plan de recuperación** antes de cualquier cambio de esquema o permisos; documentar cómo comprobar restauración sin tocar producción.
2. Revisar con detalle cuerpos, grants y llamadas de las funciones SECURITY DEFINER, preparar un cambio mínimo y pruebas de registro/invitación; **no aplicarlo sin autorización**.
3. Definir esquema aditivo de clubes, equipos, membresías y directores con aislamiento entre clubes, máximo inicial de 12 equipos y compatibilidad con las temporadas/documentos JSONB existentes.
4. Diseñar auditoría con actor, fecha, entidad, campo, valor anterior y nuevo; notificaciones agrupadas y estado leído; y vinculación del Prebenjamín mediante referencia, sin copiar ni borrar sus documentos.
5. Preparar pruebas automatizadas con datos ficticios de permisos, concurrencia al crear el equipo número 13, cambios de director, auditoría, notificaciones y aislamiento. Comprobar demo en navegador antes de afirmar que funciona.
6. Revisar diferencias entre `main` y `feature/fase-1-clubes-equipos` y decidir integración por bloques. No implementar cobros ni suscripciones. Mantener después avisos IA, identidad/historial de jugadores y deshacer cambios.

### 10.4 Registro de esta revisión

| Fecha | Trabajo | Resultado |
|---|---|---|
| 2026-11-10 | Comparación GitHub desde `247cbab` | 3 commits posteriores, 8 archivos modificados o añadidos; demo de club y landing ahora en main |
| 2026-11-10 | Revisión del prototipo y guía | Demo ficticia local de 15 equipos; diferencia con límite de 12 documentada |
| 2026-11-10 | Comparación entre ramas | Feature 59 commits por delante y 4 por detrás de main; divergencia pendiente de resolver |
| 2026-11-10 | Lecturas de Supabase y asesores | 5 tablas, recuentos 2/2/3/54/0; 6 políticas; 17/2 funciones SECURITY DEFINER; sin migraciones ni Edge Functions |
| 2026-11-10 | Cambios efectuados durante la revisión | Solo este documento; ninguna modificación de base de datos, permisos ni código funcional |
