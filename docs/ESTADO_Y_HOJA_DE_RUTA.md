# Banquillo — Documento maestro de proyecto

> Documento vivo de continuidad. Se actualizará al cerrar cada bloque de análisis, implementación y pruebas.
> Última actualización: 12 de noviembre de 2026.
> Estado: Fase 1 parcialmente implementada en main y Supabase; auditoría y validación pendientes.

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

## 11. Revisión de continuidad — 11 de noviembre de 2026

### 11.1 Cambio sustancial respecto al 10 de noviembre

- Desde el commit documental `f083efa399adf1f8256d04341115a4fbcf2dda9c`, `main` registra **22 commits posteriores** y cambios en **25 archivos** (comparación de GitHub realizada el 11-11). Hay código nuevo, interfaz, documentación y cuatro scripts SQL; ya no es correcto describir la Fase 1 como completamente ausente.
- Nuevos elementos relevantes: `clubes.html`, `js/clubs-beta.js`, `css/clubs-beta.css`, `js/club-planner.js`, `js/club-crest.js`, `js/club-theme.js`, `js/file-picker.js`, `js/kit-editor.js`, `js/kit-mockup.js`, `js/demo-club-ux.js`, sus estilos, y cuatro scripts en `supabase/`. También cambiaron `index.html`, `js/core.js` y la demo.
- `docs/FASE1_CLUBES_INTEGRACION.md` describe la página conectada a Supabase, el alta de clubes/equipos, vinculación manual de temporadas por su propietario, resumen estadístico y códigos de dirección. `docs/BETA_GESTION_EQUIPOS_CUERPO_TECNICO.md` documenta archivo reversible de equipos y cuatro cargos organizativos. **Los cargos del directorio NO conceden acceso a los documentos de temporada**: las invitaciones y permisos de temporada siguen separados.
- La rama `feature/fase-1-clubes-equipos` sigue divergente: **59 commits por delante y 27 por detrás** de `main`. No fusionar sin análisis de conflictos y regresiones.
- La demo ficticia continúa siendo distinta de `clubes.html` y no prueba el funcionamiento real de la beta.

### 11.2 Supabase — verificación de solo lectura

- Proyecto `ACTIVE_HEALTHY`, PostgreSQL 17.11; **10 tablas públicas** con RLS habilitado: las cinco originales y `banquillo_clubs`, `banquillo_club_directors`, `banquillo_teams`, `banquillo_club_codes`, `banquillo_team_staff`.
- Recuentos informativos del conector: perfiles 2; temporadas 2; miembros de temporada 3; documentos 54; intentos 0; clubes 1; directores de club 0; equipos 1; códigos de club 0; miembros del directorio técnico 2. No se consultaron nombres ni datos de menores.
- **Cuatro migraciones YA REGISTRADAS**: `20261111010109 banquillo_clubes_fase1_base_20261111`; `20261111010305 banquillo_clubes_directores_codigos_20261111`; `20261111010917 banquillo_seguridad_basica_beta_20261111`; `20261111141404 banquillo_gestion_equipos_cuerpo_tecnico_20261111`. Esta revisión **no las ejecutó**. Los scripts correspondientes están en `supabase/clubes_fase1_borrador.sql`, `supabase/clubes_directores_codigos.sql`, `supabase/seguridad_basica_beta.sql` y `supabase/gestion_equipos_cuerpo_tecnico_20261111.sql`.
- **19 políticas RLS**: directores de club 3, clubes 3, personal técnico 4, equipos 3, documentos 4, perfiles 1, miembros de temporada 1. `banquillo_club_codes`, `join_attempts` y `seasons_meta` siguen sin políticas. Los códigos de club están diseñados para consulta mediante RPC con autorización y sin grants directos a usuarios API.
- **19 funciones SECURITY DEFINER ejecutables por `authenticated` y 0 por `anon`** según metadatos. La migración de seguridad revocó la ejecución directa de `handle_new_user()` y `rls_auto_enable()`, añadió índice a `seasons_meta.owner_id` y optimizó `profiles_select_own`. Comprobar en navegador los flujos de alta y acceso tras esos cambios.
- **0 Edge Functions** desplegadas; no dar por operativos los informes IA. Asesor de salud: sin avisos.
- Asesor de seguridad: tres tablas con RLS sin políticas, 19 RPC SECURITY DEFINER accesibles a autenticados y protección de contraseñas filtradas desactivada. Revisar autorizaciones de cada RPC; el aviso no prueba una brecha por sí solo.
- Asesor de rendimiento: `join_attempts` sin PK; tres índices aún sin uso observado (dos nuevos y el índice nuevo de `seasons_meta`). No eliminarlos por una muestra de uso tan corta.
- **No se ejecutó ninguna escritura, migración ni modificación de Auth, RLS, permisos o datos durante esta revisión.** No se ha verificado en esta revisión una copia restaurable ni un rollback probado para las cuatro migraciones ya aplicadas.

