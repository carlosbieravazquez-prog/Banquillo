/* Banquillo: solicitudes reales de acceso a equipos, ligadas a auth.uid(). */
const TeamRequests=(()=>{
 "use strict";
 let cache=[],lastFetch=0,loading=false,lastUid=null,approvedSeen=new Set();
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const roles={head_coach:"Entrenador principal",assistant_coach:"Segundo entrenador",
 third_coach:"Tercer entrenador",delegate:"Delegado",other:"Otro"};
 async function fetch(force=false){
   const uid=Store.user?.uid;
   if(!uid||!Cloud?.sb)return;
   if(loading||(!force&&uid===lastUid&&Date.now()-lastFetch<17000))return;
   loading=true;
   try{
     const rows=await Cloud.rpc("banquillo_my_team_requests");
     if(Store.user?.uid!==uid)return;
     const previous=cache,changed=JSON.stringify(rows)!==JSON.stringify(cache)||uid!==lastUid;
     cache=rows||[];lastFetch=Date.now();lastUid=uid;
     const revoked=previous.filter(old=>old.status==="active"&&!cache.some(item=>
       item.team_id===old.team_id&&item.status==="active"));
     if(revoked.length){
       for(const old of revoked)approvedSeen.delete(old.team_id);
       await Store.loadRoles();
       for(const old of revoked){
         if(Store.sid===old.season_id&&!Store.roles[old.season_id]){
           Store.subscribeSeason(null);
           try{await Store.db.refreshNow("seasons");}catch(e){}
           toast("Dirección Deportiva ha retirado tu acceso al equipo. Los datos protegidos se han cerrado.","err");
         }
       }
     }
     for(const item of cache){
       if(item.status!=="active")approvedSeen.delete(item.team_id);
       const wasPending=previous.some(x=>x.team_id===item.team_id&&x.status==="pending");
       if(item.status==="active"&&item.season_id&&!approvedSeen.has(item.team_id)){
         approvedSeen.add(item.team_id);
         if(wasPending){
           try{
             await Store.afterJoin(item.season_id);
             toast("✅ Dirección Deportiva te ha aprobado como "+(roles[item.position]||"personal técnico")+".","ok");
           }catch(e){/* La temporada se cargará al volver a entrar. */}
         }
       }
     }
     if(changed&&typeof render==="function")render(true);
   }catch(e){/* No revelar información de otras cuentas ante errores de red. */}
   finally{loading=false;}
 }
 function panel(){
   if(!Store.user?.uid)return"";
   if(!lastFetch||lastUid!==Store.user.uid||Date.now()-lastFetch>18000)
     Promise.resolve().then(()=>fetch());
   const relevant=cache.filter(x=>x.status!=="active"||!Store.roles[x.season_id]);
   if(!relevant.length)return"";
   return '<section class="card bq-request-status"><div class="card-h"><h3>Mis solicitudes a equipos</h3></div>'+
    relevant.map(m=>'<article class="bq-request-row"><span class="bq-request-icon">'+(m.status==="pending"?"⏳":m.status==="active"?"✅":"✕")+'</span><div><b>'+esc(m.team_name)+' · '+esc(m.club_name)+'</b><small>'+
      (m.status==="pending"?"Pendiente de aprobación y de asignación de cargo por Dirección Deportiva":
       m.status==="active"?"Acceso autorizado: "+esc(roles[m.position]||m.role_detail||"Personal técnico")+". Recarga la página si aún no aparece.":
       "Solicitud rechazada. Pide un nuevo código de acceso al director.")+
     '</small></div></article>').join("")+'</section>';
 }
 if(typeof window!=="undefined"){
   window.setInterval(()=>{if(Store.user?.uid&&Auth?.state==="in")fetch(true);},20000);
   window.addEventListener("focus",()=>{if(Store.user?.uid)fetch(true);});
 }
 return {fetch,panel};
})();