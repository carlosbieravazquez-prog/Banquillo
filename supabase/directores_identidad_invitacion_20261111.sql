-- Directores reales: la identidad procede de auth.uid(), sin selector de personas.
-- Invitación de 10 minutos (un único uso) y retirada/abandono controlados.
begin;
alter table public.banquillo_club_codes
 add column if not exists expires_at timestamptz;
-- Los códigos anteriores dejan de ser válidos de inmediato.
update public.banquillo_club_codes set expires_at=now()-interval '1 second'
 where expires_at is null;

create or replace function public.banquillo_director_invite(p_club_id uuid,p_rotate boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_code text;v_expires timestamptz;v_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if not exists(
 select 1 from public.banquillo_clubs c
 where c.id=p_club_id and c.deleted_at is null
 and (c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_club_director';end if;
 perform pg_advisory_xact_lock(hashtext(p_club_id::text),64018);
 select count(*) into v_count from public.banquillo_club_directors where club_id=p_club_id;
 if v_count>=1 then return jsonb_build_object('available',false,'reason','director_limit');end if;
 select code,expires_at into v_code,v_expires from public.banquillo_club_codes where club_id=p_club_id;
 if p_rotate or v_code is null or v_expires<=now() or v_expires is null then
  v_code:=replace(gen_random_uuid()::text,'-','');
  v_expires:=now()+interval '10 minutes';
  insert into public.banquillo_club_codes(club_id,code,expires_at,created_at)
  values(p_club_id,v_code,v_expires,now())
  on conflict(club_id) do update set code=excluded.code,expires_at=excluded.expires_at,created_at=now();
 end if;
 return jsonb_build_object('available',true,'code',v_code,'expires_at',v_expires);
end $fn$;

create or replace function public.banquillo_join_club(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v uuid;n integer;fails integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select count(*) into fails from public.join_attempts
 where user_id=auth.uid() and at>now()-interval '15 minutes';
 if fails>=8 then return jsonb_build_object('ok',false,'error','too_many_attempts');end if;
 if p_code is null or p_code !~ '^[a-f0-9]{32}$' then
  insert into public.join_attempts(user_id) values(auth.uid());
  return jsonb_build_object('ok',false,'error','invalid_code');end if;
 select cc.club_id into v from public.banquillo_club_codes cc
 join public.banquillo_clubs c on c.id=cc.club_id and c.deleted_at is null
 where cc.code=p_code and cc.expires_at>now();
 if v is null then
  insert into public.join_attempts(user_id) values(auth.uid());
  return jsonb_build_object('ok',false,'error','invalid_or_expired_code');end if;
 perform pg_advisory_xact_lock(hashtext(v::text),64018);
 -- Volver a comprobar el código tras el bloqueo (evita doble uso).
 if not exists(select 1 from public.banquillo_club_codes
 where club_id=v and code=p_code and expires_at>now()) then
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
create or replace function public.banquillo_club_roster(p_club_id uuid)
returns table(user_id uuid,display_name text,kind text)
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(
 select 1 from public.banquillo_clubs c where c.id=p_club_id and c.deleted_at is null
 and (c.owner_id=auth.uid() or exists(select 1 from public.banquillo_club_directors d
 where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_club_director';end if;
 return query
 select c.owner_id,coalesce(nullif(p.display_name,''),'Director principal')::text,'owner'::text
 from public.banquillo_clubs c left join public.profiles p on p.user_id=c.owner_id
 where c.id=p_club_id
 union all
 select d.user_id,coalesce(nullif(p.display_name,''),'Segundo director')::text,'director'::text
 from public.banquillo_club_directors d left join public.profiles p on p.user_id=d.user_id
 where d.club_id=p_club_id;
end $fn$;

create or replace function public.banquillo_eject_director(p_club_id uuid,p_target_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
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
   -- El segundo director ocupa la propiedad antes de retirar al titular.
   -- Los índices de temporadas impiden tener dos clubes activos al asumir el cargo.
   update public.banquillo_club_seasons set owner_id=v_actor where club_id=p_club_id;
   update public.banquillo_clubs set owner_id=v_actor where id=p_club_id;
   delete from public.banquillo_club_directors
   where club_id=p_club_id and user_id=v_actor;
 else
   if v_owner<>v_actor then raise exception 'target_not_eligible';end if;
   delete from public.banquillo_club_directors
   where club_id=p_club_id and user_id=p_target_id;
   if not found then raise exception 'director_not_found';end if;
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
   update public.banquillo_club_seasons set owner_id=v_other where club_id=p_club_id;
   update public.banquillo_clubs set owner_id=v_other where id=p_club_id;
   delete from public.banquillo_club_directors where club_id=p_club_id and user_id=v_other;
 elsif exists(select 1 from public.banquillo_club_directors
 where club_id=p_club_id and user_id=auth.uid()) then
   delete from public.banquillo_club_directors where club_id=p_club_id and user_id=auth.uid();
 else
   raise exception 'not_club_director';
 end if;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 return true;
end $fn$;

-- Deshabilitar endpoints antiguos de códigos/permisos que eludirían caducidad o nuevas reglas.
revoke execute on function public.banquillo_club_code(uuid,boolean) from public,anon,authenticated;
revoke execute on function public.banquillo_remove_director(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.banquillo_director_invite(uuid,boolean) from public,anon;
revoke execute on function public.banquillo_join_club(text) from public,anon;
revoke execute on function public.banquillo_club_roster(uuid) from public,anon;
revoke execute on function public.banquillo_eject_director(uuid,uuid) from public,anon;
revoke execute on function public.banquillo_leave_club(uuid) from public,anon;
grant execute on function public.banquillo_director_invite(uuid,boolean) to authenticated;
grant execute on function public.banquillo_join_club(text) to authenticated;
grant execute on function public.banquillo_club_roster(uuid) to authenticated;
grant execute on function public.banquillo_eject_director(uuid,uuid) to authenticated;
grant execute on function public.banquillo_leave_club(uuid) to authenticated;
commit;