### 11.3 Alcance real de Fase 1 y pruebas

- **Parcialmente implementado**: entidades de clubes/equipos/directores, RLS, límite transaccional de **12 equipos activos** por club, máximo de dos directores adicionales, códigos de invitación, asociación opcional a temporada, directorio de cuatro cargos y archivado/restauración de equipos.
- Los documentos del repositorio afirman pruebas SQL reversibles de permisos y cargos, y parseo de `js/clubs-beta.js`; son **pruebas documentadas por implementaciones previas, no reproducidas por esta revisión**. No se ha realizado prueba visual ni prueba extremo a extremo de GitHub Pages, móvil, escritorio o sesión real.
- **Pendiente de Fase 1**: registro de auditoría persistente con actor/fecha/campo/valor anterior/valor nuevo; notificaciones agrupadas con estado leído (los avisos de la página son consultas al abrir, no notificaciones persistentes); prueba segura y confirmación de vinculación del Prebenjamín existente; validación de que la dirección accede únicamente a temporadas autorizadas.
- No confundir directorio técnico informativo con permisos de entrenador. El archivado oculta el equipo activo sin borrar la temporada; confirmar que las políticas y el guard evitan reactivaciones no autorizadas y respetan el máximo de doce bajo concurrencia.
- La página de clubes real existe en `main`, pero **no se ha demostrado su funcionamiento en un navegador**; no afirmar que la beta está lista para producción.
- No implementar cobros ni suscripciones. Conservar en fases posteriores avisos de IA, identidad/historial de jugadores entre categorías y deshacer cambios.

### 11.4 Prioridades siguientes y control de cambios

1. **Urgente:** obtener copia de seguridad verificable y diseñar restauración/rollback documentado de las cuatro migraciones ya aplicadas, sin alterar datos reales.
2. Auditar detalladamente los permisos efectivos, las 19 funciones SECURITY DEFINER y las nuevas políticas RLS; validar separación entre clubes, revocación de directores, acceso a temporadas y registro/recuperación. No modificar producción sin autorización.
3. Revisar integridad de vinculación de temporadas y capacidad de 12 equipos activos con pruebas aisladas y datos ficticios; no enlazar ni modificar automáticamente el Prebenjamín real.
4. Diseñar migraciones aditivas de **auditoría anterior/nuevo** y **notificaciones agrupadas** con pruebas y rollback; no desplegar aún.
5. Verificar beta en navegador real y móvil; comparar rama feature divergente antes de integrar cambios.
6. Revisar configuración de protección de contraseñas filtradas y textos de landing que prometan funciones no desplegadas.

| Fecha | Trabajo | Resultado |
|---|---|---|
| 2026-11-11 | GitHub: comparación con `f083efa` | 22 commits, 25 archivos; nueva beta conectada y scripts SQL en main |
| 2026-11-11 | GitHub: comparación de ramas | Feature 59 por delante, 27 por detrás; sin merge |
| 2026-11-11 | Supabase: tablas, migraciones y metadatos | 10 tablas, 4 migraciones, 19 políticas, 19/0 SECURITY DEFINER para authenticated/anon, 0 Edge Functions |
| 2026-11-11 | Asesores de seguridad/rendimiento/salud | Persisten avisos descritos; salud sin hallazgos |
| 2026-11-11 | Código y documentación | Revisados SQL de clubes, directores, seguridad y personal técnico; identificadas funciones parciales y pendientes |
| 2026-11-11 | Cambios de esta revisión | Solo documento maestro; sin escrituras en Supabase ni cambios funcionales |

## 12. Preparación de lanzamiento beta — 12 de noviembre de 2026

