# Copias de seguridad y recuperación — Banquillo

**Estado actual:** existe un proyecto independiente `Banquillo-Staging` con esquema aplicado, sin cuentas ni documentos. **No está certificada una restauración íntegra de datos de producción.**

## Alcance de las copias
- Esquema SQL y migraciones de PostgreSQL, incluidas funciones, políticas RLS y triggers.
- Datos de aplicación `docs`, `seasons_meta`, `season_members`, `profiles` y elementos internos necesarios para restaurar el comportamiento; evaluar dependencias de `auth.users` de Supabase Auth y extensiones.
- Configuración de autenticación, URL de redirección y opciones de CAPTCHA: guardar un inventario de configuración, no secrets en el repositorio.
- Funciones Edge y recursos asociados, en su caso, y versiones del frontend.

**No confundir** exportación Excel de una temporada (útil para el entrenador) con una copia completa recuperable de la base de datos, identidades y configuraciones.

## Controles previos
1. Separar credenciales y proyecto de backup/restore, con el mínimo privilegio necesario.
2. Nunca pegar URL de base de datos con contraseña, access tokens, JWT ni `service_role` en chat, commits, capturas o logs compartidos.
3. Preferir los mecanismos oficiales de Supabase y revisar sus límites según el plan: https://supabase.com/docs/guides/platform/backups
4. No asumir que el plan gratuito incluye descargas de backups administrados. Verificar disponibilidad actual en el panel del proyecto.
5. Para producir archivos locales, guardarlos **fuera** del repositorio, en almacenamiento cifrado con acceso limitado; registrar fecha, entorno, tamaño y suma de comprobación (SHA-256) sin publicar los archivos.
6. No utilizar datos de jugadores reales para ensayos o demostraciones.

## Prueba de recuperación requerida antes del lanzamiento
- Crear un dataset **ficticio** reproducible en staging con dos usuarios, dos temporadas y roles `owner`, `editor`, `viewer`.
- Realizar una copia de ese dataset con una herramienta soportada y credenciales gestionadas de forma segura.
- Restaurar en un **tercer entorno temporal aislado**, nunca sobre la producción. Este tercer entorno puede generar coste y requerirá autorización.
- Comprobar: usuarios / métodos de autenticación, documentos, códigos, roles, recuentos, integridad referencial, permisos RLS, autenticación, consultas y borrado.
- Registrar duración observada, pasos para volver atrás y evidencia sin datos sensibles.
- Probar una segunda recuperación con fallos simulados controlados; no lanzar pruebas destructivas en producción.

## Recuperación ante incidentes
1. Suspender temporalmente las operaciones sensibles si hay indicios reales de acceso indebido.
2. Identificar el alcance temporal y conservar evidencias de forma proporcional y protegida.
3. Preparar un proyecto de restauración separado y comprobar su funcionamiento antes de cambiar tráfico.
4. Rotar secretos potencialmente comprometidos mediante la consola del proveedor y actualizar aplicaciones, sin exponerlos.
5. Seguir el procedimiento de incidentes y obligaciones legales aplicables.
6. No prometer recuperación ni tiempos concretos hasta realizar la prueba real y acordar una frecuencia de copias.

## Criterios de finalización
- [x] Esquema de staging instalado y comprobado.
- [x] Aislamiento y controles RLS básicos verificados.
- [x] Procedimiento documentado.
- [ ] Copia real de staging ficticio generada.
- [ ] Restauración comprobada de staging a tercer entorno autorizado.
- [ ] Política de retención, cifrado y frecuencia aprobada.
- [ ] Plan de copia/recuperación para producción probado.

**Esta guía no implica que las copias de seguridad de producción estén activas o restauradas.**
