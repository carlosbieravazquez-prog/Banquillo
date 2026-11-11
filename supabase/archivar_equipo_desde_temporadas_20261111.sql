-- Retirar un equipo del listado activo sin perder estadísticas ni partidos.
begin;
create or replace function public.banquillo_archive_club_team(p_team_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_teams;v_rows integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select t.* into v from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.id=p_team_id
 and(c.owner_id=auth.uid() or exists(
  select 1 from public.banquillo_club_directors d
  where d.club_id=c.id and d.user_id=auth.uid()))
 for update of t;
 if v.id is null then raise exception 'not_team_manager';end if;
 if v.archived_at is not null then return jsonb_build_object('ok',true,'already_archived',true);end if;
 update public.banquillo_teams
 set archived_at=now() where id=p_team_id and archived_at is null;
 get diagnostics v_rows=row_count;
 if v_rows<>1 then raise exception 'archive_failed';end if;
 -- Un código de un equipo retirado ya no debe invitar a nuevos miembros.
 delete from public.banquillo_team_codes where team_id=p_team_id;
 return jsonb_build_object('ok',true,'archived',true,'team_id',p_team_id);
end $fn$;
revoke execute on function public.banquillo_archive_club_team(uuid) from public,anon;
grant execute on function public.banquillo_archive_club_team(uuid) to authenticated;
commit;