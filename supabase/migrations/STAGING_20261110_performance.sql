-- Solo proyecto Banquillo-Staging. Evaluar con pruebas antes de incorporar al esquema oficial.
-- Mejora de consultas por propietario y evaluación estable de autenticación.
CREATE INDEX IF NOT EXISTS seasons_meta_owner_id_idx ON public.seasons_meta(owner_id);
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
