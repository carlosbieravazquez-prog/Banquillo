-- BORRADOR REVISABLE. NO EJECUTAR EN PRODUCCIÓN SIN BACKUP, PRUEBAS RLS Y MIGRACIÓN VERSIONADA.
-- Fase 1: clubes, directores y equipos. No modifica las tablas ni los documentos existentes.
begin;

create table if not exists public.banquillo_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists banquillo_clubs_owner_idx on public.banquillo_clubs(owner_id);

create table if not exists public.banquillo_club_directors (
  club_id uuid not null references public.banquillo_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (club_id,user_id)
);
create index if not exists banquillo_directors_user_idx on public.banquillo_club_directors(user_id);

create table if not exists public.banquillo_teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.banquillo_clubs(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  modality text not null check (modality in ('F7','F11')),
  season_id text unique references public.seasons_meta(season_id) on delete set null,
  created_at timestamptz not null default now(),
  unique(club_id,name)
);
create index if not exists banquillo_teams_club_idx on public.banquillo_teams(club_id);

alter table public.banquillo_clubs enable row level security;
alter table public.banquillo_club_directors enable row level security;
alter table public.banquillo_teams enable row level security;

-- Evita RLS recursivo: el director únicamente ve su propia fila de pertenencia.
create policy "club_directors_read_self" on public.banquillo_club_directors
  for select to authenticated using (user_id = (select auth.uid()));

-- El propietario puede dar de alta y dar de baja directores; los directores no pueden escalar privilegios.
create policy "club_directors_insert_owner" on public.banquillo_club_directors
  for insert to authenticated with check (
    exists (select 1 from public.banquillo_clubs c
            where c.id = club_id and c.owner_id = (select auth.uid()))
  );
create policy "club_directors_delete_owner" on public.banquillo_club_directors
  for delete to authenticated using (
    exists (select 1 from public.banquillo_clubs c
            where c.id = club_id and c.owner_id = (select auth.uid()))
  );

create policy "clubs_read_members" on public.banquillo_clubs
  for select to authenticated using (
    owner_id = (select auth.uid()) or
    exists (select 1 from public.banquillo_club_directors d
            where d.club_id = id and d.user_id = (select auth.uid()))
  );
create policy "clubs_insert_owner" on public.banquillo_clubs
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "clubs_update_owner" on public.banquillo_clubs
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
-- No DELETE expuesto: la eliminación requiere un flujo revisado de retención de datos.

create policy "teams_read_directors" on public.banquillo_teams
  for select to authenticated using (
    exists (select 1 from public.banquillo_clubs c where c.id = club_id
       and (c.owner_id = (select auth.uid()) or exists
         (select 1 from public.banquillo_club_directors d
          where d.club_id = c.id and d.user_id = (select auth.uid()))))
  );
create policy "teams_insert_directors" on public.banquillo_teams
  for insert to authenticated with check (
    exists (select 1 from public.banquillo_clubs c where c.id = club_id
       and (c.owner_id = (select auth.uid()) or exists
         (select 1 from public.banquillo_club_directors d
          where d.club_id = c.id and d.user_id = (select auth.uid()))))
  );
create policy "teams_update_directors" on public.banquillo_teams
  for update to authenticated using (
    exists (select 1 from public.banquillo_clubs c where c.id = club_id
       and (c.owner_id = (select auth.uid()) or exists
         (select 1 from public.banquillo_club_directors d
          where d.club_id = c.id and d.user_id = (select auth.uid()))))
  ) with check (
    exists (select 1 from public.banquillo_clubs c where c.id = club_id
       and (c.owner_id = (select auth.uid()) or exists
         (select 1 from public.banquillo_club_directors d
          where d.club_id = c.id and d.user_id = (select auth.uid()))))
  );

-- Sin grants a anon; lectura/escritura bajo RLS para usuarios autenticados.
grant select, insert, update on public.banquillo_clubs to authenticated;
grant select, insert, delete on public.banquillo_club_directors to authenticated;
grant select, insert, update on public.banquillo_teams to authenticated;


-- Validaciones atómicas de integridad: no confiar en los campos enviados por el navegador.
create or replace function public.banquillo_team_guard() returns trigger
language plpgsql security definer set search_path = '' as $guard$
declare n integer;
begin
  -- Serializar altas por club para impedir que dos altas simultáneas superen el límite.
  perform pg_advisory_xact_lock(hashtext(new.club_id::text), 64017);
  if tg_op = 'INSERT' then
    select count(*) into n from public.banquillo_teams where club_id = new.club_id;
    if n >= 12 then raise exception 'team_limit'; end if;
  elsif new.club_id is distinct from old.club_id then
    raise exception 'club_move_forbidden';
  end if;
  if new.season_id is not null and
     (tg_op = 'INSERT' or new.season_id is distinct from old.season_id) then
    if not exists (
      select 1 from public.seasons_meta sm
      where sm.season_id = new.season_id and sm.owner_id = auth.uid()
    ) then raise exception 'season_owner_required'; end if;
  end if;
  return new;
end $guard$;
drop trigger if exists banquillo_team_guard_trg on public.banquillo_teams;
create trigger banquillo_team_guard_trg before insert or update on public.banquillo_teams
for each row execute function public.banquillo_team_guard();

create or replace function public.banquillo_director_guard() returns trigger
language plpgsql security definer set search_path = '' as $guard$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.club_id::text), 64018);
  select count(*) into n from public.banquillo_club_directors where club_id = new.club_id;
  if n >= 2 then raise exception 'director_limit'; end if;
  return new;
end $guard$;
drop trigger if exists banquillo_director_guard_trg on public.banquillo_club_directors;
create trigger banquillo_director_guard_trg before insert on public.banquillo_club_directors
for each row execute function public.banquillo_director_guard();

-- Estas funciones de trigger no son endpoints RPC públicos.
revoke all on function public.banquillo_team_guard() from public, anon, authenticated;
revoke all on function public.banquillo_director_guard() from public, anon, authenticated;
commit;
