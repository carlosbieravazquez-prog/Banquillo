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

commit;
