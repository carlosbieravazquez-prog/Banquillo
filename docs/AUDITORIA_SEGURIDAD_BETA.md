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

## Endurecimiento de sesiones (9 noviembre 2026)

- [x] `js/store.js`: identificador de generación `epoch` para descartar resultados de lecturas de permisos, carga de temporadas y escrituras pendientes pertenecientes a sesiones anteriores.
- [x] `js/auth.js`: no reanudar el renderizado de una sesión que ya ha cerrado o ha cambiado de identidad; controla fallos de inicialización sin mostrar información previa.
- [x] `js/cloud.js`: impide que una respuesta tardía de `my_profile` reponga datos del perfil de una cuenta después del cierre/cambio de sesión.
- [x] `tests/session-safety.test.cjs`: pruebas automáticas locales de carreras de acceso a roles y de la cola de guardado. Se ejecutaron comprobaciones equivalentes sobre el `Store` real en un motor JavaScript aislado: roles antiguos descartados, nueva cola preservada y guardado completado (3/3).
- [ ] **Prueba de navegador pendiente:** alternar inicio/cierre de sesión y cambio entre pestañas mientras las consultas cargan. Un guardado ya enviado antes del cierre puede completarse en el servidor; el cambio evita aplicarlo localmente a la sesión siguiente, no revoca una petición HTTP ya enviada.
- [ ] **Prueba con dos cuentas:** comprobar restricciones de escritura de `viewer`, `editor` y `owner` mediante API y RLS sin datos de menores.
- [ ] **Staging + restauración:** preparar entorno aislado y copia recuperable antes de ejecutar ajustes DDL en producción.

## Resultado de prueba manual de cambio de sesión

- **Confirmado por el usuario:** tras actualizar la Beta, iniciar sesión con una cuenta de prueba, salir y entrar con otra cuenta, la aplicación funciona correctamente. Se registra como **prueba manual superada** según su confirmación. Esto no certifica por sí solo la revocación inmediata de JWT ni sustituye pruebas de seguridad vía API.

## Prueba 17 — permiso de solo lectura

- **Resultado informado por usuario: superada.** Cuenta principal invitada a la temporada ficticia SEGURIDAD TEST 2026 con rol Solo lectura: puede consultar jugadores, pero no modificarlos desde la interfaz.
- **Alcance:** confirma controles visibles de edición. Sigue pendiente verificar rechazo de escritura directamente en API por RLS y que un editor no pueda cambiar roles ni hacerse propietario.

## Prueba 18 y auditoría SQL de aislamiento (9 noviembre 2026)

- **Prueba 18:** el usuario aclaró que el comportamiento del rol Entrenador es correcto (puede editar jugadores y no administrar permisos). Registrar como **superada**. No hubo fallo confirmado y no se ha realizado corrección innecesaria.
- En Supabase constan dos temporadas, tres membresías y dos usuarios (solo **recuentos**, sin consultar datos personales); uno pertenece a una temporada y otro a dos.
- Al buscar el documento raíz con nombre exacto `SEGURIDAD TEST 2026` se obtuvieron **cero coincidencias**. No asumir que el nombre visible en navegador corresponde exactamente a los metadatos de esta base; verificar antes de borrar o modificar un entorno de pruebas.
- **Prueba RLS directa con usuario que solo pertenece a una temporada**, usando transacción `READ ONLY`, `SET LOCAL ROLE authenticated` y claim temporal: `is_member` propia = true; 21 documentos propios visibles; `is_member` ajena = false; `can_edit` ajena = false; 0 documentos ajenos visibles. **Superada para lectura y comprobación de autorización**; sin seleccionar documentos ni identificadores.
- En el otro caso comprobado, una identidad con rol editor pertenece a las dos temporadas; por eso ambas son legibles legítimamente y ese caso no sirve para una prueba de aislamiento.
- [x] SQL de prueba reproducible en `supabase/security/test_rls_aislamiento_SOLO_LECTURA.sql`.
- [ ] Falta una prueba real del rechazo de escrituras `INSERT`/`UPDATE`/`DELETE` como usuario no autorizado. No ejecutar DML sobre producción sin staging y reversión segura.
- [ ] Falta probar usuario viewer (actualmente 0 membresías con rol viewer en esta base).
- Los Security Advisors siguen indicando `anon_security_definer_function_executable` (dos funciones internas) y otras advertencias; el borrador de corrección sigue **sin aplicarse**. No revocar funciones RPC legítimas indiscriminadamente.

