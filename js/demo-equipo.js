/* Demostración de entrenamiento: 18 jornadas, ida/vuelta, datos ficticios dependientes de fecha. */
(()=>{"use strict";
const $=q=>document.querySelector(q),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0"),dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=dateKey(new Date());
const teams={
 alevin:{name:"Alevín A",coach:"Sergio",category:"Alevín",modality:"F7",competition:"3.ª Andaluza",minutes:50,names:["Leo","Mario","Lucas","Hugo","Álvaro","Daniel","Mateo","Enzo","Pablo","Adrián","Iker","Marcos","Rubén","Santi","Iván"]},
 cadete:{name:"Cadete A",coach:"David",category:"Cadete",modality:"F11",competition:"2.ª Andaluza",minutes:90,names:["Antonio","Raúl","Javier","Sergio","Álvaro","Carlos","Gonzalo","Fernando","Manuel","José","Jorge","Luis","Víctor","Miguel","Pablo","David","Rubén","Héctor","Marcos","Daniel"]}
};
const rivals=["CD Estrella","UD Bellavista","San Roque","Atlético Sur","Náutico Sevilla","CD Libertad","Dos Hermanas CF","CD Portaceli","Deportivo Triana"];
let chosen="alevin",view="inicio";const t=()=>teams[chosen];
const fixtures=()=>Array.from({length:18},(_,i)=>{
 const date=new Date(2026,8,5+14*i),n=i+1,home=i%2===(chosen==="alevin"?0:1);
 const played=dateKey(date)<today;
 const gf=played?Math.max(0,(n*3+(chosen==="alevin"?2:1))%7):null;
 const ga=played?(n*2+(chosen==="alevin"?1:3))%5:null;
 return{n,date:dateKey(date),rival:rivals[i%9],home,played,gf,ga,result:!played?"":gf>ga?"V":gf<ga?"D":"E"};
});
const players=()=>{const count=fixtures().filter(x=>x.played).length;return t().names.map((name,i)=>{
 const called=Math.max(0,count-(i%5===0?1:0)-(i%8===0?1:0));
 const played=Math.max(0,called-(i%9===0?1:0));
 return{name,dorsal:i+1,calls:called,played,minutes:played*(t().minutes-(i%5)*6),goals:Math.max(0,Math.floor((played*(17-i%9))/31))};
});};
const fmt=d=>new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00"));
const badge=(label,num)=>'<article class="de-metric"><small>'+esc(label)+'</small><strong>'+num+'</strong></article>';
const row=m=>'<div class="de-match"><div><b>Jornada '+m.n+'</b><small>'+fmt(m.date)+'</small></div><div><b>'+(m.home?"🏠":"✈️")+' '+esc(m.rival)+'</b><small>'+(m.home?"Local":"Visitante")+'</small></div><strong>'+(m.played?m.gf+" – "+m.ga:"Por jugar")+'</strong></div>';
function top(list,key,label,suffix=""){const sorted=[...list].sort((a,b)=>b[key]-a[key]).slice(0,5),max=Math.max(1,...sorted.map(x=>x[key]));return'<section class="de-panel"><h3>'+label+'</h3>'+sorted.map(p=>'<div class="de-rank"><span>'+esc(p.name)+'</span><i><b style="width:'+Math.round(p[key]/max*100)+'%"></b></i><strong>'+p[key]+esc(suffix)+'</strong></div>').join("")+'</section>';}
function render(){const team=t(),matches=fixtures(),squad=players(),played=matches.filter(m=>m.played),win=played.filter(m=>m.result==="V").length,draw=played.filter(m=>m.result==="E").length,loss=played.filter(m=>m.result==="D").length, gf=played.reduce((v,m)=>v+m.gf,0),ga=played.reduce((v,m)=>v+m.ga,0);
const next=matches.find(m=>!m.played);$("#dateNow").textContent=new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());$("#nextOpp").textContent=next?(next.home?"🏠 ":"✈️ ")+next.rival:"Temporada completada";$("#nextDate").textContent=next?"Jornada "+next.n+" · "+fmt(next.date):"";
$("#demoTeamName").textContent=team.name;$("#demoCoach").textContent=team.coach;$("#demoHeading").textContent={inicio:"Inicio del equipo",partidos:"Partidos y convocatorias",plantilla:"Plantilla",entrenos:"Entrenamientos",informes:"Informes"}[view];
document.querySelectorAll("[data-demo-view]").forEach(b=>b.classList.toggle("active",b.dataset.demoView===view));document.querySelectorAll("[data-demo-team]").forEach(b=>b.classList.toggle("selected",b.dataset.demoTeam===chosen));
let body='<div class="de-lead"><div><span>ATLÉTICO MONTEVERDE CF · '+team.modality+'</span><h2>'+team.name+'</h2><p>'+team.category+' · '+team.competition+' · Temporada 2026/2027</p></div><span>DEMO · DATOS FICTICIOS</span></div>';
if(view==="inicio"){body+='<div class="de-metrics">'+badge("Partidos jugados",played.length)+badge("Victorias",win)+badge("Empates",draw)+badge("Derrotas",loss)+badge("Goles a favor",gf)+badge("Goles en contra",ga)+'</div><div class="de-columns"><section class="de-panel"><h3>Próximo partido</h3>'+(next?row(next):'<p>Temporada completada</p>')+'</section><section class="de-panel"><h3>Forma reciente</h3><div class="de-form">'+played.slice(-5).map(m=>'<span class="de-form-'+m.result+'">'+m.result+'</span>').join("")+'</div><p class="de-muted">Resultados simulados hasta hoy. Las jornadas futuras no tienen marcador.</p></section></div><div class="de-columns">'+top(squad,"goals","Máximos goleadores")+top(squad,"minutes","Minutos jugados"," min")+'</div>';}
if(view==="partidos"){body+='<div class="de-panel"><h3>Calendario completo · 18 jornadas</h3><p class="de-muted">9 rivales, ida y vuelta. Solo se han registrado resultados de los encuentros anteriores a hoy.</p>'+matches.map(row).join("")+'</div>';}
if(view==="plantilla"){body+='<section class="de-panel"><h3>Plantilla · '+squad.length+' jugadores</h3><div class="de-table-wrap"><table class="de-table"><thead><tr><th>Dorsal</th><th>Jugador</th><th>Goles</th><th>Minutos</th><th>Convocatorias</th></tr></thead><tbody>'+squad.map(p=>'<tr><td>'+p.dorsal+'</td><td>'+esc(p.name)+'</td><td>'+p.goals+'</td><td>'+p.minutes+'</td><td>'+p.calls+'</td></tr>').join("")+'</tbody></table></div></section>';}
if(view==="entrenos"){const dates=[];for(let date=new Date(2026,8,1);date<=new Date(2027,5,1);date.setDate(date.getDate()+1)){if([1,3].includes(date.getDay()))dates.push(new Date(date));}const done=dates.filter(d=>dateKey(d)<=today).length;body+='<div class="de-metrics">'+badge("Sesiones programadas",dates.length)+badge("Sesiones realizadas",done)+badge("Días de entrenamiento","L · X")+'</div><section class="de-panel"><h3>Plan de trabajo</h3><div class="de-work"><div><b>Septiembre – octubre</b><span>Control, pase y conducción. Técnica individual y finalización.</span></div><div><b>Noviembre – diciembre</b><span>Posesión por zonas, ocupación racional de espacios y superioridades.</span></div><div><b>Enero – marzo</b><span>Transiciones, presión coordinada y juego colectivo.</span></div><div><b>Abril – junio</b><span>Situaciones reales de competición y evaluación final.</span></div></div><p class="de-muted">Los entrenamientos posteriores a hoy permanecen planificados, no realizados.</p></section>';}
if(view==="informes"){body+='<div class="de-metrics">'+badge("Jugadores",squad.length)+badge("Convocatorias",squad.reduce((v,p)=>v+p.calls,0))+badge("Minutos acumulados",squad.reduce((v,p)=>v+p.minutes,0))+'</div><div class="de-columns">'+top(squad,"goals","Máximos goleadores")+top(squad,"calls","Más convocatorias")+'</div><section class="de-panel"><h3>Resumen deportivo</h3><p class="de-muted">Datos ficticios coherentes con los partidos simulados hasta la fecha. La aplicación real obtiene las estadísticas de las actas guardadas.</p></section>';}
$("#demoContent").innerHTML=body;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-demo-view]");if(b){view=b.dataset.demoView;render();return;}const c=e.target.closest("[data-demo-team]");if(c){chosen=c.dataset.demoTeam;render();}});
render();
})();