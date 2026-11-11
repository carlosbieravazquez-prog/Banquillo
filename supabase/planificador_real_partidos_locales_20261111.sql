-- Banquillo: planificador de partidos locales en producción, compartido en Supabase.
-- Los datos deportivos no se duplican ni se sustituyen por datos de demostración.
begin;
create table if not exists public.banquillo_match_schedules (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.banquillo_clubs(id) on delete cascade,
  team_id uuid not null references public.banquillo_teams(id) on delete cascade,
  season_id text not null,
  match_path text not null,
  match_n integer not null check(match_n between 1 and 99),
  match_date date not null,
  kickoff time without time zone not null,
  duration_minutes integer not null check(duration_minutes between 30 and 180),
  resource text not null check(resource ~ '^(f11|f7)-([1-9]|1[0-2])(-[ab])?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id,match_path)
);
create index if not exists bq_schedule_club_date on public.banquillo_match_schedules(club_id,match_date);
alter table public.banquillo_match_schedules enable row level security;
drop policy if exists bq_schedule_read_authorized on public.banquillo_match_schedules;
create policy bq_schedule_read_authorized on public.banquillo_match_schedules
for select to authenticated using (
  exists(select 1 from public.banquillo_clubs c where c.id=club_id
   and c.deleted_at is null and
   (c.owner_id=(select auth.uid()) or exists(
     select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=(select auth.uid()))))
  or exists(select 1 from public.season_members sm
    where sm.season_id=banquillo_match_schedules.season_id
    and sm.user_id=(select auth.uid()))
);
revoke all on public.banquillo_match_schedules from public,anon,authenticated;
grant select on public.banquillo_match_schedules to authenticated;

create or replace function public.banquillo_schedule_home_match(
 p_team_id uuid, p_match_path text, p_time text,
 p_duration_minutes integer, p_resource text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_uid uuid:=auth.uid();
 v_team public.banquillo_teams;
 v_doc public.docs;
 v_settings public.banquillo_club_settings;
 v_date date;
 v_kickoff time;
 v_match_n integer;
 v_parent text;
 v_number integer;
 v_f11 integer;
 v_f7 integer;
 v_divisible boolean;
 v_resource text:=lower(btrim(coalesce(p_resource,'')));
 v_from integer;
 v_to integer;
 v_exists boolean;
 v_id uuid;
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 select t.* into v_team from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.id=p_team_id and t.archived_at is null and c.deleted_at is null
 and(c.owner_id=v_uid or exists(
 select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=v_uid));
 if v_team.id is null then raise exception 'not_team_manager';end if;
 if v_team.season_id is null then raise exception 'team_requires_linked_season';end if;
 if length(coalesce(p_match_path,''))>160 or
 p_match_path !~ ('^seasons/'||v_team.season_id||'/matches/[^/]+$')
 then raise exception 'invalid_match_reference';end if;
 select * into v_doc from public.docs d where d.season_id=v_team.season_id and d.path=p_match_path;
 if v_doc.path is null or coalesce(v_doc.data->>'home','false')<>'true'
 or coalesce(v_doc.data->>'rest','false')='true' then raise exception 'only_home_match_can_be_scheduled';end if;
 v_date:=(v_doc.data->>'date')::date;
 v_match_n:=(v_doc.data->>'n')::integer;
 if v_date is null or v_match_n not between 1 and 99 then raise exception 'match_missing_date_or_round';end if;
 if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 then raise exception 'invalid_kickoff_time';end if;
 if p_duration_minutes is null or p_duration_minutes not between 30 and 180
 then raise exception 'invalid_match_duration';end if;
 v_kickoff:=p_time::time;
 v_from:=extract(hour from v_kickoff)::int*60+extract(minute from v_kickoff)::int;
 v_to:=v_from+p_duration_minutes;
 if v_to>1440 then raise exception 'match_exceeds_day';end if;
 if v_resource !~ '^(f11|f7)-([1-9]|1[0-2])(-[ab])?$'
 then raise exception 'invalid_field';end if;
 select * into v_settings from public.banquillo_club_settings where club_id=v_team.club_id;
 v_f11:=coalesce(v_settings.fields_f11,0);
 v_f7:=coalesce(v_settings.fields_f7,0);
 v_number:=split_part(v_resource,'-',2)::integer;
 if v_team.modality='F11' then
   if v_resource not ~ '^f11-([1-9]|1[0-2])$' or v_number>v_f11
   then raise exception 'field_not_available_for_f11';end if;
 elsif v_team.modality='F7' then
   if v_resource ~ '^f7-' then
      if v_resource not ~ '^f7-([1-9]|1[0-2])$' or v_number>v_f7
      then raise exception 'field_not_available_for_f7';end if;
   else
      v_divisible:=coalesce((v_settings.divisible->(v_number-1))::text='true',true);
      if v_resource !~ '^f11-([1-9]|1[0-2])-[ab]$' or
         v_number>v_f11 or not v_divisible
      then raise exception 'field_not_divisible';end if;
   end if;
 else raise exception 'invalid_team_modality';end if;
 -- Serializar asignaciones del club para evitar carreras simultáneas entre dos directores.
 perform pg_advisory_xact_lock(hashtext(v_team.club_id::text),77111);
 v_parent:=regexp_replace(v_resource,'-[ab]$','');
 select exists(
   select 1 from public.banquillo_match_schedules s
   where s.club_id=v_team.club_id and s.match_date=v_date
    and not(s.team_id=p_team_id and s.match_path=p_match_path)
    and (extract(hour from s.kickoff)::int*60+extract(minute from s.kickoff)::int)<v_to
    and (extract(hour from s.kickoff)::int*60+extract(minute from s.kickoff)::int+s.duration_minutes)>v_from
    and (
       s.team_id=p_team_id
       or s.resource=v_resource
       or (
        regexp_replace(s.resource,'-[ab]$','')=v_parent
        and (s.resource=v_parent or v_resource=v_parent)
       )
    )
 ) into v_exists;
 if v_exists then return jsonb_build_object('ok',false,'error','schedule_conflict');end if;
 insert into public.banquillo_match_schedules
 (club_id,team_id,season_id,match_path,match_n,match_date,kickoff,duration_minutes,resource,updated_at)
 values(v_team.club_id,p_team_id,v_team.season_id,p_match_path,v_match_n,v_date,v_kickoff,p_duration_minutes,v_resource,now())
 on conflict(team_id,match_path) do update set
  match_date=excluded.match_date,match_n=excluded.match_n,kickoff=excluded.kickoff,
  resource=excluded.resource,duration_minutes=excluded.duration_minutes,updated_at=now()
 returning id into v_id;
 return jsonb_build_object('ok',true,'id',v_id);
end $fn$;

create or replace function public.banquillo_unschedule_home_match(
 p_team_id uuid,p_match_path text
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_club uuid;v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 select t.club_id into v_club from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.id=p_team_id and c.deleted_at is null and
 (c.owner_id=v_uid or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=v_uid));
 if v_club is null then raise exception 'not_team_manager';end if;
 perform pg_advisory_xact_lock(hashtext(v_club::text),77111);
 delete from public.banquillo_match_schedules
 where team_id=p_team_id and club_id=v_club and match_path=p_match_path;
 return true;
end $fn$;
revoke all on function public.banquillo_schedule_home_match(uuid,text,text,integer,text) from public,anon;
revoke all on function public.banquillo_unschedule_home_match(uuid,text) from public,anon;
grant execute on function public.banquillo_schedule_home_match(uuid,text,text,integer,text) to authenticated;
grant execute on function public.banquillo_unschedule_home_match(uuid,text) to authenticated;
commit;