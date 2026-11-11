# Fase 1 clubes: integración segura (rama de trabajo)

## Estado
El archivo `supabase/clubes_fase1_borrador.sql` es un **borrador NO desplegado**. La demo `demo-club.html` y su `localStorage` son completamente independientes de las cuentas de producción. No debe presentarse como integración acabada.

## Compatibilidad
- Las tablas nuevas tienen prefijo `banquillo_` para evitar colisiones.
- No toca `docs`, `season_members`, `seasons_meta` ni jugadores existentes.
- La columna opcional `season_id` es un puente gradual hacia una temporada real.
- No se concede acceso automático a `docs` solo por ser director del club: hacerlo requiere un diseño adicional de permisos, pruebas de no filtración y actualización de las consultas.
- La baja de un entrenador de la demo **no** revoca acceso real; la baja de producción debe actuar sobre `season_members` y desactivar invitaciones pertinentes.

## Bloqueos antes de producción
1. Copia de seguridad restaurable y entorno de pruebas aislado.
2. Generar migración versionada real con la CLI Supabase y revisar SQL.
3. Garantizar que `season_id` solo puede vincularse con autorización explícita del dueño de la temporada; evitar vincular temporadas de terceros.
4. Límite de 12 equipos por club aplicado de forma **atómica en la base de datos** (no solamente en JS).
5. Definir política de creación de directores y máximo dos directores por club, incluyendo el propietario.
6. Implantar auditoría de cambios con campos anterior/nuevo y actor, sin exponer datos personales de menores entre clubes.
7. Conectar las interfaces reales a las tablas y a los documentos autorizados. Los datos de `DemoClubUX` no deben mostrarse como estadísticas reales.
8. Alertas con origen de datos verificable, estado de lectura, y programación del recordatorio a 7 días en servidor (no depender de que el navegador esté abierto).
9. Pruebas con al menos dos cuentas de clubes distintos: listas, alta/cambio de equipo, lectura de datos, revocación y rotación de códigos.
10. `get_advisors` de seguridad y rendimiento, pruebas de login y revisión manual de funcionalidades F7/F11.

## Pruebas negativas indispensables
- Usuario no miembro no puede consultar ni modificar clubes/equipos ajenos.
- Un director no puede autoconcederse acceso a otro club ni modificar el propietario.
- Un director no puede vincular un `season_id` ajeno.
- Al revocar un entrenador no puede seguir escribiendo documentos del equipo, tampoco con sesión abierta.
- Ningún cliente público recibe `service_role` ni secretos.
- La demo no contamina el almacenamiento de producción.

## Despliegue
Mantener la rama separada y abrir PR para revisión. **No fusionar ni ejecutar el borrador** hasta cerrar estos puntos. Las cuentas y datos actuales siguen disponibles en el modelo de temporadas existente.
