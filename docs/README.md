# Documentación de Banquillo

Esta carpeta está organizada por **finalidad**, no por fecha. La documentación describe lo comprobado y también lo que sigue pendiente.

| Área | Contenido |
|---|---|
| [Inicio](getting-started/GUIA.md) | Puesta en marcha local, Supabase, pruebas y publicación |
| [Seguridad](security/AUDITORIA_SEGURIDAD_BETA.md) | Auditoría de seguridad, RLS, permisos y activación de Turnstile |
| [Turnstile](security/ACTIVACION_TURNSTILE_BETA.md) | Activación escalonada y reversible de CAPTCHA |
| [RLS](security/PROTOCOLO_PRUEBAS_RLS_STAGING.md) | Matriz de roles y pruebas de aislamiento |
| [Pruebas](testing/EJECUCION_STAGING_PASO_A_PASO.md) | Protocolo completo de staging |
| [Operaciones](operations/PLAN_RESPALDOS_RECUPERACION.md) | Copias de seguridad y plan de recuperación |
| [Legal](legal/REVISION_PRIVACIDAD_PRELANZAMIENTO.md) | Deficiencias legales pendientes de resolución |
| [Proyecto](project/CIERRE_TRABAJO_AUTONOMO_BETA.md) | Avances técnicos y tareas sin cerrar |

## Rutas técnicas

- `../js/` y `../css/`: código y estilos activos.
- `../legal/`: páginas que ve el público.
- `../supabase/migrations/`: cambios de base de datos, con cuidado de no aplicar los de staging en producción.
- `../supabase/security/`: pruebas SQL.
- `../tests/`: regresiones de JavaScript.
- `../archive/legacy-root/`: versiones antiguas preservadas, no operativas.

Antes de mover archivos de ejecución comprueba los enlaces en `index.html`, `staging.html` y `demo-club.html`, el flujo de Auth y el CI. Las redirecciones antiguas de las páginas legales se mantienen por compatibilidad.
