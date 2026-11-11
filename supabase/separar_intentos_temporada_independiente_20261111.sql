begin;
create or replace function public.join_season(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v text;m public.seasons_meta;fails integer;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'error','not_authenticated');end if;
 v:=upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
 select count(*) into fails from public.join_attempts
 where user_id=auth.uid() and flow='season' and at>now()-interval '10 minutes';
 if fails>=5 then return jsonb_build_object('ok',false,'error','too_many_attempts','retry_after_minutes',10);end if;
 select * into m from public.seasons_meta where join_code=v and code_enabled;
 if not found then
  insert into public.join_attempts(user_id,flow) values(auth.uid(),'season');
  return jsonb_build_object('ok',false,'error','invalid_code');end if;
 if exists(select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.season_id=m.season_id and t.archived_at is null)
 then return jsonb_build_object('ok',false,'error','use_team_code');end if;
 insert into public.season_members(season_id,user_id,role)
 values(m.season_id,auth.uid(),'editor')
 on conflict(season_id,user_id) do nothing;
 return jsonb_build_object('ok',true,'season_id',m.season_id);
end $fn$;
revoke all on function public.join_season(text) from public,anon;
grant execute on function public.join_season(text) to authenticated;
commit;