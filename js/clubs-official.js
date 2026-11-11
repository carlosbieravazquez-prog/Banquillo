/* Banquillo · Dirección Deportiva conectada. No contiene datos de demostración. */
(() => {
"use strict";
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const POS = [["head_coach","Entrenador principal"],["assistant_coach","Segundo entrenador"],["third_coach","Tercer entrenador"],["delegate","Delegado"],["other","Otro"]];
const labelPos = p => POS.find(x=>x[0]===p)?.[1] || "Personal técnico";
const state = { sb:null,uid:null,clubs:[],clubId:null,teams:[],allTeams:[],periods:[],settings:{},staff:[],
  members:[],docs:[],cache:{},view:"resumen",teamId:null,teamTab:"overview",modality:"todos",
  clubDirectors:[],clubCode:null,teamCode:null,deletedClubs:[],modal:null,loaded:false,loading:false,error:"",month:new Date().getMonth(),
  year:new Date().getFullYear() };
const calls = async query => {const {data,error}=await query;if(error)throw error;return data;};
const rpc = (name,args) => calls(state.sb.rpc(name,args||{}));
const active = () => state.clubs.find(x=>x.id===state.clubId);
const team = () => state.teams.find(x=>x.id===state.teamId);
const owner = () => !!active()&&active().owner_id===state.uid;
const currentPeriod=()=>state.periods.find(x=>x.status==="active");
const nowLabel=()=>new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
const seasonDefault=()=>{const d=new Date(),y=d.getMonth()>=6?d.getFullYear():d.getFullYear()-1;return y+"/"+(y+1)};
const showDate=s=>{if(!s)return"Por definir";const d=new Date(s+"T12:00:00");return Number.isNaN(d.getTime())?String(s):new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(d)};
const errText=e=>{const m=String(e?.message||e||"");if(/active_club_exists/.test(m))return"Ya tienes un club activo. Cierra su temporada antes de crear otro.";if(/season_already_used/.test(m))return"Ya has utilizado esa temporada para otro club.";if(/season_owner_required/.test(m))return"Solo el propietario de la temporada puede vincularla.";if(/duplicate key|unique constraint/i.test(m))return"Ya existe un registro con ese nombre o cargo.";if(/team_limit/.test(m))return"Se ha alcanzado el máximo de 12 equipos activos.";if(/club_name_mismatch/.test(m))return"Escribe exactamente el nombre del club para confirmar.";if(/backup_team_not_found|backup_staff_not_in_club|backup_staff_team_missing|invalid_backup/.test(m))return"La copia no corresponde a este club o tiene datos incompatibles.";if(/active_club_exists/.test(m))return"Ya tienes un club activo. No puedes recuperar otro hasta cerrar su temporada.";if(/director_limit/.test(m))return"Ya hay un segundo director deportivo en este club.";if(/row-level security|permission denied|not_team_manager|not_club_owner|42501/.test(m))return"No tienes permiso para esta operación.";return m||"No ha sido posible completar la operación."};
function notify(txt,tone="ok"){const e=$("#messageBar");e.textContent=txt;e.className="bq-status "+tone;}
const rview=()=>$("#viewRoot");
const head=(title,desc,btns="")=>'<div class="page-head"><div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div>'+btns+'</div>';
const button=(label,action,id="",style="primary")=>'<button type="button" class="btn '+style+'" data-action="'+action+'"'+(id?' data-id="'+esc(id)+'"':'')+'>'+label+'</button>';
function modal(title,body,foot=""){const e=$("#bqModalRoot");e.innerHTML='<div class="bq-modal-screen" data-modal-close><div class="bq-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="bq-dialog-head"><div><span>Banquillo · Dirección Deportiva</span><h2>'+esc(title)+'</h2></div><button type="button" class="bq-modal-close" data-modal-close aria-label="Cerrar">×</button></div><div class="bq-dialog-body">'+body+'</div>'+(foot?'<div class="bq-dialog-foot">'+foot+'</div>':'')+'</div></div>';const input=e.querySelector("input:not([type=hidden]),select");if(input)input.focus();}
function closeModal(){const e=$("#bqModalRoot");if(e)e.innerHTML="";state.modal=null;}
function ask(title,detail,action,id,label="Confirmar"){state.modal={action,id};modal(title,'<p>'+esc(detail)+'</p>','<button type="button" class="btn ghost" data-modal-close>Cancelar</button><button type="button" class="btn primary" data-accept-action="'+esc(action)+'" data-id="'+esc(id||"")+'">'+esc(label)+'</button>');}
function formModal(title,formId,fields,submit="Guardar"){state.modal={formId};modal(title,'<form class="bq-form" id="'+formId+'">'+fields+'<div class="bq-form-actions"><button type="button" class="btn ghost" data-modal-close>Cancelar</button><button class="btn primary" type="submit">'+esc(submit)+'</button></div></form>');}
const input=(name,label,defaultValue="",type="text",required=false,extra="")=>'<label class="field"><span>'+esc(label)+'</span><input name="'+name+'" type="'+type+'" value="'+esc(defaultValue)+'" '+(required?"required":"")+' '+extra+'></label>';
const sel=(name,label,values,value)=>'<label class="field"><span>'+esc(label)+'</span><select name="'+name+'">'+values.map(([key,cap])=>'<option value="'+esc(key)+'" '+(String(key)===String(value)?"selected":"")+'>'+esc(cap)+'</option>').join("")+'</select></label>';
function openClubForm(){const year=seasonDefault();formModal("Crear club", "clubForm",'<p class="muted">Empieza con el nombre y la temporada. Después podrás completar instalaciones, equipos, escudo y otros datos.</p>'+input("name","Nombre del club","","text",true,'minlength="2" maxlength="120"')+input("season","Temporada",year,"text",true,'pattern="20[0-9]{2}/20[0-9]{2}" placeholder="2026/2027"'),"Crear club");}
function openTeamForm(){if(!active())return;formModal("Añadir equipo","teamForm",'<p class="muted">La configuración se puede ampliar más adelante. No es necesario rellenar toda la plantilla ahora.</p>'+
 input("name","Nombre del equipo","","text",true,'minlength="2" maxlength="100" placeholder="Ej. Benjamín A"')+
 '<div class="bq-form-grid">'+sel("modality","Modalidad",[["F7","Fútbol 7"],["F11","Fútbol 11"]],"F7")+
 sel("category","Categoría",[["Prebenjamín","Prebenjamín"],["Benjamín","Benjamín"],["Alevín","Alevín"],["Infantil","Infantil"],["Cadete","Cadete"],["Juvenil","Juvenil"],["Sénior","Sénior"]],"Benjamín")+'</div>'+
 input("competition","Competición (opcional)","","text",false,'maxlength="100"')+
 input("coach","Entrenador principal (opcional)","","text",false,'maxlength="90"')+
 '<p class="bq-hint">Al crear el equipo podrás vincular su temporada y generar un código de acceso exclusivo para sus entrenadores.</p>',"Crear equipo");}
function openStaffForm(row){const t=team();if(!t)return;const taken=new Set(state.staff.filter(p=>p.id!==row?.id&&p.position!=="other").map(x=>x.position));const available=POS.filter(([key])=>key==="other"||!taken.has(key));formModal(row?"Editar cuerpo técnico":"Agregar integrante","staffForm",input("display_name","Nombre y apellidos",row?.display_name||"","text",true,'minlength="2" maxlength="90"')+
 sel("position","Cargo",available,row?.position||available[0]?.[0])+
 input("role_detail","Especifica el cargo (solo si eliges Otro)",row?.role_detail||"","text",false,'maxlength="70"')+
 '<input type="hidden" name="staff_id" value="'+esc(row?.id||"")+'"><p class="bq-hint">Esta asignación es organizativa. El permiso para consultar fichas y actas se concede mediante el código del equipo.</p>',row?"Guardar cambios":"Añadir integrante");}
function openSettingsForm(){const t=team();if(!t)return;formModal("Configuración · "+t.name,"teamSettingsForm",
 input("name","Nombre del equipo",t.name,"text",true,'minlength="2" maxlength="100"')+
 '<div class="bq-form-grid">'+sel("modality","Modalidad",[["F7","Fútbol 7"],["F11","Fútbol 11"]],t.modality)+
 sel("category","Categoría",[["Prebenjamín","Prebenjamín"],["Benjamín","Benjamín"],["Alevín","Alevín"],["Infantil","Infantil"],["Cadete","Cadete"],["Juvenil","Juvenil"],["Sénior","Sénior"]],t.category||"Alevín")+'</div>'+
 input("competition","Competición",t.competition||"","text",false,'maxlength="100"')+
 input("matchMinutes","Duración del partido (minutos)",t.settings?.matchMinutes||50,"number",true,'min="20" max="120"'),"Guardar configuración");}
function openDeleteClubForm(){
 const c=active();if(!owner()||!c)return;
 formModal("Eliminar club","deleteClubForm",
 '<div class="bq-danger-note"><strong>Esta acción retirará el club de tu cuenta.</strong><p>Se cerrará la temporada, se anularán los códigos de invitación y se revocarán los accesos de dirección deportiva. Los datos deportivos y las actas se conservan para poder recuperarlos.</p></div>'+
 input("confirm_name","Escribe exactamente «"+c.name+"» para confirmar","","text",true,'autocomplete="off" maxlength="120"')+
 '<input type="hidden" name="club_id" value="'+esc(c.id)+'"><p class="bq-hint">Esta opción solo está disponible para el propietario.</p>',"Eliminar club");
}
function openBackupForm(){
 if(!active())return;
 formModal("Restaurar copia de configuración","restoreConfigForm",
 '<p>Selecciona un archivo JSON exportado anteriormente desde <b>este mismo club</b>. Restauraremos los datos de configuración y los cargos del cuerpo técnico, no las actas ni las cuentas.</p>'+
 '<label class="field"><span>Archivo de copia de seguridad (.json)</span><input type="file" name="backup" accept=".json,application/json" required></label>'+
 input("confirm_name","Confirma el nombre del club",active().name,"text",true,'maxlength="120"')+
 '<p class="bq-danger-note">Esta operación reemplazará nombres, categorías, ajustes y cargos de los equipos incluidos en la copia. No creará ni eliminará equipos.</p>',"Restaurar configuración");
}
async function saveBackup(){
 const c=active();if(!c)throw Error("No hay club seleccionado.");
 const all=state.allTeams;
 const ids=all.map(x=>x.id);
 const staff=ids.length?await calls(state.sb.from("banquillo_team_staff").select("team_id,display_name,position,role_detail").in("team_id",ids)):[];
 const backup={format:"banquillo-club-configuration",version:1,
   club_id:c.id,club_name:c.name,exported_at:new Date().toISOString(),
   settings:{town:state.settings.town||"",province:state.settings.province||"",
   community:state.settings.community||"",fields_f11:state.settings.fields_f11||0,
   fields_f7:state.settings.fields_f7||0},
   teams:all.map(({id,name,modality,category,competition,settings})=>({id,name,modality,category,competition,settings})),
   staff:(staff||[]).map(({team_id,display_name,position,role_detail})=>({team_id,display_name,position,role_detail}))};
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="banquillo-"+c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").slice(0,35)+"-config-"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 notify("Copia de configuración guardada. No incluye actas ni cuentas.");
}
function deletedSection(){
 if(!state.deletedClubs.length)return "";
 return '<section class="panel bq-recovery"><h3>Clubes eliminados recuperables</h3><p class="muted">Los datos deportivos se conservan. Puedes recuperar un club si no tienes otro activo.</p>'+
 state.deletedClubs.map(c=>'<div class="bq-recovery-row"><span>'+esc(c.name)+'</span>'+button("Recuperar club","restoreClub",c.id,"ghost")+'</div>').join("")+'</section>';
}
function openClubSettings(){const v=state.settings;formModal("Ajustes del club","clubSettingsForm",
 '<p class="muted">Puedes actualizar esta información en cualquier momento, sin rehacer el club.</p>'+
 input("town","Localidad",v.town||"","text",false,'maxlength="80"')+input("province","Provincia",v.province||"","text",false,'maxlength="80"')+
 input("community","Comunidad autónoma",v.community||"","text",false,'maxlength="80"')+
 '<div class="bq-form-grid">'+input("fields_f11","Campos de F11",v.fields_f11||0,"number",true,'min="0" max="25"')+
 input("fields_f7","Campos independientes de F7",v.fields_f7||0,"number",true,'min="0" max="50"')+'</div>'+
 '<p class="bq-hint">Cada campo completo de F11 divisible puede habilitar dos mitades de F7 en el planificador.</p>',"Guardar datos del club");}
function dayBanner(){const list=state.docs.filter(x=>x.type==="match" && x.data && !x.data.rest).map(x=>({t:x.team,m:x.data}));const next=list.filter(x=>x.m.date>=new Date().toISOString().slice(0,10)&&!Calc.matchInfo(x.m).played).sort((a,b)=>String(a.m.date).localeCompare(String(b.m.date)))[0];return'<div class="bq-date-strip"><div><span>HOY</span><strong>'+esc(nowLabel())+'</strong></div><div><span>PRÓXIMA JORNADA</span><strong>'+(next?(next.m.home?"🏠 ":"✈️ ")+esc(next.t.name)+' · '+esc(next.m.rival||"Rival por definir"):'Pendiente de calendario')+'</strong>'+(next?'<small>Jornada '+esc(next.m.n||"—")+' · '+esc(showDate(next.m.date))+'</small>':'')+'</div></div>';}
function summary(){const c=active();if(!c)return emptyClub();const teams=state.teams;const f7=teams.filter(x=>x.modality==="F7").length;const f11=teams.length-f7;
return head("Resumen del club","Organización deportiva de "+c.name,button("+ Añadir equipo","newTeam"))+
 '<div class="stats"><article class="stat"><span class="stat-icon">⚽</span><div class="stat-label">Equipos activos</div><div class="stat-value">'+teams.length+'</div><div class="stat-foot">En la temporada</div></article><article class="stat"><span class="stat-icon">◫</span><div class="stat-label">Fútbol 7</div><div class="stat-value">'+f7+'</div><div class="stat-foot">Equipos F7</div></article><article class="stat"><span class="stat-icon">◧</span><div class="stat-label">Fútbol 11</div><div class="stat-value">'+f11+'</div><div class="stat-foot">Equipos F11</div></article><article class="stat"><span class="stat-icon">▤</span><div class="stat-label">Temporada</div><div class="stat-value bq-season-value">'+esc(currentPeriod()?.season_label||"Cerrada")+'</div><div class="stat-foot">'+(currentPeriod()?"En curso":"Histórica")+'</div></article></div>'+
 '<div class="two-col"><section class="panel"><div class="panel-head"><h3>Equipos del club</h3>'+button("Ver todos","viewTeams","","ghost")+'</div>'+teamRows()+'</section><section class="panel"><div class="panel-head"><h3>Plan de trabajo</h3></div><p class="muted">Personaliza el cuerpo técnico, vincula las temporadas de cada equipo y comparte su código de acceso. Puedes completar las instalaciones cuando lo necesites.</p><div class="bq-inline-actions">'+button("Temporadas","viewSeasons","","ghost")+button("Instalaciones","viewFacilities","","ghost")+'</div></section></div>';}
function emptyClub(){return head("Bienvenido a Banquillo","Empieza desde el club o incorpora un equipo a tu cuenta.")+'<div class="bq-choice-grid">'+
 '<article class="panel"><h3>Crear un club</h3><p>Configúralo progresivamente: equipos, campos, cuerpo técnico y temporadas.</p>'+button("Crear club","newClub")+'</article>'+
 '<article class="panel"><h3>Unirme a un club</h3><p>Usa el código que te facilite su director deportivo.</p>'+button("Introducir código","joinClub","","ghost")+'</article>'+
 '<article class="panel"><h3>Dirigir un equipo</h3><p>Crea una temporada individual en la aplicación del entrenador.</p><a class="btn ghost" href="index.html">Ir a mi equipo</a></article></div>'+deletedSection();}
function teamRows(){const list=state.teams.filter(t=>state.modality==="todos"||t.modality===state.modality);return list.map(t=>'<button type="button" class="bq-team-line" data-action="openTeam" data-id="'+esc(t.id)+'"><span>⚽</span><span><b>'+esc(t.name)+'</b><small>'+esc(t.category||"Categoría pendiente")+' · '+esc(t.modality)+' · '+esc(t.competition||"Competición por definir")+'</small></span><span>Configurar →</span></button>').join("")||'<p class="muted">Aún no hay equipos en esta modalidad.</p>';}
function teamsPage(){return head("Equipos del club","Selecciona un equipo para consultar sus estadísticas, entrenadores y configuración.",button("+ Añadir equipo","newTeam"))+
 '<div class="team-grid">'+state.teams.filter(t=>state.modality==="todos"||t.modality===state.modality).map(t=>
 '<article class="team-card"><div class="team-card-top"><span class="team-badge">⚽</span><div><h3>'+esc(t.name)+'</h3><p>'+esc(t.category||"Categoría pendiente")+' · '+esc(t.modality)+'</p></div></div><div class="team-meta"><span>'+esc(t.competition||"Pendiente")+'</span><b>'+esc(t.season_id?"Temporada vinculada":"Sin temporada")+'</b></div><button type="button" class="btn ghost team-config" data-action="openTeam" data-id="'+esc(t.id)+'">Configurar equipo →</button></article>').join("")+'</div>'+
 (state.allTeams.some(t=>t.archived_at)?'<details class="panel bq-archived"><summary>Equipos archivados ('+state.allTeams.filter(t=>t.archived_at).length+')</summary>'+state.allTeams.filter(t=>t.archived_at).map(t=>'<div class="bq-team-line"><span>'+esc(t.name)+'</span>'+button("Restaurar","restoreTeam",t.id,"ghost")+'</div>').join("")+'</details>':"");}
function staffTab(){const assigned=state.staff;return '<section class="ux-box"><div class="ux-box-title"><h3>Cuerpo técnico</h3><span>'+esc(team()?.name||"")+'</span></div>'+
 (assigned.length?assigned.map(s=>'<div class="ux-person"><span class="ux-person-avatar">'+esc(s.position==="head_coach"?"DT":s.position==="assistant_coach"?"2º":s.position==="third_coach"?"3º":s.position==="delegate"?"DG":"+")+'</span><div><strong>'+esc(s.display_name)+'</strong><small>'+esc(s.position==="other"?(s.role_detail||"Otro"):labelPos(s.position))+'</small></div><span class="ux-pill good">Asignado</span><div class="bq-person-actions">'+button("Editar","editStaff",s.id,"ghost")+button("Quitar","removeStaff",s.id,"ghost")+'</div></div>').join(""):'<div class="bq-empty-staff"><strong>Sin integrantes asignados</strong><p class="muted">Añade el entrenador principal o el primer miembro del cuerpo técnico.</p></div>')+
 '<div class="ux-actions">'+button("＋ Agregar entrenador o delegado","addStaff")+'</div><p class="ux-caution">El cargo es organizativo. Las cuentas reciben acceso a los datos del equipo únicamente cuando se unen con su código personal de equipo.</p></section>';}
const docsOf=id=>state.docs.filter(x=>x.team?.id===id);
function statsFor(t){const items=docsOf(t.id);const matches=items.filter(x=>x.type==="match").map(x=>x.data);const players=items.filter(x=>x.type==="player").map(x=>({id:x.id,...x.data})).filter(p=>p.active!==false);return {matches,players,r:Calc.record(matches),tops:players.map(p=>({p,st:Calc.playerStats(p.id,matches)}))};}
function ranking(data,key,title,suffix=""){const ordered=[...data].sort((a,b)=>b.st[key]-a.st[key]).slice(0,5);const max=Math.max(1,...ordered.map(p=>p.st[key]));return '<section class="ux-box"><div class="ux-box-title"><h3>'+esc(title)+'</h3></div><div class="ux-rank">'+(ordered.map((p,i)=>'<div class="ux-rank-line"><span class="ux-rank-index">'+(i+1)+'</span><span class="ux-rank-name">'+esc(p.p.name)+'</span><span class="ux-rank-track"><i style="width:'+Math.round(100*p.st[key]/max)+'%"></i></span><b>'+p.st[key]+esc(suffix)+'</b></div>').join("")||'<p class="muted">Sin estadísticas todavía.</p>')+'</div></section>';}
function overview(t){const {r,tops,matches}=statsFor(t);const n=matches.filter(m=>m.date>=new Date().toISOString().slice(0,10)&&!m.rest&&!Calc.matchInfo(m).played).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
return '<section class="ux-sport-strip">'+[["Partidos",r.pj],["Victorias",r.v],["Empates",r.e],["Derrotas",r.d],["Goles a favor",r.gf],["Goles en contra",r.gc],["Diferencia",(r.dg>0?"+":"")+r.dg]].map(([k,v])=>'<div class="ux-metric"><span>'+k+'</span><b>'+v+'</b></div>').join("")+'</section>'+
 '<div class="ux-two-col">'+ranking(tops,"goals","Máximos goleadores"," goles")+ranking(tops,"min","Jugadores con más minutos"," min")+'</div><div class="ux-two-col">'+ranking(tops,"conv","Más convocatorias")+
 '<section class="ux-box"><div class="ux-box-title"><h3>Próxima jornada</h3></div>'+(n?'<div class="bq-next-match"><strong>'+(n.home?"🏠":"✈️")+' '+esc(n.rival||"Rival por definir")+'</strong><span>Jornada '+esc(n.n||"–")+' · '+esc(showDate(n.date))+'</span></div>':'<p class="muted">No hay próxima jornada confirmada.</p>')+'</section></div>';
}
function playersTab(t){const {tops}=statsFor(t);return '<section class="ux-box"><div class="ux-box-title"><h3>Estadísticas individuales</h3><span>Datos de actas reales</span></div><div class="ux-table-wrap"><table class="ux-data-table"><thead><tr><th>Jugador</th><th>Goles</th><th>Minutos</th><th>Convocatorias</th><th>Partidos</th></tr></thead><tbody>'+tops.map(x=>'<tr><td>'+esc(x.p.name)+'</td><td>'+x.st.goals+'</td><td>'+x.st.min+'</td><td>'+x.st.conv+'</td><td>'+x.st.played+'</td></tr>').join("")+'</tbody></table></div></section>';}
function settingsTab(t){return '<section class="ux-box"><div class="ux-box-title"><h3>Configuración de '+esc(t.name)+'</h3></div><div class="bq-detail-grid"><div><span>Modalidad</span><b>'+esc(t.modality)+'</b></div><div><span>Categoría</span><b>'+esc(t.category||"Pendiente")+'</b></div><div><span>Competición</span><b>'+esc(t.competition||"Pendiente")+'</b></div><div><span>Temporada vinculada</span><b>'+esc(t.season_id||"Sin asignar")+'</b></div></div><div class="ux-actions">'+button("Editar equipo","editTeam")+
 button("Archivar equipo","archiveTeam",t.id,"ghost")+'</div><p class="muted">Archivar conserva plantilla, actas, estadísticas e historial. Podrás restaurar el equipo después.</p></section>';}
function codeTab(t){const hasSeason=!!t.season_id;const choices=state.members.filter(m=>m.role==="owner"&&!state.allTeams.some(a=>a.season_id===m.season_id&&a.id!==t.id));return '<section class="ux-box"><div class="ux-box-title"><h3>Código individual de equipo</h3><span>'+esc(t.name)+'</span></div>'+
 (hasSeason?'<p>Comparte este código solamente con las personas autorizadas para trabajar en <b>'+esc(t.name)+'</b>. Cada equipo tiene uno distinto.</p><div class="ux-team-code"><span>CÓDIGO DEL EQUIPO</span><strong>'+esc(state.teamCode||"Cargando…")+'</strong></div><div class="ux-actions">'+button("Copiar código","copyTeamCode")+button("Renovar código","rotateTeamCode","","ghost")+'</div><p class="ux-caution">Renovar el código impide nuevas incorporaciones con el anterior. Los usuarios que ya estaban autorizados conservan su acceso hasta que se revoque en Compartir temporada.</p>':
 '<p>Antes de generar el código debes vincular a este equipo una temporada de la que seas propietario.</p>'+ (choices.length?'<form id="linkTeamForm" class="bq-inline-form"><label>Temporada disponible <select name="season_id">'+choices.map(x=>'<option value="'+esc(x.season_id)+'">'+esc(x.season_id)+'</option>').join("")+'</select></label><button class="btn primary" type="submit">Vincular temporada</button></form>':'<p class="muted">No hay temporadas propias disponibles. Créala primero en la aplicación de entrenador.</p><a class="btn ghost" href="index.html#temporadas">Crear una temporada</a>'))+'</section>';}
function teamPage(){const t=team();if(!t)return teamsPage();return head(t.name,(t.category||"Categoría por definir")+' · '+t.modality+' · '+(t.competition||"Competición por definir"),button("← Volver a equipos","viewTeams","","ghost"))+
 '<div class="ux-tabs" role="navigation">'+[["overview","Resumen deportivo"],["players","Estadísticas"],["coaches","Entrenadores"],["settings","Configuración"],["code","Código del equipo"]].map(([k,v])=>'<button type="button" data-tab="'+k+'" class="'+(state.teamTab===k?"on":"")+'">'+v+'</button>').join("")+'</div>'+
 (!t.season_id&&["overview","players"].includes(state.teamTab)?'<div class="bq-note">Todavía no has vinculado una temporada deportiva. Puedes hacerlo en «Código del equipo».</div>':'')+
 (state.teamTab==="overview"?overview(t):state.teamTab==="players"?playersTab(t):state.teamTab==="coaches"?staffTab():state.teamTab==="settings"?settingsTab(t):codeTab(t));}
function directorsPage(){const c=active();if(!c)return emptyClub();return head("Directores deportivos","Los directores del club pueden coordinar los equipos. El propietario gestiona las invitaciones.")+
 '<section class="panel"><div class="director-grid">'+
 '<article class="director-card"><span class="avatar">DP</span><h3>Propietario del club</h3><p>Acceso principal de administración</p><div class="permission">✓ Control del club</div></article>'+
 state.clubDirectors.map(d=>'<article class="director-card"><span class="avatar">DD</span><h3>'+esc(d.display_name||"Director deportivo")+'</h3><p>Director deportivo</p><div class="permission">✓ Permisos de dirección</div>'+(owner()?'<div class="bq-cta-row">'+button("Revocar acceso","removeDirector",d.user_id,"ghost")+'</div>':"")+'</article>').join("")+'</div>'+
 (owner()?'<div class="bq-invite"><h3>Código para nuevo director</h3><p class="muted">No es el mismo código que utilizan los entrenadores de los equipos.</p><div class="ux-team-code"><strong>'+esc(state.clubCode||"Cargando…")+'</strong></div><div class="ux-actions">'+button("Copiar código","copyClubCode")+button("Renovar código","rotateClubCode","","ghost")+'</div></div>':"")+'</section>';}
function seasonsPage(){return head("Temporadas","Solo puede haber un club activo por titular en una temporada. El historial permanece disponible.",owner()&&currentPeriod()?button("Cerrar temporada","closeClubSeason","","ghost"):button("Crear club","newClub"))+
 '<div class="bq-seasons-grid">'+state.periods.map(p=>'<article class="panel bq-season-card"><span class="ux-pill '+(p.status==="active"?"good":"")+'">'+(p.status==="active"?"En curso":"Cerrada")+'</span><h3>'+esc(p.season_label)+'</h3><p>'+esc(active()?.name||"Club")+'</p><p class="muted">'+(p.status==="active"?"Activa desde su creación":"Cerrada · "+showDate(p.closed_at?.slice(0,10)))+'</p></article>').join("")+'</div>'+
 '<section class="panel"><h3>Inicio de nueva temporada</h3><p>Para crear un club diferente, cierra primero la temporada activa. Una vez cerrada podrás abrir la siguiente temporada sin borrar los datos anteriores.</p></section>'+deletedSection();}
function facilitiesPage(){const v=state.settings;return head("Instalaciones","Configura el número de campos que dispone el club.",button("Editar instalaciones","editClub"))+
 '<div class="stats"><article class="stat"><div class="stat-label">Campos completos F11</div><div class="stat-value">'+(v.fields_f11||0)+'</div></article><article class="stat"><div class="stat-label">Campos independientes F7</div><div class="stat-value">'+(v.fields_f7||0)+'</div></article><article class="stat"><div class="stat-label">Capacidad F7 si F11 divisible</div><div class="stat-value">'+((v.fields_f11||0)*2+(v.fields_f7||0))+'</div></article></div>'+
 '<section class="panel"><h3>Organización de partidos</h3><p class="muted">La planificación detallada de campos, horarios y conflictos sigue disponible en la demostración de club mientras se prepara su integración segura con calendarios reales.</p><a href="demo-club.html#instalaciones" class="btn ghost">Ver planificador demostrativo</a></section>';}
function fixtures(){return state.docs.filter(x=>x.type==="match"&&!x.data?.rest).map(x=>({t:x.team,m:x.data})).sort((a,b)=>String(a.m.date||"9999").localeCompare(String(b.m.date||"9999")));}
function calendarPage(monthly=false){const list=fixtures().filter(x=>!monthly||String(x.m.date||"").startsWith(state.year+"-"+String(state.month+1).padStart(2,"0")));return head(monthly?"Planificador mensual":"Calendario del club","Jornadas visibles según los permisos de las temporadas vinculadas.",monthly?button("Mes anterior","prevMonth","","ghost")+button("Mes siguiente","nextMonth","","ghost"):"")+
 (monthly?'<h3 class="bq-month-title">'+new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(new Date(state.year,state.month,1))+'</h3>':"")+
 '<section class="panel"><div class="bq-fixtures">'+(list.map(x=>'<div class="bq-fixture"><span>'+esc(showDate(x.m.date))+'</span><span><b>'+esc(x.t.name)+'</b><small>Jornada '+esc(x.m.n||"—")+' · '+(x.m.home?"🏠 Local":"✈️ Visitante")+'</small></span><b>'+esc(x.m.rival||"Rival por definir")+'</b></div>').join("")||'<p class="muted">No hay encuentros registrados en las temporadas a las que tienes acceso.</p>')+'</div></section><p class="bq-hint">Este calendario utiliza las jornadas reales de cada temporada. La asignación de instalaciones aún se realiza en el planificador demostrativo.</p>';}
function communicationsPage(){return head("Comunicaciones","Prepara un mensaje de las jornadas programadas y cópialo para compartirlo.")+'<section class="panel"><h3>Próximos partidos</h3><pre id="bqMessagePreview" class="message-preview">'+esc(messageText())+'</pre>'+button("Copiar resumen","copyFixtures")+'</section>';}
function messageText(){const today=new Date().toISOString().slice(0,10);const list=fixtures().filter(x=>x.m.date>=today).slice(0,20);return "⚽ PARTIDOS DEL CLUB · "+(active()?.name||"")+" \n"+(list.length?list.map(x=>(x.m.home?"🏠":"✈️")+" "+x.t.name+" · Jornada "+(x.m.n||"–")+"\n   "+showDate(x.m.date)+" · "+(x.m.rival||"Rival por definir")).join("\n\n"):"No hay próximos partidos confirmados.");}
function noticesPage(){const now=Date.now();const list=fixtures().filter(x=>x.m.date&&!Calc.matchInfo(x.m).played&&new Date(x.m.date+"T23:59:59").getTime()+48*3600000<now);
return head("Avisos de actividad","Partidos pendientes de cerrar detectados a partir de las actas disponibles.")+
 '<section class="panel">'+(list.map(x=>'<div class="notice">⚑ <b>'+esc(x.t.name)+'</b> · jornada '+esc(x.m.n||"–")+' contra '+esc(x.m.rival||"Rival")+' · '+esc(showDate(x.m.date))+'</div>').join("")||'<p class="muted">No hay incidencias pendientes en los partidos disponibles.</p>')+'</section>';}
function clubSettingsPage(){return head("Ajustes del club","Completa los datos opcionales cuando los necesites.",button("Editar datos","editClub"))+'<section class="panel"><div class="bq-detail-grid">'+[["Club",active()?.name],["Localidad",state.settings.town],["Provincia",state.settings.province],["Comunidad autónoma",state.settings.community],["Temporada",currentPeriod()?.season_label]].map(([k,v])=>'<div><span>'+k+'</span><b>'+esc(v||"Pendiente")+'</b></div>').join("")+'</div><div class="ux-actions">'+button("Guardar copia de configuración","saveBackup","","ghost")+button("Restaurar copia","restoreBackup","","ghost")+'</div></section>'+(owner()?'<section class="panel bq-danger-zone"><h3>Eliminar club</h3><p>Retira el club y revoca los accesos de dirección. Las temporadas y actas se mantienen para su recuperación.</p>'+button("Eliminar club","deleteClub","","ghost")+'</section>':'')+deletedSection();}
const titles={resumen:"Resumen del club",equipos:"Equipos del club",equipo:"Configurar equipo",directores:"Directores deportivos",temporadas:"Temporadas",instalaciones:"Instalaciones",calendario:"Calendario del club",calendarioMes:"Planificador mensual",comunicaciones:"Comunicaciones",avisos:"Avisos de actividad",ajustes:"Ajustes del club"};
function render(){if(!state.loaded)return;const c=active(),t=team();$("#sideClubName").textContent=c?.name||"Tu club";$("#topClubName").textContent=c?.name||"BANQUILLO";
 $("#sideSeason").textContent=currentPeriod()?.season_label||"Sin temporada activa";$("#teamCount").textContent=state.teams.length;
 $("#pageTitle").textContent=state.view==="equipo"&&t?t.name:(titles[state.view]||"Banquillo");
 $("#topSituation").innerHTML=dayBanner();
 const ctx=$("#teamContextBar");ctx.hidden=state.view!=="equipo"||!t;ctx.innerHTML=t?'<div class="ux-team-header"><div class="ux-team-symbol">⚽</div><div><strong>'+esc(t.name)+'</strong><span>'+esc(t.category||"Categoría por definir")+' · '+esc(t.modality)+' · '+esc(t.competition||"Competición pendiente")+'</span></div><div class="ux-team-coaches"><span>ENTRENADOR PRINCIPAL</span><b>'+esc(state.staff.find(x=>x.position==="head_coach")?.display_name||"Sin asignar")+'</b></div></div>':"";
 $("#modalityBar").hidden=["equipo","directores","temporadas","instalaciones","ajustes"].includes(state.view)||!c;
 document.querySelectorAll("[data-modality]").forEach(b=>b.classList.toggle("selected",b.dataset.modality===state.modality));
 $("#modalityNote").textContent=state.modality==="todos"?"Todo el club":state.modality==="F7"?"Equipos Fútbol 7":"Equipos Fútbol 11";
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
 let body=state.view==="resumen"?summary():state.view==="equipos"?teamsPage():state.view==="equipo"?teamPage():state.view==="directores"?directorsPage():state.view==="temporadas"?seasonsPage():state.view==="instalaciones"?facilitiesPage():state.view==="calendario"?calendarPage():state.view==="calendarioMes"?calendarPage(true):state.view==="comunicaciones"?communicationsPage():state.view==="avisos"?noticesPage():clubSettingsPage();
 rview().innerHTML=body;
}
async function refresh(){state.clubs=await calls(state.sb.from("banquillo_clubs").select("id,name,owner_id,created_at").order("created_at",{ascending:true}))||[];
 if(!state.clubs.some(x=>x.id===state.clubId))state.clubId=state.clubs[0]?.id||null;
 state.deletedClubs=await rpc("banquillo_list_deleted_clubs")||[];
 if(state.clubId){
  const [ts,periods,settings,members]=await Promise.all([
   calls(state.sb.from("banquillo_teams").select("id,club_id,name,modality,category,competition,settings,season_id,archived_at").eq("club_id",state.clubId).order("name")),
   calls(state.sb.from("banquillo_club_seasons").select("id,club_id,season_label,status,closed_at").eq("club_id",state.clubId)),
   calls(state.sb.from("banquillo_club_settings").select("*").eq("club_id",state.clubId).maybeSingle()),
   calls(state.sb.from("season_members").select("season_id,role").eq("user_id",state.uid))
  ]);
  state.allTeams=ts||[];state.teams=state.allTeams.filter(x=>!x.archived_at);state.periods=periods||[];state.settings=settings||{};state.members=members||[];
 }else{state.teams=[];state.allTeams=[];state.periods=[];state.settings={};state.members=[];}
 if(!state.teams.some(t=>t.id===state.teamId))state.teamId=state.teams[0]?.id||null;
 state.loaded=true;render();
 if(state.view==="directores")await loadDirectors();
 if(state.view==="equipo")await loadTeamData();
 if(["calendario","calendarioMes","avisos","comunicaciones"].includes(state.view))await loadAllData();
}
async function loadTeamData(){const t=team();if(!t)return;const tid=t.id;try{
 const results=await Promise.all([calls(state.sb.from("banquillo_team_staff").select("id,display_name,position,role_detail").eq("team_id",tid)),
 t.season_id&&state.members.some(x=>x.season_id===t.season_id)?calls(state.sb.from("docs").select("path,data").eq("season_id",t.season_id)):Promise.resolve([])]);
 if(state.teamId!==tid)return;
 state.staff=results[0]||[];state.docs=state.docs.filter(x=>x.team?.id!==tid);
 state.docs.push(...(results[1]||[]).map(x=>{const p=x.path.split("/");return {team:t,type:p[2],id:p[3],data:x.data}}).filter(x=>["matches","players"].includes(x.type)).map(x=>({...x,type:x.type==="matches"?"match":"player"})));
 if(state.teamTab==="code"&&t.season_id)await loadTeamCode();
 render();
}catch(e){notify(errText(e),"error");}}
async function loadAllData(){const teams=state.teams.filter(t=>t.season_id&&state.members.some(m=>m.season_id===t.season_id));let all=[];
 for(const t of teams){try{const rows=await calls(state.sb.from("docs").select("path,data").eq("season_id",t.season_id));all.push(...(rows||[]).map(x=>{const p=x.path.split("/");return{team:t,type:p[2]==="matches"?"match":p[2]==="players"?"player":"other",id:p[3],data:x.data}}).filter(x=>x.type!=="other"));}catch(e){/* no access */}}
 state.docs=all;render();}
async function loadDirectors(){if(!active())return;try{state.clubDirectors=await rpc("banquillo_list_directors",{p_club_id:state.clubId})||[];
 state.clubCode=owner()?await rpc("banquillo_club_code",{p_club_id:state.clubId,p_rotate:false}):null;render();}catch(e){notify(errText(e),"error");}}
async function loadTeamCode(){const t=team();if(!t?.season_id)return;try{state.teamCode=await rpc("banquillo_team_code",{p_team_id:t.id,p_rotate:false});if(state.teamTab==="code")render();}catch(e){notify(errText(e),"error");}}
async function changeView(v){state.view=v;state.teamCode=null;render();
 if(v==="directores")await loadDirectors();
 if(v==="equipo")await loadTeamData();
 if(["calendario","calendarioMes","comunicaciones","avisos"].includes(v))await loadAllData();
}
async function action(name,id){try{
 if(name==="newClub")return openClubForm();
 if(name==="deleteClub")return openDeleteClubForm();
 if(name==="restoreBackup")return openBackupForm();
 if(name==="saveBackup")return saveBackup();
 if(name==="shareDirector")return modal("Invitar al segundo director",'<p>Entrega este código únicamente al director autorizado. Debe iniciar sesión en Banquillo y elegir «Unirme a un club».</p><div class="ux-team-code"><strong>'+esc(state.clubCode||"Código no disponible")+'</strong></div><p class="bq-hint">El director tendrá acceso a los equipos del club, pero las actas se comparten por temporada de forma independiente.</p><div class="ux-actions">'+button("Copiar código","copyClubCode")+'</div>');
 if(name==="restoreClub")return ask("Recuperar club","Se recuperará la temporada original si no tienes otro club activo. Los códigos anteriores seguirán invalidados.","acceptRestoreClub",id,"Recuperar club");
 if(name==="newTeam")return openTeamForm();
 if(name==="addStaff")return openStaffForm();
 if(name==="editStaff")return openStaffForm(state.staff.find(x=>x.id===id));
 if(name==="editTeam")return openSettingsForm();
 if(name==="editClub")return openClubSettings();
 if(name==="viewTeams")return changeView("equipos");
 if(name==="viewSeasons")return changeView("temporadas");
 if(name==="viewFacilities")return changeView("instalaciones");
 if(name==="openTeam"){state.teamId=id;state.teamTab="overview";return changeView("equipo");}
 if(name==="joinClub")return formModal("Unirme a un club","joinClubForm",input("code","Código de invitación al club","","text",true,'maxlength="32" minlength="32"'),"Unirme");
 if(name==="copyTeamCode"||name==="copyClubCode"||name==="copyFixtures"){const txt=name==="copyTeamCode"?state.teamCode:name==="copyClubCode"?state.clubCode:messageText();if(!txt)return notify("No hay contenido para copiar.","error");try{await navigator.clipboard.writeText(txt);notify("Copiado al portapapeles.");}catch(e){modal("Copiar texto",'<textarea class="bq-copy-area" readonly>'+esc(txt)+'</textarea>');}return;}
 if(name==="archiveTeam")return ask("Archivar equipo","El equipo desaparecerá de los activos. Su temporada, actas e historial se conservarán.","acceptArchive",id,"Archivar equipo");
 if(name==="restoreTeam")return ask("Restaurar equipo","El equipo volverá a la lista de activos si no se supera el límite de 12.","acceptRestore",id,"Restaurar equipo");
 if(name==="removeStaff")return ask("Quitar integrante","Se retirará el cargo organizativo. Sus permisos de cuenta no cambiarán.","acceptRemoveStaff",id,"Quitar del cargo");
 if(name==="removeDirector")return ask("Revocar director","Esta persona dejará de gestionar el club, pero sus permisos independientes en temporadas no se alteran.","acceptRemoveDirector",id,"Revocar");
 if(name==="rotateTeamCode")return ask("Renovar código","El anterior ya no permitirá nuevas incorporaciones. Los miembros existentes mantienen su acceso.","acceptRotateTeam",team()?.id,"Renovar código");
 if(name==="rotateClubCode")return ask("Renovar código de club","Los códigos anteriores dejarán de admitir nuevos directores.","acceptRotateClub",state.clubId,"Renovar código");
 if(name==="closeClubSeason")return ask("Cerrar temporada","Se archivará la temporada del club y podrás crear uno nuevo en la siguiente. Los datos no se borrarán.","acceptCloseClub",state.clubId,"Cerrar temporada");
 if(name==="prevMonth"||name==="nextMonth"){const d=new Date(state.year,state.month+(name==="prevMonth"?-1:1),1);state.month=d.getMonth();state.year=d.getFullYear();return render();}
 }catch(e){notify(errText(e),"error");}}
async function accept(name,id){closeModal();try{
 if(name==="acceptArchive"||name==="acceptRestore"){const {data,error}=await state.sb.from("banquillo_teams").update({archived_at:name==="acceptArchive"?new Date().toISOString():null}).eq("id",id).eq("club_id",state.clubId).select("id");if(error)throw error;if(!data?.length)throw Error("Operación denegada");await refresh();state.view="equipos";render();}
 if(name==="acceptRemoveStaff"){const {data,error}=await state.sb.from("banquillo_team_staff").delete().eq("id",id).eq("team_id",state.teamId).select("id");if(error)throw error;if(!data?.length)throw Error("No se ha encontrado el cargo.");await loadTeamData();}
 if(name==="acceptRemoveDirector"){await rpc("banquillo_remove_director",{p_club_id:state.clubId,p_user_id:id});await loadDirectors();}
 if(name==="acceptRotateTeam"){state.teamCode=await rpc("banquillo_team_code",{p_team_id:id,p_rotate:true});render();}
 if(name==="acceptRotateClub"){state.clubCode=await rpc("banquillo_club_code",{p_club_id:id,p_rotate:true});render();}
 if(name==="acceptCloseClub"){await rpc("banquillo_close_club_season",{p_club_id:id});await refresh();state.view="temporadas";render();}
 if(name==="acceptRestoreClub"){await rpc("banquillo_restore_club",{p_club_id:id});state.clubId=id;state.view="resumen";await refresh();state.clubCode=null;render();}
 notify("Cambios guardados correctamente.");
 }catch(e){notify(errText(e),"error");}}
async function submit(form){const f=new FormData(form),get=k=>String(f.get(k)||"").trim();try{
 if(form.id==="deleteClubForm"){
  const c=active(),name=get("confirm_name");if(!owner()||!c||get("club_id")!==c.id||name!==c.name)throw Error("club_name_mismatch");
  const response=await rpc("banquillo_delete_club",{p_club_id:c.id,p_confirm_name:name});if(response!==true)throw Error("No se ha podido eliminar el club.");
  closeModal();state.clubId=null;state.clubCode=null;state.teamCode=null;state.view="resumen";await refresh();notify("Club retirado. Sus actas se conservan y puedes recuperarlo desde esta pantalla.");return;
 }
 if(form.id==="restoreConfigForm"){
  const c=active();if(!c||get("confirm_name")!==c.name)throw Error("club_name_mismatch");
  const file=f.get("backup");if(!(file instanceof File)||!file.size||file.size>180000)throw Error("Selecciona un archivo JSON de menos de 180 KB.");
  let payload;try{payload=JSON.parse(await file.text());}catch(e){throw Error("El archivo no es un JSON válido.");}
  if(payload.format!=="banquillo-club-configuration"||payload.version!==1||payload.club_id!==c.id||!Array.isArray(payload.teams)||!Array.isArray(payload.staff))throw Error("invalid_backup");
  const res=await rpc("banquillo_restore_club_config",{p_club_id:c.id,p_snapshot:payload});if(!res?.ok)throw Error("No se pudo restaurar la configuración.");
  closeModal();state.staff=[];state.docs=[];await refresh();notify("Restaurada la configuración de "+res.teams+" equipos y "+res.staff+" cargos. Las actas no se han modificado.");return;
 }
 if(form.id==="clubForm"){const id=await rpc("banquillo_create_club",{p_name:get("name"),p_season:get("season")});state.clubId=id;state.view="resumen";closeModal();await refresh();notify("Club creado. Puedes completar su configuración cuando quieras.");return;}
 if(form.id==="teamForm"){const rec={club_id:state.clubId,name:get("name"),modality:get("modality"),category:get("category"),competition:get("competition"),settings:{matchMinutes:get("modality")==="F11"?90:50}};const x=await calls(state.sb.from("banquillo_teams").insert(rec).select("id").single());if(get("coach"))await calls(state.sb.from("banquillo_team_staff").insert({team_id:x.id,display_name:get("coach"),position:"head_coach"}));state.teamId=x.id;state.teamTab="overview";state.view="equipo";closeModal();await refresh();notify("Equipo creado. La configuración se puede ampliar más adelante.");return;}
 if(form.id==="staffForm"){const rec={display_name:get("display_name"),position:get("position"),role_detail:get("position")==="other"?get("role_detail"):""};if(get("staff_id"))await calls(state.sb.from("banquillo_team_staff").update(rec).eq("id",get("staff_id")).eq("team_id",state.teamId).select("id"));else await calls(state.sb.from("banquillo_team_staff").insert({...rec,team_id:state.teamId}).select("id"));closeModal();await loadTeamData();notify("Cuerpo técnico actualizado.");return;}
 if(form.id==="teamSettingsForm"){const rec={name:get("name"),modality:get("modality"),category:get("category"),competition:get("competition"),settings:{...team()?.settings,matchMinutes:Number(get("matchMinutes"))}};const {error}=await state.sb.from("banquillo_teams").update(rec).eq("id",state.teamId);if(error)throw error;closeModal();await refresh();notify("Configuración del equipo guardada.");return;}
 if(form.id==="clubSettingsForm"){const rec={club_id:state.clubId,town:get("town"),province:get("province"),community:get("community"),fields_f11:Number(get("fields_f11")),fields_f7:Number(get("fields_f7"))};const {error}=await state.sb.from("banquillo_club_settings").upsert(rec,{onConflict:"club_id"});if(error)throw error;closeModal();await refresh();notify("Datos del club guardados.");return;}
 if(form.id==="joinClubForm"){const r=await rpc("banquillo_join_club",{p_code:get("code").toLowerCase()});if(!r?.ok)throw Error("Código no válido o límite de directores alcanzado.");state.clubId=r.club_id;closeModal();await refresh();notify("Te has unido al club.");return;}
 if(form.id==="linkTeamForm"){const sid=get("season_id");if(!state.members.some(m=>m.season_id===sid&&m.role==="owner"))throw Error("No eres propietario de esa temporada.");const {data,error}=await state.sb.from("banquillo_teams").update({season_id:sid}).eq("id",state.teamId).select("id");if(error)throw error;if(!data?.length)throw Error("No se ha vinculado la temporada.");await refresh();state.teamTab="code";await loadTeamData();notify("Temporada vinculada. Ya puedes compartir el código.");return;}
 }catch(e){notify(errText(e),"error");const b=form.querySelector('button[type="submit"]');if(b)b.disabled=false;}}
document.addEventListener("click",e=>{
 const close=e.target.closest("[data-modal-close]");if(close&&(e.target===close||e.target.matches("button[data-modal-close]"))){closeModal();return;}
 const acceptBtn=e.target.closest("[data-accept-action]");if(acceptBtn){accept(acceptBtn.dataset.acceptAction,acceptBtn.dataset.id);return;}
 const nav=e.target.closest("[data-view]");if(nav){changeView(nav.dataset.view);return;}
 const mod=e.target.closest("[data-modality]");if(mod){state.modality=mod.dataset.modality;render();return;}
 const tab=e.target.closest("[data-tab]");if(tab){state.teamTab=tab.dataset.tab;state.teamCode=null;render();if(state.teamTab==="code")loadTeamCode();return;}
 const act=e.target.closest("[data-action]");if(act){action(act.dataset.action,act.dataset.id||"");return;}
});
document.addEventListener("submit",e=>{if(!e.target.closest("form"))return;e.preventDefault();const f=e.target;const submitBtn=f.querySelector('button[type="submit"]');if(submitBtn)submitBtn.disabled=true;submit(f).finally(()=>{if(submitBtn?.isConnected)submitBtn.disabled=false;});});
async function start(){try{const cfg=window.BQ_CONFIG||{};if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase)throw Error("Falta configurar Supabase.");
 state.sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const {data:{user},error}=await state.sb.auth.getUser();if(error||!user){notify("Inicia sesión desde Banquillo antes de entrar al club.","error");rview().innerHTML='<div class="panel"><h2>Accede a tu cuenta</h2><a href="index.html" class="btn primary">Entrar o registrarme</a></div>';return;}
 state.uid=user.id;await refresh();notify("Conectado a Supabase.");
}catch(e){notify(errText(e),"error");}}
start();
})();
