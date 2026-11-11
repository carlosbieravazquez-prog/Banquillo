-- Endurecimiento puntual: las funciones internas de triggers no son RPC de cliente.
begin;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
create index if not exists seasons_meta_owner_id_idx on public.seasons_meta(owner_id);
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated using(user_id = (select auth.uid()));
commit;