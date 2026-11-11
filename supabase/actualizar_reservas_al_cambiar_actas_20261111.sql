-- Si el entrenador cambia fecha/localía o borra un acta, la reserva obsoleta se retira.
-- No modificar automáticamente la fecha de una reserva sin volver a verificar colisiones.
begin;
create or replace function public.banquillo_drop_outdated_match_schedule()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if TG_OP='DELETE' then
  if old.path like '%/matches/%' then
   delete from public.banquillo_match_schedules
   where season_id=old.season_id and match_path=old.path;
  end if;
  return old;
 end if;
 if new.path like '%/matches/%' and (
   new.data->>'date' is distinct from old.data->>'date'
   or new.data->>'home' is distinct from old.data->>'home'
   or new.data->>'rest' is distinct from old.data->>'rest'
 ) then
  delete from public.banquillo_match_schedules
  where season_id=new.season_id and match_path=new.path;
 end if;
 return new;
end $fn$;
drop trigger if exists banquillo_clean_schedule_on_doc_change on public.docs;
create trigger banquillo_clean_schedule_on_doc_change
after update of data or delete on public.docs
for each row execute function public.banquillo_drop_outdated_match_schedule();
revoke all on function public.banquillo_drop_outdated_match_schedule() from public,anon,authenticated;
commit;