-- =====================================================================
--  BANQUILLO · Base de datos para Supabase
--  Cómo usarlo: Supabase → SQL Editor → New query → pega TODO esto → Run.
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES Y SILBATOS (la "moneda" de la IA)
--    Cada persona nueva recibe 20 Silbatos de regalo (cámbialo en "default 20").
--    Nadie puede cambiarse sus Silbatos desde la web: solo la función de IA
--    (con la clave de servicio) y tú desde el SQL Editor.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  tokens         integer not null default 20 check (tokens >= 0),
  plan           text    not null default 'free' check (plan in ('free', 'premium')),
  plan_tokens    integer not null default 100 check (plan_tokens >= 0),
  plan_renews_at timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Personas que ya existían antes de crear esta tabla
insert into public.profiles (user_id)
  select id from auth.users on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. TEMPORADAS, MIEMBROS Y DOCUMENTOS
-- ---------------------------------------------------------------------
create table if not exists public.seasons_meta (
  season_id    text primary key,
  owner_id     uuid not null references auth.users(id) on delete restrict,
  join_code    text not null unique,
  code_enabled boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.seasons_meta enable row level security;   -- sin políticas: solo por funciones

create table if not exists public.season_members (
  season_id text not null references public.seasons_meta(season_id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index if not exists season_members_user_idx on public.season_members (user_id);
alter table public.season_members enable row level security;

create table if not exists public.docs (
  season_id  text not null references public.seasons_meta(season_id) on delete cascade,
  path       text not null,
  data       jsonb not null default '{}'::jsonb,
  parent     text generated always as (regexp_replace(path, '/[^/]+$', '')) stored,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (season_id, path),
  constraint docs_path_ok check (
    split_part(path, '/', 1) = 'seasons' and split_part(path, '/', 2) = season_id and length(path) < 200)
);
create index if not exists docs_parent_idx on public.docs (parent);
alter table public.docs enable row level security;

create table if not exists public.join_attempts (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index if not exists join_attempts_idx on public.join_attempts (user_id, at);
alter table public.join_attempts enable row level security;

-- Funciones de ayuda para las políticas
create or replace function public.is_member(sid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.season_members m where m.season_id = sid and m.user_id = auth.uid());
$$;
create or replace function public.can_edit(sid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.season_members m
                 where m.season_id = sid and m.user_id = auth.uid() and m.role in ('owner', 'editor'));
$$;
create or replace function public.is_owner(sid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.season_members m
                 where m.season_id = sid and m.user_id = auth.uid() and m.role = 'owner');
$$;

drop policy if exists members_select on public.season_members;
create policy members_select on public.season_members
  for select to authenticated using (public.is_member(season_id));

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs
  for select to authenticated using (public.is_member(season_id));
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs
  for insert to authenticated with check (public.can_edit(season_id));
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs
  for update to authenticated using (public.can_edit(season_id)) with check (public.can_edit(season_id));
drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs
  for delete to authenticated
  using (public.can_edit(season_id) and path <> 'seasons/' || season_id);   -- la temporada solo se borra con delete_season()

-- Límites contra abusos: tamaño de documento y número de documentos por temporada
create or replace function public.docs_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if pg_column_size(new.data) > 120000 then raise exception 'doc_too_large'; end if;
  if tg_op = 'INSERT' and (select count(*) from public.docs d where d.season_id = new.season_id) >= 1500 then
    raise exception 'season_full';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists docs_guard_trg on public.docs;
create trigger docs_guard_trg before insert or update on public.docs
  for each row execute function public.docs_guard();

-- Tiempo real (los cambios de un móvil aparecen en los demás)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.docs;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. FUNCIONES (lo que la web puede pedir)
-- ---------------------------------------------------------------------
-- Código de temporada: 8 caracteres sin letras confusas (sin I, O, 0, 1)
create or replace function public.gen_join_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  idx constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9];
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  res text := '';
  i int;
begin
  foreach i in array idx loop
    res := res || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return res;
end $$;

-- Crear una temporada (quien la crea es la persona responsable)
create or replace function public.create_season(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare v_code text; n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{3,60}$' then raise exception 'invalid_id'; end if;
  select count(*) into n from public.seasons_meta where owner_id = auth.uid();
  if n >= 30 then raise exception 'too_many_seasons'; end if;
  loop
    v_code := public.gen_join_code();
    exit when not exists (select 1 from public.seasons_meta where join_code = v_code);
  end loop;
  begin
    insert into public.seasons_meta (season_id, owner_id, join_code) values (p_id, auth.uid(), v_code);
  exception when unique_violation then raise exception 'season_exists';
  end;
  insert into public.season_members (season_id, user_id, role) values (p_id, auth.uid(), 'owner');
  insert into public.docs (season_id, path, data) values (p_id, 'seasons/' || p_id, coalesce(p_data, '{}'::jsonb));
  return v_code;
end $$;

-- Unirse con un código (devuelve ok / error en vez de lanzar excepción para poder contar los intentos fallidos)
create or replace function public.join_season(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text; m public.seasons_meta; fails int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  v := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  select count(*) into fails from public.join_attempts where user_id = auth.uid() and at > now() - interval '15 minutes';
  if fails >= 8 then return jsonb_build_object('ok', false, 'error', 'too_many_attempts'); end if;
  select * into m from public.seasons_meta where join_code = v and code_enabled;
  if not found then
    insert into public.join_attempts (user_id) values (auth.uid());
    delete from public.join_attempts where at < now() - interval '1 day';
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  insert into public.season_members (season_id, user_id, role) values (m.season_id, auth.uid(), 'editor')
    on conflict (season_id, user_id) do nothing;
  return jsonb_build_object('ok', true, 'season_id', m.season_id);
end $$;

-- Código para compartir (solo la persona responsable)
create or replace function public.season_share(sid text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.seasons_meta;
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  select * into m from public.seasons_meta where season_id = sid;
  return jsonb_build_object('code', m.join_code, 'enabled', m.code_enabled);
end $$;

create or replace function public.regenerate_join_code(sid text) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  loop
    v := public.gen_join_code();
    exit when not exists (select 1 from public.seasons_meta where join_code = v);
  end loop;
  update public.seasons_meta set join_code = v where season_id = sid;
  return v;
end $$;

create or replace function public.set_code_enabled(sid text, p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  update public.seasons_meta set code_enabled = p_enabled where season_id = sid;
end $$;

-- Miembros de una temporada (el correo solo lo ve la persona responsable)
create or replace function public.season_members_list(sid text)
returns table (user_id uuid, role text, name text, email text, joined_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(sid) then raise exception 'not_member'; end if;
  return query
    select m.user_id, m.role, coalesce(p.display_name, '') as name,
           case when public.is_owner(sid) then u.email::text else null end as email,
           m.joined_at, (m.user_id = auth.uid()) as is_me
    from public.season_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.season_id = sid
    order by (m.role = 'owner') desc, m.joined_at;
end $$;

create or replace function public.set_member_role(sid text, uid uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'invalid_role'; end if;
  update public.season_members set role = p_role where season_id = sid and user_id = uid and role <> 'owner';
end $$;

create or replace function public.remove_member(sid text, uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  delete from public.season_members where season_id = sid and user_id = uid and role <> 'owner';
end $$;

create or replace function public.leave_season(sid text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_owner(sid) then raise exception 'owner_cannot_leave'; end if;
  delete from public.season_members where season_id = sid and user_id = auth.uid();
end $$;

create or replace function public.delete_season(sid text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(sid) then raise exception 'not_owner'; end if;
  delete from public.seasons_meta where season_id = sid;   -- borra en cascada miembros y documentos
end $$;

-- Eliminar mi cuenta (RGPD): si soy responsable de una temporada con más gente, pasa a otra persona; si no, se borra
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare s record; nxt uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  for s in select season_id from public.seasons_meta where owner_id = auth.uid() loop
    select user_id into nxt from public.season_members
      where season_id = s.season_id and user_id <> auth.uid() and role = 'editor' order by joined_at limit 1;
    if nxt is null then
      select user_id into nxt from public.season_members
        where season_id = s.season_id and user_id <> auth.uid() order by joined_at limit 1;
    end if;
    if nxt is null then
      delete from public.seasons_meta where season_id = s.season_id;
    else
      update public.seasons_meta set owner_id = nxt where season_id = s.season_id;
      update public.season_members set role = 'owner' where season_id = s.season_id and user_id = nxt;
    end if;
  end loop;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- 4. SILBATOS
-- ---------------------------------------------------------------------
-- Recarga mensual del plan premium (se aplica sola al consultar o gastar)
create or replace function public.refill_if_due(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where user_id = uid for update;
  if not found or p.plan <> 'premium' or p.plan_renews_at is null or p.plan_renews_at > now() then return; end if;
  while p.plan_renews_at <= now() loop
    p.plan_renews_at := p.plan_renews_at + interval '1 month';
  end loop;
  update public.profiles
     set tokens = greatest(tokens, plan_tokens), plan_renews_at = p.plan_renews_at
   where user_id = uid;
end $$;

create or replace function public.my_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; em text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.profiles (user_id) values (auth.uid()) on conflict do nothing;
  perform public.refill_if_due(auth.uid());
  select * into p from public.profiles where user_id = auth.uid();
  select email::text into em from auth.users where id = auth.uid();
  return jsonb_build_object('email', em, 'name', coalesce(p.display_name, ''), 'tokens', p.tokens, 'plan', p.plan,
                            'plan_tokens', p.plan_tokens, 'renews_at', p.plan_renews_at);
end $$;

-- Solo la función de IA (clave de servicio) puede gastar o devolver Silbatos
create or replace function public.spend_tokens(uid uuid, n integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare left_tokens integer;
begin
  if n is null or n < 1 or n > 50 then raise exception 'invalid_amount'; end if;
  perform public.refill_if_due(uid);
  update public.profiles set tokens = tokens - n where user_id = uid and tokens >= n returning tokens into left_tokens;
  if left_tokens is null then raise exception 'insufficient_tokens'; end if;
  return left_tokens;
end $$;

create or replace function public.refund_tokens(uid uuid, n integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare t integer;
begin
  update public.profiles set tokens = tokens + greatest(n, 0) where user_id = uid returning tokens into t;
  return t;
end $$;

-- ---------------------------------------------------------------------
-- 5. PERMISOS
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.seasons_meta, public.season_members, public.docs, public.join_attempts
  from anon, authenticated;
grant select on public.profiles, public.season_members to authenticated;
grant select, insert, update, delete on public.docs to authenticated;

do $$
declare f text;
begin
  -- funciones que puede llamar cualquier persona con sesión iniciada
  foreach f in array array[
    'create_season(text,jsonb)', 'join_season(text)', 'season_share(text)', 'regenerate_join_code(text)',
    'set_code_enabled(text,boolean)', 'season_members_list(text)', 'set_member_role(text,uuid,text)',
    'remove_member(text,uuid)', 'leave_season(text)', 'delete_season(text)', 'delete_my_account()', 'my_profile()',
    'is_member(text)', 'can_edit(text)', 'is_owner(text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- funciones internas: solo el servidor
  foreach f in array array['spend_tokens(uuid,integer)', 'refund_tokens(uuid,integer)', 'refill_if_due(uuid)', 'gen_join_code()']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
