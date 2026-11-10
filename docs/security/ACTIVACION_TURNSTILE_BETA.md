# Activación segura de Cloudflare Turnstile para Banquillo (Beta)

**Estado:** integración del cliente preparada pero **desactivada** por defecto. No activar en Supabase de producción hasta completar la validación y desplegar el cliente actualizado.

## Qué protege
La integración puede añadir un CAPTCHA a **entrar**, **crear cuenta** y **recuperar contraseña**. Supabase Auth valida el token en el servidor cuando su propia protección CAPTCHA está habilitada. Es una medida complementaria a los límites de peticiones y contraseñas seguras, no garantiza evitar todos los ataques de fuerza bruta.

## Preparación sin tocar producción
1. Usar **staging Supabase separado**, con cuentas ficticias. Obtener un widget Turnstile en Cloudflare y autorizar exclusivamente los dominios de prueba y los dominios reales que correspondan. Para desarrollo local consultar las restricciones y claves de prueba de Cloudflare.
2. Configurar en el `config.js` de staging **solo** `TURNSTILE_SITE_KEY` con la **clave pública del sitio**. Nunca introducir la clave secreta en GitHub, JavaScript o un commit. No copiar claves del entorno real a staging.
3. Comprobar que aparece el widget en los tres formularios y que, sin completarlo, Banquillo muestra «Completa la verificación de seguridad…» y no inicia peticiones de acceso.
4. Configurar la **clave secreta** únicamente en el Dashboard de Supabase **staging**: Authentication → Bot and Abuse Protection → CAPTCHA; seleccionar Turnstile y habilitar.
5. Probar inicio correcto, contraseña incorrecta, registro, recuperación, captcha inválido/caducado, errores de red y navegación entre formularios. Revisar que el formulario siga siendo accesible en móvil.
6. Verificar también límites del servidor en Auth → Rate Limits. No provocar una prueba agresiva de fuerza bruta contra producción ni usar cuentas reales.
7. Solo después de superar todas las pruebas, desplegar primero el cliente con una clave pública de sitio autorizada para el dominio definitivo; comprobar que el CAPTCHA se muestra y envía tokens, y **después** habilitar la validación en Supabase de producción, coordinando ambos pasos para evitar indisponibilidad.
8. Documentar la recuperación/reversión: poder deshabilitar el control de Supabase si un error de configuración impide iniciar sesión; después retirar/ajustar la configuración pública del sitio si fuera necesario.

## Cambios en el código
- `js/auth-captcha.js`: carga diferida del script oficial de Cloudflare y widget opcional.
- `config.js`: `TURNSTILE_SITE_KEY: ""` mantiene el sistema actual sin CAPTCHA.
- `js/auth.js`: exige un token solo cuando hay sitekey y lo pasa a Supabase como `captchaToken`.
- `index.html`: carga el componente local.

## Riesgos y límites
- La web es estática: bloquear intentos mediante JavaScript o `localStorage` es evitable. **El bloqueo real debe estar en Supabase**.
- No usar bloqueos permanentes por IP compartida o por fallos sucesivos sin políticas de recuperación: podrían impedir el acceso a entrenadores legítimos.
- El navegador necesita cargar `challenges.cloudflare.com`; algunos bloqueadores pueden impedirlo. Probar mensajes y asistencia.
- El formulario de cambio de contraseña por enlace de recuperación no lleva CAPTCHA; la protección se aplica al **envío del correo de recuperación**, no al cambio tras un enlace autorizado.
- Un token tiene validez limitada: resolver cada operación con un desafío vigente. No almacenar tokens en `localStorage`, logs o base de datos.
- Revisar el tratamiento de datos y la información legal vinculada a servicios de terceros.

Fuentes:
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/deployment/going-into-prod
