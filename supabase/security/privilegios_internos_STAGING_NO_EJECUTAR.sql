-- BORRADOR PARA STAGING. NO EJECUTAR SOBRE PRODUCCIÓN SIN COPIA RESTAURABLE.
-- Banquillo: limitar ejecución de funciones internas de disparador.
-- Estos cambios no alteran las políticas de acceso a equipos ni las tablas.
-- Verificar después: creación de cuenta, creación de tablas por administrador,
-- permisos EXECUTE y asesores de seguridad de Supabase.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.docs_guard() FROM PUBLIC, anon, authenticated;
-- Los triggers vinculados a las funciones deben seguir funcionando;
-- confirmar con pruebas en entorno aislado antes de producción.
COMMIT;

-- Comprobación posterior, solo lectura:
-- SELECT p.proname,
--        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
--        has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname IN
-- ('handle_new_user','rls_auto_enable','docs_guard');
