-- Avisos internos de Banquillo. APLICAR SOLO EN SUPABASE STAGING.
-- No envía SMS, WhatsApp ni correo; las entregas se guardan en el buzón.
create table if not exists public.bq_team_notices (
 id uuid primary key default gen_random_uuid(),
 club_id uuid not null references public.bq_clubs(id) on delete cascade,
 season_id text not null references public.seasons_meta(season_id) on delete cascade,
 match_path text not null,
 kind text not null default 'acta_pending' check(kind='acta_pending'),
 jornada text not null default '',
 rival text not null default '',
 event_date date not null,
 created_at timestamptz not null default now(),
 ignored_at timestamptz,
 reminded_at timestamptz,
 resolved_at timestamptz,
 unique(season_id,match_path,kind)
);
create index if not exists bq_team_notices_club_idx on public.bq_team_notices(club_id,created_at);
create table if not exists public.bq_team_inbox (
 id uuid primary key default gen_random_uuid(),
 notice_id uuid not null references public.bq_team_notices(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 delivery text not null check(delivery in ('director','reminder')),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(notice_id,user_id,delivery)
);
create index if not exists bq_team_inbox_user_idx on public.bq_team_inbox(user_id,created_at desc);
alter table public.bq_team_notices enable row level security;
alter table public.bq_team_inbox enable row level security;
revoke all on public.bq_team_notices,public.bq_team_inbox from public,anon,authenticated;

-- El escaneo usa la fecha del encuentro + tres días: al suponer que
-- la jornada terminó al final de su fecha, garantizamos al menos 48 h.
create or replace function public.bq_sync_team_notices()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare created_count integer;resolved_count integer;reminders_count integer;
begin
 insert into public.bq_team_notices(club_id,season_id,match_path,jornada,rival,event_date)
 select t.club_id,t.season_id,d.path,
        left(coalesce(d.data->>'n',''),15),left(coalesce(d.data->>'rival',''),100),
        (d.data->>'date')::date
 from public.bq_club_teams t
 join public.docs d on d.season_id=t.season_id
  and d.path like 'seasons/'||t.season_id||'/matches/%'
 where (d.data->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   and (d.data->>'date')::date <= current_date-3
   and coalesce(d.data->>'rest','false')<>'true'
   and coalesce(d.data->>'closed','false')<>'true'
 on conflict(season_id,match_path,kind) do nothing;
 get diagnostics created_count=row_count;
 -- Resolver automáticamente cuando el acta esté cerrada o se borre el partido.
 update public.bq_team_notices n set resolved_at=now()
 where n.resolved_at is null
 and not exists(
  select 1 from public.docs d where d.season_id=n.season_id
    and d.path=n.match_path
    and coalesce(d.data->>'closed','false')<>'true'
 );
 get diagnostics resolved_count=row_count;
 -- Recordatorio único y automático dentro de la app. El coach debe seguir
 -- perteneciendo al equipo. Una clave única impide duplicados incluso
 -- si un escaneo se solapa con otro.
 insert into public.bq_team_inbox(notice_id,user_id,delivery)
 select n.id,m.user_id,'reminder'
 from public.bq_team_notices n
 join public.season_members m on m.season_id=n.season_id and m.role='editor'
 where n.ignored_at is not null
   and n.ignored_at<=now()-interval '7 days'
   and n.resolved_at is null and n.reminded_at is null
   and not exists(select 1 from public.bq_club_directors dir
     where dir.club_id=n.club_id and dir.user_id=m.user_id)
 on conflict(notice_id,user_id,delivery) do nothing;
 get diagnostics reminders_count=row_count;
 update public.bq_team_notices n set reminded_at=now()
 where n.ignored_at is not null
  and n.ignored_at<=now()-interval '7 days'
  and n.reminded_at is null and n.resolved_at is null
  and exists(select 1 from public.season_members m
             where m.season_id=n.season_id and m.role='editor');
 return jsonb_build_object('new',created_count,'resolved',resolved_count,
                           'reminders',reminders_count);
end $$;

create or replace function public.bq_list_team_notices(p_club uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or not public.bq_is_director(p_club) then
   raise exception 'not_club_director' using errcode='42501';
 end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
    'id',n.id,'season_id',n.season_id,'team',t.name,'modality',t.modality,
    'jornada',n.jornada,'rival',n.rival,'kind',n.kind,
    'event_date',n.event_date,'ignored_at',n.ignored_at,
    'reminded_at',n.reminded_at,'resolved_at',n.resolved_at,
    'created_at',n.created_at,'delivery_count',
       (select count(*) from public.bq_team_inbox i where i.notice_id=n.id)
    ) order by n.created_at desc)
  from public.bq_team_notices n
  join public.bq_club_teams t on t.club_id=n.club_id and t.season_id=n.season_id
  where n.club_id=p_club
    and (n.resolved_at is null or n.resolved_at>now()-interval '1 day')
 ),'[]'::jsonb);
