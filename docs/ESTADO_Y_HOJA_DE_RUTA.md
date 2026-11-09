# Banquillo — Documento maestro de proyecto

> Documento vivo de continuidad. Se actualizará al cerrar cada bloque de análisis, implementación y pruebas.
> Última actualización: 9 de noviembre de 2026.
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
- En la rama de trabajo se han retirado las copias heredadas de la raíz que no carga `index.html` (módulos JS, CSS, SQL y fuentes duplicadas de la Edge Function), además de un archivo vacío `download`. Se conserva como fuente activa `js/`, `css/` y `supabase/`.
- Se han retirado de la raíz las páginas legales antiguas no enlazadas. Las páginas canónicas son `legal/privacidad.html` y `legal/aviso-legal.html`, que son las que enlaza `index.html`. Sus textos siguen siendo plantillas pendientes de completar y revisión antes de un lanzamiento público.
- El código fuente de la Edge Function `ai-report` está en `supabase/functions/ai-report/`, pero el proyecto Supabase no devuelve ninguna función desplegada. Por tanto, la función IA no debe darse por operativa en producción.
- El archivo `GUIA.md` describe la publicación mediante GitHub Pages y la configuración del proyecto. Debe actualizarse cuando se consolide el nuevo modelo de clubes y equipos.
- El usuario facilitó la URL publicada y un enlace directo a `/#partido-2`. La herramienta de navegación no pudo recuperar la página en esta sesión; la URL por sí sola no confirma que la ruta cargue correctamente en el navegador del usuario.



### 4.8 Revisión funcional adicional — 9-11-2026

