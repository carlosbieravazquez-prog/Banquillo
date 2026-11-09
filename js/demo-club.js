/* Prototipo local aislado. No importa Auth, Cloud ni Supabase. */
(() => {
 const KEY="banquillo_demo_atletico_monteverde_v1";
 const seed={
  club:{name:"Atlético Monteverde CF",town:"Dos Hermanas",province:"Sevilla",community:"Andalucía",season:"2026/2027"},
  directors:[{id:"d1",name:"Daniel Romero",initials:"DR",preferred:"F7"},{id:"d2",name:"Marta León",initials:"ML",preferred:"F11"}],
  activeDirector:"d1",modality:"F7",facilities:{f11:2,f7:1,divisible:[true,true]},
  teams:[
   ["Prebenjamín A","Prebenjamín","F7","3.ª Andaluza","10","Sergio"],["Benjamín A","Benjamín","F7","3.ª Andaluza","12","Álvaro"],["Benjamín B","Benjamín","F7","4.ª Andaluza","11","Nerea"],
   ["Alevín A","Alevín","F7","2.ª Andaluza","14","Pablo"],["Alevín B","Alevín","F7","3.ª Andaluza","13","Lucía"],["Alevín C","Alevín","F7","4.ª Andaluza","12","Marcos"],["Alevín D","Alevín","F7","4.ª Andaluza","12","Irene"],
   ["Infantil A","Infantil","F11","2.ª Andaluza","17","Javier"],["Infantil B","Infantil","F11","3.ª Andaluza","16","Carmen"],
   ["Cadete A","Cadete","F11","1.ª Andaluza","18","David"],["Cadete B","Cadete","F11","3.ª Andaluza","17","Elena"],["Cadete C","Cadete","F11","4.ª Andaluza","16","Raúl"],
   ["Juvenil A","Juvenil","F11","Liga Nacional","20","Andrés"],["Juvenil B","Juvenil","F11","3.ª Andaluza","19","Sonia"],["Juvenil C","Juvenil","F11","4.ª Andaluza","18","Mario"]
  ].map((t,i)=>({id:"t"+(i+1),name:t[0],category:t[1],modality:t[2],competition:t[3],players:+t[4],coach:t[5]}))
 };
 let state;
 try{state=JSON.parse(localStorage.getItem(KEY))||seed}catch(e){state=seed}
 const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const visibleTeams=()=>state.modality==="todos"?state.teams:state.teams.filter(t=>t.modality===state.modality);
 const active=()=>state.directors.find(d=>d.id===state.activeDirector)||state.directors[0];
 const viewTitles={resumen:"Resumen del club",equipos:"Equipos del club",directores:"Directores deportivos",instalaciones:"Instalaciones",calendario:"Calendario del club",comunicaciones:"Comunicaciones",ajustes:"Ajustes del club"};
 function shell(){
  $("#sideClubName").textContent=state.club.name;$("#activeDirectorName").textContent=active().name;$("#teamCount").textContent=state.teams.length;
  document.querySelectorAll("[data-modality]").forEach(b=>b.classList.toggle("selected",b.dataset.modality===state.modality));
  $("#modalityNote").textContent=state.modality==="todos"?"Vista de todo el club": "Vista de equipos de "+(state.modality==="F7"?"Fútbol 7":"Fútbol 11");
 }
 function teamRows(teams){return teams.slice(0,6).map(t=>`<div class="team-row"><span class="team-icon">⚽</span><span><b>${esc(t.name)}</b><small>${esc(t.category)} · ${esc(t.competition)} · ${t.players} jugadores</small></span><span class="tag">${t.modality}</span></div>`).join("")||'<div class="empty">No hay equipos en esta modalidad.</div>'}
 function directorsMini(){return state.directors.map(d=>`<div class="director-mini"><span class="avatar">${esc(d.initials)}</span><span><b>${esc(d.name)}</b><small>Director deportivo · Vista preferida ${d.preferred}</small></span><em>MISMO NIVEL DE ACCESO</em></div>`).join("")}
 function resumen(){
  const teams=visibleTeams(),f7=state.teams.filter(t=>t.modality==="F7").length,f11=state.teams.filter(t=>t.modality==="F11").length;
  return `<div class="page-head"><div><h2>Hola, ${esc(active().name.split(" ")[0])} 👋</h2><p>Este es el estado general de tu club esta temporada.</p></div><button class="btn primary" data-action="go" data-view="equipos">Ver equipos →</button></div>
  <div class="stats"><article class="stat"><span class="stat-icon">⚽</span><div class="stat-label">Equipos del club</div><div class="stat-value">${state.teams.length}</div><div class="stat-foot">Todas las categorías</div></article><article class="stat"><span class="stat-icon">♙</span><div class="stat-label">Directores deportivos</div><div class="stat-value">${state.directors.length}/2</div><div class="stat-foot">Permisos idénticos</div></article><article class="stat"><span class="stat-icon">◫</span><div class="stat-label">Equipos Fútbol 7</div><div class="stat-value">${f7}</div><div class="stat-foot">Fútbol base</div></article><article class="stat"><span class="stat-icon">◧</span><div class="stat-label">Equipos Fútbol 11</div><div class="stat-value">${f11}</div><div class="stat-foot">Fútbol 11</div></article></div>
  <div class="two-col"><section class="panel"><div class="panel-head"><div><h3>Equipos del club</h3><span class="muted">${teams.length} en la vista actual</span></div><button class="btn ghost" data-action="go" data-view="equipos">Ver todos</button></div><div class="team-list">${teamRows(teams)}</div></section><section class="panel"><div class="panel-head"><div><h3>Dirección deportiva</h3><span class="muted">Acceso compartido a todo el club</span></div></div>${directorsMini()}<div class="notice">Los dos directores pueden gestionar cualquier equipo. La modalidad preferida solo cambia la vista inicial, nunca los permisos.</div></section></div>`;
 }
 function equipos(){
  const teams=visibleTeams();
  return `<div class="page-head"><div><h2>Equipos</h2><p>Plantillas y cuerpos técnicos de Atlético Monteverde CF.</p></div><button class="btn primary" data-action="new-team">＋ Añadir equipo</button></div><div class="team-grid">${teams.map(t=>`<article class="team-card"><div class="team-card-top"><span class="team-badge">⚽</span><div><h3>${esc(t.name)}</h3><p>${esc(t.category)} · ${t.modality}</p></div></div><div class="team-meta"><span>${esc(t.competition)}</span><b>${t.players} jugadores</b></div><div class="muted" style="margin-top:9px">Entrenador/a: ${esc(t.coach)}</div></article>`).join("")||'<div class="panel empty">No hay equipos en esta modalidad.</div>'}</div>`;
 }
 function directores(){
  return `<div class="page-head"><div><h2>Directores deportivos</h2><p>El club admite uno o dos directores. Ambos tienen exactamente los mismos permisos.</p></div>${state.directors.length<2?'<button class="btn primary" data-action="add-director">＋ Añadir segundo director</button>':''}</div><div class="director-grid">${state.directors.map(d=>`<article class="director-card"><span class="avatar">${esc(d.initials)}</span><h3>${esc(d.name)}</h3><p>Director deportivo · Acceso completo al club</p><div class="permission">✓ Mismos permisos y capacidad de gestión</div><div class="field" style="margin-top:14px"><label>Modalidad preferida al entrar</label><select data-preferred="${d.id}"><option value="F7" ${d.preferred==="F7"?"selected":""}>Fútbol 7</option><option value="F11" ${d.preferred==="F11"?"selected":""}>Fútbol 11</option></select></div><button class="btn ghost" style="margin-top:12px;width:100%" data-action="switch-director" data-id="${d.id}">${state.activeDirector===d.id?"Director activo":"Cambiar a este director"}</button></article>`).join("")}</div><div class="notice">La preferencia F7/F11 es individual. Cualquier director puede cambiar a la otra modalidad o consultar todo el club en cualquier momento.</div>`;
 }
 function instalaciones(){
  return `<div class="page-head"><div><h2>Instalaciones</h2><p>Configura los campos físicos y si pueden dividirse para fútbol 7.</p></div><span class="tag amber">Configuración de demostración</span></div><section class="panel"><div class="panel-head"><div><h3>Campos disponibles</h3><span class="muted">Los cambios se guardan en este navegador.</span></div></div><div class="facility-row"><span><b>Campos de Fútbol 11</b><small>Instalaciones de dimensiones completas</small></span><div class="counter"><button data-count="f11" data-delta="-1">−</button><strong>${state.facilities.f11}</strong><button data-count="f11" data-delta="1">＋</button></div></div><div class="facility-row"><span><b>Campos de Fútbol 7 independientes</b><small>Campos que no proceden de dividir un F11</small></span><div class="counter"><button data-count="f7" data-delta="-1">−</button><strong>${state.facilities.f7}</strong><button data-count="f7" data-delta="1">＋</button></div></div><div class="notice"><b>Capacidad equivalente:</b> ${state.facilities.f11*2+state.facilities.f7} campos F7 teóricos. Solo se podrán reservar dos partidos F7 en un mismo F11 si marcas que esa instalación es físicamente divisible y habilitada para uso simultáneo.</div></section><section class="panel"><h3>Divisibilidad de campos F11</h3><p class="muted" style="margin:5px 0 12px">Esta opción evita que el sistema sobre-reserve una instalación que no puede utilizarse simultáneamente.</p>${Array.from({length:state.facilities.f11},(_,i)=>`<div class="facility-row"><span><b>Campo F11 · ${i+1}</b><small>¿Se puede dividir en dos campos F7?</small></span><label><input type="checkbox" data-divisible="${i}" ${state.facilities.divisible[i]?"checked":""}> Sí, es divisible</label></div>`).join("")}</section>`;
 }
 function ajustes(){return `<div class="page-head"><div><h2>Ajustes del club</h2><p>Identidad y datos territoriales del club de demostración.</p></div></div><section class="panel"><div class="form-grid"><div class="field"><label>Nombre del club</label><input id="clubName" value="${esc(state.club.name)}"></div><div class="field"><label>Municipio</label><input id="clubTown" value="${esc(state.club.town)}"></div><div class="field"><label>Provincia</label><input id="clubProvince" value="${esc(state.club.province)}"></div><div class="field"><label>Comunidad autónoma</label><input id="clubCommunity" value="${esc(state.club.community)}"></div><div class="field"><label>Temporada</label><input id="clubSeason" value="${esc(state.club.season)}"></div></div><div style="display:flex;justify-content:flex-end;margin-top:15px"><button class="btn primary" data-action="save-club">Guardar cambios</button></div></section><div class="notice">Los datos del club son ficticios y cualquier modificación queda aislada en el almacenamiento local de este navegador.</div>`}
 function placeholder(v){return `<section class="panel empty"><div style="font-size:27px;margin-bottom:9px">🚧</div><h3>${v==="calendario"?"Calendario del club": "Comunicaciones"}</h3><p style="margin:7px 0 13px">Este módulo se desarrollará sobre la estructura de clubes, equipos y permisos que estamos preparando.</p><span class="tag">Siguiente fase de desarrollo</span></section>`}
 const render=()=>{shell();const v=UI.view||"resumen";$("#pageTitle").textContent=viewTitles[v];$("#viewRoot").innerHTML=({resumen,equipos,directores,instalaciones,ajustes}[v]||placeholder)(v);document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));};
 const UI={view:"resumen"};
 document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-view]");if(nav){UI.view=nav.dataset.view;render();return}
  const mod=e.target.closest("[data-modality]");if(mod){state.modality=mod.dataset.modality;save();render();return}
  const a=e.target.closest("[data-action]");if(!a)return;
  if(a.dataset.action==="go"){UI.view=a.dataset.view;render()}
  if(a.dataset.action==="switch-director"){state.activeDirector=a.dataset.id;state.modality=active().preferred;save();render()}
  if(a.dataset.action==="add-director"){if(state.directors.length<2){state.directors.push({id:"d2",name:"Marta León",initials:"ML",preferred:"F11"});save();render()}}
  if(a.dataset.action==="new-team"){const name=prompt("Nombre del nuevo equipo (demo):");if(!name||!name.trim())return;const modality=confirm("Aceptar = Fútbol 7 · Cancelar = Fútbol 11")?"F7":"F11";state.teams.push({id:"t"+Date.now(),name:name.trim(),category:"Por definir",modality,competition:"Pendiente de asignar",players:0,coach:"Por asignar"});save();render()}
  if(a.dataset.action==="save-club"){["name","town","province","community","season"].forEach(k=>{const el=$("#club"+k[0].toUpperCase()+k.slice(1));if(el)state.club[k]=el.value.trim()});save();render()}
 });
 document.addEventListener("change",e=>{
  const p=e.target.dataset.preferred;if(p){const d=state.directors.find(x=>x.id===p);if(d){d.preferred=e.target.value;save();render()} }
  if(e.target.dataset.divisible!==undefined){state.facilities.divisible[+e.target.dataset.divisible]=e.target.checked;save();render()}
 });
 document.addEventListener("click",e=>{const c=e.target.closest("[data-count]");if(!c)return;const k=c.dataset.count;state.facilities[k]=Math.max(0,Math.min(12,state.facilities[k]+Number(c.dataset.delta)));if(k==="f11")state.facilities.divisible.length=state.facilities.f11;save();render()});
 $("#resetDemo").addEventListener("click",()=>{if(!confirm("¿Restablecer todos los datos ficticios del club?"))return;localStorage.removeItem(KEY);state=JSON.parse(JSON.stringify(seed));save();render()});
 document.querySelectorAll("[data-modality]").forEach(b=>b.addEventListener("click",()=>{}));
 save();render();
})();