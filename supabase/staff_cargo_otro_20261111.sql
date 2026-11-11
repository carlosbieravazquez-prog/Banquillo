begin;
alter table public.banquillo_team_staff
  drop constraint if exists banquillo_team_staff_position_check;
alter table public.banquillo_team_staff
  add constraint banquillo_team_staff_position_check
  check (position in ('head_coach','assistant_coach','third_coach','delegate','other'));
alter table public.banquillo_team_staff
  add column if not exists role_detail text not null default '';
alter table public.banquillo_team_staff
  add constraint banquillo_team_staff_role_detail_check check(char_length(role_detail)<=70);
alter table public.banquillo_team_staff
  drop constraint if exists banquillo_team_staff_team_id_position_key;
create unique index if not exists banquillo_staff_one_fixed_role
  on public.banquillo_team_staff(team_id,position)
  where position <> 'other';
commit;