-- Mensajería privada de Banquillo, limitada por equipo y destinatario.
begin;
create table if not exists public.banquillo_team_messages(
 id uuid primary key default gen_random_uuid(),
 club_id uuid not null references public.banquillo_clubs(id),
 team_id uuid not null references public.banquillo_teams(id),
 season_id text not null references public.seasons_meta(season_id),
 sender_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 kind text not null check(kind in ('manual','acta','convocatoria')),
 match_n integer check(match_n between 1 and 99),
 title text not null check(length(btrim(title)) between 3 and 120),
 body text not null check(length(btrim(body)) between 3 and 1500),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 resolved_at timestamptz,
 resolution text
);
create index if not exists banquillo_messages_inbox_idx on public.banquillo_team_messages(recipient_id,created_at desc);
create index if not exists banquillo_messages_team_idx on public.banquillo_team_messages(team_id,created_at desc);
create unique index if not exists banquillo_messages_one_pending_acta on public.banquillo_team_messages(team_id,recipient_id,match_n)
 where kind='acta' and resolved_at is null;
create table if not exists public.banquillo_director_events(
 id bigint generated always as identity primary key,
 club_id uuid not null references public.banquillo_clubs(id),
 team_id uuid not null references public.banquillo_teams(id),
 message_id uuid references public.banquillo_team_messages(id),
 kind text not null check(kind in ('acta_resuelta','convocatoria_resuelta')),
 title text not null,
 created_at timestamptz not null default now()
);
create index if not exists banquillo_director_events_idx on public.banquillo_director_events(club_id,created_at desc);
alter table public.banquillo_team_messages enable row level security;
alter table public.banquillo_director_events enable row level security;
revoke all on public.banquillo_team_messages from public,anon,authenticated;
revoke all on public.banquillo_director_events from public,anon,authenticated;
grant select on public.banquillo_team_messages,public.banquillo_director_events to authenticated;

create policy banquillo_messages_read on public.banquillo_team_messages
 for select to authenticated using(
  (recipient_id=(select auth.uid()) and exists(
   select 1 from public.season_members sm
   where sm.season_id=banquillo_team_messages.season_id and sm.user_id=(select auth.uid())))
  or exists(select 1 from public.banquillo_clubs c
   where c.id=banquillo_team_messages.club_id and c.deleted_at is null
   and (c.owner_id=(select auth.uid()) or exists(
    select 1 from public.banquillo_club_directors d
    where d.club_id=c.id and d.user_id=(select auth.uid()))))
 );
create policy banquillo_events_read on public.banquillo_director_events
 for select to authenticated using(
 exists(select 1 from public.banquillo_clubs c
 where c.id=banquillo_director_events.club_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or exists(
 select 1 from public.banquillo_club_directors d where d.club_id=c.id and d.user_id=(select auth.uid()))))
 );

