# Banquillo Beta — equipos y cuerpo técnico (11/11/2026)

## Nuevo funcionamiento
- En Dirección Deportiva, selecciona un club y equipo.
- En «Cuerpo técnico» aparecen los cuatro cargos: Entrenador principal, Segundo entrenador, Tercer entrenador y Delegado.
- Introduce un nombre y elige un puesto libre. Solo puede haber una persona por cargo.
- «Quitar del cargo» deja vacante ese puesto, sin borrar ninguna cuenta ni permiso.
- «Archivar equipo» exige confirmación y lo oculta del listado activo, pero no elimina la temporada ni sus documentos.
- Los equipos archivados pueden restaurarse desde «Equipos archivados». Solo cuentan los equipos activos para el máximo de 12 por club.

## Diferencia importante: cargo y acceso
El listado de cuerpo técnico es un **directorio organizativo de cargos**, no una asignación automática de permisos de usuario. Para que una persona tenga acceso a partidos, plantilla o actas, debe entrar en la temporada mediante el flujo de invitación existente de Banquillo. Un cambio de cargo no concede ni revoca acceso automáticamente.

## Migración
`banquillo_gestion_equipos_cuerpo_tecnico_20261111` añadida a Supabase. Crea `banquillo_team_staff`, habilita RLS, añade `archived_at` a `banquillo_teams` y modifica el límite de equipos para contar solo los activos.

## Pruebas ejecutadas (SQL transaccional y reversible)
- Creación de equipo y cuatro cargos técnicos: OK.
- Rechazo de dos personas en el mismo cargo: OK.
- El usuario ajeno a un club no puede leer ni eliminar los cargos de ese club: OK.
- El usuario ajeno no puede archivar su equipo: OK.
- Archivado y restauración con miembro autorizado: OK.
- No es posible añadir integrantes al directorio de un equipo archivado: OK.
- Validación de sintaxis de `js/clubs-beta.js`: OK.

## Comprobaciones pendientes
- Prueba visual con sesión real en móvil y ordenador.
- Dar de alta y quitar cargos desde un navegador.
- Archivar y restaurar un equipo de prueba desde navegador.
- Mejorar la relación explícita entre cargos y cuentas de usuario en fase posterior, sin abrir permisos automáticamente ni revelar datos de menores.
