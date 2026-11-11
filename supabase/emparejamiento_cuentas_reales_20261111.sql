-- Banquillo · emparejamiento seguro de cuentas reales con equipos.
-- La entrada con código crea SOLICITUD, nunca un editor de temporada sin aprobación del DD.
begin;

create table if not exists public.banquillo_team_members (
 team_id uuid not null references public.banquillo_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 season_id text not null references public.seasons_meta(season_id),
 status text not null default 'pending'
   check(status in ('pending','active','rejected','removed')),
 position text check(position is null or position in
   ('head_coach','assistant_coach','third_coach','delegate','other')),
 role_detail text not null default '' check(length(role_detail)<=70),
 requested_at timestamptz not null default now(),
 approved_at timestamptz,
 approved_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(team_id,user_id)
);
create unique index if not exists bq_team_one_appointed_fixed_role
 on public.banquillo_team_members(team_id,position)
 where status='active' and position in
 ('head_coach','assistant_coach','third_coach','delegate');
create index if not exists bq_team_member_user_lookup
 on public.banquillo_team_members(user_id,status);

alter table public.banquillo_team_members enable row level security;
revoke all on public.banquillo_team_members from public,anon,authenticated;
grant select on public.banquillo_team_members to authenticated;
drop policy if exists team_members_self_or_managers on public.banquillo_team_members;
create policy team_members_self_or_managers on public.banquillo_team_members
 for select to authenticated using (
 user_id=(select auth.uid())
 or exists(select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id
 where t.id=banquillo_team_members.team_id and c.deleted_at is null
 and(c.owner_id=(select auth.uid()) or exists(
 select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=(select auth.uid()))))
 );

-- Conservar permisos y reconocer las cuentas REALES ya vinculadas
-- mediante la versión anterior del código, sin inventar personas ni cargos.
insert into public.banquillo_team_members
(team_id,user_id,season_id,status,position,approved_at,updated_at)
select t.id,m.user_id,t.season_id,'active',null,m.joined_at,now()
from public.banquillo_teams t
join public.season_members m on m.season_id=t.season_id and m.role<>'owner'
where t.archived_at is null and t.season_id is not null
 and (select count(*) from public.banquillo_teams t2
 where t2.season_id=t.season_id and t2.archived_at is null)=1
on conflict(team_id,user_id) do nothing;

-- No se permite seguir creando nombres ficticios desde la API.
revoke insert,update,delete on public.banquillo_team_staff from authenticated,anon;

-- Asegurar que una temporada que ya tenga miembros no se puede sustituir
-- silenciosamente por otra, dejando permisos heredados sin sentido.
create or replace function public.banquillo_block_unsafe_team_relink()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if old.season_id is distinct from new.season_id and exists(
  select 1 from public.banquillo_team_members m where m.team_id=old.id
  and m.status in ('pending','active'))
 then raise exception 'team_has_members_unlink_first';end if;
 return new;
end $fn$;
drop trigger if exists banquillo_block_unsafe_team_relink_trg on public.banquillo_teams;
create trigger banquillo_block_unsafe_team_relink_trg before update of season_id on public.banquillo_teams
for each row execute function public.banquillo_block_unsafe_team_relink();

