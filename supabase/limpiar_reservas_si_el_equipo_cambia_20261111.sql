begin;
create or replace function public.banquillo_drop_schedule_on_team_change()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.modality is distinct from old.modality
   or (old.archived_at is null and new.archived_at is not null)
   or new.season_id is distinct from old.season_id then
  delete from public.banquillo_match_schedules where team_id=new.id;
 end if;
 return new;
end $fn$;
drop trigger if exists banquillo_clean_schedule_on_team_change on public.banquillo_teams;
create trigger banquillo_clean_schedule_on_team_change
after update of modality,archived_at,season_id on public.banquillo_teams
for each row execute function public.banquillo_drop_schedule_on_team_change();
revoke all on function public.banquillo_drop_schedule_on_team_change()
from public,anon,authenticated;
commit;