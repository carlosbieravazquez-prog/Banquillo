const {PGlite}=require('@electric-sql/pglite');
const {pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const fs=require('node:fs');
const path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create publication supabase_realtime;`);
 for(const file of [
  "supabase/schema.sql",
  "supabase/clubes_fase1_borrador.sql",
  "supabase/clubes_directores_codigos.sql",
  "supabase/gestion_equipos_cuerpo_tecnico_20261111.sql",
  "supabase/club_settings_team_profile_20261111.sql",
  "supabase/club_temporadas_codigos_equipo_20261111.sql",
  "supabase/codigos_bloqueo_temporadas_cerradas_20261111.sql",
  "supabase/staff_cargo_otro_20261111.sql",
  "supabase/backup_config_club_20261111.sql",
  "supabase/cierre_beta_eliminar_recuperar_club.sql",
  "supabase/acta_convocatoria_autorresolucion_20261111.sql",
  "supabase/directores_identidad_invitacion_20261111.sql",
  "supabase/gestion_silbatos_agosto_20261111.sql",
  "supabase/mensajeria_privada_actas_20261111.sql",
  "supabase/silbatos_revocar_trigger_publico_20261111.sql",
  "supabase/cerrar_altas_directores_sin_codigo_20261111.sql",
  "supabase/creacion_equipo_automatica_20261111.sql",
  "supabase/emparejamiento_cuentas_reales_20261111.sql",
  "supabase/restauracion_config_sin_plantillas_ficticias_20261111.sql",
  "supabase/revocar_titularidad_al_expulsar_director_20261111.sql",
  "supabase/vincular_temporadas_existentes_20261111.sql",
  "supabase/codigos_cortos_intentos_separados_20261111.sql",
  "supabase/separar_intentos_temporada_independiente_20261111.sql",
  "supabase/archivar_equipo_desde_temporadas_20261111.sql",
  "supabase/eliminar_club_revocando_accesos_20261111.sql",
  "supabase/gestion_segura_de_abandonos_y_temporadas_20261111.sql",
  "supabase/actualizar_reservas_al_cambiar_actas_20261111.sql",
  "supabase/limpiar_reservas_si_el_equipo_cambia_20261111.sql",
  "supabase/planificador_real_partidos_locales_20261111.sql",
  "supabase/permisos_directores_edicion_temporadas_20261113.sql",
  "supabase/indexar_claves_foraneas_banquillo_20261113.sql"
]){
 try {await db.exec(source(file)); console.log('OK',file);}
 catch(e){throw new Error(file+': '+e.message);}
 }
 const uid=n=>'00000000-0000-0000-0000-00000000000'+n;
 for(let n=1;n<=4;n++)await db.query('insert into auth.users values ($1,$2,now(),$3)',[uid(n),n+'@example.test',{}]);
 const as=async(n,fn)=>{
  await db.exec('set role authenticated');
  try {
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid(n)]);
   return await fn();
  } finally {await db.exec('reset role');}
 };
 const rows=async(q,a=[]) => (await db.query(q,a)).rows;
 const value=async(q,a=[]) => (await rows('select '+q+' as v',a))[0].v;
 const rpc=(n,q,a)=>as(n,()=>value(q,a));
 await db.exec(`grant truncate, references, trigger on public.banquillo_clubs, public.banquillo_teams,
  public.banquillo_club_directors, public.banquillo_club_settings, public.banquillo_team_staff to anon, authenticated`);
 await db.exec(source('supabase/privilegios_cliente_candidata.sql'));
 assert.equal(await value(`exists(select from pg_class c where c.oid in ('public.banquillo_clubs'::regclass,
   'public.banquillo_teams'::regclass,'public.banquillo_club_directors'::regclass,
   'public.banquillo_club_settings'::regclass,'public.banquillo_team_staff'::regclass)
   and (has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE')))`), false);
 const club=await rpc(1,"banquillo_create_club('Club ficticio','2026/2027')");
 const {season_id:sid,team_id:tid}=await rpc(1,"banquillo_create_club_team($1,'Cadete ficticio','F11','Cadete','')",[club]);
 const inv=await rpc(1,'banquillo_director_invite($1,false)',[club]);
 await db.query("update banquillo_club_codes set expires_at=now()-interval '1 minute' where club_id=$1",[club]);
 assert.equal((await rpc(2,'banquillo_join_club($1)',[inv.code])).error,'invalid_or_expired_code');
 const replacement=await rpc(1,'banquillo_director_invite($1,false)',[club]);
 const fresh=await rpc(1,'banquillo_director_invite($1,true)',[club]);
 assert.notEqual(fresh.code,replacement.code);
 assert.notEqual(fresh.code,inv.code);
 assert.equal((await rpc(2,'banquillo_join_club($1)',[replacement.code])).ok,false);
 assert.equal((await rpc(2,'banquillo_join_club($1)',[fresh.code])).ok,true);
 assert.equal((await rpc(4,'banquillo_join_club($1)',[fresh.code])).ok,false);
 const oldCode=await rpc(2,'banquillo_team_code($1,false)',[tid]);
 const code=await rpc(2,'banquillo_team_code($1,true)',[tid]);
 assert.notEqual(code,oldCode);
 assert.equal((await rpc(3,'banquillo_join_team($1)',[oldCode])).ok,false);
 assert.equal((await rpc(3,'banquillo_join_team($1)',[code])).status,'pending');
 assert.equal(await rpc(3,'can_edit($1)',[sid]),false);
 assert.equal((await rpc(2,"banquillo_assign_team_member($1,$2,'head_coach','')",[tid,uid(3)])).ok,true);
 for(const n of [1,2,3])assert.equal(await rpc(n,'can_edit($1)',[sid]),true);
 assert.equal(await rpc(4,'can_edit($1)',[sid]),false);
 const matchPath='seasons/'+sid+'/matches/1';
 await as(2,()=>rows('insert into docs(season_id,path,data) values($1,$2,$3)',[sid,matchPath,{n:1,rival:'Rival ficticio'}]));
 assert.equal((await as(2,()=>rows('select path from docs where path=$1',[matchPath]))).length,1);
 assert.equal((await as(4,()=>rows('select path from docs where path=$1',[matchPath]))).length,0);
 const sent=await rpc(2,"banquillo_send_team_message($1,'acta','Acta ficticia','Completar acta',1)",[tid]);
 assert.equal(sent.sent,1);
 const inbox=()=>rows("select id, read_at, resolved_at from banquillo_team_messages where team_id=$1",[tid]);
 assert.equal((await as(4,inbox)).length,0);
 const [msg]=await as(3,inbox);
 assert.equal(await rpc(3,'banquillo_mark_message_read($1)',[msg.id]),true);
 assert.equal((await as(3,()=>rows('update docs set data=$2 where path=$1 returning path',
     [matchPath,{n:1,ourGoals:2,rivalGoals:1,callDone:true,closed:true}]))).length,1);
 assert.ok((await as(3,inbox))[0].resolved_at);
 assert.equal(await rpc(1,'banquillo_eject_director($1,$2)',[club,uid(2)]),true);
 assert.equal(await rpc(2,'can_edit($1)',[sid]),false);
 assert.equal((await as(2,()=>rows('select path from docs where path=$1',[matchPath]))).length,0);
 assert.equal(await rpc(1,'banquillo_close_club_season($1)',[club]),true);
 assert.equal((await rpc(4,'banquillo_join_team($1)',[code])).ok,false);
 console.log('OK: privilegios, códigos, roles, acta, convocatoria, mensajes, expulsión y cierre.');
 } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1})
