-- Banquillo · permisos equivalentes para los dos directores deportivos
-- Permite editar documentos SOLO cuando la temporada pertenece a un equipo
-- activo de un club activo donde auth.uid() es propietario o director.
-- No convierte al segundo director en entrenador/editor de season_members.
-- Aplicar únicamente tras backup y pruebas en proyecto aislado.
begin;

create or replace function public.can_edit(sid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.season_members m
        where m.season_id = sid
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
      or exists (
        select 1
        from public.banquillo_teams t
        join public.banquillo_clubs c on c.id = t.club_id
        where t.season_id = sid
          and t.archived_at is null
          and c.deleted_at is null
          and (
            c.owner_id = (select auth.uid())
            or exists (
              select 1
              from public.banquillo_club_directors d
              where d.club_id = c.id
                and d.user_id = (select auth.uid())
            )
          )
      )
    );
$function$;

-- Mantener la función disponible para RLS y llamadas autenticadas existentes,
-- sin permitir invocación anónima ni herencia de PUBLIC.
revoke execute on function public.can_edit(text) from public, anon;
grant execute on function public.can_edit(text) to authenticated;

commit;

-- Verificación posterior recomendada:
-- SELECT public.can_edit('<season_id_de_prueba>');
-- Ejecutar con sesiones de propietario, segundo director, entrenador editor
-- y usuario ajeno al club. No probar con datos reales de menores.
