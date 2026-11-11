/* Bandeja del entrenador: mensajes dirigidos únicamente a la temporada activa. */
const CoachInbox=(()=>{
 "use strict";
 let cache=[],sid=null,loading=false,lastFetch=0,uid=null;
 function reset(){cache=[];sid=null;lastFetch=0;uid=null;}
 function ensureIdentity(){
   const next=Store.user?.uid||null;
   if(uid!==next){reset();uid=next;}
   return next;
 }
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function fetch(s,force=false){
   const person=ensureIdentity();
   if(!s||!Cloud?.sb||!person||loading)return;
   if(!force&&s===sid&&Date.now()-lastFetch<20000)return;
   loading=true;
   try{
     const {data,error}=await Cloud.sb.from("banquillo_team_messages")
       .select("id,season_id,team_id,kind,title,body,match_n,created_at,read_at,resolved_at")
       .eq("recipient_id",Store.user.uid).eq("season_id",s)
       .is("resolved_at",null).order("created_at",{ascending:false}).limit(30);
     if(error)throw error;
     if(Store.sid!==s||Store.user?.uid!==person)return;
     const incoming=data||[];
     const different=s!==sid||JSON.stringify(cache.map(m=>[m.id,m.read_at,m.resolved_at]))!==
       JSON.stringify(incoming.map(m=>[m.id,m.read_at,m.resolved_at]));
     const newlyUnread= sid===s? incoming.filter(m=>!m.read_at&&!cache.some(old=>old.id===m.id)).length:0;
     sid=s;cache=incoming;lastFetch=Date.now();
     if(newlyUnread&&typeof toast==="function")toast("🔔 Tienes "+newlyUnread+" mensaje(s) nuevo(s) de Dirección Deportiva.","ok");
     if(different&&typeof render==="function")render(true);
   }catch(e){/* Sin acceso o sin conexión: no mostrar mensajes ajenos ni inventar avisos. */}
   finally{loading=false;}
 }
 function panel(){
   const person=ensureIdentity();
   if(!person)return"";
   const season=Store.sid;
   if(!season){sid=null;cache=[];return"";}
   if(sid!==season||Date.now()-lastFetch>=20000){
     Promise.resolve().then(()=>fetch(season));
   }
   if(sid!==season)return'<section class="card bq-inbox"><div class="card-h"><h3>Mensajes de Dirección Deportiva</h3></div><p class="muted">Comprobando mensajes de tu equipo…</p></section>';
   const unread=cache.filter(m=>!m.read_at).length;
   return'<section class="card bq-inbox"><div class="card-h"><h3>Mensajes de Dirección Deportiva</h3><span class="bq-inbox-pill">'+(unread?unread+" sin leer":"Al día")+'</span></div>'+
     (cache.length?'<div class="bq-inbox-list">'+cache.map(m=>'<article class="bq-coach-message '+(!m.read_at?'bq-unread':'')+'"><div><small>'+esc(new Date(m.created_at).toLocaleString("es-ES"))+(m.match_n?' · Jornada '+m.match_n:'')+'</small><b>'+esc(m.title)+'</b><p>'+esc(m.body)+'</p></div><button type="button" class="btn '+(!m.read_at?'primary':'ghost')+'" data-act="openCoachNotice" data-id="'+esc(m.id)+'">'+(m.match_n?'Abrir jornada '+m.match_n:!m.read_at?'Marcar leído':'Leído')+'</button></article>').join("")+'</div>':
       '<p class="muted">No tienes avisos pendientes de tu equipo.</p>')+
     '<p class="muted small">Los mensajes solo llegan a los entrenadores autorizados de esta temporada. No hay enlaces a WhatsApp.</p></section>';
 }
 async function open(el){
   const person=ensureIdentity();
   if(!person)return;
   const m=cache.find(x=>x.id===el.dataset.id);
   if(!m||m.season_id!==Store.sid)return;
   try{
     const {data,error}=await Cloud.sb.rpc("banquillo_mark_message_read",{p_message_id:m.id});
     if(error||!data)throw error||new Error("Acceso denegado");
     m.read_at=m.read_at||new Date().toISOString();
     if(m.match_n){
       go("partido",String(m.match_n));
       UI.matchTab=m.kind==="convocatoria"?"convocatoria":"ficha";
       render(true);
     }else render(true);
   }catch(e){toast("No se pudo abrir el aviso. Comprueba tu sesión.","err");}
 }
 if(typeof ACT!=="undefined")ACT.openCoachNotice=open;
 if(typeof window!=="undefined"){
   window.setInterval(()=>{if(Store.sid&&Store.user?.uid&&Auth?.state==="in")fetch(Store.sid,true);},20000);
   window.addEventListener("focus",()=>{if(Store.sid&&Store.user?.uid)fetch(Store.sid,true);});
 }
 return {panel,fetch,reset};
})();