### 12.1 Enlaces oficiales y estado de entrega

- **Web de registro e inicio de sesión:** https://carlosbieravazquez-prog.github.io/Banquillo/
- **Dirección Deportiva con cuenta:** https://carlosbieravazquez-prog.github.io/Banquillo/clubes.html
- **Repositorio de producción:** https://github.com/carlosbieravazquez-prog/Banquillo (rama `main`).
- **Documento maestro:** `docs/ESTADO_Y_HOJA_DE_RUTA.md`.
- **Estado recomendado:** beta pública controlada / pilotos con clubes, **no lanzamiento general sin una prueba real de extremo a extremo y revisión de privacidad**. La publicación del código no equivale a una certificación de seguridad ni a una prueba de navegador.

### 12.2 Pulido de las dos áreas integrado en main

- **Pull Request #22, fusionada el 12-11:** https://github.com/carlosbieravazquez-prog/Banquillo/pull/22; commit de integración `7dc385262490eb7a8dde8d63d106a6d1e6754ded`.
- **Entrenador:** eliminado «Clubes · Beta» de la barra lateral; se conserva el acceso a Dirección Deportiva desde Temporadas cuando corresponda. Ajustes de menú, estados activos, contraste en tarjetas de temporadas y estilos de móvil/escritorio.
- **Dirección Deportiva:** eliminados los botones duplicados de guardar/restaurar configuración de la cabecera. La descarga/restauración JSON permanece en Ajustes, con aclaración de alcance: incluye configuración de club/equipos, **no** jugadores, actas, personal ni permisos; **no** sustituye una copia de seguridad completa de Supabase. Filtro F7/F11 limitado a la vista Equipos; el resumen lista todos los equipos sin aplicar silenciosamente ese filtro. Franja de fecha/próxima jornada limitada a Inicio y calendarios. Mejoras de menú, contraste, navegación móvil y atributos accesibles `aria-current` y `aria-pressed`.
- **Página pública:** nombre corto Banquillo y acceso más claro a Dirección Deportiva; versiones de recursos CSS/JS actualizadas para reducir problemas de caché.
- **Archivos modificados:** `js/core.js`, `css/app.css`, `js/clubs-official.js`, `css/clubs-official.css`, `index.html`, `clubes.html`.
- **Pruebas ejecutadas:** validación sintáctica de los dos JavaScript; 16 comprobaciones de estructura/comportamiento; simulación del render de Avisos, Equipos e Inicio; validación del balance de etiquetas HTML de Ajustes; comprobación de que los seis archivos están en `main`. No se modificó Supabase en este bloque. **No se realizaron pruebas reales de navegador autenticado ni de móvil físico.**

### 12.3 Puertas de salida para un lanzamiento general

1. Registrar una cuenta de prueba, confirmar correo si está habilitado, cerrar sesión, volver a entrar y recuperar contraseña.
2. Probar dos cuentas distintas: entrenador y director; verificar aislamiento entre clubes y que un miembro sin permiso no puede leer ni modificar temporadas ajenas.
3. Crear un club y un equipo ficticios; comprobar el flujo de invitación, cargos, archivado/restauración y calendario sin alterar datos deportivos reales.
4. Verificar que los datos de jugadores menores no se exponen a cuentas no autorizadas; revisar textos de privacidad, consentimiento y retención aplicables.
5. Probar navegación, accesibilidad y formularios en móvil y escritorio con una sesión real; corregir errores antes de anunciar lanzamiento general.
6. Comprobar respaldo completo y restauración de Supabase; el JSON de configuración de Ajustes **no** es una copia completa.
7. Repetir los asesores de seguridad y revisar la configuración Auth y las funciones SECURITY DEFINER pendientes. No dar por disponibles servicios IA no desplegados.

**Decisión de producto:** puede compartirse la web para un piloto beta con usuarios informados de su estado. La apertura a clubes en producción a gran escala queda condicionada a superar las pruebas anteriores.

## 13. Auditoría visual y corrección de contraste — 12 de noviembre de 2026

