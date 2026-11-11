-- Staging: planificación horaria de avisos internos, sin SMS ni correo.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('banquillo-stage-notices-hourly','0 * * * *','select public.bq_sync_team_notices();');
