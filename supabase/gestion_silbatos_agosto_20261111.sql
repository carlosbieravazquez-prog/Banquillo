-- Silbatos de gestión, independientes de los Silbatos de IA.
-- Cada año deportivo comienza el 1 de agosto. Saldo inicial y recarga: 20 (sin acumular).
begin;
create table if not exists public.banquillo_management_wallet(
 user_id uuid primary key references auth.users(id) on delete cascade,
 season_year integer not null,
 balance integer not null default 20 check(balance between 0 and 20),
 updated_at timestamptz not null default now()
);
create table if not exists public.banquillo_management_charges(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('club','solo_team')),
 object_id text not null,
 season_year integer not null,
 amount integer not null check(amount in (5,10)),
 charged_at timestamptz not null default now(),
 refunded_at timestamptz,
 unique(kind,object_id)
);
alter table public.banquillo_management_wallet enable row level security;
alter table public.banquillo_management_charges enable row level security;
revoke all on public.banquillo_management_wallet from public,anon,authenticated;
revoke all on public.banquillo_management_charges from public,anon,authenticated;

create or replace function public.banquillo_management_year()
returns integer language sql stable security invoker set search_path='' as $fn$
 select case when extract(month from (now() at time zone 'Europe/Madrid')) >= 8
 then extract(year from (now() at time zone 'Europe/Madrid'))::integer
 else extract(year from (now() at time zone 'Europe/Madrid'))::integer - 1 end;
$fn$;

create or replace function public.banquillo_ensure_wallet(p_user uuid)
returns integer language plpgsql security definer set search_path='' as $fn$
declare v_year integer:=public.banquillo_management_year();v integer;
begin
 if p_user is null then raise exception 'not_authenticated';end if;
 insert into public.banquillo_management_wallet(user_id,season_year,balance)
 values(p_user,v_year,20)
 on conflict(user_id) do update set
 season_year=excluded.season_year,balance=20,updated_at=now()
 where public.banquillo_management_wallet.season_year<>excluded.season_year;
 select balance into v from public.banquillo_management_wallet where user_id=p_user for update;
 return v;
end $fn$;
create or replace function public.banquillo_charge_management(p_kind text,p_object text,p_amount integer)
returns integer language plpgsql security definer set search_path='' as $fn$
declare v_uid uuid:=auth.uid();v integer;v_year integer:=public.banquillo_management_year();
begin
 if v_uid is null or p_kind not in ('club','solo_team') or p_amount not in (5,10)
 then raise exception 'invalid_charge';end if;
 perform public.banquillo_ensure_wallet(v_uid);
 update public.banquillo_management_wallet
 set balance=balance-p_amount,updated_at=now()
 where user_id=v_uid and balance>=p_amount returning balance into v;
 if v is null then raise exception 'insufficient_management_whistles';end if;
 insert into public.banquillo_management_charges(user_id,kind,object_id,season_year,amount)
 values(v_uid,p_kind,p_object,v_year,p_amount);
 return v;
end $fn$;
create or replace function public.banquillo_refund_management(p_kind text,p_object text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_management_charges;
begin
 select * into v from public.banquillo_management_charges
 where kind=p_kind and object_id=p_object for update;
 if v.id is null or v.refunded_at is not null or v.season_year<>public.banquillo_management_year()
 then return false;end if;
 perform public.banquillo_ensure_wallet(v.user_id);
 update public.banquillo_management_wallet
 set balance=least(20,balance+v.amount),updated_at=now() where user_id=v.user_id;
 update public.banquillo_management_charges set refunded_at=now() where id=v.id;
 return true;
end $fn$;
create or replace function public.banquillo_wallet_status()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v integer;yr integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 v:=public.banquillo_ensure_wallet(auth.uid());yr:=public.banquillo_management_year();
 return jsonb_build_object('balance',v,'season',yr||'/'||(yr+1),
 'next_refill',(yr+1)||'-08-01','club_cost',10,'standalone_team_cost',5,'annual_amount',20);
end $fn$;

-- Sustituye la creación de club manteniendo todas las validaciones e historial.
create or replace function public.banquillo_create_club(p_name text,p_season text default '2026/2027')
returns uuid language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;v_year integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if p_name is null or char_length(btrim(p_name)) not between 2 and 120 then raise exception 'invalid_name';end if;
 if p_season !~ '^20[0-9]{2}/20[0-9]{2}$' then raise exception 'invalid_season';end if;
 v_year:=substring(p_season from 1 for 4)::integer;
 if substring(p_season from 6 for 4)::integer<>v_year+1 then raise exception 'invalid_season';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text),64021);
 if exists(select 1 from public.banquillo_club_seasons s
 where s.owner_id=auth.uid() and s.status='active') then raise exception 'active_club_exists';end if;
 if exists(select 1 from public.banquillo_club_seasons s
 where s.owner_id=auth.uid() and s.season_label=p_season) then raise exception 'season_already_used';end if;
 insert into public.banquillo_clubs(name,owner_id) values(btrim(p_name),auth.uid()) returning id into v_id;
 insert into public.banquillo_club_seasons(club_id,owner_id,season_label,status)
 values(v_id,auth.uid(),p_season,'active');
 perform public.banquillo_charge_management('club',v_id::text,10);
 return v_id;
