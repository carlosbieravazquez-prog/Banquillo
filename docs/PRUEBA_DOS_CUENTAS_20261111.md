# Banquillo — prueba de dos cuentas (11 de noviembre de 2026)

## Enlaces
- **Cuenta 1:** https://carlosbieravazquez-prog.github.io/Banquillo/prueba-cuenta1.html
- **Cuenta 2:** https://carlosbieravazquez-prog.github.io/Banquillo/prueba-director.html

Los enlaces **NO** incluyen contraseñas, JWT, códigos privados ni inicios de sesión automáticos. La persona debe registrarse, confirmar su correo y entrar por sí misma con dos cuentas distintas, en dos navegadores o una ventana normal y otra privada.

## Cuenta 2 — club de ejemplo real
«Atlético Monteverde CF · PRUEBA» se crea **solo después de marcar la casilla y pulsar el botón**, con RPC autenticadas y RLS de Supabase. Cobra 10 silbatos de gestión, informados antes de confirmar. No modifica clubes existentes. La preparación es reanudable si hay un fallo parcial.

Se crean dos equipos:
- Alevín A, F7, 15 jugadores ficticios, 18 jornadas desde el 05/09/2026.
- Cadete A, F11, 20 jugadores ficticios, 18 jornadas desde el 05/09/2026.

Los resultados y las estadísticas ficticias solo se rellenan para los partidos anteriores a la fecha real; los futuros quedan sin marcador. Cada equipo tiene su propia temporada y código de emparejamiento, y las actas se guardan como documentos reales de Supabase. Los entrenadores **no** se inventan: se incorporan mediante una cuenta real.

Tras la preparación, el director puede consultar los códigos de ambos equipos o crear un código de **segundo director** de un único uso durante diez minutos.

## Cuenta 1 — cuenta vacía, solicitud de acceso
La página comprueba la sesión, clubes, membresías y solicitudes. Con el código de director entra al club si hay plaza; con el código de equipo queda **pendiente** hasta que el director la apruebe y asigne un puesto. No se inventan permisos en el cliente.

## Comprobaciones
Prueba de SQL con transacción revertida: crear club con cuenta autenticada, crear equipo con temporada y código, insertar jugador ficticio y jornada pasada, comprobar que ambos documentos aparecen en su colección. Se detectó y corrigió la incompatibilidad de la columna `parent` generada por Supabase: no debe enviarse en INSERT/UPSERT.

## Límites
- No pueden prepararse sesiones autenticadas ni cuentas personales a través de un enlace.
- No usar dos pestañas normales del mismo navegador para cuentas distintas: comparten la sesión de Supabase.
- Deben verificarse visualmente ambas páginas en un navegador real, y probar el flujo completo con dos cuentas.
- La actualización de GitHub Pages depende del despliegue. Si la nueva URL da 404 temporalmente, comprobar la publicación antes de repetir.
- Los nombres y partidos de muestra son ficticios; no son datos de menores reales. El club de prueba se puede retirar en Ajustes del club.
