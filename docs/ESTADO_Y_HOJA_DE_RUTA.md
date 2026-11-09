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
- `handle_new_user()` y `rls_auto_enable()` aparecen como SECURITY DEFINER ejecutables por PUBLIC/anon/authenticated. Deben limitarse sus permisos al uso necesario. `handle_new_user` se ejecuta mediante trigger y no necesita ser RPC pública.
- Protección de contraseñas filtradas desactivada en Auth.
- Índice pendiente en la FK `seasons_meta.owner_id`.
- Aviso de optimización de `profiles_select_own` por evaluación repetida de `auth.uid()`.
- `join_attempts` no tiene clave primaria.

Los avisos son hallazgos para investigar, no prueba automática de una brecha explotable. No cambiar permisos/políticas sin revisar dependencias y probar registro, acceso, invitación y sincronización.

### 4.6 Estado de Fase 1

Las funcionalidades específicas de clubes/equipos/director deportivo, registro de cambios y notificaciones agrupadas **no aparecen implementadas** en el modelo de datos ni en las vistas examinadas. La aplicación existente se organiza alrededor de temporadas individuales.

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
| 2026-11-09 | Revisión de seguridad inicial | Hallazgos RLS, SECURITY DEFINER, Auth e índices documentados |
| 2026-11-09 | Documento maestro | Primera versión creada; Fase 1 pendiente |

## 8. Pendiente inmediato

Completar la revisión de funciones y políticas, comprobar la web publicada en una sesión de prueba, y preparar una copia de seguridad verificable. Después presentar el diseño de migración de clubes/equipos antes de aplicar cambios.
