-- Eliminar club de forma recuperable revoca también permisos deportivos de terceros.
-- Se conservan datos, plantillas y actas para restauración por el titular.
begin;
create or replace function public.banquillo_delete_club(
 p_club_id uuid,p_confirm_name text
) returns boolean language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_clubs;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select * into v from public.banquillo_clubs where id=p_club_id for update;
 if v.id is null or v.owner_id<>auth.uid() or v.deleted_at is not null
 then raise exception 'not_club_owner';end if;
 if btrim(coalesce(p_confirm_name,''))<>v.name
 then raise exception 'club_name_mismatch';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64018);
 -- No dejar entrenadores con permisos activos en un club eliminado.
 update public.banquillo_team_members m
 set status='removed',position=null,role_detail='',updated_at=now(),
 approved_at=null,approved_by=null
 where m.team_id in(select id from public.banquillo_teams where club_id=p_club_id)
 and m.status in('pending','active','rejected');
 delete from public.season_members sm
 where sm.season_id in(select t.season_id from public.banquillo_teams t
 where t.club_id=p_club_id and t.season_id is not null)
 and sm.user_id<>v.owner_id and sm.role<>'owner';
 delete from public.banquillo_club_directors where club_id=p_club_id;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 delete from public.banquillo_team_codes where team_id in
 (select id from public.banquillo_teams where club_id=p_club_id);
 update public.banquillo_club_seasons
 set status='closed',closed_at=coalesce(closed_at,now())
 where club_id=p_club_id and status='active';
 update public.banquillo_clubs set deleted_at=now() where id=p_club_id;
 perform public.banquillo_refund_management('club',p_club_id::text);
 return true;
end $fn$;
revoke execute on function public.banquillo_delete_club(uuid,text) from public,anon;
grant execute on function public.banquillo_delete_club(uuid,text) to authenticated;
commit;