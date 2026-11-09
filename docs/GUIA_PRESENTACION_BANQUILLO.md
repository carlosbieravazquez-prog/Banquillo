# Guía de presentación de Banquillo

## Mensaje principal

Banquillo es una aplicación web para organizar el trabajo diario del fútbol base. La aplicación de entrenador cubre la gestión de una temporada y el prototipo de club muestra cómo podría coordinarse la actividad de varios equipos e instalaciones.

## Recorrido recomendado (5–7 minutos)

1. **Inicio:** explicar que se puede gestionar un equipo de forma independiente; no es obligatorio pertenecer a un club.
2. **Aplicación de entrenador:** enseñar plantilla, ficha de partido, convocatorias, entrenamientos, estadísticas e informes.
3. **Demo de club:** abrir demo-club.html y explicar que el club de ejemplo y sus 15 equipos son ficticios.
4. **Dirección deportiva:** cambiar entre los dos perfiles de dirección y enseñar que ambos tienen el mismo nivel de acceso en el prototipo.
5. **Instalaciones:** mostrar los campos F11, los campos F7 independientes y la divisibilidad de un F11 en dos F7.
6. **Calendario:** navegar por la semana, revisar partidos locales/visitantes y asignar fecha, hora y campo a un partido pendiente.
7. **Control de conflictos:** intentar reservar el F11 completo en una franja donde una mitad ya esté ocupada; la demo debe bloquearlo. Explicar que dos mitades F7 distintas sí pueden utilizarse simultáneamente cuando el campo es divisible.
8. **Comunicaciones:** copiar el resumen semanal y mostrar cómo distingue partidos locales, visitantes y datos aún pendientes.

## Qué está implementado y qué es prototipo

- La aplicación de entrenador ya contiene el flujo de cuentas, temporadas, plantillas, partidos, convocatorias, entrenamientos y estadísticas conectado al backend existente.
- La demo de clubes es interactiva, pero sus cambios se guardan únicamente en el navegador mediante almacenamiento local.
- El prototipo de club no sincroniza usuarios ni permisos y no escribe en Supabase.
- La estructura backend de clubes, equipos, membresías, auditoría y notificaciones está pendiente.
- El dominio banquillo.app es el nombre deseado, pero aún no está registrado ni configurado.

## Frase transparente para cerrar

«Esta es la primera demostración funcional de la organización de un club. La siguiente fase es conectar estos flujos a cuentas reales, permisos de entrenadores y dirección deportiva, y una base de datos compartida, después de cerrar las pruebas de seguridad y recuperación de datos».

## Consejos para la demo

- No introduzcas nombres, teléfonos ni datos reales de menores.
- Usa el botón de restablecer demo si los datos de prueba quedan desordenados.
- Haz la presentación en el mismo navegador donde vayas a enseñar la demo, porque los cambios se guardan localmente.
- Prueba antes la vista semanal y el botón de copiar mensaje.
- No prometas que los dos directores están conectados en tiempo real: el cambio de perfil es una simulación de permisos.
