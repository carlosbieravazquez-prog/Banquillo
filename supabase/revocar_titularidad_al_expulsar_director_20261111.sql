-- Cambio de titularidad también de las temporadas deportivas, sin accesos residuales.
begin;
create or replace function public.banquillo_transfer_linked_seasons(
 p_club_id uuid,p_from uuid,p_to uuid
) returns void language plpgsql security definer set search_path='' as $fn$
declare r record;
begin
 if p_from=p_to then return;end if;
 for r in select distinct sm.season_id from public.seasons_meta sm
 join public.banquillo_teams t on t.season_id=sm.season_id
 where t.club_id=p_club_id and sm.owner_id=p_from
 loop
   update public.seasons_meta set owner_id=p_to where season_id=r.season_id;
   insert into public.season_members(season_id,user_id,role)
   values(r.season_id,p_to,'owner')
   on conflict(season_id,user_id) do update set role='owner';
   delete from public.season_members where season_id=r.season_id
   and user_id=p_from;
 end loop;
 -- Si la persona saliente también era entrenadora, ya no conserva acceso a ese club.
 update public.banquillo_team_members
 set status='removed',position=null,role_detail='',updated_at=now(),
 approved_at=null,approved_by=null
 where user_id=p_from and team_id in(
 select id from public.banquillo_teams where club_id=p_club_id);
 delete from public.season_members sm where sm.user_id=p_from
 and sm.role<>'owner' and exists(select 1 from public.banquillo_teams t
 where t.club_id=p_club_id and t.season_id=sm.season_id);
end $fn$;

create or replace function public.banquillo_eject_director(
 p_club_id uuid,p_target_id uuid
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_owner uuid;v_is_other boolean;v_actor uuid:=auth.uid();
begin
 if v_actor is null or p_target_id=v_actor then raise exception 'use_leave_for_self';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64018);
 select owner_id into v_owner from public.banquillo_clubs
 where id=p_club_id and deleted_at is null for update;
 if v_owner is null then raise exception 'club_not_found';end if;
 v_is_other=exists(select 1 from public.banquillo_club_directors
 where club_id=p_club_id and user_id=v_actor);
 if v_owner<>v_actor and not v_is_other then raise exception 'not_club_director';end if;
 if p_target_id=v_owner then
   if not v_is_other then raise exception 'director_not_found';end if;
   perform public.banquillo_transfer_linked_seasons(p_club_id,v_owner,v_actor);
   update public.banquillo_club_seasons set owner_id=v_actor where club_id=p_club_id;
   update public.banquillo_clubs set owner_id=v_actor where id=p_club_id;
   delete from public.banquillo_club_directors where club_id=p_club_id and user_id=v_actor;
 else
   if v_owner<>v_actor or not exists(select 1 from public.banquillo_club_directors
   where club_id=p_club_id and user_id=p_target_id) then raise exception 'target_not_eligible';end if;
   perform public.banquillo_transfer_linked_seasons(p_club_id,p_target_id,v_owner);
   delete from public.banquillo_club_directors where club_id=p_club_id and user_id=p_target_id;
 end if;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 return true;
end $fn$;

create or replace function public.banquillo_leave_club(p_club_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_owner uuid;v_other uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64018);
 select owner_id into v_owner from public.banquillo_clubs
 where id=p_club_id and deleted_at is null for update;
 if v_owner=auth.uid() then
  select user_id into v_other from public.banquillo_club_directors where club_id=p_club_id;
  if v_other is null then raise exception 'owner_must_close_or_delete';end if;
  perform public.banquillo_transfer_linked_seasons(p_club_id,v_owner,v_other);
  update public.banquillo_club_seasons set owner_id=v_other where club_id=p_club_id;
  update public.banquillo_clubs set owner_id=v_other where id=p_club_id;
  delete from public.banquillo_club_directors where club_id=p_club_id and user_id=v_other;
 elsif exists(select 1 from public.banquillo_club_directors
 where club_id=p_club_id and user_id=auth.uid()) then
  perform public.banquillo_transfer_linked_seasons(p_club_id,auth.uid(),v_owner);
  delete from public.banquillo_club_directors
  where club_id=p_club_id and user_id=auth.uid();
 else raise exception 'not_club_director';end if;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 return true;
end $fn$;

revoke all on function public.banquillo_transfer_linked_seasons(uuid,uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.banquillo_eject_director(uuid,uuid) from public,anon;
revoke all on function public.banquillo_leave_club(uuid) from public,anon;
grant execute on function public.banquillo_eject_director(uuid,uuid) to authenticated;
grant execute on function public.banquillo_leave_club(uuid) to authenticated;
commit;