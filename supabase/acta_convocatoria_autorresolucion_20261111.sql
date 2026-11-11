-- Resolver cada tipo de aviso independientemente cuando una jornada se completa.
begin;
create or replace function public.banquillo_resolve_notice_from_doc()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_n integer;v_date date;v_kind text;v_solved boolean;r record;
begin
 if new.path not like 'seasons/'||new.season_id||'/matches/%'
 or coalesce(new.data->>'n','') !~ '^[0-9]{1,2}$' then return new;end if;
 v_n:=(new.data->>'n')::integer;
 if v_n not between 1 and 99 then return new;end if;
 if new.data->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  v_date:=(new.data->>'date')::date;
  if v_date>current_date then return new;end if;
 end if;
 foreach v_kind in array array['acta','convocatoria']
 loop
  v_solved=case v_kind
   when 'acta' then
   coalesce(new.data->>'ourGoals','') ~ '^[0-9]{1,3}$'
   and coalesce(new.data->>'rivalGoals','') ~ '^[0-9]{1,3}$'
   else coalesce(new.data->>'callDone','false')='true' end;
  if v_solved then
   for r in update public.banquillo_team_messages
    set resolved_at=now(),resolution='resuelto_al_guardar_jornada'
    where season_id=new.season_id and match_n=v_n
    and kind=v_kind and resolved_at is null
    returning id,club_id,team_id,kind
   loop
    insert into public.banquillo_director_events(club_id,team_id,message_id,kind,title)
    values(r.club_id,r.team_id,r.id,
    case when v_kind='acta' then 'acta_resuelta' else 'convocatoria_resuelta' end,
    case when v_kind='acta' then 'Acta cerrada · Jornada '||v_n
    else 'Convocatoria confirmada · Jornada '||v_n end);
   end loop;
  end if;
 end loop;
 return new;
end $fn$;
revoke all on function public.banquillo_resolve_notice_from_doc() from public,anon,authenticated;
commit;