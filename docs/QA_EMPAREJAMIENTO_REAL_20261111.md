# Banquillo — Verificación real de códigos y permisos
**Fecha:** 11/11/2026 · **Proyecto:** Supabase Banquillo · **Objetivo:** paso de demo a Beta autenticada

## Resultados ya verificados en Supabase
Se ejecutaron **16 aserciones correctas** con las dos cuentas verificadas existentes, mediante `SET LOCAL ROLE authenticated` y simulación de `auth.uid()`. Todos los cambios se hicieron dentro de `BEGIN ... ROLLBACK`: **no se crearon usuarios, equipos, actas ni mensajes permanentes**.

1. Dos equipos distintos crean temporadas y códigos distintos.
2. Una cuenta no autorizada no ve documentos de esos equipos.
3. Introducir un código de entrenador genera una solicitud pendiente, sin acceso a actas.
4. El solicitante no puede autoaprobarse ni consultar el roster privado del director.
5. Dirección Deportiva ve la cuenta verificada, aprueba y asigna segundo entrenador.
6. El entrenador ve solo el equipo aprobado, no el otro.
7. Un entrenador no puede gestionar los códigos del director.
8. El aviso interno llega únicamente a su equipo.
9. Expulsar al entrenador revoca lectura de actas y avisos.
10. El código válido permite volver a solicitar acceso sin aprobarse automáticamente.
11. Renovar el código anula el anterior.
12. Generar invitación temporal para segundo director.
13. Segundo director obtiene los permisos de lectura correspondientes al club.
14. La invitación del director deja de servir después de utilizarse.
15. El director no puede crear un entrenador sin solicitud y código.
16. Al abandonar el club, el segundo director pierde sus permisos.

**Nota del test:** hay que consultar documentos de las temporadas creadas en la propia transacción. Contar documentos del usuario en otras temporadas produce falsos fallos, porque ambas cuentas reales pueden tener historiales propios.

## Corrección adicional de privacidad
En la web del entrenador se limpian las cachés de solicitudes y mensajes cuando cambia la identidad autenticada o se cierra sesión. Esto evita mostrar brevemente información de la cuenta anterior si se utiliza un mismo dispositivo para entrar con personas diferentes. La sesión se cierra con `scope: "local"` para no desconectar las otras sesiones de prueba.

Se verificó con un doble de navegador: solicitudes de usuario A → cambio a usuario B → **no se muestran las solicitudes A** → se muestran las B. Se repitió con mensajes internos, y también superó la prueba.

## Prueba final de navegador (requiere dos cuentas reales)
**Importante:** las demos `demo-cuenta1-sin-login.html` y `demo-director-sin-login.html` no son suficientes: son simulaciones con localStorage.

1. Abrir **Dirección Deportiva** (cuenta A): https://carlosbieravazquez-prog.github.io/Banquillo/clubes.html en Chrome normal. Entrar con un usuario real autorizado.
2. Abrir **solicitud de entrenador** (cuenta B): https://carlosbieravazquez-prog.github.io/Banquillo/prueba-cuenta1.html en una ventana privada u otro navegador, con otro usuario real.
3. En el director seleccionar un equipo existente (hay que disponer de uno) y entrar a **Código del equipo**. Copiar el código. No compartirlo públicamente.
4. En la cuenta B pegarlo en **Solicitar puesto de entrenador**. Debe aparecer **pendiente**. Comprobar que aún no puede ver la plantilla.
5. Volver a la cuenta A → Equipo → Entrenadores → **Actualizar solicitudes**. La cuenta B debe aparecer con identidad y correo enmascarado, no con un nombre escrito manualmente.
6. Aprobarla y asignar `Segundo entrenador`. En la cuenta B esperar la sincronización o actualizar la página: debe poder ver su equipo.
7. Comprobar que no accede a otros equipos. Desde la cuenta A enviar un mensaje interno referido a una jornada. Cuenta B debe recibirlo en Inicio y abrir esa jornada.
8. Cuenta A → Equipo → Entrenadores → **Expulsar**. Cuenta B debe dejar de poder ver los datos de ese equipo y las RPC protegidas deben rechazar nuevas consultas.
9. Para probar el **segundo director** en lugar del entrenador, primero dejar libre esa plaza. Cuenta A → Directores deportivos → Generar código (válido 10 minutos, un uso). Cuenta B introduce el código en Dirección Deportiva → Unirme al club. Probar después **Abandonar el club**.

No hay que crear un club nuevo para esta prueba: puede utilizarse un equipo existente, evitando consumir silbatos de gestión.

## Limitaciones y seguridad pendiente
- El test de SQL confirma RLS y reglas de las funciones en la base de datos, **no reemplaza una prueba visual desde navegadores y JWT reales**.
- GitHub Pages puede tener un retraso de despliegue. Consultar GitHub `main` no demuestra por sí solo que la versión servida esté actualizada.
- Supabase Security Advisor aún presenta advertencias sobre funciones `SECURITY DEFINER` autenticadas y protección frente a contraseñas filtradas. Estas advertencias requieren una revisión de seguridad independiente antes de una apertura general.