end $fn$;
-- Una temporada creada de forma independiente cuesta 5 silbatos de gestión.
create or replace function public.create_season(p_id text,p_data jsonb)
returns text language plpgsql security definer set search_path='' as $fn$
declare v_code text;n integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 if p_id is null or p_id !~ '^[A-Za-z0-9_-]{3,60}$' then raise exception 'invalid_id';end if;
 select count(*) into n from public.seasons_meta where owner_id=auth.uid();
 if n>=30 then raise exception 'too_many_seasons';end if;
 loop
  v_code:=public.gen_join_code();
  exit when not exists(select 1 from public.seasons_meta where join_code=v_code);
 end loop;
 begin
 insert into public.seasons_meta(season_id,owner_id,join_code) values(p_id,auth.uid(),v_code);
 exception when unique_violation then raise exception 'season_exists';end;
 insert into public.season_members(season_id,user_id,role) values(p_id,auth.uid(),'owner');
 insert into public.docs(season_id,path,data)
 values(p_id,'seasons/'||p_id,coalesce(p_data,'{}'::jsonb));
 perform public.banquillo_charge_management('solo_team',p_id,5);
 return v_code;
end $fn$;
-- Reembolsar solo en la temporada deportiva en la que se pagó, una sola vez.
create or replace function public.banquillo_refund_closed_season()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.path='seasons/'||new.season_id
 and new.data->>'status'='closed'
 and (tg_op='INSERT' or coalesce(old.data->>'status','')<>'closed') then
  perform public.banquillo_refund_management('solo_team',new.season_id);
 end if;
 return new;
end $fn$;
drop trigger if exists banquillo_refund_closed_season_trg on public.docs;
create trigger banquillo_refund_closed_season_trg after insert or update of data on public.docs
for each row execute function public.banquillo_refund_closed_season();

-- Añadir devolución a cierre de club (conservar el resto de reglas).
create or replace function public.banquillo_close_club_season(p_club_id uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 update public.banquillo_club_seasons s set status='closed',closed_at=now()
 where s.club_id=p_club_id and s.owner_id=auth.uid() and s.status='active';
 get diagnostics v_count=row_count;
 if v_count>0 then perform public.banquillo_refund_management('club',p_club_id::text);end if;
 return v_count>0;
end $fn$;
-- Un club eliminado recibe devolución exclusivamente si su gasto sigue en la temporada en curso.
-- Función wrapper de baja: reproduce validación y limpieza de accesos.
create or replace function public.banquillo_delete_club(p_club_id uuid,p_confirm_name text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v public.banquillo_clubs;
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 select * into v from public.banquillo_clubs where id=p_club_id for update;
 if v.id is null or v.owner_id<>auth.uid() or v.deleted_at is not null then raise exception 'not_club_owner';end if;
 if btrim(coalesce(p_confirm_name,''))<>v.name then raise exception 'club_name_mismatch';end if;
 delete from public.banquillo_club_directors where club_id=p_club_id;
 delete from public.banquillo_club_codes where club_id=p_club_id;
 delete from public.banquillo_team_codes where team_id in(select id from public.banquillo_teams where club_id=p_club_id);
 update public.banquillo_club_seasons set status='closed',closed_at=coalesce(closed_at,now())
 where club_id=p_club_id and status='active';
 update public.banquillo_clubs set deleted_at=now() where id=p_club_id;
 perform public.banquillo_refund_management('club',p_club_id::text);
 return true;
end $fn$;
-- Los saldos no se editan desde el cliente; roles sólo usan la API autenticada.
revoke all on function public.banquillo_ensure_wallet(uuid) from public,anon,authenticated;
revoke all on function public.banquillo_charge_management(text,text,integer) from public,anon,authenticated;
revoke all on function public.banquillo_refund_management(text,text) from public,anon,authenticated;
revoke all on function public.banquillo_management_year() from public,anon,authenticated;
revoke all on function public.banquillo_wallet_status() from public,anon;
grant execute on function public.banquillo_wallet_status() to authenticated;
commit;