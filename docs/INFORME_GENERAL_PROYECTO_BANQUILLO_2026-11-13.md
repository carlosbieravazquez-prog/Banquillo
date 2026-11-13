# Banquillo — Informe general del proyecto
**Fecha de corte:** 13 de noviembre de 2026  
**Repositorio:** https://github.com/carlosbieravazquez-prog/Banquillo  
**Rama revisada:** `main`  
**Proyecto Supabase:** `dsewztxveqgwhyuyyyoq`

> Este documento reúne el estado conocido del producto, las decisiones acordadas, la auditoría reciente y los bloqueos de lanzamiento. Distingue entre código preparado, configuración desplegada y funcionalidades probadas. No declara como verificado nada que no se haya ejecutado.

## 1. Resumen ejecutivo

Banquillo es una aplicación web para gestionar clubes y equipos de fútbol, con áreas diferenciadas para dirección deportiva y entrenadores. El proyecto tiene una base funcional y varias mejoras recientes en GitHub, además de un análisis de seguridad de solo lectura de Supabase.

**Estado real a la fecha de corte:**
- Repositorio GitHub en rama `main` con cambios de auditoría y preparación de permisos.
- Supabase de producción responde como `ACTIVE_HEALTHY`, PostgreSQL 17.11, región eu-central-1, plan Free.
- La base de producción no ha recibido cambios durante esta última auditoría: no se aplicaron migraciones, no se cambiaron políticas ni permisos y no se alteraron datos.
- La migración que permite editar temporadas vinculadas al segundo director está preparada en GitHub, pero no aplicada.
- La migración de índices recomendados por Performance Advisor está preparada, pero no aplicada.
- No se verificó una copia restaurable ni se probó una restauración.
- No se han ejecutado pruebas de navegador ni pruebas funcionales completas con usuarios ficticios en esta sesión.
- La conexión Vercel consultada no muestra proyectos Git vinculados en el equipo disponible. Por ello no se ha podido verificar desde esa cuenta un despliegue oficial asociado al repositorio ni promover una versión a producción.

**Conclusión:** no se puede declarar Banquillo listo para lanzamiento público. La publicación sin pruebas ni copia recuperable supondría un riesgo para las cuentas, equipos y datos existentes. El trabajo documental y las propuestas de corrección sí están preparados.

## 2. Objetivo y alcance de Fase 1

Fase 1 debe consolidar la gestión de clubes y equipos sin introducir cobros ni suscripciones.

Incluye:
1. Clubes y equipos con estructura clara.
2. Uno o dos directores deportivos con capacidad equivalente de gestión.
3. Límite inicial de 12 equipos por club.
4. Registro de cambios con valor anterior y nuevo.
5. Notificaciones agrupadas.
6. Vinculación del Prebenjamín existente con el club/temporada correspondiente.
7. Mantener separadas las responsabilidades de director deportivo y entrenador.
8. No implementar cobros, Silbatos, planes ni suscripciones como requisito de Fase 1.

Posterior a Fase 1:
- Avisos y recomendaciones de IA.
- Historial e identidad de jugadores al pasar entre categorías.
- Deshacer cambios y restauración completa de operaciones.

## 3. Funcionalidad y decisiones de producto registradas

### Dirección deportiva
- Gestión de clubes y equipos.
- Uno o dos directores deportivos.
- Ambos directores deben tener las mismas capacidades de dirección.
- No debe existir un selector que permita hacerse pasar por el otro director: cada cuenta conserva su identidad.
- El propietario debe poder expulsar al segundo director; las operaciones de titularidad deben conservar trazabilidad.
- Calendario de partidos en casa, organización de campos F7/F11 y comunicación de horarios a entrenadores.
- Gestión del cuerpo técnico: delegado, segundo entrenador y tercer entrenador.
- Posibilidad de eliminar equipos, con confirmación y control de consecuencias.

### Área de entrenador
- Convocatorias, actas, plantillas, estadísticas y gestión de equipo.
- Roles de entrenador separados de los roles de dirección deportiva.
- Un director deportivo no debe convertirse artificialmente en entrenador/editor de una temporada.

### Clubes, equipos y límites
- Límite inicial acordado: 12 equipos por club.
- El alta de club/equipo no debe consumir Silbatos en Fase 1.
- Debe vincularse el Prebenjamín ya existente sin duplicar equipo, jugadores ni temporada.

### Elementos posteriores
- IA: avisos y recomendaciones.
- Identidad/historial del jugador entre categorías.
- Deshacer operaciones con registro y control de permisos.

## 4. Auditoría de Supabase

