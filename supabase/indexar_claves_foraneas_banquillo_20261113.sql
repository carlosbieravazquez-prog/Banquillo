-- Banquillo · índices para claves foráneas detectadas por Supabase Advisor
-- Mejora el coste de JOIN/DELETE/UPDATE en relaciones; no cambia permisos ni datos.
-- Preparado para despliegue controlado tras prueba en rama aislada.
begin;

create index if not exists bq_de_message_id_idx
  on public.banquillo_director_events (message_id);
create index if not exists bq_de_team_id_idx
  on public.banquillo_director_events (team_id);
create index if not exists bq_mcharges_user_id_idx
  on public.banquillo_management_charges (user_id);
create index if not exists bq_tmm_approved_by_idx
  on public.banquillo_team_members (approved_by);
create index if not exists bq_tmm_season_id_idx
  on public.banquillo_team_members (season_id);
create index if not exists bq_tmsg_club_id_idx
  on public.banquillo_team_messages (club_id);
create index if not exists bq_tmsg_season_id_idx
  on public.banquillo_team_messages (season_id);
create index if not exists bq_tmsg_sender_id_idx
  on public.banquillo_team_messages (sender_id);

commit;
