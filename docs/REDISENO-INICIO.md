# Portada cinematográfica · rama de pruebas

Rama: `test/home-cinematica`. No se modifica ni despliega la rama oficial.

La portada ocupa una sola pantalla, sin desplazamiento vertical ni secciones inferiores. Acceso, registro, recuperación, demostraciones e información se abren en ventanas nativas `dialog` con cierre por Escape y control de foco.

Vistas: [Escritorio](preview-desktop.png) · [Móvil](preview-mobile.png).

## Archivos
- `index.html`: nueva portada; conserva `authSlot`, aplicación, scripts, formularios y destinos de las demos.
- `css/cinematic.css`: capa visual aislada en `#landing`, adaptación móvil y movimiento reducido.
- `js/cinematic.js`: paralaje con requestAnimationFrame, aparición de hologramas, selector táctico, estadísticas ilustrativas y animaciones de entrada con IntersectionObserver.
- `assets/stadium-neutral.webp`: fondo editado con generación de imagen a partir de la fotografía inicial; estadio neutral sin jugadores sobre el campo, escudos ni publicidad de clubes. Servido localmente, aproximadamente 420 KB; sin dependencias JS añadidas.

## Vista previa local
Desde la raíz del repositorio:

```sh
python3 -m http.server 8000
```

Abrir http://localhost:8000. No necesita compilación. La autenticación usa la configuración existente; los enlaces de confirmación y recuperación deben permitir el origen de pruebas en Supabase para completar esos recorridos. No se modifica esa configuración.

## Verificación
Chromium con Playwright: portada, acceso al registro y recuperación, navegación a ambas demos, selector táctico, cambio de estadísticas; ausencia de errores JavaScript y desbordamiento horizontal a 390, 768 y 1440 px. Verificación de sintaxis JavaScript y `git diff --check`.

No se envían formularios a cuentas reales. El envío de correos, inicio de sesión válido y operaciones con permisos de director/entrenador requieren una cuenta de pruebas y quedan pendientes de prueba integral. Los módulos de autenticación, nube, permisos, datos y SQL permanecen idénticos a la base.

La escena utiliza fotografía y capas CSS/SVG con perspectiva; no es una reconstrucción tridimensional exacta de la imagen de referencia. Los paneles del escenario muestran datos ficticios. La página conserva el contenido y funcionalidades de la plataforma.

Última verificación: cinco ventanas (1440×900, 390×844, 768×1024, 1366×768 y 390×667) sin desplazamiento horizontal o vertical; apertura y cierre por Escape de acceso, registro, recuperación, demos e información. Once hologramas y tres formaciones. La consulta de conectividad a Supabase desde Chromium falló con `Failed to fetch` en este entorno; no se confirma conectividad real ni acceso autenticado.

Revisión de acceso: formulario centrado y ampliado, sin texto lateral ni demostraciones en las vistas de acceso/registro/recuperación; demos disponibles por separado. FAQ con superficies oscuras y texto claro. Comprobado en Chromium a 1440, 951, 768 y 390 px, sin desbordamientos ni errores JavaScript. Capturas actualizadas: preview-acceso.png, preview-registro.png, preview-preguntas.png, preview-desktop.png y preview-mobile.png.