Consulta de solo lectura del 13/11/2026:
- Estado de proyecto: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.11.
- Región: `eu-central-1`.
- Plan: Free.
- 19 tablas públicas; las 19 tienen RLS activado.
- 25 políticas RLS.
- 29 migraciones registradas en la base remota.
- 64 funciones SECURITY DEFINER en el catálogo; 43 ejecutables por `authenticated`, ninguna por `anon`.
- Las funciones inventariadas fijan `search_path` a un valor restringido.
- No hay Edge Functions desplegadas.
- No hay buckets ni objetos actuales en Supabase Storage.
- Seis tablas no tienen políticas RLS, pero tampoco grants de tabla o columna para `anon`/ `authenticated`; no deben recibir políticas permisivas solo para silenciar el asesor.
- Aviso de protección frente a contraseñas filtradas desactivada. Supabase indica que esta opción requiere Pro o superior; la organización actual está en Free.
- Performance Advisor detecta ocho claves foráneas sin índice de cobertura, una tabla `join_attempts` sin clave primaria y un índice no usado en `seasons_meta`.

El estado saludable de la plataforma no significa que la aplicación esté libre de vulnerabilidades ni que sus flujos estén probados.

## 5. Hallazgos prioritarios

### 5.1 Permisos de los directores
En producción, `can_edit(text)` solo reconoce miembros de temporada con rol `owner` o `editor`. El segundo director recibe `viewer` en la temporada vinculada, por lo que no tiene edición efectiva de documentos.

Se preparó una migración para permitir edición al propietario o director del club cuando:
- el equipo está vinculado a esa temporada;
- el equipo no está archivado;
- el club no está eliminado;
- la identidad autenticada es propietario o director de ese club.

El segundo director conserva `season_members.role='viewer'`; no se transforma en entrenador. El frontend consulta `can_edit(sid)` y falla en modo cerrado (solo lectura) si la RPC falla o devuelve false.

**Estado:** preparado en GitHub, no aplicado a Supabase. Requiere pruebas de autorización y aislamiento.

### 5.2 Cobros de Silbatos fuera de alcance
Se identificaron flujos de creación que llaman a funciones de cargo:
- `banquillo_create_club()`: cargo de 10 Silbatos.
- `create_season()`: cargo de 5 Silbatos.
- El cierre de temporada puede ejecutar una devolución.

Esto contradice la decisión de no cobrar en Fase 1. No se ejecutaron esas funciones ni se alteraron saldos. Falta preparar y validar una corrección que retire el cobro del alta sin borrar el historial existente.

### 5.3 Privilegios y RLS
Se detectaron ACL/default privileges demasiado amplios en tablas de negocio, incluidos privilegios TRUNCATE en roles cliente. RLS filtra filas, pero no protege frente a TRUNCATE. No se ha intentado explotar ni ejecutar operaciones destructivas.

Se necesita un diseño de mínimo privilegio, revisando primero cada flujo/RPC para no romper funcionalidades. No se deben revocar permisos en bloque.

### 5.4 Borrado y restauración
La baja lógica del club no conserva/restaura todos los accesos: al restaurar un club pueden no recuperarse directores secundarios, códigos ni membresías. La restauración de configuración de club no es un backup integral. Debe diseñarse una restauración completa o documentarse claramente como parcial.

### 5.5 Copias de seguridad
La organización usa plan Free; no se verificó backup gestionado ni restauración. El archivo `supabase/backup_config_club_20261111.sql` solo restaura configuración de club desde JSON, no la base entera. `supabase/schema.sql` es un snapshot antiguo y no debe utilizarse como backup actual.

Antes de cambios de DDL/permisos en producción: exportación lógica completa, copia fuera del proyecto y prueba de restauración local/aislada.

## 6. Archivos y cambios preparados en GitHub

### Migraciones SQL preparadas
- `supabase/permisos_directores_edicion_temporadas_20261113.sql` — amplía `can_edit(text)` para la dirección del club vinculada a equipo/temporada activa. No aplicada.
- `supabase/indexar_claves_foraneas_banquillo_20261113.sql` — añade ocho índices no únicos para claves foráneas. No aplicada.

### Frontend
- `js/store.js` — reconoce el contexto de dirección y consulta la autorización real de Supabase antes de habilitar edición; si falla, permanece en solo lectura.
- `index.html` — referencia de caché actualizada para cargar la versión modificada de `js/store.js`.

### Documentación
- `docs/ESTADO_Y_HOJA_DE_RUTA.md` — documento vivo con historial, prioridades y siguientes pasos.
- `docs/AUDITORIA_SEGURIDAD_SUPABASE_2026-11-13.md` — auditoría detallada de seguridad, RLS, funciones, Storage y rendimiento.
- Este informe — resumen general del proyecto y su estado de lanzamiento.