end $$;

create or replace function public.bq_ignore_team_notice(p_club uuid,p_notice uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not public.bq_is_director(p_club) then
   raise exception 'not_club_director' using errcode='42501';
 end if;
 update public.bq_team_notices
 set ignored_at=coalesce(ignored_at,now())
 where id=p_notice and club_id=p_club and resolved_at is null;
 if not found then raise exception 'notice_not_found';end if;
end $$;

create or replace function public.bq_send_team_notice(p_club uuid,p_notice uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare count_created integer;
begin
 if auth.uid() is null or not public.bq_is_director(p_club) then
   raise exception 'not_club_director' using errcode='42501';
 end if;
 if not exists(select 1 from public.bq_team_notices
               where id=p_notice and club_id=p_club and resolved_at is null) then
   raise exception 'notice_not_found';
 end if;
 insert into public.bq_team_inbox(notice_id,user_id,delivery)
 select n.id,m.user_id,'director'
 from public.bq_team_notices n
 join public.season_members m on m.season_id=n.season_id and m.role='editor'
 where n.id=p_notice and n.club_id=p_club
   and not exists(select 1 from public.bq_club_directors dir
                  where dir.club_id=p_club and dir.user_id=m.user_id)
 on conflict(notice_id,user_id,delivery) do nothing;
 get diagnostics count_created=row_count;
 return count_created;
end $$;

create or replace function public.bq_my_team_inbox()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
    'id',i.id,'season_id',n.season_id,'team',t.name,
    'jornada',n.jornada,'rival',n.rival,
    'director',coalesce(p.display_name,'Dirección Deportiva'),
    'kind',n.kind,'delivery',i.delivery,
    'created_at',i.created_at,'read_at',i.read_at,
    'resolved_at',n.resolved_at
   ) order by i.created_at desc)
  from public.bq_team_inbox i
  join public.bq_team_notices n on n.id=i.notice_id
  join public.bq_club_teams t on t.season_id=n.season_id
  join public.bq_clubs c on c.id=n.club_id
  left join public.profiles p on p.user_id=c.owner_id
  where i.user_id=auth.uid()
    and exists(select 1 from public.season_members m where m.season_id=n.season_id
               and m.user_id=auth.uid() and m.role='editor')
    and (n.resolved_at is null or n.resolved_at>now()-interval '1 day')
 ),'[]'::jsonb);
end $$;

create or replace function public.bq_read_team_notice(p_inbox uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 update public.bq_team_inbox set read_at=coalesce(read_at,now())
 where id=p_inbox and user_id=auth.uid()
   and exists(select 1 from public.bq_team_notices n
     join public.season_members m on m.season_id=n.season_id
     where n.id=notice_id and m.user_id=auth.uid() and m.role='editor');
 if not found then raise exception 'notice_not_found';end if;
end $$;

revoke all on function public.bq_sync_team_notices() from public,anon,authenticated;
revoke all on function public.bq_list_team_notices(uuid) from public,anon,authenticated;
revoke all on function public.bq_ignore_team_notice(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bq_send_team_notice(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bq_my_team_inbox() from public,anon,authenticated;
revoke all on function public.bq_read_team_notice(uuid) from public,anon,authenticated;
grant execute on function public.bq_list_team_notices(uuid) to authenticated;
grant execute on function public.bq_ignore_team_notice(uuid,uuid) to authenticated;
grant execute on function public.bq_send_team_notice(uuid,uuid) to authenticated;
grant execute on function public.bq_my_team_inbox() to authenticated;
grant execute on function public.bq_read_team_notice(uuid) to authenticated;
