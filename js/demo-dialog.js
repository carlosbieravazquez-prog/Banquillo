/* Cuadros de diálogo de Banquillo Demo. Sustituyen prompt/confirm/alert del navegador. */
const DemoDialog=(()=>{
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let root=null;
 function show(title,body,options={}){
   return new Promise(resolve=>{
     root=document.getElementById("bqDemoDialogRoot");
     if(!root){root=document.createElement("div");root.id="bqDemoDialogRoot";document.body.appendChild(root);}
     root.innerHTML='<div class="dd-overlay"><div class="dd-card" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><span>Banquillo · Demostración</span><h2>'+esc(title)+'</h2></header><div class="dd-content">'+body+'</div><footer><button type="button" class="btn ghost" data-dd-cancel>'+esc(options.cancel||"Cancelar")+'</button><button type="button" class="btn primary" data-dd-submit>'+esc(options.submit||"Aceptar")+'</button></footer></div></div>';
     const finish=v=>{root.innerHTML="";resolve(v);};
     const field=root.querySelector("input,textarea,select");
     if(field){field.focus();field.select?.();}
     root.querySelector("[data-dd-cancel]").addEventListener("click",()=>finish(null));
     root.querySelector("[data-dd-submit]").addEventListener("click",()=>finish(field?String(field.value||""):true));
     root.querySelector(".dd-overlay").addEventListener("click",e=>{if(e.target.classList.contains("dd-overlay"))finish(null);});
     root.querySelector(".dd-card").addEventListener("keydown",e=>{if(e.key==="Escape")finish(null);if(e.key==="Enter"&&field?.tagName!=="TEXTAREA"){e.preventDefault();root.querySelector("[data-dd-submit]").click();}});
   });
 }
 async function prompt(title,defaultValue="",kind="text"){return show(title,'<label class="dd-field">Introduce el dato<input type="'+kind+'" value="'+esc(defaultValue)+'" maxlength="120" autocomplete="off"></label>');}
 async function confirm(title){return (await show("Confirmar acción",'<p>'+esc(title)+'</p>'))===true;}
 async function alert(title){await show("Información",'<p>'+esc(title)+'</p>',{submit:"Entendido",cancel:"Cerrar"});}
 async function copy(title,content){
   try{await navigator.clipboard.writeText(String(content));await alert("Copiado al portapapeles.");}
   catch(e){await show(title,'<p>Selecciona y copia el contenido:</p><textarea readonly rows="7">'+esc(content)+'</textarea>',{submit:"Cerrar",cancel:"Volver"});}
 }
 async function team(){const name=await prompt("Nombre del nuevo equipo");if(name===null||!name.trim())return null;
   const selected=await show("Modalidad de fútbol",'<label class="dd-field">Modalidad<select><option value="F7">Fútbol 7</option><option value="F11">Fútbol 11</option></select></label>',{submit:"Crear equipo"});
   if(!selected)return null;
   return {name:name.trim().slice(0,60),modality:selected};
 }
 return {prompt,confirm,alert,copy,team};
})();