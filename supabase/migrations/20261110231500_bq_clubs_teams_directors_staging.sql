-- BETA / STAGING exclusivamente. No ejecutar en Supabase de producción.
-- Clubes: 1-2 directores con los mismos derechos sobre cada equipo,
-- códigos separados por equipo, entrenadores sólo con acceso a su propia temporada.
create table if not exists public.bq_clubs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 2 and 90),
 town text not null default '' check (length(town)<=80),
 province text not null default '' check (length(province)<=80),
 season_label text not null check (season_label ~ '^[0-9]{4}[/][0-9]{2,4}$'),
 settings jsonb not null default '{}'::jsonb check (pg_column_size(settings)<100000),
 facilities jsonb not null default '{"f11":1,"f7":0,"divisible":[true]}'::jsonb check (pg_column_size(facilities)<8000),
 created_at timestamptz not null default now()
);
create index if not exists bq_clubs_owner_idx on public.bq_clubs(owner_id);
create table if not exists public.bq_club_directors (
 club_id uuid not null references public.bq_clubs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','director')),
 preferred text not null default 'F7' check (preferred in ('F7','F11')),
 joined_at timestamptz not null default now(),
 primary key(club_id,user_id)
);
create index if not exists bq_club_directors_user_idx on public.bq_club_directors(user_id);
create table if not exists public.bq_club_teams (
 club_id uuid not null references public.bq_clubs(id) on delete cascade,
 season_id text primary key references public.seasons_meta(season_id) on delete cascade,
 name text not null check (length(btrim(name)) between 2 and 75),
 category text not null default '' check (length(category)<=60),
 modality text not null check (modality in ('F7','F11')),
 competition text not null default '' check (length(competition)<=100),
 created_at timestamptz not null default now()
);
create index if not exists bq_club_teams_club_idx on public.bq_club_teams(club_id);
create unique index if not exists bq_club_team_unique_name on public.bq_club_teams(club_id,lower(name));
alter table public.bq_clubs enable row level security;
alter table public.bq_club_directors enable row level security;
alter table public.bq_club_teams enable row level security;
revoke all on public.bq_clubs,public.bq_club_directors,public.bq_club_teams from public,anon,authenticated;

-- Todo acceso a directorio y a códigos pasa por funciones con comprobación explícita.
create or replace function public.bq_is_director(p_club uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.bq_club_directors d where d.club_id=p_club and d.user_id=auth.uid()
 );
$$;
create or replace function public.bq_clubs_list() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',c.id,'name',c.name,'town',c.town,'province',c.province,'season',c.season_label,
   'settings',c.settings,'facilities',c.facilities,'role',d.role,'preferred',d.preferred,
   'directors',coalesce((
     select jsonb_agg(jsonb_build_object('user_id',di.user_id,'role',di.role,
       'name',coalesce(p.display_name,''),'preferred',di.preferred) order by di.joined_at)
     from public.bq_club_directors di left join public.profiles p on p.user_id=di.user_id
     where di.club_id=c.id
   ),'[]'::jsonb),
   'teams',coalesce((
     select jsonb_agg(jsonb_build_object(
       'id',t.season_id,'name',t.name,'category',t.category,'modality',t.modality,
       'competition',t.competition,'code',m.join_code,'enabled',m.code_enabled,
       'member_count',(select count(*) from public.season_members x where x.season_id=t.season_id)
       ) order by t.name)
     from public.bq_club_teams t
     join public.seasons_meta m on m.season_id=t.season_id
     where t.club_id=c.id
   ),'[]'::jsonb)
 ) order by c.created_at) ,'[]'::jsonb)
 from public.bq_clubs c
 join public.bq_club_directors d on d.club_id=c.id and d.user_id=auth.uid();
$$;

