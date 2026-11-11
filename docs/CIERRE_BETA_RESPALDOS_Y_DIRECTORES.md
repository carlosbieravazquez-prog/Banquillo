# Cierre de Banquillo Beta — copias, eliminación de club e invitaciones

**Fecha:** 11 de noviembre de 2026
**Rama:** `fix/cierre-beta-respaldos-club-directores-20261111`

## Restauración de respaldos
- **Demo del club:** «Restaurar respaldo» abre un selector de archivo JSON en una ventana diseñada por Banquillo, muestra los errores y permite confirmar la sustitución de los datos ficticios guardados en el navegador.
- **Dirección Deportiva oficial:** botones «Guardar copia» y «Restaurar copia» en la cabecera y en Ajustes del club.
- El respaldo oficial guarda únicamente **configuración del club y sus equipos, más nombres/cargos organizativos del cuerpo técnico**. No exporta ni restaura las actas, jugadores, cuentas, contraseñas ni códigos de invitación.
- La copia oficial incluye `club_id` para evitar importar datos de un club ajeno. La restauración se ejecuta como una **sola operación SQL transaccional**; si falla, no queda a medias.
- La restauración no crea/elimina equipos; actualiza los existentes identificados por UUID. Guarda la copia en un lugar seguro.
- Las copias de demostración y las oficiales tienen formatos diferentes. No son intercambiables.

## Eliminar club
- En Ajustes del club, el propietario tiene «Eliminar club».
- Se exige escribir el nombre exacto del club.
- La operación oculta el club, cierra la temporada, invalida los códigos y revoca la dirección deportiva del club, **sin borrar actas ni información de temporadas**.
- Desde el apartado de clubes eliminados, el propietario puede restaurarlo si no tiene ya otro club activo. Al restaurar, **se deben generar códigos nuevos**.
- Los miembros de las temporadas conservan los permisos independientes previamente otorgados; para retirarlos hay que gestionarlos desde la temporada correspondiente.

## Segundo director deportivo
- En «Directores deportivos» se muestra el código de invitación para el segundo director.
- La persona invitada inicia sesión con su propia cuenta y selecciona «Unirme a un club».
- Un club admite el propietario y **un director adicional** (dos directores en total). Los permisos de Dirección Deportiva son equivalentes para las operaciones ordinarias; por seguridad, la baja del club y la generación/rotación de su código de dirección quedan reservadas al propietario.
- Los directores no obtienen acceso automático a las actas de una temporada sin ser miembros de ella.

## Comprobaciones ejecutadas
- Crear código de director y unirse con una segunda cuenta: PASS.
- El segundo director no puede eliminar el club: PASS.
- El nombre exacto es obligatorio para la baja: PASS.
- La baja oculta el club, lo deja recuperable y anula su código anterior: PASS.
- La recuperación devuelve el club sin reactivar el código anterior: PASS.
- La restauración de la configuración revierte modificaciones en nombre de equipo y cuerpo técnico: PASS.
- Una cuenta ajena no puede restaurar la configuración: PASS.
- Pruebas de SQL ejecutadas en transacciones revertidas (sin modificar datos reales).

## Pendiente de certificar
- La validación sintáctica del JavaScript y las pruebas SQL **no son pruebas visuales de navegador**.
- Revisar en ordenador y móvil la selección de archivo, descarga, restauración y doble confirmación de baja.
- La integración real del planificador avanzado de campos y las notificaciones automáticas sigue pendiente para una versión posterior.
- Revisar configuraciones de protección de contraseñas filtradas en Supabase Auth y realizar una auditoría final de permisos.
