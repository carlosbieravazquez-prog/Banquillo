const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const UX=require("../js/demo-club-ux.js");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function state(){
 return {
  club:{name:"Atlético Monteverde CF",season:"2026/2027"},
  directors:[{id:"d1",name:"Director de prueba"}],activeDirector:"d1",
  teams:[{id:"t1",name:"Prebenjamín A",coach:"Sergio",category:"Prebenjamín",modality:"F7",competition:"Liga Educa",players:10},
   {id:"t2",name:"Cadete B",coach:"Elena",category:"Cadete",modality:"F11",competition:"3.ª Andaluza",players:18}],
  notifications:[
   {id:"n1",team:"Cadete B",coach:"Elena",title:"Partido sin cerrar",date:"04/11/2026",detail:"Falta acta"},
   {id:"n2",team:"Prebenjamín A",coach:"Sergio",title:"Convocatoria sin confirmar",date:"05/11/2026",detail:"Falta confirmar"}],
  schedule:[{id:"m1",teamId:"t1",date:"2026-11-14",opponent:"CD Rival",home:true,time:"10:00"}],
  calendarDate:"2026-11-14",modality:"F7"
 };
}
test("El contexto del equipo muestra el entrenador y las siete métricas",()=>{
 const d=state();UX.init(d);
 const t=d.teams[0];
 assert.match(UX.headerTeam(t,UX.details(d,t)),/Sergio/);
 const page=UX.overview(d,t);
 for(const x of ["Partidos","Victorias","Empates","Derrotas","Goles a favor","Goles en contra","Diferencia","Máximos goleadores","más minutos","Más convocatorias"])
  assert.ok(page.toLowerCase().includes(x.toLowerCase()),x);
 assert.match(page,/ficticias|ficticios/i);
});
test("Cada equipo genera un código diferente, reservado a la demo",()=>{
 const d=state();UX.init(d);
 assert.notEqual(UX.details(d,d.teams[0]).code,UX.details(d,d.teams[1]).code);
 assert.match(UX.codePanel(d,d.teams[0]),/CÓDIGO SIMULADO/);
 assert.match(UX.codePanel(d,d.teams[0]),/no permite registrarse/);
 assert.match(UX.coachesPanel(d,d.teams[0]),/Dar de baja y renovar código/);
});
test("Los avisos se filtran de manera efectiva por F7, F11 y todo el club",()=>{
 const d=state();UX.init(d);
 assert.deepEqual(UX.visibleNotices(d).map(x=>x.id).sort(),["n2","n3"]);
 d.modality="F11";assert.deepEqual(UX.visibleNotices(d).map(x=>x.id),["n1"]);
 d.modality="todos";assert.equal(UX.visibleNotices(d).length,3);
 d.notifications[0].resolvedAt=Date.now();
 assert.equal(UX.visibleNotices(d).length,2);
});
test("No se ofrece un aviso antes de 48 horas del evento",()=>{
 const n={date:"10/11/2026"};
 assert.equal(UX.isEligible(n,new Date("2026-11-11T19:00:00").getTime()),false);
 assert.equal(UX.isEligible(n,new Date("2026-11-12T20:00:00").getTime()),true);
});
test("Mensaje del aviso no finge haber enviado algo automáticamente",()=>{
 const d=state();UX.init(d);
 const msg=UX.noticeText(d,d.notifications[0]);
 assert.match(msg,/Dirección Deportiva/);
 assert.match(msg,/Cadete B/);
 const list=UX.noticeList(d);
 assert.match(list,/no existe entrega automática/);
 assert.match(list,/tras 48 horas|48 h/i);
});
test("Planificador mensual ofrece calendario interactivo y A4 horizontal",()=>{
 const d=state();UX.init(d);
 const page=UX.monthView(d),print=UX.printCalendar(d);
 assert.match(page,/data-action="demo-pick-day"/);
 assert.match(page,/Juegan en casa/);
 assert.match(page,/Juegan fuera/);
 assert.match(page,/Descargar calendario horizontal/);
 assert.match(print,/ATLÉTICO|Atlético Monteverde/);
 assert.match(print,/PLANIFICACIÓN DE PARTIDOS/);
 assert.match(read("css/demo-club-ux.css"),/@page\s*\{\s*size:A4 landscape/);
});
test("La demo incluye importación y exportación sin credenciales",()=>{
 const script=read("js/demo-club.js"),html=read("demo-club.html");
 for(const act of ["demo-team-tab","demo-remove-coach","demo-rotate-code","demo-send-notice","demo-resolve-notice","demo-month-view","demo-print-month"])
  assert.ok(script.includes(act),act);
 assert.match(html,/id="importDemoFile"/);
 assert.match(html,/id="exportDemo"/);
 assert.match(html,/js\/demo-club-ux\.js/);
 assert.match(script,/raw\?\.format!=="banquillo-club-demo"/);
 assert.doesNotMatch(script,/Cloud\.rpc|signInWithPassword|service_role/);
});
test("La baja real de entrenador se hace por RPC en staging, no desde la demo",()=>{
 const sql=read("supabase/migrations/20261111003500_bq_team_coach_revocation_staging.sql");
 assert.match(sql,/bq_remove_team_coach\(p_club uuid,p_season text,p_user uuid\)/);
 assert.match(sql,/delete from public\.season_members/);
 assert.match(sql,/update public\.seasons_meta set join_code=v_code/);
 assert.match(sql,/grant execute on function public\.bq_remove_team_coach.*to authenticated/);
 assert.match(read("js/clubs.js"),/Cloud\.rpc\("bq_remove_team_coach"/);
});
