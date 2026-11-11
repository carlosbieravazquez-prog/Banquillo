-- Staging: resolver al instante los avisos cuando se cierre un acta real.
create or replace function public.bq_close_notice_from_doc()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.path like 'seasons/'||new.season_id||'/matches/%'
   and coalesce(new.data->>'closed','false')='true' then
   update public.bq_team_notices set resolved_at=coalesce(resolved_at,now())
   where season_id=new.season_id and match_path=new.path and resolved_at is null;
 end if;
 return new;
end;
$$;
revoke all on function public.bq_close_notice_from_doc() from public,anon,authenticated;
drop trigger if exists bq_notice_match_closed on public.docs;
create trigger bq_notice_match_closed
after insert or update of data on public.docs
for each row execute function public.bq_close_notice_from_doc();
