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
 state.uniforms=state.uniforms||JSON.parse(JSON.stringify(seed.uniforms));
 state.notifications=Array.isArray(state.notifications)?state.notifications:JSON.parse(JSON.stringify(seed.notifications));
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const visibleTeams=()=>state.modality==="todos"?state.teams:state.teams.filter(t=>t.modality===state.modality);
 const active=()=>state.directors.find(d=>d.id===state.activeDirector)||state.directors[0];
 const viewTitles={resumen:"Resumen del club",equipos:"Equipos del club",equipo:"Configurar equipo",directores:"Directores deportivos",instalaciones:"Instalaciones",calendario:"Calendario del club",comunicaciones:"Comunicaciones",avisos:"Avisos de actividad",ajustes:"Ajustes del club"};
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
  document.querySelectorAll("[data-modality]").forEach(b=>b.classList.toggle("selected",b.dataset.modality===state.modality));
  $("#modalityNote").textContent=state.modality==="todos"?"Vista de todo el club":"Vista de equipos de "+(state.modality==="F7"?"Fútbol 7":"Fútbol 11");
 };
 function teamRows(teams){return teams.slice(0,6).map(t=>'<div class="team-row"><span class="team-icon">⚽</span><span><b>'+esc(t.name)+'</b><small>'+esc(t.category)+' · '+esc(t.competition)+' · '+t.players+' jugadores</small></span><span class="tag">'+t.modality+'</span></div>').join("")||'<div class="empty">No hay equipos en esta modalidad.</div>'}
 function directorsMini(){return state.directors.map(d=>'<div class="director-mini"><span class="avatar">'+esc(d.initials)+'</span><span><b>'+esc(d.name)+'</b><small>Director deportivo · Vista preferida '+d.preferred+'</small></span><em>MISMO NIVEL DE ACCESO</em></div>').join("")}
 function resumen(){
  const teams=visibleTeams(),f7=state.teams.filter(t=>t.modality==="F7").length,f11=state.teams.filter(t=>t.modality==="F11").length,pending=state.schedule.filter(m=>m.home&&m.status==="pending").length;
  return '<div class="page-head"><div><h2>Hola, '+esc(active().name.split(" ")[0])+' 👋</h2><p>Este es el estado general de tu club esta temporada.</p></div><button class="btn primary" data-action="go" data-view="equipos">Ver equipos →</button></div>'+
  '<div class="stats"><article class="stat"><span class="stat-icon">⚽</span><div class="stat-label">Equipos del club</div><div class="stat-value">'+state.teams.length+'</div><div class="stat-foot">Todas las categorías</div></article><article class="stat"><span class="stat-icon">♙</span><div class="stat-label">Directores deportivos</div><div class="stat-value">'+state.directors.length+'/2</div><div class="stat-foot">Permisos idénticos</div></article><article class="stat"><span class="stat-icon">◫</span><div class="stat-label">Equipos Fútbol 7</div><div class="stat-value">'+f7+'</div><div class="stat-foot">Fútbol base</div></article><article class="stat"><span class="stat-icon">◧</span><div class="stat-label">Partidos por asignar</div><div class="stat-value">'+pending+'</div><div class="stat-foot">Pendientes de campo y hora</div></article></div>'+
  '<div class="two-col"><section class="panel"><div class="panel-head"><div><h3>Equipos del club</h3><span class="muted">'+teams.length+' en la vista actual</span></div><button class="btn ghost" data-action="go" data-view="equipos">Ver todos</button></div><div class="team-list">'+teamRows(teams)+'</div></section><section class="panel"><div class="panel-head"><div><h3>Dirección deportiva</h3><span class="muted">Acceso compartido a todo el club</span></div></div>'+directorsMini()+'<div class="notice">Los dos directores pueden gestionar cualquier equipo. La modalidad preferida solo cambia la vista inicial, nunca los permisos.</div></section></div>'+
  '<section class="panel"><div class="panel-head"><div><h3>Organización de la jornada</h3><span class="muted">Planificación de partidos e instalaciones</span></div><button class="btn primary" data-action="go" data-view="calendario">Abrir calendario →</button></div><div class="quick-stats"><span><b>'+state.schedule.filter(m=>m.home).length+'</b> partidos en casa</span><span><b>'+state.schedule.filter(m=>!m.home).length+'</b> partidos fuera</span><span><b>'+pending+'</b> pendientes de asignar</span></div></section>';
 }
 function equipos(){
  const teams=visibleTeams();
  return '<div class="page-head"><div><h2>Equipos</h2><p>Plantillas y cuerpos técnicos de '+esc(state.club.name)+'.</p></div><button class="btn primary" data-action="new-team">＋ Añadir equipo</button></div><div class="team-grid">'+(teams.map(t=>'<article class="team-card"><div class="team-card-top"><span class="team-badge">⚽</span><div><h3>'+esc(t.name)+'</h3><p>'+esc(t.category)+' · '+t.modality+'</p></div></div><div class="team-meta"><span>'+esc(t.competition)+'</span><b>'+t.players+' jugadores</b></div><div class="muted" style="margin-top:9px">Entrenador/a: '+esc(t.coach)+'</div><button class="btn ghost team-config" data-action="edit-team" data-id="'+t.id+'">Configurar equipo →</button></article>').join("")||'<div class="panel empty">No hay equipos en esta modalidad.</div>')+'</div>';
 }
 function editorEquipo(){const t=state.teams.find(x=>x.id===UI.teamId);if(!t){UI.view="equipos";return equipos()}return '<div class="page-head"><div><h2>'+esc(t.name)+'</h2><p>Configura la información deportiva y organizativa de este equipo.</p></div><button class="btn ghost" data-action="back-teams">← Volver a equipos</button></div><form id="teamEditor" class="panel"><input type="hidden" name="id" value="'+esc(t.id)+'"><div class="form-grid"><div class="field"><label>Nombre del equipo</label><input name="name" required maxlength="60" value="'+esc(t.name)+'"></div><div class="field"><label>Categoría</label><input name="category" required maxlength="40" value="'+esc(t.category)+'"></div><div class="field"><label>Modalidad</label><select name="modality"><option value="F7" '+(t.modality==="F7"?"selected":"")+'>Fútbol 7</option><option value="F11" '+(t.modality==="F11"?"selected":"")+'>Fútbol 11</option></select></div><div class="field"><label>Competición</label><input name="competition" maxlength="80" value="'+esc(t.competition)+'"></div><div class="field"><label>Número de jugadores</label><input name="players" type="number" min="0" max="40" value="'+Number(t.players||0)+'"></div><div class="field"><label>Entrenador/a</label><input name="coach" maxlength="60" value="'+esc(t.coach)+'"></div></div><div class="editor-actions"><button type="button" class="btn ghost" data-action="back-teams">Cancelar</button><button type="submit" class="btn primary">Guardar equipo</button></div></form><div class="notice">Los cambios se guardan únicamente en este navegador dentro de esta demostración.</div>'}
 function directores(){
  return '<div class="page-head"><div><h2>Directores deportivos</h2><p>El club admite uno o dos directores. Ambos tienen exactamente los mismos permisos.</p></div>'+(state.directors.length<2?'<button class="btn primary" data-action="add-director">＋ Añadir segundo director</button>':'')+'</div><div class="director-grid">'+state.directors.map(d=>'<article class="director-card"><span class="avatar">'+esc(d.initials)+'</span><h3>'+esc(d.name)+'</h3><p>Director deportivo · Acceso completo al club</p><div class="permission">✓ Mismos permisos y capacidad de gestión</div><div class="field" style="margin-top:14px"><label>Modalidad preferida al entrar</label><select data-preferred="'+d.id+'"><option value="F7" '+(d.preferred==="F7"?"selected":"")+' >Fútbol 7</option><option value="F11" '+(d.preferred==="F11"?"selected":"")+' >Fútbol 11</option></select></div><button class="btn ghost" style="margin-top:12px;width:100%" data-action="switch-director" data-id="'+d.id+'">'+(state.activeDirector===d.id?"Director activo":"Cambiar a este director")+'</button></article>').join("")+'</div><div class="notice">La preferencia F7/F11 es individual. Cualquier director puede cambiar a la otra modalidad o consultar todo el club en cualquier momento.</div>';
 }
 function instalaciones(){
  return '<div class="page-head"><div><h2>Instalaciones</h2><p>Configura los campos físicos y si pueden dividirse para fútbol 7.</p></div><span class="tag amber">Configuración de demostración</span></div><section class="panel"><div class="panel-head"><div><h3>Campos disponibles</h3><span class="muted">Los cambios se guardan en este navegador.</span></div></div><div class="facility-row"><span><b>Campos de Fútbol 11</b><small>Instalaciones de dimensiones completas</small></span><div class="counter"><button data-count="f11" data-delta="-1">−</button><strong>'+state.facilities.f11+'</strong><button data-count="f11" data-delta="1">＋</button></div></div><div class="facility-row"><span><b>Campos de Fútbol 7 independientes</b><small>Campos que no proceden de dividir un F11</small></span><div class="counter"><button data-count="f7" data-delta="-1">−</button><strong>'+state.facilities.f7+'</strong><button data-count="f7" data-delta="1">＋</button></div></div><div class="notice"><b>Capacidad equivalente:</b> '+(state.facilities.f11*2+state.facilities.f7)+' campos F7 teóricos. Solo se podrán reservar dos partidos F7 en un mismo F11 si esa instalación es físicamente divisible y permite uso simultáneo.</div></section><section class="panel"><h3>Divisibilidad de campos F11</h3><p class="muted" style="margin:5px 0 12px">Evita reservar simultáneamente el campo completo y sus dos mitades.</p>'+Array.from({length:state.facilities.f11},(_,i)=>'<div class="facility-row"><span><b>Campo F11 · '+(i+1)+'</b><small>¿Se puede dividir en dos campos F7?</small></span><label><input type="checkbox" data-divisible="'+i+'" '+(state.facilities.divisible[i]?"checked":"")+'> Sí, es divisible</label></div>').join("")+'</section>';
 }
 function resourceList(modality){
  const out=[];
  for(let i=0;i<state.facilities.f11;i++){
   const id="f11-"+(i+1),div=!!state.facilities.divisible[i];
   if(modality==="F11")out.push({id:id,label:"Campo F11 · "+(i+1)});
   if(modality==="F7"&&div){out.push({id:id+"-a",label:"Campo F7 · F11 "+(i+1)+" (A)"});out.push({id:id+"-b",label:"Campo F7 · F11 "+(i+1)+" (B)"});}
  }
  if(modality==="F7")for(let i=0;i<state.facilities.f7;i++)out.push({id:"f7-"+(i+1),label:"Campo F7 independiente · "+(i+1)});
  return out;
 }
 const parentResource=id=>String(id||"").replace(/-[ab]$/,"");
 const resourcesConflict=(a,b)=>{if(a===b)return true;const pa=parentResource(a),pb=parentResource(b);if(pa!==pb)return false;return a===pa||b===pb;};
 const overlap=(a,b)=>{const a0=Number(a.time.slice(0,2))*60+Number(a.time.slice(3,5)),b0=Number(b.time.slice(0,2))*60+Number(b.time.slice(3,5));return a0<b0+Number(b.duration||90)&&b0<a0+Number(a.duration||90)};
 function conflicts(candidate,ignoreId){
  if(!candidate.home||!candidate.resource||!candidate.time)return [];
  return state.schedule.filter(m=>m.id!==ignoreId&&m.home&&m.date===candidate.date&&m.resource&&m.time&&resourcesConflict(m.resource,candidate.resource)&&overlap(candidate,m));
 }
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
  '<section class="panel"><div class="calendar-head"><div><h3>'+esc(fmtRange(start,end))+'</h3><span class="muted">Semana · '+weekEvents.length+' partidos</span></div><button class="btn ghost" data-action="print">Imprimir / guardar PDF</button></div><div class="week-grid">'+days.map(d=>{const key=dateKey(d),list=weekEvents.filter(m=>m.date===key);return '<div class="week-day '+(key===dateKey(new Date())?"today":"")+'"><b>'+esc(new Intl.DateTimeFormat("es-ES",{weekday:"short"}).format(d))+'</b><strong>'+d.getDate()+'</strong><small>'+list.length+' partidos</small></div>';}).join("")+'</div>'+
  '<div class="fixture-list">'+days.map(d=>{const list=weekEvents.filter(m=>m.date===dateKey(d));return '<div class="day-group"><h4>'+esc(fmt(d))+'</h4>'+(list.length?list.map(matchLabel).join(""):'<p class="muted">Sin partidos programados</p>')+'</div>';}).join("")+'</div></section>'+
  '<div class="two-col calendar-bottom"><section class="panel"><div class="panel-head"><div><h3>Partidos locales pendientes</h3><span class="muted">Asigna fecha, hora y campo</span></div><span class="tag amber">'+pending.length+' pendientes</span></div>'+(pending.length?pending.map(pendingRow).join(''):'<div class="notice">No hay partidos pendientes de asignación.</div>')+'</section>'+
  '<section class="panel"><h3>Añadir partido al calendario</h3><p class="muted" style="margin:5px 0 14px">Los partidos visitantes son informativos y no reservan instalaciones.</p><form id="matchForm" class="form-grid"><div class="field full"><label>Equipo</label><select name="teamId" required>'+teamOpts+'</select></div><div class="field"><label>Rival</label><input name="opponent" required maxlength="70" placeholder="Nombre del rival"></div><div class="field"><label>Fecha</label><input name="date" type="date" value="'+esc(state.calendarDate)+'" required></div><div class="field"><label>Hora</label><input name="time" type="time"></div><div class="field"><label>Local / visitante</label><select name="home"><option value="1">Local</option><option value="0">Visitante</option></select></div><div class="field"><label>Campo (solo local)</label><select name="resource"><option value="">Pendiente de asignar</option>'+resourceList(teamOf(state.teams[0].id).modality).map(r=>'<option value="'+r.id+'">'+esc(r.label)+'</option>').join("")+'</select></div><div class="field"><label>Duración</label><select name="duration"><option value="70">70 minutos</option><option value="80">80 minutos</option><option value="90" selected>90 minutos</option></select></div><div class="field full"><button class="btn primary" type="submit">＋ Añadir al calendario</button></div></form></section></div>';
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
 function comunicaciones(){
  const start=monday(parseDate(state.calendarDate)),end=addDays(start,6),events=state.schedule.filter(m=>m.date>=dateKey(start)&&m.date<=dateKey(end));
  return '<div class="page-head"><div><h2>Comunicaciones</h2><p>Prepara un aviso semanal para compartir con los entrenadores.</p></div><span class="tag green">Listo para WhatsApp</span></div><section class="panel"><div class="panel-head"><div><h3>Resumen semanal</h3><span class="muted">'+esc(fmtRange(start,end))+' · '+events.length+' partidos</span></div><button class="btn primary" data-action="copy-week">Copiar mensaje</button></div><pre class="message-preview">'+esc(weekMessage())+'</pre><div class="notice">El mensaje distingue partidos locales y visitantes, e indica claramente los horarios o campos pendientes. Solo contiene información deportiva del calendario.</div><div class="communication-actions"><button class="btn ghost" data-action="print">Imprimir / guardar PDF</button><button class="btn ghost" data-action="go" data-view="calendario">Editar calendario</button></div></section>';
 }
 function uniformCard(key,label){const u=state.uniforms[key];return '<section class="panel uniform-card"><h3>'+label+'</h3><p class="muted">Elige por separado el color de cada prenda. Ejemplo: camiseta roja, pantalón negro y medias rojas.</p><div class="form-grid"><div class="field"><label>Camiseta</label><input type="color" id="uniform-'+key+'-shirt" value="'+esc(u.shirt)+'"><small>Color de la parte superior.</small></div><div class="field"><label>Pantalón</label><input type="color" id="uniform-'+key+'-shorts" value="'+esc(u.shorts)+'"><small>Color del pantalón.</small></div><div class="field"><label>Medias</label><input type="color" id="uniform-'+key+'-socks" value="'+esc(u.socks)+'"><small>Color de las medias.</small></div></div><div class="kit-preview"><span style="background:'+esc(u.shirt)+'">Camiseta</span><span style="background:'+esc(u.shorts)+'">Pantalón</span><span style="background:'+esc(u.socks)+';color:#222">Medias</span></div></section>'}
 function avisos(){return '<div class="page-head"><div><h2>Avisos de actividad</h2><p>Tareas pendientes de los entrenadores.</p></div><span class="tag amber">'+state.notifications.filter(n=>n.status==="Pendiente").length+' pendientes</span></div><section class="panel"><div class="notice">Ejemplos ficticios de esta demostración. En la versión conectada, estos avisos se generarían a partir de la actividad real de los equipos.</div>'+state.notifications.map(n=>'<article class="notice-card"><div class="notice-head"><b>'+esc(n.title)+'</b><span class="tag amber">'+esc(n.status)+'</span></div><p><b>'+esc(n.team)+'</b> · Entrenador/a: '+esc(n.coach)+'</p><p>'+esc(n.detail)+'</p><small>'+esc(n.date)+'</small></article>').join('')+'</section>'}
 function ajustes(){return '<div class="page-head"><div><h2>Configuración inicial del club</h2><p>Identidad, datos territoriales y colores de las equipaciones.</p></div></div><section class="panel"><div class="form-grid"><div class="field"><label>Nombre del club</label><input id="clubName" value="'+esc(state.club.name)+'"></div><div class="field"><label>Municipio</label><input id="clubTown" value="'+esc(state.club.town)+'"></div><div class="field"><label>Provincia</label><input id="clubProvince" value="'+esc(state.club.province)+'"></div><div class="field"><label>Comunidad autónoma</label><input id="clubCommunity" value="'+esc(state.club.community)+'"></div><div class="field"><label>Temporada</label><input id="clubSeason" value="'+esc(state.club.season)+'"></div></div><div class="notice"><b>Ayuda:</b> selecciona el color de camiseta, pantalón y medias. Por ejemplo, una primera equipación puede ser camiseta azul, pantalón blanco y medias azules.</div><div style="display:flex;justify-content:flex-end;margin-top:15px"><button class="btn primary" data-action="save-club">Guardar cambios</button></div></section>'+uniformCard("first","Primera equipación") + uniformCard("second","Segunda equipación") + '<div class="notice">Los datos son ficticios y se guardan solo en este navegador.</div>'}
 const render=()=>{shell();const v=UI.view||"resumen";$("#pageTitle").textContent=viewTitles[v];$("#viewRoot").innerHTML=({resumen,equipos,equipo:editorEquipo,directores,instalaciones,calendario:calendar,comunicaciones,avisos,ajustes}[v]||resumen)();document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));};
 const UI={view:"resumen",teamId:null};
 document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-view]");if(nav){UI.view=nav.dataset.view;render();return}
  const mod=e.target.closest("[data-modality]");if(mod){state.modality=mod.dataset.modality;save();render();return}
  const a=e.target.closest("[data-action]");if(!a)return;
  const id=a.dataset.id;
  if(a.dataset.action==="go"){UI.view=a.dataset.view;render()}
  if(a.dataset.action==="edit-team"){UI.teamId=id;UI.view="equipo";render();return}
  if(a.dataset.action==="back-teams"){UI.view="equipos";render();return}
  if(a.dataset.action==="switch-director"){state.activeDirector=id;state.modality=active().preferred;save();render()}
  if(a.dataset.action==="add-director"&&state.directors.length<2){state.directors.push({id:"d2",name:"Marta León",initials:"ML",preferred:"F11"});save();render()}
  if(a.dataset.action==="new-team"){const name=prompt("Nombre del nuevo equipo (demo):");if(!name||!name.trim())return;const modality=confirm("Aceptar = Fútbol 7 · Cancelar = Fútbol 11")?"F7":"F11";state.teams.push({id:"t"+Date.now(),name:name.trim(),category:"Por definir",modality,competition:"Pendiente de asignar",players:0,coach:"Por asignar"});save();render()}
  if(a.dataset.action==="save-club"){["name","town","province","community","season"].forEach(k=>{const el=$("#club"+k[0].toUpperCase()+k.slice(1));if(el)state.club[k]=el.value.trim()});["first","second"].forEach(k=>["shirt","shorts","socks"].forEach(part=>{const el=$("#uniform-"+k+"-"+part);if(el)state.uniforms[k][part]=el.value}));save();render()}
  if(a.dataset.action==="week-prev"){state.calendarDate=dateKey(addDays(monday(parseDate(state.calendarDate)),-7));save();render()}
  if(a.dataset.action==="week-next"){state.calendarDate=dateKey(addDays(monday(parseDate(state.calendarDate)),7));save();render()}
  if(a.dataset.action==="week-today"){state.calendarDate=dateKey(new Date());save();render()}
  if(a.dataset.action==="publish"){const m=state.schedule.find(x=>x.id===id);if(m){const conflictsFound=conflicts(m,id);if(conflictsFound.length){alert("No se puede publicar: hay un solapamiento en la misma instalación.");return}m.status="published";save();render()}}
  if(a.dataset.action==="delete-match"){if(!confirm("¿Eliminar este partido de la demostración?"))return;state.schedule=state.schedule.filter(x=>x.id!==id);save();render()}
  if(a.dataset.action==="copy-week"){const msg=weekMessage();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(msg).then(()=>alert("Mensaje copiado. Ya puedes pegarlo en WhatsApp."),()=>prompt("Copia el mensaje:",msg))}else prompt("Copia el mensaje:",msg)}
  if(a.dataset.action==="print"){window.print()}
 });
 document.addEventListener("submit",e=>{
  if(e.target.id==="teamEditor"){e.preventDefault();const f=new FormData(e.target),t=state.teams.find(x=>x.id===f.get("id"));if(!t)return;t.name=String(f.get("name")||"").trim();t.category=String(f.get("category")||"").trim();t.modality=String(f.get("modality")||"F7");t.competition=String(f.get("competition")||"").trim();t.players=Math.max(0,Math.min(40,Number(f.get("players")||0)));t.coach=String(f.get("coach")||"").trim();save();UI.view="equipos";render();return}
  const assignmentId=e.target.dataset.assignId;
  if(assignmentId){e.preventDefault();const f=new FormData(e.target),m=state.schedule.find(x=>x.id===assignmentId);if(!m)return;const candidate={...m,date:f.get("date"),time:f.get("time"),resource:f.get("resource"),status:"proposed"};if(!candidate.date||!candidate.time||!candidate.resource){alert("Selecciona fecha, hora y campo.");return}if(conflicts(candidate,assignmentId).length){alert("Conflicto de instalación: ese campo o su campo completo ya está reservado en ese horario.");return}Object.assign(m,candidate);state.calendarDate=m.date;save();render();return}
  if(e.target.id!=="matchForm")return;e.preventDefault();
  const f=new FormData(e.target),team=teamOf(f.get("teamId")),home=f.get("home")==="1";
  const m={id:"m"+Date.now(),teamId:f.get("teamId"),opponent:String(f.get("opponent")||"").trim(),date:f.get("date"),time:f.get("time"),duration:Number(f.get("duration")||90),home,modality:team.modality,resource:home?String(f.get("resource")||""):"",status:"pending"};
  if(!m.opponent||!m.date){alert("Completa el rival y la fecha.");return}
  if(home&&m.resource&&m.time){const c=conflicts(m);if(c.length){alert("Conflicto de instalación: ese campo (o una de sus mitades) ya está reservado en ese horario. Elige otro campo u hora.");return}}
  if(home&&(!m.resource||!m.time))m.status="pending";else m.status="proposed";
  state.schedule.push(m);state.calendarDate=m.date;save();render();
 });
 document.addEventListener("change",e=>{
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
 $("#resetDemo").addEventListener("click",()=>{if(!confirm("¿Restablecer todos los datos ficticios del club?"))return;localStorage.removeItem(KEY);state=JSON.parse(JSON.stringify(seed));save();render()});
 save();render();
})();