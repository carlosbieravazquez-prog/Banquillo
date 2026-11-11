(()=>{"use strict";
const $=id=>document.getElementById(id);
const cfg=window.BQ_CONFIG||{};
const sb=window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const show=(id,v)=>$(id).classList.toggle("hide",!v);
const status=(msg,kind="")=>{$("status").textContent=msg;$("status").className="status "+kind;};
let me=null;
async function currentUser(){
 const {data:sessionData,error:sessionError}=await sb.auth.getSession();
 if(sessionError){
   if(/auth session missing/i.test(String(sessionError.message||"")))return null;
   throw sessionError;
 }
 if(!sessionData?.session)return null;
 const {data:userData,error:userError}=await sb.auth.getUser();
 if(userError){
   if(/auth session missing/i.test(String(userError.message||"")))return null;
   throw userError;
 }
 return userData?.user||null;
}
async function rpc(name,args){const{data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
async function boot(){
 if(!sb){status("No se ha podido cargar Supabase. Recarga la página.","err");return;}
 try{
 const user=await currentUser();
 me=user;show("loginPanel",!user);show("accountPanel",!!user);show("joinPanel",!!user);
 if(!user){status("Para la Cuenta 1, inicia sesión con un usuario nuevo y sin equipos.","warn");return;}
 $("accountEmail").textContent="Sesión iniciada: "+(user.email||"Cuenta registrada");
 const [{data:clubs,error:clubsError},{data:members,error:membersError},pending]=await Promise.all([
 sb.from("banquillo_clubs").select("id,name").limit(10),
 sb.from("season_members").select("season_id,role").eq("user_id",user.id).limit(10),
 rpc("banquillo_my_team_requests").catch(()=>[])
 ]);
 if(clubsError)throw clubsError;if(membersError)throw membersError;
 const n=(clubs||[]).length,m=(members||[]).length,p=(pending||[]).filter(x=>x.status==="pending").length;
 $("accountState").textContent=n===0&&m===0&&p===0?"✓ Cuenta sin clubes ni equipos vinculados":
 "Cuenta con "+n+" club(es) visible(s), "+m+" temporada(s) y "+p+" solicitud(es) pendiente(s).";
 status(n===0&&m===0?"Cuenta 1 preparada para recibir un código.":"Esta cuenta ya tiene relaciones: puedes probar el emparejamiento, pero no es una cuenta vacía.",n===0&&m===0?"ok":"warn");
 }catch(e){status("Error al comprobar la cuenta: "+String(e.message||e),"err");}
}
function normalize(code){return String(code||"").trim().toLowerCase().replace(/[\s-]/g,"");}
async function join(e,type){
 e.preventDefault();const btn=e.currentTarget.querySelector("button");btn.disabled=true;
 const code=normalize(new FormData(e.currentTarget).get("code"));
 try{
 if(!/^(?:[abcdefghjkmnpqrstuvwxyz23456789]{8}|[a-f0-9]{32})$/.test(code))throw Error("Introduce los 8 caracteres del código. Puedes separar los bloques con un guion.");
 const answer=type==="director"?await rpc("banquillo_join_club",{p_code:code}):
 await rpc("banquillo_join_team",{p_code:code});
 if(!answer?.ok){const msg={too_many_attempts:"Se han introducido varios códigos incorrectos de este tipo. Espera 10 minutos y vuelve a probar.",invalid_or_expired_code:"El código ha caducado o ya ha sido usado.",director_limit:"El club ya tiene dos directores.",email_not_verified:"Primero verifica tu correo electrónico.",invalid_or_inactive_code:"Código de equipo incorrecto o inactivo.",invalid_code:"Código incorrecto."}[answer?.error]||"No se pudo realizar la solicitud ("+(answer?.error||"sin detalle")+").";throw Error(msg);}
 if(type==="director"){status("✓ Acceso de Dirección Deportiva concedido a tu cuenta real. Ya puedes abrir el club.","ok");$("accountState").textContent="Director deportivo autorizado.";const a=document.createElement("a");a.href="clubes.html";a.className="btn";a.textContent="Abrir Dirección Deportiva";$("accountPanel").querySelector(".actions").prepend(a);}
 else {status(answer.status==="pending"?"✓ Solicitud registrada para "+answer.team_name+". La Cuenta 2 debe aprobarte y asignarte el cargo en Entrenadores.":"✓ Ya tienes acceso a "+answer.team_name+".", "ok");$("accountState").textContent=answer.status==="pending"?"Pendiente de aprobación del director.":"Acceso de entrenador autorizado.";}
 }catch(e){status("No se ha completado: "+String(e.message||e),"err");}
 finally{btn.disabled=false;}
}
$("joinDirector").addEventListener("submit",e=>join(e,"director"));
$("joinTeam").addEventListener("submit",e=>join(e,"team"));
$("logout").addEventListener("click",async()=>{try{await sb.auth.signOut({scope:"local"});location.reload();}catch(e){status(String(e.message||e),"err");}});
boot();
})();