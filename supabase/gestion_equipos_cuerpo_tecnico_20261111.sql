-- Banquillo · archivo reversible de equipos y roles informativos del cuerpo técnico.
begin;
alter table public.banquillo_teams
  add column if not exists archived_at timestamptz;
create index if not exists banquillo_teams_active_idx on public.banquillo_teams(club_id)
 where archived_at is null;

create table if not exists public.banquillo_team_staff (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.banquillo_teams(id) on delete restrict,
 display_name text not null check (char_length(btrim(display_name)) between 2 and 90),
 position text not null check (position in ('head_coach','assistant_coach','third_coach','delegate')),
 created_at timestamptz not null default now(),
 unique (team_id,position)
);
create index if not exists banquillo_staff_team_idx on public.banquillo_team_staff(team_id);
alter table public.banquillo_team_staff enable row level security;
revoke all on public.banquillo_team_staff from anon;
grant select,insert,update,delete on public.banquillo_team_staff to authenticated;

-- Consulta/edición solo por dueño o dirección deportiva del club al que pertenece el equipo.
create policy staff_read_managers on public.banquillo_team_staff
 for select to authenticated using (
  exists(select 1 from public.banquillo_teams t
    join public.banquillo_clubs c on c.id=t.club_id
    where t.id=team_id and
     (c.owner_id=(select auth.uid()) or exists (
       select 1 from public.banquillo_club_directors d
       where d.club_id=c.id and d.user_id=(select auth.uid())))));
create policy staff_add_managers on public.banquillo_team_staff
 for insert to authenticated with check (
  exists(select 1 from public.banquillo_teams t
    join public.banquillo_clubs c on c.id=t.club_id
    where t.id=team_id and t.archived_at is null and
     (c.owner_id=(select auth.uid()) or exists (
       select 1 from public.banquillo_club_directors d
       where d.club_id=c.id and d.user_id=(select auth.uid())))));
create policy staff_edit_managers on public.banquillo_team_staff
 for update to authenticated using (
  exists(select 1 from public.banquillo_teams t
    join public.banquillo_clubs c on c.id=t.club_id
    where t.id=team_id and t.archived_at is null and
     (c.owner_id=(select auth.uid()) or exists (
       select 1 from public.banquillo_club_directors d
       where d.club_id=c.id and d.user_id=(select auth.uid())))))
 with check (
  exists(select 1 from public.banquillo_teams t
    join public.banquillo_clubs c on c.id=t.club_id
    where t.id=team_id and t.archived_at is null and
     (c.owner_id=(select auth.uid()) or exists (
       select 1 from public.banquillo_club_directors d
       where d.club_id=c.id and d.user_id=(select auth.uid())))));
create policy staff_delete_managers on public.banquillo_team_staff
 for delete to authenticated using (
  exists(select 1 from public.banquillo_teams t
    join public.banquillo_clubs c on c.id=t.club_id
    where t.id=team_id and t.archived_at is null and
     (c.owner_id=(select auth.uid()) or exists (
       select 1 from public.banquillo_club_directors d
       where d.club_id=c.id and d.user_id=(select auth.uid())))));

-- La capacidad de 12 se aplica a equipos activos, no a archivados.
create or replace function public.banquillo_team_guard() returns trigger
language plpgsql security definer set search_path = '' as $guard$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtext(new.club_id::text),64017);
 if tg_op = 'UPDATE' and new.club_id is distinct from old.club_id
  then raise exception 'club_move_forbidden'; end if;
 if new.archived_at is null and (tg_op='INSERT' or old.archived_at is not null) then
  select count(*) into n from public.banquillo_teams
    where club_id=new.club_id and archived_at is null;
  if n>=12 then raise exception 'team_limit'; end if;
 end if;
 if new.season_id is not null and
    (tg_op='INSERT' or new.season_id is distinct from old.season_id) then
   if not exists(select 1 from public.seasons_meta sm
     where sm.season_id=new.season_id and sm.owner_id=auth.uid())
     then raise exception 'season_owner_required'; end if;
 end if;
 return new;
end $guard$;
revoke all on function public.banquillo_team_guard() from public,anon,authenticated;

-- Protección adicional: impedir mover o reabrir registros de plantilla técnica por UPDATE.
create or replace function public.banquillo_staff_guard() returns trigger
language plpgsql security invoker set search_path = '' as $guard$
begin
 if tg_op='UPDATE' and new.team_id is distinct from old.team_id
   then raise exception 'staff_team_move_forbidden'; end if;
 return new;
end $guard$;
create trigger banquillo_staff_guard_trg before update on public.banquillo_team_staff
 for each row execute function public.banquillo_staff_guard();
revoke all on function public.banquillo_staff_guard() from public,anon,authenticated;
commit;