-- Banquillo Beta: temporadas de club y códigos individuales de equipos.
-- Complementa el modelo existente: no borra clubes, temporadas ni documentos.
begin;

create table if not exists public.banquillo_club_seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.banquillo_clubs(id) on delete restrict,
  owner_id uuid not null references auth.users(id),
  season_label text not null check (season_label ~ '^20[0-9]{2}/20[0-9]{2}$'),
  status text not null check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (club_id, season_label),
  unique (owner_id, season_label)
);
create unique index if not exists banquillo_one_active_club_per_owner
 on public.banquillo_club_seasons(owner_id) where status='active';
create index if not exists banquillo_club_seasons_club_idx
 on public.banquillo_club_seasons(club_id);
alter table public.banquillo_club_seasons enable row level security;
revoke all on public.banquillo_club_seasons from anon, authenticated;
grant select on public.banquillo_club_seasons to authenticated;
create policy "club_seasons_read" on public.banquillo_club_seasons
 for select to authenticated using (
  owner_id=(select auth.uid()) or exists(
   select 1 from public.banquillo_club_directors d
   where d.club_id=banquillo_club_seasons.club_id and d.user_id=(select auth.uid()))
 );

-- Se conserva el club preexistente y se vincula a 2026/2027.
-- En esta instalación había un único club antes de migrar.
insert into public.banquillo_club_seasons(club_id,owner_id,season_label,status)
select c.id,c.owner_id,'2026/2027','active'
from public.banquillo_clubs c
where not exists(select 1 from public.banquillo_club_seasons b where b.club_id=c.id)
on conflict do nothing;

-- No permitir eludir el control de temporada mediante insert directo.
revoke insert on public.banquillo_clubs from authenticated;

create or replace function public.banquillo_create_club(
 p_name text, p_season text default '2026/2027')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid; v_year integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 2 and 120
   then raise exception 'invalid_name'; end if;
 if p_season !~ '^20[0-9]{2}/20[0-9]{2}$'
  then raise exception 'invalid_season'; end if;
 v_year:=substring(p_season from 1 for 4)::int;
 if substring(p_season from 6 for 4)::int<>v_year+1
  then raise exception 'invalid_season'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),64021);
 if exists(select 1 from public.banquillo_club_seasons s
  where s.owner_id=auth.uid() and s.status='active')
  then raise exception 'active_club_exists'; end if;
 if exists(select 1 from public.banquillo_club_seasons s
  where s.owner_id=auth.uid() and s.season_label=p_season)
  then raise exception 'season_already_used'; end if;
 insert into public.banquillo_clubs(name,owner_id)
 values(btrim(p_name),auth.uid()) returning id into v_id;
 insert into public.banquillo_club_seasons(club_id,owner_id,season_label,status)
 values(v_id,auth.uid(),p_season,'active');
 return v_id;
end $fn$;

create or replace function public.banquillo_close_club_season(p_club_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 update public.banquillo_club_seasons s
 set status='closed',closed_at=now()
 where s.club_id=p_club_id and s.owner_id=auth.uid() and s.status='active';
 get diagnostics v_count=row_count;
 return v_count>0;
end $fn$;

create table if not exists public.banquillo_team_codes(
  team_id uuid primary key references public.banquillo_teams(id) on delete cascade,
  code text not null unique check (code ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now()
);
alter table public.banquillo_team_codes enable row level security;
revoke all on public.banquillo_team_codes from anon,authenticated;

-- Solo la dirección del club ve y rota el código.
create or replace function public.banquillo_team_code(p_team_id uuid,p_rotate boolean default false)
returns text language plpgsql security definer set search_path='' as $fn$
declare v_code text;
begin
 if auth.uid() is null or not exists(
   select 1 from public.banquillo_teams t
   join public.banquillo_clubs c on c.id=t.club_id
   where t.id=p_team_id and t.archived_at is null and
    (c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_team_manager'; end if;
 select code into v_code from public.banquillo_team_codes where team_id=p_team_id;
 if v_code is null or p_rotate then
   v_code:=replace(gen_random_uuid()::text,'-','');
   insert into public.banquillo_team_codes(team_id,code,created_at)
   values(p_team_id,v_code,now())
   on conflict(team_id) do update set code=excluded.code,created_at=now();
 end if;
 return v_code;
end $fn$;

-- Código individual de equipo: solo admite temporada vinculada.
-- La pertenencia concedida es editor, nunca propietario ni director.
create or replace function public.banquillo_join_team(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams; v_fails integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 select count(*) into v_fails from public.join_attempts
 where user_id=auth.uid() and at>now()-interval '15 minutes';
 if v_fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 if p_code is null or p_code !~ '^[a-f0-9]{32}$' then
   insert into public.join_attempts(user_id) values(auth.uid());
   return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 select t.* into v_team from public.banquillo_team_codes i
 join public.banquillo_teams t on t.id=i.team_id
 where i.code=p_code and t.archived_at is null and t.season_id is not null;
 if not found then
   insert into public.join_attempts(user_id) values(auth.uid());
   return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 perform pg_advisory_xact_lock(hashtext(v_team.season_id),64022);
 if (select count(*) from public.season_members where season_id=v_team.season_id)>=30
  then return jsonb_build_object('ok',false,'error','season_full'); end if;
 insert into public.season_members(season_id,user_id,role)
 values(v_team.season_id,auth.uid(),'editor')
 on conflict(season_id,user_id) do nothing;
 return jsonb_build_object('ok',true,'team_id',v_team.id,'season_id',v_team.season_id);
end $fn$;

revoke all on function public.banquillo_create_club(text,text) from public,anon;
revoke all on function public.banquillo_close_club_season(uuid) from public,anon;
revoke all on function public.banquillo_team_code(uuid,boolean) from public,anon;
revoke all on function public.banquillo_join_team(text) from public,anon;
grant execute on function public.banquillo_create_club(text,text) to authenticated;
grant execute on function public.banquillo_close_club_season(uuid) to authenticated;
grant execute on function public.banquillo_team_code(uuid,boolean) to authenticated;
grant execute on function public.banquillo_join_team(text) to authenticated;
commit;
