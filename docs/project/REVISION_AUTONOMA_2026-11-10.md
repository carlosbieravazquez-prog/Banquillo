# Revisión autónoma de Banquillo Beta — 10 noviembre 2026
**Ámbito:** GitHub `feature/actas-sanciones-f11-ocr`, Supabase `Banquillo-Staging` (`opfujvhgqrweyaaqquif`).
**NO** se ha hecho merge ni desplegado código en la web oficial (`main`).

## 1. Errores corregidos
- Las estadísticas de apariciones, goles, minutos y porterías a cero dejan de contar partidos futuros o incompletos; las convocatorias confirmadas sí siguen contabilizándose.
- La cuenta de goles en propia puerta usa los mismos requisitos de partido disputado.
- Se reforzaron las validaciones de importación Excel (temporada, jornada, convocatoria, roles y actas cerradas) en cambios anteriores.

## 2. Convocatorias y estadísticas
- Disponible `js/convocatoria-message.js`: generador LOCAL de mensajes semanales por jornada con rival, fecha, hora, local/visitante, primera o segunda equipación.
- Acceso desde la pestaña Convocatoria → **Preparar mensaje**, cambiar entre convocados y no convocados con motivo (DT, LS, MP, SA).
- El sistema no manda nombres a un proveedor externo y no envía mensajes automáticamente: el usuario revisa y copia voluntariamente para compartir.
- Un lector autorizado puede copiar sin editar la convocatoria.

## 3. Clubes y directores deportivos
- `js/club-planner.js` incluye calendario, validación de fechas, horas y campos realmente disponibles y detección de solapamientos por instalación **y por equipo**, también en partidos visitantes.
- Compatibilidad F11 completo / dos mitades F7; no se permiten mitades de instalaciones no divisibles.
- `demo-club.html` utiliza el mismo validador para asignar y publicar partidos.
- Se añadió opción de escudo del club en la configuración de la demo y avisos semanales y mensuales para copiar.
- **Limitación explícita:** la demo de clubes sigue siendo local y ficticia; no está conectada a las cuentas Supabase ni implementa permisos de dirección deportiva reales multiusuario. NO se puede considerar el módulo de clubes completamente terminado.

## 4. Informes y documentos
- Dorsales más grandes, escudo opcional y mejoras PDF previamente implementadas.
- El escudo PNG también se incorpora ahora a las cabeceras de los **Excel de temporada**, con degradación controlada si no existe o falla la imagen.
- Los informes individuales y actas siguen requiriendo verificación visual y de descargas reales en un navegador.

## 5. Pruebas
- `tests/club-planner.test.cjs`: F7/F11, campos divisibles, choques de horarios/equipos, fechas inválidas.
- `tests/club-demo-integration.test.cjs`: integración de demo, directores, mensajes y escudo.
- `tests/convocatoria-message.test.cjs`: variantes de mensajes, exclusiones, privacidad de nombres y motivos.
- `tests/sports-calculations.test.cjs`: nuevos casos de partidos futuros y marcador incompleto.
- `tests/export-and-db-integrity.test.cjs`: incrustación de PNG en Excel y coherencia del esquema SQL.
- Comprobar CI actual `.github/workflows/beta-security.yml` antes de publicar; una batería verde no equivale a prueba end-to-end de permisos reales.

## 6. Seguridad y rendimiento en staging
- `public.join_attempts`: añadida clave primaria de eventos, respaldada por migración staging; esquema canónico actualizado para proyectos futuros.
- Verificado en staging: tablas `docs` y `season_members` con RLS habilitado; funciones internas `spend_tokens`, `refund_tokens` y el trigger de alta no son invocables directamente por `authenticated`.
- Verificado también: staging no contiene todavía cuentas ni documentos reales.
- Performance Advisors: permanece solo aviso informativo de índices no usados (esperable en base vacía).
- Security Advisors: permanecen avisos `authenticated_security_definer_function_executable` que requieren auditoría individual de RPC, y RLS sin política en tablas privadas por diseño. No se han abierto tablas a roles públicos ni modificado producción.

## 7. Pruebas aún necesarias antes del lanzamiento
1. Probar en `staging.html` el registro y los enlaces de confirmación con usuarios ficticios.
2. Comprobar guardar/recuperar y quitar escudo, roles reales, exportar Excel y PDF y mensajería local/visitante.
3. Validar funcionamiento del módulo de club conectado a la base de datos: **actualmente no implementado**, requiere trabajo adicional.
4. Activar Cloudflare Turnstile en staging con claves correctamente configuradas y probar la recuperación de cuenta.
5. Restauración verdadera de un respaldo cifrado en entorno aislado y política de retención.
6. Resolver identidad legal y contacto oficial antes de permitir datos de jugadores menores.
7. Validar móvil/navegadores y aprobar expresamente cambios antes de considerar un merge a `main`.

**Decisión:** Beta técnica mejorada pero NO certificada para lanzamiento público.
