-- BANQUILLO · Comprobación repetible SOLO LECTURA del esquema y privilegios
-- Devuelve ocho booleanos: todos deben ser true.
-- No lee filas de jugadores, datos personales, correos ni contraseñas.
SELECT
  (SELECT bool_and(c.relrowsecurity)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('docs','profiles','season_members','seasons_meta','join_attempts')
     AND c.relkind IN ('r','p')) AS all_five_rls_enabled,
  NOT has_table_privilege('anon','public.docs','SELECT') AS anonymous_docs_blocked,
  NOT has_table_privilege('anon','public.season_members','SELECT') AS anonymous_members_blocked,
  NOT has_function_privilege('anon','public.spend_tokens(uuid,integer)','EXECUTE') AS anonymous_cannot_spend_tokens,
  NOT has_function_privilege('authenticated','public.spend_tokens(uuid,integer)','EXECUTE') AS authenticated_cannot_spend_tokens,
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='docs' AND cmd='SELECT' AND qual LIKE '%is_member%') AS docs_select_by_member,
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='docs' AND cmd='UPDATE' AND qual LIKE '%can_edit%' AND with_check LIKE '%can_edit%') AS docs_update_by_editor,
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT' AND qual LIKE '%auth.uid%') AS profile_select_own;
-- Nota: estas comprobaciones verifican configuración estructural,
-- no prueban el comportamiento DML de todos los roles.
