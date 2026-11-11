-- Códigos de acceso cortos y límites de error separados por tipo.
-- 8 símbolos de un alfabeto de 32 caracteres sin 0/O/1/I: 40 bits de entropía.
begin;
alter table public.join_attempts add column if not exists flow text not null default 'legacy';
alter table public.join_attempts drop constraint if exists bq_attempt_flow_check;
alter table public.join_attempts add constraint bq_attempt_flow_check
 check(flow in ('legacy','team','club','season'));

alter table public.banquillo_team_codes drop constraint if exists banquillo_team_codes_code_check;
alter table public.banquillo_team_codes add constraint banquillo_team_codes_code_check
 check(code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' or code ~ '^[a-f0-9]{32}$');
alter table public.banquillo_club_codes drop constraint if exists banquillo_club_codes_code_check;
alter table public.banquillo_club_codes add constraint banquillo_club_codes_code_check
 check(code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' or code ~ '^[a-f0-9]{32}$');

create or replace function public.banquillo_short_invitation_code()
returns text language plpgsql volatile security invoker set search_path='' as $fn$
declare v_bytes bytea:=extensions.gen_random_bytes(8);
 v_alpha text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 v_code text:='';i integer;
begin
 for i in 0..7 loop
  v_code:=v_code||substr(v_alpha,1+(get_byte(v_bytes,i)%32),1);
 end loop;
 return v_code;
end $fn$;

-- Los códigos anteriores se sustituyen una sola vez para ofrecer 8 símbolos ya.
do $mig$
declare r record;c text;tries int;
begin
 for r in select team_id from public.banquillo_team_codes loop
  tries:=0;
  loop
   tries:=tries+1;
   if tries>50 then raise exception 'short_code_generation_exhausted';end if;
   c:=public.banquillo_short_invitation_code();
   if not exists(select 1 from public.banquillo_team_codes where code=c)
   and not exists(select 1 from public.banquillo_club_codes where code=c) then exit;end if;
  end loop;
  update public.banquillo_team_codes set code=c,created_at=now() where team_id=r.team_id;
 end loop;
 for r in select club_id from public.banquillo_club_codes loop
  tries:=0;
  loop
   tries:=tries+1;
   if tries>50 then raise exception 'short_code_generation_exhausted';end if;
   c:=public.banquillo_short_invitation_code();
   if not exists(select 1 from public.banquillo_team_codes where code=c)
   and not exists(select 1 from public.banquillo_club_codes where code=c) then exit;end if;
  end loop;
  update public.banquillo_club_codes set code=c,created_at=now()
  where club_id=r.club_id;
 end loop;
end $mig$;

create or replace function public.banquillo_team_code(p_team_id uuid,p_rotate boolean default false)
returns text language plpgsql security definer set search_path='' as $fn$
declare v text;v_tries integer:=0;
begin
 if auth.uid() is null or not exists(
 select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.id=p_team_id and t.archived_at is null and c.deleted_at is null
 and (c.owner_id=auth.uid() or exists(
 select 1 from public.banquillo_club_directors d where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_team_manager';end if;
 select code into v from public.banquillo_team_codes where team_id=p_team_id;
 if v is null or p_rotate or length(v)<>8 then
  loop
   v_tries:=v_tries+1;
   if v_tries>50 then raise exception 'code_generation_failed';end if;
   v:=public.banquillo_short_invitation_code();
   exit when not exists(select 1 from public.banquillo_team_codes where code=v)
    and not exists(select 1 from public.banquillo_club_codes where code=v);
  end loop;
  insert into public.banquillo_team_codes(team_id,code,created_at)
  values(p_team_id,v,now())
  on conflict(team_id) do update set code=excluded.code,created_at=now();
 end if;
 return v;
end $fn$;

create or replace function public.banquillo_director_invite(p_club_id uuid,p_rotate boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_code text;v_expires timestamptz;v_count integer;v_tries integer:=0;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if not exists(select 1 from public.banquillo_clubs c
 where c.id=p_club_id and c.deleted_at is null
 and(c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid())))
 then raise exception 'not_club_director';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64018);
 select count(*) into v_count from public.banquillo_club_directors where club_id=p_club_id;
 if v_count>=1 then return jsonb_build_object('available',false,'reason','director_limit');end if;
 select code,expires_at into v_code,v_expires from public.banquillo_club_codes where club_id=p_club_id;
 if p_rotate or v_code is null or length(v_code)<>8 or v_expires<=now() or v_expires is null then
  loop
   v_tries:=v_tries+1;
   if v_tries>50 then raise exception 'code_generation_failed';end if;
   v_code:=public.banquillo_short_invitation_code();
   exit when not exists(select 1 from public.banquillo_team_codes where code=v_code)
     and not exists(select 1 from public.banquillo_club_codes where code=v_code);
  end loop;
  v_expires:=now()+interval '10 minutes';
  insert into public.banquillo_club_codes(club_id,code,expires_at,created_at)
  values(p_club_id,v_code,v_expires,now())
  on conflict(club_id) do update set code=excluded.code,expires_at=excluded.expires_at,created_at=now();
 end if;
 return jsonb_build_object('available',true,'code',v_code,'expires_at',v_expires);
end $fn$;

create or replace function public.banquillo_join_team(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams;v_uid uuid:=auth.uid();v_fails integer;
 v_status text;v_code text:=upper(regexp_replace(btrim(coalesce(p_code,'')),'[[:space:]-]','','g'));
 v_lookup text;
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 if not exists(select 1 from auth.users u where u.id=v_uid and u.email_confirmed_at is not null)
 then return jsonb_build_object('ok',false,'error','email_not_verified');end if;
 -- Los intentos históricos y de otros tipos de códigos NO bloquean a este usuario.
 select count(*) into v_fails from public.join_attempts
 where user_id=v_uid and flow='team' and at>now()-interval '10 minutes';
 if v_fails>=5 then
  return jsonb_build_object('ok',false,'error','too_many_attempts','retry_after_minutes',10);end if;
 if v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
  and v_code !~ '^[0-9A-F]{32}$' then
  insert into public.join_attempts(user_id,flow) values(v_uid,'team');
  return jsonb_build_object('ok',false,'error','invalid_code');end if;
 v_lookup:=case when length(v_code)=32 then lower(v_code) else v_code end;
 select t.* into v_team from public.banquillo_team_codes i
 join public.banquillo_teams t on t.id=i.team_id and t.archived_at is null
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where i.code=v_lookup and t.season_id is not null
 and exists(select 1 from public.banquillo_club_seasons s
 where s.club_id=t.club_id and s.status='active');
 if not found then
  insert into public.join_attempts(user_id,flow) values(v_uid,'team');
  return jsonb_build_object('ok',false,'error','invalid_or_inactive_code');end if;
 if not exists(select 1 from public.seasons_meta sm where sm.season_id=v_team.season_id) then
  return jsonb_build_object('ok',false,'error','team_season_missing');end if;
 perform pg_advisory_xact_lock(hashtext(v_team.id::text),64022);
 select status into v_status from public.banquillo_team_members
 where team_id=v_team.id and user_id=v_uid;
 if v_status='active' then
  return jsonb_build_object('ok',true,'status','active','team_id',v_team.id,
  'team_name',v_team.name,'season_id',v_team.season_id);end if;
 if exists(select 1 from public.season_members sm where sm.season_id=v_team.season_id
  and sm.user_id=v_uid and sm.role='owner') then
  return jsonb_build_object('ok',false,'error','season_owner_cannot_request');end if;
 if v_status='pending' then
  return jsonb_build_object('ok',true,'status','pending','team_id',v_team.id,
  'team_name',v_team.name);end if;
 insert into public.banquillo_team_members(team_id,user_id,season_id,status,
 position,role_detail,requested_at,approved_at,approved_by,updated_at)
 values(v_team.id,v_uid,v_team.season_id,'pending',null,'',now(),null,null,now())
 on conflict(team_id,user_id) do update set
 status='pending',position=null,role_detail='',season_id=excluded.season_id,
 requested_at=now(),approved_at=null,approved_by=null,updated_at=now();
 return jsonb_build_object('ok',true,'status','pending','team_id',v_team.id,'team_name',v_team.name);
end $fn$;

create or replace function public.banquillo_join_club(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v uuid;n integer;fails integer;
 v_code text:=upper(regexp_replace(btrim(coalesce(p_code,'')),'[[:space:]-]','','g'));v_lookup text;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select count(*) into fails from public.join_attempts
 where user_id=auth.uid() and flow='club' and at>now()-interval '10 minutes';
 if fails>=5 then return jsonb_build_object('ok',false,'error','too_many_attempts','retry_after_minutes',10);end if;
 if v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
 and v_code !~ '^[0-9A-F]{32}$' then
  insert into public.join_attempts(user_id,flow) values(auth.uid(),'club');
  return jsonb_build_object('ok',false,'error','invalid_code');end if;
 v_lookup:=case when length(v_code)=32 then lower(v_code) else v_code end;
 select cc.club_id into v from public.banquillo_club_codes cc
 join public.banquillo_clubs c on c.id=cc.club_id and c.deleted_at is null
 where cc.code=v_lookup and cc.expires_at>now();
 if v is null then
  insert into public.join_attempts(user_id,flow) values(auth.uid(),'club');
  return jsonb_build_object('ok',false,'error','invalid_or_expired_code');end if;
 perform pg_advisory_xact_lock(hashtext(v::text),64018);
 if not exists(select 1 from public.banquillo_club_codes
 where club_id=v and code=v_lookup and expires_at>now()) then
  return jsonb_build_object('ok',false,'error','invalid_or_expired_code');end if;
 if exists(select 1 from public.banquillo_clubs where id=v and owner_id=auth.uid()) then
 return jsonb_build_object('ok',false,'error','owner_already');end if;
 if exists(select 1 from public.banquillo_club_directors where club_id=v and user_id=auth.uid()) then
 return jsonb_build_object('ok',true,'club_id',v);end if;
 select count(*) into n from public.banquillo_club_directors where club_id=v;
 if n>=1 then return jsonb_build_object('ok',false,'error','director_limit');end if;
 insert into public.banquillo_club_directors(club_id,user_id) values(v,auth.uid());
 delete from public.banquillo_club_codes where club_id=v;
 return jsonb_build_object('ok',true,'club_id',v);
end $fn$;

revoke all on function public.banquillo_short_invitation_code() from public,anon,authenticated;
revoke all on function public.banquillo_team_code(uuid,boolean) from public,anon;
revoke all on function public.banquillo_director_invite(uuid,boolean) from public,anon;
revoke all on function public.banquillo_join_team(text) from public,anon;
revoke all on function public.banquillo_join_club(text) from public,anon;
grant execute on function public.banquillo_team_code(uuid,boolean) to authenticated;
grant execute on function public.banquillo_director_invite(uuid,boolean) to authenticated;
grant execute on function public.banquillo_join_team(text) to authenticated;
grant execute on function public.banquillo_join_club(text) to authenticated;
commit;