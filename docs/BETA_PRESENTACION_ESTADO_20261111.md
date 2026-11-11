# Estado de Banquillo Beta para presentación — 11/11/2026

## Integrado en la rama feature/beta-presentacion-profesional-20261111
- Nueva Dirección Deportiva en `clubes.html`, inspirada visualmente en `demo-club.html`.
- Página de bienvenida para cuentas sin temporadas deportivas: Crear equipo, Crear club, Mostrar prueba.
- Formulario de crear club sin configuración obligatoria completa y un solo club activo por titular.
- Temporadas de club cerrables sin borrar equipos ni datos.
- Códigos individuales por equipo con unión a su temporada (editor), más código independiente del director.
- Cinco pestañas por equipo: Resumen deportivo, Estadísticas, Entrenadores, Configuración, Código del equipo.
- Cuerpo técnico dinámico: principal, segundo, tercero, delegado u otros cargos, con ventana para añadir/editar/quitar.
- Formularios internos en vez de prompts/confirm/alert nativos en el panel y la demo de club.
- Fecha actual y próxima jornada local/visitante en las cabeceras del entrenador y del club.
- Dos demos ficticias separadas: Dirección Deportiva y entrenador, esta última con Alevín F7/Cadete F11, 18 jornadas ida y vuelta, resultados solo hasta la fecha actual.
- Calendario y comunicaciones basadas en los datos que el usuario tiene permiso de consultar.

## Esquema Supabase
Migraciones registradas:
- `banquillo_club_temporadas_codigos_equipo_20261111`
- `banquillo_club_settings_team_profile_20261111`
- `banquillo_staff_cargo_otro_20261111`
- `banquillo_codigos_bloqueo_temporadas_cerradas_20261111`

## Verificación de SQL realizada
- Crear club con cuenta nueva: OK.
- Bloquear segundo club activo: OK.
- Cerrar una temporada y abrir un club en la siguiente: OK.
- Código exclusivo de equipo, membresía de la temporada correcta y rotación: OK.
- Múltiples cargos de tipo «Otro», sin duplicar los cargos fijos: OK.
- Ajustes de club bajo RLS: propietario puede crear/editar; usuario ajeno no puede ver.
- Todas las pruebas se ejecutaron en transacciones revertidas y no dejaron datos de prueba.

## Pendiente antes de llamar «Beta final»
- Prueba real de la página publicada con una sesión autenticada y en móviles; la revisión de sintaxis de JS no sustituye una prueba de navegador.
- Conectar la asignación avanzada de campos y horarios del planificador mensual directamente a Supabase (de momento la demo conserva el editor completo).
- Convertir los cargos de cuerpo técnico en asignación y baja de **usuarios reales** con permisos en servidor, en lugar de simples nombres organizativos.
- Automatizar recordatorios por servidor; los avisos actuales son calculados en pantalla.
- Revisar acceso a recursos de la Data API y avisos de seguridad pendientes de Supabase Auth.
- Verificar flujo de registro desde cero con una cuenta de prueba y los distintos roles.
- Revisión visual comparando cada pantalla con la demo avanzada de referencia.

No afirmar que toda la plataforma funciona al 100 % o está libre de vulnerabilidades. No desactivar RLS ni exponer service_role en navegador.