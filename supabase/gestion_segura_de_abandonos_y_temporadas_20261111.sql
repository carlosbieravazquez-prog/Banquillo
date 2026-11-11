-- Banquillo: distinguir temporadas individuales, equipos de club y direcciones.
-- Toda baja propia elimina permisos, pero nunca las actas de otros miembros.
begin;

create or replace function public.banquillo_my_season_context()
returns table(season_id text, team_id uuid, club_id uuid,
 team_name text, club_name text, manager boolean, archived boolean)
language sql stable security definer set search_path='' as $fn$
 select distinct on(t.season_id)
  t.season_id,t.id,t.club_id,t.name,c.name,
  (c.owner_id=auth.uid() or exists(
   select 1 from public.banquillo_club_directors d
   where d.club_id=c.id and d.user_id=auth.uid())) as manager,
  (t.archived_at is not null or c.deleted_at is not null) as archived
 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.season_id is not null and auth.uid() is not null
 and (
   exists(select 1 from public.season_members sm where
    sm.season_id=t.season_id and sm.user_id=auth.uid())
   or c.owner_id=auth.uid()
   or exists(select 1 from public.banquillo_club_directors d
    where d.club_id=c.id and d.user_id=auth.uid())
 )
 order by t.season_id,t.created_at desc;
$fn$;

-- Salir del equipo propio no es "expulsar" a otra persona.
create or replace function public.banquillo_leave_team(p_team_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams;v_uid uuid:=auth.uid();
 v_status text;
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 perform pg_advisory_xact_lock(hashtext(p_team_id::text),64022);
 select * into v_team from public.banquillo_teams where id=p_team_id;
 if v_team.id is null then raise exception 'team_not_found';end if;
 if exists(select 1 from public.banquillo_clubs c
  where c.id=v_team.club_id and
  (c.owner_id=v_uid or exists(select 1 from public.banquillo_club_directors d
   where d.club_id=c.id and d.user_id=v_uid)))
 then raise exception 'director_leave_via_club';end if;
 if exists(select 1 from public.season_members sm
 where sm.season_id=v_team.season_id and sm.user_id=v_uid and sm.role='owner')
 then raise exception 'season_owner_transfer_required';end if;
 select status into v_status from public.banquillo_team_members
 where team_id=p_team_id and user_id=v_uid for update;
 if v_status is null or v_status not in('active','pending','rejected')
 then raise exception 'not_team_member';end if;
 update public.banquillo_team_members
 set status='removed',position=null,role_detail='',
 approved_at=null,approved_by=null,updated_at=now()
 where team_id=p_team_id and user_id=v_uid;
 if not exists(select 1 from public.banquillo_team_members m
 where m.season_id=v_team.season_id and m.user_id=v_uid and m.status='active')
 then delete from public.season_members sm
 where sm.season_id=v_team.season_id and sm.user_id=v_uid and sm.role<>'owner';
 end if;
 return jsonb_build_object('ok',true,'team_id',p_team_id,'status','removed');
end $fn$;

-- Cerrar antiguos atajos que daban de baja de la temporada, pero dejaban
-- el cargo activo en el directorio de personal técnico.
create or replace function public.leave_season(sid text)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if public.is_owner(sid) then raise exception 'owner_cannot_leave';end if;
 if exists(select 1 from public.banquillo_teams t where t.season_id=sid)
 then raise exception 'managed_team_use_leave_team';end if;
 delete from public.season_members
 where season_id=sid and user_id=auth.uid() and role<>'owner';
end $fn$;

-- No permitir eliminar un equipo vinculado a un club usando la API
-- antigua de temporadas (se archivaría desde Dirección Deportiva).
create or replace function public.delete_season(sid text)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not public.is_owner(sid)
 then raise exception 'not_owner';end if;
 if exists(select 1 from public.banquillo_teams t where t.season_id=sid)
 then raise exception 'managed_team_use_director';end if;
 perform public.banquillo_refund_management('solo_team',sid);
 delete from public.seasons_meta where season_id=sid;
end $fn$;

revoke execute on function public.banquillo_my_season_context()
 from public,anon;
revoke execute on function public.banquillo_leave_team(uuid)
 from public,anon;
revoke execute on function public.delete_season(text)
 from public,anon;
revoke execute on function public.leave_season(text)
 from public,anon;
grant execute on function public.banquillo_my_season_context() to authenticated;
grant execute on function public.banquillo_leave_team(uuid) to authenticated;
grant execute on function public.delete_season(text) to authenticated;
grant execute on function public.leave_season(text) to authenticated;
commit;