## Preparación sin participación del usuario

- [x] Protocolo de staging y matriz de permisos por rol en `docs/PROTOCOLO_PRUEBAS_RLS_STAGING.md`.
- [x] Ocho comprobaciones estructurales ejecutadas en proyecto Supabase conectado: **8/8 true** (RLS, prohibiciones de lectura pública, ejecución de funciones de Silbatos y políticas sobre documentos y perfiles).
- [x] SQL `supabase/security/check_baseline_SOLO_LECTURA.sql` incorporado para repetir la comprobación sin leer datos personales.
- [ ] Sin entorno staging separado ni restauración comprobada: no se aplicaron cambios DDL ni pruebas de escritura sobre producción.

## Protección contra fuerza bruta y automatizaciones de inicio de sesión (10 noviembre 2026)

**Requisito solicitado:** reducir intentos automatizados de adivinar contraseñas, abuso de registro y restablecimiento, sin bloquear permanentemente a usuarios legítimos.

- [x] Supabase Auth cuenta con controles propios de límites de peticiones; **no se ha verificado la configuración exacta actual del proyecto**. Revisar en [Auth Rate Limits](https://supabase.com/dashboard/project/dsewztxveqgwhyuyyyoq/auth/rate-limits).
- [x] Interfaz Beta: se reconocen respuestas de límite de intentos, HTTP 429 y error `captcha_failed` mostrando un aviso claro. **Esto no impide ataques por sí solo**: el límite debe funcionar en el servidor.
- [ ] **P0 antes del lanzamiento:** configurar y comprobar límites adecuados de Auth, sin hacer pruebas de carga contra cuentas reales. Verificar la resistencia a intentos distribuidos en staging y revisar registros/alertas con criterios de privacidad.
- [ ] **P0:** habilitar protección CAPTCHA (preferible Cloudflare Turnstile o hCaptcha) para login, registro y restablecimiento mediante [Supabase Bot and Abuse Protection](https://supabase.com/dashboard/project/dsewztxveqgwhyuyyyoq/auth/protection). Configurar la clave **secreta exclusivamente en Supabase**, nunca en GitHub o en JavaScript público, y la clave de sitio pública con su correspondiente widget y `captchaToken` en los tres flujos. NO habilitar CAPTCHA en el servidor sin desplegar antes la integración del cliente: bloquearía el acceso.
- [ ] Comprobar confirmación del correo, contraseñas robustas desde Auth, MFA para administradores y, cuando corresponda, usuarios, y detección de credenciales filtradas según el plan.
- [ ] Preparar pruebas de staging de cinco escenarios: intentos repetidos, recuperaciones reiteradas, captcha inválido/expirado, usuario legítimo después de esperar y recuperación de cuenta. No compartir contraseñas ni registrar tokens.
- [ ] Revisar mensajes para evitar enumeración de cuentas y reducir filtraciones en registros; no bloquear masivamente por IP compartida, especialmente en clubes y colegios.

**Documentación:** https://supabase.com/docs/guides/deployment/going-into-prod y https://supabase.com/docs/guides/auth/auth-captcha .

## Integración opcional de Cloudflare Turnstile (10 noviembre 2026)

- [x] Componente `js/auth-captcha.js` cargado antes de `js/auth.js`; solo descarga script externo al configurar una **clave pública de sitio**.
- [x] `config.js`: `TURNSTILE_SITE_KEY` vacía por defecto; la Beta y la web oficial continúan sin CAPTCHA activo hasta configuración explícita.
- [x] `js/auth.js`: campos de login, registro y recuperación muestran el desafío al habilitar la clave; obligan a obtener token y lo envían a Supabase Auth como `captchaToken`. Sin clave configurada, mantienen el flujo anterior.
- [x] Nueva guía `docs/ACTIVACION_TURNSTILE_BETA.md` explica configuración por etapas, staging, pruebas y reversión sin bloquear usuarios.
- [x] Prueba automatizable `tests/auth-captcha.test.cjs` para regresiones del modo desactivado y del modo con sitekey. Comprobada sintaxis JS y tres puntos de integración; **no se ha probado el widget real de Cloudflare en un navegador**.
- [ ] **Pendiente P0:** clave pública de prueba, widget en staging, configuración secreta de Supabase en staging y prueba de acceso de los tres formularios, incluido móvil.
- [ ] **Pendiente P0:** límites de tasa de Auth del proyecto y protección real del servidor. El control visual por sí solo no bloquea intentos fuera del navegador.
- [ ] No activar el CAPTCHA en producción hasta haber desplegado una versión compatible y validado su funcionamiento.

## Preparación de activación Turnstile (10 noviembre 2026)

- Conector Supabase: una sola organización visible (**Banquillo**), un proyecto existente, ninguna rama de base de datos de pruebas. No se ha creado un proyecto nuevo: falta elegir explícitamente organización y revisar su coste.
- [x] Corregido problema de recuperación de red al descargar el script externo: en caso de error se elimina el script fallido y puede reintentarse, manteniendo bloqueado el envío si la clave de sitio está configurada pero falta desafío.
- [x] Ampliadas las pruebas de regresión de `tests/auth-captcha.test.cjs`: creación única del widget, verificación de token solo mientras está montado y reintento de carga.
- [x] Cinco comprobaciones funcionales equivalentes ejecutadas sobre `js/auth-captcha.js`: modo desactivado, creación única, token entregado, rechazo si desconectado y recuperación del error de red.
- [ ] Próximo paso: acordar la organización del proyecto staging y revisar cualquier coste antes de crearlo. No incorporar datos reales ni habilitar CAPTCHA en el Supabase principal durante estas pruebas.
- [ ] Se necesita una **sitekey pública** de Cloudflare Turnstile para ese entorno. La clave secreta se configura en el panel de Supabase; nunca pedirla por chat ni subirla al repositorio.

## Staging independiente creado (10 noviembre 2026)

- [x] Supabase creado en organización Banquillo, nombre `Banquillo-Staging`, proyecto `opfujvhgqrweyaaqquif`, región `eu-central-1`. Coste informado y aprobado: **0 USD/mes**, sujeto a los límites del plan y posibles cambios futuros.
- [x] Se aplicó el esquema original `schema.sql` del repositorio **solo al proyecto staging**, mediante migración `banquillo_staging_initial_schema`. Producción no recibió ninguna migración.
- [x] Consultas de verificación del staging: 5 tablas principales presentes, RLS activada en todas, privilegio SELECT de `anon` sobre `docs` no concedido.
- [x] Staging inicialmente sin usuarios de Auth ni documentos; se ha comprobado que permanecen en 0 tras la migración. No se han copiado datos de menores ni usuarios reales.
- [ ] Preparar un frontend Beta que apunte **exclusivamente a staging** y no a producción, con una clave pública de staging. Verificar la URL y mostrar distintivo de pruebas antes de cualquier alta de cuenta.
- [ ] Crear las cuentas y temporadas ficticias para probar RLS, escritura, recuperación y CAPTCHA.
- [ ] Configurar sitekey pública de Turnstile para staging, comprobar los tres formularios y solo entonces activar validación CAPTCHA en Supabase staging.
- [ ] Verificar procedimientos de copia restaurable y recuperación antes de aplicar ajustes a la base oficial.

## Staging frontend aislado y pruebas de funciones internas (10 noviembre 2026)

- [x] Nuevo `staging.html` en la rama Beta: marcador visual «PRUEBAS · DATOS FICTICIOS», metadatos `noindex`, y carga exclusiva de `config.staging.js`.
- [x] `config.staging.js` usa la URL y **clave pública** del proyecto `opfujvhgqrweyaaqquif`, nunca la clave de producción. `TURNSTILE_SITE_KEY` permanece vacía, por lo que CAPTCHA aún no está activo.
- [x] `js/staging-guard.js`: invalida la configuración si el frontend staging apunta a otro proyecto; la clave `service_role` no se usa ni se almacena en el navegador.
- [x] CSP de Beta y staging incluye `script-src` y `frame-src` para `https://challenges.cloudflare.com`, exigidos por Turnstile; se mantiene la restricción de scripts inline.
- [x] `tests/staging-isolation.test.cjs`: pruebas reproducibles de aislamiento, CSP, noindex, guard y orden de carga. Nueve comprobaciones de estructura y comportamiento equivalentes ejecutadas con éxito. No sustituyen una prueba de navegador.
- [x] En **staging únicamente**, migración `staging_restrict_internal_trigger_functions`: revocado permiso EXECUTE directo de las funciones `handle_new_user()` y `docs_guard()` para `PUBLIC`, `anon` y `authenticated`. Verificado `false` para ambos roles en ambas funciones; sus dos triggers continúan registrados. Queda verificar registro y guardado efectivos con cuentas ficticias antes de promover a producción.
- [ ] Configurar URL de redirección en Supabase staging para `http://127.0.0.1:5500/staging.html` durante pruebas locales, sin afectar el proyecto oficial.
- [ ] Probar inicio de sesión/registro con cuentas ficticias, Turnstile con sitekey y validación de Supabase staging, y escenarios negativos de escritura.
- [ ] GitHub ↔ Supabase: la conexión automática es **opcional**; no activar despliegues de migraciones desde `main` sin revisión del esquema y aprobación explícita.
- [ ] AWS: no necesario por ahora para el frontend estático; revisar solo cuando exista demanda de servicios concretos y presupuesto.

## Ejecución inicial de pruebas en staging (10 noviembre 2026)

- [x] Prueba SQL negativa `anon`: `SELECT public.docs` rechazado expresamente con error SQLSTATE `42501` de privilegios. **Superada**.
- [x] Prueba SQL negativa `authenticated` con UID ficticio sin membresías: recuentos visibles `docs=0`, `season_members=0` y funciones `is_member=false`, `can_edit=false`, `is_owner=false`. **Superada para este caso**, sin acceder a datos.
- [x] Intento SQL de `INSERT` con UID ficticio no autorizado en `public.docs`: rechazado por política RLS, SQLSTATE `42501`; la transacción no guardó el documento. **Superada para inserción no autorizada sin membresía**.
- [x] Procedimiento ordenado con comandos PowerShell, redirecciones de Auth, datos ficticios, roles, CAPTCHA y criterios de publicación en `docs/EJECUCION_STAGING_PASO_A_PASO.md`.
- [ ] Comprobación visual del frontend local: desde conector remoto no se puede acceder a `127.0.0.1` del ordenador del usuario; se requiere prueba manual.
- [ ] Configurar `Site URL` y `Redirect URLs` de **staging** desde el dashboard. El conector disponible no proporciona una operación específica para cambiar esos ajustes.
- [ ] Crear usuarios ficticios por el flujo normal de Auth y verificar `handle_new_user()` tras revocar su EXECUTE directo. **No escribir manualmente cuentas en `auth.users`** para sustituir una prueba real.
- [ ] Pruebas positivas de lector, editor, propietario y negativas de actualización/eliminación sobre documentos ficticios de staging con sesiones reales.
- [ ] Configurar Turnstile en Cloudflare y Supabase-Staging; no se ha habilitado la verificación del servidor aún.

## Trabajo realizado desde el instituto sin acceso al PC local (10 noviembre 2026)

- [x] Workflow `.github/workflows/beta-security.yml` añadido en rama Beta. Disparadores: push a `feature/actas-sanciones-f11-ocr`, PR a `main` y ejecución manual. Comprobará sintaxis JS y ejecutará `node --test tests/*.test.cjs`; requiere GitHub Actions habilitado. **No afirmar ejecución verde hasta revisar el resultado real de Actions.**
- [x] Corregidos dos escapes de salto de línea en `tests/auth-captcha.test.cjs` que habrían impedido evaluar el componente con `vm`.
- [x] CSP ampliada en `index.html` y `staging.html` con `https://challenges.cloudflare.com` en `connect-src` además de `script-src` y `frame-src`.
- [x] Supabase-Staging: consulta `anon` de tabla de documentos rechazada; identidad ficticia sin membresías no puede consultar ni editar; intento de inserción sin permiso rechazado. No se copiaron datos reales.
- [x] Security Advisors de staging revisados: `rls_enabled_no_policy` sobre tablas privadas `seasons_meta` y `join_attempts` (intencional), y avisos sobre funciones `SECURITY DEFINER` accesibles a autenticados que requieren análisis de autorización individual. No revocar RPC usadas por la app sin verificar.
- [ ] Falta constatar resultado del workflow en GitHub Actions, completar pruebas de navegador y configurar URL de Auth en staging desde el Dashboard.
- [ ] Falta registrar cuentas ficticias, prueba de inserción positiva con `owner`/`editor`, rechazo de cambios como `viewer`, Turnstile activo en staging, recuperación de cuentas y respaldo restaurable.
