# Auditoría de seguridad Supabase — 13/11/2026

Proyecto revisado: `dsewztxveqgwhyuyyyoq`  
Repositorio: `carlosbieravazquez-prog/Banquillo`  
Alcance: inspección de solo lectura de esquema, políticas RLS, privilegios y funciones. No se modificaron datos ni configuración de producción durante esta auditoría.

## Resumen ejecutivo

- Las seis tablas que el Security Advisor señala como «RLS enabled, no policy» tienen RLS activado, ninguna política y ningún privilegio directo concedido a `anon`, `authenticated` o `PUBLIC` en `information_schema.role_table_grants`: `banquillo_club_codes`, `banquillo_management_charges`, `banquillo_management_wallet`, `banquillo_team_codes`, `join_attempts` y `seasons_meta`.
- Por tanto, esos seis avisos no demuestran exposición directa por PostgREST. La ausencia de grants directos parece coherente con un diseño donde las tablas se gestionan mediante RPC SECURITY DEFINER controladas. Debe mantenerse así salvo que se diseñen políticas explícitas y se justifique acceso directo.
- Las políticas de `docs` separan lectura y escritura: `docs_select` exige `is_member(season_id)`; INSERT/UPDATE/DELETE exigen `can_edit(season_id)` (DELETE también impide borrar la raíz `seasons/<id>`). La migración de permisos de dirección amplía únicamente `can_edit` para directores del club asociado a un equipo activo.
- Se inventariaron 53 funciones SECURITY DEFINER (43 advertencias de Advisor en la ejecución previa). Todas las funciones inventariadas tienen `search_path` fijado a cadena vacía, salvo `rls_auto_enable`, que lo fija a `pg_catalog`. Esto es una defensa importante contra la suplantación de objetos por el search_path, pero no sustituye la revisión de autorización de cada función.
- Las funciones SECURITY DEFINER de tipo trigger/helper que no usan `auth.uid()` no tienen EXECUTE concedido a `anon` ni `authenticated` en la inspección. Las RPC antiguas expuestas sin una referencia directa a `auth.uid()` revisan titularidad mediante `public.is_owner(sid)` antes de cambiar datos o revelar códigos.
- El Security Advisor informa de que la protección frente a contraseñas filtradas está desactivada. No se cambió la configuración Auth desde esta auditoría.

## Seis tablas sin políticas directas

| Tabla | RLS | Políticas | Grants directos anon/authenticated/PUBLIC |
|---|---:|---:|---:|
| banquillo_club_codes | Sí | Ninguna | Ninguno |
| banquillo_management_charges | Sí | Ninguna | Ninguno |
| banquillo_management_wallet | Sí | Ninguna | Ninguno |
| banquillo_team_codes | Sí | Ninguna | Ninguno |
| join_attempts | Sí | Ninguna | Ninguno |
| seasons_meta | Sí | Ninguna | Ninguno |

No crear políticas `USING (true)` ni grants generales para silenciar el aviso. Los códigos de invitación, intentos de acceso, saldo y cargos de gestión y metadatos de temporadas son datos especialmente sensibles para la lógica de autorización.

## Políticas de documentos y temporadas

- `docs_select`: lectura solo para miembros de la temporada (`is_member`).
- `docs_insert`: escritura solo cuando `can_edit` devuelve true.
- `docs_update`: tanto USING como WITH CHECK exigen `can_edit`.
- `docs_delete`: exige `can_edit` y prohíbe eliminar la raíz de la temporada.
- `season_members`: la lectura se limita a miembros de la temporada.
- `banquillo_club_directors`: cada director puede leer su propio registro; la información ampliada se entrega mediante RPC de roster.
- `banquillo_teams`: lectura, inserción y actualización se limitan al propietario/directores del club.

## Funciones SECURITY DEFINER

