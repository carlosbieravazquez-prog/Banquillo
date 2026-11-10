# Banquillo · Puesta en marcha y pruebas

> **Importante:** `main` es la versión oficial. La rama `feature/actas-sanciones-f11-ocr` es una Beta. No ejecutar cambios de esquema ni tests destructivos en producción.

## 1. Qué contiene el proyecto

La web es estática y funciona en navegadores modernos. El frontend se encuentra en `index.html`, `js/` y `css/`. La autenticación y los datos están en Supabase. La carpeta `legal/` contiene las páginas de privacidad y aviso legal.

La página `staging.html` utiliza exclusivamente `config.staging.js` y el proyecto Supabase **Banquillo-Staging** (`opfujvhgqrweyaaqquif`). Esta página debe utilizarse **solo con usuarios y jugadores ficticios**.

## 2. Ejecutar la Beta desde Windows

Abre PowerShell en el ordenador en el que tengas la carpeta de pruebas:

```powershell
cd C:\Users\carlo\Banquillo-pruebas
git pull --ff-only origin feature/actas-sanciones-f11-ocr
npx.cmd --yes http-server . -p 5500 -a 127.0.0.1 -c-1
```

Abre **http://127.0.0.1:5500/staging.html**. Debe aparecer el marcador **PRUEBAS · DATOS FICTICIOS**. No abras `index.html` para probar registros, ya que apunta al proyecto oficial de Supabase.

## 3. Cómo está distribuida la base de datos

- Esquema canónico: `supabase/schema.sql`.
- Migraciones de prueba: `supabase/migrations/` (algunas son solo staging).
- Función de IA: `supabase/functions/ai-report/`.
- Auditorías y tests SQL: `supabase/security/`.

El proyecto staging ya tiene el esquema principal. **No lo vuelvas a ejecutar sin comprobar las migraciones existentes.** Nunca incluyas una clave `service_role`, secretos de Anthropic ni contraseñas en un commit.

## 4. URLs de autenticación de pruebas

En Supabase-Staging → Authentication → URL Configuration:

- Site URL: `http://127.0.0.1:5500/staging.html`.
- Redirect URLs: añadir la misma dirección.

Comprobar los cambios con un enlace real de confirmación de correo o restablecimiento de contraseña antes de darlo por validado.

## 5. CAPTCHA y protección antirrobots

`TURNSTILE_SITE_KEY` está vacía por defecto. El frontend sabe mostrar Turnstile en entrar, registro y recuperación, pero **la validación real no está activa**.

- Configura la **clave pública del widget** de Cloudflare en el archivo de staging, nunca la secreta.
- La **clave secreta** debe configurarse **solo** en el panel de Supabase-Staging.
- Activa CAPTCHA en staging después de comprobar que aparece el desafío y que se envía el token.
- Consulta `docs/security/ACTIVACION_TURNSTILE_BETA.md` para los criterios y la reversión.

## 6. Pruebas automáticas

Desde la raíz:

```powershell
node --test tests/*.test.cjs
```

También existe el workflow de GitHub Actions `.github/workflows/beta-security.yml`. Una prueba automática verde no sustituye la validación manual del navegador, los permisos con sesiones reales ni la restauración de backups.

## 7. Antes del lanzamiento

1. Registro, recuperación, permisos y CAPTCHA comprobados en staging con identidades ficticias.
2. Copia de seguridad y restauración realmente probadas en un entorno aislado.
3. Responsable jurídico identificado, correo de contacto funcional y textos legales revisados.
4. Condiciones de privacidad y acceso a datos de menores verificadas con la entidad responsable.
5. Revisión visual en móvil y escritorio, y pruebas completas de la gestión de clubes.
6. Solo tras autorización explícita, valorar la integración de cambios Beta en `main`.

Documentación técnica organizada en `docs/README.md`. Los ficheros antiguos de la raíz, que no están en uso por el sitio, se conservaron en `archive/legacy-root/` como referencia histórica.