## 7. Commits recientes de referencia

- `5de417d3c8ed298b6b4dbabdaf5bc1049bb2e20c` — preparar índices para claves foráneas.
- `bc80aedbdb0c4d2f710716b4728b97acba7d78fc` — registrar hallazgos de rendimiento y Storage.
- `78267251bb503916eb133ff31ea5cefba4cb239a` — ampliar auditoría con Storage y rendimiento.
- `609af231a94fb7b121dbd70ed35bb499dfea7420` — precisar resultados RLS y funciones.
- `f28d64acad38357c17eeb7b855e4922a7f7316eb` — crear auditoría de seguridad.
- `9a03c95c69289c89b4ca151378d0efe7ce04c650` — frontend espera confirmación de RLS antes de habilitar edición del director.
- `f6d6c3987448658fd9530f5fdf0b37d62da10e4a` — actualizar caché del frontend.

Los commits están en la rama `main`. Consultar el historial de GitHub para el detalle completo.

## 8. Qué falta para lanzar la versión oficial

No se propone una fase de pruebas de pago ni una rama Supabase de coste recurrente. Sí se mantienen comprobaciones mínimas sin coste adicional y sin datos reales de menores:

1. Revisar y corregir cualquier error estático de las migraciones preparadas.
2. Crear un backup lógico completo y verificar que se puede restaurar fuera de producción.
3. Probar con cuentas y clubes ficticios los permisos de propietario, segundo director, entrenador editor, entrenador viewer y usuario ajeno.
4. Comprobar los flujos de registro/login, alta y vinculación de equipo, convocatoria, acta, calendario y estadísticas.
5. Retirar los cargos de Silbatos de los flujos de alta para cumplir Fase 1.
6. Corregir los privilegios de cliente excesivos con mínimo privilegio.
7. Ejecutar migraciones aprobadas en producción con plan de rollback.
8. Verificar el dominio oficial y el despliegue final.

**No es seguro saltarse todos estos controles y publicar directamente.** Se puede evitar una rama de Supabase de pago, pero no se puede afirmar que una versión no probada está lista ni modificar la base real a ciegas.

## 9. Estado de despliegue

La consulta de contexto Vercel disponible no muestra proyectos Git vinculados al equipo accesible. No se ha creado ni promovido un despliegue. Por tanto, este informe no afirma que la web oficial esté actualizada o que el dominio esté sirviendo el último código.

Para confirmar el despliegue será necesario identificar el proyecto Vercel conectado al repositorio y verificar la última versión de producción y su dominio.

## 10. Decisiones acordadas que deben mantenerse

- No introducir cobros, planes ni suscripciones en Fase 1.
- Límite inicial de 12 equipos por club.
- Dos directores con permisos equivalentes de dirección, manteniendo identidades separadas.
- No convertir al director en entrenador por concederle permisos de gestión.
- No borrar ni alterar datos reales durante auditorías.
- No exponer datos personales de menores, contraseñas ni claves secretas.
- No aplicar migraciones, cambios de permisos o políticas de producción sin backup verificable, rollback y autorización expresa.
- Mantener IA, historial de jugadores entre categorías y deshacer cambios como trabajo posterior.

## 11. Próximas tareas priorizadas

| Prioridad | Tarea | Estado |
|---|---|---|
| P0 | Backup lógico completo y restauración comprobada | Pendiente |
| P0 | Validar permisos del segundo director y aislamiento entre clubes | Código preparado; pruebas pendientes |
| P0 | Retirar cobros de Silbatos de las altas | Pendiente |
| P0 | Corregir privilegios de cliente/TRUNCATE con mínimo privilegio | Diseño pendiente |
| P1 | Vincular el Prebenjamín existente sin duplicados | Pendiente de verificación |
| P1 | Confirmar límite de 12 equipos por club en backend y UI | Pendiente de verificación |
| P1 | Verificar registro de cambios anterior/nuevo y notificaciones agrupadas | Pendiente de verificación |
| P1 | Identificar proyecto Vercel y verificar dominio oficial | Bloqueado por falta de proyecto Git vinculado visible |
| P2 | Almacenamiento privado de actas escaneadas | Posterior |
| P2 | Avisos de IA | Posterior |
| P2 | Historial/identidad de jugadores entre categorías | Posterior |
| P2 | Deshacer cambios | Posterior |

---
**Última actualización:** 13/11/2026.  
**Estado de este informe:** documentación consolidada; no equivale a certificación de seguridad ni a aprobación de lanzamiento.
