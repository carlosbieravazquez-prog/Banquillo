begin;
-- Función interna de trigger: nunca debe poder invocarse directamente desde la API.
revoke execute on function public.banquillo_refund_closed_season() from public,anon,authenticated;
commit;