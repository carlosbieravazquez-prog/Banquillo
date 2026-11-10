# Cierre de trabajo técnico autónomo — Beta Banquillo
Fecha: 10 de noviembre de 2026
**Solo rama** `feature/actas-sanciones-f11-ocr`. **Solo base de pruebas** `opfujvhgqrweyaaqquif`.

## Completado y verificado
- Separación entre producción y staging mediante configuración y guard, sin copiar datos.
- Consultas de seguridad de staging: **9/9 comprobaciones verdaderas**; RLS habilitada y funciones internas no ejecutables directamente por clientes.
- Migración de rendimiento **solo staging**: índice por propietario y política `profiles_select_own` con optimización `(SELECT auth.uid())`. Validado en SQL; desaparecen dos avisos de rendimiento.
- Pruebas negativas de membresía, lectura y llamadas RPC ya documentadas y ejecutadas.
- GitHub Actions existente para sintaxis y regresiones. Ejecución n.º 9 verificada previamente en estado success; **las nuevas pruebas añadidas después no se certifican como ejecutadas en CI hasta comprobar una ejecución posterior**.
- Tests adicionales de configuración que impiden conectar staging a la base oficial o publicar secretos de servidor accidentalmente.
- Arreglo deportivo: eventos de sustitución fuera del tiempo reglamentario no alteran los minutos.
- Tests de cálculos deportivos: resultados, convocatorias, faltas/descansos, cambios y asistencias.
- Auditoría y requisitos de lanzamiento legal: `docs/REVISION_PRIVACIDAD_PRELANZAMIENTO.md`.
- Runbook de respaldo/recuperación: `docs/PLAN_RESPALDOS_RECUPERACION.md` (procedimiento, **no una restauración ya completada**).

## Acciones que requieren acceso de usuario o un servicio externo adicional
- Validar visualmente `staging.html` desde el navegador y crear las dos cuentas ficticias por Auth.
- Completar registro real, correo de confirmación y recuperación, y prueba positiva de roles mediante dichas cuentas.
- Crear widget Cloudflare Turnstile en una cuenta del proyecto; introducir el secreto **solo** en la consola Supabase-Staging y la clave pública en la configuración staging.
- Revisar políticas de limitación de peticiones de Auth en su Dashboard y probar sin ataques repetitivos ni datos reales.
- Completar identificación y datos de contacto de avisos legales; revisar el tratamiento de datos de menores con asesoramiento adecuado.
- Realizar backup íntegro y restauración de datos ficticios en un entorno aislado con coste aprobado.
- Probar en navegadores/móviles reales.
- Confirmar funcionalidad de administración de clubes y calendario de directores deportivos mediante casos de uso de extremo a extremo (no certificadas).
- Configurar dominio y publicar oficialmente **solo con aprobación explícita y tras superar las barreras anteriores**.

## Decisiones de seguridad
No realizar escrituras destructivas ni pruebas de ataque sobre producción. No copiar datos reales de menores. No registrar credenciales en chat o GitHub. No activar CAPTCHA en producción antes de probar el flujo completo de registro, acceso y recuperación.