El aviso de Supabase es deliberadamente conservador: informa de toda función SECURITY DEFINER ejecutable por usuarios autenticados, aunque su cuerpo aplique comprobaciones. No revocar EXECUTE de forma masiva: rompería los flujos de alta, códigos, actas, calendarios, gestión de cuentas y saldos.

Comprobaciones realizadas:
1. Inventario de funciones y argumentos.
2. Revisión de `proconfig`: todas las funciones inventariadas fijan un search_path seguro (`''` o `pg_catalog`).
3. Comprobación de EXECUTE para `anon` y `authenticated` en helpers internos.
4. Revisión de funciones antiguas expuestas `regenerate_join_code`, `remove_member`, `season_share`, `set_code_enabled` y `set_member_role`: comprueban `public.is_owner(sid)`; varias bloquean expresamente las temporadas gestionadas desde Dirección Deportiva para evitar rutas de administración antiguas.

Pendiente: auditoría manual función por función de los argumentos, control de filas afectadas, validación de estados y efectos laterales; test de autorización con cuentas de prueba. El inventario y el search_path no equivalen a una auditoría formal de seguridad.

## Protección de contraseñas filtradas

Estado observado por Security Advisor: desactivada.

La documentación actual de Supabase indica que esta opción utiliza Pwned Passwords de HaveIBeenPwned y está disponible en Pro y superiores. Para habilitarla, si el plan del proyecto lo permite: Dashboard → Authentication → Settings (Auth settings) → Password security → Prevent use of leaked passwords. Mantener longitud mínima de 8 caracteres como mínimo; valorar mayor longitud y requisitos razonables sin dificultar innecesariamente el acceso. No se ha cambiado porque no hay una acción de configuración Auth disponible en la conexión actual.

Referencia oficial: https://supabase.com/docs/guides/auth/password-security

## Migración de permisos de directores — pendiente de despliegue

Archivo: `supabase/permisos_directores_edicion_temporadas_20261113.sql`

La migración redefine `can_edit(text)` para conservar owner/editor y reconocer al propietario/director del club cuando la temporada pertenece a un equipo no archivado y el club no está eliminado. La pertenencia de director sigue siendo `viewer`; la autorización de escritura se deriva de la relación de dirección, no de convertirlo en entrenador/editor.

Estado: preparada y versionada en GitHub, **no aplicada a producción**. La UI consulta la RPC `can_edit(sid)` y se mantiene en solo lectura si la RPC falla o devuelve false.

## Plan de pruebas previo a producción

1. Crear/restaurar una base aislada. No existe ahora una rama de desarrollo de Supabase; crear una puede generar coste y requiere aprobación del usuario.
2. Usar cuentas ficticias distintas: propietario del club A, segundo director A, entrenador editor A, entrenador viewer A y usuario de club B.
3. Verificar lectura de documentos para miembros autorizados y denegación para cuentas ajenas.
4. Verificar escritura del propietario y segundo director solo en temporadas vinculadas a equipos activos de A.
5. Verificar que el entrenador editor conserva sus permisos y el viewer no obtiene escritura.
6. Verificar que el director A no escribe en el club B, temporadas independientes, equipos archivados ni clubes eliminados.
7. Verificar que expulsar o retirar al segundo director revoca la edición al refrescar sesión/contexto.
8. Ejecutar pruebas negativas de las RPC antiguas y revisar que los intentos no autorizados no cambian filas.
9. Aplicar migración solo en la rama aislada, volver a ejecutar Security Advisor y las pruebas de regresión.
10. Antes de producción: backup restaurable comprobado, plan de rollback y autorización expresa.

## Límites y decisiones

- No se ha demostrado una intrusión ni una fuga de datos.
- No se han concedido grants ni añadido políticas genéricas a las seis tablas.
- No se han revocado permisos de funciones en bloque.
- No se ha activado ni desactivado RLS adicional.
- No se ha aplicado la migración de directores a producción.
- No se ha confirmado una restauración de backup ni se ha creado una rama Supabase, para evitar costes o cambios no autorizados.
