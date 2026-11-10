# Banquillo-Staging: ejecución controlada de las pruebas

**Entorno exclusivo:** Supabase `opfujvhgqrweyaaqquif`. No usar la base oficial `dsewztxveqgwhyuyyyoq`.
**Frontend:** `http://127.0.0.1:5500/staging.html` tras actualizar la rama Beta.
**Estado:** backend de staging creado, esquema cargado, frontend aislado, CAPTCHA deshabilitado hasta configuración.

## Paso 1 — levantar la web de pruebas
Desde PowerShell:
```powershell
cd C:\Users\carlo\Banquillo-pruebas
git pull --ff-only origin feature/actas-sanciones-f11-ocr
npx.cmd --yes http-server . -p 5500 -a 127.0.0.1 -c-1
```
Abrir `http://127.0.0.1:5500/staging.html`. Tiene que aparecer **PRUEBAS · DATOS FICTICIOS**, y la web de pruebas debe dirigirse al proyecto staging. La página `index.html` de esa misma carpeta sigue conectada a **producción**; no utilizarla para tests de alta de usuarios.
La herramienta remota no puede abrir el `localhost` del ordenador: esta comprobación visual la realiza quien opera la máquina.

## Paso 2 — configurar redirecciones de Supabase-Staging
Abrir `https://supabase.com/dashboard/project/opfujvhgqrweyaaqquif/auth/url-configuration`.
- En `Site URL`, utilizar **solo para staging** `http://127.0.0.1:5500/staging.html`.
- En `Redirect URLs`, añadir `http://127.0.0.1:5500/staging.html` exacta.
- Si se usa `localhost` en lugar de `127.0.0.1`, se trata de otro origen y hay que añadir también su URL concreta; para reducir errores usar siempre `127.0.0.1`.
- Guardar. No cambiar este ajuste en el Supabase oficial.

## Paso 3 — registro de usuarios ficticios
- Desde `staging.html`, crear dos cuentas controladas únicamente para staging. No reutilizar la contraseña habitual.
- Los correos deben permitir recibir la confirmación cuando Auth la exija, pero no compartirse por el chat ni añadirse al repositorio.
- No utilizar datos de futbolistas reales, correos de menores ni nombres sensibles; usar nombres claramente ficticios.
- Crear una temporada A con 2 jugadores ficticios y otra temporada B con otros 2.
- Verificar desde el panel que son nuevas cuentas de staging y que producción sigue igual.

## Paso 4 — roles y restricciones
Usar las dos cuentas de staging para confirmar que un usuario externo no ve la temporada ajena; después invitar, probar `viewer` y `editor`. Realizar las pruebas de INSERT/UPDATE/DELETE directamente por API únicamente cuando haya identidades ficticias, capturando solo resultados y nunca tokens de autenticación.
Se han realizado ya pruebas previas sin miembros: `anon` no tiene permiso SELECT sobre `docs`; `authenticated` con un identificador ficticio no ve ningún documento y las funciones `is_member`/`can_edit`/`is_owner` devuelven false; INSERT no autorizado es bloqueado por RLS.

## Paso 5 — Cloudflare Turnstile
- Crear en Cloudflare un widget Turnstile para el entorno de pruebas, con dominios autorizados según su documentación (incluido desarrollo local cuando sea compatible).
- La clave pública de sitio se coloca en `TURNSTILE_SITE_KEY` de `config.staging.js` (o, preferiblemente, se configura mediante una variable de despliegue para un entorno publicado).
- La **Secret Key nunca se comparte en el chat, ni se sube a GitHub ni al navegador**.
- Probar que el desafío aparece en login, registro y recuperación. Sin resolverlo, los formularios no deben enviar solicitudes.
- Solo después, en `https://supabase.com/dashboard/project/opfujvhgqrweyaaqquif/auth/protection`, habilitar CAPTCHA en **staging** y configurar allí la clave secreta.
- Probar el flujo completo de registro, inicio de sesión y recuperación, incluidos fallos y desafío caducado. Confirmar que las cuotas de Auth no afectan negativamente a usuarios legítimos.
- No habilitar la protección del servidor en producción hasta haber probado la versión cliente ya desplegada.

## Paso 6 — evidencia y criterios
Guardar solo una tabla de resultados: fecha, escenario, rol, esperado, obtenido y si se supera. No registrar contraseñas, correo de jugadores, JWT, cabeceras Authorization ni claves.
Si falla cualquier prueba de acceso o recuperación, dejar CAPTCHA deshabilitado en staging y diagnosticar antes de aplicar cambios.

## Paso 7 — publicación
Solo tras confirmar aislamiento, restauración, accesos, CAPTCHA y revisión legal se podrá proponer integrar la Beta en la versión oficial. Requiere aprobación explícita.
