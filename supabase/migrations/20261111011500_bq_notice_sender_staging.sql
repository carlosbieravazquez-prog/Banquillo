-- Staging: identificar quién envió el aviso manual (sin atribuirlo al otro director).
alter table public.bq_team_inbox add column if not exists sender_id uuid references auth.users(id) on delete set null;
create or replace function public.bq_send_team_notice(p_club uuid,p_notice uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare count_created integer;
begin
 if auth.uid() is null or not public.bq_is_director(p_club) then
   raise exception 'not_club_director' using errcode='42501';
 end if;
 if not exists(select 1 from public.bq_team_notices n
   join public.docs d on d.season_id=n.season_id and d.path=n.match_path
   where n.id=p_notice and n.club_id=p_club and n.resolved_at is null
   and coalesce(d.data->>'closed','false')<>'true') then
   raise exception 'notice_not_open';
 end if;
 insert into public.bq_team_inbox(notice_id,user_id,delivery,sender_id)
 select n.id,m.user_id,'director',auth.uid()
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
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
    'id',i.id,'season_id',n.season_id,'team',t.name,
    'jornada',n.jornada,'rival',n.rival,
    'director',coalesce(nullif(btrim(sp.display_name),''),'Dirección Deportiva'),
    'kind',n.kind,'delivery',i.delivery,
    'created_at',i.created_at,'read_at',i.read_at,
    'resolved_at',n.resolved_at
  ) order by i.created_at desc)
  from public.bq_team_inbox i
  join public.bq_team_notices n on n.id=i.notice_id
  join public.bq_club_teams t on t.season_id=n.season_id
  left join public.profiles sp on sp.user_id=i.sender_id
  where i.user_id=auth.uid()
    and exists(select 1 from public.season_members m where m.season_id=n.season_id
               and m.user_id=auth.uid() and m.role='editor')
    and (n.resolved_at is null or n.resolved_at>now()-interval '1 day')
 ),'[]'::jsonb);
end $$;
revoke all on function public.bq_send_team_notice(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bq_my_team_inbox() from public,anon,authenticated;
grant execute on function public.bq_send_team_notice(uuid,uuid) to authenticated;
grant execute on function public.bq_my_team_inbox() to authenticated;
