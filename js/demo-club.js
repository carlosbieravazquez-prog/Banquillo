/* Prototipo local aislado. Datos ficticios; no conecta con Auth ni Supabase. */
(() => {
 const KEY="banquillo_demo_atletico_monteverde_v1";
 const seed={
  club:{name:"Atlético Monteverde CF",town:"Dos Hermanas",province:"Sevilla",community:"Andalucía",season:"2026/2027"},
  uniforms:{first:{shirt:"#17365D",shorts:"#17365D",socks:"#FFFFFF"},second:{shirt:"#FFFFFF",shorts:"#17365D",socks:"#17365D"}},
  notifications:[{id:"n1",team:"Cadete B",coach:"Elena",title:"Partido sin cerrar",detail:"El encuentro contra el Cádiz ya tiene fecha pasada, pero falta confirmar el resultado y completar el acta.",date:"14/11/2026",status:"Pendiente"},{id:"n2",team:"Alevín A",coach:"Pablo",title:"Convocatoria sin confirmar",detail:"La convocatoria de la próxima jornada todavía no se ha confirmado.",date:"13/11/2026",status:"Aviso"}],
  directors:[{id:"d1",name:"Daniel Romero",initials:"DR",preferred:"F7"},{id:"d2",name:"Marta León",initials:"ML",preferred:"F11"}],
  activeDirector:"d1",modality:"F7",facilities:{f11:2,f7:1,divisible:[true,true]},
  teams:[
   ["Prebenjamín A","Prebenjamín","F7","3.ª Andaluza","10","Sergio"],["Benjamín A","Benjamín","F7","3.ª Andaluza","12","Álvaro"],["Benjamín B","Benjamín","F7","4.ª Andaluza","11","Nerea"],
   ["Alevín A","Alevín","F7","2.ª Andaluza","14","Pablo"],["Alevín B","Alevín","F7","3.ª Andaluza","13","Lucía"],["Alevín C","Alevín","F7","4.ª Andaluza","12","Marcos"],["Alevín D","Alevín","F7","4.ª Andaluza","12","Irene"],
   ["Infantil A","Infantil","F11","2.ª Andaluza","17","Javier"],["Infantil B","Infantil","F11","3.ª Andaluza","16","Carmen"],
   ["Cadete A","Cadete","F11","1.ª Andaluza","18","David"],["Cadete B","Cadete","F11","3.ª Andaluza","17","Elena"],["Cadete C","Cadete","F11","4.ª Andaluza","16","Raúl"],
   ["Juvenil A","Juvenil","F11","Liga Nacional","20","Andrés"],["Juvenil B","Juvenil","F11","3.ª Andaluza","19","Sonia"],["Juvenil C","Juvenil","F11","4.ª Andaluza","18","Mario"]
  ].map((t,i)=>({id:"t"+(i+1),name:t[0],category:t[1],modality:t[2],competition:t[3],players:+t[4],coach:t[5]})),
  schedule:[
   {id:"m1",teamId:"t1",opponent:"CD Estrella",date:"2026-11-14",time:"10:00",duration:70,home:true,modality:"F7",resource:"f11-1-a",status:"published"},
   {id:"m2",teamId:"t2",opponent:"UD Bellavista",date:"2026-11-14",time:"11:30",duration:70,home:true,modality:"F7",resource:"f11-1-b",status:"proposed"},
   {id:"m3",teamId:"t8",opponent:"Atlético Sur",date:"2026-11-14",time:"12:00",duration:90,home:true,modality:"F11",resource:"f11-2",status:"published"},
   {id:"m4",teamId:"t4",opponent:"AD Nervión",date:"2026-11-15",time:"09:30",duration:70,home:false,modality:"F7",resource:"",status:"published"},
   {id:"m5",teamId:"t9",opponent:"CD Parque",date:"2026-11-15",time:"",duration:90,home:true,modality:"F11",resource:"",status:"pending"},
   {id:"m6",teamId:"t10",opponent:"CF Aljarafe",date:"2026-11-15",time:"",duration:90,home:true,modality:"F11",resource:"",status:"pending"}
  ],
  calendarDate:"2026-11-09"
 };
 let state;
 try{state=JSON.parse(localStorage.getItem(KEY))||JSON.parse(JSON.stringify(seed))}catch(e){state=JSON.parse(JSON.stringify(seed))}
 state.facilities=state.facilities||JSON.parse(JSON.stringify(seed.facilities));
 state.facilities.divisible=state.facilities.divisible||[];
 state.schedule=Array.isArray(state.schedule)?state.schedule:JSON.parse(JSON.stringify(seed.schedule));
 state.calendarDate=state.calendarDate||seed.calendarDate;
 state.uniforms=ClubTheme.normalizeKits(state.uniforms||JSON.parse(JSON.stringify(seed.uniforms)));
 state.palette=ClubTheme.cleanPalette(state.palette);
 state.notifications=Array.isArray(state.notifications)?state.notifications:JSON.parse(JSON.stringify(seed.notifications));
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 DemoClubUX.init(state);
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const visibleTeams=()=>state.modality==="todos"?state.teams:state.teams.filter(t=>t.modality===state.modality);
 const active=()=>state.directors.find(d=>d.id===state.activeDirector)||state.directors[0];
 const viewTitles={resumen:"Resumen del club",equipos:"Equipos del club",equipo:"Configurar equipo",directores:"Directores deportivos",instalaciones:"Instalaciones",calendario:"Calendario del club",calendarioMes:"Planificador mensual",comunicaciones:"Comunicaciones",avisos:"Avisos de actividad",ajustes:"Ajustes del club"};
 const pad=n=>String(n).padStart(2,"0");
 const parseDate=s=>{const p=String(s||"").split("-").map(Number);return new Date(p[0],p[1]-1,p[2]||1)};
 const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
 const monday=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()+(x.getDay()+6)%7*-1);return x};
 const fmt=d=>new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long"}).format(d);
 const fmtRange=(a,b)=>new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"}).format(a)+" – "+new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(b);
 const teamOf=id=>state.teams.find(t=>t.id===id)||{name:"Equipo sin asignar",modality:""};
 const shell=()=>{
  $("#sideClubName").textContent=state.club.name;$("#activeDirectorName").textContent=active().name;$("#teamCount").textContent=state.teams.length;
  const logoSlot=document.querySelector(".club-switch .club-crest");
  if(logoSlot){const image=ClubCrest.current({settings:{crest:state.club.crest}});logoSlot.innerHTML=image?'<img src="'+image+'" alt="Escudo del club" style="width:100%;height:100%;object-fit:contain">':'AM';}
  document.querySelectorAll("[data-modality]").forEach(b=>b.classList.toggle("selected",b.dataset.modality===state.modality));
  $("#modalityNote").textContent=state.modality==="todos"?"Vista de todo el club":"Vista de equipos de "+(state.modality==="F7"?"Fútbol 7":"Fútbol 11");
 };
 function teamRows(teams){return teams.slice(0,6).map(t=>'<div class="team-row"><span class="team-icon">⚽</span><span><b>'+esc(t.name)+'</b><small>'+esc(t.category)+' · '+esc(t.competition)+' · '+t.players+' jugadores</small></span><span class="tag">'+t.modality+'</span></div>').join("")||'<div class="empty">No hay equipos en esta modalidad.</div>'}
 function directorsMini(){return state.directors.map(d=>'<div class="director-mini"><span class="avatar">'+esc(d.initials)+'</span><span><b>'+esc(d.name)+'</b><small>Director deportivo · Vista preferida '+d.preferred+'</small></span><em>MISMO NIVEL DE ACCESO</em></div>').join("")}
 function resumenBase(){
  const teams=visibleTeams(),f7=state.teams.filter(t=>t.modality==="F7").length,f11=state.teams.filter(t=>t.modality==="F11").length,pending=state.schedule.filter(m=>m.home&&m.status==="pending").length;
  return '<div class="page-head"><div><h2>Hola, '+esc(active().name.split(" ")[0])+' 👋</h2><p>Este es el estado general de tu club esta temporada.</p></div><button class="btn primary" data-action="go" data-view="equipos">Ver equipos →</button></div>'+
  '<div class="stats"><article class="stat"><span class="stat-icon">⚽</span><div class="stat-label">Equipos del club</div><div class="stat-value">'+state.teams.length+'</div><div class="stat-foot">Todas las categorías</div></article><article class="stat"><span class="stat-icon">♙</span><div class="stat-label">Directores deportivos</div><div class="stat-value">'+state.directors.length+'/2</div><div class="stat-foot">Permisos idénticos</div></article><article class="stat"><span class="stat-icon">◫</span><div class="stat-label">Equipos Fútbol 7</div><div class="stat-value">'+f7+'</div><div class="stat-foot">Fútbol base</div></article><article class="stat"><span class="stat-icon">◧</span><div class="stat-label">Partidos por asignar</div><div class="stat-value">'+pending+'</div><div class="stat-foot">Pendientes de campo y hora</div></article></div>'+
  '<div class="two-col"><section class="panel"><div class="panel-head"><div><h3>Equipos del club</h3><span class="muted">'+teams.length+' en la vista actual</span></div><button class="btn ghost" data-action="go" data-view="equipos">Ver todos</button></div><div class="team-list">'+teamRows(teams)+'</div></section><section class="panel"><div class="panel-head"><div><h3>Dirección deportiva</h3><span class="muted">Acceso compartido a todo el club</span></div></div>'+directorsMini()+'<div class="notice">Los dos directores pueden gestionar cualquier equipo. La modalidad preferida solo cambia la vista inicial, nunca los permisos.</div></section></div>'+
  '<section class="panel"><div class="panel-head"><div><h3>Organización de la jornada</h3><span class="muted">Planificación de partidos e instalaciones</span></div><button class="btn primary" data-action="go" data-view="calendario">Abrir calendario →</button></div><div class="quick-stats"><span><b>'+state.schedule.filter(m=>m.home).length+'</b> partidos en casa</span><span><b>'+state.schedule.filter(m=>!m.home).length+'</b> partidos fuera</span><span><b>'+pending+'</b> pendientes de asignar</span></div></section>';
 }
 function resumen(){
  const pending=DemoClubUX.pendingCount(state);
  return resumenBase()+'<section class="ux-box"><div class="ux-box-title"><h3>Centro de avisos</h3><span>Dirección Deportiva</span></div>'+
   '<p><strong>'+pending+'</strong> avisos prioritarios pendientes para '+(state.modality==="todos"?"todo el club":esc(state.modality))+'. Hay un margen de 48 horas antes de avisar al director deportivo.</p>'+
   '<button type="button" class="btn primary" data-action="go" data-view="avisos">Ver avisos pendientes →</button></section>';
 }
 function equipos(){
  const teams=visibleTeams();
  return '<div class="page-head"><div><h2>Equipos</h2><p>Plantillas y cuerpos técnicos de '+esc(state.club.name)+'.</p></div><button class="btn primary" data-action="new-team">＋ Añadir equipo</button></div><div class="team-grid">'+(teams.map(t=>'<article class="team-card"><div class="team-card-top"><span class="team-badge">⚽</span><div><h3>'+esc(t.name)+'</h3><p>'+esc(t.category)+' · '+t.modality+'</p></div></div><div class="team-meta"><span>'+esc(t.competition)+'</span><b>'+t.players+' jugadores</b></div><div class="muted" style="margin-top:9px">Entrenador/a: '+esc(t.coach)+'</div><button class="btn ghost team-config" data-action="edit-team" data-id="'+t.id+'">Configurar equipo →</button></article>').join("")||'<div class="panel empty">No hay equipos en esta modalidad.</div>')+'</div>';
 }
 function editorEquipoSettings(){const t=state.teams.find(x=>x.id===UI.teamId);if(!t){UI.view="equipos";return equipos()}return '<div class="page-head"><div><h2>'+esc(t.name)+'</h2><p>Configura la información deportiva y organizativa de este equipo.</p></div><button class="btn ghost" data-action="back-teams">← Volver a equipos</button></div><form id="teamEditor" class="panel"><input type="hidden" name="id" value="'+esc(t.id)+'"><div class="form-grid"><div class="field"><label>Nombre del equipo</label><input name="name" required maxlength="60" value="'+esc(t.name)+'"></div><div class="field"><label>Categoría</label><input name="category" required maxlength="40" value="'+esc(t.category)+'"></div><div class="field"><label>Modalidad</label><select name="modality"><option value="F7" '+(t.modality==="F7"?"selected":"")+'>Fútbol 7</option><option value="F11" '+(t.modality==="F11"?"selected":"")+'>Fútbol 11</option></select></div><div class="field"><label>Competición</label><input name="competition" maxlength="80" value="'+esc(t.competition)+'"></div><div class="field"><label>Número de jugadores</label><input name="players" type="number" min="0" max="40" value="'+Number(t.players||0)+'"></div></div><div class="editor-actions"><button type="button" class="btn ghost" data-action="back-teams">Cancelar</button><button type="submit" class="btn primary">Guardar equipo</button></div></form><div class="notice">Los cambios se guardan únicamente en este navegador dentro de esta demostración.</div>'}
 function editorEquipo(){
  const t=state.teams.find(x=>x.id===UI.teamId);
  if(!t){UI.view="equipos";return equipos();}
  const tab=UI.teamTab||"overview";
  const back='<div class="page-head"><div><h2>'+esc(t.name)+'</h2><p>'+esc(t.category)+' · '+esc(t.modality)+' · '+esc(t.competition)+'</p></div>'+
    '<button type="button" class="btn ghost" data-action="back-teams">← Volver a equipos</button></div>';
  const page=tab==="overview"?DemoClubUX.overview(state,t):
    tab==="players"?DemoClubUX.playerTable(state,t):
    tab==="coaches"?DemoClubUX.coachesPanel(state,t):
    tab==="code"?DemoClubUX.codePanel(state,t):(()=>{const html=editorEquipoSettings();return html.slice(html.indexOf('<form id="teamEditor"'));})();
  return back+DemoClubUX.teamTabs(tab)+page;
 }
 function calendarioMes(){return DemoClubUX.monthView(state);}
 function directores(){
  return '<div class="page-head"><div><h2>Directores deportivos</h2><p>El club admite uno o dos directores. Ambos tienen exactamente los mismos permisos.</p></div>'+(state.directors.length<2?'<button class="btn primary" data-action="add-director">＋ Añadir segundo director</button>':'')+'</div><div class="director-grid">'+state.directors.map(d=>'<article class="director-card"><span class="avatar">'+esc(d.initials)+'</span><h3>'+esc(d.name)+'</h3><p>Director deportivo · Acceso completo al club</p><div class="permission">✓ Mismos permisos y capacidad de gestión</div><div class="field" style="margin-top:14px"><label>Modalidad preferida al entrar</label><select data-preferred="'+d.id+'"><option value="F7" '+(d.preferred==="F7"?"selected":"")+' >Fútbol 7</option><option value="F11" '+(d.preferred==="F11"?"selected":"")+' >Fútbol 11</option></select></div><button class="btn ghost" style="margin-top:12px;width:100%" data-action="switch-director" data-id="'+d.id+'">'+(state.activeDirector===d.id?"Director activo":"Cambiar a este director")+'</button></article>').join("")+'</div><div class="notice">La preferencia F7/F11 es individual. Cualquier director puede cambiar a la otra modalidad o consultar todo el club en cualquier momento.</div>';
 }
 function instalaciones(){
  return '<div class="page-head"><div><h2>Instalaciones</h2><p>Configura los campos físicos y si pueden dividirse para fútbol 7.</p></div><span class="tag amber">Configuración de demostración</span></div><section class="panel"><div class="panel-head"><div><h3>Campos disponibles</h3><span class="muted">Los cambios se guardan en este navegador.</span></div></div><div class="facility-row"><span><b>Campos de Fútbol 11</b><small>Instalaciones de dimensiones completas</small></span><div class="counter"><button data-count="f11" data-delta="-1">−</button><strong>'+state.facilities.f11+'</strong><button data-count="f11" data-delta="1">＋</button></div></div><div class="facility-row"><span><b>Campos de Fútbol 7 independientes</b><small>Campos que no proceden de dividir un F11</small></span><div class="counter"><button data-count="f7" data-delta="-1">−</button><strong>'+state.facilities.f7+'</strong><button data-count="f7" data-delta="1">＋</button></div></div><div class="notice"><b>Capacidad equivalente:</b> '+(state.facilities.f11*2+state.facilities.f7)+' campos F7 teóricos. Solo se podrán reservar dos partidos F7 en un mismo F11 si esa instalación es físicamente divisible y permite uso simultáneo.</div></section><section class="panel"><h3>Divisibilidad de campos F11</h3><p class="muted" style="margin:5px 0 12px">Evita reservar simultáneamente el campo completo y sus dos mitades.</p>'+Array.from({length:state.facilities.f11},(_,i)=>'<div class="facility-row"><span><b>Campo F11 · '+(i+1)+'</b><small>¿Se puede dividir en dos campos F7?</small></span><label><input type="checkbox" data-divisible="'+i+'" '+(state.facilities.divisible[i]?"checked":"")+'> Sí, es divisible</label></div>').join("")+'</section>';
 }
 const resourceList = modality => ClubPlanner.resourceList(state.facilities,modality);
 const conflicts = (candidate,ignoreId) => ClubPlanner.conflicts(candidate,state.schedule,ignoreId);
 const validate = (candidate,ignoreId) => ClubPlanner.validate(candidate,state.schedule,state.facilities,ignoreId);
 function matchLabel(m){
  const t=teamOf(m.teamId),side=m.home?"🏠 Local":"✈️ Visitante",res=resourceList(m.modality).find(x=>x.id===m.resource);
  return '<article class="fixture-card '+(m.status==="pending"?"is-pending":"")+'"><div class="fixture-time">'+(m.time||"Por asignar")+'</div><div class="fixture-main"><b>'+esc(t.name)+' <span>vs</span> '+esc(m.opponent)+'</b><small>'+side+' · '+m.modality+(m.home&&res?" · "+esc(res.label):"")+'</small></div><div class="fixture-actions"><span class="tag '+(m.status==="published"?"green":m.status==="pending"?"amber":"")+'">'+(m.status==="published"?"Publicado":m.status==="pending"?"Pendiente":"Propuesto")+'</span>'+(m.home&&m.status!=="published"&&m.time&&m.resource?'<button class="btn tiny" data-action="publish" data-id="'+m.id+'">Publicar</button>':'')+(m.status!=="published"?'<button class="btn tiny ghost" data-action="delete-match" data-id="'+m.id+'">×</button>':'')+'</div></article>';
 }
 function pendingRow(m){
  const options=resourceList(m.modality).map(r=>'<option value="'+r.id+'">'+esc(r.label)+'</option>').join("");
  return '<form class="pending-assignment" data-assign-id="'+m.id+'"><div class="pending-team"><b>'+esc(teamOf(m.teamId).name)+'</b><small>vs '+esc(m.opponent)+'</small></div><label>Fecha<input name="date" type="date" value="'+esc(m.date||state.calendarDate)+'" required></label><label>Hora<input name="time" type="time" value="'+esc(m.time||"")+'" required></label><label>Campo<select name="resource" required><option value="">Seleccionar</option>'+options+'</select></label><button class="btn primary" type="submit">Asignar</button></form>';
 }
 function calendar(){
  const start=monday(parseDate(state.calendarDate)),days=Array.from({length:7},(_,i)=>addDays(start,i)),end=days[6];
  const weekEvents=state.schedule.filter(m=>m.date>=dateKey(start)&&m.date<=dateKey(end)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const pending=state.schedule.filter(m=>m.home&&(!m.time||!m.resource||m.status==="pending"));
  const teamOpts=state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+' · '+t.modality+'</option>').join("");
  const fields=state.teams.some(t=>t.modality==="F7")?resourceList("F7").map(r=>'<option value="'+r.id+'">'+esc(r.label)+'</option>').join(""):"";
  return '<div class="page-head"><div><h2>Planificador de partidos</h2><p>Organiza los partidos en casa sin solapar instalaciones.</p></div><div class="calendar-tools"><button class="btn ghost" data-action="week-prev">←</button><button class="btn ghost" data-action="week-today">Esta semana</button><button class="btn ghost" data-action="week-next">→</button></div></div>'+
  '<div class="ux-actions" style="margin-bottom:14px"><button type="button" class="btn primary" data-action="demo-month-view">▦ Abrir planificador mensual</button><button type="button" class="btn ghost" data-action="demo-print-month">Descargar calendario horizontal</button></div><section class="panel"><div class="calendar-head"><div><h3>'+esc(fmtRange(start,end))+'</h3><span class="muted">Semana · '+weekEvents.length+' partidos</span></div><button class="btn ghost" data-action="print">Imprimir / guardar PDF</button></div><div class="week-grid">'+days.map(d=>{const key=dateKey(d),list=weekEvents.filter(m=>m.date===key);return '<div class="week-day '+(key===dateKey(new Date())?"today":"")+'"><b>'+esc(new Intl.DateTimeFormat("es-ES",{weekday:"short"}).format(d))+'</b><strong>'+d.getDate()+'</strong><small>'+list.length+' partidos</small></div>';}).join("")+'</div>'+
  '<div class="fixture-list">'+days.map(d=>{const list=weekEvents.filter(m=>m.date===dateKey(d));return '<div class="day-group"><h4>'+esc(fmt(d))+'</h4>'+(list.length?list.map(matchLabel).join(""):'<p class="muted">Sin partidos programados</p>')+'</div>';}).join("")+'</div></section>'+
  '<div class="two-col calendar-bottom"><section class="panel"><div class="panel-head"><div><h3>Partidos locales pendientes</h3><span class="muted">Asigna fecha, hora y campo</span></div><span class="tag amber">'+pending.length+' pendientes</span></div>'+(pending.length?pending.map(pendingRow).join(''):'<div class="notice">No hay partidos pendientes de asignación.</div>')+'</section>'+
  '<section class="panel"><h3>Añadir partido al calendario</h3><p class="muted" style="margin:5px 0 14px">Los partidos visitantes son informativos y no reservan instalaciones.</p><form id="matchForm" class="form-grid"><div class="field full"><label>Equipo</label><select name="teamId" required>'+teamOpts+'</select></div><div class="field"><label>Rival</label><input name="opponent" required maxlength="70" placeholder="Nombre del rival"></div><div class="field"><label>Fecha</label><input name="date" type="date" value="'+esc(state.calendarDate)+'" required></div><div class="field"><label>Hora</label><input name="time" type="time"></div><div class="field"><label>Local / visitante</label><select name="home"><option value="1">Local</option><option value="0">Visitante</option></select></div><div class="field"><label>Campo (solo local)</label><select name="resource"><option value="">Pendiente de asignar</option>'+resourceList(state.teams[0] ? state.teams[0].modality : "F7").map(r=>'<option value="'+r.id+'">'+esc(r.label)+'</option>').join("")+'</select></div><div class="field"><label>Duración</label><select name="duration"><option value="70">70 minutos</option><option value="80">80 minutos</option><option value="90" selected>90 minutos</option></select></div><div class="field full"><button class="btn primary" type="submit">＋ Añadir al calendario</button></div></form></section></div>';
 }
 function weekMessage(){
  const start=monday(parseDate(state.calendarDate)),end=addDays(start,6);
  const events=state.schedule.filter(m=>m.date>=dateKey(start)&&m.date<=dateKey(end)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const lines=["📅 "+state.club.name+" · Plan semanal",fmtRange(start,end)," "];
  events.forEach(m=>{const t=teamOf(m.teamId),d=fmt(parseDate(m.date)),res=resourceList(m.modality).find(r=>r.id===m.resource);lines.push((m.home?"🏠 LOCAL":"✈️ VISITANTE")+" · "+t.name+" vs "+m.opponent);lines.push("📆 "+d+(m.time?" · 🕒 "+m.time:" · Hora pendiente"));if(m.home)lines.push(m.resource&&res?"📍 "+res.label:"📍 Campo pendiente");lines.push(m.status==="published"?"✅ Horario publicado":"🟡 Pendiente de confirmar");lines.push("");});
  if(!events.length)lines.push("No hay partidos registrados para esta semana.");
  lines.push("— Dirección deportiva · "+state.club.name);
  return lines.join("\n");
 }
 function monthMessage(){
  const day=parseDate(state.calendarDate),year=day.getFullYear(),month=day.getMonth();
  const from=dateKey(new Date(year,month,1)),to=dateKey(new Date(year,month+1,0));
  const events=state.schedule.filter(m=>m.date>=from&&m.date<=to).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const header=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(day);
  const lines=["📅 "+state.club.name+" · Plan mensual",header.toUpperCase(),""];
  for(const m of events){
    const t=teamOf(m.teamId),res=resourceList(m.modality).find(x=>x.id===m.resource);
    lines.push((m.home?"🏠 LOCAL":"✈️ VISITANTE")+" · "+t.name+" vs "+m.opponent);
    lines.push("📆 "+fmt(parseDate(m.date))+(m.time?" · 🕒 "+m.time:" · Hora pendiente"));
    if(m.home)lines.push(res?"📍 "+res.label:"📍 Campo pendiente");
    lines.push(m.status==="published"?"✅ Horario publicado":"🟡 Pendiente de confirmar","");
  }
  if(!events.length)lines.push("No hay partidos registrados para este mes.");
  lines.push("— Dirección deportiva · "+state.club.name);
  return lines.join("\n");
 }
 function comunicaciones(){
  const start=monday(parseDate(state.calendarDate)),end=addDays(start,6),events=state.schedule.filter(m=>m.date>=dateKey(start)&&m.date<=dateKey(end));
  return '<div class="page-head"><div><h2>Comunicaciones</h2><p>Prepara un aviso semanal para compartir con los entrenadores.</p></div><span class="tag green">Listo para WhatsApp</span></div><section class="panel"><div class="panel-head"><div><h3>Resumen semanal</h3><span class="muted">'+esc(fmtRange(start,end))+' · '+events.length+' partidos</span></div><button class="btn primary" data-action="copy-week">Copiar mensaje</button><button class="btn ghost" data-action="copy-month">Copiar mes completo</button></div><pre class="message-preview">'+esc(weekMessage())+'</pre><div class="notice">El mensaje distingue partidos locales y visitantes, e indica claramente los horarios o campos pendientes. Solo contiene información deportiva del calendario.</div><div class="communication-actions"><button class="btn ghost" data-action="print">Imprimir / guardar PDF</button><button class="btn ghost" data-action="go" data-view="calendario">Editar calendario</button></div></section>';
 }
 function uniformCard(key,label){const u=state.uniforms[key];return '<section class="panel uniform-card"><h3>'+label+'</h3><p class="muted">Elige por separado el color de cada prenda. Ejemplo: camiseta roja, pantalón negro y medias rojas.</p><div class="form-grid"><div class="field"><label>Camiseta</label><input type="color" id="uniform-'+key+'-shirt" value="'+esc(u.shirt)+'"><small>Color de la parte superior.</small></div><div class="field"><label>Pantalón</label><input type="color" id="uniform-'+key+'-shorts" value="'+esc(u.shorts)+'"><small>Color del pantalón.</small></div><div class="field"><label>Medias</label><input type="color" id="uniform-'+key+'-socks" value="'+esc(u.socks)+'"><small>Color de las medias.</small></div></div><div class="kit-preview"><span style="background:'+esc(u.shirt)+'">Camiseta</span><span style="background:'+esc(u.shorts)+'">Pantalón</span><span style="background:'+esc(u.socks)+';color:#222">Medias</span></div></section>'}
 function avisos(){
  return '<div class="page-head"><div><h2>Avisos de actividad</h2><p>Tareas prioritarias filtradas por modalidad, con 48 horas de margen.</p></div>'+
  '<span class="tag amber">'+DemoClubUX.pendingCount(state)+' prioritarios</span></div>'+DemoClubUX.noticeList(state);
 }
 function ajustes(){
  const tab=UI.settingsTab||"data";
  const tabs='<div class="demo-settings-tabs" role="navigation" aria-label="Configuración del club">'+
    [["data","Datos y escudo"],["kits","Equipaciones"],["palette","Identidad visual"]].map(([id,label])=>
      '<button type="button" data-action="demo-settings-tab" data-tab="'+id+'" class="'+(id===tab?"on":"")+'">'+label+'</button>').join("")+'</div>';
  const general='<section class="panel"><div class="form-grid"><div class="field full">'+
    FilePicker.render({title:"Escudo del club",formats:"PNG · JPG · WEBP",help:"Hasta 3 MB · imagen sin fondo recomendada",
      icon:"🛡️",label:"Elegir escudo",accept:"image/png,image/jpeg,image/webp",inputId:"clubCrestUpload"})+
    '<p class="muted">Prepara la imagen con <a href="https://www.canva.com/es_es/funciones/quitar-fondo-imagen/" target="_blank" rel="noopener noreferrer">Canva</a> si lo necesitas (herramienta externa; ciertas funciones requieren pago).</p>'+
    (ClubCrest.current({settings:{crest:state.club.crest}})?
      '<img src="'+ClubCrest.current({settings:{crest:state.club.crest}})+'" alt="Escudo del club" width="90" height="90" style="object-fit:contain"><button type="button" class="btn ghost" data-action="remove-club-crest">Quitar escudo</button>':'')+
    '</div>'+[["name","Nombre del club"],["town","Municipio"],["province","Provincia"],["community","Comunidad autónoma"],["season","Temporada"]].map(([key,label])=>
       '<div class="field"><label>'+label+'</label><input id="club'+key[0].toUpperCase()+key.slice(1)+'" value="'+esc(state.club[key]||"")+'"></div>').join("")+
    '</div><div style="display:flex;justify-content:flex-end;margin-top:15px"><button class="btn primary" data-action="save-club">Guardar datos</button></div></section>';
  const values={club:state.club.name,kits:state.uniforms,palette:state.palette};
  const body=tab==="kits"?ClubKitsEditor.renderKits(values,"set"):
    tab==="palette"?ClubKitsEditor.renderPalette(values,"set"):general;
  return '<div class="demo-settings-screen"><div class="page-head"><div><h2>Configuración del club</h2>'+
    '<p>El mismo editor de equipaciones e identidad visual de Banquillo, adaptado al club.</p></div></div>'+
    tabs+body+'<div class="notice">Demo local: los datos son ficticios. Para crear equipos y códigos válidos abre la Beta autenticada, apartado «Clubes».</div></div>';
 }
 const render=()=>{
  DemoClubUX.init(state);
  const colors=ClubTheme.derive(state.uniforms,state.palette).light;
  document.documentElement.style.setProperty("--navy",colors["--brand"]);
  document.documentElement.style.setProperty("--green",colors["--accent"]);
  document.documentElement.style.setProperty("--green-soft",colors["--accent-soft"]);
  shell();
  const v=UI.view||"resumen",t=state.teams.find(x=>x.id===UI.teamId);
  const main=$(".main"),scope=["equipo","ajustes","directores","instalaciones","calendario","calendarioMes","comunicaciones"].includes(v);
  if(main){main.classList.toggle("ux-team-mode",v==="equipo");main.classList.toggle("ux-hide-scope",scope);}
  const context=$("#teamContextBar");
  if(context){context.hidden=v!=="equipo"||!t;if(v==="equipo"&&t)context.innerHTML=DemoClubUX.headerTeam(t,DemoClubUX.details(state,t));}
  $("#pageTitle").textContent=v==="equipo"&&t?t.name:(viewTitles[v]||"Banquillo");
  $("#viewRoot").innerHTML=({resumen,equipos,equipo:editorEquipo,directores,instalaciones,calendario:calendar,calendarioMes,comunicaciones,avisos,ajustes}[v]||resumen)();
  const count=$("#noticeCount");if(count)count.textContent=DemoClubUX.pendingCount(state);
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
 };
 const UI={view:["equipos","instalaciones","calendario","calendarioMes","ajustes","directores","avisos"].includes(location.hash.slice(1))?location.hash.slice(1):"resumen",teamId:null,teamTab:"overview",settingsTab:"data"};
 document.addEventListener("click",async e=>{
  const kitAct=e.target.closest("[data-act]");
  if(kitAct){
    if(kitAct.dataset.act==="setToggleThird"){
      state.uniforms=ClubTheme.normalizeKits(state.uniforms);
      if(state.uniforms.third)delete state.uniforms.third;
      else state.uniforms.third={shirt:"#FFFFFF",shorts:"#17365D",socks:"#FFFFFF"};
      save();render();return;
    }
    if(kitAct.dataset.act==="setPaletteChoice"&&["auto","preset"].includes(kitAct.dataset.mode)){
      state.palette={...ClubTheme.cleanPalette(state.palette),mode:kitAct.dataset.mode};
      save();render();return;
    }
  }
  const nav=e.target.closest("[data-view]");if(nav){UI.view=nav.dataset.view;render();return}
  const mod=e.target.closest("[data-modality]");if(mod){state.modality=mod.dataset.modality;save();render();return}
  const a=e.target.closest("[data-action]");if(!a)return;
  const id=a.dataset.id;
  if(a.dataset.action==="demo-team-tab"){
    if(["overview","players","coaches","settings","code"].includes(a.dataset.tab)){UI.teamTab=a.dataset.tab;render();}
    return;
  }
  if(a.dataset.action==="demo-copy-code"){
    const t=state.teams.find(t=>t.id===UI.teamId);if(!t)return;
    const code=DemoClubUX.details(state,t).code;
    await DemoDialog.copy("Código de demostración",code);
    return;
  }
  if(a.dataset.action==="demo-rotate-code"){
    const t=state.teams.find(t=>t.id===UI.teamId);
    if(t&&await DemoDialog.confirm("¿Renovar el código de demostración de "+t.name+"? El anterior dejará de mostrarse.")){
      DemoClubUX.details(state,t).code=DemoClubUX.randomCode();save();render();
    }return;
  }
  if(a.dataset.action==="demo-change-coach"){
    const t=state.teams.find(t=>t.id===UI.teamId);if(!t)return;
    const name=await DemoDialog.prompt("Nombre del nuevo entrenador (ficticio)",t.coach==="Por asignar"?"":t.coach);
    if(name===null)return;
    const n=name.trim().slice(0,60);if(!n)return;
    t.coach=n;const d=DemoClubUX.details(state,t);d.coachStatus="active";d.code=DemoClubUX.randomCode();
    save();render();return;
  }
  if(a.dataset.action==="demo-remove-coach"){
    const t=state.teams.find(t=>t.id===UI.teamId);if(!t)return;
    if(!await DemoDialog.confirm("¿Dar de baja a "+t.coach+" y renovar el código del "+t.name+"? Es una simulación local, no revoca cuentas reales."))return;
    t.coach="Por asignar";const d=DemoClubUX.details(state,t);d.coachStatus="vacant";d.code=DemoClubUX.randomCode();
    save();render();return;
  }
  if(a.dataset.action==="demo-ignore-notice"){
    const n=state.notifications.find(n=>n.id===id);if(!n)return;
    if(!n.ignoredAt)n.ignoredAt=Date.now();
    save();render();return;
  }
  if(a.dataset.action==="demo-resolve-notice"){
    const n=state.notifications.find(n=>n.id===id);if(!n)return;
    n.resolvedAt=Date.now();save();
    const card=a.closest(".ux-notice");
    if(card){
      card.classList.add("is-resolved");
      setTimeout(()=>{n.archived=true;save();if(UI.view==="avisos")render();},990);
    }else{n.archived=true;save();render();}
    return;
  }
  if(a.dataset.action==="demo-send-notice"){
    const n=state.notifications.find(n=>n.id===id);if(!n)return;
    const content=DemoClubUX.noticeText(state,n);
    n.preparedAt=Date.now();
    if(n.ignoredAt && (Date.now()-Number(n.ignoredAt))>=7*86400000)n.reminderPrepared=true;
    save();
    // Abrir WhatsApp, sin asumir que el usuario lo ha enviado.
    window.open("https://wa.me/?text="+encodeURIComponent(content),"_blank","noopener,noreferrer");
    render();return;
  }
  if(a.dataset.action==="demo-month-view"){
    UI.view="calendarioMes";render();return;
  }
  if(a.dataset.action==="demo-week-view"){
    UI.view="calendario";render();return;
  }
  if(a.dataset.action==="demo-month-prev"||a.dataset.action==="demo-month-next"){
    const d=parseDate(state.calendarDate);d.setDate(1);d.setMonth(d.getMonth()+(a.dataset.action==="demo-month-prev"?-1:1));
    state.calendarDate=dateKey(d);save();render();return;
  }
  if(a.dataset.action==="demo-pick-day"){
    if(ClubPlanner.validDate(a.dataset.date)){state.calendarDate=a.dataset.date;save();render();}
    return;
  }
  if(a.dataset.action==="demo-print-month"){
    const printable=$("#printCalendar");if(!printable)return;
    printable.innerHTML=DemoClubUX.printCalendar(state);printable.hidden=false;
    window.print();
    const finish=()=>{printable.hidden=true;};
    window.addEventListener("afterprint",finish,{once:true});
    return;
  }

  if(a.dataset.action==="demo-settings-tab"&&["data","kits","palette"].includes(a.dataset.tab)){UI.settingsTab=a.dataset.tab;render();return}
  if(a.dataset.action==="go"){UI.view=a.dataset.view;render();return}
  if(a.dataset.action==="edit-team"){UI.teamId=id;UI.teamTab="overview";UI.view="equipo";render();return}
  if(a.dataset.action==="back-teams"){UI.view="equipos";render();return}
  if(a.dataset.action==="switch-director"){state.activeDirector=id;state.modality=active().preferred;save();render()}
  if(a.dataset.action==="add-director"&&state.directors.length<2){state.directors.push({id:"d2",name:"Marta León",initials:"ML",preferred:"F11"});save();render()}
  if(a.dataset.action==="new-team"){const newTeam=await DemoDialog.team();if(!newTeam)return;state.teams.push({id:"t"+Date.now(),name:newTeam.name,category:"Por definir",modality:newTeam.modality,competition:"Pendiente de asignar",players:0,coach:"Por asignar"});save();render()}
  if(a.dataset.action==="remove-club-crest"){state.club.crest="";save();render();return}
  if(a.dataset.action==="save-club"){["name","town","province","community","season"].forEach(k=>{const el=$("#club"+k[0].toUpperCase()+k.slice(1));if(el)state.club[k]=el.value.trim()});["first","second"].forEach(k=>["shirt","shorts","socks"].forEach(part=>{const el=$("#uniform-"+k+"-"+part);if(el)state.uniforms[k][part]=el.value}));save();render()}
  if(a.dataset.action==="week-prev"){state.calendarDate=dateKey(addDays(monday(parseDate(state.calendarDate)),-7));save();render()}
  if(a.dataset.action==="week-next"){state.calendarDate=dateKey(addDays(monday(parseDate(state.calendarDate)),7));save();render()}
  if(a.dataset.action==="week-today"){state.calendarDate=dateKey(new Date());save();render()}
  if(a.dataset.action==="publish"){const m=state.schedule.find(x=>x.id===id);if(m){const problem=validate(m,id);if(problem){await DemoDialog.alert("No se puede publicar: "+problem);return}m.status="published";save();render()}}
  if(a.dataset.action==="delete-match"){if(!await DemoDialog.confirm("¿Eliminar este partido de la demostración?"))return;state.schedule=state.schedule.filter(x=>x.id!==id);save();render()}
  if(a.dataset.action==="copy-week"){await DemoDialog.copy("Resumen semanal",weekMessage());}
  if(a.dataset.action==="copy-month"){await DemoDialog.copy("Resumen mensual",monthMessage());}
  if(a.dataset.action==="print"){window.print()}
 });
 document.addEventListener("submit",async e=>{
  if(e.target.id==="teamEditor"){e.preventDefault();const f=new FormData(e.target),t=state.teams.find(x=>x.id===f.get("id"));if(!t)return;t.name=String(f.get("name")||"").trim();t.category=String(f.get("category")||"").trim();t.modality=String(f.get("modality")||"F7");t.competition=String(f.get("competition")||"").trim();t.players=Math.max(0,Math.min(40,Number(f.get("players")||0)));/* El entrenador se gestiona únicamente en la pestaña Entrenadores. */save();UI.view="equipos";render();return}
  const assignmentId=e.target.dataset.assignId;
  if(assignmentId){e.preventDefault();const f=new FormData(e.target),m=state.schedule.find(x=>x.id===assignmentId);if(!m)return;const candidate={...m,date:f.get("date"),time:f.get("time"),resource:f.get("resource"),status:"proposed"};if(!candidate.date||!candidate.time||!candidate.resource){await DemoDialog.alert("Selecciona fecha, hora y campo.");return}const problem=validate(candidate,assignmentId);if(problem){await DemoDialog.alert(problem);return}Object.assign(m,candidate);state.calendarDate=m.date;save();render();return}
  if(e.target.id!=="matchForm")return;e.preventDefault();
  const f=new FormData(e.target),team=teamOf(f.get("teamId")),home=f.get("home")==="1";
  const m={id:"m"+Date.now(),teamId:f.get("teamId"),opponent:String(f.get("opponent")||"").trim(),date:f.get("date"),time:f.get("time"),duration:Number(f.get("duration")||90),home,modality:team.modality,resource:home?String(f.get("resource")||""):"",status:"pending"};
  if(!m.opponent||!m.date){await DemoDialog.alert("Completa el rival y la fecha.");return}
  if(!ClubPlanner.validDate(m.date)){await DemoDialog.alert("Escribe una fecha válida.");return}
   if(m.time&&!ClubPlanner.validTime(m.time)){await DemoDialog.alert("La hora indicada no es válida.");return}
   if(m.time && (home ? !!m.resource : true)){const problem=validate(m);if(problem){await DemoDialog.alert(problem);return}}
  if(home&&(!m.resource||!m.time))m.status="pending";else m.status="proposed";
  state.schedule.push(m);state.calendarDate=m.date;save();render();
 });
 document.addEventListener("change",async e=>{
  if(e.target.dataset.chg==="setKit"){
    const key=e.target.dataset.kit,part=e.target.dataset.part;
    if(state.uniforms[key]&&["shirt","shorts","socks"].includes(part)&&ClubTheme.validHex(e.target.value)){
      state.uniforms[key][part]=e.target.value;save();render();
    }return;
  }
  if(e.target.dataset.chg==="setPalettePreset"){
    if(ClubTheme.presets[e.target.value]){state.palette={...ClubTheme.cleanPalette(state.palette),mode:"preset",preset:e.target.value};save();render();}return;
  }
  if(e.target.id==="clubCrestUpload"&&e.target.files?.[0]){
    try{state.club.crest=await ClubCrest.upload(e.target.files[0]);save();render();}
    catch(err){await DemoDialog.alert(err.message||"No se pudo cargar el escudo.");}
    return;
  }
  const p=e.target.dataset.preferred;if(p){const d=state.directors.find(x=>x.id===p);if(d){d.preferred=e.target.value;save();render()}}
  if(e.target.dataset.divisible!==undefined){state.facilities.divisible[+e.target.dataset.divisible]=e.target.checked;save();render()}
  if(e.target.name==="home"){const form=e.target.form,resource=form&&form.elements.resource;if(resource){resource.disabled=e.target.value!=="1";if(e.target.value!=="1")resource.value=""}}
  if(e.target.name==="teamId"){const form=e.target.form,team=teamOf(e.target.value),resource=form&&form.elements.resource;if(resource){const choices=resourceList(team.modality);resource.innerHTML='<option value="">Pendiente de asignar</option>'+choices.map(r=>'<option value="'+r.id+'">'+esc(r.label)+'</option>').join("")}}
 });
 document.addEventListener("click",e=>{const c=e.target.closest("[data-count]");if(!c)return;const k=c.dataset.count;state.facilities[k]=Math.max(0,Math.min(12,state.facilities[k]+Number(c.dataset.delta)));if(k==="f11")state.facilities.divisible.length=state.facilities.f11;save();render()});
 $("#exportDemo").addEventListener("click",()=>{
  // Exporta únicamente datos de esta demo: nunca tokens, cuentas o datos de Supabase.
  const payload={format:"banquillo-club-demo",version:1,exportedAt:new Date().toISOString(),club:state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="banquillo-configuracion-club-demo.json";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 async function restoreDemoBackup(file){
  if(!file)return;
  try{
   if(file.size>3*1024*1024)throw Error("La copia supera el límite de 3 MB.");
   const raw=JSON.parse(await file.text());
   if(raw?.format!=="banquillo-club-demo"||raw?.version!==1||!raw.club||typeof raw.club!=="object")
     throw Error("No es un respaldo de Banquillo Demo compatible.");
   const data=raw.club;
   if(typeof data.club?.name!=="string"||data.club.name.trim().length<2||
      !Array.isArray(data.teams)||data.teams.length>30||
      !Array.isArray(data.directors)||data.directors.length<1||data.directors.length>2||
      !Array.isArray(data.schedule)||data.schedule.length>400||
      !Array.isArray(data.notifications)||data.notifications.length>300)
     throw Error("El archivo no tiene la estructura de una demostración válida.");
   if(!data.teams.every(t=>typeof t.id==="string"&&typeof t.name==="string"&&
      t.name.length<=75&&["F7","F11"].includes(t.modality)))
     throw Error("Los equipos del respaldo contienen datos inválidos.");
   if(!data.schedule.every(m=>typeof m.id==="string"&&typeof m.teamId==="string"&&
      ClubPlanner.validDate(m.date)&&(!m.time||ClubPlanner.validTime(m.time))))
     throw Error("El calendario del respaldo contiene fechas u horas inválidas.");
   if(!await DemoDialog.confirm("¿Restaurar esta copia? Reemplazará la configuración local actual de la demostración."))return;
   // Cargar solo datos de demo; nunca credenciales ni tokens de Supabase.
   data.club.crest=ClubCrest.clean(data.club.crest);
   data.uniforms=ClubTheme.normalizeKits(data.uniforms);
   data.palette=ClubTheme.cleanPalette(data.palette);
   data.modality=["todos","F7","F11"].includes(data.modality)?data.modality:"todos";
   data.facilities=data.facilities||JSON.parse(JSON.stringify(seed.facilities));
   data.facilities.f11=Math.max(0,Math.min(12,Number(data.facilities.f11)||0));
   data.facilities.f7=Math.max(0,Math.min(12,Number(data.facilities.f7)||0));
   data.facilities.divisible=Array.isArray(data.facilities.divisible)?data.facilities.divisible.slice(0,12):[];
   state=data;
   DemoClubUX.init(state);
   UI.view="resumen";UI.teamId=null;UI.teamTab="overview";
   save();render();await DemoDialog.alert("Respaldo restaurado en este navegador.");
  }catch(err){await DemoDialog.alert(err.message||"No se ha podido abrir el respaldo. Comprueba el archivo.");}
 }
 $("#importDemo").addEventListener("click",async()=>{const file=await DemoDialog.pickJSON();if(file)await restoreDemoBackup(file);});
 $("#importDemoFile").addEventListener("change",async e=>{const file=e.target.files?.[0];e.target.value="";if(file)await restoreDemoBackup(file);});
 $("#resetDemo").addEventListener("click",async()=>{if(!await DemoDialog.confirm("¿Restablecer todos los datos ficticios del club?"))return;localStorage.removeItem(KEY);state=JSON.parse(JSON.stringify(seed));save();render()});
 save();render();
})();