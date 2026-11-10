-- Auditoría no invasiva. Solo staging: opfujvhgqrweyaaqquif.
-- No consulta nombres, emails, contraseñas ni documentos privados.
BEGIN READ ONLY;

SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN
   ('docs','profiles','seasons_meta','season_members','join_attempts')
     AND c.relkind IN ('r','p') AND c.relrowsecurity) = 5 AS all_five_rls_on,
  NOT has_table_privilege('anon','public.docs','SELECT') AS anon_cannot_read_docs,
  NOT has_table_privilege('anon','public.season_members','SELECT') AS anon_cannot_read_members,
  NOT has_function_privilege('anon','public.spend_tokens(uuid,integer)','EXECUTE') AS anon_cannot_spend,
  NOT has_function_privilege('authenticated','public.spend_tokens(uuid,integer)','EXECUTE') AS authenticated_cannot_spend,
  NOT has_function_privilege('authenticated','public.handle_new_user()','EXECUTE') AS signup_trigger_not_directly_callable,
  NOT has_function_privilege('authenticated','public.docs_guard()','EXECUTE') AS docs_trigger_not_directly_callable,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created' AND tgenabled='O') AS signup_trigger_active,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='docs_guard_trg' AND tgenabled='O') AS docs_guard_trigger_active;

-- Solo recuentos (no extraer datos reales).
SELECT
  (SELECT count(*) FROM auth.users) AS staging_auth_users,
  (SELECT count(*) FROM public.seasons_meta) AS staging_seasons,
  (SELECT count(*) FROM public.docs) AS staging_docs;
ROLLBACK;
