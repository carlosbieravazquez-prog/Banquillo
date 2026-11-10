# Banquillo

**Aplicación web para entrenadores y clubes de fútbol base.** Plantillas, convocatorias, partidos, actas, entrenamientos, estadísticas e informes.

> **Estado:** desarrollo y pruebas. La gestión avanzada de clubes y las protecciones de autenticación requieren más validación antes de admitir datos reales de menores.

## Estructura del repositorio

```text
Banquillo/
├── index.html                 # Entrada a la web principal (NO usar para tests)
├── staging.html               # Entrada a la Beta, con datos ficticios
├── config.js                  # Configuración pública del entorno principal
├── config.staging.js          # Configuración pública del entorno de pruebas
├── css/                       # Estilos de la aplicación
├── js/                        # Código activo del frontend
├── legal/                     # Páginas legales y su hoja de estilos
├── supabase/
│   ├── schema.sql             # Esquema canónico de base de datos
│   ├── functions/             # Funciones Edge (servidor)
│   ├── migrations/            # Migraciones documentadas y por entorno
│   └── security/              # Auditorías y pruebas de permisos SQL
├── tests/                     # Pruebas automáticas de JavaScript
├── docs/
│   ├── getting-started/       # Instalación y configuración
│   ├── security/              # Seguridad, RLS y Turnstile
│   ├── testing/               # Protocolos manuales y staging
│   ├── operations/            # Copias, restauración y operación
│   ├── legal/                 # Revisión de cumplimiento pendiente
│   └── project/               # Estado y seguimiento del proyecto
├── archive/legacy-root/       # Versiones antiguas (NO cargarlas en la web)
└── .github/workflows/         # CI: sintaxis y tests
```

## Dónde empezar

- [Guía para ejecutar Banquillo](docs/getting-started/GUIA.md).
- [Índice de documentación](docs/README.md).
- [Privacidad](legal/privacidad.html) y [aviso legal](legal/aviso-legal.html).

### Comprobaciones y seguridad

- **Beta:** `feature/actas-sanciones-f11-ocr`. En esta rama es donde se preparan las mejoras.
- **Oficial:** `main`. No integrar ni publicar cambios sin revisarlos y aprobarlos.
- **Base oficial:** proyecto Supabase `dsewztxveqgwhyuyyyoq`.
- **Base de pruebas:** proyecto Supabase `opfujvhgqrweyaaqquif` (sin datos reales).

En la Beta se pueden ejecutar pruebas locales con:

```bash
node --test tests/*.test.cjs
```

También se ejecutan mediante GitHub Actions al actualizar la rama Beta. No se debe afirmar que una versión está lista solo porque pase CI.

## Protección de datos

No introducir información real de menores mientras no se hayan validado los accesos, copias de seguridad, responsabilidades y textos legales. No subir claves secretas, contraseñas, JWT o datos de jugadores al repositorio.

## Código antiguo

La raíz contenía copias históricas de scripts y CSS. Se han archivado en `archive/legacy-root/`; **la versión activa está en `js/` y `css/`**. No realizar cambios en el archivo histórico esperando que se apliquen a la aplicación.
