# Banquillo Beta — Acceso, cambio de sesión y recuperación segura

**Alcance:** exclusivamente `staging.html` y Supabase-Staging (`opfujvhgqrweyaaqquif`). No se han transferido cuentas ni contraseñas de la versión oficial.

## Qué se ha corregido

- Evitar doble limpieza de sesión al recibir un `SIGNED_OUT` de Supabase y al terminar la llamada explícita `signOut`.
- Descartar eventos antiguos que lleguen después de un nuevo inicio de sesión.
- Aislar operaciones de carga asíncronas por un identificador de sesión para evitar mezclar datos al cambiar de usuario.
- Cerrar **solo esta sesión** al pulsar Cerrar sesión (en vez de revocar todas las sesiones desde cada dispositivo).
- Enlace de recuperación de Supabase y evento `PASSWORD_RECOVERY` obligatorios antes de mostrar el formulario de cambio.
- Comprobar el usuario autenticado ante Supabase antes de `updateUser({password})`, pedir contraseña nueva y confirmación, y cerrar sesión después.
- Mostrar contraseña mediante icono del ojo tanto al entrar como al registrar y recuperar contraseña.
- Selector de teléfono **opcional y en pruebas**, con búsqueda de países y prefijos; **NO se guarda, NO se envía y NO permite SMS de recuperación** mientras no exista proveedor de SMS y verificación real.

## Cómo actualizar

1. Haz copia de cualquier dato que todavía no hayas guardado en la interfaz.
2. Abre otra PowerShell (no cierres el servidor local) y ejecuta:
   ```powershell
   cd C:\Users\carlo\Banquillo-pruebas
   git status --short
   ```
3. Si no aparecen modificaciones:
   ```powershell
   git pull --ff-only origin feature/actas-sanciones-f11-ocr
   ```
4. Si el servidor no está iniciado:
   ```powershell
   npx.cmd --yes http-server "C:\Users\carlo\Banquillo-pruebas" -p 5500 -a 127.0.0.1 -c-1
   ```
5. Abre **exclusivamente** `http://127.0.0.1:5500/staging.html` y pulsa **Ctrl+F5**.

## Simulaciones manuales

1. **Acceso:** entra con una cuenta **ya confirmada en Supabase-Staging** y revisa que aparezca tu panel.
2. **Cerrar y volver:** pulsa `Mi cuenta → Cerrar sesión`; vuelve a pulsar `Iniciar sesión` e introduce las mismas credenciales. Debe volver a aparecer el panel sin errores.
3. **Cambiar de cuenta:** con otra cuenta Staging confirmada, entra después del cierre anterior. No deben aparecer datos de la primera cuenta. No compartas los correos ni las claves aquí.
4. **Registro:** abre `Registrarme`, rellena nombre ficticio `Entrenador Simulación`, una dirección de correo propia de pruebas a la que tengas acceso y contraseña única. Comprueba el ojo, el selector de país y su buscador (`España`, `México`, `+34`). No introduzcas datos reales de terceros ni teléfonos auténticos en la Beta.
5. **Recuperación:** desde sesión cerrada elige `¿Has olvidado la contraseña?`, solicita un enlace, y **antes de abrirlo** comprueba que el formulario de nueva contraseña no está disponible. Abre el enlace recibido en el correo, verifica que pide **contraseña nueva** y **repetir contraseña**. Prueba primero dos valores distintos: debe bloquear el cambio. Introduce dos valores iguales y confirma. Debe cerrar sesión y pedir iniciar sesión con la nueva contraseña. Nunca compartas enlaces de recuperación ni contraseñas.
6. **Recuperación con enlace expirado:** el sistema debe rechazarlo. No sigas reintentando muchas veces: el proveedor limita el envío de correos.

## Consideraciones y limitaciones

- Al estar separados los proyectos, una cuenta del proyecto oficial no tiene por qué existir en Staging. **Ningún cambio de esta rama crea ni transfiere credenciales.**
- La cuenta de Staging previamente inspeccionada está confirmada y tiene contraseña; los eventos `invalid_credentials` indican intentos rechazados, sin permitir identificar qué parte se introdujo mal.
- Supabase tiene límites de envío de correos de prueba; el enlace de recuperación funciona **solo si se envía, se recibe y se abre correctamente**.
- El teléfono no es prueba de identidad. Para añadir recuperación por SMS son necesarios proveedor externo, configuración de Auth, verificación OTP, costes y controles antiabuso. No activarlo sin revisar privacidad, consentimiento y tratamiento de datos de menores.
- Los tests automáticos simulan llamadas de autenticación pero no sustituyen la prueba real de navegador con correos confirmados.
- Mantener la versión oficial sin cambios hasta aprobar la validación completa.