-- El entrenador solo solicita acceso. El cargo se asignará después.
create or replace function public.banquillo_join_team(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_team public.banquillo_teams;v_uid uuid:=auth.uid();v_fails integer;
 v_status text;v_code text:=lower(regexp_replace(btrim(coalesce(p_code,'')),'[\s-]','','g'));
begin
 if v_uid is null then raise exception 'not_authenticated';end if;
 if not exists(select 1 from auth.users u where u.id=v_uid and u.email_confirmed_at is not null)
 then return jsonb_build_object('ok',false,'error','email_not_verified');end if;
 select count(*) into v_fails from public.join_attempts
 where user_id=v_uid and at>now()-interval '15 minutes';
 if v_fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 if v_code !~ '^[a-f0-9]{32}$' then
  insert into public.join_attempts(user_id) values(v_uid);
  return jsonb_build_object('ok',false,'error','invalid_code');end if;
 select t.* into v_team
 from public.banquillo_team_codes i
 join public.banquillo_teams t on t.id=i.team_id and t.archived_at is null
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where i.code=v_code and t.season_id is not null
  and exists(select 1 from public.banquillo_club_seasons s
   where s.club_id=t.club_id and s.status='active');
 if not found then
  insert into public.join_attempts(user_id) values(v_uid);
  return jsonb_build_object('ok',false,'error','invalid_or_inactive_code');end if;
 -- Exigir una temporada real y que el director responsable pueda gestionarla.
 if not exists(select 1 from public.seasons_meta sm
  where sm.season_id=v_team.season_id) then
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
 values(v_team.id,v_uid,v_team.season_id,'pending',
 null,'',now(),null,null,now())
 on conflict(team_id,user_id) do update set
 status='pending',position=null,role_detail='',season_id=excluded.season_id,
 requested_at=now(),approved_at=null,approved_by=null,updated_at=now();
 return jsonb_build_object('ok',true,'status','pending',
 'team_id',v_team.id,'team_name',v_team.name);
end $fn$;

-- Datos de cuentas autenticadas, visibles SOLO al DD de este equipo.
create or replace function public.banquillo_team_roster(p_team_id uuid)
returns table(user_id uuid,display_name text,email_masked text,email_verified boolean,
 status text,position text,role_detail text,requested_at timestamptz,approved_at timestamptz)
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(
 select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.id=p_team_id and t.archived_at is null
 and(c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_club_director';end if;
 return query
 select m.user_id,
 coalesce(nullif(btrim(p.display_name),''),nullif(split_part(u.email::text,'@',1),''),'Cuenta registrada')::text,
 case when u.email is null then 'Cuenta verificada'::text
 else (left(split_part(u.email::text,'@',1),2)||'***@'||split_part(u.email::text,'@',2))::text end,
 (u.email_confirmed_at is not null),
 m.status,m.position,m.role_detail,m.requested_at,m.approved_at
 from public.banquillo_team_members m
 join auth.users u on u.id=m.user_id
 left join public.profiles p on p.user_id=m.user_id
 where m.team_id=p_team_id
 order by (m.status='pending') desc,(m.status='active') desc,m.requested_at;
end $fn$;

-- El entrenador puede consultar su propio estado incluso antes de ser editor.
create or replace function public.banquillo_my_team_requests()
returns table(team_id uuid,team_name text,club_name text,season_id text,
 status text,position text,role_detail text,requested_at timestamptz)
language sql stable security definer set search_path='' as $fn$
select m.team_id,t.name,c.name,m.season_id,m.status,m.position,m.role_detail,m.requested_at
from public.banquillo_team_members m
join public.banquillo_teams t on t.id=m.team_id
join public.banquillo_clubs c on c.id=t.club_id
where m.user_id=auth.uid() and c.deleted_at is null and t.archived_at is null
 and m.status in ('pending','active','rejected')
order by m.requested_at desc limit 30;
$fn$;

create or replace function public.banquillo_assign_team_member(
 p_team_id uuid,p_user_id uuid,p_position text,p_role_detail text default ''
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_teams;v_member public.banquillo_team_members;v_rows integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select t.* into v from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.id=p_team_id and t.archived_at is null and t.season_id is not null
 and(c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid()));
 if v.id is null then raise exception 'not_team_manager';end if;
 if not exists(select 1 from public.banquillo_club_seasons s
 where s.club_id=v.club_id and s.status='active') then raise exception 'club_season_closed';end if;
 if p_position not in ('head_coach','assistant_coach','third_coach','delegate','other')
 or length(coalesce(p_role_detail,''))>70 then raise exception 'invalid_staff_role';end if;
 perform pg_advisory_xact_lock(hashtext(p_team_id::text),64022);
 select * into v_member from public.banquillo_team_members
 where team_id=p_team_id and user_id=p_user_id for update;
 if v_member.user_id is null or v_member.status not in ('pending','active')
 or v_member.season_id<>v.season_id then raise exception 'no_verified_request';end if;
 if not exists(select 1 from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null)
 then raise exception 'email_not_verified';end if;
 if not exists(select 1 from public.season_members sm
 where sm.season_id=v.season_id and sm.user_id=p_user_id)
 and (select count(*) from public.season_members sm where sm.season_id=v.season_id)>=30
 then raise exception 'season_full';end if;
 update public.banquillo_team_members
 set status='active',position=p_position,
 role_detail=case when p_position='other' then btrim(coalesce(p_role_detail,'')) else '' end,
 approved_by=auth.uid(),approved_at=coalesce(approved_at,now()),updated_at=now()
 where team_id=p_team_id and user_id=p_user_id;
 -- Solo esta transición aprobada otorga edición; el código nunca lo hace.
 insert into public.season_members(season_id,user_id,role)
 values(v.season_id,p_user_id,'editor')
 on conflict(season_id,user_id) do update set role=case
 when public.season_members.role='owner' then 'owner' else 'editor' end;
 return jsonb_build_object('ok',true,'status','active','position',p_position);
end $fn$;

create or replace function public.banquillo_remove_team_member(
 p_team_id uuid,p_user_id uuid,p_reject boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_teams;v_member public.banquillo_team_members;v_rows integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select t.* into v from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.id=p_team_id and t.archived_at is null
 and(c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid()));
 if v.id is null then raise exception 'not_team_manager';end if;
 perform pg_advisory_xact_lock(hashtext(p_team_id::text),64022);
 select * into v_member from public.banquillo_team_members
 where team_id=p_team_id and user_id=p_user_id for update;
 if v_member.user_id is null or v_member.status not in ('pending','active')
 then raise exception 'member_not_found';end if;
 -- No se puede expulsar al propietario de la temporada sin transferirla primero.
 if exists(select 1 from public.season_members
 where season_id=v.season_id and user_id=p_user_id and role='owner')
 then raise exception 'season_owner_transfer_required';end if;
 update public.banquillo_team_members
 set status=case when p_reject then 'rejected' else 'removed' end,
 position=null,role_detail='',updated_at=now(),
 approved_at=null,approved_by=null
 where team_id=p_team_id and user_id=p_user_id;
 if v_member.status='active' and not exists(
 select 1 from public.banquillo_team_members m
 where m.season_id=v.season_id and m.user_id=p_user_id and m.status='active'
 ) then
  delete from public.season_members
  where season_id=v.season_id and user_id=p_user_id and role<>'owner';
 end if;
 return jsonb_build_object('ok',true,'status',
 case when p_reject then 'rejected' else 'removed' end);
end $fn$;

-- Bloquear el método antiguo de incorporación directa a temporadas de club.
create or replace function public.join_season(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v text;m public.seasons_meta;fails integer;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'error','not_authenticated');end if;
 v:=upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
 select count(*) into fails from public.join_attempts
 where user_id=auth.uid() and at>now()-interval '15 minutes';
 if fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 select * into m from public.seasons_meta where join_code=v and code_enabled;
 if not found then
 insert into public.join_attempts(user_id) values(auth.uid());
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

create or replace function public.remove_member(sid text,uid uuid)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner(sid) then raise exception 'not_owner';end if;
 if exists(select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.season_id=sid and t.archived_at is null)
 then raise exception 'managed_team_use_director';end if;
 delete from public.season_members where season_id=sid and user_id=uid and role<>'owner';
end $fn$;
create or replace function public.set_member_role(sid text,uid uuid,p_role text)
returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner(sid) then raise exception 'not_owner';end if;
 if exists(select 1 from public.banquillo_teams t
 join public.banquillo_clubs c on c.id=t.club_id and c.deleted_at is null
 where t.season_id=sid and t.archived_at is null)
 then raise exception 'managed_team_use_director';end if;
 if p_role not in ('editor','viewer') then raise exception 'invalid_role';end if;
 update public.season_members set role=p_role
 where season_id=sid and user_id=uid and role<>'owner';
end $fn$;

-- La copia JSON ya no puede restaurar personal ficticio ni crear asignaciones.
-- El personal se sincroniza únicamente mediante banquillo_assign_team_member().
revoke execute on function public.banquillo_restore_club_config(uuid,jsonb)
 from authenticated,anon,public;

-- Bloquear escrituras de acceso públicas, RPCs internos solo autenticados.
revoke all on function public.banquillo_block_unsafe_team_relink() from public,anon,authenticated;
revoke all on function public.banquillo_join_team(text) from public,anon;
revoke all on function public.banquillo_team_roster(uuid) from public,anon;
revoke all on function public.banquillo_my_team_requests() from public,anon;
revoke all on function public.banquillo_assign_team_member(uuid,uuid,text,text) from public,anon;
revoke all on function public.banquillo_remove_team_member(uuid,uuid,boolean) from public,anon;
grant execute on function public.banquillo_join_team(text) to authenticated;
grant execute on function public.banquillo_team_roster(uuid) to authenticated;
grant execute on function public.banquillo_my_team_requests() to authenticated;
grant execute on function public.banquillo_assign_team_member(uuid,uuid,text,text) to authenticated;
grant execute on function public.banquillo_remove_team_member(uuid,uuid,boolean) to authenticated;
commit;