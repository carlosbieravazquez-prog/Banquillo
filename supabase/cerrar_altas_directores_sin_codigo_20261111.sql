begin;
-- Las altas y bajas de directores se hacen exclusivamente mediante
-- banquillo_join_club(), banquillo_eject_director() y banquillo_leave_club().
revoke insert,update,delete on public.banquillo_club_directors from public,anon,authenticated;
drop policy if exists club_directors_insert_owner on public.banquillo_club_directors;
drop policy if exists club_directors_delete_owner on public.banquillo_club_directors;
commit;