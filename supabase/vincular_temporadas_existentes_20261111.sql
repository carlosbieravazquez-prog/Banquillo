-- Adaptar temporadas ya existentes al flujo exclusivo de códigos de equipo.
begin;
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
 if exists(select 1 from public.banquillo_teams t
  where t.season_id=new.season_id and t.id<>new.id and t.archived_at is null)
 then raise exception 'season_already_assigned';end if;
 return new;
end $fn$;

create or replace function public.banquillo_sync_legacy_linked_members()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_club_owner uuid;
begin
 if new.season_id is null or new.season_id is not distinct from old.season_id then return new;end if;
 select owner_id into v_club_owner from public.banquillo_clubs where id=new.club_id;
 -- Un antiguo código general ya no puede incorporar entrenadores directamente.
 update public.seasons_meta set code_enabled=false where season_id=new.season_id;
 -- La cuenta de quien ya compartía la temporada sigue siendo una cuenta real.
 -- Se registra sin cargo, pendiente de clasificación por Dirección Deportiva.
 insert into public.banquillo_team_members
  (team_id,user_id,season_id,status,position,approved_at,updated_at)
 select new.id,m.user_id,new.season_id,'active',null,m.joined_at,now()
 from public.season_members m where m.season_id=new.season_id
  and m.user_id<>v_club_owner
  and not exists(select 1 from public.banquillo_club_directors d
   where d.club_id=new.club_id and d.user_id=m.user_id)
 on conflict(team_id,user_id) do nothing;
 -- Ambos DD pueden consultar la temporada, sin posibilidad de editar como entrenador.
 insert into public.season_members(season_id,user_id,role)
 select new.season_id,d.user_id,'viewer' from public.banquillo_club_directors d
 where d.club_id=new.club_id
 on conflict(season_id,user_id) do nothing;
 return new;
end $fn$;
drop trigger if exists bq_sync_legacy_linked_members_trg on public.banquillo_teams;
create trigger bq_sync_legacy_linked_members_trg after update of season_id on public.banquillo_teams
for each row execute function public.banquillo_sync_legacy_linked_members();

revoke all on function public.banquillo_validate_team_season_link() from public,anon,authenticated;
revoke all on function public.banquillo_sync_legacy_linked_members() from public,anon,authenticated;
commit;