**Integrado en producción (código `main`):** Pull Request [#23](https://github.com/carlosbieravazquez-prog/Banquillo/pull/23), commit `c69b9985fdd79c4f121196909c43956fb1b24572`.

### Incidencia reportada

Captura de la pantalla de primera entrada con sesión iniciada: el fondo radial azul oscuro se superponía al título, el botón de demostración y las invitaciones se veían prácticamente blancos sobre tarjetas claras y el botón «Mi cuenta» ocupaba casi toda la cabecera.

### Causa identificada y solución

- La pantalla de bienvenida combinaba superficies blancas con variables de texto del modo oscuro automático según el sistema operativo. El degradado radial oscuro cruzaba los encabezados. Se ha adoptado un **tema claro estable por defecto**; el bloque CSS de tema oscuro explícito queda conservado para un futuro soporte completo.
- Se rediseñó `css/onboarding.css`: fondo claro continuo, cabecera compacta, cuenta de anchura natural, títulos de altura flexible, botones con contraste suficiente y tarjetas en rejillas de tres, dos o una columna según el ancho.
- En `index.html` se reorganizó la cabecera pública para que el formulario de registro/login preceda a la demo y se eliminaron disposiciones de cuadrícula que podían dejar el acceso en una fila incorrecta.
- Se mejoraron tamaños de letra, line-height, flexibilidad de botones, tratamiento de textos largos, diálogos, avisos, invitaciones, equipaciones, selección de archivos y barras laterales en las dos áreas y ambas demostraciones.
- En móviles, los calendarios mensuales oficial y demo permiten **desplazamiento horizontal** para mantener legibles las siete columnas en lugar de reducir el texto a 8–9 píxeles.
- Se versionaron los enlaces CSS en las cuatro páginas HTML para evitar caché obsoleta.

### Comprobaciones efectuadas

- Validación de equilibrio de llaves/comentarios/comillas de las 12 hojas CSS enlazadas por las cuatro páginas principales.
- Verificación de que todas las hojas de estilo referenciadas existen en GitHub.
- 17 verificaciones estructurales de los problemas específicos (fondo, botones, cuenta, filtros, breakpoints, calendarios, recursos).
- Cálculo de **10 pares representativos de contraste** (texto/fondo) con relaciones entre 4,68:1 y 11,75:1, superando 4,5:1 en esas muestras. **Esto no constituye una auditoría WCAG completa de todas las combinaciones de colores.**
- Comprobación posterior a la fusión de los archivos relevantes en `main`.
- **Sin cambios en JavaScript funcional, tablas, políticas RLS, Auth ni datos reales.**

### Validación pendiente

No se ha podido completar una prueba visual real en un navegador autenticado ni una inspección exhaustiva de todas las rutas en dispositivos y tamaños de letra ampliados. Antes del lanzamiento general, verificar en escritorio y móvil: primera entrada sin temporadas, registro/login, menús de entrenador, club, formularios, calendarios y mensajes, con zoom 100 % y 200 %. Registrar capturas y corregir cualquier regresión detectada.

## 14. Revisión de continuidad — 12 de noviembre de 2026 (tarde)

### 14.1 GitHub: nuevas demostraciones y ajustes

- Comparación desde la integración visual `c69b9985fdd79c4f121196909c43956fb1b24572` hasta `main` consultado: **11 commits adicionales**, **9 archivos** añadidos o modificados: `css/demo-temporal.css`, `css/visual-fixes.css`, `demo-club-vista.html`, `demo-club.html`, `demo-equipo-vista.html`, `demo-vista.html`, `docs/ESTADO_Y_HOJA_DE_RUTA.md`, `index.html`, `js/demo-temporal.js`. La comparación incluye cambios documentales anteriores a esta revisión.
- Las páginas `demo-club-vista.html` y `demo-equipo-vista.html` presentan vistas de ejemplo separadas, con formularios de notas temporales. `js/demo-temporal.js` agrega y elimina elementos en el DOM, sin llamadas a Supabase ni almacenamiento persistente en ese módulo. Esto **no acredita** que todos los flujos de la aplicación real estén simulados o probados.
- `demo-vista.html` enlaza ambas vistas. `css/visual-fixes.css` contiene ajustes de legibilidad, flexibilidad de cabeceras y diseño móvil. Revisar visualmente en navegador antes de afirmar que los solapamientos están corregidos.
- La rama `feature/fase-1-clubes-equipos` permanece divergente: **59 commits por delante y 55 por detrás** de `main`. No se ha fusionado ni desplegado nada durante esta revisión.

### 14.2 Supabase: crecimiento del esquema y seguridad

- Proyecto `ACTIVE_HEALTHY`, PostgreSQL 17.11. **19 tablas públicas**, todas con RLS habilitado; **29 migraciones registradas** (frente a 4 en la revisión del 11-11); **25 políticas RLS**; **43 funciones SECURITY DEFINER ejecutables por authenticated**, **0 por anon**. No hay Edge Functions desplegadas. Los recuentos se han comprobado con metadatos y consulta SQL de solo lectura.
- Recuentos de tablas del conector: perfiles 3, temporadas 2, miembros de temporada 2, documentos 54, intentos de código 11; clubes 1, equipos 1, vinculación club-temporada 1, código de club 1, código de equipo 1, personal técnico 1. Son recuentos puntuales; no se han leído datos personales.
- Tablas nuevas respecto a la revisión anterior: `banquillo_club_seasons`, `banquillo_team_codes`, `banquillo_club_settings`, `banquillo_management_wallet`, `banquillo_management_charges`, `banquillo_team_messages`, `banquillo_director_events`, `banquillo_team_members`, `banquillo_match_schedules`.
- Entre las migraciones añadidas figuran gestión de códigos, vinculación de temporadas, personal técnico, invitaciones y revocación de directores, mensajería privada, actas, gestión de abandonos, planificador de partidos y actualización de reservas. **La existencia de migraciones no demuestra el funcionamiento de sus flujos ni su seguridad**. Es prioritario revisar el SQL y los controles de autorización antes de incorporar usuarios externos.
- El esquema incorpora tablas `banquillo_management_wallet` y `banquillo_management_charges` y una migración con nombre de gestión de Silbatos. Son elementos existentes observados, **no una autorización para desarrollar cobros o suscripciones**; la Fase 1 sigue excluyéndolos.
- Asesor de seguridad: **6 tablas RLS sin políticas** (`banquillo_club_codes`, `banquillo_management_charges`, `banquillo_management_wallet`, `banquillo_team_codes`, `join_attempts`, `seasons_meta`), **43 RPC SECURITY DEFINER ejecutables por authenticated** y advertencia de protección de contraseñas filtradas desactivada. Las tablas sin políticas no deben abrirse automáticamente: primero comprobar privilegios directos y uso previsto mediante RPC. [Guía de SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Asesor de rendimiento: **8 claves externas sin índice de cobertura**, `join_attempts` sin clave primaria y un índice sin uso observado. [Guía de claves externas sin índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). Asesor de salud sin avisos.
- **No se han ejecutado migraciones ni escrituras SQL en esta revisión**, ni se han modificado Auth, permisos, RLS, datos o código funcional.

### 14.3 Riesgos y siguientes pasos priorizados

1. **Bloqueante para un lanzamiento general:** verificar copia restaurable y plan de rollback de las 29 migraciones ya aplicadas; no asumir que una exportación JSON de configuración es un respaldo de base de datos.
2. Auditar primero las RPC SECURITY DEFINER sensibles (borrado/restauración de club, expulsión de director, asignación de personal, códigos de invitación, restauración de configuración, mensajes y reservas) con revisión de sus verificaciones de identidad, permisos y aislamiento entre clubes. No revocar masivamente las RPC necesarias.
3. Revisar políticas y privilegios efectivos de las 19 tablas; probar con dos cuentas ficticias independientes, sin tocar clubes, temporadas o jugadores reales.
4. Contrastar las 29 migraciones registradas con los scripts versionados del repositorio y preparar pruebas de recuperación y regresión, incluidas invitaciones, cierres, calendarios y conservación de temporadas.
5. Completar **auditoría persistente con valores anterior/nuevo** y **notificaciones agrupadas con lectura**: la existencia de mensajes/eventos no prueba que cumplan estos requisitos. Verificar vinculación del Prebenjamín existente sin alterar sus datos y mantener límite de 12 equipos activos por club.
6. Probar en navegador real ambas demostraciones y el acceso autenticado desde móvil/escritorio. Revisar que los datos de muestra sean enteramente ficticios y no reproduzcan identidades reales de menores.

Se mantienen para fases posteriores los avisos IA, identidad e historial de jugadores entre categorías y deshacer cambios. **No hay pruebas extremo a extremo ni validación visual realizadas por esta revisión.**
