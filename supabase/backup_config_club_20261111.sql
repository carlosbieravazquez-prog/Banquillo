-- Copia de configuración: restauración validada y transaccional.
-- No modifica documentos de jugadores, partidos, cuentas ni códigos de invitación.
begin;

create or replace function public.banquillo_restore_club_config(
 p_club_id uuid,p_snapshot jsonb
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v jsonb;v_team_id uuid;v_count integer:=0;v_staff integer:=0;
begin
 if auth.uid() is null or not exists(
  select 1 from public.banquillo_clubs c where c.id=p_club_id and c.deleted_at is null
  and(c.owner_id=auth.uid() or exists(
   select 1 from public.banquillo_club_directors d where d.club_id=c.id and d.user_id=auth.uid()))
 ) then raise exception 'not_club_manager';end if;
 if p_snapshot is null or p_snapshot->>'format'<>'banquillo-club-configuration'
  or p_snapshot->>'version'<>'1'
  or p_snapshot->>'club_id'<>p_club_id::text
  then raise exception 'invalid_backup';end if;
 if length(p_snapshot::text)>200000 then raise exception 'backup_too_large';end if;
 if jsonb_typeof(p_snapshot->'teams')<>'array' or
 jsonb_typeof(p_snapshot->'staff')<>'array' or
 jsonb_array_length(p_snapshot->'teams')>60 or
 jsonb_array_length(p_snapshot->'staff')>240
 then raise exception 'invalid_backup';end if;
 if p_snapshot ? 'settings' and jsonb_typeof(p_snapshot->'settings')='object' then
   v:=p_snapshot->'settings';
   insert into public.banquillo_club_settings
   (club_id,town,province,community,fields_f11,fields_f7,updated_at)
   values(p_club_id,coalesce(v->>'town',''),coalesce(v->>'province',''),
   coalesce(v->>'community',''),coalesce((v->>'fields_f11')::integer,0),
   coalesce((v->>'fields_f7')::integer,0),now())
   on conflict(club_id) do update set
   town=excluded.town,province=excluded.province,community=excluded.community,
   fields_f11=excluded.fields_f11,fields_f7=excluded.fields_f7,updated_at=now();
 end if;
 -- Primero validar TODAS las IDs y los cargos antes de escribir un solo miembro.
 for v in select value from jsonb_array_elements(p_snapshot->'teams')
 loop
  v_team_id:=(v->>'id')::uuid;
  if not exists(select 1 from public.banquillo_teams
   where id=v_team_id and club_id=p_club_id)
  then raise exception 'backup_team_not_found';end if;
 end loop;
 for v in select value from jsonb_array_elements(p_snapshot->'staff')
 loop
  v_team_id:=(v->>'team_id')::uuid;
  if not exists(select 1 from public.banquillo_teams
   where id=v_team_id and club_id=p_club_id)
   then raise exception 'backup_staff_not_in_club';end if;
  if v->>'position' not in ('head_coach','assistant_coach','third_coach','delegate','other')
   or length(btrim(coalesce(v->>'display_name',''))) not between 2 and 90
   or length(coalesce(v->>'role_detail',''))>70
   then raise exception 'backup_staff_invalid';end if;
 end loop;
 for v in select value from jsonb_array_elements(p_snapshot->'teams')
 loop
  update public.banquillo_teams set
   name=coalesce(v->>'name',name),
   modality=coalesce(v->>'modality',modality),
   category=coalesce(v->>'category',category),
   competition=coalesce(v->>'competition',competition),
   settings=case when jsonb_typeof(v->'settings')='object'
    then v->'settings' else settings end
  where id=(v->>'id')::uuid and club_id=p_club_id;
  v_count:=v_count+1;
 end loop;
 -- Solo restaurar los cargos de equipos incluidos en el archivo,
 -- sin alterar los permisos de las cuentas.
 delete from public.banquillo_team_staff
 where team_id in(
  select (item.value->>'id')::uuid
  from jsonb_array_elements(p_snapshot->'teams') as item(value)
 );
 for v in select value from jsonb_array_elements(p_snapshot->'staff')
 loop
  -- No importar cargos de equipos que no están en la copia.
  if not exists(select 1 from jsonb_array_elements(p_snapshot->'teams') as t(value)
   where t.value->>'id'=v->>'team_id') then raise exception 'backup_staff_team_missing';end if;
  insert into public.banquillo_team_staff(team_id,display_name,position,role_detail)
  values((v->>'team_id')::uuid,btrim(v->>'display_name'),
    v->>'position',coalesce(v->>'role_detail',''));
  v_staff:=v_staff+1;
 end loop;
 return jsonb_build_object('ok',true,'teams',v_count,'staff',v_staff);
end $fn$;

revoke all on function public.banquillo_restore_club_config(uuid,jsonb) from public,anon;
grant execute on function public.banquillo_restore_club_config(uuid,jsonb) to authenticated;

commit;