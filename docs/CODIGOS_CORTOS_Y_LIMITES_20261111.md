# Banquillo · Códigos cortos y formularios más claros

**Fecha:** 11 de noviembre de 2026

## Problema diagnosticado
La función `banquillo_join_team` y la invitación de directores sumaban intentos fallidos de diferentes pantallas en una misma tabla, contando incluso fallos previos al formulario actual. Se encontraron 8 intentos recientes registrados para un usuario, por eso un primer intento visible podía recibir `too_many_attempts`.

## Cambios
- Los nuevos códigos de **equipo de club y segundo director** tienen 8 símbolos (ejemplo puramente ilustrativo: `ABCD-EFGH`). Son aleatorios y excluyen caracteres confusos (0/O, 1/I). Son equivalentes a 40 bits de aleatoriedad.
- El usuario puede pegarlos con o sin guion, en mayúsculas o minúsculas.
- Los códigos actuales de 32 caracteres se renovaron en Supabase a 8 caracteres; los anteriores ya no sirven. Los formatos históricos largos pueden reconocerse cuando existen todavía en registros compatibles.
- El director puede mostrar y copiar el código nuevo en la pestaña del equipo o generar la invitación temporal de otro director (un uso, 10 minutos).
- Los intentos fallidos se cuentan **por separado** en `team`, `club`, `season` y `legacy`. Los históricos no bloquean una primera entrada por código de equipo. La protección contra adivinación sigue activa: 5 errores en 10 minutos **por tipo**.
- Botones de Temporadas más claros: «Tengo un código de mi equipo», «Código de equipo independiente» y «Crear equipo independiente».
- Formulario de entrenador: «Entrar en un equipo de mi club», muestra ejemplo en dos bloques y explica que se debe obtener aprobación.
- Panel DD: «Entrar como segundo director», identificando que la invitación es diferente del código del entrenador.
- Actualizadas las páginas autenticadas de pruebas con formularios que aceptan códigos cortos.

## Verificaciones de Supabase
Se aprobaron 9 pruebas en transacciones revertidas:
1. Código de equipo con 8 caracteres permitidos.
2. Entrada con guion produce solicitud pendiente.
3. Aprobación del director sigue funcionando.
4. Expulsión sigue funcionando.
5. Renovar invalida el código anterior.
6. El código renovado permite solicitar de nuevo.
7. Invitación de director tiene 8 caracteres.
8. Un segundo director puede entrar con guion.
9. Permanece el límite antiadivinación por tipo de código.

Además, se comprobó que un código incorrecto de temporada independiente devuelve `invalid_code` en vez de bloquear inmediatamente por intentos heredados.

## Pendiente de comprobar
- Verificar el despliegue de GitHub Pages en navegador real (forzar recarga).
- Probar una unión completa con cuenta real autenticada y código **nuevo**; una demo local no sustituye esa prueba.
- Revisar los avisos de seguridad previos de Supabase antes de producción general.
