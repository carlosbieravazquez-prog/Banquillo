-- Corrección preparada para validación y aprobación de publicación.
begin;
revoke truncate, references, trigger
  on table public.banquillo_clubs, public.banquillo_teams,
           public.banquillo_club_directors, public.banquillo_club_settings,
           public.banquillo_team_staff
  from public, anon, authenticated;
commit;
