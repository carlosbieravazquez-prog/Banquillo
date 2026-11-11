-- Exclusivo de BANQUILLO STAGING.
-- Dar de baja al entrenador de UN equipo y anular su código anterior en una transacción.
-- El usuario mantiene su cuenta, pero deja de formar parte de ese equipo.
create or replace function public.bq_team_coaches(p_club uuid,p_season text)
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or not public.bq_is_director(p_club)
    or not exists(select 1 from public.bq_club_teams
                  where club_id=p_club and season_id=p_season) then
    raise exception 'not_club_director' using errcode='42501';
 end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'user_id',m.user_id,
     'display_name',coalesce(nullif(btrim(p.display_name),''),'Entrenador'),
     'role',m.role,
     'joined_at',m.joined_at
   ) order by m.joined_at)
   from public.season_members m
   left join public.profiles p on p.user_id=m.user_id
   where m.season_id=p_season
     and m.role in ('editor','viewer')
     and not exists(select 1 from public.bq_club_directors d
                    where d.club_id=p_club and d.user_id=m.user_id)
 ),'[]'::jsonb);
end;
$$;
create or replace function public.bq_remove_team_coach(p_club uuid,p_season text,p_user uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_code text;
begin
 if auth.uid() is null or not public.bq_is_director(p_club) then
   raise exception 'not_club_director' using errcode='42501';
 end if;
 -- Bloqueo de la temporada: serializa bajas y rotaciones de códigos.
 perform 1 from public.seasons_meta m
 join public.bq_club_teams t on t.season_id=m.season_id
 where t.club_id=p_club and t.season_id=p_season
 for update of m;
 if not found then raise exception 'team_not_found'; end if;
 -- Un director y un responsable no se pueden eliminar desde "entrenadores".
 if exists(select 1 from public.bq_club_directors
           where club_id=p_club and user_id=p_user) then
   raise exception 'cannot_remove_director' using errcode='42501';
 end if;
 if not exists(select 1 from public.season_members
               where season_id=p_season and user_id=p_user and role in ('editor','viewer')) then
   raise exception 'not_a_team_coach';
 end if;
 delete from public.season_members
 where season_id=p_season and user_id=p_user and role in ('editor','viewer');
 -- Un código anterior ya no permite al miembro expulsado volver a unirse.
 loop
   v_code:=public.gen_join_code();
   exit when not exists(select 1 from public.seasons_meta where join_code=v_code);
 end loop;
 update public.seasons_meta set join_code=v_code where season_id=p_season;
 return jsonb_build_object('ok',true,'new_code',v_code);
end;
$$;
revoke all on function public.bq_team_coaches(uuid,text) from public,anon,authenticated;
revoke all on function public.bq_remove_team_coach(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.bq_team_coaches(uuid,text) to authenticated;
grant execute on function public.bq_remove_team_coach(uuid,text,uuid) to authenticated;
