# Validación de Supabase de la candidata

Se reconstruyó el esquema funcional a partir de 31 scripts SQL del repositorio en PostgreSQL local mediante PGlite. La base se creó en memoria con cuatro cuentas ficticias. El esquema de Auth de la prueba simula el identificador de sesión. Se omitió un script histórico de mantenimiento propio del servicio gestionado que depende de un trigger no versionado.

## Resultado

- Ambos directores pueden consultar y escribir el acta con las políticas reales del repositorio tras aplicar la propuesta de permisos. La cuenta ajena queda excluida. Al expulsar al segundo director pierde lectura y escritura.
- Los códigos de director vencen, los códigos rotados dejan de valer y el código de director consumido no se reutiliza. El entrenador queda pendiente hasta que Dirección Deportiva lo aprueba.
- El aviso de acta llega al entrenador autorizado, se puede marcar leído y se resuelve al guardar el acta. La cuenta ajena no lo ve. Se comprobó el guardado de la convocatoria y el cierre de temporada por el titular. Tras el cierre se rechazan nuevas incorporaciones.
- Se retiraron localmente los permisos de tabla innecesarios de las cinco tablas identificadas. El flujo anterior siguió funcionando. En producción los catálogos confirmaron que el permiso TRUNCATE sigue concedido.

## Aprobación de publicación

Los dos cambios de base de datos quedan preparados para la ventana de publicación. Aplicar, con respaldo y tras verificar el entorno de destino, primero `supabase/permisos_directores_edicion_temporadas_20261113.sql` y después `supabase/privilegios_cliente_candidata.sql`. Comprobar permisos efectivos y ejecutar una prueba de humo.

Queda pendiente verificar los componentes gestionados de Supabase con cuentas de prueba, en particular el inicio de sesión real, la entrega de correo y la actualización de mensajes en el navegador. También queda pendiente la revisión de privilegios por defecto y de los avisos más amplios del asesor. Esta prueba cubre el esquema del repositorio y las operaciones SQL de la aplicación.

Reproducir con `node tests/club-flows.database.cjs` y `@electric-sql/pglite@0.3.15`. En esta revisión, todas las consultas a producción fueron de catálogo y solo lectura.
