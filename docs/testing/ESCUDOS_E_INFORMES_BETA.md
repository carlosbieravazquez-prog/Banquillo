# Escudo del equipo e informes: validación Beta
Fecha: 10 de noviembre de 2026

## Qué está implementado
- Al crear una **temporada de un equipo**, paso **Datos**, puedes subir un escudo opcional.
- Si ya tienes una temporada, **Temporadas → Ajustes → Escudo del equipo**.
- Se admiten JPG, PNG y WebP hasta 3 MB. El navegador lo transforma a un PNG compacto de 220×220, con fondo transparente donde la imagen original lo permita.
- La imagen se conserva en `settings.crest` de la temporada y sincroniza con Supabase; no se sube a Canva automáticamente.
- Aparece en cabecera y barra lateral de la aplicación, informes PDF individuales, actas PDF y hojas de acta impresas.
- Los PDF de jugador tienen el dorsal ampliado (círculo de 25 mm y letra de 24 pt).
- Es opcional: sigue funcionando sin escudo.
- En el formulario hay un enlace informativo a Canva, **sin afirmar que su quitafondos sea gratis**. Canva gestiona sus propias condiciones, cuentas y precios. No es patrocinio ni integración de marca.

## Alcance todavía no implementado
El escudo se configura **por equipo/temporada**, no como un recurso común de toda una organización multiequipo. El módulo de club con directores deportivos aún está en desarrollo y no debe anunciarse como funcionalidad terminada.
El logo no se incrusta todavía dentro de todas las hojas Excel ni en todos los mensajes de texto; se muestra en la web y en documentos PDF y actas para imprimir.

## Comprobación desde casa con datos ficticios
1. En PowerShell abre `C:\Users\carlo\Banquillo-pruebas`; ejecutar `git status --short` antes de `git pull --ff-only origin feature/actas-sanciones-f11-ocr`. No perder archivos locales.
2. Arrancar el servidor `npx.cmd --yes http-server . -p 5500 -a 127.0.0.1 -c-1`. Visitar `http://127.0.0.1:5500/staging.html`, nunca la web oficial.
3. Crear temporada ficticia o abrir una ya existente → Ajustes → Escudo del equipo.
4. Subir un PNG transparente de un **escudo ficticio** y pulsar Guardar ajustes; refrescar la página, verificar que sigue apareciendo y se ve bien en móvil.
5. Descargar un informe individual PDF y un acta PDF; verificar escudo y dorsal legibles y sin recortes.
6. Usar Imprimir acta y comprobar la vista previa.
7. Cambiar la imagen, quitarla y verificar que los documentos sin escudo también se generan.
8. Revisar permisos: un lector no debe poder guardar cambios del escudo; propietarios y editores sí según sus roles.

## Seguridad y privacidad
No subir fotografías, nombres o documentos reales de menores durante las pruebas.
El escudo debe pertenecer a tu club o contar con autorización para usarlo. Puedes quitar el fondo fuera de Banquillo si quieres, pero no es requisito y no debes compartir información personal en servicios externos.

## Tests
`tests/club-crest.test.cjs`, `tests/security-config.test.cjs` y el conjunto `node --test tests/*.test.cjs`.
Última ejecución de CI comprobada: 156, resultado success; faltan pruebas manuales del navegador y de persistencia real con cuentas ficticias.