- Se ha creado la rama de trabajo `feature/fase-1-clubes-equipos` desde `main` para aislar la transformación y evitar cambios directos sobre la rama publicada.
- `js/cloud.js` confirma que la aplicación usa acceso directo a la tabla `docs` mediante Supabase JS (lecturas, upserts, borrados y Realtime), además de RPC para operaciones de temporada.
- `js/store.js` confirma que el estado activo se carga por temporada: roles desde `season_members`, raíz de temporada desde `docs` y colecciones de jugadores, partidos, informes y entrenamientos. La creación de temporada llama a `create_season` y después guarda documentos en lotes.
- `js/auth.js` confirma registro, login, recuperación de contraseña y aceptación de los documentos legales; la aplicación guarda el nombre recibido en metadatos de Auth, que no debe utilizarse para autorizar roles.
- La inspección de definiciones SQL confirma que las RPC de temporada con acceso a datos usan comprobaciones de pertenencia/propiedad y `search_path = ''. Las funciones de saldo están limitadas a `service_role`.
- Matiz de seguridad: el catálogo refleja permisos EXECUTE para PUBLIC/anon en las funciones de trigger `handle_new_user()` y `rls_auto_enable()`. Son funciones de tipo trigger/event trigger y no deben tratarse como RPC normales; hay que revisar el mecanismo de disparo y ajustar privilegios sin romper los triggers.
- No se han ejecutado escrituras SQL, migraciones ni cambios en producción. El trabajo realizado hasta aquí es de lectura y preparación.

## 5. Plan de trabajo

### Bloque A — preservar y entender
- [x] Acceder al repositorio y Supabase.
- [x] Inventariar archivos principales.
- [x] Inspeccionar tablas, funciones, políticas y recuentos.
- [x] Crear este documento maestro inicial.
- [ ] Confirmar que el enlace publicado carga correctamente en navegador.
- [x] Identificar rutas activas y retirar duplicados heredados en rama aislada.
- [ ] Revisar completamente funciones SQL sensibles y reglas RLS.
- [x] Implementar generación de mensajes de convocatoria con listas alternativas, motivos y datos del partido.
- [x] Añadir configuración de equipaciones en creación/ajustes de temporada y selección por partido.
- [x] Pasar comprobaciones automatizadas de sintaxis, generación del mensaje, motivos, equipaciones y campos persistidos.
- [ ] Probar convocatoria, copia del mensaje y persistencia en navegador móvil y escritorio.
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
| 2026-11-09 | Convocatorias y equipaciones | Mensajes listos para copiar (convocados o no convocados con motivo), configuración de colores, equipación por partido y datos opcionales de citación; pendiente prueba en navegador |
| 2026-11-09 | Pruebas automatizadas de convocatoria | 11 módulos JS sin errores de sintaxis; generador probado con datos ficticios para listas, tres motivos, jornada, sede, fecha, citación y equipaciones; pendiente navegador y portapapeles real |

## 8. Pendiente inmediato

Completar la revisión de funciones y políticas, comprobar la web publicada en una sesión de prueba, y preparar una copia de seguridad verificable. Después presentar el diseño de migración de clubes/equipos antes de aplicar cambios.


### 4.9 Limpieza inicial del repositorio — 9-11-2026

En la rama aislada `feature/fase-1-clubes-equipos` se ha realizado una limpieza conservadora basada en las referencias del HTML principal:

- Eliminadas copias de raíz de los módulos JavaScript que se cargan desde `js/`: `auth.js`, `boot.js`, `calc.js`, `cloud.js`, `core.js`, `export.js`, `store.js`, `util.js`, `views1.js`, `views2.js` y `views3.js`.
- Eliminado `app.css` de la raíz; la aplicación carga `css/app.css`.
- Eliminado `schema.sql` de la raíz; la guía y la estructura del proyecto usan `supabase/schema.sql`.
- Eliminadas las copias de raíz `handler.ts` e `index.ts`; se conservan las fuentes de la Edge Function en `supabase/functions/ai-report/`.
- Eliminadas las páginas legales antiguas de la raíz; se conservan las páginas enlazadas desde `index.html` en `legal/`.
- Eliminado el archivo vacío `download`.

Motivo: evitar ambigüedad sobre qué archivo debe modificarse y mantener una única ubicación canónica para cada componente. Se comprobó que `index.html` carga los módulos desde `js/` y `css/`, y enlaza las páginas legales dentro de `legal/`. Las copias SQL y Edge Function se conservaron dentro de `supabase/`.

**Importante:** esta limpieza solo se ha aplicado a `feature/fase-1-clubes-equipos`; no se ha modificado `main` ni la web publicada. No se ha borrado ningún dato de Supabase. Antes de integrar la rama se hará una revisión de referencias y pruebas de carga.

### 4.10 Convocatorias automáticas y equipaciones — 9-11-2026

Se ha implementado en la rama de trabajo una mejora de convocatoria, sin modificar la base de datos ni desplegar a producción:

- En la pestaña Convocatoria se genera un texto automático para las familias con dos modos excluyentes: **solo convocados** o **solo no convocados**.
- El encabezado incluye club, jornada, rival, condición de local/visitante, fecha y equipación elegida.
- Si se indica, también añade la hora de citación y el lugar de encuentro.
- En el modo de no convocados, cada jugador aparece con su motivo: **Lesión**, **Motivos personales** o **Decisión técnica**. No se añaden los convocados a ese mensaje.
- El texto se puede copiar directamente. La copia está permitida también a usuarios con acceso de solo lectura, sin permitirles modificar la convocatoria.
- El asistente de nueva temporada permite configurar colores/descripción de primera y segunda equipación y, opcionalmente, tercera.
- Los colores también se pueden editar en Ajustes de una temporada ya existente.
- En los datos de cada partido se selecciona la equipación que se utilizará. Por defecto, los partidos locales parten de primera y los visitantes de segunda; el entrenador puede cambiarla.
- Los nuevos datos se guardan en los documentos JSON existentes (ajustes de temporada y documento de partido). Se amplió la lista de campos serializados para conservar equipación, modo de mensaje, hora y lugar de citación. No requiere migración SQL.

**Validación realizada (9-11-2026):**
- Sintaxis JavaScript: **11/11 módulos** activos compilados sin errores.
- Generador de mensajes probado con datos ficticios: lista de convocados sin filtrar ausentes, lista exclusiva de no convocados con los tres motivos (LS/MP/DT), datos de jornada/rival/local-visitante, fecha, citación y las tres equipaciones.
- Comprobados los campos nuevos de persistencia, la presencia de controles de selección/copia y el comportamiento de solo lectura del textarea.
- No se ha probado todavía el navegador real, el portapapeles del dispositivo ni la experiencia visual en móvil/escritorio. No se ha modificado Supabase. El repositorio no devolvió comprobaciones CI asociadas al último commit.
- Todas las pruebas automatizadas disponibles en este entorno han pasado; la funcionalidad permanece en `feature/fase-1-clubes-equipos`, sin afectar a `main` ni a GitHub Pages. La funcionalidad permanece aislada en `feature/fase-1-clubes-equipos`, sin afectar a `main` ni a GitHub Pages.

## 9. Cambios GitHub y commits

- Rama de trabajo: `feature/fase-1-clubes-equipos`.
- Limpieza de 18 archivos heredados/duplicados completada mediante commits separados en la rama de trabajo. El último commit resultante debe verificarse en GitHub antes de integrar.
- No se ha desplegado esta limpieza a GitHub Pages.

### Commits de la mejora de convocatorias — 9-11-2026

- `js/views1.js`: panel de mensaje automático, selección de convocados/no convocados, equipación por partido, hora y punto de encuentro, copia y alternativa de selección manual.
- `js/views3.js`: campos de equipaciones en el asistente de nueva temporada.
- `js/store.js`: persistencia de los nuevos campos del partido.
- `js/core.js`: permiso de solo lectura para copiar el mensaje sin editar la convocatoria.
- `js/util.js`: motivo de ausencia unificado como «Lesión».
- Commits de implementación: `0034a24`, `e4294a3`, `fbed85a`, `9579c7a`, `260e9f3`, `8c5eca0`, `a6f982e`, `d4f46ec`, `10bf7f9` y `470ad6b`.
- Documento actualizado y reordenado en `2c6c1fa`; se mantiene pendiente la prueba en navegador antes de integrar en `main`.



### 4.11 Catálogo inicial de competiciones — Andalucía, Sevilla — 9-11-2026

Se ha investigado la oferta federativa de la temporada 2026/2027 y se ha añadido un catálogo semilla en:

- `data/competition-catalog.es-andalucia-sevilla.2026-2027.json`
- Commit: `fa344c90cd105220e057ec370b8b28a6130962ee`

Configuración territorial del club de demostración:
- País: España.
- Comunidad autónoma: Andalucía.
- Provincia: Sevilla.
- Municipio de demostración: Dos Hermanas.
- Temporada: 2026/2027.
- Modalidades: Fútbol 7 y Fútbol 11.

El catálogo inicial incluye competiciones masculinas federadas con categoría, modalidad, organizador, ámbito territorial, temporada y fuentes:
- Prebenjamín: 3.ª y 4.ª Andaluza provincial, Fútbol 7.
- Benjamín: 2.ª, 3.ª y 4.ª Andaluza provincial, Fútbol 7.
- Alevín: 1.ª Andaluza autonómica y 2.ª, 3.ª y 4.ª Andaluza provincial, Fútbol 7.
- Infantil: División de Honor autonómica y 2.ª, 3.ª y 4.ª Andaluza provincial, Fútbol 11.
- Cadete: 1.ª Andaluza autonómica y 2.ª, 3.ª y 4.ª Andaluza provincial, Fútbol 11.
- Juvenil: División de Honor Juvenil y Liga Nacional Juvenil (ámbito nacional), más 2.ª, 3.ª y 4.ª Andaluza provincial, Fútbol 11.

Matices importantes:
- No se inventan grupos: se elegirán solo cuando la ficha oficial de la competición los publique.
- La 1.ª Andaluza Juvenil y otras posibles categorías autonómicas no se activan hasta confirmar su ficha de la temporada 2026/2027.
- Las competiciones femeninas se mantienen como catálogo separado pendiente de completar con fichas oficiales de la temporada.
- Los Juegos Deportivos Municipales del IMD consultados son del municipio de Sevilla capital; no se asignan automáticamente a un club ubicado en Dos Hermanas.
- Liga Educa se registra como competición educativa/no federativa de alta manual, nunca como RFAF/RFEF.
- La ficha de cada competición conserva URL de fuente y el catálogo tiene estado de verificación para permitir revisiones futuras.

Este JSON es por ahora un catálogo semilla versionado en la rama de desarrollo. **Todavía no está conectado a la interfaz de creación de clubes/equipos ni se ha escrito en Supabase.** No se ha modificado producción, la rama `main` ni los datos reales.



### 4.12 Especificación del planificador de partidos e instalaciones — 9-11-2026

Se ha creado `docs/PLANIFICADOR_PARTIDOS_E_INSTALACIONES.md` (commit `02361cc3bfaea59ab520f869ed6f459860e18732`) con la especificación funcional acordada para el club de demostración y la futura plataforma multi-club.

Incluye:
- Uno o dos directores deportivos con permisos idénticos; preferencia F7/F11 sin restringir acceso y cambio de modalidad desde la barra.
- Inventario de campos, disponibilidad semanal, bloqueos y divisibilidad real de campos F11 en dos recursos F7.
- Calendario mensual/semanal/diario, panel lateral de partidos locales pendientes y partidos visitantes informativos.
- Estados pendiente/propuesto/publicado/modificado/cancelado, publicación explícita e historial de cambios.
- Detección de solapamientos y control de ediciones simultáneas.
- Asistente inicial determinista y explicable; IA generativa aplazada hasta desplegar un backend seguro (la Edge Function IA no está desplegada según auditoría).
- Mensaje de WhatsApp e imagen semanal/mensual, con 🏠 local, ✈️ visitante y 🕒 pendiente.
- Modelo de datos objetivo y criterios de aceptación.

No se ha implementado todavía el módulo ni se han ejecutado cambios SQL. No se ha modificado Supabase, `main` ni la web publicada. La equivalencia 1 F11 = 2 F7 se aplica como capacidad simultánea únicamente si el campo es físicamente divisible y el club lo declara; no se permite sobre-reservar el campo padre.



### 4.13 Prototipo aislado del club de demostración — 9-11-2026

Se ha añadido una primera interfaz funcional independiente en la rama de desarrollo:
- `demo-club.html`: punto de entrada del prototipo.
- `css/demo-club.css`: estilos adaptables a escritorio y móvil.
- `js/demo-club.js`: lógica del prototipo y datos ficticios.

Funcionalidad incluida:
- Club ficticio Atlético Monteverde CF (Dos Hermanas, Sevilla; temporada 2026/2027).
- 15 equipos ficticios repartidos entre Fútbol 7 y Fútbol 11.
- Dos directores deportivos ficticios con idéntica capacidad de acceso; selector para cambiar el director activo.
- Preferencia de modalidad F7/F11 por director, con selector superior F7/F11/Todo el club. La preferencia no restringe permisos.
- Vista de equipos, ficha resumida de dirección deportiva, ajuste de nombre/territorio/temporada y configuración inicial de campos F11/F7 y divisibilidad.
- Alta local de equipo de demostración y restablecimiento de datos ficticios.
- Persistencia únicamente en localStorage con clave propia `banquillo_demo_atletico_monteverde_v1`.

Aislamiento: la página carga solo su CSS y su JS propios; no carga `config.js`, Auth, Cloud, SDK de Supabase ni realiza solicitudes al backend. Por tanto, este prototipo no puede leer ni modificar los datos reales de los usuarios.

Validación realizada: se volvieron a descargar desde GitHub los tres archivos recién creados y se comprobó su contenido y referencias; la página enlaza el JS y CSS aislados, hay 15 equipos semilla, la persistencia usa una clave local propia y no existen referencias a Supabase/Auth/Cloud. El JavaScript pasó una comprobación de sintaxis mediante compilación V8 (`new Function`, sin ejecutar el código). No se ha ejecutado todavía una prueba visual en navegador ni una comprobación automatizada completa de interacción. Los apartados Calendario y Comunicaciones son marcadores de fase futura, no funciones implementadas.

Commits:
- `ef5dccaf7d316f245ab1f77536ac20d5c6d15119` — página de demostración.
- `480ac7699dfc9dc2bc59ca37408652ae1d75685e` — estilos responsive.
- `9226e6d0df37be5c451180766588cfcfd01a2609` — lógica local y datos ficticios.

No se ha modificado `main`, GitHub Pages, Supabase ni los datos reales. El prototipo está disponible en la rama `feature/fase-1-clubes-equipos` en la ruta `demo-club.html`.

## 5.1 Próxima ampliación del catálogo
1. Verificar una por una las fichas 2026/2027 de todas las divisiones por categoría.
2. Completar las competiciones femeninas y sus modalidades.
3. Investigar la oferta municipal específica de Dos Hermanas y otras localidades.
4. Diseñar actualización anual por temporada y registro de fuentes/fecha de comprobación.
5. Conectar el catálogo a la creación de equipos con filtros por comunidad, provincia, municipio, categoría, género y modalidad.


### 4.14 Ampliación de la página de entrada y modalidades de uso — 9-11-2026

Se ha actualizado la página pública en la rama `feature/fase-1-clubes-equipos` para reflejar que Banquillo tendrá dos modalidades de organización:

- **Equipo independiente:** se mantiene el flujo actual de creación y gestión de una temporada/equipo sin exigir pertenecer a un club. La llamada a la acción lleva al acceso/registro existente.
- **Club:** se presenta la futura gestión multi-equipo con dirección deportiva y entrenadores. Se identifica expresamente como desarrollo en curso; no se ofrece un flujo de alta de club que todavía no está implementado.
- Se añade el apartado **«Sobre el creador»** con el nombre facilitado por el usuario: Carlos Biera Vázquez, y una descripción breve del origen y propósito del proyecto.
- Se deja indicado que el correo oficial de contacto se habilitará más adelante. No se inventa ni publica una dirección de correo provisional.
- Se amplía la navegación de la landing con accesos a modalidades y creador.

Archivos modificados:
- `index.html`: navegación, sección de modalidades y apartado del creador.
- `css/app.css`: estilos responsive para las nuevas secciones.

**Alcance y cautelas:** cambios únicamente en la página pública de la rama de desarrollo. No se ha cambiado el acceso/registro, la gestión de temporadas, Supabase, `main` ni GitHub Pages. La opción de equipo independiente conserva el flujo de entrada actual; la gestión de clubes aparece como próxima modalidad y no se presenta falsamente como funcional.

**Pendiente de validación:** revisar visualmente en navegador móvil y escritorio, comprobar anclas y enlace de entrada, y revisar contraste/legibilidad en modo oscuro.


---

## 9. Revisión de continuidad y prioridades — 9 de noviembre de 2026

### 9.1 Estado verificado en esta revisión

- La rama de trabajo feature/fase-1-clubes-equipos existe y contiene cambios de prototipo y landing. La rama main sigue siendo la referencia de producción; no se ha fusionado ni publicado este trabajo.
- La landing de la rama de trabajo ofrece dos caminos: gestionar un equipo de forma independiente y, en el futuro, gestionar un club. Incluye la sección del creador y deja el correo oficial pendiente, sin inventar una dirección.
- El prototipo demo-club.html contiene 15 equipos ficticios, dos directores deportivos con el mismo nivel de acceso, filtros F7/F11/todo el club y una configuración básica de instalaciones. Usa almacenamiento local del navegador y no está conectado a Auth, Supabase ni datos reales.
- En el prototipo, calendario y comunicaciones siguen siendo apartados pendientes; no deben presentarse como funciones terminadas.
- La consulta de solo lectura a Supabase confirma 5 tablas públicas: profiles (2 filas), seasons_meta (1), season_members (1), docs (33) y join_attempts (0). No hay tablas de clubes, equipos, notificaciones o auditoría.
- El historial de migraciones de Supabase continúa vacío. No se ha aplicado ninguna migración ni se ha modificado información.
- Los asesores vuelven a señalar RLS sin políticas en seasons_meta y join_attempts; funciones SECURITY DEFINER ejecutables por roles externos (incluidas handle_new_user y rls_auto_enable); protección de contraseñas filtradas desactivada; FK seasons_meta.owner_id sin índice; política de profiles con llamada repetida a auth.uid(); y join_attempts sin clave primaria. Son avisos que requieren inspección de definiciones y pruebas antes de corregirlos; no se deben aplicar revocaciones genéricas que puedan romper el alta, invitaciones o sincronización.

### 9.2 Orden de ejecución para una primera versión fiable

**P0 — preservar y cerrar riesgos antes de tocar datos**
1. Obtener una copia de seguridad verificable y documentar cómo restaurarla.
2. Exportar y revisar el esquema completo, políticas RLS, funciones, triggers y configuración Auth.
3. Identificar qué funciones SECURITY DEFINER necesitan ser llamadas desde cliente y cuáles son exclusivamente internas. Aplicar mínimo privilegio función por función, con pruebas de registro, login, recuperación, creación/unión a temporada, cambio de rol y sincronización.
4. Confirmar aislamiento entre dos cuentas y que un miembro no puede leer ni modificar temporadas ajenas.
5. Preparar migraciones versionadas, procedimiento de rollback y un entorno de prueba. No reconstruir la base ni sobrescribir docs.

**P1 — modelo de club compatible con la aplicación actual**
1. Crear Club, Team, membresías y roles sin eliminar ni renombrar las tablas actuales.
2. Mantener el modo de equipo independiente: crear/gestionar una temporada sin pertenecer a un club debe seguir funcionando.
3. Permitir uno o dos directores deportivos por club, con idénticos permisos; el director puede también ser entrenador de uno o varios equipos.
4. El director ve todos los equipos del club; cada entrenador ve únicamente los equipos que tenga asignados.
5. Mantener el límite acordado de 12 equipos por club hasta que el propietario decida cambiarlo. Los 15 equipos del prototipo son exclusivamente datos de demostración.
6. Relacionar temporadas existentes con equipos de forma aditiva, verificando que los 33 documentos observados y cualquier dato nuevo permanecen intactos.
7. Añadir auditoría de cambios con actor, fecha, entidad, campo y valores anterior/nuevo.

**P2 — operaciones deportivas del club**
1. Campanita de notificaciones con categorías, lectura/no lectura, destinatarios por club/equipo y registro de quién publicó.
2. Planificador de partidos en casa con calendario mensual/semanal/diario, partidos pendientes de asignar, filtros F7/F11 y lista lateral de equipos locales.
3. Modelo real de instalaciones: campos físicos, disponibilidad, bloqueos y divisibilidad. Un F11 solo equivale a dos F7 cuando la instalación puede dividirse y ambos espacios pueden usarse simultáneamente. Evitar solapamientos entre campo padre y subcampos.
4. Ayudante de planificación inicialmente determinista y explicable: mostrar conflictos y alternativas, nunca mover citas publicadas sin aprobación.
5. Publicación controlada de horarios y exportación de mensajes/imagen para el cuerpo técnico. Los partidos visitantes se muestran como información y no reservan campos del club.
6. Catálogo de competiciones por país, comunidad, provincia, organizador, modalidad, categoría y temporada; permitir Otros para competiciones locales/municipales sin mezclarlas con las federativas.

**P3 — calidad y lanzamiento**
1. Pruebas reales en móvil y escritorio, navegación accesible, estados vacíos, errores de red y recuperación de sesión.
2. Pruebas de roles, concurrencia, aislamiento entre clubes y conservación de datos.
3. Revisar textos legales, privacidad y minimización de datos de menores; no incluir datos médicos ni información innecesaria.
4. Revisar que la landing no prometa funciones que aún no estén operativas.
5. Crear una versión candidata, revisar el cambio completo y solo entonces abrir la fusión a main y publicar.

### 9.3 Propuestas de mejora recomendadas (no bloquean el MVP)

- **Centro de tareas deportivas:** tareas con responsable, equipo, fecha límite y estado; útil para documentación, asistencia y resultados pendientes.
- **Informe semanal del club:** resumen de actividad, partidos, convocatorias, asistencia y tareas pendientes, con enlaces directos a cada equipo.
- **Plantillas reutilizables:** temporadas, convocatorias, mensajes y configuraciones de equipos para reducir trabajo repetido.
- **Importación y exportación controladas:** CSV/Excel para altas y descarga de datos del club, con validación previa y sin duplicar jugadores.
- **Historial y recuperación:** registro de cambios primero; deshacer con control de versiones después, para no sobrescribir cambios simultáneos.
- **PWA y modo de conectividad limitada:** permitir consultar información reciente cuando la cobertura del campo sea mala; las escrituras se sincronizarán solo cuando sea seguro y sin conflictos.
- **Catálogo de instalaciones compartible:** reutilizar campos del club y sus horarios, manteniendo bloqueos y permisos.
- **Privacidad desde el diseño:** nombres mínimos, acceso por función, plazos de conservación y exportación/eliminación según las obligaciones aplicables.

### 9.4 Criterio de finalización

Banquillo no se considerará listo por tener pantallas o datos de demostración. La primera versión se dará por válida cuando el acceso independiente por equipo siga funcionando; club, equipos y roles estén protegidos por RLS y comprobaciones del servidor; directores y entrenadores solo puedan operar dentro de su ámbito; la temporada actual conserve íntegros sus datos; notificaciones y registro de cambios funcionen; las pruebas automatizadas y manuales de móvil/escritorio pasen; la copia de seguridad y el procedimiento de recuperación estén documentados; y la versión se haya revisado antes de publicarse.

### 9.5 Actividad de esta revisión

| Fecha | Trabajo | Resultado |
|---|---|---|
| 2026-11-09 | Revisión de continuidad de rama de trabajo | Confirmada la existencia de feature/fase-1-clubes-equipos; cambios separados de main |
| 2026-11-09 | Revisión del prototipo de club | Confirmados 15 equipos ficticios, dos directores equivalentes y calendario/comunicaciones aún pendientes |
| 2026-11-09 | Revisión de Supabase | Solo lectura; 5 tablas, 33 documentos, 0 migraciones; sin cambios de datos o esquema |
| 2026-11-09 | Nueva consulta de asesores | Hallazgos de seguridad y rendimiento siguen pendientes de revisión específica |
| 2026-11-09 | Priorización de MVP y mejoras | Definidos P0–P3 y backlog recomendado; no se ha desplegado nada |


### 9.6 Detalle de autorización SQL comprobado — 9 de noviembre de 2026

La inspección de solo lectura de pg_policies, ACL de funciones, triggers y definiciones confirma:
- Las tablas docs, profiles y season_members tienen las políticas esperadas; seasons_meta y join_attempts no tienen políticas RLS.
- handle_new_user está unido al trigger on_auth_user_created de auth.users. rls_auto_enable está unido al event trigger ensure_rls. Ambas funciones SECURITY DEFINER aparecen además ejecutables por PUBLIC, anon y authenticated, aunque su uso previsto es interno de trigger. Preparar una revocación específica de EXECUTE para esos roles, conservando el funcionamiento de los triggers, y verificar alta de cuenta y creación de tablas después del cambio.
- Las funciones SECURITY DEFINER restantes con permiso authenticated forman parte de la API de temporadas/perfiles y aplican comprobaciones de auth.uid()/rol en su lógica; no revocar en bloque. Revisar cada cuerpo y sus pruebas antes de tocar permisos.
- Las funciones spend_tokens, refund_tokens y refill_if_due están limitadas a service_role en los ACL observados.
- El código de esquema del repositorio y el estado real de la base deben compararse antes de generar una migración, porque el esquema SQL inicial y el estado vivo pueden haber divergido.

No se aplicaron cambios de permisos. El siguiente paso seguro sigue siendo verificar una copia de seguridad recuperable y preparar una corrección estrecha y reversible.


### 9.7 Preparación de demo para presentación — 9 de noviembre de 2026

**Cambios en la rama de desarrollo (feature/fase-1-clubes-equipos), sin publicación ni cambios de Supabase:**
- Se completó el módulo de calendario semanal del prototipo de club: navegación de semanas, resumen de partidos, distinción local/visitante y lista de encuentros locales pendientes.
- Los partidos locales pendientes ahora permiten asignar fecha, hora y campo desde la propia lista. Al guardar, el estado pasa a propuesto; la publicación es una acción separada y explícita.
- Se añadió comprobación de solapamientos de recursos: el campo F11 completo entra en conflicto con cualquiera de sus mitades; las dos mitades F7 de un F11 divisible pueden utilizarse simultáneamente; dos reservas sobre el mismo recurso no pueden solaparse.
- Se añadió alta de partido, estados pendiente/propuesto/publicado, eliminación de partidos no publicados y vista semanal imprimible.
- Se completó el generador de mensaje semanal para WhatsApp, con partidos locales/visitantes y marcas explícitas de horarios/campos pendientes.
- Se añadió enlace desde la landing a la demo y se acortó el título SEO visible a «Banquillo». La URL canónica sigue siendo GitHub Pages; banquillo.app no se ha registrado ni configurado.
- La demo conserva datos ficticios en localStorage del navegador. No comparte cambios entre usuarios, no usa Auth ni Supabase y no constituye todavía la gestión real de clubes multiusuario.
- Los 15 equipos de ejemplo son datos ficticios de demostración. El límite acordado para clubes reales continúa siendo 12, pendiente de implementación backend.
- No se modificó main, no se fusionó la rama, no se publicó una versión nueva y no se alteraron tablas, permisos ni datos de Supabase.

**Pruebas ejecutadas:**
- Sintaxis JavaScript del módulo de demostración: correcta.
- Render inicial y render de las vistas Calendario y Comunicaciones con DOM simulado: correctos.
- Asignación de un partido local a un recurso libre: estado cambia a propuesto.
- Intento de asignación con solapamiento sobre el mismo F11: bloqueado y permanece pendiente.
- Dos reservas F7 en mitades distintas del mismo F11 divisible: permitidas.
- Reserva F11 completo cuando una mitad ya está ocupada: bloqueada.
- Enlace de demo, título de landing y estilos responsive/impresión: comprobados en los archivos.
- No se ha realizado aún prueba visual real en navegador, prueba real de portapapeles ni prueba de accesibilidad con dispositivos físicos.

**Pendiente antes de presentar/publicar:**
1. Abrir la demo en navegador de escritorio y móvil y revisar visualmente desbordamientos y controles.
2. Confirmar que la demostración se abre desde un alojamiento accesible. Los cambios están solo en la rama de desarrollo y aún no están en la URL pública de GitHub Pages.
3. Mantener visible la etiqueta de prototipo/datos ficticios.
4. No fusionar todo el historial de la rama de desarrollo: revisar cambios de forma selectiva y mantener la aplicación independiente de equipos intacta.
5. No presentar calendario, roles de club ni comunicaciones como sincronizados entre cuentas hasta implementar backend y permisos.
