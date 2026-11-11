/* Banquillo Clubes Beta: datos reales de Supabase; sin datos simulados ni credenciales privilegiadas. */
(()=>{'use strict';
const $=s=>document.querySelector(s), E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.BQ_CONFIG||{}, root=$('#root'), status=$('#status');
let sb,uid,clubs=[],teams=[],selectedClub=null,selectedTeam=null,seasonList=[],seasonMembers=[],state={};
const msg=(s,type='')=>{status.textContent=s;status.className=type};
const goodId=s=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
const fmt=n=>Number.isFinite(n)?n:0;
const call=async(q)=>{const {data,error}=await q;if(error)throw error;return data||[]};
const friendly=e=>/permission|row-level security|42501/i.test(e.message||'')?'No tienes permiso para esta operación.':/relation .* does not exist|42P01/i.test(e.message||'')?'La estructura de clubes aún no está activada en Supabase.':e.message||'No se pudo completar la operación';
function opt(list,selected){return list.map(x=>'<option value="'+E(x.id)+'" '+(x.id===selected?'selected':'')+'>'+E(x.name)+'</option>').join('')}
async function load(){clubs=await call(sb.from('banquillo_clubs').select('id,name,owner_id').order('name'));if(!clubs.some(c=>c.id===selectedClub))selectedClub=clubs[0]?.id||null;teams=selectedClub?await call(sb.from('banquillo_teams').select('id,club_id,name,modality,season_id').eq('club_id',selectedClub).order('name')):[];if(!teams.some(t=>t.id===selectedTeam))selectedTeam=teams[0]?.id||null;render()}
async function loadSeasons(){seasonList=await call(sb.from('season_members').select('season_id,role').eq('user_id',uid));}
function render(){let club=clubs.find(c=>c.id===selectedClub),team=teams.find(t=>t.id===selectedTeam);
root.innerHTML='<div class="row"><div><h1>Mis clubes</h1><p class="muted">Equipos y resultados reales · los permisos se comprueban en el servidor.</p></div></div>'+
'<div class="layout"><aside class="stack"><section class="panel"><h2>Clubes</h2><div class="stack">'+clubs.map(c=>'<button class="team '+(c.id===selectedClub?'on':'')+'" data-club="'+E(c.id)+'">'+E(c.name)+'</button>').join('')+'</div><form id="newClub"><label>Nombre del nuevo club</label><input name="name" maxlength="120" minlength="2" required placeholder="Nombre del club"><p><button>Crear club</button></p></form></section></aside><div class="stack">'+
(!club?'<section class="panel"><h2>Crea tu primer club</h2><p>También puedes seguir gestionando un equipo individual en la aplicación principal.</p></section>':
'<section class="panel"><div class="row"><div><h2>'+E(club.name)+'</h2><p class="muted">'+teams.length+' equipos · dirección deportiva</p></div><span>'+E(club.owner_id===uid?'Propietario':'Director')+'</span></div><h3>Equipos</h3><div class="tabs">'+teams.map(t=>'<button class="'+(t.id===selectedTeam?'on':'')+'" data-team="'+E(t.id)+'">'+E(t.name)+' · '+E(t.modality)+'</button>').join('')+'</div><form id="newTeam"><div class="row"><div><label>Nuevo equipo</label><input name="name" placeholder="Ej. Benjamín A" required maxlength="100"></div><div><label>Modalidad</label><select name="modality"><option>F7</option><option>F11</option></select></div></div><p><button>Crear equipo</button></p></form></section>'+
(team?'<section class="panel"><h2>'+E(team.name)+'</h2><p class="muted">Categoría '+E(team.modality)+'</p><div id="teamStats"><p>Cargando resultados del equipo…</p></div>'+
'<div id="linkSeason"></div></section>':'<section class="panel">Selecciona o crea un equipo para ver su ficha.</section>'))+'</div></div>';
if(team)loadTeam(team).catch(e=>{msg(friendly(e),'error');$('#teamStats').textContent='No se pudieron recuperar las estadísticas.'});
}
async function loadTeam(t){const el=$('#teamStats'), link=$('#linkSeason');if(!el||!link)return;
const allowed=seasonList.filter(x=>x.role==='owner');const current=allowed.some(x=>x.season_id===t.season_id);
if(!t.season_id){link.innerHTML='<h3>Conectar temporada</h3><p>Solo el propietario de una temporada puede vincularla. Los datos existentes se conservan.</p>'+(allowed.length?'<form id="linkForm"><select name="season_id">'+allowed.filter(x=>!teams.some(t2=>t2.season_id===x.season_id)).map(x=>'<option value="'+E(x.season_id)+'">'+E(x.season_id)+'</option>').join('')+'</select><p><button>Vincular mi temporada</button></p></form>':'<p class="muted">No tienes temporadas propias disponibles.</p>');el.innerHTML='<p class="muted">Sin temporada asociada. No se muestran cifras inventadas.</p>';return}
link.innerHTML='<p class="muted">Temporada vinculada: '+E(t.season_id)+'. Los datos deportivos se muestran únicamente a usuarios que sean miembros autorizados de esa temporada.</p>';
if(!seasonList.some(x=>x.season_id===t.season_id)){el.innerHTML='<p class="notice">Este director no es miembro de la temporada. Solicita acceso al responsable. La pertenencia al club no da acceso automático a datos de menores.</p>';return}
const rows=await call(sb.from('docs').select('path,data').eq('season_id',t.season_id));
if(selectedTeam!==t.id)return;
const matches=rows.filter(r=>r.path.startsWith('seasons/'+t.season_id+'/matches/')).map(r=>r.data);
const players=rows.filter(r=>r.path.startsWith('seasons/'+t.season_id+'/players/')).map(r=>({...r.data,id:r.path.split('/').pop()})).filter(p=>p.active!==false);
const r=Calc.record(matches);
const tiles=[['Partidos',r.pj],['Ganados',r.v],['Empatados',r.e],['Perdidos',r.d],['Goles a favor',r.gf],['Goles en contra',r.gc],['Diferencia',r.dg]];
const rank=(label,key,suffix)=>'<div class="panel"><h3>'+label+'</h3>'+players.map(p=>({p,s:Calc.playerStats(p.id,matches)})).sort((a,b)=>b.s[key]-a.s[key]).slice(0,5).map(z=>'<div class="rank"><span>'+E(z.p.name)+'</span><strong>'+fmt(z.s[key])+suffix+'</strong></div>').join('')+'</div>';
el.innerHTML='<div class="metric-grid">'+tiles.map(([k,v])=>'<div class="metric">'+E(k)+'<strong>'+fmt(v)+'</strong></div>').join('')+'</div><h3>Estadísticas de plantilla</h3><div class="cards">'+rank('Máximos goleadores','goals','')+rank('Más minutos','min',' min')+rank('Más convocatorias','conv','')+'</div><p class="muted">Resultados calculados de las actas guardadas. Los partidos futuros no cuentan.</p>';
}
document.addEventListener('click',e=>{const c=e.target.closest('[data-club]');if(c){selectedClub=c.dataset.club;selectedTeam=null;load().catch(e=>msg(friendly(e),'error'))}const t=e.target.closest('[data-team]');if(t){selectedTeam=t.dataset.team;render()}});
document.addEventListener('submit',async e=>{if(!['newClub','newTeam','linkForm'].includes(e.target.id))return;e.preventDefault();const form=e.target;const fd=new FormData(form);try{
if(form.id==='newClub'){const name=String(fd.get('name')||'').trim();if(name.length<2)throw Error('Introduce un nombre válido.');const c=await call(sb.from('banquillo_clubs').insert({name,owner_id:uid}).select('id').single());selectedClub=c.id;}
if(form.id==='newTeam'){const name=String(fd.get('name')||'').trim();if(name.length<2)throw Error('Introduce un nombre válido.');const t=await call(sb.from('banquillo_teams').insert({name,modality:fd.get('modality'),club_id:selectedClub}).select('id').single());selectedTeam=t.id;}
if(form.id==='linkForm'){const sid=String(fd.get('season_id')||'');if(!seasonList.some(x=>x.season_id===sid&&x.role==='owner'))throw Error('No eres propietario de esa temporada.');await call(sb.from('banquillo_teams').update({season_id:sid}).eq('id',selectedTeam));}
await load();msg('Cambios guardados correctamente.','ok');
}catch(err){msg(friendly(err),'error')}});
(async()=>{try{if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)throw Error('Falta la configuración pública de Supabase.');sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);const {data:{user},error}=await sb.auth.getUser();if(error||!user){msg('Inicia sesión primero desde Banquillo.');root.innerHTML='<p><a href="index.html">Entrar en Banquillo</a></p>';return}uid=user.id;await loadSeasons();await load();msg('Conectado a la base de datos real.','ok')}catch(e){msg(friendly(e),'error')}})();
})();