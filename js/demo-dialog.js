/* Cuadros de diálogo de Banquillo Demo. Sustituyen prompt/confirm/alert del navegador. */
const DemoDialog=(()=>{
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let root=null;
 function show(title,body,options={}){
   return new Promise(resolve=>{
     root=document.getElementById("bqDemoDialogRoot");
     if(!root){root=document.createElement("div");root.id="bqDemoDialogRoot";document.body.appendChild(root);}
     root.innerHTML='<div class="dd-overlay"><div class="dd-card" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><span>Banquillo · Demostración</span><h2>'+esc(title)+'</h2></header><div class="dd-content">'+body+'</div><footer><button type="button" class="btn ghost" data-dd-cancel>'+esc(options.cancel||"Cancelar")+'</button><button type="button" class="btn primary" data-dd-submit>'+esc(options.submit||"Aceptar")+'</button></footer></div></div>';
     let finished=false;const finish=v=>{if(finished)return;finished=true;root.innerHTML="";resolve(v);};
     const field=root.querySelector("input,textarea,select");
     if(field){field.focus();if(field.type!=="file")field.select?.();}
     root.querySelector("[data-dd-cancel]").addEventListener("click",()=>finish(null));
     root.querySelector("[data-dd-submit]").addEventListener("click",()=>{if(options.file){const selected=root.querySelector('input[type="file"]')?.files?.[0];if(!selected){const info=root.querySelector("[data-dd-error]");if(info)info.textContent="Selecciona primero un archivo .json.";return;}finish(selected);return;}const many=[...root.querySelectorAll("[data-dd-field]")];if(many.length)finish(Object.fromEntries(many.map(x=>[x.dataset.ddField,String(x.value||"")])));else finish(field?String(field.value||""):true);});
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
 async function pickJSON(){return show("Restaurar respaldo",'<p>Selecciona el archivo <b>banquillo-configuracion-club-demo.json</b> que descargaste con «Guardar respaldo».</p><label class="dd-field">Archivo de Banquillo Demo<input type="file" accept=".json,application/json" required></label><p data-dd-error role="alert" class="dd-error"></p><p class="dd-tip">Este archivo solo recupera datos ficticios de la demo. No modifica tu club real ni Supabase.</p>',{file:true,submit:"Abrir copia"});}
 async function team(){const values=await show("Añadir equipo",'<label class="dd-field">Nombre del equipo<input data-dd-field="name" required maxlength="60" placeholder="Ej. Benjamín A"></label><label class="dd-field" style="margin-top:14px">Modalidad<select data-dd-field="modality"><option value="F7">Fútbol 7</option><option value="F11">Fútbol 11</option></select></label>',{submit:"Crear equipo"});if(!values||!values.name?.trim())return null;return {name:values.name.trim().slice(0,60),modality:values.modality==="F11"?"F11":"F7"};
 }
 return {prompt,confirm,alert,copy,team,pickJSON};
})();