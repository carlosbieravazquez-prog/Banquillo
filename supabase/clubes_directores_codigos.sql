-- Extensión fase 1: acceso de dirección deportiva mediante código largo.
begin;
create table if not exists public.banquillo_club_codes (
  club_id uuid primary key references public.banquillo_clubs(id) on delete cascade,
  code text not null unique check (code ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now()
);
alter table public.banquillo_club_codes enable row level security;
revoke all on public.banquillo_club_codes from anon, authenticated;

create or replace function public.banquillo_club_code(p_club_id uuid, p_rotate boolean default false)
returns text language plpgsql security definer set search_path = '' as $func$
declare v text;
begin
  if auth.uid() is null or not exists
    (select 1 from public.banquillo_clubs where id=p_club_id and owner_id=auth.uid())
    then raise exception 'not_club_owner'; end if;
  select code into v from public.banquillo_club_codes where club_id=p_club_id;
  if v is null or p_rotate then
    v:=replace(gen_random_uuid()::text,'-','');
    insert into public.banquillo_club_codes(club_id,code,created_at)
      values(p_club_id,v,now())
      on conflict(club_id) do update set code=excluded.code,created_at=now();
  end if;
  return v;
end $func$;

create or replace function public.banquillo_join_club(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $func$
declare v uuid; n integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_code is null or p_code !~ '^[a-f0-9]{32}$' then
    return jsonb_build_object('ok',false,'error','invalid_code'); end if;
  select club_id into v from public.banquillo_club_codes where code=p_code;
  if v is null then return jsonb_build_object('ok',false,'error','invalid_code'); end if;
  perform pg_advisory_xact_lock(hashtext(v::text),64018);
  if exists(select 1 from public.banquillo_clubs where id=v and owner_id=auth.uid()) then
    return jsonb_build_object('ok',false,'error','owner_already'); end if;
  if exists(select 1 from public.banquillo_club_directors where club_id=v and user_id=auth.uid()) then
    return jsonb_build_object('ok',true,'club_id',v); end if;
  select count(*) into n from public.banquillo_club_directors where club_id=v;
  if n>=2 then return jsonb_build_object('ok',false,'error','director_limit'); end if;
  insert into public.banquillo_club_directors(club_id,user_id) values(v,auth.uid());
  return jsonb_build_object('ok',true,'club_id',v);
end $func$;

create or replace function public.banquillo_list_directors(p_club_id uuid)
returns table(user_id uuid,display_name text)
language plpgsql security definer set search_path = '' as $func$
begin
 if auth.uid() is null or not (
   exists(select 1 from public.banquillo_clubs where id=p_club_id and owner_id=auth.uid())
   or exists(select 1 from public.banquillo_club_directors where club_id=p_club_id and user_id=auth.uid()))
 then raise exception 'not_club_member'; end if;
 return query select d.user_id,coalesce(nullif(p.display_name,''),'Director')
  from public.banquillo_club_directors d
  left join public.profiles p on p.user_id=d.user_id
  where d.club_id=p_club_id order by d.created_at;
end $func$;

create or replace function public.banquillo_remove_director(p_club_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $func$
begin
 if auth.uid() is null or not exists(
   select 1 from public.banquillo_clubs where id=p_club_id and owner_id=auth.uid())
 then raise exception 'not_club_owner'; end if;
 delete from public.banquillo_club_directors where club_id=p_club_id and user_id=p_user_id;
 return found;
end $func$;

revoke all on function public.banquillo_club_code(uuid,boolean) from public,anon;
revoke all on function public.banquillo_join_club(text) from public,anon;
revoke all on function public.banquillo_list_directors(uuid) from public,anon;
revoke all on function public.banquillo_remove_director(uuid,uuid) from public,anon;
grant execute on function public.banquillo_club_code(uuid,boolean) to authenticated;
grant execute on function public.banquillo_join_club(text) to authenticated;
grant execute on function public.banquillo_list_directors(uuid) to authenticated;
grant execute on function public.banquillo_remove_director(uuid,uuid) to authenticated;
commit;