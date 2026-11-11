-- Preparación automática de temporadas de equipos del club: un único flujo.
begin;

create or replace function public.banquillo_provision_team_season(p_team_id uuid)
returns text language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams;v_club public.banquillo_clubs;v_sid text;v_code text;v_n integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select t.* into v_team from public.banquillo_teams t
 where t.id=p_team_id and t.archived_at is null for update;
 if v_team.id is null then raise exception 'team_not_found';end if;
 select * into v_club from public.banquillo_clubs c where c.id=v_team.club_id and c.deleted_at is null;
 if v_club.id is null or not(v_club.owner_id=auth.uid() or exists(
  select 1 from public.banquillo_club_directors d
  where d.club_id=v_club.id and d.user_id=auth.uid())) then raise exception 'not_team_manager';end if;
 if not exists(select 1 from public.banquillo_club_seasons s
 where s.club_id=v_club.id and s.status='active') then raise exception 'club_season_closed';end if;
 if v_team.season_id is not null then return v_team.season_id;end if;
 select count(*) into v_n from public.seasons_meta where owner_id=v_club.owner_id;
 if v_n>=30 then raise exception 'too_many_seasons';end if;
 loop
 v_sid:='bq'||substr(replace(gen_random_uuid()::text,'-',''),1,27);
 exit when not exists(select 1 from public.seasons_meta where season_id=v_sid);
 end loop;
 loop
 v_code:=public.gen_join_code();
 exit when not exists(select 1 from public.seasons_meta where join_code=v_code);
 end loop;
 insert into public.seasons_meta(season_id,owner_id,join_code,code_enabled)
 values(v_sid,v_club.owner_id,v_code,false);
 insert into public.season_members(season_id,user_id,role)
 values(v_sid,v_club.owner_id,'owner');
 insert into public.season_members(season_id,user_id,role)
 select v_sid,d.user_id,'viewer' from public.banquillo_club_directors d
 where d.club_id=v_club.id and d.user_id<>v_club.owner_id
 on conflict(season_id,user_id) do nothing;
 insert into public.docs(season_id,path,data)
 values(v_sid,'seasons/'||v_sid,jsonb_build_object(
 'name',(select season_label from public.banquillo_club_seasons s
 where s.club_id=v_club.id and s.status='active' limit 1),
 'club',v_club.name,'category',v_team.category,'status','active',
 'settings',jsonb_build_object('matchMinutes',case when v_team.modality='F11' then 90 else 50 end),
 'createdAt',now()));
 update public.banquillo_teams set season_id=v_sid where id=p_team_id;
 return v_sid;
end $fn$;

create or replace function public.banquillo_create_club_team(
 p_club_id uuid,p_name text,p_modality text,p_category text,p_competition text default ''
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_club public.banquillo_clubs;v_team uuid;v_sid text;v_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select * into v_club from public.banquillo_clubs c
 where c.id=p_club_id and c.deleted_at is null;
 if v_club.id is null or not(v_club.owner_id=auth.uid() or exists(
 select 1 from public.banquillo_club_directors d
 where d.club_id=p_club_id and d.user_id=auth.uid())) then raise exception 'not_club_director';end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 100 or
 p_modality not in ('F7','F11') or
 length(coalesce(p_category,''))>60 or length(coalesce(p_competition,''))>100
 then raise exception 'invalid_team';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64025);
 select count(*) into v_count from public.banquillo_teams
 where club_id=p_club_id and archived_at is null;
 if v_count>=12 then raise exception 'team_limit';end if;
 if exists(select 1 from public.banquillo_teams t
 where t.club_id=p_club_id and t.archived_at is null
 and lower(btrim(t.name))=lower(btrim(p_name))) then raise exception 'team_name_exists';end if;
 insert into public.banquillo_teams(club_id,name,modality,category,competition,settings)
 values(p_club_id,btrim(p_name),p_modality,coalesce(p_category,''),
 coalesce(btrim(p_competition),''),jsonb_build_object(
 'matchMinutes',case when p_modality='F11' then 90 else 50 end))
 returning id into v_team;
 v_sid:=public.banquillo_provision_team_season(v_team);
 return jsonb_build_object('team_id',v_team,'season_id',v_sid,'ok',true);
end $fn$;

-- Al conceder acceso a un director se habilita consulta, NO edición ni recepción de avisos.
create or replace function public.banquillo_sync_director_season_access()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_op='INSERT' then
  insert into public.season_members(season_id,user_id,role)
  select distinct t.season_id,new.user_id,'viewer'
  from public.banquillo_teams t where t.club_id=new.club_id and t.season_id is not null
  on conflict(season_id,user_id) do nothing;
  return new;
 end if;
 if tg_op='DELETE' then
  delete from public.season_members sm
  where sm.user_id=old.user_id and sm.role='viewer'
  and exists(select 1 from public.banquillo_teams t
  where t.club_id=old.club_id and t.season_id=sm.season_id)
  and not exists(select 1 from public.banquillo_team_members tm
  where tm.user_id=old.user_id and tm.season_id=sm.season_id and tm.status='active');
  return old;
 end if;
 return null;
end $fn$;
drop trigger if exists bq_director_season_membership_trg on public.banquillo_club_directors;
create trigger bq_director_season_membership_trg
 after insert or delete on public.banquillo_club_directors
 for each row execute function public.banquillo_sync_director_season_access();

-- Evitar que una persona cambie de temporada a un equipo sin comprobación
-- de la propiedad del acceso deportivo (salvo creación automática desde SQL).
create or replace function public.banquillo_validate_team_season_link()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_owner uuid;
begin
 if new.season_id is null or new.season_id is not distinct from old.season_id then return new;end if;
 select c.owner_id into v_owner from public.banquillo_clubs c where c.id=new.club_id;
 if not exists(select 1 from public.seasons_meta sm where sm.season_id=new.season_id
 and (sm.owner_id=v_owner or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=new.club_id and d.user_id=sm.owner_id)))
 then raise exception 'season_owner_required';end if;
 return new;
end $fn$;
drop trigger if exists bq_team_season_link_guard_trg on public.banquillo_teams;
create trigger bq_team_season_link_guard_trg before update of season_id on public.banquillo_teams
for each row execute function public.banquillo_validate_team_season_link();

-- La función antigua de códigos de temporada no permite esquivar el código del equipo.
-- Evitar inserciones directas de equipos sin temporada (se crean por RPC).
revoke insert on public.banquillo_teams from authenticated,anon;

revoke all on function public.banquillo_provision_team_season(uuid) from public,anon;
revoke all on function public.banquillo_create_club_team(uuid,text,text,text,text) from public,anon;
revoke all on function public.banquillo_sync_director_season_access() from public,anon,authenticated;
revoke all on function public.banquillo_validate_team_season_link() from public,anon,authenticated;
grant execute on function public.banquillo_provision_team_season(uuid) to authenticated;
grant execute on function public.banquillo_create_club_team(uuid,text,text,text,text) to authenticated;
commit;