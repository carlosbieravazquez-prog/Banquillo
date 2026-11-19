# Validación de Supabase de la candidata

Se reconstruyó el esquema funcional a partir de 31 scripts SQL del repositorio en PostgreSQL local mediante PGlite. La base se creó en memoria con cuatro cuentas ficticias. El esquema de Auth de la prueba simula el identificador de sesión. Se omitió un script histórico de mantenimiento propio del servicio gestionado que depende de un trigger no versionado.

## Resultado

- Ambos directores pueden consultar y escribir el acta con las políticas reales del repositorio tras aplicar la propuesta de permisos. La cuenta ajena queda excluida. Al expulsar al segundo director pierde lectura y escritura.
- Los códigos de director vencen, los códigos rotados dejan de valer y el código de director consumido no se reutiliza. El entrenador queda pendiente hasta que Dirección Deportiva lo aprueba.
- El aviso de acta llega al entrenador autorizado, se puede marcar leído y se resuelve al guardar el acta. La cuenta ajena no lo ve. Se comprobó el guardado de la convocatoria y el cierre de temporada por el titular. Tras el cierre se rechazan nuevas incorporaciones.
- Se retiraron localmente los permisos de tabla innecesarios de las cinco tablas identificadas. El flujo anterior siguió funcionando. En producción los catálogos confirmaron que el permiso TRUNCATE sigue concedido.

## Aprobación de publicación

Los dos cambios de base de datos quedan preparados para la ventana de publicación. Aplicar, con respaldo y tras verificar el entorno de destino, primero `supabase/permisos_directores_edicion_temporadas_20261113.sql` y después `supabase/privilegios_cliente_candidata.sql`. Comprobar permisos efectivos y ejecutar una prueba de humo.

En Banquillo-Staging se verificó que el entorno estaba vacío antes de cargar el esquema de la candidata. Se mantuvieron las tablas del esquema antiguo. Se crearon tres cuentas ficticias y se comprobó el inicio de sesión contra Supabase Auth. Se creó un club y un equipo de prueba, se solicitó acceso con código y se aprobó al entrenador desde Dirección Deportiva. En Chromium móvil, el entrenador inició sesión desde la interfaz, recibió el aviso sin recargar, lo marcó como leído y se verificó en Supabase que una cuenta ajena no podía leerlo. Las cuentas de prueba se prepararon ya confirmadas para aislar la prueba de inicio de sesión.

Brevo quedó conectado a Banquillo-Staging. Tras corregir el usuario SMTP, la solicitud de registro devolvió HTTP 200 y Supabase registró el envío. Queda comprobar la recepción y la confirmación mediante el enlace. La recuperación de contraseña queda pendiente de una prueba de entrega y apertura del formulario.

Reproducir con `node tests/club-flows.database.cjs` y `@electric-sql/pglite@0.3.15`. En esta revisión las escrituras se limitaron a Banquillo-Staging. Todas las consultas a producción fueron de catálogo y solo lectura.
