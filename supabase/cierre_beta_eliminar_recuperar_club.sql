-- Cierre beta: baja reversible de club, protección de códigos y máximo dos directores (propietario + uno).
begin;

alter table public.banquillo_clubs
 add column if not exists deleted_at timestamptz;

-- Los clientes no pueden modificar o borrar directamente los metadatos del club.
revoke update,delete on public.banquillo_clubs from authenticated,anon;

drop policy if exists clubs_read_members on public.banquillo_clubs;
create policy clubs_read_members on public.banquillo_clubs for select to authenticated
 using (deleted_at is null and (
 owner_id=(select auth.uid()) or exists(
  select 1 from public.banquillo_club_directors d
  where d.club_id=id and d.user_id=(select auth.uid()))));

-- Limitar toda nueva alta de directores a uno adicional: dos en total contando al propietario.
create or replace function public.banquillo_director_guard() returns trigger
language plpgsql security definer set search_path='' as $fn$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtext(new.club_id::text),64018);
 if not exists(select 1 from public.banquillo_clubs c where c.id=new.club_id and c.deleted_at is null)
 then raise exception 'club_not_available';end if;
 select count(*) into n from public.banquillo_club_directors where club_id=new.club_id;
 if n>=1 then raise exception 'director_limit';end if;
 return new;
end $fn$;
revoke all on function public.banquillo_director_guard() from public,anon,authenticated;

create or replace function public.banquillo_join_club(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v uuid;n integer;fails integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select count(*) into fails from public.join_attempts
 where user_id=auth.uid() and at >now()-interval '15 minutes';
 if fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 if p_code is null or p_code !~ '^[a-f0-9]{32}$' then
  insert into public.join_attempts(user_id) values(auth.uid());
  return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 select i.club_id into v from public.banquillo_club_codes i
 join public.banquillo_clubs c on c.id=i.club_id and c.deleted_at is null
 where i.code=p_code;
 if v is null then
  insert into public.join_attempts(user_id) values(auth.uid());
  return jsonb_build_object('ok',false,'error','invalid_code');
 end if;
 perform pg_advisory_xact_lock(hashtext(v::text),64018);
 if exists(select 1 from public.banquillo_clubs where id=v and owner_id=auth.uid()) then
  return jsonb_build_object('ok',false,'error','owner_already');end if;
 if exists(select 1 from public.banquillo_club_directors where club_id=v and user_id=auth.uid()) then
  return jsonb_build_object('ok',true,'club_id',v);end if;
 select count(*) into n from public.banquillo_club_directors where club_id=v;
 if n>=1 then return jsonb_build_object('ok',false,'error','director_limit');end if;
 insert into public.banquillo_club_directors(club_id,user_id) values(v,auth.uid());
 return jsonb_build_object('ok',true,'club_id',v);
end $fn$;
revoke all on function public.banquillo_join_club(text) from public,anon;
grant execute on function public.banquillo_join_club(text) to authenticated;

create or replace function public.banquillo_club_code(p_club_id uuid,p_rotate boolean default false)
returns text language plpgsql security definer set search_path='' as $fn$
declare v text;
begin
 if auth.uid() is null or not exists(
 select 1 from public.banquillo_clubs where id=p_club_id and owner_id=auth.uid()
 and deleted_at is null) then raise exception 'not_club_owner';end if;
 select code into v from public.banquillo_club_codes where club_id=p_club_id;
 if v is null or p_rotate then
  v:=replace(gen_random_uuid()::text,'-','');
  insert into public.banquillo_club_codes(club_id,code,created_at)
  values(p_club_id,v,now())
  on conflict(club_id) do update set code=excluded.code,created_at=now();
 end if;
 return v;
end $fn$;
revoke all on function public.banquillo_club_code(uuid,boolean) from public,anon;
grant execute on function public.banquillo_club_code(uuid,boolean) to authenticated;

create or replace function public.banquillo_team_code(p_team_id uuid,p_rotate boolean default false)
returns text language plpgsql security definer set search_path='' as $fn$
declare v text;
begin
 if auth.uid() is null or not exists(
 select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.id=p_team_id and t.archived_at is null and c.deleted_at is null
 and (c.owner_id=auth.uid() or exists(
   select 1 from public.banquillo_club_directors d where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_team_manager';end if;
 select code into v from public.banquillo_team_codes where team_id=p_team_id;
 if v is null or p_rotate then
  v:=replace(gen_random_uuid()::text,'-','');
  insert into public.banquillo_team_codes(team_id,code,created_at)
  values(p_team_id,v,now())
  on conflict(team_id) do update set code=excluded.code,created_at=now();
 end if;
 return v;
end $fn$;
revoke all on function public.banquillo_team_code(uuid,boolean) from public,anon;
grant execute on function public.banquillo_team_code(uuid,boolean) to authenticated;

create or replace function public.banquillo_delete_club(p_club_id uuid,p_confirm_name text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_clubs;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select * into v from public.banquillo_clubs where id=p_club_id for update;
 if v.id is null or v.owner_id<>auth.uid() or v.deleted_at is not null then
  raise exception 'not_club_owner';end if;
 if btrim(coalesce(p_confirm_name,''))<>v.name then raise exception 'club_name_mismatch';end if;
 -- Retirar invitaciones y directores en una sola transacción.
 delete from public.banquillo_club_directors where club_id=p_club_id;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 delete from public.banquillo_team_codes where team_id in(
  select id from public.banquillo_teams where club_id=p_club_id);
 update public.banquillo_club_seasons
 set status='closed',closed_at=coalesce(closed_at,now())
 where club_id=p_club_id and status='active';
 update public.banquillo_clubs set deleted_at=now() where id=p_club_id;
 return true;
end $fn$;

create or replace function public.banquillo_list_deleted_clubs()
returns table(id uuid,name text,deleted_at timestamptz)
language sql security definer set search_path='' as $fn$
 select c.id,c.name,c.deleted_at from public.banquillo_clubs c
 where c.owner_id=auth.uid() and c.deleted_at is not null
 order by c.deleted_at desc limit 20;
$fn$;

create or replace function public.banquillo_restore_club(p_club_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_clubs;v_season uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),64021);
 select * into v from public.banquillo_clubs where id=p_club_id for update;
 if v.id is null or v.owner_id<>auth.uid() or v.deleted_at is null then
  raise exception 'not_club_owner';end if;
 if exists(select 1 from public.banquillo_club_seasons s
  where s.owner_id=auth.uid() and s.status='active') then
  raise exception 'active_club_exists';end if;
 select id into v_season from public.banquillo_club_seasons
 where club_id=p_club_id order by created_at desc limit 1;
 if v_season is not null then
   update public.banquillo_club_seasons set status='active',closed_at=null
   where id=v_season;
 end if;
 update public.banquillo_clubs set deleted_at=null where id=p_club_id;
 return true;
end $fn$;

revoke all on function public.banquillo_delete_club(uuid,text) from public,anon;
revoke all on function public.banquillo_list_deleted_clubs() from public,anon;
revoke all on function public.banquillo_restore_club(uuid) from public,anon;
grant execute on function public.banquillo_delete_club(uuid,text) to authenticated;
grant execute on function public.banquillo_list_deleted_clubs() to authenticated;
grant execute on function public.banquillo_restore_club(uuid) to authenticated;

commit;