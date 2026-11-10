-- Banquillo · Test RLS entre temporadas (SOLO LECTURA)
-- Ejecutar desde el SQL Editor como administrador del proyecto de pruebas.
-- Selecciona un usuario existente que pertenezca a exactamente una temporada.
-- No muestra identificadores, contraseñas, correos, nombres ni JSON de jugadores.
-- No crea ni modifica filas. Todos los cambios de rol/claims son LOCAL a la transacción.
BEGIN READ ONLY;
DO $$
DECLARE test_user uuid; own_season text; foreign_season text;
BEGIN
  SELECT sm.user_id, min(sm.season_id)
    INTO test_user, own_season
    FROM public.season_members sm
    GROUP BY sm.user_id
    HAVING COUNT(DISTINCT sm.season_id) = 1
    LIMIT 1;
  IF test_user IS NULL THEN RAISE EXCEPTION 'No user with exactly one season; test inconclusive'; END IF;
  SELECT s.season_id INTO foreign_season
    FROM public.seasons_meta s WHERE s.season_id <> own_season
    ORDER BY s.season_id LIMIT 1;
  IF foreign_season IS NULL THEN RAISE EXCEPTION 'Need at least two seasons'; END IF;
  PERFORM set_config('request.jwt.claim.sub', test_user::text, true);
  PERFORM set_config('app.audit_own_sid', own_season, true);
  PERFORM set_config('app.audit_foreign_sid', foreign_season, true);
END $$;
SET LOCAL ROLE authenticated;
SELECT
  public.is_member(current_setting('app.audit_own_sid')) AS own_membership,
  (SELECT COUNT(*) FROM public.docs WHERE season_id = current_setting('app.audit_own_sid')) AS own_docs_visible,
  public.is_member(current_setting('app.audit_foreign_sid')) AS foreign_membership,
  public.can_edit(current_setting('app.audit_foreign_sid')) AS foreign_edit_permission,
  (SELECT COUNT(*) FROM public.docs WHERE season_id = current_setting('app.audit_foreign_sid')) AS foreign_docs_visible;
ROLLBACK;

-- Expect: own_membership=true, own_docs_visible>0,
-- foreign_membership=false, foreign_edit_permission=false, foreign_docs_visible=0.
-- This does not test DML writes, JWT expiry, or user permissions in the web UI.
