/* Banquillo Clubes Beta: datos reales de Supabase; sin datos simulados ni credenciales privilegiadas. */
(()=>{'use strict';
const $=s=>document.querySelector(s), E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.BQ_CONFIG||{}, root=$('#root'), status=$('#status');
let sb,uid,clubs=[],teams=[],selectedClub=null,selectedTeam=null,seasonList=[],seasonMembers=[],state={modality:'todos'};
const msg=(s,type='')=>{status.textContent=s;status.className=type};
const goodId=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
const fmt=n=>Number.isFinite(n)?n:0;
const call=async(q)=>{const {data,error}=await q;if(error)throw error;return data||[]};
const friendly=e=>/permission|row-level security|42501/i.test(e.message||'')?'No tienes permiso para esta operación.':/relation .* does not exist|42P01/i.test(e.message||'')?'La estructura de clubes aún no está activada en Supabase.':e.message||'No se pudo completar la operación';
function opt(list,selected){return list.map(x=>'<option value="'+E(x.id)+'" '+(x.id===selected?'selected':'')+'>'+E(x.name)+'</option>').join('')}
async function load(){clubs=await call(sb.from('banquillo_clubs').select('id,name,owner_id').order('name'));if(!clubs.some(c=>c.id===selectedClub))selectedClub=clubs[0]?.id||null;teams=selectedClub?await call(sb.from('banquillo_teams').select('id,club_id,name,modality,season_id').eq('club_id',selectedClub).order('name')):[];if(!teams.some(t=>t.id===selectedTeam&&(state.modality==='todos'||t.modality===state.modality)))selectedTeam=teams.find(t=>state.modality==='todos'||t.modality===state.modality)?.id||null;render()}
async function loadSeasons(){seasonList=await call(sb.from('season_members').select('season_id,role').eq('user_id',uid));}
function render(){let club=clubs.find(c=>c.id===selectedClub),team=teams.find(t=>t.id===selectedTeam);
const side=$('#sideClubName');if(side)side.textContent=club?.name||'Tu club';
const title=$('#pageTitle');if(title)title.textContent=club?'Panel de '+club.name:'Dirección deportiva';
root.innerHTML='<div class="row"><div><h1>Mis clubes</h1><p class="muted">Equipos y resultados reales · los permisos se comprueban en el servidor.</p></div></div>'+
'<div class="bq-summary" id="resumen"><section class="panel"><span>Equipos del club</span><b>'+teams.length+'</b><span>Plantillas organizadas</span></section><section class="panel"><span>Equipos Fútbol 7</span><b>'+teams.filter(t=>t.modality==="F7").length+'</b><span>Modalidad F7</span></section><section class="panel"><span>Equipos Fútbol 11</span><b>'+teams.filter(t=>t.modality==="F11").length+'</b><span>Modalidad F11</span></section></div><div class="layout"><aside class="stack"><section class="panel"><h2>Clubes</h2><div class="stack">'+clubs.map(c=>'<button class="team '+(c.id===selectedClub?'on':'')+'" data-club="'+E(c.id)+'">'+E(c.name)+'</button>').join('')+'</div><form id="newClub"><label>Nombre del nuevo club</label><input name="name" maxlength="120" minlength="2" required placeholder="Nombre del club"><p><button>Crear club</button></p></form><form id="joinClub"><label>Unirme como director con código</label><input name="code" minlength="32" maxlength="32" placeholder="Código de 32 caracteres" required><p><button class="secondary">Unirme a un club</button></p></form></section>'+(club?'<section class="panel" id="directores"><h2>Dirección deportiva</h2>Cargando miembros…</section>':'')+'</aside><div class="stack">'+
(!club?'<section class="panel"><h2>Crea tu primer club</h2><p>También puedes seguir gestionando un equipo individual en la aplicación principal.</p></section>':
'<section class="panel" id="equipos"><div class="row"><div><h2>Equipos del club</h2><p class="muted">'+teams.length+' equipos · '+E(club.name)+'</p></div><span class="bq-permission">'+E(club.owner_id===uid?'Propietario':'Director deportivo')+'</span></div><h3 class="bq-section-title">Filtrar modalidad</h3><div class="tabs">'+[['todos','Todos'],['F7','Fútbol 7'],['F11','Fútbol 11']].map(([id,label])=>'<button class="'+(state.modality===id?'on':'secondary')+'" data-filter="'+id+'">'+label+'</button>').join('')+'</div><div class="tabs">'+teams.filter(t=>state.modality==='todos'||t.modality===state.modality).map(t=>'<button class="'+(t.id===selectedTeam?'on':'')+'" data-team="'+E(t.id)+'">'+E(t.name)+' · '+E(t.modality)+'</button>').join('')+'</div><form id="newTeam"><div class="row"><div><label>Nuevo equipo</label><input name="name" placeholder="Ej. Benjamín A" required maxlength="100"></div><div><label>Modalidad</label><select name="modality"><option>F7</option><option>F11</option></select></div></div><p><button>Crear equipo</button></p></form></section>'+
(team?'<section class="panel" id="teamDetails"><div class="ux-team-heading"><span class="team-icon">⚽</span><span><b>'+E(team.name)+'</b><small>'+E(team.modality)+' · '+(team.season_id?'Temporada vinculada':'Temporada pendiente')+'</small></span></div><h3 class="bq-section-title">Cuerpo técnico</h3><div id="teamCoaches"></div><div id="teamStats"><p>Cargando resultados del equipo…</p></div>'+
'<div id="linkSeason"></div></section>':'<section class="panel">Selecciona o crea un equipo para ver su ficha.</section>'))+'</div></div>';
if(team)loadTeam(team).catch(e=>{msg(friendly(e),'error');$('#teamStats').textContent='No se pudieron recuperar las estadísticas.'});
if(club)loadDirectors(club).catch(e=>{const x=$('#clubDirectors');if(x)x.textContent=friendly(e)});
}
async function loadDirectors(club){
 const data=await call(sb.rpc('banquillo_list_directors',{p_club_id:club.id}));
 if(club.id!==selectedClub)return;const slot=$('#clubDirectors');if(!slot)return;
 let code='';if(club.owner_id===uid){const res=await sb.rpc('banquillo_club_code',{p_club_id:club.id,p_rotate:false});if(res.error)throw res.error;code=res.data||'';}
 slot.innerHTML='<h2>Dirección deportiva</h2><p class="muted">Hasta dos directores adicionales. Los permisos se controlan desde Supabase.</p>'+
 (data.length?data.map(x=>'<div class="row rank"><span>'+E(x.display_name)+'</span>'+(club.owner_id===uid?'<button class="secondary" data-remove-director="'+E(x.user_id)+'">Revocar</button>':'')+'</div>').join(''):'<p class="muted">Aún no hay directores adicionales.</p>')+
 (club.owner_id===uid?'<label>Código de invitación</label><input aria-label="Código de invitación" readonly value="'+E(code)+'"><p class="muted">Entrégalo únicamente al director autorizado. Revocar el código anterior no elimina miembros existentes.</p><div class="row"><button class="secondary" data-copy-code="'+E(code)+'">Copiar código</button><button class="secondary" data-rotate-code="'+E(club.id)+'">Renovar código</button></div>':'');
}
async function loadTeam(t){const el=$('#teamStats'), link=$('#linkSeason');if(!el||!link)return;
const allowed=seasonList.filter(x=>x.role==='owner');const current=allowed.some(x=>x.season_id===t.season_id);
if(!t.season_id){link.innerHTML='<h3>Conectar temporada</h3><p>Solo el propietario de una temporada puede vincularla. Los datos existentes se conservan.</p>'+(allowed.length?'<form id="linkForm"><select name="season_id">'+allowed.filter(x=>!teams.some(t2=>t2.season_id===x.season_id)).map(x=>'<option value="'+E(x.season_id)+'">'+E(x.season_id)+'</option>').join('')+'</select><p><button>Vincular mi temporada</button></p></form>':'<p class="muted">No tienes temporadas propias disponibles.</p>');el.innerHTML='<p class="muted">Sin temporada asociada. No se muestran cifras inventadas.</p>';return}
link.innerHTML='<p class="muted">Temporada vinculada: '+E(t.season_id)+'. Los datos deportivos se muestran únicamente a usuarios que sean miembros autorizados de esa temporada.</p>';
if(!seasonList.some(x=>x.season_id===t.season_id)){el.innerHTML='<p class="notice">Este director no es miembro de la temporada. Solicita acceso al responsable. La pertenencia al club no da acceso automático a datos de menores.</p>';return}
try{const members=await call(sb.rpc('season_members_list',{sid:t.season_id}));const e=$('#teamCoaches');if(e&&selectedTeam===t.id)e.innerHTML='<div class="cards">'+members.map(m=>'<div class="metric"><small>'+E(m.role==='owner'?'Responsable':'Entrenador')+'</small><strong style="font-size:16px">'+E(m.name||'Cuerpo técnico')+'</strong></div>').join('')+'</div>';}catch(e){/* Los datos del cuerpo técnico requieren autorización adicional. */}
const rows=await call(sb.from('docs').select('path,data').eq('season_id',t.season_id));
if(selectedTeam!==t.id)return;
const matches=rows.filter(r=>r.path.startsWith('seasons/'+t.season_id+'/matches/')).map(r=>r.data);
const players=rows.filter(r=>r.path.startsWith('seasons/'+t.season_id+'/players/')).map(r=>({...r.data,id:r.path.split('/').pop()})).filter(p=>p.active!==false);
const r=Calc.record(matches);
const now=Date.now();
const delayed=matches.filter(m=>!m.rest&&/^\d{4}-\d\d-\d\d$/.test(m.date||'')&&!Calc.matchInfo(m).played&&
   new Date(m.date+'T23:59:59').getTime()+48*3600000<now);
const pendingCall=matches.filter(m=>!m.rest&&/^\d{4}-\d\d-\d\d$/.test(m.date||'')&&
   !m.callDone&&(!Array.isArray(m.noCall)||!m.noCall.length)&&new Date(m.date+'T12:00:00').getTime()>now&&
   new Date(m.date+'T12:00:00').getTime()<now+7*86400000);
const noticeBox=(delayed.length||pendingCall.length)?'<section class="panel" id="avisos"><h3>Avisos pendientes del equipo</h3>'+
 delayed.map(m=>'<div class="notice">Acta pendiente · jornada '+E(m.n||'')+' · '+E(m.rival||'Rival')+' · '+E(m.date)+'</div>').join('')+
 pendingCall.map(m=>'<div class="notice">Revisar convocatoria · jornada '+E(m.n||'')+' · '+E(m.date)+'</div>').join('')+
 '<p class="muted">Avisos calculados al abrir el panel; todavía no se envían notificaciones automáticas.</p></section>':'';
const tiles=[['Partidos',r.pj],['Ganados',r.v],['Empatados',r.e],['Perdidos',r.d],['Goles a favor',r.gf],['Goles en contra',r.gc],['Diferencia',r.dg]];
const rank=(label,key,suffix)=>'<div class="panel"><h3>'+label+'</h3>'+players.map(p=>({p,s:Calc.playerStats(p.id,matches)})).sort((a,b)=>b.s[key]-a.s[key]).slice(0,5).map(z=>'<div class="rank"><span>'+E(z.p.name)+'</span><strong>'+fmt(z.s[key])+suffix+'</strong></div>').join('')+'</div>';
el.innerHTML='<h3 class="bq-section-title">Balance deportivo</h3><div class="metric-grid">'+tiles.map(([k,v])=>'<div class="metric">'+E(k)+'<strong>'+fmt(v)+'</strong></div>').join('')+'</div>'+noticeBox+'<h3 class="bq-section-title">Estadísticas de plantilla</h3><div class="cards">'+rank('Máximos goleadores','goals','')+rank('Más minutos','min',' min')+rank('Más convocatorias','conv','')+'</div><p class="muted">Resultados calculados de las actas guardadas. Los partidos futuros no cuentan.</p>';
}
document.addEventListener('click',async e=>{
 const copy=e.target.closest('[data-copy-code]');if(copy){try{await navigator.clipboard.writeText(copy.dataset.copyCode);msg('Código copiado.','ok')}catch(err){msg('Selecciona el código para copiarlo.','error')}return}
 const rotate=e.target.closest('[data-rotate-code]');if(rotate){if(!confirm('¿Renovar el código del club? El anterior dejará de funcionar.'))return;try{const {error}=await sb.rpc('banquillo_club_code',{p_club_id:rotate.dataset.rotateCode,p_rotate:true});if(error)throw error;await loadDirectors(clubs.find(c=>c.id===selectedClub));msg('Código renovado.','ok')}catch(err){msg(friendly(err),'error')}return}
 const remove=e.target.closest('[data-remove-director]');if(remove){if(!confirm('¿Revocar el acceso de este director al club?'))return;try{const {error}=await sb.rpc('banquillo_remove_director',{p_club_id:selectedClub,p_user_id:remove.dataset.removeDirector});if(error)throw error;await loadDirectors(clubs.find(c=>c.id===selectedClub));msg('Permiso de dirección deportiva revocado.','ok')}catch(err){msg(friendly(err),'error')}return}
});
document.addEventListener('click',e=>{const filter=e.target.closest('[data-filter]');if(filter){state.modality=filter.dataset.filter;const visible=teams.filter(t=>state.modality==='todos'||t.modality===state.modality);selectedTeam=visible[0]?.id||null;render();return}const c=e.target.closest('[data-club]');if(c){selectedClub=c.dataset.club;selectedTeam=null;load().catch(e=>msg(friendly(e),'error'))}const t=e.target.closest('[data-team]');if(t){selectedTeam=t.dataset.team;render()}});
document.addEventListener('submit',async e=>{if(!['newClub','newTeam','linkForm','joinClub'].includes(e.target.id))return;e.preventDefault();const form=e.target;const fd=new FormData(form);try{
if(form.id==='joinClub'){const code=String(fd.get('code')||'').trim().toLowerCase();const {data,error}=await sb.rpc('banquillo_join_club',{p_code:code});if(error)throw error;if(!data?.ok)throw Error(data?.error==='director_limit'?'Ya hay dos directores adicionales.':'Código no válido o no disponible.');selectedClub=data.club_id;}
if(form.id==='newClub'){const name=String(fd.get('name')||'').trim();if(name.length<2)throw Error('Introduce un nombre válido.');const c=await call(sb.from('banquillo_clubs').insert({name,owner_id:uid}).select('id').single());selectedClub=c.id;}
if(form.id==='newTeam'){const name=String(fd.get('name')||'').trim();if(name.length<2)throw Error('Introduce un nombre válido.');const t=await call(sb.from('banquillo_teams').insert({name,modality:fd.get('modality'),club_id:selectedClub}).select('id').single());selectedTeam=t.id;}
if(form.id==='linkForm'){const sid=String(fd.get('season_id')||'');if(!seasonList.some(x=>x.season_id===sid&&x.role==='owner'))throw Error('No eres propietario de esa temporada.');await call(sb.from('banquillo_teams').update({season_id:sid}).eq('id',selectedTeam));}
await load();msg('Cambios guardados correctamente.','ok');
}catch(err){msg(friendly(err),'error')}});
(async()=>{try{if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)throw Error('Falta la configuración pública de Supabase.');sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);const {data:{user},error}=await sb.auth.getUser();if(error||!user){msg('Inicia sesión primero desde Banquillo.');root.innerHTML='<p><a href="index.html">Entrar en Banquillo</a></p>';return}uid=user.id;await loadSeasons();await load();msg('Conectado a la base de datos real.','ok')}catch(e){msg(friendly(e),'error')}})();
})();