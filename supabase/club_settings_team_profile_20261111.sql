-- Perfil editable de clubes y equipos. Sin datos privados ni credenciales.
begin;
alter table public.banquillo_teams
 add column if not exists category text not null default '' check (char_length(category)<=60),
 add column if not exists competition text not null default '' check (char_length(competition)<=100),
 add column if not exists settings jsonb not null default '{}'::jsonb;

create table if not exists public.banquillo_club_settings (
 club_id uuid primary key references public.banquillo_clubs(id) on delete cascade,
 town text not null default '' check (char_length(town)<=80),
 province text not null default '' check (char_length(province)<=80),
 community text not null default '' check (char_length(community)<=80),
 fields_f11 integer not null default 0 check(fields_f11 between 0 and 25),
 fields_f7 integer not null default 0 check(fields_f7 between 0 and 50),
 divisible jsonb not null default '[]'::jsonb,
 colors jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.banquillo_club_settings enable row level security;
revoke all on public.banquillo_club_settings from anon;
grant select,insert,update on public.banquillo_club_settings to authenticated;
create policy club_settings_select on public.banquillo_club_settings
 for select to authenticated using(
   exists(select 1 from public.banquillo_clubs c where c.id=club_id and
    (c.owner_id=(select auth.uid()) or exists(select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=(select auth.uid())))));
create policy club_settings_insert on public.banquillo_club_settings
 for insert to authenticated with check(
   exists(select 1 from public.banquillo_clubs c where c.id=club_id and
    (c.owner_id=(select auth.uid()) or exists(select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=(select auth.uid())))));
create policy club_settings_update on public.banquillo_club_settings
 for update to authenticated using(
   exists(select 1 from public.banquillo_clubs c where c.id=club_id and
    (c.owner_id=(select auth.uid()) or exists(select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=(select auth.uid())))))
 with check(
   exists(select 1 from public.banquillo_clubs c where c.id=club_id and
    (c.owner_id=(select auth.uid()) or exists(select 1 from public.banquillo_club_directors d
     where d.club_id=c.id and d.user_id=(select auth.uid())))));
commit;