create or replace function public.bq_create_club(
 p_name text,p_town text,p_province text,p_season text,p_settings jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 90
    or coalesce(p_season,'') !~ '^[0-9]{4}[/][0-9]{2,4}$'
    or length(coalesce(p_town,''))>80 or length(coalesce(p_province,''))>80
    or pg_column_size(coalesce(p_settings,'{}'::jsonb)) >= 100000 then raise exception 'invalid_club_data'; end if;
 if (select count(*) from public.bq_clubs where owner_id=auth.uid())>=5 then raise exception 'too_many_clubs'; end if;
 insert into public.bq_clubs(owner_id,name,town,province,season_label,settings)
 values(auth.uid(),btrim(p_name),btrim(coalesce(p_town,'')),btrim(coalesce(p_province,'')),p_season,coalesce(p_settings,'{}'::jsonb))
 returning id into v;
 insert into public.bq_club_directors(club_id,user_id,role) values(v,auth.uid(),'owner');
 return v;
end $$;

create or replace function public.bq_update_club(
 p_club uuid,p_name text,p_town text,p_province text,p_season text,p_settings jsonb,p_facilities jsonb
) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bq_is_director(p_club) then raise exception 'not_director'; end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 90
   or coalesce(p_season,'') !~ '^[0-9]{4}[/][0-9]{2,4}$'
   or length(coalesce(p_town,''))>80 or length(coalesce(p_province,''))>80
   or pg_column_size(coalesce(p_settings,'{}'::jsonb))>=100000
   or pg_column_size(coalesce(p_facilities,'{}'::jsonb))>=8000 then raise exception 'invalid_club_data'; end if;
 update public.bq_clubs set
   name=btrim(p_name),town=btrim(coalesce(p_town,'')),province=btrim(coalesce(p_province,'')),
   season_label=p_season,settings=coalesce(p_settings,'{}'::jsonb),
   facilities=coalesce(p_facilities,'{}'::jsonb)
 where id=p_club;
end $$;

-- La dirección deportiva crea SOLO una temporada vacía (sin plantilla/jornadas).
-- Se genera UN código único para ESTE equipo; nunca un código para todo el club.
create or replace function public.bq_create_team(
 p_club uuid,p_name text,p_category text,p_modality text,p_competition text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.bq_clubs; v_id text; v_code text; i integer;
begin
 if not public.bq_is_director(p_club) then raise exception 'not_director'; end if;
 select * into c from public.bq_clubs where id=p_club for update;
 if length(btrim(coalesce(p_name,''))) not between 2 and 75
   or coalesce(p_modality,'') not in ('F7','F11')
   or length(coalesce(p_category,''))>60 or length(coalesce(p_competition,''))>100 then
   raise exception 'invalid_team_data';end if;
 if (select count(*) from public.bq_club_teams where club_id=p_club)>=30 then
   raise exception 'too_many_teams';end if;
 if (select count(*) from public.seasons_meta where owner_id=c.owner_id)>=30 then
   raise exception 'too_many_seasons';end if;
 if exists(select 1 from public.bq_club_teams where club_id=p_club and lower(name)=lower(btrim(p_name))) then
   raise exception 'team_exists';end if;
 v_id:='bq_'||substr(replace(gen_random_uuid()::text,'-',''),1,26);
 loop
   v_code:=public.gen_join_code();
   exit when not exists(select 1 from public.seasons_meta where join_code=v_code);
 end loop;
 insert into public.seasons_meta(season_id,owner_id,join_code)
 values(v_id,c.owner_id,v_code);
 insert into public.season_members(season_id,user_id,role)
 select v_id,d.user_id,'owner' from public.bq_club_directors d where d.club_id=p_club;
 insert into public.docs(season_id,path,data)
 values(v_id,'seasons/'||v_id,jsonb_build_object(
   'name',c.season_label,'club',c.name,'category',btrim(p_name),
   'status','active','createdAt',now(),
   'settings',jsonb_build_object(
     'format',p_modality,'matchMinutes',50,'trainDays',jsonb_build_array(1,3),
     'crest',coalesce(c.settings->'crest','""'::jsonb),
     'kits',coalesce(c.settings->'kits','{}'::jsonb),
     'palette',coalesce(c.settings->'palette','{}'::jsonb)
   )));
 insert into public.docs(season_id,path,data)
 values(v_id,'seasons/'||v_id||'/training/main',
   '{"absences":{},"skipped":[],"extra":[]}'::jsonb);
 insert into public.bq_club_teams(club_id,season_id,name,category,modality,competition)
 values(p_club,v_id,btrim(p_name),btrim(coalesce(p_category,'')),p_modality,btrim(coalesce(p_competition,'')));
 return jsonb_build_object('season_id',v_id,'code',v_code);
end $$;

-- Dos directores como máximo. El segundo se vincula por CORREO YA REGISTRADO;
-- un código de entrenador jamás concede permisos de dirección.
create or replace function public.bq_add_director(p_club uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_user uuid;
begin
 select owner_id into v_owner from public.bq_clubs where id=p_club for update;
 if v_owner is distinct from auth.uid() then raise exception 'not_club_owner';end if;
 if (select count(*) from public.bq_club_directors where club_id=p_club)>=2 then
  raise exception 'two_directors_max';end if;
 select id into v_user from auth.users
  where lower(email)=lower(btrim(coalesce(p_email,''))) and email_confirmed_at is not null limit 1;
 if v_user is null then raise exception 'registered_email_required';end if;
 insert into public.bq_club_directors(club_id,user_id,role)
 values(p_club,v_user,'director');
 insert into public.season_members(season_id,user_id,role)
 select season_id,v_user,'owner' from public.bq_club_teams where club_id=p_club
 on conflict(season_id,user_id) do update set role='owner';
end $$;

create or replace function public.bq_remove_director(p_club uuid,p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
 select owner_id into v_owner from public.bq_clubs where id=p_club for update;
 if v_owner is distinct from auth.uid() or p_user=v_owner then raise exception 'not_club_owner';end if;
 if not exists(select 1 from public.bq_club_directors where club_id=p_club and user_id=p_user and role='director') then
  raise exception 'not_director';end if;
 delete from public.season_members m using public.bq_club_teams t
 where t.club_id=p_club and m.season_id=t.season_id and m.user_id=p_user;
 delete from public.bq_club_directors where club_id=p_club and user_id=p_user;
end $$;

create or replace function public.bq_set_director_preferred(p_club uuid,p_preferred text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_preferred not in ('F7','F11') then raise exception 'invalid_modality';end if;
 update public.bq_club_directors set preferred=p_preferred
 where club_id=p_club and user_id=auth.uid();
 if not found then raise exception 'not_director';end if;
end $$;

create or replace function public.bq_rotate_team_code(p_club uuid,p_season text)
returns text language plpgsql security definer set search_path='' as $$
declare v text;
begin
 if not public.bq_is_director(p_club) or not exists(
   select 1 from public.bq_club_teams where club_id=p_club and season_id=p_season
 ) then raise exception 'not_director';end if;
 loop
   v:=public.gen_join_code();
   exit when not exists(select 1 from public.seasons_meta where join_code=v);
 end loop;
 update public.seasons_meta set join_code=v,code_enabled=true where season_id=p_season;
 return v;
end $$;

create or replace function public.bq_set_team_code_enabled(p_club uuid,p_season text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bq_is_director(p_club) or not exists(
  select 1 from public.bq_club_teams where club_id=p_club and season_id=p_season
 ) then raise exception 'not_director';end if;
 update public.seasons_meta set code_enabled=coalesce(p_enabled,false) where season_id=p_season;
end $$;

-- Al no haber políticas RLS ni GRANT sobre tablas nuevas, los entrenadores no
-- pueden enumerar clubes, directores, códigos ni equipos; sólo su season_id.
-- Únicamente RPCs verificadas exponen a directores esta información.
do $$declare f text;
begin
 foreach f in array array[
  'bq_is_director(uuid)','bq_clubs_list()','bq_create_club(text,text,text,text,jsonb)',
  'bq_update_club(uuid,text,text,text,text,jsonb,jsonb)',
  'bq_create_team(uuid,text,text,text,text)',
  'bq_add_director(uuid,text)','bq_remove_director(uuid,uuid)',
  'bq_set_director_preferred(uuid,text)','bq_rotate_team_code(uuid,text)',
  'bq_set_team_code_enabled(uuid,text,boolean)'
 ] loop
  execute 'revoke all on function public.'||f||' from public,anon,authenticated';
  if f<>'bq_is_director(uuid)' then
    execute 'grant execute on function public.'||f||' to authenticated';
  end if;
 end loop;
end $$;
