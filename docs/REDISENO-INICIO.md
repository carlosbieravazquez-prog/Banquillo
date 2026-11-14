# Portada cinematográfica · rama de pruebas

Rama: `test/home-cinematica`. No se modifica ni despliega la rama oficial.

## Archivos
- `index.html`: nueva portada; conserva `authSlot`, aplicación, scripts, formularios y destinos de las demos.
- `css/cinematic.css`: capa visual aislada en `#landing`, adaptación móvil y movimiento reducido.
- `js/cinematic.js`: paralaje con requestAnimationFrame, aparición de hologramas, selector táctico, estadísticas ilustrativas y animaciones de entrada con IntersectionObserver.
- `assets/stadium.jpg`: fotografía de estadio descargada de Unsplash (https://images.unsplash.com/photo-1522778119026-d647f0596c20), servida localmente. Aproximadamente 788 KB; sin dependencias JS añadidas.

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
