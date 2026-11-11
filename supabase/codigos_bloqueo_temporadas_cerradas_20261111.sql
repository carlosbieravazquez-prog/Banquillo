-- No se admiten nuevas incorporaciones a equipos de un club cuya temporada esté cerrada.
begin;
create or replace function public.banquillo_join_team(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams; v_fails integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select count(*) into v_fails from public.join_attempts
 where user_id=auth.uid() and at>now()-interval '15 minutes';
 if v_fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 if p_code is null or p_code !~ '^[a-f0-9]{32}$' then
   insert into public.join_attempts(user_id) values(auth.uid());
   return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 select t.* into v_team from public.banquillo_team_codes i
 join public.banquillo_teams t on t.id=i.team_id
 where i.code=p_code and t.archived_at is null and t.season_id is not null
   and exists(select 1 from public.banquillo_club_seasons s
      where s.club_id=t.club_id and s.status='active');
 if not found then
   insert into public.join_attempts(user_id) values(auth.uid());
   return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 perform pg_advisory_xact_lock(hashtext(v_team.season_id),64022);
 if (select count(*) from public.season_members where season_id=v_team.season_id)>=30
 then return jsonb_build_object('ok',false,'error','season_full');end if;
 insert into public.season_members(season_id,user_id,role)
 values(v_team.season_id,auth.uid(),'editor')
 on conflict(season_id,user_id) do nothing;
 return jsonb_build_object('ok',true,'team_id',v_team.id,'season_id',v_team.season_id);
end $fn$;
revoke all on function public.banquillo_join_team(text) from public,anon;
grant execute on function public.banquillo_join_team(text) to authenticated;
commit;