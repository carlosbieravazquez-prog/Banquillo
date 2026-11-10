const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const r=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");

test("Acceso ofrece iniciar sesión, registrarse y unirse al club",()=>{
 const src=r("js/auth.js");
 for(const x of ['data-v="login"','data-v="signup"','data-v="join"'])assert.ok(src.includes(x));
 assert.match(src,/u\.mode === "welcome"/);
 assert.match(src,/Unirme a mi club/);
 assert.match(src,/A\.ui\.mode === "join" \? val\(f,"join_code"\)/);
 assert.match(src,/validCode\(code\)/);
});
test("El código del equipo no se pone en metadata JWT ni en enlaces de confirmación",()=>{
 const auth=r("js/auth.js");
 assert.match(auth,/localStorage\.setItem\(PENDING_KEY/);
 assert.match(auth,/localStorage\.getItem\(PENDING_KEY/);
 assert.match(auth,/Date\.now\(\)\+3600000/);
 assert.match(auth,/pending\.expires<Date\.now\(\)/);
 assert.match(auth,/sessionUser\.email\|\|""/);
 assert.match(auth,/clearPendingJoin\(\);\s*try/);
 assert.match(auth,/Cloud\.rpc\("join_season",\{p_code:pending\.code\}\)/);
 assert.match(auth,/emailRedirectTo: redirectUrl\(\)/);
 assert.match(auth,/options: \{ data: \{ name \}/);
 assert.doesNotMatch(auth,/data: \{ name, (?:code|join_code)/);
});
test("Dirección deportiva forma parte de la navegación móvil y funciona sin temporadas",()=>{
 const core=r("js/core.js");
 assert.match(core,/\["clubes", "Clubes", "layers"\]/);
 assert.match(core,/UI\.route\.name === "clubes"\) return V\.clubes\(\)/);
 assert.match(core,/Crear o gestionar un club/);
 assert.match(r("staging.html"),/src="js\/clubs.js"/);
 assert.match(r("index.html"),/src="js\/clubs.js"/);
 const html=r("staging.html");
 assert.ok(html.indexOf('src="js/views3.js"')<html.indexOf('src="js/clubs.js"'));
 assert.ok(html.indexOf('src="js/clubs.js"')<html.indexOf('src="js/auth.js"'));
});
test("Cada equipo obtiene su código propio; los entrenadores nunca reciben código de club",()=>{
 const sql=r("supabase/migrations/20261110231500_bq_clubs_teams_directors_staging.sql");
 assert.match(sql,/create or replace function public\.bq_create_team/);
 assert.match(sql,/v_code:=public\.gen_join_code\(\)/);
 assert.match(sql,/insert into public\.seasons_meta\(season_id,owner_id,join_code\)/);
 assert.match(sql,/insert into public\.bq_club_teams/);
 assert.match(sql,/insert into public\.season_members\(season_id,user_id,role\)\s*select v_id,d\.user_id,'owner'/);
 assert.match(sql,/bq_add_director\(p_club uuid,p_email text\)/);
 assert.match(sql,/where lower\(email\)=lower/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/revoke all on public\.bq_clubs,public\.bq_club_directors,public\.bq_club_teams/);
 assert.match(sql,/alter table public\.bq_club_teams enable row level security/);
 assert.doesNotMatch(sql,/create policy.*bq_club_teams/i);
});
test("Los miembros de club se consultan por RPC verificada y no por consulta pública",()=>{
 const js=r("js/clubs.js");
 assert.match(js,/Cloud\.rpc\("bq_clubs_list"\)/);
 assert.match(js,/Cloud\.rpc\("bq_create_club"/);
 assert.match(js,/Cloud\.rpc\("bq_create_team"/);
 assert.match(js,/Cloud\.rpc\("bq_rotate_team_code"/);
 assert.match(js,/Cloud\.rpc\("bq_set_team_code_enabled"/);
 assert.match(js,/Cloud\.rpc\("bq_add_director"/);
 assert.match(js,/Cloud\.rpc\("bq_remove_director"/);
 assert.match(js,/ClubSpace\.clubPage\(\)/);
 assert.match(js,/const uid=Auth\.uid/);
 assert.match(js,/Auth\.uid!==uid/);
 assert.match(r("js/auth.js"),/ClubSpace\.reset\(\)/);
});
test("Email de confirmación incluye variable real de Supabase y botones accesibles",()=>{
 const html=r("supabase/email/confirmacion-banquillo.html");
 assert.equal((html.match(/\{\{ \.ConfirmationURL \}\}/g)||[]).length,3);
 assert.match(html,/Confirmar mi cuenta/);
 assert.match(html,/Banquillo/);
 assert.doesNotMatch(html,/Canva|https:\/\/[^\s"']*verify\?token=/);
});
