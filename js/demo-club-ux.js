/* Pantallas avanzadas de demostración. Sin Auth, Supabase ni mensajería automática. */
const DemoClubUX=(()=>{
 const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const pad=n=>String(n).padStart(2,"0");
 const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const dayFrom=s=>new Date(String(s||"").slice(0,10)+"T12:00:00");
 const oneDay=86400000;
 const randomCode=()=>{
   const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",out=[];
   const bytes=new Uint8Array(8);
   if(typeof crypto!=="undefined" && crypto.getRandomValues)crypto.getRandomValues(bytes);
   else for(let i=0;i<8;i++)bytes[i]=Math.floor(Math.random()*256);
   for(const b of bytes)out.push(alphabet[b%alphabet.length]);
   return out.slice(0,4).join("")+"-"+out.slice(4).join("");
 };
 const sampleNames=["Álex García","Leo Martín","Hugo Ruiz","Dani Romero","Marcos Vega","Pablo León","Iván Díaz","Adrián Torres","Nico Sánchez","Javi Moreno","Mateo Ortiz","Rubén Torres","Héctor Cano","Santiago Medina","Manuel Gómez","José Ruiz","Víctor Flores","Luis Pérez","Miguel Fernández","Enzo Romero","Daniel Díaz"];
 const leagueMatches=t=>Array.from({length:18},(_,i)=>{
   const seed=Number(String(t.id).replace(/\D/g,""))||1,day=new Date(2026,8,5+14*i);
   const date=dateKey(day),played=date<dateKey(new Date()),home=(i+seed)%2===0;
   const rivals=["CD Estrella","UD Bellavista","San Roque","Atlético Sur","Náutico Sevilla","CD Libertad","Dos Hermanas CF","CD Portaceli","Deportivo Triana"];
   const gf=played?(i*3+seed)%7:null,ga=played?(i*2+seed+3)%5:null;
   return {n:i+1,date,home,opponent:rivals[i%9],time:"11:30",played,gf,ga};
 });
 const makePlayers=t=>{
   const seed=Number(String(t.id).replace(/\D/g,""))||1,count=leagueMatches(t).filter(x=>x.played).length;
   const minutes=t.modality==="F11"?90:50;
   return Array.from({length:Math.min(22,Math.max(6,Number(t.players)||8))},(_,i)=>{
     const calls=Math.max(0,count-(i%6===0?1:0)-(i%9===0?1:0));
     const games=Math.max(0,calls-(i%7===0?1:0));
     return{id:"p"+i,name:sampleNames[(i+seed)%sampleNames.length],dorsal:i+1,
       goals:Math.max(0,Math.floor(games*(11+(i*3)%12)/35)),minutes:games*(minutes-i%4*5),
       calls,games};
   });
 };
 function init(state){
   if(!state.teamDemo||typeof state.teamDemo!=="object")state.teamDemo={};
   for(const t of state.teams||[]){
     if(!state.teamDemo[t.id])state.teamDemo[t.id]={
       code:randomCode(),coachStatus:t.coach==="Por asignar"?"vacant":"active",
       assistant:"",players:makePlayers(t),
       results:{won:4+(Number(t.id.replace(/\D/g,""))||1)%3,draw:1,lost:2,gf:22,ga:12}
     };
     if(!state.teamDemo[t.id].code)state.teamDemo[t.id].code=randomCode();
     const d=state.teamDemo[t.id],played=leagueMatches(t).filter(m=>m.played);
     const key=dateKey(new Date());
     if(d.statsCalculatedAt!==key){
       d.players=makePlayers(t);
       d.results={won:played.filter(m=>m.gf>m.ga).length,draw:played.filter(m=>m.gf===m.ga).length,
         lost:played.filter(m=>m.gf<m.ga).length,gf:played.reduce((n,m)=>n+m.gf,0),
         ga:played.reduce((n,m)=>n+m.ga,0)};
       d.statsCalculatedAt=key;
     }
   }
   if(!Array.isArray(state.notifications))state.notifications=[];
   if(!state.demoNoticesV2){
     const n1=state.notifications.find(n=>n.id==="n1"),n2=state.notifications.find(n=>n.id==="n2");
     if(n1 && n1.date==="14/11/2026")n1.date="04/11/2026";
     if(n2 && n2.date==="13/11/2026")n2.date="05/11/2026";
     if(!state.notifications.some(n=>n.id==="n3"))state.notifications.push({
       id:"n3",team:"Prebenjamín A",coach:"Sergio",title:"Tres jornadas sin convocar",
       detail:"Un jugador ficticio lleva tres jornadas sin aparecer en convocatorias. Consulta el motivo si consideras necesario intervenir.",
       date:"03/11/2026",status:"Aviso",priority:"secondary",type:"selection"
     });
     state.demoNoticesV2=true;
   }
   for(const n of state.notifications){
     if(!n.priority)n.priority=n.type==="selection"?"secondary":/partido sin cerrar/i.test(n.title)?"high":"normal";
     if(!n.type)n.type=/partido sin cerrar/i.test(n.title)?"match":/convocatoria/i.test(n.title)?"callup":"selection";
   }
 }
 const details=(state,t)=>{init(state);return state.teamDemo[t.id];};
 const badges=labels=>labels.map(([label,value,tone])=>'<div class="ux-metric '+(tone||"")+'"><span>'+escape(label)+'</span><b>'+escape(value)+'</b></div>').join("");
 function headerTeam(t,d){
   return '<div class="ux-team-header"><div class="ux-team-symbol">⚽</div><div><strong>'+escape(t.name)+'</strong><span>'+escape(t.category)+' · '+escape(t.modality)+' · '+escape(t.competition)+'</span></div>'+
     '<div class="ux-team-coaches"><span>ENTRENADOR PRINCIPAL</span><b>'+escape(d.coachStatus==="active"?t.coach:"Sin asignar")+'</b>'+
     (d.assistant?'<small>Segundo entrenador · '+escape(d.assistant)+'</small>':"")+'</div></div>';
 }
 function rankings(data,key,label,suffix){
   const ordered=[...(data.players||[])].sort((a,b)=>b[key]-a[key]).slice(0,5);
   const max=Math.max(1,...ordered.map(p=>p[key]));
   return '<section class="ux-box"><div class="ux-box-title"><h3>'+escape(label)+'</h3><span>Datos ficticios</span></div><div class="ux-rank">'+ordered.map((p,i)=>
     '<div class="ux-rank-line"><span class="ux-rank-index">'+(i+1)+'</span><span class="ux-rank-name">'+escape(p.name)+'</span>'+
     '<span class="ux-rank-track"><i style="width:'+Math.round(100*p[key]/max)+'%"></i></span><b>'+p[key]+escape(suffix)+'</b></div>').join("")+'</div></section>';
 }
 function overview(state,t){
   const d=details(state,t),r=d.results;
   const won=Number(r.won)||0,draw=Number(r.draw)||0,lost=Number(r.lost)||0,gf=Number(r.gf)||0,ga=Number(r.ga)||0;
   const count=won+draw+lost;
   const matchList=leagueMatches(t).filter(m=>!m.played).slice(0,4);
   return '<div class="ux-demo-hint">Vista demostrativa: liga ficticia de 18 jornadas, ida y vuelta. Los resultados están rellenados hasta la fecha actual.</div>'+
     '<section class="ux-sport-strip">'+badges([["Partidos",count],["Victorias",won,"success"],["Empates",draw],["Derrotas",lost,"warning"],["Goles a favor",gf],["Goles en contra",ga],["Diferencia", (gf-ga>0?"+":"")+(gf-ga),gf>=ga?"success":"warning"]])+'</section>'+
     '<div class="ux-two-col">'+rankings(d,"goals","Máximos goleadores"," goles")+rankings(d,"minutes","Jugadores con más minutos"," min")+'</div>'+
     '<div class="ux-two-col">'+rankings(d,"calls","Más convocatorias"," /"+count)+
      '<section class="ux-box"><div class="ux-box-title"><h3>Próximos partidos</h3><span>Calendario</span></div>'+
      (matchList.length?matchList.map(m=>'<div class="ux-fixture"><span>'+escape(m.date)+'</span><b>'+escape(m.opponent)+'</b><small>'+(m.home?"🏠 Casa":"✈️ Fuera")+' · '+escape(m.time||"Hora por asignar")+'</small></div>').join(""):'<p class="muted">Todavía no hay partidos asociados a este equipo.</p>')+
      '</section></div>';
 }
 function playerTable(state,t){
   const d=details(state,t),count=leagueMatches(t).filter(x=>x.played).length;
   return '<section class="ux-box"><div class="ux-box-title"><h3>Comparativa de plantilla</h3><span>Ejemplo editable en una futura conexión con actas reales</span></div><div class="ux-table-wrap"><table class="ux-data-table"><thead><tr><th>Jugador</th><th>Dorsal</th><th>Goles</th><th>Minutos</th><th>Convocatorias</th></tr></thead><tbody>'+
    d.players.map(p=>'<tr><td>'+escape(p.name)+'</td><td>'+p.dorsal+'</td><td>'+p.goals+'</td><td>'+p.minutes+'</td><td>'+p.calls+' /'+count+'</td></tr>').join("")+
    '</tbody></table></div></section>';
 }
 function codePanel(state,t){
   const d=details(state,t);
   return '<section class="ux-box"><div class="ux-box-title"><h3>Compartir código de equipo</h3><span>Solo demostración</span></div>'+
    '<p>Un código diferente para cada equipo; al renovarlo, el anterior deja de ser válido dentro de esta demo.</p>'+
    '<div class="ux-team-code"><span>CÓDIGO SIMULADO · '+escape(t.name)+'</span><strong>'+escape(d.code)+'</strong></div>'+
    '<div class="ux-actions"><button type="button" class="btn primary" data-action="demo-copy-code">Copiar código</button>'+
    '<button type="button" class="btn ghost" data-action="demo-rotate-code">Renovar código</button></div>'+
    '<p class="ux-caution">Este código no permite registrarse en Banquillo ni da acceso real. La gestión segura de códigos pertenece a la versión conectada.</p></section>';
 }
 function coachesPanel(state,t){
   const d=details(state,t);
   return '<section class="ux-box"><div class="ux-box-title"><h3>Cuerpo técnico</h3><span>'+escape(t.name)+'</span></div>'+
    '<div class="ux-person"><span class="ux-person-avatar">DT</span><div><strong>'+escape(d.coachStatus==="active"?t.coach:"Vacante")+'</strong><small>Entrenador principal</small></div><span class="ux-pill '+(d.coachStatus==="active"?"good":"")+'">'+(d.coachStatus==="active"?"Activo":"Sin asignar")+'</span></div>'+
    (d.assistant?'<div class="ux-person"><span class="ux-person-avatar">2º</span><div><strong>'+escape(d.assistant)+'</strong><small>Segundo entrenador</small></div></div>':"")+
    '<p class="ux-caution">El cuerpo técnico de esta demostración es ficticio. En la versión oficial las cuentas se incorporan por código, son aprobadas por Dirección Deportiva y reciben un cargo desde sus perfiles verificados. No se pueden crear entrenadores escribiendo nombres.</p></section>';
 }
 function teamTabs(tab){
   return '<div class="ux-tabs" role="navigation" aria-label="Secciones del equipo">'+[
     ["overview","Resumen deportivo"],["players","Estadísticas"],["coaches","Entrenadores"],["settings","Configuración"],["code","Código del equipo"]
   ].map(([id,label])=>'<button type="button" class="'+(tab===id?"on":"")+'" data-action="demo-team-tab" data-tab="'+id+'">'+label+'</button>').join("")+'</div>';
 }
 const dateOfNotice=n=>{
   if(typeof n.date==="string"&&/^\d\d\/\d\d\/\d{4}$/.test(n.date)){
     const [dd,mm,yyyy]=n.date.split("/");
     return new Date(yyyy+"-"+mm+"-"+dd+"T19:00:00").getTime();
   }
   const value=Date.parse(n.occurredAt||n.date||"");
   return Number.isFinite(value)?value:Date.now();
 };
 const isEligible=(n,when=Date.now())=>when>=dateOfNotice(n)+48*3600000;
 function visibleNotices(state){
   init(state);
   return state.notifications.filter(n=>{
     if(n.archived||n.resolvedAt||!isEligible(n))return false;
     const t=state.teams.find(t=>t.name===n.team);
     return state.modality==="todos"||t?.modality===state.modality;
   });
 }
 const pendingCount=state=>visibleNotices(state).filter(n=>n.priority!=="secondary").length;
 const daysFrom=(date,when=Date.now())=>Math.max(0,Math.floor((when-Number(date||0))/oneDay));
 const noticeText=(state,n)=>{
   const name=state.directors.find(d=>d.id===state.activeDirector)?.name||"Dirección Deportiva";
   let title=n.title||"Tarea pendiente";
   return "⚠️ AVISO DE DIRECCIÓN DEPORTIVA\n"+name+" · "+state.club.name+
     "\nEquipo: "+n.team+"\nPara: "+n.coach+"\n"+title+
     "\n"+n.detail+"\nRevisa esta tarea en Banquillo. Gracias.";
 };
 function noticeList(state){
   const notifications=visibleNotices(state);
   const top=notifications.filter(n=>n.priority!=="secondary"),secondary=notifications.filter(n=>n.priority==="secondary");
   const noticeCard=n=>{
     const ready=n.ignoredAt&&daysFrom(n.ignoredAt)>=7&&!n.reminderPrepared;
     const tone=n.priority==="secondary"?"low":"high";
     return '<article class="ux-notice '+tone+'" data-notice-id="'+escape(n.id)+'"><div class="ux-notice-head"><span class="ux-pill '+tone+'">'+(tone==="high"?"Prioritario":"Seguimiento opcional")+'</span>'+
       '<small>'+escape(n.team)+' · '+escape(n.coach)+'</small></div><h3>'+escape(n.title)+'</h3><p>'+escape(n.detail)+'</p>'+
       '<div class="ux-notice-footer"><small>Disponible tras 48 h · '+escape(n.date||"")+'</small>'+
       '<div class="ux-actions"><button type="button" class="btn primary" data-action="demo-send-notice" data-id="'+escape(n.id)+'">Preparar aviso</button>'+
       '<button type="button" class="btn ghost" data-action="demo-ignore-notice" data-id="'+escape(n.id)+'">'+(n.ignoredAt?"Ignorado":"Ignorar 7 días")+'</button>'+
       '<button type="button" class="btn ghost" data-action="demo-resolve-notice" data-id="'+escape(n.id)+'">Marcar resuelto</button></div></div>'+
       (ready?'<p class="ux-reminder">Han pasado 7 días desde que se ignoró: recordatorio único pendiente de preparar. No enviado automáticamente en esta demo.</p>':"")+
       (n.reminderPrepared?'<p class="ux-reminder">Recordatorio ya preparado una vez. No se repetirá.</p>':"")+
       '</article>';
   };
   return '<div class="ux-demo-hint">Alertas ficticias para la presentación. En esta demo no existe entrega automática a entrenadores; «Preparar aviso» simula una notificación local. La versión oficial dispone de mensajería privada por equipo.</div>'+
     '<div class="ux-alert-summary">'+badges([["Prioritarios",top.length,"warning"],["Secundarios",secondary.length],["Ámbito",state.modality==="todos"?"Todo el club":state.modality]])+'</div>'+
     '<section class="ux-box"><div class="ux-box-title"><h3>Requieren atención</h3><span>Se muestran a partir de 48 horas del evento</span></div>'+
     (top.length?top.map(noticeCard).join(""):'<div class="ux-empty">No hay avisos prioritarios pendientes para este ámbito.</div>')+'</section>'+
     '<section class="ux-box"><div class="ux-box-title"><h3>Seguimiento secundario</h3><span>Consultar cuando sea necesario</span></div>'+
     (secondary.length?secondary.map(noticeCard).join(""):'<div class="ux-empty">Sin observaciones secundarias.</div>')+'</section>';
 }
 function monthCells(state,year,month,selected,interactive=true){
   const first=new Date(year,month,1),offset=(first.getDay()+6)%7;
   const cells=[],max=new Date(year,month+1,0).getDate();
   const names=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
   const today=dateKey(new Date());
   for(let i=0;i<Math.ceil((offset+max)/7)*7;i++){
     const n=i-offset+1;
     if(n<1||n>max){cells.push('<div class="ux-month-day muted-day" aria-hidden="true"></div>');continue;}
     const key=dateKey(new Date(year,month,n));
     const events=state.schedule.filter(m=>m.date===key);
     const listing=events.slice(0,3).map(m=>{
       const t=state.teams.find(x=>x.id===m.teamId);
       return '<span class="ux-month-event '+(m.home?"home":"away")+'">'+(m.home?"⌂ ":"✈ ")+escape(t?.name||"Equipo")+'</span>';
     }).join("");
     const inner='<strong>'+n+'</strong>'+listing+(events.length>3?'<small>+'+(events.length-3)+' partidos</small>':"");
     cells.push(interactive?'<button type="button" class="ux-month-day '+(selected===key?"selected ":"")+(today===key?"today":"")+'" data-action="demo-pick-day" data-date="'+key+'">'+inner+'</button>':
       '<div class="ux-month-day '+(today===key?"today":"")+'">'+inner+'</div>');
   }
   return '<div class="ux-month-grid">'+names.map(name=>'<span class="ux-month-weekday">'+name+'</span>').join("")+cells.join("")+'</div>';
 }
 function monthView(state){
   const current=dayFrom(state.calendarDate),year=current.getFullYear(),month=current.getMonth();
   const selected=state.calendarDate;
   const monthLabel=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(current);
   const dayEvents=state.schedule.filter(m=>m.date===selected);
   const weekStart=new Date(current);weekStart.setDate(current.getDate()-(current.getDay()+6)%7);
   const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
   const weekEvents=state.schedule.filter(m=>m.date>=dateKey(weekStart)&&m.date<=dateKey(weekEnd));
   const weekHome=weekEvents.filter(m=>m.home),weekAway=weekEvents.filter(m=>!m.home);
   const list=events=>events.map(m=>{
     const t=state.teams.find(t=>t.id===m.teamId);
     return '<div class="ux-week-team"><b>'+escape(t?.name||"Equipo")+'</b><small>'+escape(m.opponent||"Rival pendiente")+'</small><span>'+escape(m.date.slice(8))+'/'+escape(m.date.slice(5,7))+' · '+escape(m.time||"Hora pendiente")+'</span></div>';
   }).join("");
   return '<div class="page-head"><div><h2>Planificador mensual</h2><p>Selecciona un día. A la derecha verás quién juega en casa o fuera esta semana.</p></div>'+
     '<div class="ux-actions"><button class="btn ghost" type="button" data-action="demo-week-view">Vista semanal</button>'+
     '<button class="btn primary" type="button" data-action="demo-print-month">Descargar calendario horizontal</button></div></div>'+
     '<div class="ux-calendar-tools"><div><h3>'+escape(monthLabel)+'</h3><p>Partidos programados · '+state.club.name+'</p></div>'+
     '<div><button type="button" class="btn ghost" data-action="demo-month-prev" aria-label="Mes anterior">←</button> <button type="button" class="btn ghost" data-action="demo-month-next" aria-label="Mes siguiente">→</button></div></div>'+
     '<div class="ux-planner-layout"><section class="ux-box ux-month-box">'+monthCells(state,year,month,selected)+'</section>'+
     '<aside class="ux-planner-side"><section class="ux-box"><h3>Semana seleccionada</h3><p class="muted">'+escape(dateKey(weekStart))+' al '+escape(dateKey(weekEnd))+'</p>'+
     '<div class="ux-side-title">⌂ Juegan en casa · '+weekHome.length+'</div>'+ (weekHome.length?list(weekHome):'<p class="muted">Sin partidos locales.</p>')+
     '<div class="ux-side-title">✈ Juegan fuera · '+weekAway.length+'</div>'+ (weekAway.length?list(weekAway):'<p class="muted">Sin partidos visitantes.</p>')+'</section>'+
     '<section class="ux-box"><h3>'+escape(selected)+'</h3><p>Partidos del día: <b>'+dayEvents.length+'</b></p>'+
     (dayEvents.length?list(dayEvents):'<p class="muted">Día libre. Puedes asignar un encuentro desde la vista semanal.</p>')+
     '<button type="button" class="btn primary" data-action="demo-week-view">Organizar horarios y campos</button></section></aside></div>';
 }
 function printCalendar(state){
   const day=dayFrom(state.calendarDate),name=new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(day);
   const crest=typeof ClubCrest!=="undefined"?ClubCrest.current({settings:{crest:state.club.crest}}):"";
   return '<div class="ux-print-content"><header class="ux-print-head">'+
     (crest?'<img alt="Escudo" src="'+escape(crest)+'">':'<span class="ux-print-mark">⚽</span>')+
     '<div><small>PLANIFICACIÓN DE PARTIDOS</small><h1>'+escape(state.club.name)+'</h1><p>'+escape(name.toUpperCase())+' · '+escape(state.club.season)+'</p></div></header>'+
     '<div class="ux-print-legend"><span>⌂ Local</span><span>✈ Visitante</span><span>● Hora pendiente</span></div>'+
     monthCells(state,day.getFullYear(),day.getMonth(),null,false)+
     '<p class="ux-print-foot">Calendario de demostración · Generado en Banquillo · Las horas sin confirmar aparecen como pendientes.</p></div>';
 }
 return {init,details,headerTeam,teamTabs,overview,playerTable,codePanel,coachesPanel,visibleNotices,pendingCount,noticeList,noticeText,monthView,printCalendar,randomCode,isEligible};
})();
if(typeof module!=="undefined")module.exports=DemoClubUX;
