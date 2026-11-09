# Banquillo — Auditoría de seguridad Beta (9 noviembre 2026)

**Estado:** auditoría inicial de solo lectura; ningún cambio aplicado a Supabase. No autoriza publicar datos reales de menores ni garantiza ausencia de vulnerabilidades.

## Alcance comprobado
- Proyecto Supabase `dsewztxveqgwhyuyyyoq`, esquema `public`, tablas, políticas RLS, privilegios de ejecución de funciones y restricciones de `docs`.
- Código de rama `feature/actas-sanciones-f11-ocr`, particularmente `js/cloud.js`, `js/store.js`, `schema.sql`.
- No se consultaron ni descargaron filas de jugadores, contraseñas o correos de usuarios.

## Hallazgos verificados

1. **RLS activo** en `docs`, `profiles`, `season_members`, `seasons_meta`, `join_attempts`.
2. `docs_select` consulta `is_member(season_id)`; `docs_insert`/`docs_update` consultan `can_edit(season_id)`; `docs_delete` impide eliminar directamente el documento raíz de temporada. `season_members` restringe lectura por membresía; `profiles` por `auth.uid()`.
3. Restricción `docs_path_ok` exige `split_part(path,'/',2)=season_id` y limita longitud. Previene rutas de temporada cruzadas en la misma fila.
4. `seasons_meta` y `join_attempts` tienen RLS sin políticas: bloqueo previsto para clientes ordinarios. Se accede a través de funciones internas. **No crear políticas abiertas para silenciar alertas.**
5. Funciones privilegiadas `handle_new_user()` y `rls_auto_enable()` permiten EXECUTE a `anon` y `authenticated`, aunque son funciones de trigger/event trigger y deben seguir funcionando por su mecanismo de disparo. **Prioridad alta:** preparar y probar revocación de EXECUTE a roles cliente sin afectar los triggers; verificar tras aplicación.
6. `spend_tokens`, `refund_tokens` y `refill_if_due` NO conceden EXECUTE a `anon`/`authenticated`, solo a rol de servicio. Bien.
7. Funciones RPC de membresía exigen `auth.uid()` o comprobaciones de dueño/miembro, según el cuerpo inspeccionado. No se han probado todavía los casos adversariales con sesiones reales de dos usuarios.
8. `handle_new_user` guarda el nombre de perfil a partir de metadatos introducidos por el usuario: se usa como nombre visible, no como autorización. La autorización no debe basarse en user_metadata.
9. El analizador Supabase avisa de **protección contra contraseñas filtradas desactivada**. Verificar disponibilidad por plan antes de proponer cambio.
10. El navegador emplea llave publicable Supabase y sesión persistente. **Pendiente:** revisión de protección de sesiones, expiración y flujos de recuperación; no sustituir bcrypt de Supabase por hashing casero.
11. **Datos de menores:** el acceso RLS no sustituye cifrado en reposo, copia de seguridad, minimización, información a familias y acuerdos entre club/plataforma. Evitar introducir historiales médicos detallados en campos de texto libre. Prohibir usar datos reales en demos públicas.

## Prioridades antes de producción
- [ ] **P0** Prueba dos usuarios y dos temporadas: miembro de A no ve ni modifica B; viewer no edita; editor no cambia permisos ni ve códigos de invitación del propietario; cuenta sin sesión no puede leer `docs`.
- [ ] **P0** Revisar privilegios de funciones `SECURITY DEFINER`/funciones de trigger y preparar migración de privilegios mínima. Probar sobre staging con copia restaurable.
- [ ] **P0** Verificar que endpoint Edge Function IA no reenvía datos personales de menores a proveedores externos sin autorización y documentación; redactar/especificar qué campos se envían y limitar datos.
- [ ] **P0** Asegurar copia de seguridad completa (incluidos Auth/configuración/storage/funciones) antes de cualquier cambio productivo.
- [ ] **P1** Protección de sesiones, validación de correo, recuperación de cuentas, rate limits, MFA donde proceda.
- [ ] **P1** Documentar responsabilidades RGPD, base jurídica, minimización, duración y borrado; revisión legal para datos de menores.
- [ ] **P1** Revisión XSS, CSP, dependencias de CDN, controles sobre exportaciones (PDF/Excel) y privacidad de logs.
- [ ] **P1** Pruebas de rendimiento/reconexión y navegación después de usar Excel.

## Propuesta de migración (NO ejecutada)
Evaluar en staging revocar EXECUTE a `PUBLIC`, `anon` y `authenticated` específicamente sobre funciones de trigger `public.handle_new_user()` y event trigger `public.rls_auto_enable()`, tras comprobar mecanismo y efectos. **No revocar indiscriminadamente todas las funciones**, porque varias forman parte de la API y RLS.

