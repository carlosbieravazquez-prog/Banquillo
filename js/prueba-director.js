(()=>{"use strict";
const $=id=>document.getElementById(id),cfg=window.BQ_CONFIG||{};
const sb=window.supabase?.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const CLUB="Atlético Monteverde CF · PRUEBA",YEAR="2026/2027";
const show=(id,value)=>$(id).classList.toggle("hide",!value);
const status=(msg,kind="")=>{$("status").textContent=msg;$("status").className="status "+kind;};
let me=null,clubId=null,existingTeams=[];
const teams=[
 {name:"Alevín A",modality:"F7",category:"Alevín",competition:"3.ª Andaluza (ficticia)",count:15,minutes:50,shift:0},
 {name:"Cadete A",modality:"F11",category:"Cadete",competition:"2.ª Andaluza (ficticia)",count:20,minutes:90,shift:1}
];
const prettyCode=c=>/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(String(c||""))?c.slice(0,4)+"-"+c.slice(4):String(c||"");
const names=["Álex","Hugo","Leo","Mateo","Martín","Pablo","Daniel","Javi","Lucas","Rubén","Iván","Enzo","Adrián","Mario","Iker","Sergio","Marcos","Nico","David","Luis"];
const rivals=["CD Estrella","UD Bellavista","San Roque","Atlético Sur","Náutico Sevilla","CD Libertad","Dos Hermanas CF","CD Portaceli","Deportivo Triana"];
const dateKey=d=>d.toISOString().slice(0,10);
const asDate=n=>new Date(Date.UTC(2026,8,5+14*n));
const today=dateKey(new Date());
const reportErr=e=>String(e?.message||e||"Error desconocido").replace(/insufficient_management_whistles/,"No tienes suficientes silbatos de gestión (se necesitan 10).").replace(/active_club_exists/,"Esta cuenta ya tiene un club activo; usa una cuenta nueva para la prueba.").replace(/team_limit/,"Se alcanzó el límite de equipos del club.");
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
async function rpc(name,args){const {data,error}=await sb.rpc(name,args||{});if(error)throw error;return data;}
async function query(q){const {data,error}=await q;if(error)throw error;return data;}
function progress(i,total,text){
 show("progress",true);$("progressFill").style.width=Math.min(100,Math.round(i/total*100))+"%";$("progressText").textContent=text;
}
async function inspect(){
 if(!sb){status("Falta Supabase. Recarga esta página.","err");return;}
 try{
 const user=await currentUser();
 me=user;show("loginPanel",!user);show("accountPanel",!!user);
 if(!user){status("Inicia sesión con la Cuenta 2 para configurar el entorno de pruebas.","warn");return;}
 $("accountEmail").textContent="Usuario: "+(user.email||"Cuenta registrada");
 const clubs=await query(sb.from("banquillo_clubs").select("id,name,owner_id").limit(25));
 const sample=clubs.find(x=>x.name===CLUB&&x.owner_id===user.id);
 if(sample){clubId=sample.id;$("accountState").textContent="Club de prueba vinculado a esta cuenta.";status("Entorno encontrado. Puedes completar la configuración o consultar sus códigos.","ok");show("preparePanel",true);show("readyPanel",true);await showTeamCodes();$("prepareButton").textContent="Completar o comprobar el club de prueba";return;}
 if(clubs.length){show("preparePanel",false);show("readyPanel",false);$("accountState").textContent="Esta cuenta ya tiene un club asignado.";status("Para no modificar clubes que ya estés utilizando, abre esta página con una cuenta nueva y sin clubes.","warn");return;}
 if(!user.email_confirmed_at){status("Confirma el correo de esta cuenta antes de crear el club.","warn");show("preparePanel",false);return;}
 show("preparePanel",true);show("readyPanel",false);$("accountState").textContent="Cuenta 2 vacía, preparada para crear el club.";
 status("Cuenta 2 conectada. Marca la casilla y prepara el club de prueba.","ok");
 }catch(e){status("Error al preparar el entorno: "+reportErr(e),"err");}
}
function seedRows(sid,t){
 const roster=Array.from({length:t.count},(_,i)=>({
   id:"p"+(i+1),name:names[(i+t.shift*3)%names.length]+" "+String.fromCharCode(65+(i%20))+".",
   dorsal:i+1,order:i,active:true,notes:"Jugador ficticio para la demostración de Banquillo."
 }));
 const docs=roster.map(p=>({season_id:sid,path:"seasons/"+sid+"/players/"+p.id,
   data:{name:p.name,dorsal:p.dorsal,order:p.order,active:true,notes:p.notes}}));
 for(let i=0;i<18;i++){
   const played=dateKey(asDate(i))<today;
   const home=i<9?i%2===t.shift:i%2!==t.shift;
   const gf=played?(i*3+2+t.shift)%6:null;
   const ga=played?(i*2+1+t.shift)%4:null;
   const used=roster.filter((p,index)=>(index+i)%t.count>=2);
   const line={};
   if(played){
     const starters=t.modality==="F11"?11:7;
     used.forEach((p,j)=>{line[p.id]={role:j<starters?"T":"S",min:j<starters?t.minutes-((j+i)%3)*5:Math.max(10,t.minutes-25),gk:p.id==="p1"};});
   }
   const scorers=played?Array.from({length:gf},(_,j)=>used[(i+j*2+2)%used.length].id):[];
   const data={n:i+1,date:dateKey(asDate(i)),rival:rivals[i%9],home,
     rest:false,notes:"Encuentro ficticio de presentación.",callDone:played,
     noCall:played?roster.filter(p=>!used.includes(p)).map(p=>({p:p.id,m:"DT"})):[],
     players:line,scorers};
   if(played){data.ourGoals=gf;data.rivalGoals=ga;}
   docs.push({season_id:sid,path:"seasons/"+sid+"/matches/m"+(i+1),data});
 }
 docs.push({season_id:sid,path:"seasons/"+sid+"/training/main",data:{
  absences:{},skipped:[],extra:[],notes:"Entrenamientos de lunes y miércoles. Datos de presentación."
 }});
 return docs;
}
async function seedTeam(t,step,total){
 let existing=existingTeams.find(x=>x.name===t.name);
 if(!existing){
   const r=await rpc("banquillo_create_club_team",{p_club_id:clubId,p_name:t.name,
     p_modality:t.modality,p_category:t.category,p_competition:t.competition});
   if(!r?.ok)throw Error("No se ha podido crear "+t.name);
   existing={id:r.team_id,name:t.name,season_id:r.season_id};
   existingTeams.push(existing);
 }
 const sid=existing.season_id||await rpc("banquillo_provision_team_season",{p_team_id:existing.id});
 progress(step,total,"Preparando "+t.name+" · plantilla y resultados desde septiembre…");
 const done=await query(sb.from("docs").select("path").eq("season_id",sid).limit(120));
 const paths=new Set(done.map(x=>x.path));
 const rows=seedRows(sid,t).filter(x=>!paths.has(x.path));
 for(let i=0;i<rows.length;i+=25){
   await query(sb.from("docs").upsert(rows.slice(i,i+25),{onConflict:"season_id,path"}));
 }
 return sid;
}
async function setup(e){
 e.preventDefault();if(!me||!me.email_confirmed_at)return status("Antes de continuar, inicia sesión y confirma el correo de la Cuenta 2.","err");
 const btn=$("prepareButton");btn.disabled=true;show("progress",true);
 try{
 progress(0,4,"Comprobando club de prueba…");
 if(!clubId)clubId=await rpc("banquillo_create_club",{p_name:CLUB,p_season:YEAR});
 progress(1,4,"Configurando instalaciones de ejemplo…");
 await query(sb.from("banquillo_club_settings").upsert({club_id:clubId,town:"Dos Hermanas",
 province:"Sevilla",community:"Andalucía",fields_f11:1,fields_f7:1},{onConflict:"club_id"}));
 existingTeams=await query(sb.from("banquillo_teams").select("id,name,season_id").eq("club_id",clubId));
 await seedTeam(teams[0],2,4);
 await seedTeam(teams[1],3,4);
 progress(4,4,"Club preparado. Ya puedes consultar los códigos de los dos equipos.");
 show("readyPanel",true);await showTeamCodes();
 status("✓ Club de presentación creado en tu Cuenta 2, con resultados ficticios desde septiembre. Ya puedes probar el emparejamiento real.","ok");
 $("accountState").textContent="Director titular del club de presentación · temporada 2026/2027.";
 btn.textContent="Comprobar o completar datos de ejemplo";
 }catch(e){status("No se ha completado la preparación: "+reportErr(e)+". Puedes pulsar de nuevo para retomar sin duplicar equipos.","err");}
 finally{btn.disabled=false;}
}
function makeCodeNode(parent,label,code,description){
 const row=document.createElement("div");row.className="code-row";
 const heading=document.createElement("strong");heading.textContent=label;row.append(heading);
 if(description){const p=document.createElement("small");p.textContent=description;row.append(p);}
 const box=document.createElement("div");box.className="code";
 const text=document.createElement("code");text.textContent=prettyCode(code);box.append(text);
 const b=document.createElement("button");b.type="button";b.textContent="Copiar";
 b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(code);b.textContent="Copiado ✓";}catch(e){text.textContent=code;b.textContent="Selecciona el código";}});
 box.append(b);row.append(box);parent.append(row);
}
async function showTeamCodes(){
 if(!clubId)return;
 try{
 const rows=await query(sb.from("banquillo_teams").select("id,name,season_id").eq("club_id",clubId).is("archived_at",null).order("name"));
 const container=$("teamCodes");container.replaceChildren();
 if(!rows.length){container.textContent="Aún no se han preparado equipos. Pulsa «Completar club de prueba».";return;}
 for(const row of rows){
  const code=await rpc("banquillo_team_code",{p_team_id:row.id,p_rotate:false});
  makeCodeNode(container,row.name,code,"Para enviar una solicitud de entrenador en este equipo.");
 }
 }catch(e){status("No se pudieron consultar los códigos: "+reportErr(e),"err");}
}
async function invite(){
 const btn=$("generateDirectorCode");btn.disabled=true;
 try{
 const data=await rpc("banquillo_director_invite",{p_club_id:clubId,p_rotate:true});
 if(!data?.available){status("El club ya tiene dos directores. No hay otra plaza disponible.","warn");return;}
 const div=$("directorCode");div.replaceChildren();show("directorCode",true);
 const when=new Date(data.expires_at).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
 makeCodeNode(div,"Segundo director deportivo",data.code,"Un solo uso · caduca a las "+when);
 status("Código temporal generado. Copia el código y utilízalo desde la Cuenta 1 antes de que caduque.","ok");
 }catch(e){status("No se pudo generar el código: "+reportErr(e),"err");}
 finally{btn.disabled=false;}
}
$("prepareForm").addEventListener("submit",setup);
$("generateDirectorCode").addEventListener("click",invite);
$("logout").addEventListener("click",async()=>{try{await sb.auth.signOut({scope:"local"});location.reload();}catch(e){status(reportErr(e),"err");}});
inspect();
})();