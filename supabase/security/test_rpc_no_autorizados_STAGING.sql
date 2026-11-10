-- Banquillo staging: cuatro pruebas de rechazo RPC, sin datos de jugadores.
-- Ejecutar cada bloque POR SEPARADO, ya que cada error esperado aborta la transacción.
-- Un error de la función indicada es el resultado correcto; una ejecución correcta es un FALLO.
-- Solo ejecutar en proyecto staging opfujvhgqrweyaaqquif.
--
-- PRUEBA 1: propietario ajeno. Esperado: not_owner.
BEGIN READ ONLY;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
SET LOCAL ROLE authenticated;
SELECT public.season_share('staging-access-denied');
ROLLBACK;

-- PRUEBA 2: no miembro. Esperado: not_member.
BEGIN READ ONLY;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
SET LOCAL ROLE authenticated;
SELECT count(*) FROM public.season_members_list('staging-access-denied');
ROLLBACK;

-- PRUEBA 3: editor/externo sin permiso de administración. Esperado: not_owner.
BEGIN READ ONLY;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
SET LOCAL ROLE authenticated;
SELECT public.set_member_role('staging-access-denied','00000000-0000-4000-8000-000000000001','owner');
ROLLBACK;

-- PRUEBA 4: visitante anónimo. Esperado: permission denied.
BEGIN READ ONLY;
SET LOCAL ROLE anon;
SELECT public.my_profile();
ROLLBACK;

-- Estas pruebas no validan los casos positivos ni todas las operaciones de escritura.
