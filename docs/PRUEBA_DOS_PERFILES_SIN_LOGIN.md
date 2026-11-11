# Dos cuentas de demostración sin registro · Banquillo

## Enlaces directos

- Cuenta 1 (Álex Ruiz, sin equipos): https://carlosbieravazquez-prog.github.io/Banquillo/demo-cuenta1-sin-login.html
- Cuenta 2 (Lucía Moreno, Directora Deportiva): https://carlosbieravazquez-prog.github.io/Banquillo/demo-director-sin-login.html

No requieren registro, login, contraseña ni credenciales temporales. La identidad se fija en cada página: **no se puede cambiar de persona pulsando un botón**.

## Funcionamiento

Abre las **dos páginas en pestañas del mismo navegador y perfil**, porque el simulador comparte el estado por `localStorage` del mismo origen. No funciona la sincronización entre navegadores distintos ni en modo incógnito mezclado con navegador normal.

Cuenta 2 muestra Atlético Monteverde CF, temporada 2026/2027, Alevín A (F7) y Cadete A (F11), plantillas/estadísticas ficticias desde septiembre, 18 jornadas por equipo. Puede mostrar códigos exclusivos de equipo o emitir una invitación de segundo director válida 10 minutos y un uso.

Cuenta 1 empieza sin ningún equipo ni club. Introduce un código de equipo para pedir aprobación: **no recibe acceso hasta que Cuenta 2 le asigne un cargo**. El director puede rechazar, aprobar o expulsar. Si usa el código temporal de director, se convierte en segundo director en la simulación.

Los mensajes del director solo llegan al equipo al que pertenece Cuenta 1. Un aviso referido a una jornada abre su acta y se resuelve al pulsar Cerrar acta.

El director puede restablecer la demostración y empezar de cero.

## Seguridad y alcance

**Estos son perfiles simulados**, no cuentas Supabase autenticadas. No usan credenciales, tokens ni la base de datos real; los códigos son ficticios y no sirven para unirse a la web oficial. Los cambios se guardan en almacenamiento local de ese navegador. Su objetivo es permitir comprobar rápidamente la experiencia de usuario.

La seguridad real, RLS, correo confirmado y vinculación entre cuentas reales se tienen que comprobar aparte en los enlaces de pruebas autenticados.

## Comprobación técnica

Se verificó sintaxis JavaScript y una prueba funcional simulando el navegador para: dos identidades fijas, club con temporada, códigos distintos, solicitud pendiente, aprobación y cargo, envío privado, cierre de acta que resuelve aviso, expulsión, reinicio y entrada mediante código temporal de director.