create or replace function public.banquillo_send_team_message(
 p_team_id uuid,p_kind text,p_title text,p_body text,p_match_n integer default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_teams;v_club public.banquillo_clubs; v_count integer:=0;v_target record;v_new uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select * into v from public.banquillo_teams where id=p_team_id and archived_at is null;
 if v.id is null or v.season_id is null then raise exception 'team_requires_linked_season';end if;
 select * into v_club from public.banquillo_clubs where id=v.club_id and deleted_at is null;
 if v_club.id is null or not(v_club.owner_id=auth.uid() or exists(
 select 1 from public.banquillo_club_directors d where d.club_id=v_club.id and d.user_id=auth.uid()))
 then raise exception 'not_club_director';end if;
 if p_kind not in ('manual','acta','convocatoria') or
 length(btrim(coalesce(p_title,''))) not between 3 and 120 or
 length(btrim(coalesce(p_body,''))) not between 3 and 1500
 then raise exception 'invalid_message';end if;
 if p_kind<>'manual' and (p_match_n is null or p_match_n not between 1 and 99)
 then raise exception 'match_number_required';end if;
 if p_match_n is not null and p_match_n not between 1 and 99
 then raise exception 'invalid_match_number';end if;
 -- Un director escribe un único mensaje, entregado solo a las cuentas editoras
 -- de la temporada de ese equipo, nunca a entrenadores de otro equipo.
 for v_target in
 select sm.user_id from public.season_members sm
 where sm.season_id=v.season_id and sm.role='editor'
 and sm.user_id<>auth.uid()
 loop
  if p_kind='acta' and exists(
    select 1 from public.banquillo_team_messages m
    where m.team_id=v.id and m.recipient_id=v_target.user_id and m.kind='acta'
      and m.match_n=p_match_n and m.resolved_at is null
  ) then continue;end if;
  insert into public.banquillo_team_messages(
   club_id,team_id,season_id,sender_id,recipient_id,kind,match_n,title,body)
  values(v_club.id,v.id,v.season_id,auth.uid(),v_target.user_id,
   p_kind,p_match_n,btrim(p_title),btrim(p_body)) returning id into v_new;
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('ok',true,'sent',v_count,'team_id',p_team_id);
end $fn$;

create or replace function public.banquillo_mark_message_read(p_message_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare n integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 update public.banquillo_team_messages
 set read_at=coalesce(read_at,now())
 where id=p_message_id and recipient_id=auth.uid() and exists(
 select 1 from public.season_members sm
 where sm.season_id=banquillo_team_messages.season_id and sm.user_id=auth.uid());
 get diagnostics n=row_count;
 return n=1;
end $fn$;

-- Resolución automática y notificación al DD al guardar un acta completa
-- con ambos resultados, y al confirmar una convocatoria.
create or replace function public.banquillo_resolve_notice_from_doc()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_n integer;v numeric;v2 numeric;v_date date;v_kind text;r record;
begin
 if new.path not like 'seasons/'||new.season_id||'/matches/%'
  or coalesce(new.data->>'n','') !~ '^[0-9]{1,2}$' then return new;end if;
 v_n:=(new.data->>'n')::integer;
 if v_n not between 1 and 99 then return new;end if;
 if new.data->>'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
   v_date:=(new.data->>'date')::date;
   if v_date>current_date then return new;end if;
 end if;
 if new.data->>'ourGoals' ~ '^[0-9]{1,3}$'
  and new.data->>'rivalGoals' ~ '^[0-9]{1,3}$' then
  v_kind='acta';
 elsif coalesce(new.data->>'callDone','false')='true' then
  v_kind='convocatoria';
 else return new;end if;
 for r in update public.banquillo_team_messages
  set resolved_at=now(),resolution='detectado_al_guardar_acta'
  where season_id=new.season_id and match_n=v_n and kind=v_kind and resolved_at is null
  returning id,club_id,team_id,kind
 loop
  insert into public.banquillo_director_events(club_id,team_id,message_id,kind,title)
  values(r.club_id,r.team_id,r.id,
  case when r.kind='acta' then 'acta_resuelta' else 'convocatoria_resuelta' end,
  case when r.kind='acta' then 'Acta cerrada · Jornada '||v_n
  else 'Convocatoria confirmada · Jornada '||v_n end);
 end loop;
 return new;
end $fn$;
drop trigger if exists banquillo_notice_doc_trg on public.docs;
create trigger banquillo_notice_doc_trg
 after insert or update of data on public.docs
 for each row execute function public.banquillo_resolve_notice_from_doc();

revoke all on function public.banquillo_send_team_message(uuid,text,text,text,integer) from public,anon;
revoke all on function public.banquillo_mark_message_read(uuid) from public,anon;
revoke all on function public.banquillo_resolve_notice_from_doc() from public,anon,authenticated;
grant execute on function public.banquillo_send_team_message(uuid,text,text,text,integer) to authenticated;
grant execute on function public.banquillo_mark_message_read(uuid) to authenticated;
commit;