## Criterio de salida
Solo pasar a la versión oficial tras pruebas de roles y aislamiento documentadas, informe de seguridad revisado, copia de seguridad verificable, ausencia de fallos críticos y aprobación expresa.

## Avance de implementación del 9 de noviembre de 2026

- [x] Verificación SQL sin acceso a datos personales: como `anon`, `SELECT` sobre `docs` es rechazado por falta de privilegios; como `authenticated` sin usuario JWT, `SELECT COUNT(*)` devuelve cero filas visibles. **Esto no sustituye la prueba entre dos usuarios reales**.
- [x] Código Beta `js/views3.js`: el generador de informes ya no manda al proveedor IA nombre, dorsal, observaciones libres, motivos concretos de ausencia ni nombre del club. Los nombres se insertan localmente al recibir la respuesta. Estadísticas deportivas seudonimizadas siguen saliendo del dispositivo si se utiliza IA; revisar licitud y tratamiento antes de producción.
- [x] Código Beta `js/views3.js`: crónica de partido sin nombres de futbolistas, equipos ni notas libres.
- [x] Código Beta `js/cloud.js` + `js/auth.js`: consentimiento informado por sesión para el envío de estadísticas deportivas seudonimizadas al proveedor externo; se reinicia al cerrar sesión. No es consentimiento jurídico por sí solo.
- [x] Borrador de SQL de mínimos privilegios creado en `supabase/security/privilegios_internos_STAGING_NO_EJECUTAR.sql`. **No aplicado a producción**.
- [ ] Validación visual/manual en navegador de los informes IA, nombres insertados y modal de consentimiento.
- [ ] Pruebas RLS con dos cuentas/temporadas independientes en staging. No se han creado cuentas ni copiado datos de jugadores.
- [ ] Crear y verificar backup restaurable y staging antes de ejecutar borrador SQL.

**Prioridad de privacidad:** evite nombres completos y datos de salud de menores en notas de libre redacción; no enviar plantillas reales a la IA; no anunciar seguridad absoluta.

## Prueba manual adicional: aislamiento de interfaz

- **Prueba 14:** con una segunda cuenta de prueba, sin invitación a temporadas, el usuario confirmó que no aparecen temporadas ni jugadores de su cuenta principal. **Superada a nivel interfaz**. No demuestra por sí sola la imposibilidad de acceso vía API; se mantiene pendiente una prueba real cruzada de RLS y escritura entre dos usuarios y temporadas de prueba.

## Pruebas 14 y 15, y estabilidad de reconexión

- **Prueba 14:** segunda cuenta sin membresía no visualiza temporadas ni jugadores de primera cuenta (validación manual realizada por usuario).
- **Prueba 15:** temporada ficticia creada en segunda cuenta únicamente aparece en ella y no en la principal (validación manual realizada por usuario).
- **Pendiente:** prueba directa cruzada de acceso a datos vía API con sesión de cada cuenta y verificación de privilegios de escritura, con entorno y cuentas de prueba.
- **Cambio Beta** `js/cloud.js`: limpieza de temporizadores y escuchas `visibilitychange` cuando no quedan suscripciones; evitadas lecturas simultáneas por suscripción al recuperar foco. Comprobada sintaxis JS. Falta validar comportamiento real en navegador con varias sesiones/temporadas.

## Avance: acceso anónimo, contraseñas y cierre de sesión (noviembre 2026)

- [x] Supabase SQL, solo lectura: `anon` carece de `SELECT` sobre `public.docs` y `public.season_members` (false/false).
- [x] Supabase SQL, solo lectura: simulación de usuario autenticado inexistente mediante claim temporal devuelve 0 filas para `docs`, `season_members` y `profiles`. Esta prueba es parcial; faltan pruebas positivas y negativas cruzadas con dos usuarios de prueba reales.
- [x] `js/auth.js` en rama Beta: formularios de registro y recuperación requieren al menos 12 caracteres. Esta es una validación de interfaz, **no** una regla global impuesta por Auth. Revisar política de contraseñas del proyecto en Supabase antes de certificarla.
- [x] `js/auth.js`: `signOut({scope: "global"})` con gestión de error. Ya no afirma que se cerró la sesión si la operación falla; pendiente prueba en navegador y comprobación de duración JWT. Los access tokens existentes pueden seguir válidos hasta expirar.
- [ ] Supabase SQL: `docs_guard`, `handle_new_user` y `rls_auto_enable` siguen concediendo EXECUTE a `anon` y `authenticated`. SQL corrector solo preparado, no aplicado. **No ejecutar sin staging y backup restaurable**.
- [ ] Revisar en dashboard Auth los ajustes de confirmación de correo, mínimo de contraseña, MFA y protección contra contraseñas filtradas según plan.
- [ ] Probar en navegador: crear cuenta nueva con contraseña inferior a 12 caracteres (debe bloquearse antes de enviar), recuperación de contraseña y cerrar sesión con conexión normal/desconectada.
